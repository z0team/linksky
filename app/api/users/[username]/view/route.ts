import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { incrementProfileViews, recordProfileViewEvent, userExistsByUsername } from '@/lib/db';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp, getReferrerHost } from '@/lib/request';
import { usernameSchema } from '@/lib/validation';
import { ZodError } from 'zod';

const VIEW_COOLDOWN_SECONDS = 60;

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const ip = getClientIp(req);
    const rateLimit = consumeRateLimit(`profile:view:${ip}`, 120, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many view events. Try again later.' }, { status: 429 });
    }

    const { username } = await params;
    const parsedUsername = usernameSchema.parse(username);
    const userExists = await userExistsByUsername(parsedUsername);
    if (!userExists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const marker = `viewed_${parsedUsername}`;
    const alreadyCounted = cookieStore.get(marker)?.value === '1';

    if (!alreadyCounted) {
      await Promise.all([
        incrementProfileViews(parsedUsername),
        recordProfileViewEvent(parsedUsername, getReferrerHost(req)),
      ]);

      cookieStore.set(marker, '1', {
        path: `/api/users/${parsedUsername}/view`,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: VIEW_COOLDOWN_SECONDS,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
