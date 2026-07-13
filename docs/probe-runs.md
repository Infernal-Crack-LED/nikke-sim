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
  fixed — run A's rotation now correct via her noB1 branch). Her ATK riders proven
  formation-INDEPENDENT (run C: identical real output with Tia present) — ungated ⚑.
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
