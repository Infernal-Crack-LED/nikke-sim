# DECISIONS.md — the WHY log (do not re-litigate)

Settled tradeoffs and rulings, dated, with the evidence that settled them. A future session that
wants to reverse an entry needs NEW evidence of at least the same tier (see
[CONVENTIONS.md](CONVENTIONS.md) for evidence tiers). Backfilled 2026-07-13 from the session record
and the ANSWERED trail in [open-questions.md](open-questions.md); each entry cites where its proof
lives. Newest first within each section.

## Modeling rulings (owner)

- **(2026-07-14) Supported roster = the enikk top-100 audit list, plus every hand-tuned override
  we already have** — the units the sim supports are defined by the `/enikk-audit` method (the
  deduped team compositions of the top 100 rankers across the tracked solo raids; see
  `scripts/enikk/roster-audit.ts`). The policy: (1) **model** any enikk-proven unit that lacks a
  hand-tuned override (`src/skills/overrides/*.json`) — writing base data first if it isn't in
  `characters.json`; (2) **remove** from the sim (drop from `characters.json`) any unit that is
  NOT enikk-proven AND has no hand-tuned override — i.e. parse-only units that never appear in
  the top-100 meta; (3) going forward, model new units by this same method. **Keep rule: never
  remove a unit that has a hand-tuned override, even if it later drops out of the enikk-proven
  list.** (Refined 2026-07-14 from "always keep modeled units" — "modeled" was ambiguous, since
  the sim can parse-run any `characters.json` unit without an override; the protected set is
  specifically the hand-tuned-override units, not the parse-only ones.) "Supported in the sim" =
  everything in `characters.json` (every calc tab and the web roster pull from it). First
  application (2026-07-14, 5 raids): 24 enikk-proven units to model (18 with base data, 6 needing
  data), 16 parse-only non-meta units to remove, 12 hand-tuned overrides kept despite not being
  enikk-proven.
- **(2026-07-14) The DPS-chart matrix defines a standardized 72-cell comparison grid** —
  4 control frameworks × 2 elements (neutral / tested-unit-weak) × 3 core-exposure rates
  (0 / 50 / 100%, the engine applies the 0.85 auto floor on top) × 3 investment tiers
  (scope-lock / 8-of-12 / 12-of-12 overload lines). Frameworks: *Standard* = Little Mermaid
  (Burst 1) + Crown + Helm + tested carry (four units, no Mast); *Hyper Carry* adds Mast:
  Romantic Maid (Burst 2) as a fifth unit that bursts in sync with the tested carry; *Anis*
  variants swap Anis: Star in for Little Mermaid. The tested carry sits leftmost and Helm
  anchors the second Burst 3; **the two alternate the Burst-3 cast** (Burst-3 cooldown ≈ two
  full-burst cycles), so the tested carry bursts ~7 of ~13 full bursts and Helm the rest — it
  does NOT burst every full burst. Cubes (owner-set 2026-07-14): Scope Lock stays **no cube**
  (its measured validation basis); 8/12 runs the **Other cube L10**, 12/12 the **Other cube
  L15** (`TIER_CUBE` in `src/dpschart/matrix.ts`). The 12-of-12 tier's last four lines are
  per-unit optimized via `bestOl` (once per unit, canonical context, memoized). Precomputed by
  `scripts/build-dpschart.ts` at build time.
