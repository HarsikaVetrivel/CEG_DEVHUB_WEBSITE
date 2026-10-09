import { Link, Route, Routes } from 'react-router-dom';
import { HackathonDetails, HackathonDiscovery } from './pages/Hackathons';
import {
  AuthPage,
  BookmarksPage,
  NotificationsPage,
  StudentDashboard,
} from './pages/Student';

const featuredHackathons = [
  {
    title: 'Build for Bharat 2026',
    organizer: 'Innovation Cell, CEG',
    location: 'Chennai, India',
    mode: 'Hybrid',
    deadline: '3 days left',
    domain: 'Open Innovation',
    status: 'Registration Open',
    tags: ['AI', 'Product', 'Prototype'],
  },
  {
    title: 'Secure Code Sprint',
    organizer: 'Cyber Lab CEG',
    location: 'Online',
    mode: 'Online',
    deadline: '10 days left',
    domain: 'Cybersecurity',
    status: 'Trending',
    tags: ['Security', 'Cloud', 'Red Team'],
  },
  {
    title: 'Sustainable AI Hack',
    organizer: 'Center for Smart Systems',
    location: 'CEG Main Campus',
    mode: 'Offline',
    deadline: '2 weeks left',
    domain: 'AI/ML',
    status: 'Featured',
    tags: ['Climate', 'ML', 'Impact'],
  },
];

const domainOptions = [
  'AI/ML',
  'Web Development',
  'Mobile Development',
  'Blockchain',
  'Cybersecurity',
  'IoT',
  'Cloud',
  'Data Science',
  'AR/VR',
  'Open Innovation',
];

const stats = [
  { label: 'Hackathons', value: '128+' },
  { label: 'Students', value: '4.2K' },
  { label: 'Projects', value: '760' },
  { label: 'Success rate', value: '79%' },
];

const recentListings = [
  { title: 'VisionVerse Challenge', date: 'Jan 12, 2026', domain: 'AR/VR' },
  { title: 'Quantum App Jam', date: 'Jan 18, 2026', domain: 'Cloud' },
  { title: 'Smart Campus Builders', date: 'Jan 25, 2026', domain: 'IoT' },
];

