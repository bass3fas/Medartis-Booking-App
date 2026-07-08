// app/sets/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SetInventoryCard from '../components/SetInventoryCard';
import SetDetailsDrawer from '../components/SetDetailsDrawer';
import { fetchEnrichedSets, VirtualSet } from '../actions/getSetsAction'; // Ensure this matches your unified server file

// 📦 Core logic wrapped safely inside a Suspense container boundary
function SetsMatrixContent() {
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<VirtualSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 🎛️ Active Multi-Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');       
  const [completeFilter, setCompleteFilter] = useState('all');   
  const [loanFilter, setLoanFilter] = useState('all');            
  const [locationFilter, setLocationFilter] = useState('all');   

  useEffect(() => {
    const setId = searchParams.get('setId');
    if (setId) {
      setSearchQuery(setId);
    }
  }, [searchParams]);

  // Drawer Control States
  const [selectedSet, setSelectedSet] = useState<VirtualSet | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function syncSystemData() {
      try {
        setLoading(true);
        const response = await fetchEnrichedSets();
        if (response.success && response.data) {
          setSets(response.data);
        } else {
          setErrorMessage(response.error || 'Failed to map inventory matrices.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'An error occurred fetching rows.');
      } finally {
        setLoading(false);
      }
    }
    syncSystemData();
  }, []);

  // 📍 SAFE LOCATION MENUS (Guarded against empty states to avoid crashing your page components)
  const uniqueLocations = sets && sets.length > 0
    ? Array.from(new Set(sets.map((s) => s.computedLocation).filter(Boolean))).sort()
    : [];

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCompleteFilter('all');
    setLoanFilter('all');
    setLocationFilter('all');
  };

  // 🧮 Safe Filter Multi-Pipeline
  const filteredSets = (sets || []).filter((set) => {
    if (!set) return false;
    const matchesSearch = 
      (set.SetName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (set.SetID || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || set.computedStatus === statusFilter;
    const matchesComplete = completeFilter === 'all' || set.computedComplete === completeFilter;
    
    const matchesLoan = 
      loanFilter === 'all' || 
      (loanFilter === 'Short Term' && !set.LoanType) || 
      (set.LoanType || '').toLowerCase() === loanFilter.toLowerCase();

    const matchesLocation = locationFilter === 'all' || set.computedLocation === locationFilter;

    return matchesSearch && matchesStatus && matchesComplete && matchesLoan && matchesLocation;
  });

  const freeSets = filteredSets.filter((s) => s.computedStatus === 'Free');
  const bookedSets = filteredSets.filter((s) => s.computedStatus === 'Booked');

  return (
    <div className="w-full">
      
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-2xl font-black tracking-tight text-base-content">Surgical Sets Matrix</h1>
        <p className="text-xs font-medium opacity-50 font-mono mt-0.5">Relational virtual calculations engine dashboard</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error font-semibold shadow-sm text-xs mb-6 max-w-xl text-error-content">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* 🛠️ FILTER BAR MOUNTED OUTSIDE THE LOADING GATE SO IT REMAINS VISIBLE */}
      <div className="p-4 bg-base-100 border border-base-300 rounded-xl mb-8 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
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

          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Availability</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50">
              <option value="all">All Availability Statuses</option>
              <option value="Free">🟢 Free</option>
              <option value="Booked">🟡 Booked</option>
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Tray State</label>
            <select value={completeFilter} onChange={(e) => setCompleteFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50">
              <option value="all">All Tray Profiles</option>
              <option value="Yes">✓ Complete Trays</option>
              <option value="No">⚠ Incomplete Trays</option>
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Loan Designation</label>
            <select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50">
              <option value="all">All Allocation Types</option>
              <option value="Long Term">Purple (Long Term)</option>
              <option value="Short Term">Standard (Short Term)</option>
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label py-1 text-[10px] uppercase font-mono font-bold opacity-50">Location Target</label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50">
              <option value="all">All Locations ({uniqueLocations.length})</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="flex justify-between items-center border-t border-base-200 pt-3 text-xs">
          <span className="font-mono text-[11px] opacity-60">
            Showing <strong className="text-primary">{filteredSets.length}</strong> of {sets.length} items
          </span>
          <button onClick={resetFilters} className="btn btn-ghost btn-xs text-error font-bold tracking-tight normal-case hover:bg-error/10">
            Clear Active Filters
          </button>
        </div>
      </div>

      {/* --- DATA VIEWPANEL --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-black uppercase">Recomputing Relations...</span>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="p-16 text-center bg-base-100 rounded-xl border border-dashed border-base-300 max-w-xl mx-auto mt-6">
          <p className="text-sm font-semibold opacity-40">No surgical sets match that combined filter state.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* 1. Booked Lots rendered first now */}
          {statusFilter !== 'Free' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-black tracking-wider uppercase opacity-60 font-mono">Assigned / Booked Lots ({bookedSets.length})</h2>
                <div className="h-px bg-base-300 flex-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {bookedSets.map(s => (
                  <SetInventoryCard key={s.SetID} set={s} onInspect={(id) => { setSelectedSet(s); setIsDrawerOpen(true); }} />
                ))}
              </div>
            </div>
          )}

          {/* 2. Free Lots rendered second */}
          {statusFilter !== 'Booked' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-black tracking-wider uppercase opacity-60 font-mono">Available Core Lots ({freeSets.length})</h2>
                <div className="h-px bg-base-300 flex-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {freeSets.map(s => (
                  <SetInventoryCard key={s.SetID} set={s} onInspect={(id) => { setSelectedSet(s); setIsDrawerOpen(true); }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SetDetailsDrawer 
        set={selectedSet} 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedSet(null);
        }} 
      />
    </div>
  );
}

// 🏷️ Exported main page default route with static suspense fallback
export default function SetsMatrixPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center py-40 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-black uppercase">Loading Stream Channels...</span>
        </div>
      }
    >
      <SetsMatrixContent />
    </Suspense>
  );
}