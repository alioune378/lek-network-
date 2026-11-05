// Runs before `next build` on Netlify. When LËK Community is enabled (pilot/live) and a database is attached,
// applies migrations (Better Auth tables, then db/migrations/*.sql, each once). With the community off (public site
// today) it does nothing, so that build is unchanged.
import { execFileSync } from 'node:child_process';

const mode = process.env.COMMUNITY_MODE;
const db = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
if (mode !== 'pilot' && mode !== 'live' && mode !== 'demo') {
  console.log('[community] off: no migrations');
  process.exit(0);
}
if (!db) {
  console.error('[community] COMMUNITY_MODE is set but no database is attached (NETLIFY_DB_URL / DATABASE_URL). Failing the build.');
  process.exit(1);
}
if (mode === 'demo' && process.env.NETLIFY === 'true') {
  console.error('[community] demo mode is for CI only, not for Netlify deploys. Use COMMUNITY_MODE=pilot on staging.');
  process.exit(1);
}
if (process.env.NETLIFY === 'true' && (process.env.MAIL_CAPTURE === '1' || process.env.TEST_MAIL_TOKEN)) {
  console.error('[community] MAIL_CAPTURE / TEST_MAIL_TOKEN are CI-only and must not be set on a Netlify site. Failing the build.');
  process.exit(1);
}
execFileSync('npx', ['tsx', 'scripts/community/migrate.mjs'], { stdio: 'inherit' });
