import { Suspense } from 'react';
import SetsPageContent from '../components/SetsPageContent';

export default function SetsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-60">Loading...</div>}>
      <SetsPageContent />
    </Suspense>
  );
}
