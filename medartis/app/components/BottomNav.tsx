// app/components/BottomNav.tsx
'use client';

import Link from 'next/link';

export default function BottomNav() {
  const handleSignOut = () => {
    localStorage.removeItem('medartis_session_token');
    window.dispatchEvent(new Event('app-signout'));
  };

  return (
    /* Changed grid size from grid-cols-3 to grid-cols-4 */
    <div className="fixed bottom-0 left-0 right-0 h-16 md:hidden border-t border-base-300 bg-base-100 z-50 shadow-lg grid grid-cols-4">
      
      <Link href="/sets" className="flex flex-row items-center justify-center gap-1 text-base-content hover:bg-base-200 transition-colors px-1">
        <span className="text-xs font-bold tracking-tight">Sets</span>
      </Link>

      <Link href="/bookings" className="flex flex-row items-center justify-center gap-1 text-base-content hover:bg-base-200 transition-colors px-1 border-x border-base-200/60">
        <span className="text-xs font-bold tracking-tight">Bookings</span>
      </Link>

      <Link href="/partsmaster" className="flex flex-row items-center justify-center gap-1 text-base-content hover:bg-base-200 transition-colors px-1">
        <span className="text-xs font-bold tracking-tight">Parts</span>
      </Link>

      {/* 🛑 Handheld Sign Out Anchor Action Container */}
      <button 
        onClick={handleSignOut} 
        className="flex flex-row items-center justify-center gap-1 text-error hover:bg-error/10 transition-colors px-1 border-l border-base-200/60"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="text-xs font-bold tracking-tight">Exit</span>
      </button>

    </div>
  );
}