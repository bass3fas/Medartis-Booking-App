// app/usages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchUsageLog, EnrichedUsage } from '../actions/getUsagesAction';

export default function UsageLogPage() {
  const [usages, setUsages] = useState<EnrichedUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtering Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Refilled' | 'Pending to Refill'>('all');
  const [hospitalFilter, setHospitalFilter] = useState('all');

  useEffect(() => {
    async function loadLog() {
      setLoading(true);
      const res = await fetchUsageLog();
      if (res.success) {
        setUsages(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to populate active surgical usage registers.');
      }
      setLoading(false);
    }
    loadLog();
  }, []);

  const uniqueHospitals = Array.from(new Set(usages.map(u => u.Hospital).filter(Boolean))).sort();

  // Multi-pipeline filtering execution logic
  const filteredUsages = usages.filter(log => {
    const matchesSearch = 
      (log.PartNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.PatientMRN || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.BookingID || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.Description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || log.computedUsageStatus === statusFilter;
    const matchesHospital = hospitalFilter === 'all' || log.Hospital === hospitalFilter;

    return matchesSearch && matchesStatus && matchesHospital;
  });

  return (
    <div className="w-full p-2 font-sans">
      
      {/* Header Desk */}
      <div className="mb-6 pb-2 border-b border-base-300 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black tracking-tight text-base-content">Surgical Usages Ledger</h1>
          <p className="text-xs font-mono opacity-50 mt-0.5">Master historical registry of elements tracked during operating room cases</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] font-mono uppercase font-bold opacity-40 block">Pending Refills</span>
          <span className="text-md font-mono font-black text-warning">
            {usages.filter(u => u.computedUsageStatus === 'Pending to Refill').length} rows
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Control Action Dock Filters */}
      <div className="p-4 bg-base-100 border border-base-300 rounded-xl mb-4 shadow-sm flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <input 
            type="text" 
            placeholder="Search MRN, Part number, Description, Booking..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none"
          />

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)} 
            className="select select-sm select-bordered font-semibold text-xs bg-base-50"
          >
            <option value="all">All Operational Statuses</option>
            <option value="Refilled">Refilled Logs</option>
            <option value="Pending to Refill">Pending Refill</option>
          </select>

          <select 
            value={hospitalFilter} 
            onChange={(e) => setHospitalFilter(e.target.value)} 
            className="select select-sm select-bordered font-semibold text-xs bg-base-50"
          >
            <option value="all">All Facilities ({uniqueHospitals.length})</option>
            {uniqueHospitals.map(hosp => <option key={hosp} value={hosp}>{hosp}</option>)}
          </select>

        </div>
      </div>

      {/* Main Table Matrix */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-bold uppercase">Parsing Usage Matrix...</span>
        </div>
      ) : (
        <div className="border border-base-300 rounded-xl bg-base-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="table table-compact w-full text-xs">
              <thead className="sticky top-0 bg-base-200 z-10 font-mono text-[10px] uppercase opacity-70 border-b border-base-300">
                <tr>
                  <th className="p-3">Date</th>
                  <th>Booking ID</th>
                  <th>Patient MRN</th>
                  <th>Hospital Location</th>
                  <th>Part Number / Description</th>
                  <th className="text-center">Set/Tray ID</th>
                  <th className="text-right">Used</th>
                  <th className="text-right">Refilled</th>
                  <th className="text-right text-primary font-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {filteredUsages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-xs opacity-40 font-medium italic">
                      No logged usage specifications match current parameters.
                    </td>
                  </tr>
                ) : (
                  filteredUsages.map((log) => {
                    const isPending = log.computedUsageStatus === 'Pending to Refill';
                    return (
                      <tr key={log.rowIndex} className="hover:bg-base-50/70 font-medium transition-colors">
                        <td className="p-3 font-mono opacity-70 whitespace-nowrap">{log.Date || '—'}</td>
                        <td className="font-mono text-xs opacity-60 font-bold">{log.BookingID}</td>
                        <td className="font-mono text-base-content font-bold select-all">{log.PatientMRN || '—'}</td>
                        <td className="font-sans font-semibold text-base-content max-w-[140px] truncate" title={log.Hospital}>{log.Hospital}</td>
                        <td className="max-w-xs">
                          <span className="font-mono font-bold text-primary block">{log.PartNumber}</span>
                          {log.Description && (
                            <span className="text-[11px] opacity-50 block truncate max-w-[200px]" title={log.Description}>
                              {log.Description}
                            </span>
                          )}
                        </td>
                        <td className="text-center font-mono text-[11px] opacity-60">
                          <div>{log.SetID}</div>
                          <div className="text-[10px] opacity-40">{log.TrayID}</div>
                        </td>
                        <td className="text-right font-mono font-bold text-base-content">{log.QtyUsed}</td>
                        <td className="text-right font-mono font-bold opacity-60">{log["Qty Refilled"] || 0}</td>
                        <td className="text-right">
                          <span className={`badge badge-sm font-mono font-bold border-0 ${
                            isPending 
                              ? 'bg-warning/10 text-warning' 
                              : 'bg-success/10 text-success'
                          }`}>
                            {log.computedUsageStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}