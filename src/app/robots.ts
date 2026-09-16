import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tavryn.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/', '/questions/ask'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
