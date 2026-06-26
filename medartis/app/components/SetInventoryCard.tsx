// app/components/SetInventoryCard.tsx
'use client';

import { VirtualSet } from '../actions/getSetsAction';

interface SetCardProps {
  set: VirtualSet;
  onInspect: (id: string) => void;
}

export default function SetInventoryCard({ set, onInspect }: SetCardProps) {
  const isLongTerm = set.LoanType?.toLowerCase() === 'long term';
  const isComplete = set.computedComplete === 'Yes';
  const isBooked = set.computedStatus === 'Booked';

  return (
    <div className={`card bg-base-100 shadow-sm transition-all hover:shadow-md rounded-xl overflow-hidden flex flex-col justify-between border-2 ${
      isLongTerm 
        ? 'border-purple-500/40 bg-gradient-to-b from-purple-50/10 to-transparent' 
        : 'border-base-300'
    }`}>
      
      {/* Top Banner Segment */}
      <div className="p-5 border-b border-base-200">
        <div className="flex justify-between items-start gap-4">
          <div>
            {/* Dynamic Loan Tag Styling */}
            <span className={`text-[9px] uppercase font-mono tracking-widest font-black px-2 py-0.5 rounded ${
              isLongTerm ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-base-200 text-base-content/70'
            }`}>
              {set.LoanType || 'Short Term'}
            </span>
            
            <h2 className="text-base font-black tracking-tight text-base-content mt-1.5 truncate max-w-[200px] sm:max-w-xs">
              {set.SetName}
            </h2>
            <p className="text-[11px] font-mono opacity-40">ID: {set.SetID}</p>
          </div>

          {/* Complete vs Incomplete Status indicators */}
          <span className={`badge badge-sm font-bold tracking-tight px-2.5 py-2 font-mono text-[10px] ${
            isComplete ? 'badge-success bg-success/10 text-success border-success/20' : 'badge-error bg-error/10 text-error border-error/20'
          }`}>
            {isComplete ? 'Complete' : 'Incomplete'}
          </span>
        </div>
      </div>

      {/* Center Body Core */}
      <div className="p-5 flex-1 flex flex-col gap-3 justify-center">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-40 font-bold block">
            Current Location
          </span>
          <span className="text-sm font-black text-base-content block mt-0.5 truncate">
            📍 {set.computedLocation}
          </span>
        </div>

        {set.Notes && (
          <p className="text-xs opacity-50 italic line-clamp-1">"{set.Notes}"</p>
        )}
      </div>

      {/* Structural Operational Footer */}
      <div className="px-5 py-3.5 bg-base-200/40 border-t border-base-200 flex items-center justify-between text-[11px] font-medium">
        {/* Availability Badge Overlay */}
        <span className={`font-mono px-2 py-0.5 rounded-md font-bold text-[10px] ${
          isBooked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          {set.computedStatus}
        </span>
        
        <button 
          onClick={() => onInspect(set.SetID)}
          className="btn btn-ghost btn-xs text-primary font-bold normal-case tracking-tight px-2 hover:bg-primary/5 rounded-md"
        >
          Inspect Details
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

    </div>
  );
}