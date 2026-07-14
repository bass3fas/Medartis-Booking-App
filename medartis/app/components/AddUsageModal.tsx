'use client';

import { useState, useTransition, useMemo, Fragment, useEffect } from 'react';
import { addBookingUsageAction } from '../actions/addUsageAction';
import type { EditableBooking } from '../actions/bookingMutationsAction';
import type { EnrichedTray, VirtualSet } from '../actions/getSetsAction';

interface AddUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: EditableBooking | null;
  set: VirtualSet | null;
  trays: EnrichedTray[];
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

export default function AddUsageModal({ isOpen, onClose, onSuccess, booking, set, trays }: AddUsageModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [nextId, setNextId] = useState(1);

  const patientMRNOptions = useMemo(() => {
    return (booking?.['Patient MRN'] || '').split(',').map(mrn => mrn.trim()).filter(Boolean);
  }, [booking]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setUsageItems([]);
      setError(null);
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setUsageItems(prev => [...prev, { id: nextId, trayId: '', partNumber: '', itemId: '', description: '', qtyUsed: 1, qtyRefilled: 0 }]);
    setNextId(prev => prev + 1);
  };

  const handleRemoveItem = (id: number) => {
    setUsageItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: number, field: keyof UsageItem, value: string | number) => {
    setUsageItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'trayId') {
          // Reset part number when tray changes
          updatedItem.partNumber = '';
          updatedItem.itemId = '';
          updatedItem.description = '';
        }
        if (field === 'partNumber') {
          const selectedTray = trays.find(t => t.TrayID === item.trayId);
          const selectedPart = selectedTray?.contents.find(c => c.PartNumber === value);
          if (selectedPart) {
            updatedItem.itemId = selectedPart.ItemID;
            updatedItem.description = selectedPart.Description || '';
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!booking || !set) {
      setError('Booking or Set information is missing.');
      return;
    }

    if (usageItems.some(item => !item.trayId || !item.partNumber || item.qtyUsed <= 0)) {
      setError('Please fill all fields for each usage item and ensure quantity used is greater than 0.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('BookingID', booking.BookingID);
    formData.set('SetID', set.SetID);
    formData.set('Hospital', booking.Hospital || '');

    // Clear and append structured usage items
    formData.delete('usage_items');
    formData.append('usage_items', JSON.stringify(usageItems));

    startTransition(async () => {
      const result = await addBookingUsageAction(formData);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  if (!isOpen || !booking || !set) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl rounded-[30px] border border-base-300 bg-base-100 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-base-200 bg-gradient-to-r from-base-100 to-base-200/70 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="badge badge-secondary badge-outline font-mono uppercase tracking-widest">Add Usage</div>
                <h2 className="mt-3 text-xl font-black tracking-tight text-base-content">For Booking {booking.BookingID}</h2>
                <p className="mt-1 text-sm text-base-content/70">Log parts used from set <span className="font-bold">{set.SetID}</span>.</p>
              </div>
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-full" aria-label="Close dialog">✕</button>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
            {error && <div className="alert alert-error mb-4 text-xs font-semibold"><span>{error}</span></div>}
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="form-control">
                <span className="label-text pb-1 text-xs font-semibold">Patient MRN</span>
                <select name="PatientMRN" className="select select-bordered select-sm" required disabled={patientMRNOptions.length === 0}>
                  <option value="" disabled selected={!patientMRNOptions.length}>Select MRN</option>
                  {patientMRNOptions.map(mrn => <option key={mrn} value={mrn}>{mrn}</option>)}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text pb-1 text-xs font-semibold">Usage Date</span>
                <input type="date" name="Date" className="input input-bordered input-sm" defaultValue={new Date().toISOString().split('T')[0]} required />
              </label>
            </div>

            <div className="divider mt-6 mb-4">Usage Items</div>

            <div className="space-y-4">
              {usageItems.map((item, index) => {
                const selectedTray = trays.find(t => t.TrayID === item.trayId);
                return (
                  <div key={item.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 rounded-xl border bg-base-50 p-3 items-end">
                    <label className="form-control">
                      <span className="label-text pb-1 text-xs font-semibold">Tray</span>
                      <select value={item.trayId} onChange={(e) => handleItemChange(item.id, 'trayId', e.target.value)} className="select select-bordered select-xs" required>
                        <option value="" disabled>Select Tray</option>
                        {trays.map(t => <option key={t.TrayID} value={t.TrayID}>{t.TrayName} ({t.TrayID})</option>)}
                      </select>
                    </label>
                    <label className="form-control">
                      <span className="label-text pb-1 text-xs font-semibold">Part Number</span>
                      <select value={item.partNumber} onChange={(e) => handleItemChange(item.id, 'partNumber', e.target.value)} className="select select-bordered select-xs" required disabled={!selectedTray}>
                        <option value="" disabled>Select Part</option>
                        {selectedTray?.contents.map(c => <option key={c.ItemID} value={c.PartNumber}>{c.PartNumber} - {c.Description}</option>)}
                      </select>
                    </label>
                    <label className="form-control">
                      <span className="label-text pb-1 text-xs font-semibold">Qty Used</span>
                      <input type="number" value={item.qtyUsed} onChange={(e) => handleItemChange(item.id, 'qtyUsed', parseInt(e.target.value, 10))} className="input input-bordered input-xs w-20" min="1" required />
                    </label>
                    <label className="form-control">
                      <span className="label-text pb-1 text-xs font-semibold">Qty Refilled</span>
                      <input type="number" value={item.qtyRefilled} onChange={(e) => handleItemChange(item.id, 'qtyRefilled', parseInt(e.target.value, 10))} className="input input-bordered input-xs w-20" min="0" />
                    </label>
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="btn btn-error btn-outline btn-xs btn-square">✕</button>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={handleAddItem} className="btn btn-sm btn-ghost mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Part
            </button>

            <div className="grid grid-cols-1 gap-4 mt-6">
              <label className="form-control">
                <span className="label-text pb-1 text-xs font-semibold">Usage Notes</span>
                <textarea name="Notes" className="textarea textarea-bordered textarea-sm" placeholder="Optional notes about the usage..."></textarea>
              </label>
              <label className="form-control">
                <span className="label-text pb-1 text-xs font-semibold">Usage Photo Link</span>
                <input type="url" name="Photo" className="input input-bordered input-sm" placeholder="https://..." />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost rounded-xl font-bold" disabled={isPending}>Cancel</button>
            <button type="submit" className="btn btn-sm btn-primary rounded-xl px-5 font-bold" disabled={isPending || usageItems.length === 0}>
              {isPending ? <span className="loading loading-spinner loading-xs"></span> : 'Save Usages'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}