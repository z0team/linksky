import { NextResponse } from 'next/server';
import {
  getUserByUsername,
  getUsernameBySession,
  saveUserProfile,
} from '@/lib/db';
import { cookies } from 'next/headers';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { cleanupOwnedProxyMediaUrls } from '@/lib/storage';
import { profileUpdateSchema } from '@/lib/validation';
import { ZodError } from 'zod';

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const asNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};
const asBool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const asFont = (value: unknown, fallback: 'sans' | 'serif' | 'mono') => {
  const v = asString(value).toLowerCase();
  if (v === 'sans' || v === 'serif' || v === 'mono') return v;
  return fallback;
};

const normalizeSocials = (value: unknown): Array<{ platform: string; url: string }> => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;
        const platform = asString(raw.platform).toLowerCase();
        const url = asString(raw.url);
        if (!platform || !url) return null;
        return { platform, url };
      })
      .filter((item): item is { platform: string; url: string } => item !== null);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([platform, url]) => {
        const normalizedUrl = asString(url);
        if (!normalizedUrl) return null;
        return { platform: platform.toLowerCase(), url: normalizedUrl };
      })
      .filter((item): item is { platform: string; url: string } => item !== null);
  }

  return [];
};

export async function PUT(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = consumeRateLimit(`profile:update:${ip}`, 60, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many profile updates. Try again later.' }, { status: 429 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;
    if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const username = await getUsernameBySession(sessionId);
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getUserByUsername(username);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const updates = profileUpdateSchema.parse((await req.json()) as Record<string, unknown>);
    const current = user.profile;
    const mediaFields = ['avatarUrl', 'backgroundUrl', 'musicUrl', 'cursorUrl'] as const;

    const nextProfile = {
      ...current,
      displayName: asString(updates.displayName ?? current.displayName) || current.displayName,
      bio: asString(updates.bio ?? current.bio),
      status: asString(updates.status ?? current.status),
      location: asString(updates.location ?? current.location),
      avatarUrl: asString(updates.avatarUrl ?? current.avatarUrl),
      backgroundUrl: asString(updates.backgroundUrl ?? current.backgroundUrl),
      musicUrl: asString(updates.musicUrl ?? current.musicUrl),
      cursorUrl: asString(updates.cursorUrl ?? current.cursorUrl),
      songTitle: asString(updates.songTitle ?? current.songTitle),
      enterText: asString(updates.enterText ?? current.enterText) || current.enterText,
      accentColor: asString(updates.accentColor ?? current.accentColor) || current.accentColor,
      cardOpacity: asNumber(updates.cardOpacity ?? current.cardOpacity, current.cardOpacity, 0.2, 0.9),
      blurStrength: asNumber(updates.blurStrength ?? current.blurStrength, current.blurStrength, 0, 32),
      showViews: asBool(updates.showViews ?? current.showViews, current.showViews),
      enableGlow: asBool(updates.enableGlow ?? current.enableGlow, current.enableGlow),
      fontFamily: asFont(updates.fontFamily ?? current.fontFamily, current.fontFamily),
      socials: normalizeSocials(updates.socials ?? current.socials),
    };

    const savedProfile = await saveUserProfile(username, nextProfile);
    const replacedMediaUrls = mediaFields
      .map((field) => {
        const previous = asString(current[field]);
        const next = asString(nextProfile[field]);
        if (!previous || previous === next) return null;
        return previous;
      })
      .filter((value): value is string => value !== null);

    if (replacedMediaUrls.length) {
      try {
        await cleanupOwnedProxyMediaUrls(
          username,
          replacedMediaUrls,
          mediaFields.map((field) => asString(nextProfile[field])).filter(Boolean),
        );
      } catch (cleanupError) {
        console.error('Media cleanup failed:', cleanupError);
      }
    }

    return NextResponse.json({ success: true, profile: savedProfile });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
