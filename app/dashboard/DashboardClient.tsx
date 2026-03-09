'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { type Area } from 'react-easy-crop';
import {
  Sparkles,
  LogOut,
  Loader2,
  Copy,
  ExternalLink,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Link as LinkIcon,
  Image as ImageIcon,
  Music,
  MousePointer2,
  Send,
  Github,
  Instagram,
  Youtube,
  Twitch,
  Linkedin,
  Facebook,
  Globe,
  Disc3,
  User,
  BadgeCheck,
  GripVertical,
  BarChart3,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import type { ProfileAnalytics, SocialLink, UserProfile } from '@/lib/db';
import { useLiteMode } from '@/lib/use-lite-mode';
import { AnalyticsOverview } from './dashboard-analytics';
import {
  AvatarCropModal,
  ConfirmDialog,
  BackgroundCropModal,
  Input,
  MediaCard,
  Panel,
  RangeRow,
  TabButton,
  Toggle,
} from './dashboard-ui';

type Section = 'overview' | 'media' | 'profile' | 'appearance' | 'links';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ProfileForm {
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
}

interface SocialFormItem {
  id: string;
  platform: string;
  customPlatform: string;
  url: string;
}

interface DashboardClientProps {
  initialUsername: string;
  initialProfile: UserProfile;
  initialAnalytics: ProfileAnalytics;
  publicProfileUrl: string;
}

const SOCIAL_PRESETS = [
  'github',
  'telegram',
  'instagram',
  'youtube',
  'discord',
  'twitch',
  'linkedin',
  'facebook',
  'x',
  'website',
  'steam',
  'tiktok',
  'spotify',
  'custom',
];

const SOCIAL_ICON_MAP: Record<string, React.ReactNode> = {
  github: <Github size={18} />,
  telegram: <Send size={18} />,
  instagram: <Instagram size={18} />,
  youtube: <Youtube size={18} />,
  discord: <Disc3 size={18} />,
  twitch: <Twitch size={18} />,
  linkedin: <Linkedin size={18} />,
  facebook: <Facebook size={18} />,
  website: <Globe size={18} />,
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const withAlpha = (hex: string, alpha: number) => {
  const raw = hex.replace('#', '').trim();
  if (!/^[\da-fA-F]{6}$/.test(raw)) return `rgba(142, 167, 255, ${alpha})`;

  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const fileNameToTrackTitle = (fileName: string) => {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  return withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const CURSOR_MAX_SIDE = 64;
const CURSOR_TARGET_TYPE = 'image/png';
const AVATAR_TARGET_SIZE = 720;
const BACKGROUND_TARGET_WIDTH = 1600;
const BACKGROUND_TARGET_HEIGHT = 900;
const AUTO_SAVE_DELAY_MS = 800;

const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, type, quality);
  });

const replaceExt = (name: string, ext: string) => {
  return name.replace(/\.[^/.]+$/, '') + ext;
};

const getCenteredAspectCrop = (croppedAreaPixels: Area, aspect: number) => {
  const width = Math.max(1, croppedAreaPixels.width);
  const height = Math.max(1, croppedAreaPixels.height);
  const currentAspect = width / height;

  if (Math.abs(currentAspect - aspect) < 0.001) {
    return {
      x: croppedAreaPixels.x,
      y: croppedAreaPixels.y,
      width,
      height,
    };
  }

  if (currentAspect > aspect) {
    const targetWidth = Math.max(1, Math.round(height * aspect));
    return {
      x: croppedAreaPixels.x + Math.round((width - targetWidth) / 2),
      y: croppedAreaPixels.y,
      width: targetWidth,
      height,
    };
  }

  const targetHeight = Math.max(1, Math.round(width / aspect));
  return {
    x: croppedAreaPixels.x,
    y: croppedAreaPixels.y + Math.round((height - targetHeight) / 2),
    width,
    height: targetHeight,
  };
};

const resizeImageFileToMaxSide = async (
  file: File,
  maxSide: number,
  targetType: string,
  quality = 0.92,
) => {
  if (!file.type.startsWith('image/')) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(objectUrl);
    const sourceMax = Math.max(image.width, image.height);
    const scale = Math.min(1, maxSide / sourceMax);
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    if (scale === 1 && file.size <= 200 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context missing');
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas, targetType, quality);
    const ext = targetType === 'image/png' ? '.png' : '.jpg';
    return new File([blob], replaceExt(file.name || 'cursor', ext), {
      type: targetType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const createAvatarCropFile = async (
  sourceUrl: string,
  croppedAreaPixels: Area,
  fileName: string,
  mimeType: string,
) => {
  const image = await loadImageFromUrl(sourceUrl);
  const sourceCrop = getCenteredAspectCrop(croppedAreaPixels, 1);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_TARGET_SIZE;
  canvas.height = AVATAR_TARGET_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context missing');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    sourceCrop.x,
    sourceCrop.y,
    sourceCrop.width,
    sourceCrop.height,
    0,
    0,
    AVATAR_TARGET_SIZE,
    AVATAR_TARGET_SIZE,
  );

  const outputType = /image\/(png|webp)/i.test(mimeType) ? mimeType : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType, 0.92);
  const ext = outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
  return new File([blob], replaceExt(fileName || 'avatar', ext), {
    type: outputType,
    lastModified: Date.now(),
  });
};

const createBackgroundCropFile = async (
  sourceUrl: string,
  croppedAreaPixels: Area,
  fileName: string,
  mimeType: string,
) => {
  const image = await loadImageFromUrl(sourceUrl);
  const sourceCrop = getCenteredAspectCrop(croppedAreaPixels, 16 / 9);
  const canvas = document.createElement('canvas');
  canvas.width = BACKGROUND_TARGET_WIDTH;
  canvas.height = BACKGROUND_TARGET_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context missing');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    sourceCrop.x,
    sourceCrop.y,
    sourceCrop.width,
    sourceCrop.height,
    0,
    0,
    BACKGROUND_TARGET_WIDTH,
    BACKGROUND_TARGET_HEIGHT,
  );

  const outputType = /image\/(png|webp)/i.test(mimeType) ? mimeType : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType, 0.92);
  const ext = outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
  return new File([blob], replaceExt(fileName || 'background', ext), {
    type: outputType,
    lastModified: Date.now(),
  });
};

