# rapi-red-hood — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Rapi: Red Hood (`rapi-red-hood`, "rrh"/"rapipi") — Fire · MG · Attacker · Burst III · 40s CD · ammo 300 ·
reloadFrames 171 · chargeFrames 0 · hitsPerShot 1 · normalAttackMultiplier 5.57 · coreAttackMultiplier 200 ·
Elysion Overspec. **EXACT SLUG** — NOT base `rapi` (AR/Fire) and NOT `red-hood` (the Λ SR unit).

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (13 FAITHFUL, 6 DOCUMENTED_GAP) ·
**0 silent drops** · discriminationOk **true**. S2b claude-fable-5 (pre-op test review) + S5/S6/S7 claude-opus-5
(blind test / blind override / binding judge) converged on the entire load-bearing structure. The binding judge
ruled the DRIVER is the more faithful party than both blinds on the two places they diverged, measured against the
damage-formula SSOT.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Battlefield Assessment)** ■ Activates at battle start and when Full Burst ends; effect varies by squad
  formation (only one applies).
  - No Burst I ally → **Combat Assist**: she fills Burst Stage 1 (continuous).
  - Has a Burst I ally → cancels Combat Assist.
  - Entering Full Burst while in Combat Assist → **all allies**: Burst CDR ▼7.48s; Attack Damage ▲8.02% for 10s.
  - Entering Full Burst while NOT in Combat Assist → **self**: ATK ▲95.04% for 10s; Damage to Interruption Parts ▲48% for 10s.
- **S2 (Attachable Projectiles)** ■ Activates at battle start (self, continuous): Elemental Advantage vs Electric;
  Projectile Attachment Damage ▲150.72%; Projectile Explosion Damage ▲100.6%.
  - ■ After 120 normal attacks: launches an attachable projectile — **Attachment** 88.11% of final ATK (immediate);
    **Explosion** 88.11% of final ATK (detonates on entering Full Burst). Max Ammunition Capacity: 1 round.
- **Burst (Power of Inheritance)**
  - Stage 1 → **self**: Burst CDR ▼20s; Explosion Radius ▲100.62% (10s). **all allies**: ATK ▲18.01% of caster ATK (10s).
  - Stage 3 → **nearest enemy**: 2808% of final ATK as additional damage. **self**: Explosion Radius ▲100.62% (10s);
    Projectile Attachment Damage ▲421.2% (10s); S2 trigger requirement ▼60 for 10s.

---

## 2. What the code does (override + blind re-derivations)

**skill1 — formation gate (TIER-2, the meta-defining mechanic).** Two `fullBurstEnter` blocks gated on `formation`:
`noB1` → all allies `burstCdr 7.48` + `attackDamagePct 8.02` (10s); `hasB1` → self `atkPct 95.04` (10s). A `passive`
`burstEligibility {stage:1}` block (formation `noB1`) makes her fill the B1 slot when the squad has no Burst I ally.
Both blind models re-derived this gate independently; the test pins it in BOTH directions — `atkPct 95.04` fires only
in the hasB1 fixture (liter present) and `attackDamagePct 8.02` + a STAGE-1 cast fire only in the noB1 fixture
(crown/rrh/ada). The 48% interruption-parts line is UNMODELED (inert on the partless scope-lock boss; recorded verbatim).

