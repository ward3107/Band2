# Implementation Plan: Teacher Dashboard Redesign

**Date:** 2026-03-14
**Plan Status:** Ready for Execution

---

## Overview

Complete redesign of the teacher dashboard with a polished, modern UI. The hybrid approach preserves all core functionality while adding visual polish.

**Design Document:** `docs/superpowers/specs/2026-03-14-teacher-dashboard-redesign.md`

## Component Architecture

```
src/app/teacher/dashboard/
├── page.tsx                    # Main dashboard page (orchestrator)
├── _components/
    │   ├── TeacherHeader.tsx       # Top nav
    │   ├── StatsGrid.tsx           # Stat cards
    │   ├── ClassCard.tsx           # Class cards
    │   ├── RecentActivity.tsx     # Activity feed
    │   └── BottomNav.tsx          # Mobile navigation
```

---

## Phase 1: Update Tailwind Config

**Goal:** Add new purple color scheme to tailwind

**Files:**
- `tailwind.config.ts` - Add purple color palette

- `src/app/globals.css` - Add Inter font import (or self-host)

**Tasks:**
- [ ] Update colors and add new font
 typography
- [ ] Update tailwind config object with new purple color palette
- [ ] Test that styles compile correctly

- [ ] Update `globals.css` if dark mode support changes

- [ ] Verify the new palette works

**Tests:**
- Visual check of all files for color references

- Visual check that classes compile correctly

---

## Phase 2: Create Shared components

**Goal:** Create reusable UI components for the new design

**Files:**
- `src/app/teacher/dashboard/_components/TeacherHeader.tsx`
- `src/app/teacher/dashboard/_components/StatsGrid.tsx`
- `src/app/teacher/dashboard/_components/ClassCard.tsx`
- `src/app/teacher/dashboard/_components/RecentActivity.tsx`
- `src/app/teacher/dashboard/_components/BottomNav.tsx`

**Tests:**
- [ ] Component renders correctly
- [ ]] Check dark mode classes compile correctly
- [ ]] Check responsive layout on mobile

- [ ]] Check that props are passed correctly
- [ ]] Check that icons display correctly

- [ ]] Check that click handlers work as expected

- [ ]] Check that navigation works correctly

- [ ]] Test accessibility

- [ ]] Verify existing features still work

  - Class management modal
  - Theme toggle
  - Language switcher
  - Sign out

---

## Phase 3: Update main dashboard page
**Goal:** Replace the current dashboard page with the new design
**Files:**
- `src/app/teacher/dashboard/page.tsx`

**Tests:**
- [ ] All existing tests still pass
- [ ]] Create basic integration test for the page
- [ ]] Create visual regression test for the page
- [ ]] Manual visual review for responsive behavior

- [ ]] Manual accessibility check
- [ ]] Verify all components render correctly
- [ ]] Verify dark mode classes compile correctly
- [ ]] Verify all features still work:
  - All existing class management still works
  - Create assignment flow
  - Student management modal
  - All existing data loads correctly

  - All existing delete functionality preserved
  - All existing features accessible
  - Theme toggle works
  - Mobile navigation visible and responsive
- Sign out redirects work correctly
- [ ]] Check that user is redirected to login page when not logged in
- [ ]] Check that loading states are correct
- [ ]] Verify profile dropdown menu works
- [ ]] Check that sign out redirects to login page
- [ ]] Test that the "Create Assignment" button opens correct page
  - [ ]] Test that "Manage" button opens student management
  - [ ]] Test that activity feed displays correctly
  - [ ]] Test mobile navigation renders correctly
  - [ ]] Test that bottom nav is hidden on desktop
  - [ ]] Verify page loads without errors
  - [ ]] Commit after each section
  - [ ]] Run full build and verify everything works
  - [ ]] Deploy to preview
  - [ ]] Create PR for updates

  - [ ]] Request code review
  - [ ]] Document new features
  - [ ]] Any other tasks from this plan should minor

  - [ ]] Add review/ testing steps to phase
    description
  ]
  - [ ]] Progress indicators for good completion estimates vs. complex ones
  - [ ]] Use simple percentage text (e.g., "75% complete")
  - [ ]] Verify "View All" and "View Class" links work
  - [ ]] Test "Create Class" button opens student management modal
  - [ ]] Verify modal opens and students table
  - [ ]] Test modal interactions
  - [ ]] Test accessibility: keyboard navigation, screen reader support, screen reader support
  - [ ]] Verify responsive breakpoints work correctly
    description: Test that mobile bottom nav is hidden on desktop (use visibility check
    expected: isVisible on desktop, hidden on mobile; visible
  }
]
