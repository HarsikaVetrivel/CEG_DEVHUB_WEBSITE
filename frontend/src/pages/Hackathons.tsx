import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { API_BASE_URL, apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';
const domains = [
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
const modes = ['ONLINE', 'OFFLINE', 'HYBRID'] as const;
const statuses = ['UPCOMING', 'ONGOING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED'] as const;

type Hackathon = {
  _id: string;
  name: string;
  slug: string;
  organizer: string;
  description: string;
  registrationUrl: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: string;
  mode: (typeof modes)[number];
  domains: string[];
  eligibility: string;
  minimumTeamSize: number;
  maximumTeamSize: number;
  prizeDetails: string;
  requiredSkills: string[];
  lifecycleStatus: (typeof statuses)[number];
  sourceType: string;
  sourceUrl?: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  lastUpdatedAt: string;
};

type ApiError = {
  success: false;
  error?: { message?: string };
};

type ListResponse = {
  success: true;
  data: {
    items: Hackathon[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

const prettyLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  );

const readErrorMessage = (body: unknown) => {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as ApiError).error;
    if (error?.message) return error.message;
  }
  return 'Unable to load hackathons right now. Please try again.';
};

// Header removed — shared <Navbar variant="authenticated" /> is used instead

function ListingCard({ hackathon }: { hackathon: Hackathon }) {
  return (
    <article className="flex flex-col rounded-[28px] border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {hackathon.domains.slice(0, 2).map((domain) => (
              <span
                key={domain}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-highlight"
              >
                {domain}
              </span>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-white">{hackathon.name}</h2>
          <p className="mt-1 text-sm text-muted">{hackathon.organizer}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hackathon.verificationStatus === 'VERIFIED' && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
              Verified
            </span>
          )}
          <BookmarkButton hackathonId={hackathon._id} name={hackathon.name} />
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{hackathon.description}</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Registration deadline</dt>
          <dd className="mt-1 font-semibold text-highlight">{formatDate(hackathon.registrationDeadline)}</dd>
        </div>
        <div>
          <dt className="text-muted">Event dates</dt>
          <dd className="mt-1 font-medium text-text">{formatDate(hackathon.startDate)}</dd>
        </div>
        <div>
          <dt className="text-muted">Location</dt>
          <dd className="mt-1 font-medium text-text">{hackathon.location}</dd>
        </div>
        <div>
          <dt className="text-muted">Mode</dt>
          <dd className="mt-1 font-medium text-text">{prettyLabel(hackathon.mode)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-6">
        <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted">
          {prettyLabel(hackathon.lifecycleStatus)}
        </span>
        <Link
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          to={`/hackathons/${encodeURIComponent(hackathon.slug)}`}
        >
          Details
        </Link>
      </div>
    </article>
  );
}

function BookmarkButton({ hackathonId, name }: { hackathonId: string; name: string }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [knownSignedIn, setKnownSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/v1/student/bookmarks/${hackathonId}/state`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { data: { bookmarked: boolean } };
        setKnownSignedIn(true);
        setBookmarked(body.data.bookmarked);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setKnownSignedIn(false);
        }
      });
    return () => controller.abort();
  }, [hackathonId]);

  const toggle = async () => {
    if (!knownSignedIn) {
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch(`/api/v1/student/bookmarks/${hackathonId}`, {
        method: bookmarked ? 'DELETE' : 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      setBookmarked(!bookmarked);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to update bookmark.';
      if (message === 'Authentication required.') navigate('/login');
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="relative">
      <button
        aria-label={`${bookmarked ? 'Remove bookmark for' : 'Bookmark'} ${name}`}
        aria-pressed={bookmarked}
        className="rounded-full border border-border bg-background/70 p-2 text-lg text-muted transition hover:border-primary/50 hover:text-highlight disabled:opacity-50"
        disabled={busy}
        onClick={toggle}
        type="button"
      >
        {bookmarked ? '♥' : '♡'}
      </button>
      {error && <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-rose-500/30 bg-background p-2 text-xs text-rose-200">{error}</span>}
    </span>
  );
}

export function HackathonDiscovery() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState('');
  // Pre-populate domain from ?domain= query param (e.g. from landing page domain buttons)
  const [domain, setDomain] = useState(() => searchParams.get('domain') ?? '');
  const [status, setStatus] = useState('');
  const [startAfter, setStartAfter] = useState('');
  const [startBefore, setStartBefore] = useState('');
  const [endAfter, setEndAfter] = useState('');
  const [endBefore, setEndBefore] = useState('');
  const [deadlineAfter, setDeadlineAfter] = useState('');
  const [deadlineBefore, setDeadlineBefore] = useState('');
  const [sort, setSort] = useState('deadline');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<ListResponse['data']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '12', sort });
    const values: Record<string, string> = {
      q: search,
      location,
      mode,
      domain,
      status,
      startAfter: startAfter ? new Date(`${startAfter}T00:00:00.000Z`).toISOString() : '',
      startBefore: startBefore ? new Date(`${startBefore}T23:59:59.999Z`).toISOString() : '',
      endAfter: endAfter ? new Date(`${endAfter}T00:00:00.000Z`).toISOString() : '',
      endBefore: endBefore ? new Date(`${endBefore}T23:59:59.999Z`).toISOString() : '',
      deadlineAfter: deadlineAfter
        ? new Date(`${deadlineAfter}T00:00:00.000Z`).toISOString()
        : '',
      deadlineBefore: deadlineBefore
        ? new Date(`${deadlineBefore}T23:59:59.999Z`).toISOString()
        : '',
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [
    page,
    sort,
    search,
    location,
    mode,
    domain,
    status,
    startAfter,
    startBefore,
    endAfter,
    endBefore,
    deadlineAfter,
    deadlineBefore,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch(`${API_BASE_URL}/api/v1/hackathons?${queryString}`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (result) => {
        const body: unknown = await result.json();
        if (!result.ok) throw new Error(readErrorMessage(body));
        return body as ListResponse;
      })
      .then((result) => setResponse(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Unable to load hackathons.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queryString, refresh]);

  const clearFilters = () => {
    setSearch('');
    setLocation('');
    setMode('');
    setDomain('');
    setStatus('');
    setStartAfter('');
    setStartBefore('');
    setEndAfter('');
    setEndBefore('');
    setDeadlineAfter('');
    setDeadlineBefore('');
    setSort('deadline');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-text antialiased">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Navbar variant="authenticated" />
        <main>
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Discover opportunities</p>
            <h1 className="mt-2 text-4xl font-black text-white">Find your next hackathon</h1>
            <p className="mt-3 max-w-2xl text-muted">
              Search published listings and combine filters to find an event that fits your interests and schedule.
            </p>
          </div>

          <form
            className="mb-7 rounded-[28px] border border-border bg-panel p-5"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              setPage(1);
              setRefresh((current) => current + 1);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-muted">Search</span>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none transition focus:border-highlight focus:ring-2 focus:ring-primary/30"
                  placeholder="Name, organizer, skills..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Location</span>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none transition focus:border-highlight focus:ring-2 focus:ring-primary/30"
                  placeholder="City or online"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Mode</span>
                <select className="filter-input" value={mode} onChange={(event) => setMode(event.target.value)}>
                  <option value="">All modes</option>
                  {modes.map((value) => <option key={value} value={value}>{prettyLabel(value)}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Domain</span>
                <select className="filter-input" value={domain} onChange={(event) => setDomain(event.target.value)}>
                  <option value="">All domains</option>
                  {domains.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Status</span>
                <select className="filter-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  {statuses.map((value) => <option key={value} value={value}>{prettyLabel(value)}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Sort by</span>
                <select className="filter-input" value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="deadline">Registration deadline</option>
                  <option value="eventDate">Event date</option>
                  <option value="recent">Recently added</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Event starts after</span>
                <input className="filter-input" type="date" value={startAfter} onChange={(event) => setStartAfter(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Event starts before</span>
                <input className="filter-input" type="date" value={startBefore} onChange={(event) => setStartBefore(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Event ends after</span>
                <input className="filter-input" type="date" value={endAfter} onChange={(event) => setEndAfter(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Event ends before</span>
                <input className="filter-input" type="date" value={endBefore} onChange={(event) => setEndBefore(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Deadline after</span>
                <input className="filter-input" type="date" value={deadlineAfter} onChange={(event) => setDeadlineAfter(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-muted">Deadline before</span>
                <input className="filter-input" type="date" value={deadlineBefore} onChange={(event) => setDeadlineBefore(event.target.value)} />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f75ef]" type="submit">
                Apply filters
              </button>
              <button className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted hover:border-highlight hover:text-text" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          </form>

          {loading && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading hackathons">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-[28px] border border-border bg-card/70" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6" role="alert">
              <h2 className="text-lg font-semibold text-rose-200">Could not load hackathons</h2>
              <p className="mt-2 text-sm text-rose-100/80">{error}</p>
              <button className="mt-4 rounded-full border border-rose-300/30 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/20" onClick={() => setRefresh((current) => current + 1)}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && response && (
            <>
              <div className="mb-4 flex items-center justify-between text-sm text-muted">
                <p>{response.pagination.total} published {response.pagination.total === 1 ? 'hackathon' : 'hackathons'}</p>
                <p>Page {response.pagination.page} of {Math.max(response.pagination.totalPages, 1)}</p>
              </div>
              {response.items.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {response.items.map((hackathon) => <ListingCard key={hackathon._id} hackathon={hackathon} />)}
                </div>
              ) : (
                <div className="rounded-[28px] border border-border bg-card px-6 py-14 text-center">
                  <h2 className="text-xl font-semibold text-white">No published opportunities match yet</h2>
                  <p className="mt-2 text-muted">Try removing a filter, or check back as new listings are approved.</p>
                </div>
              )}
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  className="rounded-full border border-border px-4 py-2 text-sm text-text disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!response.pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  className="rounded-full border border-border px-4 py-2 text-sm text-text disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!response.pagination.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export function HackathonDetails() {
  const { slug } = useParams();
  const [hackathon, setHackathon] = useState<Hackathon>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/api/v1/hackathons/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (result) => {
        const body: unknown = await result.json();
        if (!result.ok) throw new Error(readErrorMessage(body));
        return body as { success: true; data: { hackathon: Hackathon } };
      })
      .then((result) => setHackathon(result.data.hackathon))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Unable to load this hackathon.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  return (
    <div className="min-h-screen bg-background text-text antialiased">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Navbar variant="authenticated" />
        <Link to="/hackathons" className="inline-flex items-center gap-1 text-sm font-medium text-highlight hover:text-white">← Back to discovery</Link>
        {loading && <div className="mt-6 h-96 animate-pulse rounded-[28px] border border-border bg-card/70" />}
        {!loading && error && (
          <div className="mt-6 rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6" role="alert">
            <h1 className="text-xl font-semibold text-rose-100">Unable to open this listing</h1>
            <p className="mt-2 text-sm text-rose-100/80">{error}</p>
          </div>
        )}
        {!loading && !error && hackathon && (
          <article className="mt-6 rounded-[32px] border border-border bg-panel p-6 shadow-glow sm:p-10">
            <div className="mb-4 flex justify-end">
              <BookmarkButton hackathonId={hackathon._id} name={hackathon.name} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hackathon.domains.map((item) => (
                <span key={item} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-highlight">{item}</span>
              ))}
              {hackathon.verificationStatus === 'VERIFIED' && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">Verified</span>
              )}
            </div>
            <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">{hackathon.name}</h1>
            <p className="mt-3 text-lg text-muted">Organized by {hackathon.organizer}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Registration deadline', formatDate(hackathon.registrationDeadline)],
                ['Event dates', `${formatDate(hackathon.startDate)} – ${formatDate(hackathon.endDate)}`],
                ['Location', hackathon.location],
                ['Mode', prettyLabel(hackathon.mode)],
                ['Team size', `${hackathon.minimumTeamSize}–${hackathon.maximumTeamSize}`],
                ['Status', prettyLabel(hackathon.lifecycleStatus)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
                  <p className="mt-2 font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>

            <section className="mt-9">
              <h2 className="text-xl font-bold text-white">About the event</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-muted">{hackathon.description}</p>
            </section>
            <section className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="text-lg font-bold text-white">Eligibility</h2>
                <p className="mt-2 leading-6 text-muted">{hackathon.eligibility}</p>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Prize details</h2>
                <p className="mt-2 leading-6 text-muted">{hackathon.prizeDetails}</p>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Required skills</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hackathon.requiredSkills.length > 0 ? hackathon.requiredSkills.map((skill) => (
                    <span key={skill} className="rounded-full border border-border bg-background/60 px-3 py-1 text-sm text-muted">{skill}</span>
                  )) : <p className="text-muted">No specific skills listed.</p>}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Listing information</h2>
                <p className="mt-2 text-sm text-muted">Source: {prettyLabel(hackathon.sourceType)}</p>
                <p className="mt-1 text-sm text-muted">Updated: {formatDate(hackathon.lastUpdatedAt)}</p>
                {hackathon.sourceUrl && <a href={hackathon.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-highlight hover:text-text">View source ↗</a>}
              </div>
            </section>
            <a
              className="mt-9 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
              href={hackathon.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit official registration ↗
            </a>
          </article>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HACKATHON DIRECTORY
   Clean, focused page showing all active hackathons from the API.
   Replaces the filter-heavy "Discovery" page as the post-login view.
───────────────────────────────────────────────────────────────── */

const STATUS_TABS = [
  { label: 'All Active',          value: '' },
  { label: 'Registration Open',   value: 'REGISTRATION_OPEN' },
  { label: 'Upcoming',            value: 'UPCOMING' },
  { label: 'Ongoing',             value: 'ONGOING' },
] as const;

export function HackathonDirectory() {
  const [searchParams] = useSearchParams();
  const [search, setSearch]   = useState('');
  const [domain, setDomain]   = useState(() => searchParams.get('domain') ?? '');
  const [status, setStatus]   = useState('REGISTRATION_OPEN');
  const [sort,   setSort]     = useState('deadline');
  const [page,   setPage]     = useState(1);

  const [response, setResponse] = useState<ListResponse['data']>();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [refresh,  setRefresh]  = useState(0);

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '12', sort });
    if (search) params.set('q', search);
    if (domain) params.set('domain', domain);
    if (status) params.set('status', status);
    return params.toString();
  }, [page, sort, search, domain, status]);

  // Fetch on query change
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/api/v1/hackathons?${queryString}`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (res) => {
        const body: unknown = await res.json();
        if (!res.ok) throw new Error(readErrorMessage(body));
        return body as ListResponse;
      })
      .then((res) => setResponse(res.data))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Unable to load hackathons.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [queryString, refresh]);

  // Reset to page 1 when filters change
  const handleStatusChange = (val: string) => { setStatus(val); setPage(1); };
  const handleSearchSubmit  = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setRefresh(r => r + 1); };

  return (
    <div className="min-h-screen bg-background text-text antialiased">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Navbar variant="authenticated" />

        {/* ── Page heading ── */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-highlight">
            CEG DEV HUB
          </p>
          <h1 className="mt-2 text-4xl font-black text-white">Hackathon Directory</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Browse all active hackathons. Bookmark ones you like and track deadlines from your dashboard.
          </p>
        </div>

        {/* ── Status tabs ── */}
        <div className="mb-6 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusChange(tab.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition
                ${status === tab.value
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'border border-border bg-card text-muted hover:border-primary/50 hover:text-highlight'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search + filters row ── */}
        <form
          className="mb-7 flex flex-wrap gap-3"
          onSubmit={handleSearchSubmit}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="filter-input pl-10"
              placeholder="Search by name, organizer, skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Domain */}
          <select
            className="filter-input w-auto min-w-[160px]"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setPage(1); }}
          >
            <option value="">All domains</option>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Sort */}
          <select
            className="filter-input w-auto min-w-[180px]"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            <option value="deadline">Sort: Registration deadline</option>
            <option value="eventDate">Sort: Event date</option>
            <option value="recent">Sort: Recently added</option>
          </select>

          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Search
          </button>

          {(search || domain) && (
            <button
              type="button"
              className="rounded-full border border-border px-5 py-2.5 text-sm text-muted transition hover:border-primary/50 hover:text-text"
              onClick={() => { setSearch(''); setDomain(''); setPage(1); }}
            >
              Clear
            </button>
          )}
        </form>

        {/* ── Results count ── */}
        {!loading && !error && response && (
          <p className="mb-4 text-sm text-muted">
            {response.pagination.total} hackathon{response.pagination.total !== 1 ? 's' : ''} found
            {response.pagination.totalPages > 1 && ` · Page ${response.pagination.page} of ${response.pagination.totalPages}`}
          </p>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-[28px] border border-border bg-card/70" />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6" role="alert">
            <h2 className="text-lg font-semibold text-rose-200">Could not load hackathons</h2>
            <p className="mt-2 text-sm text-rose-100/80">{error}</p>
            <button
              className="mt-4 rounded-full border border-rose-300/30 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/20"
              onClick={() => setRefresh((r) => r + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Card grid ── */}
        {!loading && !error && response && (
          <>
            {response.items.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {response.items.map((h) => <ListingCard key={h._id} hackathon={h} />)}
              </div>
            ) : (
              <div className="rounded-[28px] border border-border bg-card px-6 py-16 text-center">
                <p className="text-3xl">🔍</p>
                <h2 className="mt-4 text-xl font-semibold text-white">No hackathons found</h2>
                <p className="mt-2 text-muted">
                  Try a different status tab or clear your filters.
                </p>
                <button
                  className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm text-muted hover:border-primary/50 hover:text-text"
                  onClick={() => { setSearch(''); setDomain(''); setStatus(''); setPage(1); }}
                >
                  Show all
                </button>
              </div>
            )}

            {/* Pagination */}
            {response.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:border-primary/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!response.pagination.hasPreviousPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted">
                  {response.pagination.page} / {response.pagination.totalPages}
                </span>
                <button
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:border-primary/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!response.pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
