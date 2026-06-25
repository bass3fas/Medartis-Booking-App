// app/components/SetInventoryCard.tsx
'use client';

export interface MedicalSet {
  id: string;
  setName: string;
  systemType: string;
  serialNumber: string;
  totalSlots: number;
  availablePieces: number;
  status: 'Complete' | 'Needs Refill' | 'In Surgery';
  lastChecked: string;
}

interface SetCardProps {
  set: MedicalSet;
  onInspect: (id: string) => void;
}

export default function SetInventoryCard({ set, onInspect }: SetCardProps) {
  const fillPercentage = Math.round((set.availablePieces / set.totalSlots) * 100);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm transition-all hover:shadow-md rounded-xl overflow-hidden flex flex-col justify-between">
      
      {/* Upper Information Area */}
      <div className="p-5 border-b border-base-200">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-[9px] uppercase font-mono tracking-widest font-black opacity-40 px-2 py-0.5 bg-base-200 rounded">
              {set.systemType}
            </span>
            <h2 className="text-base font-black tracking-tight text-base-content mt-1.5 truncate max-w-[220px] sm:max-w-xs">
              {set.setName}
            </h2>
            <p className="text-[11px] font-mono font-medium opacity-40 mt-0.5">
              S/N: {set.serialNumber}
            </p>
          </div>

          {/* Conditional Status Badges */}
          <span className={`badge badge-sm font-bold tracking-tight px-2.5 py-2 font-mono text-[10px] ${
            set.status === 'Complete' ? 'badge-success bg-success/10 text-success border-success/20' :
            set.status === 'Needs Refill' ? 'badge-warning bg-warning/10 text-warning border-warning/20' :
            'badge-info bg-info/10 text-info border-info/20'
          }`}>
            {set.status}
          </span>
        </div>
      </div>

      {/* Volumetric Allocation Area */}
      <div className="p-5 bg-base-100/50 flex-1">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider opacity-40 font-bold block">
              Tray Volumetrics
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black tracking-tight text-base-content">
                {set.availablePieces}
              </span>
              <span className="text-xs font-bold opacity-30">
                / {set.totalSlots} pcs
              </span>
            </div>
          </div>
          <span className={`text-xs font-mono font-bold ${
            fillPercentage === 100 ? 'text-success' : fillPercentage > 50 ? 'text-warning' : 'text-error'
          }`}>
            {fillPercentage}% Intact
          </span>
        </div>

        {/* Dynamic Shadow Track Accent */}
        <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              set.status === 'Complete' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
              set.status === 'Needs Refill' ? 'bg-warning shadow-[0_0_8px_rgba(234,179,8,0.4)]' :
              'bg-info shadow-[0_0_8px_rgba(59,130,246,0.4)]'
            }`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* Structural Action Footer */}
      <div className="px-5 py-3.5 bg-base-200/40 border-t border-base-200 flex items-center justify-between text-[11px] font-medium">
        <span className="opacity-40 font-mono">
          Synced: {set.lastChecked}
        </span>
        
        <button 
          onClick={() => onInspect(set.id)}
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