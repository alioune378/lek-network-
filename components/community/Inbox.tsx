'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from './client';

type Item = {
  id: string; reference: string; category: string; article: string | null; message: string; contactEmail: string | null; lang: string; status: string;
  assignee: string | null; resolutionNote: string | null; member: string | null; createdAt: string; replies: { body: string; channel: string; author: string; createdAt: string }[];
};

const STATUSES = ['', 'new', 'in_progress', 'answered', 'closed'] as const;

/** Newsroom inbox for "Votre voix compte". Private: staff only, enforced on the server. */
export default function Inbox() {
  const t = useTranslations('community');
  const [filter, setFilter] = useState<string>('');
  const [data, setData] = useState<{ items: Item[]; staff: { username: string; title: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ items: Item[]; staff: { username: string; title: string }[] }>(`/api/community/inbox?status=${filter}`);
    if (r.ok) setData(r.data);
    else setErr(t(r.data.error === 'forbidden' ? 'errors.forbidden' : 'errors.generic'));
  }, [filter, t]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="inbox">
      <nav className="mod-tabs" aria-label={t('inbox.filter')}>
        {STATUSES.map((s) => (
          <button key={s || 'all'} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s ? t(`inbox.status.${s}`) : t('inbox.all')}
          </button>
        ))}
      </nav>
      <p className="cm-hint">{t('inbox.private')}</p>
      {err && (
        <p className="cm-error" role="alert">
          {err}
        </p>
      )}
      {data && data.items.length === 0 && <p className="cm-note">{t('inbox.empty')}</p>}
      <ul className="mod-list" role="list">
        {data?.items.map((i) => (
          <Entry key={i.id} i={i} staff={data.staff} reload={load} />
        ))}
      </ul>
    </div>
  );
}

function Entry({ i, staff, reload }: { i: Item; staff: { username: string; title: string }[]; reload: () => void }) {
  const t = useTranslations('community');
  const [reply, setReply] = useState('');
  const [note, setNote] = useState(i.resolutionNote ?? '');
  const [out, setOut] = useState<string | null>(null);
  const patch = async (body: Record<string, unknown>) => {
    const r = await api(`/api/community/inbox/${i.id}`, { method: 'PATCH', body });
    setOut(r.ok ? t('account.saved') : t('errors.generic'));
    if (r.ok) reload();
  };
  const send = async () => {
    const r = await api<{ channel: string }>(`/api/community/inbox/${i.id}`, { method: 'POST', body: { body: reply } });
    setOut(r.ok ? t(`inbox.channel.${r.data.channel}`) : t('errors.generic'));
    if (r.ok) {
      setReply('');
      reload();
    }
  };
  return (
    <li className={`mod-case inbox-${i.status}`}>
      <header className="mod-case-head">
        <span className="cm-pill">{t(`feedback.cats.${i.category}.name`)}</span>
        <span className="cm-hint">#{i.reference}</span>
        <time className="cm-hint" dateTime={i.createdAt}>
          {new Date(i.createdAt).toLocaleString()}
        </time>
        {i.article && (
          <Link href={`/article/${i.article}`} className="cm-hint">
            {i.article}
          </Link>
        )}
      </header>
      <p className="cm-hint">
        {i.member ? `@${i.member}` : t('inbox.anonymous')}
        {i.contactEmail && (
          <>
            {' '}
            · <span dir="ltr">{i.contactEmail}</span>
          </>
        )}{' '}
        · {i.lang.toUpperCase()}
      </p>
      <blockquote className="mod-body" dir="auto" lang={i.lang}>
        {i.message}
      </blockquote>
      {i.replies.length > 0 && (
        <ul className="mod-reports" role="list">
          {i.replies.map((r, k) => (
            <li key={k}>
              @{r.author} ({t(`inbox.channel.${r.channel}`)}) : <span dir="auto">{r.body}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mod-row">
        <label className="cm-field">
          <span>{t('inbox.statusLabel')}</span>
          <select value={i.status} onChange={(e) => patch({ status: e.target.value })}>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {t(`inbox.status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="cm-field">
          <span>{t('inbox.assignee')}</span>
          <select value={i.assignee ?? ''} onChange={(e) => patch({ assignee: e.target.value || null })}>
            <option value="">—</option>
            {staff.map((s) => (
              <option key={s.username} value={s.username}>
                @{s.username} · {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="cm-field">
        <span>{t('inbox.note')}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} onBlur={() => note !== (i.resolutionNote ?? '') && patch({ resolutionNote: note })} />
      </label>
      <label className="cm-field">
        <span>{t('inbox.reply')}</span>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} dir="auto" />
      </label>
      <p className="cm-hint">{i.member ? t('inbox.replyAccount') : i.contactEmail ? t('inbox.replyEmail') : t('inbox.replyInternal')}</p>
      <button type="button" className="btn btn-navy btn-sm" disabled={reply.trim().length < 2} onClick={send}>
        {t('inbox.send')}
      </button>
      {out && (
        <p className="cm-status" role="status">
          {out}
        </p>
      )}
    </li>
  );
}
