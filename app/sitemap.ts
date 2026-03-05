import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  try {
    const users = await prisma.user.findMany({
      select: { username: true },
    });

    const profileRoutes: MetadataRoute.Sitemap = users.map((user) => ({
      url: `${SITE_URL}/${user.username}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...profileRoutes];
  } catch {
    return staticRoutes;
  }
}
