import { q } from './db';
import { communityMode } from './config';

export type MailKind = 'verify' | 'reset' | 'existing_account' | 'reply' | 'feedback_reply' | 'moderation';
export type Mail = { to: string; subject: string; text: string; kind: MailKind };

/**
 * Sends transactional email.
 * - Resend (RESEND_API_KEY + MAIL_FROM): real delivery; only status and provider id are recorded.
 * - MAIL_CAPTURE=1 in demo mode: stored in mail_outbox, never sent (tests read links from there).
 * - Otherwise: nothing is sent and the attempt is recorded as "not_configured". The interface never claims delivery.
 */
export async function sendMail(m: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (key && process.env.MAIL_FROM) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string };
    await q(`INSERT INTO mail_outbox (kind, status, provider_id) VALUES ($1, $2, $3)`, [m.kind, r.ok ? 'accepted' : 'failed', j.id ?? null]);
    return;
  }
  if (communityMode() === 'demo' && process.env.MAIL_CAPTURE === '1') {
    await q(`INSERT INTO mail_outbox (kind, status, recipient, subject, body) VALUES ($1, 'captured', $2, $3, $4)`, [m.kind, m.to, m.subject, m.text]);
    return;
  }
  await q(`INSERT INTO mail_outbox (kind, status) VALUES ($1, 'not_configured')`, [m.kind]);
}
