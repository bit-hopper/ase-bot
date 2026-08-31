/**
 * Tests share the same Postgres/Redis instances as local dev (see vitest.config.ts's original
 * comment on TRUNCATE-based cleanup), but must never share the same *database* — otherwise
 * every test file's TRUNCATE/flushdb wipes a live `npm start` bot's real data. This isolates
 * tests onto their own Postgres database and Redis logical DB, both derived from the same
 * connection strings dev already has in .env.
 */
export const TEST_DATABASE_NAME = "ase_test";
export const TEST_REDIS_DB_INDEX = 1;

export function deriveTestDatabaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}

export function deriveTestRedisUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${TEST_REDIS_DB_INDEX}`;
  return url.toString();
}
