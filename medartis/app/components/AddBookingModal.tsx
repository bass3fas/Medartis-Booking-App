// app/components/AddBookingModal.tsx
'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { addBookingAction } from '../actions/addBookingAction';

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  salesPeople: string[];
  hospitals: string[];
}

const SET_OPTIONS = [
  'ANKLE 2.8/3.5',
  'CLAVICLE 2.8',
  'CCS 1.7',
  'CCS 2.2/3.0',
  'CCS 4.0',
];

export default function AddBookingModal({ isOpen, onClose, onSuccess, salesPeople, hospitals }: AddBookingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const getTomorrow = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    // Handle multi-select for RequestedSets
    const requestedSets = Array.from(formData.getAll('RequestedSets'));
    formData.delete('RequestedSets'); // remove original entries
    formData.append('RequestedSets', requestedSets.join(', ')); // add comma-separated string

    startTransition(async () => {
      const result = await addBookingAction(formData);
      if (result.success) {
        onSuccess();
        onClose();
        formRef.current?.reset();
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-3xl border border-base-300">
        <form action={handleSubmit}>
          <div className="p-6 border-b border-base-200">
            <h2 className="text-lg font-black tracking-tight">Add New Surgical Booking</h2>
            <p className="text-xs text-base-content/60 font-mono">Enter the details for the new case file.</p>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            {error && (
              <div className="alert alert-error text-xs font-semibold text-error-content">
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Salesperson */}
              <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Salesperson</label>
                <select name="Salesperson" className="select select-bordered select-sm" required defaultValue="">
                  <option disabled value="">Select Rep</option>
                  {salesPeople.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Hospital */}
              <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Hospital</label>
                <input type="text" name="Hospital" placeholder="Enter hospital name" className="input input-bordered input-sm" required />
              </div>
            </div>
            {/* Doctor */}
            <div className="form-control">
              <label className="label-text font-bold text-xs pb-1">Doctor</label>
              <input type="text" name="Doctor" placeholder="Enter surgeon's name" className="input input-bordered input-sm" required />
            </div>
            {/* Case Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Case Date</label>
                <input type="date" name="CaseDate" className="input input-bordered input-sm" required defaultValue={getTomorrow()} />
              </div>
              <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Case Time</label>
                <input type="time" name="CaseTime" className="input input-bordered input-sm" defaultValue="08:00" />
              </div>
            </div>
            {/* Deliver Before Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Deliver Before (Date)</label>
                <input type="date" name="DeliverBeforeDate" className="input input-bordered input-sm" defaultValue={getToday()} />
              </div>
              <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Deliver Before (Time)</label>
                <input type="time" name="DeliverBeforeTime" className="input input-bordered input-sm" defaultValue="17:00" />
              </div>
            </div>
             {/* Type */}
             <div className="form-control">
                <label className="label-text font-bold text-xs pb-1">Type</label>
                <select name="Type" className="select select-bordered select-sm" defaultValue="">
                  <option value="">Standard</option>
                  <option value="Demo">Demo</option>
                  <option value="Removal">Removal</option>
                  <option value="LONGTERM">Long Term</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
            {/* Requested Sets */}
            <div className="form-control">
              <label className="label-text font-bold text-xs pb-1">Requested Sets</label>
              <select name="RequestedSets" className="select select-bordered select-sm" multiple>
                {SET_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            {/* Special Request */}
            <div className="form-control">
              <label className="label-text font-bold text-xs pb-1">Special Request</label>
              <textarea name="SpecialRequest" className="textarea textarea-bordered text-xs" placeholder="Any special instructions..."></textarea>
            </div>
          </div>

          <div className="p-4 bg-base-200/50 border-t border-base-200 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost font-bold" disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-primary font-bold" disabled={isPending}>
              {isPending ? <span className="loading loading-spinner loading-xs"></span> : 'Save Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}