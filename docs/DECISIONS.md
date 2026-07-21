# DECISIONS.md — the WHY log (do not re-litigate)

Settled tradeoffs and rulings, dated, with the evidence that settled them. A future session that
wants to reverse an entry needs NEW evidence of at least the same tier (see
[CONVENTIONS.md](CONVENTIONS.md) for evidence tiers). Backfilled 2026-07-13 from the session record
and the ANSWERED trail in [open-questions.md](open-questions.md); each entry cites where its proof
lives. Newest first within each section.

## Modeling rulings (owner)

- **(2026-07-21) tove: 3 datamined SG-team lines enacted (Temp Mod max-ammo + SG attack-speed + SG
  burst-ATK) — LANDED (autonomous submission-review session; Fable pre-op APPROVED-WITH-REVISIONS/HIGH;
  owner-authorized enactment; board-neutral).** `tove` (AR/Water/Supporter/B1). Three datamined lines had
  been INERT in `unmodeled` — skipped only for now-removed technical reasons ("maxAmmoPct is percent not
  flat"; "no weapon-typed target"). The engine since gained `maxAmmoFlat` (noir/grave) and `alliesOfWeapon`
  (leona/arcana/drake), so this executes the DECISIONS-queued tove SG reconciliation (not a re-litigation).
  Enacted: (1) S1 Temporary Modification Max Ammo +2/stack×3 = `maxAmmoFlat 6` to ALL allies (passive/steady-
  state-max-stack); (2) S2 (max-stack gated) `attackSpeedPct 42.24` to alliesOfWeapon SG (passive); (3) burst
  `casterAtkPct 72.63` (24.21×3, 15s) to alliesOfWeapon SG (burstCast) — co-stacks additively with the
  existing all-ally 6.96 line (buff-key embeds value → no same-slot overwrite; DBG-verified 79.59% on SG
  allies). **Evidence:** premise-gate (blind) confirmed all 3 values verbatim from characters.json + no
  forbidding ruling; the max-ammo line is VIDEO-CONFIRMED (community submission 2026-07-15-1754-req1-tove,
  HIGH conf: +6 mag on every ally, incl. non-SG nayuta 120→126); the 2 SG-buff magnitudes are DATAMINED-only
  (community footage gear-confounded — same tier as other landed datamine-faithful lines; zero free knobs).
  **Board-neutral:** tove in no graded comp → regression snapshot BYTE-IDENTICAL; verify.sh green.
  **Discriminating check (P2):** in the tove SG community comp the shares moved TOWARD the observed
  distribution on ALL 5 units (nayuta 21.5→13.5 [obs ~15], soda-twinkling-bunny 27.4→31.8 [obs ~30],
  dorothy-serendipity 26.6→29.6 [obs ~32], tove 5.1→3.3 [obs ~3.8]) — a faithful-mechanic signature, not a
  fit. Trail: `docs/handoffs/2026-07-21-tove-sg-team-fix-preop.md`, `src/skills/overrides/tove.json`.

- **(2026-07-21) guilty: S1 "duplicate the HIGHEST ally's ATK" → new `highestAllyAtkPct` stat — LANDED
  (kit-audit guilty #2; board-safe).** `guilty` (SG/Wind/B2, no-data). Her S1 "Mind If I Borrow This?:
  Duplicates 8.81% of the ATK of the ally with the highest ATK (×5 stacks)" was proxied as `casterAtkPct`
  (% of GUILTY's own ATK) — exact only when she is the top-ATK ally. New StatKey `highestAllyAtkPct` resolves
  at apply time to `(value/100) × max(all units' staticAtk)` and remaps to the flat-ATK path (feeds
  `effectiveAtk` exactly like `casterAtkPct`). **Basis = STATIC ATK** (per the caster-ATK convention; a live
  `effectiveAtk` ranking is a future refinement if measurement shows the duplicate tracks buffed ATK). Validated:
  guilty SOLO byte-identical (she is her own max → identical to the old proxy); in a synthetic team with a
  higher-ATK ally (scarlet-black-shadow 120367 > guilty 119667) her total rises 75.180→75.302M (buff now sizes
  off the higher ally — the faithful fix). **Board byte-identical** (guilty ungraded; no other unit uses the
  stat) — regression + verify.sh green. Trail: plan §guilty gotcha 2, types.ts `highestAllyAtkPct`, sim.ts value
  resolution + statKey remap.

- **(2026-07-21) Same-weapon flavor swaps (`trueNormals`) no longer grant free mag-refills — LANDED
  (kit-audit chisato #2; owner-ruled faithful fix).** The engine's generic `weaponSwap` refilled the mag to
  full on BOTH swap entry (sim.ts) and exit — correct for a REAL weapon swap (snow-white-heavy-arms cannon,
  moran unlimited-ammo, nayuta SR-mode: a fresh weapon), but WRONG for a same-weapon `trueNormals` flavor
  swap (`chisato`/`takina`/`laplace` — the gun never changes, only normals become true-flavored), which the
  kit grants no reload for. Guarded both refill sites on `!trueNormals`. **Board (isolated A/B, faithful>fit):**
  cools the over-modeled HOT **chisato 1.192→1.160**; drops **takina 0.975→0.936** (OK→COLD — her 0.975 was
  FLATTERED by the spurious ~2 free reloads/cycle on her 6-round SR mag; her kit also grants no reload, verified
  — so 0.936 is her faithful board and the COLD is now a separate under-model to chase). laplace no-data. Real
  swaps (snow-white-heavy-arms/crown) byte-identical; small teammate cascades in chisato/takina comps; all 12
  full-burst asserts green. No tuned value. Owner ruling: land the faithful fix. Trail: plan §chisato gotcha 2,
  sim.ts swap entry/exit guards.

- **(2026-07-21) Reload-triggered buff removal — new engine primitive `removeOnReload`, LANDED INERT;
  cinderella CS-toggle wiring HELD (awaiting owner + a gated CS-formula pass).** Built the capability the
  kit-audit plan (§cinderella gotcha #2) named: a `buff` effect may set `removeOnReload:true`, tagging the
  applied `BuffInstance`; a `stripReloadBuffs(u)` helper drops flagged buffs at the two genuine
  reload-to-max sites — natural magazine reload-completion (`sim.ts` ~2118) + the fast-reloader
  boss-transition snap-refill (~2092). Deliberately NOT stripped at weaponSwap start/end, `maxAmmoFlat`
  grants, `instantReload` skill refills, or per-shot ammoRefund top-ups (none are the weapon's own "reload
  to max ammunition"; site enumeration audited per Fable). **INERT:** no committed override sets the flag →
  regression snapshot BYTE-IDENTICAL, all 12 measured full-burst truths green; a dedicated functional test
  (`scripts/tests/reload-buff-removal.test.ts`, wired into verify.sh) proves the strip actually fires
  (in-memory cinderella toggle: strip-on 1536 pulls < strip-off 2376 — the per-magazine CS reset).
  **Why cinderella's CS was NOT re-wired (the intended consumer):** her S1 "Charge Speed ▲ 100%. …Removed
  upon reloading to max ammunition" stays the PERMANENT `chargeSpeedPct 45` proxy. Wiring the faithful
  toggle (shotFired → CS 100 + removeOnReload; every RL pull is a full charge) under the engine's SUBTRACTIVE charge formula
  floors CS-100 charges to 1 frame (no rate floor for RL) → ~1536 pulls/180s vs MEASURED ~315 → board
  0.937 COLD → **4.834 HOT** (measured on the wired toggle, 7 comps 3.14–7.07; her focus-charge gauge also
  cascades more FBs onto teammates). faithful>fit + measured>fudge ⇒ do NOT force a 5× regression. The
  measured cadence instead fits a DIVISIVE charge-speed formula at ~311/315 with zero free parameters — an
  engine-wide, HYPOTHESIS-strength finding recorded in open-questions **U25**, requiring its own gated pass
  (fresh context + Fable pre-reg + full-board A/B + owner). Under EITHER formula the removeOnReload
  primitive is the correct building block for her toggle, so it lands now; the CS wiring waits on U25 +
  owner. Trail: pre-reg `scratchpad/prereg-cinderella-cs-toggle.md`, Fable pre-op REVISE (site-audit +
  divisive-CS surfaced), plan §cinderella, cinderella.json caveat, open-questions U25.

- **(2026-07-20) eve: sequential-damage TRUE-multiplier bucket — new engine primitive `sequentialMultPct`,
  LANDED (kit-audit Phase A4; owner-authorized "confirmed, implement"; Fable pre-op APPROVE).** `eve`
  (AR/Iron/B3, the NieR: Automata collab Eve — NOT a variant; ungraded/no footage). Her burst "Exospine Mk2"
  reads "Damage multiplier of Unstable Energy sequential attacks is scaled by 100%" = a TRUE ×2 on her
  sequential-flavored damage. It was wired as a self-buff `sequentialDamagePct +100` living in the SHARED
  additive Damage-Up bucket — a clean ×2 SOLO, but it DILUTED below ×2 whenever any other Damage-Up buff was
  live (with an ally attackDamagePct 50: 2.5/1.5 = 1.667, not 2), the documented ⚑. **Fix (capability, not a
  board-fit):** added a NEW stat `sequentialMultPct` in its OWN multiplicative bucket (engine `seqMult`,
  `sim.ts` dealDamage — `seqMult = opts.sequential ? 1 + stat(u,'sequentialMultPct',frame)/100 : 1`,
  multiplied into the dmg product alongside charge/projFactor), applied ONLY to sequential-flavored hits;
  rewired eve.json's Mk2 buff `sequentialDamagePct → sequentialMultPct` (value 100, 10s). **Why a NEW stat,
  not repurposing `sequentialDamagePct`:** that stat has exactly two users — eve AND
  `snow-white-heavy-arms`, whose "Sequential Attack Damage ▲158.4%" is a Prydwen-confirmed, board-validated
  (1.31→0.99) ADDITIVE Damage-Up buff that SHOULD dilute; repurposing would have silently broken her. swha's
  path is untouched. **Validation (eve is ungraded → solo unit-test, not board):** synthetic-block invariant
  test proved the 720% Unstable Energy proc is EXACTLY ×2 with Mk2 (soloRatio 2.000000) AND does NOT dilute
  against a synthetic extra Damage-Up buff (nonDilRatio 2.000000, vs additive's 1.666667); normal attacks
  stay ×1 under Mk2 (same code path that keeps her unflavored burst nuke undoubled — kit doesn't say to
  double the nuke). Board-read BYTE-IDENTICAL for every graded unit; regression snapshot byte-identical (eve
  in no comp; sole `sequentialMultPct` holder). Fable required + delivered: nuke-not-doubled assertion + the
  stale-dilution-docs sync (eve.json note/caveat + kit-status.json). Trail: pre-reg
  `scratchpad/eve-seqmult-prereg.md`, plan §A4, eve.json caveat.

- **(2026-07-20) tove: datamine-refresh of two stale kit values — LANDED (kit-audit Phase C; Fable pre-op
  APPROVE-WITH-REVISION).** `tove` (AR/Water/B1, ungraded). Two override values were stale vs the CURRENT
  datamined kit prose (`characters.json`): (1) S2 team Crit Rate `critRatePct 3.32 → 10.08` (prose: "at max
  stacks … Critical Rate ▲ 10.08% continuously"; the 3.32 was pre-rebalance); (2) burst all-ally ATK
  `casterAtkPct 6.96 durationSec 10 → 15` (prose: "ATK ▲ 2.32% … Mirrors the stack count … for 15 sec"; 6.96
  = 2.32×3 max stacks, unchanged — only the stale 10s duration fixed). Evidence tier = current kit prose
  (faithful refresh, no board-fit). The embedded note was synced in the same edit (per Fable). SG-gated lines
  (Attack Speed 42.24%, burst SG ATK 24.21×3) stay skipped (no SG in the generic team). **Ungraded** → regression
  byte-identical (verified), solo-wiring smoke confirms the crit moves her solo total (32.599M). Trail: plan §tove.

- **(2026-07-20) milk-blooming-bunny: S1 "Gain Pierce for 6 sec" is MODELED → her Pierce package goes live
  — LANDED (kit-audit Phase C ENACT-NOW; Fable pre-op APPROVED; grave-pierce precedent).**
  `milk-blooming-bunny` (SR/Iron/B3, Attacker; the variant, not base `milk` SR/Water). Her S1 full-charge
  "Gain Pierce for 6 sec" sat in `unmodeled.skill1`, so she was NEVER Pierce-tagged and her whole Pierce
  package (burst `pierceDamagePct +117.64%`, 10s) was INERT — a prime suspect for her COLD 0.653. Enacted a
  `{shotFired → self, gainPierce durationSec:6}` block (SR auto-full-charges every shot → the 6s window
  refreshes continuously → permanent tag; the ade-agent-bunny/grave `gainPierce` precedent). **DELIBERATE
  overshoot, faithful>fit (exactly the grave 2026-07-17 pierce precedent):** isolated A/B **PG 0.653 COLD →
  1.301 HOT** (total ~254M→506M, ~×2). Mechanism verified by debug: during her ~10s burst window her pierce
  Damage-Up (`dmgUp` 1.00→2.31, the +117.64 + d-killer-wife's SR +13.55) roughly doubles her already-large
  burst-window damage (atkPct-220 + FB normals: 5M/shot vs 0.47M outside); the buff correctly ends at
  t≈13.17. **No tuned value** (117.64 is datamined). The residual +0.30 HOT is now cleanly isolated to
  milk-blooming-bunny's SEPARATE, measurement-gated over-models — her 2nd gotcha (the Embarrassment
  mode-split: auto-mode faithfulness of the burst atkPct-220 / S2 DoT-447.7 magnitudes) + an unmeasured
  pierce-window DPS share — NOT the pierce mechanic. Tracked → open-questions **U23**. Regression: her PG
  total is the only drift (+99.22%); all full-burst asserts byte-identical (self-only tag). Trail: plan
  §milk-blooming-bunny gotcha 1, override caveat.

- **(2026-07-20) d-killer-wife: S1 FB Pierce Damage ▲13.55% targets SR allies only → `alliesOfWeapon SR`
  — LANDED (kit-audit Phase C ENACT-NOW; Fable pre-op APPROVED).** `d-killer-wife` (SR/Fire/B1, Supporter;
  the variant, not base `d` SMG/Wind). Her S1 FB-enter Pierce Damage ▲13.55% (10s) targeted ALL allies; the
  kit targets only Sniper-Rifle-wielding allies. Re-targeted `alliesOfWeapon SR`. She is herself SR so keeps
  the buff; the ONLY board effect (isolated A/B) was removing the spurious buff from the one non-SR
  Pierce-tagged ally — **grave** (AR), who is Pierce-tagged during her Prediction burst in comp N1 — cooling
  that over-modeled HOT unit **grave 1.179→1.162** (N1 total −4.29%). All other comps + full-burst asserts
  byte-identical. Kit-literal target scope, no fit. Trail: plan §d-killer-wife gotcha 2, override caveat.

- **(2026-07-20) Eve: S2 reload-refund is Electric-gated + refunds exactly 3 rounds — LANDED (kit-audit
  Phase C ENACT-NOW; Fable pre-op APPROVED).** `eve` (AR/Iron/B3, the NieR collab Eve). Her S2 "when
  hitting an Electric-code target for the 10th time, Reload 3 round(s)" was modeled UNCONDITIONALLY
  (fired vs any boss) and as `instantReload fraction:0.05` (0.05 × 75 buffed mag → 4 rounds, over by 1).
  Both defects were flagged in her own caveats. Enacted: (1) block-level `bossElementGate:"Electric"`
  (existing engine primitive, sim.ts:1419 — block inert unless boss is Electric); (2) fraction 0.05 → 0.04
  (0.04 × 75 = 3.00 exactly, the kit's flat 3). Both kit-literal, no fit. **eve is ungraded** → validated
  by solo unit-test: off-Electric her total is now element/refund-clean (Iron == neutral == 117.20M; the
  refund + her Iron→Electric advantage + S1 Electric-target debuff only fire on the Electric boss). No comp
  → regression byte-identical. `instantReload` has no flat-rounds field, so 0.04 is exact only at the 75-mag
  (external max-ammo buffs would drift it — moot; eve is solo-tested). Her separate Mk2 ×2 sequential-bucket
  gotcha (A4) stays deferred. Trail: plan §eve gotcha 1, eve override caveat.

- **(2026-07-20) Grave: team "Max Ammunition Capacity ▲ 3 round(s)" is a FLAT grant → `maxAmmoFlat 3`
  — LANDED (kit-audit Phase C ENACT-NOW; Fable pre-op APPROVED 4-of-4).** Base `grave` (AR/Fire/B2,
  Supporter). Her burst's team ammo buff was the schema-forced fudge `maxAmmoPct 3` (+3 PERCENT ≈ inert);
  the kit line is "▲ 3 round(s)" (flat). Re-encoded `maxAmmoFlat 3` to ALL allies, 10s (the flat-rounds
  path was already live in `maxAmmo()` — the noir 2026-07-20 precedent). **The plan's "negligible on a
  60-round AR mag" premise was WRONG** — it only weighed grave herself; the buff goes to the whole team,
  and because she is a frequent B2 (~13 bursts/fight = 10s window at ~72% uptime) it is near-permanent for
  small-mag SG/SR teammates. **Isolated board A/B (faithful>fit, mixed as expected):** improves the COLD
  units it feeds — d-killer-wife 0.954→0.969, anis-star 0.967→0.979 — and worsens the separately-tracked
  HOT ones — **noir 1.116→1.150** (+3.83% in her PI/PI2 totals; her 9-round SG gains most relative to a
  +3-round grant), jill 1.041→1.051; grave/chisato/quency ~flat. The noir/jill worsening is the faithful
  consequence of a real buff amplifying THEIR own over-models (both are open HOT gotchas), not a reason to
  suppress the kit mechanic. No tuned value (3 is kit-literal). Regression: all full-burst/measured-truth
  asserts byte-identical (rotation neutral); only per-comp totals drift (snapshot updated). Trail:
  `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §grave gotcha 3, grave override caveat.

- **(2026-07-20) Datamined skill CDs → sim: audit done, `helm-aquamarine` skill2 landed on `interval:4`;
  no cooldown-gate primitive needed.** Consuming the new `skillCooldownsSec` field (bakery-bot, per
  `docs/handoffs/2026-07-20-skill-cooldowns-to-sim.md`). Audit of all 8 units with a non-null skill-1/2
  CD found **no genuine class-3** (event + rate-limit): the damage lines carrying event-proxy triggers
  have no "Activates when…" clause in the kit text, so they are class-1 pure timers. The unbuilt
  per-block cooldown-gate mechanism therefore has no consumer — left unbuilt (no dead schema).
  - **`helm-aquamarine` (AR/Iron/B2, NOT base `helm`) — LANDED.** skill2 105.58% random-enemy hit had an
    INVENTED `hitCount:30` proxy (the override note's own flagged ⚑TOP, borrowed from skill1's genuine
    30-normal trigger; skill2 has no such clause). Re-encoded `{interval, sec:4}` from the datamined CD.
    Solo total 51.499M→50.142M (−2.6%; over-firing proxy at ~2.5s → true 4s). **MODEL_ONLY** — she is in
    no graded comp, regression byte-identical. ⚑ first-fire phase (t=4 vs t=0) unpinned.
  - **`isabel` — RE-ENCODED (owner-corrected).** Datamine confirms S2 "Pointed Feather" is a SINGLE hit
    on the 15s CD — NOT a DoT (her only "45 sec" values are S1's three Marked-Target BUFFs: crit rate /
    crit dmg / ATK, gated on burst). The override had modeled it as a `dot intervalSec:14.7` device (each
    "tick" = one activation). Re-encoded faithfully as `passive flatDamage 170.58` (t=0 battle-start hit)
    + `interval:15 flatDamage 170.58` (recurrences t=15…165) = 12 hits/180s. **Behavior-identical** (solo
    A/B byte-for-byte at crit-off: 2.4610M, 12 hits, same per-hit), just correctly labeled as a CD-gated
    single hit. Note the first-fire phase is load-bearing for the count: `interval:15` alone (first at
    t=15) gives 11 (the 12th lands at t=180.000, the excluded final frame); the t=0 battle-start hit is
    what reproduces the measured 12. MODEL_ONLY.
  - **No change:** `snow-white` (already `interval:15`), `prika` (CD 0), `liter` (heal, damage-inert),
    `takina` (continuous `passive` buffs, no lapse).
  - **`rosanna-chic-ocean` — LANDED (owner ruled the 30s CD is real).** S2 sustained DoT was ONE
    `passive` `durationSec:999` (continuous, a deliberate but note-flagged-⚑2 "invented 100%-uptime"
    encoding). Re-encoded `{interval, sec:30}` + `dot durationSec:15`. No force-cast in S1 → first fire
    waits for the CD = **t=30** (owner ruling: force-cast → t=0, else t=CD). DoT windows [30-45]…[150-165]
    = 5×15 = 75s (was 180s). Solo 41.763M→34.472M (−17.5%). MODEL_ONLY, regression byte-identical.
  - **`sakura-bloom-in-summer` — LANDED (owner ruled the 30s CD is real; supersedes her note's earlier
    "datamine has NO S2 CD" claim).** S1 "Forcefully uses Skill 2" → S2 first-fires at **t=0**, then
    re-casts every 30s = 6×15s windows (90s uptime). Sakura Petals DoT = passive dur15 (t=0) + interval:30
    dur15 (re-casts). Dancing Flower AD self-buff (engine passive buffs are always-on so it stays
    time-averaged) 1.30→7.82 (15.64×90/180). Solo 40.165M→67.494M (+68%). MODEL_ONLY, regression
    byte-identical. **Owner clarification (first-fire convention):** a "force-cast" skill fires at t=0; a
    normal CD skill waits its first CD (t=CD).
  - **Burst-CD cross-check (roster sweep):** only 2 divergences of `skillCooldownsSec.burst` vs
    `burstCooldownSec` (both already modeled via `burstCooldownSec`; `.burst` unconsumed → no double-model):
    **`bready`** `.burst=20` vs `40` — owner: 40s correct, `.burst=20` is the wrong source; no change.
    **`quiry`** `.burst=40` vs `60` — owner: **40s is correct**, `burstCooldownSec=60` is wrong → flagged
    for a data-source fix at bakery-bot/sync (would change her rotation; not hand-patched here).

- **(2026-07-20) Snow White `snow-white`'s burst cannon fires as a DELAYED charge hit, not a weaponSwap
  — LANDED (owner-ruled from the sw.MP4 footage).** Base `snow-white` (AR/Iron/B3, NOT
  `snow-white-heavy-arms`) keeps firing her AR through the ~5s cannon charge in-game; the cannon
  materializes only for its one shot. The old `weaponSwap` model halted her AR for the whole charge
  (~5s × 6 bursts ≈ 30s of lost fire — her main residual COLD driver). Re-encoded as a single delayed
  full-charge `flatDamage` `{atkPct 499.5, charge, chargeMultPct 1000 (×10), core, pierce, rangeOk,
  delaySec 5.5}`, so the AR fires continuously. **New engine primitive (opt-in, default-off):** a
  `flatDamage` hit may carry `charge`/`chargeMultPct`/`pierce`/`rangeOk`, threaded through the
  `pendingHits` landing path (+ a `dealDamage` `chargeMultPct` override) — every existing `delaySec`
  user (`rapi-red-hood`'s missile) is byte-identical (regression green). A/B (isolated at ae68b90,
  expected-value): cannon flavor BYTE-IDENTICAL (major/charge/dmgUp/taken across all 6 shots), FB counts
  byte-identical (rotation neutral), `helm`/`crown` byte-identical; `snow-white` 347M→408M
  (~0.81-0.90 → ~0.95-1.06 across the 4 control comps) from the recovered AR fire — which faithfully
  also lifts her S1 self-ATK uptime and `little-mermaid`'s teamAmmo-500 skill (+4M, genuine extra ammo
  consumption the swap model under-fed). Fable pre-op APPROVED-WITH-CONDITIONS (normalAttackPct
  divergence on a delayed hit documented as inert-at-scope; rotation verified; flavor opts additively
  preserved). Reading recorded, NOT tuned. Trail: `snow-white` override note/caveats, commits (engine
  160cee3, override 9cc9d7a), `damage-calculation.md` §1d.

- **(2026-07-20) Step-gated pierce (ade-agent-bunny) — LANDED (kit-audit Phase A4 primitive).** The
  `gainPierce` effect's `durationSec` is now OPTIONAL — absent = continuous/permanent (`pierceUntilFrame`
  → ∞), mirroring the `shield` effect's optional-duration convention. This lets pierce turn on at a STACK
  THRESHOLD and stay on, which a boolean `hasPierce` flag can't express. ade-agent-bunny's kit gains Pierce
  continuously "only if Spy Lens is at max stacks" (10 full-charge hits ≈ 16s): her top-level
  `hasPierce:true` (applied from t=0) is replaced by a duration-less `gainPierce` riding the SAME
  `hitCount:10` trigger her ATK ▲16% already used — closing the documented residual gap (over-credited the
  first ~16s ≈ 9% of the fight, where her 18.36+10.13 Pierce-Damage self-feed and teammates' pierce buffs
  fired before Spy Lens maxed). No tuned value; faithful onset. Board: ade-agent-bunny only, 1.001→~0.990
  (isolated regression drift 1.10% down, her own damage; no comp-mate moved — the pierce TAG is per-unit).
  verify.sh green. Trail: `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A4 (swap-scoped /
  step-gated pierce), ade-agent-bunny override caveat.

- **(2026-07-20) Wipe-Out area-hit ATK buff (d-killer-wife) is GATED on the Wipe Out status + core —
  LANDED (kit-audit Phase A4 primitive, owner ruling).** New engine vocabulary: a `wipeOut` effect
  opens a global boss-status window (like `fbEndFrame`) and a `requiresWipeOut` block gate reads it
  (mirrors the `shield`/`requiresShielded` pattern). d-killer-wife's burst now inflicts Wipe Out (10s)
  and her body-branch ATK buff (`casterAtkPct` 12.19%, "Allies that hit the body") fires at burstCast
  for that 10s window with `requiresWipeOut` + `requiresCore` — replacing the prior ungated `hitCount:1`
  model that ran ~permanently (documented over-credit, old caveat: "buff uptime over-credited whenever
  she is firing outside her 10s Wipe Out windows"). **No tuned value** — the datamined 12.19 is unchanged;
  only its uptime is corrected to ~71% (10s Wipe Out of a ~14s rotation). **Owner ruling:** model the
  Wipe-Out area-hit as CORE-only for now (core is the only modelable "area" on the partless boss); the
  **parts branch** ("Allies that hit parts → coreDamagePct 16.26%") stays a documented **TODO — needs
  destructible-part modeling** (wire as `requiresWipeOut` + a parts-hit trigger when parts enter scope).
  **Board (isolated A/B, faithful>fit, mixed as expected — removing an over-credit cools HOT recipients
  and unmasks COLD ones):** cools naga 1.080→1.026, chisato 1.141→1.109, d-killer-wife 1.046→0.987 /
  1.030→0.991, jill/grave/quency-escape-queen slightly; nudges the already-COLD modernia 0.868→0.834, ein 0.936→0.900,
  maxwell colder (their true coldness was masked by the spurious team-ATK boost). Regression footprint
  confined to her 3 comps; snapshot updated, verify.sh green. Trail:
  `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A4 (Wipe-Out primitive), d-killer-wife override caveat.

- **(2026-07-20) Naga's shield-gated lines are DEFAULT-OFF and ride the REAL shield machinery — LANDED
  (kit-audit Phase C, owner ruling).** The old encoding was a user-selected "with shielder"/"no shielder"
  mode (and the later "auto" modes[0] default was a no-op string that silently left the shield blocks
  inactive — a phantom toggle either way). **Owner ruling: default off, require a shielder.** Enacted:
  Skill 1's "Activates **when** a Shield is set in front of this unit" (85.17% team core-damage, 10s) is now
  a `{kind:'shielded'}` EVENT-trigger block — it fires only when an ally's `shield` effect actually targets
  naga (emitters today: `crown` burst 15s, `blanc` per-120-team-hits 5s; `delta-ninja-thief` self-only and
  `rei-ayanami` Fire-allies can never hit her). The burst's "Activates **if** a Shield is set" (31.02%
  casterAtk) is `burstCast` + the new `requiresShielded` STATE gate (`shieldedUntilFrame`, opened by each
  shield's durationSec). The modes array is gone. No shielder in comp = both lines inert — the faithful
  default. Board: N2 (the only graded naga comp, no shielder) byte-identical. ⚑ WATCH: shield-line uptime
  now inherits the shielder's shield cadence (unmeasured vs in-game shield uptime) — recipe: naga+crown
  focus video, 85.17% buff-icon windows vs crown's shield icon.

- **(2026-07-20) Red Hood's base SR is BOLT-ACTION outside Red Wolf — owner-confirmed (kit-audit Phase C
  gotcha closed, no behavior change).** The blind-rebuild audit's open question ("autofire vs bolt-action
  outside the Red Wolf window is untested"; the autofire hypothesis would have added ~2.2 rounds/s) is
  closed by owner testimony: **base SR has bolt recovery** — the engine's +22f SR default was already the
  model, so nothing changes. Consequence: `red-hood`'s COLD 0.867 residual must live elsewhere; prime
  suspect is the S1 excess-Charge-Speed→Charge-Damage conversion still modeled as a static
  chargeDamagePct 90 average (gotcha 2, MEASUREMENT-gated).

- **(2026-07-20) Noir: +5-rounds is a TEAM flat grant, and the burst same-squad gate is REAL (blanc/rouge)
  — LANDED (kit-audit Phase C, ENACT-NOW + owner ruling).** (1) S2 "Max Ammunition Capacity ▲ 5 round(s)"
  re-encoded from the self-only `maxAmmoPct 55.56` proxy to `maxAmmoFlat 5` → ALL allies, 10s (the flat
  path was already live in `maxAmmo()`; noir's own 9→14 is numerically identical, proven byte-identical
  on her own totals). (2) Burst block 3 (Hit Rate ▲11.61% + Parts ▲19.36%, 30s) is now gated
  `teamHas:{slugs:['blanc','rouge']}` — **owner-confirmed the "ally from the same squad" gate is real**
  (the buff does not appear without one), enacted via the new `teamHas.slugs` facet ("still on the
  battlefield" is scope-trivial). A/B PI/PI2: rotation identical (13×100%); noir cools 1.134→1.127 /
  1.103→1.102; the faithful ammo grant warms teammates — `anis-star` (RL, small mag) 0.935→1.010 and
  0.927→1.001 (lands ON the board), grave +0.3%, jill +1.2%, chisato +0.6%. Snapshot regenerated with
  the change.

- **(2026-07-20) Base `snow-white` IS board-graded — the control-anchor runs are her data (owner
  correction).** The kit-audit plan's "board no-data" for `snow-white` was wrong: the 4
  `docs/probes/control` recordings ({sw,helm,lm,crown}) are 4 independent 3:00 runs of the 4-unit
  control comp [`little-mermaid`, `helm`, `crown`, `snow-white`] (slot 5 empty). Wired as graded comps
  C-SW/C-Helm/C-LM/C-Crown: boss NEUTRAL (owner-confirmed "record neutral" control design → boss:null),
  focus = the filename unit — independently corroborated by the battle-records slot orders (the focused
  unit sits in middle slot 3 in ALL FOUR runs, matching the middle-slot focus default). Totals read from
  the four screenshots this session.

- **(2026-07-20) "Highest/lowest FINAL ATK" ally-selectors rank by LIVE effectiveAtk — LANDED (kit-audit
  Phase A3, 4 of 5 units).** The `alliesTopAtk`/`alliesLowestAtk` selectors ranked candidates by base
  `staticAtk`, but several kits' PRIMARY game text says "highest/lowest **final** ATK" (final = live
  buffed ATK). **Owner ruling:** implement, keyed strictly on the literal word "final" — selectors that
  say "final ATK" rank by live `effectiveAtk` at the apply frame; `casterAtkPct` ("% of the skill user's
  ATK", ~30 units incl. moran) AND plain "highest ATK" (no "final", e.g. `naga`) stay on static.
  Encoded as an optional per-selector `byFinalAtk` flag (absent = static; byte-identical fallback proven
  by a no-flag board-read == baseline). **Landed on the 4 board-neutral units** whose text says "final":
  `alice`, `liberalio`, `miranda` (×2 selectors), `soda-twinkling-bunny`. Board net 7/11/21/23 unchanged;
  the only drifts are `liberalio` correctly moving her "lowest final ATK B3" charge-speed from `milk-blooming-bunny`
  (high final ATK) to `maxwell` (lowest, and never exceeds milk — stable idx tie-break), all full-burst
  counts byte-identical. **`maxwell` HELD** (her `byFinalAtk` NOT set): faithful in principle but her
  sole graded comp ("PG iron sweep") is a **transient-snapshot artifact** — her fullBurstEnter atkPct 43.1
  top-2 pick lands on `takina` (Burst II, structurally proven the sole cause) only because at that instant
  `milk-blooming-bunny`'s 446k ATK peak is transiently at base; entangled with milk's known COLD (0.681)
  under-model, so it swings takina 0.988→1.280 with no way to validate the real recipient. HELD pending a
  focus-video of who actually receives maxwell's buff (LOG outcome, evidence-proportionality). Also OUT of
  scope: `guilty`'s "highest ATK" (no "final") duplicate-ATK line correctly stays static, but its basis bug
  (sizes off the caster's OWN ATK, not the highest ally) is a separate `highestAllyAtkPct`-source fix.
  **Scientific-method:** Fable pre-op APPROVED-WITH-REVISIONS (full-roster "final" sweep affirmed — only 6
  simSupported units use the ranking selector; R1 flip-conditioned rotation invariant; R2 12 call sites),
  post-op ACCEPT/HIGH, 2-of-2. verify.sh green. WATCH (non-blocking): `soda-twinkling-bunny`'s per-3-shot
  re-rank can now oscillate the recipient mid-FB (same-caster-slot overwrite becomes load-bearing;
  board-neutral today). Trail: `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A3, open-questions U21.

- **(2026-07-19) Core-hit for accuracy-circle weapons is a δ-offset ("Rician") cone — LANDED LIVE
  (`CONE_DELTA`, default on).** Replaces the two confirmed bugs of the prior path — the flat
  `CORE_AUTOAIM = 0.55` cap (over-credits low-HR far, under-credits high-HR near) and the fractional
  reticle floor — with ONE mechanism: a shot lands on an isotropic 2D Gaussian of spread σ_w(hr) CENTERED
  δ_w(hr) px off the true core; it cores iff it lands within the band core radius ⇒ `offsetCoreProb`
  (Rician CDF) in `src/engine/sg-geometry.ts`. **Frozen params** (binomial-MLE refit on the
  method-tagged campaign cell set; `scripts/cone-refit.ts`): δ0 = AR 18 / SMG 16 / SG 30 px; H = 120;
  S_FLOOR = 0.10; **per-weapon σ-shrink s = {AR .009, SMG .004, SG .009}**. Held, never refit: K_SIGMA
  2.53, CIRCLE_PX_K 0.648, datamined per-weapon scale, band core radii (hard-constraint #3). **Why
  per-weapon σ** (a deliberate deviation from Fable's a-priori "reject per-weapon params"): the shared-s
  form was **board-REFUTED** — the full A/B regressed via quency-escape-queen +0.171 HOT (the predicted
  SMG mid-HR over-credit), because a single s must be high to saturate SG ▲98 yet that over-tightens the
  SMG mid-HR cone; SG/AR need aggressive shrink for their high-HR saturation cells while **no board SMG
  unit reaches high HR** (so its low s is "no saturation regime," not a free knob). The extra param is
  evidence-forced, not overfit. **Evidence:** the geometry campaign (`docs/handoffs/2026-07-19-geometry-
  campaign-findings.md`), the refit + Fable pre-registration (`…-cone-param-freeze-prereg.md`, APPROVED
  round 2), and the full-board A/B — CONE_DELTA=1 vs 0 net board mean|ratio−1| **0.0972→0.0964**, AR/SMG
  at-range over-credit cooled (guillotine-winter-slayer −0.077, grave −0.064), no unit regresses,
  rotation/full-burst counts byte-identical. SG ▲98 saturation (0.99) is independently corroborated by
  the measured dorothy-serendipity ▲98.18 aimed-single-bullet coreRate 0.9 (an aimed single is the spray
  ceiling — PROVE-IT-DIFFERENTLY). **This REFINES, does not reverse, the 2026-07-18 geometry-is-ground-
  truth ruling below:** geometry still rules; what changes is that the **drawn crosshair/reticle is
  DECORATIVE** (measured Hit-Rate-independent — COUNT-4 noir ▲70≡▲98), so reticle-anchored derivations
  (the fractional-floor / clamp forms) are superseded; the invisible cone is the geometry.
  **Pre-registered REVERT triggers** (Fable): any SMG/SG unit regresses >0.03 |ratio−1| vs CONE_DELTA=0;
  the DECLARED bounded tail over-credit (SMG far/mid + SG mid ▲60, from the wide 110px SMG circle's σ)
  turning board-material on a far-band-heavy unit; band-ordering (near>mid>midfar>far) breaking in data.
  **Open holdouts to score post-flip** (out-of-sample): soda-twinkling-bunny SG ▲38.91 (pred .16/.13/.08/.05,
  ±0.12 spawn), chisato SMG midfar HR22 (pred .184), a blanc near-HR39 spawn re-count (the one AR cell
  still per-frame). `CONE_DELTA=0` restores the prior engine byte-identically.

- **(2026-07-18) Accuracy-circle geometry / HR→core / pellet-landing math is GROUND TRUTH — evidence-tier
  ruling (owner).** The hit-rate→core-hit-rate, pellet-count, and SG-pellet-landing math — the
  accuracy-circle geometry system (`docs/data/sg-calc/`: accuracy-circle-scale→px→range calibration,
  `CENTER-WEIGHTED-PELLET-SPEC.md`, geometric core-hit fraction, `DERIVATION.md`; wired live as `HRCORE`
  in `src/engine/sim.ts`) — is **treated as TRUE until proven otherwise**, and it **OUTRANKS the older
  "measured" core rates** it disagrees with (e.g. dorothy-serendipity `consolidation.coreRate 0.9`,
  the `CORE_BY_WEAPON_BAND` cells). **Why the tiers invert here:** those older core rates are high-effort
  estimations **back-derived from damage-per-hit calculations** — they infer the mechanic from observed
  damage, so they are model-fits, not measurements OF THE MECHANIC. The geometry system is derived from
  **provable in-game measurements + published game mechanics** (accuracy-circle scale, reticle geometry,
  real SG hit/miss band footage — `noir-sg-bands.json`), i.e. it measures the mechanic directly. So the
  usual **measured > derived** tie-break inverts for this subsystem: the geometry/HR model is the higher
  tier and the damage-back-derived core rates are the refit candidates. **How to apply:** when the
  geometry/HR math disagrees with an old back-derived core rate OR a board fit, geometry WINS by default —
  do not correct it back toward the old number, and do not invoke measured>derived to protect a
  back-derived core rate. **This supersedes the audit-kit judge's 2026-07-17 call** that consolidation
  `coreRate 0.9` should outrank the HR slope (that call predates this ruling; the 0.9 is itself a
  back-derivation). **Falsifiable, not permanent** ("until proven otherwise"): an overturn needs a
  *direct in-game measurement of the mechanic* that contradicts the geometry (per the scientific-method
  gate), NOT a board-fit residual or another damage-calc back-derivation. Consistent with the
  faithful>fit / accuracy-to-observed-mechanics invariant — this promotes a directly-measured mechanic
  model over a fit, and is not a license to fudge. Cross-session pointer: memory `accuracy-geometry-is-ground-truth`.

- **(2026-07-17) DoT / periodic-damage crit is PER-DoT, not global (theme 12) — LANDED for isabel.**
  The engine gains a per-DoT `crit:true` opt-in (`types.ts` dot effect + `Dot.crit`; the dot-tick
  dealDamage falls back to the still-default-OFF global `DOT_CRIT` gate when the field is unset, so all
  other DoTs are byte-identical). A **universal DOT_CRIT default-on was measured-REFUTED**: a board sweep
  (DOTCRIT off→on) is a wash (±3% MAD count 8→8) and it *breaks* units whose DoTs are validated non-crit
  — jill's acid tick is video-confirmed at 99.7% NON-crit, mihara-bonding-chain's Ensnaring is validated
  at 1.03 non-crit, little-mermaid's FB dot/barrage carry no crit evidence (and go hot under the flip).
  The two other units theme 12 cited don't support it either: neon-vision-eye is +8% HOT and has no
  critting DoT (its "7% cold" was stale); modernia's cold is her burst `extraHitDamagePct` rider (crit-OFF
  finding ⚑4), not a DoT tick. **isabel opts in** on measured evidence: her ~14.7s periodic rider crits
  in-game (3 crits / 11 resolved fires; crit 308,564 = non-crit 205,709 ×1.5 exactly —
  `docs/probe-data/isabel-sg-band.json` riderFinding), so `crit:true` on her skill2 dot rolls at her
  sheet rate (confirmed live: rider tick `major` 1.000→1.106). Solo recon warms the right direction
  (~50.9M→53.1M vs real 55.3M); zero board blast radius (solo-only unit). Ties open-question U1. Anis-star's
  DoT-driven board improvement under the flip is NOT enacted — no evidence her DoTs crit; it's a `fit`, and
  her open thread is a measurement-blocked dot-gauge re-model, not this.
- **(2026-07-17) Max-HP-scaling grant primitives (theme 13) — LANDED, kit-completeness sweep across
  6 units.** Two primitives added: (1) `targetMaxHpPct` StatKey — "Max HP ▲ X%" grants scaled by the
  TARGET's OWN Max HP, distinct from the existing `casterMaxHpPct` ("X% of the skill user's Max HP");
  (2) `alliesLowestHp` TargetDef (count/excludeSelf) for "affects the lowest-remaining-HP ally" — v1 has
  no HP pool (immortal boss), so it resolves to the leftmost `count` allies as a documented deterministic
  stand-in. Both convert to `maxHpFlat` and honor the **e3 rule** (DECISIONS 2026-07-17, rouge/cindy e3
  video): ally-granted Max HP feeds a consumer's `atkOfMaxHpPct` conversion ONLY when caster === target
  (self); ally-facing grants are offensively INERT. **Board footprint proven to be maiden-only** by
  toggling the change against the live engine (all other teammates 0.000% delta, incl. the HP-scaling
  consumer cinderella — she'd rise if wrongly fed; she doesn't move). Per-unit: **maiden-ice-rose** — her
  self "Max HP ▲6.34% ×10 stacks, every 6 full charges" (previously omitted as "unsupportable") is the
  ONE offensively-live grant: self-granted (casterIdx===self) so it feeds her own S2 burst `atkOfMaxHpPct`
  3.2% conversion. Modeled as `targetMaxHpPct` 6.34 on self, hitCount 6, maxStacks 10, 15s. Effect is small
  + correct-direction: her N6 Wind comp **0.76 → 0.85** (partial close of her documented under-model, NOT a
  full fix — her burst's separate dropped "10% of Max HP per MP" portion is UNCHANGED, still ATK-only, open).
  Snapshot updated maiden-N6 only (+11.6% her total; understood, single-unit). **anis-star** (hasB1 burst
  15.02% all-allies), **trina** (S2 44.98% Electric-AR allies passive + burst 20.14% all-allies), **blanc**
  (burst 31.68% lowest-HP ally, own-% basis) — all ally-facing, modeled for kit-SSOT completeness, INERT.
  **rouge** already carried casterMaxHpPct grants. **moran**'s Perseverance Max-HP lines are HP<20%-gated
  (theme 18 — never fire on the immortal boss), intentionally left as skips. All values kit-measured, no
  fudge. Engine: sim.ts `resolveTargets` (alliesLowestHp), apply-loop per-target `targetMaxHpPct` conversion;
  validator + web STAT_LABELS/targetLabel updated. Full inventory: engine-modeling-gaps.md theme 13.

- **(2026-07-17) Own-burst-gated Full-Burst trigger (`ownBurstGate: 'cast' | 'notCast'`) — LANDED,
  ENACTED on cinderella-crystal-wave (faithful; net board improvement).** Kits that read "Activates
  when entering Full Burst AFTER this unit uses her own Burst Skill" were modeled as a plain team
  `fullBurstEnter`, which over-fired the rider on EVERY team full burst — including ones a DIFFERENT
  B3 completed (theme 9, HOT in multi-B3 comps). New block gate `ownBurstGate` (types.ts Block;
  sim.ts `applyBlock`, checked against `rotationCasters` alongside fbGate/swapGate/bossElementGate)
  fires only when the owner DID (`'cast'`) or did NOT (`'notCast'`) cast their own burst in the
  rotation into this FB. Composes with the existing `fullBurstEnter` trigger, so the block stays AT
  FB-entry and keeps the +50% FB major + FB auras — unlike the prior workaround of re-keying to
  `burstCast` (which fires PRE-FB and loses them; correct only for duration self-buffs with no
  FB-entry instant, e.g. arcana-fortune-mate / mana / asuka-wille — those stay burstCast). Inert
  until an override opts in. **Enacted: cinderella-crystal-wave** — both FB-enter core-strike riders
  (Snipe 1189.66% / MG 833.79%) → `'cast'`, text-faithful. The kit-status finding assumed "sole-B3 →
  graded movement ZERO"; that PREMISE WAS WRONG — she alternates stage-3 with a co-B3 in BOTH graded
  comps (Liberalio in T5, Rapi:RH in T8), so the gate is board-MOVING and it IMPROVES the fit: T8
  iron-weak 1.062 HOT → 1.001 (the over-fire had been masking a multi-B3 over-credit), T5 wind-weak
  1.009 → 0.978 (both now within ±3%; board MAD 0.036 → 0.012). Regression snapshot updated for the
  T5 ccw total (understood, single-unit). The inverse case diesel-winter-sweets (`'notCast'` Highlight
  sustained, 0.831 COLD) is now expressible but stays owner-deferred (document-only — her full Highlight
  state machine + no-op-B3-drives-FB path is the larger unmodeled piece). **Faithful>fit:** the prior
  team-wide fullBurstEnter was a known-wrong model (contradicts explicit kit text); the gate is the
  faithful mechanic, and here it also happens to help the board.

- **(2026-07-17) Hit-Rate → core-hit multiplier (`HRCORE`) — LIVE by default (owner-set), ⚑ DERIVED estimate.**
  `hitRatePct` was engine-inert ("100% accuracy assumed"). Higher Hit Rate shrinks the auto-aim reticle
  (TricK's MEASURED SG reticle regression −1.4285·x+168.3931 px) → tighter bloom → higher core-hit fraction.
  Engine: `M(w,hr) = (reticle(0)/reticle(hr))^p_w` scales the existing measured `CORE_BY_WEAPON_BAND` row
  (never refits it — hard-constraint #3 intact; M=1 at hr=0). Band-INDEPENDENT (per-band core cancels in the
  ratio). `p_w = ln(core_base_near)/ln(SAT/circle_scale)` from datamined `accuracy_circle_scale` (AR 75/SMG
  110/SG 250) + saturation bracket; reticle floored (R4) so M is finite+monotone ∀ hr≥0. Applies to AR/SMG/SG
  via the existing seeded core Bernoulli (operates exactly like crit); MG/SR/RL (pinpoint) + zero-base SG
  mid/far bands unchanged. **DERIVED, NOT measured** — the exponent comes from reticle geometry, NOT from
  fitting the board (measured>fudge; the board is a TEST). **Validation:** reproduces the pre-registered
  predictions — jill (AR +80.78%) core 0.40→0.68 ∈ measured 0.78[0.55,0.91]; chisato (SMG +22.37%) 0.28→0.31
  ∈ 0.34[0.22,0.48]. Default `circle10` (steep) bracket lands in jill's CI; SAT=1 (shallow) misses low ⇒ data
  leans steep. Board off→on: only HR carriers move (noir UNCHANGED — burstCast HR on a lone B3 never fires;
  the load-bearing gating canary). **Fable gate = APPROVE-WITH-REQUIRED-CHANGES (all 5 folded):** R4 floor,
  jill validator, circle→unit basis, ⚑-UNVALIDATED additive-in-pp composition (R8), quency-may-not-select-the-
  bracket. **OWNER RULING:** set LIVE by default despite ⚑-unvalidated status; `HRCORE=0` disables for A/B. Risk
  flagged & accepted: an unvalidated estimate on the live board, and **quency-escape-queen overshoots to 1.04
  HOT** (her cadence ⚑ confounds it — a FLAG to investigate, NOT a bracket-flip trigger; bracket authority =
  direct measurement via `asuka` (AR/Fire), still a testing-request). Snapshot regenerated (5 HR-carrier totals:
  chisato +0.90%, quency-escape-queen +5.6–6.2%, dorothy-serendipity +0.23%; measured-truth FB asserts untouched
  — HRCORE moves core damage only, not gauge/rotation). Full derivation + validation:
  `docs/handoffs/2026-07-17-hitrate-core-implementation-plan.md`. OPEN threads: asuka bracket refinement; quency
  cadence + overshoot; SG landing (H2, hit-rate→pellet-landing) NOT built (out of scope).

- **(2026-07-17) Timed pierce primitive (`gainPierce`) — LANDED and ENABLED on grave (faithful>fit); the
  residual HOT is a separate, now-isolated burst-window over-model (theme 5 / engine-modeling-gaps fix #7).**
  Static `hasPierce` couldn't express "Gain Pierce for N sec," so timed-pierce kits left their Pierce
  Damage ▲ buffs as dead blocks. Engine: added a `gainPierce` effect that sets a per-unit `pierceUntilFrame`
  window on the block's target(s); the damage-formula pierce gate is now
  `hasPierce || pierceUntilFrame > frame || opts.pierceActive`. **MECHANISM (owner-confirmed 2026-07-17):**
  Pierce Damage ▲ is a real **Damage-Up-bucket** entry (see damage-calculation.md) that applies to ANY
  pierce-damage-type unit — static or during a timed window — and **DOES apply on the partless scope-lock
  boss.** Only the *separate* pierce **core+body double-hit** is multipart-only (`PIERCE_CORE_DOUBLE=false`);
  do not conflate the two. **grave is the flagship opt-in and is ENABLED:** burst → self `gainPierce` 10s, so
  during her Prediction window her Pierce Damage ▲ lands (self pierceDamagePct 52.8 + team 39.98 = +92.78
  Damage Up; S1's 48.4 `excludeSelf`'d so it does not double-count — Heat Emission is OFF during Prediction,
  and grave-self can never use the Heat-Emission pierce). This moves her three comps 0.836/0.831/0.800 COLD →
  **1.178/1.171/1.219 HOT** — kept ON PURPOSE per the owner (faithful > fit): the pierce is a real mechanic,
  so it is modeled; the remaining HOT is a SEPARATE, now-cleanly-isolated over-model in her burst window (the
  "AR-carry burst-window residual" the missing pierce had been masking as net-COLD). Modeling the mechanic +
  tracking the single residual (open-questions **U19**) beats leaving pierce off (a fit-fudge) plus a
  forgettable "add-pierce-later" TODO. Regression snapshot regenerated (grave-only: her two comps; teammates
  verified stable — only she becomes pierce-tagged, her team pierce buff stays inert on non-pierce allies).
  Solo 1.005 unaffected (a lone B2 never bursts → no window). U19 next step: a focused grave burst-window
  recording (fire count + Pierce-Damage on/off popup) to trim the burst-window over-model. (An earlier draft
  wrongly called the pierce dmgUp partless-inert and backed grave out — corrected + re-enabled.)

- **(2026-07-17) `bossElementGate` block gate — element-coded triggered lines now compose with any
  trigger (theme 10 / engine-modeling-gaps fix #6).** The schema previously had only a `bossElement`
  TRIGGER (a *permanent* element-gated passive) — it could not express "when entering Full Burst / after
  N hits / on burst cast **against a [element]-Code boss**." Added a block-level gate `bossElementGate:
  <element>` evaluated in sim.ts `applyBlock` next to fbGate/swapGate: the block fires on its real
  trigger only when `cfg.bossElement` matches. Inert vs any non-matching boss (incl. the neutral
  scope-lock boss), so it never disturbs graded comps. **Opted in per verified characters.json prose:**
  helm-aquamarine burst "when attacking an Electric Code target → +164.83% additional damage" (a second
  `burstCast` flatDamage 164.83, `bossElementGate:'Electric'`; was UNMODELED — the exact schema gap her
  note flagged), and brid-silent-track's two Wind-Code team debuffs (S1 `fullBurstEnter`+Wind → enemy
  damageTakenPct 15.12/10s; S2 `hitCount 100` [10 NA × 10 pellets] +Wind → enemy damageTakenPct 12.12/10s;
  were SKIPPED-CONDITIONAL). **Verified** both directions: inert on a neutral boss (byte-identical damage
  to pre-change), and on the matched boss the gate ALONE (isolated from the ×1.1 advantage by flipping the
  gate to a wrong element) adds brid +32.2M (Wind team-wide debuff) / helm-aquamarine +4.9M (Electric burst
  rider). `verify.sh` green, all snapshots stable (neither unit is in a graded comp). **Deliberately NOT
  applied to the element-ADVANTAGE buffs** (anis-sparkling-summer, guillotine-winter-slayer,
  elegg-boom-and-shock, asuka): `elemAdvantageDamagePct` is already auto-gated by `advantaged(u)` in the
  damage math (sim.ts:899/942), so those buffs are already correctly inert on non-matched bosses; their
  residual gaps (e.g. asuka's shield-status gate) are separate themes. eve keeps its permanent `bossElement`
  trigger for its always-on element-coded lines.

- **(2026-07-17) Per-tick recovery-event emitter — the `heal` effect gained `ticks` + `intervalSec`
  so per-second heal-over-time lines refresh on-recovery consumers across the whole window (theme 2b /
  engine-modeling-gaps fix #1, the top blast-radius gap).** Previously a `heal` emitted ONE recovery
  event per activation, so a HoT ("Recovers X% of Max HP every 1 sec for N sec") collapsed to a single
  proc — under-firing Crown-type "when recovery takes effect → team ATK ▲" consumers (a hard-rule-2
  violation: the heal is the trigger, not defensive noise). Engine: `heal` now takes optional `ticks`
  (default 1 = instant, back-compatible) + `intervalSec` (default 1); it fires the first recovery event
  immediately and schedules the remaining `ticks-1` on a `recoveryEmitters` queue processed per-frame,
  each tick re-firing every target's `recovery`-triggered blocks (shared `fireRecovery` helper). Opted
  in per verified kit prose: **anchor-innocent-maid** S1 `ticks:8` ("every 1 sec for 8 sec"), **blanc**
  S2 `ticks:5` (5s HoT) + burst `ticks:8` (8s HoT). **Inert across all graded comps** — no graded comp
  pairs a recovery consumer with a HoT emitter (Crown + `helm` (SR/Water) in T4 already refreshes every
  full-charge shot, unaffected), so verify.sh stayed green with all regression snapshots stable. Independently
  verified end-to-end on a Crown + anchor-innocent-maid team: flipping the anchor HoT 1→8 ticks lifted
  team damage **766.97M → 790.32M (+3.0%, every unit up)** — the expected COLD correction, entirely from
  Crown's team attackDamagePct 20.99% consumer buff gaining uptime. Still UNMODELED (heals not carried as
  `heal` blocks): prika (burst 25-tick HoT), trina (S1 5-tick), mint (3-tick); naga/mana heals are
  instant (not HoTs); anis-star heals dropped — convert per-unit in the `unmodeled` backfill when touched.

- **(2026-07-17) `weaponSwap` gained per-swap `pullsPerSec` (fire cadence) + `weapon` (class)
  overrides so burst weapon-swaps load their OWN datamine spec (theme 7, engine-modeling-gaps).
  nayuta LANDED (SR-class); moran's fire-cadence value REFUTED by the board and backed out.** The
  `weaponSwap` effect/state previously could not express a swap weapon whose fire rate or class
  differs from the base — so swap shots used the base weapon's cadence + range/core banding. Engine:
  added `pullsPerSec?` (used in the non-charge fire-cadence branch during a swap) and `weapon?` (an
  `effWeapon = u.swap?.weapon ?? u.char.weapon` now drives the +30% range-band eligibility and the
  auto-core rate). Both inert until an override opts in.
  - **nayuta ✅ LANDED:** her "Memory Incineration" burst swap is an SR mode but was range-banded +
    core-rated as her base **SMG**. Set `weapon:'SR'` → SR gains the +30% bonus in `midfar`+`far` and
    the HI auto-core rate (SMG only qualifies in `mid`), exactly the bands where the finding measured
    a "~2× loss." **Board 0.658 COLD → 0.894** (MAD 0.342→0.106), corroborated by her recording; the
    residual 0.894 is her other flagged uncertainties (380.46% block scope, chargeTime F2, dropped
    Hit-Rate F3), deliberately not re-fudged. chargeTimeSec kept 2.13 (swaps are exempt from the
    engine's auto SR bolt-recovery, so the cycle is folded in — not double-counted).
  - **moran ⛔ REFUTED then MEASURED — no override; stays base 12/s:** the kit-status finding's datamine
    (swap shot_id 1028102 rate_of_fire 1440 = **24 pulls/s**, 2× base AR 12/s) was applied via
    `pullsPerSec:24` and predicted to "cover the 29% gap." The board (3 real-recording comps) **refuted**
    it: 24/s overshot **0.712 COLD → 1.325 HOT** (tight ±0.7% seedSD). Backed out (not fudged). Then
    **directly measured** from `moran control.mov` (60fps read, 2026-07-17): her burst prose states NO
    fire-rate change (only "Damage 14.7% of final ATK" + unlimited ammo); video confirms it — normal fire
    ~12/s (clean discrete flashes/tracers every 5-6 frames) and swap-window cadence ~10-14/s (boss
    damage-popup density + tracers), i.e. **base AR ~12/s, unambiguously far below 24/s**. The datamined
    "1440" was an unlabeled `skill_value` integer (burst `skill_value_data` [1146, **1440**, 1028102, …])
    with no prose support — NOT a fire rate. So moran keeps base 12/s (faithful). Her **0.712 COLD was then
    DIAGNOSED as a THROUGHPUT gap, not per-shot** (FOLLOW-UP, footage-blocked): her measured per-shot popup
    reconciles EXACTLY to the standard formula — recon 30,478 = 14.71% × 131,441 (Crown casterAtkPct-64.51
    buffed ATK) × 1.5723 (Helm attackDamage dmgUp), 0.3% match — so the coef is faithfully 14.7% of final
    ATK and the team buffs ARE modeled (an extra-finalATK factor would give ~2.5B/shot, refuted). But sim
    217M vs real 288M with per-shot matching ⇒ real lands ~1.3× more HITS (~2800 vs 2100), ~1.5× throughput
    in the swap window — a faster swap fire-rate or the swap weapon firing >1 bullet/pull, NOT measurable
    from the comp recording (bloom/occlusion/overlap; the recon hit the same wall). Needs an isolated
    moran-solo recording or the swap weapon's `shot_count` datamine. A textbook premise-gate catch: an
    unlabeled datamine integer, reused second-hand as a "fact," refuted by the board and then measurement.
  Regression snapshot updated (nayuta T5 +36.4%, understood); verify.sh green. Trail:
  `docs/engine-modeling-gaps.md` theme 7 / fix #5.

- **(2026-07-17) d-killer-wife's Wipe-Out PARTS branch (all-ally `coreDamagePct 16.26`) removed as
  SKIPPED-CONDITIONAL — it was a live HOT over-credit on the partless v1 boss (theme 6, engine-modeling-gaps).**
  Her burst Wipe-Out grants an area-dependent buff: kit prose "Allies that hit parts: Damage dealt when
  attacking core ▲16.26%/10s" (PARTS-gated) vs "Allies that hit the body: ATK ▲12.19% of skill user's
  ATK/10s" (BODY branch). The parts branch can NEVER be earned on the partless scope-lock boss (no parts to
  hit), but the engine modeled it as an ungated all-ally core-damage buff — and since core hits DO exist on
  a partless boss's core, it inflated every ally's core bucket near-permanently. Fix: removed the
  `coreDamagePct 16.26` effect (documented SKIPPED-CONDITIONAL in the override caveat, repo convention for
  v1-partless-inert lines cf. brid's Wind-Code debuffs); the body-branch `casterAtkPct 12.19` (always active
  on the partless body) is KEPT. Board win: **d-killer-wife 1.055 HOT → 0.998 OK** (MAD 0.079→0.056),
  **takina 1.047 HOT → 0.988** (into ±3%), rapi-red-hood into ±3%, jill/liberalio tighter; overall board
  within-±3% 5→6, worse 22→21. The COLD comp-mates that dipped (grave 0.827→0.823, maxwell's 0.66→0.63 comp,
  milk-blooming-bunny 0.706→0.681) were already cold for their OWN documented under-models — the wrong buff
  had been masking them (faithful > fit; not re-added). Regression snapshot updated (2 comps × members,
  1.1–5.6% drops, all understood); verify.sh green. Re-enable the parts branch only for a boss with
  destructible parts (OUT OF SCOPE for v1). Trail: `docs/engine-modeling-gaps.md` theme 6.

- **(2026-07-17) Engine now honors `excludeSelf` on all typed-ally targets (`allies` /
  `alliesTopAtk` / `alliesOfElement` / `alliesOfClass`); the "arcana-fortune-mate bug family" (theme
  11, engine-modeling-gaps) is CLOSED.** The `excludeSelf` flag only existed on `alliesLowestAtk` /
  `alliesOfWeapon` — the other multi-ally kinds silently returned the caster even when the kit said
  "except self", inflating the caster's own buffed damage. Fix: added `excludeSelf?` to those four
  `TargetDef` kinds and filtered the candidate pool in `resolveTargets` (sim.ts) BEFORE any top-N
  slice (exclude-then-take-N, faithful to "N highest-ATK ally except the skill user"). Four overrides
  opted in against verified `data/characters.json` prose: **maiden-ice-rose** (alliesOfElement Electric
  "except for self"), **brid-silent-track** (burst `allies` "except self"), **miranda** (2× alliesTopAtk
  "except the skill user"), **soda-twinkling-bunny** (alliesTopAtk "except the skill user" — her self is
  already covered by a separate self-block). Board impact concentrated in maiden (Electric RL): her
  elemAdvantage +40.9% self-buff was live on the Electric-advantaged Water boss → T2 elec-weak comp
  **1.55 HOT → 1.03**, board **MAD 0.253 → 0.098**, range 0.81–1.55 → 0.76–1.03. The map's "1.13 HOT"
  was the MEAN of [0.81, 1.03, 1.55]; the 1.55 was pure self-inflation. Residual 0.76 (Wind comp) is
  her SEPARATE, previously-documented burst Max-HP-scaling under-model — deliberately NOT masked by
  re-adding the self-buff (faithful > fit). brid/miranda are not board-measured and soda isn't top-ATK
  in her graded comp (N3), so those three are faithful-but-board-neutral today. False positives ruled
  out via a whole-roster prose cross-ref: blanc/mana carry "except self" on lowest-HP / incapacitated
  targets (unmodeled theme-13/18 lines, not these kinds). Regression snapshot updated (2 maiden comps,
  −6.48% / −33.30%, both understood); verify.sh full green. Trail: `docs/engine-modeling-gaps.md`
  theme 11 / fix #2.

- **(2026-07-17) SMG class fire cadence adopted 20→24 pulls/s = the datamined `rate_of_fire` 1440 rpm
  (game source authoritative); role-audit D.2, owner decision a.** The engine's SMG class default
  (`PULLS_PER_SEC.SMG`) was 20/s while the datamined weapon-table ROF is 1440 rpm = 24/s — the ONLY class
  default disagreeing with the datamine (AR 12=720, SG 1.5=90 match). Owner ruling: the game source wins.
  Warms all 7 SMG units +10-19% normal-fire damage (chisato +19.4%, quency-escape-queen +12.0%,
  little-mermaid +10.1%; no SMG override had ever set `pullsPerSec`). **One measured-truth FB count was
  UNPINNED as a consequence:** the PH-water comp (two SMGs + little-mermaid's `teamAmmo`-400 → 37%
  `fillGauge`) reads 13 FBs at 24/s vs the video-measured 12 — reclassified into the known ±1
  burst-cycle-boundary set (T4/T7/N2/N4/N5), an UNDERSTOOD over-prediction (the +20% SMG ammo rate trips
  LM's big fill ~one cycle early), NOT a silenced drift. Every OTHER SMG measured-FB comp
  (chisato/nayuta/quency-escape-queen/little-mermaid) still holds at 24. Two cheaper reconciliations were
  tested and REFUTED first: (a) recalc the gauge-per-shot table ×20/24 to hold gauge/sec constant → still
  13 (the FB is ammo-rate-driven, not normal-fire-gauge-driven); (b) count quency's 2 muzzles as 2 ammo
  → 0 FB change (crown's MG dominates the teamAmmo counter). RE-PIN TRIGGER: restore PH-water=12 when the
  burst-cycle increment fix lands or after a fresh FB re-measure. Engine `PULLS_PER_SEC` + regression.ts
  (PH-water unpinned) + snapshot regenerated; verify.sh green. Full trail:
  `docs/handoffs/2026-07-17-role-object-audit.md` D.2.

- **(2026-07-17) SG pellet-landing modeled as a seeded per-band pellet-count JITTER + boss-size profiles;
  the pellet investigation (open-questions A26 → U17) is CLOSED as an owner override.** Rather than pursue
  per-unit landing profiles or a third far anchor (the U17 HOLD), the owner rules landing modeled two ways:
  (1) under a seeded run each SG spray shot draws a WHOLE landed-pellet COUNT (not a fraction), bell-curve
  weighted toward the band mean via a Box-Muller normal mapped by σ-band — |z|<1σ → the middle count, ≥1σ →
  one pellet outward, ≥2σ clamps to the end. On the 3-wide bands (near/mid {8,9,10}, midfar {7,8,9}, far
  {6,7,8}) this is ~68% middle / ~16% each outer (owner-derived, empirically confirmed 68.29/15.86/15.85).
  It is MEAN-PRESERVING vs the fixed `SG_LANDING_BY_BAND` table (symmetric), so central board estimates are
  unchanged; only per-run spread reflects real shot-to-shot pellet scatter (brid measured 8.52 vs 9.41
  landed/10 within one fight). (2) A backend `SimConfig.bossPelletProfile` scales by boss silhouette:
  `small` (default, ranges as-is) / `medium` (drawn +1, clamped at full — near/mid → 84% full / 16% one
  under) / `large` (every band lands full pellets). NOT exposed on the front end yet; `BOSSPELLET=` env in
  experiment.ts drives it. Engine: `sgLandedPellets` + `SG_LANDING_JITTER` + `gaussian` in `src/engine/sim.ts`.
  - **SCOPE CAVEATS (honest):** the jitter + profiles are SEEDED-ONLY. As of the seeded-by-default flip
    (same day, below) the accuracy/damage surfaces DO run seeded, so they are live there; the dpschart build
    and the regression gate stay EV, so the mechanisms are inert in those two (they keep the fixed
    `SG_LANDING_BY_BAND` table). The medium/large magnitudes are ⚑ UNVERIFIED owner choices, not measurements —
    flagged as a low-prio action item to verify boss profiles (CLAUDE.md). Dorothy: Serendipity across her two
    comps already disagrees on the best profile (PH-water 766M best at small 1.03; N9-redhood 328M best at
    medium 1.01), consistent with profiles being per-boss. Verified: dorothy seeded means match the fixed table
    under `small` (2-comp mean 1.00), and the distributions reproduce the owner's predicted 68/16/16 and 84/16.

- **(2026-07-17) SEEDED-BY-DEFAULT for the accuracy/damage surfaces (owner ruling; realigns the sim with its
  original Monte-Carlo intent).** The seeded MC path existed but was dormant — the whole product ran deterministic
  expected-value. Now the surfaces that produce sim-vs-real damage numbers average `DEFAULT_MC_SEEDS = 25` seeded
  runs (fixed seed base `MC_SEED_BASE = 1000` → reproducible + paired-variance-cancelling), via two new engine
  primitives: `meanSimResults(runs)` (element-wise mean of same-team SimResults; timeline/name fields from run 0)
  and `runSimMean(chars,mult,cfg,prepared,n)`. Flipped: **board-readings** (board-read + kit-status, ~14s/26-comps
  ×25), **experiment.ts** (`SEEDS` default 0→`DEFAULT_MC_SEEDS`; SEEDS=0/1 still forces one EV run), **web damage
  sim** (3 App.tsx `runSim`→`runSimMean`, ~25× slower/calc, owner-accepted latency). **EXCLUDED (stay
  deterministic EV):**
  - **dpschart build** — EV build is 2:32 (90 cells × 40 B3); 10 seeds ≈ 25min, 25 seeds ≈ 63min → prohibitive
    for a `prebuild`/`web:build` step. Chart is computed once on build, so its stability/speed win over EV.
  - **regression gate (`scripts/regression.ts`)** — seeded mode jitters boss-transition/chain-gap timing, which
    shifts full-burst counts; those FB counts are MEASURED-TRUTH asserts (hard rule 5). Seeding the gate would
    break or force-regenerate measured-truth asserts, so the gate stays EV. Its existing seed-1234 determinism
    test is unaffected.
  - **AGGREGATION = MEAN (owner-discussed 2026-07-17), not median / random-sample.** We compare against real
    MULTI-RUN AVERAGES → estimate E[sim] = the mean. The one non-normality is FB-count bimodality near boss
    transitions (N vs N+1 full bursts); the mean probability-weights the extra-FB outcome that a real average
    also carries, whereas the median snaps to the majority rotation and DISCARDS the minority. Variance sources
    are bounded/light-tailed (Bernoulli crit/core, ±2s uniform timing, symmetric bell-curve pellet draw), so
    median's outlier-robustness buys nothing. Random-sample aggregation rejected: it forfeits reproducibility +
    the common-random-numbers paired-A/B property the fixed seed set gives. N raised 10→25 (owner): SE ~1/√N so
    ~1.58× tighter (~37% less MC noise), ~14s board — helps most on the FB-bimodal comps. DONE: board-read
    prints a `seedSD` column (mean per-comp sd/mean; ⚠ ≥2%) via `BoardReading.seedCv` + `BoardStats.meanCv`,
    flagging high-variance comps (soda-twinkling-bunny ±3.1%, mast-romantic-maid ±2.3%) that need multi-run reals.
  Effect on the board (25-seed vs old EV): small shifts from crit/core Bernoulli + boss-timing + SG-jitter
  sampling (dorothy 1.023→0.997, naga 1.026→0.975, chisato 0.992→0.977). verify.sh green (EV path byte-identical).
  NOT committed.
  - This is a MODELING RULING, not a fit to close a residual — per-unit far/near deficits (U17) are accepted,
    not fudged. open-questions U17 header carries the CLOSED — OWNER OVERRIDE note.

- **(2026-07-17) FAVORITE-ITEM (treasure) prose sourced + reconciled — the ROSTER-WIDE TREASURE SSOT
  GAP is CLOSED.** The owner located the real favorite-item skill values and loaded them into the DB
  (bakery-side `skill_descriptions`); a resync (`npm run sync`) pulled treasure prose for the units
  whose favorite item was previously untreasured in the source text (helm, drake, laplace, miranda).
  The other four treasure=true roster units (moran, privaty, tove, zwei) were ALREADY on their treasure
  kits via `sync.ts` `TREASURE_SYNERGY_IDS`, so their prose changed only cosmetically (phase-header
  removal) — no model change. Enacted overrides:
  - **helm 0.591 COLD → 1.014 (±3% ✓), 5 comps 0.98–1.05** — the headline board fix. Restored the two
    dropped treasure lines the Wave-7 audit had flagged: S2 Full-Burst team **attack damage 11.85 → 27.87**
    and the S2 **178.98% full-charge additional hit** (modeled on `shotFired`, every SR full charge —
    liberalio precedent), plus the burst 54.45% recovery as a `heal` event. Her untreasured-era 0.99
    validation used the OLD runtime parser (which included treasure), so this RE-ALIGNS the model with
    that validated state — not a new tune. Blast radius is faithful: her restored 27.87% team buff +
    heal→Crown synergy warm her comp-mates (crown 1.029, privaty 0.977, anis-star 0.952 — all toward
    1.0; snow-white-heavy-arms 1.11 / cinderella-crystal-wave 1.041 tip HOT, but both carry pre-existing over-model /
    low-N — faithful > fit). Every FB measured-truth assert stayed green; noir anchor +0.0000%.
  - **laplace — REVERTED the Wave-6 downgrade.** Wave 6 (2026-07-16) read the untreasured base kit
    (burst First 897.6 / Normal 14.52 / 5s, no true-normals) and dismissed the higher 1455.72 / 22.2 /
    10s + true-beam values as "old fan text." The favorite-item prose is authoritative and CONFIRMS
    those were the treasure kit — restored: burst First **1455.72** + `weaponSwap` Normal **22.2 / 10s /
    trueNormals** + the 11.9% true rider; S2a `lastBullet` 81.66 → **`shotFired` full-charge 132.45**
    (charge RL, every rocket is a full charge). Model-only (no board comp).
  - **drake — treasure additions** (model-only): S1 hitRate 11.85 → 20.09 + NEW all-Shotgun-ally block
    (`alliesOfWeapon` SG) ATK 63.88 / maxAmmo 50.14; S2 NEW 2nd nuke 201.6 (`hitCount` 50); burst
    1254 → 3009.6 + self AD 31.68. All blocks DBG-confirmed firing.
  - **miranda — CONFIRMED already correct**: her override (built from the 2026-07-13 owner screenshot)
    matches the newly-synced treasure prose line-for-line; documentation-only note. Unowned/model-only.
  Basis: the owner's ruling that blablalink/DB prose is the objective SSOT still holds — the SSOT source
  itself was corrected with the treasure data, so restoring the higher values is not re-litigating the
  Wave-6 entry, it is the SSOT being made complete. Nothing committed/pushed (standing rule).

- **(2026-07-16) Soda & Cinderella: Crystal Wave re-tuned against recordings — the kit-parse blind parser
  out-predicted both trusted hand-tunes (Use-B discrepancy detector working), and the fixes are adopted.**
  Both surfaced during the kit-parse regression sweep; both Fable pre/post-op LAND.
  - **Soda: Twinkling Bunny — 3 measured bugs, 0.667 → 0.887 vs real** (soda tb control.mov). (1) Crit-damage
    is CHIP-POOL-tied, NOT a ramp-from-0: the prior model built `critDamagePct` via `everyN 3` in-FB casts
    (~4 stacks, +5%), but a t=8 pre-burst popup (chips=50, zero in-FB casts) showed crit ×2.160 =
    (150+50×1.32)/100 EXACTLY — crit tracks the Golden-Chip pool (starts 50). Now `passive critDamagePct 42`
    (measured trace time-average ~31.6 chips). (2) Burst ATK ▲65.25% (@≥30 chips) fires on EVERY burst, not
    first-burst-only: chips consume AFTER the effect ("▼17 after applied") so the gate reads PRE-consume
    (50/44/40/38/31, all ≥30); the prior `everyN 99 offset 1` traced the POST-consume pool (isolated-shard
    error). (3) rider 100→130 (Time-Ext-II dominant), FB-extend 3→4 (measured). **This OVERTURNS the
    2026-07-15 "GOLDEN CHIP self-buffs MODELED" entry** — licensed: the old entry rested on a post-consume
    trace inference; the new evidence is exact popup arithmetic on a focused recording (strictly higher tier).
    0.887 is an honest MISS vs the pre-registered [0.90,1.05], NOT fit to 1.0 — the datamine-max fit
    (crit 50 → ~0.955) was rejected as trace-contradicted (the pool demonstrably drains); residual = SG spray
    + a separate rotation over-generation bug (6 sim bursts vs 5 real, open-questions).
  - **Cinderella: Crystal Wave — core-strike rider restored, ~0.87 → 0.99/1.02 vs real** (T5/T8). Her FB-enter
    proc text = "Deals X% … as CORE STRIKE damage" and "activates when entering Full Burst"; the prior HT set
    `trigger:burstCast` (fires PRE-FB → loses the +50%) AND dropped `core:true`. Restored to text-faithful
    (`fullBurstEnter` + `core:true`, both MG/Snipe modes). **NARROWS (not reverses) the 2026-07-13 U1
    no-core ruling**: function-type additional damage stays no-core BY DEFAULT — the carve-out is riders whose
    text EXPLICITLY says "core strike," confirmed by single-variable measured tests on two comps. Drove the
    kit-parse rider-core text-fidelity rule.

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

- **(2026-07-16) DPS Rankings element filter — an element-filtered chart ranks ALL B3s of that element,
  not just the SSS/SS chart population.** The rankings page grew an element filter (All / Fire / Water /
  Wind / Electric / Iron, same pill UI as the boss-weakness picker; "All" = the prior behavior). Ruling:
  the unfiltered charts keep the SSS/SS-only population (the artifact's chart-population flag), but a
  single element has only a couple of units at those tiers (Electric: 2), which defeats the point of the
  view — so the element filter bypasses the tier gate and ranks every B3 of that element in the artifact
  (Electric: 9). Compare-a-unit is element-scoped while filtered: its rank/total are within that
  element's population, and a compare unit of a DIFFERENT element shows no annotation (it has no place
  in that ranking). Share links carry the filter (`ele` URL param) and share-image titles get an
  "· <Element> only" suffix so the exported chart is self-describing. Implementation note: the
  balanced-wrap pill grid moved out of the sim app into a shared component (`web/src/components/
  PillGrid.tsx`) so other pages can use it without a circular import.
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
- **(2026-07-16) Solo control framework (DPS chart, owner spec): the tested B3 in TOTAL isolation —
  three synthetic no-op units instead of named supports.** Team order: no-op B1 (AR), no-op B2 (SR),
  tested (slot 3 = camera focus), no-op B3 (RL). The no-ops (`src/dpschart/noop.ts`) deal zero damage
  (`normalAttackMultiplier 0`), carry zero skills (empty kit text → the parser yields no blocks), and
  generate weapon-class-modal burst gauge (new `class-modal-*` entries `noop-b1-ar`/`noop-b2-sr`/
  `noop-b3-rl` in `data/gauge-per-shot.json`); their weapon data are the weapon-class MODAL values
  from characters.json. Every unit gets a flat **7s burst CDR** (new `UnitOptions.burstCdrSec`,
  applied to the charFixes-corrected cooldown, floor 1s): no-ops 20/20/40 → 13/13/33s, tested (all
  40 tested-population B3s have 40s base) → 33s. Contract: **the tested unit bursts every OTHER Full
  Burst**, alternating with the no-op B3 — enforced by a new engine gate `burstGate: 'everyOther'`
  (never take stage 3 twice in a row), because cooldown arithmetic alone breaks on FB-extending kits
  (Modernia's 15s Full Burst put her cooldown inside the next stage window, where the measured
  leftmost-with-waiting rule stalled the chain ~8s and handed her consecutive casts). The gate is a
  framework modeling switch, opt-in per unit; no real/validation comp sets it, and the regression
  snapshots are byte-identical. Matrix grows 72 → 90 cells (5 frameworks). Contract pinned in
  `scripts/regression.ts` check 5 (zero no-op damage + strict alternation, scarlet + modernia).
  — src/dpschart/noop.ts, matrix.ts, run.ts; src/prepare.ts; src/engine/sim.ts gatePasses.
- **(2026-07-16) SG landing table: class-wide range refit REJECTED on a pre-registered split; landing
  is per-unit (LOG, no engine change).** The isabel solo read's hypothesis (far 0.75→~0.66, mid/midfar
  also high) was tested against two new pre-registered solo counter reads. Outcome: brid-silent-track
  corroborates isabel's far value almost exactly (M 0.709 vs predicted 0.710; both clean anchors imply
  far landing ~0.65–0.66), but guilty reads as the CURRENT table shape × a flat ~0.91 per-unit landing
  factor (near landing 0.81 measured by direct pellet-lattice counting), and near landing varies
  per-position within one fight (brid-silent-track 8.52 vs 9.41 pellets/10 by boss proximity). Per the
  pre-committed decision rule (split branch) + a 2-of-2 driver/blind-Fable judgment: **`SG_LANDING_BY_BAND`
  stays near 0.9 / mid 1.0 / far 0.75 / midfar 0.9**; the two-anchor far ~0.66 candidate is STAGED ⚑
  (calibrated-with-measured-support), gated on a third clean anchor or a per-unit landing mechanism;
  per-unit facts recorded in the unit baselines + probe records. Re-litigating the class table needs a
  new same-tier (counter-reconciliation video) read. Evidence: docs/probe-data/{guilty,brid-silent-track,
  isabel}-sg-band.json; plan archive docs/handoffs/2026-07-16-sg-landing-prereg.md; open-questions
  U17/U18. Side findings landed: guilty S1 self-applies solo (refresh-all ×5) + her S2 bumps buff stack
  counts (measured); brid-silent-track S2 rider = every 5th PULL, fixed 673,819/1,010,728 (675.00% exact
  at her measured term); isabel S2 rider = time-based ~14.7s (her baseline fixed accordingly); the
  in-fight ATK term reads ~+1.6% above the scope-lock static on all three SG probes (U18, open).
- **(2026-07-16) Relationship (bond) bonus is now MODELED — a flat class×manufacturer ATK/HP stat, default max.**
  The sim read ~1.5-2% cold across scope-lock units (open-questions U18); the owner identified the cause
  as the unmodeled relationship (bond) bonus. It is a flat stat set by two things: the unit's MANUFACTURER
  fixes the max bond level (Pilgrim/Overspec 40, Elysion/Missilis/Tetra/Abnormal 30) and the CLASS picks the
  HP/ATK/DEF column at that level (in-game bond table, data/relationship-bonus.json). Verified: the owner's
  per-unit adds equal the table at the manufacturer max EXACTLY (L40 Attacker ATK 2340 = Pilgrim isabel/
  scarlet(AR); L40 Supporter 1950 = Pilgrim nayuta; L30 Attacker 1640 = Tetra noir; L30 Defender ATK 1094 +
  HP 45097 = maiden). This DEFINITIVELY closes the core-8 and OL0-gear hypotheses (both desk-eliminated:
  core maxes at 7 and is validated by the 2026-07-13 120,143 read; base5 gear stands — U18 does NOT reopen
  the 2026-07-14 gear ruling). IMPLEMENTATION: `manufacturer` synced into characters.json (sync.ts, from the
  DB attributes; Overspec units — mihara-bonding-chain/rapi-red-hood/anis-star/neon-vision-eye — get
  " Overspec" appended → the 40-cap bucket); `src/relationship.ts` computes the bonus; the engine adds it to
  staticAtk + maxHp in the unit build, driven by `relationshipLevel` (SimConfig + per-unit PreparedUnit),
  DEFAULT = the manufacturer max (so scope-lock and every harness get max; the web defaults max and exposes a
  per-unit input). Regression snapshot regenerated (all-green, no FB-count or measured-truth assert changed);
  board warms ~+1.4-2%. Faithful side-effect logged: the maxwell "2 highest-ATK allies" S1 buff correctly
  retargets maxwell→liberalio (Pilgrim now genuinely top-ATK, was a degenerate tie) → maxwell −21%/liberalio
  +31%. FOLLOW-UP: recalibrate the noir-set SG landing table at the corrected term (it over-shoots now — the
  U17 coupling) — DONE 2026-07-16, see the next entry. DONE 2026-07-16: isabel/brid-silent-track baseline
  coefficients reverted to kit values (term now correct via relationship); "UC" was an owner typo (dropped).
- **(2026-07-16) SG landing table BOND-TERM RECALIBRATED — uniform ×0.9863, the coupling to the bond bonus
  above.** The noir counter-reconciliation that SET `SG_LANDING_BY_BAND` (docs/probe-data/noir-solo-recon.json)
  reconciled real 64.87M against a sim WITHOUT the relationship (bond) bonus (staticAtk 118027). Adding bond
  raises noir's ATK **+1.39% (measured two ways — staticAtk 118027→119667 = the total uplift 1.391% to three
  decimals)**, which scales her pure-SG-spray total linearly, so the base5-calibrated table over-shot by the
  same amount: **noir solo 1.006→1.020** (verified in-sim). Corrected by a UNIFORM scalar 118027/119667 =
  0.9863 on every band — this undoes ONLY the term change and preserves the SHAPE (U17 HOLD: the class table
  stands; the far ~0.66 candidate is orthogonal and NOT folded in). **near 0.90→0.888 / mid 1.0→0.986 /
  far 0.75→0.74 / midfar 0.90→0.888**; noir solo restored to its pre-bond point (1.006, verified). Board:
  SG units cool ~0.8–1.6% to cancel the bond warming (noir burst comps 1.053→1.040, dorothy-serendipity
  1.005→0.997, naga 1.191→1.175) while non-SG units keep the +1.39% — exactly the intended net (SG units
  were calibrated via the table, so their board positions are ~unchanged; the bond warms the cold non-SG
  board). Regression regenerated (7 SG-unit total drifts ≤1.23% + second-order gauge-timing shifts on
  teammates; NO FB-count/measured-truth assert changed), verify.sh green. `ENV.SGLANDING='prebond'` reverts
  the old table for A/B. Evidence: noir-solo-recon.json; measurement in-sim; open-questions U18.
- **(2026-07-16) PROSE-FREE RUNTIME — the engine never parses skill description text; overrides are the
  complete per-unit skill source of truth.** Previously the engine parsed each unit's skill prose at
  sim-build (`resolveSkills` ran the kit parser on all three slots, then per-slot override replacement),
  so re-sourcing the prose silently shifted sim behavior for any parser-dependent unit — exactly what the
  blablalink re-source did (the regression was knowingly left red pending this change). NOW: every roster
  unit's `src/skills/overrides/<slug>.json` defines ALL THREE slots as structured blocks plus (a) a
  required `unmodeled` field — verbatim kit-text lines the model deliberately does not represent, the
  auditable "no silent drops" record — and (b) an optional `caveats` field (display-only warnings; replaces
  the runtime parser-warning channel verbatim). The kit parser moved to `scripts/lib/kit-parser.ts` as an
  OFFLINE authoring tool; `scripts/materialize-overrides.ts` (kept — run after any sync that adds a unit)
  seeded the migration by freezing the parser's current output into every partial/missing slot, with a
  structural old-path≡new-path verify that passed 74/74 (regression failure-set and board-read byte-identical
  before the snapshot regen). A unit with no override now throws at prepare time (empty-kit carve-out for the
  dpschart no-op synthetics); the validator and verify.sh enforce all-slots + `unmodeled` for every roster
  slug and grep-guard that no runtime code imports the parser. Skill prose remains in characters.json as
  authoring input/display data (official blablalink text — the objective source of truth; drift vs anything
  derived from the old fan-recorded text is accepted, per-unit discrepancies get fixed individually). The 12
  previously-parser-only units (anchor-innocent-maid, blanc, bready, delta-ninja-thief, helm-aquamarine,
  liter, mana, mari, noir, scarlet, volume, zwei) carry note-marked MATERIALIZED PARSER OUTPUT files —
  behavior-identical, NOT hand-verified; their reviewed kit-parse hypotheses stay staged in
  `src/skills/overrides-baselines/` (promotion per MANIFEST guardrails replaces the materialized file).
  Snapshot regen executed here per the sync.ts plan (51 pre-existing prose-drift snapshot failures refit;
  ZERO measured-truth/full-burst asserts changed — all 13 were green before and after). `skillSource`/
  `source` ('parser'|'parser+override'|'override') removed — the distinction no longer exists. Hand-authored
  slots keep `unmodeled: []` until a backfill pass (skips remain documented in their notes; see CLAUDE.md
  NEXT INCREMENT).
- **(2026-07-16) Weapon-typed buff target `alliesOfWeapon` added; arcana-fortune-mate retargeted to
  shotgun-wielding allies (kit-faithful).** Her kit says "Affects all shotgun-wielding allies" (S1 39%
  caster-ATK on Full Burst end; S2 55% Attack Damage on her burst, "except self"), but the model
  approximated both as `alliesOfClass Attacker` because no weapon-typed target existed — and
  `alliesOfClass` silently ignored `excludeSelf`, so she was also self-buffing the 55% against the kit
  text. NOW: new target kind `{ kind: 'alliesOfWeapon', weapon, excludeSelf? }` (engine, offline parser
  — "all <weapon>-wielding allies [(except self)]" with the prose→code word map AR/SMG/SG/SR/RL/MG —
  validator, web buff-summary label); her S1/S2 now hit SG wielders regardless of class, excludeSelf
  enforced (DBG-verified: noir receives both, modernia/self correctly excluded). Board: her solo reading
  cools 1.806→1.420 (still HOT — the known self-buff-magnitude residual stands, hand-tune pending);
  comp-mates lose the spurious class-wide buffs and read their true state (privaty 1.166→0.968,
  snow-white-heavy-arms 1.169→1.072, diesel-winter-sweets 1.156→0.831 — the latter consistent with her
  already-flagged Intro/Highlight REVIEW). No regression snapshot drift (no pinned comp contains her);
  measured-truth asserts untouched. FOLLOW-UP: tove's kit also targets "all shotgun-wielding allies"
  (S2 attack-speed line, burst ATK split) but her override is stale against the official prose beyond
  targeting (values differ, one line unmodeled) — full per-unit reconciliation queued, not patched here.
- **(2026-07-16) crown One For All rebuilt kit-exact (per-chain caster/non-caster groups + reload speed +
  burst shield) — and the blablalink-wording misparse class it exposed fixed roster-wide.** The materialize
  freeze had inherited three offline-parser misses against the new official wording: "allies who previously
  USED their Burst Skills" (old text "cast") fell through to ALL allies; "ATK ▲ X% of the SKILL USER'S ATK"
  (old "caster's") parsed as plain `atkPct` — each target buffed by % of its OWN ATK instead of a flat % of
  crown's supporter ATK, a large spurious over-buff; and "Reload Speed" (old "Reloading Speed") failed the
  stat map, dropping a damage-relevant 44.35% reload buff (the engine consumes reloadSpeedPct in reload
  frames). Crown's S1 now models the kit's DISJOINT per-chain groups directly: at Full Burst start, THIS
  chain's burst casters get casterAtkPct 64.51 + reloadSpeedPct 44.35 (15s); non-casters get defPct 37.44
  (damage-inert, recorded) + reloadSpeedPct 44.35 (engine burstCasters/nonBurstCasters reset at FB end, so
  membership is per-chain — DBG-verified: an alternating B3 gets the caster buff only in chains it bursts).
  Her burst adds the NEW `shield` effect (event-only, like `heal`: no HP pool in v1; fires targets' new
  `shielded` triggers so shield-synergy kits — e.g. naga's shield-gate — can later key off it faithfully;
  maxHpPct recorded). Offline parser upgraded for all four wordings (+ DEF ▲ now parses to the inert defPct
  instead of an IGNORABLE drop). ROSTER AUDIT: all 74 units scanned for the four patterns; 13 MATERIALIZED
  slots carried the misses and were RE-FROZEN with the upgraded parser (ade-agent-bunny, anchor-innocent-maid
  ×2, d-killer-wife, delta-ninja-thief ×2 incl. her self-shield, elegg-boom-and-shock, little-mermaid,
  ludmilla-winter-owner — her 67.2% burst reload now real, mari, noir, prika, quency-escape-queen, raven);
  16 hand-authored slots also match the wordings but were authored with the correct reading — left to the
  per-unit reconciliation follow-up. COUPLING CHECK: noir (SG-landing anchor) solo total is BIT-IDENTICAL
  after her S1 atkPct→casterAtkPct (self-targeted, same arithmetic solo) — the landing table basis is
  untouched. VALIDATION: crown board reading 0.788→0.997/0.999 at N=12 (her cold mystery was the missing
  self-reload + the fake team buff's removal); board totals ±3% 0→3, ±5% 5→8, ±8% 13→20, worse 31→24 across
  the two fixes; ALL measured-truth full-burst asserts green throughout (reload buffs did not shift chain
  timing); snapshots regenerated with the change. Owner correction that triggered this: crown "had solved
  problems that regressed" — root cause was NOT the materialize pass (hand-tuned skill2 was preserved
  verbatim; S1/burst were always parser-driven) but the prose re-source degrading the parse, which the
  freeze then made visible and fixable.
- **(2026-07-16) KIT-PARSE ROLLOUT + kit-status.json SSOT — the offline parser is a starting point, not
  an endpoint.** With the prose-free runtime, most override content was still frozen regex-parser output
  (the crown misparse class). RULING: every roster unit goes through the full kit-parse subagent flow —
  AUTHOR mode for parser-origin slots (staged overrides-baselines merged; hand-authored slots preserved
  verbatim), AUDIT-only mode for hand-authored/validated slots (unmodeled backfill + structured findings;
  NO block edits — reconciliation is owner-approved). Agents run open-book but VALUES-WITHHELD (never
  grade.ts/sweep-grade.ts/experiment COMPS/board output/other units' probe-data totals — they must not be
  able to fit to the board); candidates go to a per-wave staging dir, the driver promotes serially
  (kit-parse non-negotiable 3). TRACKING: `data/kit-status.json` is the per-unit single source of truth —
  kitParse status/provenance/findings, tuning tier (ABSORBED `data/hand-tuned.json`, now deleted; the tier
  vocabulary stays in docs/hand-tuned.md; scripts/refgrade.ts + scripts/battery/hand-tune-714noon.ts
  repointed), unmodeled kit text mirrored from each override, and board pass records (per-comp sim/real
  ratios via the new shared collector scripts/lib/board-readings.ts, which board-read.ts also consumes —
  output byte-identical). `scripts/kit-status.ts` maintains it (--refresh regenerates derived fields,
  --set/--finding update workflow fields, --check is a verify.sh gate: roster coverage + fresh
  unmodeled/provenance mirrors). Wave protocol, wave order (materialized class first; noir carries an
  SG-landing-anchor guard: solo total moves >0.5% → owner sign-off), and the wave log live in
  docs/handoffs/2026-07-16-kit-parse-rollout.md. Done-when: all 74 units authored/audited/reconciled with
  findings triaged; board improvement expected but NOT a gate (faithful > fit).
