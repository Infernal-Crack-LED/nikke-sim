# Manual Review — rei-ayanami (Rei Ayanami)

**Date:** 2026-07-25
**Verdict:** GO (cross-family corroborated) ✓
**Faithfulness:** 1.0
**Tier:** 2 (element-scoped ally buffs, hitCount-100 cadence, stageEnter-vs-burstCast trigger identity, advantage-gated elemAdvantage, burstCast-vs-FB-exempt nuke)
**Gauntlet driver:** Qwen
**Cross-family:** S2b claude-fable-5 ✓ | S5/S6/S7 claude-opus-5 ✓
**Binding judge (S7, claude-opus-5):** GO · faithfulness 1.0 · convergence RED(1)→RECON_ERROR · discriminationOk · 0 silent-drops · 0 gotchas

> **EXACT SLUG:** `rei-ayanami` (Rei Ayanami, MG/Attacker/Fire/Burst III) — there is **no other Rei variant** in the
> roster. Approved nickname: "ra".

---

## Kit Summary

MG / Attacker / Fire / Burst III, cd 40s, ammo 300, reloadFrames 171, hitsPerShot 1, normalMult 5.57.

A Fire machine-gun attacker whose damage rides on a 100-round counter. Every 100 normal attacks her S1 does two things
at once: it gives herself a short 3-second **Elemental Advantage Attack Damage ▲30.23%** buff (live only while she holds
elemental advantage — Fire vs a Wind boss; dead weight on a neutral boss), and fires a single extra **112.37%-of-final-ATK**
hit at the enemy nearest her crosshair. Her S2 is a permanent passive that massively boosts damage to enemy shields
(700.5% — inert in solo raid: the partless boss has no shield), plus — whenever the team reaches Burst stage 3 — a
10-second **ATK ▲25.03% of HER own ATK** grant to every Fire ally (casterAtkPct; lands on herself in a typical comp). Her
Burst shields all Fire allies for 13.44% of her Max HP and raises their **Attack damage ▲48.02%** for 10s, then detonates a
**990.2%-of-final-ATK** hit on all enemies. Against a partless, shieldless solo-raid boss her practical contribution is the
periodic 112% procs, the Fire-ally ATK/damage buffs (which land on herself), and the burst nuke.

---

## Line Dispositions

### FAITHFUL (5 lines)

