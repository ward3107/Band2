'use client';

import { useState, useEffect } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';
import FlashcardMode from '@/components/FlashcardMode';
import QuizMode from '@/components/QuizMode';
import FillInBlankMode from '@/components/FillInBlankMode';
import MatchingMode from '@/components/MatchingMode';
import StoryMode from '@/components/StoryMode';
import SpellingMode from '@/components/SpellingMode';
import WordScrambleMode from '@/components/WordScrambleMode';

interface VocabularyWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  ipa: string;
  example_sentences: { english: string; hebrew: string; arabic: string };
  category: string;
  type: string;
}

const MODE_CONFIG = [
  { key: 'flashcard',   icon: '🎴', label: 'Flashcards',    color: 'from-blue-500 to-blue-600' },
  { key: 'quiz',        icon: '🧠', label: 'Quiz',          color: 'from-purple-500 to-purple-600' },
  { key: 'fillinblank', icon: '✏️', label: 'Fill in Blank', color: 'from-green-500 to-green-600' },
  { key: 'matching',    icon: '🔗', label: 'Matching',      color: 'from-orange-500 to-orange-600' },
  { key: 'story',       icon: '📖', label: 'Story',         color: 'from-teal-500 to-teal-600' },
  { key: 'spelling',    icon: '🔊', label: 'Spelling',      color: 'from-rose-500 to-rose-600' },
  { key: 'scramble',    icon: '🔀', label: 'Word Scramble', color: 'from-yellow-500 to-yellow-600' },
];

type Mode = 'overview' | 'flashcard' | 'quiz' | 'fillinblank' | 'matching' | 'story' | 'spelling' | 'scramble';

export default function WeakWordsPage() {
  const { loading: guardLoading } = useRoleGuard('student', { loginRedirect: '/login' });
  const router = useRouter();
  const { difficultWords, markAsLearned } = useDifficultWords();
  const [allVocab, setAllVocab] = useState<VocabularyWord[]>([]);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('overview');

  useEffect(() => {
    fetch('/vocabulary.json')
      .then((r) => r.json())
      .then((d) => setAllVocab(d.words || []))
      .catch(() => {})
      .finally(() => setVocabLoading(false));
  }, []);

  // Redirect if no difficult words once loading is done
  useEffect(() => {
    if (!guardLoading && !vocabLoading && difficultWords.length === 0) {
      router.replace('/student');
    }
  }, [guardLoading, vocabLoading, difficultWords.length]);

  if (guardLoading || vocabLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Build full VocabularyWord objects for difficult words, enriched from full vocab
  const difficultWordIds = new Set(difficultWords.map((d) => d.id));
  const words: VocabularyWord[] = allVocab.filter((w) => difficultWordIds.has(w.id));

  // Fallback: use difficult word data directly if not found in vocab (shouldn't happen)
  const missingIds = difficultWords.filter((d) => !allVocab.find((w) => w.id === d.id));
  const fallbackWords: VocabularyWord[] = missingIds.map((d) => ({
    ...d,
    ipa: '',
    example_sentences: { english: '', hebrew: '', arabic: '' },
    category: '',
    type: '',
  }));

  const allWords = [...words, ...fallbackWords];

  if (allWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">No weak words found.</div>
      </div>
    );
  }

  const handleComplete = () => setMode('overview');
  const modeProps = { words: allWords, onClose: () => setMode('overview'), onComplete: handleComplete };

  if (mode === 'flashcard')  return <FlashcardMode {...modeProps} />;
  if (mode === 'quiz')        return <QuizMode {...modeProps} />;
  if (mode === 'fillinblank') return <FillInBlankMode {...modeProps} />;
  if (mode === 'matching')    return <MatchingMode {...modeProps} />;
  if (mode === 'story')       return <StoryMode {...modeProps} />;
  if (mode === 'spelling')    return <SpellingMode {...modeProps} />;
  if (mode === 'scramble')    return <WordScrambleMode {...modeProps} />;

  return (
    <div className="min-h-screen bg-amber-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/student')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">⚠️ Weak Words Practice</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{allWords.length} words that need review</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Word list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Your weak words:</h2>
          <div className="flex flex-wrap gap-2">
            {allWords.map((w) => (
              <div key={w.id} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-sm">
                <span>{w.word}</span>
                <button
                  onClick={() => markAsLearned(w.id)}
                  className="ml-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 text-xs"
                  title="Remove from weak words"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mode grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Choose a study mode:</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MODE_CONFIG.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key as Mode)}
                className={`bg-gradient-to-br ${m.color} hover:brightness-110 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md`}
              >
                <div className="text-3xl mb-2">{m.icon}</div>
                <div className="font-bold text-sm">{m.label}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
