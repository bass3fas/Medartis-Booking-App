'use server';

import crypto from 'crypto';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';

function normalize(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

function newUsageId() {
  return `U-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function addBookingUsageAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');

    const bookingId = normalize(formData.get('BookingID'));
    const setId = normalize(formData.get('SetID'));
    const trayId = normalize(formData.get('TrayID'));
    const patientMRN = normalize(formData.get('PatientMRN'));
    const hospital = normalize(formData.get('Hospital'));
    const date = normalize(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    const notes = normalize(formData.get('Notes'));
    const partNumbers = formData.getAll('PartNumber').map(String);
    const itemIds = formData.getAll('ItemID').map(String);
    const descriptions = formData.getAll('Description').map(String);
    const qtyUsed = formData.getAll('QtyUsed').map(String);
    const qtyRefilled = formData.getAll('QtyRefilled').map(String);

    if (!bookingId || !setId || !trayId || !patientMRN) {
      return { success: false, error: 'Booking, MRN, set, and tray are required.' };
    }

    const rows = partNumbers
      .map((partNumber, index) => ({
        partNumber: partNumber.trim(),
        itemId: (itemIds[index] || '').trim(),
        description: (descriptions[index] || '').trim(),
        used: Number(qtyUsed[index] || 0),
        refilled: Number(qtyRefilled[index] || 0),
      }))
      .filter((item) => item.partNumber && item.used > 0)
      .map((item) => [
        newUsageId(),
        bookingId,
        setId,
        trayId,
        item.partNumber,
        '',
        String(item.used),
        patientMRN,
        date,
        hospital,
        String(item.refilled || 0),
        notes,
        '',
        item.itemId,
        new Date().toISOString(),
        '',
        '',
        item.used === item.refilled ? 'Refilled' : 'Pending to Refill',
        item.description,
      ]);

    if (rows.length === 0) {
      return { success: false, error: 'Choose at least one part and enter a used quantity greater than zero.' };
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usage!A1:S',
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
