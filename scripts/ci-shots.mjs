// Rendered checks for CI.
// - Full-page screenshots at 390px and 1440px (FR, EN, AR), after scrolling so lazy images load.
// - Overflow audit at 320, 375, 390, 430, 768 and 1440px for every page in FR, EN and AR.
// - Broken images, console errors, failed requests, RTL, logo, menu open/close and focus,
//   language switching, search, sticky-header anchor offset, reduced motion, 404.
// Exits with code 1 if any problem is found, so the CI status tells the truth.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'ci-artifacts/shots';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', ''],
  ['article', '/article/dakar-espaces-publics'],
  ['article-cover', '/article/technologie-sans-jargon'],
  ['category', '/category/all'],
  ['regions', '/regions'],
  ['region', '/region/saint-louis'],
  ['search', '/search?q=dakar'],
  ['watch', '/watch'],
  ['programme', '/watch/senegal-reel'],
  ['live', '/live'],
  ['originals', '/originals'],
  ['studios', '/studios'],
  ['standards', '/standards'],
  ['privacy', '/privacy'],
  ['credits', '/credits'],
  ['newsroom', '/newsroom'],
];
const LOCALES = ['fr', 'en', 'ar'];
const SHOT_VIEWPORTS = [
  ['mobile', { width: 390, height: 844 }],
  ['desktop', { width: 1440, height: 900 }],
];
const AUDIT_WIDTHS = [320, 375, 430, 768];

const report = { pages: [], audit: [], checks: {} };
const problems = [];
const browser = await chromium.launch();

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(250);
}

