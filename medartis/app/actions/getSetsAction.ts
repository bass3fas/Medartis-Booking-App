// app/actions/getSetsAction.ts
'use server';

import { getSets, getBookings, getTrays, getUsage } from '../lib/google-sheets';
import { Trays, TraysContent, Usage } from '../types/interfaces';
import { google } from 'googleapis';

// --- Extended TypeScript Interfaces with Virtual Columns ---

export interface VirtualSet {
  SetID: string;
  SetName: string;
  LoanType?: string;
  Location?: string;
  SystemStatus?: string;
  Notes?: string;
  computedStatus: 'Free' | 'Booked';
  computedComplete: 'Yes' | 'No';
  computedLocation: string;
}

export interface VirtualTraysContent extends TraysContent {
  computedCurrentQty: number;
}

export interface EnrichedTray extends Trays {
  computedTrayStatus: 'Complete' | 'InComplete';
  contents: VirtualTraysContent[];
}

// Low-level helper to fetch TraysContent directly using your library pattern
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

// --- MAIN ENRICHED SETS FETCH (Used by the dashboard grid) ---
export async function fetchEnrichedSets(): Promise<{ success: boolean; data: VirtualSet[]; error?: string }> {
  try {
    // 1. Fetch all 5 required tables in parallel
    const [rawSets, rawBookings, rawTrays, rawContents, rawUsages] = await Promise.all([
      getSets(),
      getBookings(),
      getTrays(),
      getRawTraysContent(),
      getUsage()
    ]);

    // 2. Pre-calculate Trays Content with their virtual "Current Qty"
    const virtualContents: VirtualTraysContent[] = rawContents.map(item => {
      const ideal = Number(item.IdealQty) || 0;
      // AppSheet logic: If ActualQty is blank/undefined, fall back to IdealQty
      const baseQty = (item.ActualQty === undefined || item.ActualQty === '') ? ideal : Number(item.ActualQty) || 0;

      // Filter matching pending usages: [ItemID] = [_THISROW].[ItemID] AND status = "Pending to Refill"
      const pendingUsageSum = rawUsages
        .filter(u => u.ItemID === item.ItemID && (u["Usage Status"] === 'Pending to Refill' || u.Status === 'Pending to Refill'))
        .reduce((sum, u) => sum + (Number(u.QtyUsed) || 0), 0);

      return {
        ...item,
        computedCurrentQty: baseQty - pendingUsageSum
      };
    });

    // 3. Pre-calculate Trays with their virtual "TrayStatus"
    const virtualTrays: EnrichedTray[] = rawTrays.map(tray => {
      const relatedContents = virtualContents.filter(c => c.TrayID === tray.TrayID);
      
      const totalCurrentQty = relatedContents.reduce((sum, c) => sum + c.computedCurrentQty, 0);
      const totalIdealQty = relatedContents.reduce((sum, c) => sum + (Number(c.IdealQty) || 0), 0);

      // AppSheet logic: if(sum(Current Qty) >= sum(IdealQty), "Complete", "InComplete")
      const computedTrayStatus = totalCurrentQty >= totalIdealQty ? 'Complete' : 'InComplete';

      return {
        ...tray,
        computedTrayStatus,
        contents: relatedContents
      };
    });

    // 4. Map final Set level values (Availability, Location, and cascading Completeness)
    const enrichedSets: VirtualSet[] = rawSets.map((set) => {
      const setId = set.SetID;

      // Rule A: Availability Status (Free vs Booked)
      const isActiveBooking = rawBookings.some(b => {
        const requestedSets = b["Requested Sets"] || b["Selected Sets"] || "";
        const isAttached = requestedSets.includes(setId);
        const isNotClosed = !["Returned", "Usage Received", "Cancelled"].includes(b.Status);
        return isAttached && isNotClosed;
      });
      const computedStatus = isActiveBooking ? 'Booked' : 'Free';

      // Rule B: Set Complete? (Based entirely on our virtual TrayStatus calculations!)
      const relatedSetTrays = virtualTrays.filter(t => t.SetID === setId);
      const hasIncompleteTray = relatedSetTrays.some(t => t.computedTrayStatus === 'InComplete');
      const computedComplete = hasIncompleteTray ? 'No' : 'Yes';

      // Rule C: Current Location Routing
      const activeTransitBookings = rawBookings
        .filter(b => {
          const requestedSets = b["Requested Sets"] || b["Selected Sets"] || "";
          return requestedSets.includes(setId) && ["Delivered", "Usage Received"].includes(b.Status);
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.CaseDate} ${a.CaseTime || '00:00'}`).getTime();
          const dateB = new Date(`${b.CaseDate} ${b.CaseTime || '00:00'}`).getTime();
          return dateB - dateA;
        });

      const computedLocation = activeTransitBookings.length > 0 
        ? activeTransitBookings[0].Hospital 
        : (set.Location || 'Warehouse Stock');

      return {
        ...set,
        computedStatus,
        computedComplete,
        computedLocation
      };
    });

    return { success: true, data: enrichedSets };
  } catch (err: any) {
    console.error("Critical error in cascade virtual calculation engine:", err);
    return { success: false, data: [], error: err.message };
  }
}

// --- SPECIFIC RELATIONAL TRAYS FETCH (Used by the inspection side drawer) ---
export async function fetchTraysForSet(setId: string): Promise<{ success: boolean; data: EnrichedTray[]; error?: string }> {
  try {
    // Re-run the calculations filtered strictly down for the single selected Set drawer lookups
    const [rawTrays, rawContents, rawUsages] = await Promise.all([
      getTrays(),
      getRawTraysContent(),
      getUsage()
    ]);

    const relatedTrays = rawTrays.filter(t => t.SetID === setId);

    const enrichedTrays: EnrichedTray[] = relatedTrays.map(tray => {
      const relatedContents = rawContents.filter(c => c.TrayID === tray.TrayID);
      
      const virtualContents: VirtualTraysContent[] = relatedContents.map(item => {
        const ideal = Number(item.IdealQty) || 0;
        const baseQty = (item.ActualQty === undefined || item.ActualQty === '') ? ideal : Number(item.ActualQty) || 0;
        
        const pendingUsageSum = rawUsages
          .filter(u => u.ItemID === item.ItemID && (u["Usage Status"] === 'Pending to Refill' || u.Status === 'Pending to Refill'))
          .reduce((sum, u) => sum + (Number(u.QtyUsed) || 0), 0);

        return {
          ...item,
          computedCurrentQty: baseQty - pendingUsageSum
        };
      });

      const totalCurrentQty = virtualContents.reduce((sum, c) => sum + c.computedCurrentQty, 0);
      const totalIdealQty = virtualContents.reduce((sum, c) => sum + (Number(c.IdealQty) || 0), 0);
      const computedTrayStatus = totalCurrentQty >= totalIdealQty ? 'Complete' : 'InComplete';

      return {
        ...tray,
        computedTrayStatus,
        contents: virtualContents
      };
    });

    return { success: true, data: enrichedTrays };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}