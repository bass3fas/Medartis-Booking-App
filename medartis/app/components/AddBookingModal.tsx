// app/components/AddBookingModal.tsx
'use client';

import { useState, useTransition, useRef } from 'react';
import { addBookingAction } from '../actions/addBookingAction';

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserName: string;
  currentUserRole?: string;
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

export default function AddBookingModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserName,
  currentUserRole,
  salesPeople,
  hospitals,
}: AddBookingModalProps) {
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

  const isAdmin = (currentUserRole || '').trim().toLowerCase() === 'admin';
  const salespersonValue = currentUserName?.trim() || '';

  const handleSubmit = (formData: FormData) => {
    setError(null);

    const requestedSets = Array.from(formData.getAll('RequestedSets'));
    formData.delete('RequestedSets');
    formData.append('RequestedSets', requestedSets.join(', '));

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-base-300 bg-base-100 shadow-2xl">
        <form ref={formRef} action={handleSubmit}>
          <div className="border-b border-base-200 bg-gradient-to-r from-base-100 to-base-200/70 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  New booking
                </div>
                <h2 className="mt-3 text-xl font-black tracking-tight text-base-content">Create a surgical booking</h2>
                <p className="mt-1 text-sm text-base-content/70">Capture the case details clearly so the operation can be coordinated smoothly.</p>
              </div>
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-full" aria-label="Close dialog">
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
            {error && (
              <div className="alert alert-error mb-5 text-xs font-semibold text-error-content">
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-base-content">Booking owner</p>
                  <p className="text-xs text-base-content/60">The rep field is pre-filled from the signed-in user and can be adjusted by admins.</p>
                </div>
                <div className={`badge ${isAdmin ? 'badge-primary' : 'badge-ghost'}`}>
                  {isAdmin ? 'Admin editing enabled' : 'Read-only for your role'}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-control">
                  <label className="label-text pb-1 text-xs font-semibold">Salesperson</label>
                  {isAdmin ? (
                    <select name="Salesperson" className="select select-bordered select-sm w-full" required defaultValue={salespersonValue}>
                      <option disabled value="">Select rep</option>
                      {salesPeople.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-base-content">{salespersonValue || 'Signed-in user'}</p>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-base-content/50">Locked to your account</p>
                        </div>
                        <div className="badge badge-ghost">Read only</div>
                      </div>
                    </div>
                  )}
                  {!isAdmin && <input type="hidden" name="Salesperson" value={salespersonValue} />}
                </div>

                <div className="form-control">
                  <label className="label-text pb-1 text-xs font-semibold">Hospital</label>
                  <input
                    type="text"
                    name="Hospital"
                    placeholder="Enter hospital name"
                    className="input input-bordered input-sm w-full"
                    list="hospital-options"
                    required
                  />
                  <datalist id="hospital-options">
                    {hospitals.map((hospital) => (
                      <option key={hospital} value={hospital} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-base-content">Case details</p>
                  <p className="text-xs text-base-content/60">Core clinical and operational information.</p>
                </div>

                <div className="form-control">
                  <label className="label-text pb-1 text-xs font-semibold">Doctor</label>
                  <input type="text" name="Doctor" placeholder="Enter surgeon's name" className="input input-bordered input-sm w-full" required />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="form-control">
                    <label className="label-text pb-1 text-xs font-semibold">Case Date</label>
                    <input type="date" name="CaseDate" className="input input-bordered input-sm w-full" required defaultValue={getTomorrow()} />
                  </div>
                  <div className="form-control">
                    <label className="label-text pb-1 text-xs font-semibold">Case Time</label>
                    <input type="time" name="CaseTime" className="input input-bordered input-sm w-full" defaultValue="08:00" />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-base-content">Delivery timeline</p>
                    <p className="text-xs text-base-content/60">Set the requested delivery window.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="form-control">
                      <label className="label-text pb-1 text-xs font-semibold">Deliver Before (Date)</label>
                      <input type="date" name="DeliverBeforeDate" className="input input-bordered input-sm w-full" defaultValue={getToday()} />
                    </div>
                    <div className="form-control">
                      <label className="label-text pb-1 text-xs font-semibold">Deliver Before (Time)</label>
                      <input type="time" name="DeliverBeforeTime" className="input input-bordered input-sm w-full" defaultValue="17:00" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-base-content">Case setup</p>
                    <p className="text-xs text-base-content/60">Choose the case type and requested sets.</p>
                  </div>

                  <div className="form-control">
                    <label className="label-text pb-1 text-xs font-semibold">Type</label>
                    <select name="Type" className="select select-bordered select-sm w-full" defaultValue="">
                      <option value="">Standard</option>
                      <option value="Demo">Demo</option>
                      <option value="Removal">Removal</option>
                      <option value="LONGTERM">Long Term</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </div>

                  <div className="form-control mt-4">
                    <label className="label-text pb-1 text-xs font-semibold">Requested Sets</label>
                    <select name="RequestedSets" className="select select-bordered min-h-28 w-full" multiple>
                      {SET_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-base-200 bg-base-50 p-4">
              <div className="form-control">
                <label className="label-text pb-1 text-xs font-semibold">Special Request</label>
                <textarea name="SpecialRequest" className="textarea textarea-bordered min-h-24 text-sm" placeholder="Any special instructions..."></textarea>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-200 bg-base-100/90 px-6 py-4">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost font-semibold" disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-primary font-semibold" disabled={isPending}>
              {isPending ? <span className="loading loading-spinner loading-xs"></span> : 'Save Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}