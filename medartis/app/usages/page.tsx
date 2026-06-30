// app/usages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchUsageLog, PatientMRNGroup } from '../actions/getUsagesAction';

export default function GroupedUsageLogPage() {
  const [cases, setCases] = useState<PatientMRNGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtering Options
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Refilled' | 'Pending to Refill'>('all'); // 🔄 Restored
  const [expandedCaseKey, setExpandedCaseKey] = useState<string | null>(null);

  useEffect(() => {
    async function syncLedger() {
      setLoading(true);
      const res = await fetchUsageLog();
      if (res.success) {
        setCases(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to populate case group logs.');
      }
      setLoading(false);
    }
    syncLedger();
  }, []);

  const uniqueHospitals = Array.from(new Set(cases.map(c => c.Hospital).filter(Boolean))).sort();

  // Multi-pipeline filtering execution logic
  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.PatientMRN.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.BookingID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.items.some(item => (item.PartNumber || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesHospital = hospitalFilter === 'all' || c.Hospital === hospitalFilter;

    // 🔄 Evaluate structural status flags for the group container
    const hasPendingItems = c.items.some(item => item.computedUsageStatus === 'Pending to Refill');
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'Pending to Refill' && hasPendingItems) || 
      (statusFilter === 'Refilled' && !hasPendingItems);

    return matchesSearch && matchesHospital && matchesStatus;
  });

  return (
    <div className="w-full p-2 font-sans">
      
      {/* Upper Brand Badge */}
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-xl font-black tracking-tight text-base-content">Surgical Cases & Usages</h1>
        <p className="text-xs font-mono opacity-50 mt-0.5">Aggregated metrics grouped by Patient MRN and clinical confirmation images</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Quick Controls Bar Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 bg-base-100 border border-base-300 rounded-xl shadow-sm">
        <input 
          type="text" 
          placeholder="Search Patient MRN, Booking code, component..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none"
        />
        
        {/* 🔄 Re-injected Status Filter Control Dropdown */}
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value as any)} 
          className="select select-sm select-bordered font-semibold text-xs bg-base-50"
        >
          <option value="all">All Case Statuses</option>
          <option value="Refilled">Fully Refilled Cases</option>
          <option value="Pending to Refill">Cases with Pending Refills</option>
        </select>

        <select 
          value={hospitalFilter} 
          onChange={(e) => setHospitalFilter(e.target.value)} 
          className="select select-sm select-bordered font-semibold text-xs bg-base-50"
        >
          <option value="all">All Facilities ({uniqueHospitals.length})</option>
          {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {/* Core Accordion Canvas View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-bold uppercase">Compiling Case Timelines...</span>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center bg-base-100 rounded-xl border border-base-300 italic opacity-40 text-xs">
          No registered surgical files match selected tracking parameters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((caseGroup) => {
            const caseKey = caseGroup.groupKey;
            const isExpanded = expandedCaseKey === caseKey;
            const pendingItemsCount = caseGroup.items.filter(i => i.computedUsageStatus === 'Pending to Refill').length;

            return (
              <div 
                key={caseKey} 
                className={`border rounded-xl bg-base-100 shadow-sm transition-all overflow-hidden ${
                  isExpanded ? 'border-primary shadow-md' : 'border-base-300 hover:border-base-400'
                }`}
              >
                {/* 💳 Clickable Case Card Header */}
                <div 
                  onClick={() => setExpandedCaseKey(isExpanded ? null : caseKey)}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none hover:bg-base-50/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                        {caseGroup.PatientMRN}
                      </span>
                      <span className="text-xs font-mono opacity-50 font-semibold">Booking: {caseGroup.BookingID}</span>
                    </div>
                    <p className="text-xs font-sans font-bold text-base-content/80 tracking-tight">
                      {caseGroup.Hospital} <span className="opacity-40 mx-1">|</span> <span className="font-mono opacity-60 text-[11px]">{caseGroup.Date}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto font-mono text-[11px]">
                    <span className="opacity-60 font-semibold">Consumptions: <strong>{caseGroup.items.length}</strong></span>
                    {pendingItemsCount > 0 ? (
                      <span className="badge badge-sm font-bold border-0 bg-warning/10 text-warning px-2 py-2">
                        {pendingItemsCount} Pending Refill
                      </span>
                    ) : (
                      <span className="badge badge-sm font-bold border-0 bg-success/10 text-success px-2 py-2">
                        Fully Refilled
                      </span>
                    )}
                    <span className={`transform transition-transform font-black text-sm text-base-content/40 pl-1 ${isExpanded ? 'rotate-90 text-primary' : ''}`}>
                      ▶
                    </span>
                  </div>
                </div>

                {/* 📂 Expanded Content Portal Area */}
                {isExpanded && (
                  <div className="p-4 border-t border-base-200 bg-base-50/30 grid grid-cols-1 lg:grid-cols-12 gap-5 shadow-inner">
                    
                    {/* LEFT PANEL: Consumption Table Ledger Rows */}
                    <div className="lg:col-span-7 space-y-2">
                      <p className="text-[10px] font-mono uppercase font-black opacity-40 tracking-wider">Consumed Implant Element Specifications</p>
                      <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 max-h-72 overflow-y-auto shadow-sm">
                        <table className="table table-compact w-full text-xs font-mono">
                          <thead className="bg-base-100 border-b opacity-60 text-[10px] uppercase font-black">
                            <tr>
                              <th className="p-2.5">Part Number / Description</th>
                              <th className="text-right">Used</th>
                              <th className="text-right">Refilled</th>
                              <th className="text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-base-100">
                            {caseGroup.items.map((item) => (
                              <tr key={item.UsageID} className="hover:bg-base-50/50">
                                <td className="p-2.5">
                                  <span className="font-bold text-base-content block select-all">{item.PartNumber}</span>
                                  <span className="text-[11px] font-sans font-semibold opacity-70 block truncate max-w-[280px]" title={item.Description}>
                                    {item.Description || 'No description asset mapped'}
                                  </span>
                                  <span className="text-[9px] opacity-40 block">{item.TrayID}</span>
                                </td>
                                <td className="text-right font-bold text-base-content">{item.QtyUsed}</td>
                                <td className="text-right opacity-60">{item["Qty Refilled"] || 0}</td>
                                <td className="text-right">
                                  <span className={`text-[10px] font-bold ${item.computedUsageStatus === 'Refilled' ? 'text-success' : 'text-warning'}`}>
                                    {item.computedUsageStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* RIGHT PANEL: Case Validation Images */}
                    <div className="lg:col-span-5 space-y-2">
                      <p className="text-[10px] font-mono uppercase font-black opacity-40 tracking-wider">
                        Case Validation Media Images ({caseGroup.photos.length})
                      </p>
                      {caseGroup.photos.length === 0 ? (
                        <div className="h-40 flex items-center justify-center border border-dashed border-base-300 rounded-xl bg-base-100 italic text-xs opacity-40">
                          No imagery attachments discoverable for this surgical file.
                        </div>
                      ) : (
                        /* 📋 Updated to look like real vertical A4 clipboards */
                        <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto p-2 bg-base-100 border border-base-300 rounded-xl shadow-sm">
                          {caseGroup.photos.map((url, imgIdx) => (
                            <a 
                              key={imgIdx} 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="group relative block aspect-[1/1.414] bg-base-200/50 border border-base-200 rounded-lg overflow-hidden shadow-sm hover:border-primary transition-all"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={url} 
                                alt={`Clinical verification file ${imgIdx + 1}`}
                                className="w-full h-full object-contain p-1 group-hover:scale-102 transition-transform duration-200"
                                loading="lazy" // ⚡ Drastically improves initial loading lag by prioritizing visible items
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white font-mono font-bold p-2 text-center">
                                <span>View Fullscreen Document ↗</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}