- **(2026-07-14) Mast's "sync with focus" burst is an engine gate with a Hangover skip** — a unit
  flagged `burstGate: 'syncWithFocus'` (Mast in the Hyper Carry frameworks) may take its burst
  stage only while the focus (tested) unit is off cooldown, so it bursts with the carry and
  never in a Helm-completed chain — AND it **sits out the full burst after every 3rd of its own
  bursts** (Mast's Hangover cycle: her 10s self-stun means she can't participate in every one of
  the carry's bursts). Modeled by skipping the gated unit on every 4th of the focus unit's bursts
  (Crown fills that Burst-2 slot instead), so Mast lands ~6 of the carry's ~7 bursts. Locked by a
  `regression.ts` assertion (gated Mast casts ≤ focus casts).
- **(2026-07-14) Below-tier kit outliers are surfaced, not hidden, in the DPS chart** — running
  the full Burst-3 population exposes units the engine mis-models under specific conditions
  (e.g. Vesti: Tactical Upgrade reads 7–9× the charted median in Hyper Carry + elemental
  advantage + 12/12, from unparsed skill-1 effects compounding). Such units are Bossing-B or
  below, so they never appear in the ranked bars (SSS/SS only); they surface only via the
  compare selector, carrying their sim warnings. Fixing each mis-modeled kit is its own
  increment (cf. the ein / eunhwa / quency / xguillo outliers).

- **(2026-07-14) The Mint + Prika duet's standard play is: cast the first burst chain MANUALLY
  (Prika takes the first Burst 2 — the burstFirst rule), then full auto (Mint takes every
  later Burst 2).** This is both the validation-recording convention and the sim's modeling
  assumption for the pair; achieving it in-game requires the manual first cast with Mint
  leftmost. Verified live in the MiKa-fight recording (eleven chains, casters exact). — owner
  ruling + rrh probe MiKa recording.

- **(2026-07-13) Teams without Burst 1 + Burst 2 + two Burst 3s are rotation outliers.** They never
  exist in real play; the 3-unit test comp (anis-star · trina · cinderella) is excluded from
  rotation-model grading and kept only for its damage-popup evidence. — owner ruling, encoded in
  `scripts/experiment.ts` comp note.
- **(2026-07-13) The middle character always holds camera focus unless a run says otherwise.** Both
  a recording convention and the sim default (`focusSlug` / index `min(2, n-1)`). Focus matters:
  the focused unit's charge weapon generates ×2.5 gauge, so a recording perturbs the fight it
  records (alice +9.3% when focused). — owner ruling + measured consequence (probe-runs battery 3).
- **(2026-07-13) Knife-edge full-burst-count variance is real and accepted** when caused by a boss
  range transition colliding with a burst chain (casts are blocked ~1s while the boss is
  off-screen). Validation methodology: compare a real run against the Monte Carlo seed stratum
  matching that run's observed full-burst count. — owner mechanic + implementation in `sim.ts`.
- **(2026-07-13) milk-blooming-bunny reads ~0.7 and that is ACCEPTED** — known poor auto-play
  performer; not worth modeling further. — owner ruling (probe-runs first-pass read).
- **(2026-07-13) Run C is excluded from anis-star DPS validation** — tia counts as a "B1+"
  (re-entry Burst 1) and the tia+anis-star pairing is deliberately unmodeled (its only occurrence,
  inefficient in practice). — owner ruling (probe-runs corrections section).
- **(2026-07-13) Human-facing docs use no invented abbreviations** (probe/fight code names written
  out; widely known game terms like B1/MG are fine). AI-facing docs (handoffs, override notes) may
  use any shorthand. — owner ruling; memory `doc-audience-abbreviations`.
- **(2026-07-12) Distributed damage deals the same TOTAL vs one target as vs many** — never model a
  split penalty. — owner ruling (memory: validation conditions).

## Measured mechanics (video/frame evidence — reversing needs new footage)

- **(2026-07-13) Generation is LOCKED during Full Burst.** An in-FB-generation interpretation was
  briefly adopted from bar-anatomy curves and corrected by the owner the same day: the fast post-FB
  refill is charge units releasing held full charges right after the boundary + normal team rates.
  With the ~3s post-FB chain-open delay binding, rotation results are identical either way. — owner
  correction over my over-read; burst-gauge.md §1.
- **(2026-07-13) The next burst chain cannot open until ~3 seconds after Full Burst ends.**
  Measured: chain glow at FB-end +3.0s even with refill complete and the Burst-1 cooldown ready at
  +1.5s. This closed the last graded rotation gap (run I 14→13 full bursts). — bar anatomy,
  `POST_FB_CHAIN_DELAY_FRAMES` in sim.ts.
- **(2026-07-13) The gauge bar's full-but-resting render is 83.5% of its pixel width**; readings
  ≥96% are the pre-chain glow. Any future bar-reading analysis must use this calibration (a
  mis-read here caused the in-FB-generation over-read above). — 9-second wait-at-full stretch in
  the 3-unit recording.
- **(2026-07-13) Auto-burst selection is leftmost slot order, WITH waiting**: within a timed stage
  window the chain waits for the leftmost stage-filling unit whose cooldown ends before the window
  closes. Owner ruling: a 3rd-from-left Burst 3 (maiden in the elec-weak fight) never bursts on
  auto. A least-recently-burst round-robin was tried the same day and REJECTED (bench B3s cast
  where real fights never pick them). — burst-gauge.md §3; Monte Carlo bifurcation evidence.
- **(2026-07-13) The ×2.5 charge-gauge bonus is camera-focus-ONLY; unfocused charge units generate
  flat ×1.0.** Measured with a paired 2-unit experiment (takina unfocused +5.6%/shot vs focused
  +14-15%/shot). The additive `full_charge_burst_energy` hypothesis is excluded (would read +8.1%).
  Earlier compensators (×2.2 ⚑, ×1.75) are deleted. — battery 3 A1/A2; open-questions A24.
- **(2026-07-13) Anis: Star's gauge row is a standard launcher (280); her battery reputation is
  kit generation** (Skill-1 proc gen + 6% team aura). The synergy-API per-shot column folds skill
  generation into its numbers (owner hypothesis, confirmed by her solo measurement) — that column
  is retired as a data source. — battery 3 A3; open-questions A25.
- **(2026-07-13) Burst-cast damage misses the +50% Full Burst multiplier AND full-burst-entry
  auras** (treated as landing before Full Burst); buffs live at cast (including allies'
  burst-granted buffs from the same rotation) DO apply. Settled by cinderella nuke popups
  (non-crit/crit pair at 98.7% of the no-FB branch, ×1.5 crit ratio) after an interim
  opposite ruling was reverted on measurement. Independently corroborated by the JP DayWrite
  damage-formula article, which uses cinderella's own numbers. — open-questions A19; tb2 test 1+2.
- **(2026-07-13) Projectile Explosion Damage DOES buff plain rocket-launcher normal attacks.**
  Buff-independent ratio test exact to four digits (rocket-core ÷ proc = 1.2491 = prediction).
  — open-questions A20; tb2 test 2.
- **(2026-07-13) Jill fires at 150 rpm (2.5/s) with a rolling reload (reload_start_ammo 8 — no
  reload downtime).** Her per-hit popup values matched the sim at 99.7% before the fix; the entire
  1.67 residual was cadence. Independently corroborated by ore-game's measurement (2.5 shots/s).
  — open-questions A21; tb2 test 4.
- **(2026-07-13) Pierce does NOT double-hit core+body on the partless test boss** — every alice
  shot is one popup. `PIERCE_CORE_DOUBLE` stays false (multi-part-boss mechanic). — open-questions
  A23; tb2 test 5; earlier A/B rejection.
- **(2026-07-13) Cinderella's burst cooldown is 40s (the DB is right).** A same-day 20s misread
  came from cut-in false positives in the burst-bar profile; counting her nuke storms directly
  gives 40s intervals. Corollary: burst-bar FB detection is untrustworthy near cut-ins — count
  nuke/laser signatures instead. — tb2 test 2 re-analysis.
- **(2026-07-13) Moran's team-wide 7.48s burst cooldown reduction on Full Burst entry is real**
  (Fervor-gated in kit text; required by the recorded run-B alternation math). A same-day
  suppression of it was reverted. KR-corroborated. — run B video; open-questions A22.
- **(2026-07-13) Full-burst counts are cooldown/chain arithmetic and deterministic run-to-run**;
  the graded comps are pinned as regression asserts (run B 11, run I 13, run E 11-12, run G
  13-14) in `scripts/regression.ts`. — battery 3 rotation work.
- **(2026-07-13) Combat ATK truth is the sim's staticAtk** (Attackers 120,143 / Supporters
  100,130 / Defenders 80,118 at scope lock), NOT the battle-records displayed ATK. Video-verified
  twice. — u8 videos; memory.
