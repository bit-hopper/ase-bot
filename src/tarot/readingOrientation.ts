import type { AspectCategory } from "../astro/aspects.js";
import type { CardOrientation } from "../data/types.js";
import { seededFloat } from "../random/seededRandom.js";

export interface OrientationResult {
  orientation: CardOrientation;
  /** Human-readable explanation for the template/LLM slot (AseContext.tarot.orientationReason). */
  reason: string;
}

export interface ReadingOrientationInput {
  isRetrograde: boolean;
  /** The category of the Anchor Transit's winning aspect (§7.2), or null if no aspect applied. */
  aspectCategory: AspectCategory | null;
  /** Pre-built `did:date:planet:card` seed (§7.1) — stable within a UTC day, varies across days. */
  seed: string;
}

const UPRIGHT_PROBABILITY: Record<"harmonious" | "challenging" | "none", number> = {
  harmonious: 0.9,
  challenging: 0.25,
  none: 0.5,
};

/**
 * §7.1/§7.2 — orientation for /reading and /daily.
 * Step 1: retrograde is a hard gate (forced reversed, no roll).
 * Step 2/3: otherwise roll a seeded, day-stable CSPRNG against the aspect-category probability.
 */
export function computeReadingOrientation(input: ReadingOrientationInput): OrientationResult {
  if (input.isRetrograde) {
    return { orientation: "reversed", reason: "Anchor Transit planet is retrograde (hard gate)" };
  }

  const category = input.aspectCategory ?? "none";
  const upright = seededFloat(input.seed) < UPRIGHT_PROBABILITY[category];

  const reason =
    category === "none"
      ? "No active aspect within orb — 50/50 roll"
      : `${category === "harmonious" ? "Harmonious" : "Challenging"} aspect — ${Math.round(UPRIGHT_PROBABILITY[category] * 100)}% upright roll`;

  return { orientation: upright ? "upright" : "reversed", reason };
}
