# Pre-op packet — `anis-star` burst-DoT gauge re-model + `hitsPerShot: 2` carve-out removal (2026-08-16)

Status: pre-op **APPROVED-WITH-REVISIONS** (Fable, 2026-08-16); revisions R1–R3 below are
EXECUTED in this packet (amendments marked inline). Branch `anis-star-gauge-divisor`
(worktree off `main` @ `4cdbb5fd`). Enacts the U28 2026-08-16 addendum's "BUNDLED re-model"
item (docs/open-questions.md U28; docs/handoffs/QUEUE.md item 2).

**Pre-op revisions (executed):**

- **R1** — `burstGaugePerShot` is NOT edited (stays 1.4). The derivation at
  `src/data/weapon-fields.ts:106-108` is `round6((burst_energy_pershot/10000) × shot_count)` =
  14000/10000 × 1 = 1.4 — `hitsPerShot` never enters it; the packet's original 2.8 was an
  inference from a numerical coincidence and a hand-set 2.8 would be silently reverted at the
  next sync. The only `data/characters.json` delta is `hitsPerShot` 2→1. The new spec test must
  assert her characters.json row matches `deriveWeaponFields(slug, shot_detail)` output so the
  determinism claim is checked by the tree.
- **R2** — Decision rule gains an explicit INCONCLUSIVE branch (see below).
- **R3** — The stage-2-stall escaped-tick counterfactual spec must pin the tick's credit at the
  POST-change value (2.8 gauge per impact at divisor 1, ×1.06 her own burstGenPct aura as
  observed), so a future timing change that breaks the dot-duration==CHAIN_TIMEOUT coincidence
  trips a test instead of silently doubling a leak.

## Question

`anis-star` (Anis: Star — RL / Electric / Burst I / Defender) carries `hitsPerShot: 2` as an
explicit calibration carve-out in `src/data/weapon-fields.ts:60-63` — a synthetic value the
datamine does not contain (`shot_count 1 × muzzle_count 1`, `data/characters.json`
role.weapon.shot_detail). Installed 2026-07-17 (role-object audit C.1) to halve her 40-tick
burst-DoT's then-over-emitted `skillGauge`; its comment says "remove ONLY after her dot gauge is
properly re-modeled." Can it be removed now, and what is the proper model of her burst-DoT gauge
emission?

## Premise-gate results (step 0 — four premise-verifiers, all returned)

- **P1 CONFIRM (datamine):** one projectile per trigger (`shot_count 1 × muzzle_count 1`);
  gauge row 280 per boss trigger, byte-identical to raw datamine ÷100 (140 base / 280 target /
  250 full-charge bonus); the `2` exists only via the carve-out map. Scope corrections carried:
  the 2026-07-13 solo band (~10.7–11.3%/pull) is corroborated at n=1 recording only (the
  2026-08-15 re-read is same-footage, NOT a second confirmation); the `/hitsPerShot` `skillGauge`
  divisor is anchored at hitsPerShot=1 only (`maiden-ice-rose`) and is UNVERIFIED for
  hitsPerShot > 1 as a game rule — though the 2026-08-16 research pass corroborates it for
  genuine multi-muzzle units (per-hit rule, `docs/open-questions.md` U28 addendum item 1).
- **P2 CONFIRM w/ scope correction (dot is lock-swallowed):** in every one of the 12 committed
  lab comps seating her (all graded ones included), ZERO of her Shooting Stars dot ticks add
  gauge — verified by a zero-delta dot-removal counterfactual on the engine, not just code
  reading. Mechanism: dot ticks call `skillGauge` (`sim.ts:4104-4106`) but the `addGauge` lock
  (`sim.ts:1496-1498`, `fbEndFrame > frame || stage !== 0`) covers them: her Burst-I cast starts
  the dot at chain stage 1; 39 of 40 ticks are covered by chain+FB by mechanism, and the 40th
  (cast+600f) only by the numerical coincidence dot-duration (10s) == CHAIN_TIMEOUT (600f). On a
  synthetic stage-2 full-timeout stall, exactly 1 tick/cast escapes. NOT stated as "her dot can
  never generate."
- **P3 CONFIRM (constraints):** six graded comps seat her. Enabled: **PA MiKa** measured 11
  (sim 11×25 seeds, exact), **T2 elec-weak** measured 12 (sim 12×25), **N5 snowwhite-HA fire**
  measured 12 (sim 12×21/13×4, range-pass), **misc B3s (run I order)** measured 13 with
  divergence pin `simFullBursts: 12`. Disabled (open burst-generation shortfall): **T5
  wind-weak** measured 13 (sim 11×28%/12×72%), **T1 wind-weak** measured 13 (sim 11×72%/12×28%).
  Ungraded: T4 (sim 13, real 14 per comment), T7 (sim 11). Solo fixture: the 2026-08-15 re-read
  is a CANNOT-MEASURE on the median route plus a pixel-free count-to-fill EXCLUSION bound —
  steady per-pull **≥ ~10.96–11.14 and < ~12.53–12.73** — which arithmetically excludes BOTH the
  shipped 8.90%/pull AND the un-halved 10.39%/pull. Carried as an exclusion, not a value.