const normalizeSocialsInput = (value: unknown): SocialLink[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;
        const platform = typeof raw.platform === 'string' ? raw.platform.trim().toLowerCase() : '';
        const url = typeof raw.url === 'string' ? raw.url.trim() : '';
        if (!platform || !url) return null;
        return { platform, url };
      })
      .filter((item): item is SocialLink => item !== null);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([platform, url]) => {
        if (typeof url !== 'string' || !url.trim()) return null;
        return { platform: platform.trim().toLowerCase(), url: url.trim() };
      })
      .filter((item): item is SocialLink => item !== null);
  }

  return [];
};

const toSocialFormItems = (socials: unknown): SocialFormItem[] => {
  return normalizeSocialsInput(socials).map((item) => {
    const known = SOCIAL_PRESETS.includes(item.platform);
    return {
      id: makeId(),
      platform: known ? item.platform : 'custom',
      customPlatform: known ? '' : item.platform,
      url: item.url,
    };
  });
};

const toProfileForm = (profile: Partial<UserProfile> | undefined): ProfileForm => {
  const source = profile || {};
  const rawFont = source.fontFamily;
  return {
    displayName: source.displayName || '',
    bio: source.bio || '',
    status: source.status || '',
    location: source.location || '',
    avatarUrl: source.avatarUrl || '',
    backgroundUrl: source.backgroundUrl || '',
    musicUrl: source.musicUrl || '',
    cursorUrl: source.cursorUrl || '',
    songTitle: source.songTitle || '',
    enterText: source.enterText || '[ click to enter ]',
    accentColor: source.accentColor || '#8ea7ff',
    cardOpacity: clamp(typeof source.cardOpacity === 'number' ? source.cardOpacity : 0.4, 0.2, 0.9),
    blurStrength: clamp(typeof source.blurStrength === 'number' ? source.blurStrength : 20, 0, 32),
    showViews: typeof source.showViews === 'boolean' ? source.showViews : true,
    enableGlow: typeof source.enableGlow === 'boolean' ? source.enableGlow : true,
    fontFamily: rawFont === 'mono' || rawFont === 'serif' ? rawFont : 'sans',
    socials: normalizeSocialsInput(source.socials),
  };
};

const buildSocialPayload = (items: SocialFormItem[]): SocialLink[] => {
  return items
    .map((item) => {
      const platform = (item.platform === 'custom' ? item.customPlatform : item.platform).trim().toLowerCase();
      const url = item.url.trim();
      if (!platform || !url) return null;
      return { platform, url };
    })
    .filter((item): item is SocialLink => item !== null);
};

