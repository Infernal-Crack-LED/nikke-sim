# Manual review — lily (Lily)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped single-ally buffs + burstCast trigger + destroyed-cover status-gate kit — the gate is constant in v1: always-false for branch A, always-true for branch B)

> Slug disambiguation: `lily` IS the base SMG/Wind Supporter (resource_id 852, Burst II, Abnormal,
> "Precise Adjustment" / "Emergency Repair" / "The Best Engineer!"); no variants exist in the
> datamined roster — the slug-disambiguation lint returned clean. FROM-SCRATCH gauntlet: no shipped
> override existed before this run (`simSupported` was false); the override was authored as the
> faithful encoding under test and every assertion pins a kit line GREEN vs it and RED vs the
> nearest-wrong counterfactual. FIXTURE NOTE: lily is Burst II — a controlComp-style fixture that
> seats another B2 (crown) starves her burst casts, so the spec's MAIN fixture is the sole-B2 shape
> [liter / lily / ada / helm] (biscuit precedent); G0 pins one lily cast per Full Burst (5/5).

## Kit summary

Lily is a Wind SMG Supporter on Burst II (cd 40s) whose entire contribution is flat ATK grants to a
single ally, scaled off her own ATK ("ATK ▲ x% of the skill user's ATK" → `casterAtkPct`, resolved
flat at apply: kit%/100 × lily.staticAtk). Skill 1 grants one random ally 20% of her ATK for 5s on a
15s internal cooldown (no activation clause → the datamined skill CD as an `interval` trigger,
neve/helm-aquamarine convention). Her burst is a destroyed-cover BRANCH kit: if any ally's cover has
been destroyed, she rebuilds it at 30% HP and grants that ally 20% of her ATK for 10s; otherwise she
grants one random ally 40% of her ATK for 10s. In v1 nobody's cover is ever destroyed (no
incoming-damage model), so the gate is constant — branch A never fires, branch B always does. Skill 2
("Restores 10% of Cover HP") and the branch-A cover rebuild are the liter-S2 cover-HP NO-OP class
(owner ruling 2026-07-21): cover is an object, not a unit HP pool — both ride verbatim in
`unmodeled` and deliberately emit NO recovery events (encoding them as unit heals is the liter trap:
it would spuriously fire Crown-class "when recovery takes effect" consumers). "1 random ally" has no
engine target kind; both modeled lines resolve to the single highest-base-ATK ally (alliesTopAtk
count:1 — the chime "The King" single-ally-grant precedent) as a documented ⚑ stand-in.

## Line-by-line

| Line                                                                                         | Disposition    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 1 random ally — ATK ▲20% of the skill user's ATK, 5s (15s CD)                            | FAITHFUL       | `interval:15` (datamined skillCooldownsSec; first fire t=15 per the engine interval convention ⚑3) → `alliesTopAtk` count:1 → `casterAtkPct 20 / durationSec 5`. L1 pins 11 fires at exact 15s spacing (t=15..165), the flat value exactly 0.20 × lily.staticAtk, 300-frame windows, exactly one holder per firing; counterfactuals: `atkPct` misread (% of the holder's own ATK) cannot reproduce the flat value, all-allies scope reaches 4, removal moves the holder's total.                                                |
| S2: all allies — Restores 10% of Cover HP                                                    | DOCUMENTED_GAP | Cover-HP restore is the liter-S2 NO-OP class (owner ruling 2026-07-21; naga precedent) — an object's HP, not a unit heal; v1 models no cover HP. Deliberately NOT encoded as `heal`: that would emit recovery events every 15s and fire Crown-class consumers (the liter trap). Verbatim in `unmodeled`; the L2 guard proves the shipped override feeds Crown ZERO recovery while the nearest-wrong heal counterfactual fires her ≥10 extra times in the same guard comp.                                                       |
| Burst A: 1 random ally whose cover has been destroyed — Rebuild Cover 30% HP + ATK ▲20%, 10s | DOCUMENTED_GAP | The destroyed-cover gate can never legitimately fire in v1 — there is no incoming-damage / cover-destruction model (immortal boss), so the branch is always-false (biscuit S2 un-fireable-trigger disposition); the rebuild portion is the cover NO-OP class regardless. Verbatim in `unmodeled`; its 20% magnitude is pinned ABSENT — the burst-slot value-set assertion shows lily's burst only ever emits the 40% flat grant.                                                                                                |
| Burst B: no ally's cover destroyed — 1 random ally: ATK ▲40% of the skill user's ATK, 10s    | FAITHFUL       | The complement branch is always-TRUE in v1 (soline Max-HP-gate documentation pattern: the gate is recorded, never enacted) → `burstCast` (her OWN cast, never `fullBurstEnter`) → `alliesTopAtk` count:1 → `casterAtkPct 40 / durationSec 10`. L4 pins one 600-frame grant per lily cast (5 casts = 5 FBs in the sole-B2 fixture), the flat value exactly 0.40 × lily.staticAtk, exactly one holder per cast; counterfactuals: wrong-branch 20% halves the value, all-allies scope reaches 4, removal moves the holder's total. |

