// Applies the database schema: Better Auth's tables first (its own migration tool), then LËK's SQL files in order.
// Usage: DATABASE_URL=... BETTER_AUTH_SECRET=... node --experimental-strip-types scripts/community/migrate.mjs
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getMigrations } from 'better-auth/db/migration';
import { getAuth } from '../../lib/community/auth.ts';
import { getPool } from '../../lib/community/db.ts';

const auth = getAuth();
const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
console.log('better-auth: create', toBeCreated.map((t) => t.table), 'add', toBeAdded.map((t) => t.table));
await runMigrations();

const pool = getPool();
await pool.query('CREATE TABLE IF NOT EXISTS community_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
const dir = path.resolve('db/migrations');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const done = await pool.query('SELECT 1 FROM community_migrations WHERE name = $1', [f]);
  if (done.rowCount) continue;
  const sql = readFileSync(path.join(dir, f), 'utf8');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query('INSERT INTO community_migrations (name) VALUES ($1)', [f]);
    await c.query('COMMIT');
    console.log('applied', f);
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
await pool.end();
