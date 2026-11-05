/** Initials avatar (no uploaded images: no third-party tracking, nothing to moderate). Staff get a gold ring. */
export default function Avatar({ name, staff, size = 36 }: { name: string | null; staff?: boolean; size?: number }) {
  const initials = (name ?? '·')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className={`cm-avatar ${staff ? 'is-staff' : ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials || '·'}
    </span>
  );
}
