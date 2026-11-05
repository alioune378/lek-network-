'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import type { Locale } from '@/lib/locales';
import { LIVE } from '@/lib/live';
import LanguageMenu from './LanguageMenu';
import { CloseIcon, MenuIcon, SearchIcon } from './Icons';

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

export default function Header({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const tl = useTranslations('live.status');
  const tm = useTranslations('meta');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation; lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('drawer-open', open);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isOn = (m: string) => {
    if (m === '/region') return pathname === '/regions' || (pathname.startsWith('/region/') && !pathname.startsWith('/region/africa') && !pathname.startsWith('/region/diaspora'));
    return pathname.startsWith(m);
  };
  const live = LIVE.status === 'live';

  return (
    <>
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <div className="strip">
        <div className="container strip-in">
          <span className="strip-tag" lang="fr" dir="ltr">{tm('tagline')}</span>
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
          <button type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>
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

      <div id="drawer" className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} role="dialog" aria-modal="true" aria-label={t('menu')}>
        <div className="drawer-head">
          <img src="/brand/lek-horizontal-light.svg" alt="" width={1352} height={557} className="drawer-logo" />
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
            <CloseIcon />
            <span className="sr-only">{t('close')}</span>
          </button>
        </div>
        <form className="drawer-search" action={`/${locale}/search`} role="search">
          <SearchIcon />
          <input name="q" type="search" placeholder={t('search')} aria-label={t('search')} tabIndex={open ? 0 : -1} />
        </form>
        <nav className="drawer-nav" aria-label={t('main')}>
          <Link href="/" tabIndex={open ? 0 : -1}>
            {t('home')}
          </Link>
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} tabIndex={open ? 0 : -1} aria-current={isOn(n.match) ? 'page' : undefined}>
              {t(n.key)}
            </Link>
          ))}
          <Link href="/standards" tabIndex={open ? 0 : -1}>
            {t('standards')}
          </Link>
          <Link href="/newsroom" tabIndex={open ? 0 : -1}>
            {t('newsroom')}
          </Link>
        </nav>
        <div className="drawer-lang">
          <p className="drawer-k">{t('language')}</p>
          {open && <LanguageMenu locale={locale} variant="list" onDone={() => setOpen(false)} />}
        </div>
      </div>
      {open && <div className="drawer-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}
