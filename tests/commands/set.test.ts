import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleSet } from "../../src/commands/set.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const ctx = buildTestContext(pool, { did: "did:plc:test-command-set" });

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.end();
});

describe("handleSet (§3.3/§4.3)", () => {
  it("confirms a valid single placement", async () => {
    const [reply] = await handleSet(ctx, "sun leo");
    expect(reply).toContain("Sun: Leo");
    expect(reply).toContain("✔️");
  });

  it("confirms multiple placements at once", async () => {
    const [reply] = await handleSet(ctx, "sun leo moon pisces rising sagittarius");
    expect(reply).toContain("Sun: Leo");
    expect(reply).toContain("Moon: Pisces");
    expect(reply).toContain("Rising: Sagittarius");
  });

  it("returns the usage string for empty args", async () => {
    const [reply] = await handleSet(ctx, "");
    expect(reply).toMatch(/Usage: \/set/);
  });

  it("returns an error message for an invalid sign, without storing anything", async () => {
    const [reply] = await handleSet(ctx, "sun bogus");
    expect(reply).toMatch(/Unknown sign/);
  });

  it("confirms valid placements alongside a warning for invalid ones in the same command", async () => {
    const [reply] = await handleSet(ctx, "sun leo moon bogus");
    expect(reply).toContain("Sun: Leo");
    expect(reply).toMatch(/⚠️.*Unknown sign/s);
  });

  it("calls writeAseRecord as a best-effort PDS write", async () => {
    let called = false;
    const ctxWithWriter = buildTestContext(pool, {
      did: "did:plc:test-command-set-writer",
      writeAseRecord: async () => {
        called = true;
      },
    });
    await handleSet(ctxWithWriter, "sun leo");
    expect(called).toBe(true);
  });
});
