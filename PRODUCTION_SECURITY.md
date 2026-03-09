# Production Security Guide for Vocaband

## ✅ Completed Security Improvements

### 1. Admin Email Protection ✅ DONE

**Status:** Admin email moved to server-side environment variable

**Implementation:**
- ✅ Created `src/lib/admin.ts` with `getServerAdminEmail()` function
- ✅ Created `src/app/api/admin/validate-email/route.ts` for server-side validation
- ✅ Removed `NEXT_PUBLIC_ADMIN_EMAIL` (now server-side only)
- ✅ Updated all admin login flows to use API validation

**Files:**
- `src/lib/admin.ts`
- `src/app/api/admin/validate-email/route.ts`
- `.env.example` - uses `ADMIN_EMAIL` (not `NEXT_PUBLIC_`)

---

### 2. OAuth Security - Password Verification ✅ DONE

**Status:** OAuth admin login requires additional password verification

**Implementation:**
- ✅ Created `/auth/verify-admin` page for password re-entry
- ✅ Updated auth callback to redirect OAuth admin users to verification
- ✅ `setup-profile` API no longer auto-grants admin access
- ✅ Password verified via Supabase `signInWithPassword`

**Files:**
- `src/app/auth/verify-admin/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/app/api/admin/setup-profile/route.ts`

**Flow:**
```
OAuth Login → Admin Email? →
  ├─ No: Go to home
  └─ Yes: Enter Password → Verify → Grant Admin Access
```

---

### 3. Service Role Key Protection ✅ DONE

**Status:** Multiple authentication layers before using service role key

**Implementation:**
- ✅ `setup-profile` API now validates session before using service role
- ✅ User ID must match authenticated user
- ✅ Email must match session email
- ✅ IP whitelist check (if enabled)

**Files:**
- `src/app/api/admin/setup-profile/route.ts`

**Auth Layers:**
1. Valid session check
2. User ID match verification
3. Email match verification
4. IP whitelist (optional)

---

### 4. Row Level Security (RLS) Policies ✅ DONE

**Status:** Profiles table policies tightened

**Implementation:**
- ✅ Dropped overly permissive "Users can view all profiles" policy
- ✅ Created new restricted policies

**Files:**
- `supabase/migrations/20260309_tighten_profiles_rls.sql`

**Policies:**
| Policy | Who Can See |
|--------|-------------|
| Own profile | Only their own |
| Classmates | Students in same class |
| Students | Teachers of those students |
| All profiles | Verified admins only |

---

### 5. Rate Limiting ✅ DONE

**Status:** Rate limiting on admin endpoints

**Implementation:**
- ✅ `setup-profile` API: 10 requests per 15 minutes per IP
- ✅ `verify-password` API: 5 requests per 15 minutes per IP
- ✅ In-memory storage with auto-cleanup
- ✅ Proper `Retry-After` headers

**Files:**
- `src/app/api/admin/setup-profile/route.ts`
- `src/app/api/admin/verify-password/route.ts`

---

### 6. CSRF Protection ✅ DONE

**Status:** Full CSRF token implementation

**Implementation:**
- ✅ Created `src/middleware.ts` with CSRF token generation/validation
- ✅ Created `src/lib/csrf.ts` with client utilities
- ✅ Updated admin pages to use `fetchWithCsrf()`
- ✅ Constant-time token comparison
- ✅ HttpOnly cookies with SameSite=lax

**Files:**
- `src/middleware.ts`
- `src/lib/csrf.ts`
- `src/app/admin/login/page.tsx`
- `src/app/auth/verify-admin/page.tsx`

**Protected Routes:**
- `/api/admin/setup-profile`
- `/api/admin/verify-password`
- `/api/auth/logout`
- `/api/profile`

---

### 7. CAPTCHA After Failed Login ✅ DONE

**Status:** reCAPTCHA v3 integration for brute-force protection

**Implementation:**
- ✅ Created `src/lib/captcha.ts` for verification
- ✅ Created `src/components/Recaptcha.tsx` React component
- ✅ CAPTCHA required after 3 failed attempts
- ✅ Score-based validation (0.0 = bot, 1.0 = human)
- ✅ Failed attempt counter with auto-reset on success

**Files:**
- `src/lib/captcha.ts`
- `src/components/Recaptcha.tsx`
- `src/app/api/admin/verify-password/route.ts`
- `src/app/admin/login/page.tsx`

**Environment Variables:**
```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
```

---

### 8. IP Whitelisting (Optional) ✅ DONE

**Status:** Optional IP whitelist for admin access

**Implementation:**
- ✅ Created `src/lib/ip-whitelist.ts` with CIDR/wildcard support
- ✅ Added IP checks to admin API routes
- ✅ Created `/admin/my-ip` utility page
- ✅ Disabled by default (empty whitelist = no restriction)

**Files:**
- `src/lib/ip-whitelist.ts`
- `src/app/api/admin/setup-profile/route.ts`
- `src/app/api/admin/verify-password/route.ts`
- `src/app/admin/my-ip/page.tsx`

**Supported Formats:**
- Single IP: `192.168.1.100`
- CIDR range: `10.0.0.0/24`
- Wildcard: `192.168.1.*`
- Multiple: `ip1,ip2,10.0.0.0/24`

---

### 9. Security Headers ✅ DONE

**Status:** Comprehensive security headers configured

