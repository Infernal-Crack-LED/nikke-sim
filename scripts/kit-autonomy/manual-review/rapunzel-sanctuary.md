# Manual review — rapunzel-sanctuary (Rapunzel: Sanctuary)

**Gauntlet date:** 2026-10-29
**Verdict:** GO (two judges, same-family)
**Faithfulness:** 1.0 (claude-fable-5-1, binding) · 1.0 (claude-fable-5, second judge)
**Tier:** 2 (two Full Burst entry grants vs one burst-cast grant; a target scoped to allies "in the Into the
Fray state"; a charge-speed immunity)

> Slug: `rapunzel-sanctuary` (Rapunzel: Sanctuary — RL / Supporter / Fire / Pilgrim / Burst II, cd 40s). Not
> the base `rapunzel` (RL / Iron) nor `rapunzel-pure-grace` (SR / Iron).
>
> Routing for this run (owner, 2026-10-02: no Qwen or Kimi access): driver Claude Opus 5.5; S2b
> `claude-fable-5` + `claude-fable-5-1`; S5/S6 `claude-opus-5`; S7 `claude-fable-5-1` + `claude-fable-5`;
> engine code review `claude-fable-5-1`. **Every reviewer is a Claude model**, so this GO guards against
> one-off misreads but not against a misread every Claude model shares — spot-check the lines listed at the
> end.

## Kit summary

A Fire rocket-launcher supporter. Every full-charge shot heals the whole team (3.9% of her max HP) and adds
a 220.7%-of-ATK hit on the boss. Whenever a Full Burst starts, she gives herself — and every ally currently
in an "Into the Fray" mode (Marian: Queen and Scarlet: Goddeath have those modes) — Attack Damage +27.45%
and ATK +29.17% of her ATK for 10 seconds. Her burst gives the whole team ATK +34.84% of her ATK for 10
seconds. She is immune to charge-speed buffs and debuffs. Holding a full charge for a second gives a team
shield and a DEF buff, and if three or more allies are down her burst revives them instead — neither happens
in the sim.

## Engine change

New target `alliesInStatus` (commit `535abade`, review fix `a2f5bcfe`): "self and all allies in the <Name>
state" — allies whose named self status starts with the prefix, plus herself. Opt-in; regression output is
byte-identical with and without it. Code review (claude-fable-5-1): FIX-BEFORE-MERGE → fixed (a validator
warning when no override produces the prefix; a ranks-page guard).

**Open dependency:** no shipped override puts a unit into an "Into the Fray: …" status yet (marian-queen's
burst mode is named "Penetrant Wish", her battle-start mode has no status; scarlet-goddeath has no override).
Until those overrides emit the statuses, her two Full Burst grants reach only her
(docs/engine-modeling-gaps.md §24 has the exact edits).

## Line-by-line

| Line                                                                                               | Disposition | Notes                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| S1: Full Charge attack → all allies: heal 3.9% of her max HP                                       | FAITHFUL    | One recovery event per shot to every ally (feeds on-heal allies like Crown); the HP amount is not modeled (L1) |
| S1: entering Full Burst → self + Into the Fray allies: Attack Damage ▲ 27.45%, 10s                 | FAITHFUL ⚑  | Every Full Burst, including ones she did not cast in; allies only via an "Into the Fray: …" status (L2)        |
| S1: using Nanoparticle Injection → self: burst cooldown ▲ 40s; DEF ▲ 10%                           | UNMODELED   | Only after her burst revives allies, which never happens in the sim (L3)                                       |
| S1: at Full Charge → self: immune to charge speed increase / decrease                              | FAITHFUL ⚑  | `statImmunities` from the start of the fight (in-game: from her first full-charge shot, about 1s in) (L4)      |
| S2: Full Charge held ≥ 1s → shared shield 7.39% of her max HP                                      | UNMODELED ⚑ | The sim releases at full charge and never holds (L5)                                                           |
| S2: Full Charge held ≥ 1s → all allies: Goddess Blessing DEF ▲ 42.24% of her DEF, 10s              | UNMODELED ⚑ | Same trigger; DEF does not change damage (L6)                                                                  |
| S2: entering Full Burst → self + Into the Fray allies: ATK ▲ 29.17% of her ATK, 10s                | FAITHFUL ⚑  | A flat ATK add from her ATK; same targets and timing as the S1 Full Burst line (L7)                            |
| S2: Full Charge attack → enemy: 220.7% of final ATK                                                | FAITHFUL    | One hit per shot, skill damage, can crit, not a core hit, takes the Full Burst +50% inside Full Burst (L8)     |
| Burst (≤ 2 allies down, or in Nanoparticle Consumption) → all allies: ATK ▲ 34.84% of her ATK, 10s | FAITHFUL    | On her own burst cast, before the Full Burst it opens; one grant per ally (L9/L11)                             |
| Burst (≥ 3 allies down): revive 96% HP, ATK ▲ 101.37% / DEF ▲ 221.76%, once per battle             | UNMODELED   | Nobody is ever down in the sim (L10)                                                                           |

## Corroboration

- **S2b (fable-5, fable-5-1):** no leak; both match the driver's spec on every line, including the
  "Into the Fray" target and the burst keyed to her own cast.
- **S5 (opus-5, blind test):** no leak. Its harness wiring is broken (`opts.onEvent`); with only that fixed
  it passes **7 / 10** (3 skips) against the shipped override. The 3 failures: two expect the held-charge
  shield and DEF lines to fire on every full-charge shot (the blind writer's proxy, rejected by both S2b
  reviewers and both judges), and one is a `noFb` counterfactual the engine ignores by design.
- **S6 (opus-5, blind override):** no leak; identical on every damage line. It differs only on the two
  held-charge lines (put on every full-charge shot) and a redundant `crit: true`.
- **S7 judges:** GO 1.0 / 1.0. Two documented notes (fable-5-1): the Into the Fray ally half is dormant
  until the other overrides emit the status (medium); the "never holds a charge" premise is unchecked
  against footage (low).

## Board

No recording yet and no graded comp includes her, so there is no board reading. `scripts/regression.ts`
output is byte-identical before and after the engine change and her override (its 7 snapshot drifts are
pre-existing on this branch's base — the sync dropped `red-hood`).

## Owner spot-check

1. With Marian: Queen or Scarlet: Goddeath on the team, do they get her Attack Damage / ATK buff icons at
   every Full Burst? (The sim gives them nothing until their overrides carry an "Into the Fray" status — §24.)
2. Under auto, does she ever hold a full charge for a second (shield icon / Goddess Blessing icon between
   shots)? The sim assumes she never does.
3. Do the Full Burst buffs appear at every Full Burst, including ones where another Burst II unit cast —
   while the team ATK buff appears only on her own burst?
4. Is the 220.7% extra hit ever a red CORE HIT? The sim treats it as a plain hit.
