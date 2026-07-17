# Deep-dive brief: probe residuals vs hidden NIKKE mechanics (post-compact mission)

> **EXECUTED 2026-07-13.** Results: docs/probe-runs.md "DEEP-DIVE PASS" section (board v7) and
> docs/open-questions.md A11-A16 / U8-U10. Headlines: U1 mechanism solved (function-damage
> procs crit/never core/never range, datamined); run A solved (subtractive charge formula +
> decoded Red Wolf 200rpm window; red-hood 0.36→0.92, alice 0.59→1.15); maiden x0.68 = auto
> full-charge rate (solo 1.01); gauge model rebuilt on the datamined per-hit table; auto-aim
> core floor 0.85 ⚑; July-2 patch values pinned (blablalink lags). Key repos found:
> github.com/d34d633f/nikke-einkk (frame-accurate reference sim) and
> github.com/rcasdzxc/SD + coolguydlm123/nikkecsvlibrary (decoded game tables) — evidence
> files saved in the session scratchpad. Remaining: U8 rotation ground truth (runs B/E/G/I),
> T4 comp-wide 0.88, eunhwa railgun-core question, U9 full-charge-rate generalization.

Mission (user, 2026-07-13): with the 9 probe runs scored, do a DEEP investigation of the
remaining sim-vs-real residuals — probe stats vs sim internals vs anything findable online
about NIKKE combat interactions, bugs, and hidden mechanics. ~4 hours, no session limit.

## Ground rules — what is MEASURED (do not refit)
- MG wind-up ladder: docs/nikke_mg_windup_model.md (frame-measured). Wind-up skipped when
  reload-speed buffs >100% at reload (user). Max Ammo ▼ clips current belt; additive stacking.
- SR fire cycle = 1.37s: 60f charge + 22f bolt recovery (frame-measured from
  docs/"helm 2 6 mag rotations.mov"); reload starts immediately after final shot; swap states
  exempt; SWHA/liberalio DB values cycle-inclusive (charFixes.noBoltRecovery).
- Test-boss range script + per-band weapon range eligibility + RL-never + 1s unhittable
  windows w/ <=1s-reload snap-refill: engine BOSS_RANGE_SCRIPT (user-measured;
  docs/data/range_data.md exists in repo).
- Frame-0 rule: ALL full-burst buffs apply before any burst damage. Burst nukes get FB
  multiplier + FB-entry auras + same-cast stage buffs.
- Distributed damage: full listed total regardless of target count.
- Λ units count as NO burst type in formation checks. Anis:Star CDR AND ATK riders are
  noB1-gated; Tia is "B1+" (re-entry B1) — tia+anis interaction deliberately unmodeled,
  probe run C excluded for anis DPS.
