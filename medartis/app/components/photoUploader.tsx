// components/PhotoUploader.tsx
'use client';

import { useState } from 'react';

interface PhotoUploaderProps {
  bookingSetId: string;
  photoKey: 'photo1' | 'photo2' | 'photo3'; // Column name
  onUploadSuccess: (path: string) => void;
}

export default function PhotoUploader({ bookingSetId, photoKey, onUploadSuccess }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local instant preview
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bookingSetId', bookingSetId);
    formData.append('photoKey', photoKey);

    try {
      const res = await fetch('/api/upload-set-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        // Returns relative path like "BookingSets_Images/BS-30000.photo1.112105.jpg"
        onUploadSuccess(data.relativePath); 
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-base-300 p-4 bg-base-50">
      {preview ? (
        <img src={preview} alt="Set photo" className="h-32 w-32 rounded-xl object-cover shadow-sm" />
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-base-200 text-base-content/40">
          No photo
        </div>
      )}

      <label className="btn btn-sm btn-outline btn-primary rounded-xl cursor-pointer">
        {uploading ? <span className="loading loading-spinner loading-xs" /> : '📷 Take / Choose Photo'}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" // Opens camera on mobile, file picker on desktop
          onChange={handleFileChange} 
          className="hidden" 
        />
      </label>
    </div>
  );
}