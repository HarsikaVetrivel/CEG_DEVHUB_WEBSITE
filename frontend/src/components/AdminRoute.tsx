import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Protects routes that require the ADMIN role.
 * - Loading          → spinner
 * - Unauthenticated  → /admin/login
 * - STUDENT role     → /admin/login  (never redirect students into the student app from here)
 * - ADMIN role       → render children
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/admin/login', { replace: true });
    } else if (status === 'authenticated' && user?.role !== 'ADMIN') {
      // Student is logged in but has no admin rights — send them back to admin login
      navigate('/admin/login', { replace: true });
    }
  }, [status, user, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="text-sm text-muted">Verifying permissions…</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || user?.role !== 'ADMIN') return null;

  return <>{children}</>;
}
