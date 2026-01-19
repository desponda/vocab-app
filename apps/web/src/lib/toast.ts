import { toast as sonnerToast } from 'sonner';

/**
 * Toast notification utility wrapper around Sonner
 *
 * Provides consistent toast notifications throughout the app with
 * user-friendly defaults and helper methods.
 */

export const toast = {
  /**
   * Show a success toast notification
   */
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Show an error toast notification
   */
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 6000, // Longer duration for errors
    });
  },

  /**
   * Show an info toast notification
   */
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Show a warning toast notification
   */
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * Show a loading toast notification
   * Returns a toast ID that can be used to update or dismiss the toast
   */
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
    });
  },

  /**
   * Show a toast for a promise
   * Automatically shows loading, success, or error based on promise state
   */
  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
    });
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * Custom toast with full control
   * Use this for advanced scenarios with actions, custom duration, etc.
   */
  custom: sonnerToast,
};
