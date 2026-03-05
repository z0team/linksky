import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getUserByUsername } from '@/lib/db';
import { SITE_NAME } from '@/lib/seo';
import ProfileClient from './ProfileClient';

const getUserByUsernameCached = cache(async (username: string) => {
  return getUserByUsername(username);
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const { preview } = await searchParams;
  const previewMode = preview === '1' || preview === 'true';

  const user = await getUserByUsernameCached(username);
  if (!user) {
    return {
      title: 'Profile not found',
      robots: { index: false, follow: false },
    };
  }

  const displayName = user.profile.displayName?.trim() || username;
  const description = user.profile.bio?.trim() || `${displayName} profile on ${SITE_NAME}`;
  const image = user.profile.avatarUrl?.trim() || user.profile.backgroundUrl?.trim();

  return {
    title: username,
    description,
    alternates: {
      canonical: `/${username}`,
    },
    openGraph: {
      type: 'profile',
      title: `${username} | ${SITE_NAME}`,
      description,
      url: `/${username}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${username} | ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },
    robots: previewMode ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { username } = await params;
  const { preview } = await searchParams;
  const previewMode = preview === '1' || preview === 'true';
  const user = await getUserByUsernameCached(username);

  if (!user) {
    notFound();
  }

  return <ProfileClient profile={user.profile} username={username} previewMode={previewMode} />;
}
