'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Class, Assignment } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// Components
import { TeacherHeader } from './_components/TeacherHeader';
import { StatsGrid } from './_components/StatsGrid';
import { ClassCard } from './_components/ClassCard';
import { RecentActivity } from './_components/RecentActivity';
import { BottomNav } from './_components/BottomNav';

// Types
interface StatCardData {
  icon: string;
  label: string;
  value: string | number;
}

interface ActivityItem {
  icon: string;
  title: string;
  description: string;
  time: string;
}

// Bottom Nav Items
const bottomNavItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/teacher/dashboard' },
  { icon: 'group', label: 'Classes', href: '/teacher/classes/create' },
  { icon: 'assignment', label: 'Tasks', href: '/teacher/assignments/create' },
  { icon: 'analytics', label: 'Reports', href: '#' },
  { icon: 'settings', label: 'Settings', href: '#' },
];

export default function TeacherDashboardPage() {
  const { profile, signOut, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/',
  });
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (!guardLoading && profile?.role === 'teacher') {
      loadData();
    }
  }, [guardLoading, profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      const [adminResult, classesResult, assignmentsResult] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', profile.id).single(),
        supabase.from('classes').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      ]);

      setIsAdmin(adminResult.data?.is_admin || false);
      setClasses(classesResult.data || []);
      setAssignments(assignmentsResult.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Calculate stats
  const stats: StatCardData[] = [
    { icon: 'groups', label: 'Active Students', value: classes.length * 32 }, // Placeholder calculation
    { icon: 'clipboard-list', label: 'Pending Tasks', value: assignments.length },
    { icon: 'trending-up', label: 'Class Avg.', value: '88%' },
    { icon: 'menu_book', label: 'New Words', value: assignments.reduce((sum, a) => sum + (a.total_words || 0), 0) },
  ];

  // Generate recent activity (simplified)
  const recentActivity: ActivityItem[] = [
    { icon: 'description', title: 'Vocabulary Quiz #4 Graded', description: 'Advanced English 101', time: '2 hours ago' },
    { icon: 'person_add', title: '3 New Students Joined', description: 'Creative Writing', time: '5 hours ago' },
    { icon: 'star', title: 'Weekly Milestone Achieved', description: 'Top 5% performers announced', time: 'Yesterday' },
  ];

  // Calculate student completion rate (placeholder)
  const studentCompletionRate = 84;

  if (loading || guardLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 pb-24 md:pb-8">
      {/* Header */}
      <TeacherHeader profile={profile} onSignOut={handleSignOut} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Hero */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-600 p-8 text-white shadow-xl shadow-primary/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name?.split(' ')[0] || 'Teacher'}!</h2>
              <p className="text-white/90 text-lg">
                Your students have completed {studentCompletionRate}% of their weekly vocabulary goals.
              </p>
            </div>
            <button
              onClick={() => router.push('/teacher/assignments/create')}
              className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg font-bold hover:bg-slate-50 transition-all shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Create Assignment
            </button>
          </div>
          {/* Decorative circle */}
          <div className="absolute -top-12 -right-12 size-64 bg-white/10 rounded-full blur-3xl"></div>
        </section>

        {/* Stats Grid */}
        <section>
          <StatsGrid stats={stats} />
        </section>

        {/* Active Classes Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Active Classes</h3>
            <button className="text-primary font-semibold text-sm hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classes.length === 0 ? (
              <div className="col-span-2 bg-white dark:bg-slate-900/50 rounded-xl p-8 text-center border border-slate-200 dark:border-primary/10">
                <p className="text-slate-500 dark:text-slate-400 mb-4">No classes yet. Create your first class to get started!</p>
                <button
                  onClick={() => router.push('/teacher/classes/create')}
                  className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Class
                </button>
              </div>
            ) : (
              classes.map((cls, index) => (
                <ClassCard
                  key={cls.id}
                  id={cls.id}
                  name={cls.name}
                  studentCount={32} // Placeholder
                  progressPercent={75} // Placeholder
                  gradientIndex={index}
                  onManageClick={() => router.push('/teacher/classes/create')}
                />
              ))
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <RecentActivity activities={recentActivity} />
        </section>

        {/* My Assignments Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">My Assignments</h3>
            <button
              onClick={() => router.push('/teacher/assignments/create')}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              + Create Assignment
            </button>
          </div>
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-8 text-center border border-slate-200 dark:border-primary/10">
              <p className="text-slate-500 dark:text-slate-400 mb-4">No assignments yet. Create your first assignment!</p>
              <button
                onClick={() => router.push('/teacher/assignments/create')}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Create Assignment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="bg-white dark:bg-slate-900/50 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-primary/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{assignment.title}</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                        {assignment.total_words} words • Due: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/teacher/assignments/${assignment.id}/results`}
                        className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Results
                      </a>
                      <a
                        href={`/teacher/assignments/${assignment.id}/edit`}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Edit
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
