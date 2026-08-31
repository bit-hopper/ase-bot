import { describe, expect, it } from "vitest";
import type { AtpAgent } from "@atproto/api";
import { createHandleResolver } from "../../src/atproto/handleResolver.js";

function fakeAgent(getProfile: (params: { actor: string }) => Promise<unknown>): AtpAgent {
  return { getProfile } as unknown as AtpAgent;
}

describe("createHandleResolver", () => {
  it("resolves a DID to its current handle", async () => {
    const agent = fakeAgent(async () => ({ data: { handle: "user.bsky.social" } }));
    const resolve = createHandleResolver(agent);
    expect(await resolve("did:plc:someone")).toBe("user.bsky.social");
  });

  it("falls back to the DID itself when resolution fails", async () => {
    const agent = fakeAgent(async () => {
      throw new Error("not found");
    });
    const resolve = createHandleResolver(agent);
    expect(await resolve("did:plc:someone")).toBe("did:plc:someone");
  });
});
