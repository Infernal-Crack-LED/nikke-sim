# Manual review — pascal (Pascal)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter` identity; scoped `alliesLowestHp` leftmost-3 stand-in; bounded engine-core gap on S1 targeting)

> Slug disambiguation: `pascal` is the BASE unit — no variant shares her name; the
> slug-disambiguation lint passes clean. RL / Supporter / Iron / Burst I, Abnormal, SR,
> released 2023-09-01. FROM-SCRATCH build: no prior override, `simSupported` false → true.

## Kit summary

Pascal is a pure healer on Burst I with a rocket launcher — zero damage lines anywhere in her
three slots. Every 10 shots she fires, she heals the single ally with the highest final DEF for
6.28% of her own final Max HP. Whenever the team enters Burst Stage 1, the 3 allies with the
lowest remaining HP gain +38.4% incoming healing for 10s. Her burst heals the 3 allies with the
lowest remaining HP for 55.29% of her final Max HP on cast (datamined `skill_type` SetBuff, no
hurt values — no damage component). Offensively she contributes nothing but plain RL fire and
Burst-I rotation participation; her only damage-sim footprint is the recovery EVENTS her heals
emit, which feed teammates whose kits trigger on receiving healing (crown's +20.99% team Attack
Damage consumer in the fixtures). The sim models no HP amounts, so every heal MAGNITUDE in this
kit is unrecordable by engine design — a heal is an event, not a number.

## Line-by-line

| Line                                                                          | Disposition       | Notes                                                                                                                             |
| ----------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S1: after firing 10 time(s) → heal 1 highest-final-DEF ally (6.28% final MaxHP) | DOCUMENTED_GAP    | Cadence (`hitCount:10`) + heal EVENT expressible; the DEF-ranked TARGET is not (no such TargetDef; engine edit forbidden by S4). Priced absence ⚑2 — a stand-in emission would fabricate the recipient, and on-recovery consumers key on the recipient. Absence pinned falsifiable (materialized-S1 floods the recovery channel). |
| S2: Burst Stage 1 entry → 3 lowest-HP allies, Incoming healing ▲38.4% / 10s    | DOCUMENTED_GAP    | No `incomingHealingPct` StatKey and heal effects carry no amount → the amplifier multiplies nothing (damage-neutral by construction). sakura-suzuhara S2 is the identical line. Nearest-wrong (a HEAL proxy on `stageEnter:1`) pinned RED. Trigger-if-modeled (`stageEnter{stage:1}`, anyone's B1 cast) recorded for the recipe path only. |
| Burst: burstCast → 3 lowest-HP allies, heal (55.29% final MaxHP)               | FAITHFUL          | `burstCast` (her own cast — precedes the FB window; multi-B1 generality) → `alliesLowestHp count:3` (documented leftmost-3 stand-in, ⚑1) → bare `heal` (event-only; no magnitude fabricated). Pinned vs heal-removed / self-only / fullBurstEnter / all-allies counterfactuals; count:3 pinned via a slot-3 recovery probe. |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on S2
  (UNMODELED — no StatKey, recovery triggers fire regardless of magnitude) and the burst
  (FAITHFUL — `burstCast`, leftmost-3, tandem recovery driver). ONE divergence: the reviewer
  wanted S1 modeled on a DEF-ranked stand-in (a Defender-class resolution) while itself
  conceding "this is a schema GAP" — that resolution is inexpressible in the schema, and any
  expressible stand-in misattributes the recovery channel; driver held the priced absence
  (flora/grave precedent). Reviewer's documentation bar ("never silently target self/leftmost")
  is met more strongly by the pinned, ⚑-costed absence.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. The pristine suite concluded ALL
  THREE lines are GAPs — blocked by a redaction artifact: the packet's redacted types hide the
  `heal` EffectDef (blindness redaction; the driver override uses it), so the blind writer
  believed heals were unauthorable. Pristine was additionally non-executable (wrong harness
  import path; `ov.X.blocks` shape that does not exist; `onEvent` outside `cfg`). The labeled
  adapted copy (`blind/pascal.adapted.test.ts`, pristine preserved) fixes the three API issues
  and re-expresses the one substantive divergence (whole-kit inertness → self-inertness +
  unmodeled-lines team-inertness + a positive tandem arm): **10 passed / 3 author GAP-skips /
  0 failed** vs the driver override. The pristine's substantive premise was refuted by S2b and
  S6 both independently inferring the hidden `heal` kind exists — judge classified it
  RECON_ERROR induced by packet redaction, not a driver finding.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on the burst
  (`burstCast` / `alliesLowestHp:3` / heal) and S2 (verbatim unmodeled, identical reasoning).
  Diverged on S1: encoded `hitCount:10` → `alliesLowestHp count:1` stand-in with a ⚑ that the
  identity is wrong (driver: priced absence — see S2b note above). Also attached a fabricated
  `maxHpPct` field to the heal, self-flagged "field name unverified against live types.ts" —
  the live `heal` kind carries no magnitude fields (event-only by engine design).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true.**
  Ruled FOR the driver on the litigated S1 line: emitting recovery events on a wrong recipient
  actively fabricates consumer attributions (non-negotiable 2 — the blind honest ⚑ IS the
  correct output), the spec pins the absence falsifiably, and the gap is bounded (moves damage
  only in comps fielding an on-recovery consumer who IS the DEF-ranked ally) → engine-core tier
  correct, not NO-GO(engine-core). Verified the ⚑2 cadence estimate independently (90 RPM ⇒
  ~9.5s/proc). Burst ruled FAITHFUL against all four counterfactuals; S2 inertness ruled
  structural, not a judgment call.

## Residual flags for owner

1. **Adapted-S5 independence (judge residual).** The EXECUTED S5 copy is driver-adapted — the
   three API fixes are mechanical, but the re-expressed inertness arm is substantive, so the
   independence of that green is weaker than a pristine run. The pristine is preserved at
   `blind/pascal.test.ts`; diff the two if this unit is ever re-litigated.
2. **Leftmost-3 stand-in + unrecordable magnitudes (judge residual, MEASUREMENT-GATED).** The
   `alliesLowestHp` leftmost-3 resolution (⚑1) and the event-only 55.29/6.28 magnitudes have
   never been checked against a real pascal recording. One focus video reading heal-popup
   targets vs HP bars closes both cheaply.
3. **S1 engine-core gap (⚑2).** The every-10-shots heal of the highest-final-DEF ally ships
   unmodeled: `resolveTargets` has no DEF-ranked ally kind and S4 forbids the engine edit.
   Recipe (recorded in the override): plumb level-scaled DEF (already computed in stats.ts)
   into UnitState, add a DEF-ranked selector mirroring `alliesTopAtk`'s evaluated-once ranking,
   then encode `hitCount:10` → selector count:1 → heal. Until then, comps with an on-recovery
   consumer who IS the highest-final-DEF ally read cold by that consumer's S1-driven uptime.
4. **Gauge estimate.** No `data/gauge-per-shot.json` row — accrual uses the RL modal fallback
   (sim.ts `GAUGE_MODAL_BY_WEAPON`); her 40s-cd cast cadence in fixtures is gauge/CD-limited by
   that estimate. No kit line keys off her shots, so this rescales nothing kit-side.