**Implementation:**
- ✅ All headers configured in `next.config.ts`
- ✅ Applied to all routes via Next.js headers function

**Files:**
- `next.config.ts`

**Headers:**
| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | ✅ |
| X-Frame-Options | DENY | ✅ |
| X-Content-Type-Options | nosniff | ✅ |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | camera=(), microphone=(self), geolocation=() | ✅ |
| Content-Security-Policy | Full CSP with Supabase/domains | ✅ |

---

### 10. Sentry Error Tracking ✅ DONE

**Status:** Complete Sentry integration

**Implementation:**
- ✅ Created `sentry.server.config.ts`
- ✅ Created `sentry.client.config.ts`
- ✅ Created `sentry.edge.config.ts`
- ✅ Created `instrumentation.ts` for runtime dispatch
- ✅ Created `src/components/SentryProvider.tsx`
- ✅ Created `src/components/SentryErrorBoundary.tsx`
- ✅ Created `src/lib/sentry.ts` with helper functions
- ✅ Wrapped app with error boundary in `layout.tsx`
- ✅ Configured source map upload
- ✅ Tunnel route for ad-blocker bypass

**Files:**
- `sentry.server.config.ts`
- `sentry.client.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- `src/components/SentryProvider.tsx`
- `src/components/SentryErrorBoundary.tsx`
- `src/lib/sentry.ts`
- `next.config.ts`

**Environment Variables:**
```env
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=was-at
SENTRY_PROJECT=javascript-nextjs
```

---

## 🔧 Configuration Required

### Environment Variables (.env.local)

```bash
# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===== Admin (Server-side only) =====
ADMIN_EMAIL=your-admin@email.com

# ===== App Configuration =====
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ===== Sentry Error Tracking =====
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=was-at
SENTRY_PROJECT=javascript-nextjs

# ===== Google reCAPTCHA (Optional but Recommended) =====
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key-v3
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key-v3

# ===== IP Whitelist (Optional) =====
# Leave empty to disable
ADMIN_IP_WHITELIST=

# ===== Optional: Redis for rate limiting =====
REDIS_URL=
```

---

## 📋 Pre-Deployment Checklist

- [x] Admin email moved to server-side
- [x] OAuth requires password verification
- [x] Service role key protected by auth checks
- [x] RLS policies tightened
- [x] Rate limiting on admin endpoints
- [x] CSRF protection implemented
- [x] CAPTCHA for brute-force protection
- [x] IP whitelisting available (optional)
- [x] Security headers configured
- [x] Sentry error tracking set up
- [ ] Change admin password to strong unique password
- [ ] Remove all test accounts and data
- [ ] Set up custom domain with HTTPS
- [ ] Enable Supabase backups
- [ ] Review all environment variables
- [ ] Test all login flows end-to-end
- [ ] Verify OAuth flows work correctly
- [ ] Check for hardcoded secrets
- [ ] Run security audit (Snyk, OWASP ZAP)

---

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Recommended Platforms

| Platform | Notes |
|----------|-------|
| **Vercel** | Recommended for Next.js - auto HTTPS, edge functions |
| **Netlify** | Good free tier, edge functions |
| **Railway** | Simple deployment, built-in database |

### Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY
ADMIN_IP_WHITELIST (optional)
```

---

## 📊 Security Audit Summary

| Issue | Status | Severity |
|-------|--------|----------|
| OAuth bypasses password verification | ✅ Fixed | Critical |
| Service role key lacks auth guards | ✅ Fixed | Critical |
| Overly permissive profile visibility | ✅ Fixed | High |
| Admin email exposed client-side | ✅ Fixed | High |
| No rate limiting on admin endpoints | ✅ Fixed | Medium |
| No CSRF protection | ✅ Fixed | Medium |
| No brute-force protection | ✅ Fixed | Medium |
| Missing security headers | ✅ Fixed | Low |

---

## 🔐 Additional Security Recommendations

### Not Yet Implemented (Optional)

1. **Session Timeout Warnings**
   - Warn users before session expires
   - Auto-logout after inactivity

2. **Request Validation with Zod**
   - Add schema validation to API routes
   - Type-safe request/response handling

3. **Admin Audit Logging**
   - Log all admin actions
   - Track IP, timestamp, action type

4. **Password Requirements**
   - Enforce strong passwords via Supabase
   - Custom validation on signup

5. **Database Indexes**
   - Add indexes for frequently queried fields
   - Improve query performance

---

## 📝 Post-Deployment Monitoring

### Recommended Tools

| Purpose | Tools |
|---------|-------|
| Uptime Monitoring | UptimeRobot, Pingdom |
| Error Tracking | Sentry (configured) |
| Analytics | Vercel Analytics, Plausible |
| Security Scanning | Snyk, OWASP ZAP |

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue:** CSRF token errors
- **Fix:** Ensure `fetchWithCsrf()` is used for all POST requests

**Issue:** CAPTCHA not working
- **Fix:** Verify reCAPTCHA keys are correct and v3 is selected

**Issue:** IP whitelist blocking access
- **Fix:** Check your current IP at `/admin/my-ip`

**Issue:** Sentry not receiving errors
- **Fix:** Verify DSN is correct and tunnel route is working

---

## 📅 Last Updated

**Date:** 2026-03-09
**Version:** 1.0
**Status:** Production Ready ✅
