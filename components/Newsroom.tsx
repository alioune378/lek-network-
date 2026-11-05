'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CATEGORIES, PROGRAMMES, REGION_NAMES, type Category, type CoverPattern, type RegionSlug, type Tone } from '@/lib/content';
import Cover from './Cover';

/**
 * LËK newsroom — DEMONSTRATION ONLY.
 * Everything is stored in this browser (localStorage). There is no authentication, no server, no shared database
 * and no real publishing: "Published (demo)" never reaches the public site. Roles are simulated to show the workflow.
 */

type Role = 'reporter' | 'editor' | 'chief' | 'translator';
type Status = 'draft' | 'review' | 'approved' | 'scheduled' | 'published';
type TrState = 'missing' | 'draft' | 'review' | 'reviewed';
type TrLang = 'fr' | 'en' | 'ar' | 'wo';
type Art = {
  id: string;
  headline: string;
  dek: string;
  body: string;
  category: Category;
  region: RegionSlug;
  sources: string[];
  status: Status;
  scheduledAt?: string;
  author: Role;
  updated: string;
  history: { at: string; who: Role; action: string }[];
  translations: Record<TrLang, TrState>;
  corrections: { at: string; text: string }[];
};
type Vid = { id: string; title: string; programme: string; duration: string; subtitles: TrLang[]; rights: boolean };
type Store = { articles: Art[]; videos: Vid[] };

const KEY = 'lek-newsroom-v2';
const TR_LANGS: TrLang[] = ['fr', 'en', 'ar', 'wo'];
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const SEED: Store = {
  articles: [
    {
      id: 'demo1',
      headline: 'Exemple : la rentrée scolaire vue par les parents (brouillon fictif)',
      dek: 'Brouillon de démonstration pour tester le circuit de validation.',
      body: 'Texte fictif. Aucun fait réel.\n\nUn vrai article citerait ses sources ici.',
      category: 'society',
      region: 'thies',
      sources: ['Exemple : entretien enregistré (fictif)'],
      status: 'review',
      author: 'reporter',
      updated: '2026-11-05T08:00:00Z',
      history: [
        { at: '2026-11-05T07:40:00Z', who: 'reporter', action: 'create' },
        { at: '2026-11-05T08:00:00Z', who: 'reporter', action: 'submit' },
      ],
      translations: { fr: 'reviewed', en: 'draft', ar: 'missing', wo: 'missing' },
      corrections: [],
    },
  ],
  videos: [],
};

/** What each simulated role may do. A real system would enforce this on the server. */
const CAN: Record<string, Role[]> = {
  create: ['reporter', 'editor', 'chief'],
  edit: ['reporter', 'editor', 'chief'],
  submit: ['reporter', 'editor', 'chief'],
  approve: ['editor', 'chief'],
  reject: ['editor', 'chief'],
  schedule: ['chief'],
  publish: ['chief'],
  unpublish: ['chief'],
  delete: ['chief', 'reporter'],
  translate: ['translator', 'chief'],
  correct: ['editor', 'chief'],
  media: ['reporter', 'editor', 'chief'],
};

const PATTERNS: CoverPattern[] = ['weave', 'rings', 'grid', 'waves', 'diamonds', 'rays'];
const TONES: Tone[] = ['night', 'ochre', 'indigo', 'clay', 'forest', 'sand'];

