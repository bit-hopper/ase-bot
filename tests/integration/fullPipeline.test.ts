import { constants } from "sweph";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Event } from "@atproto/sync";
import { getPool } from "../../src/db/client.js";
import { createRedisClient } from "../../src/queue/redisClient.js";
import { createReadingQueue, enqueueReadingJob } from "../../src/queue/queue.js";
import { createReadingWorker } from "../../src/queue/worker.js";
import { createCursorStore } from "../../src/atproto/firehoseCursor.js";
import { startMentionListener } from "../../src/atproto/mentionListener.js";
import type { ReadingJob } from "../../src/queue/types.js";
import type { ReplyThread } from "../../src/output/replyThread.js";

const BOT_DID = "did:plc:asebot0000000000000000000";
// Deliberately not real Swiss Ephemeris data: sweph's set_ephe_path() is a process-wide
// native setting shared by every test file in this run (see src/astro/verifyEphemeris.ts's
// header comment), so this suite sticks to the same offline approximation every other test
// uses rather than risk leaking real-data state into ephemeris.test.ts's §5.1 guard test.
const CALC_FLAGS = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

const pool = getPool();
const queueConnection = createRedisClient();
const workerConnection = createRedisClient();
const rateLimitConnection = createRedisClient();
const cursorConnection = createRedisClient();

beforeEach(async () => {
  await rateLimitConnection.flushdb();
});

afterAll(async () => {
  await rateLimitConnection.flushdb();
  await queueConnection.quit();
  await workerConnection.quit();
  await rateLimitConnection.quit();
  await cursorConnection.quit();
  await pool.end();
});

/** Builds a minimal fake firehose commit event — only the fields mentionListener.ts reads. */
function makeCreateEvent(overrides: { seq: number; did: string; text: string; facets?: unknown[] }): Event {
  return {
    event: "create",
    seq: overrides.seq,
    time: new Date().toISOString(),
    collection: "app.bsky.feed.post",
    rkey: `rkey-${overrides.seq}`,
    did: overrides.did,
    uri: `at://${overrides.did}/app.bsky.feed.post/rkey-${overrides.seq}`,
    cid: `cid-${overrides.seq}`,
    commit: `commit-${overrides.seq}`,
    rev: `rev-${overrides.seq}`,
    blocks: undefined,
    record: { text: overrides.text, facets: overrides.facets },
  } as unknown as Event;
}

describe("full pipeline: firehose mention -> queue -> worker -> reply (§11.2, §12.1, §12.3)", () => {
  it("detects a mention via the real mentionListener wiring, persists the cursor, and posts a real reply through the real queue+worker", async () => {
    const authorDid = "did:plc:test-full-pipeline-moon";
    const queue = createReadingQueue(queueConnection);

    let resolvePosted!: (v: { job: ReadingJob; reply: ReplyThread }) => void;
    const posted = new Promise<{ job: ReadingJob; reply: ReplyThread }>((resolve, reject) => {
      resolvePosted = resolve;
      setTimeout(() => reject(new Error("Timed out waiting for the worker to process the job")), 10_000);
    });

    const worker = createReadingWorker(workerConnection, {
      ctxBase: { pool, ephemerisTtlHours: 2, calcFlags: CALC_FLAGS, templates: [] },
      redis: rateLimitConnection,
      pool,
      postReply: async (job, reply) => resolvePosted({ job, reply }),
      now: () => new Date(),
    });

    const cursor = createCursorStore(cursorConnection);
    const firehose = startMentionListener({
      botDid: BOT_DID,
      resolveAuthorHandle: async () => "pipeline-test.bsky.social",
      cursor,
      onMention: async (job) => enqueueReadingJob(queue, job),
    });

    try {
      const seq = Date.now();
      // Real production handleEvent — same code path main.ts wires up, invoked directly
      // instead of through a live network subscription (Firehose#start() would require one).
      await firehose.opts.handleEvent(
        makeCreateEvent({
          seq,
          did: authorDid,
          text: "@ase.tinylil.world /moon",
          facets: [{ features: [{ $type: "app.bsky.richtext.facet#mention", did: BOT_DID }] }],
        }),
      );

      const { job, reply } = await posted;

      expect(job.authorDid).toBe(authorDid);
      expect(job.authorHandle).toBe("pipeline-test.bsky.social");
      expect(reply.join("\n")).toMatch(/Moon in/);

      await expect(cursor.get()).resolves.toBe(seq);
    } finally {
      await worker.close();
      await queue.close();
    }
  }, 15_000);

  it("a facet-less post mentioning the handle as plain text never reaches the queue (§11.2)", async () => {
    const queue = createReadingQueue(queueConnection);
    let onMentionCalled = false;

    const firehose = startMentionListener({
      botDid: BOT_DID,
      resolveAuthorHandle: async () => "someone.bsky.social",
      cursor: createCursorStore(cursorConnection),
      onMention: async () => {
        onMentionCalled = true;
      },
    });

    await firehose.opts.handleEvent(
      makeCreateEvent({
        seq: Date.now(),
        did: "did:plc:test-full-pipeline-no-facet",
        text: "hey @ase.tinylil.world /moon",
        facets: undefined,
      }),
    );

    expect(onMentionCalled).toBe(false);
    await queue.close();
  });

  it("onActivity fires for every event handled, even ones that never become a mention (firehoseWatchdog.ts's staleness clock)", async () => {
    const queue = createReadingQueue(queueConnection);
    let activityCount = 0;

    const firehose = startMentionListener({
      botDid: BOT_DID,
      resolveAuthorHandle: async () => "someone.bsky.social",
      cursor: createCursorStore(cursorConnection),
      onMention: async () => {},
      onActivity: () => {
        activityCount++;
      },
    });

    await firehose.opts.handleEvent(
      makeCreateEvent({
        seq: Date.now(),
        did: "did:plc:test-full-pipeline-activity",
        text: "no mention here at all",
        facets: undefined,
      }),
    );

    expect(activityCount).toBe(1);
    await queue.close();
  });
});
