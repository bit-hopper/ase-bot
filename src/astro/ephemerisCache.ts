import type pg from "pg";
import { PLANETS, type Planet, type ZodiacSign } from "../data/types.js";
import { longitudeToSign } from "./coordinates.js";
import { computeAllPlanetPositions, DEFAULT_CALC_FLAGS, type PlanetPosition } from "./ephemeris.js";

/** §13.3 — the shape stored in `ephemeris_cache.positions`, keyed by planet name. */
export interface CachedPlanetPosition {
  sign: ZodiacSign;
  /** Absolute ecliptic longitude, [0, 360). */
  degree: number;
  isRetrograde: boolean;
}

export type CachedPositions = Record<Planet, CachedPlanetPosition>;

function toCachedPositions(positions: Record<Planet, PlanetPosition>): CachedPositions {
  const entries = PLANETS.map((planet) => {
    const p = positions[planet];
    return [planet, { sign: p.sign, degree: p.longitude, isRetrograde: p.isRetrograde }] as const;
  });
  return Object.fromEntries(entries) as CachedPositions;
}

/** Reconstructs sign-relative position data from a cached row (speedLongitude isn't persisted — only the boolean). */
export function fromCachedPosition(planet: Planet, cached: CachedPlanetPosition): Omit<PlanetPosition, "speedLongitude"> {
  return {
    planet,
    longitude: cached.degree,
    isRetrograde: cached.isRetrograde,
    ...longitudeToSign(cached.degree),
  };
}

/** §13.3 — reads the most recent non-expired cache row, if any. */
export async function getCachedPositions(pool: pg.Pool): Promise<CachedPositions | null> {
  const result = await pool.query<{ positions: CachedPositions }>(
    `SELECT positions FROM ephemeris_cache WHERE expires_at > NOW() ORDER BY cached_at DESC LIMIT 1`,
  );
  return result.rows[0]?.positions ?? null;
}

/** §13.3 — inserts a new cache row valid for `ttlHours` (§5.1 default: 2h). */
export async function storeCachedPositions(
  pool: pg.Pool,
  positions: Record<Planet, PlanetPosition>,
  ttlHours: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO ephemeris_cache (cached_at, expires_at, positions)
     VALUES (NOW(), NOW() + ($2 || ' hours')::interval, $1)`,
    [JSON.stringify(toCachedPositions(positions)), ttlHours],
  );
}

/**
 * §5.1, §12.3 step 3 — the single entry point the rest of the app should use to get
 * current transiting positions: serves the cached row if still fresh, otherwise
 * computes fresh positions via the ephemeris and refreshes the cache.
 */
export async function getOrRefreshPositions(
  pool: pg.Pool,
  options: { ttlHours: number; now?: Date | undefined; calcFlags?: number | undefined },
): Promise<CachedPositions> {
  const cached = await getCachedPositions(pool);
  if (cached) return cached;

  const fresh = computeAllPlanetPositions(options.now ?? new Date(), options.calcFlags ?? DEFAULT_CALC_FLAGS);
  await storeCachedPositions(pool, fresh, options.ttlHours);
  return toCachedPositions(fresh);
}
