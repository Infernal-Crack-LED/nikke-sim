# Manual review — soda (Soda)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate on a resource-mirrored stack pool; hit-counter trigger identity; heal-as-recovery-event channel; single-boss multi-target collapse; engine-core ⚑ slice)

> Slug disambiguation: `soda` is Soda — MG / Supporter / Fire / Burst I, Tetra, released
> 2023-02-08. The disambiguation lint fired on the shared base name (AMBIGUOUS BASE "Soda"):
> resolved explicitly to slug `soda` (MG/Fire base unit), NOT `soda-twinkling-bunny` (SG/Iron
> variant). FROM-SCRATCH build: no override existed before this gauntlet (`simSupported` was
> false).

## Kit summary

Soda is a Fire machine-gun Supporter whose kit is almost entirely sustain plus a team stack
amplifier (judge's wording, independently converged by every role). Her Skill 1 builds Maid
Spirit stacks on herself — +13% Max HP per 180 normal attacks fired, up to 5 stacks, each
lasting 10 seconds. Her Skill 2 (12s cooldown) heals the whole team for 3.23% of her own final
Max HP, and once Maid Spirit is fully stacked each activation additionally heals 12.71%. Her
Burst I deals a single moderate hit (321.28% of final ATK) to randomly selected enemies with a
1-second stun, and grants every Fire-element ally +1 stack count on their stackable buffs —
which for Soda herself means an extra Maid Spirit stack. In a damage sim her offensive
footprint is just her MG fire and the burst hit; her heals matter only insofar as they trigger
teammates' on-recovery effects (crown's team Attack Damage in the fixture), and her Max HP
stacking converts to nothing without an HP→ATK consumer (inert, pinned rather than assumed).

## Line-by-line

