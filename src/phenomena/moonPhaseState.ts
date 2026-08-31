import type pg from "pg";
import type { MoonPhase } from "../data/types.js";

/** null means no row yet — a cold start with no prior phase to diff against. */
export async function getLastMoonPhase(pool: pg.Pool): Promise<MoonPhase | null> {
  const result = await pool.query<{ phase: MoonPhase }>("SELECT phase FROM moon_phase_state WHERE id = TRUE");
  return result.rows[0]?.phase ?? null;
}

/** Upserts the singleton row. Called every tick regardless of whether a notable-phase event fired. */
export async function storeMoonPhase(pool: pg.Pool, phase: MoonPhase): Promise<void> {
  await pool.query(
    `INSERT INTO moon_phase_state (id, phase) VALUES (TRUE, $1)
     ON CONFLICT (id) DO UPDATE SET phase = EXCLUDED.phase, updated_at = NOW()`,
    [phase],
  );
}
