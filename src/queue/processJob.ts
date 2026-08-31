import type { Redis } from "ioredis";
import type pg from "pg";
import { handleCommand } from "../commands/router.js";
import type { CommandContext } from "../commands/context.js";
import { parseCommand } from "../commands/parser.js";
import type { ReplyThread } from "../output/replyThread.js";
import { upsertUserProfile } from "../profile/userProfileStore.js";
import { checkRateLimit, rateLimitCategoryFor, recordInteraction } from "./rateLimiter.js";
import type { ReadingJob } from "./types.js";

/** §12.1 — jobs older than this (measured from enqueue time) are discarded, not processed. */
export const DEFAULT_JOB_TTL_MS = 30_000;

export interface ProcessJobDeps {
  /** Everything CommandContext needs except the per-job did/handle/now. */
  ctxBase: Omit<CommandContext, "did" | "handle" | "now">;
  redis: Redis;
  pool: pg.Pool;
  /** §12.3 step 10 — the actual XRPC post. Stubbed until M8; tests supply a fake. */
  postReply: (job: ReadingJob, reply: ReplyThread) => Promise<void>;
  now?: () => Date;
  jobTtlMs?: number;
}

export type ProcessJobOutcome = { outcome: "stale" } | { outcome: "rate_limited"; reply: ReplyThread } | { outcome: "posted"; reply: ReplyThread };

/** §12.3 — steps 1-11: parse, resolve, render (all via M7's handleCommand), rate-limit, post, and record. */
export async function processReadingJob(deps: ProcessJobDeps, job: ReadingJob): Promise<ProcessJobOutcome> {
  const now = (deps.now ?? (() => new Date()))();
  const ttlMs = deps.jobTtlMs ?? DEFAULT_JOB_TTL_MS;

  if (now.getTime() - new Date(job.enqueuedAt).getTime() > ttlMs) {
    return { outcome: "stale" };
  }

  const { command } = parseCommand(job.command);
  const category = rateLimitCategoryFor(command);

  const rateLimit = await checkRateLimit(deps.redis, job.authorDid, category, now);
  if (!rateLimit.allowed) {
    const reply: ReplyThread = [rateLimit.reply!];
    await deps.postReply(job, reply);
    return { outcome: "rate_limited", reply };
  }

  const ctx: CommandContext = { ...deps.ctxBase, did: job.authorDid, handle: job.authorHandle, now };
  const reply = await handleCommand(ctx, job.command);

  await deps.postReply(job, reply);
  await recordInteraction(deps.redis, job.authorDid, category, now);

  if (category === "reading") {
    await upsertUserProfile(deps.pool, job.authorDid, { lastReadingAt: now });
  } else if (category === "pull") {
    await upsertUserProfile(deps.pool, job.authorDid, { lastPullAt: now });
  }

  return { outcome: "posted", reply };
}
