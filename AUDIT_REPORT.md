# Band2 Repository Audit Report

**Date:** 2026-03-03
**Project:** Band2 - Vocabulary Learning Platform
**Stack:** Next.js 16.1.6 + React 19 + TypeScript + Supabase
**Total Source Files:** ~6,634 lines (TS/TSX)

---

## Executive Summary

The codebase has solid architectural foundations but several **critical blockers** prevent safe production deployment: zero test coverage, missing database tables, incomplete error handling, and unmet dependencies.

**Overall Risk: MEDIUM-HIGH**

| Category | Issues Found | Highest Severity |
|---|---|---|
| Security | 10 | MEDIUM |
| Code Quality | 7 | MEDIUM |
| Testing | 1 | CRITICAL |
| Dependencies | 3 | HIGH |
| Documentation | 3 | MEDIUM |
| Configuration | 2 | LOW |
| Database | 3 | HIGH |
| Deployment | 3 | MEDIUM |
| **Total** | **32** | **2 CRITICAL, 1 HIGH** |

---

## 1. Critical / High Issues

### 1.1 Zero Test Coverage — CRITICAL
- **Finding:** No test files found (`*.test.ts`, `*.spec.ts`, `__tests__/`)
- **Impact:** No regression protection; cannot safely refactor; risky deployments
- **Fix:** Implement Jest + React Testing Library for unit/component tests; Playwright for E2E. Target ≥70% coverage.

### 1.2 Unmet Dependencies — HIGH
- **Finding:** All packages listed in `package.json` are UNMET (node_modules missing)
- **Affected:** `next`, `@supabase/supabase-js`, `typescript`, `tailwindcss`, `eslint`, and all type packages
- **Fix:** Run `npm install` before any build or deployment.

### 1.3 Missing Database Tables — HIGH
- **`approved_teachers` table** referenced in:
  - `src/app/api/admin/teachers/bulk-create/route.ts:85-103`
  - `src/app/auth/callback/page.tsx:41-45`
  - Not defined anywhere in `supabase/schema.sql`
