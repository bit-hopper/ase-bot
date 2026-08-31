import { Queue, type ConnectionOptions } from "bullmq";
import type { PhenomenaCheckJob } from "./phenomenaTypes.js";

export const PHENOMENA_QUEUE_NAME = "ase-phenomena";
export const PHENOMENA_SCHEDULER_ID = "phenomena-check";

export function createPhenomenaQueue(connection: ConnectionOptions): Queue<PhenomenaCheckJob> {
  return new Queue<PhenomenaCheckJob>(PHENOMENA_QUEUE_NAME, { connection });
}

/**
 * Registers (or updates) the repeatable phenomena-check job. upsertJobScheduler is explicitly
 * idempotent, keyed by jobSchedulerId — safe to call on every startup without accumulating
 * duplicate schedules across restarts.
 */
export async function schedulePhenomenaChecks(queue: Queue<PhenomenaCheckJob>, intervalHours: number): Promise<void> {
  await queue.upsertJobScheduler(PHENOMENA_SCHEDULER_ID, { every: intervalHours * 60 * 60 * 1000 }, { name: "check" });
}
