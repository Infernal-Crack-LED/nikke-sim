# Manual review — k (K)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (weapon-swap burst; stack-ramp crit buff; crit-gated rider; team ammo/damage feedback loop)

> Slug disambiguation: `k` IS the unit literally named "K" (Elysion SMG / Attacker / Electric / Burst III,
> resourceId 41, released 2025-05-29). Exact-slug discipline is P0 here — "k" is a substring of many slugs;
> all globs/lints in this run were exact-matched.

## Kit summary

K is an Electric SMG Attacker on Burst III whose damage is dominated by her burst window. While she
fires her SMG, every time she empties the magazine she builds "Tilted Scale" — a self crit-rate buff of
+0.75% per stack, +29 stacks per last bullet, capped at 100 stacks (= +75% crit), wiped each time Full
Burst ends (a build-dump sawtooth). Whenever she gains Tilted Scale, her whole team carries a paired
buff/debuff for 10s: +10.62% Attack Damage but −51.13% Max Ammunition; the ammo cut also shortens her OWN
magazine, which speeds her last-bullet cadence and therefore her stacking loop. Every 4 critical pellet
hits she procs a 23.9%-of-final-ATK hit on the boss. Her burst swaps her SMG for a slow 10-pellet weapon
(92.5% of final ATK per pellet, attack speed −90%, 10s) plus large self buffs for the window
(ATK +63.36% of her own ATK and Attack Damage +21.12%), so the 10s swap is her dominant damage phase.

## Line-by-line

| Line                                                        | Disposition    | Notes                                                                                                                            |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet → self Tilted Scale crit +0.75%×stk, cap 100 | DOCUMENTED_GAP | Literal stack-ramp + FB-end sawtooth un-encodable (no "+N stacks/trigger", no FB-end buff-removal primitive). Load-bearing burst-window observable encoded: `burstCast` self `critRatePct 75` 10s (= 100×0.75 steady state). Pre-burst ramp + first-burst build under-credited. |
| S1: 4 critical pellets → enemy 23.9% final ATK              | DOCUMENTED_GAP | UNMODELED — no crit-gated hit counter (`hitCount` counts all hits, not crits) and the pellet-collapse distorts the per-pellet basis. Secondary (~5% of burst damage). |
| S1: Full Burst ends → remove Tilted Scale                   | DOCUMENTED_GAP | No FB-end buff-removal primitive; folded into the burstCast-10s encoding (the buff self-expires ≈ the FB window).                |
| S2: gain Tilted Scale → allies maxAmmoPct −51.13/10s        | FAITHFUL       | Trigger `lastBullet` is an EXACT proxy (Tilted Scale is only gained on the last bullet). The kit's stated downside; also accelerates K's own loop. |
| S2: gain Tilted Scale → allies attackDamagePct +10.62/10s   | FAITHFUL       | `lastBullet`/allies/10s; near-continuous uptime (≈8s cadence < 10s duration). Non-stacking refresh satisfies "cannot be stacked". |
| S2: Full Burst ends → remove Fulfillment of Righteousness   | DOCUMENTED_GAP | No FB-end removal primitive; moot (10s duration self-expires ≈ the FB window, re-applied on the next last bullet).               |
| Burst: weaponSwap 92.5%×10 pellets, −90% speed, 10s         | FAITHFUL       | 10 pellets COLLAPSED to `weaponSwap.damagePct 925` (effectivePellets is SG-only AND swap-off, sim.ts:1386, so a swap cannot get a real pellet count). EV-exact under deterministic crit. `pullsPerSec 2` = SMG 20/s × 0.10. |
| Burst: self ATK +63.36% of caster ATK, 10s                  | FAITHFUL       | `casterAtkPct 63.36` (caster-scaled flat add), `burstCast`/self/10s.                                                              |
| Burst: self Attack Damage +21.12%, 10s                      | FAITHFUL       | `attackDamagePct 21.12`, `burstCast`/self/10s.                                                                                    |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived all 9
  lines. CONVERGED on 6 (S2 ×2 with the exact `lastBullet` proxy; burst `casterAtkPct 63.36` flat-resolved;
  burst `attackDamagePct 21.12`; S1c UNMODELED — reviewer independently confirmed "hitCount counts rounds
  unconditionally, exposes no crit gate"). Reviewer SHARPENED the ammo cut ("the kit's engine": self-ramp
  acceleration + ally reload tax). Flagged the Tilted Scale stack-ramp + both FB-end removals as probable
  engine-primitive gaps, leaning NO-GO(engine-core) "rather than a quiet durationSec fudge" — the driver
  verified the primitives ARE absent and carried the question to the binding judge rather than fudging.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 9 lines. Out-of-box vs
  the driver override (adapted import path only): **15 pass / 8 fail / 5 skip**. 7 real failures cluster into
  the two missing-primitive mechanics — Tilted Scale ×3 (blind asserts the literal lastBullet stack-buff with
  no wall-clock expiry), S1c rider ×3 (blind asserts a `hitCount` rider exists) — plus the pellet split-vs-merge
  ×1 (blind asserts `damagePct≈92.5`). 1 false-positive: S2a `durationShots toBeUndefined` got `null` (the
  harness emits `null` for a timed buff; the timed-window intent passes).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **Converged EXACTLY with the driver on the
  entire burst** (`weaponSwap.damagePct 925` + `pullsPerSec 2` + `casterAtkPct 63.36` + `attackDamagePct 21.12`,
  all `burstCast`/self/10s) **and on skill2** (`lastBullet`/allies: `maxAmmoPct −51.13` + `attackDamagePct 10.62`,
  10s). The blind override's 925 independently refutes the S5 test's 92.5 assertion (the override-writer reasoned
  about the engine; the test-writer read prose-only). Diverges only on skill1: Tilted Scale (blind = `lastBullet`
  `critRatePct 18.75 maxStacks 4`, a persistent cap that over-credits post-FB crit ~10–25%, flagged) and S1c
  (blind = `hitCount:5` `flatDamage 23.9`, a crit→hit estimate, flagged). Both are honest ⚑ approximations of the
  same un-encodable sawtooth/crit-gate the driver documented.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true.** All 9 lines accounted
  (5 FAITHFUL + 4 DOCUMENTED_GAP), zero REAL-GOTCHA / zero silent drops. The judge ruled every S5 red is either a
  documented engine-primitive gap (Tilted Scale sawtooth + crit-count rider "genuinely un-encodable today; the
  driver's workarounds are flagged with estimate + recipe + tier rather than fudged") or spurious (the 92.5
  assertion "refuted by the S6 blind's identical 925 choice plus engine facts"; the durationShots-null a test
  artifact). The encodable 6/9 lines "show exact three-way convergence." Gotchas bounded med/med/low, all
  `documentedByDriver:true`, fix path = named engine work (not re-tuned numbers).

