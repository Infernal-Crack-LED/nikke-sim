# Probe run plan (U7) — validate the unmeasured overrides in minimum runs

Standard conditions: scope lock preset, 10/10/10, treasure on, full auto, 180s, partless boss.
The CLI supports 4-unit comps (site slots can simply be left empty).
Slot order below is exact (leftmost-first burst priority depends on it). "Boss" names the
weakness to select (boss element in parens) — chosen so themed kits get their advantage.
Site mode pills to set are listed per run. Sim predictions verified: no unexpected stalls.

| run | slots 1→5 | boss | probes (anchors) | modes / notes |
|---|---|---|---|---|
| A | anis-star · prika · mint · alice · red-hood | wind weak (Iron) | prika, mint, alice, red-hood (anis) | prika+mint = duet modes (Prika auto-takes the FIRST B2 regardless of slot order — burstFirst rule); red-hood operates as B3. Rotation is genuinely slow for this comp shape (~50% uptime) — expected, sim models it |
| B | moran · trina · cinderella · neon-VE | elec weak (Water) | moran, trina (cindy, neon) | 4-unit comp (no 5th needed — 12 FBs, no stall); trina's single-target buff lands on the elec carries |
| C | anis-star · tia · naga · SWHA · helm | water weak (Fire) | tia, naga (anis, SWHA, helm) | naga mode "with shielder" (tia IS the shielder); tia flexes as 2nd B1, her S1 CDR/AD still fire |
| D | emma-TU · eunhwa-TU · diesel-WS · helm | fire weak (Wind) | emma-TU, eunhwa-TU, diesel-WS (helm) | 4-unit comp per user; emma+eunhwa = duo modes; ~50% uptime expected (emma's 40s B1 + 2x40s B3s, CD-bound — real matches). BONUS: helm bursts here (4x) — first live test of her 8236.8% nuke model |
| E | rouge · crown · ein · ada · cinderella | elec weak (Water) | rouge, ein, ada (crown, cindy) | each unit judged on its OWN sim-vs-real (no delta methodology — too confounded); rouge's grant modeling surfaces as cindy reading hot/cold with rouge present |
| F | maiden-IR SOLO (field only her) | elec weak (Water) | maiden | no B1/B2 → full burst never happens (sim + real alike): pure normals + her 547.62% proc. Sim prediction (range-band model): 96.1M total (35.3M normals + 60.8M procs). Real ≈104M → model right; ≈42M → proc ~absent outside FB; between → value/cadence partial |
| G | d-killer-wife · takina · milk-BB · maxwell · liberalio | iron weak (Electric) | DKW, takina, milk-BB, maxwell (liberalio) | milk auto mode (default); tests DKW's fixed CDR cadence |
| H | little-mermaid · crown · quency-EQ · dorothy-S · guillotine-WS | water weak (Fire) | quency-EQ, dorothy-S, xGuillo (LM, crown) | user lacks xLudmilla — xGuillo (fresh override) takes the slot; she never bursts here (slot 5), so her level auras/ramp get tested, not her burst dot |
| I | anis-star · grave · chisato · jill · noir | elec weak (Water) | grave, chisato, jill, noir (anis) | |

Coverage: 27 probe units in 9 runs, every run carrying 1-3 validated anchors so probe error is
attributable. Tail units not covered (lower priority, audited-clean, niche, or not owned): miranda:T, exia:T, asuka, rei-ayanami (not owned), soline-FT (40s mono-B1, stalls any comp she anchors), snow-white,
diesel-WS, ark-ranger-black, rosanna-CO, brid-ST, anchor-IM, ade-AB, soline-FT, velvet(done),
dorothy, mari — can form runs J/K later if desired.

Per run, report: per-unit damage totals (+ who actually burst if it deviated from leftmost).

## RESULTS (2026-07-13, screenshots in docs/"7:13 probe runs"; scored in scripts/experiment.ts as PA-PI)

| run | unit: real → sim/real ratio |
|---|---|
| A | anis 794.6M → **0.43** · mint 200.1M → 0.90 · prika 167.8M → 0.65 · alice 403.9M → **0.49** · red-hood 853.3M → **0.29** |
| B | moran 222.3M → 0.93 ✓ · trina 50.9M → **2.72** · cinderella 582.7M → **1.76** · neon 467.2M → **1.88** |
| C | tia 159.9M → 1.30 · anis 779.4M → **0.47** · naga 174.2M → **2.14** · SWHA 1320.3M → 1.06 ✓ · helm 652.0M → 1.24 |
| D | emma-TU 138.6M → 1.16 · eunhwa-TU 303.3M → **2.13** · diesel-WS 547.1M → 1.06 ✓ · helm 273.0M → 1.18 |
| E | rouge 106.7M → 1.48 · crown 147.6M → 1.38 · ein 560.3M → 0.88 · ada 460.2M → 0.99 ✓ · cinderella 342.6M → 0.73 |
| F | maiden SOLO 76.6M → **1.26** (sim 96.1M; proc exists at ~0.68 of modeled value) |
| G | DKW 57.8M → 1.11 · takina 427.4M → 0.92 ✓ · milk-BB 391.2M → **0.67** · maxwell 126.6M → **1.93** · liberalio 484.6M → 0.82 |
| H | LM 341.6M → 1.09 · crown 161.3M → 1.05 · quency-EQ 594.1M → 0.86 · dorothy-S 766.3M → **1.84** · xGuillo 273.9M → 1.34 |
| I | anis 602.8M → 0.99 ✓ · grave 288.1M → 1.23 · chisato 492.0M → 1.29 · jill 518.4M → **2.09** · noir 160.6M → **2.05** |

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


## DEEP-DIVE PASS (2026-07-13, second session) — see docs/deep-dive-brief.md for the mission

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
| fight | ratios |
|---|---|
| T1 | mast 1.06 · SBS 1.22 · anis 1.00 · liberalio 1.00 · crown 1.03 |
| T3 | rapi 1.07 · mihara 0.90 · LM 0.98 · crown 0.96 · helm 0.94 |
| T4/T4b | anis 0.85 · privaty 0.90-0.93 · SWHA 0.90-0.92 · helm 0.82 · crown 0.91 (comp-wide ~0.88 cold — OPEN) |
| T2 | crown 1.10 · neon 0.97 · anis 0.96 · cindy 1.21 · maiden 1.25 |
| T5 | nayuta 0.87 · cindy-CW 1.12 · anis 0.97 · liberalio 0.96 · velvet 1.05 |
| T6 | crown 0.97 · rapi 1.07 · LM 1.00 · SWHA 0.96 · helm 0.95 |
| T7 | crown 1.14 · rapi 1.10 · anis 1.04 · cindy 1.21 · mast 1.02 |
| T8 | anis 1.04 · crown 0.97 · rapi 1.07 · cindy-CW 1.28 · helm 0.96 |
| PA | anis 0.97 · mint 1.27 · prika 0.84 · **alice 1.15** · **red-hood 0.92** (was 0.59/0.36!) |
| PB | moran 0.91 · trina 2.59 · cindy 1.85 · neon 1.87 (U8 rotation ground truth) |
| PC | tia 1.10 · naga 1.07 · SWHA 0.94 · helm 1.18 (anis excluded) |
| PD | emma 1.07 · eunhwa 1.34 · diesel 1.01 · helm 1.19 |
| PE | rouge 1.39 · crown 1.41 · ein 0.94 · ada 0.99 · cindy 0.80 (U8) |
| PF | maiden SOLO **1.01** ✓ (U2 resolved) |
| PG | DKW 1.00 · takina 0.78 · milk 0.57 (accepted) · maxwell 0.81 · liberalio 0.80 (U8 — comp-wide cold) |
| PH | LM 1.06 · crown 1.00 · quency 0.85 · dorothy 1.09 · xguillo 1.24 |
| PI | anis 0.98 · grave 1.19 · chisato 1.26 · jill 1.86 · noir 1.15 (U8 — comp-wide hot exc. anis) |

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

| fight | ratios |
|---|---|
| T1 | mast 0.95 · SBS 1.23 · anis 1.04 · liberalio 1.02 · crown 0.91 |
| T3 | rapi 0.95 · mihara 0.88 · LM 0.95 · crown 0.89 · helm 0.96 |
| T4/T4b | anis 1.01 · privaty 0.89-0.92 · SWHA 0.93 · helm 0.97 · crown 1.10 ✓ RESOLVED |
| T2 | crown 1.03 · neon 0.91 · anis 0.93 · cindy 1.19 · maiden 1.31 |
| T5 | nayuta 0.86 · cindy-CW 1.09 · anis 0.94 · liberalio 0.96 · velvet 1.02 |
| T6 | crown 0.92 · rapi 1.04 · LM 0.95 · SWHA 0.93 · helm 0.93 |
| T7 | crown 1.01 · rapi 0.97 · anis 1.08 · cindy 1.10 · mast 1.13 |
| T8 | anis 1.02 · crown 0.92 · rapi 1.05 · cindy-CW 1.25 · helm 0.96 |
| PA | anis 0.94 · mint 1.21 · prika 0.82 · alice 1.12 · red-hood 0.86 |
| PB | moran 0.91 · trina 2.62 · cindy 1.86 · neon 1.96 (U8) |
| PC | tia 1.09 · naga 1.06 · SWHA 0.96 · helm 1.13 (anis excluded) |
| PD | emma 1.00 · eunhwa 1.32 · diesel 1.02 · helm 1.17 |
| PE | rouge 1.32 · crown 1.30 · ein 0.89 · ada 0.97 · cindy 0.78 (U8) |
| PF | maiden SOLO 1.01 ✓ |
| PG | DKW 0.98 · takina 0.76 · milk 0.56 (accepted) · maxwell 0.80 · liberalio 0.79 (U8) |
| PH | LM 1.03 · crown 0.97 · quency 0.84 · dorothy 0.99 ✓ · xguillo 1.25 |
| PI | anis 0.97 · grave 1.19 · chisato 1.21 · jill 1.72 · noir 1.12 (U8) |


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
NOT appear in the measured nuke — skipping it is empirically right.

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
