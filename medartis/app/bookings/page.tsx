// app/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchBookingsLog } from '../actions/getBookingsAction';
import { Bookings } from '../types/interfaces';

type ExtendedBooking = Bookings & { Type?: string };

export default function BookingsDashboardPage() {
  const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

  // Helper template to process and display the custom Type metadata
  function displayCaseType(booking: ExtendedBooking): 'Normal Case' | 'Long Term' | 'Demo' | 'Removal' | 'Canceled' {
    const rawType = (booking.Type || '').toUpperCase().trim();
    if (rawType === 'REMOVAL') return 'Removal';
    if (rawType === 'DEMO') return 'Demo';
    if (rawType === 'LONG TERM') return 'Long Term';
    if (rawType === 'CANCELED') return 'Canceled';
    return 'Normal Case';
  }

  // Processing Multi-Pipeline Filter Multi-Match Evaluation
  const filteredBookings = bookings.filter(b => {
    const mrn = b["Patient MRN"] || '';
    const matchesSearch = 
      b.BookingID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.Doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mrn.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHospital = hospitalFilter === 'all' || b.Hospital === hospitalFilter;
    const matchesSales = salesPersonFilter === 'all' || b.Salesperson === salesPersonFilter;
    const matchesStatus = statusFilter === 'all' || b.Status.toLowerCase() === statusFilter.toLowerCase();
    
    const computedType = displayCaseType(b);
    const matchesType = typeFilter === 'all' || computedType.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesHospital && matchesSales && matchesStatus && matchesType;
  });

  // 🎨 Structural Color Coding Badge UI Map
  const statusBadges: Record<string, string> = {
    'pending': 'bg-rose-500/10 text-rose-600 border border-rose-500/20', // Red
    'confirmed': 'bg-amber-500/10 text-amber-600 border border-amber-500/20', // Orange
    'delivered': 'bg-blue-500/10 text-blue-600 border border-blue-500/20', // Blue
    'usage received': 'bg-teal-500/10 text-teal-600 border border-teal-500/20', // Turquoise
    'returned': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' // Green
  };

  const typeBadges: Record<string, string> = {
    'Normal Case': 'bg-base-200 text-base-content/70',
    'Long Term': 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
    'Demo': 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    'Removal': 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    'Canceled': 'bg-error/10 text-error border border-error/20 font-black'
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

      {/* 🛠️ Filters Panel Grid */}
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
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)} 
            className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full"
          >
            <option value="all">All Types</option>
            <option value="Normal Case">Normal Case</option>
            <option value="Long Term">Long Term</option>
            <option value="Demo">Demo</option>
            <option value="Removal">Removal</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Log Lifecycle Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full"
          >
            <option value="all">All Lifecycles</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="usage received">Usage Received</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Clinical Hospital</label>
          <select 
            value={hospitalFilter} 
            onChange={(e) => setHospitalFilter(e.target.value)} 
            className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full"
          >
            <option value="all">All Hospitals ({uniqueHospitals.length})</option>
            {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Sales Specialist</label>
          <select 
            value={salesPersonFilter} 
            onChange={(e) => setSalesPersonFilter(e.target.value)} 
            className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full"
          >
            <option value="all">All Field Reps ({uniqueSalesPeople.length})</option>
            {uniqueSalesPeople.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table Ledger Layout Area */}
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
                <th className="p-3">Booking ID</th>
                <th className="p-3">Case Date</th>
                <th className="p-3">Type Classification</th>
                <th className="p-3">Hospital Destination</th>
                <th className="p-3">Clinical Surgeon</th>
                <th className="p-3">Patient MRN</th>
                <th className="p-3">Sales Person</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200 font-medium text-base-content/90">
              {filteredBookings.map((booking) => {
                const currentType = displayCaseType(booking);
                const rawStatus = (booking.Status || '').trim().toLowerCase();
                const mrnVal = booking["Patient MRN"];

                return (
                  <tr key={booking.BookingID} className="hover:bg-base-50/40 transition-colors">
                    <td className="p-3 font-mono font-black text-primary select-all">
                      {booking.BookingID}
                    </td>
                    <td className="p-3 font-mono text-[11px] font-bold text-base-content/70">
                      {booking.CaseDate || '—'}
                    </td>
                    <td className="p-3">
                      <span className={`badge badge-sm font-bold px-2 py-2 rounded text-[10px] uppercase tracking-wide ${typeBadges[currentType] || 'bg-base-200'}`}>
                        {currentType}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">
                      {booking.Hospital}
                    </td>
                    <td className="p-3">
                      Dr. {booking.Doctor || 'Not Specified'}
                    </td>
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
                      <span className="font-semibold text-base-content/80">
                        {booking.Salesperson || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`badge badge-sm font-bold font-mono px-2.5 py-2 text-[10px] uppercase tracking-wider ${statusBadges[rawStatus] || 'bg-base-200 text-base-content'}`}>
                        {booking.Status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}