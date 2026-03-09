/**
 * Sentry utilities for manual error tracking
 * Use these functions to capture errors and messages throughout your app
 */

import * as Sentry from '@sentry/nextjs';

type ErrorContext = Record<string, any>;

/**
 * Capture an exception and send it to Sentry
 * @param error - The error to capture
 * @param context - Additional context (tags, extra data, etc.)
 */
export function captureError(error: Error | unknown, context?: ErrorContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error captured:', error, context);
    return;
  }

  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

/**
 * Capture a message and send it to Sentry
 * @param message - The message to capture
 * @param level - The severity level (error, warning, info, debug)
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: ErrorContext
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Set a tag for the current scope
 * @param key - Tag key
 * @param value - Tag value
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Set extra data for the current scope
 * @param key - Data key
 * @param value - Data value
 */
export function setExtra(key: string, value: any): void {
  Sentry.setExtra(key, value);
}

/**
 * Add a breadcrumb to track user actions
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category (e.g., 'user', 'http', 'navigation')
 * @param level - Breadcrumb level
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}

// Error tracking helpers for common scenarios

export function trackAuthError(error: Error, action: string) {
  captureError(error, {
    tags: { category: 'auth', action },
    extra: { action },
  });
}

export function trackApiError(error: Error, endpoint: string, method: string) {
  captureError(error, {
    tags: { category: 'api', endpoint, method },
    extra: { endpoint, method },
  });
}

export function trackDatabaseError(error: Error, operation: string, table: string) {
  captureError(error, {
    tags: { category: 'database', operation, table },
    extra: { operation, table },
  });
}

export function trackSupabaseError(error: Error, operation: string) {
  captureError(error, {
    tags: { category: 'supabase', operation },
    extra: { operation },
  });
}
