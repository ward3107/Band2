# Vocab Band II - Israeli English Curriculum Learning Platform

A comprehensive web-based vocabulary learning platform designed for Israeli students in grades 7-9, following the national English curriculum. The platform supports both Hebrew and Arabic translations and provides separate interfaces for teachers and students.

## Features

### For Students
- **Interactive Flashcards** - Learn vocabulary with flip animations and text-to-speech pronunciation
- **Quiz Mode** - Test knowledge with multiple-choice questions and instant feedback
- **Assignment System** - Complete teacher-assigned vocabulary assignments with progress tracking
- **Gamification** - Earn points and achievements as you learn
- **Accessibility** - Full support for RTL languages (Hebrew/Arabic), text-to-speech, and customizable UI

### For Teachers
- **Class Management** - Create and manage multiple student classes
- **Assignment Creation** - Design vocabulary assignments from the curriculum word bank
- **Progress Tracking** - Monitor student performance and completion rates
- **Results Dashboard** - View detailed analytics and student results

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Fonts**: Geist, Geist Mono, Heebo (Hebrew), Cairo (Arabic)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project with the following tables:
  - `profiles` (id, email, full_name, role)
  - `classes` (id, teacher_id, name, grade_level)
  - `class_members` (class_id, student_id)
  - `assignments` (id, teacher_id, class_id, words, due_date)
  - `submissions` (id, assignment_id, student_id, status, score, answers)
  - `vocabulary` (word, translations, level, unit)

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

3. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── login/             # Main login page
│   ├── teacher/           # Teacher dashboard and pages
│   └── student/           # Student portal
├── components/            # Reusable React components
├── contexts/              # React context providers
├── lib/                   # Utility functions and configurations
└── styles/                # Global styles
```

## License

Copyright © 2025 Vocab Band II. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.

For licensing inquiries, please contact the repository owner.
