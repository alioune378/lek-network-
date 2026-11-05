// Searches Wikimedia Commons for freely licensed photographs for each editorial slot,
// downloads candidates with their credit metadata, and builds a numbered contact sheet.
// Runs in GitHub Actions (open network). Nothing here is used by the site at runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'LEK-Network-prototype-media/1.0 (https://github.com/alioune378/lek-network-)';
const OUT = process.argv[2] ?? 'media-candidates';
const PER_SLOT = 10;
const FREE = /^(cc0|cc[ -]by(-sa)?[ -]?[0-9.]*|cc[ -]by[ -][0-9.]+|public domain|pd\b|pd-)/i;
const BAD = /\b(nc|nd)\b|non[- ]?commercial|no[- ]?deriv/i;
const AI = /ai[- ]generated|midjourney|dall[- ·]?e|stable diffusion|generative ai|artificial intelligence generated/i;
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function search(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '30',
    gsrsearch: `${q} filetype:bitmap`, prop: 'imageinfo|categories', cllimit: '50',
    iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1800',
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) return [];
  const j = await r.json();
  return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index);
}

const slots = JSON.parse(await fs.readFile(new URL('./slots.json', import.meta.url)));
const all = {};
for (const [slot, queries] of Object.entries(slots)) {
  const dir = path.join(OUT, slot);
  await fs.mkdir(dir, { recursive: true });
  const picked = [];
  const seen = new Set();
  for (const q of queries) {
    for (const p of await search(q)) {
      if (picked.length >= PER_SLOT) break;
      const ii = p.imageinfo?.[0];
      if (!ii || seen.has(p.title)) continue;
      seen.add(p.title);
      const m = ii.extmetadata ?? {};
      const lic = strip(m.LicenseShortName?.value);
      const cats = (p.categories ?? []).map((c) => c.title).join(' ') + ' ' + strip(m.Categories?.value);
      const desc = strip(m.ImageDescription?.value);
      if (!/jpe?g/i.test(ii.mime) || ii.width < 1400 || ii.height < 800) continue;
      if (!FREE.test(lic) || BAD.test(lic)) continue;
      if (AI.test(cats) || AI.test(desc) || AI.test(p.title)) continue;
      const n = picked.length + 1;
      const file = `${String(n).padStart(2, '0')}.jpg`;
      const img = await fetch(ii.thumburl ?? ii.url, { headers: { 'User-Agent': UA } });
      if (!img.ok) continue;
      await fs.writeFile(path.join(dir, file), Buffer.from(await img.arrayBuffer()));
      picked.push({
        n, file, query: q, title: p.title, page: ii.descriptionurl,
        author: strip(m.Artist?.value), license: lic, licenseUrl: m.LicenseUrl?.value ?? null,
        credit: strip(m.Credit?.value), date: strip(m.DateTimeOriginal?.value), description: desc.slice(0, 400),
        width: ii.width, height: ii.height,
      });
    }
  }
  all[slot] = picked;
  // contact sheet: 5 columns, numbered
  const W = 300, H = 200;
  const tiles = await Promise.all(picked.map(async (c) => {
    const base = await sharp(path.join(dir, c.file)).resize(W, H, { fit: 'cover' }).toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="${H}"><rect width="44" height="34" fill="#000"/><text x="8" y="25" font-size="22" font-family="sans-serif" fill="#fff">${c.n}</text></svg>`);
    return sharp(base).composite([{ input: label, top: 0, left: 0 }]).toBuffer();
  }));
  if (tiles.length) {
    const cols = 5, rows = Math.ceil(tiles.length / cols);
    await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: '#222' } })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
      .jpeg({ quality: 80 }).toFile(path.join(OUT, `_sheet-${slot}.jpg`));
  }
  console.log(slot, picked.length);
}
await fs.writeFile(path.join(OUT, 'candidates.json'), JSON.stringify(all, null, 2));
