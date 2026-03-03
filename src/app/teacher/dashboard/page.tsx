'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Class, Assignment } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function TeacherDashboardPage() {
  const { profile, signOut, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/teacher/login',
  });
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!guardLoading && profile?.role === 'teacher') {
      loadData();
    }
  }, [guardLoading, profile]);

  const loadData = async () => {
    if (!profile) return;

    // Check if user is admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', profile.id)
      .single();

    setIsAdmin(profileData?.is_admin || false);

    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });

    setClasses(classesData || []);

    // Load assignments
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });

    setAssignments(assignmentsData || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleCreateAssignment = () => {
    router.push('/teacher/assignments/create');
  };

  if (loading || guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">👩‍🏫</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Teacher Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome, {profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <a
                  href="/admin/teachers"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                >
                  Admin Panel
                </a>
              )}
              <a
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                View Student App →
              </a>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📚</div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{classes.length}</div>
                <div className="text-gray-600 dark:text-gray-400">Classes</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{assignments.length}</div>
                <div className="text-gray-600 dark:text-gray-400">Assignments</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👨‍🎓</div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {classes.reduce((sum, c) => sum + ((c as Class & { student_count?: number }).student_count ?? 0), 0)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Classes */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
            <button
              onClick={() => router.push('/teacher/classes/create')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              + Create Class
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No classes yet. Create your first class to get started!</p>
              <button
                onClick={() => router.push('/teacher/classes/create')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                Create Your First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{cls.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Class Code: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cls.class_code}</span></p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Assignments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Assignments</h2>
            <button
              onClick={handleCreateAssignment}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              + Create Assignment
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No assignments yet. Create your first assignment!</p>
              <button
                onClick={handleCreateAssignment}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Create Assignment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {assignment.total_words} words • Due: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/teacher/assignments/${assignment.id}/results`}
                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                      >
                        Results
                      </a>
                      <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