const deadlines = [
  { name: 'Build for Bharat 2026', date: 'Jan 29, 2026' },
  { name: 'Secure Code Sprint', date: 'Feb 02, 2026' },
  { name: 'Sustainable AI Hack', date: 'Feb 06, 2026' },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text antialiased selection:bg-primary/40">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-8 rounded-full border border-border/80 bg-panel/85 px-4 py-3 shadow-glow backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-highlight ring-1 ring-primary/40">
                &lt;/&gt;
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-highlight">CEG</p>
                <p className="text-lg font-semibold text-text">DEV HUB</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
              <Link className="transition hover:text-text" to="/hackathons">Hackathons</Link>
              <a className="transition hover:text-text" href="#domains">Domains</a>
              <a className="transition hover:text-text" href="#stats">Stats</a>
              <a className="transition hover:text-text" href="#community">Community</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-text transition hover:border-primary/80 sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-[#2f75ef]">
                Join now
              </Link>
            </div>
          </div>
        </header>

        <main className="space-y-10">
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
                    Discover curated hackathons, innovation sprints, and campus opportunities built for CEG students, builders, and future founders.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/hackathons" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f75ef]">
                    Explore Hackathons
                  </Link>
                  <button className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-text transition hover:border-primary/60 hover:text-highlight">
                    Join the Community
                  </button>
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

              <div className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_rgba(11,27,48,0.9)_52%)] p-4">
                <div className="rounded-[24px] border border-primary/20 bg-card/80 p-4 shadow-lg shadow-primary/10">
                  <div className="mb-4 flex items-center justify-between text-sm text-muted">
                    <span>Featured spotlight</span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                      Trending now
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-highlight">AI/ML</p>
                          <h2 className="mt-2 text-2xl font-bold text-white">Future of Cloud Hack</h2>
                        </div>
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-highlight">
                          17 days left
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-muted">
                      <div className="rounded-2xl border border-border bg-background/50 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted">Mode</p>
                        <p className="mt-2 font-semibold text-text">Hybrid</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/50 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted">Prize</p>
                        <p className="mt-2 font-semibold text-text">₹1.5L</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/50 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted">Team</p>
                        <p className="mt-2 font-semibold text-text">2-5 members</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/50 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted">Location</p>
                        <p className="mt-2 font-semibold text-text">Chennai</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="featured" className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Featured events</p>
                <h2 className="mt-2 text-3xl font-bold text-white">Trending hackathons</h2>
              </div>
              <button className="text-sm font-medium text-highlight transition hover:text-white">View all</button>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {featuredHackathons.map((hackathon) => (
                <article key={hackathon.title} className="group rounded-[28px] border border-border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-highlight">{hackathon.domain}</p>
                      <h3 className="mt-2 text-2xl font-bold text-white">{hackathon.title}</h3>
                    </div>
                    <button aria-label={`Bookmark ${hackathon.title}`} className="rounded-full border border-border bg-background/70 p-2 text-lg text-muted transition hover:border-primary/50 hover:text-highlight">
                      ♡
                    </button>
                  </div>

                  <p className="text-sm text-muted">{hackathon.organizer}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {hackathon.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <dl className="mt-5 space-y-3 text-sm text-muted">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Location</dt>
                      <dd className="font-medium text-text">{hackathon.location}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Mode</dt>
                      <dd className="font-medium text-text">{hackathon.mode}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Deadline</dt>
                      <dd className="font-medium text-highlight">{hackathon.deadline}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      {hackathon.status}
                    </span>
                    <button className="rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2f75ef]">
                      View details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-border bg-card p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Deadline radar</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Upcoming registration windows</h2>
                </div>
              </div>

              <div className="space-y-3">
                {deadlines.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3">
                    <div>
                      <p className="font-medium text-text">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Due</p>
                      <p className="mt-1 text-sm font-semibold text-highlight">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="domains" className="rounded-[28px] border border-border bg-card p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">By domain</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Explore your focus area</h2>

              <div className="mt-5 flex flex-wrap gap-2">
                {domainOptions.map((domain) => (
                  <button
                    key={domain}
                    className="rounded-full border border-border bg-background/60 px-3 py-2 text-sm text-muted transition hover:border-primary/50 hover:text-highlight"
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section id="stats" className="space-y-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Platform pulse</p>
              <h2 className="mt-2 text-3xl font-bold text-white">Built for discovery and momentum</h2>
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

          <section id="community" className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[28px] border border-border bg-card p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Fresh additions</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Recently added opportunities</h2>

              <div className="mt-5 space-y-3">
                {recentListings.map((listing) => (
                  <div key={listing.title} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3">
                    <div>
                      <p className="font-medium text-text">{listing.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{listing.domain}</p>
                    </div>
                    <span className="text-sm text-highlight">{listing.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-primary/30 bg-primary/5 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Why builders choose us</p>
              <h2 className="mt-2 text-2xl font-bold text-white">A campus-first innovation platform</h2>
              <ul className="mt-5 space-y-4 text-sm text-muted">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">✓</span>
                  Curated hackathons selected for technical depth and student readiness.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">✓</span>
                  Trusted moderation flow for listing quality, source verification, and security review.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">✓</span>
                  A premium, responsive experience designed for mobile and desktop participants.
                </li>
              </ul>
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
              <Link to="/hackathons" className="hover:text-white">Hackathons</Link>
              <a href="#domains" className="hover:text-white">Domains</a>
              <a href="#stats" className="hover:text-white">Insights</a>
              <a href="#community" className="hover:text-white">Community</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/hackathons" element={<HackathonDiscovery />} />
      <Route path="/hackathons/:slug" element={<HackathonDetails />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/dashboard" element={<StudentDashboard />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
