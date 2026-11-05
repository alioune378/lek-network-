import { json } from '@/lib/community/security';
import { mailCapture } from '@/lib/community/config';
import { q } from '@/lib/community/db';

/**
 * Demo/CI only: returns captured emails for one address so automated tests (and demo testers) can open verification links.
 * Unavailable unless MAIL_CAPTURE=1 (never in live mode) AND the caller presents TEST_MAIL_TOKEN (24+ chars). Never enabled on staging.
 */
export async function GET(req: Request) {
  const token = process.env.TEST_MAIL_TOKEN;
  if (!mailCapture() || !token || token.length < 24 || req.headers.get('x-test-token') !== token) return json({ error: 'not_found' }, 404);
  const to = new URL(req.url).searchParams.get('to') ?? '';
  const rows = await q(`SELECT kind, subject, body, created_at FROM mail_outbox WHERE recipient = $1 ORDER BY id DESC LIMIT 10`, [to.toLowerCase()]);
  return json({ items: rows });
}
