import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getCsrfToken } from '../lib/api';
import { Navbar } from '../components/Navbar';

// ── Types ──────────────────────────────────────────────────────────
type HackathonListingStatus = 'PENDING' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED';
type HackathonMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';
type HackathonLifecycleStatus = 'UPCOMING' | 'ONGOING' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED';

type AdminHackathon = {
  _id: string;
  name: string;
  organizer: string;
  slug: string;
  location: string;
  mode: HackathonMode;
  domains: string[];
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  listingStatus: HackathonListingStatus;
  lifecycleStatus: HackathonLifecycleStatus;
  description: string;
  registrationUrl: string;
  eligibility: string;
  minimumTeamSize: number;
  maximumTeamSize: number;
  prizeDetails: string;
  requiredSkills: string[];
  sourceType: string;
  sourceUrl?: string;
  lastUpdatedAt: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

// ── Constants ──────────────────────────────────────────────────────
const MODES: HackathonMode[] = ['ONLINE', 'OFFLINE', 'HYBRID'];
const LIFECYCLE_STATUSES: HackathonLifecycleStatus[] = ['UPCOMING', 'REGISTRATION_OPEN', 'ONGOING', 'REGISTRATION_CLOSED'];
const LISTING_STATUSES: HackathonListingStatus[] = ['PENDING', 'PUBLISHED', 'ARCHIVED', 'REJECTED'];
const SOURCE_TYPES = ['ADMIN', 'API', 'RSS', 'ORGANIZER_FEED', 'MANUAL'];
const DOMAINS = [
  'AI/ML', 'Web Development', 'Mobile Development', 'Blockchain',
  'Cybersecurity', 'IoT', 'Cloud', 'Data Science', 'AR/VR', 'Open Innovation',
];

const STATUS_COLORS: Record<HackathonListingStatus, string> = {
  PENDING:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ARCHIVED:  'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  REJECTED:  'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');

// ── Empty form state ───────────────────────────────────────────────
const emptyForm = (): Partial<AdminHackathon> => ({
  name: '', organizer: '', description: '', registrationUrl: '',
  startDate: '', endDate: '', registrationDeadline: '', location: '',
  mode: 'ONLINE', domains: [], eligibility: '', minimumTeamSize: 1,
  maximumTeamSize: 5, prizeDetails: '', requiredSkills: [],
  lifecycleStatus: 'UPCOMING', listingStatus: 'PENDING', sourceType: 'ADMIN', sourceUrl: '',
});

// ── Shell wrapper ──────────────────────────────────────────────────
function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant="admin" />
        <main>{children}</main>
      </div>
    </div>
  );
}

