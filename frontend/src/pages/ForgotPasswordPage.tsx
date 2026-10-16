import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';

export function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ email }),
      });
      // Always show generic success to prevent email enumeration
      setNotice(
        'If an account with that email exists, a password reset link has been sent. Check your inbox (and spam folder).',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant="public" />
        <main className="mx-auto mt-8 max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Account recovery</p>
          <h1 className="mb-7 mt-2 text-3xl font-black text-white">Forgot password</h1>

          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            {notice ? (
              /* ── Success state ── */
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">
                  ✉️
                </div>
                <h2 className="mt-4 text-lg font-bold text-white">Check your email</h2>
                <p className="mt-3 text-sm text-muted">{notice}</p>
                <p className="mt-6 text-sm text-muted">
                  The link expires in <strong className="text-text">1 hour</strong> and can only be used once.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-muted transition hover:border-primary/50 hover:text-highlight"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <p className="mb-6 text-sm text-muted">
                  Enter the email address you registered with and we'll send you a reset link.
                </p>
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm text-muted" htmlFor="fp-email">
                    College email
                    <input
                      id="fp-email"
                      className="filter-input mt-2 w-full"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@college.edu"
                      required
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
                    className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
                <p className="mt-5 text-center text-sm text-muted">
                  Remembered it?{' '}
                  <Link className="text-highlight hover:text-text" to="/login">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
