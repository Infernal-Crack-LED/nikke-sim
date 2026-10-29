# Manual review — marian-queen (Marian: Queen)

**Gauntlet date:** 2026-10-29
**Verdict:** GO (two judges, same-family)
**Faithfulness:** 1.0 (claude-fable-5-1, binding) · 1.0 (claude-fable-5, second judge)
**Tier:** 2 (a self-status — Penetrant Wish — splits the Full Burst entry line into two branches; her own
burst cast vs Full Burst entry; a boss status — Open Wounds — gates the core strike)

> Slug: `marian-queen` (Marian: Queen — MG / Attacker / Fire / Pilgrim / Burst III, cd 40s). No base
> `marian` exists in the roster.
>
> Routing for this run (owner, 2026-10-02: no Qwen or Kimi access): driver Claude Opus 5.5; S2b
> `claude-fable-5` + `claude-fable-5-1`; S5/S6 `claude-opus-5`; S7 `claude-fable-5-1` + `claude-fable-5`.
> No engine change. **Every reviewer is a Claude model**, so this GO guards against one-off misreads but
> not against a misread every Claude model shares — spot-check the lines listed at the end.

## Kit summary

A Fire machine-gun attacker. From battle start she throws a volley of seven Dark Matter spears (125.51% of
final ATK each) at the boss every 4 seconds; spear hits put Open Wounds on the boss — Damage Taken +5.05%,
permanent, which the whole team benefits from — and her burst puts Open Wounds on all enemies too. Her burst
reloads her full belt, gives her ATK +78.4% and Attack Damage +78.14% for 10 seconds, deals 1346.4%, and
puts her into Penetrant Wish for 10 seconds: every 2 normal attacks she fires a 14.06% core strike at every
enemy in Open Wounds, and her spear volleys come every 2 seconds instead of 4. When a Full Burst starts she
gets Core Damage +24.64% (if she is in Penetrant Wish — i.e. she cast the burst) or Sequential Attack
Damage +85.17% (if she is not — another Burst III unit completed the chain), each for 10 seconds.

## Line-by-line

| Line                                                                                       | Disposition     | Notes                                                                                                                             |
| ------------------------------------------------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| S1: start of battle → Dark Matter spears, 125.51% × 7 sequential, every 4 sec              | FAITHFUL ⚑      | `interval` 4s, seven sequential-flavored hits per volley; first volley at t=4s by the engine convention, not t=0 (P1)             |
| S1: spear hit → boss: Open Wounds, Damage Taken ▲ 5.05%, continuous                        | FAITHFUL        | Permanent, never stacks (no stack wording); also opens the named 'Open Wounds' status Skill 2 checks (P2)                         |
| S1: using Burst Skill → all enemies: Open Wounds                                           | FAITHFUL        | Her own `burstCast`; same debuff, refreshes instead of stacking (P3)                                                              |
| S2: using Burst Skill → self: Penetrant Wish, 10 sec                                       | FAITHFUL        | `selfStatus` on her own cast — not on Full Burst entry (P4)                                                                       |
| S2: in Penetrant Wish, every 2 normal attacks → 14.06% core strike (Open Wounds enemies)   | FAITHFUL ⚑      | Counts only rounds fired while in Penetrant Wish; core-eligible at the MG core rate (0.95), not a guaranteed core (P4)            |
| S2: in Penetrant Wish → Sharpened Resolve interval ▼ 2 sec                                 | FAITHFUL        | Volleys every 2s inside the 10s window (P5)                                                                                       |
| S2: entering Full Burst NOT in Penetrant Wish → Sequential Attack Damage ▲ 85.17%, 10s     | FAITHFUL        | Fires on Full Bursts another Burst III completed; reaches only the spears (P6)                                                    |
| S2: entering Full Burst IN Penetrant Wish → Core Damage ▲ 24.64%, 10s                      | FAITHFUL        | Fires on Full Bursts after her own cast (P6)                                                                                      |
| Burst: reload 100%; ATK ▲ 78.4%, Attack Damage ▲ 78.14% for 10 sec; 1346.4% to all enemies | FAITHFUL        | Self buffs and nuke on her cast frame; the nuke gets no Full Burst +50% (P7)                                                      |
| Burst: Machine Gun Ramp-Up Speed ▲ 100% for 10 sec                                         | GAP (unmodeled) | The engine has no MG wind-up speed modifier (engine-modeling-gaps §23); about 1s of one post-reload climb falls inside her window |

## Corroboration

- **S2b (fable-5, fable-5-1):** no leak; both spec tables and load-bearing sets match. Both read the
  2-normal-attack count as belonging to Penetrant Wish (only in-state rounds count) — the driver's first
  override had the ungated counter; fixed to match the kit before S5/S6 ran.
- **S5 (opus-5, blind test):** no leak. With its one-line `onEvent` wiring fixed it passes **14 / 14** (4
  FLAG skips) against the shipped override.
- **S6 (opus-5, blind override):** no leak; structurally identical. It folds each volley into one 878.57% hit
  (same damage in the sim) and gates the IN branch with her own cast instead of the status (same frames).
- **S7 judges:** GO 1.0 / 1.0. One low-severity note from each: the core strike runs at the MG core rate,
  not a guaranteed core (claude-fable-5-1 S2b read it as guaranteed — about 5% of the strikes' damage).

## Board

No recording yet and no graded comp includes her, so there is no board reading. `scripts/regression.ts`
output is byte-identical with and without her override.

## Owner spot-check

1. Does every 14.06% core strike pop as a red CORE HIT (guaranteed core), or only as often as her normal
   core hits? The sim uses her MG core rate.
2. Does the first spear volley come at the start of the fight or 4 seconds in?
3. Do the Penetrant Wish strikes start on her burst cast and stop 10 seconds later — and do the two Full
   Burst entry buffs split the way described (Core Damage after her own burst, Sequential after another
   Burst III's)?
4. Does Open Wounds stay at 5.05% for the whole fight (no stacking per spear)?
