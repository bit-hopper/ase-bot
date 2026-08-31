import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleDivine } from "../../src/commands/divine.js";
import { upsertUserProfile } from "../../src/profile/userProfileStore.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const DID = "did:plc:test-command-divine";

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
  await pool.end();
});

describe("handleDivine (§6.2/§7/§10.1 — formerly /reading)", () => {
  it("prompts /set when the user has no profile at all", async () => {
    const ctx = buildTestContext(pool, { did: DID });
    const [reply] = await handleDivine(ctx);
    expect(reply).toContain("/set sun");
  });

  it("produces a formatted reading once a profile is set", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "command" });
    const ctx = buildTestContext(pool, { did: DID });
    const thread = await handleDivine(ctx);

    expect(thread.length).toBeGreaterThan(0);
    expect(thread.join("\n")).toContain("TODAY'S CARD");
    expect(thread.join("\n")).toContain("Leo Sun");
  });
});
