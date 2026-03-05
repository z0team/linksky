import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsernameBySession } from '@/lib/db';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { processUpload } from '@/lib/media';
import { uploadToObjectStorage } from '@/lib/storage';
import { uploadKindSchema } from '@/lib/validation';
import { ZodError } from 'zod';

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = consumeRateLimit(`upload:${ip}`, 25, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = await getUsernameBySession(sessionId);
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const kindValue = formData.get('kind');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const kind = uploadKindSchema.parse(typeof kindValue === 'string' ? kindValue : '');

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 12MB)' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const processed = await processUpload({
      buffer,
      fileName: file.name || 'file',
      fallbackMime: file.type || 'application/octet-stream',
      kind,
    });

    const media = await uploadToObjectStorage({
      ownerUsername: username,
      fileName: processed.fileName,
      buffer: processed.buffer,
      contentType: processed.mimeType,
    });

    return NextResponse.json({ url: media.url });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid upload' }, { status: 400 });
    }

    if (error instanceof Error && error.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
