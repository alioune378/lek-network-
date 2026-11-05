import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { REGION_NAMES, SENEGAL_REGIONS, STORIES, latest, tx } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import StoryCard from '@/components/StoryCard';
import { ArrowIcon } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'regions' });
  return { title: t('title') };
}

export default async function RegionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">{t('regions.senegal')}</p>
        <h1 className="page-title">{t('home.regions')}</h1>
        <p className="page-intro">{t('home.regionsIntro')}</p>
      </header>
      <div className="region-cards">
        {SENEGAL_REGIONS.map((r) => {
          const top = latest().find((s) => s.region === r);
          const n = STORIES.filter((s) => s.region === r).length;
          return (
            <section key={r} className="region-card" aria-labelledby={`r-${r}`}>
              <header>
                <h2 id={`r-${r}`} className="region-card-title">
                  <Link href={`/region/${r}`}>
                    {tx(REGION_NAMES[r], locale)} <ArrowIcon width={18} height={18} />
                  </Link>
                </h2>
                <p className="meta">{t('regions.count', { n })}</p>
              </header>
              {top ? <StoryCard story={top} variant="compact" /> : <p className="empty-hint">{t('regions.emptyHint')}</p>}
            </section>
          );
        })}
        <section className="region-card region-card-future">
          <h2 className="region-card-title">{t('regions.future')}</h2>
          <p className="empty-hint">Diourbel · Fatick · Kaffrine · Kédougou · Kolda · Louga · Matam · Sédhiou</p>
        </section>
      </div>
    </div>
  );
}
