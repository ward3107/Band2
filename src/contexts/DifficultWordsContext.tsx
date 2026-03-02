'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface DifficultWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  wrongCount: number;
  lastWrong: string;
  attempts: number;
}

// Base word data for addMistake (without auto-generated fields)
interface WordData {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
}

interface DifficultWordsContextType {
  difficultWords: DifficultWord[];
  addMistake: (wordData: WordData) => void;
  removeDifficultWord: (wordId: string) => void;
  clearDifficultWords: () => void;
  markAsLearned: (wordId: string) => void;
  getDifficultWordIds: () => string[];
}

const DifficultWordsContext = createContext<DifficultWordsContextType | undefined>(undefined);

export function DifficultWordsProvider({ children }: { children: ReactNode }) {
  const [difficultWords, setDifficultWords] = useState<DifficultWord[]>([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('difficult-words');
    if (saved) {
      try {
        setDifficultWords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse difficult words:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('difficult-words', JSON.stringify(difficultWords));
  }, [difficultWords]);

  const addMistake = (wordData: WordData) => {
    setDifficultWords(prev => {
      const existing = prev.find(w => w.id === wordData.id);

      if (existing) {
        // Update existing
        return prev.map(w =>
          w.id === wordData.id
            ? {
                ...w,
                wrongCount: w.wrongCount + 1,
                lastWrong: new Date().toISOString(),
                attempts: w.attempts + 1,
              }
            : w
        );
      } else {
        // Add new
        return [
          ...prev,
          {
            ...wordData,
            wrongCount: 1,
            lastWrong: new Date().toISOString(),
            attempts: 1,
          },
        ];
      }
    });
  };

  const removeDifficultWord = (wordId: string) => {
    setDifficultWords(prev => prev.filter(w => w.id !== wordId));
  };

  const clearDifficultWords = () => {
    setDifficultWords([]);
  };

  const markAsLearned = (wordId: string) => {
    setDifficultWords(prev => prev.filter(w => w.id !== wordId));
  };

  const getDifficultWordIds = () => {
    return difficultWords.map(w => w.id);
  };

  return (
    <DifficultWordsContext.Provider
      value={{
        difficultWords,
        addMistake,
        removeDifficultWord,
        clearDifficultWords,
        markAsLearned,
        getDifficultWordIds,
      }}
    >
      {children}
    </DifficultWordsContext.Provider>
  );
}

export function useDifficultWords() {
  const context = useContext(DifficultWordsContext);
  if (context === undefined) {
    throw new Error('useDifficultWords must be used within a DifficultWordsProvider');
  }
  return context;
}
