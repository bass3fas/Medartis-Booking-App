'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { deleteBookingAction, EditableBooking, updateBookingAction } from '../actions/bookingMutationsAction';

export interface BookingSetOption {
  SetID: string;
  SetName: string;
  computedStatus?: string;
  LoanType?: string;
}

interface EditBookingModalProps {
  booking: EditableBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserName: string;
  currentUserRole: string;
  salesPeople: string[];
  hospitals: string[];
  availableSets: BookingSetOption[];
}

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Delivered', 'Used', 'Usage Received', 'Returned', 'Canceled'];
const TYPE_OPTIONS = ['', 'Demo', 'Removal', 'LONGTERM', 'Canceled'];
const REQUESTED_SET_OPTIONS = [
  'ANKLE 2.8/3.5',
  'CLAVICLE 2.8',
  'CCS 1.7',
  'CCS 2.2 / 3.0',
  'CCS SPEEDTIP 4.0',
  'CCS HEADED 4.0',
  'CCS SPEEDTIP 5.0',
  'CCS HEADED 5.0',
  'CCS SPEEDTIP 7.0',
  'DISTAL RADIUS 2.5',
  'ULNA SHORTENING 2.5',
  'ELBOW 2.8',
  'CORONOID AND RADIAL HEAD 2.0',
  'FOREARM SHAFT 2.8',
  'FOOT FORE AND MID 2.8',
  'FOOT MID AND HIND 2.8/3.5',
  'Hand 1.2/1.5-2.0/2.3',
  'SCAPHOID',
  'Hand Arthrodesis 2.0/2.3',
  'KERI TOUCH',
  'KERI FLEX',
  'DISTAL RADIUS ARTHRODESIS',
  'DISTAL RADIUS ULNA & RIM',
  'DISTAL RADIUS DORSAL & XL',
  'Modus MidFace',
  'Modus Mandible',
  'Modus Transbuccle',
  'Modus Orbital Floor',
  'MODUS IMF',
  'DIMEDA WIRES AND ARCH BARS',
  'CCS 3.A Long Screws Short thread',
  'CCS 3.A Long Screws Long thread',
  
].map(name => ({ SetID: name, SetName: name })).sort((a, b) => a.SetName.localeCompare(b.SetName));

function normalizeRole(role: string) {
  return role.trim().toLowerCase();
}

