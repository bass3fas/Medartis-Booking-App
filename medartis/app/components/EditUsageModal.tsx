'use client';

import { useState, useTransition } from 'react';
import { updateUsageAction } from '../actions/usageMutationsAction';
import type { EnrichedUsage } from '../types/interfaces';

interface EditUsageModalProps {
  usage: EnrichedUsage | null;
  currentUserRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUsageModal({ usage, currentUserRole, onClose, onSuccess }: EditUsageModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  if (!usage) return null;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('UsageID', usage.UsageID);
    formData.set('currentUserRole', currentUserRole);
    startTransition(async () => {
      const result = await updateUsageAction(formData);
      if (result.success) { onSuccess(); onClose(); }
      else setError(result.error || 'Could not update usage.');
    });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
      <div className="flex items-start justify-between border-b border-base-200 px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Usage entry</p><h2 className="mt-1 text-xl font-black">Edit usage</h2><p className="mt-1 font-mono text-xs text-base-content/55">{usage.UsageID}</p></div><button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">✕</button></div>
      <div className="grid gap-4 p-6 md:grid-cols-2">
        {error && <div className="alert alert-error text-xs md:col-span-2"><span>{error}</span></div>}
        <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Patient MRN</span><input name="PatientMRN" defaultValue={usage.PatientMRN} className="input input-bordered" required /></label>
        <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Usage date</span><input name="Date" type="date" defaultValue={String(usage.Date || '').slice(0, 10)} className="input input-bordered" required /></label>
        <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Set ID</span><input name="SetID" defaultValue={usage.SetID} className="input input-bordered" required /></label>
        <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Tray ID</span><input name="TrayID" defaultValue={usage.TrayID} className="input input-bordered" required /></label>
        <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Part number</span><input name="PartNumber" defaultValue={usage.PartNumber} className="input input-bordered" required /></label>
        <div className="grid grid-cols-2 gap-3"><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Used</span><input name="QtyUsed" type="number" min="0" defaultValue={usage.QtyUsed} className="input input-bordered" required /></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Refilled</span><input name="Qty Refilled" type="number" min="0" defaultValue={usage['Qty Refilled'] || 0} className="input input-bordered" required /></label></div>
        <label className="form-control md:col-span-2"><span className="label-text mb-1 text-xs font-bold">Usage sheet link</span><input name="Photo" type="url" defaultValue={usage.Photo || ''} className="input input-bordered" placeholder="https://…" /></label>
        <label className="form-control md:col-span-2"><span className="label-text mb-1 text-xs font-bold">Notes</span><textarea name="Notes" defaultValue={usage.Notes || ''} className="textarea textarea-bordered min-h-20" /></label>
      </div>
      <div className="flex justify-end gap-3 border-t border-base-200 bg-base-50 px-6 py-4"><button type="button" onClick={onClose} className="btn btn-ghost" disabled={isPending}>Cancel</button><button className="btn btn-primary px-6" disabled={isPending}>{isPending ? <span className="loading loading-spinner loading-xs" /> : 'Save changes'}</button></div>
    </form>
  </div>;
}
