import type pg from "pg";
import type { Queue } from "bullmq";
import { selectUniqueWhimsyFragments } from "../whimsy/selectUniqueWhimsyFragments.js";
import { formatWhimsyPost } from "../whimsy/composeWhimsyPost.js";
import { countWhimsyPostsSince, getRecentWhimsyPosts, recordWhimsyPost } from "../whimsy/whimsyPostLog.js";
import { nextWhimsyDelayMs, windowStartUtc } from "../whimsy/whimsyCadence.js";
import { scheduleNextWhimsyPost } from "./whimsyQueue.js";
import type { WhimsyPostJob } from "./whimsyTypes.js";

/** Matches selectUniqueWhimsyFragments's EXACT_COMBO_LOOKBACK — the larger of its two windows. */
const HISTORY_LOOKBACK = 50;

export interface ProcessWhimsyPostDeps {
  pool: pg.Pool;
  queue: Queue<WhimsyPostJob>;
  postStandalone: (text: string) => Promise<void>;
  now?: () => Date;
}

/**
 * Runs one whimsy-post tick: picks repeat-avoidance-checked fragments, posts them, and logs the
 * post. Unlike phenomena's fixed upsertJobScheduler, this feature is a self-rescheduling delay
 * chain (§2 round 5) — nothing else re-adds the next job if this tick doesn't. So scheduling the
 * next tick happens in `finally`, not after a successful post: a transient posting failure must
 * not permanently break the chain and silently end all future whimsy posts. The re-query of
 * today's post count in `finally` (rather than reusing a count from before this tick) means a
 * failed post — never logged by recordWhimsyPost — doesn't count against the daily cap.
 */
export async function processWhimsyPost(deps: ProcessWhimsyPostDeps): Promise<void> {
  const now = (deps.now ?? (() => new Date()))();

  try {
    const recentPosts = await getRecentWhimsyPosts(deps.pool, HISTORY_LOOKBACK);
    const fragments = selectUniqueWhimsyFragments(recentPosts);
    const text = formatWhimsyPost(fragments);

    await deps.postStandalone(text);
    await recordWhimsyPost(deps.pool, fragments);
  } finally {
    const postsToday = await countWhimsyPostsSince(deps.pool, windowStartUtc(now));
    await scheduleNextWhimsyPost(deps.queue, nextWhimsyDelayMs(now, postsToday));
  }
}
