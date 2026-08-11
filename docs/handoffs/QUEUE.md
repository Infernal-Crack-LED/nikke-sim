# QUEUE.md — live action items (session state, AI-facing)

> Moved out of `CLAUDE.md` 2026-07-26 (owner ruling: the work queue is session state, not an
> instruction file — `CLAUDE.md` keeps durable rules + verified facts only). Every live/deferred
> TODO or "next steps" list MUST live HERE — chat is ephemeral, only files carry across sessions.
> Landed current state → `docs/STATE.md`; research threads → `docs/open-questions.md`; settled WHY
> → `docs/DECISIONS.md`; the actionable **live TODO → here**.
>
> **Hygiene (the `.claude/hooks/commit-state-hygiene.sh` nudge fires once per session on commit):**
> items below carry ONLY genuinely-open action items as short pointers into their handoff/plan docs
> — no landed-work narration (landed state → `docs/STATE.md`; settled WHY → `docs/DECISIONS.md`).
> When an item lands, DELETE it here (keep only its open follow-up clause); a done handoff →
> `CLOSED (date)` marker + **`git rm --cached` then a plain `mv`** into `docs/handoffs/closed/`
> (archiving UNTRACKS — the archives are gitignored; procedure and its failure modes in
> `docs/CONVENTIONS.md` → Doc hygiene); a fully-landed top-level `docs/*.md`
> (never a living log) → same into `docs/closed/`; a resolved question → close it in
> `docs/open-questions.md` (single U-numbering — move it to `docs/answered-questions.md` with the
> answer inline, no new A-number).
>
> **Last audited 2026-08-09** — every claim below was re-verified against the tree (branch merge
> state, file/symbol existence, test skips, doc paths). Landed narration deleted; dangling pointers
> repaired.

**PHASE: industrialize the accuracy sweep** — every owned unit within ±3% (multi-run avg) at n≥5,
fewest videos. Master plan: `docs/handoffs/2026-07-16-full-sweep-plan.md`. Dashboard:
`npx tsx scripts/board-read.ts`. **Submission intake: 0 pending** (Nikke Sim Data Submission Google
Form → `/submission-intake` → `/probe-processing` → hand-tune; this line is the tracked count).

### 🤖 AUTONOMOUS WORK QUEUE — read this INSTEAD of the pointer list below if unattended

> **Why this exists (2026-07-25).** The pointer list below is an excellent _attended_ handoff and a poor
> _autonomous_ task list: ~15 threads, most gated on recordings the run cannot obtain, owner rulings it
> cannot get. An unattended session reading it finds no unambiguous
> next action and wanders — burning a night for near-zero landed output. This queue is the opposite: a
> short, ordered list where every item is **(a) unblocked, (b) verifiable by
> a script that already exists.** Owner maintains it; keep it SHORT (≤5) and delete items as they land.
>
> **Rules for an unattended run:**
>
> 1. **Take the topmost unblocked item and finish it.** Do not survey the whole list, do not re-plan the
>    phase, do not "improve" an area you were not sent to.
> 2. **Land in committed slices.** A slice = a coherent change + its gate green (`bash scripts/verify.sh`
>    or `npx vitest run`) + a commit whose message names the premise it rests on and how it was verified.
>    Committing is encouraged and cheap (constraint 2); pushing stays owner-gated. The autonomous
>    blast-radius cap enforces this mechanically at 300 uncommitted lines.
> 3. **PRODUCTIVITY STOP.** Every ~45 min, ask: _what have I committed with a green gate?_ Two consecutive
>    checkpoints with no commit ⇒ **STOP the thread**, write findings to a handoff doc, and either move to
>    the next queue item or end the run. A night that produces one honest committed slice plus a clear
>    handoff beats a night of exploration with nothing landed.
> 4. **Reuse before you derive** (the SUFFICIENCY rule) — search for an existing labeled set before
>    generating ground truth. An unattended run is exactly where the 5-hour re-derivation happens.
> 5. **One unvalidated fact is not a mandate.** If a finding implies a broad rewrite, that is a STOP-and-
>    propose, not a green light: write the proposal, commit it, continue. Sweeps are FINDINGS-ONLY.

**QUEUE (owner-maintained; empty = do a survey pass and propose, do not invent work):**

1. _(empty — owner fills)_

### Open action items (pointers — attended sessions)

- **⇒⇒ START HERE IF YOU ARE PICKING UP AFTER THE 2026-08-11 SESSION (branch
  `fix/faithfulness-tier0`, PR open).** That branch closed the faithfulness pass end to end and left
  the tree in a clean state; what follows is what it did NOT do, in the order it would take them.
  Full WHY for every item: `docs/DECISIONS.md`, the four 2026-08-11 entries.
  1. **The faithfulness pass is DONE through Tier 4, and the Tier 3 RECORDING LIST is fully
     retired** — 10 of its 12 asks were answered from owner game knowledge, one (M1) by an A/B that
     refuted the ask's own premise, one (M7) by re-filing into the SG investigation.
     `2026-08-10-faithfulness-ENACTMENT-START-HERE.md` is now a historical record, not a worklist.
     **The durable lesson is in its §5: ask the owner before asking for footage.**
  2. **The two round-count Pierce carriers are RESOLVED (2026-08-11)** — `d-killer-wife` was a real
     gap and is enacted (board 0.937 → 1.012); `dorothy-serendipity` was a FALSE POSITIVE whose
     line is already modelled through her `consolidation` block. See the item further down for
     both, and for the one follow-up it left (her N1 comp overshoots on `grave`'s known HOT).
  3. **Tier 5 engine primitives stay HELD** (`quency-escape-queen` stage-unlock ordering, the 5e
     state machines, `alice` caster-relative charge speed, the `skillGauge`-fires-twice + charge-B3
     gauge-tempo pair, `chargeCounter` bypassing block gates). Ranked in the ENGINE-WORK ORDER
     below. None of them was touched.
  4. **The phase-4 TAIL now has its entry doc and its first axis is CLOSED (2026-08-11)** —
     `docs/handoffs/2026-08-11-faithfulness-tail-plan.md`. Generated-census approach, as the
     scoping note asked. Axis 1 found zero new defects and left one owner ruling open (the heal
     magnitude record split) plus five unbuilt axes; see the item further down.
  5. **Two primitives landed this session and each has exactly one carrier** —
     `gainPierce.durationShots` (5 carriers, 3 converted) and `convertExcess` (1 carrier). If a
     second `convertExcess` carrier ever appears, revisit the deliberate MAX-on-refresh and the
     passive-trigger-only restriction; both are documented in `src/skills/types.ts`.

- **⇒ STANDING ASSUMPTION to confirm when convenient — the amp keys off an INTERNAL TARGETING ID,
  not the rendered English.** Owner ruling 2026-08-10 ("it'd be really dumb if it didn't"), which
  forgave the localization's stray article and tagged 6 units (`guilty` ×2, `nero`, `novel`,
  `pepper`, `power` ×2, `rapi` — AR/Fire base). The artifact case is airtight (7 clause bodies
  attested both ways; `pepper`, `rapi` and `maiden-ice-rose` each spell the same clause both ways
  in their OWN kit), but the id-vs-text premise is an assumption, not a measurement. **A popup
  read of an amped nuke on any of the six settles it**, and being wrong costs zero on the board
  today — all six are on `jackal`'s side and `jackal` is in no graded comp.
  [findings](2026-08-10-burst-amp-literal-scope-findings.md) §4a.

- **⇒ ENGINE GAP, recorded: a burst-slot `dot`/`stackedNuke` can never be amp-eligible.**
  `burstDesc` is authorable on `flatDamage` only, so FIVE units — `ark-ranger-black`,
  `diesel-winter-sweets`, `guillotine-winter-slayer`, `maiden-ice-rose`, `mana` — carry a
  QUALIFYING literal on their damage block and still cannot be tagged. Board-inert. The fix
  threads `burstDesc` through the dot/stackedNuke records + their tick paths — an engine change,
  deliberately out of the faithfulness sweep's scope.
  [findings](2026-08-10-burst-amp-literal-scope-findings.md) §4b.

- **⇒⇒ FAITHFULNESS PASS — ENACTMENT PHASE. A fresh session starts at
  [2026-08-10-faithfulness-ENACTMENT-START-HERE.md](2026-08-10-faithfulness-ENACTMENT-START-HERE.md).**
  The finding phase is DONE for all 45 board-graded units (batches 1–8). That doc orders every
  enactable finding into tiers — Tier 0 the five batched OWNER DECISIONS (D1–D5, all listed
  separately below), Tier 1 the one board-moving fix (`jill`), Tier 2 the burst-amp validation that
  BLOCKS further tagging, **Tier 3 the RECORDING LIST (M1–M12) — the highest-leverage owner action,
  since the remaining accuracy is behind footage, not code**, Tier 4 safe consistency enactments,
  Tier 5 held engine primitives. It opens with the honest framing: enacting everything ready today
  improves the board by roughly ONE unit.

- **U28 rider-gauge class — DIRECTION RULED (2026-08-10, Tier 0 / D4), enactment still bundled.**
  `extraHitDamagePct` riders emit no `skillGauge` where an equivalent `flatDamage` instance would
  (`sim.ts:4053` vs 2568/2605/3803); the omission is a DEFECT, not a modeling choice, so only WHEN
  is open. All four carriers (`modernia`, `nayuta`, `neon-blue-ocean`, `neon-vision-eye`) now record
  the ruling in their notes. Lands with the batched gauge cluster, whose corrections partially cancel
  — see ENGINE-WORK ORDER item 4 and `2026-08-10-gauge-economy-findings.md`.
  [batch-6 findings](2026-08-10-faithfulness-batch6-findings.md).

