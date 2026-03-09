'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  LogOut,
  Music,
  Sparkles,
  Zap
} from 'lucide-react';
import { useLiteMode } from '@/lib/use-lite-mode';

export interface LandingSessionUser {
  username: string;
  profile?: {
    avatarUrl?: string;
    displayName?: string;
  };
}

export default function LandingClient({
  initialUser,
}: {
  initialUser: LandingSessionUser | null;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const liteMode = useLiteMode(!!reduceMotion);
  const [sessionUser, setSessionUser] = useState<LandingSessionUser | null>(initialUser);
  const [signingOut, setSigningOut] = useState(false);

  const isLoggedIn = !!sessionUser;
  const primaryHref = isLoggedIn ? '/dashboard' : '/register';
  const secondaryHref = isLoggedIn ? '/dashboard' : '/login';
  const primaryLabel = isLoggedIn ? 'Open dashboard' : 'Create your page';
  const secondaryLabel = isLoggedIn ? 'Manage profile' : 'Sign in';
  const avatarUrl = sessionUser?.profile?.avatarUrl?.trim() || '';
  const avatarFallback = (sessionUser?.profile?.displayName || sessionUser?.username || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  const floatTransition = liteMode
    ? { duration: 0 }
    : { duration: 20, repeat: Infinity, ease: 'easeInOut' as const, repeatType: 'reverse' as const };

  const handleSignOut = async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setSessionUser(null);
      router.replace('/');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  // Animation variants for staggered lists
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen selection:bg-white/20 selection:text-white overflow-hidden bg-[#050507] text-white font-sans">
      {/* Dynamic Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Animated glowing orbs */}
        <motion.div
          animate={liteMode ? undefined : { x: [-30, 30, -30], y: [-30, 30, -30], scale: [1, 1.1, 1] }}
          transition={floatTransition}
          className={`absolute -left-32 top-[-20%] rounded-full bg-gradient-to-br from-[#ff8f4d]/10 to-[#ff4d4d]/5 ${liteMode ? 'h-[360px] w-[360px] blur-[70px]' : 'h-[600px] w-[600px] blur-[120px]'}`}
        />
        <motion.div
          animate={liteMode ? undefined : { x: [30, -30, 30], y: [30, -30, 30], scale: [1, 1.2, 1] }}
          transition={{ ...floatTransition, duration: 25 }}
          className={`absolute right-[-20%] top-[10%] rounded-full bg-gradient-to-bl from-[#4f82ff]/10 to-[#9b4dff]/5 ${liteMode ? 'h-[420px] w-[420px] blur-[80px]' : 'h-[700px] w-[700px] blur-[150px]'}`}
        />
        {/* Subtle grid texture overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.08]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_50%),linear-gradient(180deg,#050507_0%,#080a10_50%,#050507_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-20 pt-6 lg:px-12">
        {/* Navigation */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between rounded-full border border-white/5 bg-white/[0.02] px-4 py-3 shadow-2xl backdrop-blur-2xl transition-all hover:bg-white/[0.04]"
        >
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-white/10 to-white/5 shadow-inner transition-transform group-hover:scale-105 overflow-hidden">
               <Image src="/icon.svg" alt="LinkSky logo" width={24} height={24} className="drop-shadow-md" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">LinkSky</p>
              <p className="text-sm font-medium text-white/90">Profile pages</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="User avatar" fill className="object-cover" sizes="40px" unoptimized />
                  ) : (
                    avatarFallback
                  )}
                </div>
                <Link href="/dashboard" className="hidden sm:inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:scale-105 hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 disabled:opacity-50"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white md:block">
                  Sign in
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:scale-105 hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  Start free
                </Link>
              </>
            )}
          </div>
        </motion.nav>

        {/* Hero Section */}
        <main className="flex flex-1 flex-col justify-center py-16 lg:py-24">
          <section className="mx-auto w-full max-w-5xl">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-[#ffcf8d]/20 bg-[#ffcf8d]/10 px-4 py-1.5 text-xs font-medium text-[#ffd08d] backdrop-blur-md"
              >
                <Sparkles size={14} />
                <span>Minimal profiles, styled for dark UI</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 text-[3.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-[4.5rem] lg:text-[5.5rem]"
              >
                <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                  Share one page
                </span>
                <br />
                <span className="bg-gradient-to-r from-white/90 to-white/40 bg-clip-text text-transparent">
                  that looks finished.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl"
              >
                LinkSky keeps your avatar, links, background and music in one clean page that stays readable on both desktop and mobile.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 flex flex-wrap items-center justify-center gap-4"
              >
                <Link href={primaryHref} className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <span className="relative z-10">{primaryLabel}</span>
                  <ArrowRight size={18} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Link>
                <Link href={secondaryHref} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white backdrop-blur-md transition-all hover:bg-white/10 hover:text-white">
                  {secondaryLabel}
                </Link>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="mt-14 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3"
              >
                <MetricCard value="Fast" label="Server-side state" />
                <MetricCard value="Clean" label="No clutter editing" />
                <MetricCard value="Ready" label="Mobile optimized" />
              </motion.div>
            </div>
          </section>

          {/* Features Section */}
          <motion.section 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: liteMode ? '0px' : '-100px' }}
            variants={containerVariants}
            className="mt-32 grid gap-6 lg:grid-cols-3 [content-visibility:auto] [contain-intrinsic-size:720px]"
          >
            <FeatureCard
              icon={<Zap size={22} />}
              title="Simple editing"
              description="The dashboard focuses on the basics first: media, profile, appearance and links."
              motionEnabled={!liteMode}
            />
            <FeatureCard
              icon={<Music size={22} />}
              title="Personal styling"
              description="Add a background, a track and a few visual details without turning the page into a mess."
              motionEnabled={!liteMode}
            />
            <FeatureCard
              icon={<BarChart3 size={22} />}
              title="Useful stats"
              description="Views, clicks and referral data are available without leaving the app."
              motionEnabled={!liteMode}
            />
          </motion.section>

          {/* Workflow Section */}
          <motion.section 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: liteMode ? '0px' : '-100px' }}
            transition={{ duration: liteMode ? 0.01 : 0.7 }}
            className="mt-32 relative overflow-hidden rounded-[40px] border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-8 backdrop-blur-2xl sm:p-12 [content-visibility:auto] [contain-intrinsic-size:760px]"
          >
            <div className="absolute top-0 left-1/2 h-[1px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="mb-12 text-center sm:text-left">
              <p className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#9ebcff]">How it works</p>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Set it up once.<br className="hidden sm:block" /> Keep it easy to share.
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <WorkflowCard
                step="01"
                title="Pick your username"
                text="Start with a short profile URL you can reuse across every platform."
                motionEnabled={!liteMode}
              />
              <WorkflowCard
                step="02"
                title="Add what matters"
                text="Upload your media, write a short intro and keep only the links worth clicking."
                motionEnabled={!liteMode}
              />
              <WorkflowCard
                step="03"
                title="Publish & update"
                text="Open the dashboard later, change what you need and keep the same public link."
                motionEnabled={!liteMode}
              />
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: liteMode ? '0px' : '-50px' }}
            transition={{ duration: liteMode ? 0.01 : 0.6 }}
            className="mt-32 relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-b from-[#0c111d] to-[#070b14] px-6 py-20 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:px-12 [content-visibility:auto] [contain-intrinsic-size:620px]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%),radial-gradient(circle_at_bottom,rgba(79,130,255,0.08),transparent_48%)] opacity-70" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-8 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <Image src="/icon.svg" alt="Icon" width={32} height={32} />
              </div>
              <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl max-w-3xl">
                A single place for the parts of your profile people actually need.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/50">
                No extra noise. Just a dark, polished page that is easy to edit and easy to share.
              </p>
              <Link href={primaryHref} className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                {primaryLabel}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.section>
        </main>

        <footer className="mt-16 border-t border-white/5 pt-8 text-center text-sm font-medium text-white/30">
          <p>Copyright {new Date().getFullYear()} LinkSky. Built for creators.</p>
        </footer>
      </div>
    </div>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-left backdrop-blur-md"
    >
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-white/40">{label}</p>
    </motion.div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  motionEnabled = true,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  motionEnabled?: boolean;
}) {
  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={motionEnabled ? { y: -5 } : undefined}
      className="group rounded-[32px] border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-[#9ebcff] shadow-inner transition-transform group-hover:scale-110 group-hover:bg-[#9ebcff]/10">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/50">{description}</p>
    </motion.div>
  );
}

function WorkflowCard({
  step,
  title,
  text,
  motionEnabled = true,
}: {
  step: string;
  title: string;
  text: string;
  motionEnabled?: boolean;
}) {
  return (
    <motion.div 
      whileHover={motionEnabled ? { y: -4 } : undefined}
      className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-black/20 p-8 transition-colors hover:bg-black/40"
    >
      <p className="text-xs font-black tracking-[0.2em] text-white/20 transition-colors group-hover:text-white/40">{step}</p>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/50">{text}</p>
    </motion.div>
  );
}
