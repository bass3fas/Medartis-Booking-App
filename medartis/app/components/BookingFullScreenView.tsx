// app/components/BookingFullScreenView.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EnhancedBooking } from '../actions/getBookingsAction';
import { buildAppSheetImageUrl } from '../lib/appsheet-image-url';

interface FullScreenViewProps {
  booking: EnhancedBooking | null;
  onClose: () => void;
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-base-200/50 p-3 rounded-lg border border-base-300">
      <p className="text-base-content/50 uppercase font-bold tracking-wider text-[9px]">{label}</p>
      <div className="font-semibold text-sm break-words mt-0.5">{value || <span className="opacity-50">N/A</span>}</div>
    </div>
  );
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
    { label: 'Deliver Before', value: booking['Deliver Before'] || 'Not Specified' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 border-b border-base-200">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight truncate">Booking Details</h1>
            <p className="font-mono text-primary font-bold text-sm truncate">{booking.BookingID}</p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Core Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {detailItems.map(item => (
              <DetailItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          {/* Text Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {textAreas.map(item => (
              <div key={item.label} className="bg-base-200/50 p-4 rounded-lg border border-base-300">
                <p className="text-base-content/50 uppercase font-bold tracking-wider text-[9px] mb-1">{item.label}</p>
                <p className="font-semibold text-sm whitespace-pre-wrap break-words">{item.value || <span className="opacity-50">N/A</span>}</p>
              </div>
            ))}
          </div>

          {/* Related Booking Sets */}
          <div className="bg-base-50/40 border border-base-200 rounded-xl p-4">
            <h3 className="text-xs font-mono uppercase font-black tracking-wider text-base-content/60 mb-3">Related Booking Sets ({booking.RelatedBookingSets.length})</h3>
            {booking.RelatedBookingSets.length > 0 ? (
              <div className="space-y-4">
                {booking.RelatedBookingSets.map(set => {
                  const availablePhotos = [set.Photo1, set.Photo2, set.Photo3, set.Photo4, set.Photo5, set.Photo6, set.Photo7].filter(Boolean) as string[];
                  return (
                    <div key={set.SetID} className="bg-base-100 p-3 rounded-lg border border-base-300">
                      <div className="flex justify-between items-center mb-3">
                        <Link href={`/sets?setId=${encodeURIComponent(set.SetID)}`} className="font-mono font-bold text-primary text-sm hover:underline">{set.SetID}</Link>
                        <span className="badge badge-sm font-mono font-bold uppercase tracking-wider bg-info/10 text-info border-info/20">{set.Status || 'Allocated'}</span>
                      </div>
                      {availablePhotos.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-mono font-bold text-base-content/60 uppercase mb-2">Set Photos ({availablePhotos.length})</h5>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {availablePhotos.map((photoUrl, pIdx) => (
                              <a key={pIdx} href={photoUrl} target="_blank" rel="noreferrer" className="group block aspect-square bg-base-200 border border-base-300 rounded-md overflow-hidden hover:border-primary transition-all">
                                <img src={photoUrl} alt={`Set ${set.SetID} photo ${pIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs font-mono italic opacity-50 text-center py-4">No booking sets are associated with this record.</p>
            )}
          </div>

          {/* Patient Usages */}
          <div className="bg-base-50/40 border border-base-200 rounded-xl p-4">
            <h3 className="text-xs font-mono uppercase font-black tracking-wider text-base-content/60 mb-3">Patient Usages ({booking.PatientUsages.length})</h3>
            {booking.PatientUsages.length > 0 ? (
              <div className="space-y-4">
                {booking.PatientUsages.map(usage => (
                  <div key={usage.MRN} className="bg-base-100 border border-base-300 rounded-lg p-4">
                    <p className="font-mono font-bold text-primary text-base mb-3">MRN: {usage.MRN}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Consumed Items */}
                      <div>
                        <h5 className="text-[10px] font-mono font-bold text-base-content/60 uppercase mb-2">Consumed Items ({usage.Items.length})</h5>
                        {usage.Items.length > 0 ? (
                          <div className="border border-base-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            <table className="table table-compact w-full text-[11px]">
                              <thead className="bg-base-50 font-mono text-[9px] uppercase opacity-60">
                                <tr><th className="p-1.5">Code</th><th className="p-1.5">Description</th><th className="p-1.5 text-center">Qty</th></tr>
                              </thead>
                              <tbody className="divide-y divide-base-100 font-medium">
                                {usage.Items.map((item, i) => (
                                  <tr key={i}><td className="p-1.5 font-mono text-primary font-bold">{item.ItemCode}</td><td className="p-1.5">{item.Description}</td><td className="p-1.5 text-center font-mono font-bold">{item.Quantity}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-xs font-mono italic opacity-50">No items logged.</p>}
                      </div>
                      {/* Usage Photo */}
                      <div>
                        <h5 className="text-[10px] font-mono font-bold text-base-content/60 uppercase mb-2">Usage Photo</h5>
                        {usage.PhotoUrl ? (
                          <a href={usage.PhotoUrl} target="_blank" rel="noreferrer" className="group block w-full max-w-xs aspect-[1/1.414] bg-base-200 border border-base-300 rounded-lg overflow-hidden hover:border-primary transition-all">
                            <img src={usage.PhotoUrl} alt="Usage Log Sheet" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                          </a>
                        ) : <p className="text-xs font-mono italic opacity-50">No photo uploaded.</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono italic opacity-50 text-center py-4">No patient usage records found.</p>
            )}
          </div>

          {/* Delivery Note Link */}
          {booking['Delivery Note Link'] && (
            <div className="bg-base-200/50 p-4 rounded-lg border border-base-300">
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