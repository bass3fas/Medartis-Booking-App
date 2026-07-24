'use server';

import crypto from 'crypto';
import { google } from 'googleapis';
import { z } from 'zod';
import { uploadPhotoToDrive, deletePhotoFromDrive } from '../lib/googleDrive';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { EnhancedBooking } from './getBookingsAction';

const BOOKING_HEADERS = [
  'BookingID',
  'Salesperson',
  'Hospital',
  'Doctor',
  'CaseDate',
  'CaseTime',
  'Deliver Before',
  'Special Request',
  'Status',
  'Requested Sets',
  'Selected Sets',
  'Last Updated',
  'Driver',
  'UsagePhoto',
  'UsagePhoto2',
  'Patient MRN',
  'Delivery Note',
  'Delivery Note Link',
  'Type',
] as const;

const ADMIN_FIELDS = new Set<string>(BOOKING_HEADERS);
const SALES_FIELDS = new Set<string>([
  'Hospital', 'Doctor', 'CaseDate', 'CaseTime', 'Deliver Before', 'Special Request',
  'Status', 'Requested Sets', 'Selected Sets', 'Driver', 'Patient MRN', 'Delivery Note',
  'Delivery Note Link', 'Type',
]);
const WAREHOUSE_FIELDS = new Set<string>(['Status', 'Selected Sets']);

type MutationContext = { currentUserName: string; currentUserRole: string };

function normalize(value: unknown): string { return String(value ?? '').trim(); }
function normalizeRole(value: unknown): string { return normalize(value).toLowerCase(); }

function canUpdateBooking(booking: Record<string, string>, context: MutationContext): boolean {
  const role = normalizeRole(context.currentUserRole);
  if (role === 'admin' || role === 'warehouse') return true;
  if (role === 'sales') return normalize(booking.Salesperson).toLowerCase() === normalize(context.currentUserName).toLowerCase();
  return false;
}

function allowedFieldsForRole(context: MutationContext): Set<string> {
  const role = normalizeRole(context.currentUserRole);
  if (role === 'admin') return ADMIN_FIELDS;
  if (role === 'warehouse') return WAREHOUSE_FIELDS;
  if (role === 'sales') return SALES_FIELDS;
  return new Set<string>();
}

async function getBookingSheetRows(): Promise<string[][]> {
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:S' });
  return (response.data.values || []) as string[][];
}

function rowToBooking(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = row[index] ?? '';
    return acc;
  }, {});
}

async function findBookingRow(bookingId: string) {
  const rows = await getBookingSheetRows();
  if (rows.length < 2) throw new Error('Bookings sheet is empty.');
  const [headers, ...dataRows] = rows;
  const normalizedBookingId = normalize(bookingId).toUpperCase();
  const rowOffset = dataRows.findIndex((row) => normalize(row[0]).toUpperCase() === normalizedBookingId);
  if (rowOffset === -1) throw new Error(`Booking ${bookingId} was not found.`);
  return { headers, row: dataRows[rowOffset], rowNumber: rowOffset + 2, booking: rowToBooking(headers, dataRows[rowOffset]) };
}

async function getSheetId(sheetName: string): Promise<number> {
  const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
  if (sheet?.properties?.sheetId == null) throw new Error(`Sheet "${sheetName}" not found.`);
  return sheet.properties.sheetId;
}

