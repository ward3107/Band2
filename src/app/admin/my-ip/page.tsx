'use client';

/**
 * Admin IP Utility Page
 *
 * Shows the current client IP address to help with whitelist configuration.
 * Accessible at /admin/my-ip
 */

import { useEffect, useState } from 'react';

export default function MyIPPage() {
  const [clientIP, setClientIP] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIP = async () => {
      try {
        // Try multiple IP detection services
        const services = [
          { url: 'https://api.ipify.org?format=json', field: 'ip' },
          { url: 'https://ifconfig.me/ip', field: null }, // Plain text
          { url: 'https://icanhazip.com', field: null }, // Plain text
        ];

        for (const service of services) {
          try {
            const response = await fetch(service.url);
            if (response.ok) {
              const text = await response.text();
              const ip = service.field
                ? JSON.parse(text)[service.field]
                : text.trim();
              setClientIP(ip);
              setLoading(false);
              return;
            }
          } catch {
            continue; // Try next service
          }
        }

        throw new Error('All IP detection services failed');
      } catch (err: any) {
        setError(err?.message || 'Failed to detect IP');
        setLoading(false);
      }
    };

    fetchIP();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🌐</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Your IP Address
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Use this IP for admin whitelist configuration
          </p>
        </div>

        {/* IP Display */}
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6 mb-6">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin text-3xl mb-2">🔄</div>
              <p className="text-gray-600 dark:text-gray-400">Detecting IP...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-3xl mb-2">❌</div>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Your Public IP:</p>
              <code className="text-2xl font-mono font-bold text-gray-900 dark:text-white break-all">
                {clientIP}
              </code>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              📝 How to Whitelist This IP:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li>Copy the IP address above</li>
              <li>Add to <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code>:</li>
              <li>
                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">
                  ADMIN_IP_WHITELIST={clientIP}
                </code>
              </li>
            </ol>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
              ⚠️ Important Notes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300">
              <li>Your IP may change (dynamic IP)</li>
              <li>Leave empty to disable whitelist</li>
              <li>Use CIDR for ranges: <code>192.168.0.0/24</code></li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              if (clientIP && clientIP !== 'Loading...') {
                navigator.clipboard.writeText(clientIP);
              }
            }}
            disabled={!clientIP || clientIP === 'Loading...' || loading}
            className="flex-1 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {clientIP && clientIP !== 'Loading...' ? '📋 Copy IP' : 'Loading...'}
          </button>
          <a
            href="/admin/login"
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 px-4 rounded-lg transition-colors text-center"
          >
            ← Admin Login
          </a>
        </div>

        {/* Security Info */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <a
            href="https://www.google.com/search?q=what+is+my+ip"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          >
            Verify with external service →
          </a>
        </div>
      </div>
    </div>
  );
}
