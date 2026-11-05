import type { Locale } from './locales';

type Dict = { [k: string]: string | Dict };

/** Deep merge: any key a dictionary does not define falls back to French, then English. */
function merge(base: Dict, over: Dict): Dict {
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (k.startsWith('_')) continue; // review notes
    const b = out[k];
    out[k] = typeof v === 'object' && v && typeof b === 'object' && b ? merge(b, v) : v;
  }
  return out;
}

export async function loadMessages(locale: Locale): Promise<Dict> {
  const fr = (await import('../messages/fr.json')).default as Dict;
  if (locale === 'fr') return fr;
  const own = (await import(`../messages/${locale}.json`)).default as Dict;
  // Wolof falls back to French (the shared second language of most readers); the others to English.
  if (locale === 'en' || locale === 'wo') return merge(fr, own);
  const en = (await import('../messages/en.json')).default as Dict;
  return merge(merge(fr, en), own);
}
