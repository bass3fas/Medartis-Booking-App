'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { copyPhotoInDrive, deletePhotoFromDrive } from '../lib/googleDrive';

const USAGE_FIELDS = ['PatientMRN', 'SetID', 'TrayID', 'PartNumber', 'QtyUsed', 'Qty Refilled', 'Date', 'Notes', 'Photo'] as const;

const text = (value: unknown) => String(value ?? '').trim();
const isPrivileged = (role: string) => ['admin', 'warehouse'].includes(role.trim().toLowerCase());
const canManageUsage = async (role: string, userName: string, bookingId: string) => {
  const normalizedRole = role.trim().toLowerCase();
  if (isPrivileged(normalizedRole)) return true;
  if (normalizedRole !== 'sales') return false;
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:Z' });
  const [headers = [], ...rows] = response.data.values || [];
  const bookingColumn = headers.indexOf('BookingID');
  const salesColumn = headers.indexOf('Salesperson');
  if (bookingColumn === -1 || salesColumn === -1) return false;
  const booking = rows.find((row) => text(row[bookingColumn] || '').toUpperCase() === bookingId.trim().toUpperCase());
  return text(booking?.[salesColumn] || '').toLowerCase() === userName.trim().toLowerCase();
};

async function removeUsagePhotoRow(photoPath: string) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:Z" });
  const [headers = [], ...rows] = response.data.values || [];
  const photoColumn = headers.indexOf('Photo');
  if (photoColumn === -1) return;
  const rowOffset = rows.findIndex((row) => text(row[photoColumn]) === photoPath);
  if (rowOffset !== -1) await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: `'Usage Photos'!A${rowOffset + 2}:Z${rowOffset + 2}` });
}

async function removeBookingUsagePhotoReference(bookingId: string, photoPath: string) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:Z' });
  const [headers = [], ...rows] = response.data.values || [];
  const bookingColumn = headers.indexOf('BookingID');
  const usagePhotoColumn = headers.indexOf('UsagePhoto');
  if (bookingColumn === -1 || usagePhotoColumn === -1) return;
  const rowOffset = rows.findIndex((row) => text(row[bookingColumn]).toUpperCase() === bookingId.toUpperCase());
  if (rowOffset === -1) return;
  const nextPhotos = text(rows[rowOffset][usagePhotoColumn]).split(',').map((value) => value.trim()).filter((value) => value && value !== photoPath);
  await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID!, range: `Bookings!${String.fromCharCode(65 + usagePhotoColumn)}${rowOffset + 2}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[nextPhotos.join(', ')]] } });
}

async function findUsageRow(usageId: string) {
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usage!A1:S' });
  const [headers = [], ...rows] = response.data.values || [];
  const usageIdColumn = headers.indexOf('UsageID');
  if (usageIdColumn === -1) throw new Error('Usage sheet is missing its UsageID column.');
  const rowOffset = rows.findIndex((row) => String(row[usageIdColumn] ?? '').trim() === usageId);
  if (rowOffset === -1) throw new Error(`Usage ${usageId} was not found.`);
  return { headers, row: rows[rowOffset], rowNumber: rowOffset + 2 };
}

export async function updateUsageAction(formData: FormData) {
  try {
    const usageId = text(formData.get('UsageID'));
    if (!usageId) return { success: false, error: 'Usage ID is required.' };
    const { headers, row, rowNumber } = await findUsageRow(usageId);
    const bookingIdColumn = headers.indexOf('BookingID');
    if (!(await canManageUsage(text(formData.get('currentUserRole')), text(formData.get('currentUserName')), text(row[bookingIdColumn] || '')))) return { success: false, error: 'You do not have permission to edit this usage.' };
    const nextRow = headers.map((header, index) => USAGE_FIELDS.includes(header as typeof USAGE_FIELDS[number]) && formData.has(header) ? text(formData.get(header)) : row[index] ?? '');
    const used = Number(nextRow[headers.indexOf('QtyUsed')]) || 0;
    const refilled = Number(nextRow[headers.indexOf('Qty Refilled')]) || 0;
    const statusColumn = headers.indexOf('Usage Status');
    const lastUpdateColumn = headers.indexOf('Last Update');
    if (statusColumn !== -1) nextRow[statusColumn] = used === refilled ? 'Refilled' : 'Pending to Refill';
    if (lastUpdateColumn !== -1) nextRow[lastUpdateColumn] = new Date().toISOString();
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID!, range: `Usage!A${rowNumber}:S${rowNumber}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [nextRow.slice(0, 19)] } });
    return { success: true, message: 'Usage updated.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not update usage.' };
  }
}

