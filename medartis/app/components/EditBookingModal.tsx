'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { deleteBookingAction, EditableBooking, updateBookingAction } from '../actions/bookingMutationsAction';

interface EditBookingModalProps {
  booking: EditableBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserName: string;
  currentUserRole: string;
  salesPeople: string[];
  hospitals: string[];
}

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Delivered', 'Used', 'Returned', 'Canceled'];
const TYPE_OPTIONS = ['', 'Demo', 'Removal', 'LONGTERM', 'Canceled'];

function splitDeliverBefore(value?: string) {
  const trimmed = (value || '').trim();
  if (!trimmed) return { date: '', time: '' };
  const [date = '', time = ''] = trimmed.split(/\s+/, 2);
  return { date, time: time.slice(0, 5) };
}

function normalizeRole(role: string) {
  return role.trim().toLowerCase();
}

export default function EditBookingModal({ booking, isOpen, onClose, onSuccess, currentUserName, currentUserRole, salesPeople, hospitals }: EditBookingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const role = normalizeRole(currentUserRole || '');
  const isAdmin = role === 'admin';
  const canDelete = isAdmin;
  const canEditFullForm = isAdmin || role === 'sales';
  const { date: deliverBeforeDate, time: deliverBeforeTime } = splitDeliverBefore(booking?.['Deliver Before']);

  const selectedSetHints = useMemo(() => {
    const fromRelated = booking?.RelatedBookingSets?.map((set) => set.SetID).filter(Boolean) || [];
    const fromField = booking?.['Selected Sets']?.split(',').map((set) => set.trim()).filter(Boolean) || [];
    return Array.from(new Set([...fromField, ...fromRelated])).sort();
  }, [booking]);

  if (!isOpen || !booking) return null;

  const appendContext = (formData: FormData) => {
    formData.set('BookingID', booking.BookingID);
    formData.set('currentUserName', currentUserName || '');
    formData.set('currentUserRole', currentUserRole || '');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const deliveryDate = String(formData.get('DeliverBeforeDate') || '').trim();
    const deliveryTime = String(formData.get('DeliverBeforeTime') || '').trim();
    formData.delete('DeliverBeforeDate');
    formData.delete('DeliverBeforeTime');
    if (canEditFullForm) formData.set('Deliver Before', [deliveryDate, deliveryTime].filter(Boolean).join(' '));
    appendContext(formData);
    startTransition(async () => {
      const result = await updateBookingAction(formData);
      if (result.success) {
        onSuccess();
        onClose();
        formRef.current?.reset();
      } else {
        setError(result.error || 'Unable to update booking.');
      }
    });
  };

  const handleDelete = () => {
    if (!canDelete || !window.confirm(`Delete booking ${booking.BookingID}? This clears the row from the Bookings sheet.`)) return;
    setError(null);
    const formData = new FormData();
    appendContext(formData);
    startTransition(async () => {
      const result = await deleteBookingAction(formData);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Unable to delete booking.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[30px] border border-base-300 bg-base-100 shadow-2xl">
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="border-b border-base-200 bg-gradient-to-r from-base-100 to-base-200/70 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="badge badge-primary badge-outline font-mono uppercase tracking-widest">Edit booking</div>
                <h2 className="mt-3 text-xl font-black tracking-tight text-base-content">{booking.BookingID}</h2>
                <p className="mt-1 text-sm text-base-content/70">{role === 'warehouse' ? 'Warehouse users can update only status and selected sets.' : 'Update booking details and operational notes.'}</p>
              </div>
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-full" aria-label="Close dialog">✕</button>
            </div>
          </div>
          <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
            {error && <div className="alert alert-error mb-5 text-xs font-semibold text-error-content"><span>{error}</span></div>}
            <input type="hidden" name="BookingID" value={booking.BookingID} />
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <h3 className="mb-4 text-sm font-bold">Core case details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Salesperson</span><select name="Salesperson" className="select select-bordered select-sm" defaultValue={booking.Salesperson} disabled={!isAdmin}>{salesPeople.concat(booking.Salesperson || []).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((person) => <option key={person} value={person}>{person}</option>)}</select></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Hospital</span><input name="Hospital" className="input input-bordered input-sm" defaultValue={booking.Hospital} list="edit-hospital-options" disabled={!canEditFullForm} required /></label>
                  <datalist id="edit-hospital-options">{hospitals.map((hospital) => <option key={hospital} value={hospital} />)}</datalist>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Doctor</span><input name="Doctor" className="input input-bordered input-sm" defaultValue={booking.Doctor} disabled={!canEditFullForm} required /></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Type</span><select name="Type" className="select select-bordered select-sm" defaultValue={booking.Type || ''} disabled={!canEditFullForm}>{TYPE_OPTIONS.map((type) => <option key={type || 'standard'} value={type}>{type || 'Standard'}</option>)}</select></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Case Date</span><input type="date" name="CaseDate" className="input input-bordered input-sm" defaultValue={booking.CaseDate} disabled={!canEditFullForm} required /></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Case Time</span><input type="time" name="CaseTime" className="input input-bordered input-sm" defaultValue={booking.CaseTime} disabled={!canEditFullForm} /></label>
                </div>
              </section>
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <h3 className="mb-4 text-sm font-bold">Warehouse workflow</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Status</span><select name="Status" className="select select-bordered select-sm" defaultValue={booking.Status || 'Pending'}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Driver</span><input name="Driver" className="input input-bordered input-sm" defaultValue={booking.Driver || ''} disabled={!canEditFullForm} /></label>
                  <label className="form-control sm:col-span-2"><span className="label-text pb-1 text-xs font-semibold">Selected Sets</span><input name="Selected Sets" className="input input-bordered input-sm" defaultValue={booking['Selected Sets'] || ''} placeholder="Comma-separated dispatched set IDs" list="selected-set-hints" /></label>
                  <datalist id="selected-set-hints">{selectedSetHints.map((set) => <option key={set} value={set} />)}</datalist>
                </div>
              </section>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <h3 className="mb-4 text-sm font-bold">Delivery and requested sets</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Deliver Before Date</span><input type="date" name="DeliverBeforeDate" className="input input-bordered input-sm" defaultValue={deliverBeforeDate} disabled={!canEditFullForm} /></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Deliver Before Time</span><input type="time" name="DeliverBeforeTime" className="input input-bordered input-sm" defaultValue={deliverBeforeTime} disabled={!canEditFullForm} /></label>
                  <label className="form-control sm:col-span-2"><span className="label-text pb-1 text-xs font-semibold">Requested Sets</span><input name="Requested Sets" className="input input-bordered input-sm" defaultValue={booking['Requested Sets'] || ''} disabled={!canEditFullForm} /></label>
                </div>
              </section>
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <h3 className="mb-4 text-sm font-bold">Patient and notes</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Patient MRN</span><input name="Patient MRN" className="input input-bordered input-sm" defaultValue={booking['Patient MRN'] || ''} disabled={!canEditFullForm} /></label>
                  <label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Delivery Note</span><input name="Delivery Note" className="input input-bordered input-sm" defaultValue={booking['Delivery Note'] || ''} disabled={!canEditFullForm} /></label>
                  <label className="form-control sm:col-span-2"><span className="label-text pb-1 text-xs font-semibold">Delivery Note Link</span><input name="Delivery Note Link" className="input input-bordered input-sm" defaultValue={booking['Delivery Note Link'] || ''} disabled={!canEditFullForm} /></label>
                  <label className="form-control sm:col-span-2"><span className="label-text pb-1 text-xs font-semibold">Special Request</span><textarea name="Special Request" className="textarea textarea-bordered min-h-24" defaultValue={booking['Special Request'] || ''} disabled={!canEditFullForm} /></label>
                </div>
              </section>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4">
            <button type="button" onClick={handleDelete} className="btn btn-sm btn-error btn-outline rounded-xl font-bold" disabled={!canDelete || isPending}>Delete Booking</button>
            <div className="flex gap-3"><button type="button" onClick={onClose} className="btn btn-sm btn-ghost rounded-xl font-bold" disabled={isPending}>Cancel</button><button type="submit" className="btn btn-sm btn-primary rounded-xl px-5 font-bold" disabled={isPending}>{isPending ? <span className="loading loading-spinner loading-xs"></span> : 'Update Booking'}</button></div>
          </div>
        </form>
      </div>
    </div>
  );
}