export default function Newsroom() {
  const t = useTranslations('newsroom');
  const tc = useTranslations('categories');
  const [store, setStore] = useState<Store>(SEED);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>('reporter');
  const [tab, setTab] = useState<'articles' | 'translations' | 'corrections' | 'media' | 'video'>('articles');
  const [editing, setEditing] = useState<Art | null>(null);
  const [preview, setPreview] = useState<Art | null>(null);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStore(JSON.parse(raw) as Store);
    } catch {
      /* ignore corrupted demo data */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* storage full or unavailable */
    }
  }, [store, ready]);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(''), 2600);
    return () => clearTimeout(id);
  }, [flash]);

  const allowed = (action: string) => CAN[action]?.includes(role) ?? false;
  const guard = (action: string, fn: () => void) => (allowed(action) ? fn() : setFlash(t('notAllowed')));

  const updateArt = (id: string, patch: Partial<Art>, action: string) =>
    setStore((s) => ({
      ...s,
      articles: s.articles.map((a) => (a.id === id ? { ...a, ...patch, updated: now(), history: [...a.history, { at: now(), who: role, action }] } : a)),
    }));

  const transition = (a: Art, action: keyof typeof NEXT) => guard(action, () => updateArt(a.id, NEXT[action](), action));

  const save = (a: Art) =>
    guard(store.articles.some((x) => x.id === a.id) ? 'edit' : 'create', () => {
      setStore((s) => {
        const exists = s.articles.some((x) => x.id === a.id);
        const entry = { at: now(), who: role, action: exists ? 'edit' : 'create' };
        const next: Art = { ...a, updated: now(), history: [...a.history, entry] };
        return { ...s, articles: exists ? s.articles.map((x) => (x.id === a.id ? next : x)) : [next, ...s.articles] };
      });
      setEditing(null);
    });

  const blank = (): Art => ({
    id: uid(),
    headline: '',
    dek: '',
    body: '',
    category: 'society',
    region: 'dakar',
    sources: [],
    status: 'draft',
    author: role,
    updated: now(),
    history: [],
    translations: { fr: 'reviewed', en: 'missing', ar: 'missing', wo: 'missing' },
    corrections: [],
  });

  const counts = useMemo(() => {
    const c: Record<Status, number> = { draft: 0, review: 0, approved: 0, scheduled: 0, published: 0 };
    store.articles.forEach((a) => c[a.status]++);
    return c;
  }, [store.articles]);

  if (!ready) return <p className="meta">…</p>;

  return (
    <div className="cms">
      <div className="cms-bar">
        <label className="cms-role">
          <span>{t('role')}</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(['reporter', 'editor', 'chief', 'translator'] as Role[]).map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="cms-tabs" role="tablist">
          {(['articles', 'translations', 'corrections', 'media', 'video'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setStore(SEED);
            setEditing(null);
          }}
        >
          {t('reset')}
        </button>
      </div>
      <p className="cms-ai">{t('aiRule')}</p>
      {flash && (
        <p className="cms-flash" role="alert">
          {flash}
        </p>
      )}

      {tab === 'articles' && (
        <>
          <div className="cms-pipeline">
            {(Object.keys(counts) as Status[]).map((s) => (
              <span key={s} className={`st st-${s}`}>
                {t(`statuses.${s}`)} <b>{counts[s]}</b>
              </span>
            ))}
            <button type="button" className="btn btn-navy btn-sm" onClick={() => guard('create', () => setEditing(blank()))}>
              + {t('new')}
            </button>
          </div>

          {editing && <Editor art={editing} onCancel={() => setEditing(null)} onSave={save} />}

          {store.articles.length === 0 ? (
            <p className="empty">{t('empty')}</p>
          ) : (
            <ul className="cms-list" role="list">
              {store.articles.map((a) => (
                <li key={a.id} className="cms-item">
                  <div className="cms-item-main">
                    <span className={`st st-${a.status}`}>{t(`statuses.${a.status}`)}</span>
                    <h3 className="cms-item-title">{a.headline || '—'}</h3>
                    <p className="meta">
                      {tc(a.category)} · {REGION_NAMES[a.region].fr} · {t(`roles.${a.author}`)} · {new Date(a.updated).toLocaleString()}
                      {a.scheduledAt ? ` · ${t('scheduled')}: ${new Date(a.scheduledAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <div className="cms-actions">
                    <button type="button" onClick={() => setPreview(a)}>
                      {t('preview')}
                    </button>
                    {(a.status === 'draft' || a.status === 'review') && (
                      <button type="button" onClick={() => guard('edit', () => setEditing(a))}>
                        {t('edit')}
                      </button>
                    )}
                    {a.status === 'draft' && (
                      <button type="button" onClick={() => transition(a, 'submit')}>
                        {t('actions.submit')}
                      </button>
                    )}
                    {a.status === 'review' && (
                      <>
                        <button type="button" onClick={() => transition(a, 'approve')}>
                          {t('actions.approve')}
                        </button>
                        <button type="button" onClick={() => transition(a, 'reject')}>
                          {t('actions.reject')}
                        </button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <>
                        <ScheduleButton label={t('actions.schedule')} onPick={(when) => guard('schedule', () => updateArt(a.id, { status: 'scheduled', scheduledAt: when }, 'schedule'))} />
                        <button type="button" onClick={() => transition(a, 'publish')}>
                          {t('actions.publish')}
                        </button>
                      </>
                    )}
                    {a.status === 'scheduled' && (
                      <button type="button" onClick={() => transition(a, 'publish')}>
                        {t('actions.publish')}
                      </button>
                    )}
                    {a.status === 'published' && (
                      <button type="button" onClick={() => transition(a, 'unpublish')}>
                        {t('actions.unpublish')}
                      </button>
                    )}
                    <button type="button" className="danger" onClick={() => guard('delete', () => setStore((s) => ({ ...s, articles: s.articles.filter((x) => x.id !== a.id) })))}>
                      {t('delete')}
                    </button>
                  </div>
                  <details className="cms-history">
                    <summary>{t('history')}</summary>
                    <ol>
                      {a.history.map((h, i) => (
                        <li key={i}>
                          {new Date(h.at).toLocaleString()} — {t(`roles.${h.who}`)} — {h.action}
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'translations' && (
        <div className="cms-table-wrap">
          <h2 className="sub-title">{t('translationMatrix')}</h2>
          <table className="cms-table">
            <thead>
              <tr>
                <th scope="col">{t('headline')}</th>
                {TR_LANGS.map((l) => (
                  <th key={l} scope="col">
                    {l.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.articles.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{a.headline || '—'}</th>
                  {TR_LANGS.map((l) => (
                    <td key={l}>
                      <select
                        aria-label={`${a.headline} — ${l}`}
                        value={a.translations[l]}
                        onChange={(e) => guard('translate', () => updateArt(a.id, { translations: { ...a.translations, [l]: e.target.value as TrState } }, `translation ${l}: ${e.target.value}`))}
                        className={`tr tr-${a.translations[l]}`}
                      >
                        {(['missing', 'draft', 'review', 'reviewed'] as TrState[]).map((s) => (
                          <option key={s} value={s}>
                            {t(`trStates.${s}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'corrections' && (
        <ul className="cms-list" role="list">
          {store.articles.map((a) => (
            <li key={a.id} className="cms-item">
              <div className="cms-item-main">
                <span className={`st st-${a.status}`}>{t(`statuses.${a.status}`)}</span>
                <h3 className="cms-item-title">{a.headline || '—'}</h3>
                {a.corrections.length > 0 && (
                  <ul className="cms-corr">
                    {a.corrections.map((c, i) => (
                      <li key={i}>
                        {new Date(c.at).toLocaleString()} — {c.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <form
                className="cms-inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem('c') as HTMLInputElement;
                  const text = input.value.trim();
                  if (!text) return;
                  guard('correct', () => {
                    updateArt(a.id, { corrections: [...a.corrections, { at: now(), text }] }, 'correction');
                    input.value = '';
                  });
                }}
              >
                <label className="sr-only" htmlFor={`c-${a.id}`}>
                  {t('correctionText')}
                </label>
                <input id={`c-${a.id}`} name="c" placeholder={t('correctionText')} />
                <button type="submit" className="btn btn-navy btn-sm">
                  {t('correction')}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {tab === 'media' && (
        <>
          <p className="notice">{t('mediaHint')}</p>
          <ul className="cms-media" role="list">
            {PATTERNS.flatMap((p, i) => [TONES[i % TONES.length], TONES[(i + 3) % TONES.length]].map((tone) => ({ p, tone }))).map(({ p, tone }) => (
              <li key={`${p}-${tone}`}>
                <Cover pattern={p} tone={tone} seed={`${p}${tone}`} className="cover" />
                <span className="meta">
                  {p} · {tone}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'video' && <VideoDesk t={t} videos={store.videos} onAdd={(v) => guard('media', () => setStore((s) => ({ ...s, videos: [v, ...s.videos] })))} onDelete={(id) => setStore((s) => ({ ...s, videos: s.videos.filter((v) => v.id !== id) }))} />}

      {preview && <Preview art={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

const NEXT = {
  submit: (): Partial<Art> => ({ status: 'review' }),
  approve: (): Partial<Art> => ({ status: 'approved' }),
  reject: (): Partial<Art> => ({ status: 'draft' }),
  publish: (): Partial<Art> => ({ status: 'published', scheduledAt: undefined }),
  unpublish: (): Partial<Art> => ({ status: 'approved' }),
};

function ScheduleButton({ label, onPick }: { label: string; onPick: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <span className="cms-schedule">
      <input type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} aria-label={label} />
      <button
        type="button"
        disabled={!v}
        onClick={() => {
          onPick(new Date(v).toISOString());
          setOpen(false);
        }}
      >
        OK
      </button>
    </span>
  );
}

function Editor({ art, onSave, onCancel }: { art: Art; onSave: (a: Art) => void; onCancel: () => void }) {
  const t = useTranslations('newsroom');
  const tc = useTranslations('categories');
  const [a, setA] = useState(art);
  const set = <K extends keyof Art>(k: K, v: Art[K]) => setA((x) => ({ ...x, [k]: v }));
  const valid = a.headline.trim().length >= 8 && a.body.trim().length >= 30;
  return (
    <form
      className="cms-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(a);
      }}
    >
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="e-h">{t('headline')}</label>
          <input id="e-h" value={a.headline} onChange={(e) => set('headline', e.target.value)} required minLength={8} />
        </div>
        <div className="field field-full">
          <label htmlFor="e-d">{t('dek')}</label>
          <textarea id="e-d" rows={2} value={a.dek} onChange={(e) => set('dek', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-c">{t('category')}</label>
          <select id="e-c" value={a.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tc(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-r">{t('region')}</label>
          <select id="e-r" value={a.region} onChange={(e) => set('region', e.target.value as RegionSlug)}>
            {(Object.keys(REGION_NAMES) as RegionSlug[]).map((r) => (
              <option key={r} value={r}>
                {REGION_NAMES[r].fr}
              </option>
            ))}
          </select>
        </div>
        <div className="field field-full">
          <label htmlFor="e-b">{t('body')}</label>
          <textarea id="e-b" rows={9} value={a.body} onChange={(e) => set('body', e.target.value)} required minLength={30} />
        </div>
        <div className="field field-full">
          <label htmlFor="e-s">{t('sources')}</label>
          <textarea id="e-s" rows={3} value={a.sources.join('\n')} onChange={(e) => set('sources', e.target.value.split('\n').filter(Boolean))} />
        </div>
      </div>
      <div className="cms-editor-actions">
        <button type="submit" className="btn btn-navy" disabled={!valid}>
          {t('save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          ×
        </button>
      </div>
    </form>
  );
}

function Preview({ art, onClose }: { art: Art; onClose: () => void }) {
  const t = useTranslations('newsroom');
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="cms-modal" role="dialog" aria-modal="true" aria-label={t('preview')} onClick={onClose}>
      <article className="cms-modal-in" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn cms-modal-x" onClick={onClose} aria-label="×">
          ×
        </button>
        <p className="kicker">
          <span>{t('preview')}</span>
          <span className="demo-pill">{t(`statuses.${art.status}`)}</span>
        </p>
        <h2 className="article-title">{art.headline}</h2>
        <p className="article-dek">{art.dek}</p>
        <div className="article-body">
          {art.body.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {art.sources.length > 0 && (
          <ul className="cms-corr">
            {art.sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function VideoDesk({ t, videos, onAdd, onDelete }: { t: (key: string) => string; videos: Vid[]; onAdd: (v: Vid) => void; onDelete: (id: string) => void }) {
  return (
    <>
      <p className="notice">{t('videoHint')}</p>
      <form
        className="cms-editor"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const title = String(fd.get('title') ?? '').trim();
          if (!title) return;
          onAdd({
            id: uid(),
            title,
            programme: String(fd.get('programme')),
            duration: String(fd.get('duration') ?? ''),
            subtitles: TR_LANGS.filter((l) => fd.get(`sub-${l}`)),
            rights: Boolean(fd.get('rights')),
          });
          e.currentTarget.reset();
        }}
      >
        <div className="form-grid">
          <div className="field field-full">
            <label htmlFor="v-t">{t('videoTitle')}</label>
            <input id="v-t" name="title" required />
          </div>
          <div className="field">
            <label htmlFor="v-p">{t('programme')}</label>
            <select id="v-p" name="programme">
              {PROGRAMMES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="v-d">{t('duration')}</label>
            <input id="v-d" name="duration" placeholder="26:00" />
          </div>
          <fieldset className="field field-full cms-subs">
            <legend>{t('subtitles')}</legend>
            {TR_LANGS.map((l) => (
              <label key={l}>
                <input type="checkbox" name={`sub-${l}`} /> {l.toUpperCase()}
              </label>
            ))}
            <label>
              <input type="checkbox" name="rights" /> {t('rights')}
            </label>
          </fieldset>
        </div>
        <button type="submit" className="btn btn-navy btn-sm">
          {t('addVideo')}
        </button>
      </form>
      <ul className="cms-list" role="list">
        {videos.map((v) => (
          <li key={v.id} className="cms-item">
            <div className="cms-item-main">
              <span className={`st ${v.rights ? 'st-approved' : 'st-draft'}`}>{v.rights ? '✓' : '!'} {t('rights')}</span>
              <h3 className="cms-item-title">{v.title}</h3>
              <p className="meta">
                {PROGRAMMES.find((p) => p.slug === v.programme)?.name} · {v.duration || '—'} · {v.subtitles.join(', ').toUpperCase() || '—'}
              </p>
            </div>
            <div className="cms-actions">
              <button type="button" className="danger" onClick={() => onDelete(v.id)}>
                {t('delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
