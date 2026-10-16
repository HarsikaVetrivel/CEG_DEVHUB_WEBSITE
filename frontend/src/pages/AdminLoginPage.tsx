import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, API_BASE_URL, getCsrfToken, invalidateCsrfToken } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

type LoginReply = {
  success: true;
  data: { user: { id: string; fullName: string; email: string; role: 'STUDENT' | 'ADMIN' } };
};

/** Silently destroy the current session so a student login is revoked. */
async function destroySession() {
  try {
    const csrfToken = await getCsrfToken();
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    });
  } catch {
    // best-effort
  } finally {
    invalidateCsrfToken();
  }
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { status, user, refresh } = useAuth();
  // Track whether we're mid-submit so the useEffect doesn't override our error
  const submittingRef = useRef(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // If already authenticated as ADMIN (from a previous session), go straight to /admin.
  // If a student session is active and we are NOT in the middle of a submit, show an
  // "already logged in as student" warning — the AdminRoute will bounce them here anyway.
  useEffect(() => {
    if (submittingRef.current) return; // let submit handler own the error state
    if (status === 'authenticated') {
      if (user?.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        setError(
          'You are currently signed in as a student. Sign out of your student account first, or use admin credentials below.',
        );
      }
    }
  }, [status, user, navigate]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    submittingRef.current = true;

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    try {
      const csrfToken = await getCsrfToken();
      const response = await apiFetch<LoginReply>('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ email, password }),
      });

      if (response.data.user.role !== 'ADMIN') {
        // Login succeeded but the account is not an admin.
        // Immediately destroy the session we just created so the student is not
        // silently left logged in after visiting the admin portal.
        await destroySession();
        setError('Invalid admin credentials. Access to this portal is restricted to administrators.');
        return;
      }

      // Valid admin — refresh auth context and navigate
      submittingRef.current = false;
      refresh();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090f] px-4">

      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-rose-900/20 blur-[120px]" />
        <div className="absolute left-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-violet-900/15 blur-[100px]" />
      </div>

      {/* Grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">

        {/* Back to site */}
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 transition hover:text-zinc-300">
            ← Back to CEG DEV HUB
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">

          {/* Logo + title */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 shadow-lg shadow-rose-900/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-[#09090f]" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-400">
                Administrator Portal
              </p>
              <h1 className="mt-1.5 text-2xl font-black text-white">Admin Sign In</h1>
              <p className="mt-1 text-sm text-zinc-500">Restricted access · CEG DEV HUB</p>
            </div>
          </div>

          {/* Warning banner */}
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true">⚠</span>
            <p className="text-xs leading-relaxed text-amber-200/70">
              This portal is strictly for platform administrators. Unauthorised access attempts are logged.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
                Admin username or email
              </span>
              <input
                name="email"
                type="text"
                autoComplete="username"
                required
                placeholder="devhubadmin"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-rose-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-rose-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
                Password
              </span>
              <PasswordInput
                name="password"
                autoComplete="current-password"
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-rose-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-rose-500/20"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <span className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true">✕</span>
                <p className="text-sm text-rose-300" role="alert">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Sign in to Admin Portal'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 border-t border-white/8 pt-5 text-center">
            <p className="text-xs text-zinc-600">
              Not an admin?{' '}
              <Link to="/login" className="text-zinc-400 underline transition hover:text-zinc-200">
                Student sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-zinc-700">
          CEG DEV HUB · Admin Portal · All access logged
        </p>
      </div>
    </div>
  );
}
