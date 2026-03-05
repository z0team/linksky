import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CANDIDATES = [
  'profile-creation.mp4',
  'profile-creation.webm',
  'profile-creation.ogg',
];

export async function GET() {
  const base = path.join(process.cwd(), 'public', 'demo');

  for (const file of CANDIDATES) {
    const abs = path.join(base, file);
    if (fs.existsSync(abs)) {
      return NextResponse.json({ url: `/demo/${file}` }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
  }

  return NextResponse.json({ url: null }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
