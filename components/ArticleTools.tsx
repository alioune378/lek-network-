'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LinkIcon, ShareIcon } from './Icons';

const SIZES = [0.94, 1, 1.1, 1.22];
const KEY = 'lek-text-size';

/** Text size (remembered on this device) and sharing: native share sheet, WhatsApp, X, Facebook, copy link. */
export default function ArticleTools({ title }: { title: string }) {
  const t = useTranslations('article');
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanShare(typeof navigator.share === 'function');
    try {
      const v = Number(localStorage.getItem(KEY));
      if (SIZES.includes(v)) setSize(v);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--article-scale', String(size));
    try {
      localStorage.setItem(KEY, String(size));
    } catch {
      /* ignore */
    }
  }, [size]);

  const i = SIZES.indexOf(size);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* cancelled */
      }
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  };
  const enc = encodeURIComponent;

  return (
    <div className="tools">
      <div className="tools-size" role="group" aria-label={t('textSize')}>
        <button type="button" onClick={() => setSize(SIZES[Math.max(0, i - 1)])} disabled={i <= 0} aria-label={t('smaller')}>
          A−
        </button>
        <button type="button" onClick={() => setSize(SIZES[Math.min(SIZES.length - 1, i + 1)])} disabled={i >= SIZES.length - 1} aria-label={t('larger')}>
          A+
        </button>
      </div>
      <div className="tools-share" role="group" aria-label={t('share')}>
        {canShare && (
          <button type="button" onClick={share}>
            <ShareIcon width={17} height={17} /> {t('share')}
          </button>
        )}
        <a href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <a href={`https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer">
          X
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">
          Facebook
        </a>
        <button type="button" onClick={copy}>
          <LinkIcon width={17} height={17} /> {copied ? t('copied') : t('copyLink')}
        </button>
      </div>
      <span className="sr-only" role="status">
        {copied ? t('copied') : ''}
      </span>
    </div>
  );
}
