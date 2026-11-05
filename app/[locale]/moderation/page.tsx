import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isEnabled } from '@/lib/community/config';
import { getViewer } from '@/lib/community/service';
import { can } from '@/lib/community/permissions';
import ModerationConsole from '@/components/community/ModerationConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/** Moderators only: the session and staff role are checked here on the server, and again by every API call. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isEnabled()) notFound();
  const viewer = await getViewer(await headers());
  if (!can.moderate(viewer)) notFound();
  const t = await getTranslations('community');
  return (
    <div className="container page cm-page">
      <header className="page-head">
        <p className="eyebrow">LËK COMMUNITY</p>
        <h1 className="page-title">{t('mod.title')}</h1>
      </header>
      <ModerationConsole canManageStaff={can.manageStaff(viewer)} canInvite={can.invite(viewer)} canSeePilot={can.pilotResults(viewer)} />
    </div>
  );
}
