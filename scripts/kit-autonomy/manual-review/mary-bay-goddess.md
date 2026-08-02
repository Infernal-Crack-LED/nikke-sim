# Manual review — mary-bay-goddess (Mary: Bay Goddess)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped Water-Code buffs; two distinct escalating round-counters — S1 Full-Burst entries vs S2 burst uses; `burstCast`-vs-`fullBurstEnter` trigger split; `casterMaxHpPct` e3 self-feed rule)

> Slug disambiguation: `mary-bay-goddess` is the SR/Water Bay Goddess VARIANT of Mary (Supporter,
> Burst I, cd 20s, resource_id 132, released 2023-06-15, aka "mbg") — NOT the base `mary` (SG/Water).
> The slug lint's bare-"Mary" advisory is a false positive on the variant's own disambiguated name;
> the slug itself is unambiguous. This was a FROM-SCRATCH model — no shipped override existed before
> this gauntlet, so every kit line below is a MISSING-line assertion (RED against the absent override,
> GREEN once `src/skills/overrides/mary-bay-goddess.json` landed).

## Kit summary

Mary: Bay Goddess is a Water Burst-I Supporter whose personal damage is negligible — her value is
team support. Each time the team enters Full Burst she heals all allies over 5 seconds (S1), and the
heal strengthens with each subsequent Full Burst entry: the 1st entry recovers 1.05% of her final Max
HP per second, the 2nd adds a 3.69%/s HoT alongside it, the 3rd adds a 6.86%/s HoT ("each subsequent
effect triggers all effects before it"). Each time she personally casts her Burst Skill she grants all
Water-Code allies an escalating Elemental-Advantage Attack Damage buff (S2): 20.85% for 3s on the 1st
cast, adding 13.88%/5s on the 2nd, adding 8.36%/10s on the 3rd, stacking cumulatively. Her Burst Skill
itself (Burst I, cd 20s) gives Water-Code allies +23.23% ATK for 3 seconds and raises EVERY ally's Max
HP by 27.87% of her own final Max HP for 10 seconds. Her offensive lines (S2 + the burst ATK) are
scoped to Water allies only; the HoT and the Max HP grant reach all allies. The Max HP grant is
defensive — it feeds no HP→ATK conversion in the DPS basis (the e3 self-feed rule: an ally-granted
Max HP only feeds `atkOfMaxHpPct` when caster === target, and Mary has no such consumer).

## Line-by-line

| Line                                                                              | Disposition | Notes                                                                                                                                  |
| --------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| S1: entering Full Burst → all allies HoT, escalating 1.05/3.69/6.86% Max HP/1s/5s | FAITHFUL    | `fullBurstEnter` → `allies` → `escalating[3 × heal ticks:5 intervalSec:1]`; the escalating counter counts team FB entries. Heal MAGNITUDE is event-only (no HP pool) → unmodeled; the recovery-event COUNT ramps 5/10/15 per target (verified) and drives on-recovery consumers (crown) |
| S2: using Burst Skill → Water allies Elemental Advantage ▲, escalating 20.85/3s, 13.88/5s, 8.36/10s | FAITHFUL | `burstCast` → `alliesOfElement Water` → `escalating[elemAdvantageDamagePct 20.85/3s, 13.88/5s, 8.36/10s]` as separate co-active buffs; distinct counter from S1 (counts Mary's burst uses). Live vs an advantaged (Fire) boss, inert vs neutral |
| Burst-A: Water allies ATK ▲23.23% for 3s                                          | FAITHFUL    | `burstCast` → `alliesOfElement Water` → `atkPct 23.23/3s`; plain "ATK ▲" = percent of each recipient's OWN ATK (not casterAtkPct); kept as a separate block from the all-allies HP clause |
| Burst-B: all allies Max HP ▲27.87% of the skill user's final Max HP for 10s       | FAITHFUL    | `burstCast` → `allies` → `casterMaxHpPct 27.87/10s`; the engine emits one identical flat `maxHpFlat` per recipient (caster-scaled). Damage-INERT in the DPS basis (e3 self-feed rule; no HP→ATK consumer) — encoded for kit completeness |

No `ignored` blocks; `unmodeled` is empty for all three slots. The S1 heal-magnitude escalation
(1.05/3.69/6.86% of final Max HP) is documented in `caveats` as event-only (no HP pool modeled) — the
escalating structure preserves the recovery-event COUNT ramp, which is the assertable surface.

## Cross-family corroboration

Driver model family: **Qwen**. Because the driver is Qwen and every blind/reviewer role ran on a
different family, the convergence below is cross-family (stronger than same-model agreement).

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 4 load-bearing lines
  FAITHFUL. CONVERGED with the driver encoding on every decision — `fullBurstEnter` for S1 (counts team
  FB entries), `burstCast` for S2 (counts Mary's own uses), `escalating` steps 1..N for the cumulative
  ramp, `elemAdvantageDamagePct` (advantage-gated, not elementDamagePct/attackDamagePct), Water scoping
  via `alliesOfElement`, plain `atkPct` for the burst ATK, `casterMaxHpPct` for the caster-scaled Max HP
  grant. Raised two refinements the driver ADOPTED: (1) encode S1 as `escalating[3 × heal]` (not a
  collapsed single heal) so the recovery-event COUNT ramp 5/10/15 is faithful to "each subsequent effect
  triggers all before it"; (2) a fixture-validity warning (Mary must be the actual B1 caster, not seated
  in a carry slot where another B1 wins the window) — the driver's custom fixture (Mary as sole B1)
  already satisfied it.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the identical encoding
  (escalating 3× five-tick HoT on fullBurstEnter to all allies; cumulative S2 elemAdvantage tiers
  20.85/13.88/8.36 at 3/5/10s to Water allies; burst atkPct 23.23/3s Water; burst caster-scaled Max HP
  27.87/10s all allies). Out-of-box vs the driver override: **8 pass / 2 fail / 2 skip (12).** The 8
  passing assertions independently re-derive EVERY load-bearing line. Both failures are **RECON_ERRORs in
  the blind test itself, not encoding defects**: the blind built a "run A" fixture
  (`controlComp('mary-bay-goddess', true)` = liter/crown/mary/helm) and ASSUMED "liter (also Burst I)
  wins every B1 window so Mary never casts in run A", then asserted Mary emits zero buffs there. The
  ENGINE DISPROVES the premise — a probe of that exact comp shows `burstCast` by slug = { liter: 9,
  crown: 10, helm: 5, mary-bay-goddess: 7 }: the engine lets BOTH B1 units cast alternately, so Mary
  casts 7× and her S2/burst buffs do appear in run A. The assertions fail on the wrong "Mary never casts"
  premise, not on any magnitude/duration/scope/trigger of the driver encoding. The 2 skips are honest
  GAPs matching the driver's own notes (heal magnitude unobservable — no HP pool; on-recovery-consumer
  tandem needs a pinned recovery fixture).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. The blind override is **byte-equal** to
  the driver's (skill1/skill2/burst blocks, triggers, targets, effects, values, durations all match):
  skill1 = fullBurstEnter → allies → escalating[heal ticks:5 ×3]; skill2 = burstCast → alliesOfElement
  Water → escalating[elemAdvantageDamagePct 20.85/3s, 13.88/5s, 8.36/10s]; burst = burstCast →
  alliesOfElement Water → atkPct 23.23/3s, PLUS burstCast → allies → casterMaxHpPct 27.87/10s. The S6
  audit marks every kit line IMPLEMENTED with the same reasoning the driver gives.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].** All
  4 lines FAITHFUL, zero silent drops. The judge independently verified each of the 2 blind reds is a
  RECON_ERROR (the "Mary never casts in run A" fixture premise, which the engine disproves — both B1s
  cast alternately, Mary casts 7×), not a behavioural divergence; noted the S6 blind override is
  byte-equal to the driver's and 8/8 substantive S5 assertions pass. Confirmed the escalating ramp fires
  at prose cadence over 180s (9 FB entries for S1; >2 own casts for S2/burst). "What must change for GO:
  nothing."

