'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';

interface FlashcardModeProps {
  words: Array<{
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
    ipa: string;
    example_sentences: { english: string; hebrew: string; arabic: string };
  }>;
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

export default function FlashcardMode({ words, onClose, onComplete }: FlashcardModeProps) {
  const { language } = useLanguage();
  const { settings } = useAccessibility();
  const { markWordReviewed, getWordStatus } = useProgress();
  const { speak } = useVoice();
  const { addMistake } = useDifficultWords();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const currentWord = words[currentIndex];
  const progress = Math.round(((currentIndex + (direction === 'right' ? 1 : 0)) / words.length) * 100);

  const getTranslation = () => {
    if (language === 'he') return currentWord.translations.hebrew;
    if (language === 'ar') return currentWord.translations.arabic;
    return currentWord.translations.hebrew;
  };

  const getExample = () => {
    if (language === 'he') return currentWord.example_sentences.hebrew;
    if (language === 'ar') return currentWord.example_sentences.arabic;
    return currentWord.example_sentences.english;
  };

  const handleSwipe = (knew: boolean) => {
    markWordReviewed(currentWord.id, knew);

    // Track mistakes for difficult words
    if (!knew) {
      addMistake({
        id: currentWord.id,
        word: currentWord.word,
        translations: currentWord.translations,
      });
    } else {
      setCorrectCount(prev => prev + 1);
    }

    setDirection(knew ? 'right' : 'left');
    setFlipped(false);

    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setDirection(null);
      } else if (onComplete) {
        // Session complete
        onComplete(words.length, correctCount + (knew ? 1 : 0));
      }
    }, 300);
  };

  const speakWord = () => {
    speak(currentWord.word, 'en-US', settings.audioSpeed);
  };

  const status = getWordStatus(currentWord.id);

  if (currentIndex >= words.length) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Session Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You reviewed {words.length} words. Keep practicing daily to master your vocabulary!
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ✕
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentIndex + 1} / {words.length}
            </span>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === 'new' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
              status === 'learning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              status === 'review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {status}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4">
        <div
          className={`w-full max-w-lg transition-all duration-300 ${
            direction === 'left' ? '-translate-x-full opacity-0' :
            direction === 'right' ? 'translate-x-full opacity-0' :
            'translate-x-0 opacity-100'
          }`}
        >
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 min-h-[320px] transition-transform duration-500 ${
                flipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* Front */}
              <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center rounded-2xl ${
                flipped ? 'backface-hidden' : ''
              }`}
              style={{ backfaceVisibility: 'hidden' }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); speakWord(); }}
                  className="absolute top-4 right-4 text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>

                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {currentWord.word}
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-mono mb-6">
                  {currentWord.ipa}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {flipped ? '' : 'Tap to reveal translation'}
                </p>
              </div>

              {/* Back */}
              <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 ${
                flipped ? '' : 'backface-hidden'
              }`}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
              >
                <p className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-6 text-center">
                  {getTranslation()}
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Example:</p>
                  <p className="text-gray-700 dark:text-gray-300 text-center">
                    {getExample()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => handleSwipe(false)}
              disabled={!flipped}
              className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-all ${
                flipped
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Still Learning
            </button>
            <button
              onClick={() => handleSwipe(true)}
              disabled={!flipped}
              className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-all ${
                flipped
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
