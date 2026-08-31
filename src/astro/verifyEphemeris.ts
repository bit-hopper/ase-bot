import { pathToFileURL } from "node:url";
import { constants } from "sweph";
import { loadEnv } from "../config/env.js";
import { computePlanetPosition, dateToJulianDayUT, initEphemeris } from "./ephemeris.js";

/**
 * Standalone smoke check that SWEPH_PATH actually contains loadable Swiss Ephemeris data —
 * run in its own process (not inside the vitest suite). sweph's set_ephe_path() is a
 * process-wide native setting (see node_modules/sweph/README.md "Limitations"), so calling
 * initEphemeris() inside the shared vitest process would leak into every other test file
 * that expects no ephemeris data to be configured (see ephemeris.test.ts's §5.1 guard test).
 */
export function verifyEphemeris(swephPath: string): void {
  initEphemeris(swephPath);
  const jd = dateToJulianDayUT(new Date());

  // computePlanetPosition() already throws if SEFLG_SWIEPH silently fell back to the
  // Moshier approximation (§5.1 guard) — reaching the end of this loop is the proof.
  for (const planet of ["sun", "moon"] as const) {
    computePlanetPosition(jd, planet, constants.SEFLG_SWIEPH | constants.SEFLG_SPEED);
  }
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  try {
    verifyEphemeris(loadEnv().swephPath);
    console.log("Ephemeris data OK: Sun and Moon resolve via real Swiss Ephemeris files (SEFLG_SWIEPH).");
    process.exit(0);
  } catch (err) {
    console.error("Ephemeris verification failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
