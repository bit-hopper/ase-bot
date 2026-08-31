# Asé — 🧚🏾‍♀️ Whimsical Astrology Bot: Implementation Specification

**Version:** 1.3.0  
**Protocol:** AT Protocol (Bluesky / ATProto ecosystem)  
**Bot Handle:** `@ase.tinylil.world` (live — configured via `ASE_HANDLE`)  
**Engine Name:** 🧚🏾‍♀️ Whimsical Astrology Engine

**v1.3.0 change note:** `/daily` has been **removed**. It shared `/reading`'s exact pipeline
(§6.7-6.9's Big Three formula) and, in practice, its output too — the only difference (a 00:00 UTC
ephemeris pin vs. live "now") almost never surfaced, since the transiting Sun essentially never
changes sign mid-day and the Moon only rarely does. v1 is now 8 commands, not 9. Every
remaining reference to "the same pipeline as `/reading`" or "`/reading`'s day-stable variant"
throughout this document refers to history, not a currently-supported command.

**v1.2.0 change note:** `/reading` was redesigned around the classic "Big Three" formula (Sun =
theme, Moon = mood, Rising = where it plays out — §6.7-6.9, §9.6, §10.1b). The original
transit/decan engine that used to live at `/reading` was **renamed to `/divine`** rather than
replaced — it is unchanged in behavior and remains a fully supported, separate command. Every
section below that still says "`/reading`" and describes Impact Score / Anchor Transit / decan
routing is describing `/divine`; sections describing the new Sun/Moon/Rising formula say so
explicitly. This is a genuine second command, not a v1/v2 relationship.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [User Profile System](#3-user-profile-system)
4. [Command Interface](#4-command-interface)
5. [Astrology Engine](#5-astrology-engine)
6. [Tarot Engine](#6-tarot-engine)
7. [Card Orientation Logic](#7-card-orientation-logic)
8. [Reading Composer](#8-reading-composer)
9. [Template Renderer](#9-template-renderer)
10. [Output Format](#10-output-format)
11. [AT Protocol Integration](#11-at-protocol-integration)
12. [Queue & Worker Architecture](#12-queue--worker-architecture)
13. [Data Models](#13-data-models)
14. [Rate Limiting & Anti-Spam](#14-rate-limiting--anti-spam)
15. [Correspondence Tables](#15-correspondence-tables)
16. [Version Roadmap](#16-version-roadmap)
17. [Environment & Dependencies](#17-environment--dependencies)

---

## 1. System Overview

Asé is an autonomous ATProto bot that delivers personalized astrology and tarot readings by combining a user's natal placements with real-time planetary transits, then mapping the synthesis to the 78-card Tarot deck via the Hermetic Order of the Golden Dawn correspondence system — plus, occasional, unprompted whimsical posts that have nothing to do with any user's chart at all (§9.7).

**Core design principles:**

- The astrology, tarot logic, and output text are **fully deterministic**. There is no LLM dependency. All reading text is produced by a template engine operating on a pre-computed structured context object.
- Card orientation (Upright / Reversed) is **mathematically derived** from astronomical conditions — not randomly assigned.
- `/pull` draws from the full **78-card deck** with a **65% probability weighting toward Major Arcana**. All other reading commands derive their card from the decan engine.
- User profile data is **locked per DID** and **updatable** on demand.

---

## 2. Architecture

```
[ Bluesky Firehose / Mentions ]
            │
            ▼
  [ Mention Listener ]
            │
            ▼
  [ Command Queue (BullMQ / Redis) ]
            │
            ▼
  [ Worker Process ]
     ├── Profile Resolver
     ├── Ephemeris Calculator
     ├── Decan Matrix Router
     ├── Aspect Vector Evaluator
     ├── Card Draw Engine
     ├── Reading Composer
     └── Template Renderer
            │
            ▼
  [ Bluesky Reply (XRPC post) ]
```

### 2.1 Layer Responsibilities

| Layer                       | Responsibility                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mention Listener**        | Subscribes to `com.atproto.sync.subscribeRepos` firehose; detects mentions via rich-text facets (not raw string search)                      |
| **Command Queue**           | Buffers incoming jobs; protects against mention storms; enforces rate limits before work begins                                              |
| **Profile Resolver**        | Fetches user's Asé profile record from cache or PDS; falls back to bio parsing                                                               |
| **Ephemeris Calculator**    | Wraps Swiss Ephemeris (sweph) to compute real-time planetary positions                                                                       |
| **Decan Matrix Router**     | Maps a planet's exact degree to one of the 36 decans → Minor Arcana card                                                                     |
| **Aspect Vector Evaluator** | Computes aspects between transiting planet and user's natal placements → orientation score                                                   |
| **Card Draw Engine**        | Handles `/pull` weighted random draws                                                                                                        |
| **Reading Composer**        | Assembles the structured `AseContext` object from all upstream layers                                                                        |
| **Template Renderer**       | Selects and interpolates the correct template from the static library based on `AseContext`; produces final post text with no external calls |

### 2.2 Autonomous Posting Pipelines

The diagram and layer table above describe the mention-triggered reply pipeline. Two further
pipelines post to Bluesky without being triggered by a mention, both using
`postStandalonePost` (§11.3) — a top-level post with no `reply` field — instead of a reply
thread, and both running as independent BullMQ queues/workers alongside `ase-readings`
(§12.4):

- **Phenomena posts** (§9.8) — a periodic tick (BullMQ `upsertJobScheduler`, every
  `PHENOMENA_CHECK_INTERVAL_HOURS`) diffs fresh ephemeris positions against last-known state
  and forward-searches for eclipses, posting a bare factual sentence whenever a real
  astrological event (station, ingress, eclipse, principal moon phase) occurs.
- **Whimsy posts** (§9.7) — a self-rescheduling delay chain posts unprompted,
  sign-flavored one-liners on a random cadence, feature-flagged via `WHIMSY_ENABLED`.

Neither pipeline touches the Profile Resolver, Decan Matrix Router, Aspect Vector Evaluator,
or Card Draw Engine — they are not readings and carry no natal-chart context.

---

## 3. User Profile System

### 3.1 Profile Sources (Priority Order)

When a reading is requested, the system resolves a user's natal placements in this order:

1. **Asé profile record** (`app.ase.profile`) stored in the user's PDS — highest authority. Requires
   the per-user OAuth write-authorization flow described in §11.4, which is not yet built — until
   it is, this step never fires and resolution starts at step 2 (§11.4's "v1 fallback").
2. **Bot's own user cache** (PostgreSQL `user_profiles` table) — fast path if record already processed
3. **Bluesky bio parsing** — fallback for users who haven't explicitly set their signs
4. **No profile** — bot prompts the user to run `/set` before proceeding

### 3.2 Bio Parser

The bio parser extracts Sun, Moon, and Rising from free-text bios. It must handle all common variants:

**Recognized Sun patterns:**

```
Leo Sun | Leo sun | ☀️ Leo | ☀ Leo | Sun: Leo | Leo ♌ | ♌ | Leo ☀️
```

**Recognized Moon patterns:**

```
Pisces Moon | 🌙 Pisces | Moon: Pisces | Pisces ♓ | ♓ Moon
```

**Recognized Rising patterns:**

```
Sagittarius Rising | Sag Rising | ♐ Rising | Rising: Sagittarius | Sagittarius Asc | Sag ↑
```

**Confidence scoring:** The parser must return a confidence value per placement. Low-confidence extractions (hedged language like "leo-ish", "maybe pisces") must be flagged and never treated as authoritative.

```typescript
interface ParsedPlacements {
  sun: { value: ZodiacSign | null; confidence: number };
  moon: { value: ZodiacSign | null; confidence: number };
  rising: { value: ZodiacSign | null; confidence: number };
  source: "ase_record" | "cache" | "bio" | "command";
}
```

Threshold: confidence < 0.75 → treat placement as `null`. Do not use low-confidence values in readings.

### 3.3 `/set` Command — Profile Locking

Users establish their profile via the `/set` command. Profile data is stored per DID and **may be updated at any time** by re-running `/set`.

```
/set sun leo
/set moon pisces
/set rising sagittarius
/set sun leo moon pisces rising sagittarius   ← all at once
```

On receipt:

1. Validate each sign string against the canonical 12-sign list.
2. Upsert the `user_profiles` record keyed by DID.
3. Write (or update) an `app.ase.profile` record to the user's PDS if the user has granted write permission.
4. Reply confirming the stored placements.

**Partial sets are allowed.** A user may set only their Sun. Readings will use whatever placements are available and note what's missing.

### 3.4 User Profile Cache Schema

```sql
CREATE TABLE user_profiles (
  did             TEXT PRIMARY KEY,
  handle          TEXT,
  display_name    TEXT,
  bio_raw         TEXT,
  bio_hash        TEXT,           -- SHA-256 of bio; used to detect changes
  sun             TEXT,           -- canonical lowercase sign name or NULL
  moon            TEXT,
  rising          TEXT,
  profile_source  TEXT,           -- 'ase_record' | 'bio' | 'command'
  last_reading_at TIMESTAMPTZ,
  last_pull_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

Bio re-parsing: if a new request arrives and `bio_hash` differs from the stored hash, re-parse and update the cache.

---

## 4. Command Interface

Asé responds only when **explicitly mentioned** via a rich-text facet. It never monitors keywords or proactive-scans the firehose for non-mention content.

### 4.1 v1 Commands

| Command             | Description                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------|
| `/help`             | Returns onboarding card: capabilities summary, how to use `/set`, current active transits                                 |
| `/set [placements]` | Sets or updates user's natal placements                                                                                    |
| `/sign`             | Returns the user's stored Sun sign and a brief keyword description                                                        |
| `/pull`             | Draws one card from the full 78-card deck (65% Major Arcana weighting); pure tarot, no natal context required             |
| `/reading`          | Sun/Moon/Rising "Big Three" reading — see §6.7-6.9, §9.6, §10.1b. Accepts optional inline placement overrides (§4.4).      |
| `/divine`           | Formerly `/reading`: natal placements + real-time transit decan → Minor Arcana card, via Impact Score/Anchor Transit (§6.2)|
| `/moon`             | Current Moon sign + phase + brief interpretation                                                                           |
| `/chart`            | Displays stored natal placements with element balance visualization                                                       |

### 4.2 v2 Commands (Do Not Implement in v1)

`/pull 3`, `/pull [spread]`, `/compat @handle`, `/transit`, `/weekly`

### 4.3 Command Parsing Rules

- Commands are **case-insensitive** (`/Reading`, `/PULL`, `/set Sun Leo` all valid).
- Unrecognized commands → reply with `/help` summary.
- Commands with invalid arguments → reply with the specific usage string for that command.
- A mention with no recognized command → reply with `/help` summary.

### 4.4 `/reading` Inline Placement Overrides

`/reading` is the only command that accepts arguments beyond its base form.
`/reading sun libra moon pisces rising aquarius` overrides the
corresponding field(s) from the user's stored `/set` profile **for that single call only** —
nothing persists. Fields omitted from the inline args fall back to the stored profile; a call
with no inline args behaves exactly like the bare command.

**Grammar:** a sequence of `(field, sign)` pairs in any order — `sun|moon|rising|ascendant`
(`ascendant` aliases to `rising`) followed by a sign name. Sign matching is typo-tolerant: an
unrecognized sign string is corrected to the nearest of the 12 canonical signs by Levenshtein
edit distance (max distance 2) before being rejected outright. An unparseable field, a dangling
field with no sign, or a sign too far from any valid one to guess rejects the whole command with
a specific error — never a partial/best-effort reading.

This is the only place in the bot with typo-tolerant parsing; every other command (including
`/set`) requires exact sign names.

---

## 5. Astrology Engine

### 5.1 Ephemeris Integration

Use **Swiss Ephemeris** (via `sweph` npm package or Python `pyswisseph`) for all planetary position calculations. Do not rely on approximation tables.

**Required planetary bodies:**

- Luminaries: Sun ☉, Moon ☽
- Inner planets: Mercury ☿, Venus ♀, Mars ♂
- Outer planets: Jupiter ♃, Saturn ♄, Uranus ♅, Neptune ♆, Pluto ♇

**Cache policy:** Global planetary positions are cached for **2 hours**. This is the maximum acceptable staleness for transit readings. Cache is shared across all users — positions are the same for everyone at a given moment.

### 5.2 Current Sign Determination

The current zodiac sign is determined by the Sun's ecliptic longitude:

| Degrees          | Sign                                 |
| ---------------- | ------------------------------------ |
| 0° 00' – 29° 59' | Aries → … → Pisces (each sign = 30°) |

Sign boundaries must be precise to the **arcminute**. A planet at `9° 59' 59"` is strictly 1st Decan; `10° 00' 00"` triggers the 2nd Decan.

### 5.3 Aspect Calculation

Aspects are computed between each **transiting planet** and the user's **natal Sun, Moon, and Rising**. Rising sign is treated as a point at 0° of its sign for aspect calculation when exact birth time is unavailable.

**Orbs:**

| Aspect      | Angle | Orb | Type        |
| ----------- | ----- | --- | ----------- |
| Conjunction | 0°    | ±8° | Harmonious  |
| Sextile     | 60°   | ±4° | Harmonious  |
| Trine       | 120°  | ±8° | Harmonious  |
| Square      | 90°   | ±7° | Challenging |
| Opposition  | 180°  | ±8° | Challenging |

Aspects outside these orbs are ignored for orientation scoring.

### 5.4 Retrograde Detection

Retrograde status is determined by comparing sequential ephemeris positions (a planet moves backward in ecliptic longitude across two consecutive time samples). Flag retrograde status per planet and include in the transit context object.

---

## 6. Tarot Engine

### 6.1 The 78-Card Deck

The full deck used by Asé:

- **22 Major Arcana** (The Fool through The World)
- **56 Minor Arcana:**
  - 36 Pip cards (2–10 in each of four suits)
  - 16 Court cards (Page, Knight, Queen, King × four suits)
  - 4 Aces

### 6.2 `/divine` — Decan-Based Card Selection

This section (through §6.6, §7, §8, §9.1-9.4, §10.1) describes **`/divine`** — the original
`/reading` engine, renamed when `/reading` was redesigned around the Sun/Moon/Rising formula in
§6.7-6.9. `/divine`'s card is **not randomly drawn**. It is deterministically selected by mapping
the most impactful transiting planet's current degree to the 36-decan matrix.

**Selection process:**

1. Fetch all transiting planet positions.
2. For each planet, determine which of the user's natal placements it is forming an aspect to, and compute an **Impact Score** (see 6.3).
3. Select the highest-scoring transit as the **Anchor Transit**.
4. Map the Anchor Transit planet's exact ecliptic degree to the decan table → this yields the card.
5. Compute orientation (see Section 7).

### 6.3 Impact Score

When multiple transits are active simultaneously:

| Condition                                               | Score |
| ------------------------------------------------------- | ----- |
| Exact conjunction (≤ 1° orb) to Rising                  | 100   |
| Conjunction (≤ 8° orb) to Rising                        | 80    |
| Any aspect to Sun                                       | 60    |
| Any aspect to Moon                                      | 40    |
| Retrograde multiplier (apply to whichever transit wins) | ×1.25 |

The highest composite score wins. In a tie, Rising > Sun > Moon.

### 6.4 `/pull` — Weighted Random Draw

`/pull` draws from the **full 78-card deck** with the following weighting:

- **65% probability:** Draw from the 22 Major Arcana cards (each Major Arcana card has equal probability within this pool)
- **35% probability:** Draw from the 56 Minor Arcana cards (each Minor Arcana card has equal probability within this pool)

This is implemented as:

```
roll = random float [0, 1)
if roll < 0.65:
    card = random.choice(MAJOR_ARCANA)  # 22 cards, uniform
else:
    card = random.choice(MINOR_ARCANA)  # 56 cards, uniform
```

`/pull` uses **true randomness** (CSPRNG). It is not seeded by date.

### 6.5 `/daily` — Removed (v1.3.0)

`/daily` has been removed — see the v1.3.0 change note at the top of this document. This section
number is left as a stub (rather than renumbering every subsequent section) since `§6.2-6.6` and
similar ranges are referenced throughout the rest of this document. The content that used to live
here described the *original* pre-redesign `/daily` (a seeded draw from the full 78-card deck) —
already superseded before removal by `/daily` moving to share `/reading`'s pipeline (§10.3,
historical).

### 6.6 `/pull` Orientation for Major Arcana

When a Major Arcana card is drawn via `/pull`, orientation is determined by the current Moon phase:

| Moon Phase                                | Orientation                                    |
| ----------------------------------------- | ---------------------------------------------- |
| New Moon, Waxing Crescent, Waxing Gibbous | Upright                                        |
| Full Moon                                 | Upright (always — Full Moon = peak expression) |
| Waning Gibbous, Waning Crescent           | Reversed                                       |
| Dark Moon                                 | Reversed                                       |

### 6.7 `/reading` — the Sun/Moon/Rising "Big Three" Formula

The redesigned `/reading` (distinct from `/divine`, §6.2-6.6) follows the classic formula: **the
Sun tells you what theme is happening, the Moon dictates the emotional response, and the Rising
sign specifies exactly where in the querent's life that energy plays out.** Unlike `/divine`, it
never picks "whichever transit is loudest" — all three axes below are always computed and always
present in the output (Ground is the one exception, omitted only if neither Rising nor Sun is
set — §6.9).

**Theme axis (Sun):**

```
currentSunSign = the Sun's live transiting sign (today's season)
card = the Major Arcana card that currentSunSign corresponds to (§15.1's table,
       looked up by the *current* sign, not the user's natal Sun)
themeRelationship = classifySignRelationship(natal.sun, currentSunSign)   — see §8.2
                     falls back to a dedicated "no natal Sun" case if natal.sun is unset
```

The theme card is the same for every user during a given ~30-day season — that is deliberate,
not a bug: the Sun genuinely is telling everyone the same thing about what's happening in the sky
right now. Personalization comes entirely from `themeRelationship`, via the connector library in
§9.6. The card is **always shown upright** — see §6.9.

### 6.8 `/reading` — Mood Axis (Moon)

```
currentMoonSign = the Moon's live transiting sign
moodRelationship = classifySignRelationship(natal.moon, currentMoonSign)   — see §8.2
                    falls back to a dedicated "no natal Moon" case if natal.moon is unset
```

Same mechanism as the Theme axis, applied to the Moon instead of the Sun — deliberately reusing
one personalization pattern for both axes rather than inventing a second (an earlier design draft
used a simpler Moon-element-only tone lookup; superseded once the Sun axis's relationship-type
mechanism was worked out, for consistency). The Mood axis has no card of its own; its output is
the connector text alone (§9.6).

### 6.9 `/reading` — Ground Axis (Ruling Planet + Whole Sign House)

```
anchorSign = natal.rising, falling back to natal.sun if Rising is unset
rulingPlanet = the classical ruler of anchorSign (§15.6's modern-rulership table)
rulingPlanetSign = rulingPlanet's live transiting sign
house = houseOf(anchorSign, rulingPlanetSign)   — Whole Sign House placement, 1-12
domain = the life-domain entry for `house` (§15.7's 12-house table)
```

**Whole Sign House math** (no birth time required — consistent with §5.3's existing treatment of
Rising as a point at 0° of its sign):

```
houseOf(anchorSign, targetSign) = ((order(targetSign) - order(anchorSign) + 12) mod 12) + 1
```

where `order()` is each sign's 0-11 position starting from Aries. The anchor sign itself is
always House 1.

If neither `natal.rising` nor `natal.sun` is set (i.e. the user has only a Moon on file), the
Ground axis has no anchor and is **omitted entirely** from the output — never a guess, never a
placeholder.

**Orientation:** unlike `/divine` (§7), the new `/reading`'s card is **always shown upright**, on
all three axes. Every card (Majors included) has an authored reversed meaning (§9.4's content is
complete for all 78 cards), but this command deliberately doesn't use it: Waite's own source text
never reverses the Major Arcana either, and since this reading's card is tied to the current
season rather than a fresh draw, "the season's theme is reversed" reads as a much heavier claim
than `/divine`'s "today's transit is reversed." The Mood axis carries the "this is landing hard
today" signal instead, via its own relationship type. `/reading` needs no orientation mechanism
at all — §7's retrograde-gate/aspect-roll logic is `/divine`-only.

---

## 7. Card Orientation Logic — `/divine`

This applies to `/divine` (§6.2-6.6's decan-based engine) only. It does **not** apply to `/pull`
(which uses Moon phase for Major Arcana and aspect snapshot for Minor Arcana — see 7.3), nor to
the new `/reading`, which never uses card reversal at all (§6.9).

### 7.1 The Rules

**Step 1 — Retrograde check (hard gate):**
If the Anchor Transit planet is **Retrograde**, the card is **forced Reversed**. Skip remaining steps.

**Step 2 — Aspect classification:**
If the Anchor Transit planet is **Direct**, evaluate the aspects it forms to the user's natal placements.

**Step 3 — Orientation probability:**

| Aspect Type                              | Orientation                   |
| ---------------------------------------- | ----------------------------- |
| Harmonious (Conjunction, Trine, Sextile) | **90% Upright**, 10% Reversed |
| Challenging (Square, Opposition)         | 25% Upright, **75% Reversed** |
| No active aspect within orb              | **50/50**                     |

The probability roll uses a CSPRNG seeded by `did + date + planet + card` — making it stable within a UTC day but varying across days.

### 7.2 Scoring Precedence for Orientation

If the Anchor Transit planet forms aspects to **multiple natal placements** simultaneously:

1. Aspect to **Rising** → use this aspect for orientation
2. Aspect to **Sun** → use this
3. Aspect to **Moon** → use this

Only the highest-precedence aspect determines orientation.

### 7.3 `/pull` Orientation for Minor Arcana

When a Minor Arcana card is drawn via `/pull`, take an instantaneous aspect snapshot between the card's **Chaldean decan ruler** and the current sky (no natal chart needed):

- If the decan ruler is Retrograde → **Reversed**
- If the decan ruler is Direct and forming a harmonious transit to any of the Cardinal points (0° Aries, Cancer, Libra, Capricorn) → **Upright**
- Otherwise → 50/50 CSPRNG roll

---

## 8. Reading Composer — `/divine`

The Reading Composer is `/divine`-specific (§6.2-6.6's engine); the new `/reading` (§6.7-6.9)
doesn't use it — its selection logic is simpler and doesn't need a general-purpose context object.

The Reading Composer assembles all upstream outputs into a single structured context object. This object — not raw text — is passed to the Template Renderer (§9), never an LLM (§1's no-LLM design principle).

### 8.1 Context Object Schema

```typescript
interface AseContext {

  user: {
    did: string;
    handle: string;
    sun: ZodiacSign | null;
    moon: ZodiacSign | null;
    rising: ZodiacSign | null;
    profileSource: "ase_record" | "bio" | "command" | "none";
    missingPlacements: string[]; // e.g. ["rising"] if not set
  };

  celestial: {
    currentSunSign: ZodiacSign; // what season we're in
    moonSign: ZodiacSign;
    moonPhase: MoonPhase;
    anchorPlanet: Planet; // the transit that drove card selection
    anchorPlanetDegree: number; // exact ecliptic longitude
    anchorPlanetIsRetrograde: boolean;
    anchorPlanetSign: ZodiacSign;
    anchorDecan: 1 | 2 | 3;
    activeAspects: Aspect[]; // all aspects to user's natal placements
  };

  tarot: {
    card: TarotCard;
    cardType: "major" | "minor";
    suit: TarotSuit | null; // null for Major Arcana
    number: number | null; // null for Court cards and Major Arcana
    orientation: "upright" | "reversed";
    orientationReason: string; // human-readable explanation, surfaced for debugging/logging
    uprightMeaning: string;
    reversedMeaning: string;
    decanRuler: Planet | null; // null for Major Arcana from /pull
  };

  relationships: {
    sunToCurrentSign: string; // e.g. "Leo in Leo Season → amplification"
    moonToCurrentSign: string;
    risingToCurrentSign: string;
    elementRelationship: string; // e.g. "Fire amplifies Fire"
    signModalityNote: string; // e.g. "Fixed × Mutable = tension"
  };

  lifedomainHint: string; // e.g. "9th House — philosophy, travel, expansion"
}
```

### 8.2 Relationship Matrix

The composer pre-computes the `relationships` block using these rules:

**Sign-to-current-season relationships:**

| User Sign vs. Current Season                  | Label         |
| --------------------------------------------- | ------------- |
| Same sign                                     | Amplification |
| Same element                                  | Resonance     |
| Complementary element (Fire↔Air, Earth↔Water) | Harmony       |
| Opposing sign (e.g. Leo ↔ Aquarius)           | Polarity      |
| Squared sign (e.g. Leo ↔ Taurus)              | Tension       |
| All others                                    | Neutral       |

**Element complementarity:**

- Fire ↔ Air: complementary
- Earth ↔ Water: complementary
- Fire ↔ Water: friction
- Fire ↔ Earth: friction
- Air ↔ Earth: friction
- Air ↔ Water: friction

---

## 9. Template Renderer

There is no LLM. All output text is produced by a **static template library** — a collection of pre-written strings with interpolation slots — selected and assembled at runtime by the Template Renderer based on the `AseContext` object. No external API calls are made during text generation.

### 9.1 Template Selection Axes — `/divine`

For `/divine` (§6.2-6.6's decan engine — the new `/reading`'s own content system is §9.6), the renderer selects a synthesis block by intersecting three keys:

```
relationship_type  ×  card_key  ×  orientation
```

Where:

- `relationship_type` is one of 6 values: `amplification | resonance | harmony | polarity | tension | neutral`
- `card_key` is the canonical card identifier: e.g. `seven_of_wands`, `the_star`
- `orientation` is `upright` or `reversed`

This yields a template library of: **36 decan cards × 2 orientations × 6 relationship types = 432 synthesis blocks** for `/divine`. Each block is a 2–3 sentence string with interpolation slots for sign names, planet names, and card names.

### 9.2 Template Structure

Each template entry in the library has the following shape:

```typescript
interface ReadingTemplate {
  card: string; // e.g. "seven_of_wands"
  orientation: "upright" | "reversed";
  relationshipType: RelationshipType;
  synthesis: string; // 2–3 sentences; uses {{slots}}
  closing: string; // single reflective line or question
}
```

**Available interpolation slots:**

| Slot                    | Resolves to                                        |
| ----------------------- | -------------------------------------------------- |
| `{{sun}}`               | User's Sun sign, e.g. "Leo"                        |
| `{{moon}}`              | User's Moon sign, e.g. "Pisces"                    |
| `{{rising}}`            | User's Rising sign, e.g. "Sagittarius"             |
| `{{currentSeason}}`     | Current Sun sign season, e.g. "Leo season"         |
| `{{anchorPlanet}}`      | Transiting planet driving the reading, e.g. "Mars" |
| `{{cardName}}`          | Full card name, e.g. "Seven of Wands"              |
| `{{cardSuit}}`          | Suit name, e.g. "Wands"                            |
| `{{cardElement}}`       | Element, e.g. "Fire"                               |
| `{{relationshipLabel}}` | Computed relationship label, e.g. "Amplification"  |

**Example template entry (Seven of Wands · Upright · Amplification):**

```
synthesis: "{{currentSeason}} and your {{sun}} Sun are speaking the same language right now —
            both are fire, both want to be seen. The {{cardName}} says the visibility you've
            earned is worth defending. This is not the moment to make yourself smaller."

closing:   "What is the one thing you've built that deserves your full protection today?"
```

**Example template entry (Seven of Wands · Upright · Polarity):**

```
synthesis: "{{currentSeason}} energy is louder than your natural {{sun}} rhythm.
            The {{cardName}} arrives asking you to hold ground anyway —
            even when standing out feels against your instincts."

closing:   "What would it look like to defend your position without abandoning who you are?"
```

### 9.3 Fallback Templates — `/divine`

If no exact match exists for a `card × orientation × relationship_type` combination (e.g. a card with missing template coverage during development), the renderer falls back in order:

1. `card × orientation × neutral` — the neutral relationship template for that card
2. The card's raw upright/reversed meaning string from the decan table (Section 15.4), formatted as a plain reading with no synthesis line
3. A generic placeholder string flagged for template authoring: `"[Template pending: {{card}} · {{orientation}} · {{relationshipType}}]"`

Fallback tier 3 must never appear in production. It serves as a development-time signal that a template is missing.

### 9.4 `/pull` Templates

`/pull` does not use the synthesis block system. Its output is assembled directly from the decan table or Major Arcana data:

```
card_name (from card data)
orientation · element_or_archetype

upright_meaning OR reversed_meaning  (verbatim from card data record)
```

No interpolation slots are needed. The output is fully static per card + orientation combination.

### 9.5 Voice Guidelines for Template Authors

All synthesis blocks in the template library must conform to these constraints. These are authoring rules, not runtime checks:

```
Tone:      mystical, warm, slightly oracular — never fatalistic
Register:  modern and intimate; no archaic language ("thee", "thy")
Sentences: short declarative sentences; line breaks are breathing room
Emoji:     prefer zodiac/planet glyphs (♌ ♓ ♐ ♂) over pictographic emoji
Length:    synthesis = 2–3 sentences max; closing = 1 line max
Forbidden: predictions of death, illness, harm, or romantic/financial certainty
           fatalistic absolutes ("there is no way out", "this will fail")
           medical or financial advice of any kind
Framing:   always toward agency, possibility, and reflection — not prediction
```

**These rules apply to every authored string in the bot**, not just `/divine`'s synthesis blocks
— including `/pull`'s card meanings (§9.4) and the new `/reading`'s connector/domain library
(§9.6), even though both of those are short comma-phrases rather than full sentences. This was
learned the hard way during content authoring: a first content pass (before this rule was applied
literally to short-phrase content) shipped clinical/diagnostic-sounding phrases (e.g. "Mental
paralysis" for a card meaning) and, separately, Victorian-moralizing language lifted too literally
from a public-domain source (Waite's *Pictorial Key to the Tarot*) — both were caught and rewritten
in a dedicated content-tone pass. Register violations to watch for even in short phrases: medical/
diagnostic terms ("paralysis," "acute anxiety," "nervous system," "toxic," "calcification") and
archaic moral-judgment words ("vice," "cruelty," "malice," "corruption," "prodigality").

### 9.6 Template Selection & Content — `/reading` (Sun/Moon/Rising)

The new `/reading` (§6.7-6.9) does not use the `card × orientation × relationship_type` matrix at
all — no synthesis-block library, no fallback chain. It composes its output from three small,
independent lookups instead, which is the practical reason this redesign exists: **~26 authored
entries total, not 432.**

**Theme (Sun) connectors** — keyed by `themeRelationship` (§6.7), 7 entries (the 6 relationship
types plus a `noNatalSun` case): `{{cardUprightMeaning}}. {{connector}}`, where the card meaning
is used verbatim from §15.1/§9.4's already-authored Major Arcana data and the connector
interpolates `{{currentSunSign}}`/`{{natalSunSign}}`.

**Mood (Moon) connectors** — same shape, keyed by `moodRelationship` (§6.8), 7 entries
(`noNatalMoon` fallback included), interpolating `{{currentMoonSign}}`/`{{natalMoonSign}}`. No
card meaning prefix — the connector alone is the section body.

**Ground domain library** — 12 entries, one per Whole Sign House (§6.9, §15.7), each a
`{ name, blurb }` pair looked up directly by house number. No relationship-type mechanic; this
axis is a straight lookup, not a personalization comparison.

**Authoring note:** both connector libraries were deliberately cross-checked against each other
for shared stock phrasing during authoring, since Theme and Mood always render in the same
message — e.g. an early draft had both `neutral` cases say "doing its own thing" verbatim, which
would have read as a visible template seam whenever both axes landed on `neutral` in the same
reading. The house-domain blurbs all share the "This is playing out..." opening structurally,
which is fine — only one ever renders per reading, so it's never seen twice in the same message.

### 9.7 Whimsy Voice Guidelines

Whimsy is a feature-flagged (`WHIMSY_ENABLED`), self-scheduling standalone-post feature —
separate from `/help`, `/set`, `/sign`, `/pull`, `/reading`, `/divine`, `/moon`, `/chart`, none of
which it touches. It posts unprompted, sign-flavored one-liners (`src/whimsy/`), not replies to a
command. Its voice is deliberately distinct from §9.5's oracular reading voice — a "whimsical,
suspiciously specific friend" register, not a mystical one — so it has its own constraints rather
than reusing §9.5's:

```
Tone:      whimsical, deadpan-specific, affectionate teasing — the "suspiciously specific friend"
           bit, not oracular and not mean-spirited
Register:  casual, modern, meme-adjacent; short imperative + short punchline, ending in ✨
Length:    one line each for directive and punchline; whole post should clear Bluesky's 300 chars
           with room to spare — no threading for whimsy posts
Allowed:   hyperbole, mundane-but-oddly-specific directives, non-literal "predictions," gentle
           self-aware silliness
Forbidden: anything readable as real medical, financial, or legal advice, even in jest
           (no "skip your meds," "sell your stocks," "quit your job")
           directives involving real physical risk, illegal acts, or self-harm, even as a joke
           targeting real, identifiable people/handles (the sign is the only "target")
           explicit sexual content, slurs, or harassment
           death/illness/real tragedy played for shock rather than whimsy
           genuinely humiliating or mean-spirited framing — teasing, not cruelty
Framing:   the joke is on the specificity/coincidence, never on the reader
```

All whimsy content (`src/whimsy/whimsyFragments.ts`'s Pool A and Pool B — directive-only and
cross-compatible directive/punchline pairs respectively) is authored and audited against this
list before shipping, the same discipline §9.5 describes for reading content.

### 9.8 Phenomena Post Content

Phenomena posts are a third, feature-complete autonomous-posting axis (§2.2), voice-distinct
from both the oracular reading voice (§9.5) and whimsy's register (§9.7): **plain factual
register, no synthesis, no ✨.** They report real, mathematically-verifiable astrological
events as they actually occur, rather than personalizing anything to a user's chart — there
is no `AseContext`, no relationship-type mechanic, and no card.

**Event types (4), detected by `src/phenomena/`:**

| Event                 | Detection                                                                                      | Coverage                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Retrograde station     | State diff: `isRetrograde` flips between the previous tick's stored state and the current tick | The 8 retrograde-capable planets — all `PLANETS` except Sun/Moon |
| Sign ingress           | State diff: stored `sign` differs from the current tick's sign                                 | All 10 tracked bodies, Sun and Moon included                     |
| Eclipse (lunar/solar)  | Forward search (`sweph`'s `lun_eclipse_when`/`sol_eclipse_when_glob`) + lookahead-window guard  | Any lunar or solar eclipse, of any type                          |
| Principal moon phase   | State diff on the joint Sun+Moon-derived phase, against a single persisted phase value          | New Moon, First Quarter, Full Moon, Last Quarter only            |

Moon phase deliberately excludes the other 5 `MoonPhase` values (waxing/waning
crescent/gibbous, dark_moon) — those are gradual descriptive states with no one precise
culminating moment, unlike a sign ingress or these 4 phases' exact conjunction/quadrature
instants. Lunar Nodes, Chiron, Lilith, and asteroids are not covered — the astro engine's
`PLANETS` list (§5.1) tracks only the 10 bodies above.

**State & dedup:** stations/ingresses and moon phase both use the diff-against-last-known-state
pattern (§13.4 `phenomena_state`, §13.6 `moon_phase_state`) — a cold start (`previous === null`,
no row ever written) never fires an event, so a fresh deploy doesn't treat every planet's
current position as a false "event." Eclipses instead use `phenomena_posted_log` (§13.5), keyed
by `(event_type, event_date)`: a plain forward search always returns the *next* eclipse from
now, however far out, so without a lookahead-window guard the very first tick after deploy
would post about an eclipse months away. An eclipse is only claimed/posted once its maximum
falls inside the current check tick's window (`PHENOMENA_CHECK_INTERVAL_HOURS`).

**Templates** (`src/phenomena/phenomenaTemplates.ts`) — 6 small hand-written entries, one per
event/direction, in the same lightweight pattern as `/reading`'s connector library (§9.6)
rather than `/divine`'s large JSON/fallback-chain system (§9.1-9.3):

```
{{planet}} turns retrograde in {{sign}}.
{{planet}} turns direct in {{sign}}.
{{planet}} enters {{sign}}.
Lunar eclipse in {{sign}} on {{date}}.
Solar eclipse in {{sign}} on {{date}}.
{{phase}} today.
```

Always a single sentence, single post, no threading — unlike `/divine`'s and `/reading`'s
multi-post output (§10.1, §10.1b).

**Scheduling:** a single BullMQ repeatable job (`upsertJobScheduler`, idempotent across
restarts) ticks every `PHENOMENA_CHECK_INTERVAL_HOURS` (default 2 — a separate env var from
`EPHEMERIS_CACHE_TTL_HOURS`, since nothing requires the two to match). Worker concurrency is
fixed at 1: there is exactly one global check to run per tick, not per-user parallel work, and
concurrency 1 also guards against two overlapping ticks racing each other's state diff.

---

## 10. Output Format

All replies must fit within **Bluesky's 300-character post limit** for the primary reply, with thread continuation for longer content.

### 10.1 `/divine` Output

```
♌ Leo Sun  ·  ♓ Pisces Moon  ·  ♐ Sag Rising

TODAY'S CARD
Seven of Wands · Upright
Mars in Leo · 3rd Decan

[2–3 sentence synthesis narrating the interplay between the natal placements,
 the active transit, and the card's meaning in Asé's voice]

[Single-line actionable closing — a question or invitation to reflect]
```

Post as a **thread** if the content exceeds 300 characters (it usually will):

- Post 1: natal placements + card header
- Post 2: synthesis narration
- Post 3: actionable closing

### 10.1b `/reading` Output (Sun/Moon/Rising — distinct from `/divine`)

```
♋ Cancer Sun  ·  ♏ Scorpio Moon  ·  ♒ Aquarius Rising

THEME
The Hermit — Virgo season

[card's upright meaning, verbatim]. [Theme connector — §9.6]

MOOD
Moon in Pisces

[Mood connector — §9.6]

GROUND
Uranus in Taurus · 4th House — Home & Roots

[Ground domain blurb — §9.6]

[Single-line closing referencing the theme card]
```

No orientation label on the card line and no "· Major Arcana" tag — both are constant/
uninformative for this command (always upright, always a Major — §6.9). `GROUND` is omitted
entirely (not left blank) when the user has set neither Rising nor Sun. Threads on the same
section boundaries (natal+Theme header / Theme text / Mood / Ground / closing) when the combined
text exceeds 300 characters — in practice this is nearly always, given three sections instead of
`/divine`'s one.

### 10.2 `/pull` Output

```
🔮 [Card Name]
[Upright / Reversed]  ·  [Element or Archetype]

[2–3 sentence reading in Asé's voice — pure tarot, no natal context]
```

Single post if it fits; thread if it doesn't.

### 10.3 `/daily` Output — Removed (v1.3.0)

`/daily` has been removed — see the v1.3.0 change note at the top of this document. This section
number is left as a stub (rather than renumbering §10.4 onward) since later section numbers are
referenced elsewhere in this document and in project notes outside it.

### 10.4 `/chart` Output

```
♌ SUN       Leo
♓ MOON      Pisces
♐ RISING    Sagittarius

ELEMENTS
🔥 Fire     ████████░░
💧 Water    ████░░░░░░
🌬️ Air      ██░░░░░░░░
🌿 Earth    █░░░░░░░░░

Dominant energy: Fire
```

Element balance is computed from the three placements:

- Each placement contributes its sign's element
- Bar length = (count of that element / 3) × 10 blocks

### 10.5 `/moon` Output

```
🌙 Moon in [Sign] · [Phase]

[1–2 sentence interpretation in Asé's voice]
```

### 10.6 `/help` Output

Two-post thread (8 commands no longer fit the single-post form the original mockup assumed):

```
🧚🏾‍♀️ Asé — astrology bot with a scoop of whimsy ✨

All commands:

/set sun [sign] moon [sign] rising [sign]
/reading  — for a Sun, Moon & Rising reading
/chart    — your element balance
/pull     — one card from the full deck
```
```
/moon     — current moon sign & phase
/sign     — your sun sign
/divine   — a card drawn from today's sky
/help     — this message
```

The bare `/help` (no `list-all`) reply is a shorter single-post getting-started summary, not the
full reference above:

```
🧚🏾‍♀️ Asé — astrology bot with a scoop of whimsy ✨

To get started: /set sun [your sun sign]

Commands:

/set sun [sign] moon [sign] rising [sign]
/reading  — for a Sun, Moon & Rising reading
/help list-all     — to list all commands
```

---

## 11. AT Protocol Integration

### 11.1 Authentication

Use a **dedicated app password** for the Asé bot account. Never use the account's primary password. Store credentials in environment variables only.

```
ASE_HANDLE=ase.tinylil.world
ASE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### 11.2 Firehose Subscription

Subscribe to `com.atproto.sync.subscribeRepos` and filter for:

- Record type: `app.bsky.feed.post`
- Facet type: `app.bsky.richtext.facet#mention`
- Mentioned DID matches Asé's own DID

**Do not parse `@ase.tinylil.world` as a raw string.** Always use facets. The bot's DID is resolved once at startup and cached.

### 11.2b Firehose Connection Resilience

Three production-hardening measures beyond the basic subscription above, all added after live
incidents:

**Unauthenticated commits.** The subscription is created with `unauthenticatedCommits: true`,
skipping per-commit cryptographic signature verification. Verifying every commit's author DID
document requires a network resolution per commit; at full firehose scale (every post on the
network, not just mentions) this caused real timeouts and lag. A reply bot that only reacts to
a tiny fraction of traffic is not a security-critical indexer, so the tradeoff is accepted.

**Identity/account/sync event exclusion.** `excludeIdentity`, `excludeAccount`, and
`excludeSync` are all set to `true`. `@atproto/sync`'s Firehose client still performs a real
network DID resolution for these event types even with `unauthenticatedCommits` set (that flag
only covers commit *parsing*). Because the firehose's internal read loop processes events
strictly serially — one `await` per event, no concurrency — a single slow or hanging identity
resolution blocks delivery of every event queued behind it, mention commits included. None of
these three event types carry information the bot uses, so excluding them removes the blocking
path entirely.

**Stale-connection watchdog** (`src/atproto/firehoseWatchdog.ts`). A `FirehoseParseError` or
`FirehoseHandlerError` on a single event is already non-fatal by design in `@atproto/sync` —
caught internally, logged via `onError`, loop continues. The failure this guards against is
different: the underlying WebSocket to `wss://bsky.network` going stale without the library's
own reconnect logic recovering it, leaving the process alive with the firehose's `for await`
loop parked forever and no visible error. `handleEvent` calls `onActivity()` on every event
delivered (before any mention filtering); a timer checks every 60 seconds whether 5 minutes
have passed with zero activity. Because the raw, unfiltered network-wide firehose is extremely
high-volume, that much total silence is an unambiguous dead-connection signal, not a false
positive. On staleness, the stale `Firehose` instance is torn down and a fresh one created,
resubscribing automatically.

**Cursor-staleness bound** (`src/atproto/firehoseCursor.ts`). The persisted cursor is stored as
`{seq, savedAt}` rather than a bare sequence number, so its age can be judged. On read, a
cursor older than `MAX_CURSOR_AGE_MS` (10 minutes) is discarded — treated as absent — rather
than resumed from. Without this bound, a long outage (a stale connection lasting hours, e.g.
before the watchdog above existed) resumes the firehose from a cursor that can be hundreds of
thousands of sequence numbers behind "now"; because the network-wide firehose replays strictly
serially, catching up can take comparable-or-longer wall-clock time than the outage itself,
during which every new mention queues up behind unrelated backlog traffic instead of being
answered. Past the threshold, starting fresh from "now" — accepting that mentions sent during
the outage are missed — beats a silent, possibly multi-hour catch-up that looks identical to
"still broken" from outside. This is the same tradeoff already accepted for the no-cursor case
(mentions sent before any cursor exists are also not replayed).

### 11.3 Posting Replies

Use `com.atproto.repo.createRecord` with `app.bsky.feed.post`. For threaded replies, each post must include:

- `reply.root` — the CID and URI of the original mention post
- `reply.parent` — the CID and URI of the immediate parent post in the thread

### 11.4 Custom Lexicon: `app.ase.profile`

Store user natal data as a structured record in the user's own PDS. This requires the user to authorize Asé to write to their repo.

```json
{
  "lexicon": 1,
  "id": "app.ase.profile",
  "defs": {
    "main": {
      "type": "record",
      "description": "User natal placements for Asé bot personalization.",
      "key": "literal:self",
      "record": {
        "type": "object",
        "required": ["sunSign"],
        "properties": {
          "sunSign": { "type": "string", "maxLength": 12 },
          "moonSign": { "type": "string", "maxLength": 12 },
          "risingSign": { "type": "string", "maxLength": 12 },
          "setAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

**v1 fallback:** If PDS write authorization is not yet implemented, store all profile data in Asé's own PostgreSQL `user_profiles` table only. The lexicon write is a progressive enhancement.

---

## 12. Queue & Worker Architecture

### 12.1 Queue Setup

Use **BullMQ + Redis** for the job queue.

```
Queue: "ase-readings"
Concurrency: 5 workers max
Job TTL: 30 seconds (stale mentions are discarded)
Retry: 2 attempts with exponential backoff
```

### 12.2 Job Payload

```typescript
interface ReadingJob {
  mentionUri: string; // AT URI of the post that mentioned Asé
  mentionCid: string;
  authorDid: string;
  authorHandle: string;
  command: string; // raw command string extracted from post text
  enqueuedAt: string; // ISO timestamp
}
```

### 12.3 Worker Steps (in order)

1. Parse command from `job.command`
2. Resolve user profile (cache → PDS → bio → prompt `/set`)
3. If command requires transit data: fetch cached ephemeris (or refresh if stale)
4. Compute Impact Score, select Anchor Transit
5. Route to Decan Matrix → card selection
6. Evaluate aspects → compute orientation
7. Build `AseContext` object
8. Pass `AseContext` to Template Renderer → select template by `card × orientation × relationship_type`; interpolate slots → final post text
9. Format output per command type (thread splitting if > 300 chars)
10. Post reply thread via XRPC
11. Update `last_reading_at` / `last_pull_at` in `user_profiles`

### 12.4 Phenomena & Whimsy Queues

The two autonomous posting pipelines (§2.2) each run on their own BullMQ queue/worker pair,
separate from `ase-readings` above and its rate limits (§14) — neither is triggered by a
mention, so neither goes through the Command Queue or the Worker Steps above.

| Queue           | Trigger                                                                       | Concurrency |
| --------------- | ------------------------------------------------------------------------------ | ----------- |
| `ase-phenomena` | `upsertJobScheduler`, fixed interval (`PHENOMENA_CHECK_INTERVAL_HOURS`) — §9.8 | 1           |
| `ase-whimsy`    | Self-rescheduling delay chain, random cadence — §9.7                          | 1           |

`ase-phenomena` uses a fixed-interval repeatable schedule since its checks are genuinely
periodic. `ase-whimsy` instead re-adds its own next job (`queue.add(..., { delay })`) after
every tick, success or failure, since its cadence is randomized rather than fixed — a
self-rescheduling chain needs its own restart-safety (seed a job only if the chain isn't
already running) and failure-resilience (reschedule in a `finally` block) that a fixed
schedule gets for free from `upsertJobScheduler`.

---

## 13. Data Models

### 13.1 `user_profiles` — see Section 3.4

### 13.2 `reading_log`

```sql
CREATE TABLE reading_log (
  id            BIGSERIAL PRIMARY KEY,
  did           TEXT NOT NULL,
  command       TEXT NOT NULL,
  card          TEXT NOT NULL,
  orientation   TEXT NOT NULL,
  anchor_planet TEXT,
  anchor_degree NUMERIC,
  context_json  JSONB,          -- full AseContext for debugging
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**Status: unwired.** The table exists via migration but nothing in the codebase currently inserts
into it — no worker step writes a `reading_log` row. Documented here as the intended shape for
when that logging is added, not as a description of current runtime behavior.

### 13.3 `ephemeris_cache`

```sql
CREATE TABLE ephemeris_cache (
  id           SERIAL PRIMARY KEY,
  cached_at    TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  positions    JSONB NOT NULL    -- keyed by planet name; values are { sign, degree, isRetrograde }
);
```

Only the most recent non-expired row is used. Insert a new row every 2 hours.

### 13.4 `phenomena_state`

```sql
CREATE TABLE phenomena_state (
  planet         TEXT PRIMARY KEY,
  sign           TEXT NOT NULL,
  is_retrograde  BOOLEAN NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Last-known sign + retrograde status per tracked planet (one row per planet in the 10-planet
`PLANETS` list; Sun/Moon rows always carry `is_retrograde = false`), diffed on every
phenomena-check tick to detect sign ingresses and retrograde stations. Backs a standalone-post
feature (station retrograde/direct, sign ingress alerts) not otherwise described in this
document yet — see the note in this document's own maintenance history for scoping status.

### 13.5 `phenomena_posted_log`

```sql
CREATE TABLE phenomena_posted_log (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  event_date  DATE NOT NULL,
  posted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_type, event_date)
);
```

Records which eclipse events have already been posted, keyed by `(event_type, event_date)` at day
granularity. Stations/ingresses don't need this table — the `phenomena_state` diff itself is
their dedup mechanism — but eclipses are detected via a forward search that would otherwise keep
matching the same future eclipse on every tick until its lookahead window is hit.

### 13.6 `moon_phase_state`

```sql
CREATE TABLE moon_phase_state (
  id          BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  phase       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Singleton table (the `id`/`CHECK` trick guarantees at most one row) tracking the last-known moon
phase, diffed on every phenomena-check tick to detect transitions into one of the 4 principal
phases (New/First Quarter/Full/Last Quarter). Separate from `phenomena_state` because phase is a
joint Sun+Moon property, not a single planet's own state.

### 13.7 `whimsy_post_log`

```sql
CREATE TABLE whimsy_post_log (
  id         SERIAL PRIMARY KEY,
  sign       TEXT NOT NULL,
  directive  TEXT NOT NULL,
  punchline  TEXT,
  posted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Repeat-avoidance log for whimsy posts (§9.7) — uses the fragment text itself as the key rather
than a synthetic id, since the Pool A/B fragment libraries are plain string arrays with no id
column of their own. Repeat-avoidance queries always pull the N most recent rows.

---

## 14. Rate Limiting & Anti-Spam

Rate limits are enforced **before** a job enters the worker (checked in the queue consumer).

| Rule                                                    | Limit            |
| -------------------------------------------------------| ---------------- |
| Minimum gap between any two interactions                | 30 seconds       |
| Max readings (`/reading`, `/divine`) per hour           | 5                |
| Max readings per day                                    | 20               |
| Max pulls (`/pull`) per hour                            | 10               |
| `/help`, `/chart`, `/sign`, `/moon`                     | Not rate-limited |

`/divine` shares the same bucket as `/reading` — it's the same live-ephemeris
computation the limit was originally sized for, just under its post-redesign name.

**On rate limit hit:** Reply with a short message noting when the user can request again — e.g.
`"Hey! Slow down a little — try again in {n}s."` for the 30-second minimum-gap case. Do not
silently discard.

**Opt-in only:** Asé never interacts with a user unless explicitly mentioned via a facet. No proactive DMs, no scanning for keywords.

---

## 15. Correspondence Tables

### 15.1 Major Arcana — Zodiac Sign Correspondences

| Sign           | Major Arcana      |
| -------------- | ----------------- |
| ♈ Aries       | IV. The Emperor   |
| ♉ Taurus      | V. The Hierophant |
| ♊ Gemini      | VI. The Lovers    |
| ♋ Cancer      | VII. The Chariot  |
| ♌ Leo         | VIII. Strength    |
| ♍ Virgo       | IX. The Hermit    |
| ♎ Libra       | XI. Justice       |
| ♏ Scorpio     | XIII. Death       |
| ♐ Sagittarius | XIV. Temperance   |
| ♑ Capricorn   | XV. The Devil     |
| ♒ Aquarius    | XVII. The Star    |
| ♓ Pisces      | XVIII. The Moon   |

### 15.2 Major Arcana — Planetary Correspondences

| Planet    | Major Arcana           |
| --------- | ---------------------- |
| ☉ Sun     | XIX. The Sun           |
| ☽ Moon    | II. The High Priestess |
| ☿ Mercury | I. The Magician        |
| ♀ Venus   | III. The Empress       |
| ♂ Mars    | XVI. The Tower         |
| ♃ Jupiter | X. Wheel of Fortune    |
| ♄ Saturn  | XXI. The World         |
| ♅ Uranus  | 0. The Fool            |
| ♆ Neptune | XII. The Hanged Man    |
| ♇ Pluto   | XX. Judgement          |

### 15.3 Minor Arcana — Element Correspondences

| Suit         | Element | Signs                    |
| ------------ | ------- | ------------------------ |
| 🔥 Wands     | Fire    | Aries, Leo, Sagittarius  |
| 🪶 Swords    | Air     | Gemini, Libra, Aquarius  |
| 💧 Cups      | Water   | Cancer, Scorpio, Pisces  |
| 🪙 Pentacles | Earth   | Taurus, Virgo, Capricorn |

### 15.4 The 36 Decan Matrix (Complete)

This table is the canonical data seed for the Decan Matrix Router. All degree ranges are inclusive on both ends at the arcminute level.

| Sign           | Decan | Degrees    | Chaldean Ruler | Minor Arcana    | Upright Meaning                                | Reversed Meaning                                 |
| -------------- | ----- | ---------- | -------------- | --------------- | ---------------------------------------------- | ------------------------------------------------ |
| ♈ Aries       | 1st   | 0°–9°59'   | ♂ Mars         | 2 of Wands      | Visionary planning, bold initiative            | Over-deliberation, fear of launching             |
| ♈ Aries       | 2nd   | 10°–19°59' | ☉ Sun          | 3 of Wands      | Expansion, foresight, ventures returning       | Delays, disappointment, looking backward         |
| ♈ Aries       | 3rd   | 20°–29°59' | ♀ Venus        | 4 of Wands      | Celebration, home harmony, stable foundation   | Domestic tension, internalized peace, transition |
| ♉ Taurus      | 1st   | 0°–9°59'   | ☿ Mercury      | 5 of Pentacles  | Scarcity mindset, external loss                | Spiritual renewal, structural recovery           |
| ♉ Taurus      | 2nd   | 10°–19°59' | ☽ Moon         | 6 of Pentacles  | Balanced giving, reciprocity                   | Power dynamics in generosity, strings attached   |
| ♉ Taurus      | 3rd   | 20°–29°59' | ♄ Saturn       | 7 of Pentacles  | Patient assessment, long-term investment       | Impatience, wasted effort, short-termism         |
| ♊ Gemini      | 1st   | 0°–9°59'   | ♃ Jupiter      | 8 of Swords     | Feeling boxed in, limits of your own making    | A mental unlock, seeing the alternatives         |
| ♊ Gemini      | 2nd   | 10°–19°59' | ♂ Mars         | 9 of Swords     | A racing mind, worry that won't let you rest   | Fear loosening its grip, a clearer look at what's real |
| ♊ Gemini      | 3rd   | 20°–29°59' | ☉ Sun          | 10 of Swords    | A hard ending, nowhere left to fall            | Overdue reinvention, early healing               |
| ♋ Cancer      | 1st   | 0°–9°59'   | ♀ Venus        | 2 of Cups       | Alchemical bond, mutual partnership            | Misaligned values, broken contracts              |
| ♋ Cancer      | 2nd   | 10°–19°59' | ☿ Mercury      | 3 of Cups       | Communal celebration, collaborative milestone  | Overindulgence, superficial ties                 |
| ♋ Cancer      | 3rd   | 20°–29°59' | ☽ Moon         | 4 of Cups       | Introspection, dynamic stagnation              | Renewed motivation, noticing unseen options      |
| ♌ Leo         | 1st   | 0°–9°59'   | ♄ Saturn       | 5 of Wands      | Creative friction, competition, growth-testing | Chaotic infighting, bypassing necessary struggle |
| ♌ Leo         | 2nd   | 10°–19°59' | ♃ Jupiter      | 6 of Wands      | Public victory, hard-won validation            | Fall from grace, hollow confidence               |
| ♌ Leo         | 3rd   | 20°–29°59' | ♂ Mars         | 7 of Wands      | Defending your position, high ground           | Exhaustion, yielding under pressure              |
| ♍ Virgo       | 1st   | 0°–9°59'   | ☉ Sun          | 8 of Pentacles  | Relentless craft, skill-building               | Perfectionism stalling output, rushed work       |
| ♍ Virgo       | 2nd   | 10°–19°59' | ♀ Venus        | 9 of Pentacles  | Material sovereignty, solitary abundance       | Overspending for status, gilded cage             |
| ♍ Virgo       | 3rd   | 20°–29°59' | ☿ Mercury      | 10 of Pentacles | Generational legacy, permanent architecture    | Cracks in the foundation, short-term thinking    |
| ♎ Libra       | 1st   | 0°–9°59'   | ☽ Moon         | 2 of Swords     | Strategic stalemate, objective ceasefire       | Forced choice, exposure of hidden truth          |
| ♎ Libra       | 2nd   | 10°–19°59' | ♄ Saturn       | 3 of Swords     | Separation, structural purge of illusion       | Unresolved grief, denial of loss                 |
| ♎ Libra       | 3rd   | 20°–29°59' | ♃ Jupiter      | 4 of Swords     | Enforced rest, a body and mind that need to heal | Returning too soon, running on empty           |
| ♏ Scorpio     | 1st   | 0°–9°59'   | ♂ Mars         | 5 of Cups       | Grief, focus on what was lost                  | Moving past sorrow, reclaiming what remains      |
| ♏ Scorpio     | 2nd   | 10°–19°59' | ☉ Sun          | 6 of Cups       | Ancestral memory, nostalgic gifts              | Clinging to the past, nostalgic distortion       |
| ♏ Scorpio     | 3rd   | 20°–29°59' | ♀ Venus        | 7 of Cups       | Overwhelm of options, illusion                 | Resolving illusion, grounding a vision           |
| ♐ Sagittarius | 1st   | 0°–9°59'   | ☿ Mercury      | 8 of Wands      | Swift movement, rapid alignment                | Miscalculated speed, scattered energy            |
| ♐ Sagittarius | 2nd   | 10°–19°59' | ☽ Moon         | 9 of Wands      | Resilience, fortress mentality, final push     | Dropping guard, boundary fatigue                 |
| ♐ Sagittarius | 3rd   | 20°–29°59' | ♄ Saturn       | 10 of Wands     | Heavy burdens, duty, overextension             | Collapse, delegation, releasing the load         |
| ♑ Capricorn   | 1st   | 0°–9°59'   | ♃ Jupiter      | 2 of Pentacles  | Dynamic balance, constant adaptation           | Chaotic juggling, dropping responsibilities      |
| ♑ Capricorn   | 2nd   | 10°–19°59' | ♂ Mars         | 3 of Pentacles  | Elite collaboration, masterful design          | Poor teamwork, misaligned blueprints             |
| ♑ Capricorn   | 3rd   | 20°–29°59' | ☉ Sun          | 4 of Pentacles  | Financial control, protecting reserves         | Holding on too tightly, fear masquerading as caution |
| ♒ Aquarius    | 1st   | 0°–9°59'   | ♀ Venus        | 5 of Swords     | A win that costs more than it's worth, conflict with no real winner | Empty resolution, long-term cost of winning |
| ♒ Aquarius    | 2nd   | 10°–19°59' | ☿ Mercury      | 6 of Swords     | Moving toward calmer waters                    | Stuck in transition, baggage weighing you down   |
| ♒ Aquarius    | 3rd   | 20°–29°59' | ☽ Moon         | 7 of Swords     | A quiet advantage, working around the obstacle | A plan unraveling, the truth coming to light     |
| ♓ Pisces      | 1st   | 0°–9°59'   | ♄ Saturn       | 8 of Cups       | Conscious departure, walking away              | Reluctance to leave, staying for a safety that's stopped serving you |
| ♓ Pisces      | 2nd   | 10°–19°59' | ♃ Jupiter      | 9 of Cups       | Wish fulfillment, self-contained abundance     | Dissatisfaction despite success, overindulgence  |
| ♓ Pisces      | 3rd   | 20°–29°59' | ♂ Mars         | 10 of Cups      | Emotional legacy, family harmony               | Fractured bonds, illusion of harmony             |

### 15.5 Court Card Modality Correspondences

| Court Rank | Modality              | Examples                                                   |
| ---------- | --------------------- | ---------------------------------------------------------- |
| Queens     | Cardinal (initiation) | Queen of Swords = Libra; Queen of Cups = Cancer            |
| Kings      | Fixed (mastery)       | King of Cups = Scorpio; King of Wands = Leo                |
| Knights    | Mutable (movement)    | Knight of Pentacles = Virgo; Knight of Wands = Sagittarius |
| Pages      | Pure element          | Page of Wands = Earth of Fire (unmanifested)               |

_Court cards appear in `/pull` draws only in v1. They are not produced by the decan engine (which covers only pips 2–10)._

### 15.6 Ruling Planet Table (new `/reading`'s Ground axis, §6.9)

Modern rulerships — chosen for consistency with §15.2's existing use of the outer planets
(Pluto/Uranus/Neptune already appear there), not the traditional 7-visible-planet system.

| Sign | Ruler | Sign | Ruler |
|---|---|---|---|
| ♈ Aries | ♂ Mars | ♎ Libra | ♀ Venus |
| ♉ Taurus | ♀ Venus | ♏ Scorpio | ♇ Pluto |
| ♊ Gemini | ☿ Mercury | ♐ Sagittarius | ♃ Jupiter |
| ♋ Cancer | ☽ Moon | ♑ Capricorn | ♄ Saturn |
| ♌ Leo | ☉ Sun | ♒ Aquarius | ♅ Uranus |
| ♍ Virgo | ☿ Mercury | ♓ Pisces | ♆ Neptune |

### 15.7 The 12 Whole Sign House Life Domains (new `/reading`'s Ground axis, §6.9)

Content adapted (not copied) from a user-supplied reference source, trimmed to this project's
established short-and-warm register and checked against §9.5's voice rules.

| House | Domain | Blurb |
|---|---|---|
| 1 | Self & Identity | This is playing out through your own sense of self — how you show up, not how others see you. |
| 2 | Money & Value | This is playing out in what you own, earn, and consider worth having. |
| 3 | Communication & Community | This is playing out through conversations, ideas, and the people nearby. |
| 4 | Home & Roots | This is playing out in your foundations — home, family, the private ground you stand on. |
| 5 | Creativity & Romance | This is playing out through what you make and who you love. |
| 6 | Work & Routines | This is playing out in the daily grind — habits, health, the small systems holding everything else up. |
| 7 | Partnerships | This is playing out between you and one other person — a mirror, not a solo project. |
| 8 | Transformation & Shared Resources | This is playing out beneath the surface — what's shared, owed, or quietly being let go of. |
| 9 | Philosophy & Travel | This is playing out through the bigger picture — beliefs, distance, whatever's pulling your view wider. |
| 10 | Career & Legacy | This is playing out in public — your work, your name, what people see when they look up. |
| 11 | Community & Hopes | This is playing out through your wider circle — the people you're building toward something with. |
| 12 | Rest & the Subconscious | This is playing out somewhere quiet — rest, dreams, whatever's working itself out beneath your notice. |

---

## 16. Version Roadmap

### v1 (This Spec)

**Commands:** `/help`, `/set`, `/sign`, `/pull`, `/reading`, `/divine`, `/moon`, `/chart` (8 — `/divine` added when `/reading` was redesigned, §6.7-6.9; `/daily` removed in v1.3.0, §6.5)

**Engine:** Decan-based card selection for `/divine` (Minor Arcana 2–10) · Sun/Moon/Rising Big Three formula for `/reading` (§6.7-6.9) · `/pull` with 65% Major Arcana weighting (full 78 cards) · Aspect-based orientation logic for `/divine` (`/reading` never reverses, §6.9) · Static template library for `/divine` (432 synthesis blocks) plus a 26-entry connector/domain library for `/reading` (§9.6) · Bio parsing fallback · BullMQ queue · PostgreSQL profile cache · No LLM dependency

**Not in v1:** Birth time/location input, *Placidus* house calculation (`/reading`'s Whole Sign House placement in §6.9 needs no birth time and is in scope — it's a different, simpler system from the v3 item below), `/pull 3`, multi-card spreads, `/compat`, PDS lexicon writes (optional enhancement)

### v2

- `/pull 3` and named spreads (`/pull love`, `/pull career`, `/pull week`)
- Major Arcana card appearances in `/divine` (via the sign/planet major arcana table, §15.1-15.2)
  — **already satisfied for the new `/reading`**, whose card is always a Major Arcana drawn from
  §15.1 (§6.7); `/divine`'s decan engine still only ever yields the 36 Minor Arcana pips (§6.1)
- Venus, Mercury, Mars bio extraction (beyond Sun/Moon/Rising)
- Element relationship depth in Reading Composer
- `/chart` element bar with planetary ruler annotations
- `/compat @handle`
- PDS lexicon write for `app.ase.profile` (decentralized storage)

### v3

- Birth date/time/location input → full calculated natal chart
- House calculation (Placidus — a different, time-of-birth-dependent system from `/reading`'s
  already-shipped Whole Sign House placement, §6.9/§15.7, which needs no birth time)
- Planetary transits to natal houses
- Personalized tarot spreads
- Weekly digest (`/weekly`)
- Custom AT Protocol application records beyond the bot

---

## 17. Environment & Dependencies

### 17.1 Environment Variables

```
# Bluesky credentials
ASE_HANDLE=ase.tinylil.world
ASE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
ASE_DID=did:plc:xxxxxxxxxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ase

# Redis
REDIS_URL=redis://localhost:6379

# Ephemeris
SWEPH_PATH=/path/to/ephe   # Swiss Ephemeris data files

# Config
EPHEMERIS_CACHE_TTL_HOURS=2
PHENOMENA_CHECK_INTERVAL_HOURS=2
WORKER_CONCURRENCY=5
DAILY_READINGS_LIMIT=20
HOURLY_READINGS_LIMIT=5
WHIMSY_ENABLED=false
```

### 17.2 Core Dependencies

| Package                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `@atproto/api`          | AT Protocol client (posting, profile fetch, XRPC) |
| `sweph` or `pyswisseph` | Swiss Ephemeris planetary position calculation    |
| `bullmq`                | Job queue                                         |
| `ioredis`               | Redis client                                      |
| `pg` / `postgres`       | PostgreSQL client                                 |
| `crypto` (stdlib)       | CSPRNG for seeded card draws                      |

### 17.3 Template Library

All authored content is static data bundled with the application. It requires no external service at runtime — this applies equally to `/divine`'s synthesis-block library and the new `/reading`'s connector/domain library, even though they're structured differently (§9.1 vs §9.6).

**`/divine`'s library** — `templates/readings.json`, an array of `ReadingTemplate` objects (§9.2). Requires 432 synthesis blocks (36 cards × 2 orientations × 6 relationship types). **Status: complete** — all 432 combos authored and voice-checked (§9.5); `npm run validate-templates` reports 0 missing.

**`/reading`'s content** (§9.6) — `src/reading/readingConnectors.ts` (14 entries: 7 Theme + 7 Mood connectors) and `src/data/houseDomains.ts` (12 house-domain entries), plus `src/data/rulingPlanet.ts` (12-entry data table, not prose). **Status: complete** — all 26 prose entries authored and voice-checked (§9.5).

**`/pull`'s content** (§9.4) — spread across `src/data/majorArcana.ts`, `src/data/courtCards.ts`, and `src/data/decans.ts`. 156 entries (78 cards × 2 orientations). **Status: complete.**

**Validation:** `npm run validate-templates` verifies every `/divine` `card × orientation × relationship_type` combination and every `/pull` `card × orientation` meaning has a corresponding entry; missing entries are reported as build errors. The fallback chain in §9.3 exists for `/divine` development only — tier 3 fallbacks must be treated as failing tests. The new `/reading`'s content has no fallback chain to validate this way, since its 26-entry library is small enough to be exhaustively enumerable by type (§9.6) rather than needing a coverage script.

---

_End of Specification. All tables, logic, and schemas in this document are implementation-ready. No design decisions remain open. `/divine` and `/reading` (§6.7-6.9, §9.6, §10.1b) are both fully implemented and tested, including `/divine`'s full 432-entry template library (§17.3), whimsy's voice guidelines (§9.7), phenomena's event/content model (§2.2, §9.8, §12.4), and the firehose's production resilience measures (§11.2b); `/daily` was removed in v1.3.0 (see the change note at the top). This document is the sole provenance record for the project — no external design-notes files are maintained alongside it._
