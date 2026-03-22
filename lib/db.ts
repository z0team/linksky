import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface SocialLink {
  platform: string;
  url: string;
}

export interface UserProfile {
  displayName: string;
  bio: string;
  status: string;
  location: string;
  avatarUrl: string;
  backgroundUrl: string;
  musicUrl: string;
  cursorUrl: string;
  songTitle: string;
  enterText: string;
  accentColor: string;
  cardOpacity: number;
  blurStrength: number;
  showViews: boolean;
  enableGlow: boolean;
  fontFamily: 'sans' | 'serif' | 'mono';
  socials: SocialLink[];
  views: number;
}

export interface User {
  username: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
}

export interface AnalyticsPoint {
  label: string;
  count: number;
}

export interface ProfileAnalytics {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  topReferrers: AnalyticsPoint[];
  clicksByPlatform: AnalyticsPoint[];
  viewsByDay: AnalyticsPoint[];
}

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const normalizeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};
const normalizeBoolean = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

const normalizeSocials = (value: unknown): SocialLink[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;
        const platform = normalizeString(raw.platform).toLowerCase();
        const url = normalizeString(raw.url);
        if (!platform || !url) return null;
        return { platform, url };
      })
      .filter((item): item is SocialLink => item !== null);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([platform, url]) => {
        const normalizedUrl = normalizeString(url);
        if (!normalizedUrl) return null;
        return { platform: normalizeString(platform).toLowerCase(), url: normalizedUrl };
      })
      .filter((item): item is SocialLink => item !== null);
  }

  return [];
};

const normalizeProfile = (profile: unknown, username: string): UserProfile => {
  const source = profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : {};
  const rawFont = normalizeString(source.fontFamily).toLowerCase();
  const fontFamily: UserProfile['fontFamily'] = rawFont === 'serif' || rawFont === 'mono' ? rawFont : 'sans';

  return {
    displayName: normalizeString(source.displayName) || username,
    bio: normalizeString(source.bio),
    status: normalizeString(source.status),
    location: normalizeString(source.location),
    avatarUrl: normalizeString(source.avatarUrl),
    backgroundUrl: normalizeString(source.backgroundUrl),
    musicUrl: normalizeString(source.musicUrl),
    cursorUrl: normalizeString(source.cursorUrl),
    songTitle: normalizeString(source.songTitle),
    enterText: normalizeString(source.enterText) || '[ click to enter ]',
    accentColor: normalizeString(source.accentColor) || '#8ea7ff',
    cardOpacity: normalizeNumber(source.cardOpacity, 0.4, 0.2, 0.9),
    blurStrength: normalizeNumber(source.blurStrength, 20, 0, 32),
    showViews: normalizeBoolean(source.showViews, true),
    enableGlow: normalizeBoolean(source.enableGlow, true),
    fontFamily,
    socials: normalizeSocials(source.socials),
    views: typeof source.views === 'number' && Number.isFinite(source.views) ? source.views : 0,
  };
};

const defaultProfile = (username: string): UserProfile => {
  return {
    displayName: username,
    bio: '',
    status: '',
    location: '',
    avatarUrl: '',
    backgroundUrl: '',
    musicUrl: '',
    cursorUrl: '',
    songTitle: '',
    enterText: '[ click to enter ]',
    accentColor: '#8ea7ff',
    cardOpacity: 0.4,
    blurStrength: 20,
    showViews: true,
    enableGlow: true,
    fontFamily: 'sans',
    socials: [],
    views: 0,
  };
};

const profileToPrisma = (profile: UserProfile, usernameForFallback: string) => {
  const normalized = normalizeProfile(profile, usernameForFallback);

  return {
    displayName: normalized.displayName,
    bio: normalized.bio,
    status: normalized.status,
    location: normalized.location,
    avatarUrl: normalized.avatarUrl,
    backgroundUrl: normalized.backgroundUrl,
    musicUrl: normalized.musicUrl,
    cursorUrl: normalized.cursorUrl,
    songTitle: normalized.songTitle,
    enterText: normalized.enterText,
    accentColor: normalized.accentColor,
    cardOpacity: normalized.cardOpacity,
    blurStrength: normalized.blurStrength,
    showViews: normalized.showViews,
    enableGlow: normalized.enableGlow,
    fontFamily: normalized.fontFamily,
    socialsJson: normalized.socials as unknown as Prisma.InputJsonValue,
    views: normalized.views,
  };
};

