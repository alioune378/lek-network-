import { useTranslations } from 'next-intl';

export type DivisionName = 'news' | 'watch' | 'live' | 'originals' | 'studios';

/**
 * Division signature: the same LËK wordmark type, with a distinct treatment per editorial purpose.
 * News = serif with a gold rule; Watch = play mark; Live = status dot (red only when on air);
 * Originals = italic serif; Studios = framed, widely tracked.
 */
export default function Division({ name, live = false, tone = 'light', as: Tag = 'p' }: { name: DivisionName; live?: boolean; tone?: 'light' | 'dark'; as?: 'p' | 'span' }) {
  const t = useTranslations('divisions');
  return (
    <Tag className={`division division-${name} division-${tone} ${live ? 'is-live' : ''}`}>
      {name === 'watch' && <span className="division-play" aria-hidden="true" />}
      {name === 'live' && <span className="division-dot" aria-hidden="true" />}
      <span className="division-lek">LËK</span>
      <span className="division-name">{t(name)}</span>
    </Tag>
  );
}
