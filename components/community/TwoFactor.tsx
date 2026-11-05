'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { authClient } from './client';

/**
 * Two-step verification (TOTP) set-up. Required for every staff power; optional for members.
 * Steps: confirm password → scan QR code (or type the key) → enter a 6-digit code → keep the backup codes.
 */
export default function TwoFactor({ enabled, staff, onChange }: { enabled: boolean; staff: boolean; onChange: () => void }) {
  const t = useTranslations('community');
  const [step, setStep] = useState<'idle' | 'password' | 'scan' | 'disable'>('idle');
  const [password, setPassword] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [backup, setBackup] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error || !data) return setErr(error?.status === 401 || error?.status === 400 ? t('twoFactor.badPassword') : error?.status === 403 ? t('account.reauth') : t('errors.generic'));
    const u = data.totpURI;
    setUri(u);
    setSecret(new URL(u).searchParams.get('secret') ?? '');
    setBackup(data.backupCodes ?? []);
    setQr(await QRCode.toDataURL(u, { margin: 1, width: 220, color: { dark: '#0B0F1A', light: '#FFFFFF' } }));
    setPassword('');
    setStep('scan');
  };
  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') });
    if (error) return setErr(t('twoFactor.badCode'));
    setDone(true);
    setStep('idle');
    onChange();
  };
  const disable = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await authClient.twoFactor.disable({ password });
    if (error) return setErr(t('twoFactor.badPassword'));
    setPassword('');
    setStep('idle');
    onChange();
  };

  return (
    <section className="cm-card" aria-labelledby="tf-h">
      <h2 id="tf-h" className="cm-card-title">
        {t('twoFactor.title')}
      </h2>
      <p className="cm-hint">{staff ? t('twoFactor.staffRequired') : t('twoFactor.intro')}</p>
      {enabled && step === 'idle' && (
        <>
          <p className="cm-status">{t('twoFactor.on')}</p>
          {backup.length > 0 && done && <BackupCodes codes={backup} />}
          <button type="button" className="cm-act is-danger" onClick={() => setStep('disable')}>
            {t('twoFactor.disable')}
          </button>
        </>
      )}
      {!enabled && step === 'idle' && (
        <button type="button" className="btn btn-navy btn-sm" onClick={() => setStep('password')}>
          {t('twoFactor.enable')}
        </button>
      )}
      {(step === 'password' || step === 'disable') && (
        <form className="cm-form" onSubmit={step === 'password' ? start : disable}>
          <label className="cm-field">
            <span>{t('twoFactor.confirmPassword')}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required dir="ltr" />
          </label>
          {step === 'disable' && staff && <p className="cm-note cm-note-warn">{t('twoFactor.disableStaffWarning')}</p>}
          <div className="cm-join-actions">
            <button type="submit" className="btn btn-navy btn-sm">
              {step === 'password' ? t('twoFactor.continue') : t('twoFactor.disable')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep('idle')}>
              {t('comments.cancel')}
            </button>
          </div>
        </form>
      )}
      {step === 'scan' && (
        <form className="cm-form" onSubmit={confirm}>
          <ol className="cm-steps">
            <li>{t('twoFactor.step1')}</li>
            <li>{t('twoFactor.step2')}</li>
          </ol>
          {qr && <img src={qr} alt={t('twoFactor.qrAlt')} width={220} height={220} className="cm-qr" />}
          <p className="cm-hint">
            {t('twoFactor.manual')}{' '}
            <code className="cm-secret" dir="ltr">
              {secret.replace(/(.{4})/g, '$1 ').trim()}
            </code>
          </p>
          <p className="cm-hint">
            <a href={uri}>{t('twoFactor.openApp')}</a>
          </p>
          <BackupCodes codes={backup} />
          <label className="cm-field">
            <span>{t('twoFactor.code')}</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required dir="ltr" />
          </label>
          <button type="submit" className="btn btn-navy btn-sm" disabled={code.replace(/\s/g, '').length !== 6}>
            {t('twoFactor.verify')}
          </button>
        </form>
      )}
      {err && (
        <p className="cm-error" role="alert">
          {err}
        </p>
      )}
    </section>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations('community');
  if (!codes.length) return null;
  return (
    <div className="cm-backup">
      <p>
        <strong>{t('twoFactor.backupTitle')}</strong> {t('twoFactor.backupText')}
      </p>
      <ul className="cm-backup-list" dir="ltr">
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
