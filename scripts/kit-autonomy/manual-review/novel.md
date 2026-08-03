# Manual review — novel (Novel)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (stack/status gate: the burst's Damage-Taken mark is gated on Cornucopia being at max stacks; hit-count stack accrual)

> Slug disambiguation: `novel` IS the base SMG/Iron Defender (resource_id 212, Burst II, Tetra,
> "Something's Fishy Here" / "Detective's Intuition" / "Case Closed"). No variant shares the base
> name — the slug-disambiguation lint returned clean. FROM-SCRATCH gauntlet: no shipped override
> existed before this run (`simSupported` was false); the override was authored as the faithful
> encoding under test (mast precedent) and every assertion pins a kit line GREEN vs it and RED vs
> the nearest-wrong counterfactual.

## Kit summary

Novel is an Iron SMG Defender on Burst II (cd 20s). Her identity is the **Cornucopia** stack engine:
every 100 normal attacks she lands grants herself a stack of Cornucopia — DEF ▲13.5% per stack, up to
5 stacks, each application refreshing a 15s window. Her Skill 1 fires on its 10s cooldown, dealing
52.36% of final ATK to the 3 highest-final-DEF enemies and lowering their DEF by 7.05% for 5s. Her
burst deals 330.61% of final ATK to the highest-final-ATK enemy — and, **only while Cornucopia is at
max stacks**, marks an enemy to take ▲67.5% more damage for 5s: a large team-wide amp. At her SMG
cadence (~19 shots/s) the five stacks build by ~30s and stay pinned, so every burst after the opening
ramp carries the mark. Her personal damage is modest; her value is the gated damage-taken debuff.

Two lines need documented conventions: the S1 enemy DEF▼ has no engine primitive (mast Sea-Breeze
precedent), and the max-stacks gate has no own-buff-stack gate primitive, so the stack COUNT rides a
live resource pool read by `resourceGate` — the `soda-twinkling-bunny` Golden-Chip pattern.

## Line-by-line

