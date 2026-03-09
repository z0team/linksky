'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import NextImage from 'next/image';
import type { Area } from 'react-easy-crop';
import { Check, CircleAlert, Loader2, Scissors, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

const Cropper = dynamic(
  () => import('react-easy-crop').then((mod) => mod.default as React.ComponentType<any>),
  { ssr: false },
);

export type UploadKind = 'background' | 'audio' | 'avatar' | 'cursor';

const getNameFromMediaUrl = (url: string) => {
  const value = url?.trim();
  if (!value) return '';

  try {
    const parsed = value.startsWith('http')
      ? new URL(value)
      : new URL(value, 'http://localhost');
    const fromQuery =
      parsed.searchParams.get('name') ||
      parsed.searchParams.get('filename') ||
      parsed.searchParams.get('file');
    if (fromQuery) return decodeURIComponent(fromQuery);

    const pathPart = parsed.pathname.split('/').filter(Boolean).pop() || '';
    if (!pathPart || /^media$/i.test(pathPart)) return '';
    return decodeURIComponent(pathPart);
  } catch {
    const cleaned = value.split('?')[0].split('#')[0];
    const pathPart = cleaned.split('/').filter(Boolean).pop() || '';
    if (!pathPart || /^media$/i.test(pathPart)) return '';
    return decodeURIComponent(pathPart);
  }
};

const isLikelyVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);

export function TabButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-[var(--accent-soft)] text-white shadow-[0_10px_24px_var(--accent-glow)]'
          : 'bg-transparent text-neutral-300 hover:bg-white/[0.045] hover:text-white'
      }`}
    >
      <span className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} style={{ background: 'var(--accent)' }} />
      {icon}
      {label}
    </button>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(14,20,34,0.94),rgba(12,18,31,0.9))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function MediaCard({
  label,
  kind,
  accept,
  value,
  onChange,
  onUploaded,
  transformFile,
  hint,
  icon,
}: {
  label: string;
  kind: UploadKind;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  onUploaded?: (payload: { url: string; fileName: string }) => void;
  transformFile?: (file: File) => Promise<File | null> | File | null;
  hint?: string;
  icon: React.ReactNode;
}) {
  const { pushToast } = useToast();
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const acceptsAudio = accept.includes('audio/');
  const acceptsVideo = accept.includes('video/');
  const acceptsImage = accept.includes('image/');
  const isCursor = label.toLowerCase() === 'cursor';
  const isAudio = label.toLowerCase() === 'audio' || acceptsAudio;

  const derivedFileName = useMemo(() => getNameFromMediaUrl(value), [value]);
  const displayFileName = uploadedFileName || derivedFileName || 'Uploaded file';

  useEffect(() => {
    setImageFailed(false);
    setVideoFailed(false);
  }, [value]);

  const uploadFile = async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);
      const uploadCandidate = transformFile ? await transformFile(file) : file;
      if (!uploadCandidate) return;

      const payload = new FormData();
      payload.append('kind', kind);
      payload.append('file', uploadCandidate);
      const res = await fetch('/api/upload', { method: 'POST', body: payload });
      const data = await res.json();
      if (data.url) {
        setUploadedFileName(uploadCandidate.name || '');
        onChange(data.url);
        onUploaded?.({ url: data.url, fileName: uploadCandidate.name });
        pushToast({ title: `${label} uploaded`, variant: 'success' });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Upload failed';
      pushToast({ title: `${label} upload failed`, description, variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (file) await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const prefersVideo = acceptsVideo && isLikelyVideoUrl(value);
  const canRenderImage = !!value && acceptsImage && !imageFailed;
  const canRenderVideo = !!value && acceptsVideo && !videoFailed;
  const showVideo = canRenderVideo && (prefersVideo || !canRenderImage);
  const showImage = canRenderImage && !showVideo;
  const showFileNameOnly = !!value && (isAudio || (!showImage && !showVideo));

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`group cursor-pointer overflow-hidden rounded-[24px] border transition-all duration-200 ${
        isDragging
          ? 'border-[color:var(--accent-border)] bg-[#182237]/95 shadow-[0_0_0_2px_var(--accent-glow)]'
          : 'border-[#273247] bg-[#0f1627]/88 hover:border-[#3a4a62] hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#253245] px-3 py-3 text-sm text-neutral-300">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 font-medium">{icon} {label}</span>
          {hint ? <p className="mt-0.5 truncate text-[11px] text-neutral-500">{hint}</p> : null}
        </div>
        {value ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
            <Check size={11} />
            Uploaded
          </span>
        ) : null}
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setUploadedFileName('');
              onChange('');
            }}
            aria-label={`Remove ${label.toLowerCase()}`}
            title={`Remove ${label.toLowerCase()}`}
            className="h-6 w-6 rounded bg-red-500/20 text-red-300 text-xs transition-colors duration-200 hover:bg-red-500/30"
          >
            x
          </button>
        )}
      </div>
      <div className="relative flex h-[156px] items-center justify-center bg-black/35">
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFile}
          aria-label={`Upload ${label.toLowerCase()}`}
          title={`Upload ${label.toLowerCase()}`}
          className="absolute inset-0 opacity-0"
        />
        {value ? (
          showImage ? (
            <NextImage
              src={value}
              alt={label}
              fill
              sizes="(max-width: 640px) 100vw, 25vw"
              className={isCursor ? 'object-contain p-3' : 'object-cover'}
              unoptimized
              onError={() => setImageFailed(true)}
            />
          ) : showVideo ? (
            <video
              src={value}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onError={() => setVideoFailed(true)}
            />
          ) : showFileNameOnly ? (
            <span className="max-w-[90%] truncate px-3 text-xs text-neutral-300">{displayFileName}</span>
          ) : (
            <span className="text-xs text-neutral-400">Preview unavailable</span>
          )
        ) : (
          <span className="text-sm text-neutral-500">{uploading ? 'Uploading...' : isDragging ? 'Drop to upload' : 'Click or drag file'}</span>
        )}
      </div>
    </label>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const inputId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-400">{icon} {label}</label>
      <input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-[#0b1220] border border-[#273247] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[color:var(--accent-border)]"
      />
    </div>
  );
}