- **⇒ OWNER RULINGS 2026-08-11, SECOND BATCH (M-list triage part 2). ONE still open: M8.**
  - **M3 — distributed damage CAN crit. CLOSED, nothing to enact.** It CONFIRMS the shipped engine
    default: `flatDamage` procs crit unless a block sets `crit: false`, and a roster sweep shows all
    12 distributed carriers (`quency-escape-queen`'s 1736.31 nuke, `dorothy`'s 8900.83, `phantom`,
    `2b`, `scarlet-black-shadow`, …) already run crit-on.
  - **M8 — `red-hood`'s stack ramp: ✅ LANDED 2026-08-11** as the new `convertExcess` derived-stat
    primitive (`rampSec` was indeed the wrong tool — it is a TIME ramp and hers is per-stack).
    Board 0.970 → 1.002. Found and fixed along the way: her Red Wolf "Charge Speed ▲100.8%" was
    never modeled at all, only implied by the swap's charge-time clamp.
  - **M10 — `rouge` coin CO-EXISTENCE: ENACTED 2026-08-11**, and **this entry's original premise was
    WRONG** — worth recording because it nearly aimed the fix at the wrong line. It claimed Sword's
    Attack Damage ▲6.65% "switches OFF the moment Shield activates"; in fact that line was already an
    ungated permanent passive and never switched off. What WAS exclusive were the three burst Max-HP
    riders, so the fix made their gates cumulative (Sword rider ungated, Shield `{min:1}`, Double
    Sword `{min:2}`) and is **damage-inert** — ally-granted Max HP does not feed a teammate's
    `atkOfMaxHpPct` (theme 13). The stated ⚠ U38 coupling is therefore MOOT for this change.
  - **M12 — `mint` starts on DANCING and flips on her OWN cast. CLOSED, nothing to enact** — it
    confirms the shipped `singing` resource (initial 0, two `mode:'solo'` `burstCast` blocks at
    `everyN` 2 / offsets 0 and 1). Her solo mode still has no real-fight anchor for the MAGNITUDES it
    gates (S1 `casterAtkPct` 45.02; S2's crit 19.94 / projectileExplosion 50 / pierce 32.72) — an
    unanchored-model item, not a mechanism question.

- **The two round-count Pierce carriers are RESOLVED — one was a real gap, one was a false
  positive.** The shared premise this item rested on ("Pierce is inert on a single boss") is
  REFUTED by `docs/data/game-mechanics.md` §11: Pierce Damage ▲ is an ordinary Damage-Up entry and
  DOES apply on the partless boss; the multi-part-only mechanic is the core+body double-hit, a
  different thing that the two were being conflated with.
  - **`d-killer-wife` — REAL, and enacted.** Her S1-A "Gain Pierce for 1 shot" (every 3 full
    charges) now encodes as `hitCount 3 → gainPierce durationShots 1`. She is her OWN pierce
    granter (her S1-B gives SR allies, herself included, Pierce Damage ▲13.55% on FB enter), so
    the untagged reading was losing damage with no teammate required. Board **0.937 COLD → 1.012
    OK** (MAD 0.063 → 0.039). ⚑ Per-comp it is NOT uniform, and the spread is the interesting
    part: +2.4%/+2.6% in her two non-`grave` comps, **+20.0% in N1**, where `grave`'s permanent
    all-ally `pierceDamagePct` 48.4 is what the tag unlocks. N1 now reads 1.066 HOT — see the
    follow-up below.
  - **`dorothy-serendipity` — FALSE POSITIVE, no change made, do not "convert" her.** Her "Gains
    Pierce for 3 round(s)" is ALREADY modeled, just not via `gainPierce`: it shares one trigger
    and one 3-round window with the "Pellet count is fixed at 1" clause beside it, so it rides her
    `consolidation` block's `pierce: true` → per-shot `pierceActive`, scoping pierce to exactly
    the consolidated rounds. Encoding it a second time would double-book the window. The line she
    genuinely leaves unmodeled is the OTHER one — S1-B "Expands Pierce **range** by 200%", which
    is penetration depth through targets and IS correctly inert on a partless single boss. The
    `src/skills/types.ts` comment that listed her as an unconverted carrier is corrected.
  - **⇒ OPEN FOLLOW-UP (findings-only, do not chase by shaving the kit-literal line):**
    `d-killer-wife`'s N1 comp overshoots to 1.066 HOT. N1 is the `grave` comp, and `grave` is
    herself 1.095 HOT with documented over-credits (always-on Heat Emission uptime; the U19
    empty-magazine effect). The overshoot most likely rides `grave`'s known HOT, not this line —
    which is the "re-tune the exposed unit separately, never re-fudge the fix" case. Worth a look
    when `grave` is next touched.

- **⇒ OWNER-GATED ONE-LINER: the `gainPierce` comment in `src/engine/sim.ts` (~:2891-2894) still
  carries the claim the 2026-08-11 Pierce work refuted.** It reads "This is the literal form of five
  kits (nihilister / harran / neve / dorothy-serendipity / d-killer-wife); before it existed they
  shipped durationSec stand-ins" — but `dorothy-serendipity` never shipped a stand-in and must NOT
  be converted (her grant rides her `consolidation` block's `pierce: true`; see DECISIONS
  2026-08-11). The parallel comment in `src/skills/types.ts` was corrected, so the two files now
  disagree. **Comment-only, zero behaviour** — left unmade solely because `src/engine/**` is a
  protected path needing explicit owner approval. Raised by the cross-family `/code-review`
  (`kimi-code/k3`) as a NOTE; full result at
  `scratchpad/gates/2026-08-11-dkw-pierce/result.json`. Fix = mirror the types.ts wording (four
  `durationShots` carriers + `dorothy-serendipity` via `consolidation.pierce`).

- **M1 `guillotine-winter-slayer` — the cadence ask is CLOSED, and the "~26% hot normal fire" framing
  was a MISATTRIBUTION.** OWNER RULING 2026-08-11: she uses her datamined fire rate (`pullsPerSec` 12
  / `rate_of_fire` 720); do not refit it. Checked the owner's hypothesis (is the level-up ammo refill
  modelled wrong?) by A/B on her graded comp `PH water B3s`: removing the `instantReload` block
  entirely moves her 1813 → 1802 shots and 280M → 279M — **the whole ammo channel is +0.6% of her
  shots**, so it cannot inflate a fire rate either. Re-cadencing the EXP/level blend to a realistic
  core fraction (c = 0.44: `hitCount` 3 → 4, level-up 30 → 42) is worth ~1.4% (1.023 → 1.006). AND
  the whole-picture check nobody ran: **her board reading is 1.0238, inside ±3%.** The 26% traces to
  two OLD unit-level readings (`run H` slot-5 + `N8` focus, 1.21–1.34) recorded in her `residual`
  line, i.e. a different context, and `12 / 1.26 ≈ 9.5/s` was an arithmetic coincidence turned into a
  suspect. If anyone wants the residual re-opened, re-derive it from a CURRENT reading first.

- **M7 `noir` reload gap → folded into the ONGOING SG INVESTIGATION** (owner-directed 2026-08-11),
  not a standalone recording ask. Her recon reads a reload of ~0.6–0.9s against the datamined 62f ≈
  1.03s and she sits 0.884 COLD on 2 graded comps, but she is the **SG-landing-table calibration
  anchor** (`docs/probe-data/noir-solo-recon.json`), so a cadence change moves the band table's own
  basis — which is exactly why it belongs to the SG thread rather than beside it. Cross-referenced
  from `docs/handoffs/2026-08-06-OWNER-ASK-mislock-labels.md`, the live SG owner-ask (it already
  asks for `noir` pellet marking, so the same footage may serve both).

- **⇒ OWNER RULINGS 2026-08-11 (M-list triage) — SIX of the twelve recording asks answered from game
  knowledge, no footage needed. **ALL SIX ARE NOW CLOSED** (DECISIONS 2026-08-11): M5, M8 and M9
  landed as code, M4 needed no change (already implemented + pinned), M2 and M11 confirmed the
  shipped model, and M6 landed as `docs/modeling-priors.md` prior 12.**
  1. **Tier 2 / M2 — `trina`'s Burst-Skill-Damage amp follows the LITERAL wording only, and
     `cinderella` (RL/Electric) does NOT receive it.** The Tier 2 blocker is retired WITHOUT a
     recording: her untagged state is owner-CONFIRMED, not provisional, and the 0.893 → 1.523 blowup
     was the tag being wrong, not the sim. The literal-only census (`scripts/census-burst-amp-scope.ts`)
     is the rule of record. Placement (additive into Damage-Up) and magnitude (435.6) remain ⚑
     unmeasured, but they now bite ONLY units that literally qualify.
  2. **M4 — true damage CAN core hit. ✅ NO CHANGE NEEDED — already implemented AND already pinned.**
     The core gate carries no true-flavor exclusion (just as crit carries none), and the
     normal-attack path passes `core: true` regardless of flavor. Measured on `chisato`: all 324 of
     her true-flavored swap normals are core-eligible at a live core rate. Pinned by
     `scripts/tests/units/chisato.test.ts` ("ENGINE ⚑ PIN: true swap normals remain crit+core-eligible").
  3. **M5 — `ada` fires ONE special-charged shot per burst window. ✅ LANDED 2026-08-11** as
     `maxShots` 1 on the burst weaponSwap. Board cost was larger than the ~0.95 estimate: **0.995 →
     0.924 COLD**, accepted under faithful > fit. Her cadence shift also rippled into two other
     units' fixtures (see the `nihilister` item above and little-mermaid M4).
  4. **M6 — ALL STACKS REFRESH unless a kit says otherwise. ✅ LANDED 2026-08-11** as
     `docs/modeling-priors.md` prior 12 (a GAME-WIDE rule, not an `ade-agent-bunny` fact). Her
     `hitCount:10` gate is confirmed live — measured first firing at 14.9s, 10× per fight — so the
     plateau-at-3–5 failure mode that would have made her whole S2 package dead code is ruled out.
  5. **M9 — `prika` IS Pierce-tagged during Performance. ✅ LANDED 2026-08-11** (`gainPierce`, self,
     `skill1`, burstCast; 25s solo / 9999 duet). The ~+8% estimate was far low: **0.890 → 1.065**.
     Decomposed on PA MiKa — the TAG is worth ~+0.03, the duet WINDOW ~+0.15, so what actually moved
     her is a premise (Performance never lapses in duet) shared with her `chargeDamagePct`, not the
     ruling. Move both windows together or neither.
  6. **M11 — `mihara-bonding-chain`'s burst RESETS Ensnaring stacks**; the kit's theme is building
     stacks OUTSIDE her B3 window and consuming them with B3. This confirms the mechanism her note
     already models, so no footage is needed — the 12-stack rebuild average stays the one fitted
     number, now derivable from the kit's own rebuild cadence rather than from a recording.

- **The two REAL F7 cap-bakes, now that the list is verified** (2026-08-11, all 12 names checked —
  the audit doc's F7 section carries the corrected classes): `sakura-bloom-in-summer` ⚑4 (burst DoT
  hit-applied at the full 10 stacks from tick 1; a self-ramp reading is ×0.55, and her note states
  the discriminating recipe — read the sustained tick popups right after her burst) and `laplace`
  (RL/Iron) (S1 Hero Vision's stack GATE assumed maxed for the whole burst window, opening the burst
  true-damage conversion from t=0). Both HOT-direction and measurement-gated. `cinderella`
  (RL/Electric) and `arcana-fortune-mate` are PARTIAL (one baked line each, `rampSec` already on
  another); the other 8 names are time-averages or non-members — **do not "correct" those, it would
  double-correct them.**

- **`scripts/blind-rebuild/code-bundle/` is a STALE extract of the engine.** Found while repairing
  its dead citations: it holds ~2,400 lines against `src/engine/sim.ts`'s 4,278, and its `ROTMODEL`
  comments describe `floor` as the default — inverted since the 2026-08-04 owner ruling (`refill` is
  the default; `floor` is the opt-in A/B arm). The two citation sites now say so inline, but the
  bundle as a whole was not re-extracted. A blind-rebuild reviewer reads it as the engine, so a
  re-extract should precede the next blind-rebuild/`/audit-kit` run that uses it.

