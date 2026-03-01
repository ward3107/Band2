'use client';

import { useState } from 'react';
import { useVoice } from '@/contexts/VoiceContext';

export default function VoiceSelector() {
  const { voices, preferredVoice, setPreferredVoice, speak, isSpeaking } = useVoice();
  const [isOpen, setIsOpen] = useState(false);
  const [testWord, setTestWord] = useState('Hello, this is a test of the voice quality.');

  // Group voices by language
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  const hebrewVoices = voices.filter(v => v.lang.startsWith('he'));
  const arabicVoices = voices.filter(v => v.lang.startsWith('ar'));
  const otherVoices = voices.filter(v =>
    !v.lang.startsWith('en') &&
    !v.lang.startsWith('he') &&
    !v.lang.startsWith('ar')
  );

  const renderVoiceGroup = (voiceList: SpeechSynthesisVoice[], title: string) => {
    if (voiceList.length === 0) return null;

    // Sort Google voices first, then Microsoft, then others
    const sorted = [...voiceList].sort((a, b) => {
      if (a.name.includes('Google') && !b.name.includes('Google')) return -1;
      if (!a.name.includes('Google') && b.name.includes('Google')) return 1;
      if (a.name.includes('Microsoft') && !b.name.includes('Microsoft')) return -1;
      if (!a.name.includes('Microsoft') && b.name.includes('Microsoft')) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div key={title} className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{title}</h4>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {sorted.map((voice) => (
            <button
              key={voice.name}
              onClick={() => setPreferredVoice(voice.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                preferredVoice === voice.name
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex-1">{voice.name}</span>
                <span className="text-xs text-gray-400 ml-2">{voice.lang}</span>
                {voice.default && <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded">Default</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Voice Settings"
      >
        <span className={`${isSpeaking ? 'animate-pulse' : ''}`}>
          {isSpeaking ? '🔊' : '🎙️'}
        </span>
        <span className="text-sm hidden sm:inline">Voice</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Voice Settings
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose your preferred voice. Google voices are recommended for best quality.
              </p>

              {voices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Loading voices...</p>
              ) : (
                <>
                  {renderVoiceGroup(englishVoices, 'English Voices')}
                  {renderVoiceGroup(hebrewVoices, 'Hebrew Voices (עברית)')}
                  {renderVoiceGroup(arabicVoices, 'Arabic Voices (العربية)')}
                  {renderVoiceGroup(otherVoices, 'Other Voices')}
                </>
              )}
            </div>

            {/* Test Section */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Test the voice:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testWord}
                  onChange={(e) => setTestWord(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Enter text to speak..."
                />
                <button
                  onClick={() => speak(testWord)}
                  disabled={isSpeaking}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {isSpeaking ? 'Speaking...' : 'Speak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
