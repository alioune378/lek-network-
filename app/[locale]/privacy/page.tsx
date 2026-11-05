import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

const ITEMS = ['collected', 'storage', 'forms', 'newsroom', 'thirdParty', 'launch'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('title') };
}

/** Describes what this prototype actually does with data — nothing more is promised. */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('privacy');
  // With the community open, "nothing collected" is no longer true: that item is replaced by the community's data practices.
  const on = (process.env.NEXT_PUBLIC_COMMUNITY_MODE ?? 'off') !== 'off';
  const items: string[] = on ? [...ITEMS.filter((x) => x !== 'collected'), 'community'] : [...ITEMS];
  return (
    <div className="container-narrow page standards">
      <header className="page-head">
        <p className="eyebrow">LËK NETWORK</p>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-intro">{t('intro')}</p>
        <p className="notice" role="note">
          {t('status')}
        </p>
      </header>
      <ol className="charter">
        {items.map((s, i) => (
          <li key={s} id={s}>
            <span className="charter-n">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 className="charter-title">{t(`items.${s}.title`)}</h2>
              <p>{t(`items.${s}.text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
