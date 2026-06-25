// app/sets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SetInventoryCard, { MedicalSet } from '../components/SetInventoryCard';

export default function SetsMatrixPage() {
  const [sets, setSets] = useState<MedicalSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchActiveSets() {
      try {
        // Connected placeholder mapping live to Sheets Engine pipeline
        const responseData: MedicalSet[] = [
          { id: '1', setName: 'Distal Radius System 2.4', systemType: 'Hand & Wrist', serialNumber: 'MED-DR-0941', totalSlots: 42, availablePieces: 42, status: 'Complete', lastChecked: '2026-06-25' },
          { id: '2', setName: 'Aptus Elbow Distal Humerus', systemType: 'Elbow & Shoulder', serialNumber: 'MED-DH-8812', totalSlots: 60, availablePieces: 48, status: 'Needs Refill', lastChecked: '2026-06-25' },
          { id: '3', setName: 'Radial Head System 2.0/2.8', systemType: 'Elbow & Shoulder', serialNumber: 'MED-RH-1104', totalSlots: 35, availablePieces: 35, status: 'Complete', lastChecked: '2026-06-24' },
          { id: '4', setName: 'Midfoot Compression Plate Set', systemType: 'Foot & Ankle', serialNumber: 'MED-MF-3390', totalSlots: 50, availablePieces: 12, status: 'In Surgery', lastChecked: '2026-06-25' },
        ];
        setSets(responseData);
      } catch (err) {
        console.error('Error fetching data source matrix rows', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveSets();
  }, []);

  const handleInspectDetails = (id: string) => {
    console.log(`Triggering modal/view layout for specific target record id: ${id}`);
    // Future Modal logic or route routing hook goes here
  };

  const filteredSets = sets.filter(s => 
    s.setName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-base-200/50 p-6 md:pl-72 pt-8">
      
      {/* Top Header Filter Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-base-300">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-base-content">
            Surgical Sets Inventory
          </h1>
          <p className="text-xs font-medium opacity-50 font-mono mt-0.5">
            Active structural catalog views
          </p>
        </div>

        {/* Live Filter Block */}
        <div className="form-control w-full sm:w-72">
          <div className="relative flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 opacity-40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search implants, SN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered w-full pl-10 text-xs font-semibold focus:outline-none focus:border-primary bg-base-100"
            />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 uppercase font-black">Syncing Matrix Columns...</span>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="p-12 text-center bg-base-100 rounded-xl border border-dashed border-base-300">
          <p className="text-sm font-medium opacity-50">No medical device sets map to those characters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSets.map((setItem) => (
            <SetInventoryCard 
              key={setItem.id} 
              set={setItem} 
              onInspect={handleInspectDetails} 
            />
          ))}
        </div>
      )}

    </div>
  );
}