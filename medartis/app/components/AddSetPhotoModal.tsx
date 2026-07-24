'use client';

import { useState, useTransition } from 'react';
import { addBookingSetPhotoAction } from '../actions/bookingMutationsAction';

interface AddSetPhotoModalProps {
  bookingId: string | null;
  setId: string | null;
  currentUserName: string;
  currentUserRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSetPhotoModal({ bookingId, setId, currentUserName, currentUserRole, onClose, onSuccess }: AddSetPhotoModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  if (!bookingId || !setId) return null;
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('BookingID', bookingId);
    formData.set('SetID', setId);
    formData.set('currentUserName', currentUserName);
    formData.set('currentUserRole', currentUserRole);
    startTransition(async () => {
      const result = await addBookingSetPhotoAction(formData);
      if (result.success) { onSuccess(); onClose(); }
      else setError(result.error || 'Could not add the photo.');
    });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <form onSubmit={handleSubmit} className="w-full max-w-md overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
      <div className="flex items-start justify-between border-b border-base-200 px-6 py-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Set photo</p><h2 className="mt-1 text-lg font-black">Add a photo to {setId}</h2></div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">✕</button>
      </div>
      <div className="space-y-4 p-6">
        {error && <div className="alert alert-error text-xs"><span>{error}</span></div>}
        <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Photo link</span><input required type="url" name="PhotoURL" className="input input-bordered" placeholder="https://…" /><span className="label-text-alt mt-2 text-base-content/55">Paste the link to an uploaded set photo. It will use the next available photo slot.</span></label>
      </div>
      <div className="flex justify-end gap-2 border-t border-base-200 bg-base-50 px-6 py-4"><button type="button" onClick={onClose} className="btn btn-ghost btn-sm" disabled={isPending}>Cancel</button><button className="btn btn-primary btn-sm px-5" disabled={isPending}>{isPending ? <span className="loading loading-spinner loading-xs" /> : 'Add photo'}</button></div>
    </form>
  </div>;
}