| Line                                                          | Disposition      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 3 highest-final-DEF enemies: 52.36% of final ATK (10s CD) | FAITHFUL         | `interval:10` (datamined `skillCooldownsSec.skill1`; neve/snow-white precedent, first fire t=10 ⚑) → enemy `flatDamage` 52.36, skill bucket, crit-eligible, FB-major by landing timing. The 3-target clause collapses to the single scope-lock boss (documented stand-in; neve precedent) — one hit per activation, never ×3.                                                                                    |
| S1: DEF ▼ 7.05% for 5 sec                                     | DOCUMENTED_GAP   | No dynamic enemy-DEF-reduction primitive: `applyBuff`'s enemy branch emits only `damageTakenPct`/`distributedDamagePct`; `cfg.bossDef` is a fixed per-hit subtraction. ≈9.9 flat DEF off the 140-DEF boss ≈ ~0.02% team damage — minor, not load-bearing. Verbatim in `unmodeled`; NOT fudged into `damageTakenPct` (S2b's named fudge). All three parties (driver + both blind agents) independently converged.     |
| S2: per 100 landed NAs → self Cornucopia DEF▲13.5%, ≤5, 15s   | FAITHFUL (inert) | ONE `hitCount:100` block, two effects: the literal `defPct 13.5 / maxStacks 5 / durationSec 15` self buff (each application adds a stack and refreshes the window; kth application rides the 100k-th shot — pinned) + `resource cornucopia +1` (pool 0..5) so the burst gate can read the stack count. `defPct` is damage-inert in v1 — proven byte-identical totals with the buff stripped (the resource stays). |
| Burst: highest-final-ATK enemy: 330.61% Burst Skill damage    | FAITHFUL         | `burstCast` → enemy `flatDamage` 330.61, burst bucket, FB-exempt by cast timing (the cast lands before the FB window opens; all nukes `fbMajorApplied:false`). One nuke per novel cast, on her stage-2 cast frames, never the stage-3 completion frames (fullBurstEnter counterfactual goes RED).                                                                                                                        |
| Burst: Cornucopia at max stacks → 1 enemy Damage Taken ▲67.5%, 5s | FAITHFUL     | `burstCast` + `resourceGate {cornucopia, min:5}` → boss-held `damageTakenPct 67.5 / 5s` (caster/target null, Taken bucket). Gate observably load-bearing BOTH ways: the ~4.9s and ~26.3s casts (0 and 4 stacks) land WITHOUT the mark; all 8 later casts carry it; ungated counterfactual fires 10 marks and strictly raises team damage. In-window hits carry `mult.taken = 1.675`, outside carry 1.                  |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independent spec converged
  on all five lines: interval trigger for the prose-silent S1 cadence (take the datamined cooldown —
  never invent), `hitCount:100` for Cornucopia, `burstCast` FB-exempt nuke, boss-held Damage-Taken
  debuff gated on cast-time max stacks, and the DEF▼ as a GAP that must NEVER be converted into a
  damage buff. Named the trap explicitly: dropping skill2 as "defensive" would silently zero the
  burst's 67.5% rider forever — the driver's N2+N5 groups pin exactly the ramp behavior it demanded
  (first burst: no rider; post-ramp burst: rider present), plus its two reinforcements (post-cap
  stack persistence past t=45s; the live `mult.taken` amp proof).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Prose-only suite (24 tests) requiring the
  gated encoding, including a NON-VACUITY assertion that some burst cast must precede max stacks.
  **Vs the driver override: 18 pass / 0 fail / 6 skip** after RECON_ERROR reconciliation (annotated,
  nothing weakened): `srcSlug`→`slug` field name; override slots are plain `Block[]` (no `.blocks`);
  `UnitResult.position-1` (no `slotIndex`); fixture `controlComp`→sole-B2 comp (crown is also B2 and
  would take every stage-II cast, leaving novel zero — mast precedent); and the three DEF▼ assertions
  converted to documented GAP skips (the engine has no enemy-DEF channel to assert against). The 3
  remaining skips are S5's own (multi-target selection ×2 — single-enemy fixture; S1 cadence seconds
  — prose-silent ⚑).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on 3 of 5 lines: the
  Cornucopia block is **byte-identical** (hitCount:100 → self defPct 13.5/15s/maxStacks 5); the S1
  damage line is shape-identical (interval + enemy flatDamage 52.36 — its 15s seconds were a flagged
  blind ⚑, the prose packet carries no cooldown; the driver's 10s is the datamined value); the burst
  nuke is shape-identical (it adds an explicit `noFb:true` — behaviorally identical to cast-timing
  exemption, isabel precedent). It left the gated Damage-Taken mark UNMODELED on a "cap unreachable"
  theory (~3 concurrent stacks, treating the five 15s windows as independent). **The S7 judge ruled
  this a RECON_ERROR:** it contradicts the KR refresh stacking rule (each application refreshes the
  pile), and the driver's fixture refutes it empirically (5th stack ~29.7s; gate closed on the two
  early casts, open on all eight later ones).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, zero gotchas, `discriminationOk`.**
  Line findings: 4 FAITHFUL + 1 DOCUMENTED_GAP (the DEF▼ line). `s5TestsVsDriverOverride: GREEN`.
  Verified the Cornucopia pile pins at 5 under the KR refresh rule, the resource pool ≡ live stack
  count under sustained fire, and the gate's bidirectional load-bearing evidence.

## Residual flags (owner spot-check — from the judge's rationale)

1. **Interval first-fire phase** (t=10 vs t=0) is the engine convention, never popup-pinned for this
   unit. Recipe: count 52.36% popups in a novel-focus recording and read the first one's timestamp.
2. **Resource pool ≡ live stack count** is proven only under sustained fire — a future fight model
   with >15s firing gaps would let real stacks decay while the pool stays latched. Scope-lock combat
   never produces such gaps.
3. **DEF▼ gap estimate** (~0.02% team damage) rests on the 140-DEF scope-lock boss; it stays
   negligible only while `bossDef` is small. If a boss-DEF primitive lands: 7.05% for 5s, refreshed
   on the 10s skill CD, feeding the subtractive DEF term.
4. **Cadence tuple** (standard ⚑): SMG pulls/s + reloadFrames 81 are datamine values; no text tell of
   a special fire mode. Recipe: read rounds/min + reload gap from a novel-focus video.
