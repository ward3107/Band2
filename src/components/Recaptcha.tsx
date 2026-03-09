'use client';

/**
 * reCAPTCHA v3 Component
 *
 * Invisible CAPTCHA that scores user interactions.
 * Loads Google reCAPTCHA script and provides token generation.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface RecaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  action?: string;
  trigger?: boolean; // Trigger execution when true
  reset?: boolean; // Reset trigger
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoaded = false;
let loadPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function Recaptcha({
  siteKey,
  onVerify,
  onError,
  action = 'submit',
  trigger = false,
  reset = false,
}: RecaptchaProps) {
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Load reCAPTCHA script
  useEffect(() => {
    if (!siteKey) {
      onError?.('reCAPTCHA site key not configured');
      return;
    }

    loadRecaptchaScript()
      .then(() => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            setIsReady(true);
          });
        }
      })
      .catch((error) => {
        onError?.(error.message);
      });
  }, [siteKey, onError]);

  // Execute when triggered
  useEffect(() => {
    if (trigger && isReady && !hasTriggeredRef.current && !isExecuting) {
      hasTriggeredRef.current = true;
      executeRecaptcha();
    }
  }, [trigger, isReady, isExecuting]);

  // Reset trigger
  useEffect(() => {
    if (reset) {
      hasTriggeredRef.current = false;
    }
  }, [reset]);

  const executeRecaptcha = useCallback(async () => {
    if (!isReady || isExecuting || !window.grecaptcha) return;

    setIsExecuting(true);

    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      onVerify(token);
    } catch (error: any) {
      onError?.(error?.message || 'CAPTCHA execution failed');
    } finally {
      setIsExecuting(false);
    }
  }, [siteKey, isReady, isExecuting, onVerify, onError]);

  return null; // Invisible component
}

/**
 * Hook to use reCAPTCHA
 */
export function useRecaptcha(siteKey: string) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(false);
  const [reset, setReset] = useState(false);

  const execute = useCallback(() => {
    setReset(false);
    setToken(null);
    setError(null);
    setTrigger(true);
  }, []);

  const resetCaptcha = useCallback(() => {
    setReset(true);
    setToken(null);
    setError(null);
    setTrigger(false);
  }, []);

  return {
    token,
    error,
    execute,
    reset: resetCaptcha,
    Component: ({ action = 'submit' }: { action?: string }) => (
      <Recaptcha
        siteKey={siteKey}
        onVerify={(t) => {
          setToken(t);
          setTrigger(false);
        }}
        onError={(e) => {
          setError(e);
          setTrigger(false);
        }}
        action={action}
        trigger={trigger}
        reset={reset}
      />
    ),
  };
}
