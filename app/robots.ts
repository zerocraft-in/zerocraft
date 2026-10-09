import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/studio/auth/', '/auth/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/studio/auth/', '/auth/'],
      },
    ],
    sitemap: 'https://zerocraft.in/sitemap.xml',
    host: 'https://zerocraft.in',
  };
}
