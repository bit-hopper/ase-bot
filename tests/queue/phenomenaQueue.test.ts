import { afterAll, describe, expect, it } from "vitest";
import { createPhenomenaQueue, PHENOMENA_SCHEDULER_ID, schedulePhenomenaChecks } from "../../src/queue/phenomenaQueue.js";
import { createRedisClient } from "../../src/queue/redisClient.js";

const connection = createRedisClient();
const flushConnection = createRedisClient();

afterAll(async () => {
  await flushConnection.flushdb();
  await flushConnection.quit();
  await connection.quit();
});

describe("schedulePhenomenaChecks (§bullmq upsertJobScheduler idempotency)", () => {
  it("does not accumulate duplicate schedules across repeated calls (simulating restarts)", async () => {
    await flushConnection.flushdb();
    const queue = createPhenomenaQueue(connection);

    try {
      await schedulePhenomenaChecks(queue, 2);
      await schedulePhenomenaChecks(queue, 2);
      await schedulePhenomenaChecks(queue, 2);

      const schedulers = await queue.getJobSchedulers();
      const matching = schedulers.filter((s) => s.key === PHENOMENA_SCHEDULER_ID);
      expect(matching).toHaveLength(1);
    } finally {
      await queue.close();
    }
  }, 15_000);
});
