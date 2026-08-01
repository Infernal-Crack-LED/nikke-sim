# Manual review — marciana (Marciana, BASE)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discrimination ok).
Kit-autonomy gauntlet 2026-07-31. Tier 1 (clean-weapon unit — no load-bearing damage mechanic in
her own kit; the encoding is recovery-event emitters plus one inert defPct buff).

SG / Supporter / Iron / Burst II, 20s CD, ammo 9, Elysion. **Base unit** — NOT
`marciana-marine-study` (the AR/Iron Attacker variant; a different kit). Marciana is a PURE HEALER
and one of the six clean-weapon basis units (`scripts/tests/lib/harness.ts` `CLEAN_WEAPON_TEAMS.a`,
the SG representative): her kit contributes NOTHING to damage. Every skill line is either a
recovery EVENT (a heal — the engine models it as an event that fires teammates' on-recovery
consumers, NOT a number; there is no HP pool / survivability sim) or an inert `defPct` buff. Her
personal damage is weapon-only; her board value is tandem (she refreshes recovery-consumer
teammates such as Crown / Asuka to near-permanent team Attack Damage).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                          | Disposition            | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1a  | ■ last bullet hits → all allies: Recovers 10.95% of attack damage as HP over 3 sec       | FAITHFUL (event)       | `lastBullet` → `heal` ticks:3 to all allies. "over 3 sec" = heal-over-time → 3 recovery events (one/sec) across the window, keeping on-recovery consumers refreshed. Amount unmodeled by engine design (heal = recovery event, no HP pool). Pinned: asuka's recovery consumer fires ≥3× per last bullet; a ticks:1 counterfactual collapses the firings to lastBullets+bursts.                                                                                                                    |
| S1b  | ■ last bullet hits → 2 allies highest final ATK: Incoming healing ▲26.98% for 3 sec      | UNMODELED (verbatim)   | No incoming-healing StatKey exists, and with no HP amount modeled an incoming-healing multiplier has nothing to scale — inert in the damage sim. Pinned: 26.98 never appears as any buff value; the line lives verbatim in `unmodeled.skill1` (never an `ignored` drop). If ever modeled it must be `alliesTopAtk count:2 byFinalAtk:true` (the "highest FINAL ATK" target subtlety, preserved verbatim).                                                                                         |
| S2   | ■ using Burst Skill → all allies: Recovers 28.11% of the skill user's final Max HP as HP | FAITHFUL (event)       | `burstCast` → `heal` ticks:1 (instant) to all allies. Keyed to burstCast (her OWN cast), NOT fullBurstEnter — the load-bearing trap for a Burst-II unit beside another B2 (fullBurstEnter would over-fire on rotations another B2 took). Pinned: isolating S2 (S1 stripped) leaves recovery firings == marciana's own burstCast count; structural pin asserts `trigger.kind==='burstCast'` on every skill2 block. Amount out-of-domain (no HP pool).                                              |
| BUa  | ■ all allies: Storage — store excess healing received by skill user, ≤27.87% Max HP, 10s | UNMODELED (verbatim)   | No heal-storage/overflow primitive and no HP pool in v1; self-scoped (the skill user's own overflow healing); damage-inert. Explicitly NOT encoded as a `shield` effect — a shield would emit shielded events and falsely satisfy teammates' `requiresShielded` gates (e.g. asuka's S2). Pinned: no `shield` effect anywhere in the override; 27.87 never appears as a buff value.                                                                                                                |
| BUb  | ■ all allies: DEF ▲20.9% of the skill user's DEF for 10 sec                              | FAITHFUL (inert in v1) | `burstCast` → `defPct 20.9 / 10s` to all allies, kept for kit completeness. `defPct` is inert in v1 (self DEF never enters damage dealt). In-kit the value is a flat add off the CASTER's DEF, not a % of each target's own DEF; DEF being damage-inert, the distinction is immaterial (crown S1 convention). Pinned: 24 applications = 8 bursts × 3 allies, 600-frame (10s) expiry; byte-identical totals with the line stripped; a defPct→attackDamagePct counterfactual provably moves totals. |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on all 5 lines (same triggers,
  primitives, UNMODELED set). Pre-registered the two traps that matter for this unit: (1) skill2
  keyed to fullBurstEnter instead of burstCast (uniquely live because Marciana is Burst II), and
  (2) the burst Storage encoded as a `shield` (would falsely fire shielded triggers). Both adopted
  as structural pins. Read S1b as `alliesTopAtk byFinalAtk:true` if ever modeled.
- **S5 blind test writer — claude-opus-5:** 25 tests (21 live + 4 skipped GAP lines). vs the driver
  override: **15 PASS / 6 FAIL / 4 SKIP**. The binding judge ruled all 6 failures recon artifacts,
  NOT override faults: (a) 4 assertions observe a `'heal'`/`'recovery'` SimEvent kind the engine
  provably never emits (the log's only kinds are buffApply/burstCast/damage/fullBurstEnd/
  fullBurstStart/reload/shot — heals are observable only via a recovery consumer's buffApply, which
  the driver test does correctly via asuka's self atkPct 96.98); (b) 2 stem from the blind fixture's
  co-B2 contention (controlComp puts crown beside marciana at B2; crown wins every slot — proven
  marciana burstCast 0, crown 10), which fails the blind test's OWN non-vacuity gate. The 15 passes
  independently confirm the inertness envelope, target sets, the 10s duration bound,
  burstCast-not-fullBurstEnter, Storage-not-shield, no burst damage, and no self ATK/crit/damage buff.
- **S6 blind override writer — claude-opus-5:** FUNCTIONALLY IDENTICAL to the driver override — same
  triggers (lastBullet / burstCast / burstCast), targets (allies), effects (heal ticks:3 / heal
  ticks:1 / defPct 20.9 durationSec:10), the same two verbatim `unmodeled` lines, and the same
  caveats (HoT tick estimate, lastBullet cadence, heal magnitudes unmodeled, caster-DEF-vs-target
  approximation, Storage NOT shield). Only behavioral-neutral diffs: an explicit `intervalSec:1`
  (the engine default the driver omits) and a more verbose note. This is the decisive corroboration:
  blind, opus derived the exact same encoding the driver did.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, zero gotchas, discriminationOk true.
  All 5 kit lines FAITHFUL (3) or DOCUMENTED_GAP with sound no-primitive reasoning (2); every trap
  S2b pre-registered was avoided by both driver and blind override-writer; fire-rate check passes
  (70 consumer firings = 3×21 last-bullets + 8 bursts; defPct 24 = 8×3 at 600-frame expiry).

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **S1 HoT ticks:3 / intervalSec:1 reading of "over 3 sec"** — a shared convention (prescribed by
   S2b, adopted by driver and S6 alike), NOT a measured tick cadence. It directly scales how often
   on-recovery consumers refresh: a real HoT that ticks differently (e.g. a single application with
   a 3s duration tag) would over-credit consumers 3×. The one number a frame-read of a
   recovery-consumer's refresh cadence (count Crown's/Asuka's recovery popups per Marciana magazine)
   could pin. This is the only residual standing between this encoding and measurement-tier
   confidence; it moves no damage of Marciana's own.

None is a fudge; none blocks GO. No board reading exists yet (unit has no real recordings — not on
the accuracy board before or after the flip; `board: null`, tier MODEL_ONLY, tuned false).

## Artifacts

- Driver test: `scripts/tests/units/marciana.test.ts` (17/17 green)
- Override: `src/skills/overrides/marciana.json`
- Results: `scripts/kit-autonomy/results/marciana.json` (+ `results/marciana-judge-packet.md`)
- Blind: `scripts/kit-autonomy/blind/marciana.{test.ts,adapted.test.ts,override.json,blind-run.txt}`
- Cross-family evidence: `scripts/kit-autonomy/cross-family/marciana/{s2b,s5,s6,s7}-result.json`
- S2b review: `scripts/kit-autonomy/reviews/marciana.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/marciana.verify.txt`
