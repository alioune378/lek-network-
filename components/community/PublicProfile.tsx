'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MODE, api } from './client';
import Avatar from './Avatar';
import { CommunityOff } from './AccountForms';

type P = {
  username: string; displayName: string; bio: string | null; region: string | null; interests: string[]; joined: string;
  staff: { role: string; title: string } | null; stats: { comments: number; repliesReceived: number; helpful: number };
  historyVisible: boolean; history: { id: string; article: string; excerpt: string; lang: string; createdAt: string; edited: boolean }[];
};

/** Public member profile: only what the member chose to show. No email, no moderation record. */
export default function PublicProfile({ username }: { username: string }) {
  const t = useTranslations('community');
  const [p, setP] = useState<P | null | 'missing'>(null);
  useEffect(() => {
    if (MODE === 'off') return;
    api<P>(`/api/community/users/${encodeURIComponent(username)}`).then((r) => setP(r.ok ? r.data : 'missing'));
  }, [username]);
  if (MODE === 'off') return <CommunityOff />;
  if (p === null) return <p className="cm-note">{t('loading')}</p>;
  if (p === 'missing') return <p className="cm-note">{t('profile.missing')}</p>;
  const [y, m] = p.joined.split('-').map(Number);
  const joined = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 15)));
  return (
    <div className="cm-profile">
      <header className="cm-profile-head">
        <Avatar name={p.displayName} staff={Boolean(p.staff)} size={72} />
        <div>
          <h1 className="page-title cm-profile-name" dir="auto">
            {p.displayName}
          </h1>
          <p className="cm-handle">@{p.username}</p>
          {p.staff && <p className="cm-staff">{t('comments.staffBadge')} · {p.staff.title}</p>}
          <p className="cm-hint">
            {t('profile.joined', { date: joined })}
            {p.region && <> · {p.region}</>}
          </p>
        </div>
      </header>
      {p.bio && (
        <p className="cm-bio" dir="auto">
          {p.bio}
        </p>
      )}
      {p.interests.length > 0 && (
        <ul className="cm-tags" role="list" aria-label={t('account.interests')}>
          {p.interests.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
      <dl className="cm-stats">
        <div>
          <dt>{t('profile.comments')}</dt>
          <dd>{p.stats.comments}</dd>
        </div>
        <div>
          <dt>{t('profile.replies')}</dt>
          <dd>{p.stats.repliesReceived}</dd>
        </div>
        <div>
          <dt>{t('profile.helpful')}</dt>
          <dd>{p.stats.helpful}</dd>
        </div>
      </dl>
      <section aria-labelledby="cm-hist">
        <h2 id="cm-hist" className="section-title">
          {t('profile.history')}
        </h2>
        {!p.historyVisible ? (
          <p className="cm-hint">{t('profile.historyHidden')}</p>
        ) : p.history.length === 0 ? (
          <p className="cm-hint">{t('comments.empty')}</p>
        ) : (
          <ol className="cm-history" role="list">
            {p.history.map((h) => (
              <li key={h.id}>
                <Link href={`/article/${h.article}#c-${h.id}`} className="cm-history-link">
                  <span lang={h.lang} dir="auto">
                    {h.excerpt}
                  </span>
                </Link>
                <time className="cm-hint" dateTime={h.createdAt}>
                  {new Date(h.createdAt).toLocaleDateString()}
                  {h.edited && <> · {t('comments.edited')}</>}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
