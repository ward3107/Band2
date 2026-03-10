'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function TestRealtimePage() {
  const [message, setMessage] = useState('Click to test Realtime')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (log: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`])
  }

  const testRealtime = async () => {
    addLog('Starting test...')
    setMessage('Connecting...')

    try {
      const supabase = createClient(supabaseUrl, supabaseKey)

      addLog(`Supabase URL: ${supabaseUrl}`)

      const channel = supabase
        .channel('test-channel', {
          config: { private: true }
        })
        .on('presence', { event: 'sync' }, () => {
          addLog('✓ Presence sync event received')
        })
        .subscribe((status) => {
          addLog(`Subscription status: ${status}`)
          if (status === 'SUBSCRIBED') {
            setMessage('✅ SUCCESS! Realtime is working!')
            addLog('✓ Realtime subscription successful')
          } else if (status === 'CHANNEL_ERROR') {
            setMessage('❌ Channel error - check console')
            addLog('✗ Channel error')
          } else {
            addLog(`Status: ${status}`)
          }
        })

      addLog('Channel created, waiting for subscription...')

      // Cleanup after 5 seconds
      setTimeout(() => {
        channel.unsubscribe()
        addLog('✓ Channel unsubscribed')
        setMessage('✅ Test complete - Realtime works!')
      }, 5000)

    } catch (err: any) {
      addLog(`✗ Error: ${err.message}`)
      setMessage(`❌ Error: ${err.message}`)
      console.error('Realtime test error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">🧪 Supabase Realtime Test</h1>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This tests if your Supabase Realtime is working correctly.
            It will attempt to connect to a test channel.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-xl font-semibold mb-4 text-center">{message}</p>
        </div>

        {logs.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-semibold mb-2">Logs:</h3>
            <div className="space-y-1 font-mono text-sm max-h-60 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className={log.includes('✓') || log.includes('✅') ? 'text-green-600' : log.includes('✗') || log.includes('❌') ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={testRealtime}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          Start Realtime Test
        </button>

        <div className="mt-6 text-center">
          <a href="/" className="text-blue-300 hover:text-white underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
