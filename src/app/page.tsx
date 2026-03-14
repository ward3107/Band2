'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/supabase';

export default function LandingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Handle OAuth callback if it lands on home page
  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    if (code || errorParam) {
      router.replace(`/auth/callback${window.location.search}`);
    }
  }, [searchParams, router]);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.is_admin) {
        router.push('/admin/invite-codes');
      } else if (profile.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (profile.role === 'student') {
        router.push('/student');
      }
    }
  }, [authLoading, user, profile, router]);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#101622]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4 h-16">
          <div className="flex items-center gap-2">
            <div className="bg-[#135bec] p-1.5 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-xl font-extrabold tracking-tight">Vocaband</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-slate-600 hover:text-[#135bec] dark:text-slate-400 dark:hover:text-[#135bec]" href="#features">Features</a>
            <a className="text-sm font-semibold text-slate-600 hover:text-[#135bec] dark:text-slate-400 dark:hover:text-[#135bec]" href="#roles">Roles</a>
            <a className="text-sm font-semibold text-slate-600 hover:text-[#135bec] dark:text-slate-400 dark:hover:text-[#135bec]" href="#why">Why Us</a>
          </nav>
          <div className="flex items-center gap-4">
            {user && profile ? (
              <button
                onClick={() => {
                  if (profile.is_admin) router.push('/admin/invite-codes');
                  else if (profile.role === 'teacher') router.push('/teacher/dashboard');
                  else if (profile.role === 'student') router.push('/student');
                }}
                className="bg-[#135bec] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-[#135bec]/20 hover:bg-[#135bec]/90 transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={handleGetStarted}
                  disabled={loading}
                  className="text-slate-700 dark:text-slate-300 text-sm font-bold hover:text-[#135bec] px-4 py-2"
                >
                  {loading ? 'Loading...' : 'Login'}
                </button>
                <button
                  onClick={handleGetStarted}
                  disabled={loading}
                  className="bg-[#135bec] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-[#135bec]/20 hover:bg-[#135bec]/90 transition-all"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        {/* Hero Section */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#135bec]/5 to-transparent pointer-events-none"></div>
        <section className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 bg-[#135bec]/10 text-[#135bec] px-3 py-1 rounded-full w-fit">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span className="text-xs font-bold uppercase tracking-wider">New Interactive Lessons</span>
              </div>
              <div className="flex flex-col gap-4">
                <h1 className="text-slate-900 dark:text-white text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
                  Master your vocabulary <span className="text-[#135bec]">together</span>
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl max-w-lg leading-relaxed">
                  The collaborative platform for students, teachers, and administrators to build language skills through engaging, data-driven experiences.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGetStarted}
                  disabled={loading}
                  className="bg-[#135bec] text-white text-base font-bold px-8 py-4 rounded-xl shadow-xl shadow-[#135bec]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Get Started Free'} <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-base font-bold px-8 py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                  Watch Demo
                </button>
              </div>
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900"></div>
                </div>
                <span>Join 50k+ students and educators worldwide</span>
              </div>
            </div>
            <div className="relative">
              <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border-8 border-white dark:border-slate-800 relative bg-[#135bec]/20 group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#135bec]/30 to-purple-600/30 flex items-center justify-center">
                  <div className="text-center text-white">
                    <span className="material-symbols-outlined text-6xl mb-4">play_circle</span>
                    <p className="text-lg font-semibold">Watch Demo</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Avg. Progress</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">+42% Growth</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="max-w-7xl mx-auto px-4 py-20">
          <div className="flex flex-col items-center text-center gap-4 mb-16">
            <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight md:text-4xl">Choose your role</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-lg">A tailored experience for every member of the learning community.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student */}
            <div className="group bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#135bec] mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">school</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Student</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Practice words, play interactive games, and track your individual mastery levels in real-time.
              </p>
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center text-[#135bec] font-bold gap-1 hover:gap-2 transition-all"
              >
                Get started <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
            {/* Teacher */}
            <div className="group bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">co_present</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Teacher</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Manage classes, create custom word lists, and monitor students&apos; progress with detailed reports.
              </p>
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center text-purple-600 font-bold gap-1 hover:gap-2 transition-all"
              >
                Get started <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
            {/* Administrator */}
            <div className="group bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Administrator</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Oversee school accounts, manage licenses, and view high-level analytics for entire institutions.
              </p>
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center text-orange-600 font-bold gap-1 hover:gap-2 transition-all"
              >
                Get started <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </section>

        {/* Why Vocaband Section */}
        <section id="why" className="bg-slate-900 text-white py-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#135bec]/20 blur-[120px] rounded-full -mr-48 -mt-48"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="flex flex-col gap-12">
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Why Vocaband?</h2>
                <p className="text-slate-400 text-lg leading-relaxed">Designed for every level of the learning journey, our platform combines pedagogical science with modern technology.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 flex flex-col gap-4">
                  <span className="material-symbols-outlined text-[#135bec] text-4xl">auto_fix_high</span>
                  <h3 className="text-xl font-bold">Interactive Learning</h3>
                  <p className="text-slate-400">Gamified exercises that make complex vocabulary acquisition naturally engaging and fun for all ages.</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 flex flex-col gap-4">
                  <span className="material-symbols-outlined text-[#135bec] text-4xl">query_stats</span>
                  <h3 className="text-xl font-bold">Real-time Tracking</h3>
                  <p className="text-slate-400">Instant feedback loops for students and granular performance data for educators to target learning gaps.</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 flex flex-col gap-4">
                  <span className="material-symbols-outlined text-[#135bec] text-4xl">edit_document</span>
                  <h3 className="text-xl font-bold">Custom Curriculum</h3>
                  <p className="text-slate-400">Upload your own textbooks or word lists. Our AI helps generate relevant exercises and definitions instantly.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-5xl mx-auto px-4 py-24 text-center">
          <div className="bg-[#135bec] rounded-[2rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-[#135bec]/40">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-[200px]">language</span>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-8">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">Ready to transform your vocabulary?</h2>
              <p className="text-white/80 text-lg md:text-xl max-w-2xl">Start your 14-day free trial today. No credit card required. Cancel anytime.</p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button
                  onClick={handleGetStarted}
                  disabled={loading}
                  className="bg-white text-[#135bec] text-lg font-bold px-10 py-5 rounded-2xl shadow-lg hover:bg-slate-50 hover:scale-[1.03] transition-all disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Create Free Account'}
                </button>
                <button className="bg-white/10 border border-white/30 backdrop-blur-sm text-white text-lg font-bold px-10 py-5 rounded-2xl hover:bg-white/20 transition-all">
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#101622] border-t border-slate-200 dark:border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
            <div className="col-span-2 lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-[#135bec] p-1 rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[20px]">menu_book</span>
                </div>
                <span className="text-slate-900 dark:text-white text-lg font-extrabold">Vocaband</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs">Empowering the next generation of language learners through collaborative technology and smart data.</p>
              <div className="flex gap-4">
                <a className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#135bec] transition-colors" href="#">
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </a>
                <a className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#135bec] transition-colors" href="mailto:support@vocaband.com">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-bold mb-6">Product</h4>
              <ul className="flex flex-col gap-4 text-slate-500 dark:text-slate-400 text-sm">
                <li><a className="hover:text-[#135bec]" href="#features">Features</a></li>
                <li><a className="hover:text-[#135bec]" href="#roles">Roles</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Integrations</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-bold mb-6">Company</h4>
              <ul className="flex flex-col gap-4 text-slate-500 dark:text-slate-400 text-sm">
                <li><a className="hover:text-[#135bec]" href="#">About Us</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Careers</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Blog</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-bold mb-6">Legal</h4>
              <ul className="flex flex-col gap-4 text-slate-500 dark:text-slate-400 text-sm">
                <li><a className="hover:text-[#135bec]" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Terms of Service</a></li>
                <li><a className="hover:text-[#135bec]" href="#">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-slate-400 text-xs">
            © 2024 Vocaband Learning Systems Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
