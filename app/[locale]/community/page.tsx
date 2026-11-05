import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const RULES = ['respect', 'disagree', 'facts', 'privacy', 'noSpam', 'identity', 'language'] as const;
const LADDER = ['educational_notice', 'warning', 'remove_comment', 'restrict', 'suspend', 'escalate'] as const;
const NEVER = ['politics', 'officials', 'satire', 'unpopular'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'community' });
  return { title: t('about.title'), description: t('about.intro') };
}

/** LËK Community: guidelines, accountability ladder, privacy commitments. Static, readable without an account. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('community');
  const mode = process.env.NEXT_PUBLIC_COMMUNITY_MODE ?? 'off';
  return (
    <div className="container-narrow page cm-page standards">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('about.title')}</h1>
        <p className="cm-motto" lang="fr" dir="ltr">
          Votre voix compte.
        </p>
        <p className="page-intro">{t('about.intro')}</p>
        {mode === 'off' && (
          <p className="notice" role="note">
            {t('disabled')}
          </p>
        )}
        {mode === 'demo' && (
          <p className="notice" role="note">
            {t('demoBanner')}
          </p>
        )}
      </header>

      <section aria-labelledby="g-h">
        <h2 id="g-h" className="section-title">
          {t('about.guidelinesTitle')}
        </h2>
        <ol className="charter">
          {RULES.map((r, i) => (
            <li key={r}>
              <span className="charter-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="charter-title">{t(`about.rules.${r}.title`)}</h3>
                <p>{t(`about.rules.${r}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="transparency" aria-labelledby="n-h">
        <h2 id="n-h" className="box-title">
          {t('about.neverTitle')}
        </h2>
        <ul>
          {NEVER.map((n) => (
            <li key={n}>{t(`about.never.${n}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="l-h" className="cm-ladder-sec">
        <h2 id="l-h" className="section-title">
          {t('about.ladderTitle')}
        </h2>
        <p>{t('about.ladderIntro')}</p>
        <ol className="cm-ladder">
          {LADDER.map((s, i) => (
            <li key={s}>
              <span className="cm-ladder-n">{i + 1}</span>
              <div>
                <h3>{t(`ladder.${s}`)}</h3>
                <p>{t(`about.ladderText.${s}`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p>{t('about.appeals')}</p>
      </section>

      <section className="transparency" aria-labelledby="p-h">
        <h2 id="p-h" className="box-title">
          {t('about.privacyTitle')}
        </h2>
        <p>{t('about.privacyText')}</p>
        <p>
          <Link href="/privacy">{t('about.privacyLink')}</Link>
        </p>
      </section>

      <section className="transparency" aria-labelledby="s-h">
        <h2 id="s-h" className="box-title">
          {t('about.staffTitle')}
        </h2>
        <p>{t('about.staffText')}</p>
      </section>

      <div className="cm-cta-row">
        <Link href="/feedback" className="btn btn-gold">
          {t('feedback.title')}
        </Link>
        {mode !== 'off' && (
          <Link href="/account/register" className="btn btn-navy">
            {t('auth.register')}
          </Link>
        )}
      </div>
    </div>
  );
}
