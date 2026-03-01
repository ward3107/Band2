'use client';

import { useLanguage } from '@/contexts/LanguageContext';

const languages = [
  { code: 'en' as const, name: 'English', flag: '🇬🇧' },
  { code: 'he' as const, name: 'עברית', flag: '🇮🇱' },
  { code: 'ar' as const, name: 'العربية', flag: '🇸🇦' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-3 py-2 rounded-md font-medium transition-all ${
            language === lang.code
              ? 'bg-blue-600 text-white shadow-md scale-105'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          aria-label={`Switch to ${lang.name}`}
          aria-pressed={language === lang.code}
        >
          <span className="mr-1" aria-hidden="true">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
