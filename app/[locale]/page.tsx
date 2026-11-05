import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, REGION_NAMES, SENEGAL_REGIONS, STORIES, latest, tx } from '@/lib/content';
import { LIVE } from '@/lib/live';
import type { Locale } from '@/lib/locales';
import StoryCard from '@/components/StoryCard';
import Cover from '@/components/Cover';
import DemoBanner from '@/components/DemoBanner';
import { ArrowIcon, PlayIcon } from '@/components/Icons';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();

  const all = latest();
  const lead = all[0];
  const briefing = all.filter((s) => s.slug !== lead.slug).slice(0, 5);
  const secondary = all.filter((s) => s.slug !== lead.slug && s.category !== 'africa' && s.category !== 'diaspora').slice(1, 4);
  const world = all.filter((s) => s.region === 'africa' || s.region === 'diaspora');
  const shown = new Set([lead.slug, ...secondary.map((s) => s.slug), ...world.map((s) => s.slug)]);
  const more = all.filter((s) => !shown.has(s.slug)).slice(0, 6);
  const [featured, ...others] = PROGRAMMES;
  const count = (r: string) => STORIES.filter((s) => s.region === r).length;

  return (
    <>
      <DemoBanner />

      {/* ---------------------------------------------------------------- Lead + L’Essentiel */}
      <section className="container front" aria-labelledby="lead-h">
        <h2 id="lead-h" className="sr-only">
          {t('home.lead')}
        </h2>
        <div className="front-grid">
          <StoryCard story={lead} variant="lead" headingLevel={2} />
          <aside className="briefing" aria-labelledby="brief-h">
            <div className="briefing-head">
              <h2 id="brief-h" className="briefing-title">
                {t('home.briefing')}
              </h2>
              <p className="briefing-intro">{t('home.briefingIntro')}</p>
            </div>
            <ol className="brief-list">
              {briefing.map((s, i) => (
                <StoryCard key={s.slug} story={s} variant="brief" index={i} />
              ))}
            </ol>
            <Link href="/watch/lessentiel" className="briefing-cta">
              <PlayIcon width={16} height={16} /> L’ESSENTIEL · {t('common.inDevelopment')}
            </Link>
          </aside>
        </div>
        <div className="secondary-grid">
          {secondary.map((s) => (
            <StoryCard key={s.slug} story={s} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- LËK Watch band */}
      <section className="watch-band" aria-labelledby="watch-h">
        <div className="container">
          <header className="band-head">
            <div>
              <p className="eyebrow eyebrow-gold">{t('home.watch')}</p>
              <h2 id="watch-h" className="band-title">
                {t('home.watchIntro')}
              </h2>
            </div>
            <Link href="/live" className={`live-chip live-chip-lg ${LIVE.status === 'live' ? 'is-live' : ''}`}>
              <span className="live-dot" aria-hidden="true" />
              {t('home.liveLabel')} · {t(`live.status.${LIVE.status}`)}
            </Link>
          </header>
          <div className="watch-grid">
            <Link href={`/watch/${featured.slug}`} className="prog-hero">
              <Cover {...featured.cover} seed={featured.slug} className="cover" />
              <div className="prog-hero-body">
                <span className="state-pill">{t(`watch.states.${featured.state}`)}</span>
                <h3 className="prog-name">{featured.name}</h3>
                <p>{tx(featured.logline, locale)}</p>
                <span className="prog-format">{tx(featured.format, locale)}</span>
              </div>
            </Link>
            <ul className="prog-rail" role="list">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={`/watch/${p.slug}`} className="prog-tile">
                    <Cover {...p.cover} seed={p.slug} className="cover" />
                    <div className="prog-tile-body">
                      <span className="state-pill">{t(`watch.states.${p.state}`)}</span>
                      <h3 className="prog-tile-name">{p.name}</h3>
                      <p>{tx(p.format, locale)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Latest + regions */}
      <section className="container section split" aria-labelledby="latest-h">
        <div>
          <header className="section-head">
            <h2 id="latest-h" className="section-title">
              {t('home.latest')}
            </h2>
            <Link href="/category/all" className="more-link">
              {t('common.viewAll')} <ArrowIcon width={16} height={16} />
            </Link>
          </header>
          <div className="row-list">
            {more.map((s) => (
              <StoryCard key={s.slug} story={s} variant="row" />
            ))}
          </div>
        </div>
        <aside className="regions-panel" aria-labelledby="regions-h">
          <h2 id="regions-h" className="panel-title">
            {t('home.regions')}
          </h2>
          <p className="panel-intro">{t('home.regionsIntro')}</p>
          <ul className="region-list" role="list">
            {SENEGAL_REGIONS.map((r) => (
              <li key={r}>
                <Link href={`/region/${r}`}>
                  <span>{tx(REGION_NAMES[r], locale)}</span>
                  <span className="region-n">{t('regions.count', { n: count(r) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {/* ---------------------------------------------------------------- Africa & diaspora */}
      <section className="world" aria-labelledby="world-h">
        <div className="container">
          <header className="section-head">
            <div>
              <h2 id="world-h" className="section-title">
                {t('home.world')}
              </h2>
              <p className="section-intro">{t('home.worldIntro')}</p>
            </div>
          </header>
          <div className="world-grid">
            {world.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
            <div className="world-links">
              <Link href="/region/africa" className="world-link">
                {tx(REGION_NAMES.africa, locale)} <ArrowIcon width={18} height={18} />
              </Link>
              <Link href="/region/diaspora" className="world-link">
                {tx(REGION_NAMES.diaspora, locale)} <ArrowIcon width={18} height={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Commitment + Studios */}
      <section className="container section pledge-grid">
        <div className="pledge">
          <p className="eyebrow">{t('home.mission')}</p>
          <h2 className="pledge-title">{t('home.missionTitle')}</h2>
          <p className="pledge-text">{t('home.missionText')}</p>
          <Link href="/standards" className="btn btn-navy">
            {t('home.readCharter')}
          </Link>
        </div>
        <div className="studios-teaser">
          <img src="/brand/lek-icon-light.svg" alt="" width={800} height={800} className="studios-mark" />
          <p className="eyebrow eyebrow-gold">{t('home.studiosTitle')}</p>
          <p className="studios-text">{t('home.studiosText')}</p>
          <Link href="/studios" className="btn btn-gold">
            {t('home.discoverStudios')}
          </Link>
        </div>
      </section>
    </>
  );
}
