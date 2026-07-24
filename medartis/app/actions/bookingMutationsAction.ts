'use server';

import crypto from 'crypto';
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
