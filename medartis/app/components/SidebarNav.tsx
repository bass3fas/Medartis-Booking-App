// app/components/SidebarNav.tsx
'use client';

import Link from 'next/link';

export default function SidebarNav() {
  const handleSignOut = () => {
    localStorage.removeItem('medartis_session_token');
    // Dispatch a global application layout broadcast
    window.dispatchEvent(new Event('app-signout'));
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 bottom-0 left-0 bg-base-100 border-r border-base-300 text-base-content justify-between shadow-sm z-40">
      
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="px-6 py-5 border-b border-base-200 bg-base-100 sticky top-0 z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content font-bold shadow-sm">
            M
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight uppercase">Medartis Hub</h2>
            <p className="text-[10px] font-mono tracking-wider opacity-40">Inventory Engine</p>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-6">
          <div>
            <span className="px-3 text-[10px] uppercase font-mono tracking-widest opacity-40 font-bold block mb-2">Core Modules</span>
            <nav className="flex flex-col gap-1">
              <Link href="/sets" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">📦 Sets Data</Link>
              <Link href="/bookings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">📅 Bookings Tracker</Link>
              <Link href="/partsmaster" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">🔬 PartsMaster Catalog</Link>
            </nav>
          </div>

          <div>
            <span className="px-3 text-[10px] uppercase font-mono tracking-widest opacity-40 font-bold block mb-2">Operations</span>
            <nav className="flex flex-col gap-1">
              <Link href="/usage" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight hover:bg-base-200 transition-colors">
                <span>📋 Usage Logs</span>
                <span className="badge badge-sm badge-success badge-outline font-mono font-bold text-[9px] px-1.5 opacity-80">Live</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Profile and Action Footer */}
      <div className="p-4 bg-base-100 border-t border-base-200 sticky bottom-0 z-10 flex flex-col gap-2">
        <div className="bg-base-200 p-3 rounded-xl flex items-center gap-3 border border-base-300">
          <div className="avatar placeholder shrink-0">
            <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs">OP</div>
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-black truncate leading-none">Logistics Desk</p>
            <span className="inline-flex items-center gap-1 text-[10px] opacity-50 font-mono font-bold mt-1">Active Device</span>
          </div>
        </div>
        
        {/* 🛑 The Sign Out Trigger button */}
        <button 
          onClick={handleSignOut} 
          className="btn btn-error btn-outline btn-sm w-full font-bold mt-1 normal-case text-xs"
        >
          Sign Out of Hub
        </button>
      </div>

    </aside>
  );
}