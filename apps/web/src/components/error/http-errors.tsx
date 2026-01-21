'use client';

import { useRouter } from 'next/navigation';
import { ErrorPage } from './error-page';
import {
  ShieldAlert,
  Lock,
  FileQuestion,
  AlertTriangle,
  ServerCrash,
  Clock,
  WifiOff,
} from 'lucide-react';

interface ErrorProps {
  message?: string;
  preserveLayout?: boolean;
  onRetry?: () => void;
}

export function Error401({ message, preserveLayout = true }: ErrorProps) {
  const router = useRouter();

  return (
    <ErrorPage
      icon={Lock}
      statusCode={401}
      title="Authentication Required"
      description={
        message || 'Your session has expired. Please sign in again to continue.'
      }
      preserveLayout={preserveLayout}
      actions={[
        {
          label: 'Sign In',
          onClick: () => router.push('/login'),
          primary: true,
        },
      ]}
    />
  );
}

export function Error403({ message, preserveLayout = true }: ErrorProps) {
  const router = useRouter();

  return (
    <ErrorPage
      icon={ShieldAlert}
      statusCode={403}
      title="Access Denied"
      description={
        message ||
        "You don't have permission to access this resource. Contact your teacher if you believe this is an error."
      }
      preserveLayout={preserveLayout}
      actions={[
        {
          label: 'Go Back',
          onClick: () => router.back(),
          variant: 'outline',
        },
        {
          label: 'Go Home',
          onClick: () => router.push('/dashboard'),
          primary: true,
        },
      ]}
    />
  );
}

export function Error404({ message, preserveLayout = true }: ErrorProps) {
  const router = useRouter();

  return (
    <ErrorPage
      icon={FileQuestion}
      statusCode={404}
      title="Page Not Found"
      description={
        message || "The page you're looking for doesn't exist or has been moved."
      }
      preserveLayout={preserveLayout}
      actions={[
        {
          label: 'Go Back',
          onClick: () => router.back(),
          variant: 'outline',
        },
        {
          label: 'Go Home',
          onClick: () => router.push('/dashboard'),
          primary: true,
        },
      ]}
    />
  );
}

export function Error429({ message, preserveLayout = true, onRetry }: ErrorProps) {
  const router = useRouter();

  return (
    <ErrorPage
      icon={Clock}
      statusCode={429}
      title="Too Many Requests"
      description={
        message ||
        "You've made too many requests. Please wait a moment and try again."
      }
      preserveLayout={preserveLayout}
      actions={[
        ...(onRetry
          ? [
              {
                label: 'Try Again',
                onClick: onRetry,
                primary: true,
              },
            ]
          : []),
        {
          label: 'Go Home',
          onClick: () => router.push('/dashboard'),
          variant: 'outline' as const,
        },
      ]}
    />
  );
}

export function Error500({ message, preserveLayout = true, onRetry }: ErrorProps) {
  const router = useRouter();

  return (
    <ErrorPage
      icon={ServerCrash}
      statusCode={500}
      title="Server Error"
      description={
        message ||
        'Something went wrong on our end. Our team has been notified and is working on a fix.'
      }
      preserveLayout={preserveLayout}
      actions={[
        ...(onRetry
          ? [
              {
                label: 'Try Again',
                onClick: onRetry,
                primary: true,
              },
            ]
          : []),
        {
          label: 'Go Home',
          onClick: () => router.push('/dashboard'),
          variant: 'outline' as const,
        },
      ]}
    />
  );
}

export function Error503({ message, preserveLayout = true, onRetry }: ErrorProps) {
  const router = useRouter();

  return (
    <ErrorPage
      icon={AlertTriangle}
      statusCode={503}
      title="Service Unavailable"
      description={
        message ||
        'The service is temporarily unavailable. Please try again in a few moments.'
      }
      preserveLayout={preserveLayout}
      actions={[
        ...(onRetry
          ? [
              {
                label: 'Try Again',
                onClick: onRetry,
                primary: true,
              },
            ]
          : []),
        {
          label: 'Go Home',
          onClick: () => router.push('/dashboard'),
          variant: 'outline' as const,
        },
      ]}
    />
  );
}

export function ErrorNetwork({ message, preserveLayout = true, onRetry }: ErrorProps) {
  return (
    <ErrorPage
      icon={WifiOff}
      title="Connection Lost"
      description={
        message || 'Unable to connect to the server. Please check your internet connection.'
      }
      preserveLayout={preserveLayout}
      actions={
        onRetry
          ? [
              {
                label: 'Try Again',
                onClick: onRetry,
                primary: true,
              },
            ]
          : []
      }
    />
  );
}
