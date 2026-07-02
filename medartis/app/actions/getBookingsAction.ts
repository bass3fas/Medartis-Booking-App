// app/actions/getBookingsAction.ts
'use server';

import { google } from 'googleapis';
import { Bookings } from '../types/interfaces';

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
};

// Formats relative Google Drive / AppSheet paths into full authorized content streaming image URLs
function buildAppSheetImageUrl(rawPath: string): string {
  if (!rawPath || rawPath.trim() === '') return '';
  if (rawPath.startsWith('http')) return rawPath;
  
  const cleanPath = rawPath.trim();
  const appId = process.env.APPSHEET_APP_ID || ''; 
  const tableName = encodeURIComponent('Usage');
  const columnName = encodeURIComponent('UsagePhoto');
  const fileName = encodeURIComponent(cleanPath);

  return `https://www.appsheet.com/template/gettablefileurl?appName=${appId}&tableName=${tableName}&columnName=${columnName}&fileName=${fileName}&width=1000`;
}

export async function fetchBookingsLog(): Promise<{ success: boolean; data: EnhancedBooking[]; error?: string }> {
  try {
    const rawBookings = await getSheetRows('Bookings!A1:Z');
    const rawUsages = await getSheetRows('Usage!A1:Z'); // Pull detailed usages ledger

    if (rawBookings.length < 2) return { success: true, data: [] };

    const [bookingHeaders, ...bookingRows] = rawBookings;
    const [usageHeaders, ...usageRows] = rawUsages;

    // Parse the items from the Usage sheet
    const usageItemsParsed = usageRows.map(row => {
      const item: any = {};
      usageHeaders.forEach((h, i) => {
        item[h] = row[i] !== undefined ? row[i].toString().trim() : '';
      });
      return item;
    });

    const bookingsList: EnhancedBooking[] = bookingRows
      .map((row) => {
        const item: any = {};
        bookingHeaders.forEach((h, i) => {
          item[h] = row[i] !== undefined ? row[i].toString().trim() : '';
        });

        const bID = item.BookingID || '';

        // 🧬 Compile Multiple MRNs & corresponding itemized usage sets
        const associatedUsages = usageItemsParsed.filter(u => u.BookingID === bID);
        
        // Find all distinct MRNs listed under this specific booking inside the Usage tab
        const uniqueMRNsInUsage = Array.from(new Set(associatedUsages.map(u => u.PatientMRN || u.MRN).filter(Boolean))) as string[];
        
        // If no explicit Usage entries exist yet, fall back to the initial Bookings row definition
        if (uniqueMRNsInUsage.length === 0 && item["Patient MRN"]) {
          const mainMRNs = item["Patient MRN"].split(',').map((m: string) => m.trim()).filter(Boolean);
          mainMRNs.forEach((m: string) => {
            if (!uniqueMRNsInUsage.includes(m)) uniqueMRNsInUsage.push(m);
          });
        }

        const patientUsages: PatientUsageDetails[] = uniqueMRNsInUsage.map(mrn => {
          const mrnSpecificRows = associatedUsages.filter(u => (u.PatientMRN || u.MRN) === mrn);
          
          // Fall back to main sheet links if specific sub-usage image paths aren't found
          const rawPhoto1 = mrnSpecificRows.find(u => u.UsagePhoto)?.UsagePhoto || item.UsagePhoto || '';
          
          const items: UsageItem[] = mrnSpecificRows.map(u => ({
            ItemCode: u.ItemCode || u.Item_Code || '—',
            Description: u.Description || u.ItemName || '—',
            Quantity: parseInt(u.Quantity || u.Qty || '1', 10) || 0
          })).filter(i => i.ItemCode !== '—');

          return {
            MRN: mrn,
            PhotoUrl: buildAppSheetImageUrl(rawPhoto1),
            Items: items
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
          "Patient MRN": item["Patient MRN"] || item.PatientMRN || '',
          "Delivery Note": item["Delivery Note"] || '',
          "Delivery Note Link": item["Delivery Note Link"] || '',
          "Sales Email": item["Sales Email"] || '',
          CaseDay: item.CaseDay || '',
          Type: item.Type || '',
          PatientUsages: patientUsages
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
    console.error('Error fetching Bookings data matrix payload:', err);
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