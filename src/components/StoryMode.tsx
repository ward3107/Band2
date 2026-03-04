'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';

interface VocabularyWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  ipa: string;
  example_sentences: { english: string; hebrew: string; arabic: string };
  category: string;
  type: string;
}

interface StoryModeProps {
  words: VocabularyWord[];
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

const CONNECTORS = [
  '', 'Meanwhile, ', 'In addition, ', 'Later, ', 'Furthermore, ',
  'As a result, ', 'After that, ', 'However, ', 'Therefore, ', 'Also, ',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Render a sentence with the target word highlighted in bold blue */
function HighlightedSentence({ sentence, targetWord }: { sentence: string; targetWord: string }) {
  const regex = new RegExp(`(\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'gi');
  const parts = sentence.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <strong key={i} className="text-blue-700 dark:text-blue-400 font-bold">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function StoryMode({ words, onClose, onComplete }: StoryModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const [phase, setPhase] = useState<'story' | 'quiz'>('story');
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const getTranslation = (w: VocabularyWord) =>
    (language === 'ar' ? w.translations.arabic : w.translations.hebrew).split(',')[0].trim();

  // Build quiz questions (one per word)
  const questions = useMemo(() => words.map(w => {
    const correctAns = getTranslation(w);
    const distractors = shuffle(
      words.filter(x => x.id !== w.id).map(x => getTranslation(x))
    ).slice(0, 3);
    return {
      word: w,
      correctAns,
      options: shuffle([correctAns, ...distractors]),
    };
  }), [words, language]);

  const currentQ = questions[quizIndex];

  const handleSelect = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    const isCorrect = opt === currentQ.correctAns;
    markWordReviewed(currentQ.word.id, isCorrect);
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      addMistake({ id: currentQ.word.id, word: currentQ.word.word, translations: currentQ.word.translations });
    }
  };

  const handleNext = () => {
    if (quizIndex + 1 >= questions.length) {
      setDone(true);
      onComplete?.(words.length, correct + (selected === currentQ.correctAns ? 1 : 0));
    } else {
      setQuizIndex(i => i + 1);
      setSelected(null);
    }
  };

  // Completion screen
  if (done) {
    const pct = Math.round((correct / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : '📖'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Story Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comprehension: {correct} / {words.length} ({pct}%)
          </p>
          <button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl">
            Done →
          </button>
        </div>
      </div>
    );
  }

  // Story phase
  if (phase === 'story') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-600 to-cyan-700 flex flex-col">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={onClose} className="text-white/80 hover:text-white text-sm">✕ Close</button>
          <span className="text-white font-semibold">📖 Read the Story</span>
          <span className="text-white/80 text-sm">{words.length} words</span>
        </div>

        <div className="flex-1 px-4 pb-6 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg mx-auto mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              The highlighted words are your vocabulary words
            </p>
            <div className="text-gray-900 dark:text-white leading-relaxed text-base space-y-3">
              {words.map((w, i) => (
                <span key={w.id}>
                  {CONNECTORS[i % CONNECTORS.length] && (
                    <span className="text-gray-500 dark:text-gray-400 italic">{CONNECTORS[i % CONNECTORS.length]}</span>
                  )}
                  <HighlightedSentence sentence={w.example_sentences.english} targetWord={w.word} />
                  {' '}
                </span>
              ))}
            </div>

            {/* Word list at bottom */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Vocabulary words in this story:</p>
              <div className="flex flex-wrap gap-2">
                {words.map(w => (
                  <span key={w.id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                    {w.word}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setPhase('quiz')}
            className="w-full max-w-lg mx-auto block bg-white text-teal-700 font-bold py-3.5 rounded-xl hover:bg-teal-50 transition-colors"
          >
            Answer Comprehension Questions →
          </button>
        </div>
      </div>
    );
  }

  // Quiz phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-cyan-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => setPhase('story')} className="text-white/80 hover:text-white text-sm">← Story</button>
        <div className="text-white text-sm font-medium">{quizIndex + 1} / {questions.length}</div>
        <div className="text-white text-sm">✓ {correct}</div>
      </div>

      <div className="px-4 mb-4">
        <div className="w-full bg-white/20 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${(quizIndex / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Comprehension question</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            What does <span className="text-blue-700 dark:text-blue-400 font-bold">"{currentQ.word.word}"</span> mean in the story?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            "…{currentQ.word.example_sentences.english}…"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
          {currentQ.options.map((opt) => {
            let cls = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 hover:border-teal-400';
            if (selected !== null) {
              if (opt === currentQ.correctAns) cls = 'bg-green-500 text-white border-2 border-green-600';
              else if (opt === selected) cls = 'bg-red-500 text-white border-2 border-red-600';
              else cls = 'bg-white dark:bg-gray-800 text-gray-400 border-2 border-gray-200 opacity-60';
            }
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={selected !== null}
                className={`${cls} rounded-xl py-3 px-3 font-medium text-sm leading-tight transition-all min-h-[3rem] text-center`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <button onClick={handleNext} className="w-full max-w-lg bg-white text-teal-700 font-bold py-3.5 rounded-xl hover:bg-teal-50 transition-colors">
            {quizIndex + 1 >= questions.length ? 'See Results →' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
}
