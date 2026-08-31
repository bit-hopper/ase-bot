import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { claimEclipsePost } from "../../src/phenomena/eclipseLog.js";

const pool = getPool();

beforeEach(async () => {
  await pool.query("TRUNCATE phenomena_posted_log RESTART IDENTITY");
});

afterAll(async () => {
  await pool.query("TRUNCATE phenomena_posted_log RESTART IDENTITY");
  await pool.end();
});

describe("claimEclipsePost", () => {
  it("returns true the first time a (type, date) is claimed", async () => {
    expect(await claimEclipsePost(pool, "solar_eclipse", new Date("2027-02-06T15:59:39Z"))).toBe(true);
  });

  it("returns false on a repeat claim for the same (type, date)", async () => {
    await claimEclipsePost(pool, "solar_eclipse", new Date("2027-02-06T15:59:39Z"));
    expect(await claimEclipsePost(pool, "solar_eclipse", new Date("2027-02-06T15:59:39Z"))).toBe(false);
  });

  it("returns true for a different date, even with the same type", async () => {
    await claimEclipsePost(pool, "lunar_eclipse", new Date("2027-02-20T23:12:50Z"));
    expect(await claimEclipsePost(pool, "lunar_eclipse", new Date("2027-08-15T00:00:00Z"))).toBe(true);
  });

  it("returns true for a different type, even with the same date", async () => {
    await claimEclipsePost(pool, "lunar_eclipse", new Date("2027-02-06T00:00:00Z"));
    expect(await claimEclipsePost(pool, "solar_eclipse", new Date("2027-02-06T00:00:00Z"))).toBe(true);
  });
});
