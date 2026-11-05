import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { one, q, tx } from './db';
import { getAuth } from './auth';
import { HttpError, cleanText, rateLimit } from './security';
import { LIMITS, PRIVACY_VERSION, communityMode, registrationMode, siteOrigin } from './config';
import { analyse, fingerprint, suggestNextStep, type Severity } from './moderation';
import { can, canAssignRole, staffBlock, type StaffRole, type Viewer } from './permissions';
import { impersonates } from './names';
import { STORIES, PROGRAMMES } from '../content';
import { sendMail } from './mail';
import { mailText } from './mailText';

export const GUIDELINES_VERSION = '2026-11';
const LOCALES = ['fr', 'en', 'wo', 'ar', 'es', 'pt', 'de', 'it', 'tr', 'zh'];

/* ------------------------------------------------------------------ viewer */

export async function getViewer(headers: Headers): Promise<Viewer | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const row = await one<{
    id: string; username: string; emailVerified: boolean; createdAt: Date; locale: string | null; twoFactorEnabled: boolean | null;
    display_name: string | null; deleted_at: Date | null; role: StaffRole | null; title: string | null;
  }>(
    `SELECT u.id, u.username, u."emailVerified", u."createdAt", u.locale, u."twoFactorEnabled", p.display_name, p.deleted_at, s.role, s.title
       FROM "user" u LEFT JOIN profile p ON p.user_id = u.id LEFT JOIN staff s ON s.user_id = u.id WHERE u.id = $1`,
    [session.user.id],
  );
  if (!row) return null;
  const r = await one<{ kind: 'comment_restricted' | 'suspended'; ends_at: Date | null; reason: string }>(
    `SELECT r.kind, r.ends_at, a.reason FROM restriction r JOIN moderation_action a ON a.id = r.action_id
      WHERE r.user_id = $1 AND r.lifted_at IS NULL AND r.starts_at <= now() AND (r.ends_at IS NULL OR r.ends_at > now())
      ORDER BY (r.kind = 'suspended') DESC, r.ends_at DESC NULLS FIRST LIMIT 1`,
    [row.id],
  );
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    emailVerified: row.emailVerified,
    createdAt: new Date(row.createdAt).toISOString(),
    locale: row.locale,
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    sessionCreatedAt: new Date(session.session.createdAt).toISOString(),
    staff: row.role ? { role: row.role, title: row.title ?? '' } : null,
    restriction: r ? { kind: r.kind, endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null, reason: r.reason } : null,
    deleted: Boolean(row.deleted_at),
  };
}

export async function requireViewer(headers: Headers): Promise<Viewer> {
  const v = await getViewer(headers);
  if (!v || v.deleted) throw new HttpError(401, 'auth_required');
  return v;
}

/* ------------------------------------------------------------------ invitations */

const tokenHash = (t: string) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

type InviteRow = {
  id: string; purpose: 'founder' | 'staff' | 'pilot'; role: StaffRole | null; title: string | null; email: string | null;
  max_uses: number; uses: number; expires_at: Date; revoked_at: Date | null; created_by: string | null;
};

async function findInvite(token: string): Promise<InviteRow | null> {
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return null;
  const i = await one<InviteRow>(`SELECT id, purpose, role, title, email, max_uses, uses, expires_at, revoked_at, created_by FROM invite WHERE token_hash = $1`, [tokenHash(token)]);
  if (!i || i.revoked_at || new Date(i.expires_at).getTime() < Date.now() || i.uses >= i.max_uses) return null;
  return i;
}

/** Public check used by the registration page: says whether a link is valid, never who it is for. */
export async function checkInvite(token: string) {
  const i = await findInvite(token);
  return i ? { valid: true, purpose: i.purpose, emailBound: Boolean(i.email), expiresAt: new Date(i.expires_at).toISOString() } : { valid: false };
}

/** Atomically reserves one use of an invitation (refunded if no account is created). */
async function reserveInvite(id: string): Promise<boolean> {
  const r = await q(`UPDATE invite SET uses = uses + 1 WHERE id = $1 AND uses < max_uses AND revoked_at IS NULL AND expires_at > now() RETURNING id`, [id]);
  return r.length === 1;
}
const refundInvite = (id: string) => q(`UPDATE invite SET uses = greatest(uses - 1, 0) WHERE id = $1`, [id]);

/** Grants the staff role an invitation carries (founder → owner). */
async function applyInviteRole(c: PoolClient | null, invite: InviteRow, userId: string) {
  const run = (sql: string, params: unknown[]) => (c ? c.query(sql, params) : q(sql, params));
  await run(`INSERT INTO invite_use (invite_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [invite.id, userId]);
  if (!invite.role) return;
  const title = invite.title || (invite.purpose === 'founder' ? 'Fondateur, LËK Network' : 'Rédaction LËK');
  await run(
    `INSERT INTO staff (user_id, role, title, verified_by) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET role = $2, title = $3, verified_by = $4, verified_at = now()`,
    [userId, invite.role, title, invite.created_by],
  );
  await run(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES ($1, $2, $3, $4)`, [
    invite.created_by, userId, invite.purpose === 'founder' ? 'bootstrap_owner' : 'grant_staff', `${invite.role} via ${invite.purpose} invitation`,
  ]);
}

/* ------------------------------------------------------------------ registration */

export async function register(input: Record<string, unknown>) {
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const username = String(input.username ?? '').trim().toLowerCase();
  const displayName = cleanText(input.displayName, LIMITS.displayNameMax);
  const locale = LOCALES.includes(String(input.locale)) ? String(input.locale) : 'fr';
  const pilot = communityMode() === 'pilot';
  const errors: Record<string, string> = {};
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email) || email.length > 254) errors.email = 'invalid';
  if (password.length < 10 || password.length > 128) errors.password = 'length';
  if (!/^[a-z0-9_]{3,20}$/.test(username)) errors.username = 'format';
  else if (impersonates(username)) errors.username = 'reserved';
  if (!displayName) errors.displayName = 'required';
  else if (impersonates(displayName)) errors.displayName = 'reserved';
  if (input.acceptGuidelines !== true) errors.acceptGuidelines = 'required';
  if (input.acceptPrivacy !== true) errors.acceptPrivacy = 'required';
  if (pilot && input.acceptPilot !== true) errors.acceptPilot = 'required';

  // Registration gate: closed (staff invitations only), invite (any valid invitation), open (public, founder-approved live only).
  const mode = registrationMode();
  const token = typeof input.invite === 'string' ? input.invite : '';
  const invite = token ? await findInvite(token) : null;
  if (token && !invite) throw new HttpError(403, 'invite_invalid');
  if (mode === 'closed' && !invite?.role) throw new HttpError(403, 'registration_closed');
  if (mode === 'invite' && !invite) throw new HttpError(403, 'invite_required');
  if (invite?.email && invite.email.toLowerCase() !== email) throw new HttpError(403, 'invite_email_mismatch');
  if (Object.keys(errors).length) throw new HttpError(422, 'invalid', { fields: errors });

  const taken = await one(`SELECT 1 FROM "user" WHERE username = $1`, [username]);
  if (taken) throw new HttpError(409, 'username_taken', { fields: { username: 'taken' } });

  if (invite && !(await reserveInvite(invite.id))) throw new HttpError(403, 'invite_invalid');
  let created: { id: string } | undefined;
  try {
    await getAuth().api.signUpEmail({
      body: { email, password, name: displayName, username, displayUsername: username, locale, callbackURL: `/${locale}/account?verified=1` },
    });
    // Only an account this request actually created gets a profile (an existing email creates nothing).
    created = await one<{ id: string }>(`SELECT id FROM "user" WHERE username = $1 AND lower(email) = $2`, [username, email]);
  } catch (e) {
    if (invite) await refundInvite(invite.id);
    const msg = String((e as { body?: { code?: string } }).body?.code ?? (e as Error).message ?? '');
    if (/USERNAME_IS_ALREADY_TAKEN|username/i.test(msg)) throw new HttpError(409, 'username_taken', { fields: { username: 'taken' } });
    if (/PASSWORD/i.test(msg)) throw new HttpError(422, 'invalid', { fields: { password: 'weak' } });
    throw e;
  }
  if (!created) {
    if (invite) await refundInvite(invite.id);
  } else {
    await tx(async (c) => {
      await c.query(
        `INSERT INTO profile (user_id, display_name, preferred_language, notify_replies, guidelines_version, privacy_version, privacy_at, pilot_consent_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), $7) ON CONFLICT (user_id) DO NOTHING`,
        [created!.id, displayName, locale, input.notifyReplies === true, GUIDELINES_VERSION, PRIVACY_VERSION, pilot ? new Date() : null],
      );
      if (invite) await applyInviteRole(c, invite, created!.id);
    });
  }
  // Same answer whether or not the address was already registered (no account enumeration).
  return { ok: true };
}