## Residual flags (owner spot-check cluster — all documented ⚑s, none blocking)

1. **`elemAdvantageDamagePct` SSOT bucket-placement tension** — `docs/data/damage-calculation.md` §1c
   places it in the element multiplier while `docs/data/game-mechanics.md` §10 and the driver note call
   it a Damage-Up bucket. The behaviour tested here is identical under either reading; the divergence is
   stacking-magnitude-only and owner/measurement-gated. (Flagged by the S7 judge.)
2. **Escalating same-caster same-stat co-stacking** — S6 raised a prior that three concurrent
   `elemAdvantageDamagePct` steps from the same caster might overwrite rather than co-stack. Empirically
   REFUTED in this run: all three tier values and durations are observed co-active (per-FB recovery count
   reaches ≥10; S2 distinct values {8.36, 13.88, 20.85} at {180, 300, 600}f). Worth one glance as an
   engine-shared prior.
3. **Datamine cadence ⚑s** — pullsPerSec / reloadFrames 111 / charge-weapon bolt-gap-vs-autofire are
   unverified datamine values affecting Mary's OWN shots only (negligible personal damage for a
   supporter); her load-bearing SUPPORT buffs are kit-exact magnitudes, not cadence-dependent. Recipe:
   rounds/min + reload gap from a focus video.
4. **S1 heal magnitude** — the 1.05/3.69/6.86%-of-final-Max-HP amounts are event-only (no HP pool
   modeled); only the recovery-event cadence/count is assertable. Matters only if an HP-amount or
   overheal consumer ever appears.
