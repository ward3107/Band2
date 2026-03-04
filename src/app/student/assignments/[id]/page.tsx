'use client';

import { useEffect, useState, use } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FlashcardMode from '@/components/FlashcardMode';
import QuizMode from '@/components/QuizMode';
import FillInBlankMode from '@/components/FillInBlankMode';
import MatchingMode from '@/components/MatchingMode';
import StoryMode from '@/components/StoryMode';
import SpellingMode from '@/components/SpellingMode';
import WordScrambleMode from '@/components/WordScrambleMode';
import { useLanguage } from '@/contexts/LanguageContext';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  total_words: number;
  deadline: string;
  words: string[];
  word_ids?: string[];
  allowed_modes?: string[] | null;
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

interface LeaderboardEntry {
  student_id: string;
  words_learned: number;
  quiz_score: number | null;
  student: { full_name: string } | null;
}

const ALL_MODES = ['flashcard', 'quiz', 'fillinblank', 'matching', 'story', 'spelling', 'scramble'];

const MODE_CONFIG = [
  { key: 'flashcard',   icon: '🎴', label: 'Flashcards',    desc: 'Flip & review',            color: 'from-blue-500 to-blue-600' },
  { key: 'quiz',        icon: '🧠', label: 'Quiz',          desc: '4-choice quiz',             color: 'from-purple-500 to-purple-600' },
  { key: 'fillinblank', icon: '✏️', label: 'Fill in Blank', desc: 'Complete sentences',         color: 'from-green-500 to-green-600' },
  { key: 'matching',    icon: '🔗', label: 'Matching',      desc: 'Match words & meanings',    color: 'from-orange-500 to-orange-600' },
  { key: 'story',       icon: '📖', label: 'Story',         desc: 'Read & answer questions',   color: 'from-teal-500 to-teal-600' },
  { key: 'spelling',    icon: '🔊', label: 'Spelling',      desc: 'Hear & type the word',      color: 'from-rose-500 to-rose-600' },
  { key: 'scramble',    icon: '🔀', label: 'Word Scramble', desc: 'Unscramble the letters',    color: 'from-yellow-500 to-yellow-600' },
];

type Mode = 'overview' | 'flashcard' | 'quiz' | 'fillinblank' | 'matching' | 'story' | 'spelling' | 'scramble';

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('overview');

  useEffect(() => {
    if (user && profile?.role === 'student') {
      loadData();
    }
  }, [user, profile]);

  const loadData = async () => {
    try {
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (!assignmentData) {
        router.push('/student');
        return;
      }

      const wordIds: string[] = assignmentData.word_ids || assignmentData.words || [];
      const normalised = { ...assignmentData, words: wordIds };
      setAssignment(normalised);

      const { data: progressData } = await supabase
        .from('student_assignment_progress')
        .select('*')
        .eq('student_id', user!.id)
        .eq('assignment_id', resolvedParams.id)
        .single();

      setProgress(progressData || { status: 'not_started', words_learned: 0, quiz_score: null });

      const response = await fetch('/vocabulary.json');
      if (!response.ok) throw new Error('Failed to load vocabulary');
      const data = await response.json();
      const allWords: VocabularyWord[] = data.words || [];

      const assignmentWords = wordIds.length > 0
        ? allWords.filter((w) => wordIds.includes(w.id))
        : allWords.slice(0, assignmentData.total_words || 10);

      setWords(assignmentWords);

      // Load leaderboard
      const { data: lbData } = await supabase
        .from('student_assignment_progress')
        .select('student_id, words_learned, quiz_score, student:profiles(full_name)')
        .eq('assignment_id', resolvedParams.id)
        .order('words_learned', { ascending: false })
        .limit(10);

      setLeaderboard((lbData as LeaderboardEntry[]) || []);
    } catch {
      // errors handled by null assignment check
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (status: 'in_progress' | 'completed', wordsLearned: number) => {
    if (!progress || progress.status === 'not_started') {
      await supabase.from('student_assignment_progress').upsert({
        student_id: user!.id,
        assignment_id: resolvedParams.id,
        status,
        words_learned: wordsLearned,
        last_activity: new Date().toISOString(),
      });
    } else {
      await supabase
        .from('student_assignment_progress')
        .update({
          status,
          words_learned: Math.max(progress.words_learned, wordsLearned),
          last_activity: new Date().toISOString(),
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('student_id', user!.id)
        .eq('assignment_id', resolvedParams.id);
    }
    setProgress((prev: Progress | null) => ({ ...prev, status, words_learned: wordsLearned } as Progress));
  };

  const handleLearningComplete = (wordsStudied: number) => {
    const newStatus = wordsStudied >= words.length ? 'completed' : 'in_progress';
    updateProgress(newStatus, wordsStudied);
    setMode('overview');
  };

  const startMode = (key: Mode) => {
    updateProgress('in_progress', progress?.words_learned || 0);
    setMode(key);
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

  const enabledModes = assignment.allowed_modes ?? ALL_MODES;

  // Render active learning mode
  const modeProps = { words, onClose: () => setMode('overview'), onComplete: handleLearningComplete };
  if (mode === 'flashcard') return <FlashcardMode {...modeProps} />;
  if (mode === 'quiz')        return <QuizMode {...modeProps} />;
  if (mode === 'fillinblank') return <FillInBlankMode {...modeProps} />;
  if (mode === 'matching')    return <MatchingMode {...modeProps} />;
  if (mode === 'story')       return <StoryMode {...modeProps} />;
  if (mode === 'spelling')    return <SpellingMode {...modeProps} />;
  if (mode === 'scramble')    return <WordScrambleMode {...modeProps} />;

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('yourProgress')}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress?.words_learned || 0} / {words.length} {t('words')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${words.length ? ((progress?.words_learned || 0) / words.length) * 100 : 0}%` }}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('chooseStudyMode')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MODE_CONFIG.filter((m) => enabledModes.includes(m.key)).map((m) => (
              <button
                key={m.key}
                onClick={() => startMode(m.key as Mode)}
                className={`bg-gradient-to-br ${m.color} hover:brightness-110 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md`}
              >
                <div className="text-3xl mb-2">{m.icon}</div>
                <div className="font-bold text-sm sm:text-base">{m.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Word List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
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

        {/* Leaderboard */}
        {leaderboard.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏆 Class Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.student_id === user?.id;
                return (
                  <div
                    key={entry.student_id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMe ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                        {entry.student?.full_name || 'Student'}{isMe ? ' (You)' : ''}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
                      {entry.words_learned} words
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
