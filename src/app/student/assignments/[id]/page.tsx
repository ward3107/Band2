'use client';

import { useEffect, useState, use } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FlashcardMode from '@/components/FlashcardMode';
import QuizMode from '@/components/QuizMode';
import { useLanguage } from '@/contexts/LanguageContext';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  total_words: number;
  deadline: string;
  words: string[];
  assignment_type: 'flashcards' | 'quiz' | 'both';
}

interface Progress {
  status: 'not_started' | 'in_progress' | 'completed';
  words_learned: number;
  quiz_score: number | null;
}

interface VocabularyWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  ipa: string;
  example_sentences: { english: string; hebrew: string; arabic: string };
  category: string;
  type: string;
}

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, profile, loading: guardLoading } = useRoleGuard('student', {
    loginRedirect: '/login?redirect=/student/assignments/' + resolvedParams.id,
    unauthorizedRedirect: '/teacher/dashboard',
  });
  const router = useRouter();
  const { t } = useLanguage();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'overview' | 'flashcards' | 'quiz'>('overview');

  useEffect(() => {
    if (user && profile?.role === 'student') {
      loadData();
    }
  }, [user, profile]);

  const loadData = async () => {
    try {
      // Load assignment with progress
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (!assignmentData) {
        router.push('/student');
        return;
      }

      const assignmentWithWords = assignmentData as Assignment & { words?: string[] };

      // Handle if words array exists
      if (assignmentWithWords.words && Array.isArray(assignmentWithWords.words)) {
        assignmentWithWords.words = assignmentWithWords.words;
      } else {
        // If no words specified, use empty array
        assignmentWithWords.words = [];
      }

      setAssignment(assignmentWithWords);

      // Load progress
      const { data: progressData } = await supabase
        .from('student_assignment_progress')
        .select('*')
        .eq('student_id', user!.id)
        .eq('assignment_id', resolvedParams.id)
        .single();

      setProgress(progressData || {
        status: 'not_started',
        words_learned: 0,
        quiz_score: null,
      });

      // Load all vocabulary and filter to assignment words
      const response = await fetch('/vocabulary.json');
      if (!response.ok) throw new Error(`Failed to load vocabulary: HTTP ${response.status}`);
      const data = await response.json();
      const allWords = data.words || [];

      // Filter words if assignment has word IDs, otherwise show empty
      const assignmentWords = assignmentWithWords.words && assignmentWithWords.words.length > 0
        ? allWords.filter((w: VocabularyWord) => assignmentWithWords.words!.includes(w.id))
        : allWords.slice(0, assignmentWithWords.total_words || 10); // Show first N words as fallback

      setWords(assignmentWords);
    } catch {
      // errors handled by null assignment check below
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (status: 'in_progress' | 'completed', wordsLearned: number, quizScore?: number | null) => {
    try {
      if (!progress) {
        // Create new progress record
        const { error } = await supabase.from('student_assignment_progress').insert({
          student_id: user!.id,
          assignment_id: resolvedParams.id,
          status,
          words_learned: wordsLearned,
          ...(quizScore !== undefined ? { quiz_score: quizScore } : {}),
          last_activity: new Date().toISOString(),
        });
        if (error) console.error('Failed to create progress:', error);
      } else {
        // Update existing progress
        const { error } = await supabase
          .from('student_assignment_progress')
          .update({
            status,
            words_learned: Math.max(progress.words_learned, wordsLearned),
            ...(quizScore !== undefined ? { quiz_score: quizScore } : {}),
            last_activity: new Date().toISOString(),
            ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          })
          .eq('student_id', user!.id)
          .eq('assignment_id', resolvedParams.id);
        if (error) console.error('Failed to update progress:', error);
      }
      setProgress((prev) => ({
        ...prev,
        status,
        words_learned: wordsLearned,
        ...(quizScore !== undefined ? { quiz_score: quizScore } : {}),
      } as Progress));
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const handleLearningComplete = (wordsStudied: number, correct: number) => {
    const newStatus = wordsStudied >= words.length ? 'completed' : 'in_progress';
    const quizScore = wordsStudied > 0 ? Math.round((correct / wordsStudied) * 100) : null;
    updateProgress(newStatus, wordsStudied, quizScore);
    setMode('overview');
  };

  if (guardLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">{t('loading')}...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">{t('errorOccurred')}</div>
      </div>
    );
  }

  // Flashcard mode
  if (mode === 'flashcards') {
    return (
      <FlashcardMode
        words={words}
        onClose={() => setMode('overview')}
        onComplete={handleLearningComplete}
      />
    );
  }

  // Quiz mode
  if (mode === 'quiz') {
    return (
      <QuizMode
        words={words}
        onClose={() => setMode('overview')}
        onComplete={handleLearningComplete}
      />
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shrink-0 mt-1"
            >
              ← {t('back')}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {assignment.title}
                </h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusColor(progress?.status || 'not_started')}`}>
                  {getStatusLabel(progress?.status || 'not_started')}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {words.length} {t('words')} • {t('due')} {new Date(assignment.deadline).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('yourProgress')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress?.words_learned || 0} / {words.length} {t('words')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${words.length > 0 ? ((progress?.words_learned || 0) / words.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📝 Instructions</h3>
            <p className="text-blue-800 dark:text-blue-200">{assignment.description}</p>
          </div>
        )}

        {/* Study Modes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('chooseStudyMode')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(assignment.assignment_type || 'both') !== 'quiz' && (
              <button
                onClick={() => {
                  updateProgress('in_progress', progress?.words_learned || 0);
                  setMode('flashcards');
                }}
                className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-4 sm:p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
              >
                <div className="text-4xl mb-3">🎴</div>
                <h4 className="text-base sm:text-xl font-bold mb-2">{t('flashcardsMode')}</h4>
                <p className="text-blue-100 text-sm">
                  {t('flashcardsDescription')}
                </p>
              </button>
            )}

            {(assignment.assignment_type || 'both') !== 'flashcards' && (
              <button
                onClick={() => {
                  updateProgress('in_progress', progress?.words_learned || 0);
                  setMode('quiz');
                }}
                className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-4 sm:p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
              >
                <div className="text-4xl mb-3">🧠</div>
                <h4 className="text-base sm:text-xl font-bold mb-2">{t('quizMode')}</h4>
                <p className="text-purple-100 text-sm">
                  {t('quizModeDescription')}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Word List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('totalWords')} ({words.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {words.map((word) => (
              <div
                key={word.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{word.word}</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{word.ipa}</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {word.translations.hebrew.split(',')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
