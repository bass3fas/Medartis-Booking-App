// app/components/AddBookingModal.tsx
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
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
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTomorrow = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  const toggleSetSelection = (set: string) => {
    setSelectedSets((prev) =>
      prev.includes(set) ? prev.filter((item) => item !== set) : [...prev, set]
    );
  };

  const isAdmin = (currentUserRole || '').trim().toLowerCase() === 'admin';
  const salespersonValue = currentUserName?.trim() || '';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Cleanly pass our stateful sets selection array as a single comma-separated string
    formData.delete('RequestedSets');
    formData.append('RequestedSets', selectedSets.join(', '));

    startTransition(async () => {
      console.log('Sending structured layout to server...');
      const result = await addBookingAction(formData);
      
      console.log('Server Action Result:', result);

      if (result.success) {
        setSelectedSets([]); // Clear selected sets state tracking
        onSuccess();
        onClose();
        formRef.current?.reset();
      } else {
        console.error('Action Failed Error:', result.error);
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-base-300 bg-base-100 shadow-2xl">
        <form ref={formRef} onSubmit={handleSubmit}>
          
          {/* Modal Header */}
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

          {/* Modal Scrollable Container Body */}
          <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
            {error && (
              <div className="alert alert-error mb-5 text-xs font-semibold text-error-content">
                <span>{error}</span>
              </div>
            )}

            {/* Profile Assignment Section */}
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

            {/* Layout Flex Configuration Grid Splitter */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              
              {/* Surgical Case Details Column */}
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

              {/* Delivery Matrix Status Panel */}
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

                {/* Case Configuration Block */}
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

                  {/* Professional Checkbox Dropdown Component Layer */}
                  <div className="form-control mt-4" ref={dropdownRef}>
                    <label className="label-text pb-1 text-xs font-semibold">Requested Sets</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex min-h-[2.5rem] w-full items-center justify-between rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-left text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <div className="flex flex-wrap gap-1 max-w-[90%]">
                          {selectedSets.length === 0 ? (
                            <span className="text-base-content/40">Select instrument sets...</span>
                          ) : (
                            selectedSets.map((set) => (
                              <span key={set} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {set}
                              </span>
                            ))
                          )}
                        </div>
                        <span className={`text-xs text-base-content/50 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>

                      {/* Animated Dropdown Menu Overlays */}
                      {isDropdownOpen && (
                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-base-200 bg-base-100 p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                          {SET_OPTIONS.map((opt) => {
                            const isChecked = selectedSets.includes(opt);
                            return (
                              <label
                                key={opt}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-base-200/60 ${isChecked ? 'bg-primary/5 font-semibold text-primary' : 'text-base-content'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSetSelection(opt)}
                                  className="checkbox checkbox-primary checkbox-xs rounded"
                                />
                                <span className="flex-1 select-none">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Clinical & Delivery Notes Section */}
            <div className="mt-5 rounded-2xl border border-base-200 bg-base-50 p-5 transition-all duration-200 hover:border-base-300">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-base-content">Special Requests & Instructions</p>
                  <p className="text-xs text-base-content/60">Add clinical urgency modifiers, specific side constraints, or instrument configuration notes.</p>
                </div>
              </div>

              <div className="form-control mt-1">
                <textarea 
                  name="SpecialRequest" 
                  className="textarea textarea-bordered min-h-28 w-full rounded-xl bg-base-100 p-3 text-sm leading-relaxed shadow-inner transition-all placeholder:text-base-content/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" 
                  placeholder="e.g., Left-side orientation required, packing confirmation, or direct-to-theatre dispatch instructions..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Action Control Panel Footer */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 backdrop-blur-md">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-sm btn-ghost rounded-xl font-bold tracking-wide text-base-content/70 hover:bg-base-200" 
              disabled={isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-sm btn-primary rounded-xl px-5 font-bold tracking-wide shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
              disabled={isPending}
            >
              {isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="mr-1 h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Save Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}