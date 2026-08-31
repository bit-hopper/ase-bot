import type pg from "pg";
import { fromCachedPosition, getOrRefreshPositions } from "../astro/ephemerisCache.js";
import { PLANETS, type Planet } from "../data/types.js";
import type { TransitSnapshot } from "../tarot/readingSelection.js";

export interface FetchPositionsOptions {
  ttlHours: number;
  now: Date;
  calcFlags?: number | undefined;
}

/** Bridges M2's cache-through ephemeris (astro layer) to the TransitSnapshot shape the tarot/reading layers use. */
export async function fetchTransitSnapshots(pool: pg.Pool, options: FetchPositionsOptions): Promise<Record<Planet, TransitSnapshot>> {
  const cached = await getOrRefreshPositions(pool, options);
  const entries = PLANETS.map((planet) => [planet, fromCachedPosition(planet, cached[planet])] as const);
  return Object.fromEntries(entries) as unknown as Record<Planet, TransitSnapshot>;
}

/** YYYY-MM-DD (UTC) — the day-stability seed used by §7.1's orientation CSPRNG. */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
