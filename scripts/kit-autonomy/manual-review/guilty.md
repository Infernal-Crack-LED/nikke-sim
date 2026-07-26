# Manual review — guilty (Guilty)

**Gauntlet date:** 2026-07-25
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate on burst riders)

## Kit summary

Guilty is a Wind-element shotgun Attacker on Burst II. Every 6th normal attack grants her a
self-only stack of "Mind If I Borrow This?", duplicating 8.81% of the highest-ATK ally's ATK
onto herself (caps at 5 stacks, 10s window). Every 12th normal attack she gives all Wind Code
allies a 10s 4.13% ATK buff and raises the stack count of stackable buffs by one (UNMODELED —
no engine primitive). Her burst strikes the highest-DEF enemy for 284.32% final ATK; if her
borrow stacks are maxed, the target also takes DEF ▼20.25%/5s and a further 277.71% final ATK.

## Line-by-line

| Line | Disposition | Notes |
|------|-------------|-------|
| S1: highestAllyAtkPct 8.81%, ×5, 10s | FAITHFUL | Engine emits as casterAtkPct with flat ATK value; key embeds 8.81 |
| S2: stack-count boost +1 | UNMODELED | No engine primitive for cross-buff stack amplifier; documented |
| S2: atkPct 4.13%, 10s, Wind allies | FAITHFUL | Targets Wind-only; fires after reload (cumulative counter) |
| Burst: 284.32% Burst Skill damage | FAITHFUL | burstCast trigger, FB-exempt, once per cast |
| Burst: DEF ▼20.25%/5s | FAITHFUL (inert) | Engine applies but emits no event; <0.1% effect at bossDef=140 |
| Burst: 277.71% additional damage | FAITHFUL | burstCast trigger; max-stack gate NOT modeled (always-on) |

## Cross-family corroboration

- **S2b (claude-fable-5):** CONVERGED on G1/G3/G4/G6; PARTIAL on G2 (UNMODELED, no primitive)
  and G5 (recognized-INERT at scope lock).
- **S5 (claude-opus-5, blind test):** 19/23 pass, 2 skip, 2 FAIL. Both failures are the
  unmodeled max-stack gate on burst riders — a documented limitation, not a REAL-GOTCHA.
- **S6 (claude-opus-5, blind override):** VOID — model leaked by reading the driver's override
  file; self-reported. Discarded.
- **S7 (claude-opus-5, judge):** GO, faithfulness 1.0. One gotcha (ENGINE/LOW): the always-on
  burst riders over-credit the first ~2 casts (not just the first, as the caveat states).
  Judge asks to tighten the caveat wording.

## Residual flags for owner

1. **Max-stack gate bound:** The override caveat says "the very first burst" is over-credited,
   but the ramp arithmetic (~30s to cap vs ~20s cast cadence) puts the over-credit on the first
   TWO casts (~1% of 180s total). Tighten caveat wording.
2. **DEF ▼ verification gap:** The engine emits no buffApply event for enemy debuffs, so the
   driver's "<0.1% shift" assertion is green whether the engine applies the debuff tinily or
   ignores enemy-scoped defPct entirely. Confirm the engine consumes it.
3. **Stale note prose:** The override's MODEL section and ⚑4 still describe the superseded
   casterAtkPct proxy (replaced by highestAllyAtkPct on 2026-07-21). The shipped JSON is
   correct; the prose is stale.
4. **Solo calibration scope:** The 0.981 solo real/sim validates S1/S2 and normal-attack
   magnitude ONLY — a lone B2 casts no burst, so nothing in that calibration touches the
   284.32%/277.71% blocks or the gate gap.
