export const locales = ['fr', 'en', 'ar', 'wo', 'es', 'pt', 'de', 'it', 'tr', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

/** Native names, shown in the language menu. */
export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  wo: 'Wolof',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  tr: 'Türkçe',
  zh: '中文',
};

/** Polished priority languages; the others are interface translations awaiting native review. */
export const priorityLocales: readonly Locale[] = ['fr', 'en', 'ar'];
export const rtlLocales: readonly Locale[] = ['ar'];

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (locales as readonly string[]).includes(v);
export const dirOf = (l: Locale) => (rtlLocales.includes(l) ? 'rtl' : 'ltr');

/** BCP 47 tag used for Intl date formatting. */
export const intlTag: Record<Locale, string> = {
  fr: 'fr-SN',
  en: 'en-GB',
  ar: 'ar',
  wo: 'wo-SN',
  es: 'es',
  pt: 'pt',
  de: 'de',
  it: 'it',
  tr: 'tr',
  zh: 'zh-CN',
};
