export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

type ErrorPayload = {
  error?: { message?: string };
};

export const getErrorMessage = (body: unknown, fallback: string) => {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    (body as ErrorPayload).error?.message
  ) {
    return (body as ErrorPayload).error!.message!;
  }
  return fallback;
};

// ── CSRF token cache ─────────────────────────────────────────────
// Token is per-session. The server mints a fresh token on every login
// and returns it in the login response body. Call seedCsrfToken() with
// that value immediately after login so mutations don't use a stale token
// from a previous session. Call invalidateCsrfToken() on logout.
let _csrfToken: string | null = null;

export const invalidateCsrfToken = (): void => {
  _csrfToken = null;
};

/** Prime the cache with the token returned by the login response. */
export const seedCsrfToken = (token: string): void => {
  _csrfToken = token;
};

export const getCsrfToken = async (): Promise<string> => {
  if (_csrfToken) return _csrfToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/csrf`, {
    credentials: 'include',
  });
  const body = (await response.json()) as {
    data?: { csrfToken?: string };
    error?: { message?: string };
  };
  if (!response.ok || !body.data?.csrfToken) {
    throw new Error(body.error?.message ?? 'Could not start a secure session. Please retry.');
  }
  _csrfToken = body.data.csrfToken;
  return _csrfToken;
};

// ── Generic API fetch ─────────────────────────────────────────────
export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as T & ErrorPayload;
  if (!response.ok) {
    // Clear cached CSRF token on 403 so next mutation fetches fresh one
    if (response.status === 403) invalidateCsrfToken();
    throw new Error(getErrorMessage(body, 'Request failed. Please try again.'));
  }
  return body;
};
