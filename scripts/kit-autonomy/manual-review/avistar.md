# Manual review — avistar (Avistar)

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (kimi-code/k3 binding judge: "8/8 kit lines FAITHFUL or DOCUMENTED_GAP; every divergence documented with a measured bound or an inertness proof"; discriminationOk:true)
**Tier:** 2 (scoped buff `alliesTopAtk count:1` "favorite pop star"; status gate `ownBurstGate:'cast'` Stargazer; `burstCast`-vs-`fullBurstEnd` timing; meta-defining `reenterStage:1` B1 re-entry; Aftershow removal-clause engine residual)

> Slug disambiguation: `avistar` is the standalone Elysion MG Supporter (Electric, Burst I, cd 20s,
> released 2026-04-23). No base/variant counterpart; lint clean (no AMBIGUOUS). From-scratch build —
> no prior override, no kit-status row, `simSupported:false` → flipped `true` this run.

## Kit summary

Avistar is a Burst-I "king-maker" enabler in the Chime mold. She designates ONE ally as "her favorite
pop star" (the highest-ATK ally; `alliesTopAtk count:1`, static base-ATK ranking) and pours her damage
buffs into it, AND re-enters Burst Stage 1 so a second B1 can also cast each chain. Her burst
(Stargazer) re-enters Stage 1 for all allies and grants herself a permanent Stargazer Max HP buff
(offensively inert). While Stargazer is active, entering Full Burst buffs her favorite pop star with
+40.13% Projectile Explosion Damage and +40.13% Attack Damage ("continuously"). When Full Burst ENDS,
her favorite pop star gains Aftershow — ATK ▲80.26% of AVISTAR'S OWN ATK as a flat add (caster-basis)
— and she heals herself (3.52% final Max HP / 1s / 10s) and removes Stargazer. The Stargazer status is
present at an FB entry iff she cast her own burst that rotation, so the S2 gate is `ownBurstGate:'cast'`.

## Line-by-line

