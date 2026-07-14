'use client';

import { useMemo, useState, useTransition } from 'react';
import { addBookingUsageAction } from '../actions/addUsageAction';
import { EnrichedTray, fetchTraysAndUsageForSet } from '../actions/getSetsAction';
import { EnhancedBooking } from '../actions/getBookingsAction';

interface AddUsagePanelProps {
  booking: EnhancedBooking;
  onSuccess: () => void;
}

function splitCommaValue(value?: string) {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export default function AddUsagePanel({ booking, onSuccess }: AddUsagePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedMrn, setSelectedMrn] = useState(splitCommaValue(booking['Patient MRN'])[0] || booking.PatientUsages[0]?.MRN || '');
  const [customMrn, setCustomMrn] = useState('');
  const [selectedSetId, setSelectedSetId] = useState(splitCommaValue(booking['Selected Sets'])[0] || booking.RelatedBookingSets[0]?.SetID || '');
  const [trays, setTrays] = useState<EnrichedTray[]>([]);
  const [selectedTrayId, setSelectedTrayId] = useState('');
  const [selectedParts, setSelectedParts] = useState<Record<string, { used: string; refilled: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mrnOptions = useMemo(() => Array.from(new Set([...splitCommaValue(booking['Patient MRN']), ...booking.PatientUsages.map((usage) => usage.MRN).filter(Boolean)])), [booking]);
  const selectedSetOptions = useMemo(() => Array.from(new Set([...splitCommaValue(booking['Selected Sets']), ...booking.RelatedBookingSets.map((set) => set.SetID).filter(Boolean)])), [booking]);
  const activeTray = trays.find((tray) => tray.TrayID === selectedTrayId);

  const loadSetDetails = (setId: string) => {
    setSelectedSetId(setId);
    setSelectedTrayId('');
    setSelectedParts({});
    if (!setId) {
      setTrays([]);
      return;
    }
    startTransition(async () => {
      const result = await fetchTraysAndUsageForSet(setId);
      if (result.success) {
        setTrays(result.trays);
        setSelectedTrayId(result.trays[0]?.TrayID || '');
      } else {
        setError(result.error || 'Could not load trays for the selected set.');
      }
    });
  };

  const togglePart = (itemId: string) => {
    setSelectedParts((current) => {
      if (current[itemId]) {
        const next = { ...current };
        delete next[itemId];
        return next;
      }
      return { ...current, [itemId]: { used: '1', refilled: '0' } };
    });
  };

  const updateQty = (itemId: string, key: 'used' | 'refilled', value: string) => {
    setSelectedParts((current) => ({ ...current, [itemId]: { ...(current[itemId] || { used: '1', refilled: '0' }), [key]: value } }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const mrn = customMrn.trim() || selectedMrn.trim();
    if (!mrn) {
      setError('Choose an MRN or enter a new one.');
      return;
    }
    if (!selectedSetId || !selectedTrayId || !activeTray) {
      setError('Choose a selected set and tray before adding usage.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set('BookingID', booking.BookingID);
    formData.set('Hospital', booking.Hospital || '');
    formData.set('SetID', selectedSetId);
    formData.set('TrayID', selectedTrayId);
    formData.set('PatientMRN', mrn);

    Object.entries(selectedParts).forEach(([itemId, qty]) => {
      const item = activeTray.contents.find((content) => content.ItemID === itemId);
      if (!item) return;
      formData.append('ItemID', item.ItemID);
      formData.append('PartNumber', item.PartNumber);
      formData.append('Description', item.Description || '');
      formData.append('QtyUsed', qty.used);
      formData.append('QtyRefilled', qty.refilled);
    });

    startTransition(async () => {
      const result = await addBookingUsageAction(formData);
      if (result.success) {
        setMessage(result.message || 'Usage added.');
        setSelectedParts({});
        onSuccess();
      } else {
        setError(result.error || 'Unable to add usage.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-primary/15 bg-primary/5 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-base-content">Add usage to this booking</p>
          <p className="text-xs text-base-content/60">Log consumed parts against a patient MRN, selected set, and tray.</p>
        </div>
        <span className="badge badge-primary badge-outline">Usage</span>
      </div>
      {error && <div className="alert alert-error mb-3 py-2 text-xs"><span>{error}</span></div>}
      {message && <div className="alert alert-success mb-3 py-2 text-xs"><span>{message}</span></div>}
      <div className="grid gap-3 md:grid-cols-4">
        <label className="form-control"><span className="label-text text-[10px] font-bold uppercase">Existing MRN</span><select className="select select-bordered select-sm" value={selectedMrn} onChange={(event) => setSelectedMrn(event.target.value)}><option value="">Choose MRN</option>{mrnOptions.map((mrn) => <option key={mrn} value={mrn}>{mrn}</option>)}</select></label>
        <label className="form-control"><span className="label-text text-[10px] font-bold uppercase">Or new MRN</span><input className="input input-bordered input-sm" value={customMrn} onChange={(event) => setCustomMrn(event.target.value)} placeholder="New patient MRN" /></label>
        <label className="form-control"><span className="label-text text-[10px] font-bold uppercase">Used set</span><select className="select select-bordered select-sm" value={selectedSetId} onChange={(event) => loadSetDetails(event.target.value)}><option value="">Choose selected set</option>{selectedSetOptions.map((setId) => <option key={setId} value={setId}>{setId}</option>)}</select></label>
        <label className="form-control"><span className="label-text text-[10px] font-bold uppercase">Tray</span><select className="select select-bordered select-sm" value={selectedTrayId} onChange={(event) => { setSelectedTrayId(event.target.value); setSelectedParts({}); }} disabled={trays.length === 0}><option value="">Choose tray</option>{trays.map((tray) => <option key={tray.TrayID} value={tray.TrayID}>{tray.TrayID} — {tray.TrayName}</option>)}</select></label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="form-control"><span className="label-text text-[10px] font-bold uppercase">Notes</span><input name="Notes" className="input input-bordered input-sm" placeholder="Optional usage notes" /></label>
        <label className="form-control"><span className="label-text text-[10px] font-bold uppercase">Usage date</span><input type="date" name="Date" className="input input-bordered input-sm" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      {activeTray && (
        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-base-200 bg-base-100">
          <table className="table table-compact w-full text-xs">
            <thead className="bg-base-50 text-[10px] uppercase"><tr><th>Use</th><th>Part</th><th className="text-right">Current</th><th className="text-right">Used</th><th className="text-right">Refilled</th></tr></thead>
            <tbody>
              {activeTray.contents.map((item) => {
                const checked = Boolean(selectedParts[item.ItemID]);
                return (
                  <tr key={item.ItemID} className={checked ? 'bg-primary/5' : ''}>
                    <td><input type="checkbox" className="checkbox checkbox-primary checkbox-xs" checked={checked} onChange={() => togglePart(item.ItemID)} /></td>
                    <td><span className="font-bold text-primary">{item.PartNumber}</span><span className="block text-[10px] opacity-60">{item.Description}</span></td>
                    <td className="text-right font-mono">{item.computedCurrentQty}</td>
                    <td className="text-right"><input type="number" min="0" className="input input-bordered input-xs w-20 text-right" value={selectedParts[item.ItemID]?.used || ''} disabled={!checked} onChange={(event) => updateQty(item.ItemID, 'used', event.target.value)} /></td>
                    <td className="text-right"><input type="number" min="0" className="input input-bordered input-xs w-20 text-right" value={selectedParts[item.ItemID]?.refilled || ''} disabled={!checked} onChange={(event) => updateQty(item.ItemID, 'refilled', event.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex justify-end"><button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>{isPending ? <span className="loading loading-spinner loading-xs" /> : 'Save Usage'}</button></div>
    </form>
  );
}
