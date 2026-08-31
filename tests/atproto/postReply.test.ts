import { describe, expect, it } from "vitest";
import { postReplyThread } from "../../src/atproto/postReply.js";
import type { AtpAgent } from "@atproto/api";

function makeFakeAgent() {
  let counter = 0;
  const calls: Array<{ record: unknown }> = [];

  const agent = {
    assertDid: "did:plc:asebot0000000000000000000",
    com: {
      atproto: {
        repo: {
          createRecord: async (params: { record: unknown }) => {
            calls.push({ record: params.record });
            counter++;
            return { data: { uri: `at://did:plc:asebot/app.bsky.feed.post/reply${counter}`, cid: `cid-reply-${counter}` } };
          },
        },
      },
    },
  };

  return { agent: agent as unknown as AtpAgent, calls };
}

const MENTION_POST = { uri: "at://did:plc:author/app.bsky.feed.post/mention1", cid: "cid-mention-1" };

describe("postReplyThread (§11.3)", () => {
  it("posts a single-post thread with root=parent=the mention post", async () => {
    const { agent, calls } = makeFakeAgent();
    const posted = await postReplyThread(agent, MENTION_POST, ["Hello there"]);

    expect(posted).toHaveLength(1);
    expect(calls[0]!.record).toMatchObject({
      text: "Hello there",
      reply: { root: MENTION_POST, parent: MENTION_POST },
    });
  });

  it("chains a multi-post thread: root stays fixed, parent advances each post", async () => {
    const { agent, calls } = makeFakeAgent();
    const posted = await postReplyThread(agent, MENTION_POST, ["Post 1", "Post 2", "Post 3"]);

    expect(posted).toHaveLength(3);

    expect(calls[0]!.record).toMatchObject({ text: "Post 1", reply: { root: MENTION_POST, parent: MENTION_POST } });
    expect(calls[1]!.record).toMatchObject({ text: "Post 2", reply: { root: MENTION_POST, parent: posted[0] } });
    expect(calls[2]!.record).toMatchObject({ text: "Post 3", reply: { root: MENTION_POST, parent: posted[1] } });
  });

  it("returns the posted refs in order", async () => {
    const { agent } = makeFakeAgent();
    const posted = await postReplyThread(agent, MENTION_POST, ["a", "b"]);
    expect(posted[0]!.uri).toContain("reply1");
    expect(posted[1]!.uri).toContain("reply2");
  });
});
