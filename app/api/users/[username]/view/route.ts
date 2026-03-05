import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { incrementProfileViews, recordProfileViewEvent } from '@/lib/db';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp, getReferrerHost } from '@/lib/request';

const VIEW_COOLDOWN_SECONDS = 60;

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const ip = getClientIp(req);
    const rateLimit = consumeRateLimit(`profile:view:${ip}`, 120, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many view events. Try again later.' }, { status: 429 });
    }

    const { username } = await params;
    const cookieStore = await cookies();
    const marker = `viewed_${username}`;
    const alreadyCounted = cookieStore.get(marker)?.value === '1';

    if (!alreadyCounted) {
      await Promise.all([
        incrementProfileViews(username),
        recordProfileViewEvent(username, getReferrerHost(req)),
      ]);

      cookieStore.set(marker, '1', {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: VIEW_COOLDOWN_SECONDS,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
