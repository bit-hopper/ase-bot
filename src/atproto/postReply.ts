import type { AtpAgent } from "@atproto/api";
import type { ReplyThread } from "../output/replyThread.js";

export interface PostRef {
  uri: string;
  cid: string;
}

/**
 * §11.3 — posts a ReplyThread as a genuine reply chain: `reply.root` is fixed at the original
 * mention post for every post in the thread (per spec's literal definition — not a deeper
 * conversation ancestor), while `reply.parent` advances to whichever post came immediately before it.
 */
export async function postReplyThread(agent: AtpAgent, mentionPost: PostRef, thread: ReplyThread): Promise<PostRef[]> {
  const root = mentionPost;
  const posted: PostRef[] = [];
  let parent = mentionPost;

  for (const text of thread) {
    const result = await agent.com.atproto.repo.createRecord({
      repo: agent.assertDid,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text,
        reply: { root, parent },
        createdAt: new Date().toISOString(),
      },
    });

    const ref: PostRef = { uri: result.data.uri, cid: result.data.cid };
    posted.push(ref);
    parent = ref;
  }

  return posted;
}
