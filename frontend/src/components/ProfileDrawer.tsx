import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getCsrfToken } from '../lib/api';
import { DOMAINS, YEAR_OPTIONS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { PasswordInput } from './PasswordInput';

// Domain and year options are defined in lib/constants.ts — the single source
// of truth shared with AdminPage and Hackathons. Do not duplicate here.

type Tab = 'profile' | 'password';

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { user, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');

  /* ── Profile form state ── */
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [fullName, setFullName] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<number | ''>('');
  const [course, setCourse] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  /* ── Password form ── */
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwNotice, setPwNotice] = useState('');
  const pwFormRef = useRef<HTMLFormElement>(null);

  /* ── Sign out ── */
  const [signingOut, setSigningOut] = useState(false);

  // Sync form state when drawer opens or user changes
  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName);
      setYearOfStudy(user.yearOfStudy ?? '');
      setCourse(user.course ?? '');
      setSelectedDomains(user.interestedDomains ?? []);
      setProfileError('');
      setProfileNotice('');
      setPwError('');
      setPwNotice('');
    }
  }, [open, user]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  };

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileError('');
    setProfileNotice('');
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch('/api/v1/auth/profile', {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          yearOfStudy: yearOfStudy === '' ? null : Number(yearOfStudy),
          course: course.trim() || null,
          interestedDomains: selectedDomains,
        }),
      });
      refresh(); // re-fetch user so navbar initials etc. update
      setProfileNotice('Profile saved successfully.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwBusy(true);
    setPwError('');
    setPwNotice('');
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get('currentPassword') ?? '');
    const newPassword = String(fd.get('newPassword') ?? '');
    const confirmNewPassword = String(fd.get('confirmNewPassword') ?? '');
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      setPwBusy(false);
      return;
    }
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch('/api/v1/auth/password', {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      pwFormRef.current?.reset();
      setPwNotice('Password changed successfully.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setPwBusy(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      onClose();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Profile settings"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-panel shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-highlight ring-2 ring-primary/40">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{user?.fullName}</p>
              {/* Email shown read-only — cannot be changed */}
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-card hover:text-text"
            aria-label="Close profile panel"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border">
          {(['profile', 'password'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                tab === t
                  ? 'border-b-2 border-primary text-highlight'
                  : 'text-muted hover:text-text'
              }`}
            >
              {t === 'profile' ? '👤 Profile' : '🔐 Password'}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-6">

          {/* ════ PROFILE TAB ════ */}
          {tab === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-5">

              {/* Full name */}
              <div>
                <label className="block text-sm text-muted" htmlFor="drawer-fullname">
                  Full name
                  <input
                    id="drawer-fullname"
                    className="filter-input mt-2 w-full"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </label>
              </div>

              {/* Email — read-only, clearly labelled */}
              <div>
                <p className="text-sm text-muted">Email address</p>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5">
                  <span className="flex-1 truncate text-sm text-muted">{user?.email}</span>
                  <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted">
                    Fixed
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted/60">Your email is set at registration and cannot be changed.</p>
              </div>

              {/* Year of study */}
              <div>
                <label className="block text-sm text-muted" htmlFor="drawer-year">
                  Year of study
                  <select
                    id="drawer-year"
                    className="filter-input mt-2 w-full"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">— Not specified —</option>
                    {YEAR_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Course / programme */}
              <div>
                <label className="block text-sm text-muted" htmlFor="drawer-course">
                  Course / programme
                  <input
                    id="drawer-course"
                    className="filter-input mt-2 w-full"
                    placeholder="e.g. B.E. Computer Science"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    maxLength={120}
                  />
                </label>
              </div>

              {/* Interested domains — multi-select chips */}
              <div>
                <p className="text-sm text-muted">Interested domains</p>
                <p className="mt-0.5 text-xs text-muted/60">Pick any that match your interests.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DOMAINS.map((domain) => {
                    const active = selectedDomains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'border-primary bg-primary/20 text-highlight'
                            : 'border-border bg-background/60 text-muted hover:border-primary/50 hover:text-text'
                        }`}
                      >
                        {active && <span aria-hidden="true" className="mr-1">✓</span>}
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {profileError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                  <span className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true">✕</span>
                  <p className="text-sm text-rose-300" role="alert">{profileError}</p>
                </div>
              )}
              {profileNotice && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <span className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true">✓</span>
                  <p className="text-sm text-emerald-300" role="status">{profileNotice}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={profileBusy}
                className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {profileBusy ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          )}

          {/* ════ PASSWORD TAB ════ */}
          {tab === 'password' && (
            <form ref={pwFormRef} onSubmit={changePassword} className="space-y-5">
              <label className="block text-sm text-muted" htmlFor="drawer-current-pw">
                Current password
                <PasswordInput
                  id="drawer-current-pw"
                  className="filter-input mt-2 w-full"
                  name="currentPassword"
                  autoComplete="current-password"
                  minLength={1}
                  required
                />
              </label>
              <label className="block text-sm text-muted" htmlFor="drawer-new-pw">
                New password
                <PasswordInput
                  id="drawer-new-pw"
                  className="filter-input mt-2 w-full"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
              <label className="block text-sm text-muted" htmlFor="drawer-confirm-pw">
                Confirm new password
                <PasswordInput
                  id="drawer-confirm-pw"
                  className="filter-input mt-2 w-full"
                  name="confirmNewPassword"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>

              {pwError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                  <span className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true">✕</span>
                  <p className="text-sm text-rose-300" role="alert">{pwError}</p>
                </div>
              )}
              {pwNotice && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <span className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true">✓</span>
                  <p className="text-sm text-emerald-300" role="status">{pwNotice}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={pwBusy}
                className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {pwBusy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>

        {/* ── Footer — sign out ── */}
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
    </>
  );
}
