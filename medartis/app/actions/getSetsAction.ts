// app/actions/getSetsAction.ts
'use server';

import { getSets, getBookings, getTrays, getUsage } from '../lib/google-sheets';
import { Sets, Bookings, Trays } from '../types/interfaces';

// Let's explicitly define our calculated virtual model shape
export interface VirtualSet extends Sets {
  computedStatus: 'Free' | 'Booked';
  computedComplete: 'Yes' | 'No';
  computedLocation: string;
}

export async function fetchEnrichedSets(): Promise<{ success: boolean; data: VirtualSet[]; error?: string }> {
  try {
    // 1. Fetch tables in parallel using your existing library helpers
    const [rawSets, rawBookings, rawTrays] = await Promise.all([
      getSets(),
      getBookings(),
      getTrays()
    ]);

    // Note: If you don't have a getBookingSets() function in your sheets lib yet, 
    // it usually maps down safely by matching the Request/Selected sets inside rawBookings.
    
    const enrichedSets: VirtualSet[] = rawSets.map((set) => {
      const setId = set.SetID;

      // 🔄 Formula 1: SetStatus (Free vs Booked)
      // Checks if this set is attached to an active booking that isn't returned, canceled, or completed
      const isActiveBooking = rawBookings.some(b => {
        const requestedSets = b["Requested Sets"] || b["Selected Sets"] || "";
        const isAttached = requestedSets.includes(setId);
        const isNotClosed = !["Returned", "Usage Received", "Cancelled"].includes(b.Status);
        return isAttached && isNotClosed;
      });
      const computedStatus = isActiveBooking ? 'Booked' : 'Free';

      // 🔄 Formula 2: SetComplete? (Yes vs No)
      // Looks at related Trays for this SetID. If ANY tray has a status of "InComplete", the set is incomplete.
      const relatedTrays = rawTrays.filter(t => t.SetID === setId);
      const hasIncompleteTray = relatedTrays.some(t => t.TrayStatus === 'InComplete' || t.Status === 'InComplete');
      const computedComplete = hasIncompleteTray ? 'No' : 'Yes';

      // 🔄 Formula 3: CurrentLocation
      // Find active or delivered bookings, sort by date/time to find the latest hospital location
      const activeTransitBookings = rawBookings
        .filter(b => {
          const requestedSets = b["Requested Sets"] || b["Selected Sets"] || "";
          return requestedSets.includes(setId) && ["Delivered", "Usage Received"].includes(b.Status);
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.CaseDate} ${a.CaseTime || '00:00'}`).getTime();
          const dateB = new Date(`${b.CaseDate} ${b.CaseTime || '00:00'}`).getTime();
          return dateB - dateA; // Sort descending (latest first)
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
    console.error("Relational data extraction failed:", err);
    return { success: false, data: [], error: err.message };
  }
}