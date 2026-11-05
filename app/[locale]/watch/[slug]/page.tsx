import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, STORIES, programmeBySlug, tx } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import Cover from '@/components/Cover';
import Player from '@/components/Player';
import StoryCard from '@/components/StoryCard';

export function generateStaticParams() {
  return PROGRAMMES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = programmeBySlug(slug);
  return p ? { title: p.name, description: tx(p.logline, locale as Locale) } : {};
}

export default async function ProgrammePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const p = programmeBySlug(slug);
  if (!p) notFound();
  const t = await getTranslations();
  const stories = STORIES.filter((s) => s.programme === p.slug);

  return (
    <div className="dark-page">
      <section className="prog-banner">
        <Cover {...p.cover} seed={p.slug} className="cover prog-banner-art" />
        <div className="container prog-banner-in">
          <Link href="/watch" className="crumb-light">
            LËK Watch
          </Link>
          <span className="state-pill">{t(`watch.states.${p.state}`)}</span>
          <h1 className="prog-banner-title">{p.name}</h1>
          <p className="prog-banner-log">{tx(p.logline, locale)}</p>
        </div>
      </section>

      <div className="container prog-layout">
        <div>
          <h2 className="sub-title">{t('watch.trailer')}</h2>
          <Player title={`${p.name} — ${t('watch.trailer')}`} poster={<Cover {...p.cover} seed={`${p.slug}-trailer`} className="cover" />} />
          <p className="prog-desc">{tx(p.description, locale)}</p>

          {p.seasons.map((season) => (
            <section key={season.n} className="season" aria-labelledby={`s${season.n}`}>
              <h2 id={`s${season.n}`} className="sub-title">
                {t('watch.season', { n: season.n })} · {t('watch.episodes')}
              </h2>
              <ol className="episodes">
                {season.episodes.map((e) => (
                  <li key={e.n} className="episode">
                    <span className="episode-n">{String(e.n).padStart(2, '0')}</span>
                    <span className="episode-body">
                      <span className="episode-title">{tx(e.title, locale)}</span>
                      <span className="meta">
                        {t(`watch.states.${e.state}`)}
                        {e.duration ? ` · ${e.duration}` : ''}
                        {e.subtitles?.length ? ` · ${t('watch.subtitles')}: ${e.subtitles.join(', ').toUpperCase()}` : ''}
                        {e.transcript ? ` · ${t('watch.transcript')}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <aside className="prog-side">
          <dl className="prog-facts">
            <div>
              <dt>{t('watch.format')}</dt>
              <dd>{tx(p.format, locale)}</dd>
            </div>
            <div>
              <dt>{t('watch.distribution')}</dt>
              <dd>{tx(p.distribution, locale)}</dd>
            </div>
            <div>
              <dt>{t('watch.credits')}</dt>
              <dd>
                <ul>
                  {p.credits.map((c, i) => (
                    <li key={i}>
                      <span className="credit-role">{tx(c.role, locale)}</span> {c.name}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {stories.length > 0 && (
        <section className="paper-band">
          <div className="container section">
            <h2 className="section-title">{t('article.related')}</h2>
            <div className="secondary-grid">
              {stories.map((s) => (
                <StoryCard key={s.slug} story={s} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
