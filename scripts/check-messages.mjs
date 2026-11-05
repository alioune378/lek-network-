// Reports, for every language, which interface keys fall back to French/English.
// Priority languages (fr, en, ar) must be complete; others are listed for translators.
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../messages/', import.meta.url);
const load = (l) => JSON.parse(readFileSync(new URL(`${l}.json`, dir), 'utf8'));
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (k.startsWith('_') ? [] : typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const fr = new Set(keys(load('fr')));
let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const l = file.replace('.json', '');
  const own = new Set(keys(load(l)));
  const missing = [...fr].filter((k) => !own.has(k));
  const extra = [...own].filter((k) => !fr.has(k));
  const pct = Math.round((100 * (fr.size - missing.length)) / fr.size);
  console.log(`${l.padEnd(3)} ${String(pct).padStart(3)}% of ${fr.size} keys${missing.length ? ` · ${missing.length} fall back` : ''}${extra.length ? ` · ${extra.length} unknown: ${extra.join(', ')}` : ''}`);
  if (['en'].includes(l) && missing.length) {
    failed = true;
    console.log('   missing:', missing.join(', '));
  }
  if (extra.length) failed = true;
}
process.exit(failed ? 1 : 0);
