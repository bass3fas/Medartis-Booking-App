// app/actions/getUsagesAction.ts
'use server';

import { google } from 'googleapis';
import { EnrichedUsage, PatientMRNGroup } from '../types/interfaces';




async function getSheetRows(rangeName: string): Promise<any[]> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: rangeName,
  });
  return response.data.values || [];
}

// Helper to translate relative sheet values into functional AppSheet signatures
function buildAppSheetImageUrl(fileName: string): string {
  if (!fileName || fileName.trim() === '') return '';
  if (fileName.startsWith('http')) return fileName;

  const encodedFile = encodeURIComponent(fileName.trim());
  // 🔥 Appending &width=1000 forces AppSheet to pre-render and stream a clear copy immediately inline
  return `https://www.appsheet.com/image/getimageurl?appName=MedartisPhase1-5435197&tableName=Usage%20Photos&fileName=${encodedFile}&width=1000`;
}

export async function fetchUsageLog(): Promise<{ success: boolean; data: PatientMRNGroup[]; error?: string }> {
  try {
    const [rawUsages, rawPhotos, rawParts] = await Promise.all([
      getSheetRows('Usage!A1:Z'),
      getSheetRows("'Usage Photos'!A1:Z"),
      getSheetRows('PartsMaster!A1:Z')
    ]);

    if (rawUsages.length < 2) return { success: true, data: [] };

    // 1. Build PartsMaster Map (Keep as is...)
    const partsDescriptionMap: { [partNumber: string]: string } = {};
    if (rawParts.length >= 2) {
      const [partsHeaders, ...partsRows] = rawParts;
      const partNumIdx = partsHeaders.indexOf('PartNumber');
      const descIdx = partsHeaders.indexOf('Description');
      if (partNumIdx !== -1 && descIdx !== -1) {
        partsRows.forEach(row => {
          if (row[partNumIdx]) {
            partsDescriptionMap[row[partNumIdx].toString().trim().toLowerCase()] = row[descIdx] || '';
          }
        });
      }
    }

    // 2. Parse Usage Log items (Keep as is...)
    const [usageHeaders, ...usageRows] = rawUsages;
    const usageList: EnrichedUsage[] = usageRows.map((row, idx) => {
      const item: any = {};
      usageHeaders.forEach((h, i) => { item[h] = row[i] !== undefined ? row[i] : ''; });
      const used = Number(item.QtyUsed) || 0;
      const refilled = Number(item["Qty Refilled"]) || 0;
      
      if (!item.Description || item.Description.trim() === '') {
        const lookupKey = (item.PartNumber || '').toString().trim().toLowerCase();
        item.Description = partsDescriptionMap[lookupKey] || '';
      }

      return {
        ...item,
        computedUsageStatus: used === refilled ? 'Refilled' : 'Pending to Refill',
        rowIndex: `usage-row-${idx}`
      };
    });

    // 3. Parse standalone Usage Photos (Keep as is...)
    let photoList: any[] = [];
    if (rawPhotos.length >= 2) {
      const [photoHeaders, ...photoRows] = rawPhotos;
      photoList = photoRows.map(row => {
        const obj: any = {};
        photoHeaders.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      });
    }

    // 4. 🧠 UPDATED STRUCTURAL GROUPING ENGINE
    const groupsMap: { [key: string]: PatientMRNGroup } = {};

    usageList.forEach((usage) => {
      const rawMrn = (usage.PatientMRN || '').toString().trim();
      const bookingId = (usage.BookingID || '').toString().trim() || 'NoBooking';
      const hospital = (usage.Hospital || '').toString().trim() || 'UnknownFacility';
      const date = (usage.Date || '').toString().trim() || 'NoDate';

      // Determine clean display label
      const displayMrn = rawMrn !== '' ? rawMrn : 'No MRN Assigned';

      // 🔄 DYNAMIC KEY ROUTING:
      const groupKey = rawMrn !== '' 
        ? `${rawMrn}-${bookingId}` 
        : `NOMRN-HASH-${hospital.replace(/\s+/g, '')}-${date.replace(/\//g, '-')}-${bookingId}`;

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          groupKey: groupKey,
          PatientMRN: displayMrn,
          Hospital: usage.Hospital || 'Unknown Facility',
          Date: usage.Date || '—',
          BookingID: usage.BookingID || '—',
          items: [],
          photos: []
        };
      }
      groupsMap[groupKey].items.push(usage);

      // Append inline item photo strings
      if (usage.Photo && usage.Photo.trim() !== '') {
        const targetUrl = buildAppSheetImageUrl(usage.Photo);
        if (targetUrl && !groupsMap[groupKey].photos.includes(targetUrl)) {
          groupsMap[groupKey].photos.push(targetUrl);
        }
      }
    });

    // 5. Cross-reference photos matching the context keys
    photoList.forEach(pRow => {
      const pMRN = (pRow.MRN || '').toString().trim();
      const pBooking = (pRow.BookingID || '').toString().trim() || 'NoBooking';
      const pDate = (pRow.Date || '').toString().trim();
      
      // We look up standard data maps or fall into context routing maps
      let matchingGroupKey = '';
      if (pMRN !== '') {
        matchingGroupKey = `${pMRN}-${pBooking}`;
      } else {
        // Look up which unassigned group this photo belongs to by matching metadata context
        const discoveredKey = Object.keys(groupsMap).find(key => {
          const group = groupsMap[key];
          return group.PatientMRN === 'No MRN Assigned' && 
                 group.BookingID === pBooking &&
                 (pDate === '' || group.Date === pDate);
        });
        if (discoveredKey) matchingGroupKey = discoveredKey;
      }

      if (matchingGroupKey && groupsMap[matchingGroupKey] && pRow.Photo && pRow.Photo.trim() !== '') {
        const targetUrl = buildAppSheetImageUrl(pRow.Photo);
        if (targetUrl && !groupsMap[matchingGroupKey].photos.includes(targetUrl)) {
          groupsMap[matchingGroupKey].photos.push(targetUrl);
        }
      }
    });

    // 🔄 Robust descending date sorting pipeline
    const sortedGroups = Object.values(groupsMap).sort((a, b) => {
      const dateA = a.Date && a.Date !== '—' ? new Date(a.Date).getTime() : 0;
      const dateB = b.Date && b.Date !== '—' ? new Date(b.Date).getTime() : 0;

      // If both have valid dates, sort descending (newest first)
      if (dateA !== 0 && dateB !== 0) {
        return dateB - dateA;
      }

      // Fallback structural safety: push rows with missing dates (0) to the bottom
      return dateA === 0 ? 1 : -1;
    });

    return { success: true, data: sortedGroups };
  } catch (err: any) {
    console.error(err);
    return { success: false, data: [], error: err.message };
  }
}