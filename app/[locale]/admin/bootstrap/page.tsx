import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isEnabled } from '@/lib/community/config';
import { BootstrapForm } from '@/components/community/PilotForms';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/** Founder bootstrap. Exists only when the community is enabled; the server refuses once an owner exists. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isEnabled()) notFound();
  const t = await getTranslations('community');
  return (
    <div className="container-narrow page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('bootstrap.title')}</h1>
      </header>
      <BootstrapForm />
    </div>
  );
}
