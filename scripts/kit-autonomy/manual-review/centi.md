# Manual review — centi (Centi (Treasure))

**Gauntlet date:** 2026-08-18
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1 (straightforward burst nuke + enemy DEF debuff; no scoped-buff, round-count, status-gate, or meta-defining mechanic)

> Slug disambiguation: `centi` IS the Treasure variant (data `treasure:true`, name "Centi (Treasure)",
> RL/Defender/Iron/Burst II). No other unit shares this slug.

## Kit summary

Centi (Treasure) is an Iron-element RL Defender on Burst II with a 20s burst cooldown. Her kit is
primarily defensive: she creates team-wide shields (7% of her Max HP for 5s) on Skill 2's cooldown,
reduces that cooldown by 9.16% per landed full charge, and heals allies for 9.7% of her Max HP when
her shield is destroyed. Her only offensive surfaces are her burst (145.46% of final ATK to 5 lowest-HP
enemies + DEF ▼ 14.54% for 10s) and a self Max HP buff (+5% for 10s). In the v1 DPS sim, only the
burst damage and DEF debuff are load-bearing — every other line is offensively inert (shields, heals,
CD reduction of a shield skill, HP buff with no HP→ATK conversion).

## Line-by-line

| Line                                             | Disposition | Notes                                                                                                      |
| ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| S1: battle start → force Skill 2                 | UNMODELED   | Shield creation at t=0; offensively inert (no DPS impact from shields in v1)                               |
| S1: Full Charge → Skill 2 CD ▼ 9.16%             | UNMODELED   | CD reduction of an offensively inert skill (S2 creates shields); no DPS channel                            |
| S1: shield destroyed → heal 9.7% Max HP (allies) | UNMODELED   | No shield-break model in v1; no shield entity to destroy                                                   |
| S2: Shield 7% Max HP, 5s, all allies             | UNMODELED   | Shield creation; offensively inert in v1 (no HP pool modeled, no shielded consumer on centi's own kit)     |
| Burst: 145.46% ATK to 5 lowest HP enemies        | FAITHFUL    | burstCast flatDamage 145.46; 5-target collapses to single boss; UNTAGGED (not an amp literal)              |
| Burst: DEF ▼ 14.54% for 10s                      | FAITHFUL    | defPct -14.54 on enemy channel (bossDefNow scales cfg.bossDef; mica precedent); ~50% uptime (20s CD / 10s) |
| Burst: self Max HP ▲ 5% for 10s                  | UNMODELED   | No HP→ATK conversion for centi; would strengthen S2 shield basis but shield itself is inert                |

## Cross-family corroboration

| Stage | Model          | Finding                                                                                                                                         |
| ----- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| S2b   | claude-fable-5 | Converged on burst nuke + DEF debuff; flagged shield/CD as tandem-load-bearing (driver: inert at scope)                                         |
| S5    | claude-opus-5  | 8/15 blind tests green vs driver override; failures are expected (shield/MaxHP UNMODELED, fixture vacuity)                                      |
| S6    | claude-opus-5  | Modeled shield + CD reduction (driver: correctly UNMODELED); DEF debuff said UNMODELED (WRONG — engine supports defPct on enemy via bossDefNow) |
| S7    | kimi-code/k3   | GO, faithfulness 1.0 — all lines accounted, no REAL-GOTCHA, discrimination OK                                                                   |

## Residual flags

- Shield/heal/CD-reduction lines are UNMODELED (offensively inert at scope lock). In a team with
  shield-synergy consumers (requiresShielded / 'shielded' trigger), the shield creation would become
  load-bearing and should be encoded then.
- Self Max HP buff is UNMODELED (no HP→ATK conversion for centi).
- S6 blind model missed the defPct-on-enemy channel (engine supports it since 2026-08-10 via
  bossDefNow; mica precedent). The S7 judge correctly ruled for the driver's encoding.
