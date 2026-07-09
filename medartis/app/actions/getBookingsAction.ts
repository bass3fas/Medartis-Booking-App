// app/actions/getBookingsAction.ts
'use server';

import { google } from 'googleapis';
import { Bookings } from '../types/interfaces';
import { buildAppSheetImageUrl } from '../lib/appsheet-image-url';

// Update type definition to support flexible fields required by SetDetailsDrawer
export interface BookingSet {
  BookingID: string;
  SetID: string;
  SetName?: string;
  Status?: string;
  Photo1?: string;
  Photo2?: string;
  Photo3?: string;
  Photo4?: string;
  Photo5?: string;
  Photo6?: string;
  Photo7?: string;
  [key: string]: any; // Allows passing complete dataset properties down to your component drawer safely
}

export type EnhancedBooking = Bookings & {
  Type?: string;
  PatientUsages: any[];
  RelatedBookingSets: BookingSet[]; // Column 20: REF_ROWS("BookingSets", "BookingID")
};

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toString().trim();
}

function normalizeBookingId(value: unknown): string {
  return normalizeText(value).trim().toUpperCase();
}

function getBookingFieldValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = normalizeText(row[key]);
    if (value) return value;
  }
  return '';
}

export async function fetchBookingsLog(): Promise<{ success: boolean; data: EnhancedBooking[]; error?: string }> {
  try {
    const [rawBookings, rawUsages, rawPhotos, rawParts, rawBookingSets] = await Promise.all([
      getSheetRows('Bookings!A1:Z'),
      getSheetRows('Usage!A1:Z'),
      getSheetRows("'Usage Photos'!A1:Z"),
      getSheetRows('PartsMaster!A1:Z'),
      getSheetRows('BookingSets!A1:Z') 
    ]);

    if (rawBookings.length < 2) return { success: true, data: [] };

    const [bookingHeaders, ...bookingRows] = rawBookings;
    const [usageHeaders, ...usageRows] = rawUsages;
    const [photoHeaders, ...photoRows] = rawPhotos;
    const [partsHeaders, ...partsRows] = rawParts;
    const [bSetHeaders, ...bSetRows] = rawBookingSets;

    // Parse BookingSets sheet mapping precisely
    const bookingSetsParsed = bSetRows.map(row => {
      const obj: any = {};
      bSetHeaders.forEach((h: string, i: number) => {
        // Normalize whitespaces or headers safely
        const key = h ? h.toString().trim() : '';
        obj[key] = row[i] !== undefined ? row[i].toString().trim() : '';
      });
      return obj;
    });

    // Parse remaining support sets mapping
    const usageItemsParsed = usageRows.map(row => {
      const item: any = {};
      usageHeaders.forEach((h: string, i: number) => { item[h] = row[i] !== undefined ? row[i].toString().trim() : ''; });
      return item;
    });

    const photosParsed = photoRows.map(row => {
      const obj: any = {};
      photoHeaders.forEach((h: string, i: number) => { obj[h] = row[i] !== undefined ? row[i].toString().trim() : ''; });
      return obj;
    });

    const bookingsList: EnhancedBooking[] = bookingRows
      .map((row) => {
        const item: any = {};
        bookingHeaders.forEach((h: string, i: number) => {
          item[h] = row[i] !== undefined ? row[i].toString().trim() : '';
        });

        const bID = normalizeBookingId(item.BookingID || item["BookingID"] || item.bookingid || '');

        // 🌟 Exact simulation of AppSheet REF_ROWS("BookingSets", "BookingID")
        const relatedBookingSets: BookingSet[] = bookingSetsParsed
          .filter(bs => normalizeBookingId(bs.BookingID) === bID)
          .map(bs => {
            const photoFields = ['Photo1', 'Photo2', 'Photo3', 'Photo4', 'Photo5', 'Photo6', 'Photo7'] as const;
            const photoValues = photoFields.reduce((acc, field, index) => {
              const rawValue = bs[`photo${index + 1}`] || bs[field] || '';
              const normalizedValue = buildAppSheetImageUrl(rawValue, 'BookingSets');
              acc[field] = normalizedValue;
              acc[field.toLowerCase()] = normalizedValue;
              return acc;
            }, {} as Record<string, string>);

            return {
              ...bs,
              BookingID: bs.BookingID,
              SetID: bs.SetID || '',
              // Support fallback variations matching data schema naming conventions
              SetName: bs["Set Name"] || bs.SetName || bs.SetID || '',
              Status: bs.BookingStatus || bs["Photo Confirmation"] || 'Allocated',
              ...photoValues,

              // Compatibility properties so your existing SetDetailsDrawer gets a complete data shell mapping
              computedStatus: bs.BookingStatus || 'Booked',
              computedLocation: 'Dispatched to Case',
              computedComplete: 'Yes',
            };
          });

        // Parse standard legacy patient usage metrics safely
        const associatedUsages = usageItemsParsed.filter(u => normalizeBookingId(u.BookingID || u["BookingID"] || u.bookingid) === bID);
        const directBookingMRNsValue = getBookingFieldValue(item, ['Patient MRN', 'PatientMRN', 'patient MRN', 'patientmrn']);
        const directBookingMRNs = directBookingMRNsValue
          .split(',')
          .map(mrn => mrn.trim())
          .filter(Boolean);
        const usageMRNs = associatedUsages
          .map(u => getBookingFieldValue(u, ['PatientMRN', 'MRN', 'Patient MRN', 'patientmrn', 'PatientMRN']))
          .map(normalizeText)
          .filter(Boolean);
        const uniqueMRNsInUsage = Array.from(new Set([...directBookingMRNs, ...usageMRNs])) as string[];

        const patientUsages = uniqueMRNsInUsage.map((mrn) => {
          const mrnSpecificRows = associatedUsages.filter(u => getBookingFieldValue(u, ['PatientMRN', 'MRN', 'Patient MRN', 'patientmrn', 'PatientMRN']) === mrn);
          const photoMatch = photosParsed.find(p => normalizeBookingId(p.BookingID || p["BookingID"] || p.bookingid) === bID && (normalizeText(p.MRN || p.PatientMRN || p["MRN"] || p["PatientMRN"]) === mrn));
          return {
            MRN: mrn,
            PhotoUrl: photoMatch ? `https://www.appsheet.com/image/getimageurl?appName=MedartisPhase1-5435197&tableName=Usage%20Photos&fileName=${encodeURIComponent(photoMatch.Photo || photoMatch.UsagePhoto || '')}&width=1000` : '',
            Items: mrnSpecificRows.map(u => ({
              ItemCode: u.PartNumber || u.ItemCode || '',
              Description: u.Description || '—',
              Quantity: parseInt(u.QtyUsed || u.Quantity || '1', 10) || 0
            }))
          };
        });

        return {
          BookingID: bID,
          Salesperson: item.Salesperson || item.Sales_Person || '—',
          Hospital: item.Hospital || 'Unknown Hospital',
          Doctor: item.Doctor || '—',
          CaseDate: item.CaseDate || item.Date || '—',
          CaseTime: item.CaseTime || '—',
          "Deliver Before": item["Deliver Before"] || '',
          "Special Request": item["Special Request"] || '',
          Status: item.Status || 'Pending',
          "Requested Sets": item["Requested Sets"] || '',
          "Selected Sets": item["Selected Sets"] || '',
          "Last Updated": item["Last Updated"] || '',
          Driver: item.Driver || '',
          "Patient MRN": getBookingFieldValue(item, ['Patient MRN', 'PatientMRN', 'patient MRN', 'patientmrn']),
          "Delivery Note": item["Delivery Note"] || '',
          "Delivery Note Link": item["Delivery Note Link"] || '',
          "Sales Email": item["Sales Email"] || '',
          CaseDay: item.CaseDay || '',
          Type: item.Type || '',
          PatientUsages: patientUsages,
          RelatedBookingSets: relatedBookingSets // Attached array matching AppSheet configuration logic
        };
      })
      .filter((booking) => booking.BookingID !== '');

    return { success: true, data: bookingsList };
  } catch (err: any) {
    console.error('Error in fetchBookingsLog:', err);
    return { success: false, data: [], error: err.message };
  }
}

async function getSheetRows(rangeName: string): Promise<any[]> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: rangeName,
  });
  return response.data.values || [];
}