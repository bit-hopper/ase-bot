import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { getUserProfile, upsertUserProfile } from "../../src/profile/userProfileStore.js";

const pool = getPool();
const DID = "did:plc:test-user-profile-store";

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.end();
});

describe("getUserProfile", () => {
  it("returns null when no row exists", async () => {
    expect(await getUserProfile(pool, DID)).toBeNull();
  });
});

describe("upsertUserProfile (§3.4)", () => {
  it("inserts a new row with the given fields", async () => {
    const row = await upsertUserProfile(pool, DID, { sun: "leo", profileSource: "command" });
    expect(row.did).toBe(DID);
    expect(row.sun).toBe("leo");
    expect(row.moon).toBeNull();
    expect(row.profileSource).toBe("command");
  });

  it("merges a partial update, preserving fields not mentioned (§3.3 partial sets)", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", profileSource: "command" });
    const updated = await upsertUserProfile(pool, DID, { moon: "pisces" });

    expect(updated.sun).toBe("leo"); // preserved from the first call
    expect(updated.moon).toBe("pisces");
    expect(updated.profileSource).toBe("command"); // also preserved
  });

  it("lets a later update overwrite a previously-set field", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo" });
    const updated = await upsertUserProfile(pool, DID, { sun: "aries" });
    expect(updated.sun).toBe("aries");
  });

  it("round-trips through getUserProfile", async () => {
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "bio", bioRaw: "Leo Sun Pisces Moon" });
    const fetched = await getUserProfile(pool, DID);
    expect(fetched).toMatchObject({ sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "bio", bioRaw: "Leo Sun Pisces Moon" });
  });
});