- **(2026-07-13) Damage popups on screen belong ONLY to the camera-focused unit** (including damage
  RECEIVED by that unit's own summons, e.g. boss hits on cinderella's Decoy). Value-coincidence
  attribution across units is forbidden — it burned us twice. — u8 processing; owner corrections.

## Engine/data-architecture decisions

- **(2026-07-14) Machine guns receive the +30% effective-range bonus in the FAR band only.**
  MEASURED: the crown solo recording read the class-ratio signatures per band — bonus present
  in far (core÷body 1.769, crit÷core 1.217), absent in mid, near (twice), and mid-far (seven
  reads in the pre-registered decisive window). Replaces the calibrated mid-far grant (whose
  own code comment said "never" — both wrong). The flips track the boss's instantaneous
  distance, not the scripted timeline (±4–6s edge lead/lag during walks), so the band table is
  an approximation; a distance-ring model is a possible refinement, validation timestamps
  already in the probe u7 video. Panel-accepted 2-of-2. Board impact ≈ nil (correctness fix).
  — probe u7 battery 4; game-mechanics §5.

- **(2026-07-14) "Elemental Advantage Attack Damage" lives in the ELEMENT bucket** (Element =
  1.1 + value, its own multiplier), not additively inside Damage Up. MEASURED: the privaty-focus
  recording (test battery 5) read her in-window/out-of-window popup ratio at 2.8244 on three
  independent boss-range band pairs — the Element model predicts 2.821, the Damage Up model
  1.995 — with her last-bullet proc and burst-volley classes corroborating on the Element branch
  and all controls matching. Also matches the decoded reference simulator (nikke-einkk); the old
  Damage Up placement was unsourced. Panel-accepted 2-of-2 with a clean compliance check.
  Board effect: privaty 0.77→1.00, the electric-weak validation team +8–19% (movers ride
  Maiden: Ice Rose's aura), all non-carriers byte-identical. — probe u7; experiment log
  2026-07-13/14; sim.ts Element bucket.

- **(2026-07-14) Snow White: Heavy Arms's Fully Active mode ends on USES (her 2nd swapped
  shot), not on a 6.5-second timer**, and its Charge/Sequential buffs are held per swap round
  (active only while swapped). MEASURED: seven of her burst windows observed end-to-end — two
  delivered the second shot at +7.1/+7.2 seconds (beyond the old timer) with the mode visibly
  active, and the weapon reverted right after shot 2 in every window, at variable times. The
  engine models this as `maxShots` on the weapon swap plus a `whileSwapped` buff gate.
  Panel-accepted 2-of-2. This closes the residual open item from the volley entry below.
  — probe u7 team-two recording; experiment log 2026-07-14.
