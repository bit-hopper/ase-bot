import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { deriveTestDatabaseUrl, deriveTestRedisUrl } from "./tests/testEnv.js";

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(".env");

// Route the whole test run onto its own Postgres database and Redis logical DB — see
// tests/testEnv.ts. Must happen before any test file (or globalSetup) reads these.
process.env.DATABASE_URL = deriveTestDatabaseUrl(process.env.DATABASE_URL!);
process.env.REDIS_URL = deriveTestRedisUrl(process.env.REDIS_URL!);

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    // Several test files share the same real local Postgres instance and TRUNCATE shared
    // tables in beforeEach — running files in parallel workers lets one file's truncate
    // wipe another's in-flight test data. Serialize file execution to avoid that race.
    fileParallelism: false,
  },
});
