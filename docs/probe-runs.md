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
SUPERSEDED (2026-07-13) — generation is LOCKED during full burst; the fast refill is charge
users releasing held shots right after it ends (owner correction, burst-gauge.md §1);
the gauge is consumed when the chain opens; the next chain can't open until ~3s after
full burst ends — all measured from the run-I/run-B/3-unit bar traces), the sim now
matches ALL FOUR graded comps exactly and most comps are seed-deterministic:

| fight | slots | sim full bursts | first FB (fight time) | notes |
|---|---|---|---|---|
| elec battery (recorded) | moran · cindy · neon · trina | 11 | ~5.0s | **video: 11 ✓ exact** |
| elec DPS (recorded) | crown · ein · ada · rouge · cindy | 10-11 | ~6.1s | video: ~11-12 ✓ |
| misc B3s (recorded) | grave · anis:star · jill · chisato · noir | 13 | ~3.4s | **video: 13 ✓ exact, seed-stable** |
| 3-unit projExpl (recorded) | anis:star · trina · cindy | 4-5 | ~10.5s | video: 5 ✓ |
| iron sweep (run G) | DKW · takina · milk:BB · maxwell · liberalio | 13 | ~3.4s | video: 13-14 ✓ |
| wind-weak T1 | mast:RM · SBS · anis:star · liberalio · crown | 13 | ~2.8s | |
| fire-weak T3 | rapi:RH · mihara:BC · little mermaid · crown · helm | 13 | ~3.6s | |
| water-weak T4 | anis:star · privaty · SWHA · helm · crown | 13 | ~3.4s | |
| elec-weak T2 | crown · neon:VE · anis:star · cindy · maiden:IR | 12 | ~4.8s | |
| wind-weak T5 | nayuta · cindy:CW · anis:star · liberalio · velvet | 13 | ~3.0s | |
| fire-weak T6 | crown · rapi:RH · LM · SWHA · helm | 13 | ~3.4s | |
| elec-weak T7 | crown · rapi:RH · anis:star · cindy · mast:RM | 11 | ~5.9s | |
| iron-weak T8 | anis:star · crown · rapi:RH · cindy:CW · helm | 13 | ~3.5s | |
| MiKa (run A) | anis:star · mint · prika · alice · red-hood | 11 | ~5.0s | |
| shields (run C) | tia · anis:star · naga · SWHA · helm | 12 | ~3.9s | |
| Eva duo (run D) | emma:TU · eunhwa:TU · diesel:WS · helm | 9 | ~3.4s | |
| water B3s (run H) | LM · crown · quency:EQ · dorothy:S · xGuillo | 12 | ~5.5s | |

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

| read | Damage Up placement (engine today) | Element placement (reference) |
|---|---|---|
| privaty normal bullet, HER full-burst window | 204,453 / 216,777 | 279,570 / 306,455 |
| normal bullet, Snow White window (control) | 99,121 / 108,653 | identical |
| normal bullet, no-full-burst gap (control) | 28,067 | identical |
| her last-bullet proc (the 256.17% class), her window | 2.56M / 2.71M | 3.50M / 3.84M |
| that proc outside full burst (~86s, control) | 607,956 | identical |
| her burst nuke at cast (non-crit) | 6.10M | 7.29M |

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

| state (when to read) | sim today (core NO): body / crit | core YES adds: core / core-crit |
|---|---|---|
| cold, no buffs — 2:56, 2:54, 2:22, 1:28, 1:09, 0:53, 0:17 | 342,982 / 514,473 | 685,964 / 857,455 |
| post-window state — 2:42, 2:40, 2:08, 2:06, 0:55 | 622,882 / 934,323 | 1,245,764 / 1,557,204 |
| in-Full-Burst, Cinderella windows — e.g. 2:32, 2:30, 2:00, 1:58, 1:56 | 1,678,352 / 2,237,803 | 2,797,253 / 3,356,704 |

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

| banner (clock) | batch size (deferred model) | body (sim today) | crit YES ×1.333 | core YES ×1.667 | both ×2.0 |
|---|---|---|---|---|---|
| 2:54 (Rapi window 1) | 2 | 2,298,943 | 3,065,258 | 3,831,572 | 4,597,887 |
| 2:38 (Cinderella 1) | 10 | 2,199,601 | 2,932,802 | 3,666,002 | 4,399,203 |
| 2:20 (Rapi 2) | 5 | 2,298,421 | 3,064,562 | 3,830,702 | 4,596,843 |
| 2:04 (Cinderella 2) | 10 | 1,958,166 | 2,610,888 | 3,263,610 | 3,916,332 |
| 1:45 (Rapi 3) | 4 | 2,298,943 | 3,065,258 | 3,831,572 | 4,597,887 |
| 1:27 (Cinderella 3) | 11 | 1,958,240 | 2,610,987 | 3,263,734 | 3,916,481 |
| 1:08 (Rapi 4) | 4 | 2,298,943 | 3,065,258 | 3,831,572 | 4,597,887 |
| 0:51 (Cinderella 4) | 11 | 1,958,240 | 2,610,987 | 3,263,734 | 3,916,481 |
| 0:32 (Rapi 5) | 4 | 2,582,396 | 3,443,194 | 4,303,993 | 5,164,791 |
| 0:15 (Cinderella 5) | 11 | 1,958,240 | 2,610,987 | 3,263,734 | 3,916,481 |

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

| signature | deferred (sim today) | instant (datamine) |
|---|---|---|
| explosion-class popups DURING any window | none, ever | yes: ~5 right after Rapi's own banner (her stage-3 batch), then ~3–4 more at ~2-second spacing through the window; ~3 during each Cinderella window |
| batch size at Cinderella banners (2:38, 2:04, 1:27, 0:51, 0:15) | ~10–11 popups | ~1–2 popups |
| batch size at Rapi banners | ~2–5 popups | ~1–2 at the banner, then the ~5-batch immediately after |
| final 15 seconds (inside Cinderella's last window) | the last window's attaches never explode | ~3 explosion popups before 0:00 |

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
