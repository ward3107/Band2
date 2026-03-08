'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Class, Assignment } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/useRoleGuard';

function sendClassViaWhatsApp(className: string, classCode: string) {
  const joinUrl = `${window.location.origin}/join?code=${classCode}`;
  const message = `Hi! Join my English class "${className}" on Vocab Band II.\n\nClass code: *${classCode}*\n\nOr tap this link to join directly: ${joinUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Create textarea element
  const textarea = document.createElement('textarea');
  textarea.value = text;

  // Style to be invisible but visible to the browser
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';

  document.body.appendChild(textarea);

  // Focus and select
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('execCommand copy failed:', err);
  }

  // Remove from DOM
  document.body.removeChild(textarea);

  // Return focus to body
  (document.activeElement as HTMLElement)?.blur();

  if (successful) {
    console.log('✓ Copied successfully:', text.substring(0, 50) + '...');
    return true;
  }

  console.error('✗ Copy failed');
  return false;
}

interface ActiveStudent {
  id: string;
  full_name: string | null;
  email: string;
  last_login: string | null;
  class_name: string;
}

interface StudentWithCode {
  id: string;
  full_name: string | null;
  email: string;
  student_code: string | null;
  last_login: string | null;
  class_name: string;
  class_id: string;
  failed_login_attempts: number | null;
  locked_until: string | null;
}

export default function TeacherDashboardPage() {
  const { profile, signOut, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/teacher/login',
  });
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);
  const [copiedClassCode, setCopiedClassCode] = useState<string | null>(null);

  useEffect(() => {
    if (!guardLoading && profile?.role === 'teacher') {
      loadData();
    }
  }, [guardLoading, profile]);

  const [totalStudents, setTotalStudents] = useState(0);
  const [allStudents, setAllStudents] = useState<StudentWithCode[]>([]);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Run independent queries in parallel
      const [adminResult, classesResult, assignmentsResult] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', profile.id).single(),
        supabase.from('classes').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      ]);

      setIsAdmin(adminResult.data?.is_admin || false);
      setClasses(classesResult.data || []);
      setAssignments(assignmentsResult.data || []);

      // Student count and active students depend on classes result
      if (classesResult.data && classesResult.data.length > 0) {
        const classIds = classesResult.data.map(c => c.id);
        const classNameById = new Map(classesResult.data.map(c => [c.id, c.name]));

        const [countResult, enrollmentsResult] = await Promise.all([
          supabase
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds),
          supabase
            .from('class_enrollments')
            .select('class_id, student_id, profiles!inner(id, full_name, email, last_login)')
            .in('class_id', classIds),
        ]);

        setTotalStudents(countResult.count ?? 0);

        // Build active students list (logged in within last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const students: ActiveStudent[] = [];
        const seen = new Set<string>();

        (enrollmentsResult.data || []).forEach((enrollment: Record<string, unknown>) => {
          const p = enrollment.profiles as Record<string, unknown> | null;
          if (!p || typeof p !== 'object') return;
          const id = p.id as string;
          if (seen.has(id)) return;
          seen.add(id);
          const lastLogin = p.last_login as string | null;
          if (lastLogin && lastLogin >= oneDayAgo) {
            students.push({
              id,
              full_name: p.full_name as string | null,
              email: p.email as string,
              last_login: lastLogin,
              class_name: classNameById.get(enrollment.class_id as string) || '',
            });
          }
        });

        students.sort((a, b) => (b.last_login || '').localeCompare(a.last_login || ''));
        setActiveStudents(students);

        // Fetch all students with their codes
        const allStudentsData = await Promise.all(
          classIds.map(async (classId) => {
            const { data: enrollments } = await supabase
              .from('class_enrollments')
              .select('student_id, profiles!inner(id, full_name, email, student_code, last_login, failed_login_attempts, locked_until)')
              .eq('class_id', classId);

            return (enrollments || []).map((e: Record<string, unknown>) => ({
              id: (e.profiles as Record<string, unknown>).id as string,
              full_name: (e.profiles as Record<string, unknown>).full_name as string | null,
              email: (e.profiles as Record<string, unknown>).email as string,
              student_code: (e.profiles as Record<string, unknown>).student_code as string | null,
              last_login: (e.profiles as Record<string, unknown>).last_login as string | null,
              failed_login_attempts: (e.profiles as Record<string, unknown>).failed_login_attempts as number | null,
              locked_until: (e.profiles as Record<string, unknown>).locked_until as string | null,
              class_name: classNameById.get(classId) || '',
              class_id: classId,
            }));
          })
        );

        setAllStudents(allStudentsData.flat());
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
    setLoading(false);
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete "${className}"? This will remove all student enrollments and unlink any assignments. This action cannot be undone.`)) {
      return;
    }

    // Optimistically remove from UI immediately for fast response
    const previousClasses = classes;
    setClasses(classes.filter(c => c.id !== classId));

    try {
      // Delete related records first (enrollments and assignment links)
      await Promise.all([
        supabase.from('class_enrollments').delete().eq('class_id', classId),
        supabase.from('assignment_classes').delete().eq('class_id', classId),
      ]);

      // Then delete the class
      const { error } = await supabase.from('classes').delete().eq('id', classId);

      if (error) {
        // Revert on error
        setClasses(previousClasses);
        alert('Failed to delete class: ' + error.message);
      }
    } catch (err) {
      // Revert on error
      setClasses(previousClasses);
      alert('Failed to delete class');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleCreateAssignment = () => {
    router.push('/teacher/assignments/create');
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment? This will also remove all student progress for it.')) return;

    setDeletingId(assignmentId);
    try {
      // Delete related records first, then the assignment
      await Promise.all([
        supabase.from('student_assignment_progress').delete().eq('assignment_id', assignmentId),
        supabase.from('assignment_classes').delete().eq('assignment_id', assignmentId),
      ]);
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('teacher_id', profile!.id);

      if (error) throw error;
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert('Failed to delete assignment. Please try again.');
    }
    setDeletingId(null);
  };

  const handleResetStudentCode = async (studentId: string, studentName: string) => {
    if (!confirm(`Reset the login code for "${studentName}"? The old code will stop working immediately.`)) return;

    setResettingStudentId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}/reset-code`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json.error || 'Failed to reset code');
        setResettingStudentId(null);
        return;
      }

      // Update the local state with the new code
      setAllStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, student_code: json.newCode, failed_login_attempts: 0, locked_until: null } : s)
      );

      alert(`✅ New code: ${json.newCode}\n\nShare this with the student. The old code no longer works.`);
    } catch (err) {
      console.error('Failed to reset code:', err);
      alert('Failed to reset code. Please try again.');
    }
    setResettingStudentId(null);
  };

  const handleUnlockAccount = async (studentId: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}/reset-code`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json.error || 'Failed to unlock account');
        return;
      }

      setAllStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, failed_login_attempts: 0, locked_until: null } : s)
      );

      alert('Account unlocked successfully!');
    } catch (err) {
      console.error('Failed to unlock account:', err);
      alert('Failed to unlock account. Please try again.');
    }
  };

  const handleCopyStudentCode = async (code: string) => {
    const text = `Student Code: ${code}`;
    if (await copyToClipboard(text)) {
      setCopiedClassCode(code);
      setTimeout(() => setCopiedClassCode(null), 2000);
    }
  };

  const isAccountLocked = (lockedUntil: string | null) => {
    if (!lockedUntil) return false;
    return new Date(lockedUntil) > new Date();
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
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl shrink-0">👩‍🏫</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Teacher Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome, {profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <a
                  href="/admin/teachers"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  Admin Panel
                </a>
              )}
              <a
                href="/"
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Student View →
              </a>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📚</div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{classes.length}</div>
                <div className="text-gray-600 dark:text-gray-400">Classes</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{assignments.length}</div>
                <div className="text-gray-600 dark:text-gray-400">Assignments</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👨‍🎓</div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {totalStudents}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Classes */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
            <button
              onClick={() => router.push('/teacher/classes/create')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              + Create Class
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No classes yet. Create your first class to get started!</p>
              <button
                onClick={() => router.push('/teacher/classes/create')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                Create Your First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{cls.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Class Code: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cls.class_code}</span></p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendClassViaWhatsApp(cls.name, cls.class_code)}
                      className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1"
                      title="Share class code via WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={async () => {
                        const joinUrl = `${window.location.origin}/join?code=${cls.class_code}`;
                        const text = `📚 Join my English class!\n\nClass Code: ${cls.class_code}\n\nLink: ${joinUrl}`;
                        console.log('Copying to clipboard:', text);
                        if (await copyToClipboard(text)) {
                          console.log('Copy successful!');
                          setCopiedClassCode(cls.class_code);
                          setTimeout(() => setCopiedClassCode(null), 2000);
                        } else {
                          console.log('Copy failed!');
                          alert('Failed to copy. Class code: ' + cls.class_code);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1"
                      title="Copy class code to clipboard"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                      {copiedClassCode === cls.class_code ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium text-red-600 dark:text-red-400"
                      title="Delete class"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Students */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Students</h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {allStudents.length} student{allStudents.length !== 1 ? 's' : ''} across {classes.length} class{classes.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {allStudents.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">👨‍🎓</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No students yet. Share your class codes to get started!</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Login Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Last Login</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {allStudents.map((student) => {
                      const locked = isAccountLocked(student.locked_until);
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {student.full_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                              {student.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {student.class_name}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                                {student.student_code || 'N/A'}
                              </code>
                              <button
                                onClick={() => student.student_code && handleCopyStudentCode(student.student_code)}
                                disabled={!student.student_code}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                                title="Copy code"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                              </button>
                              {copiedClassCode === student.student_code && (
                                <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {student.last_login
                              ? new Date(student.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="px-4 py-3">
                            {locked ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                🔒 Locked
                              </span>
                            ) : student.failed_login_attempts && student.failed_login_attempts > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                                ⚠️ {student.failed_login_attempts} failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                ✅ Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {locked && (
                                <button
                                  onClick={() => handleUnlockAccount(student.id)}
                                  className="px-2 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                                  title="Unlock account"
                                >
                                  Unlock
                                </button>
                              )}
                              <button
                                onClick={() => handleResetStudentCode(student.id, student.full_name || 'this student')}
                                disabled={resettingStudentId === student.id}
                                className="px-2 py-1 text-xs bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded"
                                title="Reset login code"
                              >
                                {resettingStudentId === student.id ? '...' : 'Reset Code'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* My Assignments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Assignments</h2>
            <button
              onClick={handleCreateAssignment}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              + Create Assignment
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No assignments yet. Create your first assignment!</p>
              <button
                onClick={handleCreateAssignment}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Create Assignment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {assignment.total_words} words • Due: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/teacher/assignments/${assignment.id}/results`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                      >
                        Results
                      </a>
                      <a
                        href={`/teacher/assignments/${assignment.id}/edit`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                      >
                        Edit
                      </a>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={deletingId === assignment.id}
                        className="flex-1 sm:flex-none px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {deletingId === assignment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
