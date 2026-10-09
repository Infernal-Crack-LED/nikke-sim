# Manual review — belorta-pumpkin-witch (Belorta: Pumpkin Witch)

**Gauntlet date:** 2026-10-09
**Verdict:** GO (two judges, same-family)
**Faithfulness:** 1.0 (claude-fable-5-1, binding) · 1.0 (claude-fable-5, second judge)
**Tier:** 2 (positional "ally to the right" scope; a self-status gate; Full Burst entry vs her own burst cast)

> Slug disambiguation: `belorta-pumpkin-witch` (Belorta: Pumpkin Witch, aka bpw — RL / Supporter / Water /
> Tetra / Burst II, cd 40s, released 2026-10-08) is a VARIANT of the base unit `belorta` (RL / Electric
> Attacker). Entirely different kit.
>
> Routing for this run (owner, 2026-10-02: no Qwen or Kimi access): driver Claude Opus 5.5; S2b
> `claude-fable-5` + `claude-fable-5-1`; S5/S6 `claude-opus-5`; S7 `claude-fable-5-1` + `claude-fable-5`;
> engine code review `claude-fable-5-1`. **Every reviewer is a Claude model**, so this GO guards against
> one-off misreads but not against a misread every Claude model shares — spot-check the lines listed at the end.

## Kit summary

A Water rocket-launcher supporter whose whole kit feeds ONE teammate: the ally directly to her right. On every
Full Burst entry she puts on a Ghost Costume for 10 seconds (untargetable by single-target attacks, lost on a
direct hit), gains Max HP +15.84% for 10 seconds, and gives the right-hand ally ATK +44.88% of her ATK for 10
seconds. While the costume is on, each full-charge rocket that lands makes the boss take 10.56% more damage
for 10 seconds. Every full-charge shot also gives the right-hand ally Sustained Damage +19.97% for 5 seconds.
Her burst gives the right-hand ally ATK +47.52% of her ATK and Sustained Damage +27.23%, both for 10 seconds.

## New engine target: `adjacentAlly`

No existing target could say "the ally to the right" (`selfAndAdjacent` always includes herself and both
sides). The new `{kind:'adjacentAlly', side:'right'}` picks the ONE unit in the next slot. From the rightmost
slot there is no such ally, and those lines apply to nobody. Board-inert before her override landed; code
review CLEAN.

## Line-by-line

| Line                                                                                   | Disposition     | Notes                                                                                                                           |
| -------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S1: entering Full Burst → self: Ghost Costume, 10 sec                                  | FAITHFUL        | `selfStatus 'Ghost Costume'` 10s on every Full Burst entry — the state Skill 2 checks (P1)                                      |
| S1: Ghost Costume — untargetable by single-target attacks                              | GAP (unmodeled) | No boss targeting / incoming damage in v1                                                                                       |
| S1: Ghost Costume — removed upon taking a direct hit                                   | GAP ⚑           | Never fires in v1, so the costume always lasts 10s — an upper bound on Ghostly Prank's window                                   |
| S1: Prank Preparation — Max HP ▲ 15.84% for 10 sec (self)                              | FAITHFUL        | `targetMaxHpPct` self, 10s; moves no damage (she has no HP-scaling ATK line) (P2)                                               |
| S1: entering Full Burst → ally to the right: ATK ▲ 44.88% of her ATK, 10 sec           | FAITHFUL ⚑      | `fullBurstEnter` — fires on EVERY Full Burst, including ones another Burst II unit cast; `adjacentAlly` right (P3)              |
| S2: landing a Full Charge in Ghost Costume → boss: Damage Taken ▲ 10.56%, 10 sec       | FAITHFUL        | `fullCharge` + `requiresSelfStatus 'Ghost Costume'`, enemy debuff; only on her charges in the 10s after a Full Burst entry (P4) |
| S2: performing a Full Charge → ally to the right: Sustained Damage ▲ 19.97%, 5 sec     | FAITHFUL ⚑      | Every full charge, NOT costume-gated (a separate ■ header) (P5)                                                                 |
| Burst: ally to the right — ATK ▲ 47.52% of her ATK + Sustained Damage ▲ 27.23%, 10 sec | FAITHFUL ⚑      | `burstCast` — her own cast only, on the cast frame (P6)                                                                         |

⚑ on the right-ally lines = the rightmost-slot reading (nobody). Sustained Damage reaches only the holder's
sustained-flavored damage, so it moves nothing on a right-hand ally without any.

## Corroboration

- **S2b (fable-5, fable-5-1):** no leak; both spec tables and load-bearing sets (7 lines) match. One flagged
  that an `fbGate:'inFb'` proxy would look identical to the costume gate without a Full Burst extender — the
  override uses the real status, pinned structurally.
- **S5 (opus-5, blind test):** no leak. With its one-line `onEvent` wiring fixed it passes **11 / 11**
  non-burst assertions; the 3 burst assertions are RED because its fixture (`controlComp`) seats crown, also
  Burst II with a 20s cooldown, ahead of her, so she never casts. Its own probe that lets her cast once is
  green: both burst grants land on the ally to her right.
- **S6 (opus-5, blind override):** no leak; **block-for-block identical** to the shipped override.
- **S7 judges:** GO 1.0 / 1.0, no gotchas.

## Owner spot-check

1. Do the Skill 1 lines fire on every Full Burst (including ones where she did not cast), while the burst
   lines fire only on her own cast?
2. From the rightmost slot, does "the ally to the right" really give nobody (no wrap-around to slot 1)?
3. Is a direct hit the only thing that ends Ghost Costume early? The sim always gives it the full 10 seconds.
