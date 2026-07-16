# DECISIONS.md — the WHY log (do not re-litigate)

Settled tradeoffs and rulings, dated, with the evidence that settled them. A future session that
wants to reverse an entry needs NEW evidence of at least the same tier (see
[CONVENTIONS.md](CONVENTIONS.md) for evidence tiers). Backfilled 2026-07-13 from the session record
and the ANSWERED trail in [open-questions.md](open-questions.md); each entry cites where its proof
lives. Newest first within each section.

## Modeling rulings (owner)

- **(2026-07-16) Rapi: Red Hood's projectile-EXPLOSION class cores ~1/3, is DERIVED from the real rocket
  meter (120→60 in-FB cadence + in-burst instant detonation), and her fictional damage placeholders are
  removed — partially closing the "invisible X".** Reopens the 2026-07-14 invisible-X entry below with new
  same-tier evidence (video re-read of `probe u7/rapi focus vid.MP4`, `docs/probe-data/rrh-explosion-core.json`).
  MEASURED: explosion core fraction **~1/3** (0.30–0.45, N=9; the plain WHITE non-core body dominates every
  burst, red "CORE HIT" bodies are the clear minority — explicitly NOT near-full coring, correcting an earlier
  ~3× over-assumption). Model: explosions core via a per-release RATE on the `coreOverride` path
  (`storedHit.core:0.33`) — aim/range-INDEPENDENT, NOT the weapon/band acr table (they detonate on the boss
  body regardless of aim). This does NOT contradict the landed "stickies never core" ruling — that was the
  small out-of-burst ATTACH class (~340–620k, still no core); the in-burst EXPLOSION is a different hit type.
  Two engine additions: (1) a per-effect `instantInFb` in-FB release path so a rocket that attaches DURING
  Full Burst detonates immediately (was the ENV.XINSTEXPL experiment path, now permanent); (2) `hitCount.countInFb`
  so her meter fills 2× faster in FB (120→60), with the rocket count DERIVED from her wind-up-aware shot count,
  not fit. The old fictional magnitude placeholders (a stage-3 2s dot pair + a storedHit charges:5 batch whose
  popups were invented) are REMOVED and the explosion damage re-derived from the mechanic. RESIDUAL LEFT
  EXPOSED as a prediction (Fable R6): atkPct stays kit-datamined 88.11 (NOT re-fit), core is the measured 0.33;
  the remaining deficit (T7 still 0.81) is left visible — part generic MG-cold (board ~0.947), part the
  OBSERVED-but-unmodeled explosion CRIT (deferred to its own gated pass; U1 says additional-damage crits at the
  caster's rate, so it likely needs no new parameter). Impact (sim-vs-real): T3 0.84→0.91, T7 0.72→0.81,
  T8 0.84→0.90, N1 0.92→0.98 — uniform +0.06–0.09, none overshoot, FB counts invariant. Small teammate drifts
  (crown −0.82%, cinderella +0.88%) are a legitimate second-order coupling: the rocket ATTACH is a skill-damage
  hit that generates burst gauge (pre-existing engine rule), so the new in-FB cadence shifts FB timing ~1–2s in
  the back half. Fable pre-op APPROVED-W-6-REVISIONS + blind post-op LAND (all 6 verified executed). — rrh
  explosion-core measurement + Fable pre/post-op; open-questions U1.
  **CRIT FOLLOW-UP (2026-07-16, same day):** enabled crit on her explosion release (`storedHit.crit:true`),
  justified by CONSISTENCY not magnitude — every other RRH hit already crits additively at her sheet rate in the
  validated model; only the stored-hit release was crit-OFF (an artifact exemption). The observed ×1.5 "crit step"
  is CONFOUNDED (overlapping sub-hit coefficients 1.6–4.5M) so it is NOT load-bearing; what's solid is that
  explosions crit (orange bodies) and the sim explosion body is UNDER the measured white body (crit moves toward
  1.0 from below, not over-credit; the FB +50% on explosions is corroborated — stripping it worsens the fit).
  Impact: T7 0.81→0.83, N1 0.98→0.99, T3/T8 +0.01 — uniform, MG-cold residual PRESERVED (pre-registered guard:
  T7 must stay <0.90; landed 0.83). Isolated blast radius (crit doesn't touch gauge/timing → zero teammate drift).
  Fable pre-op ACCEPTED the consistency framing + blind post-op. LEDGERED not-blocking: whether the crit/core
  bracket is additive (as the sim models) or multiplicative — the ×1.80 core+crit body doesn't compose cleanly
  under additive constants; foundational, applies to all 86 readings, bounded ~0.3–0.4% (open-questions U15).

- **(2026-07-15) Grave's reload is MEASURED at 3.35s / 201 frames, not the datamined 81f — her dropped "Heat
  Emission: Reload Ratio ▼50%" reload mechanic is re-modeled (reload speed IS damage).** Her override previously
  dropped this S1 line as "defensive weapon-state, no damage"; that was an error — reload time gates shot count
  gates damage. Evidence (same-tier, overturns the datamined effective reload): `grave solo.MP4` (Shooting Range,
  owner-confirmed mechanically identical to the scope-lock raid), read by counter frame-diff (each landed shot =
  one 1-frame spike on the fixed damage counter — the SG-lesson gold standard). Direct count: **20 reloads → ~1230
  shots** (the sim fired 1620). Reload gap last-shot-landing→first-shot-landing = **median 201f (3.35s), n=19,
  tight 2.85–3.52s**. CONTROL: nayuta (SMG) measured reload = her 111f spec exactly → no universal reload/re-aim
  overhead; the 2.5× is grave-specific. Refuted literal readings of "▼50%": reloadSpeedPct−50→131f (too fast);
  speed-halved→~184f (17f short); reload-AMOUNT-halved (partial mag) refuted by 61.5 shots/gap = full 60-round
  mags. **Mechanism attribution is inferred, not isolated** — she only ever reloads in Heat Emission (Prediction
  burst grants unlimited ammo), so "▼50% + overhead" and "datamined reloadFrames simply wrong" are observationally
  identical; the operative value (201f) is measured, the narrative is best-candidate. Mechanism: `charFixes.reloadFrames=193`
  → `reloadFramesNeeded(193,0)=201f`, which reproduces the measured gap AND composes with any real reload-speed buff
  (NOT a fake reloadSpeedPct −138, which would break composition — Fable R1). Impact: grave solo 1.277→**1.005**
  (shots→1267); her 3 comps 0.85/0.84/0.83→**~0.82** (small, since Prediction's unlimited ammo covers most comp
  time). This REMOVES a compensating over-fire error and is allowed to worsen the comp headline (faithful>fit); the
  residual ~0.82 comp under-model is the separate AR-carry burst-window gap (open). DEFERRED follow-up (Fable R2):
  the same clause's Prediction-END "remove 100% of bullets" forces ~1 extra 201f reload per burst cycle in comps —
  not yet modeled, no longer classifiable as "defensive." Gate: Fable pre-op APPROVED-WITH-REVISIONS (Option B),
  R1–R4 satisfied. TRANSFERABLE (2nd time a shot-count channel was mispriced after SG pellets): weapon-state
  modifiers — reload, ammo, attack-speed — are damage mechanics; "defensive" requires PROVING they don't gate shot
  count. See [modeling-priors.md](modeling-priors.md) + open-questions A27.

- **(2026-07-15) The 11 override-only, non-enikk-proven units are REMOVED from the sim/site (owner "Option 3"),
  overriding the KEEP rule for them.** Units: tia, phantom, 2b, dorothy (base AR), emma-tactical-upgrade, exia,
  privaty-unkind-maid, vesti-tactical-upgrade, eunhwa-tactical-upgrade, chime, ark-ranger-black. They were kept
  only by "never remove an override-backed unit"; the owner chose to stop serving/supporting them (site clutter,
  no further dev). Mechanism: their overrides moved to `src/skills/overrides-legacy/` (historical record — NOT
  loaded; the sync prune only protects `src/skills/overrides/`), and they were deleted from `data/characters.json`
  + the 5 graded comps that used them (PC, PD, N4, N8, N10) in `experiment.ts` + `regression.ts`. **Cost paid:
  24/146 comp-rows (~16% of the validation board).** Collateral meta units mostly survive via other comps;
  snow-white also has control-group recordings; laplace/eve/arcana may lose their only main-board anchor (check
  control recordings if they need grading). Do NOT restore these units without owner say-so. (NB `dorothy-serendipity`,
  the SG attacker, is a DIFFERENT unit and is KEPT.) — owner ruling; see `src/skills/overrides-legacy/README.md`.
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

- **(2026-07-14) The Full Burst +50% is a TIMING/snapshot gate, not a damage-type rule (JP+KR research,
  empirical both sides).** An instance gets +50% iff it is evaluated while the Full Burst STATE is live;
  the +50% is additive inside the Major-Modifiers bracket (with crit/core/range). Per type: normal fire
  → FB (live per-frame); **burst INSTANT/front cast damage → NO FB** (snapshots at use-time, before FB
  flips on — KR measured Cinderella front-hit; matches U10); **additional/function damage (procs/riders)
  → FB** by activation timing, but never core/range (KR: Cinderella additional dmg + nikke.gg asterisks;
  liberalio ×1.333); **DoT/sustained → FB** (JP MEASURED: ginmy Mana DoT 297,240 = predicted-with-×1.5);
  distributed → like additional EXCEPT **Modernia's Paradise Lost = no crit/FB** (only genuine type-
  exemption). Range (+30%) stays skills-never. IMPLICATION: `FBRULE=timing` (sim.ts `skillNoFb`) is the
  correct rule; the 6 per-kit `noFb` flags (little-mermaid, privaty, jill, maiden-ice-rose, eve, scarlet)
  are calibration RELICS (as liberalio's was, removed when measured), grading the board only via
  offsetting errors. NOT yet flipped — a blanket `timing` default destabilizes those 6 calibrated units;
  landing is a per-unit re-audit increment (remove noFb, fix the compensating over-model, re-grade), like
  the liberalio re-tune. Framework: `scripts/probe/fb-range-lab.ts` + FBRULE knob (open-questions U14).
- **(2026-07-14) Auto-aim core rate is WEAPON-CLASS-INDEXED, not a flat 0.85 (⚑ refit).** MG/SR/RL =
  0.95, AR/SMG/SG = 0.85 (sim.ts `acrFor`). **[AR/SMG/SG value SUPERSEDED 2026-07-15 — now
  range-dependent per (weapon, band); see the range-dependent core-rate entry below. MG/SR/RL 0.95 stands.]** A per-weapon focused-footage scan (open-questions A15)
  read MG (crown), SR (liberalio), RL (maiden) coring ~near-100% (red "CORE HIT" ~every normal shot)
  vs AR (snow-white) / SMG (LM) mixed ~0.7-0.9; JP research (note.com reticle study, ore-game,
  arca.live) independently says the reliable auto classes core ~0.95-1.0 while AR/SMG/SG are
  accuracy/range-gated. An MAE sweep on the graded board sets the MG/SR/RL value at 0.93-0.95 (the
  ~12.5px auto reticle floor + wind-up shots keep it below 100%), improving board MAE 0.1331→0.130 and
  within-10% 56%→60% with no per-unit recalibration. FB counts unchanged (core rate ≠ rotation);
  snapshots regenerated. Still ⚑ (calibrated) — a precise per-shot count or the geometric reticle model
  refines it. DoT/rider crit was investigated alongside (ginmy + maiden footage confirm the mechanic)
  but NOT flipped: net-neutral on board MAE and it double-counts measured-dot units (e.g. guillotine's
  DoT is popup-measured) — held as a default-off `DOTCRIT` knob pending a per-unit de-crit recalibration.
- **(2026-07-15) Auto-aim core rate is RANGE-DEPENDENT per (weapon, band), applied per-shot — the flat
  per-weapon 0.85 (AR/SMG/SG) is OVERTURNED (⚑ refit, same-tier footage).** Three scope-lock SOLO
  recordings (Scarlet AR, Chisato SMG, Drake SG — no Full Burst, so clean out-of-FB reads) binned every
  normal-attack core popup (red/"CORE HIT" text) by the engine's boss-range band. Core is strongly
  **range-concentrated** (high when the boss is close → ~0 when far), **FB-independent** (aim geometry,
  not FB state — solo reads carry no FB, cross-checked LM in/out-of-FB ≈ equal), and **weapon-ordered
  AR > SMG > SG** (one accurate AR bullet cores most; SG's 10-pellet spray finds the small central core
  least, ~7% even point-blank). ALL measured bands sit far BELOW the old flat 0.85. Per-band ⚑ (Wilson
  95% CIs in `docs/probe-data/coreband2-*.json`): AR near 0.40 / mid 0.30 / midfar 0.03 / far 0.00;
  SMG near 0.28 / mid 0.244 / midfar 0.076 / far 0.059; SG near 0.072 / mid 0.00 / midfar 0.0045 /
  far 0.00. MG/SR/RL kept flat 0.95 (not measured per-band; research says ~100% once warmed; MG still
  gated by its wind-up ramp). Engine: `acrFor(weapon, band)` + `CORE_BY_WEAPON_BAND` table (sim.ts;
  call site already had `bandAt(frame)`); knobs `ENV.ACR` (flat override), `CORERATE=flat` (old flat
  0.85), `CORERATEBAND=off` (prior flat per-weapon table, for A/B). The **union raid boss is the SAME
  physical boss across element assignments** (owner) → these per-band values transport across every
  validation comp. **Falsifiable test (confirmed):** ONLY AR/SMG/SG rows moved (146-row board), ALL
  downward; MG/SR/RL rows byte-identical (Δ 0.000); LM's SMG residual closed exactly as predicted
  (1.36→1.00). Per-weapon mean ratio: AR 1.095→0.881, SMG 1.069→0.831, SG 1.106→0.755. Board median
  0.995→0.950, MAE 0.141→0.144 (≈flat), within-±10% 53→56%. The re-centering to ~0.95 is EXPECTED and
  diagnostic, not a regression to refit: the flat 0.85 was over-crediting cores in a way that masked
  pre-existing AR/SG under-models. Do NOT tune the near values up to re-center (that is fitting-to-data).
  [SG near 0.072 CORROBORATED 2026-07-15 by online research (ore-game verify-memo ~6% front row, auto/base
  accuracy) — it is NOT a lower bound to raise; the cold-SG residual is a separate under-model, not the
  core rate. `docs/probe-data/sg-core-research.md`.]
  Still ⚑: AR near 0.40 now CONFIRMED (2026-07-15) by a Moran solo re-record — direct count 0.40 AND an
  ammo-verified damage reconciliation 0.40 agree exactly, and the two-method agreement removes the
  ~10% Scarlet non-core-error concern (two independent AR units converge on near ≈0.40). AR mid/midfar
  carry boss-distance-in-window noise (Moran's scripted "midfar" sat at medium range) — the near value is
  the reliable, damage-dominant one. The geometric
  distance→core-size model + SG 0–25 research refine it. FB/measured-truth asserts unchanged; snapshot
  regenerated. — 3 solo recordings + coreband2 measurements; open-questions A15; scientific-method
  harness post-op panel (Fable ACCEPT) + owner ruling IMPLEMENT.
- **(2026-07-14) The scope-lock boss's DEF is negligible; `bossDef: 0` stands.** Enemy DEF in
  NIKKE is a small FLAT, subtractive value (min-1 damage floor), applied inside the base term
  before the skill coefficient — `dmg = max(0, effectiveATK − bossDEF) × atkPct × …`. ginmy.net's
  def test (empirical, /nikke_def_test) measures Union-Training mobs at DEF 100 and boss-type
  enemies at ≈140. At scope-lock effective ATK (~78,707–118,027 base5, higher with buffs) a DEF of
  140 moves any unit's total by ≤0.12% — an order of magnitude under the ~3% single-run
  repeatability floor. Independently, our clean **datamined-coefficient** popups already matched the
  sim to ≤0.3% at `bossDef:0` (cinderella rocket 121,124 = 32.11%×…; opening popups 99.7% on four
  classes), which bounds the DEF from OUR ACTUAL raid recordings to |DEF| < ~240. Both lines agree.
  `scripts/battery/boss-def.ts` sweeps DEF and confirms the board only shifts materially above
  ~2000–5000, which is ruled out. Setting `bossDef` to 140 is "more correct" but changes every
  snapshot by <0.2% (below noise) and is deferred to the owner. — ginmy def test + our popup bounds
  + boss-def battery; engine DEF placement (baseAtk subtraction) confirmed correct by ginmy
  atkbuff/atkdamagebuff tests (+ATK inside the paren, charge & skill mult outside).
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
- **(2026-07-14) Scope lock uses BASE 5 gear, not OL0 — the validation basis is corrected.**
  The owner measured the in-game scope-lock gear set (docs/data/gear-doll.md "Base 5"): its ATK is
  ~1.76% below the OL0 T10 set the sim had been using. Adding `'base5'` as a gear level (src/stats.ts,
  the `ol` field now `GearLevel = 'base5' | 0 | 5`) and pointing every scope-lock config at it drops
  every unit's staticAtk uniformly −1.76% (Attackers 120,143→**118,027**, Supporters 100,130→**98,367**,
  Defenders 80,118→**78,707**) and every damage total −1.76%. A global recalibration, not a per-kit
  retune (relative accuracy unchanged; the board just reads 1.76% colder). CONFLICT/FOLLOW-UP: the
  prior "video-verified exact" popup matches against the OL0 staticAtk (e.g. cinderella 80,118) now
  disagree with Base 5 by 1.76% — those verifications either weren't precise to that margin or need
  redoing at the corrected basis. — owner in-game measurement 2026-07-14.
- **(2026-07-13, SUPERSEDED by the Base 5 correction above) Combat ATK truth is the sim's staticAtk**
  (was Attackers 120,143 / Supporters 100,130 / Defenders 80,118 at scope lock — now the Base 5
  values), NOT the battle-records displayed ATK. Video-verified twice (against the OL0 numbers).
  — u8 videos; memory.
- **(2026-07-13) Damage popups on screen belong ONLY to the camera-focused unit** (including damage
  RECEIVED by that unit's own summons, e.g. boss hits on cinderella's Decoy). Value-coincidence
  attribution across units is forbidden — it burned us twice. — u8 processing; owner corrections.

## Engine/data-architecture decisions

- **(2026-07-15) Pellet-consolidation mode — a config-driven range-gated firing state (dorothy-S; STEP 2 of
  the sequenced SG fix).** New generic engine mechanic: a `ConsolidationConfig` on the override
  (`triggerLandedPellets`/`shots`/`coreRate`/`pelletFraction`/`attackDamagePct`/`pierce`) → after N
  near-LANDED pellets accrue, the unit fires K single aligned bullets (`pelletFraction` of a full 10-pellet
  shot) at `coreRate` with a window-only Attack-Damage add + live Pierce-DAMAGE, instead of the spray. Near-
  gated (matches the OBSERVED near-only consolidation — the small mid/far boss doesn't afford the trigger);
  the "80 landed on the small core" story is interpretive, the near-gate is measured. Engine: `firePull`
  accumulator + `dealDamage` `coreOverride`/`extraDmgUpPct`/`pierceActive` opts (all generic; the values live
  in dorothy's override, no engine branch). Pierce DOUBLE-hit stays OFF (R1: enabling re-litigates the settled
  `PIERCE_CORE_DOUBLE=false` without same-tier evidence). The previously PERMANENT +72% attack (a measured-
  contradicted fudge — really ~17% of shots) is REMOVED, applied only in-window. Bullet validated: sim ~122.7k
  out-of-burst vs measured ~110k (+11%). Fable 2-of-2 LAND. dorothy PH 0.69→0.44 / N9 0.55→0.35 (removing the
  fudge dominates); criterion "moves up" FAILED but Fable ruled it a smuggled bet on the UNRELIABLE in-burst
  reads — landing the faithful pieces beats keeping a known fudge. Rotation pins EXACT. dorothy's rows are
  BLOCKED-pending a burst-isolated recording (are the 1.1–1.55M in-burst singles consolidation cores or
  Burst-III cast? open-questions A26); do NOT chase her 0.44/0.35 with tuning. — dorothy solo footage +
  scientific-method harness (both Fable gates).
- **(2026-07-15, FINAL) SG pellet-landing = near 0.90 / mid 1.0 / far 0.75 / midfar 0.90 — measured from a
  running-DAMAGE-COUNTER reconciliation (noir clean solo), which OVERTURNS both the popup-count 0.60 and the
  flash-count "0.60 validated" below.** Two visual methods (the Step-1 popup count and a later impact-flash
  count) BOTH under-read a dense cluster of ~10 tightly-overlapping IDENTICAL pellet numbers as ~6 — occlusion
  of indistinguishable items. The arbiter is noir's in-fight cumulative damage counter (arithmetic, and noir
  CANNOT burst solo so the total is rider-free): per-mag delta = 392,426/near-shot vs sim 238,927 = 1.64× →
  ~10 pellets land near, not 6. A single-shot A/B popup-sum (~333–405k) matches the 392k/shot → the damage
  RENDERS (no invisible channel); the landing CONSTANT was just too low. Per-band ratios (mid 1.66, near 1.48,
  far 1.64, midfar 1.61) × the old landing → **near 0.90, mid 1.0, far 0.75, midfar 0.90** (near uses the
  measured 0.9, not an eyeballed 0.95 — Fable). VALIDATION: the SAME values reconcile TWO independent clean SG
  solos — noir 64.87M→ratio **1.01** and dorothy 96.8M→**1.01** (dorothy's consolidation fixed separately/prior,
  the out-of-sample anchor). Board (122 rows): MAE 0.120→0.114, median 0.950→0.970, within-±10% 59→63%; all 13
  full-burst pins exact. Core rate / per-pellet / cadence UNTOUCHED (counter localized the gap to landing only).
  Knobs: `ENV.SGLANDING` = `legacy` (old 1.0/0.3) / `popupcount` (0.60 flat) / default (this). Fable post-op
  LAND-after-revise. **OPEN (Fable's catch):** the SG CORE RATE (0.072) was a visual popup RATIO over the same
  clusters — the under-read hits the whites (denominator) but spares the distinct red cores (numerator), so it
  is likely INFLATED; with landing now corrected up, that shows as a small residual SG comp warmth (noir
  1.04–1.05) — do NOT trim landing to cool it; re-derive the core rate from the counter/A-B. Single-boss (large
  hitbox); do not generalize the band values to small-hitbox bosses. — noir counter-reconciliation; scientific-
  method harness.
- **(2026-07-15) SG core rate near 0.072 → 0.048 (counter-rederived; the popup-ratio value was ~1.5× inflated).**
  Follow-up to the landing fix above (Fable's catch, now resolved). The old SG core rate was `red-core-popups /
  visually-counted-white-popups`; the whites were under-counted (~6 vs true ~9–10), so the ratio's denominator
  was too small → inflated. Re-derived popup-count-free as **cores-per-shot / TRUE-pellets-per-shot** (true
  pellets from the noir landing): near 0.435 cores/shot ÷ ~9 = **~0.048** (was 0.072); midfar ~0.003 (was
  0.0045, immaterial); mid/far stay 0 (zero numerator — the denominator fix can't change zero). Damage-arithmetic
  cross-check (0.045–0.05) + range-concentration confirm. Both clean SG solos STAY reconciled (noir/dorothy 1.01),
  and the residual SG comp warmth cools (noir 1.04→1.03, naga 1.03→1.02). Measured, not board-fit; the small
  remaining comp warmth (~2–3%) is a separate buff-interaction, not the core rate. `docs/probe-data/sg-corerate-rederive.json`.
  **[The two entries below are SUPERSEDED — kept for the doc-hygiene trail.]**
- **(2026-07-15, SUPERSEDED) SG pellet-landing is per-band ~FLAT (~0.45–0.60), not a 1.0-near/0.30-else step (⚑ refit,
  measurement replaces a contradicted calibration).** The old `SG_OUT_OF_NEAR_HIT_FRACTION` ⚑ (near = all 10
  pellets land, else 0.30) was calibrated against the OLD flat-0.85 core model — an offsetting-errors pair.
  Damage-arithmetic measurement (Drake solo, popup-dropout≈1.0 VERIFIED via the closed-book 53.97M global
  total, `docs/probe-data/sg-pellet-landing.json`): landing is ~flat across bands — near **0.60**, mid 0.60,
  far 0.45, midfar 0.55. BOTH edges of the old ⚑ were wrong: near is ~0.60 (the gappy spider-mech silhouette
  lets ~4 pellets/shot through open gaps even point-blank), NOT 1.0; and range is ~0.45–0.60, NOT 0.30.
  Engine: `SG_LANDING_BY_BAND` (sim.ts) scaling SG shot damage + gauge; `ENV.SGLANDING='legacy'` reverts.
  Fable 2-of-2 LAND. Board FLAT (MAE 0.144→0.145, ±10% 56→57%, median 0.950); **rotation pins EXACT (0
  full-burst-count changes)**; non-SG blast radius ±0.01–0.04 (gauge ripples, no pin broken).
  **FAILED-PREDICTION LOG (Fable condition):** the pre-committed direction was "noir/naga WARM" (mid/far rise
  from 0.30). WRONG — all SG cooled (noir 0.73→0.66, naga 0.71→0.64, dorothy 0.76→0.69, soda 0.66→0.64;
  hot arcana 1.32→1.20 improved). Cause: the prediction assumed near=1.0 would survive, but the measurement
  dropped near too, and the near cut dominates. The corroboration channel thus FAILED; the landing stands on
  measurement validity alone (dropout≈1.0 + global-total cross-check are strong). Refusing a sound measurement
  because it cools the board is the mirror of tuning to warm — the invariant compels landing.
  **TIER:** ⚑ single-boss (gappy spider-mech), ±0.10–0.15 systematic; near 0.60 is a LOWER BOUND (global total
  caps it ≤0.7–0.8) — a future direct measurement supersedes it; do NOT "correct" it upward without one (that
  would re-create a mini-compensator for the shared SG under-model). Transferable claim is QUALITATIVE
  (near<1.0, range>0.30, ~flat). This is STEP 1 of the sequenced dorothy fix (open-questions A26); Step 2
  (dorothy consolidation) follows. — Drake solo damage-arithmetic; scientific-method harness (both Fable gates).
- **(2026-07-15) Abort-gates evaluate BEFORE the `everyN` activation counter** (sim.ts `applyBlock`).
  The block gates that `return` (`requiresCore`, `fbGate`, `swapGate`) are now checked before the
  activation counter increments, so `everyN` counts only activations that actually pass the gates —
  required to model "every 3 normal casts DURING Full Burst" (out-of-FB casts must not advance the
  counter). Verified ZERO blast radius: no existing override combines `everyN` with any of these gates,
  and the regression snapshot changed only the intended unit. First consumer: **soda-twinkling-bunny's
  Golden Chip self-buffs** — the two skill-1 lines "after casting 3 normal attacks during Full Burst"
  (Critical damage ▲1.32%/stack cap 50 = +66% permanent; Attack damage ▲10.51% 2s, self + top-final-ATK
  ally) were SKIPPED (unsupported trigger); now modeled as the REAL ramping mechanic (`shotFired` +
  `fbGate inFb` + `everyN 3` → stacking permanent `critDamagePct` + a `attackDamagePct` pulse to self and
  a twin block to `alliesTopAtk 1`). DATAMINED magnitudes, not tuned. Fable 2-of-2 (pre-op + blind post-op)
  LAND: N3 soda 0.61→0.66 (pre-committed band 0.64–0.78; ~+7% attack-dmg + ~+0.8% crit-dmg, cadence-
  consistent). Regression moved only soda + scarlet (the resolved top-ATK ally, +4.49% — faithful; feeds
  her separately-queued knot). Soda stays cold (0.66) on the shared SG body-damage under-model (ACCEPTED,
  not fudged). Caveat: N3 exercises only 4 crit stacks (backline B3) → the 50-cap + permanence paths are
  unvalidated. — soda kit datamine + N3 grade; scientific-method harness (both Fable gates).
- **(2026-07-15) Doll (Collection Item) leveling optimizer — throughput objective + exact DP.**
  New subsystem (`src/doll/model.ts` + `policy.ts`; data in `data/doll-economy.json` +
  `data/doll-super-success.json`) that finds the cheapest way to level dolls to the SR-phase-15
  target. Mechanic (OWNER-confirmed 2026-07-15): feed "toolboxes" (R/SR/SSR kits worth 200/500/1000
  EXP); each feed rolls a super-success (chance from the datamined table by doll-rarity × toolbox ×
  phase step) that JUMPS to the next checkpoint (5/10/15) with XP reset and the toolbox spent —
  otherwise the EXP is added (R doll 1000 EXP/level, SR doll 3000). Dolls are R or SR, phases 0–15;
  a maxed R15 doll upgrades to SR5 but still CONSUMES an SR doll (so laundering only saves the SR
  0→5 grind). **OBJECTIVE ruling:** "best method" is a resource-balancing problem — *level the most
  SR dolls 0→15 per kit-box*, NOT minimize per-doll EXP (which wrongly hoards). Kit usage-weights
  are the SHADOW PRICES that make the optimal policy consume kits in the box's supply ratio, derived
  from the owner's drop rates (the all-tiers box only: 70% 5R / 20% 2SR / 10% 2SSR → 3.5 / 0.4 / 0.2
  kits per box; the R-only box excluded per the owner's observed year of drops). **Method:** since a
  doll's phase only ever increases, the per-doll optimum is an EXACT backward DP over a DAG; the max
  throughput is the Lagrangian dual — a concave maximization over the 2-D shadow-price simplex with
  the weighted DP as the inner oracle (grid + refine) — yielding both the exact mixed-policy
  throughput and the shadow prices; seeded Monte Carlo for the cost distribution. **Findings:** feed
  Blue (R) kits as the workhorse, Purple mid-band, Gold on the phase 10→15 push; the mixed-policy
  optimum ≈ **77 SR dolls per 1000 boxes** (spends every kit) vs ≈ **63** for the best
  one-tier-per-phase pure strategy; and **trade spare R dolls** (≈10.6 kit-value each) rather than
  leveling them to launder (≈0.9 net kit-value) — launder only when you specifically want the
  guaranteed SR-doll head-start. Gated by `scripts/doll-regression.ts` in `verify.sh`; surfaced in
  the web **Doll Leveling** tab (Calculator / Level from Current / FAQ). — owner mechanic + drop
  rates 2026-07-15; data/doll-economy.json + data/doll-super-success.json.

- **(2026-07-15) Calc tabs reorganized into a top-level "Tools" section; common case shown by
  default.** The five calculators that aren't the core sim — **Overload Rolling** (renamed from
  "Overload Roll Sim"), **Doll Leveling**, **Charge Speed Breakpoints**, **Optimal Team Generator**
  (was "Optimal Team"), **Solo-Raid Roster Generator** — moved from the sim's tab-bar into a new
  top-level **Tools** nav entry (alongside Sim / How-to / Mechanics; a `tools` router route resolves
  to the App, each tool addressed by its own path, team-share chrome hidden on Tools). To serve the
  majority use case without a click, Overload Rolling auto-shows the **8/12** build cost on open, and
  Doll Leveling auto-shows the **SR 0→15** throughput + per-phase kit guide (calibration computed
  once, memoized). The Overload result table splits the two p95s (rolls-p95 beside "exp rolls"; a new
  module-cost p95 beside "modules") after they were visually conflated, and shows phase/module means
  to 1 decimal so per-piece values stay additive to the full-build total. — this session's UX pass.

- **(2026-07-15) Overload roll-cost sim — the ACQUISITION side of OL, and the `smart` locking
  policy as default.** New subsystem (`src/overload/model.ts` + `policy.ts`,
  `data/ol-probabilities.json`) that costs how many rerolls/modules it takes to GET a target OL
  line set — complementing the existing DPS-value side (`src/olconfigs.ts` / `bestol.ts` /
  `olcalc.ts`, which rank WHAT to target). DATAMINED probability model, cross-confirmed across
  nikke.gg / prydwen / gamevika / JP volx+game8 / KR arca.live (3-agent web sweep, 2026-07-15):
  stat-type weights 10% (ATK/DEF/Elem/CritDmg) vs 12% (the other five), drawn **without
  replacement** (no duplicate stat per piece); line-count gates 100/50/30% (all three = 15%);
  value-tier bands 60% L1–5 / 35% L6–10 / 5% L11–15; first overload guarantees tier 11. Value
  ladder is the existing `data/ol-tiers.json` (confirmed exact). Within-band per-tier split is an
  assumption (uniform), flagged in-data — NOT measured. Reroll/lock COST model OWNER-CONFIRMED:
  both lock modes share the per-roll reroll cost (1/2/3 modules by locks held); permanent locks
  add a one-time 2/3-module establish, temp locks pay 20/30 temp-locks per roll. The engine models
  the real **two-phase "T11 method"** — phase 1 reroll for the right stats (lock as they land),
  phase 2 value-reset each line's tier up to target (lock as each meets tier); both share the
  reroll cost.
  **RULING — `smart` phase-1 locking is the default, an ENGINE-TESTED optimum.** "Should you lock a
  line before the others land?" was resolved by making the policy configurable and simulating
  (`monteCarloBuild` sweep over greedy / lazy / lazyRare / smart): for a from-scratch **12/12**
  build, holding a lock on a *low* Line 1 through the grind for Lines 2 & 3 wastes modules —
  lock-everything-greedily ≈ 635 modules, leaving a low Line 1 unlocked ≈ 584, never-lock-Line-1 ≈
  557. For **8/12** it is a wash (greedy 272 ≈ smart 263). But "never lock Line 1" is wrong when
  you already HOLD a good Line 1 (e.g. a T15) — it would throw the black line away. `smart` gets
  both: it locks Line 1 only when it already meets its tier target, and locks the rarer Lines 2/3
  on stat-match. Locking Line 2 before vs after the rare Line 3 (30% slot) is negligible (~2
  modules). This confirms and refines the community "don't lock Line 1 for 12/12" wisdom. Optimum
  headline costs: 8/12 ≈ **263 modules**, 12/12 ≈ **584**. Gated by
  `scripts/overload-regression.ts` (model invariants + analytic≈MC + seeded determinism +
  monotonicity), wired into `verify.sh`. Surfaced in the web **Overload Roll Sim** tab (Roll
  Calculator / Roll from Current / FAQ sub-tabs, bell-curve distribution) + a "Calculate chance to
  roll" CTA on Optimize Overload that hands the best DPS lines to the sim at T11. Deliverable 2
  (doll / Collection-Item leveling optimizer) is PARKED with its data captured
  (`data/doll-super-success.json`, `data/doll-economy.json`). — research + policy sweep 2026-07-15;
  data/ol-probabilities.json header sources.

- **(2026-07-15) Calc-tab taxonomy rename + two new calculators (shipped `a4374d8`; backfilled
  here — the last deploy landed these without a DECISIONS/patch note).** Renamed the calc tabs for
  clarity: *DPS Chart* → **DPS Rankings**, *DPS Test* → **Custom DPS Rankings**, *Team Calc* →
  **Optimal Team**, *Roster Calc* → **Solo-Raid Roster Generator**. Added the **Optimize Overload**
  tab (`src/olconfigs.ts` `rankFreeLineConfigs`): for a carry sitting in a fixed 8/12 team (the
  floor 4× Elemental DMG + 4× ATK held constant), it ranks every way to spend the four FREE
  overload lines, scoring each candidate loadout by the carry's own sim damage vs the plain-8/12
  baseline. The hardening that matters: the candidate pool is **weapon-aware** — charge-speed /
  charge-damage lines are offered only to charge weapons (RL/SR), and Hit Rate / DEF are excluded as
  dead-for-damage — so the optimizer never proposes a line that cannot help that unit; it is a pure
  engine helper (`runSim` + `prepareTeam` only) shared by the web tab and node scripts. Added the
  **Charge Speed Breakpoints** tab: charge weapons fire in whole 60 fps frames, so charge speed only
  shaves time in discrete steps — the tab lists, per unit, the least charge-speed % that drops the
  charge by one more frame (and the ms saved), and hides breakpoints past a reachable-charge-speed
  cutoff (charge speed caps at 100%). This makes the "value between two breakpoints is wasted"
  caveat that `src/olcalc.ts` already noted actionable for players. — commit a4374d8 (2026-07-15);
  src/olconfigs.ts, web charge-breakpoint tab.

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
- **(2026-07-12/13; gear corrected 2026-07-14) Validation basis is the scope-lock preset** (no
  cube, no doll, **Base 5 gear** [not OL0 — see the Base 5 correction], 3★ core 7,
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
  experiment log "RAPI SYNTHESIS FINAL" + landing entry. **PARTIALLY SUPERSEDED (2026-07-16, see the
  entry above)** — much of the invisible X is now explained: her explosions core ~1/3 and her rocket
  cadence/instant-detonation are DERIVED from the real meter mechanic; the residual is narrowed and left
  exposed (part MG-cold, part unmodeled explosion crit).

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

- **(2026-07-15) The web team/roster generators rank on damage BLENDED with real-world meta
  popularity, not damage alone (owner ruling).** `src/teamcalc.ts` now takes an optional
  `MetaScoring` (resolved for the picked boss weakness) and ranks every candidate by
  `score = teamDamage × (1 + W·prior)`, W=1.0 ("strong co-equal" — a max-meta team can ~double
  its score, so popularity can overcome up to a ~2× damage deficit but no more; large damage
  gaps still win). The prior is `min(1, meanUnitPopularity + comboWeight·exactCompMatch)`,
  combining BOTH answers from the design: a unit-level prior (nudges the local search + force-
  keeps popular B3s the solo-damage prune would drop) AND full-team matching (the popular
  ranker comps are injected as candidates so a real meta team can win outright and surfaces in
  the roster list). Popularity is scoped to the ONE raid whose boss is weak to the picked
  element (per-weakness, from `docs/enikk-top100-audit.md` ranker counts, normalized 0..1).
  Units too new to have solo-raid ranker data (absent from EVERY audited raid — e.g. Cinderella:
  Crystal Wave) fall back to an element-agnostic score from their prydwen bossing tier
  (`data/bossing-tiers.json`, SSS→1.0…F→0). No weakness picked → no meta bias (pure damage);
  CLI/battery callers pass no `meta`, so they are byte-unchanged. Data pipeline:
  `scripts/build-meta-weights.ts` (npm `meta-weights`) compiles the audit MD + tier file into the
  committed `web/src/metaWeights.ts`; regenerate whenever the audit doc is refreshed. — teamcalc
  scoring; App.tsx `metaScoringFor`.
- **(2026-07-16) Roster Sim = a Sim-group tab that sims 5 user-entered teams at once (shared loadout,
  one pass).** Reuses the roster generator's display (`rosterView`) + boss/apply-to-all controls; input is a
  5×5 pick-a-slot grid with units unique across the roster (solo-raid rule). NOT a search — it sims the exact
  entered teams via `prepareTeam`+`runSim` under `calcCfg()`/`calcLoadout()`. Wiring: new `rostersim` CalcTab
  in the **'sim' group** (placed right of "Team Sim"; the old 'Sim' sub-tab was renamed **Team Sim**);
  `serve.mjs` TAB_META entry; deliberately NOT added to router `TOOL_PATHS` (sim-group → 'sim' route, so the
  top nav shows "Sim"). A "Copy to Roster Sim" button on the generator seeds the grid from the generated 5
  teams. Save/load reuses the saved-teams store via a new optional `Build.roster` (5×5 slugs; the shared
  loadout lives in `s`), tagged "roster" in the modal. — App.tsx; src/share/build-code.ts.
- **(2026-07-16) On-page team/roster portraits render crisp via `portraitThumb` (steppedDownscale), never a
  raw `<img>` at the CDN's full 256×512 res.** New `usePortraitThumbs` hook (extracted from DpsBarChart)
  resolves device-pixel-sized, PORTRAIT_CROP_TOP-cropped thumbnails for `TeamPortraits` + the Roster Sim
  input slots; `.team-chip img` also gains the `--portrait-crop-top` framing so pickers/compact strips match
  `.portrait`/`.tp-chip`. Reaffirms the image-downscale-helper rule (ANY non-full-size image → the shared
  downscaler, never browser `<img>` downscale). Same pass: roster results gained per-team damage bars; the
  roster cards + the 3:2 portrait state center their partial last row (explicit rows / fixed-width flex);
  portraits are 32–64px content-aware, snapping to 3:2 only at the 32px floor. — web/src/usePortraitThumbs.ts;
  App.tsx; styles.css.
