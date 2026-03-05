'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Class, Assignment } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/useRoleGuard';

function sendClassViaWhatsApp(className: string, classCode: string) {
  const joinUrl = `${window.location.origin}/join?code=${classCode}`;
  const message = `Hi! Join my English class "${className}" on Vocab Band II.\n\nClass code: *${classCode}*\n\nOr tap this link to join directly: ${joinUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

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

  const [totalStudents, setTotalStudents] = useState(0);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Run independent queries in parallel
      const [adminResult, classesResult, assignmentsResult] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', profile.id).single(),
        supabase.from('classes').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      ]);

      setIsAdmin(adminResult.data?.is_admin || false);
      setClasses(classesResult.data || []);
      setAssignments(assignmentsResult.data || []);

      // Student count depends on classes result
      if (classesResult.data && classesResult.data.length > 0) {
        const classIds = classesResult.data.map(c => c.id);
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds);

        setTotalStudents(count ?? 0);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleCreateAssignment = () => {
    router.push('/teacher/assignments/create');
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment? This will also remove all student progress for it.')) return;

    setDeletingId(assignmentId);
    try {
      // Delete related records first, then the assignment
      await Promise.all([
        supabase.from('student_assignment_progress').delete().eq('assignment_id', assignmentId),
        supabase.from('assignment_classes').delete().eq('assignment_id', assignmentId),
      ]);
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('teacher_id', profile!.id);

      if (error) throw error;
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert('Failed to delete assignment. Please try again.');
    }
    setDeletingId(null);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl shrink-0">👩‍🏫</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Teacher Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome, {profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <a
                  href="/admin/teachers"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  Admin Panel
                </a>
              )}
              <a
                href="/"
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Student View →
              </a>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium"
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
                  {totalStudents}
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
                    <button
                      onClick={() => sendClassViaWhatsApp(cls.name, cls.class_code)}
                      className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1"
                      title="Share class code via WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Share
                    </button>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {assignment.total_words} words • Due: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/teacher/assignments/${assignment.id}/results`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                      >
                        Results
                      </a>
                      <a
                        href={`/teacher/assignments/${assignment.id}/edit`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                      >
                        Edit
                      </a>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={deletingId === assignment.id}
                        className="flex-1 sm:flex-none px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {deletingId === assignment.id ? 'Deleting...' : 'Delete'}
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
