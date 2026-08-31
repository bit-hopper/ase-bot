import type pg from "pg";
import type { ProfileResolverDeps } from "../profile/profileResolver.js";
import type { SetPlacements } from "../profile/setCommand.js";
import type { ReadingTemplate } from "../templates/types.js";

/**
 * Everything a command handler might need. AT Proto integration is M8 — `resolverDeps` and
 * `writeAseRecord` are the same optional-callback seams already established in M4's profile
 * resolver (fetchAseRecord/fetchBio) and setCommand (writeAseRecord), so this layer can be
 * fully built and tested now and just gets real implementations plugged in later.
 */
export interface CommandContext {
  pool: pg.Pool;
  did: string;
  handle: string;
  /** The instant "now" is evaluated at — live time for most commands. */
  now: Date;
  ephemerisTtlHours: number;
  /** Override for tests that don't have real Swiss Ephemeris data files (e.g. SEFLG_MOSEPH). */
  calcFlags?: number | undefined;
  templates: ReadingTemplate[];
  resolverDeps?: ProfileResolverDeps | undefined;
  writeAseRecord?: ((did: string, placements: SetPlacements) => Promise<void>) | undefined;
}
