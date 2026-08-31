import type pg from "pg";
import { computeAllPlanetPositions, dateToJulianDayUT } from "../astro/ephemeris.js";
import { findNextLunarEclipse, findNextSolarEclipse, type EclipseEvent } from "../astro/eclipses.js";
import { computeMoonPhase } from "../astro/moonPhase.js";
import { claimEclipsePost, type EclipsePostEventType } from "../phenomena/eclipseLog.js";
import { detectMoonPhaseChange } from "../phenomena/detectMoonPhaseChange.js";
import { detectStationsAndIngresses, toPhenomenaState } from "../phenomena/detectStationsAndIngresses.js";
import { getLastMoonPhase, storeMoonPhase } from "../phenomena/moonPhaseState.js";
import { getPhenomenaState, storePhenomenaState } from "../phenomena/phenomenaState.js";
import { formatEclipseEvent, formatIngressEvent, formatMoonPhaseEvent, formatStationEvent } from "../output/formatPhenomenon.js";

export interface ProcessPhenomenaDeps {
  pool: pg.Pool;
  postStandalone: (text: string) => Promise<void>;
  now?: () => Date;
  calcFlags?: number | undefined;
  /** Also sizes the eclipse lookahead window — see maybePostEclipse. */
  checkIntervalHours: number;
}

/**
 * Runs one phenomena-check tick: diffs fresh ephemeris positions against last-known state to
 * detect stations/ingresses (Section 1), and independently forward-searches for an eclipse
 * landing within this tick's window (Section 2). These are genuinely different check types —
 * a state diff vs. a forward search with a lookahead guard — kept as two clear sections rather
 * than unified into one abstraction that would obscure that difference.
 */
export async function processPhenomenaCheck(deps: ProcessPhenomenaDeps): Promise<void> {
  const now = (deps.now ?? (() => new Date()))();

  // Section 1 — stations + ingresses via state diff
  const previous = await getPhenomenaState(deps.pool);
  const positions = computeAllPlanetPositions(now, deps.calcFlags);
  const events = detectStationsAndIngresses(previous, positions);
  await storePhenomenaState(deps.pool, toPhenomenaState(positions)); // always, even with 0 events

  for (const event of events) {
    const reply = event.type === "station" ? formatStationEvent(event) : formatIngressEvent(event);
    await deps.postStandalone(reply[0]!);
  }

  // Section 1b — moon phase via the same tick's already-computed Sun/Moon longitudes. A
  // separate diff from Section 1's per-planet state, since phase is a joint Sun+Moon property,
  // not any one tracked body's own state.
  const previousPhase = await getLastMoonPhase(deps.pool);
  const currentPhase = computeMoonPhase(positions.sun.longitude, positions.moon.longitude);
  const phaseEvent = detectMoonPhaseChange(previousPhase, currentPhase);
  await storeMoonPhase(deps.pool, currentPhase); // always, even when not a notable-phase transition

  if (phaseEvent) {
    await deps.postStandalone(formatMoonPhaseEvent(phaseEvent)[0]!);
  }

  // Section 2 — eclipses via forward search + lookahead-window guard. A plain forward search
  // (sol_eclipse_when_glob/lun_eclipse_when) returns the *next* eclipse from now, which can be
  // months out — without this guard, the very first tick after deploy would post about an
  // eclipse that hasn't happened yet. Only claim/post once the eclipse's maximum falls inside
  // this tick's check interval.
  const jdUt = dateToJulianDayUT(now);
  const windowMs = deps.checkIntervalHours * 60 * 60 * 1000;
  await maybePostEclipse(deps, "lunar_eclipse", findNextLunarEclipse(jdUt, deps.calcFlags), now, windowMs);
  await maybePostEclipse(deps, "solar_eclipse", findNextSolarEclipse(jdUt, deps.calcFlags), now, windowMs);
}

async function maybePostEclipse(
  deps: ProcessPhenomenaDeps,
  eventType: EclipsePostEventType,
  eclipse: EclipseEvent,
  now: Date,
  windowMs: number,
): Promise<void> {
  if (eclipse.date.getTime() - now.getTime() > windowMs) return; // too far out — not occurring this tick
  if (!(await claimEclipsePost(deps.pool, eventType, eclipse.date))) return; // already posted

  const reply = formatEclipseEvent(eclipse);
  await deps.postStandalone(reply[0]!);
}