- **(2026-07-13) Snow White: Heavy Arms's Fully Active extra volley lands per-shot on her two
  swapped full-charge shots INSIDE the Full Burst window** (a `swapGate` shot-fired proc,
  1055.9% each, critting like her baseline volley), not as a cast-instant lump. Twice-confirmed
  community sourcing (gamewith JP: the Fully Active buffs are held per fully-charged shot;
  Prydwen: the 5→15 lock-on structure), corroborated by era archaeology — she validated at
  0.95–1.06 before the measured cast-boundary revert stranded the old lump outside the window's
  buffs, and returns to ~0.96–1.00 with the fix. Panel-accepted (blinded second judge +
  compliance check) after a pre-registered A/B moved only her four rows, byte-identical
  elsewhere. Residual open item: whether a swap shot lost to the 6.5-second window still
  delivers its volley (uses-based vs time-based) — logged, worth ~2%. — experiment log
  2026-07-13; her override note.

- **(2026-07-13) Gauge data comes from the datamined CharacterShotTable
  (`data/gauge-per-shot.json`), NOT the synergy-API `burstGaugePerShot` column** — that column's
  semantics vary per unit (sometimes base, sometimes target, sometimes target ×2). The synergy
  `rl3` column decodes as first-3-seconds arena-opener generation and serves as a roster-scale
  cross-validation (74/101 exact) plus a quantified per-unit kit-generation catalog. —
  burst-gauge.md §2/§7.
- **(2026-07-13) Per-unit kit generation quirks are modeled from twice-confirmed specs only**:
  helm +14.31 flat per shot, liberalio ×6 volley hits, ein's orb (+560/2.83s as a zero-damage
  dot), jill's acid tick. Ambiguous ones (SWHA's hit pattern, battle-start battery fills) stay
  documented-unmodeled in open-questions U11c. — rl3 arithmetic + synergy annotations.
