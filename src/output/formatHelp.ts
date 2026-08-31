import type { ReplyThread } from "./replyThread.js";

/** Default /help — a quick getting-started summary that fits in a single post. */
export function formatHelpQuick(): ReplyThread {
  return [
    `🧚🏾‍♀️ Asé — astrology bot with a scoop of whimsy ✨

To get started: /set sun [your sun sign]

Commands:

/set sun [sign] moon [sign] rising [sign]
/reading  — for a Sun, Moon & Rising reading
/help list-all     — to list all commands`,
  ];
}

/** /help list-all — the full command reference. Over the 300-char limit for 8 commands,
 *  so it's split into a 2-post thread. */
export function formatHelpFull(): ReplyThread {
  return [
    `🧚🏾‍♀️ Asé — astrology bot with a scoop of whimsy ✨

All commands:

/set sun [sign] moon [sign] rising [sign]
/reading  — for a Sun, Moon & Rising reading
/chart    — your element balance
/pull     — one card from the full deck`,
    `/moon     — current moon sign & phase
/sign     — your sun sign
/divine   — a card drawn from today's sky
/help     — this message`,
  ];
}
