import { google } from 'googleapis';

export interface MedicalSet {
  id: string;
  name: string;
  location: string;
  deliveryDate: string;
  loanType: string;
  deliveryNote: string;
}

export async function getSetsData(): Promise<MedicalSet[]> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // We explicitly call the "Sets" sheet tab from your workbook
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Sets!A1:F100', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Extract the headers from the very first row
    // Row 0: ["SetID", "SetName", "Location", "DeliveryDate", "LoanType", "DeliveryNote"]
    const dataRows = rows.slice(1);

    // Turn arrays into nice structured JSON objects
    return dataRows.map((row) => ({
      id: row[0] || '',
      name: row[1] || '',
      location: row[2] || 'UNKNOWN',
      deliveryDate: row[3] || '',
      loanType: row[4] || '',
      deliveryNote: row[5] || '',
    }));
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
}