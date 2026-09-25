import type pg from "pg";
import { computeAllPlanetPositions, dateToJulianDayUT } from "../astro/ephemeris.js";
import { findNextLunarEclipse, findNextSolarEclipse, type EclipseEvent } from "../astro/eclipses.js";
import { findNextExactMoonPhase, NOTABLE_MOON_PHASES, type MoonPhaseExactEvent } from "../astro/moonPhaseExact.js";
import { claimPhenomenaPost, type EclipsePostEventType } from "../phenomena/phenomenaPostedLog.js";
import { detectStationsAndIngresses, toPhenomenaState } from "../phenomena/detectStationsAndIngresses.js";
import { getPhenomenaState, storePhenomenaState } from "../phenomena/phenomenaState.js";
import { formatEclipseEvent, formatIngressEvent, formatMoonPhaseEvent, formatStationEvent } from "../output/formatPhenomenon.js";

export interface ProcessPhenomenaDeps {
  pool: pg.Pool;
  postStandalone: (text: string) => Promise<void>;
  now?: () => Date;
  calcFlags?: number | undefined;
  /** Also sizes the eclipse and moon-phase lookahead windows — see maybePostEclipse/maybePostMoonPhase. */
  checkIntervalHours: number;
}

/**
 * Runs one phenomena-check tick: diffs fresh ephemeris positions against last-known state to
 * detect stations/ingresses (Section 1), forward-searches for each of the 4 notable moon phases'
 * exact instant (Section 2), and forward-searches for an eclipse landing within this tick's
 * window (Section 3). These are genuinely different check types — a state diff vs. two forward
 * searches with a lookahead guard — kept as clear sections rather than unified into one
 * abstraction that would obscure that difference.
 */
export async function processPhenomenaCheck(deps: ProcessPhenomenaDeps): Promise<void> {
  const now = (deps.now ?? (() => new Date()))();
  const jdUt = dateToJulianDayUT(now);
  const windowMs = deps.checkIntervalHours * 60 * 60 * 1000;

  // Section 1 — stations + ingresses via state diff
  const previous = await getPhenomenaState(deps.pool);
  const positions = computeAllPlanetPositions(now, deps.calcFlags);
  const events = detectStationsAndIngresses(previous, positions);
  await storePhenomenaState(deps.pool, toPhenomenaState(positions)); // always, even with 0 events

  for (const event of events) {
    const reply = event.type === "station" ? formatStationEvent(event) : formatIngressEvent(event);
    await deps.postStandalone(reply[0]!);
  }

  // Section 2 — the 4 notable moon phases (new/first quarter/full/last quarter), via forward
  // search + lookahead-window guard (same pattern as Section 3's eclipses below). sweph has no
  // built-in search for these exact Sun-Moon elongation instants, so moonPhaseExact.ts root-finds
  // each one; this only posts once that exact instant falls inside the current tick's window —
  // not merely once the sky has drifted into the broader 45deg phase band (astro/moonPhase.ts).
  for (const phase of NOTABLE_MOON_PHASES) {
    const event = findNextExactMoonPhase(jdUt, phase, deps.calcFlags);
    await maybePostMoonPhase(deps, event, now, windowMs);
  }

  // Section 3 — eclipses via forward search + lookahead-window guard. A plain forward search
  // (sol_eclipse_when_glob/lun_eclipse_when) returns the *next* eclipse from now, which can be
  // months out — without this guard, the very first tick after deploy would post about an
  // eclipse that hasn't happened yet. Only claim/post once the eclipse's maximum falls inside
  // this tick's check interval.
  await maybePostEclipse(deps, "lunar_eclipse", findNextLunarEclipse(jdUt, deps.calcFlags), now, windowMs);
  await maybePostEclipse(deps, "solar_eclipse", findNextSolarEclipse(jdUt, deps.calcFlags), now, windowMs);
}

async function maybePostMoonPhase(
  deps: ProcessPhenomenaDeps,
  event: MoonPhaseExactEvent,
  now: Date,
  windowMs: number,
): Promise<void> {
  if (event.date.getTime() - now.getTime() > windowMs) return; // too far out — not occurring this tick
  if (!(await claimPhenomenaPost(deps.pool, event.phase, event.date))) return; // already posted

  const reply = formatMoonPhaseEvent(event);
  await deps.postStandalone(reply[0]!);
}

async function maybePostEclipse(
  deps: ProcessPhenomenaDeps,
  eventType: EclipsePostEventType,
  eclipse: EclipseEvent,
  now: Date,
  windowMs: number,
): Promise<void> {
  if (eclipse.date.getTime() - now.getTime() > windowMs) return; // too far out — not occurring this tick
  if (!(await claimPhenomenaPost(deps.pool, eventType, eclipse.date))) return; // already posted

  const reply = formatEclipseEvent(eclipse);
  await deps.postStandalone(reply[0]!);
}
