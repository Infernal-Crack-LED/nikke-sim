# Manual review — sin-swift-bunny (Sin: Swift Bunny)

**Gauntlet date:** 2026-10-02
**Verdict:** GO (two judges, same-family)
**Faithfulness:** 1.0 (claude-fable-5-1, binding) · 1.0 (claude-fable-5, second judge)
**Tier:** 2 (self-mode system with mode-gated true damage; round-count per-shot buffs gated off a burst weapon
swap; mode-branched burst hit)

> Slug disambiguation: `sin-swift-bunny` (Sin: Swift Bunny — SR / Attacker / Water / Missilis / Burst III,
> released 2026-09-24) is a VARIANT of the base unit `sin` (AR / Electric). Entirely different kit.
>
> Routing for this run (owner, 2026-10-02: no Qwen or Kimi access): driver Claude Opus 5.5; S2b
> `claude-fable-5` + `claude-fable-5-1`; S5/S6 `claude-opus-5`; S7 `claude-fable-5-1` + `claude-fable-5`.
> **Every reviewer is a Claude model**, so this GO guards against one-off misreads but not against a misread
> every Claude model shares — spot-check the lines listed at the end.

## Kit summary

A Water sniper with a permanent +15.35% ATK whose every normal full-charge shot doubles its normal-attack
multiplier and adds +52.12% Charge Damage. She fights in one of two Bunny Modes: **Stance** (+35.14% Critical
Rate, +75.12% Critical Damage) or **Engage** (her normal shots, including Swift Piercing, deal true damage).
Using her burst swaps her to **Swift Piercing** for 5 seconds — a fixed 0.5-second charge, 73.22% of final
ATK, 300% full charge — gives her +110% ATK for 5 seconds, and hits all enemies for 516.6% plus a mode hit:
958.9% in Stance or 854.6% true damage in Engage.

## How the sim models Bunny Mode

As for Guilty: Mighty Bunny: a **selection** (`modes: ['Stance','Engage']`, Stance by default), because the
switch needs a held charge the sim never performs. On a team with Guilty: Mighty Bunny
(`guilty-mighty-bunny`), select the same mode for both. Without a True Damage ▲ teammate, Stance deals more
damage (829M vs 650M in the control comp).

## Line-by-line

| Line                                                                                                              | Disposition     | Notes                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: battle start → self ATK ▲ 15.35%, continuous                                                                  | FAITHFUL        | `battleStart`, self, permanent (S1)                                                                                                                                                                                        |
| S1: during Full Charge, not in Swift Piercing → Normal Attack Multiplier ▲ 100%, Charge Damage ▲ 52.12% (1 round) | FAITHFUL ⚑      | `fullCharge` + `swapGate: 'unswapped'`, `durationShots: 1` on the repo's next-round convention. Steady fire: every base shot ×2 / +0.5212 charge. ⚑ One boundary shot per burst shifts across the Swift Piercing edge (S2) |
| S1: Bunny Mode toggle (Full Charge held ≥1 s)                                                                     | GAP (unmodeled) | Static mode selection, Stance default                                                                                                                                                                                      |
| S1: allies in the opposite Bunny Mode follow her switch (×2 lines)                                                | GAP (unmodeled) | Recorded verbatim                                                                                                                                                                                                          |
| S2 Engage: normal attacks deal true damage                                                                        | FAITHFUL        | `trueNormalsModes: ['Engage']` — new engine primitive (S4)                                                                                                                                                                 |
| S2 Engage: Swift Piercing deals true damage                                                                       | FAITHFUL        | The same field covers swap shots (S4)                                                                                                                                                                                      |
| S2 Stance: Critical Rate ▲ 35.14%, Critical Damage ▲ 75.12%                                                       | FAITHFUL        | Passive self, Stance only (S3)                                                                                                                                                                                             |
| S2: on using Burst → Swift Piercing — 0.5 s fixed charge, 73.22%, 300%, 5 sec                                     | FAITHFUL ⚑      | Keyed to her own burst cast, not Full Burst entry (helm's rotations do not swap her); pulls 30 frames apart (S5). ⚑ shot economy (swap states skip the SR release delay; the kit gives no magazine)                        |
| Burst: self ATK ▲ 110% for 5 sec                                                                                  | FAITHFUL        | Listed first, so all three burst hits use it (S6)                                                                                                                                                                          |
| Burst: all enemies 516.6% as Burst Skill damage                                                                   | FAITHFUL        | Cast-instant (lands before Full Burst), tagged `allEnemies`                                                                                                                                                                |
| Burst: Stance 958.9% additional damage / Engage 854.6% true damage                                                | FAITHFUL        | Mode-gated; exactly two burst hits per cast; tagged `allEnemies` ("Affects the same targets" inherits the clause — owner ruling 2026-08-10)                                                                                |

The two "Function:" header lines are recorded in `unmodeled` as wrappers whose effects are all modeled.

## Corroboration

- **S2b (fable-5, fable-5-1):** no leak; every line matched. One reviewer would tag the mode hits
  `allEnemies` — adopted, per the existing ruling. One assumed the true-flavor field would not reach swap
  shots; in this engine it does.
- **S5 (opus-5, blind test):** no leak. With its one-line `onEvent` wiring fixed it passes **20 / 20** against
  the shipped override (5 self-declared skips).
- **S6 (opus-5, blind override):** no leak; block-equivalent, plus a kit-silent Swift Piercing magazine of 10
  (left as ⚑).
- **S7 judges:** GO 1.0 / 1.0. Two low findings, both ⚑ caveats: the boundary-shot shift, and the Swift
  Piercing shot economy.

## Owner spot-check

1. Is a static mode selection with Stance as default the right model of how she is played?
2. "During Full Charge … for 1 round(s)": does the buff land on the charged shot itself (the sim lands it on
   the next shot, which only matters for one shot each side of every Swift Piercing window)?
3. Does Swift Piercing start only on her own burst (not on a teammate's Full Burst)?
