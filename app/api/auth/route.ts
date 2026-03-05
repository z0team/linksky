import { NextResponse } from 'next/server';
import {
  createSession,
  createUser,
  deleteSession,
  getSessionUser,
  getUserByEmail,
  getUserByIdentifier,
  getUserByUsername,
  isUniqueViolation,
  updateUserPasswordHash,
} from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import {
  loginSchema,
  logoutSchema,
  registerSchema,
} from '@/lib/validation';
import { ZodError } from 'zod';

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  priority: 'high' as const,
  maxAge: 60 * 60 * 24 * 30,
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const { action } = body;
    const cookieStore = await cookies();

    if (action === 'register') {
      const rateLimit = consumeRateLimit(`auth:register:${ip}`, 8, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
      }

      const parsed = registerSchema.parse(body);
      const { username, email, password } = parsed;

      const [existingUsername, existingEmail] = await Promise.all([
        getUserByUsername(username),
        getUserByEmail(email),
      ]);

      if (existingUsername) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
      }

      if (existingEmail) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      try {
        await createUser({ username, email, passwordHash });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return NextResponse.json({ error: 'Username or email is already registered' }, { status: 400 });
        }
        throw error;
      }

      const sessionId = crypto.randomUUID();
      await createSession(sessionId, username);

      cookieStore.set('session', sessionId, COOKIE_OPTIONS);
      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      const rateLimit = consumeRateLimit(`auth:login:${ip}`, 12, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
      }

      const { identifier, password } = loginSchema.parse(body);
      const user = await getUserByIdentifier(identifier);

      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials or user does not exist' }, { status: 401 });
      }

      const storedHash = user.passwordHash || '';
      const looksHashed = storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$');
      let validPassword = false;

      if (looksHashed) {
        validPassword = await bcrypt.compare(password, storedHash);
      } else {
        validPassword = storedHash === password;
        if (validPassword) {
          const upgradedHash = await bcrypt.hash(password, 10);
          await updateUserPasswordHash(user.username, upgradedHash);
        }
      }

      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid credentials or user does not exist' }, { status: 401 });
      }

      const sessionId = crypto.randomUUID();
      await createSession(sessionId, user.username);

      cookieStore.set('session', sessionId, COOKIE_OPTIONS);
      return NextResponse.json({ success: true });
    }

    if (action === 'logout') {
      logoutSchema.parse(body);
      const sessionId = cookieStore.get('session')?.value;
      if (sessionId) {
        await deleteSession(sessionId);
      }
      cookieStore.delete('session');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }

  return NextResponse.json(
    { user: { username: user.username, profile: user.profile } },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
