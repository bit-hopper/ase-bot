import { describe, expect, it } from "vitest";
import { formatSign } from "../../src/output/formatSign.js";

describe("formatSign (§4.1, §10 gap)", () => {
  it("shows the glyph, sign name, and keyword description", () => {
    const [post] = formatSign("leo");
    expect(post).toContain("♌");
    expect(post).toContain("Leo");
    expect(post!.length).toBeGreaterThan(5);
  });

  it("prompts /set when no sun sign is set", () => {
    const [post] = formatSign(null);
    expect(post).toContain("/set sun");
  });
});
