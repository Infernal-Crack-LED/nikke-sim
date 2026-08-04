# Manual review — power (Power)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate ×2 — "Blood Fiend at max stacks" gates S2 and the burst's second nuke; the gate is a resource-pool PROXY of a buff-stack count, ⚑ documented)

> Slug disambiguation: `power` IS the Chainsaw Man collab unit (manufacturer "Abnormal", released
> 2026-02-22 in data, RL/Fire/Attacker/Burst III). No same-family variant exists; lint clean.
> Fresh build: no prior override, `simSupported false → true`, kit-status row seeded in the exact
> `--refresh` shape (no global `--refresh` — concurrent batches share the file) then flipped via
> `--gauntlet`.

## Kit summary

Power is a Fire rocket-launcher Attacker whose every shot is a full charge (RL charge 60f + 22f
release recovery, 6-round magazine, 141f reload). Each full charge stacks Blood Fiend: +6.4% ATK per
stack, up to 5 stacks, each application refreshing a 3s window — she ramps to +32% by her 5th shot
and, at scope-lock cadence, holds it (her longest apply-to-apply gap is the 172f/2.87s reload
boundary, 8 frames inside the 3s expiry). Once per battle, her 18th normal attack — which lands at
max stacks, exactly three magazines in — instantly refills her magazine (skipping one natural
reload) and widens her explosion radius for 10s (radius is damage-inert: the sim fights one boss).
Her burst nukes the single enemy (trivially the highest-final-ATK one) for 1584% of final ATK, and
when Blood Fiend is at max stacks at cast time it lands a second 1584% hit — doubling the burst to
3168%. The control-comp fixture delivers a genuine gate-closed cast: camera-focused behind
liter/crown her first burst fires at ~5.4s after only 4 full charges (stacks 4 < 5), so cast 1 deals
one nuke and every later cast deals two — the kit's own behavior, pinned as the discrimination.

## Line-by-line

