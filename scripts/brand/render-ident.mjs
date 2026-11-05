// Renders the LËK ident (lib/ident.ts + components/ident.css) to video.
// Usage: node --experimental-strip-types scripts/brand/render-ident.mjs <outDir> [fps] [--frames-only]
// Steps every CSS animation frame by frame (deterministic, no screen recording), then encodes with ffmpeg:
//   lek-ident-16x9.mp4 (1920×1080, H.264, silent) and lek-ident-end.webp / .png (final frame).
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';
import { identSvg } from '../../lib/ident.ts';

const out = path.resolve(process.argv[2] ?? 'ident-out');
const fps = Number(process.argv[3] ?? 30);
const framesOnly = process.argv.includes('--frames-only');
const DURATION = 6.0;
const frames = path.join(out, 'frames');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const css = readFileSync(new URL('../../components/ident.css', import.meta.url), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,6..72,400&display=block" rel="stylesheet">
<style>html,body{margin:0;background:#0b0f1a}:root{--font-serif:'Newsreader'}.ident{width:1920px}${css}</style></head>
<body><div class="ident is-playing">${identSvg({ id: 'r', tagline: 'Toujours un temps d’avance.', label: 'LËK Network' })}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
const n = Math.round(DURATION * fps);
for (let i = 0; i <= n; i++) {
  const t = (i / fps) * 1000;
  await page.evaluate((ms) => document.getAnimations().forEach((a) => (a.currentTime = ms)), t);
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, '0')}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}
await browser.close();
const last = path.join(frames, `f${String(n).padStart(4, '0')}.png`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', last, path.join(out, 'lek-ident-end.png')]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', last, '-vf', 'scale=1280:-2', '-quality', '82', path.join(out, 'lek-ident-end.webp')]);
if (!framesOnly) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'lek-ident-16x9.mp4')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'lek-ident-16x9.mp4'), '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'lek-ident-720p.mp4')]);
}
console.log(`rendered ${n + 1} frames at ${fps} fps to ${out}`);
