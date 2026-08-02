# Manual review — diesel (Diesel (Treasure))

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (stack-threshold `hitCount:700` proxy for "reaches max stacks"; NA-count `hitCount:70`; `fullBurstEnter`-vs-`burstCast` trigger identity; status-gated Attract lines unmodeled)

> Slug disambiguation: `diesel` IS the Treasure variant (data `treasure:true`, name "Diesel (Treasure)",
> MG/Wind/Defender/Burst II). It is distinct from `diesel-winter-sweets` (RL/Fire/Attacker/Burst III,
> aka "dws"). The lint-slug-disambiguation matcher flags the "Diesel" base family structurally (it
> strips " (Treasure)" as a favorite-item marker and matches the slug case-insensitively); the colon
> form "Diesel: Treasure" passes clean. The slug is unambiguous.
>
> **Authoritative prose:** the top-level `data/characters.json` `skills` field (the Treasure rework).
> The nested `role.skillDetails.*_detail.description_localkey` is the UNTREASURED BASE kit and
> DISAGREES (base: S1 heal "when attacked during Full Burst" + no 150-NA clause; S2 threshold 100 NA +
> no Pierce line; burst taunt 5.06s + no Max HP line). This encoding models the Treasure prose.

## Kit summary

Diesel (Treasure) is a Wind-element MG Defender (tank) on Burst II. Her damage surface is almost
entirely weapon-state + team support, not personal multipliers. S1 raises her own DEF by 25.92% for
10s whenever the team enters Full Burst (faithfully encoded, but inert in the v1 DPS sim — self DEF
feeds no Defender damage channel). Two further S1 lines are gated on an "Attract" self-status (the
taunt from her burst): a self-heal when attacked while taunting, and a "buff stack count ▲1" after
150 normal attacks while taunting — both UNMODELED (the v1 boss deals no damage, there is no
"attacked" trigger, and the engine has no self-Attract status or runtime stack-cap-delta primitive).
S2 "Strawberry Candy" adds a stack every 70 normal attacks, each enlarging her magazine by 56.7% for
10s up to 10 stacks — a real (small) DPS gain via reload avoidance. When she reaches max stacks, the
whole team instantly reloads 86.62% of their magazine and gains +30% Pierce Damage for 10s; the engine
has no stack-threshold trigger, so this is keyed to `hitCount:700` (10×70 = one full Candy cycle) as a
documented proxy. Her burst fires one 299.66%-of-final-ATK hit at the highest-ATK enemies (the partless
solo boss takes exactly one hit; FB-exempt — the cast lands before the window opens), doubles her own
Max HP for 10s without healing (inert — she has no HP→ATK conversion), and taunts all enemies for 10s
(UNMODELED — boss targeting/aggro is out of domain for a DPS sim).

## Line-by-line

| Line                                                                    | Disposition        | Notes                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| S1: fullBurstEnter → self defPct 25.92/10s                              | FAITHFUL (inert)   | `fullBurstEnter` (any team FB) NOT `burstCast`; pinned to the 5 Full-Burst windows (vs 9 diesel casts); inert proven 2 ways       |
| S1: attacked in Attract → self heal 12.96% Max HP                       | DOCUMENTED_GAP     | No incoming-damage event, no "attacked" trigger, no self-Attract status; verbatim in `unmodeled`; inert                           |
| S1: 150 NA in Attract → buff stack count ▲1                             | DOCUMENTED_GAP     | No runtime stack-cap-delta primitive; Attract self-gate inexpressible; verbatim in `unmodeled`; NOT a static maxStacks:11 fudge   |
| S2: hitCount:70 → self maxAmmoPct 56.7 ×10/10s (Strawberry Candy)       | FAITHFUL (live)    | Per-stack 56.7 (not at-cap total); Treasure threshold 70 (base 100); LIVE via reload avoidance; magnitude pinned in the event log |
| S2: hitCount:700 → allies instantReload 0.8662 + pierceDamagePct 30/10s | FAITHFUL (⚑ proxy) | "reaches max stacks … after removal" → `hitCount:700` cycle proxy (ade-agent-bunny precedent); pierce inert w/o pierce ally       |
| Burst: burstCast → enemy flatDamage 299.66%                             | FAITHFUL           | "5 enemies" → 1 hit on solo boss; FB-exempt (empty fbMajorApplied); linear under half-value patch                                 |
| Burst: burstCast → self targetMaxHpPct 100.05/10s                       | FAITHFUL (inert)   | "without restoring HP" honored (no heal/recovery event); engine converts to maxHpFlat self-grant; inert (no atkOfMaxHpPct)        |
| Burst: Attract: Taunt all enemies 10s                                   | DOCUMENTED_GAP     | No taunt/Attract primitive; boss targeting unmodeled; verbatim in `unmodeled`; inert                                              |

## Cross-family corroboration

