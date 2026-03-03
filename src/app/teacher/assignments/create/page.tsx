'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase, Class, Assignment } from '@/lib/supabase';

interface VocabularyWord {
  id: string;
  word: string;
  translations: { hebrew: string; arabic: string };
  ipa: string;
  category: string;
  type: string;
}

export default function CreateAssignmentPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'words' | 'classes' | 'review'>('details');

  useEffect(() => {
    // Don't redirect while auth is loading
    if (authLoading) return;

    if (!profile || profile.role !== 'teacher') {
      router.push('/teacher/login');
      return;
    }
    loadData();
  }, [profile, authLoading]);

  const loadData = async () => {
    try {
      // Load vocabulary words
      const vocabResponse = await fetch('/vocabulary.json');
      if (!vocabResponse.ok) throw new Error(`Failed to load vocabulary: HTTP ${vocabResponse.status}`);
      const vocabData = await vocabResponse.json();
      setAllWords(vocabData.words || []);

      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profile!.id);

      setClasses(classesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
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

  const toggleClass = (classId: string) => {
    const newSelected = new Set(selectedClasses);
    if (newSelected.has(classId)) {
      newSelected.delete(classId);
    } else {
      newSelected.add(classId);
    }
    setSelectedClasses(newSelected);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      // Validate
      if (!title.trim()) {
        setError('Please enter an assignment title');
        setSaving(false);
        return;
      }

      if (selectedWords.size === 0) {
        setError('Please select at least one word');
        setSaving(false);
        return;
      }

      if (selectedClasses.size === 0) {
        setError('Please select at least one class');
        setSaving(false);
        return;
      }

      if (!deadline) {
        setError('Please set a deadline');
        setSaving(false);
        return;
      }

      // Create assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          teacher_id: profile!.id,
          title: title.trim(),
          description: description.trim() || null,
          word_ids: Array.from(selectedWords),
          total_words: selectedWords.size,
          deadline: new Date(deadline).toISOString(),
        })
        .select()
        .single();

      if (assignmentError) {
        throw new Error(assignmentError.message || assignmentError.details || 'Failed to create assignment');
      }

      // Link assignment to classes
      const classLinks = Array.from(selectedClasses).map(classId => ({
        assignment_id: assignment.id,
        class_id: classId,
        teacher_id: profile!.id,
      }));

      const { error: linkError } = await supabase
        .from('assignment_classes')
        .insert(classLinks);

      if (linkError) {
        throw new Error(linkError.message || linkError.details || 'Failed to link assignment to classes');
      }

      // Create student progress records for all students in selected classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .in('class_id', Array.from(selectedClasses));

      if (enrollments && enrollments.length > 0) {
        const progressRecords = enrollments.map(enrollment => ({
          student_id: enrollment.student_id,
          assignment_id: assignment.id,
          status: 'not_started',
        }));

        await supabase
          .from('student_assignment_progress')
          .insert(progressRecords);
      }

      // Success! Redirect to dashboard
      router.push('/teacher/dashboard');
    } catch (err: unknown) {
      // Handle Supabase error objects properly
      let errorMessage = 'Failed to save assignment';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Get selected word details
  const selectedWordsDetails = allWords.filter(w => selectedWords.has(w.id));

  // Get selected class details
  const selectedClassesDetails = classes.filter(c => selectedClasses.has(c.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Assignment
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => step !== 'details' && setStep('details')}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  step === 'details' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                1. Details
              </button>
              <button
                onClick={() => step === 'details' && title.trim() && setStep('words')}
                disabled={step === 'details' && !title.trim()}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  step === 'words' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                } ${step === 'details' && !title.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                2. Words
              </button>
              <button
                onClick={() => step === 'words' && selectedWords.size > 0 && setStep('classes')}
                disabled={step === 'words' && selectedWords.size === 0}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  step === 'classes' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                } ${step === 'words' && selectedWords.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                3. Classes
              </button>
              <button
                onClick={() => step === 'classes' && selectedClasses.size > 0 && setStep('review')}
                disabled={step === 'classes' && selectedClasses.size === 0}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  step === 'review' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                } ${step === 'classes' && selectedClasses.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                4. Review
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 'details' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Assignment Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., School Words - Week 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add instructions for your students..."
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

              <button
                onClick={() => title.trim() && setStep('words')}
                disabled={!title.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Words */}
        {step === 'words' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Vocabulary Words</h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Search words, translations..."
              />
            </div>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Tip: Search for specific topics like "school", "food", or browse all 773 words
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {filteredWords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No words found</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWords.map((word) => (
                    <div
                      key={word.id}
                      onClick={() => toggleWord(word.id)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between ${
                        selectedWords.has(word.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
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
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{word.word}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {word.translations.hebrew} • {word.translations.arabic}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">{word.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('details')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg"
              >
                ← Back
              </button>
              <button
                onClick={() => selectedWords.size > 0 && setStep('classes')}
                disabled={selectedWords.size === 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
              >
                Continue ({selectedWords.size} words selected) →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Classes */}
        {step === 'classes' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assign to Classes</h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedClasses.size} class{selectedClasses.size !== 1 ? 'es' : ''} selected
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any classes yet.</p>
                <button
                  onClick={() => router.push('/teacher/classes/create')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                >
                  Create Your First Class
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => toggleClass(cls.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer flex items-center justify-between ${
                      selectedClasses.has(cls.id)
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedClasses.has(cls.id)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedClasses.has(cls.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{cls.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Code: {cls.class_code}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {cls.grade_level && `Grade ${cls.grade_level}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('words')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg"
              >
                ← Back
              </button>
              <button
                onClick={() => selectedClasses.size > 0 && setStep('review')}
                disabled={selectedClasses.size === 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Review & Create Assignment</h2>

            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                {description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{description}</p>}
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  📅 Due: {new Date(deadline).toLocaleString()}
                </p>
              </div>

              {/* Words Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {selectedWords.size} Vocabulary Words
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedWordsDetails.slice(0, 20).map((word) => (
                    <span
                      key={word.id}
                      className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                    >
                      {word.word}
                    </span>
                  ))}
                  {selectedWords.size > 20 && (
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                      +{selectedWords.size - 20} more
                    </span>
                  )}
                </div>
              </div>

              {/* Classes Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Assigned to {selectedClasses.size} Class{selectedClasses.size !== 1 ? 'es' : ''}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedClassesDetails.map((cls) => (
                    <span
                      key={cls.id}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
                    >
                      {cls.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('classes')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