export function Toggle({
  label,
  value,
  onToggle,
  icon,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onToggle(!value)}
      className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-medium inline-flex items-center justify-between transition-all duration-200 ${
        value ? 'border-emerald-400/45 bg-emerald-500/12 text-emerald-200 shadow-[0_10px_22px_rgba(16,185,129,0.18)]' : 'border-[#2b3548] bg-[#0f1627]/85 text-neutral-300 hover:border-[#3a4a62]'
      }`}
    >
      <span className="inline-flex items-center gap-2">{icon} {label}</span>
      <span className={`w-9 h-5 rounded-full ${value ? 'bg-emerald-300/80' : 'bg-white/20'} relative`}>
        <span className={`absolute top-[2px] h-4 w-4 rounded-full bg-black ${value ? 'left-4' : 'left-1'}`} />
      </span>
    </button>
  );
}

export function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const inputId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-400"><SlidersHorizontal size={14} /> {label}</label>
      <input id={inputId} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
      <div className="text-xs text-neutral-500 mt-1">{value}</div>
    </div>
  );
}

export function AvatarCropModal({
  open,
  src,
  objectFit,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  src: string;
  objectFit: 'horizontal-cover' | 'vertical-cover' | 'cover';
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const zoomInputId = useId();
  if (!open || !src) return null;

  const minZoom = 1;
  const maxZoom = 4;

  return (
    <div className="fixed inset-0 z-[120] bg-[#02040a]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f1726] shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Crop avatar</p>
            <p className="text-xs text-neutral-400">Position and zoom before upload</p>
          </div>
          <Scissors size={16} className="text-[var(--accent)]" />
        </div>

        <div className="p-4 space-y-4">
          <div className="relative aspect-square w-full max-w-[460px] mx-auto rounded-2xl overflow-hidden bg-black/40 border border-white/10">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              objectFit={objectFit}
              style={{
                mediaStyle: {
                  maxWidth: 'unset',
                  maxHeight: 'unset',
                },
              }}
              onCropChange={onCropChange}
              onCropComplete={onCropComplete}
              onZoomChange={onZoomChange}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_63%,rgba(1,4,12,0.34)_78%,rgba(1,4,12,0.45)_100%)]" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-full w-full rounded-full border border-white/65 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
            </div>
          </div>

          <div>
            <label htmlFor={zoomInputId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Zoom</label>
            <input
              id={zoomInputId}
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#334155] bg-transparent px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-[#141c2b]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all [background:var(--accent)] hover:brightness-110"
            >
              <Scissors size={14} />
              Apply crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BackgroundCropModal({
  open,
  src,
  objectFit,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  src: string;
  objectFit: 'horizontal-cover' | 'vertical-cover' | 'cover';
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const zoomInputId = useId();
  if (!open || !src) return null;

  const minZoom = 1;
  const maxZoom = 4;

  return (
    <div className="fixed inset-0 z-[120] bg-[#02040a]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0f1726] shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Crop background</p>
            <p className="text-xs text-neutral-400">Set 16:9 framing before upload</p>
          </div>
          <Scissors size={16} className="text-[var(--accent)]" />
        </div>

        <div className="p-4 space-y-4">
          <div className="relative aspect-video w-full mx-auto rounded-2xl overflow-hidden bg-black/40 border border-white/10">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              aspect={16 / 9}
              cropShape="rect"
              showGrid
              objectFit={objectFit}
              style={{
                mediaStyle: {
                  maxWidth: 'unset',
                  maxHeight: 'unset',
                },
              }}
              onCropChange={onCropChange}
              onCropComplete={onCropComplete}
              onZoomChange={onZoomChange}
            />
            <div className="pointer-events-none absolute inset-0 border border-white/55 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.38)]" />
          </div>

          <div>
            <label htmlFor={zoomInputId} className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Zoom</label>
            <input
              id={zoomInputId}
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#334155] bg-transparent px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-[#141c2b]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all [background:var(--accent)] hover:brightness-110"
            >
              <Scissors size={14} />
              Apply crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#02040a]/82 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,34,0.98),rgba(10,14,24,0.98))] shadow-[0_30px_80px_rgba(0,0,0,0.58)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200">
            <CircleAlert size={18} />
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
        </div>

        <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl border border-[#334155] bg-transparent px-4 py-2.5 text-sm text-neutral-200 transition-colors hover:bg-[#141c2b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition-all hover:bg-red-500/16 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CircleAlert size={15} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

