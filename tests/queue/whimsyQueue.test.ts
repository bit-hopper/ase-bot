import { afterAll, describe, expect, it } from "vitest";
import { createWhimsyQueue, scheduleNextWhimsyPost, seedWhimsyChainIfEmpty } from "../../src/queue/whimsyQueue.js";
import { createRedisClient } from "../../src/queue/redisClient.js";

const connection = createRedisClient();
const flushConnection = createRedisClient();

afterAll(async () => {
  await flushConnection.flushdb();
  await flushConnection.quit();
  await connection.quit();
});

describe("scheduleNextWhimsyPost", () => {
  it("adds exactly one delayed job", async () => {
    await flushConnection.flushdb();
    const queue = createWhimsyQueue(connection);
    try {
      await scheduleNextWhimsyPost(queue, 60_000);
      const counts = await queue.getJobCounts("delayed", "waiting");
      expect((counts.delayed ?? 0) + (counts.waiting ?? 0)).toBe(1);
    } finally {
      await queue.close();
    }
  }, 15_000);
});

describe("seedWhimsyChainIfEmpty (restart-safety — no phenomena-style upsertJobScheduler exists for a variable-delay chain)", () => {
  it("seeds a job when the queue is empty", async () => {
    await flushConnection.flushdb();
    const queue = createWhimsyQueue(connection);
    try {
      await seedWhimsyChainIfEmpty(queue, 60_000);
      const counts = await queue.getJobCounts("delayed", "waiting");
      expect((counts.delayed ?? 0) + (counts.waiting ?? 0)).toBe(1);
    } finally {
      await queue.close();
    }
  }, 15_000);

  it("does not stack a second job when one is already pending (simulating a restart)", async () => {
    await flushConnection.flushdb();
    const queue = createWhimsyQueue(connection);
    try {
      await seedWhimsyChainIfEmpty(queue, 60_000);
      await seedWhimsyChainIfEmpty(queue, 60_000); // simulated restart
      await seedWhimsyChainIfEmpty(queue, 60_000); // simulated restart again

      const counts = await queue.getJobCounts("delayed", "waiting");
      expect((counts.delayed ?? 0) + (counts.waiting ?? 0)).toBe(1);
    } finally {
      await queue.close();
    }
  }, 15_000);
});
