import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeRateLimit, resetRateLimitBucket } from '@/lib/rate-limit';

describe('consumeRateLimit', () => {
  const key = 'test:bucket';

  beforeEach(() => {
    resetRateLimitBucket(key);
  });

  it('allows requests until the limit is reached', () => {
    expect(consumeRateLimit(key, 2, 1000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 1000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 1000).allowed).toBe(false);
  });

  it('resets after the window expires', () => {
    vi.useFakeTimers();

    expect(consumeRateLimit(key, 1, 1000).allowed).toBe(true);
    expect(consumeRateLimit(key, 1, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(consumeRateLimit(key, 1, 1000).allowed).toBe(true);

    vi.useRealTimers();
  });
});
