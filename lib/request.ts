const normalizeHost = (value: string) => value.replace(/^www\./i, '').toLowerCase();

export const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return req.headers.get('x-real-ip')?.trim() || 'unknown';
};

export const getReferrerHost = (req: Request): string | null => {
  const referrer = req.headers.get('referer');
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    return normalizeHost(url.host);
  } catch {
    return null;
  }
};

export const getOriginHost = (req: Request): string | null => {
  const origin = req.headers.get('origin');
  if (!origin) return null;

  try {
    const url = new URL(origin);
    return normalizeHost(url.host);
  } catch {
    return null;
  }
};
