'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MODE, api, newKey, type Viewer } from './client';
import { intlTag, type Locale } from '@/lib/locales';
import { useViewer } from './useViewer';
import Avatar from './Avatar';
import Linkified from './Linkified';

type Author = { username: string | null; displayName: string | null; deleted: boolean; staff: { role: string; title: string | null } | null };
type C = {
  id: string; parentId: string | null; status: string; body: string | null; lang: string; removedReason: string | null; staffNote: boolean; helpful: number; helpedByMe: boolean;
  createdAt: string; editedAt: string | null; mine: boolean; author: Author; replies?: C[];
};
type List = { count: number; open: boolean; more: boolean; comments: C[] };

const REASONS = ['spam', 'harassment', 'threat', 'private_info', 'impersonation', 'hate', 'off_topic', 'other'] as const;
const LANGS = ['fr', 'en', 'wo', 'ar', 'es', 'pt', 'de', 'it', 'tr', 'zh'];

/** Discussion under an article or a programme. Reading needs no account; taking part needs a verified one. */
export default function Comments({ slug }: { slug: string }) {
  const t = useTranslations('community');
  const locale = useLocale();
  const { viewer, ready } = useViewer();
  const [sort, setSort] = useState<'helpful' | 'newest'>('helpful');
  const [data, setData] = useState<List | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const load = useCallback(
    async (p = 0, append = false) => {
      const r = await api<List>(`/api/community/comments?article=${encodeURIComponent(slug)}&sort=${sort}&page=${p}`);
      if (!r.ok) {
        setError(r.data.error ?? 'generic');
        return;
      }
      setError(null);
      setData((prev) => (append && prev ? { ...r.data, comments: [...prev.comments, ...r.data.comments] } : r.data));
      setPage(p);
    },
    [slug, sort],
  );

  useEffect(() => {
    if (MODE !== 'off' && ready) load(0);
  }, [load, ready, viewer?.id]);

  if (MODE === 'off') {
    return (
      <section className="cm" aria-labelledby={`cm-${slug}`}>
        <h2 id={`cm-${slug}`} className="cm-title">
          {t('comments.title')}
        </h2>
        <p className="cm-note">{t('disabled')}</p>
        <p className="cm-note">
          <Link href={`/feedback?article=${slug}`}>{t('comments.feedbackLink')}</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="cm" aria-labelledby={`cm-${slug}`}>
      {MODE === 'demo' && <p className="cm-demo">{t('demoBanner')}</p>}
      <header className="cm-head">
        <h2 id={`cm-${slug}`} className="cm-title">
          {t('comments.title')} {data && <span className="cm-count">{t('comments.count', { n: data.count })}</span>}
        </h2>
        <div className="cm-sort" role="group" aria-label={t('comments.sortLabel')}>
          {(['helpful', 'newest'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)}>
              {t(`comments.sort.${s}`)}
            </button>
          ))}
        </div>
      </header>
      <p className="cm-rules">
        <Link href="/community">{t('comments.rules')}</Link>
        <span aria-hidden="true"> · </span>
        <Link href={`/feedback?article=${slug}`}>{t('comments.feedbackLink')}</Link>
      </p>

      <Gate viewer={viewer} ready={ready} open={data?.open ?? true} />
      {viewer && data?.open !== false && canPost(viewer) && <Composer slug={slug} locale={locale} viewer={viewer} onPosted={(msg) => { setStatus(msg); load(0); }} />}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {error && (
        <p className="cm-error" role="alert">
          {t(`errors.${errKey(error)}`)}
        </p>
      )}
      {data && data.comments.length === 0 && <p className="cm-empty">{t('comments.empty')}</p>}
      <ol className="cm-list" role="list">
        {data?.comments.map((c) => (
          <Thread key={c.id} c={c} slug={slug} viewer={viewer} reload={() => load(0)} setStatus={setStatus} />
        ))}
      </ol>
      {data?.more && (
        <button type="button" className="btn btn-ghost btn-sm cm-more" onClick={() => load(page + 1, true)}>
          {t('comments.loadMore')}
        </button>
      )}
    </section>
  );
}

const canPost = (v: Viewer) => v.emailVerified && !v.restriction;
const KNOWN_ERRORS = ['rate_limited', 'rejected', 'account_too_new', 'own_comment', 'edit_window_closed', 'auth_required', 'email_unverified', 'comment_restricted', 'suspended', 'comments_closed', 'network', 'not_found', 'parent_unavailable'];
const errKey = (e: string) => (KNOWN_ERRORS.includes(e) ? e : 'generic');

