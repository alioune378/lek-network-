import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { databaseUrl } from './config';

/** One pool per server instance, created on first use. Parameterised queries only. */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = databaseUrl();
    if (!connectionString) throw new Error('DATABASE_URL / NETLIFY_DB_URL is not set');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    // Managed Postgres (Netlify Database) requires TLS with certificate verification; local CI Postgres does not use TLS.
    // Serverless functions keep the pool small: one module-scope pool per instance, a few connections.
    pool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: local || /sslmode=disable/.test(connectionString) ? undefined : { rejectUnauthorized: true },
    });
  }
  return pool;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await getPool().query<T>(text, params);
  return r.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await getPool().connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
