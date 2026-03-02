'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ApprovedTeacher {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export default function AdminTeachersPage() {
  const { profile, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approvedTeachers, setApprovedTeachers] = useState<ApprovedTeacher[]>([]);
  const [inputData, setInputData] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{
    added: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      router.push('/teacher/login');
      return;
    }

    if (profile?.role !== 'teacher') {
      router.push('/');
      return;
    }

    checkAdminAndLoad();
  }, [profile, authLoading]);

  const checkAdminAndLoad = async () => {
    if (!profile) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', profile.id)
      .single();

    if (!profileData?.is_admin) {
      router.push('/teacher/dashboard');
      return;
    }

    setIsAdmin(true);
    loadApprovedTeachers();
  };

  const loadApprovedTeachers = async () => {
    const token = session?.access_token;
    if (!token) return;

    try {
      const response = await fetch('/api/admin/teachers/bulk-create', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setApprovedTeachers(data.approved || []);
      }
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeachers = async () => {
    setError('');
    setResult(null);
    setAdding(true);

    const token = session?.access_token;
    if (!token) {
      setError('Not authenticated');
      setAdding(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/teachers/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: inputData })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add teachers');
        return;
      }

      setResult({
        added: data.results.added.length,
        skipped: data.results.skipped.length,
        failed: data.results.failed.length
      });
      setInputData('');
      await loadApprovedTeachers();

    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setAdding(false);
    }
  };

  const removeTeacher = async (id: string) => {
    const token = session?.access_token;
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/teachers/remove?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadApprovedTeachers();
      }
    } catch (err) {
      console.error('Failed to remove teacher:', err);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🔐</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Admin - Approved Teachers
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Add teacher emails to approve them
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Teachers Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Add Teacher Emails
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste emails (one per line)
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Format: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Name, email</code> or just <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">email</code>
            </p>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="John Smith, john@gmail.com&#10;Jane Doe, jane@gmail.com&#10;teacher3@gmail.com"
              className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleAddTeachers}
              disabled={adding || !inputData.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              {adding ? 'Adding...' : 'Add to Approved List'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300">
                ✓ Added {result.added} | ⊘ Skipped {result.skipped} (already exists) | ✗ Failed {result.failed}
              </p>
            </div>
          )}
        </div>

        {/* Approved Teachers List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Approved Teachers ({approvedTeachers.length})
          </h2>

          {approvedTeachers.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No approved teachers yet. Add emails above.</p>
          ) : (
            <div className="space-y-3">
              {approvedTeachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{teacher.full_name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{teacher.email}</div>
                  </div>
                  <button
                    onClick={() => removeTeacher(teacher.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How it works:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
            <li>Add teacher Gmail addresses above</li>
            <li>Tell teachers to open the app and click "Sign in with Google"</li>
            <li>Approved emails → Teacher Dashboard</li>
            <li>Everyone else → Student App</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
