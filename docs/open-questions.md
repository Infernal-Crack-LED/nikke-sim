# Open mechanics questions

Running record of game-mechanics questions affecting sim accuracy, reorganized 2026-07-13.
Unanswered items are what's left to research; answered items keep their resolution and where
it was implemented. ⚑ = calibrated-and-applied but mechanism unconfirmed (flagged for review).

---

## UNANSWERED

### U8 — Probe-team residuals: what remains after the recorded re-runs
Nine probe recordings (2026-07-13, docs/probes/u8 + docs/probes/tb2) have resolved almost
everything here; per-run details in docs/probe-runs.md. STILL OPEN after test battery 2:
- **ein 0.71-0.76** (both run-E configs) — she cooled when the burst-gauge model was
  rebuilt (gauge v4) and is now the largest team-fight residual; her kit (stored/stacked
  skill damage) needs a review or an ein-focused recording.
- Mild burst-3 heat in run I (chisato 1.22, grave 1.15, noir 1.07) — partially the sim's
  ~7% fast rotation there.
- Run A: WHO casts Burst 2 each rotation (mint vs prika duet order) is still unverified —
  the test-battery recording used Alice's sniper-scope camera, which hides the burst
  cut-ins; needs one more run with a different focus unit. Also observed: Alice's total
  came in +9.3% vs the original run A while every other unit repeated within ±5% — the
  camera-focused unit generates x2.5 burst gauge on its charge shots (see the answered
  gauge item), so WHICH unit holds camera focus genuinely changes a fight's totals.
- Cinderella items: all SOLVED (docs/probe-runs.md, runs e3 + battery tests 1-2).
- Jill: SOLVED (battery test 4 — see the answered items).

UPDATE 2026-07-14 (714 noon probe, nine focused testing-request fights — docs/probe-runs.md).
Every focused (middle-slot) unit in that batch is in the enikk top-100 supported set, so its
read is meta-valid. New residuals / confirmations from the FOCUSED units:
- **Scarlet: Black Shadow — RESOLVED 2026-07-14 (CALIBRATED ⛑).** Her tracked ~1.23 heat,
  confirmed by a second focused fight (N3 boss Iron, 1.31; T1 1.18) and localized by her N3
  popup read: her charged-normal popup reads 1.55M vs sim 1.60M (correct), so the excess was
  entirely in the proc bucket. The blend-to-6 over-credited the burst-window proc tripling; a
  cadence sweep across BOTH fights lands hitCount 6→10 (near the literal every-9 outside-burst
  rate — the tripling barely materializes), moving T1 1.18→1.00 and N3 1.31→1.07 with no
  teammate/FB blast radius (self-damage procs). Still calibrated tier; re-check if a frame-exact
  proc-cadence read lands.
- **Guillotine: Winter Slayer — NEW residual, consistently hot 1.21–1.31, LOCALIZED to her
  normal fire.** First FOCUSED measurement (N8 boss Fire, bursting: 1.21) plus the non-bursting
  bench read (PH: 1.31). Decomposition localizes it precisely: her burst DoT is level-11-scaled
  and grades ACCURATE (N8 real DoT ≈114M ≈ sim 115M), so her Hero-Level auras + effective level
  are CORRECT; the excess is entirely in her normal-fire bucket, uniformly ~26% over in both
  fights (real normals ≈224M vs sim 294M in N8; PH 1.31 is normals-only). Ruled OUT: the
  near-infinite-uptime instantReload charfix (removing it moves her only 1.31→1.26 / 1.21→1.16).
  A flat 0.76× normal haircut would fix both to ~1.0, but the MECHANISM is unidentified — the
  suspect is a datamined MG weapon parameter (rate_of_fire / per-shot atkPct 13.7). NOT refit:
  needs a datamined recheck against the reference sim (nikke-einkk), since MG normals are not
  popup-readable and her level-scaled effects are confirmed right. Do not apply a blind normal
  scalar. Her auras also buff Water teammates, so any change needs a blast-radius pass.
- **milk-blooming-bunny 0.73** (focused, N10) — CONFIRMS the accepted DECISION (~0.7, poor
  auto-play); N10's total also graded exact (782M sim = 782M real). No action.
- **Vesti: Tactical Upgrade 3.23** (UNFOCUSED, N8) — her custom-volley model (4 rockets over
  ~1s, charFixes) is badly over. NOT a tuning target from this batch: she is unfocused here and
  is outside the enikk top-100 set. Needs a vesti-focused recording before any refit.
- rapi-red-hood (0.92, N1) belongs to her own active rework increment; modernia (0.90, N2) and
  snow-white (1.11, N4) are confounded by that comp's full-burst-count anomaly; privaty (1.58,
  N5) is already calibrated (0.97 on T4) — her N5 heat is Arcana: Fortune Mate's team buff
  inflating the whole side (arcana 1.88 / privaty 1.58 / snow-white:HA 1.33 together), and
  Arcana is unfocused here.

### U11b — Unfocused charge-weapon gauge generation (⚑ the one open gauge knob)
The burst-gauge model is now datamined + solo-measured (see the answered gauge item), but
no recording yet isolates an UNFOCUSED charge unit's full-charge generation (a solo unit
is always camera-focused). Flat x1.0 makes every sniper/launcher-heavy 5-unit fight
10-20% cold vs the anchored totals, so the engine keeps x2.2 ⚑ for unfocused charge
units (between flat and the focused x2.5). One recording of a team fight with the gauge
bar visible and a sniper NOT holding camera focus settles it. The datamined
full_charge_burst_energy column (~250 = 2.5%) may be the true additive mechanism.

