// app/sets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SetInventoryCard from '../components/SetInventoryCard';
import { fetchEnrichedSets, VirtualSet } from '../actions/getSetsAction';

export default function SetsMatrixPage() {
  const [sets, setSets] = useState<VirtualSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 🎛️ Active Multi-Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');       // all, Free, Booked
  const [completeFilter, setCompleteFilter] = useState<string>('all');   // all, Yes, No
  const [loanFilter, setLoanFilter] = useState<string>('all');           // all, Long Term, Short Term
  const [locationFilter, setLocationFilter] = useState<string>('all');   // dynamically populated list

  useEffect(() => {
    async function syncSystemData() {
      setLoading(true);
      const response = await fetchEnrichedSets();
      if (response.success) {
        setSets(response.data);
      } else {
        setErrorMessage(response.error || 'Failed to map inventory matrices.');
      }
      setLoading(false);
    }
    syncSystemData();
  }, []);

  // 📍 Extract unique active locations from our live dataset for the dropdown menu
  const uniqueLocations = Array.from(
    new Set(sets.map((s) => s.computedLocation).filter(Boolean))
  ).sort();

  // 🧼 Reset all filters back to baseline states
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCompleteFilter('all');
    setLoanFilter('all');
    setLocationFilter('all');
  };

  // 🧮 THE MULTI-FILTER PIPELINE (Applies all rules at the same time)
  const filteredSets = sets.filter((set) => {
    // 1. Text Search Match
    const matchesSearch = 
      (set.SetName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (set.SetID || '').toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Availability Match (Free / Booked)
    const matchesStatus = statusFilter === 'all' || set.computedStatus === statusFilter;

    // 3. Tray Completeness Match (Yes / No)
    const matchesComplete = completeFilter === 'all' || set.computedComplete === completeFilter;

    // 4. Loan Type Match (Long Term / Short Term)
    const matchesLoan = 
      loanFilter === 'all' || 
      (loanFilter === 'Short Term' && !set.LoanType) || // Fallback if blank means short term
      (set.LoanType || '').toLowerCase() === loanFilter.toLowerCase();

    // 5. Relational Current Location Match
    const matchesLocation = locationFilter === 'all' || set.computedLocation === locationFilter;

    // Combine all checks
    return matchesSearch && matchesStatus && matchesComplete && matchesLoan && matchesLocation;
  });

  // Split your final filtered results into your layout view groups
  const freeSets = filteredSets.filter((s) => s.computedStatus === 'Free');
  const bookedSets = filteredSets.filter((s) => s.computedStatus === 'Booked');

  return (
    <div className="w-full">
      
      {/* Upper Brand Header */}
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-2xl font-black tracking-tight text-base-content">
          Surgical Sets Matrix
        </h1>
        <p className="text-xs font-medium opacity-50 font-mono mt-0.5">
          Multi-criteria filtering ecosystem matching active sheets parameters
        </p>
      </div>

      {/* --- APPSHEET STYLE MULTI-FILTER CONTROL BAR --- */}
      <div className="p-4 bg-base-100 border border-base-300 rounded-xl mb-8 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Filter 1: Universal Keyword Search */}
          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Search Matrix</label>
            <input 
              type="text" 
              placeholder="Type name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Filter 2: Availability */}
          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Availability</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-sm select-bordered font-semibold text-xs bg-base-50"
            >
              <option value="all">All Availability Statuses</option>
              <option value="Free">🟢 Free</option>
              <option value="Booked">🟡 Booked</option>
            </select>
          </div>

          {/* Filter 3: Completeness */}
          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Tray State</label>
            <select 
              value={completeFilter}
              onChange={(e) => setCompleteFilter(e.target.value)}
              className="select select-sm select-bordered font-semibold text-xs bg-base-50"
            >
              <option value="all">All Tray Profiles</option>
              <option value="Yes">✓ Complete Trays</option>
              <option value="No">⚠ Incomplete Trays</option>
            </select>
          </div>

          {/* Filter 4: Loan Type */}
          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Loan Designation</label>
            <select 
              value={loanFilter}
              onChange={(e) => setLoanFilter(e.target.value)}
              className="select select-sm select-bordered font-semibold text-xs bg-base-50"
            >
              <option value="all">All Allocation Types</option>
              <option value="Long Term">Purple (Long Term)</option>
              <option value="Short Term">Standard (Short Term)</option>
            </select>
          </div>

          {/* Filter 5: Location Dynamic Picker */}
          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Current Location Target</label>
            <select 
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="select select-sm select-bordered font-semibold text-xs bg-base-50"
            >
              <option value="all">All Locations ({uniqueLocations.length})</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Filter Meta-Control Footer */}
        <div className="flex justify-between items-center border-t border-base-200 pt-3 text-xs">
          <span className="font-mono text-[11px] opacity-60">
            Showing <strong className="text-primary">{filteredSets.length}</strong> of {sets.length} catalog items match rules
          </span>
          
          <button 
            onClick={resetFilters}
            className="btn btn-ghost btn-xs text-error font-bold tracking-tight normal-case hover:bg-error/10"
          >
            Clear Active Filters
          </button>
        </div>
      </div>

      {/* --- RENDER GRID BLOCKS --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-black uppercase">Recomputing Relations...</span>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="p-16 text-center bg-base-100 rounded-xl border border-dashed border-base-300 max-w-xl mx-auto mt-6">
          <p className="text-sm font-semibold opacity-40">No surgical sets match that combined filter state.</p>
          <button onClick={resetFilters} className="btn btn-primary btn-xs mt-3 normal-case font-bold">Reset Filters</button>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          
          {/* SECTION A: FREE LISTINGS */}
          {statusFilter !== 'Booked' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-black tracking-wider uppercase opacity-60 font-mono">
                  Available Core Lots ({freeSets.length})
                </h2>
                <div className="h-px bg-base-300 flex-1" />
              </div>
              {freeSets.length === 0 ? (
                <p className="text-xs opacity-30 italic p-4 text-center">No available matching assets.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {freeSets.map(s => (
                    <SetInventoryCard key={s.SetID} set={s} onInspect={(id) => console.log(id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: BOOKED LISTINGS */}
          {statusFilter !== 'Free' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-black tracking-wider uppercase opacity-60 font-mono">
                  Assigned / Booked Lots ({bookedSets.length})
                </h2>
                <div className="h-px bg-base-300 flex-1" />
              </div>
              {bookedSets.length === 0 ? (
                <p className="text-xs opacity-30 italic p-4 text-center">No active booked match sets.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {bookedSets.map(s => (
                    <SetInventoryCard key={s.SetID} set={s} onInspect={(id) => console.log(id)} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}