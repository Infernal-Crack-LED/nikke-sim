# Manual Review — anis-sparkling-summer (Anis: Sparkling Summer)

**Date:** 2026-07-24
**Verdict:** GO (cross-family corroborated) ✓
**Faithfulness:** 1.0
**Tier:** 2 (element-scoped ally buff, last-bullet cadence, max-ammo state engine, advantage-gated burst, burstCast-vs-fullBurstEnter)
**Gauntlet driver:** Qwen
**Cross-family:** S2b claude-fable-5 ✓ | S5/S6/S7 claude-opus-5 ✓
**Binding judge (S7, claude-opus-5):** GO · faithfulness 1.0 · convergence GREEN · discriminationOk · 0 silent-drops · 0 gotchas

> **EXACT SLUG:** `anis-sparkling-summer` is the **Sparkling Summer VARIANT** (SG/Electric/Supporter/B3) — never
> conflated with base `anis` (RL/Iron) or `anis-star` (RL/Electric). Approved nickname: "sanis".

---

## Kit Summary

SG / Supporter / Electric / Burst III, cd 40s, ammo 5, reloadFrames 141, 10 pellets/shot, normalMult 259.2.

An Electric shotgun supporter whose whole design is to convert her own magazine into a proc engine. On every team Full
Burst entry her S1 gives all **Electric-Code allies** a flat ATK add scaled off HER (Supporter) ATK (casterAtkPct 55.31)
plus a 49.28% Reload Speed buff — the reload buff is damage because it gates shot count. Her S2 fires whenever she shoots
the **last bullet**, dealing 382.42% of final ATK to the top-2 highest-ATK enemies (one instance vs the solo boss) and
granting herself an inert 6.91% Interruption-Part damage buff. Her Burst is a self-package that **cuts Max Ammo 73.92%**
(5-round mag → 1 round), adds another 27.72% Reload Speed, and adds 42.24% Elemental Advantage Attack Damage for 10s.
The tiny magazine is the point: with a 1-round mag every shot inside the burst window is a last bullet, so the 382.42%
rider fires ~per shot, and the two stacked reload buffs keep that cycle spinning. Being Electric, the 42.24%
elemental-advantage line pays only against a Water boss and is dead weight otherwise.

---

## Line Dispositions

### FAITHFUL (7 lines — all block-modeled; unmodeled arrays empty)

| Line                                            | Encoding                              | Trigger → Target                 | Notes                                                                                                  |
| ----------------------------------------------- | ------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| S1: ATK ▲ 55.31% of skill user's ATK / 10s      | `casterAtkPct 55.31/10s`              | fullBurstEnter → alliesOfElement Electric | Flat add of HER ATK. Reaches anis only in fixture; CF generic-`allies` reaches all four. CF atkPct logs atkPct. |
| S1: Reload Speed ▲ 49.28% / 10s                 | `reloadSpeedPct 49.28/10s`            | fullBurstEnter → alliesOfElement Electric | Damage (shot-count gate). CF generic-`allies` reaches all four.                                        |
| S2: Deals 382.42% of final ATK as damage        | `flatDamage 382.42, crit:true`        | lastBullet → enemy               | 1:1 with mag-empty (incl. 1-round burst window); > burst count, < total shots. No core (text "as damage"), no range, FB-by-timing. CF core:true flips coreEligible. |
| S2: Damage to Interruption Parts ▲ 6.91% / 10s  | `partsDamagePct 6.91/10s`             | lastBullet → self                | Modeled INERT vs partless boss (repo convention per helm S2). Removing ⇒ totals byte-identical.        |
| Burst: Max Ammunition Capacity ▼ 73.92% / 10s   | `maxAmmoPct -73.92/10s`               | burstCast → self                 | The proc ENGINE: max(1, round(5×0.2608)) = 1-round mags ⇒ more last-bullet procs. CF drop ⇒ fewer procs; CF sign-flip ⇒ fewer still. |
| Burst: Reload Speed ▲ 27.72% / 10s              | `reloadSpeedPct 27.72/10s`            | burstCast → self                 | Additive with S1's 49.28 (two distinct reload buffs co-stack).                                         |
| Burst: Elemental Advantage Atk Dmg ▲ 42.24% / 10s | `elemAdvantageDamagePct 42.24/10s`  | burstCast → self                 | Engine-gated on real advantage (BEATS[Electric]=Water). LIVE vs Water, GATED vs Iron; CF ungated attackDamagePct over-credits Iron. |

### UNMODELED / DOCUMENTED-GAP

None. All 7 kit lines are block-modeled; `unmodeled` arrays are empty. (The S2 parts-damage line is modeled-inert, not
unmodeled — repo convention so a future parts-boss/consumer reads it. The S5/S6 blinds filed it UNMODELED-verbatim from
the redacted schema; both readings agree it is damage-inert vs the partless boss and both record it.)

---

## Cross-Family Corroboration

- **S2b pre-op review (claude-fable-5):** all lines accounted for, no REAL-GOTCHA (leakDetected null). The 2 disposition
  flags (S1 "FIX", S2 "UNMODELED") were **redacted-schema artifacts** — the blind reviewer saw a types.ts with
  `alliesOfElement` and `partsDamagePct` redacted as answer tokens; the full schema has both and the driver uses them.
  Its mechanical reading (caster-scaling, fullBurstEnter firing on helm-rotation FBs too, lastBullet rounds-not-pellets,
  1-instance-vs-solo-boss, burstCast-vs-FB-enter divergence with the helm co-B3, max-ammo→1-round multiplier,
  elem-advantage inert vs non-Water) matched the driver exactly.
