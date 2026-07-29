import { Suspense } from 'react';
import UsagesPageContent from '../components/UsagesPageContent';

export default function UsagesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-60">Loading...</div>}>
      <UsagesPageContent />
    </Suspense>
  );
}
