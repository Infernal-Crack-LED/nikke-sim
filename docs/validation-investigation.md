# Sim-vs-real validation investigation (working doc)

Goal: find the remaining systemic differences between sim and real solo-raid results.
All real samples: **scope lock, 100% core uptime**, site defaults (doll on, Resilience L15, OL0, 3★ core 0, lvl 400 in sim).

CLI repro template:
```
npm run sim -- <slugs in slot order> --element <BOSS element> --core-rate 1 --doll yes --cubes resilience@15
```
Note: `--element` takes the BOSS element (the site's "weakness" picker maps weakness→boss: weakness Iron → boss Electric, etc.)

## Real samples vs sim (state as of 2026-07-12 end of session)

### T1 — wind weak (boss Iron): anis-star, mast-romantic-maid, crown, scarlet-black-shadow, liberalio
real total 4,451,223,518
| unit | real | sim | ratio |
|---|---|---|---|
| scarlet-black-shadow | 1,964,356,603 (44.13%) | 2.80B | **1.43** |
| liberalio | 1,142,469,032 (25.67%) | 1.04B | 0.91 |
| anis-star | 916,819,928 (20.60%) | 966M | 1.05 |
| crown | 278,575,442 (6.26%) | 292M | 1.05 |
| mast-romantic-maid | 149,003,513 (3.35%) | 140M (after hit-rate fix) | 0.94 ✓ |

### T3 — fire weak (boss Wind): little-mermaid, crown, rapi-red-hood, mihara-bonding-chain, helm
real total 2,799,179,586
| unit | real | sim | ratio |
|---|---|---|---|
| rapi-red-hood | 985,340,728 (35.20%) | 1.18B | 1.20 |
| mihara-bonding-chain | 915,651,002 (32.71%) | 1.38B | **1.51** |
| little-mermaid | 509,505,044 (18.20%) | 570M | 1.12 |
| crown | 215,495,230 (7.70%) | 238M | 1.10 |
| helm | 173,187,582 (6.19%) | 267M | **1.54** |

### T4 — water weak (boss Fire): anis-star, crown, snow-white-heavy-arms, privaty, helm
real total 4,813,781,181
| unit | real | sim | ratio |
|---|---|---|---|
| snow-white-heavy-arms | 1,837,128,591 (38.16%) | 2.84B | **1.54** |
| anis-star | 1,128,483,012 (23.44%) | 1.14B | 1.01 ✓ |
| privaty (Treasure) | 1,104,217,650 (22.94%) | 1.58B | **1.43** |
| helm | 374,735,080 (7.78%) | 651M | **1.74** |
| crown | 373,216,848 (7.75%) | 336M | 0.90 |

### T2 — elec weak (boss Water): anis-star, crown, neon-vision-eye, cinderella, maiden-ice-rose
real total 4,274,656,657
| unit | real | sim | ratio |
|---|---|---|---|
| neon-vision-eye | 1,474,983,283 (34.51%) | 1.60B | 1.08 ✓ |
| cinderella | 1,368,483,883 (32.01%) | 918M (after ×10 + HP-ATK fixes) | **0.67 — still UNDER** |
| anis-star | 984,995,678 (23.04%) | 1.27B | **1.29 — only hot when ADVANTAGED** |
| maiden-ice-rose | 251,154,035 (5.87%) | 211M (after MP gating) | 0.84 ✓ |
| crown | 195,539,778 (4.57%) | 251M | 1.28 (hot in this fight only) |

## Findings from the kit-by-kit pass (2026-07-12, post-compact)

Lab tool: `npx tsx scripts/experiment.ts` — runs the sample comps with in-memory-patched
overrides and prints per-unit sim/real ratios per hypothesis variant.

**FIXED (engine): Sustained/True Damage ▲ were applied to ALL damage.** `dealDamage` added
`sustainedDamagePct`/`trueDamagePct` to the damage-up bucket unconditionally; they now gate on
hit flavor (like distributed). Parser now emits `flavor: 'sustained'`; Mihara + ARB override
dots flavored; validator FLAVORS set updated. Mihara T3 baseline 1.51 → 1.42 (her S2 sustained
buff no longer multiplies her normals/dumps).

**REFUTED (by user): parts-split theory.** Distributed damage deals the same TOTAL against 1
target as against 10 — no splitting penalty vs a lone boss. Also all 4 real samples were run on
a boss with NO parts. Full-value distributed vs the boss is correct; do not revisit.

**Real-sample conditions (user-corrected, ALL 4 samples):** run by the user themselves under
the frontend's SCOPE LOCK preset — **no cube, NO doll, OL0, 3★ core 7, sync 400** — plus skills
10/10/10, treasure enabled, boss with no parts/adds, 100% core exposure. Sim repro:
`--core-rate 1 --copies 10 --doll no`, no cubes. The earlier tables (site defaults: Resilience
L15, doll 15, core 0) were the WRONG basis. Scope-lock ratios (after Liberalio fix below):
- T1: anis 0.95 · mast 0.86 · crown 0.92 · SBS **1.13** · liberalio 1.01 ✓
- T2: anis 0.98 ✓ · crown 1.14 · neon **0.84** · cinderella **0.53 COLD** · maiden **1.49?**
- T3: LM 1.03 · crown 1.06 · RRH 0.94 · mihara **1.19** · helm **1.42**
- T4: anis 0.95 · crown **0.71 COLD** · SWHA **1.31** · privaty 1.17 · helm 1.15
The old ×1.4-1.7 hot cluster was mostly a loadout-basis artifact.

**RESOLVED Q2:** the advantaged-Anis anomaly was the loadout basis — at scope-lock basis she is
0.95/0.98/0.95 everywhere, advantaged or not. The elemental bucket is fine.

**FIXED: Liberalio 0.70 → 1.01.** Implemented the user's future.md TODO: S1 'Activates 5 times'
= 5 hits per full charge (40.5 → 202.5 per shot) and the 20.83% Attack-Damage rider core-gated
via a new block-level `requiresCore` flag (inert at core-rate 0). Validated by the T1 sample.

**FIXED: SWHA 1.31 → 0.99.** Fully Active is now a weaponSwap on burstCast (charge fixed at
3.2s, 6.5s = exactly 2 rounds, 528% charge buff covering both) — the old lump model left
phantom 1.2s-cadence shots in that window. Validated against BOTH real T4 runs.

**T4 REPLICATED by the user (2026-07-12):** total 4,811,580,375 vs original 4,813,781,181 —
every unit within ±3% (crown 374.9M vs 373.2M). Run-to-run noise is ~1-3%; outliers are real
modeling gaps. Post-SWHA-fix T4 ratios: anis 0.96 · crown 0.71 · SWHA 0.99 ✓ · privaty 1.13 ·
helm 1.17.

**Crown-T4 0.71 is reproducible.** Sim gives her 4300 pulls in T4 (vs 5737/6224 in T1/T3)
because Privaty's FB Max Ammo ▼50.66% halves her belt; yet REAL crown does BEST in T4
(375M vs 279/215M). Discriminating run requested: T4 with privaty → liberalio swap — if real
crown falls to ~sim level, the ammo-cut modeling (or an in-game exception to it) is the gap.

**FIXED: Mihara 1.19 → 1.03.** Rebuild-aware Ensnaring baseline (270.9%/s = avg ~10.8 stacks;
burst delta 730.1) derived from kit text — her burst cancels stacks, +10 from the Restraint dump
at FB end, +1/40 normals during FB. Stacks are NOT observable in-game (enemy-side debuff, user
confirmed), so first-principles it is.

**T5 wind-weak probe (user, 2026-07-12): nayuta, CCW(MG), anis-star, liberalio, velvet, boss
Iron.** Real: nayuta 891.8M · CCW 1189.7M · anis 721.9M · liberalio 1042.2M · velvet 188.9M
(total 4.035B). Ratios: nayuta 1.15 · CCW 1.08 · anis 0.99 ✓ · liberalio 1.10 (202.5% fix holds
independently) · velvet 1.94 → **1.50 after fixing her draft** (S1's ATK/AD +30.5% was ignoring
its 'while NOT in Full Burst' gate — new block-level `fbGate: inFb|outFb`; also hitCount 100→50).

**CONFIRMED & FIXED: standard-SR fire cycle (helm 1.40 → 0.99, velvet 1.50 → 1.05).**
All runs are FULL AUTO (user: no manual control anywhere), so it is not player-vs-AI. The real
SR cycle ≈ 1.0s charge + ~0.5s bolt recovery; the synergy DB records only the charge for some
SRs (helm, velvet: 60 frames) but the full cycle for others (liberalio: 90). New override field
`charFixes: { chargeFrames }` patches weapon data; helm+velvet set to 90. Validated: helm 0.99
(neutral T6) / 1.01 (T3) / 0.89 (T4, ammo-cut-distorted), velvet 1.05 (T5). SWHA's kit-fixed
1.2s charge seems cycle-inclusive (0.99-1.11 without a fix).

**T6 neutral run (user, all-auto): crown, RRH, LM, SWHA, helm — no elemental advantage.**
Real: crown 221.1M · RRH 1024.8M · LM 499.8M · SWHA 1147.5M · helm 186.7M (total 3.06B).
Ratios: crown 0.99 ✓ · RRH 0.91 · LM 1.15 · SWHA 1.11 · helm 1.40→0.99 after charfix.

**CONFIRMED: crown-T4 0.71 is caused by Privaty's Max Ammo ▼ modeling.** Crown validates
0.92/1.06/1.14/0.99 in every fight without Privaty; 0.71 only with her. Sim's penalty stack:
halved belt → more reloads → FULL MG spool reset each reload (3.75s cubic re-ramp). Lab test:
keeping spool through reloads overshoots (0.71 → 1.36), so reload does reset wind-up in-game —
the gap is somewhere in the cut/spool/reload interaction. OPEN QUESTION for user: does Max
Ammo ▼ clip the CURRENT belt or only cap the next reload? Does MG wind-up reset on reload?

**MECHANICS CONFIRMED BY USER (2026-07-12):** (a) Max Ammo ▼ clips the CURRENT belt when it
lands — implemented (engine clamps ammo on negative maxAmmoPct application); (b) max-ammo
sources stack ADDITIVELY (maxAmmo() already sums pcts — critical when OL ammo lines arrive);
(c) MG wind-up DOES reset between reloads (sim behavior was already correct). Crown-T4 0.71
therefore remains open: real mechanics are as-simmed-or-harsher, yet real crown does BEST in
the privaty comp. Remaining suspects: spool ramp shape (3.75s cubic may over-penalize short
belts) or privaty/helm team buffs under-modeled for MG normals specifically.

**T7 elec-weak probe (user, all-auto): crown, RRH(Λ), anis-star, cinderella, mast — boss Water.**
Real: crown 290.3M · RRH 1150.9M · anis 874.0M · cinderella 1278.4M · mast 130.5M (3.72B).
Ratios: crown 0.96 ✓ · RRH 0.85 · anis 1.00 ✓✓ (advantaged; elem bucket re-confirmed) ·
**cinderella 0.55 — reproduced in a clean comp, it IS her kit** · mast 0.84 (consistently cold:
0.86 T1, 0.84 here — never-bursting in both).

**Cinderella lead: DB row is a full Defender statline (hp 16500/atk 400, identical to Crown).**
If she is really an Attacker (hp 13500/atk 600 + Attacker gear), ratio 0.55 → 0.64 only (the
HP→ATK conversion partly offsets) — so BOTH the class question AND a ~×1.5 kit undercount are
open. Standing kit candidates: the 10-rocket burst coring at 100% core (flatDamage core:true),
the 28.9%×12 mirror as per-hit, real charge cadence faster than chargeFrames 60.

**Maiden did NOT burst in the real T2 run (user-confirmed)** → sim must model her without the
queue jump: maiden ratio is 0.60 COLD, not 1.49. T2 is now a wholesale-cold fight (sim/real:
anis 0.98 · crown 1.14 · neon 0.87 · cinderella 0.53 · maiden 0.60; team ≈ 0.78) — the
elec-weak comp needs its own pass once the clean Cinderella probe run arrives (user prepping).
User confirmed the T2 unit is BASE cinderella (Electric Pilgrim), not Crystal Wave.

**Maiden 1.49 caveat:** sim (with mpPriority) has her burst ONCE at 12 MP for a 205M nuke;
real 251M total vs sim 374M. Everything hinges on whether/when she burst in the real run —
if she never burst, sim-no-burst is ~169M (0.67 the other way). ASK the user.

Remaining outliers, worst first: cinderella 0.53 (candidates: nuke core/crit at scope lock,
28.9%×12 per-hit reading, charge cadence — sim gives her only 288 shots at chargeFrames 60),
crown-T4 0.71 (reproducible; see above), helm 1.42(T3) vs 1.15(T4) (fight-varying; her normals
model), maiden 1.49? (burst timing question), mihara 1.19 (≈ stack rebuild, honest model →
~1.05), neon 0.84, mast 0.86, SBS 1.13, privaty 1.13.

**Mihara residual is her stack rebuild.** Honest modeling (Ensnaring cancelled at burst, +10 from
Restraint dump at FB end, +1/40 normals during FB → avg ~10-12 stacks between bursts) lands
1.22–1.26 after the sustained fix. The rest is probably the T3 downtime floor (below).

**Helm is NOT her 178.98% proc — her normals are hot.** Deleting the proc entirely still leaves
1.10 in T4 (sim normals 412M alone > real 375M total). Sim gives her 146-153 shots/180s (~1.2s
per shot incl. reloads). Suspects: real fire cadence slower (target re-acquisition, animation
gaps), or a charge-bucket error, or real-sample Helms below max treasure. T3-vs-T4 ratio delta
(1.54 vs 1.74) ≈ the 1.1 elem factor, unexplained.

**Per-fight downtime floor.** T3's hand-validated units ALL read 1.10–1.20 (RRH 1.20 here but
~1.0 in her dedicated sample fight) → that real run likely had ~10-15% downtime. T1/T4 floors
≈ 1.0. Compare SHARES, not absolutes, to normalize this. Downtime-normalized, Mihara-with-rebuild
≈ 1.05-1.1 and Helm T3 ≈ 1.34 (still hot).

