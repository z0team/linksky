'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Pause,
  Eye,
  Github,
  Send,
  Music,
  Globe,
  Instagram,
  Youtube,
  Disc3,
  Twitch,
  Linkedin,
  Facebook,
  Music2,
  Twitter,
  MapPin,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { SocialLink, UserProfile } from '@/lib/db';
import { useLiteMode } from '@/lib/use-lite-mode';

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const steamIcon = (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M8.5 14.5L12 12" />
    <circle cx="14.5" cy="9.5" r="2.5" />
    <circle cx="7.5" cy="15.5" r="1.5" />
  </svg>
);

const socialIconMap: Record<string, React.ReactNode> = {
  steam: steamIcon,
  github: <Github size={24} />,
  telegram: <Send size={24} />,
  instagram: <Instagram size={24} />,
  youtube: <Youtube size={24} />,
  discord: <Disc3 size={24} />,
  twitch: <Twitch size={24} />,
  linkedin: <Linkedin size={24} />,
  facebook: <Facebook size={24} />,
  tiktok: <Music2 size={24} />,
  x: <Twitter size={24} />,
  twitter: <Twitter size={24} />,
  website: <Globe size={24} />,
};

const normalizeSocials = (socials: unknown): SocialLink[] => {
  if (Array.isArray(socials)) {
    return socials
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;
        const platform = typeof raw.platform === 'string' ? raw.platform.trim().toLowerCase() : '';
        const url = typeof raw.url === 'string' ? normalizeUrl(raw.url) : '';
        if (!platform || !url) return null;
        return { platform, url };
      })
      .filter((item): item is SocialLink => item !== null);
  }

  if (socials && typeof socials === 'object') {
    return Object.entries(socials as Record<string, unknown>)
      .map(([platform, url]) => {
        const normalizedUrl = typeof url === 'string' ? normalizeUrl(url) : '';
        if (!normalizedUrl) return null;
        return { platform: platform.trim().toLowerCase(), url: normalizedUrl };
      })
      .filter((item): item is SocialLink => item !== null);
  }

  return [];
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const PROMO_BANNER_STORAGE_KEY = 'linksky-promo-banner-seen';