- **P4 CONFIRM narrow (blast radius) + one REFUTATION:** for an RL unit the ONLY live
  `hitsPerShot` read is the `skillGauge` divisor (`sim.ts:1564`); the damage-path read
  (`sim.ts:4415`, ×hitsPerShot on `extraHitDamagePct`) and the trigger-count read
  (`sim.ts:4448`, `hitCount` blocks) are unreachable for her as encoded (no carrier can grant
  her `extraHitDamagePct`; her per-pull lines are `shotFired`). `burstGaugePerShot` in
  characters.json is an UNCONSUMED reference field (`weapon-fields.ts:21-24`,
  `sim.ts:1099-1100`). So the flip is gauge-only BY MECHANISM but damage-moving VIA ROTATION
  (solo +3.51% total damage from 6→8 burst casts, pulls unchanged 137). **REFUTED premise:** the
  weapon-fields comment's "at 1, PA MiKa makes 12 FBs vs measured 11" is STALE at HEAD — an
  in-memory A/B through the committed vitest harness reads PA MiKa 11×25 and T2 12×25 at either
  value; the live FB footprint is T5 wind-weak (11-12 → 12×25, TOWARD its measured 13). The
  claim predates the 2026-08-04/08-13 gauge-lock rulings, which independently removed the dot
  over-emission the carve-out was compensating.

## H1

