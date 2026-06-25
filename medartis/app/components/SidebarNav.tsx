// app/components/SidebarNav.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SidebarNav() {
  const [operatorName, setOperatorName] = useState('Operator');

  useEffect(() => {
    // Isolated logic block to pull and handle local token mapping
    const readSessionName = () => {
      const sessionToken = localStorage.getItem('medartis_session_token');
      if (sessionToken) {
        try {
          const session = JSON.parse(sessionToken);
          if (session.name) {
            setOperatorName(session.name);
          }
        } catch (e) {
          console.error('Failed to parse session token for sidebar greeting', e);
        }
      }
    };

    // Run immediately when component mounts
    readSessionName();

    // 👂 Listen for the sign-in broadcast event to update the name instantly
    window.addEventListener('app-signin', readSessionName);
    
    return () => {
      window.removeEventListener('app-signin', readSessionName);
    };
  }, []);

  const handleSignOut = () => {
    // 1. Clear the token immediately
    localStorage.removeItem('medartis_session_token');
    
    // 2. Fire the state event for instant UI feedback
    window.dispatchEvent(new Event('app-signout'));
    
    // 3. Force a hard reload to clean all background component states and cache
    window.location.href = '/'; 
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 bottom-0 left-0 bg-base-100 border-r border-base-300 text-base-content justify-between shadow-sm z-40">
      
      {/* Upper Navigation Content Shell */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        
        {/* Elegant Dynamic Greet Panel */}
        <div className="px-6 py-5 border-b border-base-200 bg-base-100 sticky top-0 z-10 flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-mono tracking-widest opacity-40 font-bold block mb-0.5">
              Secure Session
            </span>
            <h2 className="text-sm font-black tracking-tight truncate">
              Hello, {operatorName}
            </h2>
          </div>
        </div>

        {/* Unified Navigation Links Container */}
        <div className="p-4 flex flex-col gap-6">
          
          {/* Core Modules Segment */}
          <div>
            <span className="px-3 text-[10px] uppercase font-mono tracking-widest opacity-40 font-bold block mb-2">
              Core Modules
            </span>
            <nav className="flex flex-col gap-1">
              <Link href="/sets" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Sets Data</span>
              </Link>

              <Link href="/bookings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Bookings Tracker</span>
              </Link>

              <Link href="/partsmaster" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>PartsMaster Catalog</span>
              </Link>
            </nav>
          </div>

          {/* Operational Ledger Segment */}
          <div>
            <span className="px-3 text-[10px] uppercase font-mono tracking-widest opacity-40 font-bold block mb-2">
              Operations
            </span>
            <nav className="flex flex-col gap-1">
              <Link href="/usage" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Usage Logs</span>
                </div>
                <span className="badge badge-sm badge-success badge-outline font-mono font-bold text-[9px] px-1.5 opacity-80">Live</span>
              </Link>
            </nav>
          </div>

          {/* Dynamic Action Filters Segment */}
          <div>
            <span className="px-3 text-[10px] uppercase font-mono tracking-widest opacity-40 font-bold block mb-2">
              Dynamic Filters
            </span>
            <nav className="flex flex-col gap-0.5 border-l border-base-300 ml-4 pl-2">
              <Link href="/filters/pending-refills" className="px-3 py-1.5 rounded-md text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-base-200 transition-all block">
                Pending Refills
              </Link>
              <Link href="/filters/warehouse-stock" className="px-3 py-1.5 rounded-md text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-base-200 transition-all block">
                Warehouse Stock
              </Link>
              <Link href="/filters/long-term-loans" className="px-3 py-1.5 rounded-md text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-base-200 transition-all block">
                Long-Term Loans
              </Link>
            </nav>
          </div>

        </div>
      </div>

      {/* Clean System Action Footing */}
      <div className="p-4 bg-base-100 border-t border-base-200 sticky bottom-0 z-10">
        <button 
          onClick={handleSignOut} 
          className="btn btn-error btn-outline btn-sm w-full font-bold normal-case text-xs transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out of Hub
        </button>
      </div>

    </aside>
  );
}