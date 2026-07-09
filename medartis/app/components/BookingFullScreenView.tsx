// app/components/BookingFullScreenView.tsx
'use client';

import { EnhancedBooking } from '../actions/getBookingsAction';

interface FullScreenViewProps {
  booking: EnhancedBooking | null;
  onClose: () => void;
}

export default function BookingFullScreenView({ booking, onClose }: FullScreenViewProps) {
  if (!booking) return null;

  const detailItems = [
    { label: 'Booking ID', value: booking.BookingID },
    { label: 'Salesperson', value: booking.Salesperson },
    { label: 'Hospital', value: booking.Hospital },
    { label: 'Doctor', value: booking.Doctor },
    { label: 'Case Date', value: booking.CaseDate },
    { label: 'Case Time', value: booking.CaseTime },
    { label: 'Deliver Before', value: booking['Deliver Before'] },
    { label: 'Status', value: booking.Status },
    { label: 'Type', value: booking.Type },
    { label: 'Driver', value: booking.Driver },
    { label: 'Last Updated', value: booking['Last Updated'] },
  ];

  const textAreas = [
    { label: 'Special Request', value: booking['Special Request'] },
    { label: 'Requested Sets', value: booking['Requested Sets'] },
    { label: 'Selected Sets', value: booking['Selected Sets'] },
    { label: 'Delivery Note', value: booking['Delivery Note'] },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-base-100/95 backdrop-blur-lg p-4 sm:p-8 overflow-y-auto animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-base-300">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Booking Details</h1>
            <p className="font-mono text-primary font-bold">{booking.BookingID}</p>
          </div>
          <button onClick={onClose} className="btn btn-circle btn-ghost">✕</button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {detailItems.map(item => (
              <div key={item.label} className="bg-base-200/50 p-3 rounded-lg border border-base-300">
                <p className="text-base-content/50 uppercase font-bold tracking-wider text-[9px]">{item.label}</p>
                <p className="font-semibold text-sm break-words">{item.value || 'N/A'}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {textAreas.map(item => (
              <div key={item.label} className="bg-base-200/50 p-3 rounded-lg border border-base-300">
                <p className="text-base-content/50 uppercase font-bold tracking-wider text-[9px] mb-1">{item.label}</p>
                <p className="font-semibold text-sm whitespace-pre-wrap break-words">{item.value || 'N/A'}</p>
              </div>
            ))}
          </div>

          {booking['Delivery Note Link'] && (
            <div className="bg-base-200/50 p-3 rounded-lg border border-base-300">
              <p className="text-base-content/50 uppercase font-bold tracking-wider text-[9px] font-mono mb-1">Delivery Note Link</p>
              <a href={booking['Delivery Note Link']} target="_blank" rel="noreferrer" className="text-primary font-bold underline break-all text-sm">
                {booking['Delivery Note Link']}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}