import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RegisterForm } from '@/components/community/AccountForms';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'community' });
  return { title: t('auth.register') };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('community');
  return (
    <div className="container-narrow page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('auth.registerTitle')}</h1>
        <p className="page-intro">{t('auth.registerIntro')}</p>
      </header>
      <RegisterForm />
    </div>
  );
}
