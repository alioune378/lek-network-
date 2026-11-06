import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { REGION_NAMES, STORIES, hasVersion, programmeBySlug, related, storyBySlug, tx } from '@/lib/content';
import { formatDate, typo } from '@/lib/format';
import { dirOf, localeNames, locales, type Locale } from '@/lib/locales';
import Cover from '@/components/Cover';
import Photo from '@/components/Photo';
import ProgrammeImage from '@/components/ProgrammeImage';
import { photo, ptx } from '@/lib/media';
import StoryCard from '@/components/StoryCard';
import ArticleTools from '@/components/ArticleTools';
import Comments from '@/components/community/Comments';
import { ArrowIcon, PlayIcon } from '@/components/Icons';

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const s = storyBySlug(slug);
  if (!s) return {};
  const l = locale as Locale;
  const lang = hasVersion(s, l) ? l : 'fr';
  return {
    title: s.title[lang] ?? s.title.fr,
    description: s.dek[lang] ?? s.dek.fr,
    alternates: {
      canonical: `/${lang}/article/${s.slug}`,
      // Only languages with an actual version of the article are offered as alternates.
      languages: Object.fromEntries(locales.filter((x) => hasVersion(s, x)).map((x) => [x, `/${x}/article/${s.slug}`])),
    },
    openGraph: { type: 'article', publishedTime: s.published, modifiedTime: s.updated, images: s.photo ? [`/media/photos/${s.photo}-1200.webp`] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const s = storyBySlug(slug);
  if (!s) notFound();
  const t = await getTranslations();

  // Show the article in the reader's language only if that version exists; otherwise the original, with a notice.
  const available = hasVersion(s, locale);
  const lang: Locale = available ? locale : 'fr';
  const textDir = lang !== locale ? dirOf(lang) : undefined;
  const state = s.translation[lang];
  const otherVersions = locales.filter((x) => x !== locale && hasVersion(s, x));
  const prog = s.programme ? programmeBySlug(s.programme) : undefined;
  const ph = photo(s.photo);
  const pick = (v: Partial<Record<Locale, string>> & { fr: string }) => typo(v[lang] ?? v.fr, lang);

  return (
    <article className="article">
      <header className="container article-head">
        <nav className="crumbs" aria-label="breadcrumb">
          <Link href={`/category/${s.category}`}>{t(`categories.${s.category}`)}</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/region/${s.region}`}>{tx(REGION_NAMES[s.region], locale)}</Link>
        </nav>
        <p className="kicker">
          <span>{tx(s.kicker, locale)}</span>
          <span className="demo-pill">{t('common.demo')}</span>
        </p>
        <h1 className="article-title" lang={lang} dir={textDir}>
          {pick(s.title)}
        </h1>
        <p className="article-dek" lang={lang} dir={textDir}>
          {pick(s.dek)}
        </p>
        <div className="byline">
          <p>
            <strong>{t('common.by', { name: s.author })}</strong>
          </p>
          <p className="meta">
            <time dateTime={s.published}>{t('common.published', { date: formatDate(s.published, locale, true) })}</time>
            {s.updated && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={s.updated}>{t('common.updated', { date: formatDate(s.updated, locale, true) })}</time>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{t('common.minRead', { n: s.readTime })}</span>
          </p>
        </div>
      </header>

      {ph ? (
        <div className="article-figure article-photo">
          <Photo id={ph.id} sizes="(min-width: 1280px) 1200px, 100vw" priority caption="caption" />
        </div>
      ) : (
        <figure className="article-figure">
          <Cover {...s.cover} seed={s.slug} className="cover" label={t('common.illustration')} />
          <figcaption className="container-narrow">
            {t('common.illustration')} · {t('article.credit')}: LËK Info
          </figcaption>
        </figure>
      )}

      <div className="container-narrow article-main">
        <ArticleTools title={pick(s.title)} />

        <p className="notice notice-demo" role="note">
          {t('article.fictional')}
        </p>
        {!available && (
          <p className="notice" role="note">
            {t('article.fallback', { language: localeNames[locale] })}
          </p>
        )}
        {available && state === 'needs-review' && (
          <p className="notice" role="note">
            {t('article.needsReview')}
          </p>
        )}

        <div className="article-body" lang={lang} dir={textDir}>
          {(s.body[lang] ?? s.body.fr).map((p, i) => (
            <p key={i}>{typo(p, lang)}</p>
          ))}
        </div>

        {otherVersions.length > 0 && (
          <p className="also-in">
            {t('article.alsoIn')}{' '}
            {otherVersions.map((x, i) => (
              <span key={x}>
                {i > 0 && ' · '}
                <Link href={`/article/${s.slug}`} locale={x} lang={x}>
                  {localeNames[x]}
                </Link>
              </span>
            ))}
          </p>
        )}

        {prog && (
          <Link href={`/watch/${prog.slug}`} className="article-prog">
            <span className="article-prog-media">
              <ProgrammeImage p={prog} sizes="200px" />
            </span>
            <span className="article-prog-body">
              <span className="eyebrow eyebrow-gold">{t('article.relatedVideo')}</span>
              <span className="article-prog-name">
                <PlayIcon width={16} height={16} /> {prog.name}
              </span>
              <span>{t(`watch.states.${prog.state}`)}</span>
            </span>
          </Link>
        )}

        <section className="transparency" aria-labelledby="tr-h">
          <h2 id="tr-h" className="box-title">
            {t('article.transparency')}
          </h2>
          <dl className="tr-list">
            <div>
              <dt>{t('article.author')}</dt>
              <dd>{s.author}</dd>
            </div>
            <div>
              <dt>{t('article.sources')}</dt>
              <dd>
                <ul>
                  {s.sources.map((src, i) => (
                    <li key={i}>{tx(src, lang)}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>{t('article.credit')}</dt>
              <dd>
                {ph ? (
                  <>
                    {ptx(ph.place, locale)} — {ph.author}, {ph.license} ·{' '}
                    <Link href="/credits">{t('nav.credits')}</Link>
                  </>
                ) : (
                  t('common.illustration')
                )}
              </dd>
            </div>
            <div id="corrections">
              <dt>{t('article.corrections')}</dt>
              <dd>
                {s.corrections?.length ? (
                  <ul>
                    {s.corrections.map((c, i) => (
                      <li key={i}>
                        <time dateTime={c.date}>{formatDate(c.date, locale, true)}</time> — {tx(c.text, lang)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  t('article.noCorrections')
                )}
              </dd>
            </div>
          </dl>
          <Link href="/standards" className="more-link">
            {t('nav.standards')} <ArrowIcon width={16} height={16} className="flip-rtl" />
          </Link>
        </section>
      </div>

      <div className="container-narrow">
        <Comments slug={s.slug} />
      </div>

      <section className="container section related" aria-labelledby="rel-h">
        <h2 id="rel-h" className="section-title">
          {t('article.related')}
        </h2>
        <div className="related-grid">
          {related(s).map((r) => (
            <StoryCard key={r.slug} story={r} />
          ))}
        </div>
      </section>
    </article>
  );
}
