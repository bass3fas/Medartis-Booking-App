// app/actions/getSetsAction.ts
'use server';

import { getSets, getBookings, getTrays, getUsage } from '../lib/google-sheets';
import { Trays, TraysContent, Usage, Sets } from '../types/interfaces';
import { google } from 'googleapis';

export interface VirtualSet extends Sets {
  computedStatus: 'Free' | 'Booked';
  computedComplete: 'Yes' | 'No';
  computedLocation: string;
}

export interface VirtualUsage extends Usage {
  computedUsageStatus: 'Refilled' | 'Pending to Refill';
}

export interface VirtualTraysContent extends TraysContent {
  computedCurrentQty: number;
  itemHistory: VirtualUsage[];
}

export interface EnrichedTray extends Trays {
  computedTrayStatus: 'Complete' | 'InComplete';
  contents: VirtualTraysContent[];
}

// Low-level helper to fetch TraysContent sheets data directly
async function getRawTraysContent(): Promise<TraysContent[]> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: 'TraysContent!A1:Z',
  });
  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const [headers, ...dataRows] = rows;
  return dataRows.map((row) => {
    const item: any = {};
    headers.forEach((header, index) => {
      item[header] = row[index] !== undefined ? row[index] : '';
    });
    return item as TraysContent;
  });
}

// ==========================================
// 1. MAIN MATRIX PAGE LOADER (Restored Original Working Math)
// ==========================================
export async function fetchEnrichedSets(): Promise<{ success: boolean; data: VirtualSet[]; error?: string }> {
  try {
    const [rawSets, rawBookings, rawTrays, rawContents, rawUsages] = await Promise.all([
      getSets(),
      getBookings(),
      getTrays(),
      getRawTraysContent(),
      getUsage()
    ]);

    // 1. Calculate original item-level quantities exactly how they worked before
    const virtualContents = rawContents.map(item => {
      const ideal = Number(item.IdealQty) || 0;
      const baseQty = (item.ActualQty === undefined || item.ActualQty === '') ? ideal : Number(item.ActualQty) || 0;

      // Restored the clean original working usage filter
      const pendingUsageSum = rawUsages
        .filter(u => u.ItemID === item.ItemID && (u["Usage Status"] === 'Pending to Refill' || u.Status === 'Pending to Refill'))
        .reduce((sum, u) => sum + (Number(u.QtyUsed) || 0), 0);

      return {
        ...item,
        computedCurrentQty: baseQty - pendingUsageSum
      };
    });

    // 2. Map Trays and calculate TrayStatus accurately
    const virtualTrays = rawTrays.map(tray => {
      const relatedContents = virtualContents.filter(c => c.TrayID === tray.TrayID);
      const totalCurrentQty = relatedContents.reduce((sum, c) => sum + c.computedCurrentQty, 0);
      const totalIdealQty = relatedContents.reduce((sum, c) => sum + (Number(c.IdealQty) || 0), 0);
      
      // If our current items are less than ideal items, the tray is incomplete
      const computedTrayStatus = totalCurrentQty >= totalIdealQty ? 'Complete' : 'InComplete';

      return {
        ...tray,
        computedTrayStatus
      };
    });

    // 3. Map final Sets and evaluate completeness based on live trays
    const data: VirtualSet[] = rawSets.map((set) => {
      const setId = set.SetID;
      
      // Handle Location and Booking status mapping
      const match = rawBookings.find(b => {
        const requestedSets = b["Requested Sets"] || b["Selected Sets"] || "";
        return requestedSets.includes(setId) && !["Returned", "Cancelled"].includes(b.Status);
      });
      
      const computedStatus = match ? 'Booked' : 'Free';
      const computedLocation = match ? match.Hospital || 'In Transit' : (set.Location || 'Warehouse');
      
      // 🔗 LIVE COUPLING FIX:
      // Look at the computed statuses of all trays linked to this specific Set
      const relatedSetTrays = virtualTrays.filter(t => t.SetID === setId);
      const hasIncompleteTray = relatedSetTrays.some(t => t.computedTrayStatus === 'InComplete');
      
      // If any individual tray is InComplete, the whole set is marked "No" (Incomplete)
      const computedComplete = (relatedSetTrays.length > 0 && !hasIncompleteTray) ? 'Yes' : 'No';

      return {
        ...set,
        computedStatus,
        computedLocation,
        computedComplete
      };
    });

    return { success: true, data };
  } catch (err: any) {
    console.error('Error fetching enriched sets matrix:', err);
    return { success: false, data: [], error: err.message };
  }
}

// ==========================================
// 2. DETAILED SLIDE-OVER DRAWER DATA LOADER
// ==========================================
export async function fetchTraysAndUsageForSet(setId: string): Promise<{ 
  success: boolean; 
  trays: EnrichedTray[]; 
  setHistory: VirtualUsage[]; 
  error?: string 
}> {
  try {
    const [rawTrays, rawContents, rawUsages] = await Promise.all([
      getTrays(),
      getRawTraysContent(),
      getUsage()
    ]);

    const processedUsages: VirtualUsage[] = rawUsages.map(u => {
      const used = Number(u.QtyUsed) || 0;
      const refilled = Number(u["Qty Refilled"]) || 0;
      const computedUsageStatus = used === refilled ? 'Refilled' : 'Pending to Refill';
      return { ...u, computedUsageStatus };
    });

    const setHistory = processedUsages.filter(u => u.SetID === setId);
    const relatedTrays = rawTrays.filter(t => t.SetID === setId);

    const trays: EnrichedTray[] = relatedTrays.map(tray => {
      const relatedContents = rawContents.filter(c => c.TrayID === tray.TrayID);
      
      const contents: VirtualTraysContent[] = relatedContents.map(item => {
        const ideal = Number(item.IdealQty) || 0;
        const baseQty = (item.ActualQty === undefined || item.ActualQty === '') ? ideal : Number(item.ActualQty) || 0;
        
        const itemHistory = processedUsages.filter(u => u.ItemID === item.ItemID);

        const pendingUsageSum = itemHistory
          .filter(u => u.computedUsageStatus === 'Pending to Refill')
          .reduce((sum, u) => sum + (Number(u.QtyUsed) || 0), 0);

        return {
          ...item,
          computedCurrentQty: baseQty - pendingUsageSum,
          itemHistory
        };
      });

      const totalCurrentQty = contents.reduce((sum, c) => sum + c.computedCurrentQty, 0);
      const totalIdealQty = contents.reduce((sum, c) => sum + (Number(c.IdealQty) || 0), 0);
      const computedTrayStatus = totalCurrentQty >= totalIdealQty ? 'Complete' : 'InComplete';

      return {
        ...tray,
        computedTrayStatus,
        contents
      };
    });

    return { success: true, trays, setHistory };
  } catch (err: any) {
    return { success: false, trays: [], setHistory: [], error: err.message };
  }
}