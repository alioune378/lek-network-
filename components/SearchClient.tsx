'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { CATEGORIES, REGION_NAMES, latest, tx, type Story } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import StoryCard from './StoryCard';
import { SearchIcon } from './Icons';

/** Accent- and case-insensitive matching, so "thies" finds "Thiès". */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function haystack(s: Story, locale: Locale) {
  const parts = [s.title, s.dek, s.kicker].flatMap((v) => [v[locale] ?? '', v.fr, v.en ?? '']);
  return norm([...parts, ...(s.body[locale] ?? []), ...s.body.fr, tx(REGION_NAMES[s.region], locale), REGION_NAMES[s.region].fr].join(' '));
}

export default function SearchClient() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [cat, setCat] = useState(params.get('cat') ?? '');
  const [region, setRegion] = useState(params.get('region') ?? '');

  // Keep the URL in sync so a search can be shared or bookmarked.
  useEffect(() => {
    const id = setTimeout(() => {
      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (cat) sp.set('cat', cat);
      if (region) sp.set('region', region);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(id);
  }, [q, cat, region, pathname, router]);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return latest().filter((s) => {
      if (cat && s.category !== cat) return false;
      if (region && s.region !== region) return false;
      const h = haystack(s, locale);
      return words.every((w) => h.includes(w));
    });
  }, [q, cat, region, locale]);

  return (
    <div className="search">
      <form className="search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="q" className="sr-only">
          {t('search.label')}
        </label>
        <SearchIcon width={22} height={22} />
        <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} autoComplete="off" autoFocus />
        {(q || cat || region) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQ('');
              setCat('');
              setRegion('');
            }}
          >
            {t('search.clear')}
          </button>
        )}
      </form>
      <div className="search-filters">
        <label>
          <span>{t('search.category')}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{t('search.any')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('search.region')}</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">{t('search.any')}</option>
            {(Object.keys(REGION_NAMES) as (keyof typeof REGION_NAMES)[]).map((r) => (
              <option key={r} value={r}>
                {tx(REGION_NAMES[r], locale)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="search-count" role="status" aria-live="polite">
        {t('search.results', { n: results.length })}
      </p>
      {results.length ? (
        <div className="row-list">
          {results.map((s) => (
            <StoryCard key={s.slug} story={s} variant="row" headingLevel={2} />
          ))}
        </div>
      ) : (
        <p className="empty">{t('search.noResults')}</p>
      )}
    </div>
  );
}