/** A signed-in, verified member accepts a staff invitation bound to their own address. */
export async function acceptInvite(viewer: Viewer, token: string) {
  const invite = await findInvite(token);
  if (!invite || !invite.role) throw new HttpError(403, 'invite_invalid');
  if (!viewer.emailVerified) throw new HttpError(403, 'email_unverified');
  const email = (await one<{ email: string }>(`SELECT lower(email) AS email FROM "user" WHERE id = $1`, [viewer.id]))?.email;
  if (!invite.email || invite.email.toLowerCase() !== email) throw new HttpError(403, 'invite_email_mismatch');
  if (!(await reserveInvite(invite.id))) throw new HttpError(403, 'invite_invalid');
  await tx((c) => applyInviteRole(c, invite, viewer.id));
  return { ok: true, role: invite.role };
}

/**
 * Founder bootstrap: the one-time path to the first owner. Requires BOOTSTRAP_TOKEN (a secret set by the founder in
 * Netlify, never in the code) and FOUNDER_EMAIL. Works only while no owner exists. Sends a single-use invitation
 * (48 h) to FOUNDER_EMAIL; the link is never returned to the caller.
 */
export async function bootstrapFounder(input: Record<string, unknown>, locale: string) {
  const secret = process.env.BOOTSTRAP_TOKEN ?? '';
  const founder = (process.env.FOUNDER_EMAIL ?? '').trim().toLowerCase();
  if (secret.length < 32 || !founder) throw new HttpError(404, 'not_found');
  const given = Buffer.from(String(input.token ?? ''));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new HttpError(403, 'bootstrap_denied');
  const owner = await one(`SELECT 1 FROM staff WHERE role = 'owner'`);
  if (owner) throw new HttpError(409, 'already_bootstrapped');
  // Any earlier unused founder invitation is revoked: only the newest link works.
  await q(`UPDATE invite SET revoked_at = now() WHERE purpose = 'founder' AND revoked_at IS NULL AND uses = 0`);
  const token = newToken();
  const expires = new Date(Date.now() + 48 * 3600_000);
  const inv = await one<{ id: string }>(
    `INSERT INTO invite (token_hash, purpose, role, title, email, max_uses, expires_at) VALUES ($1, 'founder', 'owner', $2, $3, 1, $4) RETURNING id`,
    [tokenHash(token), 'Fondateur, LËK Network', founder, expires],
  );
  const l = LOCALES.includes(locale) ? locale : 'fr';
  const existing = await one(`SELECT 1 FROM "user" WHERE lower(email) = $1 AND "emailVerified" = true`, [founder]);
  const url = `${siteOrigin()}/${l}/account/${existing ? 'invite' : 'register'}?invite=${token}`;
  const m = mailText('invite', l, url, { purpose: 'founder', expires: expires.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' });
  const delivery = await sendMail({ to: founder, kind: 'invite', ...m });
  if (delivery === 'failed' || delivery === 'not_configured') {
    await q(`UPDATE invite SET revoked_at = now() WHERE id = $1`, [inv!.id]);
    throw new HttpError(503, 'mail_unavailable', { delivery });
  }
  await q(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES (NULL, NULL, 'create_invite', 'Founder bootstrap invitation issued')`);
  const [name, domain] = founder.split('@');
  return { ok: true, delivery, sentTo: `${name.slice(0, 2)}•••@${domain}` };
}

/** Pilot / staff invitations, created by admins or the owner. Links are returned once and never stored in clear. */
export async function createInvites(viewer: Viewer, input: Record<string, unknown>, locale: string) {
  if (!can.invite(viewer)) throw new HttpError(403, staffBlock(viewer) ?? 'forbidden');
  const purpose = input.role ? 'staff' : 'pilot';
  const role = input.role ? String(input.role) : null;
  if (role && !canAssignRole(viewer, role as StaffRole, null)) throw new HttpError(403, 'forbidden');
  const count = Math.min(20, Math.max(1, Number(input.count ?? 1) || 1));
  const days = Math.min(30, Math.max(1, Number(input.days ?? 14) || 14));
  const email = input.email ? String(input.email).trim().toLowerCase() : null;
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) throw new HttpError(422, 'invalid', { fields: { email: 'invalid' } });
  if ((role || email) && count !== 1) throw new HttpError(422, 'invalid', { fields: { count: 'one_for_named' } });
  if (role && !email) throw new HttpError(422, 'invalid', { fields: { email: 'required_for_staff' } });
  const title = cleanText(input.title, 80) || null;
  const note = cleanText(input.note, 200) || null;
  await rateLimit(`invite:${viewer.id}`, 60, 3600);
  const l = LOCALES.includes(locale) ? locale : 'fr';
  const expires = new Date(Date.now() + days * 86400_000);
  const links: string[] = [];
  for (let i = 0; i < count; i++) {
    const token = newToken();
    await q(`INSERT INTO invite (token_hash, purpose, role, title, email, note, max_uses, created_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)`, [
      tokenHash(token), purpose, role, title, email, note, viewer.id, expires,
    ]);
    links.push(`${siteOrigin()}/${l}/account/register?invite=${token}`);
  }
  await q(`INSERT INTO moderation_action (actor_id, action, reason) VALUES ($1, 'create_invite', $2)`, [viewer.id, `${count} ${purpose} invitation(s)${role ? ` (${role})` : ''}${note ? `: ${note}` : ''}`]);
  let delivery: string | null = null;
  if (email) {
    const m = mailText('invite', l, links[0], { purpose: role ? 'staff' : 'pilot', expires: expires.toISOString().slice(0, 10) });
    delivery = await sendMail({ to: email, kind: 'invite', ...m });
  }
  return { ok: true, links, delivery, expiresAt: expires.toISOString() };
}

export async function listInvites(viewer: Viewer) {
  if (!can.invite(viewer)) throw new HttpError(403, staffBlock(viewer) ?? 'forbidden');
  const rows = await q<{ id: string; purpose: string; role: string | null; email: string | null; note: string | null; uses: number; max_uses: number; created_at: Date; expires_at: Date; revoked_at: Date | null; creator: string | null; users: string[] | null }>(
    `SELECT i.id, i.purpose, i.role, i.email, i.note, i.uses, i.max_uses, i.created_at, i.expires_at, i.revoked_at, c.username AS creator,
            (SELECT array_agg(u.username) FROM invite_use iu JOIN "user" u ON u.id = iu.user_id WHERE iu.invite_id = i.id) AS users
       FROM invite i LEFT JOIN "user" c ON c.id = i.created_by ORDER BY i.created_at DESC LIMIT 200`,
  );
  return rows.map((r) => ({
    id: r.id, purpose: r.purpose, role: r.role, email: r.email, note: r.note, uses: r.uses, maxUses: r.max_uses, creator: r.creator, users: r.users ?? [],
    createdAt: new Date(r.created_at).toISOString(), expiresAt: new Date(r.expires_at).toISOString(),
    status: r.revoked_at ? 'revoked' : r.uses >= r.max_uses ? 'used' : new Date(r.expires_at).getTime() < Date.now() ? 'expired' : 'active',
  }));
}

export async function revokeInvite(viewer: Viewer, id: string) {
  if (!can.invite(viewer)) throw new HttpError(403, staffBlock(viewer) ?? 'forbidden');
  const r = await q(`UPDATE invite SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id`, [id]).catch(() => []);
  if (!r.length) throw new HttpError(404, 'not_found');
  await q(`INSERT INTO moderation_action (actor_id, action, reason) VALUES ($1, 'revoke_invite', 'Invitation revoked')`, [viewer.id]);
  return { ok: true };
}

/* ------------------------------------------------------------------ pilot usability feedback */

const RATINGS = ['registration', 'rules', 'reporting', 'appeals', 'safety', 'design', 'recommend'];
const QUIZ: Record<string, string> = { emailVisible: 'no', reportEffect: 'human_review', appeal: 'other_moderator', disagreement: 'allowed' };
const TASKS = ['register', 'profile', 'comment', 'reply', 'helpful', 'report', 'feedback', 'notifications', 'language', 'delete_test'];

export async function savePilotFeedback(viewer: Viewer, input: Record<string, unknown>) {
  if (communityMode() !== 'pilot' && communityMode() !== 'demo') throw new HttpError(404, 'not_found');
  const ratingsIn = (input.ratings ?? {}) as Record<string, unknown>;
  const ratings: Record<string, number> = {};
  for (const k of RATINGS) {
    const n = Number(ratingsIn[k]);
    if (Number.isInteger(n) && n >= 1 && n <= 5) ratings[k] = n;
  }
  const quizIn = (input.quiz ?? {}) as Record<string, unknown>;
  const quiz: Record<string, string> = {};
  for (const k of Object.keys(QUIZ)) if (typeof quizIn[k] === 'string') quiz[k] = String(quizIn[k]).slice(0, 40);
  if (Object.keys(ratings).length < 3) throw new HttpError(422, 'invalid', { fields: { ratings: 'required' } });
  const tasks = Array.isArray(input.tasks) ? input.tasks.map(String).filter((t) => TASKS.includes(t)) : [];
  await rateLimit(`pilot:${viewer.id}`, 20, 3600);
  await q(
    `INSERT INTO pilot_feedback (user_id, ratings, quiz, tasks, confusing, suggestion) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET ratings = $2, quiz = $3, tasks = $4, confusing = $5, suggestion = $6, updated_at = now()`,
    [viewer.id, JSON.stringify(ratings), JSON.stringify(quiz), tasks, cleanText(input.confusing, 2000) || null, cleanText(input.suggestion, 2000) || null],
  );
  return { ok: true };
}

export async function pilotSummary(viewer: Viewer) {
  if (!can.pilotResults(viewer)) throw new HttpError(403, staffBlock(viewer) ?? 'forbidden');
  const rows = await q<{ ratings: Record<string, number>; quiz: Record<string, string>; tasks: string[]; confusing: string | null; suggestion: string | null; updated_at: Date }>(
    `SELECT ratings, quiz, tasks, confusing, suggestion, updated_at FROM pilot_feedback ORDER BY updated_at DESC`,
  );
  const avg = (k: string) => {
    const v = rows.map((r) => r.ratings[k]).filter((x) => typeof x === 'number');
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const correct = (k: string) => {
    const v = rows.filter((r) => r.quiz[k] !== undefined);
    return v.length ? Math.round((v.filter((r) => r.quiz[k] === QUIZ[k]).length / v.length) * 100) : null;
  };
  // Free-text answers are shown without names: the questionnaire is about the product, not the person.
  return {
    responses: rows.length,
    ratings: Object.fromEntries(RATINGS.map((k) => [k, avg(k)])),
    understanding: Object.fromEntries(Object.keys(QUIZ).map((k) => [k, correct(k)])),
    tasks: Object.fromEntries(TASKS.map((k) => [k, rows.filter((r) => r.tasks.includes(k)).length])),
    comments: rows.flatMap((r) => [r.confusing && { kind: 'confusing', text: r.confusing }, r.suggestion && { kind: 'suggestion', text: r.suggestion }].filter(Boolean)),
  };
}

export async function myPilotFeedback(viewer: Viewer) {
  return (await one(`SELECT ratings, quiz, tasks, confusing, suggestion FROM pilot_feedback WHERE user_id = $1`, [viewer.id])) ?? null;
}

export async function usernameAvailable(u: string) {
  const name = u.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) return { available: false, reason: 'format' };
  if (impersonates(name)) return { available: false, reason: 'reserved' };
  const r = await one(`SELECT 1 FROM "user" WHERE username = $1`, [name]);
  return { available: !r, reason: r ? 'taken' : null };
}

/* ------------------------------------------------------------------ articles */

const KNOWN = new Map<string, 'article' | 'programme'>([...STORIES.map((s) => [s.slug, 'article'] as const), ...PROGRAMMES.map((p) => [p.slug, 'programme'] as const)]);

async function ensureArticle(slug: string, c?: PoolClient) {
  const kind = KNOWN.get(slug);
  if (!kind) throw new HttpError(404, 'unknown_article');
  const sql = `INSERT INTO article (slug, kind) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`;
  if (c) await c.query(sql, [slug, kind]);
  else await q(sql, [slug, kind]);
  const a = await one<{ comments_open: boolean }>(`SELECT comments_open FROM article WHERE slug = $1`, [slug]);
  return a?.comments_open ?? true;
}

/* ------------------------------------------------------------------ comments */

type Row = {
  id: string; parent_id: string | null; body: string; lang: string; status: string; is_staff_note: boolean; helpful_count: number;
  removed_reason: string | null; created_at: Date; edited_at: Date | null; user_id: string; username: string; display_name: string | null;
  deleted_at: Date | null; role: StaffRole | null; title: string | null; mine_helpful: boolean;
};

function publicComment(r: Row, viewer: Viewer | null) {
  const mine = viewer?.id === r.user_id;
  const gone = Boolean(r.deleted_at);
  const hidden = r.status === 'removed' || r.status === 'deleted';
  return {
    id: r.id,
    parentId: r.parent_id,
    status: r.status,
    body: hidden ? null : r.body,
    lang: r.lang,
    removedReason: r.status === 'removed' ? r.removed_reason : null,
    staffNote: r.is_staff_note,
    helpful: r.helpful_count,
    helpedByMe: Boolean(r.mine_helpful),
    createdAt: new Date(r.created_at).toISOString(),
    editedAt: r.edited_at ? new Date(r.edited_at).toISOString() : null,
    mine,
    author: gone
      ? { username: null, displayName: null, deleted: true, staff: null }
      : { username: r.username, displayName: r.display_name ?? r.username, deleted: false, staff: r.role ? { role: r.role, title: r.title } : null },
  };
}

const SELECT_COMMENT = `
  SELECT c.id, c.parent_id, c.body, c.lang, c.status, c.is_staff_note, c.helpful_count, c.removed_reason, c.created_at, c.edited_at, c.user_id,
         u.username, p.display_name, p.deleted_at, s.role, s.title,
         EXISTS (SELECT 1 FROM reaction x WHERE x.comment_id = c.id AND x.user_id = $2) AS mine_helpful
    FROM comment c JOIN "user" u ON u.id = c.user_id LEFT JOIN profile p ON p.user_id = c.user_id LEFT JOIN staff s ON s.user_id = c.user_id`;

export async function listComments(slug: string, sort: string, page: number, viewer: Viewer | null) {
  if (!KNOWN.has(slug)) throw new HttpError(404, 'unknown_article');
  const vid = viewer?.id ?? '';
  const order = sort === 'helpful' ? 'c.is_staff_note DESC, c.helpful_count DESC, c.created_at DESC' : 'c.is_staff_note DESC, c.created_at DESC';
  const visible = `(c.status IN ('published','removed','deleted') OR (c.status = 'pending' AND c.user_id = $2))`;
  const top = await q<Row>(`${SELECT_COMMENT} WHERE c.article_slug = $1 AND c.parent_id IS NULL AND ${visible} ORDER BY ${order} LIMIT $3 OFFSET $4`, [
    slug, vid, LIMITS.pageSize + 1, Math.max(0, page) * LIMITS.pageSize,
  ]);
  const more = top.length > LIMITS.pageSize;
  const items = top.slice(0, LIMITS.pageSize);
  const ids = items.map((c) => c.id);
  const replies = ids.length ? await q<Row>(`${SELECT_COMMENT} WHERE c.parent_id = ANY($1::uuid[]) AND ${visible} ORDER BY c.created_at ASC`, [ids, vid]) : [];
  const count = await one<{ n: string }>(`SELECT count(*)::text AS n FROM comment WHERE article_slug = $1 AND status = 'published'`, [slug]);
  const open = (await one<{ comments_open: boolean }>(`SELECT comments_open FROM article WHERE slug = $1`, [slug]))?.comments_open ?? true;
  return {
    count: Number(count?.n ?? 0),
    open,
    more,
    comments: items.map((c) => ({ ...publicComment(c, viewer), replies: replies.filter((r) => r.parent_id === c.id).map((r) => publicComment(r, viewer)) })),
  };
}

async function signalsFor(viewer: Viewer, body: string, hash: string) {
  const [own, others, viol] = await Promise.all([
    one<{ n: string }>(`SELECT count(*)::text n FROM comment WHERE user_id = $1 AND body_hash = $2 AND created_at > now() - interval '24 hours'`, [viewer.id, hash]),
    one<{ n: string }>(`SELECT count(DISTINCT user_id)::text n FROM comment WHERE user_id <> $1 AND body_hash = $2 AND created_at > now() - interval '1 hour'`, [viewer.id, hash]),
    one<{ n: string }>(
      `SELECT count(*)::text n FROM moderation_action WHERE target_user_id = $1 AND created_at > now() - interval '90 days' AND action IN ('warning','remove_comment','restrict','suspend','escalate')`,
      [viewer.id],
    ),
  ]);
  return analyse({
    body,
    accountAgeMin: (Date.now() - new Date(viewer.createdAt).getTime()) / 60000,
    ownDuplicates: Number(own?.n ?? 0),
    othersDuplicates: Number(others?.n ?? 0),
    recentViolations: Number(viol?.n ?? 0),
  });
}

const hashOf = (body: string) => createHash('sha256').update(fingerprint(body)).digest('hex');

function restrictionError(v: Viewer) {
  if (!v.emailVerified) return new HttpError(403, 'email_unverified');
  if (v.restriction) return new HttpError(403, v.restriction.kind, { endsAt: v.restriction.endsAt, reason: v.restriction.reason });
  return new HttpError(403, 'forbidden');
}

export async function createComment(viewer: Viewer, input: Record<string, unknown>) {
  if (!can.comment(viewer)) throw restrictionError(viewer);
  const slug = String(input.article ?? '');
  const body = cleanText(input.body, LIMITS.commentMax);
  const key = String(input.idempotencyKey ?? '');
  const lang = LOCALES.includes(String(input.lang)) ? String(input.lang) : 'fr';
  const staffNote = input.staffNote === true;
  if (!body) throw new HttpError(422, 'empty');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) throw new HttpError(422, 'idempotency_key');
  if (staffNote && !can.staffNote(viewer)) throw staffError(viewer);

  const existing = await one<{ id: string; status: string }>(`SELECT id, status FROM comment WHERE user_id = $1 AND idempotency_key = $2`, [viewer.id, key]);
  if (existing) return { id: existing.id, status: existing.status, duplicate: true };

  const open = await ensureArticle(slug);
  if (!open) throw new HttpError(403, 'comments_closed');
  await rateLimit(`comment:10m:${viewer.id}`, activeStaff(viewer) ? 30 : 6, 600);
  await rateLimit(`comment:day:${viewer.id}`, activeStaff(viewer) ? 300 : 40, 86400);

  let parentId: string | null = null;
  let parentAuthor: string | null = null;
  if (input.parentId) {
    const p = await one<{ id: string; parent_id: string | null; article_slug: string; status: string; user_id: string }>(
      `SELECT id, parent_id, article_slug, status, user_id FROM comment WHERE id = $1`,
      [String(input.parentId)],
    ).catch(() => undefined);
    if (!p || p.article_slug !== slug) throw new HttpError(422, 'invalid_parent');
    // One level of nesting: a reply to a reply joins the top comment's thread.
    const topId = p.parent_id ?? p.id;
    const top = p.parent_id ? await one<{ status: string }>(`SELECT status FROM comment WHERE id = $1`, [topId]) : p;
    if (top?.status !== 'published') throw new HttpError(422, 'parent_unavailable');
    parentId = topId;
    parentAuthor = p.user_id;
  }

  const hash = hashOf(body);
  const verdict = activeStaff(viewer) ? { outcome: 'publish' as const, signals: [], severity: null } : await signalsFor(viewer, body, hash);
  // Staff are not exempt from the rules: their comments are still reportable. They skip automatic holds only.
  if (verdict.outcome === 'reject') throw new HttpError(422, 'rejected', { signals: verdict.signals.map((s) => s.code) });
  const status = verdict.outcome === 'hold' ? 'pending' : 'published';

  const id = await tx(async (c) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO comment (article_slug, user_id, parent_id, body, body_hash, lang, status, is_staff_note, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [slug, viewer.id, parentId, body, hash, lang, status, staffNote && !parentId, key],
    );
    const cid = r.rows[0].id;
    if (status === 'pending') {
      await c.query(
        `INSERT INTO moderation_case (comment_id, subject_user, source, reasons, context, severity) VALUES ($1, $2, 'automatic', $3, $4, $5)`,
        [cid, viewer.id, verdict.signals.map((s) => s.code), JSON.stringify({ signals: verdict.signals }), verdict.severity ?? 'low'],
      );
    }
    if (status === 'published' && parentAuthor && parentAuthor !== viewer.id) {
      const pref = await c.query<{ notify_replies: boolean }>(`SELECT notify_replies FROM profile WHERE user_id = $1 AND deleted_at IS NULL`, [parentAuthor]);
      if (pref.rows[0]?.notify_replies) {
        await c.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'reply', $2)`, [
          parentAuthor,
          JSON.stringify({ article: slug, commentId: cid, by: viewer.username }),
        ]);
      }
    }
    return cid;
  });
  return { id, status, signals: status === 'pending' ? verdict.signals.map((s) => s.code) : [] };
}

