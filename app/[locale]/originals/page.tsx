import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PROGRAMMES, tx } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import ProgrammeImage from '@/components/ProgrammeImage';
import Division from '@/components/Division';
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
          <Division name="originals" tone="dark" />
          <h1 className="page-title">{t('originals.title')}</h1>
          <p className="page-intro">{t('originals.intro')}</p>
        </header>
        <ol className="slate" role="list">
          {PROGRAMMES.map((p, i) => (
            <li key={p.slug} className="slate-item">
              <Link href={`/watch/${p.slug}`} className="slate-link">
                <span className="slate-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="slate-media">
                  <ProgrammeImage p={p} sizes="(min-width: 900px) 280px, 100vw" />
                </span>
                <span className="slate-body">
                  <span className="slate-name">{p.name}</span>
                  <span className="slate-log">{tx(p.logline, locale)}</span>
                  <span className="slate-desc">{tx(p.description, locale)}</span>
                  <span className="cine-labels">
                    <span className="state-tag state-dev">{t(`watch.states.${p.state}`)}</span>
                    <span>{tx(p.format, locale)}</span>
                  </span>
                </span>
                <ArrowIcon width={22} height={22} className="slate-arrow flip-rtl" />
              </Link>
            </li>
          ))}
        </ol>
        <p className="band-note">{t('home.watchNote')}</p>
      </div>
    </div>
  );
}