export default function ProfileClient({
  profile,
  username,
  previewMode = false,
}: {
  profile: UserProfile;
  username: string;
  previewMode?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const liteMode = useLiteMode(!!reduceMotion);
  const [entered, setEntered] = useState(previewMode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPromoBanner, setShowPromoBanner] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const viewTrackedRef = useRef(false);

  const accentColor = profile.accentColor || '#8ea7ff';
  const cardOpacity = clamp(profile.cardOpacity ?? 0.4, 0.2, 0.9);
  const blurStrength = clamp(profile.blurStrength ?? 20, 0, 32);
  const fontClass = profile.fontFamily === 'serif' ? 'font-serif' : profile.fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  useEffect(() => {
    if (previewMode) return;
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    fetch(`/api/users/${username}/view`, { method: 'POST', keepalive: true }).catch(console.error);
  }, [username, previewMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const handleEnter = () => {
    setEntered(true);
    if (!previewMode) {
      try {
        if (window.localStorage.getItem(PROMO_BANNER_STORAGE_KEY) !== '1') {
          window.localStorage.setItem(PROMO_BANNER_STORAGE_KEY, '1');
          setShowPromoBanner(true);
        }
      } catch {
        setShowPromoBanner(true);
      }
    }

    if (!liteMode && audioRef.current && profile.musicUrl) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trackSocialClick = useCallback((platform: string, url: string) => {
    if (previewMode) return;

    const payload = JSON.stringify({ platform, url });
    const endpoint = `/api/users/${username}/click`;

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [previewMode, username]);

  const isVideoBg = profile.backgroundUrl?.match(/\.(mp4|webm|ogg)$/i);
  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (progress / duration) * 100)) : 0;

  const socials = useMemo(() => normalizeSocials(profile.socials), [profile.socials]);

  const revealDistance = liteMode ? 0 : 10;
  const contentTransition = liteMode
    ? { duration: 0.01 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
  const isEntered = previewMode || entered;
  const shouldRenderVideoBackground = Boolean(isVideoBg && isEntered && !liteMode);

  useEffect(() => {
    if (previewMode || !isEntered || !showPromoBanner) return;
    const timeoutId = window.setTimeout(() => setShowPromoBanner(false), 15000);
    return () => window.clearTimeout(timeoutId);
  }, [isEntered, previewMode, showPromoBanner]);

  return (
    <div
      className={`min-h-screen w-full overflow-y-auto text-white ${fontClass}`}
      style={{
        cursor: profile.cursorUrl ? `url(${profile.cursorUrl}), auto` : 'auto',
      }}
      >
        <div className="fixed inset-0 z-0">
        {shouldRenderVideoBackground ? (
          <video src={profile.backgroundUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-55" preload="metadata" />
        ) : (
          <div
            className="w-full h-full bg-cover bg-center opacity-55"
            style={isVideoBg
              ? {
                  background:
                    `radial-gradient(circle at top, ${accentColor}26, transparent 38%), linear-gradient(180deg, rgba(7,10,18,0.95), rgba(3,5,10,0.98))`,
                }
              : { backgroundImage: `url(${profile.backgroundUrl || '/demo/background.svg'})` }}
          />
        )}
      </div>

      {profile.musicUrl && <audio ref={audioRef} src={profile.musicUrl} loop preload={liteMode ? 'none' : 'metadata'} />}

      <AnimatePresence>
        {!isEntered && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={contentTransition}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[2px] cursor-pointer px-4"
            onClick={handleEnter}
          >
            <motion.p
              initial={{ opacity: 0, y: revealDistance }}
              animate={{ opacity: 1, y: 0 }}
              transition={contentTransition}
              className="text-lg sm:text-2xl font-light tracking-[0.25em] text-center"
            >
              {profile.enterText || '[ click to enter ]'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEntered && (
          <motion.div
              initial={{ opacity: 0, y: revealDistance }}
              animate={{ opacity: 1, y: 0 }}
              transition={contentTransition}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-10"
          >
            <div
              className="w-full max-w-[92vw] sm:max-w-[520px] border border-white/10 rounded-[1.7rem] sm:rounded-[2rem] p-5 sm:p-8 relative overflow-hidden shadow-xl"
              style={{
                backgroundColor: `rgba(0,0,0,${cardOpacity})`,
                backdropFilter: `blur(${blurStrength}px)`,
                boxShadow: profile.enableGlow ? `0 0 40px ${accentColor}33` : undefined,
              }}
            >
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, y: revealDistance }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...contentTransition, delay: liteMode ? 0 : 0.04 }}
                  className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2"
                  style={{ borderColor: `${accentColor}80`, boxShadow: profile.enableGlow ? `0 0 28px ${accentColor}66` : 'none' }}
                >
                  <Image
                    src={profile.avatarUrl || '/demo/avatar.svg'}
                    alt={profile.displayName}
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover"
                    priority
                    unoptimized={!!profile.avatarUrl}
                  />
                </motion.div>

                <motion.h1
                  initial={{ y: revealDistance, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...contentTransition, delay: liteMode ? 0 : 0.08 }}
                  className="mt-5 sm:mt-6 text-xl sm:text-2xl font-semibold text-white/95 tracking-wide text-center break-words"
                >
                  {profile.displayName || username}
                </motion.h1>

                {!!profile.status && <p className="mt-2 text-sm text-white/75 text-center">{profile.status}</p>}
                {!!profile.bio && <p className="mt-2 max-w-[42ch] text-sm sm:text-base text-white/75 text-center">{profile.bio}</p>}

                {!!profile.location && (
                  <p className="mt-2 text-xs text-white/65 inline-flex items-center gap-1">
                    <MapPin size={12} /> {profile.location}
                  </p>
                )}

                {!!socials.length && (
                  <motion.div
                    initial={{ y: revealDistance, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...contentTransition, delay: liteMode ? 0 : 0.12 }}
                    className="flex items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8 flex-wrap"
                  >
                    {socials.map((social) => {
                      const icon = socialIconMap[social.platform] || <Globe size={24} />;
                      return (
                        <a
                          key={`${social.platform}-${social.url}`}
                          href={social.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => trackSocialClick(social.platform, social.url)}
                          className="text-white/55 hover:text-white transition-all hover:scale-110"
                          style={{ color: `${accentColor}dd` }}
                          aria-label={social.platform}
                        >
                          {icon}
                        </a>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {profile.showViews && (
                <div className="absolute bottom-4 sm:bottom-6 left-5 sm:left-8 flex items-center gap-2 text-xs font-mono" style={{ color: `${accentColor}cc` }}>
                  <Eye size={14} />
                  <span>{profile.views || 0}</span>
                </div>
              )}
            </div>

            {profile.musicUrl && (
              <motion.div
                initial={{ y: revealDistance, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...contentTransition, delay: liteMode ? 0 : 0.16 }}
                className="w-full max-w-[92vw] sm:max-w-[520px] mt-4 border border-white/10 rounded-3xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-lg"
                style={{
                  backgroundColor: `rgba(0,0,0,${Math.min(cardOpacity + 0.05, 0.95)})`,
                  backdropFilter: `blur(${Math.max(8, blurStrength - 4)}px)`,
                }}
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}29` }}>
                  <Music className="text-white/80" size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate font-medium">{profile.songTitle || 'Unknown Track'}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-2">
                    <span className="text-[10px] text-white/50 font-mono w-8">{formatTime(progress)}</span>
                    <div
                      className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative cursor-pointer group"
                      onClick={(e) => {
                        if (audioRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = (e.clientX - rect.left) / rect.width;
                          const targetDuration = audioRef.current.duration || duration;
                          if (targetDuration > 0) {
                            audioRef.current.currentTime = Math.max(0, Math.min(targetDuration, percent * targetDuration));
                          }
                        }
                      }}
                    >
                      <div className="absolute top-0 left-0 h-full rounded-full transition-colors" style={{ width: `${progressPercent}%`, backgroundColor: accentColor }} />
                    </div>
                    <span className="text-[10px] text-white/50 font-mono w-8">{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-white/60 px-1 sm:px-2">
                  <button onClick={togglePlay} className="hover:text-white transition-all hover:scale-110 p-2 rounded-full" style={{ backgroundColor: `${accentColor}1f` }} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEntered && !previewMode && showPromoBanner && (
          <motion.div
            initial={{ opacity: 0, y: revealDistance }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: revealDistance }}
            transition={contentTransition}
            className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,480px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[rgba(8,12,22,0.76)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.38)] backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => setShowPromoBanner(false)}
              className="absolute right-2 top-2 h-7 w-7 rounded-full border border-white/15 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close promo banner"
            >
              <X size={14} className="mx-auto" />
            </button>
            <div className="pr-8">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">LinkSky</p>
              <p className="mt-1 text-sm text-white/90">Create your own LinkSky page and publish a cleaner online presence.</p>
              <Link href="/register" className="mt-2 inline-flex text-sm font-semibold text-[#a8baff] hover:text-[#c2ceff] transition-colors">
                Create yours
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
