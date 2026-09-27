import type pg from "pg";
import type { ZodiacSign } from "../data/types.js";
import type { WhimsyFragments } from "./composeWhimsyPost.js";

export interface WhimsyPostLogRow extends WhimsyFragments {
  postedAt: Date;
}

/** Most recent whimsy posts, newest first. `limit` should cover the larger of the two
 *  repeat-avoidance windows in selectUniqueWhimsyFragments.ts (currently 50). */
export async function getRecentWhimsyPosts(pool: pg.Pool, limit: number): Promise<WhimsyPostLogRow[]> {
  const result = await pool.query<{ sign: ZodiacSign; directive: string; punchline: string | null; posted_at: Date }>(
    `SELECT sign, directive, punchline, posted_at FROM whimsy_post_log ORDER BY posted_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({ sign: row.sign, directive: row.directive, punchline: row.punchline, postedAt: row.posted_at }));
}

export async function recordWhimsyPost(pool: pg.Pool, fragments: WhimsyFragments): Promise<void> {
  await pool.query("INSERT INTO whimsy_post_log (sign, directive, punchline) VALUES ($1, $2, $3)", [
    fragments.sign,
    fragments.directive,
    fragments.punchline,
  ]);
}

/** Count of whimsy posts logged at or after `since` — used to enforce the round 5 hard daily cap
 *  (see whimsyCadence.ts's windowStartUtc, which computes today's 6am PST cutoff for this). */
export async function countWhimsyPostsSince(pool: pg.Pool, since: Date): Promise<number> {
  const result = await pool.query<{ count: string }>("SELECT COUNT(*) FROM whimsy_post_log WHERE posted_at >= $1", [since]);
  return Number(result.rows[0]!.count);
}
