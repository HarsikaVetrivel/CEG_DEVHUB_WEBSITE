import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { DOMAINS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

type LeaderboardEntry = {
  _id: string;
  participations: number;
  completions: number;
  wins: number;
  podiums: number;
  user: { fullName: string; course: string | null; yearOfStudy: number | null; interestedDomains: string[] };

  /** Snapshot of the student's latest win verification status from participation docs */
  topVerificationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | null;
};

const RANK_COLORS = ['text-amber-400', 'text-slate-300', 'text-amber-600'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

export function RankingsPage() {
  const { status } = useAuth();
  const navVariant = status === 'authenticated' ? 'authenticated' : 'public';
  const [items, setItems]     = useState<LeaderboardEntry[]>([]);
  const [sort, setSort]       = useState<'completions' | 'wins'>('completions');
  const [domain, setDomain]   = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ sort, page: String(p), limit: '50' });
      if (domain) qs.set('domain', domain);
      const res = await apiFetch<{
        data: { items: LeaderboardEntry[]; pagination: { page: number; totalPages: number; total: number } };
      }>(`/api/v1/hackathons/rankings/leaderboard?${qs}`);
      setItems(res.data.items);
      setPage(res.data.pagination.page);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rankings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [sort, domain]);

  const globalOffset = (page - 1) * 50;

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant={navVariant} />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Community</p>
        <h1 className="mb-1 mt-2 text-3xl font-black text-white">Leaderboard</h1>
        <p className="mb-2 text-sm text-muted">{total} students ranked</p>
        <p className="mb-6 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-xs text-muted">
          <strong>By completions</strong> — ranks students who have marked at least one hackathon as completed, ordered by most completions then most wins.
          {' '}<strong>By wins</strong> — ranks only students with at least one verified podium win.
          Students must complete a hackathon before appearing on the leaderboard.
        </p>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex overflow-hidden rounded-xl border border-border">
            <button
              onClick={() => setSort('completions')}
              className={`px-4 py-2 text-sm font-semibold transition ${sort === 'completions' ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}
            >
              By completions
            </button>
            <button
              onClick={() => setSort('wins')}
              className={`px-4 py-2 text-sm font-semibold transition ${sort === 'wins' ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}
            >
              By wins
            </button>
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
          >
            <option value="">All domains</option>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {error && <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-[20px] bg-card" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[28px] border border-border bg-card py-20 text-center">
            <p className="text-4xl">📊</p>
            <p className="mt-4 font-semibold text-white">
              {sort === 'wins' ? 'No verified wins yet' : 'No completions yet'}
            </p>
            <p className="mt-2 text-sm text-muted">
              {sort === 'wins'
                ? 'Win a hackathon and have it verified by an admin to appear here.'
                : 'Complete a hackathon and mark it as completed to appear on the leaderboard.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted">
                  <th className="px-4 py-3 w-12">Rank</th>
                  <th className="px-4 py-3">Student</th>

                  <th className="px-4 py-3 text-right">Joined</th>
                  <th className="px-4 py-3 text-right">Completed</th>
                  <th className="px-4 py-3 text-right">Wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((entry, idx) => {
                  const rank = globalOffset + idx + 1;
                  return (
                    <tr key={entry._id} className="transition hover:bg-background/40">
                      <td className="px-4 py-3">
                        {rank <= 3
                          ? <span className={`text-lg ${RANK_COLORS[rank - 1]}`}>{RANK_ICONS[rank - 1]}</span>
                          : <span className="text-sm font-semibold text-muted">#{rank}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{entry.user.fullName}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {[entry.user.course, entry.user.yearOfStudy ? `Year ${entry.user.yearOfStudy}` : null].filter(Boolean).join(' · ')}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-muted">{entry.participations}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{entry.completions}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {entry.wins > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-amber-400">{entry.wins}</span>
                            {entry.topVerificationStatus === 'VERIFIED' && <span title="Verified win">✅</span>}
                            {entry.topVerificationStatus === 'UNVERIFIED' && <span title="Pending verification" className="text-amber-300">🔍</span>}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40 hover:text-text">← Prev</button>
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="rounded-full border border-border px-4 py-2 text-sm text-muted disabled:opacity-40 hover:text-text">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}