- **⇒ FAITHFULNESS PASS phase-4 TAIL — entry doc landed, AXIS 1 CLOSED. Start at
  [2026-08-11-faithfulness-tail-plan.md](2026-08-11-faithfulness-tail-plan.md).** The graded slice
  is complete (batches 1–8, all 45 board-graded units); the tail is the 138 overrides with no board
  reading, worked by generated census rather than per-unit reads. Axis 1 (kit magnitudes vs the
  override — `scripts/census-kit-numbers.ts` + its fixture) is built, calibrated against the graded
  45, run, and every finding dispositioned: **zero new defects**, 14 prose-documented
  transformations (the doc names the vocabulary), 1 acknowledged-in-prose gap (`kilo`'s HP-basis
  nuke). The batch-7 START-HERE doc is CLOSED with batch 8, and both roster-wide items the sweep
  surfaced (the 5-carrier lifesteal non-emitter ruling and the U28 rider-gauge class) are RULED —
  see DECISIONS 2026-08-10 Tier 0. The §5 proposal it raised is RULED AND ENACTED (owner
  2026-08-11: unmodeled behaviour is recorded under `unmodeled`, never left to prose — 50 heal
  lines across 34 units + `kilo`'s HP-basis clause; `census-kit-numbers.ts --check` now gates it in
  verify.sh). **Two things are open:**
  - **Axes A2–A6 proposed, none built** — `unmodeled` entries matching no kit line; non-percent
    quantity accounting (the tier that held the `d-killer-wife` round-count defect); "fixed at" vs
    the clamp StatKeys; held-primitive carrier scan; and READ (do not rebuild)
    `scripts/census-synergy-events.ts`. Tail-plan §4.
  - **Axis 1's own carried follow-up** — integer magnitudes are near-auto-clean (281 of 282 collide
    with a duration/count elsewhere in the file), so the axis discriminates almost only on decimals.
    Disclosed in the doc and by `--skipped`; tightening the matcher is deferred because it needs its
    own graded-45 re-calibration. `census-kit-numbers.ts --check` stays out of verify.sh until the
    heal ruling lands.

- **Sweep record (batches 1–8, all landed — reference only, nothing open here):**
  [batch 1](2026-08-10-faithfulness-batch1-findings.md) ·
  [batch 2](2026-08-10-faithfulness-batch2-findings.md) ·
  [batch 3](2026-08-10-faithfulness-batch3-findings.md) ·
  [batch 4 + remainder](2026-08-10-faithfulness-batch4-findings.md) ·
  [batch 5](2026-08-10-faithfulness-batch5-findings.md) ·
  [batch 6](2026-08-10-faithfulness-batch6-findings.md) ·
  [batch 7](2026-08-10-faithfulness-batch7-findings.md) ·
  [batch 8](2026-08-10-faithfulness-batch8-findings.md) ·
  [burst-amp literal scope](2026-08-10-burst-amp-literal-scope-findings.md).
  The batch-6 and batch-7 START-HERE docs are both CLOSED (archived to `docs/handoffs/closed/`,
  untracked).

- **⇒ FAITHFULNESS PASS (2026-08-10) — plan of record:
  [2026-08-10-faithfulness-pass-audit.md](2026-08-10-faithfulness-pass-audit.md).** Repeat-pattern
  audit across engine-modeling-gaps + the formula/bucket docs + the unmodeled review (claims
  re-verified against the tree), with a phased order: doc/input fixes → silent-failure tooling
  hardening → gated engine fixes (gauge-economy batch, Burst-Skill-Damage amp, enemy DEF ▼
  scope ruling, self-status trio) → the override manual-review sweep (last, batch-and-stop,
  per-unit checklist in §2 phase 4). Findings-only; nothing enacted.

#### Unmodeled-review follow-ups (post-enactment remainder, 2026-08-09)

> The 2026-08-09 faithfulness-enactment batch LANDED every enactable finding from the
> unmodeled-entries audit (DECISIONS 2026-08-09 has the full list + board A/B). What remains:

- **Exposed hot fit from the batch — run the pending direct measurement, then re-tune (never
  re-fudge):** `maxwell` 0.889→1.252 (popup-read the burst window in run-G/N6 footage: railgun
  shot count + charged value vs the modeled ~2 × 2440.26%).
- **`alice-wonderland-bunny` stack-grant reading:** now aligned to the +1-GRANT majority; if a
  datamine function-type read or footage confirms the 2026-07-28 cap-raise reading instead,
  revert her addStack block to unmodeled (revert path in her note).
- **misc B3s (run I) FB shortfall:** sim 12 vs measured 13 since `grave`'s kit-real ammo dump
  landed (the old match rode its absence) — pinned as `simFullBursts: 12` in
  scripts/regression.ts; joins the open burst-generation-shortfall thread (the four disabled
  liberalio comps).
- **Small ⚑ phase estimates riding the batch** (each flagged in its override, pin from footage
  if popup-read): `arcana-fortune-mate` reload delaySec 1.5; `neon-vision-eye` in-window normal
  count (the 330 magnitude); `rosanna` Concealment uptime (kit-duration upper bound).

#### Code / tooling (unblocked, no footage or owner ruling needed)

- **⇒ ENEMY DEF ▼ CHANNEL — LANDED 2026-08-10 (owner-ruled "bosses should get -def"); per-unit
  enactments ride the phase-4 review.** The channel (`bossDefNow` — enemy `defPct` scales
  `cfg.bossDef`, floor 0; sub-0.1% at the graded DEF-140 surfaces, live at the web raid
  defaults) + `guilty`'s previously-discarded `defPct: -20.25` are live; equivalence-proof test
  `scripts/tests/engine/enemy-def-debuff.test.ts`; detail `docs/data/damage-bucket-matrix.md`
  §5 trap 4. Batch 1 (2026-08-10, `2026-08-10-faithfulness-batch1-findings.md`) encoded
  `exia`, `novel`, `phantom`, `viper`; batch 2 (`2026-08-10-faithfulness-batch2-findings.md`)
  encoded `anis`, `elegg`, `frima` (×2 lines), `ludmilla`, `marciana-marine-study` and struck
  `cocoa` as a prose-grep false positive; batch 3 (`2026-08-10-faithfulness-batch3-findings.md`)
  encoded `signal` (×2), `himeno`, `ether` (interval+fbGate shape — fork ⚑ in her note),
  `eunhwa` (×2), `mica`, and found the batch-2 "COMPLETE" claim was an under-count (the
  "records the same shape" list held real carriers). **Remaining (kit-text census):**
  `belorta` (S2 −3.52/5s) encodes at her own phase-4 review — the sole override-carrying
  remainder; `centi`/`product-23`/`trony` carry DEF ▼ kit lines but have no overrides;
  `mast` stays unmodeled (flat caster-DEF-basis shave — build only on a second carrier).
  Batch 4 (`2026-08-10-faithfulness-batch4-findings.md`, the board-outlier slice: `jill`,
  `ein`, `moran`, `maxwell`, `takina`, `elegg-boom-and-shock`) added NO DEF ▼ encodes —
  verified against kit text, none of the six carries the line. **The DEF ▼ carrier list is
  now EMPTY: `belorta` was struck at her batch-4 remainder review** — her S2 DEF ▼3.52% is
  gated on "an attack hits more than 4 enemy unit(s)", unsatisfiable against a single partless
  boss, so the line is out-of-domain inert (her override already disposed it that way and pins
  it). Second census false positive after `cocoa`, and a NEW failure mode: a kit-text grep
  finds the LINE but not its GATE. `centi`/`product-23`/`trony` still have no overrides;
  `mast` stays unmodeled (flat caster-DEF-basis shave — build only on a second carrier).
  Enemy ATK ▼ stays genuinely inert. **The `burstDesc` tag class is now DECIDED BY A CENSUS, not
  by judgement (owner ruling 2026-08-10 — the amps are LITERAL-ONLY; DECISIONS):** a damage block
  qualifies only when its own scope clause contains the exact string the amp names
  (`"Affects all enemies"` / `"Affects 1 enemy unit(s)"`). Run
  `npx tsx scripts/census-burst-amp-scope.ts`; it answers per unit and `--check` gates
  over-tagging. That untagged 13 units whose tags rested on the cardinality reading, tagged the
  3 true carriers in the graded slice, and left the board byte-identical. The earlier same-day
  scope-string ruling still stands for what it actually answered — those clauses DO target the
  boss — which is a different question. `cinderella` stays untagged, now by ruling rather than
  pending a measurement, which is what resolves her 1.523-HOT refutation; the amp's 435.6
  magnitude and ⚑ additive Damage-Up placement are untouched and still want the popup read. **Stale-phrase sweep remainder CLEARED 2026-08-10** (`jackal`, `quiry`, `ram` fixed
  at their batch-4 remainder reviews — overrides AND spec headers; a whitespace-normalized
  grep over all 67 overrides + all unit specs now returns zero for the "DEF=0" / "admits only" /
  extinct-engine-quote class). `scripts/kit-autonomy/**` archives still carry it and are
  presumed CHANGELOG-exempt — one explicit ruling wanted.
- **⇒ Unit-card infographic follow-ups (3, code-verified still open 2026-08-02):**
  1. **No vector source for burst icons.** `web/public/nikke-icons/burst_*` is webp-only (~100px native)
     — fine at every size drawn today, but a surface wanting it large has nothing to rasterize from.
  2. **`UnitCardSources.prerelease` is still never set.** `src/infographics/core/unitCard.ts` branches on
     it (`:306`, `:734` `PROJECTION`, `:766`, `:816`) and `unitCardData.ts:722` reads `src.prerelease`,
     but neither `scripts/lib/unit-card-sources.ts` nor `web/src/unitCardShare.ts` mentions it — an
     unreleased unit renders as fully live, with a null `releaseDate` the only tell. Wire it or drop the
     dead branch.
  3. **The browser icon loader still probes extensions and eats 404s** — `web/src/unitCardShare.ts:58`
     `ICON_EXT = ['svg','png','webp']` per icon via onload/onerror. The icon set is static and tracked,
     so the extension is knowable at build time; carry it in the `iconNames` mapping (`{ name, ext }`).
- **⇒ `scripts/tests/fixtures/unit-card-sources.json` is BADLY STALE — owner call, findings-only
  (2026-08-03).** It is a deliberately FROZEN join input, so the crown-card golden stays a pure
  function of the renderer rather than of board data — that design is sound and is not the issue.
  The issue is how far it has drifted: frozen 2026-08-02 at 76 rows / 71 units against a live 91 / 85,
  with **64 generic and 70 typed shared rows differing in value**, some hugely (`anis-star` generic
  59.4 → 33.4 and typed 99.7 → 61.4; `arcana` typed 93.9 → 169.1; `mast-romantic-maid` 61 → 77.2).
  All of that is already on `main` and invisible to the golden. Nothing is broken and the gate is
  green, so this is not urgent — but a refresh wants its own deliberate pass (new golden PNGs, reviewed
  for renderer-visible change) rather than riding along with an unrelated board edit, which is exactly
  the "data churn wearing renderer drift's clothes" the fixture's own header warns about.
  ⚠ Two traps when measuring the drift: the live artifact is gitignored, so compare only after
  `npm run ranks:buffer`; and its cells are TUPLES (`[slug, value, tags, profile]`), not objects — read
  them as `c.slug` / `c.value` and every comparison silently comes back "0 differing".
- **⇒ Pellet-reader: cherry-pick the `+62.5` crosshair-offset fix (`b69b5c6`)** — verified NOT an
  ancestor of `main`; `scripts/probe/read-pellets.ts:66` still defaults `-62.5`, latent, and poisons the
  next run. (It did **not** cause the 2026-07-29 REJECT: artifacts 12:19–13:33, commit 15:17.)
