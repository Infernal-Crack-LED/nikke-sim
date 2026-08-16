# DECISIONS.md — the WHY log (do not re-litigate)

Settled tradeoffs and rulings, dated, with the evidence that settled them. A future session that
wants to reverse an entry needs NEW evidence of at least the same tier (see
[CONVENTIONS.md](CONVENTIONS.md) for evidence tiers). Backfilled 2026-07-13 from the session record
and the answered trail (since 2026-07-26 in [answered-questions.md](answered-questions.md), formerly
the ANSWERED section of open-questions.md); each entry cites where its proof
lives. Newest first within each section.

## Modeling rulings (owner)

- **(2026-08-14, latest) `liberalio`'s kit-literal Charge Speed IMMUNITY is now enforced on the
  RECEIVING side, via a new per-unit `charFixes.statImmunities` primitive.**
  - **The kit line, verbatim** (`data/characters.json` → `characters.liberalio.skills.skill2`):
    "Activates at the start of battle. Affects self. Gains immunity to Increase Charge Speed
    effects… Gains immunity to Decrease Charge Speed effects. This effect is continuous and cannot
    be removed." The modeling question was never open — this is an encoding of a literal kit line
    (owner-approved 2026-08-14), so it took the "we know the answer ⇒ encode + code-review" path,
    not `/scientific-method`.
  - **The defect it fixes.** The engine summed every active `chargeSpeedPct` buff unconditionally
    when computing charge frames (`src/engine/sim.ts`, the charge branch of the weapon tick). Only
    her OWN skill-1 grant was kept off her, by `excludeSelf` on the target selector — an external
    source still reached her. Live case, comp "PG iron sweep" (`d-killer-wife` · `takina` ·
    `milk-blooming-bunny` · `maxwell` · `liberalio`): `maxwell`'s skill 1 grants
    `chargeSpeedPct 4.48` BUNDLED with `atkPct 43.1` in one 10s Full-Burst-entry cast to the top-2
    static-ATK allies, and it was speeding `liberalio` up.
  - **The enforcement design: strip at BUFF APPLICATION, per stat and per target.** An override may
    now declare `charFixes.statImmunities: string[]`; `liberalio.json` carries
    `["chargeSpeedPct"]`. In `applyEffect`'s per-target loop the immune stat is dropped for that
    target before `applyBuff` runs, so the buff never enters her list at all (visible under
    `DBG_BUFFS`, which also logs an `[immune …] stripped …` line). Chosen over a read-time filter
    in `stat()` because the kit line is a property of the RECEIVER, not of the charge formula, and
    because it keeps the rest of the cast intact: the bundled `atkPct 43.1` still lands on her, and
    the same cast still reaches every other target. Direction-blind, as the line reads: an increase
    and a decrease are both stripped. Target SELECTION is unchanged — she still occupies a selector
    slot, which is exactly what lets `maxwell`'s bundled ATK reach her. The match is against the
    APPLIED stat key (post `applyEffect`'s authored→applied rewrite), and
    `src/skills/validate-structural.ts` now rejects a typo or an authored-side alias as an ERROR,
    because the whole enforcement is a bare string match and an unmatched entry would be a silent
    permanent no-op with the note claiming protection (pinned by four cases in
    `scripts/tests/validate-structural.test.ts`). Plumbing: `src/skills/index.ts` (schema) →
    `src/prepare.ts` (`PreparedUnit.statImmunities`) → `src/engine/sim.ts`
    (`UnitState.statImmunities`, a Set built once per run).
  - **SCOPE — IMMUNITY BLOCKS IN-BATTLE BUFFS ONLY; CUBE AND OVERLOAD GEAR STATS STILL APPLY
    (owner ruling, game behaviour, 2026-08-14).** The cross-family `/code-review` of this diff
    surfaced that cube and Overload stats never pass through `applyEffect` — `prepareUnit` turns
    them into `extraStats` that are pushed straight onto the unit's buff list at construction — so
    the `adjutant` and `quantum` cubes and the `chargespd` Overload line, all of which carry
    `chargeSpeedPct`, would still reach her. **The owner ruled that this is correct game behaviour:
    a kit immunity of this shape suppresses in-battle buff EFFECTS, not the holder's own gear.**
    The shipped apply-time enforcement point is therefore the FAITHFUL one, not an approximation of
    a broader rule, and no code change follows. Inert on the graded basis regardless (scope lock is
    no-cube / OL0); the ruling's live surface is the web app, where a user can equip both. The
    non-`buff` effect kinds that also resolve per target (`unlimitedAmmo`, `gainPierce`,
    `convertExcess`, `addStack`) remain uncovered — inert by mechanism today, since
    `chargeSpeedPct` reaches none of them.
  - **Same-pass prose correction (no code effect).** Her override's Q8 sentence read "her
    chargeFrames already reflect the full validated cycle (kit-fixed 1.2s / DB 90f)" — 90f is
    **1.5s**, and the 1.2s belonged to `snow-white-heavy-arms` (`charge_time` 120cs → 72f). The
    number the engine uses was always right; only the parenthetical was wrong, and it is now
    stated from the datamine (`characters.liberalio.role.weapon.shot_detail.charge_time` = 150cs
    → 90f = 1.5s, no `charFixes` override). Recorded here because it silently corrects a
    previously-published figure. Related owner question answered in the same pass: her charge time
    does NOT vary by stage-boss vs non-boss in the direction one might assume — the stage-target
    branch (Raging Current) modifies Attack Damage only, and the sole kit line touching charge TIME
    is Gentle Current's 1s fix on the NON-stage-target branch, which can never fire in a solo raid.
    So the live 90f IS the stage-boss value; nothing to change.
  - **Spec test.** `scripts/tests/units/liberalio.test.ts` group L7 (6 new cases, 26 total GREEN):
    an injected external `chargeSpeedPct 50` aimed at her alone leaves her shot frames
    BYTE-IDENTICAL while the `atkPct` bundled in the same effects array still lands; the same buff
    DOES speed up `helm` (SR/Water, non-immune); one team-wide cast reaches all three other allies
    and not her; her own skill-1 grant to `helm` is unchanged. DISCRIMINATING case: the identical
    run with `statImmunities` deleted from her override shows the buff reaching her and her shot
    count RISING — the encoding is load-bearing, not decorative.
  - **Measured A/B (deterministic EV, `SEEDS=1 ONLY="iron sweep" npx tsx scripts/experiment.ts`,
    branch vs its merge base).** `liberalio` on PG iron sweep: 94 → 92 pulls, 519M → 487M total,
    sim/real ratio **1.07 → 1.01**; comp Full Bursts **11, UNCHANGED** (first FB 5.7s in both).
    Every OTHER comp in the lab is byte-identical, including her three other seated comps (T1
    wind-weak, T5 wind-weak probe, N3 scarlet/liberalio iron). **The enabling teammate is
    `maxwell`, and PG iron sweep is the only comp of the four that seats her** — an override-wide
    check of the other three rosters (`mast-romantic-maid`, `scarlet-black-shadow`, `anis-star`,
    `crown`, `nayuta`, `cinderella-crystal-wave`, `velvet`, `rouge`, `trina`,
    `soda-twinkling-bunny`) finds no `chargeSpeedPct` grant reaching her; `anis-star`'s
    charge line is a self-scoped `chargeTimeClamp`, a different primitive this immunity does NOT
    cover. So the one-comp footprint is inertness BY MECHANISM elsewhere, not an untested claim. `npx tsx scripts/regression.ts` is green with NO snapshot
    regeneration: all four `liberalio` comps are currently disabled in the harness, so the pinned
    snapshot never saw this.
  - **It moves iron sweep AGAINST the known gauge shortfall — faithful over fit.** Two fewer
    `liberalio` charges per fight is less burst gauge, and the burst chain re-phases (mid-fight
    Full Bursts move by up to ~0.9s; count preserved). The comp's measured generation shortfall
    widens from 14.94 to 16.38 gauge/s (`npx tsx scripts/battery/fb-count-matrix.ts
--refill-starvation`). That is accepted: the generation thread is a separate, open
    investigation and a kit-literal line is not traded away to flatter a ratio.
  - **⚠ Three battery drift-guard fixtures trip on this and are DELIBERATELY LEFT RED, not
    re-pinned** — `scripts/tests/battery/refill-starvation.test.ts` (4),
    `scripts/tests/battery/gauge-source-census.test.ts` (2),
    `scripts/tests/battery/focus-columns.test.ts` (1). All seven failures are `iron sweep (run G)`
    quantities; every `T5 wind-weak` pin still holds. The audit's headline verdict survives
    (first-1s delivery 114.7% → 86.0%, still NOT-STARVED above the pre-committed 0.8 threshold),
    but its descriptive shape claim on that comp does not: the window is no longer front-loaded
    (`teamRate[0]` 3.27 < `teamRate[3]` 3.64) and `milk-blooming-bunny` reads 38% first-1s
    delivery, under the fixture's 0.5 floor. Those files' own header says "Re-derive, don't
    re-pin… only re-pin once the NEW finding is understood"; re-writing a published audit
    conclusion is a separate gated pass, not a side effect of a kit fix. Owner action item.
- **(2026-08-14) The real Full Burst duration is EXACTLY 10s unless an ability extends or
  shortens it — owner ruling. The tempo-gap attribution resolves: the missing quantity is
  GENERATION, at the full point-estimate size.**
  - **The ruling (owner, 2026-08-14).** Asked to resolve the tempo-gap measurement's unresolved
    split (real Full Burst duration was only bounded at ≥8.73s / ≥8.87s on the two filmed comps,
    leaving "the real Full Burst is shorter than the modeled 10s" disfavoured but not excluded —
    `docs/probe-runs.md` 2026-08-13), the owner ruled: **Full Burst is exactly 10s, modified only
    by abilities** (e.g. `fullBurstExtend` carriers). The modeled 10.0s is confirmed faithful; the
    planned FB-duration footage read is CLOSED as a dead end — do not measure it.
  - **Consequence: the generation shortfall is CONFIRMED at its point estimates.** With the FB
    term fixed at 10s and the chain ladder already footage-exonerated, the filmed-cycle conversion
    in `docs/fb-count-matrix.md` stands un-hedged: the sim feeds the bar **61%** (iron sweep run
    G) / **50%** (T5 wind-weak) of what the real fights require. The refill-window error is no
    longer a range — 100% of the measured ~1.65s/cycle tempo gap sits in burst generation.
  - **The sharpened contradiction this creates.** Iron sweep (run G) is five SR units whose
    per-shot gauge values match the datamine against two solo bar anchors, whose focused (×2.5)
    and unfocused (×1.0) charge multipliers are both measured (2026-07-13 A1/A2 battery), and
    which carry zero burst-gauge kit lines (roster census 2026-08-14) — yet the real fight
    demonstrably generates ~38.6 gauge/s where those same measured values produce 23.7. Some
    settled premise breaks in TEAM context, or a source with no sim primitive exists. The ranked
    remaining avenues + the discriminating next measurement (refill-window fill-trace read on the
    existing recordings) live in
    `docs/handoffs/2026-08-14-burst-generation-remaining-avenues.md`.

- **(2026-08-14) A MISSED shotgun pellet generates NO burst gauge — SG gauge credits per
  LANDED pellet, confirmed. `SGGAUGE=trigger` survives as the refuted reading's A/B revert.**
  - **The ruling (owner, 2026-08-14).** Asked whether a missed SG pellet generates burst gauge
    (per-landed-pellet vs per-trigger crediting — investigation-plan item 4, open-questions U40),
    the owner answered: **no, it doesn't.** The engine's live model — `shotGauge(u, frame,
sgGaugeFrac)` in `firePull`, gauge scaled by the base-capped landed-pellet fraction — is
    therefore the FAITHFUL one. Nothing changes in default behavior; this is a confirmation, not
    a fix.
  - **Why it was open.** The primary sources never distinguished the two: the datamine column is
    per-trigger (`target_burst_energy_pershot`; its per-pellet × `shot_count` split is table
    structure, not a miss test), the "fill counts HITS, not damage" lineage is gauge-vs-damage,
    and the one explicit statement (auto-play.md §4 "missed pellets generate nothing") had ridden
    the 2026-07-13 SG damage-falloff ⚑ calibration as a parenthetical with no gauge-side record.
    No SG solo gauge-bar recording has ever been read (both solo anchors are charge weapons). The
    item-4 audit therefore prescribed an owner ruling before a measurement — and got one.
  - **The refuted reading is SIZED, so it stays dead.** The audit's ceiling arm
    (`SGGAUGE=trigger`, sim.ts — full per-trigger gauge per SG spray pull, gauge-only, default
    OFF) lifts SG-carrier generation +27–48% (team +7–17% on all five SG-seated off-count comps)
    and moves **zero** Full-Burst counts anywhere (31-comp EV board: 0 FB movers; the four SG-free
    comps byte-identical). Instrument: `scripts/battery/fb-count-matrix.ts --multihit-crediting`,
    pinned by `scripts/tests/battery/multihit-crediting.test.ts`. The arm is kept — default OFF —
    as the refuted reading's A/B revert, the same footing as `ROTMODEL=floor` for the overturned
    post-FB chain-open block. Do not re-open without new evidence.
  - **Consequence for the burst-generation thread.** Item 4 was the last of the plan's four
    candidates; all four closed without explaining the filmed 39–50% generation shortfalls, so
    the plan's stop condition stands: the remainder is not in any of the four generation
    candidates and sits with the owner (handoff doc carries the status block).

- **(2026-08-13) Burst gauge generates in exactly ONE window per cycle: FB-end → chain-start.
  Re-confirmed by the owner and pinned in three places so it stops being re-asked.**
  - **The ruling (owner, 2026-08-13).** "During the burst chain and full burst, gauge cannot be
    generated. It can only be generated during the period of time after a full burst ends and before
    the burst chain starts." Nothing bypasses it — not bullets, skill hits, DoT ticks, riders, or
    "Gain Burst Gauge X%" effects. Opening the chain zeroes the bar.
  - **Nothing changed; this is a recording, not a fix.** The engine already implements it (the
    `addGauge` lock in `src/engine/sim.ts`) and both mechanics docs already stated it. The problem was
    findability: it appeared only as a mid-bullet NEGATIVE ("locked during FB and the chain"), so
    fresh sessions kept re-deriving it as if open — the owner reports asking for it to be written down
    permanently several times.
  - **Where it now lives, stated POSITIVELY:** `CLAUDE.md` "Verified facts (do not re-derive)" (the
    first thing a session reads), `docs/data/burst-gauge.md` §1 as a callout above the core rules, and
    `docs/data/game-mechanics.md` §6. Positive framing is the point: "the generating window is
    FB-end → chain-start" answers the question a session is actually asking, where "locked during FB"
    only answers half of it and leaves the chain ambiguous.
  - **Consequence for the open tempo-gap work.** The FB-end → next-B1 gap is therefore the WHOLE
    generating budget of a cycle — a shortfall there cannot be explained by uncounted generation
    inside the chain or the Full Burst, which removes a whole family of candidate mechanisms before
    the footage is read.

- **(2026-08-13) True damage is a FLAVOR, not a property change — so what may CORE depends on
  the SOURCE, weapon vs skill. Engine already conformant; recorded as a pin, no code change.**
  - **The ruling (owner, 2026-08-13).** "True damage just functions like pierce where it changes the
    flavor of the damage, not the properties of the damage. If a WEAPON is dealing true damage, it can
    crit and core. If a SKILL is dealing true damage, it can crit but not core." Stated generally —
    it governs **every** `trueFlavor` weapon swap, not only the `chisato` case that surfaced it.
  - **Why this was open.** `chisato`'s override carried an escalated ⚑ — "whether true damage should
    CORE is an ENGINE-fidelity question out of this override's domain", large because SMG `coreMult`
    is 250. It was filed as footage-gated (batch 7). It was not: it was an owner-knowledge question,
    and asking cost nothing.
  - **The engine already implements exactly this, by two independent paths** (verified 2026-08-13, not
    assumed). WEAPON: `trueFlavor: !!u.swap?.trueNormals || u.hasTrueNormals` rides the normal-fire
    path, so those shots crit and core like any other normal — correct per the ruling. SKILL: dot /
    rider / flatDamage instances core ONLY via an explicit per-effect `coreRate` or the `XCORE` A/B
    env, and a field-form scan finds **zero** overrides pairing `flavor:'true'` with a `coreRate` —
    so skill-sourced true damage does not core. Crit was already settled (2026-07-25, in-game
    confirmed): true damage CAN crit, both paths.
  - **Consequence: no code change, and that is the finding.** The ⚑ closes as CONFORMANT rather than
    as a fix. The risk this leaves is silent DRIFT — nothing stopped a future override from setting a
    `coreRate` on a true-flavored skill effect, which is precisely the shape the ruling forbids — so
    the rule is now pinned by a test rather than by prose. Carriers of the weapon path today:
    `chisato`, `clay`, `eunhwa-tactical-upgrade`, `frima`, `jill`, `laplace`, `takina`.
  - **Method note worth keeping.** Two of this session's "footage-blocked" items dissolved on being
    asked about instead of measured. The 2026-08-11 M-list triage recorded the same lesson in its own
    words — "ask the owner before asking for a camera".

- **(2026-08-13) A burst chain has ONE clock, not two: it lives 10s, and any unit that comes
  off cooldown inside it may fill it.**
  - **The rulings (owner, 2026-08-13).** An unfinished burst chain takes **10 seconds** to time out.
    The timeout and the auto's filler-wait horizon "should be two separate constants". And: "a unit
    that comes off cooldown mid-chain gets to fill it."
  - **What the engine did.** A single `STAGE_WINDOW_FRAMES` = 120f served BOTH questions. Expiry
    inherited a value calibrated for the other one (DECISIONS 2026-07-21, the filler-wait grace), so
    a stalled chain died at 2s instead of 10s and the bar began refilling 8s early.
  - **The third ruling collapsed the split back to one constant — and that is the interesting part.**
    Separating the clocks first created a state that cannot occur in game: a chain ALIVE but
    unfillable, because the filler-wait horizon still refused everyone after 2s. Encoding "a ready
    unit may always fill a live chain" fixes that — and then makes the horizon **unreachable**: a
    not-ready unit never casts (the cast requires `burstCdFrames === 0`), so admitting or refusing
    it as a candidate has no observable consequence. Verified by deleting the clause outright —
    every graded FB count, every damage total and all four probe comps' rotations were
    byte-identical at horizons of 1f, 120f and 600f, on both the default first-ready path and the
    legacy `B3_LEFTMOST` one. So `STAGE_RESERVE_FRAMES` was REMOVED rather than kept beside its
    replacement: a calibrated-looking constant that cannot move anything invites re-tuning that does
    nothing. The 2026-07-21 calibration is not overturned — it is SUPERSEDED by the first-ready
    selection rule plus this one, which make the situation it corrected unreachable.
  - **Blast radius.** Board-neutral: all 8 graded Full-Burst counts hold and ZERO damage totals
    drift, because no graded comp ever stalls a chain. The change is visible only where one does —
    the `maxwell-ordinary-mechanic`/`ada` fixture's second chain now dies at 33.9s (10s after its
    stage-2 cast) instead of 25.9s, and chains whose Burst III comes off cooldown inside the window
    now COMPLETE instead of dying.
  - **Eight spec assertions across six units had to be repaired**, all for the same reason: they
    discriminated a trigger by COUNTING (casts vs Full Bursts, or total firings) and the rotation
    change made the two counts coincide. Each is now keyed to the anchor FRAMES or to a containment
    property instead — strictly stronger, and immune to the next rotation change. `emma`,
    `helm-aquamarine`, `mary`, `nihilister`, `sakura-suzuhara` (×2), `gain-pierce-rounds`. The
    lesson generalises: **a count is a lossy proxy for an anchor; discriminate on frames.**
  - **Evidence tier.** Owner ruling on game behaviour ⇒ ANSWERED, so `/scientific-method` does not
    apply (CLAUDE.md: known answer ⇒ encode + `/code-review`). Pinned by
    `scripts/tests/engine/chain-timeout.test.ts`, verified RED under `CHAIN_TIMEOUT=120`.

- **(2026-08-13) `velvet` has TWO mutually exclusive modes, and she is built to play as the
  OFF-B2 — her burst weapon is a 60-round/sec machine gun.**
  - **The rulings (owner, 2026-08-13).** Velvet "functions differently depending on which B2 uses
    their burst, and she is intended primarily to be the OFF B2". When she does NOT cast, the first
    block of S2 applies: the team buff (ATK 25.2% of her ATK + Charge Damage 100.8%, 3s) re-applied
    on every sniper shot. When she DOES cast, the second block applies instead: she switches to a
    machine gun with **no wind-up, 60 rounds/sec, no ammo and no reload**, lasting **10s from her
    own activation** (so it ends before Full Burst does), and **every buff she holds is
    self-targeted**. Separately: her ammo pouch is **NOT literal ammo** — it is a build/consume
    stack resource, and it never touches her magazine.
  - **Why the two blocks cannot overlap.** The MG cannot full-charge, so "Activates when attacking
    with Full Charge during Full Burst" is unreachable while swapped (`swapGate:'unswapped'`). Going
    the other way, her SR lands only 36 in-FB shots across a fight (7.2 per window) against the
    50-hit threshold of the second block. So each mode has exactly one live block.
  - **What the sim had.** The swap inherited her SR charge cycle and 6-round magazine — ~9 shots per
    window with a reload in the middle — which left the 50-hit proc (400.92% of final ATK + self
    Attack Damage 15.03%/5s) pinned at ZERO. That proc is the entire payout of her own burst. With
    the MG it fires 55 times a fight, ~11 per Full Burst window, off ~2740 in-FB swap shots.
  - **No engine change was needed.** The `chargeTimeSec` null-check and the sameWeapon/economy split
    landed the day before (see the 2026-08-12 swap-economy entry), and `PULLS_PER_SEC.MG = 60` was
    already documented as reachable only via a swap INTO MG, since the wind-up ladder is gated on
    the BASE weapon. Her swap is authored `weapon:'MG'`, `pullsPerSec:60`, `chargeTimeSec:0`,
    `maxAmmo:999`.
  - **Board impact: none, proven by A/B rather than by the gate.** The regression snapshot is
    byte-identical, but that is weaker evidence than it looks: the `T5 wind-weak` comp is
    `disabled: true` in `scripts/regression.ts`, so its snapshot assert never runs (and its committed
    values are separately stale at base HEAD — an unrelated pre-existing drift worth its own
    cleanup). The real proof is a direct A/B of that comp with and without the change: byte-identical
    for all five units, because velvet never casts there and `swapGate` is vacuous on a unit that
    never swaps. The change is judged on
    kit faithfulness, pinned by her spec test, which now runs TWO fixtures: the sole-B2 comp for the
    swapped mode and a crown-as-second-B2 comp for the unswapped mode, where she casts zero bursts.
  - **Her burst gauge: a swapped weapon generates NOTHING (owner ruling 2026-08-13).** Landed
    engine-wide in `shotGauge`, scoped to REAL weapon changes — a same-weapon flavor swap
    (`sameWeapon`: chisato/clay/jill/frima) still feeds the bar, because its gun never changed.
    Board-inert: zero drift on every graded comp and every measured FB count preserved, since every
    other swap already sat inside the gauge lock. What it fixes is velvet specifically: `gaugePerShot`
    keys off the unit's OWN weapon, so each 1-frame MG round had been credited her SNIPER's per-shot
    energy (5.6, a charged SR shot), refilling the entire bar in 0.3s whenever a stalled chain lifted
    the lock mid-swap.
  - **⚠ A correction, because the first version of this entry got the causality wrong.** Her Full
    Bursts land 90-126 frames earlier than under the old SR-economy swap, and that is NOT the gauge —
    an A/B isolating the gauge fix leaves the shift byte-identical. It is the RELOAD-CYCLE PHASE
    ripple: the MG carries its own magazine and hands the SR back full, so her reloads go 10 → 0 and
    her first post-swap shot lands 30f earlier, moving her own gauge contribution once the lock
    lifts. That is the same faithful-collateral mechanism already recorded for `jill` (2026-08-10),
    not a defect. The original claim came from correlating main-vs-branch without isolating the knob
    — exactly the failure the "don't attribute a composite gap to one mechanism" rule names.
  - **⚑ Left open deliberately.** The engine's `hitCount` counter is cumulative over ALL normal
    attacks and only GATES the firing, so it diverges from the kit-literal "during Full Burst"
    counting at low volume — 1 proc vs 0 in the off-B2 fixture (they converge, 55 vs 54, once swap
    shots dominate). Both counts are pinned in her spec so the divergence cannot drift silently.
    Closing it needs an in-FB-scoped counter on the trigger, which is cross-cutting across every
    hitCount carrier — filed, not made here.
  - **Evidence tier.** Owner ruling on game behaviour ⇒ the modeling question was ANSWERED, so
    `/scientific-method` does not apply (CLAUDE.md: known answer ⇒ encode + `/code-review`).

- **(2026-08-13) "Entering Burst Stage N" is the moment the chain REACHES stage N — one
  chain step BEFORE the stage-N burst is cast.**
  - **The ruling (owner, 2026-08-13), verbatim in substance.** "Entering burst stage X" means "the
    burst gauge is full and it is now time to activate burst X". The chain therefore reads: burst
    gauge fills → **enter stage 1** → any B1 activates → **enter stage 2** → any B2 activates →
    **enter stage 3** → any B3 activates → **enter Full Burst** (the 10s clock starts). The owner
    flagged it as a common kit mechanism that had to be correct globally, not per unit.
  - **What the engine did instead.** `stageEnter{stage:N}` was dispatched at the frame the stage-N
    unit CAST — one step late by the measured 30f chain gap, and, more importantly, keyed to a cast
    that may never happen. All 12 carriers of the kit phrase "Activates when entering Burst Stage N"
    had authored the literal number from their kit text, so all 12 inherited the offset: cinderella,
    ein, flora, laplace-ultimate-hero, mast-romantic-maid, maxwell-ordinary-mechanic,
    mihara-bonding-chain, mint, neon-blue-ocean, rei-ayanami, snow-white-heavy-arms,
    soda-twinkling-bunny.
  - **The 13th carrier was RIGHT and must not be shifted.** `rupee-winter-shopper`'s blocks encode a
    different sentence — "Activates when an ally uses a Burst Skill" — which genuinely is the
    stage-N cast. That reading is now its own trigger, `stageCast`, and she moved onto it. The two
    triggers are one chain step apart and are the easy confusion; `trigger-kinds.test.ts` pins the
    lead directly.
  - **Two consequences, both direct readings of the ruling.**
    1. An entry-keyed buff now applies one chain step earlier (30f) and on stalled entries, so it is
       live for strictly more of the window it feeds. NOTE what this is NOT: it does not newly add a
       same-cast stage buff to a burst nuke. The old dispatch already ran stage blocks BEFORE the
       caster's own `burstCast` blocks, and no shipped override sets `burstSnapshotsPreFb: true`
       (`cinderella`, the only unit that names the flag, ships it FALSE and her spec's G1 pin proves
       her nuke already snapshotted her own same-cast stage-3 conversion). An earlier draft of this
       entry claimed the change fixed a missing nuke buff — that was wrong and is corrected here.
    2. A chain that REACHES a stage and then expires (no eligible unit off cooldown) still ENTERED
       it, so entries outnumber casts wherever chains stall — in the maxwell-ordinary-mechanic
       fixture, 10 stage-3 entries against 5 B3 casts — four of the unfilled chains collapse (33.9s,
       70.0s, 108.1s, 146.1s) and the last is still open when the fight ends. (Those collapse times
       are the 10s ones from the chain-timeout ruling in the entry above; this example originally
       quoted the pre-timeout 25.9s/62.0s, which the merge made self-contradictory.)
       This roughly doubles those units' proc counts in stalling comps and is the larger half of the
       change; it follows from the ruling's own wording ("it is now time to activate burst X"), not
       from a separate inference.
  - **Blast radius (measured, not estimated).** No Full-Burst count moves on any graded comp — the
    rotation itself is untouched, and every measured-truth FB assert still passes. 15 per-unit damage
    totals move, all under 1.6% (largest: mint +1.55%, prika +1.50%, snow-white-heavy-arms −1.45%).
    Per-unit ratio movement is mixed and tiny — 6 units better, 7 worse, none by more than 0.009 in
    ratio — but it is NOT band-neutral: the board goes ±3% 7 | ±5% **15** | ±8% 25 | worse 20 →
    ±3% 7 | ±5% **14** | ±8% 25 | worse 20 over 142 datapoints, because `snow-white-heavy-arms`
    crosses the ±5% boundary (0.954 → 0.946, n=4). Her S2 "entering Burst Stage 3" ATK ▲73.92% is
    exactly the line this change re-times, so that is fit exposure — her magnitudes were hand-tuned
    against the cast-frame timing — and the standing rule applies: a timing correction is judged on
    measured-FB-count preservation, not the aggregate board, and an exposed unit is re-tuned
    separately rather than re-fudged here. Filed in QUEUE.md.
  - **Evidence tier.** Owner ruling on game behaviour ⇒ the modeling question was ANSWERED, so
    `/scientific-method` does not apply (CLAUDE.md: known answer ⇒ encode + `/code-review`). Proof
    lives in `scripts/tests/engine/trigger-kinds.test.ts` (the primitive: entry frames, the 30f lead
    over the same-numbered cast, and stage-1 entry landing before any cast) plus the six unit specs
    that had pinned the old timing and now pin the new.

- **(2026-08-12) A weapon swap's damage FLAVOR and its ammo ECONOMY are independent — and
  `takina`'s burst gun is a real weapon, not a re-flavored sniper.**
  - **The rulings (owner, 2026-08-12).** `takina`'s burst swaps to a CUSTOM weapon: it deals the
    damage her kit lists (200.64%), has **no ammo and no reload**, fires at **1.2 shots/sec** — 12
    shots across the 10s window — and when the swap ends she returns to the sniper **with its
    magazine restored to full**. The owner named the consequence: she then never needs to reload,
    because she cannot land 6 full-charge sniper shots between bursts in most comps.
  - **Why the engine could not say it.** `weaponSwap.trueNormals` was authored as a damage flavor
    ("normal attacks deal true damage") but the engine also read it as the marker for "same-weapon
    flavor swap", gating the magazine refill at BOTH ends on it. That rule is itself correct — it
    comes from the `chisato` kit-audit (#2): a swap that only re-flavors the gun in your hands
    grants no free reload. Using the flavor to detect the case was the defect, because a REAL
    weapon can also deal true damage. Separately, `chargeTimeSec` was read with a falsy check, so
    an authored `0` ("does not charge") collapsed to `undefined` and inherited the base unit's
    charge frames — which is why the swap's `pullsPerSec` was never consulted.
  - **Enacted.** A new `weaponSwap.sameWeapon` flag is the sole refill marker; `trueNormals` is a
    pure flavor flag again; `chargeTimeSec` is null-checked. The four genuine flavor swaps declare
    it — `chisato`, `clay`, `jill`, `frima` — and the tree gives an independent check that the
    partition is right: each of those four sets `damagePct` exactly equal to its own
    `normalAttackMultiplier` (the gun is unchanged, so its damage is too), while the three
    true-damaging REAL swaps do not (`takina` 200.64 vs 69.04, `laplace` RL/Iron 22.2 vs 63.11,
    `eunhwa-tactical-upgrade` 105.6 vs 69.04).
  - **⚠ DIRECTION — the faithful model is COLDER, not warmer.** The handoff that specced this
    expected the fix to warm `takina` (7 shots → 12). It does the opposite: her 7 estimated shots
    inherited the SR charge cycle and therefore the **×2.5 `chargeMultiplier`**, worth ~3511% ATK
    per window against the ruling's 12 × 200.64 = ~2408%. Measured: her window damage drops ~30%,
    her total 302.5M → 212.9M in her spec fixture, and her single graded reading moves
    **0.786 → 0.579 COLD**. The swap economy was therefore never the explanation for her coldness.
    Landed anyway under _faithful > fit_; the residual is a separate, now-larger open question.
  - **Blast radius, all measured, none graded.** The same real-weapon rule stops two other swaps
    leaking their magazines: `laplace` (RL/Iron, not `laplace-ultimate-hero`) **−5.4%** — her
    999-round beam magazine used to carry over onto her 6-round RL for the rest of the fight, so
    she never reloaded again — and `eunhwa-tactical-upgrade` (not base `eunhwa`) **−21%** — she used
    to bring however many SR rounds she was holding into a 1-round cannon and fire them all before
    the first reload, where her own override note describes a fire/reload cycle. Both changes move
    each unit TOWARD its documented model. Neither appears in any graded comp. Every regression
    snapshot is byte-identical, and the only board movement is inside `takina`'s own comp
    (PG iron sweep: `d-killer-wife` +0.002, `maxwell` +0.001, `liberalio` +0.004,
    `milk-blooming-bunny` +0.011 — her changed shot count feeding the shared rotation).
  - **Proof:** `scripts/tests/units/takina.test.ts` (the parked acceptance test, un-skipped: 12
    shots/window, no reload gap above 1.5s, and the restored 6-round magazine read off the ammo
    counter) + `scripts/tests/engine/weapon-swap.test.ts` (entry AND exit refills, each asserted
    against `sameWeapon` and `trueNormals` independently). Owner-answered ⇒ encode + `/code-review`,
    not `/scientific-method` (CLAUDE.md, owner ruling 2026-08-11).

- **(2026-08-12) `laplace`'s (RL/Iron) "at max stacks" gate needed no new engine primitive — a
  monotone resource pool is the answer.**
  - **The rulings it encodes (owner, 2026-08-12):** Hero Vision stacks build from **Full Charge
    attacks**, not from full-burst shots — and her burst beam does not charge, so she gains **zero**
    stacks during the window and enters it with whatever she built. Stacks **refresh as a whole
    set** on each new stack (the game-wide rule already recorded as `docs/modeling-priors.md`
    prior 12, owner ruling 2026-08-11), so her 15s clock is reset by her last pre-burst full charge
    and outlasts the 10s window: once the gate is open it holds for the whole window.
  - **What was proposed, and why it was not built.** The handoff proposed a new stack-count block
    gate and, per F11, weighed it against just logging the carrier — a primitive for one unit, on a
    unit with no recorded fight. Neither was needed. The gate is expressible with today's
    primitives, exactly as `engine-modeling-gaps.md` theme 4 already says for `guilty`'s identical
    rider: a `heroVision` pool (initial 0, max 5), `+1` per BASE full-charge pull
    (`shotFired` + `swapGate: 'unswapped'`), read by `resourceGate` — the `soda-twinkling-bunny`
    precedent. The beam splits into two mutually-exclusive `burstCast` branches (`min: 5` with
    `trueNormals`, `max: 4` identical but plain) so a below-max cast still fires the beam as normal
    damage, which is what the kit says; the 11.9% true rider gains `resourceGate min: 5` beside its
    `swapGate`.
  - **The approximation, stated not hidden:** a resource never expires, so the pool is monotone.
    That matches the whole-set refresh rule at scope lock, where she fires continuously and the 15s
    clock never lapses; it diverges only across a >15s firing pause, which the continuous fight does
    not contain.
  - **Worth −1.00%** on her total in the 720-kit-audit control comp (`liter` B1 / `crown` B2 /
    `laplace` B3 carry+focus / `helm` B3, boss Fire), teammates byte-identical because both gated
    clauses are self-scoped and neither feeds an ally bucket. She is in no graded comp, so the board
    is unchanged. The over-credit removed is the one the rulings identify: a cast made before she
    has landed 5 full charges — in that fixture, the fight's first burst.
  - **Proof:** the L1/L2 assertion group in `scripts/tests/units/laplace.test.ts`, discriminated
    against the prior "assume Hero Vision permanently maxed" model.

- **(2026-08-11) Unmodeled behaviour is RECORDED under `unmodeled`, never left to prose.**
  - **The ruling (owner):** _"We should record all unmodeled behavior as unmodeled rather than
    leaving it in prose."_ Asked and answered off the phase-4 tail pass's §5 proposal
    ([2026-08-11-faithfulness-tail-plan.md](handoffs/2026-08-11-faithfulness-tail-plan.md)).
  - **What raised it — tier: a committed instrument over the whole roster, not a sample.**
    `scripts/census-kit-numbers.ts` showed the record was half-populated and, worse, split
    per-LINE rather than per-unit: of 92 heal-magnitude kit lines across 62 units, 42 were
    structurally recorded, 46 sat in `note`/`caveats` prose only, and 4 appeared nowhere in their
    override. The same file would file one heal line and silently drop its others (`biscuit` filed
    her skill2 heal and not her skill1/burst ones), so no per-unit spot check could have found it.
  - **Why it matters although it moves zero damage.** A heal's AMOUNT has no engine consumer (no HP
    pool) — the board cannot see any of this. What it changes is whether `unmodeled` can be TRUSTED
    as the index of what the model skips, which is exactly how `data/kit-status.json`,
    `scripts/gen-unmodeled-review.ts` and every reviewer's grep read it. Half-populated, it
    under-reports; complete, it is an answer.
  - **Enacted:** 50 heal-magnitude lines across 34 units, via
    `scripts/backfill-unmodeled-heal-magnitudes.ts` (idempotent, re-runnable after a roster sync),
    and nothing else. Entries use the `ada` wording — they record that the
    AMOUNT is unmodeled while the recovery EVENT is modelled, so a later reader does not "fix" a
    filed line by adding a second emitter. **Inert BY MECHANISM, not by fixture:** `unmodeled` has
    no engine consumer at all — `src/engine/sim.ts` never reads the field (it is carried onto the
    parsed skill at `src/skills/index.ts:122` and read only by `validate-structural.ts` and the
    docs tooling), so no comp or enabling teammate could expose it. The untouched regression
    snapshot is corroboration, not the claim.
  - **Scope limit, deliberate:** a magnitude that lives only in prose is usually a legitimate
    TRANSFORMATION, not a gap — every remaining prose-only line was checked and is modelled in
    transformed form (`nayuta` 150 + 380.46 → one 530.46 rider; `takina` 140.49 × 10/15 = 93.66;
    `mihara-bonding-chain` 12 × 25.08; `soda-twinkling-bunny` 52.04 + 85.02). Filing those under
    `unmodeled` would assert something false. The ruling binds unmodeled BEHAVIOUR; transformed
    encodings are modelled behaviour.
  - **⇒ ONE READING LEFT OPEN FOR THE OWNER — `kilo`, drafted and then DROPPED.** Her burst nuke IS
    modelled and fires (`flatDamage 1150.84`, `requiresShielded`), but off her own final ATK
    instead of the kit's "ATK … calculated from 5% of final Max HP" basis, because no HP-basis
    SUBSTITUTION primitive exists. (HP-basis terms do exist — `effectiveAtk`'s `atkOfMaxHpPct`
    conversion and `stackedNuke`'s `hpPct` — but `atkOfMaxHpPct` is ADDITIVE and applies to the
    whole ATK stat, where her kit replaces the basis for one line.) The basis clause is therefore
    unmodelled and lives only in her `caveats`,
    with an explicit estimate and a measurement recipe. Under the ruling's plain text ("record ALL unmodeled
    behavior…") that is arguably prose-recorded unmodelled behaviour and should be filed; under the
    reading this pass shipped, an APPROXIMATION of a modelled line is not "behaviour left in prose"
    — and the `ada` amount/event wording does not fit a basis substitution anyway. **Shipped: not
    filed.** If the owner draws the line the other way it is a hand edit, not a re-run — the
    backfill script is heal-only by construction. Raised by the cross-family review
    (`kimi-code/k3`, 2026-08-11) as the owner's call, not the reviewer's.
  - **The standing guard:** `census-kit-numbers.ts --check` runs in `verify.sh`, so a kit magnitude
    that appears nowhere in its override now fails the gate. One accepted blind spot — `power`'s
    "Reloads 100% of the magazine", genuinely encoded as `instantReload fraction: 1`, which a
    digit-string matcher cannot see — is recorded with its reason in `ACCEPTED_SILENT` and pinned
    by a test that fails if it ever stops firing.

- **(2026-08-11) The two round-count Pierce carriers, closed: `d-killer-wife` was a real
  gap, `dorothy-serendipity` was a false positive — and the premise BOTH rested on was wrong.**
  - **The shared premise, REFUTED — tier: the mechanics SSOT plus the engine source, not a
    measurement.** No fight was recorded for this and none was needed; the claim is settled
    doc + code, which is why it can carry a verdict verb. Both overrides justified skipping their
    Pierce line with some form of "Pierce is inert on a single boss".
    `docs/data/game-mechanics.md` §11 says the opposite:
    Pierce Damage ▲ is an ordinary **Damage-Up-bucket** entry and **does apply on the partless
    boss**. What is multi-part-only is the **core+body double-hit** (`PIERCE_CORE_DOUBLE = false`) —
    a different mechanic the two notes had conflated with it. The engine already encodes the
    distinction exactly (`sim.ts`: `pierce = pierceTagged ? stat(u,'pierceDamagePct',frame) : 0`),
    so a Pierce TAG is worth precisely whatever Pierce Damage ▲ is live on that unit — no more, and
    **nothing at all** if none is.
  - **`d-killer-wife` (SR/Fire) — REAL, enacted.** S1-A "Activates when attacking with Full Charge
    for 3 time(s). Affects self. Gain Pierce for 1 shot." now encodes as `hitCount 3 → gainPierce
durationShots 1`. Kit-literal — both numbers verbatim, and `hitCount` is the encoding this file
    already used for the identical "Full Charge for N time(s)" shape on S2. Nothing fitted, so this
    needed no `/scientific-method` pass; the gate is her spec + `verify.sh`.
    **She is her own granter**, which is why the skip cost real damage with no teammate involved:
    her S1-B grants Pierce Damage ▲13.55% to SR allies, and she is SR. That premise was confirmed
    independently by the pre-existing W2 pin, which already asserted the buff's targets.
  - **⚑ THE MAGNITUDE IS COMP-DEPENDENT, AND THE WHOLE-PICTURE CHECK IS THE POINT.** Her board
    reading moved +8.0%, which is far too large for 13.55pp on one shot in three inside a Full
    Burst (~1.5% by arithmetic). Decomposed rather than accepted: **+2.6% / +2.4%** in her two
    non-`grave` comps — matching the arithmetic — and **+20.0% in N1**, the `grave` comp. `grave`
    grants a **permanent all-ally `pierceDamagePct` 48.4**, which does nothing for an untagged unit
    and a great deal for a tagged one. Mechanism, not a defect. The generalisable lesson: **the
    value of a Pierce tag is a property of the COMP, not of the unit** — never quote one number.
  - **Board: 0.937 COLD → 1.012 OK**, MAD 0.063 → 0.039, rank 19 → 11; ±5% bucket 14 → 15, no other
    unit moved. Exactly one regression entry drifted (N1, +19.89%). All Full-Burst-count asserts
    unchanged — the tag adds damage, not gauge.
  - **`dorothy-serendipity` (SG/Water) — FALSE POSITIVE; do NOT "convert" her.** Her "Gains Pierce
    for 3 round(s)" is already modelled, just not through `gainPierce`: it shares one trigger and
    one 3-round window with the "Pellet count is fixed at 1" clause beside it, so it rides her
    `consolidation` block's `pierce: true` → per-shot `pierceActive`, scoping pierce to exactly the
    consolidated rounds. That is the MORE faithful encoding, and adding `gainPierce` too would
    double-book the window. The line she genuinely leaves unmodeled is the other one — S1-B
    "Expands Pierce **range** by 200%" — and that one is inert **BY MECHANISM, not by a fixture
    A/B**: it widens how far a pierce shot penetrates THROUGH targets, there is only ever one
    partless target at scope lock, and the engine has no pierce-range concept for any unit to
    consume (no `pierceRange`-family StatKey exists in `src/skills/types.ts`). No enabling teammate
    could exist, so this is the stronger claim, not the weaker one.
    `src/skills/types.ts` had listed her among the unconverted carriers; corrected.
  - **Left open (findings-only):** her N1 comp now reads 1.066 HOT. N1 is the `grave` comp and
    `grave` is herself 1.095 HOT with documented over-credits (always-on Heat Emission uptime, the
    U19 empty-magazine effect), so the overshoot most likely rides `grave`. **Do not shave a
    kit-literal line to close it** — re-tune the exposed unit separately (`judge-rotation-change`
    rule, and faithful > fit).

- **(2026-08-11) M8 + M4 CLOSED. New DERIVED-STAT primitive `convertExcess` for `red-hood`;
  true-damage-core needed nothing — it was already implemented AND already pinned.**
  - **M4 — true damage CAN core hit: ALREADY SHIPPED.** The owner suspected this was done, and it
    was. The core gate (`opts.core && cfg.coreHitRate > 0`) carries no true-flavor exclusion, exactly
    as crit carries none, and the normal-attack path passes `core: true` regardless of flavor.
    Measured on `chisato`: all 324 of her true-flavored swap normals are core-eligible at a live
    core rate, identical to her 2,819 ordinary normals. It is also already pinned —
    `scripts/tests/units/chisato.test.ts`, "ENGINE ⚑ PIN: true swap normals remain crit+core-eligible".
    **Zero engine change.** (True-flavored skill RIDERS still never core, but that is the rider
    convention — riders crit at the caster rate and never core — not a true-damage rule.)
  - **M8 — `red-hood`'s stack ramp is now LITERAL, via a new primitive.** Her kit pairs "Charge Speed
    ▲3.81%, stacks up to 10" with "Convert excess value over 100% of Charge Speed to Charge Damage
    ▲240% of the excess". The engine had no way to derive one stat from another's overflow, so she
    shipped `chargeDamagePct` 90 — a hand-averaged constant against a real 1.92→93.36 range. The
    owner directed building the primitive rather than accepting the average. `convertExcess`
    {`from`, `over`, `to`, `rate`} installs a rule on the unit; `stat()` recomputes the target from
    the source's LIVE value on every read (short-circuited to zero cost for the 182 units with no
    rule). Result: her Charge Damage now steps 9.144pp per stack (3.81 × 2.4), reaching 93.36 from
    her own kit alone — the ladder is visible as charge multipliers 2.5 → 3.4336 and is what the test
    pins. **93.36 is a SOLO-KIT ceiling, not a cap:** the conversion reads her LIVE total Charge
    Speed, allies included, which is what the kit says ("excess value over 100% of Charge Speed").
    Six roster units buff ally `chargeSpeedPct`, and her own graded `PA MiKa` comp fields one
    (`alice` ▲11.67), carrying her to 153.4 there. Her damage is now team-composition-sensitive in a
    way the flat 90 could not be — that coupling is part of why the board improved, and it is pinned
    by its own case rather than left to the snapshot.
  - **The load-bearing discovery: her Red Wolf "Charge Speed ▲100.8% for 10 sec" was never modeled.**
    It existed only implicitly, folded into the swap's `chargeTimeSec` 0.3 clamp. Converting the
    excess from her S1 stacks alone therefore found NO excess (they peak at 38.1 < 100) and her
    Charge Damage silently vanished — measured 0.775 COLD on the first attempt. Encoding the kit line
    as a real `chargeSpeedPct` buff fixed it. Her cadence is untouched, but NOT by a clamp — the
    mechanism is `sim.ts`'s `u.swap?.chargeFrames != null ? 0 : Math.min(100, …)` guard, which zeroes
    the charge-speed term whenever a swap supplies its own `chargeFrames` (her `chargeTimeSec` 0.3).
    Naming it precisely matters: delete that guard as "redundant" and her 18-frame Red Wolf gate
    collapses to 1 frame.
  - **Board: 0.970 → 1.002** (0.99 / 1.02), from outside ±5% into ±3%. A faithfulness fix that
    improved accuracy rather than costing it — the opposite of `ada` earlier the same day. Only her
    own two totals moved; no teammate drifted, so the snapshot edit is two values.
  - ONE carrier, deliberately built anyway on owner direction (the standing "log a third carrier
    before building" heuristic is about speculative primitives; this one has a wrong constant to
    replace today). `sugar`'s "Converts damage to Elemental Advantage damage" is a DIFFERENT
    mechanic — a damage-type conversion, not a stat overflow — and is not a second carrier.
    Pinned by `scripts/tests/engine/convert-excess.test.ts` + `red-hood`'s rewritten R1/R2.

- **(2026-08-11) ENGINE PRIMITIVE — `gainPierce` takes a ROUND COUNT (`durationShots`),
  because "Gain Pierce for N round(s)" is what five kits actually print.** Owner-directed. Until now
  `gainPierce` accepted only `durationSec`, so every round-count carrier shipped an approximation:
  `nihilister` a 4s stand-in, `neve` a 2s stand-in for "2 round(s)", `harran` a permanent tag for
  "1 round(s)". A seconds window drains through reloads, burst animations and lulls; a round budget
  is spent by FIRING and waits, unspent, for however long she holds. The two are indistinguishable
  while a holder fires steadily and diverge exactly when she stops — which is not hypothetical:
  `nihilister`'s 4s was derived as "the longest inter-shot gap she fires across (~3.7s worst case)",
  her steady cycle does max at 3.87s, and her control fixture holds ONE 4.50s lull, so the shot after
  it fired untagged every fight (~87k of her 61.5M normal-bucket damage).
  - **Round accounting mirrors the round-scoped BUFF rule**, and sits in the same place in
    `firePull` so the two can never disagree about what a round is: one round per pull
    (`hitsPerShot` per pull for MG — a round is a PULL, not a pellet, pinned on `neve`), counted
    whether or not ammo was deducted, and **the granting round never spends the budget**
    (`pierceGrantFrame`, the analogue of a buff's `startFrame` carve-out) — "for N round(s)" reads as
    N rounds AFTER the grant. One deliberate difference from buffs: a re-grant takes the MAX of the
    budgets (as the seconds window does) where `applyBuff` SETs; unreachable today, since no unit
    carries two round-count pierce sources. New unit state: `pierceShotsLeft` / `pierceGrantFrame`.
    `durationSec` and `durationShots` are mutually exclusive — `validate-structural.ts` rejects both
    on one effect (no kit prints both, and "ends first" vs "lasts longer" disagree), and it now
    range-checks `durationShots` for EVERY effect kind rather than only `buff`: scoped to buffs, a
    `durationShots: 0` gainPierce validated clean and produced a wholly inert line.
  - **Converted the three stand-in carriers** (`nihilister` 1, `harran` 1, `neve` 2). For `harran`
    it is a pure fidelity change and behaviourally a NO-OP — her grant re-arms on every shot, so the
    budget never decrements and the tag stays live exactly as her old permanent form did. The lull
    argument is `nihilister`'s (a non-refreshing gap) and `neve`'s (an FB-keyed grant). Board-inert:
    both regressions pass UNCHANGED and no snapshot moved — none of the three is in a graded comp,
    and `harran`/`neve` carry no Pierce Damage ▲ source at scope lock anyway. The gain is fidelity,
    plus `neve`'s ⚑ "rounds→seconds estimate, recipe: read her SG pull cadence from footage" is
    DISCHARGED — the engine counts rounds now, so no footage is needed to convert them.
  - **NOT converted, deliberately:** `dorothy-serendipity` ("3 round(s)") and `d-killer-wife` ("for
    1 shot") both decided their Pierce line is unmodeled/damage-inert for their own documented
    reasons, and both are board-graded. Re-opening those is a separate call, not a side effect of
    adding a primitive.
  - Pinned by `scripts/tests/engine/gain-pierce-rounds.test.ts` (5 cases: load-bearing, survives a
    lull that drains a seconds window, budget spent per round on a non-refreshing trigger, granting
    round exempt, self-scoped). Written RED first — it failed on the ladder assertion, which is the
    one an unimplemented param cannot fake.

- **(2026-08-11) THREE M-LIST RULINGS ENACTED — and a scope change to the gate itself:
  `/scientific-method` resolves UNKNOWNS, it is not a tax on every engine edit.** Owner ruling: where
  the modeling question is already ANSWERED (an owner ruling on game behaviour, a literal kit line, an
  existing labeled fixture) the judges have nothing to gate, so the pipeline is skipped and the diff
  goes to `/code-review` instead — **the onus moves to the CODE being correct, not the answer being
  true.** `verify.sh` + spec tests stay mandatory on both paths. Landed in the four places that stated
  the old "ALWAYS" rule (the skill, `CLAUDE.md`, the pre-write hook's P9, the code-review skill).
  Enacted under the new rule, each pinned test-first and cross-family reviewed:
  1. **`ada` — Special Modification is ONE round.** The kit says "for 1 round(s)"; the swap shipped
     uncapped and fired ~2 special-charged shots per window. Now `maxShots` 1. **Board 0.995 → 0.924
     COLD, accepted under faithful > fit** — the old reading leaned on damage the kit does not grant.
     Cost more than the ~0.95 estimate. Her cadence shift also perturbed two OTHER units' fixtures
     (`little-mermaid` M4, `nihilister` N1), whose "byte-identical in this fixture" assertions were
     true only for the old ada — restated, not suppressed.
  2. **`prika` — she IS Pierce-tagged during Performance.** Kit S1: "Activates only while in
     Performance status. Affects self. Gains Pierce." Now a self-targeted `gainPierce` on her
     burstCast in `skill1`, windowed per mode (25s solo, 9999 duet). **Board 0.890 → 1.065**, far
     past the ~+8% estimate — and the decomposition matters: measured on PA MiKa, the TAG is worth
     ~+0.03 and the duet WINDOW ~+0.15. The 9999 rests on the same premise as her duet
     `chargeDamagePct` (Encore re-extends Performance while `mint` keeps bursting), so the two move
     together or not at all. Do not close her HOT read by deleting the tag or shaving the datamined
     13.09; the open question is the window.
  3. **`rouge` — all three coin statuses CO-EXIST**, earlier ones remaining as later ones activate.
     `coin` is now a highest-reached marker, not an exclusive state: the Sword burst rider is ungated
     (Sword Coin starts at back-row assignment and never ends), Shield is `{min:1}`, Double Sword
     `{min:2}`, and the three co-stack because the buff key carries the value. **Damage-inert**
     (1.027 → 1.024, and that drift is `ada`'s) — ally-granted Max HP does not feed a teammate's
     `atkOfMaxHpPct`. Worth recording: the QUEUE entry that proposed this fix had the WRONG premise —
     it claimed Sword's Attack Damage ▲6.65% switched off at Shield, when that line was already an
     ungated permanent passive. The defect was in the Max-HP riders, not the damage line.
     The cross-family review (Opus reviewing this Claude-authored diff) returned BLOCKED and was right:
     it caught `prika`'s "Gains Pierce" still sitting in `unmodeled` while the engine modeled it, the two
     new blocks filed under `burst` when the kit prints the line in `skill1`, and four stale
     caveat/residual strings still describing the pre-change encoding. All fixed before landing. It also
     measured what this session had asserted loosely — the prika window decomposition above is its
     number, independently reproduced here.

- **(2026-08-11) TIER 0 FOLLOW-UPS — both open owner questions ruled: the D1 banner gets a
  MECHANICAL guard, and inertness claims join the hook's verdict verbs.** Tier 0 (below) closed five
  rulings but left two questions the owner had to answer, one of them because it needed a protected
  path. Both are now approved and landed, and both are enforcement, not modeling: **zero engine lines,
  zero damage values, board untouched.**
  1. **D1 durability — `kit-status.ts --check` now fails on a provenance claim the tree contradicts.**
     `/kit-parse` writes the `PARSER BASELINE (HYPOTHESIS — NOT a validated model)` banner into every
     new baseline, which is ACCURATE the day it is written. The staleness came from the other end:
     nothing removed it once the unit gained spec tests, a gauntlet pass, or a real fight — which is
     exactly how 19 carriers came to assert the opposite of the tree. The banner is a claim ABOUT this
     repo, so the gate can read the repo and check it: `scripts/lib/baseline-banner.ts` (pinned by
     `scripts/tests/baseline-banner.test.ts`, 9 cases) fails `--check` when (a) the HYPOTHESIS banner
     sits beside a `scripts/tests/units/<slug>.test.ts` or a `Kit-autonomy gauntlet` marker, or (b) the
     reworded `No real-fight recording yet` claim — the wording D1 KEPT on 18 units — sits beside board
     readings or graded teams. Arm (b) is SILENT on today's tree (all 18 carriers have zero board
     readings) and exists so the surviving wording cannot repeat the failure it was rewritten out of.
     Consequence to expect: a `/kit-tdd` session that pins a still-bannered baseline now gets a red
     verify until it rewrites that one note line — which is the ruling working, not a false positive.
     The rejected alternative was rewording the `/kit-parse` banner itself: it would leave every
     ALREADY-authored baseline unguarded and needs a protected path to fix nothing mechanical.
  2. **D5 — `inert` / `inertness` / `byte-identical` / "moved by exactly zero" are now VERDICT VERBS**
     in `.claude/hooks/pre-write-discipline.py` (r5, protected path edited with explicit owner
     go-ahead). Routed exactly like the existing verdict verbs — content predicate AND a
     `SHARED_ARTIFACT` target — with its own escalation text, because the burden an inertness claim
     carries is not "at what n" but "in WHICH FIXTURE, with which enabling teammate seated". The
     repo-wide pattern LINT stays rejected on the same numbers as before (620 mentions / 153 files,
     mostly "board A/B is the discriminator" — a plan, not a result); a write-time guard sees one claim
     at a time, so the false-positive arithmetic that killed the lint does not apply. Verified against
     sample payloads: fires on an override or DECISIONS write carrying the claim, silent on the plan
     wording, on `.claude/**` itself, and on ordinary code. Backfill of the 620 existing mentions
     remains opportunistic, not a sweep (`QUEUE.md`).

- **(2026-08-10) FAITHFULNESS TIER 0 — five batched owner rulings, all board-inert (0 engine
  lines changed, 0 damage values touched).** Board before and after: `±3% 7 | ±5% 15 | ±8% 24 |
worse 21` over 142 datapoints / 45 units.
  1. **STALE PROVENANCE TAGS — deleted, not reworded.** The `PARSER BASELINE (HYPOTHESIS — NOT a
validated model)` banner (19 overrides) and `[materialized … NOT hand-verified]` (8) both
     asserted the opposite of the tree: all 27 carriers hold spec tests in
     `scripts/tests/units/<slug>.test.ts` (11–29 cases each), and **all 8 materialized carriers are
     board-GRADED**, i.e. every one has a real fight. Several banners contradicted themselves in the
     same string (`arcana`'s sat beside "PRESERVED VERBATIM from the 2026-07-13 hand reconciliation";
     `d-killer-wife`'s "still NOT hand-verified" beside a 2026-07-25 test-first re-audit). Because the
     two tags were wrong in DIFFERENT ways they got different treatment: the 8 materialized tags are
     pure authoring history → deleted outright (override prose carries no history, per the doc
     taxonomy); 18 of the 19 banners kept the part still true, as `No real-fight recording yet — every
⚑ below is an unmeasured estimate. Structure is test-pinned (…)`; `modernia`'s was deleted (she is
     graded, test-pinned AND hand-authored — false on all three counts). Per-value ⚑ marks, which is
     where the real unmeasured-ness lives, are untouched.
  2. **ALLY-TARGETED `damageTakenPct` — kept for kit fidelity, now machine-flagged.** Exactly 3
     carriers (`moran` allies −35.14, `rouge` selfAndAdjacent −15.2, `rumani` self −20.06), all
     negative = kit damage-REDUCTION lines. The engine sums the stat off `enemyBuffs` alone
     (`sim.ts:1861`) and the dispatch admits it only at `target.kind === 'enemy'` with `value > 0`
     (`sim.ts:2389`), so they cannot reach damage by any path, sign flip included. Moving them to
     `unmodeled` would discard the kit magnitude and the inversion-trap explanation already written in
     those files, so instead `BOSS_ONLY_BUFF_STATS` in `src/skills/validate-structural.ts` warns on the
     mismatch (pinned by `scripts/tests/validate-structural.test.ts`). Its job is to stop a future
     session "correcting" the sign or target and turning a defensive line into a damage multiplier.
     `defPct` is deliberately EXCLUDED from that set — boss-only for damage too, but 28 overrides carry
     ordinary ally-side DEF ▲ lines with no inversion hazard, and warning on them would bury 3 real
     mismatches in 28 lines of noise. `distributedDamagePct` is excluded because it is genuinely LIVE
     on a unit (`sim.ts:1868`).
  3. **SELF-SCOPED LIFESTEAL — stays recorded, emits NO recovery event.** `fireRecovery` fires the
     blocks of the unit that RECEIVED the heal and nobody else, so a self-lifesteal reaches a consumer
     only if the CARRIER owns one. The roster has exactly two `recovery` consumers — `asuka` (self,
     `atkPct` 96.98 / 25s) and `crown` (allies, fired when `crown` herself is healed) — and none of the
     5 non-emitters (`d`, `moran`, `red-hood`, `rem`, `tia`) owns a `recovery` block, so all five are
     inert by MECHANISM, not merely by measurement. Second reason to withhold: lifesteal is a per-hit
     line, so emitting would turn it into a hit-cadence event stream at an unmeasured cadence. The
     scope-decides-liveness prior is now `docs/modeling-priors.md` §11 with `asuka` as the named
     counterexample — "self-scoped therefore inert" is a property of the PAIRING, never of lifesteal.
  4. **U28 RIDER GAUGE — direction settled, enactment still bundled.** A function-damage instance that
     lands on the boss SHOULD generate weapon-base gauge; the engine already does it for `flatDamage`
     (`sim.ts:2568`), `hitRepeat` (2605) and DoT ticks (3803), and the `extraHitDamagePct` path
     (`sim.ts:4053`) is the sole omission — a DEFECT, not a modeling choice, so the open question is
     only WHEN, never WHETHER. It does NOT land unit-locally: `scripts/battery/u28-gauge-ab.ts` already
     bounded it (all 4 carriers hold FB count exactly under a deliberate over-emission arm — `modernia`
     10=10, `nayuta` 5=5, `neon-blue-ocean` 11=11, `neon-vision-eye` 13=13), and it remains unmeasured
     in the refill-bound charge-B3 comps where gauge deltas actually bind. The batched gauge cluster
     partially cancels (double-emit is gauge-DOWN, this is gauge-UP, tempo comp-dependent), so the
     compensating-errors rule requires one timeline → `handoffs/closed/2026-08-10-gauge-economy-findings.md`,
     `QUEUE.md` ENGINE-WORK ORDER item 4. Recorded in all four carriers' notes. Note `modernia`'s S1 is
     a `flatDamage` _because_ of this asymmetry — closing it retires that workaround.
  5. **AN INERTNESS / A-B CLAIM MUST NAME ITS ROSTER — convention, not lint.** Such a result is a
     statement about a FIXTURE, never a property of an encoding; it must state the comp measured AND
     the enabling teammate it did or did not seat. Root: `alice` (SR/Fire) carried "inert, verified
     byte-identical" for `hasPierce` from a pierce-free fixture — the tag moves no damage alone, it
     confers ELIGIBILITY for `pierceDamagePct`, and her only graded comp seats `mint` (32.72 to all
     allies), where it is worth **22.6%** of her damage (444M/1.100 on vs 362M/0.897 off). Correctly
     measured, wrong roster, and the wording hid which. A lint was rejected with numbers: 620 mentions
     across 153 override files, mostly "board A/B is the discriminator" (a plan, not a result) → mostly
     false positives over a ~100-file backfill. Landed in `docs/CONVENTIONS.md`; backfill is
     opportunistic, never a sweep. **Open:** whether `inert`/`byte-identical` join the pre-write hook's
     verdict-verb escalation (`.claude/**` is protected — untouched, tracked in `QUEUE.md`).

- **(2026-08-10) HARNESS RULING — a faithfulness fix is not automatically capped at LOG for
  "moving the board" or moving comps beyond its target unit.** Prompted directly by the `jill` landing
  below: the panel correctly routed that fix to LOG on an UNEXPLAINED small ripple in a shared comp,
  then correctly revised to IMPLEMENT once the ripple was traced to a verified mechanism — but the
  confidence rubric's Q3 (control-team validatability, worded as an unconditional cap while the control
  team stays uncalibrated) and Q4 (board-cost risk) would have kept ANY well-diagnosed faithfulness fix
  at LOG forever, independent of how well it was explained, because they did not distinguish "restores
  an already-measured value" from "chooses a new unmeasured one." Ruling: a FAITHFULNESS fix (restores
  a value the engine already measures/holds but discards or misapplies — a `charFixes` constant, a
  datamined kit-literal, a computed-then-ignored value) is judged on whether the defect and its
  mechanism are correctly diagnosed, not on whether it moves the board or other units. Q3 does not gate
  a value that is already independently measured — the control-team framework would be a third
  confirmation, not the first. Q4's board-cost concern is about UNEXPLAINED movement in units beyond the
  target; a ripple traced to a verified mechanism, clean on every other hard rule (rotation/FB-count
  preservation, no leak beyond predicted carriers, no refit of a measured constant elsewhere), is
  evidence the fix is correctly modeled, not risk. This does NOT relax anything for a FIT/calibration
  change (an unmeasured value chosen to make totals agree) — that class keeps the full bar, including
  Q3/Q4 at full strength, exactly as before; the plan must say which kind of change it is. Landed in
  `.claude/agents/postop-judge.md` (canonical rubric), `.claude/agents/preop-judge.md` (the
  faithfulness-vs-fit failure-mode entry), and `.claude/skills/scientific-method/SKILL.md` (step 6 +
  rubric summary, kept in sync with the agent copies).

- **(2026-08-10) `jill`'s swap-cadence fix: IMPLEMENTED after the LOG-blocking teammate
  ripple was traced to a real, faithful mechanism — not a rotation-engine defect.** Owner
  challenge to the LOG gate below: burst gauge generation IS provably locked for the entire swap
  window (`addGauge`'s `fbEndFrame > frame || stage !== 0` early return, `src/engine/sim.ts`), so
  shot COUNT during the window cannot leak into the shared gauge — that part of the LOG entry's
  concern was correctly reasoned about the wrong mechanism.
  **⚠ SCOPE CORRECTION (2026-08-13) — "locked for the entire swap window" is true of `jill` and NOT
  true in general; read it as a statement about her timing, not a property of swaps.** The lock is on
  the CHAIN (stages 1-3) and FULL BURST, not on the swap. A 10s swap cast at stage 2 is fully covered
  only when the chain COMPLETES; when the chain EXPIRES the lock lifts mid-swap and the remaining
  duration feeds the bar normally. This sentence, stated unconditionally, is the reason the same
  false alarm kept being re-raised by later sessions — an agent searching the record found a
  guarantee that does not exist, while an agent reading `gaugePerShot` saw a large per-shot number
  and could not find the lock (it lives in `addGauge`, a different function). Both failure modes are
  now addressed at the source: the invariant + its CONDITION is commented at `gaugePerShot`, and
  swapped weapons generate no gauge at all (owner ruling 2026-08-13, entry above). What actually moves the next chain's
  timing is `jill`'s RELOAD-CYCLE PHASE, which the gauge lock does not gate: her same-weapon
  flavor swap does not free-refill ammo on exit (`sim.ts` ~3529, `"no free reload on exit
either"` — an existing, already-general primitive, not new). Toggling the fix on/off and
  tracing her actual reload events in the first 10s swap window: the buggy 12/s cadence burns 7
  magazines in that window; the fixed 2.5/s cadence burns 2. Both are fully inside the
  gauge-locked window, so neither touches the shared bar DURING the lock — but when the lock
  lifts the instant Full Burst ends, `jill` sits at a different point in her reload cycle in each
  build, so her own first post-lock shot lands on a different frame, nudging the shared gauge's
  refill curve — which is what surfaces as sub-second cast-timing drift on `grave` / `anis-star`
  / `chisato` / `noir` in the `misc B3s (run I order)` comp (and even on `jill`'s own next cast:
  2nd-cycle burst moves 34.00s → 34.50s). This is the SAME class of effect that lets any unit's
  reload state ripple into shared rotation timing generally — reload/ammo cycling THROUGH Full
  Burst is itself correct, intended behavior (units keep firing and reloading during FB in the
  real game; only their GAUGE contribution is gated) — so the ripple is real, faithful collateral
  of fixing `jill`'s cadence, not a bug the fix introduces. **Faithful > fit stands: the fix
  lands.** Board: 1.924 → 0.983 (0.92 / 1.00 / 1.03). Snapshot diff, verified value-by-value
  (not just pass/fail): confined to the ONE pinned comp containing `jill` — `misc B3s (run I
order)` — `jill`'s own row (a 58.22% DECREASE, expected) plus the four now-EXPLAINED teammate
  rows (`grave` +0.57%, `anis-star` -0.18%, `chisato` -2.70%, `noir` +0.62%); every other pinned
  comp byte-identical. Her other two graded (real-recording) comps, `N1` (never bursts — moved
  zero, confirmed) and `PI` (same 5-unit roster as PI2 in a different slot order, jill 1.03), are
  NOT snapshot-pinned, so the same reload-phase ripple on `PI`'s four teammates is real but
  unmeasured by the regression gate — a coverage gap, not a different outcome; pin it or accept
  the gap explicitly if this becomes load-bearing later. Every measured full-burst-count assertion
  preserved (12/12/12 on her three comps). Mechanism
  pinned as a new spec-test group (`scripts/tests/units/jill.test.ts` J9) that asserts her first
  swap window completes only 1-3 reload cycles, not the ~7 the buggy cadence forced — a regression
  guard against the bug's reintroduction from the reload-count angle, independent of J8's
  cadence-ratio angle. `verify.sh` green (274 files / 4206 tests). One unrelated fixture needed
  re-calibration as a KNOWN, already-3x-precedented maintenance cost — see the roster-generator
  entry below. Full investigation trail:
  [scientific-method-harness.md](handoffs/scientific-method-harness.md) (2026-08-10 addendum).
- **(2026-08-10) SUPERSEDED (2026-08-10) — disregard the LOG verdict below; the blocking finding
  was explained (see the entry above), not resolved by further gating.** `jill`'s swap-cadence
  fix: `/scientific-method` gate returns LOG, not IMPLEMENT — a real teammate side effect, not a
  rejection of the diagnosis. Full panel run on the
  faithfulness-enactment Tier-1 fix (batch 4's finding: `src/engine/sim.ts`'s same-weapon swap branch
  never falls back to `charFixes.pullsPerSec`, so `jill` fires her 10s true-damage window at the AR
  class default ~10/s instead of her measured 2.5/s). Premise gate 4/4 CONFIRM (uniqueness premise
  CONFIRMED STRONGER: she's the roster's only `charFixes.pullsPerSec` carrier at all). Both judges
  (driver + blind Fable) ACCEPT the mechanism — H0a fit-exposure ruled out (`damagePct: 71.09` is
  kit-literal, predates the bug's discovery by a day), H0b wrong-mechanism ruled out (in-window shot
  counts scale exactly with the cadence ratio; per-shot damage/core-rate unchanged to 4 sig figs), H0c
  leak-to-other-carriers ruled out (fix independently re-verified inert for every other roster unit).
  Board: 1.924 → 0.983. **But the pre-registered acceptance band missed on both bursting comps** (a
  flaw in the band formula, which double-counted her cadence-independent Acid Ammo dot — corrected math
  reproduces the measured numbers almost exactly), **and — the blocking finding — the strict snapshot
  diff was NOT confined to jill's own rows: `grave`, `anis-star`, `chisato`, `noir` all drifted
  0.18–2.70% (single-run) / ~0.3% (MC-mean) in her `misc B3s (run I order)` comp, FB counts unchanged,
  traced to sub-second burst-chain cast-timing drift.** The blind post-op judge proved (not merely
  asserted) that the plan's own named fallback — a unit-local override restate instead of the engine
  fix — does NOT resolve this: both candidates compute the identical numeric cadence for jill via the
  same first-checked field, so both cause the identical downstream timing cascade; landing either one
  requires accepting or first resolving this collateral, not routing around it via candidate choice.
  2-of-2 ACCEPT at MEDIUM confidence does not clear the HIGH+HIGH bar for IMPLEMENT. **Nothing landed
  — the isolated worktree carries the diff unmerged, uncommitted; no engine/override file on the shared
  main tree changed.** Full record + owner action items:
  [scientific-method-harness.md](handoffs/scientific-method-harness.md) (2026-08-10 entry, bottom of
  the decision log). This does not reverse batch 4's original diagnosis — the defect and its fix are
  correctly identified; what's unresolved is whether the measured teammate collateral is acceptable, or
  needs its own gated pass first.
- **(2026-08-10) FAITHFULNESS BATCH 8 — the graded-comp slice of phase 4 is COMPLETE, and
  an "inertness" claim turns out to be worth 22.6%.** All 9 remaining graded-comp units reviewed:
  `red-hood` (SR/Iron), `quency-escape-queen`, `alice` (SR/Fire), `mihara-bonding-chain`, `ada`,
  `ade-agent-bunny`, `mast-romantic-maid`, `guillotine-winter-slayer`, `mint`. Applied = prose only;
  every block array byte-identical, board byte-identical (7/14/23/22, 142 datapoints), `verify.sh`
  green. Findings: [batch-8 findings](handoffs/2026-08-10-faithfulness-batch8-findings.md).
  **`alice`'s override claimed her `hasPierce` was "damage-INERT at scope lock … verified
  byte-identical totals with/without hasPierce". Measured A/B on her only graded comp: 1.100 HOT
  with it, 0.897 COLD without — 444M vs 362M, +22.6%, every other unit in the comp unchanged.** The
  original verification was correct IN ITS FIXTURE and wrong where it mattered: `hasPierce` is a hit
  TAG that only confers `pierceDamagePct` ELIGIBILITY (`PIERCE_CORE_DOUBLE` is false, so no
  double-hit), and `controlComp()` seats `liter` / `crown` / carry / `helm` (SR/Water), none of which
  grants pierce damage — whereas her graded comp PA MiKa seats `mint`, whose S2 grants allies
  `pierceDamagePct` 32.72/10s. The ENCODING is faithful and stays (the kit says "Gain continuous
  Pierce"); the prose was inviting a future reviewer to delete the tag as dead weight. **RULE, the
  mirror of "board-inert is not inert": FIXTURE-INERT IS NOT BOARD-INERT — an inertness or A/B claim
  in override prose must NAME THE ROSTER it was measured on**, because a cross-unit-dependent
  property (a pierce tag, a recovery consumer, an amp literal) cannot be generalized from a
  single-comp check. Other findings, none enacted: bare parser warnings persist as caveats beside
  their own resolutions (cleaned on `mihara-bonding-chain` 9 → 6 and `mint` 3 → 5; **3 instances
  remain in 2 units — `maiden-ice-rose`, `milk-blooming-bunny`**); the `[materialized … NOT
hand-verified]` provenance tag is stale on **8 remaining units** (`cinderella-crystal-wave`,
  `d-killer-wife`, `liberalio`, `maiden-ice-rose`, `milk-blooming-bunny`, `naga`,
  `scarlet-black-shadow`, `velvet`), same class as batch 7's `PARSER BASELINE` banner (19 carriers left after this batch cleared
  `ade-agent-bunny` and `guillotine-winter-slayer`) and worth one joint ruling; and the audit doc's F7 ramp-bake list is now **nought for three** — `chisato` and
  `rouge` carry no ramp at all, and `mast-romantic-maid` is baked at the cycle AVERAGE (2 of 3), not
  "at cap from t=0". Per-unit, `mihara-bonding-chain`'s note stated model values (270.9 / 730.1) that
  are not what ships (301 / 700), contradicted by its own REFIT sentence 1,500 chars later;
  `mast-romantic-maid` had `caveats: null` while carrying four owner-ruled approximations, so none of
  them surfaced in any lint output; `mint`'s residual (2) proposed as future work the exact heal
  block the file already ships. `red-hood`'s lifesteal is confirmed SELF-scoped — a consistency item,
  not a fit one — leaving the 5-carrier roster ruling open. **What remains of phase 4 is item (c),
  the tail**: 185 override files against 45 board-graded units, with no ratio to explain and no comp
  to check inertness against, so it wants a generated-census approach rather than per-unit reads.

- **(2026-08-10) FAITHFULNESS BATCH 7 — six graded-comp prose reviews, and the board's
  worst unit localized to an engine fallback (SURFACED, NOT ENACTED).** Units reviewed against the
  phase-4 checklist: `noir` (SG/Wind), `privaty` (AR/Water Treasure), `snow-white-heavy-arms`,
  `chisato` (SMG/Iron), `rouge` (SR/Electric), `prika` (SR/Water). Applied = prose only; every
  block array byte-identical, board byte-identical (7/14/23/22, 142 datapoints), `verify.sh` green.
  Findings: [batch-7 findings](handoffs/2026-08-10-faithfulness-batch7-findings.md).
  **The finding that matters is `jill` (AR/Electric).** The F8 swap-cadence gap —
  `u.swap.pullsPerSec ?? PULLS_PER_SEC[...]`, which never falls back to `u.pullsPerSec` — has
  exactly ONE carrier roster-wide, and it is the board's single worst unit. She carries a MEASURED
  `charFixes.pullsPerSec: 2.5` (named in the engine's own table comment) and her burst is a
  same-weapon `trueNormals` swap with no `weapon` field, so for 10s of every burst the branch
  resolves to `PULLS_PER_SEC['AR']` = 12/s — **4.8× her measured cadence**, in the window where her
  normals are also true damage. A reverted probe (fall back to `u.pullsPerSec` only when
  `u.swap.weapon` is undefined) moves her **1.924 HOT → 0.983 OK** (0.92/2.39/2.46 → 0.92/1.00/1.03,
  MAD 0.978 → 0.038, rank 45/45 → 10/45) with the board at ±5% 14→15, ±8% 23→24. **Every measured
  full-burst count is preserved**, and the unchanged `0.92` datapoint is the N1 comp where she never
  bursts — an independent discriminator for the mechanism. This is a faithfulness defect (a measured
  constant discarded by a `??` chain), not a calibration one, but it is an ENGINE change: it needs
  its own `/scientific-method` pass + owner, which must settle the fallback's shape for
  different-weapon swaps (`k`, `nayuta`) and check `jill` for fit-exposure to the buggy cadence.
  Three further cross-cutting items surfaced, none enacted: the `PARSER BASELINE (HYPOTHESIS — NOT
a validated model)` banner is stale as a class on **23 overrides** (all now have spec tests and
  gauntlet passes, and all 23 self-contradict the banner elsewhere in their own prose — one wording
  decision, not 23 judgement calls); **ally-targeted `damageTakenPct` is off-contract on 3 carriers**
  (`moran`, `rouge`, `rumani`) — the engine reads that StatKey from the enemy buff list only, so all
  three are applied-and-never-read, correct in outcome but live-looking; and **the audit doc's F7
  ramp-bake list has false positives** (`chisato` and `rouge` carry no stack-ramp line at all).
  Per-unit, the largest defect was `chisato`'s note asserting "CRIT now OFF on true normals …
  enforced at the engine `crit && !trueFlavor` guard" as a live claim — doubly false, since no such
  guard has ever existed and the 2026-07-21 ruling behind it was itself reversed in-game-confirmed on
  2026-07-25 — with the file contradicting itself ~2,000 chars later. Prose across the six went
  34,233 → 28,101 chars (−17.9%), deleting 2 self-contradictions, 4 falsified live claims and 3
  rotted citations. **Method lesson: the audit's own findings docs are premises too** — the F8 claim
  forwarded by the START-HERE doc was true and produced the `jill` finding, while its F7 membership
  was wrong for both of this batch's units on that list.

- **(2026-08-10) THE UNTAGGED AMP-CARRIER DEBT IS CLEARED — 28 `burstDesc` instances
  across 25 units; a third localization phrasing-hole found doing it.** Owner-directed after the
  literal-only + block-level + stray-article rulings. Every unit whose burst damage block carries
  a qualifying literal is now tagged. **Board byte-identical on a full diff** (7/14/23/22, 142
  datapoints) — none of the 25 shares a comp with `trina` or `jackal`.
  22 units tagged wholesale (every damage block qualifying and wanting the SAME tag); 3 tagged
  PER BLOCK because only some of their damage blocks qualify — `2b` (`allEnemies` on the 2439.36%
  distributed nuke, `singleEnemy` on the 792% additional-damage line: two different literals in
  one burst), `helm-aquamarine` (the Electric-gated "Affects the target" block excluded) and
  `laplace-ultimate-hero` (the four Over-Energy "nearest to the crosshair" blocks excluded).
  **Third phrasing-variant hole, same family as the DAMAGE_LINE bug and the stray article:** the
  "this block reuses the previous block's scope" rule matched only `Affects the same target(s)`,
  while the localization spells it SEVEN ways across 13 occurrences (`targets`, `target`,
  `enemy unit(s)`, `enemy units`, plus status-qualified variants). It had silently dropped
  inheritance on `epinel`, `sakura-bloom-in-summer`, `julia`, `brid`, `guillotine`, `ether`,
  `mihara-bonding-chain` and `laplace`. Now matched loosely. The standing lesson: **this
  instrument kept being too literal about a kit text that is not written consistently** — three
  holes of one shape in one session, each caught only by a naive grep disagreeing with it.
  The census's vitest pin no longer carries a maintained list; it asserts the under-tagged set is
  EMPTY and that every remaining mismatch is the `dot`/`stackedNuke` engine-gap class. The
  `--under` flag is committed as the worklist generator, splitting future work into "safe to tag
  wholesale" vs "tag per block". Slugs: `2b`, `anchor` (RL/Wind), `arcana` (RL/Electric),
  `arcana-fortune-mate`, `d` (SMG/Wind), `delta-ninja-thief`, `dolla`, `epinel`, `harran`,
  `helm-aquamarine`, `kilo`, `laplace-ultimate-hero`, `maiden` (SG/Electric), `mari`, `mihara`
  (AR/Water), `milk` (SR/Water), `nayuta`, `neon` (SG/Fire), `privaty-unkind-maid`, `raven`,
  `rei-ayanami`, `rei-ayanami-tentative-name`, `vesti` (RL/Water), `vesti-tactical-upgrade`,
  `yulha`.

- **(2026-08-10) THE BURST-SKILL-DAMAGE AMPS ARE LITERAL-ONLY — owner ruling; the
  `burstDesc` tag set is rebuilt from the kit strings and 13 units are untagged.** Owner, asked
  whether `trina`'s Spread Roots reaches a non-literal scope clause: **"trina's amp is literal
  only."** Both amps quote a string and amplify skills whose description contains it — `trina`
  `'Burst Skill damage of skills with "Affects all enemies" ▲ 435.6% for 5 sec'`, `jackal`
  `'Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the description ▲ 38.91% for
15 sec'`. `jackal`'s "in the description" is explicit and `trina`'s is the same construction,
  so the ruling is applied to both. A clause that paraphrases the same meaning in English does
  NOT qualify.
  **This SCOPES, and does not overturn, the earlier same-day scope-string ruling** — that one
  answered whether such clauses count as TARGETING THE BOSS (they do, and the damage still
  lands), which is a different question from whether they satisfy an amp that names a literal
  string. Batch 5 flagged exactly this conflation; `burstDesc` feeds nothing in the engine but
  these two amps, so a tag is precisely a claim of amp eligibility.
  **Resolves the batch-5 refutation by localizing the wrong term.** Tagging `cinderella`
  ("Affects **random** enemies") had taken her 0.893 COLD → 1.523 HOT, her three `trina`
  readings 0.94/0.96/1.01 → 1.91/2.55/2.60, and the real fights refused it. The scope was the
  wrong term — the 435.6 magnitude and the ⚑ additive Damage-Up placement are untouched by
  this and remain unmeasured.
  **Enacted:** 31 tag instances removed across 12 units whose damage-block clause holds no
  literal (`anis`, `belorta`, `crow`, `ein`, `elegg`, `elegg-boom-and-shock` ×19, `eunhwa`,
  `exia` ×2, `frima`, `ludmilla`, `signal`, `viper`) plus `novel` (see the hold below);
  `allEnemies` added to the three true carriers in the graded slice (`noir` 351.64%, `privaty`
  — the AR/Water Treasure base — 1407.64%, `quency-escape-queen` 1736.31%), whose damage blocks
  read "■ Affects all enemies." verbatim. `isabel`, `liberalio`, `mica`, `phantom`, `scarlet`
  and `soda-twinkling-bunny` keep theirs — all literal. `liberalio` is the one board-active
  pairing (N3 with `trina`) and is unaffected, so her 0.917 → 0.929 amp movement stands.
  Every slug in this entry is exact and several are ambiguous base names — read them as the BASE
  unit: `anis` = RL/Iron (not `anis-star`), `elegg` = MG/Electric (not `elegg-boom-and-shock`,
  listed separately), `eunhwa` = SR/Fire (not `eunhwa-tactical-upgrade`), `helm` = SR/Water
  Treasure (not `helm-aquamarine`), `ludmilla` = SMG/Water, `mica` = RL/Wind, `scarlet` =
  AR/Electric (not `scarlet-black-shadow`), `cinderella` = RL/Electric (not
  `cinderella-crystal-wave`), `privaty` = AR/Water Treasure (not `privaty-unkind-maid`).
  `helm`'s batch-5 hold COLLAPSES: her clause is non-literal, so there was never a tag to land
  and the coordinated `jackal` J4/J5 edit is moot. **Board byte-identical on a full diff** (no
  retagged unit shares a comp with `trina`; `jackal` sits in no graded comp) — 7/14/23/22 across
  142 datapoints, unchanged. Six spec pins flipped from asserting the tag to asserting its
  ABSENCE with the reason, so it cannot be silently re-added.
  **THE MATCH IS BLOCK-LEVEL — owner ruling, same day.** The literal must sit in the SAME "■"
  block as the damage line it would amplify, not merely somewhere in the burst description.
  Owner: _"it does require it to be on the same block — look at `scarlet` as an example for a
  known working trina amp target."_ `scarlet` (AR/Electric base) has two burst blocks, "Affects
  self. Activates when HP falls below 50%." (Crit Rate, no damage) and "Affects all enemies."
  (the 849.15% nuke); the literal is on the damage block. Note she is consistent with BOTH
  readings, so she is a confirming positive control rather than the discriminator — the ruling
  is what settles it. **Exactly ONE unit differs between the readings — `sin`** (literal on a
  Damage-Taken block; her damage block reads "Affects enemies within attack range"), and she is
  untagged. [This originally named four units; `guillotine-winter-slayer` and `kilo` were a
  census bug — see the batch-6 entry — and `novel` left when the article was forgiven.]
  **A trailing qualifier does not break the match** (`2b` "Affects 1 enemy unit(s) with the
  highest remaining HP" qualifies); an inserted word does — see the near-miss entry below.
  Instrument: **`npx tsx scripts/census-burst-amp-scope.ts`** (block-level, whitespace-
  normalized; `--check` gates over-tagging, `--near-miss` reports the article cases), self-
  validated by `scripts/tests/census-burst-amp-scope.test.ts`, which also pins the roster
  invariant and the explicit list of 24 literal carriers outside the graded slice that are not
  yet tagged (inert — a missing tag applies no amp — and each one a per-unit review).

- **(2026-08-10) THE ENGLISH KIT TEXT'S STRAY ARTICLE IS FORGIVEN — owner ruling; the amp is
  assumed to key off an internal targeting id, and 6 more units are tagged.** Owner: _"let's
  operate under the assumption it keys off internal id because it'd be really dumb if it
  didn't."_ Seven units have a burst DAMAGE block reading "Affects **the** 1 enemy unit(s) with
  …", one article off the literal `jackal` names.
  **The article is a localization artifact, not a targeting distinction** — seven clause bodies
  are attested BOTH ways across the roster ("…with the highest remaining HP": `nero` with, `2b`
  without; "…with the highest final DEF": `guilty` with, `dolla`/`milk`/`neon` without), and
  decisively **`pepper`, `rapi` (AR/Fire base) and `maiden-ice-rose` each use BOTH spellings of
  the SAME clause inside their own kit**, which no targeting rule can explain.
  **Enacted:** `stripStrayArticle()` normalizes "Affects the ⟨count⟩" → "Affects ⟨count⟩" before
  matching, so the census decides this rather than a hardcoded unit list. 8 tag instances added
  across 6 units — `guilty` (×2: the nuke plus its max-stack "Affects the same target(s)" rider,
  which inherits the scope per the `exia` precedent), `nero`, `novel`, `pepper`, `power` (×2,
  same inheriting-rider shape), `rapi`. The 7th, `ark-ranger-black`, qualifies on the clause but
  her burst damage is a `dot` and is blocked by the engine gap below instead. Board byte-
  identical on a full diff. `novel` stops being a block-vs-skill case entirely: with the article
  forgiven, her own damage block carries the literal.
  **This is an ASSUMPTION, not a measurement, and is recorded as one.** It is safe to adopt now
  because every affected unit is on `jackal`'s side and `jackal` sits in no graded comp, so being
  wrong costs zero today; a popup read of an amped nuke on any of the six confirms or refutes it.
  The rule is deliberately narrow — it fires only where the article precedes a COUNT, which is
  exactly where the inconsistency is attested, and does not touch "Affects the enemy nearest to
  the crosshair" / "with the highest final ATK" / "the same target(s)", which are different
  targeting rules that the literal-only ruling still excludes. `viper` ("Affects 1
  **designated** enemy unit(s)") stays a genuine non-match — "designated" is a real word doing
  real work, and the census pins the two classes separately.
  Detector: `npx tsx scripts/census-burst-amp-scope.ts --near-miss` (now reports `viper` alone).

- **(2026-08-10) A BURST-SLOT `dot` IS STRUCTURALLY AMP-INELIGIBLE — engine gap, recorded.**
  `burstDesc` is plumbed only on the `flatDamage` effect and its pending-hit path, so a burst
  damage line modeled as a `dot` can never read an amp however its kit clause reads.
  **FIVE units carry a qualifying literal on their damage block and still cannot be tagged** —
  `ark-ranger-black`, `diesel-winter-sweets`, `guillotine-winter-slayer`, `maiden-ice-rose`,
  `mana`. (`maiden-ice-rose`'s burst is a `stackedNuke`, the roster's only one, and carries no
  `burstDesc` either — same structural gap, third primitive.) `mihara-bonding-chain` is a dot
  carrier too but her clause is non-literal, so she is moot on both counts. Board-inert (no dot
  carrier shares a comp with an amp). Fixing it means threading `burstDesc` through the
  dot/stackedNuke records and their tick paths — an engine change, out of scope for the sweep.

- **(2026-08-10) FAITHFULNESS PHASE-4 BATCH 5 — the graded-comp slice; the burst-amp
  channel is an UNTESTED LANDMINE.** Six highest-leverage graded-comp reviews (`crown`,
  `anis-star`, `cinderella`, `little-mermaid`, `helm`, `trina` — full record
  `docs/handoffs/2026-08-10-faithfulness-batch5-findings.md`). Enacted: prose only — ZERO
  `burstDesc` tags. `helm`'s 8236.8% nuke qualifies for 'singleEnemy' ("Affects the enemy with
  the highest final ATK", crow's clause word-for-word) and is board-inert by full A/B diff, but
  is HELD: jackal's spec fixture seats helm, so the tag switches the amp on there and breaks two
  jackal pins — a cross-unit edit the sweep does not make. (That failure is also the first
  end-to-end exercise of the burst-amp channel in the whole suite.) A new helm H7 pin asserts
  the tag's ABSENCE with the reason, so the hold is deliberate. `trina`'s first caveat still claimed
  Spread Roots is "NOT modeled" while her fifth said MODELED (same self-contradiction class as
  `jackal`); corrected. Provenance narration deleted from all six notes. **THE FINDING:**
  `trina`'s Spread Roots (`burstSkillAoeDamagePct` 435.6, all allies, 5s) is live, its kit gate
  ("enemy count aside from Nikkes is 1") is always true in solo raid. It bites in exactly ONE
  place today — `liberalio` in N3, where the amped hit is a small share of her total and the amp
  moves her mean 0.917 → 0.929, TOWARD her real fight; every other tagged unit is unpaired with
  her, so the rest of the board is byte-identical either way. The danger is the first BIG
  pairing. Tagging the obvious next carrier, `cinderella` ("Affects random enemies",
  plural ⇒ 'allEnemies' under the 2026-08-10 scope-string ruling, and her run-B comp-mate),
  takes her from **0.893 COLD to 1.523 HOT** — the three trina readings go 0.94/0.96/1.01 →
  1.91/2.55/2.60. The real fights REFUTE the combination of (435.6 magnitude, additive
  Damage-Up placement, non-literal scope) AT THAT SCALE; at least one is wrong, most likely the scope (the amp
  names the literal string "Affects all enemies") or the additive placement (unmeasured ⚑ since
  it landed). **Consequence for the remaining sweep: the dormancy of the 39 tag instances landed so far (20 units)
  is NOT evidence of safety — it is evidence that nothing has been paired yet. No further tag
  on a unit sharing an amp carrier's comp until the amp is validated, and every future tag gets
  an A/B before it lands.** Validation recipe: popup-read a qualifying all-enemies burst nuke
  cast inside vs outside a Spread Roots window. `cinderella` stays untagged with the reason in
  her caveats. Full gate green; board byte-identical.

- **(2026-08-10) FAITHFULNESS PHASE-4 BATCH 4 — the board-outlier slice; `jill`'s
  1.924 is a DEFECT, not a residual.** Six checklist reviews of the worst-ranked unreviewed
  board outliers (`jill`, `ein`, `moran`, `maxwell`, `takina`, `elegg-boom-and-shock` — full
  record `docs/handoffs/2026-08-10-faithfulness-batch4-findings.md`). Enacted under standing
  rulings only: 20 `burstDesc` tags (`ein` burst nuke 300.02% 'allEnemies'; ALL 19
  `elegg-boom-and-shock` burst hits across both ghost branches 'allEnemies'), all dormant and
  byte-identical. **Zero DEF ▼ encodes — verified against kit text, none of the six carries the
  line.** Prose: 6 bare `sim.ts:<line>` citations fixed, every one of which had already rotted;
  `moran`'s note (~70% changelog, all of it already here) re-based on the current model;
  `jill`'s falsified "grades ~1.07–1.34" + "acid dot is noFb" claims and her spec header's
  three UNMODELED claims deleted. **NOT ENACTED, owner + `/scientific-method` gate:** `jill`'s
  burst is a same-weapon flavor swap that restates no cadence, and the engine's swap branch
  reads `u.swap.pullsPerSec ?? PULLS_PER_SEC[...]` without falling back to `u.pullsPerSec` —
  so her video-MEASURED 2.5/s is discarded for the 10s window and she fires at the AR class
  default. Three independent confirmations (code read; a direct shot count of 9.28/s in-swap vs
  1.98/s out; board 1.924 → 0.983 with `pullsPerSec: 2.5` restated, within-±5% 14 → 15). She is
  the roster's ONLY unit with both a `charFixes.pullsPerSec` and a `weaponSwap`; a
  `charFixes.reloadFrames` does survive a swap, which is why this went unseen. Instrument
  committed as jill spec group J8. This displaces the QUEUE's DEF-bypass hypothesis for her HOT
  (worth ~0.02% at the `bossDef = 140` basis, not 2.4×). Full gate green; board byte-identical.

- **(2026-08-10) FAITHFULNESS PHASE-4 BATCH 3 — the "records the same shape" list
  held real carriers; 7 more DEF ▼ encodes + 4 scope tags.** Six checklist reviews
  (`ether`, `eunhwa`, `himeno`, `signal`, `mica`, `crow` — full record
  `docs/handoffs/2026-08-10-faithfulness-batch3-findings.md`), every carrier claim verified
  against the kit SSOT. Enacted under the standing rulings (2c DEF channel + the 2026-08-10
  scope-string ruling; all values kit-verbatim SL10): `signal` S1 −5.94/5s (hitCount:60) +
  burst −12.34/10s rider; `himeno` S1 −6.94/3s (shotFired — frima's clause-identical shape);
  `ether` S2b −9.38/6s (SIBLING interval:13 + fbGate:'inFb' — first precedent for the
  "same-enemies + during-Full-Burst" sub-block class; fullBurstEnter fork ⚑-recorded in her
  note with a measurement recipe); `eunhwa` S2 −29/5s (lastBullet) + burst −2.43/15s rider
  (the two shaves SUM while overlapping — distinct slot keys); `mica` burst −13.32/5s
  (sibling). Tags: `crow` 'singleEnemy' (915.75%), `signal`/`eunhwa`/`mica` 'allEnemies'.
  `crow` carries no DEF ▼ kit line (ATK ▼ only — stays dropped). The batch-2 "carrier set
  COMPLETE" claim is superseded in place (under-count); the kit-text census leaves `belorta`
  as the sole override-carrying remainder (encodes at her review) + `centi`/`product-23`/
  `trony` (no overrides). Stale-phrase fixes in all six overrides + specs + the
  `enemy-def-debuff.test.ts` header (the channel-math owner file itself still claimed the
  bossDef-0 basis); `jackal`/`quiry`/`ram` join the sweep queue (grep must be
  whitespace-normalized — a line-wrap in mica's spec defeated the exact-phrase grep). Review
  doc regenerated 421 → 414. Full gate green.

- **(2026-08-10) NON-LITERAL BURST SCOPE STRINGS COUNT AS TARGETING THE BOSS — owner
  ruling; the six logged `burstDesc` tags enacted.** Owner: "for the purposes of this sim,
  yes these will all count as targeting the boss." Resolves batch-2 cross-cutting finding 2.
  The logged non-literal scope clauses are amp-eligible, mapped by clause cardinality:
  singular wording → `'singleEnemy'` (`viper` "Affects 1 designated enemy unit(s)" 1029.6%;
  `elegg` "Affects the enemy nearest to the crosshair" 316.66%), plural/capped-multi wording
  → `'allEnemies'` (`anis` "Affects enemies within attack range" 156.73%; `frima` "Affects
  10 enemy unit(s) with the highest final DEF" 101.66%; `ludmilla` "Affects 10 enemy unit(s)
  with the highest final ATK" 163.1%; `exia` "Affects the 10 enemy unit(s) with the highest
  final DEF" 122.32% on BOTH burst damage lines — the hackingCode-gated "Affects the same
  target(s)" additional-damage line inherits the scope). All dormant-live per the amp
  convention (byte-identical until an amp carrier shares a comp; verified neither the
  `jackal` nor `trina` spec fixture seats a tagged unit, so their tag-absence pins hold).
  Units not yet through phase-4 review with the same clause class (e.g. `helm` "Affects the
  enemy with the highest final ATK") take their tags at their own review under this ruling.

- **(2026-08-10) FAITHFULNESS PHASE-4 BATCH 2 — the DEF ▼ carrier set is COMPLETE.**
  **[The "COMPLETE" claim SUPERSEDED same day by batch 3 — an under-count: the "records the
  same shape" secondary list held four real kit-carriers (`signal` ×2, `himeno`, `ether`,
  `eunhwa` ×2) and the kit-text census found `belorta`; see the batch-3 entry above. The
  batch-2 encodes themselves stand.]**
  Six parallel checklist reviews (`anis`, `cocoa`, `elegg`, `frima`, `ludmilla`,
  `marciana-marine-study` — full record `docs/handoffs/2026-08-10-faithfulness-batch2-findings.md`).
  Enacted under the standing rulings (2c DEF channel; all values kit-verbatim SL10): DEF ▼
  encodes on `anis` (burst −32/5s, sibling burstCast block), `elegg` (burst −35.64/10s riding
  the BOOM-Install status block), `frima` (S1 Sleepy −4 ×5 stacks/10s shotFired + burst rider
  −9.86/10s, kit-order effects), `ludmilla` (S1 −8.4/10s, new lastBullet block), and
  `marciana-marine-study` (burst −10.56/20s riding the Electric-gated High-Risk-Target
  block). `cocoa` was struck from the carrier lists as a prose-grep FALSE POSITIVE — her only
  enemy-targeted line is the burst ATK ▼ 13.59%, which stays dropped; carrier censuses must
  verify against kit text, not override prose. Zero `burstDesc` tags (five non-literal scope
  strings logged for one owner ruling — QUEUE). New spec pins: anis N4, elegg E6 rewrite,
  frima F5/F6, ludmilla L7 + guard rewrite, marciana-marine-study M7. Prose falsified by the
  DEF channel / the 140 basis corrected in all six overrides + `guilty` + the second stale
  enemy-buff dispatch comment in sim.ts (comment-only); anis's note-vs-caveat contradiction
  on the `attacked` primitive fixed (the primitive exists — makima/yulha). Review doc
  regenerated 433 → 421 entries. Full gate green.

- **(2026-08-10) SCOPE-LOCK BASELINE BOSS DEF = 140 — owner ruling; the docs still
  saying 0 were stale.** Resolves batch-1 cross-cutting finding 1 (the two contradicting
  owner-attributed records). The graded basis is `bossDef: 140` — measured by the ginmy def
  test (boss-type enemies ≈140), adopted owner "always on" 2026-07-15 in
  `scripts/lib/scope-lock.ts`, and used un-overridden by the regression/control/experiment/
  vitest harnesses ever since. The 2026-07-14 "`bossDef: 0` stands" entry is superseded in
  place; the surfaces that kept claiming 0 (damage-calculation.md §1a + the §5a example note,
  nikke-damage-formula.md, the faithfulness-audit F4 framing, and `validate-overrides.ts`'s
  smoke cfg, moved 0→140) are reconciled with this entry. Deliberately non-140 surfaces are
  unchanged and not drift: the B1/B2 DPS comparability boards pin `bossDef = 0` by their own
  ruling (docs/data/rank-boards.md), and the web raid presets run 30,930 / 12,200. — owner
  ruling 2026-08-10; batch-1 finding (two reviewers independently, orchestrator-verified
  against scope-lock.ts).

- **(2026-08-10) FAITHFULNESS PHASE-4 BATCH 1 — six units reviewed, the owner-ruled
  pattern classes enacted.** Six parallel checklist reviews (`viper`, `phantom`, `novel`,
  `exia`, `soda-twinkling-bunny`, `isabel` — full record
  `docs/handoffs/2026-08-10-faithfulness-batch1-findings.md`). Enacted under the standing
  rulings (2c DEF channel; 2b tag convention; all values kit-verbatim): DEF ▼ encodes on
  `novel` (−7.05/5s, interval:10 block), `exia` (−13.77/5s lastBullet + `resourceGate
hackingCode min:1` — the kit's own gate; burst −2.71/5s), `viper` (−19.83/10s burstCast),
  `phantom` (−32.19/5s riding the Calling Card-inflicting block, array order preserved);
  `burstDesc` tags on `novel` ('singleEnemy' 330.61%), `phantom` (1457.28%),
  `soda-twinkling-bunny` (628.7%), `isabel` (149.85 + escalating 299.7/349.65) — all
  'allEnemies', all byte-identical today (no shared amp carrier). Specs: viper V7 rewritten
  from the unmodeled-pin, new novel N6 + exia X10 groups; exia X4's arms strip the shave (it
  reads `baseAtk`, which the DEF window now moves at the DEF-140 harness basis — observable
  isolation). Full gate green, 127/127 unit specs. Cross-cutting stop-and-surface items (incl.
  the bossDef 140-vs-0 doc drift ruling) and per-unit follow-ups live in the batch doc, not
  enacted.

- **(2026-08-10, later) ENEMY DEF ▼ CHANNEL LANDED — owner-ruled "bosses should get -def"
  (faithfulness-pass phase 2c).** An enemy-targeted `defPct` at a nonzero value now reaches
  `enemyBuffs` and scales `cfg.bossDef` by `(1 + Σ/100)`, floor 0, at damage time (`bossDefNow`
  in sim.ts). Graded-surface footprint — CORRECTED SAME DAY by the phase-4 batch-1 review: the
  graded surfaces run `bossDef = 140` (scope-lock.ts, owner 2026-07-15), NOT the 0 several docs
  claimed (that doc-vs-code drift is a batch-1 finding of its own), so the channel is LIVE there
  at ~0.02%-scale per carrier (a % of 140 vs six-figure ATK; `scripts/battery/boss-def.ts`
  bounds a full DEF-zeroing at ≤0.12% board-wide) — and the gate stayed green because `guilty`,
  the sole live carrier, sits in ZERO pinned comps (all three snapshots checked) and the drift
  gate tolerates 0.1%. The channel's real weight is the web app's Solo/Union Raid DEF defaults
  (30,930 / 12,200), where the pre-channel silent drop cost carriers several percent
  (damage-bucket-matrix §5 trap 4). First live carrier: `guilty` burst `defPct: -20.25` (was
  encoded and silently discarded). The 10 other prose-recorded DEF ▼ carriers encode
  kit-verbatim as each passes its phase-4 faithfulness review; `mast` (SMG/Electric) stays
  unmodeled — Sea Breeze is a flat caster-DEF-basis shave with no caster-DEF stat, deferred
  until a second carrier appears. Enemy ATK ▼ stays dropped (nothing models incoming damage);
  the validator warning now covers only genuinely-dropped shapes. Evidence: full verify green,
  regression + control-regression byte-identical (graded basis untouched); equivalence proof in
  `scripts/tests/engine/enemy-def-debuff.test.ts` (−50% at DEF 20,000 ≡ DEF 10,000 exactly;
  −150% ≡ DEF 0; +50% ≡ DEF 30,000).

- **(2026-08-10) BURST-SKILL-DAMAGE AMPLIFIERS LANDED — `burstSkillSingleDamagePct` /
  `burstSkillAoeDamagePct` + the `burstDesc` scope tag (faithfulness-pass phase 2b,
  owner-approved scope).** The jackal/trina "Burst Skill damage of skills with ⟨Affects clause⟩
  ▲X%" family had no engine vocabulary (audit F3; both unit specs pinned the omission as the
  documented gap). Now: two additive Damage-Up stats read only by burst-slot hits whose effect
  carries the matching `burstDesc` tag ('singleEnemy' / 'allEnemies' — the amplified skill's own
  kit-description clause). Producers kit-verbatim: `jackal` 38.91/15s (B1 — her cast precedes the
  chain's B3 by <1s, so the window covers the rotation's nuke); `trina` Spread Roots 435.6/5s —
  the kit gates it on "enemy count aside from Nikkes is 1", ALWAYS true at solo-raid scope, so no
  gate is encoded; the Wilted Roots ≥2-enemies branch is unreachable and stays unmodeled
  verbatim. Beneficiaries tagged after per-line kit verification: `scarlet` (849.15% nuke) and
  `liberalio` (925% nuke), both "■ Affects all enemies." damage lines; the remaining ~37
  phrase-scan candidates tag as each unit passes its phase-4 review — an untagged hit reads no
  amp, so under-tagging is a COLD-side honest omission, never an over-credit. ⚑ Additive
  Damage-Up placement follows the ginmy-verified "○○ Damage ▲" family rule (damage-formula SSOT
  §2), unmeasured for these two members — a popup read of an amped nuke pins it. Evidence:
  regression + control-regression snapshots UNTOUCHED (no pinned comp pairs a producer with a
  tagged beneficiary); unpinned `N3 scarlet/liberalio iron` measured liberalio 0.877→0.924 COLD ▼
  (warmer toward 1) with every non-beneficiary unchanged at the third decimal; exact +4.356
  Damage-Up arithmetic pinned in `scripts/tests/engine/burst-skill-amp.test.ts`. Falls under the
  2026-08-09 faithfulness-enactment ruling ("no measurement is needed ahead of time … even if it
  moves the board").

- **(2026-08-10) `chargeCounter` DISPATCH NOW HONORS THE RUNTIME BLOCK GATES (faithfulness-pass
  phase 2a).** The chargeCounter branch called `applyEffect` directly, silently ignoring all 8
  abort-gates `applyBlock` enforces (the engine-modeling-gaps §1a bypass) — a latent
  silent-failure for the first gated carrier. The gates are extracted into `blockGatesPass`,
  shared by both dispatch paths; semantics mirror the hitCount path (threshold consumed
  regardless, activation count + phase advance only on gate pass). Behavior-neutral by
  construction: zero chargeCounter blocks carry any gate (roster scan 2026-08-10), regression +
  control-regression byte-identical. Still bypassed by the one-phase-per-activation design:
  `everyN`/`everyNOffset`/block `delaySec` — `validate-overrides.ts` errors on authoring those
  with a chargeCounter trigger. Positive gate-binding proof:
  `scripts/tests/engine/block-gates.test.ts` chargeCounter cases.

- **(2026-08-09, later same day) anchor-innocent-maid's same-squad membership is OWNER-CONFIRMED —
  her squadmate is `mast-romantic-maid`, not `privaty-unkind-maid`.** Resolves the QUEUE.md
  "same-squad primitive migrations" blocker and the entry below's "NOT enacted" item (the in-game
  squad-field lookup that was outstanding there — SUPERSEDED, disregard the "needs the in-game
  squad field" clause). `src/data/squads.ts` gains the `Maid` squad (both slugs); the S1 block-B
  heal gate (`recovers 3.04% Max HP every 1s for 8s`) is now `teamHas.sameSquad`-gated instead of
  always-satisfied — inert in comps without her, active with her. Kit spec
  (`scripts/tests/units/anchor-innocent-maid.test.ts`) fixture extended with `mast-romantic-maid`
  and a discriminating test added proving the gate fails closed without her.

- **(2026-08-09) FAITHFULNESS-ENACTMENT BATCH: every wrongly-unmodeled kit line from the
  unmodeled-entries audit is ENACTED, owner-ruled — "no measurement is needed ahead of time,
  this is a faithfulness fix; even if it moves the board in a negative way, it's still the
  correct move."** An 8-agent audit of `docs/unmodeled-entries-review.md` (450 entries) found
  kit lines dropped for bad reasons: evidence-fitted removals (a kit value deleted because a
  board fit was off — the rapi-red-hood 400%-modifier failure shape), false "no primitive"
  claims that predated the 2026-08-08 primitives PR, and "defensive = damage-neutral" misreads
  (the Grave reload lesson). The owner ruled all of them land as kit-text-literal encodings,
  fit-exposure accepted. Enacted (all values kit-text SL10 tier): trina burst hitRatePct
  45.3/10s (Electric-AR pool); nayuta S2 hitRatePct 42 rampSec 90; the dropped ally heals as
  event-only recovery emitters (ada S1 lifesteal ticks:10, anis-star S2 per-full-charge
  hasB1-gated, mint S1 Dancing-gated ticks:3 solo-mode); grave Prediction-end consumeAmmo
  (burstCast+delaySec:10); jill burst same-weapon trueNormals flavor swap (damagePct 71.09 =
  her datamined normalMult); snow-white-heavy-arms battleStart chargeTimeClamp 1.2 + gainPierce
  5s (swap chargeTimeSec→chargeTimeClamp 3.2, behavior-identical); arcana-fortune-mate
  instantReload 2/9 on cast + 6/9 at cast+1.5s (⚑ phase estimate); jackal honestly-dormant
  attacked:10 → damageTakenPct 9.09; elegg-boom-and-shock ghost pool min:1; rosanna Concealment
  as the name-keyed targetStatus proxy + the 561.6% burst rider (⚑ kit-duration upper bound —
  in-game on-hit removal unmodeled); rupee/soda cross-ally addStack slices + rupee's cross-slot
  Mileage merge; alice-wonderland-bunny "stack count ▲1" aligned to the +1-GRANT majority
  reading (cap-raise dissent on record, revert path named); neon-vision-eye FB-end burstGenPct
  330/500 on her own burstCast+delaySec:10 (first attempt keyed to team FB-ends over-fired in
  the co-B3 elec-battery comp — cast-keying restored the measured 11 FBs); maxwell burst
  rebuilt to the kit-literal railgun weaponSwap (813.42%/shot, ×300% full-charge, 2s charge,
  1-round mag, Pierce, 10s), superseding the probe-run-G single-flatDamage collapse whose own
  note recorded fit instability (0.80 G vs 1.17 N6). NOT enacted: anchor-innocent-maid's
  same-squad curation (a lore datum, not a measurement — guessing a maid-variant squad is the
  documented blanc/noir misread trap; needs the in-game squad field). ⚑ SUPERSEDED (2026-08-09,
  later same day) — disregard, see the entry above: owner confirmed the in-game squad field.
  **Board A/B** (142
  datapoints): aggregate stable (±5% 15→14, ±8% 22→23, worse 23→22); grave 1.119→1.095,
  arcana-fortune-mate 0.898→0.935, moran 0.660→0.728 improved; jill 0.966→1.924 and maxwell
  0.889→1.252 went hot — the two evidence-fitted holds' absorbed calibrations now EXPOSED as
  honest residuals, each with its pending direct measurement on record (jill in-burst popup
  tier; maxwell run-G/N6 burst-window popup read). Re-tune exposed units separately — never
  re-fudge (the judge-rotation rule). **Measured-truth handling:** misc B3s (run I) now reads
  12 FBs vs measured 13 — the old exact match rode the ABSENCE of grave's dump (compensating
  error); recorded as a `simFullBursts: 12` documented-divergence pin in scripts/regression.ts
  (measured 13 untouched; the open burst-generation-shortfall class). **Evidence:** branch
  `fix/unmodeled-staleness` (worktree), per-unit spec tests updated GREEN vs the new encodings
  and RED vs their superseded models, full regression + snapshot regenerated with the change,
  board A/B in this entry. The audit's staleness sweep + review-doc generator fix landed on the
  same branch (separate commits).
  proven-damage-neutral gauntlet override.** The kit-autonomy gauntlet landed `emma` at GO
  faithfulness 1.0, cross-family corroborated (S2b claude-fable-5 / S5+S6 claude-opus-5 / S7
  kimi-code/k3 binding judge). Emma is a PURE HEALER: S1 (5%-on-attacked team heal) and S2
  (incoming-healing ▲13.33%) are UNMODELED verbatim (no attacked trigger, no incoming-damage
  model, no incoming-healing StatKey, no HP pool — the >90% HP gate is trivially OPEN in v1, so
  the omission is the missing stat primitive, not a dead gate); the burst's two heal lines are
  modeled as recovery-EVENT emitters on her OWN burstCast (instant ticks:1 + "over 5 sec"
  lifesteal as ticks:5/intervalSec:1, the latter a flagged ⚑ convention per marciana's "over 3
  sec" precedent). She has zero buffs, zero damage lines, zero weapon-state modifiers — CW1's
  damage-neutrality test (the option-2 refinement of 2026-08-01) passes with the override on
  disk, and her unit fixture proves the burstCast keying discriminates in BOTH directions
  (co-B1 liter opens 3 of 4 Full Bursts without her; 4 of her 5 casts stall without completing
  a chain). CW2–CW5 baselines unchanged (they sim via `bareWeaponComp`, which never reads the
  committed encoding). **Evidence:** `scripts/tests/units/clean-weapons.test.ts` 27/27 green;
  `scripts/tests/units/emma.test.ts` 15/15 green; `scripts/kit-autonomy/results/emma.json`
  (GO 1.0); `scripts/kit-autonomy/manual-review/emma.md`; `docs/data/clean-weapons.md` (team B
  row + Fixture note). Residual (judge-named, ⚑ with recipe): the ticks:5/intervalSec:1
  lifesteal cadence — an unmeasured convention that scales on-recovery consumer refresh; recipe
  is a frame-read of a recovery consumer's refresh cadence across the 5s window after an emma
  burst. The remaining three basis cells (folkwang, claire, idoll-ocean) still carry no
  override.

- **(2026-08-04) ROTATION DEFAULT FLIP — there is NO post-Full-Burst chain-open lock; `refill`
  (chain opens on gauge-full) becomes the engine default and the fixed 150f block retires to the
  opt-in `ROTMODEL=floor` A/B arm.** Owner ruling, three corrections to the burst-gen picture
  (all traced against the implementation, not the docs): (1) generation is locked during FB and
  unlocks IMMEDIATELY when FB ends — no lingering delay; the sim's `addGauge` guard already
  matched this and stands. (2) There is no ~3s post-FB lock — the run-I bar-anatomy read
  ("chain glow at FB-end +3.0s even with the gauge full") was natural refill-from-zero: good
  teams take ~3-4s of normal generation to rebuild the bar, and the recordings that anchored the
  old read start during the pre-fight intro (fight time ≠ video time — the control video's
  "first FB at 14.1s" includes ~9s of pre-fight; the real first fill (~5.6s of fight, cf.
  QUEUE.md) matches the sim's ~5.4s).
  (3) There is no multi-second opening phase — the boss is hittable from 3:00; the engine's only
  fight-start delay is the 8f deploy delay, which already agreed. CHANGE: `chainBlockedUntil`
  now defaults to no block (`ENV.ROTMODEL === 'floor'` opts back in); `POST_FB_CHAIN_DELAY_FRAMES`
  (150f) kept only for that arm. VERIFICATION: full vitest suite green after one re-pin
  (trina fixture: the faster rotation lets the FINAL chain's B2 cast land before the 180s buzzer
  with its FB starting past it — `casts === fbs + 1`; the equality pin became `0..1` over fbs
  with the trailing-chain rationale documented). Regression: ALL enabled measured-FB pins hold.
  PH water B3s' pin is RESTORED at 12 — but the flip did NOT cause the count: the seeded
  distribution already read 12×25 pre-flip (verified on flip day: the ROTMODEL=floor arm,
  engine-identical to the pre-flip HEAD, reads 12×25 too); the old 13-over-count had been fixed
  earlier, almost certainly by 61d10e08 (SMG cadence 24→20.0/s frame-quantization flip,
  2026-07-23 — PH is exactly the 2-SMG comp the unpin note blamed). The re-pin corrects a stale
  unpin, not a behavior change. The disabled wind-weak comps are UNCHANGED by the flip (T5/T1
  read 11-12 under BOTH arms — the block never bound for them; still short of the measured 13,
  charge-B3
  gauge-fill-tempo shortfall remains open); iron sweep / N3 / N1 / soda-tb distributions unchanged
  for the same reason; T4 tightens 12x9 13x16 → 13x25 (the block bound on ~36% of seeds there;
  modal 13 unchanged, still short of the measured 14, deliberately unpinned). The gauge-cycle-decomp
  instrument was re-derived per its own contract: its floor drops the dead +2.5s term (now
  FB-duration + 0.5s pre-B1 + chain span), so `excess` reads the refill-from-zero directly —
  2.5-4.7s across the six comps, consistent with the owner's ~3-4s; bands re-pinned from measured
  values. SSOT docs synced: STATE.md (env + constants + §3), game-mechanics.md (rotation
  section + the auto-burst priority line — the latter brought forward to the 2026-07-21
  FIRST-READY ruling it had been stale against since that date, verified vs sim.ts:3078),
  damage-calculation.md, burst-gauge.md, and the agent-facing context pack
  (.claude/skills/context/SKILL.md — its sync also refreshed pre-existing staleness beyond
  the flip itself, all verified against sim.ts: the first-ready selection text, the
  PRE_B1_GAP/FB_PRE_DELAY clauses, and §7 focus-gen anchors). Frozen archives deliberately
  untouched: judge packets under
  scripts/kit-autonomy/results/ and the blind-rebuild code bundles under
  scripts/blind-rebuild/code-bundle/ (they carry the old floor default by design). PROCESS:
  owner directive ("make it the default, I thought it was already the default") — no
  scientific-method gate; test-first discipline kept (re-derive → re-pin with rationale).
  **Evidence:** owner rulings 2026-08-04 (no lock; ~3-4s refill; no opening phase; video-offset);
  `scripts/battery/rrh-rotation-anatomy-scratch.ts` + `rrh-fb-dist-scratch.ts` (floor-vs-refill
  timings + 25-seed FB distributions); `scripts/tests/gauge-cycle-decomp.test.ts` re-derivation;
  `scripts/regression.ts` (PH re-pin, all FB pins green).

- **(2026-08-04) PROJECTILE BUCKET RULING — Projectile Attachment/Explosion Damage compose
  ADDITIVELY into the Damage Up bucket; the own-multiplicative bucket is OVERTURNED. RRH's hot
  read is resolved (control 1.091 → 0.908); both rocket popup classes now reproduce the
  owner's reads.** Owner popup read from the control+carry recording: a non-crit CORE attach
  during her B3 window hit **5,057,974**. The additive composition reproduces it across buff
  states (5,046,017 / 5,113,185 = −0.24% / +1.1%); the shipped multiplicative bucket's nearest
  body missed by −38% (it over-credited in-window attaches ~×1.6–1.7 — the hot read). Change:
  `projectileAttachmentPct`/`projectileExplosionPct` now add into the Damage Up sum in
  `dealDamage` (flavor-scoped as before — an attach reads only the attachment stat, an
  explosion only the explosion stat); the event's `projFactor` is retained as a FLAVOR MARKER,
  no longer a factor in the product (the event-log product invariant updated accordingly).
  Popup double-check under the new bucket: the in-FB EXPLOSION body sims at 1,192,831 vs the
  owner's 1,195,658 read (−0.2%) — the explosion was and is modeled correctly; multi-rocket
  FB-start batches render as exact integer multiples. Blast radius: RRH control 981.1M →
  816.4M = 0.908 (the −9% remainder is count/rotation-channel — sim 12 FB vs real 13 — NOT
  instance magnitude, both popup classes now match); Anis: Star's shooting-star dots ride the
  same stat and move with her board rows (regenerated). The 2026-07-13 U4 arm (RL normals take
  projExpl in Damage Up) was already additive — consistent precedent. Test-first: RRH3's
  additive-composition pin added RED→GREEN; RRH/event-log/hit-repeat/anis-star 66/66. PROCESS:
  owner override, gate skipped by owner ruling. SUPERSEDES the validation-era own-bucket rule;
  the earlier-same-day ATTACHMENT REWORK claim that the multiplicative projFactor reproduced
  the old 4,414,404 body is WITHDRAWN (that arithmetic assumed the overturned bucket).
  **Evidence:** owner popup read 2026-08-04 (5,057,974 attach-core, 1,195,658 explosion);
  `scripts/tests/units/rapi-red-hood.test.ts` RRH3; `scripts/regression-snapshot.json` regen;
  `scripts/battery/rrh-control-probe.ts` (0.908).

- **(2026-08-04) ATTACHMENT REWORK — three owner overrides restore the attachment class as Rapi:
  Red Hood's damage carrier: the +421.2% Stage-3 buff is LIVE again, the attachment CORES, and
  the ▼60 meter threshold is scoped to her own B3 window. She flips COLD → HOT (control 0.898 →
  1.091); the overshoot stays exposed, no re-fit.** Owner direct re-read of the control+carry
  footage (`docs/probes/control + carry/rrh control.MP4`): the explosion body during her B3 is
  1,195,658 — at the floor of the sim's in-FB explosion bodies, so the explosion was never the
  under-modeled carrier; the ATTACHMENT is the main damage and gets a massive amp during her B3.
  (1) +421.2% Projectile Attachment Damage (Burst Stage 3, self, 10s) RESTORED — overturns the
  2026-07-14 "MEASURED-INERT" verdict: the amplified attachment bodies that read could not
  attribute were mis-sorted into the explosion class (same flavor family, overlapping popup
  columns). The "dominant white body" 4,414,404 of the 2026-07-16 record is a +421.2% AMPLIFIED
  ATTACHMENT — an in-window attach at the sim's own buff state reproduces it within ~1%
  (projFactor 6.7192), its ×1.5 crit twin matching the measured orange 6,621,606; the red
  "CORE HIT" labels on the 7-digit bodies were attachment cores. (2) The ATTACHMENT CORES —
  launchWeapon delivery at the band-table rate (`core:true` on the flatDamage); the 2026-07-14
  "stickies never core" verdict is OVERTURNED for the attach. The explosion stays core-INELIGIBLE
  (skill damage — the same-day CORE OVERTURN below STANDS). (3) The ▼60 meter threshold applies
  ONLY inside the 10s window of her OWN Stage-3 cast — new opt-in `countInFbStage` on the
  hitCount trigger (engine tracks `lastBurstCastStage`); the any-FB-state default stands for the
  other carrier (SWID), whose same-shaped line is flagged for its own review. Max Ammo: 1
  reclassified COSMETIC (owner: one rocket "loaded" at meter-full fires alongside the bullet; not
  reflected in game, no damage effect). Test-first kept: RRH4 flipped (attach cores), RRH7/RRH8
  added RED→GREEN (25/25); SWID + hit-count engine pins byte-green. Reads (owner directed: no
  pre-registration): control 807.6M → 981.1M = **1.091** vs 899.6M real (FB count invariant
  12.0); graded T7 +21.9%, N1 +21.5% (those comps buff the new core term), T7 teammates within
  ±0.03% gauge-coupling. The +9.1% overshoot is the new exposed residual — attribution candidates
  for the owner's footage pass: the band-table attachment CORE RATE (may over-credit vs in-game)
  and the 421.2% effective UPTIME. PROCESS: full gate skipped by owner ruling (owner overrides);
  SUPERSEDES the 2026-07-14 inert + sticky verdicts and re-narrows the launchWeapon bullet.
  **Evidence:** owner control+carry re-read 2026-08-04; `scripts/tests/units/rapi-red-hood.test.ts`
  RRH3/RRH4/RRH7/RRH8; `scripts/regression-snapshot.json` regen; `scripts/battery/rrh-control-probe.ts`.

- **(2026-08-04) Rapi: Red Hood's rocket EXPLOSION does NOT core — owner footage ruling overturns
  the 2026-07-16 core-⅓ landing; `storedHit.core` removed, she is deliberately COLDER.** Owner
  direct re-read of `docs/probes/probe u7/rapi focus vid.MP4` (the same recording behind
  `docs/probe-data/rrh-explosion-core.json`): the explosion is dealt as SKILL damage, and skill
  damage generally cannot core (the U1 function-damage no-core default). The red "CORE HIT" labels
  the 2026-07-16 OCR-by-eye read tallied (N=9, self-declared LOW-MEDIUM confidence) were concurrent
  NORMAL-column core hits — exactly the overlap hazard that record itself flagged — and the
  independent FB1 reread had already shown the consolidated FB-start batch popup rendering
  WHITE/non-core (`docs/probe-data/rrh-fb1-reread.json`). Change: `storedHit.core` dropped from the
  override (the release falls to the storedHit no-core DEFAULT — no band-table fallback);
  `storedHit.crit:true` STANDS (separate consistency landing, untouched); the spec pin flipped
  test-first (`scripts/tests/units/rapi-red-hood.test.ts` RRH4 RED→GREEN, 20/20). Pre-registered
  BEFORE the change (paired-seed control comp, LM/crown/helm/rrh): rrh 826.14M → 807.63M (−2.24%;
  the explosion-core share WAS 2.24% of her total), control ratio 0.918 → 0.898 vs the 899.6M real,
  Full Burst count INVARIANT (12.0 both arms); the post-change probe landed EXACTLY (807.6M /
  0.898). Graded snapshot regen (only her rows moved, all measured FB truths held): T7 −4.32%, N1
  rapi/quency −3.33% (per-comp core-damage buffs make the lost term larger than on the neutral
  control). PROCESS: the full scientific-method gate was SKIPPED by owner ruling — the overturned
  read predates the current probe tooling and the owner re-measured it directly; pre-registration +
  test-first anti-fit hygiene kept. Consequences: (1) the SSOT launchWeapon exception bullet is
  narrowed (RRH's rocket class is OUT — attach no-core by its own measured ruling, explosion
  no-core by this one; Anis: Star's stars still core) — RE-NARROWED again later the same day: the
  attach CORES again under the ATTACHMENT REWORK (top entry), only the explosion stays out;
  (2) the U15 ×1.80 core+crit anomaly is now
  popup mis-association, full stop; (3) the residual stays exposed and is NOT to be re-fit — and
  the clean-weapon basis (emma MG 0.977 OK, 2026-07-23) no longer supports the older "generic
  MG-cold" attribution, so the COLD remainder is the deliberately-open Invisible-X gap, no
  explosion-core credit. SUPERSEDES the core portion of the 2026-07-16 entry below. **Evidence:**
  owner footage re-read 2026-08-04; `scripts/regression-snapshot.json` regen;
  `scripts/battery/rrh-control-probe.ts`.

- **(2026-08-04) MAX-HP FOLLOW-UPS (owner-directed, same branch as the entry below): three
  disclosed HP residuals closed — a third grant basis, a stage feed, and rouge's coin state.**
  1. **quency S1 basis made exact — new StatKey `highestAllyMaxHpPct`** (commit f270dd2c):
     "Duplicates 12.42% of the Max HP of the Nikke with the highest Max HP" is the THIRD grant
     basis (after casterMaxHpPct / targetMaxHpPct). The new key resolves at apply time to a flat
     Max HP grant of (value/100) × max(all units' static maxHp) — the highestAllyAtkPct
     precedent (static basis; the kit says plain "highest", not "final" — literal-word rule).
     Closes the gauntlet's ⚑ BASIS (the casterMaxHpPct stand-in was exact only when quency held
     the team's highest Max HP); still damage-inert (no consumer). Discriminated in her spec's
     crown-contention arm (crown strictly out-HPs quency there). Next expected carrier: sin.
  2. **laplace-ultimate-hero stage Max-HP lines enacted** (commit 15ad83a5): her S2b "Stage
     1/2/3/4: Max HP ▲ 2/3/7/10.5% continuously" (cumulative) was the disclosed ⚑ "estimated,
     not enacted" second-order feed into her own atkOfMaxHpPct 4.05 conversion. The stage
     advance was ALREADY modeled (oeStage, hitCount:240 swap-gated — what her burst additional
     riders ride), so the HP lines take the identical encoding: four targetMaxHpPct self-grants
     resourceGate'd at oeStage min 1/2/3/4, dispatched AFTER the delta block (each advance
     grants its own line and refreshes all earlier ones — the kit's cumulative clause, pinned to
     one frame). Own-kit self-grants → feed liveMaxHp → feed the conversion (e3-admitted). Same
     ⚑ stage-timing as the riders; magnitudes kit-exact. Her board number moves up slightly —
     the direction of her documented under-model; she is in no regression comp.
  3. **rouge coin-state machine tracked; coin-tier riders modeled + coin-gated** (commit
     f6b9ebe6): resources coin (0=Sword/1=Shield/2=Double Sword) + shieldBursts (cap 5).
     Progression: hitCount:30 + gate{coin≤0} flips Sword→Shield (applying the Damage-Taken
     ▼15.2% line on the same fire); burstCast under gate{coin==1} counts shield-era bursts;
     gate{shieldBursts≥5} flips Shield→Double Sword — post-increment convention (maxwell
     precedent): the 5th shield-era burst IS the first Double Sword cast. The three per-tier
     burst riders (10.15/20.1/30.02, previously unmodeled) and the 15.08 continuous line
     (previously an everyN:5 approximation) are resourceGate'd on coin — exact gating. All
     offensively INERT per e3 (the spec's byte-identical proof covers them); no board/regression
     movement. The coin-tier gating flag is resolved (it was flag 3 in the PRE-rewrite note
     numbering); the surviving flags — (1) coin exclusivity and (2) Shield-rider heal asymmetry —
     remain measurement-gated.
     All three landed test-first (RED→GREEN spec pins); no damage-bearing path moves except
     laplace's own total (up, toward her measured board value).

- **(2026-08-04) MAX-HP-SCALING PRIMITIVES: maxwell-ordinary-mechanic S2 is CASTER-basis (owner
  ruling — the target-own encoding was a misread), and every "% of Max HP" engine term now reads
  live Max HP through one reader.** Three landings on branch `worktree-max-hp-scaling`, all
  test-first (RED→GREEN) with the spec pins named below:
  1. **`liveMaxHp(u, frame)` extracted from `effectiveAtk`** (byte-identical refactor, commit
     f8055b46) — base + OWN-kit maxHpFlat buffs (e3 scope unchanged), now the single reader for
     every Max-HP-scaled term.
  2. **New StatKey `atkOfCasterMaxHpPct`** (commit 9afac614): "ATK ▲ X% of the skill user's
     final Max HP" granted to others resolves at apply time to a FLAT add of the caster's
     liveMaxHp, routed to the casterAtkPct consumer — uniform across targets, one snapshot per
     cast; the caster's own-kit Max HP stacks feed the basis (self-grants are the one case e3
     admits), ally grants do not. Owner ruling: maxwell's kit reads "the skill user's final max
     HP" — the shipped per-target-own resolution was a misread of the caster-scaled text (the
     gauntlet spec's OWN kit quote already said "skill user's", confirmed against
     data/characters.json). Maxwell's spec M3 rewritten around the flat add (exact per-cast
     value = 1% × her live Max HP, uniform across allies, growing with her S1 stacks, old-model
     counterfactual); she is in no regression comp (MODEL_ONLY), snapshot untouched.
  3. **stackedNuke hpPct reads live Max HP** (maiden-ice-rose residual r2 closed): her burst is
     "1372.8% of the sum of 10% of the skill user's FINAL Max HP and … ATK" — kit-literal
     "final" = live (own-kit feed), the base read was the residual. Spec M5 pins it via a
     battle-start Max-HP doubling: the per-stack HP portion (shipped-vs-ATK-only-twin amount
     difference, eff-invariant) must scale ~2× with her Max HP (base read gives ratio 1.0002 —
     proven RED before the change). Blast radius: her two regression comps — T2 snapshot
     unchanged (no live S1 stacks at her cast frames under that timing), N6 her total +5.52%
     (FB counts unchanged: 12/12 T2, 11/11 N6, both vs measured); control-regression CTRL
     maiden comp +3.88% (477.0M → 495.5M vs real 559.0M — 0.853 → 0.886, correct direction on
     the documented conservative lower bound; r1/r3 residuals remain).
     Scope + remaining non-goals (reporting-layer maxHp, grant re-derivation, ally-grant opt-in,
     HP-pool adjacency): the scope handoff was CLOSED + archived on landing (owner: completed work
     in an open PR does not stay in the docs) — design record lives in PR #84's history
     (`docs/handoffs/2026-08-04-max-hp-scaling-primitives.md`, commit 27d49110).

- **(2026-08-04) SECOND CLEAN-WEAPON OVERRIDE LANDED: `snow-crane` (the SR basis cell) carries a
  proven-damage-neutral gauntlet override under the CW1 option-2 invariant (2026-08-01).** The
  kit-autonomy gauntlet landed `snow-crane` at GO faithfulness 1.0, cross-family corroborated
  (S2b claude-fable-5 / S5+S6 claude-opus-5 / S7 kimi-code/k3 binding judge, zero gotchas). Her
  override is recovery-event emitters (every-3rd-full-charge team heal, burst team heal), a
  full-burst-enter team shield (9.5% caster Max HP / 10s), an inert `casterMaxHpPct` aura, and a
  timed self `gainPierce` 10s window — no damage line and no weapon-state modifier, so it is
  **byte-identical to the bare weapon on damage**. She is the delicate one of the six (CW1's prose
  pin names it): her BURST grants Pierce, so "never burst" is load-bearing — the basis runs
  `disableBursts: true`, so the window never opens there, and even bursts-ON the window is inert
  in v1 (gainPierce pays out only through a `pierceDamagePct` buff, which no shipped unit carries,
  and PIERCE_CORE_DOUBLE is off / keyed to the static hasPierce flag). The unit test additionally
  proves the window is real and time-bounded through an in-memory probe (never committed):
  no-pierce ≡ base < 10s window < permanent pierce. Two encoding notes of record: (1) the
  chargeCounter carries `countInFb: 3` EXPLICITLY — the primitive defaults `countInFb ?? 1` in the
  10s post-own-burst window (SBS-baked semantics), which would heal every full charge after each
  of her casts; the blind override-writer omitted it and the judge ruled that a blind-side error.
  (2) The Proof-of-Violation → Terminated-Contract cascade (S1b/S2c) stays VERBATIM UNMODELED: the
  `recovery` trigger has no source filter, her own heals target herself, so any expressible
  counter self-stacks and flips the cascade in every comp (the nearest-wrong model); the blind
  alternative (always-on 1 Hz regen) was ruled spurious-and-worse — it fabricates a
  tandem-bearing recovery stream the real kit never emits in healer-less comps. CW2–CW5 baselines
  unchanged (they sim via `bareWeaponComp`, which never reads the committed encoding).
  **Evidence:** `scripts/tests/units/clean-weapons.test.ts` 27/27 green (CW1 damage-neutrality vs
  the on-disk override); `scripts/tests/units/snow-crane.test.ts` 26/26 green;
  `scripts/kit-autonomy/results/snow-crane.json` (GO 1.0);
  `scripts/kit-autonomy/manual-review/snow-crane.md`; `docs/data/clean-weapons.md` (team A row +
  Fixture note). Residual (judge-named, ⚑ with recipe): the countInFb engine-default reading, the
  burstCast-vs-fullBurstEnter trigger-identity split, and heal-magnitude inertness — all inert on
  damage today; the cascade recipe (a `recoveryFromOther` trigger + PoV resource pool) awaits
  HP-pool work.

- **(2026-08-03) `vesti-tactical-upgrade` Missile Guide duty cycle FIXED — new engine primitive
  `noRetriggerWhileActive`, owner-confirmed gameplay pattern (n=1, not footage-measured).**
  Investigation trigger: `vesti-tactical-upgrade` (and separately `k`) were ranking unexpectedly
  high on the DPS chart for units the owner rates low-tier; checked for an implementation bug
  before assuming the modeling was simply aggressive. `k`'s numbers traced back correctly to her
  kit text (no bug). `vesti-tactical-upgrade`'s Missile Guide ("Charge Speed ▲100%... for 3
  round(s)... while not in Missile Guide status") had no way to express the "while not in [own
  status]" re-trigger gate — the engine's only round-count primitive (`durationShots`) always
  refills on a refresh, so a `shotFired` trigger that both grants and is gated on its own buff
  re-armed the window on every full charge, producing near-permanent uptime instead of a duty
  cycle (already self-documented as caveat ⚑5 at kit-autonomy-gauntlet time, 2026-08-01). Owner
  confirmed the real pattern directly: one full (slow) charge, then 3 near-instant follow-up
  rockets, repeating. Two paired engine changes land this: (1) `noRetriggerWhileActive` on a buff
  effect skips any re-application while a same-key instance is still active on the target: (2) the
  `durationShots` round-count decrement now exempts the shot that just (re-)granted a
  `noRetriggerWhileActive` buff (its own charge predates the buff, so it cannot have benefited and
  must not spend one of the buff's own N rounds — without this, "for 3 round(s)" yields only 2
  rapid follow-ups, not the observed 3). Both are opt-in and proven inert for the rest of the
  roster (dedicated primitive test + the full control/engine regression suite unchanged for every
  other carrier). Datamined magnitudes (`chargeSpeedPct` 100, `chargeDamagePct` 58.5,
  `durationShots` 3) are UNCHANGED — only the trigger-gating mechanism moved. Impact: control-comp
  total damage 887.4M → 436.0M (**-51%**). **This lands the `vesti-tactical-upgrade` slice of the
  already-tracked "Theme 21" `durationShots`-eats-its-own-pull engine bug** (QUEUE.md,
  `docs/engine-modeling-gaps.md`); `emilia`/`zwei`/`phantom` are the theme's other three carriers
  and are deliberately UNTOUCHED by this change (the exemption is gated behind
  `noRetriggerWhileActive`, not made the `durationShots` default) pending their own board A/B and
  an owner call on whether to reuse this flag or make the exemption unconditional. — `src/engine/sim.ts`
  (`applyBuff`, the buff-apply call site, the ROUND-COUNT decrement loop), `src/skills/types.ts`,
  `src/skills/overrides/vesti-tactical-upgrade.json`, `scripts/tests/engine/no-retrigger-while-active.test.ts`,
  `scripts/tests/units/vesti-tactical-upgrade.test.ts`

- **(2026-08-03) `mint` Singing/Dancing gate ENACTED as a dynamic per-cast alternation (`resourceGate`),
  superseding the 50%-uptime halving proxy — owner-confirmed parity (Dancing-first) + strict
  alternation, zero graded-board impact.** Follows directly from the same-day mode-default ruling
  entry below, which had left this as an open owner decision pending two facts: which state she
  starts in, and whether the alternation is strict, and which explicitly named a confirming
  RECORDING as the route to those two facts — that recording requirement is DISCHARGED here by the
  owner's direct conversational confirmation of both facts instead, not by footage; the entry below
  is left as originally written (append-only) rather than edited to match. Owner-confirmed both directly in conversation:
  "she starts with nothing on, which means she goes dancing first" (matches the kit-literal Status
  1/2 gate — "if NOT in Dancing [incl. no part yet] → gain Dancing" — already assumed Dancing-first)
  and "the alternation is that clean/strict," then directed the fix: "we should actually alternate
  her buffs and not apply them half all the time." Implementation exactly follows the recipe already
  spec'd by the 2026-07-25 kit-autonomy gauntlet's binding judge (S7 opus, code-verified, independently
  corroborated by the blind S2b/S5 reviewers) in the override note: a `singing` resource (0=Dancing,
  1=Singing; declared `resources`, initial 0) driven by two `mode:'solo'` `burst` blocks on Mint's own
  `burstCast` (`everyN:2`/`everyNOffset:1` → `delta:-1` on her odd casts, `everyNOffset:0` →
  `delta:+1` on her even casts), and the S1 casterAtkPct + S2 stage-3 crit/projExpl/pierce blocks
  gated `resourceGate:{name:'singing',min:1}` at the FULL kit-literal magnitude (45.02/19.94/50/32.72
  — unchanged values, already independently pinned by `mint.test.ts`'s prior M4 duet assertions; only
  the GATING changed). Not a scientific-method-gated change: no new numeric magnitude is introduced
  (kit-literal, pre-certified), and the mechanism is a direct code-level implementation of
  owner-stated facts about her own kit, not an inference from ambiguous footage — same class of
  authority as the many other "owner-confirmed" kit-mechanism rulings in this log (e.g. the
  `mint`/`prika` DUET ROTATION entry, 2026-07-23). Test-first: `scripts/tests/units/mint.test.ts` M1/M2
  rewritten RED-then-GREEN — pins firing only in odd-cast-index windows (frame-correlated to her own
  burst-cast sequence) at the full magnitude, discriminated against an ungated/raw-parser reading, a
  REVERSED (Singing-first) parity, and the toggle removed entirely (stuck at initial Dancing); M4
  updated to assert duet mode is unconditional (fires every rotation) vs solo's gated alternation, same
  peak value in both. **Board impact: ZERO on the currently graded board** — checked directly, not
  estimated: `mint`'s only graded comp (`PA MiKa`) pairs her with `prika`, which forces
  `duet (w/ Prika)` mode (unconditional, untouched by this change); solo mode currently has no graded
  real-fight anchor at all, so `scripts/regression.ts` + `scripts/control-regression.ts` are both
  snapshot-stable (verified, not assumed) and `verify.sh` is green end-to-end. Solo-mode board effect
  is real but currently unmeasured (validate-overrides solo-fixture total: 37.1M → 38.0M, ~+2.4%,
  consistent with the note's prior "a few % board-level" estimate) — will surface once a solo-mint
  comp is graded. — `src/skills/overrides/mint.json`, `scripts/tests/units/mint.test.ts`,
  `docs/engine-modeling-gaps.md` (primitive census refresh: `everyN`/`everyNOffset`/`resourceGate` now
  include `mint`)

- **(2026-08-03) `trina` S1 fullBurstEnd HoT recovery cadence ENACTED (5-tick heal stream);
  Full-Charge threshold heals stay unmodeled.** Her 2026-07-24 kit-autonomy gauntlet had flagged the
  fix conditionally ("if a recovery-event primitive lands, the fullBurstEnd 4.06%/s×5s HoT becomes a
  recovery emitter" — `scripts/kit-autonomy/manual-review/trina.md`); the `heal`/recovery-emitter
  primitive landed for `prika`'s own burst HoT (2026-07-25 gauntlet fix, `heal ticks:25
intervalSec:1`). This pass applies the same shape to `trina`: `skill1` now carries `fullBurstEnd` →
  `allies` → `heal ticks:5 intervalSec:1`. Structural/magnitude-free (both cadence numbers — "every 1
  sec for 5 sec" — are printed verbatim in kit prose; nothing about the cadence is measurable, only
  the HP amount is, and the engine's heal effect carries none), so no scientific-method pipeline
  applies (kit-completeness fix on an already-gauntlet-certified unit, not a new empirical claim on
  the damage model — the heal itself deals zero damage and sets no buff on Trina). Regression-neutral:
  neither of Trina's two snapshot comps (`elec battery`, `N3`) fields an on-recovery consumer
  (Crown-type), so board impact today is zero; pinned end-to-end on a dedicated
  liter/trina/crown/ada fixture in `scripts/tests/units/trina.test.ts` (T1b) proving the stream keeps
  Crown's "when recovery takes effect" consumer refreshed across the 5s window, discriminated against
  a collapsed `ticks:1` counterfactual and the heal removed entirely. The two Full-Charge
  threshold heals (2.03%/1.57%, gated on ally HP%<30/<50) remain wholly unmodeled — v1 has no HP pool
  to evaluate the gate. — `src/skills/overrides/trina.json`, `scripts/tests/units/trina.test.ts`

- **(2026-08-03) Mode-default owner ruling: `cinderella-crystal-wave` MG, `mint` solo — both already
  the shipped default, no code change; `mint`'s Singing/Dancing `resourceGate` is a SEPARATE,
  still-unbuilt mechanism from the already-landed `mint`/`prika` duet burst-order fix.** Closes the
  "modes owner-review" item from `docs/handoffs/closed/kit-parse-reconciliation-backlog.md`.
  `cinderella-crystal-wave`'s `modes` array is `["MG", "Snipe"]` and `mint`'s is `["solo", "duet (w/
Prika)"]` — the engine's mode-selection (`sim.ts` `selectedMode = prepared?.[idx]?.mode ??
skills.modes?.[0]`) already defaults to array-index 0 in both cases, and no graded comp
  (`scripts/regression.ts`/`scripts/experiment.ts`) overrides either default, so this ruling
  CONFIRMS the shipped behavior rather than changing it; `cinderella-crystal-wave`'s override note
  already documented the MG rationale ("matches the user's validated real solo-raid sample at core
  100%"), `mint`'s note now states the ruling explicitly too. Separately investigated the owner's
  hypothesis that `mint`'s dynamic Singing/Dancing `resourceGate` (spec'd but not built — see her
  override note's residual (1)) might already be solved by the landed `mint`/`prika` duet
  burst-order mechanism (`burstFirst` + `burstCdr -9999`, owner-confirmed 2026-07-23) — checked
  directly against both code paths, not by measurement: the duet mechanism answers "who wins the B2
  cast in a two-B2 team," a different question from "is mint in Singing or Dancing status on a given
  SOLO cast" (in duet mode she is forced into permanent Singing by prika's kit, so the toggle
  question doesn't even arise there) — the hypothesis does not hold. The dynamic
  `resourceGate` remains unbuilt, stays an owner decision (board-moving on her graded 1.015 comp),
  and needs a confirming recording on the even/odd cast-parity assumption before it can land. —
  `src/skills/overrides/mint.json`, `docs/handoffs/closed/kit-parse-reconciliation-backlog.md`

- **(2026-08-03, latest) B3 DPS CHART LOADS THE NEVER-LOADED B1 CONTROL — the fourth instance of the
  same defect.** Owner ruling: fix it, matching `build-bufferchart.ts` / `build-sustain.ts` /
  `build-b1b2dps.ts`. `scripts/build-dpschart.ts:148` loaded only `noop-b3-mg`'s override; the Solo
  framework's synthetic B1 control (`NOOP_B1`, `noop-b1-ar`) is not a roster entry, so its
  `fullBurstEnter → allies: burstCdr 7s` block was never read. Silent, not a crash: `NOOP_B1`'s
  character data ships empty skill prose by design (`skills: {skill1:'',skill2:'',burst:''}`), so
  `resolveSkills()` (`src/skills/index.ts:82-91`) takes its "genuinely empty kit, no override needed"
  fallback and returns zero blocks rather than erroring — the control silently ran with no CDR at
  all instead of failing loudly. Every Solo-framework cell (`matrix.ts:436`,
  `variant.solo ? [NOOP_B1, NOOP_B2, tested.slug, NOOP_B3] : ...`) was affected; every other named
  framework (standard/anis/anis-hc) seats a real B1 and was untouched. `scripts/regression.ts`'s own
  "Solo framework" check (§5) never caught this because it builds its overrides independently
  (loads every `team.slugs` member, including `noop-b1-ar`), so it was validating a configuration
  the shipped board did not run — the same blind spot the buffer-board ruling above already named
  for `scripts/tests/ranks/buffer.test.ts`.
  **Fix:** `scripts/build-dpschart.ts` now loads every `NOOP_CHARACTERS` override in a loop, the same
  pattern the three sibling boards use.
  **Blast radius, measured (before/after full `--force` rebuild, rows keyed on cellId + slug +
  variant):** 135 of 1152 Solo-framework rows move (0 of 4608 non-Solo rows move — exactly the
  Solo-only scope the code predicts). Mixed direction, not a uniform buff: `helm` (SR/Water, NOT
  `helm-aquamarine`) +11.0% (scope) to +20.6% (8/12) — a cooldown-bound unit that gains the most
  from an actually-firing 7s CDR;
  `snow-white-heavy-arms` −1.5% to −2.0% — a unit that loses ground once the no-op B3 also bursts
  more often and contests stage-3 casts harder. Most Solo rows (1017 of 1152) are byte-identical —
  units whose own kit already saturates the rotation independent of the control's CDR.
- **(2026-08-03) TYPED BUFFER BOARD: FLAVOR-GATED ALLY BUFFS NEED A CARRY THAT CAN ACTUALLY DEAL
  THAT FLAVOR — `hasTrueNormals` PRIMITIVE (True Damage), MOCK_TICK RIDER (Distributed/Sustained
  Damage), OWNER-PICKED OPTION 3.** Flora's burst grants allies "True Damage ▲ 42.39% for 10s"
  (`trueDamagePct`), but the typed board's synthetic carries (`src/ranks/synthetics.ts`, empty
  skill1/skill2/burst) never dealt True-flavored damage — confirmed on the pre-fix tree via
  `--explain flora --typed`: shipped 23.62%, removing the buff moved it by exactly Δ0.00, the buff
  was silently inert. Auditing the whole roster for the same shape (any ally-facing buff keyed to a
  damage FLAVOR the carries structurally cannot produce) found four more stats with real users in
  the buffer population: `sustainedDamagePct` (crust, rosanna-chic-ocean), `distributedDamagePct`
  (crust, delta-ninja-thief, elegg, mast-romantic-maid) — all confirmed Δ0.00 the same way.
  **True Damage fix:** added a static `hasTrueNormals` kit primitive (`CharacterSkills`, parallel to
  the existing `hasPierce`) — `src/skills/types.ts` → `src/skills/index.ts` →
  `src/engine/sim.ts` (`UnitState.hasTrueNormals`, OR'd into `trueFlavor` at both normal-attack
  `dealDamage` call sites alongside the existing swap-scoped `u.swap?.trueNormals`).
  `deriveCarrySpec` (`src/ranks/buffer.ts`) grants it to both typed-board carries whenever the
  tested unit has an ally-facing `trueDamagePct` buff. Flora's typed value: 23.62% → 47.78%.
  **Distributed/Sustained fix:** unlike True Damage, no new engine primitive was needed — both
  flavors are already fully expressible via ordinary `flatDamage`/`dot` blocks (`flavor:
'sustained'|'distributed'`), always targeting the enemy, always cast by the unit's OWN
  skill/burst kit line (verified across the whole roster — every real sustained user is a `dot`,
  every real distributed user a `flatDamage`; none is ally-facing). The gap is purely that the
  kit-less carries never fire one. Presented four options to the owner (fixed passive tick sized
  off the weapon modal; a burstCast-triggered rider matching the dominant real-kit shape but
  coupling the registered value to Full Burst count/rotation; a fixed-interval tick decoupled from
  rotation; or leave the gap undocumented-fixed and just caveat it, since the size is inherently an
  invented policy constant with no measured anchor). **Owner picked Option 3** (rejected 2 for the
  rotation-coupling, rejected 4 given the option to actually register the buff without a large
  invented number): `deriveCarrySpec` grants each carry a synthetic `MOCK_TICK` rider — one instant
  `flatDamage` hit every 10s tagged the needed flavor, sized at 5× the carry's own weapon's modal
  per-shot multiplier (`MODAL_WEAPON`), clearly commented in `buffer.ts` as a POLICY mock, not a
  measured value, chosen to be a minority contributor (~1–4 points out of each unit's 10–80% total,
  checked via `--explain <slug> --typed`) — enough surface for the flavor gate to multiply, not a
  claim about what a "generic carry" should deal. `sustained`/`distributed` are folded into
  `carryDpsSum`'s baseline-run memo key (unlike `pierce`/`trueFlavor`, pure tags with no damage of
  their own) because the rider is a real damage source that fires whether or not any buff
  multiplies it, so two units sharing every other key component but differing here would otherwise
  read each other's wrong baseline.
  Evidence: `--explain <slug> --typed` before/after for all six units (flora/crust/
  rosanna-chic-ocean/delta-ninja-thief/elegg/mast-romantic-maid); `scripts/tests/ranks/buffer.test.ts`
  pins both derivations + typed>generic for all six; `verify.sh` green, every graded-comp
  snapshot byte-identical — the change only ever fires on the typed board's synthetic carries.
  Branch `flora-typed-board-true-damage`, PR #75.
  **Follow-up (same day): the cross-family `/code-review` (kimi-code/k3) on this landing came back
  FIX-BEFORE-MERGE with one real FIX, one confirmed-safe FOLLOW-UP, and two NOTEs, all resolved.**
  (a) The roster sweep for `sustainedDamagePct`/`distributedDamagePct` was exhaustive, but the
  `trueDamagePct` half rode on Flora being the unit that surfaced the bug and was never
  independently re-swept — the reviewer's own roster walk found three more genuine, ungated,
  ally-facing `trueDamagePct` carriers in the buffer population: `frima` (B1), `takina` (B2), `ada`
  (B3 `buffer`, targets `burstCasters`). Verified each via `--explain <slug> --typed` (all show a
  real nonzero Δ post-fix) and added to `scripts/tests/ranks/buffer.test.ts`. The reviewer also
  flagged `emma-tactical-upgrade`/`eunhwa-tactical-upgrade` as apparently-affected — checked and
  confirmed these are NOT: both units' `trueDamagePct` lines are gated behind a duo `mode`/`teamHas`
  condition (`"AS Formation (w/ eunhwa-tactical-upgrade)"` / `teamHas.slugs: [emma-tactical-upgrade]`)
  the standalone buffer-board comp never satisfies, so they read `Δ0.00` before AND after this fix —
  an unrelated, pre-existing gap (their duo synergy is simply unmodeled on this board), not something
  this change touches. (b) The reviewer flagged the QUEUE.md entry this landing deleted
  ("BUFFER-BOARD METHODOLOGY CHAIN IS ON A PR BRANCH") as possibly dropping a live decision + a
  blast-radius record — checked: the blast-radius numbers (`burstgen` 4/244, `b1b2dps` 12/272) are
  already preserved verbatim in this file's own buffer-board-methodology entry above, and the
  "rewind main vs let the PR supersede" question was already settled by the CLAUDE.md ruling
  "worktree branches land via PR, never a local merge to main" — nothing was actually lost, the
  deletion was correct. (c) `carryDpsSum`'s per-carry weapon lookup (`team.chars[ci]`) relied on an
  unenforced parallel-array assumption between `carryIdxs` and `chars`; changed to read the weapon
  directly off the slug (`syntheticFor(team.slugs[slugIdx])`), removing the fragile pairing. (d) a
  stale exact test count in this entry was replaced with "green" (the count drifts with every
  landing and buys nothing pinned to a date).

- **(2026-08-03) SUSTAIN BOARD PORTS THE BUFFER BOARD'S STAGE-COVERAGE SHAPE, AND LOADS THE
  NEVER-LOADED B1 CONTROL.** Owner ruling on the two linked findings queued after the buffer-board
  methodology PR: (1) the tested unit should measure throughput in a team that covers its own burst
  stage (a 40s/60s healer no longer holds up its team's rotation), not throughput at its bare natural
  cadence; (2) the sustain board should load `noop-b1-ar` like its sibling boards, normalizing for the
  standard 7s team-CDR enabler.
  **(1) `src/ranks/sustain.ts` `sustainTeam()`** now seats a stage-matched spare behind the tested
  unit for burst I/II comps (a same-stage profile partner stands in for the spare when one is seated —
  prika/mint and anchor-innocent-maid/mast-romantic-maid are both same-stage pairs already, so those
  rows are unaffected by this alone), mirroring `src/ranks/buffer.ts`'s lead-own-stage rule (a tested
  unit placed behind the no-op of its own stage loses every contest for that stage and stops
  bursting). B3-tested comps already had this shape (`slug, NOOP_B3`) and are untouched. **Isolated
  from the control fix**, this reproduces the pre-landing probe exactly: `blanc` +59.9% (the clear
  buffer-board-pattern case — her 60s B2 no longer gates the team), `tia` −29.9%, `soline-frost-ticket`
  −16.7%, `prika` (plain row) −13.3%, `noise` −20.0%; `alice-wonderland-bunny`, `anchor-innocent-maid`,
  `aria`, `bay`, `biscuit`, `delta-ninja-thief`, `flora`, `rapunzel` byte-identical, as the probe found.
  Most movers are _negative_ — the spare competes for the stage cast and the tested unit bursts less —
  so this is a real behavior change with mixed direction, not a uniform boost to long-cooldown units.
  **(2) `scripts/build-sustain.ts`** now loads every `NOOP_CHARACTERS` override in a loop (the same
  pattern `build-bufferchart.ts` / `build-b1b2dps.ts` use) instead of `noop-b3-mg` alone, so the no-op
  B1's 7s team burst-cooldown reduction is applied — sustain values HP restored/shielded, not damage,
  but a faster team rotation still changes burst-timed heal/shield windows.
  **Combined blast radius** (both changes together, before/after by slug + profile identity, the 46
  rows the board LISTS — nonzero `totalHp` — out of the 51-slug tag-driven candidate population):
  17 of 46 byte-identical; largest movers `blanc` +79.3%, `quiry` +33.3%,
  `snow-crane` +32.5%, `prika` (plain row) +30.7% — her `with-mint` row is unaffected (0.0%; the
  permanent duet HoT/potency window does not depend on burst cadence); `tia` −28.6%,
  `soline-frost-ticket` −16.7%, `mint` −5.6% the largest negative movers besides tia/soline.
  `scripts/tests/ranks/sustain.test.ts`
  (band-pinned, not exact game-truth) passed unchanged; `scripts/verify.sh` green — sustain is not
  part of the graded-comp regression snapshot, so this carries no damage-model risk.
  **Follow-up (same day): the cross-family `/code-review` (kimi-code/k3) on this landing came back
  CLEAN with two real FOLLOW-UPs, both closed rather than queued.** (a) `sustainTeam()` now throws if
  a seated profile partner's burst stage differs from the tested unit's, or if a profile ever lists
  more than one partner — the `partners[0] ?? NOOP_Bn` fallback was previously correct only by
  coincidence (both `SUSTAIN_PROFILES` entries happen to be same-stage, single-partner). (b)
  `scripts/tests/ranks/sustain.test.ts` now loads every `NOOP_CHARACTERS` override, mirroring
  `build-bufferchart.ts`/`build-sustain.ts` (previously it ran with NO no-op overrides at all, so the
  `noop-b1-ar` CDR path this ruling added had zero test coverage). Loading the CDR override moved
  `prika`'s plain-row band (51.3M/1709% pinned range <2000% → measured 66999130/2233.2%, matching the
  combined-blast-radius figure above exactly); rebanded to <3000% rather than re-deriving a tighter
  number, since the pin exists to catch regressions, not to re-litigate this ruling's own effect.

- **(2026-08-03, latest) EVERY BUFFER-BOARD TEAM FIELDS EXACTLY ONE BURST-COOLDOWN ENABLER, AND THE
  CONTROL'S REDUCTION FIRES ON `fullBurstEnter`.** Owner ruling: an optimal team always carries one
  CDR unit and almost never two, so the board should model that case. The tested unit takes the
  enabler role whenever its kit reduces ALLY cooldowns; the no-op B1 keeps it otherwise. The BASELINE
  always keeps the control's — the tested unit is not in it, so standing the control down there would
  field a team with no enabler at all and measure every CDR unit against a rotation nobody runs. A
  cooldown enabler's number therefore reads as what it adds over the standard 7s enabler it replaces.
  **Two things this exposed first.** (1) `scripts/build-bufferchart.ts` loaded overrides for roster
  slugs only, and the synthetic controls are not roster entries, so this board had NEVER applied the
  7s its own methodology doc described — `src/skills/overrides/noop-b1-ar.json` was simply never read.
  Two siblings load it (`build-burstgen.ts:48`, `build-b1b2dps.ts:56`), added `c044fcbd` 2026-07-27,
  the day after this board was written (`91f53ea9`), never backported. **`build-sustain.ts` does NOT
  and never has** — `git log -S noop-b1-ar -- scripts/build-sustain.ts` returns nothing across all
  history, and its `:46` loads the B3 control only — while `src/ranks/sustain.ts:111,113` seats
  `NOOP_B1` in two of its three comp shapes. The sustain board is therefore a SECOND live instance of
  this defect, not collateral of the fix here: it is why that board is byte-identical to the trigger
  change below (a control it never loads cannot move), and it is queued for its own owner ruling
  rather than fixed in passing.
  `scripts/tests/ranks/buffer.test.ts` had the identical gap, so every ranks test was validating a
  configuration the board does not run. (2) `suppliesTeamCdr` must walk ARBITRARY nesting: liter,
  volume, dolla and helm-aquamarine bury their `burstCdr` inside an `escalating` effect's `steps`, so
  a shallow "block.effects has a burstCdr" scan drops the board's most important enabler. Self-only
  carriers (mint, prika, tia) do not qualify — the line the burst-CDR board already draws.
  **THE CONTROL'S TRIGGER MOVED, and that is the load-bearing half.** Its 7s fired on its own
  `burstCast`, so its contribution depended on WINNING the stage-1 cast — which a tested B1 shares.
  Measured, isolated: `rapunzel` at her real 60s cooldown took 3 casts, left the control 8, and the
  team reached **9** Full Bursts; forced to 20s she took 6, left the control 6, and the team reached
  **8**. A unit bursting more often made its own team slower, inverting what the board measures. The
  reduction now fires on `fullBurstEnter` from `skill1` — the shape every real enabler uses (liter,
  sakura, soline-frost-ticket are all `fullBurstEnter` → `allies`) — so the control contributes the
  same 7s per Full Burst whoever holds the stage. `scripts/probe/buffer-rotation-audit.ts` then
  reports no unit whose Full Burst count depends on its own cooldown, the property pinned in
  `scripts/tests/ranks/buffer.test.ts`.
  **Blast radius, accepted by the owner in advance** (`noop-b1-ar.json` is shared; before/after
  artifacts diffed on row identity = slug + profile + template): **burstgen** 4 of 244 rows move,
  largest `rosanna` 3.9% (rank 90→102); **b1b2dps** 12 of 272, largest `red-hood` 11.3% (rank 38→31);
  **burstcdr** and **sustain** byte-identical — sustain necessarily so, since it never loads the
  control being changed (see above). Buffer board, cumulative with the standard-team and
  focus rulings above: `prika` 17.4 → 45.9 (rank 32→14), `anchor-innocent-maid` 8.3 → 29.7,
  `chime` 126.3 → 142.7, `alice-wonderland-bunny` 0 → 15.5; `anis-star` 59.4 → 25.1 (rank 10→28).
  Negative rows 5 → 12 — expected under this model, since an enabler weaker than the standard 7s now
  reads below its baseline, and the leaderboard trims them.
  **A formation gate makes 12 enablers, not 14 (cross-family review round 4, BLOCKER).** The
  classifier counted any ally-facing `burstCdr`, ignoring the block's `formation` gate. The engine
  activates such a block only when `(formation === 'hasB1') === teamHasB1` (`src/engine/sim.ts:737`),
  and the standard team ALWAYS seats a B1 — so a `noB1` block is permanently inert here.
  `anis-star` and `rapi-red-hood` carry their ONLY ally-facing reduction behind exactly that gate, so
  the board stood the control down for them and fielded teams with NO enabler at all, the one thing
  this ruling forbids. Both now keep the control: `anis-star` 25.1 → 43.0 (rank 29→15),
  `rapi-red-hood` −2.7 → 0.0. No other unit moves.
  **Found by the cross-family review (kimi-code/k3, FIX-BEFORE-MERGE), not by me:** the comp-profile
  path replaced each no-op filler's ENTIRE override with the profile's synthetic kit, which was
  harmless only while this board loaded no control overrides at all. Once it loaded them, every
  profiled row lost the team's only enabler — `crown` `with-healer` ran **9** Full Bursts beside its
  own plain row at **10**, and `naga` `with-shielder` likewise — so the two profiled rows were ranked
  beside plain rows measured on a faster rotation, and the one-enabler rule this entry states was
  false for exactly those rows. The loop now MERGES: it keeps the filler's own override (the B1's
  CDR, the B3's mock burst) and appends the profile's blocks, starting from any `extraOverrides`
  entry already written so the enabler stand-down is not undone. `crown` `with-healer` 97.7 → 105.2,
  `naga` `with-shielder` 22.0 → 25.5, both now 10 v 10.
  **`blanc` re-measured on this methodology.** Her un-exclusion (entry below) shipped from a
  PRE-standard-team snapshot, so the figures recorded there — +7.88% plain, +20.93% `w/ Rouge` —
  were taken on a board with no control CDR loaded and no one-enabler rule. That entry stands as
  written (this log is append-only); on the merged methodology she reads **+9.7% plain** and
  **+25.2% `w/ Rouge`**, both at Full Burst parity with their baselines. Her duo row was the one
  place the non-B2-partner shape could have bitten — it does not, because her self-CDR and the
  control enabler carry the rotation.
  **A caution for whoever reads a diff next:** two of my own before/after comparisons were wrong
  before this one was right. Keying rows on `slug + last field` mispaired a unit that has both a
  plain and a profiled row (it reported `anis-star` +311% on b1b2dps, a phantom), and keying on
  everything after the value silently DROPPED changed rows as unmatched (it reported burstgen as
  0-of-244). Row identity is slug + profile (+ template); everything else in the tuple is output.

- **(2026-08-03) THE BUFFER BOARD'S CAMERA FOCUS IS THE SPARE NO-OP B2 (SR), AND A TESTED
  B3'S BURST IS SUPPRESSED OUTRIGHT.** Focus grants a charge weapon ×2.5 burst gauge, so whoever
  holds it sets the pace of the team's whole rotation. It sat on the second carry
  (`carryDpsSum` `focusSlug: team.slugs[team.carryIdxs[1]]`) — whose WEAPON the typed board rewrites
  per tested unit: `carry-rl` banks the ×2.5 (140 base + 250 full charge) while `carry-sg` cannot
  take it at all (200, no full-charge bonus), so the team's gauge, and its Full Burst count, moved
  with the kit under test. **Owner ruling 2026-08-03: focus the no-op B2 (SR) so burst generation is
  standardized.** It is now the spare stage slot (`assemble` returns `focusSlot`), which is
  `noop-b2-sr` on every plain row, generic and typed, tested side and baseline alike. On a duo row
  the partner occupies that slot and holds focus — symmetric, since the duo baseline seats the
  partner there too, but it is the one row shape where focus is not the standard SR.
  **Consequence, and the second half of this ruling:** the standardized focus makes the team's
  rotation faster, and that broke the "a tested B3 never bursts" rule — rightmost placement only wins
  the stage-3 cast for the carries while either is off cooldown, and they are 40s units, so a fast
  enough rotation reaches a stage 3 where only the tested unit is ready. `ada` took a cast. The
  tested B3's burst slot is therefore emptied outright (`burstOffSlug`, applied through the
  `extraOverrides` channel `carryDpsSum` already uses) rather than left to rotation luck —
  byte-identical for the 16 B3 buffers that never cast one. **Pinned by injection, not tautology:**
  giving `ada` a 500% team-ATK burst buff moves her value by exactly 0.000 points.
  **Residual, disclosed:** a tested B3 can still OCCUPY one stage-3 turn it would not have taken
  (`burstCasts` is a rotation counter, not an effect counter), displacing one carry burst. Removing
  that needs a per-unit burst-suppression option in `src/engine/**`, a protected path — not taken
  without a separate owner call. It costs nothing on the board as it stands: after the one-enabler
  ruling below changed the rotation, all 17 tested B3 buffers read 0 burst casts, `ada` included.
  **Measured effect, focus change only** (`npx tsx scripts/build-bufferchart.ts` before/after on the
  same HEAD): 71 of 83 generic rows move, all modestly — chime +8.4, little-mermaid +7.7 (rank
  28→23), mint +6.2, crown +5.1, liter +4.2; drops avistar −2.8, ada −1.3 (the suppression),
  mint `w/ Prika` −1.2. Typed: arcana +9.6, tove +8.4, anis-star −7.8, mint −6.8. Negative rows
  6 → 2 generic and 4 → 2 typed. No rank upheaval — the largest move is 5 places.
  **Also landed here:** the long-cooldown pin was rewritten to ISOLATE its variable. It asserted "no
  unit with a >20s cooldown lands below its baseline Full Burst count", which uses cooldown as a
  proxy and fails on units this shape never claimed to fix — `rosanna` reads 7 v 8 at 40s and
  reads 7 v 8, byte-identical, at a forced 20s, so her shortfall is gauge, not rotation. The pin is
  now: forcing a unit's cooldown to the no-op's 20s must not change its Full Burst count. verify.sh
  green.

- **(2026-08-03) THE BUFFER BOARD'S STANDARD TEAM CARRIES A SPARE NO-OP OF THE TESTED
  UNIT'S STAGE, SO A LONG BURST COOLDOWN NO LONGER COSTS THE TEAM FULL BURSTS.** The board was built
  without the design requirement it was supposed to have: the tested unit displaced the only no-op of
  its stage, so a 40s Burst-2 landed **5** Full Bursts against the baseline's **9** (3 for the 60s
  blanc) and was docked for four Full Bursts before a single buff was counted — roughly 8% of team
  damage. Worse, a >20s Burst-1 was "compensated" by swapping the no-op B2 for a second no-op B1,
  which left the team with no Burst-2 at all: **0 Full Bursts, both sides, all 180s** for 8 units,
  killing every Full-Burst-gated line (moran's `fullBurstEnter` trigger among them). Not a
  regression — `assemble`'s Burst-2 branch was unchanged since the board's first commit
  (`91f53ea9`); the pairing existed only on the B1/B2 DPS board (`B2_TEAM`, pinned at
  `scripts/tests/ranks/b1b2dps.test.ts:104`) and was never carried over. **Owner spec 2026-08-03:**
  the standard team is no-op B1 (20s, 7s CDR) + two no-op B2 (20s) + the two carries (B3/40s, MG and
  RL), with the tested unit taking the second B2's slot.
  **Two things the spec's slot numbering does not say, both settled by measurement:**
  (1) _The tested unit must LEAD its own stage._ Burst-stage contests are won by slot order, so a
  tested unit left sitting behind the same-stage no-op simply stops bursting — a tested B2 in the
  literal slot 3 casts **1** burst in 180s instead of 5 (flora 24.05% → 4.51%, crown 71.58% →
  41.81%) and a tested B1 behind the no-op B1 casts **none** (liter 26.53% → **1.13%**). Owner
  confirmed the wording was not meant literally for team order. Same five units, spare behind.
  (2) _The baseline must be STAGE-MATCHED, not one fixed team._ Standing every unit against the plain
  standard team charges each Burst-1 for trading a no-op B2 away: measured at up to −2 Full Bursts
  and −34 points (anis-star 59.4 → 25.7), i.e. the same rotation distortion aimed at a different
  stage. The baseline therefore puts a no-op of the tested unit's own stage back in its slot.
  **Measured effect** (`npx tsx scripts/probe/buffer-rotation-audit.ts`): 61 of 78 units now match
  their baseline's Full Burst count exactly, and NO unit with a >20s cooldown lands below it. Board
  movement, generic: prika 17.4 → 42.4 (rank 32→13), anchor-innocent-maid 8.3 → 26.2 (52→23),
  mast-romantic-maid 61.0 → 77.3, alice-wonderland-bunny 0 → 13.8, arcana −0.4 → 13.0,
  delta-ninja-thief 3.1 → 15.5, moran 13.9 → 25.1, flora 14.8 → 24.0 (37→26), liter 26.5 → 35.3,
  biscuit −7.7 → +1.0. The largest drop is anis-star 59.4 → 30.6: she is an RL whose gauge over the
  fight is below the AR no-op she now sits beside (7 Full Bursts vs the baseline's 8), which the
  methodology counts on purpose — rotation value cuts both ways. Negative rows 5 → 6.
  **Residual, accepted:** units still land above or below their baseline's Full Burst count for
  their OWN cooldown reduction or gauge (little-mermaid +3, liter/moran +2, anis-star/frima/kurumi
  −1). That is unit-attributable value and the board should count it; what is gone is the structural
  toll for merely having a long cooldown. Pinned in `scripts/tests/ranks/buffer.test.ts` (team shape,
  stage-matched baseline, and "no long-cooldown unit lands below its baseline" over the whole
  population). verify.sh green.

- **(2026-08-03) BUFFER BOARD: `blanc` UN-EXCLUDED — both her rows ship, and
  `EXCLUDED_BUFFER_SLUGS` is now EMPTY.** Blanc was the set's sole member, excluded on the stated
  grounds that her kit's net effect is to REDUCE team damage in the standard comp and so produce a
  misleadingly negative % increase. **That rationale no longer describes her.** The buffer board's
  comp reshape — the standard team with a spare no-op per stage (`bede1524`) plus camera focus moved
  to the spare no-op B2 (`11c047aa`) — removed the rotation distortion the negative reading came
  from: a tested unit's own burst cooldown no longer costs its team Full Bursts, because the spare
  no-op covers its stage. Blanc now reads **+7.88% plain (9 Full Bursts v 9 baseline)** and **+20.93%
  `w/ Rouge` (8 v 8)**, identical on the generic and typed boards (no line of her kit is weapon- or
  element-typed). **Owner ruling: ship BOTH rows** — the plain row (her same-squad CDR gate shut, 3
  burst casts in 180 s) and the `w/ Rouge` duo row (gate open via the synthetic no-op Rouge B1, 8
  casts). **Landed:** `EXCLUDED_BUFFER_SLUGS = new Set<string>()` in `src/ranks/buffer.ts`. The
  mechanism is deliberately KEPT, not deleted — it is the policy hook for a kit that genuinely reads
  net-negative after some future comp change, and `scripts/build-bufferchart.ts` still filters through
  it. The board population grows 84 → 85 units, 89 → 91 generic rows. **Evidence / how to re-check:**
  `npx tsx scripts/probe/buffer-rotation-audit.ts --excluded` (committed; prints each entry's live
  value against the criterion, and now reports the empty set); `scripts/tests/ranks/buffer.test.ts`
  already pinned both Blanc rows through `bufferValueFor`/`rankBuffers` directly, so they were
  computed and asserted the whole time the population filter was hiding them — those pins pass
  unchanged. **Tier:** owner ruling + deterministic sim measurement, no game footage involved (a
  board-population policy, not a damage-model value).

- **(2026-08-03) The B1/B2 DPS board's core exposure stays a TWO-WAY switch — no Core 50 row.** The
  Burst-3 DPS chart carries three exposures (No Core / Core 50 / Core 100, `CORES[].exposure`,
  `src/dpschart/matrix.ts:510`); the B1/B2 board resolves its core axis as Core 100 or nothing
  (`coreStr === 'c100' ? 1 : 0`, `src/ranks/b1b2dps.ts:291`), so a chart Core 50 cell has no
  counterpart to be read against. Adding one is cheap — a ternary plus a cell id — and was
  considered for symmetry. **Owner ruling: not wanted; the two-way switch is deliberate.** The
  asymmetry is documented as a fact of the board in `docs/data/rank-boards.md` ("What the B1/B2
  board and the B3 DPS chart do and don't share") rather than treated as a gap. The related and
  larger question — an investment axis on the B1/B2 board — stays declined for the same reason: the
  board is Scope-Lock-only by design, and the comparability rule that follows from it (a B1/B2
  number is comparable only to a DPS-chart Scope Lock cell) is documented instead of engineered away.

- **(2026-08-03) `flora`'s SKILL 2 IS NOT HP-GATED-DEAD — IT SELF-PROCS OFF HER OWN SKILL 1,
  EVERY BURST ROTATION.** The shipped model carried `"skill2": []` and called all three S2 lines
  out-of-domain ("gated on an HP threshold the sim cannot represent … never fires", ⚑ engine-core,
  filed beside liter's cover-HP NO-OP). That premise is WRONG, and the mechanism is entirely inside
  Flora's own kit — no HP pool, no boss damage and no second healer are involved:
  1. On **entering Burst Stage 2**, S1 grants Peace-of-Mind allies `Max HP ▲ 15.01% of the skill
user's max HP (WITHOUT restoring HP) for 2 sec`. Current HP does not rise with max HP, so each
     affected ally's HP **fraction** drops that instant to 1/1.1501 = **86.95%**.
  2. That clears S2-1's "when the HP of an adjacent ally drops to **90% or below**" by ~3 percentage
     points ⇒ the 10.22%-max-HP shield lands **at Burst Stage 2 entry**.
  3. The shield landing on Flora satisfies S2-3's "when a shield is placed in front of this unit" ⇒
     ATK ▲45.12% of the skill user's ATK, **same frame**.
  4. **2 sec later** the Max HP grant expires, the allies' max HP returns to normal and they are
     therefore at max HP ⇒ S2-2's "when either adjacent ally reaches max HP" ⇒ True Damage ▲30.97%,
     at **entry + 2 s**.
     **Ruling: `stageEnter{stage:2}` is a DERIVED-DETERMINISTIC PROXY for the HP-threshold clause**, not
     a re-keying to a different kit line. The HP transition it stands in for is _caused by Flora's own
     S1 on exactly that frame_, in every team, every rotation — the trigger is deterministic in the
     sim's own domain even though the clause is written in HP. It is a FLOOR on the real line's uptime,
     not a ceiling: a boss that actually damages allies would re-open "HP ≤ 90%" between rotations, and
     that additional firing is still unmodeled.
     **Target clauses are NOT uniform across the slot** and were checked line by line against
     `data/characters.json`: S2-1 and S2-2 say "all allies"; S2-3 says "all allies **in the Peace of
     Mind state**" = S1's `selfAndAdjacent` set, so it does not reach the whole team.
     **This forced a new engine primitive**, `Block.delaySec` — step 4 needs the effects of a block to
     land a fixed time after its trigger, and the only delay in the schema was `flatDamage.delaySec`
     (flight time on ONE damage effect). The offset is load-bearing, not cosmetic: Full Burst opens
     ~0.87 s after Burst Stage 2 entry (30f B2→B3 + 22f B3→FB), so a 10-sec buff starting at +0 s vs
     +2 s covers a materially different slice of the Full Burst window. Contract: gates and the `everyN`
     counter evaluate at TRIGGER time, targets and values resolve at LANDING, absent/0 is a strict
     no-op. Pinned by `scripts/tests/engine/block-delay.test.ts` (6 assertions, all bite-verified
     against two deliberate engine breaks).
     **Evidence tier: KIT-TEXT (blablalink prose SSOT) + owner ruling**, no measurement claimed. The
     datamined `role.skillDetails` tables corroborate 90% / 10.22 / 30.97 / 10.45 / 42.39, but are a
     PARTIAL capture for this unit — they omit S1's Burst-Stage-2 Max HP line, S2's shield→ATK line and
     the burst's ATK ▲85.86% line outright, and give the S2 True Damage duration as **5 sec** where the
     prose says 10 sec (open-questions U37).
     **Board/regression impact: ZERO.** `flora` appears in no graded comp and no snapshot entry, so
     `scripts/regression.ts` is stable on every entry (no measured-truth full-burst-count assert moved)
     and `scripts/board-read.ts` is byte-identical before/after — median 0.93–0.99 across 45 units, 142
     datapoints, unchanged. The change is a faithfulness landing with no fit evidence behind it; her
     real contribution is now materially larger in-sim and that is unvalidated against footage.
     Pinned by `scripts/tests/units/flora.test.ts` F5–F8 (every assertion bite-verified).

- **(2026-08-03) OVERLOAD LINES: ONE BASIS EVERYWHERE — EXHAUSTIVE RANKING AT T11. Greedy
  search and the max-roll basis are both DELETED.** Three separate searches used to pick a unit's
  four free overload lines (the lines beyond the 4× Elemental DMG + 4× ATK floor), on two different
  tiers, and they disagreed with each other on 28 of 73 units. Owner ruling: exhaustive, at T11, for
  everything.
  **The two defects, both measured** (`npx tsx scripts/ol-search-compare.ts`, committed):
  1. **TIER** — `scripts/build-ol-optimal.ts` optimized at MAX ROLL while every consumer applies the
     picks at T11, and `src/dpschart/matrix.ts` stamped no `value` at all, so the chart applied max
     roll too. Not cosmetic: several candidates are THRESHOLD stats whose winner moves with the tier.
  2. **SEARCH** — the greedy marginal-gain optimizer (`src/bestol.ts`) adds one best line at a time,
     so it cannot see a stat whose FIRST line is worthless and whose third or fourth wins outright.
     Charge Speed buys nothing until it crosses a frame boundary; Hit Rate's core-rate curve is
     convex. At T11 it left a mean 1.35% / median 0.00% / **max 31.19%** of achievable gain unclaimed
     across 73 units. `asuka-wille` is the clean case: one Max Ammo line gains 1.41% and LOSES step 1
     to Crit Rate's 1.72%, so greedy took 2× Crit DMG + 2× Crit Rate (8.66%) over the exhaustive
     winner 3× Max Ammo + 1× Crit Rate (57.91%) — row 7 of its own ranking. No threshold tweak
     reaches this; the failure is structural. (The 1.41% is greedy's own first-step figure, taken
     against the MAX-ROLL floor it searched on. Re-measured on the landed T11 basis the same line
     reads **1.29%**, which is what `ol-search-compare.ts --only asuka-wille` reproduces today —
     the ordering, and so the conclusion, is identical.)
     **Landed:** `src/bestol.ts` DELETED (greedy) and `src/olcalc.ts` DELETED (a third greedy searcher,
     unimported anywhere, still carrying the all-weapons Hit Rate exclusion `src/olconfigs.ts` fixed on
     2026-08-02 — a known-wrong model parked beside its replacement). `src/dpschart/matrix.ts` gains
     `OL_TIER = 11` + `atOlTier()`, the single knob every invested tier now stamps; `run.ts`,
     `build-ol-optimal.ts`, `build-unit-pages.ts` and `src/cli.ts --best-ol` all call
     `rankFreeLineConfigs`. Exhaustive is also CHEAPER: 15 sims per unit (MG/Pistol), 35 (AR/SMG/SG) or
     70 (RL/SR) against greedy's
     ~28, because the pool is only 3 candidate types.
     **Result:** `data/ol-optimal.json` regenerated — 28/73 picks changed, and the artifact is now
     optimal on **73/73** units (mean gap 0.00%, max 0.00%, against greedy's mean 1.35% / max 31.19%).
     It is the same computation `build-unit-pages.ts` runs, so the two artifacts can no longer disagree.
     **Accepted consequence — the DPS chart's invested tiers move, and substantially.** Applying T11
     instead of max roll makes every invested cell weaker: per-unit DPS mean **−8.85%** at 8/12 (range
     −15.81% … −1.71%) and **−11.41%** at 12/12 (−27.11% … **+20.39%**, the positives being units the
     exhaustive search fixes), with **1108 of 1830** rank positions moving at 12/12 and 514 at 8/12.
     The 8/12 tier has no optimizer, so its shift is the tier change alone — a clean decomposition of
     the two effects. This is a basis change, not an accuracy fix: the chart previously claimed max-roll
     numbers and now claims T11 numbers. Revert is one line (`OL_TIER = 15`) if the chart is ever meant
     to be aspirational-max.
     **NOT touched:** the `scope` investment tier carries no overload lines at all, so the scope-lock
     validation basis is **byte-identical** (measured: 0.00% delta across all 30 scope cells, 0/1830
     rank positions moved) and the regression gate — both cells `invest: 'scope'` — is unaffected.
     `data/unit-pages.json` is likewise unchanged: its Solo cell's controls are the synthetic no-ops,
     whose lines cannot reach the carry. verify.sh green, 2805 tests passing.

- **(2026-08-02) THE SYNTHETIC NO-OP CONTROLS USE LOW BASE ATK (100), AND IT IS THE SHARED
  DEFAULT.** The controls in `src/dpschart/noop.ts` carried base ATK 30,000 while real units sit near
  400–500, so a control ALWAYS won an `alliesTopAtk` selector: a king-maker buff on the unit under
  test was spent on scaffolding that deals no damage and is never ranked. The B1/B2 DPS board had
  already worked around it with a private low-ATK fork (`B1B2_NOOP_CHARACTERS`, ATK 100), which split
  the no-op registry in two and let `src/ranks/b1b2dps.ts` diverge from the resolution chain every
  other board uses. **Owner ruling 2026-08-02: make the low-ATK basis standard.** The fork is deleted
  (one registry) and `b1b2dps.ts` now resolves real unit → `syntheticFor` → `NOOP_CHARACTERS` like
  buffer/sustain/burstgen. Rationale: a control must never be the SUBJECT of a buff — that is what
  makes it a control. `alliesLowestAtk` still resolves to a control, which is correct for the same
  reason: the lowest-ATK ally genuinely is the inert one.
  **Measured effect** (`npx tsx scripts/noop-basis-ab.ts`, the committed probe — deterministic, all 12
  ally-ATK-selector carriers, Solo framework neutral/c100/scope): tested-unit DPS rises for four —
  `maxwell` 301,075 → 386,148 (+28.3%), `alice` 490,328 → 579,816 (+18.3%), `n102` 181,407 → 198,881
  (+9.6%), `naga` 223,145 → 224,918 (+0.8%) — and is byte-identical for the other eight. Those four
  are the fix working: with only no-ops for company a self-includable highest-ATK buff now resolves to
  the tested unit instead of a control. Regression snapshots all stable, verify.sh green.
  **Known side effect, accepted:** the no-op B3's OWN damage scales with the same ATK and fell ~200×
  (5.09e9 → 2.52e7). It never enters a published number (`src/dpschart/run.ts:106` ranks
  `r.units[testedIndex].dps` alone) and the controls give zero buffs, so it cannot reach the tested
  unit except through the very selectors this ruling is about; `regression.ts` asserts only that it is

  > 0, which still holds. It does retire the older "contributes realistic B3-stage damage" intent —
  > reopen only if a future board wants to rank team totals.

- **(2026-08-02) CHIME / AVISTAR KING-MAKER TARGETING EXCLUDES SELF.** Both units use an
  `alliesTopAtk count:1` selector for their designated carry ("the king" / "favorite pop star").
  The engine ranks on static ATK (base stats + class gear). At scope lock (3★/core 7, Base-5 gear)
  that gives Chime 100,317 > Crown 80,267 and Avistar 100,317 > Anis: Star 80,267 (measured via
  the test harness; the class-only line from `src/stats.ts` is 98,367 > 78,707). Without
  `excludeSelf`, the sim would resolve the selector to Chime/Avistar themselves in those control
  rows. `excludeSelf` is therefore a design-intent judgment that the king/favorite buff is meant
  for an ally other than the caster, not a literal reading of the kit text — whether the kit's
  "ally" wording strictly excludes the caster is unverified (⚑, recipe: focus video of the king/
  pop-star icon, or the datamined target flag for word_group 10091 / 10103). **Owner approval
  recorded 2026-08-02:** the project owner explicitly directed landing this design-intent
  targeting so the B1/B2 partner rows resolve to the intended carry; the ⚑ recipe remains open
  for a literal kit-text reading. The override change is inert for the four existing rank boards,
  the B3-only DPS chart, and the pinned regression comps (no Chime/Avistar entries), but it DOES
  reach the interactive web sim / teamcalc: any user team where Chime or Avistar is the
  highest-static-ATK member now buffs a different ally than a literal no-excludeSelf reading
  would. The B1/B2 board uses dedicated low-ATK no-op variants
  (`src/dpschart/noop.ts B1B2_NOOP_CHARACTERS`) so the partner rows resolve to the intended
  carry. **Evidence:** `data/characters.json`; `data/level-multiplier.json`; `src/stats.ts`;
  `scripts/tests/units/chime.test.ts` and `scripts/tests/units/avistar.test.ts` pin the
  excludeSelf rule; `scripts/tests/ranks/b1b2dps.test.ts` pins Crown+Chime > Crown default.

- **(2026-08-02, latest) SQUAD PRIMITIVE LANDED — "an ally from the same squad" kit gates resolve
  against a curated squad map; Blanc's squad is Noir+Rouge ONLY (the bunny/maid units are a
  DIFFERENT squad).** New block-gate facet `teamHas.sameSquad` (`src/skills/types.ts`; evaluated at
  sim setup in `sim.ts`'s block filter alongside the other `teamHas` facets): the block is active
  only when SOME OTHER ally shares the owner's squad per `src/data/squads.ts` — a hand-curated
  slug→squad map, because characters.json carries no squad axis (the blablalink `role_meta`
  snapshot has no squad field). The gate FAILS CLOSED: an owner with no curated squad never
  satisfies it, and `validate-overrides.ts` rejects a `sameSquad` authoring on an unmapped owner
  (a dead block can't ship silently). **Owner-confirmed membership (2026-08-02):** Blanc `blanc` /
  Noir `noir` / Rouge `rouge` form one squad — extending the 2026-07-20 Noir ruling (same-squad
  burst gate "satisfied by blanc or rouge") to its full extension, and CORRECTING the common
  misread that the bunny/maid units (bunny, milk, zwei, guilty, quency, soda, the maid costumes)
  share it — they do NOT. M.M.R. = Tia `tia` / Naga `naga` / Marciana `marciana` (owner-stated;
  seeded in the map, no gate consumes it yet). **Enacted:** `blanc`'s S2 burst-CDR (40.76s on
  fullBurstEnd) is now gated on `sameSquad` — inert in comps without noir/rouge, active with one;
  the "still on the battlefield" clause is scope-trivial (nobody dies at scope lock), so the gate
  is composition-only. The buffer-rank workaround `blancNoCdrOverride` (`src/ranks/buffer.ts`,
  which stripped the CDR from Blanc's plain row) is REMOVED — the plain row is now naturally inert
  and the profiled row naturally active. **Consequent profile change:** Blanc's buffer-board duo
  profile DEFINITION changes from the synthetic `w/ Bunny` B2 to `w/ Rouge` (`noop-rouge-b1`) — the
  old synthetic Bunny partner existed to hold the gate open under the same misread; the partner is
  now a presence-only no-op Rouge B1 (zeroed kit, rouge's cadence) whose curated squad membership
  opens the gate faithfully. ~~Blanc remains in `EXCLUDED_BUFFER_SLUGS` in
  `src/ranks/buffer.ts`, so neither the plain row nor the `w/ Rouge` profile is emitted to the
  published buffer board; they are exercised only by `scripts/tests/ranks/buffer.test.ts` and the
  Blanc unit tests.~~ **SUPERSEDED (2026-08-03) — disregard this sentence; see the buffer-population
  entry below. Both Blanc rows now ship.** `scripts/tests/ranks/buffer.test.ts`'s pin (profiled casts/value > plain) holds
  unchanged. **Evidence:** `scripts/tests/units/blanc.test.ts` B3 group (gate inert in the liter
  comp == CDR-removed schedule; active ≥5 casts with rouge; the ungated counterfactual over-fires —
  discriminates both nearest-wrongs); noir's N5 gate test passes unchanged;
  `scripts/regression.ts` carries no blanc comp (snapshot untouched); `bash scripts/verify.sh`
  green. **Migration list** (other "same squad" kit text) lives in
  [docs/handoffs/QUEUE.md](handoffs/QUEUE.md) "Same-squad primitive migrations": noir (`.slugs` →
  `.sameSquad`, drop-in), anchor-innocent-maid (blocked on an owner squad-membership ruling), ram
  (no override yet), emma/eunhwa-tactical-upgrade (target-set pattern, not a gate — no migration).

- **(2026-08-01) B1/B2 DPS RANKING BOARD — Solo-style isolation for B1/B2 units.**
  Added a fifth non-DPS ranking board (`b1b2dps.json`) that ranks every sim-supported Burst-1 and
  Burst-2 unit by its own damage in a standardized no-op control team. Four cells only: Core 0 /
  Core 100 × neutral / elemental advantage, all at scope lock. Team shapes mirror the support-rank
  no-op templates: 20s B1 `[tested, B2 SR, B2 SR, B3 RL, B3 MG]`; 40s B1 `[tested, B1 AR, B2 SR,
B3 RL, B3 MG]`; B2 `[B1 AR, tested, B2 SR, B3 RL, B3 MG]`. The board uses dedicated low-ATK no-op
  placeholders (`B1B2_NOOP_CHARACTERS`) so king-maker selectors target the tested unit instead of
  the shared high-ATK controls used by the DPS chart / buffer / sustain / burst-gen boards. The
  no-op B1 in the 40s-B1 and B2 templates provides the standard 7 s team burst CDR; 20s-B1 rows
  rely on the tested unit's own CDR. Red Hood is ranked as both B1 and B2 via her Λ `lambdaStage`;
  Rapi: Red Hood (natively B3) is ranked as B1 via a new `forceStage` unit option, keeping
  `lambdaStage` Λ-only. Partner profiles: Crown with Chime, Anis: Star with Avistar as a MG B1
  partner and with a generic other B1. Profile rows put the partner first in the stage (e.g.
  Avistar -> Anis: Star, Chime -> Crown). **Evidence:** green `bash scripts/verify.sh` and
  `node scripts/web-smoke-ranks.mjs`; team-assembly fixtures in
  `scripts/tests/ranks/b1b2dps.test.ts`.

- **(2026-08-01) CLEAN-WEAPON BASIS INVARIANT REFINED (option 2): CW1 now pins
  damage-NEUTRALITY of any committed override, not file-ABSENCE — `marciana` is the first
  clean-weapon unit to carry an override.** The kit-autonomy gauntlet landed `marciana` (the SG
  clean-weapon basis cell) at GO faithfulness 1.0, cross-family corroborated (S2b claude-fable-5 /
  S5+S6 claude-opus-5 / S7 kimi-code/k3 binding judge, zero gotchas). Her override is recovery-event
  emitters (skill1 last-bullet HoT heal, skill2 burst-cast heal) plus ONE inert `defPct` buff — no
  damage line and no weapon-state modifier, so it is **byte-identical to the bare weapon on damage**.
  The pre-existing CW1 guard asserted none of the six carries a committed override
  (`loadOverride(slug)` toBeUndefined); landing marciana's override broke it. **Ruling (option 2):**
  refine the invariant to its machine-checkable CORE — premise P1 is damage-inertness, not the
  absence of a file. CW1's third test now sims each clean-weapon unit WITH its committed override
  (where one exists) and asserts the total is byte-identical to the bare-weapon (empty) kit; the five
  units with no override satisfy it trivially, marciana satisfies it because her kit is
  damage-neutral, and a future synergy sync that gives any of them a damage-touching line still fails
  loudly — exactly as the old guard did. **CW2–CW5 baselines are unchanged:** they sim via
  `bareWeaponComp`, which hands every slug the synthetic empty `bareWeaponOverride` and never calls
  `loadOverride`, so the pinned bare-weapon totals (marciana 35163154.4909 etc.) are fully insulated
  from any on-disk override. This is a refinement of the base-weapon basis entry below (2026-07-23),
  NOT a weaken-to-GO: the new pin is strictly stronger than file-absence for the property the basis
  actually depends on. **Evidence:** `scripts/tests/units/clean-weapons.test.ts` 27/27 green (CW1–CW5);
  `scripts/tests/units/marciana.test.ts` 17/17 green; `scripts/kit-autonomy/results/marciana.json`
  (GO 1.0); `scripts/kit-autonomy/manual-review/marciana.md`; `docs/data/clean-weapons.md` (Fixture
  note + marciana row). Residual (judge-named, ⚑ with recipe): the skill1 HoT `ticks:3`/`intervalSec:1`
  reading of "over 3 sec" is a shared convention, not a measured tick cadence — the one number a
  recovery-consumer frame-read could pin; it moves no damage of marciana's own.

- **(2026-07-23, latest) SMG FIRE CADENCE FLIPPED 24→20.0 rounds/s (frame quantization) —
  DEFAULT-ON. SUPERSEDES the 2026-07-17 D.2 adoption of 24/s.** The gun fires on FRAME BOUNDARIES:
  the datamined nominal SMG rate 1440 rpm = 24/s = 2.5 frames/shot at 60 fps, and `ceil(2.5)=3`
  frames gives exactly **20.0 rounds/s**. Engine: `PULLS_PER_SEC.SMG = quantizeToFrames(24)` is now
  unconditional; `SMGRATE=<n>` pins a rate as the documented revert / A-B arm (`SMGRATE=24` restores
  the old behavior byte-identically). **Evidence — DIRECT MEASUREMENT of the quantity itself**, which
  outranks the datamined _nominal_ that D.2 relied on: the in-game ammo counter (the designated shot
  clock) on `docs/probes/clean-weapons/emma-claire-idollocean.MP4` with `idoll-ocean` camera-focused
  reads 076→066→056→046→036 across t=60.0–62.0 (mid band) and 020→010 across t=145.0–145.5 (far
  band) — exactly 10 rounds per 0.5 s, dead linear, in two separate range bands (n=1 unit; class
  generalization rides the mechanism + a complete datamined census: SMG's 1440 is the ONLY roster
  rate that is not a whole frame count, so quantization is a provable no-op for every other class,
  independently corroborated by MG's terminal `end_rate_of_fire` 4200 quantizing to 1 frame = 60/s =
  the sim's existing MG constant). **Why D.2 does not block this:** D.2's instrument was FB counts,
  which measure gauge/second; the ammo counter measures shots/second. Under the current rotation model
  all 11 measured full-burst assertions pass at BOTH 20 and 24 (FB counts no longer discriminate the
  two), so the higher-tier shots/second measurement settles it. **Board:** fixes the whole SMG class
  at once (control-suite `liter` 1.208→1.031; chisato 1.154→0.975, quency-escape-queen 1.174→1.046,
  little-mermaid 1.042→0.967, idoll-ocean 1.166→1.017, nayuta ~unchanged kit-dominated); board ±5%
  10→13; **all 11 measured FB assertions preserved, ZERO FB-count regressions.** The 6 tests that
  went red under the flip were fixture artifacts: the `modernia` MG "10-round ammo spend" is a Max-Ammo
  ▼ belt-clip folded into a test's ammo-delta estimator (root-caused, exclusion re-keyed to the clip
  CAUSE + a positive decomposition assertion; MG economy byte-identical between arms), and the 5
  FB-count discrimination fixtures had an SMG (`liter`) as their gauge vehicle — rebuilt on non-SMG /
  gauge-rich vehicles, each mutation-verified to still fail when its mechanic breaks. Gated via
  `/scientific-method`: 5-premise gate all CONFIRM, Fable pre-op APPROVED-WITH-REVISIONS (5 revisions
  all taken), 2-of-2 blind post-op ACCEPT at HIGH+HIGH, implementation-reviewer FIX-BEFORE-MERGE
  (docs, this entry). Snapshots regenerated with the change; `SMGRATE=24` reproduces the pre-flip
  snapshot byte-identically (leakage control — every non-SMG mover moved only via an SMG teammate's
  rotation). **Open (explicitly NOT closed by this):** the SMG override re-tune worklist (~24 SMG
  overrides were fit to 24/s and now read a few % cold — `docs/control-regression-followups.md`);
  post-flip residuals quency-escape-queen ~1.05 / nayuta ~0.85; the lazy Max-Ammo-▲-expiry overhang
  clip is now reached code (open-questions). Full trail: `docs/handoffs/closed/2026-07-23-smg-cadence-flip.md`,
  `docs/probe-runs.md` (SMG CADENCE), measurement `docs/probe-data/clean-weapons-idoll-ocean.json`.

- **(2026-07-23, latest) BASE-WEAPON BASIS, two follow-on owner rulings: `cfg.disableBursts`, and
  RARITY CEILINGS for non-SSR units.** Both refine the base-weapon basis entry below.
  **(1) Bursting is turned OFF in the sim, not merely made harmless.** The owner can disable
  bursting in game, so the sim models that directly rather than relying on the clean-weapon units'
  burst blocks happening to be empty. `cfg.disableBursts` guards the CHAIN OPENER, which keeps it to
  one condition: stage never leaves 0, so cast selection, stage advance and Full Burst are
  unreachable by construction; the gauge fills and clamps at 100, pinned exactly as in a real fight
  where the player never presses. Additive, default-off, **byte-identical unset** (whole-board
  `board-read.ts` A/B clean, verify.sh green, full vitest). It does not move damage either: team B
  casts 15 bursts with it off and 0 with it on for byte-identical totals, so the baselines do not
  depend on it. Engine edit made on an isolated worktree per the standing rule.
  **(2) Scope lock encodes an SSR ceiling that two of the six cannot reach.** `copies: 10` ⇒ 3★ +
  core 7. `idoll-ocean` can hold no dupes at all (0★/core 0) and `claire` 2 dupes with no cores
  (2★/core 0), so the plain basis credited them ATK they can never have — 68,928 vs 81,530 and
  79,200 vs 90,632, worth **15.5% / 12.6%** of their damage. Damage is very nearly linear in ATK for
  a bare weapon (boss DEF is subtracted per hit, so not exactly), making the error a near-pure
  scalar: harmless to the SHAPE of a fight, fatal to the sim-vs-real ratio that is this basis's only
  output. Fixed with per-unit `stars`/`core` (`CompOptions.unitLimits` → the support `prepare.ts`
  already had); inert for every other suite. ⚠ **`data/characters.json` carries NO unit-rarity
  field** (the only `rarity` in the repo is doll rarity), so nothing derives or enforces these —
  they are owner-supplied and hand-maintained, and the gap is latent for any non-SSR unit anywhere
  in the sim, not just these two.
  **`idoll-ocean` stays despite not being SSR — the SMG slot has no alternative.** Of 30 SMG units
  exactly three have no damage-raising line in skill 1 + skill 2 (bursts being off makes the burst
  slot irrelevant): `idoll-ocean`; `rei` (SMG/Water — NOT `rei-ayanami`), clean but not owned; and
  `mica-snow-buddy` (SMG/Iron — NOT `mica`, RL/Wind), which is NOT clean because _"Max Ammunition
  Capacity ▲ 40% continuously"_ raises fire uptime and therefore damage. Every other SMG carries an
  explicit offensive line.

- **(2026-07-23) BASE-WEAPON FAITHFULNESS BASIS — `folkwang` replaces `kurumi` as the AR
  "clean weapon" cell; boss element **Iron**; the six run as two teams of three.** The clean-weapon
  set (`docs/data/clean-weapons.md`) exists to test the engine's BARE WEAPON model — fire cadence,
  ammo/reload, charge + release latency, pellet landing, core/crit, range bands — using the only
  units whose kits contribute nothing to damage, so no kit encoding sits between sim and recording.
  Evidence tier: **kit prose (blablalink SSOT)**, a complete read of all three skill slots per unit;
  no measurement and no fitted value is involved.
  **Why `kurumi` was rejected:** the owner's constraint was "never bursts", and her two _other_
  damage lines do obey it (S1 block 2 is _"Activates when using Burst Skill"_, S2 is _"Activates
  during Full Burst"_). But S1 block 1 — _"Activates after landing 36 normal attack(s) … Hacked:
  Deals 52.24% of final ATK as sustained damage every 1 sec for 5 sec"_ — fires off a NORMAL-ATTACK
  COUNTER with no burst dependency at all, so she is not bare-weapon even under the constraint. At
  261.2% ATK per proc per 36 shots against a 13.65% normal multiplier it is not a rounding error.
  `folkwang` (AR/Water/B2) is the only AR with zero damage-touching lines _including_ her burst.
  The other five were confirmed clean: every non-burst line is heal / shield / Max HP /
  incoming-healing / DEF / taunt. ⚠ `snow-crane`'s BURST grants **Pierce for 10 sec** — she is the
  one unit for whom "never burst" is load-bearing rather than incidental.
  **Boss element Iron** is the unique element neutral for all six (the other four each hand at least
  one of them the ×1.1 elemental major); `bossElement: null` is neutral by construction. Proved
  through the engine, not read off the wheel.
  **Two teams of three** (owner constraint: the six cannot be fielded as one team), split by burst
  stage so team A is all Burst II and therefore **cannot burst at all** — no Burst I unit ever opens
  the chain, zero casts. Team B is all Burst I and does cast, but a no-op burst is **uptime-inert**:
  `marciana` is byte-identical at 0 casts vs 8 (there is no cast-animation lock in the fire loop), so
  team B's numbers are bare-weapon too. Neither team reaches Full Burst (no Burst III). Each team
  fields three distinct weapon classes, covering all six.
  **No override files were authored.** The six are `simSupported: false` with no override on disk, and
  `resolveSkills` throws for a unit with prose and no override — so the fixture SYNTHESIZES an empty
  kit (`bareWeaponOverride`, `scripts/tests/lib/harness.ts`). This keeps the basis out of
  `src/skills/overrides/` entirely: there is no committed encoding that could drift away from "bare
  weapon", and no protected-path approval to grant. Pinned by `scripts/tests/units/clean-weapons.test.ts`
  (25 assertions: kit-prose digests so a synergy sync that rebalances any of them fails loudly rather
  than silently invalidating the basis; the zero-burst and cast-inertness premises; the Iron-neutrality
  proof plus its ×1.1 discrimination; and the six per-unit 180 s baselines). Board-inert by
  construction — none of the six appears in any graded comp.

- **(2026-07-23) `helm` — her burst's "Recovers 54.45% of attack damage as HP for 10 sec" is a
  TEN-SECOND RECOVERY WINDOW, not a single instant event** (`heal` `ticks: 10` / `intervalSec: 1`).
  Owner ruling during the first `/kit-tdd` per-unit test-first session. Evidence tier: **kit prose
  (blablalink SSOT)** — the same tier that authorized the two 2026-07-23 helm fixes; no measurement and
  no fitted value is involved (`ticks: 10` is the kit's own "10 sec").
  **Why it matters even though no HP pool is modeled:** a `heal` is an _event_, not an amount — it fires
  the target's `recovery`-triggered blocks (crown's _"when recovery takes effect → all allies Attack
  Damage ▲20.99%"_). Collapsing a 10-second window to one instant understates how long a recovery
  consumer stays refreshed. The primitive already existed and has prior art (`blanc` `ticks: 8` on the
  same `burstCast`→`allies` shape); this is an encoding fix, not a new mechanic.
  **BOARD-NEUTRAL, verified by direct A/B** (`board-read` byte-identical with and without the change;
  control-regression snapshots stable, helm 1.042 / liter 1.208 unmoved). Her S1 full-charge heal
  already fires every ~1.5s and saturates crown-style consumers, so the extra ticks buy no new
  activation in any graded comp — the change is pure faithfulness at zero fit cost. **The window is
  therefore invisible to the board and to the regression snapshot**, and is gated only by the unit
  spec `scripts/tests/units/helm.test.ts` (H8), which isolates S1's heal out of the fixture so the
  burst window becomes the fight's only recovery source. This is precisely the faithfulness-vs-fit gap
  the TDD transition exists to close: nothing else in the repo could have caught or can now protect it.
  **⚑ RETAINED:** the 1-second TICK CADENCE is an approximation — the real mechanic is attack-driven
  lifesteal, so only the window LENGTH and the consumer-refresh behaviour are kit-literal.

- **(2026-07-23) `helm` — "for 10 round(s)" is now a REAL ROUND COUNT (`durationShots`
  primitive), replacing a `durationSec 13` approximation.** Owner directive during the helm kit review.
  Her burst grants _Charge Damage Multiplier ▲158.4% for 10 round(s)_. A round count is not a timed
  window and cannot be expressed as one: her **magazine is 6**, so the ten rounds span a reload (~6
  charged shots → reload → ~4 more, ≈17.5s at her measured 90-frame bolt cycle), and the 13s stand-in
  truncated it at roughly the 7th round. The override's own caveat had admitted the gap since it was
  authored.
  **Prior art was not reusable, which is why this is a new primitive.** `dorothy-serendipity` does carry
  a real round count (`consolidation.shots: 3` → `consolShotsLeft`) but it is a field of her bespoke
  pellet-consolidation state machine, reachable by nothing else; `jill`'s _"for 9 round(s)"_ is modeled
  as a permanent passive, which is **correct for her and must not be "fixed"** — her magazine is exactly
  9 and the buff re-triggers on every reload-to-max, so 9 rounds IS permanent. `BuffInstance` otherwise
  expired only on `expiresFrame`, its sole non-time scope being `whileSwappedIdx`.
  **Mechanism:** `EffectDef.buff.durationShots` → `BuffInstance.shotsLeft`, decremented in `firePull`
  after the shot's blocks dispatch — deliberately the same "ends right after its Nth shot" shape as
  `weaponSwap.maxShots` (MEASURED 2026-07-14) — so the Nth shot still benefits. A round is one bullet
  (`hitsPerShot` for an MG, matching the ammo economy) counted whether or not ammo was deducted, since
  an unlimited-ammo shot still fires a round. Opt-in: omit the field and a buff is time-only and
  byte-identical.
  **Scope: `helm` ONLY** (owner ruling). The other simSupported carriers are inventoried in
  `docs/control-regression-followups.md` §1 and deliberately untouched — note `snow-white-heavy-arms`'
  two "1 round" lines are ALREADY round-scoped via `whileSwapped`, and `asuka-wille`'s _"reload speed is
  FIXED at…for 1 rounds"_ is a stat CLAMP, a different primitive (`engine-modeling-gaps.md` §1b).
  **Evidence tier: DATAMINED kit text** (structural, not empirical) + a functional test that proves the
  mechanism instead of inferring it from a ratio: `scripts/tests/duration-shots.test.ts` (in verify.sh)
  asserts strict monotonicity across N=1..10 (per-round decrement, not a time proxy), that 10 rounds
  beats the `durationSec 13` model by 2.9% (it survives the reload — the discriminating assertion), and
  that teammates are byte-identical across every N (holder-scoped budget).
  **A/B:** all measured full-burst truths UNCHANGED; `helm` is the ONLY unit that moves anywhere —
  control suite 1.009 → 1.042, board 0.953 → 0.973 (1 of 45 units, MAD bucket ±5%: 9 → 10).
  → `docs/STATE.md` §5, `docs/control-regression-followups.md`.

- **(2026-07-23) `helm` — Critical Rate is NORMAL-ATTACK-SCOPED (`critRateNormalPct` primitive).**
  Owner directive during the helm kit review: _"the crit rate pct isn't a true crit rate pct buff, it
  only buffs crit on normal attack damage (meaning not skills)"_. Her S1 reads _"Critical Rate of
  **normal attacks** ▲14.64% for 5 sec"_ and targets **all allies**, but the override used the unscoped
  `critRatePct`, which `dealDamage` folds into the crit roll for every crit-eligible hit. So the sim was
  inflating crit on the **whole team's** skill procs and burst nukes, not just normals — an over-credit
  that grew when `RIDERCRIT` landed ON (2026-07-22) and flat-damage riders became crit-eligible.
  The scoping information was already in the damage path (`dealDamage` takes
  `category: 'normal' | 'skill' | 'burst'`), so the fix is a new StatKey joining the crit rate only when
  `category === 'normal'`. Opt-in and inert (sums to 0) for every non-carrier. **`helm` is the only
  simSupported carrier** of this kit line (`biscuit` carries it but is not simSupported).
  Also corrected: the override's `note` asserted a `shotFired → allies fillGauge 14.31` block the file
  never contained. The _"Fills Burst Gauge by 14.31%"_ line is real but lives in
  `data/gauge-per-shot.json` (`helm.flatPerTrigger 1431`, datamined with two independent confirmations),
  added per trigger pull in `gaugePerShot()` as a flat term the focus charge multiplier deliberately
  does not scale.
  **Evidence tier: DATAMINED kit text.** **A/B:** measured full-burst truths UNCHANGED (crit does not
  touch gauge). 10 of 45 board units move, every one a `helm` comp-mate, all cold-direction, max −0.019
  (`privaty`); `liter` (1.208) and `crown` (1.051) are EXACTLY unchanged, since SMG/MG damage is almost
  entirely normal attacks. **This is a fit REGRESSION** — MAD buckets ±3%: 6 → 5, ±5%: 12 → 9 — and an
  expected one: those overrides were partly calibrated against the inflated crit (fit-exposure, the same
  pattern as a rotation fix). **Faithful > fit; re-tune the exposed units separately, never re-fudge
  this back.** → `docs/STATE.md` §5, `docs/control-regression-followups.md`.

- **(2026-07-23, final) `FBRULE` DEFAULT FLIPPED `perkit` → `timing` — the end-state Full-Burst rule is
  now shipped, as a VERIFIED NO-OP.** Owner ruling. Full Burst is a TIMING/snapshot gate: any
  non-burst-cast skill/rider/DoT landing inside the FB window takes the +50% (JP+KR research, empirical
  both sides). That was established 2026-07-14, but the default was held at `perkit` because six units
  still carried calibration-RELIC `noFb` flags masking cadence over-models — flipping early would have
  made them run hot. `sim.ts` stated the exit condition in place: _"once all 6 are green the default
  flips to 'timing' with zero further drift."_
  **That condition is now met.** Five relics went 2026-07-15; the last (`privaty`) went with her
  Designated-Target re-encode earlier today. With zero carriers, `skillNoFb`'s `perkit` branch returns
  `perKitNoFb` = false for every unit, so the two arms were already identical — the flip is provably a
  no-op and was verified as one: `scripts/regression.ts` passes with **no snapshot change** under BOTH
  the new default and `FBRULE=perkit`. Burst-cast damage remains FB-exempt under every arm (U10).
  **Companion guard:** `noFb` in an override is now INERT, which is exactly how a relic creeps back —
  so `validate-overrides.ts` REJECTS the field outright rather than ignoring it. A kit that genuinely
  needs FB suppressed is a mechanism finding for open-questions U14, not an override flag. The
  `perkit`/`dotfb` arms survive only as vestigial revert/experiment paths (no carrier can exist).
  → open-questions **A34 (U14)**, `docs/STATE.md` §1.

- **(2026-07-23, latest) `privaty` — the 1687% rider RE-ENCODED as a Designated-Target-gated last-bullet
  hit; the fabricated DoT and its `noFb` are GONE. Owner ruling, faithful > fit; DELIBERATE board cost
  0.937 COLD ▼ → 1.118 HOT ▲.** Her `skill2` carried `dot atkPct 1687 durationSec 10 intervalSec 3 noFb`,
  an encoding with no kit support: the kit line is _"Activates when the last bullet hits a target in
  **Designated Target status**. Deals 1687% of final ATK as additional damage"_, with `durationSec 10`
  borrowed from the Designated-Target debuff window and `intervalSec 3` from her burst's unrelated
  3-second stun. **Now:** her burst applies `targetStatus {name:'Designated Target', durationSec:10}` on
  the burst's _"Designated Target: ATK ▼5.02% for 10 sec"_ line — that line IS the status, so its 10 s
  is the status's own DATAMINED window, not an inferred one borrowed from a neighbouring effect (there
  is no separate ATK-down for it to bind to; the ATK-down is the status's content, inert in v1 because
  the boss never attacks and the engine drops non-`damageTaken` enemy buffs outright, so it now sits in
  `unmodeled.burst` instead of as a dead effect). The rider is a `lastBullet` block carrying
  `requiresTargetStatus:'Designated Target'` + `flatDamage atkPct 1687` (`noRange`) — **no `noFb`, and no
  hardcoded hit count** (the count is whatever her cadence produces).
  **What settled it** — frame read, u7 focus video @ 15.503 s (`docs/probe-runs.md` 2026-07-23): one
  popup stack carries 571,999 (red CORE HIT), 367,714 (white normal), **37,871,391** and 5,750,750.
  `37,871,391 / 5,750,750 × 256.17 = 1687.00` identifies the rider exactly — an independent method from
  the visual read, whose `8` was occluded. It lands in the SAME frame as the 256.17 last-bullet rider
  sharing its buff snapshot ⇒ **not a DoT**; and the frame is inside a Full Burst (the 256.17 reads
  1.5015× its recorded non-FB value) with the 1687 at 6.58547× it against a kit ratio of 6.58547 ⇒ **it
  takes the +50% FB major**, refuting `noFb`. This also dissolved the standing "fires in T4 but not u7,
  therefore comp/condition-dependent" puzzle: it fires in both — the earlier whole-screen check missed
  an occluded popup sitting inside its own search band.
  **The HOT move is FIT-EXPOSURE, not a defect of this encoding.** The `noFb` flags removed here were
  themselves the calibration knob that had pulled her 1.29 → 0.97, so the overshoot is the pre-existing
  over-model they were hiding. The proc rate was sanity-checked and NOT fitted, **measured by count**:
  the rider fires on **38.8%** of her last bullets in T4 (19 of 49) and 36.6% in N5 (15 of 41), against
  **~38.6%** predicted from ~34% of fight-time in status × ~1.25 in-window last-bullet density — 3 procs
  per window (4 in the opening one), in-window spacing 2.78 s ≈ a 30-round magazine ÷ 12 rps plus reload.
  (An earlier draft of this entry quoted _"~47% vs ~44%, 5 bursts, ~2× density"_; all three inputs were
  wrong — 47% was damage-weighted rather than a count, she casts **7** times in T4 not 5, and
  `maxAmmoPct −50.66` is a `fullBurstEnter`→allies buff so it halves magazines in EVERY Full Burst,
  leaving her Designated windows no ammo advantage over the others. The corrected arithmetic reproduces
  more tightly, not less.) Exactly one snapshot entry moved (+23.72%, hers); every measured-truth
  full-burst-count assert stayed green; no coefficient was touched (1687 / 256.17 / 1407.64 all
  datamined). **Do NOT re-add `noFb` or shave the coefficients to close the residual** — it is a per-unit
  localization thread. Precedent: grave pierce 0.83→1.18 kept on purpose (DECISIONS 2026-07-17). She is
  the first kit-motivated carrier of the `targetStatus` primitive built earlier the same day.

- **(2026-07-23, later) `wipeOut`/`requiresWipeOut` DELETED — the named registry is now the SOLE
  enemy-status channel; `d-killer-wife` migrated.** Owner ruling, superseding the "deliberately NOT
  unified" clause of the entry below: _"just delete the old wipeout and set the new one live, faithful >
  fit… leaving an incorrect implementation just because it passes a regression test is always wrong."_
  The old pair was not merely redundant — it could express exactly **one** status name for the entire
  roster, so the moment a second unit needed an enemy status it would have satisfied `d-killer-wife`'s
  gate and she would have satisfied its. Passing the board was an artifact of having exactly one
  carrier, not evidence of correctness.
  **The migration is behaviour-preserving and the board did NOT move**: her burst now inflicts
  `targetStatus { name: 'Wipe Out', durationSec: 10 }` and her body-branch ATK buff is gated
  `requiresTargetStatus: 'Wipe Out'` (+ `requiresCore`, unchanged). Identical semantics — max-extend
  window, same position among the abort gates, expiry checked at read — so `scripts/regression.ts`
  passes with **no snapshot change and no `--update`**. The 12.19% kit value is untouched; no measured
  constant refit. Primitive count 92 → 90.
  **Load-bearing detail, now recorded in her override note:** her status-inflicting block precedes her
  gated block in the `burst` array and both fire on the same `burstCast` frame, so the gate reads a
  status written earlier that same frame. Reordering that array would silently disable the buff for one
  window. → `docs/engine-modeling-gaps.md` §1a for the edges one carrier does NOT reach (`chargeCounter`
  blocks bypass all gates; typo'd names fail silently; cross-unit same-frame ordering; multi-producer
  refresh).
  The mechanism test replaced its `wipeOut` non-collision arms with a property the deleted pair could
  never have satisfied: **two differently-named statuses live simultaneously**, gated three ways (each
  fires on its own name; an unapplied third name reads exactly zero).

- **(2026-07-23) NAMED TARGET-STATUS REGISTRY BUILT (`targetStatus` effect + `requiresTargetStatus`
  block gate) — capability only, ZERO enactments.** The 5e action item's buildable core. The engine had
  no way to express _"Activates when … hits a target in \<Name\> status"_: its only apply-then-gate
  channels were `wipeOut`/`requiresWipeOut` (global, enemy) and `shield`/`requiresShielded` (per-unit),
  each a **single hardcoded-name boolean**, so a second character reusing either would COLLIDE with
  `d-killer-wife` / `naga` rather than express its own status. `resources` is named and multiple but
  untimed and owner-write-only; `mode` is fixed at setup (non-matching blocks are deleted from the
  unit's block list), so it cannot model a state entered and exited mid-fight. There is no enemy entity
  at all (`resolveTargets({kind:'enemy'})` → `[]`), so the registry is **one global boss-scoped table per
  `runSim` call** (declared in `runSim` scope exactly like `wipeOutUntilFrame`, so it resets per run — it
  is NOT module-scoped, and must not be hoisted to module scope: that would leak status windows across
  `SEEDS=N` Monte-Carlo runs and across repeated web-side sims) and the effect ignores `block.target` —
  while the validator requires the authoring block to carry `target: enemy`, so a carrier cannot silently
  mis-scope it.
  **Inert:** no override opts in; regression byte-identical WITHOUT `--update`; `doc-drift.ts`'s
  structural census independently derives 0 users. Mechanism proven by
  `scripts/tests/target-status-gate.test.ts`, whose load-bearing assertions are DISCRIMINATING rather
  than confirmatory: with status A genuinely live, a block gated on B deals **exactly zero** (a global
  boolean would fire it), and `wipeOut` ↔ named statuses do not satisfy each other in either direction.
  **⚠ SCOPE NARROWED BY A PREMISE REFUTE — record this so it is not re-attempted:** the plan's premise
  that this one vocabulary makes `privaty`, `prika`, `mint` and `milk-blooming-bunny` all expressible is
  **false**. A registry is NECESSARY for all four but SUFFICIENT only for `privaty` (whose status is
  enemy-carried with a clean predicate read). `mint` additionally needs a memoryful XOR toggle whose
  transition reads its own prior value and which has no timer; `prika`'s Performance is **team**-carried,
  extended in-flight (+21 s), and entered on **another unit's** status landing; `milk-blooming-bunny`
  needs a stat **clamp scoped by reload count**, status-suppresses-status, and a player-input entry, and
  its kit text never states Embarrassment's exit condition. Do NOT try to complete those three on this
  registry and then read the failure as a gate bug. → 5e.
  **`privaty` (Privaty, AR/Water) is NOT enacted.** Her `skill2` still carries the fabricated `dot`
  (`atkPct 1687 / durationSec 10 / intervalSec 3`); rewiring it onto this gate is a separate gated pass,
  still blocked on why the 1687% is present in T4/T4b and absent in the u7 focus video. `wipeOut` is now
  strictly redundant with this primitive but is deliberately NOT unified onto it — that would move
  `d-killer-wife`, the one graded carrier, and so cannot ride an inert landing.
  Harness: `/scientific-method` — premise gate (1 CONFIRM w/ scope correction, 1 REFUTE → narrowed),
  Fable pre-op APPROVED-WITH-REVISIONS (3 revisions, all folded in), 2-of-2 ACCEPT at HIGH+HIGH.

- **(2026-07-22) `jill` — REAL RELOAD + BURST FORCED RELOAD; `charFixes.reloadFrames: 0` REMOVED.**
  Owner enactment, on kit text, no measurement required or claimed. Her override carried a whole-fight
  `reloadFrames: 0` justified as _"ROLLING RELOAD (datamined shot row): reload_start_ammo=8 — she begins
  reloading at 8/9 ammo and tops up concurrently while firing."_ **All three grounds are void:**
  (1) `reload_start_ammo` is `max_ammo − 1` for **192 of 192** shot rows in `data/characters.json` — a
  complete census, so it identifies nobody (→ U30); (2) `reload_bullet 10000` makes her a single-chunk
  reloader with no partial-reload mechanic; (3) the burst line read as the source of her zero-downtime
  firing, _"Reload speed is **fixed at** a 99.96% increase for 10 sec"_, is a stat **LOCK** at ~normal
  speed — **owner ruling: "is fixed at" clamps a stat at that level, it is not a delta applied on top**
  — so it grants her nothing. Corroborated across the corpus: the same construction appears as _"fixed
  at a 50% **reduction**"_ (`milk-blooming-bunny`) and as plain set-tos everywhere else (_"Pellet count
  is fixed at 1"_ — `dorothy-serendipity`, which this repo already models that way as her
  `consolidation`; _"Charge time is fixed at 0.7 sec"_ — `anis-star`).
  **Modelled:** her burst's kit-verbatim _"Removes 100% of ammo. Forced Reload."_ via the existing
  `consumeAmmo { fraction: 1 }` (`sim.ts:1955` — whose comment already named her). **No engine change,
  no fitted value:** `fraction 1` is the kit's literal 100%, `reloadFrames 81` is the synced datamine.
  Its kit PURPOSE — re-triggering Magnum Ammo and Acid Ammo, which both key on _"upon reloading to Max
  Ammunition"_ — is already carried by modelling those two as permanent, so this adds the COST without
  double-counting the benefit. The reload-speed LOCK is left **unmodelled** (the engine has no clamp
  vocabulary; a cross-cutting gap over 8 units and 3 stat families → `engine-modeling-gaps.md` §1b).
  **PER-ARM ISOLATION** (board-read + regression per arm): forced reload ONLY (keeping `reloadFrames 0`)
  → 1.031→1.030, all asserts green — i.e. **with a 0-frame reload the forced reload costs nothing**;
  real reload ONLY → 0.923; both → **0.919 COLD ▼** (from 1.031 HOT ▲). The `reloadFrames` constant
  carries the entire effect. Footprint verified clean: only her two comps moved.
  **N1 UNPINNED, and this is the cost of the ruling.** `N1 rapi/quency wind` loses its Full-Burst
  assert (sim 12 vs video-measured **13**, which is UNCHANGED and preserved in-comment at
  `scripts/regression.ts`). It joins N2/N4/N5 in the open burst-cycle timing increment. It was ALREADY
  12×24 / 13×1 across seeds — passing on one marginal seed — so removing her phantom fire time
  **unmasks** a pre-existing burst-generation shortfall (same family as **U29**) rather than creating
  one. **Do not "fix" it by restoring her fire rate.** Owner accepted the board break in advance
  ("it's 100% going to break her board since it was previously unmodeled"): faithful > fit, and `jill`
  becomes a re-tune candidate at 0.919. → open-questions **U31**.

- **(2026-07-22) `extraHitDamagePct` FUNCTION-RIDER CRIT — `RIDERCRIT` default ON.** The per-normal-hit
  function-rider path (`sim.ts` `firePull`) dealt its hit with `crit: false`, contradicting the SSOT:
  `damage-calculation.md` §2b and the datamined FunctionTable rule (`nikke-damage-formula.md` §3)
  BOTH state that function "additional damage" crits at the caster's rate and never cores. Two
  independent documentary sources; no measurement was required or claimed. `core: false` was already
  correct and is unchanged, and Full Burst was already correct (no `noFb` passed ⇒ FB by landing time)
  — **only crit was wrong.** This closes the half of U13/A29 that the `DOTCRIT` flip explicitly left
  out of scope. Owner ruling: default ON. `RIDERCRIT=off` reverts and is byte-identical to the prior
  engine (verified by full board-read diff).
  **Population = exactly three overrides** (field-form grep, not the audit's three confirmations):
  `modernia`, `nayuta`, `neon-vision-eye`. **Provenance audit** (the trap that killed the U13 ÷1.075
  de-crit sweep): all three coefficients are kit-verbatim/datamined — `modernia` 2.24 hand-authored
  verbatim (her caveat ⚑4 already named this defect), `nayuta` 150+380.46 Prydwen-verbatim,
  `neon-vision-eye` 262.79 "verbatim from skill text" with a video-confirmed `everyN` cadence. None
  calibrated-absorbed ⇒ no de-credit applied.
  **A/B method note:** MC-seeded runs are UNUSABLE for this change — the rider's extra Bernoulli draw
  shifts the shared per-comp RNG stream and moves full-burst counts on unrelated comps (it showed a
  phantom `nayuta` shot-count change and a PB-battery FB shift). Judged on `SEEDS=0`: footprint is
  exactly the three units, shot counts unchanged, only the burst bucket moves. Magnitudes are coherent
  with the crit arithmetic — predicted in-FB +5.00% vs observed `nayuta` +4.55% / `neon-vision-eye`
  +5.05%, and `modernia` +12.13% predicted from her Critical Damage ▲ 14.25%×5 stacks vs +12.00%
  observed. Board: `modernia` 0.83→0.84, `nayuta` 0.85→0.86 (both COLD, improve); `neon-vision-eye`
  1.07→1.08 / 1.17→1.18 (HOT, slightly worse) — faithful>fit, her heat routes to a per-unit retune.
  **Two residuals at the same call site (neither is crit) — they are NOT the same kind of open:**
  (a) **burst gauge, LIVE on all three carriers:** `extraHitDamagePct` generates NO gauge where an
  equivalent `flatDamage` proc emits `skillGauge` per proc, so all three units generate less gauge
  today than the same kit line would under the other encoding. The one MEASURED function rider
  (`maiden-ice-rose`) DOES generate gauge, so this is a probable live UNDER-generation pending
  measurement, not a neutral unknown. (b) **flavor, genuinely inert:** being a summed stat it cannot
  carry a per-rider `flavor`, so a true-damage rider could not be exempted from crit (§2c) without
  promoting the stat to a per-source list — no true-flavored rider exists, so nothing is mis-modeled
  by it today. Consequence: the two encodings are NOT interchangeable — swapping one for the other
  silently changes gauge economy. → open-questions **U28**; A32 (U13); live flag `docs/STATE.md` §1.
  _(Corrected 2026-07-22, same session as authoring: the first draft called both residuals "inert
  today", which was true only of (b) and would have caused a reader to under-prioritise (a).)_

- **(2026-07-22) ACCURACY-CIRCLE GEOMETRY — the four open rulings RESOLVED; workstreams A + B RETIRED as
  superseded-by-the-cone, C is the only live thread.** The `docs/data/sg-calc/IMPLEMENTATION-PLAN.md` open
  rulings were written 2026-07-17, two days BEFORE the δ-offset cone landed as the live default
  (2026-07-19) — which silently mooted two of them. Code-verified: `acrForHR`
  ([sim.ts:997–1011](../src/engine/sim.ts#L997-L1011)) returns early via `offsetCoreProb` whenever
  `CONE_DELTA` is on, so **AR/SMG/SG never reach `acrFor` (workstream A / `ACR_GEO`) or `hrCoreMultGeo`
  (workstream B / `HRCORE_GEO`)**; and `ACCURACY_CIRCLE_SCALE` covers only `{AR, SMG, SG}`, so MG/SR/RL
  no-op through the geometry as well. Both arms are therefore UNREACHABLE under the shipped default.
  - **(1) Workstreams A + B → RETIRED as SUPERSEDED.** Marked superseded-by-cone in the plan; the code
    stays ONLY as part of the `CONE_DELTA=0` fallback layer and is no longer a promote-candidate. B's
    premise was independently removed anyway — the geometry campaign proved the drawn reticle DECORATIVE
    (RESOLUTION-REDERIVATION.md CLOSED-BY 2026-07-19), and B exists purely to ground the reticle-shrink
    `SAT`. Note the pre-cone A/B numbers in the plan's STATUS block (A improving SMG, B over-lifting
    quency-escape-queen to 1.322) are STALE regardless: the baseline has moved twice since (cone 07-19,
    coherent rotation 07-21).
  - **(2) Range model → KEEP DISCRETE BANDS.** The live cone consumes `BAND_CORE_PX` (near 31 / mid 28 /
    midfar 21 / far 17 px, hand-measured from `noir-sg-bands.json`). Continuous range via `k/(r+c)` is NOT
    adopted — it would make the live model depend on an unvalidated pair, and the boss range script is
    already band-based. The "keep bands but re-derive the 4 px from the curve" variant was also rejected:
    it would overwrite measured cells with derived ones (hard-constraint #3).
  - **(3) Pin `k,c` with a hard range measurement → THE MEASUREMENT DOES NOT EXIST (owner domain ruling).**
    There is **no in-game readout of an enemy's absolute 0–100 range**; range can only be INFERRED from
    weapon effective-range behaviour, which the derivation has already done. So the four implied ranges
    are the CEILING of available evidence, not a way-station to a better one — `core_D_px ≈ 2100/(range+47)`
    (R²=0.93) stays a documented approximation and is closed to further validation. Consequence is nil:
    `coreDpx`/`rangeFromCoreDpx` are used ONLY in `scripts/sg-geometry-regression.ts` self-consistency
    checks and appear NOWHERE in `sim.ts` live math, so with ruling (2) keeping bands, k,c is not
    load-bearing. **Do not re-open this as an action item** — it is unobtainable, not merely undone.
  - **(4) Workstream C (SG landing from geometry) → FIX THE METHOD, then re-A/B.** `SGLANDING=geo`
    regresses the calibrated SG board (noir 1.048→0.861, dorothy-serendipity 1.018→0.941), and the cause is
    diagnosed, not mysterious: hit fraction is computed as an area-fraction of the **D=162 spread disc**
    rather than the tighter **aim circle** pellets actually fill (KR/JP pellet research, cited in the plan).
    That is a method bug, not evidence against geometric landing. C is also the ONLY workstream the cone
    does not pre-empt. Rebuild the hit fraction on the aim circle, then re-run the arm. Measured landings
    still win where they exist; geometry supplies band shape + unmeasured bosses.

- **(2026-07-22) THE CRIT/CORE MAJOR BRACKET IS ADDITIVE — owner ruling; U15's foundational sub-item CLOSED,
  no engine change.** The engine composes the major bracket additively: `major = 1 + (FB 0.5) + (range 0.3)`,
  then `major += critRate × critBonus` and `major += coreRate × coreBonus`
  ([`sim.ts` dealDamage, :1235–1257](../src/engine/sim.ts#L1235-L1257)). U15 had flagged this as an open
  FOUNDATIONAL audit — the measured Rapi: Red Hood core+crit body hit (7,948,092 = base ×1.80) does not
  compose cleanly under the additive constants, which admitted three readings: multiplicative crit, a
  distinct explosion core bonus, or popup mis-association. **RULING: ADDITIVE. The shipped model is correct
  and stays.** Independent corroboration already in-tree: little-mermaid's DoT 450,314 = 337,736 × 1.333
  cross-corroborates the additive bucket ([`sim.ts`:58–61](../src/engine/sim.ts#L58-L61)). **Consequence:**
  the RRH ×1.80 anomaly is re-attributed to RRH-LOCAL causes (explosion core bonus / popup association —
  both already named in U15), NOT to the shared bracket; its bounded consequence stays ~0.3–0.4% of her
  total and rides with the rest of her explosion residual (U15 stays open on its other four bullets).
  (FINAL RESOLUTION 2026-08-04: the explosion does not core AT ALL — the ×1.80 body was popup
  mis-association with a concurrent normal core+crit; see the top entry.) This
  retires the one FORMULA-level unknown that sat underneath all 86 board readings — per-unit retunes no
  longer risk calibrating against a possibly-wrong shared bracket, which is what gated the engine-work
  ordering. Trail: open-questions U15, §P0.

- **(2026-07-21) COHERENT FIRST-BURST ROTATION MODEL — LANDED (owner frame-perfect, chisato.mov Liter/Crown/Chisato/Helm Fire).**
  A frame-by-frame read (t0 = first `2:59` frame; the timer starts at 2:59:999 = elapsed 0, NOT 2:59:000 — see
  [[fb-timing-anchor-not-startup-lag]]) gave the exact timeline: first bullet 0.133s · Helm SR shots 1.117/2.483/
  3.850s (82f cycle = 60f charge + **22f-at-END** bolt) · **gauge full ON Helm's 3rd shot** · B1 4.317 · B2 4.783 ·
  B3 5.283 · FB 5.650. Five coupled corrections reproduce it to ~0.1s at every stage:
  (1) **`FIGHT_DELAY_FRAMES` 1s → ~8f (0.133s)** — the first bullet is at 0.133s, not 1s; the 1s was a timer-framing
  confound (SUPERSEDES the entry below). (2) **`SR_BOLT_START_FRAMES` → 0 (BOLTSTART off)** — the data fits 22f-at-END
  - the 8f startup (shot1 at ~67f), NOT an 11f pre-charge split (that entry SUPERSEDED). (3) **`PREB1GAP` 30f
    (default on)** — a 30f delay between gauge-full and B1 (`gauge full → 30f → B1 → 30f → B2 → 30f → B3 → 22f → FB`).
    (4) **`FB_PRE_DELAY_FRAMES` 22f (PREFB default on)** — the FB countdown starts 22f AFTER the B3 cast (the
    mechanistic reason instant burst-cast attacks miss +50%; implemented by deferring `emitFbEnter`). (5) **`POST_FB_
CHAIN_DELAY_FRAMES` 180 → 150** — the measured 3s FB-end→B1 grace already INCLUDED the now-separately-modeled
    30f-pre-B1 (double-counted); removing the 30f gives 150f. **The over-generation bug was Helm's**: `skill1
fillGauge 14.31` DUPLICATED her gauge-table `flatPerTrigger 1431` (both = her S2 per-shot gen) → Helm read 34.22/
    shot not the true base(5.60)+skill(14.31)=19.91; removing the override fillGauge fixed it (SMG stays 0.2, the
    ×2-boss column — CORRECT). **Full-board A/B:** all graded FB counts hold (11/12 exact; run-E reads 10 vs measured
    11-12, a ±1 cycle-boundary UNDER-count paired with N3's opposite-side over-count — accepted as boundary noise,
    measured truth kept in the assert comment); board ±3% 6→7 (tail slightly worse); snapshot regenerated; verify.sh
    green. Each knob has an env A/B-revert. Trail: `sim.ts` FIGHTDELAY/BOLTSTART/PREB1GAP/PREFB/POSTFB comments,
    `helm.json`, open-questions U16.

- **(2026-07-21) ~~FIGHT-START DELAY (1s) + SR BOLT-RECOVERY SPLIT (11f/11f)~~ — SUPERSEDED 2026-07-21 by the coherent
  rotation model above (owner frame-perfect data, ≥ same tier).** The 1s fight-delay was a timer-framing confound
  (real ~8f); the 11f bolt-split was wrong (real 22f-at-END). Both were mis-framed compensating fixes for what is
  actually Helm's fillGauge double-count + the missing 30f/22f chain timing. Retained for the trail.

- **(2026-07-21) B3/B2 in-window stage selection: strict-leftmost → FIRST-READY (earliest-ready, tie→leftmost) — LANDED.**
  Real auto casts whichever burst comes up first, so the timed-window stage-2/3 pick is the stage-filler whose
  cooldown ends SOONEST, not the strictly-leftmost one (owner ruling 2026-07-21). For equal-CD B3s this
  GUARANTEES clean alternation — "earliest-ready" is always the longest-waiting unit, a natural round-robin —
  whereas strict-leftmost let the leftmost slot MONOPOLIZE (a 40s B3 that fits the window every cycle casts all
  of them; the equal-CD unit beside it never bursts). This is the correct resolution of the U16
  sakura-bloom-in-summer over-allocation _family_ at the selection layer (the `STAGE_WINDOW` 600→120 fix, same
  date, already resolved the graded cases by removing the false contention; first-ready generalizes it).
  **GRADED-BOARD-NEUTRAL:** regression byte-identical, board-read ratios unchanged to 3 decimals — at the ~2s
  window with current game CDR the two rules coincide on every graded comp. It moves only UNGRADED comps, and
  every diff is first-ready CORRECTING a leftmost monopoly/skip (40-team random battery: ~1/3 of teams differ;
  traced random 9 cinderella ×6 → cinderella/bready 3/3 alternation, random 10 diesel-winter-sweets excluded →
  gets her startup burst). Bench-B3 exclusion preserved: a 3rd same-CD B3 that can't fit the short window never
  becomes earliest-ready-in-window, so it never casts (round-robin-that-benches was tried + rejected 2026-07-13;
  first-ready is NOT that — it never picks a genuinely-unavailable bench B3). Evidence: owner mechanic (real-auto
  first-available) + graded-board-neutrality proven + conflict traces confirming faithfulness (ungraded/unfootaged
  so "more faithful" rests on the mechanic, not per-comp footage). `B3_LEFTMOST` env reverts. Commit 533bf88;
  closes open-questions U16 sub-question (a).

- **(2026-07-21) Burst-chain reserve window `STAGE_WINDOW_FRAMES` 600→120 — it was the FB-STATE duration, not the auto chain-grace — LANDED.**
  The stage-2/3 "reserve/grace" window (how long a filled burst chain WAITS for a stage-filling unit to come
  off cooldown before the chain expires) was set to **600f = the datamined `burst_duration` (=10s)** — but that
  is the Full-Burst STATE duration, the WRONG quantity. The correct value is the auto's inter-activation grace
  (owner mechanic 2026-07-21: on auto the gauge fills → B1 → **~1s** → B2 → ~1s → B3 → Full Burst, so a chain
  waits only ~1s for a stage-filler, not 10s). **Root cause of the U16 Burst-III over-allocation:** at 10s a B3
  up to ~8s out of cooldown still qualifies as a "window-maker" and the leftmost-with-waiting rule reserves it
  and waits — so with two alternating 40s-CD B3s (sakura-bloom-in-summer slot 3 / cinderella slot 4) it
  double-casts the leftmost (sakura-bloom-in-summer 6/4 vs the footage's burst-color-verified 5/5); the same
  applies at stage 2 for a slow leftmost B2. This is NOT a genuine tiebreak — with a realistic window the
  earlier-ready unit is the _unique_ candidate (supersedes the "leftmost-tiebreak Burst-III selection" framing
  the prior 2026-07-21 in-FB-CDR entry pointed to for U16). **Corrected to 120f (2s).** The window is the auto's
  wait-tolerance for a not-yet-ready stage-filler — a SEPARATE quantity from the inter-stage cast gap
  (`STAGE_CAST_GAP` = 30f/0.5s), which is MEASURED-CORRECT and unchanged: auto cast timing is B1→B2 / B2→B3 ≈
  0.533s each ([data/auto-play.md](data/auto-play.md) §3, nikke-synergy arena guide), and an isolated gap sweep
  at window=120 independently confirms it — measured-FB asserts stay clean across 26–45f (0.43–0.75s) and BREAK
  at 60f/1s (6 comps under-count), so the FB counts themselves reject a 1s gap (owner's initial ~1s was
  hand-wavey; RESOLVES open-questions U16 sub-question (b)). VALUE 120f = ⚑ CALIBRATED against MEASURED FB
  counts (not a measured 2s): all 12 pinned measured-FB regression asserts PASS with clean seeded distributions;
  the passing plateau is wide (sakura 5/5 holds 120–500f; graded clean 120–300f), so 120 = the shortest clean
  window (the mechanic wants short). 90f (owner's first 1.5s) overshoots — PH 13→11 (past its real 12) + bimodal
  FB stragglers — because the grace window must clear the ~1.6s natural chain-completion span (0.433 + 0.533 +
  0.533 + effect delays) with margin: 90f (1.5s) sits under it, 120f (2s) has margin. Only the window changes.
  Rotation moves TOWARD measured wherever it moves: sakura-bloom-in-summer 6/4→5/5, N2 8→10 (real ≥10), PE
  10→11 (real 11-12); PH stays 13 (its separate open burst-cycle over-by-1, untouched). Blast radius (40-team
  random battery, @600 vs @120): one UNGRADED team (moran/arcana/eve/soda-twinkling-bunny/modernia) drops 6→5
  FBs — ROBUST across 120–450f, via a stage-2 expiry on its single 40s-CD B2 (arcana) — a _correction_ of the
  same long-window over-generation, not a regression; no graded comp affected. Evidence: owner mechanic +
  measured-FB calibration; Fable pre-op **APPROVE-WITH-REVISIONS** (all 5 revisions cleared: plateau swept,
  90-rejection rests on pinned-comp bimodality, confounded units ledgered, open-questions filed, blast-radius
  diffed). Snapshot regenerated (byte-stability totals only; **zero** measured-FB asserts changed). `STAGE_WINDOW=600`
  env reverts. Commit c8e1511. ⚠ **Fit-exposure follow-up:** the corrected rotation EXPOSES per-cast over-credits
  in overrides that were fit to the OLD (sometimes under-counted) rotation — the snapshot bakes the new totals
  but board-read shows true vs-real ratios; these units need a separate footage-gated re-tune (NOT re-fudged in
  this session), ledgered in [open-questions.md](open-questions.md) U16. Trail:
  `docs/handoffs/2026-07-21-b3-earliest-ready-tiebreak-plan.md`.

- **(2026-07-21) Skill-granted burst-cooldown REDUCTION DOES apply during Full Burst — the "suppress in-FB burst-CDR" change is REFUTED / abandoned.**
  A proposed game rule ("burst-CDR does not apply during the 10s Full Burst window; only the FB-entry instant
  is exempt") was prototyped on an isolated worktree: a gate in the engine's `case 'burstCdr'` keyed on a new
  `fbStartFrame`/`fbEndFrame` marker that no-ops any mid-FB skill CDR proc (the natural 10s cooldown tick during
  FB was always kept — that is just time elapsing). The gate was verified FAITHFUL to the proposed rule (per-proc
  trace: a "Burst CD ▼ 7s" proc whose 8th-full-charge shot lands mid-FB → no-op; landing in the post-FB gap →
  applies). But it dropped THREE measured comps below their video-counted full-burst pins — elec DPS (run E)
  11→10, iron sweep (run G) 13→12, N1 rapi/quency wind 13→12 — because in those comps the sim reaches its
  measured FB count VIA that in-FB CDR (rouge's + d-killer-wife's 8-full-charge → −7s procs). The residual traced
  to proc PHASE: the sim's charged-shot cadence is deterministic (the MC seed jitters SG pellets, not the SR
  charge counter), so the early procs land on a fixed unlucky phase just inside the FB window (iron sweep's first
  proc lands 0.35s inside FB-end) and no-op, while the real fights land them in the gap. **RESOLUTION (owner,
  2026-07-21): re-watched the source footage and observed the CDR proc APPLYING during Full Burst — so the
  premise was wrong. In-FB skill burst-CDR is REAL; the measured FB pins already encode it; the change is
  incorrect.** The engine was never modified on `main` (the prototype lived only on the removed
  `burstcdr-no-fb` worktree). The Sakura: Bloom in Summer 6-cast-vs-5 Burst-III over-allocation that originally
  motivated this has a DIFFERENT source (NOT in-FB CDR) → tracked in [open-questions.md](open-questions.md) U16
  (leftmost-tiebreak Burst-III selection candidate), to be opened in a fresh session. Trail: the now-closed
  handoff `docs/handoffs/closed/2026-07-21-burstcdr-no-fb-change-pulled.md`.

- **(2026-07-21) cinderella (RL/Electric, "cindy") RL fire pattern = WHOLE-MAG DUMP + single-rocket magnitude — LANDED.**
  Isolated cinderella-solo footage (`docs/probes/720-kit-audit/cindy solo neutral.MP4`, ammo-counter frame
  read + owner ruling + Fable pre-op APPROVED-WITH-REVISIONS) settles her unique cadence. She charges ONCE
  per mag (~1.0s = datamine `charge_time 100`), then autofires all 24 rockets at datamine `rate_of_fire 180`
  (3/s) WITHOUT recharging, reloads ~2.1s, re-charges → **~390 pulls/180s** (the old per-rocket-charge model
  fired ~300 = the COLD-0.937 cause). Wired via a new opt-in engine primitive `charFixes.magDumpRof` (dump
  cadence derived from the weapon table; inert for every other unit — regression byte-identical). `reloadFrames`
  72→120 (datamine `reload_time 200`; footage ~2.1s; the old ~1.2s read superseded). MAGNITUDE: per pull =
  ONE rocket (32.11% × 200% charge) + the 136.6% S1 rider — a same-footage popup recon (~97.5s, one ATK)
  reconciles both to ATK 80,385 (rider 109806 = 136.6%×ATK; rocket-core 103246 = 64.22%×2×ATK exact;
  datamine `shot_count 1`/`muzzle_count 1`), so the old TWIN-INSTANCE `normalAttackPct +100` was a 2× rocket
  over-credit and is REMOVED; the `chargeSpeedPct +45` cadence proxy is REMOVED (cadence modeled directly),
  retiring the subtractive-CS-formula landmine + the U25 divisive hypothesis (built on the ~315 popup-division
  estimate; the divisor was 2, not 3 — rocket + rider). Board 0.937→~0.90 COLD, within single-run recording
  variance on her clean comps (same team PE 0.98 vs PE2 0.88); ruled-out under-count sources: RL core rate is
  already the top-tier flat 0.95 (matches footage), and her HP→ATK is fully applied to her burst nuke (removing
  it drops her 43%). All measured FB counts preserved. Superseded: open-questions U25 (divisive-CS hypothesis).
  Trail: cinderella override note + caveats, U25.
- **(2026-07-21) Regression full-burst counts judged vs the SEEDED distribution, not the single EV run.**
  The FB count itself varies ±1 at boss-transition boundaries (the boss range-transition times + burst
  chain-cast gaps jitter per seed, `sim.ts` ~781/2127; the unseeded EV run pins them and can sit exactly on a
  burst-cadence collision any jitter avoids). So `scripts/regression.ts` now runs each graded comp over the MC
  seed set (`MC_SEED_BASE + i`, the set board-read uses) and PASSES when the measured value/range overlaps the
  seeded `[min,max]` — a comp fails only if the sim can NEVER produce a measured value. Per-unit total snapshots
  stay on the EV run (byte-stable mean; snapshot-gen ≡ verify). This removes the ±1 false failures (PE elec-DPS,
  T4/T7/N2/N4/N5) without weakening the measured-FB truth. Trail: `regression.ts` `fbDistribution`.
- **(2026-07-25) TRUE DAMAGE CAN CRIT — reverses the 2026-07-21 §2c ruling (owner ruling, in-game confirmed) — LANDED (docs/comments).**
  Owner re-tested in game and confirmed true damage crits. The 2026-07-21 entry below recorded a
  `crit && !trueFlavor` engine guard as LANDED, but **no such guard was ever implemented** (`git log -S` empty;
  `dealDamage` gates crit on `opts.crit` alone) — the engine has always critted true damage (`flatDamage`
  `crit: e.crit !== false`, riders `RIDER_CRIT`, dots `DOT_CRIT`, true swap normals `crit: true`), which matches
  this ruling. Corrected the engine comments (`sim.ts` RIDER_CRIT block + the `extraHitDamagePct` rider note)
  and the SSOT docs (game-mechanics §9, damage-calculation §2c) to match. No behavior change (the guard never
  existed), so no regression re-pin. Core-on-true-damage stays measured-gated ⚑ (unchanged).
- **(2026-07-21) TRUE DAMAGE CANNOT CRIT — engine `crit && !trueFlavor` guard (owner ruling) — REVERSED 2026-07-25 (the guard was recorded as LANDED but never implemented in code; see the 2026-07-25 entry above).**
  Owner mechanic ruling: true damage never crits (a game fact). Enforced at the engine — the crit-major
  block is guarded by `!opts.trueFlavor`, so every true-flavored hit is crit-exempt regardless of any
  per-entry `crit` flag: `flavor:"true"` dots/flatDamage (`ada` grenade DoT, `ein`/`laplace`/`chisato`
  true flatDamage) AND `trueNormals` swap windows (`chisato`/`takina`/`laplace`). This is partly a
  PRE-EXISTING bug the U13 DoT-crit flip exposed — the flatDamage true procs (ein/laplace/chisato) were
  already wrongly critting by default before the flip; `ada`'s true DoT started critting at the flip. Core
  is NOT ruled here (still ⚑ unverified — the chisato SMG coreMult 250 lever stands). Cleaned up the now-inert
  explicit `crit:true` on ein (×2) + laplace (×1) true entries and corrected chisato's note. **Board (isolated
  via board-read):** owner-predicted and confirmed — `chisato` 1.154→**1.119** (−0.035, N=3, over-credit
  removed); `ada` reverts 0.933→**0.903** (her U13-flip gain was purely the spurious true-crit; her COLD is a
  separate DoT under-model); `takina`/`ein` cool (true normals/feathers correctly lose crit; their COLD is
  separate/documented). Aggregate ~flat (weighted mean|ratio−1| 0.0710→0.0714 across the whole U13 landing) —
  a FAITHFUL correctness fix, not a fit change. Also recorded (owner): in our sim true flavor's only material
  effect is gating `trueDamagePct` buffs (like ada's) — the DEF-ignore is negligible at the boss's 140 DEF.
  Trail: engine `sim.ts` crit-guard comment; DoT-crit entry below.

- **(2026-07-21) DoT/rider crit ENABLED by default (`DOT_CRIT` flip OFF→ON, U13) — LANDED
  (owner-directed; full-board A/B + ONE consolidated Fable review APPROVE; faithful>fit, board-neutral).**
  DoT ticks + stored-hit releases now roll crit universally (this is the default; a per-dot explicit
  `crit` field still overrides it either way; core stays OFF; `DOTCRIT=off` is the A/B revert switch).
  The `extraHitDamagePct` function-rider path (`modernia` Destroy Mode, `nayuta` Memory Incineration,
  `neon-vision-eye` Super Firepower — hard-coded `crit:false`) is OUT OF SCOPE, still gated on per-rider
  footage. **Why faithful (mechanic multiply-confirmed):** ginmy /nikke_dot_test (elem-adv DoT ~47% crit
  vs ~10% elem-only) + `maiden-ice-rose` solo rider 437,296 white / 655,945 orange = ×1.5 + `little-mermaid`
  DoT sub-hit 450,314 = 337,736 × 1.333 (FB-crit). The two footage reads land on the two DISTINCT
  signatures of the engine's additive `major += critRate·critBonus` bucket (×1.5 out-of-FB, ×1.333 in-FB)
  — prove-it-differently on the mechanic AND its bucket placement. **Board = NET-NEUTRAL, NOT a fit win:**
  datapoint-weighted mean|ratio−1| 0.0710→0.0712, within-±3% count 6→7, within-±5% 12→11; 16 dot-unit
  sim-total snapshots drift +1.2–7.5%, EVERY measured-truth FB/rotation/no-op assert byte-stable; verify
  green. **Mixed per-unit (faithful>fit):** helps cold `ada`/`diesel-winter-sweets`/`anis-star`(N=12)/
  `cinderella-crystal-wave`/`privaty`; regresses already-hot `little-mermaid` (+0.025)/`jill` (+0.020)/
  `milk-blooming-bunny` (+0.030)/`mihara-bonding-chain` (+0.048). Each regressing unit carries a SEPARATE
  documented over-credit the missing crit was masking (LM SMG-normals; milk U23 deliberate overshoot; jill
  FB-uptime) — EXCEPT `mihara-bonding-chain`, which has no separate over-credit (suspected tuned-base
  double-count → follow-up). **The ÷1.075 "de-crit the calibrated base" prep step was DROPPED (owner):**
  a provenance audit found ~15/17 dot bases are kit-datamined true multipliers (NOT crit-absorbed), so
  ÷1.075 would have net-DEGRADED the board; and the two genuinely-tuned candidates don't behave
  crit-absorbed either — `mihara-bonding-chain`'s COLD comp 0.96→1.01 IMPROVES under crit (only her hot
  comp regresses), so her base was never uniformly crit-absorbed. **Follow-ups (queued, NON-blocking):**
  (1) `ada` `flavor:"true"` — the flip applies crit to TRUE-damage dots too; UNVERIFIED whether NIKKE true
  damage crits → maiden-solo-template footage check (ada-focus grenade-tick white/orange pair; white-only
  across ≥20 ticks ⇒ carve `crit:false` on her dot blocks + revert her BETTER move); (2) `mihara-bonding-chain`
  suspected tuned-base double-count → gated per-unit base review; (3) function-rider path stays separate.
  Trail: open-questions U13 (LANDED note), this session's provenance audit + A/B + consolidated Fable review.

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
  fit. Trail: `docs/handoffs/closed/2026-07-21-tove-sg-team-fix-preop.md`, `src/skills/overrides/tove.json`.

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
    - `interval:15 flatDamage 170.58` (recurrences t=15…165) = 12 hits/180s. **Behavior-identical** (solo
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
  _direct in-game measurement of the mechanic_ that contradicts the geometry (per the scientific-method
  gate), NOT a board-fit residual or another damage-calc back-derivation. Consistent with the
  faithful>fit / accuracy-to-observed-mechanics invariant — this promotes a directly-measured mechanic
  model over a fit, and is not a license to fudge. Cross-session pointer: memory `accuracy-geometry-is-ground-truth`.

- **(2026-07-17) DoT / periodic-damage crit is PER-DoT, not global (theme 12) — LANDED for isabel.**
  The engine gains a per-DoT `crit:true` opt-in (`types.ts` dot effect + `Dot.crit`; the dot-tick
  dealDamage falls back to the still-default-OFF global `DOT_CRIT` gate when the field is unset, so all
  other DoTs are byte-identical). A **universal DOT_CRIT default-on was measured-REFUTED**: a board sweep
  (DOTCRIT off→on) is a wash (±3% MAD count 8→8) and it _breaks_ units whose DoTs are validated non-crit
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
  - correct-direction: her N6 Wind comp **0.76 → 0.85** (partial close of her documented under-model, NOT a
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
  `docs/handoffs/closed/2026-07-17-hitrate-core-implementation-plan.md`. OPEN threads: asuka bracket refinement; quency
  cadence + overshoot; SG landing (H2, hit-rate→pellet-landing) NOT built (out of scope).

- **(2026-07-17) Timed pierce primitive (`gainPierce`) — LANDED and ENABLED on grave (faithful>fit); the
  residual HOT is a separate, now-isolated burst-window over-model (theme 5 / engine-modeling-gaps fix #7).**
  Static `hasPierce` couldn't express "Gain Pierce for N sec," so timed-pierce kits left their Pierce
  Damage ▲ buffs as dead blocks. Engine: added a `gainPierce` effect that sets a per-unit `pierceUntilFrame`
  window on the block's target(s); the damage-formula pierce gate is now
  `hasPierce || pierceUntilFrame > frame || opts.pierceActive`. **MECHANISM (owner-confirmed 2026-07-17):**
  Pierce Damage ▲ is a real **Damage-Up-bucket** entry (see damage-calculation.md) that applies to ANY
  pierce-damage-type unit — static or during a timed window — and **DOES apply on the partless scope-lock
  boss.** Only the _separate_ pierce **core+body double-hit** is multipart-only (`PIERCE_CORE_DOUBLE=false`);
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
  TRIGGER (a _permanent_ element-gated passive) — it could not express "when entering Full Burst / after
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
  (game source authoritative); role-audit D.2, owner decision a.** ⚠ **SUPERSEDED (2026-07-23) —
  disregard: flipped to 20.0/s frame-quantized (see the 2026-07-23 SMG-cadence entry at the top of
  this section). D.2 read the datamine as authoritative for the EFFECTIVE rate; a direct ammo-counter
  measurement (shots/second, higher tier than D.2's FB-count instrument) showed the gun fires on frame
  boundaries at 20.0/s.** The engine's SMG class default
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
    - a separate rotation over-generation bug (6 sim bursts vs 5 real, open-questions).
  - **Cinderella: Crystal Wave — core-strike rider restored, ~0.87 → 0.99/1.02 vs real** (T5/T8). Her FB-enter
    proc text = "Deals X% … as CORE STRIKE damage" and "activates when entering Full Burst"; the prior HT set
    `trigger:burstCast` (fires PRE-FB → loses the +50%) AND dropped `core:true`. Restored to text-faithful
    (`fullBurstEnter` + `core:true`, both MG/Snipe modes). **NARROWS (not reverses) the 2026-07-13 U1
    no-core ruling**: function-type additional damage stays no-core BY DEFAULT — the carve-out is riders whose
    text EXPLICITLY says "core strike," confirmed by single-variable measured tests on two comps. Drove the
    kit-parse rider-core text-fidelity rule.

- **(2026-07-16) Rapi: Red Hood's projectile-EXPLOSION class cores ~1/3, is DERIVED from the real rocket
  meter (120→60 in-FB cadence + in-burst instant detonation), and her fictional damage placeholders are
  removed — partially closing the "invisible X". CORE PORTION SUPERSEDED (2026-08-04, see the top
  entry): owner footage re-read rules the explosion SKILL damage — core-INELIGIBLE; `storedHit.core`
  removed. Everything ELSE here stands (the derived rocket cadence, instantInFb, placeholder removal,
  the CRIT follow-up). The "stickies never core" ruling cited below is OVERTURNED for the attach by
  the same-day ATTACHMENT REWORK (top entry) — the CORE-HIT labels were attachment cores.** Reopens the 2026-07-14 invisible-X entry below with new
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
  - the 5 graded comps that used them (PC, PD, N4, N8, N10) in `experiment.ts` + `regression.ts`. **Cost paid:
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
  (scope-lock / 8-of-12 / 12-of-12 overload lines). Frameworks: _Standard_ = Little Mermaid
  (Burst 1) + Crown + Helm + tested carry (four units, no Mast); _Hyper Carry_ adds Mast:
  Romantic Maid (Burst 2) as a fifth unit that bursts in sync with the tested carry; _Anis_
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
- **(2026-07-14) The scope-lock boss's DEF is negligible; `bossDef: 0` stands.** **[SUPERSEDED
  2026-08-10 — owner ruling: the scope-lock baseline is `bossDef = 140` (adopted "always on"
  2026-07-15, `scripts/lib/scope-lock.ts`); disregard the "0 stands" disposition. The
  measurements in this entry (boss-type DEF ≈140; ≤0.12% board impact of the whole term)
  remain valid.]** Enemy DEF in
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
  - boss-def battery; engine DEF placement (baseAtk subtraction) confirmed correct by ginmy
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

- **(2026-08-13) THE BURST-GAUGE ECONOMY CLUSTER: three of its four items were not open work.** The
  2026-08-10 gauge-economy pass ended in a batched proposal — land four interacting corrections
  together under `/scientific-method`, because their directions partially cancel. Picking that up
  2026-08-13, the bundle collapsed on inspection: two items were already answered and one was already
  landed, leaving one genuine unknown. Recorded here because the collapse, not the bundle, is what a
  future session needs to know.
  - **(a) U28 gauge half — ENCODED, no pipeline.** `extraHitDamagePct` emitted no burst gauge while an
    equivalent `flatDamage` proc emitted `skillGauge` per proc, so the two encodings of one kit line
    were not interchangeable. This was never an unknown: `docs/data/burst-gauge.md` §5 states the rule
    (every skill/additional-damage impact generates the caster's flat target per-shot value) and the
    measurement of record already existed — `maiden-ice-rose` solo, 12.55%/pull in two visible bar
    sub-steps = 910 (weapon 364×2.5) + 364 (rider, flat) — where her rider IS a
    `shotFired` → `flatDamage` block. Per the 2026-08-11 owner ruling (answered question ⇒ encode +
    `/code-review`, the onus on the code not the answer), `skillGauge(u, frame)` now fires at the
    `extraHitDamagePct` call site in `firePull`.
  - **Its board movement is ZERO, BY MECHANISM — no comp shape can expose it.** A field-form sweep of
    every file in `src/skills/overrides/` (185 of them) finds exactly four carriers, each holding
    exactly ONE rider, each a `burstCast`-triggered buff: `modernia` 15s, `nayuta` 10s,
    `neon-vision-eye` 10s, `neon-blue-ocean` 7s. `addGauge` is locked for the burst chain and Full
    Burst, and every window closes inside that lock — **but the argument is PER-CARRIER and turns on
    the unit's BURST STAGE, which is exactly where this entry went wrong twice before it was right:**
    - `neon-vision-eye` / `neon-blue-ocean` — Burst III, so the cast granting the rider IS the cast
      that opens a 10s Full Burst 22f later. Window strictly inside.
    - `modernia` — Burst III, and the apparent exception at 15s. She is not one: the SAME `burstCast`
      also grants `fullBurstExtend: 5`, so HER Full Burst runs cast+22f .. cast+15.37s and her rider
      closes inside her own extended window.
    - `nayuta` — **Burst II**, so her cast opens the STAGE-3 window, not a Full Burst; the
      `stage !== 0` half of the lock is what covers her, not `fbEndFrame`. If the chain completes she
      is locked through Full Burst. If it COLLAPSES, `stageExpireFrame` (her cast +
      `CHAIN_TIMEOUT_FRAMES`, 600f) coincides exactly with her rider's own 600f expiry, and buffs die
      on `expiresFrame <= frame` while the stage resets on `frame >= stageExpireFrame` — so the
      exposure hole is exactly ZERO frames. ⚑ That coincidence is DEFAULT-ONLY: under the
      `CHAIN_TIMEOUT=120` A/B arm the chain dies 8s before her rider does and she would generate.
    - Empirical confirmation (`--lock-census`): 0 unlocked emissions everywhere — `modernia`
      2103/2103 in the `liter`/`crown` control comp and 2001/2001 in N2
      (`d-killer-wife`/`naga`/`chisato`/`ein`, seating neither `liter` nor `crown`; the same comp
      under `experiment.ts`'s default 25-seed MC reads 50,795/50,795), `neon-blue-ocean` 2044/2044,
      `neon-vision-eye` 21/21, `nayuta` 55/55. ⚑ `nayuta`'s coverage is thin on purpose-worth-noting
      grounds: her rider never fires in the control shape (`crown` takes every B2 cast), so T5
      wind-weak is her only row and the mechanism argument is doing the real work for her.
    - **TWO caught errors worth keeping, because both are the same mistake: assuming the nominal
      rotation instead of reading the carrier's own.** (i) The first write-up demoted `modernia` to
      "inert by measurement only", reasoning that her 15s rider "outlives Full Burst by ~4.6s" —
      arithmetic against a 10s Full Burst she never has. The census's flat 15.0s emission windows are
      HER EXTENDED FULL BURST, not a rider spilling past one. (ii) The correction then over-generalised
      the other way — "every window closes inside the Full Burst its own cast opens" — which is false
      for `nayuta`, who is Burst **II** and opens no Full Burst at all. Both were caught by the
      cross-family code review (kimi-code/k3), neither by the author; the second was introduced BY the
      fix for the first, which is the usual way a correction pass goes wrong.
      **So: reason about a carrier against the rotation its OWN cast produces.** Two cheap checks,
      both of which settle it in one command: `characters.json` `burst` for the stage, and
      `ROT=1 SEEDS=1 ONLY="N2 modernia wind" npx tsx scripts/experiment.ts` for the Full Burst
      lengths — the ones `modernia` casts run 15.0s (6.2→21.2, 46.8→61.8, 86.7→101.7, 126.4→141.4,
      165.5→180.5), the ones she does not run 10.0s (28.7→38.7, 69.6→79.6, 108.4→118.4,
      148.8→158.8). `fullBurstExtend` carriers today: `d`, `isabel`, `mihara`, `modernia`,
      `soda-twinkling-bunny`, `vesti`.
    - **What would actually expose the emission:** a carrier whose rider window outlives the Full
      Burst its own cast opens (none today), or a chain that expires mid-window.
    - Both readings hold in the refill-bound "charge-B3" comps the 2026-08-10 handoff asked to re-check
      before generalizing: T5 wind-weak (`nayuta`) 55/55 locked; the other three disabled comps seat no
      `extraHitDamagePct` carrier at all, so U28 cannot be part of their shortfall.
    - `scripts/experiment.ts` output is byte-identical before/after; `verify.sh` green, snapshot
      untouched. Instrument, committed per constraint 9: `scripts/battery/u28-gauge-ab.ts
--lock-census`, reading a new engine tap (`DBG_RIDERGAUGE`) at the emission site. It answers
      "where does the emission LAND", which is a sharper question than the 2026-08-10
      exaggerated-encoding arm's "what does it move" — that arm can only ever show absence.
  - **(b) The "skillGauge fires twice per shot on shotFired-triggered flatDamage riders" entry
    (2026-08-03) — CLOSED as NOT A DEFECT.** It described one `shotGauge` (weapon) plus one
    `skillGauge` (rider) on the same pull as double-crediting. That is exactly the `maiden-ice-rose`
    anchor above: her measured 12.55%/pull IS the two emissions, reproduced exactly by the current
    code. The 2026-08-10 pass had already failed to reproduce a defect by inspection and correctly
    declined to "fix" it; what was missing was the connection to an existing labeled measurement. No
    code change. **This removes the only gauge-DOWN direction from the cluster**, which is what let
    the remaining item land alone instead of as a bundle (the compensating-errors rule binds when
    corrections genuinely cancel — here there was nothing to cancel against).
  - **(c) Theme 20 (`fullChargeBonus` sourcing) — LANDED 2026-08-08, recorded retroactively.** Commit
    `ccee21f7` ("Slice G") already sources the SR/RL focus multiplier from
    `characters.json.chargeMultiplier`, keeps `gauge-per-shot.json`'s `fullChargeBonus` as an explicit
    override only when `characters.json` reports 0 (`raven`), and added
    `scripts/tests/data/gauge-per-shot-source.test.ts` as the lint (it also pins `belorta`, `n102`,
    `yan`, `yuni` so the no-row 3.5× units cannot silently fall back to 2.5×). It carried no DECISIONS
    entry, so both `docs/engine-modeling-gaps.md` §20 and the 2026-08-10 handoff still described it as
    "not yet done" three days later, and it was queued as work. §20 is now deleted (capture-first: this
    is the capture).
  - **(d) The charge-B3 gauge-fill-tempo gap stays open and unbundled** — the one genuine unknown, and
    the only part that wants `/scientific-method`. The 2026-08-03 LOG record already names what lifts
    it from MEDIUM to HIGH: frame-measure the real FB-end → next-B1 gap on ONE disabled comp's footage
    (`docs/probes/u8/u8 g vid.mov` is "iron sweep run G"), rather than any downstream proxy.
  - **Method note.** Two of the four items dissolved against artifacts already in the repo — a
    measurement and a commit. The cost of not checking was a bundling constraint that held the whole
    cluster hostage for three days. Same shape as the SUFFICIENCY rule's original case: search the
    tree before planning the work.

- **(2026-08-13) OFF-BOARD BUFFERS ARE CUT FROM THE POPULATION, NOT HIDDEN AT RENDER — a row that
  exists in the artifact occupies a rank, whoever refuses to draw it.** Owner-reported bug: the unit
  card / infographic showed **Crown as #2 on Team Buffs while the web board showed her #1**.
  - **Cause.** The 2026-08-03 owner direction to hold `chime` and `avistar` off the Team Buffs board
    was implemented as a render-time name filter (`HIDDEN_BUFFER_SLUGS` in `rankedBufferRows`). The
    two hosts that call it — the web bars (`web/src/rankBoardsData.ts`) and the share/pre-render
    table card (`src/infographics/core/rankTables.ts`) — numbered correctly. The unit card does not
    call it: `bufferTile`/`bufferChart` (`src/infographics/core/unitCardData.ts`) read a rank
    straight off the artifact index (`hit.index + 1`), and `chime` sat at index 0 (+142.7% generic)
    directly above Crown. Every rank below an off-board row was off by one, the field size counted
    units the board does not rank, and the neighbourhood charts could draw an off-board unit as a
    neighbour.
  - **Ruling (owner, 2026-08-13): remove them from consideration entirely, not just from the front
    end, so there is nothing downstream to get wrong.** The exclusion now bites at the board's
    POPULATION — `bufferPopulation()` (`src/ranks/buffer.ts`), one function called by both
    `scripts/build-bufferchart.ts` and `scripts/probe/buffer-rotation-audit.ts` (it was a copied
    predicate in two places; the audit can no longer describe a board that does not ship). No value
    is computed for an off-board unit and it has no row in `bufferchart.json` at all, so no consumer
    — present or future — can rank over it, count it, or draw it.
  - **Renamed to say what it now means:** `HIDDEN_BUFFER_SLUGS` → `OFF_BOARD_BUFFER_SLUGS`, and
    `rankedBufferRows` splits into `onBoardBufferRows` (name filter only) + the ≥ 0 rule. The unit
    card uses the former, so it keeps quoting a unit's own value whatever its sign — the deliberate
    behaviour the negative-row rule was never meant to touch — while numbering over the same set as
    the chart. **Both name filters stay** as a backstop, and PR CI is not a hypothetical caller of
    them: it does not BUILD the boards, it FETCHES the published set
    (`scripts/fetch-published-boards.ts`, Step 0; the `artifacts` tier then runs with
    `SKIP_BOARD_BUILD=1`), so on every PR until the next deploy the smoke runs against an artifact
    that still contains the off-board rows. Without the render-time filter that stale row
    reintroduces the same off-by-one.
  - **⚠ A SOURCE-LEVEL ASSERTION CANNOT BE MADE AGAINST A FETCHED ARTIFACT — this cost a red CI.**
    The first version of `scripts/web-smoke-ranks.mjs` hard-asserted that `bufferchart.json` carries
    no off-board slug. That is a property of the BUILDER, and PR CI's copy did not come from the
    builder, so the assertion failed on exactly the input the backstop exists for. It now keys off
    the artifact's own `inputsHash` vs `computeRanksInputHash()` — the same escape hatch
    `board-hash-parity.test.ts` takes, on the artifact's hash rather than on which env var the
    workflow happened to set (the `artifacts` step sets `SKIP_BOARD_BUILD`, the gate step sets
    `BOARDS_FETCHED`). Built-here ⇒ hard-assert the source property; fetched/stale ⇒ the population
    check is advisory and what is under test is the backstop, which is what has to hold there
    anyway. Either way the smoke PRINTS which mode ran: a source check that silently evaporates
    reads as a pass. Verified in both modes locally by pointing `dist/bufferchart.json` at the
    pre-change build.
  - **Measured A/B — old builder vs new, same HEAD (`145a97e9`), full shipped board, both cells**
    (`npx tsx scripts/build-bufferchart.ts --out …`, then a row-for-row compare): population
    127 → 125, rows 133 → 131 per cell, and **every remaining row is element-for-element identical
    on both `generic` and `typed`**, as is the `units` map minus the two entries. That is inert by
    MECHANISM, not just in this fixture: `bufferValueFor` scores each unit against its own
    stage-matched no-op baseline and `rankBuffers` only maps over the population, so no unit's
    number can depend on which other slugs were computed. Consequences: `crown` +105.1% is now the
    artifact's #1 as well as the board's, and her card reads **#1 of 131 rows** with a `default`
    rank of 4 (it read #2 before). `chime`/`avistar` cards read Team Buffs _unranked_ rather than
    quoting a rank they are excluded from. Everything else is untouched: both units are still simmed,
    still rank on burst-gen and B1/B2 DPS, and still serve as the `with-chime` / `with-avistar`
    partners on the B1/B2 board's Crown and Anis: Star rows.
  - **Evidence / pins:** `scripts/tests/ranks/buffer.test.ts` (population excludes them, and they are
    still real sim-supported B1/B2 units so the exclusion is not passing for the wrong reason);
    `scripts/tests/share/unit-card-data.test.ts` (a stale off-board row does not offset the ranks
    below it; an off-board unit's own card is unranked; no card anywhere draws an off-board row);
    `scripts/tests/share/table-share.test.ts`; `scripts/web-smoke-ranks.mjs` (asserts absence from
    the shipped artifact's rows AND its `units` map, then from the rendered DOM).

- **(2026-08-11) `chargeCounter` routes through `applyBlock` — the F2.1 bypass is fully closed, and
  the validator rule that guarded it is REMOVED in the same change.** Owner-approved engine edit;
  isolated worktree + PR per constraint 8.
  - **What was still broken.** The 2026-08-10 fix added a direct `blockGatesPass` call so the runtime
    abort-gates bound on this trigger, but the dispatch still called `applyEffect` itself, so
    `everyN`, `everyNOffset` and the block-level `delaySec` were silently skipped. The validator
    hard-errored on that combination precisely so nobody shipped a field that looks live and never
    runs — and its own comment said to drop the rule when the engine routed the trigger. Done.
  - **Why it could not route before, and what unblocked it.** `applyBlock` applies ALL of
    `block.effects`; `chargeCounter` applies ONE — `block.effects` is an ordered PHASE list for this
    trigger (`scarlet-black-shadow`'s three). `applyBlock` now takes an optional `phase` selector
    (threaded through the `delaySec` deferral queue as well, so a deferred phase lands as the same
    phase), and returns whether the activation LANDED.
  - **The semantic call, which had no carrier to settle it.** The phase advances only on a LANDED
    activation, so an activation suppressed by a gate or by `everyN` re-offers the same phase rather
    than skipping it. The alternative (advance on every activation) would silently re-order a
    carrier's phases across different damage flavors. This is asserted directly, not inferred from a
    total: her three phases have distinct `atkPct` (283.03 / 565 / 848.03), so the event log reads
    the phase order back.
  - **Behaviour-neutral, by census not by assumption.** All 12 shipped `chargeCounter` blocks were
    scanned for every gate field — zero carry any, so nothing shipped changes; the regression
    snapshot is byte-unchanged and was NOT regenerated. Eleven of the twelve carry a single effect,
    where the phase path is trivially the old path.
  - **A behaviour-neutral change is unfalsifiable without a fixture that exercises what it enabled**,
    so `scripts/tests/engine/charge-counter-gates.test.ts` covers everyN / everyNOffset / delaySec /
    the gates / phase integrity, and its 4 new-behaviour assertions were MUTATION-CHECKED: with the
    engine change stashed they fail, while the 5 preservation assertions pass on both engines.

- **(2026-08-11) Code citations name the SYMBOL, never the line — swept and gated (audit F1 /
  phase 0.3).** 78 bare `file:line` citations rewritten across 28 overrides + 7 durable current-state
  docs; `scripts/sweep-line-citations.ts --check` is now a `verify.sh` step so new ones cannot land.
  - **The rot was near-total, and that is the argument.** Of ~40 distinct `sim.ts` lines cited in
    override prose, nearly all had drifted onto unrelated code — `2568` ("flatDamage generates
    gauge") had become a `const fdRampMul`, `1727` ("the hit counter adds hitsPerShot") the
    burstDesc amp comment, `types.ts:368` (the ownBurstGate canonical example) a `shield` effect
    type. So each was not merely imprecise but actively misleading, and every reader who followed
    one paid a verification pass. Each replacement was resolved by finding what the PROSE describes
    in today's engine, never by trusting the stale number.
  - **What is deliberately NOT swept, and why.** CHANGELOG-class docs (`DECISIONS.md`,
    `answered-questions.md`, `probe-runs.md`, the `closed/` archives), generated docs
    (`unmodeled-entries-review.md` — it follows its source), and DATED session records
    (`docs/handoffs/2026-08-10-…`). A dated findings doc's citation is a statement about the tree on
    that date; rewriting it edits history rather than fixing a pointer, the same property that makes
    CHANGELOG docs append-only. The 14 skipped files are LISTED BY NAME on every run rather than
    silently dropped. Extending to them later is a map extension, not new tooling.
  - **Prose whose SUBJECT is a bare citation is exempt** (the CONVENTIONS paragraph teaching the
    rule, the QUEUE item) — a `KEEP` set in the script, because a codemod that "fixed" the
    counter-example would delete the thing it teaches.
  - **Safety properties.** Literal text substitution on raw bytes — overrides are never parsed and
    re-serialized, which would reformat every file. Provenance labels re-derived and compared across
    all 183 units before/after: ZERO changed, so the machine-read half of override prose
    (`kit-status.json` `kitParse.provenance`) is untouched; the one mirror diff is the citation text
    itself propagating into `frima`'s `unmodeled` entries. `verify.sh` green.

- **(2026-08-11) Same-slot BLOCK ORDER is guarded by a PINNED CENSUS, not by a lint — because both
  orders are legitimate (faithfulness audit F2.5, phase 1 item 4).** `requiresTargetStatus` and
  `resourceGate` are evaluated at TRIGGER time; `targetStatus` and `resource` effects write at APPLY
  time; blocks resolve in array order (`SLOTS.flatMap`, `src/skills/index.ts`). So when one unit both
  writes and reads the same name inside ONE slot array, the two blocks' relative position decides
  whether the gate opens on the frame the value is written — and a reorder flips that with no engine
  error, no validator error and a green suite.
  - **Why not a rule.** The audit's own minimum-viable framing was "flag a gate-consuming block whose
    producer sits earlier in the same slot array". Building it showed that would be wrong half the
    time: `phantom` DEPENDS on consumer-first (her Calling Card gate sits at `skill1[0]`, the inflict
    at `skill1[1]`, so the shot that applies the card does not itself benefit), and `d-killer-wife`
    DEPENDS on producer-first (`burst[0]` inflicts 'Wipe Out', `burst[1]` reads it on the same
    burstCast frame — her caveat says "do not reorder"). There is no correct order to lint toward,
    only a load-bearing one to pin.
  - **What landed.** `blockOrderPairs()` / `blockOrderCensus()` in `src/skills/validate-structural.ts`
    (pure, same-slot only); the census pinned in `scripts/tests/fixtures/block-order-pairs.json` and
    asserted by `scripts/tests/block-order-guard.test.ts`; regeneration only via
    `npx tsx scripts/lint-target-status.ts --update-block-order`; and the `structuralCheck` warning
    rewritten to name the ORDER SHIPPED rather than merely the existence of a pair.
  - **Scope, and what it found.** CROSS-slot pairs are excluded — their order is fixed by the slot
    flatten order and no edit inside a slot array changes it. The `resource`/`resourceGate` family is
    included: `src/skills/types.ts` documents the identical hazard ("a spend placed AFTER the
    resource-gated blocks lets those gates read the PRE-spend pool"), and it is where the exposure
    actually is — **34 pairs across 14 units, of which only 2 are the status family the audit named.**
    The `same-block` case (one block writes and reads the same name: `e-h`, `mana`, `phantom`,
    `rouge`, `elegg-boom-and-shock`) is recorded too, so SPLITTING such a block is as loud as
    reordering one. Behaviour-neutral: nothing in the engine, the overrides or the snapshot changed.

- **(2026-08-03) `noop-rouge-b1` STAYS IN `src/data/squads.ts` — OPTION C, OWNER-CONFIRMED.** Closes
  the `docs/handoffs/closed/2026-08-03-b1b2-comparability-and-squad-layering.md` open call: the
  ranks-layer synthetic (a presence-only no-op Rouge B1 that satisfies `blanc`'s same-squad burst-CDR
  gate for the buffer board's `w/ Rouge` duo profile) stays put rather than moving behind a
  registration mechanism. Option A (`registerSquad()` called from the ranks layer at module load) was
  already ruled out as a trap in that handoff — it makes the engine's `sameSquad` gate depend on
  import order, and the failure mode is untestable in principle (any test importing `buffer.ts` to
  check the registration also fires the very side effect it would need to catch absent). Option B
  (carry squad membership on the prepared unit instead of a global lookup) is the one that actually
  fixes the layering, but touches `sim.ts`'s block filter, a protected path — not built without a
  separate go-ahead. Cost of C is conceptual purity only: one synthetic in a curated GAME-TRUTH map,
  already carrying an explanatory comment (`src/data/squads.ts:23-26`), documented again in
  `noir.json`'s prose. Not revisited unless a second synthetic-partner pattern makes the layering
  concern compound.

- **(2026-08-03) A TREASURE UNIT'S `releaseDate` IS ITS TREASURE'S RELEASE DATE — and the "sugar
  data bug" was never a bug, it was the column silently disagreeing with itself.** `releaseDate`
  is display-only (the unit card's "Released &lt;date&gt;" line; the engine never reads it) and
  reaches `data/characters.json` from bakery-bot's `attributes` blob, which takes the FIRST date of
  whichever Synergy `attack_damage_characters` row the DB matched the unit to. Synergy carries a
  Treasure as its own row — `宝` + the base unit's Japanese name — with its own release date, so
  that match decided everything. **Audited the full column against the live DB + Synergy
  (`scripts/audit-release-dates.ts`, 2026-08-03): all 195 units with a Synergy row carried exactly
  their matched row's first date — zero transcription errors — but 18 of the 21 Treasure units were
  matched to the base row and 3 (`drake`, `laplace`, `sugar`) to the `宝` row.** So `sugar` reading
  2026-07-23 was not a per-unit anomaly to fix upstream, and the QUEUE's suspicion that `drake` and
  `helm` had "held each other's dates" is REFUTED: both Treasures released 2025-01-16, and the two
  units simply sat on opposite sides of the same base-vs-`宝` split.
  **Owner ruling: show the Treasure date.** This roster carries the Treasure version of those 21
  units — `name` is suffixed "(Treasure)", the kit prose is the Treasure kit — so the card states
  when that version arrived. `src/data/sync.ts` now resolves the `宝` row from the unit's own
  Synergy entry rather than trusting the upstream match, which needs no hand-maintained id table
  (it resolved all 21 on the first pass) and makes the column uniform instead of 18/3.
  Landed with the 18 dates regenerated through `npm run sync`, pinned by
  `scripts/tests/data/release-dates.test.ts`, re-auditable with `scripts/audit-release-dates.ts`.
  Consequence worth knowing: `/characters` "New Characters" already excluded Treasure entries for
  an independent reason (a Treasure upgrades an existing character), and that filter is now
  load-bearing — Treasures ship in same-date batches that would otherwise crowd the row.
  `anne-miracle-fairy` remains the one unit with no date; Synergy has no row for her.
  **Treasures got their own row instead (owner, same day): "New Favorite Items", a 30-DAY WINDOW
  rather than a fixed count.** The two rows answer different questions — "New Characters" is a
  standing row that should look the same in a quiet month as a busy one, while a Treasure batch is
  an EVENT that drops several units on one date and then nothing for months, so a fixed count would
  either truncate a batch or pad it with year-old Treasures. The section hides itself when the
  window empties, which is its resting state most of the year. **The cutoff is UTC on both sides,
  by owner ruling** — one global instant flips the row for everyone at once, which suits a roster
  whose release dates are themselves global game dates, and it makes the boundary a single testable
  moment instead of 38 of them. The accepted cost is that a viewer far enough west loses the row
  during their afternoon of the last day. This re-opens the date-window bug class the 2026-08-02
  fixed-count ruling had closed by construction, but not the BUG: the original failure was a
  `toISOString()` that mixed a LOCAL Date into a UTC comparison, and both-sides-UTC is coherent
  where the mixed version never was. UTC days are exactly 86,400,000 ms with no DST, so the day
  count is exact and needs no rounding.
  **The window is one-sided — no lower bound** (owner: Treasures have no banner, so their date is
  always "out now" and never an announcement ahead of release, leaving no future-dated case to
  guard and no reachable branch to write). Logic lives in `web/src/releaseRows.ts` (split out of
  the page so it is testable without mounting React); the boundary is pinned at fixed UTC instants
  by `scripts/tests/share/new-favorite-items.test.ts`, green under UTC, UTC−8, UTC+14 and UTC+5:30.

- **(2026-08-01) THE UNIT-CARD GOLDENS ARE FROZEN AGAINST A COMMITTED SOURCE SNAPSHOT — a golden
  image pins the RENDERER, and joining one to live data buys nothing and costs twice.**
  `unit-card.{discord,twitter}.png` were the only two of nine goldens built from the live rank
  boards (`web/public/*.json`, gitignored build outputs), so they carried a `HAVE_BOARDS` skip.
  That cost them in both directions. **They never ran anywhere automated:** CI runs `verify.sh
full` and the deploy box now runs `verify.sh artifacts`, and neither builds the boards before
  vitest — so the only place the two executed was a dev machine that had run `npm run dpschart &&
ranks:all`. **And where they DID run, unrelated commits failed them:** on 2026-08-01 the pair
  failed at 99.891%/99.894% against the 99.9% gate purely because crown's Burst Gen rank moved
  #37 → #41 — her rate unchanged at 3.9%/s, the drift confined to the rank glyphs — after the
  kit-autonomy gauntlet batch landed mica-snow-buddy (#2), maxwell-ordinary-mechanic (#12) and
  label (#16) above her. **Ruling:** the goldens build from
  `scripts/tests/fixtures/unit-card-sources.json`, a committed snapshot of the join's INPUT,
  refreshed deliberately with `npm run fixtures:infographics -- --sources`. The picture is now a
  pure function of the renderer, which is the property a golden exists to assert; the LIVE join is
  `unit-card-data.test.ts`'s job, which reads the real boards. Do not re-couple these two to
  `loadUnitCardSources()` — the skip and the false failures come back together.
  **Known hole, measured 2026-08-01 and NOT closed by this entry:** `unit-card-data.test.ts` skips
  its artifact-backed cases without the boards, and no automated context builds them — 25/25 pass
  on a built tree, but **10 pass and 15 SKIP** wherever the boards are absent, which today is every
  CI run (`verify.sh full`) and the deploy box (`verify.sh artifacts`, no gate). So the live join
  currently has no automated coverage anywhere. This entry does not make that worse — before it,
  the goldens skipped in exactly the same places — but it does make it visible, and it is now cheap
  to close: `npm run dpschart` fell from 245s to 16s worst-case (entry above), so building the
  boards in CI costs ~25s locally / low minutes on a runner, versus the "multi-minute
  build-dpschart run" that put them out of `verify.sh full` in the first place.
  **CLOSED the same day (owner: "CI minutes are free, the only cost is time, which is negligible
  here"):** `npm run dpschart && npm run ranks:all` now runs as a STEP in both `ci.yml` and
  deploy.yml's gate job, before `verify.sh full` — deliberately a workflow step rather than a
  member of the `full` tier, so a fresh isolated engine worktree can still run `full` with no board
  build, which is the property that excluded them originally. Verified by simulating a fresh
  checkout (all five board artifacts moved off disk): the step completes in 24s and
  `unit-card-data.test.ts` + `infographics-golden.test.ts` go from 23 passed / 15 skipped to
  **38 passed / 0 skipped**. **Evidence the switch is inert:** with the snapshot in place
  all nine fixtures render at 0 differing pixels (so the trim drops nothing the card reads), and
  the golden file passes 13/13 with the five board artifacts moved off disk — previously 2 of
  those skipped. The snapshot is trimmed to what the card actually reads (the fixture slug's
  character/tag/OL/Tsareena entries, the four rank boards whole for neighbour rows, dpschart
  narrowed to the two cells `unitCardData.ts` names, imported rather than copied so a cell-id
  change cannot leave it silently holding the wrong one) and the generator REFUSES to write when a
  board is missing, so an all-Unranked empty-state card can never be frozen as if it were real.

- **(2026-08-01) THE RAILWAY BUILD STOPPED BEING THE CORRECTNESS GATE, AND THE DPS-CHART SKIP
  GATE WENT TWO-LEVEL — production builds were failing with BuildKit `DeadlineExceeded`.**
  Measured on a 28-core box, `verify.sh deploy` — the entire railway.json `buildCommand` — was
  ~400s: `npm run dpschart` 245s (single-threaded), the correctness gate 111s (vitest alone is
  ~576 CPU-seconds across workers, so it degrades sharply on a builder with few cores),
  infographics 26s, ranks 8s, web build + smokes ~5s. Three rulings.
  **(1) The gate moved off the deploy box.** `railway.json` now builds `verify.sh artifacts` — a
  new tier that runs the build outputs only (DPS-chart + rank-board artifacts, web build, the
  three client smokes, infographics, server bundle) with no typecheck/regression/vitest. Those
  were already running on the SAME commit in ci.yml, so the build container was paying for them
  twice inside the one place with a hard deadline. The safety property is preserved by upgrading
  deploy.yml's pre-flight from typecheck + `npm test` to the full `verify.sh full` gate with
  `needs:` on the deploy job: a red gate still means no deploy, it just fails on a runner with a
  30-minute budget. The owner's stated workflow — push to main impatiently to get code onto main,
  without waiting — survives, because main updates on push and the workflow run can be cancelled.
  The smokes deliberately STAY on the deploy box: they validate the artifacts that box just built.
  **(2) The DPS-chart skip gate is now two-level, keyed on what actually moves a number.** The
  single all-or-nothing `inputsHash` (2026-07-29, below) covered all ~93 override files wholesale,
  so every kit-autonomy gauntlet commit invalidated the entire 90-cell matrix — i.e. the skip
  almost never fired on the deploys that actually happen. It is split into a GLOBAL hash (engine,
  matrix/run code, shared data tables, and the CONTROL units' overrides + character entries — a
  control sits in every cell's team, so it moves every tested unit) and a PER-UNIT hash (each
  tested slug's own override + characters.json entry + bossing-tier). When a prior artifact's
  globalHash matches, only units whose own hash moved are resimulated and the rest carry over
  verbatim. **This is sound because each tested unit is simulated ALONE in a fixed control team**
  — its dps depends on no other tested unit, so a cell's ranking is a sort over independent
  numbers. The control set is DERIVED by assembling every (cell × tested row) rather than
  hand-listed, so adding a control in `matrix.ts` cannot silently desynchronize the bucket. An
  override belonging to neither a control nor a tested unit is now hashed by NEITHER bucket, and
  correctly so: `prepareTeam` only indexes `deps.overrides[<team member slug>]` and never iterates
  the map, so such a file cannot reach the artifact's numbers. The 2026-07-29 fail-open discipline
  is unchanged and extended — stale format, a missing carry-over row, or any network/parse doubt
  all fall straight back to the full rebuild.
  **(3) The same per-unit decomposition is the parallelism axis.** Rows fan out to child processes
  of `build-dpschart.ts` itself (`--rows`, inheriting the tsx loader flags verbatim), each owning
  its own optimizer memo — nothing is shared and the merge is a sort. Ranking now rounds BEFORE
  sorting, with a stable tiebreak on the name-sorted tested order, so a carried-over row (which
  only has the prior artifact's already-rounded value) ranks identically to a freshly simulated
  one. **Evidence:** parallel output is byte-identical to the serial baseline across all 90 cells
  — values and ordering — and a partial rebuild is byte-identical to a full one; a corrupted
  globalHash falls back to full; the dpschart web smoke is green. Timings: full rebuild 245s →
  16.4s, one changed unit → 6.7s, nothing changed → 1s, and the whole `verify.sh artifacts` tier
  53s including a worst-case full chart rebuild. Pre-building the artifact in GitHub Actions and
  shipping it via `railway up --no-gitignore` was considered and NOT done: `railway up` respects
  `.gitignore`, so it would need either a `.railwayignore` re-listing every exclusion (a wrong one
  uploads the gitignored `docs/probes/` media) or an artifact staged at a non-ignored path, which
  reintroduces the "a stale committed copy reports green on an older engine's output" hazard that
  the 2026-07-29 entry already rejected. With (2) and (3) the deploy box's worst case is a full
  rebuild it can now do in well under a minute, so the complexity buys nothing. It stays available
  if the build budget ever tightens again.

- **(2026-07-28) SHAREABLE SAVED CONFIGS — three owner rulings on how a shared card gets its
  numbers, its id, and its URLs.** A card rendered server-side from a build code alone can only
  show a SELECTION, so the roster/team cards printed literal zeros; and a `?b=` share link for a
  populated roster is ~3.3 KB, too long for a Discord embed.
  **(1) The numbers are a browser-computed SNAPSHOT stored with the config — the server never
  sims.** The alternative (run the sim on a cache miss) was rejected: it pulls the PROTECTED
  `src/engine/**` into the server bundle, makes a cold render seconds long on one Railway
  instance, and would need the render-concurrency cap first. The accepted cost is staleness — an
  engine change does not move a stored number — so a snapshot's `at` timestamp is REQUIRED, and a
  card drawn from one prints "simmed &lt;date&gt;" in its footer, making a pre-patch card
  self-identifying instead of silently wrong. Results with no timestamp are DISCARDED (they
  degrade to the no-numbers composition card) rather than printed undated.
  **(2) The config id lives in bakery-bot's existing `user_profiles` store, behind a public read
  that is ALLOWLISTED BY KIND (`sim-share`).** A `shared_configs` table owned by nikke-sim's own
  server was rejected: that process has no database layer at all (only `src/data/sync.ts` uses
  `pg`). Kind-scoping is the whole safety argument — the same store holds genuinely private rows
  (a user's include/exclude Nikke lists), and a per-row `shared` flag would have needed a
  migration. Any non-allowlisted kind 404s exactly like a nonexistent id, so the route cannot be
  used to probe which profiles exist, and `discord_id` is never returned. Within the share kind
  the model is "anyone with the link" — which is already what posting the card to Discord means.
  **(3) `POST /api/v1/img/render` returns BOTH urls, `{url, imageUrl, pageUrl}`.** A Discord embed
  needs an image URL for the picture and a separate page URL for the clickable title, and only the
  caller knows which slot each fills. `url` is kept as an alias of `imageUrl` so the existing bot
  client is unbroken; `pageUrl` appears only for a request that named a config id, because a bare
  build code has no short page to link to.
  **The load-bearing invariant behind all three: the id is a HANDLE, never part of the content
  address.** `?id=` is expanded to `{build, results}` BEFORE the cache key is computed, so a
  re-saved config mints a NEW image rather than mutating one already posted, an evicted card
  re-renders from its spec sidecar with no network call, and `?id=<X>` lands on the same cache
  file as the equivalent `?b=<code>` request. `RENDERER_VERSION` was deliberately NOT bumped: the
  results field is APPENDED to the key only when present, so every existing no-results key stays
  byte-identical and nothing on disk was orphaned (the pinned key strings in
  `scripts/tests/share/render-spec.test.ts` passing unchanged is the check).
  Landed: nikke-sim `f025cc8` (branch `infographics-card-fixes`), bakery-bot `f2f9af1`.

- **(2026-07-26) DOCS + AGENT-AUDIT WORKFLOW SLIMMING — nine owner rulings on the review doc
  `docs/handoffs/2026-07-26-docs-and-audit-workflow-review.md` (CLOSED, in `docs/handoffs/closed/`).**
  The review mapped the documentation/audit apparatus and priced its duplication (one model-routing
  change cost 5 coordinated file edits; landed work recorded 3–5 times; per-unit status in 3 stores).
  Rulings + landings:
  **(1) One canonical instruction file.** `CLAUDE.md` is THE handoff/instruction file; `QWEN.md` and
  `AGENTS.md` are thin shims (read CLAUDE.md + a harness-specific block only — Qwen: front-end role +
  dispatch bridges; Kimi: hook wiring + skill mirrors). A rule edit is now a 1-file edit.
  **(2) The work queue is session state, not instruction.** The NEXT INCREMENT section moved out of
  `CLAUDE.md` into `docs/handoffs/QUEUE.md` (live TODO + autonomous queue + tier-0 threads, with the
  pointers-only hygiene rule); CLAUDE.md keeps durable rules + verified facts (654→~230 lines).
  **(3) Open-questions single numbering.** A question keeps its U-number for life — no new A-numbers;
  closing = moving the entry to the NEW `docs/answered-questions.md` (CHANGELOG class) with the
  resolution inline; DECISIONS references U-numbers. `open-questions.md` holds UNANSWERED only
  (CURRENT-STATE). The dual `A<n> (U<n>)` numbering on pre-2026-07-26 entries is historical. This
  deletes the commit-hook re-filing duty; the `scripts/doc-drift.ts` UNANSWERED lint is the mechanical
  guard.
  **(4) Commit-state-hygiene hook slimmed** to two duties as a consequence of (2)+(3): prune landed
  QUEUE.md items / close finished handoffs, and STATE.md sync.
  **(5) Kit-autonomy artifact economy.** `manual-review/<slug>.md` owner-review docs are **ALWAYS
  generated, for every unit (GO and NO-GO alike)** — the owner's short-form review surface alongside
  the kit-status findings + `results/<slug>.json`. _[Corrected 2026-07-26: the original slimming made
  these NO-GO-only by mistake; the owner's intent was only to stop force-committing the cross-family
  packets.]_ Cross-family RESULT JSONs stay force-committed (the evidence) but the packets are
  regenerable scratch and are no longer committed; a DECISIONS entry only when an actual
  ruling/tradeoff occurred (certify-only runs decide nothing). The ~540 already-committed artifact
  files stay as history.
  **(6) The gauntlet procedure has ONE source.** `scripts/kit-autonomy/SKILL.md` is the only stage
  protocol; the `.claude`/`.agents`/`.qwen` skill copies are router shims deferring to it;
  `CROSS-FAMILY-PROTOCOL.md` keeps only the routing policy + canonical model names (a routing change
  is again a 1-file edit).
  **(7) Skill-local dated change logs abolished** — git history is the record; operational knowledge
  (dispatch patience, trust gates, capture formats) was folded into the skill bodies first, then the
  logs deleted across all skills.
  **(8) The validation-catalog overlap is documented, not cut:** `docs/VALIDATION-INDEX.md` = where
  ground truth lives; `docs/STATE.md` §7 = what instruments exist + trust; `docs/probe-runs.md` =
  the chronological measurement log.
  **(9) The CHANGELOG/CURRENT-STATE taxonomy itself is KEPT** — the problem was too many stores
  within each class, not the taxonomy.

- **(2026-07-23) BOARD-DASHBOARD BUG: `collectBoardReadings` dropped each comp's `focus` / `modes` /
  `lambda`, misreporting ~45% of the graded board.** `scripts/lib/board-readings.ts` called
  `runOnce(w, { name: c.name, slugs: c.slugs }, …)`, passing only two of the comp's fields — even though
  `runOnce` already supports all of them and `scripts/experiment.ts` (the grading harness) sets them.
  So `scripts/board-read.ts` and `data/kit-status.json`'s AUTO board block — the numbers every session
  reads to decide what to work on — were computed with the wrong per-comp configuration.
  **Blast radius: 14 of 31 graded comps.** 13 declare `focus` (the ×2.5 charge-weapon gauge bonus →
  burst gauge → full-burst counts → every unit's total in that comp); `PA MiKa` declares `modes` +
  `lambda`. **The `modes` half is the instructive one:** with modes dropped, `prika` and `mint` ran in
  SOLO mode, so `prika`'s duet-gated `burstFirst` + `burstCdr −9999` never fired and the measured duet
  rotation — _prika takes the first burst, mint takes every burst after_ (owner) — was simply absent.
  Both units then read exactly as cold as you would expect a missing rotation to make them.
  **Corrections:** `mint` 0.755 COLD → **1.015 OK** (board rank 41 → 3); `prika` 0.676 → **0.890**;
  `anis-star` 0.946 → 0.965. Board-wide within-±3% 5 → 6, ±5% 9 → 12, ±8% 17 → 19, worse 28 → 26 — the
  board was consistently HEALTHIER than the dashboard claimed.
  **Consequence for the record:** any board number recorded before 2026-07-23 that came from
  `board-read`/`kit-status` rather than `experiment.ts` is suspect, and notes calling `mint`/`prika`
  "very COLD" were reading an artifact. `experiment.ts` is the reference if the two ever disagree again.
  Found while writing the 5e runbook: the dashboard and the harness disagreed on the same comp, which is
  a contradiction that should never be tolerated between two tools that claim to measure one thing.

- **(2026-07-23) Generators prefer LIKE-TAGS — a dealer paired with its matching damage buffer scores
  a soft bonus; new `projectile` dealer archetype tag (owner ruling).** Two coupled additions.
  **(1) Like-tag synergy bias** — the team/roster generators now nudge a team toward fielding a damage
  DEALER alongside its matching damage BUFFER. `src/teamcalc.ts` gains an exported pure helper
  `countSynergyPairs(slugs, tags, pairs)` and an OPTIONAL `synergy` input (`{ tags, pairs, weight }`);
  the ranking score folds in a multiplier `(1 + weight × satisfiedPairs)` inside `scoreOf`, so every
  search path sees it (seed refine, injected meta comps, the solo prydwen spread, best-team, character
  analysis, union). A pair `[dealerTag, bufferTag]` is satisfied when the team fields ≥1 unit with the
  dealer tag AND ≥1 unit with the buffer tag (one unit carrying BOTH halves — rapi-red-hood deals AND
  self-buffs projectile explosion damage — satisfies it alone). The web generators wire
  `SYNERGY_PAIRS = [['pierce','pierce-buffer'], ['projectile','projectile-buffer']]` at
  `SYNERGY_WEIGHT = 0.08` (+8% per satisfied pair, max +16%). The bias is SOFT on purpose — simulated
  damage and the meta blend still lead; it only breaks otherwise-close choices (e.g. picking a Pierce ▲
  buffer over a generic buffer of the same burst class when a pierce dealer is already on the team).
  Tags come from `data/archetype-tags.json`. Inert when no `synergy` is supplied, so CLI/battery callers
  stay byte-unchanged. **(2) `projectile` dealer tag** — the damage-profile counterpart to the existing
  `projectile-buffer` (Projectile ▲), mirroring the `pierce` (dealer) / `pierce-buffer` split. Keyed off
  the datamined damage-instance line "Projectile Explosion Damage: Deals N% of final ATK as damage" — NOT
  the "Projectile Explosion Damage ▲" buff — so a pure projectile buffer (prika, mint, anis:star) does
  NOT tag `projectile`. Net `projectile` ×1 (rapi-red-hood). anis:star's projectile damage is prose-hidden
  (Shooting Stars read as a generic "Damage: 40%… + Explosion Radius ▲"), so she does not tag — a
  prose-derivation limit per the high-recall-heuristic policy; no slug special-case was added. Pinned by
  `scripts/tests/like-tag-synergy.test.ts` (manual, like the other team-gen tests). — `src/teamcalc.ts`
  (`synergy` input, `countSynergyPairs`, `scoreOf`); `scripts/build-archetype-tags.ts` (`projectile`
  TagDef + `PROJECTILE_DEAL`); `data/archetype-tags.json` (regenerated, 40→41 tags); `web/src/App.tsx`
  (`archetypeTags`, `SYNERGY_PAIRS`/`SYNERGY_WEIGHT`, wired into both generator calcs);
  `docs/data/archetype-tags.md` (vocabulary + provenance).

- **(2026-07-22) Roster always-combos BURST SPREAD — the curated supports don't stack a burst stage
  onto one team (owner ruling; extends the always-combos ruling below).** `assignAlwaysCombos` now
  places the always-included supports burst-aware: the always **B1s fan out onto distinct teams** and
  the always **B2 groups fan out onto distinct teams** (a B2 PAIR counts as ONE B2 group). Concretely
  in Solo the 4 B1s (`moran`, `anis: star`, `liter`, `little mermaid`) take 4 teams and the 4 B2 groups
  (`{mint,prika}`, `{Mast,Anchor}`, `{crown+healer}`, `{nayuta}`) take 4 teams — so `crown` (B2) and
  `nayuta` (B2) never share a team, nor do `little mermaid` (B1) and `anis: star` (B1). Union applies the
  same rule to its 2 B1s (`anis: star`, `little mermaid`) and 2 B2 groups (`{crown+healer}`,
  `{Mast: Romantic Maid}`). B3 supports (`privaty`, `helm`) place freely. **Mechanism:** singles are now
  placed inside `assignAlwaysCombos` (previously returned for blind spreading), tracking per-team B1/B2
  occupancy seeded from the user's own pins; placement PREFERS a non-conflicting team but RELAXES to any
  feasible team if needed, so generation always completes (the always-units stay pinned, so the search
  keeps them on their assigned teams). Pairs/oneOf still share a team. Off-by-default callers unchanged.
  Pinned by `scripts/tests/always-combos-burst.test.ts` (manual, like the other team-gen tests).

- **(2026-07-22) Roster generators — curated "always-combo" meta supports (Solo & Union) + a prydwen
  meta-score SOFT SPREAD (Solo only) (owner ruling).** Two independent additions to the web generators,
  both applied to EVERY generation with no toggle, both gated behind OPTIONAL params so CLI/battery
  callers (which pass neither combos nor a `prydwenScore`) stay byte-unchanged.
  **(1) Always-combos** — `src/teamcalc.ts` gains a declarative `AlwaysCombos` spec (`pairs` / `oneOf` /
  `singles`) and `assignAlwaysCombos`, which folds a curated set of meta supports onto the teams. Same-team
  groups (pairs + a resolved oneOf) are PINNED together to one team; singles are spread across teams (folded
  into the existing `assignMustUse`). Merge precedence: user explicit pins > always-combos > user generic
  include-box. **SOLO** (`SOLO_ALWAYS_COMBOS`, 5 teams): pairs `mint+prika` and `Mast: Romantic Maid +
Anchor: Innocent Maid`; oneOf `crown + (helm | naga)` — preference-ordered, helm first (also the
  higher-meta partner); singles `moran, anis: star, liter, little mermaid, nayuta, privaty`; plus a
  conditional enforced post-hoc in `runTopTeams` — if crown ends up paired with naga (not helm) and helm is
  still free, helm is forced onto another team. **UNION** (`UNION_ALWAYS_COMBOS`, 3 teams — a relaxed set):
  oneOf `crown + (helm | naga)` (the "crown + healer" combo; the UR healers are helm and naga); singles
  `anis: star, little mermaid, Mast: Romantic Maid` (Mast is a FREE single here — may pair with any B2, NOT
  forced to Anchor: Innocent Maid as in Solo); plus a mint→prika OUTPUT invariant enforced post-hoc in
  `runUnionTopTeams` — if mint is fielded at all, prika must be on her team (mint+prika is NOT required as a
  whole, unlike Solo; if prika is unavailable or already on another team it relaxes).
  **(2) Silent relax (both sets).** A combo whose required unit is UNAVAILABLE to the search — blocked,
  excluded, not owned in a synced roster, or not modeled — is SILENTLY dropped: no warning, no UI. A oneOf
  with no available partner drops; user pins that split a same-team group drop it. Generation always
  completes. (`assignAlwaysCombos` returns a diagnostic `dropped` list that is never surfaced to the user.)
  **(3) Solo prydwen meta-score SOFT SPREAD** (Solo only; UR ranking is unchanged). A NEW element-agnostic
  per-unit score `prydwenScoreOf` read from `data/bossing-tiers.json` — **SSS=5 / SS=4 / S=3 / A=2 / B=1 /
  ≤C=0** — is used ONLY to SEED a gently downward-sloped spread of team meta scores. This is a SECOND,
  DISTINCT use of the same tier file: the 2026-07-15 ruling uses it as a _popularity prior INSIDE the ranking
  score_ (SSS→1.0…F→0, fallback for too-new units); this one uses it as a _spread seed OUTSIDE the score_.
  A team's meta = sum of its 5 prydwen scores. The 5 sloped targets are auto-derived from the pool: M = (sum
  of the top-25 available units' prydwen scores) ÷ 5 — i.e. the average per-team meta sum if the top 25 were
  dealt evenly across the 5 teams — and the targets are `[M+2, M+1, M, M, M−2]` (the ~19/18/17/17/15 "1–2
  top, 2 mid, 1 under" shape). Each team's seed + local search bias toward its target via a Gaussian
  closeness factor (σ=3) multiplied onto the score during that team's search only. The bias is SOFT — the
  damage×enikk ranking formula (`scoreOf`) is unchanged, and damage, legality and pinned locks all still
  outrank the target (a big damage gap wins over closeness). Inert when no `prydwenScore` is supplied.
  **(4) Legibility.** `rosterView` shows a small per-team **◆N** badge (the team's prydwen meta sum) beside
  the team damage so the solo slope is visible/verifiable. — `src/teamcalc.ts` (`prydwenScore` input,
  `AlwaysCombos`/`assignAlwaysCombos`, `topTeams` `spreadTargets` seeding); `web/src/App.tsx`
  (`prydwenScoreOf`, `SOLO_ALWAYS_COMBOS`/`UNION_ALWAYS_COMBOS`, `runTopTeams`/`runUnionTopTeams` wiring
  incl. conditional-helm + mint→prika, `rosterView` badge); `web/src/styles.css` (`.rg-meta`).

- **(2026-07-21) Documentation architecture — split changelog from current-state; add `docs/STATE.md`;
  two-class doc hygiene (owner-approved).** DECISIONS.md had grown to 1,659 lines and was doing two jobs
  with opposite hygiene needs: the append-only WHY-trail (changelog) AND the slot-1 authority for "what
  is current." The never-silently-delete rule that keeps the trail honest was poisoning the authority
  role — current truth of burst-rotation / DoT-crit / cinderella required reading 2–3 mutually-superseding
  entries with no index; open-questions held resolved items (U13/U16/U18/U25) still filed UNANSWERED;
  CLAUDE.md NEXT INCREMENT was ~55–65% landed-history narration. **Resolution (owner AskUserQuestion,
  2026-07-21):** (1) new **`docs/STATE.md`** — the landed-state registry (live flags/constants, rotation
  model, geometry, opt-in kit-primitive inventory, standing rulings), each entry a short current-truth +
  `→ DECISIONS date` pointer; a DERIVED index (on conflict, live code + latest DECISIONS entry win). It
  is now authority slot 1 (default first read); DECISIONS drops to slot 2 (why/when) and stays
  **pure append-only, no rewrite** (owner chose no history-collapse, no anchor reformat). (2) **Two-class
  doc hygiene** (CONVENTIONS.md → Doc hygiene): CHANGELOG class = append-only, SUPERSEDED-in-place, never
  delete (DECISIONS, open-questions ANSWERED, probe-runs, patch-notes, sources.json, closed/ archives);
  CURRENT-STATE class = freely rewritten, stale content DELETED with a capture-first rule (STATE.md,
  data/\*.md, CONVENTIONS, modeling-priors, engine-modeling-gaps, CLAUDE.md, open handoffs, open-questions
  UNANSWERED, backlogs). The never-silently-delete rule now scopes to CHANGELOG class only. (3) **Hard
  purge** of the current-state surfaces: CLAUDE.md 446→305 lines (NEXT INCREMENT ~245→~65, pointer-style,
  removed a stale coherent-first-burst parenthetical — "~8f fight-start / gauge-full→30f→B1 / POST_FB
  180→150 / Helm double-count" — that CONTRADICTED live code; the true rotation model is STATE.md §3);
  open-questions −319 lines (U18/U25/U13 → ANSWERED A27/A28/A29, U16 trimmed to its open worklist);
  the landed coherent-first-burst rotation narration moved out of NEXT INCREMENT into STATE.md §3 (the
  code-true model: ~8f fight-start, gauge-full→30f→B1→30f→B2→30f→B3→22f→FB, POST_FB 150 — verified vs
  live sim.ts, which had advanced via a mid-session merge of the coherent-rotation feature);
  kit-parse-reconciliation-backlog false "every item UN-ENACTED" header fixed; engine-modeling-gaps
  reframed + ranked-fixes narration compressed; experiment-harness-ai.md CLOSED → handoffs/closed/.
  mechanics-doc-upkeep + skill-maintenance now route landed flag/constant/primitive changes to STATE.md.
  Hook follow-ups (guard-locked, owner-gated): `docs/handoffs/2026-07-21-doc-architecture-hook-proposals.md`.
  Docs-only — verify green, regression byte-identical.

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
  0→5 grind). **OBJECTIVE ruling:** "best method" is a resource-balancing problem — _level the most
  SR dolls 0→15 per kit-box_, NOT minimize per-doll EXP (which wrongly hoards). Kit usage-weights
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
  build, holding a lock on a _low_ Line 1 through the grind for Lines 2 & 3 wastes modules —
  lock-everything-greedily ≈ 635 modules, leaving a low Line 1 unlocked ≈ 584, never-lock-Line-1 ≈ 557. For **8/12** it is a wash (greedy 272 ≈ smart 263). But "never lock Line 1" is wrong when
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
  clarity: _DPS Chart_ → **DPS Rankings**, _DPS Test_ → **Custom DPS Rankings**, _Team Calc_ →
  **Optimal Team**, _Roster Calc_ → **Solo-Raid Roster Generator**. Added the **Optimize Overload**
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
  - the maiden/helm measurements; only tia remains unclassified. — charge-weapons.md §2.
    **SUPERSEDED (2026-07-26):** classification now resolves from the datamined `input_type` field
    (`isAutofireCharge()`, sim.ts:155); per-unit flags removed. Tia is `UP` (release-fired) — fully
    classified. — answered-questions U12.
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
  exposed (part MG-cold, part unmodeled explosion crit). **The 2026-07-16 core explanation was itself
  OVERTURNED 2026-08-04 (explosion = skill damage, core-INELIGIBLE — see the top entry); the
  cadence/instant-detonation derivation still stands. The +421.2% "MEASURED-INERT" verdict in THIS
  entry was ALSO OVERTURNED 2026-08-04 (ATTACHMENT REWORK, top entry): the amplified attachment
  bodies were mis-sorted into the explosion class; the buff is RESTORED and the attachment CORES.**

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
  tested (slot 3 = camera focus), no-op B3 (MG). The no-ops (`src/dpschart/noop.ts`) deal zero damage
  (`normalAttackMultiplier 0`), carry zero skills (empty kit text → the parser yields no blocks), and
  generate weapon-class-modal burst gauge (new `class-modal-*` entries `noop-b1-ar`/`noop-b2-sr`/
  `noop-b3-mg` in `data/gauge-per-shot.json`); their weapon data are the weapon-class MODAL values
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
  docs/handoffs/closed/2026-07-16-kit-parse-rollout.md. Done-when: all 74 units authored/audited/reconciled with
  findings triaged; board improvement expected but NOT a gate (faithful > fit).
- **(2026-07-22) COUNTS-AS ELEMENTS — a kit-granted second element is DERIVED from `advantageVs`, not
  hand-tagged.** `rapi-red-hood`'s Skill 2 ("Applies Elemental Advantage damage to Electric Code enemies
  continuously") means that on an Iron-weak raid — an Electric-code boss — she behaves exactly like an Iron
  nikke. The ENGINE already had this right: the `advantageVs` effect feeds `UnitState.advantageVs`, and
  `advantaged()` ORs it with the native wheel, so her damage bucket and her result-level `advantaged` flag
  were correct at `bossElement: 'Electric'` (verified: solo 85.0M neutral → 93.5M at both Wind and Electric).
  The gap was everything OUTSIDE the engine, which compared `c.element` for equality: the Browse-Nikkes
  roster element filter, the DPS-chart element view + compare-dropdown grouping, and the unsimmed-team
  share card's ▲ marker all treated her as Fire-only. RULING: a unit counts as EVERY element it can be
  advantaged as, and that set is DERIVED from its override — `src/elements.ts` owns the element wheel, its
  inverse, and `countsAsElements(element, override)`; `src/data/sync.ts` recomputes the tag into
  `data/characters.json` (`CharacterData.countsAsElements`, omitted for the ordinary single-code unit, so
  the field is self-maintaining across syncs instead of being clobbered by the rebuild). Every UI surface
  now matches on the derived set via `unitElements()`/`unitHasElement()`, and her Browse-Nikkes card shows
  both code icons (the second titled with the boss code the kit names). WHY DERIVED, not a hand tag: the
  override is the kit source-of-truth, sync.ts rebuilds characters.json from scratch every time, and the
  derivation generalizes to any future `advantageVs` unit for free. NOT an engine change and NOT a
  mechanics change — zero movement in any sim number (verify.sh green, snapshots untouched); this is
  strictly the UI/tooling catching up to what the engine already modeled. Today `rapi-red-hood` is the only
  unit with an `advantageVs` effect, so she is the only multi-element unit.

- **2026-07-22 — UNIGEO SHIPPED (default `'all'`): SG/AR/SMG accuracy-circle geometry is now uniform-in-circle, replacing the Gaussian δ-cone on the scope-lock boss profile — owner enactment of a judge-LOG'd /scientific-method pass.**
  THE MODEL: shots/pellets land UNIFORM PER AREA in the aim circle; circle radius R(hr) =
  (0.648 × datamined `start_accuracy_circle_scale` / 2) · (1 − hr/100) px — linear to ZERO at Hit
  Rate 100, pinned by the owner's two weapon-matched SG tracings (79.3 px at HR 0, 48.2 px at
  HR 38.91; brid-silent-track + soda-twinkling-bunny) and cross-validated by machine Hough fits and
  the engine's own bloom-peak calibration. SG landing = 0.96 · coverage(band, R(hr)) — coverage of
  the circle by the owner-traced boss silhouette, range-scaled px ∝ 1/d — which adds the Hit-Rate
  landing term the old table structurally lacked; SG core-per-landed = (r_core/R(hr))² ÷ coverage;
  AR/SMG core-per-hit = uniform-disc/core lens overlap with per-class δ0 (AR 15.9 / SMG 17.9 px,
  shrinking to 0 at HR 120) and effective-circle fraction f_bloom (AR 0.578 / SMG 0.728).
  EVIDENCE: the owner's 728-pellet hand count (18 cells, 4 bands × HR on/off) reproduced by the
  engine untuned (deviance 25.45 vs the analysis fit's 25.4); the Gaussian REFUTED by direct
  machine-read pellet-marker positions (n=101, KS 0.376 vs crit 0.135; markers owner-ruled white =
  pellet hit / red = core hit); a PRE-REGISTERED midfar replication scored in the model's favor
  (z −0.36); all 8 graded SG readings moved in the pre-registered direction AND magnitude band;
  uniform-lens beats the frozen cone on the 6 clean AR cells (deviance 2.13 vs 16.33). Full gated
  record: `docs/handoffs/scientific-method-harness.md` 2026-07-22 (judges 2-of-2 ACCEPT, driver
  HIGH / blind Fable MEDIUM → LOG) + the step-7 implementation review (FIX applied: the default
  flip co-commits the regenerated snapshot). WHY THE OWNER SHIPPED A LOG: the blind judge's
  headline reservation — the N5 comp's FB count "breaking" 11→10 — DISSOLVED when the owner's
  manual recount found the REAL count is 12 (the pinned 11 matched the old sim, never the footage;
  `docs/probes/714 noon/probe.md:17` said "measured 12 / sim 11 ✗" all along). Both engine variants
  under-generate there → pre-existing burst-generation question, re-filed as **open-questions U29**,
  not a UNIGEO regression (the W6 gauge-decoupling isolation localized the 11→10 delta to the
  landing→gauge coupling and showed 6/8 SG readings are ≥96% pure geometry).
  KNOWN FIT-EXPOSURE, SHIPPED DELIBERATELY: the old landing sat 12–24% above the owner's measured
  landing, so SG overrides carry calibration debt — SG-unit mean |ratio−1| 0.084 → 0.131 until the
  SG OVERRIDE RE-TUNE follow-up pass lands (the board A/B could not validate this change precisely
  because its instrument embeds the old landing; the owner accepted the interim regression, web
  included). ⚑ RETAINED (calibrated, not measured): core diameters mid/midfar/far = fit-selected
  series C (31/20.9/15.8/12.7 px — the pro-B range-data argument vs the anti-B counted cells stands
  unresolved; an owner re-trace supersedes); the SMG (δ0, f_bloom) pair (SATURATED 2-cell fit that
  over-predicts little-mermaid long bands — active red flag); f_bloom's bloom-phase mechanism
  (fitted scalar, no independent observation). REVERT ARM: `UNIGEO=off` restores the cone engine
  byte-identically; the cone also remains the live path for medium/large `bossPelletProfile`
  fights. Supersedes: `SG_LANDING_BY_BAND` + its SGLANDING arms and the `SGLANDING=geo` /
  `BAND_SG_HIT_FRAC` rebuild workstream (engine-work-plan steps 1+3 closed); the 2026-07-15/16
  class landing table (overturned by same-tier-plus evidence: direct counts + positions + a scored
  pre-registration); the cone as the SG distribution (KS-refuted). NOT touched: `BAND_CORE_PX`
  (measured file values intact; the ⚑ UNIGEO series is a separate constant), all measured timing/
  gauge constants, MG/SR/RL (flat 0.95 core, no accuracy circle).

## marciana-marine-study — kit-autonomy gauntlet GO (2026-07-24)

**Verdict:** GO (cross-family corroborated), faithfulness 1.0. S2b (claude-fable-5) + S5/S6/S7
(claude-opus-4-8) converged on all load-bearing lines.

**Key rulings:**

- S1 nuke (3789.25% ATK): `fullBurstEnter + ownBurstGate:'cast'` — fires only on Marciana's own
  burst FBs, not helm's alternating rotations. Two-B3 comp discrimination pins nuke count === her
  burstCast count (not total FB count). Nearest-wrong: plain `fullBurstEnter` (doubles the nuke)
  or `burstCast` (fires pre-FB, loses +50% major).
- Whistle stacks: `perResource` whistle pool (initial:4, max:5) + `interval:5` resource+1.
  More faithful than S6 blind flat-cap authoring (163.65% from t=0). M3 discriminates via baseAtk
  step at t=5s (4→5 stacks).
- Electric spine: `bossElementGate:'Electric'` on High-Risk Target status; `requiresTargetStatus`
  gate on S1 20-hit rider. Both inert on Fire boss (M6). DEF▼10.56% documented as inert at
  bossDef:0 — NOT mis-encoded as `damageTakenPct` (S2b-warned trap avoided).
- `elemAdvantageDamagePct` (20.41 passive + 30.97 burst) correctly distinct from generic
  `attackDamagePct` (27.45 burst). Advantage-gated; inert on Fire boss.

**Documented gaps:** enemy-neutralized trigger (S1 block 2, inert — boss never dies); ≥6 Raptures
Penguin Dispatch (S2, inert — never ≥6 enemies); DEF▼ magnitude (inert at bossDef:0).

**Low-severity notes:** hitCount:20 counts all hits not normal-only (documented, Electric-only);
RIDERCRIT engine default relied on for flatDamage crit (confirmed ON in sim.ts).

**Artifacts:** `scripts/kit-autonomy/cross-family/marciana-marine-study/` (packets + results),
`scripts/kit-autonomy/results/marciana-marine-study.json` (judge verdict).

## Roster generator: curated always-include sets RETIRED → fielding conditions (2026-07-24)

**Owner ruling.** The hardcoded `SOLO_ALWAYS_COMBOS` / `UNION_ALWAYS_COMBOS` sets (owner ruling
2026-07-22, always called a stopgap) are retired: no unit is force-included in a generated roster
any more. Evidence: the item-3 marginal-value search fields the meta core on its own merit —
A/B artifact `docs/handoffs/2026-07-24-always-combos-ab.md` (branch `generator-perf`,
`scripts/ab-always-combos.ts`): the derived path beats the curated pins on roster score in ALL
SIX arms (+1.6%…+10.3%; every audited weakness + no-weakness) and fields 10/13 curated supports
unprompted in every arm.

**What replaces them — CONDITIONS on being fielded, never reasons to field anyone**
(`TeamCalcInput.constraints`, wired as `web/src/genCalc.ts` `TEAM_CONSTRAINTS`, enforced in team
legality and inside the proxy enumeration):

- `mint` + `prika` must share a team (all-or-none; relaxes only when one is unavailable to the
  search). Owner: their kit pairing is under-modeled today, so the rule carries what the sim
  cannot yet see; a kit fix is planned.
- `naga` requires a shield-granting teammate (any `shield`-tagged unit other than herself;
  strict — no eligible shielder in the pool means she is not fielded).

The union-raid mint→prika output post-pass in App.tsx is deleted (subsumed by the constraint);
`assignAlwaysCombos` stays as machinery. **Queued with the coming mint/prika kit fix (owner
requirement, same ruling): the sim must support the "prika bursts first, then only mint" rotation
config for the pair** — no engine knob exists today (only Λ `lambdaStage`), so it lands with that
kit work, not with this change.

## Roster-generator perf/quality plan — branch `generator-perf` merged (2026-07-24)

**What the branch changes (web Team/Roster generators + `src/teamcalc.ts`; ZERO engine edits).**
Plan: `docs/handoffs/closed/2026-07-24-roster-generator-perf-plan.md`. Items:

- **1a/1b — worker offload + pool, batched argmax refine.** Roster search runs in web workers
  (main thread never blocks); `refine` moved from first-improvement to per-slot argmax —
  a measured-quality-neutral search-trajectory change, gated byte-identical on the no-meta bench.
  Real-Chromium parity gate: pool roster === in-process fallback roster (`scripts/pool-browser-check.mjs`).
- **2 — canonical team order + focus post-pass (+9% quality).** A team is a SET + a camera-focus
  choice; every permutation maps to one representative and the focused unit is chosen
  (highest-solo charge unit + a ≤5-sim final polish) instead of being an insertion-order
  accident. Browser roster total +9.3%.
- **3 — marginal value table + proxy enumeration (+6.8% roster at team-1 parity, fewer sims).**
  Every unit priced by marginal damage vs a reference core (`src/teamvalue.ts`); all legal team
  shapes enumerated sim-free; only the best candidates simmed and refined. Two bench-measured
  deviations from the plan draft are recorded in the plan doc: the 5-copy solo metric is KEPT
  (1-unit solo is blind to support-B3 self-synergy — cost 5.7% bestTeam score), and B3s price by
  leave-one-out add-in marginal, not solo value.
- **3c — always-combos retirement** (own entry above, owner ruling 2026-07-24).
- **5 — cross-run sim cache.** Re-running a generation with tweaked pins reuses every prior sim
  (measured 104× in-process; ~47× in-browser re-run).

- **4 — cross-team polish pass + strongest-first display order (2026-07-24, branch `gen-item4`).**
  Greedy builds team _i_ from the pool minus teams 1..*i*−1, so a later team beating an earlier one
  (bench: team 4 2343M < team 5 2369M) PROVES the earlier team's search missed a team its own pool
  contained. Fix, in `src/teamcalc.ts`: after the greedy roster, re-run the whole sequential build
  with the previous roster's teams offered to every team as extra local-search starts
  (`bestTeam({ extraSeeds })`), keeping a pass only if the TOTAL roster score strictly improves;
  ≤2 passes, ties keep the incumbent. `topTeams` then returns the teams strongest-first UNLESS the
  caller row-pinned units (`pinnedByTeam` rows map to UI team indices — a sort would move a pin out
  from under its row; generic `mustUse` carries no row identity and still sorts).
  **Three deliberate deviations from the plan draft, all bench-measured** (artifact:
  `docs/handoffs/closed/2026-07-24-gen-item4-polish-ab.md`): (1) the plan's "re-run team _i_ with all
  OTHER final teams excluded" is a strict SUBSET of team _i_'s greedy pool for every _i_ — it cannot
  reach the missed team by construction, so the seeded re-run replaces it; (2) the accept rule moved
  per-team → per-pass on the roster total, because a reclaim raises one team while the rebuilt tail
  drops (this is what makes "polish never lowers the roster" true); (3) a `POLISH_SEED_FRAC = 0.8`
  gate re-climbs only seeds near the score to beat — same roster for 2197 sims instead of 3362
  (+28% vs +95% over greedy). An exact `seedsOnly` shortcut skips re-deriving teams whose pool is
  unchanged (the pipeline is deterministic + cached, so it would return the incumbent).
  **Measured:** no-meta CLI bench roster 14.432B → **14.471B (+0.27%)**; on a constrained 20-unit
  pool (4 Burst-I ⇒ 4 role-legal teams) greedy **stalls at 3 teams** and polish reaches **4, +13.0%**
  — the small-eligible-pool case is the owner-reported symptom, so that is where the item pays.
  **On the shipped app config (full pool, meta + spread shaping) it is a measured NO-OP** in both
  quality and wall clock (real-Chromium 13.13B / 7865ms vs 7884ms, pool === fallback both arms) — a
  gate-off arm (refine every seed) returns the SAME roster for +19% wall, so the gate is not hiding a
  gain. Landing it anyway is the safe direction: it is monotone by construction and it only bites on
  the constrained pools real users have. Coverage: `scripts/tests/generators/cross-team-polish.test.ts`
  (6 tests) + `--polish` on `scripts/bench-generator.ts`; 78 pre-existing generator tests green with
  nothing re-pinned; `verify.sh` green.

**Player-facing patch notes: SKIPPED (owner ruling 2026-08-02).** No note written — the item is a
measured NO-OP on the shipped full-pool config (its only payoff, +13%/a recovered team, is on
constrained small-eligible pools), and a 9-day-old note was not worth publishing. The item-0/1/2/3/5
search upgrade is already covered by the 2026-07-24 "smarter search, faster runs" note (`035465e`).

## Probe reader build-out — four hand reads replaced by scripts (2026-07-24)

**Decision.** Build the readers the `/probe-processing` skill's MISSING READERS worklist named,
rather than keep hand-reading frames. Owner-approved plan:
`docs/handoffs/2026-07-24-probe-reader-buildout-plan.md`. Landed on branch `probe-readers`. Nothing
here touches `src/engine/**`, `data/**` or `src/skills/overrides/**` — these are measurement
instruments, and building one and validating it against known ground truth is ordinary work.

**Why.** `/probe-processing` was regularly burning 2–3 h producing nothing, because the numpy scans
it described in prose were re-derived by hand every run and manual Opus frame-reading is slow and
error-prone. The design rule the plan set — _prefer deterministic CV on a fixed crop over a VLM
read; use a VLM only where the task is genuinely semantic_ — held up: the two deterministic readers
are exact on their validation sets, and both remaining VLM readers needed an arithmetic gate.

**What landed.**

1. **`scripts/probe/scan.ts` + `scan-frames.py`** — deterministic CV Full-Burst instrument, no model.
   Three detectors merged: the Full-Burst **drain window**, the whole-frame golden **splash**, and
   the stage-3 **hexagon**. ~12 s per whole video on one ffmpeg decode.
2. **`read-burst-gauge.ts --classifier cv|vlm`** (cv default), plus `--t0` so `timerSec`/`fightT`
   are exact arithmetic from one measured anchor instead of a single-anchored VLM timer spine
   (which needed 12–17 corrections per 60 frames).
3. **`read-ammo.ts`** + `count-pellets.py --ammo-digits` + `scripts/probe/ammo-atlas/` — the
   ammo-counter cadence read, for every weapon class.
4. **`read-battle-records.ts`** — the end-of-fight screen, VLM + arithmetic checksum.
5. **`read-popups-vlm.ts`** confidence scoring + `needsConfirmation[]`; `hit-values.ts` refactored
   onto a shared **`hit-bands.ts`** so the printed table and the reader's in-band check cannot drift.

**Evidence.** Full record in `docs/probe-runs.md` (2026-07-24).

- FB counts: **exact on 8 of 8** recordings whose counts were measured independently and earlier
  (11/12/13/13/13/13/14 + the soda-twinkling-bunny control's 10), every burst corroborated by a
  second detector. The failure case that motivated the work is bounded too: on the `control/lm.MP4`
  window where the VLM classifier reported six Full Bursts in 30 s, the CV reads 2.
- Cadence: SMG **20.31 / 20.32 rounds/s** in two range bands, r² = 1.00 — an independent
  reproduction of the hand read behind the 2026-07-23 SMG cadence ruling.
- Battle Records: **37/37 numbers exact** on two screenshots.

**Two corrections to previously-documented premises** (both structural, both verified by direct
pixel measurement — they change no constant, no default and no board value):

- The burst-gauge crop renders a **draining Full-Burst window bar**, not a filling gauge; the burst
  gauge CHARGING is not in that crop at all. The `filling` state the VLM emitted was a prompt
  artifact — it was offered that option and had to pick something.
- The documented "team burst bar" (`crop=200:14:2420:478`) and "solo BURST meter"
  (`crop=142:12:2470:488`) are **sub-strips of the gauge crop** (x 2428–2616, y 448–530), so they
  were never an independent cross-check, and their "≥95%→<50% drop" fires when the drain crosses
  half rather than at the burst. They are diagnostics now, excluded from the corroboration count.

**Explicitly NOT claimed.** `read-popups-vlm.ts`'s auto-accept path is built but **unexercised** —
it accepted 0 of 30 popups on the one hand-read probe available, because that unit's value bands
overlap outright. Treat an `autoAccept` as unproven until a clean-band unit trips it. And
`read-ammo.ts` does not yet read a small-magazine SG counter (~29% of frames on `marciana-solo`).

## Rank boards: DPS ranks for B1/B2 and composite support rank — DROPPED (2026-07-29)

**Decision (owner).** Of the three open follow-ups filed when the rank-boards backend + frontend
landed (`docs/STATE.md` §8; backend 2026-07-26, `/ranks` frontend PR #31 2026-07-27), two are not
being built: **DPS ranks for B1/B2** and a **composite support rank** combining the four boards.
Design-brief handoffs closed and archived: `docs/handoffs/closed/2026-07-26-dps-ranks-b1b2.md`,
`docs/handoffs/closed/2026-07-26-support-rank-composite.md`. The third follow-up from that same
landing — Mint/Prika duo profiles on the buffer rank — was built separately and stands.

**Why.** Scope call, no further rationale recorded.

## Focus charge-gauge bonus is PER-UNIT, not flat 2.5x — scarlet-black-shadow IMPLEMENTED, alice LOGGED (2026-07-29)

**Overturns, with a scope correction:** the 2026-07-13 "full_charge_burst_energy unused" ruling
(that column is `fullChargeBonus`, now read and used — see below) and, narrowly, part of the
2026-07-24 "burst-gauge crop renders a draining Full-Burst window bar, not a filling gauge" finding
above: that finding is now scoped to **team footage**. In **solo/near-solo** footage the same crop
(`142x12 @ 2470,488`) DOES render a persistent, continuously-updating gauge widget through
charging/full/draining/chain states (owner-confirmed, then independently re-validated: the crop
reproduces the ORIGINAL maiden-ice-rose tb2-test-3 hand-pixel-read anchor's documented "+9.1% then
+3.45%" per-pull sub-step pattern, TWICE, each within 0.05-0.15% of the 2026-07-13 value). The
team-footage characterization (drain bar only, absent while charging) is unchanged and still holds —
confirmed by a fresh `scan.ts` run on `docs/probes/720-kit-audit/scarlet black shadow.MP4` (team
footage) landing a clean FB count with the ordinary hex/drain detectors, no gauge-crop-missing
warning, same as always.

**Finding.** `src/engine/sim.ts`'s `gaugePerShot()` hardcoded a flat `FOCUS_CHARGE_GEN = 2.5` for
every camera-focused SR/RL unit. The datamined `fullChargeBonus` column (`data/gauge-per-shot.json`,
= `chargeMultiplier` for every unit) is the REAL per-unit focus multiplier (`fullChargeBonus/100`)
and was dead code. For the 250-family (the large majority, incl. the two original measured anchors
maiden-ice-rose and takina) this is byte-identical to today (250/100 = 2.5). Four units deviate:
alice 350 (3.5x), cinderella 200 (2.0x), cinderella-crystal-wave n/a (not RL/SR), scarlet-black-shadow
150 (1.5x); `vesti-tactical-upgrade` 200 is out of scope (not sim-supported).

**Measured this session** (fresh solo-footage readings via the re-validated instrument):

- **alice**: base 5.6%/shot (`targetPerTrigger` 560). Observed ~20.6-20.75%/shot → multiplier
  ≈3.68x, a 5% match to the predicted 3.5x, clearly excluding flat 2.5x (would predict 14.0%/shot,
  47% below observed).
- **scarlet-black-shadow**: base 2.5%/shot (`targetPerTrigger` 250). Observed modal delta
  3.5-3.6%/shot → multiplier ≈1.42x, a 5% match to the predicted 1.5x, excluding flat 2.5x (would
  predict 6.25%/shot, 76% above observed).
- **cinderella** (RL, whole-magazine dump-fire kit, `charFixes.magDumpRof`): attempted, inconclusive
  (~2.6-3.1x — her dump-fire cadence aliases against the 0.2s CV sampling). Her own rough read
  contradicts BOTH her table value (2.0x) and a 1.0x exemption hypothesis, leaning closer to the
  CURRENT flat 2.5x.

**Decision, split by unit** (full harness record: `docs/handoffs/scientific-method-harness.md`
2026-07-29 entry) — full `/scientific-method` pipeline: premise gate, Fable pre-op
APPROVED-WITH-REVISIONS, work, driver review, three rounds of blind Fable post-op (each round
triggered by new reuse-before-derive evidence, never by the driver invalidating the judge's
blindness):

- **scarlet-black-shadow: IMPLEMENT** (2-of-2 HIGH+HIGH). Confirmed at TWO independent measured
  levels: the solo per-shot rate above, AND a team FB count — `scan.ts` on the existing
  `docs/probes/720-kit-audit/scarlet black shadow.MP4` control-comp recording reads **11 full
  bursts, 11/11 corroborated**, which only the per-unit model's 11-12-seed distribution can
  produce (the old flat-2.5x model rigidly seeded 12/25 every time — the real footage contradicts
  it outright).
- **alice: LOG, not enacted.** Pinned to the flat constant (`PENDING_TEAM_ISOLATION` in
  `gaugePerShot`, same mechanism as cinderella's carve-out) pending an isolating team-context
  measurement. A fresh owner-supplied alice-focused team recording (`docs/probes/burst tests/alice
focused.MP4`, crown/liter/alice/red-hood, boss Water) measured **10 full bursts, 10/10
  corroborated** — inside BOTH the pre-fix (rigid 25/25-at-10) and post-fix (7/25-at-10,
  18/25-at-11) distributions, landing as the post-fix model's minority (28%) outcome rather than
  confirming it. Ruled a non-isolating, downstream observable (FB count convolves alice's rate with
  red-hood's flex-burst behavior, chain selection, and the other units') that cannot move a
  directly-measured constant in either direction on a single categorical draw — her solo per-shot
  measurement (5% match to the datamine, clearly excluding 2.5x) stands un-enacted-but-un-refuted.
  Owner action item + isolating-measurement follow-up: `docs/handoffs/QUEUE.md`.
- **cinderella: no change**, current flat-2.5x behavior preserved via the `magDumpRof` pin. Own
  dedicated investigation filed: `docs/handoffs/QUEUE.md`.

**Engine:** `src/engine/sim.ts` `gaugePerShot()` — per-unit `(fcb && fcb > 0 ? fcb : 250) / 100`
read, `?? 250`-equivalent fallback verified safe (of 38 SR/RL units with no `gauge-per-shot.json`
row, only `laplace-ultimate-hero` is currently sim-supported, and she falls through to 250 =
pre-change behavior). `verify.sh` green; `control-regression-snapshot.json` updated (the only
behavioral delta in that suite is scarlet-black-shadow's own comp — crown/helm moved as an
explained second-order rotation ripple from her teammate's changed timing, not a fit signal;
helm's ratio moved the most, 1.077→1.018, one of her 4 control readings — a future helm tune
should know that move traces to SBS's rotation, not her own kit).

**Step 7 implementation review (2026-07-29, same date):** found and fixed two real gaps before
merge — (1) `vesti-tactical-upgrade` (RL, `fullChargeBonus` 200) was a 4th non-250 outlier the
original evidence never covered and was NOT pinned, so she'd have silently enacted an unmeasured
2.0x the moment she gets a sim override; now explicitly added to `PENDING_TEAM_ISOLATION`.
(2) the `?? 250` fallback only guarded `null`/`undefined`, not a present-but-zero
`fullChargeBonus` (71/115 rows use 0 as their non-charge marker, and a live data disagreement —
`raven`: gauge row 250 vs `characters.json` `chargeMultiplier` 0 — makes this reachable); hardened
to `fcb && fcb > 0`. Both fixes verified zero board movement. Full findings, including a
same-family unit-identification correction mid-session (prika, not alice, was focused in the
5-unit "PA MiKa" comp — she's SR, not non-charge as first assumed) and the `gauge-per-shot.json`
data-quality gap this exposed (6/44 SR/RL rows are synthesized class-modal fills, 4 more units
have a `characters.json` `chargeMultiplier` with no gauge row at all): `docs/engine-modeling-gaps.md`
§20, `docs/handoffs/QUEUE.md`.

**Open items:** alice's isolating-measurement follow-up and cinderella's dedicated investigation
(`docs/handoffs/QUEUE.md`); the `scan-frames.py` module docstring still needs a solo-footage
correction (deferred, tooling-only, does not gate this landing); the `?? 250` fallback should be
hardened to a `> 0` check at a future touch (no present row is 0, but nothing prevents one from
being synced in later).

## Owner rulings: NO overcharge (charge cap as datamined) + tb2-test-3 viable footage is 0:06–0:17 ONLY (2026-07-29, third pass)

Two owner rulings on the gauge-fill-reader calibration work (`docs/handoffs/
2026-07-29-gauge-fill-reader-calibration.md` §RESULT), recorded there in full as §OWNER-RULINGS:

- **"Charge cap as datamined is correct, there's no 'overcharge'."** The escalated hypothesis
  (a) — real charge-at-release > 1.0 with the ×(1+1.5c) focus formula extending past c=1
  (the c ∈ [1.07, 1.32] fit to the reader's hot weapon sub-steps) — is REJECTED. The mechanic
  does not exist; no pipeline, no constant moves. The focus charge-gauge bonus at full charge is
  the per-unit datamined multiplier, full stop. The maiden override's "156–212% overcharge" note
  (and the matching phrases in `docs/data/charge-weapons.md` §2 / answered-questions A12) is a
  charge-meter DISPLAY observation during the auto hold — never evidence for a c>1 mechanic.
- **"For tb2 test 3, only 0:06–0:17 are viable footage."** Both test-3 recordings share one
  timeline (intro fade through ~5.8s; six pulls 7.2–14.0; reload ~14.0–17.2; at ~17.4–18.7 the
  player takes manual aim — the tak footage shows the scope HUD from t≈18). Audited against every
  §RESULT claim: all ladder sub-step reads, the frame-snap checks, the shot-1-partial and ammo
  `005`/`000` reads are INSIDE the window and stand; **shots 7–8, the full-cross at t=18.73 and
  the ammo `004` read are OUTSIDE** — which WITHDRAWS the "8 shots fill the bar" counting bound
  that had excluded the documented 12.55%/pull (910+364) maiden anchor. The anchor stands
  un-excluded; inside the window the cumulative fill does not discriminate it from the reader's
  hotter per-pull.

Consequences: the gauge-fill reader is settled for SHAPE and SMALL-step magnitude only — its
LARGE-step magnitude (~1.0–1.3% absolute hot on both solos, rider exact) is an unresolved READER
question, not a game-mechanics one, and must not feed engine constants. The alice/cinderella
pauses are lifted (both stay pinned; alice's surviving basis is the anchor-independent counting
arithmetic on her own solo footage, [2.98×, 3.57×) ⊇ datamined 3.5×). Standing protocol rule for
future solo-gauge work: **define the recording's viable window BEFORE reading from it.** This
also corrects the reader-validation claim in the 2026-07-29 per-unit entry above ("reproduces the
anchor's +9.1% then +3.45% pattern to 0.05–0.15%") — that claim predates the ladder; the rider
sub-step reproduces exactly, the weapon sub-step does not (and the footage order is rider-first).

## Alice focus charge-gauge un-pinned to 3.5x; cinderella pinned at 2.0x by owner override (2026-07-29)

**Follow-up run** to the split decision above, re-testing whether alice and cinderella could be
un-pinned from `PENDING_TEAM_ISOLATION`/`magDumpRof` to their datamined `fullChargeBonus`
multipliers, using a fresh shot-counting re-derivation (not the disputed gauge-fill reader
magnitude) on existing solo footage. Full record: `docs/handoffs/scientific-method-harness.md`
2026-07-29 "Alice & Cinderella should use datamined `fullChargeBonus` values" entry.

**Alice: IMPLEMENT (2-of-2 HIGH+HIGH).** `docs/probes/solo/alice solo.MP4` fills the gauge on shot
6 (`t=18.38s`); the counting bound `[100/6, 100/5) = [16.67%, 20.0%)` contains the datamined 3.5×
prediction (19.6%/shot) and excludes the flat-2.5× prediction (14.0%/shot, predicts shot 8). Both
driver and blind Fable post-op independently ACCEPT H1 at HIGH confidence. **Enacted:** `alice`
removed from `PENDING_TEAM_ISOLATION` in `src/engine/sim.ts` `gaugePerShot()`; she now falls
through to her table `fullChargeBonus` 350 (3.5×), byte-identical mechanism to
scarlet-black-shadow's prior enactment. `docs/handoffs/2026-07-29-alice-focus-gauge-implement.md`.

**Cinderella: pipeline REJECT H1 (2.0×) at HIGH confidence both sides** — a fresh 60fps recount on
`docs/probes/720-kit-audit/cindy solo neutral.MP4` (24+24+24+4 = 76-shot magazine, ammo-keyframe
confirmed) found the first gauge step at shot 9, not shot 1: the bar sits flat at its floor from
`t≈7.37s` to `t≈11.08s`, and visual inspection of the raw frames confirmed the "BURST" label sits
at the bar's empty end and does not occlude the growing fill — i.e. shots 1–8 measurably generate
no gauge. The resulting effective multiplier (`≈2.22×` over the 68 contributing shots) excludes
both 2.0× and the current 2.5× pin, closer to the latter. **Owner override enacted anyway:**
`charFixes.focusChargeMult: 2.0` (`src/skills/overrides/cinderella.json`), applied ahead of the
`magDumpRof` pin in `gaugePerShot()`. The owner ruling treats the 8-shot gaugeless opener as a
reader/UI artifact rather than a real mechanic and enacts the datamined value directly, not from an
independent measurement — this is a deliberate departure from the pipeline's HIGH-confidence
REJECT, not a resolution of it. `docs/handoffs/2026-07-29-cinderella-focus-gauge-owner-override.md`.

**Engine:** new opt-in `charFixes.focusChargeMult` (`src/skills/index.ts`, `src/prepare.ts`,
`src/engine/sim.ts`) — an explicit per-unit override that takes priority over both the table
`fullChargeBonus` value and the `magDumpRof`/`PENDING_TEAM_ISOLATION` pin. Currently only
`cinderella` sets it; `vesti-tactical-upgrade` remains pinned via `PENDING_TEAM_ISOLATION`
(unaffected by either change).

**Blast radius:** Alice-focused and cinderella-focused comps' focused-gauge generation changes
(~+40% alice, ~−20% cinderella vs the prior flat-2.5× behavior for each). Graded probes where
either held camera focus should be re-checked.

## SUPERSEDES the "pipeline REJECT" framing above — cinderella's 2.0× confirmed TRUE, not a contested override (2026-07-29, same date)

The entry immediately above frames cinderella's `focusChargeMult: 2.0` as an owner override
enacted AGAINST a HIGH-confidence pipeline REJECT (a recount claiming an 8-shot gaugeless opener
and an effective ≈2.2× multiplier). **That REJECT finding, and the earlier §CINDERELLA-RESULT
≈2.2× reading it repeated, were both instrument/reading errors — the same mistake recurring, not
independent corroborating evidence.** They are RETRACTED (owner ruling). The corresponding entry
in `docs/handoffs/scientific-method-harness.md` has been deleted outright (not marked SUPERSEDED —
the finding never happened) rather than left as an audit trail, at explicit owner direction.

**Standing fact, closed:** `focusChargeMult = chargeMultiplier/100` (equivalently
`fullChargeBonus/100`) is the TRUE per-unit camera-focus charge-gauge multiplier for every SR/RL
unit, cinderella included — 2.0× for her, same footing as alice's 3.5× and
scarlet-black-shadow's 1.5×. There is no open dispute, no unresolved opener anomaly, and no
outstanding measurement gate on this value. `docs/data/burst-gauge.md` §4 and
`src/skills/overrides/cinderella.json`'s note are updated to drop the "contested override"
framing accordingly.

## DPS chart drops the enikk-proven ("meta") gate — every sim-supported B3 is now ranked (2026-07-29)

**Decision.** `scripts/build-dpschart.ts`'s tested population no longer requires
`generatorSupported` (enikk top-100 usage) or a bossing tier in `{SSS,SS,S,A,B}`. Eligibility is now
just: burst III (or the same `FORCED_BURST`-style pin the team generators use, `src/teamcalc.ts`) +
`simSupported` (has a real kit override). Owner ruling: the chart's job is to rank every unit the sim
can actually model, not just units popular enough to show up in enikk's top-ranker sample — "meta
only" was never the intent, just an accident of reusing the generator's eligibility flag.

**Why.** QUEUE.md flagged 7 sim-supported B3s rendering two large "Not ranked on this board" plates
each (`2b`, `a2`, `phantom`, `red-hood`, `rei-ayanami`, `rei-ayanami-tentative-name`, `sugar`) — the
only sim-supported units with no bar chart at all. Investigation found three independent causes, not
one: `2b`/`a2`/`phantom`/`sugar` simply aren't on the enikk union (low real-world usage, not a bug);
`rei-ayanami`/`rei-ayanami-tentative-name` ARE on the union but under aliased display names
(`"Rei"`/`"Rei (Tentative Name)"`) that `data/enikk-supported.json` never reconciles against
`characters.json`'s real names — a separate, still-open bug for surfaces that still use
`generatorSupported` (the roster/team generators); `sugar`'s tier `C` independently failed the old
`SELECTOR_TIERS` gate. `red-hood` (Λ, all-stage burst) was excluded by the `burst !== 'III'` filter
outright — nothing to do with support flags. Rather than patch each cause separately (manually
allowlisting the enikk-unproven units, fixing the alias, special-casing the tier), the owner chose to
retire the shared root cause: **the "meta-only" gate itself**, since the game and the sim now support
far more of the roster than enikk's top-100 usage sample reflects. This also incidentally fixed an
8th unit the original QUEUE triage missed: `laplace-ultimate-hero` (same not-on-the-enikk-union cause
as the AR/RL/SG group).

**What landed.**

1. **`scripts/build-dpschart.ts`** — population filter is now `effBurst(slug, c.burst) === 'III' &&
c.simSupported && tiersFile.tiers[slug]` (the tier existence check is a defensive boundary guard;
   every current sim-supported B3 already has one). `CHART_TIERS` (SSS/SS → shown as a ranked bar by
   default; everything else selector-only) is unchanged — that's a display-density concern, not an
   eligibility one.
2. **`src/dpschart/matrix.ts` `CHART_PROFILES`** — added `'red-hood': { lambdaStage: 3 }`, pinning her
   sim rotation to burst stage 3 (same mechanism as `bready`'s taste profile) so she actually occupies
   the tested B3 slot instead of free-running as a Λ wildcard. The web tab's "Custom Profiles"
   disclosure already documented "Red Hood & Rapi: Red Hood — Operate as Burst III (B3)" before this
   landed; the backend just never delivered on it.
3. **`scripts/build-infographics.ts`** — trimmed the now-stale comment sentence claiming
   sim-supported-but-unranked B3s were "a DATA gap, tracked in QUEUE.md" (this landing closes that
   gap for the 8 units it applied to).

**Evidence.** Population grew from 43 to 51 B3s; regenerated `web/public/dpschart.json` (build output,
gitignored) confirmed all 8 target slugs present. `red-hood` produces a sane, non-zero, mid-pack DPS
in both the Solo framework (750,036, rank 31/51 in `solo.neutral.c0.scope`) and a named-control
framework (2,081,905, rank 31/51 in `standard.neutral.c0.scope`) — not zero, not an outlier, confirming
the `lambdaStage` pin works in both team-assembly shapes. `npm run test:dpschart` (dedicated build +
smoke test) passes; rendered unit cards for `red-hood` and `sugar` (`scripts/render-unit-card.ts`)
show real ranked bars in place of the former "Not ranked on this board" plates. Full `verify.sh` green
(2148 unit tests, all regression suites) with these changes.

**Explicitly NOT fixed here.** The `rei-ayanami`/`rei-ayanami-tentative-name` display-name alias bug in
`data/enikk-supported.json` still affects every OTHER surface that gates on `generatorSupported`
(the roster/team generators) — only the DPS chart stopped checking that flag. Tracked as an open
follow-up in QUEUE.md.

## DPS chart build: skip-if-unchanged gate against the live artifact (2026-07-29)

**Decision.** `scripts/build-dpschart.ts` now hashes every file its computation actually depends on
and, before running a single cell, compares that hash against the `inputsHash` embedded in the
CURRENTLY LIVE `${NIKKESIM_SITE_ORIGIN}/dpschart.json` (default `https://nikkesim.app`). On a match
it downloads and reuses that artifact byte-for-byte; on any mismatch, fetch error, timeout, or
missing field it falls through to the full rebuild — fail-open on anything uncertain, never skip on
doubt. `--force` bypasses the check unconditionally (manual/testing use).

**Why.** The B3 population expansion earlier this session (43→51 units) pushed the full rebuild to
~4m08s, and most deploys touch nothing this artifact depends on — infographics/web/share-config work
is the bulk of this repo's actual commit traffic. The owner asked for a file-watch, but there's no
long-running process during a one-shot Railway build for a watcher to live in; a skip-if-unchanged
gate is the equivalent for a build step. The owner also asked whether the artifact needs to be
committed to git so a hash could survive between fresh Railway build containers — it doesn't: the
LIVE PRODUCTION URL already persists across deploys independent of the build container, so fetching
it at build time supplies the "did anything change" reference with no new infra (no Railway cache
mount, no DB, nothing committed). This deliberately avoids reopening the 2026-07-23 `verify.sh`
ruling against committing the derived artifact to git (rejected then for diff noise/merge conflicts
across concurrent sessions, and because a stale committed copy would let a smoke test assert against
an older engine's output while reporting green) — this mechanism never touches git at all, and
shares only the discipline that ruling implies: fail toward a rebuild, never toward a silent stale
skip.

**What's hashed, and why directories instead of a hand-maintained file list** (owner steer: don't
hand-maintain the code-file list). Three directories are hashed WHOLESALE — `src/dpschart/`
(matrix/run/noop — cell + team-assembly logic), `src/engine/` (sim.ts + the sg-geometry.ts/unigeo*.ts
it imports — the damage formula itself), `src/skills/overrides/` (every unit's kit model, ~93 files)
— so a new file added inside any of them needs no update to the hash list; a directory walk covers it
automatically. Six files are hand-listed individually (`prepare.ts`, `bestol.ts`, `relationship.ts`,
`elements.ts`, `types.ts`, plus four `src/skills/*.ts` helpers) because they sit flat under `src/`
with unrelated siblings (`teamcalc.ts`, `ranks/`, `share/`, `server/`, …) and there is no directory
boundary that would isolate them without also dragging in code that has nothing to do with the DPS
chart's math. Eight data files round out the list, including two a naive read of
`build-dpschart.ts` alone would miss: `data/gauge-per-shot.json` and `data/relationship-bonus.json`,
both pulled in only via static `with { type: 'json' }` imports inside `engine/sim.ts` and
`relationship.ts` respectively.

**Evidence.** Verified all four branches directly: (1) unchanged inputs against a local mock of the
live endpoint → reused the artifact byte-identical, 0.45s vs the ~4min full run; (2) a deliberately
wrong `inputsHash` on the mock → correctly fell through to a full rebuild; (3) `--force` → bypassed
the check and ran fully even with a matching mock; (4) an unreachable origin (connection refused) →
failed open to a full rebuild immediately, no hang. `npm run typecheck` clean; full `bash
scripts/verify.sh` and `bash scripts/verify.sh deploy` both green end-to-end (2164 tests; the deploy
run took 7m05s total on this box, correctly doing a full rebuild since the real
`nikkesim.app/dpschart.json` doesn't carry an `inputsHash` yet — this lands cold on the very next
real deploy, then hits the fast path once a deploy with no relevant changes follows).

**Also landed alongside (unrelated fixture drift, surfaced by this work):** the
`unit-card.{discord,twitter}.png` golden fixtures were stale by one Burst Gen rank (#36→#37 for
Crown) — ordinary roster-data churn unrelated to the dps-chart change (Crown's card doesn't read
`dpschart.json` at all; it reads the burstgen/sustain/buffer boards only), never caught before
because the golden test SKIPS when `web/public/*.json` doesn't exist on disk, which it hadn't during
prior sessions' test runs. Regenerated via `npm run fixtures:infographics`, diff eyeballed
(`git diff --stat` showed only these two files touched; the rendered before/after differ in exactly
the one rank number).

- **(2026-07-30) `sugar`'s `data/gauge-per-shot.json` row was never reading her own datamine —
  corrected to match `drake`/`noir`.** Found while auditing why she reads far below `drake`/`noir` on
  the burst-gen ranking board (owner: "sugar has the same entries in characters.json that lead to the
  datamined values for noir and drake, and is also listed as rl3 27"). Confirmed: `sugar`'s
  `characters.json` `role.weapon.shot_detail` already carries `burst_energy_pershot: 4500` /
  `target_burst_energy_pershot: 9000` — byte-identical to `drake` and `noir` (same `rl3: 27` too) —
  but her `gauge-per-shot.json` row was populated with the generic SG class-modal fallback
  (`basePerTrigger: 200` / `targetPerTrigger: 400`, tagged `"class-modal-SG"`) instead of her own
  already-present data. The derivation formula (raw `target_burst_energy_pershot` ÷ 10 =
  `targetPerTrigger`) holds exactly, with zero exceptions, on every other confirmed-datamined
  RL/SG-adjacent row checked (`zwei` 7000→700, `anis-sparkling-summer` 5000→500, `drake`/`noir`
  9000→900) — this was a lookup gap in whatever pass originally populated the table (`sugar`'s row
  was added later, in `c044fcb` "finalizing support ranks v1", using the fallback because her
  datamine wasn't picked up at that time), not a deliberate or measured value. Corrected to
  `basePerTrigger: 450` / `targetPerTrigger: 900` / `source: "datamined"`, matching `drake`/`noir`
  exactly. `sugar` is not in any graded comp roster; `scripts/regression.ts` and `bash
scripts/verify.sh` both green, no snapshot change. Ruled a direct data-correctness fix (same class as
  the 2026-07-26 `liberalio` ×6-datamine-misread correction) rather than a `/scientific-method` empirical
  claim — the evidence is the unit's OWN already-present primary-source record, not a new measurement,
  and the formula was already cross-validated on 4 other units with no exceptions.

- **(2026-07-30) `fillGauge` (discrete "Fills Burst Gauge X%" effects) now respects the chain-lock
  exactly like every other gauge-generation path — DECISION = IMPLEMENT (2-of-2 ACCEPT, both HIGH
  confidence).** Full `/scientific-method` run (a follow-up companion to the 2026-07-29 dot-tick
  gauge-concurrency entry above, which left this exact code path's premise unresolved as "Fix B").
  **Evidence tier: OWNER RULING, this project's top tier for a real-game mechanic question — not an
  empirical measurement landed in this session.** Asked directly whether in-game "Fills Burst Gauge
  X%" effects bypass the chain-lock, the owner answered (2026-07-30, verbatim): "no, they dont". This
  is NOT re-derived here (no premise-verifier was spawned for it — a direct owner statement on a
  real-game mechanic is stronger evidence than anything a file-search subagent could establish, and
  the harness's own cheapness rule holds an already-confirmed input needs no re-probing).
  **The fix:** `src/engine/sim.ts`, `case 'fillGauge'` guard changed from `if (fbEndFrame <= frame)`
  (only the Full-Burst half of the lock) to `if (fbEndFrame <= frame && stage === 0)` — the exact
  guard `addGauge` already uses for every continuous per-shot/per-tick gauge path. **CORRECTION (step 7
  implementation review caught this): `little-mermaid` is NOT the sole carrier as first stated** — `src/
skills/overrides/cinderella-crystal-wave.json` also carries a `fillGauge` block (S1:
  `teamAmmo(200) → fillGauge(12) → allies`). Both are covered: `cinderella-crystal-wave`'s own kit test
  (`scripts/tests/units/cinderella-crystal-wave.test.ts`, "feeds TEAM burst cadence: removing it drops a
  teammate's burst count") passes unchanged post-fix (27/27) — a SECOND, independent confirmation the
  effect stays alive-but-gated (her fixture's rotation dynamics differ from little-mermaid's sole-B1
  comp, so removing her fillGauge still measurably drops a teammate's burst count even after the fix,
  unlike little-mermaid's fixture where it fully collapses to equality). Her two `scripts/regression.ts`
  appearances: the `disabled: true` "T5 wind-weak" comp (unrelated pre-existing burst-generation
  shortfall, not gating) and an unrelated invariant check (that a burst-gated support unit never casts
  more often than the focus unit it's synced to — `scripts/regression.ts`'s "Mast burst-gate
  (syncWithFocus)" section, an internal test-pattern name for that check, not a reference to any unit
  named `mast`/`mast-romantic-maid`) that uses `cinderella-crystal-wave` as its test case, unrelated to
  `fillGauge` specifically. Both green under `scripts/regression.ts`'s full run above.
  **Verification, both judges independently ACCEPT/HIGH:** (1) her kit test's `M4` "BEHAVIOURAL"
  sub-test (`scripts/tests/units/little-mermaid.test.ts`) previously asserted removing the block
  LOWERS her 180s total — true only under the old bug. Corrected to an EQUALITY assertion (she's the
  sole B1 in that fixture, casting every ~15s cycle, so her chain/FB uptime is high enough that
  essentially every `teamAmmo(400)` crossing lands locked post-fix — `base` and `noFill` totals become
  bit-identical, 426,367,981.6068724 both), directly verified (not assumed) to FAIL on the reverted
  engine (429,480,823.04 vs 426,367,981.61, ~3.11M delta) and PASS on the fixed one — a real
  discriminator. The test's comment states this equality is fixture-conditional (this comp's burst
  uptime), not a universal law of `fillGauge`. (2) A new committed instrument,
  `scripts/build-burstgen.ts --isolate-fillgauge <slug>` (isolates a unit's `fillGauge` channel by
  running `burstGenFor` against an in-memory override clone with `fillGauge` blocks stripped — the
  file on disk is never touched), measured little-mermaid's channel dropping from 11.339 to 9.052
  gauge%/s — **79.84% retained**, inside a band ([75%, 90%]) pre-committed BEFORE the measurement to
  distinguish a correctly-gated effect (partial retention) from an over-blocked/dead one (≈0%) or a
  guard that never engaged (≈100%). (3) `scripts/regression.ts`: all 7 graded comps hold with zero
  `--update` needed — `little-mermaid`'s only graded comp, "N6 mihara/maiden wind", re-confirmed
  `EV_FB=11` and every unit's snapshot stable. (4) `bash scripts/verify.sh`: 150 files / 2178 tests,
  fully green. Landed on isolated worktree `nikke-sim-wt-fillgauge-fixb`, commit `7809459`, cherry-
  picked to main.
  **What this does NOT establish** (explicitly struck by both judges): whether "Fills Burst Gauge X%"
  respects the chain-lock in real NIKKE — that rests entirely on the owner ruling above, not on
  anything measured in this run; and nothing here speaks to board accuracy for any OTHER or future
  `fillGauge` carrier beyond `little-mermaid`.
  **Reservation carried forward (post-op judge, non-blocking):** the corrected M4 equality is
  fixture-contingent — a future roster/fixture change that gives little-mermaid genuine gauge-limited
  (rather than cooldown-limited) rotation windows could legitimately make `base > noFill` again with a
  CORRECT guard, and the test would need re-measuring, not reverting. The landed test comment already
  states this explicitly.

- **(2026-08-03) Unit-card portraits: a build-time GATE that FILLS, and coverage stays advisory.** A
  card's portrait comes from a committed thumb (`web/public/img/portraits/<slug>-{128,256}.webp`);
  `loadPortrait` returns null for a missing file and every consumer degrades silently — the unit card
  to its letter placeholder, DPS/rank rows to a blank chip. Nothing re-ran `npm run thumbs` as data
  syncs added units, so four (`laplace-ultimate-hero`, `maxwell-ordinary-mechanic`,
  `anne-miracle-fairy`, `rei-ayanami-tentative-name`) shipped placeholder cards — including through
  `/nikke` in Discord, which embeds the pre-rendered card and caches it by URL indefinitely. Ruling:
  `scripts/build-infographics.ts` gains a **portrait gate** beside the font/icon gates — it generates
  any missing thumb before the first render and mirrors into `dist/img/portraits` (what the deployed
  server reads for on-demand renders). Two deliberate asymmetries with those gates: (1) it **fills
  rather than fails**, because the fix is mechanical and a CDN blip must not redden a deploy of
  unrelated work — a filled card is strictly better than the placeholder that would otherwise ship;
  (2) the fill uses **sharp**, not the Playwright pipeline, so it needs no browser binaries on the
  deploy box — same `PORTRAIT_CROP_TOP` framing (shared via `scripts/lib/portrait-thumbs.ts`, so the
  two can't drift), differing only in resampling kernel/encoder (measured: mean abs channel diff
  6.3/255 vs the browser thumb for `laplace-ultimate-hero`). Playwright stays CANONICAL for
  _committed_ thumbs, since its bytes match the web's own runtime canvas fallback. Coverage is
  reported by `npm run thumbs -- --check` and run **advisory** in `verify.sh` rather than as a gate
  or a vitest assertion: a hard failure would redden the tree the moment a sync adds a unit, in
  worktrees that have neither a browser nor the art CDN, and the deploy now self-heals anyway. —
  `scripts/lib/portrait-thumbs.ts`, `scripts/build-infographics.ts` `fillMissingPortraits`,
  `scripts/tests/share/portrait-thumbs.test.ts`

- **(2026-08-03) The `/mechanics` + `/howto` prerender pass is DELETED; both routes serve their prose
  by request-time injection.** `scripts/prerender.ts` booted the server, rendered the two content
  routes in Playwright and saved the DOM to `dist/<route>/index.html` — wired into `npm run
build:deploy` **only**. But `railway.json`'s `buildCommand` is `bash scripts/verify.sh artifacts`,
  a tier that never calls `build:deploy`, so the step **never executed on the deploy box** and both
  routes shipped an empty `<div id="root"></div>` to every crawler that does not run JS — precisely
  the population (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, PerplexityBot, all allowlisted in
  `web/public/robots.txt`) the pass existed to serve. Confirmed two independent ways: reading the
  build config, and fetching production, where `/mechanics` and `/howto` returned **1 character** of
  body text while `/unit/rapi` and `/characters` — which already used request-time injection —
  returned full bodies, proving the deploy current and this step alone inert. The old
  `web-smoke.mjs` check could not have caught it: `assertPrerendered()` **skipped** when the file was
  missing, and it was always missing in that build — a green check asserting nothing. Ruling: delete
  the pass and extend the injection functions instead, which is what the same-day `/unit/*`
  prerender rejection already settled ("extend those functions — do not add a prerender pass"), and
  which matches the portrait-gate entry above in avoiding any dependency on browser binaries being
  present on the deploy box. `scripts/build-content-pages.ts` renders
  `web/public/content-pages.json` from the SAME modules `MechanicsPage.tsx` / `HowToPage.tsx`
  import, so the crawler-visible copy cannot drift from the rendered page (the guarantee
  `data/unit-pages.json` gives the unit pages); both servers inject it into `#root`; the generator
  runs in verify.sh's **`artifacts`** tier — the tier the deploy actually runs. Measured on the
  production bundle: `/mechanics` 1 → **5,030**, `/howto` 1 → **10,128** characters of
  crawler-visible body text. Pinned by `content-pages-drift.test.ts` (byte-for-byte vs the
  generator) plus served-byte assertions in **both** serve suites — `serve-headers` (serve.mjs) and
  `serve-api` (the `static.ts` port production runs); none of them can skip. — `scripts/build-content-pages.ts`,
  `src/server/static.ts`, `scripts/serve.mjs`, `scripts/verify.sh`

- **(2026-08-03) K's burst weapon: `damagePct` 925 → 92.5, real SG pellet-landing routing, cadence 2 → 2.4.**
  K's burst kit reads "Damage: 92.5% of the final ATK / Pelletcount: 10 / Attack speed ▼90%". The
  2026-08-02 kit-autonomy gauntlet encoded this as `damagePct: 925` — reading 92.5 as a PER-PELLET
  value and collapsing 10 pellets into one 925%-of-ATK hit per pull — and signed it off in-session as
  "no bug / EV-exact"; that sign-off left no `DECISIONS` entry of its own, so this entry supersedes it
  by name. **Finding:** "Damage X% / Pelletcount N" is the FULL-SHOT total, each pellet carrying X/N —
  the same convention `normalAttackMultiplier` uses for every SG-class unit in this engine. Evidence
  (MEASURED, not a new K reading): `dorothy-serendipity`'s kit ("Damage 201.5%, Pelletcount 10", raw
  `shot_detail.damage: 20150`) matches her MEASURED one-full-shot popup total
  (`docs/probe-data/dorothy-solo-reanalysis.json`) ≈243,000 vs 118,027 × 201.5% = 237,824 (+2%; a
  per-pellet reading predicts 2,378,240, refuted 10×); cross-checked against `drake`'s measured white
  pellet in `docs/probe-data/coreband-drake-sg.json`. **Changed:** override `damagePct: 92.5`,
  `pelletCount: 10`, `weapon: "SG"` (routes the swap through the SAME accuracy-circle pellet-landing
  model and near-band-only range eligibility every genuine SG unit already takes — no weapon-swap in
  the engine could reach that model before this, gated `u.char.weapon==='SG' && !u.swap`, unconditionally
  false during any swap). Engine gains an optional `pelletCount` field on the `weaponSwap` effect kind;
  the two SG-landing gates broaden to `u.swap?.weapon==='SG'`. Provably inert elsewhere: full regression
  diff byte-identical, K in no graded comp or snapshot cell, and only `nayuta` (`weapon:'SR'`)
  otherwise sets a swap `weapon`. **Same-day addendum:** `pullsPerSec` corrected 2 → 2.4 — the kit's
  "Attack speed ▼90%" applies to the swap weapon's own NOMINAL rate (base SMG's datamined
  `rate_of_fire` 1440 RPM × 0.10 = 144 RPM), not to the already frame-quantized 20.0/s effective SMG
  rate the original derivation had scaled instead; run through the engine's existing
  `quantizeToFrames` (sim.ts:224, already MEASURED/validated 2026-07-23 for the general mechanism —
  144 RPM lands on an exact 25-frame interval, no rounding). **Tier:** MEASURED, via existing
  Dorothy/Drake probe data + datamined field-schema match — NOT a new K measurement; K remains
  MODEL-ONLY, unvalidated against real footage. **Process note:** both the driver and a BLIND Fable
  post-op judge independently ACCEPTed the core fix (`/scientific-method`, full pipeline —
  `docs/handoffs/scientific-method-harness.md` 2026-08-03 entry) but capped confidence at MEDIUM, one
  bounded item short of the HIGH+HIGH bar this harness requires to auto-IMPLEMENT: K's swap weapon
  (`shot_id 1004102`) has no `shot_detail` record anywhere in the datamine, so a hidden `muzzle_count`
  multiplier (the same KIND that already invisibly doubles her own base SMG, `damage:455 × muzzle_count:2
→ normalAttackMultiplier 9.1`) can't be ruled in or out — the harness therefore LOGGED this as an
  owner action item rather than auto-landing it. **The owner reviewed the LOG and chose to merge as-is**,
  accepting the MEDIUM-confidence risk: even in the worst case (a hidden ×2 muzzle multiplier), the
  corrected reading is a strict improvement over the certainly-10×-wrong 925 value. **Open:** (a) the
  muzzle-count question — a scope-lock focus recording of a K team would resolve it in the same pass as
  graduating her off MODEL-ONLY (popup-read her burst-window white-pellet base value: ~10,918
  ATK-equivalent under the accepted no-muzzle reading vs ~~21,836 under a hidden ×2); (b) with the
  corrected cadence her burst weapon nets a real but MODEST advantage over just continuing her own
  buffed SMG fire (~~+11% total damage on the `scripts/tests/units/k.test.ts` fixture, not the ~10× the
  pre-fix 925 misread implied) — an atypically thin margin for a Burst III's signature weapon, though
  not disqualifying (her S2 grants the whole team +10.62% Attack Damage, which may be the kit's real
  value driver). — `src/skills/types.ts`, `src/engine/sim.ts` (`effectivePellets`, `firePull`'s `bandSg`
  gate, `WeaponSwap` interface), `src/skills/overrides/k.json`, `scripts/tests/units/k.test.ts`

## Board artifacts decoupled from the PR-CI build path — Steps 0–1 landed, Steps 2–4 deferred (2026-08-04)

**Decision.** PR CI no longer BUILDS the six board JSONs — it FETCHES the published set from
nikkesim.app (~1s; `scripts/fetch-published-boards.ts`: retries, hard-fail, documented escape
hatch) and runs an ADVISORY staleness check (`scripts/check-board-freshness.ts`, FRESH/STALE/NO-HASH
states, never fails CI). The deploy path keeps building — `deploy.yml` builds the boards pre-deploy
and the Railway build rebuilds them from the merged branch — so a stale published artifact
self-heals at deploy time and the deployed site is never stale: the deploy path is the HARD gate
(owner decision applied as recommended: advisory on PR, hard on `main`/pre-deploy). `verify.sh`'s
artifacts tier skips the builders under `SKIP_BOARD_BUILD=1` (set by ci.yml only), and a
post-deploy `builder-canary` job in deploy.yml force-rebuilds the boards after every successful
deploy — the builder-breakage signal Step 0 removes from PR CI (`--force` is load-bearing: without
it the post-deploy live candidate carries every row and proves nothing). Step 1 generalizes the
dpschart input hash (2026-07-29 entry above) into one SSOT, `scripts/artifact-input-hash.ts`: one
shared GLOBAL bucket for the five rank boards — the refresh unit is `ranks:all`, all five rebuild
unconditionally, so per-builder granularity could never change a decision the hash drives — plus
own buckets for ol-default and infographics, with `inputsHash` embedded in every artifact (the
infographics manifest carries it as provenance; boards are hashed stripped-content so rebuild
timestamps cannot move it). `board-hash-parity.test.ts` is the hard half: a locally-present artifact
whose embedded hash disagrees with the tree fails naming the exact refresh command; it skips only
where unactionable (absent artifact, pre-hash published artifact, or fetched-and-stale under
`BOARDS_FETCHED=1`). ol-default.json is COMMITTED, so its gate is hard everywhere. Also pinned:
`b1b2dps.json` was the only board missing from `MUTABLE_PATHS` on both servers (no-cache by
fallback accident, one matcher change from a year-long cache).

**Why.** The board-build step cost 472s on any engine PR (434s dpschart full rebuild + ranks:all on
the 4-vCPU runner; CI run 30877617106 / PR #82): the 2026-07-29 skip gate correctly cannot carry
rows over when a global-bucket file moves, because an engine edit can move any unit's damage and a
file hash cannot prove otherwise — the rebuild WAS the step. Storage and scheduling are separable
and only scheduling buys the time back; the live site already functions as the artifact store
(`fetchLiveCandidate` has fetched it for carry-over since 2026-07-29), so Step 0 generalizes an
existing proven transport instead of adding infra. The DB-storage half (plan Step 2) is deferred
indefinitely: for ~314 KB of JSON already publicly served, a DB adds schema/migration/secret
surface for zero time beyond Step 0, and the plan's own hazard review preferred the public-URL
path. Steps 3–4 (image-store split for ~48s of infographics; nightly rebuild cron) deferred
likewise — revisitable options, not roadmap; Step 4 additionally waits on its open roster-drift
decision. The board-join tests are shape/join checks (slugs ⊆ roster, fixed card geometry,
rank/index consistency), not engine-vs-artifact value parity, so running them against a fetched
artifact stale w.r.t. the branch is safe — the common stale case is exactly an engine PR.

**Cross-family code review (kimi-k3, two rounds, owner-directed routing).** Round 1 BLOCKED:
`src/stats.ts` (characterStat — every simulated unit's ATK/DEF/HP) and `src/data/squads.ts`
(squadOf — same-squad block gates) were in NO hash bucket, the false-FRESH failure mode; the gap
pre-existed in the 2026-07-29 dpschart bucket (the Step-0 extraction carried it verbatim) and the
first ranks cut repeated it (direct-imports-only scan missed the transitive closure of sim.ts /
prepare.ts). Fixed in `1252c6da`; the NEW parity test correctly caught the intermediate ol-default
drift during the fix. Round 2 CLEAN, one FOLLOW-UP filed: the infographics bucket still misses
`src/ranks/b1b2-cells.ts` + `src/ranks/buffer-rows.ts` (value-imported by
`src/infographics/core/rankTables.ts`, one hop beyond the round-1 fix) — zero impact while the
manifest hash is provenance-only; a Step-3 pre-req, queued in `docs/handoffs/QUEUE.md`.

**Evidence.** `verify.sh` fast + full green; full PR-CI simulation green (`BOARDS_FETCHED=1` full
gate against fetched stale boards + `SKIP_BOARD_BUILD=1` artifacts tier); rebuild determinism
(twice → identical hash); all 65 dpschart per-unit hashes byte-identical to the live artifact
post-extraction; PR #85 CI green in 5m38s with the fetch step at ~1.2s. One-time cost: the bucket
additions move every hash once — one full board rebuild on the first deploy, which the deploy path
performs anyway. Plan + landing record + audit trail:
`docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md`; PR #85.

## Pellet-reader tooling: substrate faithfulness before accuracy — five landings (2026-08-05)

**Tier: MEASURED + OWNER-MEASURED.** Measurements in `docs/probe-runs.md` §25–§34; plans and
cross-family gate verdicts in `docs/handoffs/2026-08-05-*`.

**The ruling that organizes all five: fix the SUBSTRATE before chasing the number.** The pellet
reader has been ~1.4 pellets/shot cold since §19, and the temptation each session is to hunt the
cold bias directly. Instead these landings made the measurement apparatus faithful first, on the
principle that a channel measured on a substrate that mislabels 12% of it cannot be trusted either
way. That ordering was vindicated twice — §27's marker measurement was only askable after §26, and
§30A found the re-extraction everything was supposedly gated on had never been necessary.

1. **`--dump-tracks` now persists per-frame `is_red` and full-precision positions** (§25/§26). The
   dump could not replay the `white`/`red`/`marker` split production emitted — 12.20% of the
   marker-bearing population. Two mechanisms, fully accounted. **Why full precision rather than 2 dp:**
   the cross-family gate showed 2 dp only shrinks the flip window and leaves the acceptance criterion
   unprovable; full precision removes the mechanism by construction. Cost +37.8% dump size, accepted.
2. **The pellet/hit-marker lifetime is 14 native frames, not 13** (§28/§29, OWNER-MEASURED). ⚑ Not a
   refit — the owner corrected the measured value, the same shape as §18's 8.40 confirmation. Inert
   at the production 30 fps (`max_pellet_frames = 7` either way), so no prior measurement moved.
   **Its real value is that it retires a documented trap:** `(13/60)×30 = 6.5` sat exactly on the
   JS-half-up / Python-half-even tie; `7.0` does not.
3. **The synthetic generator's fade ramp is a formula, not literals** (§29E). The owner clarified the
   lifecycle gains one fade frame at the end. The old `0.66`/`0.33` proved to be 2 dp roundings of
   `2/3, 1/3` — the same ramp at N=2 — so extending it is that rule at N=3, and the selftest
   re-derives the old values to keep "same rule, one more frame" a CHECKED claim.
4. **Owner adjudication answers are PRIMARY EVIDENCE and must be committed** (§32/§34). The 08-04
   answers lived only in chat, so the 4 both-wrong cases became unidentifiable and their cost
   unmeasurable — recovery was attempted and fails structurally. `--lock-adjudication` now emits a
   pre-filled `ANSWERS.json`, and `--lock-adjudication-score` scores it. ⚑ **Corollary ruling: never
   offer only the modes under test.** The vocabulary has been too narrow twice running — 08-04 lacked
   `both`/`neither` (20% of cases), 08-05 lacked `A_imprecise`/`B_imprecise` (6 of 20). Owner wording
   is preserved verbatim and never coerced.
5. **The mislock channel is CLOSED as a cold-bias candidate** (§34). The production lock is bad on
   **70%** of detected-mislocked shots (replicated to the digit), but the both-wrong subpopulation —
   §22D's suspected worst case — measures **5.00 vs 5.73**, indistinguishable from zero. §22D's bias
   caveat is discharged; the channel costs ≈0 pellets/shot.

⛔ **What none of this did: explain the cold bias.** Every channel investigated is now closed or
sized small — mislocks ≈0, marker semantics −0.043/shot **in the wrong direction**, `band_hi`
+0.50/shot recovered. **Closing candidates is not identifying a cause**, and the ~1.4/shot residual
stands.

> ⚑ **AMENDED (2026-08-06) — the summary sentence above merges FOUR arms with different bases and
> n into one unattributed claim. It is not withdrawn; it is under-specified.** Attribution, per the
> band-channel sweep (`docs/handoffs/closed/2026-08-06-band-channel-SWEEP.md`): **−1.40** ⇒ `--residual-ab`
> (probe-runs §38 — it had **NO committed instrument** until then, the second occurrence of the
> constraint-9 failure; n=5 shots, one clip, in-sample). **mislocks ≈0** ⇒ `--lock-adjudication`, a
> **COUNT** observable — ⚑ §37B established that a mislocked count is **refilled by non-pellet
> tracks**, so a count observable structurally cannot see the loss, and §38C's n=1 relock (−1.40 →
> −0.40 on one clip) is in tension with it. ⛔ Neither overturns item 5 above; both are recorded as
> leads. **−0.043/shot** ⇒ `--marker-net` (815 shots). **+0.50/shot** ⇒ `--band-production-ab` (815
> shots out-of-sample, measuring what the landing MOVED, not movement toward truth, §30C).
> ⇒ **Quote the arm, the basis and the n — never the merged sentence.**

⚑ **A gap this pass found and did NOT backfill:** `DECISIONS.md` had no entry between 2026-07-30 and
this one, while `docs/probe-runs.md` §13–§24 records six 08-01→08-04 landings (the `band_hi = 20`
ceiling, the `band` dump channel, the backend-selector tie-break, the representative-frame hybrid,
and two pre-committed measurement passes). Their WHY exists only in the measurement log. Writing
those entries now would mean inferring another session's rationale from its numbers, so they are
**flagged for the owner rather than reconstructed** — see `docs/handoffs/QUEUE.md`.

## Infographic branding: the nikkesim.app mark moved to the card's top-right corner (2026-08-13)

**Tier: OWNER RULING (visual/product).** No measurement is involved — this is how the cards look.

**The ruling (owner, 2026-08-13):** every infographic carries "the same nikkesim.app + icon in the
top right corner ... that the nikke cards have", instead of the muted grey footer line plus a small
icon inline with the title. It generalizes the 2026-07-28 unit-card ruling to the whole card set,
for the same reason that one gave: the title row is where the eye already is, while the footer was
the least legible text on the card at timeline scale.

**What that forced, and how it was resolved.** A card's `footer` field was carrying two unrelated
things at once — the nikkesim.app URL, and a NOTE beside it (the sim's standing caveats, or the
`simmed <date>` provenance stamp `src/server/card-from-build.ts` appends so a card drawn from a
stored snapshot says when that snapshot was produced). Moving "the footer" wholesale would have
dropped the second. `theme.ts footerNote` separates them: every URL segment is DROPPED, and the
remainder keeps a small `drawFooterNote` line, drawn ONLY when non-empty. Cards whose descriptor is
nothing but their URL now have no footer line at all, which is why the bottom bands shrank
(58→30, 44→24, 40→22) rather than sitting empty.

**The mark says `nikkesim.app` and nothing else** (owner, same day, after seeing the first cut). The
first implementation promoted the URL segment into the wordmark, so cards read `nikkesim.app/charge`,
`nikkesim.app/ranks` — the sub-page still deep-linking rather than collapsing to the bare domain.
The owner's ruling is the bare domain everywhere: a path reads as instructions at a glance, where the
mark should read as a name. So `drawBrandMark` now takes **no text parameter at all** — a caller can
neither remove the mark nor reword it — and the paths are simply gone from the cards.

**The architectural invariant survives the move.** The centralization plan's point (§2, "the
advertising goal has an architectural consequence") was that no renderer can ship an unmarked image
by forgetting the mark. `drawWatermark` was the single footer path enforcing that; `drawBrandMark`
is now the single top-right path, and takes no caller input, so `footer` can no longer influence the
mark at all — only whether a note joins it.

**Two consequences worth knowing.** (1) `core/siteIcon.ts` was DELETED, not kept: its measured
cap-height plate geometry existed solely to size an icon sitting inline with a title, and no card
does that any more — the mark uses `drawContained` at a fixed 40px, the unit card's own geometry.
(2) The `*_TITLE_INK_REGION` blank-text guards now start at `padX` instead of past the icon. That is
safe for the reason the guard exists: the vacuous-guard bug was a region satisfiable by ICON pixels
alone, and the mark is now at the opposite end of the card from the title. `infographics-golden.test.ts`
pins the separation per card, and sizes its canvas to the mark's real position so the check can't
pass by drawing the icon off-canvas.

**Companion change in bakery-bot** (`infographics/2026-08-13-image-outside-embed`): the bot stopped
posting cards inside embeds. An embed caps its image at the embed column's width — a 900px chart
rendered unreadably small — while Discord renders attachments above embeds at full message width.
Cards now ship as plain attachments with the embed as a caption below, its mark reduced to the
author line's ~24px icon since the card above already carries the full-size one.

## Per-unit table cards: the max-ammo portrait, and a parity test that pinned its absence (2026-08-13)

**Tier: OWNER-OBSERVED defect + code fix.** The owner reported "the max ammo card isn't showing the
portrait"; the cause and the reason nothing caught it are below.

**The defect.** `src/server/api.ts` attaches a unit's portrait on `spec.unit`, without branching on
which table it is — so an ON-DEMAND max-ammo render always had one. `scripts/build-infographics.ts`
attached it only in the charge-speed job, and its comment asserted the split was intentional ("the
generic one and the ammo tables do not"). The bot resolves `/max-ammo` through the MANIFEST — the
pre-rendered set — so every max-ammo card a player actually saw was the portrait-less one, while the
same card rendered through the API had a portrait. Fixed by attaching it in the ammo job too.

**Why the guard didn't fire, which is the more useful half.** `prerender-api-parity.test.ts` exists
precisely to catch a pre-render/API disagreement, and it was passing. It builds the API-side data by
HAND rather than calling the API's builder, and its hand-built version carried the same per-kind
branch — `max-ammo (no portrait)` was written into the test as a comment and a code path. So the
test reproduced the bug on both sides and compared them to each other. A parity test that
re-implements one side is only as good as that re-implementation; the portrait attach is now
unconditional there, mirroring `api.ts`'s `if (spec.unit)`, and the per-kind branch is gone.

**Also this pass, unrelated to the defect:** the charge-speed card's subtitle dropped its trailing
parenthetical (`shots per Full Burst (10s, +22f release)` / `(10s, autofire — no release latency)`)
by owner ruling — the 10s window and the latency term are how the column is DERIVED, not something
the reader acts on. `latencyFrames` still feeds the Shots/FB numbers, and two table-share assertions
that had been reading it off the SUBTITLE now assert the arithmetic instead, which is what had to be
right either way.

## Owner ruling: nothing banks during the Full-Burst drain hold — the generating window opens at the charging bar's first paint (2026-08-16)

**Ruling (owner, 2026-08-16):** while the spent Full-Burst bar is still draining/holding the
widget slot, NOTHING banks into the next cycle's gauge; filling starts from zero at the moment
the charging bar first paints. This promotes the 2026-08-14 opening-window observable from
hypothesis-tier to owner-ruled: the observable (banked-at-paint medians 5.3–8.1% vs the 42–81%
drain-empty banking would predict; a dark track under the drain bar on 36/36 windows —
`docs/probe-runs.md` 2026-08-14 entry) had been fenced as non-promotable without new footage or
a ruling; the ruling is now the promotion path taken.

**What changes:** nothing in the engine — generation was already modeled as opening at FB end
(the FB-end → chain-start window, CLAUDE.md verified facts). What hardens is the MEASUREMENT
chain: bar-paint anchoring of refill-window statistics (the fill-trace/classification
instrument family, `scripts/probe/fill-trace-compare.ts`) is now ruled ground truth rather than
a corroborated inference — the charging bar's first paint IS the window opening, trailing the
exact FB end only by the 0.13–0.22 s render latency (n=36, probe-runs 2026-08-14). The
2026-08-15 classification packet's anchor premise (Pc) and every future fill-trace pre-op can
cite this entry instead of re-fencing the observable.

**Recorded in:** `docs/data/burst-gauge.md` §1 (new core-rules bullet). The probe-runs
2026-08-14 entry stays as the measurement record; the harness-log fencing language
("promotion requires a pre-registered replication on NEW footage or an owner ruling") is
satisfied by this ruling, not overturned.

## Owner rulings: non-damage enemy-debuff APPLICATIONS generate burst gauge, and so do their RE-APPLICATIONS/refreshes (2026-08-16)

Two in-game observations by the owner in the Union shooting range (no recording; owner-ruling
tier), running the test recipe filed by the 2026-08-16 gauge research pass ("watch the bar at a
debuff re-application instant while not firing"):

1. **A periodic debuff RE-APPLICATION onto the target generates burst gauge** — while holding
   fire, the bar ticks up at the instant the debuff re-applies. This ANSWERS the half every
   external source was silent on (the research pass had filed it CANNOT-DETERMINE) and makes
   the refresh channel a REAL candidate source for the iron-sweep generation excess (steady
   refill windows with zero fresh applications but recurring refreshes). The filed recipe named
   `emma-tactical-upgrade`'s Environment Setup 30s cadence as the test vehicle; the owner's
   report did not record the exact unit used.
2. **Standalone enemy-targeted debuff skills generate — confirmed for `jackal` S1**, promoting
   the research pass's [MEDIUM] external reading (note.com/_trick_, nikke.gg, nikke-synergy) to
   owner-confirmed for the generating cases. The per-skill-exception structure STANDS — the
   arena counterexamples (Noah's taunt, `snow-white-heavy-arms`' damage-taken ▲ generating
   nothing) are not touched by this ruling, so "generates" remains a per-skill property, not a
   universal rule.

**What changes: docs only — NOTHING is enacted.** The engine's `skillGauge()` still credits only
skill-damage hits and DoT ticks; non-damage applications/refreshes remain unmodeled. Enactment
is a separate gated pass because two inputs are missing: (a) the per-application/per-refresh
gauge AMOUNT is unmeasured (external sources suggest the caster's flat base per-trigger value —
the same flat credit as skill-damage hits — but no owned measurement pins it), and (b) the
per-skill exceptions mean a blanket "debuffs generate" enactment is known-wrong at roster scale.
Follow-up (magnitude measurement + per-skill scoping, then the engine pass) filed in
`docs/handoffs/QUEUE.md`.

**Recorded in:** `docs/data/burst-gauge.md` §5 (rewritten bullet). Related: the 2026-08-14
per-hit crediting rulings above; the iron-sweep thread in `docs/handoffs/QUEUE.md`.

## ENACTED: non-damage enemy-debuff applications/refreshes credit the caster's datamined per-trigger gauge value (2026-08-16, owner-authorized)

**Enacts the owner rulings recorded in the previous 2026-08-16 entry.** The owner supplied the two
missing inputs the same day: (1) the test unit for the re-application observation was confirmed as
`emma-tactical-upgrade` (Environment Setup), and (2) the MAGNITUDE is ruled: **the amount is the
unit's weapon per-trigger burst generation from the datamine** (`data/gauge-per-shot.json`
`targetPerTrigger`), with explicit authorization to enact without the `/scientific-method`
pipeline — the answered-question path (owner ruling → encode + `/code-review`, 2026-08-11
convention).

**Engine** (`src/engine/sim.ts`): `applicationGauge()` credits the FULL `targetPerTrigger` (no
per-hit/SG-pellet division — an application is one discrete event; every current qualifying caster
is a hitsPerShot-1 weapon so the division would be a no-op today) once per qualifying application
event, at the top of `applyBlockEffects()` so `delaySec`-deferred blocks credit at their resolve
frame. `isGeneratingApplication()` gates it: enemy-targeted; PURE non-damage (buff/`targetStatus`
effects only — a block also carrying `flatDamage`/`dot` already generates through its impacts, and
crediting both would double-count); trigger in the include set
{`interval`,`attacked`,`passive`,`battleStart`,`burstCast`,`fullBurstEnter`,`fullBurstEnd`} — the
anti-double-count rule excludes bullet-delivered/coincident triggers
(`shotFired`,`lastBullet`,`hitCount`,`chargeCounter`,`teamAmmo`), and anything NOT in the include
set stays non-crediting by default so a future trigger kind must be classified deliberately; some
effect with finite `durationSec` < 900 (no-duration = permanent aura, 999 = the permanent-status
sentinel, e.g. `mast`'s Sea Breeze — neither is an application event); caster not in
`APPLICATION_NONGEN` = {`noah`, `snow-white-heavy-arms`} (the nikke-synergy arena counterexamples —
defensive documentation: neither has a qualifying block in today's overrides). Interval re-fires
credit each time — the refresh ruling. The standard `addGauge` guard scopes all of it to the
FB-end → chain-start generating window.

**Spec:** `scripts/tests/engine/application-gauge.test.ts` (7 tests: interval application +
refresh magnitude pinned to the datamined row; `emma-tactical-upgrade`'s real-kit 2-credits-in-40s;
`jackal` S1 via the `manualAttacks` hook scaling per activation; negatives for bullet-delivered
triggers, permanent auras/999 sentinel, damage-block no-double-credit, and the non-generator set).

**Blast radius:** the roster audit (committed overrides, the predicate above) finds LIVE credits
only for `emma-tactical-upgrade` (0.1 gauge-%/application — passive@0 + interval:30) and
`rosanna`'s battle-start `targetStatus` (one modal-fallback credit at t=0); `jackal`'s S1 is
kit-faithfully encoded but inert in production BY MECHANISM (the v1 sim has no incoming-damage
model — `attacked` triggers fire only via the `manualAttacks` test hook); `ether`'s interval
debuff is double-dead (its `fbGate: inFb` fails outside Full Burst, and inside it `addGauge` is
locked); every `burstCast`/`fullBurstEnter` qualifier is chain/FB-locked to zero by the same
guard. **Graded/control exposure: zero BY MECHANISM — no pinned comp in `scripts/regression.ts` /
`scripts/control-regression.ts` seats any of the four units above (grep-verified), and the full
`verify.sh` suite passed with both snapshots byte-identical (no `--update`).** The un-modeled
remainder — kits whose in-game periodic re-applies are encoded as permanent passives or
chain-locked triggers — is the open iron-sweep question, tracked in `docs/handoffs/QUEUE.md`.
