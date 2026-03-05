'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';

interface StoryModeProps {
  words: Array<{
    id: string;
    word: string;
    translations: { hebrew: string; arabic: string };
    example_sentences: { english: string; hebrew: string; arabic: string };
  }>;
  onClose: () => void;
  onComplete?: (wordsStudied: number, correct: number) => void;
}

interface ComprehensionQuestion {
  wordId: string;
  question: string;
  correctAnswer: string;
  options: string[];
  wordData: StoryModeProps['words'][0];
}

export default function StoryMode({ words, onClose, onComplete }: StoryModeProps) {
  const { language } = useLanguage();
  const { markWordReviewed } = useProgress();
  const { addMistake } = useDifficultWords();

  // Pick a subset for the story and build comprehension questions
  const { passage, questions } = useMemo(() => {
    const selected = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(8, words.length));

    // Build passage from example sentences, highlighting target words
    const sentences = selected.map(w => {
      const sentence = w.example_sentences.english;
      return { sentence, word: w.word, id: w.id };
    });

    const passageText = sentences.map(s => s.sentence).join(' ');

    // Build comprehension questions — "What does X mean?"
    const qs: ComprehensionQuestion[] = selected.map(w => {
      const correctTranslation = language === 'ar'
        ? w.translations.arabic.split('،')[0].trim()
        : w.translations.hebrew.split(',')[0].trim();

      const wrong = words
        .filter(other => other.id !== w.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(other => language === 'ar'
          ? other.translations.arabic.split('،')[0].trim()
          : other.translations.hebrew.split(',')[0].trim()
        );

      return {
        wordId: w.id,
        question: `What does "${w.word}" mean?`,
        correctAnswer: correctTranslation,
        options: [...wrong, correctTranslation].sort(() => Math.random() - 0.5),
        wordData: w,
      };
    });

    return {
      passage: passageText,
      questions: qs,
      highlightWords: selected.map(w => w.word),
    };
  }, [words, language]);

  const [phase, setPhase] = useState<'intro' | 'reading' | 'quiz'>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const completionHandled = useRef(false);

  useEffect(() => {
    if (phase === 'quiz' && questionIndex >= questions.length && questions.length > 0 && !completionHandled.current) {
      completionHandled.current = true;
      if (onComplete) onComplete(questions.length, score);
    }
  }, [phase, questionIndex, questions.length, score, onComplete]);

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

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Story Mode</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Read a passage made from example sentences, then answer comprehension questions about the vocabulary words.
          </p>
          <button onClick={() => setPhase('reading')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg">Read the Story</button>
        </div>
      </div>
    );
  }

  if (phase === 'reading') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-emerald-900/30 z-50 overflow-auto">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Read the passage</span>
            <div />
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 sm:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
            <p className="text-lg sm:text-xl leading-relaxed text-gray-800 dark:text-gray-200">
              {passage}
            </p>
          </div>

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
            When you&apos;re done reading, test your comprehension:
          </p>

          <button
            onClick={() => setPhase('quiz')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl"
          >
            Start Comprehension Quiz ({questions.length} questions)
          </button>
        </div>
      </div>
    );
  }

  // Quiz phase
  if (questionIndex >= questions.length) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{percentage === 100 ? '🏆' : percentage >= 70 ? '⭐' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Story Complete!</h2>
          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">{score} / {questions.length}</p>
          <button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg">Continue</button>
        </div>
      </div>
    );
  }

  const q = questions[questionIndex];

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const correct = answer === q.correctAnswer;
    if (correct) setScore(s => s + 1);
    markWordReviewed(q.wordId, correct);
    if (!correct) addMistake(q.wordData);
  };

  const handleNext = () => {
    setQuestionIndex(i => i + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-emerald-900/30 z-50 overflow-auto">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Question {questionIndex + 1} / {questions.length}</span>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8 mb-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">From the story:</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{q.question}</h2>
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
            <button onClick={handleNext} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl">
              {questionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
