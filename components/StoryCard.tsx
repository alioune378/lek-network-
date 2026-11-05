import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { REGION_NAMES, hasVersion, tx, type Story } from '@/lib/content';
import { formatDate, formatTime } from '@/lib/format';
import type { Locale } from '@/lib/locales';
import Cover from './Cover';

type Variant = 'lead' | 'card' | 'row' | 'brief' | 'compact';

/** One story, in the layouts the homepage and listings need. Text falls back to French when no version exists. */
export default function StoryCard({ story, variant = 'card', index, headingLevel = 3 }: { story: Story; variant?: Variant; index?: number; headingLevel?: 2 | 3 }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const lang = hasVersion(story, locale) ? locale : 'fr';
  const href = `/article/${story.slug}`;
  // A French fallback inside an Arabic page keeps left-to-right direction.
  const d = lang !== locale ? (lang === 'ar' ? 'rtl' : 'ltr') : undefined;
  const title = story.title[lang] ?? story.title.fr;
  const dek = story.dek[lang] ?? story.dek.fr;
  const meta = (
    <p className="meta">
      <span>{tx(REGION_NAMES[story.region], locale)}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={story.published}>{formatDate(story.published, locale)}</time>
      <span aria-hidden="true">·</span>
      <span>{t('common.minRead', { n: story.readTime })}</span>
    </p>
  );
  const kicker = (
    <p className="kicker">
      <span>{tx(story.kicker, locale)}</span>
      <span className="demo-pill">{t('common.demo')}</span>
    </p>
  );

  if (variant === 'brief') {
    return (
      <li className="brief-item">
        <span className="brief-n" aria-hidden="true">
          {String((index ?? 0) + 1).padStart(2, '0')}
        </span>
        <div>
          <time className="brief-time" dateTime={story.published}>
            {formatTime(story.published, locale)}
          </time>
          <Link href={href} className="brief-link" lang={lang} dir={d}>
            {title}
          </Link>
        </div>
      </li>
    );
  }

  if (variant === 'row') {
    return (
      <article className="row-card">
        <Link href={href} className="row-media" tabIndex={-1} aria-hidden="true">
          <Cover {...story.cover} seed={story.slug} className="cover" />
        </Link>
        <div>
          {kicker}
          <H className="row-title" lang={lang} dir={d}>
            <Link href={href}>{title}</Link>
          </H>
          {meta}
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="compact-card">
        {kicker}
        <H className="compact-title" lang={lang} dir={d}>
          <Link href={href}>{title}</Link>
        </H>
        {meta}
      </article>
    );
  }

  return (
    <article className={variant === 'lead' ? 'lead-card' : 'story-card'}>
      <Link href={href} className="card-media" tabIndex={-1} aria-hidden="true">
        <Cover {...story.cover} seed={story.slug} className="cover" />
      </Link>
      {kicker}
      <H className={variant === 'lead' ? 'lead-title' : 'card-title'} lang={lang} dir={d}>
        <Link href={href}>{title}</Link>
      </H>
      <p className={variant === 'lead' ? 'lead-dek' : 'card-dek'} lang={lang} dir={d}>
        {dek}
      </p>
      {meta}
    </article>
  );
}
