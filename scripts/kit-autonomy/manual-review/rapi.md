# Manual review — rapi (Rapi)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter` identity on both burst lines; scoped self ATK buff; same-cast block-ordering snapshot pin; out-of-domain attacked-20 cluster)

> Slug disambiguation: `rapi` is the AR/Fire BASE unit; `rapi-red-hood` (MG/Fire "Rapi: Red
> Hood", aka "rrh"/"rapipi") is an ENTIRELY DIFFERENT unit. lint-slug-disambiguation fires
> its expected advisory on the shared base-name; the exact slug is resolved here
> (quency/mihara/mary precedent). AR / Attacker / Fire / Burst III, Elysion SR, released
> 2022-11-04. FROM-SCRATCH build: no prior override, `simSupported` false → true.

## Kit summary

Rapi is a simple stat-check Fire AR attacker on Burst III. Skill 2 fires a missile every 20s
(datamined `skillCooldownsSec.skill2 = 20`; the prose carries no activation clause) dealing
528.97% of her final ATK to the highest-final-ATK enemy (degenerate: the single scope-lock
boss), plus a 5s taunt the sim cannot represent. Her burst deals 657.72% of final ATK as
Burst Skill damage (cast lands BEFORE the Full Burst window — FB-exempt by timing) and grants
herself +60.75% ATK for 10s, covering the FB window that follows her cast; the nuke block is
listed BEFORE the buff block so the hit snapshots pre-buff ATK (engine dispatch is
array-ordered and buffs apply inline on the trigger frame — load-bearing, pinned). Skill 1 —
self ATK ▲21.81% for 20s once she has been ATTACKED 20 times — is out-of-domain: the sim has
no incoming-damage model (the v1 boss never acts) and no attacked-count trigger primitive, so
the counter can never accrue. In game her S2 taunt pulls enemy fire onto her and feeds that
counter — the taunt is the tanking half of the same out-of-domain loop. Both lines are
documented UNMODELED with ⚑ estimate+recipe+tier (maiden/anis/yulha precedent for
attacked-clusters; faithful omission, not a fudge).

## Line-by-line

| Line                                                            | Disposition    | Notes                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: attacked 20× → self ATK ▲21.81% / 20s                        | DOCUMENTED_GAP | No incoming-damage model and no attacked-count trigger exist (the boss never acts), so the counter cannot accrue. The buff is OFFENSIVE — a real damage lever her board reading reflects zero of, honestly. Nearest-wrong (`hitCount:20` on hits she DEALS → near-permanent uptime) pinned RED in the spec (R4). ⚑1 out-of-domain. |
| S2: 528.97% final ATK damage, cd 20s                              | FAITHFUL       | No activation clause → `interval:20` (datamined `skillCooldownsSec.skill2`; first fire t=20 — the standing interval convention, ⚑4). 8 fires t=20/40/.../160 pinned frame-exact; skill bucket, `srcSlot` skill2, crit-eligible at the caster sheet rate. Live-not-inert pinned. |
| S2: Taunt for 5 sec                                               | DOCUMENTED_GAP | No aggro/targeting primitive; the single partless boss already takes everyone's attacks → moves zero damage. Its in-game role (feeding the attacked-counter) is recorded with ⚑1's recipe. ⚑2 out-of-domain.                                      |
| Burst: 657.72% final ATK as Burst Skill damage                    | FAITHFUL       | `burstCast` → enemy → `flatDamage 657.72`: once per rapi cast ONLY (helm co-B3 casts the other stage-III windows), FB-exempt (cast lands pre-window; `fbMajorApplied` false pinned vs the `fullBurstEnter` counterfactual which takes the +50% and over-fires). No core (text carries no core-strike clause). |
| Burst: self ATK ▲60.75% / 10s                                     | FAITHFUL       | `burstCast` → self → `atkPct 60.75` / 600 frames: sole holder rapi, one application per rapi cast (helm-cast FBs apply nothing — pinned), lvl-10 magnitude vs the lvl-1 30.37 arm, 10s vs the 20s arm, self vs the all-allies arm. Load-bearing (removal moves her total). |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on ALL
  five lines: S1 unmodeled/measurement-gated ("the faithful state today is unmodeled … never
  a trigger keyed to her own outgoing fire" — same nearest-wrong named: `hitCount:20` on dealt
  hits); S2 `interval:20` skill-bucket nuke; taunt UNMODELED (never a damageTaken debuff);
  both burst lines `burstCast` (helm co-B3 makes the divergence observable). ONE addition the
  driver adopted: the same-cast ORDERING trap — assert the nuke snapshots pre-buff ATK
  (block dispatch is array-ordered; buffs apply inline) → landed as the spec's
  reordered-block arm (R2b).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. **18 passed / 2 author-documented
  skips / 0 failed** vs the driver override (adapted copy; the ONLY structural fix was the
  harness import path — pristine preserved at `blind/rapi.test.ts`). The 2 skips are exactly
  the two UNMODELED lines (skill1 trigger fidelity — no sim primitive; taunt — no aggro
  model). The blind author independently chose a sole-B3 fixture + a two-B3 arm to make
  `burstCast`-vs-`fullBurstEnter` observable — the same discrimination as the driver spec.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on every modeled
  value/trigger/scope: S2 528.97 (skill bucket, enemy collapse, no core), burst nuke 657.72
  (`burstCast`, FB-exempt — explicit `noFb:true`, behaviorally identical to the engine's
  auto-derivation), burst self ATK 60.75/10s (`burstCast` — "a self buff in the unit's OWN
  burst block"), identical verbatim taunt omission with the feeder interaction recorded. TWO
  flagged divergences, both adjudicated blind-side RECON_ERROR by the judge: (a) skill1
  encoded as `hitCount:20` on the owner's OWN rounds — self-flagged "⚑ IDENTITY MISMATCH …
  Flagged, not silently equated" with OVER-credit direction (AR ~12 rounds/s → ~1.7s
  re-trigger, near-100% uptime vs a real duty cycle); (b) S2 `interval:40` — self-flagged as
  inferred from the burst CD field ("the only cadence number the given data carries") with a
  recipe to "cross-check the datamined per-skill cooldown field (skillCooldownsSec)"; the
  de-contaminated packet carried no `skillCooldownsSec`, the ground truth does (20s).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true.**
  Ruled both S6 divergences blind-side RECON_ERRORs: the dealt-hits proxy is precisely the
  S2b-named nearest-wrong model, refuted by the engine fact that no incoming-damage channel
  exists and by maiden/anis/yulha repo precedent (all faithfulness 1.0 on identical
  archetypes) — the driver's faithful omission stands, pinned falsifiable by R4; the 40s
  period was a data-starvation artifact the blind author's own recipe anticipated, resolved
  by the ground-truth `skillCooldownsSec.skill2 = 20`. All three FAITHFUL lines verified
  against the SSOT (rider conventions, FB cast-timing rule, scope rules); S5 green confirmed.

## Residual flags for owner

1. **Interval first-fire phase (⚑, MEASUREMENT-GATED).** The `interval:20` first fire at
   t=20 (not t=0) is the standing convention — never popup-measured for rapi. One focused
   recording reading 528.97%-magnitude popup timestamps retires this and flag 2 together at
   low cost.
2. **S2 cadence provenance (⚑4).** The 20s period is the datamined `skillCooldownsSec.skill2`,
   not a popup count — same low-cost popup read as flag 1.
3. **S1 attacked-20 cluster (⚑1, OUT-OF-DOMAIN).** The offensive self ATK buff (21.81%/20s)
   ships unmodeled: no incoming-damage model, no attacked-count trigger. Real uptime is high
   in game (her taunt feeds the counter) — her board reading reflects ZERO of it, honestly.
   Recipe: needs an incoming-damage / attacked-count primitive; before any encoding, measure
   attacked-20 cadence from a real fight; any interval approximation must derive from
   MEASURED boss attack cadence and be fire-rate-invariant (S2b ruling).
4. **Taunt (⚑2, OUT-OF-DOMAIN).** Aggro control with no sim channel; damage-neutral at scope;
   its counter-feeder role belongs to ⚑1's recipe.
5. **AR cadence tuple (⚑3, MEASUREMENT-GATED).** rate_of_fire 720 / reloadFrames 81 / ammo 60
   shipped as-is from the datamine (no charFixes).
