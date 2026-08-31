import type { CardOrientation, TarotCardMeta } from "../data/types.js";

export interface PullRenderOutput {
  cardName: string;
  /** e.g. "Upright · Fire" (Minor Arcana) or "Reversed · Major Arcana" (Major Arcana). */
  orientationLine: string;
  /** Verbatim from card data (§9.4) — a dev-time placeholder if this card's meaning hasn't been authored yet. */
  meaning: string;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** §9.4 — /pull's output is assembled directly from card data; no synthesis blocks, no interpolation. */
export function renderPullOutput(card: TarotCardMeta, orientation: CardOrientation): PullRenderOutput {
  const archetypeOrElement = card.type === "major" ? "Major Arcana" : card.element ? titleCase(card.element) : "";
  const meaning = orientation === "upright" ? card.uprightMeaning : card.reversedMeaning;

  return {
    cardName: card.name,
    orientationLine: `${titleCase(orientation)} · ${archetypeOrElement}`,
    meaning: meaning ?? `[Card meaning pending: ${card.name} · ${orientation}]`,
  };
}
