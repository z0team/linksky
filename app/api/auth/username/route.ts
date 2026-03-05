import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { usernameAvailabilitySchema } from '@/lib/validation';
import { ZodError } from 'zod';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = consumeRateLimit(`auth:username:${ip}`, 40, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many checks. Try again later.' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || '';
    const parsed = usernameAvailabilitySchema.parse({ username });
    const existingUser = await getUserByUsername(parsed.username);

    return NextResponse.json({ available: !existingUser });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid username' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
