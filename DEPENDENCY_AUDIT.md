# Dependency Security & Freshness Audit

**Date:** 2026-03-12
**Project:** Band2 — Vocabulary Learning Platform (`vocab-app`)
**Stack:** Next.js 16.1.6 · React 19 · TypeScript 5.9.3 · Supabase · Sentry
**Audit tool:** `npm audit` (auditReportVersion 2) · `npm outdated`
**Total direct packages audited:** 22 (6 production, 16 dev)
**Total installed packages (incl. transitive):** 926

---

## Section 1 — Outdated Packages

> Packages more than **one major version** behind are flagged as HIGH PRIORITY.

| Package | Current Version | Latest Available | Issue | Severity | Recommended Action |
|---|---|---|---|---|---|
| `@types/node` | 20.19.35 | **25.4.0** | **5 major versions behind** — misses all Node 22/23/24/25 type definitions; TypeScript may report wrong types for built-in APIs | **HIGH** | Bump range to `^22` (current LTS) or `^25` in `package.json`; run `npm install` |
| `jest` | 29.7.0 | **30.x** | 1 major version behind — Jest 30 drops Node 14/16 support, improves ESM handling and performance | **MEDIUM** | Upgrade to `^30` alongside `jest-environment-jsdom@^30` (see Section 2) |
| `jest-environment-jsdom` | 29.7.0 | **30.3.0** | 1 major version behind — required for vulnerability fix (see Section 2) | **MEDIUM** | Upgrade to `^30` — resolves all 4 npm audit findings |
| `react` | 19.2.3 | 19.2.4 | 1 patch release behind | Low | Run `npm install` — semver range `19.2.3` should be loosened to `^19` |
| `react-dom` | 19.2.3 | 19.2.4 | 1 patch release behind | Low | Same as `react` above |
| `@sentry/nextjs` | ~10.42.x | 10.43.0 | 1 minor release behind | Low | Run `npm install` — `^10.42.0` range will pick it up |
| `@supabase/supabase-js` | ~2.98.x | 2.99.1 | 1 minor release behind | Low | Run `npm install` — `^2.98.0` range will pick it up |
| `@types/react` | 19.2.14 | Latest 19.x | Pinned exact version, not a range | Low | Change to `^19` to receive type patches automatically |
| `next` (pinned) | 16.1.6 | 16.1.6 | Up to date | None | No action needed |
| `typescript` | 5.9.3 | 5.9.3 | Up to date | None | No action needed |
| `tailwindcss` | ^4 | ^4 | Up to date | None | No action needed |
| `eslint` | 9.39.3 | Latest 9.x | Up to date | None | No action needed |

---

## Section 2 — Known Vulnerabilities

> Source: `npm audit` (2026-03-12). All 4 findings are in the **dev dependency** chain only; none affect the production bundle.

| Package | Current Version | Vulnerability | Severity | Recommended Action |
|---|---|---|---|---|
| `jest-environment-jsdom` | 29.7.0 | **GHSA-vpq2-c234-7xj6** — Incorrect Control Flow Scoping (CWE-705) via transitive chain: `jest-environment-jsdom` → `jsdom` → `http-proxy-agent` → `@tootallnate/once <3.0.1`. CVSS 3.3 (AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L) | Low | Upgrade `jest-environment-jsdom` to **≥30.3.0** — this is the `fixAvailable` version reported by npm audit. Requires a semver-major bump (`^29` → `^30`) |
| `jsdom` | ≤22.1.0 (transitive) | Inherits vulnerability via `http-proxy-agent` dependency | Low | Resolved by upgrading `jest-environment-jsdom` to 30.3.0 (no direct action needed) |
| `http-proxy-agent` | 4.0.1 – 5.0.0 (transitive) | Inherits vulnerability from `@tootallnate/once` | Low | Resolved by upgrading `jest-environment-jsdom` to 30.3.0 |
| `@tootallnate/once` | <3.0.1 (transitive) | Root cause: GHSA-vpq2-c234-7xj6. Incorrect Control Flow Scoping — can cause `once`-wrapped async functions to resolve or reject multiple times in edge cases | Low | Resolved by upgrading `jest-environment-jsdom` to 30.3.0 |

> **Note:** Zero vulnerabilities were found in the production dependency tree. All 4 issues exist solely in dev tooling (`jest-environment-jsdom`) and pose no runtime risk to end users.

---

## Section 3 — Unused or Redundant Dependencies

