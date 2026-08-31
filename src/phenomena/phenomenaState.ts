import type pg from "pg";
import { PLANETS, type Planet, type ZodiacSign } from "../data/types.js";
import type { PhenomenaState } from "./detectStationsAndIngresses.js";

/** null means the table is empty — a cold start with no prior state to diff against. */
export async function getPhenomenaState(pool: pg.Pool): Promise<PhenomenaState | null> {
  const result = await pool.query<{ planet: Planet; sign: ZodiacSign; is_retrograde: boolean }>(
    "SELECT planet, sign, is_retrograde FROM phenomena_state",
  );
  if (result.rows.length === 0) return null;

  const entries = result.rows.map((row) => [row.planet, { sign: row.sign, isRetrograde: row.is_retrograde }] as const);
  return Object.fromEntries(entries) as PhenomenaState;
}

/** Upserts all 10 planets' state in one statement. Called every tick regardless of whether any event fired. */
export async function storePhenomenaState(pool: pg.Pool, state: PhenomenaState): Promise<void> {
  const planets = [...PLANETS];
  const signs = planets.map((p) => state[p].sign);
  const retrogrades = planets.map((p) => state[p].isRetrograde);

  await pool.query(
    `INSERT INTO phenomena_state (planet, sign, is_retrograde)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::boolean[])
     ON CONFLICT (planet) DO UPDATE SET sign = EXCLUDED.sign, is_retrograde = EXCLUDED.is_retrograde, updated_at = NOW()`,
    [planets, signs, retrogrades],
  );
}
