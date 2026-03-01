'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAuthPage() {
  const [status, setStatus] = useState('Checking...');
  const [results, setResults] = useState<any[]>([]);

  const testConnection = async () => {
    setResults([]);
    setStatus('Testing...');

    // Test 1: Can we connect to Supabase?
    try {
      const { data, error } = await supabase.from('profiles').select('count');
      setResults(prev => [...prev, { test: 'Connection', status: error ? '❌ Failed' : '✅ OK', detail: error ? (typeof error === 'string' ? error : error?.message || 'Connection failed') : 'Connected' }]);
    } catch (e: any) {
      setResults(prev => [...prev, { test: 'Connection', status: '❌ Error', detail: e?.message || 'Unknown error' }]);
    }

    // Test 2: Is auth working?
    const { data: { user } } = await supabase.auth.getUser();
    setResults(prev => [...prev, { test: 'Auth Session', status: user ? '✅ Logged in' : '⚪ Not logged in', detail: user?.email || 'No user' }]);

    // Test 3: Check if profile exists (if logged in)
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setResults(prev => [...prev, { test: 'Profile', status: profile ? '✅ Found' : '❌ Not found', detail: profile?.role || 'No profile' }]);
    }

    setStatus('Done!');
  };

  const testSignUp = async () => {
    // Use timestamp for unique Gmail-style emails (avoids validation issues)
    const email = 'testvocab' + Date.now() + '@gmail.com';
    const password = 'test123456';

    setResults(prev => [...prev, { test: 'Test Signup', status: '⏳ Trying...', detail: `Creating: ${email}` }]);

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setResults(prev => [...prev, { test: 'Test Signup', status: '❌ Failed', detail: typeof error === 'string' ? error : error?.message || 'Unknown error' }]);
      return;
    }

    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: 'Test User',
          role: 'teacher',
        });

      setResults(prev => [...prev, {
        test: 'Test Signup',
        status: profileError ? '❌ Profile failed' : '✅ Success!',
        detail: profileError ? (typeof profileError === 'string' ? profileError : profileError?.message || 'Unknown error') : 'User created: ' + email
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🧪 Supabase Connection Test</h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <span>Status: <strong>{status}</strong></span>
            <button
              onClick={testConnection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Test Connection
            </button>
          </div>

          <div className="mb-4">
            <button
              onClick={testSignUp}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              🧪 Test Create Account
            </button>
          </div>

          <div className="text-xs text-gray-500">
            <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...</p>
          </div>
        </div>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">{r.status.split(' ')[0]}</span>
                <div>
                  <div className="font-medium">{r.test}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{r.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
          <h3 className="font-semibold mb-2">📋 Before Login Works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to <a href="https://supabase.com/dashboard" target="_blank" className="underline" rel="noopener noreferrer">Supabase Dashboard</a></li>
            <li>Select your project</li>
            <li>Go to <strong>SQL Editor</strong></li>
            <li>Run the SQL from <code>vocab-app/supabase/schema.sql</code></li>
            <li>Go to <strong>Authentication</strong> → Enable Email provider</li>
            <li>Come back and test!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
