import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { STORIES, hasVersion, type Story } from '@/lib/content';
import type { Locale } from '@/lib/locales';
import FeedbackForm from '@/components/community/FeedbackForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'community' });
  return { title: t('feedback.title') };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('community');
  const title = (s: Story) => (hasVersion(s, locale) ? (s.title[locale] ?? s.title.fr) : s.title.fr);
  return (
    <div className="container-narrow page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('feedback.title')}</h1>
        <p className="page-intro">{t('feedback.intro')}</p>
      </header>
      <FeedbackForm articles={STORIES.map((s) => ({ slug: s.slug, title: title(s) }))} />
    </div>
  );
}