const profileFromPrisma = (
  profile: {
    displayName: string;
    bio: string;
    status: string;
    location: string;
    avatarUrl: string;
    backgroundUrl: string;
    musicUrl: string;
    cursorUrl: string;
    songTitle: string;
    enterText: string;
    accentColor: string;
    cardOpacity: number;
    blurStrength: number;
    showViews: boolean;
    enableGlow: boolean;
    fontFamily: string;
    socialsJson: Prisma.JsonValue;
    views: number;
  },
  username: string,
): UserProfile => {
  return normalizeProfile(
    {
      displayName: profile.displayName,
      bio: profile.bio,
      status: profile.status,
      location: profile.location,
      avatarUrl: profile.avatarUrl,
      backgroundUrl: profile.backgroundUrl,
      musicUrl: profile.musicUrl,
      cursorUrl: profile.cursorUrl,
      songTitle: profile.songTitle,
      enterText: profile.enterText,
      accentColor: profile.accentColor,
      cardOpacity: Number(profile.cardOpacity),
      blurStrength: Number(profile.blurStrength),
      showViews: !!profile.showViews,
      enableGlow: !!profile.enableGlow,
      fontFamily: profile.fontFamily,
      socials: profile.socialsJson,
      views: Number(profile.views),
    },
    username,
  );
};

const userFromPrisma = (user: {
  username: string;
  email: string;
  passwordHash: string;
  profile: {
    displayName: string;
    bio: string;
    status: string;
    location: string;
    avatarUrl: string;
    backgroundUrl: string;
    musicUrl: string;
    cursorUrl: string;
    songTitle: string;
    enterText: string;
    accentColor: string;
    cardOpacity: number;
    blurStrength: number;
    showViews: boolean;
    enableGlow: boolean;
    fontFamily: string;
    socialsJson: Prisma.JsonValue;
    views: number;
  } | null;
}): User => {
  const username = normalizeString(user.username);

  return {
    username,
    email: normalizeString(user.email).toLowerCase(),
    passwordHash: normalizeString(user.passwordHash),
    profile: user.profile ? profileFromPrisma(user.profile, username) : defaultProfile(username),
  };
};

export const isUniqueViolation = (error: unknown) => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const normalizedUsername = normalizeString(username);
  if (!normalizedUsername) return null;

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    include: { profile: true },
  });

  if (!user) return null;
  return userFromPrisma(user);
};

export const userExistsByUsername = async (username: string): Promise<boolean> => {
  const normalizedUsername = normalizeString(username);
  if (!normalizedUsername) return false;

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    select: { username: true },
  });

  return Boolean(user);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedEmail = normalizeString(email).toLowerCase();
  if (!normalizedEmail) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { profile: true },
  });

  if (!user) return null;
  return userFromPrisma(user);
};

export const getUserByIdentifier = async (identifier: string): Promise<User | null> => {
  const normalizedIdentifier = normalizeString(identifier);
  if (!normalizedIdentifier) return null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: normalizedIdentifier },
        { email: normalizedIdentifier.toLowerCase() },
      ],
    },
    include: { profile: true },
  });

  if (!user) return null;
  return userFromPrisma(user);
};

export const createUser = async (input: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<User> => {
  const username = normalizeString(input.username);
  const email = normalizeString(input.email).toLowerCase();
  const passwordHash = normalizeString(input.passwordHash);
  const profile = defaultProfile(username);
  const profileData = profileToPrisma(profile, username);

  const user = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        profile: {
          create: {
            ...profileData,
          },
        },
      },
      include: { profile: true },
    });
  });

  return userFromPrisma(user);
};

export const updateUserPasswordHash = async (
  username: string,
  passwordHash: string,
): Promise<void> => {
  const normalizedUsername = normalizeString(username);
  const normalizedHash = normalizeString(passwordHash);
  if (!normalizedUsername || !normalizedHash) return;

  await prisma.user.update({
    where: { username: normalizedUsername },
    data: { passwordHash: normalizedHash },
  });
};

export const getUsernameBySession = async (sessionId: string): Promise<string | null> => {
  const normalizedSessionId = normalizeString(sessionId);
  if (!normalizedSessionId) return null;

  const session = await prisma.session.findUnique({
    where: { sessionId: normalizedSessionId },
    select: { username: true },
  });

  return session?.username || null;
};

export const createSession = async (sessionId: string, username: string): Promise<void> => {
  const normalizedSessionId = normalizeString(sessionId);
  const normalizedUsername = normalizeString(username);

  await prisma.session.upsert({
    where: { sessionId: normalizedSessionId },
    update: {
      username: normalizedUsername,
      createdAt: new Date(),
    },
    create: {
      sessionId: normalizedSessionId,
      username: normalizedUsername,
    },
  });
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const normalizedSessionId = normalizeString(sessionId);
  if (!normalizedSessionId) return;

  await prisma.session.deleteMany({
    where: { sessionId: normalizedSessionId },
  });
};

