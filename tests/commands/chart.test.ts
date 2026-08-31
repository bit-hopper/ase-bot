import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleChart } from "../../src/commands/chart.js";
import { upsertUserProfile } from "../../src/profile/userProfileStore.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const DID = "did:plc:test-command-chart";
const ctx = buildTestContext(pool, { did: DID });

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.end();
});

describe("handleChart (§10.4)", () => {
  it("renders the stored placements and element balance", async () => {
    await upsertUserProfile(pool, DID, { sun: "aries", moon: "leo", rising: "sagittarius", profileSource: "command" });
    const [reply] = await handleChart(ctx);
    expect(reply).toContain("Aries");
    expect(reply).toContain("Dominant energy: Fire");
  });

  it("prompts /set when no profile exists", async () => {
    const [reply] = await handleChart(ctx);
    expect(reply).toContain("/set sun");
  });
});