// ── Hackathon Form Modal ───────────────────────────────────────────
function HackathonFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminHackathon;
  onClose: () => void;
  onSaved: (h: AdminHackathon) => void;
}) {
  const [form, setForm] = useState<Partial<AdminHackathon>>(
    initial
      ? {
          ...initial,
          startDate: toDateInput(initial.startDate),
          endDate: toDateInput(initial.endDate),
          registrationDeadline: toDateInput(initial.registrationDeadline),
        }
      : emptyForm(),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(initial);

  const field = (key: keyof AdminHackathon) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleDomain = (d: string) =>
    setForm((f) => ({
      ...f,
      domains: f.domains?.includes(d)
        ? f.domains.filter((x) => x !== d)
        : [...(f.domains ?? []), d],
    }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const csrfToken = await getCsrfToken();
      const body = {
        ...form,
        minimumTeamSize: Number(form.minimumTeamSize),
        maximumTeamSize: Number(form.maximumTeamSize),
        requiredSkills: typeof form.requiredSkills === 'string'
          ? (form.requiredSkills as unknown as string).split(',').map((s) => s.trim()).filter(Boolean)
          : form.requiredSkills ?? [],
      };
      const response = await apiFetch<{ data: { hackathon: AdminHackathon } }>(
        isEdit ? `/api/v1/admin/hackathons/${initial!._id}` : '/api/v1/admin/hackathons',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(body),
        },
      );
      onSaved(response.data.hackathon);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hackathon.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit hackathon' : 'Add new hackathon'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-card hover:text-text" aria-label="Close">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          {/* Row: Name + Organizer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Name *
              <input className="filter-input mt-1" required value={form.name ?? ''} onChange={field('name')} maxLength={160} />
            </label>
            <label className="block text-sm text-muted">
              Organizer *
              <input className="filter-input mt-1" required value={form.organizer ?? ''} onChange={field('organizer')} maxLength={160} />
            </label>
          </div>

          {/* Description */}
          <label className="block text-sm text-muted">
            Description *
            <textarea className="filter-input mt-1 min-h-[80px] resize-y" required value={form.description ?? ''} onChange={field('description')} maxLength={12000} />
          </label>

          {/* Row: Dates */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-muted">
              Start date *
              <input className="filter-input mt-1" type="date" required value={form.startDate ?? ''} onChange={field('startDate')} />
            </label>
            <label className="block text-sm text-muted">
              End date *
              <input className="filter-input mt-1" type="date" required value={form.endDate ?? ''} onChange={field('endDate')} />
            </label>
            <label className="block text-sm text-muted">
              Registration deadline *
              <input className="filter-input mt-1" type="date" required value={form.registrationDeadline ?? ''} onChange={field('registrationDeadline')} />
            </label>
          </div>

          {/* Row: Location + Mode */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Location *
              <input className="filter-input mt-1" required value={form.location ?? ''} onChange={field('location')} maxLength={200} />
            </label>
            <label className="block text-sm text-muted">
              Mode *
              <select className="filter-input mt-1" required value={form.mode ?? 'ONLINE'} onChange={field('mode')}>
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {/* Domains */}
          <div>
            <p className="text-sm text-muted mb-2">Domains * (select at least one)</p>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <button
                  key={d} type="button"
                  onClick={() => toggleDomain(d)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    form.domains?.includes(d)
                      ? 'border-primary bg-primary/20 text-highlight'
                      : 'border-border bg-card text-muted hover:border-primary/50 hover:text-text'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Row: Team size */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Min team size *
              <input className="filter-input mt-1" type="number" required min={1} max={100} value={form.minimumTeamSize ?? 1} onChange={field('minimumTeamSize')} />
            </label>
            <label className="block text-sm text-muted">
              Max team size *
              <input className="filter-input mt-1" type="number" required min={1} max={100} value={form.maximumTeamSize ?? 5} onChange={field('maximumTeamSize')} />
            </label>
          </div>

          {/* Eligibility + Prize */}
          <label className="block text-sm text-muted">
            Eligibility *
            <textarea className="filter-input mt-1 min-h-[60px] resize-y" required value={form.eligibility ?? ''} onChange={field('eligibility')} maxLength={1000} />
          </label>
          <label className="block text-sm text-muted">
            Prize details *
            <textarea className="filter-input mt-1 min-h-[60px] resize-y" required value={form.prizeDetails ?? ''} onChange={field('prizeDetails')} maxLength={2000} />
          </label>

          {/* Skills */}
          <label className="block text-sm text-muted">
            Required skills <span className="text-xs">(comma-separated)</span>
            <input
              className="filter-input mt-1"
              value={Array.isArray(form.requiredSkills) ? form.requiredSkills.join(', ') : (form.requiredSkills ?? '')}
              onChange={field('requiredSkills')}
            />
          </label>

          {/* Registration URL + Source */}
          <label className="block text-sm text-muted">
            Registration URL *
            <input className="filter-input mt-1" type="url" required value={form.registrationUrl ?? ''} onChange={field('registrationUrl')} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Source URL
              <input className="filter-input mt-1" type="url" value={form.sourceUrl ?? ''} onChange={field('sourceUrl')} />
            </label>
            <label className="block text-sm text-muted">
              Source type *
              <select className="filter-input mt-1" value={form.sourceType ?? 'ADMIN'} onChange={field('sourceType')}>
                {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          {/* Row: Lifecycle + Listing status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Lifecycle status *
              <select className="filter-input mt-1" required value={form.lifecycleStatus ?? 'UPCOMING'} onChange={field('lifecycleStatus')}>
                {LIFECYCLE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label className="block text-sm text-muted">
              Listing status *
              <select className="filter-input mt-1" required value={form.listingStatus ?? 'PENDING'} onChange={field('listingStatus')}>
                {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm text-muted transition hover:text-text">
              Cancel
            </button>
            <button
              type="submit" disabled={busy}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create hackathon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────
function DeleteModal({ hackathon, onClose, onDeleted }: { hackathon: AdminHackathon; onClose: () => void; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setBusy(true);
    try {
      const csrfToken = await getCsrfToken();
      await apiFetch(`/api/v1/admin/hackathons/${hackathon._id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      onDeleted(hackathon._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-rose-500/40 bg-panel p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white">Delete hackathon?</h2>
        <p className="mt-3 text-sm text-muted">
          This will permanently delete <span className="font-semibold text-text">{hackathon.name}</span>. This action cannot be undone.
        </p>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2.5 text-sm text-muted transition hover:text-text">Cancel</button>
          <button onClick={confirm} disabled={busy} className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50">
            {busy ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────────
export function AdminPage() {
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState<AdminHackathon[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HackathonListingStatus | ''>('');
  const [formTarget, setFormTarget] = useState<AdminHackathon | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminHackathon | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('q', search);
      if (statusFilter) params.set('listingStatus', statusFilter);
      const response = await apiFetch<{ data: { items: AdminHackathon[]; pagination: Pagination } }>(
        `/api/v1/admin/hackathons?${params.toString()}`
      );
      setHackathons(response.data.items);
      setPagination(response.data.pagination);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load hackathons.';
      if (msg === 'Authentication required.' || msg.includes('permission')) {
        navigate('/login', { replace: true });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); }, [search, statusFilter]);

  const handleStatusChange = async (hackathon: AdminHackathon, status: HackathonListingStatus) => {
    setStatusBusy(hackathon._id);
    try {
      const csrfToken = await getCsrfToken();
      const response = await apiFetch<{ data: { hackathon: AdminHackathon } }>(
        `/api/v1/admin/hackathons/${hackathon._id}/status`,
        { method: 'PATCH', headers: { 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ listingStatus: status }) }
      );
      setHackathons((prev) => prev.map((h) => h._id === hackathon._id ? response.data.hackathon : h));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setStatusBusy(null);
    }
  };

  const onSaved = (saved: AdminHackathon) => {
    setHackathons((prev) => {
      const idx = prev.findIndex((h) => h._id === saved._id);
      return idx >= 0 ? prev.map((h, i) => (i === idx ? saved : h)) : [saved, ...prev];
    });
    setFormTarget(null);
  };

  const onDeleted = (id: string) => {
    setHackathons((prev) => prev.filter((h) => h._id !== id));
    setDeleteTarget(null);
  };

  const fmt = (d?: string) =>
    d ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(d)) : '—';

  return (
    <AdminShell>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">Admin</p>
          <h1 className="mt-1 text-3xl font-black text-white">Hackathon Management</h1>
        </div>
        <button
          onClick={() => setFormTarget('new')}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + Add hackathon
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          className="filter-input w-64"
          placeholder="Search by name or organizer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as HackathonListingStatus | '')}
        >
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-auto self-center text-sm text-muted">
          {pagination.total} hackathon{pagination.total !== 1 ? 's' : ''} total
        </span>
      </div>

      {error && <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300" role="alert">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-[24px] border border-border bg-card">
        {loading ? (
          <div className="space-y-px p-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-background/60" />
            ))}
          </div>
        ) : hackathons.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-3xl">🏆</p>
            <p className="mt-4 text-muted">No hackathons found. Add one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted">
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Dates</th>
                <th className="hidden px-4 py-3 md:table-cell">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hackathons.map((h) => (
                <tr key={h._id} className="group transition hover:bg-background/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{h.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{h.organizer}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    <p>{fmt(h.startDate)} → {fmt(h.endDate)}</p>
                    <p className="mt-0.5 text-xs text-highlight">Deadline: {fmt(h.registrationDeadline)}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{h.mode}</td>
                  <td className="px-4 py-3">
                    <select
                      value={h.listingStatus}
                      disabled={statusBusy === h._id}
                      onChange={(e) => handleStatusChange(h, e.target.value as HackathonListingStatus)}
                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${STATUS_COLORS[h.listingStatus]} bg-transparent`}
                    >
                      {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setFormTarget(h)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-primary/50 hover:text-highlight"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(h)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-rose-400/50 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-text disabled:opacity-40"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
          >
            ← Previous
          </button>
          <span className="text-sm text-muted">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-text disabled:opacity-40"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => load(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modals */}
      {formTarget && (
        <HackathonFormModal
          initial={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={onSaved}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          hackathon={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={onDeleted}
        />
      )}
    </AdminShell>
  );
}
