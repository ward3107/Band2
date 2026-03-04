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

interface WordScrambleModeProps {
  words: VocabularyWord[];
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

interface Tile {
  char: string;
  originalIndex: number;
}

function shuffleWord(word: string): Tile[] {
  const tiles: Tile[] = word.split('').map((char, i) => ({ char, originalIndex: i }));
  // Fisher-Yates, ensure result !== original
  let shuffled = [...tiles];
  let attempts = 0;
  do {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attempts++;
  } while (
    shuffled.map(t => t.char).join('').toLowerCase() === word.toLowerCase() &&
    attempts < 20 &&
    word.length > 1
  );
  return shuffled;
}

export default function WordScrambleMode({ words, onClose, onComplete }: WordScrambleModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pool, setPool] = useState<Tile[]>([]);       // tiles not yet placed
  const [answer, setAnswer] = useState<Tile[]>([]);   // tiles placed by student
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const word = words[currentIndex];
  const translation = word ? (language === 'ar' ? word.translations.arabic : word.translations.hebrew).split(',')[0].trim() : '';

  useEffect(() => {
    if (word) {
      setPool(shuffleWord(word.word));
      setAnswer([]);
      setResult('idle');
      setWrongAttempts(0);
    }
  }, [currentIndex]);

  // Auto-check when all tiles placed
  useEffect(() => {
    if (!word || result !== 'idle') return;
    if (answer.length === word.word.length) {
      const attempt = answer.map(t => t.char).join('');
      if (attempt.toLowerCase() === word.word.toLowerCase()) {
        setResult('correct');
        setCorrect(c => c + 1);
        markWordReviewed(word.id, true);
      } else {
        setResult('wrong');
        setWrongAttempts(a => a + 1);
        markWordReviewed(word.id, false);
        addMistake({ id: word.id, word: word.word, translations: word.translations });
        // Auto-clear after 1.2s
        setTimeout(() => {
          setAnswer([]);
          setPool(shuffleWord(word.word));
          setResult('idle');
        }, 1200);
      }
    }
  }, [answer]);

  if (!word) return null;

  const tapFromPool = (tile: Tile, poolIdx: number) => {
    if (result !== 'idle') return;
    setAnswer(prev => [...prev, tile]);
    setPool(prev => prev.filter((_, i) => i !== poolIdx));
  };

  const tapFromAnswer = (tile: Tile, ansIdx: number) => {
    if (result !== 'idle') return;
    setPool(prev => [...prev, tile]);
    setAnswer(prev => prev.filter((_, i) => i !== ansIdx));
  };

  const handleReveal = () => {
    setResult('revealed');
    markWordReviewed(word.id, false);
    addMistake({ id: word.id, word: word.word, translations: word.translations });
  };

  const handleNext = () => {
    if (currentIndex + 1 >= words.length) {
      setDone(true);
      onComplete?.(words.length, correct);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (done) {
    const pct = Math.round((correct / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : '🔤'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Word Scramble Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {correct} / {words.length} correct ({pct}%)
          </p>
          <button onClick={onClose} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl">
            Done →
          </button>
        </div>
      </div>
    );
  }

  const isCorrect = result === 'correct';
  const isWrong = result === 'wrong';
  const isRevealed = result === 'revealed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-amber-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onClose} className="text-white/80 hover:text-white text-sm">✕ Close</button>
        <div className="text-white text-sm font-medium">{currentIndex + 1} / {words.length}</div>
        <div className="text-white text-sm">✓ {correct}</div>
      </div>

      {/* Progress */}
      <div className="px-4 mb-6">
        <div className="w-full bg-white/20 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${(currentIndex / words.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        {/* Hint card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 w-full max-w-lg mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Unscramble the word</p>
          <p className="text-lg font-medium text-gray-900 dark:text-white">{translation}</p>
          <p className="text-sm text-gray-400 font-mono">{word.ipa}</p>
          {(isCorrect) && (
            <p className="mt-2 text-green-600 dark:text-green-400 font-bold text-xl">✓ {word.word}</p>
          )}
          {(isRevealed) && (
            <p className="mt-2 text-gray-600 dark:text-gray-300 font-bold text-xl">Answer: {word.word}</p>
          )}
        </div>

        {/* Answer row */}
        <div className={`flex flex-wrap justify-center gap-2 min-h-[3.5rem] w-full max-w-lg mb-4 p-3 rounded-2xl border-2 transition-colors ${
          isCorrect ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
          isWrong   ? 'border-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse' :
          'border-white/40 bg-white/10'
        }`}>
          {answer.map((tile, i) => (
            <button
              key={`${tile.originalIndex}-${i}`}
              onClick={() => tapFromAnswer(tile, i)}
              disabled={result !== 'idle'}
              className="w-10 h-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-lg shadow-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              {tile.char}
            </button>
          ))}
          {answer.length === 0 && (
            <span className="text-white/50 text-sm self-center">Tap letters below to spell the word</span>
          )}
        </div>

        {/* Pool row */}
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-lg mb-6">
          {pool.map((tile, i) => (
            <button
              key={`${tile.originalIndex}-pool-${i}`}
              onClick={() => tapFromPool(tile, i)}
              disabled={result !== 'idle'}
              className="w-10 h-10 bg-white/90 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-lg shadow-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 active:scale-95 transition-all"
            >
              {tile.char}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full max-w-lg space-y-2">
          {(isCorrect || isRevealed) && (
            <button onClick={handleNext} className="w-full bg-white text-yellow-700 font-bold py-3.5 rounded-xl hover:bg-yellow-50 transition-colors">
              {currentIndex + 1 >= words.length ? 'See Results →' : 'Next →'}
            </button>
          )}
          {result === 'idle' && wrongAttempts >= 2 && (
            <button onClick={handleReveal} className="w-full bg-white/20 text-white/80 hover:bg-white/30 font-medium py-2.5 rounded-xl transition-colors text-sm">
              Reveal Answer
            </button>
          )}
          {result === 'idle' && answer.length > 0 && (
            <button
              onClick={() => { setAnswer([]); setPool(shuffleWord(word.word)); }}
              className="w-full bg-white/20 text-white/80 hover:bg-white/30 font-medium py-2 rounded-xl transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
