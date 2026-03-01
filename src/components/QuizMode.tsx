'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';
import { unlockQuizAchievement } from '@/contexts/GamificationContext';

interface QuizModeProps {
  words: Array<{
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
  }>;
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

interface Question {
  wordId: string;
  word: string;
  correctAnswer: string;
  options: string[];
  wordData: {
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
  };
}

export default function QuizMode({ words, onClose, onComplete }: QuizModeProps) {
  const { language } = useLanguage();
  const { settings } = useAccessibility();
  const { markWordReviewed } = useProgress();
  const { speak } = useVoice();
  const { addMistake } = useDifficultWords();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  // Generate questions on mount
  const generateQuestions = () => {
    const numQuestions = Math.min(10, words.length);
    const selectedWords = [...words].sort(() => Math.random() - 0.5).slice(0, numQuestions);

    const newQuestions: Question[] = selectedWords.map(targetWord => {
      const correctTranslation = language === 'he'
        ? targetWord.translations.hebrew.split(',')[0]
        : targetWord.translations.arabic.split('،')[0];

      // Get 3 random wrong answers
      const wrongAnswers = words
        .filter(w => w.id !== targetWord.id)
        .map(w => language === 'he' ? w.translations.hebrew.split(',')[0] : w.translations.arabic.split('،')[0])
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Shuffle all options
      const options = [...wrongAnswers, correctTranslation].sort(() => Math.random() - 0.5);

      return {
        wordId: targetWord.id,
        word: targetWord.word,
        correctAnswer: correctTranslation,
        options,
        wordData: targetWord
      };
    });

    setQuestions(newQuestions);
    setQuizStarted(true);
  };

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === currentQuestion.correctAnswer;

    // Track mistakes for difficult words
    if (!isCorrect) {
      addMistake(currentQuestion.wordData);
    }

    if (isCorrect) {
      setScore(s => s + 1);
    }

    // Mark word as reviewed
    markWordReviewed(currentQuestion.wordId, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const speakWord = () => {
    speak(currentQuestion.word, 'en-US', settings.audioSpeed);
  };

  if (!quizStarted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Quiz Time!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Test your knowledge with {Math.min(10, words.length)} questions. Choose the correct translation for each word.
          </p>
          <button
            onClick={generateQuestions}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const perfect = percentage === 100;

    // Unlock achievements
    unlockQuizAchievement(perfect);

    // Call completion handler
    if (onComplete) {
      onComplete(questions.length, score);
    }

    const handleContinue = () => {
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {perfect ? '🏆' : percentage >= 80 ? '⭐' : percentage >= 60 ? '👍' : '💪'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {perfect ? 'Perfect Score!' : 'Quiz Complete!'}
          </h2>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
            {score} / {questions.length}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {perfect ? 'Amazing! You got all answers correct! 🎉' :
             percentage >= 80 ? 'Excellent work! You\'re mastering these words!' :
             percentage >= 60 ? 'Good job! Keep practicing to improve.' :
             'Keep studying! You\'ll get better with practice.'}
          </p>
          <button
            onClick={handleContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 z-50 overflow-hidden">
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
              Question {currentIndex + 1} / {questions.length}
            </span>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Score: {score}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4">
        <div className="w-full max-w-lg">
          {/* Question */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 text-center">
            <button
              onClick={speakWord}
              className="mb-4 text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform inline-block"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              What is the translation of:
            </p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
              {currentQuestion.word}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700';

              if (showResult) {
                if (option === currentQuestion.correctAnswer) {
                  buttonClass = 'bg-green-100 dark:bg-green-900 border-green-500 border-2';
                } else if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
                  buttonClass = 'bg-red-100 dark:bg-red-900 border-red-500 border-2';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl font-medium text-gray-900 dark:text-white transition-all ${buttonClass} ${
                    showResult ? 'cursor-default' : ''
                  }`}
                >
                  <span className="mr-3 text-gray-400">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          {showResult && (
            <button
              onClick={handleNext}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-xl"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