- **S2b (claude-fable-5, adversarial test-faithfulness review):** `leakDetected:null`. All 5
  load-bearing lines FAITHFUL; 3 DOCUMENTED_GAP (the two Attract-gated S1 lines + the burst taunt).
  CONVERGED with the driver on every line. The reviewer independently stressed the two trigger
  identities the driver keyed on (`fullBurstEnter` not `burstCast` for S1; `burstCast` pre-FB for the
  nuke), flagged the "56.7-as-at-cap-total" and "reloadSpeedPct-not-instantReload" nearest-wrongs (the
  driver avoids both), and requested a pierce 30→0 inertness assertion (driver added it — passes).
  Reviewer notes reconciled: the sawtooth stack-reset gap + the reload-basis ambiguity are documented
  as ⚑1b/⚑1c; the fixture-crowding warning was pre-empted (driver used a custom comp, not controlComp).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 8 kit lines.
  As written, the blind test used `controlComp('diesel', true)`, which parks crown at the fixed B2
  slot; crown wins stage-2 selection every rotation so diesel (also B2) cast 0× and every burst
  assertion failed its OWN non-vacuity guard (the blind author anticipated this in its header). It also
  carried 4 reader bugs (burstCast carries `unitIdx` not `srcSlot`/`casterIdx`; damage `srcSlot` is a
  STRING slot-name not a numeric index, so `dieselDamage` was vacuously []; two malformed `unitOf(...)`
  placeholders that always threw) and one over-precise tolerance (70-hit cadence ±2 on a ~136 count;
  measured 148 applies = 9% MG-wind-up divergence). After adapting ONLY those (`blind/diesel.adapted.test.ts`,
  per the `ade-agent-bunny.adapted.test.ts` precedent — fixture swapped to liter/diesel/ada/helm so diesel
  is the sole B2; reader bugs fixed; cadence tolerance widened to a 15% band that still excludes the
  per-shot/100-hit/150-hit counterfactuals; teammate byte-identity relaxed to "maxAmmoPct never targets an
  ally" because diesel's Candy times the team instantReload — a real coupling, not a leak): **20 pass /
  4 skip** vs the driver override. The 4 skips are the blind author's own GAP/⚑ lines. ALL discriminating
  assertions are the blind author's, unchanged.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Reproduces the driver override
  LINE-FOR-LINE on all 5 load-bearing blocks (S1 defPct; S2 maxAmmoPct `hitCount:70`; S2 `hitCount:700`
  instantReload+pierce; burst flatDamage 299.66; burst targetMaxHpPct 100.05). Divergences, none
  load-bearing: (a) blind sets `crit:true` on the burst nuke — the judge ruled this a NULL divergence
  (burst nukes crit at the caster's rate by engine default, so it is behaviorally identical to the
  driver's omission, which matches the helm convention); (b) blind models the burst Attract taunt as an
  inert `targetStatus{name:'Attract'}` while the driver lists it verbatim in `unmodeled` — both faithful
  and inert (no gate consumes it; the S1 Attract lines are a SELF-status the enemy-keyed targetStatus
  cannot satisfy — the blind note agrees); (c) blind adds one ⚑ the driver adopted (stack-refresh
  semantics — whether a new Candy stack refreshes older stacks' 10s timers).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, 0 gotchas.**
  `s5TestsVsDriverOverride: GREEN`. All 8 lines accounted (5 FAITHFUL + 3 DOCUMENTED_GAP), zero silent
  drops. The judge independently verified each inertness claim is proven by byte-identical counterfactual
  removal (not asserted), confirmed the instantReload-not-reloadSpeed encoding and the pierce-bucket
  confinement, ruled both blind-vs-driver divergences null, and accepted the driver's transparent blind-test
  adaptation (noting the 15% cadence band still excludes the 100/150/per-shot counterfactuals). Recommended
  adopting the blind's stack-refresh ⚑ (done — override caveat ⚑1d).

## Residual flags for owner

All residuals are MEASUREMENT-GATED on MG cadence / stack mechanics; none is a faithfulness blocker
(the judge confirmed the encoding is faithful and the shared risk is flagged, not hidden). Spot-check
cluster = **a Diesel:Treasure focus video**.

1. **⚑ MG cadence tuple (datamine).** `rate_of_fire` ramps 60 → 4200 and `reloadFrames` is 151 — both
   unverified datamine driving the Strawberry Candy stack-accrual rate and the 700-NA max-stack timing.
   Read rounds/min + the reload gap from footage.
2. **⚑1 / ⚑1b max-stack trigger proxy + sawtooth.** "reaches 10 simultaneous stacks then removed" is
   modeled as the cumulative 700th-NA cycle (`hitCount:700`); the engine has no stack-threshold or
   cross-block stack-removal primitive, so the real sawtooth (build → consume → rebuild) is modeled as a
   continuous peak hold. This would over-credit firing uptime during the real rebuild phase, BUT the
   maxAmmoPct damage channel SATURATES (verified: 56.7 and 28.35 ×10 stacks land byte-identical totals),
   so the missing reset is behaviorally inert in this fixture. Recipe = a true "remove stacks of buff X
   on trigger Y" primitive + footage confirming the sawtooth.
3. **⚑1c reload basis.** "Reload 86.62% of the magazine" resolves (engine `instantReload`) against the
   CURRENT buffed magazine, not the base 300 — kit-ambiguous which is intended; flagged, not silently picked.
4. **⚑1d stack-refresh semantics (adopted from the S6 blind).** Whether a new Candy stack refreshes the
   older stacks' 10s timers is assumed standard (sustained MG fire holds 10 stacks). If it does NOT
   refresh, the 10-cap is unreachable at any plausible MG cadence and the effective ammo lift is ~2-3
   stacks; the saturation result bounds the damage impact either way. Recipe = footage observing whether
   the Candy icon refreshes or accrues independent per-stack timers.
5. **Three Attract-gated lines UNMODELED.** The S1 heal-when-attacked, the S1 150-NA buff-stack, and the
   burst taunt all hinge on an "Attract" status the engine does not model (no incoming damage, no taunt/
   aggro, no self-status channel). All three are inert for DPS and recorded verbatim in `unmodeled`. If
   any is ever modeled, the burst must simultaneously open a name-keyed "Attract" window or the gate is
   dead code (fable S2b note).
