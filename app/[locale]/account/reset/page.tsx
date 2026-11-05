import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResetForm } from '@/components/community/AccountForms';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('community');
  return (
    <div className="container-narrow page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('auth.newPassword')}</h1>
      </header>
      <ResetForm />
    </div>
  );
}