| Line                                              | Encoding                          | Trigger → Target              | Notes                                                                                                  |
| ------------------------------------------------- | --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| S1: Elemental Advantage Atk Dmg ▲ 30.23% / 3s     | `elemAdvantageDamagePct 30.23/3s` | hitCount 100 → self           | Engine-gated on real advantage (BEATS[Fire]=Wind). LIVE vs Wind boss, byte-identical GATED vs Iron; CF ungated attackDamagePct over-credits Iron. Proc count == floor(shots/100). |
| S1: Deals 112.37% of final ATK as damage          | `flatDamage 112.37`               | hitCount 100 → enemy          | Skill bucket; crit at caster rate, no core (text "as damage"), noRange, FB-by-timing (in-FB procs take +50%). Proc count == floor(shots/100), < shots. CF core:true flips coreEligible. |
| S2: ATK ▲ 25.03% of skill user's ATK / 10s        | `casterAtkPct 25.03/10s`          | stageEnter stage 3 → alliesOfElement Fire | Flat add of HER ATK. Fires on ANY B3 cast (stageEnter) — with a helm co-B3, applies == reiCasts + helmCasts > reiCasts (the trigger-identity discriminator). Reaches rei only; CF generic-`allies` reaches all three; CF atkPct logs atkPct. |
| Burst: Attack damage ▲ 48.02% / 10s               | `attackDamagePct 48.02/10s`       | burstCast → alliesOfElement Fire | Additive Damage-Up bucket; own-cast-keyed (applies == reiCasts, NOT helm's). LIVE (removal moves her total). CF generic-`allies` reaches all three. |
| Burst: Deals 990.2% of final ATK as damage        | `flatDamage 990.2`                | burstCast → enemy             | Burst bucket; FB-EXEMPT (cast lands before FB opens → nukes.filter(fbMajorApplied) === []), crit at caster rate, no core, noRange; once per own cast (== reiCasts < reiCasts+helmCasts). CF core:true flips coreEligible. |

### UNMODELED / DOCUMENTED-GAP (2 lines)

| Line                                              | Disposition       | Reason                                                                                          |
| ------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| S2: Damage dealt to Shield ▲ 700.5% continuously  | UNMODELED (inert) | No shield-damage StatKey in the schema; the partless scope-lock boss has no shield pool. The kit's dominant number and the designed ~8× over-credit trap — all four independent reads (driver, S2b, S5, S6) agree it must be inert. Recorded verbatim in `unmodeled.skill2`. |
| Burst: Shield = 13.44% of caster final Max HP / 10s | ⚑ event-only    | ENCODED as `shield{maxHpPct 13.44, dur 10}` but the engine models no HP pool and emits no log event — it only sets a shielded-state window / fires `shielded` triggers. With no shield-synergy consumer in the comp it is unobservable end-to-end and asserted nowhere (⚑3). Present-but-unasserted, NOT dropped (the tandem trap S2b named). |

---

## Cross-Family Corroboration

- **S2b pre-op review (claude-fable-5):** all 6 kit lines FAITHFUL; S2A "Damage dealt to Shield ▲700.5%" UNMODELED/inert
  (leakDetected null). The reviewer flagged the **stageEnter-vs-burstCast trigger-identity triangle** (S2B fires on any B3
  cast; the burst lines fire on Rei's own) and the **casterAtkPct flat-resolved event value** — both adopted by the driver
  test. It also named the 700.5% line as "the single biggest over-credit trap in the kit."
- **S5 blind test-writer (claude-opus-5):** pristine blind test vs the driver override ran **9 GREEN / 1 RED / 2 skipped**.
  The single RED is a **blind-test assertion bug ruled RECON_ERROR** by the binding judge: the blind asserted removing Rei's
  S1B 112.37% rider leaves teammate totals byte-identical, but flatDamage riders call `skillGauge()`, so the rider feeds
  burst gauge and its removal shifts the team's Full-Burst cadence by ~0.02% — the rider is pure personal damage but NOT
  gauge-neutral; prose + formula side with the driver. The 2 skips are documented magnitude GAPs (burst-shield magnitude —
  no HP pool; S1a elemAdvantage magnitude — the blind used a Fire boss so Rei is unadvantaged; the driver used a Wind boss
  to make S1a LIVE — convergent). leakDetected null.
- **S6 blind override-writer (claude-opus-5):** **byte-equivalent to the driver on every load-bearing axis.** skill2 EXACT
  MATCH (stageEnter{3} → alliesOfElement Fire → casterAtkPct 25.03/10s — the kit's hardest line); burst EXACT MATCH
  (burstCast Fire [shield 13.44 + attackDamagePct 48.02] + enemy 990.2); skill1 EXACT MATCH. Only deltas: two explicit
  `crit:true` additions on the flatDamage riders (semantic NO-OP — engine default is crit-ON) and a wording difference in
  the unmodeled.skill2 quote. NO real divergence. leakDetected null.
- **S7 binding judge (claude-opus-5):** **GO, faithfulness 1.0, discriminationOk true, 0 gotchas.** Ruled the single S5 RED
  a RECON_ERROR (gauge coupling). Named the helm co-B3 trigger-identity triangle "the strongest discriminator in the suite."

---

## Owner Spot-Checks (non-blocking)

1. **noFb structural exemption (990.2% nuke):** S2b insisted on an explicit `noFb:true`; the driver correctly relied on the
   engine's structural burst-cast FB exemption instead. The test verifies the OBSERVABLE (`nukes.filter(fbMajorApplied) === []`)
   rather than the flag — stronger. An owner who ever changes burst-cast ordering should re-read that assertion.
2. **Burst shield (13.44% Max HP):** present-but-unassertable in this comp (no HP pool, no shield-synergy consumer); its
   correctness rests on structural inspection alone until a shield-consuming teammate exists.
3. **⚑2 MG cadence tuple:** the hitCount-100 proc cadence depends on MG fire rate; `reloadFrames 171` is unverified datamine
   (lives in base stats, not a kit line). Recipe: focused solo video — rounds/min, reload gap, per-100-hit proc counter deltas.
4. **Same-model residual:** S5/S6/S7 were all claude-opus-5 (S2b was claude-fable-5), so the two converging post-op encodings
   share a family prior. The residual is the measurement-gated cadence cluster (⚑2), not a structural faithfulness question —
   all three cross-family roles converged on the encoding independently.

---

## Artifacts

- Driver test: `scripts/tests/units/rei-ayanami.test.ts` (25/25 GREEN)
- Driver override: `src/skills/overrides/rei-ayanami.json`
- Blind test: `scripts/kit-autonomy/blind/rei-ayanami.test.ts` (9/1/2 vs driver)
- Blind override: `scripts/kit-autonomy/blind/rei-ayanami.override.json`
- S2b review: `scripts/kit-autonomy/reviews/rei-ayanami.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/rei-ayanami.verify.txt`
- Judge packet: `scripts/kit-autonomy/results/rei-ayanami-judge-packet.md`
- Results: `scripts/kit-autonomy/results/rei-ayanami.json`
