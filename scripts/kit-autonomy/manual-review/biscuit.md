# Manual review — biscuit (Biscuit)

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (two class-scoped buffs — `alliesOfClass` Attacker normal-crit + Supporter ATK; `fullBurstEnd`-vs-`fullBurstEnter`; `burstCast`-vs-`fullBurstEnter`; two class-scoped `heal` recovery channels)

> Slug disambiguation: `biscuit` is the only Biscuit (RL / Electric / Supporter / Burst II, Tetra,
> released 2023-03-15). Lint clean (no AMBIGUOUS).

## Kit summary

Biscuit is an Electric rocket-launcher Supporter whose entire kit is team support keyed off the burst
rotation — she has **no damage-dealing line of her own**. When any Full Burst **ends**, she gives all
**Attacker** allies +5.77% critical rate on their NORMAL ATTACKS only for 10s (never lifts skill/burst
crit) and trickle-heals them (1.53% of her Max HP every 1s for 10s — event-only; no HP pool). Her own
Burst II buffs all **Supporter** allies (including herself) with +43.08% ATK for 10s and lets them
recover HP equal to a portion of the damage they deal over the next 10s (lifesteal — event-only), while
also rebuilding destroyed cover on two allies (no sim representation). Her Skill 2 is a defensive
rescue: when a Defender ally drops below half HP she makes them briefly invincible and heals them
(twice per battle) — un-fireable in v1 (immortal boss, no HP pool). The two heal lines ARE modeled as
`heal` recovery channels (per the helm precedent), and their CLASS SCOPING is exactly what keeps them
from spuriously firing the canonical Defender recovery consumer (Crown) — the inverse of the liter
cover-HP trap (owner ruling 2026-07-21).

## Line-by-line

| Line                                                            | Disposition    | Notes                                                                                                                              |
| --------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| S1: fullBurstEnd → Attacker allies critRateNormalPct 5.77/10s   | FAITHFUL       | Scoped to NORMAL ATTACKS (never generic critRatePct) AND to Attacker class; B1 discriminates on both axes (class + normal-scope)   |
| S1: fullBurstEnd → Attacker allies heal HoT 1.53%/1s×10         | FAITHFUL       | `heal ticks:10 intervalSec:1`, Attacker-scoped recovery stream; feeds an Attacker consumer (asuka), never the Defender (Crown)     |
| S2: Defender HP<50% → invincible 5s (2/battle)                  | DOCUMENTED_GAP | HP-threshold trigger un-fireable in v1 (no HP pool / damage-taken); no invincibility primitive; verbatim record                    |
| S2: Defender HP<50% → heal 23.26% Max HP (2/battle)             | DOCUMENTED_GAP | Genuine heal but shares the un-fireable trigger; NOT proxied (would spuriously feed a Defender on-recovery consumer)               |
| Burst: burstCast → 2 cover-destroyed allies rebuild cover 93.6% | DOCUMENTED_GAP | Cover-HP NO-OP class (liter S2 precedent); no cover entity, boss deals no damage so no cover is ever destroyed                     |
| Burst: burstCast → Supporter allies atkPct 43.08/10s            | FAITHFUL       | `burstCast` (NOT fullBurstEnter), Supporter-scoped incl. self; B6 discriminates class axis + live on totals                        |
| Burst: burstCast → Supporter allies lifesteal 55.44%/10s        | FAITHFUL       | `heal ticks:10 intervalSec:1`, Supporter-scoped recovery stream; ⚑ 10-tick cadence is a stand-in for per-damage-instance lifesteal |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently re-derived all
  7 kit lines. CONVERGED exactly on the two load-bearing buffs (B1 `critRateNormalPct`/`fullBurstEnd`/
  Attacker; B6 `atkPct`/`burstCast`/Supporter incl. self) and on the three DOCUMENTED_GAPs. DIVERGED on
  the two heals: fable marked them load-bearing recovery streams where the driver initially dropped them
  UNMODELED. Fable also independently flagged the two-B2 fixture trap (Crown out-rotates biscuit).
- **Driver reconciliation (S2c):** resolved in fable's favor. The helm precedent (burst lifesteal modeled
  as `heal ticks:10 intervalSec:1`, helm.test.ts H8) confirms genuine team heals ARE modeled as recovery
  channels in this sim. Both heals encoded with correct class scoping; the S2 heal stays UNMODELED because
  its HP-threshold trigger cannot fire (fable concurred). Test grew 10→14 (asuka Attacker-recovery probe
  for B2/B7 + a Crown Defender-consumer liter-trap guard).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently authored 18 tests (4 honest GAP
  skips — the heals/cover/S2 are unobservable in the blind fixture, which carries no recovery consumer).
  As authored, its fixture (`controlComp('biscuit',true)` = liter/crown/biscuit/helm) leaves biscuit 0
  burst casts (Crown out-rotates her) — the blind author's OWN non-vacuity guard flags this as "untested,
  not refuted". Re-fixtured (`blind/biscuit.adapted.test.ts`, crown→ada so biscuit is the sole B2): **14
  pass / 4 skip, GREEN vs the driver override**. The S1 group passed as-authored.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **BYTE-IDENTICAL** to the driver override on
  the load-bearing encoding — both blocks (same triggers, `alliesOfClass` targets, stats, values,
  durations, and `heal ticks:10 intervalSec:1`), `skill2:[]`, and the same three UNMODELED lines. Only
  cosmetic differences (cover-rebuild split into two unmodeled lines; caveat wording). 4 honest flags:
  RL weapon-cadence datamine ⚑, lifesteal 10-tick stand-in ⚑, skill2 modeling-gap ⚑, burst self-inclusion.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].** All 4
  load-bearing lines FAITHFUL and converging byte-identically across driver + two blind derivations; all 3
  un-fireable/un-representable lines DOCUMENTED_GAPs with verbatim records and empirical guard tests
  (S2 board-inert identity; Crown Defender-consumer negative). `convergence.s5TestsVsDriverOverride: GREEN`,
  `redAssertions: []`. Judge explicitly validated the heal-modeling reconciliation (helm precedent) and the
  crown→ada fixture swap.

## Residual flags (owner spot-check cluster)

1. **Burst lifesteal cadence ⚑** — real lifesteal fires once per damage instance (dozens of times over 10s
   for an actively firing ally); the `ticks:10 intervalSec:1` encoding is an arbitrary stand-in chosen to
   match the sibling HoT shape. Direction of error: a future Supporter "on-recovery" consumer would be
   UNDER-credited. Currently immaterial — no Supporter recovery consumer exists in the roster. Refit candidate
   if one ever ships.
2. **RL weapon cadence ⚑** — `rate_of_fire 60` / `reloadFrames 141` / `chargeFrames 60` are datamined and
   footage-unverified; they gate biscuit's minor self-damage (~8.9% of team in the validate sim). Recipe:
   count shots + time one reload cycle from a solo recording (ammo counter 6→0→6).
3. **Convergence ≠ measurement** — cross-family agreement here is stability on kit-literal prose, not an
   independent sim-vs-real measurement. The existing pins (driver test 14/14 + adapted blind test green) are
   the independent labeled check per PROVE-IT-DIFFERENTLY; tier stays MODEL_ONLY / tuned:false until a real
   fight validates it.
