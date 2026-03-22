'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Area } from 'react-easy-crop';
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Disc3,
  ExternalLink,
  Facebook,
  Github,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Instagram,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MousePointer2,
  Music,
  Palette,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Twitch,
  User,
  Youtube,
  Linkedin,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import type { ProfileAnalytics, SocialLink, UserProfile } from '@/lib/db';
import { useLiteMode } from '@/lib/use-lite-mode';
import { AnalyticsOverview } from './dashboard-analytics';
import {
  AvatarCropModal,
  BackgroundCropModal,
  ConfirmDialog,
  Input,
  MediaCard,
  Panel,
  RangeRow,
  TabButton,
  Toggle,
} from './dashboard-ui';

type Section = 'studio' | 'content' | 'theme' | 'links' | 'insights';
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const withAlpha = (hex: string, alpha: number) => {
  const raw = hex.replace('#', '').trim();
  if (!/^[\da-fA-F]{6}$/.test(raw)) return `rgba(125, 192, 255, ${alpha})`;

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
const QUICK_COLORS = ['#7dc0ff', '#f19371', '#78cfbf', '#d8b1ff', '#f2c39a'];
const SECTION_ITEMS = [
  { id: 'studio' as Section, label: 'Studio', mobileLabel: 'Studio', icon: Sparkles },
  { id: 'content' as Section, label: 'Content', mobileLabel: 'Content', icon: User },
  { id: 'theme' as Section, label: 'Theme', mobileLabel: 'Theme', icon: Palette },
  { id: 'links' as Section, label: 'Links', mobileLabel: 'Links', icon: LinkIcon },
  { id: 'insights' as Section, label: 'Insights', mobileLabel: 'Stats', icon: BarChart3 },
];
const SECTION_META: Record<
  Section,
  { title: string; description: string; eyebrow: string }
> = {
  studio: {
    eyebrow: 'Control room',
    title: 'See what is ready, what is missing, and what to share next.',
    description: 'Use this as the overview: page health, quick actions, and the current public URL.',
  },
  content: {
    eyebrow: 'Content',
    title: 'Edit the parts people actually read first.',
    description: 'Name, bio, status, location, entry text, and the media that shape the page.',
  },
  theme: {
    eyebrow: 'Theme',
    title: 'Shape the atmosphere without losing clarity.',
    description: 'Accent, font, panel treatment, and view behavior all live here.',
  },
  links: {
    eyebrow: 'Links',
    title: 'Choose where people should click.',
    description: 'Start with the platforms you want to be known for, then order them the way you want them seen.',
  },
  insights: {
    eyebrow: 'Insights',
    title: 'Check what people opened and where they came from.',
    description: 'Views, clicks, CTR, referrers, and platform performance for the current page.',
  },
};

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

const replaceExt = (name: string, ext: string) => name.replace(/\.[^/.]+$/, '') + ext;

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
  const ext =
    outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
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
  const ext =
    outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
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

const toSocialFormItems = (socials: unknown): SocialFormItem[] =>
  normalizeSocialsInput(socials).map((item) => {
    const known = SOCIAL_PRESETS.includes(item.platform);
    return {
      id: makeId(),
      platform: known ? item.platform : 'custom',
      customPlatform: known ? '' : item.platform,
      url: item.url,
    };
  });

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
    accentColor: source.accentColor || '#7dc0ff',
    cardOpacity: clamp(typeof source.cardOpacity === 'number' ? source.cardOpacity : 0.4, 0.2, 0.9),
    blurStrength: clamp(typeof source.blurStrength === 'number' ? source.blurStrength : 20, 0, 32),
    showViews: typeof source.showViews === 'boolean' ? source.showViews : true,
    enableGlow: typeof source.enableGlow === 'boolean' ? source.enableGlow : true,
    fontFamily: rawFont === 'mono' || rawFont === 'serif' ? rawFont : 'sans',
    socials: normalizeSocialsInput(source.socials),
  };
};

const buildSocialPayload = (items: SocialFormItem[]): SocialLink[] =>
  items
    .map((item) => {
      const platform = (item.platform === 'custom' ? item.customPlatform : item.platform)
        .trim()
        .toLowerCase();
      const url = item.url.trim();
      if (!platform || !url) return null;
      return { platform, url };
    })
    .filter((item): item is SocialLink => item !== null);

