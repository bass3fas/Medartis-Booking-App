'use server';

import { prisma } from '@/app/lib/db';
import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { writeHistoryLog } from '../lib/history-log';

const text = (value: unknown) => String(value ?? '').trim();
const isAdmin = (role: unknown) => text(role).toLowerCase() === 'admin';

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

function parseSnapshot(snapshot: string) {
  try { return JSON.parse(snapshot); } catch { return null; }
}

export async function fetchHistoryLogsAction(formData: FormData) {
  if (!isAdmin(formData.get('currentUserRole'))) return { success: false, error: 'Only Admin users can view history logs.' };
  const logs = await prisma.historyLog.findMany({ orderBy: { timestamp: 'desc' }, take: 200 });
  return { success: true, logs };
}

export async function restoreHistoryLogAction(formData: FormData) {
  try {
    if (!isAdmin(formData.get('currentUserRole'))) return { success: false, error: 'Only Admin users can restore history logs.' };
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing.');
    const logId = text(formData.get('logId'));
    const actor = { name: text(formData.get('currentUserName')), email: text(formData.get('currentUserEmail')), role: text(formData.get('currentUserRole')) };
    const log = await prisma.historyLog.findUnique({ where: { id: logId } });
    if (!log) return { success: false, error: 'History log entry was not found.' };
    const previous = parseSnapshot(log.previousData);
    if (!previous || typeof previous !== 'object' || Array.isArray(previous)) return { success: false, error: 'This log does not contain a restorable row snapshot.' };

    const sheetRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${log.targetTable}!A1:Z` });
    const [headers = [], ...rows] = sheetRows.data.values || [];
    const idColumn = headers.findIndex((header) => ['BookingID', 'UsageID', 'SetID', 'TrayID'].includes(text(header)));
    if (idColumn === -1) return { success: false, error: `${log.targetTable} does not have a supported ID column.` };
    const rowOffset = rows.findIndex((row) => text(row[idColumn]).toUpperCase() === log.targetRowId.toUpperCase());
    if (rowOffset === -1) return { success: false, error: `Row ${log.targetRowId} no longer exists in ${log.targetTable}.` };
    const current = headers.reduce<Record<string, string>>((acc, header, index) => { acc[text(header)] = text(rows[rowOffset][index]); return acc; }, {});
    const restoredRow = headers.map((header) => text((previous as Record<string, unknown>)[text(header)]));
    const rowNumber = rowOffset + 2;
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${log.targetTable}!A${rowNumber}:${columnLetter(headers.length - 1)}${rowNumber}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [restoredRow] } });
    await writeHistoryLog({ targetTable: log.targetTable, targetRowId: log.targetRowId, actionType: 'RESTORE', previousData: current, newData: previous, actor });
    return { success: true, message: `${log.targetTable} ${log.targetRowId} was restored.` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Restore failed.' };
  }
}
