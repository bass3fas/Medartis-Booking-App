'use client';

import { useMemo, useState } from 'react';
import type { EnhancedBooking } from '../actions/getBookingsAction';

interface Props { bookings: EnhancedBooking[]; onClose: () => void; onSelect: (booking: EnhancedBooking) => void; }

export default function SelectBookingForUsageModal({ bookings, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => bookings.filter((booking) => `${booking.BookingID} ${booking.Hospital} ${booking.Doctor}`.toLowerCase().includes(query.toLowerCase())).slice(0, 40), [bookings, query]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="w-full max-w-xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl"><div className="flex items-start justify-between border-b border-base-200 px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">New usage</p><h2 className="mt-1 text-xl font-black">Choose booking</h2><p className="mt-1 text-sm text-base-content/55">Usage will be recorded against the selected booking.</p></div><button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">✕</button></div><div className="p-6"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="input input-bordered w-full" placeholder="Search booking ID, hospital, or doctor" /><div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{filtered.map((booking) => <button key={booking.BookingID} type="button" onClick={() => onSelect(booking)} className="w-full rounded-xl border border-base-200 bg-base-100 p-4 text-left transition hover:border-primary hover:bg-primary/5"><span className="font-mono text-sm font-black text-primary">{booking.BookingID}</span><span className="ml-3 text-xs font-semibold">{booking.Hospital}</span><span className="mt-1 block text-xs text-base-content/55">{booking.Doctor} · {booking.CaseDate}</span></button>)}{filtered.length === 0 && <p className="py-8 text-center text-sm text-base-content/50">No bookings found.</p>}</div></div></div></div>;
}
