// app/actions/getBookingsAction.ts
'use server';

import { google } from 'googleapis';
import { Bookings, BookingSet } from '../types/interfaces';

export interface UsageItem {
  ItemCode: string;
  Description: string;
  Quantity: number;
}

export interface PatientUsageDetails {
  MRN: string;
  PhotoUrl: string;
  Items: UsageItem[];
}

export type EnhancedBooking = Bookings & {
  Type?: string;
  PatientUsages: PatientUsageDetails[];
  RelatedBookingSets: BookingSet[];
};

// 🔥 Synchronized with getUsagesAction.ts to stream clear media blocks accurately
function buildAppSheetImageUrl(fileName: string): string {
  if (!fileName || fileName.trim() === '') return '';
  if (fileName.startsWith('http')) return fileName;

  const encodedFile = encodeURIComponent(fileName.trim());
  return `https://www.appsheet.com/image/getimageurl?appName=MedartisPhase1-5435197&tableName=Usage%20Photos&fileName=${encodedFile}&width=1000`;
}

export async function fetchBookingsLog(): Promise<{ success: boolean; data: EnhancedBooking[]; error?: string }> {
  try {
    const [rawBookings, rawUsages, rawPhotos, rawParts, rawBookingSets] = await Promise.all([
      getSheetRows('Bookings!A1:Z'),
      getSheetRows('Usage!A1:Z'),
      getSheetRows("'Usage Photos'!A1:Z"),
      getSheetRows('PartsMaster!A1:Z'),
      getSheetRows('BookingSets!A1:Z') // 🌟 Fetching the referenced table
    ]);

    if (rawBookings.length < 2) return { success: true, data: [] };

    const [bookingHeaders, ...bookingRows] = rawBookings;
    const [usageHeaders, ...usageRows] = rawUsages;
    const [photoHeaders, ...photoRows] = rawPhotos;
    const [partsHeaders, ...partsRows] = rawParts;
    const [bSetHeaders, ...bSetRows] = rawBookingSets;

    // 1. Build Description Reference Map
    const partsDescriptionMap: Record<string, string> = {};
    if (partsHeaders && partsRows) {
      const partNumIdx = partsHeaders.indexOf('PartNumber');
      const descIdx = partsHeaders.indexOf('Description');
      if (partNumIdx !== -1 && descIdx !== -1) {
        partsRows.forEach(row => {
          if (row[partNumIdx]) {
            partsDescriptionMap[row[partNumIdx].toString().trim().toLowerCase()] = row[descIdx] || '';
          }
        });
      }
    }

    // 2. Parse Usage Row Dictionary Logs
    const usageItemsParsed = usageRows.map(row => {
      const item: any = {};
      usageHeaders.forEach((h, i) => {
        item[h] = row[i] !== undefined ? row[i].toString().trim() : '';
      });
      return item;
    });

    // 3. Parse Standalone Verified Photo Records
    const photosParsed = photoRows.map(row => {
      const obj: any = {};
      photoHeaders.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i].toString().trim() : '';
      });
      return obj;
    });

    // 4. Parse BookingSets child table
    const bookingSetsParsed = bSetRows.map(row => {
      const obj: any = {};
      bSetHeaders.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i].toString().trim() : '';
      });
      return obj;
    });

    // 5. Group and cross-map components with bookings
    const bookingsList: EnhancedBooking[] = bookingRows
      .map((row) => {
        const item: any = {};
        bookingHeaders.forEach((h, i) => {
          item[h] = row[i] !== undefined ? row[i].toString().trim() : '';
        });

        const bID = item.BookingID || '';

        // Extract associated rows tracking this booking ID context
        const associatedUsages = usageItemsParsed.filter(u => u.BookingID === bID);
        
        // Identify unique MRNs tied to this booking
        const uniqueMRNsInUsage = Array.from(new Set(associatedUsages.map(u => u.PatientMRN || u.MRN).filter(Boolean))) as string[];
        
        // Fallback fallback fallback if no logs exist yet
        if (uniqueMRNsInUsage.length === 0 && item["Patient MRN"]) {
          const mainMRNs = item["Patient MRN"].split(',').map((m: string) => m.trim()).filter(Boolean);
          mainMRNs.forEach((m: string) => {
            if (!uniqueMRNsInUsage.includes(m)) uniqueMRNsInUsage.push(m);
          });
        }

        const patientUsages: PatientUsageDetails[] = uniqueMRNsInUsage.map(mrn => {
          const mrnSpecificRows = associatedUsages.filter(u => (u.PatientMRN || u.MRN) === mrn);
          
          // Look up corresponding image allocations via the 'Usage Photos' sheet context
          const photoMatch = photosParsed.find(p => p.BookingID === bID && (p.MRN === mrn || p.PatientMRN === mrn)) 
                             || mrnSpecificRows.find(u => u.Photo || u.UsagePhoto);
          
          const rawPhotoFile = photoMatch ? (photoMatch.Photo || photoMatch.UsagePhoto || '') : '';

          const items: UsageItem[] = mrnSpecificRows.map(u => {
            const pNum = u.PartNumber || u.ItemCode || '';
            let desc = u.Description || '';
            if (!desc || desc.trim() === '') {
              desc = partsDescriptionMap[pNum.toLowerCase()] || '—';
            }
            return {
              ItemCode: pNum || '—',
              Description: desc,
              Quantity: parseInt(u.QtyUsed || u.Quantity || '1', 10) || 0 // 🌟 Correct field pointer fallback matching tracking logs
            };
          }).filter(i => i.ItemCode !== '—');

          return {
            MRN: mrn,
            PhotoUrl: buildAppSheetImageUrl(rawPhotoFile),
            Items: items
          };
        });

        const relatedBookingSets: BookingSet[] = bookingSetsParsed
          .filter(bs => bs.BookingID === bID)
          .map(bs => ({
            BookingID: bs.BookingID,
            SetID: bs.SetID,
            SetName: bs.SetName || bs.SetNameList || bs.SetID,
            Status: bs.Status,
            Photo1: bs.Photo1 || '',
            Photo2: bs.Photo2 || '',
            Photo3: bs.Photo3 || '',
            Photo4: bs.Photo4 || '',
            Photo5: bs.Photo5 || '',
            Photo6: bs.Photo6 || '',
            Photo7: bs.Photo7 || '',
          }));

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
          "Patient MRN": item["Patient MRN"] || item.PatientMRN || '',
          "Delivery Note": item["Delivery Note"] || '',
          "Delivery Note Link": item["Delivery Note Link"] || '',
          "Sales Email": item["Sales Email"] || '',
          CaseDay: item.CaseDay || '',
          Type: item.Type || '',
          PatientUsages: patientUsages,
          RelatedBookingSets: relatedBookingSets
        };
      })
      .filter((booking) => booking.BookingID !== '');

    const sortedBookings = bookingsList.sort((a, b) => {
      const timeA = a.CaseDate && a.CaseDate !== '—' ? new Date(a.CaseDate).getTime() : 0;
      const timeB = b.CaseDate && b.CaseDate !== '—' ? new Date(b.CaseDate).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.BookingID.localeCompare(a.BookingID);
    });

    return { success: true, data: sortedBookings };
  } catch (err: any) {
    console.error('Error compiling detailed usage vectors matrix:', err);
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