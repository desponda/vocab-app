'use client';

import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { toast } from '@/lib/toast';

export interface ErrorHandlerOptions {
  /** Show toast notification for errors */
  showToast?: boolean;
  /** Redirect on 401 errors */
  redirectOn401?: boolean;
  /** Custom error message overrides by status code */
  customMessages?: Partial<Record<number, string>>;
  /** Callback for handling specific errors */
  onError?: (error: ApiError) => void;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const router = useRouter();
  const {
    showToast = true,
    redirectOn401 = true,
    customMessages = {},
    onError,
  } = options;

  const handleError = (error: unknown, context?: string) => {
    // Extract ApiError or create generic error
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else if (error instanceof Error) {
      apiError = new ApiError(error.message, 500);
    } else {
      apiError = new ApiError('An unexpected error occurred', 500);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(apiError);
    }

    // Handle 401 - Session expired
    if (apiError.statusCode === 401 && redirectOn401) {
      if (showToast) {
        toast.error('Session Expired', 'Please sign in again to continue.');
      }
      // Clear auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
      router.push('/login');
      return;
    }

    // Show toast notification
    if (showToast) {
      const message = customMessages[apiError.statusCode] || apiError.message;
      const contextPrefix = context ? `${context}: ` : '';

      toast.error(getErrorTitle(apiError.statusCode), `${contextPrefix}${message}`);
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', apiError, { context });
    }
  };

  return { handleError };
}

function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid Request';
    case 401:
      return 'Authentication Required';
    case 403:
      return 'Access Denied';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Server Error';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}
