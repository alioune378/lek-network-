import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PHOTOS, ptx, src } from '@/lib/media';
import type { Locale } from '@/lib/locales';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'credits' });
  return { title: t('title') };
}

/** Every photograph used on the site, with author, year, licence and source. */
export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">LËK NETWORK</p>
        <h1 className="page-title">{t('credits.title')}</h1>
        <p className="page-intro">{t('credits.intro')}</p>
        <p className="notice" role="note">
          {t('credits.rule')}
        </p>
      </header>
      <ul className="credit-grid" role="list">
        {Object.values(PHOTOS).map((p) => (
          <li key={p.id} className="credit-item">
            <img src={src(p, 640)} alt={ptx(p.alt, locale)} width={p.w} height={p.h} loading="lazy" decoding="async" style={p.pos ? { objectPosition: p.pos } : undefined} />
            <div>
              <p className="credit-place">
                {ptx(p.place, locale)}
                {p.archive && <span className="photo-tag">{t('media.archive')}</span>}
              </p>
              <p className="meta">
                {p.author}, {p.year} ·{' '}
                {p.licenseUrl ? (
                  <a href={p.licenseUrl} rel="license noopener noreferrer" target="_blank">
                    {p.license}
                  </a>
                ) : (
                  t('media.publicDomain')
                )}{' '}
                ·{' '}
                <a href={p.source} rel="noopener noreferrer" target="_blank">
                  Wikimedia Commons
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <section className="transparency">
        <h2 className="box-title">{t('credits.brandTitle')}</h2>
        <p>{t('credits.brandText')}</p>
      </section>
    </div>
  );
}
