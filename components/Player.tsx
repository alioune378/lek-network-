'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PlayIcon } from './Icons';

type Track = { src: string; lang: string; label: string };

/**
 * Reusable LËK player. Plays only after a tap, always starts muted, never autoplays.
 * MP4 plays natively; HLS (.m3u8) plays natively on Safari/iOS and through hls.js elsewhere, loaded only when needed.
 * Without a source it shows an honest "not available yet" state instead of a fake video.
 */
export default function Player({ src, poster, title, tracks = [], live = false }: { src?: string; poster?: ReactNode; title: string; tracks?: Track[]; live?: boolean }) {
  const t = useTranslations('watch');
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!started || !v || !src) return;
    let destroy: (() => void) | undefined;
    const isHls = src.includes('.m3u8');
    if (isHls && !v.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) return;
        const hls = new Hls({ lowLatencyMode: live });
        hls.loadSource(src);
        hls.attachMedia(v);
        destroy = () => hls.destroy();
        v.play().catch(() => undefined);
      });
    } else {
      v.src = src;
      v.play().catch(() => undefined);
    }
    const onVis = () => document.hidden && v.pause();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      destroy?.();
    };
  }, [started, src, live]);

  if (!src) {
    return (
      <div className="player player-empty" role="img" aria-label={`${title} — ${t('unavailableTitle')}`}>
        <div className="player-poster">{poster}</div>
        <div className="player-empty-body">
          <span className="player-empty-icon" aria-hidden="true">
            <PlayIcon width={26} height={26} />
          </span>
          <p className="player-empty-title">{t('unavailableTitle')}</p>
          <p className="player-empty-text">{t('unavailableText')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player">
      {started ? (
        <video ref={video} controls playsInline muted preload="none" aria-label={title}>
          {tracks.map((tr) => (
            <track key={tr.lang} kind="subtitles" src={tr.src} srcLang={tr.lang} label={tr.label} />
          ))}
        </video>
      ) : (
        <button type="button" className="player-start" onClick={() => setStarted(true)} aria-label={`${t('play')}: ${title}`}>
          <span className="player-poster">{poster}</span>
          <span className="player-play" aria-hidden="true">
            <PlayIcon width={30} height={30} />
          </span>
        </button>
      )}
      <p className="player-note">{t('soundOff')}</p>
    </div>
  );
}
