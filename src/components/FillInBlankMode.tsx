'use client';

import { useState, useEffect } from 'react';
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

interface FillInBlankModeProps {
  words: VocabularyWord[];
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

function buildSentenceWithBlank(sentence: string, targetWord: string): { before: string; after: string; found: boolean } {
  const regex = new RegExp(`\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const match = regex.exec(sentence);
  if (!match) return { before: sentence, after: '', found: false };
  return {
    before: sentence.slice(0, match.index),
    after: sentence.slice(match.index + match[0].length),
    found: true,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FillInBlankMode({ words, onClose, onComplete }: FillInBlankModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const word = words[currentIndex];

  useEffect(() => {
    if (!word) return;
    const distractors = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3).map(w => w.word);
    setOptions(shuffle([word.word, ...distractors]));
    setSelected(null);
  }, [currentIndex, words]);

  if (!word) return null;

  const { before, after, found } = buildSentenceWithBlank(word.example_sentences.english, word.word);
  const translation = language === 'ar' ? word.translations.arabic : word.translations.hebrew;

  const handleSelect = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    const isCorrect = opt.toLowerCase() === word.word.toLowerCase();
    markWordReviewed(word.id, isCorrect);
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      addMistake({ id: word.id, word: word.word, translations: word.translations });
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= words.length) {
      setDone(true);
      onComplete?.(words.length, correct + (selected?.toLowerCase() === word.word.toLowerCase() ? 1 : 0));
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (done) {
    const finalScore = correct;
    const pct = Math.round((finalScore / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-700 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '👍' : '📚'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Fill in the Blank Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You got {finalScore} out of {words.length} correct ({pct}%)</p>
          <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl">
            Done →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onClose} className="text-white/80 hover:text-white text-sm">✕ Close</button>
        <div className="text-white text-sm font-medium">{currentIndex + 1} / {words.length}</div>
        <div className="text-white text-sm">✓ {correct}</div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Complete the sentence</p>

          {/* Sentence */}
          <div className="text-gray-900 dark:text-white text-lg leading-relaxed mb-4">
            {found ? (
              <>
                {before}
                <span className="inline-block mx-1 px-3 py-0.5 bg-green-100 dark:bg-green-900/30 border-2 border-dashed border-green-400 rounded-lg font-mono text-green-800 dark:text-green-300 min-w-[80px] text-center">
                  {selected ? (
                    <span className={selected.toLowerCase() === word.word.toLowerCase() ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                      {selected}
                    </span>
                  ) : '_______'}
                </span>
                {after}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 italic">{word.example_sentences.english}</p>
                <p className="font-medium">Fill in the blank: <span className="bg-green-100 dark:bg-green-900/30 border-2 border-dashed border-green-400 rounded px-3 py-0.5 font-mono text-green-800 dark:text-green-300">{selected || '_______'}</span></p>
              </>
            )}
          </div>

          {/* Hint */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">Hint:</span> {translation.split(',')[0]}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
          {options.map((opt) => {
            let cls = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20';
            if (selected !== null) {
              if (opt.toLowerCase() === word.word.toLowerCase()) {
                cls = 'bg-green-500 text-white border-2 border-green-600';
              } else if (opt === selected) {
                cls = 'bg-red-500 text-white border-2 border-red-600';
              } else {
                cls = 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-600 opacity-60';
              }
            }
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={selected !== null}
                className={`${cls} rounded-xl py-3 px-4 font-semibold font-mono text-lg transition-all`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <button
            onClick={handleNext}
            className="w-full max-w-lg bg-white text-green-700 font-bold py-3.5 rounded-xl hover:bg-green-50 transition-colors"
          >
            {currentIndex + 1 >= words.length ? 'See Results →' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
}
