import { Worker, type ConnectionOptions } from "bullmq";
import { processPhenomenaCheck, type ProcessPhenomenaDeps } from "./processPhenomenaCheck.js";
import { PHENOMENA_QUEUE_NAME } from "./phenomenaQueue.js";
import type { PhenomenaCheckJob } from "./phenomenaTypes.js";

/** concurrency: 1 — there's exactly one global check to run per tick, not per-user parallel work;
 *  also guards against two overlapping ticks racing each other's state diff. */
export function createPhenomenaWorker(connection: ConnectionOptions, deps: ProcessPhenomenaDeps): Worker<PhenomenaCheckJob> {
  return new Worker<PhenomenaCheckJob>(
    PHENOMENA_QUEUE_NAME,
    async () => {
      await processPhenomenaCheck(deps);
    },
    { connection, concurrency: 1 },
  );
}
