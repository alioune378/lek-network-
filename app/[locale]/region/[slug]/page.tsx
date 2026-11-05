import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { REGION_NAMES, SENEGAL_REGIONS, latest, tx, type RegionSlug } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import StoryCard from '@/components/StoryCard';
import Photo from '@/components/Photo';
import { REGION_PHOTO, photo, ptx } from '@/lib/media';
import DemoBanner from '@/components/DemoBanner';

const ALL = Object.keys(REGION_NAMES) as RegionSlug[];
const isRegion = (s: string): s is RegionSlug => (ALL as string[]).includes(s);

export function generateStaticParams() {
  return ALL.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return { title: isRegion(slug) ? tx(REGION_NAMES[slug], locale as Locale) : undefined };
}

export default async function RegionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  if (!isRegion(slug)) notFound();
  const t = await getTranslations();
  const items = latest().filter((s) => s.region === slug);
  const world = slug === 'africa' || slug === 'diaspora';
  const ph = photo(REGION_PHOTO[slug]);

  return (
    <>
      <DemoBanner />
      <header className="place-banner">
        {ph && <Photo id={ph.id} sizes="100vw" priority decorative className="place-banner-photo" />}
        <div className="container place-banner-in">
          <p className="eyebrow eyebrow-light">{world ? t('home.world') : `${t('regions.title')} · ${t('regions.senegal')}`}</p>
          <h1 className="place-banner-title">{tx(REGION_NAMES[slug], locale)}</h1>
          <p className="place-banner-intro">{world ? t('home.worldIntro') : t('regions.intro')}</p>
          {ph && (
            <p className="place-banner-credit">
              {ptx(ph.place, locale)} · {ph.author}, {ph.license === 'Public domain' ? t('media.publicDomain') : ph.license}
            </p>
          )}
        </div>
      </header>
      <div className="container page page-after-banner">
        {!world && (
          <nav className="chips" aria-label={t('regions.title')}>
            {SENEGAL_REGIONS.map((r) => (
              <Link key={r} href={`/region/${r}`} className="chip" aria-current={r === slug ? 'page' : undefined}>
                {tx(REGION_NAMES[r], locale)}
              </Link>
            ))}
          </nav>
        )}
        {items.length ? (
          <div className="card-grid">
            {items.map((s) => (
              <StoryCard key={s.slug} story={s} headingLevel={2} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>{t('regions.empty')}</p>
            <p className="empty-hint">{t('regions.emptyHint')}</p>
          </div>
        )}
      </div>
    </>
  );
}
