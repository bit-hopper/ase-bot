import { constants } from "sweph";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { createReadingQueue, enqueueReadingJob } from "../../src/queue/queue.js";
import { createReadingWorker } from "../../src/queue/worker.js";
import { createRedisClient } from "../../src/queue/redisClient.js";
import type { ReadingJob } from "../../src/queue/types.js";
import type { ReplyThread } from "../../src/output/replyThread.js";

const pool = getPool();
const queueConnection = createRedisClient();
const workerConnection = createRedisClient();
const flushConnection = createRedisClient();

beforeEach(async () => {
  await flushConnection.flushdb();
});

afterAll(async () => {
  await flushConnection.flushdb();
  await flushConnection.quit();
  await queueConnection.quit();
  await workerConnection.quit();
  await pool.end();
});

function waitForPost(timeoutMs = 10_000): { promise: Promise<{ job: ReadingJob; reply: ReplyThread }>; postReply: (job: ReadingJob, reply: ReplyThread) => Promise<void> } {
  let resolve!: (v: { job: ReadingJob; reply: ReplyThread }) => void;
  const promise = new Promise<{ job: ReadingJob; reply: ReplyThread }>((res, rej) => {
    resolve = res;
    setTimeout(() => rej(new Error("Timed out waiting for the worker to process the job")), timeoutMs);
  });
  return { promise, postReply: async (job, reply) => resolve({ job, reply }) };
}

describe("BullMQ queue + worker end-to-end (§12.1)", () => {
  it("processes an enqueued job through the real queue and worker", async () => {
    const queue = createReadingQueue(queueConnection);
    const { promise, postReply } = waitForPost();
    const worker = createReadingWorker(workerConnection, {
      ctxBase: { pool, ephemerisTtlHours: 2, calcFlags: constants.SEFLG_MOSEPH | constants.SEFLG_SPEED, templates: [] },
      redis: flushConnection,
      pool,
      postReply,
      now: () => new Date(),
    });

    try {
      await enqueueReadingJob(queue, {
        mentionUri: "at://did:plc:author/app.bsky.feed.post/e2e",
        mentionCid: "cid-e2e",
        authorDid: "did:plc:test-queue-worker-e2e",
        authorHandle: "user.bsky.social",
        command: "/help",
        enqueuedAt: new Date().toISOString(),
      });

      const { reply } = await promise;
      expect(reply.join("\n")).toContain("Asé");
    } finally {
      await worker.close();
      await queue.close();
    }
  }, 15_000);
});
