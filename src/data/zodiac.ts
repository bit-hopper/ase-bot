import { ZODIAC_SIGNS, type Element, type Modality, type ZodiacSign } from "./types.js";

export interface ZodiacEntry {
  sign: ZodiacSign;
  glyph: string;
  element: Element;
  modality: Modality;
  /** 0-11, Aries first. Used to derive opposite/square relationships. */
  order: number;
}

const GLYPHS: Record<ZodiacSign, string> = {
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  pisces: "♓",
};

const ELEMENT_BY_SIGN: Record<ZodiacSign, Element> = {
  aries: "fire",
  taurus: "earth",
  gemini: "air",
  cancer: "water",
  leo: "fire",
  virgo: "earth",
  libra: "air",
  scorpio: "water",
  sagittarius: "fire",
  capricorn: "earth",
  aquarius: "air",
  pisces: "water",
};

const MODALITY_BY_SIGN: Record<ZodiacSign, Modality> = {
  aries: "cardinal",
  cancer: "cardinal",
  libra: "cardinal",
  capricorn: "cardinal",
  taurus: "fixed",
  leo: "fixed",
  scorpio: "fixed",
  aquarius: "fixed",
  gemini: "mutable",
  virgo: "mutable",
  sagittarius: "mutable",
  pisces: "mutable",
};

export const ZODIAC: Record<ZodiacSign, ZodiacEntry> = Object.fromEntries(
  ZODIAC_SIGNS.map((sign, order) => [
    sign,
    { sign, glyph: GLYPHS[sign], element: ELEMENT_BY_SIGN[sign], modality: MODALITY_BY_SIGN[sign], order },
  ]),
) as Record<ZodiacSign, ZodiacEntry>;

export function oppositeSign(sign: ZodiacSign): ZodiacSign {
  const order = (ZODIAC[sign].order + 6) % 12;
  return ZODIAC_SIGNS[order]!;
}

/** The two signs square (90°) to the given sign — same modality, not the same sign. */
export function squareSigns(sign: ZodiacSign): [ZodiacSign, ZodiacSign] {
  const order = ZODIAC[sign].order;
  return [ZODIAC_SIGNS[(order + 3) % 12]!, ZODIAC_SIGNS[(order + 9) % 12]!];
}
