import { formatHelpFull, formatHelpQuick } from "../output/formatHelp.js";
import type { ReplyThread } from "../output/replyThread.js";

/** §4.1/§10.6 — plain /help gives a quick getting-started summary; "/help list-all" gives the
 *  full command reference. Also used as the fallback for unrecognized commands (§4.3), always
 *  via the quick variant regardless of what args were passed. */
export async function handleHelp(args = ""): Promise<ReplyThread> {
  if (args.trim().toLowerCase() === "list-all") {
    return formatHelpFull();
  }
  return formatHelpQuick();
}
