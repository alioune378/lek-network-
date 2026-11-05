import { setRequestLocale } from 'next-intl/server';
import PublicProfile from '@/components/community/PublicProfile';

export default async function Page({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  return (
    <div className="container-narrow page cm-page">
      <PublicProfile username={username} />
    </div>
  );
}
