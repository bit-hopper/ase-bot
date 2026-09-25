import { ZODIAC_SIGNS } from "../data/types.js";
import { pickWhimsyFragments, type WhimsyFragments } from "./composeWhimsyPost.js";
import type { WhimsyPostLogRow } from "./whimsyPostLog.js";

/** §2 round 2: reject an exact (sign, directive, punchline) match seen in the last ~50 posts. */
const EXACT_COMBO_LOOKBACK = 50;
/** §2 round 2: reject reusing the same directive or punchline (any sign) within the last ~10 posts. */
const FRAGMENT_LOOKBACK = 10;
/** Reject a sign seen anywhere in the last (12 - 1) posts, so every other sign has to come up
 *  before one repeats — a full, randomly-ordered cycle through all 12 rather than just no
 *  back-to-back repeat. */
const SIGN_CYCLE_LOOKBACK = ZODIAC_SIGNS.length - 1;
/** Defensive bound on selectUniqueWhimsyFragments's retry loop — see its own comment. */
const MAX_ATTEMPTS = 200;

/** `recentPosts` must be newest-first (as returned by getRecentWhimsyPosts). */
export function isWhimsyPostAllowed(candidate: WhimsyFragments, recentPosts: readonly WhimsyPostLogRow[]): boolean {
  const signWindow = recentPosts.slice(0, SIGN_CYCLE_LOOKBACK);
  if (signWindow.some((p) => p.sign === candidate.sign)) return false; // must cycle through every other sign first

  const fragmentWindow = recentPosts.slice(0, FRAGMENT_LOOKBACK);
  if (fragmentWindow.some((p) => p.directive === candidate.directive)) return false;
  if (candidate.punchline !== null && fragmentWindow.some((p) => p.punchline === candidate.punchline)) return false;

  const comboWindow = recentPosts.slice(0, EXACT_COMBO_LOOKBACK);
  const exactComboSeen = comboWindow.some(
    (p) => p.sign === candidate.sign && p.directive === candidate.directive && p.punchline === candidate.punchline,
  );
  if (exactComboSeen) return false;

  return true;
}

/**
 * Repeatedly draws candidates via pickWhimsyFragments until one clears every repeat-avoidance
 * rule against `recentPosts`. MAX_ATTEMPTS is a defensive bound, not an expected case — even at
 * the sign check's worst case (11 of 12 signs excluded, a 1-in-12 chance per draw), a valid
 * candidate is found within ~12 draws on average; 200 leaves ample margin. The bound mainly
 * guards against a future pool shrinking enough to make this a real infinite loop.
 */
export function selectUniqueWhimsyFragments(recentPosts: readonly WhimsyPostLogRow[]): WhimsyFragments {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = pickWhimsyFragments();
    if (isWhimsyPostAllowed(candidate, recentPosts)) return candidate;
  }
  throw new Error(`selectUniqueWhimsyFragments: no valid candidate found after ${MAX_ATTEMPTS} attempts`);
}
