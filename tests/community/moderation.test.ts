import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, fingerprint, suggestNextStep } from '../../lib/community/moderation';
import { impersonates, validUsername } from '../../lib/community/names';

const base = { accountAgeMin: 60 * 24 * 30, ownDuplicates: 0, othersDuplicates: 0, recentViolations: 0 };
const run = (body: string, o: Partial<typeof base> = {}) => analyse({ body, ...base, ...o });

test('sharp political criticism is published, never flagged', () => {
  for (const body of [
    'Le ministre ment depuis des mois et devrait démissionner. Ce gouvernement a trahi ses électeurs.',
    'This president is incompetent and the opposition is no better. LËK is biased too, frankly.',
    'هذه الحكومة فاشلة ويجب محاسبة الوزير على قراراته.',
    'La rédaction de LËK se trompe complètement sur ce sujet, votre article est partial.',
    'Satire : bientôt un ministère du Bouchon pour gérer les embouteillages de Dakar.',
  ]) {
    const v = run(body);
    assert.equal(v.outcome, 'publish', body);
    assert.equal(v.signals.length, 0, body);
  }
});

test('explicit threats are held with critical severity (never auto-removed)', () => {
  for (const body of ['Je vais te retrouver et te tuer.', "I'm going to kill you", 'سأقتلك', 'Dinaa la rey']) {
    const v = run(body);
    assert.equal(v.outcome, 'hold', body);
    assert.equal(v.severity, 'critical', body);
  }
});

test('news vocabulary about violence is not a threat signal', () => {
  const v = run('Le procès porte sur une tentative de meurtre ; les témoins disent avoir eu peur pour leur vie.');
  assert.equal(v.outcome, 'publish');
});

test('private information is held for review', () => {
  assert.equal(run('Appelez-le au +221 77 123 45 67, il habite là.').outcome, 'hold');
  assert.equal(run('Son numéro : 77 123 45 67').outcome, 'hold');
  assert.equal(run('écrivez à quelqu.un@example.com').outcome, 'hold');
});

test('link floods and dangerous links are rejected; shorteners are held', () => {
  assert.equal(run('a http://a.sn b http://b.sn c http://c.sn d http://d.sn').outcome, 'reject');
  assert.equal(run('voir javascript:alert(1)').outcome, 'reject');
  assert.equal(run('voir http://192.168.1.4/x').outcome, 'reject');
  assert.equal(run('source : https://bit.ly/abc').outcome, 'hold');
  assert.equal(run('Source : https://www.ansd.sn/rapport').outcome, 'publish');
});

test('new accounts posting links are held; established ones are not', () => {
  assert.equal(run('Source : https://www.ansd.sn/rapport', { accountAgeMin: 10 }).outcome, 'hold');
});

test('duplicates: own flood rejected, coordinated duplicates held', () => {
  assert.equal(run('Votez pour nous', { ownDuplicates: 3 }).outcome, 'reject');
  assert.equal(run('Même message', { othersDuplicates: 2 }).outcome, 'hold');
  assert.equal(run('Merci pour cet article', { ownDuplicates: 1 }).outcome, 'publish');
});

test('promotion with links is held, mild promo alone is only a low signal', () => {
  const v = run('Gagnez des cadeaux, code promo LEK');
  assert.equal(v.outcome, 'publish');
  assert.ok(v.signals.some((s) => s.code === 'promotional'));
});

test('repeat offenders go to pre-moderation', () => {
  assert.equal(run('Bonjour', { recentViolations: 2 }).outcome, 'hold');
});

test('fingerprint ignores case, accents, punctuation and URLs', () => {
  assert.equal(fingerprint('Élection : VOTEZ !!! https://x.y/1'), fingerprint('election votez https://z.w/2'));
});

test('graduated ladder: proportional, skips for critical', () => {
  assert.equal(suggestNextStep([], 'low'), 'educational_notice');
  assert.equal(suggestNextStep(['educational_notice'], 'low'), 'warning');
  assert.equal(suggestNextStep(['warning'], 'medium'), 'remove_comment');
  assert.equal(suggestNextStep([], 'high'), 'remove_comment');
  assert.equal(suggestNextStep([], 'critical'), 'suspend');
  assert.equal(suggestNextStep(['suspend', 'restrict'], 'low'), 'escalate');
});

test('impersonation of the newsroom or staff is blocked in names', () => {
  for (const n of ['LEK', 'lek_officiel', 'L3K News', 'Rédaction LËK', 'admin', 'Moderateur', 'LËK Network']) assert.ok(impersonates(n), n);
  for (const n of ['aminata_d', 'Moussa Diop', 'leila', 'klek']) assert.ok(!impersonates(n), n);
  assert.ok(validUsername('aminata_d'));
  assert.ok(!validUsername('Aminata'));
  assert.ok(!validUsername('ab'));
});
