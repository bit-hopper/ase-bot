import { Worker, type ConnectionOptions } from "bullmq";
import { processWhimsyPost, type ProcessWhimsyPostDeps } from "./processWhimsyPost.js";
import { WHIMSY_QUEUE_NAME } from "./whimsyQueue.js";
import type { WhimsyPostJob } from "./whimsyTypes.js";

/** concurrency: 1 — one global post per tick, same reasoning as phenomena's worker; also prevents
 *  two overlapping ticks from racing the repeat-avoidance history read/write. */
export function createWhimsyWorker(connection: ConnectionOptions, deps: ProcessWhimsyPostDeps): Worker<WhimsyPostJob> {
  return new Worker<WhimsyPostJob>(
    WHIMSY_QUEUE_NAME,
    async () => {
      await processWhimsyPost(deps);
    },
    { connection, concurrency: 1 },
  );
}