| Package | Current Version | Issue | Severity | Recommended Action |
|---|---|---|---|---|
| `@tailwindcss/typography` | 0.5.19 | Registered as a Tailwind plugin in `tailwind.config.ts` but **no `prose` class** (the only activation mechanism) was found anywhere in `src/`. Plugin is loaded, post-processed, and shipped in the CSS bundle without being used | Medium | Audit all templates for prose-class usage. If absent, remove from `package.json` and `tailwind.config.ts` to reduce CSS bundle size |
| `eslint-config-next` | 16.1.6 | Pinned to an exact version (`16.1.6`) matching `next`; safe but unusual. Should be a range for patch auto-updates | Low | Change to `^16` or keep pinned for reproducibility; either is acceptable |
| `@types/react-dom` | ^19 | No direct `import ... from 'react-dom'` found in source. Package provides type stubs used implicitly by Next.js's JSX transform — **not removable** | None | Keep — required by Next.js App Router JSX types |

> **Note:** `react-dom` itself (the runtime package) similarly has no direct imports in application source, but is a required peer dependency of `next` and cannot be removed.

---

## Section 4 — Licensing Risks

| Package | Current Version | License | Issue | Severity | Recommended Action |
|---|---|---|---|---|---|
| `eslint-plugin-no-unsanitized` | ^4.1.5 | **MPL-2.0** (Mozilla Public License 2.0) | Weak copyleft. Requires that modifications to **the MPL-licensed files themselves** be shared under MPL. Does **not** require open-sourcing your own code. Risk is very low for a commercial app because: (1) it is a dev-only tool, never shipped to users; (2) you are unlikely to modify the plugin source | Low | No immediate action required. If you fork or patch the plugin internally, you must publish those changes. Consider noting in internal IP policy. |
| `eslint-plugin-security` | ^4.0.0 | Apache-2.0 | Permissive — patent grant included, no copyleft obligations | None | No action needed |
| `typescript` | 5.9.3 | Apache-2.0 | Permissive — dev tool only, never shipped | None | No action needed |
| `@sentry/nextjs` | ^10.42.0 | MIT | Permissive | None | No action needed |
| `@supabase/supabase-js` | ^2.98.0 | MIT | Permissive | None | No action needed |
| `next` | 16.1.6 | MIT | Permissive | None | No action needed |
| `react` / `react-dom` | 19.2.3 | MIT | Permissive | None | No action needed |
| `tailwindcss` / `@tailwindcss/*` | ^4 / ^0.5 | MIT | Permissive | None | No action needed |
| `jest` / `@testing-library/*` | ^29 / various | MIT | Permissive, dev-only | None | No action needed |
| `eslint` / `eslint-config-next` | ^9 / 16.1.6 | MIT | Permissive, dev-only | None | No action needed |

> No GPL, AGPL, LGPL, SSPL, or other strongly copyleft licenses were found among direct dependencies.

---

## Executive Summary

| Metric | Value |
|---|---|
| **Total direct packages audited** | 22 |
| **Total installed packages (incl. transitive)** | 926 |
| **Total issues found** | 12 |
| **Critical severity** | 0 |
| **High severity** | 1 (`@types/node` 5 major versions behind) |
| **Medium severity** | 3 (`jest`/`jest-environment-jsdom` major behind + `@tailwindcss/typography` unused) |
| **Low severity** | 8 (4 npm audit CVEs dev-only; 3 minor/patch outdated; 1 pin style) |
| **Licensing risks** | 1 Low (MPL-2.0, dev-only) |
| **Production vulnerabilities** | **0** |

### Items Requiring Immediate Action

| Priority | Package | Action |
|---|---|---|
| **HIGH** | `@types/node` | Upgrade range from `^20` to `^22` (or `^25`) in `package.json` |
| **MEDIUM** | `jest-environment-jsdom` | Upgrade from `^29` to `^30` — resolves all 4 `npm audit` findings |
| **MEDIUM** | `jest` | Upgrade from `^29` to `^30` in sync with above |
| **MEDIUM** | `@tailwindcss/typography` | Verify `prose` class usage; remove if unused to trim CSS output |

### Quick Fix Commands

```bash
# Fix HIGH: node types
npm install --save-dev @types/node@^22

# Fix MEDIUM: resolve all 4 audit findings
npm install --save-dev jest@^30 jest-environment-jsdom@^30

# Verify clean audit after changes
npm audit
npm outdated
```
