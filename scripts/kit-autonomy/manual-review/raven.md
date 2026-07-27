# Manual review — `raven` (Raven)

**Verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2** · gauntlet 2026-07-25
RL / Attacker / Iron / Burst III (cd 40s, ammo 6, chargeFrames 60). Cross-family: S2b `claude-fable-5`,
S5/S6/S7 `claude-opus-5`. Judge: GO, all 8 kit lines FAITHFUL(6)/DOCUMENTED_GAP(2), discriminationOk.

## What she is

A sustained-damage RL carry. Her **dominant** damage bucket is the Skill-1 stacking sustained DoT
(68.46% of final ATK / 1s, stacks ≤10, 5s per instance, one independent instance appended per
full-charge shot). Her burst is a 492.3% nuke plus "A.N. Mode" — a self Sustained-Damage ▲89.44% for
10s that multiplies that DoT. Skill-2's two "Vital Attack" parts-damage buffs and the part-destroy
"Single Point Attack" branch are built for bosses with destructible parts and are structurally INERT
or unreachable against the partless scope-lock boss — so she correctly reads as a pure DoT carrier
here. **She is MODEL_ONLY / never fielded (graded.teams = 0): her sim number is ungraded.**

## The load-bearing (damage-moving) lines — all FAITHFUL, all proven LIVE

| Line                                                           | Encoding                                                                                    | Why it discriminates                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 — 68.46% sustained /1s, ≤10 stacks, 5s, per Full Charge     | `shotFired` → enemy → `dot{atkPct:68.46, durationSec:5, intervalSec:1, flavor:'sustained'}` | per-shot APPEND: 515 skill1 ticks ≥ 4× the 105 shots (≈5 ticks/instance). RED under the single-instance counterfactual (trigger→passive collapses to <20 ticks). The 10-cap is non-binding at datamine cadence (~2.8 concurrent, peak ~3.7 < 10) and the judge confirmed it stays non-binding on BOTH bolt-gap cadence branches                                                                                                                                |
| S1 — entering Full Burst: ATK ▲47.52% of skill user's ATK, 10s | `fullBurstEnter` → self → `casterAtkPct 47.52, durationSec 10`                              | "of the skill user's ATK" = flat caster-ATK add: buffApply value ≈ 0.4752×staticAtk (~56.9k), constant across casts — a generic `atkPct` stores the raw 47.52. Trigger pinned in the co-B3 comp: fires on all 12 team FBs (> her 6 own casts), so it is fullBurstEnter, not burstCast. (For a SELF buff casterAtkPct/atkPct are damage-equivalent — atkPct multiplies static only — so the discriminator is the recorded value, not the total.)                |
| Burst — 492.3% of final ATK Burst Skill damage                 | `burstCast` → enemy → `flatDamage{atkPct:492.3}`                                            | one burst-bucket instance per cast at the kit magnitude; `fbMajorApplied === false` on every nuke (the cast lands before the FB window opens — verified engine fact). Crit at sheet rate, no core (rider default).                                                                                                                                                                                                                                             |
| Burst — A.N. Mode: Sustained Damage ▲89.44%, 10s               | `burstCast` → self → `sustainedDamagePct 89.44, durationSec 10`                             | FLAVOR-SCOPED: in-window DoT ticks carry exactly +0.8944 dmgUp vs the buff-removed run, while her normal RL shots are byte-identical with the buff present vs removed (crown's attackDamagePct cancels). RED under the `attackDamagePct` counterfactual, which lifts the normals. Trigger pinned in the co-B3 comp: fires on her 6 own casts (< the 12 team FBs), so it is burstCast, NOT fullBurstEnter — the canonical over-credit the S2b reviewer flagged. |

`flavor:'sustained'` on the DoT is load-bearing — it is the sole reason A.N. Mode amplifies anything
(the DamageUp flavor gate, `docs/data/damage-calculation.md` §1e).

## Inert parts lines (asserted, not assumed)

Both "Vital Attack: Damage to Parts ▲21.12% for 5s" lines (S2 battle-start passive + S2 FB-enter) are
`partsDamagePct`, a DamageUp-bucket term that is damage-inert on the partless boss. Kept as two DISTINCT
blocks (battle-start at frame 0 + one per FB entry = 6 applies) and the test ASSERTS inertness
byte-identically (`noParts.totals === base.totals` for every unit) while also pinning that the buffs ARE
applied (present, not dropped — hard rule 3).

## Documented gap (genuinely skippable in this basis)

S2 "when an ally or self destroys an enemy's part → Single Point Attack: Sustained damage ▲47.32% for
15s + Removes Vital Attack", and the burst's "A.N. Mode / Effect 1: Removes Single Point Attack", are in
`unmodeled` VERBATIM. The part-destroy trigger has no TriggerDef primitive AND cannot fire on a partless
boss, so any proxy would over-credit her DoT by ~47pp. The test proves it is NOT proxied: the only
`sustainedDamagePct` value ever applied is the burst's 89.44 — no 47.32 buff of any stat ever reaches
raven. This deletion of the PRIOR hand-authored always-on `sustainedDamagePct 47.32` passive is the one
genuinely BOARD-MOVING consequence of this landing (see spot-check cluster).

## Cross-family convergence

- **S6 blind override (opus, prose-only) is ENCODING-IDENTICAL to the driver on every block.** The only
  textual difference is a redundant `crit:true, noFb:true` on the nuke that the engine already defaults
  (flatDamage crits unless `crit:false`; burstCast is auto-FB-exempt) — a cosmetic no-op.
- **S5 blind test (opus) vs driver override: 17 GREEN / 1 RED / 3 skipped.** The judge traced the one RED
  and classified it **RECON_ERROR** (a blind-test-authoring bug, not an encoding defect): its "stray
  casterAtkPct" filter omits a `caster === raven` restriction, so it counts **crown's** 12 self-cast
  casterAtkPct buffs as strays from raven's line. The property it meant to test (raven's R2 is self-scoped)
  is independently proven GREEN by the driver's own assertion (`casterIdx === RAVEN ⇒ every target is
