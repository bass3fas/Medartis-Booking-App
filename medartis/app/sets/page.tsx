// app/sets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SetInventoryCard from '../components/SetInventoryCard';
import SetDetailsDrawer from '../components/SetDetailsDrawer'; // 👈 Import Drawer
import { fetchEnrichedSets, VirtualSet } from '../actions/getSetsAction';

export default function SetsMatrixPage() {
  const [sets, setSets] = useState<VirtualSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 🎛️ Drawer Control States
  const [selectedSet, setSelectedSet] = useState<VirtualSet | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter Configuration Hooks (from our previous step)...
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [completeFilter, setCompleteFilter] = useState('all');
  const [loanFilter, setLoanFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    async function syncSystemData() {
      setLoading(true);
      const response = await fetchEnrichedSets();
      if (response.success) setSets(response.data);
      else setErrorMessage(response.error || 'Failed to sync sets.');
      setLoading(false);
    }
    syncSystemData();
  }, []);

  // Click Trigger Function
  const handleOpenInspection = (setID: string) => {
    const targetSet = sets.find(s => s.SetID === setID);
    if (targetSet) {
      setSelectedSet(targetSet);
      setIsDrawerOpen(true);
    }
  };

  // Run filtering array matches (from previous step code block)
  const filteredSets = sets.filter(set => {
    return (
      ((set.SetName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (set.SetID || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || set.computedStatus === statusFilter) &&
      (completeFilter === 'all' || set.computedComplete === completeFilter) &&
      (locationFilter === 'all' || set.computedLocation === locationFilter)
    );
  });

  return (
    <div className="w-full">
      {/* Search multi-filter bar template stays exactly here... */}
      
      {/* Existing Grid Loop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSets.map((setItem) => (
          <SetInventoryCard 
            key={setItem.SetID} 
            set={setItem} 
            onInspect={handleOpenInspection} // 👈 Fires the state setter line
          />
        ))}
      </div>

      {/* 🌟 OVERLAY DETAILED ACCORDION SLIDE OUT DRAWER */}
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