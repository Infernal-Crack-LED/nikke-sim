# Manual review — neon (Neon, base)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count `durationShots`; `fullBurstEnter`-vs-`burstCast` count+timing split; weapon-typed `alliesOfWeapon` SG targeting; pre-FB burst snapshot)

> Slug disambiguation: `neon` is the BASE Neon (SG / Supporter / Fire / Burst I, Elysion, cd 20s,
> ammo 9, reloadFrames 129, hitsPerShot 10 pellets, normalMult 224.5, baseCrit 15/150). The
> slug-disambiguation lint's AMBIGUOUS-base advisory fires on the bare name by design (the base
> display name carries no variant colon) and was explicitly resolved on this slug at S0 (anis/milk
> precedent). She is NOT `neon-blue-ocean` (MG/Water Burst III, "nbo") and NOT `neon-vision-eye`
> (RL/Electric Burst III, "nve").

## Kit summary

Neon is a Fire shotgun Supporter on a 20s Burst I. Whenever the team enters Full Burst — no matter
who cast it — every ally's critical rate jumps by 45.93% for exactly their next two shots
(`durationShots`, per-holder). Her own burst fires one 528.97%-of-final-ATK shot at the
highest-final-DEF enemy (trivially the single boss; the cast lands BEFORE the Full Burst window
opens, so the nuke never takes the +50% FB major) and grants every Shotgun-wielding ally — herself
included — +3 rounds of magazine capacity for 10s (9-round magazines run 12 inside the window:
fewer reloads, more shots, extra shared gauge). Her first skill would give the two
highest-final-ATK allies +3.56% crit rate for 5s whenever she kills an enemy — but the scope-lock
boss is immortal and there are no adds, and the engine has no kill event, so that line can never
fire in any sim run and is honestly left unmodeled (verbatim + ⚑, not approximated).

## Line-by-line

| Line                                                              | Disposition      | Notes                                                                                                                                  |
| ----------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1: on kill → 2 highest-final-ATK allies critRate 3.56%/5s        | DOCUMENTED_GAP   | No kill event in the engine; immortal partless boss, no adds → zero activations in every run. Verbatim in `unmodeled.skill1` + ⚑1 (out-of-domain: world model) with estimate + recipe. Nearest-wrong (always-on proxy) pinned RED |
| S2: FB start → all allies critRate 45.93% for 2 shots             | FAITHFUL         | `fullBurstEnter` → `allies` (incl. self) → `critRatePct` `durationShots:2`, NO `durationSec`. Pinned by timing (grant lands on the fullBurstStart frame), count (5 grant-waves vs her 9 casts — helm's 40s CD gates the chain), stat key, and a helm-cancelling differential read showing exactly 2 buffed hits per holder per FB window. Plain "Critical Rate" → unscoped (not `critRateNormalPct`) |
| Burst: 528.97% final ATK to 1 highest-final-DEF enemy             | FAITHFUL         | `burstCast` → `enemy` → `flatDamage 528.97`, burst bucket; lands pre-FB (`fbMajorApplied` false, `inFullBurst` false pinned); once per own cast (9 in the fixture); "highest final DEF" collapses to the single boss |
| Burst: SG allies Max Ammo ▲3 rounds / 10s                          | FAITHFUL         | `burstCast` → `alliesOfWeapon SG` (incl. self) → `maxAmmoFlat 3`, `durationSec 10` (tove precedent, video-confirmed shape). Observable: SG `ammoAfter` reaches 11 in-window, ≤8 without. Recipients pinned to exactly {neon, naga}; helm (SR) excluded |

## Cross-family corroboration

- **S2b test review — claude-fable-5** (`reviews/neon.test-review.json`): independently re-derived
  all 4 lines with zero divergences — same UNMODELED kill class, `fullBurstEnter`+`durationShots:2`,
  pre-FB nuke, `maxAmmoFlat`/`alliesOfWeapon SG`. Flagged the controlComp B1-race fixture hazard
  (avoided by the custom [neon, naga, helm] comp) and the durationSec:2 near-miss, both covered by
  the spec.
- **S5 blind test — claude-opus-5** (`blind/neon.test.ts`, run via `neon.adapted.test.ts` with 6
  documented mechanical fixes): **18 GREEN / 2 artifact-RED / 1 intentional GAP-skip** vs the driver
  override. Both reds ruled blind-test artifacts (judge concurs — RECON_ERROR, not gotchas):
  (1) the scoped-vs-unscoped TOTALS cross-check cannot move neon's own total because her nuke lands
  pre-FB, before her own S2 buff exists (the event-level stat-key pin PASSED); (2) the ammo-grant
  byte-identity premise ignored the shared team burst gauge — the grant's extra real shots pump
  4.5 gauge each, shifting teammate FB timing by ~0.076% (the SG-only target-set pin PASSED).
- **S6 blind override — claude-opus-5** (`blind/neon.override.json`): structurally IDENTICAL to the
  driver override on all three modeled blocks (byte-for-byte same trigger/target/effects) plus the
  same UNMODELED skill1 treatment and the same caveat flags (rounds-vs-seconds, unscoped crit,
  pre-FB nuke). Differences: whitespace in the verbatim line, an extra documentation entry for the
  DEF-selector no-op, note framing, `hasPierce:false`.
- **S7 binding judge — kimi-code/k3** (`results/neon.json`): **GO, faithfulness 1.0, zero gotchas,
  discriminationOk**. All four lines accounted for (3 FAITHFUL + 1 DOCUMENTED_GAP); both S5 reds
  ruled RECON_ERROR for the blind test.

## Residual flags (owner spot-checks)

1. **Scoped-vs-unscoped crit discrimination** is verified structurally (stat key) and via the
   helm-side differential — never by a damage differential on a skill/burst hit of neon's own (her
   pre-FB nuke cannot overlap her own S2 window). Weakest discrimination leg; the prose is
   unambiguous ("Critical Rate ▲", no "of normal attacks" qualifier).
2. **`durationShots` decrement for a 10-pellet SG** — the engine spends 1 round per trigger pull
   (SSOT: round = one bullet, same unit as the ammo economy). Whether the in-game counter decrements
   per pull or per landed pellet for an SG holder is UNVERIFIED (S6 ⚑; a per-pellet reading would
   make the buff last a fraction of one pull). Recipe: focus-record a Full Burst with neon in the
   team and count how many of an SG holder's pulls carry the crit lift.
3. **Cadence tuple** (ammo 9 / reloadFrames 129 / RoF 90 rpm) is datamine, unverified on video —
   it sets the magazine cycle and thus the maxAmmoFlat window uptake and the 2-shot budget spend.
   ⚑2 with recipe (solo scope-lock video: rounds per 10s + mag-empty→first-shot gap).
4. **Kill-line in-game value** (⚑1 estimate): in real multi-add content the top-2-final-ATK pair
   would run +3.56% crit at near-full uptime — the sim's zero is a scope-lock necessity, not a
   value ruling. Recipe recorded for a future adds-enabled scope.

## Board

COLD — no board rows before or after the gauntlet (simSupported false→true flipped by this
gauntlet; never hand-tuned, MODEL_ONLY / tuned:false). `bash scripts/verify.sh` green;
`kit-status.ts --check` OK (147 units).
