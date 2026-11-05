import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { REGION_NAMES, hasVersion, tx, type Story } from '@/lib/content';
import { formatDate, formatShortDate, formatTime } from '@/lib/format';
import type { Locale } from '@/lib/locales';
import Cover from './Cover';
import Photo from './Photo';

type Variant = 'lead' | 'feature' | 'card' | 'side' | 'text' | 'overlay' | 'row' | 'brief' | 'compact' | 'stream';

/** Story image: the licensed illustrative photo when one is assigned, otherwise the brand's abstract cover. */
export function StoryMedia({ story, sizes, priority, credit }: { story: Story; sizes?: string; priority?: boolean; credit?: boolean }) {
  if (story.photo) return <Photo id={story.photo} sizes={sizes} priority={priority} decorative caption={credit ? 'credit' : 'none'} className="media-fill" />;
  return <Cover {...story.cover} seed={story.slug} className="cover media-fill" />;
}

/** One story, in the layouts the homepage and listings need. Text falls back to French when no version exists. */
export default function StoryCard({
  story,
  variant = 'card',
  index,
  headingLevel = 3,
  priority,
}: {
  story: Story;
  variant?: Variant;
  index?: number;
  headingLevel?: 2 | 3;
  priority?: boolean;
}) {
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
  const media = (sizes: string, credit = false) => (
    <Link href={href} className="sc-media" tabIndex={-1} aria-hidden="true">
      <StoryMedia story={story} sizes={sizes} priority={priority} credit={credit} />
    </Link>
  );
  const heading = (cls: string) => (
    <H className={cls} lang={lang} dir={d}>
      <Link href={href} className="sc-link">
        {title}
      </Link>
    </H>
  );

  if (variant === 'brief') {
    return (
      <li className="brief-item">
        <span className="brief-n" aria-hidden="true">
          {String((index ?? 0) + 1).padStart(2, '0')}
        </span>
        <div className="brief-body">
          <p className="brief-meta">
            <span>{tx(story.kicker, locale)}</span>
            <time dateTime={story.published}>{formatTime(story.published, locale)}</time>
          </p>
          <Link href={href} className="brief-link" lang={lang} dir={d}>
            {title}
          </Link>
        </div>
      </li>
    );
  }

  if (variant === 'stream') {
    return (
      <li className="stream-item">
        <time className="stream-time" dateTime={story.published}>
          {formatShortDate(story.published, locale)}
        </time>
        <div className="stream-body">
          <p className="stream-kicker">{tx(story.kicker, locale)}</p>
          <Link href={href} className="stream-link" lang={lang} dir={d}>
            {title}
          </Link>
        </div>
        <Link href={href} className="stream-thumb" tabIndex={-1} aria-hidden="true">
          <StoryMedia story={story} sizes="96px" />
        </Link>
      </li>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="compact-card">
        {kicker}
        {heading('compact-title')}
        {meta}
      </article>
    );
  }

  if (variant === 'text') {
    return (
      <article className="text-card">
        {kicker}
        {heading('text-title')}
        <p className="text-dek" lang={lang} dir={d}>
          {dek}
        </p>
        {meta}
      </article>
    );
  }

  if (variant === 'row' || variant === 'side') {
    return (
      <article className={variant === 'row' ? 'row-card' : 'side-card'}>
        {media(variant === 'row' ? '(min-width: 720px) 220px, 120px' : '140px')}
        <div className="sc-body">
          {kicker}
          {heading(variant === 'row' ? 'row-title' : 'side-title')}
          {meta}
        </div>
      </article>
    );
  }

  if (variant === 'overlay') {
    return (
      <article className="overlay-card">
        <StoryMedia story={story} sizes="(min-width: 900px) 50vw, 100vw" credit />
        <div className="overlay-body">
          {kicker}
          {heading('overlay-title')}
          <p className="overlay-dek" lang={lang} dir={d}>
            {dek}
          </p>
        </div>
      </article>
    );
  }

  if (variant === 'lead') {
    return (
      <article className="lead-card">
        {media('(min-width: 1024px) 66vw, 100vw', true)}
        <div className="lead-body">
          {kicker}
          {heading('lead-title')}
          <p className="lead-dek" lang={lang} dir={d}>
            {dek}
          </p>
          {meta}
        </div>
      </article>
    );
  }

  return (
    <article className={variant === 'feature' ? 'feature-card' : 'story-card'}>
      {media(variant === 'feature' ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 720px) 45vw, 100vw')}
      <div className="sc-body">
        {kicker}
        {heading(variant === 'feature' ? 'feature-title' : 'card-title')}
        {variant === 'feature' && (
          <p className="card-dek" lang={lang} dir={d}>
            {dek}
          </p>
        )}
        {meta}
      </div>
    </article>
  );
}
