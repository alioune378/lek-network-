import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isEnabled } from '@/lib/community/config';
import { getViewer } from '@/lib/community/service';
import { can } from '@/lib/community/permissions';
import Inbox from '@/components/community/Inbox';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/** Staff only: "Votre voix compte" submissions. Checked here and by every API call. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isEnabled()) notFound();
  const viewer = await getViewer(await headers());
  if (!can.inbox(viewer)) notFound();
  const t = await getTranslations('community');
  return (
    <div className="container page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK NEWSROOM</p>
        <h1 className="page-title">{t('inbox.title')}</h1>
      </header>
      <Inbox />
    </div>
  );
}