- **`is_admin` column** on `profiles` referenced in `src/lib/supabase.ts:27` but absent from schema
- **Fix:**
  ```sql
  ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

  CREATE TABLE IF NOT EXISTS public.approved_teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    added_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

---

## 2. Security Issues

### 2.1 Hardcoded Supabase Storage Key
- **File:** `src/lib/supabase.ts:9`
- **Issue:** `storageKey: 'sb-pthhxqufzgbyzuucnfni-auth-token'` is hardcoded; the project ID is embedded in source
- **Fix:** Remove the `storageKey` override and let the SDK derive it from the URL automatically.

### 2.2 Unsafe Cookie Parsing
- **File:** `src/contexts/AuthContext.tsx:31-51`
- **Issue:** Manual `document.cookie` parsing + `JSON.parse(decodeURIComponent(...))` without validation
- **Fix:** Remove manual parsing; rely on `supabase.auth.getSession()` which handles this safely.

### 2.3 Missing `response.ok` Checks on Fetch
- **Files:** `src/app/admin/teachers/page.tsx:69,97,133`, `src/app/teacher/assignments/create/page.tsx:50`, `src/app/student/assignments/[id]/page.tsx:101`
- **Issue:** Fetch responses are `.json()`-parsed without checking `response.ok`; failed requests silently pass
- **Fix:**
  ```typescript
  const response = await fetch('/vocabulary.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  ```

### 2.4 Missing Security Headers
- **File:** `next.config.ts` (currently empty)
- **Missing:** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- **Fix:** Add a `headers()` export in `next.config.ts`.

### 2.5 No Rate Limiting on API Routes
- **Affected:** All routes under `src/app/api/`
- **Fix:** Add rate limiting via Vercel Edge middleware or an `upstash/ratelimit` integration.

### 2.6 Admin Auth Via Sequential DB Queries (No Middleware)
- **File:** `src/app/api/admin/teachers/bulk-create/route.ts:22-43`
- **Issue:** Every admin request hits the database twice to verify role; should use JWT claims or Next.js middleware
- **Fix:** Extract admin guard into `src/middleware.ts` using Supabase session JWT.

### 2.7 ESLint Security Rules Set to `warn` Instead of `error`
- **File:** `eslint.config.mjs`
- **Issue:** `no-unsanitized/method` and `no-unsanitized/property` are warnings; builds succeed with violations
- **Fix:** Change to `"error"`.

---

## 3. Code Quality Issues

### 3.1 N+1 Query Pattern — Student Dashboard
- **File:** `src/app/student/page.tsx:116-132`
- **Issue:** One Supabase query per assignment to fetch progress; scales O(n) with assignment count
- **Fix:** Use a single query with `.in('assignment_id', ids)` and merge client-side.

### 3.2 Large Static JSON Loaded on Every Page
- **Files:** `src/app/teacher/assignments/create/page.tsx:50`, `src/app/student/assignments/[id]/page.tsx:101`
- **Issue:** `vocabulary.json` (~28 KB) fetched on every page load with no caching
- **Fix:** Move vocabulary to a Supabase table; use Next.js ISR or `unstable_cache` for caching.

### 3.3 Duplicate Role-Guard Logic
- **Files:** `src/app/page.tsx:50-54`, `src/app/teacher/dashboard/page.tsx:25-28`, `src/app/student/page.tsx:45-48`
- **Issue:** Same `if (profile?.role !== 'X') { router.push('/'); return; }` pattern repeated in every page
- **Fix:** Extract into a `useRoleGuard(role)` custom hook.

### 3.4 QuizMode Not Implemented
- **File:** `src/app/student/assignments/[id]/page.tsx:177-186`
- **Issue:** `mode === 'quiz'` renders `<FlashcardMode>` instead of the quiz component; `src/components/QuizMode.tsx` exists but is unused
- **Fix:** Replace with `<QuizMode>` component.

### 3.5 Unsafe `as any` Type Cast
- **File:** `src/app/teacher/dashboard/page.tsx:152`
- **Issue:** `(c as any).student_count` defeats type safety
- **Fix:** Add `student_count?: number` to the `Class` interface.

### 3.6 `Promise<any>` Return Types in AuthContext
- **File:** `src/contexts/AuthContext.tsx:12-15`
- **Issue:** All auth methods typed as `Promise<any>`; callers cannot use return values safely
- **Fix:** Define and use explicit return types (e.g., `Promise<{ error: AuthError | null }>`).

### 3.7 41 Console Logs in Production Code
- **Notable files:** `src/app/student/page.tsx`, `src/app/auth/callback/page.tsx`, `src/app/teacher/assignments/create/page.tsx`
- **Fix:** Remove debug logs; use a structured logger (e.g., `pino`) for any intentional logging.

---

## 4. Configuration Issues

### 4.1 Empty `next.config.ts`
- **File:** `next.config.ts`
- **Missing:** Security headers, image domain allowlist, compression, redirect rules
- **Fix:** Populate with at minimum security headers and image config.

### 4.2 Hard-coded `lang="en"` in Root Layout
- **File:** `src/app/layout.tsx:57`
- **Issue:** Multilingual app sets a static `lang` attribute; screen readers and SEO tools see wrong language
- **Fix:** Read the current language from a cookie or the `LanguageContext` in a Server Component wrapper.

### 4.3 Direct DOM Style Manipulation
- **Files:** `src/app/page.tsx:22-32`, `src/app/teacher/login/page.tsx`, `src/app/login/page.tsx`
- **Issue:** `document.body.style.overflow = 'hidden'` in `useEffect`; conflicts with other pages and SSR
- **Fix:** Apply overflow styles via Tailwind classes or a CSS module scoped to the layout.

---

## 5. Missing Documentation

| Item | Location | Recommendation |
|---|---|---|
| `.env.example` | repo root (missing) | Document all required env vars |
| JSDoc on public functions | `src/lib/`, `src/contexts/` | Add comments to all exported functions |
| API documentation | `src/app/api/` | Add OpenAPI/Swagger or README per route |
| Architecture Decision Records | repo root | Document Supabase vs Firebase, Context vs Redux, etc. |

---

## 6. Recommended Fix Priority

### Fix Before Any Deployment
1. `npm install` — unmet dependencies
2. Add missing SQL migrations (`approved_teachers`, `is_admin`)
3. Add `response.ok` guards on all fetch calls
4. Add security headers to `next.config.ts`

### Fix Before Public Release
1. Implement test suite (Jest + RTL + Playwright)
2. Replace N+1 query with batched Supabase query
3. Remove all 41 console logs
4. Implement QuizMode component
5. Add rate limiting to API routes
6. Move auth guard to Next.js middleware

### Fix in Next Sprint
1. Extract `useRoleGuard()` hook
2. Fix all `Promise<any>` return types
3. Remove `as any` casts
4. Move vocabulary data to database
5. Create `.env.example`
6. Fix `lang` attribute in root layout

---

## 7. Positive Findings

- Password generation in `src/lib/password-generator.ts` correctly uses `crypto.randomInt` (secure)
- Supabase client is a singleton (no connection leaks)
- TypeScript is used throughout (good foundation)
- Role separation (teacher/student/admin) is architecturally sound
- Tailwind + Next.js App Router are modern, appropriate choices
