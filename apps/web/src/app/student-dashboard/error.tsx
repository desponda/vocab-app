'use client';

import { useEffect } from 'react';
import { Error500 } from '@/components/error/http-errors';

export default function StudentDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Student dashboard error:', error);
  }, [error]);

  return <Error500 preserveLayout={true} onRetry={reset} />;
}
