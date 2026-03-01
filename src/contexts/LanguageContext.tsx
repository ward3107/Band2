'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'he' | 'ar';
export type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Direction mapping for languages
const languageDirection: Record<Language, Direction> = {
  en: 'ltr',
  he: 'rtl',
  ar: 'rtl',
};

// Basic translations (can be expanded)
const translations: Record<Language, Record<string, string>> = {
  en: {
    appTitle: 'Vocabulary Band II',
    home: 'Home',
    words: 'Words',
    practice: 'Practice',
    settings: 'Settings',
    accessibility: 'Accessibility',
    fontSize: 'Font Size',
    audioSpeed: 'Audio Speed',
    highContrast: 'High Contrast',
    reduceMotion: 'Reduce Motion',
    reset: 'Reset',
  },
  he: {
    appTitle: 'אוצר מילים - רמה II',
    home: 'בית',
    words: 'מילים',
    practice: 'תרגול',
    settings: 'הגדרות',
    accessibility: 'נגישות',
    fontSize: 'גודל פונט',
    audioSpeed: 'מהירות אודיו',
    highContrast: 'ניגודיות גבוהה',
    reduceMotion: 'הפחת תנועה',
    reset: 'איפוס',
  },
  ar: {
    appTitle: 'المفردات - المستوى الثاني',
    home: 'الرئيسية',
    words: 'الكلمات',
    practice: 'تمرين',
    settings: 'الإعدادات',
    accessibility: 'إمكانية الوصول',
    fontSize: 'حجم الخط',
    audioSpeed: 'سرعة الصوت',
    highContrast: 'تباين عالي',
    reduceMotion: 'تقليل الحركة',
    reset: 'إعادة تعيين',
  },
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

  const t = (key: string): string => {
    return translations[language][key] || key;
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
