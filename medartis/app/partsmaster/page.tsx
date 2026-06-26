// app/partnumbers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchPartsCatalogue, VirtualPartsMaster } from '../actions/getCatalogueAction';

export default function PartNumbersCataloguePage() {
  const [parts, setParts] = useState<VirtualPartsMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');

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
    <div className="w-full p-2">
      
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-xl font-black tracking-tight text-base-content">PartsMaster Registry</h1>
        <p className="text-xs font-mono opacity-50 mt-0.5">Live warehouse stock and operational kit distribution</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Filters */}
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

      {/* Data Matrix Grid */}
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
                  <th className="text-right text-primary font-black">InSets Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {filteredParts.map((part) => (
                  <tr key={part.rowIndex} className="hover:bg-base-50/70 font-medium transition-colors">
                    <td className="p-3 font-mono font-bold text-primary select-all">{part.PartNumber}</td>
                    <td className="max-w-md font-sans font-semibold text-base-content truncate" title={part.Description}>
                      {part.Description}
                    </td>
                    <td className="opacity-70 font-sans">{part.Type || '—'}</td>
                    <td className="opacity-70 font-sans">{part.Kind || '—'}</td>
                    <td className="text-center font-mono opacity-50">{part.PU || 'pcs'}</td>
                    <td className="text-right font-mono font-bold">
                      {part["Refill Stock"] !== undefined && part["Refill Stock"] !== '' ? Number(part["Refill Stock"]) : '0'}
                    </td>
                    <td className={`text-right font-mono font-black ${part.inSetsQty === 0 ? 'text-error/80' : 'text-success'}`}>
                      {part.inSetsQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}