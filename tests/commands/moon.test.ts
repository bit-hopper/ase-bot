import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleMoon } from "../../src/commands/moon.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const ctx = buildTestContext(pool);

beforeEach(async () => {
  await pool.query("TRUNCATE ephemeris_cache");
});

afterAll(async () => {
  await pool.query("TRUNCATE ephemeris_cache");
  await pool.end();
});

describe("handleMoon (§10.5)", () => {
  it("returns the current moon sign and phase with an interpretation", async () => {
    const [reply] = await handleMoon(ctx);
    expect(reply).toContain("🌙 Moon in");
    expect(reply!.split("\n\n")).toHaveLength(2);
  });
});
