import type { AtpAgent } from "@atproto/api";
import type { PostRef } from "./postReply.js";

/**
 * Posts a single top-level (non-reply) post — sibling to postReply.ts's postReplyThread, but
 * with no `reply` field at all. Used for bot-originated content (phenomena posts, and later the
 * whimsy feature) rather than replies to a mention.
 */
export async function postStandalonePost(agent: AtpAgent, text: string): Promise<PostRef> {
  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: "app.bsky.feed.post",
    record: {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
    },
  });

  return { uri: result.data.uri, cid: result.data.cid };
}
