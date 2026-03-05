import { z } from 'zod';
import { sanitizeAssetUrl, sanitizeExternalUrl } from '@/lib/url';

const usernameRegex = /^[a-zA-Z0-9_-]{3,32}$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(usernameRegex, 'Use letters, numbers, underscores or dashes');

export const emailSchema = z.string().trim().email('Invalid email address').transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export const loginSchema = z.object({
  action: z.literal('login'),
  identifier: z.string().trim().min(1, 'Missing credentials').optional(),
  username: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  password: passwordSchema,
}).transform((input) => ({
  action: input.action,
  identifier: (input.identifier || input.username || input.email || '').trim(),
  password: input.password,
}));

export const registerSchema = z.object({
  action: z.literal('register'),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const logoutSchema = z.object({
  action: z.literal('logout'),
});

export const fontFamilySchema = z.enum(['sans', 'serif', 'mono']);

export const socialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(32).transform((value) => value.toLowerCase()),
  url: z.string().trim().transform((value) => sanitizeExternalUrl(value)).refine(Boolean, 'Invalid URL'),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(280).optional(),
  status: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  avatarUrl: z.string().trim().optional(),
  backgroundUrl: z.string().trim().optional(),
  musicUrl: z.string().trim().optional(),
  cursorUrl: z.string().trim().optional(),
  songTitle: z.string().trim().max(120).optional(),
  enterText: z.string().trim().max(80).optional(),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  cardOpacity: z.number().min(0.2).max(0.9).optional(),
  blurStrength: z.number().min(0).max(32).optional(),
  showViews: z.boolean().optional(),
  enableGlow: z.boolean().optional(),
  fontFamily: fontFamilySchema.optional(),
  socials: z.array(socialLinkSchema).max(25).optional(),
}).transform((input) => ({
  ...input,
  avatarUrl: input.avatarUrl ? sanitizeAssetUrl(input.avatarUrl, ['picsum.photos']) : input.avatarUrl,
  backgroundUrl: input.backgroundUrl ? sanitizeAssetUrl(input.backgroundUrl, ['picsum.photos']) : input.backgroundUrl,
  musicUrl: input.musicUrl ? sanitizeAssetUrl(input.musicUrl) : input.musicUrl,
  cursorUrl: input.cursorUrl ? sanitizeAssetUrl(input.cursorUrl) : input.cursorUrl,
}));

export const usernameAvailabilitySchema = z.object({
  username: usernameSchema,
});

export const uploadKindSchema = z.enum(['avatar', 'background', 'audio', 'cursor']);

export const socialClickSchema = z.object({
  platform: z.string().trim().min(1).max(32).transform((value) => value.toLowerCase()),
  url: z.string().trim().transform((value) => sanitizeExternalUrl(value)).refine(Boolean, 'Invalid URL'),
});
