type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export const consumeRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult => {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
};

export const resetRateLimitBucket = (key: string) => {
  buckets.delete(key);
};