RAVEN`). The 3 skips are the blind's own declared GAP/measurement-gated lines (10-stack cap, DoT-crit
  gating, part-destroy 47.32%).

## Residual flags for the owner (non-blocking; the kit verdict stands regardless)

1. **RL bolt-recovery cadence ⚑ (engine-wide, documented by driver).** The override assumes the 22-frame
   bolt-recovery gap is ON for her RL. `docs/data/game-mechanics.md` §2 says RL has **no** bolt recovery
   (only SR does). The judge narrowed the cadence tuple: `reloadFrames 141`, `chargeFrames 60` and
   `rate_of_fire 60` are all derivable-and-confirmed from the datamine, so the whole residual collapses to
   the single binary "does the engine wrongly apply the SR 22f release latency to an RL?" — a ~27% swing on
   her dominant DoT channel. This is an **engine-wide question, not a raven override edit** (src/engine is
   protected); recipe = count sustained-tick popups/sec in a raven solo focus video (~3.4/s ⇒ 82f cycle,
   ~4.6/s ⇒ 60f cycle). The 10-stack cap stays non-binding on both branches, so the uncapped-append model is
   safe either way.
2. **`chargeMultiplier 0` data bug (CONFIRMED, out of kit scope, protected path — NOT edited).** Raven's
   `data/characters.json` has `chargeMultiplier: 0` while her datamined `full_charge_damage` is 25000
   (250%); **every other RL** with `full_charge_damage 25000` carries `chargeMultiplier 250`. The engine
   (`sim.ts:1375–1385`) applies the Charge bucket only when `chargeMult > 0`, so her full-charge rockets
   resolve at Charge = 1.0 instead of 2.5 — a **~2.5× under-credit on her normal-attack channel only**.
   Her DoT / skill / burst buckets all use `charge:false` and are unaffected, so **no kit assertion or the
   faithfulness verdict depends on it.** Fix = set `chargeMultiplier: 250` in `data/characters.json`
   (datamined correction, never fitted) — but that is a base-data change on a protected path, separate from
   this kit gauntlet, so it is flagged here rather than made.

## Spot-check cluster (owner, before reading her number as a regression)

- **Re-record before grading.** She is MODEL_ONLY and now loses the old always-on 47.32% sustained passive
  (correct per the partless basis), AND her normal channel is ~2.5× cold from the `chargeMultiplier 0` bug.
  Both move her total; neither is a kit-faithfulness defect. Fix the data bug + record a real fight before
  trusting any sim-vs-real ratio.
- **burstCast-vs-fullBurstEnter split within one kit** rests on reading "A.N. Mode granted inside her OWN
  burst block" as cast-keyed while S1/S2's explicit "when entering Full Burst" lines are FB-keyed. The co-B3
  fixture makes this behaviorally falsifiable — re-verify it first if real footage ever disagrees.
- **DoT cadence** (residual #1) is the dominant magnitude lever on her output; confirm the RL bolt-gap
  question before meta-weighting her.
