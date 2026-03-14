'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

interface TeacherInviteCode {
  id: string;
  code: string;
  is_claimed: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  intended_for: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Teacher {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_login: string | null;
  class_count: number;
}

interface Stats {
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  activeToday: number;
}

type Tab = 'dashboard' | 'codes' | 'teachers';

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}`;
}

function downloadCSV(codes: { intended_for: string | null; code: string }[]) {
  const loginUrl = `${window.location.origin}`;
  const rows = [
    ['Teacher Name', 'Code', 'Login URL'],
    ...codes.map((c) => [`"${c.intended_for || 'N/A'}"`, c.code, loginUrl]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teacher-invite-codes.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function sendViaWhatsApp(name: string, code: string) {
  const loginUrl = `${window.location.origin}`;
  const message = `Hi ${name}! Here's your Vocaband teacher access code:\n\n🔐 Code: ${code}\n\n1. Go to: ${loginUrl}\n2. Click "Sign in with Google"\n3. Choose "I'm a Teacher"\n4. Enter this code\n\nKeep this code safe!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminDashboardPage() {
  const { profile, session, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    activeToday: 0,
  });

  // Invite Codes
  const [codes, setCodes] = useState<TeacherInviteCode[]>([]);
  const [teacherNames, setTeacherNames] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unclaimed' | 'claimed'>('all');

  // Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  // ============================================
  // AUTH CHECK
  // ============================================
  useEffect(() => {
    if (authLoading) return;

    if (session && !profile) return;

    if (!session || !profile) {
      router.push('/');
      return;
    }

    if (!profile.is_admin) {
      router.push('/');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    loadAllData();
  }, [authLoading, profile, session, router]);

  // ============================================
  // LOAD ALL DATA
  // ============================================
  const loadAllData = async () => {
    await Promise.all([loadStats(), loadCodes(), loadTeachers()]);
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [teachersRes, studentsRes, classesRes, activeRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_login', today.toISOString()),
      ]);

      setStats({
        totalTeachers: teachersRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalClasses: classesRes.count || 0,
        activeToday: activeRes.count || 0,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadCodes = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('teacher_invite_codes')
        .select(`
          id, code, is_claimed, claimed_by, claimed_at, intended_for, created_at,
          profiles:claimed_by (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (!fetchError && data) {
        // Transform Supabase's array result to single object for foreign key join
        const transformedData = data.map((item) => ({
          ...item,
          profiles: item.profiles?.[0] ?? null,
        })) as TeacherInviteCode[];
        setCodes(transformedData);
      }
    } catch (err) {
      console.error('Error loading codes:', err);
    }
  };

  const loadTeachers = async () => {
    try {
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, last_login')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });

      if (teachersError) {
        console.error('Error loading teachers:', teachersError);
        return;
      }

      // Get class count for each teacher
      const { data: classCounts } = await supabase
        .from('classes')
        .select('teacher_id');

      // Count classes per teacher
      const countMap = new Map<string, number>();
      (classCounts || []).forEach((c) => {
        countMap.set(c.teacher_id, (countMap.get(c.teacher_id) || 0) + 1);
      });

      // Add class count to teachers
      const teachersWithCount = (teachersData || []).map((t) => ({
        ...t,
        class_count: countMap.get(t.id) || 0,
      }));

      setTeachers(teachersWithCount);
    } catch (err) {
      console.error('Error loading teachers:', err);
    }
  };

  // ============================================
  // GENERATE NEW CODES
  // ============================================
  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccess('');

    const names = teacherNames
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      setError('Please enter at least one teacher name');
      setGenerating(false);
      return;
    }

    try {
      const newCodes = names.map((name) => ({
        code: generateCode(),
        intended_for: name,
        created_by: profile?.id,
      }));

      const { error: insertError } = await supabase
        .from('teacher_invite_codes')
        .insert(newCodes);

      if (insertError) {
        setError('Failed to generate codes. Please try again.');
        setGenerating(false);
        return;
      }

      setSuccess(`Generated ${names.length} code(s)!`);
      setTeacherNames('');
      loadAllData();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // ============================================
  // DELETE UNCLAIMED CODE
  // ============================================
  const handleDeleteCode = async (codeId: string, code: string) => {
    if (!confirm(`Delete code "${code}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('teacher_invite_codes')
        .delete()
        .eq('id', codeId)
        .eq('is_claimed', false);

      if (deleteError) {
        setError('Failed to delete code');
        return;
      }

      setSuccess('Code deleted');
      loadCodes();
    } catch (err) {
      setError('Failed to delete code');
    }
  };

  // ============================================
  // DEACTIVATE TEACHER
  // ============================================
  const handleDeactivateTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Deactivate teacher "${teacherName}"? They will no longer be able to login.`)) {
      return;
    }

    setDeactivating(teacherId);
    try {
      // Instead of deleting, we change their role to 'student' or set a flag
      // This is safer than deleting the teacher
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', teacherId);

      if (updateError) {
        setError('Failed to deactivate teacher');
        setDeactivating(null);
        return;
      }

      setSuccess(`Teacher "${teacherName}" deactivated`);
      loadAllData();
    } catch (err) {
      setError('Failed to deactivate teacher');
    } finally {
      setDeactivating(null);
    }
  };

  // ============================================
  // COPY ALL UNCLAIMED CODES
  // ============================================
  const copyAllUnclaimed = () => {
    const unclaimed = filteredCodes.filter((c) => !c.is_claimed);
    if (unclaimed.length === 0) {
      setError('No unclaimed codes to copy');
      return;
    }

    const lines = unclaimed.map((c) => `${c.intended_for || 'Unknown'} — ${c.code}`).join('\n');
    const message = `Vocaband Teacher Invite Codes:\n\n${lines}\n\nEach teacher should:\n1. Go to ${window.location.origin}\n2. Sign in with Google\n3. Choose "I'm a Teacher"\n4. Enter their code`;

    navigator.clipboard.writeText(message);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔄</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter codes based on selected filter
  const filteredCodes = codes.filter((c) => {
    if (filter === 'unclaimed') return !c.is_claimed;
    if (filter === 'claimed') return c.is_claimed;
    return true;
  });

  const unclaimedCount = codes.filter((c) => !c.is_claimed).length;
  const claimedCount = codes.filter((c) => c.is_claimed).length;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              🔐 Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage teachers, students, and invite codes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/teacher/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
              ← Teacher Dashboard
            </a>
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 rounded-lg">
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 px-6 text-sm font-medium border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`pb-4 px-6 text-sm font-medium border-b-2 ${
              activeTab === 'codes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            🔑 Invite Codes
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`pb-4 px-6 text-sm font-medium border-b-2 ${
              activeTab === 'teachers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            👩‍🏫 Teachers ({stats.totalTeachers})
          </button>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Teachers</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalTeachers}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalStudents}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalClasses}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeToday}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab('codes')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  Generate Invite Codes
                </button>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                >
                  View All Teachers
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INVITE CODES TAB */}
        {activeTab === 'codes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Generate Codes */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Generate New Codes
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Enter one teacher name per line. A unique code will be generated for each.
                </p>

                <form onSubmit={handleGenerateCodes}>
                  <textarea
                    value={teacherNames}
                    onChange={(e) => setTeacherNames(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    rows={8}
                    placeholder="Ali Hassan&#10;Fatima Ahmed&#10;Mohamed Yusuf&#10;..."
                  />

                  <button
                    type="submit"
                    disabled={generating}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {generating ? 'Generating...' : 'Generate Codes'}
                  </button>
                </form>

                {/* Code Stats */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Code Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{unclaimedCount}</p>
                      <p className="text-xs text-blue-600">Unclaimed</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{claimedCount}</p>
                      <p className="text-xs text-green-600">Claimed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Codes List */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
                {/* Filters & Actions */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        filter === 'all'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      All ({codes.length})
                    </button>
                    <button
                      onClick={() => setFilter('unclaimed')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        filter === 'unclaimed'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      Unclaimed ({unclaimedCount})
                    </button>
                    <button
                      onClick={() => setFilter('claimed')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        filter === 'claimed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      Claimed ({claimedCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyAllUnclaimed}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      {copiedAll ? '✅ Copied!' : '📋 Copy All Unclaimed'}
                    </button>
                    <button
                      onClick={() => downloadCSV(filteredCodes.filter(c => !c.is_claimed))}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      📥 Download CSV
                    </button>
                  </div>
                </div>

                {/* Codes Table */}
                <div className="overflow-x-auto">
                  {filteredCodes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {filter === 'all'
                        ? 'No codes yet. Generate some above!'
                        : filter === 'unclaimed'
                        ? 'No unclaimed codes.'
                        : 'No claimed codes yet.'}
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">For</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Claimed By</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredCodes.map((codeRecord) => (
                          <tr key={codeRecord.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {codeRecord.code}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {codeRecord.intended_for || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {codeRecord.is_claimed ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  ✓ Claimed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {codeRecord.is_claimed && codeRecord.profiles ? (
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {codeRecord.profiles.full_name || 'No name'}
                                  </p>
                                  <p className="text-xs">{codeRecord.profiles.email}</p>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!codeRecord.is_claimed && (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(codeRecord.code);
                                      setCopiedCode(codeRecord.code);
                                      setTimeout(() => setCopiedCode(null), 2000);
                                    }}
                                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                  >
                                    {copiedCode === codeRecord.code ? '✅' : '📋'}
                                  </button>
                                  <button
                                    onClick={() => sendViaWhatsApp(codeRecord.intended_for || 'Teacher', codeRecord.code)}
                                    className="text-xs text-green-600 hover:text-green-800"
                                  >
                                    📱
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCode(codeRecord.id, codeRecord.code)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              {teachers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No teachers have signed up yet. Generate invite codes and share them with your teachers.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Classes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Active</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {teacher.full_name || 'No name'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {teacher.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(teacher.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center justify-center px-2.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {teacher.class_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(teacher.last_login)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeactivateTeacher(teacher.id, teacher.full_name || teacher.email)}
                            disabled={deactivating === teacher.id}
                            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deactivating === teacher.id ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
