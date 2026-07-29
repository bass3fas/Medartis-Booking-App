import { Suspense } from 'react';
import PartsMasterPageContent from '../components/PartsMasterPageContent';

export default function PartsMasterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-60">Loading...</div>}>
      <PartsMasterPageContent />
    </Suspense>
  );
}