- **⇒ REVIEW `maxwell` (+28.3%) AND `alice` (+18.3%) AFTER THE NO-OP LOW-ATK STANDARDIZATION**
  (2026-08-02, DECISIONS). These two moved far more than the other carriers (`n102` +9.6%, `naga`
  +0.8%, other 8 byte-identical — owner ruling: those are fine as-is, review only these two).
  Re-measure any time with `npx tsx scripts/noop-basis-ab.ts` (deterministic, prints all 12).
  **What to check:** the jump means a self-includable `alliesTopAtk` buff that used to be spent on a
  control now resolves to the tested unit itself. For each of the two, read the kit line behind the
  selector and answer:
  1. Is the buff genuinely SELF-APPLICABLE per kit text, or does it need `excludeSelf` the way
     `chime`/`avistar` did (DECISIONS 2026-08-02, the king-maker ruling directly above this one)?
     A self-buff that the kit means for an ally is now inflating the Solo row by the full delta.
  2. Is the magnitude plausible for the buff's stated value? +28.3% on `maxwell` from one selector
     flip is large enough to be worth arithmetic, not just a plausibility read.
  3. Their board/graded readings did NOT move (regression snapshots all stable), so this is a
     Solo-framework/DPS-chart question only — do not re-tune the override off the board.
     ⚠ Exact slugs: `maxwell` (SR/Iron), NOT `maxwell-ordinary-mechanic`; `alice` (SR/Fire), NOT
     `alice-wonderland-bunny`. The variants do not carry an ally-ATK selector.

#### Engine / model threads (measurement- or owner-gated)

- **⇒ ENGINE REGRESSION FULL-BURST COUNT FAILURES — four comps disabled in `scripts/regression.ts`**
  (`:106`, `:131`, `:158`, `:239`): `iron sweep (run G)`, `T5 wind-weak`, `T1 wind-weak`,
  `N3 scarlet/liberalio iron` each read 1–3 Full Bursts short of their video-measured counts on clean
  `HEAD`, skipped via the `disabled` flag so `verify.sh` stays green.
  **2026-08-03 /scientific-method pass (LOG, 2-of-2 ACCEPT both MEDIUM — full account:
  `docs/handoffs/scientific-method-harness.md`): NOT the same family as U29/U31 (that framing was an
  editing artifact, refuted at the premise gate) — root cause is `liberalio`'s 2026-07-26 gauge-datamine
  fix (`c12fcf4e`, a legitimate correction) unmasking a pre-existing, GENERAL, board-wide charge-B3
  gauge-fill-tempo gap — not liberalio-specific.** A pre-registered non-liberalio baseline
  (`N6 mihara/maiden wind`, currently passing) shows the SAME-OR-LARGER gauge-fill excess per cycle as
  these 4 comps, invisible there only because its own measured target has slack these 4 don't. Per
  CLAUDE.md's blast-radius rule this is NOT a narrow per-comp fix — needs its own dedicated
  `/scientific-method` pass scoped to the general charge-B3 gauge-generation rate (committed instrument:
  `decomposeCycles()`/`DECOMP=1` in `scripts/experiment.ts`, pinned by
  `scripts/tests/gauge-cycle-decomp.test.ts`). Confidence capped MEDIUM on one open question: does a
  real fight hit the sim's own opening/first-FB time (raising to HIGH needs a direct frame-measurement
  of the real FB-end→next-B1 gap on one disabled comp's footage). Leave `disabled: true` until then.
  **2026-08-04 update:** that open question is RESOLVED — the owner confirmed fight time ≠ video time
  (recordings start during the pre-fight intro) and once offsets are accounted the real first FB
  matches the sim's (~5.6s vs ~5.4s); the same ruling removed the post-FB chain-open block
  (`ROTMODEL=refill` is now the default, DECISIONS top entry). The flip does NOT move these comps —
  T5/T1 read 11-12 under BOTH rotation arms (the block never bound for them), so all four stay
  short of their measured counts; the fill-TEMPO gap is unchanged and remains the open channel. The
  `decomposeCycles` floor was re-derived (its old +2.5s lock term is dead; `excess` now reads the
  refill-from-zero directly).
  Separately logged (do NOT bundle in): a general (non-liberalio) `skillGauge`-fires-twice-per-shot
  pattern on any `shotFired`-triggered `flatDamage` rider (`sim.ts:2393`) — its correction direction is
  gauge-DOWN, which would worsen these 4 comps if "fixed" alone; needs its own pre-op pass.
- **⇒ ENGINE-WORK ORDER (read FIRST before resuming per-kit retunes)** — remaining engine work ranked by
  BLAST RADIUS: items that change the shared math every override is calibrated against come before
  per-unit retunes (a retune done first has to be redone). Still open:
  1. Score the `CONE_DELTA` holdouts + the revert-trigger check.
  2. Accuracy-circle geometry — 3 owner rulings open (the `k,c` range measurement is CLOSED as
     unobtainable; do not re-open).
  3. **5e state machines** — the target-status gate half landed 2026-07-23, and its "same machinery for
     all four" rationale was REFUTED by the premise gate (DATAMINED kit text, complete 4-of-4 census).
     The registry is NECESSARY for all four but SUFFICIENT only for `privaty` (closed). Three separate
     builds remain: `mint` a timerless memoryful XOR toggle; `prika` a cross-unit status event bus +
     in-flight duration mutation; `milk-blooming-bunny` a **reload-count-scoped stat CLAMP** (also the
     `docs/engine-modeling-gaps.md` §1b LOCK gap — NOT a timed window). Do not re-attempt them on the
     registry alone.
  4. **U28** — `extraHitDamagePct` vs `flatDamage` gauge + flavor asymmetry. **2026-08-10
     measurement pass (findings-only): FB-count-neutral in the control-comp shape even under an
     exaggerated arm** — bound instrument `scripts/battery/u28-gauge-ab.ts`; the batched
     gauge-cluster proposal (tempo + double-emit reproduce + U28 + theme-20 sourcing, land
     together) is `docs/handoffs/2026-08-10-gauge-economy-findings.md`.
     **DIRECTION SETTLED (owner ruling 2026-08-10, faithfulness Tier 0 / D4):** a function-damage
     instance that lands on the boss SHOULD generate weapon-base gauge — the rider path's omission
     is a DEFECT, not a modeling choice, so the open question is only WHEN and with what, never
     WHETHER. Sequencing is unchanged (lands with the cluster, ENV-gated, `/scientific-method`),
     and the ruling is now recorded in all four carriers' notes (`modernia`, `nayuta`,
     `neon-blue-ocean`, `neon-vision-eye`). Note `modernia`'s S1 is a `flatDamage` _because_ of
     this asymmetry — closing it retires that workaround.
- **⇒ ENGINE PRIMITIVE GAP: `addStack`** — no effect increments an existing buff's stack count by N on
  a trigger. Blocks `flora` S1 ("after 100 normal attacks, all Electric Code allies: increases the
  stack count of stackable buffs by 1" — trigger `hitCount:100` and target `alliesOfElement` are both
  expressible, only the EFFECT is missing) and is the same family as `k`'s Tilted Scale stack-ramp
  (+29 stacks per last bullet, cap 100), which shipped as DOCUMENTED_GAP encoded as a flat
  `burstCast critRatePct 75` steady-state — correct for the burst window, under-credits the pre-burst
  ramp and the first burst's build. Magnitude for `flora` depends entirely on which stack-ramp buffs
  are live on her Electric allies (could be large, could be zero), so it is correctly not estimated.
  Two carriers is not yet a mandate; log a third before building. Not authorized.
- **⇒ ENGINE PRIMITIVE GAP: windowed damage accumulator** — `trony` S1 "T.Rony Bomber" Cumulative
  Damage Skill (plant on full-charge hit: 5s window, accumulates 50% of her dealt damage, cap 1536%
  of final ATK, explodes as Distributed Damage; burst adds +62.83pp to the collection rate) has no
  expression — `storedHit` accumulates CHARGES not damage, `hitRepeat` mirrors %-of-hit instantly,
  and the dorothy-Brand at-cap `flatDamage+delaySec` idiom does NOT apply because trony's cap is
  knife-edge (binds only in her burst-enhanced windows). Blocks `trony` — NO-GO(engine-core)
  gauntlet 2026-08-04; sole roster carrier. Primitive spec + three open semantics (release pipeline
  raw-vs-re-run, sub-cap expiry, collection scope) in
  `scripts/kit-autonomy/manual-review/trony.md`; threading point = hitRepeat's `dealDamage` landing
  path. Not authorized.
- **⇒ ENGINE PRIMITIVE GAP: HP pool + HP-threshold triggers** — v1 models no ally HP pool and the
  scope-lock boss deals no damage, so "HP ≤ X%" / "reaches max HP" / "while shielded by damage" kit
  lines are structurally out of domain (precedents: `liter` cover-HP NO-OP, owner 2026-07-21; the
  `alliesLowestHp` "no HP pool" stand-in). ⚠ **This is NO LONGER a `flora` item** — her S2 turned out
  to self-proc off S1 (entry above) and needs no HP pool. Before building this, census who actually
  still needs it: the honest list is the `incomingHealingPct` / heal-magnitude family, not the
  threshold triggers. Low priority, no authorized carrier. Not authorized.
- **⇒ ENGINE PRIMITIVE GAPS (logged, no carrier pressure)** — surfaced by the 2026-08-02/03 gauntlet
  sweep, all shipped as DOCUMENTED_GAP with the ⚑ triple, none blocking a GO: **FB-end buff removal**
  (`k` S1/S2 both "Full Burst ends → remove <buff>"; moot today because the 10s durations self-expire
  ≈ the FB window) · **empty-magazine effect + status-end trigger** (`grave` S1 "Removes 100% of ammo"
  at Prediction-end — ~9–11 forgone 201f reloads/fight, an over-credit consistent with her board HOT;
  tracked as **U19**) · **crit-gated hit counter** (`k` S1 "every 4 critical pellet hits" — `hitCount`
  counts all hits, not crits; ~5% of her burst damage). Each is honest omission, not a fudge.
