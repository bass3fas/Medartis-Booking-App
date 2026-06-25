// app/components/BottomNav.tsx
'use server';

import Link from 'next/link';

export default async function BottomNav() {
  return (
    /* fixed bottom-0 left-0 right-0: Locks the bar to the viewport permanently.
      grid grid-cols-3: Arranges the 3 anchors side-by-side horizontally.
    */
    <div className="fixed bottom-0 left-0 right-0 h-16 md:hidden border-t border-base-300 bg-base-100 z-50 shadow-lg grid grid-cols-3">
      
      {/* Sets Anchor */}
      <Link href="/sets" className="flex flex-row items-center justify-center gap-2 text-base-content hover:bg-base-200 transition-colors px-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-sm font-bold tracking-tight">Sets</span>
      </Link>

      {/* Bookings Anchor */}
      <Link href="/bookings" className="flex flex-row items-center justify-center gap-2 text-base-content hover:bg-base-200 transition-colors px-2 border-x border-base-200/60">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-bold tracking-tight">Bookings</span>
      </Link>

      {/* PartsMaster Anchor */}
      <Link href="/partsmaster" className="flex flex-row items-center justify-center gap-2 text-base-content hover:bg-base-200 transition-colors px-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <span className="text-sm font-bold tracking-tight">PartsMaster</span>
      </Link>

    </div>
  );
}