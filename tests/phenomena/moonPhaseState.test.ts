import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { getLastMoonPhase, storeMoonPhase } from "../../src/phenomena/moonPhaseState.js";

const pool = getPool();

beforeEach(async () => {
  await pool.query("TRUNCATE moon_phase_state");
});

afterAll(async () => {
  await pool.query("TRUNCATE moon_phase_state");
  await pool.end();
});

describe("moonPhaseState", () => {
  it("returns null when no row exists", async () => {
    expect(await getLastMoonPhase(pool)).toBeNull();
  });

  it("round-trips a stored phase", async () => {
    await storeMoonPhase(pool, "full_moon");
    expect(await getLastMoonPhase(pool)).toBe("full_moon");
  });

  it("upserts on a second write, never accumulating more than one row", async () => {
    await storeMoonPhase(pool, "new_moon");
    await storeMoonPhase(pool, "first_quarter");

    expect(await getLastMoonPhase(pool)).toBe("first_quarter");
    const rowCount = await pool.query("SELECT COUNT(*) FROM moon_phase_state");
    expect(Number(rowCount.rows[0].count)).toBe(1);
  });
});
