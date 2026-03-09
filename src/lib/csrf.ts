/**
 * CSRF Client Utilities
 *
 * Helper functions to include CSRF tokens in API requests.
 */

/**
 * Get the current CSRF token from the meta tag or cookie
 */
export async function getCsrfToken(): Promise<string> {
  // First try to get from the X-CSRF-Token header set by middleware
  const response = await fetch('/', { method: 'HEAD' });
  const token = response.headers.get('X-CSRF-Token');

  if (token) {
    return token;
  }

  // Fallback: try to get from cookie
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * Fetch wrapper that automatically includes CSRF token
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getCsrfToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  });
}

/**
 * FormData wrapper that includes CSRF token
 */
export async function createFormWithCsrf(formData: FormData): Promise<FormData> {
  const token = await getCsrfToken();
  formData.append('csrf_token', token);
  return formData;
}
