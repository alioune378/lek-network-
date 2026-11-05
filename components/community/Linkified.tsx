import type { ReactNode } from 'react';

/**
 * Plain-text comment rendering. No HTML is ever interpreted: React escapes everything.
 * Only http(s) links become clickable (nofollow ugc, new tab); everything else stays text.
 */
const RE = /\bhttps?:\/\/[^\s<>"']+/gi;
const SUSPICIOUS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|tiny\.cc|s\.id)\b|^https?:\/\/\d{1,3}(\.\d{1,3}){3}/i;

export default function Linkified({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const url = m[0].replace(/[.,;:!?)]+$/, '');
    const i = m.index ?? 0;
    out.push(text.slice(last, i));
    let host = '';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      host = '';
    }
    if (host && !SUSPICIOUS.test(url)) {
      out.push(
        <a key={i} href={url} rel="nofollow ugc noopener noreferrer" target="_blank" className="cm-link">
          {url.length > 60 ? `${url.slice(0, 57)}…` : url}
          <span className="cm-link-host"> ({host})</span>
        </a>,
      );
    } else out.push(url);
    last = i + url.length;
  }
  out.push(text.slice(last));
  return (
    <>
      {out.map((p, i) =>
        typeof p === 'string'
          ? p.split('\n\n').map((para, j, arr) => (
              <span key={`${i}-${j}`}>
                {para}
                {j < arr.length - 1 && (
                  <>
                    <br />
                    <br />
                  </>
                )}
              </span>
            ))
          : p,
      )}
    </>
  );
}
