import { SUIT_ELEMENT } from "../data/suits.js";
import type { RelationshipType } from "../data/types.js";
import type { AseContext } from "../reading/aseContext.js";
import { classifySignRelationship, relationshipLabel } from "../reading/relationships.js";
import { interpolateSlots } from "./slots.js";
import { selectReadingTemplate } from "./templateSelector.js";
import type { ReadingTemplate, RenderedReading } from "./types.js";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The reading's overall relationship_type (§9.1 selection axis) is Sun-based — same
 *  convention as elementRelationship/signModalityNote in the Reading Composer (M5).
 *  Falls back to "neutral" if the user hasn't set a Sun sign, rather than fabricating a claim. */
export function getReadingRelationshipType(ctx: AseContext): RelationshipType {
  return ctx.user.sun ? classifySignRelationship(ctx.user.sun, ctx.celestial.currentSunSign) : "neutral";
}

/** §9.2's interpolation slot table. */
function buildSlots(ctx: AseContext, relationshipType: RelationshipType): Record<string, string> {
  return {
    sun: ctx.user.sun ? titleCase(ctx.user.sun) : "",
    moon: ctx.user.moon ? titleCase(ctx.user.moon) : "",
    rising: ctx.user.rising ? titleCase(ctx.user.rising) : "",
    currentSeason: `${titleCase(ctx.celestial.currentSunSign)} season`,
    anchorPlanet: titleCase(ctx.celestial.anchorPlanet),
    cardName: ctx.tarot.card.name,
    cardSuit: ctx.tarot.suit ? titleCase(ctx.tarot.suit) : "",
    cardElement: ctx.tarot.suit ? titleCase(SUIT_ELEMENT[ctx.tarot.suit]) : "",
    relationshipLabel: relationshipLabel(relationshipType),
  };
}

/** §9.1/§9.2/§9.3 end-to-end: selects a template for this AseContext and interpolates its slots. */
export function renderReading(templates: ReadingTemplate[], ctx: AseContext): RenderedReading {
  const relationshipType = getReadingRelationshipType(ctx);

  const selection = selectReadingTemplate(
    templates,
    { card: ctx.tarot.card.key, orientation: ctx.tarot.orientation, relationshipType },
    { cardName: ctx.tarot.card.name, uprightMeaning: ctx.tarot.uprightMeaning, reversedMeaning: ctx.tarot.reversedMeaning },
  );

  const slots = buildSlots(ctx, relationshipType);

  return {
    synthesis: interpolateSlots(selection.synthesis, slots),
    closing: interpolateSlots(selection.closing, slots),
    tier: selection.tier,
  };
}
