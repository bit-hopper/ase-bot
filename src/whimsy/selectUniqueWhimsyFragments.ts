import { pickWhimsyFragments, type WhimsyFragments } from "./composeWhimsyPost.js";
import type { WhimsyPostLogRow } from "./whimsyPostLog.js";

/** §2 round 2: reject an exact (sign, directive, punchline) match seen in the last ~50 posts. */
const EXACT_COMBO_LOOKBACK = 50;
/** §2 round 2: reject reusing the same directive or punchline (any sign) within the last ~10 posts. */
const FRAGMENT_LOOKBACK = 10;
/** Defensive bound on selectUniqueWhimsyFragments's retry loop — see its own comment. */
const MAX_ATTEMPTS = 200;

/** `recentPosts` must be newest-first (as returned by getRecentWhimsyPosts). */
export function isWhimsyPostAllowed(candidate: WhimsyFragments, recentPosts: readonly WhimsyPostLogRow[]): boolean {
  const lastPost = recentPosts[0];
  if (lastPost && lastPost.sign === candidate.sign) return false; // never repeat the immediately-preceding sign

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
 * rule against `recentPosts`. MAX_ATTEMPTS is a defensive bound, not an expected case — with
 * pools this size (217 directives, 80 punchlines) a valid candidate is found within a handful of
 * draws in practice; the bound only guards against a future pool shrinking enough to make this a
 * real infinite loop.
 */
export function selectUniqueWhimsyFragments(recentPosts: readonly WhimsyPostLogRow[]): WhimsyFragments {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = pickWhimsyFragments();
    if (isWhimsyPostAllowed(candidate, recentPosts)) return candidate;
  }
  throw new Error(`selectUniqueWhimsyFragments: no valid candidate found after ${MAX_ATTEMPTS} attempts`);
}
