// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Adjust tracesSampleRate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Remove sensitive data
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
        return !breadcrumb?.message?.includes('password') &&
               !breadcrumb?.message?.includes('token');
      });
    }

    // Sanitize URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/, 'token=[REDACTED]');
    }

    return event;
  },

  // beforeSendTransaction for performance filtering
  beforeSendTransaction(event) {
    const transactionName = event.transaction;
    if (transactionName?.includes('/health') || transactionName?.includes('/api/health')) {
      return null;
    }
    return event;
  },

  // User context (will be populated from your auth)
  initialScope: {
    tags: {
      app: 'vocaband',
    },
  },
});
