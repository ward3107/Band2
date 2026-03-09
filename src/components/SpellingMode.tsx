'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useVoice } from '@/contexts/VoiceContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveModeProgress } from '@/lib/supabase';

interface SpellingModeProps {
  words: Array<{
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
  }>;
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
  assignmentId?: string;
}

export default function SpellingMode({ words, onClose, onComplete, assignmentId }: SpellingModeProps) {
  const { speak } = useVoice();
  const { settings } = useAccessibility();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();
  const { language } = useLanguage();
  const { user } = useAuth();

  const wordList = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length));
  }, [words]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const completionHandled = useRef(false);

  const currentWord = wordList[currentIndex];

  // Helper to get translation based on current language
  const getTranslation = (w: SpellingModeProps['words'][0]) => {
    if (language === 'ar') return w.translations.arabic.split('،')[0].trim();
    if (language === 'he') return w.translations.hebrew.split(',')[0].trim();
    // Default to Hebrew for English
    return w.translations.hebrew.split(',')[0].trim();
  };

  useEffect(() => {
    if (currentIndex >= wordList.length && wordList.length > 0 && !completionHandled.current) {
      completionHandled.current = true;
      // Save mode progress
      if (user && assignmentId) {
        void saveModeProgress(user.id, assignmentId, 'spelling', wordList.length, score, true);
      }
      if (onComplete) onComplete(wordList.length, score);
    }
  }, [currentIndex, wordList.length, score, onComplete]);

  // Auto-play word when it changes
  useEffect(() => {
    if (started && currentWord) {
      speak(currentWord.word, 'en-US', settings.audioSpeed);
    }
  }, [currentIndex, started]);

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
          <div className="text-6xl mb-4">🔤</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Spelling Bee</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Listen to the word and its translation, then type the correct spelling. {wordList.length} words.
          </p>
          <button onClick={() => setStarted(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg">Start</button>
        </div>
      </div>
    );
  }

  if (currentIndex >= wordList.length) {
    const percentage = Math.round((score / wordList.length) * 100);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{percentage === 100 ? '🏆' : percentage >= 70 ? '⭐' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete!</h2>
          <p className="text-4xl font-bold text-rose-600 dark:text-rose-400 mb-4">{score} / {wordList.length}</p>
          <button onClick={onClose} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-6 rounded-lg">Continue</button>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!input.trim() || showResult) return;
    const correct = input.trim().toLowerCase() === currentWord.word.toLowerCase();
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) setScore(s => s + 1);
    markWordReviewed(currentWord.id, correct);
    if (!correct) addMistake(currentWord);
  };

  const handleNext = () => {
    setCurrentIndex(i => i + 1);
    setInput('');
    setShowResult(false);
    setIsCorrect(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-50 to-pink-100 dark:from-gray-900 dark:to-rose-900/30 z-50 overflow-auto">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{currentIndex + 1} / {wordList.length}</span>
            <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / wordList.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8 mb-6 text-center">
            {/* Play button */}
            <button
              onClick={() => speak(currentWord.word, 'en-US', settings.audioSpeed)}
              className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 flex items-center justify-center mx-auto mb-4 transition-all hover:scale-110"
            >
              <svg className="w-10 h-10 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Tap to hear the word again</p>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              Translation: <span className="text-rose-600 dark:text-rose-400">{getTranslation(currentWord)}</span>
            </p>
          </div>

          {/* Input */}
          <div className="mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (showResult ? handleNext() : handleSubmit())}
              disabled={showResult}
              autoFocus
              placeholder="Type the word..."
              className={`w-full text-center text-xl sm:text-2xl p-4 rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none transition-colors ${
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 focus:border-rose-500'
              }`}
            />
          </div>

          {showResult && !isCorrect && (
            <div className="text-center mb-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Correct spelling:</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentWord.word}</p>
            </div>
          )}

          {showResult ? (
            <button onClick={handleNext} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-4 rounded-xl">
              {currentIndex < wordList.length - 1 ? 'Next Word' : 'See Results'}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!input.trim()} className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl">
              Check
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