const inspect = (page) =>
  page.evaluate(() => {
    const over = document.documentElement.scrollWidth - window.innerWidth;
    const imgs = [...document.images];
    return {
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      overflow: over,
      offenders:
        over > 1
          ? [...document.querySelectorAll('body *')]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && !el.closest('.poster-rail, .chips, .drawer');
              })
              .slice(0, 6)
              .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`)
          : [],
      images: imgs.length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 90) ?? null,
    };
  });

function track(page) {
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
  return { errors, failed };
}

// ---------------------------------------------------------------- screenshots (390 + 1440)
for (const [vp, size] of SHOT_VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'fr-FR' });
  // Pre-set an explicit choice so the language suggestion banner does not cover the screenshots.
  await ctx.addInitScript(() => localStorage.setItem('lek-lang-choice', 'fr'));
  for (const l of LOCALES) {
    for (const [name, path] of PAGES) {
      if (vp === 'desktop' && l === 'ar' && !['home', 'article', 'watch', 'region', 'studios'].includes(name)) continue;
      const page = await ctx.newPage();
      const { errors, failed } = track(page);
      const res = await page.goto(`${BASE}/${l}${path}`, { waitUntil: 'networkidle' });
      await scrollThrough(page);
      const info = await inspect(page);
      const file = `${vp}-${l}-${name}.png`;
      await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
      const row = { vp, width: size.width, l, name, status: res?.status(), ...info, errors, failed, file };
      report.pages.push(row);
      if (row.overflow > 1 || errors.length || failed.length || (row.status ?? 0) >= 400 || info.broken.length) problems.push(row);
      await page.close();
    }
  }
  await ctx.close();
}

// ---------------------------------------------------------------- overflow audit (320 / 375 / 430 / 768)
for (const w of AUDIT_WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem('lek-lang-choice', 'fr'));
  for (const l of LOCALES) {
    for (const [name, path] of PAGES) {
      const page = await ctx.newPage();
      const { errors, failed } = track(page);
      const res = await page.goto(`${BASE}/${l}${path}`, { waitUntil: 'networkidle' });
      await scrollThrough(page);
      const info = await inspect(page);
      const row = { width: w, l, name, status: res?.status(), overflow: info.overflow, offenders: info.offenders, broken: info.broken, errors, failed };
      report.audit.push(row);
      if (info.overflow > 1 || errors.length || failed.length || info.broken.length || (row.status ?? 0) >= 400) problems.push({ vp: `w${w}`, ...row });
      if (name === 'home' && (w === 320 || w === 768)) await page.screenshot({ path: `${OUT}/w${w}-${l}-home-top.png` });
      await page.close();
    }
  }
  await ctx.close();
}

// ---------------------------------------------------------------- interaction checks (mobile)
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
const p = await ctx.newPage();
await p.goto(`${BASE}/fr/article/dakar-espaces-publics`, { waitUntil: 'networkidle' });
report.checks.suggestionShown = await p.locator('.lang-suggest').isVisible().catch(() => false);
await p.screenshot({ path: `${OUT}/check-suggestion.png` });

// logo: loads, not clipped (rendered box keeps the file's aspect ratio)
report.checks.logo = await p.evaluate(() => {
  const i = document.querySelector('.brand-logo');
  if (!i) return null;
  const r = i.getBoundingClientRect();
  return { loaded: i.complete && i.naturalWidth > 0, width: Math.round(r.width), height: Math.round(r.height), ratio: +(r.width / r.height).toFixed(2) };
});

// menu: opens, locks page scroll, moves focus inside, closes with Escape and returns focus
await p.locator('.menu-btn').click();
await p.waitForTimeout(450);
report.checks.drawer = await p.evaluate(() => {
  const d = document.getElementById('drawer');
  const sc = d?.querySelector('.drawer-scroll');
  return {
    open: d?.classList.contains('is-open'),
    pageLocked: document.documentElement.classList.contains('drawer-open'),
    focusInside: d?.contains(document.activeElement) ?? false,
    contained: sc ? getComputedStyle(sc).overscrollBehaviorY : null,
    primaryLinks: d?.querySelectorAll('.drawer-primary a').length,
    newsroomInMenu: Boolean(d?.querySelector('a[href*="newsroom"]')),
    smallestTarget: Math.min(...[...(d?.querySelectorAll('a, button, input') ?? [])].map((e) => e.getBoundingClientRect().height).filter((h) => h > 0)),
  };
});
await p.screenshot({ path: `${OUT}/check-drawer.png` });
await p.keyboard.press('Escape');
await p.waitForTimeout(450);
report.checks.drawerClosed = await p.evaluate(() => ({
  closed: !document.getElementById('drawer')?.classList.contains('is-open'),
  focusBack: document.activeElement?.classList.contains('menu-btn') ?? false,
  pageUnlocked: !document.documentElement.classList.contains('drawer-open'),
}));

// language switch from the menu keeps the article
await p.locator('.menu-btn').click();
await p.waitForTimeout(450);
await p.locator('#drawer .lang-list button[lang="ar"]').click();
await p.waitForURL('**/ar/article/dakar-espaces-publics', { timeout: 10000 }).catch(() => undefined);
await p.waitForTimeout(500);
report.checks.switchKeepsArticle = p.url();
report.checks.arDir = await p.evaluate(() => document.documentElement.dir);
report.checks.arTitle = await p.locator('h1').textContent();
await p.locator('.menu-btn').click();
await p.waitForTimeout(450);
await p.screenshot({ path: `${OUT}/check-drawer-ar.png` });
await p.keyboard.press('Escape');

await p.goto(`${BASE}/ar/article/kaolack-terrains-talents`, { waitUntil: 'networkidle' });
report.checks.fallbackNotice = await p.locator('.notice').allTextContents();
report.checks.photoCaption = await p.locator('.photo-cap').first().textContent().catch(() => null);
await p.goto(`${BASE}/en/search?q=thies`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
report.checks.searchThies = await p.locator('.search-count').textContent();
await p.goto(`${BASE}/en/search?q=saint-louis`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
report.checks.searchSaintLouis = await p.locator('.search-count').textContent();

// anchor target not hidden under the sticky header
await p.goto(`${BASE}/en/standards#contact`, { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
report.checks.anchorClear = await p.evaluate(() => {
  const h = document.querySelector('.masthead')?.getBoundingClientRect().bottom ?? 0;
  const t = document.getElementById('contact')?.getBoundingClientRect().top ?? 0;
  return { headerBottom: Math.round(h), targetTop: Math.round(t), ok: t >= h - 1 };
});

// desktop language popover keeps the page
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(`${BASE}/en/watch/senegal-reel`, { waitUntil: 'networkidle' });
await p.locator('.masthead .lang-btn').click();
await p.locator('.lang-pop button[lang="fr"]').click();
await p.waitForURL('**/fr/watch/senegal-reel', { timeout: 10000 }).catch(() => undefined);
report.checks.desktopSwitch = p.url();

await p.goto(`${BASE}/en/does-not-exist`, { waitUntil: 'networkidle' });
report.checks.notFoundH1 = await p.locator('h1').textContent();
await ctx.close();

// reduced motion: transitions and animations are switched off
const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const q = await rm.newPage();
await q.goto(`${BASE}/fr`, { waitUntil: 'networkidle' });
report.checks.reducedMotion = await q.evaluate(() => {
  const d = document.getElementById('drawer');
  const img = document.querySelector('.sc-media img');
  return { drawerTransition: d ? getComputedStyle(d).transitionDuration : null, imageTransition: img ? getComputedStyle(img).transitionDuration : null };
});
await q.goto(`${BASE}/fr/live`, { waitUntil: 'networkidle' });
report.checks.identReduced = await q.evaluate(() => ({
  present: Boolean(document.querySelector('.ident svg')),
  playing: Boolean(document.querySelector('.ident.is-playing')),
  replayButton: Boolean(document.querySelector('.ident-replay')),
}));
await rm.close();

// ident plays on the Live page with motion allowed; brand video files are served
const mv = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const v = await mv.newPage();
await v.goto(`${BASE}/en/live`, { waitUntil: 'networkidle' });
await v.waitForTimeout(1800);
await v.screenshot({ path: `${OUT}/check-ident-mid.png` });
report.checks.identPlays = await v.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'finished').length);
await v.waitForTimeout(5000);
await v.screenshot({ path: `${OUT}/check-ident-end.png` });
report.checks.motionFiles = {};
for (const f of ['lek-ident-720p.mp4', 'lek-ident-16x9.mp4', 'lek-ident-end.webp']) {
  const r = await v.request.get(`${BASE}/media/motion/${f}`);
  report.checks.motionFiles[f] = r.status();
}
await mv.close();
await browser.close();