- **⇒ SG LANDING — fix the WEAPON MODEL before any SG override re-tune.** SG units carry 12–24% landing
  calibration debt (board SG mean |ratio−1| 0.084→0.131 post-UNIGEO), but `marciana` (SG, **no override,
  zero damage kit**) reads **0.850 COLD at n=2** and `/probe-processing` localized it to the **landing
  term** — ATK pinned +0.23%, cadence = sim, crit/core ruled out (`docs/probe-runs.md` § SG SIDE;
  `docs/probe-data/marciana-sg-band.json`). A pure override pass would fit overrides to absorb a
  weapon-model error. Exact per-band landing is footage-gated on a SOLO `marciana` recording → **U35**.
  - **Aim-circle method fix** (`docs/data/sg-calc/`, thread
    `docs/handoffs/closed/sg-re-open/2026-07-22-sg-geometry-handoff.md`): all four owner rulings resolved
    2026-07-22, scope collapsed to ONE workstream — rebuild `BAND_SG_HIT_FRAC` on the aim circle instead
    of the D=162 spread disc, then re-A/B `SGLANDING=geo` against a FRESH baseline (the plan's numbers
    predate the cone + rotation landings). Ground truth: `noir-sg-bands.json`.
  - **⇒ 2026-07-30 PELLET-READER REBUILD — plan of record
    `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md` (START HERE block at the top;
    prior-art + sources in the companion `…-solution-survey.md`). Findings-only, nothing enacted.
    ⇒ READ FIRST: `docs/handoffs/2026-08-04-pellet-reader-SESSION-JUDGE-handoff.md`** — the current
    judge handoff and the session-close entry point (it continues `2026-08-04-lifetime-cap-…` →
    `2026-08-04-pellet-reader-…` → `2026-08-03-…` → `2026-08-02-…` → `2026-08-01-pellet-cascade-…`;
    the graveyards and traps in ALL of them are BINDING). ⚑ Its §8 is the live open-item list.
    ⚑ Headline: the reader is measurably more faithful (3 landings, 4 items closed, reference
    OWNER-CONFIRMED) but **the cold SG read is UNEXPLAINED** — the 16.9% mislock rate turned out to
    cost ~nothing (§22C), so §19's −1.40/shot residual has no identified cause. And **all three
    landings reach NEW EXTRACTIONS ONLY**, so nothing on the board has moved yet. Work lives on
    branch `fix/pellet-reader`, **PUSHED to `origin` (owner-authorised 2026-08-04); `main` is still
    held and lands via PR, never a local merge** (constraint 8). Read any count live with
    `git rev-list --count origin/fix/pellet-reader..HEAD`, never from a written number.
    `/patch-notes` is owed before anything reaches `main`.
    - ⛔ **THE COLD SG READ IS STILL UNEXPLAINED — this is the thread.** §19 leaves **−1.40
      pellets/shot** after the `band_hi` landing. Every channel investigated so far has been closed
      or sized small, and **none of them explains it**: mislocks ~0 (§22C, §34), marker semantics
      −0.043/shot ≈ 3% and in the _wrong_ direction (§31), `band_hi` recovered +0.50/shot
      out-of-sample (§30B). ⚑ **Closing a candidate is not identifying a cause.**
      - ⛔ **⚑ AND THE −1.40 ITSELF HAS NO COMMITTED INSTRUMENT (sweep §1, 2026-08-06).** All ~40 arms
        enumerated; none produces it. §19E is titled "Reproduction" but names only the A/B's INPUTS —
        there is no script path because the A/B was ad-hoc. **Second occurrence of the constraint-9
        failure the 2026-07-29 gauge instrument caused.** ⇒ **STOP quoting −1.40 as a measurement**
        until it is rebuilt as a committed arm; §27C's "3.4%", §31D's "3%" and §35D's "32%" are all
        fractions of it and inherit the same status. **It is unreproducible, NOT refuted.**
    - ✅ **THE COMPOSITION QUESTION IS ANSWERED — AND AGAINST THE HYPOTHESIS (`docs/probe-runs.md`
      §36 → §37, landed 2026-08-06).** `--representative-audit` now scores the shipped channel. On the
      5 labelled shots the reader reports **35 = 31 owner + 4 non-owner**, against the legacy arm's
      **35 = 12 owner + 23 non-owner** — ⚑ **identical total, 34% vs 88% owner pellets.** The defect
      was in the INSTRUMENT, never in the reader.
      - ⛔ **`rep_owner` 12 / `reader_white` 35 was NEVER a property of the shipped reader** — it
        described the legacy `pellet_ids` channel. Do not quote it.
      - ⚑ **The purest compensating-error case yet seen here:** the right total composed of the wrong
        objects. It is exactly why §22C's count-based severity could not see what a bad lock costs ⇒
        **any future lock/gate severity measurement must score pellet IDENTITY, not count.**
      - ✅ **AND THAT IS NOW MEASURED, NOT INFERRED — §39 (`--mislock-identity`, 33 arms).** On
        mislocked shots the two locks count **largely DIFFERENT pellets**: `J_mis` **0.29–0.60**
        against `J_ok` **0.95–1.00** on n=24–170 controls, with individual shots at **`jaccard` 0.0000**
        (disjoint sets, counts differing by 1). ⛔ The pre-committed band that fired is **row 4, not
        row 1**: `ΔC ≥ 1.0` on ALL six dumps ⇒ **§22C's own premise — that counts barely move — does
        not hold on this population.** That does NOT overturn §22C; it localizes it to its sample and
        its observable.
      - ⚑ **The effect is a LOWER BOUND (§39C).** 19–28 of every 31–41 mislocked shots are UNSCORED
        because a wrong lock leaves **no band plateau** — the worst mislocks drop out, biasing `J_mis`
        UP and `ΔC` DOWN, i.e. _against_ the finding.
      - ⚑ **NEW LEAD, not a verdict (§39C):** "no band plateau" is exactly `debounce_shots`' fallback
        condition ⇒ **the worst mislocks are systematically routed onto the LEGACY channel**, which is
        §12D's 112/852 (13.1%) fallback population. Two populations nobody had connected. Inference
        from the gating logic, **not** a measurement of that population.
      - **⇒ OPEN — SIZING still needs owner labels.** §39 is MECHANISM, not magnitude: a low Jaccard
        proves the locks count different pellets, never which is right nor how many real pellets are
        lost. ⇒ The next measurement wants owner labels on **more mislocked shots** (only 1 of the 5
        labelled shots is mislocked today) — **owner time**, and the first thing on this thread that
        genuinely needs it.
        - ✅ **THE ASK IS BUILT AND WAITING ON THE OWNER (2026-08-06).**
          `docs/handoffs/2026-08-06-OWNER-ASK-mislock-labels.md`, 10 shots × 4 frames, generated by
          `analyze-pellet-tracks.py --mislock-crops` into `scratchpad/pellets/mislock-labels/`
          (gitignored; the script + `mislock-crops-slice.json` fixture are committed, 35 selftest
          arms). Crops are **midpoint-centred with both counting windows inside**, **unannotated**,
          and **padded not clipped**; `ANSWERS.json` is pre-filled and ⛔ **must be COMMITTED once
          answered** (§32D). ⚑ The ask doc's own tabulated `crop r` is superseded — it derives from
          the median displacement and would clip a candidate window on shots 2 and 5.
        - ⛔ **THE TASK IS "MARK WHAT YOU SEE", NOT "DO THE GEOMETRY" (2026-08-06 owner ruling).** The
          owner draws **GREEN** on every real pellet and **MAGENTA** on the reticle where identifiable;
          `extract-groundtruth-positions.py --marks <dir> --marks-write` reads those positions into
          `ANSWERS.json` (+ `MARKS.json` provenance), and window membership, per-lock counts and the
          adjudication are all COMPUTED from them. `INDEX.md` therefore carries **no candidate
          coordinates and no window radius**, and `ANSWERS.json` has **no verdict field** — the first
          version asked a human to count pellets inside a 184 px disc centred on a bare coordinate, in
          an image with nothing drawn on it. `CANDIDATE-KEY.json` is now purely internal. The crops
          themselves were correct and are **byte-identical** across the rewrite.
      - **⇒ OPEN — the DUMPS half of that arm still scores the pre-hybrid channel** (an explicitly
        pre-hybrid `median`/`p75`/`max` policy comparison). Only the LABELLED half speaks for
        production. Not a regression; not a full fix.
      - ✅ **THE BAND-LESS-READER SWEEP IS DONE (2026-08-06) ⇒
        `docs/handoffs/closed/2026-08-06-band-channel-SWEEP.md`.** Verdict: **the channel defect was
        CONTAINED** — every heavily-cited production number traces to a band-aware arm or an owner
        hand-count, and **no override cites the CV reader at all**, so the damage model was never
        exposed. `--merge-audit` / `--backend-marker-audit` are legacy-by-design and **fail loudly**.
        ⛔ **Its findings are a 7-item BATCHED PROPOSAL awaiting the owner — nothing enacted.**
      - ⚑ **Residual, now fully decomposed on the correct channel:** `owner 42 = 0 never-detected + 5
life-gated (`pellet_ids`; they ARE band members at `band_hi` 20) + 8 radius-gated (7 = shot 4's
template mislock, → 0 on relock) + 29 countable`. 42 − 35 = 7 / 5 shots = **−1.40/shot — the
        same MAGNITUDE as §19's production residual, not the same measurement** (5 labelled shots vs
        815 production shots). n=5, one clip, in-sample ⇒ **elimination, not confirmation.**
    - ⚑ **THE RADIUS GATE (`docs/probe-runs.md` §35) — JUDGED 2026-08-06, its surviving estimate
      DE-RANKED. ⇒ READ `docs/handoffs/closed/2026-08-06-radius-gate-JUDGE-verdict.md` BEFORE quoting any
      number from §35.**
      - ✅ **What holds:** ⛔ **Do NOT quote the 815-shot profile's `T = 1.043/shot`: it is
        CONTAMINATED.** Owner-marked pellet positions (crop radius 184 > the 160 px gate) max out at
        **166.8 px with ZERO beyond 180 px** (re-derived independently, exact match), so the profile's
        material past 180 is shot-correlated VFX, not pellets.
      - ⛔ **What does NOT hold — §35D/E's ≈0.45 pellets/shot is NOT "the largest single channel yet
        identified".** Two independent blockers: (a) the 168 label instances are **42 distinct pellets
        × 4 frames**, and the 9 beyond the gate are **2 pellets in shot 1 plus one borderline in shot
        5** (160.4 px on f11, 158.9 px on f10) — n_effective ≈ 2.25/42, clustered in 2 of 5 shots, with
        no interval attached, ranked against §22C's −0.30 ± 0.76; (b) **the 2026-08-01 counting-window
        sweep already measured this and chose the opposite hypothesis.**
      - ⛔ **THE LIVE QUESTION IS H_radius vs H_centre, AND IT IS ALREADY HALF-ANSWERED AGAINST §35.**
        The 08-01 entry (`01fb2c1e`) holds the same 9 marks, the same 166.8 max, and the per-shot
        centroid offsets (20–52 px), and reads them as **H_centre** — "the signature of a compact cloud
        **translated off the assumed centre** rather than of a genuinely larger cloud", 8 of the 9
        being in shot 1 alone. `--representative-audit` agrees from a third angle:
        `radius_gate_rejected` = 8/42, of which **7 are shot 4's mislock and go to 0 under the correct
        lock**. ⇒ **Reconcile §35 with both before treating the radius gate as a cold channel at all.**
      - ⛔ **Do NOT widen `pellet_radius`** — now for the EMPIRICAL reason, not the fudge argument
        (`pellet_radius` is the reader's CV search window, not a game constant): the 08-01 sweep shows
        precision **0.906 → 0.853 → 0.807** at 160/175/190, FP **15 → 26 → 36**, 175→190 buying **+10
        FP and ZERO new TP**, and the confirmed **true-zero shot 0 reporting a pellet at every widened
        radius**.
      - ⚑ **UNCLAIMED, ALREADY-MEASURED WIN — `center_exclude` 36 → 24** (same 08-01 sweep): **+4 TP,
        exactly 0 FP**, precision 0.906 → 0.908, bias −0.375 → −0.208, RMSE 1.571 → 1.177. The INNER
        window, which §35 never considered. Needs its own blast-radius pass + owner gate.
      - ⚑ **COUNT IS THE WRONG OBSERVABLE FOR A MISLOCK.** Shot 4 reads `rep_owner: 0`,
        `rep_non_owner: 4`, `reader_white: 4` — the mislock rejected every real pellet and the count was
        **refilled by non-pellet tracks**. So §22C's "a bad lock does not change the COUNT" and "a bad
        lock rejects 7 of 9 real pellets" are both true. Any future lock-severity measurement must score
        **pellet IDENTITY**, not count.
      - ⚑ **METHOD LESSON (§35C, extended one level).** A quiet-frame control removes STATIC clutter
        but **not SHOT-CORRELATED** non-pellet material (muzzle/impact VFX, debris) that survives the
        lifetime band — any "is X near the crosshair a pellet?" measurement needs a pellet-IDENTITY
        reference, not a temporal one. ⇒ **And: search for the prior ANALYSIS of an artifact, not just
        the artifact.** §35 reused the labels and missed the two existing analyses OF those labels
        (`--representative-audit`, and probe-runs 2026-08-01). `docs/VALIDATION-INDEX.md` surfaced
        neither and is the place to fix that.
    - **⇒ OPEN — the abstentions (§8 item 3).** What the 81 `in_band_no_concurrency` events are, and
      what the 16 that become banded at `band_hi = 20` share. Committed fixtures only, no owner time.
    - **⇒ OPEN — track fragmentation (§8 item 4), now with fresh evidence.** 70% of tracks dead by
      frame 2 at 30 fps, 64.3% at 60. ⚑ **§28B measured 18.9% of life-1 marker tracks as
      fragment-like**, which is the same defect seen from another angle. Plausibly the same root as
      item 3 — treat together.
    - **⇒ OPEN — the C1 marker landing is warranted but GATED.** §27's band says land it; §31 says the
      prize is **−0.043 pellets/shot**. ⛔ **§28B's bracket must be addressed first** — C1 over-drops
      (≈19% fragment-like) and under-drops (`MOVING` + `UNDECIDABLE` kept), opposite signs, not known
      to cancel.
    - **⇒ OPEN — the out-of-frame localizer defect (§33), measured but NOT scored and NOT fixed.**
      0.43% of locked frames put the crosshair outside the frame, always off the right edge. Its
      counting effect is one-sided (can only lose pellets). Whether to clamp, drop, or treat as an
      abstention is a design question with its own blast radius.
    - **⇒ FOR THE NEXT LOCK ADJUDICATION:** offer `A_imprecise`/`B_imprecise` alongside
      `A`/`B`/`neither`/`both`/`?` — **and expect the vocabulary to be incomplete again** (it has been
      too narrow twice running, §22A then §34A). Answers are PRIMARY EVIDENCE: commit `ANSWERS.json`
      when they arrive (§32).
    - **⇒ OPEN, FOR THE OWNER — `DECISIONS.md` has a six-landing gap (2026-08-01 → 08-04).** The
      `band_hi = 20` ceiling, the `band` dump channel, the backend-selector tie-break, the
      representative-frame hybrid and two pre-committed measurement passes all changed landed state
      and are recorded ONLY in `docs/probe-runs.md` §13–§24 — a log of MEASUREMENTS, not of settled
      WHYs. ⚑ **Deliberately not backfilled**: writing them now means inferring another session's
      rationale from its numbers. The owner should either dictate them or rule that probe-runs is
      sufficient provenance for that arc.
    - ⛔ **BASIS TRAPS, binding.** Never difference production per-shot counts against **8.40** (that
      is an owner f8–11 window count on the labelled `marciana` clip). Never quote `avgTotal` as a
      per-shot cost (it pools over the `[5,10]` valid subset, whose membership MOVES). Both have been
      hit once each this session (§27C, §30C, §34D).
    - **Error budget (the target, computed):** U35 needs ±0.5 pellets/10 discrimination; at n≈40
      shots/band a per-shot random SD of **±1.5 pellets is tolerable**, but per-band **bias must be
      ≤ ±0.25 pellets/10**. The counter is ~10–20% cold = 0.8–1.6 → **3–6× over budget on BIAS.**
      ⇒ **Chase bias, not variance.**
    - **⚑ PREMISE CORRECTION, load-bearing and it propagates.** The owner's labelled pellet count is
      **NOT a per-shot landed total** — it counts markers visible in the **f8–11 window**, identical
      on all four frames of every shot. **So "landed pellets per shot = 8.4", and the 8–16%
      missing-shot threshold derived from it, are WINDOW-CONDITIONAL.** Re-check anything leaning on
      them.
    - **Owner pellet-lifecycle spec (60fps, 14 frames — CORRECTED 2026-08-05, §29)** still governs: f1 small w/ shadowed surround
      → f3–4 peak (2×, **pellets occlude — least readable**) → f5–11 shrink to 1× → f12–14 fade.
      **Readable frames are f1 and f8–11.**
    - **OPEN, IN PRIORITY ORDER.** Records: `docs/probe-runs.md` §4–§9. Instruments (all committed on
      `scripts/probe/analyze-pellet-tracks.py`, each with a self-validating fixture and wired into
      `scripts/probe/pellet-selftest.sh`, 30 arms): `--hand-count`, `--ammo-abstention`,
      `--ammo-oracle-ceiling`, `--merge-audit`, `--representative-audit`.
      1. **THE REPRESENTATIVE-FRAME POLICY — ⚑ ITS FIX LANDED; only a narrow clause is still open.**
         The two-phase-event diagnosis (probe-runs §9: the median samples the pre-cohort flash phase
         on 3 of 5 labelled shots) was ACTED ON — the fallback-hybrid `plateau_median` rule landed
         §13, the decoupled `band_hi` landed §16, and together they bought **+0.60/shot in-sample
         (§19) and +0.4994/shot out-of-sample over 815 shots (§30B)**. ⛔ **Do not re-derive this as
         an open problem.** What actually remains: on shot 1 one owner pellet is still **"one the
         representative frame does not see"** (§19C) — a single-frame-selection miss that survived
         the hybrid. n=1; treat as a lead, not a channel.
      2. **⛔ OWNER-GATED — `debounce_shots` MINIMAL FIX (probe-runs §8F).** `cap_cadence` (~3 LOC)
         and `resplit` (~10 LOC) both beat shipped on every arm, pooled MISSED **7.0% → 4.2% / 4.5%**.
         It buys a **missing-shot** improvement, **NOT** a cold-bias fix. Gated because **3 committed
         fixtures regenerate** (`missing-shots-slice.json`, `hand-count-slice.json`,
         `stale-counting-slice.json`) and **`read-pellets.ts:349` is a SECOND implementation that must
         change in lockstep**. ⚑ `cap_cadence`'s reported 35/9/−0.003 **did not reproduce** — the
         literal 0.9× semantics robustly gives 37/11/−0.019 and only a 1.0× cap reaches 35; the
         multiplier was NOT fitted. ⛔ **`candA` (the peak-detector rule) is REFUTED — DO NOT
         RE-PROPOSE**: pooled MISSED 7.0% → **14.5%**, worse on 7 of 8 series, 32 vs a hand count of
         36 on `isabel`; root defect is **no minimum-duration guard** (fires on a one-frame VFX spike,
         then refracts over the real shot).
      3. **THE WORKTREE HOOK GAP — VERIFIED CLOSED (2026-08-06).** `.husky/_` is present in this
         worktree and `core.hooksPath=.husky/_` resolves; lint-staged + `npm run typecheck` run here.
         (See `2026-08-06-pellet-reader-SESSION-JUDGE-handoff.md` trap 6.)
      4. ⚑ **THE f1787 MISS on `guilty` — mechanism UNKNOWN (probe-runs §7.10).** Not explained by
         cluster-merge: peak T = 8, post-reload lock re-acquisition, on a **measured** lock. n=1
         event. Do not manufacture a cause.
      5. ⚑ **PRE-EXISTING PYTHON/TYPESCRIPT ONE-EVENT DIVERGENCE on `h4-marciana` — RESOLVED**
         (`docs/probe-runs.md` §11): segmentation is byte-identical; the 177-vs-176 delta is the
         marker-channel/backend-selector defect, not a lockstep break.
      6. ⚑ **DOES ANY MARKER FADE BEFORE t0+8? — ANSWERED NO** (`docs/probe-runs.md` §18). Nothing
         dies before t0+8; the 8.40 reference stands.
      7. **THE GENERATOR'S RADIAL ENVELOPE / Phase 2 steps 4–6 — SUPERSEDED by
         `2026-07-31-pellet-reader-OWNER-DECISIONS.md` Decision 1 (Option C).** Real footage is the
         certification path; do not invest further in synthetic-generator fixes.
  - **Open from the 2026-08-06 session close, not yet ranked above:**
    1. `_ps_band`'s `band_hi` is omitted at 8 of 9 call sites — thread it through before any re-dump
       of the labelled block at production parameters (`2026-08-06-band-channel-SWEEP.md` §7.4).
    2. The five fixtures now carry a population `_note`, but the **writers do not emit them** — sync
       fixture writers with the `_source`/`_note` schema (`2026-08-06-band-channel-SWEEP.md` §7.6).
    3. §43D triage: the ~17 shots where template does **not** outscore structural need their own
       pre-commit before re-cutting the sample on that score.
    4. The `--representative-audit` DUMPS half still scores the pre-hybrid channel by design; keep the
       stdout marker and treat it as a policy-comparison caveat, not a production reader defect.
    - **Also open, unranked — carried, none of these closed:**
      - **`reconstruct_ammo` magazine-consistency defect (probe-runs §4.3) — needs its own pass.** It
        accepts a level no magazine could hold, so a 3-frame glyph misread of `0` between a confirmed
        9 and a confirmed 8 scores as a 9-shot `9 → 0` decrement plus a phantom `0 → 8` reload. **The
        fix:** within a magazine the value must be the current level or current − 1, and a run of `9`
        after ≥ 25 frames of break opens a new magazine. **Blast radius:** it also produces the
        whole-fight numbers in probe-runs §3b AND is pinned by `missing-shots-slice.json`. The
        `--hand-count` arm's own reporting was ALREADY fixed here — do not re-do it — but
        `reconstruct_ammo` itself is untouched, so phantom levels are still produced and merely
        compensated downstream. ⚑ The arm's cap rule is calibrated on the `9 → 0` case only.
      - **`--hand-count`'s matcher over-credits in-reload onsets** — it credits ANY in-reload onset as
        that magazine's emptying round, so **`detected_weapon_attributable` is an UPPER BOUND** and
        **both** hand-count runs inherit it. Matcher-internal fix; `hand-count-slice.json` regenerates.
      - **The reload phase-locked echo (probe-runs §4.4) — characterized, identity still unnamed.**
        ⛔ **REFUTED as `isabel`'s S2 "Pointed Feather" rockets** (S2 is real, already modelled at
        `interval: 15`, measured ~14.7 s, ~12×/180 s — but the echo is **phase-locked to +16–18 frames
        after each magazine's emptying round**, 6 of 7 inside a 0.07 s spread over four minutes, 6
        events in 190.7 s, median spacing 22.7 s, sd ≈ 16 s — not periodic). Do NOT cite the arm's
        "median gap 14.48 s" as a ~15 s period (that set includes 0.67 s and 39.63 s). It is currently
        counted as a detected shot carrying ~0 pellets, so it inflates detections and deflates the
        per-shot average at once.
      - **Safe temporal interpolation — optional, costed, +4.7 pp measured (1,149 frames), 2–4 h.**
        Fill abstention runs ≤ 5 frames whose bracketing levels differ by ≤ 1. ⚠ It **narrows
        decrement windows**; it does NOT recover shots hidden in long gaps (58–91% of abstained frames
        sit in runs of >10 frames, max 226 = 7.5 s). Sharpens timing, not coverage.
      - **Bright-surround gate — an ACCURACY item, not coverage. ⚑ 0.5–1 day + a threshold study.**
        ~30–40 confidently-wrong reads per fight (damage numbers read as ammo); **7,825 good/bright
        frames DO read correctly**, so a naive cut costs real reads.
      - ⚑ **Undetermined:** whether the confidently-wrong reads propagate into the `--missing-shots`
        arithmetic in probe-runs §3b. (The companion question — are the 682 `no-lock` frames
        recoverable — is ANSWERED: no, all 682 are contiguous from index 0, probe-runs §6.2.)
      - **Is the missing-shot channel SELECTED (bias) or random (harmless)?** Still unanswered; the
        cold bias now has a different named mechanism, so this is no longer the lead.
      - ⚠ **The `+62.5` crosshair-offset fix (`b69b5c6`) never merged** — `main` still carries `−62.5`,
        latent. It did **not** cause the 2026-07-29 REJECT (artifacts 12:19–13:33, commit 15:17).
      - ⚠ **Phase 2A gate-2 blind spot.** Gate-1's near-crosshair fraction is computed over a WHOLE
        video, so a short per-shot excursion (shot 4's ~10-frame mislock onto a floating damage-number
        stack, spanning its OWN f8–11 window) is invisible to it. Worth a per-shot validity check if
        Phase 2A gate-2 work resumes.
      - ⚠ **ROI-restriction shot-count sensitivity (RECORD ONLY, n=1) → open-questions U35.**
        `--ammo-roi-x0 0.55 --ammo-roi-y0 0.50` alone is the difference between 43/29/7.3/0.17 and
        ~72–74/61–62/7.5–7.6/0.23 on the same `marciana` (SG/Iron) `h1` cache. More shots may be more
        false locks, not more real ones. Do NOT change `--ammo-roi` defaults off this single reading.
      - ⚠ **Owner-time ask (generator fidelity gate).** `score-pellets.py --audit-fidelity`'s 0.90
        both-pass floor is a DERIVED reference, not a measured one; labelling xy positions on the 6
        owner-counted real crops (`groundtruth-f8-11/shot0{1..5}/`, 4 frames each, ~20–30 min) would
        let it be swapped for a measurement. Not required to use the gate as-is.
      - ⚠ **Reproducibility gap:** the 2026-07-30 numbers came from `scratchpad/pellets/run16/`, which
        is untracked. Distill a fixture before leaning on them further (constraint 9).
    - **⛔ REFUTED — do not re-propose (records in probe-runs §5, §6, §8, §9):** the per-video
      red-digit **atlas harvest** (12.2% of abstentions, 95% of those white; the atlas was never
      white-only — 141 glyphs = 69 white + 72 red, and red is complete at digits 0–4 because every
      magazine is 9; ceiling +4.8 pp nominal / **+0.21 pp honest**) · **stale-lock localization**
      (+0.18 pp demonstrated / +1.33 pp optimistic, not +14.3 to +17.1 pp — **70.2% of stale frames
      render no digits at all**; gate relaxation is strictly WORSE, 27.8 px → 254.9 px; and there is
      **ONE lock, not two** — `cross_positions − cross_rawloc` is (162, −12)/(162, −13) in 100% of
      frames in all 7 dumps) · **a `locate_badge_structural` second tier** (~270 LOC / 4–6 h for
      ≤ +1.6 pp on frames whose semantic value is "reloading") · **cluster-merge as the cold bias**
      (31 of 815 = 3.8% against the cadence period, ~20 shots pooled = 2.6%; the 5 owner-labelled
      shots are **bit-identical** under shipped/`cap_cadence`/`resplit` and pooled `avgTotal` moves
      −0.003 to −0.007 against a 1.08 deficit, the best variants **colder**) · the **31.3%** figure
      (a category error — `max_pellet_frames` is a per-blob track-lifetime cap that `debounce_shots`
      never reads) · **`candA`** · **p75**.
    - Rejected/dead paths recorded in the survey: VLM counting, SAM 2, Hough circles, further tuning of
      the current detector. Peanut heuristic now **obsolete** (Phase 2 stops counting on peak frames);
      ring detector **re-opened as a 1h re-test at f8–11** (it was judged on peak frames, where a
      neighbour destroys the shadowed surround the owner confirms exists).
  - Then: owner core re-trace mid/midfar/far (upgrades ⚑ fit-selected series C); third clean SMG cell
    (de-saturates the ⚑ SMG lens pair); bloom-phase footage for f_bloom; blanc near-HR39 re-count;
    burst-5 near-ON count backstop. `chisato` SMG midfar HR22 stays excluded (WEAK).
