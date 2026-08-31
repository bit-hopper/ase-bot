import { describe, expect, it } from "vitest";
import type { AtpAgent } from "@atproto/api";
import { createBioFetcher } from "../../src/atproto/bioFetch.js";

function fakeAgent(getProfile: (params: { actor: string }) => Promise<unknown>): AtpAgent {
  return { getProfile } as unknown as AtpAgent;
}

describe("createBioFetcher", () => {
  it("maps description/handle/displayName to BioLookup", async () => {
    const agent = fakeAgent(async () => ({ data: { description: "Leo Sun Pisces Moon", handle: "user.bsky.social", displayName: "User" } }));
    const fetchBio = createBioFetcher(agent);

    const result = await fetchBio("did:plc:someone");
    expect(result).toEqual({ bioRaw: "Leo Sun Pisces Moon", handle: "user.bsky.social", displayName: "User" });
  });

  it("returns null when the profile has no bio/description", async () => {
    const agent = fakeAgent(async () => ({ data: { handle: "user.bsky.social" } }));
    const fetchBio = createBioFetcher(agent);
    expect(await fetchBio("did:plc:someone")).toBeNull();
  });

  it("returns null when the profile fetch throws (not found / unresolvable)", async () => {
    const agent = fakeAgent(async () => {
      throw new Error("not found");
    });
    const fetchBio = createBioFetcher(agent);
    expect(await fetchBio("did:plc:someone")).toBeNull();
  });

  it("omits displayName when the profile doesn't have one", async () => {
    const agent = fakeAgent(async () => ({ data: { description: "just a bio", handle: "user.bsky.social" } }));
    const fetchBio = createBioFetcher(agent);
    const result = await fetchBio("did:plc:someone");
    expect(result).toEqual({ bioRaw: "just a bio", handle: "user.bsky.social" });
  });
});
