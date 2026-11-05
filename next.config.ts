import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** Private staging (LEK_ENV=staging): every response tells crawlers not to index or follow, on top of Netlify access protection. */
const staging = process.env.LEK_ENV === 'staging';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const base = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ];
    return [
      { source: '/:path*', headers: staging ? [...base, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] : base },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default withNextIntl(config);
