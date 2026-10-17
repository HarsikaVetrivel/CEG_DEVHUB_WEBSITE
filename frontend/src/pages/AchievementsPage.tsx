import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Navbar } from '../components/Navbar';

type Achievement = {
  _id: string;
  achievementKey: string;
  earnedAt: string;
  hackathonId?: { name: string; slug: string } | null;
  meta: { label: string; description: string; icon: string };
};

const fmt = (d: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(d));

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ data: { achievements: Achievement[] } }>('/api/v1/student/achievements')
      .then((res) => setAchievements(res.data.achievements))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant="authenticated" />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Student space</p>
        <div className="mb-7 mt-2 flex items-center justify-between">
          <h1 className="text-3xl font-black text-white">Achievements</h1>
          <Link to="/participations" className="text-sm text-highlight hover:text-text">My participations →</Link>
        </div>

        {error && <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-[24px] bg-card" />
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <div className="rounded-[28px] border border-border bg-card py-20 text-center">
            <p className="text-5xl">🏅</p>
            <p className="mt-4 text-lg font-semibold text-white">No achievements yet</p>
            <p className="mt-2 text-sm text-muted">Join and complete hackathons to earn badges.</p>
            <Link
              to="/hackathons"
              className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Browse hackathons
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a) => (
              <div
                key={a._id}
                className="flex flex-col rounded-[24px] border border-primary/30 bg-primary/5 p-5 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow"
              >
                <span className="text-4xl">{a.meta.icon}</span>
                <p className="mt-3 text-lg font-bold text-white">{a.meta.label}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{a.meta.description}</p>
                <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                  Earned {fmt(a.earnedAt)}
                  {a.hackathonId && (
                    <span>
                      {' '}· via{' '}
                      <Link
                        to={`/hackathons/${a.hackathonId.slug}`}
                        className="text-highlight hover:underline"
                      >
                        {a.hackathonId.name}
                      </Link>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Locked achievements */}
        {!loading && (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-bold text-white">Locked achievements</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'FIRST_HACKATHON', icon: '🎯', label: 'First Steps',        description: 'Complete your first hackathon.' },
                { key: 'FIVE_HACKATHONS',  icon: '⚡', label: 'Serial Hacker',      description: 'Complete 5 hackathons.' },
                { key: 'TEN_HACKATHONS',   icon: '🏅', label: 'Hackathon Veteran',  description: 'Complete 10 hackathons.' },
                { key: 'FIRST_WIN',        icon: '🥇', label: 'Gold Medal',          description: 'Win your first hackathon.' },
                { key: 'THREE_WINS',       icon: '🏆', label: 'Champion',            description: 'Win 3 hackathons.' },
                { key: 'PODIUM_3',         icon: '🎖️', label: 'Podium Finisher',    description: 'Reach a top-3 position.' },
                { key: 'TEAM_PLAYER',      icon: '🤝', label: 'Team Player',         description: 'Join or create 3 teams.' },
                { key: 'STREAK_3',         icon: '🔥', label: 'On a Roll',           description: 'Participate in 3 different months.' },
              ]
                .filter((def) => !achievements.some((a) => a.achievementKey === def.key))
                .map((def) => (
                  <div
                    key={def.key}
                    className="flex flex-col rounded-[24px] border border-border bg-card p-5 opacity-50 grayscale"
                  >
                    <span className="text-4xl">{def.icon}</span>
                    <p className="mt-3 text-lg font-bold text-white">{def.label}</p>
                    <p className="mt-1 text-sm text-muted">{def.description}</p>
                    <p className="mt-4 border-t border-border pt-3 text-xs text-muted">Locked</p>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}