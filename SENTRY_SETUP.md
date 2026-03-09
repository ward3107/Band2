# Sentry Error Tracking Setup Guide

## What is Sentry?

Sentry is an error tracking platform that helps you:
- Catch and report errors in production
- See detailed stack traces and user context
- Monitor performance and user sessions
- Get alerts when things break

## Files Created

| File | Purpose |
|------|---------|
| `sentry.server.config.ts` | Server-side Sentry configuration |
| `sentry.client.config.ts` | Client-side Sentry configuration |
| `sentry.edge.config.ts` | Edge runtime Sentry configuration |
| `src/components/SentryProvider.tsx` | User context provider |
| `src/components/SentryErrorBoundary.tsx` | React error boundary |
| `src/lib/sentry.ts` | Utility functions for manual error tracking |

## Setup Steps

### 1. Create a Sentry Account

1. Go to https://sentry.io/
2. Sign up for a free account (5,000 errors/month free)
3. Create a new project: **Next.js**

### 2. Get Your DSN

After creating a project, Sentry will give you a DSN that looks like:
```
https://xxxxxxxxxxxxx@o1234.ingest.sentry.io/123456
```

### 3. Add Environment Variables

Add these to your `.env.local` (and in your hosting platform):

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### 4. Test Sentry Locally

```bash
# Build and start the app
npm run build
npm start

# Or in development
npm run dev
```

To test error tracking, add this temporarily to any component:

```typescript
import { captureMessage } from '@/lib/sentry';

// Test error
captureMessage('Test Sentry message', 'info');

// Test exception
throw new Error('Test Sentry error');
```

### 5. Deploy to Production

When you deploy, Sentry will start capturing:
- Unhandled exceptions
- Rejected promises
- React component errors
- API errors
- Performance data

## Usage Examples

### Tracking Errors Manually

```typescript
import { captureError, trackApiError, trackSupabaseError } from '@/lib/sentry';

// In API routes
try {
  await someOperation();
} catch (error) {
  captureError(error, {
    tags: { action: 'create_assignment' },
    extra: { assignmentId, userId }
  });
}

// Helper functions
trackApiError(error, '/api/admin/setup-profile', 'POST');
trackSupabaseError(error, 'insert_profile');
trackAuthError(error, 'login');
```

### Tracking User Actions

```typescript
import { addBreadcrumb } from '@/lib/sentry';

// Track important user actions
function handleAssignmentStart() {
  addBreadcrumb('User started assignment', 'assignment');
  // ... rest of code
}
```

### Setting Context

```typescript
import { setTag, setExtra } from '@/lib/sentry';

// Add tags for filtering
setTag('feature', 'flashcards');
setTag('assignment_type', 'homework');

// Add extra data
setExtra('word_count', 50);
setExtra('time_spent', 3000);
```

## Sentry Dashboard Features

Once errors start coming in, you can:

### 1. View Error Details
- Stack traces with source code
- Browser and device info
- User who experienced the error
- Breadcrumbs leading to the error

### 2. Set Up Alerts
- Email notifications on new errors
- Slack/Discord integrations
- Alert conditions (e.g., > 10 errors/minute)

### 3. Performance Monitoring
- Page load times
- API response times
- Database query performance
- User sessions with replays

### 4. Release Tracking
```bash
# Tag your releases
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Configuration Options

### Sampling Rates (Production)

Adjust in `sentry.server.config.ts` and `sentry.client.config.ts`:

```typescript
// Lower = fewer traces sent (saves quota)
tracesSampleRate: 0.1, // 10% of transactions

// Replay sampling
replaysSessionSampleRate: 0.1, // 10% of normal sessions
replaysOnErrorSampleRate: 1.0, // 100% of error sessions
```

### Filtering Sensitive Data

The config automatically filters:
- Passwords from breadcrumbs
- Authorization headers
- Cookies
- Tokens from URLs

## Alternative: LogRocket

If you prefer video recordings of user sessions:

```bash
npm install @logrocket/react-logrocket logrocket
```

## Alternative: Simpler Error Logging

If Sentry is too complex, use a simple error log API:

```typescript
// src/app/api/log/route.ts
export async function POST(request: NextRequest) {
  const { error, context } = await request.json();

  // Log to console in development
  console.error('Error:', error, context);

  // In production, send to your preferred service
  if (process.env.NODE_ENV === 'production') {
    // Send to Discord, Slack, email, etc.
    await sendErrorNotification(error, context);
  }

  return NextResponse.json({ success: true });
}
```

## Monitoring Checklist

- [x] Sentry packages installed
- [x] Config files created
- [x] Error boundary added
- [x] User context provider added
- [x] Environment variables in .env.example
- [x] next.config.ts updated
- [ ] DSN added to .env.local
- [ ] DSN added to hosting platform (Vercel/Netlify)
- [ ] Test error sent
- [ ] Alerts configured
- [ ] Team members invited to Sentry

## Links

- Sentry Documentation: https://docs.sentry.io/
- Next.js Integration: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry Dashboard: https://sentry.io/
