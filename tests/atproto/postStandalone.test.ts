import { describe, expect, it } from "vitest";
import { postStandalonePost } from "../../src/atproto/postStandalone.js";
import type { AtpAgent } from "@atproto/api";

function makeFakeAgent() {
  const calls: Array<{ record: unknown }> = [];

  const agent = {
    assertDid: "did:plc:asebot0000000000000000000",
    com: {
      atproto: {
        repo: {
          createRecord: async (params: { record: unknown }) => {
            calls.push({ record: params.record });
            return { data: { uri: "at://did:plc:asebot/app.bsky.feed.post/standalone1", cid: "cid-standalone-1" } };
          },
        },
      },
    },
  };

  return { agent: agent as unknown as AtpAgent, calls };
}

describe("postStandalonePost", () => {
  it("posts a top-level record with the given text and no reply field", async () => {
    const { agent, calls } = makeFakeAgent();
    await postStandalonePost(agent, "Mercury turns retrograde in Virgo.");

    expect(calls[0]!.record).toMatchObject({ text: "Mercury turns retrograde in Virgo." });
    expect(calls[0]!.record).not.toHaveProperty("reply");
  });

  it("returns the posted PostRef", async () => {
    const { agent } = makeFakeAgent();
    const ref = await postStandalonePost(agent, "hello");
    expect(ref).toEqual({ uri: "at://did:plc:asebot/app.bsky.feed.post/standalone1", cid: "cid-standalone-1" });
  });
});
