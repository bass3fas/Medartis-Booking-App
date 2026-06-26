// app/actions/getSetsAction.ts
'use server';

import { getSets, getTrays } from '../lib/google-sheets'; // Make sure your original imports are here
import { Trays, TraysContent } from '../types/interfaces';
import { google } from 'googleapis';

// --- Keep your original VirtualSet interface shape ---
export interface VirtualSet {
  SetID: string;
  SetName: string;
  LoanType?: string;
  computedStatus: 'Free' | 'Booked';
  computedComplete: 'Yes' | 'No';
  computedLocation: string;
}

export interface EnrichedTray extends Trays {
  contents: TraysContent[];
}

// 🌟 1. PUT YOUR ORIGINAL FUNCTION BACK HERE
export async function fetchEnrichedSets(): Promise<{ success: boolean; data: VirtualSet[]; error?: string }> {
  try {
    // This should match your original logic that builds the primary matrix array
    const rawSets = await getSets(); 
    
    // ... your original mapping / virtual properties computation logic goes here ...
    // (e.g., matching status, calculating if complete, finding current location)
    
    return { success: true, data: rawSets as VirtualSet[] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

// 🌟 2. KEEP THE NEW VIEW RELATION FUNCTION HERE
export async function fetchTraysForSet(setId: string): Promise<{ success: boolean; data: EnrichedTray[]; error?: string }> {
  try {
    const rawTrays = await getTrays();
    const relatedTrays = rawTrays.filter(t => t.SetID === setId);

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'TraysContent!A1:Z',
    });
    
    const rows = response.data.values || [];
    if (rows.length < 2) {
      return { success: true, data: relatedTrays.map(t => ({ ...t, contents: [] })) };
    }

    const [headers, ...dataRows] = rows;
    
    const allContents = dataRows.map((row) => {
      const item: any = {};
      headers.forEach((header, index) => {
        item[header] = row[index] !== undefined ? row[index] : '';
      });
      return item as TraysContent;
    });

    const enrichedTrays: EnrichedTray[] = relatedTrays.map(tray => {
      const contents = allContents.filter(c => c.TrayID === tray.TrayID);
      return { ...tray, contents };
    });

    return { success: true, data: enrichedTrays };
  } catch (err: any) {
    console.error(`Failed to map relational view for SetID ${setId}:`, err);
    return { success: false, data: [], error: err.message };
  }
}