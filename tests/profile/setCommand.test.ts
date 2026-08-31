import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { applySetCommand, parseSetArgs } from "../../src/profile/setCommand.js";
import { getUserProfile } from "../../src/profile/userProfileStore.js";

describe("parseSetArgs (§3.3, pure)", () => {
  it("parses a single placement", () => {
    const { placements, errors } = parseSetArgs("sun leo");
    expect(placements).toEqual({ sun: "leo" });
    expect(errors).toEqual([]);
  });

  it("parses all three placements at once", () => {
    const { placements, errors } = parseSetArgs("sun leo moon pisces rising sagittarius");
    expect(placements).toEqual({ sun: "leo", moon: "pisces", rising: "sagittarius" });
    expect(errors).toEqual([]);
  });

  it("is case-insensitive for both field and sign", () => {
    const { placements } = parseSetArgs("SUN Leo");
    expect(placements).toEqual({ sun: "leo" });
  });

  it("errors on an unknown field", () => {
    const { placements, errors } = parseSetArgs("ascendant leo");
    expect(placements).toEqual({});
    expect(errors[0]).toMatch(/Unknown field/);
  });

  it("errors on an unknown sign", () => {
    const { placements, errors } = parseSetArgs("sun leoo");
    expect(placements).toEqual({});
    expect(errors[0]).toMatch(/Unknown sign/);
  });

  it("errors on a dangling field with no value", () => {
    const { errors } = parseSetArgs("sun");
    expect(errors[0]).toMatch(/Missing sign value/);
  });

  it("errors on empty args", () => {
    const { errors } = parseSetArgs("");
    expect(errors[0]).toMatch(/No placements provided/);
  });

  it("collects valid placements alongside errors for invalid ones in the same command", () => {
    const { placements, errors } = parseSetArgs("sun leo moon bogus");
    expect(placements).toEqual({ sun: "leo" });
    expect(errors).toHaveLength(1);
  });
});

describe("applySetCommand (§3.3 steps 1-3, integration)", () => {
  const pool = getPool();
  const DID = "did:plc:test-set-command";

  beforeEach(async () => {
    await pool.query("TRUNCATE user_profiles");
  });

  afterAll(async () => {
    await pool.query("TRUNCATE user_profiles");
    await pool.end();
  });

  it("persists valid placements with profile_source=command", async () => {
    const result = await applySetCommand(pool, DID, "sun leo");
    expect(result.stored?.sun).toBe("leo");
    expect(result.stored?.profileSource).toBe("command");

    const row = await getUserProfile(pool, DID);
    expect(row?.sun).toBe("leo");
  });

  it("preserves previously-set fields across separate /set calls (partial sets)", async () => {
    await applySetCommand(pool, DID, "sun leo");
    const second = await applySetCommand(pool, DID, "moon pisces");

    expect(second.stored?.sun).toBe("leo");
    expect(second.stored?.moon).toBe("pisces");
  });

  it("does not touch the DB when there are no valid placements", async () => {
    const result = await applySetCommand(pool, DID, "ascendant leo");
    expect(result.stored).toBeNull();
    expect(await getUserProfile(pool, DID)).toBeNull();
  });

  it("calls writeAseRecord (best-effort PDS write, §11.4) when provided", async () => {
    let calledWith: unknown = null;
    await applySetCommand(pool, DID, "sun leo", {
      writeAseRecord: async (did, placements) => {
        calledWith = { did, placements };
      },
    });
    expect(calledWith).toEqual({ did: DID, placements: { sun: "leo" } });
  });
});
