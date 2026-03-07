'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';

interface MatchingModeProps {
  words: Array<{
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
  }>;
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

const BATCH_SIZE = 6;

export default function MatchingMode({ words, onClose, onComplete }: MatchingModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const batches = useMemo(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const result: typeof words[] = [];
    for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
      result.push(shuffled.slice(i, i + BATCH_SIZE));
    }
    return result;
  }, [words]);

  const [batchIndex, setBatchIndex] = useState(0);
  const [selectedEnglish, setSelectedEnglish] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [started, setStarted] = useState(false);
  const completionHandled = useRef(false);

  useEffect(() => {
    if (started && batchIndex >= batches.length && !completionHandled.current) {
      completionHandled.current = true;
      if (onComplete) onComplete(totalAttempted, totalCorrect);
    }
  }, [batchIndex, batches.length, started, totalAttempted, totalCorrect, onComplete]);

  const getTranslation = (w: MatchingModeProps['words'][0]) => {
    return language === 'ar'
      ? w.translations.arabic.split('،')[0].trim()
      : w.translations.hebrew.split(',')[0].trim();
  };

  if (words.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Words Available</h2>
          <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg">Go Back</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Matching Game</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Tap an English word, then tap its translation to make a match. {words.length} words in batches of {BATCH_SIZE}.
          </p>
          <button onClick={() => setStarted(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg">Start</button>
        </div>
      </div>
    );
  }

  if (batchIndex >= batches.length) {
    const percentage = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{percentage === 100 ? '🏆' : '⭐'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Matched!</h2>
          <p className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-4">{totalCorrect} / {totalAttempted}</p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">first-try matches</p>
          <button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg">Continue</button>
        </div>
      </div>
    );
  }

  const batch = batches[batchIndex];

  // Shuffled translations for the right column
  const shuffledTranslations = useMemo(() => {
    return [...batch].sort(() => Math.random() - 0.5);
  }, [batch]);

  const handleEnglishClick = (wordId: string) => {
    if (matched.has(wordId)) return;
    setSelectedEnglish(wordId === selectedEnglish ? null : wordId);
    setWrongPair(null);
  };

  const handleTranslationClick = (wordId: string) => {
    if (!selectedEnglish || matched.has(wordId)) return;

    setTotalAttempted(a => a + 1);

    if (selectedEnglish === wordId) {
      // Correct match
      setTotalCorrect(c => c + 1);
      markWordReviewed(wordId, true);
      const newMatched = new Set(matched);
      newMatched.add(wordId);
      setMatched(newMatched);
      setSelectedEnglish(null);
      setWrongPair(null);

      // Check if batch complete
      if (newMatched.size === batch.length) {
        setTimeout(() => {
          setBatchIndex(i => i + 1);
          setMatched(new Set());
        }, 600);
      }
    } else {
      // Wrong match
      setWrongPair(wordId);
      markWordReviewed(selectedEnglish, false);
      const wrongWord = batch.find(w => w.id === selectedEnglish);
      if (wrongWord) addMistake(wrongWord);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedEnglish(null);
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-gray-900 dark:to-teal-900/30 z-50 overflow-auto">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Batch {batchIndex + 1} / {batches.length}
            </span>
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
              {matched.size} / {batch.length} matched
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${((batchIndex * BATCH_SIZE + matched.size) / words.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* English column */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center mb-1">English</p>
            {batch.map(w => {
              const isMatched = matched.has(w.id);
              const isSelected = selectedEnglish === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => handleEnglishClick(w.id)}
                  disabled={isMatched}
                  className={`w-full p-3 sm:p-4 rounded-xl text-sm sm:text-base font-medium transition-all ${
                    isMatched
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 opacity-60'
                      : isSelected
                        ? 'bg-teal-500 text-white shadow-lg scale-[1.02]'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {w.word}
                </button>
              );
            })}
          </div>

          {/* Translation column */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center mb-1">
              {language === 'ar' ? 'Arabic' : 'Hebrew'}
            </p>
            {shuffledTranslations.map(w => {
              const isMatched = matched.has(w.id);
              const isWrong = wrongPair === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => handleTranslationClick(w.id)}
                  disabled={isMatched || !selectedEnglish}
                  className={`w-full p-3 sm:p-4 rounded-xl text-sm sm:text-base font-medium transition-all ${
                    isMatched
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 opacity-60'
                      : isWrong
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-2 border-red-500'
                        : selectedEnglish
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                          : 'bg-white/60 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {getTranslation(w)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
