'use client';

import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { MODE, PILOT_END, REGISTRATION, api, authClient, type Viewer } from './client';
import Turnstile from './Turnstile';
import Avatar from './Avatar';
import TwoFactor from './TwoFactor';

export function CommunityOff() {
  const t = useTranslations('community');
  return (
    <div className="cm-card">
      <p>{t('disabled')}</p>
      <p>
        <Link href="/community">{t('nav.about')}</Link>
      </p>
    </div>
  );
}

function DemoNote() {
  const t = useTranslations('community');
  return MODE === 'demo' ? <p className="cm-demo">{t('demoBanner')}</p> : null;
}

function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string | null; children: ReactNode; id: string }) {
  return (
    <div className={`cm-field ${error ? 'has-err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p className="cm-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="cm-error" id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ register */

export function RegisterForm() {
  const t = useTranslations('community');
  const locale = useLocale();
  const id = useId();
  const [f, setF] = useState({ displayName: '', username: '', email: '', password: '', website: '', notifyReplies: false, acceptGuidelines: false, acceptPrivacy: false, acceptPilot: false });
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<'none' | 'checking' | 'valid' | 'invalid'>('none');
  const [invitePurpose, setInvitePurpose] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avail, setAvail] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const onToken = useCallback((x: string) => setCaptcha(x), []);

  useEffect(() => {
    const tok = new URLSearchParams(window.location.search).get('invite');
    if (!tok) return;
    setInvite(tok);
    setInviteState('checking');
    api<{ valid: boolean; purpose?: string }>(`/api/community/invites/check?token=${encodeURIComponent(tok)}`).then((r) => {
      setInviteState(r.ok && r.data.valid ? 'valid' : 'invalid');
      setInvitePurpose(r.data.purpose ?? null);
    });
  }, []);

  useEffect(() => {
    const u = f.username.trim().toLowerCase();
    if (u.length < 3) return setAvail(null);
    const h = setTimeout(async () => {
      const r = await api<{ available: boolean; reason: string | null }>(`/api/community/username?u=${encodeURIComponent(u)}`);
      if (r.ok) setAvail(r.data.available ? 'available' : (r.data.reason ?? 'taken'));
    }, 400);
    return () => clearTimeout(h);
  }, [f.username]);

  if (MODE === 'off') return <CommunityOff />;
  // Registration is by invitation unless the founder has explicitly opened it.
  if (!done && REGISTRATION !== 'open' && !invite)
    return (
      <div className="cm-card">
        <h2 className="cm-card-title">{t('pilot.inviteOnlyTitle')}</h2>
        <p>{t('pilot.inviteOnlyText')}</p>
        <p>
          <Link href="/account/login">{t('auth.haveAccount')} {t('auth.signIn')}</Link>
        </p>
      </div>
    );
  if (!done && invite && inviteState === 'invalid')
    return (
      <div className="cm-card" role="alert">
        <h2 className="cm-card-title">{t('pilot.inviteInvalidTitle')}</h2>
        <p>{t('pilot.inviteInvalidText')}</p>
      </div>
    );
  if (done)
    return (
      <div className="cm-card" role="status">
        <h2 className="cm-card-title">{t('auth.checkInbox')}</h2>
        <p>{t('auth.checkInboxText')}</p>
        {MODE === 'demo' && <p className="cm-hint">{t('auth.demoMail')}</p>}
      </div>
    );

  const set = (k: keyof typeof f) => (e: { target: { value: string; checked?: boolean; type?: string } }) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? Boolean(e.target.checked) : e.target.value }));
  const err = (k: string) => (errors[k] ? t(`fieldErrors.${k}.${errors[k]}`) : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormErr(null);
    const r = await api('/api/community/register', { method: 'POST', body: { ...f, username: f.username.trim().toLowerCase(), locale, captcha, invite } });
    setBusy(false);
    if (r.ok) return setDone(true);
    setErrors(r.data.fields ?? {});
    const known = ['rate_limited', 'invite_required', 'invite_invalid', 'invite_email_mismatch', 'registration_closed', 'captcha_required', 'captcha_failed'];
    if (!r.data.fields) setFormErr(t(`errors.${known.includes(r.data.error ?? '') ? r.data.error : 'generic'}`));
  };

  return (
    <form className="cm-form" onSubmit={submit} noValidate>
      <DemoNote />
      {inviteState === 'valid' && (
        <p className="cm-status" role="status">
          {t(invitePurpose === 'founder' ? 'pilot.inviteFounder' : invitePurpose === 'staff' ? 'pilot.inviteStaff' : 'pilot.inviteValid')}
        </p>
      )}
      <Field id={`${id}-d`} label={t('auth.displayName')} hint={t('auth.displayNameHint')} error={err('displayName')}>
        <input id={`${id}-d`} value={f.displayName} onChange={set('displayName')} maxLength={50} autoComplete="nickname" required aria-describedby={`${id}-d-hint`} />
      </Field>
      <Field id={`${id}-u`} label={t('auth.username')} hint={t('auth.usernameHint')} error={err('username')}>
        <div className="cm-prefix">
          <span aria-hidden="true">@</span>
          <input id={`${id}-u`} value={f.username} onChange={set('username')} maxLength={20} autoComplete="username" autoCapitalize="none" spellCheck={false} required pattern="[a-z0-9_]{3,20}" dir="ltr" aria-describedby={`${id}-u-hint ${id}-u-av`} />
        </div>
        <p className={`cm-avail is-${avail ?? 'none'}`} id={`${id}-u-av`} aria-live="polite">
          {avail ? t(`auth.usernameStatus.${avail}`) : ''}
        </p>
      </Field>
      <Field id={`${id}-e`} label={t('auth.email')} hint={t('auth.emailHint')} error={err('email')}>
        <input id={`${id}-e`} type="email" value={f.email} onChange={set('email')} autoComplete="email" required dir="ltr" aria-describedby={`${id}-e-hint`} />
      </Field>
      <Field id={`${id}-p`} label={t('auth.password')} hint={t('auth.passwordHint')} error={err('password')}>
        <div className="cm-pass">
          <input id={`${id}-p`} type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="new-password" minLength={10} maxLength={128} required dir="ltr" aria-describedby={`${id}-p-hint`} />
          <button type="button" onClick={() => setShow((x) => !x)} aria-pressed={show}>
            {show ? t('auth.hide') : t('auth.show')}
          </button>
        </div>
      </Field>
      <div className="cm-hp" aria-hidden="true">
        <label>
          Website <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
        </label>
      </div>
      <label className="cm-check">
        <input type="checkbox" checked={f.notifyReplies} onChange={set('notifyReplies')} /> {t('auth.notifyReplies')}
      </label>
      <label className={`cm-check ${errors.acceptGuidelines ? 'has-err' : ''}`}>
        <input type="checkbox" checked={f.acceptGuidelines} onChange={set('acceptGuidelines')} required />{' '}
        <span>
          {t.rich('auth.acceptGuidelines', { link: (c) => <Link href="/community">{c}</Link> })}
        </span>
      </label>
      {err('acceptGuidelines') && <p className="cm-error">{err('acceptGuidelines')}</p>}
      <label className={`cm-check ${errors.acceptPrivacy ? 'has-err' : ''}`}>
        <input type="checkbox" checked={f.acceptPrivacy} onChange={set('acceptPrivacy')} required />{' '}
        <span>{t.rich('pilot.acceptPrivacy', { link: (c) => <Link href="/privacy">{c}</Link> })}</span>
      </label>
      {err('acceptPrivacy') && <p className="cm-error">{err('acceptPrivacy')}</p>}
      {MODE === 'pilot' && (
        <>
          <label className={`cm-check ${errors.acceptPilot ? 'has-err' : ''}`}>
            <input type="checkbox" checked={f.acceptPilot} onChange={set('acceptPilot')} required />{' '}
            <span>{PILOT_END ? t('pilot.acceptPilotDated', { date: PILOT_END }) : t('pilot.acceptPilot')}</span>
          </label>
          {err('acceptPilot') && <p className="cm-error">{err('acceptPilot')}</p>}
        </>
      )}
      <p className="cm-hint">{t('auth.privacyNote')}</p>
      <Turnstile onToken={onToken} />
      <button type="submit" className="btn btn-navy" disabled={busy}>
        {busy ? t('auth.working') : t('auth.createAccount')}
      </button>
      {formErr && (
        <p className="cm-error" role="alert">
          {formErr}
        </p>
      )}
      <p className="cm-alt">
        {t('auth.haveAccount')} <Link href="/account/login">{t('auth.signIn')}</Link>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ login */

export function LoginForm() {
  const t = useTranslations('community');
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [twoStep, setTwoStep] = useState(false);
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const onToken = useCallback((x: string) => setCaptcha(x), []);
  if (MODE === 'off') return <CommunityOff />;
  const headers = captcha ? { 'x-captcha-response': captcha } : undefined;

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const clean = code.replace(/\s/g, '');
    const { error } = useBackup ? await authClient.twoFactor.verifyBackupCode({ code: clean }) : await authClient.twoFactor.verifyTotp({ code: clean });
    setBusy(false);
    if (error) return setMsg({ kind: 'error', text: error.status === 429 ? t('errors.rate_limited') : t('twoFactor.badCode') });
    router.push('/account');
    router.refresh();
  };
  if (twoStep)
    return (
      <form className="cm-form" onSubmit={verify}>
        <p>{useBackup ? t('twoFactor.backupPrompt') : t('twoFactor.prompt')}</p>
        <Field id={`${id}-c`} label={useBackup ? t('twoFactor.backupCode') : t('twoFactor.code')}>
          <input id={`${id}-c`} value={code} onChange={(e) => setCode(e.target.value)} inputMode={useBackup ? 'text' : 'numeric'} autoComplete="one-time-code" required dir="ltr" autoFocus />
        </Field>
        <button type="submit" className="btn btn-navy" disabled={busy || code.trim().length < 6}>
          {t('twoFactor.verify')}
        </button>
        <button type="button" className="cm-act" onClick={() => { setUseBackup((x) => !x); setCode(''); }}>
          {useBackup ? t('twoFactor.useApp') : t('twoFactor.useBackup')}
        </button>
        {msg && (
          <p className={msg.kind === 'error' ? 'cm-error' : 'cm-status'} role={msg.kind === 'error' ? 'alert' : 'status'}>
            {msg.text}
          </p>
        )}
      </form>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data, error } = await authClient.signIn.email({ email, password, callbackURL: `/${locale}/account` }, { headers });
    setBusy(false);
    if (!error && data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      setTwoStep(true);
      return;
    }
    if (!error) {
      router.push('/account');
      router.refresh();
      return;
    }
    if (error.status === 403) {
      setUnverified(true);
      setMsg({ kind: 'error', text: t('auth.notVerified') });
    } else if (error.status === 429) setMsg({ kind: 'error', text: t('errors.rate_limited') });
    else setMsg({ kind: 'error', text: t('auth.badCredentials') });
  };
  const resend = async () => {
    await authClient.sendVerificationEmail({ email, callbackURL: `/${locale}/account?verified=1` });
    setMsg({ kind: 'info', text: t('auth.resent') });
  };

  return (
    <form className="cm-form" onSubmit={submit}>
      <DemoNote />
      <Field id={`${id}-e`} label={t('auth.email')}>
        <input id={`${id}-e`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required dir="ltr" />
      </Field>
      <Field id={`${id}-p`} label={t('auth.password')}>
        <input id={`${id}-p`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required dir="ltr" />
      </Field>
      <Turnstile onToken={onToken} />
      <button type="submit" className="btn btn-navy" disabled={busy}>
        {busy ? t('auth.working') : t('auth.signIn')}
      </button>
      {msg && (
        <p className={msg.kind === 'error' ? 'cm-error' : 'cm-status'} role={msg.kind === 'error' ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}
      {unverified && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={resend}>
          {t('auth.resend')}
        </button>
      )}
      <p className="cm-alt">
        <Link href="/account/forgot">{t('auth.forgot')}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/account/register">{t('auth.register')}</Link>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ password reset */

export function ForgotForm() {
  const t = useTranslations('community');
  const locale = useLocale();
  const id = useId();
  const [email, setEmail] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [sent, setSent] = useState(false);
  const onToken = useCallback((x: string) => setCaptcha(x), []);
  if (MODE === 'off') return <CommunityOff />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await authClient.requestPasswordReset({ email, redirectTo: `/${locale}/account/reset` }, { headers: captcha ? { 'x-captcha-response': captcha } : undefined });
    // Same message whatever happened: no account enumeration.
    setSent(true);
  };
  return sent ? (
    <div className="cm-card" role="status">
      <p>{t('auth.resetSent')}</p>
      {MODE === 'demo' && <p className="cm-hint">{t('auth.demoMail')}</p>}
    </div>
  ) : (
    <form className="cm-form" onSubmit={submit}>
      <DemoNote />
      <Field id={`${id}-e`} label={t('auth.email')}>
        <input id={`${id}-e`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required dir="ltr" />
      </Field>
      <Turnstile onToken={onToken} />
      <button type="submit" className="btn btn-navy">
        {t('auth.sendReset')}
      </button>
    </form>
  );
}

export function ResetForm() {
  const t = useTranslations('community');
  const id = useId();
  const [token, setToken] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [pw, setPw] = useState('');
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    setToken(u.get('token'));
    setInvalid(u.get('error') === 'INVALID_TOKEN' || u.get('error') === 'invalid_token');
  }, []);
  if (MODE === 'off') return <CommunityOff />;
  if (invalid || (token === null && typeof window !== 'undefined' && !new URLSearchParams(window.location.search).get('token')))
    return (
      <div className="cm-card">
        <p>{t('auth.resetInvalid')}</p>
        <Link href="/account/forgot">{t('auth.forgot')}</Link>
      </div>
    );
  if (state === 'done')
    return (
      <div className="cm-card" role="status">
        <p>{t('auth.resetDone')}</p>
        <Link href="/account/login" className="btn btn-navy btn-sm">
          {t('auth.signIn')}
        </Link>
      </div>
    );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const { error } = await authClient.resetPassword({ newPassword: pw, token });
    setState(error ? 'error' : 'done');
  };
  return (
    <form className="cm-form" onSubmit={submit}>
      <Field id={`${id}-p`} label={t('auth.newPassword')} hint={t('auth.passwordHint')} error={state === 'error' ? t('auth.resetInvalid') : null}>
        <input id={`${id}-p`} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required dir="ltr" />
      </Field>
      <button type="submit" className="btn btn-navy">
        {t('auth.saveNewPassword')}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ account */

type Me = {
  viewer: Viewer | null;
  email?: string;
  profile?: { displayName: string; bio: string | null; region: string | null; preferredLanguage: string | null; interests: string[]; showHistory: boolean; notifyReplies: boolean } | null;
  moderation?: { id: string; action: string; reason: string; until: string | null; createdAt: string; appeal: string | null }[];
  unreadNotifications?: number;
  staffStatus?: string | null;
  pilot?: boolean;
};
type Note = { id: string; kind: string; payload: Record<string, string>; read: boolean; createdAt: string };

export function AccountPanel() {
  const t = useTranslations('community');
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [verifiedNow, setVerifiedNow] = useState(false);
  const id = useId();

  const load = useCallback(async () => {
    const r = await api<Me>('/api/community/me');
    setMe(r.ok ? r.data : { viewer: null });
    if (r.ok && r.data.viewer) {
      const n = await api<{ items: Note[] }>('/api/community/notifications');
      if (n.ok) setNotes(n.data.items);
    }
  }, []);
  useEffect(() => {
    if (MODE === 'off') return;
    setVerifiedNow(new URLSearchParams(window.location.search).get('verified') === '1');
    load();
  }, [load]);

  if (MODE === 'off') return <CommunityOff />;
  if (!me) return <p className="cm-note">{t('loading')}</p>;
  if (!me.viewer)
    return (
      <div className="cm-card">
        <p>{t('auth.signedOut')}</p>
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
  const v = me.viewer;
  const p = me.profile;

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await api('/api/community/me', {
      method: 'PATCH',
      body: {
        displayName: fd.get('displayName'),
        bio: fd.get('bio'),
        region: fd.get('region'),
        preferredLanguage: fd.get('preferredLanguage'),
        interests: String(fd.get('interests') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        showHistory: fd.get('showHistory') === 'on',
        notifyReplies: fd.get('notifyReplies') === 'on',
      },
    });
    setSaved(r.ok ? t('account.saved') : t(`fieldErrors.displayName.${r.data.fields?.displayName ?? 'required'}`));
    if (r.ok) load();
  };
  const signOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="cm-account">
      <DemoNote />
      {verifiedNow && v.emailVerified && (
        <p className="cm-status" role="status">
          {t('account.verifiedNow')}
        </p>
      )}
      <section className="cm-card cm-idcard" aria-labelledby={`${id}-h`}>
        <Avatar name={v.displayName} staff={Boolean(v.staff)} size={56} />
        <div>
          <h2 id={`${id}-h`} className="cm-card-title">
            {v.displayName}
          </h2>
          <p className="cm-handle">@{v.username}</p>
          {v.staff && <p className="cm-staff">{t('comments.staffBadge')} · {v.staff.title}</p>}
          <p className="cm-hint">
            {t('account.privateEmail')} <span dir="ltr">{me.email}</span>
          </p>
          <p className="cm-hint">{v.emailVerified ? t('account.emailVerified') : t('errors.email_unverified')}</p>
          <p>
            <Link href={`/u/${v.username}`}>{t('account.viewPublic')}</Link>
          </p>
        </div>
      </section>

      {v.restriction && (
        <p className="cm-note cm-note-warn" role="note">
          {t(v.restriction.kind === 'suspended' ? 'errors.suspended' : 'errors.comment_restricted')} {t('comments.reason', { reason: v.restriction.reason })}
          {v.restriction.endsAt && <> {t('comments.until', { date: new Date(v.restriction.endsAt).toLocaleString() })}</>}
        </p>
      )}

      {v.staff && me.staffStatus && (
        <p className="cm-note cm-note-warn" role="note">
          {t(`staffStatus.${me.staffStatus}`)}
        </p>
      )}
      {me.pilot && (
        <section className="cm-card cm-pilot-card">
          <h2 className="cm-card-title">{t('pilot.cardTitle')}</h2>
          <p>{t('pilot.cardText')}</p>
          <p>
            <Link href="/pilot" className="btn btn-gold btn-sm">
              {t('pilot.cardCta')}
            </Link>
          </p>
        </section>
      )}
      <TwoFactor enabled={v.twoFactorEnabled} staff={Boolean(v.staff)} onChange={load} />

      <section className="cm-card" aria-labelledby={`${id}-n`}>
        <h2 id={`${id}-n`} className="cm-card-title">
          {t('account.notifications')}
        </h2>
        {notes.length === 0 ? (
          <p className="cm-hint">{t('account.noNotifications')}</p>
        ) : (
          <ul className="cm-notes" role="list">
            {notes.map((n) => (
              <li key={n.id} className={n.read ? '' : 'is-unread'}>
                <span>{t(`account.noteKinds.${n.kind}`)}</span>
                {n.payload.reason && <span> — {n.payload.reason}</span>}
                {n.payload.body && <span> — {n.payload.body}</span>}
                {n.payload.article && (
                  <>
                    {' '}
                    <Link href={`/article/${n.payload.article}#c-${n.payload.commentId}`}>{t('account.open')}</Link>
                  </>
                )}
                <time className="cm-hint" dateTime={n.createdAt}>
                  {' '}
                  {new Date(n.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
        {notes.some((n) => !n.read) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await api('/api/community/notifications', { method: 'POST', body: {} }); load(); }}>
            {t('account.markRead')}
          </button>
        )}
      </section>

      <form className="cm-card cm-form" onSubmit={saveProfile} aria-labelledby={`${id}-p`}>
        <h2 id={`${id}-p`} className="cm-card-title">
          {t('account.profile')}
        </h2>
        <Field id={`${id}-dn`} label={t('auth.displayName')}>
          <input id={`${id}-dn`} name="displayName" defaultValue={p?.displayName ?? v.displayName} maxLength={50} required />
        </Field>
        <Field id={`${id}-bio`} label={t('account.bio')} hint={t('account.bioHint')}>
          <textarea id={`${id}-bio`} name="bio" defaultValue={p?.bio ?? ''} maxLength={280} rows={3} dir="auto" />
        </Field>
        <Field id={`${id}-rg`} label={t('account.region')}>
          <input id={`${id}-rg`} name="region" defaultValue={p?.region ?? ''} maxLength={60} />
        </Field>
        <Field id={`${id}-lg`} label={t('account.language')}>
          <select id={`${id}-lg`} name="preferredLanguage" defaultValue={p?.preferredLanguage ?? ''}>
            <option value="">—</option>
            {['fr', 'en', 'wo', 'ar', 'es', 'pt', 'de', 'it', 'tr', 'zh'].map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-in`} label={t('account.interests')} hint={t('account.interestsHint')}>
          <input id={`${id}-in`} name="interests" defaultValue={(p?.interests ?? []).join(', ')} />
        </Field>
        <fieldset className="cm-fieldset">
          <legend>{t('account.privacy')}</legend>
          <label className="cm-check">
            <input type="checkbox" name="showHistory" defaultChecked={p?.showHistory ?? true} /> {t('account.showHistory')}
          </label>
          <label className="cm-check">
            <input type="checkbox" name="notifyReplies" defaultChecked={p?.notifyReplies ?? false} /> {t('auth.notifyReplies')}
          </label>
        </fieldset>
        <button type="submit" className="btn btn-navy btn-sm">
          {t('account.save')}
        </button>
        {saved && (
          <p className="cm-status" role="status">
            {saved}
          </p>
        )}
      </form>

      <Moderation items={me.moderation ?? []} reload={load} />

      <section className="cm-card" aria-labelledby={`${id}-s`}>
        <h2 id={`${id}-s`} className="cm-card-title">
          {t('account.session')}
        </h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
          {t('auth.signOut')}
        </button>
        <DeleteAccount username={v.username} />
      </section>
    </div>
  );
}

function Moderation({ items, reload }: { items: NonNullable<Me['moderation']>; reload: () => void }) {
  const t = useTranslations('community');
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<string | null>(null);
  if (!items.length) return null;
  const send = async (actionId: string) => {
    const r = await api('/api/community/appeals', { method: 'POST', body: { actionId, message: msg } });
    setResult(r.ok ? t('account.appealSent') : t(`errors.${r.data.error === 'already_appealed' ? 'already_appealed' : 'generic'}`));
    if (r.ok) {
      setOpen(null);
      setMsg('');
      reload();
    }
  };
  return (
    <section className="cm-card" aria-labelledby="cm-modrec">
      <h2 id="cm-modrec" className="cm-card-title">
        {t('account.moderationRecord')}
      </h2>
      <p className="cm-hint">{t('account.moderationPrivate')}</p>
      <ul className="cm-notes" role="list">
        {items.map((a) => (
          <li key={a.id}>
            <strong>{t(`ladder.${a.action}`)}</strong> — {a.reason}{' '}
            <time className="cm-hint" dateTime={a.createdAt}>
              {new Date(a.createdAt).toLocaleDateString()}
            </time>
            {a.until && <span className="cm-hint"> · {t('comments.until', { date: new Date(a.until).toLocaleString() })}</span>}
            {a.appeal ? (
              <span className="cm-pill">{t(`account.appealStatus.${a.appeal}`)}</span>
            ) : a.action !== 'escalate' ? (
              open === a.id ? (
                <div className="cm-appeal">
                  <label className="cm-field">
                    <span>{t('account.appealMessage')}</span>
                    <textarea value={msg} onChange={(e) => setMsg(e.target.value)} minLength={10} maxLength={2000} rows={3} />
                  </label>
                  <button type="button" className="btn btn-navy btn-sm" disabled={msg.trim().length < 10} onClick={() => send(a.id)}>
                    {t('account.sendAppeal')}
                  </button>
                </div>
              ) : (
                <button type="button" className="cm-act" onClick={() => setOpen(a.id)}>
                  {t('account.appeal')}
                </button>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {result && (
        <p className="cm-status" role="status">
          {result}
        </p>
      )}
    </section>
  );
}

function DeleteAccount({ username }: { username: string }) {
  const t = useTranslations('community');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const del = async () => {
    const r = await api('/api/community/me', { method: 'DELETE', body: { confirmUsername: confirm } });
    if (r.ok) {
      await authClient.signOut().catch(() => undefined);
      router.push('/');
      router.refresh();
      return;
    }
    setErr(r.data.error === 'reauth_required' ? t('account.reauth') : t('account.confirmMismatch'));
  };
  return (
    <div className="cm-danger">
      {!open ? (
        <button type="button" className="cm-act is-danger" onClick={() => setOpen(true)}>
          {t('account.delete')}
        </button>
      ) : (
        <div>
          <p>{t('account.deleteExplain')}</p>
          <label className="cm-field">
            <span>{t('account.deleteConfirm', { username })}</span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="none" dir="ltr" />
          </label>
          <button type="button" className="btn btn-sm cm-btn-danger" disabled={confirm.toLowerCase() !== username} onClick={del}>
            {t('account.deleteForever')}
          </button>{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
            {t('comments.cancel')}
          </button>
          {err && (
            <p className="cm-error" role="alert">
              {err}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