const c = report.checks;
const checkFail = [];
if (!c.logo?.loaded || Math.abs((c.logo?.ratio ?? 0) - 2.43) > 0.05) checkFail.push('logo');
if (!c.drawer?.open || !c.drawer?.pageLocked || !c.drawer?.focusInside || c.drawer?.newsroomInMenu || c.drawer?.contained !== 'contain') checkFail.push('drawer');
if (!c.drawerClosed?.closed || !c.drawerClosed?.focusBack || !c.drawerClosed?.pageUnlocked) checkFail.push('drawer-close');
if (!String(c.switchKeepsArticle).endsWith('/ar/article/dakar-espaces-publics') || c.arDir !== 'rtl') checkFail.push('language-switch');
if (!String(c.desktopSwitch).endsWith('/fr/watch/senegal-reel')) checkFail.push('desktop-language-switch');
if (!c.anchorClear?.ok) checkFail.push('anchor-under-header');
if (!/^0s/.test(c.reducedMotion?.drawerTransition ?? '') && c.reducedMotion?.drawerTransition !== '0s') checkFail.push('reduced-motion');
if (!c.identReduced?.present || c.identReduced?.playing || c.identReduced?.replayButton) checkFail.push('ident-reduced-motion');
if (!(c.identPlays > 0)) checkFail.push('ident-play');
if (Object.values(c.motionFiles ?? {}).some((x) => x !== 200)) checkFail.push('motion-files');
report.checks.failed = checkFail;

writeFileSync('ci-artifacts/rendered-report.json', JSON.stringify(report, null, 2));
console.log(`screenshots: ${report.pages.length}, audited: ${report.audit.length}, page problems: ${problems.length}, failed checks: ${checkFail.join(', ') || 'none'}`);
for (const b of problems) console.log('PROBLEM', b.vp, b.l, b.name, JSON.stringify({ status: b.status, overflow: b.overflow, offenders: b.offenders, broken: b.broken, errors: b.errors, failed: b.failed }));
console.log('checks', JSON.stringify(report.checks, null, 2));
if (problems.length || checkFail.length) process.exit(1);