function Gate({ viewer, ready, open }: { viewer: Viewer | null; ready: boolean; open: boolean }) {
  const t = useTranslations('community');
  if (!ready) return null;
  if (!open) return <p className="cm-note">{t('comments.closed')}</p>;
  if (!viewer)
    return (
      <div className="cm-join">
        <p>{t('comments.join')}</p>
        <div className="cm-join-actions">
          <Link href="/account/login" className="btn btn-navy btn-sm">
            {t('auth.signIn')}
          </Link>
          <Link href="/account/register" className="btn btn-ghost btn-sm">
            {t('auth.register')}
          </Link>
        </div>
      </div>
    );
  if (!viewer.emailVerified) return <p className="cm-note">{t('errors.email_unverified')}</p>;
  if (viewer.restriction)
    return (
      <p className="cm-note cm-note-warn" role="note">
        {t(viewer.restriction.kind === 'suspended' ? 'errors.suspended' : 'errors.comment_restricted')}{' '}
        {viewer.restriction.endsAt && t('comments.until', { date: new Date(viewer.restriction.endsAt).toLocaleString() })} <Link href="/account">{t('comments.seeDetails')}</Link>
      </p>
    );
  return null;
}

function Composer({ slug, locale, viewer, parent, onPosted, onCancel, autoFocus }: { slug: string; locale: string; viewer: Viewer; parent?: C; onPosted: (msg: string) => void; onCancel?: () => void; autoFocus?: boolean }) {
  const t = useTranslations('community');
  const id = useId();
  const [body, setBody] = useState('');
  const [lang, setLang] = useState(LANGS.includes(locale) ? locale : 'fr');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState(false);
  const key = useRef(newKey());
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const r = await api<{ status: string }>('/api/community/comments', {
      method: 'POST',
      body: { article: slug, body, lang, parentId: parent?.id, idempotencyKey: key.current, staffNote: staffNote && !parent },
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.data.error ?? 'generic');
      return;
    }
    key.current = newKey();
    setBody('');
    onPosted(r.data.status === 'pending' ? t('comments.heldNotice') : t('comments.posted'));
  };

  return (
    <form className={`cm-composer ${parent ? 'is-reply' : ''}`} onSubmit={submit}>
      <div className="cm-composer-who">
        <Avatar name={viewer.displayName} staff={Boolean(viewer.staff)} size={28} />
        <span>
          {parent
            ? t.rich('comments.replyTo', { name: () => <bdi>{parent.author.displayName ?? t('comments.deletedAccount')}</bdi> })
            : t.rich('comments.postingAs', { name: () => <bdi>{viewer.displayName}</bdi> })}
        </span>
      </div>
      <label htmlFor={`${id}-b`} className="sr-only">
        {t('comments.composerLabel')}
      </label>
      <textarea
        id={`${id}-b`}
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={4000}
        rows={parent ? 3 : 4}
        dir="auto"
        lang={lang}
        placeholder={t('comments.placeholder')}
        required
      />
      <div className="cm-composer-bar">
        <label className="cm-lang">
          <span>{t('comments.writtenIn')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        {viewer.staff && !parent && (
          <label className="cm-check">
            <input type="checkbox" checked={staffNote} onChange={(e) => setStaffNote(e.target.checked)} /> {t('comments.asStaffNote')}
          </label>
        )}
        <span className="cm-chars" aria-hidden="true">
          {body.length}/4000
        </span>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            {t('comments.cancel')}
          </button>
        )}
        <button type="submit" className="btn btn-navy btn-sm" disabled={busy || !body.trim()}>
          {busy ? t('comments.posting') : parent ? t('comments.reply') : t('comments.post')}
        </button>
      </div>
      {err && (
        <p className="cm-error" role="alert">
          {t(`errors.${errKey(err)}`)}
        </p>
      )}
    </form>
  );
}

