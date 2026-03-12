# PROJECT_CONTEXT.md

> **Purpose:** Persistent AI memory context for the Band2 / Vocaband codebase.
> Regenerated: 2026-03-12. Keep this file up to date as the project evolves.

---

## 1. TECH STACK

### Runtime & Framework

| Layer | Package | Version (package.json) | Notes |
|---|---|---|---|
| Frontend framework | `next` | `16.1.6` (pinned exact) | App Router, deployed on Vercel |
| UI library | `react` / `react-dom` | `^19` (installed: 19.2.3+) | React 19 concurrent features |
| Language | `typescript` | `5.9.3` (pinned exact) | Strict mode enabled |
| CSS framework | `tailwindcss` | `^4` | PostCSS via `@tailwindcss/postcss ^4` |
| Error tracking | `@sentry/nextjs` | `^10.42.0` | Browser + server + edge instrumentation |
| Database client | `@supabase/supabase-js` | `^2.98.0` | Auth (PKCE) + DB + Storage |

### Dev / Build Tools

| Package | Version | Purpose |
|---|---|---|
| `eslint` | `^9` | Linting |
| `eslint-config-next` | `16.1.6` | Next.js ESLint rules |
| `eslint-plugin-security` | `^4.0.0` | OWASP security lint rules |
| `eslint-plugin-no-unsanitized` | `^4.1.5` (MPL-2.0) | DOM XSS prevention; both rules set to `"error"` |
| `jest` | `^30` | Unit/component test runner |
| `jest-environment-jsdom` | `^30` | DOM test environment (resolves GHSA-vpq2-c234-7xj6) |
| `@testing-library/react` | `^16` | Component testing |
| `@testing-library/jest-dom` | `^6` | Jest DOM matchers |
| `@testing-library/user-event` | `^14` | User interaction simulation |
| `@types/node` | `^22` | Node LTS type definitions |
| `@types/react` | `^19` | React type definitions |
| `@types/react-dom` | `^19` | Required implicitly by Next.js JSX transform |
| `@types/jest` | `^30` | Jest type definitions |

### Key Config Files

| File | Purpose |
|---|---|
| `next.config.ts` | Next.js config + Sentry wrap + security headers |
| `jest.config.js` | Jest config via `next/jest.js`; `testEnvironment: 'jsdom'` |
| `jest.setup.ts` | Empty setup file wired in `setupFilesAfterEnv` |
| `eslint.config.mjs` | Flat ESLint config using `defineConfig` |
| `tailwind.config.ts` | Tailwind content globs + accessibility font-size tokens |
| `tsconfig.json` | TypeScript config; path alias `@/` → `src/` |
| `vercel.json` | Vercel deployment config |
| `instrumentation.ts` / `src/instrumentation-client.ts` | Sentry Node/Edge/Browser init |
| `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` | Sentry DSN + replay config |
| `supabase/schema.sql` | Full PostgreSQL schema + RLS policies |

---

## 2. PROJECT ARCHITECTURE

### Folder Structure

