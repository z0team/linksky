import crypto from 'crypto';
import { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const INTERNAL_MEDIA_PATH = /^\/api\/media\/([^/?#]+)\/?$/i;

const normalize = (value: string | undefined) => value?.trim() || '';
const bucket = () => normalize(process.env.B2_BUCKET);
const region = () => normalize(process.env.B2_REGION) || 'us-west-004';
const endpoint = () => normalize(process.env.B2_ENDPOINT);
const keyId = () => normalize(process.env.B2_KEY_ID);
const applicationKey = () => normalize(process.env.B2_APPLICATION_KEY);

let client: S3Client | null = null;

const getClient = () => {
  if (client) return client;

  const resolvedEndpoint = endpoint();
  if (!resolvedEndpoint || !bucket() || !keyId() || !applicationKey()) {
    throw new Error('Backblaze B2 storage is not fully configured');
  }

  client = new S3Client({
    region: region(),
    endpoint: resolvedEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: keyId(),
      secretAccessKey: applicationKey(),
    },
  });

  return client;
};

export const encodeMediaKey = (key: string) => Buffer.from(key, 'utf8').toString('base64url');

export const decodeMediaKey = (token: string) => {
  try {
    return Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return '';
  }
};

export const buildMediaProxyUrl = (key: string, fileName?: string) => {
  const encodedKey = encodeMediaKey(key);
  const encodedName = fileName ? `?name=${encodeURIComponent(fileName)}` : '';
  return `/api/media/${encodedKey}${encodedName}`;
};

export const extractMediaProxyKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const resolvePath = (pathName: string) => {
    const match = INTERNAL_MEDIA_PATH.exec(pathName);
    if (!match?.[1]) return '';
    return decodeMediaKey(decodeURIComponent(match[1]));
  };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return resolvePath(new URL(trimmed).pathname);
    } catch {
      return '';
    }
  }

  return resolvePath(trimmed.split('?')[0].split('#')[0]);
};

export const uploadToObjectStorage = async (input: {
  ownerUsername: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}) => {
  const sanitizedOwner = input.ownerUsername.replace(/[^a-zA-Z0-9_-]+/g, '').toLowerCase() || 'user';
  const ext = input.fileName.includes('.') ? input.fileName.slice(input.fileName.lastIndexOf('.')) : '';
  const key = `${sanitizedOwner}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;

  await getClient().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: input.buffer,
    ContentType: input.contentType,
  }));

  return {
    key,
    url: buildMediaProxyUrl(key, input.fileName),
  };
};

export const deleteFromObjectStorage = async (key: string) => {
  const trimmedKey = key.trim();
  if (!trimmedKey) return;

  await getClient().send(new DeleteObjectCommand({
    Bucket: bucket(),
    Key: trimmedKey,
  }));
};

export const getObjectFromStorage = async (key: string, rangeHeader?: string | null) => {
  const trimmedKey = key.trim();
  if (!trimmedKey) {
    throw new Error('Missing media key');
  }

  return getClient().send(new GetObjectCommand({
    Bucket: bucket(),
    Key: trimmedKey,
    Range: rangeHeader || undefined,
  }));
};

export const bodyToWebStream = (body: GetObjectCommandOutput['Body']) => {
  if (!body) return null;
  if (typeof (body as { transformToWebStream?: () => ReadableStream }).transformToWebStream === 'function') {
    return (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
  }
  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream;
  }
  return null;
};

export const cleanupOwnedProxyMediaUrls = async (
  ownerUsername: string,
  previousUrls: string[],
  retainedUrls: string[],
) => {
  const normalizedOwner = ownerUsername.trim().toLowerCase();
  if (!normalizedOwner || !previousUrls.length) return;

  const retainedKeys = new Set(retainedUrls.map((url) => extractMediaProxyKey(url)).filter(Boolean));
  const keysToDelete = Array.from(new Set(previousUrls.map((url) => extractMediaProxyKey(url)).filter(Boolean)))
    .filter((key) => key.startsWith(`${normalizedOwner}/`))
    .filter((key) => !retainedKeys.has(key));

  if (!keysToDelete.length) return;

  await Promise.all(keysToDelete.map((key) => deleteFromObjectStorage(key)));
};