function splitCommaValue(value?: string) {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeDateInput(value?: string) {
  const raw = (value || '').trim();
  if (!raw || raw === '—') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function normalizeTimeInput(value?: string) {
  const raw = (value || '').trim();
  if (!raw || raw === '—') return '';
  const direct = raw.match(/^(\d{1,2}):(\d{2})/);
  if (direct) return `${direct[1].padStart(2, '0')}:${direct[2]}`;
  const amPm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (amPm) {
    let hours = Number(amPm[1]);
    const minutes = amPm[2] || '00';
    const meridiem = amPm[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return '';
}

function splitDeliverBefore(value?: string) {
  const trimmed = (value || '').trim();
  if (!trimmed) return { date: '', time: '' };
  const [date = '', time = ''] = trimmed.split(/\s+/, 2);
  return { date: normalizeDateInput(date), time: normalizeTimeInput(time) };
}

function setBadgeClasses(option?: BookingSetOption) {
  const status = (option?.computedStatus || '').toLowerCase();
  const loanType = (option?.LoanType || '').toLowerCase();
  if (loanType.includes('long') || status.includes('long')) return 'border-orange-300 bg-orange-50 text-orange-700';
  if (status === 'booked') return 'border-red-300 bg-red-50 text-red-700';
  return 'border-green-300 bg-green-50 text-green-700';
}

function setStatusLabel(option?: BookingSetOption) {
  const loanType = (option?.LoanType || '').toLowerCase();
  if (loanType.includes('long')) return 'Long Term';
  return option?.computedStatus || 'Free';
}

function MultiSetSelect({ label, name, disabled, selected, onChange, options, mode }: { label: string; name: string; disabled?: boolean; selected: string[]; onChange: (value: string[]) => void; options: BookingSetOption[]; mode: 'name' | 'id'; }) {
  const [isOpen, setIsOpen] = useState(false);
  const optionLabel = (option: BookingSetOption) => mode === 'name' ? `${option.SetName || option.SetID}` : `${option.SetID} — ${option.SetName || 'Unnamed set'}`;
  const optionValue = (option: BookingSetOption) => mode === 'name' ? (option.SetName || option.SetID) : option.SetID;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  return (
    <div className="form-control sm:col-span-2">
      <span className="label-text pb-1 text-xs font-semibold">{label}</span>
      <input type="hidden" name={name} value={selected.join(', ')} />
      <div className="relative">
        <button type="button" disabled={disabled} onClick={() => setIsOpen((value) => !value)} className="min-h-11 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-left text-sm shadow-sm disabled:bg-base-200 disabled:text-base-content/40">
          <div className="flex flex-wrap gap-1.5">
            {selected.length === 0 ? <span className="text-base-content/40">Choose one or more sets...</span> : selected.map((value) => {
              const option = options.find((item) => optionValue(item) === value);
              return (
                <span key={value} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${setBadgeClasses(option)}`}>
                  {value}
                  <span role="button" tabIndex={0} className="rounded-full bg-current/10 px-1" onClick={(event) => { event.stopPropagation(); toggle(value); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') toggle(value); }}>×</span>
                </span>
              );
            })}
          </div>
        </button>
        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-base-200 bg-base-100 p-2 shadow-2xl">
            {options.length === 0 ? <div className="px-3 py-4 text-center text-xs font-mono opacity-40">No set options loaded.</div> : options.map((option) => {
              const value = optionValue(option);
              const checked = selected.includes(value);
              return (
                <label key={`${name}-${value}`} className={`mb-1 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-xs transition ${checked ? setBadgeClasses(option) : 'border-base-200 hover:bg-base-50'}`}>
                  <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={checked} onChange={() => toggle(value)} />
                  <span className="flex-1"><span className="block font-black">{optionLabel(option)}</span>{mode === 'id' && <span className="text-[10px] opacity-60">{setStatusLabel(option)}</span>}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditBookingModal({ booking, isOpen, onClose, onSuccess, currentUserName, currentUserRole, salesPeople, hospitals, availableSets }: EditBookingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requestedSets, setRequestedSets] = useState(() => splitCommaValue(booking?.['Requested Sets']));
  const formRef = useRef<HTMLFormElement>(null);
  const role = normalizeRole(currentUserRole || '');
  const isAdmin = role === 'admin';
  const canDelete = isAdmin;
  const canEditFullForm = isAdmin || role === 'sales';
  const { date: deliverBeforeDate, time: deliverBeforeTime } = splitDeliverBefore(booking?.['Deliver Before']);
  const caseDate = normalizeDateInput(booking?.CaseDate);
  const caseTime = normalizeTimeInput(booking?.CaseTime);
  const [selectedSets, setSelectedSets] = useState(() => splitCommaValue(booking?.['Selected Sets']));
  const statusOptions = Array.from(new Set([booking?.Status || 'Pending', ...STATUS_OPTIONS].filter(Boolean)));
  const selectedOptions = useMemo(() => {
    const byId = new Map<string, BookingSetOption>();
    availableSets.forEach((set) => byId.set(set.SetID, set));
    selectedSets.forEach((id) => { if (!byId.has(id)) byId.set(id, { SetID: id, SetName: id }); });
    return Array.from(byId.values()).sort((a, b) => a.SetID.localeCompare(b.SetID));
  }, [availableSets, selectedSets]);

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
    formData.set('Requested Sets', requestedSets.join(', '));
    formData.set('Selected Sets', selectedSets.join(', '));
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
      <div className="w-full max-w-5xl overflow-hidden rounded-[30px] border border-base-300 bg-base-100 shadow-2xl">
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
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4"><h3 className="mb-4 text-sm font-bold">Core case details</h3><div className="grid gap-4 sm:grid-cols-2"><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Salesperson</span><select name="Salesperson" className="select select-bordered select-sm" defaultValue={booking.Salesperson} disabled={!isAdmin}>{salesPeople.concat(booking.Salesperson || []).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((person) => <option key={person} value={person}>{person}</option>)}</select></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Hospital</span><input name="Hospital" className="input input-bordered input-sm" defaultValue={booking.Hospital} list="edit-hospital-options" disabled={!canEditFullForm} required /></label><datalist id="edit-hospital-options">{hospitals.map((hospital) => <option key={hospital} value={hospital} />)}</datalist><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Doctor</span><input name="Doctor" className="input input-bordered input-sm" defaultValue={booking.Doctor} disabled={!canEditFullForm} required /></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Type</span><select name="Type" className="select select-bordered select-sm" defaultValue={booking.Type || ''} disabled={!canEditFullForm}>{TYPE_OPTIONS.map((type) => <option key={type || 'standard'} value={type}>{type || 'Standard'}</option>)}</select></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Case Date</span><input type="date" name="CaseDate" className="input input-bordered input-sm" defaultValue={caseDate} disabled={!canEditFullForm} required /></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Case Time</span><input type="time" name="CaseTime" className="input input-bordered input-sm" defaultValue={caseTime} disabled={!canEditFullForm} /></label></div></section>
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4"><h3 className="mb-4 text-sm font-bold">Warehouse workflow</h3><div className="grid gap-4 sm:grid-cols-2"><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Status</span><select name="Status" className="select select-bordered select-sm" defaultValue={booking.Status || 'Pending'}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Driver</span><input name="Driver" className="input input-bordered input-sm" defaultValue={booking.Driver || ''} disabled={!canEditFullForm} /></label><MultiSetSelect label="Selected Sets" name="Selected Sets" selected={selectedSets} onChange={setSelectedSets} options={selectedOptions} mode="id" /></div></section>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4"><h3 className="mb-4 text-sm font-bold">Delivery and requested sets</h3><div className="grid gap-4 sm:grid-cols-2"><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Deliver Before Date</span><input type="date" name="DeliverBeforeDate" className="input input-bordered input-sm" defaultValue={deliverBeforeDate} disabled={!canEditFullForm} /></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Deliver Before Time</span><input type="time" name="DeliverBeforeTime" className="input input-bordered input-sm" defaultValue={deliverBeforeTime} disabled={!canEditFullForm} /></label><MultiSetSelect label="Requested Sets" name="Requested Sets" disabled={!canEditFullForm} selected={requestedSets} onChange={setRequestedSets} options={REQUESTED_SET_OPTIONS} mode="name" /></div></section>
              <section className="rounded-2xl border border-base-200 bg-base-50 p-4"><h3 className="mb-4 text-sm font-bold">Patient and notes</h3><div className="grid gap-4 sm:grid-cols-2"><label className="form-control sm:col-span-2"><span className="label-text pb-1 text-xs font-semibold">Patient MRN(s)</span><input name="Patient MRN" className="input input-bordered input-sm" defaultValue={booking['Patient MRN'] || ''} placeholder="Separate multiple MRNs with commas" disabled={!canEditFullForm} /></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Delivery Note</span><input name="Delivery Note" className="input input-bordered input-sm" defaultValue={booking['Delivery Note'] || ''} disabled={!canEditFullForm} /></label><label className="form-control"><span className="label-text pb-1 text-xs font-semibold">Delivery Note Link</span><input name="Delivery Note Link" className="input input-bordered input-sm" defaultValue={booking['Delivery Note Link'] || ''} disabled={!canEditFullForm} /></label><label className="form-control sm:col-span-2"><span className="label-text pb-1 text-xs font-semibold">Special Request</span><textarea name="Special Request" className="textarea textarea-bordered min-h-24" defaultValue={booking['Special Request'] || ''} disabled={!canEditFullForm} /></label></div></section>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4"><button type="button" onClick={handleDelete} className="btn btn-sm btn-error btn-outline rounded-xl font-bold" disabled={!canDelete || isPending}>Delete Booking</button><div className="flex gap-3"><button type="button" onClick={onClose} className="btn btn-sm btn-ghost rounded-xl font-bold" disabled={isPending}>Cancel</button><button type="submit" className="btn btn-sm btn-primary rounded-xl px-5 font-bold" disabled={isPending}>{isPending ? <span className="loading loading-spinner loading-xs"></span> : 'Update Booking'}</button></div></div>
        </form>
      </div>
    </div>
  );
}
