import { describe, expect, it } from 'vitest';
import { loginSchema, profileUpdateSchema, registerSchema } from '@/lib/validation';

describe('registerSchema', () => {
  it('normalizes email casing', () => {
    const result = registerSchema.parse({
      action: 'register',
      username: 'maker_test',
      email: 'USER@Example.com',
      password: 'password123',
    });

    expect(result.email).toBe('user@example.com');
  });
});

describe('loginSchema', () => {
  it('accepts email fallback as identifier', () => {
    const result = loginSchema.parse({
      action: 'login',
      email: 'hello@example.com',
      password: 'password123',
    });

    expect(result.identifier).toBe('hello@example.com');
  });
});

describe('profileUpdateSchema', () => {
  it('sanitizes socials and internal media urls', () => {
    const result = profileUpdateSchema.parse({
      avatarUrl: '/api/media/abc123?name=avatar.png',
      socials: [{ platform: 'GitHub', url: 'github.com/maker' }],
    });

    expect(result.avatarUrl).toBe('/api/media/abc123?name=avatar.png');
    expect(result.socials?.[0]).toEqual({
      platform: 'github',
      url: 'https://github.com/maker',
    });
  });
});
