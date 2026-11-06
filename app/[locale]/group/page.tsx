import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { DIVISIONS, LOGO, MOTTO, SITE_DIVISION, type Division } from '@/lib/brand';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'group' });
  return { title: t('title') };
}

/** LËK Network, the parent company: a short group page until it gets its own site (brand migration phase 3). */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('group');
  const order: Division[] = ['info', 'media', 'productions'];
  return (
    <div className="container-narrow page group-page">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-title">{t('title')}</h1>
        <p className="group-motto" lang="fr" dir="ltr">
          {MOTTO}
        </p>
        <p className="page-intro">{t('intro')}</p>
      </header>
      <h2 className="section-title">{t('divisionsTitle')}</h2>
      <ul className="group-divisions" role="list">
        {order.map((d) => (
          <li key={d} className={`group-division ${d === SITE_DIVISION ? 'is-here' : ''}`}>
            {d === 'info' ? (
              <img src={LOGO.horizontalOnLight.src} alt={DIVISIONS.info.name} width={LOGO.horizontalOnLight.width} height={LOGO.horizontalOnLight.height} className="group-logo" />
            ) : (
              <h3 className="group-name">{DIVISIONS[d].name}</h3>
            )}
            <p className="group-status">
              <span className={`group-pill is-${DIVISIONS[d].status}`}>{t(`status.${DIVISIONS[d].status}`)}</span>
              {d === SITE_DIVISION && <span> {t('here')}</span>}
            </p>
            <p>{t(`roles.${d}`)}</p>
            {d === 'productions' && (
              <p className="cm-hint">
                {t('studios')} <Link href="/studios">{t('studiosLink')}</Link>
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="cm-hint">{t('clearance')}</p>
      <p>
        <Link href="/standards#contact">{t('contact')}</Link>
      </p>
    </div>
  );
}
