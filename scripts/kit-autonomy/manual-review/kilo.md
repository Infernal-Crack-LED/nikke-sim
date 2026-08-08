# Manual review — kilo (Kilo)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gated burst branch — the whole kit keys off the Nano Coating shield state; dead-at-scope branch reasoning; one ⚑ measurement-gated damage basis)

> Slug disambiguation: `kilo` is the BASE unit (Kilo, MG/Fire/Defender/Burst III, cd 40s, ammo
> 300, released 2024-04-25). No variant exists; the slug-disambiguation lint ran clean on the
> full description at dispatch. SSR rarity → plain scope-lock ceiling (no unitLimits).
> Scope-lock measured stats: staticAtk 79,801 / final Max HP 3,299,114 (5% of final Max HP =
> 164,956 = 2.067× her ATK).

## Kit summary

Kilo is a Fire Defender MG whose entire kit hangs off ONE self-status, **Nano Coating**: at
battle start she gains a continuous self-shield equal to 21.12% of her final Max HP (skill 1).
While coated, every 200 normal attacks she restores shield HP equal to 2.85% of her final Max
HP (skill 2 line 1), and her burst ("Assign Priority") is an AoE nuke dealing 1150.84% of "the
ATK, which is calculated from 5% of final Max HP". If she ever bursts while UNCOATED she
instead buffs her own Max HP by 48% for 20s, re-applies the coating on that burst, and stacks
escalating Next-Shield-HP bonuses (+17.75%/26.66%/35.53% by use count). **At scope lock the
coating never breaks** — the v1 sim models no incoming boss damage and a duration-less shield
is permanent at scope (sim.ts's own shield comment) — so only the coated branches can ever
fire: the battle-start shield and the gated nuke. Her MG weapon (~95% of her damage) is
untouched by the kit.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1: battle start → self shield 21.12% final Max HP, continuously | FAITHFUL | `shield{maxHpPct:21.12}` self passive, no durationSec ("continuously" = permanent at scope; duration-less shields are the engine's documented at-scope semantics). Event-silent by design (no shield HP pool in v1); the observable is the `requiresShielded` window it opens. Proven non-hardcoded in shield-free fixture C (liter/delta): shield removed → zero nukes, normal/skill buckets byte-identical. Crown-recovery tripwire (S2b reviewer) proves the encoding is not heal-flavored |
| S1: on burst, re-shield if NOT coated | DOCUMENTED_GAP | Dead at scope (never uncoated) + no negated-shield-gate primitive; ungated encoding would over-fire every burst. Verbatim in `unmodeled.skill1`; pinned by absence (skill1 has exactly the one passive block) |
| S2: after 200 normal attacks while coated → restore Shield HP 2.85% final Max HP | DOCUMENTED_GAP | The line RESTORES an existing shield's HP pool — no pool exists in v1, so the payload is unobservable, and every event encoding misfires a teammate: `heal` fires crown-class recovery consumers, a fresh `shield` re-fires naga-class `shielded` triggers every 200 rounds. Verbatim in `unmodeled.skill2`; pinned by absence (skill2 empty, no skill2-sourced events). THE contested line — see cross-family §S5 |
| S2: uncoated burst → Next Shield's HP ▲ 17.75/26.66/35.53% (escalating by uses) | DOCUMENTED_GAP | Dead at scope (uncoated gate) AND no shield-size-modifier primitive / shield HP pool. Verbatim in `unmodeled.skill2`; no-escalating-block + no-maxHp-leak pins; nuke magnitude constant across casts |
| Burst: in Nano Coating → all enemies, 1150.84% of "the ATK, which is calculated from 5% of final Max HP" | FAITHFUL routing / ⚑ basis | `burstCast` + `requiresShielded:true` + `flatDamage{atkPct:1150.84}` vs enemy — once per HER cast (never `fullBurstEnter`: 6 casts vs 11 FBs with helm co-B3), pre-FB (never takes the +50% major), no core clause, burst bucket. **BASIS MEASUREMENT-GATED:** the kit says the nuke's ATK is DERIVED from 5% of final Max HP; the engine has no basis-replacement primitive (effectiveAtk is purely additive; stackedNuke.hpPct is Maiden:IR stack semantics) and S4 forbids engine edits. Shipped at her own ATK basis: documented undercount ≤2.07× at scope (~4% of her personal total, ~1-2% of a team total) + documented false coupling to teammate ATK buffs. Recipe: focus recording, read her burst popup vs the ATK×1150.84 prediction; a popup ~2× higher confirms the HP basis and calls for a flatDamage HP-basis primitive. maiden-ice-rose precedent (HP-scaled burst portion shipped as documented under-model) |
| Burst: NOT in Nano Coating → self Max HP ▲ 48% for 20s | DOCUMENTED_GAP | Dead at scope (never uncoated); even if it fired it is damage-inert on her (40s burst CD > 20s window; no atkOfMaxHpPct consumer to feed). Verbatim in `unmodeled.burst`; laundered-branch counterfactual proves the shipped file does not emit it, and the leak pin shows even a laundered maxHpPct buff cannot move the nuke under the shipped ATK basis |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on the
  shield/gate structure, all three dead-at-scope uncoated branches, and the burstCast keying.
  Two reconciled disagreements: (1) reviewer disposed the burst basis FIX ("ATK term is
  REPLACED by 5% of kilo's own final Max HP") — the driver holds MEASUREMENT-GATED ⚑ because no
  basis primitive exists, S4 forbids engine edits, and the reviewer's own maxHp-tracking
  assertion is unsatisfiable by any override authoring; the reviewer's second finding (an
  ATK-basis nuke wrongly rides teammate ATK buffs) was adopted into the caveat verbatim. (2)
  Reviewer disposed the 200-attack restore FAITHFUL-as-shield-event under the tandem-
  completeness rule; driver holds UNMODELED (restore ≠ new shield/heal application; every
  encoding misfires a teammate trigger — the reviewer's own K3 note warns about exactly that
  over-fire class). Adopted the reviewer's crown-recovery tripwire and burstCast-vs-FB
  discriminator as assertions.
- **S5 (claude-opus-5, blind tests):** `leakDetected:null`. 20 tests = 15 passed / 1 failed /
  4 skipped vs the driver override. The 4 skips are the blind model's OWN documented gaps
  (B-a basis has no primitive; S1-b negative gate inexpressible + inert; S2-b no
  shield-magnitude stat; S2-a payload unobservable). The ONE failure is the contested S2-a
  restore line (blind requires `hitCount{200} → shield{2.85}`; driver ships verbatim
  UNMODELED). Every other line green — including all behavioral burst assertions (once-per-
  cast, pre-FB, no range, no core, materiality) and the shield gate.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on the passive shield,
  the requiresShielded-gated burstCast flatDamage, and all three dead-branch skips. Diverged
  on the nuke magnitude: shipped `atkPct:575` as a flagged ESTIMATE derived from an ASSUMED
  Defender HP:ATK ratio of 9-11× — the MEASURED scope-lock ratio is 41.3×, making the true
  ATK-equivalent ~2379%, so the estimate is ~4.1× low; the blind's own flag names an engine
  primitive (flatDamage `hpPct` basis field, S4-forbidden) as the correct fix and marks the
  number "the dominant error term in this file". Also `crit:true` (redundant vs the
  helm-precedented bare-flatDamage default, not a conflict) and the same contested S2-a
  shield re-application as S5.
- **S7 (kimi-code/k3, binding judge):** verdict GO, faithfulness 1.0, `gotchas:[]`,
  `discriminationOk:true`. Ruled the S2-a red "a disposition disagreement over a damage-inert,
  payload-unobservable defensive line, not an encoding error — classified DOCUMENTED_GAP, not
  REAL-GOTCHA; the blind red is recorded, not adopted", citing the driver's contamination
  argument and the prose's literal "Restores Shield HP" (a pool top-up, not a new application).
  Ruled the driver's basis handling "exactly what MEASURED > FUDGE requires (S6's 575 is the
  fudge this rule exists to prevent)".

## Residual flags (owner spot-checks)

1. **HP-basis popup recipe** — the kit's one real damage residual. A focus recording reading
   kilo's burst popup against the ATK×1150.84 prediction settles it: a popup ~2× higher
   confirms the HP basis and calls for a `flatDamage` HP-basis primitive (S6 route 1). Both
   documented infidelities — the magnitude undercount and the false ATK-buff coupling —
   collapse together when measured.
2. **shieldedUntilFrame is not name-keyed to Nano Coating** — the engine's shield window is
   opened by ANY shield (naga convention). At scope this is unobservable (kilo's own shield
   never breaks), but in any future model where shields break while a teammate shields her,
   `requiresShielded` would over-open the coated gate. Re-check the day shield-breaking is
   modeled.
