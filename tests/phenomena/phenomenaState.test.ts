import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { getPhenomenaState, storePhenomenaState } from "../../src/phenomena/phenomenaState.js";
import type { PhenomenaState } from "../../src/phenomena/detectStationsAndIngresses.js";
import { PLANETS } from "../../src/data/types.js";

const pool = getPool();

beforeEach(async () => {
  await pool.query("TRUNCATE phenomena_state");
});

afterAll(async () => {
  await pool.query("TRUNCATE phenomena_state");
  await pool.end();
});

function sampleState(): PhenomenaState {
  const entries = PLANETS.map((p) => [p, { sign: "aries", isRetrograde: false }] as const);
  return Object.fromEntries(entries) as PhenomenaState;
}

describe("phenomenaState", () => {
  it("returns null when the table is empty", async () => {
    expect(await getPhenomenaState(pool)).toBeNull();
  });

  it("round-trips all 10 planets", async () => {
    const state = sampleState();
    state.mercury = { sign: "gemini", isRetrograde: true };

    await storePhenomenaState(pool, state);
    const loaded = await getPhenomenaState(pool);

    expect(loaded).toEqual(state);
  });

  it("upserts on a second write without duplicating rows", async () => {
    await storePhenomenaState(pool, sampleState());

    const updated = sampleState();
    updated.venus = { sign: "taurus", isRetrograde: false };
    await storePhenomenaState(pool, updated);

    const rowCount = await pool.query("SELECT COUNT(*) FROM phenomena_state");
    expect(Number(rowCount.rows[0].count)).toBe(PLANETS.length);

    const loaded = await getPhenomenaState(pool);
    expect(loaded).toEqual(updated);
  });
});
