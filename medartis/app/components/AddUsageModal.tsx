'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { addBookingUsageAction } from '../actions/addUsageAction';
import type { EnhancedBooking } from '../actions/getBookingsAction';
import { fetchTraysAndUsageForSet, type EnrichedTray, type VirtualSet } from '../actions/getSetsAction';

interface AddUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: EnhancedBooking | null;
  availableSets: VirtualSet[];
  initialSetId?: string;
}

interface UsageItem {
  id: number;
  trayId: string;
  partNumber: string;
  itemId: string;
  description: string;
  qtyUsed: number;
  qtyRefilled: number;
}

const splitCommaValue = (value?: string) => (value || '').split(',').map((value) => value.trim()).filter(Boolean);

export default function AddUsageModal({ isOpen, onClose, onSuccess, booking, availableSets, initialSetId }: AddUsageModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoadingSet, setIsLoadingSet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [nextId, setNextId] = useState(1);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [trays, setTrays] = useState<EnrichedTray[]>([]);
  const [selectedMrn, setSelectedMrn] = useState('');
  const [newMrn, setNewMrn] = useState('');

  const patientMRNOptions = useMemo(() => Array.from(new Set([
    ...splitCommaValue(booking?.['Patient MRN']),
    ...(booking?.PatientUsages.map((usage) => usage.MRN).filter(Boolean) || []),
  ])), [booking]);
  const setOptions = useMemo(() => Array.from(new Set([
    ...(booking?.RelatedBookingSets.map((set) => set.SetID).filter(Boolean) || []),
  ])).map((setId) => availableSets.find((set) => set.SetID === setId)).filter((set): set is VirtualSet => Boolean(set)), [booking, availableSets]);

  useEffect(() => {
    if (!isOpen) return;
    const defaultSetId = initialSetId || setOptions[0]?.SetID || '';
    setSelectedSetId(defaultSetId);
    setSelectedMrn(patientMRNOptions[0] || '');
    setNewMrn('');
    setUsageItems([]);
    setNextId(1);
    setError(null);
  }, [isOpen, initialSetId, patientMRNOptions, setOptions]);

  useEffect(() => {
    if (!isOpen || !selectedSetId) {
      setTrays([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSet(true);
    setTrays([]);
    setUsageItems([]);
    fetchTraysAndUsageForSet(selectedSetId).then((result) => {
      if (cancelled) return;
      if (result.success) setTrays(result.trays);
      else setError(result.error || 'Could not load trays for the selected set.');
      setIsLoadingSet(false);
    });
    return () => { cancelled = true; };
  }, [isOpen, selectedSetId]);

  const handleAddItem = () => {
    setUsageItems((items) => [...items, { id: nextId, trayId: '', partNumber: '', itemId: '', description: '', qtyUsed: 1, qtyRefilled: 0 }]);
    setNextId((id) => id + 1);
  };

  const handleItemChange = (id: number, field: keyof UsageItem, value: string | number) => {
    setUsageItems((items) => items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'trayId') Object.assign(updated, { partNumber: '', itemId: '', description: '' });
      if (field === 'partNumber') {
        const part = trays.find((tray) => tray.TrayID === updated.trayId)?.contents.find((content) => content.PartNumber === value);
        if (part) Object.assign(updated, { itemId: part.ItemID, description: part.Description || '' });
      }
      return updated;
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const patientMRN = newMrn.trim() || selectedMrn;
    if (!booking || !selectedSetId || !patientMRN) return setError('Choose a set and enter or select a patient MRN.');
    if (!usageItems.length || usageItems.some((item) => !item.trayId || !item.partNumber || item.qtyUsed <= 0)) return setError('Add at least one complete part-number entry.');
    const formData = new FormData(event.currentTarget);
    formData.set('BookingID', booking.BookingID);
    formData.set('SetID', selectedSetId);
    formData.set('PatientMRN', patientMRN);
    formData.set('Hospital', booking.Hospital || '');
    formData.set('usage_items', JSON.stringify(usageItems));
    startTransition(async () => {
      const result = await addBookingUsageAction(formData);
      if (result.success) { onSuccess(); onClose(); }
      else setError(result.error || 'Unable to save usage.');
    });
  };

  if (!isOpen || !booking) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between border-b border-base-200 bg-base-100 px-7 py-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Usage entry</p><h2 className="mt-1 text-2xl font-black tracking-tight">Record case usage</h2><p className="mt-1 text-sm text-base-content/60">Booking <span className="font-mono font-semibold text-base-content">{booking.BookingID}</span></p></div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close dialog">✕</button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto bg-base-50/50 px-7 py-6">
          {error && <div className="alert alert-error mb-4 text-xs"><span>{error}</span></div>}
          <section className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div className="mb-4"><h3 className="text-sm font-black">Case details</h3><p className="text-xs text-base-content/55">Identify the patient, set, and usage sheet.</p></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Patient MRN</span><select className="select select-bordered" value={selectedMrn} onChange={(event) => setSelectedMrn(event.target.value)}><option value="">Choose existing MRN</option>{patientMRNOptions.map((mrn) => <option key={mrn} value={mrn}>{mrn}</option>)}</select></label>
              <label className="form-control"><span className="label-text mb-1 text-xs font-bold">New patient MRN</span><input className="input input-bordered" value={newMrn} onChange={(event) => setNewMrn(event.target.value)} placeholder="Add new MRN" /></label>
              <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Used set</span><select className="select select-bordered" value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} required><option value="">Choose set</option>{setOptions.map((set) => <option key={set.SetID} value={set.SetID}>{set.SetID}</option>)}</select></label>
              <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Usage date</span><input type="date" name="Date" className="input input-bordered" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
            </div>
            <label className="form-control mt-4"><span className="label-text mb-1 text-xs font-bold">Usage sheet</span><input type="url" name="Photo" className="input input-bordered" placeholder="Paste an uploaded usage-sheet link (optional)" /></label>
          </section>
          <section className="mt-5 rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">Consumed parts</h3><p className="text-xs text-base-content/55">Select a tray, then choose each part number used.</p></div><button type="button" onClick={handleAddItem} disabled={!selectedSetId || isLoadingSet} className="btn btn-primary btn-sm">+ Add part</button></div>
            {isLoadingSet && <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md text-primary" /></div>}
            {!isLoadingSet && !usageItems.length && <div className="mt-4 rounded-lg border border-dashed border-base-300 bg-base-50 px-4 py-8 text-center text-sm text-base-content/50">No parts added yet.</div>}
            <div className="mt-4 space-y-3">{usageItems.map((item, index) => {
              const tray = trays.find((candidate) => candidate.TrayID === item.trayId);
              return <div key={item.id} className="grid gap-3 rounded-lg border border-base-200 bg-base-50 p-4 md:grid-cols-[32px_1fr_1fr_90px_90px_32px] md:items-end"><span className="hidden pb-2 text-xs font-bold text-base-content/40 md:block">{index + 1}</span><label className="form-control"><span className="label-text mb-1 text-[11px] font-bold">Tray</span><select value={item.trayId} onChange={(event) => handleItemChange(item.id, 'trayId', event.target.value)} className="select select-bordered select-sm"><option value="">Select tray</option>{trays.map((tray) => <option key={tray.TrayID} value={tray.TrayID}>{tray.TrayName} ({tray.TrayID})</option>)}</select></label><label className="form-control"><span className="label-text mb-1 text-[11px] font-bold">Part number</span><select value={item.partNumber} onChange={(event) => handleItemChange(item.id, 'partNumber', event.target.value)} className="select select-bordered select-sm" disabled={!tray}><option value="">Select part</option>{tray?.contents.map((part) => <option key={part.ItemID} value={part.PartNumber}>{part.PartNumber} — {part.Description}</option>)}</select></label><label className="form-control"><span className="label-text mb-1 text-[11px] font-bold">Used</span><input type="number" min="1" value={item.qtyUsed} onChange={(event) => handleItemChange(item.id, 'qtyUsed', Number(event.target.value))} className="input input-bordered input-sm" /></label><label className="form-control"><span className="label-text mb-1 text-[11px] font-bold">Refilled</span><input type="number" min="0" value={item.qtyRefilled} onChange={(event) => handleItemChange(item.id, 'qtyRefilled', Number(event.target.value))} className="input input-bordered input-sm" /></label><button type="button" onClick={() => setUsageItems((items) => items.filter((usage) => usage.id !== item.id))} className="btn btn-ghost btn-sm btn-square text-error" aria-label="Remove part">✕</button></div>;
            })}</div>
          </section>
          <section className="mt-5 rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm"><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Usage notes</span><textarea name="Notes" className="textarea textarea-bordered min-h-20" placeholder="Optional notes for this usage entry" /></label></section>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-base-200 bg-base-100 px-7 py-4"><button type="button" onClick={onClose} className="btn btn-ghost" disabled={isPending}>Cancel</button><button type="submit" className="btn btn-primary px-6" disabled={isPending || isLoadingSet || !usageItems.length}>{isPending ? <span className="loading loading-spinner loading-xs" /> : 'Save usage'}</button></div>
      </form>
    </div>
  </div>;
}
