import { NextResponse } from 'next/server';
import { bodyToWebStream, decodeMediaKey, getObjectFromStorage } from '@/lib/storage';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const key = decodeMediaKey(id);
    if (!key) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const object = await getObjectFromStorage(key, req.headers.get('range'));
    const stream = bodyToWebStream(object.Body);
    if (!stream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const status = object.ContentRange ? 206 : 200;

    const headers = new Headers({
      'Content-Type': object.ContentType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    if (object.ContentLength != null) {
      headers.set('Content-Length', String(object.ContentLength));
    }
    if (object.ContentRange) {
      headers.set('Content-Range', object.ContentRange);
    }

    return new NextResponse(stream, {
      status,
      headers,
    });
  } catch (error) {
    if (error && typeof error === 'object' && '$metadata' in error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (statusCode === 404) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (statusCode === 416) {
        return new NextResponse(null, { status: 416 });
      }
    }

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
