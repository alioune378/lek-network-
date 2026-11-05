'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';

const SERVICES = ['brand', 'corporate', 'film', 'events', 'ads', 'interviews', 'post'] as const;
type Errors = Partial<Record<'name' | 'email' | 'service' | 'message' | 'consent', string>>;

/**
 * Commercial inquiry. Validated fully in the browser; NOT transmitted until a delivery service is connected
 * (see README). Success is never claimed: the confirmation says nothing was sent.
 */
export default function StudiosForm() {
  const t = useTranslations('studios');
  const [errors, setErrors] = useState<Errors>({});
  const [ok, setOk] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? '').trim();
    const err: Errors = {};
    if (!v('name')) err.name = t('form.required');
    if (!v('email')) err.email = t('form.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) err.email = t('form.invalidEmail');
    if (!v('service')) err.service = t('form.required');
    if (v('message').length < 20) err.message = v('message') ? t('form.tooShort') : t('form.required');
    if (!fd.get('consent')) err.consent = t('form.required');
    setErrors(err);
    setOk(Object.keys(err).length === 0);
    if (Object.keys(err).length) e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(err)[0]}"]`)?.focus();
  };

  const field = (name: keyof Errors | 'organisation' | 'phone' | 'budget' | 'timing', label: string, input: ReactElement, full = false) => {
    const err = errors[name as keyof Errors];
    return (
      <div className={`field ${full ? 'field-full' : ''} ${err ? 'has-err' : ''}`}>
        <label htmlFor={`f-${name}`}>{label}</label>
        {input}
        {err && (
          <p className="field-err" id={`f-${name}-err`}>
            {err}
          </p>
        )}
      </div>
    );
  };
  const a = (name: string) => ({ id: `f-${name}`, name, 'aria-invalid': Boolean(errors[name as keyof Errors]) || undefined, 'aria-describedby': errors[name as keyof Errors] ? `f-${name}-err` : undefined });

  return (
    <form className="studio-form" onSubmit={submit} noValidate>
      <h2 className="sub-title">{t('form.title')}</h2>
      <p className="notice" role="note">
        {t('form.demoNotice')}
      </p>
      <div className="form-grid">
        {field('name', t('form.name'), <input {...a('name')} autoComplete="name" />)}
        {field('organisation', t('form.organisation'), <input {...a('organisation')} autoComplete="organization" />)}
        {field('email', t('form.email'), <input {...a('email')} type="email" autoComplete="email" inputMode="email" />)}
        {field('phone', t('form.phone'), <input {...a('phone')} type="tel" autoComplete="tel" inputMode="tel" />)}
        {field(
          'service',
          t('form.service'),
          <select {...a('service')} defaultValue="">
            <option value="" disabled>
              {t('form.choose')}
            </option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {t(`services.${s}.title`)}
              </option>
            ))}
          </select>,
        )}
        {field('budget', t('form.budget'), <input {...a('budget')} />)}
        {field('timing', t('form.timing'), <input {...a('timing')} type="date" />, true)}
        {field('message', t('form.message'), <textarea {...a('message')} rows={5} />, true)}
        <div className={`field field-full field-check ${errors.consent ? 'has-err' : ''}`}>
          <input {...a('consent')} type="checkbox" value="yes" />
          <label htmlFor="f-consent">{t('form.consent')}</label>
          {errors.consent && (
            <p className="field-err" id="f-consent-err">
              {errors.consent}
            </p>
          )}
        </div>
      </div>
      <button type="submit" className="btn btn-navy">
        {t('form.submit')}
      </button>
      {ok && (
        <div className="form-ok" role="status">
          <p className="form-ok-title">{t('form.okTitle')}</p>
          <p>{t('form.okText')}</p>
        </div>
      )}
    </form>
  );
}
