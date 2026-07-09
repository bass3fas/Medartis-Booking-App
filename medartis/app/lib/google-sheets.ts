// app/lib/google-sheets.ts
import { google } from 'googleapis';
import { Sets, Bookings, Trays, Usage } from '../types/interfaces';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

export const sheets = google.sheets({ version: 'v4', auth });
export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// Reusable low-level matrix reader
async function getSheetRows(tabName: string): Promise<any[][]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:Z`,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Error loading table tab [${tabName}]:`, error);
    return [];
  }
}

// Generic mapper keeping spaces intact
function mapRowsToInterface<T>(headers: string[], dataRows: any[][]): T[] {
  return dataRows.map((row) => {
    const item: any = {};
    headers.forEach((header, index) => {
      // Maps column values directly using exact string keys (e.g. item["Patient MRN"])
      item[header] = row[index] !== undefined ? row[index] : '';
    });
    return item as T;
  });
}

// --- TARGET TAB GETTERS ---

export async function getSets(): Promise<Sets[]> {
  const rows = await getSheetRows('Sets');
  if (rows.length < 2) return [];
  const [headers, ...dataRows] = rows;
  return mapRowsToInterface<Sets>(headers, dataRows);
}

export async function getBookings(): Promise<Bookings[]> {
  const rows = await getSheetRows('Bookings');
  if (rows.length < 2) return [];
  const [headers, ...dataRows] = rows;
  return mapRowsToInterface<Bookings>(headers, dataRows);
}

export async function getTrays(): Promise<Trays[]> {
  const rows = await getSheetRows('Trays');
  if (rows.length < 2) return [];
  const [headers, ...dataRows] = rows;
  return mapRowsToInterface<Trays>(headers, dataRows);
}

export async function getUsage(): Promise<Usage[]> {
  const rows = await getSheetRows('Usage');
  if (rows.length < 2) return [];
  const [headers, ...dataRows] = rows;
  return mapRowsToInterface<Usage>(headers, dataRows);
}