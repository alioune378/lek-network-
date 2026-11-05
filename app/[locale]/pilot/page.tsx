import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PilotQuestionnaire } from '@/components/community/PilotForms';

export const metadata = { robots: { index: false, follow: false } };

/** Private pilot guide and usability questionnaire (pilot/demo modes only). */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('community');
  return (
    <div className="container-narrow page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY · PILOTE</p>
        <h1 className="page-title">{t('pilot.title')}</h1>
        <p className="page-intro">{t('pilot.intro')}</p>
      </header>
      <section className="cm-card" aria-labelledby="pg-h">
        <h2 id="pg-h" className="cm-card-title">{t('pilot.guideTitle')}</h2>
        <ol className="cm-steps">
          {(['g1', 'g2', 'g3', 'g4', 'g5'] as const).map((k) => (
            <li key={k}>{t(`pilot.guide.${k}`)}</li>
          ))}
        </ol>
        <p className="cm-hint">{t('pilot.languages')}</p>
      </section>
      <PilotQuestionnaire />
    </div>
  );
}
