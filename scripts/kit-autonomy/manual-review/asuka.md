# kit-autonomy gauntlet — `asuka` (base Asuka, AR/Attacker/Fire/Burst III)

**Date:** 2026-07-24 · **Verdict:** GO (cross-family corroborated) · **Faithfulness:** 1.0 · **Tier:** 2
**Slug discipline:** base `asuka` (AR/Fire) — NOT the MG/Wind variant `asuka-wille`. The bare base name
"Asuka" trips the disambiguation lint (advisory, exit 0) as expected for a shared base name; all reasoning
is from the exact slug `asuka`.

## What the kit does (owner sanity-check)

Asuka is a Fire Burst-III AR attacker whose personal damage hinges on two things: being healed, and the team
reaching Full Burst. Her S1 gives a large, long (25s) ATK boost every time a heal lands on her — from a
teammate healer OR from her own burst's lifesteal — plus a huge bonus vs enemy shields that never comes up
against the raid boss. On Full Burst entry she gives every Fire ally (herself included) a big core-hit damage
bonus for 10s, and — only while she holds a shield — an elemental-advantage bonus that is live only when she
has advantage over the target. Her burst is a pure self-buff package: 25s Pierce, plus 10s each of raised
attack damage, raised hit rate, and lifesteal. That lifesteal is the keystone — it re-triggers her own ATK
buff, so even a healer-less team gets that buff in windows around her burst. Vs the Fire test boss she has no
elemental advantage, so her practical output here is the attack-damage, hit-rate and core-damage lines.

## Line inventory (all 8 payload lines accounted for)

| Slot | Line                                                                      | Disposition                | Encoding                                                                                          |
| ---- | ------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| S1   | Damage dealt to Shield ▲601.01% continuously                              | DOCUMENTED_GAP (UNMODELED) | verbatim in `unmodeled.skill1` — no shield-damage StatKey; partless v1 boss never shields (inert) |
| S1   | ATK ▲96.98% for 25s when recovery takes effect                            | FAITHFUL                   | `recovery` trigger, self, `atkPct` 96.98/25s                                                      |
| S2   | Elem Advantage Attack Damage ▲30.02%/10s, self in Shield status, FB enter | FAITHFUL                   | `fullBurstEnter`, self, `elemAdvantageDamagePct` 30.02/10s, **`requiresShielded:true`**           |
| S2   | Damage vs core ▲60.07%/10s, all Fire Code allies, FB enter                | FAITHFUL                   | `fullBurstEnter`, `alliesOfElement` Fire, `coreDamagePct` 60.07/10s                               |
| BU   | Gain Pierce for 25s                                                       | FAITHFUL                   | **`gainPierce` durationSec:25** on burstCast (pierce inert in v1)                                 |
| BU   | Attack damage ▲150.04%/10s                                                | FAITHFUL                   | `burstCast`, self, `attackDamagePct` 150.04/10s                                                   |
| BU   | Recovers 3.16% of attack damage as HP over 10s                            | DOCUMENTED_GAP (cadence ⚑) | single `heal` recovery event, self (self-procs S1); tick cadence measurement-gated                |
| BU   | Hit Rate ▲101.37%/10s                                                     | FAITHFUL                   | `burstCast`, self, `hitRatePct` 101.37/10s (feeds core rate via hrCoreMult)                       |

## Two gauntlet FIXES (the headline output — both cross-family corroborated, damage-neutral)

The shipped parser-baseline carried a **false premise**: its note claimed "engine has no shield-state gate."
`requiresShielded?: boolean` IS a real block gate in `src/skills/types.ts` (naga precedent). Both blind models
independently derived the faithful encoding, and the gauntlet landed two fixes — both probe-verified
**byte-identical** team totals (443617952.67) in the control comp:

1. **S2 Elemental Advantage += `requiresShielded:true`.** The kit literally says "Affects self when in Shield
   status." Moved from ungated → kit-literal. In the control comp crown's burst shield (15s, all allies) keeps
   asuka shielded at every FB entry → 11/11 applies; the `crownNoShield` counterfactual drops it to 0, proving
   the gate is live, not decorative. Inert vs the Fire boss regardless (no elemental advantage).
