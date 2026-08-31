import { Worker, type ConnectionOptions } from "bullmq";
import { processReadingJob, type ProcessJobDeps } from "./processJob.js";
import { QUEUE_NAME } from "./queue.js";
import type { ReadingJob } from "./types.js";

/** §12.1 — concurrency 5. */
export const WORKER_CONCURRENCY = 5;

export function createReadingWorker(connection: ConnectionOptions, deps: ProcessJobDeps): Worker<ReadingJob> {
  return new Worker<ReadingJob>(
    QUEUE_NAME,
    async (job) => {
      const result = await processReadingJob(deps, job.data);
      return result;
    },
    { connection, concurrency: WORKER_CONCURRENCY },
  );
}
