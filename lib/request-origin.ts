import { SITE_URL } from '@/lib/seo';

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

const pickFirstHeaderValue = (value: string | null) => {
  if (!value) return '';
  return value.split(',')[0]?.trim() || '';
};

export const getRequestOrigin = (headerStore: Pick<Headers, 'get'>) => {
  const forwardedHost = pickFirstHeaderValue(headerStore.get('x-forwarded-host'));
  const host = forwardedHost || pickFirstHeaderValue(headerStore.get('host'));

  if (!host) return SITE_URL;

  const forwardedProto = pickFirstHeaderValue(headerStore.get('x-forwarded-proto'));
  const protocol = forwardedProto || (LOCAL_HOST_RE.test(host) ? 'http' : 'https');

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return SITE_URL;
  }
};
