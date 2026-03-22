import { ImageResponse } from 'next/og';
import { getUserByUsername } from '@/lib/db';
import { SITE_NAME } from '@/lib/seo';

export const runtime = 'nodejs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  const profile = user?.profile;
  const displayName = profile?.displayName?.trim() || username;
  const bio = profile?.bio?.trim() || 'Custom profile page with links, media, and a more intentional public presence.';
  const accentColor = profile?.accentColor?.trim() || '#8ea7ff';
  const avatarUrl = profile?.avatarUrl?.trim() || '';
  const backgroundUrl = profile?.backgroundUrl?.trim() || '';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#06070a',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.34,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 15% 10%, rgba(255,174,97,0.16), transparent 32%), radial-gradient(circle at 85% 18%, rgba(142,167,255,0.22), transparent 34%), linear-gradient(180deg, rgba(4,7,13,0.84), rgba(4,7,13,0.96))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: 64,
            right: 64,
            bottom: 64,
            display: 'flex',
            justifyContent: 'space-between',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 40,
            padding: 48,
            background: 'rgba(7, 11, 21, 0.62)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '68%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 26,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                {SITE_NAME}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{displayName}</div>
                <div style={{ fontSize: 34, color: accentColor, fontWeight: 600 }}>@{username}</div>
              </div>
              <div style={{ fontSize: 30, lineHeight: 1.35, color: 'rgba(255,255,255,0.8)' }}>
                {bio.length > 160 ? `${bio.slice(0, 157)}...` : bio}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, color: 'rgba(255,255,255,0.72)' }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: accentColor,
                  boxShadow: `0 0 24px ${accentColor}`,
                }}
              />
              links, media, page identity
            </div>
          </div>
          <div
            style={{
              width: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 240,
                height: 240,
                borderRadius: 999,
                border: `4px solid ${accentColor}`,
                boxShadow: `0 0 50px ${accentColor}55`,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 92,
                fontWeight: 700,
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