- **⇒ SMG OVERRIDE RE-TUNE WORKLIST** (follow-up to the landed 24→20.0/s cadence flip; revert
  `SMGRATE=24`). ~24 SMG overrides were fit to the old 24/s and now read a few % COLD → worklist in
  `docs/control-regression-followups.md`. Post-flip residuals: `quency-escape-queen` ~1.05 HOT,
  `nayuta` ~0.85 COLD. New question from the landing: **U34** (Max-Ammo ▲-expiry over-cap belt clip).
- **⇒ BASE-WEAPON FAITHFULNESS — sim side landed, two residuals open.** Score any time with
  `npx tsx scripts/clean-weapons-read.ts` (`SMGQUANT=1` for the measured cadence); append a run to
  `docs/probe-data/clean-weapons-readings.json` and it re-averages. Basis + rarity ceilings:
  `docs/data/clean-weapons.md` (⚠ `idoll-ocean` must be 0★/core 0, `claire` 2★/core 0 for any
  re-record). Open: **`folkwang` AR 0.963 COLD at n=2**, spread ±0.8% — a stable AR weapon-model term
  matching the board's AR class mean 0.965 → **U32**, needs a re-record with `folkwang` in SLOT 3 (she
  was unfocused in both team-A runs); and `marciana` SG → the landing thread above. SMG side is DONE.
