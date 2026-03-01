'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '@/lib/translations';

export type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Direction mapping for languages
const languageDirection: Record<Language, Direction> = {
  en: 'ltr',
  he: 'rtl',
  ar: 'rtl',
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Load language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && ['en', 'he', 'ar'].includes(saved)) {
      setLanguage(saved);
    }
    setMounted(true);
  }, []);

  // Apply direction to document
  useEffect(() => {
    if (mounted) {
      const dir = languageDirection[language];
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
      localStorage.setItem('language', language);
    }
  }, [language, mounted]);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  // Translation function with parameter support
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations.en[key] || key;

    // Replace parameters in the text (e.g., {count}, {name})
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction: languageDirection[language],
        setLanguage: handleSetLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
