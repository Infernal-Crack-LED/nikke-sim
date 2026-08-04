# Manual review — milk (Milk (Treasure))

**Slug:** `milk` — slug `milk` IS the Treasure variant (`"treasure": true`, name "Milk (Treasure)"
in data/characters.json). The slug-disambiguation lint trips unavoidably on the bare base word
(shared with `milk-blooming-bunny`, SR/Iron "mbb"/"bmilk"); the variant is confirmed — mbb's
gauntlet documents the identical unavoidable trip.
**Gauntlet:** 2026-08-03 · **Verdict:** GO · **Faithfulness:** 1.0 (judge kimi-code/k3) ·
**Tier:** 2 · FROM-SCRATCH build (no prior override; `simSupported` false → true).

## Kit summary

SR / Water / Attacker, Burst I, cd 40s, ammo 6, chargeFrames 60, reloadFrames 141,
normalMult 69.04 / coreMult 200, Tetra. A treasure-reworked fast-cycling B1 team buffer:

- **S1a** every 20s → 3 allies with the highest FINAL ATK: ATK ▲31.83% for 10s.
- **S1b** start of battle → self: Burst Skill cooldown ▼20s **continuously** (40s → effective 20s —
  the meta-defining treasure change; she is a 20s-cadence Burst I).
- **S2a** above 80% HP → all allies: Critical Damage ▲11.13% continuously.
- **S2b** every 10 full-charge attacks → all allies: Burst Skill cooldown ▼2.83s.
- **BUa** highest-final-DEF enemy: 367.34% of final ATK as Burst Skill damage.
- **BUb** all allies: recovers 16.16% of attack damage as HP over 10s.
- **BUc** all allies: Incoming healing ▲75.5% for 10s.

## Line-by-line

| Line                                                | Disposition       | Encoding                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1 S1a ATK ▲31.83%/10s, top-3 final ATK             | FAITHFUL          | `interval:20` → `alliesTopAtk{count:3, byFinalAtk:true}` → `atkPct 31.83/10s`. TREASURE scope 3 (the stale `skill1_detail` table still reads 2 — count:2 pinned RED as the nearest-wrong); byFinalAtk per A3 literal-word ("highest FINAL ATK"); self eligible (no "except self").                                |
| K2 S1b self Burst CD ▼20s continuously              | FAITHFUL          | `charFixes.burstCooldownSec: 20` — the engine's ONLY permanent-CD channel (a `burstCdr` block refunds remaining CD once per firing; a passive-triggered one fires exactly once at frame 0 and cannot express "continuously"). Observable: 11 casts vs 8 un-treasured; every inter-cast gap <20s vs all gaps >20s. |
| K3 S2a Crit Damage ▲11.13% continuously             | FAITHFUL          | `passive` → allies → `critDamagePct 11.13`, no durationSec. The >80% HP gate is trivially always-true in v1 (no HP pool; boss deals no damage) — always-on collapse, mast precedent.                                                                                                                              |
| K4 S2b all-ally Burst CD ▼2.83s per 10 full charges | FAITHFUL          | `chargeCounter:10` → allies → `burstCdr 2.83` (cycling; no once-per-battle clause). Trigger identity honest residual: on a pure-full-charge SR a `hitCount:10` would be observationally identical today.                                                                                                          |
| K5 BUa 367.34% burst damage                         | FAITHFUL          | `burstCast` → enemy → `flatDamage 367.34` (burst bucket). FB-exempt by cast timing (never takes the +50% major); discriminated by the fbMajor flag, not count (milk is the fixture's only B1, so burstCast/fullBurstEnter fire equal counts).                                                                     |
| K6 BUb heal 16.16% of atk dmg over 10s              | FAITHFUL (window) | `burstCast` → allies → `heal{ticks:10, intervalSec:1}` — a 10s window of recovery events (helm H8 precedent; drives on-recovery consumers, crown tandem). HP AMOUNT unmodeled by engine design — magnitude verbatim in `unmodeled`, not fudged.                                                                   |
| K7 BUc Incoming healing ▲75.5%/10s                  | UNMODELED         | No incoming-healing StatKey; heals carry no HP amount → provably inert. Verbatim in `unmodeled.burst`. Triply converged (driver/S2b/S6).                                                                                                                                                                          |

No ⚑ estimates: every magnitude is literal L10 kit text (DATAMINED); cadence inputs are the
synced base stats (S2b: no estimate flags required). No `ignored` blocks.

## Cross-family corroboration

- **S2b test review (claude-fable-5):** all 6 load-bearing lines FAITHFUL + K7 UNMODELED — full
  convergence, including the treasure 2→3 scope, permanent-vs-one-shot self-CDR semantics
  (named oncePerBattle the nearest-wrong model), chargeCounter identity, burstCast FB-exemption,
  and the heal-over-10s tandem trap. Independently warned the exact fixture trap the driver
  avoided (a B1 unit in controlComp can be starved of casts by liter).
- **S5 blind test (claude-opus-5):** pristine run vs driver override 20 pass / 3 fail / 4 skip.
  All 3 failures classified blind-side artifacts (judge-concurred): 2× the NO_S1_CDR
  counterfactual patches a hypothesized skill1 `burstCdr` block that the driver does not have
  (driver channel: `charFixes`), 1× the burstHits reader filters a non-existent per-unit
  `.events` array. ADAPTED copy (`blind/milk.adapted.test.ts`, intent unchanged, 3 structural
  corrections documented): **23 pass / 0 fail / 4 skip**. The 4 skips converge on driver
  dispositions (K7 UNMODELED; HP gate, byFinalAtk ranking, highest-DEF selection unobservable).
- **S6 blind override (claude-opus-5):** K1/K3/K4/K6 IDENTICAL block-for-block; K5 same block
  plus redundant opt-in flags (crit:true — burst bucket already crit-eligible; noRange:true —
  driver omits per helm/epinel convention, kit silent on range). K2 the SOLE divergence: S6
  chose `burstCdr 20 oncePerBattle:true` (one-shot) as the "conservative" reading and disclosed
  the permanent reading as its highest-leverage ⚑. Ruled for the DRIVER by the judge: the kit's
  own grammar contrast ("▼20 sec continuously" vs K4's bare "▼2.83 sec"), S2b's independent
  ruling, and the engine's channel mechanics all settle it; S6's choice was a risk posture, not
  a derivation.
- **S7 judge (kimi-code/k3):** GO, faithfulness 1.0, zero gotchas, discriminationOk. All seven
  lines adjudicated (6 FAITHFUL, 1 DOCUMENTED_GAP triply converged); discrimination called real
  throughout (treasure 3-vs-2, static-vs-final ranking, self-vs-team crit, K4 rotation effect,
  burstCast timing via fbMajor, instant-vs-10-tick heal under isolation).

## Residual flags for owner

1. **K2 permanent-CD reading** — rests on grammar + S2b + engine-channel convergence (judge
   ruled it, but all agents are text-reading the same prose). One in-game cast-cadence check
   (milk bursting on ~20s cycles) closes it from independent evidence. Highest-leverage unknown
   in the kit if ever revisited.
2. **chargeCounter-vs-hitCount identity (K4)** — indistinguishable on this unit under current
   SR auto-play (every pull is a full charge); pinned by encoding, not fixture. Bites only if a
   future engine path adds uncharged SR shots.
3. **interval first-fire phase (K1)** — t=20 (first at t=sec) is the standing convention; the
   kit prose does not state the phase.
4. **Ungraded** — tier MODEL_ONLY, tuned:false, no board recordings yet (unit was
   simSupported:false before this gauntlet). Needs a real fight before its numbers are trusted.
