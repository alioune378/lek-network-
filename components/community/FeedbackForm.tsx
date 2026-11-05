'use client';

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MODE, api } from './client';
import { useViewer } from './useViewer';
import Turnstile from './Turnstile';
import { CommunityOff } from './AccountForms';

const CATS = ['article_feedback', 'factual_error', 'story_idea', 'editorial_question', 'technical', 'private_concern'] as const;

/** "Votre voix compte": private messages to the newsroom. Never published. Not for sensitive tips. */
export default function FeedbackForm({ articles }: { articles: { slug: string; title: string }[] }) {
  const t = useTranslations('community');
  const locale = useLocale();
  const id = useId();
  const { viewer } = useViewer();
  const [category, setCategory] = useState<string>('');
  const [article, setArticle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [ref, setRef] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const onToken = useCallback((x: string) => setCaptcha(x), []);
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get('article');
    if (a && articles.some((x) => x.slug === a)) {
      setArticle(a);
      setCategory('article_feedback');
    }
  }, [articles]);
  if (MODE === 'off') return <CommunityOff />;
  if (ref)
    return (
      <div className="cm-card" role="status">
        <h2 className="cm-card-title">{t('feedback.thanks')}</h2>
        <p>{t('feedback.reference', { ref })}</p>
        <p className="cm-hint">{viewer ? t('feedback.replyAccount') : email ? t('feedback.replyEmail') : t('feedback.replyNone')}</p>
      </div>
    );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const r = await api<{ reference: string }>('/api/community/feedback', {
      method: 'POST',
      body: { category, article: article || undefined, message, contactEmail: viewer ? undefined : email || undefined, lang: locale, website, captcha },
    });
    if (r.ok) setRef(r.data.reference);
    else setErr(r.data.error === 'rate_limited' ? t('errors.rate_limited') : r.data.fields ? t('feedback.fixFields') : t('errors.generic'));
  };
  return (
    <form className="cm-form" onSubmit={submit}>
      {MODE === 'demo' && <p className="cm-demo">{t('demoBanner')}</p>}
      <fieldset className="cm-fieldset">
        <legend>{t('feedback.category')}</legend>
        <div className="cm-cats">
          {CATS.map((c) => (
            <label key={c} className={`cm-cat ${category === c ? 'is-on' : ''}`}>
              <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} required />
              <span className="cm-cat-name">{t(`feedback.cats.${c}.name`)}</span>
              <span className="cm-cat-hint">{t(`feedback.cats.${c}.hint`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {category === 'private_concern' && <p className="cm-note cm-note-warn">{t('feedback.secureTips')}</p>}
      <div className="cm-field">
        <label htmlFor={`${id}-a`}>{t('feedback.article')}</label>
        <select id={`${id}-a`} value={article} onChange={(e) => setArticle(e.target.value)}>
          <option value="">{t('feedback.noArticle')}</option>
          {articles.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.title}
            </option>
          ))}
        </select>
      </div>
      <div className="cm-field">
        <label htmlFor={`${id}-m`}>{t('feedback.message')}</label>
        <textarea id={`${id}-m`} value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={6000} rows={6} required dir="auto" />
      </div>
      {!viewer && (
        <div className="cm-field">
          <label htmlFor={`${id}-e`}>{t('feedback.email')}</label>
          <input id={`${id}-e`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" aria-describedby={`${id}-e-h`} />
          <p className="cm-hint" id={`${id}-e-h`}>
            {t('feedback.emailHint')}
          </p>
        </div>
      )}
      <div className="cm-hp" aria-hidden="true">
        <label>
          Website <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      <p className="cm-hint">{t('feedback.private')}</p>
      {!viewer && <Turnstile onToken={onToken} />}
      <button type="submit" className="btn btn-navy" disabled={!category || message.trim().length < 10}>
        {t('feedback.send')}
      </button>
      {err && (
        <p className="cm-error" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
