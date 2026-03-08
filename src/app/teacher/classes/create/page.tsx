'use client';

import { useState } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Generate a random 6-character class code (uppercase letters + numbers)
function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar characters (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Send class code via WhatsApp
function sendClassViaWhatsApp(className: string, classCode: string) {
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${classCode}` : '';
  const message = `Hi! Join my English class "${className}" on Vocab Band II.\n\nClass code: *${classCode}*\n\nOr tap this link to join directly: ${joinUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// Copy to clipboard with fallback
async function copyToClipboard(text: string): Promise<boolean> {
  // Clear any existing selection
  window.getSelection()?.removeAllRanges();

  // Try modern API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Clipboard API succeeded, copied:', text);
      return true;
    } catch (err) {
      console.error('Clipboard API failed:', err);
      // Fall through to fallback method
    }
  }

  // Fallback: use textarea method
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  // Clear selection and select the textarea content
  textarea.focus();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const successful = document.execCommand('copy');
    console.log('execCommand copy result:', successful, 'text copied:', text);
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Copy failed:', err);
    document.body.removeChild(textarea);
    return false;
  }
}

export default function CreateClassPage() {
  const { profile, loading: guardLoading } = useRoleGuard('teacher', {
    loginRedirect: '/teacher/login',
  });
  const router = useRouter();
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClass, setCreatedClass] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (guardLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!className.trim()) {
      setError('Please enter a class name');
      return;
    }

    setLoading(true);

    try {
      // Generate unique class code
      let classCode = generateClassCode();

      // Check if code already exists and regenerate if needed
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('classes')
          .select('id')
          .eq('class_code', classCode)
          .maybeSingle();

        if (!existing) break; // Code is unique
        classCode = generateClassCode();
        attempts++;
      }

      // Create the class
      const { error: createError } = await supabase
        .from('classes')
        .insert({
          teacher_id: profile!.id,
          name: className.trim(),
          grade_level: gradeLevel.trim() || null,
          class_code: classCode,
        });

      if (createError) {
        console.error('Create class error:', createError);
        setError(`Failed to create class: ${createError.message} (code: ${createError.code})`);
        setLoading(false);
        return;
      }

      // Show success screen with class code
      setCreatedClass({ name: className.trim(), code: classCode });
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    const joinUrl = `${window.location.origin}/join?code=${createdClass!.code}`;
    const text = `Join my English class on Vocab Band II!\n\nClass code: ${createdClass!.code}\n\nOr join directly: ${joinUrl}`;
    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('Failed to copy. Please copy manually:\n\n' + text);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/teacher/dashboard');
  };

  // Show success screen
  if (createdClass) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={handleGoToDashboard}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Dashboard
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Class Created Successfully!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your class <strong>"{createdClass.name}"</strong> is ready
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-6 mb-6">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">
                Class Code
              </p>
              <p className="text-4xl font-mono font-bold text-indigo-800 dark:text-indigo-300 tracking-[0.2em] mb-2">
                {createdClass.code}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-500">
                Share this code with your students
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={handleCopyCode}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => sendClassViaWhatsApp(createdClass.name, createdClass.code)}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>

            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              Go to Dashboard →
            </button>

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
              💡 Tip: Screenshot this page or save the code somewhere safe!
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📚</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Class
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Students will use the class code to join your class
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Name *
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="7th Grade English - Class A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade Level (optional)
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select grade level...</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    What happens next?
                  </p>
                  <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• A unique 6-character class code will be generated</li>
                    <li>• Share the code with your students</li>
                    <li>• Students enter the code to join your class</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/teacher/dashboard')}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
              >
                {loading ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
