import { describe, expect, it } from 'vitest';
import { getRequestOrigin } from '@/lib/request-origin';

const createHeaderStore = (headers: Record<string, string | null>) => ({
  get(name: string) {
    return headers[name.toLowerCase()] ?? null;
  },
});

describe('getRequestOrigin', () => {
  it('prefers forwarded host and protocol from the proxy', () => {
    const origin = getRequestOrigin(createHeaderStore({
      'x-forwarded-host': 'linksky.qzz.io',
      'x-forwarded-proto': 'https',
      host: 'internal:3000',
    }));

    expect(origin).toBe('https://linksky.qzz.io');
  });

  it('falls back to localhost over http when no forwarded headers exist', () => {
    const origin = getRequestOrigin(createHeaderStore({
      host: 'localhost:3000',
    }));

    expect(origin).toBe('http://localhost:3000');
  });

  it('uses the first forwarded value when proxies append multiple hosts', () => {
    const origin = getRequestOrigin(createHeaderStore({
      'x-forwarded-host': 'linksky.qzz.io, cache.internal',
      'x-forwarded-proto': 'https, http',
    }));

    expect(origin).toBe('https://linksky.qzz.io');
  });
});
