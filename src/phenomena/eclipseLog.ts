import type pg from "pg";

export type EclipsePostEventType = "lunar_eclipse" | "solar_eclipse";

/**
 * Atomically claims the right to post about this (eventType, eventDate) eclipse. Returns true
 * the first time (proceed with posting), false if it's already been claimed (skip — already
 * posted, possibly on an earlier tick or before a restart).
 */
export async function claimEclipsePost(pool: pg.Pool, eventType: EclipsePostEventType, eventDate: Date): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO phenomena_posted_log (event_type, event_date) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
    [eventType, eventDate.toISOString().slice(0, 10)],
  );
  return (result.rowCount ?? 0) > 0;
}
