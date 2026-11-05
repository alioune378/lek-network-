import { useLocale, useTranslations } from 'next-intl';
import { photo as getPhoto, ptx, src, srcSet } from '@/lib/media';
import type { Locale } from '@/lib/locales';

type Props = {
  id: string;
  /** `sizes` attribute for responsive loading. */
  sizes?: string;
  /** Above-the-fold image: load eagerly with high priority. */
  priority?: boolean;
  className?: string;
  /** 'none' = decorative inside a link (credit still on the article/credits page), 'credit' = small overlay credit, 'caption' = full figcaption. */
  caption?: 'none' | 'credit' | 'caption';
  /** Hide from assistive tech when the surrounding link already names the story. */
  decorative?: boolean;
};

/**
 * Licensed illustrative photograph (see lib/media). Captions always say it illustrates a place,
 * not the facts of the story, and credit the author and licence.
 */
export default function Photo({ id, sizes = '100vw', priority, className, caption = 'none', decorative }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations('media');
  const p = getPhoto(id);
  if (!p) return null;
  const img = (
    <img
      src={src(p)}
      srcSet={srcSet(p)}
      sizes={sizes}
      width={p.w}
      height={p.h}
      alt={decorative ? '' : ptx(p.alt, locale)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      style={p.pos ? { objectPosition: p.pos } : undefined}
    />
  );
  const credit = (
    <>
      {p.author} · {p.license === 'Public domain' ? t('publicDomain') : p.license}
    </>
  );
  if (caption === 'caption') {
    return (
      <figure className={`photo ${p.archive ? 'is-archive' : ''} ${className ?? ''}`}>
        <div className="photo-frame">{img}</div>
        <figcaption className="photo-cap">
          <span className="photo-tag">{p.archive ? t('archive') : t('illustration')}</span> {ptx(p.place, locale)}. {t('notOfStory')}{' '}
          <span className="photo-credit">
            {t('photoBy')} <a href={p.source} rel="noopener noreferrer" target="_blank">{p.author}</a>, {p.year} ·{' '}
            {p.licenseUrl ? (
              <a href={p.licenseUrl} rel="license noopener noreferrer" target="_blank">
                {p.license}
              </a>
            ) : (
              t('publicDomain')
            )}{' '}
            · Wikimedia Commons
          </span>
        </figcaption>
      </figure>
    );
  }
  return (
    <span className={`photo ${p.archive ? 'is-archive' : ''} ${className ?? ''}`}>
      {img}
      {p.archive && (
        <span className="archive-badge">
          {t('archive')} · {p.year}
        </span>
      )}
      {caption === 'credit' && <span className="photo-overlay-credit">{credit}</span>}
    </span>
  );
}
