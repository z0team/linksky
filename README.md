# LinkSky

LinkSky is a polished bio-link builder built on Next.js App Router, Prisma and PostgreSQL. It lets creators ship a personal profile page with music, custom media, social links, live preview and a styled public URL.

## Highlights

- username or email authentication
- session cookies with tighter validation and rate limiting
- dashboard with autosave, upload flows and drag-and-drop social ordering
- avatar cropper and 16:9 background cropper
- audio, cursor and image processing before persistence
- Backblaze B2 private-bucket storage via server-side proxy
- public profile analytics: views, clicks, CTR, referrers and 14-day trend
- generated Open Graph image per profile
- preview route with dummy data and no database dependency
- custom 404, robots.txt and sitemap.xml
- test coverage for validation, URL sanitization and rate limiting

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS 4
- Motion
- Zod
- Sharp
- Vitest

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment template.

```powershell
Copy-Item .env.example .env
```

3. Fill in `DATABASE_URL`, set your site URL values, and add your Backblaze B2 credentials.

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linksky
MEDIA_STORAGE_DRIVER=b2
```

4. Add the B2 bucket credentials.

```env
MEDIA_STORAGE_DRIVER=b2
B2_REGION=us-west-004
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_BUCKET=linksky-media
B2_KEY_ID=...
B2_APPLICATION_KEY=...
```

5. Generate Prisma client and apply migrations.

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

6. Start the dev server.

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:watch
npm run clean
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:deploy
```

## Project Structure

- `app/` routes, layouts, metadata and UI
- `app/dashboard/` authenticated editor and analytics widgets
- `app/[username]/` public profile page, OG image and loading state
- `app/api/` auth, profile, upload, media and analytics endpoints
- `components/ui/` shared client UI such as toast provider
- `lib/` Prisma helpers, validation, upload processing, rate limiting and URL sanitizers
- `prisma/` schema and migrations
- `tests/` Vitest coverage for core helpers

## Media Pipeline

Media now lives only in Backblaze B2. PostgreSQL stores profile data only.

What happens in the current setup:

- upload type is validated server-side
- MIME sniffing is done from file bytes, not only browser metadata
- avatar and background images are resized and normalized through `sharp`
- cursor uploads are constrained and converted safely
- replaced owned media is deleted when no longer referenced by any profile
- `/api/media/:id` stays stable and streams files from the private bucket

## Security Baseline

- bcrypt password hashing
- per-route in-memory rate limiting on auth, profile updates, uploads and analytics events
- Zod validation on auth, profile, username availability, upload kind and social clicks
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy`
- asset URL sanitization and external URL normalization

## SEO and Sharing

- global metadata in `app/layout.tsx`
- dynamic metadata for `/:username`
- generated OG image at `/:username/opengraph-image`
- `robots.txt` and `sitemap.xml`
- preview pages marked `noindex`

## Testing

Run the current automated checks:

```bash
npm run lint
npm run test
npm run build
```

At the time of the latest update all three pass.

## Deployment Notes

- set `NEXT_PUBLIC_SITE_URL` and `SITE_URL` to the production domain
- run `npm run prisma:deploy` during deploys
- use managed Postgres or Supabase for production
- keep the B2 bucket private
- set `MEDIA_STORAGE_DRIVER=b2`
- provide `B2_REGION`, `B2_ENDPOINT`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`
