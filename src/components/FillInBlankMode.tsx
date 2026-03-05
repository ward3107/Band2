'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';

interface FillInBlankModeProps {
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

interface Question {
  wordId: string;
  word: string;
  sentence: string;
  correctAnswer: string;
  options: string[];
  wordData: FillInBlankModeProps['words'][0];
}

export default function FillInBlankMode({ words, onClose, onComplete }: FillInBlankModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  const questions = useMemo(() => {
    const selected = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length));
    return selected.map((w): Question => {
      const sentence = w.example_sentences.english;
      // Replace the word in the sentence with a blank
      const regex = new RegExp(`\\b${w.word}\\b`, 'i');
      const blanked = regex.test(sentence)
        ? sentence.replace(regex, '______')
        : `${sentence} (______)`; // fallback if word not found literally

      // Get 3 wrong answers
      const wrong = words
        .filter(other => other.id !== w.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(other => other.word);

      const options = [...wrong, w.word].sort(() => Math.random() - 0.5);

      return {
        wordId: w.id,
        word: w.word,
        sentence: blanked,
        correctAnswer: w.word,
        options,
        wordData: w,
      };
    });
  }, [words, language]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const completionHandled = useRef(false);

  useEffect(() => {
    if (currentIndex >= questions.length && questions.length > 0 && !completionHandled.current) {
      completionHandled.current = true;
      if (onComplete) onComplete(questions.length, score);
    }
  }, [currentIndex, questions.length, score, onComplete]);

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
          <div className="text-6xl mb-4">✏️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Fill in the Blank</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Read each sentence and choose the missing word. {questions.length} questions.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{percentage === 100 ? '🏆' : percentage >= 70 ? '⭐' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete!</h2>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">{score} / {questions.length}</p>
          <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg">Continue</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === q.correctAnswer;
    if (isCorrect) setScore(s => s + 1);
    markWordReviewed(q.wordId, isCorrect);
    if (!isCorrect) addMistake(q.wordData);
  };

  const handleNext = () => {
    setCurrentIndex(i => i + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-amber-900/30 z-50 overflow-auto">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8 mb-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">Complete the sentence:</p>
            <p className="text-lg sm:text-xl text-gray-900 dark:text-white leading-relaxed">
              {q.sentence}
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {q.options.map((option, i) => {
              let cls = 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700';
              if (showResult) {
                if (option === q.correctAnswer) cls = 'bg-green-100 dark:bg-green-900 border-green-500 border-2';
                else if (option === selectedAnswer) cls = 'bg-red-100 dark:bg-red-900 border-red-500 border-2';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl font-medium text-gray-900 dark:text-white transition-all ${cls}`}
                >
                  <span className="mr-3 text-gray-400">{String.fromCharCode(65 + i)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {showResult && (
            <button
              onClick={handleNext}
              className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 rounded-xl"
            >
              {currentIndex < questions.length - 1 ? 'Next' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
