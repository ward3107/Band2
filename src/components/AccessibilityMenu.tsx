'use client';

import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

export default function AccessibilityMenu() {
  const { settings, setFontSize, setAudioSpeed, toggleHighContrast, toggleReduceMotion, resetSettings } = useAccessibility();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 sm:bottom-6">
      <div className={`bg-white dark:bg-gray-800 rounded-t-xl shadow-2xl transition-all duration-300 w-full max-w-md ${
        settings.highContrast ? 'border-4 border-yellow-400' : ''
      }`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-t-xl transition-colors"
          aria-expanded={isOpen}
          aria-controls="accessibility-panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="font-semibold">{t('accessibility')}</span>
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Panel Content */}
        <div
          id="accessibility-panel"
          className={`overflow-hidden transition-all duration-300 ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('fontSize')}
              </label>
              <div className="flex gap-2">
                {(['sm', 'base', 'lg', 'xl', '2xl'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                      settings.fontSize === size
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`${t('fontSize')}: ${size}`}
                  >
                    {size === 'sm' ? 'A-' : size === '2xl' ? 'A+' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('audioSpeed')}: {settings.audioSpeed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.25"
                value={settings.audioSpeed}
                onChange={(e) => setAudioSpeed(parseFloat(e.target.value) as any)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                aria-label={`${t('audioSpeed')}: ${settings.audioSpeed}x`}
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-2">
              <button
                onClick={toggleHighContrast}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  settings.highContrast
                    ? 'bg-yellow-500 text-gray-900 shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={settings.highContrast}
              >
                {t('highContrast')}
              </button>
              <button
                onClick={toggleReduceMotion}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  settings.reduceMotion
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={settings.reduceMotion}
              >
                {t('reduceMotion')}
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetSettings}
              className="w-full py-2 px-4 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
            >
              {t('reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
