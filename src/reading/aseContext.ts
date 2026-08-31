import { computeMoonPhase } from "../astro/moonPhase.js";
import type { Decan, MoonPhase, Planet, TarotSuit, ZodiacSign } from "../data/types.js";
import type { ProfileSource } from "../profile/types.js";
import type { NatalPlacements } from "../tarot/natal.js";
import type { ReadingSelection, TransitSnapshot } from "../tarot/readingSelection.js";
import { computeActiveAspects, type ActiveAspect } from "./activeAspects.js";
import { getLifeDomainHint } from "./lifeDomainHint.js";
import {
  classifySignRelationship,
  describeElementRelationship,
  describeModalityNote,
  describeSignToCurrentSeason,
  relationshipLabel,
} from "./relationships.js";

export interface TarotCard {
  key: string;
  name: string;
}

/** §8.1 `AseContext`. Only `/divine` is built here — /pull, /chart, /moon, and /sign
 *  don't go through the Reading Composer / Template Renderer synthesis system at all
 *  (§9.4, §10.4-10.6 render those directly from simpler data), so this covers the one
 *  command shape ("Reading Composer") the spec's own §2.1 layer name is actually about. */
export interface AseContext {
  user: {
    did: string;
    handle: string;
    sun: ZodiacSign | null;
    moon: ZodiacSign | null;
    rising: ZodiacSign | null;
    profileSource: "ase_record" | "bio" | "command" | "none";
    missingPlacements: string[];
  };

  celestial: {
    currentSunSign: ZodiacSign;
    moonSign: ZodiacSign;
    moonPhase: MoonPhase;
    anchorPlanet: Planet;
    anchorPlanetDegree: number;
    anchorPlanetIsRetrograde: boolean;
    anchorPlanetSign: ZodiacSign;
    anchorDecan: Decan;
    activeAspects: ActiveAspect[];
  };

  tarot: {
    card: TarotCard;
    cardType: "major" | "minor";
    suit: TarotSuit | null;
    number: number | null;
    orientation: "upright" | "reversed";
    orientationReason: string;
    uprightMeaning: string;
    reversedMeaning: string;
    decanRuler: Planet | null;
  };

  relationships: {
    sunToCurrentSign: string;
    moonToCurrentSign: string;
    risingToCurrentSign: string;
    elementRelationship: string;
    signModalityNote: string;
  };

  lifedomainHint: string;
}

export interface BuildAseContextInput {
  did: string;
  handle: string;
  natal: NatalPlacements;
  /** M4's 4-value ParsedPlacements.source (includes "cache", unlike AseContext.user.profileSource — see mapping note below). */
  profileSource: ProfileSource;
  positions: Record<Planet, TransitSnapshot>;
  selection: ReadingSelection;
}

/**
 * §3.1's resolver reports "cache" for a fast-path DB read regardless of whether the
 * underlying stored value was originally bio- or command-sourced (that provenance isn't
 * exposed on ParsedPlacements). AseContext.user.profileSource has no "cache" value at all
 * (§8.1: ase_record | bio | command | none) — mapped here to "bio" as the more common case;
 * cosmetic either way since nothing branches on this beyond display/logging.
 */
function toContextProfileSource(source: ProfileSource, hasAnyPlacement: boolean): AseContext["user"]["profileSource"] {
  if (!hasAnyPlacement) return "none";
  return source === "cache" ? "bio" : source;
}

export function buildAseContext(input: BuildAseContextInput): AseContext {
  const { natal, positions, selection } = input;
  const sunPosition = positions.sun;
  const moonPosition = positions.moon;
  const anchorPosition = positions[selection.anchor.planet];

  const missingPlacements = (["sun", "moon", "rising"] as const).filter((p) => !natal[p]);
  const hasAnyPlacement = missingPlacements.length < 3;

  return {
    user: {
      did: input.did,
      handle: input.handle,
      sun: natal.sun,
      moon: natal.moon,
      rising: natal.rising,
      profileSource: toContextProfileSource(input.profileSource, hasAnyPlacement),
      missingPlacements,
    },

    celestial: {
      currentSunSign: sunPosition.sign,
      moonSign: moonPosition.sign,
      moonPhase: computeMoonPhase(sunPosition.longitude, moonPosition.longitude),
      anchorPlanet: selection.anchor.planet,
      anchorPlanetDegree: anchorPosition.longitude,
      anchorPlanetIsRetrograde: anchorPosition.isRetrograde,
      anchorPlanetSign: selection.decan.sign,
      anchorDecan: selection.decan.decan,
      activeAspects: computeActiveAspects(positions, natal),
    },

    tarot: {
      card: { key: selection.decan.cardKey, name: selection.decan.cardName },
      cardType: "minor", // decan router only ever yields the 36 pip cards in v1 (§16 defers Major Arcana in /reading to v2)
      suit: selection.decan.suit,
      number: selection.decan.number,
      orientation: selection.orientation.orientation,
      orientationReason: selection.orientation.reason,
      uprightMeaning: selection.decan.uprightMeaning,
      reversedMeaning: selection.decan.reversedMeaning,
      decanRuler: selection.decan.chaldeanRuler,
    },

    relationships: buildRelationships(natal, sunPosition.sign),

    lifedomainHint: getLifeDomainHint(selection.anchor.planet),
  };
}

function buildRelationships(natal: NatalPlacements, currentSunSign: ZodiacSign): AseContext["relationships"] {
  return {
    sunToCurrentSign: natal.sun ? describeSignToCurrentSeason(natal.sun, currentSunSign) : "Sun sign not set",
    moonToCurrentSign: natal.moon ? describeSignToCurrentSeason(natal.moon, currentSunSign) : "Moon sign not set",
    risingToCurrentSign: natal.rising ? describeSignToCurrentSeason(natal.rising, currentSunSign) : "Rising sign not set",
    elementRelationship: natal.sun ? describeElementRelationship(natal.sun, currentSunSign) : "Sun sign not set",
    signModalityNote: natal.sun ? describeModalityNote(natal.sun, currentSunSign) : "Sun sign not set",
  };
}

export { classifySignRelationship, relationshipLabel };
