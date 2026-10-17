import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';

type Participation = {
  _id: string;
  status: 'REGISTERED' | 'PARTICIPATING' | 'COMPLETED' | 'WITHDREW';
  outcome: 'WINNER' | 'RUNNER_UP' | 'FINALIST' | 'PARTICIPANT' | null;
  teamName: string | null;
  note: string | null;
  proofUrl: string | null;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | null;
  registeredAt: string;
  completedAt: string | null;
  hackathon?: {
    _id: string; name: string; slug: string; organizer: string;
    startDate: string; endDate: string; registrationDeadline: string;
    domains: string[]; mode: string;
  };
};

const STATUS_COLORS: Record<string, string> = {
  REGISTERED:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
  PARTICIPATING: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  COMPLETED:     'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  WITHDREW:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
};
const OUTCOME_COLORS: Record<string, string> = {
  WINNER:      'bg-amber-500/20 text-amber-300 border-amber-400/40',
  RUNNER_UP:   'bg-slate-500/15 text-slate-300 border-slate-400/30',
  FINALIST:    'bg-primary/15 text-highlight border-primary/30',
  PARTICIPANT: 'bg-card text-muted border-border',
};
const OUTCOME_ICONS: Record<string, string> = {
  WINNER: '🥇', RUNNER_UP: '🥈', FINALIST: '🥉', PARTICIPANT: '🎯',
};
const VERIFY_BADGE: Record<string, string> = {
  UNVERIFIED: '🔍 Pending review',
  VERIFIED:   '✅ Verified',
  REJECTED:   '❌ Not verified',
};
const VERIFY_COLORS: Record<string, string> = {
  UNVERIFIED: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  VERIFIED:   'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REJECTED:   'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const PODIUM = ['WINNER', 'RUNNER_UP', 'FINALIST'];
const fmt = (d: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(d));

export function ParticipationsPage() {
  const [items, setItems]             = useState<Participation[]>([]);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [statusBusy, setStatusBusy]   = useState<string | null>(null);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editNote, setEditNote]       = useState('');
  const [editOutcome, setEditOutcome] = useState('');
  const [editStatus, setEditStatus]   = useState('');
  const [editProofUrl, setEditProofUrl] = useState('');

  const load = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ data: { items: Participation[]; pagination: { totalPages: number; page: number } } }>(
        `/api/v1/student/participations?page=${p}&limit=12`,
      );
      setItems(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
      setPage(res.data.pagination.page);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const withdraw = async (id: string) => {
    if (!confirm('Withdraw from this hackathon?')) return;
    setStatusBusy(id);
    try {
      const csrf = await getCsrfToken();
      await apiFetch(`/api/v1/student/participations/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrf } });
      load(page);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to withdraw.'); }
    finally { setStatusBusy(null); }
  };

  const saveEdit = async (id: string) => {
    setStatusBusy(id);
    setError('');
    try {
      const isPodium = PODIUM.includes(editOutcome);
      if (isPodium && !editProofUrl.trim()) {
        setError('A proof URL is required for Winner, Runner-up, or Finalist outcomes.');
        setStatusBusy(null);
        return;
      }
      const statusToSend = editOutcome ? 'COMPLETED' : (editStatus || undefined);
      const csrf = await getCsrfToken();
      await apiFetch(`/api/v1/student/participations/${id}`, {
        method: 'PATCH', headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({
          note: editNote || null,
          outcome: editOutcome || null,
          proofUrl: editProofUrl.trim() || null,
          ...(statusToSend ? { status: statusToSend } : {}),
        }),
      });
      setEditId(null);
      load(page);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update.'); }
    finally { setStatusBusy(null); }
  };

  const openEdit = (p: Participation) => {
    setEditId(p._id);
    setEditNote(p.note ?? '');
    setEditOutcome(p.outcome ?? '');
    setEditStatus('');
    setEditProofUrl(p.proofUrl ?? '');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant="authenticated" />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Student space</p>
        <div className="mb-5 mt-2 flex items-center justify-between">
          <h1 className="text-3xl font-black text-white">My Participations</h1>
          <Link to="/hackathons" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Browse hackathons</Link>
        </div>

        {/* How it works callout */}
        <div className="mb-6 rounded-[20px] border border-primary/20 bg-primary/5 p-4 text-sm text-muted">
          <p className="font-semibold text-highlight mb-1">How participation tracking works</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click <strong className="text-text">"I'm participating"</strong> on a hackathon page to register yourself.</li>
            <li>After the event, click <strong className="text-text">Edit</strong> to set your outcome. <strong className="text-text">Winner / Runner-up / Finalist</strong> require a proof URL (Devpost, LinkedIn cert, etc.).</li>
            <li>Podium claims show <span className="text-amber-300">🔍 Pending review</span> until an admin verifies them — then <span className="text-emerald-300">✅ Verified</span> on the leaderboard.</li>
          </ul>
        </div>

        {error && <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-[24px] bg-card" />)}</div>
        ) : items.length === 0 ? (
          <div className="rounded-[28px] border border-border bg-card py-20 text-center">
            <p className="text-4xl">🚀</p>
            <p className="mt-4 text-muted">You haven't joined any hackathons yet.</p>
            <Link to="/hackathons" className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90">Find hackathons</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p._id} className="rounded-[24px] border border-border bg-card p-5 transition hover:border-primary/30">
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/hackathons/${p.hackathon?.slug}`} className="text-lg font-bold text-white hover:text-highlight">
                      {p.hackathon?.name ?? 'Unknown hackathon'}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">{p.hackathon?.organizer}</p>
                    {p.teamName && <p className="mt-1 text-xs text-muted">Team: {p.teamName}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    {p.outcome && (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${OUTCOME_COLORS[p.outcome]}`}>
                        {OUTCOME_ICONS[p.outcome]} {p.outcome.replace('_', ' ')}
                      </span>
                    )}
                    {p.verificationStatus && (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${VERIFY_COLORS[p.verificationStatus]}`}>
                        {VERIFY_BADGE[p.verificationStatus]}
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted">
                  Registered {fmt(p.registeredAt)}{p.completedAt && ` · Completed ${fmt(p.completedAt)}`}
                </p>
                {p.note && <p className="mt-1 text-sm text-muted italic">"{p.note}"</p>}
                {p.proofUrl && (
                  <a href={p.proofUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-xs text-highlight hover:underline truncate max-w-xs">
                    🔗 {p.proofUrl}
                  </a>
                )}
                {p.verificationStatus === 'REJECTED' && (
                  <p className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
                    Your claim was not verified. Update your proof URL and save again to re-submit for review.
                  </p>
                )}

                {/* Edit inline form */}
                {editId === p._id ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="mb-1 text-xs text-muted">Status</p>
                        <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text">
                          <option value="">Keep current</option>
                          <option value="PARTICIPATING">Participating</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted">Outcome</p>
                        <select value={editOutcome} onChange={(e) => setEditOutcome(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text">
                          <option value="">No outcome</option>
                          {['WINNER', 'RUNNER_UP', 'FINALIST', 'PARTICIPANT'].map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {PODIUM.includes(editOutcome) && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-amber-400">
                          Proof URL required for podium claims
                        </p>
                        <input
                          type="url"
                          value={editProofUrl}
                          onChange={(e) => setEditProofUrl(e.target.value)}
                          placeholder="https://devpost.com/... or LinkedIn certificate URL"
                          className="w-full rounded-xl border border-amber-500/40 bg-background px-3 py-2 text-sm text-text outline-none focus:border-amber-400"
                        />
                        <p className="mt-1 text-xs text-muted">
                          Reviewed by an admin. Verified claims show ✅ on the leaderboard.
                        </p>
                      </div>
                    )}

                    <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)}
                      placeholder="What did you build? (optional note)" maxLength={500}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text" rows={2} />
                    <div className="flex gap-2">
                      <button disabled={!!statusBusy} onClick={() => saveEdit(p._id)}
                        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                        {statusBusy === p._id ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="rounded-full border border-border px-4 py-1.5 text-xs text-muted hover:text-text">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {p.status !== 'WITHDREW' && (
                      <>
                        <button onClick={() => openEdit(p)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-primary/40 hover:text-highlight">
                          Edit
                        </button>
                        <button disabled={!!statusBusy} onClick={() => withdraw(p._id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40">
                          Withdraw
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => load(page - 1)}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40 hover:text-text">
              ← Prev
            </button>
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40 hover:text-text">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}