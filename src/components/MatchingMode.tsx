'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface MatchingModeProps {
  words: VocabularyWord[];
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BATCH_SIZE = 6;

export default function MatchingMode({ words, onClose, onComplete }: MatchingModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const [batchIndex, setBatchIndex] = useState(0);
  const [shuffledTranslations, setShuffledTranslations] = useState<VocabularyWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedTrans, setSelectedTrans] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ word: string; trans: string } | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const currentBatch = words.slice(batchIndex * BATCH_SIZE, batchIndex * BATCH_SIZE + BATCH_SIZE);
  const totalBatches = Math.ceil(words.length / BATCH_SIZE);

  const getTranslation = useCallback((w: VocabularyWord) =>
    (language === 'ar' ? w.translations.arabic : w.translations.hebrew).split(',')[0].trim(),
    [language]
  );

  useEffect(() => {
    setShuffledTranslations(shuffle(currentBatch));
    setMatched(new Set());
    setSelectedWord(null);
    setSelectedTrans(null);
    setWrongPair(null);
  }, [batchIndex]);

  const handleWordTap = (id: string) => {
    if (matched.has(id) || wrongPair) return;
    setSelectedWord(prev => prev === id ? null : id);
    setSelectedTrans(null);
  };

  const handleTransTap = (id: string) => {
    if (matched.has(id) || wrongPair) return;
    if (!selectedWord) {
      setSelectedTrans(prev => prev === id ? null : id);
      return;
    }
    // Check match
    if (selectedWord === id) {
      // Correct
      markWordReviewed(id, true);
      setScore(s => s + 1);
      setMatched(prev => new Set([...prev, id]));
      setSelectedWord(null);
      setSelectedTrans(null);

      // Check if batch complete
      if (matched.size + 1 === currentBatch.length) {
        setTimeout(() => {
          if (batchIndex + 1 >= totalBatches) {
            setDone(true);
            onComplete?.(words.length, score + 1);
          } else {
            setBatchIndex(b => b + 1);
          }
        }, 800);
      }
    } else {
      // Wrong
      const wrongWord = words.find(w => w.id === selectedWord);
      if (wrongWord) addMistake({ id: wrongWord.id, word: wrongWord.word, translations: wrongWord.translations });
      markWordReviewed(selectedWord, false);
      setWrongPair({ word: selectedWord, trans: id });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedWord(null);
        setSelectedTrans(null);
      }, 900);
    }
  };

  if (done) {
    const pct = Math.round((score / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : '👍'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Matching Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {score} / {words.length} matched correctly ({pct}%)
          </p>
          <button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl">
            Done →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onClose} className="text-white/80 hover:text-white text-sm">✕ Close</button>
        <div className="text-white text-sm font-medium">
          Batch {batchIndex + 1} / {totalBatches}
        </div>
        <div className="text-white text-sm">✓ {score}</div>
      </div>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${(matched.size / currentBatch.length) * 100}%` }}
          />
        </div>
        <p className="text-white/80 text-xs mt-1 text-center">Tap a word, then tap its translation</p>
      </div>

      {/* Matching grid */}
      <div className="flex-1 px-3 pb-8 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
          {/* Left: English words */}
          <div className="space-y-2">
            {currentBatch.map((w) => {
              const isMatched = matched.has(w.id);
              const isSelected = selectedWord === w.id;
              const isWrong = wrongPair?.word === w.id;
              let cls = 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-transparent hover:border-orange-300';
              if (isMatched) cls = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-2 border-green-400 opacity-70';
              else if (isWrong) cls = 'bg-red-500 text-white border-2 border-red-600 animate-pulse';
              else if (isSelected) cls = 'bg-orange-500 text-white border-2 border-orange-600 shadow-lg';
              return (
                <button
                  key={w.id}
                  onClick={() => handleWordTap(w.id)}
                  disabled={isMatched}
                  className={`${cls} w-full rounded-xl px-3 py-3 text-left font-semibold text-sm transition-all min-h-[3rem] flex items-center`}
                >
                  {isMatched ? '✓ ' : ''}{w.word}
                </button>
              );
            })}
          </div>

          {/* Right: shuffled translations */}
          <div className="space-y-2">
            {shuffledTranslations.map((w) => {
              const isMatched = matched.has(w.id);
              const isSelected = selectedTrans === w.id || selectedWord === w.id && matched.has(w.id);
              const isWrong = wrongPair?.trans === w.id;
              const translation = getTranslation(w);
              let cls = 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-transparent hover:border-amber-300';
              if (isMatched) cls = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-2 border-green-400 opacity-70';
              else if (isWrong) cls = 'bg-red-500 text-white border-2 border-red-600 animate-pulse';
              else if (isSelected) cls = 'bg-amber-500 text-white border-2 border-amber-600 shadow-lg';
              return (
                <button
                  key={w.id}
                  onClick={() => handleTransTap(w.id)}
                  disabled={isMatched}
                  className={`${cls} w-full rounded-xl px-3 py-3 text-left text-sm transition-all min-h-[3rem] flex items-center leading-tight`}
                >
                  {isMatched ? '✓ ' : ''}{translation}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
