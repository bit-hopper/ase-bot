import { initEphemeris } from "./astro/ephemeris.js";
import { createAuthenticatedAgent, getBotDid } from "./atproto/client.js";
import { createBioFetcher } from "./atproto/bioFetch.js";
import { createCursorStore } from "./atproto/firehoseCursor.js";
import { startFirehoseWatchdog } from "./atproto/firehoseWatchdog.js";
import { createHandleResolver } from "./atproto/handleResolver.js";
import { startMentionListener } from "./atproto/mentionListener.js";
import { postReplyThread } from "./atproto/postReply.js";
import { postStandalonePost } from "./atproto/postStandalone.js";
import { loadEnv } from "./config/env.js";
import { getPool } from "./db/client.js";
import { createReadingQueue, enqueueReadingJob } from "./queue/queue.js";
import { createPhenomenaQueue, schedulePhenomenaChecks } from "./queue/phenomenaQueue.js";
import { createPhenomenaWorker } from "./queue/phenomenaWorker.js";
import { createWhimsyQueue, seedWhimsyChainIfEmpty } from "./queue/whimsyQueue.js";
import { createWhimsyWorker } from "./queue/whimsyWorker.js";
import { nextWhimsyDelayMs } from "./whimsy/whimsyCadence.js";
import { createRedisClient } from "./queue/redisClient.js";
import { loadReadingTemplates } from "./templates/loadTemplates.js";
import { createReadingWorker } from "./queue/worker.js";

async function main(): Promise<void> {
  const env = loadEnv();
  initEphemeris(env.swephPath);

  const agent = await createAuthenticatedAgent();
  const botDid = getBotDid(agent);

  const pool = getPool();
  const queueConnection = createRedisClient();
  const workerConnection = createRedisClient();
  const rateLimitConnection = createRedisClient();
  const cursorConnection = createRedisClient();
  const phenomenaQueueConnection = createRedisClient();
  const phenomenaWorkerConnection = createRedisClient();

  const queue = createReadingQueue(queueConnection);

  const worker = createReadingWorker(workerConnection, {
    ctxBase: {
      pool,
      ephemerisTtlHours: env.ephemerisCacheTtlHours,
      templates: loadReadingTemplates(),
      // fetchAseRecord omitted: app.ase.profile PDS writes require per-user OAuth
      // authorization, which is a real, separate feature — spec's own §11.4 v1
      // fallback is DB-only until that's built (v2 concern, not this bot's app password).
      resolverDeps: { fetchBio: createBioFetcher(agent) },
    },
    redis: rateLimitConnection,
    pool,
    postReply: async (job, reply) => {
      await postReplyThread(agent, { uri: job.mentionUri, cid: job.mentionCid }, reply);
    },
  });

  const phenomenaQueue = createPhenomenaQueue(phenomenaQueueConnection);
  await schedulePhenomenaChecks(phenomenaQueue, env.phenomenaCheckIntervalHours);

  const phenomenaWorker = createPhenomenaWorker(phenomenaWorkerConnection, {
    pool,
    checkIntervalHours: env.phenomenaCheckIntervalHours,
    postStandalone: async (text) => {
      await postStandalonePost(agent, text);
    },
  });

  // Feature-flagged off by default (WHIMSY_ENABLED) — code-complete and tested, but hasn't been
  // turned on for live unattended posting yet.
  let whimsyQueue: ReturnType<typeof createWhimsyQueue> | null = null;
  let whimsyWorker: ReturnType<typeof createWhimsyWorker> | null = null;
  let whimsyQueueConnection: ReturnType<typeof createRedisClient> | null = null;
  let whimsyWorkerConnection: ReturnType<typeof createRedisClient> | null = null;

  if (env.whimsyEnabled) {
    whimsyQueueConnection = createRedisClient();
    whimsyWorkerConnection = createRedisClient();
    whimsyQueue = createWhimsyQueue(whimsyQueueConnection);
    // Self-rescheduling delay chain (§2 round 4), not a fixed schedule — seeds the first job only
    // if the chain isn't already running from a prior process (restart-safety, see
    // seedWhimsyChainIfEmpty). processWhimsyPost re-adds the next one after every subsequent
    // tick, success or failure.
    await seedWhimsyChainIfEmpty(whimsyQueue, nextWhimsyDelayMs(new Date()));

    whimsyWorker = createWhimsyWorker(whimsyWorkerConnection, {
      pool,
      queue: whimsyQueue,
      postStandalone: async (text) => {
        await postStandalonePost(agent, text);
      },
    });
  } else {
    console.log("Whimsy posting is disabled (WHIMSY_ENABLED is not set to true).");
  }

  const cursor = createCursorStore(cursorConnection);
  const resolveAuthorHandle = createHandleResolver(agent);

  function createFirehose(onActivity: () => void): ReturnType<typeof startMentionListener> {
    return startMentionListener({
      botDid,
      resolveAuthorHandle,
      cursor,
      onActivity,
      onMention: async (job) => {
        await enqueueReadingJob(queue, job);
      },
    });
  }

  // Firehose#start() runs a `for await` read loop internally and only resolves on
  // shutdown/error — it must not be awaited here, or startup would never log and a
  // dropped connection would look identical to "still starting up."
  function runFirehose(instance: ReturnType<typeof createFirehose>): void {
    instance.start().catch((err: unknown) => {
      console.error("Firehose subscription ended unexpectedly:", err);
      process.exit(1);
    });
  }

  // A `FirehoseParseError`/`FirehoseHandlerError` on one event is already non-fatal by design
  // in @atproto/sync (caught internally, logged, loop continues) — this guards against a
  // different failure: the underlying WebSocket going stale without the library's own
  // reconnect logic recovering it, which leaves the process alive but the firehose's
  // `for await` loop parked forever. The raw network-wide firehose is extremely high-volume,
  // so total silence this long is an unambiguous dead-connection signal, not a false positive.
  const watchdog = startFirehoseWatchdog({
    timeoutMs: 5 * 60_000,
    checkIntervalMs: 60_000,
    onStale: () => {
      console.error("Firehose watchdog: no events in 5 minutes — forcing a reconnect.");
      const stale = firehose;
      firehose = createFirehose(watchdog.markActivity);
      runFirehose(firehose);
      void stale.destroy();
    },
  });

  let firehose = createFirehose(watchdog.markActivity);
  runFirehose(firehose);

  console.log(`Asé is live as ${agent.session?.handle ?? "?"} (${botDid})`);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Shutting down...");
    watchdog.stop();
    await firehose.destroy();
    await worker.close();
    await queue.close();
    await phenomenaWorker.close();
    await phenomenaQueue.close();
    await whimsyWorker?.close();
    await whimsyQueue?.close();
    await queueConnection.quit();
    await workerConnection.quit();
    await rateLimitConnection.quit();
    await cursorConnection.quit();
    await phenomenaQueueConnection.quit();
    await phenomenaWorkerConnection.quit();
    await whimsyQueueConnection?.quit();
    await whimsyWorkerConnection?.quit();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err: unknown) => {
  console.error("Fatal error starting Asé:", err);
  process.exit(1);
});
