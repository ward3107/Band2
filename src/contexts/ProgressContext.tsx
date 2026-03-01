'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WordProgress {
  wordId: string;
  attempts: number;
  correct: number;
  lastReviewed: string;
  nextReview: string;
  easeFactor: number;
  interval: number;
}

interface ProgressContextType {
  wordProgress: Record<string, WordProgress>;
  markWordReviewed: (wordId: string, correct: boolean) => void;
  getWordStatus: (wordId: string) => 'new' | 'learning' | 'review' | 'mastered';
  getWordsToReview: () => string[];
  getTotalStats: () => { learned: number; mastered: number; totalAttempts: number; accuracy: number };
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

function calculateNextReview(easeFactor: number, interval: number, quality: number): { nextInterval: number; newEaseFactor: number } {
  // SuperMemo-2 algorithm simplified
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let nextInterval = interval;
  if (quality >= 3) {
    if (interval === 0) nextInterval = 1;
    else if (interval === 1) nextInterval = 6;
    else nextInterval = Math.round(interval * newEaseFactor);
  } else {
    nextInterval = 0;
  }

  return { nextInterval, newEaseFactor };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vocab-progress');
    if (saved) {
      try {
        setWordProgress(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse progress:', e);
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('vocab-progress', JSON.stringify(wordProgress));
    }
  }, [wordProgress, mounted]);

  const markWordReviewed = (wordId: string, correct: boolean) => {
    setWordProgress(prev => {
      const existing = prev[wordId];
      const now = new Date().toISOString();

      if (!existing) {
        // New word
        const { nextInterval, newEaseFactor } = calculateNextReview(2.5, 0, correct ? 5 : 2);
        const nextDate = new Date();
        nextDate.setHours(nextDate.getHours() + nextInterval * 24);

        return {
          ...prev,
          [wordId]: {
            wordId,
            attempts: 1,
            correct: correct ? 1 : 0,
            lastReviewed: now,
            nextReview: nextDate.toISOString(),
            easeFactor: newEaseFactor,
            interval: nextInterval
          }
        };
      }

      // Update existing word
      const quality = correct ? (existing.correct / existing.attempts > 0.7 ? 5 : 4) : 2;
      const { nextInterval, newEaseFactor } = calculateNextReview(
        existing.easeFactor,
        existing.interval,
        quality
      );

      const nextDate = new Date();
      nextDate.setHours(nextDate.getHours() + nextInterval * 24);

      return {
        ...prev,
        [wordId]: {
          ...existing,
          attempts: existing.attempts + 1,
          correct: existing.correct + (correct ? 1 : 0),
          lastReviewed: now,
          nextReview: nextDate.toISOString(),
          easeFactor: newEaseFactor,
          interval: nextInterval
        }
      };
    });
  };

  const getWordStatus = (wordId: string): 'new' | 'learning' | 'review' | 'mastered' => {
    const progress = wordProgress[wordId];
    if (!progress) return 'new';

    const accuracy = progress.correct / progress.attempts;
    const isDue = new Date(progress.nextReview) <= new Date();

    if (progress.interval >= 21 && accuracy >= 0.9) return 'mastered';
    if (isDue) return 'review';
    return 'learning';
  };

  const getWordsToReview = (): string[] => {
    const now = new Date();
    return Object.entries(wordProgress)
      .filter(([_, p]) => new Date(p.nextReview) <= now)
      .map(([id]) => id);
  };

  const getTotalStats = () => {
    const words = Object.values(wordProgress);
    const learned = words.filter(w => w.attempts >= 3).length;
    const mastered = words.filter(w => w.interval >= 21 && (w.correct / w.attempts) >= 0.9).length;
    const totalAttempts = words.reduce((sum, w) => sum + w.attempts, 0);
    const correct = words.reduce((sum, w) => sum + w.correct, 0);
    const accuracy = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;

    return { learned, mastered, totalAttempts, accuracy };
  };

  const resetProgress = () => {
    setWordProgress({});
    localStorage.removeItem('vocab-progress');
  };

  return (
    <ProgressContext.Provider
      value={{
        wordProgress,
        markWordReviewed,
        getWordStatus,
        getWordsToReview,
        getTotalStats,
        resetProgress
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
