import { Queue, type ConnectionOptions } from "bullmq";
import type { WhimsyPostJob } from "./whimsyTypes.js";

export const WHIMSY_QUEUE_NAME = "ase-whimsy";

export function createWhimsyQueue(connection: ConnectionOptions): Queue<WhimsyPostJob> {
  return new Queue<WhimsyPostJob>(WHIMSY_QUEUE_NAME, { connection });
}

/**
 * Self-rescheduling delay chain (§2 round 4: window-bound but genuinely variable cadence, not a
 * fixed interval) — unlike phenomena's upsertJobScheduler. Each tick computes its own next delay
 * via whimsyCadence.ts and re-adds itself (see processWhimsyPost.ts), so this only needs to seed
 * the very first job on startup.
 */
export async function scheduleNextWhimsyPost(queue: Queue<WhimsyPostJob>, delayMs: number): Promise<void> {
  await queue.add("post", {}, { delay: delayMs });
}

/**
 * Startup entry point — unlike scheduleNextWhimsyPost (called mid-chain, where exactly one job is
 * always in flight by construction), this must be idempotent across restarts, the way phenomena's
 * upsertJobScheduler is. A self-rescheduling delay chain has no built-in equivalent, so this checks
 * for a job already pending/active first; only seeds a fresh one if the chain isn't already running
 * from a prior process. Without this check, a restart while a delayed job is still pending would
 * stack duplicate chains, each independently rescheduling itself forever.
 */
export async function seedWhimsyChainIfEmpty(queue: Queue<WhimsyPostJob>, delayMs: number): Promise<void> {
  const counts = await queue.getJobCounts("delayed", "waiting", "active");
  const pending = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (pending > 0) return;
  await scheduleNextWhimsyPost(queue, delayMs);
}