```
/home/user/Band2/
├── .claude/                   # Claude Code project config
├── .github/                   # GitHub Actions CI/CD workflows
├── public/                    # Static assets (favicon, vocabulary.json)
├── src/
│   ├── app/                   # Next.js App Router root
│   │   ├── layout.tsx         # Root layout (providers, Sentry, fonts)
│   │   ├── page.tsx           # Landing page (role-aware redirect)
│   │   ├── global-error.tsx   # Global Sentry error boundary
│   │   ├── sentry-example-page/ # Sentry integration test page
│   │   ├── admin/             # Admin-only pages
│   │   │   ├── login/         # Admin Google OAuth login
│   │   │   ├── my-ip/         # Admin IP-checker utility
│   │   │   └── teachers/      # Teacher management UI
│   │   ├── auth/              # Auth flow pages
│   │   │   ├── callback/      # Google OAuth PKCE callback handler
│   │   │   └── verify-admin/  # Secondary admin password gate
│   │   ├── join/              # Public student join page (class code entry)
│   │   ├── student/           # Student-role pages
│   │   │   ├── page.tsx       # Student dashboard
│   │   │   ├── assignments/[id]/ # Assignment study view (all 7 modes)
│   │   │   └── join-class/    # Post-join class confirmation
│   │   ├── teacher/           # Teacher-role pages
│   │   │   ├── login/         # Teacher code-based login
│   │   │   ├── dashboard/     # Teacher dashboard (classes + assignments)
│   │   │   ├── assignments/
│   │   │   │   ├── create/    # New assignment builder
│   │   │   │   ├── [id]/edit/ # Edit existing assignment
│   │   │   │   └── [id]/results/ # Student results for assignment
│   │   │   └── classes/create/ # Create new class
│   │   ├── test-auth/         # Auth testing/debugging page
│   │   └── api/               # Next.js API Route Handlers
│   │       ├── manifest/      # PWA web manifest
│   │       ├── sentry-example-api/ # Sentry test endpoint
│   │       ├── student/join/  # Student registration + class enrollment
│   │       ├── students/[id]/reset-code/ # Teacher/admin code reset
│   │       └── admin/
│   │           ├── setup-profile/  # OAuth profile creation
│   │           ├── verify-password/ # Admin secondary auth + CAPTCHA
│   │           ├── validate-email/ # Check if email is admin
│   │           └── teachers/
│   │               ├── bulk-create/ # Create / list teachers
│   │               └── remove/      # Delete teacher
│   ├── components/            # Reusable UI components
│   │   ├── AccessibilityMenu.tsx    # Font size / contrast controls
│   │   ├── FlashcardMode.tsx        # Study mode: flashcards
│   │   ├── QuizMode.tsx             # Study mode: multiple-choice quiz
│   │   ├── FillInBlankMode.tsx      # Study mode: fill-in-the-blank
│   │   ├── MatchingMode.tsx         # Study mode: word-definition matching
│   │   ├── SpellingMode.tsx         # Study mode: spelling bee
│   │   ├── StoryMode.tsx            # Study mode: AI-generated story
│   │   ├── WordScrambleMode.tsx     # Study mode: word scramble
│   │   ├── HelpDropdown.tsx         # Contextual help overlay
│   │   ├── LanguageSwitcher.tsx     # Hebrew / Arabic / English toggle
│   │   ├── Recaptcha.tsx            # reCAPTCHA v3 invisible widget
│   │   ├── SentryErrorBoundary.tsx  # Sentry-aware error boundary
│   │   ├── SentryProvider.tsx       # Client-side Sentry init wrapper
│   │   ├── VoiceSelector.tsx        # TTS voice picker
│   │   └── __tests__/               # Component unit tests
│   ├── contexts/              # React Context providers (all wrap the app in layout.tsx)
│   │   ├── AuthContext.tsx          # User session, profile, sign-in/out
│   │   ├── AccessibilityContext.tsx # Font size & contrast preferences
│   │   ├── DifficultWordsContext.tsx # Per-student difficult word tracking
│   │   ├── GamificationContext.tsx  # Points, streaks, badges
│   │   ├── LanguageContext.tsx      # UI language (en/he/ar)
│   │   ├── ProgressContext.tsx      # Assignment progress cache
│   │   ├── VoiceContext.tsx         # Selected TTS voice
│   │   └── __tests__/               # Context unit tests
│   ├── hooks/
│   │   └── useRoleGuard.ts    # Hook: redirect if wrong role or unauthenticated
│   ├── lib/                   # Shared server + client utilities
│   │   ├── supabase.ts        # Three Supabase clients + helper functions
│   │   ├── admin-auth.ts      # verifyAdminAuth() — Bearer token + is_admin check
│   │   ├── admin.ts           # getServerAdminEmail() helper
│   │   ├── captcha.ts         # verifyRecaptchaToken() — reCAPTCHA v3
│   │   ├── code-auth.ts       # Device fingerprint, login attempt logging, lockout
│   │   ├── csrf.ts            # CSRF token helpers (used by middleware)
│   │   ├── ip-whitelist.ts    # CIDR / wildcard IP allowlist for admin routes
│   │   ├── password-generator.ts # Secure teacher/student code generation
│   │   ├── rate-limit.ts      # In-memory sliding-window rate limiter
│   │   ├── sentry.ts          # Sentry client-side helpers
│   │   ├── translations.ts    # i18n string maps (en/he/ar)
│   │   └── __tests__/         # Lib unit tests
│   ├── middleware.ts          # Next.js Edge Middleware (CSRF + security headers)
│   └── instrumentation.ts    # Next.js instrumentation (Sentry Node/Edge init)
├── supabase/
│   └── schema.sql             # Full PostgreSQL DDL + RLS policies
├── package.json               # Dependencies & scripts
├── package-lock.json          # Lockfile (npm)
├── next.config.ts             # Next.js + Sentry config + CSP headers
├── tailwind.config.ts         # Tailwind theme + content paths
├── tsconfig.json              # TypeScript compiler options
├── jest.config.js             # Jest configuration
├── jest.setup.ts              # Jest setup file
├── eslint.config.mjs          # ESLint flat config
├── postcss.config.mjs         # PostCSS (Tailwind)
├── vercel.json                # Vercel deployment settings
├── .env.example               # Template for all required environment variables
├── instrumentation.ts         # Root Sentry instrumentation entry
├── sentry.client.config.ts    # Sentry browser config
├── sentry.server.config.ts    # Sentry server config
└── sentry.edge.config.ts      # Sentry edge config
```

