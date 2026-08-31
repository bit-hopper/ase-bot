import { describe, expect, it } from "vitest";
import { formatHelpFull, formatHelpQuick } from "../../src/output/formatHelp.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";

describe("formatHelpQuick (default /help)", () => {
  it("fits in a single post", () => {
    const thread = formatHelpQuick();
    expect(thread).toHaveLength(1);
    expect(fitsInOnePost(thread[0]!)).toBe(true);
  });

  it("points to /help list-all for the rest of the commands", () => {
    expect(formatHelpQuick()[0]).toContain("/help list-all");
  });

  it("includes the getting-started line and the two most important commands", () => {
    const post = formatHelpQuick()[0]!;
    expect(post).toContain("To get started: /set sun [your sun sign]");
    expect(post).toContain("/set sun [sign] moon [sign] rising [sign]");
    expect(post).toContain("/reading");
  });
});

describe("formatHelpFull (/help list-all)", () => {
  it("mentions every command", () => {
    const full = formatHelpFull().join("\n");
    for (const cmd of ["/set", "/reading", "/divine", "/pull", "/chart", "/moon", "/sign", "/help"]) {
      expect(full).toContain(cmd);
    }
  });

  it("splits into multiple posts, each within the 300-char limit", () => {
    const thread = formatHelpFull();
    expect(thread.length).toBeGreaterThan(1);
    for (const post of thread) expect(fitsInOnePost(post)).toBe(true);
  });
});
