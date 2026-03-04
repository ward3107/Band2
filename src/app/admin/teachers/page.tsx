'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/useRoleGuard';

interface ApprovedTeacher {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface CodeTeacher {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

function downloadCSV(teachers: { full_name: string; code: string }[]) {
  const rows = [
    ['Name', 'Code', 'Login URL (with code pre-filled)'],
    ...teachers.map((t) => [
      `"${t.full_name}"`,
      t.code,
      `${window.location.origin}/teacher/login?code=${t.code}`,
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teachers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function sendViaWhatsApp(name: string, code: string) {
  // Include ?code= in the URL so the teacher just taps the link and the code is pre-filled
  const loginUrl = `${window.location.origin}/teacher/login?code=${code}`;
  const message = `Hi ${name}! 👩‍🏫\n\nYour Vocab Band II teacher login code is: *${code}*\n\nTap this link to sign in — your code will be filled in automatically:\n${loginUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

function copyAllForWhatsApp(teachers: { full_name: string; code: string }[]) {
  const loginUrl = `${window.location.origin}/teacher/login`;
  const lines = teachers.map((t) => `${t.full_name} — ${t.code}`).join('\n');
  const message = `Vocab Band II Teacher Login Codes:\n\n${lines}\n\nLogin at: ${loginUrl}`;
  navigator.clipboard.writeText(message);
}

export default function AdminTeachersPage() {
  const { profile, session, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/teacher/login',
  });
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approvedTeachers, setApprovedTeachers] = useState<ApprovedTeacher[]>([]);
  const [codeTeachers, setCodeTeachers] = useState<CodeTeacher[]>([]);
  const [inputData, setInputData] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{
    added: Array<{ name: string; email?: string; code?: string }>;
    skipped: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!guardLoading && profile?.role === 'teacher') {
      checkAdminAndLoad();
    }
  }, [guardLoading, profile]);

  const checkAdminAndLoad = () => {
    if (!profile) return;

    if (!profile.is_admin) {
      router.push('/teacher/dashboard');
      return;
    }

    setIsAdmin(true);
    loadTeachers();
  };

  const loadTeachers = async () => {
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/teachers/bulk-create', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setApprovedTeachers(data.approved || []);
        setCodeTeachers(data.codeTeachers || []);
      }
    } catch {
      // silently fall through
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
        added: data.results.added,
        skipped: data.results.skipped.length,
        failed: data.results.failed.length,
      });
      setInputData('');
      await loadTeachers();

    } catch {
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
        await loadTeachers();
      }
    } catch {
      // removal failure handled by UI not refreshing
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleCopyAll = (teachers: { full_name: string; code: string }[]) => {
    copyAllForWhatsApp(teachers);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (loading || guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const allCodeTeachersForExport = codeTeachers.map((t) => ({
    full_name: t.full_name,
    code: t.email.split('@')[0].toUpperCase(),
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl shrink-0">🔐</span>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Admin - Manage Teachers
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add teachers by name (code login) or email (Google login)
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium self-start sm:self-auto"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Security Warning */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl flex gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg shrink-0">⚠️</span>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Keep codes private.</strong> Teacher codes are permanent passwords.
            Share them individually via WhatsApp or in person — do not post them publicly.
          </p>
        </div>

        {/* Add Teachers Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Add Teachers
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter teacher names or emails (one per line)
            </label>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 space-y-1">
              <p>• <strong>Name only</strong> → generates a login code: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Sarah Cohen</code></p>
              <p>• <strong>Name + email</strong> → Google sign-in: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Sarah Cohen, sarah@gmail.com</code></p>
            </div>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Sarah Cohen&#10;David Levy&#10;John Smith, john@gmail.com"
              className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <button
            onClick={handleAddTeachers}
            disabled={adding || !inputData.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
          >
            {adding ? 'Adding...' : 'Add Teachers'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
              <p className="text-green-700 dark:text-green-300 font-medium">
                ✓ Added {result.added.length} | ⊘ Skipped {result.skipped} | ✗ Failed {result.failed}
              </p>
              {result.added.filter(t => t.code).length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      New teacher login codes — share these privately:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => downloadCSV(
                          result.added
                            .filter(t => t.code)
                            .map(t => ({ full_name: t.name, code: t.code! }))
                        )}
                        className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 font-medium"
                      >
                        ↓ Download CSV
                      </button>
                      <button
                        onClick={() => handleCopyAll(
                          result.added
                            .filter(t => t.code)
                            .map(t => ({ full_name: t.name, code: t.code! }))
                        )}
                        className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 font-medium"
                      >
                        {copiedAll ? '✓ Copied!' : 'Copy All for WhatsApp'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {result.added.filter(t => t.code).map((t, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-green-200 dark:border-green-700 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white flex-1">{t.name}</span>
                        <code className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded">
                          {t.code}
                        </code>
                        <button
                          onClick={() => copyCode(t.code!)}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {copiedCode === t.code ? '✓ Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => sendViaWhatsApp(t.name, t.code!)}
                          className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                        >
                          Send via WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Code-Based Teachers List */}
        {codeTeachers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Code-Based Teachers ({codeTeachers.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">These teachers sign in with their code</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => downloadCSV(allCodeTeachersForExport)}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-gray-600"
                >
                  ↓ Download CSV
                </button>
                <button
                  onClick={() => handleCopyAll(allCodeTeachersForExport)}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-gray-600"
                >
                  {copiedAll ? '✓ Copied!' : 'Copy All for WhatsApp'}
                </button>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              {codeTeachers.map((teacher) => {
                const code = teacher.email.split('@')[0].toUpperCase();
                return (
                  <div key={teacher.id} className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{teacher.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Added {new Date(teacher.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded text-sm">
                        {code}
                      </code>
                      <button
                        onClick={() => copyCode(code)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {copiedCode === code ? '✓' : 'Copy'}
                      </button>
                      <button
                        onClick={() => sendViaWhatsApp(teacher.full_name, code)}
                        className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                      >
                        WhatsApp
                      </button>
                      <button
                        onClick={() => removeTeacher(teacher.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Google-Based Teachers List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Google Sign-In Teachers ({approvedTeachers.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">These teachers sign in with Google</p>

          {approvedTeachers.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No Google-based teachers yet.</p>
          ) : (
            <div className="space-y-3">
              {approvedTeachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{teacher.full_name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{teacher.email}</div>
                  </div>
                  <button
                    onClick={() => removeTeacher(teacher.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0"
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
            <li>Enter teacher names → system generates unique login codes</li>
            <li>Click &quot;Send via WhatsApp&quot; next to each teacher to send their code, or download the full list as CSV</li>
            <li>Teacher enters their code on the sign-in screen → Teacher Dashboard</li>
            <li>Or add with email for Google sign-in access</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
