'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';

const USAGE_FIELDS = ['PatientMRN', 'SetID', 'TrayID', 'PartNumber', 'QtyUsed', 'Qty Refilled', 'Date', 'Notes', 'Photo'] as const;

const text = (value: FormDataEntryValue | null) => String(value ?? '').trim();
const canManageUsage = (role: string) => ['admin', 'warehouse'].includes(role.trim().toLowerCase());

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
    if (!canManageUsage(text(formData.get('currentUserRole')))) return { success: false, error: 'Only Admin and Warehouse users can edit usage.' };
    if (!usageId) return { success: false, error: 'Usage ID is required.' };
    const { headers, row, rowNumber } = await findUsageRow(usageId);
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
    if (!canManageUsage(text(formData.get('currentUserRole')))) return { success: false, error: 'Only Admin and Warehouse users can delete usage.' };
    if (!usageId) return { success: false, error: 'Usage ID is required.' };
    const { rowNumber } = await findUsageRow(usageId);
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: `Usage!A${rowNumber}:S${rowNumber}` });
    return { success: true, message: 'Usage deleted.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not delete usage.' };
  }
}

export async function refillUsageAction(formData: FormData) {
  try {
    if (!canManageUsage(text(formData.get('currentUserRole')))) return { success: false, error: 'Only Admin and Warehouse users can refill usage.' };
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
