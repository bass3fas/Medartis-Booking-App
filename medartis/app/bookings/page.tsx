// app/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchBookingsLog } from '../actions/getBookingsAction';
import { Bookings } from '../types/inventory';

export default function BookingsDashboardPage() {
  const [bookings, setBookings] = useState<Bookings[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 🧭 State to manage expanded detail accordion drawer keys
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Filters state hooks
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function initPage() {
      setLoading(true);
      const res = await fetchBookingsLog();
      if (res.success) {
        setBookings(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to sync structural booking tables.');
      }
      setLoading(false);
    }
    initPage();
  }, []);

  const uniqueHospitals = Array.from(new Set(bookings.map(b => b.Hospital).filter(Boolean))).sort();
  const uniqueSalesPeople = Array.from(new Set(bookings.map(b => b.Salesperson).filter(Boolean))).sort();

  function formatCaseType(booking: Bookings): string {
    const rawType = (booking.Type || '').toUpperCase().replace(/\s+/g, '').trim();
    if (rawType === 'REMOVAL') return 'Removal';
    if (rawType === 'DEMO') return 'Demo';
    if (rawType === 'LONGTERM') return 'Long Term';
    if (rawType === 'CANCELED') return 'Canceled';
    return '';
  }

  const filteredBookings = bookings.filter(b => {
    const mrn = b["Patient MRN"] || '';
    const matchesSearch = 
      b.BookingID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.Doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mrn.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHospital = hospitalFilter === 'all' || b.Hospital === hospitalFilter;
    const matchesSales = salesPersonFilter === 'all' || b.Salesperson === salesPersonFilter;
    
    let statusClean = (b.Status || '').trim().toLowerCase();
    if (statusClean === 'usage received') statusClean = 'used';
    const matchesStatus = statusFilter === 'all' || statusClean === statusFilter.toLowerCase();
    
    const formattedType = formatCaseType(b);
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'empty' && formattedType === '') || 
      (typeFilter !== 'empty' && formattedType.toLowerCase() === typeFilter.toLowerCase());

    return matchesSearch && matchesHospital && matchesSales && matchesStatus && matchesType;
  });

  const statusBadges: Record<string, string> = {
    'pending': 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    'confirmed': 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    'delivered': 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
    'used': 'bg-cyan-500/15 text-cyan-700 border border-cyan-400/30 font-extrabold shadow-xs', 
    'usage received': 'bg-cyan-500/15 text-cyan-700 border border-cyan-400/30 font-extrabold shadow-xs',
    'returned': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold'
  };

  const typeBadges: Record<string, string> = {
    'Long Term': 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
    'Demo': 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    'Removal': 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    'Canceled': 'bg-error/10 text-error border border-error/20 font-bold'
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedBookingId(expandedBookingId === id ? null : id);
  };

  return (
    <div className="w-full p-2 font-sans">
      
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-xl font-black tracking-tight text-base-content">Surgical Bookings Registry</h1>
        <p className="text-xs font-mono opacity-50 mt-0.5">Real-time scheduling workflows compiled directly from database logs</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Filters Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 p-4 bg-base-100 border border-base-300 rounded-xl shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Search Metadata</label>
          <input 
            type="text" 
            placeholder="Booking ID, Surgeon, MRN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none w-full"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Case Intent Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full">
            <option value="all">All Types</option>
            <option value="empty">Standard / Empty</option>
            <option value="long term">Long Term</option>
            <option value="demo">Demo</option>
            <option value="removal">Removal</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Log Lifecycle Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full">
            <option value="all">All Lifecycles</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="used">Used</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Clinical Hospital</label>
          <select value={hospitalFilter} onChange={(e) => setHospitalFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full">
            <option value="all">All Hospitals ({uniqueHospitals.length})</option>
            {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Sales Specialist</label>
          <select value={salesPersonFilter} onChange={(e) => setSalesPersonFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full">
            <option value="all">All Field Reps ({uniqueSalesPeople.length})</option>
            {uniqueSalesPeople.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-bold uppercase">Syncing Live Ledger...</span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-base-100 rounded-xl border border-base-300 italic opacity-40 text-xs">
          No records matching active tracking criteria metrics located.
        </div>
      ) : (
        <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-sm overflow-x-auto">
          <table className="table table-compact w-full text-xs font-sans">
            <thead className="bg-base-50 border-b border-base-200 font-mono text-[10px] uppercase font-black text-base-content/60">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">Booking ID</th>
                <th className="p-3">Case Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Hospital Destination</th>
                <th className="p-3">Clinical Surgeon</th>
                <th className="p-3">Patient MRN</th>
                <th className="p-3">Sales Person</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200 font-medium text-base-content/90">
              {filteredBookings.map((booking) => {
                const currentType = formatCaseType(booking);
                const displayStatus = (booking.Status || '').trim();
                const rawStatusKey = displayStatus.toLowerCase();
                const mrnVal = booking["Patient MRN"];
                const isExpanded = expandedBookingId === booking.BookingID;

                // Split strings if they are comma-separated sets
                const requestedSetsArray = booking["Requested Sets"]?.split(',').map(s => s.trim()).filter(Boolean) || [];
                const selectedSetsArray = booking["Selected Sets"]?.split(',').map(s => s.trim()).filter(Boolean) || [];

                return (
                  <>
                    {/* 📊 Main Row */}
                    <tr 
                      key={booking.BookingID} 
                      onClick={() => toggleRowExpansion(booking.BookingID)}
                      className={`hover:bg-base-50/60 transition-colors cursor-pointer ${isExpanded ? 'bg-base-50/80' : ''}`}
                    >
                      <td className="p-3 text-center text-base-content/40 font-bold text-sm">
                        {isExpanded ? '−' : '+'}
                      </td>
                      <td className="p-3 font-mono font-black text-primary select-all">
                        {booking.BookingID}
                      </td>
                      <td className="p-3 font-mono text-[11px] font-bold text-base-content/70">
                        {booking.CaseDate || '—'}
                      </td>
                      <td className="p-3">
                        {currentType ? (
                          <span className={`badge badge-sm font-bold px-2 py-2 rounded text-[10px] uppercase tracking-wide ${typeBadges[currentType] || 'bg-base-200'}`}>
                            {currentType}
                          </span>
                        ) : (
                          <span className="opacity-20">—</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{booking.Hospital}</td>
                      <td className="p-3">Dr. {booking.Doctor || 'Not Specified'}</td>
                      <td className="p-3 font-mono">
                        {mrnVal && mrnVal.trim() !== '' ? (
                          <span className="bg-primary/5 text-primary font-bold px-2 py-0.5 rounded border border-primary/10 text-[11px]">
                            {mrnVal}
                          </span>
                        ) : (
                          <span className="opacity-30 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-base-content/80">{booking.Salesperson || '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`badge badge-sm font-mono px-2.5 py-2 text-[10px] uppercase tracking-wider ${statusBadges[rawStatusKey] || 'bg-base-200 text-base-content'}`}>
                          {rawStatusKey === 'usage received' ? 'Used' : displayStatus || 'Pending'}
                        </span>
                      </td>
                    </tr>

                    {/* 🔓 Dropdown Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-base-50/30 transition-all">
                        <td colSpan={9} className="p-4 border-l-2 border-primary bg-base-100/40">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-base-content/80">
                            
                            {/* Left Column: Set Allocations */}
                            <div className="space-y-3 bg-base-100 p-3 rounded-xl border border-base-200 shadow-xs">
                              <div>
                                <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-1.5">Requested Kit Inventory</h4>
                                {requestedSetsArray.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {requestedSetsArray.map((set, idx) => (
                                      <span key={idx} className="bg-base-200/80 px-2 py-1 rounded font-mono text-[11px] border border-base-300 font-semibold">{set}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="italic opacity-40 font-mono text-[11px]">No initial requested set allocations specified.</p>
                                )}
                              </div>
                              <div className="pt-2 border-t border-base-200">
                                <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-1.5">Selected / Dispatched Sets</h4>
                                {selectedSetsArray.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedSetsArray.map((set, idx) => (
                                      <span key={idx} className="bg-info/5 text-info px-2 py-1 rounded font-mono text-[11px] border border-info/10 font-bold">{set}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="italic opacity-40 font-mono text-[11px]">Pending delivery verification scan logs.</p>
                                )}
                              </div>
                            </div>

                            {/* Middle Column: Clinical Usages & Notes */}
                            <div className="space-y-2 bg-base-100 p-3 rounded-xl border border-base-200 shadow-xs">
                              <div>
                                <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-0.5">Patient Tracking Scope</h4>
                                <p className="font-mono text-xs font-bold text-base-content">MRN Reference: <span className="text-primary">{mrnVal || 'Unassigned'}</span></p>
                              </div>
                              <div className="pt-2 border-t border-base-200">
                                <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-0.5">Special Logistics Requests</h4>
                                <p className="italic bg-base-50 p-2 rounded border border-base-200 text-base-content/70 font-medium">
                                  {booking["Special Request"]?.trim() || "No explicit instructions appended."}
                                </p>
                              </div>
                              {booking["Delivery Note"] && (
                                <div className="pt-1">
                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-0.5">Delivery Documentation Ref</h4>
                                  <a href={booking["Delivery Note Link"] || "#"} target="_blank" rel="noreferrer" className="text-primary font-bold underline font-mono text-[11px] block hover:text-primary-focus">
                                    📄 {booking["Delivery Note"]}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Usage Images Proofing */}
                            <div className="bg-base-100 p-3 rounded-xl border border-base-200 shadow-xs">
                              <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-2">Usage Photo Ledger Proof</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {booking.UsagePhoto ? (
                                  <a href={booking.UsagePhoto} target="_blank" rel="noreferrer" className="group block relative border border-base-300 rounded-lg overflow-hidden aspect-video bg-base-50 hover:border-primary transition-colors">
                                    <img src={booking.UsagePhoto} alt="Usage Ledger 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white font-mono text-[8px] px-1.5 py-0.5 rounded font-bold">IMAGE_01 🔗</span>
                                  </a>
                                ) : (
                                  <div className="border border-dashed border-base-300 rounded-lg aspect-video flex items-center justify-center text-[10px] font-mono opacity-40 italic bg-base-50">
                                    No photo 1
                                  </div>
                                )}

                                {booking.UsagePhoto2 ? (
                                  <a href={booking.UsagePhoto2} target="_blank" rel="noreferrer" className="group block relative border border-base-300 rounded-lg overflow-hidden aspect-video bg-base-50 hover:border-primary transition-colors">
                                    <img src={booking.UsagePhoto2} alt="Usage Ledger 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white font-mono text-[8px] px-1.5 py-0.5 rounded font-bold">IMAGE_02 🔗</span>
                                  </a>
                                ) : (
                                  <div className="border border-dashed border-base-300 rounded-lg aspect-video flex items-center justify-center text-[10px] font-mono opacity-40 italic bg-base-50">
                                    No photo 2
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}