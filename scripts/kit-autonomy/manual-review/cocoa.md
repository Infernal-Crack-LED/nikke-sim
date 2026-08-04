# Manual review — cocoa (Cocoa)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1 (zero encoding decisions — every kit line is out-of-domain for a damage-dealt sim; the
only hazard class is OVER-encoding, pinned by discriminating counterfactuals)

> Slug disambiguation: `cocoa` is the only Cocoa (SR/Fire/Supporter/Burst I, Tetra, released
> 2023-02-01). Lint clean (no AMBIGUOUS). FROM-SCRATCH build — no prior override existed; baseline
> was bare weapon, `simSupported:false`.

## Kit summary

Cocoa is a Burst I sniper whose entire kit is defensive support. Her Skill 1 (15s CD) restores
17.76% of Cover HP to the whole team and cleanses one debuff from two random debuffed allies. Her
Skill 2 builds **Professional Tomato Sauce** on every full-charge attack: self Damage Taken
▼4.37%, up to 15 stacks, each application lasting 5s. Her Burst I (20s CD) cleanses one debuff from
all allies and — only if Tomato Sauce is at max stacks at cast time — lowers all enemies' ATK by
13.59% for 10s. **Nothing in her kit increases anyone's damage dealt.** In the sim she contributes
her weapon (charge SR), burst gauge (2.8/shot from characters.json), and her Burst I cast in the
rotation; every kit effect lives outside the damage-dealt domain (no HP/cover pool, no ally-debuff
model, no incoming damage, and the engine explicitly drops enemy ATK▼/DEF▼ debuffs — src/engine/
sim.ts: "other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0").

## Line-by-line

| Line                                                      | Disposition    | Notes                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: all allies — Restores 17.76% of Cover HP              | DOCUMENTED_GAP | No cover/HP pool in v1. Deliberately NOT a `heal` effect: cover repair is not unit-HP recovery, and a heal would emit recovery events firing teammates' on-recovery consumers (crown) — an unmeasured synergy (S2b: "any emit choice needs a measurement, not a prior"; marciana Storage≠shield precedent). N3 proves a heal block observably adds crown firings. |
| S1: 2 random debuffed allies — Removes 1 debuff(s)        | DOCUMENTED_GAP | No ally-debuff model (v1 boss applies none); random targeting vacuous at scope. Verbatim in `unmodeled.skill1`.                                                                                                                                                                                                                                                   |
| S2: full charge → self Damage Taken ▼4.37%, 15 stacks, 5s | DOCUMENTED_GAP | Self mitigation; v1 models no incoming damage. The only consumer is the burst's max-stacks gate — unmodeled TOGETHER with the line it feeds. Caveat names the trap: the schema's `damageTakenPct` is the BOSS-side stat (positive = boss takes MORE); the flip would swing team damage up to 15×4.37% ≈ 65.55%. N2 pins the counterfactual moves totals.          |
| Burst: all allies — Removes 1 debuff(s)                   | DOCUMENTED_GAP | No debuff pool; recipe records trigger = her OWN burstCast (not fullBurstEnter) if debuffs are ever modeled. Fixture proves her burstCast actually fires (9 casts / 9 Full Bursts), so the slot is exercised-and-empty, not vacuously absent.                                                                                                                     |
| Burst: max stacks → all enemies ATK ▼13.59%, 10s          | DOCUMENTED_GAP | Engine explicitly drops enemy ATK▼ (DEF=0; boss offense unmodeled). NOT `damageTakenPct` (a different mechanic). Gate unmodeled with its 15-stack resource. N2's counterfactual proves the fixture sees the nearest-wrong mis-encode.                                                                                                                             |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All five lines
  UNMODELED/MEASUREMENT-GATED, `loadBearingSet` empty — full convergence. Independently named both
  over-encoding traps: the damageTakenPct sign/target flip (explicitly for the skill2 self line:
  "stacks to a ±65.55% swing on the ENTIRE TEAM's damage") and the cover-heal-as-`heal` pump of
  crown's on-recovery consumer ("any emit choice needs a measurement, not a prior"). Also
  pre-registered the fixture risk the driver's comp design eliminates (B1 competition with liter —
  the driver fixture seats cocoa as the SOLE B1: 9 casts / 9 Full Bursts, probe-verified).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Whole-kit inertness suite converging
  with the driver: totals equality vs stripped control, zero introduced offensive buffs (multiset
  diff), no boss-held damageTakenPct, heal and boss-debuff counterfactuals, plus the author's own
  GAP skips (no boss-offense model, no cleanse primitive, max-stacks reachability). Adapted run vs
  the driver override: **10 pass / 0 fail / 3 skip** after two labeled mechanical adaptations, no
  assertion text changed: (1) import path depth for blind/, (2) fixture re-cut per the author's OWN
  pre-registered rule ("re-cut the fixture, not the assertion") — controlComp('cocoa', true) seats
  helm, whose ~1.4s full-charge heals keep crown's recovery buff (7s) at ~100% uptime, saturating
  the heal-counterfactual sensitivity check; the re-cut swaps helm for ada (a heal-free B3), under
  which the same assertion bites (~35% buff uptime vs 0%).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on skill2 [] / burst [] /
  all five lines unmodeled / zero damage contribution / the damageTakenPct-opposite-semantics
  reasoning. ONE divergence: authored skill1 as `{interval 20s → allies → heal ticks:1}` standing
  in for the Cover-HP restore "so tandem on-recovery consumers can fire" — self-flagged: "Whether
  cover-HP restoration counts as recovery in-game is UNVERIFIED — if it does not, delete this
  block." (The 20s cadence was a placeholder: the datamined skill1 CD is 15s.) Bonus finding
  adopted as a residual: with SR cadence (~1 charge/1.4s) and a 5s stack lifetime, the 15-stack cap
  may be structurally unreachable — the burst gate may never open in game.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true,
  S5-vs-driver GREEN (0 RED).** All five lines DOCUMENTED_GAP, zero silent drops. The S6 heal-block
  divergence ruled an uncorroborated, self-flagged blind hypothesis against three convergent
  no-emit agents (driver + S2b + S5) and the marciana no-false-synergy precedent — driver's
  no-emit stands. The judge also reconciled the stack-reachability arithmetic against the blind
  agents: NIKKE stacking refreshes duration per application and cocoa's worst shot gap (reload
  ≈2.35s + next charge) stays under the 5s lifetime, so the ~25-30s-to-max read beats the
  "unreachable" claim — moot either way while the gated payload is defensive.