| Line                                                              | Disposition      | Notes                                                                                                                                                  |
| ----------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1: fullBurstEnd → favorite pop star casterAtkPct 80.26           | FAITHFUL (+⚑1)   | Caster-basis flat ATK (= 0.8026 × Avistar.staticAtk ≈ 80046, NOT % of carry's ATK — atkPct is the nearest-wrong). "Removed on FB entry" UNENACTED (⚑1) |
| S1: fullBurstEnd → self heal 3.52%/1s ×10                         | FAITHFUL (inert) | `heal ticks:10 intervalSec:1`; self-targeted, no self-recovery consumer, recovery NOT logged → unobservable; modeled for SSOT fidelity                 |
| S1: "Removes Stargazer"                                           | folded           | Lifecycle of the inert Stargazer Max HP buff; licenses the `ownBurstGate:'cast'` equivalence                                                           |
| S2: fullBurstEnter (Stargazer-gated) → self Current HP ▼20%       | DOCUMENTED_GAP   | UNMODELED verbatim — no HP pool in v1; the self-drain + ">25% HP" gate move no damage; Avistar has no low-HP offensive gate                            |
| S2: → favorite pop star projectileExplosionPct 40.13 (continuous) | FAITHFUL         | `fullBurstEnter` + `ownBurstGate:'cast'`; bucket only yields damage on an explosive-weapon carry (RL/explosive SR); applied-but-inert otherwise        |
| S2: → favorite pop star attackDamagePct 40.13 (continuous)        | FAITHFUL         | The always-live Damage-Up bucket; no durationSec ("continuously"); re-triggered/refreshed per FB entry                                                 |
| Burst: burstCast → all allies reenterStage:1                      | FAITHFUL         | Meta-defining B1 re-entry (Tia/Anis:Star stage-hold); live only with a 2nd B1, else the stage advances (real-kit no-op)                                |
| Burst: burstCast → self casterMaxHpPct 26.4 (continuous)          | FAITHFUL (inert) | Stargazer Max HP; self Max HP feeds no atkOfMaxHpPct consumer (Avistar has none) → byte-identical totals when removed; SSOT completeness               |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all 8 line
  dispositions + the nearest-wrong traps (caster-basis atkPct, favorite-pop-star single-ally,
  reentry, Stargazer-inert, HP-drain unmodeled, "continuously" semantics). Its recommendation to
  encode the Stargazer gate as `ownBurstGate:'cast'` was ADOPTED (driver-verified: gated fires only
  on FBs Avistar cast in — CD-bump discrimination, gated 1× = her cast count vs ungated 5×). Its
  concern that the self-heal feeds Crown was RULED OUT empirically (self-targeted heal; Crown's
  20.99 recovery-buff count is 616=616 with/without the heal). Its Aftershow-removal concern is the
  key residual (⚑1, below).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same encoding.
  Raw vs the driver override: 15 pass / 8 fail / 2 skip — **all 8 failures probe-confirmed mechanical
  artifacts, NO REAL-GOTCHA**: crown also emits a `casterAtkPct` buff (3 confounds — value/recipient/
  timing reads weren't caster-filtered); the CF1 all-allies inertness check includes the caster
  (self-contamination); recovery events aren't logged (2 — the self-heal is unobservable by design);
  the reentry fixture had liter leading stage 1 so Avistar's re-entry was inert there (1); and
  `expiresFrame`/`durationShots` are `null` not `undefined` (2). Adapted (mechanical fixes only,
  intent preserved): **23 pass / 2 skip GREEN**. The blind test independently confirmed the
  caster-basis flat value (80046.51 on helm), single-ally count:1, FB-end-vs-FB-enter timing, the
  Stargazer gate, the reentry stage-1 hold, Stargazer-MaxHP inertness, and S2 load-bearingness.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. STRUCTURAL MATCH on every load-bearing
  line and INDEPENDENTLY derived `ownBurstGate:'cast'` for the Stargazer gate (corroborating the S2b
  recommendation and the driver's adoption). Two cosmetic divergences: (a) `excludeSelf:true` vs
  driver off — no behavioral impact (Avistar is a low-ATK Supporter, never the highest-ATK ally);
  (b) Aftershow `durationSec:10` calibration vs driver permanent + measured ⚑1 — the SAME residual
  flagged, defensible handling divergence (the judge endorsed the driver's measured>fudge rejection
  of the 10s fudge; see below).
- **S7 (kimi-code/k3, binding reconciling judge):** VERDICT **GO**, faithfulness **1.0**,
  discriminationOk:true. Three gotchas, all documented: (1) the Aftershow FB-window leak (ENGINE,
  high, ~8-14% carry over-credit) — `documentedByDriver:true`; the judge ruled the driver "measured
  its bound, disclosed it, and correctly rejected S6's durationSec:10 as an unmeasured fabrication of
  a comp-dependent gap, which is exactly what MEASURED>FUDGE requires"; the fix is a real engine
  increment (expire-on-FB-entry hook), a prioritized follow-up, not a blocker. (2) The "favorite pop
  star" = `alliesTopAtk` proxy is the key SAME-MODEL residual — driver, S2b, S5, and S6 all
  independently chose the identical stand-in, so their agreement is stability, not evidence; owner
  spot-check the real targeting rule against footage. (3) The permanent Stargazer Max-HP grant is
  inert and documented.

## Residual flags (owner spot-check cluster)

- **⚑1 — Aftershow "removed when entering Full Burst" (MATERIAL, engine follow-up).** The engine has
  no expire-on-FB-entry hook (`fbGate` gates application only; buffs expire purely by `expiresFrame`),
  so the casterAtkPct 80.26 flat ATK is modeled PERMANENT, over-crediting the carry's FB-window damage.
  MEASURED bound: the Aftershow's total contribution is ~30% of the favorite pop star's damage
  (permanent-vs-removed A/B: ada 778.4M → 598.9M); the unenacted removal leaks the FB-window portion —
  estimated ~8-14% of the carry's damage. Deliberately NOT a fudged `durationSec` (the outFb gap is
  comp-dependent: 10s on a 20s rotation, 30s on a 40s rotation). Recipe: an engine expire-on-FB-entry
  hook (a buff flag pruned at fullBurstStart) enacts it exactly and also closes the Stargazer Max-HP
  lifecycle; a focus video reading the Aftershow-icon uptime on the carry (expected outFb-only)
  calibrates a window approximation.
- **⚑ favorite-pop-star identity (SAME-MODEL residual).** "Her favorite pop star" (word_group=10103)
  has no mechanical selector in the prose; all four roles chose `alliesTopAtk count:1` (highest ATK).
  The proxy can select the wrong ally, and on a team WITHOUT the true named unit the real kit grants
  nothing while the proxy still grants everything. Recipe: resolve the named ally from the in-game
  tooltip / release material; either add a `TargetDef {kind:'allySlug'}` or a block-level
  `teamHas:{slugs:[...]}` gate; confirm with one fight with the named ally present and one without.
- **⚑2 — MG cadence tuple (standard).** ammo 300 / reloadFrames 171 / RoF 60 are the datamine
  (unverified for this unit); low impact (her self-damage is minor). Recipe: read fire cadence + the
  reload gap from any focus video.
- **Stargazer Max HP lifecycle.** Modeled permanent (inert); strictly it lapses at FB end (S1 "Removes
  Stargazer"). Damage-neutral either way (no HP→ATK scaler); the engine hook from ⚑1 would close it.
