import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/community/auth';
import { isEnabled } from '@/lib/community/config';

const off = () => new Response(JSON.stringify({ error: 'community_disabled' }), { status: 503, headers: { 'content-type': 'application/json' } });

// Registration goes through /api/community/register (validation, guidelines, anti-enumeration, profile); the raw endpoint is closed.
const blocked = (req: Request) => /\/sign-up\//.test(new URL(req.url).pathname);

export async function GET(req: Request) {
  if (!isEnabled()) return off();
  return toNextJsHandler(getAuth()).GET(req);
}
export async function POST(req: Request) {
  if (!isEnabled()) return off();
  if (blocked(req)) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  return toNextJsHandler(getAuth()).POST(req);
}
