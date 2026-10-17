import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { DOMAINS } from '../lib/constants';

type TeamRequest = {
  _id: string;
  title: string;
  description: string;
  skillsNeeded: string[];
  currentTeamSize: number;
  maxTeamSize: number;
  status: 'OPEN' | 'FULL' | 'CLOSED';
  createdAt: string;
  pendingApplicationCount?: number;
  hackathon?: { name: string; slug: string; registrationDeadline: string; domains: string[] };
  creator?: { fullName: string; course: string | null; yearOfStudy: number | null };
};

type Application = {
  _id: string;
  teamRequestId?: string;          // raw ObjectId from the backend
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  message: string;
  createdAt: string;
  teamRequest?: { _id?: string; title: string; status: string };
  hackathon?: { name: string; slug: string };
};

type IncomingApplication = {
  _id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  message: string;
  createdAt: string;
  applicant?: { fullName: string; email: string; course: string | null; yearOfStudy: number | null; interestedDomains: string[] };
};

const fmt = (d: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(d));

const APP_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ACCEPTED:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED:  'bg-rose-500/15 text-rose-300 border-rose-500/30',
  WITHDRAWN: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

// ── Incoming applications panel (for team creator) ────────────────────────────

function ApplicationsPanel({ requestId, onUpdate }: { requestId: string; onUpdate: () => void }) {
  const [apps, setApps]       = useState<IncomingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { items: IncomingApplication[] } }>(
        `/api/v1/student/team-requests/${requestId}/applications?page=1&limit=50`,
      );
      setApps(res.data.items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load applications.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [requestId]);

  const respond = async (appId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setBusy(appId);
    try {
      const csrf = await getCsrfToken();
      await apiFetch(`/api/v1/student/team-applications/${appId}`, {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status }),
      });
      load();
      onUpdate();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="mt-3 h-12 animate-pulse rounded-xl bg-background/60" />;
  if (error)   return <p className="mt-2 text-xs text-rose-300">{error}</p>;
  if (apps.length === 0) return (
    <p className="mt-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-muted">
      No applications yet. Your request is open — share it with others!
    </p>
  );

  return (
    <div className="mt-3 space-y-2">
      {apps.map((app) => (
        <div
          key={app._id}
          className={`rounded-xl border p-3 ${
            app.status === 'PENDING' ? 'border-border bg-background/60' : 'border-border/50 bg-background/30 opacity-70'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">
                {app.applicant?.fullName ?? 'Unknown applicant'}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {[
                  app.applicant?.course,
                  app.applicant?.yearOfStudy ? `Year ${app.applicant.yearOfStudy}` : null,
                ].filter(Boolean).join(' · ')}
              </p>
              {(app.applicant?.interestedDomains?.length ?? 0) > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {app.applicant!.interestedDomains.slice(0, 3).map((d) => (
                    <span key={d} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-highlight">{d}</span>
                  ))}
                </div>
              )}
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${APP_STATUS_COLORS[app.status]}`}>
              {app.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted italic line-clamp-3">"{app.message}"</p>
          <p className="mt-1 text-xs text-muted">Applied {fmt(app.createdAt)}</p>
          {app.status === 'PENDING' && (
            <div className="mt-2 flex gap-2">
              <button
                disabled={!!busy}
                onClick={() => respond(app._id, 'ACCEPTED')}
                className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy === app._id ? '…' : 'Accept'}
              </button>
              <button
                disabled={!!busy}
                onClick={() => respond(app._id, 'REJECTED')}
                className="rounded-full border border-rose-500/40 px-4 py-1.5 text-xs text-rose-300 hover:border-rose-400 disabled:opacity-50"
              >
                {busy === app._id ? '…' : 'Decline'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Discovery Tab ─────────────────────────────────────────────────────────────

function DiscoveryTab() {
  const [items, setItems]           = useState<TeamRequest[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [skill, setSkill]           = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [applyTarget, setApplyTarget] = useState<TeamRequest | null>(null);
  const [applyMsg, setApplyMsg]       = useState('');
  const [applyBusy, setApplyBusy]     = useState(false);

  // Load discovery requests AND the user's own applications (to track applied state)
  const load = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(p), limit: '12' });
      if (skill) qs.set('skill', skill);
      const [discRes, appRes] = await Promise.all([
        apiFetch<{ data: { items: TeamRequest[]; pagination: { page: number; totalPages: number } } }>(
          `/api/v1/student/teammate-discovery?${qs}`,
        ),
        apiFetch<{ data: { items: Application[] } }>('/api/v1/student/team-applications?page=1&limit=50'),
      ]);
      setItems(discRes.data.items);
      setPage(discRes.data.pagination.page);
      setTotalPages(discRes.data.pagination.totalPages);
      // Build set of team request IDs already applied to (non-withdrawn)
      // The backend returns teamRequestId as a raw ObjectId string on each application
      const appliedRaw = new Set<string>();
      appRes.data.items.forEach((a) => {
        if (a.status !== 'WITHDRAWN') {
          const rid = a.teamRequestId ?? a.teamRequest?._id;
          if (rid) appliedRaw.add(String(rid));
        }
      });
      setAppliedIds(appliedRaw);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [skill]);

  const submitApplication = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyTarget) return;
    setApplyBusy(true);
    try {
      const csrf = await getCsrfToken();
      await apiFetch(`/api/v1/student/team-requests/${applyTarget._id}/apply`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({ message: applyMsg }),
      });
      // Optimistically mark as applied
      setAppliedIds((prev) => new Set([...prev, applyTarget._id]));
      setApplyTarget(null);
      setApplyMsg('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to apply.'); }
    finally { setApplyBusy(false); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <select value={skill} onChange={(e) => setSkill(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text">
          <option value="">All skills / domains</option>
          {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="ml-auto self-center text-sm text-muted">{skill ? 'Filtered' : 'All open requests'}</span>
      </div>
      {error && <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-[24px] bg-card" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-border bg-card py-20 text-center">
          <p className="text-4xl">👥</p>
          <p className="mt-4 text-muted">No open team requests yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((req) => {
            const hasApplied = appliedIds.has(req._id);
            return (
              <div key={req._id} className="flex flex-col rounded-[24px] border border-border bg-card p-5 transition hover:border-primary/30">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white">{req.title}</h3>
                  <span className="shrink-0 rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs text-muted">
                    {req.currentTeamSize}/{req.maxTeamSize} members
                  </span>
                </div>
                {req.hackathon && (
                  <Link to={`/hackathons/${req.hackathon.slug}`} className="mt-1 text-xs text-highlight hover:underline">
                    {req.hackathon.name}
                  </Link>
                )}
                <p className="mt-2 flex-1 text-sm text-muted line-clamp-3">{req.description}</p>
                {req.skillsNeeded.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {req.skillsNeeded.map((s) => (
                      <span key={s} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-highlight">{s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="text-xs text-muted">
                    {req.creator?.fullName}
                    {req.creator?.yearOfStudy && ` · Year ${req.creator.yearOfStudy}`}
                    {req.creator?.course && ` · ${req.creator.course}`}
                  </div>
                  {hasApplied ? (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                      ✓ Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => setApplyTarget(req)}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Apply to join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-3">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40 hover:text-text">← Prev</button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40 hover:text-text">Next →</button>
        </div>
      )}
      {/* Apply modal */}
      {applyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setApplyTarget(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitApplication}
            className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Apply to: {applyTarget.title}</h2>
            <p className="mt-1 text-sm text-muted">For {applyTarget.hackathon?.name}</p>
            <label className="mt-4 block">
              <span className="text-sm text-muted">Why do you want to join? <span className="text-rose-400">*</span></span>
              <textarea
                required minLength={10} maxLength={400} value={applyMsg}
                onChange={(e) => setApplyMsg(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-highlight"
                placeholder="Tell the team why you'd be a great fit…"
              />
            </label>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={applyBusy}
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {applyBusy ? 'Sending…' : 'Send application'}
              </button>
              <button type="button" onClick={() => setApplyTarget(null)}
                className="rounded-full border border-border px-5 text-sm text-muted hover:text-text">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── My Requests Tab ───────────────────────────────────────────────────────────

function MyRequestsTab() {
  const [requests, setRequests]         = useState<TeamRequest[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [hackathons, setHackathons]     = useState<Array<{ _id: string; name: string; registrationDeadline: string }>>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [busy, setBusy]                 = useState<string | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [form, setForm]                 = useState({
    hackathonId: '', title: '', description: '', skillsNeeded: [] as string[],
    currentTeamSize: 1, maxTeamSize: 4,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, aRes, hRes] = await Promise.all([
        apiFetch<{ data: { items: TeamRequest[] } }>('/api/v1/student/team-requests?limit=50'),
        apiFetch<{ data: { items: Application[] } }>('/api/v1/student/team-applications?limit=50'),
        apiFetch<{ data: { items: Array<{ _id: string; name: string; registrationDeadline: string }> } }>(
          '/api/v1/hackathons?limit=50',
        ),
      ]);
      setRequests(rRes.data.items);
      setApplications(aRes.data.items);
      setHackathons(hRes.data.items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const closeRequest = async (id: string) => {
    if (!confirm('Close this team request?')) return;
    setBusy(id);
    try {
      const csrf = await getCsrfToken();
      await apiFetch(`/api/v1/student/team-requests/${id}`, {
        method: 'PATCH', headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  };

  const createRequest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('create');
    try {
      const csrf = await getCsrfToken();
      await apiFetch('/api/v1/student/team-requests', {
        method: 'POST', headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ hackathonId: '', title: '', description: '', skillsNeeded: [], currentTeamSize: 1, maxTeamSize: 4 });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create.'); }
    finally { setBusy(null); }
  };

  const toggleSkill = (s: string) =>
    setForm((f) => ({
      ...f,
      skillsNeeded: f.skillsNeeded.includes(s)
        ? f.skillsNeeded.filter((x) => x !== s)
        : [...f.skillsNeeded, s],
    }));

  const withdrawApp = async (appId: string) => {
    setBusy(appId);
    try {
      const csrf = await getCsrfToken();
      await apiFetch(`/api/v1/student/team-applications/${appId}`, {
        method: 'PATCH', headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status: 'WITHDRAWN' }),
      });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  };

  return (
    <div>
      {error && <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
      <div className="mb-5 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          + New team request
        </button>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-[24px] bg-card" />)}</div>
      ) : requests.length === 0 ? (
        <div className="rounded-[28px] border border-border bg-card py-16 text-center">
          <p className="text-muted">You have no team requests yet. Create one to find teammates!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isExpanded = expandedId === req._id;
            return (
              <div key={req._id} className="rounded-[24px] border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white">{req.title}</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {req.currentTeamSize}/{req.maxTeamSize} members · Status:{' '}
                      <span className={req.status === 'OPEN' ? 'text-emerald-400' : 'text-muted'}>{req.status}</span>
                      {req.hackathon && (
                        <> · <Link to={`/hackathons/${req.hackathon.slug}`} className="text-highlight hover:underline">{req.hackathon.name}</Link></>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* VIEW APPLICATIONS button — the core missing feature */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req._id)}
                      className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-highlight hover:border-primary transition"
                    >
                      👥 {isExpanded ? 'Hide' : 'View'} applications
                      {(req.pendingApplicationCount ?? 0) > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-white">
                          {req.pendingApplicationCount}
                        </span>
                      )}
                    </button>
                    {req.status === 'OPEN' && (
                      <button disabled={busy === req._id} onClick={() => closeRequest(req._id)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40">
                        Close
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">{req.description}</p>
                {/* Expanded applications panel */}
                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Incoming applications</h4>
                    <ApplicationsPanel requestId={req._id} onUpdate={load} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* My sent applications */}
      {applications.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-white">My sent applications</h2>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app._id} className="flex items-center justify-between gap-4 rounded-[20px] border border-border bg-card p-4">
                <div>
                  <p className="font-semibold text-white">{app.teamRequest?.title ?? 'Team request'}</p>
                  {app.hackathon && <p className="mt-0.5 text-xs text-muted">{app.hackathon.name}</p>}
                  <p className="mt-1 text-xs text-muted italic line-clamp-1">"{app.message}"</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${APP_STATUS_COLORS[app.status]}`}>{app.status}</span>
                  {app.status === 'PENDING' && (
                    <button disabled={!!busy} onClick={() => withdrawApp(app._id)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40">
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto" onClick={() => setShowCreate(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={createRequest}
            className="my-8 w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create team request</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm text-muted">Hackathon <span className="text-rose-400">*</span></span>
                <select
                  required
                  value={form.hackathonId}
                  onChange={(e) => setForm({ ...form, hackathonId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-highlight"
                >
                  <option value="">— Select a hackathon —</option>
                  {hackathons.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-muted">Title <span className="text-rose-400">*</span></span>
                <input required minLength={5} maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Looking for a backend developer…"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-highlight" />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Description <span className="text-rose-400">*</span></span>
                <textarea required minLength={10} maxLength={600} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="What are you building? What skills do you need?"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-highlight" />
              </label>
              <div>
                <p className="text-sm text-muted mb-2">Skills / domains needed</p>
                <div className="flex flex-wrap gap-2">
                  {DOMAINS.map((d) => (
                    <button key={d} type="button" onClick={() => toggleSkill(d)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${form.skillsNeeded.includes(d) ? 'border-primary bg-primary/20 text-highlight' : 'border-border text-muted hover:border-primary/40'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm text-muted">Current team size</span>
                  <input type="number" min={1} max={10} value={form.currentTeamSize} onChange={(e) => setForm({ ...form, currentTeamSize: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text" />
                </label>
                <label>
                  <span className="text-sm text-muted">Max team size</span>
                  <input type="number" min={2} max={10} value={form.maxTeamSize} onChange={(e) => setForm({ ...form, maxTeamSize: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text" />
                </label>
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button type="submit" disabled={busy === 'create'} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'create' ? 'Creating…' : 'Create request'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-full border border-border px-5 text-sm text-muted hover:text-text">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TeammatesPage() {
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant="authenticated" />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Community</p>
        <h1 className="mb-6 mt-2 text-3xl font-black text-white">Find Teammates</h1>
        <div className="mb-6 flex overflow-hidden rounded-xl border border-border w-fit">
          <button onClick={() => setTab('discover')}
            className={`px-5 py-2.5 text-sm font-semibold transition ${tab === 'discover' ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}>
            Discover teams
          </button>
          <button onClick={() => setTab('mine')}
            className={`px-5 py-2.5 text-sm font-semibold transition ${tab === 'mine' ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}>
            My requests & applications
          </button>
        </div>
        {tab === 'discover' ? <DiscoveryTab /> : <MyRequestsTab />}
      </div>
    </div>
  );
}