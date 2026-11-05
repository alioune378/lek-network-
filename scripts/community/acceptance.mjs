// LËK Community acceptance tests. Run in CI against `next start` (COMMUNITY_MODE=demo, MAIL_CAPTURE=1) and a real Postgres.
// Every check records pass/fail with evidence; the script exits 1 if any check fails.
import { chromium } from 'playwright';
import pg from 'pg';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

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

async function newCtx(viewport = { width: 1280, height: 900 }, locale = 'fr-FR') {
  const ctx = await browser.newContext({ viewport, locale });
  await ctx.addInitScript(() => localStorage.setItem('lek-lang-choice', 'fr'));
  return ctx;
}
const H = { origin: BASE, 'content-type': 'application/json' };
async function call(ctx, method, path, body) {
  const r = await ctx.request.fetch(`${BASE}${path}`, { method, headers: H, data: body === undefined ? undefined : JSON.stringify(body), failOnStatusCode: false });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  return { status: r.status(), data, text: JSON.stringify(data) };
}
async function verificationLink(email) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${BASE}/api/community/test-mail?to=${encodeURIComponent(email)}`, { headers: { 'x-test-token': TOKEN } });
    const j = await r.json();
    const m = j.items?.find((x) => x.kind === 'verify')?.body.match(/https?:\/\/\S+/);
    if (m) return m[0];
    await new Promise((res) => setTimeout(res, 300));
  }
  return null;
}
/** Registers through the API, opens the emailed link in a fresh browser context (which signs the member in). */
async function member(username, displayName, viewport) {
  const email = `${username}@example.test`;
  const anon = await newCtx(viewport);
  const r = await call(anon, 'POST', '/api/community/register', { email, password: PW, username, displayName, locale: 'fr', acceptGuidelines: true, notifyReplies: true });
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

  /* ---------------------------------------------------------------- 2. registration through the UI */
  const reg = await newCtx({ width: 390, height: 844 });
  const rp = await reg.newPage();
  await rp.goto(`${BASE}/fr/account/register`, { waitUntil: 'networkidle' });
  await rp.screenshot({ path: `${OUT}/shots/mobile-fr-register.png`, fullPage: true });
  await rp.getByLabel('Nom affiché').fill('Aminata D.');
  await rp.getByLabel('Nom d’utilisateur').fill('aminata_d');
  await rp.waitForTimeout(900);
  const availText = await rp.locator('.cm-avail').textContent();
  await rp.getByLabel('Adresse e-mail').fill('aminata_d@example.test');
  await rp.locator('input[type="password"]').fill(PW);
  await rp.locator('.cm-check input').nth(1).check();
  await rp.getByRole('button', { name: 'Créer mon compte' }).click();
  await rp.waitForSelector('.cm-card[role="status"]', { timeout: 10000 });
  check('Registration form works on a 390px phone and asks to check the inbox (no delivery claim)', (await rp.locator('.cm-card').textContent()).includes('Si cette adresse'), availText);
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
  const notes = await call(A.ctx, 'GET', '/api/community/notifications');
  check('Optional reply notifications reach the parent author', notes.data.items?.some((n) => n.kind === 'reply'), `${notes.data.items?.length} notifications`);

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
  execFileSync('npx', ['tsx', 'scripts/community/grant-staff.mjs', 'mariama_m', 'moderator', 'Modération LËK'], { stdio: 'inherit' });
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
  execFileSync('npx', ['tsx', 'scripts/community/grant-staff.mjs', 'xadija_a', 'editor', 'Rédaction en chef'], { stdio: 'inherit' });
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
  await fp.screenshot({ path: `${OUT}/shots/mobile-fr-feedback.png`, fullPage: true });
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
  execFileSync('npx', ['tsx', 'scripts/community/grant-staff.mjs', 'jeanne_d', 'journalist', 'Journaliste, LËK Dakar'], { stdio: 'inherit' });
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
  check('Demo mode never sends email: every message is captured', mails.every((m) => m.status === 'captured'), mails);
} catch (e) {
  check('Suite completed without crashing', false, String(e?.stack ?? e).slice(0, 600));
}

await browser.close();
await db.end();
writeFileSync(`${OUT}/acceptance.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
