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
    // Load assignment details
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

    // Load student progress
    const { data: progressData } = await supabase
      .from('student_assignment_progress')
      .select('*, student:profiles(full_name, email)')
      .eq('assignment_id', resolvedParams.id);

    setStudents(progressData || []);
    setLoading(false);
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

  const getCompletionRate = () => {
    if (students.length === 0) return 0;
    const completed = students.filter(s => s.status === 'completed').length;
    return Math.round((completed / students.length) * 100);
  };

  const getAverageScore = () => {
    const scores = students.filter(s => s.quiz_score !== null).map(s => s.quiz_score!);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {assignment.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {assignment.total_words} words • Due {new Date(assignment.deadline).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{students.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{getCompletionRate()}%</div>
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
              {getAverageScore() ?? '-'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quiz Score</div>
          </div>
        </div>

        {/* Student Progress List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student Progress</h2>
          </div>
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              No students have been assigned this work yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {students.map((student) => (
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
                        <div className="text-xs text-gray-600 dark:text-gray-400">Words</div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {student.words_learned}/{assignment.total_words}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Score</div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {student.quiz_score ?? '-'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </div>
                  </div>
                  {student.last_activity && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                      Last activity: {new Date(student.last_activity).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
