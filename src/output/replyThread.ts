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