| Line                                                                    | Disposition        | Notes                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: after 180 normals → self Maid Spirit Max HP ▲13%, 5 stacks, 10s     | FAITHFUL (inert)   | `hitCount 180` → self `targetMaxHpPct 13` maxStacks 5 durationSec 10 + `maidSpirit` pool mirror (+1); SD1 pins cadence = floor(hits/180)+casts, value = 13% of maxHp, cap 5, 10s, self-scope; SD2 pins damage-inertness AND the live HP→ATK channel counterfactual |
| S2: all allies restore 3.23% of user's final Max HP (12s CD)            | FAITHFUL (event)   | `interval 12` (datamined skillCooldownsSec.skill2; no activation clause in prose — ⚑ phase) → allies `heal`; magnitude amount-less by design (no HP pool), carried verbatim; SD3 pins 14 ticks frame-exact, 4-holder reach, crown-AD liveness |
| S2: at Maid Spirit max stacks → restore 12.71%                          | FAITHFUL (event)   | second `heal` on the same interval, `resourceGate {maidSpirit, min:5}`; SD4 pins first-tick-single (provably <5 stacks by t=12s), later ticks double, gate dependency (S1 removed → all single), ungated counterfactual |
| Burst: 2 random enemies, 321.28% of final ATK                           | FAITHFUL           | `burstCast` → enemy `flatDamage 321.28`, ONE instance — the 2-enemy selection collapses onto the lone partless boss (anis-ss / privaty-unkind-maid precedent); SD5 pins once-per-cast, magnitude, burst bucket, pre-FB (never takes the +50% major) |
| Burst: Stun for 1 sec                                                   | DOCUMENTED_GAP     | verbatim in `unmodeled.burst`: enemy CC — the sim has no enemy-behaviour model (boss deals no damage); inert by construction; all three cross-family roles converged on this disposition                                    |
| Burst: all Fire Code allies, Stack count of buffs ▲ 1                   | SELF-SLICE + ⚑     | SELF slice modeled (`burstCast` → `maidSpirit` +1 clamped at 5, plus one Max-HP stack application — owner precedent: "the self-slice is the honest in-scope model"; load-bearing for the S2 gate's pool count); CROSS-ALLY slice ⚑ OUT-OF-DOMAIN engine-core (no "bump each target's stackable buffs by N" primitive; mica-snow-buddy ⚑M5 / pepper ⚑4 precedent) with estimate + recipe + tier |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on 5 of 6
  lines: S1 FAITHFUL (same trigger identity, stack cap, 10s wall-clock, self-scope, inertness),
  both S2 heals as recovery-event channels (hard rule 2; the 12s cadence named an ALWAYS-⚑
  field — the driver uses the datamined CD), burst FAITHFUL with single-instance collapse +
  pre-FB timing, stun UNMODELED verbatim. DIVERGED on the Fire-ally stack-amp (reviewer:
  unmodel the whole line; driver kept the self-slice per owner precedent + gate consistency:
  the pool must count burst-added stacks or it UNDER-counts the state the rider reads).
  Pre-registered three flags the driver absorbed: burst-eligibility non-vacuity (covered by the
  fixture sanity), max-stack reachability is emergent (SD4 reads engine cadence, no hardcoded
  saturation second), and the S1-knockout gate-dependency distinguisher (added to SD4).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived 12 spec lines
  (4 FAITHFUL, 3 GAP-skips, remainder measurement-gated) with consumer-based heal observability
  and a burstEligibility-stage-3 non-vacuity guard. Adapted copy (mechanical only — string
  `srcSlot`/`slug` damage routing, harness import path; zero assertion changes) runs GREEN vs
  the shipped driver override: **13 pass / 3 skip** (the skips are the blind author's own GAP
  annotations). The blind also flagged two deliberate non-assertions the driver answers: stack
  reachability (SD1 pins stack-5 empirically — MG terminal cadence 60/s makes 180 rounds accrue
  in ~3-5s of firing) and the monotonic-pool latch (the documented divergence class; unreachable
  under sustained fire).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. CONVERGED on S1's core (hitCount
  180 / self / 13% / 5 stacks / 10s; blind chose stat `maxHpPct`, driver the kit-literal
  `targetMaxHpPct` — both damage-inert for soda) and the burstCast-keyed flatDamage nuke.
  DIVERGED on five points, all reconciled for the driver by the judge: (1) S2 cadence interval
  20 (INVENTED, self-flagged) vs the driver's datamined 12; (2) rider gate `hitCount 900`
  cumulative proxy vs the driver's resourceGate (per-tick, re-closable); (3) nuke 642.56 =
  2×321.28 — the exact nearest-wrong model S2b named — vs the driver's single instance with
  house precedent; (4) whole-line unmodeled vs self-slice modeled; (5) extra `crit:true` /
  `noRange:true` / stun-effect authoring where the driver keeps defaults and unmodels the stun.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**, `gotchas:[]`,
  `discriminationOk:true`. "Every divergence between the driver and the blind agents reconciles
  in the driver's favor against prose + SSOT." Confirmed each FAITHFUL line against the formula
  docs (e3 scope for the inert Max-HP channel, recovery-event tandem rule, burstCast pre-FB
  boundary) and ratified both DOCUMENTED_GAP dispositions.

## Residual flags (owner spot-check cluster, from the judge)

1. **Burst '2 enemy unit(s) randomly' resolution:** single-instance collapse vs 2×321.28 — the
   one genuinely uncertain reading on the kit (both opus blinds and the driver split 2-vs-1).
   Driver ships the spec'd single-instance reading (S2b named 2× the nearest-wrong; house
   precedent). Recipe: focus-record Soda's burst — one 321.28% popup vs two. If footage shows
   two popups, her burst damage doubles and every other line stands.
2. **S2 interval-12 phase:** first fire at t=12 is the engine interval convention; the prose
   carries no activation clause and the CD is datamined (skillCooldownsSec.skill2 = 12). Pin
   from footage if a recovery-consumer cadence is ever popup-read (snow-white precedent).
3. **Cross-ally stack-amp (engine-core):** the "+1 stack onto each Fire ally's own stackable
   buffs" slice has no engine primitive; estimate zero on graded fixtures, recipe = a primitive
   that reads each holder's live maxStacks buffs and adds N, tier out-of-domain. The self-slice
   is modeled and pinned (SD6).

## Artifacts

- Driver: `scripts/tests/units/soda.test.ts` (20/20 GREEN; RED phase in `reviews/soda.verify.txt`)
  + `src/skills/overrides/soda.json`
- S2b: `reviews/soda.test-review.json` · S5: `blind/soda.test.ts` (+ `blind/soda.adapted.test.ts`)
  · S6: `blind/soda.override.json` · S7: `results/soda.json` (+ `results/soda-judge-packet.md`)
- Cross-family evidence: `cross-family/soda/{s2b,s5,s6,s7}-result.json`