### U12 — Autofire vs release-fired classification (USER-TESTED 2026-07-13; partial)
The autofire ("new") system is SPARSE. User-tested: autofire = neon-VE (+ known: anis: star,
liberalio, nayuta-in-burst); old-style release-fired = diesel-WS, mint, prika, ada, velvet;
cinderella has NO inter-rocket delay (custom 1s wind-up, already modeled). ENGINE: the 22f
release latency (one mechanism, measured on Helm SR + Maiden RL) now applies to ALL SR+RL
by default, autofire exempted via charFixes.noBoltRecovery. Board effects: mint 1.21→0.91 ✓,
trina 2.62→1.98, maiden default-reproduced (solo 1.01). UNTESTED + flagged:
- SBS: AUTOFIRE CONFIRMED (user-tested, second round) — exemption now permanent. Bonus
  validation: her user-observed 150% charge cap matches the DB chargeMultiplier column
  exactly (the per-unit charge multipliers are trustworthy). Her 1.23 heat is a separate
  open item (see the residual list).
- tia: 1.09→0.85 with latency (kept latent) — needs charge-meter test.
- User-classified (2026-07-13, round 2): laplace, a2, raven, rapunzel, noise, crust,
  anchor-IM, arcana = ALL old-style (engine default latency already correct). vesti-TU =
  custom volley (4 rockets over ~1s post-charge, ~0.5s/rocket — modeled via charFixes).
