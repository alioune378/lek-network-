import type { ReactNode } from 'react';
import type { CoverPattern, Tone } from '@/lib/content';

/**
 * Abstract editorial cover, drawn in SVG from the brand palette.
 * Deliberately not a photograph: the prototype has no licensed news images, and no image here pretends to document an event.
 */
const TONES: Record<Tone, { a: string; b: string; line: string; accent: string }> = {
  night: { a: '#0B0F1A', b: '#1B2440', line: 'rgba(212,160,23,.42)', accent: '#D4A017' },
  ochre: { a: '#3A2608', b: '#B07A10', line: 'rgba(255,236,190,.38)', accent: '#F4D27A' },
  indigo: { a: '#101a3c', b: '#2c3f7a', line: 'rgba(212,160,23,.4)', accent: '#E3B53A' },
  clay: { a: '#3b1a12', b: '#9a4a2c', line: 'rgba(255,214,170,.35)', accent: '#F1B25B' },
  forest: { a: '#0d231c', b: '#2f5d47', line: 'rgba(212,160,23,.38)', accent: '#D9B44A' },
  sand: { a: '#4a3a22', b: '#c9a66b', line: 'rgba(11,15,26,.3)', accent: '#0B0F1A' },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export default function Cover({ pattern, tone, seed, className, label }: { pattern: CoverPattern; tone: Tone; seed: string; className?: string; label?: string }) {
  const t = TONES[tone];
  const h = hash(seed);
  const id = `c${h.toString(36)}`;
  const ox = 260 + (h % 420);
  const oy = 80 + ((h >> 5) % 220);
  const shapes: ReactNode[] = [];

  if (pattern === 'rings') {
    for (let i = 1; i <= 9; i++) shapes.push(<circle key={i} cx={ox} cy={oy} r={i * 46} fill="none" stroke={i === 4 ? t.accent : t.line} strokeWidth={i === 4 ? 3 : 1.2} />);
  } else if (pattern === 'grid') {
    for (let x = 0; x <= 960; x += 48) shapes.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={540} stroke={t.line} strokeWidth={1} />);
    for (let y = 0; y <= 540; y += 48) shapes.push(<line key={`y${y}`} x1={0} y1={y} x2={960} y2={y} stroke={t.line} strokeWidth={1} />);
    for (let k = 0; k < 7; k++) {
      const x = ((h >> k) % 18) * 48;
      const y = ((h >> (k + 3)) % 10) * 48;
      shapes.push(<rect key={`r${k}`} x={x} y={y} width={48 * (1 + (k % 3))} height={48} fill={t.accent} opacity={0.18 + (k % 3) * 0.12} />);
    }
    shapes.push(<path key="route" d={`M0 ${oy + 120} L${ox - 96} ${oy + 120} L${ox - 96} ${oy} L960 ${oy}`} fill="none" stroke={t.accent} strokeWidth={4} />);
  } else if (pattern === 'waves') {
    for (let i = 0; i < 16; i++) {
      const y = 40 + i * 32;
      const amp = 14 + (i % 4) * 6;
      shapes.push(<path key={i} d={`M-20 ${y} C 180 ${y - amp}, 300 ${y + amp}, 480 ${y} S 780 ${y - amp}, 980 ${y}`} fill="none" stroke={i === 7 ? t.accent : t.line} strokeWidth={i === 7 ? 3 : 1.3} />);
    }
  } else if (pattern === 'diamonds') {
    for (let x = -60; x <= 1020; x += 120)
      for (let y = -60; y <= 600; y += 120) {
        const hot = (x + y + h) % 7 === 0;
        shapes.push(<path key={`${x}-${y}`} d={`M${x} ${y - 52} L${x + 52} ${y} L${x} ${y + 52} L${x - 52} ${y} Z`} fill={hot ? t.accent : 'none'} fillOpacity={hot ? 0.28 : 0} stroke={t.line} strokeWidth={1.2} />);
      }
  } else if (pattern === 'rays') {
    for (let i = 0; i < 36; i++) {
      const a = (Math.PI * 2 * i) / 36;
      shapes.push(<line key={i} x1={ox} y1={oy + 220} x2={ox + Math.cos(a) * 900} y2={oy + 220 + Math.sin(a) * 900} stroke={i % 6 === 0 ? t.accent : t.line} strokeWidth={i % 6 === 0 ? 2.4 : 1} />);
    }
    shapes.push(<circle key="sun" cx={ox} cy={oy + 220} r={84} fill={t.accent} opacity={0.85} />);
  } else {
    // weave: nested squares, after the pattern in the hare's leg
    for (let x = 0; x < 960; x += 96)
      for (let y = 0; y < 540; y += 96)
        for (let k = 0; k < 3; k++) {
          const p = 10 + k * 14;
          shapes.push(<rect key={`${x}-${y}-${k}`} x={x + p} y={y + p} width={96 - 2 * p} height={96 - 2 * p} fill="none" stroke={k === 1 && (x + y + h) % 5 === 0 ? t.accent : t.line} strokeWidth={1.2} transform={`rotate(45 ${x + 48} ${y + 48})`} />);
        }
  }

  return (
    <svg className={className} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="1" stopColor={t.b} />
        </linearGradient>
        <radialGradient id={`${id}v`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="960" height="540" fill={`url(#${id}g)`} />
      <g>{shapes}</g>
      <rect width="960" height="540" fill={`url(#${id}v)`} />
    </svg>
  );
}
