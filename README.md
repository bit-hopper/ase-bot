# Asé — 🧚🏾‍♀️ Whimsical Astrology Bot

An autonomous ATProto bot that delivers personalized astrology and tarot readings by combining a
user's natal placements with real-time planetary transits, mapped to the 78-card Tarot deck via
the Hermetic Order of the Golden Dawn correspondence system — plus, occasional, unprompted
whimsical posts that have nothing to do with your chart at all. Fully deterministic — no
LLM dependency; all output comes from a static template library.

Full design is in [`ase_bot_spec_1.md`](ase_bot_spec_1.md).

## Status

Version 1 (v1) is complete and live: every command (`/help`, `/set`, `/sign`, `/pull`, `/reading`,
`/divine`, `/moon`, `/chart`) is implemented, tested, and fully content-authored — see Template
content below. The optional whimsy feature is also code-complete, just off by default.

Beyond the original v1 scope, the bot has since been hardened from real production use: a
firehose watchdog auto-recovers from a silently stalled connection, and a cursor-staleness bound
keeps a restart from turning into an hours-long backlog replay through the network-wide firehose
— both discovered live and fixed. Local Postgres/Redis run via `docker-compose.yml`.

The one deliberately out-of-scope piece is `app.ase.profile` PDS writes — see below.

## Getting Started

Requires Node.js 20+, a Postgres instance, and a Redis instance.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, ASE_* creds, SWEPH_PATH, etc.
```

For local Postgres + Redis via Docker:

```bash
docker compose up -d --wait
```

Then apply migrations and run the test suite (both load `.env` automatically):

```bash
npm run migrate
npm test
npm run typecheck
npm run build
```

`npm test` is safe to run alongside a live `npm start` on the same machine: the test suite
transparently redirects `DATABASE_URL`/`REDIS_URL` onto their own database (`ase_test`, created
and migrated automatically via a vitest `globalSetup`) and Redis logical DB (`/1`) — see
`vitest.config.ts` and `tests/testEnv.ts`. Every test's `TRUNCATE`/`flushdb()` only ever touches
that isolated storage, never a live bot's real data.

### Two reading commands

`/reading` was redesigned around the classic "Sun = theme, Moon = mood, Rising = where it plays
out" formula; the original transit/decan engine that used to live at `/reading` was renamed to
**`/divine`** rather than discarded. See [`ase_bot_spec_1.md`](ase_bot_spec_1.md) §6.7-6.9 for
the full design — the two commands are genuinely different divinatory philosophies, not an
old/new version of the same thing, and both are fully implemented.

### Template content

The Template Renderer engine (selection, fallback chain, slot interpolation) is complete and
tested, and all content is fully authored: `/pull` has all 156 card meanings (78 cards × 2
orientations) across `majorArcana.ts`, `courtCards.ts`, and `decans.ts`; `/reading` has its 26
connector/domain entries across `readingConnectors.ts` and `houseDomains.ts`; `/divine` has all
432 synthesis blocks (36 decan cards × 2 orientations × 6 relationship types) in
`templates/readings.json`. Run `npm run validate-templates` to confirm — it reports complete
coverage and gates any real deploy.

### Whimsy (optional, feature-flagged)

Beyond the core v1 commands, `src/whimsy/` implements a self-scheduling standalone-post
feature — unprompted, sign-flavored one-liners in a distinct whimsical voice (spec §9.7), posted
on their own cadence rather than in reply to a mention. Code-complete and tested, but off by
default; set `WHIMSY_ENABLED=true` to turn on live unattended posting.

### Running the bot

```bash
npm start   # tsx --env-file=.env src/main.ts
```

Authenticates with `ASE_HANDLE`/`ASE_APP_PASSWORD`, subscribes to the firehose, and starts the
queue worker. `/help`, `/set`, `/sign`, `/chart` work without ephemeris data; `/moon`, `/pull`,
`/reading`, and `/divine` need real Swiss Ephemeris files at `SWEPH_PATH` (see below) or they'll
correctly error rather than silently degrade.

### `app.ase.profile` PDS writes are not implemented

§11.4 describes writing user natal data to *each user's own* PDS, which "requires the user to
authorize Asé to write to their repo." That's a full per-user OAuth authorization flow — a
distinct feature from this bot's own app-password auth (which only ever grants access to the
bot's own account). Building that OAuth flow is out of scope here; spec's own §11.4 v1 fallback
is exactly this — DB-only storage via `user_profiles` — so `fetchAseRecord`/`writeAseRecord` are
left as unwired seams (`CommandContext`/`ProfileResolverDeps` already have the hooks) rather than
half-implemented against the wrong auth model.

### Ephemeris data

Planetary position calculations use [Swiss Ephemeris](https://www.astro.com/swisseph/) via the
`sweph` package. Real calculations require ephemeris data files (`SWEPH_PATH`) — see
[`node_modules/sweph/README.md`](node_modules/sweph/README.md) for where to get them. Without the
files, `sweph` silently falls back to an analytical approximation; this project treats that as a
hard error in production (see `src/astro/ephemeris.ts`) rather than allowing silent precision loss.
Tests opt into the approximation explicitly (`SEFLG_MOSEPH`) so they can run offline.

Per §5.1 the bot only needs the main planets + Moon (Sun through Pluto, no asteroids), so the
600-year main-planet + Moon files covering 1800–2400 are sufficient:

```bash
mkdir -p ephe
curl -fL -o ephe/sepl_18.se1 https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/sepl_18.se1
curl -fL -o ephe/semo_18.se1 https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/semo_18.se1
npm run verify-ephemeris   # confirms the files are actually loadable before you trust them
```

These files aren't committed to the repo (binary, third-party licensed data — see `.gitignore`);
CI fetches them fresh in the same way (see `.github/workflows/ci.yml`).

## License

AGPL-3.0-or-later — see [`LICENSE`](LICENSE).

This project depends on [`sweph`](https://github.com/timotejroiko/sweph), which is dual-licensed
under AGPL-3.0-or-later (default) or LGPL-3.0-or-later (only if you hold a paid Astrodienst
professional Swiss Ephemeris license). Since Asé runs as a public network service, AGPL's
network-use clause (§13) applies: anyone interacting with the bot is entitled to the complete
corresponding source code. Asé is published under AGPL-3.0-or-later to satisfy that obligation
directly — the full source is public.
