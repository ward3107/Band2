'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type AudioSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5;

interface AccessibilitySettings {
  fontSize: FontSize;
  audioSpeed: AudioSpeed;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  setFontSize: (size: FontSize) => void;
  setAudioSpeed: (speed: AudioSpeed) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const defaultSettings: AccessibilitySettings = {
  fontSize: 'base',
  audioSpeed: 1,
  highContrast: false,
  reduceMotion: false,
};

const fontSizeMap: Record<FontSize, string> = {
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse accessibility settings:', e);
      }
    }
    setMounted(true);
  }, []);

  // Apply font size to CSS variable
  useEffect(() => {
    if (mounted) {
      document.documentElement.style.setProperty('--font-size-base', fontSizeMap[settings.fontSize]);
      document.documentElement.style.setProperty('--font-size-sm', fontSizeMap[settings.fontSize]);
      document.documentElement.style.setProperty('--font-size-lg', fontSizeMap[settings.fontSize]);
      document.documentElement.style.setProperty('--font-size-xl', fontSizeMap[settings.fontSize]);
      document.documentElement.style.setProperty('--font-size-2xl', fontSizeMap[settings.fontSize]);

      // Apply high contrast
      if (settings.highContrast) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }

      // Apply reduced motion
      if (settings.reduceMotion) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }

      // Save to localStorage
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    }
  }, [settings, mounted]);

  const setFontSize = (size: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const setAudioSpeed = (speed: AudioSpeed) => {
    setSettings(prev => ({ ...prev, audioSpeed: speed }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const toggleReduceMotion = () => {
    setSettings(prev => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        setFontSize,
        setAudioSpeed,
        toggleHighContrast,
        toggleReduceMotion,
        resetSettings,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
