# Manual review — sky (Sky)

**Gauntlet date:** 2026-11-20
**Verdict:** GO (two judges, same-family)
**Faithfulness:** 1.0 (claude-fable-5-1, binding) · 1.0 (claude-fable-5, second judge)
**Tier:** 2 (a hold-charge trigger the sim cannot perform; a "status removed" trigger; a self-status gate;
Full Burst entry vs her own burst cast in the same kit)

> Slug: `sky` (Sky — SR / Supporter / Iron / Elysion / Burst I, cd 40s). No other unit shares the name.
>
> Routing for this run (owner, 2026-10-02: no Qwen or Kimi access): driver Claude Opus 5.5; S2b
> `claude-fable-5` + `claude-fable-5-1`; S5/S6 `claude-opus-5`; S7 `claude-fable-5-1` + `claude-fable-5`;
> engine code review `claude-fable-5-1`. **Every reviewer is a Claude model**, so this GO guards against
> one-off misreads but not against a misread every Claude model shares — spot-check the lines listed at the end.

## Kit summary

An Iron sniper supporter built around a tension loop. Holding a full charge for 1 second gives her Pierce and
Pierce Damage +60% for 40 seconds (and, 3 times per battle, a 5-second debuff immunity for the team). Every
Full Burst gives the whole team ATK +20% of her ATK for 10 seconds. Her burst puts the team into High
Tension (Pierce Damage +15% for 35 seconds, up to 3 stacks) and gives herself ATK +50% for 35 seconds.
When High Tension wears off, the team drops into Low Tension (ATK −10% of her ATK for 20 seconds) and she is
stunned for 20 seconds. Her cooldown is 40 seconds and High Tension lasts 35, so the penalty comes every
cycle unless burst cooldown reduction brings her next cast inside the 35 seconds.

## New engine trigger: `selfStatusEnd`

No existing trigger could react to a status wearing off. The new `{kind:'selfStatusEnd', name}` fires when
her own named status window ends; a re-cast before then extends the window, so nothing fires. The simpler
"35 seconds after each cast" stand-in would fire Low Tension after every cast, which is wrong whenever an
ally like dorothy shortens her cooldown enough to re-cast inside 35 seconds. The board was byte-identical
before her override landed; code review CLEAN.

## Hold vs Release (a mode you choose)

The sim fires the moment a charge is full and never holds it, so "Full Charge maintained for 1 or more
seconds" cannot happen on its own. Sky has two modes:

- **Hold (default):** every full charge counts as a hold, so Pierce and Pierce Damage +60% are up from her
  first shot. This is what every blind reviewer chose, and it matches rapunzel-pure-grace's hold-gated line.
- **Release:** the literal reading for a player who never holds. The line never fires and her shots are not
  Pierce-tagged.

## Line-by-line

| Line                                                                                              | Disposition     | Notes                                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: hold Full Charge 1s (not in Defiant Spirit) → all allies: debuff immunity ×1, 5 sec, 3/battle | GAP (unmodeled) | Defensive. Under Hold, its 3 uses run out in the first ~15 seconds, before any Low Tension, so leaving it out changes nothing (K1)                 |
| S1: hold Full Charge 1s → self: Gains Pierce, 40 sec                                              | FAITHFUL ⚑      | Mode Hold: `fullCharge` → `gainPierce` 40s, refreshed every full charge (K2)                                                                       |
| S1: hold Full Charge 1s → self: Pierce Damage ▲ 60%, 40 sec                                       | FAITHFUL ⚑      | Same block, `pierceDamagePct` 60 / 40s; only her Pierce-tagged shots use it (K2)                                                                   |
| S2: entering Full Burst → all allies: ATK ▲ 20% of her ATK, 10 sec                                | FAITHFUL        | `fullBurstEnter`: fires on EVERY Full Burst, including ones she did not cast (K3)                                                                  |
| S2: High Tension removed → all allies: Low Tension, ATK ▼ 10% of her ATK, 20 sec                  | FAITHFUL        | `selfStatusEnd 'High Tension'` + a 20s Low Tension status. Fires only when the window really ends; proven to lower ally damage (K4)                |
| S2: only in Low Tension → self: Low Energy, stunned 20 sec                                        | FAITHFUL ⚑      | Same trigger, gated on her Low Tension status; she fires, charges and reloads nothing for 20 seconds (K5)                                          |
| Burst: all allies: High Tension, Pierce Damage ▲ 15%, 35 sec, stacks to 3                         | FAITHFUL        | `burstCast`; a re-cast inside 35 seconds adds a stack and refreshes it, a cast after it ran out starts again at 1. Reaches Pierce allies only (K6) |
| Burst: self: ATK ▲ 50%, 35 sec                                                                    | FAITHFUL        | `burstCast`, self only (K7)                                                                                                                        |

⚑ = measurement-gated caveat in the override (hold assumption; stun-vs-burst convention).

## Corroboration

- **S2b (fable-5, fable-5-1):** no leak. They agree with every trigger, target and duration. Both encode the
  hold line as "every full charge" (always up). The driver first defaulted to Release and then switched the
  default to match them.
- **S5 (opus-5, blind test):** no leak. Unmodified, it has 3 REDs from a harness wiring slip (it sets `onEvent`
  outside `cfg`, so it records no events). With that one line fixed: **17 green / 1 RED / 3 skipped**. The
  RED assumes she never casts in `controlComp`. She does cast there (18.3s), and the ATK-down it saw is
  exactly that cast + 35s.
- **S6 (opus-5, blind override):** no leak. Block-for-block the same as the shipped override, minus the
  Hold/Release mode gate.
- **S7 judges:** GO 1.0 / 1.0. Two low-severity engine notes. (a) `casterAtkPct` resolves from her static ATK,
  not her final ATK, so her own ATK +50% does not raise the +20% team grant; this applies to every caster-ATK
  buffer in the roster. (b) Low Tension's damage effect was only asserted at the buff level; the spec now
  proves it lowers ally damage.

## Owner spot-check

1. **Hold default.** In real play (and on auto), does Sky actually hold her charge? Is her Pierce buff icon up
   most of the fight? If not, switch the default to Release.
2. **"High Tension is removed".** Does Low Tension come only when High Tension runs out 35 seconds after her
   last cast? A re-cast inside that window should refresh it, not trigger Low Tension.
3. **Low Energy stun.** Can she still use her burst while stunned (the sim says yes)? Does a re-cast end Low
   Tension early (the sim says no, the stun always lasts the full 20 seconds)?
4. **Low Tension scope.** Does the ATK −10% hit every ally, including Sky herself?
