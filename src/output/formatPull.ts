import type { PullRenderOutput } from "../templates/renderPull.js";
import { fitsInOnePost, joinSections, type ReplyThread } from "./replyThread.js";

/** §10.2 — single post if it fits, thread (header / meaning) if it doesn't. */
export function formatPull(pull: PullRenderOutput): ReplyThread {
  const header = `🔮 ${pull.cardName}\n${pull.orientationLine}`;
  const full = joinSections(header, pull.meaning);

  if (fitsInOnePost(full)) return [full];
  return [header, pull.meaning];
}
