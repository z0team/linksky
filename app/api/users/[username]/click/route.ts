import { NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { recordSocialClickEvent, userExistsByUsername } from '@/lib/db';
import { getClientIp, getReferrerHost } from '@/lib/request';
import { socialClickSchema, usernameSchema } from '@/lib/validation';
import { ZodError } from 'zod';

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const ip = getClientIp(req);
    const rateLimit = consumeRateLimit(`profile:click:${ip}`, 180, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many click events. Try again later.' }, { status: 429 });
    }

    const { username } = await params;
    const parsedUsername = usernameSchema.parse(username);
    const userExists = await userExistsByUsername(parsedUsername);
    if (!userExists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const payload = socialClickSchema.parse(await req.json());

    await recordSocialClickEvent({
      username: parsedUsername,
      platform: payload.platform,
      url: payload.url,
      referrerHost: getReferrerHost(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
