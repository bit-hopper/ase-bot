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

  it("appends 'exact today' when the notable phase's exact instant falls on the same UTC date", async () => {
    // ctx's fixed `now` (2026-08-28T12:00:00Z) is a full moon whose exact opposition (~04:18 UTC
    // that same day) already passed a few hours earlier — same calendar day either way.
    const [reply] = await handleMoon(ctx);
    expect(reply).toContain("Full Moon (exact today)");
  });

  it("appends an 'exact in ...' countdown for a notable phase still approaching its exact instant", async () => {
    const approachingCtx = { ...ctx, now: new Date("2026-08-27T20:00:00Z") }; // ~8h before, previous UTC day
    const [reply] = await handleMoon(approachingCtx);
    expect(reply).toMatch(/Full Moon \(exact in \d+h\)/);
  });

  it("appends an 'exact ... ago' countdown for a notable phase whose exact instant already passed", async () => {
    const pastCtx = { ...ctx, now: new Date("2026-08-30T00:00:00Z") }; // ~2 days after that full moon
    const [reply] = await handleMoon(pastCtx);
    expect(reply).toMatch(/Full Moon \(exact \d+d \d+h ago\)/);
  });

  it("does not append a countdown for a non-notable phase", async () => {
    // A few days after full moon, still waning but well outside the full-moon band.
    const gibbousCtx = { ...ctx, now: new Date("2026-09-01T00:00:00Z") };
    const [reply] = await handleMoon(gibbousCtx);
    expect(reply).not.toContain("(exact");
  });
});
