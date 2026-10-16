import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { API_BASE_URL } from '../lib/api';

type LandingHackathon = {
  _id: string;
  name: string;
  organizer: string;
  location: string;
  mode: string;
  registrationDeadline: string;
  startDate: string;
  domains: string[];
  lifecycleStatus: string;
  slug: string;
  requiredSkills: string[];
};

const domainOptions = [
  'AI/ML', 'Web Development', 'Mobile Development', 'Blockchain',
  'Cybersecurity', 'IoT', 'Cloud', 'Data Science', 'AR/VR', 'Open Innovation',
];

const stats = [
  { label: 'Hackathons', value: '128+' },
  { label: 'Students', value: '4.2K' },
  { label: 'Projects', value: '760' },
  { label: 'Success rate', value: '79%' },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));

function useFeaturedHackathons() {
  const [hackathons, setHackathons] = useState<LandingHackathon[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/hackathons?limit=3&sort=deadline&status=REGISTRATION_OPEN`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((body: { data?: { items?: LandingHackathon[] } }) => {
        setHackathons(body.data?.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { hackathons, loading };
}

export function LandingPage() {
  const navigate = useNavigate();
  const { hackathons, loading: hackathonsLoading } = useFeaturedHackathons();
  const spotlight = hackathons[0];
  const deadlines = hackathons.map((h) => ({ name: h.name, date: formatDate(h.registrationDeadline) }));
  const recentListings = hackathons.map((h) => ({ title: h.name, date: formatDate(h.startDate), domain: h.domains[0] ?? '' }));

  return (
    <div className="min-h-screen bg-background text-text antialiased selection:bg-primary/40">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Navbar variant="public" />

        <main className="space-y-10">
          {/* ── Hero ── */}
          <section className="overflow-hidden rounded-[32px] border border-border bg-panel/80 shadow-glow">
            <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-10 lg:px-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-highlight">
                  Local demo dataset · Phase 1
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                    Your Next Big Break Starts Here.
                  </h1>
                  <p className="max-w-xl text-base text-muted sm:text-lg">
                    Discover curated hackathons, innovation sprints, and campus opportunities built
                    for CEG students, builders, and future founders.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* Fixed: now a Link with login guard */}
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Explore Hackathons
                  </Link>
                  {/* Fixed: was a dead <button>, now links to /register */}
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-text transition hover:border-primary/60 hover:text-highlight"
                  >
                    Join the Community
                  </Link>
                </div>

                <div className="flex flex-wrap gap-6 pt-2 text-sm text-muted">
                  <div>
                    <span className="block text-2xl font-bold text-text">3.4K</span>
                    active builders
                  </div>
                  <div>
                    <span className="block text-2xl font-bold text-text">42</span>
                    live opportunities
                  </div>
                  <div>
                    <span className="block text-2xl font-bold text-text">18</span>
                    campus partners
                  </div>
                </div>
              </div>

              {/* Hero spotlight card */}
              <div className="hero-card-gradient rounded-[28px] border border-border p-4">
                <div className="rounded-[24px] border border-primary/20 bg-card/80 p-4 shadow-lg shadow-primary/10">
                  <div className="mb-4 flex items-center justify-between text-sm text-muted">
                    <span>Featured spotlight</span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                      {hackathonsLoading ? 'Loading…' : 'Trending now'}
                    </span>
                  </div>
                  {hackathonsLoading ? (
                    <div className="h-40 animate-pulse rounded-2xl bg-card/70" />
                  ) : spotlight ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-highlight">{spotlight.domains[0] ?? 'Open Innovation'}</p>
                            <h2 className="mt-2 text-2xl font-bold text-white">{spotlight.name}</h2>
                          </div>
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-highlight whitespace-nowrap">
                            {formatDate(spotlight.registrationDeadline)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-muted">
                        {[['Mode', spotlight.mode], ['Team', '2–5 members'], ['Location', spotlight.location], ['Organizer', spotlight.organizer]].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-border bg-background/50 p-3">
                            <p className="text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
                            <p className="mt-2 font-semibold text-text">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted">No featured hackathons at the moment.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Featured hackathons (teaser, login required for full details) ── */}
          <section id="featured" className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">
                  Featured events
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">Trending hackathons</h2>
              </div>
              {/* Fixed: was a dead <button>, now a Link */}
              <Link
                to="/login"
                className="text-sm font-medium text-highlight transition hover:text-white"
              >
                View all →
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {hackathonsLoading
                ? Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="h-72 animate-pulse rounded-[28px] border border-border bg-card" />
                  ))
                : hackathons.length > 0
                  ? hackathons.map((hackathon) => (
                      <article
                        key={hackathon._id}
                        className="group rounded-[28px] border border-border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
                      >
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-highlight">{hackathon.domains[0] ?? 'General'}</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">{hackathon.name}</h3>
                          </div>
                          <button
                            aria-label={`Bookmark ${hackathon.name} — login required`}
                            className="rounded-full border border-border bg-background/70 p-2 text-lg text-muted transition hover:border-primary/50 hover:text-highlight"
                            onClick={() => navigate('/login')}
                            type="button"
                          >♡</button>
                        </div>
                        <p className="text-sm text-muted">{hackathon.organizer}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {hackathon.requiredSkills.slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">{skill}</span>
                          ))}
                        </div>
                        <dl className="mt-5 space-y-3 text-sm text-muted">
                          <div className="flex items-center justify-between gap-3"><dt>Location</dt><dd className="font-medium text-text">{hackathon.location}</dd></div>
                          <div className="flex items-center justify-between gap-3"><dt>Mode</dt><dd className="font-medium text-text">{hackathon.mode}</dd></div>
                          <div className="flex items-center justify-between gap-3"><dt>Deadline</dt><dd className="font-medium text-highlight">{formatDate(hackathon.registrationDeadline)}</dd></div>
                        </dl>
                        <div className="mt-6 flex items-center justify-between">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">{hackathon.lifecycleStatus.replace('_', ' ')}</span>
                          <Link to="/login" className="rounded-full border border-primary/30 bg-primary/20 px-3 py-2 text-sm font-semibold text-highlight transition hover:bg-primary hover:text-white">🔒 Log in to view</Link>
                        </div>
                      </article>
                    ))
                  : (
                    <div className="col-span-3 rounded-[28px] border border-border bg-card px-6 py-12 text-center">
                      <p className="text-muted">No active hackathons at the moment. Check back soon!</p>
                    </div>
                  )}
            </div>

            {/* Login CTA below teaser */}
            <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-5 text-center">
              <p className="text-sm text-muted">
                Log in to access full hackathon details, deadlines, prizes, and registration links.
              </p>
              <div className="mt-3 flex justify-center gap-3">
                <Link
                  to="/login"
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-text transition hover:border-primary/60"
                >
                  Create account
                </Link>
              </div>
            </div>
          </section>

          {/* ── Deadlines + Domains ── */}
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-border bg-card p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">
                    Deadline radar
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Upcoming registration windows
                  </h2>
                </div>
              </div>
              <div className="space-y-3">
                {deadlines.length > 0
                ? deadlines.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3"
                    >
                      <div><p className="font-medium text-text">{item.name}</p></div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Due</p>
                        <p className="mt-1 text-sm font-semibold text-highlight">{item.date}</p>
                      </div>
                    </div>
                  ))
                : hackathonsLoading
                  ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-card/70" />)
                  : <p className="text-sm text-muted">No upcoming deadlines to show.</p>}
              </div>
            </div>

            {/* Fixed: domain buttons now navigate to /hackathons?domain=X (protected, so → login first) */}
            <div id="domains" className="rounded-[28px] border border-border bg-card p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">
                By domain
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Explore your focus area</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {domainOptions.map((domain) => (
                  <Link
                    key={domain}
                    to={`/hackathons?domain=${encodeURIComponent(domain)}`}
                    className="rounded-full border border-border bg-background/60 px-3 py-2 text-sm text-muted transition hover:border-primary/50 hover:bg-primary/10 hover:text-highlight"
                  >
                    {domain}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── Stats ── */}
          <section id="stats" className="space-y-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">
                Platform pulse
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white">
                Built for discovery and momentum
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[24px] border border-border bg-card p-5">
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="mt-4 text-3xl font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Community ── */}
          <section id="community" className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[28px] border border-border bg-card p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">
                Fresh additions
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Recently added opportunities</h2>
              <div className="mt-5 space-y-3">
                {recentListings.length > 0
                ? recentListings.map((listing) => (
                    <div
                      key={listing.title}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3"
                    >
                      <div>
                        <p className="font-medium text-text">{listing.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">
                          {listing.domain}
                        </p>
                      </div>
                      <span className="text-sm text-highlight">{listing.date}</span>
                    </div>
                  ))
                : hackathonsLoading
                  ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-card/70" />)
                  : <p className="text-sm text-muted">No recent additions.</p>}
              </div>
            </div>

            <div className="rounded-[28px] border border-primary/30 bg-primary/5 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">
                Why builders choose us
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                A campus-first innovation platform
              </h2>
              <ul className="mt-5 space-y-4 text-sm text-muted">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                    ✓
                  </span>
                  Curated hackathons selected for technical depth and student readiness.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                    ✓
                  </span>
                  Trusted moderation flow for listing quality, source verification, and security
                  review.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                    ✓
                  </span>
                  A premium, responsive experience designed for mobile and desktop participants.
                </li>
              </ul>
              <Link
                to="/register"
                className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Get started free →
              </Link>
            </div>
          </section>
        </main>

        <footer className="mt-12 border-t border-border pt-8 text-sm text-muted">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">CEG DEV HUB</p>
              <p className="mt-1">Your launchpad for campus innovation.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="hover:text-white">Hackathons</Link>
              <a href="#domains" className="hover:text-white">Domains</a>
              <a href="#stats" className="hover:text-white">Insights</a>
              <a href="#community" className="hover:text-white">Community</a>
              <Link to="/register" className="hover:text-white">Join</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
