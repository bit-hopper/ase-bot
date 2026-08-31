import { constants } from "sweph";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { processPhenomenaCheck, type ProcessPhenomenaDeps } from "../../src/queue/processPhenomenaCheck.js";
import { computeAllPlanetPositions, dateToJulianDayUT } from "../../src/astro/ephemeris.js";
import { findNextSolarEclipse } from "../../src/astro/eclipses.js";
import { toPhenomenaState } from "../../src/phenomena/detectStationsAndIngresses.js";
import { getPhenomenaState, storePhenomenaState } from "../../src/phenomena/phenomenaState.js";
import { storeMoonPhase } from "../../src/phenomena/moonPhaseState.js";

const pool = getPool();
const TEST_FLAGS = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;
// Nowhere near a real eclipse (used for the negative window test) — and its real elongation
// (~183.8deg) sits inside the full_moon band [157.5, 202.5), confirmed via a live sanity check,
// used by the moon-phase test below.
const NOW = new Date("2026-08-28T12:00:00Z");

beforeEach(async () => {
  await pool.query("TRUNCATE phenomena_state");
  await pool.query("TRUNCATE phenomena_posted_log");
  await pool.query("TRUNCATE moon_phase_state");
});

afterAll(async () => {
  await pool.query("TRUNCATE phenomena_state");
  await pool.query("TRUNCATE phenomena_posted_log");
  await pool.query("TRUNCATE moon_phase_state");
  await pool.end();
});

function makeDeps(overrides: Partial<ProcessPhenomenaDeps> = {}): { deps: ProcessPhenomenaDeps; posted: string[] } {
  const posted: string[] = [];
  const deps: ProcessPhenomenaDeps = {
    pool,
    postStandalone: async (text) => {
      posted.push(text);
    },
    now: () => NOW,
    calcFlags: TEST_FLAGS,
    checkIntervalHours: 2,
    ...overrides,
  };
  return { deps, posted };
}

describe("processPhenomenaCheck", () => {
  it("cold start: posts nothing but seeds phenomena_state", async () => {
    const { deps, posted } = makeDeps();
    await processPhenomenaCheck(deps);

    expect(posted).toEqual([]);
    expect(await getPhenomenaState(pool)).not.toBeNull();
  });

  it("posts exactly one ingress when pre-seeded one sign behind, then nothing on an immediate second tick", async () => {
    const positions = computeAllPlanetPositions(NOW, TEST_FLAGS);
    const seeded = toPhenomenaState(positions);
    const realSign = seeded.mercury.sign;
    seeded.mercury = { ...seeded.mercury, sign: realSign === "aries" ? "taurus" : "aries" };
    await storePhenomenaState(pool, seeded);

    const { deps, posted } = makeDeps();
    await processPhenomenaCheck(deps);
    expect(posted).toHaveLength(1);
    expect(posted[0]).toContain("Mercury enters");

    const { deps: deps2, posted: posted2 } = makeDeps();
    await processPhenomenaCheck(deps2);
    expect(posted2).toEqual([]);
  });

  it("posts exactly one Full Moon post when pre-seeded with a different prior phase, then nothing on an immediate second tick", async () => {
    await storeMoonPhase(pool, "waxing_gibbous"); // NOW's real elongation sits in the full_moon band

    const { deps, posted } = makeDeps();
    await processPhenomenaCheck(deps);
    expect(posted.filter((t) => t.includes("Full Moon"))).toEqual(["Full Moon today."]);

    const { deps: deps2, posted: posted2 } = makeDeps();
    await processPhenomenaCheck(deps2);
    expect(posted2.filter((t) => t.includes("Full Moon"))).toEqual([]);
  });

  it("does not post or log an eclipse whose maximum falls outside the check-interval window", async () => {
    const { deps, posted } = makeDeps({ checkIntervalHours: 2 });
    await processPhenomenaCheck(deps);

    expect(posted.filter((t) => t.includes("eclipse"))).toEqual([]);
    const log = await pool.query("SELECT COUNT(*) FROM phenomena_posted_log");
    expect(Number(log.rows[0].count)).toBe(0);
  });

  it("posts an eclipse once it falls inside the check-interval window, and does not repost on an identical tick", async () => {
    const jdUt = dateToJulianDayUT(NOW);
    const eclipse = findNextSolarEclipse(jdUt, TEST_FLAGS);
    const closeNow = new Date(eclipse.date.getTime() - 60 * 60 * 1000); // 1h before eclipse max, inside a 2h window

    const { deps, posted } = makeDeps({ now: () => closeNow, checkIntervalHours: 2 });
    await processPhenomenaCheck(deps);
    expect(posted.filter((t) => t.includes("Solar eclipse"))).toHaveLength(1);

    const { deps: deps2, posted: posted2 } = makeDeps({ now: () => closeNow, checkIntervalHours: 2 });
    await processPhenomenaCheck(deps2);
    expect(posted2.filter((t) => t.includes("Solar eclipse"))).toEqual([]);
  });
});
