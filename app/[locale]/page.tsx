import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, REGION_NAMES, SENEGAL_REGIONS, latest, tx } from '@/lib/content';
import { REGION_PHOTO } from '@/lib/media';
import { LIVE } from '@/lib/live';
import type { Locale } from '@/lib/locales';
import StoryCard from '@/components/StoryCard';
import Photo from '@/components/Photo';
import Division from '@/components/Division';
import DemoBanner from '@/components/DemoBanner';
import { ArrowIcon, PlayIcon } from '@/components/Icons';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Editorial allocation: one lead, a five-item briefing, a varied secondary row,
  // a compact stream, then regional, continental and diaspora coverage.
  const all = latest();
  const lead = all[0];
  const briefing = all.slice(1, 6);
  const world = all.filter((s) => s.region === 'africa' || s.region === 'diaspora');
  const pool = all.filter((s) => s.slug !== lead.slug && !world.includes(s));
  const withPhoto = pool.filter((s) => s.photo);
  const feature = withPhoto[0];
  const sides = withPhoto.slice(1, 3);
  const textStory = pool.find((s) => !s.photo) ?? withPhoto[3];
  const stream = all.filter((s) => s.slug !== lead.slug).slice(0, 7);
  const [featured, ...others] = PROGRAMMES.filter((p) => p.slug !== 'lessentiel').concat(PROGRAMMES.filter((p) => p.slug === 'lessentiel'));
  const regionStories = (r: string) => all.filter((s) => s.region === r);
  const isLive = LIVE.status === 'live';

  return (
    <>
      <DemoBanner />

      {/* ------------------------------------------------------------ Front: lead + L’Essentiel */}
      <section className="container front" aria-labelledby="lead-h">
        <h2 id="lead-h" className="sr-only">
          {t('home.lead')}
        </h2>
        <div className="front-grid">
          <StoryCard story={lead} variant="lead" headingLevel={2} priority />
          <aside className="briefing" aria-labelledby="brief-h">
            <header className="briefing-head">
              <Division name="news" as="span" />
              <h2 id="brief-h" className="briefing-title">
                {t('home.briefing')}
              </h2>
              <p className="briefing-intro">{t('home.briefingIntro')}</p>
            </header>
            <ol className="brief-list" role="list">
              {briefing.map((s, i) => (
                <StoryCard key={s.slug} story={s} variant="brief" index={i} />
              ))}
            </ol>
            <Link href="/watch/lessentiel" className="briefing-cta">
              <PlayIcon width={14} height={14} />
              <span>{t('home.briefingVideo')}</span>
              <span className="state-tag">{t('common.inDevelopment')}</span>
            </Link>
          </aside>
        </div>

        <div className="second-grid">
          {feature && <StoryCard story={feature} variant="feature" />}
          <div className="second-sides">
            {sides.map((s) => (
              <StoryCard key={s.slug} story={s} variant="side" />
            ))}
          </div>
          {textStory && <StoryCard story={textStory} variant="text" />}
        </div>
      </section>

      {/* ------------------------------------------------------------ LËK Watch feature */}
      <section className="watch-band" aria-labelledby="watch-h">
        <div className="container">
          <header className="band-head">
            <div>
              <Division name="watch" tone="dark" />
              <h2 id="watch-h" className="band-title">
                {t('home.watchIntro')}
              </h2>
            </div>
            <Link href="/live" className={`live-chip live-chip-lg ${isLive ? 'is-live' : ''}`}>
              <span className="live-dot" aria-hidden="true" />
              {t('home.liveLabel')} · {t(`live.status.${LIVE.status}`)}
            </Link>
          </header>

          <Link href={`/watch/${featured.slug}`} className="cine-hero">
            {featured.photo && <Photo id={featured.photo} sizes="(min-width: 1280px) 1200px, 100vw" decorative caption="credit" className="media-fill" />}
            <div className="cine-hero-body">
              <p className="cine-labels">
                <span className="state-tag state-dev">{t(`watch.states.${featured.state}`)}</span>
                <span>{t(`watch.kinds.${featured.kind}`)}</span>
                {featured.runtime && <span>{featured.runtime}</span>}
              </p>
              <h3 className="cine-title">{featured.name}</h3>
              <p className="cine-logline">{tx(featured.logline, locale)}</p>
              <span className="cine-cta">
                {t('common.watchProgramme')} <ArrowIcon width={16} height={16} className="flip-rtl" />
              </span>
            </div>
          </Link>

          <ul className="poster-rail" role="list" aria-label={t('watch.programmes')}>
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/watch/${p.slug}`} className="poster">
                  <span className="poster-media">
                    {p.photo && <Photo id={p.photo} sizes="(min-width: 1024px) 300px, 70vw" decorative className="media-fill" />}
                    <span className="poster-state">{t(`watch.states.${p.state}`)}</span>
                  </span>
                  <span className="poster-kind">
                    {t(`watch.kinds.${p.kind}`)}
                    {p.runtime ? ` · ${p.runtime}` : ''}
                  </span>
                  <span className="poster-name">{p.name}</span>
                  <span className="poster-line">{tx(p.logline, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="band-note">{t('home.watchNote')}</p>
        </div>
      </section>

      {/* ------------------------------------------------------------ Latest stream + commitment */}
      <section className="container section stream-grid" aria-labelledby="latest-h">
        <div>
          <header className="section-head">
            <h2 id="latest-h" className="section-title">
              {t('home.latest')}
            </h2>
            <Link href="/category/all" className="more-link">
              {t('common.viewAll')} <ArrowIcon width={16} height={16} className="flip-rtl" />
            </Link>
          </header>
          <ol className="stream" role="list">
            {stream.map((s) => (
              <StoryCard key={s.slug} story={s} variant="stream" />
            ))}
          </ol>
        </div>
        <aside className="pledge-card" aria-labelledby="pledge-h">
          <p className="eyebrow">{t('home.mission')}</p>
          <h2 id="pledge-h" className="pledge-title">
            {t('home.missionTitle')}
          </h2>
          <p className="pledge-text">{t('home.missionText')}</p>
          <Link href="/standards" className="more-link">
            {t('home.readCharter')} <ArrowIcon width={16} height={16} className="flip-rtl" />
          </Link>
        </aside>
      </section>

      {/* ------------------------------------------------------------ Senegal, region by region */}
      <section className="regions-band" aria-labelledby="regions-h">
        <div className="container">
          <header className="section-head">
            <div>
              <h2 id="regions-h" className="section-title">
                {t('home.regions')}
              </h2>
              <p className="section-intro">{t('home.regionsIntro')}</p>
            </div>
            <Link href="/regions" className="more-link">
              {t('nav.regions')} <ArrowIcon width={16} height={16} className="flip-rtl" />
            </Link>
          </header>
          <ul className="region-tiles" role="list">
            {SENEGAL_REGIONS.map((r) => {
              const top = regionStories(r)[0];
              const n = regionStories(r).length;
              return (
                <li key={r} className={`region-tile region-${r}`}>
                  <Link href={`/region/${r}`} className="region-tile-link">
                    <Photo id={REGION_PHOTO[r]} sizes="(min-width: 1024px) 33vw, 50vw" decorative className="media-fill" />
                    <span className="region-tile-body">
                      <span className="region-tile-name">{tx(REGION_NAMES[r], locale)}</span>
                      <span className="region-tile-n">{t('regions.count', { n })}</span>
                      {top && r === 'dakar' && (
                        <span className="region-tile-top" lang={top.title[locale] ? undefined : 'fr'} dir={top.title[locale] ? undefined : 'ltr'}>
                          {top.title[locale] ?? top.title.fr}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ Africa & diaspora */}
      <section className="container section" aria-labelledby="world-h">
        <header className="section-head">
          <div>
            <h2 id="world-h" className="section-title">
              {t('home.world')}
            </h2>
            <p className="section-intro">{t('home.worldIntro')}</p>
          </div>
        </header>
        <div className="world-pair">
          {world.map((s) => (
            <div key={s.slug} className={`world-panel world-${s.region}`}>
              <p className="world-label">
                <Link href={`/region/${s.region}`}>
                  {tx(REGION_NAMES[s.region], locale)} <ArrowIcon width={14} height={14} className="flip-rtl" />
                </Link>
              </p>
              <StoryCard story={s} variant="overlay" />
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ LËK Studios preview */}
      <section className="studios-band" aria-labelledby="studios-h">
        <Photo id="film-set" sizes="(min-width: 900px) 50vw, 100vw" decorative caption="credit" className="studios-band-photo" />
        <div className="container studios-band-in">
          <Division name="studios" tone="dark" />
          <h2 id="studios-h" className="studios-band-title">
            {t('studios.headline')}
          </h2>
          <p className="studios-band-text">{t('home.studiosText')}</p>
          <ul className="studios-band-list" role="list">
            {(['brand', 'film', 'events', 'post'] as const).map((k) => (
              <li key={k}>{t(`studios.services.${k}.title`)}</li>
            ))}
          </ul>
          <Link href="/studios" className="btn btn-gold">
            {t('home.discoverStudios')}
          </Link>
        </div>
      </section>
    </>
  );
}
