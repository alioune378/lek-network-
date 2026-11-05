// LËK Community acceptance tests. Run in CI against `next start` with the private-pilot configuration
// (COMMUNITY_MODE=pilot, invitation-only registration, Cloudflare Turnstile TEST keys, MAIL_CAPTURE=1, LEK_ENV=staging)
// and a real, throwaway Postgres. Every check records pass/fail with evidence; the script exits 1 if any check fails.
// What this does NOT prove: delivery through Resend, or Turnstile with real (non-test) keys. Those need the staging site.
import { chromium } from 'playwright';
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TEST_MAIL_TOKEN;
const OUT = 'ci-artifacts/community';
mkdirSync(`${OUT}/shots`, { recursive: true });
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const results = [];
const check = (name, ok, evidence = '') => {
  results.push({ name, ok: Boolean(ok), evidence: typeof evidence === 'string' ? evidence : JSON.stringify(evidence) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${evidence ? `  — ${typeof evidence === 'string' ? evidence : JSON.stringify(evidence)}` : ''}`);
};
const ARTICLE = 'dakar-espaces-publics';
const PW = 'correct horse battery 42';
const browser = await chromium.launch();

// Each browser context gets its own client address, as separate testers would (auth rate limits are per IP).
let ipN = 0;
async function newCtx(viewport = { width: 1280, height: 900 }, locale = 'fr-FR') {
  ipN++;
  const ctx = await browser.newContext({ viewport, locale, extraHTTPHeaders: { 'x-forwarded-for': `10.20.${ipN >> 8}.${ipN & 255}` } });
  await ctx.addInitScript(() => localStorage.setItem('lek-lang-choice', 'fr'));
  return ctx;
}
// Cloudflare's documented dummy token: accepted by the always-pass TEST secret key, refused by real secret keys.
const DUMMY = 'XXXX.DUMMY.TOKEN.XXXX';
const BOOT = process.env.BOOTSTRAP_TOKEN;
const FOUNDER = process.env.FOUNDER_EMAIL;
const H = { origin: BASE, 'content-type': 'application/json', 'x-captcha-response': DUMMY };
let SPARE; // an unused pilot invitation for negative registration tests (they never consume it)
const POOL = []; // pilot invitation tokens, one per new member
const tokenOf = (link) => new URL(link).searchParams.get('invite');
async function call(ctx, method, path, body) {
  if (path === '/api/community/register' && body) body = { acceptPrivacy: true, acceptPilot: true, captcha: DUMMY, invite: SPARE, ...body };
  const r = await ctx.request.fetch(`${BASE}${path}`, { method, headers: H, data: body === undefined ? undefined : JSON.stringify(body), failOnStatusCode: false });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  return { status: r.status(), data, text: JSON.stringify(data) };
}
async function mailLink(email, kind = 'verify', skip = 0) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${BASE}/api/community/test-mail?to=${encodeURIComponent(email)}`, { headers: { 'x-test-token': TOKEN } });
    const j = await r.json();
    const m = j.items?.filter((x) => x.kind === kind)[skip]?.body.match(/https?:\/\/\S+/);
    if (m) return m[0];
    await new Promise((res) => setTimeout(res, 300));
  }
  return null;
}
const verificationLink = (email) => mailLink(email, 'verify');

