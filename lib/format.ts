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

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lek-network.netlify.app').replace(/\/$/, '');
