'server-only';
'use server';

import crypto from 'crypto';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { uploadPhotoToDrive } from '../lib/googleDrive';
import type { UsageItemInput } from '../types/interfaces';
import { writeHistoryLog } from '../lib/history-log';
import { sendNotificationEmail } from '../lib/email';

// Usage images folder ID from your Google Drive
const USAGE_IMAGES_FOLDER_ID = '1dAIcVsXX1llgMrqlT12YOtdizskGV5rg';
const BOOKING_USAGE_IMAGES_FOLDER_ID = '1p1sB99xNT5c0bYV_ftw7LpZF7QzT1cdU';

function normalize(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

function newUsageId() {
  return `U-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function canManageBooking(booking: Record<string, string>, userName: string, role: string): boolean {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'warehouse') return true;
  if (normalizedRole === 'sales') return String(booking.Salesperson || '').trim().toLowerCase() === userName.trim().toLowerCase();
  return false;
}

async function findBookingRow(bookingId: string) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:Z' });
  const [headers = [], ...rows] = response.data.values || [];
  const bookingIdColumn = headers.indexOf('BookingID');
  if (bookingIdColumn === -1) throw new Error('Bookings sheet is missing its BookingID column.');
  const rowOffset = rows.findIndex((row) => String(row[bookingIdColumn] || '').trim().toUpperCase() === bookingId.trim().toUpperCase());
  if (rowOffset === -1) throw new Error(`Booking ${bookingId} was not found.`);
  const row = rows[rowOffset];
  const booking = headers.reduce<Record<string, string>>((acc, header, index) => { acc[header] = String(row[index] || '').trim(); return acc; }, {});
  return { headers, row, rowNumber: rowOffset + 2, booking };
}

function columnLetter(index: number): string {
  let dividend = index + 1;
  let column = '';
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    column = String.fromCharCode(65 + modulo) + column;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return column;
}

export async function addBookingUsageAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing.');
    }

    const bookingId = normalize(formData.get('BookingID'));
    const currentUserName = normalize(formData.get('currentUserName'));
    const currentUserRole = normalize(formData.get('currentUserRole'));
    const currentUserEmail = normalize(formData.get('currentUserEmail'));
    const patientMRN = normalize(formData.get('PatientMRN'));
    const hospital = normalize(formData.get('Hospital'));
    const date = normalize(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    const notes = normalize(formData.get('Notes'));
    let photoPath = normalize(formData.get('Photo')); // Fallback text/link
    const photoFile = formData.get('PhotoFile') as File | null;
    const usageItemsJSON = normalize(formData.get('usage_items'));

    if (!bookingId) {
      return { success: false, error: 'Booking ID is required.' };
    }

    const { headers: bookingHeaders, row: bookingRow, rowNumber: bookingRowNumber, booking } = await findBookingRow(bookingId);
    if (!canManageBooking(booking, currentUserName, currentUserRole)) {
      return { success: false, error: 'You do not have permission to add usage photos or usage rows for this booking.' };
    }

    const patientMrnColumn = bookingHeaders.indexOf('Patient MRN');
    if (patientMrnColumn !== -1 && patientMRN) {
      const existingMrns = String(bookingRow[patientMrnColumn] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (!existingMrns.includes(patientMRN)) {
        const nextMrns = Array.from(new Set([...existingMrns, patientMRN]));
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Bookings!${columnLetter(patientMrnColumn)}${bookingRowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[nextMrns.join(', ')]] },
        });
      }
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

    if (validUsageItems.some(item => item.partNumber && item.setId && !item.trayId)) {
      // Keep row-level context optional for direct-stock entries; tray is only mandatory when a set was selected for a tray-backed row.
    }

    // 📸 1. Process & Upload Photo if present. MRN-less photos stay on the booking until edited/assigned.
    if (hasPhoto && photoFile) {
      const timestamp = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      const extension = photoFile.name.split('.').pop() || 'jpg';
      const safeBookingId = bookingId.replace(/[^a-zA-Z0-9_-]/g, '-');
      const sanitizedMrn = patientMRN.replace(/[^a-zA-Z0-9_-]/g, '-');
      const fileName = patientMRN
        ? `${sanitizedMrn}.Photo.${timestamp}.${extension}`
        : `${safeBookingId}.UsagePhoto.${timestamp}.${extension}`;

      if (patientMRN) {
        await uploadPhotoToDrive(photoFile, fileName, USAGE_IMAGES_FOLDER_ID);
        photoPath = `Usage Photos_Images/${fileName}`;

        const photoRow = [patientMRN, photoPath, bookingId, date];
        const existingPhotoRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:D" });
        const photoRows = existingPhotoRows.data.values || [];
        const photoTargetRow = Math.max(2, photoRows.length + 1);
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `'Usage Photos'!A${photoTargetRow}:D${photoTargetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [photoRow] } });
      } else {
        await uploadPhotoToDrive(photoFile, fileName, BOOKING_USAGE_IMAGES_FOLDER_ID);
        photoPath = `Bookings_Images/${fileName}`;
        const usagePhotoColumn = bookingHeaders.indexOf('UsagePhoto');
        if (usagePhotoColumn === -1) throw new Error('Bookings sheet is missing its UsagePhoto column.');
        const existingPhotos = String(bookingRow[usagePhotoColumn] || '').split(',').map((value) => value.trim()).filter(Boolean);
        const nextPhotos = Array.from(new Set([...existingPhotos, photoPath]));
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `Bookings!${columnLetter(usagePhotoColumn)}${bookingRowNumber}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[nextPhotos.join(', ')]] } });
      }
    }

    // 📦 2. Process row-specific part consumption into the Usage sheet.
    if (validUsageItems.length > 0) {
      if (!patientMRN) return { success: false, error: 'Patient MRN is required when saving consumed parts.' };
      const rows = validUsageItems.map(item => [
        newUsageId(),
        bookingId,
        item.setId || '',
        item.trayId || '',
        item.partNumber,
        '', // LotID
        String(item.qtyUsed),
        patientMRN,
        date,
        hospital,
        String(item.qtyRefilled || 0),
        notes,
        photoPath, // Relative photo path reference
        item.itemId || '',
        new Date().toISOString(),
        '', // Set Delivery Note
        '', // Refill Delivery Note
        item.qtyUsed === item.qtyRefilled ? 'Refilled' : 'Pending to Refill',
        item.description || '',
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
      for (const row of rows) {
        const usageSnapshot = { UsageID: row[0], BookingID: row[1], SetID: row[2], TrayID: row[3], PartNumber: row[4], QtyUsed: row[6], PatientMRN: row[7], Date: row[8], Hospital: row[9], Notes: row[11], Status: row[17] };
        await writeHistoryLog({ targetTable: 'Usage', targetRowId: row[0], actionType: 'CREATE', previousData: null, newData: usageSnapshot, actor: { name: currentUserName, email: currentUserEmail, role: currentUserRole } });
      }
      const salesCoordinatorEmail = process.env.SALES_COORDINATOR_EMAIL;
      if (salesCoordinatorEmail && patientMRN) {
        await sendNotificationEmail({ to: salesCoordinatorEmail, subject: `Usage MRN ${patientMRN} added for booking ${bookingId}`, html: `<p>MRN <strong>${patientMRN}</strong> was added for booking <strong>${bookingId}</strong>.</p><p>Hospital: ${hospital || booking.Hospital || 'N/A'}</p><p>Usage items: ${validUsageItems.length}</p>` });
      }
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