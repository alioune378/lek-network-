import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from '@/lib/locales';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // The root URL uses the browser's Accept-Language, then French. An explicit choice (cookie) always wins.
  localeDetection: true,
});
