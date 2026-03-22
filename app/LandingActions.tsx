'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LogOut } from 'lucide-react';
import type { LandingSessionUser } from './LandingClient';

export default function LandingActions({
  sessionUser,
}: {
  sessionUser: LandingSessionUser | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const avatarUrl = sessionUser?.profile?.avatarUrl?.trim() || '';
  const avatarFallback = (sessionUser?.profile?.displayName || sessionUser?.username || 'L')
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
      router.replace('/');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  if (!sessionUser) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="hidden px-4 py-2 text-sm text-[color:var(--text-secondary)] transition-colors hover:text-white md:inline-flex">
          Sign in
        </Link>
        <Link href="/register" className="linksky-button-primary inline-flex items-center gap-2 px-5 py-3 text-sm">
          Claim your page
          <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/10">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="User avatar" fill sizes="36px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
              {avatarFallback}
            </div>
          )}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-sm font-semibold text-white">
            {sessionUser.profile?.displayName || sessionUser.username}
          </p>
          <p className="truncate text-xs text-[color:var(--text-muted)]">@{sessionUser.username}</p>
        </div>
      </div>
      <Link href="/dashboard" className="linksky-button-primary inline-flex items-center gap-2 px-4 py-3 text-sm">
        Open studio
        <ArrowRight size={15} />
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
        aria-label="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
