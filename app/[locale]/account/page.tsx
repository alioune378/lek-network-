import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AccountPanel } from '@/components/community/AccountForms';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'community' });
  return { title: t('account.title') };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('community');
  return (
    <div className="container-narrow page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('account.title')}</h1>
      </header>
      <AccountPanel />
    </div>
  );
}
