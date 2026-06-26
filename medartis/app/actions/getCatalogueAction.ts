// app/actions/getCatalogueAction.ts
'use server';

import { google } from 'googleapis';
import { PartsMaster, TraysContent, Usage, Trays } from '../types/interfaces';

export interface PartAllocationRef {
  SetID: string;
  TrayID: string;
  TrayName: string;
  CurrentQty: number;
}

export interface VirtualPartsMaster extends PartsMaster {
  inSetsQty: number;
  rowIndex: string;
  allocations: PartAllocationRef[];
  history: Usage[];
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
    const [rawParts, rawContents, rawUsages, rawTrays] = await Promise.all([
      getSheetRows('PartsMaster!A1:Z'),
      getSheetRows('TraysContent!A1:Z'),
      getSheetRows('Usage!A1:Z'),
      getSheetRows('Trays!A1:Z')
    ]);

    if (rawParts.length < 2) return { success: true, data: [] };

    const [partsHeaders, ...partsRows] = rawParts;
    const partsMasterList: PartsMaster[] = partsRows.map(row => {
      const obj: any = {};
      partsHeaders.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj as PartsMaster;
    });

    // Parse TraysContent
    const traysContentList: TraysContent[] = rawContents.length >= 2 ? (() => {
      const [headers, ...rows] = rawContents;
      return rows.map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj as TraysContent;
      });
    })() : [];

    // Parse Usage
    const usageList: Usage[] = rawUsages.length >= 2 ? (() => {
      const [headers, ...rows] = rawUsages;
      return rows.map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj as Usage;
      });
    })() : [];

    // Parse Trays Layout Map
    const traysList: Trays[] = rawTrays.length >= 2 ? (() => {
      const [headers, ...rows] = rawTrays;
      return rows.map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj as Trays;
      });
    })() : [];

    // 1. Core Item Math Step
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

    // 2. Build Structural Relations
    const enrichedCatalogue: VirtualPartsMaster[] = partsMasterList.map((part, idx) => {
      const partNum = (part.PartNumber || '').toString().trim().toLowerCase();
      const masterSku = (part["Master SKU"] || '').toString().trim().toLowerCase();

      // Filter matched items in trays
      const matchedTrayContents = virtualContents.filter(tc => {
        const tcPart = (tc.PartNumber || '').toString().trim().toLowerCase();
        return tcPart === partNum || (masterSku !== '' && tcPart === masterSku);
      });

      const inSetsQty = matchedTrayContents.reduce((sum, tc) => sum + tc.currentQty, 0);

      // Map where this part exists (Allocations)
      const allocations: PartAllocationRef[] = matchedTrayContents.map(tc => {
        const parentTray = traysList.find(t => t.TrayID === tc.TrayID);
        return {
          SetID: parentTray ? parentTray.SetID : 'Unknown Set',
          TrayID: tc.TrayID,
          TrayName: parentTray ? parentTray.TrayName : 'Unknown Tray',
          CurrentQty: tc.currentQty
        };
      });

      // Filter direct historical logs
      const history = usageList.filter(u => {
        const uPart = (u.PartNumber || '').toString().trim().toLowerCase();
        return uPart === partNum || (masterSku !== '' && uPart === masterSku);
      });

      return {
        ...part,
        inSetsQty,
        allocations,
        history,
        rowIndex: `row-${idx}-${part.PartNumber}`
      };
    });

    return { success: true, data: enrichedCatalogue };
  } catch (err: any) {
    console.error(err);
    return { success: false, data: [], error: err.message };
  }
}