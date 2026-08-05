# Manual review — quiry (Quiry)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (Defender-class-scoped buffs ×3; `burstCast`-vs-`fullBurstEnter` trigger identity; count-cap elision; recovery-window shape)

> Slug disambiguation: `quiry` is Quiry — RL / Supporter / Wind / Burst II, Missilis, released
> 2022-12-15. Lint clean (no AMBIGUOUS). No other entry shares the slug or the name.
> FROM-SCRATCH build: no override existed before this gauntlet (`simSupported` was false).

## Kit summary

Quiry is a Wind rocket-launcher Supporter whose kit is aimed almost entirely at Defender-class
teammates (judge's wording — converged independently by every role). Every full-charge rocket she
fires grants her Defender allies bonus ATK equal to 5.81% of her own ATK for 3 seconds (a FLAT
caster-basis add, not a percentage of the recipient's ATK — and it genuinely lapses across her
~2.35s reload, since the 3s window is shorter than the reload + next-charge gap). The same hits
sap the struck target's ATK by 8.94% of hers — an enemy debuff the engine deliberately cannot
consume (v1 models no enemy ATK and the boss deals no damage), so it rides verbatim in
`unmodeled`. At battle start she permanently raises her Defender allies' Max HP by 11.63%
(the TARGET's own %; an ally-grant, so the e3 rule keeps it out of any teammate's HP→ATK
conversion — damage-inert, pinned rather than assumed). Her Burst II opens a 10-second team
recovery window (6.96% of her final Max HP per second — event-only, no HP amount modeled) and
gives all Defender allies +19.9% Critical Rate for 10 seconds. She has no personal damage lines;
her sim footprint is Defender-scoped ATK/crit support plus the recovery channel.

## Line-by-line

| Line                                                                      | Disposition       | Notes                                                                                                                                  |
| ------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1: FC hit → target ATK ▼ 8.94% of quiry ATK, 3s                          | DOCUMENTED_GAP    | Verbatim in `unmodeled.skill1`: engine models no enemy ATK (enemy-buff branch = damageTakenPct/distributedDamagePct > 0 only); inert by construction; nearest-wrong (damageTakenPct) fenced by blind smuggle-check |
| S1: FC attack → 2 Defenders ATK ▲ 5.81% of quiry ATK, 3s                  | FAITHFUL          | `chargeCounter:1` (RL: every shot a full charge) → `alliesOfClass Defender` → `casterAtkPct 5.81` flat (static basis — prose lacks "final"); Q1 pins value/scope/cadence/3s expiry + the reload LAPSE |
| S2: battle start → 2 Defenders Max HP ▲ 11.63% continuously               | FAITHFUL (inert)  | `passive` → `targetMaxHpPct 11.63` (target-own basis, frame 0, no expiry); Q2 pins e3 inertness (removal moves no total) AND that a SELF grant of the same magnitude would move 2b (basis load-bearing) |
| Burst: all allies recover 6.96% final Max HP /1s × 10s                    | FAITHFUL (window) | `burstCast` → allies → `heal ticks:10 intervalSec:1` — recovery EVENT window only; magnitude verbatim in `unmodeled.burst` (no HP pool), not fudged; Q3 pins ≥10 consumer firings spanning ≥8s, first tick ON the cast frame (refutes fullBurstEnter) |
| Burst: all Defenders Crit Rate ▲ 19.9% 10s                                | FAITHFUL          | `burstCast` → `alliesOfClass Defender` → `critRatePct 19.9` (UNSCOPED — no "of normal attacks" clause); Q4 pins one apply per cast on cast frames, +0.199 live on 2b's normals, Defender-only scope |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all four
  load-bearing encodings + the S1a UNMODELED disposition (same engine reasoning, same
  nearest-wrong warnings: damageTakenPct smuggle, passive/permanent S1, ticks:1 tandem trap,
  unscoped crit). Pre-registered two upgrades the driver adopted: the reload-LAPSE assertion
  (the 3s S1 buff genuinely drops each magazine) and the count-2 scope gap ⚑. Also flagged the
  vacuous-fixture hazard (a co-B2 starving quiry of casts) — the driver fixture was built
  sole-B2 for exactly this reason.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 5 kit lines
  with a diff-based event-isolation method. Pristine vs driver override: 5 pass / 13 fail — ALL
  13 from one blind-side wiring bug (the onEvent sink never reached `cfg`, so the event log was
  empty). Adapted copy (ONE mechanical fix — wire `cfg.onEvent`; assertion intent unchanged):
  11 pass / 7 fail / 3 skip. The 7 reds: two NULL-VS-UNDEFINED type artifacts (engine emits
  `durationShots:null` / `expiresFrame:null` = the asserted "no round budget" / "no expiry"
  semantics) and five burst-group assertions red only because the blind's own controlComp
  fixture hands every stage-II slot to crown (cd 20) — quiry casts 0× there (empirically
  probed); the blind's OWN non-vacuity guard flags exactly this, and the driver's sole-B2
  fixture pins the same burst lines green with discrimination. **0 REAL-GOTCHA.**
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. CONVERGED: all four load-bearing
  blocks byte-equivalent to the driver's (same stats, values, durations, targets, triggers) and
  the identical S1a unmodeled reasoning ("NOT a Damage Taken ▲ line"). Sole delta: S1 trigger
  spelled `shotFired` instead of `chargeCounter:1` — observationally identical on an RL (every
  pull dispatches charged), self-flagged by the blind author as a "trigger proxy"; the driver's
  chargeCounter preserves the "with Full Charge" identity. Same count-2 ⚑ independently.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**, `gotchas:[]`,
  `discriminationOk:true`. Accepted every blind-side classification, confirmed each FAITHFUL
  line against the formula SSOT (caster-ATK flat routing, target-own Max HP basis + e3 scope,
  recovery-window observable, unscoped crit bucket), and noted three owner spot-checks (below).

## Residual flags (owner spot-check cluster, from the judge)

1. **Data conflict:** `burstCooldownSec: 60` (synced, engine-facing) vs `skillCooldownsSec.burst: 40`
   (datamine ult table) in `data/characters.json`. Driver and BOTH blind families read 60 —
   convergence proves stability, not correctness; a true 40s CD would add casts + crit uptime.
   Worth one owner glance at which column the game actually uses (a sync fix, not an override fix).
2. **⚑1 cadence tuple** (mandatory, datamine-only): pullsPerSec / reloadFrames 141 /
   rolling-reload. Recipe: read rounds/min + the reload gap from a quiry focus video. Tier low —
   drives only her shot count (the S1 refresh cadence saturates uptime while she fires anyway).
3. **⚑2 count-2 Defender cap:** `alliesOfClass` has no count field — the scope grants every
   Defender-class ally. Exact at ≤2 Defenders (every standard tank comp; fixture fields 1);
   over-grants only in 3-tank comps. Recipe: A/B a 3-Defender team or popup-read the buff icons.

## Artifacts

- Driver: `scripts/tests/units/quiry.test.ts` (18/18 GREEN; RED phase in `reviews/quiry.verify.txt`)
  + `src/skills/overrides/quiry.json`
- S2b: `reviews/quiry.test-review.json` · S5: `blind/quiry.test.ts` (+ `blind/quiry.adapted.test.ts`)
  · S6: `blind/quiry.override.json` · S7: `results/quiry.json` (+ `results/quiry-judge-packet.md`)
- Cross-family evidence: `cross-family/quiry/{s2b,s5,s6,s7}-result.json`