The carve-out is a **stale compensator**. The defect it papered over (pre-lock, her 40-tick
burst DoT over-emitting `skillGauge`) was independently fixed by the gauge lock (nothing
generates during chain stages 1–3 or Full Burst — owner rulings 2026-08-04 / 2026-08-13). The
**proper model of her burst-DoT gauge emission is the engine's general model, unchanged**: dot
ticks call `skillGauge` at the per-hit target-base credit and the lock swallows them wherever
the game's own lock would (her dot lives entirely inside her own cast's chain+FB in every
committed comp). The proper per-hit credit is the datamined 280 undivided (hitsPerShot 1 =
shot_count × muzzle_count; per-hit rule corroborated for real multi-muzzle units, U28 addendum).
Removing the carve-out therefore (a) preserves every enabled measured FB pin, (b) moves the
shortfall comps toward their measured counts, (c) moves the solo decomposition from 8.90 to
10.39 %/pull — toward but still below the 2026-08-15 exclusion bound (the residual belongs to
U28's still-open magnitude half, NOT to this change).

## H0 / rivals

- **H0a — the carve-out is still load-bearing:** at divisor 1 some ENABLED graded comp flips off
  its measured FB count (the original 2026-07-17 justification). P4's premise check already
  refutes this at HEAD via an in-memory flip; the work step re-establishes it with the actual
  file change and the gate's own 25-seed method. If it holds after all, H1 is falsified.
- **H0b — her "2" is real via a different mechanism** (two proc impacts per pull at 140 each —
  the census's popup-gated alternative, U28 2026-08-14 note). Gauge- and damage-equivalent in
  the engine (one damage instance either way; 2×140 = 1×280); distinguishable only by footage
  popups. The datamine (1 projectile) + per-hit rule favor 1×280. Not discriminable by this
  plan; recorded as an interpretation note. Either reading lands the same engine arithmetic.
- **H0c — compensating-error interaction with the open burst-generation shortfall class:**
  divisor removal adds +57–59 gauge/fight in T5/T1 (census), partially masking the shortfall
  those comps measure. Handled: T5/T1 STAY DISABLED (still short of 13), the shortfall stays
  open, no stamp moves; the plan claims only movement TOWARD measured, not closure.

## Method

Worktree `../nikke-sim-wt-anis-star-gauge`, branch `anis-star-gauge-divisor` off `main` @
`4cdbb5fd`. All configs via the committed harnesses (`scopeLockCfg` under
`scripts/regression.ts` / `scripts/experiment.ts` / the vitest harness) — nothing hand-rolled.
A/B arms are separate processes (characters.json and ENV-built tables are read once per process
— module-const rule).

1. **Baseline arm (re-run, not from memory):** at HEAD — `npx tsx scripts/regression.ts`
   (all graded comps), `SEEDS=25 ONLY=<comp> npx tsx scripts/experiment.ts` for T5, T1, T4, T7,
   the `--gauge-sources` census, and the solo per-pull decomposition (8.90).
2. **Change (as amended by R1):** remove `'anis-star': 2` from `HITS_PER_SHOT_CARVEOUTS`
   (`src/data/weapon-fields.ts`), rewrite the carve-out comment (`modernia` stays; stale
   PA-MiKa narration deleted — capture-first into DECISIONS); apply the deterministic
   derivation delta to `data/characters.json`: **`hitsPerShot` 2→1 ONLY** (`burstGaugePerShot`
   stays 1.4 — its formula `round6((burst_energy_pershot/10000) × shot_count)` does not involve
   `hitsPerShot`; sync itself is NOT run to avoid pulling unrelated upstream drift). The new
   spec test asserts her characters.json row matches `deriveWeaponFields` output.
3. **Test arm:** identical instrument sweep. Also re-run the two P2/P4 counterfactuals through
   COMMITTED code: promote the dot-gauge-inertness counterfactual + the divisor A/B into
   `scripts/tests/units/anis-star.test.ts` spec assertions (constraint 9 — the /tmp probes the
   premise-verifiers used do not count as citable instruments), and refresh
   `scripts/tests/battery/gauge-source-census.test.ts` pins FROM the instrument's own output
   (doc-numbers-from-the-instrument). Per **R3**, the stage-2-stall counterfactual spec pins
   the escaped 40th tick's credit at the post-change value (2.8/impact at divisor 1, ×1.06 her
   own burstGenPct as observed) so breaking the dot-duration==CHAIN_TIMEOUT coincidence trips a
   test. Per **R1**, a spec asserts her characters.json row == `deriveWeaponFields` output.
4. **Verification sweep:** full `npx tsx scripts/regression.ts --update` ONLY together with the
   change; blast-radius check = per-unit snapshot deltas must be confined to comps seating
   `anis-star` (deterministic engine, comps without her are an exact-zero negative control);
   `npm run dpschart && npm run ranks:all` then `bash scripts/verify.sh` green on the worktree.
5. **Docs (with the landing only):** DECISIONS entry; U28 addendum update + QUEUE item-2 edit
   (the enactable lands; the noise-floor half of the re-record ask STANDS); burst-gauge.md /
   game-mechanics.md touch-ups via `/mechanics-doc-upkeep`; `data/sources.json` if applicable.
   Solo residual stays filed under U28's magnitude half (open).

## Pre-registered predictions (discriminating)

- **P-1** PA MiKa: 11×25, unchanged. (H0a predicts 12.) — THE discriminating prediction: H1
  says the compensator's constraint vanished with the lock; H0a says it still binds.
- **P-2** T2 elec-weak: 12×25, unchanged.
- **P-3** N5 snowwhite-HA fire: stays a measured-12 pass (12/13 mix allowed by the gate's
  range rule as today).
- **P-4** misc B3s (run I order): reads 12 or 13; movement permitted only TOWARD measured 13.
  If 13 exactly: the divergence pin `simFullBursts: 12` is removed (sim newly matches measured);
  if 12: pin stands.
- **P-5** T5 wind-weak: moves UP to ~12×25 (from 11×28%/12×72%), toward measured 13 — still
  short; STAYS disabled. (+58.8 gauge/fight, census row.)
- **P-6** T1 wind-weak: unchanged or toward 13; stays disabled.
- **P-7** Solo decomposition: exactly (700 + 280) × 1.06 = 10.39 %/pull — still excluded by the
  2026-08-15 bound (≥ ~10.96). This change does NOT claim to close U28's magnitude half.
- **P-8** Blast radius: ZERO per-unit delta in every comp not seating `anis-star`; in her comps,
  per-unit movement is rotation-mediated only (burst-cast timing), no bucket/damage-path change.

## Pre-committed decision rule

**IMPLEMENT** iff ALL of: (a) P-1, P-2, P-3 hold exactly; (b) misc B3s reads 12 or 13;
(c) neither disabled comp moves AWAY from measured; (d) zero snapshot movement outside comps
seating her; (e) `verify.sh` green with the snapshot regen + census/spec pin updates sourced
from instrument output.

**FALSIFICATION (H0a):** any enabled pin off its measured value (PA MiKa ≠ 11, T2 ≠ 12, N5
failing its pass, misc B3s < 12) ⇒ the carve-out is still load-bearing ⇒ revert the code arm,
log the measured footprint, outcome LOG/REJECT — no engine change lands.

**BASIS-BROKEN clause (distinct from effect-absent):** movement in any comp NOT seating her, or
baseline-arm numbers disagreeing with P3's enumerated values, means the basis is broken
(concurrent drift / wrong arm), not that H1 is false — STOP and re-establish the baseline before
any verdict.

**INCONCLUSIVE branch (R2):** any (a)–(e) failure NOT covered by the FALSIFICATION or
BASIS-BROKEN clauses — e.g. a disabled comp moving AWAY from measured, or P-5 moving down —
⇒ INCONCLUSIVE: no landing, log the measured footprint, return the item to the queue. No
post-hoc classification of awkward results into the other branches.

## What this plan CANNOT establish

- Her true in-game per-pull gauge total (the solo bound excludes BOTH arms; U28's magnitude
  half — the ~1.6–1.9× in-window elevation class — stays open and footage-gated).
- Whether the game's rider is 1×280 or 2×140 (gauge-equivalent; popup-gated, H0b).
- Anything about the burst-generation shortfall class (T5/T1/iron stay disabled and open).

## Context sections (from the `context` skill, for the judge — file:line anchors at HEAD 4cdbb5fd)

**§0 What the sim is / validation basis:** Frame-tick 60fps sim predicting per-unit damage,
5-unit teams, 180s solo-raid, graded sim-vs-real under scope lock (sync 400, 10/10/10, Base 5,
no cube, core 7, treasure, partless boss, bossDef 140). Build every test config via
`scopeLockCfg(slugs, bossElement)` — never hand-rolled. Grading harness `scripts/experiment.ts`
(env `ONLY= ROT=1 SEEDS=N`).

**§7 Burst gauge generation (v4):** `addGauge`/`skillGauge`/`shotGauge`; datamined per-shot
table (`data/gauge-per-shot.json`). Focus bonus: the camera-focused unit's CHARGE weapon (SR/RL)
generates ×2.5 (`FOCUS_CHARGE_GEN=2.5` @ sim.ts:1324). Gauge locked during FB AND during the
chain (stages 1–3), unlocking the instant FB ends (owner rulings 2026-07-13 + 2026-08-04). The
synergy-API burstGaugePerShot column was DROPPED as a source. `skillGauge` (sim.ts:1554-1566)
credits `targetPerTrigger / (SG ? 10 : hitsPerShot || 1)` per skill/DoT/rider impact.

**§8 Burst rotation state machine:** Chain B1→B2→B3 triggers Full Burst;
`STAGE_CAST_GAP_FRAMES=30`; B3 cast → 22f → FB (`FB_PRE_DELAY_FRAMES`); `FULL_BURST_FRAMES` =
10s; NO post-FB chain-open lock (generation resumes the instant FB ends); chain stage expiry
`CHAIN_TIMEOUT_FRAMES=600` for stages ≥2 (stage 1 never expires). Full-burst COUNTS are
refill/cooldown arithmetic — deterministic run-to-run except boss-transition/chain collisions;
graded comps pinned in `scripts/regression.ts`. Burst-cast damage lands BEFORE FB begins.

**§13 Evidence tiers & hard rules:** MEASURED > CALIBRATED ⚑ > VALIDATED/DATAMINED >
MODEL-ONLY. `verify.sh` green before commit; snapshots only with the change they reflect; never
refit MEASURED constants; TOP INVARIANT: accuracy to observed mechanics > board fit.

**U28 extracts (docs/open-questions.md):** the `skillGauge` `/hitsPerShot` divisor generalizes
from ONE `maiden-ice-rose` (hitsPerShot 1) measurement and is unverified for hitsPerShot > 1;
2026-08-16 research pass: per-HIT rule community-settled (HIGH weapons / MEDIUM-HIGH skill
sub-hits), divisor CORROBORATED for genuine multi-muzzle units, `anis-star` is NOT a real
multi-hit unit (datamine 1×1) — "the enactable shape is a BUNDLED re-model of her burst-DoT
gauge emission + carve-out removal, verified on PA MiKa's pinned 11 AND T5 wind-weak. Gated:
engine change on a derived value → /scientific-method."

**The carve-out code (src/data/weapon-fields.ts:54-63):** "Two carve-outs KEEP 2 (their
double-hit is real but NOT captured by shot_count×muzzle): • modernia — genuine double-hit MG …
• anis-star — LOAD-BEARING gauge-calibration hack (halves her 40-tick burst dot's over-emitted
skillGauge); at 1 comp 'PA MiKa' makes 12 FBs vs measured 11. Remove ONLY after her dot gauge is
properly re-modeled (deferred owner action item, C.1).
`const HITS_PER_SHOT_CARVEOUTS = { modernia: 2, 'anis-star': 2 }`" — consumed as
`hitsPerShot: HITS_PER_SHOT_CARVEOUTS[slug] ?? shotCount * muzzle`.
