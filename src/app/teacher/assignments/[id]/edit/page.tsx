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
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredWords = allWords.filter(word =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    word.translations.hebrew.includes(searchTerm) ||
    word.translations.arabic.includes(searchTerm)
  );

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
      if (selectedWords.size === 0) { setError('Please select at least one word'); setSaving(false); return; }
      if (!deadline) { setError('Please set a deadline'); setSaving(false); return; }

      const { error: updateError } = await supabase
        .from('assignments')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          word_ids: Array.from(selectedWords),
          total_words: selectedWords.size,
          deadline: new Date(deadline).toISOString(),
          assignment_type: assignmentType,
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
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assignment Type *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'both', label: 'Flashcards + Quiz', icon: '📚' },
                    { value: 'flashcards', label: 'Flashcards Only', icon: '🎴' },
                    { value: 'quiz', label: 'Quiz Only', icon: '🧠' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAssignmentType(opt.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        assignmentType === opt.value
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Words */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vocabulary Words</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedWords.size} selected</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Search words..."
            />
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
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white">{word.word}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          {word.translations.hebrew}
                        </span>
                      </div>
                    </div>
                  ))}
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
