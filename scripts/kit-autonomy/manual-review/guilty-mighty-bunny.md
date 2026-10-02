# Manual review — guilty-mighty-bunny (Guilty: Mighty Bunny)

**Gauntlet date:** 2026-10-02
**Verdict:** GO (two judges, same-family)
**Faithfulness:** 1.0 (claude-fable-5-1, binding) · 1.0 (claude-fable-5, second judge)
**Tier:** 2 (self-mode system with mode-gated true damage; round-count burst buff; uses-bounded burst weapon swap)

> Slug disambiguation: `guilty-mighty-bunny` (Guilty: Mighty Bunny — SR / Attacker / Water / Missilis /
> Burst III, released 2026-09-17) is a VARIANT of the base unit `guilty` (SG / Wind). Entirely different kit.
>
> Routing for this run (owner, 2026-10-02: no Qwen or Kimi access): driver Claude Opus 5.5; S2b
> `claude-fable-5` + `claude-fable-5-1`; S5/S6 `claude-opus-5`; S7 `claude-fable-5-1` + `claude-fable-5`.
> **Every reviewer is a Claude model**, so this GO guards against one-off misreads but not against a misread
> every Claude model shares — spot-check the lines listed at the end.

## Kit summary

A Water sniper with a permanent +20.1% ATK who fights in one of two Bunny Modes. She opens in **Stance**
(+20.45% Attack Damage, +40% Charge Damage, and a 450.89% extra hit on every full-charge shot). Holding a full
charge for a second flips her to **Engage**: her normal shots and her burst shot deal true damage and the
extra hit becomes a 370.08% true-damage hit. Teammates in a Bunny Mode follow her switch. Her burst swaps to
**Mighty Stomp** for exactly one round — a fixed 1.5-second charge, 101.3% of final ATK, 250% full charge —
with +1400% Charge Damage on that round and +77.35% Attack Damage for 10 seconds.

## How the sim models Bunny Mode

The mode is a **selection** (`modes: ['Stance','Engage']`, Stance by default) rather than a live toggle: the
sim fires the moment a charge is full and never holds, so the in-game switch can never happen on its own.
Picking Engage models a player who switches once at the start and stays there. On a team with Sin: Swift
Bunny (`sin-swift-bunny`), select the same mode for both — in game they always share one.

Without a True Damage ▲ teammate, Stance deals more damage (874M vs 702M in the control comp). Engage's true
damage matters only beside a True Damage ▲ buffer (clay, emma-tactical-upgrade, eunhwa-tactical-upgrade,
flora, frima, takina).

## Line-by-line

| Line                                                                        | Disposition     | Notes                                                                                                                                                                |
| --------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: battle start → self ATK ▲ 20.1%, continuous                             | FAITHFUL        | `battleStart`, self, permanent (G1)                                                                                                                                  |
| S1: Bunny Mode toggle (Full Charge held ≥1 s outside Mighty Stomp)          | GAP (unmodeled) | Static mode selection, Stance default; the toggle and its ~1 s hold cost are not simulated                                                                           |
| S1: allies in the opposite Bunny Mode follow her switch (×2 lines)          | GAP (unmodeled) | Recorded verbatim; select the same mode for both bunnies                                                                                                             |
| S2 Engage: normal attacks deal true damage                                  | FAITHFUL        | `trueNormalsModes: ['Engage']` — new engine primitive (G5)                                                                                                           |
| S2 Engage: Mighty Stomp deals true damage                                   | FAITHFUL        | The same field covers swap shots (engine reads swap flavor OR the unit's) (G5)                                                                                       |
| S2 Engage: on a full-charge hit, 370.08% of final ATK as true damage        | FAITHFUL        | `fullCharge` rider, true flavor, crits, never cores; fires on the Stomp too (G3, G4)                                                                                 |
| S2 Stance: Attack Damage ▲ 20.45%, Charge Damage ▲ 40%                      | FAITHFUL        | Passive self buffs in Stance only (G2)                                                                                                                               |
| S2 Stance: on a full-charge hit, 450.89% of final ATK as additional damage  | FAITHFUL        | `fullCharge` rider, Stance only; fires on the Stomp too (G2, G3)                                                                                                     |
| Burst: Mighty Stomp — 1.5 s fixed charge, 101.3%, 250% full charge, 1 round | FAITHFUL ⚑      | `burstCast` swap, `maxShots: 1`; exactly one Stomp per cast, inside Full Burst (+50%) (G6). ⚑ magazine after the Stomp; ⚑ Stomp treated as an SR shot for core/range |
| Burst: Charge Damage ▲ 1400% for 1 round                                    | FAITHFUL        | `durationShots: 1` granted at the cast — rides the Stomp only (charge ×16.9 vs ×2.9 after) (G7)                                                                      |
| Burst: Attack Damage ▲ 77.35% for 10 sec                                    | FAITHFUL        | Self, 600 frames per cast (G8)                                                                                                                                       |

The two "Function:" header lines are recorded in `unmodeled` as wrappers whose effects are all modeled.

## Corroboration

- **S2b (fable-5, fable-5-1):** no leak; every line and disposition matched the driver's spec. Both proposed
  carrying the Stomp's true flavor on a mode-gated swap copy — behaviour-identical to the shipped encoding.
- **S5 (opus-5, blind test):** no leak. Verbatim it captures no events (it wires `onEvent` outside `cfg`, a
  harness mistake); with that one line fixed it passes **11 / 11** against the shipped override (3 self-declared
  skips).
- **S6 (opus-5, blind override):** no leak; block-equivalent, including the single unflagged swap block.
- **S7 judges:** GO 1.0 / 1.0. Two low findings, both now ⚑ caveats: the Stomp's magazine handback, and the
  Stomp cored/ranged as an SR shot.
- **Process note:** the first batch of blind roles ran from inside the repo and could see recent commit
  subjects; it was discarded, the bridge fixed (`dispatch-claude.sh` now runs blind roles from an empty temp
  dir), and every blind role re-run clean.

## Owner spot-check

1. Is a static mode selection with Stance as default the right model of how she is played?
2. Do both full-charge riders really fire on the Mighty Stomp shot?
3. "Duration: 1 rounds" read as exactly one Stomp, with the +1400% on that one round only.
