import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleReading } from "../../src/commands/reading.js";
import { upsertUserProfile } from "../../src/profile/userProfileStore.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const DID = "did:plc:test-command-reading-v2";

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
  await pool.end();
});

describe("handleReading (Big Three /reading, spec §6.7-6.9)", () => {
  it("prompts /set (or an inline sign) when there's no profile and no override args", async () => {
    const ctx = buildTestContext(pool, { did: DID });
    const [reply] = await handleReading(ctx, "");
    expect(reply).toContain("/set sun");
  });

  it("produces a THEME/MOOD/GROUND reading once a profile is set", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "command" });
    const ctx = buildTestContext(pool, { did: DID });
    const thread = await handleReading(ctx, "");
    const full = thread.join("\n");

    expect(full).toContain("THEME");
    expect(full).toContain("MOOD");
    expect(full).toContain("GROUND");
    expect(full).toContain("Leo Sun");
  });

  it("accepts inline placement overrides with no stored profile at all", async () => {
    const ctx = buildTestContext(pool, { did: DID });
    const thread = await handleReading(ctx, "sun libra moon pisces rising aquarius");
    const full = thread.join("\n");

    expect(full).toContain("Libra Sun");
    expect(full).toContain("Pisces Moon");
    expect(full).toContain("Aquarius Rising");
  });

  it("inline overrides win over the stored profile for that single call, without persisting", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", profileSource: "command" });
    const ctx = buildTestContext(pool, { did: DID });

    const overridden = await handleReading(ctx, "sun libra");
    expect(overridden.join("\n")).toContain("Libra Sun");

    const plain = await handleReading(ctx, "");
    expect(plain.join("\n")).toContain("Leo Sun");
    expect(plain.join("\n")).not.toContain("Libra Sun");
  });

  it("merges a partial inline override with the rest of the stored profile", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "command" });
    const ctx = buildTestContext(pool, { did: DID });
    const full = (await handleReading(ctx, "moon cancer")).join("\n");

    expect(full).toContain("Leo Sun");
    expect(full).toContain("Cancer Moon");
    expect(full).toContain("Sagittarius Rising");
  });

  it("rejects malformed inline args with a helpful error instead of a partial reading", async () => {
    const ctx = buildTestContext(pool, { did: DID });
    const [reply] = await handleReading(ctx, "sun banana");
    expect(reply).toMatch(/Couldn't read that/);
  });
});
