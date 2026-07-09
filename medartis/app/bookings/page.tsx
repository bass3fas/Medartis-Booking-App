// app/bookings/page.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { fetchBookingsLog, EnhancedBooking } from '../actions/getBookingsAction';
import { BookingSet } from '../types/interfaces';
import SetDetailsDrawer from '../components/SetDetailsDrawer';
import { VirtualSet } from '../actions/getSetsAction';
import { buildAppSheetImageUrl } from '../lib/appsheet-image-url';

export default function BookingsDashboardPage() {
  const [bookings, setBookings] = useState<EnhancedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [selectedMRNTabs, setSelectedMRNTabs] = useState<Record<string, string>>({});
  const [selectedSetTabs, setSelectedSetTabs] = useState<Record<string, string | null>>({});
  const [activeRefView, setActiveRefView] = useState<{
    type: 'BookingSets' | 'PartsMaster' | 'PatientHistory';
    title: string;
    data: any;
  } | null>(null);

  const [drawerTargetSet, setDrawerTargetSet] = useState<any | null>(null);
  const [isSetDrawerOpen, setIsSetDrawerOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [gapFilter, setGapFilter] = useState('all');
  const [weekdayFilter, setWeekdayFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    async function initPage() {
      setLoading(true);
      const res = await fetchBookingsLog();
      if (res.success) {
        setBookings(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to sync data matrices.');
      }
      setLoading(false);
    }
    initPage();
  }, []);

  const uniqueHospitals = Array.from(new Set(bookings.map(b => b.Hospital).filter(Boolean))).sort();
  const uniqueSalesPeople = Array.from(new Set(bookings.map(b => b.Salesperson).filter(Boolean))).sort();

  function formatCaseType(booking: EnhancedBooking): string {
    const rawType = (booking.Type || '').toUpperCase().replace(/\s+/g, '').trim();
    if (rawType === 'REMOVAL') return 'Removal';
    if (rawType === 'DEMO') return 'Demo';
    if (rawType === 'LONGTERM') return 'LONGTERM';
    if (rawType === 'CANCELED') return 'Canceled';
    return '';
  }

  function buildBookingSetImageUrl(fileName: string): string {
    return buildAppSheetImageUrl(fileName, 'BookingSets');
  }

  function getWeekdayString(b: EnhancedBooking): string {
    const date = new Date(b.CaseDate);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  const handleClearFilters = () => {
    setSearchQuery('');
    setHospitalFilter('all');
    setSalesPersonFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setGapFilter('all');
    setWeekdayFilter('all');
    setFromDate('');
    setToDate('');
  };

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

    const hasUsages = b.PatientUsages && b.PatientUsages.length > 0;
    const hasPhotos = b.PatientUsages && b.PatientUsages.some(u => u.UsageLogSheet);
    
    let matchesGap = true;
    if (gapFilter === 'no_mrn') matchesGap = !hasUsages;
    if (gapFilter === 'no_usage') matchesGap = !hasUsages;
    if (gapFilter === 'no_usage_photo') matchesGap = hasUsages && !hasPhotos;

    // Date Range Evaluation
    let matchesDateRange = true;
    if (b.CaseDate) {
      const caseTime = new Date(b.CaseDate).getTime();
      if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        if (caseTime < fromTime) matchesDateRange = false;
      }
      if (toDate) {
        const toTime = new Date(toDate).getTime();
        if (caseTime > toTime) matchesDateRange = false;
      }
    } else if (fromDate || toDate) {
      matchesDateRange = false;
    }
    
    const bWeekday = getWeekdayString(b);
    const matchesWeekday = weekdayFilter === 'all' || (bWeekday && bWeekday === weekdayFilter);

    return matchesSearch 
      && matchesHospital 
      && matchesSales 
      && matchesStatus 
      && matchesType 
      && matchesGap
      && matchesDateRange
      && matchesWeekday;
  });

  function toTimestamp(b: any): number {
    const datePart = b.CaseDate || b.Date || '';
    const timePart = b.CaseTime || '00:00';
    const combined = `${datePart} ${timePart}`.trim();
    const ts = new Date(combined).getTime();
    if (!isNaN(ts)) return ts;
    const alt = Date.parse(datePart);
    if (!isNaN(alt)) return alt;
    return 0;
  }

  const totalCount = bookings.length;
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    return toTimestamp(b) - toTimestamp(a);
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
    'LONGTERM': 'bg-purple-500/10 text-purple-600 border border-purple-500/20 font-mono tracking-tighter',
    'Demo': 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    'Removal': 'bg-slate-500/10 text-slate-600 border border-slate-500/20',
    'Canceled': 'bg-error/10 text-error border border-error/20 font-bold'
  };

  const toggleRowExpansion = (booking: EnhancedBooking) => {
    const id = booking.BookingID;
    if (expandedBookingId === id) {
      setExpandedBookingId(null);
    } else {
      setExpandedBookingId(id);
      if (booking.PatientUsages.length > 0 && !selectedMRNTabs[id]) {
        setSelectedMRNTabs(prev => ({ ...prev, [id]: booking.PatientUsages[0].MRN }));
      }
      if (booking.RelatedBookingSets.length > 0 && !selectedSetTabs[id]) {
        setSelectedSetTabs(prev => ({ ...prev, [id]: booking.RelatedBookingSets[0].SetID || null }));
      }
    }
  };

  return (
    <div className="w-full p-2 font-sans">
      <div className="mb-6 pb-2 border-b border-base-300">
        <h1 className="text-xl font-black tracking-tight text-base-content">Surgical Bookings Registry</h1>
        <p className="text-xs font-mono opacity-50 mt-0.5">Real-time workflows tracked directly from integrated logs</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-xs mb-6 text-error-content font-mono">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Filter Controls Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-1 p-4 bg-base-100 border border-base-300 rounded-xl shadow-sm">
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
            <option value="longterm">LONGTERM</option>
            <option value="demo">Demo</option>
            <option value="removal">Removal</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Log Status</label>
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
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Hospital</label>
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

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Data Gaps</label>
          <select value={gapFilter} onChange={(e) => setGapFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full">
            <option value="all">All Records</option>
            <option value="no_mrn">No MRN</option>
            <option value="no_usage">No Usage Items</option>
            
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Day of Week</label>
          <select value={weekdayFilter} onChange={(e) => setWeekdayFilter(e.target.value)} className="select select-sm select-bordered font-semibold text-xs bg-base-50 w-full">
            <option value="all">Any Day</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-mono uppercase opacity-50 font-bold">Date Range (From → To)</label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none w-full"
            />
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input input-sm input-bordered font-semibold text-xs bg-base-50 focus:outline-none w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4 px-2">
        <button 
          onClick={handleClearFilters}
          className="btn btn-ghost btn-xs font-bold text-primary normal-case tracking-tight px-2 hover:bg-primary/5 rounded-md"
        >
          Clear All Filters
        </button>
      </div>

      <div className="mb-2 text-right">
        <span className="text-[10px] font-mono bg-base-200 text-base-content/70 px-2 py-1 rounded-md font-bold">
          Showing {sortedBookings.length} of {totalCount} total bookings
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="loading loading-ring loading-md text-primary"></span>
          <span className="text-[10px] font-mono tracking-widest opacity-40 font-bold uppercase">Syncing Live Ledger...</span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-base-100 rounded-xl border border-base-300 italic opacity-40 text-xs">
          No matching records located.
        </div>
      ) : (
        <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-sm overflow-x-auto">
          <table className="table table-compact w-full text-xs font-sans">
            <thead className="bg-base-50 border-b border-base-200 font-mono text-[10px] uppercase font-black text-base-content/60">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">Booking ID / Day</th>
                <th className="p-3">Case Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Hospital Destination</th>
                <th className="p-3">Clinical Surgeon</th>
                <th className="p-3">Patient MRN(s)</th>
                <th className="p-3">Sales Person</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200 font-medium text-base-content/90">
              {sortedBookings.map((booking) => {
                const currentType = formatCaseType(booking);
                const displayStatus = (booking.Status || '').trim();
                const rawStatusKey = displayStatus.toLowerCase();
                const isExpanded = expandedBookingId === booking.BookingID;

                const requestedSetsArray = booking["Requested Sets"]?.split(',').map(s => s.trim()).filter(Boolean) || [];
                const selectedSetsArray = booking["Selected Sets"]?.split(',').map(s => s.trim()).filter(Boolean) || [];

                const activeMRNString = selectedMRNTabs[booking.BookingID] || (booking.PatientUsages[0]?.MRN);
                const activeUsageDetails = booking.PatientUsages.find(u => u.MRN === activeMRNString);

                return (
                  <Fragment key={booking.BookingID}>
                    <tr 
                      onClick={() => toggleRowExpansion(booking)}
                      className={`hover:bg-base-50/60 transition-colors cursor-pointer ${isExpanded ? 'bg-base-50/80' : ''}`}
                    >
                      <td className="p-3 text-center text-base-content/40 font-bold text-sm">{isExpanded ? '−' : '+'}</td>
                      <td className="p-3 font-mono font-black text-primary select-all">
                        {booking.BookingID}
                        <span className="block text-[10px] font-bold text-base-content/40 normal-case tracking-normal">
                          ({getWeekdayString(booking) || 'N/A'})
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] font-bold text-base-content/70">{booking.CaseDate || '—'}</td>
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
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {booking.PatientUsages.length > 0 ? (
                            booking.PatientUsages.map(u => (
                              <span key={u.MRN} className="bg-primary/5 text-primary font-bold px-1.5 py-0.5 rounded border border-primary/10 text-[10px]">
                                {u.MRN}
                              </span>
                            ))
                          ) : (
                            <span className="opacity-30 italic text-[11px]">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3"><span className="font-semibold text-base-content/80">{booking.Salesperson || '—'}</span></td>
                      <td className="p-3 text-center">
                        <span className={`badge badge-sm font-mono px-2.5 py-2 text-[10px] uppercase tracking-wider ${statusBadges[rawStatusKey] || 'bg-base-200 text-base-content'}`}>
                          {rawStatusKey === 'usage received' ? 'Used' : displayStatus || 'Pending'}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Box Frame */}
                    {isExpanded && (
                      <tr className="bg-base-50/20">
                        <td colSpan={9} className="p-4 border-l-2 border-primary bg-base-100/60">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            
                            {/* Left Section: Set Requirements & Special Requests Container */}
                            <div className="lg:col-span-5 space-y-4">
                              <div className="bg-base-100 p-3.5 rounded-xl border border-base-200 shadow-xs space-y-3">
                                <div>
                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-1.5">Requested Kit Inventory</h4>
                                  {requestedSetsArray.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {requestedSetsArray.map((set, idx) => (
                                        <span key={idx} className="bg-base-200 px-2 py-1 rounded font-mono text-[11px] border border-base-300 font-semibold">{set}</span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="italic opacity-40 font-mono text-[11px]">No sets requested.</p>
                                  )}
                                </div>
                                <div className="pt-2.5 border-t border-base-200">
                                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-1.5">
                                    Selected / Dispatched Sets (Interactive Reference Link)
                                  </h4>
                                  {booking.RelatedBookingSets && booking.RelatedBookingSets.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-1.5">
                                        {booking.RelatedBookingSets.map((set: any, idx: number) => {
                                          const activePhotosArray = [
                                            set.Photo1, set.Photo2, set.Photo3,
                                            set.Photo4, set.Photo5, set.Photo6, set.Photo7
                                          ].filter(Boolean);
                                          const isActive = selectedSetTabs[booking.BookingID] === set.SetID;

                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => {
                                                setSelectedSetTabs(prev => ({
                                                  ...prev,
                                                  [booking.BookingID]: isActive ? null : set.SetID
                                                }));
                                              }}
                                              className={`text-left px-2.5 py-1.5 rounded font-mono text-[11px] border font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                                isActive
                                                  ? 'bg-primary text-primary-content border-primary'
                                                  : 'bg-info/10 hover:bg-info/20 text-info border-info/20'
                                              }`}
                                            >
                                              📦 {set.SetID}
                                              <span className="text-[9px] opacity-70 font-medium">({activePhotosArray.length} 📷)</span>
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {selectedSetTabs[booking.BookingID] && (() => {
                                        const selectedSet = booking.RelatedBookingSets.find((item: any) => item.SetID === selectedSetTabs[booking.BookingID]);
                                        if (!selectedSet) return null;

                                        const selectedPhotos = [
                                          selectedSet.Photo1,
                                          selectedSet.Photo2,
                                          selectedSet.Photo3,
                                          selectedSet.Photo4,
                                          selectedSet.Photo5,
                                          selectedSet.Photo6,
                                          selectedSet.Photo7,
                                        ].filter((photo): photo is string => Boolean(photo)).map((photo) => buildBookingSetImageUrl(photo));

                                        return (
                                          <div className="rounded-lg border border-base-200 bg-base-50/60 p-3 space-y-3">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <p className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black">Set Photo Preview</p>
                                                <Link
                                                  href={`/sets?setId=${encodeURIComponent(selectedSet.SetID)}`}
                                                  className="font-mono text-xs font-bold text-primary underline-offset-2 hover:underline"
                                                >
                                                  {selectedSet.SetID}
                                                </Link>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setSelectedSetTabs(prev => ({ ...prev, [booking.BookingID]: null }))}
                                                className="text-[10px] font-mono font-bold text-base-content/60 hover:text-base-content"
                                              >
                                                Close
                                              </button>
                                            </div>

                                            {selectedPhotos.length > 0 ? (
                                              <div className="grid grid-cols-2 gap-2">
                                                {selectedPhotos.map((photo, idx) => (
                                                  <a
                                                    key={`${selectedSet.SetID}-${idx}`}
                                                    href={photo}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-xs"
                                                  >
                                                    <img
                                                      src={photo}
                                                      alt={`Booking set preview ${idx + 1}`}
                                                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                  </a>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-[11px] italic opacity-40 font-mono">No photos attached to this set.</p>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <p className="italic opacity-40 font-mono text-[11px]">Pending delivery scans or missing child references.</p>
                                  )}
                                </div>
                              </div>

                              {/* Special Request Relocated Below Sets & Highlighted */}
                              <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl shadow-xs">
                                <h4 className="text-[10px] uppercase font-mono tracking-wider text-amber-700 font-black mb-1 flex items-center gap-1">
                                  ⚠️ Special Logistics Instructions
                                </h4>
                                <p className="text-amber-900 font-medium text-xs leading-relaxed select-all">
                                  {booking["Special Request"]?.trim() || "No custom handling/delivery requests appended to this surgical file."}
                                </p>
                              </div>
                            </div>

                            {/* Right Section: Individual MRN Tab Workspace */}
                            <div className="lg:col-span-7 bg-base-100 border border-base-200 rounded-xl p-4 shadow-xs flex flex-col">
                              <h4 className="text-[10px] uppercase font-mono tracking-wider text-base-content/50 font-black mb-2.5">
                                Select Patient Record File Partition
                              </h4>

                              {/* MRN Navigation Tab List */}
                              <div className="flex flex-wrap gap-1.5 border-b border-base-200 pb-2 mb-3">
                                {booking.PatientUsages.map((pu) => {
                                  const isActive = activeMRNString === pu.MRN;
                                  return (
                                    <button
                                      key={pu.MRN}
                                      type="button"
                                      onClick={() => setSelectedMRNTabs(prev => ({ ...prev, [booking.BookingID]: pu.MRN }))}
                                      className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-all border ${
                                        isActive 
                                          ? 'bg-primary text-primary-content border-primary' 
                                          : 'bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300'
                                      }`}
                                    >
                                      📂 MRN: {pu.MRN}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Selected MRN Segment Pane */}
                              {activeUsageDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                                  
                                  {/* Itemized consumption ledger */}
                                  <div className="md:col-span-7 space-y-2">
                                    <div className="border-b border-base-200 pb-1.5">
                                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-base-content/50">Active MRN</p>
                                      <Link
                                        href={`/usages?mrn=${encodeURIComponent(activeMRNString || '')}`}
                                        className="text-sm font-black text-primary underline-offset-2 hover:underline"
                                      >
                                        {activeMRNString}
                                      </Link>
                                    </div>
                                    <h5 className="text-[10px] font-mono font-bold text-base-content/60 uppercase">Consumed Implant & Instrument Matrix</h5>
                                    {activeUsageDetails.Items.length > 0 ? (
                                      <div className="border border-base-200 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto">
                                        <table className="table table-compact w-full text-[11px]">
                                          <thead className="bg-base-50 font-mono text-[9px] uppercase border-b border-base-200 opacity-60">
                                            <tr>
                                              <th className="p-1.5">Code</th>
                                              <th className="p-1.5">Description</th>
                                              <th className="p-1.5 text-center">Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-base-100 font-medium">
                                            {activeUsageDetails.Items.map((itm: { ItemCode: string; Description: string; Quantity: number }, i: number) => (
                                              <tr key={i} className="hover:bg-base-50/50">
                                                <td className="p-1.5 font-mono text-primary font-bold">
                                                  <Link href={`/partsmaster?partNumber=${encodeURIComponent(itm.ItemCode || '')}`} className="hover:underline">
                                                    {itm.ItemCode}
                                                  </Link>
                                                </td>
                                                <td className="p-1.5 text-base-content/80 truncate max-w-[140px]">{itm.Description}</td>
                                                <td className="p-1.5 text-center font-mono font-bold bg-base-50/40">{itm.Quantity}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="p-6 text-center border border-dashed border-base-200 bg-base-50/40 rounded-lg italic text-base-content/40">
                                        No itemized quantities logged for this MRN index yet.
                                      </div>
                                    )}
                                  </div>

                                  {/* Verification view link frame */}
                                  <div className="md:col-span-5 flex flex-col justify-between">
                                    <div>
                                      <h5 className="text-[10px] font-mono font-bold text-base-content/60 uppercase mb-2">Usage Photo Verification</h5>
                                      {/* 📄 RESTRUCTURED PATIENT USAGE MATRIX SHEET LAYOUT CONTAINER */}
                                      {activeUsageDetails.PhotoUrl ? (
                                        <div className="flex flex-col gap-1.5 w-full sm:w-64 shrink-0">
                                          <span className="text-[9px] font-mono font-black uppercase tracking-wider text-base-content/40">
                                            Attached Verification Log Sheet
                                          </span>

                                          {/* 🌟 FIX: Updated box model to track standard A4 proportions tightly with zero cropping bounds */}
                                          <a
                                            href={activeUsageDetails.PhotoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group relative w-full aspect-[1/1.414] bg-base-200 border border-base-300 rounded-xl overflow-hidden hover:border-primary transition-all shadow-xs bg-radial from-base-100 to-base-200 flex items-center justify-center p-1"
                                          >
                                            <img
                                              src={activeUsageDetails.PhotoUrl}
                                              alt="Patient Usage Form Log"
                                              // 🌟 FIX: object-contain displays the full paper document sheet without slicing off margins
                                              className="w-full h-full object-contain group-hover:scale-101 transition-transform"
                                            />

                                            {/* Dynamic hover glass card overlay indicators */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                              <span className="bg-base-100 text-base-content text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg shadow-md border border-base-300 tracking-tight">
                                                🔍 Open Full Screen Document
                                              </span>
                                            </div>
                                          </a>
                                        </div>
                                      ) : (
                                        <div className="w-full sm:w-64 aspect-[1/1.414] shrink-0 border-2 border-dashed border-base-300 rounded-xl flex flex-col items-center justify-center bg-base-50/50 p-4 text-center">
                                          <span className="text-xl mb-1 opacity-30">📋</span>
                                          <span className="text-[10px] font-mono opacity-40 font-bold uppercase tracking-wider">No Usage Log Sheet</span>
                                          <span className="text-[9px] opacity-30 font-mono mt-0.5">Verification page not uploaded</span>
                                        </div>
                                      )}
                                    </div>

                                    {booking["Delivery Note"] && (
                                      <div className="mt-2 pt-2 border-t border-t-base-200">
                                        <a href={booking["Delivery Note Link"] || "#"} target="_blank" rel="noreferrer" className="text-primary font-bold underline font-mono text-[10px] block truncate hover:text-primary-focus">
                                          📄 Note: {booking["Delivery Note"]}
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              ) : (
                                <div className="text-center italic opacity-30 p-4 text-xs font-mono">
                                  Select an MRN to view clinical audit breakdown details.
                                </div>
                              )}

                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeRefView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end transition-opacity animate-fade-in">
          <div className="w-full max-w-2xl bg-base-100 h-full shadow-2xl p-6 overflow-y-auto flex flex-col border-l border-base-300">
            <div className="flex items-center justify-between border-b border-base-200 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
                  Relative View ➔ {activeRefView.type}
                </span>
                <h3 className="text-lg font-black text-base-content">{activeRefView.title}</h3>
              </div>
              <button 
                onClick={() => setActiveRefView(null)}
                className="btn btn-sm btn-circle btn-ghost font-bold text-base"
              >
                ✕
              </button>
            </div>

            {activeRefView.type === 'BookingSets' && (
              <div className="space-y-6 flex-1">
                {activeRefView.data.length === 0 ? (
                  <p className="text-xs font-mono opacity-50 italic">No associated sets configured for this booking catalog matrix.</p>
                ) : (
                  activeRefView.data.map((set: BookingSet, idx: number) => {
                    const availablePhotos = [
                      set.Photo1, set.Photo2, set.Photo3, 
                      set.Photo4, set.Photo5, set.Photo6, set.Photo7
                    ].filter(Boolean) as string[];

                    return (
                      <div key={idx} className="border border-base-200 bg-base-50/40 rounded-xl p-4 space-y-4">
                        <div className="flex justify-between items-center bg-base-100 p-2.5 rounded-lg border border-base-200">
                          <span className="font-mono font-black text-xs text-primary">{set.SetID}</span>
                          <span className="badge badge-sm font-mono font-bold uppercase tracking-wider bg-info/10 text-info border-info/20">
                            {set.Status || 'Allocated'}
                          </span>
                        </div>

                        <div>
                          <h5 className="text-[10px] font-mono uppercase font-black tracking-wide text-base-content/40 mb-2">
                            Tray Inspection Photos ({availablePhotos.length} / 7)
                          </h5>
                          {availablePhotos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {availablePhotos.map((photoFile, pIdx) => {
                                const imgUrl = buildBookingSetImageUrl(photoFile);
                                return (
                                  <a
                                    key={pIdx}
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group relative border border-base-300 rounded-lg overflow-hidden aspect-[4/3] bg-base-100 hover:border-primary transition-all shadow-xs block"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Tray Verification Frame ${pIdx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[8px] font-mono text-white p-1 font-bold text-center uppercase tracking-wider backdrop-blur-xs opacity-90">
                                      View Image #{pIdx + 1}
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-6 text-center border border-dashed border-base-300 rounded-lg text-xs italic opacity-40 font-mono bg-base-100">
                              No tray verification photo profiles uploaded to this set matrix.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeRefView.type === 'PartsMaster' && (
              <div className="space-y-4 font-mono text-xs">
                <p className="italic opacity-50">Fetching relational records matching item code entity...</p>
              </div>
            )}

          </div>
        </div>
      )}

      <SetDetailsDrawer set={drawerTargetSet as VirtualSet | null} isOpen={isSetDrawerOpen} onClose={() => setIsSetDrawerOpen(false)} />
    </div>
  );
}