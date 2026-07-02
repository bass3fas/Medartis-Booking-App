// app/actions/getBookingsAction.ts
'use server';

import { google } from 'googleapis';
import { Bookings } from '../types/interfaces';

export async function fetchBookingsLog(): Promise<{ success: boolean; data: Bookings[]; error?: string }> {
  try {
    const rawBookings = await getSheetRows('Bookings!A1:Z');

    if (rawBookings.length < 2) return { success: true, data: [] };

    const [headers, ...rows] = rawBookings;

    const bookingsList: Bookings[] = rows
      .map((row) => {
        const item: any = {};
        headers.forEach((h, i) => {
          item[h] = row[i] !== undefined ? row[i].toString().trim() : '';
        });

        // Map data directly to the official interface definitions
        return {
          BookingID: item.BookingID || '',
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
          UsagePhoto: item.UsagePhoto || '',
          UsagePhoto2: item.UsagePhoto2 || '',
          "Patient MRN": item["Patient MRN"] || item.PatientMRN || '',
          "Delivery Note": item["Delivery Note"] || '',
          "Delivery Note Link": item["Delivery Note Link"] || '',
          "Sales Email": item["Sales Email"] || '',
          CaseDay: item.CaseDay || '',
          // Injecting your explicit new sheet column dynamically into the data frame mapping context
          Type: item.Type || '' 
        } as Bookings & { Type?: string };
      })
      // 🚫 Filter out empty trailing spreadsheet rows missing a BookingID
      .filter((booking) => booking.BookingID !== '');

    // Chronological descending sort (Newest CaseDate first)
    const sortedBookings = bookingsList.sort((a, b) => {
      const timeA = a.CaseDate && a.CaseDate !== '—' ? new Date(a.CaseDate).getTime() : 0;
      const timeB = b.CaseDate && b.CaseDate !== '—' ? new Date(b.CaseDate).getTime() : 0;

      if (timeA !== timeB) return timeB - timeA;
      return b.BookingID.localeCompare(a.BookingID);
    });

    return { success: true, data: sortedBookings };
  } catch (err: any) {
    console.error('Error fetching Bookings ledger array:', err);
    return { success: false, data: [], error: err.message };
  }
}

// Global Sheets utility helper logic wrapper
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