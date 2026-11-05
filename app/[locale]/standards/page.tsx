import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

const SECTIONS = ['independence', 'sourcing', 'verification', 'reply', 'corrections', 'ai', 'translation'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'standards' });
  return { title: t('title') };
}

export default async function StandardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('standards');
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
        {SECTIONS.map((s, i) => (
          <li key={s} id={s}>
            <span className="charter-n">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 className="charter-title">{t(`sections.${s}.title`)}</h2>
              <p>{t(`sections.${s}.text`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="transparency" aria-labelledby="err-h">
        <h2 id="err-h" className="box-title">
          {t('contact')}
        </h2>
        <p>{t('contactText')}</p>
      </section>
    </div>
  );
}