function Thread({ c, slug, viewer, reload, setStatus }: { c: C; slug: string; viewer: Viewer | null; reload: () => void; setStatus: (s: string) => void }) {
  const locale = useLocale();
  const [replying, setReplying] = useState(false);
  return (
    <li className={`cm-thread ${c.staffNote ? 'is-note' : ''}`}>
      <Item c={c} viewer={viewer} reload={reload} setStatus={setStatus} onReply={c.status === 'published' && viewer && canPost(viewer) ? () => setReplying(true) : undefined} />
      {(c.replies?.length || replying) && (
        <ol className="cm-replies" role="list">
          {c.replies?.map((r) => (
            <li key={r.id}>
              <Item c={r} viewer={viewer} reload={reload} setStatus={setStatus} onReply={c.status === 'published' && viewer && canPost(viewer) ? () => setReplying(true) : undefined} />
            </li>
          ))}
          {replying && viewer && (
            <li>
              <Composer
                slug={slug}
                locale={locale}
                viewer={viewer}
                parent={c}
                autoFocus
                onCancel={() => setReplying(false)}
                onPosted={(m) => {
                  setReplying(false);
                  setStatus(m);
                  reload();
                }}
              />
            </li>
          )}
        </ol>
      )}
    </li>
  );
}

function Item({ c, viewer, reload, setStatus, onReply }: { c: C; viewer: Viewer | null; reload: () => void; setStatus: (s: string) => void; onReply?: () => void }) {
  const t = useTranslations('community');
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [draft, setDraft] = useState(c.body ?? '');
  const [helpful, setHelpful] = useState({ n: c.helpful, mine: c.helpedByMe });
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const locale = useLocale() as Locale;
  const fmt = new Intl.DateTimeFormat(intlTag[locale], { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Dakar' });

  const hidden = c.status === 'removed' || c.status === 'deleted';
  const name = c.author.deleted ? t('comments.deletedAccount') : c.author.displayName;

  const toggleHelpful = async () => {
    const r = await api<{ helpful: number; helpedByMe: boolean }>(`/api/community/comments/${c.id}/helpful`, { method: 'POST', body: {} });
    if (r.ok) setHelpful({ n: r.data.helpful, mine: r.data.helpedByMe });
    else setErr(r.data.error ?? 'generic');
  };
  const save = async () => {
    const r = await api(`/api/community/comments/${c.id}`, { method: 'PATCH', body: { body: draft } });
    if (!r.ok) return setErr(r.data.error ?? 'generic');
    setEditing(false);
    setStatus(t('comments.saved'));
    reload();
  };
  const del = async () => {
    const r = await api(`/api/community/comments/${c.id}`, { method: 'DELETE', body: {} });
    if (!r.ok) return setErr(r.data.error ?? 'generic');
    setStatus(t('comments.deletedNotice'));
    reload();
  };

  return (
    <article className={`cm-item ${c.status} ${c.author.staff ? 'is-staff' : ''}`} id={`c-${c.id}`} aria-label={name ?? undefined}>
      <header className="cm-meta">
        <Avatar name={name} staff={Boolean(c.author.staff)} />
        <div className="cm-who">
          {c.author.deleted || !c.author.username ? (
            <span className="cm-name is-deleted">
              <bdi>{name}</bdi>
            </span>
          ) : (
            <Link href={`/u/${c.author.username}`} className="cm-name">
              <bdi>{name}</bdi>
            </Link>
          )}
          {c.author.username && !c.author.deleted && (
            <bdi className="cm-handle" dir="ltr">
              @{c.author.username}
            </bdi>
          )}
          {c.author.staff && (
            <span className="cm-staff" title={c.author.staff.title ?? undefined}>
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l2.4 2.2 3.2-.4.9 3.1 2.9 1.5-1 3 1 3-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.2-3.2.4-.9-3.1-2.9-1.5 1-3-1-3 2.9-1.5.9-3.1 3.2.4z" fill="currentColor" />
                <path d="M8 12.5l2.6 2.5L16 9.5" fill="none" stroke="#0b0f1a" strokeWidth="2" />
              </svg>
              {t('comments.staffBadge')}
              {c.author.staff.title && (
                <span className="cm-staff-title">
                  {' '}
                  · <bdi>{c.author.staff.title}</bdi>
                </span>
              )}
            </span>
          )}
          <span className="cm-time">
            <bdi>
              <time dateTime={c.createdAt}>{fmt.format(new Date(c.createdAt))}</time>
            </bdi>
            {c.editedAt && (
              <span className="cm-edited" title={fmt.format(new Date(c.editedAt))}>
                {' '}
                · {t('comments.edited')}
              </span>
            )}
          </span>
        </div>
      </header>
      {c.staffNote && <p className="cm-note-label">{t('comments.staffNote')}</p>}
      {c.status === 'pending' && <p className="cm-pending">{t('comments.pending')}</p>}

      {hidden ? (
        <p className="cm-gone">
          {c.status === 'removed' ? t('comments.removed') : t('comments.deleted')}
          {c.status === 'removed' && c.removedReason && <span> {t('comments.reason', { reason: c.removedReason })}</span>}
        </p>
      ) : editing ? (
        <div className="cm-edit">
          <label className="sr-only" htmlFor={`e-${c.id}`}>
            {t('comments.edit')}
          </label>
          <textarea id={`e-${c.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} rows={4} dir="auto" lang={c.lang} />
          <div className="cm-composer-bar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              {t('comments.cancel')}
            </button>
            <button type="button" className="btn btn-navy btn-sm" onClick={save} disabled={!draft.trim()}>
              {t('comments.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="cm-body" lang={c.lang} dir="auto">
          <Linkified text={c.body ?? ''} />
        </div>
      )}

      {!hidden && !editing && (
        <div className="cm-actions">
          <button type="button" className={`cm-act ${helpful.mine ? 'is-on' : ''}`} aria-pressed={helpful.mine} onClick={toggleHelpful} disabled={!viewer || c.mine || c.status !== 'published'}>
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 11v9H4v-9h3zm2 9h7.6a2 2 0 0 0 2-1.6l1.3-6A2 2 0 0 0 18 10h-4.5l.7-3.6A1.8 1.8 0 0 0 12.4 4L9 9.5V20z" fill="currentColor" />
            </svg>
            {t('comments.helpful')}
            {helpful.n > 0 && <span className="cm-act-n">{helpful.n}</span>}
          </button>
          {onReply && (
            <button type="button" className="cm-act" onClick={onReply}>
              {t('comments.reply')}
            </button>
          )}
          {c.mine && c.status !== 'deleted' && (
            <>
              <button type="button" className="cm-act" onClick={() => setEditing(true)}>
                {t('comments.edit')}
              </button>
              {confirmDelete ? (
                <span className="cm-confirm">
                  {t('comments.deleteConfirm')}{' '}
                  <button type="button" className="cm-act is-danger" onClick={del}>
                    {t('comments.delete')}
                  </button>
                  <button type="button" className="cm-act" onClick={() => setConfirmDelete(false)}>
                    {t('comments.cancel')}
                  </button>
                </span>
              ) : (
                <button type="button" className="cm-act" onClick={() => setConfirmDelete(true)}>
                  {t('comments.delete')}
                </button>
              )}
            </>
          )}
          {viewer && !c.mine && (
            <button type="button" className="cm-act cm-act-report" aria-expanded={reporting} onClick={() => setReporting((x) => !x)}>
              {t('comments.report')}
            </button>
          )}
        </div>
      )}
      {reporting && <ReportForm id={c.id} onDone={(m) => { setReporting(false); setStatus(m); }} />}
      {err && (
        <p className="cm-error" role="alert">
          {t(`errors.${errKey(err)}`)}
        </p>
      )}
    </article>
  );
}

function ReportForm({ id, onDone }: { id: string; onDone: (msg: string) => void }) {
  const t = useTranslations('community');
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    const r = await api<{ alreadyReported?: boolean }>(`/api/community/comments/${id}/report`, { method: 'POST', body: { reason, details } });
    const m = r.ok ? (r.data.alreadyReported ? t('comments.alreadyReported') : t('comments.reported')) : t(`errors.${errKey(r.data.error ?? '')}`);
    setMsg(m);
    if (r.ok) setTimeout(() => onDone(m), 1200);
  };
  return (
    <form className="cm-report" onSubmit={send}>
      <fieldset>
        <legend>{t('comments.reportTitle')}</legend>
        <div className="cm-reasons">
          {REASONS.map((r) => (
            <label key={r} className="cm-reason">
              <input type="radio" name={`reason-${id}`} value={r} checked={reason === r} onChange={() => setReason(r)} />
              {t(`comments.reasons.${r}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="cm-field">
        <span>{t('comments.reportDetails')}</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={2} />
      </label>
      <p className="cm-hint">{t('comments.reportHint')}</p>
      <button type="submit" className="btn btn-navy btn-sm" disabled={!reason}>
        {t('comments.reportSend')}
      </button>
      {msg && (
        <p className="cm-status" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}
