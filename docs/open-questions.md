# Open mechanics questions

Running record of game-mechanics questions affecting sim accuracy, reorganized 2026-07-13.
Unanswered items are what's left to research; answered items keep their resolution and where
it was implemented. ⚑ = calibrated-and-applied but mechanism unconfirmed (flagged for review).

---

## UNANSWERED

### U26 — "All-or-nothing" crit on sequential attacks + an Eve carve-out (2026-07-21)
**Surfaced while modeling cinderella's burst** (a 10-hit "1365.92% × 10 sequential" nuke the engine
represents as one flatDamage instance). The engine rolls crit ONCE per damage instance
(`dealDamage`, `src/engine/sim.ts` ~1186–1191: a single Bernoulli `rng() < critRate` → full crit bonus
or nothing), so a single instance is inherently all-or-nothing. For a **sequential attack** this is
believed CORRECT: in NIKKE a multi-hit sequential round (Snow White: Heavy Arms' sequence, cinderella's
10-hit nuke, Eve's concentrated payload) has its critical hit decided at the **round/action level** — if
the round crits, the crit multiplier scales the whole round's damage; it does NOT independently roll
"crit, normal, crit, normal" across the micro-hits inside the round.

**Open items for later review:**
1. **Verify the engine's all-or-nothing crit is applied at the right granularity** for every sequential
   attack — i.e. one crit determination per sequential *round*, not per micro-hit, and not per whole
   multi-round skill either. Confirm cinderella's nuke, Snow White: Heavy Arms' sequence, and Eve's
   sequential procs/burst are each rolled once per round as intended.
2. **Eve (`eve`) is the exception and needs a carve-out.** Her kit is built around sequential attacks
   plus Unstable Energy, a passive that triggers after landing **44 critical NORMAL hits**. For that
   counter to fill at the right rate her ordinary rapid-fire weapon attacks must roll a **normal
   per-shot crit chance** (each shot independently crits or not, stacking the counter), even though the
   sequential payload it eventually fires resolves all-or-nothing. Today the engine does NOT roll a live
   per-shot crit counter for her — her cadence is approximated by a static threshold (`hitCount 59` =
   44 crit hits ÷ ~0.75 crit, `src/skills/overrides/eve.json`), which cannot respond to external
   crit-rate buffs shortening the real cadence (already flagged in her caveats). A faithful Eve wants
   per-shot crit rolling driving the counter, distinct from the round-level all-or-nothing rule.

Eve is currently **ungraded** (no board data, no focused Eve footage in the catalog), so this is a
model-correctness note to settle when Eve footage is captured — do not fudge her to close it. Related:
[[full-kit-audit-requirement]], sequential/`sequentialMultPct` bucket (Phase A4), U13 (DoT/rider crit).

### U25 — Charge Speed formula + cinderella's unique RL cadence (2026-07-21)
**OWNER RULING 2026-07-21 — Charge Speed is ADDITIVE (subtractive on charge time); the DIVISIVE hypothesis
is REJECTED. Do NOT change the global CS formula.** The divisive model only *appeared* to fit because it was
being asked to explain cinderella's cadence via CS — but cinderella's ~315 is NOT a CS effect. Her RL is a
UNIQUE weapon (`role.weapon` shot_id 1051101): `charge_time 100` (1.0s), `rate_of_fire 180` (3 rockets/s),
`max_ammo 24`, `reload_time 200` (2.0s), `input_type DOWN_Charge`. Her REAL mechanism = **charge once (1s),
then fire the mag at ROF 180 (3/s), reload, recharge** — and her in-game kit text ("Charge Speed ▲100%,
removed on reload") is an UNFAITHFUL description of that rapid-fire behavior (a known issue with some unique
weapons). So the faithful cinderella model is a per-unit FIRE-PATTERN off her datamine (ROF 180 + 1s initial
charge + `removeOnReload`), NOT a CS-buff on charge time and NOT a global-formula change. Building it as a
follow-up (targeting her popup-measured ~315 cadence). The CS-formula question below is now CLOSED (additive);
the cinderella cadence question moves to her fire-pattern build. ORIGINAL FINDING (kept for the record, now
superseded by the ruling above):


The engine models Charge Speed as SUBTRACTIVE on charge time — `needed = max(1, round(chargeFrames ×
(1 − ΣCS/100)))`, capped at CS 100 (`sim.ts` charge loop) — decoded-data + einkk basis, and every
calibrated CS value on the board (e.g. cinderella's +45 proxy) was fit UNDER that formula. Building the
faithful `cinderella` (RL/Electric, aka "cindy") S1 toggle — "Charge Speed ▲ 100%. Activates when
attacking with Full Charge. Removed upon reloading to max ammunition." — surfaced a discriminating test.
Under SUBTRACTIVE, CS 100 → charge floored to 1 frame → she fires ~1 rocket/frame between reloads
→ ~1536 pulls/180s (measured on the wired toggle; board 0.937 COLD → 4.834 HOT). But her MEASURED
cadence (override note, u8-e3 popup pairs) is **~315 pulls/180s**. The **DIVISIVE** model
(`needed = round(chargeFrames / (1 + ΣCS/100))`, the standard community/Prydwen form) gives CS 100 →
charge HALVED (60f→30f): magazine cycle = 60 (shot 1, CS off) + 23×30 (shots 2-24) + 83 (reload) = 833f
/24 shots → **~311 pulls/180s — a 1.2% match with ZERO free parameters**, closer than the calibrated +45
subtractive proxy (~296) which itself sits at her COLD board direction. A rate-of-fire floor (rockets
gated at the datamined 180 rpm = 20f even at instant charge) was CONSIDERED and REFUTED — it predicts
~430 pulls, overshooting the measured 315. **Hypothesis (n=1-arithmetic-derived, HYPOTHESIS-strength,
NOT enacted): NIKKE charge speed is DIVISIVE, not subtractive.** This is engine-wide — it re-scales
EVERY charge unit (alice/red-hood/the SR/RL roster) and invalidates every CS value calibrated under
subtractive (incl. cinderella's +45; the divisive re-derivation of her old proxy is 60/1.45 ≈ 41.4f ≠ the
calibrated 33f). Enactment requires a separate GATED pass: fresh context + Fable pre-reg + full-board A/B
+ owner sign-off, never the session that found it. Independent confirmation wanted: a second charge unit's
popup-read cadence at a known CS%, and/or the isolated-cinderella footage that pins her buffed-shot
cadence + reload timing directly. See DECISIONS 2026-07-21 (removeOnReload primitive) + the pre-reg
`scratchpad/prereg-cinderella-cs-toggle.md`.

**FOLLOW-UP BUILD RESULT — the datamine whole-mag-dump-at-3/s fire-pattern is NOT SUPPORTED by the popup
measurement (built + full-board A/B, 2026-07-21; NO enactment — held).** The owner-directed follow-up (model
her cadence off the datamine fire-pattern instead of a Charge-Speed buff) was BUILT and MEASURED: an opt-in
engine primitive `charFixes.magDumpRof` (charge ONCE per mag → rapid-fire the whole magazine at the datamined
rate_of_fire → reload → re-charge; every rocket a full-charge shot), wired to `cinderella` at rof/60 = **3.0
rockets/s** (the confirmed scale — jill rof 150 → her measured 2.5/s charFix; scarlet(AR) rof 720 → 12/s).
Board-exact A/B (7 graded comps, MC-mean): the literal 3/s dump fires **420 pulls/180s solo (420–449 in-comp)**
and moves her board **0.93 COLD → 1.29 HOT** (ratios up to 1.57) — vs her popup-MEASURED **~287 pulls (862
popups / 3-per-pull) ≈ ~315/180s**. So the datamined rate_of_fire 180 is her nominal/**in-burst** rocket rate,
NOT her **sustained** cadence: her measured ~1.75 rockets/s is roughly HALF a clean 24-at-3/s dump. Comp downtime
does NOT close the gap — solo≈in-comp in BOTH models (288≈288–306 baseline; 420≈420–449 dump), i.e. she fires
essentially continuously; there is no ~25% rotation downtime to pull 420 down to 315. And no faithful whole-mag
variant reaches 315: even the fully-datamined 2.0s reload gives ~405; hitting 315 would need a ~5s reload,
contradicting her measured ~1.2s. Her measured 1.75/s sits BETWEEN the two datamine-literal readings — the
per-rocket-charge literal (1s each, no CS → ~1/s ≈ 160 pulls, far too COLD) and the whole-mag-dump literal (3/s
→ 420, too HOT) — the signature of an **INTERMEDIATE mechanism** (she likely re-charges MID-mag / fires K < 24
rockets per prime, not one prime per full magazine). **ENACTMENT: none** — the engine primitive was reverted
(regression-proven byte-identical/opt-in inert, but no valid consumer since its only intended consumer
overshoots). `cinderella` KEEPS her `+45 chargeSpeedPct` proxy, which is MEASUREMENT-ANCHORED (validated vs real
T2/T7 + the e3 popup pass; steady-state ~0.55s/shot ≈ 1.8/s ≈ measured 1.75/s) and already reproduces ~288
pulls ≈ the measured 287 — retained as status-quo, NOT to be mistaken for validated mechanism. **NEEDS-MEASUREMENT
(the actual unknown):** isolated `cinderella`-solo footage to pin (a) rockets-per-prime K + whether she
re-charges mid-magazine, (b) her real reload, and (c) a re-confirm of the "3 popups/pull" divisor the whole 315
rests on. Fable pre-op APPROVED the hold; harness pre-reg `scratchpad/prereg-cindy-firepattern.md`.

### U24 — Do TRUE-flavored normal attacks retain CORE hits? (chisato/jill shared; footage says YES, but jill enactment gated) (2026-07-20)
The kit-audit flagged (chisato gotcha 1, jill gotcha 1) that whether true-damage normal attacks forfeit
core is unverified — a large lever, because `coreMult` is big. **Direct-observation finding (kit-audit
measurement pass, from the EXISTING `docs/probe-data/jill-hitrate-core.json` recon of `jill control.MP4`):
true normals DO retain core.** In `jill`'s own-burst window (her "Normal attacks deal True Damage for
10s" is active) her bullet popups are red **"CORE HIT"** — ~14-15 of 15 sampled shots, with crit arrows,
and NO white/orange bullet popups. If true normals forfeited core, there would be zero CORE-HIT popups in
that window; instead they dominate (also lifted by her burst Hit Rate +80.78%). So the faithful direction
is **true normals keep core/crit** — `chisato`'s SMG `coreMult 250` and a `jill` trueNormals window should
NOT strip core. **This is a direct game-behavior observation (strong), but n=1 recording** → recorded here,
not stamped on the model.
**ENACTMENT STILL GATED for `jill` (do NOT blind-land the trueNormals window).** Separate risk: `jill`'s
per-hit popup values are ALREADY sim-matched at ~99.7% (her main note) WITHOUT the +34.99% `trueDamagePct`
being live (it is engine-inert today). If those matched values were read inside her burst window, adding a
trueNormals window (which activates +34.99%) would OVER-credit by ~35% and push her further HOT (she is
board HOT 1.041). Required before enacting: a per-hit reconciliation — does real jill burst-core reconstruct
as sim × 1.0 (no true bonus ⇒ do NOT enact / the +34.99% is not a per-hit add) or sim × 1.3499 (⇒ enact the
trueNormals window)? Recipe: reconcile `jill-hitrate-core.json` burst core popups (1.65–1.98M near-band)
against a sim burst-window per-shot core with vs without trueNormals. Trail: plan §jill / §chisato,
`docs/probe-data/jill-hitrate-core.json`.

### U23 — milk-blooming-bunny's burst-window over-model, exposed by the (faithful) Gain-Pierce landing (2026-07-20)
Enacting the kit-literal S1 "Gain Pierce for 6 sec" (`gainPierce` on `shotFired`; kit-audit Phase C
ENACT-NOW, DECISIONS 2026-07-20) lit `milk-blooming-bunny`'s previously-dead Pierce package — her burst
`pierceDamagePct +117.64%` now applies to her burst-window damage. Isolated A/B: **PG 0.653 COLD → 1.301
HOT** (total ~×2). The pierce value is datamined (not tuned) and the mechanism is verified faithful (debug:
`dmgUp` 1.00→2.31 during her ~10s burst window, correctly ending at t≈13.17 — the same unit-tagged pierce
Damage-Up model grave uses). So the residual **+0.30 HOT is a SEPARATE over-model**, not the pierce. Two
candidate drivers, both measurement-gated: **(1)** her 2nd audit gotcha — the Embarrassment mode-split: in
the default auto-mode the burst `atkPct 220` + S2 DoT `447.7% ×5` magnitudes and the whole
Embarrassment-off cadence are an unmeasured parser baseline (plan §milk-blooming-bunny gotcha 2, MEASUREMENT);
**(2)** the pierce-window DPS share is unmeasured — a milk-blooming-bunny-FOCUS recording is needed to
confirm how much of her damage really lands inside the +117.64% window. Do NOT re-fudge 117.64 to cool her.
Recipe: milk-blooming-bunny-focus video, read burst-window vs out-of-window DPS split + confirm the pierce
buff-icon window. Trail: `src/skills/overrides/milk-blooming-bunny.json` caveat, DECISIONS 2026-07-20, plan
§milk-blooming-bunny.
**UPDATE 2026-07-21 (U13 DoT-crit flip):** enabling DoT crit added +0.030 to her HOT residual (1.300→1.330)
via her S2 447.7% dot now critting — a FAITHFUL mechanic, not new over-model. So when this reconciliation is
finally taken, ~0.03 of her heat is now correctly attributed to dot-crit; do not re-chase it as part of the
Embarrassment/pierce-window over-model.

### U22 — Snow White (`snow-white`) "Full Charge Damage: 1000% of damage": ADDITIVE (owner ruling) vs ×10 MULTIPLICATIVE (footage) — CONTESTED 2026-07-20
The owner ruled the 1000% ADDITIVE ("part of the normal charge damage bucket" → full-charge coefficient
499.5 + 1000 = 1499.5% of ATK; encoded as the derived chargeMultPct 300.2002, landed). The SAME-DAY
control-footage pass (sw.MP4, all 6 of her cannon windows read) contradicts additive on two independent
axes: (a) the in-game charge readout ramps 929→966→**"1000%"** at the shot — the charge UI displays the
full-charge MULTIPLIER, exactly as an SR displays 250%; (b) the six nuke popups (50.5M / 54.1M / 45.1M /
59.5M ×2 / ~45.1M — every one labeled CORE HIT + PIERCE + crit-starburst, two exact value-repeats) sit at
~630 sheet-ATK-multiples, reconcilable with the ×10 4995% class × FB × core × crit × live buffs but ~3-4×
above anything the additive class can produce. Third corroboration: the control-board A/B — additive
encoding reads **0.452–0.503 COLD** (sim ~194M vs real 385–429M) across all four control runs; the old ×10
encoding read 0.696–0.777. Single-recording evidence, so the landed additive encoding was LEFT STANDING
per evidence-proportionality — **OWNER TO RE-RULE**. Related NEW observed gap (same footage): she KEEPS
FIRING HER AR during the ~5s cannon charge (the cannon materializes only for the shot; the cast animation
precedes the FB banner by ~1-2s) — the engine's weaponSwap cannot fire the base weapon while a swap charge
runs, so the sim silently loses ~5s of AR fire per burst window (~30s/fight; her plausible residual COLD
driver even under ×10). Candidate faithful re-encode: drop the weaponSwap, model the cannon as a
delaySec≈5.5 charge-bucket hit while the AR keeps firing — needs an owner ruling on charge-buff
composition. Trail: `src/skills/overrides/snow-white.json` note (footage-pass appendix),
`docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §snow-white, DECISIONS 2026-07-20
(control comps wired).

### U20 — Does a unit's OWN same-cast self-buff apply to its OWN cast-instant burst damage? (Phase A A2, DEFERRED 2026-07-20)
**Owner ruling 2026-07-20: DEFER A2 entirely — blocked on an isolating measurement.** The kit-audit plan
(§A2) proposed a "same-cast self-buff guard": exclude a unit's own same-`burstCast` self-buff from its own
cast-instant burst nuke. **Premise gate (fresh-context, blind) came back CANNOT-VERIFY**, and undercut the
plan's stated basis:
- **The leak is REAL and inconsistent (P1, CONFIRMED empirically).** `ein`'s 300.02% true nuke (burst slot)
  reads `dmgUp=1.9819` = baseline 1.4289 + her own same-cast +55.3% `trueDamagePct` (burst[0]), while her
  feather lump (skill2 slot, resolved earlier) at the same instant is `dmgUp=1.4289` — no self-buff. Pure
  block-array-ordering accident: same-slot-later damage eats the self-buff, earlier-slot damage doesn't.
- **The correctness DIRECTION is unmeasured (P2, CANNOT-VERIFY).** The SSOT's only "misses same-cast
  self-buffs" statement is scoped to **skill-slot** blocks ([damage-calculation.md:190-192], [game-mechanics.md:238-240]) —
  there is NO burst-slot rule. The one measured burst-slot anchor, Cinderella (`cinderella`) §5b
  ([damage-calculation.md:380-381]), actually **INCLUDES** her own cast-granted conversion in the matching
  FinalATK (it isolates the +50% FB and *another unit's* entry aura as excluded — never the caster's own
  same-cast self-buff). No probe recording isolates this variable for any unit.
- **Blast radius:** 16 units carry a burstCast self-buff + cast-instant burst damage (`ein`,
  `elegg-boom-and-shock`, `arcana-fortune-mate`, `quency-escape-queen`, `soda-twinkling-bunny`, `privaty`,
  `liberalio`, `eve`, `raven`, `drake`, `scarlet`, `nayuta`, `asuka-wille`, `cinderella-crystal-wave`,
  `delta-ninja-thief`, `helm`[inert: `charge:false` nuke]). Several are board-CALIBRATED (soda/privaty/
  liberalio OK), so a board A/B cannot reveal the direction (co-calibration, same wall as U14). The two
  directions move `ein` OPPOSITE ways (exclude → colder; include-everywhere → hotter toward 1.0).
**RESOLVER (the real test):** a focus-video that reads `ein`'s (or `elegg-boom-and-shock`'s) burst-nuke
popup value and back-derives whether the same-cast self-buff is in it (× the buff factor or not). Until
that measurement lands, NEITHER direction is enacted; the engine keeps its current (ordering-accidental)
behavior. Trail: `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A2.

### U21 — maxwell's "highest final ATK" buff recipient (A3, HELD 2026-07-20)
**A3 landed `byFinalAtk` on 4 units but HELD `maxwell`** — her S1 grants atkPct 43.1 + chargeSpeed to the
2 highest-FINAL-ATK allies on `fullBurstEnter`. Switching her to live-ATK ranking swings her only graded
comp ("PG iron sweep" [d-killer-wife, `takina`, `milk-blooming-bunny`, `maxwell`, `liberalio`]): the +43.1%
ATK lands on `takina` (Burst II — structurally the sole possible cause), pushing takina 0.988 OK → 1.280
HOT. This is a **transient-snapshot artifact**: peak effective ATK in that comp is milk 446k > liberalio
377k > takina 234k > maxwell 132k, so takina is NOT naturally top-2 — she only ranks up at maxwell's FB
*instant* because milk's 446k (her own burst peak) is transiently at base then. Entangled with milk's known
COLD (0.681, pierce package inert) under-model, so the ranking there is untrustworthy. **RESOLVER:** a
maxwell-focus video reading which 2 allies actually receive her ATK/charge-speed buff icon at FB entry
(and whether the real game snapshots instantaneously or over the window). Until then maxwell stays on
STATIC ranking (status quo, no regression). NOTE when she lands: she'd be the first FB-enter atkPct final-ATK
selector, activating a same-frame apply-ordering dependence (other FB-enter final-ATK selectors' ATK grants
would then reorder her pick) — verify apply order at that time. Trail: DECISIONS 2026-07-20 A3,
`docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A3.

### U19 — grave's burst-window over-model, exposed by the (faithful) timed-pierce primitive (2026-07-17)
**Surfaced by the `gainPierce` primitive (engine-modeling-gaps fix #7).** The timed-pierce window lets
"Gain Pierce for N sec" wake a unit's Pierce Damage ▲ buffs. **MECHANISM (owner-confirmed 2026-07-17):**
Pierce Damage ▲ is a real Damage-Up-bucket entry that DOES apply on the partless scope-lock boss (only
the separate pierce core+body DOUBLE-HIT is multipart-only, `PIERCE_CORE_DOUBLE=false`). So wiring it on
**grave** (measured, solo 1.005) at faithful kit values (self 52.8 + team 39.98 = +92.78 Damage Up for
10s/burst, S1's 48.4 excludeSelf'd) is CORRECT — yet it overshot her three comps from 0.836/0.831/0.800
COLD to **1.178/1.171/1.219 HOT**. The faithful pierce is now ENABLED (owner-directed 2026-07-17,
faithful>fit) — so the HOT is a live, isolated residual, not the pierce. Since the pierce is real, the
overshoot is diagnostic: grave's 0.836 COLD was a **NET of two errors** — the missing pierce (COLD) was
MASKING a compensating over-model in her burst window (HOT = the documented "AR-carry burst-window
residual"). **Open question:** where is the burst-window over-model? Candidates — Overheat II/III ramp
modeled as full-window uptime (her own ⚑3 says durationSec 7.5/5.0 would match the real ramp-in vs the
current 10s), the unmodeled Prediction-end forced reload (~9-11/fight, ⚑2, would cut shots), or her
burst-window fire-rate/crit stack. **Method:** a focused grave burst-window recording — fire count across
the 10s Prediction window + a Pierce-Damage-on/off popup to pin the real pierce magnitude; then trim the
burst-window over-model (grave should land back near 1.0 with pierce ON). Links: grave override ⚑1,
engine-modeling-gaps theme 5 / fix #7, damage-calculation.md dmgUp bucket.

### U18 — Sim ATK term ~+1.63% low = the unmodeled RELATIONSHIP (bond) bonus — RESOLVED + IMPLEMENTED 2026-07-16 (owner-identified)
**CAUSE (owner, 2026-07-16): the relationship (bond) ATK bonus was unmodeled.** It is a flat
class×MANUFACTURER stat present in every recording: the manufacturer sets the max bond level
(Pilgrim/Overspec cap 40, Elysion/Missilis/Tetra/Abnormal cap 30) and the class picks the stat.
The owner's per-unit numbers matched the in-game bond table EXACTLY at the manufacturer max level —
e.g. L40 Attacker ATK 2340 (Pilgrim isabel + scarlet [`scarlet`, AR]), L40 Supporter 1950 (Pilgrim nayuta), L30
Attacker 1640 (Tetra noir), L30 Defender ATK 1094 + HP 45097 (maiden, both confirmed). This is why
the elevation looked "uniform" (most units are 30-cap ⇒ +1640/+1.39%) yet isabel/scarlet (Pilgrim
40-cap ⇒ +2340/+1.98%) read higher — NOT core, NOT gear tier (those hypotheses were desk-eliminated;
core maxes at 7 and core-7 ×1.14 is validated by the 2026-07-13 120,143 read; base5 gear is confirmed).
The residual ~0.25% over the flats is measurement-basis slack (bossDef ±0.12% + coefficient noise).
**IMPLEMENTED:** `src/relationship.ts` (data helper) + `data/relationship-bonus.json` (max levels +
per-level per-class stats, from the in-game bond table) + engine applies it in the unit build
(staticAtk + maxHp, sim.ts) driven by `SimConfig.relationshipLevel` / `PreparedUnit.relationshipLevel`,
defaulting to the manufacturer MAX (= the scope-lock basis + the web default). `manufacturer` is now
synced into characters.json (sync.ts, from the DB attributes blob; Overspec units get " Overspec"
appended → the 40-cap bucket). Regression snapshot regenerated (all-green): the board warms ~+1.4-2%;
notable faithful side-effect — the D:KW/takina/milk/maxwell/liberalio comp's "2 highest-ATK allies"
buff (maxwell S1) correctly retargets from maxwell to liberalio (Pilgrim, now genuinely top-ATK; was
a degenerate 118,027 tie) → maxwell −21% / liberalio +31%, an ATK-ordering flip, not a bug.
FOLLOW-UP: the SG landing table + other ⚑ values were calibrated at the OLD (no-relationship)
term, so they over-shot (noir solo 1.006→1.020). **RESOLVED 2026-07-16 (DECISIONS): `SG_LANDING_BY_BAND`
recalibrated by a UNIFORM ×0.9863 (= base5/bond ATK, the measured +1.39% uplift) → near 0.888/mid 0.986/
far 0.74/midfar 0.888; noir solo restored to its pre-bond point 1.006 (verified in-sim), the SHAPE
preserved (U17 HOLD). SG board units cool ~0.8–1.6% to cancel the bond warming, non-SG keep the +1.39%.**
DONE 2026-07-16: isabel/brid-silent-track staging baselines
reverted to kit coefficients (isabel rider 174.49→170.58; brid stays 675% — term now correct via
relationship). The four Overspec units are final (mihara-bonding-chain/rapi-red-hood/anis-star/
neon-vision-eye); "UC" was an owner typo, dropped.
--- ORIGINAL DIAGNOSIS (superseded by the owner's identification above; kept for the evidence trail) ---
Diagnosed at the desk from EXISTING reads (no new video). The sim's scope-lock static ATK
(Attacker 118,027 / Supporter 98,367 / Defender 78,707, base5 gear) reads ~+1.63% below the in-fight
term measured in FIVE reads spanning THREE weapon classes and ALL THREE unit classes — so it is GLOBAL:
- jill (AR Attacker) → term 119,800, double-derived (normal + DoT, agree to 0.02%); +1.62% (HIGH).
- guilty (SG Attacker) → 119,827 via popup-verified pellet step; +1.65%.
- brid-silent-track (SG Supporter) → 99,826 via pellet grid AND rider (rider = EXACTLY 675.00% at
  that term); +1.63%.
- maiden-ice-rose (RL Defender) → 79,853, double-confirmed (rider 547.62% AND normal-core), +1.64%;
  its own probe-runs note recorded "uniform 1.0146" at the time and dismissed it as noise.
- isabel (SG Attacker) → ~+2.3% (roughest read; consistent in sign).
The four clean reads agree to ~0.03% at ~+1.63%. **The measured term matches the OL0 numbers
(Attacker 120,143 / Supporter 100,130 / Defender 80,118) to ~0.17% — NOT base5.**
**IT IS A GEAR-TIER QUESTION, NOT CORE.** (A first pass entertained a "core 8" fit — base5+core8
= 119,943 matches to 0.002% — but core MAXES at 7 (owner-confirmed; the docs/handoffs/closed/base-stats-handoff.md:71
"core can exceed 7" line was WRONG, now corrected), so that was a coincidence. Core-7 ×1.14 is itself
VALIDATED — the 2026-07-13 video-verified combat ATK 120,143 = core-7 ×1.14 + OL0 gear. So the
elevation is gear, not core.) This DIRECTLY re-opens **DECISIONS 2026-07-14 (base5 switch)**, which
itself flagged the contradiction: the 2026-07-13 combat ATK was "video-verified twice" at the OL0
numbers, yet the sim was switched to base5 (118,027) after an in-game gear-set measurement, with the
note that the video verifications "either weren't precise to that margin or need re-checking." The
five new in-fight DAMAGE reads are the re-check — they side with the OL0 video, not base5.
Board impact (measured, +1.63% ATK injection): warms every unit ~+1.6% toward 1.0 (board runs cold);
but noir/dorothy-serendipity — which CALIBRATED the SG landing table at the low base5 term — then
over-read, so a basis bump must drop the SG landing table ~1.6% in the SAME change (the U17 coupling).
Orthogonal to the far-band SHAPE deficit (a uniform scalar can't make far -12%).
DISPOSITION: **LOG — owner-gated** (reverses the owner's own 2026-07-14 base5 ruling; reprices the
whole board + recalibrates landing; only the owner knows their recorded units' actual gear). OWNER
ARBITRATION: are the recorded scope-lock units on plain base5 gear or OL0-equivalent (overloaded)?
The damage + the 2026-07-13 video both say OL0. If OL0 → revert the scope-lock gear basis base5→OL0
(120,143) + drop SG landing ~1.6% + re-run board/regression. If genuinely base5 → the +1.63% is an
omitted stat source (bond/affinity/collection) to hunt. WHY the 2026-07-14 base5 measurement and the
damage disagree is the piece to reconcile (did the recorded units carry better gear than the base5
set that was measured?). Full memo: session archive docs/handoffs/closed/2026-07-16-u18-atk-term-diagnosis.md; Fable check
SOUND-WITH-CAVEATS/HIGH. Fixed en route: the stale "treasure-inclusive" comment in scope-lock.ts (the
120,143 figure is OL0 GEAR, not treasure) and the docs/handoffs/closed/base-stats-handoff.md:71 "core >7" error.
Isabel/brid-silent-track baseline notes encode the measured term per-unit; revert to kit coefficients
IF the basis is corrected globally.

### U17 — SG landing is per-unit (and per-position within the near band) — the class table is a compromise (2026-07-16)
> **CLOSED — OWNER OVERRIDE (2026-07-17).** The owner rules the shotgun pellet-landing investigation
> (A26 → this U17 per-unit continuation) closed WITHOUT pursuing per-unit landing profiles or a third
> far anchor. Resolution: model landing as (a) a per-band seeded pellet-count JITTER — each SG spray
> shot draws a whole landed-pellet count, bell-curve weighted toward the band mean (near/mid {8,9,10}
> ≈ 68% mid / 16% each outer, midfar {7,8,9}, far {6,7,8}; mean-preserving vs the class table), and
> (b) a backend `SimConfig.bossPelletProfile` = small (default = the ranges as-is) / medium (drawn +1,
> clamped, near/mid → 84% full) / large (every band lands full pellets), scaling by boss silhouette
> size. This is an owner MODELING RULING, not a new measurement — the per-unit far/near residuals are
> accepted, not fudged away. Scope caveat: BOTH mechanisms are SEEDED-ONLY (inert in the default
> expected-value product, which still uses the fixed `SG_LANDING_BY_BAND` table — see the seeded-by-
> default question), and the medium/large profile magnitudes are ⚑ UNVERIFIED (new low-prio action
> item to verify boss profiles; dorothy PH vs N9 already disagree on which profile fits). Engine:
> `sgLandedPellets` + `SG_LANDING_JITTER` in `src/engine/sim.ts`; see DECISIONS 2026-07-17. The
> analysis below stands as the record of why per-unit landing was NOT encoded.

Outcome of the pre-registered SG range-landing corroboration campaign (guilty + Brid: Silent Track
solo reads vs the isabel hypothesis; scientific-method 2-of-2 decision = **LOG, no engine change** —
the pre-registered SPLIT branch fired):
- **Far band, two clean anchors agree:** Isabel implied landing ~0.656, Brid: Silent Track ~0.649
  (her far M 0.709 vs the isabel-hypothesis prediction 0.710 — a 0.1% hit). The staged candidate
  **far 0.75 → ~0.66** (⚑ calibrated-with-measured-support) is parked pending either a third clean
  anchor or a resolution of Guilty's contrary shape. Note noir's 2026-07-15 counter reconciliation
  (which SET the current table) reconciled at far 0.75 for noir — a third data point FOR per-unit.
- **Guilty reads as the CURRENT table shape × a flat ~0.91 unit factor** (near landing measured
  directly at ~0.81 by pellet-lattice decomposition, popup-confirmed; her far/near ratio 0.634 ≈ the
  engine's 0.629). She refutes the class-wide reading of the far deficit.
- **Near landing is not a constant even within one fight:** Brid: Silent Track's two near windows
  measured 8.52 vs 9.41 landed pellets/10 tracking visible boss proximity; across units near spans
  ~0.81 (Guilty) → ~0.90 (Isabel) → 0.85–0.94 (Brid). A single global near value cannot deliver ±3%
  per SG unit.
- All nine range-band reads across the three units sit BELOW the current table's predictions
  (sign-unanimous, magnitude-inconsistent) — the table is, if anything, generous at range, but by a
  per-unit amount.
**CONSOLIDATION 2026-07-16 (all measured SG units) → decision = HOLD, no per-unit landing overrides
this pass.** Per-unit landing ratios-to-table (term-independent), from every SG read in the repo:
noir near/mid/far/midfar r0.99/1.00/0.99/0.98 (it SET the table); isabel r1.01/0.94/0.87/0.95;
guilty r0.89/0.92/0.93/0.97 (flat ~0.91, far her LEAST-deficient band); brid-silent-track
r1.01/0.92/0.88/0.89; dorothy-serendipity landing not separable (consolidation confound);
soda-twinkling-bunny no isolable data (its footage counter is a TEAM total). Cross-unit spread:
near 12.9% / far 12.2% / mid 9.0% / midfar 9.0% — every cell ≤ the class table, but by a PER-UNIT
amount, with NO datamined-stat correlate (far/near ratios non-monotonic vs normalMult & reloadFrames;
class/element give no split). **Why HOLD:** encoding per-unit landing now improves ZERO measured units
and REGRESSES two — the sim-LOW units (isabel real/sim 1.086; guilty 1.35) are low for OTHER reasons
(isabel rider + the U18 term; guilty's unmodeled S1-duplicate/S2-stack self-buffs + term), and every
landing factor is ≤1 so applying it drags them further down. noir/dorothy already sit on the table.
FIX ORDER: (a) promote the SG baselines to engine-loaded overrides (guilty/isabel/brid-silent-track
live only in overrides-baselines/ → any loadOverride harness falls back to the bare parser, which
over-fires brid's riders to ~4.9× — a harness artifact, NOT a model bug; her baseline reconciles at
0.94); (b) resolve U18 (the ~+1.6% term); (c) THEN revisit landing. The one durable staged candidate
is a per-unit `sgFarScale≈0.88` for isabel+brid ONLY (far ~0.66), NOT a class-wide far cut; cleanest
engine shape if ever built = per-unit `sgLandingScale` (guilty) + optional `sgFarScale` (isabel/brid),
unlisted units keep the class table. Consolidation memo + machine table: session archive u17-work/.
**2026-07-16 FAR-BAND RESOLVED (per-unit; class-wide 0.66 REJECTED).** Two developments closed
open item (1) "a third ATK-clean solo SG read":
- The "datamined per-unit accuracy/spread stat" alternative is a DEAD END — the synergy-API
  characters.json carries NO per-unit accuracy/spread/reticle field (full per-unit field set is
  enumerable: ammo, baseStats, burst, burstCooldownSec, burstGaugePerShot, chargeFrames,
  chargeMultiplier, class, coreAttackMultiplier, element, hitsPerShot, manufacturer, name,
  normalAttackMultiplier, reloadFrames, rl3, skills, slug, treasure, weapon — no spread correlate).
  The structureSearch above already tested every field we hold; there is no stat to correlate the
  far split against.
- **noir is the third clean anchor** (owner-confirmed 2026-07-16). She is the CLEANEST possible SG
  read: treasure=false (no ATK confound), SOLO Burst-III so she can NEVER enter Full Burst (zero
  riders/FB/burst-skill damage — the entire 64.87M real total is pure base-hit-rate spray), and the
  running DAMAGE-counter per-mag delta is an overlap-immune per-shot instrument
  (docs/probe-data/noir-solo-recon.json). noir far impliedRealLanding ~0.74 (ratio-to-table 0.99),
  i.e. AT the table. So the four clean solo far reads split 2-vs-2: isabel (r0.87, ~0.66) + brid
  (r0.88, ~0.66) LOW vs guilty (r0.93, ~0.70) + noir (r0.99, ~0.74) at/near table. **This falsifies a
  class-wide far = 0.66.** Far is per-unit; the class table far STANDS (correct for noir/guilty).
  CIRCULARITY CAVEAT: noir SET the table's far=0.74, so she cannot independently re-confirm that
  absolute value — but she independently establishes noir-far >> isabel/brid-far, and THAT spread
  (term-independent) is the valid falsifier of class-wide-0.66.
**Consequence:** the staged far ~0.66 (`sgFarScale≈0.88`) survives ONLY as an isabel/brid-specific
per-unit candidate, NOT a class-wide value; it stays DOCUMENTED-but-UNENCODED (HOLD rationale
unchanged: isabel/brid are sim-LOW for rider/term reasons, so a <1 landing factor drags them
further down). No new footage needed. STILL OPEN: (2) re-derive isabel's mid/midfar with clock-drift
correction (her single-anchor read predates that discovery). Full record:
docs/probe-data/guilty-sg-band.json + brid-silent-track-sg-band.json (+ -events) + noir-solo-recon.json,
the pre-registration in the session archive, DECISIONS 2026-07-16.

### U16 — Soda burst over-generation + dynamic chip-state (2026-07-16, from the re-tune)
Two open items surfaced landing the Soda re-tune (DECISIONS 2026-07-16):
- **Rotation over-generation:** the sim gives Soda **6 bursts vs the recorded 5** in the soda-control comp
  (LM/Crown/Soda/Helm). Reality's 6th burst would sit at ~20 pre-consume chips (<30) and wouldn't clear her
  own ATK gate anyway — so the sim over-credits a nuke + a 65.25% ATK window. Suspect the Soda/Helm B3-
  alternation cooldown collision or FB-extension-shifted timing (her +4s FB-extend). This FLATTERS her
  vs-real 0.887 (true ~0.82). Recipe: trace the burst-cast frames of both B3s over 180s vs the recording's
  5 Soda-burst timestamps (t≈10/48/84/124/162).
- **Dynamic chip-state (DEFERRED, engine work):** her `critDamagePct` is modeled as a FLAT passive 42 (the
  control-comp chip time-average). But a NO-burst comp (N3 — she never casts, chips never drain) reads
  effective ~50 and grades 0.96 with flat-42 under-crediting ~3%. The faithful model is dynamic Golden-Chip
  tracking (crit-damage = 1.32 × live chip count), which needs an engine currency-state feature. Until then
  the flat passive is comp-dependent-approximate (right-ish for burst-cycling comps, low for no-burst).
- **Community-footage corroboration (2026-07-21, submission-review session — OBSERVATIONS ONLY, not enacted):**
  three more recordings independently show the same rotation over-generation family (all n=1, gear-confounded):
  - **Sakura: Bloom in Summer comp** (Rouge, Ade: Agent Bunny, Sakura: Bloom in Summer, Cinderella, Mihara:
    Bonding Chain): the total full-burst count is right (10 = 10), but the two-Burst-III **allocation is wrong** —
    the sim gives Sakura: Bloom in Summer 6 bursts / Cinderella 4, while the footage shows strict 5/5 alternation
    (Sakura on full-bursts 1,3,5,7,9; Cinderella on 2,4,6,8,10, verified by burst-color signature on all 10).
    Rotation-log diagnosis: the sim double-casts Sakura at full-bursts 3 (41.6s) and 4 (67.6s) — a leftmost-
    tiebreak when both Burst-IIIs are ready. This is a Burst-III **selection** question (the count is fine), and
    touches Cinderella, who IS board-graded — so an engine tiebreak change has real blast radius.
    - **[2026-07-21] in-FB burst-CDR hypothesis REFUTED — the source is elsewhere.** One theory for the Sakura
      double-cast was that Rouge's S1 "Burst CD ▼ 7s" was being applied *during* Full Burst (shaving Sakura's
      40s cooldown so she came off CD early at Cinderella's turn). A prototype that suppressed in-FB skill CDR
      was built + verified faithful but REGRESSED three measured FB-count comps, and the owner then re-watched
      the footage and confirmed the CDR proc DOES apply during Full Burst (DECISIONS 2026-07-21). So in-FB CDR
      is real and is NOT the cause. The Burst-III **leftmost-tiebreak selection** (above) remains the leading
      candidate for the 6-cast-vs-5 over-allocation — to be opened fresh. (No engine change on `main`.)
  - **Ludmilla: Winter Owner comp** and **Rosanna: Chic Ocean comp**: both read **12 real full bursts vs the
    sim's 13** (sim over-generates by one). The Rosanna reviewer pinned the mechanism: the sim opens its first
    full burst at ~3.4s vs the footage's ~7s (optimal-start vs human startup lag) plus a slightly tighter cadence,
    squeezing one extra full burst into the 180s. Since the sim's rotation is measured-exact on the owner's graded
    scope-lock comps and first-full-burst timing is a measured constant (never refit), this 13-vs-12 gap is most
    likely a recorder startup-lag + gear confound, NOT an engine defect.
  Net: these strengthen "does the engine over-generate / mis-allocate bursts?" as an open thread, but none are
  enactable from community footage (n=1, gear-confounded, engine-wide blast radius, measured-constant domain).
  Full record: docs/handoffs/closed/2026-07-21-submission-review-session.md.

### U15 — Rapi: Red Hood explosion residual (after the 2026-07-16 reopen)
The explosion-core reopen (DECISIONS 2026-07-16) narrowed her deficit (T3 0.84→0.91, T7 0.72→0.81,
T8 0.84→0.90, N1 0.92→0.98) but left it EXPOSED as a prediction rather than fitting it away. Still open:
- **Explosion CRIT — LANDED 2026-07-16 (`storedHit.crit:true`).** Enabled by CONSISTENCY (every other RRH
  hit already crits additively at her sheet rate; only the stored-hit release was crit-OFF, an artifact), NOT
  by the ×1.5 magnitude (which is confounded by overlapping sub-hit coefficients). T7 0.81→0.83, uniform
  +0.01–0.02, residual preserved. See DECISIONS 2026-07-16.
- **FOUNDATIONAL (open, NOT blocking): is the crit/core bracket additive or multiplicative?** The sim models
  crit and core as ADDITIVE terms in the major bracket (`major += critRate×critBonus + coreRate×coreBonus`).
  The measured RRH core+crit body (7,948,092 = base ×1.80) does NOT compose cleanly under additive constants
  (critBonus 0.5 + core step would predict a different ratio) — it fits either multiplicative crit, or a
  distinct explosion core bonus, or popup mis-association. This property applies to ALL 86 readings, not just
  RRH, so it's a foundational audit, not an RRH fix; bounded consequence on RRH ~0.3–0.4% of total. Would need
  a clean isolated-popup recording (readable crit-damage stat + FB state) to resolve.
- **Does the rocket ATTACH actually generate burst gauge in-game?** The engine treats every skill-damage
  hit as gauge-generating (pre-existing blanket rule), so her attach cadence shifts FB timing. Not
  introduced by the reopen, but now load-bearing — worth a targeted check (meter/gauge co-read).
- **Meter carryover semantics.** Modeled as a threshold switch (120→60), not +2-fill-per-hit; these differ
  only at the FB boundary. A meter-carryover measurement (count meter-100% events across an FB entry) would
  discriminate.
- Residual remainder is likely generic MG-cold (board ~0.947).

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
**ANSWERED / LANDED 2026-07-21 — `DOT_CRIT` flipped default OFF→ON (DoT ticks + stored-hit releases
now roll crit universally; core stays off; `DOTCRIT=off` = revert switch; per-dot explicit `crit`
still overrides). Owner-directed; full-board A/B + ONE consolidated Fable review APPROVE; faithful>fit,
board-NEUTRAL (weighted mean|ratio−1| 0.0710→0.0712, ±3% count 6→7). The ÷1.075 "de-crit the calibrated
base" prep step was DROPPED — a provenance audit found ~15/17 dot bases are kit-datamined true multipliers
(NOT crit-absorbed), so ÷1.075 would have net-degraded the board. Full ruling + evidence + queued
follow-ups (mihara-bonding-chain suspected tuned-base double-count; function-rider path still separate) →
DECISIONS 2026-07-21. **ada follow-up RESOLVED same day (owner ruling): TRUE DAMAGE CANNOT CRIT — her
`flavor:"true"` grenade DoT is crit-exempt via a new engine `crit && !trueFlavor` guard (her U13-flip gain
was spurious, reverted 0.933→0.903); the guard also fixed a pre-existing true-crit bug on ein/laplace/chisato
true flatDamage + trueNormals windows, board-confirmed chisato 1.154→1.119. DECISIONS 2026-07-21.** Everything below is the PRE-LANDING trail;
the DECISION-HELD and PHASE-A-RULING blocks are SUPERSEDED by the flip.**

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

**PHASE A RULING (2026-07-20, owner) — LEAVE IN PLACE (reaffirms HELD-default-off).** The kit-audit
implementation plan (`docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A1) routed every
DoT/rider crit-OFF gotcha here rather than flipping the engine. Owner ruling on A1: **leave the XCRIT/
DOTCRIT gate default-off**; this stays a tracked future increment, NOT enacted in the Phase A pass. The
gate is the shared cause of a cluster of kit-audit findings — two sub-populations to recalibrate together
when the increment is finally taken:
- **DoT-tick crit-OFF** (dominant-damage DoT units read under-credited): `ada` (grenade DoT), `mana`,
  `raven`, `rosanna-chic-ocean` (all FRESH from the 2026-07-20 audit) plus the previously-tracked
  `kind:dot` roster; interacting magnitude/delivery questions on `bready`, `elegg-boom-and-shock`, `privaty`.
- **`extraHitDamagePct` function-rider crit-OFF** (hard-coded `crit:false` in the rider path): `modernia`
  (Destroy Mode 2.24%), `nayuta` (Memory Incineration 530.46%), `neon-vision-eye` (Super Firepower 262.79%).
Enactment remains gated on: (1) a focus-video crit-signature confirmation per rider (the maiden-solo
×1.5 read is the template), AND (2) the DoT-roster de-crit recalibration (÷~1.075) so measured-DoT units
(e.g. guillotine, popup-measured) are not double-counted. High blast radius ⇒ a dedicated increment in a
fresh session, never a per-unit edit inside another pass.

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
~90% @85% acc — a different axis. ore-game.com/verify-memo: shotgun core is ~6% front row /
~1.6% mid / ~0% back (auto, base accuracy) — i.e. **range-band dominated** [front-row figure
CORRECTED 2026-07-15 from a "~100%" transcription error; ~6% corroborates our measured SG near
0.072 — see the LANDED block below + `docs/probe-data/sg-core-research.md`]; うま's MG note: MG cores ~100% once warmed
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

**LANDED 2026-07-15 ⚑ refit — AR/SMG/SG core rate is now RANGE-DEPENDENT per (weapon, band)** (sim.ts
`acrFor(weapon, band)` + `CORE_BY_WEAPON_BAND`; the flat AR/SMG/SG 0.85 is OVERTURNED, MG/SR/RL 0.95 stands).
Three scope-lock SOLO recordings (Scarlet AR, Chisato SMG, Drake SG — no Full Burst → clean out-of-FB
reads) binned every normal-attack core popup (red "CORE HIT" text) by the boss-range band. Core is
strongly range-concentrated (close → far), FB-independent (aim geometry), weapon-ordered AR > SMG > SG;
ALL bands far below 0.85. Measured per-band ⚑ (Wilson 95% CIs in `docs/probe-data/coreband2-*.json`):
| weapon | near | mid | midfar | far |
|---|---|---|---|---|
| AR | 0.40 | 0.30 | 0.03 | 0.00 |
| SMG | 0.28 | 0.244 | 0.076 | 0.059 |
| SG | 0.072 | 0.00 | 0.0045 | 0.00 |
The union raid boss is the SAME physical boss across element assignments (owner) → these values transport
across every validation comp. **Falsifiable test confirmed:** only AR/SMG/SG rows moved (146-row board),
all downward; MG/SR/RL byte-identical; LM's SMG residual closed as predicted (1.36→1.00). Per-weapon mean:
AR 1.095→0.881, SMG 1.069→0.831, SG 1.106→0.755. Board median 0.995→0.950, MAE 0.141→0.144 (≈flat),
within-±10% 53→56%. The re-centering to ~0.95 is EXPECTED/diagnostic (the flat 0.85 masked pre-existing
AR/SG under-models). New knob `CORERATEBAND=off` restores the prior flat per-weapon table for A/B.
STILL OPEN / RESOLVED:
(1) **SG extreme-near (0–25) band — RESOLVED 2026-07-15 (s1 online research):** ore-game verify-memo
measures SG front-row core ~6% (auto, base accuracy), CORROBORATING our measured near 0.072 (two
independent base-accuracy reads converge at 6–8%). Sharp near-only STEP (6%→1.6%→0%), not a continuous
curve → the band-table is the right form. SG near 0.072 STANDS — do NOT raise it (10-pellet spread +
12.5px auto reticle floor structurally caps SG cores; 40–90% figures need 75–88% accuracy, absent under
scope lock; our small central core if anything reads lower). ⟹ the cold-SG residual (0.755) is NOT the
core rate — it's a separate under-model (pellet-body-hit crediting / band-time allocation), under s4's
audit. `docs/probe-data/sg-core-research.md`.
(2) **AR near 0.40 CONFIRMED 2026-07-15 (s2, Moran re-record):** direct "CORE HIT"-count 0.40 [0.27,0.55]
AND an ammo-verified damage reconciliation 0.40 agree EXACTLY (two methods, one unit) — and match Scarlet's
0.40, so two independent AR units converge and the ~10% Scarlet non-core-error worry is removed. AR near
provisional flag DROPPED. AR mid/midfar carry boss-distance-in-scripted-window noise (Moran's "midfar"
window sat at medium range; per-band mid/midfar disagree between the two units while pooled-by-actual-
distance agrees ~0.13–0.16) — a known refinement candidate, but the damage-dominant near value is solid.
`docs/probe-data/coreband2-moran-ar.json`. ⟹ grave/guillotine coldness is NOT a too-low AR table (near is
confirmed) — it's a separate exposed under-model, same as noir/naga on the SG side.
(3) **Geometric distance→core-size model (Option 2) — SHELVED (owner ruling 2026-07-15):** sources describe
a sharp near-only step, not a continuous distance curve, so the landed per-band table is already the right
shape; geometric generality is not indicated. Revive only if a future multi-boss dataset shows the table
failing to transport.
(4) control-team calibration to promote the ⚑ table toward MEASURED tier.
(5) **SMG core table is Hit-Rate-CONTAMINATED — known bug, deferred fix (2026-07-17, premise-pass finding).**
The `CORE_BY_WEAPON_BAND.SMG` row (near 0.28 / mid 0.244 / midfar 0.076 / far 0.059) was measured on
`chisato`, whose S1 grants `hitRatePct 22.37` (Extrasensory>25%, self, NOT Full-Burst-gated) — live from
battle start to ~t150s of the ~180s read. So those figures are SMG core at `x_base+22.37% Hit Rate`, NOT
base accuracy, yet the engine applies them to EVERY SMG unit including Hit-Rate-less ones → those units are
OVER-credited on SMG core. Cannot be cleanly corrected without a Hit-Rate→core model (the deferred
SG+AR-first plan, `docs/handoffs/closed/2026-07-17-hitrate-core-landing-plan.md`): once that model's slope is
validated on AR (jill) + SG (noir), chisato's known +22.37% becomes an SMG VALIDATION point and lets us
back out the true SMG base and refactor this row. Until then: left as-is, flagged. Owner ruling 2026-07-17.
**UPDATE 2026-07-17 — contamination MEASURED SMALL, downgraded to minor.** Re-read `chisato smg.MP4` binned
by her on-screen Extrasensory gauge (HR ▲22.37% on >25%, crosses 25% at fight ~151s; she never bursts →
FB-deconfounded): SMG near core **HR-off = 0.28 [0.18,0.42]** vs **HR-on = 0.33–0.34**, delta **+0.05
(p≈0.5, NOT significant)**. So the table's 0.30 is only ~0.02 hot for HR-less SMG units — a MINOR over-credit,
not a real bug. HR-off SMG-near baseline ≈ 0.28 now measured. Direction (HR raises SMG core) confirmed but
underpowered; a significant slope needs a bigger HR magnitude on a standard weapon (see the hitrate-core plan).

### A26 — Shotgun pellet-landing ⚑ + Dorothy: Serendipity consolidation — SEQUENCED (2026-07-15, Fable-arbitrated)
Two coupled SG items surfaced auditing dorothy-serendipity (owner-greenlit class-A fix). Fable ruled
**Option C: a sequenced two-step increment**, NOT a one-shot dorothy fix. Both steps are Fable-pre-op
APPROVED-WITH-REVISIONS; neither implemented yet.

**FALSE-PREMISE CORRECTION:** the pellet-landing model is NOT unbuilt. `SG_OUT_OF_NEAR_HIT_FRACTION = 0.3`
(sim.ts ~157, CALIBRATED ⚑: near band = all 10 pellets land, elsewhere ~30% = 3 pellets; applied in
`firePull` + mirrored into gauge gen). The dorothy solo footage (`docs/probe-data/dorothy-serendipity-firing.json`)
shows ~5–8 pellet POPUPS/shot in spray → contradicts the 0.3 ⚑ (measured ~0.5–0.8). This UNDER-credits SG
spray at mid/far, consistent with noir/naga running cold. (Caveat, Fable: popups under-report real hits —
the rapi invisible-X finding — so validate landing fractions against DAMAGE ARITHMETIC, not popup counts.)

**STEP 1 — DONE 2026-07-15 (Fable 2-of-2 LAND).** Measured (Drake solo damage-arithmetic, dropout≈1.0 via
the closed-book 53.97M global total, `docs/probe-data/sg-pellet-landing.json`): SG landing is ~FLAT — near
**0.60** / mid 0.60 / far 0.45 / midfar 0.55 — NOT the old 1.0-near/0.30-else step (both edges wrong; near
gaps let ~4 pellets through even point-blank). Landed as `SG_LANDING_BY_BAND` (sim.ts; `ENV.SGLANDING='legacy'`
reverts). Board flat (MAE 0.144→0.145), rotation pins EXACT (0 FB changes). **FAILED PREDICTION (logged):**
pre-stated "noir/naga WARM" was WRONG — all SG COOLED (near cut 1.0→0.60 dominates the mid/far rise); the
corroboration channel failed, landing stands on measurement validity. near 0.60 = LOWER BOUND (≤0.7–0.8 cap);
⚑ single-boss, ±0.10–0.15; do NOT correct it upward without a new direct measurement (see the SG under-model
item below). Details: DECISIONS (Engine/data-architecture).

**SHARED SG UNDER-MODEL — landing-dropout hypothesis FALSIFIED (2026-07-15, direct flash-count); landing STANDS.**
The clean-path re-derivation (correct the popup-counted landing upward by the drake solo-total ×1.47) was TESTED
and REFUTED. A blind, pre-registered impact-flash count (`docs/probe-data/sg-dropout-flashcount.json`) directly
counted pellet IMPACT-SPARKS vs damage-NUMBERS per band on the drake footage: **impacts ≈ numbers (~5–6 each) →
dropout ≈ 1.0 in every band.** The recovered landing is UNCHANGED (near 0.60, NOT the 0.88 a 1.47 dropout would
give). So the popup-counted landing is CORRECT (a direct count beats the SG-investigation's INFERENCE from the
confounded total). **Engine landing table UNCHANGED — validated.** Per the pre-committed decision rule (Fable
pre-op R1–R6), a dropout≈1.0 result = STOP, not a landing change. The drake solo-total ×1.47 shortfall is now
explained as: (a) TREASURE-CONFOUNDED — sim `drake`=treasure but the recording is base drake (reference-stats.json;
and note the confound goes the "wrong" way — treasure inflates the sim, yet sim<real, implying any real drake
under-model is even larger, i.e. NOT explained away by treasure); and/or (b) a FULLY-INVISIBLE damage channel
(no spark, no number) which the flash count cannot exclude but which is UNOBSERVABLE → NOT modellable without an
observed mechanic (invariant forbids adding invisible damage to fit). So the SG residual (soda 0.64 clean;
noir/naga ~0.65) is ACCEPTED as faithful-cold; do NOT fudge the landing/core to close it. The drake solo is a
BAD SG reconciliation anchor (treasure mismatch); a clean SG solo total needs an owned, treasure-matched SG unit.

**CLEAN ANCHOR ARRIVED (owner, 2026-07-15): noir solo — the SG under-model is CONFIRMED REAL (~1.56×), reopened.**
noir is pure SG, **treasure=false** (no confound), NO Pierce, NO consolidation, 0 bursts solo. Solo sim 41.66M vs
real damage-screen **64,873,527 → 1.56× short** on PURE SG spray. So the ~1.5× under-model is REAL (not just
drake's treasure confound) and NOT Pierce/consolidation-specific. Decomposition: dorothy's 3.09× ≈ this spray
~1.56× × her extra Pierce/consolidation ~2×. The landing/core/per-pellet are flash-verified, so the 1.56× is
either (A) a FULLY-INVISIBLE damage channel or (B) a COMPONENT the direct reads under-counted.

**RESOLVED (noir counter-reconciliation, 2026-07-15) = OUTCOME B: the LANDING CONSTANT was too low.** noir's
in-fight cumulative DAMAGE COUNTER (arithmetic; she can't burst solo → rider-free) gave per-mag 392,426/near-shot
vs sim 238,927 = 1.64× → **~10 pellets land near, not 6.** The visible damage RENDERS (a single-shot A/B popup-sum
matches the counter) — NO invisible channel. **Both prior visual reads (Step-1 popup count AND the flash count)
under-read a dense cluster of ~10 identical overlapping pellet numbers as ~6.** FIX: SG landing raised to near 0.90
/ mid 1.0 / far 0.75 / midfar 0.90 (per-band counter ratios). BOTH clean solo anchors reconcile: noir 1.01,
dorothy 1.01. Board MAE 0.120→0.114, median 0.950→0.970, pins exact. **The shared SG under-model is CLOSED** —
it was the under-counted landing (see DECISIONS, FINAL entry; the flash-count "0.60 validated" is SUPERSEDED).
This overturns the earlier "landing FALSIFIED, accept faithful-cold" — the counter (arithmetic) beat the flash
count (visual under-read of a dense cluster).
**SG CORE RATE was INFLATED ~1.5× — RESOLVED 2026-07-15 (counter re-derivation).** As Fable predicted, the core
rate (0.072) was a visual popup RATIO whose white denominator was under-read (~6 vs true ~9–10), inflating it.
Re-derived popup-count-free as cores-per-shot ÷ TRUE-pellets-per-shot → **near 0.072→0.048**, midfar 0.0045→0.003,
mid/far unchanged 0. Both clean solos STAY reconciled (noir/dorothy 1.01) and the residual SG comp warmth cools
(noir 1.04→1.03, naga 1.03→1.02). The small remaining ~2–3% comp warmth is a separate buff-interaction, not core.
`docs/probe-data/sg-corerate-rederive.json`; DECISIONS. **The SG model (landing + core + consolidation) is now
settled — → Dorothy is the designated SG-spray regression probe (memory `dorothy-sg-spray-regression-probe`).**
**2026-07-16 UPDATE — the landing table survives a three-unit corroboration campaign UNCHANGED, but the
"settled" reading is now qualified: landing is measurably PER-UNIT (and per-position at near).** Isabel +
Brid: Silent Track agree the far band lands ~0.65–0.66 for THEM (staged ⚑ candidate far 0.66, not landed);
Guilty reads the current table shape × a flat ~0.91 unit factor; noir's reconciliation (which set this table)
remains exact for noir. No engine change (2-of-2 LOG, pre-registered split branch) — the live continuation
is **U17** (per-unit landing profiles) and **U18** (the ATK-term elevation these reads exposed).
Original framing (superseded by the falsification above):

**SHARED SG UNDER-MODEL — was a first-class open item (Fable condition, 2026-07-15).** After the
range-dependent CORE model (SG near core 0.85→0.072) AND this landing refit (near 1.0→0.60), SG near damage
is ~35% of the old model and per-weapon SG mean sits at **0.695** (noir/naga/dorothy/soda all cold). Both old
⚑s (full near-landing + flat 0.85 core) were COMPENSATING for a real SG damage source not modeled — the
residual is now ~**0.25–0.30 multiplicative** and is the item's TESTABLE prediction. Candidate: real
pellet-body damage / an SG mechanic that renders few popups (the same "invisible-X" that makes near 0.60 a
lower bound — so DO NOT re-absorb it into the landing fraction or any per-unit ⚑; that would double-count).
Needs a focused SG recording that reconciles a unit's full damage TOTAL (not popups) against the modeled
sum. Until then noir/naga stay honestly cold (accepted). This is the SG analogue of the AR grave/guillotine
exposed under-model (A26 / exposed-undermodel-audit).

**STEP 2: Dorothy consolidation state (Option A design).** Her S1 "pellet count fixed at 1 for 3 rounds"
(after landing 80 pellets) + Hit Rate ▲98.18% + Attack damage ▲72% + Pierce = a RANGE-GATED consolidation
mode (measured: only fires at NEAR range, ~17% of shots, core ≈0.9 [⚑, Wilson LB ~0.65 from 7/7], single
bullet ≈110k out-of-burst / 1.1–1.55M in-burst; ~neutral out of burst, large gain in burst). Model as a
dorothy-scoped near-gated state: hitsPerShot→1, core≈0.9, +72% attack, Pierce — and REMOVE the currently-
PERMANENT +72% (measured-contradicted: it's ~17% of shots, near-only). ACCEPTANCE (Fable revision): gate on
the footage-level observables FIRST (≈110k / 1.1–1.55M singles, ~17%, near-only via DBG), board ratio is
SECONDARY with direction pre-stated. Define burst interaction explicitly (the "+5 pellets ≈ normalAttackPct
+50%" burst approx is WRONG on a 1-pellet base); decide consolidated-shot Pierce (PIERCE_CORE_DOUBLE excludes
SG because pellets don't line up core+body — a single consolidated bullet DOES, so model it / make S2's inert
pierceDamagePct 55.08 live, or document why not). "Roughly a wash" is retired once the state exists.

**STEP 2 — LANDED 2026-07-15 (Fable 2-of-2).** Config-driven range-gated consolidation state (engine:
`ConsolidationConfig` + `firePull` near-gated accumulator + `dealDamage` `coreOverride`/`extraDmgUpPct`/
`pierceActive` opts; dorothy override `consolidation` block). Consolidation bullet VALIDATED on the reliable
anchor: sim ~122.7k out-of-burst vs measured ~110k (+11%, within ±20%); near-only, ~17% of shots. Removing the
permanent +72% attack (a measured-contradicted fudge) dominates → **PH 0.69→0.44, N9 0.55→0.35**. Criterion
(c) "moves up" FAILED — but Fable ruled it SMUGGLED the explicitly-UNRELIABLE in-burst 1.1–1.55M reads into the
rule as an assumption; the mechanism criteria (anchored to the reliable data) passed, the fudge removal is
faithful, so the invariant compels landing over keeping a known fudge. Rotation pins EXACT (only dorothy drifted).
- **BLOCKED-pending-measurement (Fable condition):** dorothy's 0.44/0.35 rows must NOT be chased with tuning —
  the residual is the shared SG spray under-model + the unresolved burst question below.
- **RESOLVED PREMISE (owner, 2026-07-15): the dorothy solo video IS burst-isolated — she CANNOT burst.** A lone
  Burst-III unit has no B1→B2→B3 chain, so solo dorothy never casts her burst and never enters Full Burst (the
  sim already gives her 0 bursts solo — correct). So the ~1.1–1.55M "in-burst" singles are **NOT Burst-III cast
  and NOT FB consolidation** — a prior read mis-inferred "burst windows" from a red-tint vignette. The
  "burst-isolated recording" request is MOOT (already in hand). **REFRAMED under-model:** solo dorothy sim 31.34M
  vs real 96.80M = **3.09× short, ENTIRELY in the normal bucket** (0 bursts), while landing (0.60, flash-verified)
  / core (0.072) / per-pellet (25k) / shot-count (198) are ALL validated — a spray model reproduces the 31M sim.
  So ~65M is an UN-MODELED mechanism. Leading suspect: her consolidation bullet GAINS PIERCE → on the multi-part
  spider boss. **RE-ANALYSIS DONE + FIX LANDED (exact-counter re-read + owner ammo-count confirmation):** the
  consolidation was UNDER-modeled ~10×. Findings: (a) the single consolidated bullet carries the FULL shot's
  damage (pelletFraction 1.0, NOT 0.1 — the earlier "110k" anchor was a DROPPED-DIGIT MISREAD of 1,103,595);
  body-pierce 551,797 / core-pierce 1,103,595 (=2.0× body) decompose as full-shot base × dmgUp(2.27), NO range
  (both +2%). (b) "3 rounds" = 3 SHOTS/episode (owner: ammo drops by 3), NOT 3 magazines. (c) fires ALL bands
  the whole fight (98% hit), NOT near-only; trigger = 80 fired pellets ≈ 8 spray shots/episode → ~30% consolidate
  (~58, measured ~55–64). (d) Pierce K=1 (one number/shot). (e) the 1.27–1.55M "in-burst singles" are the
  SELF-BUFF RAMP, not burst (she can't burst solo). FIX: pelletFraction 0.1→1.0, shots 3, all-band accrual,
  noRange on the consolidated shot. RESULT: dorothy solo 0.44→0.87, comps PH 0.44→0.83 / N9 0.35→0.81. Fable
  post-op REVISE→satisfied (shots=3 not 27, all-band not near-gated, decomposition confirms the residual is
  spray). **REMAINING ~0.13 = the shared SG SPRAY under-model** (sim spray bucket ~23M vs measured ~32M, ~1.4×,
  matching noir 1.56×) — the noir reconciliation resolves that. Snapshot regenerated; verify GREEN; UNCOMMITTED
  (post-push work). NB this CORRECTS the Step-2 that shipped in `5afc815` (the misread) — a re-push will carry it.

**(Superseded implementation plan — kept for provenance.)** STEP 2 — implementation plan (Fable pre-op R1–R4):
Config-driven consolidation state (mirror the `charFixes` threading: `override.consolidation` → `prepare.ts`
lifts to char → engine reads it; NO dorothy branch in the engine). Design:
- **Accumulator+state** (UnitState `landedAcc`,`consolShotsLeft`): in `firePull`, `landed = round(hitsPerShot×sgFalloff)`;
  if band===near `landedAcc += landed`; at ≥80 → enter consolidation (`consolShotsLeft = 3`, reset acc).
  `consolidating = consolShotsLeft>0 && band===near`. Literal near-gated accumulator → ~19% ≈ measured 17%
  (fallback: explicit near-duty-cycle ⚑ tuned ONLY to the 17% shot fraction, never the board ratio).
- **Consolidation shot**: 1 pellet (`sgFalloff:=0.1`); new generic `coreOverride≈0.9` opts param to dealDamage
  (⚑, wide CI 0.65–0.9, sensitivity noted); +72% attack applied ONLY while consolidating (REMOVE the current
  permanent `hitCount:80` block); her Pierce-tag makes S2 `pierceDamagePct 55.08` live (a Damage-Up add).
- **R1 (REQUIRED): Pierce DOUBLE-HIT stays OFF** — enabling it re-litigates the settled `PIERCE_CORE_DOUBLE=false`
  (same boss, same single-aligned-bullet geometry) without same-tier evidence; enable ONLY on direct
  popup-anatomy (two popups per consolidated pull, checkable in the existing footage) or a new A/B — NEVER by
  residual subtraction. NB the +55.08% pierce-DAMAGE does apply (dmgUp 2.27, not 1.72) — recompute the bullet
  with it before comparing to 110k.
- **R2 (REQUIRED): grade the consolidated bullet at ±20% ABSOLUTE (≈110k out-of-burst / 1.1–1.55M in-burst)
  with NO shared-SG-residual credit** (a single landing bullet can't have missed-pellet body damage). An
  undershoot of ~25–30% is NEW EVIDENCE that the shared residual is NOT (only) missed-pellet body damage →
  log, don't absorb. Board ratio SECONDARY; dorothy may stay <1.0 (ACCEPT).
- **R3 (REQUIRED): explicit gauge decision** — the 1-pellet shot generates 1-landed-pellet gauge (sgFalloff
  0.1 into `shotGauge`, consistent with "gauge counts hits"); acceptance (d) checks the rotation consequence.
- **R4 (REQUIRED): out-of-near window = literal (3 consolidation shots fire near-gated; short episodes sit
  inside the long near windows so the edge case is rare) + NOTE the burst accumulation gap** (in-burst spray
  lands ~9 not 6 pellets, but +5 is modeled as normalAttackPct so `landedAcc` misses it — first-order,
  acceptable if frequency passes) + gate the burst `normalAttackPct 50` (=+5 pellets) OFF while consolidating.
  Label the near-gate MEASURED, the "80-landed-on-core" story INTERPRETIVE in the override note.
Decision rule pre-committed: LAND iff (a) sim bullet within ±20% of 110k/1.1–1.55M; (b) near-only + ~15–20%
of shots (DBG); (c) dorothy moves UP not past ~1.05; (d) rotation pins exact. Plan: scratchpad/dorothy-step2-plan.md.

**COUPLING NOTE (owner decision):** Step 2's R2 check (does the consolidated bullet reproduce 110k with NO
residual credit?) is ITSELF a probe of the shared SG under-model. If it undershoots, that's evidence about
the residual mechanism. So Step 2 and the "general shotgun investigation" (the ~0.25–0.30× residual hunt) are
coupled — the SG investigation may reframe what Step 2's undershoot means. Owner ordered Step 2 first; noting
the option to interleave.

**Open sub-items (Fable revision 7):** (a) the duty-cycle discrepancy — measured 17%÷~38% near-time ≈ 45%
vs the literal accumulator arithmetic (80 landed pellets @ ~10/shot near ≈ 27% duty, ~36% with burst +5):
try the literal 80-pellet/3-round accumulator FIRST (override already uses `hitCount:80`, engine counts
landed pellets), fall back to the measured duty-cycle ⚑ only if it fails to reproduce ~17%; (b) popup-
undercount vs ballistic landing fraction; (c) preserve the full consolidation measurement set (110k /
1.1–1.55M / 0.9 core / near-gated / ~17%) — in `dorothy-serendipity-firing.json`. Option B (bounded, no
state) REJECTED (creates a never-real 10-credited-pellet × 1.72 near state + an unreferenced core ⚑).

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

**ACCURACY-CIRCLE CORROBORATION 2026-07-17 (datamined `role.weapon.shot_detail`; independent method,
NO engine change).** The `role` object (raw datamined WeaponTable, upstream of synergy — see
`docs/handoffs/2026-07-17-role-object-audit.md`) carries the weapon bloom radius as
`start/end_accuracy_circle_scale`. Roster scan (74 units): the circle is a **per-weapon-type CONSTANT**,
and the `auto_*` variants are **byte-identical to the manual ones for every unit** — so this field IS
the auto-aim bloom our auto-core model (`sim.ts` `CORE_BY_WEAPON_BAND`, this thread + A15/A26) targets.
`spot_radius` is 0 for all guns except RL (splash), so it is NOT a core-size field.

| weapon | circle (start→end) | measured near-band core | how we model it |
|---|---|---|---|
| SR / RL | 10 → 10 (pinpoint) | ~100% | flat HI 0.95 |
| MG | **250 → 10** (+7/shot, speed 150) | ~100% warmed | flat HI, **wind-up gated** |
| AR | 75 → 75 | 0.40 | range table |
| SMG | 110 → 110 | 0.28 | range table |
| SG | 250 → 250 | 0.048 | range table + separate landing table |

Three independent corroborations of things we measured from footage the hard way:
- **(a) The weapon ORDERING AR > SMG > SG is exactly `1/circle_scale`.** 75 < 110 < 250 inverts to
  0.40 > 0.28 > 0.048. Anchoring on AR-near (0.40), a *linear* `core ∝ 1/circle` predicts
  **SMG-near = 0.40·(75/110) = 0.273 vs measured 0.28** (2.5% off — near-exact). First-principles
  datamined basis for the ordering the engine comment asserts from footage alone.
- **(b) MG/SR/RL = flat-HI is the pinpoint (circle 10) cluster**, and MG's **250→10 ramp @ +7/shot
  mirrors the wind-up story of THIS question** — a cold MG sprays at the SG-wide 250 (low core), a
  warmed MG collapses to the SR-pinpoint 10 (~100% core). Same field, two values, matching
  `MG_RAMP_INTERVALS`: the accuracy circle is the geometric mechanism behind MG heat.
- **(c) The circle sets the weapon SCALE, distance sets the FALLOFF.** Circle is constant across shots
  (except MG), so it does NOT by itself produce the near→far core collapse — that comes from a fixed
  angular bloom cone vs a physical core whose angular size shrinks with distance. Model shape:
  `core(weapon, band) ≈ falloff(band) / circle_scale`. The measured band tables already encode both.

**Where the clean `1/circle` fit breaks — the SG landing confound** (the role-audit's original caveat,
now precise): `1/circle` over-predicts SG-near 2.5× (0.12 vs 0.048). SG is the one weapon with TWO
geometric filters against the SAME 250 cone but DIFFERENT target sizes — **landing** (does a pellet hit
the boss BODY at all? `SG_LANDING_BY_BAND`, boss-silhouette dependent) and **core** (of landed pellets,
hit the core?). AR/SMG are single aimed shots → landing ≈ 1, so only the core filter applies, which is
*why* only SG needs a landing table. No static field captures the boss silhouette, so the circle
predicts SPREAD but not the landing fraction — the SG row stays measured, not derived.

**⇒ Status: corroboration, NOT a refit source.** The measured `CORE_BY_WEAPON_BAND` / `SG_LANDING_BY_BAND`
values stay SSOT (same-tier footage; measured > datamined-proxy). Concrete future uses:
(a) drop it in as an independent-method cross-check when a future core re-record lands (prove-it-differently);
(b) it is the geometry backbone if the distance→core model (Option 2, SHELVED under A15 item (3)) is ever
revived — `falloff(band)/circle_scale` with per-weapon circle now known;
(c) **new per-unit flag** — any unit whose datamined `weapon`/circle disagrees with its slot class (a custom
swap weapon) must NOT inherit its nominal class's core row (snow-white-heavy-arms already datamines as `SR`
circle=10, correctly pinpoint — not an AR). NOT ENACTED.

**BONUSRANGE RING — the DISTANCE half of the geometry backbone (datamined `role.weapon.bonusrange_min/max`;
role-audit D.1, 2026-07-17).** The accuracy circle above gives the per-weapon SCALE; `bonusrange` gives the
numeric optimal-range RING in game distance units, a **per-weapon-type CONSTANT** across all 74 units (zero
per-unit variation): SG 0-25, SMG 15-35, AR 25-45, MG 35-55, SR 45-100, RL 0-0. Combined with the measured
`RANGE_ELIGIBLE` bands and owner-confirmed distance semantics, the four range bands map MONOTONICALLY (near <
mid < midfar < **far** = farthest):

| band | distance | rings covering it |
|---|---|---|
| near | [0,15] | SG |
| mid | [25,35] | SMG, AR |
| midfar | [45,55] | SR, MG |
| far | [55,100] | SR |

Corroborated by three footage-calibrated tables that all order near→mid→midfar→far by decreasing closeness
(`CORE_BY_WEAPON_BAND`, `SG_LANDING_BY_BAND`, the owner-authored `SG_LANDING_JITTER`). ⇒ This is the missing
**distance input** for the shelved geometric `falloff(band)/circle_scale` core model (A15 item (3)): band →
distance (this table) → angular core size, with per-weapon `circle_scale` known. Still gated on a
boss-distance-per-frame timeline (`BOSS_RANGE_SCRIPT` is 4 qualitative bands + transition times, no metric
distances) before an exact `distance ∈ [min,max]` model could replace the ±4-6s band approximation.
**MG band note (no action):** `RANGE_ELIGIBLE` puts MG in `far` (`{SR,MG}`) though MG's ring [35,55]
covers the **midfar** distance [45,55], not far [55,100]. That geometry matches the owner's ORIGINAL
range-data.md guess — but the guess was TESTED and overridden by the crown popup measurement (MG bonus
read in the `far` TIME window; ±4-6s-edge, boss transits the ring during walks). Measured > datamined-proxy,
so `RANGE_ELIGIBLE` stands; the datamined ring only re-states the superseded hypothesis. Full write-up:
`docs/handoffs/2026-07-17-role-object-audit.md` D.1.

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
