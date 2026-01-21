'use client';

import { useEffect } from 'react';
import { Error500 } from '@/components/error/http-errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <Error500
          preserveLayout={false}
          onRetry={reset}
          message="An unexpected error occurred. Please try refreshing the page."
        />
      </body>
    </html>
  );
}
