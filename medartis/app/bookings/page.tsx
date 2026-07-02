// app/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchBookingsLog, BookingCase } from '../actions/getBookingsAction';

export default function BookingsDashboardPage() {
  const [bookings, setBookings] = useState<BookingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');

  useEffect(() => {
    async function initPage() {
      setLoading(true);
      const res = await fetchBookingsLog();
      if (res.success) {
        setBookings(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to retrieve bookings records.');
      }
      setLoading(false);
    }
    initPage();
  }, []);

  // Compute filtering lists dynamic values
  const uniqueHospitals = Array.from(new Set(bookings.map(b => b.Hospital).filter(Boolean))).sort();
  const uniqueSalesPeople = Array.from(new Set(bookings.map(b => b.SalesPerson).filter(Boolean))).sort();

  // Filter Application Pipeline
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      (b.BookingID || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.Doctor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.PatientMRN || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHospital = hospitalFilter === 'all' || b.Hospital === hospitalFilter;
    const matchesSales = salesPersonFilter === 'all' || b.SalesPerson === salesPersonFilter;

    return matchesSearch && matchesHospital && matchesSales;
  });

  return (
    <div className="w-full p-2 font-sans">
      
      {/* Upper Title Area */}
      <div className="mb-6 pb-2 border-b border-base-300 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black tracking-tight text-base-content">Surgical Bookings Registry</h1>
          <p className="text-xs font-mono opacity-50 mt-0.5">Scheduled surgical implants pipelines and case definitions</p>
        </div>
        <div className="text-right font-mono text-[11px] opacity-60 hidden sm:block">
          Total Base Records: <strong>{bookings.length}</strong>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* 📊 Metrics Summary strip banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-base-100 border border-base-300 rounded-xl shadow-sm">
          <p className="text-[10px] font-mono uppercase opacity-50 font-bold">Total Bookings</p>
          <p className="text-xl font-black text-primary">{filteredBookings.length}</p>
        </div>
        <div className="p-3 bg-base-100 border border-base-300 rounded-xl shadow-sm">
          <p className="text-[10px] font-mono uppercase opacity-50 font-bold">Active Facilities</p>
          <p className="text-xl font-black text-secondary">{uniqueHospitals.length}</p>
        </div>
        <div className="p-3 bg-base-100 border border-base-300 rounded-xl shadow-sm">
          <p className="text-[10px] font-mono uppercase opacity-50 font-bold">Field Reps Assigned</p>
          <p className="text-xl font-black text-accent">{uniqueSalesPeople.length}</p>
        </div>
        <div className="p-3 bg-base-100 border border-base-300 rounded-xl shadow-sm">
          <p className="text-[10px] font-mono uppercase opacity-50 font-bold">Current Filtered</p>
          <p className="text-xl font-black opacity-80">{filteredBookings.length} match</p>
        </div>
      </div>

      {/* 🛠️ Multi-Select Filters Panel Component */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-base-100 border border-base-300 rounded-xl shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Search Parameters</label>
          <input 
            type="text" 
            placeholder="Search Booking ID, Surgeon, MRN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none w-full"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Hospital Filter</label>
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
            <option value="all">All Reps ({uniqueSalesPeople.length})</option>
            {uniqueSalesPeople.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table Ledger Data Frame */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-bold uppercase">Syncing Bookings Ledger...</span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-base-100 rounded-xl border border-base-300 italic opacity-40 text-xs">
          No booked clinical files found matching selected filtering metrics.
        </div>
      ) : (
        <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-sm overflow-x-auto">
          <table className="table table-compact w-full text-xs font-sans">
            <thead className="bg-base-50 border-b border-base-200 font-mono text-[10px] uppercase font-black text-base-content/60">
              <tr>
                <th className="p-3">Booking ID</th>
                <th className="p-3">Case Date</th>
                <th className="p-3">Hospital / Location</th>
                <th className="p-3">Surgeon Specialist</th>
                <th className="p-3">Patient MRN</th>
                <th className="p-3">Sales Person</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200 font-medium text-base-content/90">
              {filteredBookings.map((booking) => (
                <tr key={booking.BookingID} className="hover:bg-base-50/40 transition-colors">
                  <td className="p-3 font-mono font-black text-primary select-all">
                    {booking.BookingID}
                  </td>
                  <td className="p-3 font-mono text-[11px] opacity-70">
                    {booking.CaseDate || '—'}
                  </td>
                  <td className="p-3 font-semibold">
                    {booking.Hospital}
                  </td>
                  <td className="p-3 font-sans">
                    Dr. {booking.Doctor || 'Not Assigned'}
                  </td>
                  <td className="p-3 font-mono">
                    {booking.PatientMRN ? (
                      <span className="bg-base-200/60 text-base-content px-2 py-0.5 rounded border border-base-300/40 text-[11px]">
                        {booking.PatientMRN}
                      </span>
                    ) : (
                      <span className="opacity-30 italic">No MRN Link</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="badge badge-sm font-semibold bg-base-200 text-base-content border-0 px-2.5">
                      {booking.SalesPerson || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}