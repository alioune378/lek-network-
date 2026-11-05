import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CATEGORIES, latest, type Category } from '@/lib/content';
import StoryCard from '@/components/StoryCard';
import DemoBanner from '@/components/DemoBanner';
import Division from '@/components/Division';

const isCat = (s: string): s is Category => (CATEGORIES as string[]).includes(s);

export function generateStaticParams() {
  return ['all', ...CATEGORIES].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'categories' });
  return { title: slug === 'all' ? t('all') : isCat(slug) ? t(slug) : undefined };
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (slug !== 'all' && !isCat(slug)) notFound();
  const t = await getTranslations();
  const items = latest().filter((s) => slug === 'all' || s.category === slug);
  const [first, ...rest] = items;

  return (
    <>
      <DemoBanner />
      <div className="container page">
        <header className="page-head">
          <Division name="news" />
          <h1 className="page-title">{slug === 'all' ? t('categories.all') : t(`categories.${slug}`)}</h1>
        </header>
        <nav className="chips" aria-label={t('search.category')}>
          <Link href="/category/all" className="chip" aria-current={slug === 'all' ? 'page' : undefined}>
            {t('categories.all')}
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/category/${c}`} className="chip" aria-current={slug === c ? 'page' : undefined}>
              {t(`categories.${c}`)}
            </Link>
          ))}
        </nav>
        {first ? (
          <>
            <div className="listing-lead">
              <StoryCard story={first} variant="lead" headingLevel={2} />
            </div>
            <div className="card-grid">
              {rest.map((s) => (
                <StoryCard key={s.slug} story={s} headingLevel={2} />
              ))}
            </div>
          </>
        ) : (
          <p className="empty">{t('regions.empty')}</p>
        )}
      </div>
    </>
  );
}
