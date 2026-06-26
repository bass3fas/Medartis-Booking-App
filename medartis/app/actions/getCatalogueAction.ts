// app/actions/getCatalogueAction.ts
'use server';

import { google } from 'googleapis';
import { PartsMaster, TraysContent, Usage } from '../types/interfaces';

export interface VirtualPartsMaster extends PartsMaster {
  inSetsQty: number; // 🌟 Restored: Counts items matching PartNumber OR Master SKU
  rowIndex: string;  
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

export async function fetchPartsCatalogue(): Promise<{ success: boolean; data: VirtualPartsMaster[]; error?: string }> {
  try {
    const [rawParts, rawContents, rawUsages] = await Promise.all([
      getSheetRows('PartsMaster!A1:Z'),
      getSheetRows('TraysContent!A1:Z'),
      getSheetRows('Usage!A1:Z')
    ]);

    if (rawParts.length < 2) return { success: true, data: [] };

    const [partsHeaders, ...partsRows] = rawParts;
    const partsMasterList: PartsMaster[] = partsRows.map(row => {
      const obj: any = {};
      partsHeaders.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj as PartsMaster;
    });

    if (rawContents.length < 2) {
      return { success: true, data: partsMasterList.map((p, idx) => ({ ...p, inSetsQty: 0, rowIndex: `row-${idx}` })) };
    }

    const [contentHeaders, ...contentRows] = rawContents;
    const traysContentList: TraysContent[] = contentRows.map(row => {
      const obj: any = {};
      contentHeaders.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj as TraysContent;
    });

    let usageList: Usage[] = [];
    if (rawUsages.length >= 2) {
      const [usageHeaders, ...usageRows] = rawUsages;
      usageList = usageRows.map(row => {
        const obj: any = {};
        usageHeaders.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj as Usage;
      });
    }

    // 1. Standalone TraysContent [Current Qty] Calculation
    const virtualContents = traysContentList.map(item => {
      const ideal = Number(item.IdealQty) || 0;
      const baseQty = (item.ActualQty === undefined || item.ActualQty === '') ? ideal : Number(item.ActualQty) || 0;

      const pendingUsageSum = usageList
        .filter(u => u.ItemID === item.ItemID && (u["Usage Status"] === 'Pending to Refill' || u.Status === 'Pending to Refill'))
        .reduce((sum, u) => sum + (Number(u.QtyUsed) || 0), 0);

      return {
        ...item,
        currentQty: baseQty - pendingUsageSum
      };
    });

    // 2. Map PartsMaster and cross-reference values using your exact formula rules
    const enrichedCatalogue: VirtualPartsMaster[] = partsMasterList.map((part, idx) => {
      const partNum = (part.PartNumber || '').toString().trim().toLowerCase();
      const masterSku = (part["Master SKU"] || '').toString().trim().toLowerCase();

      // Look across TraysContent using BOTH keys to capture everything accurately
      const inSetsQty = virtualContents
        .filter(tc => {
          const tcPart = (tc.PartNumber || '').toString().trim().toLowerCase();
          return tcPart === partNum || (masterSku !== '' && tcPart === masterSku);
        })
        .reduce((sum, tc) => sum + tc.currentQty, 0);

      return {
        ...part,
        inSetsQty, // Raw, independent kit fleet quantity
        rowIndex: `row-${idx}-${part.PartNumber}`
      };
    });

    return { success: true, data: enrichedCatalogue };
  } catch (err: any) {
    console.error(err);
    return { success: false, data: [], error: err.message };
  }
}