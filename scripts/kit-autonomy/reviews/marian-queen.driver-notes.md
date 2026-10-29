# Driver notes — marian-queen (Marian: Queen) — kit-autonomy gauntlet 2026-10-29

Driver: Claude Opus 5.5. Tier 2 (Penetrant Wish self-status gate splitting the Full-Burst-entry line
into two state branches; burstCast-vs-fullBurstEnter identity on Penetrant Wish and the burst-use
Open Wounds; a boss status gating the core strike). Claude-only routing (owner 2026-10-02): S2b
claude-fable-5 + claude-fable-5-1, S5/S6 claude-opus-5, S7 claude-fable-5-1 (binding) + claude-fable-5
— same-family evidence only.

## Engine change

None. Every line except MG Ramp-Up Speed maps onto an existing primitive:
`interval` + `skillCooldownReductionSec` (the `dorothy` (AR/Water base unit) Manifestation precedent — the reduction applies to
all of the owner's interval blocks; she has exactly one), `targetStatus` + `requiresTargetStatus`,
`selfStatus` + `requiresSelfStatus`, `hitCount` with `countScope: 'gated'`, `ownBurstGate: 'notCast'`,
`instantReload`, `flatDamage core:true` (the cinderella-crystal-wave "core strike damage" precedent).

## S2c reconciliation (driver vs the two S2b reviewers)

- Converged on every disposition, every trigger identity and the load-bearing set (12/13 lines; the
  MG Ramp-Up Speed line is the shared GAP).
- **Divergence 1 — counting scope of "Activates after performing 2 normal attacks".** Both S2b
  reviewers (and later S6) read it as a count belonging to the Penetrant Wish state (`countScope:
'gated'`); the driver's first override had the default ungated counter. Resolved toward the prose:
  `countScope: 'gated'` landed (commit cda7986b) and is pinned by the cumulative ⌊in-window rounds/2⌋
  assertion + the ungated-counter counterfactual.
- **Divergence 2 — "core strike damage" rate.** claude-fable-5-1 reads it as a guaranteed core hit
  (rate 1.0); the engine's `flatDamage core:true` resolves at the weapon's core rate × core exposure
  (0.95 for her MG on the control comp). Kept on the repo precedent (docs/modeling-priors.md #2,
  cinderella-crystal-wave) and carried as ⚑3 in the override with an estimate + recipe — `flatDamage`
  has no guaranteed-core field, and adding one is a damage-formula engine change outside this run's
  scope.

## S6 blind override vs the driver override

Structurally identical except:

- spears: one merged `flatDamage 878.57 gaugeHits 7` vs seven `125.51` hits — damage-identical in the
  deterministic sim (expected-value crit), identical gauge credit (7). The driver's split form is the
  literal "Attacks sequentially 7 times" and places the Open Wounds application after the first landed
  spear (only the first volley of the fight is affected).
- IN-state branch: S6 `ownBurstGate: 'cast'`, driver `requiresSelfStatus: 'Penetrant Wish'` — the same
  frames on every fixture (her cast leads her own Full Burst by 22f; the window is 10s; cooldown 40s).
- S6 adds `perPull: true` (degenerate: MG hitsPerShot 1) and `fraction: 1` on instantReload (the
  default) and names the status "Into the Fray: Penetrant Wish" (name only).

## Convergence (mechanical)

S5 blind tests (claude-opus-5) run against the shipped override after a one-line harness wiring fix
(`onEvent` moved into `cfg`, which `runComp` reads — no assertion changed): **14 passed / 4 FLAG
skips**. Saved as scripts/kit-autonomy/blind/marian-queen.adapted.test.ts; output in
reviews/marian-queen.verify.txt.

## Fire-rate / modeled≠working observations (control comp liter / crown / marian-queen / helm, boss Fire)

- 6 own casts (frames 322, 2374, 4367, 6277, 8157, 10068); `helm` (the SR/Water Helm, not helm-aquamarine) completes the other 5 Full Bursts.
- Spear volleys: first at frame 240, every 240f outside Penetrant Wish, every 120f inside it (P1/P5).
- Core strikes: 1317 over the fight, ~220 per window = ⌊in-window rounds/2⌋ (P4), coreRate 0.95.
- Damage split: normals ≈ 500M, spears ≈ 443M, core strikes ≈ 431M, burst nuke ≈ 67M; unit total
  ≈ 1.44B. No recording exists, so magnitude is unvalidated (out of scope for the gauntlet).
