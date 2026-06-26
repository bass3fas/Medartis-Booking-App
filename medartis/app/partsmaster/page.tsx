// app/partnumbers/page.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { fetchPartsCatalogue, VirtualPartsMaster } from '../actions/getCatalogueAction';

export default function PartNumbersCataloguePage() {
  const [parts, setParts] = useState<VirtualPartsMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');

  // Interactive UI state hooks
  const [expandedRowIndex, setExpandedRowIndex] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'allocations' | 'history'>('allocations');

  useEffect(() => {
    async function syncClientMatrix() {
      setLoading(true);
      const res = await fetchPartsCatalogue();
      if (res.success) {
        setParts(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to read spreadsheet data layout.');
      }
      setLoading(false);
    }
    syncClientMatrix();
  }, []);

  const uniqueTypes = Array.from(new Set(parts.map(p => p.Type).filter(Boolean))).sort();
  const uniqueKinds = Array.from(new Set(parts.map(p => p.Kind).filter(Boolean))).sort();

  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      (part.PartNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (part.Description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || part.Type === typeFilter;
    const matchesKind = kindFilter === 'all' || part.Kind === kindFilter;

    return matchesSearch && matchesType && matchesKind;
  });

  return (
    <div className="w-full p-2 font-sans">
      
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-xl font-black tracking-tight text-base-content">PartsMaster Registry</h1>
        <p className="text-xs font-mono opacity-50 mt-0.5">Live warehouse inventory layout, usage parameters, and fleet mapping</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Filter Dock */}
      <div className="p-4 bg-base-100 border border-base-300 rounded-xl mb-4 shadow-sm flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            type="text" 
            placeholder="Search part number, description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none"
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50">
            <option value="all">All Types ({uniqueTypes.length})</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50">
            <option value="all">All Kinds ({uniqueKinds.length})</option>
            {uniqueKinds.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {/* Master Main Table Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-bold uppercase">Loading Registry Matrix...</span>
        </div>
      ) : (
        <div className="border border-base-300 rounded-xl bg-base-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="table table-compact w-full text-xs">
              <thead className="sticky top-0 bg-base-200 z-10 font-mono text-[10px] uppercase opacity-70 border-b border-base-300">
                <tr>
                  <th className="p-3">Part Number</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Kind</th>
                  <th className="text-center">PU</th>
                  <th className="text-right">Refill Qty</th>
                  <th className="text-right">Usages</th>
                  <th className="text-right text-primary font-black">InSets Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {filteredParts.map((part) => {
                  const isRowExpanded = expandedRowIndex === part.rowIndex;
                  return (
                    <Fragment key={part.rowIndex}>
                      {/* Master Primary Clickable Row */}
                      <tr 
                        onClick={() => {
                          setExpandedRowIndex(isRowExpanded ? null : part.rowIndex);
                          setSubTab('allocations'); // Default view reset on open
                        }} 
                        className={`hover:bg-base-50/70 font-medium transition-colors cursor-pointer ${isRowExpanded ? 'bg-base-50/50 border-l-2 border-l-primary' : ''}`}
                      >
                        <td className="p-3 font-mono font-bold text-primary select-all">{part.PartNumber}</td>
                        <td className="max-w-xs font-sans font-semibold text-base-content truncate" title={part.Description}>
                          {part.Description}
                        </td>
                        <td className="opacity-70 font-sans">{part.Type || '—'}</td>
                        <td className="opacity-70 font-sans">{part.Kind || '—'}</td>
                        <td className="text-center font-mono opacity-50">{part.PU || 'pcs'}</td>
                        {/* Refill Qty column */}
                        <td className="text-right font-mono font-bold opacity-70">
                          {part["Refill Stock"] !== undefined && part["Refill Stock"] !== '' ? Number(part["Refill Stock"]) : '0'}
                        </td>
                        {/* Direct Sheet Usages Count column */}
                        <td className="text-right font-mono opacity-70">
                          {part.Usages !== undefined && part.Usages !== '' ? Number(part.Usages) : '0'}
                        </td>
                        {/* Dynamic InSets calculated column */}
                        <td className={`text-right font-mono font-black ${part.inSetsQty === 0 ? 'text-error/80' : 'text-success'}`}>
                          {part.inSetsQty}
                        </td>
                      </tr>

                      {/* Dropdown Cross-Reference View Row */}
                      {isRowExpanded && (
                        <tr className="bg-base-200/20 shadow-inner">
                          <td colSpan={8} className="p-4 border-b border-base-200">
                            <div className="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm space-y-4">
                              
                              {/* Internal View Tabs Controls */}
                              <div className="tabs tabs-boxed bg-base-200/50 max-w-xs p-1">
                                <button 
                                  onClick={() => setSubTab('allocations')} 
                                  className={`tab tab-xs font-bold text-[11px] ${subTab === 'allocations' ? 'tab-active bg-base-100 shadow-sm' : ''}`}
                                >
                                  Kit Distribution Matrix ({part.allocations.length})
                                </button>
                                <button 
                                  onClick={() => setSubTab('history')} 
                                  className={`tab tab-xs font-bold text-[11px] ${subTab === 'history' ? 'tab-active bg-base-100 shadow-sm' : ''}`}
                                >
                                  Case Usage Ledger ({part.history.length})
                                </button>
                              </div>

                              {/* TAB CONTENT VIEW 1: Kit Allocation Grid */}
                              {subTab === 'allocations' && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-mono uppercase font-black opacity-50 tracking-wider">Active Kit Locations & Quantities</p>
                                  {part.allocations.length === 0 ? (
                                    <p className="text-xs italic opacity-40 py-2">This part number does not live in any active tray workflows.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {part.allocations.map((alloc, aIdx) => (
                                        <div key={aIdx} className="p-3 bg-base-50 border border-base-200 rounded-lg text-xs flex justify-between items-center font-mono">
                                          <div>
                                            <p className="font-sans font-black text-base-content">{alloc.TrayName}</p>
                                            <p className="text-[10px] opacity-40 mt-0.5">Set: {alloc.SetID} | Tray: {alloc.TrayID}</p>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-[10px] block opacity-40 uppercase font-bold">Qty Inside</span>
                                            <span className="font-black text-primary text-sm">{alloc.CurrentQty}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* --- TAB CONTENT VIEW 2: Case History Logs --- */}
                              {subTab === 'history' && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-mono uppercase font-black opacity-50 tracking-wider">Case Allocation Ledger History</p>
                                  {part.history.length === 0 ? (
                                    <p className="text-xs italic opacity-40 py-2">No past clinical usage entries matching this item configuration.</p>
                                  ) : (
                                    <div className="max-h-48 overflow-y-auto border border-base-200 rounded-xl divide-y divide-base-100 bg-base-50">
                                      {part.history.map((log, hIdx) => {
                                        // 🛡️ Cast both strings to explicit numbers to prevent JavaScript evaluation failure
                                        const usedQty = Number(log.QtyUsed) || 0;
                                        const refilledQty = Number(log["Qty Refilled"]) || 0;
                                        const isFullyRefilled = usedQty === refilledQty;

                                        return (
                                          <div key={hIdx} className="p-3 text-xs flex justify-between items-center font-mono">
                                            <div>
                                              <p className="font-sans font-black text-base-content">{log.Hospital || 'Unknown Facility'}</p>
                                              <p className="text-[10px] opacity-40 mt-0.5">📅 {log.Date || 'No Date Logged'} | Patient MRN: {log.PatientMRN || '—'} | BookingID: {log.BookingID}</p>
                                            </div>
                                            <div className="text-right">
                                              <span className="font-black text-base-content block">Used: {usedQty}</span>
                                              <span className={`badge badge-xs font-bold mt-1 ${isFullyRefilled ? 'badge-success bg-success/10 text-success' : 'badge-warning bg-warning/10 text-warning'}`}>
                                                {isFullyRefilled ? 'Refilled' : 'Pending Refill'}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

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
}