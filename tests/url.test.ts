import { describe, expect, it } from 'vitest';
import { sanitizeAssetUrl, sanitizeExternalUrl } from '@/lib/url';

describe('sanitizeExternalUrl', () => {
  it('adds https when protocol is missing', () => {
    expect(sanitizeExternalUrl('example.com')).toBe('https://example.com/');
  });

  it('rejects non-http protocols', () => {
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBe('');
  });
});

describe('sanitizeAssetUrl', () => {
  it('allows internal media URLs', () => {
    expect(sanitizeAssetUrl('/api/media/abc123?name=file.png')).toBe('/api/media/abc123?name=file.png');
  });

  it('restricts external hosts when allowlist is provided', () => {
    expect(sanitizeAssetUrl('https://picsum.photos/id/10/200/200', ['picsum.photos'])).toBe('https://picsum.photos/id/10/200/200');
    expect(sanitizeAssetUrl('https://evil.example/avatar.png', ['picsum.photos'])).toBe('');
  });
});
