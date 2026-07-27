# soda-twinkling-bunny — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Soda: Twinkling Bunny (`soda-twinkling-bunny`, aka `stb`/`bsoda`) — Iron · SG · Attacker · Burst III ·
40s CD · ammo 9 · reloadFrames 142 (charFixes 182 measured padded) · chargeFrames 0 · hitsPerShot 10 ·
normalMult 231.6 / coreMult 200 · burstGaugePerShot 4.5 · critRate 15 / critDamage 150 · Tetra. **VARIANT** —
distinct from base `soda` (MG/Fire); never conflate.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (9/9 kit lines FAITHFUL or DOCUMENTED-GAP; 0 real gotchas surviving
grading — the 3 judge gotchas are all measurement-gated/documented) · **cross-family corroborated** — S2b
`claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. STRUCTURE is certified, magnitudes are not. Soda is
fight-validated (grade 0.887 on the soda tb control recording, Fable-approved re-tune 2026-07-16) but stays
`tier: MODEL_ONLY` / `tuned: false` in kit-status (the gauntlet certifies STRUCTURE and deliberately leaves
`tier`/`tuned` untouched; there is no GAUNTLET tier). **The gauntlet made NO encoding change** — the override was
already faithful (the dynamic Golden-Chip pool landed 2026-07-17, recording-validated) and the gauntlet certified
it via two independent cross-family re-derivations. S3 only cleared two STALE `unmodeled` entries (the start+50
pool seed and the −17 spend — both were re-encoded, not skipped) and documented the rider ⚑ in caveats.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads. The kit centres on a **Golden Chip** pool.

- **S1 (Lucky Golden Chip)**
  - ■ Start of battle → self: **Golden Chip stacks ▲50** (the pool seed; cap 50).
  - ■ After 3 normal attacks during Full Burst → self: **Golden Chip: Critical Damage ▲1.32%**, continuously,
    stacks up to 50 (crit damage tracks the live pool × 1.32).
  - ■ After 3 normal attacks during Full Burst → self + the 1 ally with the highest final ATK (except self):
    **Attack Damage ▲10.51% for 2 sec**.
- **S2 (Beginner's Rewards)**
  - ■ Entering Burst Stage 3 → all allies: chip-gated CUMULATIVE Full Burst Duration ladder — "Time Extension I"
    **+2s at ≥10 chips**, "Time Extension II" **+3s more at ≥20** (so +5s total at ≥20). Lasts until FB ends.
  - ■ Normal attack during Full Burst → 1 enemy nearest crosshair: rider by Time-Extension state — **52.04% in
    TE-I**, **+85.02% in TE-II** (cumulative 137.06%); "each subsequent effect triggers all effects before it".
- **Burst (Onward, Soda!)** — effects vary by chip count, cumulative; **Golden Chip stacks ▼17 after applied**.
  - ■ Stage 1 → all enemies: **628.7% of final ATK as Burst Skill damage**.
  - ■ Stage 2 (≥20 chips) → self: **Hit Rate ▲38.91% for 15 sec**.
  - ■ Stage 3 (≥30 chips) → self: **ATK ▲65.25% for 15 sec**.

---

## 2. What the code does (the faithful override, line by line)

The whole kit is built on the **Golden Chip** resource pool (`resources[0] = {goldenChip, initial 50, min 0,
max 50}`). The pool is engine-internal state — `resource` deltas emit NO event and the `perResource` crit is
computed live at damage time (sim.ts:1234, 1820) — so it is observed INDIRECTLY: which `resourceGate`-gated buffs
fire (and on which bursts), the Full Burst window length, and the live crit folded into expected-value totals.
Economy: start 50, **+1 per "3 normal attacks during Full Burst"** (the same `shotFired+inFb+everyN:3` trigger as
the AD block; SG counts trigger PULLS, not the 10 pellets), **−17 on her own burstCast (ordered AFTER the gates
so they read the pre-consume pool)**. Sawtooth: pre-consume 50/43/38… (recording-validated vs the measured
50/44/40/38/31); the pool stays ≥20 for all 5 bursts but drops below 30 by burst 5.

- **S1 start +50 (pool seed)** `resources[0].initial = 50`. Re-encoded from a former `unmodeled` entry — the
  engine has NO battleStart trigger, so the pool seed is the correct primitive. Drives every downstream gate.
  **STB1** pins it: the ≥30 ATK gate AND the ≥20 HR gate both clear on burst 1 and the first FB is already 15s —
  only possible if the pool opens at 50 (pool-0 counterfactual fires neither gate, FB stays 10s — RED).
- **S1 Critical Damage ▲1.32% (live off the pool)** `passive → self → critDamagePct value 0, perResource
{goldenChip, mult 1.32}`. The buff's base value is IGNORED; the contribution is `pool × 1.32 × stacks`, re-read
  live each frame (a sawtooth: 66% at 50 chips, stepping down 22.44 per −17 spend, climbing +1.32 per 3 in-FB
  pulls). The buffApply carries base value 0 (NOT the realized crit). PROOF it tracks the pool from 50 (not a
  from-0 ramp): the t=8 pre-burst popup (chips=50, ZERO in-FB casts) read crit ×2.160 = (150+50×1.32)/100 exactly.
  **STB2** pins the passive self buff (frame 0, value 0, no expiry) + that removing it drops the total ~15M.
- **S1 +1 chip rebuild** `resource {goldenChip, delta +1}` on the same `shotFired+inFb+everyN:3` trigger. The
  pool rebuild that sustains the gates late-fight. **STB3** pins it: removing the generation drops the ATK gate
  4→2 and the HR gate 5→2 (the pool drains to 0 without rebuild) — RED.
- **S1 Attack Damage ▲10.51%/2s (self + top-final-ATK ally)** two blocks on `shotFired+inFb+everyN:3`: `self →
attackDamagePct 10.51 (2s)` and `alliesTopAtk {count 1, excludeSelf, byFinalAtk} → attackDamagePct 10.51 (2s)`.
  `excludeSelf` is load-bearing — Soda IS top final ATK on the fixture, so without it the ally block double-targets
  her. **STB4** pins self + ≥1 ally buffed, the ally block never targets Soda (slot 2 holds exactly its self-block
  count), and the excludeSelf counterfactual (Soda 51→78, liter 27→0) — RED.
- **S2 FB-extension cumulative ladder** two `stageEnter:3 → allies` blocks: `resourceGate {min 20} →
fullBurstExtend 5` and `resourceGate {min 10, max 19} → fullBurstExtend 2` (the collapsed cumulative ladder:
  +5 at ≥20, +2 at 10-19). Fires on EVERY Burst-Stage-3 cast — hers OR an ally's (the helm co-B3 in the fixture)
  — reading her chip count, so it is `stageEnter` (team entry), NOT `burstCast`. **STB5** pins all 9 FB windows at
  15s (the 4 helm-led FBs are ALSO 15s → confirms stageEnter keying); no-ext → 10s and flat-+2 → ≤12s — RED.
- **S2 in-FB rider (⚑ recording-derived)** `shotFired+inFb → enemy → flatDamage atkPct 130`. The kit reads
  52.04% (TE-I) / +85.02% (TE-II, cumulative 137.06%) gated on the Time-Extension state LATCHED at BS3 entry; the
  engine has NO state-snapshot primitive, and a live `resourceGate` proxy is provably WRONG (it drops the rider
  post-consume when the pool dips below threshold). The flat 130 sidesteps the live-pool trap and approximates the
  TE-II-dominant case (the pool sits ≥20 most of the fight). Trigger/target/cadence (in-FB normal → 1 enemy, per
  PULL not per pellet) are faithful; only magnitude + TE-state gating are ⚑. **STB6** pins 154 skill2 hits at 130%,
  all inFullBurst=true; removing it drops the total ~126M (35%) — RED. (residual ⚑, §4)
- **Burst 628.7% nuke** `burstCast → enemy → flatDamage atkPct 628.7`. Keyed to Soda's OWN burstCast ("when using
  Onward, Soda!"); burst-cast damage lands pre-FB-window so it is FB-exempt (fbMajorApplied=false) by timing — no
  explicit `noFb` flag (gotcha 3, behaviorally inert). **STB7** pins one nuke per cast in the burst bucket.
- **Burst Hit Rate ▲38.91%/15s (≥20)** `burstCast → self → resourceGate {goldenChip min 20} → hitRatePct 38.91
(15s)`, ordered BEFORE the −17 spend (pre-consume read). On an SG this is a core-hit-rate lift (damage-relevant),
  not a skippable accuracy stat. **STB8** pins HR on all 5 bursts (burst-5 pre-consume ∈ [20,30)), self 15s. The
  two DOWNSTREAM channels (core rate via acrForHR, pellet landing via coneSigmaFor) are over-credited vs the owner
  hand-count — a coupled SG measurement residual (gotcha 2, residual ⚑, §4).
- **Burst ATK ▲65.25%/15s (≥30)** `burstCast → self → resourceGate {goldenChip min 30} → atkPct 65.25 (15s)`,
  ordered before the spend. **STB8** pins ATK on bursts 1-4, lapsing on burst 5 (the sawtooth drops below 30) —
  exactly the decay the prose implies; the spend-first counterfactual collapses it 4→1 — RED.
- **Burst −17 spend (after the gates)** `burstCast → self → resource {goldenChip, delta -17}` as the TRAILING
  burst block, so the ≥20/≥30 gates read the pre-consume pool ("▼17 after the effect is applied"). Re-encoded from
  a former `unmodeled` entry. **STB7** pins the ordering: moving the spend before the gates collapses ATK 4→1, HR
  5→3 — RED.

---

## 3. Handled forks (the judge's divergences — none is a REAL-GOTCHA)

The judge found **0 gotchas surviving grading** (the 3 it logged are all measurement-gated/documented — see §4).
The cross-family divergences all resolved toward the driver:

- **Crit damage — live perResource off the pool (driver + fable S2b) vs from-0 stacking ramp (opus S6).** The
  prose "Activates after 3 normal attacks in FB … Critical Damage ▲1.32% … stacks up to 50" is terse: opus read it
  as a SEPARATE from-0 stacking buff (NOT active at t=0) and flagged the ambiguity itself with a recipe ("if crit
  starts high ~66% and DECLINES, switch to perResource"). The driver's live-pool reading is the measured-correct
  one: the t=8 pre-burst popup (chips=50, zero in-FB casts) read ×2.160 = (150+50×1.32)/100 exactly — crit tracks
  the pool from 50, refuting the from-0 ramp. Opus's dissent is a RECON uncertainty it flagged itself, resolved
  against it by FACT 1 + the popup.
- **Chip rebuild — +1 per 3 in-FB normals (driver + fable S2b) vs monotonic decay (opus S6).** The one genuine
  interpretive fork. Opus found no rebuild source in the terse prose and read the pool as monotonic decay
  (50→33→16→0, gates lapse after ~2 bursts), flagging it with a HUD-read recipe. The driver's +1/3-pull rebuild is
  RECORDING-VALIDATED: sim pre-consume 50/43/38 reproduces the measured 50/44/40/38/31 within 1-2 chips (the
  datamined per-3-normals generation MATCHES the recorded drain, not fit to it). SG "3 normal attacks" = trigger
  pulls (pellet-counting would 10× the rate). This is the same-model residual the owner should spot-check (§4).
- **Rider — flat 130 (driver) vs TE-snapshot 137.06 (fable S2b) vs live-proxy 52/85 (opus S6).** All three agents
  independently flag the SAME Time-Extension-snapshot gap with the same recipe: the faithful encoding latches the
  TE tier at BS3 entry and holds it for the whole FB, but the engine has no state-snapshot primitive and a live
  resourceGate proxy is provably wrong (drops the rider post-consume). The driver's flat 130 (⚑ recording-derived,
  TE-II-dominant) sidesteps the trap honestly; magnitude + TE gating await a soda-focus recording. DOCUMENTED-GAP
  (FIDELITY), not a silent divergence.
- **Blind S5 harness artifacts (HANDLED — NOT a faithfulness signal).** The opus S5 blind test cannot run
  unmodified: its patch helpers iterate `o.blocks` but the override shape is `{skill1:[],skill2:[],burst:[]}` (so
  every counterfactual is a silent no-op), it passes the override OBJECT to `controlComp()` (which expects a slug),
  it reads `.idx`/`.total`/`.mult`-as-scalar (the harness exposes `totalDamage`, `atkPct`, a `mult` OBJECT), and
  its `../lib/harness` import assumes a `scripts/tests/units/` location. This is the same documented blind-harness
  class as soline/takina/tove. The blind SPEC table (the real, fixture-independent signal) converges fully with the
  driver — its load-bearing HYPOTHESIS (Golden Chip is ONE pool with a live perResource crit) is exactly what the
  driver implemented; the driver's harness-correct STB1–STB8 (22/22 GREEN) verify every discrimination the blind
  harness could not reach.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **Golden-Chip rebuild fork (§2/§3, the highest-value same-model residual).** Confirm the popup-chip arithmetic
   on a soda-focus recording: that the "3 normal attacks during Full Burst" trigger IS the +1 Golden Chip rebuild
   source (driver + fable S2b converged; opus S6 dissented, reading the pool as monotonic decay). The driver's
   unified-currency reading is recording-validated (sim 50/43/38 vs measured 50/44/40/38/31), but the post-op
   agents share a model family, so confirm the chip count climbs between bursts on the HUD. If it does NOT, drop
   the `resource +1` generation (the pool then drains 50→33→16→0 and the ≥20/≥30 gates lapse after ~2 bursts).
2. **Skill2 rider magnitude + Time-Extension gating (§2, ⚑ med).** The flat 130 approximates the TE-II-dominant
   case; the faithful target is 52.04% (TE-I) / 137.06% (TE-II cumulative) latched at BS3 entry. Refine the
   magnitude AND add TE-tier gating on a soda-focus recording (needs an engine state-snapshot primitive — a live
   resourceGate proxy is wrong). Trigger/target/cadence are already faithful.
3. **Hit-Rate downstream core/landing (§2, ⚑ low).** The HR ▲38.91% block is kit-faithful, but its two downstream
   channels (core rate via acrForHR, pellet landing via coneSigmaFor) are over-credited vs the owner hand-count
   (docs/probe-data/soda-tb-sg-core-hr-windows.json: landing measured .931/.916/.778/.711 vs model
   .998/.995/.992/.971). Re-fit acrForHR + coneSigmaFor as a COUPLED set (never singly) — a shared-SG measurement
   residual, not a Soda faithfulness failure.
4. **Burst nuke noFb flag (§2, low, optional).** The nuke omits an explicit `noFb:true` (opus S6 set it); it is
   behaviorally FB-exempt via pre-window timing (fbMajorApplied=false). Add `noFb:true` for robustness only if a
   future engine change could route a burstCast inside the FB window; not required for GO.

Magnitudes (1.32 / 10.51 / 52.04 / 85.02 / 628.7 / 38.91 / 65.25 / 17 / 50) are all kit-literal DATAMINED level-10
prose values; the rider 130 is recording-derived (⚑). The gauntlet certified the STRUCTURE around them, not the
numbers. The gauntlet does NOT touch tuning (`tier: MODEL_ONLY` / `tuned: false` preserved).

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): all 9 lines FAITHFUL, `unmodeledVerbatim` EMPTY. Independently re-derived
  the pool-50 seed, the live perResource crit (sawtooth), the AD self+top-final-ATK-ally (excludeSelf, byFinalAtk),
  the stageEnter:3 cumulative FB-ext (+2/+5, fires on ANY B3 incl. helm), the rider TE-snapshot 137.06 (warning a
  live resourceGate is wrong post-consume), the burst 628.7 burstCast FB-exempt own-cast-only, HR≥20 core-lift,
  ATK≥30, and the −17 spend-after-gates — and pre-flagged all the shared-prior traps (pellet-vs-pull, cumulative
  ×3, stageEnter-vs-burstCast, TE-snapshot-vs-live-pool, sawtooth decay). Converges with the driver on every
  load-bearing line. `leakDetected: null` (after a redaction fix — see note below).
- **S5** (opus, blind test): SPEC converges fully (all lines FAITHFUL/FIX/MEASUREMENT-GATED; same fixture; the
  load-bearing one-pool/live-perResource hypothesis matches the driver). The test FILE is a documented harness
  artifact (o.blocks no-op + controlComp(override) + accessor drift + import path) and cannot run unmodified —
  convergence carried by the spec table + the driver's harness-correct STB1–STB8 (22/22 GREEN). `leakDetected: null`.
- **S6** (opus, blind override): **independently reproduced the driver's encoding line-for-line** from prose alone
  — pool 50/0/50; perResource-style crit; AD self + alliesTopAtk(count 1, excludeSelf, byFinalAtk); cumulative
  FB-ext ladder (+2 at ≥10, +3 more at ≥20); burst 628.7 noFb; HR≥20; ATK≥30; −17 trailing spend (gates read
  pre-consume); ALL 11 audit lines IMPLEMENTED, unmodeled EMPTY. Its three ⚑ flags (crit from-0 ramp; no rebuild;
  rider live-gate proxy) are exactly the measurement-gated forks, each with the correct recipe — and the driver
  resolves crit + rebuild via the recording. `leakDetected: null`.
- **S7** (opus, judge): **GO 1.0**, discrimination OK (no vacuous test; the S2d matrix is GREEN-vs-shipped +
  RED-under-every-counterfactual), fire-rate check passes (5 nukes = 5 casts; HR on all 5 bursts; ATK on the first
  4; 154 rider hits; all 9 FBs at 15s), **0 gotchas surviving grading** (3 measurement-gated/documented items),
  full cross-family convergence. Verdict BINDING.

**Redaction note (transparency):** the FIRST packet build leaked the chip economy through a `types.ts` comment
(lines 150/162-164 — a partial-slug fragment "(soda-twinkling" plus "soda's burst spends 17 chips (delta:-17) …
earns 1 (delta:1)") that the initial token set did not catch. Fable declared the leak and re-derived from the prose
anyway; the driver then expanded the redaction tokens ("dynamic pool", "spends 17 chips", "earns 1", "PRE-spend",
"delta:-17", "delta:1"), rebuilt the packets leak-clean, and RE-DISPATCHED all three roles — the committed results
are the clean re-dispatches (`leakDetected: null` on all three).

## 6. Board / fit note (non-gating)

Soda is fight-validated (grade 0.887 on the soda tb control recording) and appears in graded comps (board: 2
teams, ~0.806 average, COLD ▼, >15% miss — a TUNING residual). The gauntlet made **no encoding change** (the
override blocks are byte-identical; only the note/unmodeled/caveats documentation changed), so the run is
board- AND regression-neutral by construction (`board-read | grep soda-twinkling-bunny` → 0.806, unchanged;
`validate-overrides soda-twinkling-bunny` → valid). Any future board movement is fit-exposure for a separate
localization thread, never a reason to revert. `tier: MODEL_ONLY` / `tuned: false` are deliberately preserved
(the gauntlet certifies STRUCTURE, not tuning; there is no GAUNTLET tier).
