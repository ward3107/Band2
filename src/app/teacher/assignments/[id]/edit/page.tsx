'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Assignment } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/useRoleGuard';

interface VocabularyWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  ipa: string;
  category: string;
  type: string;
}

export default function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { profile, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/teacher/login',
  });
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignmentType, setAssignmentType] = useState<'flashcards' | 'quiz' | 'both'>('both');
  const [allowedModes, setAllowedModes] = useState<Set<string>>(new Set(['flashcards', 'quiz', 'fill-in-blank', 'matching', 'story', 'spelling', 'scramble']));
  const [customWords, setCustomWords] = useState<Array<{ word: string; translation: string }>>([]);
  const [customWordInput, setCustomWordInput] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guardLoading && profile?.role === 'teacher') {
      loadData();
    }
  }, [guardLoading, profile]);

  const loadData = async () => {
    try {
      const [assignmentResult, vocabResponse] = await Promise.all([
        supabase
          .from('assignments')
          .select('*')
          .eq('id', resolvedParams.id)
          .eq('teacher_id', profile!.id)
          .single(),
        fetch('/vocabulary.json'),
      ]);

      if (!assignmentResult.data) {
        router.push('/teacher/dashboard');
        return;
      }

      const a = assignmentResult.data as Assignment;
      setTitle(a.title);
      setDescription(a.description || '');
      setAssignmentType(a.assignment_type || 'both');
      if (a.allowed_modes && a.allowed_modes.length > 0) {
        setAllowedModes(new Set(a.allowed_modes));
      }
      if (a.custom_words) {
        setCustomWords(a.custom_words);
      }
      // Format deadline for datetime-local input
      const d = new Date(a.deadline);
      setDeadline(d.toISOString().slice(0, 16));
      setSelectedWords(new Set(a.word_ids || []));

      if (vocabResponse.ok) {
        const vocabData = await vocabResponse.json();
        setAllWords(vocabData.words || []);
      }
    } catch (err) {
      console.error('Failed to load assignment:', err);
    }
    setLoading(false);
  };

  const categories = [...new Set(allWords.map(w => w.category).filter(Boolean))].sort();

  const filteredWords = allWords.filter(word => {
    const matchesSearch = !searchTerm ||
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.translations.hebrew.includes(searchTerm) ||
      word.translations.arabic.includes(searchTerm);
    const matchesCategory = !categoryFilter || word.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleWord = (wordId: string) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId);
    } else {
      newSelected.add(wordId);
    }
    setSelectedWords(newSelected);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      if (!title.trim()) { setError('Please enter an assignment title'); setSaving(false); return; }
      if (selectedWords.size === 0 && customWords.length === 0) { setError('Please select at least one word or add custom words'); setSaving(false); return; }
      if (!deadline) { setError('Please set a deadline'); setSaving(false); return; }

      const { error: updateError } = await supabase
        .from('assignments')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          word_ids: Array.from(selectedWords),
          total_words: selectedWords.size + customWords.length,
          deadline: new Date(deadline).toISOString(),
          assignment_type: assignmentType,
          allowed_modes: Array.from(allowedModes),
          custom_words: customWords.length > 0 ? customWords : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedParams.id)
        .eq('teacher_id', profile!.id);

      if (updateError) throw new Error(updateError.message);

      router.push('/teacher/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  if (loading || guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shrink-0"
            >
              ← Back
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              Edit Assignment
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assignment Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instructions
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setDescription(prev => prev ? `${prev}\n${e.target.value}` : e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 mb-2"
                >
                  <option value="">Choose a preset instruction...</option>
                  <option value="Practice all words using flashcards, then take the quiz.">Practice all words using flashcards, then take the quiz.</option>
                  <option value="Study each word and its translation. Try to use them in sentences.">Study each word and its translation. Try to use them in sentences.</option>
                  <option value="Complete the quiz with at least 80% correct answers.">Complete the quiz with at least 80% correct answers.</option>
                  <option value="Review the words at least 3 times before the deadline.">Review the words at least 3 times before the deadline.</option>
                  <option value="Focus on spelling and pronunciation. Use the audio feature.">Focus on spelling and pronunciation. Use the audio feature.</option>
                  <option value="Try all study modes: flashcards, quiz, matching, and spelling.">Try all study modes: flashcards, quiz, matching, and spelling.</option>
                  <option value="Write each word in a sentence in your notebook after studying.">Write each word in a sentence in your notebook after studying.</option>
                </select>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Or write your own instructions..."
                />
              </div>
              <div>
                <label htmlFor="edit-deadline-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Deadline *
                </label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => (document.getElementById('edit-deadline-input') as HTMLInputElement | null)?.showPicker?.()}
                >
                  <input
                    id="edit-deadline-input"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Study Modes for Students *
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select which study modes students can use
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'flashcards', label: 'Flashcards', icon: '🎴' },
                    { value: 'quiz', label: 'Quiz', icon: '🧠' },
                    { value: 'fill-in-blank', label: 'Fill in Blank', icon: '✏️' },
                    { value: 'matching', label: 'Matching', icon: '🔗' },
                    { value: 'story', label: 'Story Mode', icon: '📖' },
                    { value: 'spelling', label: 'Spelling Bee', icon: '🔤' },
                    { value: 'scramble', label: 'Word Scramble', icon: '🔀' },
                  ]).map((opt) => {
                    const isSelected = allowedModes.has(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const next = new Set(allowedModes);
                          if (isSelected) next.delete(opt.value);
                          else next.add(opt.value);
                          setAllowedModes(next);
                        }}
                        className={`p-3 rounded-lg border-2 text-center transition-colors ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{opt.icon}</div>
                        <div className="text-xs font-medium">{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Words */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vocabulary Words</h2>
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                {selectedWords.size} selected
              </span>
            </div>

            {/* Toggle: Browse or Paste */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowPasteArea(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !showPasteArea
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Browse Words
              </button>
              <button
                onClick={() => setShowPasteArea(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showPasteArea
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Paste Word List
              </button>
            </div>

            {showPasteArea ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Paste a list of English words (one per line or comma-separated). We&apos;ll match them against the vocabulary bank.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 mb-3 font-mono text-sm"
                  placeholder={"school\nteacher\nhomework\nOR: school, teacher, homework"}
                />
                <button
                  onClick={() => {
                    const inputWords = pasteText
                      .split(/[,\n]+/)
                      .map(w => w.trim().toLowerCase())
                      .filter(Boolean);
                    const matched = new Set(selectedWords);
                    let matchCount = 0;
                    for (const inputWord of inputWords) {
                      const found = allWords.find(w => w.word.toLowerCase() === inputWord);
                      if (found) {
                        matched.add(found.id);
                        matchCount++;
                      }
                    }
                    setSelectedWords(matched);
                    setPasteText('');
                    alert(`Matched ${matchCount} out of ${inputWords.length} words. ${inputWords.length - matchCount > 0 ? `${inputWords.length - matchCount} words were not found in the vocabulary bank.` : ''}`);
                  }}
                  disabled={!pasteText.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
                >
                  Match & Add Words
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search words..."
                  />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''} shown
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newSelected = new Set(selectedWords);
                        filteredWords.forEach(w => newSelected.add(w.id));
                        setSelectedWords(newSelected);
                      }}
                      className="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                    >
                      Select All Shown
                    </button>
                    <button
                      onClick={() => {
                        const newSelected = new Set(selectedWords);
                        filteredWords.forEach(w => newSelected.delete(w.id));
                        setSelectedWords(newSelected);
                      }}
                      className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Deselect All Shown
                    </button>
                  </div>
                </div>

                {selectedWords.size > 0 && (
                  <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Selected Words:</p>
                      <button
                        onClick={() => setSelectedWords(new Set())}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {allWords.filter(w => selectedWords.has(w.id)).map(w => (
                        <span
                          key={w.id}
                          onClick={() => toggleWord(w.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded-full text-xs cursor-pointer hover:bg-indigo-700"
                        >
                          {w.word}
                          <span className="text-indigo-200">×</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {filteredWords.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No words found</div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredWords.map((word) => (
                        <div
                          key={word.id}
                          onClick={() => toggleWord(word.id)}
                          className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 ${
                            selectedWords.has(word.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            selectedWords.has(word.id)
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedWords.has(word.id) && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{word.word}</span>
                              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full shrink-0">{word.category}</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {word.translations.hebrew} • {word.translations.arabic}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Custom Words Section */}
            <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-2">
                Add Custom Words (not in vocabulary bank)
              </h3>
              <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                Format: <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">word - translation</code> (one per line)
              </p>
              <textarea
                value={customWordInput}
                onChange={(e) => setCustomWordInput(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 text-sm font-mono mb-2"
                placeholder={"adventure - הרפתקה\nbravery - אומץ"}
              />
              <button
                onClick={() => {
                  const lines = customWordInput.split('\n').filter(l => l.trim());
                  const newCustom: Array<{ word: string; translation: string }> = [];
                  for (const line of lines) {
                    const sep = line.includes(' - ') ? ' - ' : line.includes('\t') ? '\t' : line.includes(',') ? ',' : null;
                    if (sep) {
                      const parts = line.split(sep);
                      const word = parts[0]?.trim();
                      const translation = parts.slice(1).join(sep).trim();
                      if (word && translation) {
                        newCustom.push({ word, translation });
                      }
                    }
                  }
                  if (newCustom.length > 0) {
                    setCustomWords(prev => [...prev, ...newCustom]);
                    setCustomWordInput('');
                  } else if (lines.length > 0) {
                    alert('Could not parse words. Use format: word - translation (one per line)');
                  }
                }}
                disabled={!customWordInput.trim()}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-lg text-sm"
              >
                Add Custom Words
              </button>
              {customWords.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-200">{customWords.length} custom word{customWords.length !== 1 ? 's' : ''}:</p>
                    <button onClick={() => setCustomWords([])} className="text-xs text-red-600 dark:text-red-400 hover:underline">Clear All</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {customWords.map((cw, i) => (
                      <span
                        key={i}
                        onClick={() => setCustomWords(prev => prev.filter((_, idx) => idx !== i))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-600 text-white rounded-full text-xs cursor-pointer hover:bg-orange-700"
                      >
                        {cw.word} <span className="text-orange-200">×</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
