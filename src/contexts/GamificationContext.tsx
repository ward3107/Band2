'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string | null;
  longestStreak: number;
  totalStudyDays: number;
  achievements: Achievement[];
  todayXP: number;
  todayStudyTime: number; // in minutes
}

interface GamificationContextType {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  todayXP: number;
  achievements: Achievement[];
  addXP: (amount: number) => void;
  recordStudySession: (minutes: number) => void;
  checkAchievements: () => void;
  resetStreak: () => void;
  getXPForNextLevel: () => number;
  getProgressToNextLevel: () => number;
}

const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_word', name: 'First Steps', description: 'Learn your first word', icon: '🌱' },
  { id: 'ten_words', name: 'Getting Started', description: 'Learn 10 words', icon: '📚' },
  { id: 'fifty_words', name: 'Word Collector', description: 'Learn 50 words', icon: '📖' },
  { id: 'hundred_words', name: 'Vocabulary Master', description: 'Learn 100 words', icon: '🎓' },
  { id: 'first_quiz', name: 'Quiz Beginner', description: 'Complete your first quiz', icon: '🧠' },
  { id: 'perfect_quiz', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: '💯' },
  { id: 'three_day_streak', name: 'Consistent Learner', description: '3 day streak', icon: '🔥' },
  { id: 'week_streak', name: 'Week Warrior', description: '7 day streak', icon: '⚡' },
  { id: 'month_streak', name: 'Dedicated Student', description: '30 day streak', icon: '👑' },
  { id: 'level_five', name: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'level_ten', name: 'Expert Learner', description: 'Reach level 10', icon: '🌟' },
  { id: 'hundred_flashcards', name: 'Flashcard Pro', description: 'Review 100 flashcards', icon: '🎴' },
];

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

