'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';

const text = (value: unknown) => String(value ?? '').trim();

export async function updateTraysContentAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    const itemId = text(formData.get('ItemID'));
    if (!itemId) return { success: false, error: 'ItemID is required.' };

    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'TraysContent!A1:Z' });
    const [headers = [], ...rows] = response.data.values || [];
    const itemIdCol = headers.indexOf('ItemID');
    if (itemIdCol === -1) return { success: false, error: 'TraysContent sheet is missing ItemID column.' };

    const rowIndex = rows.findIndex((row) => String(row[itemIdCol] || '').trim() === itemId);
    if (rowIndex === -1) return { success: false, error: `Item ${itemId} not found in TraysContent.` };

    // Build next row by preserving all existing columns but replacing known editable fields
    const currentRow = rows[rowIndex];
    const editableKeys = ['PartNumber', 'LotNumber', 'ActualQty', 'Notes', 'Description', 'IdealQty'];
    const nextRow = headers.map((header: string, idx: number) => {
      if (editableKeys.includes(header) && formData.has(header)) {
        return text(formData.get(header));
      }
      return currentRow[idx] ?? '';
    });

    const targetRangeStart = rowIndex + 2;
    const targetRange = `TraysContent!A${targetRangeStart}:Z${targetRangeStart}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [nextRow] }
    });

    return { success: true, message: 'Tray content row updated.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not update tray content.' };
  }
}
