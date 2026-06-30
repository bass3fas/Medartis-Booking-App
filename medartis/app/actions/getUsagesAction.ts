// app/actions/getUsagesAction.ts
'use server';

import { google } from 'googleapis';
import { Usage } from '../types/interfaces';

export interface EnrichedUsage extends Usage {
  computedUsageStatus: 'Refilled' | 'Pending to Refill';
  rowIndex: string;
}

export async function fetchUsageLog(): Promise<{ success: boolean; data: EnrichedUsage[]; error?: string }> {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Usage!A1:Z',
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return { success: true, data: [] };

    const [headers, ...dataRows] = rows;
    
    const data: EnrichedUsage[] = dataRows.map((row, idx) => {
      const item: any = {};
      headers.forEach((header, index) => {
        item[header] = row[index] !== undefined ? row[index] : '';
      });

      // Normalize string counts safely to evaluate statuses perfectly
      const used = Number(item.QtyUsed) || 0;
      const refilled = Number(item["Qty Refilled"]) || 0;
      const computedUsageStatus = used === refilled ? 'Refilled' : 'Pending to Refill';

      return {
        ...item,
        computedUsageStatus,
        rowIndex: `usage-${idx}-${item.UsageID || idx}`
      } as EnrichedUsage;
    });

    // Sort by Date descending (newest clinical logs first)
    data.sort((a, b) => new Date(b.Date || 0).getTime() - new Date(a.Date || 0).getTime());

    return { success: true, data };
  } catch (err: any) {
    console.error('Usage sheet parsing failure:', err);
    return { success: false, data: [], error: err.message };
  }
}