### Primary Entry Points

| Entry Point | Description |
|---|---|
| `src/app/layout.tsx` | Root layout; wraps entire app in all Context providers |
| `src/app/page.tsx` | Landing page; detects active session and redirects by role |
| `src/middleware.ts` | Edge middleware; runs on `/api/*` and `/admin/*` |
| `instrumentation.ts` | Next.js server/edge Sentry initialisation |
| `src/instrumentation-client.ts` | Next.js client-side Sentry initialisation |

### Environment Variables

All keys referenced in the codebase (values must NOT be stored here):

| Key | Client/Server | Location Referenced | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | `src/lib/supabase.ts`, multiple API routes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | `src/lib/supabase.ts`, multiple API routes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | `src/lib/admin-auth.ts`, `src/app/api/student/join/route.ts`, `src/app/api/admin/setup-profile/route.ts`, `src/app/api/admin/verify-password/route.ts`, `src/app/api/students/[id]/reset-code/route.ts` | Bypasses RLS for admin operations |
| `ADMIN_EMAIL` | Server-only | `src/app/api/admin/validate-email/route.ts`, `src/lib/admin.ts` | The single admin user's email address |
| `NEXT_PUBLIC_APP_URL` | Public (browser) | Referenced in `.env.example` | Full app base URL |
| `NEXT_PUBLIC_SENTRY_DSN` | Public (browser) | `sentry.client.config.ts` | Sentry DSN for browser reporting |
| `SENTRY_DSN` | Server-only | `sentry.server.config.ts`, `sentry.edge.config.ts` | Sentry DSN for server reporting |
| `SENTRY_ORG` | Build-time | `next.config.ts` | Sentry organisation slug |
| `SENTRY_PROJECT` | Build-time | `next.config.ts` | Sentry project slug |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Public (browser) | `src/components/Recaptcha.tsx` | reCAPTCHA v3 site key |
| `RECAPTCHA_SECRET_KEY` | Server-only | `src/app/api/admin/verify-password/route.ts`, `src/lib/captcha.ts` | reCAPTCHA v3 secret |
| `ADMIN_IP_WHITELIST` | Server-only | `src/lib/ip-whitelist.ts`, `src/app/api/admin/setup-profile/route.ts`, `src/app/api/admin/verify-password/route.ts` | Comma-separated IPs/CIDRs; empty = disabled |
| `NODE_ENV` | Runtime | `next.config.ts`, `src/middleware.ts` | `development` / `production` |
| `CI` | Build-time | `next.config.ts` | Suppresses Sentry source-map upload logs in non-CI |
| `NEXT_RUNTIME` | Runtime | `instrumentation.ts` | `nodejs` or `edge` — controls which Sentry SDK is loaded |

---

## 3. DATA MODELS & SCHEMAS

> Source of truth: `supabase/schema.sql`
> Additional tables referenced in application code but not in schema.sql are marked ⚠️ **schema gap**.

### Table: `public.profiles`

Extends `auth.users`. RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Matches Supabase auth UID |
| `email` | `TEXT` | UNIQUE NOT NULL | |
| `full_name` | `TEXT` | nullable | |
| `role` | `TEXT` | NOT NULL, CHECK IN `('teacher', 'student')` | |
| `avatar_url` | `TEXT` | nullable | |
| `student_code` | `TEXT` | UNIQUE, nullable | 8-char code; students only |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `last_login` | `TIMESTAMPTZ` | nullable | |
| `is_admin` | `BOOLEAN` | DEFAULT FALSE (added via ALTER) | Teachers only; grants admin panel access |
| `failed_login_attempts` | `INT` | nullable | Referenced in code; not in original DDL — **schema gap** |
| `locked_until` | `TIMESTAMPTZ` | nullable | Referenced in code; not in original DDL — **schema gap** |