## Residual flags for owner

1. **⚑ Pellet split-vs-merge (MEASUREMENT-GATED, dominant lever).** The kit's "Damage 92.5% of final ATK,
   Pelletcount 10" is read as 92.5% PER PELLET (×10 = 925% per volley), the conventional SG reading, and is
   collapsed to one 925% hit per pull because the engine cannot grant a swap weapon a real pellet count
   (effectivePellets is SG-only + swap-off). Both blind roles shared the "merge or the burst is a downgrade"
   prior; one burst-window popup read settles it. If 92.5% were the WHOLE shot split across 10 pellets, the
   burst would be ~10× weaker than encoded.
2. **⚑ Tilted Scale stack-ramp + FB-end sawtooth (ENGINE-CORE gap, documented).** The literal mechanic
   (+29 stacks/last bullet, cap 100 = 75%, wiped at every Full Burst end) needs two primitives the engine lacks:
   "+N stacks per application" (buff apply is +1/trigger, sim.ts:1922) and an FB-end buff-removal EffectDef. The
   driver encodes the load-bearing steady-state burst-window observable (`burstCast` `critRatePct 75` 10s) and
   under-credits the pre-burst SMG crit ramp + first-burst build. The S6 blind's alternative (persistent
   `lastBullet` 18.75×4 cap) over-credits post-FB crit ~10–25%. The truth (a sawtooth) lies between; neither is
   faithful to the shape. Fix = the two named engine primitives. NOTE: the override note's "~33s to cap"
   arithmetic ignores the S2 ammo-cut acceleration (shorter magazine → faster last-bullet cadence → caps sooner).
3. **⚑ S1c every-4-critical-hits rider (ENGINE-CORE gap, UNMODELED).** "Pellets land a critical hit 4 times →
   23.9% of final ATK additional damage" needs a crit-gated hit counter the engine lacks (`hitCount` counts all
   hits). Magnitude is secondary (~5% of burst-window damage at steady-state crit). Recipe: popup-read the 23.9%
   rider procs in a K focus video (count per burst window). A non-stationary `hitCount` estimate (S6 used
   `hitCount:5` = 4 crits ÷ ~0.8 avg crit) would be a fudge; left UNMODELED.
4. **Model-only, untuned.** K is `tier:MODEL_ONLY`, `tuned:false` — the gauntlet certifies STRUCTURE
   (faithfulness), not magnitudes. No board comp exists yet; a real fight recording is needed before her numbers
   are trusted.
