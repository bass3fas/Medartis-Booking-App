import { Suspense } from 'react';
import BookingsPageContent from '../components/BookingsPageContent';

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-60">Loading...</div>}>
      <BookingsPageContent />
    </Suspense>
  );
}