RLS Policies: users can SELECT/INSERT/UPDATE their own row only.

---

### Table: `public.classes`

RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `teacher_id` | `UUID` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `name` | `TEXT` | NOT NULL | |
| `grade_level` | `TEXT` | nullable | e.g. "7", "8", "9" |
| `class_code` | `TEXT` | UNIQUE NOT NULL | Students use this to join |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

RLS: teachers see own classes; students see enrolled classes.

---

### Table: `public.class_enrollments`

RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `class_id` | `UUID` | NOT NULL, FK → `classes(id)` ON DELETE CASCADE | |
| `student_id` | `UUID` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `enrolled_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| — | — | UNIQUE(class_id, student_id) | |

RLS: students see own enrollment rows.

---

### Table: `public.assignments`

RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `teacher_id` | `UUID` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | nullable | |
| `word_ids` | `TEXT[]` | NOT NULL | Array of vocabulary word IDs from `vocabulary.json` |
| `total_words` | `INT` | NOT NULL | |
| `deadline` | `TIMESTAMPTZ` | NOT NULL | |
| `assignment_type` | `TEXT` | DEFAULT `'both'` | `'flashcards'`, `'quiz'`, or `'both'` |
| `allowed_modes` | `TEXT[]` | nullable | Subset of 7 study modes enabled by teacher |
| `custom_words` | `JSONB` | nullable | `[{ word: string, translation: string }]` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

RLS: teachers see own; students see via enrolled class → assignment_classes join.

---

### Table: `public.assignment_classes`

RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `assignment_id` | `UUID` | NOT NULL, FK → `assignments(id)` ON DELETE CASCADE | |
| `class_id` | `UUID` | NOT NULL, FK → `classes(id)` ON DELETE CASCADE | |
| `assigned_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| — | — | UNIQUE(assignment_id, class_id) | |

---

### Table: `public.student_assignment_progress`

RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `student_id` | `UUID` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `assignment_id` | `UUID` | NOT NULL, FK → `assignments(id)` ON DELETE CASCADE | |
| `status` | `TEXT` | DEFAULT `'not_started'`, CHECK IN `('not_started','in_progress','completed')` | |
| `words_learned` | `INT` | DEFAULT 0 | |
| `quiz_score` | `INT` | nullable | NULL until quiz is taken |
| `quiz_taken_at` | `TIMESTAMPTZ` | nullable | |
| `started_at` | `TIMESTAMPTZ` | nullable | |
| `completed_at` | `TIMESTAMPTZ` | nullable | |
| `last_activity` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| — | — | UNIQUE(student_id, assignment_id) | |

RLS: students see own rows; teachers see rows for their assignment's students.

---

### Table: `public.word_progress`

RLS enabled. Implements spaced repetition fields.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `student_id` | `UUID` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `word_id` | `TEXT` | NOT NULL | Vocabulary word ID |
| `assignment_id` | `UUID` | nullable, FK → `assignments(id)` ON DELETE CASCADE | |
| `status` | `TEXT` | DEFAULT `'new'`, CHECK IN `('new','learning','practicing','known','mastered')` | |
| `attempts` | `INT` | DEFAULT 0 | |
| `correct` | `INT` | DEFAULT 0 | |
| `last_reviewed` | `TIMESTAMPTZ` | nullable | |
| `next_review` | `TIMESTAMPTZ` | nullable | Spaced repetition next date |
| `ease_factor` | `DECIMAL` | DEFAULT 2.5 | SM-2 algorithm ease factor |
| `interval` | `INT` | DEFAULT 0 | SM-2 interval in days |
| — | — | UNIQUE(student_id, word_id, assignment_id) | |

---

### Table: `public.learning_activities`

RLS enabled.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `student_id` | `UUID` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `assignment_id` | `UUID` | nullable, FK → `assignments(id)` ON DELETE CASCADE | |
| `activity_type` | `TEXT` | NOT NULL, CHECK IN `('story','listening','sentence_builder','speed_challenge','quiz','flashcard')` | |
| `word_id` | `TEXT` | nullable | |
| `correct` | `BOOLEAN` | nullable | |
| `time_spent_seconds` | `INT` | nullable | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

---

### Table: `public.assignment_stories`

