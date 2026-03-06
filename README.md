# Vocab Band II - Israeli English Curriculum Learning Platform

A web-based vocabulary learning platform designed for Israeli students in grades 7-9, following the national English curriculum. Supports Hebrew and Arabic translations with separate interfaces for teachers and students.

## Features

### For Students
- **7 Interactive Study Modes** - Flashcards, quiz, fill-in-the-blank, matching, story reading, spelling, and word scramble
- **Spaced Repetition** - SuperMemo-2 algorithm tracks per-word mastery and schedules reviews
- **No Account Needed** - Join a class with a code and display name; receive a personal code for future logins
- **Gamification** - XP, levels, daily streaks, and 13 unlockable achievements
- **Accessibility** - RTL support (Hebrew/Arabic), text-to-speech, adjustable font size, high contrast mode

### For Teachers
- **Class Management** - Create classes with auto-generated join codes, share via WhatsApp
- **Assignment Builder** - Select curriculum words or add custom word pairs, choose allowed study modes, set deadlines
- **Progress Dashboard** - Track student scores, words learned, and completion rates
- **Teacher Codes** - Optional code-based login (no email required)

### Admin
- **Teacher Allowlist** - Control who can sign up as a teacher via Google OAuth
- **Bulk Operations** - Import teachers from CSV, generate teacher codes, export lists

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Google OAuth with PKCE, email/password, code-based)
- **Testing**: Jest, React Testing Library
- **Fonts**: Geist, Geist Mono, Heebo (Hebrew), Cairo (Arabic)

## Authentication Flows

| Flow | Who | How |
|------|-----|-----|
| **Class Code Join** | New students | Enter class code + name → get personal code (no email needed) |
| **Personal Code** | Returning students | Enter 8-character code to sign back in |
| **Google OAuth** | Teachers | Must be on the approved teachers list |
| **Teacher Code** | Teachers | 4-8 character code login (no email needed) |
| **Email/Password** | Both | Standard sign-up with role selection |

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Users (id, email, full_name, role, student_code, is_admin) |
| `classes` | Teacher-created classes with unique join codes |
| `class_enrollments` | Student-to-class memberships |
| `assignments` | Vocabulary assignments (word_ids, type, modes, custom_words, deadline) |
| `assignment_classes` | Assignment-to-class links |
| `student_assignment_progress` | Per-student assignment status and scores |
| `word_progress` | Per-word spaced repetition data (ease_factor, interval, next_review) |
| `learning_activities` | Activity log by type |
| `assignment_stories` | Cached AI-generated stories for story mode |
| `approved_teachers` | Email allowlist for Google OAuth teacher sign-up |

All tables use Row Level Security (RLS) policies.

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ward3107/Band2.git
cd Band2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables — create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Set up the database — run `supabase/schema.sql` in the Supabase SQL Editor.

5. Enable Google OAuth in Supabase Dashboard → Authentication → Providers → Google.

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home (role selector, student/teacher login)
│   ├── login/                    # Email/password login
│   ├── join/                     # Student class join (no account needed)
│   ├── auth/
│   │   ├── callback/             # Google OAuth PKCE callback
│   │   └── complete-profile/     # Post-OAuth profile setup
│   ├── student/
│   │   ├── page.tsx              # Student dashboard
│   │   ├── assignments/[id]/     # Assignment study page (7 modes)
│   │   └── join-class/           # Join class with personal code
│   ├── teacher/
│   │   ├── dashboard/            # Teacher dashboard
│   │   ├── classes/create/       # Create class
│   │   └── assignments/
│   │       ├── create/           # Create/edit assignment
│   │       └── [id]/
│   │           ├── edit/         # Edit assignment
│   │           └── results/      # View student results
│   ├── admin/teachers/           # Manage approved teachers
│   └── api/
│       ├── student/join/         # Student join endpoint
│       ├── teacher/login/        # Teacher code login
│       └── admin/teachers/       # Bulk create/remove teachers
├── components/
│   ├── FlashcardMode.tsx         # Flip cards with TTS
│   ├── QuizMode.tsx              # Multiple choice
│   ├── FillInBlankMode.tsx       # Sentence completion
│   ├── MatchingMode.tsx          # Word-translation matching
│   ├── StoryMode.tsx             # Read stories with vocab
│   ├── SpellingMode.tsx          # Spell from audio
│   └── WordScrambleMode.tsx      # Unscramble letters
├── contexts/
│   ├── AuthContext.tsx            # Auth state & session management
│   ├── LanguageContext.tsx        # i18n (en/he/ar) with RTL
│   ├── ProgressContext.tsx        # SuperMemo-2 word progress
│   ├── GamificationContext.tsx    # XP, levels, achievements, streaks
│   ├── VoiceContext.tsx           # Text-to-speech
│   ├── AccessibilityContext.tsx   # Font size, contrast, motion
│   └── DifficultWordsContext.tsx  # Frequently-missed words
├── hooks/
│   └── useRoleGuard.ts           # Route protection by role
└── lib/
    ├── supabase.ts               # Client, types, auth helpers
    ├── translations.ts           # UI strings (en/he/ar)
    └── rate-limit.ts             # API rate limiting
```

## License

Copyright 2025 Vocab Band II. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited. For licensing inquiries, contact the repository owner.
