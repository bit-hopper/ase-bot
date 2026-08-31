import { constants } from "sweph";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { fetchTransitSnapshots, toUtcDateString } from "../../src/commands/positions.js";

describe("toUtcDateString (pure)", () => {
  it("formats as YYYY-MM-DD in UTC", () => {
    expect(toUtcDateString(new Date("2026-08-28T23:59:00Z"))).toBe("2026-08-28");
  });
});

describe("fetchTransitSnapshots (integration)", () => {
  const pool = getPool();

  beforeEach(async () => {
    await pool.query("TRUNCATE ephemeris_cache");
  });

  afterAll(async () => {
    await pool.query("TRUNCATE ephemeris_cache");
    await pool.end();
  });

  it("returns all 10 planets with sign/degree/longitude/isRetrograde", async () => {
    const positions = await fetchTransitSnapshots(pool, { ttlHours: 2, now: new Date("2026-08-28T12:00:00Z"), calcFlags: constants.SEFLG_MOSEPH | constants.SEFLG_SPEED });
    expect(positions.sun.sign).toBe("virgo");
    expect(Object.keys(positions)).toHaveLength(10);
    for (const p of Object.values(positions)) {
      expect(typeof p.longitude).toBe("number");
      expect(typeof p.isRetrograde).toBe("boolean");
    }
  });
});
