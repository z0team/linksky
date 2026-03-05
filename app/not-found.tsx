import Link from 'next/link';
import { House, LayoutDashboard, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(142,167,255,0.22),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(255,174,97,0.18),transparent_32%),linear-gradient(180deg,#070a12_0%,#0b1220_100%)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#8ea7ff]/18 blur-[100px]" />
        <div className="absolute right-[-60px] bottom-[-30px] h-72 w-72 rounded-full bg-[#ffae61]/16 blur-[110px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-neutral-300">
          <SearchX size={14} />
          404
        </div>

        <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-neutral-300 sm:text-base md:text-lg">
          The page may have been moved, deleted, or the link is incorrect.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#f6f8ff] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white"
          >
            <House size={16} />
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