export async function editComment(viewer: Viewer, id: string, input: Record<string, unknown>) {
  if (!can.comment(viewer)) throw restrictionError(viewer);
  const body = cleanText(input.body, LIMITS.commentMax);
  if (!body) throw new HttpError(422, 'empty');
  const c = await one<{ user_id: string; status: string; body: string; created_at: Date }>(`SELECT user_id, status, body, created_at FROM comment WHERE id = $1`, [id]).catch(() => undefined);
  if (!c || c.user_id !== viewer.id) throw new HttpError(404, 'not_found');
  if (!['published', 'pending'].includes(c.status)) throw new HttpError(409, 'not_editable');
  if (Date.now() - new Date(c.created_at).getTime() > LIMITS.editWindowHours * 3600_000) throw new HttpError(409, 'edit_window_closed');
  if (body === c.body) return { id, status: c.status };
  await rateLimit(`edit:${viewer.id}`, 20, 3600);
  const hash = hashOf(body);
  const verdict = activeStaff(viewer) ? { outcome: 'publish' as const, signals: [], severity: null } : await signalsFor(viewer, body, hash);
  if (verdict.outcome === 'reject') throw new HttpError(422, 'rejected', { signals: verdict.signals.map((s) => s.code) });
  const status = verdict.outcome === 'hold' ? 'pending' : c.status;
  await tx(async (t) => {
    await t.query(`INSERT INTO comment_revision (comment_id, body) VALUES ($1, $2)`, [id, c.body]);
    await t.query(`UPDATE comment SET body = $2, body_hash = $3, status = $4, edited_at = now() WHERE id = $1`, [id, body, hash, status]);
    if (verdict.outcome === 'hold') {
      await t.query(
        `INSERT INTO moderation_case (comment_id, subject_user, source, reasons, context, severity) VALUES ($1, $2, 'automatic', $3, $4, $5)
         ON CONFLICT (comment_id) WHERE status = 'open' AND comment_id IS NOT NULL DO NOTHING`,
        [id, viewer.id, verdict.signals.map((s) => s.code), JSON.stringify({ signals: verdict.signals, edited: true }), verdict.severity ?? 'low'],
      );
    }
  });
  return { id, status };
}

