export const SITE_NAME = 'LinkSky';
export const SITE_DESCRIPTION =
  'LinkSky is a design-led profile and link page builder for creators, gamers, and internet-native identities.';

const DEFAULT_SITE_URL = 'http://localhost:3000';

const normalizeSiteUrl = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return DEFAULT_SITE_URL;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
};

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
);
