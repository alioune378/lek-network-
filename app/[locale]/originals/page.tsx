import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, tx } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import Cover from '@/components/Cover';
import { ArrowIcon } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'originals' });
  return { title: t('title') };
}

export default async function OriginalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="dark-page">
      <div className="container page">
        <header className="page-head">
          <p className="eyebrow eyebrow-gold">LËK ORIGINALS</p>
          <h1 className="page-title">{t('originals.title')}</h1>
          <p className="page-intro">{t('originals.intro')}</p>
        </header>
        <ol className="slate" role="list">
          {PROGRAMMES.map((p, i) => (
            <li key={p.slug} className="slate-item">
              <Link href={`/watch/${p.slug}`} className="slate-link">
                <span className="slate-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="slate-media">
                  <Cover {...p.cover} seed={p.slug} className="cover" />
                </span>
                <span className="slate-body">
                  <span className="slate-name">{p.name}</span>
                  <span className="slate-log">{tx(p.logline, locale)}</span>
                  <span className="slate-desc">{tx(p.description, locale)}</span>
                  <span className="prog-format">
                    {tx(p.format, locale)} · {t(`watch.states.${p.state}`)}
                  </span>
                </span>
                <ArrowIcon width={22} height={22} className="slate-arrow" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
