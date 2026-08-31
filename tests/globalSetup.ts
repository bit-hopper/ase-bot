import pg from "pg";
import { runMigrations } from "../src/db/migrate.js";
import { TEST_DATABASE_NAME } from "./testEnv.js";

/** Runs once before the whole test run (vitest `globalSetup`) — see testEnv.ts for why. */
export default async function setup(): Promise<void> {
  const testDbUrl = new URL(process.env.DATABASE_URL!);

  const adminUrl = new URL(testDbUrl);
  adminUrl.pathname = "/postgres"; // maintenance db all Postgres installs have, needed to run CREATE DATABASE
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DATABASE_NAME]);
    if (rows.length === 0) {
      // Identifier, not a value — can't be parameterized. Safe here: TEST_DATABASE_NAME is a
      // hardcoded constant, never user input.
      await admin.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
    }
  } finally {
    await admin.end();
  }

  await runMigrations(testDbUrl.toString());
}