| Line                                                                    | Disposition    | Notes                                                                                                                                    |
| ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| S1: full charge → self Blood Fiend ATK ▲6.4%, 5 stacks, 3s               | FAITHFUL       | Two single-effect `chargeCounter count:1` blocks (buff + pool increment) — a multi-effect chargeCounter CYCLES effects one-per-charge (empirically observed pre-fix: 56 applies vs 111 shots); P1 pins one apply per shot, stacks 1→5, 180f expiry |
| S2: after 18 normal attacks IF Blood Fiend at max stacks                 | FAITHFUL       | `hitCount 18` + `resourceGate{bloodFiend,min:5}`; pool 0→5 mirrors the stacks (⚑ below); P5 proves causality (pool zeroed → no skip)    |
| S2: Explosion Radius ▲38.61% for 10 sec                                  | DOCUMENTED_GAP | Verbatim in `unmodeled`; no AoE/multi-target axis at scope — radius moves zero damage; nearest-wrong `projectileExplosionPct` (explosion DAMAGE) pre-registered by S2b, walked into by the S6 blind, avoided by driver |
| S2: Reloads 100% of the magazine                                         | FAITHFUL       | `instantReload fraction 1` inside the 18th pull (pre ammo-decrement); shot-gap signature 82f vs 172f control boundaries; early-arming counterfactual migrates the skip                                                |
| S2: Activates 1 time(s) per battle                                       | FAITHFUL       | `everyN 999 / everyNOffset 1` idiom (first gated activation only; no generic once-per-battle block field); no-once counterfactual strictly out-damages base (+1-round carryover per 18 hits)              |
| Burst: 1584% of final ATK, highest-final-ATK enemy                       | FAITHFUL       | `burstCast → enemy flatDamage 1584`; pre-FB (empty `fbMajorApplied`), crit at caster rate / no core / no range by engine default; "highest final ATK" degenerates to the single boss (caveated)          |
| Burst: +1584% additional IF Blood Fiend at max stacks                    | FAITHFUL       | Second `burstCast` block + `resourceGate{bloodFiend,min:5}`; cast 1 single / casts 2–6 double in the 4-unit fixture (11 = 2×6−1); pool-zero counterfactual drops exactly the second nuke — strongest discrimination in the packet |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 4 load-bearing lines
  FAITHFUL with the SAME nearest-wrong models the driver registered: flat instant +32% passive for
  S1; recurring every-18-hits reload (dropped once-limit) for S2; `projectileExplosionPct` mis-map
  for the radius; ungated/`fullBurstEnter`-keyed second nuke for the burst. Radius disposition
  (verbatim unmodeled) identical. One method refinement reconciled: reviewer proposed a
  round-36 gapless-refill RED check; empirically later refills top up a NON-EMPTY magazine (capped),
  so the driver discriminates the once-limit by a strict total-damage delta instead.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. 14 tests written from prose alone;
  8 pass / 3 fail / 3 skipped (honest blind GAPs) vs the driver override. **All 3 failures ruled
  RECON_ERROR by the judge:** (1) "moves no teammate" — clearing skill1 also removes the pool block
  that gates S2, so the isolation premise is false for any encoding that houses the gate proxy in
  S1 (per-apply `targetIdx===POWER` already pins self-only scope); (2) "reload adds fire time" —
  fixed-horizon phase artifact: 144.13−131.57 = 12.56M ≈ exactly one 3168% double nuke (noS2's
  phase lands a 5th cast inside the 180s horizon that base's cast 5, frame ~10842, misses); the
  same line is net-positive (+1.05M) in the driver's 4-unit fixture; (3) "two instances per cast" —
  the blind reader keys damage events by numeric `casterIdx` but damage events carry `slug`/string
  `srcSlot`; with a corrected reader the 3-unit comp yields exactly 2×fbStarts (all 4 casts there
  are genuinely max-stacked). Driver applied one mechanical import-path fix (precedent:
  tia.test.ts 2026-07-28); no assertion touched.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Convergent on S1 (chargeCounter
  count 1, atkPct 6.4/5/3s), S2 trigger (hitCount 18 + instantReload), and burst shape (two
  burstCast flatDamage 1584). Divergent exactly where S2b pre-registered: encoded Explosion Radius
  as `projectileExplosionPct 38.61/10s` (a Damage-Up stat — manufactures damage the kit never
  granted), dropped the once-per-battle latch, left BOTH max-stack gates unconditional, and added
  `rampSec 6` on top of `maxStacks` (its own flag admits the double-ramp risk). The driver's
  discrete stack accrual IS the ramp.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[]**.
  10 of 11 kit lines FAITHFUL + 1 correctly DOCUMENTED_GAP; all three S5 reds verified
  arithmetically as blind-side artifacts; S6 divergences ruled wrong in precisely the
  S2b-pre-registered ways. Judge note: the strongest discrimination is the fixture's natural
  gate-closed first cast ("stronger than S2b's proposed withPatchedOverride forcing").

## Residual flags for owner

1. **bloodFiend pool never decays (⚑ tier-low).** The gate proxy has no expiry primitive; the real
   buff drops 3s after the last full charge. Estimate: zero divergence at scope-lock cadence (every
   in-fixture gate read lands at genuine 5 stacks; longest apply-to-apply gap 172f < 180f expiry).
   Live divergence window: a >3s fire pause (boss phase transition) coinciding with hit-18 or a
   burst cast. Recipe: focused Power recording spanning such a pause — read the Blood Fiend icon
   expiry vs whether S2/the burst still consumed the max-stacks condition.
2. **Reload-skip fixed-horizon phase.** The one-time skip is strictly ≥0 over an unbounded horizon
   but phase-shifts the reload cycle ~172f; at exactly 180s in the 3-unit comp the shifted phase
   reads net-negative (a late 5th cast lands/mis-casts across the boundary). Artifact of the
   horizon, not the encoding; the 4-unit control fixture reads +1.05M.
3. **No graded comps.** All magnitudes are datamine-literal (MODEL_ONLY); a real Power fight has
   never been recorded. First recording should sanity-check the per-charge stack cadence (the
   chargeFrames/rate_of_fire tuple is the known-unreliable datamine field).
4. **Judge housekeeping note.** The judge flagged the driver's multi-effect chargeCounter cycling
   claim as "asserted engine behavior not independently verified in this packet" — it WAS directly
   observed by the driver pre-fix (the two-effect block produced 56 applies vs 111 shots, stacks
   rising every OTHER charge); the split-block encoding is correct either way.
