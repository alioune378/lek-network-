import { q } from './db';
import { mailCapture } from './config';

export type MailKind = 'verify' | 'reset' | 'existing_account' | 'reply' | 'feedback_reply' | 'moderation' | 'invite';
export type Mail = { to: string; subject: string; text: string; kind: MailKind };

/**
 * Sends transactional email.
 * - Resend (RESEND_API_KEY + MAIL_FROM): real delivery; only status and provider id are recorded.
 * - MAIL_CAPTURE=1 outside live mode: stored in mail_outbox, never sent (tests read links from there).
 * - Otherwise: nothing is sent and the attempt is recorded as "not_configured". The interface never claims delivery.
 */
export type Delivery = 'accepted' | 'failed' | 'captured' | 'not_configured';

export async function sendMail(m: Mail): Promise<Delivery> {
  const key = process.env.RESEND_API_KEY;
  if (key && process.env.MAIL_FROM) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string };
    // "accepted" means Resend accepted the message for delivery; it is not proof that it reached the inbox.
    const status: Delivery = r.ok && j.id ? 'accepted' : 'failed';
    await q(`INSERT INTO mail_outbox (kind, status, provider_id) VALUES ($1, $2, $3)`, [m.kind, status, j.id ?? null]);
    if (status === 'failed') console.error('[community] Resend refused a message', r.status);
    return status;
  }
  if (mailCapture()) {
    await q(`INSERT INTO mail_outbox (kind, status, recipient, subject, body) VALUES ($1, 'captured', $2, $3, $4)`, [m.kind, m.to.toLowerCase(), m.subject, m.text]);
    return 'captured';
  }
  await q(`INSERT INTO mail_outbox (kind, status) VALUES ($1, 'not_configured')`, [m.kind]);
  return 'not_configured';
}
