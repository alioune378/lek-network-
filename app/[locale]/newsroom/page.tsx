import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Newsroom from '@/components/Newsroom';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'newsroom' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function NewsroomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('newsroom');
  return (
    <div className="container page newsroom-page">
      <header className="page-head">
        <p className="eyebrow">CMS · PROTOTYPE</p>
        <h1 className="page-title">{t('title')}</h1>
        <p className="notice notice-warn" role="note">
          {t('warning')}
        </p>
      </header>
      <Newsroom />
    </div>
  );
}
