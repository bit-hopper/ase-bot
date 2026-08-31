import { describe, expect, it } from "vitest";
import { formatBigThreeReading } from "../../src/output/formatBigThreeReading.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";
import type { RenderedBigThree } from "../../src/templates/renderBigThree.js";
import type { NatalPlacements } from "../../src/tarot/natal.js";

const rendered: RenderedBigThree = {
  themeHeaderLine: "The Hermit — Virgo season",
  themeText: "Solitary searching for deeper truth, quiet introspection, wisdom that becomes guidance for others. Virgo's focus complements your Cancer instincts — different rhythms, easy to move in together.",
  moodHeaderLine: "Moon in Pisces",
  moodText: "Transiting Pisces moves with the same current as your natal Scorpio Moon — today's feelings arrive undiluted, not at odds with your usual depth.",
  ground: {
    headerLine: "Uranus in Taurus · 4th House — Home & Roots",
    text: "This is playing out in your foundations — home, family, the private ground you stand on.",
  },
  closing: "What is The Hermit asking you to notice today?",
};

const natal: NatalPlacements = { sun: "cancer", moon: "scorpio", rising: "aquarius" };

describe("formatBigThreeReading", () => {
  it("threads into multiple posts (the full combined text exceeds 300 chars)", () => {
    const thread = formatBigThreeReading(natal, rendered);
    expect(thread.length).toBeGreaterThan(1);
    for (const post of thread) expect(fitsInOnePost(post)).toBe(true);
  });

  it("includes the natal line, all three section headers, and the closing line somewhere in the thread", () => {
    const full = formatBigThreeReading(natal, rendered).join("\n");
    expect(full).toContain("♋ Cancer Sun");
    expect(full).toContain("♏ Scorpio Moon");
    expect(full).toContain("♒ Aquarius Rising");
    expect(full).toContain("THEME");
    expect(full).toContain("MOOD");
    expect(full).toContain("GROUND");
    expect(full).toContain(rendered.closing);
  });

  it("omits the GROUND section entirely when there is no ground selection", () => {
    const noGround: RenderedBigThree = { ...rendered, ground: null };
    const full = formatBigThreeReading(natal, noGround).join("\n");
    expect(full).not.toContain("GROUND");
  });

  it("omits missing natal placements from the natal line specifically", () => {
    const sunOnly: NatalPlacements = { sun: "cancer", moon: null, rising: null };
    const thread = formatBigThreeReading(sunOnly, rendered);
    const natalLine = thread[0]!.split("\n")[0];
    expect(natalLine).toBe("♋ Cancer Sun");
  });

  it("returns a single post when the combined content is short enough to fit", () => {
    const short: RenderedBigThree = {
      themeHeaderLine: "The Fool",
      themeText: "New beginnings.",
      moodHeaderLine: "Moon in Aries",
      moodText: "A fresh start.",
      ground: null,
      closing: "What's next?",
    };
    const thread = formatBigThreeReading({ sun: null, moon: null, rising: null }, short);
    expect(thread).toHaveLength(1);
  });
});
