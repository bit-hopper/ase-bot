import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { hashBio } from "../../src/profile/bioHash.js";
import { resolveProfile } from "../../src/profile/profileResolver.js";
import { getUserProfile, upsertUserProfile } from "../../src/profile/userProfileStore.js";

const pool = getPool();
const DID = "did:plc:test-profile-resolver";

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.end();
});

describe("resolveProfile priority chain (§3.1)", () => {
  it("1. prefers the ase_record over everything else", async () => {
    await upsertUserProfile(pool, DID, { sun: "aries", profileSource: "command" });

    const result = await resolveProfile(pool, DID, {
      fetchAseRecord: async () => ({ sunSign: "leo", moonSign: "pisces" }),
      fetchBio: async () => ({ bioRaw: "Cancer Sun" }),
    });

    expect(result.source).toBe("ase_record");
    expect(result.sun.value).toBe("leo");
    expect(result.moon.value).toBe("pisces");
    expect(result.rising.value).toBeNull();
  });

  it("falls through to cache when the ase_record has no usable fields", async () => {
    await upsertUserProfile(pool, DID, { sun: "aries", profileSource: "command" });

    const result = await resolveProfile(pool, DID, {
      fetchAseRecord: async () => ({}), // no signs set
    });

    expect(result.source).toBe("cache");
    expect(result.sun.value).toBe("aries");
  });

  it("2a. trusts a /set-sourced cache row as-is (sticky), even if bio would parse differently", async () => {
    await upsertUserProfile(pool, DID, { sun: "aries", profileSource: "command" });

    const result = await resolveProfile(pool, DID, {
      fetchBio: async () => ({ bioRaw: "Leo Sun" }), // would otherwise say Leo
    });

    expect(result.source).toBe("cache");
    expect(result.sun.value).toBe("aries"); // /set wins, never silently overridden
  });

  it("2b. trusts a bio-sourced cache row when the bio hash is unchanged", async () => {
    const bioRaw = "Leo Sun · Pisces Moon";
    await upsertUserProfile(pool, DID, { sun: "leo", moon: "pisces", bioRaw, bioHash: hashBio(bioRaw), profileSource: "bio" });

    const result = await resolveProfile(pool, DID, {
      fetchBio: async () => ({ bioRaw }), // identical bio
    });

    expect(result.source).toBe("cache");
    expect(result.sun.value).toBe("leo");
  });

  it("2c. re-parses when the bio-sourced cache row's bio has changed (§3.4 bio_hash diff)", async () => {
    const oldBio = "Leo Sun";
    await upsertUserProfile(pool, DID, { sun: "leo", bioRaw: oldBio, bioHash: hashBio(oldBio), profileSource: "bio" });

    const newBio = "Aries Sun";
    const result = await resolveProfile(pool, DID, {
      fetchBio: async () => ({ bioRaw: newBio }),
    });

    expect(result.source).toBe("bio");
    expect(result.sun.value).toBe("aries");

    // and the cache should now reflect the re-parse
    const row = await getUserProfile(pool, DID);
    expect(row?.sun).toBe("aries");
    expect(row?.bioHash).toBe(hashBio(newBio));
  });

  it("3. falls back to bio parsing and persists the result when there's no cache row at all", async () => {
    const result = await resolveProfile(pool, DID, {
      fetchBio: async () => ({ bioRaw: "Sagittarius Rising", handle: "user.bsky.social" }),
    });

    expect(result.source).toBe("bio");
    expect(result.rising.value).toBe("sagittarius");

    const row = await getUserProfile(pool, DID);
    expect(row?.rising).toBe("sagittarius");
    expect(row?.profileSource).toBe("bio");
    expect(row?.handle).toBe("user.bsky.social");
  });

  it("4. returns all-null placements when nothing is available anywhere", async () => {
    const result = await resolveProfile(pool, DID, {});
    expect(result.sun).toEqual({ value: null, confidence: 0 });
    expect(result.moon).toEqual({ value: null, confidence: 0 });
    expect(result.rising).toEqual({ value: null, confidence: 0 });
  });
});