2. **Pierce `hasPierce:true` → `gainPierce:25s` burstCast effect.** The kit says "for 25 sec" — a timed window,
   not the permanent flag. Pierce is inert in v1 (PIERCE_CORE_DOUBLE off, no pierceDamagePct), so this is a
   pure fidelity gain; the 25s window is pinned statically + a removing-it-changes-nothing totals check.

## Residual KEPT (non-fabrication) — lifesteal cadence

The burst lifesteal ("over 10 sec") is modeled as a **single** recovery event at cast, not a 10-tick HoT.
Both blind models preferred `ticks:10` but both flagged it as an estimate — the per-tick rate is nowhere in the
prose, and `ticks:10` vs `ticks:1` is MATERIAL (~10s of ~97% ATK uptime per 40s rotation). Per MEASURED>FUDGE
the single-event model is kept and flagged ⚑ with a recipe, NOT invented. The binding judge explicitly endorsed
this as "the correct MEASURED>FUDGE call, not a gap in courage." The load-bearing half IS proven: the
lifesteal-only fixture (helm heals stripped) shows S1's ATK ▲96.98 firing exactly once per burst at the cast
frame — the self-loop is measured in-sim, not assumed.

## Cross-family corroboration

- **S2b (claude-fable-5, pre-op):** independently re-derived all 7 load-bearing lines + the UNMODELED shield
  line; named the dropped shield-gate as the nearest-wrong model. Converged.
- **S5 (claude-opus-5, blind test):** 14 pass / 3 fail / 3 skip vs the shipped (post-FIX) override. The 3 REDs
  are all artifacts — (1) a fixture misconception (the blind assumed controlComp has no shield source; crown's
  burst shield satisfies the gate, so the shipped and blind encodings actually CONVERGE on `requiresShielded`),
  and (2)+(3) whole-record deep-equals on liter that move only the team-relative `share` field while liter's
  `totalDamage` is byte-identical. The judge classified all three as RECON_ERROR/artifact, no REAL-GOTCHA.
- **S6 (claude-opus-5, blind override):** independently encoded `requiresShielded:true` AND `gainPierce:25s` —
  exactly the two fixes — plus the same lifesteal-cadence ⚑.
- **S7 (claude-opus-5, binding judge):** GO, faithfulness 1.0, discriminationOk true. No REAL-GOTCHA survived.

## Same-model residuals for the owner to spot-check (judge's priority order)

Every agent here is a Claude model reasoning from the same priors; these unanimous assumptions were never
independently tested:

1. **Does in-game lifesteal proc "when recovery takes effect" AT ALL?** The whole S1 self-loop rests on this
   premise. If self-lifesteal does NOT count as recovery in game, healer-less asuka never gets her S1 ATK buff.
2. **"all Fire Code allies" read as INCLUDING self.** Unanimous, never tested. If wrong, her personal core
   bucket is over-credited by the full 60pp every Full Burst.
3. **Shield-gate timing rule** (shield-at-FB-entry vs shield-at-any-point-in-window). Inert in this fixture;
   not inert in a shielded comp with elemental advantage.

Plus the standing datamine ⚑s: the AR fire-cadence tuple (ammo 20 / reloadFrames 84 / rate_of_fire 720) is an
unverified datamine estimate, and the Hit-Rate→core slope is an engine-global measured-only constant.

## Artifacts

- `src/skills/overrides/asuka.json` — SHIPPED override (post-FIX)
- `scripts/tests/units/asuka.test.ts` — driver kit spec (15 tests, GREEN)
- `scripts/kit-autonomy/blind/asuka.{test.ts,test-spec.json,override.json,audit.json}` — blind re-derivations
- `scripts/kit-autonomy/reviews/asuka.{test-review.json,verify.txt}` — S2b review + S2d verification
- `scripts/kit-autonomy/cross-family/asuka/` — all packets + raw results
- `scripts/kit-autonomy/results/asuka.json` — binding judge verdict
