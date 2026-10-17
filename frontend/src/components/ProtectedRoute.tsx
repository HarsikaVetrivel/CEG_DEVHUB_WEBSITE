import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps a route so it is only accessible to authenticated STUDENT users.
 * - 'loading'         → spinner (with 10-s backend timeout via AuthContext)
 * - 'unauthenticated' → redirect to /login
 * - ADMIN role        → redirect to /admin (prevents 403 flood on student API)
 * - STUDENT role      → render children
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login', { replace: true });
    } else if (status === 'authenticated' && user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [status, user, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="text-sm text-muted">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || user?.role !== 'STUDENT') return null;

  return <>{children}</>;
}