export async function deleteOwnComment(viewer: Viewer, id: string) {
  const c = await one<{ user_id: string; status: string }>(`SELECT user_id, status FROM comment WHERE id = $1`, [id]).catch(() => undefined);
  if (!c || c.user_id !== viewer.id) throw new HttpError(404, 'not_found');
  if (c.status === 'deleted') return { id, status: 'deleted' };
  // The text is hidden at once and kept internally for the retention period (moderation, legal requests).
  await q(`UPDATE comment SET status = 'deleted', deleted_at = now() WHERE id = $1`, [id]);
  return { id, status: 'deleted' };
}

export async function toggleHelpful(viewer: Viewer, id: string) {
  if (!can.react(viewer)) throw restrictionError(viewer);
  const c = await one<{ user_id: string; status: string }>(`SELECT user_id, status FROM comment WHERE id = $1`, [id]).catch(() => undefined);
  if (!c || c.status !== 'published') throw new HttpError(404, 'not_found');
  if (c.user_id === viewer.id) throw new HttpError(403, 'own_comment');
  // Anti-manipulation: brand-new accounts cannot vote, one vote per member, rate-limited.
  if (Date.now() - new Date(viewer.createdAt).getTime() < 60 * 60_000) throw new HttpError(403, 'account_too_new');
  await rateLimit(`helpful:${viewer.id}`, 60, 3600);
  return tx(async (t) => {
    const del = await t.query(`DELETE FROM reaction WHERE comment_id = $1 AND user_id = $2 AND kind = 'helpful'`, [id, viewer.id]);
    if (!del.rowCount) await t.query(`INSERT INTO reaction (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, viewer.id]);
    const n = await t.query<{ n: number }>(
      `UPDATE comment SET helpful_count = (SELECT count(*) FROM reaction WHERE comment_id = $1)::int WHERE id = $1 RETURNING helpful_count AS n`,
      [id],
    );
    return { helpful: n.rows[0].n, helpedByMe: !del.rowCount };
  });
}

const REPORT_SEVERITY: Record<string, Severity> = { threat: 'critical', private_info: 'high', harassment: 'high', hate: 'high', impersonation: 'medium', spam: 'low', off_topic: 'low', other: 'low' };

export async function reportComment(viewer: Viewer, id: string, input: Record<string, unknown>) {
  if (!can.report(viewer)) throw restrictionError(viewer);
  const reason = String(input.reason ?? '');
  if (!(reason in REPORT_SEVERITY)) throw new HttpError(422, 'invalid_reason');
  const details = cleanText(input.details, 500) || null;
  const c = await one<{ user_id: string; status: string }>(`SELECT user_id, status FROM comment WHERE id = $1`, [id]).catch(() => undefined);
  if (!c || !['published', 'pending'].includes(c.status)) throw new HttpError(404, 'not_found');
  if (c.user_id === viewer.id) throw new HttpError(403, 'own_comment');
  await rateLimit(`report:${viewer.id}`, 20, 86400);
  // Reports never hide a comment by themselves (mass reporting must not silence anyone): they go to humans.
  return tx(async (t) => {
    const sev = REPORT_SEVERITY[reason];
    const k = await t.query<{ id: string }>(
      `INSERT INTO moderation_case (comment_id, subject_user, source, reasons, severity) VALUES ($1, $2, 'reader', $3, $4)
       ON CONFLICT (comment_id) WHERE status = 'open' AND comment_id IS NOT NULL
       DO UPDATE SET reasons = ARRAY(SELECT DISTINCT unnest(moderation_case.reasons || EXCLUDED.reasons)),
                     severity = CASE WHEN array_position(ARRAY['low','medium','high','critical'], EXCLUDED.severity) > array_position(ARRAY['low','medium','high','critical'], moderation_case.severity)
                                     THEN EXCLUDED.severity ELSE moderation_case.severity END
       RETURNING id`,
      [id, c.user_id, [reason], sev],
    );
    const r = await t.query(`INSERT INTO report (comment_id, reporter_id, case_id, reason, details) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (comment_id, reporter_id) DO NOTHING`, [
      id, viewer.id, k.rows[0].id, reason, details,
    ]);
    return { ok: true, alreadyReported: !r.rowCount };
  });
}

/* ------------------------------------------------------------------ profiles */

export async function publicProfile(username: string) {
  const u = await one<{
    id: string; username: string; createdAt: Date; display_name: string; bio: string | null; region: string | null; interests: string[];
    show_history: boolean; deleted_at: Date | null; role: StaffRole | null; title: string | null;
  }>(
    `SELECT u.id, u.username, u."createdAt", p.display_name, p.bio, p.region, p.interests, p.show_history, p.deleted_at, s.role, s.title
       FROM "user" u JOIN profile p ON p.user_id = u.id LEFT JOIN staff s ON s.user_id = u.id
      WHERE u.username = $1 AND u."emailVerified" = true`,
    [username.toLowerCase()],
  );
  if (!u || u.deleted_at) throw new HttpError(404, 'not_found');
  const stats = await one<{ comments: string; replies: string; helpful: string }>(
    `SELECT (SELECT count(*) FROM comment WHERE user_id = $1 AND status = 'published')::text AS comments,
            (SELECT count(*) FROM comment r JOIN comment c ON c.id = r.parent_id WHERE c.user_id = $1 AND r.user_id <> $1 AND r.status = 'published')::text AS replies,
            (SELECT coalesce(sum(helpful_count), 0) FROM comment WHERE user_id = $1 AND status = 'published')::text AS helpful`,
    [u.id],
  );
  const history = u.show_history
    ? await q<{ id: string; article_slug: string; body: string; created_at: Date; edited_at: Date | null; lang: string }>(
        `SELECT id, article_slug, left(body, 280) AS body, created_at, edited_at, lang FROM comment WHERE user_id = $1 AND status = 'published' ORDER BY created_at DESC LIMIT 20`,
        [u.id],
      )
    : [];
  const joined = new Date(u.createdAt);
  return {
    username: u.username,
    displayName: u.display_name,
    bio: u.bio,
    region: u.region,
    interests: u.interests,
    joined: `${joined.getUTCFullYear()}-${String(joined.getUTCMonth() + 1).padStart(2, '0')}`,
    staff: u.role ? { role: u.role, title: u.title } : null,
    stats: { comments: Number(stats?.comments ?? 0), repliesReceived: Number(stats?.replies ?? 0), helpful: Number(stats?.helpful ?? 0) },
    historyVisible: u.show_history,
    history: history.map((h) => ({ id: h.id, article: h.article_slug, excerpt: h.body, lang: h.lang, createdAt: new Date(h.created_at).toISOString(), edited: Boolean(h.edited_at) })),
  };
}

export async function myAccount(viewer: Viewer) {
  const p = await one<{
    display_name: string; bio: string | null; region: string | null; preferred_language: string | null; interests: string[]; show_history: boolean; notify_replies: boolean;
    email: string;
  }>(
    `SELECT p.display_name, p.bio, p.region, p.preferred_language, p.interests, p.show_history, p.notify_replies, u.email
       FROM profile p JOIN "user" u ON u.id = p.user_id WHERE p.user_id = $1`,
    [viewer.id],
  );
  const actions = await q<{ id: string; action: string; reason: string; until: Date | null; created_at: Date; appeal_status: string | null }>(
    `SELECT a.id, a.action, a.reason, a.until, a.created_at, ap.status AS appeal_status FROM moderation_action a LEFT JOIN appeal ap ON ap.action_id = a.id
      WHERE a.target_user_id = $1 AND a.action IN ('educational_notice','warning','remove_comment','restrict','suspend','escalate') ORDER BY a.created_at DESC LIMIT 50`,
    [viewer.id],
  );
  const unread = await one<{ n: string }>(`SELECT count(*)::text n FROM notification WHERE user_id = $1 AND read_at IS NULL`, [viewer.id]);
  return {
    viewer,
    // The account holder sees their own email; it is never part of any public response.
    email: p?.email ?? null,
    profile: p
      ? { displayName: p.display_name, bio: p.bio, region: p.region, preferredLanguage: p.preferred_language, interests: p.interests, showHistory: p.show_history, notifyReplies: p.notify_replies }
      : null,
    moderation: actions.map((a) => ({ id: a.id, action: a.action, reason: a.reason, until: a.until ? new Date(a.until).toISOString() : null, createdAt: new Date(a.created_at).toISOString(), appeal: a.appeal_status })),
    unreadNotifications: Number(unread?.n ?? 0),
    staffStatus: viewer.staff ? staffBlock(viewer) : null,
    pilot: communityMode() === 'pilot',
  };
}

export async function updateProfile(viewer: Viewer, input: Record<string, unknown>) {
  const displayName = cleanText(input.displayName, LIMITS.displayNameMax);
  if (!displayName) throw new HttpError(422, 'invalid', { fields: { displayName: 'required' } });
  if (!viewer.staff && impersonates(displayName)) throw new HttpError(422, 'invalid', { fields: { displayName: 'reserved' } });
  const bio = cleanText(input.bio, LIMITS.bioMax) || null;
  const region = cleanText(input.region, 60) || null;
  const lang = LOCALES.includes(String(input.preferredLanguage)) ? String(input.preferredLanguage) : null;
  const interests = Array.isArray(input.interests) ? input.interests.map((x) => cleanText(x, 24)).filter(Boolean).slice(0, 8) : [];
  await rateLimit(`profile:${viewer.id}`, 30, 3600);
  await q(
    `INSERT INTO profile (user_id, display_name, bio, region, preferred_language, interests, show_history, notify_replies, guidelines_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET display_name = $2, bio = $3, region = $4, preferred_language = $5, interests = $6, show_history = $7, notify_replies = $8`,
    [viewer.id, displayName, bio, region, lang, interests, input.showHistory !== false, input.notifyReplies === true, GUIDELINES_VERSION],
  );
  await q(`UPDATE "user" SET name = $2 WHERE id = $1`, [viewer.id, displayName]);
  return { ok: true };
}

/** Account deletion: credentials and sessions removed, personal data replaced, comments hidden; the internal link is kept for the retention period. */
export async function deleteAccount(viewer: Viewer, headers: Headers, input: Record<string, unknown>) {
  if (String(input.confirmUsername ?? '').toLowerCase() !== viewer.username) throw new HttpError(422, 'confirm_mismatch');
  const session = await getAuth().api.getSession({ headers });
  if (!session || Date.now() - new Date(session.session.createdAt).getTime() > 15 * 60_000) throw new HttpError(403, 'reauth_required');
  await tx(async (t) => {
    await t.query(`UPDATE profile SET deleted_at = now(), display_name = '—', bio = NULL, region = NULL, interests = '{}', show_history = false, notify_replies = false WHERE user_id = $1`, [viewer.id]);
    await t.query(`UPDATE "user" SET email = $2, name = 'deleted', image = NULL, "emailVerified" = false WHERE id = $1`, [viewer.id, `deleted+${viewer.id}@invalid.lek`]);
    await t.query(`UPDATE comment SET status = 'deleted', deleted_at = coalesce(deleted_at, now()) WHERE user_id = $1 AND status IN ('published','pending')`, [viewer.id]);
    await t.query(`DELETE FROM reaction WHERE user_id = $1`, [viewer.id]);
    await t.query(`UPDATE comment c SET helpful_count = (SELECT count(*) FROM reaction r WHERE r.comment_id = c.id)::int WHERE c.helpful_count > 0`);
    await t.query(`DELETE FROM notification WHERE user_id = $1`, [viewer.id]);
    await t.query(`DELETE FROM staff WHERE user_id = $1`, [viewer.id]);
    await t.query(`DELETE FROM session WHERE "userId" = $1`, [viewer.id]);
    await t.query(`DELETE FROM account WHERE "userId" = $1`, [viewer.id]);
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ notifications */

export async function notifications(viewer: Viewer) {
  const rows = await q<{ id: string; kind: string; payload: Record<string, unknown>; read_at: Date | null; created_at: Date }>(
    `SELECT id, kind, payload, read_at, created_at FROM notification WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [viewer.id],
  );
  return rows.map((r) => ({ id: r.id, kind: r.kind, payload: r.payload, read: Boolean(r.read_at), createdAt: new Date(r.created_at).toISOString() }));
}
export async function markNotificationsRead(viewer: Viewer) {
  await q(`UPDATE notification SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [viewer.id]);
  return { ok: true };
}

/* ------------------------------------------------------------------ moderation */

const activeStaff = (v: Viewer) => Boolean(v.staff) && staffBlock(v) === null;

/** Staff errors say why (e.g. two-step verification missing) so the console can guide the person. */
const staffError = (v: Viewer) => new HttpError(403, v.staff ? (staffBlock(v) ?? 'forbidden') : 'forbidden');

function requireModerator(v: Viewer) {
  if (!can.moderate(v)) throw staffError(v);
}

export async function moderationQueue(viewer: Viewer, status: string) {
  requireModerator(viewer);
  const st = status === 'resolved' ? 'resolved' : 'open';
  const cases = await q<{
    id: string; comment_id: string | null; source: string; reasons: string[]; context: Record<string, unknown>; severity: Severity; status: string; action: string | null;
    decision_note: string | null; decided_at: Date | null; appeal_status: string; created_at: Date; reviewer: string | null; body: string | null; comment_status: string | null;
    article_slug: string | null; author_id: string | null; author: string | null; author_name: string | null; author_since: Date | null;
  }>(
    `SELECT k.id, k.comment_id, k.source, k.reasons, k.context, k.severity, k.status, k.action, k.decision_note, k.decided_at, k.appeal_status, k.created_at,
            rv.username AS reviewer, c.body, c.status AS comment_status, c.article_slug, au.id AS author_id, au.username AS author, ap.display_name AS author_name, au."createdAt" AS author_since
       FROM moderation_case k LEFT JOIN comment c ON c.id = k.comment_id LEFT JOIN "user" au ON au.id = k.subject_user LEFT JOIN profile ap ON ap.user_id = au.id
       LEFT JOIN "user" rv ON rv.id = k.reviewer_id
      WHERE k.status = $1
      ORDER BY array_position(ARRAY['critical','high','medium','low'], k.severity), k.created_at ${st === 'open' ? 'ASC' : 'DESC'} LIMIT 100`,
    [st],
  );
  const ids = cases.map((c) => c.id);
  const reports = ids.length
    ? await q<{ case_id: string; reason: string; details: string | null; created_at: Date; reporter: string | null }>(
        `SELECT r.case_id, r.reason, r.details, r.created_at, u.username AS reporter FROM report r LEFT JOIN "user" u ON u.id = r.reporter_id WHERE r.case_id = ANY($1::uuid[]) ORDER BY r.created_at`,
        [ids],
      )
    : [];
  const authors = [...new Set(cases.map((c) => c.author_id).filter(Boolean))] as string[];
  const hist = authors.length
    ? await q<{ target_user_id: string; action: string; created_at: Date }>(
        `SELECT target_user_id, action, created_at FROM moderation_action WHERE target_user_id = ANY($1::text[]) AND action IN ('educational_notice','warning','remove_comment','restrict','suspend','escalate') AND created_at > now() - interval '180 days' ORDER BY created_at`,
        [authors],
      )
    : [];
  return cases.map((k) => {
    const prior = hist.filter((h) => h.target_user_id === k.author_id).map((h) => h.action);
    return {
      id: k.id,
      commentId: k.comment_id,
      article: k.article_slug,
      body: k.body,
      commentStatus: k.comment_status,
      source: k.source,
      reasons: k.reasons,
      context: k.context,
      severity: k.severity,
      status: k.status,
      reviewer: k.reviewer,
      action: k.action,
      decisionNote: k.decision_note,
      decidedAt: k.decided_at ? new Date(k.decided_at).toISOString() : null,
      appealStatus: k.appeal_status,
      createdAt: new Date(k.created_at).toISOString(),
      author: k.author ? { id: k.author_id, username: k.author, displayName: k.author_name, since: k.author_since ? new Date(k.author_since).toISOString() : null } : null,
      priorActions: prior,
      suggested: suggestNextStep(prior, k.severity),
      reports: reports.filter((r) => r.case_id === k.id).map((r) => ({ reason: r.reason, details: r.details, reporter: r.reporter, createdAt: new Date(r.created_at).toISOString() })),
    };
  });
}

const DURATIONS: Record<string, number | null> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, indefinite: null };
const USER_ACTIONS = ['none', 'educational_notice', 'warning', 'restrict', 'suspend', 'escalate'] as const;

async function applyUserAction(t: PoolClient, actor: Viewer, target: string, action: string, reason: string, duration: string | undefined, caseId: string | null, commentId: string | null) {
  if (action === 'none') return null;
  let until: Date | null = null;
  if (action === 'restrict' || action === 'suspend') {
    const d = duration && duration in DURATIONS ? DURATIONS[duration] : action === 'restrict' ? 24 : 24 * 30;
    if (action === 'restrict' && d === null) throw new HttpError(422, 'restriction_needs_end');
    until = d === null ? null : new Date(Date.now() + d * 3600_000);
  }
  const a = await t.query<{ id: string }>(
    `INSERT INTO moderation_action (actor_id, target_user_id, comment_id, case_id, action, reason, until) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [actor.id, target, commentId, caseId, action, reason, until],
  );
  if (action === 'restrict' || action === 'suspend') {
    await t.query(`INSERT INTO restriction (user_id, kind, ends_at, action_id) VALUES ($1, $2, $3, $4)`, [target, action === 'restrict' ? 'comment_restricted' : 'suspended', until, a.rows[0].id]);
    if (action === 'suspend') await t.query(`DELETE FROM session WHERE "userId" = $1`, [target]);
  }
  await t.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'moderation', $2)`, [target, JSON.stringify({ action, reason, until, actionId: a.rows[0].id, appealable: action !== 'escalate' })]);
  return a.rows[0].id;
}

export async function decideCase(viewer: Viewer, caseId: string, input: Record<string, unknown>) {
  requireModerator(viewer);
  const reason = cleanText(input.reason, 1000);
  if (reason.length < 3) throw new HttpError(422, 'reason_required');
  // The outcome for the comment must be chosen explicitly (no default that could publish a held comment).
  const commentAction = String(input.commentAction ?? '');
  const userAction = String(input.userAction ?? 'none');
  if (!['keep', 'approve', 'remove'].includes(commentAction) || !(USER_ACTIONS as readonly string[]).includes(userAction)) throw new HttpError(422, 'invalid_action');
  return tx(async (t) => {
    const k = (await t.query<{ id: string; comment_id: string | null; subject_user: string | null; status: string }>(`SELECT id, comment_id, subject_user, status FROM moderation_case WHERE id = $1 FOR UPDATE`, [caseId])).rows[0];
    if (!k) throw new HttpError(404, 'not_found');
    if (k.status !== 'open') throw new HttpError(409, 'already_decided');
    if (k.subject_user === viewer.id) throw new HttpError(403, 'conflict_of_interest');
    const done: string[] = [];
    if (k.comment_id) {
      if (commentAction === 'remove') {
        await t.query(`UPDATE comment SET status = 'removed', removed_reason = $2 WHERE id = $1`, [k.comment_id, reason]);
        await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, comment_id, case_id, action, reason) VALUES ($1, $2, $3, $4, 'remove_comment', $5)`, [viewer.id, k.subject_user, k.comment_id, caseId, reason]);
        if (k.subject_user) await t.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'moderation', $2)`, [k.subject_user, JSON.stringify({ action: 'remove_comment', reason, commentId: k.comment_id, appealable: true })]);
        done.push('remove_comment');
      } else if (commentAction === 'approve') {
        await t.query(`UPDATE comment SET status = 'published' WHERE id = $1 AND status = 'pending'`, [k.comment_id]);
        await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, comment_id, case_id, action, reason) VALUES ($1, $2, $3, $4, 'approve_comment', $5)`, [viewer.id, k.subject_user, k.comment_id, caseId, reason]);
        done.push('approve_comment');
      } else {
        await t.query(`UPDATE comment SET status = 'published' WHERE id = $1 AND status = 'pending'`, [k.comment_id]);
        if (userAction === 'none') {
          await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, comment_id, case_id, action, reason) VALUES ($1, $2, $3, $4, 'dismiss', $5)`, [viewer.id, k.subject_user, k.comment_id, caseId, reason]);
          done.push('dismiss');
        }
      }
    }
    if (k.subject_user && userAction !== 'none') {
      await applyUserAction(t, viewer, k.subject_user, userAction, reason, input.duration as string | undefined, caseId, k.comment_id);
      done.push(userAction);
    }
    await t.query(`UPDATE moderation_case SET status = 'resolved', reviewer_id = $2, action = $3, decision_note = $4, decided_at = now() WHERE id = $1`, [caseId, viewer.id, done.join('+') || 'none', reason]);
    return { ok: true, actions: done };
  });
}

/** Restore a removed comment (wrongly removed content can always be put back). */
export async function restoreComment(viewer: Viewer, commentId: string, input: Record<string, unknown>) {
  requireModerator(viewer);
  const reason = cleanText(input.reason, 1000);
  if (reason.length < 3) throw new HttpError(422, 'reason_required');
  return tx(async (t) => {
    const c = (await t.query<{ user_id: string; status: string }>(`SELECT user_id, status FROM comment WHERE id = $1 FOR UPDATE`, [commentId])).rows[0];
    if (!c) throw new HttpError(404, 'not_found');
    if (c.status !== 'removed') throw new HttpError(409, 'not_removed');
    await t.query(`UPDATE comment SET status = 'published', removed_reason = NULL WHERE id = $1`, [commentId]);
    await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, comment_id, action, reason) VALUES ($1, $2, $3, 'restore_comment', $4)`, [viewer.id, c.user_id, commentId, reason]);
    await t.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'moderation', $2)`, [c.user_id, JSON.stringify({ action: 'restore_comment', reason, commentId })]);
    return { ok: true };
  });
}

export async function actOnUser(viewer: Viewer, username: string, input: Record<string, unknown>) {
  requireModerator(viewer);
  const reason = cleanText(input.reason, 1000);
  if (reason.length < 3) throw new HttpError(422, 'reason_required');
  const action = String(input.action ?? '');
  const u = await one<{ id: string }>(`SELECT id FROM "user" WHERE username = $1`, [username.toLowerCase()]);
  if (!u) throw new HttpError(404, 'not_found');
  if (u.id === viewer.id) throw new HttpError(403, 'conflict_of_interest');
  return tx(async (t) => {
    if (action === 'lift_restriction') {
      const a = await t.query<{ id: string }>(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES ($1, $2, 'lift_restriction', $3) RETURNING id`, [viewer.id, u.id, reason]);
      await t.query(`UPDATE restriction SET lifted_at = now() WHERE user_id = $1 AND lifted_at IS NULL`, [u.id]);
      await t.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'moderation', $2)`, [u.id, JSON.stringify({ action: 'lift_restriction', reason, actionId: a.rows[0].id })]);
      return { ok: true };
    }
    if (!['educational_notice', 'warning', 'restrict', 'suspend', 'escalate'].includes(action)) throw new HttpError(422, 'invalid_action');
    const id = await applyUserAction(t, viewer, u.id, action, reason, input.duration as string | undefined, null, null);
    return { ok: true, actionId: id };
  });
}

export async function createAppeal(viewer: Viewer, input: Record<string, unknown>) {
  const actionId = String(input.actionId ?? '');
  const message = cleanText(input.message, 2000);
  if (message.length < 10) throw new HttpError(422, 'message_too_short');
  const a = await one<{ target_user_id: string; action: string }>(`SELECT target_user_id, action FROM moderation_action WHERE id = $1`, [actionId]).catch(() => undefined);
  if (!a || a.target_user_id !== viewer.id) throw new HttpError(404, 'not_found');
  if (!['educational_notice', 'warning', 'remove_comment', 'restrict', 'suspend'].includes(a.action)) throw new HttpError(422, 'not_appealable');
  await rateLimit(`appeal:${viewer.id}`, 5, 86400);
  const r = await q<{ id: string }>(`INSERT INTO appeal (action_id, user_id, message) VALUES ($1, $2, $3) ON CONFLICT (action_id) DO NOTHING RETURNING id`, [actionId, viewer.id, message]);
  if (!r.length) throw new HttpError(409, 'already_appealed');
  await q(`UPDATE moderation_case SET appeal_status = 'pending' WHERE id = (SELECT case_id FROM moderation_action WHERE id = $1)`, [actionId]);
  return { ok: true, id: r[0].id };
}

export async function appealsQueue(viewer: Viewer) {
  requireModerator(viewer);
  const rows = await q<{
    id: string; message: string; status: string; created_at: Date; decision_note: string | null; action: string; reason: string; actor: string | null; actor_id: string | null;
    username: string; comment_body: string | null; comment_id: string | null;
  }>(
    `SELECT ap.id, ap.message, ap.status, ap.created_at, ap.decision_note, a.action, a.reason, ac.username AS actor, a.actor_id, u.username, c.body AS comment_body, a.comment_id
       FROM appeal ap JOIN moderation_action a ON a.id = ap.action_id JOIN "user" u ON u.id = ap.user_id LEFT JOIN "user" ac ON ac.id = a.actor_id LEFT JOIN comment c ON c.id = a.comment_id
      ORDER BY (ap.status = 'pending') DESC, ap.created_at DESC LIMIT 100`,
  );
  return rows.map((r) => ({
    id: r.id, message: r.message, status: r.status, createdAt: new Date(r.created_at).toISOString(), decisionNote: r.decision_note, action: r.action, reason: r.reason,
    actor: r.actor, member: r.username, commentBody: r.comment_body, ownDecision: r.actor_id === viewer.id,
  }));
}

export async function decideAppeal(viewer: Viewer, appealId: string, input: Record<string, unknown>) {
  requireModerator(viewer);
  const decision = String(input.decision ?? '');
  const note = cleanText(input.note, 1000);
  if (!['upheld', 'overturned'].includes(decision)) throw new HttpError(422, 'invalid_decision');
  if (note.length < 3) throw new HttpError(422, 'reason_required');
  return tx(async (t) => {
    const ap = (
      await t.query<{ id: string; status: string; user_id: string; action_id: string; action: string; actor_id: string | null; comment_id: string | null; case_id: string | null }>(
        `SELECT ap.id, ap.status, ap.user_id, ap.action_id, a.action, a.actor_id, a.comment_id, a.case_id FROM appeal ap JOIN moderation_action a ON a.id = ap.action_id WHERE ap.id = $1 FOR UPDATE OF ap`,
        [appealId],
      )
    ).rows[0];
    if (!ap) throw new HttpError(404, 'not_found');
    if (ap.status !== 'pending') throw new HttpError(409, 'already_decided');
    // An appeal is reviewed by someone other than the original decision-maker (admins excepted).
    if (ap.actor_id === viewer.id && viewer.staff?.role !== 'admin') throw new HttpError(403, 'same_reviewer');
    if (ap.user_id === viewer.id) throw new HttpError(403, 'conflict_of_interest');
    await t.query(`UPDATE appeal SET status = $2, reviewer_id = $3, decision_note = $4, decided_at = now() WHERE id = $1`, [appealId, decision, viewer.id, note]);
    if (ap.case_id) await t.query(`UPDATE moderation_case SET appeal_status = $2 WHERE id = $1`, [ap.case_id, decision]);
    if (decision === 'overturned') {
      if (ap.action === 'remove_comment' && ap.comment_id) {
        await t.query(`UPDATE comment SET status = 'published', removed_reason = NULL WHERE id = $1 AND status = 'removed'`, [ap.comment_id]);
        await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, comment_id, action, reason) VALUES ($1, $2, $3, 'restore_comment', $4)`, [viewer.id, ap.user_id, ap.comment_id, `Appeal overturned: ${note}`]);
      }
      if (ap.action === 'restrict' || ap.action === 'suspend') {
        await t.query(`UPDATE restriction SET lifted_at = now() WHERE action_id = $1 AND lifted_at IS NULL`, [ap.action_id]);
        await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES ($1, $2, 'lift_restriction', $3)`, [viewer.id, ap.user_id, `Appeal overturned: ${note}`]);
      }
    }
    await t.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'appeal', $2)`, [ap.user_id, JSON.stringify({ decision, note, action: ap.action })]);
    return { ok: true };
  });
}

