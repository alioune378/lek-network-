'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from './client';

type Case = {
  id: string; commentId: string | null; article: string | null; body: string | null; commentStatus: string | null; source: string; reasons: string[];
  context: { signals?: { code: string; severity: string; detail?: string }[] }; severity: string; status: string; reviewer: string | null; action: string | null;
  decisionNote: string | null; decidedAt: string | null; appealStatus: string; createdAt: string;
  author: { id: string; username: string; displayName: string; since: string | null } | null; priorActions: string[]; suggested: string;
  reports: { reason: string; details: string | null; reporter: string | null; createdAt: string }[];
};
type Appeal = { id: string; message: string; status: string; createdAt: string; decisionNote: string | null; action: string; reason: string; actor: string | null; member: string; commentBody: string | null; ownDecision: boolean };
type Audit = { id: string; action: string; reason: string; until: string | null; created_at: string; actor: string | null; target: string | null };

const ALL_VIEWS = ['open', 'resolved', 'appeals', 'audit', 'members', 'invites', 'pilot'] as const;
type View = (typeof ALL_VIEWS)[number];

/** Moderation console. Every action is authorised again on the server and written to the append-only audit log. */
export default function ModerationConsole({ canManageStaff, canInvite = false, canSeePilot = false }: { canManageStaff: boolean; canInvite?: boolean; canSeePilot?: boolean }) {
  const t = useTranslations('community');
  const VIEWS = ALL_VIEWS.filter((v) => (v === 'invites' ? canInvite : v === 'pilot' ? canSeePilot : true));
  const [view, setView] = useState<View>('open');
  const [items, setItems] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    if (view === 'members' || view === 'invites' || view === 'pilot') return setItems([]);
    const r = await api<{ items: unknown[] }>(`/api/community/moderation?view=${view}`);
    setItems(r.ok ? r.data.items : []);
    if (!r.ok) setMsg(t(`errors.${r.data.error === 'forbidden' ? 'forbidden' : 'generic'}`));
  }, [view, t]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mod">
      <nav className="mod-tabs" aria-label={t('mod.title')}>
        {VIEWS.map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
            {t(`mod.views.${v}`)}
          </button>
        ))}
      </nav>
      <p className="cm-hint">{t('mod.principles')}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {msg}
      </p>
      {view === 'members' ? (
        <Members canManageStaff={canManageStaff} onDone={setMsg} />
      ) : view === 'invites' ? (
        <Invites canAssignAdmin={canManageStaff} onDone={setMsg} />
      ) : view === 'pilot' ? (
        <PilotResults />
      ) : items.length === 0 ? (
        <p className="cm-note">{t('mod.empty')}</p>
      ) : view === 'appeals' ? (
        <ul className="mod-list" role="list">
          {(items as Appeal[]).map((a) => (
            <AppealCard key={a.id} a={a} reload={load} onDone={setMsg} />
          ))}
        </ul>
      ) : view === 'audit' ? (
        <div className="mod-table-wrap">
          <table className="mod-table">
            <thead>
              <tr>
                <th scope="col">{t('mod.when')}</th>
                <th scope="col">{t('mod.actor')}</th>
                <th scope="col">{t('mod.action')}</th>
                <th scope="col">{t('mod.member')}</th>
                <th scope="col">{t('mod.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {(items as Audit[]).map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>{a.actor ? `@${a.actor}` : t('mod.system')}</td>
                  <td>{t(`ladder.${a.action}`)}</td>
                  <td>{a.target ? `@${a.target}` : '—'}</td>
                  <td dir="auto">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="mod-list" role="list">
          {(items as Case[]).map((c) => (
            <CaseCard key={c.id} c={c} reload={load} onDone={setMsg} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseCard({ c, reload, onDone }: { c: Case; reload: () => void; onDone: (m: string) => void }) {
  const t = useTranslations('community');
  // No pre-selected outcome: a held comment (possibly a threat) must never be published by an unconsidered click.
  const [commentAction, setCommentAction] = useState('');
  const [userAction, setUserAction] = useState('none');
  const [duration, setDuration] = useState('24h');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const decide = async () => {
    const r = await api(`/api/community/moderation/cases/${c.id}`, { method: 'POST', body: { commentAction, userAction, duration, reason } });
    if (!r.ok) return setErr(t(`errors.${['conflict_of_interest', 'already_decided', 'reason_required'].includes(r.data.error ?? '') ? r.data.error : 'generic'}`));
    onDone(t('mod.decided'));
    reload();
  };
  const restore = async () => {
    const r = await api(`/api/community/comments/${c.commentId}/restore`, { method: 'POST', body: { reason: reason || t('mod.restoreDefault') } });
    if (!r.ok) return setErr(t('errors.generic'));
    onDone(t('mod.restored'));
    reload();
  };
  return (
    <li className={`mod-case sev-${c.severity}`}>
      <header className="mod-case-head">
        <span className={`mod-sev sev-${c.severity}`}>{t(`mod.severity.${c.severity}`)}</span>
        <span>{t(`mod.source.${c.source}`)}</span>
        <time className="cm-hint" dateTime={c.createdAt}>
          {new Date(c.createdAt).toLocaleString()}
        </time>
        {c.article && (
          <Link href={`/article/${c.article}#c-${c.commentId}`} className="cm-hint">
            {c.article}
          </Link>
        )}
      </header>
      <p className="mod-reasons">
        {c.reasons.map((r) => (
          <span key={r} className="cm-pill">
            {t.has(`mod.signals.${r}`) ? t(`mod.signals.${r}`) : t.has(`comments.reasons.${r}`) ? t(`comments.reasons.${r}`) : r}
          </span>
        ))}
      </p>
      {c.author && (
        <p className="cm-hint">
          {t('mod.author')} <Link href={`/u/${c.author.username}`}>@{c.author.username}</Link> · {t('mod.prior', { n: c.priorActions.length })}
          {c.priorActions.length > 0 && <> ({c.priorActions.map((a) => t(`ladder.${a}`)).join(', ')})</>}
        </p>
      )}
      <blockquote className="mod-body" dir="auto">
        {c.body}
        <span className="cm-pill">{t(`mod.commentStatus.${c.commentStatus ?? 'published'}`)}</span>
      </blockquote>
      {c.reports.length > 0 && (
        <ul className="mod-reports" role="list">
          {c.reports.map((r, i) => (
            <li key={i}>
              {t(`comments.reasons.${r.reason}`)} — {r.reporter ? `@${r.reporter}` : t('mod.system')}
              {r.details && <span dir="auto"> : « {r.details} »</span>}
            </li>
          ))}
        </ul>
      )}
      {c.status === 'open' ? (
        <div className="mod-decide">
          <p className="cm-hint">{t('mod.suggested', { step: t(`ladder.${c.suggested}`) })}</p>
          <div className="mod-row">
            <label className="cm-field">
              <span>{t('mod.commentDecision')}</span>
              <select value={commentAction} onChange={(e) => setCommentAction(e.target.value)} required>
                <option value="" disabled>
                  {t('mod.choose')}
                </option>
                {c.commentStatus === 'pending' ? <option value="approve">{t('mod.approve')}</option> : <option value="keep">{t('mod.keep')}</option>}
                <option value="remove">{t('ladder.remove_comment')}</option>
              </select>
            </label>
            <label className="cm-field">
              <span>{t('mod.memberDecision')}</span>
              <select value={userAction} onChange={(e) => setUserAction(e.target.value)}>
                {['none', 'educational_notice', 'warning', 'restrict', 'suspend', 'escalate'].map((a) => (
                  <option key={a} value={a}>
                    {a === 'none' ? t('mod.noAction') : t(`ladder.${a}`)}
                  </option>
                ))}
              </select>
            </label>
            {(userAction === 'restrict' || userAction === 'suspend') && (
              <label className="cm-field">
                <span>{t('mod.duration')}</span>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  {(userAction === 'restrict' ? ['24h', '7d'] : ['30d', 'indefinite']).map((d) => (
                    <option key={d} value={d}>
                      {t(`mod.durations.${d}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className="cm-field">
            <span>{t('mod.reasonShown')}</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} />
          </label>
          <button type="button" className="btn btn-navy btn-sm" disabled={!commentAction || reason.trim().length < 3} onClick={decide}>
            {t('mod.record')}
          </button>
        </div>
      ) : (
        <div className="mod-decided">
          <p className="cm-hint">
            {t('mod.decidedBy', { who: c.reviewer ? `@${c.reviewer}` : '—', when: c.decidedAt ? new Date(c.decidedAt).toLocaleString() : '—' })} · {c.action} · {t(`mod.appeal.${c.appealStatus}`)}
          </p>
          {c.decisionNote && <p dir="auto">{c.decisionNote}</p>}
          {c.commentStatus === 'removed' && (
            <div className="mod-row">
              <label className="cm-field">
                <span>{t('mod.reasonShown')}</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={restore}>
                {t('mod.restore')}
              </button>
            </div>
          )}
        </div>
      )}
      {err && (
        <p className="cm-error" role="alert">
          {err}
        </p>
      )}
    </li>
  );
}

function AppealCard({ a, reload, onDone }: { a: Appeal; reload: () => void; onDone: (m: string) => void }) {
  const t = useTranslations('community');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const decide = async (decision: 'upheld' | 'overturned') => {
    const r = await api(`/api/community/moderation/appeals/${a.id}`, { method: 'POST', body: { decision, note } });
    if (!r.ok) return setErr(t(`errors.${['same_reviewer', 'already_decided', 'conflict_of_interest'].includes(r.data.error ?? '') ? r.data.error : 'generic'}`));
    onDone(t('mod.decided'));
    reload();
  };
  return (
    <li className="mod-case">
      <header className="mod-case-head">
        <span className="cm-pill">{t(`account.appealStatus.${a.status}`)}</span>
        <span>@{a.member}</span>
        <time className="cm-hint" dateTime={a.createdAt}>
          {new Date(a.createdAt).toLocaleString()}
        </time>
      </header>
      <p>
        <strong>{t(`ladder.${a.action}`)}</strong> — {a.reason} ({a.actor ? `@${a.actor}` : t('mod.system')})
      </p>
      {a.commentBody && (
        <blockquote className="mod-body" dir="auto">
          {a.commentBody}
        </blockquote>
      )}
      <p className="mod-appeal-msg" dir="auto">
        « {a.message} »
      </p>
      {a.status === 'pending' ? (
        a.ownDecision ? (
          <p className="cm-hint">{t('mod.notYourAppeal')}</p>
        ) : (
          <div className="mod-decide">
            <label className="cm-field">
              <span>{t('mod.reasonShown')}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} />
            </label>
            <div className="mod-row">
              <button type="button" className="btn btn-ghost btn-sm" disabled={note.trim().length < 3} onClick={() => decide('upheld')}>
                {t('mod.uphold')}
              </button>
              <button type="button" className="btn btn-navy btn-sm" disabled={note.trim().length < 3} onClick={() => decide('overturned')}>
                {t('mod.overturn')}
              </button>
            </div>
          </div>
        )
      ) : (
        a.decisionNote && <p className="cm-hint">{a.decisionNote}</p>
      )}
      {err && (
        <p className="cm-error" role="alert">
          {err}
        </p>
      )}
    </li>
  );
}

function Members({ canManageStaff, onDone }: { canManageStaff: boolean; onDone: (m: string) => void }) {
  const t = useTranslations('community');
  const [username, setUsername] = useState('');
  const [action, setAction] = useState('lift_restriction');
  const [duration, setDuration] = useState('24h');
  const [reason, setReason] = useState('');
  const [role, setRole] = useState('journalist');
  const [title, setTitle] = useState('');
  const [out, setOut] = useState<string | null>(null);
  const act = async () => {
    const r = await api(`/api/community/moderation/users/${encodeURIComponent(username.toLowerCase())}`, { method: 'POST', body: { action, reason, duration } });
    const m = r.ok ? t('mod.decided') : t(`errors.${['not_found', 'conflict_of_interest', 'reason_required'].includes(r.data.error ?? '') ? r.data.error : 'generic'}`);
    setOut(m);
    onDone(m);
  };
  const staff = async () => {
    const r = await api('/api/community/moderation/staff', { method: 'POST', body: { username, role, title } });
    const m = r.ok ? t('mod.staffSaved') : t(`errors.${['not_found', 'forbidden', 'last_owner', 'two_factor_required', 'staff_session_expired'].includes(r.data.error ?? '') ? r.data.error : 'generic'}`);
    setOut(m);
    onDone(m);
  };
  return (
    <div className="mod-members">
      <div className="cm-card cm-form">
        <h2 className="cm-card-title">{t('mod.memberAction')}</h2>
        <label className="cm-field">
          <span>{t('auth.username')}</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" autoCapitalize="none" />
        </label>
        <div className="mod-row">
          <label className="cm-field">
            <span>{t('mod.action')}</span>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              {['lift_restriction', 'educational_notice', 'warning', 'restrict', 'suspend', 'escalate'].map((a) => (
                <option key={a} value={a}>
                  {t(`ladder.${a}`)}
                </option>
              ))}
            </select>
          </label>
          {(action === 'restrict' || action === 'suspend') && (
            <label className="cm-field">
              <span>{t('mod.duration')}</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                {(action === 'restrict' ? ['24h', '7d'] : ['30d', 'indefinite']).map((d) => (
                  <option key={d} value={d}>
                    {t(`mod.durations.${d}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="cm-field">
          <span>{t('mod.reasonShown')}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </label>
        <button type="button" className="btn btn-navy btn-sm" disabled={!username || reason.trim().length < 3} onClick={act}>
          {t('mod.record')}
        </button>
      </div>
      {canManageStaff && (
        <div className="cm-card cm-form">
          <h2 className="cm-card-title">{t('mod.staffTitle')}</h2>
          <p className="cm-hint">{t('mod.staffHint')}</p>
          <label className="cm-field">
            <span>{t('auth.username')}</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" autoCapitalize="none" />
          </label>
          <div className="mod-row">
            <label className="cm-field">
              <span>{t('mod.role')}</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {['journalist', 'editor', 'moderator', 'admin', 'owner', 'revoke'].map((r) => (
                  <option key={r} value={r}>
                    {t(`mod.roles.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="cm-field">
              <span>{t('mod.staffTitleField')}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </label>
          </div>
          <button type="button" className="btn btn-navy btn-sm" disabled={!username || (role !== 'revoke' && title.trim().length < 2)} onClick={staff}>
            {t('mod.saveStaff')}
          </button>
        </div>
      )}
      {out && (
        <p className="cm-status" role="status">
          {out}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ invitations */

type Invite = { id: string; purpose: string; role: string | null; email: string | null; note: string | null; uses: number; maxUses: number; creator: string | null; users: string[]; createdAt: string; expiresAt: string; status: string };

function Invites({ canAssignAdmin, onDone }: { canAssignAdmin: boolean; onDone: (m: string) => void }) {
  const t = useTranslations('community');
  const locale = useLocale();
  const [list, setList] = useState<Invite[]>([]);
  const [kind, setKind] = useState<'pilot' | 'staff'>('pilot');
  const [count, setCount] = useState(5);
  const [days, setDays] = useState(14);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('moderator');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [out, setOut] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ items: Invite[] }>('/api/community/invites');
    setList(r.ok ? r.data.items : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const create = async () => {
    const staff = kind === 'staff';
    const body = { locale, days, note, count: staff || email ? 1 : count, email: email || undefined, role: staff ? role : undefined, title: staff ? title : undefined };
    const r = await api<{ links: string[]; delivery: string | null }>('/api/community/invites', { method: 'POST', body });
    if (!r.ok) {
      const m = t(`errors.${['forbidden', 'invalid', 'rate_limited', 'two_factor_required', 'staff_session_expired'].includes(r.data.error ?? '') ? r.data.error : 'generic'}`);
      setOut(m);
      return onDone(m);
    }
    setLinks(r.data.links);
    const m = r.data.delivery ? t(`mod.invites.delivery.${r.data.delivery}`) : t('mod.invites.created', { n: r.data.links.length });
    setOut(m);
    onDone(m);
    setEmail('');
    load();
  };
  const revoke = async (id: string) => {
    const r = await api(`/api/community/invites/${id}`, { method: 'DELETE' });
    onDone(r.ok ? t('mod.invites.revoked') : t('errors.generic'));
    load();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.join('\n'));
      setOut(t('mod.invites.copied'));
    } catch {
      setOut(t('mod.invites.copyFailed'));
    }
  };
  return (
    <div className="mod-members">
      <div className="cm-card cm-form">
        <h2 className="cm-card-title">{t('mod.invites.title')}</h2>
        <p className="cm-hint">{t('mod.invites.hint')}</p>
        <div className="mod-row">
          <label className="cm-field">
            <span>{t('mod.invites.kind')}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as 'pilot' | 'staff')}>
              <option value="pilot">{t('mod.invites.kinds.pilot')}</option>
              <option value="staff">{t('mod.invites.kinds.staff')}</option>
            </select>
          </label>
          {kind === 'pilot' && !email && (
            <label className="cm-field">
              <span>{t('mod.invites.count')}</span>
              <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </label>
          )}
          <label className="cm-field">
            <span>{t('mod.invites.days')}</span>
            <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </label>
        </div>
        <label className="cm-field">
          <span>{kind === 'staff' ? t('mod.invites.emailRequired') : t('mod.invites.emailOptional')}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" autoCapitalize="none" />
        </label>
        {kind === 'staff' && (
          <div className="mod-row">
            <label className="cm-field">
              <span>{t('mod.role')}</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {['journalist', 'moderator', 'editor', ...(canAssignAdmin ? ['admin'] : [])].map((r) => (
                  <option key={r} value={r}>
                    {t(`mod.roles.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="cm-field">
              <span>{t('mod.staffTitleField')}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </label>
          </div>
        )}
        <label className="cm-field">
          <span>{t('mod.invites.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </label>
        <button type="button" className="btn btn-navy btn-sm" onClick={create} disabled={kind === 'staff' && (!email || title.trim().length < 2)}>
          {t('mod.invites.create')}
        </button>
        {links.length > 0 && (
          <div className="cm-backup">
            <p>
              <strong>{t('mod.invites.onceTitle')}</strong> {t('mod.invites.onceText')}
            </p>
            <ul className="cm-backup-list cm-links" dir="ltr">
              {links.map((l) => (
                <li key={l}>
                  <code>{l}</code>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
              {t('mod.invites.copy')}
            </button>
          </div>
        )}
        {out && (
          <p className="cm-status" role="status">
            {out}
          </p>
        )}
      </div>
      <div className="mod-table-wrap">
        <table className="mod-table">
          <thead>
            <tr>
              <th scope="col">{t('mod.when')}</th>
              <th scope="col">{t('mod.invites.kind')}</th>
              <th scope="col">{t('mod.invites.for')}</th>
              <th scope="col">{t('mod.invites.status')}</th>
              <th scope="col">{t('mod.invites.usedBy')}</th>
              <th scope="col">
                <span className="sr-only">{t('mod.invites.revoke')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id}>
                <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                <td>{i.role ? t(`mod.roles.${i.role}`) : t(`mod.invites.kinds.${i.purpose === 'founder' ? 'founder' : 'pilot'}`)}</td>
                <td dir="ltr">{i.email ?? '—'}</td>
                <td>{t(`mod.invites.statuses.${i.status}`)}</td>
                <td>{i.users.length ? i.users.map((u) => `@${u}`).join(', ') : '—'}</td>
                <td>
                  {i.status === 'active' && (
                    <button type="button" className="cm-act is-danger" onClick={() => revoke(i.id)}>
                      {t('mod.invites.revoke')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pilot results */

type Summary = { responses: number; ratings: Record<string, number | null>; understanding: Record<string, number | null>; tasks: Record<string, number>; comments: { kind: string; text: string }[] };

function PilotResults() {
  const t = useTranslations('community');
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api<{ summary: Summary }>('/api/community/moderation?view=pilot').then((r) => (r.ok ? setS(r.data.summary) : setErr(true)));
  }, []);
  if (err) return <p className="cm-error">{t('errors.forbidden')}</p>;
  if (!s) return <p className="cm-note">{t('loading')}</p>;
  if (!s.responses) return <p className="cm-note">{t('mod.pilot.none')}</p>;
  return (
    <div className="mod-members">
      <p className="cm-status">{t('mod.pilot.responses', { n: s.responses })}</p>
      <div className="cm-card">
        <h2 className="cm-card-title">{t('pilot.ratingsTitle')}</h2>
        <dl className="cm-dl">
          {Object.entries(s.ratings).map(([k, v]) => (
            <div key={k}>
              <dt>{t(`pilot.ratings.${k}`)}</dt>
              <dd>{v === null ? '—' : `${v} / 5`}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="cm-card">
        <h2 className="cm-card-title">{t('mod.pilot.understanding')}</h2>
        <p className="cm-hint">{t('mod.pilot.understandingHint')}</p>
        <dl className="cm-dl">
          {Object.entries(s.understanding).map(([k, v]) => (
            <div key={k}>
              <dt>{t(`pilot.quiz.${k}.q`)}</dt>
              <dd>{v === null ? '—' : `${v} %`}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="cm-card">
        <h2 className="cm-card-title">{t('pilot.tasksTitle')}</h2>
        <dl className="cm-dl">
          {Object.entries(s.tasks).map(([k, v]) => (
            <div key={k}>
              <dt>{t(`pilot.tasks.${k}`)}</dt>
              <dd>{v} / {s.responses}</dd>
            </div>
          ))}
        </dl>
      </div>
      {s.comments.length > 0 && (
        <div className="cm-card">
          <h2 className="cm-card-title">{t('mod.pilot.comments')}</h2>
          <ul className="mod-list" role="list">
            {s.comments.map((c, i) => (
              <li key={i} className="cm-pilot-comment">
                <span className="cm-chip">{t(`mod.pilot.kinds.${c.kind}`)}</span>{' '}
                <span dir="auto">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
