'server-only';
'use server';

import crypto from 'crypto';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { uploadPhotoToDrive } from '../lib/googleDrive';
import type { UsageItemInput } from '../types/interfaces';

// Usage images folder ID from your Google Drive
const USAGE_IMAGES_FOLDER_ID = '1dAIcVsXX1llgMrqlT12YOtdizskGV5rg';

function normalize(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

function newUsageId() {
  return `U-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function addBookingUsageAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing.');
    }

    const bookingId = normalize(formData.get('BookingID'));
    const setId = normalize(formData.get('SetID'));
    const patientMRN = normalize(formData.get('PatientMRN'));
    const hospital = normalize(formData.get('Hospital'));
    const date = normalize(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    const notes = normalize(formData.get('Notes'));
    let photoPath = normalize(formData.get('Photo')); // Fallback text/link
    const photoFile = formData.get('PhotoFile') as File | null;
    const usageItemsJSON = normalize(formData.get('usage_items'));

    if (!bookingId || !patientMRN) {
      return { success: false, error: 'Booking ID and Patient MRN are required.' };
    }

    // Parse items (optional if uploading ONLY a photo)
    let usageItems: UsageItemInput[] = [];
    if (usageItemsJSON) {
      try {
        usageItems = JSON.parse(usageItemsJSON);
      } catch {
        return { success: false, error: 'Invalid usage items format.' };
      }
    }

    const hasPhoto = photoFile && photoFile.size > 0;
    const validUsageItems = usageItems.filter(item => item.partNumber && item.qtyUsed > 0);

    if (!hasPhoto && validUsageItems.length === 0) {
      return { success: false, error: 'Please either attach a photo or add at least one used part.' };
    }

    // 📸 1. Process & Upload Photo if present
    if (hasPhoto && photoFile) {
      const timestamp = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      const extension = photoFile.name.split('.').pop() || 'jpg';
      
      // Sanitize MRN for file system safety (e.g. replacing slashes/colons)
      const sanitizedMrn = patientMRN.replace(/[:\/]/g, '-');
      const fileName = `${sanitizedMrn}.Photo.${timestamp}.${extension}`;

      // Upload file to Drive via Apps Script bridge
      await uploadPhotoToDrive(photoFile, fileName, USAGE_IMAGES_FOLDER_ID);

      // Match AppSheet relative path naming: Usage Photos_Images/MRN.Photo.104457.jpg
      photoPath = `Usage Photos_Images/${fileName}`;

      // 📝 Write record into "Usage Photo" sheet: [MRN, Photo, BookingID, Date]
      const photoRow = [
        patientMRN,
        photoPath,
        bookingId,
        date,
      ];

      const existingPhotoRows = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Usage Photos'!A1:D",
      });
      const photoRows = existingPhotoRows.data.values || [];
      const photoTargetRow = Math.max(2, photoRows.length + 1);

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'Usage Photos'!A${photoTargetRow}:D${photoTargetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [photoRow] },
      });
    }

    // 📦 2. Process Part Consumption into "Usage" sheet (if items were submitted)
    if (validUsageItems.length > 0 && setId) {
      const rows = validUsageItems.map(item => [
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
        photoPath, // Relative photo path reference
        item.itemId,
        new Date().toISOString(),
        '', // Set Delivery Note
        '', // Refill Delivery Note
        item.qtyUsed === item.qtyRefilled ? 'Refilled' : 'Pending to Refill',
        item.description,
      ]);

      const existingUsageRows = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Usage!A1:S',
      });
      const usageRows = existingUsageRows.data.values || [];
      const targetRow = Math.max(2, usageRows.length + 1);

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Usage!A${targetRow}:S${targetRow + rows.length - 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    return { 
      success: true, 
      message: hasPhoto && validUsageItems.length === 0 
        ? 'Usage photo uploaded successfully.' 
        : `Added ${validUsageItems.length} usage item(s) and photo.` 
    };
  } catch (error: unknown) {
    console.error('Add usage/photo failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to save usage data.';
    return { success: false, error: message };
  }
}