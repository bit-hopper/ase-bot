import { IdResolver } from "@atproto/identity";
import { Firehose } from "@atproto/sync";
import type { CursorStore } from "./firehoseCursor.js";
import { mentionsBotDid, type PostRecordLike } from "./mentionFacets.js";
import type { ReadingJob } from "../queue/types.js";

export interface MentionListenerDeps {
  botDid: string;
  resolveAuthorHandle: (did: string) => Promise<string>;
  onMention: (job: ReadingJob) => Promise<void>;
  onError?: (err: Error) => void;
  /** Persists stream position across restarts/reconnects — see firehoseCursor.ts. Strongly recommended in production. */
  cursor?: CursorStore;
  /** Called on every event the firehose actually delivers (before any filtering) — feeds
   *  firehoseWatchdog.ts's staleness clock, since a dead connection stops calling this
   *  entirely rather than throwing. */
  onActivity?: () => void;
}

/**
 * §11.2 — subscribes to com.atproto.sync.subscribeRepos (via the official @atproto/sync
 * Firehose client), filters to app.bsky.feed.post creates, and detects mentions via facets
 * only (never raw string match — see mentionFacets.ts). §12.2's job.command is the post's
 * full text; M7's parser already tolerates leading mention text when locating the "/command" token.
 */
export function startMentionListener(deps: MentionListenerDeps): Firehose {
  const idResolver = new IdResolver();

  return new Firehose({
    idResolver,
    filterCollections: ["app.bsky.feed.post"],
    onError: deps.onError ?? ((err) => console.error("Firehose error:", err)),
    // Skips per-commit cryptographic signature verification, which otherwise resolves the
    // author's DID document over the network for every single commit on the entire
    // network — at firehose scale that's a severe bottleneck for a bot that only cares
    // about a tiny fraction of posts (mentions), and it's what caused real timeouts/lag
    // live. A reply bot isn't a security-critical indexer; the tradeoff is standard for
    // this kind of lightweight consumer.
    unauthenticatedCommits: true,
    // Found live: `identity`/`account`/`sync` events still trigger a real network DID
    // resolution in @atproto/sync's parseEvt (unauthenticatedCommits only covers commit
    // parsing) — Firehose#start()'s read loop processes events strictly serially (one
    // `await` at a time), so a single slow/hanging identity resolution blocks delivery of
    // every event behind it, including legitimate mention commits. Excluding all three
    // event types we never use removes that blocking path entirely rather than trying to
    // tolerate its latency.
    excludeIdentity: true,
    excludeAccount: true,
    excludeSync: true,
    ...(deps.cursor ? { getCursor: () => deps.cursor!.get() } : {}),
    handleEvent: async (evt) => {
      deps.onActivity?.();

      // Persisted regardless of event type/match so a resume only replays the actual gap, not
      // an unbounded backlog of skipped-over events.
      await deps.cursor?.set(evt.seq);

      if (evt.event !== "create") return;
      if (evt.collection !== "app.bsky.feed.post") return;

      const record = evt.record as unknown as PostRecordLike;
      if (!mentionsBotDid(record, deps.botDid)) return;

      const authorHandle = await deps.resolveAuthorHandle(evt.did);

      const job: ReadingJob = {
        mentionUri: evt.uri.toString(),
        mentionCid: evt.cid.toString(),
        authorDid: evt.did,
        authorHandle,
        command: record.text,
        enqueuedAt: new Date().toISOString(),
      };

      await deps.onMention(job);
    },
  });
}
