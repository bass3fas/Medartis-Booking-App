// app/actions/getBookingsAction.ts
'use server';

import { google } from 'googleapis';

export interface BookingCase {
  BookingID: string;
  Hospital: string;
  Doctor: string;
  CaseDate: string;
  SalesPerson: string;
  PatientMRN?: string;
  Status?: string; // e.g., Confirmed, Completed, Cancelled
  Notes?: string;
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

export async function fetchBookingsLog(): Promise<{ success: boolean; data: BookingCase[]; error?: string }> {
  try {
    const rawBookings = await getSheetRows('Bookings!A1:Z');

    if (rawBookings.length < 2) return { success: true, data: [] };

    const [headers, ...rows] = rawBookings;
    
    const bookingsList: BookingCase[] = rows.map((row) => {
      const item: any = {};
      headers.forEach((h, i) => { 
        item[h] = row[i] !== undefined ? row[i].toString().trim() : ''; 
      });
      return item as BookingCase;
    });

    // Sort chronologically descending (Newest case dates first)
    const sortedBookings = bookingsList.sort((a, b) => {
      const dateA = a.CaseDate ? new Date(a.CaseDate).getTime() : 0;
      const dateB = b.CaseDate ? new Date(b.CaseDate).getTime() : 0;
      return dateB - dateA;
    });

    return { success: true, data: sortedBookings };
  } catch (err: any) {
    console.error('Error fetching Bookings:', err);
    return { success: false, data: [], error: err.message };
  }
}