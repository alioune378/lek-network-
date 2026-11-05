import type { Programme } from '@/lib/content';
import Photo from './Photo';
import Cover from './Cover';

/**
 * A programme's image. Brand-led formats (the daily briefing) use the LËK ident's final frame;
 * others use a credited location photograph ("mood image"), never presented as a still from the programme.
 */
export default function ProgrammeImage({ p, sizes, priority, credit }: { p: Programme; sizes: string; priority?: boolean; credit?: boolean }) {
  if (p.brandPoster) {
    return (
      <span className="photo media-fill ident-still">
        <img src="/media/motion/lek-ident-end.webp" alt="" width={1280} height={720} loading={priority ? 'eager' : 'lazy'} decoding="async" />
      </span>
    );
  }
  if (p.photo) return <Photo id={p.photo} sizes={sizes} priority={priority} decorative caption={credit ? 'credit' : 'none'} className="media-fill" />;
  return <Cover {...p.cover} seed={p.slug} className="cover media-fill" />;
}