RLS enabled. Caches AI-generated stories.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `assignment_id` | `UUID` | NOT NULL, FK → `assignments(id)` ON DELETE CASCADE | |
| `story_text` | `TEXT` | NOT NULL | Full narrative |
| `highlighted_words` | `JSONB` | nullable | Word position metadata |
| `fill_in_blanks_version` | `TEXT` | nullable | Story with blanks for exercise |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

RLS: visible to assignment's teacher or enrolled students.

---

### Table: `public.approved_teachers`

RLS enabled. OAuth allowlist for Google-sign-in teachers.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `email` | `TEXT` | UNIQUE NOT NULL | |
| `full_name` | `TEXT` | nullable | |
| `is_admin` | `BOOLEAN` | DEFAULT FALSE | |
| `added_by` | `UUID` | nullable, FK → `profiles(id)` ON DELETE SET NULL | Admin who added entry |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

RLS: admins can manage all rows; any authenticated user can SELECT their own email row.

---

### Table: `public.student_mode_progress` ⚠️ schema gap

Referenced in `src/lib/supabase.ts:saveModeProgress()` but **not defined in schema.sql**.

| Field | Type | Inferred From Code | Notes |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `student_id` | `UUID` | FK → `profiles(id)` | |
| `assignment_id` | `UUID` | FK → `assignments(id)` | |
| `mode` | `TEXT` | `'flashcards'`, `'quiz'`, `'matching'`, `'story'`, `'spelling'`, `'scramble'`, `'fill-in-blank'` | |
| `words_studied` | `INT` | | |
| `correct_answers` | `INT` | | |
| `completed` | `BOOLEAN` | | |
| `last_activity` | `TIMESTAMPTZ` | | |

---

### Table: `public.login_attempts` ⚠️ schema gap

Referenced in `src/lib/code-auth.ts:logLoginAttempt()` and `src/app/api/students/[id]/reset-code/route.ts` but **not defined in schema.sql**.

| Field | Type | Inferred From Code | Notes |
|---|---|---|---|
| `id` | implicit | PK | |
| `user_id` | `UUID` | nullable | |
| `code_prefix` | `TEXT` | | First 3 chars of code (privacy) |
| `ip_address` | `TEXT` | | |
| `user_agent` | `TEXT` | | |
| `success` | `BOOLEAN` | | |
| `attempted_at` | `TIMESTAMPTZ` | | Used in ORDER BY |

---

### Table: `public.user_devices` ⚠️ schema gap

Referenced in `src/lib/code-auth.ts:recordDevice()` but **not defined in schema.sql**.

| Field | Type | Inferred From Code | Notes |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → `profiles(id)` | |
| `device_hash` | `TEXT` | | Base64 browser fingerprint |
| `user_agent` | `TEXT` | nullable | |
| `ip_address` | `TEXT` | | |
| `is_new_device` | `BOOLEAN` | | |
| `last_seen` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | | |

---

### TypeScript Interfaces (src/lib/supabase.ts)

```typescript
interface Profile       { id, email, full_name, role: 'teacher'|'student', avatar_url, created_at, last_login, is_admin? }
interface Class         { id, teacher_id, name, grade_level, class_code, created_at }
interface Assignment    { id, teacher_id, title, description, word_ids, total_words, deadline, assignment_type, allowed_modes?, custom_words?, created_at, updated_at }
interface StudentAssignmentProgress { id, student_id, assignment_id, status, words_learned, quiz_score, quiz_taken_at, started_at, completed_at, last_activity }
interface ClassEnrollment { id, class_id, student_id, enrolled_at }
```

---

## 4. API SURFACE

All routes are Next.js App Router Route Handlers under `src/app/api/`.