function calculateLevel(xp: number): number {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getXPForLevel(level: number): number {
  // Reverse formula: xp = (level - 1)^2 * 100
  return Math.pow(level - 1, 2) * 100;
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<GamificationData>({
    xp: 0,
    level: 1,
    streak: 0,
    lastStudyDate: null,
    longestStreak: 0,
    totalStudyDays: 0,
    achievements: ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
    todayXP: 0,
    todayStudyTime: 0,
  });

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gamification-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);

        // Check and update streak
        checkAndUpdateStreak(parsed);
      } catch (e) {
        console.error('Failed to parse gamification data:', e);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (data.xp > 0 || data.streak > 0) {
      localStorage.setItem('gamification-data', JSON.stringify(data));
    }
  }, [data]);

  const checkAndUpdateStreak = (currentData: GamificationData) => {
    const today = new Date().toDateString();
    const lastStudy = currentData.lastStudyDate;

    let streakBroken = false;
    if (lastStudy) {
      const lastDate = new Date(lastStudy);
      const daysDiff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 1) {
        streakBroken = true;
      }
    }

    const isNewDay = lastStudy !== today;

    if (streakBroken || isNewDay) {
      setData(prev => ({
        ...prev,
        ...(streakBroken ? { streak: 0 } : {}),
        ...(isNewDay ? { todayXP: 0, todayStudyTime: 0 } : {}),
      }));
    }
  };

  const addXP = (amount: number) => {
    setData(prev => {
      const newXP = prev.xp + amount;
      const newLevel = calculateLevel(newXP);
      const today = new Date().toDateString();
      const isToday = prev.lastStudyDate === today;

      // Update streak
      let newStreak = prev.streak;
      let newLongestStreak = prev.longestStreak;
      let newTotalStudyDays = prev.totalStudyDays;

      if (!isToday && prev.lastStudyDate) {
        const lastDate = new Date(prev.lastStudyDate);
        const daysDiff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          newStreak = prev.streak + 1;
        } else if (daysDiff > 1) {
          newStreak = 1;
        }
      } else if (!prev.lastStudyDate) {
        newStreak = 1;
      }

      if (newStreak > newLongestStreak) {
        newLongestStreak = newStreak;
      }

      if (!isToday) {
        newTotalStudyDays += 1;
      }

      const newData = {
        ...prev,
        xp: newXP,
        level: newLevel,
        streak: newStreak,
        longestStreak: newLongestStreak,
        totalStudyDays: newTotalStudyDays,
        lastStudyDate: today,
        todayXP: isToday ? prev.todayXP + amount : amount,
      };

      // Check achievements
      checkAchievementsForData(newData);

      return newData;
    });
  };

  const recordStudySession = (minutes: number) => {
    const today = new Date().toDateString();
    setData(prev => ({
      ...prev,
      todayStudyTime: prev.lastStudyDate === today ? prev.todayStudyTime + minutes : minutes,
    }));
  };

  const checkAchievementsForData = (currentData: GamificationData) => {
    let updated = false;
    const newAchievements = currentData.achievements.map(a => {
      if (a.unlocked) return a;

      let shouldUnlock = false;

      switch (a.id) {
        case 'first_word':
          shouldUnlock = currentData.totalStudyDays >= 1;
          break;
        case 'ten_words':
          shouldUnlock = currentData.xp >= 500; // ~10 words
          break;
        case 'fifty_words':
          shouldUnlock = currentData.xp >= 2500; // ~50 words
          break;
        case 'hundred_words':
          shouldUnlock = currentData.xp >= 5000; // ~100 words
          break;
        case 'first_quiz':
          // Will be unlocked when quiz is completed
          break;
        case 'perfect_quiz':
          // Will be unlocked when perfect quiz is achieved
          break;
        case 'three_day_streak':
          shouldUnlock = currentData.streak >= 3;
          break;
        case 'week_streak':
          shouldUnlock = currentData.streak >= 7;
          break;
        case 'month_streak':
          shouldUnlock = currentData.streak >= 30;
          break;
        case 'level_five':
          shouldUnlock = currentData.level >= 5;
          break;
        case 'level_ten':
          shouldUnlock = currentData.level >= 10;
          break;
        case 'hundred_flashcards':
          shouldUnlock = currentData.xp >= 3000; // ~100 flashcard reviews
          break;
      }

      if (shouldUnlock) {
        updated = true;
        return { ...a, unlocked: true, unlockedAt: new Date().toISOString() };
      }

      return a;
    });

    if (updated) {
      setData(prev => ({ ...prev, achievements: newAchievements }));
    }
  };

  const checkAchievements = () => {
    checkAchievementsForData(data);
  };

  const unlockAchievement = (id: string) => {
    setData(prev => ({
      ...prev,
      achievements: prev.achievements.map(a =>
        a.id === id && !a.unlocked
          ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
          : a
      ),
    }));
  };

  const resetStreak = () => {
    setData(prev => ({ ...prev, streak: 0 }));
  };

  const getXPForNextLevel = () => {
    return getXPForLevel(data.level + 1);
  };

  const getProgressToNextLevel = () => {
    const currentLevelXP = getXPForLevel(data.level);
    const nextLevelXP = getXPForLevel(data.level + 1);
    return ((data.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  };

  return (
    <GamificationContext.Provider
      value={{
        xp: data.xp,
        level: data.level,
        streak: data.streak,
        longestStreak: data.longestStreak,
        todayXP: data.todayXP,
        achievements: data.achievements,
        addXP,
        recordStudySession,
        checkAchievements,
        resetStreak,
        getXPForNextLevel,
        getProgressToNextLevel,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

// Export function to unlock specific achievements (like quiz completions)
export function unlockQuizAchievement(perfect: boolean) {
  const saved = localStorage.getItem('gamification-data');
  if (saved) {
    const data = JSON.parse(saved);
    const updated = data.achievements.map((a: Achievement) => {
      if (a.id === 'first_quiz' && !a.unlocked) {
        return { ...a, unlocked: true, unlockedAt: new Date().toISOString() };
      }
      if (a.id === 'perfect_quiz' && perfect && !a.unlocked) {
        return { ...a, unlocked: true, unlockedAt: new Date().toISOString() };
      }
      return a;
    });
    data.achievements = updated;
    localStorage.setItem('gamification-data', JSON.stringify(data));
  }
}
