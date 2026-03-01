'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useDifficultWords } from '@/contexts/DifficultWordsContext';
import { useState, useEffect } from 'react';
import FlashcardMode from '@/components/FlashcardMode';
import QuizMode from '@/components/QuizMode';

interface VocabularyWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  ipa: string;
  example_sentences: { english: string; hebrew: string; arabic: string };
  category: string;
  type: string;
}

type LearningMode = 'home' | 'flashcards' | 'quiz' | 'words' | 'difficult' | 'statistics' | 'achievements';

export default function Home() {
  const { language, t } = useLanguage();
  const { settings } = useAccessibility();
  const { getWordStatus, getTotalStats, getWordsToReview } = useProgress();
  const { speak } = useVoice();
  const { xp, level, streak, todayXP, achievements, addXP, recordStudySession, getProgressToNextLevel, getXPForNextLevel } = useGamification();
  const { difficultWords, removeDifficultWord, clearDifficultWords } = useDifficultWords();

  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<LearningMode>('home');
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [studyStartTime, setStudyStartTime] = useState<number>(Date.now());

  // Track study time
  useEffect(() => {
    const interval = setInterval(() => {
      const minutes = Math.floor((Date.now() - studyStartTime) / 60000);
      if (minutes > 0) {
        recordStudySession(minutes);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [studyStartTime]);

  // Load vocabulary data
  useEffect(() => {
    fetch('/vocabulary.json')
      .then(res => res.json())
      .then(data => {
        setWords(data.words || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load vocabulary:', err);
        setLoading(false);
      });
  }, []);

  const stats = getTotalStats();
  const wordsToReview = getWordsToReview();
  const progressPercent = getProgressToNextLevel();

  const getTranslation = () => {
    if (!selectedWord) return '';
    if (language === 'he') return selectedWord.translations.hebrew;
    if (language === 'ar') return selectedWord.translations.arabic;
    return '';
  };

  const getExample = () => {
    if (!selectedWord) return '';
    if (language === 'he') return selectedWord.example_sentences.hebrew;
    if (language === 'ar') return selectedWord.example_sentences.arabic;
    return selectedWord.example_sentences.english;
  };

  const handleLearningComplete = (wordsStudied: number, correct: number) => {
    // Award XP
    const baseXP = wordsStudied * 10;
    const bonusXP = correct * 5;
    addXP(baseXP + bonusXP);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading vocabulary...</div>
      </div>
    );
  }

  // Learning Modes
  if (mode === 'flashcards') {
    return <FlashcardMode words={words} onClose={() => setMode('home')} onComplete={handleLearningComplete} />;
  }

  if (mode === 'quiz') {
    return <QuizMode words={words} onClose={() => setMode('home')} onComplete={handleLearningComplete} />;
  }

  // Get difficult words with full data
  const difficultWordsData = words.filter(w => difficultWords.some(dw => dw.id === w.id));

  return (
    <div className="space-y-6">
      {/* Welcome Section with Gamification */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">
              {t('appTitle')}
            </h2>
            <p className="text-blue-100">
              {words.length} words available • Level {level}
            </p>
          </div>

          {/* Level & XP Bar */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Level {level}</span>
              <span className="text-sm">{xp} / {getXPForNextLevel()} XP</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="text-xl font-bold">{streak}</div>
                <div className="text-xs text-blue-100">day streak</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <a
              href="/login"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 font-semibold transition-colors"
            >
              <span>🔐</span>
              <span>Login</span>
            </a>
            <a
              href="/student/join-class"
              className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl px-4 py-2 font-semibold transition-colors shadow-lg"
            >
              <span>📚</span>
              <span>Join Class</span>
            </a>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border-l-4 border-blue-500">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.learned}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Words Learned</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border-l-4 border-green-500">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.mastered}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Mastered</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border-l-4 border-purple-500">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.accuracy}%</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border-l-4 border-orange-500">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{difficultWords.length}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">To Review</div>
        </div>
      </section>

      {/* Learning Mode Selection */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Choose Your Learning Mode
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Flashcard Mode */}
          <button
            onClick={() => setMode('flashcards')}
            className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
          >
            <div className="text-3xl mb-2">🎴</div>
            <h4 className="text-base font-bold mb-1">Flashcards</h4>
            <p className="text-xs text-blue-100">
              Flip cards, mark known/unknown
            </p>
          </button>

          {/* Quiz Mode */}
          <button
            onClick={() => setMode('quiz')}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
          >
            <div className="text-3xl mb-2">🧠</div>
            <h4 className="text-base font-bold mb-1">Quiz</h4>
            <p className="text-xs text-purple-100">
              Test your knowledge
            </p>
          </button>

          {/* Difficult Words */}
          <button
            onClick={() => setMode('difficult')}
            className="group bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl relative"
          >
            {difficultWords.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {difficultWords.length}
              </span>
            )}
            <div className="text-3xl mb-2">❗</div>
            <h4 className="text-base font-bold mb-1">Difficult Words</h4>
            <p className="text-xs text-red-100">
              Practice your mistakes
            </p>
          </button>

          {/* Browse Words */}
          <button
            onClick={() => setMode('words')}
            className="group bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
          >
            <div className="text-3xl mb-2">📖</div>
            <h4 className="text-base font-bold mb-1">Browse</h4>
            <p className="text-xs text-green-100">
              View all words
            </p>
          </button>

          {/* Statistics */}
          <button
            onClick={() => setMode('statistics')}
            className="group bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
          >
            <div className="text-3xl mb-2">📊</div>
            <h4 className="text-base font-bold mb-1">Statistics</h4>
            <p className="text-xs text-indigo-100">
              View your progress
            </p>
          </button>

          {/* Achievements */}
          <button
            onClick={() => setMode('achievements')}
            className="group bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl relative"
          >
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {achievements.filter(a => a.unlocked).length}
            </span>
            <div className="text-3xl mb-2">🏆</div>
            <h4 className="text-base font-bold mb-1">Achievements</h4>
            <p className="text-xs text-yellow-100">
              {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
            </p>
          </button>
        </div>
      </section>

      {/* Words to Review */}
      {wordsToReview.length > 0 && (
        <section className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
              🔔 Time to Review!
            </h3>
            <button
              onClick={() => setMode('flashcards')}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Review Now
            </button>
          </div>
          <p className="text-orange-700 dark:text-orange-300 text-sm">
            You have {wordsToReview.length} word(s) due for review. Practice now to strengthen your memory!
          </p>
        </section>
      )}

      {/* Difficult Words View */}
      {mode === 'difficult' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Difficult Words ({difficultWords.length})
            </h3>
            <div className="flex gap-2">
              {difficultWords.length > 0 && (
                <button
                  onClick={clearDifficultWords}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setMode('home')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← Back
              </button>
            </div>
          </div>

          {difficultWordsData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">🎉</div>
              <p>No difficult words yet! Keep learning.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {difficultWordsData.map((word) => {
                const diffWord = difficultWords.find(dw => dw.id === word.id);
                return (
                  <div
                    key={word.id}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {word.word}
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {diffWord?.wrongCount || 0}x wrong
                        </p>
                      </div>
                      <button
                        onClick={() => removeDifficultWord(word.id)}
                        className="text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                        title="Mark as learned"
                      >
                        ✓
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'he' ? word.translations.hebrew : word.translations.arabic}
                    </p>
                    <button
                      onClick={() => { setSelectedWord(word); speak(word.word, 'en-US'); }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      🔊 Practice
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Statistics View */}
      {mode === 'statistics' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              📊 Your Statistics
            </h3>
            <button
              onClick={() => setMode('home')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Progress */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Learning Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Words Learned</span>
                  <span className="font-medium">{stats.learned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mastered</span>
                  <span className="font-medium">{stats.mastered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Accuracy</span>
                  <span className="font-medium">{stats.accuracy}%</span>
                </div>
              </div>
            </div>

            {/* Gamification */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Gamification</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Level</span>
                  <span className="font-medium">{level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total XP</span>
                  <span className="font-medium">{xp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Streak</span>
                  <span className="font-medium">{streak} days 🔥</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Today's XP</span>
                  <span className="font-medium">{todayXP}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements View */}
      {mode === 'achievements' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              🏆 Achievements
            </h3>
            <button
              onClick={() => setMode('home')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-xl p-4 text-center ${
                  achievement.unlocked
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-600'
                    : 'bg-gray-100 dark:bg-gray-700 opacity-60'
                }`}
              >
                <div className={`text-4xl mb-2 ${achievement.unlocked ? '' : 'grayscale'}`}>
                  {achievement.icon}
                </div>
                <h4 className={`font-bold text-sm mb-1 ${
                  achievement.unlocked
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {achievement.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {achievement.description}
                </p>
                {achievement.unlocked && (
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                    ✓ Unlocked
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse Words View */}
      {mode === 'words' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              All Vocabulary Words
            </h3>
            <button
              onClick={() => setMode('home')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {words.map((word) => {
              const status = getWordStatus(word.id);
              const isDifficult = difficultWords.some(dw => dw.id === word.id);
              return (
                <div
                  key={word.id}
                  onClick={() => setSelectedWord(word)}
                  className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] border-2 ${
                    isDifficult
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-transparent hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {word.word}
                    </h4>
                    <div className="flex items-center gap-1">
                      {isDifficult && <span className="text-red-500">❗</span>}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        status === 'mastered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        status === 'learning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        status === 'review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 font-mono">
                    {word.ipa}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {language === 'he' ? word.translations.hebrew.split(',')[0] :
                     language === 'ar' ? word.translations.arabic.split('،')[0] :
                     word.category}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWord && mode === 'home' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWord(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedWord.word}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-mono">
                  {selectedWord.ipa}
                </p>
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Translation */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
                  {language === 'he' ? 'תרגום' : language === 'ar' ? 'ترجمة' : 'Translation'}
                </p>
                <p className="text-lg text-gray-900 dark:text-white font-semibold">
                  {getTranslation()}
                </p>
              </div>

              {/* Example */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Example
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  {getExample()}
                </p>
              </div>

              {/* Status Badge */}
              <div className={`text-center py-2 rounded-lg ${
                getWordStatus(selectedWord.id) === 'mastered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                getWordStatus(selectedWord.id) === 'learning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                getWordStatus(selectedWord.id) === 'review' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                Status: {getWordStatus(selectedWord.id)}
              </div>

              {/* Audio Pronunciation Button */}
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                onClick={() => speak(selectedWord.word, 'en-US', settings.audioSpeed)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Listen to Pronunciation ({settings.audioSpeed}x)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