| Method | Path | File | Auth Required | Rate Limit | Description |
|---|---|---|---|---|---|
| `GET` | `/api/manifest` | `api/manifest/route.ts` | No | No | Returns PWA web app manifest (static, cached 24h) |
| `GET` | `/api/sentry-example-api` | `api/sentry-example-api/route.ts` | No | No | Sentry integration test endpoint; intentionally throws |
| `POST` | `/api/student/join` | `api/student/join/route.ts` | No | Yes — 60/hr per classCode, 20/10min per IP | Creates student auth user + profile + class enrollment; returns `{ studentCode, credentials }` |
| `GET` | `/api/admin/teachers/bulk-create` | `api/admin/teachers/bulk-create/route.ts` | Yes — Bearer + `is_admin` | 30/min per IP | Lists all teachers: `{ approved[], teachers[], codeTeachers[] }` |
| `POST` | `/api/admin/teachers/bulk-create` | `api/admin/teachers/bulk-create/route.ts` | Yes — Bearer + `is_admin` | 10/min per IP | Creates email-based (adds to `approved_teachers`) or code-based (creates auth user + profile) teachers |
| `DELETE` | `/api/admin/teachers/remove?id=&type=` | `api/admin/teachers/remove/route.ts` | Yes — Bearer + `is_admin` | 20/min per IP | Removes teacher; `type=approved` deletes from `approved_teachers`; `type=code` deletes profile + auth user |
| `POST` | `/api/admin/setup-profile` | `api/admin/setup-profile/route.ts` | Yes — Bearer token (own user) | 10/15min per IP | Creates or updates `profiles` row for OAuth user; auto-grants `is_admin` if email matches `ADMIN_EMAIL` |
| `POST` | `/api/admin/verify-password` | `api/admin/verify-password/route.ts` | Yes — session cookie + admin email check | 5/15min per IP; CAPTCHA after 3 failures | Secondary admin auth gate; verifies Supabase password + reCAPTCHA; sets `is_admin=true` |
| `POST` | `/api/admin/validate-email` | `api/admin/validate-email/route.ts` | No | No | Checks if submitted email equals `ADMIN_EMAIL`; returns `{ isAdmin: bool }` without revealing actual email |
| `GET` | `/api/students/[id]/reset-code` | `api/students/[id]/reset-code/route.ts` | Yes — Bearer + teacher/admin; ownership-checked | No | Returns student info for the reset-code flow |
| `POST` | `/api/students/[id]/reset-code` | `api/students/[id]/reset-code/route.ts` | Yes — Bearer + teacher/admin; ownership-checked | No | Generates new student code; updates auth user email+password + profile; logs to `login_attempts` |
| `DELETE` | `/api/students/[id]/reset-code` | `api/students/[id]/reset-code/route.ts` | Yes — Bearer + teacher/admin; ownership-checked | No | Unlocks a locked student account (`failed_login_attempts=0`, `locked_until=null`) |

**Ownership check** on student routes: if caller is a teacher (not admin), verifies student is enrolled in one of that teacher's classes via `class_enrollments → classes.teacher_id`.

---

## 5. SECURITY PROFILE

### Authentication Mechanism

The app uses **Supabase Auth with PKCE flow** (`flowType: "pkce"`). Three independent clients with separate localStorage keys run simultaneously to allow admin + teacher + student sessions to coexist in the same browser tab:

| Client | Storage Key | Auth Method | User Domain |
|---|---|---|---|
| `supabaseAdmin` | `band2-admin-auth` | Google OAuth | Any Google account (must be in `approved_teachers` or match `ADMIN_EMAIL`) |
| `supabaseTeacher` | `band2-teacher-auth` | `signInWithPassword` | `{code}@teacher.band2.app` |
| `supabaseStudent` | `band2-student-auth` | `signInWithPassword` | `s_{code}@student.band2.app` |

Client selection is automatic via `getClientForEmail(email)` and `getClientForRole(role)` in `src/lib/supabase.ts`.

Session detection order in `getActiveSession()`: admin → teacher → student (first found wins).

### Middleware & Route Protection

**File:** `src/middleware.ts`
**Matcher:** `/api/:path*`, `/admin/:path*`

What it does on every matched request:
1. Sets security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
2. For non-GET requests to CSRF-protected routes, validates `csrf_token` cookie against `x-csrf-token` header or request body field using constant-time comparison
3. Generates and sets `csrf_token` cookie (httpOnly, SameSite=lax, 24h) if not already present
4. Exposes CSRF token to client via `X-CSRF-Token` response header

**CSRF-protected routes** (POST/PUT/DELETE only):
- `/api/admin/setup-profile`
- `/api/admin/verify-password`
- `/api/auth/logout`
- `/api/profile`

**CSRF-exempt routes:**
- `/api/auth/callback`
- `/api/admin/setup-profile` (exempt to allow OAuth callback profile creation)

### Authorization Logic