## Burst-cast ordering fix (2026-07-12, late session)

**FIXED (engine): stage-3 burst damage fired BEFORE full burst existed.** Old order: caster's
burstCast blocks (incl. nukes) → stageEnter(3) → fbEndFrame set → fullBurstEnter. Nukes missed
the +50% FB bonus, same-cast stageEnter buffs (Cinderella's Max-HP→ATK!), and FB-enter team
auras (Crown's FB-start casterAtk). New order: FB begins → stageEnter(3) → fullBurstEnter
auras → storedHit release → caster's burstCast blocks. Stages 1/2 unchanged (pre-FB is correct).
Effect: **cinderella 0.55 → 1.09 (T7) / 1.16 (T2)** — this was her whole gap (class is genuinely
Defender, user-confirmed; her burst rockets do NOT core, only normals, also confirmed — both
already modeled). RRH 0.85→0.96 (T7), 1.05 (T6), 1.12 (T3).

**OPEN: aura-snapshot ordering.** Units whose overrides were authored against the buggy pre-FB
nukes now read hot with auras included: SWHA 1.42/1.43 (her Fully-Active lump), CCW 1.33,
privaty 1.29, liberalio 1.16/1.16. The nuke-BEFORE-auras variant lands them 1.03-1.28 but drops
cinderella to 0.75/0.81. ASK USER: does Crown's FB-start ATK buff catch the same-rotation B3
nuke, or does the nuke snapshot first? If auras-included is right (crown-synergy lore says yes),
SWHA's lump / CCW burst / privaty dot / liberalio values need re-derivation, not the engine.

**Cinderella cadence (user): custom wind-up** — first rocket 1s charge, then Charge Speed +100%
(0.5s/rocket) until a max-ammo reload. The override's permanent +80% approximates this well
(~288 vs 291 shots); revisit only if charge-speed OL lines land on her.

Current board (scope-lock basis, all fixes): T1 0.95/0.86/0.92/1.13/1.16 · T2 0.98/1.14/0.87/
1.16/0.60 · T3 1.02/1.01/1.12/1.04/1.01 · T4 0.94/0.71/1.42/1.29/0.92 · T5 1.13/1.33/0.97/
1.16/1.05 · T6 0.98/1.05/1.15/1.43/0.99 · T7 0.96/0.96/1.00/1.09/0.84.
Cold: maiden-no-burst 0.60, crown-w/privaty 0.71, mast 0.84-0.86, neon 0.87.
Hot: SWHA 1.42 (lump), CCW 1.33, privaty 1.29, SBS 1.13, LM 1.15, nayuta 1.13.

## Prydwen-sourced fixes (2026-07-12, late session; autonomous Wayback route)

Prydwen blocks direct fetch (Cloudflare 403) but Wayback snapshots work:
`curl "http://archive.org/wayback/available?url=prydwen.gg/nikke/characters/<slug>"` then curl the
snapshot URL and strip tags. CCW is too new for a snapshot (user will paste); privaty's treasure
kit lives at slug `privaty-treasure`.

**FIXED: SWHA 1.42/1.43 → 1.07/1.15.** Prydwen (quoted): the Fully-Active "Sequential attack
damage ▲158.4%" is "(ATK DMG)" — an Attack-Damage-BUCKET buff "diluted by ... other support
buffs", NOT a flat ×2.584 on the volley. Also confirms "528% Charge Damage (making it 778%)"
(additive charge points ✓) and 5 rounds/volley, 15 in Fully Active, all landing on a lone boss.
New model: `sequential` hit flavor + `sequentialDamagePct` stat (dilutes at deal time), lump =
2×(1583.85−527.95) = 2111.8.

**CONFIRMED (Prydwen, liberalio): burst nukes get FB multiplier + FB-entry buffs** — "Her Burst
is a delayed wipe, which means it benefits from Full Burst multiplier and all 'Upon entering
Full Burst' buffs" — independent confirmation of the frame-0 ordering fix. Their nuke math
925 × 1.5 × 2.6 × 4.018 decodes: 4.018 = 1+(231+50+20.83)/100 = our dmgUp bucket exactly.

**OPEN: the ×0.59 proc factor.** Scaling privaty's S2 procs (Designated 1687 + last-bullet
256.17) by 0.59 lands 1091M vs 1104M real; scaling liberalio's S1 procs by 0.59 lands 1141M vs
1142M real; SWHA's dwarves needed the same 0.59 before the mechanism was found. But helm's
178.98 and anis-star's 120.13 full-charge procs validate at FULL value (0.95-1.01) — so it is
NOT a universal additional-damage rule. Distinguishing feature unknown. 1.8/… ≈ the FB+range
major (1/1.7) — one candidate: some proc types don't receive the +50% FB / +30% range major.
Privaty's treasure page confirms our Designated cadence (3 triggers per her FB w/ reload buff).

Board after all fixes: T1 0.95/0.86/0.92/1.13/1.16 · T2 0.98/1.14/0.87/1.16/0.60 ·
T3 1.02/1.01/1.12/1.04/1.01 · T4 0.94/0.71/1.07/1.29/0.92 · T5 1.13/1.33/0.97/1.16/1.05 ·
T6 0.98/1.05/1.15/1.15/0.99 · T7 0.96/0.96/1.00/1.09/0.84.

## The two open systemic questions

### Q1: fresh agent drafts cluster ×1.4–1.7 hot (SBS 1.43, Mihara 1.51, SWHA 1.54, Privaty 1.43, Helm 1.54–1.74)
Every unit hand-validated against real data lands 0.84–1.2; every untouched draft is ~1.5 hot. Tested and REJECTED:
- "riders get no major-modifier bonuses (no FB +0.5 / range +0.3)": would push Anis: Star (currently 1.01 via her rider-heavy kit) down to ~0.77. Dead.
- "riders lose only the +0.3 range bonus": ÷1.2 — helps but doesn't reach 1.5, and Anis contradicts it partially.
Leading candidates (likely a MIX of per-kit optimism, since the validated riders behave):
- Mihara: permanent 20-stack Ensnaring baseline (real stacks rebuild after every burst spend — the draft itself flags this optimism). Test: halve the 501.6%/s baseline DoT → ratio should drop ~1.5→~1.2.
- SWHA: the 527.95%-per-shot dwarves lump and the 7129% burst lump arithmetic (agent-derived, unverified).
- Helm: base-scaled charge buff (158.4%×2.5) at full uptime + all-phase assumption; she's 1.54 AND 1.74 in two different fights — most-over unit, never bursts in either comp, so it's her normals/skill, i.e. charge bucket or the 900%-ish procs.
- Privaty: Designated-window dot cadence (3 ticks × 1687%) may be optimistic; also 256.17% fires on every own last bullet — verify magazine cadence.
- SBS: hitCount:6 blend (bakes burst-window tripling); rockets may not core (her normals 1.26B assume 100% core).
**Decisive data ask: one real per-source breakdown (normals vs skills) for SBS or SWHA.**

### Q2: advantaged-Anis anomaly
Anis: Star runs 1.01–1.05 in fights where she is NOT elementally advantaged (T1, T4) but 1.29 when advantaged (T2). Crown also 1.28 in T2 only (0.9–1.1 elsewhere). Neon:VE (also advantaged, same fight) is 1.08.
- Hypothesis A: T2's real fight simply had more downtime/deaths → all real numbers lower → the "accurate" units read hot uniformly. (Cinderella being UNDER in the same fight weakens this only slightly since her kit is separately broken.)
- Hypothesis B: the elemental bucket overshoots for some units (cube "damage as strong element" 19.09% may not stack additively with base 1.1 the way we model, or the elem line doesn't apply where we think). Neon:VE at 1.08 argues against a universal elem problem.
- Decisive data: a second real sample with advantaged Anis: Star, or her per-source split.

## Known-good reference points (do NOT re-litigate)
- Projectile bucket = own multiplier, flavored hits only (validated: RRH 31.8 vs 31.6 real).
- Formation gates exclude self; gauge builds only outside FB; B1-CD-gated uptime (~2-3s rebuild for good teams).
- Mast hit-rate self-penalty −40%; Maiden MP (stackedNuke, she usually bursts ≤1×/fight); CCW modes (MG default matched 35.79% real).
- Collection-item / Helm-burst charge scaling = base-multiplied (chargeDamageMultPct).
- Treasure kits: privaty/tove/zwei/moran remapped in sync.ts TREASURE_SYNERGY_IDS.

## Cinderella residual (0.67, UNDER)
Fixed already: burst ×10 sequential (14,006% total), ATK = 3.23% maxHp on stage-3, charge ramp +80%, gear+doll HP in maxHp.
Remaining candidates: her 10-hit nuke critting/coring at core 100% (flatDamage core:true would add ~×1.5 to the nuke — plausible: "random enemies" vs a lone boss with exposed core); the 28.9%×12 Beautiful mirror being per-hit (+3468% not +346.8%); real builds stacking more HP than our uniform loadout. Ask for one real per-burst hit number.

## Test queue given to the user (their own runs, known loadouts — kills the investment confound)
1. Controlled T4 re-run (anis-star, crown, SWHA, privaty-T, helm-T) + exact loadouts.
2. SBS comp on a boss WITH parts vs one WITHOUT (or its part count) — parts-split discriminator.
3. Mihara run watching her Ensnaring stack icon after her burst (reset to 0? rebuild time?).
4. Asks: which bosses the 4 samples were + part counts; deaths/downtime in each real run.

## Tools
- `npx tsx scripts/kit.ts <slug>` — kit text + parsed blocks + warnings
- `npx tsx scripts/validate-overrides.ts <slug...>` — schema + smoke sim
- `npm run sim -- ... --rotation` — burst timeline; `--coverage` — parser health
- Overrides: `src/skills/overrides/*.json`; engine: `src/engine/sim.ts` (dealDamage = bucket math); guide: `docs/override-guide.md`
