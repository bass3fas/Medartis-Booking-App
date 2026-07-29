'use server';

import crypto from 'crypto';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { uploadPhotoToDrive } from '../lib/googleDrive';
import type { UsageItemInput } from '../types/interfaces';

// Folder ID from your Drive link
const USAGE_IMAGES_FOLDER_ID = '1dAIcVsXX1llgMrqlT12YOtdizskGV5rg';

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
    const patientMRN = normalize(formData.get('PatientMRN'));
    const hospital = normalize(formData.get('Hospital'));
    const date = normalize(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    const notes = normalize(formData.get('Notes'));
    let photoPath = normalize(formData.get('Photo')); // Optional URL/text fallback
    const photoFile = formData.get('PhotoFile') as File | null;
    const usageItemsJSON = normalize(formData.get('usage_items'));

    if (!bookingId || !setId || !patientMRN) {
      return { success: false, error: 'Booking, Set, and Patient MRN are required.' };
    }

    let usageItems: UsageItemInput[];
    try {
      usageItems = JSON.parse(usageItemsJSON);
      if (!Array.isArray(usageItems) || usageItems.length === 0) {
        return { success: false, error: 'No usage items were provided.' };
      }
    } catch {
      return { success: false, error: 'Invalid usage items data format.' };
    }

    // 📸 Handle photo upload if a file is provided
    if (photoFile && photoFile.size > 0) {
      const timestamp = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      const extension = photoFile.name.split('.').pop() || 'jpg';
      const fileName = `${bookingId}.${setId}.${timestamp}.${extension}`;

      // Upload via Apps Script bridge to avoid service account quota limits
      await uploadPhotoToDrive(photoFile, fileName, USAGE_IMAGES_FOLDER_ID);

      // Format AppSheet-compatible relative path
      photoPath = `Usage_Images/${fileName}`;
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
        photoPath, // Saved relative path or custom URL
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