| Guard | Implementation | Scope |
|---|---|---|
| Admin API guard | `verifyAdminAuth(request)` in `src/lib/admin-auth.ts` | Bearer token → `auth.getUser()` → `profiles.role='teacher' AND is_admin=true`; uses service-role client |
| Teacher ownership check | Inline in `/api/students/[id]/reset-code/route.ts` | Verifies `class_enrollments.classes.teacher_id = caller.id` before operating on student |
| Client-side role guard | `useRoleGuard(role, options)` hook in `src/hooks/useRoleGuard.ts` | Checks `profile.role`; redirects to `loginRedirect` if unauthenticated, `unauthorizedRedirect` if wrong role |
| Admin email gate | `getServerAdminEmail()` in `src/lib/admin.ts` | Used in `/api/admin/verify-password` and `/api/admin/setup-profile` to determine `is_admin` assignment |
| Supabase RLS | `supabase/schema.sql` policies | Row-level enforcement: users cannot read/write other users' data at DB layer |

### Rate Limiting

**Implementation:** In-memory sliding-window (`src/lib/rate-limit.ts`) — **not persistent across serverless restarts**.

| Endpoint | Key | Limit | Window |
|---|---|---|---|
| `POST /api/student/join` | `student-join-class:{classCode}` | 60 requests | 1 hour |
| `POST /api/student/join` | `student-join-ip:{ip}` | 20 requests | 10 minutes |
| `GET /api/admin/teachers/bulk-create` | `bulk-create-get:{ip}` | 30 requests | 1 minute |
| `POST /api/admin/teachers/bulk-create` | `bulk-create:{ip}` | 10 requests | 1 minute |
| `DELETE /api/admin/teachers/remove` | `remove-teacher:{ip}` | 20 requests | 1 minute |
| `POST /api/admin/setup-profile` | IP (local impl) | 10 requests | 15 minutes |
| `POST /api/admin/verify-password` | IP (local impl) | 5 requests | 15 minutes |

**Account lockout:** After 5 consecutive failed login attempts, `locked_until` is set to `NOW() + 15min` in `profiles`. Implemented in `src/lib/code-auth.ts:incrementFailedAttempts()`.

### CAPTCHA

reCAPTCHA v3 (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY`) is required by `POST /api/admin/verify-password` after ≥3 failed attempts (`CAPTCHA_THRESHOLD = 3`). Score threshold: `< 0.3` → rejected. Implemented in `src/lib/captcha.ts:verifyRecaptchaToken()`.

### IP Whitelist

Optional. Configured via `ADMIN_IP_WHITELIST` env var (comma-separated IPs, CIDR ranges, wildcards). Applied in `POST /api/admin/setup-profile` and `POST /api/admin/verify-password`. If env var is empty, feature is disabled (all IPs allowed). Implemented in `src/lib/ip-whitelist.ts`.

### Security Headers (next.config.ts — applied globally via `/:path*`)

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' ['unsafe-eval' in dev]; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' *.supabase.co wss://*.supabase.co vitals.vercel-insights.com *.vercel-scripts.com *.vercel.com; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=()` |

`/vocabulary.json` also receives `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.

Middleware additionally injects `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` at the Edge layer (before Next.js response headers) for all `/api/*` and `/admin/*` routes.

### Sentry

Error tracking via `@sentry/nextjs ^10.42.0`. Tunnel route: `/monitoring` (bypasses ad-blockers). Source maps hidden in production. Session replay enabled client-side. Configured in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.

---

## 6. APPLICATION DOMAIN NOTES

- **App name:** Vocaband (PWA manifest) / Band2 (repo name)
- **Purpose:** English vocabulary learning platform for grades 7–9 with Hebrew and Arabic translations
- **User roles:** `admin` (single user, Google OAuth), `teacher` (code-based or Google OAuth), `student` (code-based, no email)
- **Study modes (7 total):** Flashcards, Quiz, Fill-in-Blank, Matching, Spelling Bee, Story, Word Scramble
- **Vocabulary source:** `public/vocabulary.json` (static file, ~28KB, served with 24h cache)
- **Languages:** English (default), Hebrew (`he`), Arabic (`ar`) — controlled by `LanguageContext`
- **Accessibility:** Font-size and contrast preferences stored in `AccessibilityContext`; custom Tailwind tokens `accessibility-sm` through `accessibility-2xl`
- **Gamification:** Points/streaks/badges tracked in `GamificationContext` (client-side only)
- **Spaced repetition:** SM-2 algorithm fields (`ease_factor`, `interval`, `next_review`) on `word_progress` table
