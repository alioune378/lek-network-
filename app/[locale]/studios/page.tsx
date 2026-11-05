import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import StudiosForm from '@/components/StudiosForm';
import Photo from '@/components/Photo';
import Division from '@/components/Division';

const SERVICES = ['brand', 'corporate', 'film', 'events', 'ads', 'interviews', 'post'] as const;
const STEPS = ['brief', 'proposal', 'production', 'delivery'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'studios' });
  return { title: t('title'), description: t('intro') };
}

export default async function StudiosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('studios');
  return (
    <>
      <section className="studios-hero">
        <Photo id="film-set" sizes="(min-width: 900px) 50vw, 100vw" priority caption="credit" className="studios-hero-photo" />
        <div className="container studios-hero-in">
          <Division name="studios" tone="dark" />
          <h1 className="studios-title">{t('headline')}</h1>
          <p className="studios-lede">{t('intro')}</p>
          <p className="studios-sep">{t('independence')}</p>
        </div>
      </section>

      <section className="container section" aria-label={t('title')}>
        <ul className="service-grid" role="list">
          {SERVICES.map((s, i) => (
            <li key={s} className="service">
              <span className="service-n">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="service-title">{t(`services.${s}.title`)}</h2>
              <p>{t(`services.${s}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="paper-band">
        <div className="container section studios-bottom">
          <div>
            <h2 className="section-title">{t('process')}</h2>
            <ol className="process">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <span className="process-n">{i + 1}</span>
                  {t(`steps.${s}`)}
                </li>
              ))}
            </ol>
          </div>
          <StudiosForm />
        </div>
      </section>
    </>
  );
}
