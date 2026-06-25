// app/components/SetInventoryCard.tsx
'use client';

import { Sets } from '../types/interfaces'; // 👈 Points directly to your interface file

interface SetCardProps {
  set: Sets;
  onInspect: (id: string) => void;
}

export default function SetInventoryCard({ set, onInspect }: SetCardProps) {
  // Map spreadsheet indicator strings safely to render statuses
  const statusString = set["Set Complete?"] || 'Complete';
  
  // Visual mapping matching your elegant color codes
  const isComplete = statusString.toLowerCase() === 'yes' || statusString.toLowerCase() === 'complete';
  const isNeedsRefill = statusString.toLowerCase() === 'no' || statusString.toLowerCase() === 'needs refill';

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm transition-all hover:shadow-md rounded-xl overflow-hidden flex flex-col justify-between">
      
      {/* Upper Context Block */}
      <div className="p-5 border-b border-base-200">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-[9px] uppercase font-mono tracking-widest font-black opacity-40 px-2 py-0.5 bg-base-200 rounded">
              {set.LoanType || 'Orthopedic Core'}
            </span>
            <h2 className="text-base font-black tracking-tight text-base-content mt-1.5 truncate max-w-[220px] sm:max-w-xs">
              {set.SetName}
            </h2>
            <p className="text-[11px] font-mono font-medium opacity-40 mt-0.5">
              ID: {set.SetID}
            </p>
          </div>

          {/* Conditional Status Badges from your layout config */}
          <span className={`badge badge-sm font-bold tracking-tight px-2.5 py-2 font-mono text-[10px] ${
            isComplete ? 'badge-success bg-success/10 text-success border-success/20' :
            isNeedsRefill ? 'badge-warning bg-warning/10 text-warning border-warning/20' :
            'badge-info bg-info/10 text-info border-info/20'
          }`}>
            {isComplete ? 'Complete' : isNeedsRefill ? 'Needs Refill' : statusString}
          </span>
        </div>
      </div>

      {/* Volumetric Allocation Area */}
      <div className="p-5 bg-base-100/50 flex-1">
        <div className="mb-2">
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-40 font-bold block">
            Current Location Allocation
          </span>
          <span className="text-sm font-black text-base-content block mt-0.5 truncate">
            📍 {set["Current Location"] || set.Location || 'Not Assigned'}
          </span>
        </div>

        {set.Notes && (
          <p className="text-xs opacity-50 italic line-clamp-1 mt-2">
            "{set.Notes}"
          </p>
        )}
      </div>

      {/* Structural Action Footer */}
      <div className="px-5 py-3.5 bg-base-200/40 border-t border-base-200 flex items-center justify-between text-[11px] font-medium">
        <span className="opacity-40 font-mono">
          {set.DeliveryDate ? `Delivered: ${set.DeliveryDate}` : 'Ready for Case'}
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