export const getSessionUser = async (sessionId: string): Promise<User | null> => {
  const normalizedSessionId = normalizeString(sessionId);
  if (!normalizedSessionId) return null;

  const session = await prisma.session.findUnique({
    where: { sessionId: normalizedSessionId },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session?.user) return null;
  return userFromPrisma(session.user);
};

export const getProfileByUsername = async (username: string): Promise<UserProfile | null> => {
  const user = await getUserByUsername(username);
  return user?.profile ?? null;
};

export const saveUserProfile = async (username: string, profile: UserProfile): Promise<UserProfile> => {
  const normalizedUsername = normalizeString(username);
  const normalizedProfile = normalizeProfile(profile, normalizedUsername);
  const profileData = profileToPrisma(normalizedProfile, normalizedUsername);

  await prisma.profile.upsert({
    where: { username: normalizedUsername },
    update: {
      ...profileData,
    },
    create: {
      username: normalizedUsername,
      ...profileData,
    },
  });

  return normalizedProfile;
};

export const incrementProfileViews = async (username: string): Promise<void> => {
  const normalizedUsername = normalizeString(username);
  if (!normalizedUsername) return;

  await prisma.profile.updateMany({
    where: { username: normalizedUsername },
    data: {
      views: {
        increment: 1,
      },
    },
  });
};

export const recordProfileViewEvent = async (
  username: string,
  referrerHost?: string | null,
): Promise<void> => {
  const normalizedUsername = normalizeString(username);
  if (!normalizedUsername) return;

  await prisma.profileViewEvent.create({
    data: {
      username: normalizedUsername,
      referrerHost: normalizeString(referrerHost) || null,
    },
  });
};

export const recordSocialClickEvent = async (input: {
  username: string;
  platform: string;
  url: string;
  referrerHost?: string | null;
}): Promise<void> => {
  const username = normalizeString(input.username);
  const platform = normalizeString(input.platform).toLowerCase();
  const url = normalizeString(input.url);
  if (!username || !platform || !url) return;

  await prisma.socialClickEvent.create({
    data: {
      username,
      platform,
      url,
      referrerHost: normalizeString(input.referrerHost) || null,
    },
  });
};

export const getProfileAnalytics = async (username: string): Promise<ProfileAnalytics> => {
  const normalizedUsername = normalizeString(username);
  if (!normalizedUsername) {
    return {
      totalViews: 0,
      totalClicks: 0,
      ctr: 0,
      topReferrers: [],
      clicksByPlatform: [],
      viewsByDay: [],
    };
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setHours(0, 0, 0, 0);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

  const [profile, clickGroups, referrerGroups, recentViews] = await Promise.all([
    prisma.profile.findUnique({
      where: { username: normalizedUsername },
      select: { views: true },
    }),
    prisma.socialClickEvent.groupBy({
      by: ['platform'],
      where: { username: normalizedUsername },
      _count: { _all: true },
    }),
    prisma.profileViewEvent.groupBy({
      by: ['referrerHost'],
      where: { username: normalizedUsername },
      _count: { _all: true },
    }),
    prisma.profileViewEvent.findMany({
      where: {
        username: normalizedUsername,
        createdAt: {
          gte: fourteenDaysAgo,
        },
      },
      select: { createdAt: true },
    }),
  ]);

  const clicksByPlatformMap = new Map<string, number>();
  for (const group of clickGroups) {
    const key = group.platform || 'unknown';
    clicksByPlatformMap.set(key, group._count._all);
  }

  const referrerMap = new Map<string, number>();
  for (const group of referrerGroups) {
    const key = group.referrerHost || 'direct';
    referrerMap.set(key, group._count._all);
  }

  const viewsByDayMap = new Map<string, number>();
  for (let index = 0; index < 14; index += 1) {
    const day = new Date(fourteenDaysAgo);
    day.setDate(fourteenDaysAgo.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    viewsByDayMap.set(key, 0);
  }
  for (const event of recentViews) {
    const key = event.createdAt.toISOString().slice(0, 10);
    if (viewsByDayMap.has(key)) {
      viewsByDayMap.set(key, (viewsByDayMap.get(key) || 0) + 1);
    }
  }

  const totalViews = profile?.views || 0;
  const totalClicks = Array.from(clicksByPlatformMap.values()).reduce((sum, count) => sum + count, 0);

  return {
    totalViews,
    totalClicks,
    ctr: totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0,
    clicksByPlatform: Array.from(clicksByPlatformMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    topReferrers: Array.from(referrerMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    viewsByDay: Array.from(viewsByDayMap.entries()).map(([label, count]) => ({ label, count })),
  };
};
