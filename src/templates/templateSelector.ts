import type { CardOrientation, RelationshipType } from "../data/types.js";
import type { ReadingTemplate, RenderedReading, TemplateMatchTier } from "./types.js";

export interface TemplateSelectionRequest {
  card: string;
  orientation: CardOrientation;
  relationshipType: RelationshipType;
}

export interface CardMeaning {
  cardName: string;
  uprightMeaning: string | null;
  reversedMeaning: string | null;
}

function find(templates: ReadingTemplate[], card: string, orientation: CardOrientation, relationshipType: RelationshipType): ReadingTemplate | undefined {
  return templates.find((t) => t.card === card && t.orientation === orientation && t.relationshipType === relationshipType);
}

/**
 * §9.3 — selects a reading's synthesis/closing text, falling back in order when no exact
 * `card x orientation x relationshipType` match exists:
 *   1. card x orientation x "neutral"
 *   2. the card's raw upright/reversed meaning, no synthesis line
 *   3. a "[Template pending: ...]" placeholder — a dev-time signal only; must never ship (§17.3).
 */
export function selectReadingTemplate(templates: ReadingTemplate[], request: TemplateSelectionRequest, cardMeaning: CardMeaning): RenderedReading {
  const exact = find(templates, request.card, request.orientation, request.relationshipType);
  if (exact) {
    return { synthesis: exact.synthesis, closing: exact.closing, tier: "exact" };
  }

  const neutral = request.relationshipType === "neutral" ? undefined : find(templates, request.card, request.orientation, "neutral");
  if (neutral) {
    return { synthesis: neutral.synthesis, closing: neutral.closing, tier: "neutral_fallback" };
  }

  const rawMeaning = request.orientation === "upright" ? cardMeaning.uprightMeaning : cardMeaning.reversedMeaning;
  if (rawMeaning) {
    return { synthesis: rawMeaning, closing: "", tier: "raw_meaning_fallback" };
  }

  const tier: TemplateMatchTier = "placeholder";
  return {
    synthesis: `[Template pending: ${cardMeaning.cardName} · ${request.orientation} · ${request.relationshipType}]`,
    closing: "",
    tier,
  };
}
