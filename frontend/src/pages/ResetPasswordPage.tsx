import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pwMatch, setPwMatch] = useState(true);

  // If no token in URL, show an immediate error
  useEffect(() => {
    if (!token) setError('No reset token found. Please use the link from your email.');
  }, [token]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get('newPassword') ?? '');
    const confirmNewPassword = String(fd.get('confirmNewPassword') ?? '');

    if (newPassword !== confirmNewPassword) {
      setPwMatch(false);
      return;
    }
    setPwMatch(true);
    setBusy(true);

    try {
      const csrfToken = await getCsrfToken();
      await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ token, newPassword, confirmNewPassword }),
      });
      setSuccess(true);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login', { replace: true }), 3000);
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
          <h1 className="mb-7 mt-2 text-3xl font-black text-white">Reset password</h1>

          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            {success ? (
              /* ── Success state ── */
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">
                  ✅
                </div>
                <h2 className="mt-4 text-lg font-bold text-white">Password reset!</h2>
                <p className="mt-3 text-sm text-muted">
                  Your password has been updated successfully. Redirecting you to sign in…
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Sign in now
                </Link>
              </div>
            ) : !token ? (
              /* ── No token error ── */
              <div className="text-center">
                <p className="text-4xl">🔗</p>
                <h2 className="mt-4 text-lg font-bold text-white">Invalid reset link</h2>
                <p className="mt-3 text-sm text-muted">
                  This link is missing a token. Please use the exact link from your email.
                </p>
                <Link
                  to="/forgot-password"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Request a new link
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <p className="mb-6 text-sm text-muted">
                  Choose a strong new password with at least 8 characters.
                </p>
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm text-muted" htmlFor="rp-new-pw">
                    New password
                    <PasswordInput
                      id="rp-new-pw"
                      className="filter-input mt-2 w-full"
                      name="newPassword"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                  </label>
                  <label className="block text-sm text-muted" htmlFor="rp-confirm-pw">
                    Confirm new password
                    <PasswordInput
                      id="rp-confirm-pw"
                      className="filter-input mt-2 w-full"
                      name="confirmNewPassword"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                  </label>

                  {!pwMatch && (
                    <p className="text-sm text-rose-300" role="alert">Passwords do not match.</p>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                      <span className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true">✕</span>
                      <p className="text-sm text-rose-300" role="alert">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy || !token}
                    className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? 'Resetting…' : 'Set new password'}
                  </button>
                </form>
                <p className="mt-5 text-center text-sm text-muted">
                  <Link className="text-highlight hover:text-text" to="/forgot-password">
                    Request a new link
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