export async function auditLog(viewer: Viewer) {
  requireModerator(viewer);
  const rows = await q<{ id: string; action: string; reason: string; until: Date | null; created_at: Date; actor: string | null; target: string | null; comment_id: string | null }>(
    `SELECT a.id, a.action, a.reason, a.until, a.created_at, ac.username AS actor, tu.username AS target, a.comment_id
       FROM moderation_action a LEFT JOIN "user" ac ON ac.id = a.actor_id LEFT JOIN "user" tu ON tu.id = a.target_user_id ORDER BY a.created_at DESC LIMIT 100`,
  );
  return rows.map((r) => ({ ...r, until: r.until ? new Date(r.until).toISOString() : null, created_at: new Date(r.created_at).toISOString() }));
}

export async function setStaff(viewer: Viewer, input: Record<string, unknown>) {
  if (!can.manageStaff(viewer)) throw staffError(viewer);
  const username = String(input.username ?? '').toLowerCase();
  const role = String(input.role ?? '') as StaffRole | 'revoke';
  const title = cleanText(input.title, 80);
  if (role !== 'revoke' && (!['journalist', 'editor', 'moderator', 'admin', 'owner'].includes(role) || title.length < 2)) throw new HttpError(422, 'invalid');
  const u = await one<{ id: string; emailVerified: boolean; role: StaffRole | null }>(
    `SELECT u.id, u."emailVerified", s.role FROM "user" u LEFT JOIN staff s ON s.user_id = u.id WHERE u.username = $1`,
    [username],
  );
  if (!u || !u.emailVerified) throw new HttpError(404, 'not_found');
  if (u.id === viewer.id) throw new HttpError(403, 'conflict_of_interest');
  // Hierarchy: only the owner grants or removes admin/owner; admins manage roles below admin.
  if (!canAssignRole(viewer, role, u.role)) throw new HttpError(403, 'forbidden');
  return tx(async (t) => {
    if (u.role === 'owner' && role !== 'owner') {
      const owners = await t.query(`SELECT count(*)::int AS n FROM staff WHERE role = 'owner'`);
      if (owners.rows[0].n <= 1) throw new HttpError(409, 'last_owner');
    }
    if (role === 'revoke') {
      await t.query(`DELETE FROM staff WHERE user_id = $1`, [u.id]);
      await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES ($1, $2, 'revoke_staff', $3)`, [viewer.id, u.id, title || 'Staff verification revoked']);
      return { ok: true };
    }
    await t.query(
      `INSERT INTO staff (user_id, role, title, verified_by) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET role = $2, title = $3, verified_by = $4, verified_at = now()`,
      [u.id, role, title, viewer.id],
    );
    await t.query(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES ($1, $2, 'grant_staff', $3)`, [viewer.id, u.id, `${role}: ${title}`]);
    await t.query(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'staff', $2)`, [u.id, JSON.stringify({ role, title })]);
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ feedback ("Votre voix compte") */

const CATEGORIES = ['article_feedback', 'factual_error', 'story_idea', 'editorial_question', 'technical', 'private_concern'];

export async function createFeedback(viewer: Viewer | null, input: Record<string, unknown>) {
  const category = String(input.category ?? '');
  if (!CATEGORIES.includes(category)) throw new HttpError(422, 'invalid', { fields: { category: 'required' } });
  const message = cleanText(input.message, LIMITS.feedbackMax);
  if (message.length < 10) throw new HttpError(422, 'invalid', { fields: { message: 'too_short' } });
  const article = input.article ? String(input.article) : null;
  if (article && !KNOWN.has(article)) throw new HttpError(422, 'invalid', { fields: { article: 'unknown' } });
  const email = viewer ? null : String(input.contactEmail ?? '').trim().toLowerCase() || null;
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) throw new HttpError(422, 'invalid', { fields: { contactEmail: 'invalid' } });
  const lang = LOCALES.includes(String(input.lang)) ? String(input.lang) : 'fr';
  const r = await one<{ id: string }>(
    `INSERT INTO feedback (user_id, category, article_slug, message, contact_email, lang) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [viewer?.id ?? null, category, article, message, email, lang],
  );
  // The reference lets the sender quote it; nothing else about the submission is ever public.
  return { ok: true, reference: r!.id.slice(0, 8).toUpperCase() };
}

function requireInbox(v: Viewer) {
  if (!can.inbox(v)) throw staffError(v);
}

export async function inbox(viewer: Viewer, status: string) {
  requireInbox(viewer);
  const filter = ['new', 'in_progress', 'answered', 'closed'].includes(status) ? status : null;
  const rows = await q<{
    id: string; category: string; article_slug: string | null; message: string; contact_email: string | null; lang: string; status: string; assignee: string | null;
    resolution_note: string | null; created_at: Date; updated_at: Date; member: string | null;
  }>(
    `SELECT f.id, f.category, f.article_slug, f.message, f.contact_email, f.lang, f.status, a.username AS assignee, f.resolution_note, f.created_at, f.updated_at, m.username AS member
       FROM feedback f LEFT JOIN "user" a ON a.id = f.assignee_id LEFT JOIN "user" m ON m.id = f.user_id
      WHERE ($1::text IS NULL OR f.status = $1) ORDER BY (f.status = 'new') DESC, f.created_at DESC LIMIT 200`,
    [filter],
  );
  const ids = rows.map((r) => r.id);
  const replies = ids.length
    ? await q<{ feedback_id: string; body: string; channel: string; created_at: Date; author: string }>(
        `SELECT r.feedback_id, r.body, r.channel, r.created_at, u.username AS author FROM feedback_reply r JOIN "user" u ON u.id = r.author_id WHERE r.feedback_id = ANY($1::uuid[]) ORDER BY r.created_at`,
        [ids],
      )
    : [];
  const staff = await q<{ username: string; title: string }>(`SELECT u.username, s.title FROM staff s JOIN "user" u ON u.id = s.user_id ORDER BY u.username`);
  return {
    staff,
    items: rows.map((r) => ({
      id: r.id, reference: r.id.slice(0, 8).toUpperCase(), category: r.category, article: r.article_slug, message: r.message, contactEmail: r.contact_email, lang: r.lang,
      status: r.status, assignee: r.assignee, resolutionNote: r.resolution_note, member: r.member, createdAt: new Date(r.created_at).toISOString(),
      replies: replies.filter((x) => x.feedback_id === r.id).map((x) => ({ body: x.body, channel: x.channel, author: x.author, createdAt: new Date(x.created_at).toISOString() })),
    })),
  };
}

export async function updateFeedback(viewer: Viewer, id: string, input: Record<string, unknown>) {
  requireInbox(viewer);
  const status = input.status ? String(input.status) : null;
  if (status && !['new', 'in_progress', 'answered', 'closed'].includes(status)) throw new HttpError(422, 'invalid');
  let assignee: string | null | undefined;
  if (input.assignee !== undefined) {
    if (input.assignee === null || input.assignee === '') assignee = null;
    else {
      const s = await one<{ user_id: string }>(`SELECT s.user_id FROM staff s JOIN "user" u ON u.id = s.user_id WHERE u.username = $1`, [String(input.assignee).toLowerCase()]);
      if (!s) throw new HttpError(422, 'invalid_assignee');
      assignee = s.user_id;
    }
  }
  const note = input.resolutionNote !== undefined ? cleanText(input.resolutionNote, 2000) || null : undefined;
  const r = await q(
    `UPDATE feedback SET status = coalesce($2, status), assignee_id = CASE WHEN $3::boolean THEN $4 ELSE assignee_id END,
            resolution_note = CASE WHEN $5::boolean THEN $6 ELSE resolution_note END, updated_at = now() WHERE id = $1 RETURNING id`,
    [id, status, assignee !== undefined, assignee ?? null, note !== undefined, note ?? null],
  );
  if (!r.length) throw new HttpError(404, 'not_found');
  return { ok: true };
}

export async function replyFeedback(viewer: Viewer, id: string, input: Record<string, unknown>) {
  requireInbox(viewer);
  const body = cleanText(input.body, 4000);
  if (body.length < 2) throw new HttpError(422, 'empty');
  const f = await one<{ user_id: string | null; contact_email: string | null; lang: string }>(`SELECT user_id, contact_email, lang FROM feedback WHERE id = $1`, [id]).catch(() => undefined);
  if (!f) throw new HttpError(404, 'not_found');
  let channel: 'account' | 'email' | 'internal' = 'internal';
  if (f.user_id) {
    await q(`INSERT INTO notification (user_id, kind, payload) VALUES ($1, 'feedback_reply', $2)`, [f.user_id, JSON.stringify({ reference: id.slice(0, 8).toUpperCase(), body })]);
    channel = 'account';
  } else if (f.contact_email && process.env.RESEND_API_KEY) {
    await sendMail({ to: f.contact_email, kind: 'feedback_reply', subject: 'LËK — Votre voix compte', text: body });
    channel = 'email';
  }
  await q(`INSERT INTO feedback_reply (feedback_id, author_id, body, channel) VALUES ($1, $2, $3, $4)`, [id, viewer.id, body, channel]);
  await q(`UPDATE feedback SET status = CASE WHEN status = 'new' THEN 'answered' ELSE status END, updated_at = now() WHERE id = $1`, [id]);
  // The channel says honestly whether the reader can see the reply (account), was emailed, or it stayed internal.
  return { ok: true, channel };
}

export const newIdempotencyKey = () => randomUUID();