- **⇒ Dot-gauge spot-check (deferred):** `bready` / `diesel-winter-sweets` are newly-found stacking-dot
  units and ungraded — spot-check them whenever a future dot-gauge change lands.
- **⇒ VERIFY BOSS PROFILES (low-prio).** medium/large `bossPelletProfile` magnitudes are ⚑ UNVERIFIED
  (owner-chosen, not measured). `dorothy-serendipity` PH-water (766M) vs N9-redhood (328M) already
  DISAGREE on best fit (small vs medium), so profiles are plausibly per-boss — needs real per-boss SG
  footage to map boss silhouette → profile before any board use.

#### Kit / override threads

- **⇒ TDD TRANSITION (the kit workflow) → `docs/handoffs/2026-07-23-tdd-transition-plan.md`.** Steps
  1a–1d and the step-2 primitive backfill are on `main` (`scripts/tests/engine/*`). **Steps 1, 2, and
  4 are now all landed** (refreshed 2026-08-03) — step 2's two deferred items (trigger-kind matrix,
  gauge suppression during FB/chain) landed 2026-08-03 in `03021eeb`; step 4 (doc/skill reframe) was
  verified already done (`docs/STATE.md:291`, `docs/CONVENTIONS.md:81`, the `audit-kit`/`kit-parse`
  SKILL.md descriptions). The plan doc's stale step-3 unit list (2 named vs 129 actual files) is
  fixed — it now points to `data/kit-status.json` as the live source instead of hand-listing units,
  and states the provenance split found while refreshing it: **127 of 129 specs are `/kit-autonomy`
  gauntlet output, only 2 (`helm` SR/Water, `liter`) are hand-authored via a dedicated `/kit-tdd`
  session** — not a problem (`STATE.md`/`CONVENTIONS.md` already license both paths), just a fact
  the doc previously obscured. Open:
  1. **Step 3 — per-unit dedicated sessions, OWNER drives the spec line-by-line from kit text; run them
     with `/kit-tdd`.** Fully unblocked, ongoing by design (never "completes"). Rationale: the board
     gates FIT only; faithfulness errors of a few % are absorbed by calibration and only unit tests
     can gate them.
  2. **The doc itself now meets its own closure bar (1–2, 4 landed) but is NOT archived** — it is an
     active citation target, not just a reasoning trail: `.claude/skills/kit-tdd/SKILL.md` (its
     `description` and `:211`) points here by name for `§1d event payloads` + the step-2 checklist,
     and `docs/kit-autonomy-decisions.md:29` cites it as "today's plan-of-record". Archiving into the
     gitignored `docs/handoffs/closed/` would dangle those pointers — same failure mode as the "three
     closed handoffs still git-tracked" item below. Reword the citations (or migrate the cited
     content into CONVENTIONS.md/the skill file) before closing.
  3. Six `cfg.onEvent` payload follow-ups (weapon-swap events, perResource/ramp/swap-gate fields on
     `buffApply`, …) listed under §1d in the plan — build them as step-3 tests need them.
- **⇒ SAME-SQUAD PRIMITIVE MIGRATIONS** (the primitive landed 2026-08-02; `teamHas.sameSquad` resolves
  from `src/data/squads.ts`, fail-closed). Remaining units with "same squad" kit text:
  - `ram` (S1 "Full Burst ends with an ally from the same squad") — no override yet (not simSupported);
    collab-unit squad unknown, confirm before authoring.
  - `emma-tactical-upgrade` / `eunhwa-tactical-upgrade` (S2 "affects all allies from the same squad") —
    TARGET-SET pattern, not a gate; owner precedent encodes same-squad targets as plain `allies`. No
    migration needed unless a future ruling disagrees; listed for completeness.
