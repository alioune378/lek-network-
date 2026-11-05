'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { CHOICE_KEY, SUGGEST } from '@/lib/langSuggest';
import { rememberChoice } from './LanguageMenu';

/**
 * First visit only: if the browser prefers another supported language, suggest it — never switch automatically.
 * An explicit choice (either button, or the language menu) is remembered and the banner never returns.
 */
export default function LangSuggest({ locale }: { locale: Locale }) {
  const [target, setTarget] = useState<Locale | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem(CHOICE_KEY)) return;
    } catch {
      return;
    }
    const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language]).map((x) => x.toLowerCase().split('-')[0]);
    const first = prefs.find((p) => isLocale(p));
    if (first && first !== locale) setTarget(first as Locale);
  }, [locale]);

  if (!target) return null;
  const s = SUGGEST[target];
  const close = (l: Locale) => {
    rememberChoice(l);
    setTarget(null);
    if (l !== locale) router.replace(pathname, { locale: l, scroll: false });
  };
  return (
    <div className="lang-suggest" role="region" aria-label={s.text} lang={target} dir={target === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container lang-suggest-in">
        <p>{s.text}</p>
        <div className="lang-suggest-actions">
          <button type="button" className="btn btn-gold btn-sm" onClick={() => close(target)}>
            {s.yes}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => close(locale)}>
            {s.no}
          </button>
        </div>
      </div>
    </div>
  );
}