- **(2026-07-13) The same-caster-same-slot buff overwrite rule stands** (crown's twin 44.35% reload
  lines never co-stack). Namu shows her kit actually targets disjoint groups — the rule matches
  real kit structure. A cross-unit same-name overwrite was tried and REJECTED (broke ein/ada). —
  game-mechanics §11; crown override note.
- **(2026-07-13) Subtractive formulas for charge speed and reload** (`base × (1 − buff)`, floor 1
  frame, +13-frame reload tail), not divisive. Corroborated: ore-game's reload-at-100% measures
  0.2s = exactly the tail. Hand-averaged charge-speed overrides calibrated under the old divisive
  form were re-expressed, not reverted. — charge-weapons.md; jill verification.
- **(2026-07-13) Release latency (22 frames) applies to snipers AND launchers by default**;
  autofire is the sparse exception list (`charFixes.noBoltRecovery`). Classified by owner testing
  + the maiden/helm measurements; only tia remains unclassified. — charge-weapons.md §2.
- **(2026-07-13) Function-type additional damage crits at the caster's rate, never cores, never
  gets range** (datamined FunctionTable + Prydwen + JP). Crit-on-procs is default ON; dot tick
  crit unverified and kept OFF. — nikke-damage-formula.md §3.
- **(2026-07-13) Measured constants are never refit**: the MG wind-up ladder, the SR 22-frame
  release latency, the boss range script, the 83.5% bar render, the post-FB 3s chain delay,
  per-unit popup-verified values. Calibrated values carry a ⚑ and are standing refit candidates;
  measured ones are not. — CONVENTIONS.md evidence tiers.
- **(2026-07-13) Monte Carlo mode is opt-in via `cfg.seed`** with the deterministic expected-value
  path byte-identical when unset (web UI stays deterministic). Seed contents: crit/core Bernoulli
  rolls, boss transition jitter ±2s, chain-gap jitter — chosen to mirror the owner's two real
  variance sources (crits, boss movement timing). — types.ts; experiment.ts SEEDS mode.
- **(2026-07-12/13) Validation basis is the scope-lock preset** (no cube, no doll, OL0, 3★ core 7,
  sync 400, 10/10/10, treasure on, partless boss, full auto, 180s), repeatability 0.5–3.5%/unit —
  deltas under ~5% are noise; the ±3% per-unit goal therefore requires multi-run averages with a
  declared focus unit. — memory; owner methodology discussion.

- **(2026-07-14) Rapi: Red Hood's burst nuke is a flighted, charge-gated missile landing
  inside her window at the full buffed state** (measured across three focused recordings: the
  landed values fit the full in-window recipe at +0.02%/−0.4%/+1.1%; it skipped the one banner
  where she had under 120 shots banked; one instance landed as a crit). Her burst's +421%
  attachment buff is measured-inert and removed. Landing these corrections EXPOSED her
  remaining deficit as a consistent ~22–28% of real damage that renders no popups (the
  "invisible X") — deliberately left open rather than re-tuned away. — rrh probe recordings;
  experiment log "RAPI SYNTHESIS FINAL" + landing entry.

- **(2026-07-14) Liberalio's 202.5% full-charge proc receives the +50% Full Burst term by its
  landing timing** — the legacy no-Full-Burst flag was a calibration-era relic contradicting
  the datamined function-damage rule (skill procs take Full Burst by actual timing; the
  cast-instant exemption is burst-slot-scoped) and split one physical event's treatment (her
  charge hit got the +50%, its own proc didn't). Panel-accepted 2-of-2. Her rows moved exactly
  as predicted (wind-weak team one 0.85→0.95, iron sweep 0.83→0.93, wind-weak team two
  0.82→0.90); the no-range exemption stays (datamine-confirmed). CONFIRMED AT MEASURED TIER
  (2026-07-14, her focus recording): four in-Full-Burst proc crit-step pairs read ×1.3333
  exactly — the with-Full-Burst signature; the without-branch value never appears. Note: this
  behavior is PER-KIT — Scarlet: Black Shadow's procs measured the OPPOSITE (genuinely
  exempt), so a unit's function-damage Full-Burst treatment must be verified per kit, never
  assumed from the class rule alone. — experiment log 2026-07-14; her override note.
