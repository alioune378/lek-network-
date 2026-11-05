import { intlTag, type Locale } from './locales';

/** Dates are shown in Dakar time, in the reader's language. */
export function formatDate(iso: string, locale: Locale, withTime = false): string {
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' }
    : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Dakar' };
  try {
    return new Intl.DateTimeFormat(intlTag[locale], opts).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat('fr-SN', opts).format(new Date(iso));
  }
}

export function formatTime(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(intlTag[locale], { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://leknetwork.netlify.app').replace(/\/$/, '');

/** Day and short month, e.g. "5 nov." — for compact news streams. */
export function formatShortDate(iso: string, locale: Locale): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'Africa/Dakar' };
  try {
    return new Intl.DateTimeFormat(intlTag[locale], opts).format(new Date(iso));
  } catch {
    return iso.slice(5, 10);
  }
}

/** French typography: a narrow no-break space before : ; ! ? » and after «, so punctuation never starts a line. */
export function typo(text: string, lang: string): string {
  if (lang !== 'fr') return text;
  return text.replace(/\s+([:;!?»])/g, '\u202F$1').replace(/«\s+/g, '«\u202F');
}
