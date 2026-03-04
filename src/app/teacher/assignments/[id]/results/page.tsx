'use client';

import { useEffect, useState, use } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface StudentProgress {
  id: string;
  student_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  words_learned: number;
  quiz_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity: string;
  student: {
    full_name: string | null;
    email: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  total_words: number;
  deadline: string;
}

const STATUS_ORDER = { not_started: 0, in_progress: 1, completed: 2 };

function sendWhatsAppReminder(assignmentTitle: string, deadline: string, completed: number, total: number) {
  const msg =
    `📚 Reminder: "${assignmentTitle}" is due ${new Date(deadline).toLocaleDateString()}.\n\n` +
    `${completed}/${total} students have completed it. Please finish before the deadline!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

export default function AssignmentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { profile, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/teacher/login',
  });
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'teacher') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('teacher_id', profile!.id)
        .single();

      if (!assignmentData) {
        router.push('/teacher/dashboard');
        return;
      }

      setAssignment(assignmentData);

      const { data: progressData } = await supabase
        .from('student_assignment_progress')
        .select('*, student:profiles(full_name, email)')
        .eq('assignment_id', resolvedParams.id);

      // Sort: not_started first → in_progress → completed
      const sorted = (progressData || []).sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      );
      setStudents(sorted);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      default: return 'Not Started';
    }
  };

  const completedCount = students.filter(s => s.status === 'completed').length;
  const completionRate = students.length ? Math.round((completedCount / students.length) * 100) : 0;
  const scores = students.filter(s => s.quiz_score !== null).map(s => s.quiz_score!);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  if (guardLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Assignment not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shrink-0"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {assignment.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {assignment.total_words} words • Due {new Date(assignment.deadline).toLocaleDateString()}
                </p>
              </div>
            </div>
            {/* WhatsApp Reminder button */}
            <button
              onClick={() => sendWhatsAppReminder(assignment.title, assignment.deadline, completedCount, students.length)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Reminder
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{students.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{completionRate}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {students.filter(s => s.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {avgScore ?? '-'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quiz Score</div>
          </div>
        </div>

        {/* Student Progress List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student Progress</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">Sorted by priority (not started first)</span>
          </div>
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              No students have been assigned this work yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {students.map((student) => {
                const wordPct = assignment.total_words ? (student.words_learned / assignment.total_words) * 100 : 0;
                return (
                  <div key={student.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {student.student.full_name || student.student.email}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {student.student.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Words</div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {student.words_learned}/{assignment.total_words}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {student.quiz_score ?? '-'}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                          {getStatusLabel(student.status)}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${student.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${wordPct}%` }}
                        />
                      </div>
                    </div>
                    {student.last_activity && (
                      <div className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                        Last activity: {new Date(student.last_activity).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
