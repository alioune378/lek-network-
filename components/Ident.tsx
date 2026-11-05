'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { identSvg } from '@/lib/ident';
import './ident.css';

/**
 * The LËK broadcast ident on the web: plays once (silent, 6 s) when it scrolls into view.
 * With reduced motion it is the static final frame, and no replay control is offered.
 */
export default function Ident({ className = '', autoPlay = true }: { className?: string; autoPlay?: boolean }) {
  const t = useTranslations('brand');
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const id = `id${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svg = identSvg({ id, tagline: 'Toujours un temps d’avance.', label: t('identLabel') });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: no-preference)');
    setCanMove(mq.matches);
    if (!autoPlay || !mq.matches || !box.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [autoPlay]);

  const replay = () => {
    setPlaying(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  };

  return (
    <div className={`ident-wrap ${className}`}>
      <div ref={box} className={`ident ${playing ? 'is-playing' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />
      {canMove && (
        <button type="button" className="ident-replay" onClick={replay}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t('replay')}
        </button>
      )}
    </div>
  );
}
