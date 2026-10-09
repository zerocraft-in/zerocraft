import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://zerocraft.in';
  const now = new Date();

  return [
    ...['about', 'services', 'works', 'contact'].map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