/* RFC 6238 TOTP, test code only (the application itself relies on Better Auth). */
function base32(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0');
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
const used = new Map();
async function totp(secret) {
  // Never present the same time-step twice for one secret (an authenticator would not either).
  while (used.get(secret) === Math.floor(Date.now() / 30000)) await new Promise((r) => setTimeout(r, 1000));
  const step = Math.floor(Date.now() / 30000);
  used.set(secret, step);
  const ctr = Buffer.alloc(8);
  ctr.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', base32(secret)).update(ctr).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}
async function enable2fa(ctx) {
  const e = await call(ctx, 'POST', '/api/auth/two-factor/enable', { password: PW });
  if (e.status !== 200 || !e.data.totpURI) throw new Error(`2fa enable: ${e.status} ${e.text}`);
  const secret = new URL(e.data.totpURI).searchParams.get('secret');
  const v = await call(ctx, 'POST', '/api/auth/two-factor/verify-totp', { code: await totp(secret) });
  if (v.status !== 200) throw new Error(`2fa verify: ${v.status} ${v.text}`);
  return { secret, backupCodes: e.data.backupCodes ?? [] };
}
/** Signs in a 2FA account in a fresh context: password, then a TOTP code. */
async function signIn2fa(email, secret) {
  const ctx = await newCtx();
  const first = await call(ctx, 'POST', '/api/auth/sign-in/email', { email, password: PW });
  const meBefore = await call(ctx, 'GET', '/api/community/me');
  const second = await call(ctx, 'POST', '/api/auth/two-factor/verify-totp', { code: await totp(secret) });
  const meAfter = await call(ctx, 'GET', '/api/community/me');
  return { ctx, first, meBefore, second, meAfter };
}
/** Registers through the API, opens the emailed link in a fresh browser context (which signs the member in). */
async function member(username, displayName, viewport, invite, emailOverride) {
  const email = emailOverride ?? `${username}@example.test`;
  const anon = await newCtx(viewport);
  const token = invite ?? POOL.shift();
  if (!token) throw new Error('no pilot invitation left');
  const r = await call(anon, 'POST', '/api/community/register', { email, password: PW, username, displayName, locale: 'fr', acceptGuidelines: true, notifyReplies: true, invite: token });
  if (r.status !== 200) throw new Error(`register ${username}: ${r.status} ${r.text}`);
  const link = await verificationLink(email);
  if (!link) throw new Error(`no verification mail for ${username}`);
  const p = await anon.newPage();
  await p.goto(link);
  await p.waitForLoadState('networkidle');
  await p.close();
  return { ctx: anon, email, username };
}
const idOf = async (username) => (await db.query('SELECT id FROM "user" WHERE username = $1', [username])).rows[0]?.id;
const age = async (username, hours) => db.query(`UPDATE "user" SET "createdAt" = now() - make_interval(hours => $2) WHERE username = $1`, [username, hours]);
const commentsOf = async (ctx, sort = 'newest') => (await call(ctx, 'GET', `/api/community/comments?article=${ARTICLE}&sort=${sort}`)).data;
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

try {
  /* ---------------------------------------------------------------- 1. visitors */
  const visitor = await newCtx({ width: 390, height: 844 });
  const vp = await visitor.newPage();
  const res = await vp.goto(`${BASE}/fr/article/${ARTICLE}`, { waitUntil: 'networkidle' });
  check('Unregistered visitors can read articles', res.status() === 200 && (await vp.locator('h1').count()) === 1, `HTTP ${res.status()}`);
  check('Comment section shows a sign-in prompt to visitors', await vp.locator('.cm-join').isVisible());
  const anonPost = await call(visitor, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Bonjour', idempotencyKey: 'anon-00000001' });
  check('Unregistered visitors cannot submit comments', anonPost.status === 401, `HTTP ${anonPost.status} ${anonPost.data.error}`);
  const rawSignup = await call(visitor, 'POST', '/api/auth/sign-up/email', { email: 'x@example.test', password: PW, name: 'x' });
  check('Raw sign-up endpoint is closed (registration only through validated flow)', rawSignup.status === 404, `HTTP ${rawSignup.status}`);

  /* ---------------------------------------------------------------- 1b. staging protections */
  const home = await visitor.request.get(`${BASE}/fr`);
  const robots = await (await visitor.request.get(`${BASE}/robots.txt`)).text();
  check('Staging: every page carries X-Robots-Tag noindex and robots.txt disallows everything', /noindex/.test(home.headers()['x-robots-tag'] ?? '') && /Disallow: \/\s*$/m.test(robots), { xrt: home.headers()['x-robots-tag'], robots: robots.trim() });
  const apiCache = await visitor.request.get(`${BASE}/api/community/me`);
  check('Community API responses are never cached', /no-store/.test(apiCache.headers()['cache-control'] ?? ''), apiCache.headers()['cache-control']);
  const vb = await visitor.newPage();
  await vb.goto(`${BASE}/fr`, { waitUntil: 'networkidle' });
  check('Staging shows a visible "private staging" badge', await vb.locator('.staging-badge').isVisible());
  const mailNoToken = await fetch(`${BASE}/api/community/test-mail?to=x@example.test`);
  check('Captured-mail test endpoint is closed without the per-run test token', mailNoToken.status === 404, `HTTP ${mailNoToken.status}`);

  /* ---------------------------------------------------------------- 1c. founder bootstrap, invitations, two-step verification */
  const fctx = await newCtx();
  const badBoot = await call(fctx, 'POST', '/api/community/admin/bootstrap', { token: 'x'.repeat(BOOT.length), locale: 'fr' });
  check('Founder bootstrap refuses a wrong token', badBoot.status === 403 && badBoot.data.error === 'bootstrap_denied', badBoot.data);
  const boot1 = await call(fctx, 'POST', '/api/community/admin/bootstrap', { token: BOOT, locale: 'fr' });
  const boot2 = await call(fctx, 'POST', '/api/community/admin/bootstrap', { token: BOOT, locale: 'fr' });
  check(
    'Founder bootstrap emails a one-time link to FOUNDER_EMAIL only and never returns it (masked address in the response)',
    boot1.status === 200 && boot1.data.delivery === 'captured' && !boot1.text.includes('invite=') && !boot1.text.includes(FOUNDER) && boot1.data.sentTo?.includes('•••'),
    boot1.data,
  );
  const newest = await mailLink(FOUNDER, 'invite', 0);
  const older = await mailLink(FOUNDER, 'invite', 1);
  const olderCheck = (await call(fctx, 'GET', `/api/community/invites/check?token=${tokenOf(older)}`)).data;
  const newestCheck = (await call(fctx, 'GET', `/api/community/invites/check?token=${tokenOf(newest)}`)).data;
  check('Re-running the bootstrap revokes the earlier founder link (only the newest works)', boot2.status === 200 && olderCheck.valid === false && newestCheck.valid === true && newestCheck.purpose === 'founder', { olderCheck, newestCheck });

  const noInvite = await call(await newCtx(), 'POST', '/api/community/register', { email: 'walkin@example.test', password: PW, username: 'walk_in', displayName: 'Walk In', acceptGuidelines: true });
  check('Pilot: registration without an invitation is refused', noInvite.status === 403 && noInvite.data.error === 'invite_required', noInvite.data);
  const noCaptcha = await call(await newCtx(), 'POST', '/api/community/register', { email: 'bot@example.test', password: PW, username: 'bot_try', displayName: 'Bot', acceptGuidelines: true, invite: tokenOf(newest), captcha: '' });
  check('Turnstile is checked server-side: registration without a token is refused', noCaptcha.status === 400 && noCaptcha.data.error === 'captcha_required', noCaptcha.data);
  const signInNoCaptcha = await (await newCtx()).request.fetch(`${BASE}/api/auth/sign-in/email`, { method: 'POST', headers: { origin: BASE, 'content-type': 'application/json' }, data: JSON.stringify({ email: FOUNDER, password: PW }), failOnStatusCode: false });
  check('Turnstile is checked server-side on sign-in too (no token, refused)', signInNoCaptcha.status() === 400 || signInNoCaptcha.status() === 403, `HTTP ${signInNoCaptcha.status()}`);
  const wrongMail = await call(await newCtx(), 'POST', '/api/community/register', { email: 'intruder@example.test', password: PW, username: 'intruder', displayName: 'Intrus', acceptGuidelines: true, invite: tokenOf(newest) });
  check('The founder invitation only works for FOUNDER_EMAIL', wrongMail.status === 403 && wrongMail.data.error === 'invite_email_mismatch', wrongMail.data);
  const noPrivacy = await call(await newCtx(), 'POST', '/api/community/register', { email: FOUNDER, password: PW, username: 'fondateur', displayName: 'Fondateur LËK', acceptGuidelines: true, acceptPrivacy: false, acceptPilot: false, invite: tokenOf(newest) });
  check('Privacy notice and pilot conditions must be accepted explicitly', noPrivacy.status === 422 && noPrivacy.data.fields?.acceptPrivacy === 'required' && noPrivacy.data.fields?.acceptPilot === 'required', noPrivacy.data);

  const F = await member('fondateur', 'Fondateur LËK', undefined, tokenOf(newest), FOUNDER);
  const fMe = (await call(F.ctx, 'GET', '/api/community/me')).data;
  const fBlocked = await call(F.ctx, 'GET', '/api/community/invites');
  const fProfile = (await db.query(`SELECT privacy_version, pilot_consent_at FROM profile p JOIN "user" u ON u.id = p.user_id WHERE u.username = 'fondateur'`)).rows[0];
  check('Founder becomes owner, but staff powers stay off until two-step verification is on', fMe.viewer?.staff?.role === 'owner' && fMe.staffStatus === 'two_factor_required' && fBlocked.status === 403 && fBlocked.data.error === 'two_factor_required', { role: fMe.viewer?.staff?.role, status: fMe.staffStatus, api: fBlocked.data });
  check('Consent is recorded with the privacy-notice version and pilot consent time', fProfile?.privacy_version && fProfile.pilot_consent_at, fProfile);
  const boot3 = await call(fctx, 'POST', '/api/community/admin/bootstrap', { token: BOOT, locale: 'fr' });
  check('Bootstrap is closed for good once a founder exists', boot3.status === 409 && boot3.data.error === 'already_bootstrapped', boot3.data);
  const fTwo = await enable2fa(F.ctx);
  const fOk = await call(F.ctx, 'GET', '/api/community/invites');
  check('After TOTP set-up (QR secret + 6-digit code, backup codes issued) the founder can manage invitations', fOk.status === 200 && fTwo.backupCodes.length >= 8, { status: fOk.status, backupCodes: fTwo.backupCodes.length });
  const relogF = await signIn2fa(FOUNDER, fTwo.secret);
  check(
    'Signing in with two-step verification on: password alone gives no session; the TOTP code completes it',
    relogF.first.data.twoFactorRedirect === true && !relogF.meBefore.data.viewer && relogF.second.status === 200 && relogF.meAfter.data.viewer?.username === 'fondateur',
    { redirect: relogF.first.data.twoFactorRedirect, before: relogF.meBefore.status, after: relogF.meAfter.status },
  );
  const badTotp = await call(await newCtx(), 'POST', '/api/auth/two-factor/verify-totp', { code: '000000' });
  check('A TOTP code without a pending sign-in is refused', badTotp.status >= 400, `HTTP ${badTotp.status}`);

  const made = await call(F.ctx, 'POST', '/api/community/invites', { count: 20, days: 14, locale: 'fr', note: 'CI pilot cohort' });
  POOL.push(...(made.data.links ?? []).map(tokenOf));
  SPARE = POOL.pop();
  const stored = (await db.query(`SELECT token_hash FROM invite WHERE purpose = 'pilot' LIMIT 1`)).rows[0]?.token_hash ?? '';
  check('Admins create single-use pilot invitations; links are returned once and only a hash is stored', made.status === 200 && POOL.length === 19 && !POOL.includes(stored) && stored.length >= 40, { links: made.data.links?.length });
  const bound = await call(F.ctx, 'POST', '/api/community/invites', { email: 'bound@example.test', days: 7, locale: 'fr' });
  const boundMail = await mailLink('bound@example.test', 'invite');
  const boundWrong = await call(await newCtx(), 'POST', '/api/community/register', { email: 'someone@example.test', password: PW, username: 'not_bound', displayName: 'Pas moi', acceptGuidelines: true, invite: tokenOf(bound.data.links[0]) });
  check('An invitation bound to an email is emailed to it and refused for any other address', bound.status === 200 && bound.data.delivery === 'captured' && Boolean(boundMail) && boundWrong.data.error === 'invite_email_mismatch', { delivery: bound.data.delivery, wrong: boundWrong.data.error });
  const toRevoke = POOL.pop();
  const revId = (await call(F.ctx, 'GET', '/api/community/invites')).data.items.find((i) => i.status === 'active' && !i.email)?.id;
  const revokeIds = (await db.query(`SELECT id FROM invite WHERE token_hash = encode(sha256($1::bytea), 'hex')`, [toRevoke])).rows;
  const revoked = await call(F.ctx, 'DELETE', `/api/community/invites/${revokeIds[0]?.id ?? revId}`);
  const useRevoked = await call(await newCtx(), 'POST', '/api/community/register', { email: 'late@example.test', password: PW, username: 'late_one', displayName: 'En retard', acceptGuidelines: true, invite: toRevoke });
  check('A revoked invitation can no longer be used', revoked.status === 200 && useRevoked.status === 403 && useRevoked.data.error === 'invite_invalid', { revoke: revoked.status, use: useRevoked.data });

  /* ---------------------------------------------------------------- 2. registration through the UI */
  const reg = await newCtx({ width: 390, height: 844 });
  const rp = await reg.newPage();
  await rp.goto(`${BASE}/fr/account/register`, { waitUntil: 'networkidle' });
  await rp.screenshot({ path: `${OUT}/shots/mobile-fr-register-invite-only.png`, fullPage: true });
  check('Without an invitation the registration page explains it is invitation-only (no form)', (await rp.locator('form.cm-form').count()) === 0 && /invitation/i.test(await rp.locator('main').innerText()));
  await rp.goto(`${BASE}/fr/account/register?invite=${POOL.shift()}`, { waitUntil: 'networkidle' });
  await rp.getByLabel('Nom affiché', { exact: true }).fill('Aminata D.');
  await rp.getByLabel('Nom d’utilisateur', { exact: true }).fill('aminata_d');
  await rp.waitForTimeout(900);
  const availText = await rp.locator('.cm-avail').textContent();
  await rp.getByLabel('Adresse e-mail', { exact: true }).fill('aminata_d@example.test');
  await rp.locator('input[type="password"]').fill(PW);
  for (const n of [1, 2, 3]) await rp.locator('.cm-check input').nth(n).check();
  // Turnstile widget (Cloudflare test site key) must produce a token in the browser.
  await rp.waitForFunction(() => document.querySelector('[name="cf-turnstile-response"]')?.value, null, { timeout: 30000 });
  await rp.screenshot({ path: `${OUT}/shots/mobile-fr-register.png`, fullPage: true });
  const regResp = rp.waitForResponse((r) => r.url().includes('/api/community/register'), { timeout: 20000 });
  await rp.getByRole('button', { name: 'Créer mon compte' }).click();
  const rr = await regResp.catch(() => null);
  const rrBody = rr ? await rr.text().catch(() => '') : 'no request sent';
  await rp.waitForSelector('.cm-card[role="status"], .cm-error', { timeout: 10000 }).catch(() => {});
  if (!(await rp.locator('.cm-card[role="status"]').count())) throw new Error(`UI registration did not complete: ${rr?.status()} ${rrBody} | ${(await rp.locator('.cm-error').allInnerTexts()).join(' / ')}`);
  check('Invited registration works on a 390px phone with the Turnstile widget, and asks to check the inbox (no delivery claim)', (await rp.locator('.cm-card').textContent()).includes('Si cette adresse'), availText);
  check('Registration page has no horizontal overflow (390px)', (await overflow(rp)) <= 1);

  const preLogin = await call(reg, 'POST', '/api/auth/sign-in/email', { email: 'aminata_d@example.test', password: PW });
  check('An unverified account cannot sign in (so cannot comment)', preLogin.status === 403, `HTTP ${preLogin.status}`);

  const link = await verificationLink('aminata_d@example.test');
  await rp.goto(link);
  await rp.waitForLoadState('networkidle');
  check('Email verification link signs the member in and lands on the account page', rp.url().includes('/fr/account') && (await rp.locator('.cm-idcard').isVisible()), rp.url());
  const A = { ctx: reg, username: 'aminata_d', email: 'aminata_d@example.test' };

  const dupUser = await call(await newCtx(), 'POST', '/api/community/register', { email: 'other@example.test', password: PW, username: 'Aminata_D', displayName: 'Autre', acceptGuidelines: true });
  check('Duplicate usernames cannot register (case-insensitive)', dupUser.status === 409 && dupUser.data.error === 'username_taken', `HTTP ${dupUser.status} ${dupUser.data.error}`);
  const dupEmail = await call(await newCtx(), 'POST', '/api/community/register', { email: 'aminata_d@example.test', password: PW, username: 'someone_else', displayName: 'X', acceptGuidelines: true });
  const exMail = await (await fetch(`${BASE}/api/community/test-mail?to=aminata_d@example.test`, { headers: { 'x-test-token': TOKEN } })).json();
  check(
    'Registering an existing email gives the same answer as a new one (no account enumeration) and warns the owner',
    dupEmail.status === 200 && dupEmail.data.ok === true && exMail.items.some((m) => m.kind === 'existing_account') && !(await idOf('someone_else')),
    `HTTP ${dupEmail.status}`,
  );
  const reserved = await call(await newCtx(), 'POST', '/api/community/register', { email: 'imp@example.test', password: PW, username: 'lek_officiel', displayName: 'Rédaction LËK', acceptGuidelines: true });
  check('Impersonating usernames/display names are refused', reserved.status === 422, reserved.text);
  const noGuidelines = await call(await newCtx(), 'POST', '/api/community/register', { email: 'g@example.test', password: PW, username: 'guideless', displayName: 'G', acceptGuidelines: false });
  check('Accepting the community guidelines is required', noGuidelines.status === 422 && noGuidelines.data.fields?.acceptGuidelines === 'required');

  /* ---------------------------------------------------------------- 3. comments */
  await age(A.username, 48);
  const ap = await A.ctx.newPage();
  await ap.goto(`${BASE}/fr/article/${ARTICLE}`, { waitUntil: 'networkidle' });
  await ap.locator('.cm-composer textarea').fill('Les places publiques de Dakar manquent d’ombre : la municipalité devrait planter des arbres le long de la corniche.');
  await ap.getByRole('button', { name: 'Publier' }).click();
  await ap.waitForSelector('.cm-item', { timeout: 10000 });
  const fresh = await newCtx();
  const list1 = await commentsOf(fresh);
  const top = list1.comments?.find((c) => c.author.username === 'aminata_d');
  check('A verified account can submit comments (UI)', Boolean(top) && top.status === 'published', `count=${list1.count}`);
  check('Comments persist across browsers and sessions (new context, no cookies)', Boolean(top));

  const B = await member('bakary_s', 'Bakary S.');
  await age(B.username, 48);
  const reply = await call(B.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'D’accord, et il faut aussi des bancs.', parentId: top.id, idempotencyKey: 'reply-0000001' });
  const nested = await call(A.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Merci Bakary, bonne idée.', parentId: reply.data.id, idempotencyKey: 'nested-000001' });
  const rows = (await db.query('SELECT id, parent_id FROM comment WHERE id = ANY($1::uuid[])', [[reply.data.id, nested.data.id]])).rows;
  check(
    'Replies are attached to the correct parent; a reply to a reply joins the top thread (one level)',
    rows.find((r) => r.id === reply.data.id)?.parent_id === top.id && rows.find((r) => r.id === nested.data.id)?.parent_id === top.id,
    rows,
  );
  const again = await call(B.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'D’accord, et il faut aussi des bancs.', parentId: top.id, idempotencyKey: 'reply-0000001' });
  check('Posting is idempotent (same key does not create a duplicate)', again.data.id === reply.data.id && again.data.duplicate === true);
  // A registered without reply notifications (opt-in box unchecked); B opted in. A replied to B's reply.
  const notesA = await call(A.ctx, 'GET', '/api/community/notifications');
  const notesB = await call(B.ctx, 'GET', '/api/community/notifications');
  check(
    'Reply notifications are optional: sent to a member who opted in, not to one who did not',
    notesB.data.items?.some((n) => n.kind === 'reply' && n.payload.by === 'aminata_d') && !notesA.data.items?.some((n) => n.kind === 'reply'),
    { optedIn: notesB.data.items?.length, optedOut: notesA.data.items?.length },
  );

  const pubJson = JSON.stringify(await commentsOf(fresh)) + JSON.stringify((await call(fresh, 'GET', '/api/community/users/aminata_d')).data);
  const profPage = await (await newCtx()).newPage();
  await profPage.goto(`${BASE}/fr/u/aminata_d`, { waitUntil: 'networkidle' });
  const profHtml = await profPage.content();
  check('Private email addresses are never visible publicly (API + profile page)', !/example\.test/.test(pubJson) && !/example\.test/.test(profHtml) && (await profPage.locator('.cm-profile').isVisible()));

  // XSS: plain text only
  const xss = await call(B.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: '<script>window.__x=1</script><img src=x onerror="window.__y=1"> test', idempotencyKey: 'xss-00000001' });
  const xp = await (await newCtx()).newPage();
  await xp.goto(`${BASE}/fr/article/${ARTICLE}`, { waitUntil: 'networkidle' });
  await xp.locator('.cm-sort button').nth(1).click();
  await xp.waitForTimeout(800);
  const xssState = await xp.evaluate(() => ({ x: window.__x, y: window.__y, scripts: document.querySelectorAll('.cm-body script, .cm-body img').length, text: document.body.innerText.includes('<script>') }));
  check('User HTML is shown as text, never executed (XSS)', xss.status === 200 && !xssState.x && !xssState.y && xssState.scripts === 0 && xssState.text, xssState);

  // CSRF
  const evil = await B.ctx.request.fetch(`${BASE}/api/community/comments`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, data: JSON.stringify({ article: ARTICLE, body: 'x', idempotencyKey: 'csrf-0000001' }), failOnStatusCode: false });
  check('Cross-site requests are refused (Origin check)', evil.status() === 403);

  // edit + delete
  const own = await call(B.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Premier jet', idempotencyKey: 'edit-00000001' });
  await call(B.ctx, 'PATCH', `/api/community/comments/${own.data.id}`, { body: 'Premier jet, corrigé.' });
  const afterEdit = (await commentsOf(fresh)).comments.find((c) => c.id === own.data.id);
  check('Edits are saved with a visible edit indicator', afterEdit?.editedAt && afterEdit.body === 'Premier jet, corrigé.');
  const foreignEdit = await call(A.ctx, 'PATCH', `/api/community/comments/${own.data.id}`, { body: 'piraté' });
  check("Members cannot edit someone else's comment", foreignEdit.status === 404);
  await call(B.ctx, 'DELETE', `/api/community/comments/${own.data.id}`, {});
  const afterDel = (await commentsOf(fresh)).comments.find((c) => c.id === own.data.id);
  const kept = (await db.query('SELECT user_id, body FROM comment WHERE id = $1', [own.data.id])).rows[0];
  check('Deleted comments are hidden publicly but keep their author in the database', afterDel?.status === 'deleted' && afterDel.body === null && kept.user_id === (await idOf('bakary_s')));

  // helpful reactions
  const ownHelpful = await call(A.ctx, 'POST', `/api/community/comments/${top.id}/helpful`, {});
  const C = await member('coumba_n', 'Coumba N.');
  const tooNew = await call(C.ctx, 'POST', `/api/community/comments/${top.id}/helpful`, {});
  await age(C.username, 48);
  const h1 = await call(C.ctx, 'POST', `/api/community/comments/${top.id}/helpful`, {});
  const h2 = await call(B.ctx, 'POST', `/api/community/comments/${top.id}/helpful`, {});
  const h3 = await call(B.ctx, 'POST', `/api/community/comments/${top.id}/helpful`, {});
  check('Helpful: one per member, toggles, not on own comments, not from brand-new accounts', ownHelpful.status === 403 && tooNew.status === 403 && h1.data.helpful === 1 && h2.data.helpful === 2 && h3.data.helpful === 1, {
    own: ownHelpful.status, tooNew: tooNew.status, h1: h1.data, h2: h2.data, h3: h3.data,
  });
  const sorted = await commentsOf(fresh, 'helpful');
  check('Sorting by most helpful puts the helpful comment first', sorted.comments[0]?.id === top.id);

  // automatic checks
  const D = await member('demba_k', 'Demba K.');
  const linky = await call(D.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Voir https://example.org/rapport', idempotencyKey: 'link-00000001' });
  const flood = await call(D.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'http://a.sn http://b.sn http://c.sn http://d.sn', idempotencyKey: 'flood-0000001' });
  await age(D.username, 48);
  const threat = await call(D.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Je vais te retrouver et te tuer.', idempotencyKey: 'threat-000001' });
  const political = await call(D.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Le ministre ment et ce gouvernement a échoué : il doit rendre des comptes.', idempotencyKey: 'pol-000000001' });
  const visibleToOthers = (await commentsOf(fresh)).comments.some((c) => c.id === threat.data.id);
  check('Spam: new-account link held, link flood rejected', linky.data.status === 'pending' && flood.status === 422, { linky: linky.data, flood: flood.status });
  check('Threats are held for human review and hidden from others meanwhile', threat.data.status === 'pending' && !visibleToOthers);
  check('Political criticism of officials is published without any flag', political.data.status === 'published' && political.data.signals.length === 0);

  // reports
  const rep = await call(B.ctx, 'POST', `/api/community/comments/${political.data.id}/report`, { reason: 'spam', details: 'je ne suis pas d’accord' });
  const rep2 = await call(B.ctx, 'POST', `/api/community/comments/${political.data.id}/report`, { reason: 'spam' });
  const stillVisible = (await commentsOf(fresh)).comments.find((c) => c.id === political.data.id)?.status === 'published';
  check('Spam and abusive content can be reported; reports alone never hide a comment', rep.status === 200 && rep2.data.alreadyReported === true && stillVisible);

  /* ---------------------------------------------------------------- 4. moderation */
  const notMod = await call(B.ctx, 'GET', '/api/community/moderation?view=open');
  const notModPage = await (await B.ctx.newPage()).goto(`${BASE}/fr/moderation`);
  const M = await member('mariama_m', 'Mariama M.');
  const grantM = await call(F.ctx, 'POST', '/api/community/moderation/staff', { username: 'mariama_m', role: 'moderator', title: 'Modération LËK' });
  const mNo2fa = await call(M.ctx, 'GET', '/api/community/moderation?view=open');
  check('A newly appointed moderator has no powers before two-step verification', grantM.status === 200 && mNo2fa.status === 403 && mNo2fa.data.error === 'two_factor_required', { grant: grantM.status, mod: mNo2fa.data });
  await enable2fa(M.ctx);
  const anyCase = (await call(M.ctx, 'GET', '/api/community/moderation?view=open')).data.items?.[0];
  const forged = await call(B.ctx, 'POST', `/api/community/moderation/cases/${anyCase?.id}`, { commentAction: 'remove', userAction: 'suspend', reason: 'test' });
  check('Unauthorized users cannot perform moderator actions (API and page)', notMod.status === 403 && notModPage.status() === 404 && forged.status === 403, { api: notMod.status, page: notModPage.status(), forged: forged.status });

  const queue = (await call(M.ctx, 'GET', '/api/community/moderation?view=open')).data.items;
  const threatCase = queue.find((c) => c.commentId === threat.data.id);
  const reportCase = queue.find((c) => c.commentId === political.data.id);
  check('Moderators see a queue with reference, source, reasons, context and severity', threatCase?.severity === 'critical' && threatCase.source === 'automatic' && reportCase?.source === 'reader' && reportCase.reports.length === 1, {
    threat: threatCase && { severity: threatCase.severity, reasons: threatCase.reasons, suggested: threatCase.suggested },
  });
  const mp = await M.ctx.newPage();
  await mp.goto(`${BASE}/fr/moderation`, { waitUntil: 'networkidle' });
  await mp.screenshot({ path: `${OUT}/shots/desktop-fr-moderation.png`, fullPage: true });

  const noChoice = await call(M.ctx, 'POST', `/api/community/moderation/cases/${threatCase.id}`, { userAction: 'none', reason: 'Clic trop rapide' });
  check('A held comment cannot be decided without an explicit choice (no default that publishes)', noChoice.status === 422 && noChoice.data.error === 'invalid_action', noChoice.data);
  // dismiss the bad-faith report: the comment stays
  await call(M.ctx, 'POST', `/api/community/moderation/cases/${reportCase.id}`, { commentAction: 'keep', userAction: 'none', reason: 'Critique politique légitime, aucune règle enfreinte.' });
  // remove the threat + restrict
  const decision = await call(M.ctx, 'POST', `/api/community/moderation/cases/${threatCase.id}`, { commentAction: 'remove', userAction: 'restrict', duration: '24h', reason: 'Menace explicite envers une personne.' });
  const blocked = await call(D.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Je peux encore écrire ?', idempotencyKey: 'blocked-00001' });
  const removedView = (await commentsOf(fresh)).comments.find((c) => c.id === threat.data.id);
  check('Moderators can act on reports (remove + temporary restriction)', decision.status === 200 && removedView?.status === 'removed' && removedView.body === null && removedView.removedReason, decision.data);
  check('Account restrictions work (restricted member cannot comment)', blocked.status === 403 && blocked.data.error === 'comment_restricted', blocked.data);
  const selfCase = await call(M.ctx, 'POST', `/api/community/comments`, { article: ARTICLE, body: 'Note de modération : merci de rester courtois.', idempotencyKey: 'modnote-0001' });
  check('Staff comments still go through the same endpoint and rules (rate limits, reports)', selfCase.status === 200);

  // appeal
  const dAcc = await call(D.ctx, 'GET', '/api/community/me');
  const restrictAction = dAcc.data.moderation.find((a) => a.action === 'restrict');
  const appeal = await call(D.ctx, 'POST', '/api/community/appeals', { actionId: restrictAction.id, message: 'Je regrette ce message, écrit sous le coup de la colère. Je demande la levée de la restriction.' });
  const appeals = (await call(M.ctx, 'GET', '/api/community/moderation?view=appeals')).data.items;
  const sameReviewer = await call(M.ctx, 'POST', `/api/community/moderation/appeals/${appeal.data.id}`, { decision: 'overturned', note: 'test' });
  const X = await member('xadija_a', 'Xadija A.');
  await call(F.ctx, 'POST', '/api/community/moderation/staff', { username: 'xadija_a', role: 'editor', title: 'Rédaction en chef' });
  await enable2fa(X.ctx);
  const overturn = await call(X.ctx, 'POST', `/api/community/moderation/appeals/${appeal.data.id}`, { decision: 'overturned', note: 'Restriction levée ; le commentaire reste retiré séparément.' });
  const unblocked = await call(D.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Merci, je reste courtois désormais.', idempotencyKey: 'unblock-00001' });
  check('Appeals can be filed and reviewed by a different moderator; overturning lifts the restriction', appeal.status === 200 && appeals.length >= 1 && sameReviewer.status === 403 && overturn.status === 200 && unblocked.status === 200, {
    appeal: appeal.status, same: sameReviewer.data.error, overturn: overturn.status, after: unblocked.status,
  });

  // restore wrongly removed content
  const rm = (await call(M.ctx, 'GET', '/api/community/moderation?view=resolved')).data.items.find((c) => c.commentId === threat.data.id);
  const restore = await call(X.ctx, 'POST', `/api/community/comments/${threat.data.id}/restore`, { reason: 'Test de restauration' });
  const restored = (await commentsOf(fresh)).comments.find((c) => c.id === threat.data.id);
  check('Moderators can restore removed content', Boolean(rm) && restore.status === 200 && restored?.status === 'published');
  let auditImmutable = false;
  try {
    await db.query(`UPDATE moderation_action SET reason = 'x'`);
  } catch {
    auditImmutable = true;
  }
  const audit = (await call(X.ctx, 'GET', '/api/community/moderation?view=audit')).data.items;
  check('Every action is in an append-only audit log', auditImmutable && audit.length >= 5, `${audit.length} entries`);

  /* ---------------------------------------------------------------- 5. feedback + journalists */
  const anonFb = await newCtx({ width: 390, height: 844 });
  const fp = await anonFb.newPage();
  await fp.goto(`${BASE}/fr/feedback?article=${ARTICLE}`, { waitUntil: 'networkidle' });
  await fp.locator('.cm-cat').nth(1).click();
  await fp.locator('textarea').fill('Le chiffre de la population de Dakar cité au deuxième paragraphe semble daté de 2013.');
  await fp.waitForFunction(() => document.querySelector('[name="cf-turnstile-response"]')?.value, null, { timeout: 30000 });
  await fp.screenshot({ path: `${OUT}/shots/mobile-fr-feedback.png`, fullPage: true });
  const anonNoCaptcha = await call(await newCtx(), 'POST', '/api/community/feedback', { category: 'factual_error', message: 'Test sans vérification anti-robot, assez long.' });
  check('Anonymous feedback also requires the Turnstile check server-side', anonNoCaptcha.status === 400 && anonNoCaptcha.data.error === 'captcha_required', anonNoCaptcha.data);
  await fp.getByRole('button', { name: 'Envoyer à la rédaction' }).click();
  await fp.waitForSelector('.cm-card[role="status"]');
  const refText = await fp.locator('.cm-card').textContent();
  check('Readers can send private feedback (factual error) without an account', /Référence/.test(refText), refText.trim().slice(0, 80));
  check('Feedback page has no horizontal overflow (390px)', (await overflow(fp)) <= 1);
  const fbB = await call(B.ctx, 'POST', '/api/community/feedback', { category: 'editorial_question', article: ARTICLE, message: 'Pourquoi ne citez-vous pas les sources municipales ?' });
  const leak = JSON.stringify(await commentsOf(fresh)) + JSON.stringify((await call(fresh, 'GET', '/api/community/users/bakary_s')).data);
  const memberInbox = await call(B.ctx, 'GET', '/api/community/inbox');
  check('Editorial feedback remains private (not in public APIs, inbox refused to members)', !leak.includes('sources municipales') && !leak.includes('2013') && memberInbox.status === 403);
  const J = await member('jeanne_d', 'Jeanne D.');
  // An admin (appointed by the founder) appoints the journalist: tests the role hierarchy at the same time.
  const W = await member('awa_admin', 'Awa N.');
  const grantW = await call(F.ctx, 'POST', '/api/community/moderation/staff', { username: 'awa_admin', role: 'admin', title: 'Administration LËK' });
  await enable2fa(W.ctx);
  const modTriesStaff = await call(M.ctx, 'POST', '/api/community/moderation/staff', { username: 'jeanne_d', role: 'editor', title: 'Essai' });
  const adminMakesAdmin = await call(W.ctx, 'POST', '/api/community/moderation/staff', { username: 'jeanne_d', role: 'admin', title: 'Essai' });
  const adminRevokesOwner = await call(W.ctx, 'POST', '/api/community/moderation/staff', { username: 'fondateur', role: 'revoke', title: '' });
  const selfChange = await call(F.ctx, 'POST', '/api/community/moderation/staff', { username: 'fondateur', role: 'journalist', title: 'Moi' });
  const memberInvites = await call(B.ctx, 'POST', '/api/community/invites', { count: 1 });
  const modInvites = await call(M.ctx, 'GET', '/api/community/invites');
  const grantJ = await call(W.ctx, 'POST', '/api/community/moderation/staff', { username: 'jeanne_d', role: 'journalist', title: 'Journaliste, LËK Dakar' });
  check(
    'Role hierarchy: only admins/owner manage staff; admins cannot create admins or touch the owner; nobody changes their own role; members and moderators cannot invite',
    grantW.status === 200 && modTriesStaff.status === 403 && adminMakesAdmin.status === 403 && adminRevokesOwner.status === 403 && selfChange.status === 403 && memberInvites.status === 403 && modInvites.status === 403 && grantJ.status === 200,
    { grantW: grantW.status, mod: modTriesStaff.status, adminAdmin: adminMakesAdmin.status, adminOwner: adminRevokesOwner.status, self: selfChange.data.error, memberInv: memberInvites.status, modInv: modInvites.status, grantJ: grantJ.status },
  );
  await enable2fa(J.ctx);
  const box = await call(J.ctx, 'GET', '/api/community/inbox');
  const bItem = box.data.items.find((i) => i.member === 'bakary_s');
  const aItem = box.data.items.find((i) => !i.member);
  await call(J.ctx, 'PATCH', `/api/community/inbox/${bItem.id}`, { status: 'in_progress', assignee: 'jeanne_d', resolutionNote: 'Vérifier auprès de la mairie.' });
  const replyB = await call(J.ctx, 'POST', `/api/community/inbox/${bItem.id}`, { body: 'Merci : nous avons ajouté la source municipale dans l’article.' });
  const replyAnon = await call(J.ctx, 'POST', `/api/community/inbox/${aItem.id}`, { body: 'Merci, nous vérifions.' });
  const bNotes = await call(B.ctx, 'GET', '/api/community/notifications');
  check('Newsroom inbox: category, article, date, status, assignee, notes and replies', bItem && aItem && fbB.status === 200 && replyB.data.channel === 'account' && bNotes.data.items.some((n) => n.kind === 'feedback_reply'));
  check('Replies to readers without an account or email provider are honestly marked internal', replyAnon.data.channel === 'internal');
  const jp = await J.ctx.newPage();
  await jp.goto(`${BASE}/fr/newsroom/inbox`, { waitUntil: 'networkidle' });
  await jp.screenshot({ path: `${OUT}/shots/desktop-fr-inbox.png`, fullPage: true });

  const staffNote = await call(J.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Note de la rédaction : nous avons mis à jour le chiffre de population.', staffNote: true, idempotencyKey: 'note-00000001' });
  const notePrivileged = await call(B.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: 'Fausse note', staffNote: true, idempotencyKey: 'fake-note-001' });
  const withNote = await commentsOf(fresh);
  check('Verified journalists can post editorial notes, shown first with a staff badge; members cannot', staffNote.status === 200 && notePrivileged.status === 403 && withNote.comments[0]?.staffNote && withNote.comments[0].author.staff?.title === 'Journaliste, LËK Dakar');

  /* ---------------------------------------------------------------- 5b. Wolof and Arabic input, pilot questionnaire */
  const wolof = 'Jërëjëf ci liggéey bi ! Ñun ñépp dañuy bëgg Dakar bu set, te ñu am ay garab ci mbedd mi.';
  const arabic = 'شكرًا على هذا التحقيق، نحتاج إلى مزيد من الظل في ساحات داكار.';
  const L = await member('lat_d', 'Lat D.');
  await age(L.username, 48);
  const wo = await call(L.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: wolof, idempotencyKey: 'wolof-0000001' });
  const ar = await call(L.ctx, 'POST', '/api/community/comments', { article: ARTICLE, body: arabic, idempotencyKey: 'arabic-000001' });
  const back = (await commentsOf(fresh)).comments;
  check('Wolof input (ë, é, ñ) and Arabic input are stored and returned exactly', back.find((c) => c.id === wo.data.id)?.body === wolof.normalize('NFC') && back.find((c) => c.id === ar.data.id)?.body === arabic.normalize('NFC'), { wo: wo.status, ar: ar.status });
  const arp = await (await newCtx({ width: 390, height: 844 })).newPage();
  await arp.goto(`${BASE}/ar/article/${ARTICLE}`, { waitUntil: 'networkidle' });
  const arDir = await arp.locator('.cm-item', { hasText: 'داكار' }).first().evaluate((el) => getComputedStyle(el.querySelector('.cm-body') ?? el).direction).catch(() => 'missing');
  const woDir = await arp.locator('.cm-item', { hasText: 'Jërëjëf' }).first().evaluate((el) => getComputedStyle(el.querySelector('.cm-body') ?? el).direction).catch(() => 'missing');
  check('In the Arabic interface, an Arabic comment reads right-to-left and a Wolof comment left-to-right', arDir === 'rtl' && woDir === 'ltr', { arDir, woDir });

  const pilotBody = {
    ratings: { registration: 4, rules: 5, reporting: 3, appeals: 2, safety: 4, design: 5, recommend: 4 },
    quiz: { emailVisible: 'no', reportEffect: 'auto_removed', appeal: 'other_moderator', disagreement: 'allowed' },
    tasks: ['register', 'comment', 'report', 'language'],
    confusing: 'Fii, xam-xam bi ci recours bi dafa jafe tuuti.',
    suggestion: 'Ajouter un exemple de recours.',
  };
  const pB = await call(B.ctx, 'POST', '/api/community/pilot', pilotBody);
  const pBad = await call(D.ctx, 'POST', '/api/community/pilot', { ratings: { registration: 9 } });
  const pVisitor = await call(await newCtx(), 'POST', '/api/community/pilot', pilotBody);
  const pMine = (await call(B.ctx, 'GET', '/api/community/pilot')).data;
  const sumMember = await call(B.ctx, 'GET', '/api/community/moderation?view=pilot');
  const sumMod = await call(M.ctx, 'GET', '/api/community/moderation?view=pilot');
  const sum = await call(F.ctx, 'GET', '/api/community/moderation?view=pilot');
  check('Pilot questionnaire: members save and reload their answers; invalid ratings and visitors are refused', pB.status === 200 && pBad.status === 422 && pVisitor.status === 401 && pMine.response?.ratings?.rules === 5, { save: pB.status, bad: pBad.status, visitor: pVisitor.status });
  check(
    'Pilot results: editors+ see averages and understanding rates, free text without names; members and moderators cannot',
    sum.status === 200 && sum.data.summary.responses === 1 && sum.data.summary.understanding.reportEffect === 0 && sum.data.summary.understanding.appeal === 100 && !/bakary|example\.test/i.test(sum.text) && sumMember.status === 403 && sumMod.status === 403,
    { owner: sum.status, member: sumMember.status, moderator: sumMod.status, understanding: sum.data.summary?.understanding },
  );
  for (const l of ['fr', 'ar']) {
    const pp2 = await B.ctx.newPage();
    await pp2.setViewportSize({ width: 390, height: 844 });
    await pp2.goto(`${BASE}/${l}/pilot`, { waitUntil: 'networkidle' });
    await pp2.screenshot({ path: `${OUT}/shots/mobile-${l}-pilot.png`, fullPage: true });
    check(`Pilot questionnaire page works in ${l.toUpperCase()} at 390px (answers reloaded, no overflow)`, (await overflow(pp2)) <= 1 && (await pp2.locator('.cm-rating-n.is-on').count()) === 7);
    await pp2.close();
  }
  const fp2 = await F.ctx.newPage();
  await fp2.goto(`${BASE}/fr/moderation`, { waitUntil: 'networkidle' });
  await fp2.getByRole('button', { name: 'Invitations' }).click();
  await fp2.waitForSelector('.mod-table tbody tr');
  await fp2.screenshot({ path: `${OUT}/shots/desktop-fr-invitations.png`, fullPage: true });
  await fp2.getByRole('button', { name: 'Pilote' }).click();
  await fp2.waitForSelector('.cm-dl');
  await fp2.screenshot({ path: `${OUT}/shots/desktop-fr-pilot-results.png`, fullPage: true });
  const fa = await F.ctx.newPage();
  await fa.setViewportSize({ width: 390, height: 844 });
  await fa.goto(`${BASE}/fr/account`, { waitUntil: 'networkidle' });
  await fa.screenshot({ path: `${OUT}/shots/mobile-fr-account-founder.png`, fullPage: true });
  const bp = await (await newCtx({ width: 390, height: 844 })).newPage();
  await bp.goto(`${BASE}/fr/admin/bootstrap`, { waitUntil: 'networkidle' });
  await bp.screenshot({ path: `${OUT}/shots/mobile-fr-bootstrap.png`, fullPage: true });
  const prv = await (await newCtx()).newPage();
  await prv.goto(`${BASE}/fr/privacy`, { waitUntil: 'networkidle' });
  const prvText = await prv.locator('main').innerText();
  check('Privacy page (pilot) names the processors (Netlify, Resend, Cloudflare Turnstile) and the pilot terms', /Resend/.test(prvText) && /Turnstile/.test(prvText) && /pilote privé/i.test(prvText) && !/Aucune collecte/.test(prvText));
  // A member enables optional 2FA from the account page UI (QR code shown, backup codes shown once).
  const tf = await A.ctx.newPage();
  await tf.setViewportSize({ width: 390, height: 844 });
  await tf.goto(`${BASE}/fr/account`, { waitUntil: 'networkidle' });
  await tf.locator('#tf-h').scrollIntoViewIfNeeded();
  await tf.getByRole('button', { name: 'Activer' }).click();
  await tf.locator('section[aria-labelledby="tf-h"] input[type="password"]').fill(PW);
  await tf.getByRole('button', { name: 'Continuer' }).click();
  await tf.waitForSelector('.cm-qr', { timeout: 10000 });
  const shownSecret = (await tf.locator('.cm-secret').innerText()).replace(/\s/g, '');
  await tf.locator('section[aria-labelledby="tf-h"] input[autocomplete="one-time-code"]').fill(await totp(shownSecret));
  await tf.locator('section[aria-labelledby="tf-h"]').screenshot({ path: `${OUT}/shots/mobile-fr-2fa-setup.png` });
  await tf.getByRole('button', { name: 'Vérifier' }).click();
  await tf.waitForSelector('section[aria-labelledby="tf-h"] .cm-status', { timeout: 10000 });
  const aTwo = (await db.query(`SELECT "twoFactorEnabled" FROM "user" WHERE username = 'aminata_d'`)).rows[0];
  check('Two-step verification can be switched on from the account page (QR code, manual key, code check)', aTwo?.twoFactorEnabled === true && (await overflow(tf)) <= 1);

  /* ---------------------------------------------------------------- 6. screens, languages, keyboard */
  for (const [l, vpS] of [['fr', { width: 390, height: 844 }], ['ar', { width: 390, height: 844 }], ['en', { width: 1280, height: 900 }], ['fr', { width: 320, height: 700 }]]) {
    const pg2 = await B.ctx.newPage();
    await pg2.setViewportSize(vpS);
    await pg2.goto(`${BASE}/${l}/article/${ARTICLE}`, { waitUntil: 'networkidle' });
    await pg2.locator('.cm').scrollIntoViewIfNeeded();
    await pg2.waitForTimeout(600);
    const o = await overflow(pg2);
    const dir = await pg2.evaluate(() => document.documentElement.dir);
    await pg2.locator('.cm').screenshot({ path: `${OUT}/shots/comments-${l}-${vpS.width}.png` });
    check(`Comments render in ${l.toUpperCase()} at ${vpS.width}px without overflow${l === 'ar' ? ' (RTL)' : ''}`, o <= 1 && (l !== 'ar' || dir === 'rtl'), `overflow ${o}, dir ${dir}`);
    await pg2.close();
  }
  for (const l of ['fr', 'en', 'ar']) {
    const p3 = await (await newCtx({ width: 390, height: 844 })).newPage();
    const r3 = await p3.goto(`${BASE}/${l}/community`, { waitUntil: 'networkidle' });
    const r4 = await p3.goto(`${BASE}/${l}/account/login`, { waitUntil: 'networkidle' });
    check(`Community and sign-in pages work in ${l.toUpperCase()}`, r3.status() === 200 && r4.status() === 200 && (await overflow(p3)) <= 1);
    if (l === 'ar') await p3.screenshot({ path: `${OUT}/shots/mobile-ar-login.png`, fullPage: true });
  }
  const kp = await A.ctx.newPage();
  await kp.goto(`${BASE}/fr/article/${ARTICLE}`, { waitUntil: 'networkidle' });
  const replyBtn = kp.locator('.cm-thread').filter({ hasText: 'manquent d’ombre' }).getByRole('button', { name: 'Répondre' }).first();
  await replyBtn.focus();
  await kp.keyboard.press('Enter');
  await kp.waitForTimeout(300);
  const focused = await kp.evaluate(() => document.activeElement?.tagName);
  check('Keyboard: Enter on "Reply" opens the reply box with focus in it', focused === 'TEXTAREA', focused);
  await kp.keyboard.press('Escape');
  const ap2 = await A.ctx.newPage();
  await ap2.setViewportSize({ width: 390, height: 844 });
  await ap2.goto(`${BASE}/fr/account`, { waitUntil: 'networkidle' });
  await ap2.screenshot({ path: `${OUT}/shots/mobile-fr-account.png`, fullPage: true });
  check('Account page has no overflow on a phone', (await overflow(ap2)) <= 1);
  const pp = await (await newCtx({ width: 390, height: 844 })).newPage();
  await pp.goto(`${BASE}/fr/u/aminata_d`, { waitUntil: 'networkidle' });
  await pp.screenshot({ path: `${OUT}/shots/mobile-fr-profile.png`, fullPage: true });

  /* ---------------------------------------------------------------- 7. rate limits, deletion, existing site */
  const E = await member('ebou_f', 'Ebou F.');
  await age(E.username, 48);
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await call(E.ctx, 'POST', '/api/community/comments', { article: 'touba-hospitalite-logistique', body: `Remarque numéro ${i} sur la logistique.`, idempotencyKey: `rl-0000000${i}` })).status);
  check('Rate limiting stops rapid posting (7th comment in 10 minutes)', codes.slice(0, 6).every((c) => c === 200) && codes[6] === 429, codes.join(','));

  const delWrong = await call(C.ctx, 'DELETE', '/api/community/me', { confirmUsername: 'nobody' });
  const cComment = await call(C.ctx, 'POST', '/api/community/comments', { article: 'touba-hospitalite-logistique', body: 'Je vais supprimer mon compte.', idempotencyKey: 'bye-000000001' });
  const del = await call(C.ctx, 'DELETE', '/api/community/me', { confirmUsername: 'coumba_n' });
  const relog = await call(await newCtx(), 'POST', '/api/auth/sign-in/email', { email: 'coumba_n@example.test', password: PW });
  const after = (await call(fresh, 'GET', '/api/community/comments?article=touba-hospitalite-logistique')).data.comments.find((c) => c.id === cComment.data.id);
  const row = (await db.query('SELECT user_id FROM comment WHERE id = $1', [cComment.data.id])).rows[0];
  const profileGone = (await call(fresh, 'GET', '/api/community/users/coumba_n')).status;
  check('Account deletion: confirmation required, credentials gone, comments hidden as "deleted account", link kept internally', delWrong.status === 422 && del.status === 200 && relog.status !== 200 && after?.author.deleted && after.body === null && Boolean(row.user_id) && profileGone === 404, {
    wrong: delWrong.status, del: del.status, relog: relog.status, profile: profileGone,
  });

  for (const [n, path] of [['home', '/fr'], ['watch', '/en/watch'], ['live', '/ar/live'], ['programme', '/fr/watch/senegal-reel'], ['search', '/fr/search?q=dakar']]) {
    const p5 = await (await newCtx()).newPage();
    const r5 = await p5.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    check(`Existing page still works with the community on: ${n}`, r5.status() === 200 && (await p5.locator('h1, h2').count()) > 0);
  }
  const mails = (await db.query(`SELECT status, count(*)::int n FROM mail_outbox GROUP BY status`)).rows;
  check('The test environment never sends email: every message is captured', mails.every((m) => m.status === 'captured'), mails);
} catch (e) {
  check('Suite completed without crashing', false, String(e?.stack ?? e).slice(0, 600));
}

await browser.close();
await db.end();
writeFileSync(`${OUT}/acceptance.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
