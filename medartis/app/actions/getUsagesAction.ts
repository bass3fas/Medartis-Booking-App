// app/actions/getUsagesAction.ts
'use server';

import { google } from 'googleapis';
import { Usage } from '../types/interfaces';

export interface EnrichedUsage extends Usage {
  computedUsageStatus: 'Refilled' | 'Pending to Refill';
  rowIndex: string;
}

export interface PatientMRNGroup {
  PatientMRN: string;
  Hospital: string;
  Date: string;
  BookingID: string;
  items: EnrichedUsage[];
  photos: string[];
}

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

  // Encodes path parameters perfectly to comply with AppSheet image router architecture
  const encodedFile = encodeURIComponent(fileName.trim());
  return `https://www.appsheet.com/image/getimageurl?appName=MedartisPhase1-5435197&tableName=Usage%20Photos&fileName=${encodedFile}`;
}

export async function fetchUsageLog(): Promise<{ success: boolean; data: PatientMRNGroup[]; error?: string }> {
  try {
    const [rawUsages, rawPhotos, rawParts] = await Promise.all([
      getSheetRows('Usage!A1:Z'),
      getSheetRows("'Usage Photos'!A1:Z"),
      getSheetRows('PartsMaster!A1:Z')
    ]);

    if (rawUsages.length < 2) return { success: true, data: [] };

    // 1. Build a local high-speed dictionary map for PartsMaster descriptions
    const partsDescriptionMap: { [partNumber: string]: string } = {};
    if (rawParts.length >= 2) {
      const [partsHeaders, ...partsRows] = rawParts;
      const partNumIdx = partsHeaders.indexOf('PartNumber');
      const descIdx = partsHeaders.indexOf('Description');
      
      if (partNumIdx !== -1 && descIdx !== -1) {
        partsRows.forEach(row => {
          if (row[partNumIdx]) {
            const cleanKey = row[partNumIdx].toString().trim().toLowerCase();
            partsDescriptionMap[cleanKey] = row[descIdx] || '';
          }
        });
      }
    }

    // 2. Parse flat Usage Log items & stitch descriptions dynamically
    const [usageHeaders, ...usageRows] = rawUsages;
    const usageList: EnrichedUsage[] = usageRows.map((row, idx) => {
      const item: any = {};
      usageHeaders.forEach((h, i) => { item[h] = row[i] !== undefined ? row[i] : ''; });
      
      const used = Number(item.QtyUsed) || 0;
      const refilled = Number(item["Qty Refilled"]) || 0;
      
      // Dynamic cross-reference description fallback injection if column is blank
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

    // 3. Parse standalone Usage Photos rows
    let photoList: any[] = [];
    if (rawPhotos.length >= 2) {
      const [photoHeaders, ...photoRows] = rawPhotos;
      photoList = photoRows.map(row => {
        const obj: any = {};
        photoHeaders.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      });
    }

    // 4. Run structural case groupings mapping aggregation
    const groupsMap: { [key: string]: PatientMRNGroup } = {};

    usageList.forEach((usage) => {
      const mrn = (usage.PatientMRN || 'No-MRN').toString().trim();
      const bookingId = (usage.BookingID || 'No-Booking').toString().trim();
      const groupKey = `${mrn}-${bookingId}`;

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          PatientMRN: mrn,
          Hospital: usage.Hospital || 'Unknown Facility',
          Date: usage.Date || '—',
          BookingID: bookingId,
          items: [],
          photos: []
        };
      }
      groupsMap[groupKey].items.push(usage);

      // Extract inline photo columns via AppSheet link wrapper
      if (usage.Photo && usage.Photo.trim() !== '') {
        const targetUrl = buildAppSheetImageUrl(usage.Photo);
        if (targetUrl && !groupsMap[groupKey].photos.includes(targetUrl)) {
          groupsMap[groupKey].photos.push(targetUrl);
        }
      }
    });

    // 5. Inject photos from the secondary 'Usage Photos' tab
    photoList.forEach(pRow => {
      const pMRN = (pRow.MRN || '').toString().trim();
      const pBooking = (pRow.BookingID || '').toString().trim();
      const matchingGroupKey = `${pMRN}-${pBooking}`;

      if (groupsMap[matchingGroupKey] && pRow.Photo && pRow.Photo.trim() !== '') {
        const targetUrl = buildAppSheetImageUrl(pRow.Photo);
        if (targetUrl && !groupsMap[matchingGroupKey].photos.includes(targetUrl)) {
          groupsMap[matchingGroupKey].photos.push(targetUrl);
        }
      }
    });

    const sortedGroups = Object.values(groupsMap).sort((a, b) => {
      return new Date(b.Date).getTime() - new Date(a.Date).getTime();
    });

    return { success: true, data: sortedGroups };
  } catch (err: any) {
    console.error(err);
    return { success: false, data: [], error: err.message };
  }
}