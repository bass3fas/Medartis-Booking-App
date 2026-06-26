// app/components/SetDetailsDrawer.tsx
'use client';

import { useState, useEffect } from 'react';
import { VirtualSet, fetchTraysForSet, EnrichedTray } from '../actions/getSetsAction';

interface DrawerProps {
  set: VirtualSet | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SetDetailsDrawer({ set, isOpen, onClose }: DrawerProps) {
  const [trays, setTrays] = useState<EnrichedTray[]>([]);
  const [loading, setLoading] = useState(false);
  const [openTrayId, setOpenTrayId] = useState<string | null>(null);

  useEffect(() => {
    if (!set || !isOpen) return;
    
    async function loadTrayStructures() {
      setLoading(true);
      const res = await fetchTraysForSet(set!.SetID);
      if (res.success) {
        setTrays(res.data);
        // Automatically expand the first tray panel for a premium user experience
        if (res.data.length > 0) setOpenTrayId(res.data[0].TrayID);
      }
      setLoading(false);
    }

    loadTrayStructures();
  }, [set, isOpen]);

  if (!isOpen || !set) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Dark dim backdrop overlay click wrapper */}
      <div className="absolute inset-0 bg-neutral/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-base-100 border-l border-base-300 shadow-2xl flex flex-col justify-between">
          
          {/* Header Module */}
          <div className="p-6 border-b border-base-200 bg-base-50/50 flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 bg-primary/10 text-primary font-bold rounded">
                {set.LoanType || 'Standard Kit'}
              </span>
              <h2 className="text-xl font-black tracking-tight text-base-content mt-2">{set.SetName}</h2>
              <p className="text-xs font-mono opacity-50 mt-0.5">System Master Reference ID: {set.SetID}</p>
            </div>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
          </div>

          {/* Central Scrollable Information Core */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Meta Indicators Panel */}
            <div className="grid grid-cols-3 gap-4 bg-base-200/40 p-4 rounded-xl border border-base-200 text-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold opacity-40 block">Status</span>
                <span className="text-xs font-bold text-base-content mt-1 block">{set.computedStatus}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-bold opacity-40 block">Location</span>
                <span className="text-xs font-bold text-base-content mt-1 block truncate px-1">📍 {set.computedLocation}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-bold opacity-40 block">Integrity</span>
                <span className={`text-xs font-bold mt-1 block ${set.computedComplete === 'Yes' ? 'text-success' : 'text-error'}`}>
                  {set.computedComplete === 'Yes' ? 'Complete Set' : 'Items Missing'}
                </span>
              </div>
            </div>

            {/* Trays Relational Content Block */}
            <div>
              <h3 className="text-xs uppercase font-mono tracking-wider opacity-60 font-black mb-4">
                Assigned Tray Compartments ({trays.length})
              </h3>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <span className="loading loading-ring loading-md text-primary"></span>
                  <span className="text-[10px] font-mono tracking-widest opacity-40 uppercase font-bold">Unpacking Tray Contents...</span>
                </div>
              ) : trays.length === 0 ? (
                <p className="text-xs opacity-40 italic text-center py-6 bg-base-50 rounded-xl border border-dashed">
                  No layout trays are linked to this set in Google Sheets.
                </p>
              ) : (
                <div className="space-y-3">
                  {trays.map((tray) => {
                    const isOpen = openTrayId === tray.TrayID;
                    return (
                      <div key={tray.TrayID} className="border border-base-300 rounded-xl overflow-hidden bg-base-50/30">
                        
                        {/* Dynamic Accordion Click Bar */}
                        <button 
                          onClick={() => setOpenTrayId(isOpen ? null : tray.TrayID)}
                          className="w-full flex justify-between items-center p-4 bg-base-100 hover:bg-base-200/50 transition-colors text-left"
                        >
                          <div>
                            <h4 className="text-sm font-bold tracking-tight text-base-content">{tray.TrayName}</h4>
                            <p className="text-[11px] opacity-40 font-mono mt-0.5">Tray ID: {tray.TrayID} | Type: {tray.TrayType || 'Core Level'}</p>
                          </div>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Collapsible Dropdown Layout Matrix */}
                        {isOpen && (
                          <div className="border-t border-base-200 bg-base-100 overflow-x-auto">
                            {tray.contents.length === 0 ? (
                              <p className="text-[11px] opacity-40 p-4 italic">No specific screw/plate components inside this tray inventory.</p>
                            ) : (
                              <table className="table table-compact w-full text-xs">
                                <thead>
                                  <tr className="bg-base-200/50 text-[10px] font-mono uppercase opacity-60">
                                    <th className="rounded-none">Part No</th>
                                    <th>Description</th>
                                    <th className="text-center">Ideal</th>
                                    <th className="text-center">Current</th>
                                    <th className="rounded-none text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tray.contents.map((item, idx) => {
                                    const ideal = Number(item.IdealQty) || 0;
                                    const actual = item.ActualQty !== undefined && item.ActualQty !== '' ? Number(item.ActualQty) : ideal;
                                    const isMissing = actual < ideal;

                                    return (
                                      <tr key={item.ItemID || idx} className="hover:bg-base-50 border-b border-base-100 last:border-0 font-medium">
                                        <td className="font-mono text-[11px] text-primary">{item.PartNumber}</td>
                                        <td className="max-w-[180px] truncate opacity-80">{item.Description}</td>
                                        <td className="text-center font-mono font-bold opacity-40">{ideal}</td>
                                        <td className={`text-center font-mono font-black ${isMissing ? 'text-error' : 'text-base-content'}`}>{actual}</td>
                                        <td className="text-right">
                                          <span className={`badge badge-xs font-mono font-bold px-1.5 py-1 ${isMissing ? 'badge-error bg-error/10 text-error' : 'badge-success bg-success/10 text-success'}`}>
                                            {isMissing ? `-${ideal - actual}` : 'OK'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Action Area Footer */}
          <div className="p-4 border-t border-base-200 bg-base-50 flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn btn-sm btn-ghost font-bold normal-case">
              Close View
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}