const buildProfilePayload = (nextFormData: ProfileForm, items: SocialFormItem[]) => {
  return {
    ...nextFormData,
    cardOpacity: clamp(nextFormData.cardOpacity, 0.2, 0.9),
    blurStrength: clamp(nextFormData.blurStrength, 0, 32),
    socials: buildSocialPayload(items),
  };
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = items.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

interface AvatarCropState {
  open: boolean;
  src: string;
  fileName: string;
  mimeType: string;
  objectFit: 'horizontal-cover' | 'vertical-cover' | 'cover';
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: Area | null;
}

interface BackgroundCropState {
  open: boolean;
  src: string;
  fileName: string;
  mimeType: string;
  objectFit: 'horizontal-cover' | 'vertical-cover' | 'cover';
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: Area | null;
}

export default function DashboardClient({
  initialUsername,
  initialProfile,
  initialAnalytics,
  publicProfileUrl,
}: DashboardClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const liteMode = useLiteMode();
  const sectionTransition = liteMode
    ? { duration: 0.01 }
    : { duration: 0.16, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
  const sectionOffset = liteMode ? 0 : 6;

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [copied, setCopied] = useState(false);
  const [section, setSection] = useState<Section>('overview');
  const [analytics] = useState<ProfileAnalytics>(initialAnalytics);
  const [draggedSocialId, setDraggedSocialId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resettingProfile, setResettingProfile] = useState(false);
  const sectionTopRef = useRef<HTMLDivElement | null>(null);
  const didMountSectionRef = useRef(false);
  const bioFieldId = useId();
  const accentColorLabelId = useId();
  const fontFamilyId = useId();

  const user = useMemo(() => ({ username: initialUsername }), [initialUsername]);
  const [formData, setFormData] = useState<ProfileForm>(() => toProfileForm(initialProfile));
  const [socialItems, setSocialItems] = useState<SocialFormItem[]>(() =>
    toSocialFormItems(initialProfile?.socials),
  );
  const autosaveEnabledRef = useRef(false);
  const lastSavedPayloadRef = useRef(
    JSON.stringify(buildProfilePayload(toProfileForm(initialProfile), toSocialFormItems(initialProfile?.socials))),
  );
  const [avatarCrop, setAvatarCrop] = useState<AvatarCropState>({
    open: false,
    src: '',
    fileName: '',
    mimeType: 'image/jpeg',
    objectFit: 'cover',
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
  });
  const avatarCropResolver = useRef<((file: File | null) => void) | null>(null);
  const [backgroundCrop, setBackgroundCrop] = useState<BackgroundCropState>({
    open: false,
    src: '',
    fileName: '',
    mimeType: 'image/jpeg',
    objectFit: 'cover',
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
  });
  const backgroundCropResolver = useRef<((file: File | null) => void) | null>(null);

  const profileUrl = publicProfileUrl;

  const resolveAvatarCrop = useCallback((file: File | null) => {
    if (avatarCropResolver.current) {
      avatarCropResolver.current(file);
      avatarCropResolver.current = null;
    }

    if (avatarCrop.src) {
      URL.revokeObjectURL(avatarCrop.src);
    }

    setAvatarCrop({
      open: false,
      src: '',
      fileName: '',
      mimeType: 'image/jpeg',
      objectFit: 'cover',
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
    });
  }, [avatarCrop.src]);

  const requestAvatarCrop = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      pushToast({ title: 'Avatar must be an image', variant: 'error' });
      return Promise.resolve<File | null>(null);
    }

    const src = URL.createObjectURL(file);

    return new Promise<File | null>((resolve) => {
      avatarCropResolver.current = resolve;
      setAvatarCrop({
        open: true,
        src,
        fileName: file.name || 'avatar.jpg',
        mimeType: file.type || 'image/jpeg',
        objectFit: 'cover',
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
      });
    });
  }, [pushToast]);

  const handleConfirmAvatarCrop = useCallback(async () => {
    if (!avatarCrop.croppedAreaPixels || !avatarCrop.src) {
      resolveAvatarCrop(null);
      return;
    }

    try {
      const croppedFile = await createAvatarCropFile(
        avatarCrop.src,
        avatarCrop.croppedAreaPixels,
        avatarCrop.fileName,
        avatarCrop.mimeType,
      );
      resolveAvatarCrop(croppedFile);
    } catch {
      pushToast({ title: 'Failed to crop avatar', variant: 'error' });
      resolveAvatarCrop(null);
    }
  }, [avatarCrop, pushToast, resolveAvatarCrop]);

  const resolveBackgroundCrop = useCallback((file: File | null) => {
    if (backgroundCropResolver.current) {
      backgroundCropResolver.current(file);
      backgroundCropResolver.current = null;
    }

    if (backgroundCrop.src) {
      URL.revokeObjectURL(backgroundCrop.src);
    }

    setBackgroundCrop({
      open: false,
      src: '',
      fileName: '',
      mimeType: 'image/jpeg',
      objectFit: 'cover',
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
    });
  }, [backgroundCrop.src]);

  const requestBackgroundCrop = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      pushToast({ title: 'Background must be an image', variant: 'error' });
      return null;
    }

    const src = URL.createObjectURL(file);

    return new Promise<File | null>((resolve) => {
      backgroundCropResolver.current = resolve;
      setBackgroundCrop({
        open: true,
        src,
        fileName: file.name || 'background.jpg',
        mimeType: file.type || 'image/jpeg',
        objectFit: 'cover',
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
      });
    });
  }, [pushToast]);

  const handleConfirmBackgroundCrop = useCallback(async () => {
    if (!backgroundCrop.croppedAreaPixels || !backgroundCrop.src) {
      resolveBackgroundCrop(null);
      return;
    }

    try {
      const croppedFile = await createBackgroundCropFile(
        backgroundCrop.src,
        backgroundCrop.croppedAreaPixels,
        backgroundCrop.fileName,
        backgroundCrop.mimeType,
      );
      resolveBackgroundCrop(croppedFile);
    } catch {
      pushToast({ title: 'Failed to crop background', variant: 'error' });
      resolveBackgroundCrop(null);
    }
  }, [backgroundCrop, pushToast, resolveBackgroundCrop]);

  const transformCursorFile = useCallback(async (file: File) => {
    const isCur = /\.cur$/i.test(file.name);
    if (isCur) {
      if (file.size > 512 * 1024) {
        pushToast({
          title: 'Cursor file is too large',
          description: 'Keep .cur files under 512KB.',
          variant: 'error',
        });
        return null;
      }
      return file;
    }

    if (!file.type.startsWith('image/')) return file;

    const resized = await resizeImageFileToMaxSide(
      file,
      CURSOR_MAX_SIDE,
      CURSOR_TARGET_TYPE,
    );

    return resized;
  }, [pushToast]);

  const persistProfile = useCallback(
    async (
      nextFormData: ProfileForm,
      nextSocialItems: SocialFormItem[] = socialItems,
      opts?: { notifyOnError?: boolean; silent?: boolean },
    ) => {
      setSaveState('saving');
      try {
        const payload = buildProfilePayload(nextFormData, nextSocialItems);

        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Save failed');
        setFormData((prev) => ({ ...prev, socials: payload.socials }));
        lastSavedPayloadRef.current = JSON.stringify(payload);
        setSaveState('saved');
        if (!opts?.silent) {
          pushToast({ title: 'Changes saved', variant: 'success' });
        }
        return true;
      } catch {
        if (opts?.notifyOnError ?? true) {
          pushToast({ title: 'Failed to save changes', variant: 'error' });
        }
        setSaveState('error');
        return false;
      }
    },
    [pushToast, socialItems],
  );

  const updateMediaField = useCallback(
    (patch: Partial<ProfileForm>) => {
      setFormData((prev) => {
        const next = { ...prev, ...patch };
        void persistProfile(next, socialItems, { notifyOnError: true, silent: true });
        return next;
      });
    },
    [persistProfile, socialItems],
  );

  const handleSave = async () => {
    await persistProfile(formData, socialItems);
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.replace('/');
  };

  const handleCopy = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      pushToast({ title: 'Profile URL copied', variant: 'success' });
    } catch {
      pushToast({ title: 'Copy failed', variant: 'error' });
    }
  };

  const resetLook = () => {
    setResetConfirmOpen(true);
  };

  const confirmResetProfile = async () => {
    setResettingProfile(true);
    const nextFormData = toProfileForm(undefined);
    const nextSocialItems: SocialFormItem[] = [];
    const saved = await persistProfile(nextFormData, nextSocialItems, { silent: true });

    if (saved) {
      setFormData(nextFormData);
      setSocialItems(nextSocialItems);
      setSection('overview');
      setResetConfirmOpen(false);
      pushToast({
        title: 'Profile reset',
        description: 'Media, links, text and styling were cleared.',
        variant: 'success',
      });
    }

    setResettingProfile(false);
  };

  const addSocial = (platform: string) => {
    const key = platform.toLowerCase();
    setSocialItems((prev) => [...prev, { id: makeId(), platform: key, customPlatform: '', url: '' }]);
    setSection('links');
  };

  const updateSocial = (id: string, patch: Partial<SocialFormItem>) => {
    setSocialItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeSocial = (id: string) => {
    setSocialItems((prev) => prev.filter((item) => item.id !== id));
  };

  const moveSocial = useCallback((fromId: string, toId: string) => {
    setSocialItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === toId);
      return moveItem(prev, fromIndex, toIndex);
    });
  }, []);

  const nudgeSocial = useCallback((id: string, direction: 'up' | 'down') => {
    setSocialItems((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === id);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      return moveItem(prev, currentIndex, targetIndex);
    });
  }, []);

  useEffect(() => {
    if (!autosaveEnabledRef.current) {
      autosaveEnabledRef.current = true;
      return;
    }

    if (saveState === 'saving') {
      return;
    }

    const payload = buildProfilePayload(formData, socialItems);
    const serialized = JSON.stringify(payload);

    if (serialized === lastSavedPayloadRef.current) {
      if (saveState === 'saved') {
        const idleTimer = window.setTimeout(() => setSaveState('idle'), 1200);
        return () => window.clearTimeout(idleTimer);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistProfile(formData, socialItems, { notifyOnError: true, silent: true });
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [formData, persistProfile, saveState, socialItems]);
  const accentColor = formData.accentColor || '#8ea7ff';
  const dashboardTheme = useMemo(
    () =>
      ({
        '--accent': accentColor,
        '--accent-soft': withAlpha(accentColor, 0.14),
        '--accent-border': withAlpha(accentColor, 0.52),
        '--accent-glow': withAlpha(accentColor, 0.28),
        '--accent-shadow': withAlpha(accentColor, 0.38),
      }) as React.CSSProperties,
    [accentColor],
  );
  const hasBio = formData.bio.trim().length > 0;
  const hasLinks = socialItems.some((item) => item.url.trim().length > 0);
  const hasSong = formData.musicUrl.trim().length > 0;
  const publishedLinksCount = socialItems.filter((item) => item.url.trim().length > 0).length;
  const quickColors = ['#8ea7ff', '#60a5fa', '#34d399', '#f59e0b', '#f97316'];
  const checklistItems = [
    { label: 'Display name', done: formData.displayName.trim().length > 0 },
    { label: 'Avatar', done: formData.avatarUrl.trim().length > 0 },
    { label: 'Background', done: formData.backgroundUrl.trim().length > 0 },
    { label: 'Bio', done: hasBio },
    { label: 'Link', done: hasLinks },
  ];
  const completedChecklistCount = checklistItems.filter((item) => item.done).length;
  const completionPercent = Math.round((completedChecklistCount / checklistItems.length) * 100);
  const completionLabel =
    completionPercent >= 80 ? 'Ready to share' : completionPercent >= 50 ? 'Almost there' : 'Needs setup';
  const overviewItems = [
    {
      label: 'Media',
      value: [formData.avatarUrl, formData.backgroundUrl, formData.musicUrl, formData.cursorUrl].filter((item) => item.trim().length > 0).length,
      hint: 'avatar, background, music, cursor',
    },
    {
      label: 'Profile',
      value: [formData.displayName, formData.status, formData.location, formData.bio].filter((item) => item.trim().length > 0).length,
      hint: 'name, status, location, bio',
    },
    {
      label: 'Appearance',
      value: [formData.accentColor, formData.enterText, formData.fontFamily].filter((item) => item.trim().length > 0).length,
      hint: 'accent, enter text, font',
    },
    {
      label: 'Links',
      value: publishedLinksCount,
      hint: 'published social links',
    },
  ];
  const sectionItems = [
    { id: 'overview' as Section, label: 'Overview', mobileLabel: 'Overview', icon: BarChart3 },
    { id: 'media' as Section, label: 'Media', mobileLabel: 'Media', icon: ImageIcon },
    { id: 'profile' as Section, label: 'Profile', mobileLabel: 'Profile', icon: User },
    { id: 'appearance' as Section, label: 'Appearance', mobileLabel: 'Style', icon: Sparkles },
    { id: 'links' as Section, label: 'Links', mobileLabel: 'Links', icon: LinkIcon },
  ];
  const activeSection = sectionItems.find((item) => item.id === section) || sectionItems[0];
  const saveStateLabel =
    saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : 'Draft';
  const saveStateBadgeClass =
    saveState === 'saving'
      ? 'border-sky-400/35 bg-sky-500/10 text-sky-100'
      : saveState === 'saved'
         ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
         : saveState === 'error'
           ? 'border-red-400/35 bg-red-500/10 text-red-100'
           : 'border-white/10 bg-white/[0.04] text-neutral-300';

  useEffect(() => {
    if (!didMountSectionRef.current) {
      didMountSectionRef.current = true;
      return;
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      sectionTopRef.current?.scrollIntoView({ behavior: liteMode ? 'auto' : 'smooth', block: 'start' });
    }
  }, [liteMode, section]);

  return (
    <div
      style={dashboardTheme}
      className="min-h-screen bg-[radial-gradient(circle_at_8%_-12%,rgba(112,130,255,0.2),transparent_36%),radial-gradient(circle_at_92%_5%,rgba(87,173,255,0.16),transparent_35%),linear-gradient(180deg,#0a111d_0%,#090f19_100%)] text-white lg:h-screen lg:overflow-hidden"
    >
      <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row">
        <aside className="hidden w-full flex-col border-b border-white/5 bg-[#0f1625]/92 p-4 shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.05),0_30px_55px_rgba(0,0,0,0.42)]">
          <Link href="/" className="mb-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-3 transition-all duration-200 hover:bg-white/[0.07] hover:-translate-y-0.5">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(95,168,255,0.22)]">
              <NextImage
                src="/icon.svg"
                alt="LinkSky"
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[14px] uppercase tracking-[0.22em] text-neutral-200">LinkSky editor</p>
            </div>
          </Link>

          <div className="mb-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,36,0.88),rgba(12,17,29,0.88))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Profile completion</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-white">{completionPercent}%</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-neutral-300">
                {completionLabel}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">Fill the basics first: avatar, background, bio and at least one link.</p>
          </div>

          <div className="space-y-2">
            {sectionItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabButton
                  key={item.id}
                  label={item.label}
                  icon={<Icon size={16} />}
                  active={section === item.id}
                  onClick={() => setSection(item.id)}
                />
              );
            })}
          </div>

          <div className="mt-auto space-y-4 pt-5">
            <div className="flex items-center gap-3 rounded-[24px] bg-white/[0.045] p-3.5 shadow-[0_14px_32px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-white/[0.065] hover:-translate-y-0.5">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-neutral-700 ring-1 ring-[#334155]">
                {formData.avatarUrl ? (
                  <NextImage
                    src={formData.avatarUrl}
                    alt="avatar"
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/75">
                    {(formData.displayName || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{formData.displayName || user.username}</p>
                <p className="truncate text-xs text-neutral-400">{profileUrl}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Checklist</p>
              <div className="mt-3 space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="text-neutral-200">{item.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${item.done ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[0.05] text-neutral-400'}`}>
                      {item.done ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 bg-[#0b111c] pb-24 lg:h-screen lg:overflow-y-auto lg:pb-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(134,153,255,0.08),transparent_35%)]" />
          <div className="sticky top-0 z-30 border-b border-white/8 bg-[#0b111c]/92 backdrop-blur-2xl lg:hidden">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href="/" className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(95,168,255,0.22)]">
                    <NextImage
                      src="/icon.svg"
                      alt="LinkSky"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] uppercase tracking-[0.22em] text-neutral-400">LinkSky editor</p>
                    <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-neutral-200 transition-all duration-200 hover:bg-white/[0.08]"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>

              <div className="mt-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,36,0.92),rgba(12,17,29,0.92))] p-3 shadow-[0_16px_32px_rgba(0,0,0,0.24)]">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-neutral-700 ring-1 ring-[#334155]">
                    {formData.avatarUrl ? (
                      <NextImage
                        src={formData.avatarUrl}
                        alt="avatar"
                        fill
                        sizes="44px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/75">
                        {(formData.displayName || user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{formData.displayName || user.username}</p>
                    <p className="truncate text-xs text-neutral-400">@{user.username} · {activeSection.label}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-neutral-200">
                      {completionPercent}%
                    </div>
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${saveStateBadgeClass}`}>
                      {saveState === 'saving' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      {saveStateLabel}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                    {completionLabel}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open profile"
                    title="Open profile"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#334155] bg-[#111827]/80 text-neutral-100 transition-all duration-200 hover:border-[#46556d] hover:bg-[#1a2436]"
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    onClick={handleCopy}
                    aria-label={copied ? 'Copied profile URL' : 'Copy profile URL'}
                    title={copied ? 'Copied profile URL' : 'Copy profile URL'}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#334155] bg-[#111827]/80 text-neutral-100 transition-all duration-200 hover:border-[#46556d] hover:bg-[#1a2436]"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                    aria-label="Save changes"
                    title="Save changes"
                    className="inline-flex h-11 items-center justify-center rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 [background:var(--accent)] [box-shadow:0_10px_28px_var(--accent-shadow)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveState === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  </button>
                  <button
                    onClick={resetLook}
                    aria-label="Reset profile"
                    title="Reset profile"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 transition-all duration-200 hover:bg-red-500/16"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <header className="relative hidden overflow-hidden border-b border-white/5 p-4 md:p-5 lg:sticky lg:top-0 lg:z-30 lg:block">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0,rgba(142,167,255,0.2),transparent_42%),linear-gradient(120deg,rgba(17,24,39,0.92),rgba(11,15,23,0.9))]" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Studio</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{user.username}</h1>
                <p className="mt-2 text-sm leading-6 text-neutral-400 md:text-base">
                  Update the essentials, keep the public page readable, and publish faster.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-neutral-300">
                  <BarChart3 size={13} className="text-[var(--accent)]" />
                  {analytics.totalViews} views
                  <span className="text-white/20">/</span>
                  {analytics.totalClicks} clicks
                  <span className="text-white/20">/</span>
                  {analytics.ctr}% CTR
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#111827]/80 px-3.5 py-2.5 text-sm text-neutral-100 transition-all duration-200 hover:border-[#46556d] hover:bg-[#1a2436]"
                >
                  <ExternalLink size={15} />
                  Open profile
                </a>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#111827]/80 px-3.5 py-2.5 text-sm text-neutral-100 transition-all duration-200 hover:border-[#46556d] hover:bg-[#1a2436]"
                >
                  <Copy size={15} />
                  {copied ? 'Copied' : 'Copy URL'}
                </button>
                <button
                  onClick={resetLook}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/45 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200 transition-all duration-200 hover:bg-red-500/16"
                >
                  <RotateCcw size={15} />
                  Reset profile
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 [background:var(--accent)] [box-shadow:0_10px_28px_var(--accent-shadow)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveState === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Save now
                </button>
                <button
                  onClick={handleLogout}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-transparent px-3.5 py-2.5 text-sm text-neutral-200 transition-all duration-200 hover:bg-[#141c2b] sm:col-span-1"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          </header>
          <section ref={sectionTopRef} className="scroll-mt-52 space-y-4 p-4 pb-6 md:p-5 lg:scroll-mt-24 lg:pb-5">
            <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-4 ${section === 'overview' ? '' : 'hidden lg:grid'}`}>
              <QuickStatCard label="Completion" value={`${completionPercent}%`} hint={completionLabel} icon={<Sparkles size={15} />} />
              <QuickStatCard label="Views" value={analytics.totalViews.toString()} hint="All time" icon={<BarChart3 size={15} />} />
              <QuickStatCard label="Clicks" value={analytics.totalClicks.toString()} hint={`${analytics.ctr}% CTR`} icon={<Activity size={15} />} />
              <QuickStatCard label="Links ready" value={publishedLinksCount.toString()} hint={publishedLinksCount ? 'Ready to share' : 'Add your first link'} icon={<LinkIcon size={15} />} />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {section !== 'links' ? (
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: sectionOffset }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -sectionOffset }}
                  transition={sectionTransition}
                  className="space-y-4"
                >
                  {section === 'overview' && (
                    <Panel title="Overview" description="A simple summary of what is ready and what still needs attention.">
                      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                        {overviewItems.map((item) => (
                          <div key={item.label} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3.5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">{item.label}</p>
                            <p className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">{item.value}</p>
                            <p className="mt-1 text-xs leading-5 text-neutral-400">{item.hint}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Profile status</p>
                          <p className="mt-2 text-base font-semibold text-white md:text-lg">{completionLabel}</p>
                          <p className="mt-1 text-xs leading-5 text-neutral-400">Minimal, shareable profile setup.</p>
                        </div>
                        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Audio</p>
                          <p className="mt-2 text-base font-semibold text-white md:text-lg">{hasSong ? (formData.songTitle || 'Track uploaded') : 'No audio yet'}</p>
                          <p className="mt-1 text-xs leading-5 text-neutral-400">Optional background music for the public page.</p>
                        </div>
                        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Links</p>
                          <p className="mt-2 text-base font-semibold text-white md:text-lg">{publishedLinksCount ? `${publishedLinksCount} ready` : 'No links yet'}</p>
                          <p className="mt-1 text-xs leading-5 text-neutral-400">People need at least one clear place to click.</p>
                        </div>
                      </div>
                    </Panel>
                  )}

                  {section === 'media' && (
                    <Panel title="Media" description="Upload the pieces users notice first. Media saves immediately after upload.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                      <MediaCard
                        label="Background"
                        kind="background"
                        value={formData.backgroundUrl}
                        accept="image/*"
                        onChange={(v) => updateMediaField({ backgroundUrl: v })}
                        transformFile={requestBackgroundCrop}
                        hint='16:9 crop for images'
                        icon={<ImageIcon size={15} />}
                      />
                      <MediaCard
                        label="Audio"
                        kind="audio"
                        value={formData.musicUrl}
                        accept="audio/*"
                        onChange={(v) => updateMediaField({ musicUrl: v })}
                        onUploaded={({ fileName }) => {
                          const autoTitle = fileNameToTrackTitle(fileName);
                          if (!autoTitle) return;
                          updateMediaField({ songTitle: autoTitle });
                        }}
                        hint='Your favorite song'
                        icon={<Music size={15} />}
                      />
                      <MediaCard
                        label="Avatar"
                        kind="avatar"
                        value={formData.avatarUrl}
                        accept="image/*"
                        onChange={(v) => updateMediaField({ avatarUrl: v })}
                        transformFile={requestAvatarCrop}
                        hint="Square avatar"
                        icon={<User size={15} />}
                      />
                      <MediaCard
                        label="Cursor"
                        kind="cursor"
                        value={formData.cursorUrl}
                        accept="image/*,.cur"
                        onChange={(v) => updateMediaField({ cursorUrl: v })}
                        transformFile={transformCursorFile}
                        hint="Auto-optimized to 64x64"
                        icon={<MousePointer2 size={15} />}
                      />
                    </div>
                    </Panel>
                  )}

                  {section === 'overview' && (
                    <Panel title="Analytics snapshot" description="Recent performance for the current public profile.">
                      <AnalyticsOverview analytics={analytics} />
                    </Panel>
                  )}

                  {section === 'profile' && (
                    <Panel title="Profile details" description="Keep the first screen short, recognizable and readable.">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Input label="Display name" value={formData.displayName} onChange={(v) => setFormData((p) => ({ ...p, displayName: v }))} placeholder="username" />
                      <Input label="Location" value={formData.location} onChange={(v) => setFormData((p) => ({ ...p, location: v }))} placeholder="Kyiv" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#2a3447] bg-[#0b1220]/75 p-4 md:p-5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 mb-3">Now playing</p>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Input label="Status" value={formData.status} onChange={(v) => setFormData((p) => ({ ...p, status: v }))} placeholder="Online" icon={<BadgeCheck size={14} />} />
                        <Input label="Song title" value={formData.songTitle} onChange={(v) => setFormData((p) => ({ ...p, songTitle: v }))} placeholder="Artist - Track" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label htmlFor={bioFieldId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Bio</label>
                      <textarea
                        id={bioFieldId}
                        value={formData.bio}
                        onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                        rows={4}
                        className="w-full rounded-2xl bg-[#0b1220] border border-[#273247] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]"
                        placeholder="Tell people who you are"
                      />
                    </div>
                    </Panel>
                  )}

                  {section === 'appearance' && (
                    <Panel title="Look & behavior" description="Tune the accent, entry copy and visibility without overcomplicating the page.">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label id={accentColorLabelId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Accent color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={formData.accentColor}
                            onChange={(e) => setFormData((p) => ({ ...p, accentColor: e.target.value }))}
                            aria-labelledby={accentColorLabelId}
                            aria-label="Accent color picker"
                            className="h-11 w-12 rounded-xl bg-transparent border border-[#2e3a50]"
                          />
                          <input
                            value={formData.accentColor}
                            onChange={(e) => setFormData((p) => ({ ...p, accentColor: e.target.value }))}
                            aria-labelledby={accentColorLabelId}
                            aria-label="Accent color hex value"
                            placeholder="#8ea7ff"
                            className="flex-1 rounded-2xl bg-[#0b1220] border border-[#273247] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]"
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {quickColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, accentColor: color }))}
                              aria-label={`Set accent color ${color}`}
                              className={`h-8 w-8 rounded-full border transition-transform hover:scale-105 ${
                                formData.accentColor.toLowerCase() === color.toLowerCase()
                                  ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.12)]'
                                  : 'border-white/10'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <Input label="Enter text" value={formData.enterText} onChange={(v) => setFormData((p) => ({ ...p, enterText: v }))} placeholder="[ click to enter ]" />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <RangeRow label="Card opacity" value={formData.cardOpacity} min={0.2} max={0.9} step={0.05} onChange={(v) => setFormData((p) => ({ ...p, cardOpacity: v }))} />
                      <RangeRow label="Blur strength" value={formData.blurStrength} min={0} max={32} step={1} onChange={(v) => setFormData((p) => ({ ...p, blurStrength: v }))} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Toggle label="Show views" value={formData.showViews} onToggle={(v) => setFormData((p) => ({ ...p, showViews: v }))} icon={formData.showViews ? <Eye size={14} /> : <EyeOff size={14} />} />
                      <Toggle label="Glow" value={formData.enableGlow} onToggle={(v) => setFormData((p) => ({ ...p, enableGlow: v }))} icon={<Sparkles size={14} />} />
                      <div>
                        <label htmlFor={fontFamilyId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Font</label>
                        <select
                          id={fontFamilyId}
                          value={formData.fontFamily}
                          onChange={(e) => setFormData((p) => ({ ...p, fontFamily: e.target.value as ProfileForm['fontFamily'] }))}
                          className="w-full rounded-2xl bg-[#0b1220] border border-[#273247] px-3.5 py-2.5 text-sm text-neutral-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]"
                        >
                          <option value="sans">Sans</option>
                          <option value="serif">Serif</option>
                          <option value="mono">Mono</option>
                        </select>
                      </div>
                    </div>
                    </Panel>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="links"
                  initial={{ opacity: 0, y: sectionOffset }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -sectionOffset }}
                  transition={sectionTransition}
                  className="space-y-4"
                >
                  <Panel title="Add social links" description="Start with the platforms people already expect to find.">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
                      {SOCIAL_PRESETS.map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => addSocial(platform)}
                          aria-label={`Add ${platform} link`}
                          className="flex h-14 items-center justify-center rounded-xl border border-[#2b3548] bg-[#0f1728]/70 transition-all duration-200 hover:border-[#3b4a62] hover:bg-[#1c263a]"
                          title={platform}
                        >
                          {SOCIAL_ICON_MAP[platform] || <span className="text-xs uppercase text-neutral-300">{platform.slice(0, 2)}</span>}
                        </button>
                      ))}
                    </div>
                  </Panel>

                  <Panel
                    title="Your links"
                    description="Use arrows on mobile or drag on desktop. Links without a URL will not be shown publicly."
                    actions={
                      <button type="button" onClick={() => addSocial('custom')} className="inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#111827]/80 px-3.5 py-2 text-sm hover:bg-[#1a2436] transition-all duration-200">
                        <Plus size={15} />
                        Add custom
                      </button>
                    }
                  >

                    {!socialItems.length && <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-neutral-400">No links yet.</p>}

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {socialItems.map((item, index) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDraggedSocialId(item.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedSocialId && draggedSocialId !== item.id) {
                              moveSocial(draggedSocialId, item.id);
                            }
                            setDraggedSocialId(null);
                          }}
                          onDragEnd={() => setDraggedSocialId(null)}
                          className={`space-y-2 rounded-2xl border p-3 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 ${
                            draggedSocialId === item.id
                              ? 'border-[var(--accent-border)] bg-[#152036]'
                              : 'border-[#2a3548] bg-[#111827]/85'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="Drag to reorder"
                                aria-label="Drag to reorder link"
                                className="hidden h-9 w-9 rounded-xl border border-[#334155] bg-[#0b1220] text-neutral-400 lg:flex lg:items-center lg:justify-center lg:cursor-grab lg:active:cursor-grabbing"
                              >
                                <GripVertical size={15} />
                              </button>
                              <div className="flex items-center gap-1 lg:hidden">
                                <button
                                  type="button"
                                  onClick={() => nudgeSocial(item.id, 'up')}
                                  disabled={index === 0}
                                  aria-label="Move link up"
                                  title="Move link up"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#334155] bg-[#0b1220] text-neutral-300 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <ChevronUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => nudgeSocial(item.id, 'down')}
                                  disabled={index === socialItems.length - 1}
                                  aria-label="Move link down"
                                  title="Move link down"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#334155] bg-[#0b1220] text-neutral-300 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <ChevronDown size={15} />
                                </button>
                              </div>
                              <select value={item.platform} onChange={(e) => updateSocial(item.id, { platform: e.target.value })} aria-label="Social platform" className="rounded-xl bg-[#0b1220] border border-[#273247] px-3 py-2 text-sm text-neutral-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]">
                                {SOCIAL_PRESETS.map((platform) => (
                                  <option key={platform} value={platform}>{platform}</option>
                                ))}
                              </select>
                            </div>
                            <button type="button" title="Delete link" aria-label="Delete link" onClick={() => removeSocial(item.id)} className="h-9 w-9 rounded-xl border border-red-500/35 bg-red-500/10 text-red-300 flex items-center justify-center transition-all duration-200 hover:bg-red-500/20">
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <input
                            value={item.url}
                            onChange={(e) => updateSocial(item.id, { url: e.target.value })}
                            placeholder="https://..."
                            aria-label="Social link URL"
                            className="w-full rounded-xl bg-[#0b1220] border border-[#273247] px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]"
                          />
                          {item.platform === 'custom' && (
                            <input
                              value={item.customPlatform}
                              onChange={(e) => updateSocial(item.id, { customPlatform: e.target.value })}
                              placeholder="custom platform"
                              aria-label="Custom platform name"
                              className="w-full rounded-xl bg-[#0b1220] border border-[#273247] px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
	                  </Panel>
	                </motion.div>
	              )}
	            </AnimatePresence>
          </section>
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b111c]/95 px-2 py-2 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[var(--accent-soft)] text-white shadow-[0_10px_24px_var(--accent-glow)]'
                    : 'text-neutral-400 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <Icon size={17} />
                <span className="truncate">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset profile?"
        description="This will clear media, links, bio, status, colors and other custom settings. Your account and username will stay the same."
        confirmLabel="Reset everything"
        loading={resettingProfile}
        onCancel={() => {
          if (resettingProfile) return;
          setResetConfirmOpen(false);
        }}
        onConfirm={confirmResetProfile}
      />
      <AvatarCropModal
        open={avatarCrop.open}
        src={avatarCrop.src}
        objectFit={avatarCrop.objectFit}
        zoom={avatarCrop.zoom}
        crop={avatarCrop.crop}
        onCropChange={(crop) => setAvatarCrop((prev) => ({ ...prev, crop }))}
        onZoomChange={(zoom) => setAvatarCrop((prev) => ({ ...prev, zoom }))}
        onCropComplete={(_, croppedAreaPixels) =>
          setAvatarCrop((prev) => ({ ...prev, croppedAreaPixels }))
        }
        onCancel={() => resolveAvatarCrop(null)}
        onConfirm={handleConfirmAvatarCrop}
      />
      <BackgroundCropModal
        open={backgroundCrop.open}
        src={backgroundCrop.src}
        objectFit={backgroundCrop.objectFit}
        zoom={backgroundCrop.zoom}
        crop={backgroundCrop.crop}
        onCropChange={(crop) => setBackgroundCrop((prev) => ({ ...prev, crop }))}
        onZoomChange={(zoom) => setBackgroundCrop((prev) => ({ ...prev, zoom }))}
        onCropComplete={(_, croppedAreaPixels) =>
          setBackgroundCrop((prev) => ({ ...prev, croppedAreaPixels }))
        }
        onCancel={() => resolveBackgroundCrop(null)}
        onConfirm={handleConfirmBackgroundCrop}
      />
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,20,34,0.88),rgba(11,17,29,0.82))] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)] sm:p-3.5">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-400">{hint}</p>
    </div>
  );
}
