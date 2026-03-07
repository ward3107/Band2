'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveModeProgress } from '@/lib/supabase';

interface WordScrambleModeProps {
  words: Array<{
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
  }>;
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
  assignmentId?: string;
}

function scrambleWord(word: string): string[] {
  const letters = word.split('');
  // Keep shuffling until we get a different arrangement
  for (let i = 0; i < 20; i++) {
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    if (shuffled.join('') !== word) return shuffled;
  }
  // Fallback: just reverse
  return letters.reverse();
}

export default function WordScrambleMode({ words, onClose, onComplete, assignmentId }: WordScrambleModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();
  const { user } = useAuth();

  const wordList = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length));
  }, [words]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Tile state for current word
  const [availableTiles, setAvailableTiles] = useState<Array<{ letter: string; idx: number }>>([]);
  const [selectedTiles, setSelectedTiles] = useState<Array<{ letter: string; idx: number }>>([]);
  const completionHandled = useRef(false);

  useEffect(() => {
    if (currentIndex >= wordList.length && wordList.length > 0 && !completionHandled.current) {
      completionHandled.current = true;
      // Save mode progress
      if (user && assignmentId) {
        void saveModeProgress(user.id, assignmentId, 'scramble', wordList.length, score, true);
      }
      if (onComplete) onComplete(wordList.length, score);
    }
  }, [currentIndex, wordList.length, score, onComplete]);

  const getTranslation = (w: WordScrambleModeProps['words'][0]) => {
    // Default to Arabic, use Hebrew if explicitly selected
    return language === 'he'
      ? w.translations.hebrew.split(',')[0].trim()
      : w.translations.arabic.split('،')[0].trim();
  };

  const initWord = (index: number) => {
    const w = wordList[index];
    const scrambled = scrambleWord(w.word);
    setAvailableTiles(scrambled.map((letter, idx) => ({ letter, idx })));
    setSelectedTiles([]);
    setShowResult(false);
    setIsCorrect(false);
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
          <div className="text-6xl mb-4">🔀</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Word Scramble</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The letters are mixed up! Tap them in the right order to spell the word. {wordList.length} words.
          </p>
          <button
            onClick={() => { setStarted(true); initWord(0); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Start
          </button>
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
          <p className="text-4xl font-bold text-violet-600 dark:text-violet-400 mb-4">{score} / {wordList.length}</p>
          <button onClick={onClose} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-lg">Continue</button>
        </div>
      </div>
    );
  }

  const currentWord = wordList[currentIndex];
  const currentGuess = selectedTiles.map(t => t.letter).join('');

  const handleTileClick = (tile: { letter: string; idx: number }) => {
    if (showResult) return;
    setSelectedTiles(prev => [...prev, tile]);
    setAvailableTiles(prev => prev.filter(t => t.idx !== tile.idx));
  };

  const handleSelectedClick = (tile: { letter: string; idx: number }) => {
    if (showResult) return;
    setAvailableTiles(prev => [...prev, tile]);
    setSelectedTiles(prev => prev.filter(t => t.idx !== tile.idx));
  };

  const handleCheck = () => {
    const correct = currentGuess.toLowerCase() === currentWord.word.toLowerCase();
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) setScore(s => s + 1);
    markWordReviewed(currentWord.id, correct);
    if (!correct) addMistake(currentWord);
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    if (nextIndex < wordList.length) initWord(nextIndex);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-violet-900/30 z-50 overflow-auto">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{currentIndex + 1} / {wordList.length}</span>
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / wordList.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <div className="w-full max-w-lg">
          {/* Hint */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8 mb-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Unscramble the word for:</p>
            <p className="text-xl sm:text-2xl font-bold text-violet-700 dark:text-violet-300">
              {getTranslation(currentWord)}
            </p>
          </div>

          {/* Selected tiles (answer area) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 min-h-[60px] flex flex-wrap items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600">
            {selectedTiles.length === 0 ? (
              <p className="text-gray-400 text-sm">Tap letters below to spell the word</p>
            ) : (
              selectedTiles.map((tile) => (
                <button
                  key={tile.idx}
                  onClick={() => handleSelectedClick(tile)}
                  disabled={showResult}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
                    showResult
                      ? isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-400 text-white'
                      : 'bg-violet-500 text-white hover:bg-violet-600 active:scale-95'
                  }`}
                >
                  {tile.letter}
                </button>
              ))
            )}
          </div>

          {/* Available tiles */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {availableTiles.map((tile) => (
              <button
                key={tile.idx}
                onClick={() => handleTileClick(tile)}
                disabled={showResult}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                {tile.letter}
              </button>
            ))}
          </div>

          {showResult && !isCorrect && (
            <div className="text-center mb-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Correct answer:</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentWord.word}</p>
            </div>
          )}

          {showResult ? (
            <button onClick={handleNext} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 rounded-xl">
              {currentIndex < wordList.length - 1 ? 'Next Word' : 'See Results'}
            </button>
          ) : (
            <button
              onClick={handleCheck}
              disabled={selectedTiles.length !== currentWord.word.length}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl"
            >
              Check ({selectedTiles.length}/{currentWord.word.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