**skill2 — the damage engine.** A `passive` block grants `advantageVs Electric` + the two flavor-scoped passives
`projectileAttachmentPct 150.72` / `projectileExplosionPct 100.6`. The engine routes these as their OWN multiplicative
bucket (`projFactor = 1 + (projExpl+projAttach)/100`) on flavored hits ONLY — normals stay `projFactor 1.0`. A `hitCount`
block (`count 120`, `countInFb 60`) fires the rocket: `flatDamage 88.11 flavor projectileAttachment` (immediate, no core)
+ `storedHit 88.11 flavor projectileExplosion, core 0.33, crit, instantInFb` (accumulates out-of-burst, releases at FB
entry as a batch; in-burst attaches detonate immediately). **This is exactly where the S6 blind diverged**: it authored
the passives as generic `attackDamagePct` and flagged its OWN encoding as a ⚑ SCOPE defect ("over-credits every
non-projectile hit by ~251pp … almost certainly WRONG"). The driver's flavor-scoped StatKeys are the faithful encoding;
test RRH3 pins `projFactor` 2.5072 (attach) / 2.0060 (explode) on rocket hits and 1.0 on normals.

**burst — stage split.** Stage 1 (`burstCast stage:1`): self `burstCdr 20` + all allies `casterAtkPct 18.01` (flat
`(18.01/100)×staticAtk`, 10s) — reachable only in noB1/Combat-Assist comps. Stage 3 (`burstCast stage:3`): enemy
`flatDamage 2808, delaySec 0.4, requiresPulls 120` — a FLIGHTED missile landing ~0.4s post-banner INSIDE the FB window
at full buffed state (takes the +50% FB major), charge-gated to ≥120 pulls. Both blinds applied the generic burst-cast
FB-exempt rule here; the driver's flighted `delaySec 0.4` / FB-major-true is the SSOT's own per-unit exception
(owner-measured, 3 focus recordings, recipe fit 27.9M/25.1M/32.0M). Test RRH5 pins `atkPct 2808`, once per cast,
`fbMajorApplied true`.

---

## 3. Measurement-gated residuals — owner spot-check cluster

These are the points where the shipped model departs from what THREE independent prose readings (S2b fable, S5 opus,
S6 opus) produced. They are precisely the highest-value spot-check; each is backed by owner measurement, not prose.

1. **Nuke FB timing (delaySec 0.4, fbMajor true).** Every blind assumed the 2808% nuke is a standard pre-FB burst-cast
   (FB-exempt). The shipped model has it flighted ~0.4s into the window. Backed by 3 focus recordings + recipe fit.
   *Spot-check: confirm the nuke popup lands inside the FB banner and carries the +50%.*
2. **+421.2% Projectile Attachment buff — REMOVED as measured-inert.** All three prose readings include it; the shipped
   model omits it (dead datamine entry 101631006; 0.13% precision across 3 comps, 2026-07-14). Now recorded verbatim in
   `unmodeled.burst` (judge's registry fix). *Spot-check: confirm an in-window attachment shows no +421% uplift.*
3. **Batch accumulation vs prose "Max Ammo: 1".** The prose reads as a capacity-1 cap (≤1 explosion/FB); the shipped
   model follows the owner's measurement of batch accumulation (meter fills 0→100%, rockets bank out-of-burst, first
   explosion of each FB is a BATCH — probe shows batches of 2/4/9/8). The binding judge's read is the conflict is
   illusory (capacity 1 = the launcher magazine, not projectiles attached to the boss), which would make the model
   prose-consistent and the `unmodeled` entry unnecessary. *Spot-check: confirm multi-rocket batches detonate per FB.*
4. **Explosion core ×0.33 + crit-on.** Measurement-gated (docs/probe-data/rrh-explosion-core.json, N=9, range 0.30–0.45;
   crit by the 2026-07-16 consistency ruling — every other RRH hit crits, removing the stored-hit exemption). *Spot-check:
   red CORE HIT popups are the minority (~1/3) on explosion bodies; orange crit bodies appear.*
5. **▼60 in-FB cadence modeled as a FB-state threshold (`countInFb 60`), not her Stage-3 cast + 10s.** The judge notes
   this over-generates rockets in FBs she does NOT cast and in noB1 rotations (the kit scopes ▼60 to her Stage-3 cast +
   10s). A faithful timed-threshold primitive does not exist; the engine has no dynamic-trigger-count primitive (both
   blinds skipped the line entirely). Documented approximation. *Spot-check: in a two-B3 comp, do rockets over-generate
   on the co-B3's rotations?*
6. **`requiresPulls 120` on the nuke is unprosed** (its constant equals S2's threshold; the banner-1 no-nuke evidence is
   equally consistent with a missing rocket explosion). Inert in the graded fixture, therefore untested.

---

## 4. Process flags for the orchestrator

- **De-contamination leak (S2b-flagged):** `prepare-cross-family-packet.ts` redacts the slug + driver-supplied tokens
  but NOT the unit's approved `nicknames[]`. The redacted effect schema leaked the target twice via storedHit comments
  citing the nickname "RRH" (explosion core ~1/3 MEASURED; explosion crit orange bodies). **Impact on this verdict: nil**
  — the reviewer flagged it openly, re-derived every disposition from prose, and treated the core/crit magnitudes as
  measurement-gated ⚑ rather than trusting the leaked value; the driver cites the independent measurement provenance.
  **Fix: the packet builder should also redact `data/characters.json` `nicknames[]` ("rrh"/"rapipi" here).**
- **Same-model residual:** S5/S6/S7 are all claude-opus-5 (one family); the strongest independent signal is the
  cross-family fable S2b review, which agreed with the opus blinds on all three measurement overrides above.

---

## 5. Evidence trail

- Driver test: `scripts/tests/units/rapi-red-hood.test.ts` — 20 pins, all GREEN vs shipped (RRH1–RRH6 across both
  formation fixtures, 6 counterfactuals).
- S2b review + reconciliation: `scripts/kit-autonomy/reviews/rapi-red-hood.test-review.json`; verify `reviews/rapi-red-hood.verify.txt`.
- Blind artifacts: `scripts/kit-autonomy/blind/rapi-red-hood.{test.ts,override.json}` (S5 blind test 23/23 + 2 honest skips vs driver override).
- Binding judge verdict: `scripts/kit-autonomy/results/rapi-red-hood.json` (GO / 1.0 / discriminationOk true).
- Cross-family packets + results: `scripts/kit-autonomy/cross-family/rapi-red-hood/`.
- Board: row 19, 5 teams, ratio 0.930 (COLD, range 0.85–0.96) — unchanged by this gauntlet (documentation-only edits; sim output identical at 424.2M). The COLD residual is the deliberately-open Invisible-X / MG-cold gap, not a faithfulness defect.