async function syncBookingSets(bookingId: string, newSetIds: string[]) {
  if (!bookingId) return;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'BookingSets!A:C', // BookingSetID, BookingID, SetID
  });

  const rows = response.data.values || [];
  const [header = [], ...dataRows] = rows;
  const bookingIdCol = header.indexOf('BookingID');
  const setIdCol = header.indexOf('SetID');

  if (bookingIdCol === -1 || setIdCol === -1) {
    throw new Error('BookingSets sheet must have BookingID and SetID columns.');
  }

  const existingSetsForBooking = new Map<string, number>(); // Map SetID to its 1-based rowIndex
  dataRows.forEach((row, index) => {
    if (row[bookingIdCol] === bookingId) {
      const setId = row[setIdCol];
      if (setId) {
        existingSetsForBooking.set(setId, index + 2); // +1 for header, +1 for 0-based index
      }
    }
  });

  const newSetIdsSet = new Set(newSetIds);
  const existingSetIdsSet = new Set(existingSetsForBooking.keys());

  const setsToAdd = newSetIds.filter(id => !existingSetIdsSet.has(id));
  const setsToRemove = Array.from(existingSetIdsSet).filter(id => !newSetIdsSet.has(id));

  const requests = [];

  // Important: Process deletions in reverse order of row index to avoid shifting issues
  const rowsToRemove = setsToRemove
    .map(setId => existingSetsForBooking.get(setId))
    .filter((rowIndex): rowIndex is number => rowIndex != null)
    .sort((a, b) => b - a);

  const sheetId = await getSheetId('BookingSets');
  for (const rowIndex of rowsToRemove) {
    requests.push({
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: 'ROWS',
          startIndex: rowIndex - 1,
          endIndex: rowIndex,
        },
      },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
  }

  if (setsToAdd.length > 0) {
    const newRows = setsToAdd.map(setId => [
      `BS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      bookingId,
      setId,
    ]);

    // values.append detects a data table automatically. If stray values exist in
    // another column, Google can append there instead of A:C. Determine the next
    // BookingSets row from the A:C data and explicitly write the three columns.
    const lastDataRowOffset = dataRows.reduce(
      (lastOffset, row, offset) => (row.some((value) => normalize(value)) ? offset : lastOffset),
      -1
    );
    const targetRow = lastDataRowOffset + 3; // header row + zero-based offset + next row

    console.log(`Adding ${newRows.length} BookingSets row(s) at BookingSets!A${targetRow}:C${targetRow + newRows.length - 1}.`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `BookingSets!A${targetRow}:C${targetRow + newRows.length - 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newRows },
    });
  }
}

export async function updateBookingAction(formData: FormData) {
  try {
    const bookingId = normalize(formData.get('BookingID'));
    const context = { currentUserName: normalize(formData.get('currentUserName')), currentUserRole: normalize(formData.get('currentUserRole')) };
    if (!bookingId) return { success: false, error: 'Booking ID is required.' };

    // First, fetch the existing booking and check permissions
    const { headers, row, rowNumber, booking } = await findBookingRow(bookingId);
    if (!canUpdateBooking(booking, context)) return { success: false, error: 'You do not have permission to update this booking.' };

    // Now, construct the updated booking object
    const allowedFields = allowedFieldsForRole(context);
    const nextBooking: Record<string, string> = { ...booking, BookingID: bookingId, 'Last Updated': new Date().toISOString() };
    BOOKING_HEADERS.forEach((field) => {
      if (field === 'BookingID' || field === 'Salesperson' || field === 'Last Updated') return;
      if (!allowedFields.has(field) || !formData.has(field)) return;
      nextBooking[field] = normalize(formData.get(field));
    });
    if (normalizeRole(context.currentUserRole) === 'admin' && formData.has('Salesperson')) nextBooking.Salesperson = normalize(formData.get('Salesperson'));

    const selectedSets = (formData.get('Selected Sets') as string || '').split(',').map(s => s.trim()).filter(Boolean);
    await syncBookingSets(bookingId, selectedSets);

    const outputHeaders = headers.length ? headers : [...BOOKING_HEADERS];
    const nextRow = outputHeaders.slice(0, BOOKING_HEADERS.length).map((header, index) => nextBooking[header] ?? row[index] ?? '');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Bookings!A${rowNumber}:S${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [nextRow] },
    });
    return { success: true, message: `Booking ${bookingId} updated successfully.` };
  } catch (error: unknown) {
    console.error('Update booking failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to update booking.';
    return { success: false, error: message };
  }
}

