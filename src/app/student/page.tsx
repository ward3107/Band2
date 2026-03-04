'use client';

import { useEffect, useState } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';

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
  const { user, profile, loading: guardLoading } = useRoleGuard('student', {
    loginRedirect: '/',
    unauthorizedRedirect: '/teacher/dashboard',
  });
  const router = useRouter();
  const { t } = useLanguage();
  const { difficultWords } = useDifficultWords();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'student') {
      loadData();
    }
  }, [user, profile]);

  const loadData = async () => {
    let enrolledClasses: Class[] = [];

    try {
      // Load enrolled classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', user!.id);

      if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id);

        const { data: classesData } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds);

        enrolledClasses = (classesData || []) as Class[];
      }

      setClasses(enrolledClasses);

      // Load assignments from enrolled classes
      if (enrolledClasses.length > 0) {
        const classIds = enrolledClasses.map(c => c.id);

        const { data: assignmentLinks } = await supabase
          .from('assignment_classes')
          .select('assignment_id')
          .in('class_id', classIds);

        const assignmentIds = assignmentLinks?.map(link => link.assignment_id) || [];

        if (assignmentIds.length > 0) {
          const { data: assignmentsData } = await supabase
            .from('assignments')
            .select('*')
            .in('id', assignmentIds)
            .order('deadline', { ascending: true });

          const { data: allProgress } = await supabase
            .from('student_assignment_progress')
            .select('*')
            .eq('student_id', user!.id)
            .in('assignment_id', assignmentIds);

          const progressMap = new Map(
            (allProgress || []).map(p => [p.assignment_id, p])
          );

          const assignmentsWithProgress = (assignmentsData || []).map((assignment) => {
            const progress = progressMap.get(assignment.id);
            return {
              ...assignment,
              status: progress?.status || 'not_started',
              words_learned: progress?.words_learned || 0,
              quiz_score: progress?.quiz_score,
            } as Assignment;
          });

          const { data: assignmentClassesData } = await supabase
            .from('assignment_classes')
            .select('assignment_id, classes(*)')
            .in('assignment_id', assignmentIds);

          const classMap = new Map();
          assignmentClassesData?.forEach(ac => {
            if (ac.classes && Array.isArray(ac.classes) && ac.classes.length > 0) {
              classMap.set(ac.assignment_id, (ac.classes[0] as Class).name);
            }
          });

          setAssignments(assignmentsWithProgress.map(a => ({
            ...a,
            class_name: classMap.get(a.id) || 'Unknown Class',
          })));
        }
      }
    } catch {
      // Data load failed — show empty state rather than infinite spinner
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
              <a
                href="/student/join-class"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                {t('joinClass')}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Weak Words card */}
        {difficultWords.length > 0 && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200">⚠️ {difficultWords.length} Weak Word{difficultWords.length !== 1 ? 's' : ''}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">Words you&apos;ve struggled with — practice them now!</p>
            </div>
            <a
              href="/student/weak-words"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shrink-0 transition-colors"
            >
              Review Now →
            </a>
          </div>
        )}

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
