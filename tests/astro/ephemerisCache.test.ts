import { constants } from "sweph";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { computeAllPlanetPositions } from "../../src/astro/ephemeris.js";
import { getCachedPositions, getOrRefreshPositions, storeCachedPositions } from "../../src/astro/ephemerisCache.js";
import { getPool } from "../../src/db/client.js";

// Integration test against the real local Postgres container (ase-postgres) — no mocking.
const pool = getPool();
const TEST_FLAGS = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

beforeEach(async () => {
  await pool.query("TRUNCATE ephemeris_cache RESTART IDENTITY");
});

afterAll(async () => {
  await pool.query("TRUNCATE ephemeris_cache RESTART IDENTITY");
  await pool.end();
});

describe("ephemeris cache (§13.3)", () => {
  it("returns null when the table is empty", async () => {
    expect(await getCachedPositions(pool)).toBeNull();
  });

  it("round-trips positions written with storeCachedPositions", async () => {
    const positions = computeAllPlanetPositions(new Date("2026-08-28T12:00:00Z"), TEST_FLAGS);
    await storeCachedPositions(pool, positions, 2);

    const cached = await getCachedPositions(pool);
    expect(cached).not.toBeNull();
    expect(cached!.sun.sign).toBe(positions.sun.sign);
    expect(cached!.sun.degree).toBeCloseTo(positions.sun.longitude, 6);
    expect(cached!.mercury.isRetrograde).toBe(positions.mercury.isRetrograde);
  });

  it("treats a row with an already-elapsed TTL as expired", async () => {
    const positions = computeAllPlanetPositions(new Date("2026-08-28T12:00:00Z"), TEST_FLAGS);
    await storeCachedPositions(pool, positions, 0);
    expect(await getCachedPositions(pool)).toBeNull();
  });

  it("uses the most recent non-expired row when multiple exist", async () => {
    const older = computeAllPlanetPositions(new Date("2026-01-01T00:00:00Z"), TEST_FLAGS);
    const newer = computeAllPlanetPositions(new Date("2026-08-28T12:00:00Z"), TEST_FLAGS);
    await storeCachedPositions(pool, older, 2);
    await new Promise((r) => setTimeout(r, 10));
    await storeCachedPositions(pool, newer, 2);

    const cached = await getCachedPositions(pool);
    expect(cached!.sun.sign).toBe(newer.sun.sign);
  });
});

describe("getOrRefreshPositions (§5.1 cache-through)", () => {
  it("computes and caches on a cold cache, then reuses the cache on the next call", async () => {
    const first = await getOrRefreshPositions(pool, { ttlHours: 2, now: new Date("2026-08-28T12:00:00Z"), calcFlags: TEST_FLAGS });
    expect(first.sun.sign).toBe("virgo");

    const rowCountAfterFirst = await pool.query("SELECT COUNT(*) FROM ephemeris_cache");
    expect(Number(rowCountAfterFirst.rows[0].count)).toBe(1);

    // Even if "now" would compute something different, a warm cache wins — proves reuse, not recomputation.
    const second = await getOrRefreshPositions(pool, { ttlHours: 2, now: new Date("2020-01-01T00:00:00Z"), calcFlags: TEST_FLAGS });
    expect(second).toEqual(first);

    const rowCountAfterSecond = await pool.query("SELECT COUNT(*) FROM ephemeris_cache");
    expect(Number(rowCountAfterSecond.rows[0].count)).toBe(1);
  });
});
