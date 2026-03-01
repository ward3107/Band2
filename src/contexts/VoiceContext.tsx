'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

interface VoiceSettings {
  preferredVoice: string | null;
  autoSelect: boolean;
}

interface VoiceContextType {
  voices: SpeechSynthesisVoice[];
  preferredVoice: string | null;
  setPreferredVoice: (voice: string | null) => void;
  speak: (text: string, lang?: string, rate?: number) => void;
  isSpeaking: boolean;
  cancel: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredVoice, setPreferredVoice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesLoaded = useRef(false);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        voicesLoaded.current = true;

        // Auto-select best Google voice if no preference saved
        const saved = localStorage.getItem('preferred-voice');
        if (!saved && availableVoices.length > 0) {
          const googleVoice = availableVoices.find(v =>
            v.lang.startsWith('en') && v.name.includes('Google') && v.name.includes('US')
          );
          if (googleVoice) {
            setPreferredVoice(googleVoice.name);
            localStorage.setItem('preferred-voice', googleVoice.name);
          }
        } else if (saved) {
          setPreferredVoice(saved);
        }
      }
    };

    loadVoices();

    // Voices load asynchronously in some browsers
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Save preference when changed
  useEffect(() => {
    if (preferredVoice) {
      localStorage.setItem('preferred-voice', preferredVoice);
    }
  }, [preferredVoice]);

  const getBestVoice = (lang = 'en-US'): SpeechSynthesisVoice | null => {
    // Try preferred voice first
    if (preferredVoice) {
      const found = voices.find(v => v.name === preferredVoice);
      if (found) return found;
    }

    const langPrefix = lang.split('-')[0];

    // For English, prioritize Google US English (best quality)
    if (langPrefix === 'en') {
      const googleUS = voices.find(v =>
        v.name.includes('Google') && v.name.includes('US')
      );
      if (googleUS) return googleUS;

      const googleUK = voices.find(v =>
        v.name.includes('Google') && v.name.includes('UK')
      );
      if (googleUK) return googleUK;

      // Any Google English voice
      const googleEnglish = voices.find(v =>
        v.name.includes('Google') && v.lang.startsWith('en')
      );
      if (googleEnglish) return googleEnglish;
    }

    // Filter voices by language
    const langVoices = voices.filter(v => v.lang.startsWith(langPrefix));

    // Prioritize Google voices
    const googleVoice = langVoices.find(v => v.name.includes('Google'));
    if (googleVoice) return googleVoice;

    // Prioritize Microsoft voices
    const microsoftVoice = langVoices.find(v => v.name.includes('Microsoft'));
    if (microsoftVoice) return microsoftVoice;

    // Prioritize natural/neural voices
    const naturalVoice = langVoices.find(v =>
      v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Premium')
    );
    if (naturalVoice) return naturalVoice;

    // Use any voice for the language
    if (langVoices.length > 0) return langVoices[0];

    // Fallback to first available voice
    return voices[0] || null;
  };

  const speak = (text: string, lang = 'en-US', rate = 1) => {
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.volume = 1.0; // Max volume for clarity
    utterance.pitch = 1.0;   // Normal pitch for clear speech

    // Small delay to ensure voice is set properly
    setTimeout(() => {
      const voice = getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
    }, 50);
  };

  const cancel = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <VoiceContext.Provider
      value={{
        voices,
        preferredVoice,
        setPreferredVoice,
        speak,
        isSpeaking,
        cancel
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