export async function addBookingSetPhotoAction(formData: FormData) {
  try {
    const photoSchema = z.object({
      BookingID: z.string().min(1, 'Booking ID is required.'),
      SetID: z.string().min(1, 'Set ID is required.'),
      photo: z.instanceof(File, { message: 'A photo file is required.' })
        .refine((file) => file.size > 0, 'Photo file cannot be empty.')
    });

    const validation = photoSchema.safeParse({
      BookingID: formData.get('BookingID'),
      SetID: formData.get('SetID'),
      photo: formData.get('photo'),
    });

    if (!validation.success) {
      return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { BookingID, SetID, photo } = validation.data;
    const context = { currentUserName: normalize(formData.get('currentUserName')), currentUserRole: normalize(formData.get('currentUserRole')) };

    console.log(`Attempting to add photo for BookingID: ${BookingID}, SetID: ${SetID}`);

    const { booking } = await findBookingRow(BookingID);
    if (!canUpdateBooking(booking, context)) return { success: false, error: 'You do not have permission to add set photos.' };

    // 1. Upload the file to Google Drive
    const parentFolderId = '1ZxOQywT75TFdSrYcSQqzNG8CgLD8bcuE'; // User provided folder ID
    const fileExtension = photo.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    // Format filename to match AppSheet's convention: BookingSetID.photoX.timestamp.extension
    const driveFileName = `BS-${BookingID.split('-')[1] || BookingID}.${SetID}.${timestamp}.${fileExtension}`;

    console.log(`Uploading file "${driveFileName}" to Google Drive folder "${parentFolderId}"...`);
    const driveResponse = await uploadPhotoToDrive(photo, driveFileName, parentFolderId);
    console.log('Google Drive upload response:', driveResponse);

    if (!driveResponse.name) {
      throw new Error('File upload to Google Drive failed: No file name returned.');
    }

    const uploadedAppSheetPath = `BookingSets_Images/${driveResponse.name}`;
    console.log(`File uploaded. AppSheet path: ${uploadedAppSheetPath}`);

    // 2. Find the booking set row and the next available photo column in the Google Sheet
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'BookingSets!A1:Z' });
    const [headers = [], ...rows] = response.data.values || [];
    const bookingColumn = headers.indexOf('BookingID');
    const setColumn = headers.indexOf('SetID');
    const photoColumns = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'photo6', 'photo7']
      .map((header) => ({ header, index: headers.indexOf(header) }))
      .filter((column) => column.index !== -1); // Ensure photo columns exist
    if (bookingColumn === -1 || setColumn === -1 || photoColumns.length === 0) throw new Error('BookingSets must include BookingID, SetID, and at least one Photo column.');

    const rowIndex = rows.findIndex((row) => normalize(row[bookingColumn]) === BookingID && normalize(row[setColumn]) === SetID);
    if (rowIndex === -1) return { success: false, error: `Set ${setId} is not linked to this booking.` };
    const targetColumn = photoColumns.find((column) => !normalize(rows[rowIndex][column.index]));
    if (!targetColumn) return { success: false, error: 'All seven photo slots are already in use for this set.' };

    const columnLetter = String.fromCharCode(65 + targetColumn.index);
    const targetRange = `BookingSets!${columnLetter}${rowIndex + 2}`; // +2 because Sheets are 1-indexed and header is row 1
    console.log(`Updating sheet cell ${targetRange} with photo path: ${uploadedAppSheetPath}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[uploadedAppSheetPath]] },
    });
    console.log('Sheet updated successfully.');

    return { success: true, message: 'Set photo added.' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not add the set photo.';
    return { success: false, error: message };
  }
}

export async function deleteBookingSetPhotoAction(formData: FormData) {
  try {
    const schema = z.object({
      BookingID: z.string().min(1),
      SetID: z.string().min(1),
      photoFileName: z.string().min(1),
    });

    const validation = schema.safeParse({
      BookingID: formData.get('BookingID'),
      SetID: formData.get('SetID'),
      photoFileName: formData.get('photoFileName'),
    });

    if (!validation.success) return { success: false, error: 'Booking ID, Set ID, and Photo Filename are required.' };

    const { BookingID, SetID, photoFileName } = validation.data;
    const context = { currentUserName: normalize(formData.get('currentUserName')), currentUserRole: normalize(formData.get('currentUserRole')) };

    const { booking } = await findBookingRow(BookingID);
    if (!canUpdateBooking(booking, context)) return { success: false, error: 'You do not have permission to delete set photos.' };

    console.log(`Attempting to delete photo "${photoFileName}" from BookingID: ${BookingID}, SetID: ${SetID}`);

    // 1. Find the booking set row and the specific photo column
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'BookingSets!A1:Z' });
    const [headers = [], ...rows] = response.data.values || [];
    const bookingColumn = headers.indexOf('BookingID');
    const setColumn = headers.indexOf('SetID');

    const rowIndex = rows.findIndex((row) => normalize(row[bookingColumn]) === BookingID && normalize(row[setColumn]) === SetID);
    if (rowIndex === -1) return { success: false, error: `Set ${SetID} is not linked to this booking.` };

    console.log(`[SERVER] Found matching row at index: ${rowIndex}. Row data:`, rows[rowIndex]);
    console.log(`[SERVER] Searching for photoFileName: "${photoFileName}"`);

    const photoColumnIndex = rows[rowIndex].findIndex(cellValue => normalize(cellValue) === photoFileName);

    if (photoColumnIndex === -1) {
      console.error('[SERVER] Photo not found in set. The normalized cell values are:', rows[rowIndex].map(normalize));
      return { success: false, error: 'Photo not found in this set.' };
    }

    // 2. Clear the cell in Google Sheets
    const columnLetter = String.fromCharCode(65 + photoColumnIndex);
    const targetRange = `BookingSets!${columnLetter}${rowIndex + 2}`;
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: targetRange });

    // 3. Find the file in Google Drive by its name to get the ID
    const actualFileName = photoFileName.split('/').pop();
    if (actualFileName) {
      console.log(`Searching for file "${actualFileName}" in Google Drive to delete...`);
      const driveAuth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      const drive = google.drive({ version: 'v3', auth: driveAuth });
      const searchResponse = await drive.files.list({
        q: `name='${actualFileName}'`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0 && searchResponse.data.files[0].id) {
        const fileId = searchResponse.data.files[0].id;
        console.log(`File found with ID: ${fileId}. Deleting from Google Drive...`);
        await deletePhotoFromDrive(fileId);
      } else {
        console.warn(`Could not find file "${actualFileName}" in Google Drive to delete.`);
      }
    }

    return { success: true, message: 'Set photo deleted.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not delete the set photo.' };
  }
}

export async function deleteBookingAction(formData: FormData) {
  try {
    const bookingId = normalize(formData.get('BookingID'));
    const context = { currentUserName: normalize(formData.get('currentUserName')), currentUserRole: normalize(formData.get('currentUserRole')) };
    if (!bookingId) return { success: false, error: 'Booking ID is required.' };
    const { rowNumber } = await findBookingRow(bookingId);
    if (normalizeRole(context.currentUserRole) !== 'admin') return { success: false, error: 'Only Admin users can delete bookings.' };
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `Bookings!A${rowNumber}:S${rowNumber}` });
    return { success: true, message: `Booking ${bookingId} deleted successfully.` };
  } catch (error: unknown) {
    console.error('Delete booking failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete booking.';
    return { success: false, error: message };
  }
}

export type EditableBooking = Pick<EnhancedBooking, 'BookingID' | 'Salesperson' | 'Hospital' | 'Doctor' | 'CaseDate' | 'CaseTime' | 'Status' | 'Driver' | 'Type' | 'RelatedBookingSets'> & {
  'Deliver Before'?: string;
  'Special Request'?: string;
  'Requested Sets'?: string;
  'Selected Sets'?: string;
  'Patient MRN'?: string;
  'Delivery Note'?: string;
  'Delivery Note Link'?: string;
};
