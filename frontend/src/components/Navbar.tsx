import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ProfileDrawer } from './ProfileDrawer';

type NavbarProps = {
  variant: 'public' | 'authenticated' | 'admin';
};

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Navbar({ variant }: NavbarProps) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Derive initials for the avatar button
  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Admin-only sign-out (admin has no profile drawer)
  const handleAdminSignOut = async () => {
    setSigningOut(true);
    setMenuOpen(false);
    try {
      await signOut();
      navigate('/admin/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  const ThemeToggle = () => (
    <button
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={toggle}
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted transition hover:border-primary/60 hover:text-highlight"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  return (
    <>
      <header className="mb-8 rounded-[28px] border border-border/80 bg-panel/85 px-5 py-3 shadow-glow backdrop-blur-xl">
        {/* ── Main row ── */}
        <div className="flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="CEG DEV HUB home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-highlight ring-1 ring-primary/40">
              &lt;/&gt;
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-highlight">CEG</span>
              <span className="block text-lg font-semibold text-text">DEV HUB</span>
            </span>
          </Link>

          {/* ── Public nav — desktop ── */}
          {variant === 'public' && (
            <nav className="hidden items-center gap-6 text-sm text-muted md:flex" aria-label="Main navigation">
              <Link className="transition hover:text-text" to="/hackathons">Hackathons</Link>
              <a className="transition hover:text-text" href="#domains">Domains</a>
              <a className="transition hover:text-text" href="#stats">Stats</a>
              <a className="transition hover:text-text" href="#community">Community</a>
            </nav>
          )}

          {/* ── Authenticated (student) nav — desktop ── */}
          {variant === 'authenticated' && (
            <nav className="hidden items-center gap-1 text-sm text-muted md:flex" aria-label="Student navigation">
              <Link className="rounded-full px-3 py-2 transition hover:bg-card hover:text-text" to="/dashboard">Dashboard</Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-card hover:text-text" to="/bookmarks">Bookmarks</Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-card hover:text-text" to="/notifications">Notifications</Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-card hover:text-text" to="/hackathons">Directory</Link>
            </nav>
          )}

          {/* ── Admin nav — desktop ── */}
          {variant === 'admin' && (
            <nav className="hidden items-center gap-1 text-sm text-muted md:flex" aria-label="Admin navigation">
              <Link className="rounded-full px-3 py-2 transition hover:bg-card hover:text-text" to="/admin">Hackathon Management</Link>
            </nav>
          )}

          {/* ── Right-side controls ── */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Desktop-only public CTAs */}
            {variant === 'public' && (
              <div className="hidden items-center gap-3 sm:flex">
                <Link to="/login" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-text transition hover:border-primary/80">
                  Log in
                </Link>
                <Link to="/register" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90">
                  Join now
                </Link>
              </div>
            )}

            {/* ── Student profile avatar button (opens drawer) ── */}
            {variant === 'authenticated' && (
              <button
                id="profile-avatar-btn"
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open profile settings"
                title="Profile & settings"
                className="group relative hidden h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-highlight ring-2 ring-primary/30 transition hover:bg-primary/30 hover:ring-primary/60 md:flex"
              >
                {initials}
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel bg-emerald-400" aria-hidden="true" />
              </button>
            )}

            {/* Admin sign-out (desktop) */}
            {variant === 'admin' && (
              <button
                className="hidden rounded-full border border-border px-3 py-2 text-sm text-muted transition hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50 md:inline-flex"
                onClick={handleAdminSignOut}
                disabled={signingOut}
                type="button"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            )}

            {/* Mobile hamburger — visible below md */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted transition hover:border-primary/60 hover:text-highlight md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              type="button"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        {menuOpen && (
          <nav
            className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted md:hidden"
            aria-label="Mobile navigation"
          >
            {variant === 'public' ? (
              <>
                <Link className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" to="/hackathons" onClick={closeMenu}>Hackathons</Link>
                <a className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" href="#domains" onClick={closeMenu}>Domains</a>
                <a className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" href="#stats" onClick={closeMenu}>Stats</a>
                <a className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" href="#community" onClick={closeMenu}>Community</a>
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                  <Link to="/login" onClick={closeMenu} className="rounded-full border border-border bg-card px-4 py-2.5 text-center font-medium text-text transition hover:border-primary/80">Log in</Link>
                  <Link to="/register" onClick={closeMenu} className="rounded-full bg-primary px-4 py-2.5 text-center font-semibold text-white transition hover:opacity-90">Join now</Link>
                </div>
              </>
            ) : variant === 'authenticated' ? (
              <>
                <Link className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" to="/dashboard" onClick={closeMenu}>Dashboard</Link>
                <Link className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" to="/bookmarks" onClick={closeMenu}>Bookmarks</Link>
                <Link className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" to="/notifications" onClick={closeMenu}>Notifications</Link>
                <Link className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" to="/hackathons" onClick={closeMenu}>Directory</Link>
                {/* Mobile: open profile drawer */}
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => { closeMenu(); setDrawerOpen(true); }}
                    className="rounded-xl border border-border px-4 py-2.5 text-left transition hover:border-primary/50 hover:text-highlight"
                  >
                    👤 Profile &amp; settings
                  </button>
                </div>
              </>
            ) : (
              /* Admin mobile menu */
              <>
                <Link className="rounded-xl px-4 py-2.5 transition hover:bg-card hover:text-text" to="/admin" onClick={closeMenu}>Hackathon Management</Link>
                <div className="mt-2 border-t border-border pt-3">
                  <button
                    className="w-full rounded-xl border border-border px-4 py-2.5 text-left transition hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                    onClick={handleAdminSignOut}
                    disabled={signingOut}
                    type="button"
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </>
            )}
          </nav>
        )}
      </header>

      {/* ── Profile drawer (student only) ── */}
      {variant === 'authenticated' && (
        <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
