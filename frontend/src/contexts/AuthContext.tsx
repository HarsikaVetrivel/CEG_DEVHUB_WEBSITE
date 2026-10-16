import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, getCsrfToken, invalidateCsrfToken } from '../lib/api';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  yearOfStudy: number | null;
  course: string | null;
  interestedDomains: string[];
};

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Re-run the session check — call after a successful login */
  refresh: () => void;
  /** POST logout, clear state, and invalidate CSRF cache */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  refresh: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const checkSession = useCallback(() => {
    // Cancel any in-flight check before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 10-second safety net — if backend is unreachable, don't hang forever
    const timer = setTimeout(() => controller.abort(), 10_000);

    setStatus('loading');
    fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timer);
        if (res.ok) {
          const body = (await res.json()) as { data: { user: AuthUser } };
          setUser(body.data.user);
          setStatus('authenticated');
        } else {
          setUser(null);
          setStatus('unauthenticated');
        }
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        // AbortError = deliberate cancel, not a real error
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setUser(null);
        setStatus('unauthenticated');
      });
  }, []);

  useEffect(() => {
    checkSession();
    return () => { abortRef.current?.abort(); };
  }, [checkSession]);

  const signOut = useCallback(async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
    } catch {
      // Proceed with local cleanup even if the API call fails
    } finally {
      invalidateCsrfToken();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, refresh: checkSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
