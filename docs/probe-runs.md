# Probe run plan (U7) — validate the unmeasured overrides in minimum runs

> Role (owner ruling 2026-07-26): this file is **the chronological measurement log** (CHANGELOG class
> — append-only). Where the labeled ground truth lives → `docs/VALIDATION-INDEX.md`; what reader
> instruments exist + trust tiers → `docs/STATE.md` §7.

Standard conditions: scope lock preset, 10/10/10, treasure on, full auto, 180s, partless boss.
The CLI supports 4-unit comps (site slots can simply be left empty).
Slot order below is exact (leftmost-first burst priority depends on it). "Boss" names the
weakness to select (boss element in parens) — chosen so themed kits get their advantage.
Site mode pills to set are listed per run. Sim predictions verified: no unexpected stalls.

| run | slots 1→5                                                      | boss                 | probes (anchors)                          | modes / notes                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------- | -------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | anis-star · prika · mint · alice · red-hood                    | wind weak (Iron)     | prika, mint, alice, red-hood (anis)       | prika+mint = duet modes (Prika auto-takes the FIRST B2 regardless of slot order — burstFirst rule); red-hood operates as B3. Rotation is genuinely slow for this comp shape (~50% uptime) — expected, sim models it                                              |
| B   | moran · trina · cinderella · neon-VE                           | elec weak (Water)    | moran, trina (cindy, neon)                | 4-unit comp (no 5th needed — 12 FBs, no stall); trina's single-target buff lands on the elec carries                                                                                                                                                             |
| C   | anis-star · tia · naga · SWHA · helm                           | water weak (Fire)    | tia, naga (anis, SWHA, helm)              | naga mode "with shielder" (tia IS the shielder); tia flexes as 2nd B1, her S1 CDR/AD still fire                                                                                                                                                                  |
| D   | emma-TU · eunhwa-TU · diesel-WS · helm                         | fire weak (Wind)     | emma-TU, eunhwa-TU, diesel-WS (helm)      | 4-unit comp per user; emma+eunhwa = duo modes; ~50% uptime expected (emma's 40s B1 + 2x40s B3s, CD-bound — real matches). BONUS: helm bursts here (4x) — first live test of her 8236.8% nuke model                                                               |
| E   | rouge · crown · ein · ada · cinderella                         | elec weak (Water)    | rouge, ein, ada (crown, cindy)            | each unit judged on its OWN sim-vs-real (no delta methodology — too confounded); rouge's grant modeling surfaces as cindy reading hot/cold with rouge present                                                                                                    |
| F   | maiden-IR SOLO (field only her)                                | elec weak (Water)    | maiden                                    | no B1/B2 → full burst never happens (sim + real alike): pure normals + her 547.62% proc. Sim prediction (range-band model): 96.1M total (35.3M normals + 60.8M procs). Real ≈104M → model right; ≈42M → proc ~absent outside FB; between → value/cadence partial |
| G   | d-killer-wife · takina · milk-BB · maxwell · liberalio         | iron weak (Electric) | DKW, takina, milk-BB, maxwell (liberalio) | milk auto mode (default); tests DKW's fixed CDR cadence                                                                                                                                                                                                          |
| H   | little-mermaid · crown · quency-EQ · dorothy-S · guillotine-WS | water weak (Fire)    | quency-EQ, dorothy-S, xGuillo (LM, crown) | user lacks xLudmilla — xGuillo (fresh override) takes the slot; she never bursts here (slot 5), so her level auras/ramp get tested, not her burst dot                                                                                                            |
| I   | anis-star · grave · chisato · jill · noir                      | elec weak (Water)    | grave, chisato, jill, noir (anis)         |                                                                                                                                                                                                                                                                  |

Coverage: 27 probe units in 9 runs, every run carrying 1-3 validated anchors so probe error is
attributable. Tail units not covered (lower priority, audited-clean, niche, or not owned): miranda:T, exia:T, asuka, rei-ayanami (not owned), soline-FT (40s mono-B1, stalls any comp she anchors), snow-white,
diesel-WS, ark-ranger-black, rosanna-CO, brid-ST, anchor-IM, ade-AB, soline-FT, velvet(done),
dorothy, mari — can form runs J/K later if desired.

Per run, report: per-unit damage totals (+ who actually burst if it deviated from leftmost).

## RESULTS (2026-07-13, screenshots in docs/"7:13 probe runs"; scored in scripts/experiment.ts as PA-PI)

| run | unit: real → sim/real ratio                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| A   | anis 794.6M → **0.43** · mint 200.1M → 0.90 · prika 167.8M → 0.65 · alice 403.9M → **0.49** · red-hood 853.3M → **0.29**    |
| B   | moran 222.3M → 0.93 ✓ · trina 50.9M → **2.72** · cinderella 582.7M → **1.76** · neon 467.2M → **1.88**                      |
| C   | tia 159.9M → 1.30 · anis 779.4M → **0.47** · naga 174.2M → **2.14** · SWHA 1320.3M → 1.06 ✓ · helm 652.0M → 1.24            |
| D   | emma-TU 138.6M → 1.16 · eunhwa-TU 303.3M → **2.13** · diesel-WS 547.1M → 1.06 ✓ · helm 273.0M → 1.18                        |
| E   | rouge 106.7M → 1.48 · crown 147.6M → 1.38 · ein 560.3M → 0.88 · ada 460.2M → 0.99 ✓ · cinderella 342.6M → 0.73              |
| F   | maiden SOLO 76.6M → **1.26** (sim 96.1M; proc exists at ~0.68 of modeled value)                                             |
| G   | DKW 57.8M → 1.11 · takina 427.4M → 0.92 ✓ · milk-BB 391.2M → **0.67** · maxwell 126.6M → **1.93** · liberalio 484.6M → 0.82 |
| H   | LM 341.6M → 1.09 · crown 161.3M → 1.05 · quency-EQ 594.1M → 0.86 · dorothy-S 766.3M → **1.84** · xGuillo 273.9M → 1.34      |
| I   | anis 602.8M → 0.99 ✓ · grave 288.1M → 1.23 · chisato 492.0M → 1.29 · jill 518.4M → **2.09** · noir 160.6M → **2.05**        |

Slot orders as fielded: A = anis·mint·prika·alice·RH (mint BEFORE prika — burstFirst live test);
C = tia·anis·naga·SWHA·helm (tia slot 1). B and D were 4-unit comps.

### First-pass read

- VALIDATED: moran 0.93 (20s-CD rework), ada 0.99 (grenade rework), takina 0.92, diesel-WS
  1.06, SWHA 1.06, mint 0.90, anchors in H/I (LM 1.09, crown 1.05, anis-I 0.99), DKW 1.11.
- Maiden solo 1.26: the per-shot proc EXISTS but at ~68% of modeled value (real proc portion
  ≈41.3M vs sim 60.8M) — U2 narrowed to a value/cadence factor ~0.68.
- COMP-LEVEL failures dominate runs A/B/C: A and C sim ~50% cold on everyone (rotation/uptime
  mismatch — sim stalls where real evidently didn't); B sim ~80% hot on FB-scaled units
  (4-unit comp: static rl3 gauge model likely overestimates 4-unit burst gen). These mask
  unit-level readings for prika/alice/red-hood/tia/naga/trina/cindy/neon.
- Unit-level suspects: eunhwa-TU 2.13, maxwell 1.93 (railgun swap), dorothy-S 1.84, jill 2.09
  (acid dot uptime), noir 2.05, xGuillo 1.34, milk-BB 0.67 COLD (auto mode too pessimistic —
  real sits between the auto/manual modes), rouge/crown-E hot vs cindy-E cold (rouge's
  casterMaxHp grant may be over-modeled), liberalio-G 0.82.

### Post-measurement state (helm recording processed)

SR cycle MEASURED at 1.37s (charge 60f + recovery 22f) from the damage-counter frame analysis;
SR_BOLT_RECOVERY_FRAMES = 22 is no longer a fitted value. Anis: Star's team CDR proven
formation-independent (runs A+C rotated at CDR speed in-game) — ungated; run A sim now 13 FB/71%.

### Corrections from user + re-entry mechanic (2026-07-13, post-scoreboard)

- Anis CDR IS formation-gated; Λ units count as NO burst type for formation checks (engine
  fixed — run A's rotation now correct via her noB1 branch). Her ATK riders are ALSO
  formation-gated (user ruling). Tia counts as "B1+" (a re-entry B1) — a rare edge case we
  deliberately don't model (tia+anis is its only occurrence and is inefficient anyway):
  RUN C IS EXCLUDED from anis DPS validation. Run A (0.95) is her authoritative probe.
- Tia's real burst CD is 20s (DB says 40 — charFixes.burstCooldownSec added) and her burst
  RE-ENTERS STAGE 1 → new reenterStage mechanic lets a second B1 cast per rotation (the
  Tia+Anis pairing). Anis's Everyone's-Star re-entry now uses the same mechanic.
- milk-BB 0.67 cold ACCEPTED (user: known poor auto performer, not worth modeling further).
- Post-fix: run A anis 0.95 ✓, run C anis 1.03 ✓, SWHA-C 0.95 ✓, tia 1.25, helm-C 1.17.

### Remaining leads, priority order

1. Run A residual (~0.6 across SR carries even after CDR fix): mint/prika duet buffs on
   alice/RH may be under-modeled (charge-speed/crit snapshot), or RH's Red Wolf swap values low
   (real RH 853M!) — RH's B3 window deserves a dedicated look.
2. Run B (4-unit) sim-hot x1.8 on FB-scaled units: static rl3 gauge model overestimates
   sparse-comp burst gen — candidate engine change: shot-based gen (burstGaugePerShot x actual
   shots), needs full-board regression.
3. Run C: naga 2.07 (shielder-mode buffs too strong — her 85.17 core-damage aura at full uptime is the
   suspect), tia 1.25 (S1 CDR-cycle values), helm-C 1.17.
4. Kit heat: eunhwa-TU 2.13 (duo True-Damage steady state too generous), maxwell 1.93
   (railgun swap), dorothy-S 1.84, jill 2.09 (acid-dot uptime), noir 2.05, xGuillo 1.34;
   milk-BB 0.67 cold ACCEPTED (user); liberalio-G 0.82; maiden proc x0.68 (U2).
5. rouge-E 1.48 + crown-E 1.38 hot while cindy-E 0.73 cold: rouge's casterMaxHp grants may be
   overfeeding crown/... and under-modeling cindy's own kit in that comp — entangled, revisit
   after gauge work.

### Gauge + kit-heat pass (2026-07-13, late)

ENGINE: shot-based burst generation replaces the static rl3/3 model (gen accrues per landed
pull, outside FB, never in unhittable windows) with GEN_SCALE 1.4 ⚑ calibrated on the 7
validated fights (skill hits also generate in-game — per-source rates unknown; run B keeps a
hot residual ~1.5-1.7 pending a gauge measurement session, same frame-count method would work
on the burst bar). SG PELLET FALLOFF ⚑: outside the near band only ~30% of pellets land
(calibrated on the naga/dorothy/noir triple) — naga 1.92→1.10 ✓, noir 1.96→1.21,
dorothy-S 1.81→1.21. KIT FIXES: maxwell burst = single 813.42% railgun shot (1.93→0.81,
slightly over-corrected ⚑); eunhwa-TU swap cycle 0.67s with baked recovery (2.13→1.42,
residual open); jill acid dot → exempt class (2.09→1.94, barely moved — her heat is
elsewhere, open).

Remaining heat/cold after this pass: eunhwa-TU 1.42, jill 1.94, xGuillo 1.30, mint-A 1.18,
tia 1.13, helm-D 1.19, grave 1.19, chisato 1.23, rouge-E 1.27/crown-E 1.28 vs cindy-E 0.63,
run-B residual (trina 2.55/cindy 1.49/neon 1.57 — gauge model), alice-A 0.59 / red-hood-A
0.36 COLD (Red Wolf window under-modeled — real RH topped run A at 853M), takina-G 0.62,
milk-BB accepted-cold, maiden 1.26 (U2 x0.68 proc factor).

## DEEP-DIVE PASS (2026-07-13, second session) — see docs/closed/deep-dive-brief.md for the mission

### New ground truth ingested (docs/probes/"712 probes"/ — 9 screenshots, named by boss weakness)

Seven were the original T1-T7 fights (numbers match exactly) but carried corrections:

- TRUE SLOT ORDERS for T1/T2/T3/T4 (experiment.ts had guessed wrong; burst assignment barely
  changed — the B3 CDs force alternation either way).
- **T6 was actually fire-weak (Wind boss)**, not neutral — rescored with rapi-RH advantaged.
- **T4b: a full replicate of T4** → real-world repeatability baseline: per-unit variance
  0.5-3.5%. Treat sim-vs-real deltas under ~5% as noise.
- **T8 (NEW): anis-star · crown · rapi-red-hood · cinderella-crystal-wave · helm vs Electric**
  — validates 0.96-1.07 everywhere except cindy-CW 1.28.

### Engine changes this pass (mechanism-sourced; see open-questions A11-A16)

1. **Gauge v3** (datamined): per-hit energy table == DB burstGaugePerShot column (verified,
   incl. battery outliers trina/anis-star/a2); boss hits x2; skill hits + dot ticks generate
   weapon base; SG gauge scales with pellet falloff; charge never scales gen on auto;
   AUTO_GEN_EFFICIENCY 0.7 ⚑ (== old GEN_SCALE 1.4 / boss 2x — two calibrations agree).
2. **Subtractive charge formula** (decoded): time x (1 - CS%), 1-frame floor, +100% cap;
   swaps with explicit cadence are CS-immune (fire-rate-gated).
3. **U1 solved**: function-damage procs crit (engine default ON), never core (cindy-CW core
   flag removed), never range, FB by timing. Legacy noFb flags retained pending U8.
4. **AUTO_CORE_RATE 0.85 ⚑** (auto reticle floor ~12.5px, JP-measured) — centered all anchors.
5. **Red Wolf decoded**: 0.3s fire-rate-gated cadence, ~33 shots/window, +90% conversion ⚑.
6. **Maiden x0.68 = auto full-charge rate** (proc gated on full-charge releases) — solo 1.01 ✓.
7. **July 2 2026 patch values pinned** for SBS (blablalink sync lags the patch); elegg flagged.
8. PIERCE_CORE_DOUBLE switch (OFF — rejected for partless boss, kept for part-ed bosses).

### BOARD v7 (superseded by v9 below)

| fight  | ratios                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------- |
| T1     | mast 1.06 · SBS 1.22 · anis 1.00 · liberalio 1.00 · crown 1.03                                        |
| T3     | rapi 1.07 · mihara 0.90 · LM 0.98 · crown 0.96 · helm 0.94                                            |
| T4/T4b | anis 0.85 · privaty 0.90-0.93 · SWHA 0.90-0.92 · helm 0.82 · crown 0.91 (comp-wide ~0.88 cold — OPEN) |
| T2     | crown 1.10 · neon 0.97 · anis 0.96 · cindy 1.21 · maiden 1.25                                         |
| T5     | nayuta 0.87 · cindy-CW 1.12 · anis 0.97 · liberalio 0.96 · velvet 1.05                                |
| T6     | crown 0.97 · rapi 1.07 · LM 1.00 · SWHA 0.96 · helm 0.95                                              |
| T7     | crown 1.14 · rapi 1.10 · anis 1.04 · cindy 1.21 · mast 1.02                                           |
| T8     | anis 1.04 · crown 0.97 · rapi 1.07 · cindy-CW 1.28 · helm 0.96                                        |
| PA     | anis 0.97 · mint 1.27 · prika 0.84 · **alice 1.15** · **red-hood 0.92** (was 0.59/0.36!)              |
| PB     | moran 0.91 · trina 2.59 · cindy 1.85 · neon 1.87 (U8 rotation ground truth)                           |
| PC     | tia 1.10 · naga 1.07 · SWHA 0.94 · helm 1.18 (anis excluded)                                          |
| PD     | emma 1.07 · eunhwa 1.34 · diesel 1.01 · helm 1.19                                                     |
| PE     | rouge 1.39 · crown 1.41 · ein 0.94 · ada 0.99 · cindy 0.80 (U8)                                       |
| PF     | maiden SOLO **1.01** ✓ (U2 resolved)                                                                  |
| PG     | DKW 1.00 · takina 0.78 · milk 0.57 (accepted) · maxwell 0.81 · liberalio 0.80 (U8 — comp-wide cold)   |
| PH     | LM 1.06 · crown 1.00 · quency 0.85 · dorothy 1.09 · xguillo 1.24                                      |
| PI     | anis 0.98 · grave 1.19 · chisato 1.26 · jill 1.86 · noir 1.15 (U8 — comp-wide hot exc. anis)          |

### What would close the rest (ground-truth asks for the user)

1. **One recorded re-run of run B** (and ideally E or I, and G) with the burst casts visible —
   FB count + who burst each rotation resolves the entire U8 family (PB/PE/PG/PI comp-level
   residuals are rotation-shaped: sim is kit-faithful but reality seems to rotate slower in
   the hot comps and faster in PG).
2. **Run A: who actually burst B2 each rotation?** (prika-first-then-mint is modeled; mint
   1.27 hot / prika 0.84 cold looks like a burst-assignment or Singing/Dancing-state mismatch).
3. **PD: does eunhwa's railgun swap hit the core?** (her 1.34 would drop to ~1.0 if her swap
   shots don't core — same class of fix as U1).
4. RESOLVED since this list was written: the maiden x0.68 was her release-latency cadence
   (open-questions A12), measured from the user's solo video — no full-charge-rate factor
   exists to generalize.
5. jill 1.86: her normals ARE DB-faithful (9-round mag of 71.09% shots, permanent Magnum
   window — checked); her heat is PI-comp-shaped + possibly acid-dot crit (unverified) —
   revisit after U8.

### BOARD v9 (current — after A17: MG wind-down curve, subtractive reload, buff-overwrite rule)

The three A17 fixes RESOLVED the T4 comp-wide cold (privaty's +51% team reload buff was
under-credited by the old divisive reload formula) and centered dorothy-S.

| fight  | ratios                                                                             |
| ------ | ---------------------------------------------------------------------------------- |
| T1     | mast 0.95 · SBS 1.23 · anis 1.04 · liberalio 1.02 · crown 0.91                     |
| T3     | rapi 0.95 · mihara 0.88 · LM 0.95 · crown 0.89 · helm 0.96                         |
| T4/T4b | anis 1.01 · privaty 0.89-0.92 · SWHA 0.93 · helm 0.97 · crown 1.10 ✓ RESOLVED      |
| T2     | crown 1.03 · neon 0.91 · anis 0.93 · cindy 1.19 · maiden 1.31                      |
| T5     | nayuta 0.86 · cindy-CW 1.09 · anis 0.94 · liberalio 0.96 · velvet 1.02             |
| T6     | crown 0.92 · rapi 1.04 · LM 0.95 · SWHA 0.93 · helm 0.93                           |
| T7     | crown 1.01 · rapi 0.97 · anis 1.08 · cindy 1.10 · mast 1.13                        |
| T8     | anis 1.02 · crown 0.92 · rapi 1.05 · cindy-CW 1.25 · helm 0.96                     |
| PA     | anis 0.94 · mint 1.21 · prika 0.82 · alice 1.12 · red-hood 0.86                    |
| PB     | moran 0.91 · trina 2.62 · cindy 1.86 · neon 1.96 (U8)                              |
| PC     | tia 1.09 · naga 1.06 · SWHA 0.96 · helm 1.13 (anis excluded)                       |
| PD     | emma 1.00 · eunhwa 1.32 · diesel 1.02 · helm 1.17                                  |
| PE     | rouge 1.32 · crown 1.30 · ein 0.89 · ada 0.97 · cindy 0.78 (U8)                    |
| PF     | maiden SOLO 1.01 ✓                                                                 |
| PG     | DKW 0.98 · takina 0.76 · milk 0.56 (accepted) · maxwell 0.80 · liberalio 0.79 (U8) |
| PH     | LM 1.03 · crown 0.97 · quency 0.84 · dorothy 0.99 ✓ · xguillo 1.25                 |
| PI     | anis 0.97 · grave 1.19 · chisato 1.21 · jill 1.72 · noir 1.12 (U8)                 |

### U8 ground truth #1 — run B recorded re-run (2026-07-13, docs/probes/u8)

Real totals (new slot order moran · cinderella · neon · trina): moran 220.6M ·
cinderella 593.9M · neon 510.6M · trina 51.5M — highly repeatable vs the original run
except neon +9% (slot-order sensitivity, reproduced by the sim).

- **Rotation from video**: 11 full bursts, ~17s average cycle — identical to the sim's
  prediction. The run-B heat was never rotation.
- **Neon: Vision Eye firepower economy verified frame-by-frame** (her on-screen 火力 gauge):
  first burst-3 cast of the fight was cinderella's; neon cast 5 times (full bursts 2, 4, 6,
  8, 10) with Super Firepower on her casts 1 and 4 (gauge 100→000 at full bursts 2 and 8,
  charge windows reading ~060 then 100 in between) — exactly the sim's every-3rd-cast
  model. Being second burst-3 costs her ONE CAST vs going first (5 vs 6) but NOT a Super
  (both patterns contain two); the sim already models the cast order correctly.
- **Root cause of the heat**: Trina's Skill 2 ("Attack Damage ▲ 94.15% + Reloading Speed ▲
  50.82%") targets "the 1 leftmost Electric Code ally unit with assault rifles" — moran
  ONLY. The old model buffed all Electric allies, feeding +94% Attack Damage to cinderella,
  neon, and trina herself. Fixed with an exact-target engine feature
  (alliesOfElementWeapon). Scores after the fix, on the recorded run: moran 0.92 ·
  cinderella 1.04 · neon 1.06 · trina 1.14.

### U8 ground truth #2 — run E recorded re-run (2026-07-13, docs/probes/u8 e)

Real totals (new slot order crown · ein · ada · rouge · cinderella): crown 141.6M ·
ein 538.2M · ada 464.0M · rouge 115.0M · cinderella 398.0M.

- **Rotation from video**: 11 full bursts at ~16s average (sim: 10 at ~17.9s — slightly
  slow for this team).
- **Cinderella's cold reading is CAST STARVATION, and it is knife-edge real**: rouge's
  team cooldown reduction (7s per 8 full-charge shots) makes ein/ada ready again ~33s
  after casting. At the sim's rotation speed the third full burst lands at 40.6s — 0.1s
  AFTER ein's 40.5s ready time — so the sim picks ein every time and cinderella never
  bursts (0 casts, reads 0.65-0.76). At the real rotation speed (~2s faster per cycle)
  the third full burst lands BEFORE ein is ready, cinderella takes it, and the whole
  burst-3 sequence cascades differently.
- **Reality itself is unstable here**: cinderella's real totals differ +16% between the
  two recorded runs (342.6M vs 398.0M) — the game's own burst-3 selection flips between
  runs on these razor-thin cooldown margins. Run E's burst-3 ratios (ein/ada/cinderella)
  should be treated as intrinsically noisy; the run's stable anchors are crown and rouge.
- **Remaining real signal**: crown 1.29 / rouge 1.19 hot DESPITE the sim under-counting
  rotations (10 vs 11) — their per-rotation output is over-modeled ~25%. Crown reads
  0.91-1.13 in every other fight, so the heat is specific to the rouge pairing — next
  suspect: another scope/condition subtlety in rouge's kit (the run-B lesson), e.g. the
  Sword Coin "self and 2 allies on both sides" positional coverage, currently modeled as
  the whole team.

### U8 ground truth #3 — run G recorded re-run (2026-07-13, docs/probes/u8 g)

Real totals (new slot order d-killer-wife · milk · maxwell · takina · liberalio):
d-killer-wife 57.8M (identical to the first run) · milk 377.2M · maxwell 138.7M ·
takina 479.8M · liberalio 497.6M.

- **Rotation from video**: 13-14 full bursts at ~13.9s — far faster than the sim's 10 at
  ~18.4s. The sim was gauge-bound; the comp is ALL sniper rifles.
- **Root cause: sniper-rifle burst generation is charge-scaled even on auto** ⚑. Scaling
  SR generation by the full-charge multiplier (x2.5) reproduces all three recorded
  rotations at once: run G (5 SR) 13 vs real 13-14, run E (2 SR) 12 vs real 11-12, run B
  (0 SR) unchanged 17 vs real 17 — and machine-gun-pumped teams barely move because their
  gauge already saturates. The maiden solo video proved ROCKET LAUNCHERS stay flat, so
  this is SR-specific. It contradicts the JP "charge scaling is manual-only" note for SRs;
  flagged ⚑ pending a direct SR gauge recording.
- Scores after the fix: d-killer-wife 1.05 · takina 1.01 ✓ · maxwell 0.89 · liberalio
  0.85 · milk 0.69 (known auto under-performer, accepted). The comp-wide cold is gone.

### Run E remaining lead (recorded 2026-07-13, from the user)

Rouge was NOT adjacent to cinderella in the first run E (slot 1 vs slot 5) but IS in the
re-run (slot 4-5) — and rouge's kit is full of POSITIONAL and Max-HP effects our model
skips as defensive: Sword Coin ("self and 2 allies on both sides", modeled team-wide),
the burst's coin-tier Max HP grants (10.15/20.1/30.02% of rouge's Max HP for 10s), the
permanent Double Sword Coin (+15.08% of her Max HP to coin holders), and S1's Max HP
grant. **Cinderella converts Max HP to ATK** (her S1 grants ATK = % of her final Max HP),
so for her these "defensive" grants are large damage buffs — rough estimate +15-20%,
matching her +16% between the two real runs. NEXT: rebuild rouge's override with a
positional target (self + 2 each side) and the Max-HP grant lines, and verify the engine
feeds Max-HP buffs into HP-scaled ATK live. Expected to warm cindy-E and cool
crown-E/rouge-E.

### U8 ground truth #4 — run I recorded re-run (2026-07-13, docs/probes/u8 i; boss elec-weak = Water)

Real totals (new slot order grave · anis: star · jill · chisato · noir): grave 286.2M ·
anis 599.4M · jill 534.6M · chisato 481.7M · noir 163.1M — every unit within ±3% of the
original run despite a changed burst-3 order. This comp is STABLE (contrast run E), so its
residuals are real modeling error, not selection noise.

- **Rotation from video**: 13 full bursts at ~14.1s (two were initially hidden by bar
  occlusion; confirmed via the full-burst countdown timer). Sim: ~14 at ~12.9s — about 8%
  fast, worth a few points of the burst-3 heat but nothing like jill's 1.67.
- Scores on the recorded run: anis 0.98 ✓ · noir 1.10 · grave 1.20 · chisato 1.24 ·
  jill 1.67. With rotation verified, **jill's heat is kit-level in her normals model**
  (742M of her 892M sim damage is normal attacks; her 71.09%/9-round-magazine weapon data
  and elemental advantage are DB-faithful — the error is somewhere in cadence, buffs
  received, or a value subtlety).
- Open thread from the video: unattributed early-fight popups (repeating 180,633; 288,662;
  319,582 core hit) that don't match any unit's predicted pre-buff per-shot values —
  attributing these would validate several units' per-hit models at once. Jill's own
  predicted ~73k/146k popups need a targeted frame hunt.

### U8 ground truth #5 — run E second replicate + rouge rebuild (2026-07-13, docs/probes/u8 e2)

e2 repeats e's exact slot order (crown · ein · ada · rouge · cinderella): crown 140.6M ·
ein 544.1M · ada 467.8M · rouge 113.3M · cinderella 409.1M — every unit within ±3% of e.
**Run E is perfectly repeatable WITHIN a slot order.** Combined with the original run
(rouge in slot 1, cinderella 342.6M vs 398-409M adjacent), cinderella's +18% is PURELY
rouge's position — the adjacency effect is real, not burst-selection luck.

Also corrected (twice): the repeated ~4.99M popups during full-burst windows are ADA'S
burst-window hits — the camera focus in both e and e2 was Ada (middle slot), and popups
belong only to the focused unit. (The initial cinderella-barrage read and the ein-feather
math that happened to land near 4.99M were both wrong.) Per the user, Ada burst at ~28s.

**Rouge override rebuilt** (positional + Max-HP grants; see the override note): Sword Coin
6.65% Attack Damage now targets self + 2 allies per side (new selfAndAdjacent target);
her burst's coin-tier Max-HP grant (10.15/20.1/30.02% of HER Max HP, 10s) modeled at the
fight-averaged 22.5 ⚑; Double Sword Coin permanent 15.08% at ~58% uptime (positional);
S1's Max-HP trickle at ~45% uptime. These grants are OFFENSIVE for cinderella (her ATK
scales with her live Max HP — engine already feeds Max-HP buffs into HP-scaled ATK).

Scores after rebuild (e2): ein 0.98 ✓ · ada 1.08 · cinderella 0.83 (was 0.74; the
remaining ~77M gap ≈ the 1-2 burst casts reality gives her that the simulated
leftmost-ready selection still doesn't) · crown 1.44 · rouge 1.34. REMAINING run-E items:
crown and rouge's own ~1.3-1.4 heat (crown reads 0.89-1.14 in eight other fights — the
excess is specific to this team and not yet explained) and cinderella's cast starvation.

### Run E correction (2026-07-13, from the user): popups are FOCUS-UNIT-ONLY

Critical methodology fact learned here: on-screen damage popups come only from the unit
holding camera focus. The repeating ~4.99M popups in the e/e2 videos are the FOCUS unit's
burst-window hits — and, per the user, **cinderella is not bursting at all in run E**,
which MATCHES the simulation (0 casts, the cooldown-reduction math keeps ein/ada always
ready first). The "cast starvation" framing is retracted: the burst selection model is
CORRECT for this team. Cinderella's remaining 0.83 cold is therefore a NON-BURST output
under-model (normals + skill + the Max-HP-to-ATK economy), not missing casts.

### Run E RESOLVED — ada's Burst-3-only grant (2026-07-13)

Crown's and rouge's config-invariant ~1.44 heat was ADA'S S1 mis-scope: her kit reads
"Affects all BURST 3 allies who previously used their Burst Skill" — a +60%-of-her-ATK
flat grant (+ True Damage 50%) for burst-3 casters only. The model gave it to ALL burst
casters, so crown (burst 2) and rouge (burst 1) — who cast every rotation — carried an
illegitimate ~+56k flat ATK at near-permanent uptime. Fixed with a stage-filtered
burstCasters target. Run E after the fix (vs the e2 recording): crown 1.04 · ein 0.98 ·
ada 1.08 · rouge 1.02 · cinderella 0.83 (her non-burst cold remains the one open item,
pending the cindy-focus recording).

U8 pattern note for the doc's future readers: all three team-shaped probe failures traced
to buff SCOPE subtleties, not rotation — trina's "1 leftmost Electric ally with assault
rifles", rouge's positional "self and 2 allies on both sides" + Max-HP-to-ATK feeds, and
ada's "Burst 3 allies" filter. Kit-text target clauses deserve the same scrutiny as
multiplier values.

### Cinderella focus session — run E third replicate (2026-07-13, docs/probes/u8 e3)

Totals (third run of the same order): crown 140.0M · ein 524.9M · ada 460.1M ·
rouge 114.0M · cinderella 394.4M (her three runs: 398.0 / 409.1 / 394.4 — ±2%).
Focus popups decomposed her kit completely; four fixes, each video-measured:

1. **Per-instance values verified exactly** against the sim's combat ATK (80,118): rocket
   core hit 121,124 = 32.11% x 200% charge x core x element x the +7% Damage-Up she
   carries; her 136.6% proc 128,819 — both match to 0.3%. (The battle-records ATK, 92,206,
   is not the combat stat.)
2. **Twin rockets are SEPARATE instances at 32.11% each** — 862 popups over the fight =
   3 per pull (2 rockets + 1 proc) x 287 pulls, matching the sim's 288 pulls exactly. The
   engine fired the multiplier once per pull, halving her rocket damage (contrast maiden,
   whose twin rockets merge into ONE instance — per-unit behavior, both video-verified).
3. **Her Max-HP→ATK conversion counts her OWN Max HP only** (engine-wide fix): full-burst
   proc popups early (633.7k) and late (667.0k) match own-HP math within 2% — the growth
   is her Beautiful ramp — and would be ~28% higher if rouge's Max-HP grants fed it.
4. **Real reload ~1.2s** (visible mid-burst), vs the DB's 2.35s — her
   Preparation-for-Change reload (charFixes).
   The doubling then exposed that her old T2/T7 validation was compensating errors — her
   nuke was receiving the +50% full-burst major it shouldn't get, which resolved U10
   (see open-questions): the full-burst MAJOR is timing-based; frame-0 governs buffs only.
   Cinderella across all five samples after everything: run E 1.00 (video) · run B 0.96-0.98
   (video) · T2 1.22 · T7 1.16 (both entangled with the projectile-explosion-on-RL-normals
   default, the one multiplier a video hasn't yet touched).

## TEST BATTERY 2 (2026-07-13) — designed experiments for the remaining open questions

All scope lock, 180s, video with the named unit holding camera focus (popups = focus unit
only). Predictions use verified combat ATK values (Attackers 120,143 / Supporters 100,130 /
Defenders 80,118 at scope lock). Ordered by information value.

### Test 1 — Does burst-skill damage get the +50% full-burst multiplier? — DONE 2026-07-13

**Team: moran · cinderella · neon: Vision Eye · trina (the recorded run-B order) · elec
weak · CINDERELLA focus.** Recorded (docs/probes/tb2, "tb2 1"); the video contains an
aborted first attempt (restart at ~49s) and the full run — both were read and agree.
**RESULT: the +50% does NOT apply — but live buffs at cast DO.** Her nuke's sequential
hits read **non-crit 4,066,936 / crit 6,100,403** (the ×1.5 ratio confirms the pair).
Neither headline prediction hit exactly because both had excluded Trina's burst-granted
+20.9% attack damage from the cast snapshot; recomputed against the sim's actual instance
log, the measurement is 98.7% of the no-full-burst branch (4,120,347 / 6,180,521 — same
98.7% on crit AND non-crit, so the tiny residual is one small systematic factor, not
noise) and a 34% miss for the with-full-burst branch. Applied: burst-cast direct damage
is exempt from the Full Burst major (see open-questions A19). Board: run-B cinderella
1.17→0.96 with every other video-anchored unit unchanged; totals repeatability on the
rerun was within ±2% for three units (neon −4.7%, Super-count-sensitive).
Bonus resolved directly by the user: **trina is old-style release-fired, 22 frames
between shots** — exactly the engine's default RL latency (U12: only tia remains).

### Test 2 — Does Anis: Star's Projectile Explosion aura buff plain RL normal attacks? — DONE 2026-07-13

**Team: anis: star · trina · cinderella (3 units) · elec weak · CINDERELLA focus.**
Recorded (docs/probes/tb2, "tb2 2"). **RESULT: the aura DOES buff rocket normals.** The
buff-independent ratio test is exact: rocket core-hit popup 963,377 ÷ proc popup 771,268
= 1.2491 = the with-aura prediction to four digits (the without-branch predicts 0.784).
Pre-full-burst popups also matched at 99.7% (rocket core 113,571, proc 120,786). This
recording produced THREE bonus findings: (1) her nuke misses full-burst-ENTRY auras, not
just the +50% (open-questions A19 addendum — engine ordering fixed); (2) counting her
nuke storms directly gives full bursts every 40s → her burst cooldown is 40s as the DB
says, and the 3-unit fight's rotation exposed the burst-chain WINDOW mechanic
(open-questions A22); (3) trina's "Burst Skill damage of AoE skills ▲435.6%" rider did
NOT appear in the measured nuke — skipping it is empirically right. Reading note for
future popup work: the small repeated side popups near cinderella (e.g. 324,217 during
her nuke window) are the BOSS's damage dealt TO her Decoy (her kit summon) — the focus
unit's popup stream includes damage received by her own summons, not just damage dealt.

### Test 3 — Boss x2 gauge multiplier + sniper charge-scaled generation — DONE 2026-07-13

Recorded (docs/probes/tb2, "tb2 3 maiden" + "tb2 3 tak"). **RESULT: the whole gauge model
was rebuilt from these two solos + the datamined CharacterShotTable** (open-questions A22
for the full story). Maiden fills 12.55%/pull decomposing into two visible sub-steps —
weapon 9.1% + rider 3.45% — and takina ~14%/shot; both are exactly
target_burst_energy_pershot (the datamined per-unit boss-target column, = 2x base) with
the camera-focused charge weapon's x2.5 full-charge bonus (a solo unit is always
focused). No auto-efficiency factor exists. The one remaining knob is the UNfocused
charge unit's factor (U11b ⚑, engine x2.2).

### Test 4 — Jill's 1.67 heat — DONE 2026-07-13, SOLVED

**Team: grave · anis: star · jill · chisato · noir · elec weak · JILL focus.** Recorded
(docs/probes/tb2, "tb2 4"; totals replicate run I within ±3% on all five units). Her
opening popups matched the sim at 99.7% on all four classes (body 180,633 / core hit
319,582 / crit 250,107 / acid tick 288,662) — values were exact, the 1.67 was pure
CADENCE: datamined rate_of_fire 150 rpm (2.5 shots/s magnum, not the AR-class ~740) plus
rolling reload (reload_start_ammo 8: she tops up while firing, zero downtime). Jill now
reads **1.02** (open-questions A21).

### Test 5 — Run A burst order + the pierce question — HALF DONE 2026-07-13

**Team: anis: star · mint · prika · alice · red-hood · wind weak (Iron boss) · ALICE
focus.** Recorded (docs/probes/tb2, "tb2 5"). **(2) ANSWERED: no pierce double-hit** —
every Alice shot lands as ONE popup (763,961 / 2,269,805 core hits), never two
simultaneous values; PIERCE_CORE_DOUBLE stays false (open-questions A23). Her scope
camera also shows charge held to 329%+ with full-charge releases on auto. **(1) STILL
OPEN**: the sniper-scope camera hides burst cut-ins, so the mint/prika Burst-2 order per
rotation couldn't be read — needs one re-run with a non-scoped focus unit (e.g. anis).
Interesting repeatability note: alice came in +9.3% vs the original run A while everyone
else repeated within ±5% — consistent with camera focus granting her charge shots x2.5
gauge generation (the recording itself perturbs the fight).

### Test 6 — kit-level flags (as convenient; ~60s each suffices)

- **Eunhwa: Tactical Upgrade focus** in run D (emma-TU · eunhwa-TU · diesel-WS · helm,
  fire weak): do her railgun swap shots show CORE HIT popups? Her 1.32 drops to ~1.0 if
  they don't core.
- **Scarlet: Black Shadow focus** in the T1 team (mast · SBS · anis: star · liberalio ·
  crown, wind weak): her S1 proc popups verify the July-2 patch values (283.03 / 565 /
  848.03 tiers) and whether her procs carry the full-burst bonus in-window (her legacy
  noFb flag vs the timing rule) — she reads 1.22.
- **Quency: Escape Queen focus** in run H (LM · crown · quency · dorothy-S ·
  guillotine-WS, water weak): burst-window values; she reads 0.73-0.84 cold and owns the
  only regression from the timing-rule experiments.
- **Tia focus** (any team with tia, 15 seconds of footage): charge meter reading classifies
  the last unclassified charge unit.

## TEST BATTERY 3 (2026-07-13) — rotation engine + the focus-gauge question

The two highest engine-level unknowns. Part A is two ~45-second recordings; Part B needs
no video at all — just full-burst counts. All scope lock, full auto, vs the raid boss.

### Part A — DONE 2026-07-13 (docs/probes/"burst tests") — focus-only CONFIRMED

A1: takina unfocused steps +5.6-6.5%/shot (flat 560; excludes the +8.1% additive
hypothesis). A2: takina focused steps +14-15%/shot (560x2.5, matches her solo).
Engine: the ⚑x2.2 unfocused factor is deleted (measured 1.0). See open-questions A24.

### (original Part A spec, for reference)

**Team: takina (slot 1) · crown (slot 2), any boss element, ~45 seconds, team burst gauge
bar visible.** Takina's sniper shots land as big discrete gauge jumps every ~1.4s;
crown's machine-gun fill is the smooth trickle between them (~6%/s predicted) — so her
per-shot step is directly readable off the bar, exactly like the solo recordings.

- **A1 — takina NOT focused** (put camera focus on crown; if the game defaults focus to
  takina in a 2-unit formation, tap crown before starting and note it). Read takina's
  per-shot gauge step:
  - **≈ +5.6%** → unfocused charge weapons generate FLAT. The focus-only claim is
    confirmed; the engine's ⚑x2.2 gets deleted and the sniper-heavy comps' missing
    generation gets modeled from the per-unit skill-gauge quirks instead (ein-style).
  - **≈ +14%** → every charge weapon gets x2.5 on auto regardless of focus (the
    focus-gating is wrong; ⚑ resolves to a clean x2.5 for all).
  - **≈ +8-12%** → a partial mechanism (candidate: the datamined
    full_charge_burst_energy column, 560+250 = +8.1%).
- **A2 — paired control, same team, camera focus on TAKINA.** Expect **≈ +14%** steps,
  confirming the x2.5 applies in team fights the way it did in her solo.

This single pair also resolves a live contradiction: with the ⚑x2.2 the sim now predicts
13 full bursts for the recorded electric-battery fight where the video measured 11 —
either the unfocused factor is too high (A1 says flat) or something else generates.

### Part A3 — DONE 2026-07-13 — her row is a standard launcher (user hypothesis confirmed)

Measured ~+10.7-11.3%/pull = 280x2.5 shot + 280 proc gen x1.06 aura. The synergy 16.8
aggregate folds skill generation; the 840 estimate is retired. Her recording also caught
a live burst-chain collapse (gauge consumed, Burst-1 cast, window expiry, refill). See
open-questions A25.

### (original Part A3 spec, for reference)

Her per-shot gauge value is the one engine number still DERIVED from the synergy-API
column (16.8 ÷ 2 = 840) rather than datamined, and there's a real possibility that
column already folds her Skill-1 proc's generation into the per-shot total — in which
case the sim double-counts her (it adds proc generation on every full-charge hit on top
of the 840). She's in nearly every validation fight, so this feeds the +2 full-burst
overshoot directly. **Anis: Star solo vs the raid boss, ~30s, read her per-PULL gauge
step** (solo = focused, so her weapon part gets x2.5; her proc adds flat on top):

- **≈ +29%/pull** (about 3.5 pulls to full) → shot row really is 840 AND the proc
  generates separately — current model right, no double-count.
- **≈ +21%/pull** (about 5 pulls) → 840 is the COMBINED total (shot 840x2.5 with no
  separate proc gen, or shot ~560 + proc) — the synergy column folds skill generation
  and her entry needs splitting.
- **≈ +10%/pull** (about 10 pulls) → her row is a standard launcher 280 and the battery
  reputation is all proc/kit — rewrite her entry entirely.

### Part B — Full-burst counts for every fight (no videos needed)

Rerun each fight on auto and record just two numbers: the TOTAL count of FULL BURST!
splashes, and the clock reading (the 03:00 countdown) at the FIRST full burst. Keep the
default camera focus (middle slot). If you ever see the gauge sitting full with no one
casting, note it — that's a chain stall and is diagnostic on its own. Damage totals are
a nice-to-have (they double as repeatability data) but not required.

Sim predictions — THIRD REVISION (2026-07-13 late): after the Part A measurements PLUS
the rotation-anatomy findings from existing footage (~~generation runs DURING full burst~~
SUPERSEDED (2026-07-13) — generation is LOCKED during full burst; ~~the fast refill is charge
users releasing held shots right after it ends (owner correction, burst-gauge.md §1)~~ and ~~the
next chain can't open until ~3s after full burst ends~~ — both SUPERSEDED (2026-08-04): the ~3s was
natural refill-from-zero plus a video-offset confound; there is NO post-FB chain-open lock and the
gauge unlocks the instant FB ends (owner ruling, DECISIONS 2026-08-04, ROTMODEL=refill now default);
the gauge is consumed when the chain opens — all measured from the run-I/run-B/3-unit bar traces), the sim now
matches ALL FOUR graded comps exactly and most comps are seed-deterministic:

| fight                      | slots                                               | sim full bursts | first FB (fight time) | notes                              |
| -------------------------- | --------------------------------------------------- | --------------- | --------------------- | ---------------------------------- |
| elec battery (recorded)    | moran · cindy · neon · trina                        | 11              | ~5.0s                 | **video: 11 ✓ exact**              |
| elec DPS (recorded)        | crown · ein · ada · rouge · cindy                   | 10-11           | ~6.1s                 | video: ~11-12 ✓                    |
| misc B3s (recorded)        | grave · anis:star · jill · chisato · noir           | 13              | ~3.4s                 | **video: 13 ✓ exact, seed-stable** |
| 3-unit projExpl (recorded) | anis:star · trina · cindy                           | 4-5             | ~10.5s                | video: 5 ✓                         |
| iron sweep (run G)         | DKW · takina · milk:BB · maxwell · liberalio        | 13              | ~3.4s                 | video: 13-14 ✓                     |
| wind-weak T1               | mast:RM · SBS · anis:star · liberalio · crown       | 13              | ~2.8s                 |                                    |
| fire-weak T3               | rapi:RH · mihara:BC · little mermaid · crown · helm | 13              | ~3.6s                 |                                    |
| water-weak T4              | anis:star · privaty · SWHA · helm · crown           | 13              | ~3.4s                 |                                    |
| elec-weak T2               | crown · neon:VE · anis:star · cindy · maiden:IR     | 12              | ~4.8s                 |                                    |
| wind-weak T5               | nayuta · cindy:CW · anis:star · liberalio · velvet  | 13              | ~3.0s                 |                                    |
| fire-weak T6               | crown · rapi:RH · LM · SWHA · helm                  | 13              | ~3.4s                 |                                    |
| elec-weak T7               | crown · rapi:RH · anis:star · cindy · mast:RM       | 11              | ~5.9s                 |                                    |
| iron-weak T8               | anis:star · crown · rapi:RH · cindy:CW · helm       | 13              | ~3.5s                 |                                    |
| MiKa (run A)               | anis:star · mint · prika · alice · red-hood         | 11              | ~5.0s                 |                                    |
| shields (run C)            | tia · anis:star · naga · SWHA · helm                | 12              | ~3.9s                 |                                    |
| Eva duo (run D)            | emma:TU · eunhwa:TU · diesel:WS · helm              | 9               | ~3.4s                 |                                    |
| water B3s (run H)          | LM · crown · quency:EQ · dorothy:S · xGuillo        | 12              | ~5.5s                 |                                    |

If real counts come in 1-2 ABOVE these predictions in the comps carrying liberalio,
Snow White: Heavy Arms, or helm, that's the per-unit skill-generation quirks (U11c)
showing up — the deficit should be roughly proportional to how many of those units the
comp fields.

The four video rows are already measured — no rerun needed there. Highest-priority fresh
counts: T2 (maiden's stable 1.21 heat), T5 (sniper-heavy, coldest comp), T4 (SWHA/privaty
cold), MiKa, T7 (rapi cold). A sim-vs-real gap of +2 across the board points at the
unfocused-gauge knob (Part A tells us how to fix it); a gap concentrated in one comp
points at that comp's cooldown/chain specifics.

## TEST BATTERY 4 (2026-07-13) — the machine-gun optimal-range band table

### What we already measured (from existing footage, no new run needed)

The one machine-gun-focused recording on disk (the crown-focus gauge clip from the burst
tests, fight time 0-23 seconds = the boss's MID band) settles the mid band: crown's damage
popups (body 4,477 / core 8,955 / core-crit 11,194) match the NO-range-bonus predictions to
+0.33%, and the buff-immune class ratios are four-digit exact (core ÷ body = 2.0002 where the
bonus would give 1.769; crit ÷ core = 1.2501 where the bonus would give 1.217). **Machine guns
do NOT get the +30% bonus in the mid band — measured.** The same read confirmed assault
rifles DO get it in mid (jill's popups from test battery 2), and confirmed the bonus is
additive inside the major bracket (so on core hits it shows as ×1.15, not ×1.3 — always use
the class ratios, not a flat ×1.3, when reading bands).

What is still open: does the machine gun get the bonus in the MID-FAR band (as the engine
currently assumes), or in no band at all? A totals-level sweep already showed "no band at
all" makes the machine-gun units read colder, so this one band decides the table.

### The one recording that settles it — crown SOLO, full 180 seconds

- Crown alone vs the raid boss, scope lock, full auto, full 180 seconds. Solo means she is
  automatically the focused unit, and with only her own Burst II she can never reach Full
  Burst — no +50% windows to untangle. Prefer a boss that is not Wind-weak so the element
  multiplier stays 1.0.
- Her only time-varying self-buff is Skill 2 (every 860 hits: +20.99% attack damage for 7
  seconds → popup values ×1.21 for those windows; the class RATIOS are immune to it).
- Read the popup classes in each fight-clock window (the 3:00 timer counts DOWN):
  - mid 3:00→2:27 — already measured: NO bonus
  - near 2:27→1:50 — expect no bonus (shotgun band)
  - far 1:50→1:14 — expect no bonus (sniper band)
  - **mid-far 1:14→0:36 — THE DECISIVE WINDOW**
  - near 0:36→0:04 and mid-far 0:04→0:00 — replications
- Predicted popup classes solo (body / body-crit / core / core-crit), assuming the same
  +0.3% systematic as the duo read:
  - no bonus: 4,463 / 6,694 / 8,925 / 11,156
  - with the +30% bonus: 5,801 / 8,033 / 10,264 / 12,495
  - inside a Skill-2 window: all values ×1.21
- Verdict key, per band: core ÷ body ≈ 2.00 and crit ÷ core ≈ 1.25 → no bonus;
  core ÷ body ≈ 1.77 and crit ÷ core ≈ 1.22 → bonus present.
- If mid-far shows the bonus: the engine's current table is measured-confirmed and the
  question closes. If mid-far shows no bonus: machine guns join rocket launchers as
  "never in range" and the engine table gets corrected. Any OTHER band showing the bonus
  means the band table needs a new row (and the totals sweep says that would run hot —
  surprising, so double-read before believing it).

## TEST BATTERY 5 (2026-07-13) — where does "Elemental Advantage Attack Damage" live in the formula?

### Why this matters

A structural audit against the decoded reference simulator (nikke-einkk) found our engine
routes every "Elemental Advantage Attack Damage" kit line (privaty's 130, maiden's aura,
guillotine's passives — 11 lines in the roster) additively into the Damage Up bucket, while
the reference places it inside the Element multiplier (1.1 + value). An A/B run moves the
coldest buffed carries almost exactly onto their real totals if the reference is right
(privaty 0.77 → 1.00 in the water-weak fight), and touches nothing else. The two placements
are directly distinguishable from damage popups — but only in a comp with known additive buff
company; with no other Damage Up buffs live the two models predict nearly identical popups,
so a minimal solo run canNOT answer this one. The fully-modeled water-weak team is the
instrument.

### The one recording that settles it

**Water-weak T4 comp, exact slots `anis: star · privaty · SWHA · helm · crown`, boss water
weak (Fire), scope lock, full auto, 180 seconds, with PRIVATY holding declared camera focus**
(keep her in slot 2 — do not reorder; just declare the camera focus on her). Bonus: this same
video delivers the water-weak T4 full-burst count from the Part B priority list under a
declared focus.

- Sim predicts 13 full bursts; privaty bursts on the odd ones (~3.4s, 31.4s, 60s, 88.3s,
  116.3s, 145s, 173s fight time), Snow White: Heavy Arms on the even ones. Identify privaty's
  windows by HER burst cut-in, not the clock.
- Read her normal-bullet popup classes mid-window in three matched pairs (her full-burst
  window vs the adjacent Snow White: Heavy Arms window in the same boss-range band):
  - near band: hers ~60–70s (clock ~2:00→1:50) vs the other window ~46–56s (2:14→2:04);
    also read the no-full-burst gap around ~57s
  - far band: hers ~88–98s (1:32→1:22) vs ~74–84s (1:46→1:36); gap read ~85–87s
  - mid-far band: hers ~116–126s (1:04→0:54) vs ~130–140s (0:50→0:40)

### Predicted popup values (sim-exact; prior reads land within ×0.997–1.003 of these)

Each cell shows two values because crown's Skill 2 (+20.99% attack damage, 7-second windows)
flickers on and off — both sub-classes will appear.

| read                                                 | Damage Up placement (engine today) | Element placement (reference) |
| ---------------------------------------------------- | ---------------------------------- | ----------------------------- |
| privaty normal bullet, HER full-burst window         | 204,453 / 216,777                  | 279,570 / 306,455             |
| normal bullet, Snow White window (control)           | 99,121 / 108,653                   | identical                     |
| normal bullet, no-full-burst gap (control)           | 28,067                             | identical                     |
| her last-bullet proc (the 256.17% class), her window | 2.56M / 2.71M                      | 3.50M / 3.84M                 |
| that proc outside full burst (~86s, control)         | 607,956                            | identical                     |
| her burst nuke at cast (non-crit)                    | 6.10M                              | 7.29M                         |

Crit/core classes sit at ×1.333 / ×1.667 / ×2.0 of the body value inside full burst and
×1.5 / ×2.0 / ×2.5 outside it (both models — use these to validate reads, not to decide).

### Verdict key (immune to attack-value drift; read several windows)

Her-window body value ÷ same-band Snow-White-window body value:

- **≈ 1.88–2.19 → Damage Up placement confirmed (engine stays as-is)**
- **≈ 2.57–3.09 → Element placement confirmed (engine change lands)**
  The ranges span the crown flicker and do not overlap. The proc class gives the same verdict
  independently (2.71M maximum under Damage Up vs 3.50M minimum under Element).

Control reads (the Snow White windows, the gaps, and the class ratios) are predicted
identical under both models — if a control is off, something else is wrong with the window
(most likely crown's caster-attack buff schedule differing from sim) and the verdict read
should not be trusted until the controls match.

## TEST BATTERY 6 (2026-07-13) — Rapi: Red Hood's projectile pipeline (core scope, crit, explosion timing)

### Why this matters

The Rapi: Red Hood kit audit left three questions that totals-fitting cannot answer (all four of
her comps are screenshot-graded, and the A/B arms bracket her real totals instead of hitting
them):

1. **Core scope** — do her sticky-projectile ATTACH hits land core hits (the datamine says her
   sticky collisions ride the full bullet pipeline, core rate 200%)? And separately, do the
   stored EXPLOSIONS core? The audit's preferred model (attaches core, explosions not) is
   inexpressible with the shared experiment knob, so the two halves need independent reads.
2. **Crit** — do her stage-3 window ticks and her stored-explosion releases crit? The sim
   hardcodes them non-critting; the reference simulator and the documented flat-damage default
   say they crit.
3. **Explosion timing** — do projectiles attached DURING a Full Burst window explode
   immediately (datamine: instant in-burst explosion), or only batch at the NEXT Full Burst
   entry (the sim's current deferral, which also means the final cycle never pays out)?

One rapi-focused recording answers all three at measured tier, from popup values alone.

### The one recording

**Elec-weak T7 comp, exact slots `crown · rapi: red hood · anis: star · cinderella ·
mast: romantic maid`, boss Water (electric-weak), scope lock, full auto, full 180 seconds,
with RAPI: RED HOOD holding declared camera focus** (keep her in slot 2 — do not reorder,
just tap the camera focus onto her before starting). Damage popups on, the 3:00 countdown
visible, and the end-of-fight damage screenshot as usual (it doubles as repeatability data).

- Why this comp: on the Water boss none of her hits carry the element multiplier (her Skill 2
  advantage is against Electric enemies only) and no Damage Taken debuff exists in this team,
  so her popup classes have the fewest overlapping values of her four comps. Mast never uses
  her burst here, so the team crit-damage buff never fires — the crit step is exactly ×1.5
  outside Full Burst and ×1.333 inside it, all fight. The only value-splitter is Crown's
  Skill 2 flicker (+20.99 points of Attack Damage, 7-second windows) — both sub-values are
  predicted below where they matter.
- **This recording doubles as the elec-weak T7 full-burst count from test battery 3 Part B.**
  Note: the Part B table row (11 full bursts, first ~5.9s) assumed default middle-slot focus
  (Anis: Star, whose launcher gets the ×2.5 focused-charge gauge). With focus on Rapi (machine
  gun — the focus bonus goes unused) the sim predicts **10 full bursts, first at ~6.5s (clock
  ~2:54)**. Record the total FULL BURST count and the clock at the first one.
- Predicted rotation (identify windows by the burst cut-in, not the clock — real proc timing
  and chain gaps drift a little): Rapi casts Burst 3 on entries 1/3/5/7/9 at about 6.5s (2:54),
  40s (2:20), 75s (1:45), 112s (1:08), 147.6s (0:32); Cinderella on entries 2/4/6/8/10 at about
  22s (2:38), 55.9s (2:04), 92.9s (1:27), 128.9s (0:51), 165.1s (0:15). Each window lasts 10
  seconds.

### Her popup classes — visual key

- **Normal bullets**: the constant machine-gun stream, five-figure popups. Background only —
  and do not use them for band checks in the mid-far windows (1:14→0:36, 0:04→0:00), where the
  machine-gun range-bonus question from test battery 4 is still open. Every class below is a
  rider and NEVER gets the +30% range bonus, so no band accounting is needed for any verdict.
- **Attach hits** (sticky projectiles, every 120 shots): a lone six-to-seven-figure popup every
  ~3.6–4.5 seconds of sustained fire — ~340–620 thousand outside Full Burst, ~1.7–5.9 million
  inside windows.
- **Window ticks** (her stage-3 doubled proc rate): a 2-second-cadence stream of ~5.28 million
  popups during her OWN stage-3 windows; the fifth member of each cadence lands ~1.5–2 seconds
  after the banner ends, at ~620–720 thousand.
- **Stored-explosion releases**: a batch of near-identical ~2.0–2.6 million popups at the
  moment the FULL BURST banner appears.
- **Her burst nuke**: a single ~5.94 million popup (crit ~8.91 million) at her cast instant,
  just BEFORE the banner. **Caution**: the nuke body value (5,938,951) nearly collides with the
  Crown-flicker tick value (5,929,545) — separate them by timing, never by value.

All predicted values below are sim-exact; expect measured popups ≈ ×0.997 of them (the known
popup systematic — the anchor read reproduces at 0.9972 uniform). Every verdict is a
ratio/step within a single read, immune both to that systematic and to attack-value drift.
Crit-class popups appear at her ~35% modeled crit rate (15 base + Mast's aura) — use the
PRESENCE of a step class as the verdict, not its frequency (the aura model is approximate).

### Question 1a — do attach hits core?

Read attach popups OUTSIDE Full Burst (the lone popups between windows). Predictions by state:

| state (when to read)                                                  | sim today (core NO): body / crit | core YES adds: core / core-crit |
| --------------------------------------------------------------------- | -------------------------------- | ------------------------------- |
| cold, no buffs — 2:56, 2:54, 2:22, 1:28, 1:09, 0:53, 0:17             | 342,982 / 514,473                | 685,964 / 857,455               |
| post-window state — 2:42, 2:40, 2:08, 2:06, 0:55                      | 622,882 / 934,323                | 1,245,764 / 1,557,204           |
| in-Full-Burst, Cinderella windows — e.g. 2:32, 2:30, 2:00, 1:58, 1:56 | 1,678,352 / 2,237,803            | 2,797,253 / 3,356,704           |

**Verdict key (drift-immune):** outside Full Burst a core-class attach sits at **×2.000** of the
body value (crit ×1.5, core-crit ×2.5); inside Full Burst core is **×1.667** (crit ×1.333,
core-crit ×2.0). Any attach popup at the ×2.0 (outside) / ×1.667 (inside) step → attaches core.
Six or more out-of-burst attach reads showing only the body/crit pair → attaches do not core
(at any plausible core rate, six consecutive misses is conclusive). Control: the crit class
(×1.5) SHOULD appear across reads — the current model already crits attaches; its total absence
over ~10 reads is itself a finding (attaches never crit) and should be recorded.

### Question 1b — do the stored explosions core? (and Question 2b — do they crit?)

Pause/scrub at each FULL BURST banner and read the batch of near-identical explosion popups
individually. Per-explosion predictions (the four-value key per batch):

| banner (clock)       | batch size (deferred model) | body (sim today) | crit YES ×1.333 | core YES ×1.667 | both ×2.0 |
| -------------------- | --------------------------- | ---------------- | --------------- | --------------- | --------- |
| 2:54 (Rapi window 1) | 2                           | 2,298,943        | 3,065,258       | 3,831,572       | 4,597,887 |
| 2:38 (Cinderella 1)  | 10                          | 2,199,601        | 2,932,802       | 3,666,002       | 4,399,203 |
| 2:20 (Rapi 2)        | 5                           | 2,298,421        | 3,064,562       | 3,830,702       | 4,596,843 |
| 2:04 (Cinderella 2)  | 10                          | 1,958,166        | 2,610,888       | 3,263,610       | 3,916,332 |
| 1:45 (Rapi 3)        | 4                           | 2,298,943        | 3,065,258       | 3,831,572       | 4,597,887 |
| 1:27 (Cinderella 3)  | 11                          | 1,958,240        | 2,610,987       | 3,263,734       | 3,916,481 |
| 1:08 (Rapi 4)        | 4                           | 2,298,943        | 3,065,258       | 3,831,572       | 4,597,887 |
| 0:51 (Cinderella 4)  | 11                          | 1,958,240        | 2,610,987       | 3,263,734       | 3,916,481 |
| 0:32 (Rapi 5)        | 4                           | 2,582,396        | 3,443,194       | 4,303,993       | 5,164,791 |
| 0:15 (Cinderella 5)  | 11                          | 1,958,240        | 2,610,987       | 3,263,734       | 3,916,481 |

(The 2:38 and 0:32 rows carry Crown's flicker; if a batch value runs ~×1.123 of a neighboring
row's, that is the flicker, not a step — the within-batch ratios are what decide.)

**Verdict key:** within a batch, popups at **×1.333** of the batch body → releases crit; at
**×1.667** → releases core; at **×2.0** → both. All popups identical → neither. Three batches
(~30 popups) give overwhelming coverage at a 35% crit rate and any plausible core rate.
These reads assume Anis: Star's Full-Burst-entry Projectile Explosion aura (+92.03%) is live
on the release — the measured rule (stored releases resolve after entry auras) is baked into
the predicted values; if batch bodies read ~×0.66 of prediction, that rule itself is falsified
(record it — that would be its first direct measurement).

### Question 2a — do the window ticks crit?

Inside Rapi's own windows the ticks and the in-window attach hits form ONE value class
(both are 88.11% attachment-flavored hits under the same buffs: body 5,279,000 at the dominant
state, ×1.333 crit step 7,038,000; Crown-flicker sub-state 5,930,000 / 7,907,000) — so
in-window values alone cannot separate "ticks crit" from "attach hits crit" (the current model
already crits the attaches). Two reads that CAN:

- **The boundary tick** — follow the 2-second tick cadence from inside each Rapi window; the
  fifth member lands ~1.5–2 seconds AFTER the banner ends, isolated from attach procs. Times
  about 2:44, 2:10, 1:35, 0:58, 0:22. Predicted body 622,750 (at 2:44, 1:35, 0:22) or 718,694
  (at 2:10, 0:58). Ticks-crit-YES predicts occasional reads at **×1.5**: 934,125 / 1,078,040.
  Caveat: these bodies assume her 10-second buffs expire before the fifth tick, as the sim's
  frame arithmetic says; if the real game resolves the tick first, the read appears in the
  ~5.28-million class instead and the crit step is ×1.333 (~7.04 million) — the step, not the
  absolute value, is the verdict either way.
- **In-window frequency corroboration** (secondary): under attach-only crit, roughly one
  ×1.333-step popup per window among the big attachment stream; under ticks-crit-YES, roughly
  a third of ALL ~8 attachment popups per window step up. Suggestive only — the boundary ticks
  and the Question 2b batch read carry the verdict.

### Question 3 — do in-window attaches explode instantly or batch at the next entry?

Pure counting and timing — no value reads needed (in-window explosion popups, if they exist,
sit at ~2.3 million in her windows / ~2.0 million in Cinderella's, distinct from every other
class).

| signature                                                       | deferred (sim today)                     | instant (datamine)                                                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| explosion-class popups DURING any window                        | none, ever                               | yes: ~5 right after Rapi's own banner (her stage-3 batch), then ~3–4 more at ~2-second spacing through the window; ~3 during each Cinderella window |
| batch size at Cinderella banners (2:38, 2:04, 1:27, 0:51, 0:15) | ~10–11 popups                            | ~1–2 popups                                                                                                                                         |
| batch size at Rapi banners                                      | ~2–5 popups                              | ~1–2 at the banner, then the ~5-batch immediately after                                                                                             |
| final 15 seconds (inside Cinderella's last window)              | the last window's attaches never explode | ~3 explosion popups before 0:00                                                                                                                     |

**Verdict key:** the Cinderella-banner batch count separates the models by a factor of ~5 and
needs no value reading at all; the presence/absence of explosion popups streaming through any
window is the same verdict from a second angle. Count at least three Cinderella banners and
watch one full Rapi window end-to-end. (Exact counts drift with real proc timing — the
categorical gap does not.)

### Cross-checks (read a couple; all drift-immune)

- Explosion body ÷ same-window attachment body: **0.4355** inside Rapi's windows,
  **1.1667** at Cinderella entries (the attachment buff is only live in her own windows).
- Crit ÷ body on any class: 1.5 outside Full Burst, 1.333 inside — validates a read's
  Full-Burst state before trusting it.
- Her nuke at each of her five casts: 5,938,951 body / 8,908,426 crit (0:32 cast: 6,853,943 /
  10,280,914) — lands before the banner, confirming the cast-instant boundary rule in passing.
- If a control is off, the window's buff schedule differs from sim (most likely a chain-timing
  slip) — re-anchor on the cut-ins and prefer a different window rather than trusting the read.

### How many reads suffice

Question 1a: six-plus attach reads outside Full Burst. Questions 1b/2b: three banner batches
read popup-by-popup. Question 2a: all five boundary ticks. Question 3: counts at three
Cinderella banners plus one full Rapi window watched through. All from the same single video.

## Full-burst chain timelines — manual harness verification (2026-07-13)

Owner request: the sim's complete predicted burst-chain event list for each upcoming
recording, so the rotation engine can be validated by eye against the videos. Every line
below is a sim event: the Burst I / Burst II / Burst III cast (stage casts run ~0.5 seconds
apart) and the FULL BURST banner (which lands with the Burst III cast). "clock" is the
on-screen 3:00 countdown.

How to verify against a video:

1. **Caster order must match exactly** (which unit takes each Burst III, alternating
   pattern) — this is the strongest check and is drift-free.
2. **The first full burst should land within about ±1 second** of the predicted clock time.
3. **The count must match** the predicted total.
4. **Later entries accumulate drift** (real proc/chain timing wanders a little), so compare
   the SPACING between consecutive full bursts (the ~13–18 second cycle gaps) rather than
   absolute late-fight clock times. A one-off ~1 second extra delay around 0:36 (the 144
   second boss transition) is the measured off-screen cast block — the water-weak T4
   timeline below shows the sim predicting exactly that (Privaty's Burst III at 0:35.0
   instead of ~0:36.2).
5. If a real chain opens with a DIFFERENT caster or an extra/missing full burst appears,
   note the clock time — that is a rotation-model bug (or a boss-transition collision) and
   is exactly what this validation is for.

Deterministic predictions (no seed); the focus setting matters and is stated per comp.

### BATTERY 5 — water-weak T4, PRIVATY focus

    full bursts: 13
      t=   2.4s  clock 2:57.6  BI Anis: Star
      t=   2.9s  clock 2:57.1  BII Crown
      t=   3.4s  clock 2:56.6  BIII Privaty
      t=   3.4s  clock 2:56.6  FULL BURST (until 13.4s)
      t=  16.4s  clock 2:43.6  BI Anis: Star
      t=  16.9s  clock 2:43.1  BII Crown
      t=  17.4s  clock 2:42.6  BIII Snow White: Heavy Arms
      t=  17.4s  clock 2:42.6  FULL BURST (until 27.4s)
      t=  30.4s  clock 2:29.6  BI Anis: Star
      t=  30.9s  clock 2:29.1  BII Crown
      t=  31.4s  clock 2:28.6  BIII Privaty
      t=  31.4s  clock 2:28.6  FULL BURST (until 41.4s)
      t=  45.0s  clock 2:15.0  BI Anis: Star
      t=  45.5s  clock 2:14.5  BII Crown
      t=  46.0s  clock 2:14.0  BIII Snow White: Heavy Arms
      t=  46.0s  clock 2:14.0  FULL BURST (until 56.0s)
      t=  59.0s  clock 2:01.0  BI Anis: Star
      t=  59.5s  clock 2:00.5  BII Crown
      t=  60.0s  clock 2:00.0  BIII Privaty
      t=  60.0s  clock 2:00.0  FULL BURST (until 70.0s)
      t=  73.3s  clock 1:46.7  BI Anis: Star
      t=  73.8s  clock 1:46.2  BII Crown
      t=  74.3s  clock 1:45.7  BIII Snow White: Heavy Arms
      t=  74.3s  clock 1:45.7  FULL BURST (until 84.3s)
      t=  87.3s  clock 1:32.7  BI Anis: Star
      t=  87.8s  clock 1:32.2  BII Crown
      t=  88.3s  clock 1:31.7  BIII Privaty
      t=  88.3s  clock 1:31.7  FULL BURST (until 98.3s)
      t= 101.3s  clock 1:18.7  BI Anis: Star
      t= 101.8s  clock 1:18.2  BII Crown
      t= 102.3s  clock 1:17.7  BIII Snow White: Heavy Arms
      t= 102.3s  clock 1:17.7  FULL BURST (until 112.3s)
      t= 115.3s  clock 1:04.7  BI Anis: Star
      t= 115.8s  clock 1:04.2  BII Crown
      t= 116.3s  clock 1:03.7  BIII Privaty
      t= 116.3s  clock 1:03.7  FULL BURST (until 126.3s)
      t= 129.3s  clock 0:50.7  BI Anis: Star
      t= 129.8s  clock 0:50.2  BII Crown
      t= 130.3s  clock 0:49.7  BIII Snow White: Heavy Arms
      t= 130.3s  clock 0:49.7  FULL BURST (until 140.3s)
      t= 143.3s  clock 0:36.7  BI Anis: Star
      t= 143.8s  clock 0:36.2  BII Crown
      t= 145.0s  clock 0:35.0  BIII Privaty
      t= 145.0s  clock 0:35.0  FULL BURST (until 155.0s)
      t= 158.0s  clock 0:22.0  BI Anis: Star
      t= 158.5s  clock 0:21.5  BII Crown
      t= 159.0s  clock 0:21.0  BIII Snow White: Heavy Arms
      t= 159.0s  clock 0:21.0  FULL BURST (until 169.0s)
      t= 172.0s  clock 0:08.0  BI Anis: Star
      t= 172.5s  clock 0:07.5  BII Crown
      t= 173.0s  clock 0:07.0  BIII Privaty
      t= 173.0s  clock 0:07.0  FULL BURST (until 183.0s)

### BATTERY 6 — elec-weak T7, RAPI: RED HOOD focus

    full bursts: 10
      t=   5.5s  clock 2:54.5  BI Anis: Star
      t=   6.0s  clock 2:54.0  BII Crown
      t=   6.5s  clock 2:53.5  BIII Rapi: Red Hood
      t=   6.5s  clock 2:53.5  FULL BURST (until 16.5s)
      t=  21.0s  clock 2:39.0  BI Anis: Star
      t=  21.5s  clock 2:38.5  BII Crown
      t=  22.0s  clock 2:38.0  BIII Cinderella
      t=  22.0s  clock 2:38.0  FULL BURST (until 32.0s)
      t=  39.0s  clock 2:21.0  BI Anis: Star
      t=  39.5s  clock 2:20.5  BII Crown
      t=  40.0s  clock 2:20.0  BIII Rapi: Red Hood
      t=  40.0s  clock 2:20.0  FULL BURST (until 50.0s)
      t=  54.9s  clock 2:05.1  BI Anis: Star
      t=  55.4s  clock 2:04.6  BII Crown
      t=  55.9s  clock 2:04.1  BIII Cinderella
      t=  55.9s  clock 2:04.1  FULL BURST (until 65.9s)
      t=  74.0s  clock 1:46.0  BI Anis: Star
      t=  74.5s  clock 1:45.5  BII Crown
      t=  75.0s  clock 1:45.0  BIII Rapi: Red Hood
      t=  75.0s  clock 1:45.0  FULL BURST (until 85.0s)
      t=  91.9s  clock 1:28.1  BI Anis: Star
      t=  92.4s  clock 1:27.6  BII Crown
      t=  92.9s  clock 1:27.1  BIII Cinderella
      t=  92.9s  clock 1:27.1  FULL BURST (until 102.9s)
      t= 111.0s  clock 1:09.0  BI Anis: Star
      t= 111.5s  clock 1:08.5  BII Crown
      t= 112.0s  clock 1:08.0  BIII Rapi: Red Hood
      t= 112.0s  clock 1:08.0  FULL BURST (until 122.0s)
      t= 127.9s  clock 0:52.1  BI Anis: Star
      t= 128.4s  clock 0:51.6  BII Crown
      t= 128.9s  clock 0:51.1  BIII Cinderella
      t= 128.9s  clock 0:51.1  FULL BURST (until 138.9s)
      t= 146.6s  clock 0:33.4  BI Anis: Star
      t= 147.1s  clock 0:32.9  BII Crown
      t= 147.6s  clock 0:32.4  BIII Rapi: Red Hood
      t= 147.6s  clock 0:32.4  FULL BURST (until 157.6s)
      t= 164.1s  clock 0:15.9  BI Anis: Star
      t= 164.6s  clock 0:15.4  BII Crown
      t= 165.1s  clock 0:14.9  BIII Cinderella
      t= 165.1s  clock 0:14.9  FULL BURST (until 175.1s)

### Part B — elec-weak T2, default focus (middle = anis-star)

    full bursts: 12
      t=   3.9s  clock 2:56.1  BI Anis: Star
      t=   4.3s  clock 2:55.7  BII Crown
      t=   4.8s  clock 2:55.2  BIII Neon: Vision Eye
      t=   4.8s  clock 2:55.2  FULL BURST (until 14.8s)
      t=  19.0s  clock 2:41.0  BI Anis: Star
      t=  19.5s  clock 2:40.5  BII Crown
      t=  20.0s  clock 2:40.0  BIII Cinderella
      t=  20.0s  clock 2:40.0  FULL BURST (until 30.0s)
      t=  36.0s  clock 2:24.0  BI Anis: Star
      t=  36.5s  clock 2:23.5  BII Crown
      t=  37.0s  clock 2:23.0  BIII Neon: Vision Eye
      t=  37.0s  clock 2:23.0  FULL BURST (until 47.0s)
      t=  51.0s  clock 2:09.0  BI Anis: Star
      t=  51.5s  clock 2:08.5  BII Crown
      t=  52.0s  clock 2:08.0  BIII Cinderella
      t=  52.0s  clock 2:08.0  FULL BURST (until 62.0s)
      t=  66.1s  clock 1:53.9  BI Anis: Star
      t=  66.6s  clock 1:53.4  BII Crown
      t=  67.1s  clock 1:52.9  BIII Neon: Vision Eye
      t=  67.1s  clock 1:52.9  FULL BURST (until 77.1s)
      t=  81.7s  clock 1:38.3  BI Anis: Star
      t=  82.2s  clock 1:37.8  BII Crown
      t=  82.7s  clock 1:37.3  BIII Cinderella
      t=  82.7s  clock 1:37.3  FULL BURST (until 92.7s)
      t=  97.2s  clock 1:22.8  BI Anis: Star
      t=  97.7s  clock 1:22.3  BII Crown
      t=  98.2s  clock 1:21.8  BIII Neon: Vision Eye
      t=  98.2s  clock 1:21.8  FULL BURST (until 108.2s)
      t= 112.1s  clock 1:07.9  BI Anis: Star
      t= 112.6s  clock 1:07.4  BII Crown
      t= 113.1s  clock 1:06.9  BIII Cinderella
      t= 113.1s  clock 1:06.9  FULL BURST (until 123.1s)
      t= 126.5s  clock 0:53.5  BI Anis: Star
      t= 127.0s  clock 0:53.0  BII Crown
      t= 127.5s  clock 0:52.5  BIII Neon: Vision Eye
      t= 127.5s  clock 0:52.5  FULL BURST (until 137.5s)
      t= 142.5s  clock 0:37.5  BI Anis: Star
      t= 143.0s  clock 0:37.0  BII Crown
      t= 143.5s  clock 0:36.5  BIII Cinderella
      t= 143.5s  clock 0:36.5  FULL BURST (until 153.5s)
      t= 157.6s  clock 0:22.4  BI Anis: Star
      t= 158.1s  clock 0:21.9  BII Crown
      t= 158.6s  clock 0:21.4  BIII Neon: Vision Eye
      t= 158.6s  clock 0:21.4  FULL BURST (until 168.6s)
      t= 173.2s  clock 0:06.8  BI Anis: Star
      t= 173.7s  clock 0:06.3  BII Crown
      t= 174.2s  clock 0:05.8  BIII Cinderella
      t= 174.2s  clock 0:05.8  FULL BURST (until 184.2s)

### Part B — wind-weak T5, default focus (middle = anis-star)

    full bursts: 13
      t=   2.0s  clock 2:58.0  BI Anis: Star
      t=   2.5s  clock 2:57.5  BII Nayuta
      t=   3.0s  clock 2:57.0  BIII Cinderella: Crystal Wave
      t=   3.0s  clock 2:57.0  FULL BURST (until 13.0s)
      t=  16.0s  clock 2:44.0  BI Anis: Star
      t=  16.5s  clock 2:43.5  BII Nayuta
      t=  17.0s  clock 2:43.0  BIII Liberalio
      t=  17.0s  clock 2:43.0  FULL BURST (until 27.0s)
      t=  30.0s  clock 2:30.0  BI Anis: Star
      t=  30.5s  clock 2:29.5  BII Nayuta
      t=  31.0s  clock 2:29.0  BIII Cinderella: Crystal Wave
      t=  31.0s  clock 2:29.0  FULL BURST (until 41.0s)
      t=  44.0s  clock 2:16.0  BI Anis: Star
      t=  44.5s  clock 2:15.5  BII Nayuta
      t=  45.0s  clock 2:15.0  BIII Liberalio
      t=  45.0s  clock 2:15.0  FULL BURST (until 55.0s)
      t=  59.0s  clock 2:01.0  BI Anis: Star
      t=  59.5s  clock 2:00.5  BII Nayuta
      t=  60.0s  clock 2:00.0  BIII Cinderella: Crystal Wave
      t=  60.0s  clock 2:00.0  FULL BURST (until 70.0s)
      t=  73.0s  clock 1:47.0  BI Anis: Star
      t=  73.5s  clock 1:46.5  BII Nayuta
      t=  74.0s  clock 1:46.0  BIII Liberalio
      t=  74.0s  clock 1:46.0  FULL BURST (until 84.0s)
      t=  87.0s  clock 1:33.0  BI Anis: Star
      t=  87.5s  clock 1:32.5  BII Nayuta
      t=  88.0s  clock 1:32.0  BIII Cinderella: Crystal Wave
      t=  88.0s  clock 1:32.0  FULL BURST (until 98.0s)
      t= 101.0s  clock 1:19.0  BI Anis: Star
      t= 101.5s  clock 1:18.5  BII Nayuta
      t= 102.0s  clock 1:18.0  BIII Liberalio
      t= 102.0s  clock 1:18.0  FULL BURST (until 112.0s)
      t= 115.0s  clock 1:05.0  BI Anis: Star
      t= 115.5s  clock 1:04.5  BII Nayuta
      t= 116.0s  clock 1:04.0  BIII Cinderella: Crystal Wave
      t= 116.0s  clock 1:04.0  FULL BURST (until 126.0s)
      t= 130.0s  clock 0:50.0  BI Anis: Star
      t= 130.5s  clock 0:49.5  BII Nayuta
      t= 131.0s  clock 0:49.0  BIII Liberalio
      t= 131.0s  clock 0:49.0  FULL BURST (until 141.0s)
      t= 145.0s  clock 0:35.0  BI Anis: Star
      t= 145.5s  clock 0:34.5  BII Nayuta
      t= 146.0s  clock 0:34.0  BIII Cinderella: Crystal Wave
      t= 146.0s  clock 0:34.0  FULL BURST (until 156.0s)
      t= 159.0s  clock 0:21.0  BI Anis: Star
      t= 159.5s  clock 0:20.5  BII Nayuta
      t= 160.0s  clock 0:20.0  BIII Liberalio
      t= 160.0s  clock 0:20.0  FULL BURST (until 170.0s)
      t= 173.0s  clock 0:07.0  BI Anis: Star
      t= 173.5s  clock 0:06.5  BII Nayuta
      t= 174.0s  clock 0:06.0  BIII Cinderella: Crystal Wave
      t= 174.0s  clock 0:06.0  FULL BURST (until 184.0s)

## TEST BATTERY 5 — RESULT (2026-07-14, probe u7): Element placement CONFIRMED, landed

The privaty-focus recording settled the question at measured tier. Her normal-bullet popup
ratio between her own full-burst windows (her 130-point "Elemental Advantage Attack Damage"
line live) and the adjacent Snow White: Heavy Arms windows (line not live) read **2.8244 on
all three matched boss-range-band pairs** — the Element-placement prediction is 2.821, the
Damage-Up-placement prediction is 1.995. Two independent corroborations: her last-bullet proc
implies a base of 3,833,833 (the Element-model class within 0.2%; the Damage-Up model's
ceiling is 2.71 million) and her burst volley totals 7,267,494 (Element model 7.29 million;
the Damage-Up model's 6.10 million matches no combination). Controls (Snow White windows,
out-of-burst proc) matched predictions under both models, validating the windows.

**Landed:** "Elemental Advantage Attack Damage" now multiplies inside the Element bucket
(1.1 + value) engine-wide. Board effect: privaty 0.77→1.00 in the water-weak fight; the
electric-weak fight's carries (riding Maiden: Ice Rose's aura) warm 8–19%. Details in
docs/DECISIONS.md and docs/data/damage-calculation.md §1c.

**New findings from the same recording (own increments, not part of the landing):**

- **The fight ran 14 full bursts against the sim's predicted 13** — caster order was exact
  all fight, but real burst cycles run about a second faster than the sim's (13.0s vs
  14.0–14.7s), and the accumulated difference fits an extra burst. The elec-weak and
  wind-weak count runs show the same roughly-one-second-fast cycle (their counts survived
  it). Locating that second is the next rotation increment — it needs a fresh bar-anatomy
  measurement pass before any measured constant moves.
- Privaty's burst nuke is a volley of 2–3 missiles (2,422,498 each) landing ~1.5 seconds
  after the cast, not a single cast-instant hit.
- Two unexplained popup details, logged for investigation: her no-full-burst-gap normal
  bullets read uniformly ×1.15 of prediction (all gaps equally; her proc in the same gaps
  matches exactly), and her proc's crit step inside full burst read ×1.5 where ×1.333 was
  expected.

## TEST BATTERY 4 — RESULT (2026-07-14, probe u7): machine guns are in range in the FAR band only — landed

The crown solo recording (vs Armstrong, zero full bursts as predicted) read the popup class
ratios band by band: mid, near (twice), and the decisive mid-far window (seven clean reads)
all show the no-bonus signatures (core ÷ body = 2.000, crit ÷ core = 1.250), while the far
band (1:50→1:14) shows the bonus signatures (1.769, 1.217). Neither prior hypothesis
survived — machine guns are not "never in range" and not "mid-far" as the engine assumed;
**the +30% bonus applies in the far band only**. The engine table is corrected (board impact
roughly nil — the already-cold machine-gun rows shift by under half a point).

Two additional observations from the same video:

- The bonus turns on and off with the boss's physical walk, about 4–6 seconds ahead of or
  behind the scripted band boundaries — the real trigger is the boss's instantaneous distance
  crossing the weapon's optimal ring. The band table is an approximation with a few seconds
  of edge error; modeling the ring crossing directly against the walk timing is a possible
  future refinement (this video already contains the validation timestamps).
- Crown's Skill 2 damage flicker (×1.21 for 7 seconds) matched the modeled values exactly in
  every band, and the machine-gun wind-up's no-core ramp is visible after every reload.

## TEST BATTERY 6 — RESULT (2026-07-14, probe u7): the three questions were overtaken — Rapi: Red Hood's projectile model needs a rework

The recording answered something bigger than the questions asked: the sim's structural model
of her kit does not match what renders on screen.

- The predicted popup classes largely do not exist: no window-tick stream, no explosion
  batches at Full Burst banners, and zero lone attach popups outside Full Burst across twelve
  surveyed seconds of gap time.
- What exists instead: an in-window rider class (1,680,449 body / 2,240,599 crit — the crit
  step is exactly ×1.333) at roughly 4.5-second cadence whose value matches the UNBUFFED
  prediction — her burst's +421% attachment self-buff evidently does not apply to it; and a
  constant **25,125,105** popup at her own banners only, which factors as exactly ten times
  2,512,510.5 — reading as a ten-explosion batch aggregated into a single popup, released at
  HER burst cast rather than at every Full Burst entry as the sim schedules.
- Working hypothesis for the rework: attachments deal no damage when they stick; the
  explosions carry the damage and detonate together at her burst; there is no separate tick
  stream. To be reconciled against the datamine and the reference simulator before an A/B.
- Confirmations from the same video: the additive Major-bracket structure re-verified exactly
  (crit/core/core-crit steps 1.5 / 2.0 / 2.5 outside Full Burst, 1.333 / — / 1.20 inside);
  Crown's Skill 2 flicker measured ×1.1233 as modeled.
- Rotation: the fight ran **12 full bursts against the sim's 10** (caster order exact all
  twelve, stage spacing ~0.5 seconds confirmed) — the fourth video confirming the sim's burst
  cycle runs about a second or more too slow, and this one shows the gap is larger than the
  camera-focus gauge arithmetic alone.
- A new lead for the auto-core-rate question: her bullet core-hit popups switch on and off in
  multi-second phases — core exposure behaves like boss-state windows, not a constant rate.

## RRH PROBE BATCH — RESULTS (2026-07-14, docs/probes/rrh probe)

Six recordings processed (three rapi-focused fights, one Snow White: Heavy Arms focus, the
MiKa fight, wind-weak team one — see below for the last one's pending grade). Rotation
scorecard first: **every counted fight matched the sim's full-burst count and caster order
exactly** — the MiKa fight (11, including the manual-first Mint/Prika convention), fire-weak
team one (13), iron-weak (13), elec-weak (12), wind-weak team two (13). Two boundary comps ran
one burst OVER prediction (water-weak 14 vs 13, fire-weak team two with Snow White focused
14 vs 13) — both explained by the burst-cycle timing finding below. Nine fights are now
pinned as measured rotation asserts.

### Snow White: Heavy Arms — Fully Active mode measured, and landed

Her seven burst windows settled the open uses-versus-time question: the mode ends when her
SECOND swapped shot fires (observed at anywhere from +6.2 to +7.7 seconds — twice beyond the
old 6.5-second timer, still delivering), and her Charge/Sequential buffs are held per swap
round. The engine now models both (a shots-based swap end and a "while swapped" buff gate).
Her gauge contribution when camera-focused is large and visible on the bar as +15–44% jumps
per charge volley — the owner's observation confirmed: her 7-hit full charges each generate,
all multiplied by the focus bonus.

### The burst-cycle timing finding (the next rotation increment)

The recordings decomposed the between-bursts period frame by frame: the gauge refills to full
in ~1.5–3 seconds (comp-dependent), the chain then opens and the three stage casts take a
constant ~1.5 seconds — real banners land ~3.0–3.4 seconds after the previous window ends.
The sim inserts a fixed 3-second delay BEFORE refill/chain-open, putting its minimum at ~4.5
seconds — about a second slow per cycle in refill-bound teams, which is exactly why two real
fights fit one more burst than predicted. In cooldown-bound teams (the MiKa fight) the error
runs the other way (~half a second slow in reality, with the in-game timer freezing ~0.6s
during each burst cut-in). Fixing this touches a measured constant, so it gets its own
increment with the bar traces as the superseding measurement.

### Rapi: Red Hood — the projectile-pipeline reads

The three focused recordings (neutral, native-advantage, and Skill-2-advantage bosses)
overturned the sim's model of her kit and are being synthesized into a rework:

- Her big banner popup is constant within a fight (25.1M / 27.9M / 32.0M by comp) but NOT a
  fixed payload: in the fire-weak fight one instance landed as a crit (×4/3) and the first
  banner had NO instance (she had fewer than 120 shots fired — under one sticky charge).
  Current best identification: her 2808% burst nuke, a single crit-able missile landing
  ~0.4 seconds after the banner at the full in-window buff state, possibly requiring a
  sticky charge.
- Her sticky payouts never core, never pop outside her own burst windows, follow the
  120-shot cadence, and land at projectile-arrival time (payouts continue during reloads).
- Her burst's +421% attachment buff is measurably inert on every visible class.
- Her run-to-run totals vary ±5–9% between real runs (core-exposure phases are visibly
  random) — grading tolerance for her should be wider than the standard band.

### The MiKa fight — the sniper family's cold cluster is SOLVED (a config bug)

~~Prika's reads suggested the sim under-counts her instances ×1.6 (a cadence bug like
Jill's).~~ SUPERSEDED (2026-07-14, same day) — the follow-up audit showed that comparison was
an artifact, her charge cycle is modeled correctly (the ~250% charge display is the known
release latency), and the real culprit was a **mode-string mismatch: Mint had been silently
running SOLO mode** (the lab passed a mode name her override doesn't define), halving her
duet buffs for the entire team. With the fix, the MiKa fight's board jumps 25–41%: Anis: Star
1.00, Red Hood 0.91, Prika 0.89, Mint 1.05, Alice 1.10 — and the full-burst count still
grades 11 exact. The historical "run A residual" was substantially this bug.

Remaining from the same audit, held for a measurement: Prika's kit text grants her Pierce
continuously but she carries no Pierce tag in the sim (her own 13% pierce buff and Mint's are
discarded). Adding it would push her past 1.0 on the fixed baseline while already-tagged
Alice reads 1.10 hot — so the tag is held pending a popup read from the existing MiKa video
(her value should step +16–33% during Mint's pierce window if the tag is live in-game).
Mint's total also swung −10.9% between real runs (high run variance, like Nayuta and Rapi:
Red Hood).

## RESULTS (2026-07-14, 714 noon probe — nine testing-request teams)

Full team recordings (screenshot + video) for nine testing-request compositions, in
`docs/probes/"714 noon"` (per-team detail table in that folder's `probe.md`). Scored in
`scripts/experiment.ts` as comps N1–N10. Standard scope-lock conditions. Camera focus for the
grade was defaulted to the middle slot; full-burst counts were read from video by the golden
burst-sequence yellow-splash scan (fps=4, 64×30 downscale, ≥0.11 yellow fraction, ≥10-second
minimum gap to reject cut-in echoes) and cross-checked for cadence uniformity.

These teams were built to exercise units the owner does not field in the graded board, so most
of the 45 unit readings are first-ever measurements of untuned kits — the batch median is 1.04
but the spread is wide (mean absolute error 0.21, 42% within ±10%). The value here is the
coverage and the tuning targets it surfaces, not the aggregate.

### Full-burst rotation — six of nine measured-exact

Exact (real equals sim, cadence uniform): the Rapi/Quency wind team (13), the Scarlet/Liberalio
iron team (10), the Mihara/Maiden wind team (11), the Emma/Eunhwa duo fire team (9, metronomic
20-second cadence like the earlier Emma/Eunhwa duo), the Red Hood/Elegg electric team (12), and
the Milk/Phantom electric team (6, a slow ~34-second cadence).

Off by one, both directions and both consistent with the open burst-cycle timing increment:

- The Anis:Star/Privaty/Snow White:Heavy Arms fire team measured 12 versus sim 11 — real fits
  one more burst, the same refill-bound "sim runs ~1 second slow per cycle" effect already seen
  on the two 14-versus-13 fights.
- The Dorothy/Nayuta/Neon:Vision Eye electric team measured 10 versus sim 11 — sim one fast; the
  real cadence is a steady ~17.5 seconds.

The anomaly: the D:Killer Wife/Naga/Modernia/Chisato/Ein wind team measured **≥10 full bursts
versus sim 8** — a large under-count. Its measured cadence has two ~25-second stretches that may
hide additional bursts, so real is 10–12; either way the sim is short by at least two on a
refill-bound Modernia-focused team. This is the biggest rotation miss in the batch and belongs
to the burst-cycle timing rework rather than a per-unit fix. Whether the middle-slot focus
assumption (Modernia) matches the recorded camera focus should be confirmed when that increment
is worked, since focus drives gauge generation and therefore the count.

### Per-unit tuning targets surfaced (sim/real)

Hot, sim over-predicts:

- **Vesti: Tactical Upgrade 3.23** — the standout. Her burst damage bucket is blown out
  (761M sim total on 544 burst-bucket instances against 235M real). A brand-new unit; her kit
  is mismodeled and needs an override pass before she is trustworthy anywhere.
- **Arcana: Fortune Mate 1.88 and Privaty 1.58** — both hot in the same fire team; Arcana's
  normals bucket (439M) is the driver. Privaty likewise reads far over.
- **Snow White: Heavy Arms 1.33** here (she has graded near 1.0 elsewhere — team- or
  focus-dependent, worth a look), Scarlet: Black Shadow 1.31, and in the Milk/Phantom electric
  team both Little Mermaid (1.27) and Phantom (1.28) read hot.

Cold, sim under-predicts:

- **Dorothy (base) 0.62** — the coldest reading; her plain-Dorothy model is well short.
- **Maiden: Ice Rose 0.69** — cold here, which sits against the standing conservative
  lower-bound note for Maiden; the two contexts should be reconciled.
- Milk: Blooming Bunny 0.73, Soda: Twinkling Bunny 0.77, Quency: Escape Queen 0.77.

### Tuning applied from this batch

Every focused (middle-slot) unit was verified in the enikk top-100 supported set first, so each
read is meta-valid. Two focused hot units were taken into popup-read tuning increments:

- **Scarlet: Black Shadow — LANDED.** Her N3 popup read showed her charged-normal value is
  correct (1.55M measured vs 1.60M sim), localizing her long-tracked ~1.23 heat to the proc set.
  Her proc-cadence blend (all three procs every 6 shots) over-credited the burst-window
  tripling; a sweep across both her fights lands hitCount 6→10, moving T1 1.18→1.00 and N3
  1.31→1.07 with zero teammate/full-burst blast radius (her procs are self-damage that generate
  no gauge). Snapshots regenerated; verify green.
- **Guillotine: Winter Slayer — LOCALIZED, not refit.** Her burst DoT is level-11-scaled and
  grades accurate, so her Hero-Level auras and effective level are correct; the ~26% heat is
  uniform across both her comps and isolated to her normal fire. The near-infinite-uptime
  instantReload charfix was ruled out (removing it moves her only ~5%). The residual points to a
  datamined MG weapon parameter, which is not popup-readable and needs a reference-sim recheck —
  applying a blind normal scalar would violate the evidence discipline, so it is logged as a
  sharpened open item (open-questions U8) instead.

The cold reads were confirmations, not bugs: **milk-blooming-bunny 0.73** re-confirms the
accepted "poor auto-play ~0.7" DECISION, and **privaty 1.58** is already calibrated (0.97 on T4)
— her N5 heat is Arcana: Fortune Mate's team buff inflating the whole side (Arcana is unfocused
here, so not tunable from this batch). Media (nine screenshots + nine videos) is retained in the
probe folder; the per-unit ratio table lives in that folder's `probe.md`.

## Frame-comparison validations (2026-07-14) — buckets & crit on real popups

Using the new video toolchain (`scripts/probe/`: hit-values, frames, classify, parsed) on existing
recordings, to confirm mechanics rather than tune units.

**Multiplicative bucket model — CONFIRMED (maiden solo, docs/probe-data/maiden-solo.json).** Fielded
alone (no Full Burst, no buffs) maiden's values are fixed, so the bucket math is exact. Her damage
rider (547.62%) reads non-crit **437,296** and crit **655,945** = **×1.5000 exactly** → the crit
multiplier is a clean ×1.5, and her rider CRITS (matches ginmy's DoT test; the engine already crits
flatDamage procs). Cross-hit-type check: (proc real ÷ proc sim) = 437296/463341 = **0.9438**, and
(normal-core real ÷ normal-core sim) = 244753/(129665×2) = **0.9438** — IDENTICAL across a proc and a
cored normal. That coincidence only holds if crit (×1.5), core (×2) and the base are INDEPENDENT
MULTIPLICATIVE buckets (an additive/interacting model would give different factors per hit type). So
the multiplicative-bucket formula is validated on real data.

**Maiden-ice-rose value check — CORRECTED, no error (methodology note).** A first pass claimed her
values read 0.944× (6% over); that was WRONG — it compared a mid-fight real popup to the sim's
crit-EXPECTATION value (463,341 = non-crit 431,015 × 1.075, the expected-value-mode form that folds
crit rate in), not the non-crit INSTANCE. Against the correct non-crit sim value (Monte-Carlo mode):
proc non-crit 437296/431015, proc crit 655945/646523, normal-core 244753/(120618×2) — ALL = **1.0146**,
a uniform ~1.5% UNDER, inside the ±3% noise floor. So her per-hit VALUES are correct; her only real
deficit is proc CADENCE (~0.68 fire frequency, comp F). Lesson (reinforces probe-processing): compare
popups to the NON-CRIT single-instance value, never the DBG expected-value line (which pre-folds crit).

**Auto core-hit is weapon-dependent — CONFIRMED (per-weapon scan).** Red "CORE HIT" fraction of NORMAL
popups across focused recordings: MG (crown), SR (liberalio), RL (maiden) core ~near-100%; AR
(snow-white), SMG (little-mermaid) mixed ~0.7-0.9. Drove the AUTO_CORE_RATE weapon-indexed refit
(MG/SR/RL=0.95, AR/SMG/SG=0.85; DECISIONS + open-questions A15).

## Shotgun range-landing corroboration — Guilty + Brid: Silent Track solo reads (2026-07-16)

Pre-registered corroboration campaign for the Isabel finding (her solo read implied the shotgun
landing table is too high at range). Both new videos are owner solo recordings on the standard
scope-lock basis, processed with the same damage-counter reconciliation method (every damage
instance detected by per-frame counter differencing at 60 fps; every counter value read; the sum of
per-event deltas closes to the end-screen total exactly, to the digit, on both videos). The plan,
its hypotheses, per-band predictions, and the pre-committed decision rule were approved by the
pre-operation judge before processing (six required revisions, all executed); the results were
assessed by an independent blind post-operation judge. Archived plan:
`docs/handoffs/2026-07-16-sg-landing-prereg.md`.

**Guilty** (`guilty`, Wind shotgun Attacker) — end screen 71,581,952; 185 landing shots; zero full
bursts (lone Burst II). Every delta sits on an integer pellet lattice, which resolved her kit live:
her Skill 1 ("Duplicate 8.81% ATK of the ally with the highest ATK") DOES self-apply solo,
refresh-all stacking to the ×1.4818 five-stack plateau, and her Skill 2's "increases stack count of
buffs by 1" demonstrably bumps Skill 1's stack count. Per-band magnitude (buff-corrected): mid 0.99,
near 1.15/1.13, far 0.75, mid-far 0.94. Direct pellet counting at near reads ~8.1 of 10 pellets
landing (0.81, not the table's 0.90). Record: `docs/probe-data/guilty-sg-band.json` (+ the
per-event companion file).

**Brid: Silent Track** (`brid-silent-track`, Fire shotgun Supporter) — end screen 74,592,500; 215
landing shots + 43 Skill 2 riders (exactly one rider per five trigger pulls, measured fixed values
673,819 non-critical / 1,010,728 critical — exactly 675.00% at her measured attack term). Per-band
magnitude: mid 0.98, near 1.22/1.37 (landed pellets 8.5 vs 9.4 of 10 tracking visible boss
proximity), far 0.71, mid-far 0.87. Record: `docs/probe-data/brid-silent-track-sg-band.json`
(+ the per-event companion file).

**Outcome (two-of-two judgment: LOG — no engine change).** The pre-registered split branch fired:
Brid: Silent Track corroborates Isabel's far-band value almost exactly (0.709 measured vs 0.710
predicted — two clean anchors agree far landing is ~0.66 for them), but Guilty reads as the CURRENT
table shape times a flat ~0.91 unit factor, and near-band landing proved variable per unit and per
position (0.81–0.94). Conclusion: shotgun pellet landing is per-unit, and a single class table
cannot serve every shotgun unit to ±3%. The engine table stands; a far 0.75 → ~0.66 candidate is
staged pending a third clean anchor. Live continuations: open-questions U17 (per-unit landing) and
U18 (all three reads measured the in-fight attack term ~+1.6% above the scope-lock static value —
same direction, two unit classes, confirmed two independent ways on Brid: Silent Track).

## Shotgun accuracy-circle geometry campaign (2026-07-22) — drawn-geometry tracings, pellet markers, replication

Three new measurements landed, all owner-sourced, all recorded in `docs/probe-data/`:

- **Drawn-geometry tracings** (`sg-drawn-geometry.json`): the owner traced, on native-resolution
  frames, the boss silhouette + core (blanc solo recording, near band) and the grey aim circle at
  Hit Rate 0 (Brid: Silent Track solo) and Hit Rate 38.91 (Soda: Twinkling Bunny control) — circle
  radius 79.3 px → 48.2 px, a 39% shrink, weapon-matched shotgun pair. Cross-validated three ways
  (machine Hough fit of the disc edge 48.5–48.6 px; the engine's bloom-peak calibration 81 px; the
  old near-core 31 px figure matching the fresh 32.2 px diameter). Pins the circle law
  R(hr) = R₀·(1 − hr/100).
- **Machine-read pellet markers** (`sg-pellet-marker-radial.json`): the aim-disc pellet markers
  (owner ruling: white circle = pellet hit, red = pellet core hit, one per landed pellet) machine-read
  across the burst-2 near window of the Soda: Twinkling Bunny control video — 101 per-pellet radial
  positions. The live centered-Gaussian pellet distribution is refuted directly (KS 0.376 vs critical
  0.135); uniform-per-area sits at the acceptance boundary. Machine per-shot counts reproduced the
  owner's hand-count structure (the unique 3-core shot in position), which also settled that the
  counted near window was burst 2.
- **Mid-far replication window** (`soda-tb-midfar-replication.json`): owner hand-count of an
  independent mid-far Hit-Rate-ON window (18 shots, 720-kit-audit video) scored against
  pre-registered predictions — core 0.0296 vs predicted 0.0354, landing 0.750 inside the predicted
  band. The former mid-far outlier did not reproduce.

These fed the gated `/scientific-method` UNIGEO pass (uniform-in-circle geometry rework) — decision
**LOG** (see `docs/handoffs/scientific-method-harness.md` 2026-07-22): model record accepted by both
judges, no engine change, cone stays live, follow-ups recorded.

## `privaty` u7 focus video — the 1687% rider IS present, and it takes Full Burst (2026-07-23)

**Owner-sourced frame read**, `docs/probes/probe u7/priv focus vid.MP4` @ **15.503 s** (video clock;
game clock 02:49, so ~11 s into the fight). One popup stack on the same frame:

| popup          | colour         | identification                        |
| -------------- | -------------- | ------------------------------------- |
| 571,999        | red "CORE HIT" | normal-attack core hit                |
| 367,714        | white          | normal attack                         |
| **37,871,391** | white          | **the 1687% Designated-Target rider** |
| 5,750,750      | white          | the 256.17% last-bullet rider         |

**Digit provenance:** first read as `37,071,391`; the `8` is occluded in this frame by an overlapping
marker. Owner re-read it as **37,871,391** on a cleaner frame, and the arithmetic is independently
decisive — `37,871,391 / 5,750,750 × 256.17 = 1687.00`, i.e. exactly the datamined coefficient, where
the `0` reading would imply a non-kit 1651.36.

**What it establishes** (all three from this one stack):

1. **The rider FIRES in the u7 comp.** `privaty.json`'s note records it as _"ABSENT in a confirmed
   Privaty-burst Designated window (whole-screen check, no ~25-38M popup)"_. That whole-screen check
   MISSED it — 37.87M is inside the very band it searched, but occluded. **The "1687 is
   COMP/CONDITION-DEPENDENT (T4 yes / u7 no)" puzzle therefore has no mechanism behind it**: it fires
   in both, and the open question "what makes the 1687 fire in T4 but not the u7 comp?" is answered by
   a missed popup, not by a Designated-Target gate difference across comps.
2. **It takes the +50% Full Burst major.** The 256.17% rider's FB-inclusive 5,750,750 is 1.5015× its
   recorded non-FB value (3.83 M), so this frame is inside a Full Burst; the 1687 popup is 6.58547× it
   against a kit ratio of 1687/256.17 = 6.58547 (5 dp). Same frame, same multiplier state ⇒ the 1687
   received every major the 256.17 did. **The shipped `noFb: true` on that block is refuted.**
3. **It is not a DoT.** It lands in the SAME frame as the last-bullet 256.17 rider and shares its exact
   buff snapshot — consistent with the kit text (_"Activates when the last bullet hits a target in
   Designated Target status"_), inconsistent with the shipped `intervalSec 3` DoT encoding.

**NOT ENACTED.** n=1 frame; this records the observation only. The re-encode (burst-cast `dot` → a
`lastBullet`-triggered `flatDamage 1687` gated on `requiresTargetStatus: 'Designated Target'`, with her
burst applying the status, and `noFb` dropped) is board-moving on a graded unit (0.971) and needs its
own gated pass. The primitive it needs now exists (DECISIONS 2026-07-23).

## BASE-WEAPON BASIS — first scoring (2026-07-23, `docs/probes/clean-weapons/`)

The clean-weapon six recorded as two teams of three, scope lock, **boss Iron** (owner-confirmed —
the only element neutral for all six), core 100, **bursting turned off in game**, per-unit rarity
ceilings (`idoll-ocean` 0★/core 0, `claire` 2★/core 0 — they are not SSR). Basis + rationale:
`docs/data/clean-weapons.md`; sim side pinned in `scripts/tests/units/clean-weapons.test.ts` (CW5).

Sources: `marciana-folkwang-snowcrane.jpg` / `emma-claire-idollocean.jpg` (+ the two MP4s, not yet
processed). Damage = the Battle Records damage row; the ⚔ column is Combat Power, NOT ATK.

| unit          | wpn | sim        | real       | sim/real    | \|err\|   | board mean for the class |
| ------------- | --- | ---------- | ---------- | ----------- | --------- | ------------------------ |
| `snow-crane`  | SR  | 29,018,296 | 29,430,776 | 0.986 ▼     | 1.4%      | 0.973                    |
| `emma`        | MG  | 58,117,326 | 59,498,961 | 0.977 ▼     | 2.3%      | 0.942                    |
| `claire`      | RL  | 24,044,093 | 23,474,178 | 1.024 ▲     | 2.4%      | 0.967                    |
| `folkwang`    | AR  | 23,911,667 | 25,017,504 | 0.956 ▼     | 4.4%      | 0.965                    |
| `marciana`    | SG  | 35,163,154 | 41,724,144 | **0.843 ▼** | **15.7%** | 0.875                    |
| `idoll-ocean` | SMG | 23,577,817 | 20,217,421 | **1.166 ▲** | **16.6%** | 1.058                    |

3/6 inside ±3%; median |ratio−1| 4.4%. Every reading matches the DIRECTION of its weapon class's
board mean, which is the whole-picture check on the basis itself.

**WHAT THIS LOCALIZES — the reason the basis exists.** None of the six has an override and their
kits contribute zero damage, so neither outlier can be override calibration debt. Both sit in the
WEAPON MODEL:

1. **SG.** The SG re-tune thread attributes the SG gap to overrides calibrated against the pre-UNIGEO
   landing table. `marciana` carries no override and is still 15.7% COLD, inside the documented
   12–24% landing-debt band ⇒ a large share of that gap is the LANDING MODEL, not override debt.
2. **SMG.** The `liter` 1.208 thread inferred an SMG weapon-model error from kit-carrying units
   (`chisato` 1.15, `quency-escape-queen` 1.17). `idoll-ocean` reproduces it at **1.166 with no kit
   at all** — the independent-method confirmation that thread lacked.

**NOT ENACTED — n=1 per unit, one run per team.** Single-run repeatability is 0.5–3.5%/unit, so the
three green readings are within noise of exact and `folkwang`'s 4.4% is marginal; only the two 15%+
signals are unambiguously outside noise. Nothing here changes a constant, a default or a board value.
Element confound is excluded by construction (an unmodeled advantage only ever INFLATES real, so it
cannot produce a HOT reading) and by the owner's Iron confirmation. Next step to isolate WHICH part
of the SG/SMG models is off: `/probe-processing` on the two MP4s (cadence, reload timing, per-popup
values) — the totals establish that the models are wrong, not where.

### SMG CADENCE — measured 20 rounds/s, not 24 (2026-07-23, same recording)

Isolating WHICH term of the SMG weapon model is wrong, from `idoll-ocean`'s 1.166 HOT above.

**MEASURED.** Ammo counter (the designated shot clock), `idoll-ocean` focused:

| window        | band | ammo readings               | rounds       | rate   |
| ------------- | ---- | --------------------------- | ------------ | ------ |
| t=60.0→62.0   | mid  | 076 → 066 → 056 → 046 → 036 | 10 per 0.5 s | 20.0/s |
| t=145.0→145.5 | far  | 020 → 010                   | 10 per 0.5 s | 20.0/s |

Dead linear, two separate range bands. **The sim uses 24/s.**

**MECHANISM — why 20 and not 24.** 1440 rpm = 24/s = **2.5 frames/shot at 60 fps**, and a full census
of the datamined `rate_of_fire` shows **SMG is the ONLY weapon in the roster that is not a whole
number of frames**: AR 720→5f and 150→24f (`jill`), MG 3600→1f, RL 60/90/120/180/300→60/40/30/20/12f,
SG 90→40f, SR 60/200→60/18f. Quantizing 2.5 up to 3 frames gives **exactly 20.0/s** — the measured
value. The datamine is authoritative for the NOMINAL rate; the gun still fires on frame boundaries.
This is why SMG is the only weapon class whose board mean sits above 1.0.

**A/B (`SMGQUANT=1`, isolated worktree).** Confirmed on five further units the measurement never saw:

| unit                                                           | 24/s      | 20/s      |
| -------------------------------------------------------------- | --------- | --------- |
| `idoll-ocean` (the measured unit — no override, no damage kit) | 1.166     | **1.018** |
| `chisato`                                                      | 1.154     | **0.975** |
| `quency-escape-queen`                                          | 1.174     | **1.046** |
| `little-mermaid`                                               | 1.042     | **0.967** |
| `nayuta` (kit-dominated ⇒ cadence barely matters)              | 0.861     | 0.854     |
| `liter` (control suite, Tier-0)                                | **1.208** | **1.031** |
| `helm` (control suite)                                         | 1.042     | 1.017     |

`liter`'s per-comp spread tightens [1.222 1.183 1.252 1.174] → [1.039 1.000 1.067 1.019];
board-read ±5% 10→13, "worse" 26→25. **All 11 measured full-burst assertions pass in BOTH arms.**

**This retires the 2026-07-17 premise.** That adoption (role-audit D.2, owner decision a) took 20→24
because 24 "holds every SMG measured-FB comp". Under the current rotation model FB counts no longer
discriminate 20 from 24 at all — that session had only FB counts as an instrument, and FB counts
measure gauge/SECOND while the ammo counter measures shots/SECOND. A joint arm scaling SMG gauge by
24/20 was built and proved UNNECESSARY (FB counts hold without it), so it was dropped rather than
shipped as a dead knob.

**NOT ENACTED — shipped `SMGQUANT=1` opt-in, default unchanged and byte-identical.** Flipping the
default turns 6 unit tests red. Five are FB-count DISCRIMINATION assertions whose vehicle is `liter`
(an SMG): at 20/s the two arms of each tie, so the fixture stops discriminating — fixture rebuilding,
not an engine fault. **The sixth is NOT understood:** `modernia` (MG) begins showing a 10-round ammo
spend per pull in `hits-per-shot.test.ts`. The likely cause is `liter`'s _"Max Ammunition Capacity
▲45.17%"_ proc retiming so its refill lands inside a measured pull-pair window and slips past that
test's `d <= 20` exclusion filter — **hypothesis, not a verified explanation.**

> **ENACTED (2026-07-23) — flipped default-ON, `SMGQUANT` retired, revert is `SMGRATE=24`
> (DECISIONS 2026-07-23).** All six red tests were resolved without silencing anything. The
> `modernia` failure was root-caused (the above hypothesis was CLOSE but WRONG on mechanism): it is
> not `liter`'s ▲ refill landing in the pull pair, but `modernia`'s OWN S1 _"Max Ammunition ▼5.04%"_
> re-landing on a pull frame and clipping the belt overhang that `liter`'s already-EXPIRED ▲ left
> over-cap — delta 10 = 8-round clip + 2-round spend. The test's exclusion was re-keyed from the
> `d≤20` magnitude fudge to the clip's CAUSE (a `maxAmmoPct<0` buffApply on the pull frame) plus a
> positive decomposition assertion; MG ammo economy is byte-identical between the two cadence arms.
> The five FB-count discriminations were rebuilt on non-SMG / gauge-rich vehicles (each
> mutation-verified to still fail when its mechanic breaks). Gated through `/scientific-method`
> (5-premise CONFIRM, Fable pre-op + blind post-op 2-of-2 ACCEPT HIGH+HIGH, implementation review).
> `SMGRATE=24` reproduces the pre-flip snapshot byte-identically (leakage control clean).

⇒ **THE GATED PASS MUST EXPLAIN THE `modernia` MG SPEND FIRST**, then rebuild the five `liter`-vehicle
discriminations on a non-SMG vehicle, then flip the default with regenerated snapshots. Regenerating
snapshots around an unexplained failure is exactly what the verify discipline forbids.

### SG SIDE — the cold-read is the PELLET-LANDING term (2026-07-23, `snowcrane-folkwang-marciana.MP4`)

Re-recorded so `marciana` (SG/Iron, exact slug `marciana` — NOT `marciana-marine-study`) sits in slot
3 = camera focus, making her popups readable (the original `marciana-folkwang-snowcrane.MP4` has her
unfocused). This is an **independent second run**, so it re-scores every unit — first `n=2` for any
clean-weapon unit. Parse persisted: `docs/probe-data/marciana-sg-band.json` (+ catalog).

| unit         | wpn | sim        | real (run 2)   | ratio       | run 1 |
| ------------ | --- | ---------- | -------------- | ----------- | ----- |
| `snow-crane` | SR  | 29,018,296 | 29,571,250     | 0.981 ▼     | 0.986 |
| `folkwang`   | AR  | 23,911,667 | 24,626,087     | 0.971 ▼     | 0.956 |
| `marciana`   | SG  | 35,163,154 | **41,392,267** | **0.850 ▼** | 0.843 |

**The gap reproduces** — `marciana` 0.843 → 0.850, only 0.8% run-to-run (repeatability is 0.5–3.5%),
so the 15% SG cold-read is real signal. (⚔ reads 88364/92177/91943 — three different numbers for
three Supporters, the standing confirmation that ⚔ is Combat Power, not the class-uniform ATK.)

**Localized to the SG PELLET-LANDING model by ELIMINATION** (this is the deliverable — WHICH term):

1. **ATK basis — RULED OUT, pinned exact.** Popups are **one per landed pellet** at exact lattice
   steps `u = baseAtk·normAtkMult/100/hitsPerShot/10`. Five popup values across both bands —
   near `26149`/`36207`/`46264` (= 13u/18u/23u = plain/crit/core, range bonus on) and far
   `20115`/`30172` (= 10u/15u, no range bonus off-near) — **all give u = 2011.47** (spread 0.002%),
   i.e. the in-fight ATK term is **+0.23%** above the sim's `u_sim = 2006.82`. ATK is not the gap.
2. **Cadence — RULED OUT, = sim.** Ammo counter (mag 9) steps every **40 game-frames** = the sim's SG
   interval exactly. As predicted, the SMG frame-quantization cannot apply (90 rpm = 40 frames exactly).
3. **Crit — RULED OUT.** Fixed 15% stat; the orange-`36207`/`30172` popup fraction matches.
4. **Core — RULED OUT as the driver.** Red "CORE HIT" popups are **rare** across every window — nowhere
   near the ~5× rise (near core 4.3% → ~29%) a core-driven gap would require.
5. **⇒ LANDING is FORCED to absorb the gap.** With ATK/shots/band-split/crit/core all held, the
   17.7% real/sim excess (real units = 41,392,267/2011.47 = 20,578 vs sim 17,521) means real
   pellet landing must be **~8.45/10 mean vs the sim's 7.18**. It concentrates at the LONG bands,
   where the sim's silhouette-gap model drops pellets — sim per-band landing (engine event log,
   4 signatures matching the documented boss band script): **near 8.13 / mid 7.13 / midfar 6.57 /
   far 6.07**. A physically clean story: pellets keep landing on the large boss at range instead
   of flying through gaps.

**What could NOT be measured, and why (open follow-up).** The **exact per-band landed-pellet count**
is defeated by NIKKE stacking per-pellet popups nearly on top of each other (an isolated near-band shot
reads ~7–9 whites, indistinguishable from the sim's 8.13; a far-band shot reads a dense stack but not a
clean integer). The SG gold-standard fix — the pellet lattice on the running-total **delta** — is
unavailable here because the mid-fight team DAMAGE counter mixes all three units. **Exact landing needs
a SOLO `marciana` recording** (single-unit running total → per-shot delta on the lattice). Filed U35.

**NOT ENACTED — n=2, measurement only.** Records the localization; does not flip a constant, retune an
override, or stamp a verdict (that is a separate `/scientific-method` pass, not this session — evidence
rule). ⇒ The live consequence for the SG re-tune thread: a pure override re-tune would be fitting
overrides to absorb a **weapon-model** landing error, so the landing model is the thing to fix first.

## Probe reader build-out — instrument validation (2026-07-24, `docs/probes/` re-scored)

Not a fight measurement: this validates the new READER SCRIPTS against Full-Burst counts that were
already measured independently, so later runs can trust their output. Plan:
`docs/handoffs/2026-07-24-probe-reader-buildout-plan.md`.

### What the burst-gauge crop actually renders (corrects the state vocabulary)

The 188×82 crop at (2428,448) does **not** show a filling burst gauge. Measured frame-by-frame on
`docs/probes/probe u7/13 fb count wind weak vid.MP4`, it shows two things and is otherwise absent:

1. the burst CHAIN, as coloured stage hexagons at the crop's left edge, ~0.4 s each — green "I",
   yellow "II", red "III" — the red one immediately preceding the Full Burst;
2. the FULL BURST WINDOW, as a magenta bar that resets to ~96% at the burst and **drains
   monotonically to zero** over ~8.5 s of rendered width. Two consecutive windows on that recording:
   13.8→21.8 s and 26.4→35.0 s, both peaking at 0.96 fill.

That drain is the owner's "blinking, draining red bar with NO numeral". The burst gauge CHARGING is
not in this crop at all, so the CV classifier emits no `filling` state — the VLM classifier emitted
one only because the prompt offered it as an option.

Rendered widths are ~8.2 s for a nominal 10 s window (the bar's last stretch is too narrow to
register a column), so window DURATIONS are comparable to each other but are not an absolute
Full-Burst duration measurement.

### Full-Burst counts — `scripts/probe/scan.ts` vs measured truth

Three detectors, merged: the drain window (spine), the whole-frame golden splash (independent screen
region), and the stage-3 hexagon. ~12 s per whole video, one ffmpeg decode, no model anywhere.

| recording                                   | measured FB               | scan.ts | corroborated |
| ------------------------------------------- | ------------------------- | ------- | ------------ |
| `probe u7/13 fb count wind weak vid.MP4`    | 13                        | **13**  | 13/13        |
| `probe u7/12 burst count elec weak vid.mov` | 12                        | **12**  | 12/12        |
| `rrh probe/mika t255 11fb vid.mov`          | 11                        | **11**  | 11/11        |
| `rrh probe/team 1 t256 burst 13fb.MP4`      | 13                        | **13**  | 13/13        |
| `rrh probe/team 2 t257 burst 14fb vid.MP4`  | 14                        | **14**  | 14/14        |
| `rrh probe/team 3 t256 burst 13fb vid.MP4`  | 13                        | **13**  | 13/13        |
| `rrh probe/windweak t257 13fb.mov`          | 13                        | **13**  | 13/13        |
| `control + carry/soda tb control.mov`       | 10 (owner countdown read) | **10**  | 10/10        |

**Exact on 8 of 8.** Per-detector recall: drain window 8/8 exact, splash 7/8 (it under-reads on a
washed-out background), stage-3 hexagon ~80% (a screen-wide colour wash hides it).

**The VLM classifier's failure is reproduced and bounded.** On the `control/lm.MP4` window
(t=5, 30 s) where `read-burst-gauge.ts --classifier vlm` had reported **six** transitions into
`full` — impossible, since a Full Burst is a 10 s window and they are 13–34 s apart — the CV reads
**2**, gap 14.0 s. Over the whole of `lm.MP4` the CV finds 13 uniformly spaced windows
(12.8–17.0 s apart, 8.0–8.6 s each, peaks 0.94–0.96) while the splash detector catches only 5 of
them; the merge reports the disagreement rather than hiding it.

**Correction to a documented premise:** the "team burst bar" (`crop=200:14:2420:478`) and the
"solo/2-unit BURST meter" (`crop=142:12:2470:488`) are SUB-STRIPS of the gauge crop (which spans
x 2428–2616, y 448–530). They re-measure the same drain bar at coarser granularity, so they were
never an independent second instrument, and their documented "≥95%→<50% drop" fires when the drain
crosses half rather than at the burst (27 such drops on a 13-Full-Burst recording). They are kept
as diagnostics and excluded from the corroboration count.

### Fire cadence — `scripts/probe/read-ammo.ts` vs the SMG hand read

Deterministic digit-atlas template matching inside the box the pellet counter's template track
already locates; it abstains on a weak glyph match rather than guessing, and discards any read that
breaks ammo monotonicity without a reload-sized jump.

On `docs/probes/clean-weapons/emma-claire-idollocean.MP4` (`idoll-ocean` camera-focused), in two
range bands: **20.31 rounds/s** (t=55–75, 5 firing runs) and **20.32 rounds/s** (t=120–140), every
run at r² = 1.00, individual runs reading 19.84–20.00/s. That independently reproduces the hand read
that settled the SMG cadence at 20.0 rounds/s (DECISIONS 2026-07-23) — a different instrument path
(atlas matching over 200 sampled frames) reaching the same number as the four-digit hand read.

⚠ **Gap:** small-magazine SG is not yet readable. `marciana-solo.MP4` yields a value on only ~29% of
frames and no usable firing run — her counter renders 1–2 digits rather than a 3-digit belt, and the
box template locks weakly (conf ~0.43 vs ~0.73 on the SMG footage). SG cadence still goes through
the pellet counter.

### Battle Records — `scripts/probe/read-battle-records.ts`

VLM read of the static end-of-fight screen, gated by an arithmetic checksum (per-unit damage must
sum to the independently-measured cumulative team total). **37 of 37 numbers exact** across two
screenshots: `clean-weapons/emma-claire-idollocean.jpg` (3 rows × 4 fields, checksum Δ 0.00%) and
`probe u7/13 fb count wind weak dmg.png` (5 rows × 5 fields). The ⚔ = Combat Power field map is
hard-coded and the script refuses to emit an `atk` field at all.

### Popup confidence — `read-popups-vlm.ts` (built, gate met VACUOUSLY)

Each deduped popup is now scored by how many of the LOOKS at its own time+position window agreed on
its value, plus hit-value band membership. Validation was 20 frames of `control/lm.MP4` (t=45–49)
against the hand read in `docs/probe-data/control-little-mermaid.json`.

The plan's ship gate — zero auto-accepted popups that the hand read disagrees with — is **met, but
vacuously: 0 of 30 popups auto-accept**, because `little-mermaid`'s bands overlap outright (normal
14,664–69,913, its crit image 21,484–87,858, its core image 36,660–174,782), so no value can pin a
class. That is the entanglement that probe's own notes describe.

Worth recording because it shaped the rule: the FIRST draft (agreeing looks + in-band only)
auto-accepted 4, of which **2 were bad** — a 10,818,572 read as "normal" whose only matching bands
were `skill:core`/`skill:crit+core`, and a 64,733 called "crit" when 64,733 is that unit's _non-crit_
normal. Both were caught by adding two conditions: the matched band variant must be reachable from
the reported class, and the value must match exactly one variant. ⇒ **The auto-accept path itself is
UNEXERCISED** and stays unproven until a focus unit with a clean band trips it.

### 2026-07-30 — raven solo burst-gauge fill timeline (settles U37)

`docs/probes/burst tests/Raven Solo Burst Gen.MP4` (raven, solo — no teammates). Read: ammo-counter
decrements (shot timestamps, 6-round RL mag) + the burst-gauge bar's fill percentage at each shot,
via a contrast-boosted crop read by eye (parsed record: `docs/probe-data/raven-solo-burstgen.json`).

Fill by shot: 1/~8.8s/~0%, 2/~11.0s/~15%, 3/~12.8s/~38%, 4/~14.8s/~67%, 5/~16.8s/~80%,
6(empties mag)/~18.2s/~89%, post-reload/~20.8s/~98%, 7/~22.6s/100% (chain visibly opens — green
stage-1 hexagon). Per-shot increment ramps (+15,+23,+29 over shots 2-4) then plateaus (+13,+9,+9) —
matching concurrent DoT-tick stacking building to her measured steady-state concurrency (~2.7-2.9),
not a flat single-instance rate. Cross-check on the damage side: her white popup value climbs in
clean ~82,012 steps (×1,×2,×3…) tracking shot count, while a separate red CORE HIT value (~367,175)
recurs unchanged as her actual weapon shot.

**Settles U37** (see `docs/answered-questions.md`): the engine's existing N-linear-per-concurrent-
instance dot-tick gauge behavior is the faithful one. The concurrency-gated "instance election" fix
that was judge-approved-but-LOGGED pending exactly this footage (`docs/handoffs/scientific-method-
harness.md` 2026-07-29) is REJECTED by this measurement and its isolated worktree
(`worktree-agent-aab3a19427393feb2`) discarded, not merged. n=1, percentages eyeballed not
pixel-measured — the ramp-then-plateau shape is the load-bearing part, not the exact numbers.

### 2026-08-01 — real-pellet filter-survival cascade, `marciana` (SG/Iron) f8–11

Answers §1 of `docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md`, whose decision rule was
committed to disk (`7bbc22b`) BEFORE this number existed. Instrument:
`scripts/probe/score-pellets.py --audit-fidelity-real` (committed, self-validating via
`--audit-fidelity-real-selftest` against `scripts/tests/fixtures/pellets/real-fidelity-slice.json`).
Source: the owner-drawn positions in `groundtruth-f8-11-positions.json` (42 distinct pellets,
6 shots) matched against the RAW pre-filter components `count-pellets.py --dump-detections` emits
from the CLEAN crops, at the same WHITE_LO 210 / 20px tolerance / `min_area` 25–750 /
`min_circ` ≥0.55 the synthetic `--audit-fidelity` path uses.

**Cascade: raw_found 97.0% → +min_area 94.6% → +min_circ 96.4% → BOTH 94.6%.** Per-instance
n=168 pellet-frame instances; per-distinct-pellet n=42, mean pass fraction 0.9464, SE 0.0160
(the honest SE — the 168 are pseudo-replicated, 4 frames per pellet). Strict "passes in all 4
frames" 33/42 (78.6%); lenient "passes in ≥1 frame" 42/42 (100%). Linkage f08→f09→f10→f11 was
1-to-1 on all 126 link steps, median inter-frame displacement 3.04px.

**The aggregate hides a step function — all 9 failures are at f11.** Per-offset BOTH: f08 100%,
f09 100%, f10 100%, **f11 78.6%**. Cause verified at the pixel level (independently re-probed
by the parent session, not only by the instrument): those pellets are still visibly present and
correctly marked, but have faded to a max channel value of ~199–209 against the WHITE_LO 210
mask, versus 218–229 for the same pellets one frame earlier at f10. Shots 2/4/5 are saturated
at 255 in both frames and lose nothing (100% rows); shots 1 and 3 carry every loss. The 9 split
into 5 that fade out entirely (no raw component) and 4 found-but-under-`min_area` (areas
16/12/9/13). This is a fade-out boundary effect at the last counting frame, not a uniform
filter defect.

**Which stage kills, as a fraction of raw-found (n=163): `min_area` 2.45%, `min_circ` 0.61%** —
both near-negligible on real pellets, and 5–28× smaller than the synthetic set's rejection rates.

Per the pre-committed rule, 0.946 falls in the **0.90–0.98 bucket**: real pellets survive the
settled filter, so the synthetic set's 71.6% both-pass is a property of the generator rather
than of the filter, and the `min_circ`-as-cold-bias-suspect branch does not open. The
independently DERIVED reference (0.925–0.98, centred ~0.93, back-derived from the real screen's
own bias arithmetic) is corroborated by an xy-matched pixel measurement — two unrelated methods
agreeing to within ~2 points.

RECORDS a measurement only. `FIDELITY_BOTH_PASS_FLOOR` (0.90), `min_circ`, `min_area` and the
plan's direction are untouched; swapping the floor from derived to measured is a separate
owner-gated pass. Scope limits, stated up front: **one clip, one unit — `marciana` (SG/Iron,
`docs/probes/clean-weapons/marciana-solo.MP4`), NOT `marciana-marine-study`** — and it does not
generalise to `noir` / `guilty` / `isabel` or to different lighting.

Two ⚑ observations surfaced by this pass, reported and NOT acted on:

1. The committed synthetic fixture `synthetic-fidelity-slice.json` (n=128) rejects 18.75% of
   found on `min_area` vs 7.03% on `min_circ` — **area-dominant, the opposite direction** to the
   handoff provenance table's "`min_circ` dominates, 17.2% vs 11.9% (n=120)" entry, which that
   table rates "Solid on direction". Different samples, so both can be true; but the one
   tool-pinned artifact does not corroborate that direction. Worth resolving before anything
   leans on `min_circ`.
2. 8/168 instances fall inside `center_exclude` 36 and 9/168 beyond `pellet_radius` 160 —
   ~10% of owner-marked pellets sit structurally outside the LIVE counter's windowing even when
   they pass the filter cleanly. The cascade applies no windowing (neither does the synthetic
   path, so comparability holds), but this is a separate cold-bias source downstream of here.

### 2026-08-01 — counting-WINDOW sweep on the 6 real `marciana` (SG/Iron) shots

Follow-on to the cascade entry above, whose flagged observation 2 (~10% of owner-marked pellets
sit outside the live counter's window) had two competing explanations that the cascade — which
applies no windowing at all — cannot separate: **H_radius**, the window is slightly too small
(supported by the overflow's tightness, max r=166.8), versus **H_centre**, the window is
mis-centred (per-shot pellet-cloud centroids sit 20–52px off the crop centre). A centroid-
recentring check was already tried and is inconclusive: it fixes shot 1 (max r 166.8 → 154.2)
but pushes shot 2 to r=204, because a 7–10-pellet sample centroid is too noisy to be the true
centre.

Instrument: `scripts/probe/score-pellets.py --real-fixture --real-positions --pellet-radius R
--center-exclude C` (committed this session; defaults unchanged at the live 160/36, and the
unflagged `--real-fixture` stdout/stderr were verified byte-identical to the pre-change script).
Ground truth: the owner's hand counts in `scripts/tests/fixtures/pellets/groundtruth-f8-11.json`
(0/7/10/8/9/8) plus the owner-drawn positions in `groundtruth-f8-11-positions.json` for
precision/recall. Every owner mark counts toward recall regardless of which side of the window
it sits on, so recall is comparable across cells. Full cross product, 6 cells:

| `pellet_radius` | `center_exclude` | shot0 | s1   | s2    | s3   | s4    | s5    | bias   | SD    | count RMSE | precision | recall | F1    | TP  | FP  | Δdetections |
| --------------- | ---------------- | ----- | ---- | ----- | ---- | ----- | ----- | ------ | ----- | ---------- | --------- | ------ | ----- | --- | --- | ----------- |
| 160 (live)      | 36 (live)        | 0.00  | 3.25 | 10.25 | 8.25 | 9.75  | 8.25  | −0.375 | 1.671 | 1.571      | 0.906     | 0.857  | 0.881 | 144 | 15  | —           |
| 160             | 24               | 0.00  | 4.25 | 10.25 | 8.25 | 9.75  | 8.25  | −0.208 | 1.269 | 1.177      | 0.908     | 0.881  | 0.894 | 148 | 15  | +4          |
| 175             | 36               | 1.00  | 4.75 | 10.75 | 8.25 | 10.75 | 9.50  | +0.500 | 1.449 | 1.414      | 0.853     | 0.899  | 0.875 | 151 | 26  | +18         |
| 175             | 24               | 1.00  | 5.75 | 10.75 | 8.25 | 10.75 | 9.50  | +0.667 | 1.080 | 1.190      | 0.856     | 0.923  | 0.888 | 155 | 26  | +22         |
| 190             | 36               | 1.00  | 4.75 | 12.50 | 8.25 | 10.75 | 10.25 | +0.917 | 1.758 | 1.848      | 0.807     | 0.899  | 0.851 | 151 | 36  | +28         |
| 190             | 24               | 1.00  | 5.75 | 12.50 | 8.25 | 10.75 | 10.25 | +1.083 | 1.411 | 1.683      | 0.812     | 0.923  | 0.864 | 155 | 36  | +32         |

True counts 0/7/10/8/9/8; TP/FP/Δ are per-frame instances out of 168 owner marks (pseudo-
replicated 4 frames per pellet, same caveat the cascade entry carries). The live cell reproduces
the fixture's documented bias −0.375 / SD 1.671 exactly.

**The decision rule (pre-committed before the numbers were read) selects the second branch:
widening the radius admits clutter FASTER than it admits pellets, and is not the fix.** Precision
does not stay flat — it falls 0.906 → 0.853 → 0.807 as the radius grows, and false positives more
than double (15 → 26 → 36) while recall gains stall. The added area does not explain it: the
annulus grows +20.6% (160→175) and +41.2% (160→190) in real crop pixels, but FP grows +73% and
+140%, i.e. the newly-admitted ring carries ~3.4× the false-positive density of the existing
window (0.70 and 0.64 FP per 1000px added, versus 0.196 per 1000px in the baseline annulus).
From 175 → 190 the trade collapses entirely: **+10 false positives and exactly ZERO new true
positives.**

**Shot 0 — the confirmed true-zero shot — reports 0 pellets at radius 160 and 1 pellet at every
widened radius, in both `center_exclude` cells.** That single detection is a false positive (TP 0,
FP 1), i.e. it is pure clutter picked up between r=160 and r=175. A widening that makes the
false-positive shot report a pellet is disqualifying on its own terms.

**The radial geometry independently points at H_centre, not H_radius.** Of the 9 owner marks
beyond r=160, **8 are in shot 1 alone** and the 9th is shot 5 at r=160.4 — 0.4px past the line.
Shots 2/3/4 have zero: their maxima are 159.2, 138.2 and 132.0. Under H_radius (the real spread
genuinely reaches r≈167) the overflow would be spread across shots; instead it is concentrated in
the ONE shot the earlier centroid check independently identified as off-centre, whose marks span
r=30.8…166.8 — the widest radial span of any shot, and the signature of a compact cloud
translated off the assumed centre rather than of a genuinely larger cloud. The same shot supplies
all 4 of the marks recovered by `center_exclude` 24 (its inner marks sit at r=30.8…36); shot 4's
4 marks at r=16.4…24 are inside 24 and are recovered by neither cell, so the maximum recall
reachable anywhere in this sweep is 164/168 = 0.976.

Corollary, recorded not acted on: `center_exclude` 36 → 24 is the one clean cell. It adds 4 true
positives and **exactly zero** false positives (precision 0.906 → 0.908), moves bias −0.375 →
−0.208 and RMSE 1.571 → 1.177, and its 2,256 added px carry no clutter at all.

Also corrected while measuring: `load_real_sequences()`'s docstring called the f8–11 crops
"a disc". They are not — `make-groundtruth-f811.py`'s `crop_disc()` slices a SQUARE
`im[y0:cy+rad, x0:cx+rad]` with no disc mask, so the 368×368 crop carries real image content out
to r=259.5 in the corners (29,080 px beyond r=184). A widened radius therefore admits genuine
scene/HUD content rather than running into a black margin, which is consistent with what the FP
column does.

Honest limits. **n=6 shots, SD 1.671, SE 0.682 — per the plan's own provenance table this fixture
can only FAIL a candidate, never certify one to ±0.25. This sweep is ELIMINATION, not
confirmation.** Only 5 of the 6 shots carry pellets. One clip, one unit (`marciana` SG/Iron, NOT
`marciana-marine-study` AR/Iron) — does not generalise to `noir` / `guilty` / `isabel`. RECORDS a
measurement only: `pellet_radius`, `center_exclude`, `FIDELITY_BOTH_PASS_FLOOR`, `min_area` and
`min_circ` defaults are untouched, no `DECISIONS.md` entry is edited and no plan direction is
rewritten. Landing any of these as a default is a separate, owner-gated pass in fresh context.

### 2026-08-01 — n=120 synthetic fidelity cascade, independent re-run

Closes the gap the plan's own provenance table recorded against its strongest row: the n=120
cascade was rated "Strong, tool-pinned" while the same row noted the judge had **never
independently re-run this exact configuration**. Re-run here on
`scratchpad/pellets/synthetic-v3-n120/labels.json` (120 sequences, 30 each from `marciana`
(SG/Iron), `noir`, `guilty`, `isabel`) via `score-pellets.py --audit-fidelity`, pinned to the
script at `bd74168` so a concurrent edit could not alter it mid-run.

**All four stages reproduce exactly: 96.89% → 85.38% → 80.23% → BOTH 71.61%** (3426 / 3019 /
2837 / 2532 of 3536), against the recorded 96.9 → 85.4 → 80.2 → 71.6. n = 3536 pellet-frame
instances = 884 distinct pellets × the 4 counting frames. The gate correctly refuses and exits 1,
as expected below the 0.90 floor. Two independent script instances produced identical numbers on
every field.

**`min_circ` dominates, and the ledger's direction is upheld.** As a fraction of raw-found:
`min_circ` rejects **17.19%** (589), `min_area` **11.88%** (407) — a 1.45× ratio matching the
recorded "17.2% vs 11.9%". The apparent contradiction from the committed slice fixture
(`synthetic-fidelity-slice.json`, which rejects area-dominant 18.75% vs 7.03%) is **small-sample
noise, now explained**: that slice is sequences 0/30/60/90 — the first sequence of each video,
32 distinct pellets — and two of its four sequences have `min_circ` pass = 1.000, i.e. zero circ
rejections, so it structurally under-samples the dominant filter. 26.6% of random 4-sequence
draws reproduce the inversion; at 40 sequences only 0.4% do. The independent n=40 cross-check
agrees on direction (1.448× vs this run's 1.447×).

The n=40 cross-check's absolute stages (94.4 → 81.0 → 75.0 → 65.3) sit ~2.4–2.7 sd low against a
bootstrap of 4000 random 40-of-120 subsets (sd 0.91 / 1.59 / 2.22 / 2.40 pp). Because the stages
are nested this is one signal — raw-found 2.5 pp low — propagating downstream, most likely a
method or source-set difference rather than a contradiction. ⚑ That cross-check's provenance
could not be located, so "a 40-of-120 subset" may be the wrong null for it.

**The 71.6% is a bad tail, not uniform mediocrity, and it is clustered by video.** Per-sequence
both-pass: median 0.750, range 0.225–1.000, p10 0.475 / p90 0.969; 102 of 120 sequences fall
below 0.90 and 11 sit at exactly 1.00. Per-video means `guilty` 0.830 > `isabel` 0.780 >
`marciana` 0.690 > `noir` 0.578 — a ~25 pp spread between best and worst video.

Significance, bounded: the same-day real cascade puts both filters near-inert on real pellets
(`min_area` 2.45%, `min_circ` 0.61% of found). So `min_circ` dominance here is a fact about the
GENERATOR's composited pellets, not about the detector, and `min_circ` remains a non-suspect for
the counter's cold bias. This settles a provenance question and reopens nothing. RECORDS a
measurement only — no constant, fixture, `DECISIONS.md` entry or plan direction was changed.

### 2026-08-01 — f8–11 crop-CENTERING error: is it crosshair frame-lag? (`marciana`, SG/Iron)

Executes `docs/handoffs/2026-08-01-pellet-centering-test-plan.md`, whose §3 decision rule was on
disk before any of these numbers existed. Question: the owner-marked pellet clouds sit 20–52px off
the f8–11 crop centre, roughly constant within a shot but swinging −51…+62px between shots. **H1**
— the crop is centred on the crosshair at the COUNTING frame while the pellets landed at the aim
point of the FIRING frame, so the offset is that 8-frame lag — versus **H0a** (localization is
simply wrong) and **H0b** (real aim-vs-impact offset, not a reader bug).

Instrument: `score-pellets.py --audit-centering` (committed this session), fed
`count-pellets.py --dump-tracks` regenerated at the ground-truth clip's exact parameters
(`at=15 dur=30 fps=60 zoom=2`, structural + template). `DISP = cross[t0] − cross[f]`,
`CLOUD = owner centroid − (184,184)`, residual `CLOUD − DISP`.

**Two gates ran before any number was read.** (1) INDEXING: no committed dump covers this window,
so a frame-index error would silently produce confident garbage. All **21/21 committed crops
re-cut byte-identically** from the regenerated frames, and `find_t0` reproduced every recorded
`t0` (None/1060/1096/1140/1289/1369). Negative control: giving shot 4 the structural dump instead
of the template one it was actually cut from fails the gate (exit 1). (2) SIGN, derived from crop
geometry then MEASURED independently of `t0`: between two counting frames the pellets have landed
and are world-fixed, so the cloud must translate by exactly minus the crosshair's motion —
observed |error| ≤ 1.0px on all 5 shots, versus 5.0–31.9px had the sign been inverted.
`CLOUD = cross[t0] − cross[f] = DISP` under H1, a direct match with no flip, agreeing with the
plan.

| shot | locate     | `DISP` (f08) | \|DISP\| | `CLOUD` (f08) | \|CLOUD\| | residual `CLOUD−DISP` | \|res\| | centroid SE  | conf `t0` | conf f08 | `t0±2` max Δ |
| ---- | ---------- | ------------ | -------- | ------------- | --------- | --------------------- | ------- | ------------ | --------- | -------- | ------------ |
| 1    | structural | (+24, −70)   | 74.0     | (−49.2, −2.9) | 49.3      | (−73.2, +67.1)        | 99.3    | (38.0, 27.0) | **none**  | 44.5     | **78.2**     |
| 2    | structural | (+15, +2)    | 15.1     | (+61.8,+15.8) | 63.8      | (+46.8, +13.8)        | 48.8    | (30.5, 22.8) | 44.6      | 41.7     | 16.0         |
| 3    | structural | (−6, +17)    | 18.0     | (+23.7,−25.0) | 34.4      | (+29.7, −42.0)        | 51.4    | (25.8, 21.0) | 43.1      | 41.2     | 4.0          |
| 4    | template   | (+37, −7)    | 37.7     | (+18.9, +6.1) | 19.8      | (−18.1, +13.1)        | 22.4    | (26.9, 15.6) | **0.478** | 0.413    | **38.0**     |
| 5    | structural | (−18, −4)    | 18.4     | (−46.5,+15.2) | 48.9      | (−28.5, +19.1)        | 34.3    | (26.1, 23.9) | 96.5      | 95.7     | 12.0         |

Confidences are not comparable across modes: structural reports an unnormalised shape score
(~41–97), template a 0–1 match score.

**H1 is dead: 0 of 5, needing ≥4.** No shot has the residual within ±10px on both axes; the
closest any shot gets is 22.4px, and the largest is 99.3px. **The eyeball impression that
motivated H1 does not survive measurement, and the re-centring fix it implied is not warranted.**

Applied literally to the 5-shot set, §3 then selects **H0a**: |`DISP`| > 15px on 5/5 and
|residual| > 25px on 4/5 (needing ≥3). H0b is not selected — it required |`DISP`| < 10px, and
`DISP` is 15–18px even where the locator is perfectly clean. **But §5's own confound-3 instruction
("a low-confidence lock makes that shot's `DISP` meaningless; exclude it") disqualifies exactly the
two shots carrying H0a's mechanism**, and applying it first leaves n=3, where no row's ≥4/5 or
≥3/5 threshold can be reached at all — §3 row 4, "report as-is, do not force it into a bucket."
Both readings are recorded here; only H1's refutation is threshold-independent.

- **Shot 1 — excluded.** `cross[t0]` is a HELD STALE LOCK: `conf=None` for three consecutive
  frames (1058–1060) frozen at (2098,438), 78px off the smooth track, snapping back to (2070,511)
  at 1061. Its whole `DISP` is that artefact.
- **Shot 4 — excluded.** Template confidence 0.413–0.478, below the 0.55 relock bar, with the lock
  thrashing 2101→2063→2096→2062 across consecutive frames.
- **Shots 2/3/5 — clean.** Smooth monotone pans at normal confidence. `DISP` 15–18px over 8 frames
  is ~2px/frame of genuine aim tracking, not instability. H0a's threshold sits just below the
  magnitude of real crosshair pan, which is why the letter of the rule selects it here.

**The `t0` instability and the low confidences are the same two shots, not two problems.** The
`t0±2` sweep moves `DISP` by 78.2px (shot 1) and 38.0px (shot 4) but only 4.0–16.0px on the clean
shots — the perturbation test independently fingers the same pair, which is corroboration rather
than a second defect.

**Whole-picture check, and the reading that actually survives.** The residual is algebraically
`P − cross[t0]` and so cannot depend on `f`; measured, it is constant across f08–f11 to **≤1.8px
on every shot**, confirming the pellets are world-fixed over the counting window and that the
plan's "f08→f11 centroid travel" column (0.7–15.9px) is entirely crosshair motion, not pellet
motion. Against that, the measured centroid SE is **29.5px (x) / 22.0px (y)** per axis — ~1.6×
the 18px §5 assumed — so every residual is ≤2.7σ and four of five are ≤1.4σ, with the pooled mean
(−8.7, +14.2) over 5 shots or (+16.0, −3.0) over the clean three, both statistically
indistinguishable from zero. **A 7–10-pellet centroid drawn from a wide SG spread scatters by
about this much; the 20–52px "centering error" is consistent with small-sample centroid noise
around a correctly-centred window.** That is not a bucket §3 offered, and it is recorded, not
enacted.

Also corrected while measuring, and recorded rather than fixed in place: the plan's §1 table is
the **mean over f08–f11**, not "measured on f08" as its prose says — the means reproduce all five
rows and the travel column to the last decimal, while §3's formula specifies `centroid(f08)`.
These differ materially only on shot 2 (+61.8 f08 vs +49.6 mean, because a 16px structural x-toggle
lands on f08), and the verdict is unchanged under either. The f08 figures are used above, per §3.

Honest limits. **n=5 shots, one clip, one unit — `marciana` (SG/Iron), NOT
`marciana-marine-study` (AR/Iron)** — and per the provenance ledger this fixture can FAIL a
candidate but never certify one to ±0.25. The set is conditioned by the 150px jump guard, so it
cannot see the worst localization excursions; shot 1's 78px mislock slipped under that guard and
shot 0 has no `t0` at all. RECORDS a measurement only: the crop-centring behaviour, `pellet_radius`,
`center_exclude`, `FIDELITY_BOTH_PASS_FLOOR`, `min_area` and `min_circ` are untouched, no
`DECISIONS.md` entry is edited, no plan direction is rewritten and no verdict is stamped elsewhere.
The counter's cold bias remains unexplained.

### 2026-08-01 — stale-lock prevalence across the committed crosshair dumps

Scoping measurement for the 60fps-localization item, computed entirely from `tracks.json` dumps
already on disk (`scratchpad/pellets/*/`) — no new extraction. Prompted by the centering run finding
one shot's `cross[t0]` was a held stale lock 78px off-track.

**The tracker HOLDS the last good position during a lost lock and marks it `conf: None`, rather than
signalling loss.** Verified structurally: in 154/155, 147/148, 151/152 and 134/135 of the stale runs
across the four long structural dumps, every position inside the run is byte-identical to the last
good one. So a downstream consumer cannot distinguish "locked here" from "lost, showing you a stale
value" — and nothing downstream currently gates on `conf`.

Prevalence and cost, per dump (displacement = how far the crosshair actually moved between the frame
before a stale run and the frame after it, i.e. how wrong the held position had become):

| dump                     | frames | stale runs | % frames stale | displacement median / p90 / max | run len median / max |
| ------------------------ | ------ | ---------- | -------------- | ------------------------------- | -------------------- |
| `h4-guilty-structural`   | 5738   | 147        | **31.0%**      | 206 / 478 / 1184 px             | 2 / 101              |
| `h4-isabel-structural`   | 5721   | 151        | **23.6%**      | 188 / 498 / 1514 px             | 1 / 103              |
| `h4-marciana-structural` | 5697   | 134        | **17.4%**      | 168 / 447 / 716 px              | 2 / 146              |
| `i2-marciana-60fps`      | 480    | 4          | 13.8%          | 178 / 517 / 517 px              | 3 / 61               |
| `i3-noir-far-60fps`      | 480    | 11         | 8.1%           | 111 / 390 / 525 px              | 2 / 13               |
| `g2-noir-structural`     | 5722   | 154        | 7.9%           | 112 / 387 / 600 px              | 1 / 191              |
| `i3-noir-near-60fps`     | 481    | 13         | 5.2%           | 122 / 291 / 301 px              | 1 / 4                |

**`pellet_radius` is 160px.** The MEDIAN stale-lock displacement (111–206px) is therefore comparable
to or larger than the entire counting-window radius, and the p90 is 2–3× it. During a stale run the
window can be pointed completely off the pellet cloud. Longest runs reach 101–191 frames (~1.7–3.2 s
at 60fps).

**Gate 1 does not see any of this** — it is a whole-video conjunction (near-fraction ≥5% AND wander

> 300px), so 70–83% good frames dilute the failures. Separately confirmed on disk: `run21-60fps-farband`
> (901 frames) and `run21b-60fps-farband` (721 frames) have **no valid consecutive positions at all**,
> which is the previously-recorded "2 of 4 windows locked zero frames".

Note the two confidence scales, which must not be conflated: structural dumps score ~91–95 with `None`
for a held lock; template dumps score 0–1 (medians 0.41–0.60). A `conf < 0.6` test is meaningful only
in template mode.

**What this does NOT yet establish.** Whether stale frames reach the COUNTS. On the 6-shot `marciana`
(SG/Iron — NOT `marciana-marine-study`, AR/Iron) ground truth the counting-frame locks were good — the measured cloud offsets sat within
noise of the crop centre — and the one stale lock found there was at `t0`, not at a counting frame.
The prevalence above is over ALL frames; counting frames are t0+8…t0+11, a small and possibly
non-representative subset. **That is the open question this measurement hands forward.**

RECORDS a measurement only. No constant, guard threshold, gate definition or `DECISIONS.md` entry was
changed, and no verdict is stamped.

### 2026-08-01 — do stale locks reach the COUNTS? (counting-frame stale rate + the exclude A/B)

Answers the question the entry above handed forward. Instrument:
`analyze-pellet-tracks.py --stale-counting` (committed this session — the prevalence entry's own
numbers were computed ad hoc and left no script behind, so this closes that gap too), with
`--stale-counting-groundtruth` for the owner-anchored arm and
`--stale-counting-selftest` / `scripts/tests/fixtures/pellets/stale-counting-slice.json` pinning it.
Decision rule was on disk in the driver's brief before any number was read: **≥10% of counting
frames stale AND median displacement >80 px** ⇒ stale locks materially corrupt counting;
**<3% stale, or median displacement <30 px** ⇒ real tracker defect that does not reach the counts;
anything between ⇒ report as-is, do not force it into a bucket.

**Two gates ran before any number was read.** (1) STALENESS RULE, per mode, because the two hold
mechanisms are different and neither mode's rule is valid on the other's dump. Structural:
`locate_crosshair_structural` returns `(last_acc, None)` when a frame yields no digit-row candidate,
so STALE ⇔ `conf is None` with a position present. **SUPERSEDED (2026-08-03) — disregard the signature
in that sentence only:** since `8ecad5a7` the function returns the 3-tuple `(center, score, held)` and
`stale_mask()` prefers the explicit `cross_held` array, falling back to this inferred rule when a dump
predates it — so the staleness classification of this entry is unchanged and every number below still
stands (§6). Template: the consistency gate's
`elif last_acc is not None` branch carries the position forward while still recording the FAILING
numeric confidence, so `conf is None` never fires — but the accepted position stops being derived
from that frame's own raw match, so `cross_positions[i] − cross_rawloc[i]` departs from the dump's
modal delta. `--crosshair-file` dumps (no conf, no rawloc) are REFUSED, not scored. Mode is inferred
from each dump because `--dump-tracks` does not record `locate`: structural's confidence slot holds
an unnormalised surround brightness (143–211 observed), template's a 0–1 match score, so
`max(conf) > 1` separates them with no overlap. The structural rule then **reproduces the prevalence
table above dump-for-dump to 0.1 pp** (31.0 / 23.6 / 17.4 / 13.8 / 8.1 / 7.9 / 5.2%), and the
template rule scores `run16/tracks.json` — the reference healthy template dump — at 0 of 1800 frames
held. (2) t0 ALIGNMENT: `find_t0` cannot be used off-fixture, because it ranks onsets by distance to
an **owner-supplied** approximate shot index that only the 6-shot fixture carries. t0 is therefore
the debounce event's rising edge (`debounce_shots`' own `start`, exposed additively this session).
Scored against the five owner-anchored `groundtruth-f8-11.json` values it is **exact on 3 of 5 and
4 frames early on 2 — max |error| 4 frames, never late**, and the whole result survives a ±4-frame
sweep (below).

Counting frames are `t0+8…t0+11`. First pass, pooled over the same 7 structural dumps the prevalence
table covers — 739 shots, 2955 counting frames, 4 units (`guilty`, `isabel`, `marciana` (SG/Iron —
NOT `marciana-marine-study`, AR/Iron), `noir`). **Two provenance facts, checked afterwards, mean this
7-dump pool is not 7 independent samples — the corrected re-read is below the table and is the number
to quote:**

| dump                     | all frames stale | counting frames stale | enrichment | shots w/ ≥1 stale | run-disp med | interp med | A/B Δcount |
| ------------------------ | ---------------- | --------------------- | ---------- | ----------------- | ------------ | ---------- | ---------- |
| `h4-guilty-structural`   | 31.0%            | **3.7%**              | 0.12×      | 10 / 167          | 140 px       | 47 px      | +0.083     |
| `h4-isabel-structural`   | 23.6%            | **4.5%**              | 0.19×      | 12 / 172          | 294 px       | 86 px      | +0.213     |
| `h4-marciana-structural` | 17.4%            | **4.2%**              | 0.24×      | 14 / 191          | 108 px       | 47 px      | +0.030     |
| `i2-marciana-60fps`      | 13.8%            | **0.0%**              | 0.00×      | 0 / 10            | —            | —          | —          |
| `i3-noir-far-60fps`      | 8.1%             | **13.6%**             | 1.68×      | 3 / 11            | 390 px       | 264 px     | −0.375     |
| `g2-noir-structural`     | 7.9%             | **3.2%**              | 0.41×      | 14 / 177          | 43 px        | 18 px      | −0.160     |
| `i3-noir-near-60fps`     | 5.2%             | **9.3%**              | 1.79×      | 3 / 11            | 170 px       | 58 px      | −0.306     |
| **pooled**               | **19.36%**       | **4.09%**             | **0.21×**  | **56 / 739**      | **138 px**   | **48 px**  | **−0.019** |

**Corrected re-read — this is the headline.** Two things are wrong with pooling the table above, both
read out of the dumps' own sibling `pellets.json` provenance:

1. **The 7 dumps come from 4 videos, and 3 of them are re-reads.** `h4-guilty` / `h4-isabel` /
   `h4-marciana` / `g2-noir` are full-video 30 fps extractions (`at=0, dur=None`) of
   `guilty solo sg.MP4` / `isabel solo sg.MP4` / `marciana-solo.MP4` / `noir sg.MP4`. The three small
   dumps are 60 fps 8-second re-extractions of windows INSIDE two of those same videos
   (`i2-marciana` @31 s, `i3-noir-near` @50 s, `i3-noir-far` @95 s), so their 32 shots are the same
   physical shots already counted in `h4-marciana` and `g2-noir`, resampled. The independent
   population is the 4 full-video dumps: **815 shots, 4 videos, 4 units, one dump each.**
2. **`f8-11` is a 60 fps definition and does not transfer by index.** The owner's lifecycle spec is
   13 native frames at 60 fps, so f8-11 is 133–183 ms after onset. On a 30 fps extraction the same
   index offsets land 267–367 ms after onset — past the blast. Measured: mean total at `t0+8…t0+11`
   is **5.3–6.6** pellets on the three 60 fps dumps (the window is on the cloud, as designed) but
   **1.0–1.8** on the four 30 fps ones; the rate-equivalent window there is `t0+4…t0+6`, where the
   mean total is **5.9–6.3** and matches. The first pass measured the wrong physical window on the
   four large dumps. (`--stale-counting-offsets` exists so this is re-runnable either way; the
   sampling rate is not recorded in `--dump-tracks`, so the mismatch is silent.)

Re-run on the corrected population and window (4 full-video dumps, `--stale-counting-fps 30
--stale-counting-offsets 4 5 6`):

| dump                     | all frames stale | counting frames stale | enrichment | shots w/ ≥1 stale | run-disp med | interp med | A/B Δcount |
| ------------------------ | ---------------- | --------------------- | ---------- | ----------------- | ------------ | ---------- | ---------- |
| `h4-guilty-structural`   | 31.0%            | **6.1%**              | 0.20×      | 20 / 180          | 97 px        | 48 px      | −0.073     |
| `h4-isabel-structural`   | 23.6%            | **6.4%**              | 0.27×      | 22 / 203          | 202 px       | 59 px      | −0.135     |
| `h4-marciana-structural` | 17.4%            | **6.1%**              | 0.35×      | 25 / 218          | 183 px       | 69 px      | +0.123     |
| `g2-noir-structural`     | 7.9%             | **5.6%**              | 0.71×      | 24 / 214          | 215 px       | 110 px     | −0.757     |
| **pooled**               | **20.01%**       | **6.05%**             | **0.30×**  | **91 / 815**      | **159 px**   | **65 px**  | **−0.223** |

Corrected displacement at the 148 stale counting frames: run-spanning median **158.9** px (p90 437.2,
max 1130.6; 74 beyond `pellet_radius` 160, 114 beyond 80 px), interpolated per-frame median **65.1** px
(p90 230.1; 31 beyond 160 px, 105 beyond `center_exclude` 36). Corrected A/B: mean **−0.223** pellets
on the 77 affected shots (median +0.000, sd 1.72, worst single shot +6.00 — `g2-noir`'s −0.757 is one
outlier, not a shift; sd 1.72 over n=77 puts the SE at 0.196, so −0.223 is 1.1 SE from zero and not
distinguishable from it), or **−0.021 pellets/shot** diluted over all 815. **Both correction directions
push the same way — the rate goes 4.09% → 6.05% and the A/B cost goes up ~20× — and neither moves the
verdict: 6.05% is still neither ≥10% nor <3%, and both displacement medians are still above 30 px.**

**Counting frames are DEPLETED of stale locks — 3.3× on the corrected population** (6.05% vs the
20.01% all-frames baseline), 4.7× on the first pass. The two enriched dumps in the first table are the
two smallest (11 shots each, 6 and 4 stale counting frames) and are re-reads of frames already in
`g2-noir`; every full-video dump is depleted. Superset run over all 26 dumps on disk (1078 shots, including
the deliberately-broken `noir-near-ce36` frozen lock and the `noir-offset-*` probes) gives 7.7%
counting vs 20.79% all-frames — same direction, diluted by dumps that are not healthy reads.

**On displacement**, the run-spanning measure (the prevalence entry's own) spans a whole stale run and
is therefore an **upper bound** for any single interior frame, so every stale counting frame is also
scored by linear interpolation between the two good endpoints — justified only because the crosshair
pans smoothly (the same-day centering measurement puts clean-shot motion at ~2 px/frame). Both are in
the tables above; on the corrected population the interpolated median is 65 px against
`center_exclude` 36 and `pellet_radius` 160, with 31 of 148 frames still beyond the full radius. **So
when a counting frame IS stale the window is often genuinely mispointed — the rate is what is low, not
the severity.** (First-pass figures on the 7-dump pool: 121 stale counting frames, run-spanning median
138.1 px / p90 427.8 / max 597.4 with 55 beyond 160 px; interpolated median 48.2 px / p90 260.3 with
23 beyond 160 px.)

**The A/B costs very little either way.** Excluding stale counting frames from each shot's mean moves
the affected shots by **−0.223** pellets on the corrected population (n=77, median +0.000, sd 1.72) —
**−0.021 pellets/shot** over all 815 — and by −0.019 (n=43, sd 0.81) on the first pass, i.e.
−0.001 pellets/shot over 739. Where a shot's whole window is stale there is nothing left to average
and the shot drops, which changes the denominator — stated, not hidden.

**Ground-truth arm, 6-shot `marciana` (SG/Iron) fixture, owner-anchored t0.** One shot is affected and
it is shot 4, whose **entire f8–11 window is a template carry-forward** (conf 0.413–0.453, all below
the 0.55 relock bar). The same-day centering entry independently flagged that shot as low-confidence
and thrashing; what is new is that those four frames are HELD positions of the same defect class as
the structural `conf: None` hold, not merely weak matches. Shot 1's stale lock is at `t0` only, and
its counting frames are clean.

| shot | t0   | locate     | owner | `t0` stale | stale counting frames  | err incl | err excl |
| ---- | ---- | ---------- | ----- | ---------- | ---------------------- | -------- | -------- |
| 0    | —    | structural | 0     | —          | (no onset)             | +0.00    | +0.00    |
| 1    | 1060 | structural | 7     | **yes**    | none                   | −3.75    | −3.75    |
| 2    | 1096 | structural | 10    | no         | none                   | +0.25    | +0.25    |
| 3    | 1140 | structural | 8     | no         | none                   | +0.25    | +0.25    |
| 4    | 1289 | template   | 9     | no         | **f08, f09, f10, f11** | +0.75    | (drop)   |
| 5    | 1369 | structural | 8     | no         | none                   | +0.25    | +0.25    |

INCLUDED n=6 bias **−0.375** (se 0.682) rmse **1.571**; EXCLUDED n=5 bias **−0.600** (se 0.789) rmse
**1.688**. The shift is **−0.225 in bias = 0.33× its own SE**, so **the A/B does NOT move the 6-shot
bias by more than its own SE**, and per the provenance ledger this fixture can fail a candidate but
never certify one to ±0.25 anyway. Note the direction: shot 4's stale window read **hot** (+0.75), so
removing it makes the fixture colder — the stale lock there is not a cold-bias source. And the
fixture's whole cold outlier, shot 1 at −3.75, sits on **clean** counting frames; no stale-frame
exclusion can touch it.

**Decision rule: NO row fires; this is the "report as-is" case.** 6.05% corrected (4.09% first pass)
is neither ≥10% nor <3%, and every displacement median (159 / 65 px corrected, 138 / 48 px first pass)
is above 30 px, so neither the
"materially corrupts" nor the "does not reach the counts" branch is satisfied, on either reading. Per the rule's own
instruction it is not forced into one. What would decide it: (a) owner-labelled pellet positions on
shots whose counting window IS stale — there is exactly one such shot in the repo today (fixture shot
4, n=1, and it reads hot); (b) an independent shot COUNT for a clip, from footage rather than from
this pipeline, to size the missing-shot channel below. Neither is derivable from data already on disk.

**Confounds, each with a verdict.**

- **Circularity — CONFIRMED, and it is the reason the encouraging number is not reassuring.**
  `build_tracks_and_counts` only counts tracks within `pellet_radius` of `cross_positions[fi]`, so a
  mispointed held window suppresses the very counts an event is opened on. Measured directly:
  `P(frame clears event_min | stale)` = 8.4 / 8.6 / 12.0 / 4.5% on the four large structural dumps
  versus 31.3 / 33.5 / 33.4 / 32.1% given a good lock — a 2.7–7× suppression. And the depletion is
  LOCAL to the event: stale% along a ladder of offsets from the same t0, all equally conditioned on a
  detected shot, runs 13.2% at t0 and 7.2/4.3/3.7/4.4/4.7/3.9% across t0+4…t0+12 (both candidate
  counting windows sit in that trough), then climbs back to 18.9% at t0+20, **25.6% at t0+40 and 29.9%
  at t0+60** — through and past the 20.01% unconditional
  rate. Conditioning on "a detected shot" is therefore **not** independent of lock quality: the low
  counting-frame rate is substantially SELECTION, not safety. The corollary is that the shots a stale
  lock destroys outright are invisible to this measurement, which sizes only the
  detected-but-corrupted channel. That missing-shot channel is unmeasured and is NOT covered by this
  entry's numbers.
- **Mode mismatch — controlled.** No `conf < 0.6` test was applied to a structural dump and no `None`
  test to a template dump; mode came from each dump's own confidence scale (no overlap between
  143–211 and 0–1) and each rule was validated separately (structural against the committed
  prevalence table, template against `run16`'s 0/1800).
- **Frame-index alignment — controlled.** No index crosses a dump boundary: every dump's events come
  from its own `frame_counts`, and the ground-truth arm reads each shot from the dump matching its own
  recorded `locate` mode. The estimated-t0 result is stable under the calibrated error: 5.38 / 4.26 /
  4.09 / 4.17 / 4.40% at t0 shifts of −4 / −2 / 0 / +2 / +4 frames, and 4.44% when the debounce
  gap-tolerance is fed 30 fps instead of 60.
- **Displacement is measured across a run — acknowledged and worked around.** The run-spanning median
  (159 px corrected) is an upper bound on any interior frame's error; the interpolated per-frame
  estimate (65 px) is reported beside it, and every threshold count is given for both.
- **Sampling rate vs the counting window — CAUGHT, and it moved the numbers.** The first pass applied
  the 60 fps-defined `f8-11` index window to 30 fps extractions, where it lands past the blast; the
  corrected window (`t0+4…t0+6`) and the corrected population are the re-read above. Recorded rather
  than quietly re-run, because the size of the correction (4.09% → 6.05%, A/B ×20) is itself the
  evidence for why `--stale-counting-offsets` had to become an explicit knob.
- **n and representativeness — 815 detected shots over 4 videos and 4 units, one full-video dump each
  (the first pass's 7-dump/739-shot pool double-counted, see the correction above).** In the first
  pass two dumps carried only 10–11 shots each and were exactly the two that came out enriched, so
  that enrichment/depletion split
  is small-n on one side. Only one unit (`marciana`, SG/Iron) has owner-counted ground truth, and the
  A/B against it rests on a single affected shot.

RECORDS a measurement only. Gate 1's definition, the 150 px jump guard, every `conf` threshold,
`pellet_radius`, `center_exclude`, `min_area` and `min_circ` are untouched; no new gate was added to
the live path; no `DECISIONS.md` entry was edited and no verdict is stamped. **If a guard is wanted,
that is a separate gated pass** — it would change what every reader run accepts, and this measurement
does not by itself justify one.

### 2026-08-01 — the MISSING-SHOT channel: ammo-counter shot count vs pellet-detected shots

Executes `docs/handoffs/2026-08-01-missing-shot-channel-test-plan.md`, whose §3 decision rule was on
disk before any number was read: **MISSED ≥ 8% of `shots_from_ammo`** ⇒ the channel can carry the
whole 0.8–1.6 pellets/10 cold bias and the guard work is justified; **MISSED ≤ 2%** ⇒ too small,
record it and the cold bias stays unexplained; **between** ⇒ report as-is, do not force a bucket.
Answers the channel the entry above handed forward as explicitly unmeasured.

**Instrument (committed, re-runnable).** `count-pellets.py --ammo-series` reads the ammo counter for
every frame of an existing `--dump-tracks` dump, reusing that dump's OWN recorded box position — under
`--locate structural`, `cross_rawloc[i]` IS the accepted digit-row centre, so no re-localization and no
per-frame `matchTemplate` is needed. Template/external dumps are REFUSED, not read at a position that
does not mean what the reader needs. `analyze-pellet-tracks.py --missing-shots` reconstructs shots from
that series and scores them against the dump's own `debounce_shots` events;
`--missing-shots-selftest` + `scripts/tests/fixtures/pellets/missing-shots-slice.json` pin the whole
chain (including the §3a gate) with no images and no subprocess.

Reconstruction rules, all fixed before the numbers existed: a read is dropped if it is `None` or above
the datamined magazine size (9 for all four SGs); a new LEVEL needs `confirm=2` consecutive surviving
reads, and abstentions do not break a run (missing data, not evidence of change); level DOWN by d = d
shots, **recoverable ACROSS an abstention gap**; level UP = a reload, 0 recovered shots, with the
pre-reload level recorded as `reload_headroom` — the size of the hole the method cannot see into.

**Instrument work needed first.** The committed digit atlas held only WHITE glyphs, and the counter
renders RED at ammo ≤ 4 — exactly the values a 9-round magazine spends half its life at. On red digits
the matcher was a near-tie between 3 and 4 (0.880 vs 0.868, i.e. confidently wrong half the time) and
read 3 as 9 at 0.48. 72 red glyphs were harvested (`--build-atlas --atlas-tag red`) from `marciana`
(SG/Iron — NOT `marciana-marine-study`, AR/Iron) frames **outside** the groundtruth window, hand-labelled
off the crops, so the §3a gate stays independent of them.

#### §3a GATE — PASSED, and it is what authorises everything below

Reconstruction over the 1801-frame `marciana` groundtruth clip (`at=15 dur=30 fps=60 zoom=2`,
`groundtruth-f811-v4`), scored against the five owner-confirmed real shots in
`scripts/tests/fixtures/pellets/groundtruth-f8-11.json` (shot 0 is the owner-confirmed false positive):

| owner shot | owner `t0` | ammo decrement window | transition | `t0` − window |
| ---------- | ---------- | --------------------- | ---------- | ------------- |
| 1          | 1060       | [1056, 1056]          | 4→3        | **+4**        |
| 2          | 1096       | [1096, 1096]          | 3→2        | **0**         |
| 3          | 1140       | [1136, 1136]          | 2→1        | **+4**        |
| 4          | 1289       | [1289, 1289]          | 9→8        | **0**         |
| 5          | 1369       | [1369, 1369]          | 7→6        | **0**         |

**5 of 5 recovered; max |offset| 4 frames; zero negative offsets; and the span contains exactly 5 ammo
shots, none unmatched.** Two shots land at 4 rather than ≤3, so the rule's row-1 tolerance is missed by
one frame on 2 of 5 — the plan's row 2 ("misaligned, with a MEASURED explanation") applies, and the
explanation is measured three ways, not assumed:

1. **Sign.** Every offset is ≥ 0. The counter decrements ON the shot frame; the detector's `t0` is the
   `EVENT_MIN` rising edge, which cannot precede the blast. A broken pairing would produce both signs.
2. **Against the pipeline's own t0 definition the alignment is EXACT.** Scored against
   `debounce_shots`' rising edge — what "t0" means everywhere else in this pipeline, per
   `make-groundtruth-f811.py`'s own docstring — the ammo decrement and the detected onset coincide on
   **29 of 29** unambiguous (zero-width-window) decrements in this clip, max lag 0, none negative.
3. **The 0/0/4/0/4 pattern was already on record, independently.** The entry above measured the same
   estimator disagreement — "exact on 3 of 5 and 4 frames early on 2, max |error| 4 frames, never late"
   — before this instrument existed. The ±4 is a property of the fixture's `find_t0`, not of the ammo
   read, and this measurement localises it.

Full-fight cross-check: the same 0-lag mode holds on the 30 fps dumps — 100/106, 91/97, 66/76 and
103/126 unambiguous decrements at lag exactly 0, with a thin tail to −8 frames (the detector firing
before the HUD digit turns over). That measured tail, not a guess, sets the matching slack at 8 frames;
the whole result is swept across slack 3/6/8/10 below.

#### §3b THE MEASUREMENT — four full-fight dumps, 30 fps, slack 8

`shots_from_ammo` = confirmed decrements. `SPUR?` is the only over-detection column; the rest of
`SPUR` is the arbiter's own blind spot (see the confounds). `MISSok` excludes decrements the cadence
arithmetic says are impossible.

| dump                     | read% | ammo | detected | MISSED | MISSED%   | MISSok        | SPUR | SPUR? | reloads | headroom |
| ------------------------ | ----- | ---- | -------- | ------ | --------- | ------------- | ---- | ----- | ------- | -------- |
| `h4-marciana-structural` | 62.6% | 195  | 218      | **1**  | **0.5%**  | 1 (0.5%)      | 24   | **0** | 26      | 40       |
| `h4-guilty-structural`   | 52.2% | 166  | 180      | **8**  | **4.8%**  | 7 (4.3%)      | 22   | **1** | 21      | 23       |
| `h4-isabel-structural`   | 55.3% | 204  | 203      | **30** | **14.7%** | 8 (4.4%)      | 29   | **1** | 28      | 43       |
| `g2-noir-structural`     | 70.7% | 205  | 214      | **13** | **6.3%**  | 13 (6.3%)     | 22   | **0** | 29      | 51       |
| **pooled**               | —     | 770  | 815      | **52** | **6.8%**  | **29 (3.9%)** | 97   | **2** | 104     | 157      |

60 fps clips, same instrument and the same slack 8: `groundtruth-f811-v4` 34 ammo / 37 detected /
**MISSED 1 (2.9%)**;
`i2-marciana-60fps` 9 / 10 / **0**; `i3-noir-far-60fps` 8 / 11 / **0**; `i3-noir-near-60fps` 9 / 11 /
**3** — the last three carry 8–9 shots each and are re-extractions of windows already inside the
full-fight dumps, so they are shown for completeness and pooled nowhere.

Slack sensitivity (the one instrument knob chosen after the fact, from the measured lag tail):
MISSED% at slack 3 / 6 / 8 / 10 is 4.1 / 1.0 / 0.5 / 0.5 (`marciana`), 8.4 / 6.6 / 4.8 / 4.8
(`guilty`), 21.6 / 15.7 / 14.7 / 14.2 (`isabel`), 16.1 / 7.3 / 6.3 / 6.3 (`noir`). **Converged by 8**,
and `SPUR?` collapses from 6/8/12/19 to 0/1/1/0 over the same sweep — i.e. at slack 3 the matcher was
manufacturing MISSED/SPURIOUS pairs out of the same shot.

**Landed pellets per shot, measured: 8.4** — the owner's own per-shot totals on the five real fixture
shots are 7, 10, 8, 9, 8. ⚑ **SUPERSEDED (2026-08-04) — disregard "landed": §9A shows this is a
count of the markers visible in the f8–11 WINDOW, not a per-shot landed total.** That is the plan's
assumed value exactly, so **the 8% threshold is unchanged**
(0.8/8.4 ÷ (10/8.4) = 8.0%, 1.6/8.4 ÷ (10/8.4) = 16.0%). The reader's own `avgTotal` on valid shots is
7.0–7.4 across the four dumps, i.e. ~1.0–1.4 pellets/shot colder than the owner's 8.4 — that gap is the
already-recorded per-shot bias, not this channel. ⚑ **SUPERSEDED (2026-08-04) — disregard that
sentence's framing: §9B decomposes the same five shots and finds only 12 of the reader's 35 reported
pellets are owner pellets at all, so the ~1.0–1.4 gap is a residual between two different quantities,
not a per-shot bias of a size.**

**Cadence — MEASURED, not assumed from `rate_of_fire`.** Mode **20 frames at 30 fps** on all four
full-fight dumps (62/160, 64/139, 37/145, 85/174 of the inter-shot gaps) and **40 frames at 60 fps** on
the groundtruth clip (22/29). `marciana`'s datamined 90 rpm = 1.5 shots/s, and 60/ceil(60/1.5) = 40, so
nominal = effective here — checked, not assumed. The spread around the mode (13–27) is abstention
timestamp jitter, not real cadence variation.

**Cadence-multiple sub-case (§3b's clean case: adjacent detected gaps that are integer multiples of the
measured cadence and span no reload).** 16 such gaps across the four dumps; the ammo's count of
undetected shots inside them matches `gap/cadence − 1` on **15 of 16** (pooled: 17 predicted, 16
observed). The one miss is a `marciana` 38-frame gap where the ammo found none. **The plan's §1 gap
arithmetic is a good predictor of what the ammo actually sees.**

#### What the two fixture gaps actually contained — the plan's own seed, tested

`groundtruth-f8-11.json`'s six `t0` values are **not** an exhaustive shot list: they come from
`--shot-times`, an owner-supplied list of six previously-detected shots hand-counted for pellets
(`make-groundtruth-f811.py`'s own help: "from the existing hand-count table"). §1 read gaps in that list
as gaps in the READER. They are not:

- **The 80-frame gap (owner `t0` 1289 → 1369), exactly 2.00 cadence periods.** It contains **exactly one
  shot** — the ammo's 8→7 decrement, window [1329, 1349]. §1's arithmetic is right that a shot is there.
  But `groundtruth-f811-v4`'s own `debounce_shots` list contains **`t0` = 1329**: the reader detected it.
  The gap is in the owner's six-shot hand-count list, not in the detector's output.
- **The 149-frame gap (owner `t0` 1140 → 1289).** It contains **one shot plus a reload**, not ~4 shots:
  the counter reaches 1 at 1136, goes blank from 1176 to 1277 (101 frames against `marciana`'s datamined
  `reloadFrames` 111) and returns at 9. `reload_headroom` for that reload is 1 — one round was left, so
  one shot emptied the magazine — and the reader detected it too (**`t0` = 1176**).

So in the fixture window the reader detected every shot the ammo can account for, plus the one it
cannot. §1's spacing story predicted the right shots and attributed them to the wrong stage.

#### Decision rule — the "between" row fires; NOT forced into a bucket

Per video: `marciana` **0.5%** (row 2, ≤ 2%), `guilty` **4.8%**, `noir` **6.3%**, `isabel` **14.7%**
raw / **4.4%** admissible. Pooled **6.8%** raw / **3.9%** admissible. **No video clears 8% on a reading
whose arbiter is clean**, and only `marciana` clears ≤ 2%, so the board-level answer is the middle row:
**report as-is.** The channel is REAL and non-zero on every video, but on this evidence it is 3.9–6.8%
where 8–16% would be needed to carry the whole 0.8–1.6/10 cold bias — it can carry roughly **a quarter
to a half** of it, not all of it. [SUPERSEDED (2026-08-03) — disregard the preceding sentence's
3.9–6.8% ONLY as a PER-EVENT rate; it is an AGGREGATE (netted) figure and the two bases are now
measured to differ. Hand-counted windows read **16.7%** (`isabel`) and **17.4%** (`guilty`) per event
against aggregates of 5.6% and 13.0% — see §7. The 3.9–6.8% figure stands as what it is, the
whole-fight aggregate reading, and the "between" verdict it drives is unchanged.]

**What would decide it, stated explicitly.** (a) An owner hand shot-count on ONE non-`marciana` clip.
The gate validated this arbiter on `marciana` only, and `isabel` is where it matters — its raw and
admissible figures differ 3.4×. (b) Lifting the read rate above 52–71%: abstention is 96.2–99.6% on
stale-lock frames, so the arbiter is blind exactly where the detector is, and the unrecoverable hole
(`reload_headroom` 23–51 per fight) is the direct cost. A per-video atlas harvest is the cheap route.
[SUPERSEDED (2026-08-03) — disregard the last sentence only. The harvest route is REFUTED by
measurement: the read rate is segmentation/localization-limited, not atlas-limited, and a perfect
atlas is worth +0.21 pp honest / +4.8 pp nominal. See §5 below. Everything else in this paragraph
stands.]

#### Two arithmetic corrections to the arbiter, both found without ground truth

Committed as part of the instrument, both surfaced by whole-picture checks the pre-committed rule did
not encode, and neither changes the §3a gate result:

1. **`noir`'s reload UP-RAMP.** It has the fastest reload in scope (62 datamined frames) and its counter
   stays readable through the animation, ramping 1 → 3 → 6 → 9. Scoring each up as a reload gave **79
   reloads in a 190 s fight that fired 205 rounds from a 9-round magazine** — arithmetically impossible
   — and charged `reload_headroom` three times over (284). Consecutive ups with no shot between are now
   one reload: **29 and 51**.
2. **`isabel`'s two-frame glyph flips.** An 8 → 6 → 8 flip scores as 2 shots fired and 2 reloaded inside
   four frames. A drop of d over a w-frame window needs `w ≥ (d−1) × cadence`, so these are FLAGGED
   (reported, not enforced — the pre-committed rule's output stands beside the admissible-only figure).
   5 such events on `isabel`, 1 on `guilty`, 0 on `marciana` and `noir`. This is the whole difference
   between `isabel`'s 14.7% and 4.4%.

#### Confounds, each with a verdict

- **LOWER BOUND — CONFIRMED, and it is now OBSERVED rather than argued.** Shots inside a reload-spanning
  abstention gap are unrecoverable. The size of the hole is `reload_headroom` (40 / 23 / 43 / 51 per
  fight) — and the shots in it are directly visible as the `SPUR` column: 24 / 22 / 29 / 22 unmatched
  detected onsets against 26 / 21 / 28 / 29 reloads, i.e. **very nearly exactly one per reload, which is
  the round that emptied the magazine**. So MISSED under-counts by roughly one shot per reload, ~12% of
  shots fired. This does NOT rescue the ≥8% row: those shots were DETECTED, so they are arbiter blind
  spots, not reader misses. But it does mean `marciana`'s 0.5% is a floor on a fight where ~26 shots
  were never up for judgement.
- **Shared lock — CONFIRMED and quantified.** The ammo read reuses the dump's own localization, so
  abstention is 96.2–99.6% on stale frames versus 24.1–28.9% on good ones. Overall read rate 52.2–71.5%.
  The correlation is near-total, exactly as §2 predicted — which is why the method rests on decrements
  being recoverable ACROSS a gap rather than on any single frame. Note it also cuts the other way: the
  arbiter's blind spots coincide with the detector's, so a shot destroyed by a stale lock is one this
  measurement is LEAST able to see, and MISSED is biased low for that reason too.
- **The 8% threshold's dependence on landed-pellets-per-shot — MEASURED, unchanged.** 8.4 exactly (7,
  10, 8, 9, 8 on the owner's five real shots). Threshold stays 8–16%. ⚑ **SUPERSEDED (2026-08-04) —
  disregard "landed": §9A shows 8.4 is an f8–11 WINDOW count, so the threshold it feeds is
  window-conditional. §9A also argues it is probably still the right number (the cohort coexists on
  a flat plateau), but whether any marker fades before f08 is UNDETERMINED.**
- **Cadence not constant — CONTROLLED.** Cadence was measured from the ammo series itself, per dump, on
  single-shot decrements with no reload between (mode 20 at 30 fps, 40 at 60 fps), and reload-spanning
  gaps are excluded from the multiple sub-case. `gap ÷ 40` was used to generate hypotheses only; the
  ammo tested them.
- **Over-detection — REPORTED SEPARATELY, and it is very small.** `SPUR?` (unmatched onsets that are
  neither in a reload window nor outside the established level span) is **0 / 1 / 1 / 0** across the four
  full-fight dumps. On the groundtruth clip it is 1, and that one is `t0` = 3, before the first ammo
  level was established. MISSED and SPURIOUS are never netted anywhere in this entry.
- **n and scope — 770 ammo-reconstructed shots against 815 detected events, 4 videos, 4 units
  (`marciana` SG/Iron, `guilty`, `isabel`, `noir`), one full-fight dump each, plus one 60 fps clip with
  owner ground truth.** Only `marciana` has that ground truth, so the arbiter is gate-validated on one
  unit and merely internally-consistent on the other three. The three small 60 fps clips are
  re-extractions of windows already inside the full-fight dumps and are pooled nowhere.

RECORDS a measurement only. No guard, gate, threshold or constant was changed; no gate was added to the
live path; no `DECISIONS.md` entry was edited and no verdict is stamped. The reload-merge fix and the
admissibility flag are inside the new instrument and touch nothing the reader runs on. **If the missing-
shot channel is to be acted on, that is a separate gated pass** — and on these numbers it would be
acting on a quarter-to-a-half explanation, not a whole one.

**Reproduce:**

```sh
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py \
  --ammo-series  <dump>/tracks.json --ammo-series-frames <dump>/frames-pellet \
  --ammo-atlas scripts/probe/ammo-atlas --zoom 2 > <dump>-ammo.json
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --missing-shots <dump>-ammo.json --missing-shots-fps 30 --missing-shots-slack 8
# the gate (60 fps groundtruth clip only):
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --missing-shots gt-ammo-series.json --missing-shots-fps 60 --missing-shots-slack 6 \
  --missing-shots-gate
```

#### §4 THE OWNER HAND SHOT-COUNT — the arbiter validated on `isabel`, and the flip rule confirmed

Answers the ask in `docs/handoffs/closed/2026-08-01-OWNER-ASK-shot-count.md`, which §3b's "what would decide
it" named as item (a): the arbiter was gate-validated on `marciana` (SG/Iron — **not**
`marciana-marine-study`, AR/Iron) only, and `isabel` is where it mattered, because her raw and
admissible readings differ 3.4×.

**Owner ground truth.** Video `docs/probes/ar-sg-smg/isabel solo sg.MP4` (the dump's own
`pellets.json` records this exact path, `fps` 30, `at` 0), window **00:30.205 → 1:00.205**
(frames 906–1806): **36 shots fired, 4 clean full magazines.** The owner also reports a skill of
`isabel`'s firing rocket projectiles **2 times** in that window — no ammo cost, no pellet markers,
damage popups only. That is S2 "Pointed Feather", already measured 2026-07-16 as time-based
~14.7 s / ~12× per 180 s and modeled as `interval: 15` `flatDamage` 170.58 in
`src/skills/overrides/isabel.json`.

**Path correction to the ask doc.** It pointed the owner at `docs/probes/clean-weapons/`, which
contains no `isabel` recording. The recording is at `docs/probes/ar-sg-smg/isabel solo sg.MP4`, and
that is the clip the numbers below were read from.

**Instrument (committed, re-runnable).** `scripts/probe/analyze-pellet-tracks.py --hand-count`,
pinned by `scripts/tests/fixtures/pellets/hand-count-slice.json` and replayed with no images and no
subprocess by `--hand-count-selftest` (now wired into `scripts/probe/pellet-selftest.sh`). Two
subagents scored the window independently, one through that arm and one deriving from the raw JSON
while forbidden from reading the script.

##### §4.1 — The arbiter reproduces the hand count EXACTLY — it is now gate-validated on `isabel`

**32 visible decrements + 4 structurally invisible magazine-emptying rounds = 36**, equal to the
owner's count. Both agents reached it independently, under different level-acceptance rules.
Corroborated three ways by the independent derivation:

| corroboration                 | what it shows                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the accepted level trace      | the reconstructed 9→1 ladders account for every shot in the window                                                                                         |
| **61-frame reload invariant** | emptying shot → next `9` is 61 / 62 / 59 / 61 frames across the window's four magazines, and 61 frames in **12 of the clip's other 15** measurable reloads |
| **20-frame pellet grid**      | magazine A's nine detections at f910…f1070 are exactly 20 frames apart, nine times, with no drift                                                          |

Measured cadence **20 frames = 1.500 shots/s** (mode and median of 143 ammo spacings), matching §3b's
independently measured mode of 20 at 30 fps.

⇒ **The ammo arbiter's shot reconstruction is validated against owner ground truth on `isabel`, not
only on `marciana` (SG/Iron).** §3b's scope caveat — "gate-validated on one unit and merely
internally-consistent on the other three" — is retired for `isabel`. It still stands for `guilty` and
`noir`.

##### §4.2 — The flip rule is CONFIRMED, by an independent method

The independent derivation never used the cadence-arithmetic admissibility rule at all. From glyph
consistency alone it found that **all 11 raw `ammo: 0` reads across the whole clip sit inside an
8-run** — the pattern is `8, 8, 8, 0, 0, 0, 8, 8, 8`. The counter never credibly displays 0. So the
disputed drops are glyph misreads and discarding them was correct. [SCOPE-LIMITED (2026-08-03) — the
"sits inside an 8-run" FORM is `isabel`-specific and does not transfer: `guilty` has 3 raw `0` reads,
none inside an 8-run, two provably impossible and one indeterminate. The general conclusion — a `0`
read is untrustworthy — survives on both clips. See §7.8.]

⇒ **The ask's decision table, row 1 fires: the admissible reading (~4.4%) stands, and the raw 14.7%
is an artifact.** `isabel`'s 3.4× swing is RESOLVED in favour of admissible, and §3b's board-level
"between" verdict — the channel carries roughly a quarter to a half of the 0.8–1.6 pellets/10 cold
bias, not all of it — is unchanged by this measurement.

##### §4.3 — A defect in `reconstruct_ammo`, and it IS the swing — NOT fixed here

`reconstruct_ammo` has no magazine-consistency check. The 3-frame `0` at f1602–1604, sitting between
a confirmed 9 and a confirmed 8, is therefore scored as a `9 → 0` decrement — **minting 9 phantom
shots** — plus a phantom `0 → 8` reload. Inside the window that inflated the raw reading to **40
decrements / MISSED 11** (of which **8 are phantom**, all inside that one decrement) against the true
**32**. `flag_inadmissible_decrements` REPORTS these events, but the raw MISSED figure does not
exclude them — which is precisely the raw-versus-admissible split. (The implied-total figure that
originally accompanied this — 44 — was computed before the reload-accounting correction below; the
corrected instrument reports a raw implied total of **45**.)

Whole-clip, five decrements are flagged inadmissible:

| window (frames) | transition | claimed shots |
| --------------- | ---------- | ------------- |
| 686 → 686       | 8 → 6      | 2             |
| 1596 → 1602     | 9 → 0      | 9             |
| 1833 → 1833     | 8 → 6      | 2             |
| 4668 → 4673     | 9 → 6      | 3             |
| 5363 → 5363     | 8 → 0      | 8             |

**The defect is explicitly NOT fixed in this pass.** `reconstruct_ammo` is shared with the whole-fight
numbers already recorded in §3b above and pinned in
`scripts/tests/fixtures/pellets/missing-shots-slice.json`, so changing it has whole-fight blast radius
and needs its own deliberate pass. What DID land is reporting-only: the `--hand-count` arm now emits
admissible-basis fields (`decrement_shots_admissible`, `n_reloads_admissible`,
`implied_total_admissible`, `ammo_implied_total_admissible`, `ammo_total_admissible_matches_hand`)
**alongside** the raw ones, never instead of them, capping each flagged decrement at what its window
can physically hold at the measured cadence — the exact inverse of the flag's own predicate. On this
window that reads **32 decrements + 4 magazine-empty = 36, MATCHES the hand count**, where the raw
headline reads 40 / 45.

⚑ **The cap rule is calibrated on the `9 → 0` case only and does NOT generalise.** It assumes a
flagged window still holds ONE real shot, which is right when the misread interrupts a genuine
decrement (f1596–1602 sits between a confirmed 9 and a confirmed 8, so exactly one round was fired).
For a ZERO-WIDTH flip — the `8 → 6` events at f686 and f1833 — it credits 1 shot, but if the `6` was a
pure glyph misread and the level never left 8 the truth is **0**. Those two events are outside the
counted window, so nothing here rests on them.

###### The reload-accounting correction — the first route to 36 was a coincidence

**Recorded because the answer was right for the wrong reason, and it had already been pinned in a
committed fixture.** As first written, the arm reached `32 + 4 = 36` only because two errors
cancelled:

- it counted the **phantom** `0 → 8` reload at f1605 (**+1**), which no magazine performed; and
- it excluded the window's **fourth** magazine's **real** reload, whose `lo` is f1756 but whose `hi` is f1817 — 11 frames
  past the window's end — because reload events were scored by `hi` (**−1**).

The total was sound; the instrument's route to it was not. Two corrections, both in
`hand_count_report` only:

1. **Reload events take window membership from `lo`, not `hi`.** A reload's `lo` is the frame the
   counter goes blank — essentially the magazine-emptying shot's own frame — while its `hi` is when
   the next magazine's count appears, which can fall outside a window whose emptying shot was inside
   it. Decrement events still use `hi`, the transition frame.
2. **A reload immediately following an inadmissible decrement is dropped from the admissible basis**
   as the counter recovering from the same glyph misread, not a magazine change.

After the fix the in-window reload `lo` values are **1070, 1302, 1529, 1756** — four REAL
magazine-emptying rounds, phantom f1605 excluded — so **32 + 4 = 36 for the right reasons**. The raw
basis keeps the phantom and gains the f1756 reload the `hi` rule had been dropping, moving from 4
reloads to **5** and its implied total from 44 to **45**; both readings still print.

**Knob-stable.** The admissible **32 + 4 = 36** holds identically at slack 3 / 6 / 8 / 10 / 12, as
does the raw 40 + 5 = 45 — the ammo reconstruction does not depend on the matcher's slack at all,
which is the same reason §4.7's `detected_in_window` is flat across the sweep.

##### §4.4 — The in-reload extras are NOT the rockets — REFUTED

The natural reading of the owner's "2 rocket events" was that the arm's non-ammo extra onsets are S2
projectiles. They are not:

- **Not periodic.** The whole-clip scan finds **6 distinct such events across 190.7 s**, with spacings
  30.4 / 22.7 / 49.5 / 8.8 / 6.4 s — median 22.7 s, standard deviation ≈ 16 s. A ~15 s cooldown does
  not produce that.
- **Phase-locked to the magazine instead.** **6 of 7 bursts sit +16 to +18 frames (0.533–0.600 s)
  after their own magazine's emptying round** — a spread under 0.07 s across four minutes of footage.
- **Mechanism.** At a 20-frame cadence a +17-frame echo is buried under the next shot everywhere
  EXCEPT after a magazine's final round, which is precisely and only where it appears.

⚠ **Do not cite the `--hand-count` arm's "median gap 14.48 s" as a ~15 s period.** It is a coincidence
of an irregular set — that set's gaps include 0.67 s and 39.63 s — and the resemblance to S2's ~14.7 s
cadence is accidental.

⚠ **Two different whole-clip counts are in play, and they are not reconciled here.** The committed arm
reports `n_extras_whole_clip` **9** (8 gaps, median 14.48 s); the independent derivation counted **6
distinct events** (5 gaps, median 22.7 s). Anyone re-running the reproduce command below will see 9,
not 6. Neither count is periodic and the phase-lock result above holds on either, but the difference
itself is unexplained and belongs to the same question as the ⚑ below.

⚑ Whether the echo is a delayed projectile impact, a reload-visual-effect artifact of the reader, or a
late pellet-marker render is **UNDETERMINED** from these files.

##### §4.5 — The aggregate 34-vs-36 hides COMPENSATING ERRORS — the finding that matters most

`pellets.json` reports **34 detections** in the window against **36 real shots**, which reads as a
5.6% under-count. Judged per event it is not one: the reader **misses 6 real shots AND invents 4
non-shots**, a true miss rate of **16.7%** — three times the aggregate figure. The shipped matcher at
slack 8 scores the same window more conservatively at **4 missed / 11.1%**. Either way the window's
miss rate is **well above the 4.4% whole-fight admissible figure and at or above the 8% bar**.

⚑ **n=1 window, HYPOTHESIS-strength for the rate.** Per the evidence-proportionality rule this RECORDS
an observation. It does **not** overturn the whole-fight 4.4% / 14.7% headline, does not change any
constant, guard, gate or threshold, and does not re-stamp the missing-shot channel's size. Treating
16.7% (or 11.1%) as the channel's rate requires a second hand-counted window on a different unit or
clip. [SUPERSEDED (2026-08-03) — disregard the last sentence only: that second window EXISTS. A
`guilty` hand count over 00:42.8–1:02.8 reads **17.4%** per event against a 13.0% aggregate, within
0.7 pp of the 16.7% here while the aggregates differ 2.3× — and the misses are traced to cluster-merge
in `debounce_shots`. See §7. The n=1 caveat on the RATE is now n=2 / MEDIUM, still below the n ≥ 5
board standard; everything else in this paragraph stands.]

##### §4.6 — Near-empty detections

**6 of the 34** in-window detections carry a `total` of 0, 1 or 2 pellets — frames 1124, 1180, 1511,
1534, 1665, 1729 — against the measured 8.4 landed pellets per shot. Summed pellet total over all 34
detections is **221**; the owner's 36 shots × 8.4 implies **~302**. ⚑ **SUPERSEDED (2026-08-04) —
disregard "landed": §9A shows 8.4 is an f8–11 WINDOW count, so both sides of this 221-vs-302
comparison are single-window observations taken in DIFFERENT windows (§9C).** ⚑ Reported as an
observation only;
no cause is assigned here. One of the six, frame 1124, is also one of the window's two non-ammo extra
onsets (the other being 1546), so the near-empty set and the §4.4 echo overlap but are not the same
set.

##### §4.7 — Knob sensitivity — stated plainly

| quantity                          | slack 3 | 6   | 8   | 10  | 12  |
| --------------------------------- | ------- | --- | --- | --- | --- |
| `detected_in_window`              | 34      | 34  | 34  | 34  | 34  |
| naive missed (every onset a shot) | 2       | 2   | 2   | 2   | 2   |
| `MISSED` (arbiter basis)          | 14      | →   | →   | →   | 10  |
| `SPURIOUS`                        | 8       | →   | →   | →   | 4   |
| `extras_in_window`                | 2       | 2   | 2   | 1   | 1   |
| `MISSED_vs_hand`                  | 4       | 4   | 4   | 3   | 3   |

`detected_in_window` (34) and the naive reading (2 missed / 5.6%) are **identical at every slack
3 / 6 / 8 / 10 / 12**. `MISSED` on the arbiter basis moves 14 → 10 and `SPURIOUS` 8 → 4,
monotonically. `extras_in_window` drops 2 → 1 at slack ≥ 10, which moves `MISSED_vs_hand` 4 → 3, i.e.
11.1% → 8.3%.

##### Confounds, each with a verdict

- **Magazine-emptying blind spot — CONFIRMED, and the hand count is what corrects it.** The arbiter
  counts decrements, so the round that empties each magazine is invisible to it. §3b flagged its
  figures as a floor for exactly this reason. The hand count supplies the true denominator (36), and
  the 4 magazine-empty rounds close the gap to the 32 visible decrements.
- **The flip rule was the analyst's rule, not a measurement — RESOLVED (§4.2).** Confirmed by an
  independent method that never used it.
- **`reconstruct_ammo` phantom shots — IDENTIFIED, quantified, NOT enacted on (§4.3).** Blast
  radius is whole-fight; deferred to its own pass and filed in `docs/handoffs/QUEUE.md`.
- **Rockets as a confound on the extras — REFUTED (§4.4).** The extras are phase-locked to the
  magazine, not to the ~15 s skill cadence.
- **Aggregate-versus-per-event scoring — the aggregate is misleading (§4.5).** 34-vs-36 nets a
  6-shot miss against a 4-shot invention. MISSED and SPURIOUS are not netted anywhere in this entry.
  [REPLICATED (2026-08-03) — §7 reproduces this on `guilty` at n=2: per-event 17.4% vs aggregate
  13.0%, and the mechanism is cluster-merge in `debounce_shots`.]
- **n and scope — one 30 s window, one unit (`isabel`), one clip.** HYPOTHESIS-strength for any rate
  it implies; ground-truth-strength for the two binary questions it was run to settle (does the
  arbiter reconstruct correctly on `isabel`, and is the flip rule right), both of which it answers
  affirmatively. [SUPERSEDED (2026-08-03) — disregard "one unit, one clip" as the standing scope for
  the RATE: §7 adds a second window on `guilty`, so the rate is n=2 / MEDIUM. The two binary questions
  remain `isabel`-scoped, and ⚑ §7.8 finds that §4.2's specific "every raw `0` sits inside an 8-run"
  form does NOT transfer to `guilty` — only the general conclusion (a `0` read is untrustworthy) does.]

RECORDS a measurement, plus reporting-only tooling. No guard, gate, threshold or constant was changed;
no `DECISIONS.md` entry was edited; `reconstruct_ammo` itself is untouched.

**Reproduce:**

```sh
# <dump>-ammo.json comes from count-pellets.py --ammo-series exactly as in §3b, on the
# h4-isabel-structural dump of docs/probes/ar-sg-smg/isabel solo sg.MP4
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --hand-count <dump>-ammo.json \
  --hand-count-window 30.205 60.205 --hand-count-at 0 --hand-count-fps 30 \
  --hand-count-slack 8 \
  --hand-count-shots 36 --hand-count-magazines 4 --hand-count-nonammo 2
# replay the committed slice -- no images, no subprocess:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --hand-count-selftest
```

#### §5 THE AMMO READ RATE IS NOT AN ATLAS PROBLEM — the red-digit harvest, refuted before it was built

Answers §3b's "what would decide it" item (b) — "lifting the read rate above 52–71%" — and the second
item of `docs/handoffs/closed/2026-08-01-OWNER-ASK-shot-count.md`, which asked the owner for a nod on a
per-video red-digit atlas harvest. **The nod is not needed: the harvest is REFUTED on measurement.**
The ammo OCR's abstentions are overwhelmingly SEGMENTATION and LOCALIZATION failures, which no digit
template can fix. **This is a measurement, not a judgement call — it does not need re-testing before
someone declines the work again.**

**Instrument (committed, re-runnable).** `scripts/probe/analyze-pellet-tracks.py --ammo-abstention`,
pinned by `scripts/tests/fixtures/pellets/ammo-abstention-slice.json` and replayed with no images and
no subprocess by `--ammo-abstention-selftest`, which is registered in
`scripts/probe/pellet-selftest.sh`.

**Scope.** 7 read series, 4 units (`isabel`, `guilty`, `marciana` — SG/Iron, **not**
`marciana-marine-study`, AR/Iron — and `noir`), **24,319 frames**.

##### §5.1 — ⚑ THE PREMISE CORRECTION: the atlas is NOT white-only, and "per-video" has no support

The standing claim that the atlas "was harvested white-only" is **FALSE.**
`scripts/probe/ammo-atlas/` holds **141 glyphs: 69 white (`_f*`) + 72 red (`_red*`)**. Red is already
represented, and red counters already read successfully **33–52%** of the time on every video.

Further, the "per-video" framing has no support either — the red threshold and the glyph set are
identical across units:

- All four units render red **identically**, at **ammo ≤ 4**.
- Every unit's magazine is **9**, so the counter only ever displays `001`–`009`.
- ⇒ The digits that can ever appear in red are **0–4 only** — exactly the set the existing 72 red
  glyphs cover. Digits 5–9 have no red exemplar because they never render red.

##### §5.2 — Read rate, and the three fields that must never be conflated

14,731 of 24,319 frames produced a value: **60.6%**.

| field               | value      | meaning                                             |
| ------------------- | ---------- | --------------------------------------------------- |
| `n_read_any_lock`   | **14,731** | every frame that produced a value                   |
| `n_read_good_lock`  | **14,694** | of those, on a frame whose crosshair lock was fresh |
| `n_read_stale_lock` | **37**     | of those, on a frame whose lock was stale           |

14,694 + 37 = 14,731. A non-null read has **already cleared the 0.60 score gate by construction**, so
"reads above threshold" is not a separate population and must not be reported as one.

Per video:

| series               | frames | read | rate      |
| -------------------- | ------ | ---- | --------- |
| `isabel` (h4)        | 5721   | 3163 | **55.3%** |
| `guilty` (h4)        | 5738   | 2998 | **52.2%** |
| `marciana` (h4)      | 5697   | 3564 | **62.6%** |
| `noir` (g2)          | 5722   | 4043 | **70.7%** |
| `i2-marciana-60fps`  | 480    | 287  | **59.8%** |
| `i3-noir-far-60fps`  | 480    | 343  | **71.5%** |
| `i3-noir-near-60fps` | 481    | 333  | **69.2%** |

##### §5.3 — Abstention reasons, and the four-way classification

Pooled over all 24,319 frames:

| reason       | frames    | % of frames | class           |
| ------------ | --------- | ----------- | --------------- |
| `cell-count` | **4,092** | 16.8%       | SEGMENTATION    |
| `no-digits`  | **3,643** | 15.0%       | SEGMENTATION    |
| `low-score`  | **1,171** | 4.8%        | **GLYPH-MATCH** |
| `no-lock`    | **682**   | 2.8%        | LOCALIZATION    |

The classification is not a guess — the emission sites were traced in `scripts/probe/count-pellets.py`
(all line references verified un-drifted) and are encoded as `ABSTENTION_CLASS` at
`analyze-pellet-tracks.py:1727`: `no-lock` is emitted at `count-pellets.py:902` (LOCALIZATION);
`no-digits` and `cell-count` both at `count-pellets.py:867` (SEGMENTATION); `low-score` at
`count-pellets.py:877` (GLYPH-MATCH). **GLYPH-MATCH is the only atlas-fixable class.**

| class        | abstentions | share of abstentions |
| ------------ | ----------- | -------------------- |
| SEGMENTATION | **7,735**   | **80.7%**            |
| GLYPH-MATCH  | **1,171**   | **12.2%**            |
| LOCALIZATION | **682**     | **7.1%**             |

##### §5.4 — Both ceilings on a perfect atlas

- **NOMINAL** — the whole GLYPH-MATCH class becomes perfect reads and nothing else changes:
  **60.6% → 65.4%, +4.8 percentage points** pooled; per video **+4.0** (`marciana`, SG/Iron) to
  **+8.8** (the `i2-marciana-60fps` series — same unit, a 60 fps window re-extraction).
- **HONEST** — the sub-population a harvest could actually operate on: **+0.21 percentage points.**

##### §5.5 — The stale-lock confound, which is the real limiter

Pooled, **19.4%** of frames carry a stale lock. Read rate is **74.9% on good-lock frames** versus
**0.8% on stale-lock frames**. And **97.0% of `no-digits` abstentions (3,534 of 3,643) fall on
stale-lock frames** — per-video share 93.8–100%.

Mechanism, and it is the same one §3b/§2 already established: the ammo read reuses the dump's OWN
crosshair localization, so when the lock is stale the crop handed to the segmenter **is not the ammo
box at all**. No digit template can help a crop that does not contain the counter.

Good-lock sub-populations, split on the series' own `conf` at a threshold of 60 — ⚑ a **PROXY** for
"the reader is on the semi-transparent ammo badge", not a calibrated boundary:

| sub-population  | n          | read rate | `low-score` rate |
| --------------- | ---------- | --------- | ---------------- |
| dark-badge      | **7,693**  | **89.3%** | **0.9%**         |
| bright-surround | **11,237** | **69.6%** | **9.5%**         |

##### §5.6 — What the GLYPH-MATCH frames actually are — occlusion and popups, not missing exemplars

Of the 1,171 GLYPH-MATCH frames, **58 (5.0%) are red-dominant and 1,113 (95%) are white**.

- **The white ones are not the counter.** They are floating battle-damage popups that the structural
  locator mistook for it — rendered crops read `36353`, `27964`, `41088`, `20115`. A digit atlas is
  the wrong tool for a frame that is looking at the wrong thing.
- **Dark-badge GLYPH-MATCH is 69 frames, of which dark ∧ red = 52** — 4.4% of GLYPH-MATCH, **0.21% of
  all frames**, which is where the HONEST ceiling of §5.4 comes from. (69 = 52 red + 17 white
  confirms the intersection independently.)
- **Every rendered dark-badge case is a legible red `001`–`004` with a bright circular muzzle-flash
  blob occluding a glyph.** That is **occlusion, not a missing exemplar** — harvesting them would
  teach the matcher to accept corrupted digits.

##### §5.7 — Cost of the refuted harvest, and why self-training does not rescue it

⚑ ESTIMATE: ~**7.7 h** of hand labelling (7 videos × ~1.1 h), plus a permanent **~7× increase in
per-frame digit-match cost**, to buy +0.21 pp.

A self-training route can bootstrap labels from the 14,694 confident reads, but it is **circular by
construction**: it can only harvest glyphs the current atlas already matches above threshold, so it
cannot reach the out-of-distribution failures that are the entire point of the exercise.

##### §5.8 — Data quality: a bigger atlas would make it WORSE, not better

~**30–40 confidently wrong reads per fight** already exist — damage numbers read as ammo: `isabel`
`209`×11 / `309`×17 / `300`×6; `guilty` `932`×4; `noir` `908`×5 / `608`×4. Most are caught downstream
by `reconstruct_ammo`'s `> ammo_max` filter, **but nothing catches one that happens to land inside
0–9.** A larger atlas would convert abstentions in this same population into MORE such reads.

##### §5.9 — Costed alternatives (⚑ ESTIMATES, not recommendations)

| lever                       | coverage gain                       | cost                                         | caveat                                                                                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix stale-lock localization | ~~**+14.3 to +17.1 pp**~~           | days                                         | **SUPERSEDED (2026-08-03) — disregard this row.** Measured with an oracle localizer in §6: the real gain is **+0.18 pp demonstrated / +1.33 pp optimistic bound**, because 70.2% of stale frames render no digits at all. REFUTED, not deferred                         |
| Safe temporal interpolation | **+4.7 pp measured** (1,149 frames) | 2–4 h, pure post-processing on existing JSON | Fills abstention runs ≤ 5 frames whose bracketing levels differ by ≤ 1. **It NARROWS decrement windows; it does not recover shots hidden in long gaps** — 58–91% of abstained frames sit in runs > 10 frames, max 226 frames = 7.5 s, longer than a full magazine cycle |
| Bright-surround gate        | ~0 pp (accuracy, not coverage)      | 0.5–1 day + a threshold study                | Removes most confidently-wrong reads, but 7,825 good/bright frames DO read correctly, so a naive cut costs real reads                                                                                                                                                   |
| Relax the 3-cell gate       | up to **+10.1 pp** nominal          | needs a positional rule                      | Place value becomes ambiguous — dropping the last glyph of `004` reads `0`, not `4`                                                                                                                                                                                     |

##### Confounds, each with a verdict

- **"Maybe the atlas is white-only after all" — REFUTED by direct inspection.** 141 files in
  `scripts/probe/ammo-atlas/`, 69 white + 72 red, and the red set covers digits 0–4, which is the
  complete set of digits that can render red at magazine size 9.
- **"Maybe the classification mislabels the buckets" — CONTROLLED.** Each reason string was traced to
  its single emission site in `count-pellets.py` (lines 867 / 877 / 902), not inferred from its name.
- **Stale lock as a confound on the ceiling — CONFIRMED and quantified (§5.5).** 97.0% of the largest
  abstention bucket is stale-lock, which is why the NOMINAL and HONEST ceilings differ by 23×.
- **The `conf` 60 split — ⚑ PROXY, stated as one.** It stands in for "on the dark ammo badge" and is
  not a calibrated boundary; the sub-population rates in §5.5 inherit that caveat.
- **n and scope — 24,319 frames, 7 series, 4 units, one full-fight dump each plus three 60 fps
  window re-extractions.** The three small clips are re-extractions of windows already inside the
  full-fight dumps and are pooled here only in the whole-frame totals, consistent with §3b.

⚑ **Open, could not be determined from these files:** (1) whether the 682 `no-lock` frames are
recoverable at all — **item (1) is ANSWERED (2026-08-03, §6.2): NO.** All 682 are contiguous from
index 0, before the first acquisition, so there is nothing to carry forward; (2) whether the
confidently-wrong reads of §5.8 propagate into the `--missing-shots` arithmetic already recorded in
§3b above.

RECORDS a measurement, plus a reporting-only instrument. No guard, gate, threshold or constant was
changed; no `DECISIONS.md` entry was edited. The one enactment is a **decline**: the per-video
red-digit atlas harvest is refuted and struck from the live handoff docs.

**Reproduce:**

```sh
python3 scripts/probe/analyze-pellet-tracks.py --ammo-abstention \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp/{h4-isabel,h4-guilty,h4-marciana,g2-noir,i2-marciana-60fps,i3-noir-far-60fps,i3-noir-near-60fps}-ammo.json \
  --ammo-abstention-frames
# --ammo-abstention-frames enables the colour classification; without it the colour
# columns report `n/a` rather than guessing.
# replay the committed slice -- no images, no subprocess:
python3 scripts/probe/analyze-pellet-tracks.py --ammo-abstention-selftest
```

#### §6 STALE LOCKS ARE NOT RECOVERABLE — the +14.3 to +17.1 pp localization estimate, refuted

Answers §5's own top open lever and its ⚑ open item (1), "whether the 682 `no-lock` frames are
recoverable at all". **They are not, and neither are the 4,707 stale ones — for a reason that makes
the whole lever void rather than merely expensive.**

**THE REFUTATION, first.** §5.9 costed "fix stale-lock localization" at **+14.3 to +17.1 percentage
points** of read rate, by assuming stale frames would read at the good-lock **74.9%** rate once the
crop was pointed at the ammo box. That assumption is FALSE. **70.2% of stale frames have no number
rendered in the badge at all** — they are RELOAD frames, where the widget is present, crisp and
perfectly localizable but its three digit cells are empty. A perfect localizer hands the segmenter a
correctly-cropped picture of an empty counter. Measured directly with an oracle localizer, the
demonstrated gain is **+0.18 pp** pooled, and the optimistic bound — itself contradicted by frame
inspection — is **+1.33 pp**. The lever is **REFUTED, not deferred.** The estimate was never
measured; §6.7's oracle is the measurement it lacked.

**Instruments (committed, re-runnable).** `scripts/probe/analyze-pellet-tracks.py
--ammo-oracle-ceiling`, pinned by `scripts/tests/fixtures/pellets/ammo-oracle-ceiling-slice.json` and
replayed with no images, no atlas and no subprocess by `--ammo-oracle-ceiling-selftest`, registered in
`scripts/probe/pellet-selftest.sh` (**15 arms**). The prior arms `--ammo-abstention` (§5) and
`--stale-counting` (2026-08-01) carry the abstention and downstream-impact numbers below.

**Scope.** The same 7 committed dumps as §5 — 4 units (`isabel`, `guilty`, `marciana` — SG/Iron,
**not** `marciana-marine-study`, AR/Iron — and `noir`), four full-fight 30 fps dumps plus three 60 fps
window re-extractions of ranges already inside two of them.

##### §6.1 — The mechanism, confirmed three ways

**Stale ⟺ `locate_ammo_structural` returned ZERO candidates for that frame.** Not "the locator chose
badly"; there was nothing to choose from.

1. **Code.** The confidence slot is `None` on exactly one path — `locate_crosshair_structural`'s
   `if not cands:` branch, which carries `last_acc` forward.
2. **Data.** `count(conf is None) == count(stale) + count(no-lock)` **exactly**, in all 7 dumps:
   `isabel` 1469 = 1349 + 120; `guilty` 1905 = 1781 + 124; `marciana` (SG/Iron) 1218 = 994 + 224;
   `noir` 667 = 453 + 214; the three 60 fps clips 66 / 39 / 25, each + 0.
3. **Direct.** The shipped locator was re-run on **730 sampled stale frames** and returned **zero
   candidates on all 730**.

##### §6.2 — `no-lock` and stale are DISJOINT, and together they partition "zero candidates"

Overlap is **0 in every dump**. All **682** `no-lock` frames are **contiguous from index 0** — 120 /
124 / 224 / 214 leading frames on the four 30 fps dumps, **0** on the 60 fps clips. They are
pre-first-acquisition: `last_acc is None`, so there is nothing to carry forward. That is what a
`no-lock` frame IS, and it disposes of §5's open item (1) — there is no recovery to perform on a
frame that precedes the first lock.

##### §6.3 — What the 4,707 stale frames actually are

| category                    | frames    | share     |
| --------------------------- | --------- | --------- |
| **RELOAD, counter blank**   | **3,305** | **70.2%** |
| END-OF-FIGHT, HUD gone      | 681       | 14.5%     |
| OTHER, 1–2 frame transients | 688       | 14.6%     |
| INTRO / pre-fight           | 33        | 0.7%      |

The OTHER bucket is visual-effect / particle occlusion and popup swamp. **During reload the badge is
present, crisp and perfectly localizable, but its three digit cells carry no glyph** — frame _i_ shows
the empty widget, frame _i+1_ shows `009`.

**Four independent confirmations that the 70.2% bucket is the reload:**

- The on-screen `RELOADING…` bar is up across those frames.
- Ammo goes 0/1 → full across the run, every run.
- Run length is a **per-unit constant**: `marciana` (SG/Iron) **31 frames = 1.03 s** with **10 of 21
  runs exactly 31**; `isabel` **41 frames = 1.37 s**; `guilty` **63 frames = 2.10 s**.
- Staleness rises steeply with time since the last shot — **4.3–4.7%** at `t0+8…t0+11` versus
  **18.9%** at `t0+20`, **25.6%** at `t0+40`, **29.9%** at `t0+60`. Deep into a magazine cycle is
  exactly where a reload sits.

##### §6.4 — Which stage fails (730 sampled stale frames)

| stage                                                  | share    | note                             |
| ------------------------------------------------------ | -------- | -------------------------------- |
| **A** — `_digit_glyph_mask` finds no digit-shaped blob | **~19%** | 15–35% on 30 fps, 3–8% on 60 fps |
| **B** — groups exist, none of size 2–3                 | **~81%** | the dominant stage               |
| **C** — `bg.size == 0`                                 | **0**    | never fires                      |

`templ_h` is **not implicated**: the control arm of §6.5 decodes **99.2%** at the same `templ_h = 74`.
The group-size histogram is dominated by **size 1** (isolated fragments) with a tail at **4–8**
(damage popups) and **never 2–3** — so relaxing `STRUCT_ROW_SIZES` to admit 4–5 admits damage popups
specifically. That is not a tuning trade-off; it is the one thing the row-size gate exists to reject.

##### §6.5 — The oracle ceiling — a perfect-lock proxy, with a control arm

Give each stale frame the digit-row centre of a read-confirmed good lock within **±2 frames** and
re-decode. The ROI is **214×124**, so a neighbour's centre is a faithful stand-in for a perfect lock.

**CONTROL arm — the same oracle on frames that ALREADY read.** **2,216 / 2,234 = 99.2%** still decode
at the borrowed centre, and **2,215 of 2,216 return the identical value**. The single mismatch is
`i=2204` — `304` at the borrowed centre versus `4` at its own — and that is the oracle's measured
error floor, listed rather than merely counted. **Only with this arm does the stale arm mean
anything**: without it, silence in the stale arm could be the oracle's own failure.

**STALE arm.** Only **519 of 4,707** stale frames even have such an oracle. Of those, **43 (8.3%)**
decode.

| outcome                 | frames |
| ----------------------- | ------ |
| decoded                 | **43** |
| `no-digits`, cells = 0  | 231    |
| `cell-count`, cells = 1 | 178    |
| cells 4–6 (31/20/2)     | 53     |
| cells = 2               | 8      |
| `low-score`             | 6      |

231 + 178 + 53 + 8 + 6 = **476** failures, + 43 decodes = **519**. The ledger balances. All 43 decodes
are consistent with the bracketing ammo level — **33 identical, 10 off by exactly 1** — and there are
**zero impossible values**, so the oracle is not manufacturing reads.

##### §6.6 — The honest ceiling

- **DEMONSTRATED: +0.18 pp** pooled — the 43 frames that actually decoded under a perfect lock.
- **OPTIMISTIC BOUND: +1.33 pp** — extrapolating each dump's 8.3% oracle rate to all of its stale
  frames. Per dump: `isabel` +1.35, `guilty` +2.05, `marciana` (SG/Iron) +0.89, `noir` +1.22,
  `i2-marciana-60fps` +0.00, `i3-noir-far-60fps` +0.74, `i3-noir-near-60fps` +1.04.
- ⚑ **The bound is itself contradicted by the frame inspection of §6.3**: the frames that lack a
  ±2-frame oracle are the ones DEEP inside a stale run, and those are precisely the blank-counter
  reload frames. Extrapolating the edge-of-run rate into the middle of the run assumes the opposite of
  what §6.3 measured. Treat +1.33 pp as an upper bound that will not be reached.

**⇒ against §5.9's +14.3 to +17.1 pp, the measured range is +0.18 to +1.33 pp — one to two orders of
magnitude smaller, and for frames whose semantic content is "reloading", not a magazine level.**

##### §6.7 — Relaxation is STRICTLY WORSE than holding, and both free precision checks fail as filters

Whole-run simulation under the shipped continuity rule (`max_disp = 150`), seeded from a
read-confirmed good lock and judged at the far end against another, **n = 331** bracketed runs:

| policy                 | end-of-run error, median       | within 40 px |
| ---------------------- | ------------------------------ | ------------ |
| **HOLD** (ships today) | **27.8 px**                    | **61.3%**    |
| `localcontrast20`      | 254.9 px                       | 25.7%        |
| `darkbadge`            | 0–4% candidate rate — unusable |              |

And the two free precision checks cannot rescue a relaxed candidate set: **92–97% of the wrong
recoveries fall INSIDE the good-lock envelope**, because the box legitimately traverses almost the
whole screen (x **353–2582**, y **22–762**). There is no cheap geometric filter to add.

##### §6.8 — ONE lock, not two — proven twice

`cross_pos = center + (struct_offset_x, struct_offset_y)` in code, and empirically
`cross_positions − cross_rawloc` = **(162, −12) or (162, −13)** = (81·zoom, −6.25·zoom) in **100% of
frames in all 7 dumps**. The pellet crosshair IS the ammo digit-row centre plus a constant. They go
stale together, always — so "fix the ammo localization" and "fix the crosshair localization" were
never two workstreams, and neither is available here.

##### §6.9 — Downstream impact on the counter is small, and the WRONG SIGN

Via the committed `analyze-pellet-tracks.py --stale-counting` arm, 30 fps dumps, rate-equivalent
window `t0+4…t0+6`: all-frames stale **20.01%** versus counting-frame **6.05%** — enrichment
**0.303×**, i.e. stale is strongly **depleted** exactly where pellets are counted. **91 of 815** shots
carry ≥1 stale counting frame. The exclude−include A/B over the 77 affected shots: median **+0.000**,
mean **−0.223**, diluted **−0.0211 pellets/shot = −0.21 pellets/10**.

⇒ Against the **0.8–1.6 pellets/10** cold bias, stale locks bound at ~**0.2 pellets/10 (13–26%) and
with the WRONG SIGN** — excluding stale frames makes the counts COLDER, not warmer. ⚑ The
2026-08-01 circularity caveat still stands unchanged: shot detection is downstream of the lock, so the
low counting-frame rate is partly selection.

##### §6.10 — The missing-shot channel barely moves either

Ammo change across bracketed stale runs: **drop-0 (71), drop-1 (99), drop-2 (3), drop-9 (2), refill
(9)**. Only **5 runs pooled across all 7 videos** show a drop greater than 1 that a stale window could
be hiding. Recovering stale frames would surface **≲5 extra shot events out of 815** — the `MISSED`
floor barely moves.

##### §6.11 — LANDED: held-lock signalling (commit `8ecad5a7`) — detection UNCHANGED

The half of the work that survives the refutation is the SIGNAL, not a recovery.
`locate_crosshair_structural` now returns **`(center, score, held)`**; `--dump-tracks` /
`--dump-detections` gain a per-frame **`cross_held`** array (the template path's own carry-forward
branch records it too); `ammo_series_from_dump` labels an abstention on a held lock **`held-lock`**,
preserving the segmentation reason as `seg_reason`, and `held-lock` joins `ABSTENTION_CLASS` as **its
own class** rather than being folded into SEGMENTATION — attributing a localization state to
segmentation was the defect, not the fix. The docstring, which previously claimed "no carry-forward"
while the code carried forward, now states what the function does.

**`stale_mask()` PREFERS `cross_held` when present and falls back to the pre-existing per-mode
inferred rule when absent, so every committed dump and fixture scores exactly as before — nothing
needed regeneration.** No detection number moves.

##### §6.12 — Cost of the detection fix that was NOT done

⚑ ESTIMATE. A `locate_badge_structural` second tier is buildable — during reload the dark rounded
badge and its three empty slot rectangles are crisp and geometrically fixed. ~**150 LOC** for the
tier, ~**40 LOC** for second-tier wiring and tier signalling, ~**80 LOC** plus JSON for a committed
fixture, plus **2–4 h wall-clock re-extraction** ⇒ ~**270 LOC and a 4–6 h session**, buying **≤+1.6 pp**
read rate on frames whose semantic value is "reloading" rather than a magazine level, with the
popup-capture risk of §6.4 already measured. **Not done, and NOT RECOMMENDED on these numbers.**

##### Confounds, each with a verdict

- **"The stale frames are mislocalized, not blank" — REFUTED three ways (§6.1).** Stale is exactly
  "zero candidates", by code path, by an exact per-dump count identity, and by re-running the shipped
  locator on 730 sampled frames.
- **"The oracle's own error floor could be hiding real reads" — CONTROLLED (§6.5).** The control arm
  decodes 99.2% of already-reading frames at a borrowed centre, 2,215 of 2,216 to the identical value.
  The stale arm's 8.3% is measured against that floor, not against an assumption.
- **"`templ_h` is mis-set for these frames" — REFUTED.** The control arm decodes 99.2% at the same
  `templ_h = 74`.
- **"Relax the row-size gate and the candidates come back" — MEASURED WORSE (§6.7).** The group-size
  tail is at 4–8 and those are damage popups; the relaxed policies land 254.9 px out at the far end of
  a run against HOLD's 27.8 px, and no free precision check separates them.
- **"The extrapolated +1.33 pp is the real number" — ⚑ STATED AS AN UPPER BOUND, and contradicted by
  §6.3.** Frames without a ±2-frame oracle are the deep-run frames, which are the blank ones.
- **"`no-lock` frames are a separate recoverable pool" — REFUTED (§6.2).** All 682 are contiguous from
  index 0, before the first acquisition.
- **n and scope — the same 7 series / 4 units as §5**, three of which are 60 fps re-extractions of
  windows inside the others; per-dump figures are given wherever pooling could mislead.

RECORDS a measurement plus a signalling change that moves no detection number. No constant, guard
threshold, gate definition, counting rule or `DECISIONS.md` entry was changed. The one enactment is a
**decline**: stale-lock localization recovery is refuted and struck from the live handoff docs.

**Reproduce:**

```sh
DUMPS=/Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp
python3 scripts/probe/analyze-pellet-tracks.py --ammo-oracle-ceiling \
  $DUMPS/{h4-isabel,h4-guilty,h4-marciana,g2-noir,i2-marciana-60fps,i3-noir-far-60fps,i3-noir-near-60fps}-ammo.json
# both arms always print; the CONTROL arm is what makes the STALE arm interpretable.
# the full run needs the frame PNGs each series records in its own `frames_dir`.
# replay the committed slice -- no images, no atlas, no subprocess:
python3 scripts/probe/analyze-pellet-tracks.py --ammo-oracle-ceiling-selftest
# all 15 arms:
bash scripts/probe/pellet-selftest.sh
```

#### §7 THE SECOND HAND COUNT (`guilty`) — the per-event miss rate replicates, and it has a mechanism

Answers the item §4.5 left open and `docs/handoffs/QUEUE.md` carried as "needs a second hand-counted
window on a different unit or clip". The owner supplied one on `guilty`. **The per-event miss rate
replicates to within 0.7 percentage points while the aggregate figure disagrees by 2.3×** — and this
time the misses are traced to a named mechanism in the reader's own code.

##### §7.1 — THE REPLICATION, first because it is the headline

| window                   | aggregate miss | per-event miss |
| ------------------------ | -------------- | -------------- |
| `isabel`, 30 s, 36 shots | 5.6%           | **16.7%**      |
| `guilty`, 20 s, 23 shots | 13.0%          | **17.4%**      |

The two aggregate figures differ by **2.3×**; the two per-event figures land within **0.7 percentage
points** of each other. That is the signature of the aggregate being noise from cancelling errors
while the per-event rate is the real quantity — §4.5's reading, now measured twice on two units.

⚑ **n=2 windows, 2 units. MEDIUM, below the n ≥ 5 board standard.** Replicated, not established.

##### §7.2 — THE MECHANISM — cluster-merge in `debounce_shots`

`debounce_shots` merges adjacent shots into one event when its gap tolerance is exceeded. **Three of
the four `guilty` misses are traced to specific entries:**

| merged entry | `frames` | span      | shot it swallows |
| ------------ | -------- | --------- | ---------------- |
| f1307        | 27       | 1307–1333 | **f1326**        |
| f1427        | 24       | 1427–1450 | **f1446**        |
| f1618        | 28       | 1618–1645 | **f1637**        |

The swallowed shots peak at **T = 11 and T = 13**, well above threshold. **These are merge failures,
not sensitivity failures** — the pellets were seen; the event boundary was not drawn.

**SUPERSEDED (2026-08-04) — disregard the whole of this prevalence block, headline and table, see
§8A.** `max_pellet_frames` is a **per-blob track-lifetime cap** (`count-pellets.py:380` / `:450`);
`debounce_shots` never reads it, and an event's `frames` is a **per-event span**. Comparing the two
is a category error. Measured against the **cadence period** instead, the prevalence is **31 of 815
(3.8%)**, not 255 of 815 (31.3%) — the merge channel is **~8× smaller** than the block below
records. The per-dump over-spanning counts and max spans below are arithmetically correct for the
`frames > 7` predicate; it is the predicate that is wrong.

**Cross-dump prevalence — 255 of 815 detections (31.3%) span more frames than `max_pellet_frames = 7`:**

| dump                                           | over-spanning | share     | max span |
| ---------------------------------------------- | ------------- | --------- | -------- |
| `h4-isabel-structural`                         | 62 / 203      | 30.5%     | **50**   |
| `h4-guilty-structural`                         | 43 / 180      | 23.9%     | 28       |
| `h4-marciana-structural` (`marciana`, SG/Iron) | 67 / 218      | 30.7%     | 29       |
| `g2-noir-structural`                           | 83 / 214      | **38.8%** | **49**   |

A 50-frame span is **2.5 cadence periods** at the measured 20-frame cadence.

##### §7.3 — The owner ground truth, and both arms reproduce 23 exactly

Video `docs/probes/ar-sg-smg/guilty solo sg.MP4` (dump `h4-guilty-structural`, `fps` 30, `at` 0,
`framesProcessed` 5738 — all verified from its own `pellets.json`), window **00:42.8 → 1:02.8** =
frames **1284–1884**. Owner: **23 shots** as three magazine segments of **9, 9, 5**; **2 reloads**;
**4 of 9 rounds left at 1:02.8**.

**Both arms reproduce 23**: **21 visible decrements + 2 magazine-emptying rounds** (8 + 8 + 5
decrements). The 9/9/5 structure is confirmed. **The reconstructed ammo level at frame 1884 is 4**,
matching the owner's ending state — **an independent check the `isabel` clean-magazine window did
not have** (four clean magazines end at a magazine boundary; a mid-magazine ending state is a second,
separately-falsifiable constraint on the reconstruction).

Supporting structure, all from the ammo series itself:

| corroboration | what it shows                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------- |
| cadence       | **20 frames = 1.500 shots/s with ZERO dispersion** — all 20 intra-magazine intervals exactly 20 |
| reload gaps   | last shot → first shot of the next magazine: **91 and 90 frames = 3.03 s / 3.00 s**             |
| ending level  | reconstructed **4** at frame 1884, equal to the owner's "4 of 9 left"                           |

Window read rate **58.1%**, against 52.2% for the whole clip.

##### §7.4 — Instrument arm (`--hand-count`, slack 8)

Detected **20** onsets in the window; `matched` 18, `MISSED` **3**, `SPURIOUS` **2** (both
`in-reload-window`, **zero `unexplained`**). `ammo_visible_shots` 21, `ammo_implied_total` **23**,
`ammo_total_matches_hand` **true**.

**Raw and admissible bases are IDENTICAL here** — 0 inadmissible flips in-window, 0 phantom reloads —
**unlike the `isabel` window, where they diverged 45 vs 36.** So `guilty`'s reading does not depend on
the §4.3 cap rule at all, and the `reconstruct_ammo` defect filed in `QUEUE.md` does not touch it.

`MISSED_vs_hand` 3 = **13.0%**; `MISSED_pct_arbiter_basis` 14.3%. The missed windows are **one per
magazine segment**:

| miss  | frames     | time    |
| ----- | ---------- | ------- |
| 7 → 6 | f1326      | 44.20 s |
| 4 → 3 | f1637–1640 | 54.57 s |
| 9 → 8 | f1787–1790 | 59.57 s |

##### §7.5 — Independent arm (own rising-edge rule, forbidden from reading the instrument)

It found **all 23 onsets**, and its reconciliation against `pellets.json` is the honest one:

- `pellets.json` **missed 4 real shots** — f1326, **f1446**, f1637, f1787;
- and **separately reported 1 non-shot** — f1456.

On the denominator of 23: **missed 4 = 17.4%**, plus 1 false positive = **5.0% of its own 20 reported
detections**.

⚠ **The two error counts must not be netted.** The raw 20-vs-23 deficit of 3 only works because the
f1456 false positive numerically stands in for the f1446 shot it is not. This is exactly §4.5's
compensating-errors pattern, and it is why the aggregate reads 13.0% where the per-event truth is
17.4%.

**f1456 is REFUTED as a weapon shot, four ways:**

1. the counter held `1` from f1426–1445 and showed a full `9` at f1531, so **magazine 1 was exhausted
   at f1446** — there was no round left to fire at f1456;
2. 1446 → 1456 is **10 frames against a 20-frame cadence floor**;
3. its pellet `total` of 4 is **below the weakest confirmed shot** in the window (T = 5);
4. f1456–1462 is a **7-of-7 stale-lock run**.

##### §7.6 — The two failure modes separate cleanly

**3 of the 4 missed shots sit on FULLY-MEASURED locks** — a detector failure. **The 1 false positive
is entirely inside a stale run** — a localization failure. Window stale share is 24.5% (147/601), but
only **6/420 = 1.4% during the three firing spans**, versus 74/90 and 67/89 inside the two reload
gaps.

⇒ **The misses are NOT a localization artifact.** §3's standing warning — every measurement
conditioned on "detected shots" is conditioned on lock quality — is respected here rather than
tripped over: the stale frames are concentrated in the reload gaps, where nothing was fired.

##### §7.7 — ⚑ An instrument limitation, recorded explicitly

**`--hand-count`'s matcher credits ANY in-reload onset as the magazine-emptying round, so it cannot
distinguish f1446 (the real emptying shot) from f1456 (a false positive).** Its
`detected_weapon_attributable` therefore OVERCOUNTS whenever a merge and a false positive coincide
inside the same reload window — which is why the arm reported **3 missed** where the truth is **4
missed + 1 invented**.

**Both the `isabel` (§4) and `guilty` (§7) `--hand-count` numbers inherit this.** Do not read
`detected_weapon_attributable` as authoritative; it is an upper bound on weapon-attributable
detections.

##### §7.8 — Two structural discoveries from the independent arm

1. **`reads[k].conf` in the ammo series is byte-identical to `tracks.json.cross_confs`.** It is the
   **crosshair LOCK confidence, not digit-match quality.** Digit quality lives in `reads[k].scores`
   (three per-cell template scores); the counter renders as **3 cells with leading zeros** ("008").
   ⚑ **This refines how §5.5's dark-badge `conf < 60` split should be read: it is a lock/surround
   measure, not a glyph-quality measure.** §5.5 already labels the threshold a PROXY for "the reader
   is on the semi-transparent ammo badge" rather than a calibrated boundary, so the split's meaning
   is unchanged — but nobody should now re-read it as an OCR-quality partition.
2. **§4.2's "the counter never credibly displays 0" does NOT transfer in its specific form.** On
   `guilty` there are **3 raw `0` reads** (none in the counted window), all carrying an
   all-cells-match-zero `[0,0,0]` signature, and **none inside an 8-run** — the `isabel`-derived form
   of the finding. Two are provably impossible (**f2689** between a 4 and a 3; **f3368** between a 9
   and an 8); **f645 is INDETERMINATE ⚑** — positionally where a real 0 would fall, but carrying the
   same misread signature and the worst scores of the three. **The general conclusion survives — a
   `0` read is untrustworthy — but the specific 8-run form is `isabel`-only.**

##### §7.9 — Slack sweep

**Knob-stable** across slack 3 / 6 / 8 / 10 / 12: `ammo_visible_shots` 21, `n_reloads` 2,
`implied_total` 23, admissible == raw, `ammo_total_matches_hand` true, `detected_in_window` 20, naive
`MISSED` 3, `inadmissible_in_window` 0, and the reconstructed level at f1884 = 4.

**Knob-sensitive:** `matched` / `MISSED` / `SPURIOUS` / `MISSED_pct_arbiter_basis` — `MISSED` moves
5 → 3 as slack rises, saturating at 8.

⚑ **At slack 6 ONLY**, onset f1537 lands inside the first reload window's slack skirt and is
reclassified as an extra, dropping `detected_weapon_attributable` to 19 and raising `MISSED_vs_hand`
to 4 (**17.4%** — coincidentally the independent arm's figure, by a different route; do not read the
agreement as corroboration).

##### §7.10 — ⚑ Open

- **The f1787 miss is NOT explained by cluster-merge.** Peak T = 8, at post-reload crosshair
  re-acquisition, on a measured lock. **Mechanism unknown.**
- **Whether the merge explains the cold-bias remainder is UNTESTED.** A merged event drops a shot from
  the count AND its pellets from the total, so **the net sign on pellets-per-shot is not obvious and
  must not be guessed.** An investigation is running separately.
  **SUPERSEDED (2026-08-04) — disregard: that investigation ran and the answer is NO (§8D).** The
  sign is COLD (a merged event's median-representative frame falls), but the magnitude is
  negligible — and both merge fixes read **bit-identical to shipped on all five owner-labelled
  `marciana` (SG/Iron) shots**. The premise in this bullet is also wrong on its own terms: a merged
  event does **not** drop its pellets from the total, because `debounce_shots` copies the count from
  **one representative frame** and sums nothing (`count-pellets.py:514-536`).

##### §7.11 — Evidence tiers, stated so nothing here is over-read later

| claim                                                | tier                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| Cluster-merge exists and affects 31.3% of detections | **MEASURED** — 4 dumps, code-level                         |
| It causes specific missed shots                      | **DEMONSTRATED** for 3 named entries on `guilty`           |
| The ~17% per-event miss rate                         | **n=2 windows, MEDIUM** — replicated, small n, below n ≥ 5 |
| The cold-bias link                                   | **HYPOTHESIS, untested**                                   |

**SUPERSEDED (2026-08-04) — two rows of the table above, see §8.** Row 1's **31.3% is the category
error** (§8A): merge prevalence against the cadence period is **31 of 815 = 3.8%**, and the
arbiter-visible cost is **~20 shots pooled = 2.6%**. Existence and the code-level mechanism stand;
only the size was wrong. Row 4's cold-bias link is no longer a hypothesis — it is **REFUTED**
(§8D). Rows 2 and 3 stand unchanged.

##### Confounds, each with a verdict

- **Aggregate-versus-per-event scoring — REPLICATED (§7.1).** The aggregate is a netted figure and
  moves 2.3× between windows; the per-event rate moves 0.7 pp. MISSED and SPURIOUS are never netted
  anywhere in this entry.
- **"The misses are a stale-lock artifact" — REFUTED (§7.6).** 3 of 4 misses sit on fully-measured
  locks, and in-window stale share during the three firing spans is 1.4%.
- **"f1456 is the magazine-emptying shot" — REFUTED four ways (§7.5).** Magazine exhausted at f1446;
  10 frames against a 20-frame cadence floor; pellet total below the weakest confirmed shot; inside a
  7-of-7 stale run.
- **`reconstruct_ammo`'s magazine-consistency defect — DOES NOT APPLY HERE.** 0 inadmissible flips and
  0 phantom reloads in-window; raw and admissible bases are identical, unlike `isabel`'s 45 vs 36.
- **Matcher over-crediting — IDENTIFIED, NOT fixed (§7.7).** `detected_weapon_attributable` is an
  upper bound; both hand-count entries inherit the limitation.
- **Slack as a free parameter — SWEPT (§7.9).** Every ammo-reconstruction quantity is flat across
  3 / 6 / 8 / 10 / 12; only matcher-basis fields move, and the one reclassification at slack 6 is
  named.
- **n and scope — one 20 s window, one unit (`guilty`), one clip, plus §4's 30 s `isabel` window.**
  Two windows, two units. **HYPOTHESIS-to-MEDIUM for the rate**; ground-truth-strength for the binary
  questions it was run to settle (does the arbiter reconstruct `guilty` correctly — yes, including the
  ending level — and does the per-event/aggregate divergence replicate — yes).

**NOTHING HERE ENACTS A CHANGE.** `debounce_shots` is UNTOUCHED. Changing it would move every detected
shot in every dump and therefore every number in this measurement log — **an owner-gated decision**,
and per evidence-proportionality **not for the session that discovered it**. No guard, gate, threshold
or constant was changed; no `DECISIONS.md` entry was edited; no verdict was stamped.

**Reproduce:**

```sh
python3 scripts/probe/analyze-pellet-tracks.py --hand-count \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp/h4-guilty-ammo.json \
  --hand-count-window 42.8 62.8 --hand-count-at 0 --hand-count-fps 30 --hand-count-slack 8 \
  --hand-count-shots 23 --hand-count-magazines 2
# replay the committed slice -- no images, no subprocess:
python3 scripts/probe/analyze-pellet-tracks.py --hand-count-selftest
```

⚑ **Note on the invocation:** `--hand-count-magazines` was passed the owner's **reload count** (2)
here, not a magazine count — the window holds three magazine segments (9/9/5) separated by two
reloads. The field is a **pure passthrough that enters no arithmetic**, so the reading is unaffected;
it is recorded so the numbers above can be reproduced verbatim.

#### §8 THE MERGE AUDIT — the cluster-merge is REAL but ~8× SMALLER, and it does NOT explain the cold bias

Closes the investigation §7.10 said was "running separately". It corrects §7.2's sizing, refutes
§7.11's cold-bias row, and costs the two minimal fixes that do help — without enacting any of them.

##### §8A — THE 31.3% FIGURE IS A CATEGORY ERROR (this is the important correction)

`max_pellet_frames` is a **per-blob TRACK-LIFETIME cap**. It is used at `count-pellets.py:380`
(`temporal_filter`) and `:450` (`build_tracks_and_counts`) to decide which tracks count as pellets at
all, and **`debounce_shots` never reads it.** `read-pellets.ts:505` sets it as
`max(4, round((13/60) × fps))` = **7 at 30 fps**, from the owner spec's "pellet markers last ~13 game
frames". A shot event's `frames` field is a **per-event span**. Comparing a per-blob budget to a
per-event span is apples to oranges, and §7.2 built its headline on that comparison.

Measured against the **cadence period** instead — 20 frames at 30 fps, the measured mode on every
dump, and the only span above which an event demonstrably had room for two shots:

| dump                                | events  | `frames > 7` | **`frames > cadence`** | max span |
| ----------------------------------- | ------- | ------------ | ---------------------- | -------- |
| `h4-isabel`                         | 203     | 62           | **7**                  | 50       |
| `h4-guilty`                         | 180     | 43           | **5**                  | 28       |
| `h4-marciana` (`marciana`, SG/Iron) | 218     | 67           | **4**                  | 29       |
| `g2-noir`                           | 214     | 83           | **15**                 | 49       |
| **pooled**                          | **815** | 255 (31.3%)  | **31 (3.8%)**          |          |

**The merge channel is ~8× smaller than §7.2 records.**

##### §8B — The exact segmentation rule, read off the code

`debounce_shots` (`count-pellets.py:603`) works on `T[i] = white[i] + red[i]`. It **starts** an event
at the first frame with `T ≥ event_min` (3, a hardcoded local); **continues** while `T ≥ 3`,
**bridging** any sub-threshold run of length `≤ max_gap`; **ends** when that run exceeds `max_gap`;
and emits only if `event_frames ≥ 2`. `max_gap = max(3, round(fps × 0.13))` = **4 at 30 fps, 8 at
60 fps**. `min_pellets` / `max_pellets` (5 / 10) are **not segmentation** — they are the post-hoc
`valid` clamp that `avgTotal` averages over. `marker_min = 2` only sets the core flag.

##### §8C — Shots actually lost to merging: ~20, a 2.6% floor

Ammo-arbiter method: expand every decrement into one slot per round, count the slots falling inside
each over-span event, excess = slots − 1 (one slot is the event's own shot and is not lost).

| dump                                | over-span events | ammo shots inside | **excess lost**     |
| ----------------------------------- | ---------------- | ----------------- | ------------------- |
| `h4-isabel`                         | 7                | 11                | **5**               |
| `h4-guilty`                         | 5                | 7                 | **3**               |
| `h4-marciana` (`marciana`, SG/Iron) | 4                | 3                 | **1**               |
| `g2-noir`                           | 15               | 24                | **11**              |
| `i3-noir-near-60`                   | 2                | 4                 | 2                   |
| `gt-marciana-60`                    | 1                | 2                 | 1                   |
| **pooled, 4 full fights**           | **31**           | **45**            | **20 / 770 = 2.6%** |

**Cross-check passed.** On the `guilty` hand window the replay names exactly the three known merges
(`start` 1306 swallowing 1326, 1426 swallowing 1446, 1617 swallowing 1637), independently finds the
fourth miss (**1787**, covered by no event at all — a sensitivity / lock miss, **not** a merge) and
the one false positive (1456), reproducing §7.5 exactly.

⚑ **This is a FLOOR, not a total.** The arbiter is blind to magazine-emptying rounds (the counter is
blank through the reload animation) and recovered only 2 of the 3 hand-confirmed window merges. At
that recall the true pooled loss is ≈30 shots ≈3.7% — but **that scaling is n=1 and NOT measured**.

##### §8D — ⚑ THE MERGE DOES NOT EXPLAIN THE COLD BIAS — the candidacy is REFUTED

**How a merged event reports its count** (`count-pellets.py:514-536`): the event's `white` is copied
from a **single representative frame** — the active frame whose `total` is closest to the **median**
of all active frames. `red` is a 0/1 core flag; `total = rep.white + red`. **Nothing is summed.**
`read-pellets.ts:663` documents the rationale (the median rejects transient VFX spikes that the old
max-of-event policy reported). So merging roughly doubles the active-frame set — folding in the
first blast's decay tail and the inter-shot trough — and the median falls. **The merge IS cold**,
via median-over-a-longer-window. On the 31 over-span events: shipped mean **5.81**, re-split mean
**6.55**.

**But the magnitude is negligible.** Recomputed pooled `avgTotal` over the four full fights: shipped
**7.3242**; `cap_cadence` 7.3214 (**−0.003**); `resplit` 7.3170 (**−0.007**); `gap2` 7.3492
(+0.025); `gap1` 7.3967 (+0.072); `candA` 7.1767 (−0.148). The deficit to close is
**8.4 − 7.32 = 1.08 pellets/shot**. ⚑ **SUPERSEDED (2026-08-04) — disregard that subtraction as a
per-shot deficit: §9A shows 8.4 is an f8–11 WINDOW count and §9B shows the 7.32 side is 12 owner
pellets plus 23 non-owner ones, so the two terms are not the same quantity.** The merge fix delivers
**0.3%–6.7%** of it, and **the two best-scoring variants deliver the WRONG SIGN.**

**The decisive check — an existing labelled fixture, not a new derivation.** The 5 owner-labelled
`marciana` (SG/Iron) shots in `groundtruth-f8-11.json` (mean 8.40 ⚑ **SUPERSEDED (2026-08-04) as a
LANDED total — §9A: it is an f8–11 window count.** The bit-identical result below is unaffected, as
it compares shipped against candidates, not against the owner):

| t0       | owner    | shipped  | `cap_cadence` | `resplit` |
| -------- | -------- | -------- | ------------- | --------- |
| 1060     | 7        | 6        | 6             | 6         |
| 1096     | 10       | 8        | 8             | 8         |
| 1140     | 8        | 9        | 9             | 9         |
| 1289     | 9        | **4**    | **4**         | **4**     |
| 1369     | 8        | 8        | 8             | 8         |
| **mean** | **8.40** | **7.00** | **7.00**      | **7.00**  |

**Bit-identical on all five. The merge fixes cannot be the cold bias.** (⚑ Shot 4 at `t0` 1289
carries a −5 residual on its own and is the fixture's documented structural-mislock shot,
`locate: "template"`; excluding it, shipped reads 7.75 against the owner's 8.25.)

##### §8E — `candA` OVERFITS — REFUTED, do not re-propose

The peak-detector rule (`T[i] ≥ 5` ∧ `T[i] − max(T[i−4…i−1]) ≥ 4` ∧ `T[i] > T[i+1]` ∧ a 12-frame
refractory), scored against the ammo arbiter on 8 series / 830 ammo shots: **pooled MISSED
7.0% → 14.5%.** It **doubles the very quantity this thread exists to reduce**, and is worse than
shipped on **7 of 8 series** (`marciana` (SG/Iron) MISSED 16 vs 1; `noir` 24 vs 13; `isabel` 38 vs
30). On the `isabel` hand window it detects **32 against a hand count of 36 — worse than shipped's 34.** Its `guilty` win (precision 1.000 / recall 0.957) is the one window it was tuned on.

Its single `guilty` miss is diagnostic: it fires on **f1276**, an isolated **one-frame** `T = 7` VFX
spike inside a reload window, and its refractory then suppresses the real first round — **it has no
minimum-duration guard at all**, where shipped enforces `event_frames ≥ 2`.

##### §8F — Two minimal fixes DO beat shipped everywhere — COSTED, NOT ADOPTED

Same arbiter basis (8 series, 830 ammo shots), plus the `guilty` hand window (23 true onsets,
tolerance 8):

| rule                                                                  | pooled MISSED   | pooled spurious _unexplained_ | `guilty` precision | `guilty` recall | `avgTotal` change |
| --------------------------------------------------------------------- | --------------- | ----------------------------- | ------------------ | --------------- | ----------------- |
| shipped                                                               | 58 (7.0%)       | 5                             | 0.950              | 0.826           | —                 |
| **`cap_cadence`** (force-close at 0.9× cadence, reopen; **~3 LOC**)   | **35 (4.2%)**   | 9                             | **0.957**          | **0.957**       | −0.003            |
| **`resplit`** (post-pass split at internal rising edges; **~10 LOC**) | **37 (4.5%)**   | **7**                         | **0.957**          | **0.957**       | −0.007            |
| `gap2` / `gap1` (tighten `max_gap`)                                   | 43 / 45         | **28 / 48**                   | 0.840              | 0.913           | +0.025 / +0.072   |
| `candA`                                                               | **120 (14.5%)** | 0                             | 1.000              | 0.957           | −0.148            |

`gap1` / `gap2` are the only variants that move `avgTotal` warm, and they buy it by fragmenting
single blasts — unexplained spurious 5 → 28 / 48. **They trade a real channel for a fake one.**

**Blast radius, measured empirically** by patching a scratch copy and running every selftest:
**3 fixtures FAIL and would need regeneration** — `missing-shots-slice.json`
(`shots_detected_total` 37 → 38, `MISSED` 1 → 0), `hand-count-slice.json` (`detected_t0` gains
1390 / 1657 / 1727 / 1745, `MISSED` 11 → 9, `SPURIOUS` 5 → 7, `MISSED_vs_hand` 4 → 0),
`stale-counting-slice.json` (`n_counting_frames` 43 → 51, `counting_stale_pct` 9.3 → 7.84). **5 PASS
unaffected.** **`read-pellets.ts:349` is a SECOND implementation of the same algorithm and must
change in lockstep — it is not a shared module.** ⚑ ESTIMATE, re-extraction compute: **essentially
zero** (entirely downstream of the cached `frame_counts`; re-segmenting all 8 dumps took < 0.01 s);
fixture regeneration ~1–2 min. A full rebuild through `read-pellets.ts` would be ~430 s/video ≈ 30
min for 4 videos.

##### §8G — The real lever: the REPRESENTATIVE-FRAME policy — ⚑ HYPOTHESIS, n=5, post-hoc, NOT ENACTABLE

The representative-frame policy is **upstream of segmentation and unaffected by it**. Holding
segmentation at shipped and varying only the representative:

| policy               | pooled `avgTotal` | the 5 owner shots read | mean vs owner 8.40    |
| -------------------- | ----------------- | ---------------------- | --------------------- |
| **median (shipped)** | 7.32              | 6 / 8 / 9 / 4 / 8      | **7.00 (−1.40 COLD)** |
| 75th percentile      | 8.11              | 7 / 10 / 9 / 5 / 9     | 8.00 (−0.40)          |
| max of event         | 8.64              | 10 / 14 / 11 / 15 / 13 | 12.60 (+4.20 HOT)     |

Median is cold, max is hot, truth is between — exactly the trade the `read-pellets.ts` comment says
the median was chosen to make. **⚑ The 75th percentile was picked AFTER seeing the other two, on n=5
from one clip. It is a fitted number, not a measurement, and it is NOT proposed.**

⚑ **SUPERSEDED (2026-08-04) — disregard the third column as a distance-to-truth, and disregard
"truth is between".** §9A: the `8.40` it is measured against is an f8–11 window count, not a landed
total. §9D: **89% of the peak's white is unmatched to any owner pellet**, so `max` measures the
muzzle flash and p75, which leans toward it, is refuted with it. §9B: the median's `7.00` is 12 owner
pellets against 23 non-owner ones — its agreement is **cancellation**, not proximity. What survives
is the median's RATIONALE (avoid the peak); what fails is WHICH frame it lands on (§9C).

**What would settle it is a REUSE path needing NO new labels and no owner footage:** score
representative policies against `real-fidelity-slice.json` (the xy-matched real-pellet set) and the
`groundtruth-f8-11` crops on more than 5 labelled shots — that decides whether the high frames are
VFX spikes (median right) or real pellets (median wrong). ⚑ **Confound: the `valid` clamp** — the
75th percentile pushes 118 more events past `max_pellets = 10` and out of the average entirely.

⚑ **SUPERSEDED (2026-08-04) — that reuse path was taken and it does NOT decide the question as
worded.** `real-fidelity-slice.json` holds f8–11 crops only, so it can speak to detection and the two
filters and to nothing else (§9E) — in particular it can see neither the peak nor the plateau. The
check that DOES decide it is categorical, not a mean: **which frame** a rule selects, pre-cohort vs
plateau, scored against the 5 labelled events (§9H). The `valid`-clamp confound was measured and
inverts: the clamp biases the shipped median **WARM by +0.24**, so it is not a cold contributor
(§9F).

##### §8H — ⚑ A pre-existing Python / TypeScript divergence, found in passing and NOT chased

⚑ **SUPERSEDED (2026-08-04) by §11 — disregard this entry's DIAGNOSIS.** The observation (177 vs 176
on `h4-marciana`) is correct and reproduces. Its two guesses are both REFUTED: it is **not** a median
tie-break (both implementations are byte-identical in logic, including the strict `<`), and the
`debounce_shots` lockstep invariant is **NOT** off — segmentation is identical, `totalShots` = 218 in
both. The cause is a **marker-channel** difference upstream of `debounce_shots` entirely, and it is a
defect in the SHIPPED TypeScript, not in the Python replay. See §11.

The replay reproduces the shipped `pellets.json` summaries **exactly on 7 of 8 dumps**, but on
`h4-marciana` (`marciana`, SG/Iron) reads `validShots` 177 / `avgTotal` 7.2 / `avgRed` 0.15 against
the shipped 176 / 7.3 / 0.14 — **one extra core-flagged valid event**, probably a median tie-break
(a strict `<` against `<=` on the distance-to-median comparison) or a marker difference. **The standing "keep `count-pellets.py` and
`read-pellets.ts` in lockstep" invariant may ALREADY be one event off on that dump.**

##### §8I — ⚑ ONE ROW OF §8F DID NOT REPRODUCE FROM ITS OWN DESCRIPTION

The committed instrument (§8J) reproduces every figure above bit-exactly **except `cap_cadence`'s
row**. Implementing that row's stated rule literally — force-close a running event once it has
spanned `round(0.9 × cadence)` frames and reopen at the same frame — the instrument measures
**MISSED 37 (4.5%)**, unexplained 11, `avgTotal` change −0.019, not the 35 / 9 / −0.003 tabled above.
Every neighbouring semantic (close-and-reopen one frame later, cap on active-frame count rather than
span, cap at the trough, a post-pass restricted to over-span events, and multipliers 0.85 → 1.15)
was tried; the 0.9× family robustly lands on **37**, and only a **1.0×** cadence cap reaches 35.
**The exact parameterisation behind the tabled `cap_cadence` row was not carried over with the
finding, so the row is not independently reproducible.** `resplit`'s MISSED (37) and unexplained (7)
both reproduce exactly.

**This changes nothing that matters.** Both minimal fixes still cut pooled MISSED from 7.0% to
4.2–4.5%, both still move `avgTotal` COLD by less than 0.02, and neither is adopted. It is recorded
so a later session does not read `cap_cadence = 35` as a re-runnable measurement.

##### Confounds, each with a verdict

- **"31.3% of detections are merged" — REFUTED as a category error (§8A).** The denominator was a
  per-blob track-lifetime cap; against the cadence period the figure is 3.8%.
- **"A merged event drops its pellets from the total" — REFUTED (§8D).** `debounce_shots` copies one
  representative frame's count and sums nothing.
- **"The merge is the cold bias" — REFUTED on an existing labelled fixture (§8D).** Both fixes read
  bit-identical to shipped on all 5 owner-labelled shots.
- **Fixing the merge could be a net loss — CHECKED (§8F).** `gap1` / `gap2` cut MISSED but multiply
  unexplained spurious 5 → 28 / 48; `candA` doubles MISSED. Only `cap_cadence` and `resplit` improve
  both columns at once.
- **The arbiter's own blind spot — STATED, NOT NETTED (§8C).** Magazine-emptying rounds are invisible
  to the ammo counter, so 20 shots is a floor; the ≈30 extrapolation is n=1 and not measured.
- **Representative-policy fitting — DECLARED (§8G).** The 75th percentile was chosen after seeing the
  alternatives, on n=5 from one clip. HYPOTHESIS only, with a named reuse path to settle it.
- **n and scope.** 8 ammo series, 4 of them full fights; 815 shipped events and 830 ammo shots on the
  scorecard basis. The cold-bias refutation rests on **5 owner-labelled shots** — small, but they are
  the only owner-labelled per-shot pellet counts that exist, and the result is a bit-identical
  match rather than a close one.

**NOTHING HERE ENACTS A CHANGE.** `debounce_shots` is UNTOUCHED, in both `count-pellets.py` and
`read-pellets.ts`; every candidate rule lives inside the audit as a local scoring variant, and the
instrument asserts a shipped-identity control before it scores anything. No guard, gate, threshold or
constant was changed; no `DECISIONS.md` entry was edited.

##### §8J — Instrument and reproduction

`scripts/probe/analyze-pellet-tracks.py --merge-audit`, self-validated against the committed slice
`scripts/tests/fixtures/pellets/merge-audit-slice.json` and registered in
`scripts/probe/pellet-selftest.sh`.

```sh
# <dump>-ammo.json comes from count-pellets.py --ammo-series exactly as in §3b.
B=/Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp
# the SCORECARD basis -- 8 series, 830 ammo shots (§8E, §8F):
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --merge-audit \
  $B/h4-isabel-ammo.json $B/h4-guilty-ammo.json $B/h4-marciana-ammo.json $B/g2-noir-ammo.json \
  $B/gt-ammo-series.json $B/i2-marciana-60fps-ammo.json $B/i3-noir-far-60fps-ammo.json \
  $B/i3-noir-near-60fps-ammo.json \
  --merge-audit-fps 30 30 30 30 60 60 60 60 --merge-audit-slack 8 8 8 8 6 6 6 6
# the CENSUS / ARBITER / avgTotal basis -- the 4 full fights (§8A, §8C, §8D):
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --merge-audit \
  $B/h4-isabel-ammo.json $B/h4-guilty-ammo.json $B/h4-marciana-ammo.json $B/g2-noir-ammo.json \
  --merge-audit-fps 30 --merge-audit-slack 8
# replay the committed slice -- no images, no subprocess, no tracks.json:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --merge-audit-selftest
```

⚑ **The two invocations pool different sets on purpose** and the §8 tables say which is which: MISSED
is pooled over all 8 series (830 ammo shots), while the over-span census, the arbiter and every
`avgTotal` are pooled over the 4 full fights (815 events, 770 ammo shots). Passing one set and
reading the other's figure is the easiest way to misquote this entry.

#### §9 THE REPRESENTATIVE-FRAME AUDIT — the reader samples the muzzle flash, and the mean agreement is cancellation

Settles §8G, which left the representative-frame policy as an unenactable n=5 hypothesis with a named
reuse path. The reuse path was taken; it does not answer the question as §8G worded it (§9E), and the
question it does answer is different from the one §8G asked.

**Read §9A first.** A load-bearing premise underneath §3b, §4.5, §4.6 and all of §8 is wrong, and the
correction changes what several earlier numbers mean.

##### §9A — ⚑ PREMISE CORRECTION: the owner's label is a WINDOW count, not a per-shot landed total

`groundtruth-f8-11.json` records `white` = 7 / 10 / 8 / 9 / 8 on the five real shots. That has been
carried through this log as **"landed pellets per shot, measured: 8.4"**. It is not that.

The label is a hand count of the markers visible in the **f8–11 window**, and
`groundtruth-f8-11-positions.json` — the owner's own drawn centroids for the same crops — carries the
**identical count on all four frames of every shot**:

| shot | owner `white` | f08 / f09 / f10 / f11 | identical? |
| ---- | ------------- | --------------------- | ---------- |
| 1    | 7             | 7 / 7 / 7 / 7         | yes        |
| 2    | 10            | 10 / 10 / 10 / 10     | yes        |
| 3    | 8             | 8 / 8 / 8 / 8         | yes        |
| 4    | 9             | 9 / 9 / 9 / 9         | yes        |
| 5    | 8             | 8 / 8 / 8 / 8         | yes        |

**Owner and reader are BOTH single-window observers. They differ in WHICH window.** The owner reads
f8–11; the reader reads one representative frame that is usually somewhere else entirely (§9C). Every
figure derived from 8.4 as a landed total is therefore **window-conditional**, and the ones this log
carries are marked SUPERSEDED in place at §3b, §4.5, §4.6, §8D and §8G.

**It is probably still the right number**, because the cohort demonstrably coexists rather than fading
one pellet at a time (§9B's coexistence row: max simultaneously-visible countable == total countable
on all five shots, with a flat plateau 8–10 frames long). But that is an argument, not the
measurement, and it is stated as one.

⚑ **COULD NOT DETERMINE: whether any marker appears and fully fades before t0+8.** Both the owner
label and `real-fidelity-slice.json` live only in f8–11, so such a pellet is invisible to both, and
the "never detected = 0" row in §9B is conditional on that window. Settling it needs owner labels at
the plateau frame — **owner time**. Tier: OPEN.
⚑ **ANSWERED (2026-08-04) — see §18: NO. Nothing lands and fades before `t0+8`; the f8–11 window
count IS the landed total and 8.40 is CONFIRMED as the reference.** It took 6 owner adjudications,
not a re-labelling pass. This paragraph is left as written (append-only log); §18 is the resolution.

##### §9B — THE DECOMPOSITION: of the 35 pellets the reader reports, 12 are owner pellets

> ⛔ **RETRACTED IN PART (2026-08-06) — §36 → §37.** The `12 of 35` below, and the "coincidental
> cancellation" reading built on it, are the **LEGACY `pellet_ids` channel** —
> `--representative-audit` was scoring a channel production stopped using at the `band_hi` landing.
> On the SHIPPED channel the same five shots read **35 = 31 owner + 4 non-owner (88%)**, not 34%:
> same total, opposite composition. ⛔ **Do not quote `12 / 35` as shipped-reader behaviour.**
> ⚑ The _mechanism_ this section describes (the median representative sampling the pre-cohort flash
> phase) is unaffected — only the composition figure is retracted.

Every one of the 42 owner-drawn centroids links **1:1 to a distinct track** (nearest-centroid
consensus over f08/f09/f10 — the offsets `real-fidelity-slice.json` puts at 100% raw-found AND 100%
both-pass, so a missing link there would be a linking failure and cannot be a detection failure). Max
link residual per shot: 2.83 / 3.32 / 2.83 / 4.12 / 3.06 px.

Counting geometry below is the **shipped structural crosshair**, on every shot including 4 — because
that is what the reader counts against regardless of which crosshair the crops were cut with.

| shot    | owner  | never detected | rejected `min_area`/`min_circ` | rejected **lifetime gate** | rejected **radius gate** | countable | owner at rep | non-owner at rep | reader |
| ------- | ------ | -------------- | ------------------------------ | -------------------------- | ------------------------ | --------- | ------------ | ---------------- | ------ |
| 1       | 7      | 0              | 0                              | 0                          | 1                        | 6         | 5            | 1                | 6      |
| 2       | 10     | 0              | 0                              | 2                          | 0                        | 8         | 0            | 8                | 8      |
| 3       | 8      | 0              | 0                              | 1                          | 0                        | 7         | 0            | 9                | 9      |
| 4       | 9      | 0              | 0                              | 2                          | 7 _(mislock)_            | 0         | 0            | 4                | 4      |
| 5       | 8      | 0              | 0                              | 0                          | 0                        | 8         | 7            | 1                | 8      |
| **tot** | **42** | **0**          | **0**                          | **5**                      | **8**                    | **29**    | **12**       | **23**           | **35** |

Both sums close: 42 = 0 + 0 + 5 + 8 + 29, and reader 35 = 29 − 17 + 23.

⇒ **Of the 35 pellets the reader reports across these five shots, only 12 are owner pellets.** The
mean agreement §8G tabled (7.00 vs 8.40) is **coincidental cancellation of a large under-count against
a large over-count**, not a measurement of the right quantity landing slightly low. **This is the
headline of §9.**

**Coexistence — the hypothesis that the cohort fades asynchronously is REFUTED.** For every labelled
shot, max simultaneously-visible countable owner pellets **equals** total countable owner pellets:
6 @f1061, 8 @f1105, 7 @f1141, 7 @f1295 (under the template lock, next paragraph), 8 @f1377. Cohorts
appear within one frame of each other and hold a flat plateau for 8–10 frames.

**Shot 4 re-scored under the TEMPLATE crosshair its crops were actually cut with** — the label file
itself records `locate: "template"` for that shot, so this is its own provenance, not a hypothesis:
**0 radius-rejected, 7 countable, coexisting 8 consecutive frames (t0+6 … t0+13)**. The entire −5
residual on that shot is the documented structural mislock. Corrected countable totals across the five
shots are 6 / 8 / 7 / 7 / 8 = **36 vs owner 42**; the remaining residual of 6 is 5 lifetime-gate plus
1 genuine radius rejection — a shot-1 pellet (track 6715, life 10) whose **closest approach to the
crosshair over its whole life is 161.4 px**, against `pellet_radius` 160. It misses the gate by
1.4 px, not by a margin that suggests the radius is wrong.

##### §9C — THE MECHANISM: a two-phase event window, and the rule samples the wrong phase

The event spans a **4–6 frame blast/flash phase** (blobs live 1–3 frames) and then the **pellet cohort
phase**. Any single order statistic over the pooled per-frame totals samples a **mixture** of the two.

Countable owner pellets in radius, per frame, `R` marking the representative frame the shipped rule
picks and `|` marking `t0`:

```
shot 1 (t0-4 ->): 0  0  0  0  0| 6  5R 5  5  5  5  5  5  5  5  2  1  1  0
shot 2 (t0-4 ->): 0  0  0  0  0| 0  0R 0  0  7  7  7  7  8  8  8  8  7  6  4  1  0
shot 3 (t0-4 ->): 0  0R 0  0  2| 7  7  7  7  7  7  7  7  7  7  3  1  0  0
shot 4 (t0-4 ->): 0  0  0  0  0| 0  0  0R 0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0
shot 4 RELOCKED : 0  0  0  0  0| 0  0  0R 3  6  7  7  7  7  7  7  7  7  6  4  2  0  0  0  0
shot 5 (t0-4 ->): 0  0  0  0  0| 0  0  1  1  7  7  7R 8  8  8  8  8  8  8  3  1  0
```

**The representative frame lands in the pre-cohort flash phase on 3 of the 5 labelled shots** (2, 3
and 4); on shots 1 and 5 it lands in the plateau, and there the reader's count equals the plateau size
(6 and 8, matching `countable`) — though even there it is 5 owner + 1 non-owner and 7 owner + 1
non-owner, not a clean read.

At the representative frame, `owner countable / other white` is **5 / 1** on shot 1, **0 / 8** on
shot 2, **0 / 9** on shot 3, **0 / 4** on shot 4 and **7 / 1** on shot 5. On shots 2, 3 and 4 **not a
single countable owner pellet is present** and the whole reported count is other blobs (2, 1 and 1
owner-linked tracks are alive at those frames respectively, but all of them failed the lifetime gate,
so none is countable). On shot 3 the rep sits at **t0−3**, before the cohort exists at all.

⚑ **Secondary finding — the blast produces TWO detector onsets** (flash, then cohort). Both are
rising edges clearing `EVENT_MIN`, and `make-groundtruth-f811.py`'s `find_t0` ranks onsets by
distance to `approx_idx − EXPECTED_LEAD`, so it takes whichever of the two is nearer. The fixture's
`t0` is therefore the **flash** onset on shots 2/4/5 and the **cohort** onset on 1/3 — the cohort
appears at t0+1 on shots 1 and 3 but at t0+5 (shots 2 and 5) or t0+6 (shot 4, relocked) on the
others. **The f8–11 window is NOT anchored to the same physical event across shots**, which is a
second, independent reason the owner label is window-conditional (§9A).

##### §9D — THE PEAK IS ARTEFACT, and the median's RATIONALE therefore HOLDS

| shot    | peak frame | peak white | owner-matched | unmatched |
| ------- | ---------- | ---------- | ------------- | --------- |
| 1       | t0−4       | 10         | 0             | 10        |
| 2       | t0+1       | 14         | 0             | 14        |
| 3       | t0−4       | 11         | 0             | 11        |
| 4       | t0+0       | 15         | 0             | 15        |
| 5       | t0+5       | 13         | 7             | 6         |
| **tot** |            | **63**     | **7 (11%)**   | **56**    |

**4 of 5 peaks are 100% unmatched.** Independently of any label, `max` puts **504 / 852 events (59%)
above 10** — physically impossible: `hitsPerShot` is **10** for `marciana` (SG/Iron — NOT
`marciana-marine-study`, AR/Iron, which is 1), `isabel`, `guilty` and `noir` in `data/characters.json`.

⇒ **`max` measures the muzzle flash**, and p75 is refuted with it. The median was chosen to avoid the
peak (`read-pellets.ts:663`) and that rationale survives §9 intact. What fails is **which frame the
median lands on**.

##### §9E — Detection and the `min_area` / `min_circ` filters cost ZERO — and that fixture can say nothing else

Scored by `score-pellets.py`'s own cascade over its own committed slice (`real-fidelity-slice.json`,
168 instances / 42 distinct pellets): **100% raw-found and 100% both-pass at offsets 8, 9 and 10**,
dropping to 88.1% / 78.6% at offset 11 (the fade has started).

⚑ It holds **only f8–11 crops** — no peak frame, no plateau, no full event. It therefore **cannot**
speak to the phase question or the peak question, which is why §8G's reuse path does not settle §8G's
question.

##### §9F — The `valid` clamp biases WARM — REFUTED as a cold contributor

Pooled over 5 structural dumps, **852 events**:

| policy               | raw `avgTotal` | events < 5 | events > 10 | clamped n | clamped `avgTotal` | clamp effect     |
| -------------------- | -------------- | ---------- | ----------- | --------- | ------------------ | ---------------- |
| **median (shipped)** | 7.0669         | 107        | 53          | 692       | **7.3092**         | **+0.24 WARMER** |
| p75                  | 8.7887         | 52         | 207         | 593       | 8.0270             | −0.76            |
| max                  | 11.4789        | 25         | 504         | 323       | 8.5882             | −2.89            |

**Is either bound motivated?** Split the in-band track count by which side of the clamp the event's
shipped total falls on (`--representative-audit` prints this table per dump):

| clamp bucket    | mean rep `total` reported | mean in-band tracks actually present         |
| --------------- | ------------------------- | -------------------------------------------- |
| `< 5`           | 2.90 – 3.50               | **3.27 – 4.35** (30 fps); 1.00 (60 fps, n=2) |
| `5..10` (valid) | 7.03 – 7.44               | 5.89 – 7.28                                  |
| `> 10`          | 11.14 – 12.79             | **6.21 – 9.13**                              |

The **upper** bound is physically motivated: 10 is the kit ceiling, and a `> 10` event reporting ~12
carries only ~6–9 long-lived tracks, so it really is over-counting. The **lower** bound is **not**:
a `< 5` event reporting ~3 carries ~3–4 long-lived tracks, i.e. it is a genuine low reading being
excluded wrongly.

⚑ **7.3092 here vs the 7.3242 in §8** — different dump sets (5 dumps / 852 events here; 8 dumps /
815 events there, and §8's `avgTotal` basis is the 4 full fights). Not chased; recorded so the two are
not read as a drift.

##### §9G — THE DISCRIMINATOR IS TRACK LIFETIME, not frame magnitude — and it replicates with NO labels

Over the 5 labelled events, radius-gated non-red tracks:

- **owner pellets n = 42**, lives 8–19, modal at 10 (16 of 42) with 11 next (11 of 42), **minimum
  8**;
- **non-owner n = 148**, of which **146 have life ≤ 7**. The only two at or above 8 are life 22 and 36
  — static HUD elements, already removed by `max_pellet_frames`.

**Zero overlap in the 8–13 band.**

**This replicates without labels.** Every dump's in-event track-lifetime histogram is **bimodal**: a
huge 1–2 frame mode and a separate mode at the owner-pellet lifetime (10–11 at 60 fps; 5–6 at 30 fps,
the correct half). Counting only tracks in the lifetime band gives:

| dump                                        | fps | events  | band    | mean per event | > 10 (ceiling) |
| ------------------------------------------- | --- | ------- | ------- | -------------- | -------------- |
| `groundtruth-f811-v4` (`marciana`, SG/Iron) | 60  | 37      | [8, 13] | 5.62           | 1 (2.7%)       |
| `h4-marciana` (`marciana`, SG/Iron)         | 30  | 218     | [4, 7]  | 6.37           | 7 (3.2%)       |
| `h4-isabel`                                 | 30  | 203     | [4, 7]  | 6.46           | 13 (6.4%)      |
| `h4-guilty`                                 | 30  | 180     | [4, 7]  | 6.20           | 8 (4.4%)       |
| `g2-noir`                                   | 30  | 214     | [4, 7]  | 6.85           | 18 (8.4%)      |
| **pooled**                                  |     | **852** |         |                |                |

versus `max`'s 59% above the ceiling. **This is what makes §9 STRONG MECHANISTIC rather than n=5**:
852 unlabelled events across five dumps and four units reproduce the same two-population structure
the five labelled shots show directly.

⚑ **Correction to a claim made during this investigation: `max_pellet_frames` IS fps-scaled.**
`read-pellets.ts:505` sets it as `max(4, round((13/60) × fps))` — **13 at 60 fps, 7 at 30 fps** — and
the dumps' own `params` confirm it (§8A already recorded this). The standalone `count-pellets.py`
default is a third value, **8**. What survives is the operative half: at 60 fps the cap of 13 **cuts 5
of the 42 owner pellets** (§9B's lifetime-gate column), and cross-dump lifetime comparisons must use
each dump's own value rather than a hardcoded 13.

##### §9H — VERDICT, and what settles it next

**The representative-frame policy is mechanically wrong.** Tier: **STRONG MECHANISTIC** — supported by
the two-phase structure (§9C) AND by the bimodal lifetime distribution replicating on 852 unlabelled
events (§9G), not by the n=5 mean, which §9B shows is cancellation anyway.

Contributing but **secondary**: the lifetime gate drops 5 of 42 real pellets; the radius gate drops 1
of 42 genuinely (the other 7 are the shot-4 mislock).

**What settles it, needing NO new labels and NO owner time:** score any candidate rule on **WHICH
FRAME it selects** — pre-cohort vs plateau — against the 5 labelled events. That is a **categorical**
check with an unambiguous right answer per shot, immune to the mean-matching trap that sank p75. The
per-frame series in §9C is pinned in the fixture as `counted_owner_series` precisely so a candidate can
be scored against it. Second free check: any rule putting more than a few percent of the 852 events
above 10 is over-counting by construction.

⚑ **The ammo arbiter cannot speak to this.** It fixes the DENOMINATOR (how many shots there were), not
the NUMERATOR (pellets per shot). §3b/§4/§8's arbiter results are orthogonal to §9.

##### §9I — Controls

- **White reconstruction.** Recomputing each frame's white count from `tracks` alone reproduces the
  dump's own `frame_counts` on **1786 / 1801** frames of the full ground-truth clip; **all 15
  mismatches fall outside every labelled window** (frames 670, 985, 1660–1671, 1745) and are
  red/marker classification, not white. Over the committed slice's event window the match is
  **369 / 369**.
- **Shipped identity.** The arm's local span rebuild is asserted event-for-event against
  `count-pellets.py`'s own `debounce_shots` on all 5 dumps before any row is scored, so every policy
  row is a difference from the real baseline rather than from a private re-implementation. The
  `debounce_shots` port reproduces the recorded reads **6 / 8 / 9 / 4 / 8** exactly.
- **`_expected` provenance.** The fixture writer and the selftest share one replay helper, so
  `_expected` can only ever be the fixture's own numbers.

##### §9J — ⚑ No `src/skills/overrides/marciana.json` exists

Only `marciana-marine-study.json` is present. `marciana` (SG/Iron) — the unit the ground-truth clip
and two of this thread's structural dumps were recorded on — has **no override**. Recorded as an
observation; nothing here acts on it.

##### Confounds, each with a verdict

- **"8.4 is landed pellets per shot" — REFUTED as worded (§9A).** It is an f8–11 window count. Probably
  still the right number, by the coexistence argument, but that is an argument and the pre-f08 case is
  UNDETERMINED without owner labels.
- **"The cohort fades asynchronously, so no single frame sees it all" — REFUTED (§9B).** Max
  simultaneously-visible == total countable on all 5 shots.
- **"The peak frame is the real count" — REFUTED (§9D).** 89% of peak white is unmatched to any owner
  pellet; `max` breaks the kit ceiling on 59% of events.
- **"The `valid` clamp is a cold contributor" — REFUTED (§9F).** It biases the shipped median WARM by
  +0.24.
- **"Detection or the area/circularity filters lose pellets" — REFUTED in-window (§9E).** 100% / 100%
  at f08–f10. ⚑ In-window only; that fixture cannot see the peak or the plateau.
- **"Shot 4's −5 residual is a counting error" — REFUTED (§9B).** Re-scored under the crosshair its
  crops were cut with, it is 0 radius-rejected and 7 countable; the residual is the documented
  structural mislock, which the label file itself records as `locate: "template"`.
- **"`max_pellet_frames` = 13 is not fps-scaled" — REFUTED (§9G).** `read-pellets.ts:505` scales it;
  the operative half (it cuts 5 of 42 owner pellets at 60 fps) stands.
- **n and scope.** 5 owner-labelled shots on one clip for the categorical half; **852 shipped events
  across 5 dumps and 4 units** for the lifetime and policy halves. The verdict rests on the second.

**NOTHING HERE ENACTS A CHANGE.** `debounce_shots` and every representative-frame policy are UNTOUCHED
in both `count-pellets.py` and `read-pellets.ts`; every policy in this entry is a local scoring variant
inside the audit arm. No guard, gate, threshold or constant was changed; no `DECISIONS.md` entry was
edited; no verdict was stamped on anything outside this measurement log.

##### §9K — Instrument and reproduction

`scripts/probe/analyze-pellet-tracks.py --representative-audit`, self-validated against the committed
slice `scripts/tests/fixtures/pellets/representative-audit-slice.json` and registered in
`scripts/probe/pellet-selftest.sh`. It reads the owner labels from the already-committed
`scripts/tests/fixtures/pellets/groundtruth-f8-11.json` and `-positions.json`, and the filter cascade
from `scripts/tests/fixtures/pellets/real-fidelity-slice.json` via `score-pellets.py`'s own scorer.

```sh
S=/Users/maxwellsutton/nikke-sim/scratchpad/pellets
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --representative-audit \
  $S/groundtruth-f811-v4/tracks.json $S/h4-marciana-structural/tracks.json \
  $S/h4-isabel-structural/tracks.json $S/h4-guilty-structural/tracks.json \
  $S/g2-noir-structural/tracks.json \
  --representative-audit-fps 60 30 30 30 30 \
  --representative-audit-labelled $S/groundtruth-f811-v4/tracks.json \
  --representative-audit-labelled-tmpl $S/groundtruth-f811-shot04-tmpl/tracks.json \
  --representative-audit-labelled-fps 60
# replay the committed slice -- no images, no subprocess, no tracks.json:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --representative-audit-selftest
```

⚑ **The fixture pins the SLICE, not the full clip.** `_expected` holds the labelled block's quiet-
snapped window and all five dumps' full-clip `frame_counts`; the **1786 / 1801**
reconstruction figure in §9I is **live-run only** (printed as `FULL-CLIP CONTROL`), because the
fixture cannot carry 11k tracks. Same split the merge audit uses.

#### §10 THE REPRESENTATIVE-FRAME POLICY SCORE — two candidates reach 5/5 once shot 4 is scored on its own crop

Executes the measurement specified in
[`docs/handoffs/closed/2026-08-04-representative-frame-PRECOMMIT.md`](handoffs/closed/2026-08-04-representative-frame-PRECOMMIT.md)
(committed `ac822e36`, §1–§3 unedited by this entry). Settles §9's own open question ("is there a
representative rule that lands in the pellet cohort instead?") by scoring the four pre-committed
candidates — `shipped_median` (control), `lifetime_gated_median`, `plateau_median`,
`lifetime_band_count` — against the categorical PLATEAU check and the free ceiling check, both
defined in the pre-commit doc's §1. **This entry computes numbers; it does not re-litigate the
decision rule.**

Instrument: `scripts/probe/analyze-pellet-tracks.py --policy-score`, reading
`scripts/tests/fixtures/pellets/representative-audit-slice.json` directly — no new raw data, no
re-derivation (CLAUDE.md reuse-before-derive: that fixture's `labelled.tracks_raw` /
`dumps[].radius_tracks` / `_expected.counted_owner_series*` already carry everything this arm needs).

⚑ **This entry supersedes a first pass that scored 4/5, caught wrong by an independent JUDGE REVIEW
before landing (§10B).** The correction and its two hard controls are recorded here rather than
silently folded in, so the reasoning stays auditable.

##### §10A — Validity checks (per the pre-commit doc's §2; all three PASS)

1. **Shipped-identity control: PASS on all 5 dumps** — the local span rebuild reproduces
   `count-pellets.py`'s own `debounce_shots` event-for-event before any row is scored.
2. **`shipped_median` reproduces reads 6 / 8 / 9 / 4 / 8, `rep_offset` 2 / 2 / −3 / 3 / 7, and
   `above_ceiling_pct` 6.2%** — exact match to the pinned §9C/§9K baseline.
3. **The plateau implementation reproduces shipped = 2/5, IN on shots 1 and 5, OUT on 2/3/4** —
   exact match to §9C's pinned anchor.

All three PASS. Every number below is live, not void.

##### §10B — THE CROP-MISMATCH DEFECT, and its fix

**The first pass scored shot 4's radius gate on the SHIPPED STRUCTURAL crosshair, then checked the
result against the RELOCK plateau — two different crops.** Shot 4's ground-truth plateau is, per the
pre-commit doc's §1.1 instruction, the RELOCK series: the crop its images were actually cut with
(its label file records `locate: "template"`, §9B). But `_ps_labelled_radius_tracks` built the
lifetime-gated per-frame series feeding `lifetime_gated_median`/`plateau_median`/
`lifetime_band_count` from `block["cross"]` (structural) on **every** shot, including 4. That is trap
9 exactly — "using structural for it silently measures a different crop's centre" — applied to the
representative-frame candidates rather than to the decomposition table §9B already covers it for.
Under structural, shot 4 has zero owner pellets ever in radius at all (the documented mislock), so
both band rules found nothing to select and scored `None`/OUT on that shot — a defect in the SCORING
SETUP, not a finding about the policy.

⚑ **§1.1 of the pre-commit doc said shot 4 uses the RELOCK series and did not say which crop the
radius gate runs on — that ambiguity is being resolved here, after seeing results, which is normally
the exact thing pre-commitment exists to prevent.** It stands only because (a) trap 9 and §9B's own
provenance already required this resolution before any result existed, and (b) two hard controls
below discriminate a genuine fix from a permissive one. §1–§3 of the pre-commit doc are **not
edited** — the ambiguity stays on the record there; this section is where it is resolved.

**The fix:** `_ps_labelled_radius_tracks` now takes which crosshair to build against; shot 4's radius
gate (feeding all three band-dependent rules) runs on `cross_tmpl`, every other shot on `cross`,
selected by the shot's own `locate` field. Segmentation (`events`, shared by every shot) stays on the
shipped structural `frame_counts` throughout — only the radius gate's crop changes, and only for shot 4. Every row now carries an explicit `crop` field (`"structural"` or `"template"`) so which crop a
shot was scored on is visible in the fixture, never inferred.

**Two hard controls, both asserted at run time (`_ps_score_labelled` raises `SystemExit` if either
fails; exercised by `--policy-score-selftest` on every run):**

1. **MANDATORY FALSIFICATION CONTROL — the swap must NOT rescue the control.** `shipped_median`
   reads straight off the raw `frame_counts` white+red totals, which §9B already establishes are
   computed once under the shipped structural crosshair regardless of which crop a shot's crops were
   cut with — crosshair-independent by construction. If the crop swap moved `shipped_median` too, the
   fix would be leaking into the control and would be permissive, not selective. **Held**:
   `shipped_median` stays `rep_offset` 3, OUT on shot 4, unchanged from §10A's validity check 2.
2. **CROSS-CHECK against an independently-recorded number.** §9B recorded, before this arm existed,
   that shot 4 "re-scored under the TEMPLATE crosshair its crops were actually cut with" gives "0
   radius-rejected, 7 countable". **Held**: both `lifetime_gated_median` and `plateau_median` report
   `total` = 7 on shot 4 under the fix.

Both controls held, so this is treated as a genuine correction, not a fitted one.

##### §10C — PRIMARY: the categorical check (corrected)

| shot      | crop         | plateau offsets (size)      | `shipped_median`  | `lifetime_gated_median` | `plateau_median`   |
| --------- | ------------ | --------------------------- | ----------------- | ----------------------- | ------------------ |
| 1         | structural   | [1..10] (10)                | +2 **IN** (tot 6) | +2 **IN** (tot 5)       | +5 **IN** (tot 5)  |
| 2         | structural   | [5..13] (9)                 | +2 OUT (tot 8)    | +5 **IN** (tot 7)       | +10 **IN** (tot 8) |
| 3         | structural   | [1..10] (10)                | −3 OUT (tot 9)    | +1 **IN** (tot 7)       | +6 **IN** (tot 7)  |
| 4         | **template** | [5..14] (10, RELOCK series) | +3 OUT (tot 4)    | +6 **IN** (tot 7)       | +10 **IN** (tot 7) |
| 5         | structural   | [5..14] (10)                | +7 **IN** (tot 8) | +8 **IN** (tot 8)       | +10 **IN** (tot 8) |
| **score** |              |                             | **2/5**           | **5/5**                 | **5/5**            |

Per §1.1's table: `shipped_median` still reproduces §9C exactly (2/5, control, not a candidate).
**`lifetime_gated_median` and `plateau_median` both score 5/5 — PROMOTABLE TO PROPOSAL** (a proposal
only — see §3 of the pre-commit doc; nothing here enacts).

##### §10D — SECONDARY: the ceiling check (free) — unaffected by the crop fix

Pooled over the same 852 events across 5 dumps and 4 units §9G/§9K establish. **Unchanged from the
first pass**: the crop fix touches only the 5-shot labelled block, and the 852-event dumps carry no
crop ambiguity (each dump has exactly one crosshair).

| policy                  | n_scored | no_rep | avgTotal | above_ceiling_pct |
| ----------------------- | -------- | ------ | -------- | ----------------- |
| `shipped_median`        | 852      | 0      | 7.0669   | 6.2%              |
| `lifetime_gated_median` | 740      | 112    | 6.2068   | 0.7%              |
| `plateau_median`        | 740      | 112    | 6.2811   | 1.1%              |
| `lifetime_band_count`   | 852      | 0      | 6.4425   | 5.5%              |

**All four are far under the 12.4% reject threshold — none is rejected on this axis.** The two
lifetime-gated frame rules read dramatically lower than shipped (0.7% / 1.1% vs 6.2%), consistent
with §9G's mechanism: the flash population is exactly what a lifetime gate excludes, and the flash is
what pushes shipped's ceiling violations.

##### §10E — ABSTENTION RISK (promoted from a footnote — top open risk for any enactment pass)

**`lifetime_gated_median` and `plateau_median` do not share `shipped_median`'s denominator.**
`shipped_median` and `lifetime_band_count` are scored on all 852 events (`no_rep` 0 on both);
`lifetime_gated_median`/`plateau_median` **ABSTAIN — select no representative frame at all — on
112/852 events (13.1%)**, and their `above_ceiling_pct` above is computed over `n_scored` = 740, NOT
the shared 852.

An abstention cannot over-count by construction, so excluding it from the ceiling denominator is
defensible **for that specific question**. It cannot see the other half: **a rule that silently drops
13.1% of events is a candidate NEW missing-shot channel** — an event this pass never checks whether
the shipped reader would otherwise have scored. This arm does not measure that, does not explain it,
and does not resolve it. **It is the top open risk carried into any enactment pass on these two
rules**, and belongs in that pass's plan, not fixed here.

##### §10F — TERTIARY (§1.3: reported only, never a ranking criterion)

`avgTotal`: `shipped_median` 7.0669, `lifetime_gated_median` 6.2068, `plateau_median` 6.2811,
`lifetime_band_count` 6.4425. None sits near 8.40, and per §1.3 it would not matter if one did —
recorded only so no future session reads a mean as a selection criterion.

##### §10G — `lifetime_band_count` (exempt from §1.1)

| shot | crop       | count | plateau size |
| ---- | ---------- | ----- | ------------ |
| 1    | structural | 6     | 10           |
| 2    | structural | 8     | 9            |
| 3    | structural | 7     | 10           |
| 4    | template   | 7     | 10           |
| 5    | structural | 8     | 10           |

Undercounts the ground-truth plateau's own size on every shot (including 4, once scored on its own
crop) — consistent with §9B's 5-of-42 owner pellets rejected by the lifetime gate alone. Ceiling 5.5%
pooled, clear of 12.4%.

##### §10H — VERDICT per rule, under the pre-committed §1.1/§1.2 rule

- **`shipped_median`** — control; reproduces §9C exactly (2/5). Not a candidate.
- **`lifetime_gated_median`** — **5/5 categorical → PROMOTABLE TO PROPOSAL.** Ceiling 0.7% (over
  n_scored = 740), well clear of reject. Carries the §10E abstention risk (13.1% of events).
- **`plateau_median`** — **5/5 categorical → PROMOTABLE TO PROPOSAL.** Ceiling 1.1% (over n_scored =
  740), well clear of reject. Carries the §10E abstention risk (13.1% of events).
- **`lifetime_band_count`** — exempt from §1.1; ceiling 5.5%, clear of reject; undercounts the true
  plateau size on every shot.

**Both `lifetime_gated_median` and `plateau_median` reach 5/5 and are PROMOTABLE TO PROPOSAL per the
pre-committed rule — a proposal only (pre-commit doc §3); NOTHING HERE ENACTS. `lifetime_band_count`
is not rejected but is not a frame rule and is not scored against §1.1.**

##### §10I — Controls

- **Shipped-identity**: PASS on all 5 dumps (validity check 1).
- **Falsification + cross-check (§10B)**: both held, both asserted at run time, not just claimed.
- **`_expected` provenance**: `policy_score` (the fixture writer) and `policy_score_selftest` both
  call the same `_ps_score_labelled` / `_ps_score_dump` / `_ps_pool_dumps` path, so `_expected` can
  only ever be the source fixture's own numbers.
- **No new raw data**: every number in this entry derives from `representative-audit-slice.json`,
  whose own controls (§9I: white reconstruction 369/369, filter fidelity, shipped-identity) are
  unchanged and unre-derived here. No pre-existing fixture's `_expected` moved — only this arm's own
  `policy-score-slice.json` was regenerated.

##### §10J — n and scope

5 labelled shots on one clip, one unit (`marciana`, SG/Iron), for the categorical half; 852
unlabelled events across 5 dumps and 4 units (`marciana` SG/Iron, `isabel`, `guilty`, `noir`) for the
ceiling half — the same scope §9 established.

**NOTHING HERE ENACTS A CHANGE.** `debounce_shots` and segmentation are UNTOUCHED in both
`count-pellets.py` and `read-pellets.ts`; every rule in this entry is a local scoring variant read off
an already-committed fixture. No guard, gate, threshold or constant was changed; no `DECISIONS.md`
entry was edited; no verdict was stamped on anything outside this measurement log and §4 of the
pre-commit doc it settles. **The 5/5 result here is a PROPOSAL, not a landing** (pre-commit doc §3) —
enacting a representative-frame change is a separate, owner-gated pass with its own blast radius
(fixtures regenerate, and `read-pellets.ts:349` is a second independent implementation that must move
in lockstep).

##### §10K — Instrument and reproduction

`scripts/probe/analyze-pellet-tracks.py --policy-score`, self-validated against the committed slice
`scripts/tests/fixtures/pellets/policy-score-slice.json` and registered in
`scripts/probe/pellet-selftest.sh`. Reads `representative-audit-slice.json` directly; takes no
`tracks.json` arguments of its own.

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --policy-score
# replay the committed slice -- no images, no subprocess, no tracks.json:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --policy-score-selftest
```

---

#### §11 THE `h4-marciana` 177-vs-176 DIVERGENCE — it is a MARKER-CHANNEL defect in the shipped TypeScript, not a `debounce_shots` lockstep break

**2026-08-04.** Chased because the representative-frame enactment proposal
(`docs/handoffs/closed/2026-08-04-representative-frame-PROPOSAL.md` §4.5) makes a lockstep assertion, and
asserting lockstep against a baseline already known to be off is how a silent drift becomes
permanent. **§8H's observation reproduces; both of its guesses are wrong.**

##### §11A — Segmentation is in PERFECT lockstep — `totalShots` = 218 in BOTH

Replaying `count-pellets.py`'s own `debounce_shots` over `h4-marciana-structural/tracks.json`'s
`frame_counts` at fps = 30 gives `totalShots` **218**, exactly the shipped `pellets.json` summary's
**218**. All 218 events agree event-for-event on `start` / `end` / `frames` / `white`.

⇒ **The "the lockstep invariant may ALREADY be one event off" reading in §8H is REFUTED.** The event
grouping is identical. Only `validShots` differs (177 replay vs 176 shipped), which is the
`5 ≤ total ≤ 10` filter, not the grouping.

##### §11B — The median tie-break guess is REFUTED BY INSPECTION

`count-pellets.py:603` and `read-pellets.ts:349` are byte-identical in logic: the same
`(sorted[(m-1)//2] + sorted[m//2]) / 2` median, the same **strict `<`** on the distance-to-median
comparison (`d < best_d` / `d < bestD`), the same `rep.white + shot_red` total. There is no `<` vs
`<=` difference to find. The two implementations pick the **same representative frame**.

##### §11C — Exactly ONE event differs, and only on `core`

|               | representative frame | white | red   | total           | core      | frames | span         |
| ------------- | -------------------- | ----- | ----- | --------------- | --------- | ------ | ------------ |
| Python replay | 1558                 | 4     | **1** | **5 → VALID**   | **true**  | 14     | [1555, 1569) |
| Shipped TS    | same                 | 4     | **0** | **4 → invalid** | **false** | 14     | same         |

One event, #56. It crosses the `min_pellets = 5` floor **solely because of the core flag**, which
contributes `shot_red`. That single flip is the entire 177-vs-176 / 7.2-vs-7.3 / 0.15-vs-0.14 delta.

##### §11D — The channel: `white` and `red` are BYTE-IDENTICAL; only `marker` differs, on 82 frames

Across all **5697** frames of `h4-marciana`:

| channel  | frames differing |
| -------- | ---------------- |
| `white`  | **0**            |
| `red`    | **0**            |
| `marker` | **82**           |

On **82 of 82** the shipped `reads[j].marker` is **0** and the dump's is higher (+1 on 76, +2 on 4,
+3 on 2).

##### §11E — THE MECHANISM: the backend selector ranks on `white + red` and carries `marker` as a passenger

`read-pellets.ts:599` picks the "best" of three backends by **`|white + red − total|` only** — the
marker channel takes no part in the ranking — then reads `white`, `red` **and `marker`** off the
winner (`marker: best.marker ?? 0`, `:619`). `Array.reduce` with a strict `<` **keeps the FIRST
element on a tie**, i.e. `numpy`. The dump's `frame_counts` come from the `--backend opencv`
invocation (`:505`), so its marker channel is opencv's.

Verified on all 82 divergent frames, unanimously:

| check                                   | result      |
| --------------------------------------- | ----------- |
| all three backends TIE on `white + red` | **82 / 82** |
| a marker was seen by **opencv only**    | **82 / 82** |
| dump `marker` == opencv's `marker`      | **82 / 82** |

Frame 1565 is the one that flips event #56: backends `numpy {0,0,0}` / `pil {0,0,0}` /
`opencv {0,0,**3**}`. All three tie at `white + red` = 0, `reduce` keeps `numpy`, and opencv's 3
hit-markers are discarded. `MARKER_MIN` is 2, so the event loses its core hit.

⇒ **The selection is arbitrary by construction on ties — it resolves to ARRAY ORDER, on a channel the
comparison never looks at.** That is a defect independent of which backend is right.

##### §11F — What this does NOT decide

⚑ **Whether opencv's marker = 3 is a TRUE core hit or an opencv false positive is NOT established
here**, and nothing in this entry should be read as saying the Python replay's 177 is the correct
answer. What is established is that the shipped reader chooses between them **by array order**. Which
value is correct needs a measurement against the footage (the ⚔ hit-marker triangles are visually
checkable at frame 1565) and is a separate pass.

##### §11G — Consequence for the enactment proposal

The proposal's §4.5 lockstep criterion is **safe to assert**, with one correction: assert it on a
**COMMON input** — feed both implementations the same `frame_counts` — otherwise the assertion
measures this marker-channel difference rather than the `debounce_shots` algorithm. `debounce_shots`
itself needs no reconciliation before the representative-frame change lands.

##### §11H — Instrument and reproduction

`scripts/probe/analyze-pellet-tracks.py --backend-marker-audit`, self-validated against the committed
FULL-CLIP fixture `scripts/tests/fixtures/pellets/backend-marker-audit-slice.json` (21 pinned checks,
including the exact `h4-marciana-structural` numbers above and the frame-1565 backend readout) and
registered in `scripts/probe/pellet-selftest.sh`. It replays `count-pellets.py`'s own `debounce_shots`
in-process (imported, never re-implemented) over each dump's `tracks.json` `frame_counts`, diffs it
event-for-event against the SHIPPED `read-pellets.ts` output already in that dump's `pellets.json`, does
the full-clip white/red/marker channel census, and — for every marker-divergent frame — the
backend-tie / opencv-only / dump-equals-opencv mechanism check.

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --backend-marker-audit \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-marciana-structural
# replay the committed slice -- no scratchpad paths, no re-derivation:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --backend-marker-audit-selftest
```

**NOTHING HERE ENACTS.** `read-pellets.ts` is UNCHANGED — the backend selector, `MARKER_MIN`, and both
`debounce_shots` implementations are untouched. No constant, gate or default moved; no fixture was
regenerated; no `DECISIONS.md` entry was edited. The defect is RECORDED, and fixing it changes counts,
so it is owner-gated.

##### §11I — Cross-dump generalization: the divergence is common, the FLIP is not

Run across all 8 ammo-series dumps §8 already used (`h4-isabel`, `h4-guilty`, `h4-marciana`, `g2-noir`,
`h1-marciana-treecode`, `i2-marciana-60fps`, `i3-noir-far-60fps`, `i3-noir-near-60fps`) — the same 8
whose replay §8H says matches shipped exactly on 7 of 8:

| dump                   | events | marker-divergent frames | events that FLIP validity |
| ---------------------- | -----: | ----------------------: | ------------------------: |
| h4-isabel-structural   |    203 |                     146 |                         0 |
| h4-guilty-structural   |    180 |                     230 |                         0 |
| h4-marciana-structural |    218 |                      82 |                         1 |
| g2-noir-structural     |    214 |                     204 |                         0 |
| h1-marciana-treecode   |     43 |                      44 |                         0 |
| i2-marciana-60fps      |     10 |                       1 |                         0 |
| i3-noir-far-60fps      |     11 |                       0 |                         0 |
| i3-noir-near-60fps     |     11 |                      49 |                         0 |
| **pooled**             |    890 |                     756 |                         1 |

⇒ **The marker-channel divergence is NOT specific to `h4-marciana`** — it fires on 7 of 8 dumps (756
frames pooled, from 0 on `i3-noir-far-60fps` to 230 on `h4-guilty-structural`), and on every one of those
756 frames the same unanimous mechanism holds (all three backends tie on `white + red`; the marker was
seen by opencv only; the dump's own marker equals opencv's). **But only ONE of those 756 frames ever
flips an event across the `min_pellets = 5` valid-total boundary** — `h4-marciana`'s frame 1565, already
detailed in §11C/§11E. §8H's "matches exactly on 7 of 8" is explained exactly by this: the divergence is
common, but it is a silent, cosmetic disagreement on `marker` almost everywhere it occurs, and a
count-changing one only where a `debounce_shots` event's total already sits one core-hit away from the
valid boundary. This is a generalization of the mechanism, not a new count — the flip rate, the
mechanism's unanimity, and which side is "correct" are exactly as open as §11F leaves them.

---

#### §12 THE `hybrid_plateau_median` MEASUREMENT — scores the enactment PROPOSAL's own fallback rule against its pre-committed §4 criteria

**2026-08-04.** Executes `docs/handoffs/closed/2026-08-04-representative-frame-PROPOSAL.md` §4, whose six
acceptance criteria were on disk before this entry's numbers existed. **THIS IS A MEASUREMENT PASS
ONLY — NOTHING HERE ENACTS.** `debounce_shots` stays untouched in both `count-pellets.py:603` and
`read-pellets.ts:349`; `hybrid_plateau_median` is a fifth scoring variant living entirely inside the
already-committed `--policy-score` arm (`POLICY_RULES` / `_POLICY_FRAME_RULES` in
`scripts/probe/analyze-pellet-tracks.py`), added AFTER and separate from the pre-commit doc's own
§1.4 enumeration (that doc is unedited). No new fixture's raw data was derived — every number below
reads `scripts/tests/fixtures/pellets/representative-audit-slice.json`, the same source §9–§11
already used (CLAUDE.md reuse-before-derive).

**The rule, verbatim from the proposal:** for each event, if it has at least one track whose
lifetime is in the fps-scaled band and is in radius during the event, select the representative
frame by `plateau_median` (midpoint of the longest run of frames within ±1 of that run's modal
total, on the lifetime-gated per-frame series). Otherwise fall back to `shipped_median`, unchanged.
Implemented in `_ps_score_event`: the `hybrid_plateau_median` branch calls the exact same
`_ps_plateau_rep` band-gated selector `plateau_median` uses, and on `None` returns the event's own
`ev["rep"]`/`ev["total"]` fields — the literal `debounce_shots` answer already computed for
`shipped_median`, not a recomputed copy of it — so the fallback is bit-identical BY CONSTRUCTION,
and §12's controls (below) assert that construction rather than trust it.

##### §12A — THE SIX CRITERIA

| #   | criterion                                                                                                                  | measured                                                                                                                                          | verdict                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Categorical, 5/5 on the 5 labelled shots, shot 4 on its own crop via `locate`                                              | **5/5** — IN on all five (shot 4 crop=template, rep_offset=10, matching bare `plateau_median` exactly)                                            | **PASS**                   |
| 2   | Ceiling ≤ 12.4% over the full 852, `n_scored`=852, `no_rep`=0                                                              | `above_ceiling_pct`=**1.8%**, `n_scored`=**852**, `no_rep`=**0**                                                                                  | **PASS**                   |
| 3   | Missing-shot neutrality: pooled MISSED ≤ shipped's 58/7.0% on the 8-series/830-ammo-shot basis, any increase disqualifying | **58 (7.0%), unchanged** — see §12C for why this is a by-construction result, not a re-measurement                                                | **PASS**                   |
| 4   | Falsification control: bit-identical to shipped on events with no band track, asserted in code                             | **Held on all 112 fallback events**, asserted via `SystemExit` in `_ps_assert_hybrid_decomposition` (not assumed)                                 | **PASS**                   |
| 5   | Lockstep on a common input (both implementations fed the same `frame_counts`)                                              | Already resolved, §11 — `debounce_shots` needs no reconciliation; shipped-identity control (the common-input check) still **PASS** on all 5 dumps | **PASS**                   |
| 6   | `avgTotal` / 8.40 comparison reported only, never a ranking criterion                                                      | `avgTotal` = **6.1561** — reported here and nowhere used to rank                                                                                  | **N/A (compliance check)** |

**All five substantive criteria PASS.** Criterion 6 is a reporting discipline, not a pass/fail
measurement; it is satisfied by this entry never invoking `avgTotal` or 8.40 to prefer, rank, or
justify `hybrid_plateau_median` over any other rule.

##### §12B — THE CATEGORICAL CHECK, in full

Reusing `_ps_score_labelled` unmodified — the shot-4 crop selection (`locate` field → `cross_tmpl`
for the radius gate, `cross` for the rest), the MANDATORY FALSIFICATION CONTROL on `shipped_median`,
and the §9B cross-check on `lifetime_gated_median`/`plateau_median`'s shot-4 total=7 all still fire
and all still hold, unmodified — because `hybrid_plateau_median` is just one more entry in
`_POLICY_FRAME_RULES` that `_ps_score_labelled` already iterates:

| shot      | crop         | `plateau_median` | `hybrid_plateau_median` |
| --------- | ------------ | ---------------- | ----------------------- |
| 1         | structural   | +5 IN (tot 5)    | +5 IN (tot 5)           |
| 2         | structural   | +10 IN (tot 8)   | +10 IN (tot 8)          |
| 3         | structural   | +6 IN (tot 7)    | +6 IN (tot 7)           |
| 4         | **template** | +10 IN (tot 7)   | +10 IN (tot 7)          |
| 5         | structural   | +10 IN (tot 8)   | +10 IN (tot 8)          |
| **score** |              | **5/5**          | **5/5**                 |

`hybrid_plateau_median` reproduces `plateau_median` frame-for-frame and total-for-total on every one
of the 5 labelled shots — expected, since none of the 5 labelled events abstains (§10 already
established `plateau_median` is 5/5 IN, never `None`, on this set), so the hybrid never has occasion
to fall back within the labelled block. The categorical half therefore cannot discriminate the
hybrid from bare `plateau_median` — the abstention question is answered by §12D, which uses the full 852.

##### §12C — MISSING-SHOT NEUTRALITY, and the basis it is computed on

**MISSED is computed on detected EVENTS, not on VALID (5..10-total) shots — so a representative-frame
change cannot alter it, and this section says so plainly rather than manufacturing a delta.**

Read off the code, not assumed: `--merge-audit`'s `shipped` candidate builds `ev` from
`_merge_events(frame_counts, totals, _merge_spans(totals, fps, "shipped"))` filtered only by
`lo <= x["start"] < hi` — no `total`/valid filter — then scores it with
`match_shots(events, [x["start"] for x in ev], slack)` (`analyze-pellet-tracks.py:2845-2874`).
`match_shots` matches ammo-arbiter shot slots to detector onset TIMES (`x["start"]`, the event's
segmentation boundary), never to `x["total"]` or `x["rep"]`. `n_valid`/`sum_valid_total` (which feed
`avgTotal`) are the only fields in that function gated on the 5..10 clamp; `MISSED` is not one of
them.

`hybrid_plateau_median` changes WHICH FRAME an already-segmented event reports its count from
(`rep`/`total`); it does not touch `_merge_spans`, `debounce_shots`, or any event's `start`/`end` —
segmentation is not reachable from the `--policy-score` arm at all, by construction (§9K, §10, §11
all establish this same boundary). So `x["start"]` for every one of the 884 events across the 8
scorecard series is identical whether or not `hybrid_plateau_median` exists, and MISSED cannot move.

**Reproduced, not just argued:** re-ran the existing committed arm the §4 criterion names
(`--merge-audit`, reusing the already-cached `<dump>-ammo.json` payloads §8/§9/§10 built, no new raw
data) over the same 8 series / 830 ammo shots §8E/§8F used:

```
rule            MISSED      %  SPUR?  detected  valid  avgTotal   change
shipped             58   7.0%      5       884    716    7.3045      0.0
```

**Exact reproduction of the pinned 58/7.0%.** Since `hybrid_plateau_median` cannot move `x["start"]`
for any event (the mechanism above), this is not a coincidence to be re-measured after every future
change — it is the direct consequence of representative-frame selection being strictly downstream of
segmentation. **PASS, 0 pp change, by construction and reproduced.**

##### §12D — THE 740/112 DECOMPOSITION — the free, strong internal check

The proposal's own prediction: `hybrid_plateau_median` should reproduce bare `plateau_median` EXACTLY
on the 740 events that have a band track in radius, and bare `shipped_median` EXACTLY on the other
112 that do not. **Asserted event-by-event in code** (`_ps_assert_hybrid_decomposition`, called from
`_ps_score_dump` for every dump on every `--policy-score` / `--policy-score-selftest` run — not a
separate opt-in check):

- On every event where `_ps_plateau_rep` returns `None` (no band track in radius): raises
  `SystemExit` unless `hybrid`'s `rep` AND `total` equal the event's own shipped `rep`/`total`
  exactly (this IS the falsification control, criterion 4).
- On every event where it returns a frame: raises `SystemExit` unless `hybrid`'s `rep`/`total` equal
  bare `plateau_median`'s `rep`/`total` exactly, computed via the same `_ps_score_event` call rather
  than a second implementation.

Pooled across all 5 dumps (`_ps_assert_decomposition_matches_plateau`, called from both `policy_score`
and `policy_score_selftest`, also `SystemExit` on mismatch):

```
decomposition: 740 banded (== bare plateau_median) + 112 fallback (== bit-identical shipped) = 852
```

**740 banded + 112 fallback = 852, exactly matching bare `plateau_median`'s pooled `n_scored`=740 /
`no_rep`=112 from §10D.** Both the per-event and the pooled assertion held on every run in this
entry — no `SystemExit` fired. This is the internal check the proposal names as "free and strong":
it does not depend on any external ground truth, only on the hybrid's own construction being
correctly implemented, and it is now exercised on every future `--policy-score-selftest` run rather
than a one-time claim.

##### §12E — Controls

- **Shipped-identity control**: PASS on all 5 dumps, reasserted at the top of both `policy_score()`
  and `policy_score_selftest()` before any row is scored (unchanged from §10A/§10I).
- **Falsification control (criterion 4)**: PASS, asserted in code, held on all 112 fallback events —
  see §12D.
- **Decomposition check**: PASS, asserted in code both per-event and pooled — see §12D.
- **§10B's two hard controls** (MANDATORY FALSIFICATION CONTROL on `shipped_median`'s shot-4
  `rep_offset`=3/OUT; the §9B cross-check that `lifetime_gated_median`/`plateau_median` both report
  `total`=7 on shot 4) are unmodified and still fire on every run, since `hybrid_plateau_median` was
  added without touching `_ps_score_labelled`'s existing logic.
- **`_expected` provenance**: `policy_score` (the fixture writer) and `policy_score_selftest` (the
  replay) call the identical `_ps_score_labelled` / `_ps_score_dump` / `_ps_pool_dumps` /
  `_ps_assert_decomposition_matches_plateau` path, so `_expected` can only ever be the source
  fixture's own numbers — unchanged convention from §10I.
- **No other fixture's `_expected` moved.** `git status` after this entry's work shows exactly one
  fixture touched: `scripts/tests/fixtures/pellets/policy-score-slice.json` (this arm's own score
  fixture, expected to regenerate per the task's own instructions). `representative-audit-slice.json`
  and every other committed fixture are byte-identical to before this entry.
- **Lockstep (criterion 5)**: already resolved by §11 — the `h4-marciana` divergence is a
  marker-channel defect independent of `debounce_shots`, not a lockstep break. The common-input
  requirement §11G names is satisfied by the shipped-identity control re-running on every
  `--policy-score` invocation: it feeds both the local span rebuild and (transitively, via the
  already-committed dump) the shipped TypeScript output the SAME `frame_counts`.
- **`scripts/probe/pellet-selftest.sh` green, true exit status** (not through `| tail`): confirmed —
  `bash scripts/probe/pellet-selftest.sh; echo $?` → `0`, "pellet-selftest: all passed", including
  `--policy-score-selftest` among the 19 tool selftests it runs.
- **`npm run typecheck` clean**: confirmed. No TypeScript file was touched by this entry —
  `read-pellets.ts:349` is unmodified, per the task's own constraint.

##### §12F — n and scope

Identical to §10J: 5 labelled shots on one clip, one unit (`marciana`, SG/Iron), for the categorical
half (§12B); 852 unlabelled events across 5 dumps and 4 units (`marciana` SG/Iron, `isabel`,
`guilty`, `noir`) for the ceiling and decomposition halves (§12A criterion 2, §12D); 8 ammo series /
830 ammo shots across the same 4 units plus 4 additional short 60 fps re-extractions, for the
missing-shot arbiter (§12C) — the same basis §8E/§8F/the PROPOSAL's own §4 criterion 3 name.

**NOTHING HERE ENACTS A CHANGE.** `debounce_shots` is UNTOUCHED in both `count-pellets.py` and
`read-pellets.ts`; `hybrid_plateau_median` is a local scoring variant living entirely inside the
`--policy-score` arm of `scripts/probe/analyze-pellet-tracks.py`. No guard, gate, threshold or
default in the shipped reader was changed; no `DECISIONS.md` entry was edited; no verdict beyond
this measurement log was stamped. Whether to LAND the hybrid in the shipped pipeline — the design
the proposal describes — is a separate, owner-gated implementation pass that this entry's PASS
verdicts make possible but do not themselves authorize.

##### §12G — Instrument and reproduction

`scripts/probe/analyze-pellet-tracks.py --policy-score` (now scoring five rules, extending
`POLICY_RULES`/`_POLICY_FRAME_RULES`), self-validated against the regenerated
`scripts/tests/fixtures/pellets/policy-score-slice.json` and already registered in
`scripts/probe/pellet-selftest.sh` (no new selftest flag needed — `hybrid_plateau_median` rides the
existing `--policy-score-selftest`).

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --policy-score
# replay the committed slice -- no images, no subprocess, no tracks.json:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --policy-score-selftest
# criterion 3's missing-shot basis, reusing the already-cached ammo-series payloads (§8J):
B=/Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --merge-audit \
  $B/h4-isabel-ammo.json $B/h4-guilty-ammo.json $B/h4-marciana-ammo.json $B/g2-noir-ammo.json \
  $B/gt-ammo-series.json $B/i2-marciana-60fps-ammo.json $B/i3-noir-far-60fps-ammo.json \
  $B/i3-noir-near-60fps-ammo.json \
  --merge-audit-fps 30 30 30 30 60 60 60 60 --merge-audit-slack 8 8 8 8 6 6 6 6
# the whole reader toolchain, including this arm's selftest, with a TRUE exit status:
bash scripts/probe/pellet-selftest.sh; echo $?
```

---

#### §13 THE FALLBACK HYBRID LANDS — `band` channel + `debounce_shots`/`debounceShots` hybrid, both implementations, owner-authorized

**2026-08-04.** Executes the owner-authorized implementation pass named in
[`docs/handoffs/closed/2026-08-04-representative-frame-PROPOSAL.md`](handoffs/closed/2026-08-04-representative-frame-PROPOSAL.md):
moves the fallback hybrid on `plateau_median` from a scoring variant inside `--policy-score`
(§9–§12) into the SHIPPED pipeline — `count-pellets.py:debounce_shots` and its TypeScript mirror
`read-pellets.ts:debounceShots`. **This entry enacts a change** (unlike §9–§12, which were
measurement-only); it is gated by the six pre-committed §4 criteria and the four mandatory checks
below, all re-measured against the landed code, not the audit-arm scoring variant that predicted
them.

##### §13A — What changed, in both implementations

**`scripts/probe/count-pellets.py`:**

- A new `REP_OWNER_LIFE_LO_60FPS = 8` constant + `_band_lo(fps)` helper (duplicated from
  `analyze-pellet-tracks.py`'s constant of the same name/value/formula — the two files have no
  import relationship in that direction, same convention `debounce_shots`'s own "kept in lockstep,
  not shared" note already uses).
- `build_tracks_and_counts` split into `_track_components` (the nearest-neighbor tracker, logic
  unchanged) and `_frame_pellet_counts` (the per-frame radius/lifetime window), the latter now
  emitting a FOURTH key, `band`: the count of in-radius WHITE (non-red) tracks on that frame whose
  OVERALL lifetime also falls in `[_band_lo(fps), max_pellet_frames]` — a strict subset of `white`.
  `build_tracks_and_counts`'s public signature/return shape is unchanged; every one of its callers
  (`--shots`, `--sweep`, and `--temporal`'s stdout `results`) now carries `band` for free.
- `debounce_shots`: a `has_band = any('band' in r for r in frame_counts)` check computed once, up
  front. When `True`, each event additionally computes `_plateau_rep` (a verbatim port of
  `analyze-pellet-tracks.py`'s `_ps_plateau_rep`/`_ps_longest_modal_run` — the longest run of
  frames with `band >= event_min` whose values sit within ±1 of the run's own mode) over its own
  `band` series; if that returns a frame, `rep_idx`/`white`/`total` are OVERWRITTEN with the band
  value at that frame (`shot_red`/`core_hit`/`event_frames`/`start`/`end` never move). When
  `has_band` is `False`, or the event's own plateau returns `None`, the function is byte-identical
  to the pre-hybrid code path — this is the backward-compat default the design required, and it is
  what makes every band-less committed dump/fixture replay unchanged (§13E).

**`scripts/probe/read-pellets.ts`:** the identical port —

- `PelletCount`/`FrameCounts`/`Read` gain an optional `band` field, threaded from the Python
  counter's stdout through `best.band ?? 0` (same pattern as `marker`).
- The inline debounce block (previously top-level imperative code) is now a hoisted
  `function debounceShots(frameCountsIn, fps, markerMin, minPellets, maxPellets)`, mirroring
  `count-pellets.py`'s signature and returning `{shots, summary}` keyed by absolute frame index
  (`frame`, not enriched with `videoT`/`timerSec` — the main pipeline enriches those afterward via
  `reads[s.frame]`, same separation `debounce_shots` already has from any timer/video concept).
  `longestModalRun`/`plateauRep` are direct ports of the Python helpers above.
- A new `--debounce-json <path>` CLI mode: reads a JSON array of `{white,red,marker,band}`, calls
  `debounceShots` directly, prints `{shots, summary}` — no video, ffmpeg, or VLM endpoint needed.
  This exists SPECIFICALLY so the two implementations can be fed a literal common input and diffed
  (mandatory check 4, §13D) rather than asserting lockstep only through two separate live runs that
  happen to have processed "the same" video. Required moving the CLI's video-vs-flag parsing loop
  to scan from `argv[0]` instead of assuming it is always the video (previously true; `--debounce-
json` has no video argument at all).

##### §13B — MANDATORY CHECK 1: EQUIVALENCE — production's own `band` channel vs the audit arm's independent `_ps_band_totals`

New instrument: `scripts/probe/analyze-pellet-tracks.py --hybrid-landing-audit`. Its `band`
computation is a genuine SECOND implementation on a DIFFERENT data path from
`_ps_band_totals` (§9G/§12): production reconstructs `frame_tracks` from a track list (no
re-tracking — the nearest-neighbor tracker is never re-run, only which frames each already-
identified track was in-radius on is re-derived, avoiding any risk of a crossing-track
reassignment drifting from the original live run) and calls the SHIPPED `_frame_pellet_counts` in
a frame-major loop; the audit arm walks track-then-frame over already radius-gated `runs`, built
and aggregated in an entirely separate function (`_ps_band_totals`), reusing
`representative-audit-slice.json`'s already-committed `radius_tracks`/`tracks_raw` (CLAUDE.md
reuse-before-derive — nothing here re-derives ground truth, only the NEW production channel).

**Result: 0 mismatches, on every frame, on every dump checked** — the labelled block (both crops,
446 frames × 2) and all 5 full-clip dumps (852 events' worth, 5697+5723+5740+5724+1801 = 24,685
frames):

| block                    | frames | mismatched |
| ------------------------ | ------ | ---------- |
| labelled/structural      | 446    | **0**      |
| labelled/template        | 446    | **0**      |
| `groundtruth-f811-v4`    | 1801   | **0**      |
| `h4-marciana-structural` | 5697   | **0**      |
| `h4-isabel-structural`   | 5723   | **0**      |
| `h4-guilty-structural`   | 5740   | **0**      |
| `g2-noir-structural`     | 5724   | **0**      |

**Asserted, not just reported**: `audit_hybrid_landing` raises `SystemExit` on the first non-zero
mismatch count, on every dump, before any downstream check runs — a silent disagreement could not
have been buried in a summary stat.

##### §13C — MANDATORY CHECK 2: criteria re-measured against the PRODUCTION `debounce_shots`

Every number below comes from `_hla_score`, which calls the real `count_pellets.debounce_shots`
(imported in-process) — not `_ps_score_event`'s `hybrid_plateau_median` scoring variant (§9–§12),
which only PREDICTED these numbers would hold once landed.

| criterion                                                         | measured                                                               | verdict  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| Categorical, 5/5 on the 5 labelled shots, shot 4 on its own crop  | **5/5** — offsets +5/+10/+6/+10/+10, all IN                            | **PASS** |
| Ceiling ≤ 12.4% over the full 852, `n_scored` = 852, `no_rep` = 0 | `above_ceiling_pct` = **1.8%**, `n_scored` = **852**, `no_rep` = **0** | **PASS** |
| Pooled MISSED ≤ 58 / 7.0% (8-series / 830-ammo-shot basis)        | **58 (7.0%), unchanged** — see §13F                                    | **PASS** |

`no_rep = 0` is not a measured coincidence: production's hybrid branch has no abstain path by
construction (PROPOSAL §2) — when the plateau returns `None`, the event falls back to the shipped
`rep`/`total` already computed, never to a null. `above_ceiling_pct` = 1.8% reproduces §12A's own
scoring-variant figure (also 1.8%) exactly, and the pooled `avgTotal` computed the audit arm's own
way (unclamped mean over every scored event, §9F/§10D/§12A's convention) is **6.1561** — an EXACT
match to §12A's `hybrid_plateau_median` figure, corroborating that the landed code and the scoring
variant that motivated it compute the identical thing. ⚑ A SECOND, differently-defined `avgTotal`
is also reported (`avgTotal_validShots` = 6.8305, the `5..10`-clamped figure a real run's own
`summary.avgTotal` would show) — the two are not comparable and neither is a ranking criterion
(PROPOSAL §4 criterion 6); recorded so a future session does not read the delta between them as a
finding.

##### §13D — MANDATORY CHECK 3: the falsification control

`_hla_falsification` asserts, per event: if NO frame in that event's own span carries `band > 0`,
the hybrid answer is bit-identical to a band-stripped replay of the SAME `debounce_shots` (same
`frame`/`white`/`red`/`total`). **Held on every event, on every dump — 0 bad events, asserted via
`SystemExit`, not assumed:**

| dump                     | events | falsification bad |
| ------------------------ | ------ | ----------------- |
| `groundtruth-f811-v4`    | 37     | **0**             |
| `h4-marciana-structural` | 218    | **0**             |
| `h4-isabel-structural`   | 203    | **0**             |
| `h4-guilty-structural`   | 180    | **0**             |
| `g2-noir-structural`     | 214    | **0**             |

##### §13E — MANDATORY CHECK 4: lockstep on a common input (live)

`--hybrid-landing-audit-ts-lockstep` feeds `count-pellets.py`'s `debounce_shots` AND
`read-pellets.ts`'s new `--debounce-json` mode the LITERAL SAME `frame_counts`-with-`band` array
(a temp JSON file, one per dump) and diffs `shots` event-for-event. **0 diffs on every one of the 6
inputs checked** (the labelled block + all 5 full dumps):

```
labelled/structural                ok=True py=10  ts=10  n_diff=0
groundtruth-f811-v4                 ok=True py=37  ts=37  n_diff=0
h4-marciana-structural               ok=True py=218 ts=218 n_diff=0
h4-isabel-structural                 ok=True py=203 ts=203 n_diff=0
h4-guilty-structural                 ok=True py=180 ts=180 n_diff=0
g2-noir-structural                   ok=True py=214 ts=214 n_diff=0
```

This is LIVE-only (needs `npx tsx`; not part of `--hybrid-landing-audit-selftest`, same
live/replay split `audit_representative`'s "FULL-CLIP CONTROL" already uses) — it was run for
real during this landing pass, not skipped.

##### §13F — MISSED, confirmed unchanged by construction (not re-derived)

Per the task's own instruction: MISSED is matched on event ONSETS (`detected_t0`), never on
totals, so a representative-frame rule cannot move it (§12C already established this — `_merge_
spans`/`_merge_events`, the segmentation `--merge-audit`'s `shipped` candidate uses, are a
SEPARATE code path from `debounce_shots` and are untouched by this landing). Re-ran anyway (no new
raw data — the already-cached `_missingshot_tmp/*-ammo.json` payloads §8/§12C used):

```
rule            MISSED      %  SPUR?  detected  valid  avgTotal   change
shipped             58   7.0%      5       884    716    7.3045      0.0
```

**Exact reproduction of the pinned 58/7.0% and 7.3045 `avgTotal`.** Confirmed, not manufactured.

##### §13G — Fixtures: what moved, and why

`git status` after this landing shows exactly ONE existing fixture-adjacent value moved, and one
new fixture added:

- **`count-pellets.py`'s `CACHE_SELFTEST_EXPECT`** (a pinned constant, not a JSON fixture) moved
  `validShots` 7→6, `avgTotal` 7.1→6.7 on the committed `h1-cache-slice.json` 200-frame real slice.
  This is the hybrid rule genuinely re-picking a lower-total plateau frame on 7 of the slice's 9
  events (consistent with §9D: the shipped median often samples the muzzle flash, which reads
  high); one event (span `[78, 85)`) crosses the `min_pellets = 5` floor going from `total = 5`
  (valid) to `total = 4` (invalid), which is the entire delta. Reproduced directly: `debounce_
shots` on this slice's own `build_tracks_and_counts` output vs the same output with `band`
  stripped diverges on events `{0, 2, 3, 4, 6}` (0-indexed) and agrees on `{1, 5, 7, 8}` — event 4
  is the only one that also flips validity. Explained in-line at the constant's definition.
- **Every other committed `scripts/tests/fixtures/pellets/*.json` is byte-identical to before this
  entry** — confirmed by `git status` showing no other file under that path modified. This is the
  backward-compat default working as designed: every existing fixture was built on a band-less
  dump, `has_band` is `False` for all of them, and `debounce_shots` takes the unchanged code path.
- **New pinning fixture**: `scripts/tests/fixtures/pellets/hybrid-landing-audit-slice.json` —
  production's own `band` series for the labelled block (both crops) and all 5 full-clip dumps,
  self-validated by `--hybrid-landing-audit-selftest` (registered in `pellet-selftest.sh`) cross-
  checked against the ALREADY-committed `representative-audit-slice.json` for everything the audit
  side needs (§13B's reuse-before-derive). This is the fixture the task instructions required: "the
  old dumps cannot pin [the new behaviour] — add one."
- **`read-pellets-ammo-offset.test.ts`** (the one other pellet-adjacent vitest file) is a pure
  source-text regex check unrelated to `debounceShots`; unaffected, confirmed by `npm run
typecheck` and `npx vitest run` (via `verify.sh`) both green.

##### §13H — Controls

- **Backward compat**: asserted structurally (`has_band` computed once, up front, from the WHOLE
  input) and empirically (every pre-existing fixture replays byte-identical, §13G).
- **Falsification control**: PASS on all 5 dumps, asserted in code (§13D).
- **Equivalence**: PASS on the labelled block (both crops) and all 5 dumps, asserted in code
  (§13B).
- **Lockstep**: PASS on 6/6 inputs, live (§13E).
- **`_expected` provenance**: `audit_hybrid_landing` (the fixture writer) and `hybrid_landing_
audit_selftest` (the replay) both route every number through `_hla_score`/`_hla_equivalence`/
  `_hla_falsification`, so `_expected` can only ever be those functions' own numbers — same
  discipline as every other arm in this file.
- **Gates, TRUE exit status, not through `| tail`**:
  - `bash scripts/probe/pellet-selftest.sh; echo $?` → `0` ("pellet-selftest: all passed",
    including the new `--hybrid-landing-audit-selftest`).
  - `bash scripts/verify.sh; echo $?` → `0` (typecheck, override validation, all regressions,
    `npx vitest run` — 151 files / 2179 tests passed).
  - `npm run typecheck` → clean, no errors.

##### §13I — n and scope

Identical scope to §9–§12: 5 labelled shots on one clip (`marciana`, SG/Iron) for the categorical
half; 852 events across 5 dumps and 4 units (`marciana` SG/Iron, `isabel`, `guilty`, `noir`) for
the ceiling/equivalence/falsification/lockstep halves; 8 ammo series / 830 ammo shots for the
missing-shot confirmation.

**THIS ENTRY ENACTS.** `count-pellets.py:debounce_shots` and `read-pellets.ts:debounceShots` now
carry the fallback hybrid on `plateau_median`, live in the shipped pipeline. Segmentation
(`_merge_spans`/`_merge_events`/`debounce_shots`'s own event-grouping loop), `MARKER_MIN`, and
every other constant/gate/default named out-of-scope by the implementation task are UNCHANGED.

##### §13J — Instrument and reproduction

```sh
# the new instrument (equivalence, categorical, ceiling, falsification — python side):
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --hybrid-landing-audit \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/groundtruth-f811-v4 \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-marciana-structural \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-isabel-structural \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-guilty-structural \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/g2-noir-structural \
  --hybrid-landing-audit-ts-lockstep \
  --save-hybrid-landing-audit-fixture scripts/tests/fixtures/pellets/hybrid-landing-audit-slice.json
# replay the committed slice -- python side only, no live tracks.json, no npx tsx:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --hybrid-landing-audit-selftest
# the TS common-input harness directly:
npx tsx scripts/probe/read-pellets.ts --debounce-json <frame_counts_with_band.json> --fps 30
# MISSED confirmation (§13F), reusing the already-cached ammo-series payloads:
B=/Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --merge-audit \
  $B/h4-isabel-ammo.json $B/h4-guilty-ammo.json $B/h4-marciana-ammo.json $B/g2-noir-ammo.json \
  $B/gt-ammo-series.json $B/i2-marciana-60fps-ammo.json $B/i3-noir-far-60fps-ammo.json \
  $B/i3-noir-near-60fps-ammo.json \
  --merge-audit-fps 30 30 30 30 60 60 60 60 --merge-audit-slack 8 8 8 8 6 6 6 6
# the whole reader toolchain, including this arm's new selftest, TRUE exit status:
bash scripts/probe/pellet-selftest.sh; echo $?
bash scripts/verify.sh; echo $?
```

#### §14 THE LIFETIME-CAP `band_hi` MEASUREMENT — a decoupled band ceiling; 19 and 20 clear both out-of-sample gates, 21 clears them too but is not lockstep-safe

**2026-08-04.** Executes the measurement pass pre-committed in
[`docs/handoffs/closed/2026-08-04-lifetime-cap-PRECOMMIT.md`](handoffs/closed/2026-08-04-lifetime-cap-PRECOMMIT.md).
**MEASUREMENT ONLY — this entry does not enact anything.** Scores a DECOUPLED upper bound for the
counted-pellet band (`band_hi`) — never a raised `max_pellet_frames`, which also gates
`pellet_ids`/segmentation and would move `totalShots`/onsets (the pre-commit's §1) — against the
pre-committed candidate set `{control, 19, 20, 21}` (60 fps basis, fps-scaled per dump by this
instrument's own Python `round()`). New instrument: `analyze-pellet-tracks.py --cap-score`, reading
`representative-audit-slice.json` directly — no new raw data, no re-extraction, no owner time.

##### §14A — Validity checks (§3 of the pre-commit; all six PASS, asserted via `SystemExit`)

| check                                                             | result                                                                                                                                                  | verdict             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1. Control reproduces the landed §12/§13 figures                  | `n_scored`=852, `no_rep`=0, banded/fallback=740/112, `above_ceiling_pct`=1.8%, `avgTotal`=6.1561 — **exact**                                            | **PASS**            |
| 2. Monotonicity (band membership non-decreasing)                  | scaled `band_hi` non-decreasing per dump; admitted white-track count non-decreasing per candidate, per dump                                             | **PASS**            |
| 3. Stored (never recomputed) `max_pellet_frames`                  | 13 at 60 fps, 7 at 30 fps on all 5 dumps — the JS half-up value, not Python's `round(6.5)=6`                                                            | **PASS**            |
| 4. Shot 4's radius gate on `cross_tmpl`                           | inherited verbatim from `_ps_score_labelled`/`_ps_labelled_radius_tracks`; not re-derived here                                                          | **N/A — inherited** |
| 5. `_ps_band` additive (`band_hi=None` default)                   | all 6 pre-existing callers pass no third argument; `--policy-score-selftest` / `--hybrid-landing-audit-selftest` still byte-identical after this change | **PASS**            |
| 6. Fidelity premises (`radius_tracks` white-only, in-radius-only) | pinned via source inspection of `_rep_slim_dump`/`_rep_radius_runs`                                                                                     | **PASS**            |
| 7. `shot_red` event-fixed                                         | recomputed red flag matches the shipped event's own on every event, every dump                                                                          | **PASS**            |

##### §14B — §2.1 CONSISTENCY (in-sample, n=42 owner pellets, ONE clip, `marciana` SG/Iron) — ⚑ NO EVIDENTIAL WEIGHT

Read straight from `representative-audit-slice.json`'s own `_expected.lifetime_summary`, not
recomputed. `band_lo` = 8 at 60 fps throughout.

| candidate | `band_hi` | owner admitted | statics admitted | verdict                                                      |
| --------- | --------- | -------------- | ---------------- | ------------------------------------------------------------ |
| control   | 13        | 37/42          | none             | **FAIL** — the pinned 5-pellet gap (§9B), reproduced exactly |
| 19        | 19        | 42/42          | none             | **PASS**                                                     |
| 20        | 20        | 42/42          | none             | **PASS**                                                     |
| 21        | 21        | 42/42          | none             | **PASS** — life-22 static still excluded (22 > 21)           |

Tautological by construction (the pre-commit's own risk-flag disposition): all three non-control
candidates pass because the corridor `[19,21]` was derived from this exact population. **Reported,
not cited as evidence.**

##### §14C — §2.3 CEILING (out-of-sample, 852 events / 5 dumps / 4 units: `marciana` SG/Iron ×2 recordings, `isabel`, `guilty`, `noir`) — MANDATORY

| candidate | `n_scored` | banded/fallback | `above_ceiling_pct` | `avgTotal` | verdict (≤6.2% PASS)          |
| --------- | ---------- | --------------- | ------------------- | ---------- | ----------------------------- |
| control   | 852        | 740/112         | 1.8%                | 6.1561     | **PASS** (reproduces §12/§13) |
| 19        | 852        | 756/96          | 3.1%                | 6.6631     | **PASS**                      |
| 20        | 852        | 756/96          | 3.1%                | 6.6631     | **PASS**                      |
| 21        | 852        | 756/96          | 3.1%                | 6.6643     | **PASS**                      |

All three non-control candidates clear the 6.2% ceiling with room (3.1% vs 6.2%). 19 and 20 are
numerically identical here; 21 differs by 0.0012 in `avgTotal` only (one additional life-21 track on
the 60 fps `groundtruth-f811-v4` dump — see §14G).

⚑ **THE SENSITIVITY ARMS ARE VACUOUS OUT-OF-SAMPLE, and the record must not claim otherwise**
(raised by the cross-family post-op review, §14J). The pre-commit's §2.2 scored 19 and 21 as
sensitivity arms "to show the verdict does not hinge on which value in the corridor is picked."
**At 30 fps all three candidates fps-scale to the same `band_hi = 10`** (Python `round()`:
`round(9.5) = 10`, `round(10.0) = 10`, `round(10.5) = 10`), so on **all four out-of-sample dumps
19, 20 and 21 are the same measurement, not three.** They differentiate only on the 60 fps
`groundtruth-f811-v4` dump, which §2.4 excludes as in-sample.

⇒ **The out-of-sample evidence supports WIDENING the band (7 → 10 at 30 fps); it does not
discriminate between 19, 20 and 21.** That is not a defect in the result — 20 is promotable on the
lockstep-safety grounds §2.2 pre-committed, independently of sensitivity — but no claim of
"independent out-of-sample sensitivity evidence" may be made for 19 or 21. ⚑ Note also the scored
21 row does **not** represent what the JS reader would compute at 30 fps (`Math.round(10.5) = 11`),
which is precisely why §2.2 pre-committed 21 as non-promotable.

##### §14D — §2.4 CORRIDOR (out-of-sample, 4 dumps: `h4-isabel`, `h4-guilty`, `g2-noir` + `h4-marciana` reported separately) — MANDATORY

`corridor_admits_per_event` = distinct in-radius white tracks with lifetime in
`(max_pellet_frames, band_hi]` that the radius gate counts at least once during any shipped event,
÷ that dump's event count. Threshold ≤2.00/event; downgrade at ≥2 of 4 dumps failing.

| candidate | `h4-marciana` (same unit, diff recording) | `h4-isabel` | `h4-guilty` | `g2-noir` | failing of 4 | verdict      |
| --------- | ----------------------------------------- | ----------- | ----------- | --------- | ------------ | ------------ |
| control   | 0.00 (band_hi=7)                          | 0.00        | 0.00        | 0.00      | 0            | **CONFIRMS** |
| 19        | 0.77 (band_hi=10)                         | 0.64        | 0.72        | 0.84      | 0            | **CONFIRMS** |
| 20        | 0.77 (band_hi=10)                         | 0.64        | 0.72        | 0.84      | 0            | **CONFIRMS** |
| 21        | 0.77 (band_hi=10)                         | 0.64        | 0.72        | 0.84      | 0            | **CONFIRMS** |

19, 20 and 21 are numerically identical on every out-of-sample dump: all three fps-scale to
`band_hi=10` at 30 fps by this instrument's own Python `round()` (§2.2's own table: `round(9.5)=10`,
`round(10.0)=10`, `round(10.5)=10`, all banker's-round to the even 10) — they differ only on the 60
fps `groundtruth-f811-v4` dump, which §2.4 excludes as in-sample. All rates sit well under the 2.00
threshold (max observed 0.84), roughly 2.4–3.1× the in-sample rate of 1.00 but still under the
pre-committed 2.00 ceiling — **0 of 4 out-of-sample dumps fail on any candidate.**

In-radius lifetime histograms (narrative, per dump, candidate-independent — pinned in full in
`cap-score-slice.json`'s `corridor_2_4.lifetime_histograms_by_dump`): every dump's histogram is
heavily front-loaded at life 1–7 (thousands of short-lived non-pellet tracks on the 30 fps dumps)
with a long, populated tail continuing well past `band_hi=21` on every dump (into the 30s–60s, one
outlier at 135 on `h4-isabel-structural`) — there is no gap immediately above the corridor on any
dump; the tail is continuous. This is reported as narrative per the pre-commit's own instruction and
is not itself a criterion.

##### §14E — §2.5 REPORTED ONLY (⛔ never a ranking criterion)

| candidate | `avgTotal` | fallback abstentions |
| --------- | ---------- | -------------------- |
| control   | 6.1561     | 112                  |
| 19        | 6.6631     | 96                   |
| 20        | 6.6631     | 96                   |
| 21        | 6.6643     | 96                   |

No candidate is preferred here on the basis of `avgTotal` moving toward 8.40 or the ~1.08 cold bias;
per the pre-commit's §2.5 that would be disqualifying.

##### §14F — §6 sub-deliverable: the 112 CONTROL fallback events — REPORT ONLY, does not influence §14B–§14D

n=112 (13.1% of 852), the same population §12/§13 already established. Per-event frame-span and
shipped `white` total (full 112-row detail pinned in `cap-score-slice.json`'s
`sub_deliverable_6.events`; distributions summarized here): `frames` (event length) ranges 2–25,
median 6; shipped `white` ranges 0–19, median 4.5. By dump: `h4-isabel-structural` 29,
`h4-marciana-structural` 26, `h4-guilty-structural` 25, `g2-noir-structural` 25,
`groundtruth-f811-v4` 7.

Categorical breakdown of WHY no band track exists, from every in-radius white track overlapping the
event's span:

| category                 | n   | frames (min/med/max) | white (min/med/max) | meaning                                                                                                                                                                        |
| ------------------------ | --- | -------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `in_band_no_concurrency` | 81  | 2 / 7 / 25           | 0 / 5 / 19          | at least one overlapping track has lifetime in `[band_lo, max_pellet_frames]`, but no frame in the span ever reaches `MERGE_EVENT_MIN` concurrently among band-eligible tracks |
| `all_below_band_lo`      | 18  | 2 / 3 / 16           | 1 / 4 / 15          | every overlapping track's lifetime is below `band_lo`                                                                                                                          |
| `mixed_outside_band`     | 9   | 2 / 3 / 18           | 4 / 7 / 8           | overlapping tracks exist both below `band_lo` and above `max_pellet_frames`, none inside                                                                                       |
| `none_in_radius`         | 3   | 5 / 9 / 16           | 0 / 0 / 0           | no white track ever enters radius during the event's span at all                                                                                                               |
| `all_above_cap`          | 1   | 4 / 4 / 4            | 0 / 0 / 0           | every overlapping track's lifetime exceeds `max_pellet_frames`                                                                                                                 |

⚑ This taxonomy refines the task's three-bucket framing ("below `band_lo` / above the cap / none in
radius") into five mutually-exclusive categories once the actual data was inspected — a real
`mixed_outside_band` case exists (tracks on both sides of the countable range, none inside it), and
the dominant category (`in_band_no_concurrency`, 72% of the 112) is a fourth reason the task's three
buckets did not name: a band-eligible track is present but never co-occurs with enough others in the
same frame. Reported as found; not folded silently into one of the three original buckets.

How many of the 112 become banded (plateau_rep no longer `None`) at each wider candidate, using the
SAME events (not re-selected):

| candidate | becomes banded (of 112) |
| --------- | ----------------------- |
| control   | 0 (by definition)       |
| 19        | 16                      |
| 20        | 16                      |
| 21        | 16                      |

⚑ **A FACTUAL CORRECTION FALLS OUT OF THIS TABLE, and it is recorded because it is a measurement,
not an interpretation.** Two prior documents characterize this population as events with **no
band-eligible track in radius at all**:

- `docs/handoffs/closed/2026-08-04-representative-frame-PRECOMMIT.md:150` — "112 of the 852 pooled events
  (13.1%) have **no track at all** whose lifetime falls in the band and is ever in radius during the
  event";
- `docs/handoffs/2026-08-04-pellet-reader-JUDGE-handoff.md:221` (open item 3) — "**No lifetime-band
  track in radius** at all".

**That description is true of only 3 of the 112** (`none_in_radius`). For **81 of 112 (72%)** a
band-eligible track IS present and IS in radius; the event abstains because the band series never
reaches `MERGE_EVENT_MIN` (3) **concurrently** — `_ps_longest_modal_run` filters
`totals.get(j, 0) >= MERGE_EVENT_MIN` before looking for a plateau, so a lone in-band track can
never form one. The abstention is a **concurrency** threshold, not an absence of band tracks.

⛔ Per the pre-commit's §6 this correction is recorded and goes no further: **what** the 81 are is
not theorized here, no fix is proposed, and nothing in §14F influenced any verdict in §14B–§14D.
Open item 3 keeps its own evidence bar and its own pass.

**No theorizing about what the 112 or the 16 mean, and this sub-deliverable did not influence any
verdict in §14B–§14D**, per the pre-commit's §6.

##### §14G — Controls

- **Control reproduction**: exact match to §12/§13's landed figures, asserted via `SystemExit`
  (§14A #1) — not merely reported.
- **Monotonicity**: asserted per dump, both on the scaled `band_hi` ordering and on the actual
  admitted white-track count (§14A #2).
- **Stored cap values**: asserted equal to 13/7 (60/30 fps) on every dump, never recomputed
  (§14A #3).
- **`_ps_band` additivity**: `--policy-score-selftest` and `--hybrid-landing-audit-selftest` both
  still pass byte-identical after adding the third parameter (confirmed via the full
  `pellet-selftest.sh` run, §14H).
- **Fidelity premises + `shot_red` event-fixed**: asserted via `SystemExit` at the top of every
  `--cap-score` / `--cap-score-selftest` run (§14A #6–7).
- **19 vs 20 vs 21 non-identity check**: 21 is confirmed to differ from 19/20 (§14C: `avgTotal`
  6.6643 vs 6.6631, traced to one life-21 track on `groundtruth-f811-v4` — see §14C) — the identical
  rows are a genuine consequence of the fps-scaling formula tying at `band_hi=10` on every 30 fps
  dump for all three candidates, not a bug silently ignoring the candidate parameter.
- **Gates, TRUE exit status, not through `| tail`**:
  - `bash scripts/probe/pellet-selftest.sh; echo $?` → **0** ("pellet-selftest: all passed", 21
    arms, including the new `--cap-score-selftest`).
  - `bash scripts/verify.sh; echo $?` → **0** (typecheck, override validation, all regressions,
    `npx vitest run` — 151 files / 2179 tests passed, 24 skipped).
  - `git status` / `git diff --stat` after this landing: **zero pre-existing fixtures moved** — the
    only new path is `scripts/tests/fixtures/pellets/cap-score-slice.json`.

##### §14H — n and scope

§2.1: 42 labelled owner pellets, ONE clip (`marciana`, SG/Iron). §2.3: 852 events across all 5
dumps. §2.4: 852 minus the 37 in-sample events = out-of-sample dumps only (`h4-marciana-structural`
218, `h4-isabel-structural` 203, `h4-guilty-structural` 180, `g2-noir-structural` 214 — 815 events, 4
units: `marciana` SG/Iron, `isabel`, `guilty`, `noir`). §6: the 112 CONTROL fallback events, same
852-event/5-dump/4-unit pool as §2.3.

**THIS ENTRY DOES NOT ENACT.** `debounce_shots` is untouched in both `count-pellets.py` and
`read-pellets.ts`; `count-pellets.py:514`/`:517` and `read-pellets.ts:787` are untouched; no
constant/default/threshold changed; no `DECISIONS.md` entry. **A PASS here is a PROPOSAL, not a
landing** (pre-commit §4) — the landing pass is separate and owner-gated, and is scored on the
criteria the pre-commit's §5 states, not on this entry.

##### §14I — Instrument and reproduction

```sh
# the new instrument (§2.1/§2.3/§2.4/§2.5/§6, all validity checks as SystemExit asserts):
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --cap-score \
  --save-cap-score-fixture scripts/tests/fixtures/pellets/cap-score-slice.json
# replay the committed slice -- no images, no subprocess, no tracks.json:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --cap-score-selftest
# the whole reader toolchain, including this arm's new selftest, TRUE exit status:
bash scripts/probe/pellet-selftest.sh; echo $?
bash scripts/verify.sh; echo $?
```

##### §14J — Cross-family reviews (both gates, `kimi-code/k3`)

Driver was Claude, so `/logic-gate`'s routing sends both gates to Kimi — genuinely cross-family, not
a same-family fallback. ⚠ The raw packets and verdict JSONs were written to
`scratchpad/gates/2026-08-04-lifetime-cap/` (gitignored) and were **LOST when the worktree was
deleted on 2026-08-04**. Their substance is quoted verbatim in the tables below and in the
pre-commit's §8; the raw artifacts are not recoverable.

**PRE-OP (on the plan, before any code): `APPROVED-WITH-REVISIONS`, 7 mandatory revisions**, all
executed before any number existed; logged item-by-item in the pre-commit's §8. Three changed the
science rather than the code: a **factually wrong rounding claim** in §2.2 that had disqualified
`band_hi = 19` (corrected in place, visibly); the **demotion of §2.1** from PRIMARY to a
no-evidential-weight consistency check (it is tautological — the corridor is derived from the same
pinned population the check re-reads); and the finding that **the naive landing edit is a silent
no-op**, which rewrote §5's landing sketch (see §14 header and pre-commit §5).

**POST-OP (blind, on the implementation diff): `ACCEPT`**, no blocking findings, all 7 revisions
confirmed executed at the code level. It independently re-derived the corridor arithmetic
(167 admits / 218 events ≈ 0.7661) and confirmed the control-reproduction assert fails loudly rather
than silently passing. ⚑ It also flagged the packet as **CONTAMINATED** — the orchestrator included
its own revision-disposition table — and compensated by treating every disposition claim as
unverified until confirmed in the code. Recorded rather than hidden: that was an orchestrator error,
and the blindness contract caught it.

Five NOTE-level findings; three acted on, two not:

| finding                                                                      | disposition                                                                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `startswith` prefix match could silently drop a future dump from §2.4        | **FIXED** — `_cs_assert_out_of_sample_coverage` asserts set equality both ways                                                               |
| the §3.9 fidelity "asserts" are source-text tripwires, weaker than they read | **FIXED** — a behavioural pin now runs `_rep_slim_dump` on synthetic red / out-of-radius / in-radius tracks, alongside the retained tripwire |
| the record should not call 19/21 out-of-sample sensitivity evidence          | **FIXED** — §14C now states the arms are vacuous out-of-sample                                                                               |
| §6 is scope the approved plan text did not enumerate                         | no action — it is in the pre-commit's §6 and is strictly report-only                                                                         |
| module-level `inspect` import couples the selftest to source availability    | no action — irrelevant to this repo's usage                                                                                                  |

Both fixes were shown to FIRE when their condition is violated (prefix removed / bogus prefix added /
synthetic red track flipped white / in-radius track moved out), then reverted with the Edit tool —
a check that cannot be shown to fail is not a check. `pellet-selftest.sh` 21 arms and `verify.sh`
both re-run at TRUE exit 0 afterwards, and `cap-score-slice.json` never moved.

---

#### §15 THE `h4-marciana` FRAME 1565 marker=3 GEOMETRY — one crosshair-attached track, two single-frame components on an unrelated line, not three real markers

**2026-08-04.** Answers the prerequisite `docs/handoffs/2026-08-04-pellet-reader-JUDGE-handoff.md`
item 7 names before §11's backend-selector defect (`read-pellets.ts:877-885`, array-order tie-break on a
channel the comparison never inspects) can be fixed: **is opencv's `marker = 3` reading at
`h4-marciana-structural` frame 1565 a true core hit, or an opencv false positive?**
(`marciana` = SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — NOT `marciana-marine-study`.)

##### §15A — The three components, and which one is crosshair-attached

Of the three RED tracks `analyze-pellet-tracks.py`'s general pellet tracker finds within
`pellet_radius` (160px) of frame 1565's crosshair — the same population §11's channel census reads,
an INDEPENDENT signal from the `marker` detector channel itself — only one carries any evidence of
being a real, persistent UI element glued to the crosshair:

| track id | life | frame(s) present | dx                 | dy                    | reading                                                                                                            |
| -------- | ---- | ---------------- | ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `11110`  | 3    | 1564, 1565, 1566 | +9.1 / +8.9 / +9.4 | −57.5 / −57.0 / −58.8 | **CROSSHAIR-ATTACHED** — near-constant offset (dx range 0.5px, dy range 1.8px) across all three frames of its life |
| `11115`  | 1    | 1565 only        | −46.5              | −7.7                  | single-frame — no persistence evidence                                                                             |
| `11117`  | 1    | 1565 only        | +63.3              | −6.0                  | single-frame — no persistence evidence                                                                             |

`11115` and `11117` sit on a **near-horizontal line through the crosshair** (dy −7.7 and −6.0, dx on
opposite sides) — consistent with a red UI chevron/banner element visible in the frame image, not two
independent hit-marker glyphs. **The crosshair-attached marker count at frame 1565 is 1, not 3.**

##### §15B — What this does and does not establish

⚑ This is **an independent geometric signal that opencv's marker=3 reading over-counts** — it does
not directly inspect the `marker` detector's own pixels, only the general red-track population's
persistence pattern. It is consistent with §11F's open question ("is opencv's marker=3 a true core
hit or a false positive") resolving toward **false positive** at this specific frame, but the ⚔
hit-marker triangles in the actual footage (§11F's suggested visual check) have not been inspected
here — that remains a separate pass if a definitive visual read is wanted.

##### §15C — n and scope

**n = 1 frame (1565), 1 dump (`h4-marciana-structural`), 1 unit (`marciana`, SG/Iron).** This is a
single-frame, single-dump observation, not a swept measurement across the 82 marker-divergent frames
§11I catalogued — it characterizes the ONE frame that actually flips an event's valid/core status
(§11C), not the general marker-divergence population.

⚑ **EVIDENCE-PROPORTIONALITY — this entry RECORDS an observation and ENACTS NOTHING.** Per
CLAUDE.md's evidence-proportionality rule, an n=1 single-frame read is HYPOTHESIS-strength: it never
in the same motion changes a constant/default or stamps a verdict. Specifically:

- `read-pellets.ts:877-885`'s backend-selector defect stays **owner-gated and unfixed** — nothing here
  fixes it, and fixing it is out of scope for this entry regardless of §15A's reading.
- No verdict (VALIDATED/REFUTED/SUPERSEDED) is stamped on that defect or on §11F's open question.
  §15A's "false-positive" reading is reported as a hypothesis-strength geometric signal, not a
  closure.
- `MARKER_MIN`, `debounce_shots` (both implementations) and every constant/threshold are untouched.

##### §15D — Instrument and reproduction

New flag on the existing instrument (constraint 9: extend, don't fork): `analyze-pellet-tracks.py
--marker-geometry`, self-validated against the committed slice fixture
`scripts/tests/fixtures/pellets/marker-geometry-slice.json` (10 pinned checks, including the exact
frame-1565 ids/life/dx/dy above) and registered in `scripts/probe/pellet-selftest.sh`. For each
queried frame it lists every RED track within the dump's own `params.pellet_radius` of that frame's
crosshair — id, lifetime, absolute position, distance, crosshair-relative dx/dy — plus each track's
dx/dy across a `+/-` window of neighbouring frames, so a near-constant offset (crosshair-attached) is
distinguishable from a single-frame detection.

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --marker-geometry \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-marciana-structural/tracks.json \
  --marker-geometry-frames 1565
# replay the committed slice -- no scratchpad access, no re-derivation:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --marker-geometry-selftest
```

**NOTHING HERE ENACTS.** `read-pellets.ts`, `count-pellets.py`'s `debounce_shots` and `MARKER_MIN` are
UNCHANGED. No constant, gate or default moved; no existing fixture was touched; no `DECISIONS.md`
entry was written. The backend-selector defect (§11) stays owner-gated.

#### §16 THE `band_hi = 20` LANDING — the decoupled band ceiling is IN PRODUCTION; every pre-stated criterion met and ZERO fixtures moved

Owner-approved 2026-08-04 against the proposal in §14. Plan, with its blast radius **declared before
any production file was touched**: `docs/handoffs/closed/2026-08-04-band-hi-LANDING-PLAN.md` (committed at
`a470a7be`, ahead of the first edit, specifically so the prediction was falsifiable).

##### §16A — What changed

Four edits, in `count-pellets.py` and `read-pellets.ts` only:

1. `--band-hi`, resolved per-call, defaulting to `args.max_pellet_frames`;
2. `band_ids` built from **`tracks` directly**, no longer as a subset of `pellet_ids`;
3. the `band` count **hoisted out of the `pellet_ids` skip** in `_frame_pellet_counts`, keeping the
   radius and non-red conditions;
4. `read-pellets.ts:787` passes `--band-hi Math.max(4, Math.round((20/60) × fps))` — **20** at
   60 fps, **10** at 30 fps, exact at both.

⚑ Edits 2 and 3 are the RESTRUCTURE. Without them edit 4 is a **silent no-op** (a life-15 track is
not in `pellet_ids`, so it could never reach the band). ⚑ **Plan-vs-code divergence, recorded so the
two do not drift:** the plan specified the argparse default literally as `args.max_pellet_frames`;
the code uses a `None` sentinel resolved per-call instead, so a `--sweep` combo that overrides
`max_pellet_frames` without `band_hi` still gets the correctly-rescaled default. Behaviour at the
default is identical.

##### §16B — The five pre-stated success criteria (plan §3), all MET

| #   | Criterion                                       | Result                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Categorical recovery in the **production** path | **MET.** All 5 pinned owner tracks (`6854`/17, `6860`/15, `7071`/16, `8085`/15, `8168`/19) are `in_band_ids` **False at the default, True at 20**; **neither static (life 22, 36) is admitted** under either crosshair or either bound                                                    |
| 2   | `totalShots` + every event onset UNCHANGED      | **MET, and guaranteed BY CONSTRUCTION** — the diff never alters how `white`/`red`/`marker` are computed, so `totals = white + red` and therefore segmentation cannot move. Corroborated on `h4-marciana-structural`: white/red/marker identical, **totalShots 218/218, onsets identical** |
| 3   | Pooled MISSED unchanged                         | **MET** — `--missing-shots-selftest` PASS, `MISSED: 1 / MISSED_admissible: 1`, unchanged                                                                                                                                                                                                  |
| 4   | Default-path byte-identity (the §2(a) proof)    | **MET, empirically.** `count-pellets.py` at `a470a7be` vs post-landing, same input, no `--band-hi`: stdout sha256 `118eac67…` **identical**, stderr identical                                                                                                                             |
| 5   | Both gates                                      | **MET** — `pellet-selftest.sh` 22 arms TRUE exit 0; `verify.sh` TRUE exit 0                                                                                                                                                                                                               |

##### §16C — The blast-radius prediction HELD: zero fixtures, zero pins

The plan predicted **ZERO** fixture and pin movement and made any mover a HARD STOP. Outcome:
`git diff --name-only` over `scripts/tests/` and `scripts/regression-snapshot*.json` is **empty**;
`CACHE_SELFTEST_EXPECT` is unmoved at `{9, 6, 6.7, 0.0}`. ⇒ **This landing changes the reader going
forward, not the committed record** — existing dumps keep the `band` values they were extracted
with, by design (plan §2).

The new state is genuinely reachable, not merely permitted: on `h4-marciana-structural`, `band`
differs on **979 frames** and **`band > white` on 442 frames**.

##### §16D — A defect the post-op review's tail led to, found and fixed

`band_hi` changes a `--load-detections` replay's answer but was **not** in `CACHEABLE_PARAMS` —
precisely the failure that list exists to prevent (its own header records the Phase H finding: an
unpersisted knob makes a replay "fall back to argparse defaults… and [return] a plausible-looking
WRONG answer with no warning"). Fixed in `f67be274`: `band_hi` registered, with
`CACHEABLE_PARAMS_OPTIONAL` so a pre-`band_hi` cache with no such key still resolves to its own
`max_pellet_frames` and replays byte-identically (verified against `h1-cache-slice.json`, which is
exactly that old-cache case). ⚑ The cross-family review classified this as **cosmetic
discoverability**; it was not.

##### §16E — Known limitations, recorded not fixed

- ⚑ **`--dump-tracks` output never carries the `band` series** — it copies only `white`/`red`/`marker`
  into the dump's `frame_counts`. Since `debounce_shots` falls back to pre-hybrid behaviour when no
  frame carries a `band` key, **a `--dump-tracks` dump replays as pre-hybrid and cannot exercise
  this landing.** Pre-existing (it predates `band_hi`), and it does NOT affect the production reader:
  `read-pellets.ts` parses `--temporal`'s stdout (`count-pellets.py:1935`), which does carry `band`.
  ⇒ **A future re-extraction for audit purposes will produce band-less dumps.** Not fixed here —
  changing the dump format is outside this landing's declared blast radius.
- **Shot 4's crosshair caveat, corrected:** **two** of the five pinned owner tracks belong to shot 4
  (`8168`/life 19 and `8085`/life 15), not one. Under the shipped **structural** crosshair `8168` is
  admitted on 0/19 frames and `8085` on 1/15; under the **template** crosshair its label file
  actually records (`locate: "template"`) they are 19/19 and 15/15. This is the documented
  pre-existing shot-4 mislock (trap 9, §9B: 7 radius-rejected / 0 countable for that shot under
  structural) — **not a regression from this landing.**

##### §16F — Cross-family post-op review

`kimi-code/k3`, blind, on the diff (raw packet gitignored and **LOST** with the worktree,
2026-08-04; verdict quoted here): **`ACCEPT`**, no
blocking findings, contamination check **clean** this time (the §14J packet error was not repeated).
It confirmed onset invariance is guaranteed **by construction** rather than by the single-dump probe,
and that the `None`-sentinel default is a defensible deviation. Its three NOTEs: record the
plan-vs-code default divergence (§16A), attach the criterion-1/4 evidence (§16B — both since run),
and the `--load-detections` help-text gap (which turned out to be §16D's real defect).

##### §16G — n, scope, and what this does NOT establish

Criterion 1: 42 labelled owner pellets, ONE clip, ONE unit (`marciana` SG/Iron). Criteria 2–4:
5 dumps / 4 units / 852 events. ⛔ **THIS DOES NOT CLOSE THE COLD BIAS AND NO BIAS-CLOSED VERDICT IS
STAMPED** (pre-commit §2.5, plan §3). The landing was judged on categorical pellet recovery and
invariant preservation only. The ~1.08 per-shot deficit is measured against an f8–11 **window**
reference (§9A) whose correctness is itself unsettled — that question gates any bias claim, and it
is untouched here.

#### §17 THE `run21` / `run21b` FAR-BAND RE-LOCALIZATION — structural fixes the lock RATE and NOT the lock QUALITY; these windows stay unusable

Settles the "60 fps localization instability" open item, which instructed: "never re-extracted under
`--locate structural` — re-extract before designing any fix." Re-localized. **The answer is not the
one the item anticipated.**

##### §17A — The framing in the open item was wrong

"60 fps localization instability" is not supported as a general claim. Of the six 60 fps dumps,
**four lock 100% of frames already** — `i3-noir-far-60fps`, `i3-noir-near-60fps`,
`i2-marciana-60fps`, `run20-60fps-premise`. ⚑ **`i3-noir-far-60fps` is the same far-band condition**
that `run21` fails in, and `run20-60fps-premise` is the same 901-frame length under the same params
on different footage. Neither 60 fps nor the far band is the discriminator.

##### §17B — Re-localization: the lock RATE is fixed

Frames were already on disk, so this is a re-**localization**, not a re-extraction from video (no
ffmpeg, no owner time). 1622 frames, **87 s wall-clock total**.

| dump     | template (old) | structural (new)      | unlocked frames               |
| -------- | -------------- | --------------------- | ----------------------------- |
| `run21`  | 0 / 901 (0.0%) | **901 / 901 (100%)**  | none                          |
| `run21b` | 0 / 721 (0.0%) | **717 / 721 (99.4%)** | 4, all at index 0–3 (warm-up) |

##### §17C — ⚑ AND THE LOCK QUALITY IS THE WHOLE STORY: ~81% of those locks are HELD

In structural mode a **held (stale) lock is recorded as `cross_confs = None`** while
`cross_positions` still carries the last accepted value — so a held lock is indistinguishable from a
fresh one if you only count positions.

| dump                              | positions | **held (`conf is None`)** |
| --------------------------------- | --------- | ------------------------- |
| `run21-60fps-farband-structural`  | 100%      | **82.4%**                 |
| `run21b-60fps-farband-structural` | 99.4%     | **80.4%**                 |
| `i3-noir-far-60fps` (far band)    | 100%      | 8.1%                      |
| `h4-marciana-structural`          | 96.1%     | 21.4%                     |

⇒ **The structural localizer finds the ammo digit row on only ~18–20% of frames in these windows;
the rest is carried forward.** That is 4–10× the held rate of every comparable dump.

`--stale-counting` over both, at counting frames (`t0+8…t0+11` of every debounced shot):

- all-frames stale **81.26%**, counting-frame **73.33%** (enrichment 0.90×, n = 120 counting frames);
- **29 of 30 shots carry ≥ 1 stale counting frame**;
- pooled run-displacement (upper bound) median **202.6 px**, p90 **401.9 px**, max **478.0 px** —
  against `pellet_radius` **160 px**, so the counting window is routinely pointed **completely off**
  the pellet cloud. The interpolated per-frame estimate is median 71.5 px, p90 270.4 px, with 21 of
  88 runs still over 160 px;
- A/B (exclude − include) over 18 affected shots: median −0.167, mean +0.245, sd 1.983,
  **+0.1472 pellets/shot** diluted over all scored shots.

##### §17D — VERDICT

**Structural is not a fix for these two windows.** It converts a **loud** failure (0% positions,
obviously unusable) into a **silent** one (100% positions, ~81% of them fabricated by hold). ⚑ For
any consumer that checks lock _rate_ rather than lock _provenance_, the re-localized dumps are more
dangerous than the originals, not less.

⇒ **`run21` / `run21b` remain UNUSABLE for pellet counting**, now for a measured reason rather than
an unexamined one. The open item is ANSWERED — and answered in the negative.

##### §17E — n, scope, and what this does NOT establish

Two 15-second far-band windows, 1622 frames, 30 debounced shots, ONE unit. ⚑ **The unit and source
video for `run21`/`run21b` were never identified** in this pass — relevant because the default
`--struct-offset-x` is calibrated against the template-derived crosshair on `marciana` (SG/Iron).
HUD geometry should be unit-independent, but that is an assumption, not a measurement.

⛔ **This does NOT answer the production mislock rate.** These are the worst-case probe, not the
production corpus — `h4-marciana-structural`'s **21.4% held** is the number that bears on production,
and "held" is not the same as "wrong" (a held lock is correct whenever the crosshair did not move).
Quantifying that remains open and needs the displacement test, not the hold rate.

⚑ **Why these windows fail is UNEXPLAINED.** One hypothesis was inspected and NOT confirmed: the
`run21` HUD cluster appears smaller than `run20`'s, which would defeat a fixed-scale template match
(observed template confidences 0.357–0.467 against a 0.6 gate) — but a red-pixel bounding-box
measurement picked up damage numbers and health bars too and could not separate the HUD. Recorded as
an unverified impression, not a finding.

##### §17F — Instrument and reproduction

```sh
# re-localize (frames already on disk; ~87s for both):
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py \
  <scratchpad>/pellets/run21-60fps-farband/frames-pellet \
  --locate structural --temporal --fps 60 --max-pellet-frames 13 \
  --min-area 25 --max-area 750 --min-circ 0.55 --center-exclude 36.0 --pellet-radius 160 \
  --dump-tracks <scratchpad>/pellets/run21-60fps-farband-structural/tracks.json
# lock-quality check:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --stale-counting \
  <scratchpad>/pellets/run21{,b}-60fps-farband-structural/tracks.json --stale-counting-fps 60
```

⚠ Both instruments are committed; the dumps and frames are in the **gitignored** scratchpad, so these
numbers are reproducible only while that scratchpad survives. No fixture was pinned for them
deliberately — this is a NEGATIVE result about two unusable windows, and pinning it would have moved
the existing `stale-counting-slice.json`.

**RECORDS a measurement only.** No constant, guard, threshold, default or `DECISIONS.md` entry was
changed, and nothing was enacted.

#### §18 THE 8.40 REFERENCE IS CONFIRMED — nothing lands and fades before the owner's window; the cold bias is NOT a mis-specified target

Closes §9A's **"COULD NOT DETERMINE: whether any marker appears and fully fades before t0+8"**, which
was the last thing gating any verdict on the cold bias. **Tier: OWNER-CONFIRMED** — the owner is the
labeller of record for this ground truth, and adjudicated the residual candidates directly.

##### §18A — The screen: only 11 objects were ever candidates, and arithmetic killed 5

Instrument `analyze-pellet-tracks.py --fade-screen` (fixture
`scripts/tests/fixtures/pellets/fade-screen-slice.json`, selftest wired into `pellet-selftest.sh`),
reading the committed `representative-audit-slice.json` labelled block — no video, no new labelling
pass, no re-extraction.

Every in-radius non-red track that dies before its shot's own `t0+8`, pooled over the 5 labelled
shots of `marciana` (SG/Iron — **not** `marciana-marine-study`, AR/Iron):

| lifetime | n      | reading                                        |
| -------- | ------ | ---------------------------------------------- |
| 1        | 69     | flash phase (§9C: flash blobs live 1–3 frames) |
| 2        | 50     | flash phase                                    |
| 3        | 9      | flash phase                                    |
| **4**    | **10** | **ambiguous**                                  |
| **5**    | **1**  | **ambiguous**                                  |
| 22       | 1      | the known static (§9G)                         |

⚑ **A hard gap separates this population from the owner-pellet band.** Owner pellets measure life
**8–19** (minimum 8); nothing dying before `t0+8` exceeds life 5.

`hitsPerShot` is **10** and **shot 2's owner label is already 10 — at ceiling**, so no additional
pellet is physically possible there and its 5 ambiguous objects were excluded by arithmetic alone:

| shot | t0   | owner | headroom | ambiguous | adjudicable |
| ---- | ---- | ----- | -------- | --------- | ----------- |
| 1    | 1060 | 7     | 3        | 0         | 0           |
| 2    | 1096 | 10    | **0**    | 5         | **0**       |
| 3    | 1140 | 8     | 2        | 1         | 1           |
| 4    | 1289 | 9     | 1        | 3         | 1           |
| 5    | 1369 | 8     | 2        | 2         | 2           |

⇒ upper bound on the reference shift **before** adjudication: 4 pellets / 5 shots = **0.8/shot**.

##### §18B — All six adjudicated: NONE is a pellet

| track  | shot | span        | verdict          | basis                                                                                                                                  |
| ------ | ---- | ----------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `8589` | 5    | t0−4 … t0−1 | **not a pellet** | Ammo-bar segment, **and its whole span precedes the shot onset** — a pellet cannot land before the shot fires (arithmetic, not visual) |
| `8095` | 4    | t0+1 … t0+4 | **not a pellet** | Ammo-bar segment; `dy` constant at −40/−41, the bar row                                                                                |
| `8112` | 4    | t0+2 … t0+5 | **not a pellet** | Inside a stack of floating damage-number glyphs; `dy` drift −133 → −206 is those numbers rising                                        |
| `8135` | 4    | t0+3 … t0+6 | **not a pellet** | Ammo-bar segment; dies at t0+6 exactly as the bar shifts                                                                               |
| `7118` | 3    | t0+0 … t0+3 | **not a pellet** | **OWNER-ADJUDICATED** from the filmstrip crop                                                                                          |
| `8659` | 5    | t0+4 … t0+7 | **not a pellet** | **OWNER-ADJUDICATED** from the filmstrip crop                                                                                          |

⚑ **The mechanism is HUD furniture, not short-lived pellets.** The ammo-bar segment ticks sit at a
fixed `dy ≈ −40` from the crosshair — just outside the 36 px `center_exclude` — so the tracker picks
them up and hops between adjacent segments, which is also why they cluster at life 4–5. Rising
damage numbers account for the rest.

##### §18C — VERDICT and what it unblocks

**No marker appears and fully fades before `t0+8`. The owner's f8–11 window count IS the landed
total, and 8.40 stands as the reference.**

⇒ **The ~1.08 per-shot cold bias is NOT explained by a mis-specified target — it is real reader
behaviour**, and the remaining channels (the radius gate, the missing-shot channel, track
fragmentation) carry all of it.

⇒ ⚑ **This removes the block on bias verdicts.** §9A's open question was the reason no bias-CLOSED
verdict was possible whatever else landed; that constraint is lifted. A re-extraction under the
landed `band_hi = 20` (§16) now yields a **clean before/after on the actual bias**, measured against
a confirmed reference.

##### §18D — n, scope, and honesty about who decided what

5 labelled shots, ONE clip, ONE unit (`marciana`, SG/Iron), 140 screened tracks, 11 candidates,
6 adjudicated. **Four of the six were eliminated by the driver** (one on pre-onset timing, which is
arithmetic; three on HUD identification from crops, corroborated by the constant-`dy` geometry) —
that is a single-observer read. **Two were adjudicated by the owner**, the labeller of record.
⚑ The ceiling argument leans on `hitsPerShot = 10` being the hard per-shot maximum and on the owner's
f8–11 labels having captured every pellet visible in that window.

##### §18E — Instrument and reproduction

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --fade-screen
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --fade-screen-selftest
# regenerate the adjudication filmstrips:
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --fade-screen-crops <scratchpad>/pellets/groundtruth-f811-v4/frames
```

**RECORDS a measurement + an owner adjudication.** No constant, guard, threshold or default changed;
the 8.40 reference is CONFIRMED, not altered.

#### §19 THE LANDED `band_hi = 20` ON THE PRODUCTION PATH — +0.60 pellets/shot, and it reconciles EXACTLY with §9B

The first measurement of the §16 landing through the **production** code path
(`_frame_pellet_counts` → `debounce_shots`, not the audit arm's reconstruction), scored against the
reference §18 just confirmed. No video re-extraction: the labelled clip's own dump supplies the
localization, so **only `band_hi` varies** and the A/B isolates it.

##### §19A — Per-shot, against the owner labels

`groundtruth-f811-v4` (`marciana` SG/Iron — **not** `marciana-marine-study`, AR/Iron), 60 fps,
1801 frames, the 5 owner-labelled shots:

| shot     | owner    | BEFORE | AFTER  | before err | after err |
| -------- | -------- | ------ | ------ | ---------- | --------- |
| 1        | 7        | 5      | 5      | −2         | −2        |
| 2        | 10       | 8      | **10** | −2         | **0**     |
| 3        | 8        | 7      | **8**  | −1         | **0**     |
| 4        | 9        | 4      | 4      | −5         | −5        |
| 5        | 8        | 8      | 8      | 0          | 0         |
| **mean** | **8.40** |        |        | **−2.00**  | **−1.40** |

**`totalShots` 37 → 37 — segmentation did not move**, confirming in production what §16B established
by construction.

##### §19B — ⚑ IT IS NOT CANCELLATION, and the arithmetic proves it

§9B's headline was that the pre-landing agreement was **cancellation** — a large under-count against
a large over-count (only 12 of 35 reported pellets were owner pellets). Any new "improvement" has to
clear that bar before it can be believed.

§9B's decomposition, **recorded before the cap hypothesis existed**, predicts exactly which pellets a
band widening can recover: the lifetime-gate rejections, but only where the radius gate does not also
reject them.

| shot | lifetime-rejected | radius-rejected | recoverable                  |
| ---- | ----------------- | --------------- | ---------------------------- |
| 1    | 0                 | 1               | 0                            |
| 2    | **2**             | 0               | **2**                        |
| 3    | **1**             | 0               | **1**                        |
| 4    | 2                 | 7 (mislock)     | 0 — blocked                  |
| 5    | 0                 | 0               | 0                            |
|      |                   |                 | **3 / 5 shots = +0.60/shot** |

**Predicted +0.60/shot. Measured +0.60/shot.** The gain lands on shots 2 and 3 and nowhere else,
which is precisely where the prediction puts it. ⇒ **the recovered pellets are the OWNER pellets the
cap was discarding — not a coincidental total.**

##### §19C — What the residual is made of

The remaining **−1.40/shot** is two shots, and neither is a band problem:

- **shot 4: −5**, the documented structural-crosshair **mislock** (§9B: 7 radius-rejected, 0
  countable). Its 2 lifetime-rejected pellets are unrecoverable while the lock is wrong.
- **shot 1: −2**, against 6 countable owner pellets — 1 genuine radius rejection (the track whose
  closest approach is 161.4 px against a 160 px gate) plus 1 the representative frame does not see.

⇒ **The radius gate and the mislock now carry the entire residual on this clip**, exactly as §18C
predicted once the reference was confirmed. Nothing here is attributable to the lifetime band.

##### §19D — n, scope, and the IN-SAMPLE caveat that must ride with this

5 shots, ONE clip, ONE unit. ⚑ **This measurement is IN-SAMPLE**: the 3 recovered pellets are among
the 5 that generated the cap hypothesis in the first place, so "the fix recovers them" is close to
tautological on this footage and **is not evidence that the fix generalizes.** The out-of-sample
evidence remains §14's ceiling (3.1% vs a 6.2% reject line) and corridor (0.64–0.84/event vs 2.00)
checks, on 852 events across 4 units.

What this pass _does_ add, which §14 could not: it runs the **production** path rather than the audit
reconstruction, it scores per-SHOT against the confirmed 8.40 reference rather than per-EVENT pooled
(the two are different bases — do not mix them), and it **rules out cancellation** by exact
reconciliation with a decomposition recorded before the hypothesis existed.

⛔ **The cold bias is NOT closed.** It moved from −2.00 to −1.40 per shot on this clip; the remainder
is a localization defect and a radius gate, both open.

##### §19E — Reproduction

The A/B varies `band_hi` alone against the dump's own `cross_positions` and track list, driving
`count-pellets.py`'s real `_frame_pellet_counts` + `debounce_shots`; `t0` values are
`policy-score-slice.json`'s `_expected.rows`, owner labels are `groundtruth-f8-11.json`, and the
recoverability prediction is `representative-audit-slice.json`'s `_expected.decomposition`.

**RECORDS a measurement.** No constant, guard, threshold or default changed.

#### §20 THE PRODUCTION MISLOCK RATE — 16.9%, and mislocks are the DOMINANT remaining undercount channel

Executes `docs/handoffs/closed/2026-08-04-mislock-rate-PRECOMMIT.md`, whose §3 decision rule (160 px
threshold, three rate bands) was committed at `9bc829dd` **before any production number existed**.
Answers the item open since 08-01: **what fraction of production shots are mislocked?**

##### §20A — Detector and its validity gates (§4; all pass)

Structural-vs-template crosshair disagreement, median over each shot's counting frames
`t0+8…t0+11`, mislocked iff **> `pellet_radius` = 160 px**.

**§4.1 template-lock gate — no dump excluded:** counting-frame template lock rates
`h4-marciana-structural` 98.3%, `h4-isabel-structural` 100%, `h4-guilty-structural` 100%,
`g2-noir-structural` 99.5% — all clear the 90% bar. (`run21` locked 0% in template mode, §17, so
this gate was a live risk, not a formality.) Shot counts 218/203/180/214 reproduce the totals §9G
already records — an alignment check on the merged template arms.

##### §20B — The rate

| dump                     | shots scored | mislocked | rate      | disp median / p90 / max (px) |
| ------------------------ | ------------ | --------- | --------- | ---------------------------- |
| `h4-marciana-structural` | 215          | 33        | 15.4%     | 7.4 / 299.3 / 783.9          |
| `h4-isabel-structural`   | 203          | 41        | 20.2%     | 33.5 / 384.7 / 1238.2        |
| `h4-guilty-structural`   | 180          | 32        | 17.8%     | 17.4 / 311.2 / 803.0         |
| `g2-noir-structural`     | 213          | 31        | 14.6%     | 13.5 / 296.8 / 579.0         |
| **pooled**               | **811**      | **137**   | **16.9%** | **18.7 / 325.9 / 1238.2**    |

⇒ **§3 band: > 10% — "mislocks are the DOMINANT undercount channel and outrank every other open
item."** That verdict was pre-committed, not chosen after seeing 16.9%.

##### §20C — Three independent checks that this is real

1. ⚑ **The known case is caught and the known-good are not.** On the labelled clip the detector
   flags `t0 = 1289` — **shot 4, the documented structural mislock** — at 316 px, and flags **none**
   of the other four labelled shots (`t0` 1056 / 1096 / 1136 / 1369). Zero false positives on the
   only shots where truth is known.
2. ⚑ **The threshold sits in a genuine GAP, not a continuum.** The labelled clip's 37 per-shot
   disagreements sorted: 19 under 20 px, then 20–127 px, then **nothing between 127 and 242 px**,
   then 6 at 242–453 px. The 160 px line falls inside that empty band, so no plausible
   re-derivation of the threshold moves a single shot across it.
3. ⚑ **An independent footage set reproduces the rate.** The labelled clip alone gives **6 of 37 =
   16.2%**, against production's 16.9% on four different videos — and §9B's own labelled set gives
   **1 of 5 = 20%**. Three separate bases, same magnitude. **The shot-4 mislock was never
   unrepresentative; it is typical.**

##### §20D — What it costs, DERIVED not measured

A mislocked shot loses most of its owner pellets: on shot 4 the wrong lock radius-rejected **7 of 9**
(§9B), and the reader read 4 against an owner label of 9 — an error of **−5**. At a 16.9% rate that
is ≈ **0.85 pellets/shot** averaged over all shots.

⚑ **This is an ARITHMETIC ESTIMATE from one mislocked shot's severity, not a measurement of the
channel's cost** — n=1 for the severity term, and it carries the exact seductive shape the refuted
`center_exclude` hypothesis had (§3 of the 08-04 judge handoff). It is recorded to size the channel,
**not** to close anything. Measuring the cost needs its own pass.

For scale only: §19 measured the post-`band_hi` residual at **−1.40 pellets/shot** on the labelled
clip, of which shot 4's mislock contributes −1.00 directly.

##### §20E — n, scope, and THREE limits that must ride with the number

811 shots, 4 dumps, 4 units (`marciana` SG/Iron — **not** `marciana-marine-study`, AR/Iron —
`isabel`, `guilty`, `noir`), 30 fps; plus 37 shots on the 60 fps labelled clip.

1. **Disagreement says ONE mode is wrong, never WHICH.** 16.9% is an **upper bound on
   structural-specific** mislocks. It may not be described as "structural was wrong on 16.9% of
   shots".
2. ⚑ **It cannot see BOTH-wrong cases**, so it is simultaneously a **FLOOR on total localization
   error**. Shot 1 carries a documented 78 px mislock (08-01 centering entry) and is **not** flagged
   here — the two modes agree and are both off.
3. ⚑ **The production numbers are NOT pinned in a fixture.** The committed
   `mislock-rate-slice.json` carries the **labelled clip only** (37 shots) — the four production
   dumps live in the gitignored scratchpad and do not fit. The 811-shot figures are reproducible
   only while that scratchpad survives.

##### §20F — A methodology miss, recorded rather than smoothed over

The production dumps genuinely have no template arm, so re-deriving one there was required. **But
the CALIBRATION did not need re-deriving** — `representative-audit-slice.json`'s labelled block
already carries a committed `cross_tmpl` (446 frames), and that is the sanctioned arm §9B/§10B used
to establish shot 4's truth. It was re-derived anyway, which is why the pre-commit's §2 table
(0/34/0/348/34 px, from the committed arm) does not match the run's own calibration (20–90 px good,
316 px mislock). **Classification is identical under both** — shot 4 mislocked, the other four not —
so no verdict depends on it, and production necessarily uses the fresh arm end-to-end, which is
internally consistent. Recorded as a reuse-before-derive miss.

##### §20G — Instrument

`analyze-pellet-tracks.py --mislock-rate` / `--mislock-rate-selftest`, fixture
`scripts/tests/fixtures/pellets/mislock-rate-slice.json`, wired into `pellet-selftest.sh` (24 arms).
The selftest was shown to fail when an expected classification is perturbed.

**RECORDS a measurement.** No constant, guard (including the 150 px jump guard), threshold or default
changed; `debounce_shots` and both readers untouched; no verdict stamped on the cold bias.

#### §21 THE MISLOCK COST — ⛔ VOID: the pre-committed falsification control FAILED

Executes `docs/handoffs/closed/2026-08-04-mislock-cost-PRECOMMIT.md` (rule committed at `115f01c7`, before
any number existed). **The result is VOID by that document's own §3.1, and no cost figure from this
pass may be quoted.** Recorded because a void result is a real result: it kills a method.

##### §21A — The control, and why it voids the pass

§3.1 pre-committed: on **NOT-mislocked** shots the two locks should count nearly the same thing, and
**if `mean |Δcount|` there reaches 0.5 pellets the A/B is confounded and the whole result is void.**

| quantity                                     | measured   | pre-committed bar |
| -------------------------------------------- | ---------- | ----------------- |
| `mean \|Δcount\|` on **not-mislocked** shots | **0.706**  | VOID at ≥ 0.50    |
| `mean Δcount` on not-mislocked shots         | **−0.170** | —                 |

n = 806 scored shots (137 mislocked, 669 not), 4 dumps, 4 units.

⇒ **Counting is sensitive to lock differences far below the 160 px mislock threshold.** A 30–100 px
shift of a 160 px-radius window already changes which tracks fall inside it. So `Δcount` measures
_"sensitivity of the count to any lock difference"_, **not** _"what a mislock costs"_ — the
threshold does not separate a no-effect population from an effect population, which is precisely
what §3.1 was written to detect.

##### §21B — ⚑ The pre-registered bias appears to have materialized

§4.2 registered a **known one-sided bias** before the run: `center_exclude` is crosshair-relative
(`count-pellets.py:97`), so the fixed track set was detected under the **structural** lock and
components suppressed by structural's 36 px exclusion zone are absent from **both** arms — biasing
**against** the template arm.

The measured `mean Δcount` on not-mislocked shots is **−0.170** — template counting systematically
_less_, in exactly the predicted direction. That is consistent with the registered bias driving part
of both the offset and the control failure. **Consistent with, not proven** — no experiment here
isolates it.

##### §21C — What may and may not be carried forward

⛔ **May NOT be quoted:** any cost figure, any severity figure, and the sign split — all rest on the
voided A/B.

✅ **Survives, because it does not depend on this pass:** §20's **16.9% rate**. That measurement is
of crosshair disagreement itself, validated against the known shot-4 case and reproduced on three
independent bases. Nothing here touches it.

⚑ **What this pass DOES establish, and it is useful:** **severity is not derivable from the two
locks alone.** The A/B can show the two windows count differently; it cannot show **which is
right**, and §3.1 proves the difference is not confined to the mislocked population. ⇒ **Measuring
what a mislock costs requires ground truth on mislocked PRODUCTION shots** — the first genuine
owner-label requirement since §18.

⚑ Also worth carrying: §20D's **0.85 pellets/shot** estimate is **still unverified — neither
confirmed nor refuted.** This pass was built to test it and did not.

##### §21D — Method note

The pre-commit did its job. Without §3.1's control the run would have reported a tidy
`cost ≈ −0.21 pellets/shot`, landed it in the "< 0.20 ⇒ §20D refuted" band, and been wrong — a
confounded measurement dressed as a refutation. **The control was written before the number existed
and it fired.** That is the fifth time in this thread a pre-committed rule has caught a result that
would otherwise have been believed.

**RECORDS a void measurement.** Nothing enacted; no constant, guard, threshold or default changed;
no cold-bias verdict stamped.

#### §22 THE MISLOCK COST, OWNER-ADJUDICATED — the production lock is bad on ~11.8% of shots, but a bad lock does NOT systematically change the count

Resolves what §21 proved underivable: which lock is right. **Tier: OWNER-ADJUDICATED**, blinded.
Instrument `analyze-pellet-tracks.py --lock-adjudication` (seed `20260804`, commit `dff2c05d`).

##### §22A — The blinded set, and the controls that validate it

24 cases: **20 detector-mislocked + 4 not-mislocked controls**, stratified across all 4 production
dumps, shuffled, with the structural/template → A/B assignment randomized per case. The owner saw
only "which marked position is the actual crosshair?" — no dump names, no flags, no ordering signal.
The driver did not read the answer key before the answers arrived.

⚑ **The controls behaved exactly as they must.** The owner volunteered a fifth answer the format did
not offer — **"both"** — on 3 of the 4 controls, and those 3 are precisely the **3 smallest
disagreements in the whole set (1, 4, 8 px)**: where the two locks nearly coincide, both markers sit
on the same reticle. The remaining control (98 px, distinguishable) was answered, and correctly
identified structural. **Blinding and detector both hold.**

##### §22B — Which lock is wrong, on detected-mislocked shots (n = 20)

| owner verdict                     | n     | share   | meaning                                           |
| --------------------------------- | ----- | ------- | ------------------------------------------------- |
| **STRUCTURAL right**              | 6     | 30%     | production lock was FINE despite the disagreement |
| **TEMPLATE right**                | 10    | 50%     | **production lock WRONG**                         |
| ⚑ **NEITHER** (owner-volunteered) | **4** | **20%** | **BOTH locks wrong**                              |

⇒ **The production lock is bad on 14 of 20 = 70% of detected-mislocked shots.** Combined with §20's
16.9% rate: **≈ 11.8% of ALL production shots carry a bad structural lock.**

⚑ This **confirms §20E's limit quantitatively**: 16.9% was an _upper bound_ on structural-specific
mislocks, and the true figure is 70% of it. ⚑ It also shows the detector's premise is incomplete —
**a fifth of flagged shots have BOTH locks wrong**, a category no two-mode comparison can name.

##### §22C — ⚑ THE SURPRISE: a wrong lock does NOT systematically cost pellets

On the 10 cases where the owner establishes template as the correct reference, the count under the
(wrong) structural lock minus the count under the (right) template lock:

`−1, −7, +2, 0, 0, 0, 0, +1, 0, +2`

| statistic       | value                                          |
| --------------- | ---------------------------------------------- |
| mean loss       | **−0.30 pellets/shot**                         |
| sd              | 2.41                                           |
| **SE (sd/√n)**  | **0.76**                                       |
| **⇒ mean ± SE** | **−0.30 ± 0.76 — INDISTINGUISHABLE FROM ZERO** |

**Five of ten are exactly zero, and three are POSITIVE** (structural counted _more_). The channel is
**noise, not systematic loss**: one −7 (structural counted 0 against template's 7) is offset by
+2/+1/+2 elsewhere.

⇒ **§20D's ≈ 0.85 pellets/shot estimate is NOT SUPPORTED.** It was `rate × one shot's severity`;
measured across ten, severity is consistent with zero.

⚑ Note case 20: the wrong structural lock reported **11**, above the `hitsPerShot = 10` physical
ceiling. A bad lock can over-count as well as under-count — which is exactly why the mean is ~0.

##### §22D — ⛔ The limit that most constrains this, stated plainly

**The 4 NEITHER cases (20%) are excluded from §22C by construction, and they are probably the
worst.** Where both locks are wrong, template is not a valid reference, so the loss is unmeasurable —
and if both windows are off-target, both undercount, which would read as "no difference" even while
both lose pellets. **The severity estimate is therefore biased TOWARD zero, and the true cost of the
bad-lock channel is ≥ what §22C measures.**

Other limits: `total_tmpl` comes from template's own independent segmentation, matched by nearest
onset (±15 frames), which adds pairing noise on top of §21's measured 0.706 count noise. n = 10 for
severity, 20 for the verdict split, 4 for the controls.

##### §22E — What is settled, and what is not

✅ **SETTLED:** the production lock is wrong on ~70% of detected-mislocked shots ⇒ **~11.8% of all
production shots**; and **20% of flagged shots have both locks wrong**.
✅ **SETTLED:** §20's 16.9% is confirmed as an upper bound, with the correction factor now measured.
⛔ **NOT SETTLED:** what the bad-lock channel costs. §22C measures ~0 on the subset where it is
measurable, but §22D shows that subset excludes the worst cases. **The cold bias is NOT closed and
mislocks are NOT established as its cause.**
⚑ **§20D's 0.85 pellets/shot is now REFUTED as stated** (it assumed shot 4's −5 severity is typical;
it is not — the median measured severity is 0).

##### §22F — A generation defect worth fixing before any re-run

The owner flagged case 9: _"b shows the right half of the crosshair, the left bound of the image
bisects the crosshair."_ The tight crop was **clipped at the frame boundary** when a candidate sits
near an edge. It did not prevent an answer here, but a future adjudication set must pad or shift
edge-adjacent crops rather than clipping them.

**RECORDS a measurement + an owner adjudication.** Nothing enacted; no constant, guard, threshold or
default changed; no localizer re-tune; no cold-bias verdict.

#### §23 `--dump-tracks` NOW CARRIES THE `band` CHANNEL — the silent production/analysis divergence is closed

Fixes the defect recorded at §16E. Plan with blast radius **declared before any production file was
touched**: `docs/handoffs/closed/2026-08-04-dump-band-LANDING-PLAN.md` (committed `235f573a`); landing
`bde7a37f`. Owner-approved on the principle that **tooling faithfulness is a win regardless of the
cold-SG question**.

##### §23A — The defect

`count-pellets.py:1865` wrote a dump's `frame_counts` as `{white, red, marker}`, **dropping `band`**
although the value was already present at the write site. Since `debounce_shots` falls back to
pre-hybrid behaviour when no frame carries a `band` key (`:598`, `has_band`), **every dump produced
by `--dump-tracks` replayed as if the 2026-08-04 hybrid landing had never happened** — any audit
against fresh footage would silently score the OLD representative-frame rule while appearing to test
production. The production reader was never affected (`read-pellets.ts` parses `--temporal` stdout,
`:1935`, which does carry `band`).

##### §23B — ⚑ The semantic the whole backward-compat mechanism rests on

**A 3-wide row means `band` is UNKNOWN and the key is OMITTED — never defaulted to 0.** `has_band`
tests key _presence_, so a fabricated `band: 0` would flip a pre-hybrid replay onto the hybrid path
with an all-zero band series. Verified behaviourally, not just by inspection:

| input row   | expanded dict                        | `band` key |
| ----------- | ------------------------------------ | ---------- |
| `[5,1,0]`   | `{white:5, red:1, marker:0}`         | **absent** |
| `[5,1,0,0]` | `{white:5, red:1, marker:0, band:0}` | present    |
| `[5,1,0,7]` | `{white:5, red:1, marker:0, band:7}` | present    |

⇒ a genuine `band = 0` is preserved and remains **distinguishable from "unknown"**.

##### §23C — ⚑ The plan's reader list was NOT exhaustive, and the enumeration was re-run

The plan named two hard 3-unpack readers (`for w, r, m in …`). An independent enumeration found
**eleven** such sites, classified by data provenance:

- **6 reachable** — fed by `_rep_slim_dump`'s own persisted output, so they could receive a 4-wide
  row after a future fixture regeneration. All widened via a shared `_expand_frame_counts_row`
  helper. Four of these six were **not** in the plan.
- **5 unreachable** — fed by other builders (`_merge_slim`, the labelled-window builder, `_bma_slim`)
  that can never emit `band`. Left untouched and reported rather than changed.

Recorded because "the plan named two, the tree had six" is exactly the latent-crash class this
landing exists to prevent.

##### §23D — The five pre-stated criteria, all MET

| #   | Criterion                                            | Evidence                                                                                                                                                          |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fresh dump carries `band`, matching stdout           | 60-frame subset of `groundtruth-f811-v4/frames`, structural locate: all 60 entries carry `band`, **0/60 mismatches** vs the same run's `--temporal` `opencv.band` |
| 2   | Fresh dump takes the **hybrid** path                 | `has_band = True`; representative frame **39** (band plateau 35–42 all = 7) vs **31** on the same dump with `band` stripped — a real behavioural divergence       |
| 3   | Existing band-less dump replays **byte-identically** | Pre-op module (`git show 235f573a:…`) vs current, same input: identical `shots`/`summary`, sha256 `f95980bf…50ab1` on both sides                                  |
| 4   | `_rep_slim_dump` round-trips / omits correctly       | With-band → 4-wide, values preserved; without-band → 3-wide, key never fabricated (§23B)                                                                          |
| 5   | Both gates                                           | `pellet-selftest.sh` **25 arms TRUE exit 0**; `verify.sh` **TRUE exit 0**                                                                                         |

##### §23E — Blast radius: the prediction HELD

§3 predicted **zero fixtures move, zero pins move**. Outcome: only `count-pellets.py` and
`analyze-pellet-tracks.py` are touched; `git diff` over `scripts/tests/` and
`scripts/regression-snapshot*.json` is **empty**; `CACHE_SELFTEST_EXPECT` unmoved. Existing dumps are
not rewritten and keep replaying identically — the key-absence mechanism preserved them exactly as
the hybrid landing's own backward compatibility does.

##### §23F — Scope and what this does NOT do

⚑ **Only NEWLY-written dumps gain the field.** Every dump already on disk is still band-less and
still replays pre-hybrid — so **any measurement re-derived from an existing dump is still scoring the
old rule.** Realizing the benefit requires re-running `--dump-tracks`. That is the same
"new extractions only" property §16C recorded for the `band_hi` landing itself.

⛔ Nothing here touches the cold bias, and no verdict is stamped on it. This is a
tooling-faithfulness landing: it makes the analysis path agree with the production path, nothing more.

#### §24 THE BACKEND-SELECTOR TIE-BREAK IS FIXED — and it exposes a downstream defect it deliberately does not fix

Closes §11E's recorded defect (item 6). Plan with blast radius **measured before any production file
was touched**: `docs/handoffs/closed/2026-08-04-backend-selector-LANDING-PLAN.md` (`42d26077`), pre-op gate
folded (`f1341e72`), landing `a662b842`.

##### §24A — The defect, and what §11E did not say

`read-pellets.ts` ranked backends on **`white + red` alone**, then read `marker` — and, since the
2026-08-04 hybrid landing, **`band`** — off whichever backend that key selected. Those two channels
never participated in the choice, and `Array.reduce`'s strict `<` leaves the accumulator in place on
a tie, so **ties resolved to array order: numpy → pil → opencv.** Production runs `--backend opencv`
with the others zero-filled, so the tie fires exactly when **`white + red == 0` on every backend** —
`total = 0`, nothing is ever strictly less, and numpy's zeros overwrite opencv's real values.

⚑ **§11E recorded one passenger channel; there were two.** `band` inherited the identical defect and
feeds `perFrameForDebounce` → `debounceShots` → the landed representative-frame rule.

##### §24B — Blast radius, MEASURED (§11E's figure was stale)

Re-measured over **24,679 frames / 848 shots / 5 dumps / 4 units** at the landed `band_hi`: the tie
fires on **12,614** frames, discarding a nonzero `band` on **442** and a nonzero `marker` on **606**.

⚑ **Narrowed to what can change an answer — in-span AND `band ≥ MERGE_EVENT_MIN`, i.e. able to form
a plateau — the count is ZERO, and 0 of 848 shots have a representative frame there.** Every
discarded `band` value is 1–2. **The counting path was never affected.** The raw 1,018-frame exposure
would have been the wrong number to quote; that is the §20D trap, avoided by narrowing before
reporting.

##### §24C — The landing moved exactly ONE event, the pre-declared one

| dump                     | frames | `white`/`red`/`total`/`valid` diffs | marker-divergent frames | `totalShots` | shot diffs |
| ------------------------ | ------ | ----------------------------------- | ----------------------- | ------------ | ---------- |
| `h4-marciana-structural` | 5697   | **0**                               | 82                      | 218 = 218    | **1**      |
| `h4-isabel-structural`   | 5721   | **0**                               | 146                     | 203 = 203    | 0          |
| `h4-guilty-structural`   | 5738   | **0**                               | 230                     | 180 = 180    | 0          |
| `g2-noir-structural`     | 5722   | **0**                               | 204                     | 214 = 214    | 0          |
| `groundtruth-f811-v4`    | 1801   | **0**                               | 22                      | 37 = 37      | 0          |

⚑ **The marker-divergent frame counts 82 / 146 / 230 / 204 reproduce §11I's table EXACTLY**, by a
different method (diffing the fix's own output rather than auditing backends). Independent
corroboration that the fix targets precisely the population §11 identified.

The single shot diff is the **pre-declared §5 exception**: `h4-marciana-structural` event #56, frames
1555–1569 — `red` 0→1, `total` 4→5, `core` false→true, with **`frame`/`start`/`end` unchanged, so no
onset moved.** No committed fixture pins it: **zero fixtures moved**, all 25 selftest arms,
`verify.sh` and `npm run typecheck` green.

##### §24D — ⚑ THE FIX IS RIGHT AND ITS RESULT ON THAT EVENT IS PROBABLY WRONG

The event that flipped to `core = true` spans **f1565** — the exact frame §15 adjudicated, where
opencv's `marker = 3` is **1 genuine crosshair-attached marker + 2 single-frame red UI-banner
glyphs.** `MARKER_MIN` is 2, so **two banner glyphs are sufficient to raise a core-hit flag.**

⇒ **This landing stops the passenger channel being chosen by array order. It does NOT adjudicate
marker truth, and the plan said so up front.** The consequence is that a defect previously masked by
the array-order bug is now visible: **`marker` counts UI artifacts as hit-markers, and `MARKER_MIN = 2`
is met by them.** ⚑ **NEW OPEN ITEM**, not fixed here — fixing it means filtering markers by the
crosshair-attached geometry §15 established (constant offset across frames), which is its own pass
with its own blast radius.

⚑ Read plainly: the reader's _selection_ is now faithful; its _marker semantics_ are not, and the
old bug was accidentally suppressing a symptom of that.

##### §24E — The pre-op gate caught a fatal flaw in the plan's own design

The original §3 proposed deriving `marker`/`band` "by the same active-backend consensus used for
`total`". **That would have been a silent no-op:** `total`'s activity test is `white + red > 0`,
false for every backend on exactly the frames the defect fires — the consensus would have emitted 0
and preserved the wrong answer. The gate's `simplerPath` was adopted instead (per-channel activity:
first backend with that channel > 0, else `best`, else 0), and a per-channel median was explicitly
rejected because it would **erase a lone real marker** in a genuine 3-backend run.

⚑ **Second time in this session a cross-family pre-op gate caught a landing plan that would have been
a no-op** (the first was the `band_hi` restructure). Recorded because that is now a pattern, not an
incident.

##### §24F — Scope

5 dumps / 4 units / 24,679 frames for the blast radius; production is single-backend
(`--backend opencv`), and the fix's multi-backend behaviour is defensible but untested against real
3-backend footage. A zero-filled inactive backend remains indistinguishable from an active backend
that genuinely observed zero — resolving that needs active-backend metadata in `count-pellets.py`'s
output, which was **deliberately deferred** as a schema change outside this landing's hard stops.

⛔ Nothing here touches the cold bias, and no verdict is stamped on it.

#### §25 `--dump-tracks` CANNOT FAITHFULLY REPLAY THE `white`/`red`/`marker` SPLIT — the third analysis/production divergence, fully accounted

**2026-08-05.** Answers a prerequisite the §8 item-2 marker-semantics pass walks straight into:
**§15's discriminator, and every other arm in `analyze-pellet-tracks.py` that re-derives channels
from a `tracks.json`, reads a substrate that is not what production counted.** Same shape as §23's
missing `band` channel and §11E/§24A's array-order tie-break — this is the **third** instance of the
analysis path silently disagreeing with the production path, so it is recorded as a pattern, not an
incident.

##### §25A — The measurement

`analyze-pellet-tracks.py --dump-replay-fidelity` re-derives each frame's `white`/`red`/`marker`
from a dump's own `tracks` + `cross_positions` + `params` — exactly the way every consuming arm
does — and compares it against the `frame_counts` that same dump emitted.

| dump                     | frames scored | divergent | marker-divergent | marker-bearing frames | marker divergence rate |
| ------------------------ | ------------- | --------- | ---------------- | --------------------- | ---------------------- |
| `h4-marciana-structural` | 5473          | 89        | 61               | 440                   | **13.86%**             |
| `h4-isabel-structural`   | 5601          | 149       | 93               | 693                   | **13.42%**             |
| `h4-guilty-structural`   | 5614          | 86        | 63               | 599                   | **10.52%**             |
| `g2-noir-structural`     | 5508          | 168       | 111              | 1004                  | **11.06%**             |
| `groundtruth-f811-v4`    | 1801          | 15        | 13               | 58                    | **22.41%**             |
| **pooled**               | **23,997**    | **507**   | **341**          | **2794**              | **12.20%**             |

⚑ **Quote the marker rate, not the frame rate.** Per-frame divergence is 2.11% and reads as
negligible; the marker channel is sparse, so on the population a marker analysis actually consumes
the divergence is **12.20%** — a ~6× difference in the same data. (§4's NARROW-BEFORE-YOU-QUOTE trap,
run in the other direction: here the raw denominator is the one that misleads.)

##### §25B — ⚑ TWO MECHANISMS, AND THEY ARE A COMPLETE ACCOUNT — `UNEXPLAINED = 0`

Every one of the 507 divergent frames is attributed, none left over:

1. **SPLIT — 491 of 507 (96.8%).** `_track_components` writes `is_red` onto a track **once, at
   creation**, and never updates it; `_frame_pellet_counts` classifies using the **per-frame**
   component's `is_red` out of `frame_tracks`. `--dump-tracks` persists only the track-level value,
   so a track whose components change colour mid-life replays under the wrong channel. Nothing
   enters or leaves the radius window, so **the in-radius total is conserved — that conservation IS
   the signature**, and it is what makes the mechanism testable rather than asserted.
2. **BOUNDARY — 16 of 507 (3.2%).** `--dump-tracks` rounds `xs`/`ys` to 0.1 px, so a track within a
   rounding step of `pellet_radius` or `marker_radius` lands on the other side of `dist > radius` on
   replay. **All 16 sit within 0.0397 px of one of those two radii** (test threshold 0.05).

⇒ The two mechanisms are not competing hypotheses; they partition the population exactly, and each
carries its own independent signature (total-conservation; boundary proximity). That is what raises
this above a code-read inference: the code read predicts both signatures, and both are observed at
the predicted proportions on 23,997 frames.

##### §25C — What it does and does not invalidate

- ⚑ **§15's frame-1565 read STANDS.** Replayed directly: f1564 `marker` 1 = 1, **f1565 `marker` 3 =
  3**, f1566 1 = 1, with `11110`/`11115`/`11117` at 57.7/47.1/63.6 px — the exact ids and distances
  §15A tabulated. That frame is not in the divergent population.
- ⛔ **It DOES bound any swept marker-semantics measurement off `tracks.json`** — the §8 item-2 pass
  would inherit a ~12% mislabel rate on precisely the channel it is measuring. That is the reason
  this was run before item 2, not after.
- ⛔ **No pellet-count conclusion is disturbed.** `white`'s divergence rides the same SPLIT
  mechanism but the cold-bias work scores `band`/`white` per shot, and the affected frames are 2.11%
  of all frames. **No prior §-entry's number is restated here**, and nothing about the cold bias is
  touched.
- `marker_radius` is **not persisted in a `--dump-tracks` `params` block at all**, unlike
  `pellet_radius`/`max_pellet_frames`. Replay must assume `count-pellets.py`'s default (65);
  `--fidelity-marker-radius` makes that assumption explicit rather than silent. **A second,
  independent schema gap**, found while measuring the first.

##### §25D — Instrument and reproduction

New arm on the existing instrument (constraint 9: extend, don't fork):
`analyze-pellet-tracks.py --dump-replay-fidelity`, self-validated against the committed slice
`scripts/tests/fixtures/pellets/dump-replay-fidelity-slice.json` and registered in
`scripts/probe/pellet-selftest.sh` (now **26 arms**; `verify.sh` green). The slice commits **every**
divergent frame plus 200 non-divergent controls per dump, so the selftest asserts the arm
DISCRIMINATES (1000 control frames replay exactly) as well as that it runs.

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
$PY scripts/probe/analyze-pellet-tracks.py --dump-replay-fidelity \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/{h4-marciana-structural,h4-isabel-structural,h4-guilty-structural,g2-noir-structural,groundtruth-f811-v4}/tracks.json
# replay the committed slice -- no scratchpad access:
$PY scripts/probe/analyze-pellet-tracks.py --dump-replay-fidelity-selftest
```

⚑ The selftest's printed RATES are **enrichment-biased** (the slice keeps every divergent frame and
only a sample of the rest); the population figures are §25A's table. What the fixture pins is the
NUMERATORS and the mechanism partition.

**RECORDS a measurement. NOTHING ENACTS.** `count-pellets.py`, `read-pellets.ts`, `MARKER_MIN`,
`debounce_shots` and the `--dump-tracks` schema are all UNCHANGED; no constant, gate, threshold or
default moved; no existing fixture was touched. The schema fix this finding implies is a separate
landing with its own blast-radius pass.

#### §26 THE `--dump-tracks` SCHEMA FIDELITY LANDING — §25's two mechanisms go to ZERO by construction, and a THIRD gap surfaces

**2026-08-05.** Executes `docs/handoffs/closed/2026-08-05-dump-schema-LANDING-PLAN.md` (blast radius
measured before any production file was touched; cross-family pre-op gate `kimi-code/k3`
**APPROVED-WITH-REVISIONS**, all four revisions executed, verdict quoted in the plan's §7 at receipt
per trap 6). Landing `8d500ff9`. Implementation delegated to a Sonnet subagent against the approved
plan; every acceptance number below was **independently re-derived by the driver**, not accepted as
reported.

##### §26A — What changed

| Edit  | Change                                                                                            | Kills                         |
| ----- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| A     | `_track_components` stamps a per-frame `reds` array parallel to `xs`/`ys`/`areas`                 | **SPLIT**, exactly            |
| B     | `--dump-tracks` stores `xs`/`ys` at **full precision** (no `round(v, 1)`)                         | **BOUNDARY**, by construction |
| C     | `params` persists `marker_radius` **and** `band_hi`                                               | the silent replay assumption  |
| D1–D4 | The two per-frame reconstructions consume `reds`; two sites resolve `marker_radius` from `params` | the NO-OP the gate flagged    |

⚑ **Edit B is full precision because the gate refused 2 dp.** 2 dp only shrinks the flip window to
~±0.007 px and leaves `n_divergent == 0` unprovable — the dump does not record the true pre-rounding
distance, so no measurement on an existing dump can rule out a residual flip. Full precision removes
the mechanism instead of shrinking it. **This is exact only because `cross_positions` carries no
rounding error** — verified, not assumed: every stored value on `h4-marciana-structural` (n=5473)
and `groundtruth-f811-v4` (n=1801) is **integer-valued**, so `xs`/`ys` were the only lossy term.

##### §26B — Acceptance, all five controls

New dump `groundtruth-f811-v5-schemafix` — `groundtruth-f811-v4`'s 1801 on-disk frames re-run
through the counter with the original flags (no ffmpeg, no VLM). ⛔ The original was **never
overwritten**; it is §25's evidence.

| Control                                                             | Result                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Determinism** — new `frame_counts` vs old, `white`/`red`/`marker` | **0 diffs / 1801 frames.** These edits change no counting math.                             |
| **Replay fidelity on the NEW dump** (`n_divergent`)                 | **15 → 0** (was 13 SPLIT + 2 BOUNDARY)                                                      |
| **⚑ The no-op check**                                               | A landing that left this at 15 would be the no-op the gate caught twice before. It did not. |
| **Backward compat** — untouched `h4-marciana-structural`            | still exactly **89** (88 SPLIT / 1 BOUNDARY), marker rate 0.1386 — §25A reproduced          |
| **Fixtures moved**                                                  | **ZERO.** 26 selftest arms and `verify.sh` green.                                           |

##### §26C — First-ever `band`-channel replay reading (§4.1's known-unknown)

`band` rides the same SPLIT mechanism, and until this dump existed **no dump on disk carried `band`
in `frame_counts`** — every one predates §23, so it had never been measurable. On the first post-§23
dump: **pre-fix 13 divergent frames of 1801** (577 band-bearing), **post-fix 0**. Consistent with
the 13 SPLIT frames in the same dump's `white`/`red`/`marker` divergence — the same colour-flipping
tracks, as the mechanism predicts. The plan's pre-committed rule was that a nonzero reading here
records a finding and does not block; it went to zero, so nothing was owed.

##### §26D — ⚑ A THIRD SCHEMA GAP, FOUND WHILE VERIFYING — reported, NOT acted on

**`fps` is not persisted in the `--dump-tracks` `params` block either**, and `band_lo` is
`round(8 × fps / 60)` — so **a replay of the `band` channel cannot resolve its own lower bound from
the dump.** It has to guess, exactly the failure §25 and this landing exist to remove.

This is not hypothetical: the driver's first pass at §26C assumed `fps = 60` (the clip's own
sampling rate), got **312 pre-fix / 304 post-fix**, and would have reported the landing as failing
`band`. `count-pellets.py --fps` defaults to **30** and `make-groundtruth-f811.py`'s `run_counter`
never passes it, so the real value is `band_lo = 4`, giving 13 / 0. **The wrong-`fps` reading was
caught by the whole-picture check** (a fix that takes `white`/`red`/`marker` to exactly zero cannot
leave `band` at 304 — same mechanism, same tracks; the contradiction was the tell).

⚑ Two consequences, both **recorded for a later pass, neither enacted here**:

1. Persisting `fps` belongs with edit C. Out of scope for this landing, which was gate-approved with
   a fixed edit list.
2. ⚑ **`make-groundtruth-f811.py` extracts at 60 fps but lets the counter default to `--fps 30`**,
   so that dump's `band_lo` is 4 where the clip's own rate implies 8. This predates `band` existing
   and touches no landed conclusion, but it is a live provenance mismatch for any future `band` work
   on that clip.

##### §26E — Cost and scope

`tracks.json` **2,758,003 → 3,800,307 bytes (+37.8%)** on this dump — above the plan's per-edit
estimates (A +10%, B +19–22%, which were not strictly additive). Recorded as measured; scales with
`sum(track life)`, not with clip length alone.

**Eleven call sites in `analyze-pellet-tracks.py` plus two in `score-pellets.py` still read the
track-level creation-time `is_red`** — deliberately: they ask "which colour is this track", not a
per-frame channel-counting question, and changing them would move committed fixtures for no measured
reason. ⚑ On a SPLIT frame that value is now something the same dump demonstrably contradicts, so
any FUTURE arm built on them inherits §25's 12.20% mislabel. A code comment in the
`--dump-replay-fidelity` section records this so a later pass finds it rather than re-deriving it.

⛔ **The gains reach NEW extractions only.** Every dump written before `8d500ff9` still carries
neither `reds` nor full-precision positions and still exhibits both mechanisms exactly as §25A
measured. ⛔ Nothing here touches the cold bias, `MARKER_MIN`, `debounce_shots`, or `read-pellets.ts`'s
counting path, and no verdict is stamped on marker truth — that is the marker-semantics pass, still
open.

#### §27 MARKER SEMANTICS — 21.7% of production `core` flags fail a persistence test, but the pellet-count cost is ~3% of the cold residual

**2026-08-05.** Executes `docs/handoffs/closed/2026-08-05-marker-semantics-PRECOMMIT.md`, whose rule,
thresholds, decision bands and three falsification controls were committed at **`e909c94c` before
any production number existed**. Closes §8 item 2 of the 08-04 session handoff as a MEASUREMENT.
Unblocked by §26 — this could not honestly be asked before the substrate was fixed.

##### §27A — ⚑ WHY THIS IS NOT A REPORTING-FIDELITY ITEM

Verified in **both** implementations (`count-pellets.py` `debounce_shots`, `read-pellets.ts`
`debounceShots`): `shot_red = 1 if core_hit else 0`, then `total = white + shot_red`. **A `core`
flag adds exactly +1 pellet to that shot's total.** So a false flag makes the reader **warmer**, and
removing false flags makes it **colder** — the pre-commit's §2 directional prediction, recorded
before scoring precisely so a "the fix improves the number" result would read as suspect.

##### §27B — The measurement, 815 shots / 22,196 frames / 4 units

Substrate: the four `*-schemafix` dumps (per-frame `reds`, §26). Each reproduced its original's
`white`/`red`/`marker` **and** `cross_positions` with **zero** diffs, and the arm's own
reconstruction control is **0 mismatched frames on all four** — so the delta below is attributable
to the filter, not to the reconstruction.

| dump (unit)                          | marker tracks | LIFE1 | ATTACHED | SCREEN_FIXED | MOVING | UNDECIDABLE | core flags | dropped (C1) | rate      |
| ------------------------------------ | ------------- | ----- | -------- | ------------ | ------ | ----------- | ---------- | ------------ | --------- |
| `h4-marciana-schemafix` (`marciana`) | 400           | 153   | 29       | 21           | 113    | 84          | 35         | 3            | 8.6%      |
| `h4-isabel-schemafix` (`isabel`)     | 744           | 365   | 27       | 11           | 178    | 163         | 43         | 6            | 14.0%     |
| `h4-guilty-schemafix` (`guilty`)     | 569           | 309   | 17       | 20           | 108    | 115         | 40         | 16           | **40.0%** |
| `g2-noir-schemafix` (`noir`)         | 1041          | 524   | 30       | 18           | 219    | 250         | 62         | 14           | 22.6%     |
| **pooled**                           | **2754**      | 1351  | 103      | 70           | 618    | 612         | **180**    | **39**       | **21.7%** |

⇒ **The pre-committed band (§6) returns `> 20%`: a DOMINANT reporting defect.** Adding C2 moves it
to 46/180 = **25.6%**.

##### §27C — ⚑ BIG AS A FRACTION OF CORE FLAGS, SMALL AS A FRACTION OF THE PELLET COUNT

**These are different bases and must not be conflated** (the §4 trap, in a new place):

- **21.7% of core FLAGS** is the §27B headline.
- **The pellet-count cost is −39 pellets over 815 shots = −0.048 pellets/shot.**

Against §19's **−1.40 pellets/shot** cold residual that is **~3.4%**, and it moves the residual the
**wrong way** — to about −1.45. ⚑ **Marker semantics is a faithfulness win, NOT a cold-bias lead.**
It removes a small warm contamination that was partially masking the cold read.

⛔ **Do not quote `ΔavgTotal` as the cost.** `avgTotal` averages over the `[min_pellets,
max_pellets]` VALID subset, and dropping a flag moves shots ACROSS that boundary in both directions
(`isabel` 157→155 valid, `noir` 167→168) — `isabel`'s `ΔavgTotal` is **positive** (+0.0035) while
losing 6 flags, purely because two low-total shots fell below `min_pellets` and left the average.
The honest cost is Δtotal over ALL shots, above.

##### §27D — Falsification controls: all three PASS, none fired

- **CONTROL A — DISCRIMINATION (the decisive one).** The rule reproduces §15's independently
  adjudicated `h4-marciana` **f1565**: 3 contributing tracks, `11110` **ATTACHED** (kept),
  `11115` and `11117` both **LIFE1** (dropped) ⇒ `marker` **3 → 1**, exactly §15A's table. That
  label was made before this rule existed and is pinned in the committed
  `marker-geometry-slice.json` — an independent method, not the same derivation twice.
- **CONTROL B — OVER-FILTERING.** Removes **25.7%** of marker mass, against a 60% VOID line.
- **CONTROL C — NON-VACUITY.** 39 of 180 flags dropped, not all.

##### §27E — ⚑ THE RATE IS A FLOOR, NOT AN ESTIMATE

The rule only ever drops what it can **positively** rule out; everything undecidable is KEPT. Two
populations make this a lower bound:

- **`MOVING` (618 pooled, all KEPT).** On `h4-marciana` **58 of 113** lean screen-fixed
  (`abs_spread` well below `rel_spread`; medians 24 vs 44 px) against only **4** leaning attached.
  These are artifact-like and survive both arms only because they drift past the strict 6 px bound.
- **`UNDECIDABLE` (612 pooled, all KEPT)** — the crosshair moved less than `MS_TRAVEL_MIN` over the
  track's life, so C2 has no leverage and abstention is the honest answer.

##### §27F — What is NOT established

- ⚑ **Whether a GENUINE hit-marker can be single-frame is NOT settled, and C1 rests on it.** A
  life-1 track has one frame, so its attachment is undefined **by construction** — geometry cannot
  answer this. The available support is that positively-ATTACHED markers live **2–7 frames**
  (pooled histogram `{2:31, 3:31, 4:18, 5:6, 6:7, 7:10}`, median ~3), which makes a life-1 red blob
  near the crosshair likelier a glyph than a marker. ⚑ **That histogram is truncated at 2 by
  construction** (C2 only runs on life ≥ 2), so it can never speak to life-1 directly. Settling it
  needs the marker VFX's own duration from footage, or an owner adjudication.
- ⚑ **The per-unit spread is large and unexplained: 8.6% / 14.0% / 40.0% / 22.6%**, n=4 units.
  `guilty` is an outlier with 54% of its marker tracks life-1 (vs 38% on `marciana`). Recorded, not
  explained; do not manufacture a cause.
- CONTROL A is a discrimination check against an **n = 1 frame** adjudication. The rule _agreeing_
  with it is not independent confirmation that the rule generalizes.

##### §27G — Instrument and reproduction

New arm on the existing instrument (constraint 9): `analyze-pellet-tracks.py --marker-semantics`,
self-validated against `scripts/tests/fixtures/pellets/marker-semantics-slice.json` and registered
in `scripts/probe/pellet-selftest.sh` (now **27 arms**; `verify.sh` green). The arm **REFUSES** a
dump written before the `reds` schema with a loud banner rather than scoring it — §25's 12.20%
mislabel sits on exactly this channel. It measures on the **production path**: it rewrites only
`marker` in the dump's own stored `frame_counts` and re-runs `count-pellets.py`'s real
`debounce_shots`, so `white`/`red`/`band` are bit-identical between arms and segmentation
invariance is asserted, not assumed.

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
S=/Users/maxwellsutton/nikke-sim/scratchpad/pellets
$PY scripts/probe/analyze-pellet-tracks.py --marker-semantics \
  $S/{h4-marciana,h4-isabel,h4-guilty,g2-noir}-schemafix/tracks.json
$PY scripts/probe/analyze-pellet-tracks.py --marker-semantics-selftest   # committed slice
```

**RECORDS a measurement. NOTHING ENACTS.** `MARKER_MIN`, `debounce_shots` (both implementations),
`read-pellets.ts`'s counting path and every constant/gate/threshold/default are UNCHANGED; no
existing fixture was touched. ⛔ The band says a landing is warranted — that landing is a **separate
pass** with its own blast-radius pass and its own gate, and per §27F it should not proceed until the
life-1 question has an answer that is not geometric.

#### §28 OWNER CORRECTION — the marker VFX AND the pellet both last 14 frames; §27F's gate is answered and §27's rate is BRACKETED

**2026-08-05, OWNER-MEASURED.** Two inputs, given in response to §27F's stated blocker:

1. **The hit-marker VFX lasts 14 native frames.**
2. **A pellet lasts 14 native frames, not 13** — a correction to the lifecycle spec that has governed
   every derivation in this thread.

##### §28A — §27F's gate is ANSWERED: C1's premise holds

§27F blocked the marker-semantics landing on a question geometry could not answer — can a GENUINE
hit-marker be single-frame? At **14 native frames ≈ 7 frames at the production 30 fps sampling**, a
single sampled frame is **one seventh** of a whole marker. ⇒ **C1's premise ("a genuine hit-marker
persists ≥ 2 frames") is CONFIRMED as a statement about the VFX**, and by a wide margin rather than
narrowly.

##### §28B — ⚑ BUT A NEW QUALIFICATION REPLACES IT, AND IT CUTS AGAINST §27

The premise being right about the _VFX_ does not make C1 right about a _track_. If a marker spans
~7 sampled frames but the tracker FRAGMENTS it, a life-1 detection can be a **piece of a real
marker** rather than a UI glyph. §27's own ATTACHED-life histogram already hinted at this: median
life ~3 against an expected ~7.

Measured (`--marker-semantics`, pooled over the four `*-schemafix` dumps): of **1351** life-1 marker
tracks, **255 (18.9%)** sit within 15 px **crosshair-relative** (so crosshair motion cannot fake the
match) of a life ≥ 2 marker track within ±2 frames — **fragment-like**. **1096 (81.1%) are
isolated.**

⚑ **Suggestive, not decisive**, and a **LOWER** bound: a marker shattered into ALL life-1 pieces has
no life ≥ 2 partner and scores as isolated.

⇒ **§27's 21.7% is BRACKETED, not pinned.** It **over**-drops (≈19% of the life-1 population it
removes is fragment-like) and **under**-drops (`MOVING` 618 + `UNDECIDABLE` 612 all kept, 58 of 113
`MOVING` on `h4-marciana` leaning screen-fixed). The two errors are of opposite sign and are **not**
known to cancel. The verdict "a real channel worth fixing" survives; the specific figure should not
be quoted as a point estimate.

##### §28C — ⚑ A COLD CHANNEL THIS ARM WAS NOT BUILT TO SEE: markers clipped by the ceiling

A full marker spans ~7 sampled frames at 30 fps — **exactly `max_pellet_frames = 7`**. A red
near-crosshair track whose life EXCEEDS that is dropped from `pellet_ids` and never reaches `marker`
at all. Measured: **164 such tracks** across the four dumps (5.6% of red near-crosshair tracks), life
histogram peaking at **8–10**, i.e. just over the cutoff.

⇒ These are plausibly **MISSED core hits** — the **opposite sign** to §27's false-flag channel:
missing a real flag makes a shot **colder** by 1. §27's warm-removal and this cold-omission push
against each other, and **neither has been netted**. Not scored here; recorded so the marker-landing
pass treats the channel as two-sided.

##### §28D — Does the 13 → 14 pellet correction matter? Mostly NO, and where it does it REMOVES A TRAP

`max_pellet_frames` is derived as `Math.max(4, Math.round((13 / 60) * fps))`
(`read-pellets.ts:790`), mirrored in `analyze-pellet-tracks.py`'s `_merge_max_pellet_frames`.

| L      | fps 30 (JS / Python) | fps 60 |
| ------ | -------------------- | ------ |
| **13** | **7 / 6** ⚠ DESYNC   | 13     |
| **14** | **7 / 7** ✅         | 14     |

- ⇒ **At 30 fps — every production dump — the correction is INERT.** `max_pellet_frames = 7` either
  way. No production measurement in §§14–27 moves.
- ⇒ **At 60 fps it is 13 → 14**, so the `groundtruth-f811-v4`/`v5` clips were built one frame short
  of the true pellet lifetime.
- ⚑ **It ELIMINATES the cross-language rounding hazard** that trap 1 of the 08-04 session handoff
  documents: `(13/60)×30 = 6.5` lands exactly on the JS-half-up / Python-half-to-even tie, which is
  why `_merge_max_pellet_frames` carries a bespoke `floor(x + 0.5)` workaround. `(14/60)×30 = 7.0` is
  not a tie in either language. **The correction removes the defect the workaround exists for.**

##### §28E — What this does NOT do

⛔ **No constant changed here.** `13` is still live in `read-pellets.ts:790` and
`_merge_max_pellet_frames`. Changing it is an ENACTMENT with a real blast radius —
`_merge_max_pellet_frames(60)` moves 13 → 14, which reaches the merge-audit arm and the three
committed 60 fps fixtures carrying `max_pellet_frames: 13` (`merge-audit-slice`,
`representative-audit-slice`, `stale-counting-slice`) — and it gets its own pass with its own
blast-radius declaration and gate, per constraint 3's distinction: this is an owner CORRECTION to a
measured value, not a refit, but it still lands under the normal discipline.

⛔ §27's measurement is **not** restated or re-scored; §28B qualifies its interpretation, and the
instrument now reports both new quantities alongside it. ⛔ Nothing here touches the cold bias,
`MARKER_MIN`, or `debounce_shots`.

#### §29 THE PELLET LIFETIME IS 14 — LANDED, inert at 30 fps, and a documented cross-language trap is retired

**2026-08-05.** Enacts §28D's owner correction. Plan
`docs/handoffs/closed/2026-08-05-pellet-lifetime-14-LANDING-PLAN.md` with the blast radius **measured by
toggling the constant and running the gate before any production file was touched** (then reverted,
`cmp`-verified byte-identical). Cross-family pre-op gate `kimi-code/k3` **APPROVED-WITH-REVISIONS**,
all four executed, verdict quoted in the plan's §8 at receipt. Landing `07b82474`.

##### §29A — What changed

`max_pellet_frames` is now derived from **14** native frames, not 13, at six sites: the live
production derivation (`read-pellets.ts`), its Python mirror (`_merge_max_pellet_frames`), the
`make-groundtruth-f811.py` 60 fps generator plus **both its justifying comments**,
`score-pellets.py`'s two explicit `--max-pellet-frames` literals, and the mirror's docstring.

##### §29B — Acceptance, every control

| Control                                                       | Result                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **30 fps invariance** (the load-bearing claim), run literally | `13 → 7`, `14 → 7`. **Identical.** Every production dump is untouched.                                                                                                                                      |
| Only the predicted arm fails                                  | `--merge-audit-selftest` and nothing else, out of 27 arms.                                                                                                                                                  |
| Fixture diff, `merge-audit-slice.json`                        | **5 lines, 3 fields, exactly as predicted**: `max_pellet_frames` 13→14 (both 60 fps dumps), `n_over_max_pellet_frames` 22→11 and pooled 110→99, `over_max_pellet_frames_pct` 51.4→46.3. Nothing else moved. |
| ONE fixture regenerated, with the change it reflects          | Yes — constraint 5 satisfied.                                                                                                                                                                               |
| `pellet-selftest.sh` (27 arms) + `verify.sh`                  | Green.                                                                                                                                                                                                      |
| `docs/data/damage-calculation.md:302`'s `+ 13 frames`         | **UNTOUCHED** — that is the RELOAD constant, and it matches the same grep. The named trap of this landing, avoided.                                                                                         |

⇒ **No measurement in §§14–27 moves.** All are 30 fps production dumps and the cap is 7 either way.
The only thing that moved anywhere is a **diagnostic census** whose own docstring flags it as a
category error displayed for contrast.

##### §29C — ⚑ The trap this actually retires

`(13/60) × 30 = 6.5` sat **exactly** on the JS-half-up / Python-half-to-even tie — trap 1 of the
08-04 session handoff, and the reason `_merge_max_pellet_frames` carries a bespoke
`floor(x + 0.5)`. `(14/60) × 30 = 7.0` is not a tie in either language. **The correction removes the
defect the workaround exists for**, and the docstring now says so in the right tense: the tie is
described as HISTORICAL, the `floor(x + 0.5)` form is **kept** (still the correct JS mirror at any
other fps), and its stale `read-pellets.ts:505` anchor was replaced with a line-number-free citation
so it cannot rot again.

##### §29D — ⚑ TWO PLAN ERRORS, both caught downstream of me, both recorded

1. **The gate's demand for a STATED repo-wide grep found a site the plan had missed** —
   `score-pellets.py:246`/`:377` pass `--max-pellet-frames 13` explicitly. The first draft's
   completeness rested on an unstated search. Landed as edit E with its own measured exposure (all
   four `score-pellets.py` arms pass at 14 — they replay committed slices rather than re-invoking
   the counter).
2. ⚑ **The IMPLEMENTER correctly refused edit C's `make-synthetic-pellets.py` citation, and it was
   right to.** That file does not carry a comment mirroring the derivation — it carries a real
   **13-frame generator**: `range(1, 14)`, with `_size_mult`/`_alpha` defining an f1→f13 curve
   (f1 = 1×, peak 2× held at f3–4, shrink to 1× by f11, fade over f12–13). Editing the prose to say
   "14" without a 14-frame curve would have made the comment describe code that does not exist.
   **Left untouched, deliberately.** ⇒ **NEW OPEN ITEM:** the synthetic pellet generator still
   renders **13**-frame lifecycles against a now-**14**-frame spec. Fixing it needs the owner's
   f1…f14 qualitative table (or an explicitly-labelled interpolation), not a number swap — and the
   script's own docstring already warns its curve is "a modeling choice, not a second data point
   corroborating the spec."

⛔ **Nothing re-dumped or re-extracted.** Existing dumps keep the `max_pellet_frames` they were made
with; this changes what FUTURE runs derive. ⛔ `MARKER_MIN`, `debounce_shots`, `band_hi`,
`REP_OWNER_LIFE_LO_60FPS` and every other constant are untouched, and no verdict is stamped on the
cold bias or on §27/§28.

#### §29E — THE SYNTHETIC GENERATOR IS ON THE 14-FRAME LIFECYCLE (closes §29D's open item)

**2026-08-05, OWNER-CLARIFIED:** _"the lifecycle is the same, it just has one additional frame at
the end."_ That is the spec §29D was blocked on — the qualitative table is unchanged and the **fade
phase** gains a frame (f12–13 → **f12–14**).

⚑ **The added frame is a FADE frame, so the SIZE curve needed no change at all** — `lifecycle_scale`
already returns 1× for every offset past f11, which is exactly what a fourth… third fade frame
requires. Only the alpha ramp and the loop bound moved.

##### The alpha ramp is now a FORMULA, and it re-derives the values it replaced

The previous fade was two hardcoded literals, `0.66` and `0.33`. Those turn out to be 2 dp roundings
of **2/3 and 1/3** — a linear ramp toward, but not to, zero, evaluated over **2** fade frames. The
same rule over **3** fade frames gives **0.75 / 0.50 / 0.25**.

⇒ Extending the lifetime is therefore the SAME rule applied to one more frame, **not a new modeling
invention** — and that is a checked claim, not an assertion: the selftest re-derives the old
`0.67 / 0.33` from the formula at `n_fade = 2`. Replacing the literals with the formula also means a
future lifetime change cannot silently leave the fade stale.

| offset | f1  | f2   | f3  | f4  | f5–f10   | f11 | f12  | f13  | f14  |
| ------ | --- | ---- | --- | --- | -------- | --- | ---- | ---- | ---- |
| size   | 1×  | 1.5× | 2×  | 2×  | linear ↓ | 1×  | 1×   | 1×   | 1×   |
| alpha  | 1.0 | 1.0  | 1.0 | 1.0 | 1.0      | 1.0 | 0.75 | 0.50 | 0.25 |

##### Blast radius — MEASURED

`pellet-selftest.sh` **all 27 arms pass, zero fixtures moved**, `verify.sh` green. The committed
synthetic fixtures replay stored slices rather than re-invoking the generator, so this reaches
**future synthetic generation only** — the same "new extractions only" shape as §16/§23/§26.

⚑ **`score_sequence` needed no functional change**: it derives its offset range from
`len(seq['frames'])`, not a hardcoded 13, so it scores a 14-frame sequence correctly as-is. Its
docstring said `(1..13)` and was corrected to name the derivation instead of a number.

##### Pinned, so the shape cannot drift

`make-synthetic-pellets.py --audit-selftest` now asserts seven lifecycle properties alongside its
existing union-counting arithmetic: the 14-frame lifetime, the unchanged size shape (f1 = 1×, f3–4
peak 2×, f11 back to 1×), size 1× on every fade frame, f1–f11 fully opaque, a strictly-decreasing
fade that never reaches zero, the f12–14 values, **and the rule-continuity check that re-derives the
old 13-frame fade.** A future lifetime edit that changes the SHAPE rather than just the LENGTH now
fails here instead of silently producing wrong synthetics.

##### Scope

Two dated docstrings in `analyze-pellet-tracks.py` (2026-07-31 Phase-2 provenance) stated the
13-frame spec as current fact. They were **annotated, not rewritten** — the dated rationale is
preserved and marked `then-13-frame … OWNER-CORRECTED to 14 on 2026-08-05`, so the historical record
stays intact while the stale live claim does not.

⛔ No gate was run for this one and that is a deliberate, stated choice: this is a synthetic-fixture
GENERATOR, which the SUFFICIENCY rule puts outside the `/scientific-method` surface — `verify.sh`
plus the existing fixtures are its gate, and both are green with zero fixtures moved. The two
production-touching landings today (§26, §29) did go through the cross-family gate.

#### §30 THE `band_hi` LANDING, OUT OF SAMPLE ON THE PRODUCTION PATH — +0.50 pellets/shot over 815 shots, and RE-EXTRACTION TURNS OUT NOT TO BE NEEDED

**2026-08-05.** Executes §8 item 7 of the 08-04 session handoff — "re-extraction, the gate on
everything above" — and finds that the expensive half of it was never required.

##### §30A — ⚑ THE RE-EXTRACTION IS UNNECESSARY FOR THE MEASUREMENT IT WAS GATING

Item 7 called for re-running the production path (`read-pellets.ts`: ffmpeg extraction + timer VLM +
counter, ~8–9 min × 5 dumps, and a live VLM server) so that today's landings would reach the
measurements. **They already do.** Verified by code path, not assumed:

- `--dump-tracks` writes `frame_counts` as **`results[i]["opencv"]`**, and `--temporal`'s stdout —
  the thing `read-pellets.ts` parses and hands to `debounceShots` — prints that **same `results`
  list** (`count-pellets.py:1963`).
- Production runs `--backend opencv` with the other backends zero-filled, and since §24's selector
  fix the passenger channels (`marker`, `band`) resolve to opencv's real values rather than to
  array order.

⇒ **A schemafix dump's `frame_counts` ARE the per-frame values production's estimator consumes.**
Running `debounce_shots` on them **is** the production path — no ffmpeg, no VLM, nothing
re-extracted. The four `*-schemafix` dumps (§26/§27, each reproducing its original's
`white`/`red`/`marker` **and** `cross_positions` with zero diffs) already carry `--band-hi 10`,
which is exactly what `read-pellets.ts` derives at 30 fps.

⚑ **Reuse-before-derive, in the shape the SUFFICIENCY rule names:** the artifact needed to answer
the question already existed. The cost quoted in item 7 was for regenerating `pellets.json` files,
which is a **different** deliverable from making the measurements current — and no open item needs
those files.

##### §30B — What §19 could not do, and this does

§19 measured the landed `band_hi` on the production path at **+0.60 pellets/shot** — but on **5
shots, one clip**, and **§19D says so itself**: the recovered pellets are among the five that
generated the cap hypothesis, so "the fix recovers them" is close to tautological on that footage.
The out-of-sample evidence was §14's ceiling and corridor gates, which are **per-EVENT** and
label-free — a different basis from the per-SHOT production gain.

**This is that gain, out of sample, on every shot of four dumps that had no part in generating the
hypothesis:**

| dump (unit)                          | shots   | shots moved | Σδ       | **δ / shot** | avgTotal control → landed |
| ------------------------------------ | ------- | ----------- | -------- | ------------ | ------------------------- |
| `h4-marciana-schemafix` (`marciana`) | 218     | 102         | +117     | **+0.5367**  | 6.8187 → 7.2514           |
| `h4-isabel-schemafix` (`isabel`)     | 203     | 75          | +86      | **+0.4236**  | 6.9195 → 7.2675           |
| `h4-guilty-schemafix` (`guilty`)     | 180     | 75          | +81      | **+0.4500**  | 6.7413 → 6.8954           |
| `g2-noir-schemafix` (`noir`)         | 214     | 99          | +123     | **+0.5748**  | 6.9545 → 7.3952           |
| **pooled**                           | **815** | **351**     | **+407** | **+0.4994**  | valid shots 617 → 652     |

⇒ **+0.4994/shot out-of-sample against §19's +0.60 in-sample**, with a tight per-unit range
(+0.42 … +0.57) across four units. The in-sample figure was **not** an artifact of the footage it
was fitted on.

##### §30C — ⛔ WHAT THIS DOES NOT SHOW, and the basis trap it sits next to

- ⛔ **It measures what the landing MOVED, not that it moved toward TRUTH.** There is no owner
  reference on these dumps. §19 could score against the confirmed 8.40; this cannot. A +0.50/shot
  warm shift is an improvement only if the reader was cold by at least that much — which §19's
  post-landing **−1.40/shot** residual supports, but on one clip.
- ⛔ **DO NOT compare the `avgTotal` column to 8.40.** `avgTotal` is pooled over the
  `[min_pellets, max_pellets]` VALID subset; 8.40 is a per-SHOT owner count on the labelled clip's
  f8–11 window. **Different bases** — the §4 trap, which §27C already hit once in this session.
  The columns are there to show the direction and rough scale, nothing more.
- The A/B's validity precondition is the arm's **reconstruction control: 0 mismatched frames on all
  four dumps** — recomputing the band at each dump's OWN `band_hi` reproduces its stored series
  exactly. Without that, the recomputed control arm would be measuring the recomputation.
- Segmentation invariance is **asserted, not assumed**: `debounce_shots` segments on `white + red`,
  which this A/B never touches, and the arm raises if the shot count moves.

##### §30D — Instrument and reproduction

New arm (constraint 9: extend, don't fork): `analyze-pellet-tracks.py --band-production-ab`, wired
into `scripts/probe/pellet-selftest.sh` (now **28 arms**; `verify.sh` green). It **REFUSES** a dump
lacking per-frame `reds` or lacking `band` — the `band` branch tests `not is_red` **per frame**, so
a pre-§26 dump inherits §25's mislabel on exactly this channel (§26C measured 13 divergent band
frames from it, going to 0 once `reds` existed).

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
S=/Users/maxwellsutton/nikke-sim/scratchpad/pellets
$PY scripts/probe/analyze-pellet-tracks.py --band-production-ab \
  $S/{h4-marciana,h4-isabel,h4-guilty,g2-noir}-schemafix/tracks.json
$PY scripts/probe/analyze-pellet-tracks.py --band-production-selftest
```

⚑ **This arm's fixture pins RESULTS, not a replay slice, and its selftest says so.** `band_ids` is a
lifetime property of the FULL track list, so a frame-window slice would silently change which
tracks are admitted — the honest fixture is the committed numbers plus coherence checks
(pooled = Σ per-dump, `delta_per_shot` = Σδ / n, each `delta_hist` sums to its shot count, the
reconstruction control is 0, the landing widened every band, and the A/B is non-vacuous). It does
**not** re-derive the numbers, and the selftest prints that limitation rather than implying a replay.

**RECORDS a measurement. NOTHING ENACTS.** `band_hi`, `debounce_shots`, `read-pellets.ts` and every
constant are UNCHANGED; no existing fixture moved. ⛔ Still open and untouched here: netting §28C's
cold ceiling-exclusion channel against §27's warm false-flag channel.

#### §31 THE TWO MARKER CHANNELS, NETTED — the cold one is ~NIL, so the marker thread nets to −0.043 pellets/shot

**2026-08-05.** Closes the last open marker thread. §27 and §28C found channels of **opposite sign**
in the same `marker` series and neither was ever netted against the other.

##### §31A — Pre-declared before scoring

⚑ **The cold channel will add FAR fewer core flags than its 164-track count**, because
`MARKER_MIN = 2` needs two admitted tracks **concurrent in one event**. ⚑ **The NET SIGN is not
predictable in advance** — that is the point of the measurement. Both statements are recorded here
as they were made, before the numbers existed.

⚑ **The recovery ceiling is not invented.** The owner measured (§28) that the hit-marker VFX and
the pellet VFX have the **same** 14-native-frame duration, and `band_hi` is the already-landed,
already-gated ceiling for a 14-frame VFX's lifetime band (§14's out-of-sample ceiling + corridor
gates, landed §16) — **10 at 30 fps** against a nominal 7. Reusing it applies a **validated** bound
to a same-duration VFX rather than fitting a new one. An **unbounded** arm is reported alongside as
the strict upper bound.

##### §31B — The result, 815 shots / 4 units

| configuration                  | core flags | Δcore   | Δpellets | **Δ/shot**  |
| ------------------------------ | ---------- | ------- | -------- | ----------- |
| shipped                        | 180        | 0       | 0        | 0.0000      |
| **WARM removed** (§27 C1)      | 141        | **−39** | −39      | **−0.0479** |
| **COLD recovered** (`band_hi`) | 182        | **+2**  | +2       | **+0.0025** |
| **NET (both)**                 | **145**    | **−35** | **−35**  | **−0.0429** |
| COLD recovered (unbounded)     | 183        | +3      | +3       | +0.0037     |
| NET (both, unbounded)          | 146        | −34     | −34      | −0.0417     |

⇒ **§28C's cold channel is ~NIL at the event level: 164 excluded tracks yield only 2 additional core
flags (3 unbounded).** The pre-declared reason is the right one — `MARKER_MIN = 2` requires two
admitted tracks concurrent in one event, and the excluded tracks are overwhelmingly isolated or sit
in events already flagged.

⇒ ⚑ **The netting does NOT change the picture: the net is −0.0429/shot, 90% of the warm channel
alone.** §28C does not offset §27.

##### §31C — ⚑ The conclusion is ROBUST to the ceiling choice

`band_hi = 10` and **unbounded** differ by a **single** core flag across 815 shots. So the one
judgment call in this measurement — which ceiling to recover at — is **not load-bearing**: any
ceiling from 10 to infinity gives the same answer. That is a stronger result than picking a defensible
value and hoping, and it removes the obvious way this measurement could have been fitted.

##### §31D — What the marker thread nets to, end to end

- The marker channel's total effect on the pellet count, if both fixes landed, is **−0.043
  pellets/shot** — about **3%** of §19's **−1.40/shot** cold residual, and in the **cold**
  direction, so it makes that residual marginally **worse**.
- ⇒ **The marker thread is a faithfulness fix and explains NONE of the cold bias.** That was §27C's
  reading on the warm channel alone; netting the cold channel in does not rescue it.
- ⛔ **§28B's bracket still stands** and is not narrowed here: C1 over-drops (≈19% of the life-1
  population it removes is fragment-like) and under-drops (`MOVING` + `UNDECIDABLE` all kept). This
  section nets the two CHANNELS; it does not re-litigate C1's internal accuracy.
- The validity precondition is the arm's **reconstruction control: 0 mismatched frames on all four
  dumps** — the shipped configuration reproduces each dump's own stored `marker` exactly. Segmentation
  invariance is asserted, not assumed.

##### §31E — Instrument and reproduction

New arm (constraint 9): `analyze-pellet-tracks.py --marker-net`, wired into
`scripts/probe/pellet-selftest.sh` (now **29 arms**; `verify.sh` green). `_ms_classify` gained an
optional `ceiling` parameter whose **default reproduces the shipped `is_pellet` gate exactly**, so
§27's committed fixture is untouched and still passes.

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
S=/Users/maxwellsutton/nikke-sim/scratchpad/pellets
$PY scripts/probe/analyze-pellet-tracks.py --marker-net \
  $S/{h4-marciana,h4-isabel,h4-guilty,g2-noir}-schemafix/tracks.json
$PY scripts/probe/analyze-pellet-tracks.py --marker-net-selftest
```

⚑ Like `--band-production-ab`, this fixture pins **RESULTS, not a replay slice** — the lifetime
ceiling is a property of the FULL track list, so a frame-window slice would silently change which
tracks are admitted. The selftest asserts coherence plus the properties the conclusion rests on (the
two channels have opposite sign; unbounded ≥ `band_hi`; the net is neither channel alone; the
shipped arm is the zero point) and **prints that it does not re-derive** the numbers.

**RECORDS a measurement. NOTHING ENACTS.** `MARKER_MIN`, `debounce_shots`, `max_pellet_frames`,
`band_hi` and every constant are UNCHANGED; no existing fixture moved.

#### §32 §8 ITEM 1 CANNOT RUN — the owner's adjudication answers were never persisted; both prerequisites now fixed

**2026-08-05.** §8 item 1 — "size the both-wrong population (§22D), the live thread on the cold
read" — **cannot be executed**, and the reason is a record-keeping failure rather than a
methodological one. Both of its prerequisites are fixed here so the next attempt is productive.

##### §32A — What item 1 actually asks, corrected

⚑ The item's own phrasing is misleading and is corrected here: **the RATE is already SETTLED.**
§22E stamps "20% of flagged shots have both locks wrong" as settled (4 of 20, from a seeded random
sample). What is unmeasured is the **COST** on those cases — §22D: where both locks are wrong,
template is not a valid reference, so the loss is unmeasurable and the severity estimate is biased
toward zero.

⇒ Item 1 is a **cost** question about a specific 4 cases, not a **rate** question.

##### §32B — ⛔ THOSE 4 CASES CAN NO LONGER BE IDENTIFIED

The 24-case selection **regenerates byte-identically from its seed** (`_la_select`, seed `20260804`)
— but the owner's **verdicts** were never written to the tree. `--lock-adjudication` wrote only
`ANSWER-KEY.json`, into an ephemeral output directory, and the answers themselves lived in session
chat. What survives in `docs/probe-runs.md` is §22B's **aggregate** split (6 structural / 10
template / 4 neither) and §22C's severity **multiset**.

**Recovery was attempted before declaring this blocked** (derive-before-declaring-blocked), and
fails for a structural reason:

- Matching §22C's multiset `[−7, −1, 0, 0, 0, 0, 0, 1, 2, 2]` against per-case Δcounts would
  identify the **10 template-right** cases.
- That leaves **10 of the 20** mislocked cases, splitting **6 structural-right / 4 neither**.
- **Nothing recorded distinguishes those two groups.** Severity is undefined for BOTH — a
  structural-right case has no loss to record, and a `neither` case has no valid reference — so the
  one surviving per-case quantity cannot separate them.

⇒ **The 4 `neither` identities are unrecoverable.** Item 1 needs a fresh adjudication.

⚑ **This is trap 6's pattern claiming a second victim.** The 08-04 session lost four cross-family
gate packets to a gitignored scratchpad; the same session's owner adjudication answers were never
committed at all. The lesson generalizes past gate packets: **an owner's answers are primary
evidence and belong in the tree at the moment they arrive**, not in the doc that summarizes them.

##### §32C — Prerequisite 1 FIXED: the crop defect the owner flagged (§22F)

§22F recorded the owner's complaint on case 9: _"b shows the right half of the crosshair, the left
bound of the image bisects the crosshair."_

The renderer **shifted** the window back inside the frame — which **cannot help when the marked
position is itself within `half` of a frame edge**. The ring then lands on the crop boundary with no
context on that side, which is exactly what the owner hit. It now **PADS**: the crop is always
`2 × half` centred on the position, with out-of-frame area filled a flat mid-grey no game frame
produces, so an adjudicator reads it as "outside the capture" rather than as dark game content.

**Verified on the failing geometry**: a marker 5 px from a frame's left edge now lands exactly at
the crop centre, with pad-grey to its left and real frame content to its right. ⚑ Side benefit: the
marked position is now centred on **every** case, which removes centring as a possible blinding cue.

##### §32D — Prerequisite 2 FIXED: answers are now persisted by construction

- `--lock-adjudication` now also writes **`ANSWERS.json`** — an order-matched, pre-filled template
  (one `{case, verdict: null}` per case) whose `_README` says plainly that it must be committed and
  that `ANSWER-KEY.json` alone cannot reconstruct the verdicts.
- **`INDEX.md` now offers `neither` and `both` explicitly.** The 08-04 format offered only
  `A` / `B` / `?`, and the owner had to **volunteer** both — `neither` then turned out to be **20%**
  of flagged shots, a category the two-mode comparison structurally cannot name. Offering only the
  two modes under test is a leading question; this fixes that.
- New arm **`--lock-adjudication-score`** joins a filled `ANSWERS.json` against its key and
  reproduces §22B's split and §22C's severity **from committed data**. It refuses on a seed
  mismatch, and it **reproduces §22D's exclusion structurally**: severity is computed only on
  template-right cases, and `neither` cases are counted and reported but never folded into the mean.

##### §32E — What would unblock item 1, stated so the ask is decidable

A fresh adjudication set (24 cases, ~the same owner effort as 08-04) with `ANSWERS.json` filled and
**committed**. That yields the `neither` cases' identities, and their production counts follow from
the dumps.

⚠ **Even then, the COST on those cases needs a third reference** — by construction neither lock is
valid there. Options, neither taken here: an owner mark of the true crosshair position on those
cases, or an independent CV estimator. ⛔ **The obvious CV route — centring on the detected pellet
cloud — is CIRCULAR for this question**: choosing the window that maximises pellets in it and then
counting pellets in that window is biased high by construction. It can bound the loss from above; it
cannot measure it. **Recorded so a later session does not build it as though it were a reference.**

##### §32F — Instrument

`analyze-pellet-tracks.py --lock-adjudication` (crop padding + `ANSWERS.json` + the expanded
`INDEX.md`) and the new `--lock-adjudication-score`, self-validated on synthetic data (the real
answers are lost, so there is no pair to replay) pinning the letter→lock join **including
per-case swapped letters**, the control exclusion, the severity arithmetic, and §22D's `neither`
exclusion. `pellet-selftest.sh` is now **30 arms**; `verify.sh` green.

**RECORDS a blocker + fixes its two prerequisites. NOTHING ELSE ENACTS.** No constant, threshold,
localizer or default changed; no existing fixture moved; §22's published numbers are untouched.

#### §33 THE STRUCTURAL LOCALIZER EMITS OUT-OF-FRAME CROSSHAIRS — 0.43%, always off the RIGHT edge

**2026-08-05.** Found while verifying §32C's crop fix against the real adjudication set — a
whole-picture check on a rendering detail, not a planned measurement.

##### §33A — The measurement

| dump (unit)                           | frame    | locked frames | out of frame | rate      | x range of bad |
| ------------------------------------- | -------- | ------------- | ------------ | --------- | -------------- |
| `h4-marciana-structural` (`marciana`) | 2604×792 | 5473          | 0            | 0.0%      | —              |
| `h4-isabel-structural` (`isabel`)     | 2604×792 | 5601          | 35           | 0.6%      | 2627…2744      |
| `h4-guilty-structural` (`guilty`)     | 2604×792 | 5614          | 56           | 1.0%      | 2606…2690      |
| `g2-noir-structural` (`noir`)         | 2604×792 | 5508          | 4            | 0.1%      | 2608…2652      |
| **pooled**                            |          | **22,196**    | **95**       | **0.43%** |                |

⚑ **Every one is off the RIGHT edge** — `x` from 2606 to 2744 against `w = 2604`. None is negative,
none is out vertically. Consistent with the structural localizer's construction: it finds the ammo
badge and adds a fixed `struct_offset_x` (162 at zoom 2), so a badge detected near the right edge
puts the derived crosshair past the frame.

##### §33B — This is a different failure from a mislock, and no prior section names it

A mislock is a **wrong but plausible** position — some other screen element. An out-of-frame position
is **definitively invalid**: there is no pixel there. §20's detector sees only structural-vs-template
DISAGREEMENT, so these frames enter the "mislocked" population indistinguishably from a lock that
merely landed on a damage number. **§20/§22's populations therefore contain a sub-category that is
mechanically decidable and was never separated out.**

⚑ Its counting effect is one-sided: a window centred off-frame can only lose pellets (part or all of
the `pellet_radius` disc has no pixels), so it can under-count but never over-count. ⛔ **Not scored
here** — 0.43% of FRAMES is not 0.43% of shots, and the per-shot effect depends on how many of a
shot's counting frames are affected. Sizing it is its own pass.

##### §33C — What it changed about the adjudication set

Two of the 24 regenerated cases (`case_07`, `case_15`) carry an out-of-frame **structural** marker
(x = 2606 and 2735). ⚑ **Under the OLD renderer those markers fell OUTSIDE their own crop** — at
`px` = 604 and 862 in a 600 px-wide crop — so the owner was shown a panel with **no visible ring at
all** and asked which marker is the crosshair. That is very likely the real shape of §22F's
complaint, which was recorded as a bisected crosshair.

Under the §32C padding fix both are centred, with the out-of-frame region flat grey. `INDEX.md` now
states plainly that a mostly-grey panel means that lock is off-screen and definitively wrong, so
those two cases are answered consistently instead of puzzled over. ⚑ They are **decidable by
construction**, not judgement calls — flagged so the resulting verdict split is read accordingly.

##### §33D — Reproduction

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
# per dump: compare every non-null cross_positions entry against the frame's own dimensions
```

⛔ **RECORDS a defect. NOTHING ENACTED.** The localizer is unchanged — no clamp, no reject, no
retune. Whether an out-of-frame lock should be clamped, dropped, or treated as an abstention is a
design question with its own blast radius, and it is **not** answered here.

#### §34 §8 ITEM 1 IS ANSWERED — the both-wrong cases are identified, and they are NOT the worst

**2026-08-05, OWNER-ADJUDICATED.** The re-run §32 called for. Answers are **COMMITTED** at
`docs/probe-data/lock-adjudication-2026-08-05-ANSWERS.json` (+ `-KEY.json`) — the durable record
whose absence blocked this item.

##### §34A — ⚑ THE VOCABULARY WAS TOO NARROW A SECOND TIME

08-04 offered `A`/`B`/`?` and the owner volunteered **`both`** and **`neither`**. §32D added those.
08-05 the owner volunteered a **third** category the format still lacked:

> _"a but slightly off, b is a total miss though"_ — on **6 of 20** mislocked cases.

Recorded as first-class `A_imprecise` / `B_imprecise` with the owner's exact wording preserved in
`verdict_verbatim`, **not coerced** — coercion is precisely how the 08-04 `neither` category nearly
went unnamed. ⚑ **All 6 named TEMPLATE as the approximately-right lock**, i.e. the "total miss" was
**always structural**, the production lock.

Scored under **two** readings, both reported rather than one chosen: `strict` (own category,
excluded from severity) and `lenient` (mapped to the plain letter).

##### §34B — ⚑ §22 REPLICATES, INDEPENDENTLY

| quantity                           | §22 (08-04)                         | this run (08-05)                                |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------- |
| structural right                   | 6                                   | **6**                                           |
| **production lock BAD**            | **14/20 = 70%**                     | **14/20 = 70%** — identical under BOTH readings |
| severity multiset (template-right) | `[−7, −1, 0, 0, 0, 0, 0, 1, 2, 2]`  | `[−7, −1, 0, 0, 0, 0, 0, 1, 2]`                 |
| controls: 3 smallest disagreements | answered `both` (1, 4, 8 px)        | answered `both` (1.4, 3.6, 7.7 px)              |
| control: the distinguishable one   | answered, identified **structural** | 97.6 px, answered, identified **structural**    |

⚑ The severity multiset is §22C's **minus exactly one `+2`** — precisely what one case moving
template-right → `neither` produces. ⚑ The control behaviour reproduces case for case. Two
adjudications, ~a day apart, agree on the headline to the digit. ⛔ **Not fully independent** — same
seed, same 24 images, and the owner had seen them before, so recall may contribute. The replication
is strong evidence of consistency, weaker evidence of accuracy.

##### §34C — THE ANSWER: the both-wrong population is NOT the worst

§22D's stated worry was that the `neither` cases are _"probably the worst"_ and that excluding them
biases severity toward zero. **Now that they are identified, that is testable on production counts:**

| case      | dump (unit)                           | t0   | disp    | production counted |
| --------- | ------------------------------------- | ---- | ------- | ------------------ |
| `case_04` | `h4-marciana-structural` (`marciana`) | 2467 | 236.5px | 7                  |
| `case_09` | `h4-isabel-structural` (`isabel`)     | 2505 | 357.4px | 5                  |
| `case_17` | `h4-marciana-structural` (`marciana`) | 1776 | 506.8px | 2                  |
| `case_18` | `h4-isabel-structural` (`isabel`)     | 4828 | 418.2px | 5                  |
| `case_24` | `h4-isabel-structural` (`isabel`)     | 1300 | 446.1px | 6                  |

| population             | n   | mean production count | sd   | SE   |
| ---------------------- | --- | --------------------- | ---- | ---- |
| both-wrong (`neither`) | 5   | **5.00**              | 1.87 | 0.84 |
| other mislocked        | 15  | **5.73**              | 3.13 | 0.81 |
| **difference**         |     | **−0.73 ± 1.16**      |      |      |

⇒ **INDISTINGUISHABLE FROM ZERO at 2 SE. §22D's "probably the worst" is NOT supported.** The
both-wrong cases count _slightly_ lower, by well under the noise §21 already measured (0.706) — and
if their windows were catastrophically off-target they would count ~0, not 5.00.

##### §34D — ⛔ What this still does not measure, and the base trap

- ⛔ **This compares production COUNTS, not LOSSES.** By construction neither lock is a valid
  reference on these cases, so the true count is unknown and the _loss_ remains unmeasured. What is
  now established is that the population is **not an outlier** — which is what §22D's bias argument
  actually rested on.
- ⛔ **Do NOT difference these against 8.40.** That reference is the owner's f8–11 window count on
  the labelled `marciana` clip, not on these production dumps — **different bases**, the trap §4
  names and §27C/§30C each hit once.
- n = 5. `case_17`'s template arm has **no matched event at all** (`total_tmpl` is null), so it is
  unpairable by construction, not merely unmeasured.

##### §34E — Where this leaves the mislock channel

✅ The production lock is bad on **70%** of detected-mislocked shots ⇒ **≈11.8% of all production
shots** (§22B's arithmetic, now replicated).
✅ The both-wrong subpopulation is **identified and sized** and is **not** worse than the rest.
⇒ ⚑ **§22D's caveat is DISCHARGED**: §22C's severity, ~0, is no longer known to be biased toward
zero by an excluded worst-case population. **Combined with §22C, the bad-lock channel is measured at
~0 pellets/shot and no longer has an unexamined reservoir behind it.**
⛔ **The cold bias is still NOT explained.** Removing mislocks as a candidate does not identify a
cause; it closes a candidate.

**RECORDS an owner adjudication + a measurement. NOTHING ENACTED** — no localizer retune, no
constant, no threshold, no default; `--lock-adjudication-imprecise` defaults to `strict` and changes
no committed number.

#### §35 THE RADIUS GATE — ⚑ THE PRE-COMMITTED BAND FIRED AND AN INDEPENDENT CHECK OVERTURNED IT

> ⛔ **JUDGED 2026-08-06 — §35D/E PARTIALLY SUPERSEDED; read
> [`docs/handoffs/closed/2026-08-06-radius-gate-JUDGE-verdict.md`](handoffs/closed/2026-08-06-radius-gate-JUDGE-verdict.md)
> before quoting anything below.** §35A–C stand (the `T = 1.043` contamination finding and its
> method lesson are correct and independently re-derived). **§35D's ≈0.45 pellets/shot and §35E's
> "largest single channel yet identified" / "the cloud ends at ~167 px, not a badly-placed cut" do
> NOT stand:** the 9 instances are **2 distinct pellets in shot 1 + 1 borderline in shot 5** out of
> 42 distinct pellets (the 168 are 4× pseudo-replicated), and the **2026-08-01 counting-window
> sweep** in this same document already read the same 9 marks as **H_centre** (a mis-centred window)
> rather than H_radius, with `--representative-audit` agreeing from a third angle. §35 cites neither.

**2026-08-05.** Executes `docs/handoffs/closed/2026-08-05-radius-gate-PRECOMMIT.md`, whose rule and
controls were committed at **`57c1de78` before any number existed**. Chases the only channel any
measurement had ever named as carrying §19's −1.40/shot (§19C), the mislock half having closed at
≈0 (§22C, §34).

##### §35A — What the profile shows

Pellet-attributable (shot-frame minus quiet-frame) in-band white tracks per shot, by 20 px annulus,
at each shot's representative frame — 815 shots / 4 units, gate at 160 px:

| r (px)   | 60–80 | 80–100 | 100–120 | 120–140 | 140–160 | **160–180** | 180–200 | 200–220 | 220–400         |
| -------- | ----- | ------ | ------- | ------- | ------- | ----------- | ------- | ------- | --------------- |
| per shot | 0.691 | 0.886  | 1.245   | 1.227   | 1.220   | **0.638**   | 0.229   | 0.176   | ~0.09–0.15 each |

`T` (160–220 px) = **1.043/shot**; density at the gate is **51%** of the in-gate peak. Both
falsification controls PASS (clutter share **2.4%**, in-gate peak > at-gate).

⇒ **The pre-committed band's top row fires: "THE GATE IS CUTTING THE CLOUD."** ⛔ **And that verdict
is WRONG.**

##### §35B — ⚑ THE INDEPENDENT CHECK THAT OVERTURNS IT

`groundtruth-f8-11-positions.json` holds **OWNER-MARKED pellet positions** in 368×368 crops centred
on the crosshair — **crop radius 184 px, so it can see past the 160 px gate.** Its labels were made
long before this arm existed. Radial distribution of all **168** labelled pellet instances:

| r (px) | 0–20 | 20–40 | 40–60 | 60–80 | 80–100 | 100–120 | 120–140 | 140–160 | **160–180** | **>180** |
| ------ | ---- | ----- | ----- | ----- | ------ | ------- | ------- | ------- | ----------- | -------- |
| n      | 2    | 6     | 15    | 35    | 14     | 34      | 35      | 18      | **9**       | **0**    |

**Max labelled radius 166.8 px. ZERO labelled pellets beyond 180 px.** The owner could have marked
out to ~184 and did not, so the absence is informative rather than a crop artifact.

⇒ **The difference profile's 0.229 + 0.176/shot at 180–220, and its entire 0.09–0.15/shot tail out
to 400 px, are NOT PELLETS.** `T = 1.043` is **contaminated and must not be quoted**.

##### §35C — Why the pre-commit's own control was insufficient

§2.2's quiet-frame control removes **static** clutter — and it does that well (clutter share 2.4%).
It **cannot** remove **shot-correlated non-pellet material**: muzzle/impact VFX, debris and smoke
that appear only near a shot and survive the `[4, 10]` lifetime band. Subtracting quiet frames
leaves all of it in the "pellet-attributable" difference.

⚑ **The pre-commit was written by the same reasoning that then mis-read the result, and its control
did not cover the confound that mattered.** What caught it was an EXISTING LABELLED ARTIFACT used as
an independent method — the SUFFICIENCY rule's route, not a new derivation.

##### §35D — What the gate actually costs, on the evidence that survives

From the owner labels: **9 of 168 pellet instances (5.36%)** sit at or beyond 160 px. Against the
owner-confirmed **8.40** landed pellets/shot on that clip:

> **≈ 0.45 pellets/shot lost to the radius gate** — about **32%** of §19's −1.40/shot residual.

⛔ **Caveats that ride with it:** n = **5 shots, one clip** (`marciana`, SG/Iron) — the same
in-sample limitation §19D flagged, and these are the labels the reader was tuned against. The 815-shot
profile cannot corroborate it, because §35B is exactly the finding that the 815-shot profile is not
pellet-attributable out there. **This is a bound from labels, not a production measurement.**

##### §35E — Verdict

⚑ **The radius gate is a REAL cold channel and the largest single one yet identified — ≈0.45/shot,
~32% of the residual — but it is NOT the 1.04/shot the profile appeared to show, and it does not
explain the −1.40 on its own.**

⛔ **NOTHING ENACTED. `pellet_radius` is unchanged**, per the pre-commit's §5: widening the gate to
recover pellets would be a **fudge**, because the accuracy-circle geometry is owner-ruled ground
truth that measures the mechanic directly. ⚑ **And the labels say the gate is very nearly right** —
the cloud ends at ~167 px against a 160 px gate, a ~7 px shortfall, not a badly-placed cut. Whether
that 7 px is real or is crosshair-localization error is the next question, and it is the owner's call
whether it is worth chasing.

##### §35F — Instrument

`analyze-pellet-tracks.py --radius-gate`, wired into `scripts/probe/pellet-selftest.sh` (now **31
arms**; `verify.sh` green). It prints the contaminated `T` **and** the owner-label check **and** the
plain statement that the former is contaminated — deliberately, so the number cannot be quoted
without its refutation attached.

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
S=/Users/maxwellsutton/nikke-sim/scratchpad/pellets
$PY scripts/probe/analyze-pellet-tracks.py --radius-gate \
  $S/{h4-marciana,h4-isabel,h4-guilty,g2-noir}-schemafix/tracks.json
```

#### §36 THE COMPOSITION AUDIT — ⛔ VOID: `--representative-audit` CANNOT SCORE THE SHIPPED PATH, AND ITS OWN CONTROL SAYS SO

> ⛔ **RESOLVED 2026-08-06 by §37 — the instrument was fixed, and the composition hypothesis this
> section raises was then ANSWERED AGAINST it: the shipped reader's count IS mostly made of pellets
> (31 of 35, not 12 of 35).** §36C's `12 / 35` describes the **LEGACY channel only** and must never
> be quoted as a property of the shipped reader. §36D's structural finding stands — it is precisely
> what §37 fixed.

**2026-08-06.** Executes `docs/handoffs/closed/2026-08-06-composition-audit-PRECOMMIT.md`, committed at
`7bbdd3ed` **before any number existed**. Chases the defect surfaced by
`docs/handoffs/closed/2026-08-06-radius-gate-JUDGE-verdict.md` §4: `representative-audit-slice.json` reports
**`rep_owner` 12 / `rep_non_owner` 23 / `reader_white` 35 against `owner` 42**, with three of five
shots counting ZERO owner pellets while still landing near the true total.

##### §36A — The pre-commit's CONTROL CHANNEL FIRED, and wider than it was written

The rule reserved judgment on `life_gate_rejected` pending a blind check of which track population
the shipped count is built from. That check returned **DIFFERENT CHANNEL**, and the divergence is
not confined to the life gate — **the whole arm is pre-hybrid, three ways over**:

1. `_rep_decompose`'s life gate reads `is_pellet`, which `count-pellets.py:1887` sets as
   `life <= max_pellet_frames`. **`band_hi` gates a different population (`band_ids`).**
2. `reader_white` and the representative frame come from `_merge_events`
   (`analyze-pellet-tracks.py:2840`) — the **median-of-`white+red`** frame, i.e. `pellet_ids`.
   The shipped path (`read-pellets.ts:431-447`) instead overwrites `repFrame`/`white` with the
   **`band` count on the band plateau frame** whenever a band plateau exists.
3. `_rep_slim_labelled:3933` writes 3-wide `[white, red, marker]` rows, so `_expand_frame_counts_row`
   omits the key and `has_band` is **false by construction** — the labelled block cannot carry a band
   series even in principle. (§23C already listed this builder among the readers that "can never emit
   `band`"; nothing connected that to the arm's validity.)

⇒ ⛔ **`P = rep_owner / reader_white`, the pre-commit's own verdict metric, measures the WRONG
CHANNEL AT THE WRONG FRAME.** Re-running at any config cannot repair it. The composition verdict is
**VOID** — not answered, and not answerable by this arm.

##### §36B — ⚑ The instrument's OWN runtime control fires, independently

The two 60 fps dumps were regenerated from frames already on disk at the landed
`--max-pellet-frames 14 --band-hi 20` (CONTROL A passed: params verified `14`/`20`, tracks carry
`reds`). Fed those plus the four `*-schemafix` production dumps, the arm **refuses to report**:

```
--representative-audit: the shipped-identity control FAILED on .../h4-marciana-schemafix/tracks.json.
The local span rebuild no longer reproduces debounce_shots, so no row below would be a difference
from the real baseline.
```

`_merge_shipped_identity:3058` compares the SHIPPED `debounce_shots` against the arm's own
`_merge_spans`/`_merge_events` rebuild. On a band-carrying dump `debounce_shots` takes the hybrid
branch and the pre-hybrid rebuild does not, so they diverge and the control fires. **Exit 1, no
report, no rows.**

⚑ **Three independent methods, one verdict:** a blind code read, the instrument's own runtime
control, and fixture provenance — `representative-audit-slice.json` was built on
`h4-*-structural` / `groundtruth-f811-v4` dumps, which carry **no `band` key at all**, which is
precisely why the control ever passed.

##### §36C — What this retroactively scopes

The fixture's decomposition is not wrong; it is **NARROWER THAN IT READS**. `owner` 42 =
`never_detected` 0 + `life_gate_rejected` 5 + `radius_gate_rejected` 8 + `countable` 29, and
`rep_owner` 12 / `rep_non_owner` 23 / `reader_white` 35, all describe the **pre-hybrid estimator on
pre-band dumps**. Today that corresponds to the **112 of 852 fallback events (13.1%)** where
`_ps_plateau_rep` returns `None`; the **740 banded events (86.9%)** — §12D's decomposition, asserted
event-by-event in code — are scored by a channel this arm never reads.

⇒ ⛔ **The composition defect is NOT established.** Per the pre-commit §6 bar (`P < 0.50` or
`S ≥ 2` with Controls A, B, C and PASSENGER all passing) it is **not met** — B and C never ran. It
survives as an open hypothesis **about the legacy channel only**, and the 12/35 figure must never be
quoted as a property of the shipped reader.

##### §36D — ⚑ The structural gap this exposes

Every owner-label-linked arm (`--representative-audit`, `--fade-screen`, `--policy-score`'s labelled
path) reads the band-less `labelled` block. Every band-aware arm (`_ps_band`,
`--band-production-ab`) runs on production dumps, which carry no owner labels. ⇒ **THE OWNER'S
LABELS AND THE BAND CHANNEL HAVE NEVER MET.** Every "the reader is N pellets cold" figure on this
branch is therefore either owner-anchored but scoring the legacy channel, or production-accurate but
unanchored to truth. That is why the composition question stayed invisible.

This is the **fourth** instance of one defect class here — §23 (`--dump-tracks` dropped `band`), §25
(could not replay the marker split), §26 (schema fidelity), now the audit arm.

##### §36E — Verdict + scope

⛔ **NOTHING ENACTED**, per pre-commit §5. No constant, no default, no instrument change.
`scripts/tests/fixtures/pellets/representative-audit-slice.json` is **byte-identical**; `git status`
clean. The pass answered no question — it established that **the instrument cannot ask it**, which is
a reportable outcome only because the rule was committed first.

**Reproduction** (the two dumps are gitignored scratchpad; these commands rebuild them):

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
$PY scripts/probe/count-pellets.py <frames> --temporal --locate structural --backend opencv \
  --zoom 2 --center-exclude 36 --min-area 25 --max-area 750 --min-circ 0.55 \
  --pellet-radius 160 --marker-radius 65 --max-pellet-frames 14 --band-hi 20 \
  --dump-tracks scratchpad/pellets/groundtruth-f811-v6-landed/tracks.json
# template variant: --locate template --ammo-template scripts/probe/ammo-box-template.png
#                   --ammo-offset-x 125 --ammo-offset-y -11 --ammo-roi-x0 0.55 --ammo-roi-y0 0.50
```

#### §37 THE AUDIT NOW SCORES THE SHIPPED CHANNEL — §36's question ANSWERED: the count IS mostly made of pellets

**2026-08-06.** Lands `docs/handoffs/closed/2026-08-06-rep-audit-hybrid-LANDING-PLAN.md`. Closes §36's open
item. Commits `313d8c2e` (Route C), `bad4808e` (the `band_hi` whitelist completion), `7962f7d6`
(three corrections).

##### §37A — ⚑ THE ROUTE CHANGED, and the measurement is why

§36E proposed widening `_rep_slim_labelled`'s rows to carry `band`. The blast-radius pass **refuted
that route** and it was abandoned: no committed band-carrying source dump exists; any re-dump bundles
`8d500ff9`'s coordinate-precision change (**11,314 of 11,525 tracks differ**, a known mover of the
radius gate) into the same diff; and the capability **already existed** in `--hybrid-landing-audit`'s
`_hla_production_band`, which reconstructs production's real `band` from `labelled.tracks_raw`,
hard-asserts it against an independent aggregation, and feeds it to the real `cp.debounce_shots`.

⇒ The landing **reuses** that reconstruction. No row widening, no re-dump, no constant change — and
the four `for w, r, m in` destructure sites (which the measurement proved would ALL hard-crash on a
widened row) were never touched.

##### §37B — ⚑ THE RESULT: same total, completely different composition

On the 5 labelled shots, at the landed `--max-pellet-frames 14 --band-hi 20`:

| Channel scored                | reader | owner pellets | non-owner |
| ----------------------------- | ------ | ------------- | --------- |
| Legacy `pellet_ids` (pre-§37) | 35     | **12**        | **23**    |
| **Shipped (band + hybrid)**   | 35     | **31**        | **4**     |

⚑ **The TOTAL IS IDENTICAL AND THE COMPOSITION IS NOT** — 34% owner pellets against 88%. The legacy
arm got the right total for entirely the wrong reasons; the three shots that appeared to count ZERO
real pellets count 8, 10 and 8. **This is the compensating-error principle in its purest observed
form**, and it is why a count-based severity measurement (§22C) could not see what a bad lock costs.

⇒ **§36's composition question is ANSWERED, against the hypothesis: the reader's count IS mostly made
of pellets.** ⛔ The defect was in the INSTRUMENT, never in the reader. §36C's `12 / 35` must not be
quoted as a property of the shipped reader — it never was one.

##### §37C — What the residual decomposes to now

`owner 42 = 0 never-detected + 5 life-gated (pellet_ids) + 8 radius-gated + 29 countable`, and the
shipped reader reports **35 = 31 owner + 4 non-owner**. So **42 − 35 = 7 across 5 shots = −1.40
pellets/shot** — the same MAGNITUDE as §19's production residual, now on the correct channel and
fully decomposed. ⛔ Different basis (5 labelled shots vs 815 production shots): **the same
magnitude, not the same measurement.**

Of the 8 radius-gated, **7 are shot 4's documented template mislock** and go to 0 on relock. The 5
life-gated fail `pellet_ids` (life 15/16/17/19 > `max_pellet_frames` 14) but **ARE band members** at
`band_hi` 20 — which is why `rep_own` (31) legitimately EXCEEDS `cntbl` (29): two bases, one table.

##### §37D — Blast radius: DECLARED BEFORE THE EDIT, HELD EXACTLY

P1–P6 all held. Of `representative-audit-slice.json`'s `_expected`, exactly **25 keys moved and every
one is `rep_offset` / `rep_owner` / `rep_non_owner` / `reader_white`** — zero out-of-contract movers,
zero removals. `peaks`, `peak_total`, `lifetime_summary`, `white_reconstruction`, `filter_fidelity`,
`premise`, `per_dump`, `coexistence_equals_countable`, `corrected_countable_total` all unchanged. No
other fixture moved. `pellet-selftest.sh` 31/31 and `verify.sh` PASS at every step.

##### §37E — ⛔ Traps closed, and one that was live in the tree

1. ⚑ **The fixture's own regeneration recipe was a TRAP.** Its `_note` omitted
   `--representative-audit-fps 60 30 30 30 30`; that flag defaults to 30 for every positional dump,
   but `dumps[0]` is the 60 fps labelled clip — so **following the documented recipe literally
   rewrote ~45 `_expected` values silently instead of failing.** Now documented as mandatory.
2. `_rep_series`' bare `next(...)` raised `StopIteration` rather than a diagnostic if a rep frame
   fell outside `_rep_trajectory`'s window — newly reachable once the rep frame became the hybrid
   one. Now a real error naming shot, frame and window.
3. The shipped-identity control is compared **band-stripped**, against the pre-hybrid baseline it is
   actually a rebuild OF. ⛔ Not a weakening: `_merge_shipped_identity` itself is untouched, so
   `--merge-audit` is unaffected, and the labelled half needs no such control because it now calls
   the real `cp.debounce_shots`.

##### §37F — ⛔ Honest limits

n = **5 shots, one clip** (`marciana`, SG/Iron), and these are the labels the reader was tuned
against (§19D) — **ELIMINATION, not confirmation.** ⚑ **The DUMPS half of the arm still scores the
pre-hybrid channel** (it is an explicitly pre-hybrid `median`/`p75`/`max` policy comparison); only the
LABELLED half speaks for production. Not a regression, not a full fix either.

#### §38 §19'S A/B IS REBUILT AS A COMMITTED ARM — and it REPRODUCES EXACTLY (band 1)

**2026-08-06.** Executes `docs/handoffs/closed/2026-08-06-residual-ab-PRECOMMIT.md` (committed at `141258da`
**before the arm emitted any number**) and item 1 of `2026-08-06-band-channel-SWEEP.md` §7. Instrument:
**`analyze-pellet-tracks.py --residual-ab`** (+ `--residual-ab-selftest`, fixture
`scripts/tests/fixtures/pellets/residual-ab-slice.json`, `pellet-selftest.sh` now **32 arms**).

##### §38A — The result: PRE-COMMIT BAND 1, REPRODUCED

`band_hi` varied ALONE on the production counting path, scored against the owner labels:

| dump                                   | E(pre-landing) | E(landed)   | Δ           | n   |
| -------------------------------------- | -------------- | ----------- | ----------- | --- |
| `groundtruth-f811-v4` (§19's own clip) | **−2.0000**    | **−1.4000** | **+0.6000** | 5   |
| `groundtruth-f811-v6-landed`           | **−2.0000**    | **−1.4000** | **+0.6000** | 5   |

Within **±0.0000** of §19's `−2.00 → −1.40`, `Δ = +0.60`. §19A's per-shot table reproduces cell for
cell (reader 5/8/7/4/8 → 5/10/8/4/8 against owner 7/10/8/9/8), `totalShots` unmoved at 37, and the
gain lands on shots 2 and 3 **and nowhere else** — §19B's pre-recorded prediction. Re-run
independently by the judge; identical.

⚑ **THIS IS WEAK EVIDENCE AND THE PRE-COMMIT SAID SO FIRST (§1).** Post-§37 `--representative-audit`
already reported `owner 42 − reader 35 = 7` on these same shots, so a match was **expected**. ⇒ Record
as **consistency plus a named reproducible path** — ⛔ **not** as independent confirmation.

⇒ **The sweep's item 1 is closed: `−1.40` now has an instrument at a named path** (constraint 9).

##### §38B — What the rebuild adds beyond §19

- ⚑ **`max_pellet_frames` 13 → 14 is INERT on all five labelled shots** — only `band_hi` moves them.
  A cleaner isolation than §19 had, and it independently corroborates §29's "inert at 30 fps" finding
  from the other direction.
- The `42 / 35` sums match §37C's independently-built decomposition.
- **Channel is demonstrated, not asserted:** every row prints `band@rep` **and** `legacy_white@rep`
  for the same frame. At `band_hi = 20` shots 2 and 3 read `band@rep` 10/8 against `legacy_white@rep`
  8/7 — **the reader takes 10 and 8.** On the legacy channel it would have reported 8 and 7 and Δ
  would have been **0**. `_rab_assert_channel` hard-fails if `reader != band@rep` on a banded row.

##### §38C — ⚑ AN OBSERVATION IN TENSION WITH §22C — n=1, HYPOTHESIS-STRENGTH, NOT A VERDICT

With shot 4's documented template mislock corrected by the relock, the same clip reads:

> **E(landed) relocked = −0.4000** (vs **−1.4000** as-scored). ⇒ On this clip **one mislocked shot
> carries ~1.0 of the −1.40**.

⛔ **This does NOT overturn §22C's "a bad lock costs ≈0".** Both can be true and probably are:
§22C measured a **count difference across 10 different shots**; this is **owner-anchored error on
ONE shot**. And §37B already named the mechanism that reconciles them — a mislocked count gets
**refilled by non-pellet tracks**, so a count-based observable cannot see the loss that an
owner-anchored one can.

⚑ **n = 1 shot. Per CLAUDE.md evidence-proportionality this RECORDS an observation and changes
nothing** — no constant, no default, no re-ranking of the mislock channel. It is a **lead**: the
right follow-up is an owner-anchored (not count-based) mislock severity measurement over more shots.

##### §38D — Method + honest limits

- **CONTROL FIT held, and is checkable rather than asserted:** the instrument was committed at
  `5c3959b1` **before it had ever run** (instrument-only, no fixture, 13:14:24), with the measurement
  landing separately at `315999b2` (13:21:27). **Verified by the judge from the commit contents.**
  Three post-output edits were declared, all outside the four fixed choices (arms, labels, error
  definition, shot set); two were to the arm's own equivalence CONTROL and aborted the run before any
  `E` existed, and the v4 headline row passed both arms on the first run, before either edit.
- ⚑ **Those two control edits inherit §26E's known defect** — creation-time `is_red` vs the per-frame
  `reds` classification. The fix is confined to this arm's helper; **the other eleven call sites §26E
  names remain open, exactly as §26E left them.**
- **Zero existing fixtures moved** (judge-verified: only `residual-ab-slice.json` appears across both
  commits). `pellet-selftest.sh` 32/32, `verify.sh` PASS.
- ⛔ **n = 5 shots, ONE clip, ONE unit (`marciana`, SG/Iron), IN-SAMPLE** (§19D — these are the labels
  the reader was tuned against). **ELIMINATION-strength, never a certification.**
- **Interface note:** `--residual-ab` takes dump **DIRECTORIES**; every other arm takes a
  `tracks.json` path. Passing `tracks.json` raises a confusing `NotADirectoryError`.

#### §39 MISLOCK SEVERITY BY TRACK-SET IDENTITY — the two locks count DIFFERENT pellets, and §22C's own premise fails

**2026-08-06.** Executes `docs/handoffs/closed/2026-08-06-mislock-identity-PRECOMMIT.md` (committed at
`8c9e98e3` **before any Jaccard existed**). Instrument: **`analyze-pellet-tracks.py
--mislock-identity`** (+ selftest, fixture `mislock-identity-slice.json`, `pellet-selftest.sh` now
**33 arms**). Tests §37B's refill mechanism, which until now was an _explanation_ rather than a
measurement.

##### §39A — The result, per dump (⛔ never pooled)

`A` = track ids counted under the STRUCTURAL lock, `B` under the TEMPLATE lock, both at the
**band-plateau frame** on the **shipped** channel. `J` = |A∩B| / |A∪B|.

| dump                         | `J_mis` | n_mis | **`J_ok`** | n_ok | `ΔC` |
| ---------------------------- | ------- | ----- | ---------- | ---- | ---- |
| `h4-marciana-structural`     | 0.3333  | 8     | **1.0000** | 170  | 1.13 |
| `h4-isabel-structural`       | 0.2857  | 13    | **0.9500** | 150  | 2.38 |
| `h4-guilty-structural`       | 0.6000  | 7     | **1.0000** | 136  | 1.29 |
| `g2-noir-structural`         | 0.3750  | 12    | **1.0000** | 166  | 2.25 |
| `groundtruth-f811-v6-landed` | 0.5268  | 2     | **1.0000** | 24   | 3.50 |
| `groundtruth-f811-v4`        | 0.7143  | 1     | **1.0000** | 24   | 2.00 |

⚑ **CONTROL SANITY passes decisively everywhere** — agreeing locks count the _same_ tracks
(`J_ok` 0.95–1.00 on n = 24–170). The metric is not measuring noise, which is what makes the
mislocked column interpretable at all.

⇒ **Mislocked shots count LARGELY DIFFERENT PELLETS.** Several individual shots reach **`jaccard`
= 0.0000** — two _entirely disjoint_ sets — while the counts differ by only 1 (`g2-noir` t0=1175:
`nA` 3, `nB` 4, |A∩B| **0**; t0=1817: `nA` 6, `nB` 5, |A∩B| **0**). That is the compensating-error
signature in its purest observed form.

##### §39B — ⛔ THE PRE-COMMITTED BAND THAT FIRED IS ROW 4, NOT ROW 1

All six dumps land on `ΔC ≥ 1.0`: **"counts diverge materially too ⇒ §22C's own premise (that counts
barely move) does not hold on this population."** Rows 1 and 2 were both unreachable, since each
required `ΔC < 1.0`.

⚑ **This is a sharper result than the hypothesis it was built to test.** The pass expected _silent_
compensation (same count, different pellets). What it found is that on the §20-classified mislock
population **both** the count and the identity move — so §22C's ≈0 severity was measured on a sample
where counts happened not to move, and that behaviour does not generalise.

⛔ **It does NOT overturn §22C** (pre-commit §5). It establishes that §22C's premise fails here — a
statement about the sample and the observable, not about the channel's size.

##### §39C — ⚑ THE SELECTION EFFECT, and it cuts AGAINST this pass's own hypothesis

**19–28 of every 31–41 mislocked shots per production dump are UNSCORED**, because a wrong lock on
empty screen leaves **no band plateau** at all. The exclusion is asymmetric: **the WORST mislocks
drop out**, so `J_mis` is biased **UP** (toward "same pellets") and `ΔC` **DOWN**.

⇒ **The measured effect is a LOWER BOUND.** Same shape as §22D's excluded both-wrong cases.

⚑ **AND IT LINKS TWO POPULATIONS NOBODY HAS CONNECTED.** "No band plateau" is exactly the condition
under which `debounce_shots` **falls back to the legacy median-total frame** — §12D's **112 of 852
(13.1%)** fallback events. So the worst mislocks are **systematically routed onto the legacy
channel**. ⛔ **Recorded as a LEAD, not a verdict** — it is an inference from the gating logic, not a
measurement of that population.

##### §39D — Method, and the honest limits

- ⛔ **MECHANISM, NOT MAGNITUDE** (pre-commit §5). A low `J` proves the locks count different
  pellets; it does **not** say which is correct, nor how many REAL pellets are lost. **Sizing still
  requires owner labels.** No "mislocks cost N pellets/shot" claim is made or implied.
- **No control fired.** SANITY, CHANNEL (a live `SystemExit` gate — the selftest proves perturbing a
  counted track trips it _by name_), POPULATION (`_mlr_score` unchanged at its committed criterion;
  production classification reproduces §20A/§20B **exactly** — 218/203/180/214 shots, 33/41/32/31
  mislocked), SEPARATION (no pooled aggregate exists in the arm).
- ⚑ **One population caveat, self-reported:** §20's _labelled-clip_ template series was freshly
  calibrated (§20F) and survives only as a 148-counting-frame slice that cannot supply a crosshair at
  a plateau frame. The labelled clip was therefore scored against the only template-located dumps
  that exist, reading **10 mislocked of 37** against §20's committed **6** — §20's six are a strict
  subset, same detector and threshold, only the second lock's provenance differs.
- **n_mis is small per dump (1–13).** Both locks share the structural dump's tracks (ids must be
  comparable for a Jaccard to mean anything), which also makes segmentation identical by
  construction, so shots pair 1:1 without §22D's onset-matching noise.
- Fixture pins all six dump pairs and replays the live report **byte-identically with no scratchpad
  access** — closing §20E's limit 3 for this arm's numbers.

#### §40 SCREENING THE MISLOCK POPULATION FOR AN OWNER ASK — 40% is a STUCK TEMPLATE, and the rest disagree SYSTEMATICALLY

**2026-08-06.** A pre-check before spending owner labelling time on §39's mislock population. ⚑ No
new instrument; a read over `mislock-identity-slice.json` plus the `*-tmplloc` dumps' own
`cross_positions`.

##### §40A — ⛔ 55 of 137 flagged mislocks (40.1%) are a STUCK TEMPLATE LOCK

On the extreme-displacement shots the template crosshair is **frozen at one pixel across many
frames** — `h4-isabel-structural` reads `[2343, 554]` identically on t0 2218 / 2238 / 2258 / 2278;
`h4-guilty-structural` reads `[2457, 472]` on 1156 / 1176 / 1196 — while the structural lock moves
plausibly frame to frame. Screening the whole population on "template position repeated on ≥ 40
frames" flags **55 of 137**.

⇒ **A frozen reference is a failure of the TEMPLATE ARM, not a structural mislock.** ⛔ **§20's
16.9% therefore measures DISAGREEMENT, not structural mislock rate** — a large share of it is the
reference failing. ⚑ **No owner time is needed to identify these; they are mechanically detectable.**

##### §40B — ✅ §39 SURVIVES THIS CONFOUND — checked, not assumed

`J_mis` recomputed with stuck-template shots removed:

| dump                     | `J_mis` published | `J_mis` clean | n scored → clean |
| ------------------------ | ----------------- | ------------- | ---------------- |
| `h4-marciana-structural` | 0.3333            | **0.3333**    | 8 → 7            |
| `h4-isabel-structural`   | 0.2857            | **0.2679**    | 13 → 8           |
| `h4-guilty-structural`   | 0.6000            | **0.6000**    | 7 → 7            |
| `g2-noir-structural`     | 0.3750            | **0.3750**    | 12 → 11          |

Only **7 of 40** scored mislocks are stuck-template, and removing them moves nothing material.
⇒ **§39's finding stands**; the confound lives overwhelmingly in the UNSCORED tail.

##### §40C — ⚑ THE SURVIVING DISAGREEMENT IS SYSTEMATIC, NOT RANDOM — a lead

On the 10 clean candidates, structural minus template:

- **`dx` = +322 ± 121 px — POSITIVE on 10 of 10**
- **`dy` = −330 ± 63 px — NEGATIVE on 10 of 10**

⛔ **Selection cannot explain the SIGNS.** These shots were selected for _disagreeing_, so
disagreement is guaranteed — but under a random-mislock null the direction would be mixed, and
10/10 in **both** axes is not that. The tight `dy` spread (±63 px on a −330 mean) points at the two
locators tracking **different HUD elements** with a fixed geometric relationship, rather than one
jittering.

⚑ **RECORDED AS A LEAD, NOT A VERDICT.** n = 10, hand-screened, and the mechanism is inferred from
geometry alone. But if it holds, a large part of the "mislock" channel is **one systematic offset**
— a far cheaper fix than per-shot localization, and it would be worth identifying which element each
locator is on before any localizer change is designed.

#### §41 THE LOCK-OFFSET LEAD — ⛔ NOT ESTABLISHED by its own pre-committed rule, but the population is BIMODAL

**2026-08-06.** Executes `docs/handoffs/closed/2026-08-06-lock-offset-PRECOMMIT.md`, committed at
`67014264` **before the wider-n numbers existed**. Tests §40C's `dx` +322 / `dy` −330 offset, which
was observed on **10 hand-picked shots** and therefore could not test itself.

##### §41A — The three pre-committed predictions

Structural minus template at `t0+9`, stuck-template shots excluded (§40A). **n = 82 clean mislocked
/ 584 non-mislocked.**

| #      | prediction                              | result                                              | verdict      |
| ------ | --------------------------------------- | --------------------------------------------------- | ------------ |
| **P1** | signs consistent on ≥ 90%               | `dx > 0` **92.7%**, `dy < 0` **98.8%**              | ✅ **HOLDS** |
| **P2** | `dy` sd **< 100 px**                    | **sd = 109** (mean −270, median −282)               | ⛔ **FAILS** |
| **P3** | non-mislocked median \|dx\|,\|dy\| < 20 | **median \|dx\| = 3.0 px, \|dy\| = 1.0 px** (n=584) | ✅ **HOLDS** |

⇒ **By the pre-committed verdict rule — which required ALL THREE — `H_element` is NOT ESTABLISHED.**
P2 missed by 9 px on a 100 px threshold.

⚑ **The threshold was NOT moved.** It was committed at 100 before any wider-n number existed, and
109 is a fail. Rescuing it by widening the bound is precisely what the pre-commit was written to
prevent.

##### §41B — What DID establish itself, and it is worth more than the failed prediction

**P3 is the strongest result in this section, and it was not the headline.** Across **584
non-mislocked shots the two independent locators agree to a median of 3 px horizontally and 1 px
vertically.** Two different localization methods, agreeing to the pixel, on the overwhelming
majority of shots.

⇒ **The mislock population is genuinely BIMODAL**, not a continuum of jitter: the locks either agree
essentially exactly, or they jump by ~270 px in a consistent direction (98.8% same sign). ⚑ That
independently corroborates §39's `J_ok` control from a different quantity — the control passed
because the locks really do agree, not because the metric is insensitive.

##### §41C — Why the "one cheap constant fix" reading is NOT supported

`dy` = −270 ± 109 is a **40% coefficient of variation**. That is a consistent DIRECTION, not a fixed
offset — so the §40C hope that a single constant correction closes the channel **does not survive**.

**POST-HOC, and labelled as such** (it did not rescue P2 and was not used to): the spread is not
explained by splitting per dump — `dy` sd is 87 / 68 / 151 / 94 on `marciana` (SG/Iron) / `isabel` /
`guilty` / `noir`, means −280 / −301 / −239 / −267. Three of four remain above or near the 100 px
bound on their own. ⛔ **Recorded as an observation for whoever designs the localizer fix; it is not
evidence for anything here.**

##### §41D — Consequence

⇒ **The owner ask proceeds as written** (`docs/handoffs/2026-08-06-OWNER-ASK-mislock-labels.md`),
exactly as the pre-commit said it would if any prediction failed. The lead is **PARTIAL, not dead**:
the disagreement is directional and the population is bimodal, but it is not a single constant, so
**labelling is still the route to MAGNITUDE.**

⛔ Nothing enacted. No localizer change, no constant, no threshold.

#### §42 THE MISLOCK IS ASYMMETRIC — the STRUCTURAL locator jumps onto the floating damage numbers, and that failure was already documented

**2026-08-06.** Found while judging the `--mislock-crops` output (§40's owner ask). ⚑ No new
instrument; a read over the existing lock series plus one visual inspection.

##### §42A — Only ONE of the two locks moves

Median crosshair `y` at `t0+9`, stuck-template shots excluded, **n = 82 mislocked / 584 normal**
(screen top is `y = 0`):

| lock           | normal shots | mislocked shots | shift             |
| -------------- | ------------ | --------------- | ----------------- |
| **structural** | 498          | **233**         | ⚑ **UP 265 px**   |
| **template**   | 504          | 534             | 30 px (stays put) |

⇒ **A "mislock" is not two locks disagreeing symmetrically. It is the STRUCTURAL locator leaving,
upward, while the template locator holds position.**

##### §42B — ⚑ THAT EXACT FAILURE IS ALREADY DOCUMENTED AND WAS ALREADY MEASURED

`make-groundtruth-f811.py:168-175`, written for the ground-truth generator:

> _"a jump this size inside one blast (~0.2s) means the structural locator **lost the real ammo box
> and grabbed a decoy (e.g. a floating multi-digit damage-number stack briefly matching the digit-row
> shape gate)**, NOT a moving aim point. **Measured: exactly this pattern produced a garbage crop
> (no crosshair/pellets, just damage-number text) on one of the 6 shots**"_

Damage numbers float **above** the boss and the ammo box. A 265 px upward jump is that decoy.

##### §42C — Four independent lines, and one visual

1. **§41 P1:** `dy < 0` on **98.8%** of 82 clean mislocks — the jump is directional.
2. **§42A:** the shift is **entirely on the structural side** (265 px vs 30 px).
3. **§42B:** the mechanism is documented **and was previously measured** on the labelled clip.
4. **Visual, shot 6** (`marciana` SG/Iron, t0 3636): the in-game reticle is plainly visible at
   ≈(330, 455) in crop pixels and the **template** candidate sits on it at (283, 451), while the
   **structural** candidate (356, 190) sits in the floating damage-number field.

⛔ **This is a HYPOTHESIS, not a verdict** — line 4 is n=1 visual and lines 1–2 are directional
statistics, not per-shot adjudication. But it is strong enough to **change what the owner should be
asked**.

##### §42D — ⇒ THE OWNER ASK MAY BE LARGELY UNNECESSARY

The ask (§40) exists to answer **"which lock is right?"**. §42 answers it **mechanically, for the
population**, without owner time: on a mislock the structural lock has left the ammo box and the
template lock has not.

⇒ **Recommended before any labelling:** test the decoy hypothesis directly — does the structural
lock position on mislocked shots sit on damage-number-like content (bright text glyphs) rather than
the ammo box? That is a pixel test on frames already on disk, needs no owner time, and would
promote §42 from directional statistics to a per-shot classification.

⛔ **What §42 still does NOT give is MAGNITUDE.** ⚑ And the obvious shortcut — `n_tmpl − n_struct`
× the mislock rate — is **exactly §20D's refuted move** (rate × a thin-sample severity). It must not
be taken without its own pre-commit.

⛔ Nothing enacted. No localizer change, no constant, no threshold. The crops and the ask remain
built and available if the pixel test does not settle it.

#### §43 THE DECOY PIXEL TEST — ⛔ NOT ESTABLISHED (P3 misses by ONE SHOT), but the structural lock demonstrably leaves the ammo box

**2026-08-06.** Executes `docs/handoffs/closed/2026-08-06-decoy-pixel-PRECOMMIT.md` (`c6604e21`, committed
before any pixel score existed). Tests §42's hypothesis that the structural locator abandons the
ammo box for the floating damage numbers on a mislock.

##### §43A — ⚑ THE FIRST RUN VOIDED ON ITS OWN POSITIVE CONTROL

Run 1 scored the ammo-box template on a patch centred at the **crosshair**. P1 — the positive
control, where the structural lock is on the box _by construction_ — came back at **0.221**, i.e.
the test could not see the box even where it must be. **A null from an instrument that fails its own
positive control is not evidence; it is a void instrument.**

Cause: `count-pellets.py:1799` sets `cross_pos = box_centre + (ammo_offset_x, ammo_offset_y)`, and
these dumps carry **(125, −11)** — so the patch sat 125 px to the right of the box.

⚑ **This was a post-failure fix, and it is declared as one.** It repaired the INSTRUMENT after its
POSITIVE CONTROL failed — it did **not** move a threshold, and P1/P2/P3's bars are exactly as
committed.

##### §43B — The result, instrument corrected (`box = cross − offset`)

| #      | prediction                                 | result                            | verdict      |
| ------ | ------------------------------------------ | --------------------------------- | ------------ |
| **P1** | structural scores HIGH on normal shots     | **0.633** (n=584)                 | ✅ **HOLDS** |
| **P2** | structural DROPS > 0.20 median on mislocks | **0.245**, drop **+0.389** (n=82) | ✅ **HOLDS** |
| **P3** | template outscores structural on ≥ 80%     | **65/82 = 79.3%**                 | ⛔ **FAILS** |

⇒ **By the pre-committed rule — P3 was declared LOAD-BEARING — the hypothesis is NOT ESTABLISHED.**
It misses by **one shot** (66/82 would be 80.5%).

⚑ **The bar was not moved, and "essentially passed" is not the verdict.** The pre-commit says in
terms: _"A P3 failure must not be reported as a partial success."_ That clause was written to stop
exactly this, and this is the **second** pre-commit today to fail by a hair (§41's P2: 109 vs 100).

##### §43C — What IS established, and why P3 was the right gate

**P1 + P2 are decisive: the structural lock demonstrably LEAVES the ammo box on a mislock** —
0.633 → 0.245. §42's core claim survives.

⛔ **But "therefore use the template lock" does NOT follow, and that is precisely what P3 tested.**
The template's own score on mislocked shots is **0.515**, below its normal **0.587** — so the
template is **also degraded** there. On ~21% of mislocked shots the structural position actually
scores _higher_. ⇒ **On roughly one mislocked shot in five, NEITHER lock is clearly on the box**, and
no mechanical rule can adjudicate those.

##### §43D — Consequence: the owner ask survives, and can shrink a THIRD time

⇒ **Owner labels are still required** — the pre-commit said the ask proceeds if P3 fails, and it does.

⚑ But the pixel score is now a **triage signal**: for the ~79% where the template clearly outscores
structural, the mechanical evidence is strong; the informative labelling target is the **17 shots
where it does not**. ⛔ Re-selecting the ask on that basis is a **separate pass with its own
pre-commit** — re-cutting a sample using the results of a failed test is exactly how a selection
effect gets built in.

⛔ Nothing enacted. No localizer change, no constant, no threshold. Still **not magnitude** —
`count_diff × mislock rate` remains §20D's refuted move.

## Burst-cycle TEMPO GAP — the real cycle is ~1.65s/cycle faster than the sim (2026-08-13)

`/scientific-method` run, **decision LOG** (2-of-2 ACCEPT, both MEDIUM). Packet + deliverable:
`docs/handoffs/2026-08-13-tempo-gap-preop-packet.md`, `…-tempo-gap-deliverable.md`.
Instrument: `scripts/probe/scan.ts --fps 60 --cycle-table` (+ `scripts/probe/cycle-table.ts`),
pinned by `scripts/tests/probe/cycle-table.test.ts` against the committed frame-trace fixtures
`docs/probe-data/tempo-cycle-{u8-g-iron-sweep,probe-u7-t5-wind-weak}.json`.
Sim side: `DECOMP=1 SEEDS=1 ONLY=… [SLUGS=…] npx tsx scripts/experiment.ts`.

**What was measured.** Steady-state burst-cycle PERIOD (Full-Burst start → next FB start) and the
burst-chain cast LADDER (stage1→2→3→FB), on two recordings, every cycle, middle-60% window on both
sides. Both quantities are DIFFERENCES WITHIN ONE VIDEO, so no fight-clock anchor enters them — the
"video time ≠ fight time" confound cannot reach these numbers.

| comp                                 | real period | sim period | gap        | real ladder (median) | sim ladder |
| ------------------------------------ | ----------- | ---------- | ---------- | -------------------- | ---------- |
| `iron sweep (run G)` (boss Electric) | 14.388s     | 16.050s    | **1.662s** | 1.400s               | 1.3667s    |
| `T5 wind-weak` (boss Iron)           | 13.808s     | 15.457s    | **1.649s** | 1.383s               | 1.3667s    |

Robustness: 1.53–2.01s across mean/median/all-cycles, three detection spines (drain-window start,
stage-3 hexagon, stage-1 onset) and two sampling rates (20/60fps). ⚑ The 0.013s agreement between
the two comps is COINCIDENCE, not precision — per-comp sd is 0.42–1.19s over n=8, so each gap
carries ~0.15–0.4s of standard error. Do not quote it as corroboration (struck by the post-op judge).

**What this establishes.**

1. The real burst cycle is **~1.5–2.0s/cycle faster than the sim's**, on two independent recordings,
   two teams, two boss elements. MEASURED.
2. **The burst chain is EXONERATED.** The real stage1→FB ladder is 1.383–1.400s against the engine's
   30f+30f+22f = 82f = 1.3667s — within 1–2 frames, and if anything LONGER. The rival "the modeled
   chain is too slow" is dead; the ladder contributes −1% to −2% of the gap.
3. **100% of the gap therefore sits in the FB-start → next-stage-1 span**, i.e. inside
   `FB duration + gauge refill + the 30f pre-B1 gap`.

**What this does NOT establish — the attribution is UNRESOLVED and that is the honest result.**
Inside that span, FB-END and the gauge-full instant are BOTH unrendered, so it is one indivisible
quantity. The Full-Burst-duration lower bound (≥8.733s iron / ≥8.867s T5, guard-corrected) leaves
only 0.395–0.529s of the gap unexplained by "the real Full Burst is shorter than the modeled 10s" —
below the plan's pre-committed 0.6s margin. So H0d is **disfavoured but not excluded**, and the
refill-window error is a RANGE, never a point: **iron [0.529, 1.662] s/cycle, T5 [0.516, 1.649]**.
The span also cannot distinguish "gauge generates too slowly" from "the chain opens late after
gauge-full" from a per-shot-table or focus-multiplier error.

**Generality is BOUNDED.** Both recordings are among the four `disabled: true` comps and `liberalio`
is their common slug; it appears in zero passing comps, so its presence is perfectly confounded with
the flag. This does not establish an engine-general refill error. The `liberalio`-free comp in the
same shortfall class (`misc B3s (run I order)`, sim 12 vs measured 13) is not measured here.

**Two defects found in the committed scanner** (`scripts/probe/scan-frames.py`), corrected in
`cycle-table.ts` rather than in the worker — changing the worker would move the full-burst counts it
is 8/8-validated on:

- **LATE START, 10 of 26 cycles.** The burst cut-in occludes the gauge HUD for ~0.4s just after the
  bar first renders. If the last pre-occlusion frame has already partly decayed, the re-appearance
  trips `RESET_JUMP=0.25`, `full_windows()` discards the true opening sub-window (shorter than
  `WINDOW_MIN=3.0`), and the window restarts **~0.417s late**. Guard 3a rejects those cycles from the
  duration bound by requiring the window to start where the engine's 22f B3→FB delay says it must.
- **TAIL STITCHING, 3 of 26 windows.** `GAP_TOL=1.0s` welds isolated post-FB false-positive frames
  onto a window's tail, inflating its duration by 0.55–0.88s. A draining bar is monotone, so a trace
  going `0 → 0.037 → 0 → 0.044 → 0` is detector noise. Guard 3b re-derives each end from the raw fill
  trace and keeps only contiguous runs of ≥3 frames.
  ⚑ **This defect decided the run's verdict.** Without guard 3b the bound reads 9.40s, condition (c)
  passes, and the outcome would have been H1 CONFIRMED. The guard — added by the pre-op judge
  precisely to catch a late-end artifact biasing toward the hypothesis — is the whole difference.

⚑ **Open, unexplained, runs AGAINST the gap so it cannot inflate the finding:** real stage1→stage2
medians read 33f (iron) / 32f (T5) against the modeled 30f `STAGE_CAST_GAP_FRAMES`. Possibly a
detection-onset threshold, possibly real. Worth one measurement before anyone touches that constant.

⛔ **Nothing enacted.** No engine constant, no override, no snapshot, no `disabled: true` removal.
Owner-scoped to measurement + LOG. The named next step that would resolve the attribution is a
real-Full-Burst-duration read via a visual that does NOT share the drain bar's under-render (the
Full Burst screen border/cut-in vignette, or a buff-icon timer) — one clean "real FB ≈ 10s"
observation converts this into H1 CONFIRMED on the already-measured gap.
