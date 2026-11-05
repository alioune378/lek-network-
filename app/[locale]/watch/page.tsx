import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, tx, type Programme } from '@/lib/content';
import { photo, ptx } from '@/lib/media';
import { LIVE } from '@/lib/live';
import type { Locale } from '@/lib/locales';
import Photo from '@/components/Photo';
import Cover from '@/components/Cover';
import Division from '@/components/Division';
import { ArrowIcon } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'watch' });
  return { title: t('title'), description: t('intro') };
}

const COLLECTIONS: { key: string; kinds: Programme['kind'][] }[] = [
  { key: 'documentaries', kinds: ['documentary', 'investigation'] },
  { key: 'interviews', kinds: ['interview'] },
  { key: 'series', kinds: ['series', 'briefing'] },
];

export default async function WatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const featured = PROGRAMMES.find((p) => p.slug === 'senegal-reel') ?? PROGRAMMES[0];
  const fp = photo(featured.photo);

  const card = (p: Programme, big = false) => (
    <Link href={`/watch/${p.slug}`} className={`cine-card ${big ? 'cine-card-big' : ''}`}>
      <span className="cine-card-media">
        {p.photo ? <Photo id={p.photo} sizes={big ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, 80vw'} decorative className="media-fill" /> : <Cover {...p.cover} seed={p.slug} className="cover media-fill" />}
        <span className="cine-card-state">{t(`watch.states.${p.state}`)}</span>
      </span>
      <span className="cine-card-body">
        <span className="cine-card-kind">
          {t(`watch.kinds.${p.kind}`)}
          {p.runtime ? ` · ${p.runtime}` : ''}
        </span>
        <span className="cine-card-name">{p.name}</span>
        <span className="cine-card-log">{tx(p.logline, locale)}</span>
        <span className="cine-card-eps">{t('watch.plannedEpisodes', { n: p.seasons.reduce((a, s) => a + s.episodes.length, 0) })}</span>
      </span>
    </Link>
  );

  return (
    <div className="dark-page watch-page">
      <section className="watch-cine" aria-labelledby="wf-h">
        {fp && <Photo id={fp.id} sizes="100vw" priority decorative className="watch-cine-photo" />}
        <div className="container watch-cine-in">
          <Division name="watch" tone="dark" />
          <p className="cine-labels">
            <span className="state-tag state-dev">{t(`watch.states.${featured.state}`)}</span>
            <span>{t(`watch.kinds.${featured.kind}`)}</span>
            {featured.runtime && <span>{featured.runtime}</span>}
          </p>
          <h1 id="wf-h" className="watch-cine-title">
            {featured.name}
          </h1>
          <p className="watch-cine-log">{tx(featured.logline, locale)}</p>
          <div className="watch-cine-actions">
            <Link href={`/watch/${featured.slug}`} className="btn btn-gold">
              {t('common.watchProgramme')} <ArrowIcon width={18} height={18} className="flip-rtl" />
            </Link>
            <Link href="/live" className={`live-chip live-chip-lg ${LIVE.status === 'live' ? 'is-live' : ''}`}>
              <span className="live-dot" aria-hidden="true" />
              LËK Live · {t(`live.status.${LIVE.status}`)}
            </Link>
          </div>
          {fp && (
            <p className="watch-cine-note">
              {t('watch.moodImage', { place: ptx(fp.place, locale) })} · {fp.author}, {fp.license}
            </p>
          )}
        </div>
      </section>

      <div className="container watch-intro">
        <p>{t('watch.intro')}</p>
        <dl className="state-legend" aria-label={t('watch.availability')}>
          {(['available', 'in-production', 'in-development'] as const).map((s) => (
            <div key={s}>
              <dt>
                <span className={`state-dot state-dot-${s}`} aria-hidden="true" />
                {t(`watch.states.${s}`)}
              </dt>
              <dd>{t(`watch.stateHelp.${s}`)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {COLLECTIONS.map((c) => {
        const items = PROGRAMMES.filter((p) => c.kinds.includes(p.kind));
        if (!items.length) return null;
        return (
          <section key={c.key} className="container watch-collection" aria-labelledby={`col-${c.key}`}>
            <header className="collection-head">
              <h2 id={`col-${c.key}`} className="collection-title">
                {t(`watch.collections.${c.key}.title`)}
              </h2>
              <p className="collection-intro">{t(`watch.collections.${c.key}.intro`)}</p>
            </header>
            <ul className={`cine-grid cine-grid-${items.length}`} role="list">
              {items.map((p, i) => (
                <li key={p.slug}>{card(p, items.length > 1 && i === 0)}</li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="container watch-originals">
        <Division name="originals" tone="dark" />
        <p>{t('originals.intro')}</p>
        <Link href="/originals" className="more-link more-link-light">
          {t('originals.slate')} <ArrowIcon width={16} height={16} className="flip-rtl" />
        </Link>
      </section>
    </div>
  );
}
