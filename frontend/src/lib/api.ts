export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

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

export const getCsrfToken = async () => {
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
  return body.data.csrfToken;
};

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
    throw new Error(getErrorMessage(body, 'Request failed. Please try again.'));
  }
  return body;
};
