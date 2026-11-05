import type { MetadataRoute } from 'next';

/**
 * Private staging (LEK_ENV=staging) is never crawled. The public site keeps its current behaviour
 * (crawlable, with a page-level "noindex" while it is a prototype).
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.LEK_ENV === 'staging') return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/' }] };
}
