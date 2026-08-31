import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handlePull } from "../../src/commands/pull.js";
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

describe("handlePull (§6.4/§9.4/§10.2)", () => {
  it("draws a card and returns a formatted reply", async () => {
    const thread = await handlePull(ctx, "");
    expect(thread.length).toBeGreaterThan(0);
    expect(thread[0]).toContain("🔮");
  });

  it("rejects v2 arguments like /pull 3", async () => {
    const [reply] = await handlePull(ctx, "3");
    expect(reply).toMatch(/doesn't take any arguments/);
  });

  it("draws different cards across repeated calls (true randomness, §6.4)", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const [reply] = await handlePull(ctx, "");
      seen.add(reply!);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
