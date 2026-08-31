import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { handleCommand } from "../../src/commands/router.js";
import { upsertUserProfile } from "../../src/profile/userProfileStore.js";
import { buildTestContext } from "./testContext.js";

const pool = getPool();
const DID = "did:plc:test-command-router";
const ctx = buildTestContext(pool, { did: DID });

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
  await pool.end();
});

describe("handleCommand router (§4.3)", () => {
  it("routes /help to the quick help reply", async () => {
    const thread = await handleCommand(ctx, "/help");
    expect(thread.join("\n")).toContain("Asé");
    expect(thread).toHaveLength(1);
  });

  it("routes /help list-all to the full command reference", async () => {
    const thread = await handleCommand(ctx, "/help list-all");
    expect(thread.join("\n")).toContain("/pull");
    expect(thread.length).toBeGreaterThan(1);
  });

  it("routes an unrecognized command to /help (§4.3)", async () => {
    const thread = await handleCommand(ctx, "/bogus");
    expect(thread.join("\n")).toContain("Asé");
  });

  it("routes text with no command token at all to /help (§4.3)", async () => {
    const thread = await handleCommand(ctx, "hi Asé what's up");
    expect(thread.join("\n")).toContain("Asé");
  });

  it("routes /sign to the sign handler", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", profileSource: "command" });
    const thread = await handleCommand(ctx, "/sign");
    expect(thread.join("\n")).toContain("Leo");
  });

  it("routes /set to the set handler", async () => {
    const thread = await handleCommand(ctx, "/set sun aries");
    expect(thread.join("\n")).toContain("Aries");
  });

  it("is case-insensitive at the router level too", async () => {
    const thread = await handleCommand(ctx, "/HELP");
    expect(thread.join("\n")).toContain("Asé");
  });

  it("routes /divine to the renamed original /reading engine", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "command" });
    const thread = await handleCommand(ctx, "/divine");
    expect(thread.join("\n")).toContain("TODAY'S CARD");
  });

  it("routes /reading to the new Big Three engine", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "command" });
    const thread = await handleCommand(ctx, "/reading");
    expect(thread.join("\n")).toContain("THEME");
  });
});
