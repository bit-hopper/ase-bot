import { describe, expect, it } from "vitest";
import { mentionsBotDid } from "../../src/atproto/mentionFacets.js";

const BOT_DID = "did:plc:asebot0000000000000000000";
const OTHER_DID = "did:plc:someoneelse0000000000000";

describe("mentionsBotDid (§11.2 — facets only, never raw string match)", () => {
  it("detects a proper facet-encoded mention of the bot", () => {
    const record = {
      text: "@asebot.bsky.social /reading",
      facets: [{ features: [{ $type: "app.bsky.richtext.facet#mention", did: BOT_DID }] }],
    };
    expect(mentionsBotDid(record, BOT_DID)).toBe(true);
  });

  it("ignores a mention facet for a different DID", () => {
    const record = {
      text: "@someoneelse.bsky.social hi",
      facets: [{ features: [{ $type: "app.bsky.richtext.facet#mention", did: OTHER_DID }] }],
    };
    expect(mentionsBotDid(record, BOT_DID)).toBe(false);
  });

  it("does not treat plain text containing the handle string as a mention (no facet)", () => {
    // The whole point of §11.2: "asebot.bsky.social" appearing as plain text must not trigger anything.
    const record = { text: "hey asebot.bsky.social what's up", facets: undefined };
    expect(mentionsBotDid(record, BOT_DID)).toBe(false);
  });

  it("does not treat a facet whose did happens to match but wrong feature type as a mention", () => {
    const record = {
      text: "check this out",
      facets: [{ features: [{ $type: "app.bsky.richtext.facet#link", did: BOT_DID }] }],
    };
    expect(mentionsBotDid(record, BOT_DID)).toBe(false);
  });

  it("finds a bot mention among multiple facets/features on the same post", () => {
    const record = {
      text: "@someoneelse.bsky.social and @asebot.bsky.social /pull",
      facets: [
        { features: [{ $type: "app.bsky.richtext.facet#mention", did: OTHER_DID }] },
        { features: [{ $type: "app.bsky.richtext.facet#link", did: undefined }, { $type: "app.bsky.richtext.facet#mention", did: BOT_DID }] },
      ],
    };
    expect(mentionsBotDid(record, BOT_DID)).toBe(true);
  });

  it("handles a post with no facets at all", () => {
    expect(mentionsBotDid({ text: "just a normal post" }, BOT_DID)).toBe(false);
  });
});
