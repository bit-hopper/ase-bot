import { describe, expect, it } from "vitest";
import { formatChart } from "../../src/output/formatChart.js";

describe("formatChart (§10.4)", () => {
  it("renders all three placements and a full 10-block bar for a mono-element chart", () => {
    // Sun/Moon/Rising all fire signs -> Fire bar fully filled, others empty
    const [post] = formatChart({ sun: "aries", moon: "leo", rising: "sagittarius" });
    expect(post).toContain("♈ SUN: Aries");
    expect(post).toContain("♌ MOON: Leo");
    expect(post).toContain("♐ RISING: Sagittarius");
    expect(post).toContain("🔥 ██████████");
    expect(post).toContain("💧 ░░░░░░░░░░");
    expect(post).toContain("Dominant energy: Fire");
  });

  it("renders a partial bar for a mixed-element chart (2/3 -> 7 blocks)", () => {
    // Sun+Moon fire (2), Rising air (1) -> Fire ~7 blocks, Air ~3 blocks
    const [post] = formatChart({ sun: "aries", moon: "leo", rising: "libra" });
    expect(post).toContain("🔥 ███████░░░");
    expect(post).toContain("🌬️ ███░░░░░░░");
  });

  it("shows 'Not set' for missing placements without crashing", () => {
    const [post] = formatChart({ sun: "leo", moon: null, rising: null });
    expect(post).toContain("MOON: Not set");
    expect(post).toContain("RISING: Not set");
  });

  it("prompts /set when nothing at all is set", () => {
    const [post] = formatChart({ sun: null, moon: null, rising: null });
    expect(post).toContain("/set sun");
  });
});