export async function deleteUsageAction(formData: FormData) {
  try {
    const usageId = text(formData.get('UsageID'));
    if (!usageId) return { success: false, error: 'Usage ID is required.' };
    const { headers, row, rowNumber } = await findUsageRow(usageId);
    const bookingIdColumn = headers.indexOf('BookingID');
    const photoColumn = headers.indexOf('Photo');
    if (!(await canManageUsage(text(formData.get('currentUserRole')), text(formData.get('currentUserName')), text(row[bookingIdColumn] || '')))) return { success: false, error: 'You do not have permission to delete this usage.' };
    const photoPath = photoColumn === -1 ? '' : text(row[photoColumn]);
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: `Usage!A${rowNumber}:S${rowNumber}` });
    if (photoPath) {
      await deletePhotoFromDrive(photoPath.split('/').pop() || photoPath).catch((error) => console.warn('Usage photo drive delete failed:', error));
      await removeUsagePhotoRow(photoPath);
      await removeBookingUsagePhotoReference(text(row[bookingIdColumn] || ''), photoPath);
    }
    return { success: true, message: 'Usage deleted.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not delete usage.' };
  }
}

export async function refillUsageAction(formData: FormData) {
  try {
    if (!isPrivileged(text(formData.get('currentUserRole')))) return { success: false, error: 'Only Admin and Warehouse users can refill usage.' };
    const usageIds = JSON.parse(text(formData.get('UsageIDs')) || '[]') as string[];
    if (!Array.isArray(usageIds) || usageIds.length === 0) return { success: false, error: 'No usage entries were selected.' };
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usage!A1:S' });
    const [headers = [], ...rows] = response.data.values || [];
    const usageIdColumn = headers.indexOf('UsageID');
    const usedColumn = headers.indexOf('QtyUsed');
    const refilledColumn = headers.indexOf('Qty Refilled');
    const statusColumn = headers.indexOf('Usage Status');
    const updatedColumn = headers.indexOf('Last Update');
    if (usageIdColumn === -1 || usedColumn === -1 || refilledColumn === -1) throw new Error('Usage sheet is missing refill columns.');
    const values = rows.map((row, index) => ({ row, rowNumber: index + 2 })).filter(({ row }) => usageIds.includes(String(row[usageIdColumn] ?? '').trim())).map(({ row, rowNumber }) => {
      const nextRow = headers.map((_, index) => row[index] ?? '');
      nextRow[refilledColumn] = nextRow[usedColumn] ?? '0';
      if (statusColumn !== -1) nextRow[statusColumn] = 'Refilled';
      if (updatedColumn !== -1) nextRow[updatedColumn] = new Date().toISOString();
      return { range: `Usage!A${rowNumber}:S${rowNumber}`, values: [nextRow.slice(0, 19)] };
    });
    await Promise.all(values.map(({ range, values }) => sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values } })));
    return { success: true, message: `${values.length} usage entr${values.length === 1 ? 'y' : 'ies'} refilled.` };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not refill usage.' };
  }
}

export async function assignBookingUsagePhotoAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    const bookingId = text(formData.get('BookingID'));
    const patientMRN = text(formData.get('PatientMRN'));
    const photoPath = text(formData.get('Photo'));
    const date = text(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    if (!bookingId || !patientMRN || !photoPath) return { success: false, error: 'Booking ID, MRN, and photo are required.' };
    if (!(await canManageUsage(text(formData.get('currentUserRole')), text(formData.get('currentUserName')), bookingId))) return { success: false, error: 'You do not have permission to assign this booking photo.' };

    const safeMrn = patientMRN.replace(/[^a-zA-Z0-9_-]/g, '-');
    const originalExtension = (photoPath.split('.').pop() || 'jpeg').split('?')[0];
    const newFileName = `${safeMrn}.Photo.${new Date().toTimeString().split(' ')[0].replace(/:/g, '')}.${originalExtension}`;
    const usagePhotoPath = `Usage Photos_Images/${newFileName}`;

    // Apps Script should support action=copy. If a deployment has not added copy yet,
    // we still keep Sheets consistent by recording the original path for visibility.
    await copyPhotoInDrive(photoPath, newFileName, '1dAIcVsXX1llgMrqlT12YOtdizskGV5rg').catch((error) => console.warn('Drive copy failed; recording sheet row anyway:', error));

    const existingPhotoRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:D" });
    const photoRows = existingPhotoRows.data.values || [];
    const photoTargetRow = Math.max(2, photoRows.length + 1);
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `'Usage Photos'!A${photoTargetRow}:D${photoTargetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[patientMRN, usagePhotoPath, bookingId, date]] } });
    await removeBookingUsagePhotoReference(bookingId, photoPath);
    await deletePhotoFromDrive(photoPath.split('/').pop() || photoPath).catch((error) => console.warn('Original booking photo delete failed:', error));
    return { success: true, message: 'Usage photo assigned to MRN.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not assign booking photo.' };
  }
}
