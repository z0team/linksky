import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import LandingActions from './LandingActions';

export interface LandingSessionUser {
  username: string;
  profile?: {
    avatarUrl?: string;
    displayName?: string;
  };
}

const controlRows = [
  {
    title: 'Identity',
    text: 'Name, bio, status, and the one URL people keep seeing everywhere else.',
  },
  {
    title: 'Atmosphere',
    text: 'Background, accent, font, music, and entry text without turning the page into a toy.',
  },
  {
    title: 'Click path',
    text: 'The links people actually need, in the order you want them noticed.',
  },
];

const differenceRows = [
  'The public page stays expressive, but still readable.',
  'The editor separates content, style, links, and stats instead of mixing everything together.',
  'You keep one stable link while the page changes behind it.',
];

export default function LandingClient({
  initialUser,
}: {
  initialUser: LandingSessionUser | null;
}) {
  const isLoggedIn = Boolean(initialUser);
  const primaryHref = isLoggedIn ? '/dashboard' : '/register';
  const secondaryHref = isLoggedIn ? '/dashboard' : '/login';
  const primaryLabel = isLoggedIn ? 'Open your studio' : 'Claim your page';
  const secondaryLabel = isLoggedIn ? 'Manage profile' : 'Sign in';

  return (
    <div className="relative overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0,rgba(241,147,113,0.14),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(125,192,255,0.16),transparent_36%),linear-gradient(180deg,rgba(8,11,16,0.97),rgba(10,13,18,0.99))]" />
        <div className="absolute left-[8%] top-24 h-40 w-40 rounded-full bg-[rgba(241,147,113,0.08)] blur-3xl" />
        <div className="absolute right-[8%] top-16 h-48 w-48 rounded-full bg-[rgba(125,192,255,0.08)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-4 pb-14 pt-4 sm:px-6 lg:px-8">
        <nav className="linksky-panel flex items-center justify-between rounded-[28px] px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))]">
              <Image src="/icon.svg" alt="LinkSky logo" width={26} height={26} priority />
            </div>
            <div>
              <p className="font-display text-sm font-semibold tracking-[0.18em] text-white">LINKSKY</p>
              <p className="text-xs text-[color:var(--text-muted)]">Profile pages with a point of view</p>
            </div>
          </Link>

          <LandingActions sessionUser={initialUser} />
        </nav>

        <main className="flex-1 py-10 sm:py-14">
          <section className="max-w-[760px]">
            <div>
              <span className="linksky-kicker">
                <Sparkles size={14} className="text-[color:var(--brand-sand)]" />
                For creators, gamers, and internet-native identities
              </span>

              <h1 className="mt-6 font-display text-[clamp(3.2rem,8vw,6.2rem)] font-bold leading-[0.95] tracking-[-0.05em] text-white">
                Make the page
                <br />
                feel owned.
              </h1>

              <p className="mt-6 max-w-[42rem] text-lg leading-8 text-[color:var(--text-secondary)] sm:text-xl">
                LinkSky gives you one public page for your name, links, media, and mood. Clean to edit, easy to update, and specific enough to feel like yours.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={primaryHref} className="linksky-button-primary inline-flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base">
                  {primaryLabel}
                  <ArrowRight size={17} />
                </Link>
                <Link href={secondaryHref} className="linksky-button-secondary inline-flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base">
                  {secondaryLabel}
                </Link>
              </div>

              <div className="mt-10 grid gap-3 border-t border-white/8 pt-6 sm:grid-cols-3">
                <Metric label="Editing" value="Clear" helper="Content, theme, links, and stats stay separate." />
                <Metric label="Media" value="Built in" helper="Avatar, background, audio, and cursor support." />
                <Metric label="Public link" value="Stable" helper="Update the page without replacing the URL." />
              </div>
            </div>
          </section>

          <section className="mt-24 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <article className="linksky-panel rounded-[32px] p-6 sm:p-7">
              <span className="linksky-kicker">What changes the page</span>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Fewer controls.
                <span className="ml-2 font-editorial font-medium text-[color:var(--brand-sand)]">Better taste.</span>
              </h2>
              <div className="mt-6 space-y-4">
                {controlRows.map((row) => (
                  <div key={row.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="font-display text-xl font-semibold text-white">{row.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">{row.text}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="linksky-panel rounded-[32px] p-6 sm:p-7">
              <span className="linksky-kicker">Why it lands better</span>
              <div className="mt-6 space-y-3">
                {differenceRows.map((item) => (
                  <div key={item} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-[color:var(--text-secondary)]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-white/8 pt-6">
                <h3 className="font-display text-2xl font-semibold text-white">Build it once. Keep it current.</h3>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
                  LinkSky is for people who want the page to feel deliberate, but do not want editing it to become a project every week.
                </p>
              </div>
            </article>
          </section>

          <section className="mt-20">
            <div className="linksky-panel rounded-[34px] px-6 py-10 sm:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[620px]">
                  <span className="linksky-kicker">Ready when you are</span>
                  <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                    Claim the page before the next bio edit gets messy.
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link href={primaryHref} className="linksky-button-primary inline-flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base">
                    {primaryLabel}
                    <ArrowRight size={17} />
                  </Link>
                  <Link href={secondaryHref} className="linksky-button-secondary inline-flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base">
                    {secondaryLabel}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/8 px-1 pt-6 text-sm text-[color:var(--text-muted)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>LinkSky is for pages that should look intentional, not temporary.</p>
            <p className="font-mono-display text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
              Link • Media • Atmosphere
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">{helper}</p>
    </div>
  );
}
