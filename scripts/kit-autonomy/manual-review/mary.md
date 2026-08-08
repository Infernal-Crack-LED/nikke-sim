# Manual review — mary (Mary)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (burstCast-vs-fullBurstEnter identity + HP-status-gate collapse + lastBullet trigger identity)

> Slug disambiguation: `mary` is the BASE unit (Mary, SG/Water/Supporter/Burst I, cd 40s,
> ammo 9, hitsPerShot 10, released 2022-11-04). The variant `mary-bay-goddess` (SR/Water,
> aka "mbg") is a DIFFERENT unit. lint-slug-disambiguation flags every bare "Mary"/"mary"
> token for this pair (the base unit has no approved nickname), so the confirmation is
> recorded here and in the test/override headers — this run is about the SG healer only.

## Kit summary

Mary is a Water SG Supporter and a PURE sustain kit — zero damage lines, zero weapon-state
modifiers, zero offensive stats. Her value is entirely cross-unit: her Skill 1 ("CPR") heals
the single most-injured ally for 8.4% of her final Max HP every time she empties her 9-shell
magazine; her Skill 2 ("Nursing") raises all incoming healing 23.78% for 15s whenever the team
enters Full Burst; her Burst ("Angel in White") heals the whole team for 39.6% of her final
Max HP and, while the team is above 50% HP, grants all allies DEF ▲19.8% for 10s. In the v1
scope (no HP pool, no incoming damage, immortal units) the modeled substance of this kit is:
two recovery-EVENT channels (per-magazine and per-burst-cast) that fire teammates' `recovery`
triggers (crown-class "when recovery takes effect" consumers), plus an offensively inert
defPct buff kept for kit completeness. Heal MAGNITUDES are not numerically modeled. Her SG
weapon is untouched by the kit.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1 "CPR": last bullet hits → 1 lowest-HP% ally recovers 8.4% of caster final Max HP | FAITHFUL (event cadence) | `lastBullet` → `alliesLowestHp{count:1}` → `heal{ticks:1}`. Per emptied magazine (ammo 9), anchored to her ammoAfter-0 shot frames (pinned); shotFired (9× over-fire) and burstCast counterfactuals both diverge. "Lowest HP%" is indeterminate without an HP pool → engine's documented leftmost stand-in; fixture puts crown leftmost so the channel is observable. The 8.4% magnitude is unmodeled (no HP pool) — the recovery EVENT is the modeled substance (helm H2 / flora / marciana / sakura-suzuhara healer lineage) |
| S2 "Nursing": entering Full Burst → all allies Incoming healing ▲23.78% for 15s | DOCUMENTED_GAP | No `incomingHealingPct` StatKey exists and heals carry no HP amount to amplify — doubly inert, damage-neutral (flora S1 / marciana S1 / sakura-suzuhara L2 precedent). Verbatim in `unmodeled.skill2`; pinned by absence on BOTH channels: zero skill2-slot buffApply AND zero recovery firings on any Full Burst start frame (a smuggled fullBurstEnter heal would show there) |
| Burst line 1: all allies recover 39.6% of caster final Max HP | FAITHFUL (event cadence) | `burstCast` (HER cast — never `fullBurstEnter`: pinned two ways — timing arm (heal fires on the cast frame, strictly before the FB window opens) and the two-B1 contention arm vs liter (heals on liter-opened rotations under the counterfactual, none under shipped)). Target allies (self-inclusive), single instant tick (no duration/interval clause in the prose). 39.6% magnitude unmodeled (no HP pool) |
| Burst line 2: above 50% HP → all allies DEF ▲19.8% for 10s | FAITHFUL (gate collapsed) | The HP gate is a DERIVED-DETERMINISTIC collapse: v1 models no HP pool and no incoming damage, so every unit's HP fraction is permanently 100% > 50% — the line is unconditional on burstCast (flora stage-enter-proxy argument shape). Plain target-scaled `defPct 19.8 / 10s` (the kit carries NO "of the skill user's DEF" qualifier — unlike marciana's caster-scaled line, no approximation caveat). defPct is declared inert in v1 → pinned damage-neutral (byte-identical totals with the line stripped). Caster-vs-target HP reading is unobservable in v1 — both collapse identically while nobody takes damage |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all
  four lines — same dispositions, same trigger identities (lastBullet per-magazine, burstCast
  own-cast), same UNMODELED ruling for S2, same scope-trivial read of the 50%-HP gate.
  Reviewer warnings adopted: the B1-contention arm (liter as competing Burst I) as the live
  burstCast-vs-fullBurstEnter discriminator, and the S2 negative pin strengthened in S2c to
  cover the heal-smuggling channel (no recovery event on any FB-start frame), not just the
  stat channel.
- **S5 (claude-opus-5, blind tests):** `leakDetected:null`. Adapted copy (two mechanical
  fixes documented in its header: harness import path; `srcSlot` string-vs-index type error)
  runs **13 tests — 11 passed / 2 skipped / 0 failed** against the driver override. The 2
  skips are the blind author's OWN documented gaps (heal magnitudes 8.4%/39.6% have no HP
  pool to be observable in; incoming-healing 23.78% has no StatKey) — the same lines the
  driver holds UNMODELED. Live assertions include the shotFired-trigger discrimination, the
  noDef==base / defToAtk≠base inertness pair, and whole-unit no-offensive-stat/no-skill-
  damage guards.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Behaviorally IDENTICAL on all
  four lines (skill1 lastBullet→alliesLowestHp1→heal; burst burstCast→allies→heal; burst
  burstCast→allies→defPct 19.8/10s; S2 unmodeled). Cosmetic differences only: a skill2 husk
  block with an EMPTY effects array ("to keep the fullBurstEnter trigger auditable") where
  the driver leaves `skill2: []` + verbatim unmodeled (empty effects = no behavior either
  way), and heal-magnitude clause fragments listed in unmodeled where the driver documents
  them in caveats.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**, `gotchas:[]`,
  `discriminationOk:true`. Ruled all four lines FAITHFUL or DOCUMENTED_GAP with structural
  reasons; called the convergence "mechanical" and credited the contention arm for settling
  the burstCast-vs-fullBurstEnter identity S2b flagged as live. Recorded the same-model
  residual: leftmost stand-in + magazine-economy cadence are convention/datamine-dependent,
  and the 50%-HP gate collapse is valid only while the scope takes no damage.

## Residual flags (owner spot-checks)

1. **alliesLowestHp → leftmost stand-in** — the kit's "lowest HP percentage" target is
   indeterminate at scope (no HP pool). The stand-in choice moves no damage (the heal has no
   modeled amount), but if an HP pool is ever added, S1's target selection becomes live and
   needs a real lowest-HP-fraction resolution.
2. **lastBullet cadence is datamine-dependent** — ammo 9 / reloadFrames 111 are known-
   unreliable datamine fields (marciana precedent, same SG chassis). Any teammate with an
   on-recovery damage consumer inherits a wrong magazine economy one-for-one through S1's
   recovery channel.
3. **50%-HP gate collapse** — valid only because the scope-lock team never takes damage. In
   any future model with incoming damage, the burst's DEF line needs a real HP-fraction gate
   (and the caster-vs-target reading of "above 50% HP" becomes a live question).
