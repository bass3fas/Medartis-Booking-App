'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { updateUsageAction } from '../actions/usageMutationsAction';
import { fetchTraysAndUsageForSet, type EnrichedTray } from '../actions/getSetsAction';
import type { EnhancedBooking } from '../actions/getBookingsAction';
import type { EnrichedUsage } from '../types/interfaces';

interface Props { usage: EnrichedUsage | null; booking: EnhancedBooking | null; currentUserRole: string; onClose: () => void; onSuccess: () => void; }
const split = (value?: string) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);
const inputDate = (value?: string) => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

export default function EditUsageModal({ usage, booking, currentUserRole, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [isLoadingTrays, setIsLoadingTrays] = useState(false);
  const [setId, setSetId] = useState('');
  const [trays, setTrays] = useState<EnrichedTray[]>([]);
  const [trayId, setTrayId] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const mrns = useMemo(() => Array.from(new Set([usage?.PatientMRN || '', ...split(booking?.['Patient MRN']), ...(booking?.PatientUsages.map((item) => item.MRN) || [])].filter(Boolean))), [booking, usage]);
  const sets = useMemo(() => Array.from(new Set([usage?.SetID || '', ...(booking?.RelatedBookingSets.map((item) => item.SetID) || [])].filter(Boolean))), [booking, usage]);
  const activeTray = trays.find((tray) => tray.TrayID === trayId);

  useEffect(() => {
    if (!usage) return;
    setSetId(usage.SetID || '');
    setTrayId(usage.TrayID || '');
    setPartNumber(usage.PartNumber || '');
    setError('');
  }, [usage]);

  useEffect(() => {
    if (!setId) { setTrays([]); return; }
    let cancelled = false;
    setIsLoadingTrays(true);
    fetchTraysAndUsageForSet(setId).then((result) => {
      if (cancelled) return;
      if (result.success) setTrays(result.trays);
      else setError(result.error || 'Could not load trays for this set.');
      setIsLoadingTrays(false);
    });
    return () => { cancelled = true; };
  }, [setId]);

  if (!usage) return null;
  const selectSet = (nextSetId: string) => { setSetId(nextSetId); setTrayId(''); setPartNumber(''); };
  const selectTray = (nextTrayId: string) => { setTrayId(nextTrayId); setPartNumber(''); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!setId || !trayId || !partNumber) return setError('Choose a set, tray, and part number.');
    const formData = new FormData(event.currentTarget);
    formData.set('UsageID', usage.UsageID);
    formData.set('currentUserRole', currentUserRole);
    formData.set('SetID', setId);
    formData.set('TrayID', trayId);
    formData.set('PartNumber', partNumber);
    startTransition(async () => { const result = await updateUsageAction(formData); if (result.success) { onSuccess(); onClose(); } else setError(result.error || 'Could not update usage.'); });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="w-full max-w-3xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
      <header className="flex items-start justify-between border-b border-base-200 bg-base-100 px-7 py-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Usage management</p><h2 className="mt-1 text-2xl font-black tracking-tight">Edit usage entry</h2><p className="mt-1 font-mono text-xs text-base-content/55">{usage.UsageID} · Booking {booking?.BookingID || usage.BookingID}</p></div><button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">✕</button></header>
      <main className="max-h-[68vh] space-y-5 overflow-y-auto bg-base-50/60 px-7 py-6">
        {error && <div className="alert alert-error text-xs"><span>{error}</span></div>}
        <section className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm"><div className="mb-4"><h3 className="text-sm font-black">Patient and date</h3><p className="text-xs text-base-content/55">Details are limited to values linked to this booking.</p></div><div className="grid gap-4 md:grid-cols-2"><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Patient MRN</span><select name="PatientMRN" defaultValue={usage.PatientMRN} className="select select-bordered" required>{mrns.map((mrn) => <option key={mrn} value={mrn}>{mrn}</option>)}</select></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Usage date</span><input name="Date" type="date" defaultValue={inputDate(usage.Date)} className="input input-bordered" required /></label></div></section>
        <section className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm"><div className="mb-4"><h3 className="text-sm font-black">Set inventory</h3><p className="text-xs text-base-content/55">Choose the set, then its available tray and part number.</p></div><div className="grid gap-4 md:grid-cols-2"><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Set</span><select value={setId} onChange={(event) => selectSet(event.target.value)} className="select select-bordered" required>{sets.map((id) => <option key={id} value={id}>{id}</option>)}</select></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Tray</span><select value={trayId} onChange={(event) => selectTray(event.target.value)} className="select select-bordered" disabled={isLoadingTrays} required><option value="">{isLoadingTrays ? 'Loading trays…' : 'Choose tray'}</option>{trays.map((tray) => <option key={tray.TrayID} value={tray.TrayID}>{tray.TrayID} — {tray.TrayName}</option>)}</select></label><label className="form-control md:col-span-2"><span className="label-text mb-1 text-xs font-bold">Part number</span><select value={partNumber} onChange={(event) => setPartNumber(event.target.value)} className="select select-bordered" disabled={!activeTray} required><option value="">{activeTray ? 'Choose part number' : 'Choose a tray first'}</option>{activeTray?.contents.map((part) => <option key={part.ItemID} value={part.PartNumber}>{part.PartNumber} — {part.Description}</option>)}</select></label></div></section>
        <section className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Quantity used</span><input name="QtyUsed" type="number" min="0" defaultValue={usage.QtyUsed} className="input input-bordered" required /></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Quantity refilled</span><input name="Qty Refilled" type="number" min="0" defaultValue={usage['Qty Refilled'] || 0} className="input input-bordered" required /></label><label className="form-control md:col-span-2"><span className="label-text mb-1 text-xs font-bold">Usage sheet link</span><input name="Photo" type="url" defaultValue={usage.Photo || ''} className="input input-bordered" placeholder="https://…" /></label><label className="form-control md:col-span-2"><span className="label-text mb-1 text-xs font-bold">Notes</span><textarea name="Notes" defaultValue={usage.Notes || ''} className="textarea textarea-bordered min-h-20" /></label></div></section>
      </main>
      <footer className="flex items-center justify-end gap-3 border-t border-base-200 bg-base-100 px-7 py-4"><button type="button" onClick={onClose} className="btn btn-ghost" disabled={isPending}>Cancel</button><button className="btn btn-primary px-6" disabled={isPending || isLoadingTrays}>{isPending ? <span className="loading loading-spinner loading-xs" /> : 'Save changes'}</button></footer>
    </form>
  </div>;
}
