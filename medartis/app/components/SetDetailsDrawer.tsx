// app/components/SetDetailsDrawer.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { VirtualSet, fetchTraysAndUsageForSet, EnrichedTray, VirtualUsage } from '../actions/getSetsAction';

interface DrawerProps {
  set: VirtualSet | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SetDetailsDrawer({ set, isOpen, onClose }: DrawerProps) {
  const [activeTab, setActiveTab] = useState<'trays' | 'history'>('trays');
  const [trays, setTrays] = useState<EnrichedTray[]>([]);
  const [setHistory, setSetHistory] = useState<VirtualUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openTrayId, setOpenTrayId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!set || !isOpen) return;
    async function loadDataCascade() {
      setLoading(true);
      const res = await fetchTraysAndUsageForSet(set!.SetID);
      if (res.success) {
        setTrays(res.trays);
        setSetHistory(res.setHistory);
        if (res.trays.length > 0) setOpenTrayId(res.trays[0].TrayID);
      }
      setLoading(false);
    }
    loadDataCascade();
  }, [set, isOpen]);

  if (!isOpen || !set) return null;

  // Extract valid image attachments assigned to this set record dynamically
  const availablePhotos = [
    set.photo1 || (set as any).Photo1,
    set.photo2 || (set as any).Photo2,
    set.photo3 || (set as any).Photo3,
    set.photo4 || (set as any).Photo4,
    set.photo5 || (set as any).Photo5,
    set.photo6 || (set as any).Photo6,
    set.photo7 || (set as any).Photo7,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-neutral/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-base-100 border-l border-l-base-300 shadow-2xl flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-base-200 bg-base-50/50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black tracking-tight">{set.SetName}</h2>
                <p className="text-xs font-mono opacity-50 mt-0.5">SetID: {set.SetID}</p>
              </div>
              <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            {/* --- WORKFLOW TAB CONTROLS --- */}
            <div className="tabs tabs-boxed bg-base-200/60 p-1 mt-4 max-w-xs">
              <button 
                onClick={() => setActiveTab('trays')} 
                className={`tab tab-sm font-bold tracking-tight text-xs ${activeTab === 'trays' ? 'tab-active bg-base-100 shadow-sm' : ''}`}
              >
                Trays & Implants
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                className={`tab tab-sm font-bold tracking-tight text-xs ${activeTab === 'history' ? 'tab-active bg-base-100 shadow-sm' : ''}`}
              >
                Set History Ledger ({setHistory.length})
              </button>
            </div>
          </div>

          {/* Central Scroll Viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* --- VISUAL SCAN ARCHIVE ATTACHMENTS GRID --- */}
            {availablePhotos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-mono tracking-wider opacity-60 font-black">
                  📷 Kit Scan Verification Photos ({availablePhotos.length})
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {availablePhotos.map((url, index) => (
                    <a 
                      key={index} 
                      href={url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="group relative aspect-square bg-base-200 border border-base-300 rounded-lg overflow-hidden hover:border-primary transition-all p-1 flex items-center justify-center"
                    >
                      <img 
                        src={url} 
                        alt={`Set Scan File Layer ${index + 1}`} 
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[9px] font-mono text-white bg-neutral px-1 py-0.5 rounded font-bold">VIEW</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-2">
                <span className="loading loading-ring loading-md text-primary"></span>
                <span className="text-[10px] font-mono tracking-widest opacity-40 uppercase font-bold">Processing System Ledger...</span>
              </div>
            ) : activeTab === 'history' ? (
              
              /* --- VIEW 1: MASTER SET HISTORY LEDGER --- */
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-mono tracking-wider opacity-60 font-black">All Historical Kit Usages</h3>
                {setHistory.length === 0 ? (
                  <p className="text-xs opacity-40 italic text-center py-12">No surgical case parameters logged for this set.</p>
                ) : (
                  <div className="space-y-2">
                    {setHistory.map((log) => (
                      <div key={log.UsageID} className="p-3 bg-base-50 border border-base-200 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-base-content font-mono">{log.PartNumber} - <span className="opacity-60 font-sans font-medium">{log.Description || 'Component Unit'}</span></p>
                          <p className="text-[10px] opacity-50 font-mono mt-0.5">MRN: {log.PatientMRN} | Hospital: {log.Hospital} | Date: {log.Date}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black block">Qty: {log.QtyUsed}</span>
                          <span className={`badge badge-xs font-mono font-bold mt-1 ${log.computedUsageStatus === 'Refilled' ? 'badge-success' : 'badge-warning'}`}>
                            {log.computedUsageStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (

              /* --- VIEW 2: TRAYS & INTERACTIVE CONTENT GRID --- */
              <div className="space-y-4">
                {trays.map((tray) => {
                  const isTrayOpen = openTrayId === tray.TrayID;
                  return (
                    <div key={tray.TrayID} className="border border-base-300 rounded-xl overflow-hidden bg-base-50/30">
                      <button 
                        onClick={() => setOpenTrayId(isTrayOpen ? null : tray.TrayID)}
                        className="w-full flex justify-between items-center p-4 bg-base-100 hover:bg-base-200/50 transition-colors text-left"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-base-content">{tray.TrayName}</h4>
                          <p className="text-[11px] opacity-40 font-mono mt-0.5">Tray ID: {tray.TrayID}</p>
                        </div>
                        <span className={`badge badge-sm font-mono font-bold ${tray.computedTrayStatus === 'Complete' ? 'badge-success bg-success/10 text-success' : 'badge-error bg-error/10 text-error'}`}>
                          {tray.computedTrayStatus}
                        </span>
                      </button>

                      {isTrayOpen && (
                        <div className="border-t border-base-200 bg-base-100">
                          <div className="overflow-x-auto">
                            <table className="table table-compact w-full text-xs">
                              <thead>
                                <tr className="bg-base-200/50 text-[10px] font-mono uppercase opacity-60">
                                  <th>Part No</th>
                                  <th>Description</th>
                                  <th className="text-center">Ideal</th>
                                  <th className="text-center">Current</th>
                                  <th className="text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tray.contents.map((item) => {
                                  const ideal = Number(item.IdealQty) || 0;
                                  const current = item.computedCurrentQty;
                                  const actual = item.ActualQty !== undefined && item.ActualQty !== '' ? Number(item.ActualQty) : ideal;
                                  
                                  const isMissing = current < ideal;
                                  const isItemExpanded = expandedItemId === item.ItemID;
                                  const hasDiscrepancyNote = actual < ideal;

                                  return (
                                    <Fragment key={item.ItemID}>
                                      <tr 
                                        onClick={() => setExpandedItemId(isItemExpanded ? null : item.ItemID)}
                                        className="hover:bg-base-50 border-b border-base-100 last:border-0 font-medium cursor-pointer transition-colors"
                                      >
                                        <td className="font-mono text-primary font-bold">{item.PartNumber}</td>
                                        <td className="max-w-[160px] truncate opacity-70">{item.Description}</td>
                                        <td className="text-center font-mono opacity-40">{ideal}</td>
                                        <td className={`text-center font-mono font-black ${isMissing ? 'text-error' : 'text-success'}`}>{current}</td>
                                        <td className="text-right text-[10px] font-bold text-primary font-mono">
                                          {isItemExpanded ? 'Close ▲' : 'History ▼'}
                                        </td>
                                      </tr>

                                      {/* --- NESTED ITEM POP-DOWN LOGS & NOTES --- */}
                                      {isItemExpanded && (
                                        <tr className="bg-base-200/30">
                                          <td colSpan={5} className="p-4 border-b border-base-200">
                                            <div className="space-y-3">
                                              
                                              {hasDiscrepancyNote && (
                                                <div className="p-2.5 bg-warning/10 border border-warning/20 text-warning-content rounded-md text-[11px]">
                                                  <strong>ℹ️ Baseline Count Mismatch:</strong> Physical sheet allocation was manually dropped to {actual}/{ideal}. 
                                                  {item.Notes ? ` Note: "${item.Notes}"` : ' Note: Item may have been borrowed to reinforce an active sister kit configuration.'}
                                                </div>
                                              )}

                                              <div>
                                                <p className="text-[10px] uppercase font-mono tracking-wide font-black opacity-50 mb-1.5">Component Usage History</p>
                                                {item.itemHistory && item.itemHistory.length === 0 ? (
                                                  <p className="text-[11px] opacity-40 italic">No specific past logs for this part number inside this tray.</p>
                                                ) : (
                                                  <div className="max-h-24 overflow-y-auto border border-base-200 rounded-md bg-base-100">
                                                    {item.itemHistory.map((h, hIdx) => (
                                                      <div key={hIdx} className="p-2 text-[11px] border-b border-base-100 last:border-0 flex justify-between font-mono">
                                                        <span>📅 {h.Date || 'No Date'} | Hosp: {h.Hospital || 'Unknown'}</span>
                                                        <span className="font-bold text-base-content">Used: {h.QtyUsed} ({h.computedUsageStatus})</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            )}
          </div>

          <div className="p-4 border-t border-base-200 bg-base-50 flex justify-end">
            <button onClick={onClose} className="btn btn-sm btn-ghost font-bold normal-case">Close View</button>
          </div>

        </div>
      </div>
    </div>
  );
}