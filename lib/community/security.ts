import { createHash } from 'node:crypto';
import { one, q } from './db';
import { siteOrigin } from './config';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** Mutating requests must come from our own pages (CSRF defence in depth, on top of SameSite cookies). */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  const allowed = new Set([siteOrigin(), new URL(req.url).origin]);
  if (!origin || !allowed.has(origin)) throw new HttpError(403, 'bad_origin');
}

/** Reads a JSON body with a size cap. */
export async function readJson<T = Record<string, unknown>>(req: Request, maxBytes = 16_000): Promise<T> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) throw new HttpError(415, 'json_required');
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large');
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as T;
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

/** IPs are never stored in clear: salted hash, used only for rate limits. */
export function ipKey(req: Request): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? 'lek-dev-salt';
  return createHash('sha256').update(`${salt}:${clientIp(req)}`).digest('hex').slice(0, 32);
}

/** Sliding-window limit stored in Postgres (works across serverless instances). */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const row = await one<{ n: string }>(`SELECT count(*)::text AS n FROM rate_event WHERE key = $1 AND created_at > now() - make_interval(secs => $2)`, [key, windowSec]);
  if (Number(row?.n ?? 0) >= limit) throw new HttpError(429, 'rate_limited', { retryAfter: windowSec });
  await q(`INSERT INTO rate_event (key) VALUES ($1)`, [key]);
  if (Math.random() < 0.02) await q(`DELETE FROM rate_event WHERE created_at < now() - interval '48 hours'`);
}

/** Cloudflare Turnstile, verified server-side when configured. */
export async function verifyTurnstile(token: unknown, req: Request): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'captcha_required');
  const body = new URLSearchParams({ secret, response: token, remoteip: clientIp(req) });
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  if (!j.success) throw new HttpError(400, 'captcha_failed');
}

/** Wraps a route handler: maps HttpError to JSON, hides internal errors. */
export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, ...(e.detail ?? {}) }, e.status);
      console.error('[community]', e);
      return json({ error: 'server_error' }, 500);
    }
  };
}

/** Plain text only: strips control characters (keeps newlines/tabs), normalises, trims. */
export function cleanText(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}
