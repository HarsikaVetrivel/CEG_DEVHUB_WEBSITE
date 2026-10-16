import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../contexts/AuthContext';

type UserSummary = {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
};

type AuthReply = {
  success: true;
  data: { user: UserSummary; csrfToken?: string };
};

type BookmarkItem = {
  _id: string;
  hackathon: {
    _id: string;
    name: string;
    slug: string;
    organizer: string;
    registrationDeadline: string;
    startDate: string;
    location: string;
    mode: string;
    domains: string[];
  };
};

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
  hackathonId?: { name: string; slug: string };
};

type Dashboard = {
  profile: {
    fullName: string;
    email: string;
    emailVerified: boolean;
    yearOfStudy: number | null;
    course: string | null;
    interestedDomains: string[];
  };
  summary: { bookmarks: number; unreadNotifications: number };
  reminderPreferences: { enabled: boolean; daysBefore: number[]; timeZone: string };
  upcomingBookmarkedDeadlines: Array<{
    _id: string;
    name: string;
    slug: string;
    registrationDeadline: string;
    startDate: string;
    lifecycleStatus: string;
  }>;
  notifications: NotificationItem[];
};

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));

function StudentShell({
  children,
  title,
  navVariant = 'authenticated',
}: {
  children: React.ReactNode;
  title: string;
  navVariant?: 'public' | 'authenticated';
}) {
  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant={navVariant} />
        <main>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Student space</p>
          <h1 className="mb-7 mt-2 text-3xl font-black text-white">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

/* ─── Auth Page ──────────────────────────────────────────────────── */
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { status, refresh } = useAuth();

  // F2: Redirect away if the user is already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/hackathons', { replace: true });
    }
  }, [status, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get('fullName') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    try {
      const csrfToken = await getCsrfToken();
      await apiFetch<AuthReply>(`/api/v1/auth/${mode}`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(
          mode === 'register'
            ? { fullName, email, password, confirmPassword }
            : { email, password },
        ),
      });
      if (mode === 'register') {
        // B2: Show success then auto-redirect to login
        setNotice('Account created! Redirecting to sign in…');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      } else {
        // Update shared auth state then navigate
        refresh();
        navigate('/hackathons', { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudentShell
      title={mode === 'login' ? 'Welcome back' : 'Join the community'}
      navVariant="public"
    >
      <div className="mx-auto max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <p className="mb-6 text-sm text-muted">
          {mode === 'login'
            ? 'Sign in to manage your bookmarked opportunities and reminders.'
            : 'Create your CEG DEV HUB student account.'}
        </p>
        {/* key={mode} forces full DOM reset when switching login ↔ register */}
        <form key={mode} className="space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <label className="block text-sm text-muted">
              Full name
              <input className="filter-input mt-2" name="fullName" autoComplete="name" minLength={2} maxLength={120} required />
            </label>
          )}
          <label className="block text-sm text-muted">
            College email
            <input className="filter-input mt-2" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="block text-sm text-muted">
            Password
            <PasswordInput className="filter-input mt-2 w-full" name="password" minLength={8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </label>
          {mode === 'register' && (
            <label className="block text-sm text-muted">
              Confirm password
              <PasswordInput className="filter-input mt-2 w-full" name="confirmPassword" minLength={8} maxLength={128} autoComplete="new-password" required />
            </label>
          )}
          {error && <p className="text-sm text-rose-200" role="alert">{error}</p>}
          {notice && <p className="text-sm text-emerald-300" role="status">{notice}</p>}
          {/* B5: was hover:bg-[#2f75ef] — replaced with theme-aware hover:opacity-90 */}
          <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50" disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create student account'}
          </button>
          {mode === 'login' && (
            <div className="text-center">
              <Link className="text-sm text-muted hover:text-highlight" to="/forgot-password">
                Forgot your password?
              </Link>
            </div>
          )}
        </form>
        <p className="mt-5 text-sm text-muted">
          {mode === 'login' ? 'New here? ' : 'Already registered? '}
          <Link className="text-highlight hover:text-text" to={mode === 'login' ? '/register' : '/login'}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </Link>
        </p>
      </div>
    </StudentShell>
  );
}

/* ─── Student Dashboard ──────────────────────────────────────────── */
export function StudentDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    apiFetch<{ success: true; data: Dashboard }>('/api/v1/student/dashboard')
      .then((response) => setDashboard(response.data))
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : 'Unable to load your dashboard.';
        if (message === 'Authentication required.') navigate('/login', { replace: true });
        else setError(message);
      });
  };

  useEffect(() => {
    void load();
  }, []);

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dashboard) return;
    setBusy(true);
    setError('');
    try {
      const formData = new FormData(event.currentTarget);
      const daysBefore = String(formData.get('daysBefore') ?? '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter(Number.isFinite);
      const preferences = {
        enabled: formData.get('enabled') === 'on',
        daysBefore,
        timeZone: String(formData.get('timeZone') ?? ''),
      };
      const csrfToken = await getCsrfToken();
      const response = await apiFetch<{
        data: { reminderPreferences: Dashboard['reminderPreferences'] };
      }>('/api/v1/student/reminder-preferences', {
        method: 'PUT',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(preferences),
      });
      setDashboard({ ...dashboard, reminderPreferences: response.data.reminderPreferences });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update reminders.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !dashboard) {
    return (
      <StudentShell title="Student dashboard">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100" role="alert">{error}</div>
      </StudentShell>
    );
  }
  if (!dashboard) return <StudentShell title="Student dashboard"><div className="h-72 animate-pulse rounded-[28px] bg-card" /></StudentShell>;

  return (
    <StudentShell title={`Welcome, ${dashboard.profile.fullName}`}>

      {/* ── Email verification banner ── */}
      {!dashboard.profile.emailVerified && (
        <div className="mb-6 flex items-start gap-3 rounded-[20px] border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <span className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true">⚠</span>
          <div>
            <p className="font-semibold text-amber-200">Your email address is not verified.</p>
            <p className="mt-1 text-sm text-amber-200/70">
              Email verification is managed by your platform administrator. Contact{' '}
              <a href="mailto:devhubadmin@ceg.ac.in" className="underline hover:text-amber-100">
                devhubadmin@ceg.ac.in
              </a>{' '}
              if you need your account verified.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-border bg-card p-5">
          <p className="text-sm text-muted">Saved hackathons</p>
          <p className="mt-2 text-3xl font-black text-white">{dashboard.summary.bookmarks}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-card p-5">
          <p className="text-sm text-muted">Unread notifications</p>
          <p className="mt-2 text-3xl font-black text-white">{dashboard.summary.unreadNotifications}</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p>}

      {/* ── Upcoming deadlines + Reminders ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[28px] border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Upcoming bookmarked deadlines</h2>
            <Link className="text-sm text-highlight hover:text-text" to="/bookmarks">All bookmarks</Link>
          </div>
          {dashboard.upcomingBookmarkedDeadlines.length ? (
            <div className="mt-4 space-y-3">
              {dashboard.upcomingBookmarkedDeadlines.map((hackathon) => (
                <Link key={hackathon._id} to={`/hackathons/${hackathon.slug}`} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4 hover:border-primary/40">
                  <span>
                    <span className="block font-semibold text-white">{hackathon.name}</span>
                    <span className="mt-1 block text-sm text-muted">Event {dateLabel(hackathon.startDate)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-highlight">{dateLabel(hackathon.registrationDeadline)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted">No saved upcoming deadlines yet.</p>
              <Link
                to="/hackathons"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-semibold text-highlight transition hover:bg-primary hover:text-white"
              >
                Browse Hackathon Directory →
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-border bg-card p-6">
          <h2 className="text-xl font-bold text-white">Reminder preferences</h2>
          <form key={JSON.stringify(dashboard.reminderPreferences)} className="mt-4 space-y-4" onSubmit={savePreferences}>
            <label className="flex items-center gap-3 text-sm text-text">
              <input
                className="h-4 w-4"
                style={{ accentColor: 'rgb(var(--color-primary))' }}
                name="enabled"
                type="checkbox"
                defaultChecked={dashboard.reminderPreferences.enabled}
              />
              Enable deadline reminders
            </label>
            <label className="block text-sm text-muted">
              Days before deadline (comma-separated)
              <input className="filter-input mt-2" name="daysBefore" defaultValue={dashboard.reminderPreferences.daysBefore.join(', ')} />
            </label>
            <label className="block text-sm text-muted">
              Time zone
              <input className="filter-input mt-2" name="timeZone" defaultValue={dashboard.reminderPreferences.timeZone} />
            </label>
            <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50" disabled={busy}>
              Save preferences
            </button>
          </form>
        </section>
      </div>

      {/* ── Recent notifications ── */}
      <section className="mt-6 rounded-[28px] border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent notifications</h2>
          <Link className="text-sm text-highlight hover:text-text" to="/notifications">View all</Link>
        </div>
        {dashboard.notifications.length ? (
          <div className="mt-4 space-y-3">
            {dashboard.notifications.map((notification) => (
              <div key={notification._id} className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="font-semibold text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-muted">{notification.message}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-muted">No notifications yet.</p>}
      </section>

      {/* ── Hint to profile ── */}
      <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-primary/20 bg-primary/5 px-5 py-4">
        <span className="text-lg" aria-hidden="true">👤</span>
        <p className="text-sm text-muted">
          To update your name, email, or password, click the{' '}
          <strong className="text-text">profile avatar</strong> in the top-right corner of the navigation bar.
        </p>
      </div>
    </StudentShell>
  );
}

/* ─── Bookmarks Page ─────────────────────────────────────────────── */
export function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [error, setError] = useState('');
  // B3: Loading state
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    apiFetch<{ data: { items: BookmarkItem[] } }>('/api/v1/student/bookmarks')
      .then((response) => setItems(response.data.items))
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : 'Unable to load bookmarks.';
        if (message === 'Authentication required.') navigate('/login', { replace: true });
        else setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (hackathonId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch(`/api/v1/student/bookmarks/${hackathonId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      setItems((current) => current.filter((item) => item.hackathon._id !== hackathonId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove bookmark.');
    }
  };

  return (
    <StudentShell title="Your bookmarks">
      {error && <p className="mb-4 text-sm text-rose-200" role="alert">{error}</p>}

      {/* B3: Skeleton while loading */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[24px] border border-border bg-card" />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item._id} className="rounded-[24px] border border-border bg-card p-5">
              <Link to={`/hackathons/${item.hackathon.slug}`} className="text-xl font-bold text-white hover:text-highlight">{item.hackathon.name}</Link>
              <p className="mt-1 text-sm text-muted">{item.hackathon.organizer}</p>
              <p className="mt-4 text-sm text-highlight">Deadline: {dateLabel(item.hackathon.registrationDeadline)}</p>
              <button className="mt-4 rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-rose-400/50 hover:text-rose-200 transition" onClick={() => remove(item.hackathon._id)}>
                Remove bookmark
              </button>
            </article>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="rounded-[24px] border border-border bg-card p-8 text-center">
          <p className="text-3xl">🔖</p>
          <p className="mt-4 text-muted">No bookmarks yet.</p>
          {/* F3: CTA to directory */}
          <Link className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" to="/hackathons">
            Browse Hackathon Directory →
          </Link>
        </div>
      )}
    </StudentShell>
  );
}

/* ─── Notifications Page ─────────────────────────────────────────── */
export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  // B4: Loading state
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    apiFetch<{ data: { items: NotificationItem[] } }>('/api/v1/student/notifications')
      .then((response) => setItems(response.data.items))
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : 'Unable to load notifications.';
        if (message === 'Authentication required.') navigate('/login', { replace: true });
        else setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const markRead = async (id: string) => {
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch(`/api/v1/student/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update notification.');
    }
  };

  // F4: Mark all unread notifications as read in parallel
  const markAllRead = async () => {
    const unread = items.filter((item) => !item.readAt);
    if (unread.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const csrfToken = await getCsrfToken();
      await Promise.all(
        unread.map((item) =>
          apiFetch(`/api/v1/student/notifications/${item._id}/read`, {
            method: 'PATCH',
            headers: { 'X-CSRF-Token': csrfToken },
          }),
        ),
      );
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update notifications.');
    } finally {
      setBusy(false);
    }
  };

  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <StudentShell title="Notifications">
      {error && <p className="mb-4 text-sm text-rose-200" role="alert">{error}</p>}

      {/* B4: Skeleton while loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[24px] border border-border bg-card" />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          {/* F4: Mark all as read button */}
          {unreadCount > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
              <button
                className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-primary/50 hover:text-text disabled:opacity-50"
                onClick={markAllRead}
                disabled={busy}
                type="button"
              >
                {busy ? 'Marking…' : 'Mark all as read'}
              </button>
            </div>
          )}
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item._id} className={`flex items-start justify-between gap-4 rounded-[24px] border bg-card p-5 transition ${item.readAt ? 'border-border opacity-70' : 'border-primary/30'}`}>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.message}</p>
                  <p className="mt-2 text-xs text-muted">{dateLabel(item.createdAt)}</p>
                </div>
                {!item.readAt && (
                  <button className="shrink-0 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-highlight transition hover:bg-primary hover:text-white" onClick={() => markRead(item._id)}>
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="rounded-[24px] border border-border bg-card p-6 text-muted">You're all caught up. 🎉</p>
      )}
    </StudentShell>
  );
}