## Residual flags for owner

1. **⚑ cover-repair-fires-recovery (MEASUREMENT-GATED — the one substantive residual).** Whether
   in-game Cover HP restoration fires ally on-recovery triggers is unmeasured. Every agent
   defaulted to NO-EMIT (the faithful default: cover is not unit HP). If a measurement ever shows
   cover repair counts as recovery, cocoa gains a real crown/helm-style tandem synergy this
   override deliberately omits — and the recipe is already in the caveats (emit a cover-restore
   event on skill1's 15s clock; only then consider recovery semantics). Spot-check: footage of
   cocoa + crown, watching crown's Attack Damage buff while cocoa's S1 heals cover.
2. **⚑ Tomato Sauce stack reachability (arithmetic/measurement-gated, defensive-moot).** Refresh-
   semantics read (judge-adopted): ~25-30s to saturate 15 stacks, gate reachable; blind agents'
   per-stack-decay read: gate structurally unreachable. Both agree the payload is an enemy ATK
   debuff with no sim consumer, so nothing rides on it. Footage of the stack icon would settle it.
3. **⚑ Zero tuning surface.** No modeled line means no magnitude to hand-tune — cocoa's
   sim-vs-real ratio is pure weapon model (charge SR) until the defensive domain exists. Board row
   is null; she is absent from the accuracy board by construction.
4. **Counts reconciliation (batch-level, not cocoa-specific):** cocoa's row was inserted by hand
   (row absent pre-gauntlet; `--gauntlet` does not create rows). The global `counts` aggregate was
   intentionally NOT touched — deferred to the batch-end global refresh per SKILL.md "Reconciling
   concurrent batches".
