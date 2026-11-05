// Grants (or revokes) professional verification. Operator tool, run against the database directly.
// Break-glass founder recovery: `owner` restores the founder role if the owner account is locked out (requires direct database access).
// Usage: node --experimental-strip-types scripts/community/grant-staff.mjs <username> <journalist|editor|moderator|admin|owner|revoke> "<title>"
import { getPool } from '../../lib/community/db.ts';

const [username, role, title = 'Rédaction LËK'] = process.argv.slice(2);
if (!username || !role) {
  console.error('usage: grant-staff.mjs <username> <role|revoke> "<title>"');
  process.exit(1);
}
const pool = getPool();
const u = await pool.query('SELECT id FROM "user" WHERE username = $1', [username.toLowerCase()]);
if (!u.rowCount) {
  console.error('no such user');
  process.exit(1);
}
const id = u.rows[0].id;
if (role === 'revoke') {
  await pool.query('DELETE FROM staff WHERE user_id = $1', [id]);
  await pool.query(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES (NULL, $1, 'revoke_staff', 'Revoked by operator script')`, [id]);
} else {
  if (!['journalist', 'editor', 'moderator', 'admin', 'owner'].includes(role)) throw new Error('bad role');
  await pool.query(`INSERT INTO staff (user_id, role, title) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, title = EXCLUDED.title, verified_at = now()`, [id, role, title]);
  await pool.query(`INSERT INTO moderation_action (actor_id, target_user_id, action, reason) VALUES (NULL, $1, 'grant_staff', $2)`, [id, `Granted ${role} by operator script`]);
}
console.log('ok', username, role);
await pool.end();
