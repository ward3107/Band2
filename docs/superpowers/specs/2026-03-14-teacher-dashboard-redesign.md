# Teacher Dashboard Redesign Specification

**Date:** 2026-03-14
**Status:** Draft
**Author:** Claude

## Overview

Complete redesign of the teacher dashboard with a polished, modern UI using the hybrid approach that preserves all core functionality while adding visual polish.

## Design Decisions

### Scope
- **Hybrid approach** - Keep all core functionality, add visual polish on top
- **Polished but simpler** - Modern look with new color scheme and icon system, without complex elements (progress bars, detailed avatars)
- **Mobile nav** - Yes, sticky bottom nav for mobile thumb access

### Component Architecture

```
TeacherDashboard/
├── page.tsx           # Main dashboard page (orchestrator)
├── components/
│   ├── TeacherHeader.tsx      # Top nav with logo, theme toggle, profile
│   ├── StatsGrid.tsx        # 4 stat cards
│   ├── ClassCard.tsx          # Class cards with simplified progress
│   ├── RecentActivity.tsx    # Activity feed
│   └── BottomNav.tsx         # Mobile bottom navigation
```

### Key Visual Elements

1. **Header:**
   - Purple gradient logo icon
   - Language switcher (reuse existing LanguageSwitcher)
   - Theme toggle
   - Profile avatar

2. **Hero Section:**
   - Purple gradient background
   - Welcome message with teacher name
   - "Create Assignment" CTA button

3. **Stats Grid (4 cards):**
   - Active Students
   - Pending Tasks (assignments pending review)
   - Class Average (calculated from completed assignments)
   - New Words (total words in active assignments)

4. **Classes Section:**
   - Class cards in grid layout
   - Each card has:
     - Gradient header with class name
     - Student count + group info
     - Simple progress indicator (percentage text)
     - Manage button

5. **Recent Activity:**
   - Simplified feed with icons
   - Shows recent quiz completions, new student joins

6. **Bottom Nav:**
   - Fixed at bottom for mobile (< 768px)
   - 5 tabs: Dashboard, Classes, Tasks, Reports, Settings
   - Hidden on desktop (>= 768px)

### What's Changing

| From | To |
|-----|-----|
| Online students section | Removed (can re-add later if needed) |
| Student codes table | Moved to a drawer/modal triggered by "Manage" button |
| Emojis for icons | Material Symbols icons |
| Indigo color scheme | Purple (#7b25f4) with blue accents |
| Basic stat cards | Polished stat cards with icons |
| Simple class cards | Enhanced cards with gradients |
| Emoji-based UI | Icon-based UI throughout |

### Data Requirements

- **Class progress** - Derive from assignment completion rates
- **Recent activity** - Use existing assignment/quiz data as activity source
- **Stats** - Most data already exists, just need new calculations

### Component Details

#### TeacherHeader
- Logo with gradient background
- LanguageSwitcher component (reuse existing)
- Theme toggle button
- Notifications bell (placeholder)
- Profile avatar with dropdown

#### StatsGrid
- 4 cards in responsive grid
- Each card has: icon, label, value
- Hover effects

#### ClassCard
- Gradient header (random color per class)
- Class name, student count, group
- Progress indicator (text-based: "75% complete")
- Manage button → opens student management modal/drawer

#### RecentActivity
- List of recent activities
- Icons for different activity types
- Timestamps (relative time)

#### BottomNav
- 5 navigation items
- Active state highlighting
- Responsive visibility (hidden on desktop)

### Responsive Behavior

- **Mobile (< 768px):** Bottom nav visible, single column layout
- **Tablet (768-1024px):** 2-column grid for classes
- **Desktop (> 1024px):** Bottom nav hidden, 2+ column grid

## Next Steps

1. Update Tailwind config with new color palette
2. Create TeacherHeader component
3. Create StatsGrid component
4. Create ClassCard component
5. Create RecentActivity component
6. Create BottomNav component
7. Update main dashboard page to use new components
8. Test responsive behavior
9. Add dark mode support