- Sustained/True/Sequential Damage ▲ gate on hit flavor. Riders never core, never range.
- Prika-first duet rule (burstFirst); reenterStage mechanic (Tia, Anis Everyone's Star).

## Calibrated ⚑ (legitimate refit targets if a mechanism is found)
- U1 proc classes: exempt (noFb; privaty, liberalio, LM sequentials, SBS, maiden, jill-dot)
  vs full-majors (helm, anis-star, neon-VE, ein). MECHANISM UNKNOWN — deep-dive target.
- GEN_SCALE 1.4 on shot-based gauge (skill hits generate in-game, rates unknown).
- SG_OUT_OF_NEAR_HIT_FRACTION 0.3 (pellet falloff; calibrated naga/dorothy/noir).
- MG first-18-rounds-no-core (wind-up bloom estimate).
- eve Mk2 sequential doubling via sequentialDamagePct (~20% conservative).
- soda chip economy averages; mihara 12-stack rebuild average; asuka heal-trigger permanence.

## Residual targets, best evidence first (sim/real; see docs/probe-runs.md RESULTS)
1. **red-hood 0.36 + alice 0.59 (run A, both COLD)** — real RH topped the run (853.3M!), real
   alice 403.9M. Sim underestimates the mint+prika-duet SR carries ~2x. Leads: Red Wolf swap
   values (51.46%/shot seems low for her identity — check per-shot vs per-hit, her burst nuke
   1455?/x3 parts), mint's 85.42%-crit snapshot + duet charge buffs interacting with charge
   quantization, alice charge-speed breakpoints (frame quantization of 60f/(1+cs) — community
   documents breakpoints), quick-charge behavior on auto.
2. **run B gauge residual (trina 2.55, cindy 1.49, neon 1.57)** — sparse 4-unit comp; real ran
   far slower than shot-based-gauge×1.4 predicts. Leads: burst-gen per-hit decay/normalization
   (community: gen depends on hit count per unit time?), charge weapons generating on charge
   RELEASE only, gen values per weapon class tables online. Note trina also carries her own
   kit risk (everyN-gated buffs?).
3. **jill 1.94** — exempt-class barely moved her (2.09→1.94): heat is NOT dot majors. Leads:
   acid dot may not refresh per reload (one 30s window per...?), her burst forced-reload
   economy, or the dot value is per-tick-but-lower-level in practice. Community jill guides.
4. **eunhwa-TU 1.42** — after swap-cadence fix. Leads: her Explosive-Round taken-debuff
   (27.87 per hit — may be once), AS-Formation self ATK uptime, swap shots maybe don't crit.
5. **rouge-E 1.27 / crown-E 1.28 vs cinderella-E 0.63** — comp-internal transfer: sim gives
   supports too much personal damage, cindy too little, in the SAME run where run-B cindy is
   1.49 HOT. Leads: rouge coin-stage timing, crown MG in elec comp, cindy burst-order/rotation
   in 3xB3 comps (who actually burst in real?).
6. **takina-G 0.62 COLD** — her trueNormals swap + S2 cooldown-average may undercount; or her
   real swap uptime higher (20s CD B2 bursting every rotation?). Run G also has DKW 1.01 ✓,
   milk 0.49 (accepted), maxwell 0.81 ⚑, liberalio 0.77.
7. **maiden ×0.68 proc (U2)** — solo run: real 76.6M vs sim 96.1M; proc portion real ≈41M vs
   sim 61M. Candidate: proc ICD, or twin-rocket = 2 attacks with only ONE proccing (547.62/2
   per shot?? = ×0.5, close to 0.68 with noise), or charge-time quantization on her 0.5s ramp.
8. Mild: xGuillo 1.30, chisato 1.23, grave 1.19, helm-D 1.19, mint-A 1.18, tia 1.13,
   quency 0.86, ein-E 0.79/ada-E 0.83 (E might be comp-wide cold — check total).
9. **U1 mechanism** — what separates exempt procs from full-major procs? Ein's feathers
   officially FB-boosted-but-range-exempt (Prydwen). Find the community damage-formula
   write-up covering "additional damage" typing.

## Research avenues (online)
- Wayback-fetch route for Prydwen: scripts/prydwen-fetch.sh (direct = Cloudflare 403).
  Reviews already cached in /tmp/pryd-*.txt (may be gone) and scratchpad.
- Community damage formula docs: NIKKE "damage formula" spreadsheets (biggysheet?), reddit
  r/NikkeMobile mechanics posts, nikke.gg / game8 / dotgg guides, YouTube frame analyses.
  WebSearch + WebFetch work; archive.org for blocked sites.
- Known-bug lists: charge-speed frame quantization breakpoints, attack-speed caps, burst-gen
  normalization, FPS dependence (Min Firing Rounds setting), auto-aim/cover behavior on auto,
  snapshotting rules for buffs on projectiles in flight.
- blablalink (official) skill data already synced for exact per-level values.

## Method
- Lab: scripts/experiment.ts (7 validated fights + PA-PI probe comps with modes/lambda
  wired; report() prints shots/n/s/b/ratio; patch overrides in-memory via Patch fns).
- Per-unit: npx tsx scripts/kit.ts <slug>; overrides in src/skills/overrides/*.json;
  validator scripts/validate-overrides.ts <slugs>. Engine: src/engine/sim.ts.
- Record: probe findings → docs/probe-runs.md; mechanics answers → docs/open-questions.md;
  per-unit → docs/handoffs/closed/tier-audit.md. Flag every calibration ⚑. Rebuild site (npm run web:build +
  node scripts/web-smoke.mjs) after engine/override changes; full validator sweep at the end.
- Scope-lock repro: --core-rate 1 --copies 10 --doll no, no cubes; CLI supports 1-5 units.
- Branch site-auth-deploy, everything uncommitted (user's call; do not commit).

## Accepted / excluded
milk-BB cold (auto underperformer, accepted). Run C excluded for anis (B1+ edge case).
Miranda:T/Exia:T/asuka/rei not owned. maxwell 0.81 slight over-correction accepted-flagged.
