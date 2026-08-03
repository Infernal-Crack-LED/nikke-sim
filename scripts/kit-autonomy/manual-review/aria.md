# Manual review — aria (Aria)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (judge kimi-code/k3)
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter` lever pinned in BOTH directions; generic-vs-scoped crit-stat lever; out-of-domain ⚑ cluster)

> Slug disambiguation: `aria` is the base Aria (Tetra MG/Water/Attacker, Burst II, released
> 2022-11-04, `treasure:false`). No same-name variants exist; lint clean (no AMBIGUOUS).
> FROM-SCRATCH build: no shipped override existed (`simSupported:false` — the unit could not
> sim at all before this gauntlet).

## Kit summary

Aria is a Water-element MG Attacker on Burst II whose entire kit is team crit support plus
survivability — she carries no damage lines of her own (her damage is pure MG weapon fire,
boosted by the same team crit buffs she hands out). At the beginning of EVERY Full Burst —
including ones she did not cast — she gives all allies +26.99% Critical Damage for 10s. Each
time she empties her 300-round belt, she gives all allies +7.03% Critical Rate for 5s (UNSCOPED
— unlike helm's identical-looking but normal-attack-scoped line), so that window's uptime is
paced by her magazine-and-reload cycle (~50%). Her burst shields the whole team for 37.86% of
her own final Max HP for 10s (event-only at scope: no HP pool, but the `shielded` tandem
channel is live), and separately grants HERSELF +30.37% Hit Rate for 15s — deliberately
outlasting the 10s FB window by 5s. The Hit Rate buff applies faithfully but moves no damage
today: the engine's Hit-Rate→core channel is AR/SMG/SG accuracy-circle models only, and MG has
no circle row (⚑2, canary-pinned).

## Line-by-line

| Line                                                       | Disposition    | Notes                                                                                                                                         |
| ---------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: fullBurstEnter → allies critDamagePct 26.99/10s        | FAITHFUL       | Kit names the Full Burst itself, not her cast; fires on FBs she sits out (STARVED comp pins this); frame-exact on fullBurstStart              |
| S2: lastBullet → allies critRatePct 7.03/5s                | FAITHFUL       | UNSCOPED stat (no "of normal attacks" clause — helm's scoped stat is the nearest-wrong, discriminated 3 ways); one window per emptied belt    |
| Burst: burstCast → allies shield 37.86% final Max HP / 10s | FAITHFUL       | Engine `shield` effect: event-only (no HP pool at scope), tandem-live (`shielded` triggers / `requiresShielded` gates); caster-basis maxHpPct |
| Burst: burstCast → self hitRatePct 30.37/15s               | DOCUMENTED_GAP | Buff fires at prose cadence (self-only, 900 frames, burstCast-keyed — all asserted); downstream core lift absent: no MG HR→core channel       |

Zero `unmodeled` text: all four kit lines are represented (the two inert channels are modeled
as structure + event, not dropped). Zero silent drops.

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 4 lines FAITHFUL,
  load-bearing, zero unmodeled. Converged with the driver on every trigger/stat/target/duration;
  named the two traps that define this kit — the burstCast-vs-fullBurstEnter split (S1 must fire
  on FBs she sits out; the burst self-lines must NOT) and the generic-vs-scoped crit stat — and
  contributed the two strongest test upgrades, both ADOPTED: the patched shielded-consumer
  sentinel (proves shield emission, which the engine logs no event for) and the STARVED-comp
  warning (crown starves aria to zero casts; verify before trusting any burstCast assertion).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 4 lines with
  the same trigger/stat/target/duration reads, plus no-invention assertions (no riders, no boss
  debuffs, no weapon-state modifiers, no ATK buffs). The pristine file could not run unmodified;
  5 STRUCTURAL adaptations (assertion intent unchanged), each forced by a fact unverifiable from
  the redacted packet: (1) harness import path; (2) FIXTURE REBUILD — controlComp('aria') starves
  aria to zero casts, violating the blind test's OWN non-vacuity gate, so the comp became
  [liter, aria, helm]; (3) event interface — burstCast/reload key on slug; the engine emits no
  shield SimEvent, so shield assertions became shielded-consumer sentinels + a structural
  magnitude/duration pin; (4) the Hit-Rate damage-delta assertion assumed an MG core lift the
  engine does not have (blind-side RECON_ERROR — sim.ts hrCoreExp returns 0 for MG), flipped to
  the totals-equality inertness pin; (5) slot lookup via comp order. Adapted run vs the driver
  override: **32 pass / 3 skip (the blind model's own ⚑ skips) / 0 fail**.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. STRUCTURALLY IDENTICAL to the
  driver override: same 4 blocks, same triggers (fullBurstEnter / lastBullet / burstCast /
  burstCast), same targets (allies / allies / allies / self), same effects and durations,
  unmodeled empty in all slots. Its ⚑ list matches the driver's (HR→core slope measured-only,
  MG cadence tuple). Only the human-facing note text differs.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true,
  gotchas:[].** All 4 lines accounted (3 FAITHFUL + 1 DOCUMENTED_GAP/ENGINE). Judge ruled the
  STARVED comp "the strongest evidence in the packet", accepted all 5 S5 adaptations as
  legitimate (fixture rebuild mandated by S2b's own non-vacuity warning; HR flip corrected a
  blind-side engine-fact misread), and classified the missing MG HR→core channel as "a textbook
  DOCUMENTED_GAP … not an aria encoding error".

## Residual flags for owner

1. **⚑1 CADENCE TUPLE (mandatory):** MG rate of fire (engine wind-up ladder) + reloadFrames 161 +
   ammo 300 shipped datamine as-is. Both the lastBullet cadence and S1's ~50%-uptime reading rest
   on it. **One focused aria video (rounds/min + reload gap) closes this** and the shared
   prose-literal prior that "last bullet hits" = once per emptied belt.
2. **⚑2 OUT-OF-DOMAIN (Hit-Rate channel, Tier 2):** the self hitRatePct 30.37/15s buff applies but
   moves zero damage — the engine's HR→core models (PELLET_GAUSS / CONE_DELTA / UNIGEO /
   hrCoreMult) are AR/SMG/SG accuracy-circle models; MG/SR/RL hold the flat core rate with no
   Hit-Rate input (sim.ts). Estimate: zero damage impact at scope lock until an MG channel
   exists. Recipe: if the engine ever gains MG circle coverage, re-judge from a focused aria
   recording (core fraction inside vs outside her post-burst 15s window). The unit test pins the
   inertness as a CANARY — if the channel ever lands, the test fails loudly and the line must be
   re-judged, not silently kept as inert.
3. **⚑3 OUT-OF-DOMAIN (shield magnitude, Tier 3):** the 37.86%-of-final-Max-HP shield SIZE is
   recorded but no HP pool exists to absorb damage, so the magnitude moves nothing at scope
   lock; the EVENT channel (`shielded` triggers / `requiresShielded` gates) is live and tested
   via the sentinel. No recipe until an incoming-damage model exists.
4. **FIXTURE FACT (multi-B2 starvation):** same-stage selection takes the ready slot-first unit;
   a 20s-cd B2 (crown) is always up, so aria casts ZERO bursts beside it (PROBED: 5 FBs, crown
   10 casts, aria 0). Graded aria comps should field her as the only B2 or accept the rotation
   share. This is engine rotation behaviour, not an aria defect.

## Artifacts

- Driver override: `src/skills/overrides/aria.json` (validate-overrides: VALID, dmg 55.2M / 16.2%)
- Driver test: `scripts/tests/units/aria.test.ts` — GREEN 19/19 (groups A1–A4 + STARVED comp)
- Blind test: `scripts/kit-autonomy/blind/aria.test.ts` (pristine) + `aria.adapted.test.ts` (GREEN 32/35)
- Blind override: `scripts/kit-autonomy/blind/aria.override.json` (structurally identical to driver)
- S2b review: `scripts/kit-autonomy/reviews/aria.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/aria.verify.txt`
- Judge verdict: `scripts/kit-autonomy/results/aria.json` (verdict GO, faithfulnessScore "1.0", model kimi-code/k3)