- **⇒ KIT-PARSE RECONCILIATION BACKLOG → `docs/handoffs/closed/kit-parse-reconciliation-backlog.md`**
  (archived but still carries a live per-unit tail) + **ENGINE MODELING-GAP THREAD MAP →
  `docs/engine-modeling-gaps.md`** (§A done / §B wired-not-enacted / §C unwired). Per-unit tier +
  finding SSOT: `data/kit-status.json`. Individually open threads not yet tracked elsewhere in this
  file (full context at the cited theme):
  - **Theme 3 `rampSec` backlog** — chisato, leona, guilty, mast-romantic-maid, mihara-bonding-chain,
    `laplace` (base, RL/Iron — not laplace-ultimate-hero), soda-twinkling-bunny, red-hood, rouge,
    sakura-bloom-in-summer still bake stack-ramp buffs to max instead of time-averaging;
    measurement/Fable-gated per unit.
  - **Theme 4 `arcana` (base, RL/Electric — not arcana-fortune-mate) `teamHas` mono-Electric
    enactment** — capability landed, no override opts in yet (MODEL_ONLY, no board data; owner grades
    her "mono-Electric comp only").
  - **Theme 5 `prika` `gainPierce` hold** — held on an owner popup measurement (probe-runs 2026-07-14
    inconclusive); the other 8 carriers are enacted.
  - **Theme 17 mode-default owner ruling — `milk-blooming-bunny`'s no-Embarrassment default** — still
    needs an owner ruling on which mode is graded-default (`cinderella-crystal-wave` and the
    `mint`/`prika` duet pair were resolved 2026-08-03, see DECISIONS.md).
  - **Theme 20 `gauge-per-shot.json` `fullChargeBonus` vs `characters.json.chargeMultiplier`
    disagreement** — 6/44 SR/RL gauge rows are synthesized, 4 units have a value with no gauge row at
    all, `raven` has a live one-field disagreement; suggested fix (source from `characters.json`,
    gauge row as an override-only-when-it-disagrees) not yet built.
  - **Theme 21 `durationShots`-eats-its-own-pull engine bug — CLOSED 2026-08-08.** The exemption
    is now unconditional for all round-scoped buffs (`startFrame === frame` skips the decrement),
    and a refresh of a round-scoped buff resets `startFrame` to the refresh frame so re-application
    on every pull gives continuous coverage. `emilia`, `zwei`, and `phantom` were reverted to the
    literal kit round count; `vesti-tactical-upgrade` keeps its `noRetriggerWhileActive` encoding.
    Regression coverage: `scripts/tests/units/emilia.test.ts`, `scripts/tests/units/phantom.test.ts`,
    `scripts/tests/units/zwei.test.ts`, `scripts/tests/engine/duration-shots.test.ts`.
- **⇒ ROLE-AUDIT FOLLOW-UPS → `docs/handoffs/closed/2026-07-17-role-audit-followups.md`:** (1)
  custom-weaponry `role` sweep — mostly deflated; what's left = pierce-from-kit-text + the
  (data-blocked) weapon-swap secondary-weapon row; (2) **`anis-star` dot-gauge re-model**
  then drop her `hitsPerShot` carve-out to 1 (highest-value modeling fix; needs a measurement); (3)
  re-pin PH-water FB to 12 when the burst-cycle fix lands / after re-measure. Passive carries: next sync
  applies 18 behaviour-neutral `burstGaugePerShot` diffs; D.4 RL splash (multi-part scope only); E
  class-mismatch core-row guard (no current violator).

#### Product / web

- **⇒ META-PARITY FOLLOW-UPS (cross-family code-review by claude-opus-5, 2026-08-11):** (1) **OWNER
  one-line ruling wanted: `/ranks` title** — the fix branch kept the DEPLOYED static.ts title
  ("…Neutral, Elemental Advantaged, with and without Supports") as the status quo; the retired
  alternative is "…Best Units & Overload Lines Tier List" (keyword-dense). Either stands; say
  which. (2) The parity guard (`scripts/tests/share/meta-parity.test.ts`) enforces CONSISTENCY
  between the three tables, not COVERAGE of the route set — add an assertion that every fixed
  route in `scripts/build-sitemap.ts` resolves to a key present in all three tables (export
  `tabFromReqUrl` from `src/server/static.ts` and reuse it rather than reimplementing the
  `/ranks`, `/ranks/support`, `/ranks/compare`, `/` special cases in the test).
- **⇒ SEO FOLLOW-UPS — deferred pending a real crawl: [docs/seo-followups.md](../seo-followups.md).**
  Search-visibility decisions that are NOT answerable from the repo. Nothing to do until Search
  Console has ~4-6 weeks of data; the doc carries the measurement, the options and a 4-step
  decision rule so the call is decidable rather than open-ended. Headline: measured
  (`MEASURE=1 node scripts/unit-page-check.mjs`), no unit page is under 300 crawler-visible
  characters and only **17** are under 500 — short-kit starter/NPC units, NOT the 85
  unsimulated ones (median 616). That killed the originally-planned rule: **do not gate the
  sitemap on `simSupported`**, it does not track thinness. Recommendation is do nothing.
- **⇒ UNION-RAID GENERATOR — DEFERRED (owner ruling 2026-07-24) pending board stability.** Code +
  record live on branch **`gen-union-item3`** (tip `15e35dc1`; not on main, rebases cleanly). ⚠ **The
  cited plan doc `docs/handoffs/2026-07-24-union-raid-polish-plan.md` was NEVER COMMITTED** — commit
  `7eb2174a`'s message describes it but the commit touches only `docs/DECISIONS.md`. That DECISIONS
  entry (on the branch, not on main) is the surviving record; the method is restated here so the
  thread does not depend on it. The owner-specified method is settled — build each boss's IDEAL team independently (heavy
  overlap on the meta supports is the INPUT, not a fault), then re-allocate ONLY the overlap by asking
  each claimant what it loses by conceding a contested unit — plus "any"-element rows (re-wire
  `weakness: null` from "none" to "ANY") and a "pick 3 bosses for me" control, backend first.
  **Deferred because judging the allocator needs a stable per-unit board:** the Water ideal differs from
  the standard comp by exactly ONE unit (`rapi-red-hood` over `snow-white-heavy-arms`, +13% with the
  same four teammates) while element advantage is only 1.1× on one unit's damage — a per-unit MARGIN
  question, not a search question. HYPOTHESIS, sim-only, NOT ENACTED. WIP on `gen-union-realloc-wip`
  @ `ddf304a` (typechecks, never run).
  Already landed on `gen-union-item3` @ `cfad4dfa` and HELD: `topTeamsMultiBoss` in `src/teamcalc.ts`,
  build-order sweep + cross-boss polish, `scripts/tests/generators/multi-boss.test.ts`, a `--union`
  arm on `scripts/bench-generator.ts` (+7.64% / 0.00% / +9.58% on three boss triples at 3.4–4.0× wall
  clock; the A/B artifact doc was likewise never committed). It also carries a `web/src/simClient.ts`
  pool-init fix — ⚠ that hazard is **LATENT on main, not live** (main's union loop awaits each
  `genBestTeam` fully, so only one coordinator exists at a time), so the fix travels WITH the union work;
  nothing to cherry-pick. ⚠ Union does NOT need the mint/prika post-pass (already a TEAM CONSTRAINT).
  Open follow-up spec: `docs/handoffs/2026-07-24-gen-item4-union-polish.md` — extract the polish driver
  out of `topTeams` and parameterize per row. Hard constraint: **union must NEVER be sorted** (row _i_ is
  bound to boss _i_; `shareUnionRoster` zips by index). Cheap pre-check first: does union greedy leave a
  team on the table on a constrained pool the way solo did?
- **⇒ `/doll` FAQ is the last route with no crawler-visible body** (current no-JS surface:
  `docs/STATE.md` §9). Blocked on a prerequisite, not on effort: `web/src/doll-faq-data.ts` is the
  Discord bot's copy while `App.tsx` renders its own richer JSX version, so injecting from the data
  module would serve crawlers text the page does not show — which the no-JS ruling forbids.
  **Reconcile the two copies first**, then it is a one-line addition to
  `scripts/build-content-pages.ts`.
- **⇒ First deploy after PR #68: confirm `/mechanics` returns a real body.** The bug it fixes was a
  build step that looked wired and never ran, and the deploy-box path is the one thing no test can
  exercise — `curl -s https://nikkesim.app/mechanics | grep -c 'mech-page'` should be 1, not 0.
- **⇒ Bakery-bot share-URL durability — one residual to tell the bot:** a `characters.json` change (e.g.
  a unit rename) moves pixels without moving the render cache key — `specCacheKey` covers renderer
  changes, not data changes. If that bites, add a data stamp to the key.
- **⇒ Artifact-decoupling Step-3 pre-req: infographics input bucket misses two render inputs** —
  `src/ranks/b1b2-cells.ts` + `src/ranks/buffer-rows.ts` (value-imported by
  `src/infographics/core/rankTables.ts`). Zero impact while `dist/img/manifest.json`'s `inputsHash`
  is provenance-only; load-bearing if Step 3 ever gates on it. Filed by the kimi-k3 round-2 review
  (2026-08-04) → `docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md` §8.
- **⇒ Artifact-decoupling Steps 2–4: deferred options, one owner decision open** — DB storage for the
  board JSON (2), image-store split (3), nightly rebuild cron (4; blocked on open decision #2: the
  nightly sync's roster-drift policy — recommendation stands: refuse to publish + notify). Revisit
  only if the need materializes → `docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md` §8.

### Tier-0 open threads

- **`jill` re-tune at 0.919 COLD ▼** — her kit-faithful reload landed 2026-07-22 (**A33 (U31)**), moving
  her 1.031 HOT → 0.919 COLD, so she is the top per-unit re-tune candidate. Two riders: her burst's
  _"Normal attacks deal True Damage for 10 sec"_ is unmodelled, and the reload-speed **LOCK** she carries
  needs the clamp primitive (`docs/engine-modeling-gaps.md` §1b, same build as the 5e work above).
  **`N1 rapi/quency wind` is now UNPINNED** (sim 12 vs video-measured 13, value kept in-comment in
  `scripts/regression.ts`) — a pre-existing burst-generation shortfall her fix UNMASKED, same family as
  **U29**. Do NOT close it by restoring her phantom fire rate.
- **`helm` carry-SPREAD is unexplained** (0.972 `soda-twinkling-bunny` … 1.093 `scarlet-black-shadow` on
  the control-regression suite, `npx tsx scripts/control-regression.ts`) — an interaction, NOT a flat kit
  offset; neither of her two landed fixes addressed it. **Do not tune her to the mean before the spread
  is explained.** ⚠ `crown` also carries many BOARD readings from `scripts/experiment.ts` — any retune in
  this suite must be A/B'd on `scripts/board-read.ts` too. Board-wide follow-ups from this project →
  `docs/control-regression-followups.md` (the `durationShots` carrier census, the `critRateNormalPct`
  census, the 10-unit fit-exposure re-tune worklist, override-prose drift, open board questions).
- **isabel mid/midfar clock-drift re-derive** — the one SG-landing thread still open (per-unit landing +
  class table STAND; class-wide far 0.66 REJECTED) → **U27**.
- **HR→core slope refinements** — `asuka` saturation bracket (circle10 vs SAT=1); `quency-escape-queen`
  cadence + the +1.04 overshoot (flag-off HOT baseline = Explore-Route kit over-credit, owner kit audit);
  slope validation via an existing measurement (`soda-tb-control`). Live model: `docs/STATE.md` §4.
- **AR-burst-window residual (moran/jill)** — footage-blocked. moran's swap coldness is THROUGHPUT
  (~1.3× more hits in the swap window), NOT per-shot (the '1440'=24/s datamine was measured-refuted; base
  ~12/s stands); needs an isolated moran-solo recording or the swap weapon's `shot_count` datamine.
- **Inertness-claim backfill is OPPORTUNISTIC, never a sweep.** The write-time guard (hook r5) and the
  convention both landed 2026-08-11, but the ~620 pre-existing `inert`/`byte-identical` mentions across
  153 override files are NOT a worklist — most strong-looking ones are "board A/B is the discriminator",
  a plan rather than a result. Fix a file's claims when you next touch it for another reason; `alice`
  (SR/Fire) is the model wording.
