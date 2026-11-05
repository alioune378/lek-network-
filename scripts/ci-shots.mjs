// Rendered checks for CI: screenshots (mobile + desktop), horizontal overflow, console errors,
// failed requests, RTL, language switching on an article, search and the mobile menu.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'ci-artifacts/shots';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', ''],
  ['article', '/article/dakar-espaces-publics'],
  ['category', '/category/all'],
  ['regions', '/regions'],
  ['search', '/search?q=dakar'],
  ['watch', '/watch'],
  ['programme', '/watch/senegal-reel'],
  ['live', '/live'],
  ['originals', '/originals'],
  ['studios', '/studios'],
  ['standards', '/standards'],
  ['newsroom', '/newsroom'],
];
const LOCALES = ['fr', 'en', 'ar'];
const VIEWPORTS = [
  ['mobile', { width: 390, height: 844 }],
  ['desktop', { width: 1440, height: 900 }],
];

const report = { pages: [], checks: {} };
const browser = await chromium.launch();

for (const [vp, size] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'fr-FR' });
  // Pre-set an explicit choice so the language suggestion banner does not cover the screenshots.
  await ctx.addInitScript(() => localStorage.setItem('lek-lang-choice', 'fr'));
  for (const l of LOCALES) {
    for (const [name, path] of PAGES) {
      if (vp === 'desktop' && l === 'ar' && !['home', 'article', 'watch'].includes(name)) continue;
      const page = await ctx.newPage();
      const errors = [];
      const failed = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
      const url = `${BASE}/${l}${path}`;
      const res = await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const info = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        h1: document.querySelector('h1')?.textContent?.trim().slice(0, 90) ?? null,
      }));
      const file = `${vp}-${l}-${name}.png`;
      await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
      report.pages.push({ vp, l, name, status: res?.status(), ...info, errors, failed, file });
      await page.close();
    }
  }
  await ctx.close();
}

// Interaction checks (mobile)
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
const p = await ctx.newPage();
await p.goto(`${BASE}/fr/article/dakar-espaces-publics`, { waitUntil: 'networkidle' });
report.checks.suggestionShown = await p.locator('.lang-suggest').isVisible().catch(() => false);
await p.screenshot({ path: `${OUT}/check-suggestion.png` });
await p.locator('.menu-btn').click();
await p.waitForTimeout(400);
report.checks.drawerOpen = await p.locator('#drawer.is-open').isVisible();
await p.screenshot({ path: `${OUT}/check-drawer.png` });
await p.locator('#drawer .lang-list button[lang="ar"]').click();
await p.waitForURL('**/ar/article/dakar-espaces-publics', { timeout: 10000 }).catch(() => undefined);
await p.waitForTimeout(500);
report.checks.switchKeepsArticle = p.url();
report.checks.arDir = await p.evaluate(() => document.documentElement.dir);
report.checks.arTitle = await p.locator('h1').textContent();
await p.goto(`${BASE}/ar/article/kaolack-terrains-talents`, { waitUntil: 'networkidle' });
report.checks.fallbackNotice = await p.locator('.notice').allTextContents();
await p.goto(`${BASE}/en/search?q=thies`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
report.checks.searchThies = await p.locator('.search-count').textContent();
await p.goto(`${BASE}/en/does-not-exist`, { waitUntil: 'networkidle' });
report.checks.notFoundH1 = await p.locator('h1').textContent();
await browser.close();

const bad = report.pages.filter((x) => x.overflow > 1 || x.errors.length || x.failed.length || (x.status ?? 0) >= 400);
writeFileSync('ci-artifacts/rendered-report.json', JSON.stringify(report, null, 2));
console.log(`pages checked: ${report.pages.length}, with problems: ${bad.length}`);
for (const b of bad) console.log('PROBLEM', b.vp, b.l, b.name, JSON.stringify({ status: b.status, overflow: b.overflow, errors: b.errors, failed: b.failed }));
console.log('checks', JSON.stringify(report.checks, null, 2));
