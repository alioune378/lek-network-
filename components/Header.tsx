'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import type { Locale } from '@/lib/locales';
import { LIVE } from '@/lib/live';
import { CATEGORIES } from '@/lib/content';
import LanguageMenu from './LanguageMenu';
import { CloseIcon, MenuIcon, SearchIcon } from './Icons';

/** Public navigation. The newsroom tool is deliberately absent (see footer › prototype tools). */
const NAV: { key: string; href: string; match: string }[] = [
  { key: 'news', href: '/category/all', match: '/category' },
  { key: 'regions', href: '/regions', match: '/region' },
  { key: 'africa', href: '/region/africa', match: '/region/africa' },
  { key: 'diaspora', href: '/region/diaspora', match: '/region/diaspora' },
  { key: 'watch', href: '/watch', match: '/watch' },
  { key: 'live', href: '/live', match: '/live' },
  { key: 'originals', href: '/originals', match: '/originals' },
  { key: 'studios', href: '/studios', match: '/studios' },
];
/** The seven sections the menu puts first. */
const PRIMARY = ['news', 'watch', 'live', 'originals', 'africa', 'diaspora', 'studios'];

export default function Header({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const tc = useTranslations('categories');
  const tl = useTranslations('live.status');
  const tm = useTranslations('meta');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Close the drawer on navigation; lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('drawer-open', open);
    if (open) {
      // Wait a frame so the panel is visible (and focusable) before moving focus into it.
      requestAnimationFrame(() => closeRef.current?.focus());
      wasOpen.current = true;
    } else if (wasOpen.current) {
      menuRef.current?.focus();
      wasOpen.current = false;
    }
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      // Keep keyboard focus inside the open menu.
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button, input');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isOn = (m: string) => {
    if (m === '/region') return pathname === '/regions' || (pathname.startsWith('/region/') && !pathname.startsWith('/region/africa') && !pathname.startsWith('/region/diaspora'));
    return pathname.startsWith(m);
  };
  const live = LIVE.status === 'live';
  const tab = open ? 0 : -1;

  return (
    <>
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <div className="strip">
        <div className="container strip-in">
          <span className="strip-tag" lang="fr" dir="ltr">
            {tm('tagline')}
          </span>
          <span className="strip-right">
            <Link href="/live" className={`live-chip ${live ? 'is-live' : ''}`}>
              <span className="live-dot" aria-hidden="true" />
              LËK Live · {tl(LIVE.status)}
            </Link>
            <Link href="/standards" className="strip-link">
              {t('standards')}
            </Link>
          </span>
        </div>
      </div>
      <header className="masthead">
        <div className="container masthead-in">
          <button ref={menuRef} type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>
            <MenuIcon />
            <span className="sr-only">{t('menu')}</span>
          </button>
          <Link href="/" className="brand" aria-label="LËK Network">
            <img src="/brand/lek-horizontal-navy.svg" alt="LËK Network" width={1352} height={557} className="brand-logo" />
          </Link>
          <nav className="mainnav" aria-label={t('main')}>
            {NAV.map((n) => (
              <Link key={n.key} href={n.href} aria-current={isOn(n.match) ? 'page' : undefined} className={n.key === 'live' && live ? 'nav-live' : ''}>
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="masthead-actions">
            <Link href="/search" className="icon-btn" aria-label={t('search')}>
              <SearchIcon />
            </Link>
            <LanguageMenu locale={locale} />
          </div>
        </div>
      </header>

      <div id="drawer" ref={panelRef} className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} role="dialog" aria-modal="true" aria-label={t('menu')}>
        <div className="drawer-head">
          <Link href="/" className="drawer-brand" tabIndex={tab} aria-label="LËK Network">
            <img src="/brand/lek-horizontal-light.svg" alt="" width={1352} height={557} className="drawer-logo" />
          </Link>
          <button ref={closeRef} type="button" className="drawer-close" onClick={() => setOpen(false)} tabIndex={tab}>
            <CloseIcon />
            <span>{t('close')}</span>
          </button>
        </div>

        <div className="drawer-scroll">
          <form className="drawer-search" action={`/${locale}/search`} role="search">
            <SearchIcon />
            <input name="q" type="search" placeholder={t('searchPlaceholder')} aria-label={t('search')} tabIndex={tab} enterKeyHint="search" />
          </form>

          <nav aria-label={t('main')}>
            <ul className="drawer-primary" role="list">
              {PRIMARY.map((k) => {
                const n = NAV.find((x) => x.key === k)!;
                return (
                  <li key={k} className={k === 'news' || k === 'studios' ? 'dp-wide' : undefined}>
                    <Link href={n.href} tabIndex={tab} aria-current={isOn(n.match) ? 'page' : undefined} className={`dp dp-${k}`}>
                      {k === 'live' && <span className={`live-dot ${live ? 'on' : ''}`} aria-hidden="true" />}
                      <span className="dp-label">{t(k)}</span>
                      <span className="dp-hint">{t(`hint.${k}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="drawer-sec" aria-labelledby="drawer-cats">
            <h2 id="drawer-cats" className="drawer-k">
              {t('sections')}
            </h2>
            <ul className="drawer-chips" role="list">
              {CATEGORIES.filter((c) => c !== 'africa' && c !== 'diaspora').map((c) => (
                <li key={c}>
                  <Link href={`/category/${c}`} tabIndex={tab}>
                    {tc(c)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/regions" tabIndex={tab}>
                  {t('regions')}
                </Link>
              </li>
            </ul>
          </section>

          <section className="drawer-sec" aria-labelledby="drawer-lang">
            <h2 id="drawer-lang" className="drawer-k">
              {t('language')}
            </h2>
            {open && <LanguageMenu locale={locale} variant="list" onDone={() => setOpen(false)} />}
          </section>

          <ul className="drawer-secondary" role="list">
            <li>
              <Link href="/standards" tabIndex={tab}>
                {t('standards')}
              </Link>
            </li>
            <li>
              <Link href="/standards#contact" tabIndex={tab}>
                {t('contact')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" tabIndex={tab}>
                {t('privacy')}
              </Link>
            </li>
            <li>
              <Link href="/credits" tabIndex={tab}>
                {t('credits')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {open && <div className="drawer-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}
