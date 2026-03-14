'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Profile } from '@/lib/supabase';

interface TeacherHeaderProps {
  profile: Profile | null;
  onSignOut: () => void;
}

export function TeacherHeader({ profile, onSignOut }: TeacherHeaderProps) {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark');
      setShowThemeMenu(false);
    }
  };

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-primary/20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/teacher/dashboard" className="flex items-center gap-3">
          <div className="size-10 bg-gradient-to-br from-primary to-blue-500 rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Vocaband</span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Theme Toggle */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/10 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined dark:hidden">dark_mode</span>
              <span className="material-symbols-outlined hidden dark:block">light_mode</span>
            </button>
            {showThemeMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-primary/20 min-w-[120px] overflow-hidden">
                <button
                  onClick={toggleDarkMode}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/10 rounded-full transition-colors relative"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {/* Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="size-10 rounded-full bg-primary/20 border-2 border-primary/40 overflow-hidden flex items-center justify-center"
              aria-label="Profile menu"
            >
              {profile?.full_name?.[0] ? (
                <span className="text-sm font-bold text-primary">{profile.full_name[0]}</span>
              ) : (
                <span className="material-symbols-outlined text-primary text-lg">person</span>
              )}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-primary/20 z-10">
                <div className="p-2">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-primary/10">
                    <p className="font-semibold text-slate-900 dark:text-white">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      router.push('/teacher/classes/create');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Create Class
                  </button>
                  <button
                    onClick={() => {
                      router.push('/teacher/assignments/create');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Create Assignment
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
