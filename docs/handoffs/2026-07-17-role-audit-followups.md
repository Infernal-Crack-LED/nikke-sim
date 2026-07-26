# role-object-audit — remaining follow-ups (2026-07-17)

Carved out of `docs/handoffs/2026-07-17-role-object-audit.md` (now COMPLETE) so the audit doc can
be archived. That doc has the full evidence/derivations; this is just the live TODO tail. Three open
items + a few passive/no-action carries.

## Open action items

### 1. Custom-weaponry `role` sweep (the one un-started phase)
Audit the units whose `role.weapon.shot_detail` diverges from its weapon-type baseline. **D already
deflated this heavily** — most sub-categories are empty or blocked, so what's actually left is small:
- **pierce** — ⚠ EMPTY at the weapon level (`penetration=0` for ALL 74 units; pierce is always
  skill/burst-granted). ⇒ audit pierce from KIT TEXT, not the weapon row. This is the most
  self-contained remaining sub-task.
- **multi-muzzle** — DONE (only quency-escape-queen + zwei; both resolved under C.1 + muzzle-damage).
- **weapon-swap B3s** — BLOCKED ON DATA: `role.weapon` holds only the PRIMARY weapon (the burst-state
  secondary weapon is a different table). Needs that secondary-weapon row before it can be audited.
- **non-Instant `fire_type`** — all 13 are RL splash, inert on the single-target partless boss. Low
  value for current scope.

Method: extract `role.weapon.shot_detail` per candidate, diff vs the weapon-type normal, reconcile each
divergence against the unit's override + kit. Surfaces (a) which custom kits the raw table explains vs
which need hand-modeling, and (b) any override that mis-models a datamined primitive.

### 2. anis-star dot-gauge re-model (C.1 deferred — highest-value modeling fix)
Her `hitsPerShot=2` is a **gauge-calibration HACK**, not physical (she's `muzzle_count=1`). The `=2`
halves the `skillGauge` her burst "Shooting Stars" 40-tick dot + full-charge procs over-emit, which is
what lands the measured **PA MiKa = 11 FBs** (naive `=1` → 12). Real fix:
- re-model her 40-tick dot's `skillGauge` emission (likely over-emitting ~one full target-gauge/tick × 40),
- THEN drop her `HITS_PER_SHOT_CARVEOUTS` entry (`src/data/weapon-fields.ts`) to `=1`,
- preserving PA MiKa = 11.
Needs a real gauge model + re-validation (ideally a measurement to validate against), not a one-liner.

### 3. PH-water FB re-pin to 12 (D.2 conditional)
`PH-water`'s measured FB (12) is currently UNPINNED in `regression.ts` — at the enacted `PULLS_PER_SEC.SMG
= 24` the sim reads 13, reclassified into the known ±1 burst-cycle-boundary set (T4/T7/N2/N4/N5) as an
UNDERSTOOD over-prediction. ⇒ re-pin to 12 **if/when** the burst-cycle-increment fix lands, or after a
fresh PH-water FB re-measure.

## Passive / no action needed (carried for awareness)
- **Next `sync.ts` run** applies the 18 `burstGaugePerShot` diffs to `characters.json` (behaviour-neutral
  — no snapshot/regression depends on that field).
- **D.4 RL splash** (`spot_*` radius) — flag for a future adds/multi-part boss scope only; inert on the
  single-target partless boss.
- **E class-mismatch core-row flag** — optional guard: a unit whose datamined `weapon`/accuracy-circle
  disagrees with its slot class should not inherit its nominal class's core row. No current violator
  (SWHA already datamines SR, correctly pinpoint). NOT enacted.
- **modernia `hitsPerShot=2`** — correct as-is (genuine double-hit MG), documented, no action.
