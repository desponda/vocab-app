import * as Sentry from '@sentry/node';
import { config } from './config';

/**
 * Initialize Sentry for error tracking
 * Only initializes if SENTRY_DSN is configured
 */
export function initializeSentry(): void {
  if (!config.sentryDsn) {
    return; // Sentry is optional, silently skip if not configured
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    release: config.version,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,

    // Capture unhandled promise rejections
    integrations: [
      Sentry.httpIntegration(),
    ],

    // Ignore common non-error scenarios
    ignoreErrors: [
      // Network errors (client-side)
      'Network request failed',
      'NetworkError',
      // Authentication errors (expected)
      'Unauthorized',
      'Invalid token',
      // Rate limit errors (expected under high load)
      'Too Many Requests',
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from request bodies
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) delete data.password;
        if (data.confirmPassword) delete data.confirmPassword;
        if (data.refreshToken) delete data.refreshToken;
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },
  });
}

/**
 * Check if Sentry is initialized
 */
export function isSentryEnabled(): boolean {
  return !!config.sentryDsn;
}

/**
 * Capture exception manually (use for caught errors that should be tracked)
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!isSentryEnabled()) return;

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for Sentry (helps identify which users experience errors)
 */
export function setUserContext(userId: string, email?: string): void {
  if (!isSentryEnabled()) return;

  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>): void {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}
