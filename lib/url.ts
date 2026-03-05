const INTERNAL_MEDIA_PATTERN = /^\/api\/media\/[^/?#]+(?:\?.*)?$/i;

const normalizeHost = (host: string) => host.replace(/^www\./i, '').toLowerCase();

export const sanitizeExternalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

export const sanitizeAssetUrl = (value: string, allowedHosts: string[] = []) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (INTERNAL_MEDIA_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    if (!allowedHosts.length) {
      return parsed.toString();
    }

    return allowedHosts.includes(normalizeHost(parsed.host)) ? parsed.toString() : '';
  } catch {
    return '';
  }
};
