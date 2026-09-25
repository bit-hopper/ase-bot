/** §10 — Bluesky's per-post character limit. */
export const POST_CHAR_LIMIT = 300;

/** An ordered sequence of posts to send as a reply chain (post 1 is the direct reply; each
 *  subsequent post replies to the one before it). A single-element array is just one post. */
export type ReplyThread = string[];

export function fitsInOnePost(text: string): boolean {
  return [...text].length <= POST_CHAR_LIMIT;
}

/** Joins sections with a blank line between them, the way every §10 layout is laid out. */
export function joinSections(...sections: string[]): string {
  return sections.filter((s) => s.length > 0).join("\n\n");
}

/**
 * Greedily packs an ordered list of text blocks into as few posts as possible without exceeding
 * POST_CHAR_LIMIT, preserving order and never splitting or dropping a block. If a single block
 * alone exceeds the limit (not expected for /check's blocks in practice, but not assumed away
 * here), it still becomes its own post rather than being lost — callers that care can check
 * fitsInOnePost on the result themselves.
 */
export function packBlocksIntoThread(blocks: readonly string[]): ReplyThread {
  const posts: string[] = [];
  let current: string[] = [];

  for (const block of blocks) {
    const candidate = current.length === 0 ? block : joinSections(...current, block);
    if (fitsInOnePost(candidate)) {
      current.push(block);
    } else {
      if (current.length > 0) posts.push(joinSections(...current));
      current = [block];
    }
  }
  if (current.length > 0) posts.push(joinSections(...current));

  return posts;
}