const buildProfilePayload = (nextFormData: ProfileForm, items: SocialFormItem[]) => ({
  ...nextFormData,
  cardOpacity: clamp(nextFormData.cardOpacity, 0.2, 0.9),
  blurStrength: clamp(nextFormData.blurStrength, 0, 32),
  socials: buildSocialPayload(items),
});

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
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [copied, setCopied] = useState(false);
  const [section, setSection] = useState<Section>('studio');
  const [draggedSocialId, setDraggedSocialId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resettingProfile, setResettingProfile] = useState(false);
  const [formData, setFormData] = useState<ProfileForm>(() => toProfileForm(initialProfile));
  const [socialItems, setSocialItems] = useState<SocialFormItem[]>(() =>
    toSocialFormItems(initialProfile?.socials),
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
  const avatarCropResolver = useRef<((file: File | null) => void) | null>(null);
  const backgroundCropResolver = useRef<((file: File | null) => void) | null>(null);
  const autosaveEnabledRef = useRef(false);
  const didMountSectionRef = useRef(false);
  const inFlightPayloadRef = useRef<string | null>(null);
  const lastSavedPayloadRef = useRef(
    JSON.stringify(
      buildProfilePayload(toProfileForm(initialProfile), toSocialFormItems(initialProfile?.socials)),
    ),
  );
  const sectionTopRef = useRef<HTMLDivElement | null>(null);
  const bioFieldId = useId();
  const accentColorLabelId = useId();
  const fontFamilyId = useId();
  const analytics = initialAnalytics;
  const profileUrl = publicProfileUrl;

  const resolveAvatarCrop = useCallback(
    (file: File | null) => {
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
    },
    [avatarCrop.src],
  );

  const resolveBackgroundCrop = useCallback(
    (file: File | null) => {
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
    },
    [backgroundCrop.src],
  );

  const requestAvatarCrop = useCallback(
    async (file: File) => {
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
    },
    [pushToast],
  );

  const requestBackgroundCrop = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        pushToast({ title: 'Background must be an image', variant: 'error' });
        return Promise.resolve<File | null>(null);
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
    },
    [pushToast],
  );

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

  const transformCursorFile = useCallback(
    async (file: File) => {
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

      return resizeImageFileToMaxSide(file, CURSOR_MAX_SIDE, CURSOR_TARGET_TYPE);
    },
    [pushToast],
  );

  const persistProfile = useCallback(
    async (
      nextFormData: ProfileForm,
      nextSocialItems: SocialFormItem[],
      opts?: { notifyOnError?: boolean; silent?: boolean },
    ) => {
      const payload = buildProfilePayload(nextFormData, nextSocialItems);
      const serialized = JSON.stringify(payload);

      if (serialized === lastSavedPayloadRef.current || serialized === inFlightPayloadRef.current) {
        if (!opts?.silent) {
          setSaveState('saved');
        }
        return true;
      }

      inFlightPayloadRef.current = serialized;
      setSaveState('saving');
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Save failed');
        setFormData((prev) => ({ ...prev, socials: payload.socials }));
        lastSavedPayloadRef.current = serialized;
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
      } finally {
        inFlightPayloadRef.current = null;
      }
    },
    [pushToast],
  );

  const updateMediaField = useCallback(
    (patch: Partial<ProfileForm>) => {
      const next = { ...formData, ...patch };
      setFormData(next);
      void persistProfile(next, socialItems, { notifyOnError: true, silent: true });
    },
    [formData, persistProfile, socialItems],
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
      window.setTimeout(() => setCopied(false), 1200);
      pushToast({ title: 'Profile URL copied', variant: 'success' });
    } catch {
      pushToast({ title: 'Copy failed', variant: 'error' });
    }
  };

  const confirmResetProfile = async () => {
    setResettingProfile(true);
    const nextFormData = toProfileForm(undefined);
    const nextSocialItems: SocialFormItem[] = [];
    const saved = await persistProfile(nextFormData, nextSocialItems, { silent: true });

    if (saved) {
      setFormData(nextFormData);
      setSocialItems(nextSocialItems);
      setSection('studio');
      setResetConfirmOpen(false);
      pushToast({
        title: 'Profile reset',
        description: 'Media, links, text, and styling were cleared.',
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

  useEffect(() => {
    if (!didMountSectionRef.current) {
      didMountSectionRef.current = true;
      return;
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      sectionTopRef.current?.scrollIntoView({ behavior: liteMode ? 'auto' : 'smooth', block: 'start' });
    }
  }, [liteMode, section]);

  const accentColor = formData.accentColor || '#7dc0ff';
  const dashboardTheme = {
    '--accent': accentColor,
    '--accent-soft': withAlpha(accentColor, 0.14),
    '--accent-border': withAlpha(accentColor, 0.52),
    '--accent-glow': withAlpha(accentColor, 0.28),
    '--accent-shadow': withAlpha(accentColor, 0.38),
  } as React.CSSProperties;

  const hasBio = formData.bio.trim().length > 0;
  const hasLinks = socialItems.some((item) => item.url.trim().length > 0);
  const hasSong = formData.musicUrl.trim().length > 0;
  const hasBackground = formData.backgroundUrl.trim().length > 0;
  const hasAvatar = formData.avatarUrl.trim().length > 0;
  const publishedLinksCount = socialItems.filter((item) => item.url.trim().length > 0).length;
  const checklistItems = [
    { label: 'Avatar added', done: hasAvatar },
    { label: 'Background set', done: hasBackground },
    { label: 'Short bio written', done: hasBio },
    { label: 'At least one link ready', done: hasLinks },
    { label: 'Theme chosen', done: formData.accentColor.trim().length > 0 },
  ];
  const completedChecklistCount = checklistItems.filter((item) => item.done).length;
  const completionPercent = Math.round((completedChecklistCount / checklistItems.length) * 100);
  const completionLabel =
    completionPercent >= 80 ? 'Ready to share' : completionPercent >= 50 ? 'Needs a few final passes' : 'Needs setup';
  const saveStateLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Needs attention'
          : 'Draft';
  const saveStateBadgeClass =
    saveState === 'saving'
      ? 'border-sky-400/35 bg-sky-500/10 text-sky-100'
      : saveState === 'saved'
        ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
        : saveState === 'error'
          ? 'border-red-400/35 bg-red-500/10 text-red-100'
          : 'border-white/10 bg-white/[0.04] text-[color:var(--text-secondary)]';

  return (
    <div
      style={dashboardTheme}
      className="min-h-screen bg-[radial-gradient(circle_at_10%_-6%,rgba(241,147,113,0.12),transparent_28%),radial-gradient(circle_at_92%_0,rgba(125,192,255,0.18),transparent_30%),linear-gradient(180deg,#090d12_0%,#0c1016_100%)] text-white"
    >
      <div className="mx-auto max-w-[1580px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden xl:block xl:self-start">
            <div className="linksky-panel sticky top-4 rounded-[32px] p-5">
              <div className="flex flex-col gap-4">
                <Link href="/" className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.06]">
                  <div className="relative h-12 w-12 overflow-hidden rounded-[18px] border border-white/10 bg-white/10">
                    <NextImage src="/icon.svg" alt="LinkSky" fill sizes="48px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold tracking-[0.18em] text-white">LINKSKY</p>
                    <p className="text-xs text-[color:var(--text-muted)]">Dashboard studio</p>
                  </div>
                </Link>

                <div className="space-y-2">
                  {SECTION_ITEMS.map((item) => {
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

                <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/10">
                      {formData.avatarUrl ? (
                        <NextImage src={formData.avatarUrl} alt="avatar" fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                          {(formData.displayName || initialUsername).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold text-white">
                        {formData.displayName || initialUsername}
                      </p>
                    <p className="truncate text-xs text-[color:var(--text-muted)]">@{initialUsername}</p>
                  </div>
                </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Profile health</p>
                      <p className="mt-1 font-display text-2xl font-semibold text-white">{completionPercent}%</p>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${saveStateBadgeClass}`}>
                      {saveState === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {saveStateLabel}
                    </div>
                  </div>
                  <p className="mt-3 break-all text-xs leading-6 text-[color:var(--text-muted)]">{profileUrl}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <ActionButton label={copied ? 'Copied' : 'Copy URL'} icon={<Copy size={14} />} onClick={handleCopy} variant="ghost" compact />
                    <ActionButton label="Open page" icon={<ExternalLink size={14} />} href={profileUrl} variant="ghost" compact />
                  </div>
                </div>

                <ActionButton label="Log out" icon={<LogOut size={15} />} onClick={handleLogout} variant="ghost" fullWidth />
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            <header ref={sectionTopRef} className="linksky-panel rounded-[30px] p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-[760px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                      {SECTION_META[section].eyebrow}
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                      {SECTION_META[section].title}
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
                      {SECTION_META[section].description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ActionButton label="Open" icon={<ExternalLink size={15} />} href={profileUrl} variant="ghost" />
                    <ActionButton label={copied ? 'Copied' : 'Copy'} icon={<Copy size={15} />} onClick={handleCopy} variant="ghost" />
                    <ActionButton label="Save" icon={saveState === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} onClick={handleSave} disabled={saveState === 'saving'} variant="primary" />
                    <ActionButton label="Reset" icon={<RotateCcw size={15} />} onClick={() => setResetConfirmOpen(true)} variant="danger" />
                  </div>
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:hidden">
                  {SECTION_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id)}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors ${
                          active
                            ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-white'
                            : 'border-white/10 bg-white/[0.03] text-[color:var(--text-secondary)] hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {section === 'studio' && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <QuickStatCard label="Views" value={analytics.totalViews.toString()} hint="All time" icon={<BarChart3 size={15} />} />
                    <QuickStatCard label="Clicks" value={analytics.totalClicks.toString()} hint={`${analytics.ctr}% CTR`} icon={<Activity size={15} />} />
                    <QuickStatCard label="Links live" value={publishedLinksCount.toString()} hint={publishedLinksCount ? 'Ready to share' : 'Add your first link'} icon={<LinkIcon size={15} />} />
                    <QuickStatCard label="Atmosphere" value={hasSong ? 'On' : 'Off'} hint={hasSong ? formData.songTitle || 'Track added' : 'No music yet'} icon={<Music size={15} />} />
                  </div>
                )}

              </div>
            </header>

            {section === 'studio' && (
              <Panel title="Studio overview" description="This is the current state of the public page. Keep the basics strong, then open the live page when you want to judge the final feel.">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-[24px] border border-white/10 bg-[rgba(8,11,16,0.56)] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Public URL</p>
                    <p className="mt-2 break-all font-display text-2xl font-semibold text-white">{profileUrl}</p>
                    <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
                      {completionPercent >= 80
                        ? 'The page is ready to share. Open the live version when you want to check the overall mood.'
                        : 'Finish the core pieces first: avatar, background, bio, and one clear place to click.'}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Essentials</p>
                    <div className="mt-4 space-y-2">
                      {checklistItems.map((item) => (
                        <ChecklistRow key={item.label} label={item.label} done={item.done} />
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {section === 'content' && (
              <div className="space-y-4">
                <Panel title="Identity and copy" description="Keep the top of the page recognizable. Short, specific copy usually works better than trying to say everything at once.">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Input label="Display name" value={formData.displayName} onChange={(value) => setFormData((prev) => ({ ...prev, displayName: value }))} placeholder="mak" />
                    <Input label="Location" value={formData.location} onChange={(value) => setFormData((prev) => ({ ...prev, location: value }))} placeholder="Kyiv" />
                    <Input label="Status" value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} placeholder="building weird nice things" icon={<BadgeCheck size={14} />} />
                    <Input label="Enter text" value={formData.enterText} onChange={(value) => setFormData((prev) => ({ ...prev, enterText: value }))} placeholder="[ click to enter ]" />
                  </div>

                  <div className="mt-4 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Input label="Song title" value={formData.songTitle} onChange={(value) => setFormData((prev) => ({ ...prev, songTitle: value }))} placeholder="Artist - Track" icon={<Music size={14} />} />
                      <div>
                        <label htmlFor={bioFieldId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
                          Bio
                        </label>
                        <textarea
                          id={bioFieldId}
                          value={formData.bio}
                          onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
                          rows={5}
                          className="linksky-textarea text-sm"
                          placeholder="Tell people what you make, stream, build, or care about."
                        />
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Media" description="Upload the pieces people notice first. Media saves immediately after upload so the preview stays close to what the public page will show.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                    <MediaCard label="Background" kind="background" value={formData.backgroundUrl} accept="image/*" onChange={(value) => updateMediaField({ backgroundUrl: value })} transformFile={requestBackgroundCrop} hint="16:9 crop for images" icon={<ImageIcon size={15} />} />
                    <MediaCard label="Audio" kind="audio" value={formData.musicUrl} accept="audio/*" onChange={(value) => updateMediaField({ musicUrl: value })} onUploaded={({ fileName }) => {
                      const autoTitle = fileNameToTrackTitle(fileName);
                      if (!autoTitle) return;
                      updateMediaField({ songTitle: autoTitle });
                    }} hint="Optional background track" icon={<Music size={15} />} />
                    <MediaCard label="Avatar" kind="avatar" value={formData.avatarUrl} accept="image/*" onChange={(value) => updateMediaField({ avatarUrl: value })} transformFile={requestAvatarCrop} hint="Square crop" icon={<User size={15} />} />
                    <MediaCard label="Cursor" kind="cursor" value={formData.cursorUrl} accept="image/*,.cur" onChange={(value) => updateMediaField({ cursorUrl: value })} transformFile={transformCursorFile} hint="Auto-optimized to 64x64" icon={<MousePointer2 size={15} />} />
                  </div>
                </Panel>
              </div>
            )}

            {section === 'theme' && (
              <div className="space-y-4">
                <Panel title="Visual tone" description="Choose the accent and font first, then fine-tune the panel treatment. Small decisions here do more than piling on extra effects.">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label id={accentColorLabelId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
                        Accent color
                      </label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={formData.accentColor} onChange={(event) => setFormData((prev) => ({ ...prev, accentColor: event.target.value }))} aria-labelledby={accentColorLabelId} className="h-12 w-14 rounded-2xl border border-white/10 bg-transparent" />
                        <input value={formData.accentColor} onChange={(event) => setFormData((prev) => ({ ...prev, accentColor: event.target.value }))} aria-labelledby={accentColorLabelId} placeholder="#7dc0ff" className="linksky-input text-sm" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {QUICK_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, accentColor: color }))}
                            aria-label={`Set accent color ${color}`}
                            className={`h-9 w-9 rounded-full border transition-transform hover:scale-105 ${formData.accentColor.toLowerCase() === color.toLowerCase() ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.12)]' : 'border-white/10'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor={fontFamilyId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
                        Font family
                      </label>
                      <select id={fontFamilyId} value={formData.fontFamily} onChange={(event) => setFormData((prev) => ({ ...prev, fontFamily: event.target.value as ProfileForm['fontFamily'] }))} className="linksky-select text-sm">
                        <option value="sans">Sans</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Mono</option>
                      </select>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">
                        Pick the family that matches the voice of the page. Sans stays clean, serif feels editorial, mono feels more terminal-like.
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel title="Surface and behavior" description="These settings control how soft, sharp, or dramatic the page card feels once someone enters.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <RangeRow label="Card opacity" value={formData.cardOpacity} min={0.2} max={0.9} step={0.05} onChange={(value) => setFormData((prev) => ({ ...prev, cardOpacity: value }))} />
                    <RangeRow label="Blur strength" value={formData.blurStrength} min={0} max={32} step={1} onChange={(value) => setFormData((prev) => ({ ...prev, blurStrength: value }))} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Toggle label="Show views" value={formData.showViews} onToggle={(value) => setFormData((prev) => ({ ...prev, showViews: value }))} icon={formData.showViews ? <Eye size={14} /> : <EyeOff size={14} />} />
                    <Toggle label="Glow" value={formData.enableGlow} onToggle={(value) => setFormData((prev) => ({ ...prev, enableGlow: value }))} icon={<Sparkles size={14} />} />
                    <div className="rounded-2xl border border-white/10 bg-[rgba(8,11,16,0.56)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">Current feel</p>
                      <p className="mt-2 font-display text-lg font-semibold text-white">
                        {formData.enableGlow ? 'Soft highlight' : 'Clean panel'}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                        {formData.blurStrength > 18 ? 'More haze behind the card.' : 'Sharper edges and less blur.'}
                      </p>
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {section === 'links' && (
              <div className="space-y-4">
                <Panel title="Quick add" description="Start with the platforms people already expect to find. Add custom links only when the usual presets are not enough.">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
                    {SOCIAL_PRESETS.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => addSocial(platform)}
                        aria-label={`Add ${platform} link`}
                        className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(8,11,16,0.56)] text-[color:var(--text-secondary)] transition-colors hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                        title={platform}
                      >
                        {SOCIAL_ICON_MAP[platform] || <span className="text-xs uppercase">{platform.slice(0, 2)}</span>}
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title="Link stack"
                  description="Links without a URL stay hidden on the public page. Use arrows on mobile or drag on larger screens to set the order."
                  actions={
                    <button type="button" onClick={() => addSocial('custom')} className="linksky-button-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
                      <Plus size={15} />
                      Add custom link
                    </button>
                  }
                >
                  {!socialItems.length ? (
                    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--text-secondary)]">
                      No links yet. Add the places people should click first.
                    </div>
                  ) : null}

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
                        className={`rounded-[24px] border p-3 transition-colors ${
                          draggedSocialId === item.id ? 'border-[var(--accent-border)] bg-[rgba(125,192,255,0.12)]' : 'border-white/10 bg-[rgba(8,11,16,0.56)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button type="button" title="Drag to reorder" aria-label="Drag to reorder link" className="hidden h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] text-[color:var(--text-secondary)] lg:flex lg:items-center lg:justify-center lg:cursor-grab lg:active:cursor-grabbing">
                              <GripVertical size={15} />
                            </button>
                            <div className="flex items-center gap-1 lg:hidden">
                              <button type="button" onClick={() => nudgeSocial(item.id, 'up')} disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[color:var(--text-secondary)] disabled:opacity-35" aria-label="Move link up">
                                <ChevronUp size={15} />
                              </button>
                              <button type="button" onClick={() => nudgeSocial(item.id, 'down')} disabled={index === socialItems.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[color:var(--text-secondary)] disabled:opacity-35" aria-label="Move link down">
                                <ChevronDown size={15} />
                              </button>
                            </div>
                            <select value={item.platform} onChange={(event) => updateSocial(item.id, { platform: event.target.value })} aria-label="Social platform" className="linksky-select max-w-[170px] text-sm">
                              {SOCIAL_PRESETS.map((platform) => (
                                <option key={platform} value={platform}>
                                  {platform}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button type="button" onClick={() => removeSocial(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/10 text-red-100 transition-colors hover:bg-red-500/18" aria-label="Delete link">
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="mt-3 space-y-2">
                          <input value={item.url} onChange={(event) => updateSocial(item.id, { url: event.target.value })} placeholder="https://..." aria-label="Social link URL" className="linksky-input text-sm" />
                          {item.platform === 'custom' ? (
                            <input value={item.customPlatform} onChange={(event) => updateSocial(item.id, { customPlatform: event.target.value })} placeholder="custom platform name" aria-label="Custom platform name" className="linksky-input text-sm" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            {section === 'insights' && (
              <Panel title="Performance snapshot" description="Use this to see whether the page is being opened and whether people are actually clicking through.">
                <AnalyticsOverview analytics={analytics} />
              </Panel>
            )}
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset profile?"
        description="This clears media, links, copy, colors, and other custom settings. Your account and username stay the same."
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
        onCropComplete={(_, croppedAreaPixels) => setAvatarCrop((prev) => ({ ...prev, croppedAreaPixels }))}
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
        onCropComplete={(_, croppedAreaPixels) => setBackgroundCrop((prev) => ({ ...prev, croppedAreaPixels }))}
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
    <div className="rounded-[22px] border border-white/10 bg-[rgba(8,11,16,0.56)] p-4">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{hint}</p>
    </div>
  );
}

function ChecklistRow({
  label,
  done,
  large = false,
}: {
  label: string;
  done: boolean;
  large?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] ${large ? 'px-4 py-3.5' : 'px-3 py-2.5'}`}>
      <span className={`text-sm ${done ? 'text-white' : 'text-[color:var(--text-secondary)]'}`}>{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-[11px] ${done ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[0.05] text-[color:var(--text-muted)]'}`}>
        {done ? 'Done' : 'Pending'}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  href,
  disabled = false,
  variant = 'ghost',
  compact = false,
  fullWidth = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: 'ghost' | 'primary' | 'danger';
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const sharedClassName = `inline-flex items-center justify-center gap-2 rounded-[22px] border text-sm transition-colors ${
    compact ? 'px-3 py-2.5' : 'min-h-12 px-4 py-3'
  } ${fullWidth ? 'w-full' : 'w-full'} ${
    variant === 'primary'
      ? 'border-transparent bg-[#f5efe6] text-[#11151c] hover:bg-white'
      : variant === 'danger'
        ? 'border-red-500/35 bg-red-500/10 text-red-100 hover:bg-red-500/18'
        : 'border-white/10 bg-white/[0.03] text-[color:var(--text-secondary)] hover:bg-white/[0.08] hover:text-white'
  } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={sharedClassName}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={sharedClassName}>
      {icon}
      {label}
    </button>
  );
}
