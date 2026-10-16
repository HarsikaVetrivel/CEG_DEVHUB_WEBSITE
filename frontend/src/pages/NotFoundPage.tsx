import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Navbar variant="public" />
        <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-highlight">404</p>
          <h1 className="mt-3 text-5xl font-black text-white">Page not found</h1>
          <p className="mt-4 max-w-sm text-base text-muted">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Back to home
            </Link>
            <Link
              to="/hackathons"
              className="rounded-full border border-border bg-card px-6 py-3 font-semibold text-text transition hover:border-primary/60 hover:text-highlight"
            >
              Browse hackathons
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
