'use client';

import { useEffect, useState } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface Class {
  id: string;
  name: string;
  class_code: string;
  grade_level: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  total_words: number;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed';
  words_learned: number;
  quiz_score: number | null;
  class_name: string;
}

export default function StudentDashboardPage() {
  const { user, profile, signOut, loading: guardLoading } = useRoleGuard('student', {
    loginRedirect: '/login?redirect=/student',
    unauthorizedRedirect: '/student/join-class',
  });
  const router = useRouter();
  const { t } = useLanguage();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'student') {
      loadData();
    }
  }, [user, profile]);

  const loadData = async () => {
    try {
      // Query 1: Get enrolled classes with class details in one join
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('classes(id, name, class_code, grade_level)')
        .eq('student_id', user!.id);

      const enrolledClasses: Class[] = (enrollments || [])
        .map(e => {
          const cls = e.classes;
          if (cls && typeof cls === 'object' && !Array.isArray(cls)) return cls as Class;
          if (Array.isArray(cls) && cls.length > 0) return cls[0] as Class;
          return null;
        })
        .filter((c): c is Class => c !== null);

      setClasses(enrolledClasses);

      if (enrolledClasses.length === 0) {
        setLoading(false);
        return;
      }

      const classIds = enrolledClasses.map(c => c.id);
      const classNameById = new Map(enrolledClasses.map(c => [c.id, c.name]));

      // Query 2: Get assignments with class mapping and student progress in one join
      const { data: assignmentLinks } = await supabase
        .from('assignment_classes')
        .select('class_id, assignments(id, title, description, total_words, deadline)')
        .in('class_id', classIds);

      if (!assignmentLinks || assignmentLinks.length === 0) {
        setLoading(false);
        return;
      }

      // Deduplicate assignments and map class names
      const assignmentMap = new Map<string, Assignment>();
      assignmentLinks.forEach(link => {
        const a = link.assignments;
        if (!a || typeof a !== 'object') return;
        const assignment = Array.isArray(a) ? a[0] : a;
        if (!assignment?.id) return;
        if (!assignmentMap.has(assignment.id)) {
          assignmentMap.set(assignment.id, {
            ...assignment,
            status: 'not_started' as const,
            words_learned: 0,
            quiz_score: null,
            class_name: classNameById.get(link.class_id) || 'Unknown Class',
          });
        }
      });

      const assignmentIds = Array.from(assignmentMap.keys());

      // Query 3 (small, targeted): Get progress only for this student's assignments
      const { data: allProgress } = await supabase
        .from('student_assignment_progress')
        .select('assignment_id, status, words_learned, quiz_score')
        .eq('student_id', user!.id)
        .in('assignment_id', assignmentIds);

      (allProgress || []).forEach(p => {
        const a = assignmentMap.get(p.assignment_id);
        if (a) {
          a.status = p.status;
          a.words_learned = p.words_learned || 0;
          a.quiz_score = p.quiz_score;
        }
      });

      const finalAssignments = Array.from(assignmentMap.values())
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      setAssignments(finalAssignments);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }

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
      case 'completed': return t('assignmentCompleted');
      case 'in_progress': return t('assignmentInProgress');
      default: return t('assignmentNotStarted');
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (guardLoading || loading) {
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
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('studentDashboard')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('welcome')}, {profile?.full_name || t('roleStudent')}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/"
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t('practiceMode')}
              </a>
              <button
                onClick={async () => { await signOut(); router.push('/'); }}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium"
              >
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Classes */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('myClasses')}</h2>
          {classes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📚</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('noClasses')}
              </p>
              <a
                href="/student/join-class"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {t('joinYourFirstClass')}
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {cls.name}
                  </h3>
                  {cls.grade_level && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('grade')} {cls.grade_level}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">
                    {t('classCode')}: {cls.class_code}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Assignments */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('myAssignments')}</h2>
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 dark:text-gray-400">
                {classes.length === 0
                  ? t('joinClassFirst')
                  : t('noAssignments')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {assignment.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                          {getStatusLabel(assignment.status)}
                        </span>
                        {isOverdue(assignment.deadline) && assignment.status !== 'completed' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            {t('assignmentOverdue')}
                          </span>
                        )}
                      </div>
                      {assignment.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {assignment.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {assignment.class_name} • {assignment.words_learned}/{assignment.total_words} {t('words')}
                      </p>
                      <p className={`text-sm ${isOverdue(assignment.deadline) && assignment.status !== 'completed' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-500'}`}>
                        {t('due')}: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={`/student/assignments/${assignment.id}`}
                      className="w-full sm:w-auto sm:ml-4 text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shrink-0"
                    >
                      {assignment.status === 'completed' ? t('reviewAssignment') : t('startAssignment')}
                    </a>
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
