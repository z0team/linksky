'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Layout,
  Music,
  MousePointer2,
  Globe,
  Shield,
  Zap,
  WandSparkles,
  CheckCircle2,
  LogOut,
} from 'lucide-react';

interface SessionUser {
  username: string;
  profile?: {
    avatarUrl?: string;
    displayName?: string;
  };
}

export default function Landing() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth', {
          method: 'GET',
          cache: 'no-store',
        });
        const data = await res.json();
        if (!mounted) return;
        setSessionUser(data?.user || null);
      } catch {
        if (!mounted) return;
        setSessionUser(null);
      } finally {
        if (mounted) {
          setAuthChecked(true);
        }
      }
    };

    void loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const floatTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 26, repeat: Infinity, ease: 'linear' as const };
  const isLoggedIn = !!sessionUser;
  const primaryAuthHref = isLoggedIn ? '/dashboard' : '/register';
  const secondaryAuthHref = isLoggedIn ? '/dashboard' : '/login';
  const finalCtaLabel = isLoggedIn ? 'Open Dashboard' : 'Create Your Profile';
  const avatarUrl = sessionUser?.profile?.avatarUrl?.trim() || '';
  const avatarFallback = (sessionUser?.profile?.displayName || sessionUser?.username || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

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

  return (
    <div className="min-h-screen text-white overflow-x-hidden selection:bg-[#f2f6ff40] relative">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={reduceMotion ? undefined : { x: [0, 60, -30, 0], y: [0, 30, -20, 0], scale: [1, 1.2, 1] }}
          transition={floatTransition}
          className="absolute -top-40 -left-24 h-[480px] w-[480px] rounded-full blur-[120px] bg-[#ff7a18]/20"
        />
        <motion.div
          animate={reduceMotion ? undefined : { x: [0, -40, 20, 0], y: [0, -25, 15, 0], scale: [1, 1.18, 1] }}
          transition={{ ...floatTransition, duration: reduceMotion ? 0 : 32 }}
          className="absolute -bottom-32 right-[-100px] h-[520px] w-[520px] rounded-full blur-[130px] bg-[#4f8dff]/20"
        />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.08),transparent_48%),radial-gradient(circle_at_80%_65%,rgba(64,145,255,0.12),transparent_46%),linear-gradient(180deg,#06070a_0%,#090b12_100%)]" />
      </div>

      <nav className="flex items-center justify-between px-5 py-5 md:px-12 max-w-7xl mx-auto relative z-50">
        <div className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Image src="/icon.svg" alt="LinkSky logo" width={32} height={32} className="rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.24)]" />
          LinkSky
        </div>
        <div className="flex gap-3 items-center">
          {authChecked && isLoggedIn ? (
            <>
              <div className="relative h-10 w-10 rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10 flex items-center justify-center text-sm font-semibold">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="User avatar" fill className="object-cover" sizes="40px" unoptimized />
                ) : (
                  avatarFallback
                )}
              </div>
              <Link href="/dashboard" className="px-5 py-2.5 text-sm font-semibold bg-[#f6f8ff] text-black rounded-full hover:bg-white transition-colors shadow-[0_8px_30px_rgba(255,255,255,0.28)]">
                Go to dashboard
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
                title="Sign out"
                className="h-10 w-10 rounded-full text-neutral-300 border border-white/20 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center justify-center disabled:opacity-70"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden md:block px-5 py-2.5 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2.5 text-sm font-semibold bg-[#f6f8ff] text-black rounded-full hover:bg-white transition-colors shadow-[0_8px_30px_rgba(255,255,255,0.28)]">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="relative z-10 px-5 md:px-8 pb-24">
        <section className="max-w-7xl mx-auto pt-24 md:pt-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-200 mb-8 backdrop-blur-md"
          >
            <WandSparkles size={14} className="text-[#ffd27f]" />
            <span>Design-led profile pages for creators</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-[2.8rem] leading-[1.04] sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em]"
          >
            Build a profile that
            <br />
            feels alive.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base md:text-xl text-neutral-300 max-w-3xl mx-auto mt-6 mb-10 leading-relaxed"
          >
            Publish instantly and share one beautiful link everywhere.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap justify-center items-center gap-3"
          >
            <Link href={primaryAuthHref} className="group inline-flex items-center gap-2 px-8 py-4 bg-[#f6f8ff] text-black rounded-full text-base md:text-lg font-bold hover:bg-white transition-all hover:scale-[1.02]">
              Claim your link
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href={secondaryAuthHref} className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 bg-white/5 text-white text-base md:text-lg font-semibold hover:bg-white/10 transition-colors">
              I already have an account
            </Link>
          </motion.div>
        </section>

        <section className="max-w-5xl mx-auto mt-14 sm:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="rounded-[24px] border border-white/15 bg-black/30 backdrop-blur-xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.38)]"
          >
            <div className="rounded-[22px] overflow-hidden border border-white/10 bg-black">
              <div className="h-10 px-4 border-b border-white/10 bg-black/55 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <iframe
                src="/preview/test?embed=1"
                className="w-full aspect-[16/9] border-0"
                loading="lazy"
                title="LinkSky live preview"
              />
            </div>
          </motion.div>
        </section>

        <section className="max-w-7xl mx-auto mt-24 md:mt-28">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Everything you need</h2>
            <p className="text-neutral-300 text-base md:text-lg">Focused tools, smooth interactions, fast loading.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            <FeatureCard icon={<Layout />} title="Modern Layouts" desc="Adaptive profile cards that look right on phone, tablet and desktop." />
            <FeatureCard icon={<Music />} title="Background Music" desc="Add your track and control playback with a clean mini-player." />
            <FeatureCard icon={<Globe />} title="Image Background" desc="Upload immersive background images to make profile pages stand out." />
            <FeatureCard icon={<MousePointer2 />} title="Custom Cursor" desc="Use your own cursor style for a recognizable branded experience." />
            <FeatureCard icon={<Shield />} title="Safer Auth" desc="Session cookies and hashed passwords with cleaner validation flow." />
            <FeatureCard icon={<Zap />} title="Fast Runtime" desc="Reduced animation weight and cleaner API/profile data normalization." />
          </div>
        </section>

        <section className="max-w-5xl mx-auto mt-24 md:mt-28">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-10 text-center">How it works</h2>

          <div className="space-y-5">
            <Step number="01" title="Claim username" desc="Register and get your personal URL instantly." />
            <Step number="02" title="Style your profile" desc="Upload media, add social links and tune your profile look." />
            <Step number="03" title="Share and grow" desc="Publish in bio and use one link across every platform." />
          </div>
        </section>

        <section className="max-w-5xl mx-auto mt-24 md:mt-28 text-center rounded-[30px] border border-white/10 bg-white/[0.04] p-10 md:p-14 backdrop-blur-xl">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-5">Ready to launch yours?</h2>
          <p className="text-neutral-300 text-base md:text-lg mb-8">Create your page, refine the look, and publish a polished link in minutes.</p>
          <Link href={primaryAuthHref} className="inline-flex items-center gap-2 px-9 py-4 bg-[#f6f8ff] text-black rounded-full text-lg font-bold hover:bg-white transition-all hover:scale-[1.02]">
            {finalCtaLabel}
            <ArrowRight size={19} />
          </Link>
        </section>
      </main>

      <footer className="relative z-10 py-8 text-center text-neutral-400 text-sm border-t border-white/10 mt-20">
        <p>© 2026 LinkSky. Built for creators.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="p-7 rounded-3xl bg-white/[0.045] border border-white/10 hover:bg-white/[0.07] transition-colors group"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-300 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45 }}
      className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center p-6 md:p-8 rounded-3xl bg-gradient-to-r from-white/[0.07] to-transparent border border-white/10"
    >
      <div className="text-5xl md:text-7xl font-black text-white/20 tracking-tight leading-none">{number}</div>
      <div>
        <h3 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
          <CheckCircle2 size={22} className="text-emerald-300" />
          {title}
        </h3>
        <p className="text-neutral-300 text-base md:text-lg">{desc}</p>
      </div>
    </motion.div>
  );
}
