import type pg from "pg";
import type { NotableMoonPhase } from "../astro/moonPhaseExact.js";

export type EclipsePostEventType = "lunar_eclipse" | "solar_eclipse";
export type PhenomenaPostEventType = EclipsePostEventType | NotableMoonPhase;

/**
 * Atomically claims the right to post about this (eventType, eventDate) instant. Both eclipses
 * and the 4 notable moon phases are detected via forward search, which would otherwise keep
 * matching the same future event on every tick until its lookahead window is hit. Returns true
 * the first time (proceed with posting), false if it's already been claimed (skip — already
 * posted, possibly on an earlier tick or before a restart).
 */
export async function claimPhenomenaPost(pool: pg.Pool, eventType: PhenomenaPostEventType, eventDate: Date): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO phenomena_posted_log (event_type, event_date) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
    [eventType, eventDate.toISOString().slice(0, 10)],
  );
  return (result.rowCount ?? 0) > 0;
}
