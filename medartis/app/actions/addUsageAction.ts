'use server';

import crypto from 'crypto';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';

function normalize(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

function newUsageId() {
  return `U-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

interface UsageItem {
  id: number;
  trayId: string;
  partNumber: string;
  itemId: string;
  description: string;
  qtyUsed: number;
  qtyRefilled: number;
}

export async function addBookingUsageAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');

    const bookingId = normalize(formData.get('BookingID'));
    const setId = normalize(formData.get('SetID'));
    const patientMRN = normalize(formData.get('PatientMRN'));
    const hospital = normalize(formData.get('Hospital'));
    const date = normalize(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    const notes = normalize(formData.get('Notes'));
    const photo = normalize(formData.get('Photo'));
    const usageItemsJSON = normalize(formData.get('usage_items'));

    if (!bookingId || !setId || !patientMRN) {
      return { success: false, error: 'Booking, Set, and Patient MRN are required.' };
    }

    let usageItems: UsageItem[];
    try {
      usageItems = JSON.parse(usageItemsJSON);
      if (!Array.isArray(usageItems) || usageItems.length === 0) {
        return { success: false, error: 'No usage items were provided.' };
      }
    } catch {
      return { success: false, error: 'Invalid usage items data format.' };
    }

    const rows = usageItems
      .filter(item => item.partNumber && item.qtyUsed > 0)
      .map(item => [
        newUsageId(),
        bookingId,
        setId,
        item.trayId,
        item.partNumber,
        '', // LotID
        String(item.qtyUsed),
        patientMRN,
        date,
        hospital,
        String(item.qtyRefilled || 0),
        notes,
        photo,
        item.itemId,
        new Date().toISOString(),
        '', // Set Delivery Note
        '', // Refill Delivery Note
        item.qtyUsed === item.qtyRefilled ? 'Refilled' : 'Pending to Refill',
        item.description,
      ]);

    if (rows.length === 0) {
      return { success: false, error: 'No valid usage items to save. Ensure at least one part has a quantity used greater than zero.' };
    }

    // Do not use values.append here. Sheets can infer the wrong table when there
    // are gaps or neighbouring values, which causes usage rows to be written away
    // from column A. Find the next row ourselves and write the full A:S range.
    const existingUsageRows = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usage!A1:S',
    });
    const usageRows = existingUsageRows.data.values || [];
    const lastUsedOffset = usageRows.reduce(
      (lastOffset, row, offset) => (row.some((value) => String(value ?? '').trim() !== '') ? offset : lastOffset),
      -1,
    );
    const targetRow = Math.max(2, lastUsedOffset + 2);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Usage!A${targetRow}:S${targetRow + rows.length - 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    return { success: true, message: `Added ${rows.length} usage item(s) to ${bookingId}.` };
  } catch (error: unknown) {
    console.error('Add booking usage failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to add usage.';
    return { success: false, error: message };
  }
}
