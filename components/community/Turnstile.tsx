'use client';

import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from './client';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

/** Cloudflare Turnstile (privacy-friendly anti-bot). Renders nothing when no site key is configured. */
export default function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    const el = box.current;
    const draw = () => window.turnstile?.render(el, { sitekey: TURNSTILE_SITE_KEY, callback: onToken, 'expired-callback': () => onToken('') });
    if (window.turnstile) draw();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = draw;
      document.head.appendChild(s);
    }
  }, [onToken]);
  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="cm-captcha" />;
}
