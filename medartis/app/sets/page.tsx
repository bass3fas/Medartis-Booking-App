// app/sets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SetInventoryCard from '../components/SetInventoryCard';
import { Sets } from '../types/interfaces';
import { fetchLiveSets } from '../actions/getSetsAction'; // 👈 Imports your clean wrapper action

export default function SetsMatrixPage() {
  const [sets, setSets] = useState<Sets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function syncSheetsCatalog() {
      setLoading(true);
      const response = await fetchLiveSets();
      
      if (response.success) {
        setSets(response.data);
      } else {
        setErrorMessage(response.error || 'Unable to load structural sheets matrix definitions.');
      }
      setLoading(false);
    }
    syncSheetsCatalog();
  }, []);

  const handleInspectDetails = (id: string) => {
    console.log(`Inspecting sheet details for target index instance matching SetID: ${id}`);
  };

  // Safe search that matches against your real columns
  const filteredSets = sets.filter(s => 
    (s.SetName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.SetID || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.Location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      
      {/* Viewport Filtering Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-base-300">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-base-content">
            Surgical Sets Inventory
          </h1>
          <p className="text-xs font-medium opacity-50 font-mono mt-0.5">
            Active structural matrix views running straight from your spreadsheet libraries
          </p>
        </div>

        <div className="form-control w-full sm:w-72">
          <div className="relative flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 opacity-40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search set names, IDs, locations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered w-full pl-10 text-xs font-semibold focus:outline-none focus:border-primary bg-base-100"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-error font-semibold shadow-sm text-xs mb-6 max-w-xl text-error-content">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Grid Allocation Display Logic */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 uppercase font-black animate-pulse">
            Querying Live Sheets Ledger...
          </span>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="p-16 text-center bg-base-100 rounded-xl border border-dashed border-base-300 max-w-2xl mx-auto mt-6">
          <p className="text-sm font-semibold opacity-40">
            {sets.length === 0 ? 'No set elements parsed out of the active Google Sheet.' : 'No active surgical kits match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSets.map((setItem) => (
            <SetInventoryCard 
              key={setItem.SetID} 
              set={setItem} 
              onInspect={handleInspectDetails} 
            />
          ))}
        </div>
      )}

    </div>
  );
}