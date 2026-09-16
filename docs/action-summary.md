# Offline action summaries (format v1)

The recorder half of the audit's §6.1-B "plausibility-enveloped sync" — the
honest answer to "encrypted offline progress", which cannot exist (a client
always holds its own keys). Instead: the client records a compact summary of
what each play session did; the server accepts offline gains **up to the
maximum legitimate rate** for the attentive time claimed, derived from the
game's own tick tables (gathers ~1.3–1.9 s, swings ~1.7 s, per-recipe craft
ticks) plus tool/level modifiers and a margin. Honest players are always
inside the envelope; a tampered summary caps out at what a legitimate
no-lifer could do — which percentile ranks absorb by definition.

**Phase 1 status:** clients record and upload from day one
(`js/net/actionlog.js`, ridealong on save-vault uploads); the server stores
rows unvalidated (`action_summaries.validated = 0`). Phase 2 turns on the
envelope and validates historically — no cold start, no save-format
migration. That forward-compatibility is the whole reason this format ships
now, so change it additively and bump `v` if semantics change.

## Shape

One JSON object per play session:

```jsonc
{
  "v": 1,
  "start": 1789500000000,        // unix ms, session start
  "end":   1789511000000,        // unix ms, last heartbeat
  "build": "g1a2b3c4d5",         // WORLDGEN_SIG — ties gains to a tick-table era
  "activeSec": 5210,             // attentive seconds (input within the last 90 s)
  "afkSec": 1200,                // AFK-but-acting seconds (overnight grinding)
  "hours": [                     // one bucket per elapsed hour with any activity
    {
      "h": 0,                    // hour index from session start (capped at 23)
      "activeSec": 3400, "afkSec": 0,
      "xp":     { "Fishing": 4120, "Cooking": 800 },  // ACTUAL xp deltas (post-aptitude)
      "kills":  { "harrier": 6 },
      "gained": { "raw_kahawai": 61, "flax": 14 },    // items in
      "used":   { "raw_kahawai": 40 },                // items out
      "coinsIn": 350, "coinsOut": 120,                // coin flow (sales / purchases)
      "buys": 3, "contracts": 1, "deaths": 0
    }
  ]
}
```

## Semantics and caps

- Recorded at the choke points every gain already flows through: `addXp`,
  `addItem`/`removeItem`, `killMonster`, `tradeBuy`, `fulfilContract`,
  `playerDie` — wrap-by-reassignment, zero game-logic changes.
- `xp` records the **measured skill delta** (after aptitude multipliers), so
  the envelope compares like with like.
- Item maps cap at 48 distinct ids per hour; overflow pools under `"*"`.
  Kills likewise. The envelope needs magnitudes, not a full ledger.
- Bank deposits/withdrawals pass through `removeItem`/`addItem`, so vault
  shuffling shows up as `used`/`gained` churn. Known, harmless noise: it
  inflates neither xp nor net wealth, which is what the envelope prices.
- Attentiveness mirrors Play Pulse's line: a second is *active* if there was
  input in the last 90 s, *afk* if an action is running without input, and
  uncounted otherwise. Phase-2 validation weights afk seconds at the
  documented AFK-grind rate, exactly as Pulse scores them.
- Sessions shorter than 30 counted seconds are discarded. At most 40
  finalized sessions queue locally (`taiao_actionlog_v1`); they upload with
  the next vault push (up to 20 per upload, ≤ 32 KB each server-side) and
  re-queue if the upload fails. `DEV_MODE` builds record nothing.

## What v2 may add (design headroom, not promises)

Per-hour position cells (travel plausibility), server-issued session nonces
chained through summaries (tamper *evidence*, still not tamper *proof*), and
per-recipe craft counts once the envelope wants recipe-level rates.
