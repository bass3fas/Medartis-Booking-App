// app/page.tsx
'use client';

import Link from 'next/link';

export default function DashboardHub() {
  return (
    <div className="min-h-screen bg-base-200/50 p-6 md:pl-72 pt-8 flex flex-col justify-center max-w-7xl mx-auto">
      
      {/* Structural Welcome Context */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black tracking-tight text-base-content">
          Medartis Control Hub
        </h1>
        <p className="text-sm font-medium opacity-50 mt-1">
          Select an operational core routing module to manage sheets workflows
        </p>
      </div>

      {/* --- THREE BIG COLOR-CODED INTERACTIVE BLOCKS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[340px]">
        
        {/* Module 1: LOG CASE USAGE (Primary Blue) */}
        <Link href="/usage/new" className="group flex flex-col justify-between p-8 bg-base-100 hover:bg-primary border border-base-300 hover:border-primary rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.99]">
          <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center text-primary group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="mt-12">
            <h2 className="text-xl font-black tracking-tight text-base-content group-hover:text-white transition-colors">
              Log Case Usage
            </h2>
            <p className="text-xs opacity-50 group-hover:text-white/80 transition-colors mt-1.5 leading-relaxed">
              Deduct explicit screw, plate, or twist-drill parameters from specific sets following clinical surgery.
            </p>
          </div>
        </Link>

        {/* Module 2: INSPECT SETS DETAILS (Neutral Dark) */}
        <Link href="/sets" className="group flex flex-col justify-between p-8 bg-base-100 hover:bg-neutral border border-base-300 hover:border-neutral rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.99]">
          <div className="w-14 h-14 rounded-xl bg-neutral/10 group-hover:bg-white/20 flex items-center justify-center text-neutral-content group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div className="mt-12">
            <h2 className="text-xl font-black tracking-tight text-base-content group-hover:text-white transition-colors">
              Check Sets Details
            </h2>
            <p className="text-xs opacity-50 group-hover:text-white/80 transition-colors mt-1.5 leading-relaxed">
              Verify complete volumetrics, structural slot allocations, and trace localized serial item states.
            </p>
          </div>
        </Link>

        {/* Module 3: ADD/REFILL INTAKE (Success Green) */}
        <Link href="/refills/new" className="group flex flex-col justify-between p-8 bg-base-100 hover:bg-success border border-base-300 hover:border-success rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.99]">
          <div className="w-14 h-14 rounded-xl bg-success/10 group-hover:bg-white/20 flex items-center justify-center text-success group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.213 6H16M4 4h5v5H4z" />
            </svg>
          </div>
          <div className="mt-12">
            <h2 className="text-xl font-black tracking-tight text-base-content group-hover:text-white transition-colors">
              Add / Refill Usage
            </h2>
            <p className="text-xs opacity-50 group-hover:text-white/80 transition-colors mt-1.5 leading-relaxed">
              Process physical warehouse stock replenishment requests and restock rows back to baseline counts.
            </p>
          </div>
        </Link>

      </div>
    </div>
  );
}