import path from 'path';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

export type UploadKind = 'avatar' | 'background' | 'audio' | 'cursor';

const IMAGE_MAX_UPLOAD_SIDE = 2400;
const AVATAR_MAX_BYTES = 350 * 1024;
const BACKGROUND_MAX_BYTES = 900 * 1024;

type ProcessedUpload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

const AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.flac',
  '.m4a',
  '.mp3',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
  '.weba',
  '.webm',
]);

const AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/webm',
  'audio/x-aac',
  'audio/x-flac',
  'audio/x-m4a',
  'audio/x-wav',
  'application/ogg',
  'video/mp4',
  'video/webm',
]);

const replaceExtension = (fileName: string, extension: string) => {
  const parsed = path.parse(fileName || 'file');
  return `${parsed.name || 'file'}${extension}`;
};

const detectMimeType = async (buffer: Buffer, fallbackMime: string, fileName: string) => {
  const detected = await fileTypeFromBuffer(buffer);
  if (detected?.mime) return detected.mime;

  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.cur') return 'image/x-icon';
  return fallbackMime || 'application/octet-stream';
};

const isSupportedAudioUpload = (mimeType: string, fileName: string) => {
  const normalizedMime = mimeType.trim().toLowerCase();
  const extension = path.extname(fileName).toLowerCase();

  if (normalizedMime.startsWith('audio/')) return true;
  if (AUDIO_MIME_TYPES.has(normalizedMime)) return true;
  return AUDIO_EXTENSIONS.has(extension);
};

const compressWebpToLimit = async (
  source: sharp.Sharp,
  fileName: string,
  limitBytes: number,
  width: number,
  height: number,
) => {
  let currentWidth = width;
  let currentHeight = height;
  let quality = 86;
  let bestBuffer: Buffer | null = null;

  for (let pass = 0; pass < 8; pass += 1) {
    const buffer = await source
      .clone()
      .resize({
        width: currentWidth,
        height: currentHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 6 })
      .toBuffer();

    bestBuffer = buffer;
    if (buffer.byteLength <= limitBytes) {
      return {
        buffer,
        mimeType: 'image/webp',
        fileName: replaceExtension(fileName, '.webp'),
      };
    }

    quality = Math.max(52, quality - 8);
    currentWidth = Math.max(640, Math.round(currentWidth * 0.9));
    currentHeight = Math.max(640, Math.round(currentHeight * 0.9));
  }

  if (!bestBuffer) {
    throw new Error('Image compression failed');
  }

  return {
    buffer: bestBuffer,
    mimeType: 'image/webp',
    fileName: replaceExtension(fileName, '.webp'),
  };
};

const optimizeImageBuffer = async (
  buffer: Buffer,
  fileName: string,
  kind: UploadKind,
): Promise<ProcessedUpload> => {
  const image = sharp(buffer, { failOn: 'warning' }).rotate();
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unsupported image file');
  }

  if (kind === 'cursor') {
    const output = await image
      .resize(64, 64, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    return {
      buffer: output,
      mimeType: 'image/png',
      fileName: replaceExtension(fileName, '.png'),
    };
  }

  const resized = image.resize({
    width: kind === 'background' ? 1920 : 1024,
    height: kind === 'background' ? 1080 : 1024,
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (Math.max(metadata.width, metadata.height) > IMAGE_MAX_UPLOAD_SIDE) {
    resized.resize({
      width: kind === 'background' ? 1920 : 1024,
      height: kind === 'background' ? 1080 : 1024,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  return compressWebpToLimit(
    resized,
    fileName,
    kind === 'background' ? BACKGROUND_MAX_BYTES : AVATAR_MAX_BYTES,
    kind === 'background' ? 1920 : 1024,
    kind === 'background' ? 1080 : 1024,
  );
};

export const processUpload = async (input: {
  buffer: Buffer;
  fileName: string;
  fallbackMime: string;
  kind: UploadKind;
}): Promise<ProcessedUpload> => {
  const mimeType = await detectMimeType(input.buffer, input.fallbackMime, input.fileName);

  if (input.kind === 'audio') {
    if (!isSupportedAudioUpload(mimeType, input.fileName)) {
      throw new Error('Unsupported audio file');
    }

    return {
      buffer: input.buffer,
      mimeType,
      fileName: input.fileName,
    };
  }

  if (!mimeType.startsWith('image/')) {
    throw new Error('Unsupported image file');
  }

  return optimizeImageBuffer(input.buffer, input.fileName, input.kind);
};

