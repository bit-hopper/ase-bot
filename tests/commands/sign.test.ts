import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleSign } from "../../src/commands/sign.js";
import { upsertUserProfile } from "../../src/profile/userProfileStore.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const DID = "did:plc:test-command-sign";
const ctx = buildTestContext(pool, { did: DID });

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.end();
});

describe("handleSign (§4.1)", () => {
  it("returns the stored sun sign with a keyword description", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", profileSource: "command" });
    const [reply] = await handleSign(ctx);
    expect(reply).toContain("Leo");
  });

  it("prompts /set when no profile exists", async () => {
    const [reply] = await handleSign(ctx);
    expect(reply).toContain("/set sun");
  });
});
