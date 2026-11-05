'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { localeNames, locales, priorityLocales, type Locale } from '@/lib/locales';
import { CHOICE_KEY } from '@/lib/langSuggest';
import { GlobeIcon } from './Icons';

export function rememberChoice(l: Locale) {
  try {
    localStorage.setItem(CHOICE_KEY, l);
  } catch {
    /* storage unavailable */
  }
}

/** Switches language on the same page (an article keeps its slug; it shows its reviewed translation or a notice). */
export default function LanguageMenu({ locale, variant = 'popover', onDone }: { locale: Locale; variant?: 'popover' | 'list'; onDone?: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (l: Locale) => {
    rememberChoice(l);
    setOpen(false);
    onDone?.();
    if (l !== locale) router.replace(pathname, { locale: l, scroll: false });
  };

  const list = (
    <ul className="lang-list" role="list">
      {locales.map((l) => (
        <li key={l}>
          <button type="button" lang={l} aria-current={l === locale ? 'true' : undefined} className={l === locale ? 'is-on' : ''} onClick={() => choose(l)}>
            <span>{localeNames[l]}</span>
            <span className="lang-code">{l.toUpperCase()}</span>
            {!priorityLocales.includes(l) && <span className="lang-beta" aria-label="beta">β</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  if (variant === 'list') return list;

  return (
    <div className="lang-menu" ref={box}>
      <button type="button" className="icon-btn lang-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <GlobeIcon />
        <span className="lang-btn-code">{locale.toUpperCase()}</span>
        <span className="sr-only">{t('language')}</span>
      </button>
      {open && (
        <div className="lang-pop" role="dialog" aria-label={t('language')}>
          {list}
        </div>
      )}
    </div>
  );
}
