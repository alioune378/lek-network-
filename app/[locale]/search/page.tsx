import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SearchClient from '@/components/SearchClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });
  return { title: t('title') };
}

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('search');
  return (
    <div className="container page">
      <header className="page-head">
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-intro">{t('scope')}</p>
      </header>
      <Suspense fallback={<p className="meta">…</p>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