- **S5 blind test (claude-opus-5):** independent kit-spec test from the prose alone (leakDetected null). Run UNMODIFIED
  vs the driver override it hits a **COLLECTION ERROR** — `Cannot find module '../lib/harness'`, the import-path
  RECON_ERROR the blind writer explicitly pre-flagged ("HARNESS PLUMBING GUESSED … a one-line fix-up if the real API
  differs"); 0 assertions ran. With the P1–P10 harness/redaction plumbing corrected (pristine preserved verbatim, kit
  reading + assertion intent untouched → `blind/anis-sparkling-summer.adapted.test.ts`), the blind test is **18 passed /
  0 failed = GREEN** vs the driver override. The blind's discriminations converge on every mechanical decision.
- **S6 blind override (claude-opus-5):** independent prose→override (leakDetected null) **converged on EVERY load-bearing
  mechanical decision** — S1 fullBurstEnter (not burstCast), S2 lastBullet flatDamage 382.42 crit/no-core/noFb-off
  1-instance, burst burstCast self-package, maxAmmoPct -73.92 as the proc engine ("must NOT be treated as
  defensive/inert"), reloadSpeedPct 49.28+27.72 modeled as damage (additive stack), elem-advantage 42.24 advantage-gated.
  Four redaction-artifact divergences only — the blind intuited each mechanic and named the exact missing primitive in its
  caveats: untyped `allies`→`alliesOfElement`, `atkPct`→`casterAtkPct`, `elementDamagePct`→`elemAdvantageDamagePct`, and
  partsDamagePct UNMODELED-vs-modeled-inert. In each case the driver's encoding is the strictly more faithful one.
- **S7 binding judge (claude-opus-5):** GO, faithfulness 1.0, convergence GREEN (redAssertions []), discrimination OK,
  0 silent-drops, 0 gotchas. All 7 lines FAITHFUL; SKIPPED↔unmodeled 1:1 (both empty); fire-rate check passes on every
  FAITHFUL block.

---

## Flags (⚑)

1. **CADENCE TUPLE (TOP, measurement-gated)** — SG pullsPerSec + reloadFrames 141 + rolling-reload/reload_start_ammo are
   datamine-unreliable and not text-derivable; they govern BOTH her out-of-burst last-bullet cadence and the burst-window
   proc count. Estimate = engine SG class default rate + datamined reloadFrames 141. **Recipe:** focused solo video —
   rounds/min, reload gap, per-magazine counter deltas.

2. **BURST-WINDOW LAST-BULLET PROC COUNT (heaviest lever, measurement-gated)** — with ~1-round mags + ~1.33s
   stacked-reload gaps, procs/window ≈ shots/window ≈ 5–7 × 382.42%. The engine's max(1, round(5×0.2608))=1 floor is what
   makes every in-burst shot a last bullet, so an error here scales the kit's single heaviest damage lever. **Recipe:**
   slow-mo one focused burst window — count shots, reloads, and 382.42% popups.

3. **crit:true on the 382.42% rider** (parser convention) — verify popup colour (orange = crit) on the proc.

4. **elemAdvantageDamagePct 42.24** pays out ONLY under real Electric advantage (BEATS[Electric]=Water) — confirm the
   graded boss element before reading her board number.

5. **SG pellet split/landing** — 10 pellets/shot through the class SG_LANDING_BY_BAND table (shipped default; per-unit
   landing is a measured-only refinement). **Recipe:** focused solo per-magazine counter deltas → landing fraction vs the
   noir/guilty anchors.

6. **SAME-MODEL RESIDUAL (binding judge)** — the S5/S6 blinds were BOTH claude-opus-5 while the pre-op review was
   claude-fable-5, so the two converging encodings share a family prior. The residual is the measurement-gated
   cadence/proc-count cluster above (out of judging scope), not a structural faithfulness question — all three
   cross-family roles converged on the encoding independently.

---

## Verification

- `scripts/tests/units/anis-sparkling-summer.test.ts` — **21/21 GREEN** vs shipped override (driver test-first spec).
- `scripts/kit-autonomy/blind/anis-sparkling-summer.adapted.test.ts` — **18/18 GREEN** vs shipped override (blind spec,
  plumbing-corrected; pristine preserved verbatim).
- `validate-overrides anis-sparkling-summer` — ✓ valid; dmg 212.7M (34.6%), bursts 5; 4 warnings = the measurement-gated
  cadence/proc-count/elem-boss caveats (not errors).
- `data/kit-status.json` — kitParse.provenance flipped parser-baseline → **gauntlet**; evidence + residual recorded.
- Board: NOT on the graded board (board:null, ungraded) before or after — the gauntlet validates the MODEL, not
  magnitudes; grading needs real fight recordings (the ⚑ cadence/proc-count cluster).

## Owner spot-check

The encoding is faithful and cross-family corroborated; the only residual is measurement-gated. Highest-value footage
check: **one focused burst window** to confirm the magazine floors to 1 round and count the 382.42% procs (Flag #2) —
that single number dominates her damage share.
