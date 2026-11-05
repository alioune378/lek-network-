import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, tx } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import Cover from '@/components/Cover';
import Player from '@/components/Player';
import { ArrowIcon } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'watch' });
  return { title: t('title') };
}

export default async function WatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const [featured, ...rest] = PROGRAMMES;

  return (
    <div className="dark-page">
      <section className="container watch-hero">
        <div className="watch-hero-copy">
          <p className="eyebrow eyebrow-gold">{t('watch.featured')}</p>
          <h1 className="watch-hero-title">{featured.name}</h1>
          <p className="watch-hero-log">{tx(featured.logline, locale)}</p>
          <p className="watch-hero-desc">{tx(featured.description, locale)}</p>
          <p className="prog-format">
            {tx(featured.format, locale)} · {t(`watch.states.${featured.state}`)}
          </p>
          <Link href={`/watch/${featured.slug}`} className="btn btn-gold">
            {t('common.watchProgramme')} <ArrowIcon width={18} height={18} />
          </Link>
        </div>
        <Player title={featured.name} poster={<Cover {...featured.cover} seed={featured.slug} className="cover" />} />
      </section>

      <section className="container section" aria-labelledby="progs-h">
        <header className="section-head">
          <div>
            <h2 id="progs-h" className="section-title">
              {t('watch.programmes')}
            </h2>
            <p className="section-intro">{t('watch.intro')}</p>
          </div>
        </header>
        <ul className="prog-grid" role="list">
          {rest.map((p) => (
            <li key={p.slug}>
              <Link href={`/watch/${p.slug}`} className="prog-card">
                <span className="prog-card-media">
                  <Cover {...p.cover} seed={p.slug} className="cover" />
                  <span className="state-pill">{t(`watch.states.${p.state}`)}</span>
                </span>
                <span className="prog-card-name">{p.name}</span>
                <span className="prog-card-log">{tx(p.logline, locale)}</span>
                <span className="prog-format">{tx(p.format, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
