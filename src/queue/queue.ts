import { Queue, type ConnectionOptions } from "bullmq";
import type { ReadingJob } from "./types.js";

/** §12.1 */
export const QUEUE_NAME = "ase-readings";

export function createReadingQueue(connection: ConnectionOptions): Queue<ReadingJob> {
  return new Queue<ReadingJob>(QUEUE_NAME, { connection });
}

/** §12.1 — 2 total attempts (1 retry), exponential backoff. */
export async function enqueueReadingJob(queue: Queue<ReadingJob>, job: ReadingJob): Promise<void> {
  await queue.add("reading", job, {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
  });
}
