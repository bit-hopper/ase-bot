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
