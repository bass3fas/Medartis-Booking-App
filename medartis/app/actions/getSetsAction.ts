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
// 1. MAIN MATRIX PAGE LOADER (Isolated Structural Cascade)
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

    // Format all incoming usage states
    const processedUsages: VirtualUsage[] = rawUsages.map(u => {
      const used = Number(u.QtyUsed) || 0;
      const refilled = Number(u["Qty Refilled"]) || 0;
      return { 
        ...u, 
        computedUsageStatus: used === refilled ? 'Refilled' : 'Pending to Refill' 
      };
    });

    // Loop through every single Set independently to build isolated tray scopes
    const data: VirtualSet[] = rawSets.map((set) => {
      const setId = (set.SetID || '').toString().trim();
      const setName = (set.SetName || '').toString().trim();

      // Filter down only the specific trays tied to this set instance
      const relatedSetTrays = rawTrays.filter(t => (t.SetID || '').toString().trim() === setId);
      let setHasIncompleteTray = false;

      if (relatedSetTrays.length > 0) {
        relatedSetTrays.forEach(tray => {
          const trayContents = rawContents.filter(c => c.TrayID === tray.TrayID);
          let totalCurrent = 0;
          let totalIdeal = 0;

          trayContents.forEach(item => {
            const ideal = Number(item.IdealQty) || 0;
            const baseQty = (item.ActualQty === undefined || item.ActualQty === '') ? ideal : Number(item.ActualQty) || 0;
            const pendingUsageSum = processedUsages
              .filter(u => u.ItemID === item.ItemID && u.computedUsageStatus === 'Pending to Refill')
              .reduce((sum, u) => sum + (Number(u.QtyUsed) || 0), 0);

            totalCurrent += (baseQty - pendingUsageSum);
            totalIdeal += ideal;
          });

          if (totalCurrent < totalIdeal) {
            setHasIncompleteTray = true;
          }
        });
      }

      let computedComplete: 'Yes' | 'No' = 'Yes';
      if (relatedSetTrays.length > 0) {
        computedComplete = setHasIncompleteTray ? 'No' : 'Yes';
      } else {
        computedComplete = (set.IsComplete && set.IsComplete.toLowerCase() === 'yes') ? 'Yes' : 'No';
      }

      // ========================================================
      // 🎯 FIXED MASTER TWO-FIELD MATRIX ALLOCATION ENGINE 🎯
      // ========================================================
      const activeSetBookings = rawBookings.filter(b => {
        // Skip bookings that are already completed/Returned or dropped/Cancelled
        const bookingStatus = (b.Status || '').toString().trim();
        const isLive = !["Returned", "Cancelled"].includes(bookingStatus);
        if (!isLive) return false;

        // 1. Check inside "Selected Sets" (Matches exact serial tags like "SET-CCS17-A04")
        const rawSelected = b["Selected Sets"] || "";
        const selectedList = rawSelected.toString().split(',').map(s => s.trim()).filter(Boolean);
        const matchesSelectedID = selectedList.includes(setId);

        // 2. Check inside "Requested Sets" (Matches generic catalog descriptor profiles like "CCS 1.7")
        const rawRequested = b["Requested Sets"] || "";
        const requestedList = rawRequested.toString().split(',').map(s => s.trim()).filter(Boolean);
        const matchesGenericName = setName ? requestedList.includes(setName) : false;

        // A match in either field means this active booking has claimed the row item
        return matchesSelectedID || matchesGenericName;
      });

      const computedStatus = activeSetBookings.length > 0 ? 'Booked' : 'Free';
      
      // Default to initial static registry location property from database
      let computedLocation = set.Location || 'Warehouse';

      // Re-route target coordinates based on latest non-returned surgical event record found
      if (activeSetBookings.length > 0) {
        const sortedActiveBookings = [...activeSetBookings].sort((a, b) => {
          const dateCompare = (b.CaseDate || '').toString().localeCompare((a.CaseDate || '').toString());
          if (dateCompare !== 0) return dateCompare;
          return (b.CaseTime || '').toString().localeCompare((a.CaseTime || '').toString());
        });

        const latestActiveBooking = sortedActiveBookings[0];
        if (latestActiveBooking && latestActiveBooking.Hospital) {
          computedLocation = latestActiveBooking.Hospital;
        }
      }

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