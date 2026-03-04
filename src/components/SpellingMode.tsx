'use client';

import { useState, useEffect, useRef } from 'react';
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

interface SpellingModeProps {
  words: VocabularyWord[];
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

export default function SpellingMode({ words, onClose, onComplete }: SpellingModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const word = words[currentIndex];
  const translation = word ? (language === 'ar' ? word.translations.arabic : word.translations.hebrew).split(',')[0].trim() : '';

  // Speak the word via browser TTS
  const speakWord = (w: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(w);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  // Auto-play on word change
  useEffect(() => {
    if (word) {
      speakWord(word.word);
      setAnswer('');
      setResult('idle');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex]);

  if (!word) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result !== 'idle') return;

    const isCorrect = answer.trim().toLowerCase() === word.word.toLowerCase();
    setResult(isCorrect ? 'correct' : 'wrong');
    markWordReviewed(word.id, isCorrect);
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      addMistake({ id: word.id, word: word.word, translations: word.translations });
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= words.length) {
      const finalScore = correct + (result === 'correct' ? 0 : 0); // already counted
      setDone(true);
      onComplete?.(words.length, correct);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (done) {
    const pct = Math.round((correct / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : '📝'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Spelling Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {correct} / {words.length} correct ({pct}%)
          </p>
          <button onClick={onClose} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl">
            Done →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 to-pink-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onClose} className="text-white/80 hover:text-white text-sm">✕ Close</button>
        <div className="text-white text-sm font-medium">{currentIndex + 1} / {words.length}</div>
        <div className="text-white text-sm">✓ {correct}</div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="w-full bg-white/20 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${(currentIndex / words.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-8">
        {/* Listen card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mb-6 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Listen and type the word</p>

          {/* Speaker button */}
          <button
            onClick={() => speakWord(word.word)}
            className="mx-auto w-24 h-24 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 rounded-full flex items-center justify-center text-4xl transition-colors mb-4"
            title="Play word"
          >
            🔊
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tap to hear again</p>

          {/* Hint */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Translation:</span> {translation}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">{word.ipa}</p>
          </div>

          {/* Result reveal */}
          {result === 'wrong' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm">
                Correct spelling: <strong className="text-lg font-mono">{word.word}</strong>
              </p>
            </div>
          )}
          {result === 'correct' && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-green-600 dark:text-green-400 font-semibold">✓ Correct!</p>
            </div>
          )}
        </div>

        {/* Input form */}
        {result === 'idle' ? (
          <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-4 rounded-xl border-2 border-white/60 bg-white text-gray-900 text-center text-2xl font-mono tracking-wider focus:outline-none focus:border-white placeholder:text-gray-300"
              placeholder="Type the word..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={answer.trim().length === 0}
              className="w-full bg-white text-rose-600 font-bold py-3.5 rounded-xl hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Check →
            </button>
          </form>
        ) : (
          <button
            onClick={handleNext}
            className="w-full max-w-lg bg-white text-rose-600 font-bold py-3.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            {currentIndex + 1 >= words.length ? 'See Results →' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
}