## Cross-family corroboration

All four roles ran cross-family; artifacts under `scripts/kit-autonomy/` (reviews/lily.test-review.json,
blind/lily.{test.ts,adapted.test.ts,override.json}, results/lily.json).

| Role              | Model (from result JSON) | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S2b test review   | claude-fable-5           | Converged on all five lines (`leakDetected: null`): casterAtkPct flat basis (explicitly pre-registered the raw-20/40 and atkPct reads as nearest-wrong), burstCast-not-fullBurstEnter with the B2-contention live-divergence warning, branch exclusivity (never sum/average the branches), cover lines inert-and-recovery-silent (the crown-tandem hazard named independently), random-ally stand-in must be a documented ⚑. Its one MEASUREMENT-GATED question (does cover repair satisfy on-recovery consumers) is resolved by the owner's liter ruling — same default-inert conclusion. |
| S5 blind tests    | claude-opus-5            | Pristine artifact failed collection (blind-dir import path); after 3 documented structural adaptations — (1) harness import path, (2) `durationShots` null-vs-undefined event shape, (3) fixture rebuilt to the sole-B2 shape because the pristine controlComp seated crown (B2) beside lily (B2) and crown won every stage-2 rotation (the blind header PRE-DIAGNOSED this exact fault and prescribed the rebuild) — the suite runs **15 GREEN / 0 RED / 4 skipped** vs the driver override. The 4 skips are the blind writer's own unobservable flags.                                   |
| S6 blind override | claude-opus-5            | Structurally IDENTICAL to the driver encoding on every decision: casterAtkPct both lines, burstCast trigger, branch A unmodeled verbatim / branch B always-true, S2 cover inert-and-not-a-heal, cadence tuple ⚑. Two flagged divergences, both on the ⚑-surface: S1 cadence interval:10 (self-declared INVENTED — the blind packet had no datamine) vs the driver's datamined 15s; and the random-ally stand-in as an expectation-split (all allies at value/5) vs the driver's alliesTopAtk count:1 (chime precedent).                                                                    |
| S7 judge          | kimi-code/k3             | **Binding verdict GO, faithfulness 1.0, discriminationOk, gotchas []**. All five lines FAITHFUL or DOCUMENTED_GAP with verbatim records and discriminating guards; both blind divergences ruled spurious-or-moot (the invented 10s interval is superseded by the datamined CD; the stand-in split is a documented ⚑ on both sides and near-damage-neutral — flat ATK adds move holder identity, not structure). One cosmetic note drift flagged and fixed (SMG quantization 20 shots/s, not 24).                                                                                           |

## Residual flags (owner spot-check — from the judge's rationale)

1. **⚑1 random-ally stand-in.** Both modeled lines resolve "1 random ally" to the single
   highest-base-ATK ally (alliesTopAtk count:1). True random would rotate the holder; a focus-video
   popup read settles which ally actually receives each S1/burst grant. Flat ATK adds are
   near-damage-neutral across holders, so the stand-in moves holder identity, not (much) team damage.
   The blind family's expectation-split (all allies at value/5) is the defensible alternative.
2. **⚑3 interval first-fire phase.** t=15 vs t=0 is the engine interval convention, pinned at t=15;
   the true in-game phase of lily's Skill 1 is unmeasured.
3. **SR rarity ceiling not applied.** The scope-lock basis (3★/core 7) is an SSR ceiling; lily is
   SR and ships uncapped per the helm-in-controlComp precedent, so her staticAtk (the casterAtkPct
   flat basis) is slightly warm — structure, not magnitudes, is what the gauntlet certifies.
4. **Model-only.** No real lily footage has been graded; `tier: MODEL_ONLY / tuned: false` until a
   recorded fight validates absolute damage (board A/B is the outer loop).