- trina: CONFIRMED old-style (user-tested 2026-07-13, third round — 22 frames between
  shots, exactly the engine's default release latency; no change needed).
  REMAINING unclassified: tia only (currently latent per the sparse-autofire default;
  she reads 0.85 latent vs 1.09 bare — worth a charge-meter glance).

### U3 — CCW residual (1.15 no-advantage / 1.27-1.31 with elemental advantage)
The U1 rule fix (her 833.79% core-strike rider no longer receives the core bucket) plus
crit-on-procs roughly cancelled. Two remaining leads: (a) the ratio gap (~1.14) between the
iron-weak fight (T8, elemental advantage) and the wind-weak fight (T5, no advantage) says she
gained less from elemental advantage in reality than the sim's x1.1 — do function-damage riders
skip the element bucket for HER delivery type?; (b) her every-5s 900% crosshair cadence.

### U13 — DoT / function-rider ticks do not crit in the engine (systematic under-credit)
The engine gates DoT/rider crit/core behind env-only `XCRIT`/`XCORE` sets (empty by default), so
**those hits never crit in normal runs**. But they DO crit — the MECHANIC is confirmed empirically by **ginmy.net/nikke_dot_test**: DoT
observed ~47% crit with elem-advantage+crit vs ~10% elem-only; DoT takes ATK/element/Full-Burst/
**crit**, subtracts DEF, but NOT distance (engine's `noRange:true` already right).

OUR-FOOTAGE confirmation — **RIDER crit CONFIRMED** (maiden solo, 2026-07-14, docs/probe-data/
maiden-solo.json): fielded alone (no FB, no buffs) her 547.62% damage rider reads a CLEAN
non-crit/crit pair — 437296 (white) / 655945 (orange + crit icon) = **exactly ×1.5**. So her damage
rider crits. (First attempts on LM + liberalio were INCONCLUSIVE — value-band entanglement, caught by
`scripts/probe/hit-values.ts`: LM's 64733 is her SMG NORMAL band 14-68k not her DoT ~156-220k;
liberalio's proc 1.13-7.73M fully overlaps her normal charge. Maiden solo was the clean subject.)
Rider ≈ function damage; a true-DoT tick (LM-style) is the same matrix cell (crit yes, core no) and
ginmy's dot_test confirms the DoT case directly, so the mechanic is settled: **DoT/rider damage
crits.** Colour convention owner-confirmed (crit = orange + crit-icon; core = red "CORE HIT"; damage
at crosshair, heals over the character).

ENGINE STATUS (2026-07-14): flatDamage PROCS already crit by default (dealDamage ~920, "U1" note —
so maiden's/liberalio's riders were already correct; the footage validated existing behavior). Only
the **dot-tick path (sim.ts ~1479)** and **stored-hit release (~1259)** were XCRIT-gated off (15
`kind:dot` units: LM, anis-star, privaty, mihara, jill, ada, rapi-RH, milk, guillotine, cinderella-CW,
elegg, ein, dorothy, sakura-BiS, ark-ranger). Implemented as a `DOTCRIT=on` knob and measured:
blast radius is small (+0.02-0.08) and MIXED — helps under-credited cold units (rapi/milk/ada/
cinderella-CW) but pushes hot units hotter (privaty/LM/jill) and **DOUBLE-COUNTS measured-dot units**
(guillotine's DoT is popup-measured at ~114M ≈ real; adding crit overshoots it). Board MAE is
NET-NEUTRAL (0.1331→0.1327). **DECISION: HELD default-off** — a blanket flip destabilizes a
well-calibrated board and refits measured values (constraint 3). The correct landing is a per-unit
recalibration: for each dot unit, de-crit the calibrated base (÷~1.075, net-zero expected) so the
mechanism is right AND the graded fit holds — worth it mainly for crit-BUFF interactions + variance,
which no current recording isolates. Knob stays for that future increment.

### U14 — When do +50% Full Burst / +30% range apply to SKILL damage? (test framework built)
Range is SETTLED: skill/rider/DoT damage NEVER gets the +30% range bonus (`noRange` universal; ein's
feathers "get FB but not range"). The open question is FB (+50%). Current model = per-kit `noFb` flags
(calibrated). A **test framework is built** (`scripts/probe/fb-range-lab.ts` + the `FBRULE` engine knob:
perkit/timing/dotfb/seqoff/noskillfb) that A/B-grades candidate general rules and holds the measured
ground truth. FINDINGS (2026-07-14): (a) NO general rule beats the per-kit flags on board MAE (perkit
0.1298 < dotfb 0.1402 < seqoff 0.1447 < timing 0.1464 < noskillfb 0.1589) — but the board CAN'T reveal
the rule because each unit's noFb is co-calibrated with its values (offsetting errors); noskillfb far-worst
confirms most skills DO get FB by timing (the default). (b) MEASURED ground truth is MIXED per delivery
type — flatDamage procs (liberalio ×1.333, ein feathers) + DoT (ginmy ×1.5) = FB-ON; burst-cast nukes
(U10) = FB-OFF.

**HEURISTIC SETTLED 2026-07-14 by JP research (well-sourced, one MEASURED) — it's a TIMING/SNAPSHOT
gate, not a damage-type rule.** FB +50% is a Boost-bucket conditional applied to whatever is evaluated
while the FB STATE is active; per-type behavior falls out of WHEN each type snapshots its buffs:
- normal fire → live per-frame → FB in the window;
- **burst-cast damage → snapshots at USE-time (before FB flips on) → NO FB** (matches U10; our privaty
  nuke read 2,422,498 = FB-off);
- **additional/function damage (procs/riders) → snapshots at ACTIVATION (during FB) → FB** (never gets
  distance or core) — matches liberalio ×1.333, ein feathers;
- **DoT/sustained → per tick → FB** (MEASURED: ginmy Mana DoT 297,240 in-game = 297,243 predicted WITH ×1.5);
- distributed → like additional, EXCEPT **Modernia's Paradise Lost (失楽園) → no crit, no FB** (the one
  genuine type-exemption).
**KR cross-validation (independent, 2026-07-14) — CONFIRMS the timing rule with a different empirical
anchor.** dcinside measured Cinderella's BURST: her front/instant hit misses +50% (+ misses FB-entry
buffs) while her additional damage (28.9%×stacks) GETS +50% — SAME burst, opposite outcome, so it's
TIMING not type. nikke.gg's formula marks Core-Hit & Range as normal-attack-ONLY (asterisked) but
Full Burst as having NO type restriction; a Python community calc codifies it as "FB active AND not the
burst skill's own instant hit." So the burst exemption is precisely the INSTANT/front cast hit (resolves
before FB is live), not "all burst-slot damage" — burst ADDITIONAL damage that ticks during FB does get
FB. Sources: JP — ginmy.net/nikke_dot_test, note.com/joyful_flax523/n/nec33793e37d6, daywrite.space/
archives/2063; KR — dcinside/gov/2134716 (Cinderella), nikke.gg/damage-formula, arca calc 118418095.
⇒ `FBRULE=timing` (burst INSTANT exempt, everything else FB by landing timing) is the MECHANICALLY-CORRECT rule.
The 6 per-kit `noFb` flags (LM/privaty/jill/maiden/eve/scarlet) are RELICS (as liberalio's was — removed
when measured). They grade the board fine only via offsetting errors (value co-calibrated to FB-off).
LANDING (a dedicated per-unit increment, like the liberalio re-tune): remove each noFb, re-audit the
compensating over-model (cadence/value — do NOT blind-scale a datamined coefficient), re-grade.

**RETUNE ATTEMPTED 2026-07-15 — BLOCKED on measurement.** All 6 noFb'd coefficients are DATAMINED
(eve 720% seq nuke; LM 253.44%=63.36%×4 DoT + 850%=85%×10 barrage; jill 192% DoT; scarlet
283/565/848% post-patch; privaty 256.17% + 1687%; maiden 547.62%) — so they cannot be lowered
(constraint 3). Removing noFb overshoots by 10-41% (FB uptime ~70%: privaty +0.27/+0.41, maiden +0.24,
LM +0.12-0.18, jill/scarlet +0.11-0.15, eve +0.07). Restoring each grade would require either
refitting a datamined coefficient (forbidden) or shrinking a CALIBRATED cadence/count purely to offset
FB — an evidence-free fudge-move that relocates the error without accuracy gain and obscures the real
per-unit truth (and LM has NO adjustable knob — her DoT interval/duration are measured). No existing
recording cleanly isolates any of these skills IN a Full Burst window (LM control tried repeatedly —
DoT band not isolable; privaty designated-dot not visible; maiden footage is solo/2-unit no-FB;
jill/eve/scarlet have no focused footage). So the correct retune needs NEW per-unit in-FB recordings:
read the skill/DoT popup IN-FB vs OUT-FB (ratio = the FB factor, ×1.5 raw) to see whether it's the
coefficient application, the cadence, or the noFb itself that's off. Until then `perkit` stays the
shipped default (board stable at MAE 0.1298); `FBRULE=timing` is the documented correct-mechanism knob.

---

## ANSWERED

### A26 — Scope-lock boss DEF is negligible — MEASURED/BOUNDED 2026-07-14
NIKKE enemy DEF is a small FLAT subtractive value (min-1 floor), applied inside the base before the
skill coefficient. ginmy.net/nikke_def_test measures Union-Training mobs at 100 and boss-type
enemies at ≈140; at scope-lock effective ATK that moves any unit's total ≤0.12% (`scripts/battery/
boss-def.ts` sweep). Our own datamined-coefficient popups already matched the sim to ≤0.3% at
`bossDef:0` (cinderella rocket 121,124; opening popups 99.7% on four classes), independently bounding
|DEF| < ~240 from actual raid recordings. Both agree: DEF is an order of magnitude under the ±3%
goal → `bossDef:0` kept as an evidence-backed approximation. Also confirmed the engine's DEF
placement (baseAtk subtraction, +ATK inside the paren, charge/skill mult outside) matches ginmy's
atkbuff/atkdamagebuff tests. See DECISIONS (Measured mechanics, 2026-07-14).

### A24 (U11b) — The x2.5 charge gauge bonus is CAMERA-FOCUS-ONLY — MEASURED 2026-07-13
Test battery 3, parts A1/A2 (docs/probes/"burst tests"): a two-unit fight (takina slot 1,
crown slot 2) recorded twice, identical except who held camera focus. Takina UNFOCUSED
steps the gauge +5.6-6.5% per shot — her flat 560 target value, which also excludes the
additive full_charge_burst_energy hypothesis (that would read +8.1%). Takina FOCUSED
steps +14-15% = 560 x 2.5, matching her solo. Engine: UNFOCUSED_CHARGE_GEN ⚑ deleted
(now 1.0, measured). Corroborates the JP wiki3 comment ("the one NIKKE the camera is
focused on") and the 2024-04-25 "operated character" patch note. Consequence: since the
middle slot holds focus by convention, WHICH unit sits in slot 3 is now a real damage
variable in team building.

### A25 (A3) — Anis: Star's shot row is a STANDARD launcher; her battery reputation is kit generation — MEASURED 2026-07-13
Her solo gauge recording steps ~+10.7-11.3% per pull = 280x2.5 (focused shot) + 280 (her
Skill-1 proc's skill-generation) x1.06 (her own +6% team fill aura) — the standard
launcher row, NOT the 840 estimated from the synergy column. The user's hypothesis that
the synergy aggregate folds skill generation into per-shot values is confirmed; that
column (and the 840) are retired. Her recording also shows a burst-chain collapse live:
gauge consumed at stage-1 open, her Burst-1 cast, stage-2 window expiry, forced refill —
the chain-consumption mechanic on camera.

### A22 (U11) — Burst gauge generation, fully rebuilt from datamined tables + solo recordings — 2026-07-13
Two solo recordings vs the raid boss (Maiden: Ice Rose, and Takina with a plain sniper
rifle), the datamined CharacterShotTable, and the einkk reference simulator together
replaced the calibrated gauge model with a measured one:
- Per trigger pull vs the boss the gauge gains the unit's **target_burst_energy_pershot**
  (datamined per unit; universally exactly 2x the non-target base — the old "boss x2"
  was this column, not a rule). Cap 10,000 energy.
- The **camera-focused unit's charge weapon** generates x(1 + 1.5 x charge) = **x2.5 at
  full charge** (einkk positionBurstBonus). Both solos fit EXACTLY: maiden 364x2.5 = 910
  per shot + her rider generating her flat target value 364; takina 560x2.5 = 1400/shot.
  No auto-efficiency factor and no additional multipliers.
- **Burst chain windows**: opening the chain CONSUMES the gauge, hits during the chain and
  during full burst generate nothing, and a Burst-1/2 cast opens the next stage for 10
  seconds (datamined burst_duration 1000 = 10.00s; a few units carry 5s/15s/20s variants).
  If the window expires with no eligible caster the chain COLLAPSES and a full refill is
  needed — measured directly in the 3-unit battery test, whose real rotation is 40s:
  fill ~8s, chain opens, stage-3 window expires (cinderella still on cooldown), refill,
  second chain completes exactly at her cooldown.
- The synergy-API burstGaugePerShot column was DROPPED as a gauge source: its semantics
  vary per unit (sometimes base, sometimes target, sometimes target x2 — helm 5.6 is her
  target value while takina 2.8 is her base). Data now lives in data/gauge-per-shot.json
  (85 units datamined via the community CSV library, 15 weapon-class fallbacks, 1
  estimate). Trina's famous "battery" gen is a real datamined shot value (720 vs the
  standard launcher's 280); a2's is standard (260 — her synergy 15.6 was garbage).
- Corollary measured in the same pass: **cinderella's burst cooldown is 40s as the DB
  says** (counting her nuke storms gives full bursts exactly 40s apart in the 3-unit
  fight), and **moran's S2 team-wide "Burst Cooldown ▼ 7.48s on entering Full Burst" is
  real** — the recorded run-B alternation (cinderella/neon strictly alternating at a
  16.4s rotation) requires both. Auto-burst selection is leftmost-ready (a round-robin
  theory was tried and rejected: it makes bench Burst-3 units cast when real fights
  never pick them).
Remaining open knob: unfocused charge-weapon gen (U11b ⚑ x2.2). INDEPENDENT SUPPORT
(JP): a wiki3 reader comment states the charge-gen bonus applies to "the one NIKKE the
camera is focused on" (焦点当ててるニケ1体) — supporting focus-only, which would mean
the x2.2 is really compensating for unmodeled per-unit skill-generation quirks
(nikke-synergy's arena data catalogues them: Ein's orb adds 560 energy every ~2.8s,
Helm's kit a fixed 1,431, Liberalio/Snow White: Heavy Arms per-shot-sequence bonuses).
Moran's 7.48s team CDR is KR-corroborated (Vortex/dcinside describe the treasure-3
"on Full Burst start while in combat-assist state: all allies' burst cooldown -7.48s").

### A21 (U8-jill) — Jill: datamined 150 rpm magnum + rolling reload — 2026-07-13
Test battery 2 test 4 (run-I order, jill focus). Her opening-magazine popups matched the
sim at 99.7% on ALL FOUR damage classes (body 180,633 vs 181,131 predicted; core hit
319,582 vs 320,464; crit 250,107 vs 250,796; acid tick 288,662 vs 289,469) — her per-hit
model was already exact, and the entire 1.67 heat was CADENCE: her datamined rate_of_fire
is 150 rpm (2.5 shots/sec, a magnum), not the assault-rifle class ~740 rpm, and her shot
row has reload_start_ammo = 8 — she starts reloading at 8/9 ammo and tops up WHILE firing
(no reload downtime; the video shows continuous fire). With charFixes.pullsPerSec 2.5 +
reloadFrames 0 she reads 1.02. Engine gained per-unit fire-rate support; two falsy-zero
bugs in the charFixes plumbing were fixed on the way. INDEPENDENTLY VERIFIED (JP):
ore-game's Jill analysis (ore-game.com/nikke/post/jill-valentine/) measures her at
exactly 2.5 shots/sec with a 1.16s reload, and separately measures her reload at ~100%
reload-speed buffs as 0.2 seconds — which equals our subtractive reload formula's
13-frame tail, corroborating that formula too. nikke-synergy's arena data lists her
per-shot gauge at 1.1 (= our datamined base 110).

### A20 (U4-final) — Projectile Explosion DOES buff plain launcher normal attacks — MEASURED 2026-07-13
Test battery 2 test 2 (anis-star · trina · cinderella, cinderella focus) settled this
with a buff-independent ratio test: during full burst her ROCKET core-hit popup (963,377)
divided by her skill-proc popup (771,268) = 1.2491, exactly the model's prediction WITH
the aura on rocket normals (938,253 / 751,155 = 1.2491) and far from the without-branch
(0.784). Pre-full-burst reads matched at 99.7% too (rocket core 113,571; proc 120,786).
Bonus from the same video: trina's burst rider "Burst Skill damage of skills with
'Affects all enemies' ▲ 435.6%" did NOT appear in cinderella's measured nuke value —
the parser's decision to skip that line is empirically correct for now.

### A23 — Pierce does NOT double-hit core+body on the partless boss — VIDEO-CONFIRMED 2026-07-13
Test battery 2 test 5 (run-A order, Alice focus, sniper-scope camera): every Alice shot
lands as ONE popup (763,961 / 2,269,805 core hits early), never two simultaneous values.
Confirms the A/B result that kept PIERCE_CORE_DOUBLE = false; the core+body double-hit
is a multi-part-boss mechanic. Bonus: her scope's charge meter shows charge held to
329%+ (cap 350%) with full-charge releases on auto — auto always waits for full charge
on her 1.5s cycle.

### A19 (U10) — Burst-skill damage does NOT get the +50% Full Burst multiplier — MEASURED 2026-07-13
Settled by a direct popup measurement (test battery 2, test 1: the electric-battery team in
run-B order, Cinderella holding camera focus). Her burst nuke's sequential hits read
**non-crit 4,066,936 / crit 6,100,403** — the ×1.5 crit ratio confirms the pair, and both
values are 98.7% of the engine's no-full-burst prediction (4,120,347 / 6,180,521) while the
with-full-burst branch (6,180,521 non-crit) misses by 34%. The same values repeat on her
later casts and across an aborted first attempt in the same recording. Interpretation
(matches the JP/einkk "use-time snapshot" rule): cast-instant burst damage lands at the
window boundary and does not receive the +50%, while buffs live at cast DO apply — the
measured value includes Trina's burst-granted +20.9% attack damage, which also rules out a
"snapshot before the rotation's buffs" reading. Burst-originated damage that lands DURING
the window (DoT ticks, stored-hit releases, per-shot procs) still gets the +50% by timing.
An interim ruling the other way (frame-0 applying the multiplier) was reverted on this
measurement. ADDENDUM (test 2, same day): the rule extends to FULL-BURST-ENTRY AURAS —
in the 3-unit fight her nuke carried trina's cast-granted attack damage but NOT
anis-star's "when entering Full Burst" aura (neither its flat-ATK grant nor its attack
damage): with the aura the prediction is 34-49% hot; without it the match is 0.99 on two
separate casts. One physical rule covers everything: at the Burst-3 cast instant Full
Burst has not begun, so the +50% multiplier and every "during Full Burst" buff are
equally absent from cast-instant burst damage. Engine: burst-cast blocks now resolve
BEFORE full-burst-entry triggers (stored-hit releases stay after — they detonate inside
the window and keep auras). INDEPENDENTLY VERIFIED (JP, found 2026-07-13 evening): the
DayWrite damage-formula article (daywrite.space/archives/2063) states the identical
rule — burst-skill damage doesn't receive the full-burst multiplier and "when Full
Burst activates"-type buffs don't apply because it counts as fired BEFORE full burst,
while ADDITIONAL damage accompanying the burst does receive both — and it illustrates
with Cinderella's own 1365.92%-per-hit nuke. Engine: burst-cast direct damage is exempted from the Full Burst major in
`dealDamage` (src/engine/sim.ts); a per-unit `burstSnapshotsPreFb` escape hatch exists for
units proven to snapshot even earlier (none currently). Board effects: cinderella 1.45→1.22
(the elec-weak anis-star fight, T2) / 1.16 (T7) / 1.17→0.96 (probe run B, video-anchored) /
1.00 (run E); Crystal Wave Cinderella 1.26→1.09 and 1.10→0.95; helm 1.17→1.04. Mild cooling
on small-nuke units (quency 0.84→0.73 — pre-existing cold, owns her own kit review;
maxwell 0.85). The remaining ~1.3% systematic offset in the popup comparison (both crit and
non-crit read exactly 98.7% of prediction) is a small unmodeled factor in her buff stack at
cast — noted, not yet attributed.

### A18 — Kit-wide target-scope audit — 2026-07-13
After trina ("1 leftmost Electric ally with assault rifles"), rouge ("self and 2 allies on
both sides" + caster-Max-HP grants feeding HP-scaled ATK), and ada ("all Burst 3 allies who
previously used their Burst Skill") each explained a team-level residual, ALL roster kits
were scanned for risky target clauses (positional, role/stage-filtered, weapon/element-
restricted, stat-ranked, count-limited, caster-gated, caster-HP grants): 38 offensive
clauses flagged, each checked against the resolved model. Already-correct: alice, maxwell,
liberalio (stat-ranked targets), guillotine-WS, ark-ranger-black, anis-SS (element
targets). Fixed in this pass: trina's burst ammo line (Electric+AR only, flat +20 rounds
= +33.3% on a 60-round magazine — was all-Electric +20%), arcana's S1/S2 180% grants
(Burst-3 Electric casters only — the ada error class). Noted, low priority: rapunzel
resolves to no offensive blocks (pure healer), mana's charge-time-targeted buff unmodeled
(not owned), miranda's "except caster" nuance on alliesTopAtk (not owned). Engine gained
alliesOfElementWeapon, selfAndAdjacent, and stage/element-filtered burstCasters targets.
Board after: both run-B configs 0.90-1.13, both run-E configs 0.83-1.10.

### U4 (resolved) — ADOPTED 2026-07-13: projExpl DOES buff regular RL normals
User's masking hypothesis confirmed empirically: with projExplOnRlNormals ON (now default) AND
the universal rider-range exemption, anis-star and RRH stay centered (their projectile riders
lose range while their RL normals gain projExpl — the two errors had been cancelling). SBS
needed her proc set moved to the noFb class (1.30 → 1.14), consistent with U1's taxonomy.

### U5 (resolved) — SUPERSEDED by the measured range-band model (2026-07-13, later)
User measured the test boss's movement: range bands mid/near/far/mid-far on a fixed timeline,
+30% bonus only for weapon classes inside their effective range per band (near=SG, mid=SMG+AR,
mid-far=MG+SR, far=SR), and RL NEVER receives it. Implemented as BOSS_RANGE_SCRIPT +
RANGE_ELIGIBLE (engine); the earlier blanket MG range-exemption is subsumed (MG gets the bonus
only in mid-far, ~23% of the fight). Wind-up no-core estimate (first 18 rounds) stands ⚑.
Also implemented: 1s unhittable windows at each band transition; units whose EFFECTIVE reload
is <=1s snap-refill during the window, others keep their mag; in-progress reloads continue.
MEASURED 2026-07-13 (helm frame recording, docs/"helm 2 6 mag rotations.mov"): SR fire cycle
= 1.37s exactly (charge 60f + bolt recovery 22f); reload begins immediately after the final
shot; first shot needs only charge + projectile travel. SR_BOLT_RECOVERY_FRAMES = 22 is now a
MEASURED constant (⚑ removed). Any SR still reading off owns the error in its kit model.

### U6 (resolved) — Fight-level warm spots — dissolved by the 2026-07-13 rules; any residue is tracked as U8
Clarified: "T2-style" meant the specific T2 SAMPLE run read uniformly warm vs the same units
in other fights — sample variance or comp-specific modeling, not an archetype. After the
rider-range + projExpl + MG rules, the per-fight spreads mostly closed (board 0.89-1.18
except maiden). Revisit only if probe runs reopen it.

### U7 (resolved) — Unvalidated new models → probe plan generated AND executed (docs/probe-runs.md)
9 runs (A-I) covering 27 probe units with validated anchors in every run, honoring the paired
comps (mint+prika duet, emma+eunhwa duo, tia→naga shielder, rouge→cindy, trina→elec).

### A17 — MG wind-DOWN curve + subtractive reload + buff-overwrite rule — 2026-07-13 (late)
User ruling: ore-game's graded wind-up recovery is right; the binary >100% rule was the top
of a curve. Fit (all four observations on one line): while an MG is not firing, spin holds
for a ~0.27s grace then retraces the wind-up ladder at ~2.8x climb speed — fully gone after
~1.1s idle (engine MG_WINDDOWN_GRACE_FRAMES/MG_WINDDOWN_DECAY). For the curve to reproduce
the measured >100%-buff full skip, RELOAD must be subtractive like charge speed:
actual = displayed x 0.975 x (1 - buff) + 0.21s tail (ore-game reload-limit; engine
reloadFramesNeeded). That exposed a third fix: Crown's two identical S1 reload lines were
STACKING to 88.7% — the KR same-buff-overwrite rule is now implemented (same caster + slot
+ stat + value dedupes). NET RESULT: the water-weak validation fight's (T4, and its
replicate) team-wide ~0.87 cold RESOLVED (privaty's +51% team reload buff was being
under-credited by the divisive formula) — that fight now reads 0.89-1.11;
dorothy: serendipity 0.99; the validated-fight anchors sit at 0.88-1.13.

### A11 (U1) — Proc-class rule — ANSWERED 2026-07-13 (deep-dive research)
Datamined (FunctionTable via nikkecsvlibrary; nikke-einkk reference sim; Prydwen unit notes;
JP verification): kit lines "deals X% as additional damage" are FUNCTION-type skill damage,
and the universal rule is — **crit YES (rolls at caster's rate), core NEVER, range NEVER,
FB +50% YES when the proc lands during Full Burst, element YES, Damage-Up bucket YES,
charge multiplier NO.** There are no per-unit "classes": our full-majors/exempt split was two
offsetting errors (full-majors wrongly kept core+range; exempt wrongly lost FB). Weapon-based
deliveries (launchWeapon: anis-star's stars, RRH's projectiles) DO core+crit but still no range.
Implemented: engine flatDamage/storedHit default crit ON (crit:false only for verified
non-critters); cindy-CW's core flag removed. The legacy noFb flags on the old exempt class are
retained as calibration until U8's rotation ground truth lands (removing them shifts units
inside comps whose rotation is still unverified). DoT-tick crit is unverified (einkk allows it;
kept OFF).

### A12 (U2) — Maiden ×0.68 — SOLVED 2026-07-13 (video-measured; was cadence, not value)
Video (docs/probes/"maiden solo neutral target probe.MP4", neutral target, scope lock):
- Popups: rider 437,296 non-crit / 655,945 crit vs ATK 80,118 → the FULL 547.62% kit value
  (matches to 0.33%, the same ATK-rounding offset as her 244,753 core-rocket popup). Procs
  on every pull. Crit multiplier x1.5 confirmed on both instance types.
- Rocket instances land off-core sometimes (first pull was 122,376 = no-core) — direct
  evidence for AUTO_CORE_RATE < 1.
- Her real cycle is 1.77s/pull: auto releases at 156–212% OVERCHARGE (charge meter visible),
  holding ~0.35s past full; 6-pull mag + ~2.9s reload. The old model's 60f charge gave
  126 pulls/180s vs ~102 real — THAT ratio (0.81 on pulls, compounding with rider share)
  was the whole ×0.68.
Fix: charFixes.chargeFrames 81 (MEASURED) + rider restored to 547.62. Solo run now 1.017
with no calibrated factors left in her model. NOTE: overcharge hold is NOT universal —
Helm's measured SR cycle (1.37s) shows no hold; treat it as per-unit measured behavior.
### A13 — Burst gauge generation — ANSWERED 2026-07-13 (datamined, three corroborating sources)
Gauge = 10,000 energy; fill counts HITS not damage; per-hit base values by weapon/reload
variant (MG 5, SMG 10-15, AR 20/25/45, SG 20 or 45 PER PELLET, SR 265-290, RL 140-360, with
real per-unit exceptions — the DB burstGaugePerShot column matches the datamined table,
including battery units trina 1440 / anis-star 1680 / a2 1560); boss hits x2; skill-damage
hits and DoT ticks generate the unit's per-hit base; charge scaling on gen is MANUAL-ONLY
(2024-04-25 patch) so flat base on auto; gauge locked during FB, hits wasted; no caps or
team-size scaling; Burst Gen% buffs sum then multiply. Implemented as gauge v3 (engine) with
AUTO_GEN_EFFICIENCY = 0.7 ⚑ (auto chain delays 0.433/0.533/0.533+0.1s, re-aim, cover downtime;
note old GEN_SCALE 1.4 == 2 x 0.7 — the two independent calibrations agree exactly).

### A14 — Run-A cold (red-hood 0.36 / alice 0.59) — SOLVED 2026-07-13 (decoded game data)
Three stacked mechanisms, all from the decoded tables (github.com/rcasdzxc/SD +
github.com/d34d633f/nikke-einkk reference sim):
1. **Charge Speed is SUBTRACTIVE on charge time** — effective = base x (1 - sumCS%), floored
   at 1 frame; NOT base/(1+CS). Engine-wide change. Kit-text CS values keep their in-game
   semantics; the two hand-averaged values (cinderella ramp 80→45, anis-star fixed-0.7s
   42.86→30) were re-expressed to preserve their real cadences. Alice's 90f charge with her
   Burst +80.15% + S1 +11.67% now yields the community-verified ~0.4-0.5s in-FB cadence.
2. **Red Wolf decoded** (skill 1470610 / weapon 1047002): 51.46%/shot, 250% full charge,
   rate_of_fire 200rpm = exactly 1 shot/18f (0.3s) — fire-rate-gated, NOT charge-gated
   (engine: swaps with explicit cadence are CS-immune), infinite ammo, ~33 shots/window;
   S1's excess-over-100%-CS -> Charge Damage x2.4 conversion ≈ +90% chargeDamagePct in the
   window ⚑ (stack ramp averaged). Also: auto ALWAYS full-charges SR/RL (einkk
   NikkeFullChargeMode.always).
3. **Pierce core+body double-hit tested and REJECTED for the partless test boss** — the
   community "pierce hits part+body" evidence is about multi-part bosses; with the decoded
   cadences in, doubling overshoots grossly (alice 1.87, RH 1.46). Engine keeps
   PIERCE_CORE_DOUBLE=false as a switch for future part-ed boss support. hasPierce still
   gates Pierce Damage ▲ buffs (Mint's 32.72 lands on alice/RH in run A).
Result (probe run A): anis 0.97 · mint 1.27 · prika 0.84 · alice 1.15 · red-hood 0.92.
Charge Speed hard-caps at +100% (RH's "excess value over 100%" conversion establishes it).

### A15 — Auto-aim core floor — CALIBRATED 2026-07-13 ⚑
JP frame analysis: auto reticle floor ~12.5px vs ~1px manual (~18-20% effective accuracy
loss); auto can never guarantee core hits even at 100% core exposure. Engine AUTO_CORE_RATE
= 0.85 ⚑ multiplying coreHitRate; centered the validated-fight anchors (anis 0.97-1.06 x7
comps, liberalio, crown, rapi-RH, LM, moran, ada, ein, diesel all ~1.0).

**RESEARCH 2026-07-14 (subagent, multi-source): 0.85 is weakly sourced and really weapon/range-
dependent — flag for a per-class model.** No JP study concludes "auto = 85% core." The primary
source (_TricK_, note.com/n6efe08af53e8) measures the ~12.5px auto reticle floor and an **18-20%
accuracy loss** (→ ~0.80-0.82 effective, slightly BELOW 0.85) but never integrates a core-hit
probability; the "85" in it is a reticle-formula INTERCEPT, likely a units mix-up. A KR curve
(arca.live/96243965, Blacksmith/mid-range) gives core-hit vs the ACCURACY STAT: ~40% @75.6% acc,
~90% @85% acc — a different axis. ore-game.com/verify-memo: shotgun core is ~100% front row /
~1.6% mid / ~0% back — i.e. **range-band dominated**; うま's MG note: MG cores ~100% once warmed
(≥3.75s) at any range; SR/RL possibly near-guaranteed. So a single scalar under-credits MG/SR/RL
carries and over-credits off-range SG/SMG. Options (owner call, ⚑ refit): (a) keep 0.85 blended;
(b) weapon-class-indexed (MG/SR ~0.95-1.0, RL ~guaranteed, AR/SMG ~0.85, SG = f(range)); (c) the
geometric per-shot model (reticle radius vs core projected radius — the sim already has range bands).
We can now ALSO MEASURE it: `scripts/probe/classify.py` counts red "CORE HIT" popups from focused
footage → an empirical core rate per unit/weapon. Sources in the research; not acted on yet.

**PER-WEAPON SCAN 2026-07-14 (focused footage, docs/probe-data/): a flat 0.85 is wrong — core rate
splits by weapon class, confirming the research.** Qualitative reads (red "CORE HIT" fraction of the
unit's NORMAL popups; procs/riders correctly don't core):
| weapon | unit (footage) | observed core rate |
|---|---|---|
| MG | crown (control) | ~near-100% (dense red core stacks, warmed) |
| SR | liberalio (rrh) | ~near-100% |
| RL | maiden (solo) | ~near-100% ("CORE HIT" ~every shot) |
| AR | snow-white (control) | moderate/mixed (~0.7-0.9) |
| SMG | little-mermaid (control) | lower (many white non-cores, ~0.7-0.85) |
| SG | (no focused footage) | research: range-dependent (~0 off-band → ~1.0 optimal) |
So the RELIABLE auto classes (MG/SR/RL) core ~near-100% — a flat 0.85 UNDER-credits every MG/SR/RL
carry (the boss-DPS backbone); AR/SMG sit around/below 0.85.

**LANDED 2026-07-14 ⚑ refit — AUTO_CORE_RATE is now weapon-class-indexed** (sim.ts `acrFor`): MG/SR/RL
= **0.95**, AR/SMG/SG = 0.85. Three supporting lines: (a) the footage scan above; (b) JP research
(reliable classes ~0.95-1.0); (c) an MAE SWEEP on the graded board — MG/SR/RL=0.93-0.95 is the
optimum, board **MAE 0.1331→0.130, within-10% 56%→60%** (a real fit gain, no per-unit recalibration).
The sweep optimum (~0.93-0.95, below the qualitative "near-100%") reflects the ~12.5px reticle floor +
wind-up shots. FB counts unchanged (core rate ≠ rotation); snapshots regenerated. Knobs: `CORERATE=flat`
reverts to 0.85, `CORERATEHI` sweeps the MG/SR/RL value, `ACR` overrides all. Still ⚑ — a precise
per-shot count or the geometric reticle model can refine it.

### A16 — July 2 2026 distributed-damage patch — APPLIED 2026-07-13
Solo raid Annihilio was suspended over the distributed-damage bug; fixed 2026-07-02 with
compensating buffs: SBS S1 283.03/565/848.03 (from 250.47/500/750.47), burst charge dmg
169.63; Elegg S1 158.65, burst 316.66. blablalink sync still serves PRE-patch values
(verified 2026-07-13) — post-patch values pinned in the SBS override (SBS now reads a real
1.22 hot → U9 candidate); elegg flagged unmodeled. All user runs are post-patch. Re-check
after each future sync.

### A1 (Q2) — MG wind-up & the Privaty ammo-cut paradox — RESOLVED 2026-07-13
(a) Wind-up is skipped when total reload-speed buffs exceed 100% at reload (the reload still
happens, just fast) — implemented; crown-under-Privaty went 0.71 → 1.00. (b) The 3.75s cubic
wind-up was stale community lore: the user measured the exact frame ladder
(docs/nikke_mg_windup_model.md — 35 rounds / 142 frames, then 60/s; hard reset per
reload/stun, no partial retention) — implemented verbatim as MG_RAMP_INTERVALS; the
mgWindupSec/mgWindupExp knobs and A/B harness were removed. Also: Max Ammo ▼ clips the
current belt; max-ammo sources stack ADDITIVELY (important for future OL ammo lines).

### A2 (Q4) — Maiden 547.62% trigger — ANSWERED 2026-07-13
Procs on every normal attack where she full charged = every shot under sim conditions.
Implemented as shotFired (twin rockets are one attack). Residual → U2.

### A3 (Q5) — Mast:RM split readings — RESOLVED 2026-07-13
Correction from user: she WAS bursting (leftmost B2). Two fixes: Hangover stun re-gated from
every-3rd-global-FB-end to every 3rd of HER OWN bursts (the sim was stunning her sober), plus
the corrected MG wind-up. Now 1.03/1.10.

### A4 (Q6) — Little Mermaid Bubble Barrage — ANSWERED 2026-07-13
Per-hit confirmed: barrage 85%×10 = 850%, FB attack 63.36%×4; this damage never cores.
Driven by the new teamAmmo trigger (total ally ammo consumed; infinite ammo doesn't count —
engine's consumption path matches the in-game rule naturally). With the U1 exemption: 1.03-1.07.

### A5 (Q7) — Nayuta — RESOLVED (1.03 in the wind-weak validation fight, T5)
530.46%/shot stage rider (150 full-screen + 380.46 stage extra DO stack), ramp-averaged
Memory-Absorption gates, 2.3s SR-mode cycle (bolt recovery).

### A6 (Q8) — SR bolt recovery — ANSWERED 2026-07-13 (later reframed as the auto release latency on release-fired charge weapons; see U12 and docs/data/charge-weapons.md §2)
All standard SRs pause ~0.5s after each full-charge shot. Only exception: weapon-swap states —
which covers Red Hood's own post-B3 10s window exactly (her Red Wolf swap), plus SWHA Fully
Active and Nayuta SR mode. Units whose DB chargeFrames already bake the cycle in (SWHA
kit-fixed 1.2s, liberalio 90f) are exempt via charFixes.noBoltRecovery. Engine-wide
(SR_BOLT_RECOVERY_FRAMES = 30).

### A7 (Q10) — Pierce Damage ▲ — ANSWERED 2026-07-13
Boosts pierce-TAGGED units' hits regardless of pierce surfaces existing. Only kit-confirmed
pierce qualifies: red-hood permanent (hasPierce: true), CCW Snipe mode only (pierceModes),
base Cinderella none (was wrongly assumed). Implemented: hasPierce/pierceModes on OverrideFile;
pierceDamagePct joins the Damage Up bucket for tagged units.

### A8 (Q3) — CCW review — PROVIDED 2026-07-13
User supplied the full review; mechanics reconciled (334.2%/s basic verified, swap semantics,
nuke lands on FB-enter-after-her-burst which matches engine ordering, pierce Snipe-only).
Residual heat → U3.

### A9 (Q11) — MG class heat after the measured ladder — CALIBRATED 2026-07-13 ⚑
User estimates implemented (confirmation ask in U5): wind-up rounds before the 2-frame ladder
portion don't core; MG normals get no range bonus. MG class centered (crown 1.18 → 1.04 avg).

### A10 — Resolved during the original validation passes (2026-07-12)
- Distributed damage deals the same TOTAL vs 1 target as vs many — never model a split.
- Frame-0 rule: all full-burst buffs apply before any burst damage — burst nukes get the +50%
  multiplier, FB-entry auras, and same-cast stage buffs (engine reordered; independently
  confirmed by Prydwen's liberalio nuke math and Ein's S1 note). Fixed cinderella 0.55 → 1.09.
- Sustained/True/Sequential Damage ▲ gate on hit flavor, not globally.
- Cinderella is genuinely a Defender (DB correct); only her normal attacks core.
- The advantaged-Anis anomaly was a loadout-basis artifact; the elemental bucket is fine.
- Collection-item / Helm-burst charge buffs multiply BASE charge damage (chargeDamageMultPct).
- Scope-lock validation basis: no cube, no doll, OL0, 3★ core 7, sync 400, 10/10/10, treasure
  on, partless boss, 100% core exposure, full auto.
