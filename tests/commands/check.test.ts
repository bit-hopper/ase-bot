import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleCheck } from "../../src/commands/check.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
// Fixed at testContext's default `now` (2026-08-28T12:00:00Z): Mercury is direct, Saturn is
// retrograde on this date — covers both branches without needing a second fixture date.
const ctx = buildTestContext(pool);

beforeEach(async () => {
  await pool.query("TRUNCATE ephemeris_cache");
});

afterAll(async () => {
  await pool.query("TRUNCATE ephemeris_cache");
  await pool.end();
});

describe("handleCheck (§4.1)", () => {
  it("returns the current sign, degree, and no retrograde marker for a direct planet", async () => {
    const [reply] = await handleCheck(ctx, "mercury");
    expect(reply).toContain("☿ Mercury · 5° Virgo");
    expect(reply).not.toContain("℞");
  });

  it("returns the retrograde marker and note for a planet currently retrograde", async () => {
    const [reply] = await handleCheck(ctx, "saturn");
    expect(reply).toContain("℞");
    expect(reply).toContain("Retrograde:");
  });

  it("is case-insensitive on the body argument", async () => {
    const [reply] = await handleCheck(ctx, "MERCURY");
    expect(reply).toContain("Mercury");
  });

  it("replies with the usage string for an invalid body", async () => {
    const [reply] = await handleCheck(ctx, "pizza");
    expect(reply).toContain("Try: /check");
  });

  it("replies with the usage string when no body is given", async () => {
    const [reply] = await handleCheck(ctx, "");
    expect(reply).toContain("Try: /check");
  });

  it("returns a threaded reply covering all 10 planets for 'all'", async () => {
    const reply = await handleCheck(ctx, "all");
    expect(reply.length).toBeGreaterThan(1);
    for (const post of reply) expect(fitsInOnePost(post)).toBe(true);

    const joined = reply.join("\n\n");
    expect(joined).toContain("☿ Mercury · 5° Virgo");
    expect(joined).toContain("♄ Saturn");
    expect(joined).toContain("℞");
  });

  it("is case-insensitive for 'all'", async () => {
    const reply = await handleCheck(ctx, "ALL");
    expect(reply.length).toBeGreaterThan(1);
  });

  it("returns only the retrograde planet(s) for 'retrograde'", async () => {
    const reply = await handleCheck(ctx, "retrograde");
    const joined = reply.join("\n\n");
    expect(joined).toContain("♄ Saturn");
    expect(joined).toContain("℞");
    expect(joined).not.toContain("Mercury");
    for (const post of reply) expect(fitsInOnePost(post)).toBe(true);
  });
});
