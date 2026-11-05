'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MODE, api } from './client';
import { useViewer } from './useViewer';
import { CommunityOff } from './AccountForms';

/* ------------------------------------------------------------------ founder bootstrap */

/** One-time founder bootstrap: the founder types the BOOTSTRAP_TOKEN they set in Netlify; the invitation goes to FOUNDER_EMAIL. */
export function BootstrapForm() {
  const t = useTranslations('community');
  const locale = useLocale();
  const id = useId();
  const [token, setToken] = useState('');
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null);
  if (MODE === 'off') return <CommunityOff />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await api<{ sentTo: string; delivery: string }>('/api/community/admin/bootstrap', { method: 'POST', body: { token, locale } });
    setToken('');
    if (r.ok) return setOut({ ok: true, text: t(r.data.delivery === 'captured' ? 'bootstrap.captured' : 'bootstrap.sent', { to: r.data.sentTo }) });
    const known = ['bootstrap_denied', 'already_bootstrapped', 'mail_unavailable', 'rate_limited', 'not_found'];
    setOut({ ok: false, text: t(`bootstrap.errors.${known.includes(r.data.error ?? '') ? r.data.error : 'generic'}`) });
  };
  return (
    <form className="cm-form" onSubmit={submit}>
      <p className="cm-hint">{t('bootstrap.explain')}</p>
      <div className="cm-field">
        <label htmlFor={`${id}-t`}>{t('bootstrap.token')}</label>
        <input id={`${id}-t`} type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required dir="ltr" />
      </div>
      <button type="submit" className="btn btn-navy" disabled={token.length < 32}>
        {t('bootstrap.send')}
      </button>
      {out && (
        <p className={out.ok ? 'cm-status' : 'cm-error'} role={out.ok ? 'status' : 'alert'}>
          {out.text}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ staff invitation for an existing account */

export function InviteAccept() {
  const t = useTranslations('community');
  const { viewer, ready } = useViewer();
  const [token, setToken] = useState<string | null>(null);
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setToken(new URLSearchParams(window.location.search).get('invite')), []);
  if (MODE === 'off') return <CommunityOff />;
  if (!ready) return <p className="cm-note">{t('loading')}</p>;
  if (!viewer)
    return (
      <div className="cm-card">
        <p>{t('pilot.acceptSignIn')}</p>
        <Link href="/account/login" className="btn btn-navy btn-sm">
          {t('auth.signIn')}
        </Link>
      </div>
    );
  const accept = async () => {
    const r = await api<{ role: string }>('/api/community/invites/accept', { method: 'POST', body: { token } });
    setOut(r.ok ? { ok: true, text: t('pilot.accepted', { role: t(`mod.roles.${r.data.role}`) }) } : { ok: false, text: t(`errors.${['invite_invalid', 'invite_email_mismatch', 'email_unverified'].includes(r.data.error ?? '') ? r.data.error : 'generic'}`) });
  };
  return (
    <div className="cm-card">
      <p>{t('pilot.acceptText', { name: viewer.displayName })}</p>
      <button type="button" className="btn btn-navy btn-sm" onClick={accept} disabled={!token || Boolean(out?.ok)}>
        {t('pilot.acceptCta')}
      </button>
      {out && (
        <p className={out.ok ? 'cm-status' : 'cm-error'} role={out.ok ? 'status' : 'alert'}>
          {out.text}{' '}
          {out.ok && <Link href="/account">{t('account.title')}</Link>}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ pilot questionnaire */

const RATINGS = ['registration', 'rules', 'reporting', 'appeals', 'safety', 'design', 'recommend'] as const;
const QUIZ: Record<string, string[]> = {
  emailVisible: ['yes', 'no', 'unsure'],
  reportEffect: ['auto_removed', 'human_review', 'unsure'],
  appeal: ['no_appeal', 'same_moderator', 'other_moderator', 'unsure'],
  disagreement: ['forbidden', 'allowed', 'unsure'],
};
const TASKS = ['register', 'profile', 'comment', 'reply', 'helpful', 'report', 'feedback', 'notifications', 'language', 'delete_test'] as const;

/** Pilot usability questionnaire: what testers did, how clear it was, and whether they understood the rules. */
export function PilotQuestionnaire() {
  const t = useTranslations('community');
  const { viewer, ready } = useViewer();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [quiz, setQuiz] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<string[]>([]);
  const [confusing, setConfusing] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!viewer) return;
    api<{ response: { ratings: Record<string, number>; quiz: Record<string, string>; tasks: string[]; confusing: string | null; suggestion: string | null } | null }>('/api/community/pilot').then((r) => {
      const x = r.data.response;
      if (!x) return;
      setRatings(x.ratings);
      setQuiz(x.quiz);
      setTasks(x.tasks);
      setConfusing(x.confusing ?? '');
      setSuggestion(x.suggestion ?? '');
    });
  }, [viewer]);
  if (MODE === 'off' || MODE === 'live') return <CommunityOff />;
  if (!ready) return <p className="cm-note">{t('loading')}</p>;
  if (!viewer)
    return (
      <div className="cm-card">
        <p>{t('pilot.signInFirst')}</p>
        <Link href="/account/login" className="btn btn-navy btn-sm">
          {t('auth.signIn')}
        </Link>
      </div>
    );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await api('/api/community/pilot', { method: 'POST', body: { ratings, quiz, tasks, confusing, suggestion } });
    setOut(r.ok ? { ok: true, text: t('pilot.saved') } : { ok: false, text: t('pilot.needRatings') });
  };
  return (
    <form className="cm-form cm-pilot" onSubmit={submit}>
      <fieldset className="cm-fieldset">
        <legend>{t('pilot.tasksTitle')}</legend>
        <p className="cm-hint">{t('pilot.tasksHint')}</p>
        <div className="cm-taskgrid">
          {TASKS.map((k) => (
            <label key={k} className="cm-check">
              <input type="checkbox" checked={tasks.includes(k)} onChange={(e) => setTasks((x) => (e.target.checked ? [...x, k] : x.filter((y) => y !== k)))} />
              <span>{t(`pilot.tasks.${k}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="cm-fieldset">
        <legend>{t('pilot.ratingsTitle')}</legend>
        <p className="cm-hint">{t('pilot.ratingsHint')}</p>
        {RATINGS.map((k) => (
          <div key={k} className="cm-rating" role="radiogroup" aria-label={t(`pilot.ratings.${k}`)}>
            <span className="cm-rating-q">{t(`pilot.ratings.${k}`)}</span>
            <span className="cm-rating-scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`cm-rating-n ${ratings[k] === n ? 'is-on' : ''}`}>
                  <input type="radio" name={`r-${k}`} value={n} checked={ratings[k] === n} onChange={() => setRatings((x) => ({ ...x, [k]: n }))} />
                  <span>{n}</span>
                </label>
              ))}
            </span>
          </div>
        ))}
        <p className="cm-hint">{t('pilot.scale')}</p>
      </fieldset>

      <fieldset className="cm-fieldset">
        <legend>{t('pilot.quizTitle')}</legend>
        <p className="cm-hint">{t('pilot.quizHint')}</p>
        {Object.entries(QUIZ).map(([k, opts]) => (
          <div key={k} className="cm-quiz" role="radiogroup" aria-label={t(`pilot.quiz.${k}.q`)}>
            <p className="cm-quiz-q">{t(`pilot.quiz.${k}.q`)}</p>
            {opts.map((o) => (
              <label key={o} className="cm-check">
                <input type="radio" name={`q-${k}`} value={o} checked={quiz[k] === o} onChange={() => setQuiz((x) => ({ ...x, [k]: o }))} />
                <span>{t(`pilot.quiz.${k}.${o}`)}</span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      <label className="cm-field">
        <span>{t('pilot.confusing')}</span>
        <textarea value={confusing} onChange={(e) => setConfusing(e.target.value)} rows={3} maxLength={2000} dir="auto" />
      </label>
      <label className="cm-field">
        <span>{t('pilot.suggestion')}</span>
        <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} rows={3} maxLength={2000} dir="auto" />
      </label>
      <p className="cm-hint">{t('pilot.anonymousResults')}</p>
      <button type="submit" className="btn btn-navy">
        {t('pilot.send')}
      </button>
      {out && (
        <p className={out.ok ? 'cm-status' : 'cm-error'} role={out.ok ? 'status' : 'alert'}>
          {out.text}
        </p>
      )}
    </form>
  );
}
