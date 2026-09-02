# Kit audit — CODE CORRECTNESS pass, top-5 DPS per element (2026-09-01)

Owner-requested audit of the **top 5 DPS units per element on the 8/12 solo cell**
(`solo.eleweak.c100.8of12` — the "8/12 Elemental Advantage" headliner) for **logical
consistency, faithfulness, and code correctness**. 24 unique units across 25 slots
(`rapi-red-hood` is dual Iron+Fire).

**This pass is the CODE half.** The 2026-08-23 sweep
([kit-faithfulness-audit-2026-08-23.md](kit-faithfulness-audit-2026-08-23.md)) covered the same
population on the **kit-prose-vs-override** axis. This one asks the different question: _given the
engine's ACTUAL implementation of each primitive, does the authored block do what the override,
note and test say it does?_ A block can be perfectly faithful on paper and still be a no-op, a
double-count, or an off-by-one. Every agent read the engine implementation of every primitive its
units use; every CODE-BUG below carries the engine line that proves it, and the board-impact
numbers are measured A/Bs through the real engine, not estimates.

## Population (verified current)

| Element  | Top 5                                                                                   |
| -------- | --------------------------------------------------------------------------------------- |
| Water    | snow-white-heavy-arms, phantom, dorothy-serendipity, bready, helm                       |
| Iron     | cinderella-crystal-wave, rapi-red-hood, marciana-marine-study, milk-blooming-bunny, eve |
| Wind     | liberalio, scarlet-black-shadow, ark-ranger-black, asuka-wille, mana                    |
| Electric | neon-vision-eye, cinderella, jill, ada, maiden-ice-rose                                 |
| Fire     | mihara-bonding-chain, diesel-winter-sweets, rapi-red-hood, yukiko, drake                |

A fresh dpschart rebuild on the current tree reproduced these lists identically, so the target is
current, not an artifact of a stale board.

**Cell shape worth knowing for any `ownBurstGate` reasoning:** the Solo framework team is
`[NOOP_B1, NOOP_B2, tested, NOOP_B3]` — **two Burst IIIs**, so the tested carry bursts every OTHER
Full Burst.

## What LANDED (commit `cf0cf52b`) — three board-inert code fixes

All three verified byte-identical on the regression before commit; `verify.sh` green.

1. **`ark-ranger-black` S2 reached only the LEFTMOST Wind AR ally.** Kit: "Affects **all** Wind
   Code allies with assault rifles." `alliesOfElementWeapon` is the **only** ally target that
   slices to `count ?? 1`, and hers was the only such target in the tree with no explicit `count`
   (sugar ×4 and trina all set it; sugar's note states the `count: 99` = "all" convention). Silent
   because `validate-structural` registers the kind but never checks `count`. Inert on every graded
   comp and on the 8/12 cell (she is the only Wind AR unit there); worth **−16.5% of her own
   damage** in any team holding another Wind AR unit ahead of her — 8 such units exist.
2. **`milk-blooming-bunny` S2 DoT was missing `flavor: "distributed"`.** Kit: "Deals 447.7% of
   final ATK as Distributed Damage." The note justified the omission with "(dot has no flavor
   field)" — **false**: the `dot` effect declares `flavor?: 'distributed'|…` and the engine reads
   it; `scarlet-black-shadow` already uses it. Inert on graded comps and the 8/12 cell (no
   `distributedDamagePct` source); live when an ally grants the stat (crust, mast-romantic-maid).
3. **`types.ts` `perPull` doc comment** said the non-perPull branch counts "landed PELLETS"; the
   code increments by `hitsPerShot` — pellets **fired**, independent of the landed fraction.

## PARKED as a PROPOSAL (branch `kitaudit-sameweapon-proposal`, commit `1dba3bf7`) — NOT merged

**`ada` and `snow-white-heavy-arms` are missing `weaponSwap.sameWeapon`, so the engine hands each a
free full magazine on every burst cast.** The bug itself is unambiguous — DECISIONS 2026-08-12 names
the independent check (`damagePct` exactly equal to the unit's own `normalAttackMultiplier`), and
running that partition over all 26 `weaponSwap` effects gives a clean split with **exactly these two
violators**; both kits describe modifying the gun in hand and neither grants a reload. They were
missed when the flag landed.

Measured: **every graded comp's full-burst count still matches its measured value** (the rotation
invariant holds). `snow-white-heavy-arms` −6.28% (N5) / +1.87% (T1), `ada` −1.79%, plus teammate
movement. Direction is faithful > fit — both read COLD, so this worsens the ratio, exactly as the
takina precedent in that same DECISIONS entry warned.

**Why it is parked rather than landed:** it is board-moving on graded comps and breaks 6 tests, so
it is an owner call, not a sweep-time enactment. **The blast radius is favourable, though** — an
earlier draft of this section overstated the obstacle. The two `multihit-crediting` pins that fail
are N5's (`scripts/tests/battery/multihit-crediting.test.ts`, the "THE EXCLUSION" block), which pin
the shipped **deterministic base arm at 13 against a measured 12** — a known one-FB overshoot in
that battery (the regression's seeded MC lands 12). With `sameWeapon` the base arm moves to **12 =
measured**. The CLAUDE.md verified-fact about the `SGGAUGE=trigger` arm concerns **misc B3s**, and
that comp is untouched. The remaining four (`gauge-source-census` ×2 impact-split pins, `anchor` A1,
`yuni` Y5 — the latter two because their fixture comps field `ada`) are ordinary fixture updates.

One near-miss on the partition criterion, surfaced for completeness: `moran` ships `damagePct 14.7`
against `normalAttackMultiplier 14.71`. Her kit reads "Changes the weapon in use" with unlimited
ammo — a real swap, so not-`sameWeapon` is correct and the 0.01 is kit rounding. The DECISIONS
"exactly equal" test survives that case by luck of the rounding, not by design.

## FAITHFULNESS / LOGIC — flagged for review, nothing enacted

Ranked by board weight. **Provenance:** every number in this section was measured by the reviewing
agent through the real engine, but — unlike the landed fixes — was NOT re-run by the orchestrator.
Anyone acting on one should re-run its A/B first.

### Board-moving on the audited cell

- **`mihara-bonding-chain` (#1 Fire) — the 40-normals block DROPS the kit's "on a target in the
  Ensnaring Chains state" precondition, undisclosed.** Her burst CANCELS Ensnaring at cast, so
  ensnaring is 0 for the whole of every FB window she opens: in game that window generates nothing,
  in the sim it generates ~9 stacks. Adding `resourceGate {ensnaring, min:1}`: **920.38M → 791.95M
  (−16.22%)**, FB 11 both arms. She reads 1.076 HOT, so the direction closes her residual but
  overshoots to ~0.90 COLD. MED confidence on whether `min:1` is the right reading (bootstrapping:
  nothing can re-open the gate inside her own FB).
- **`mihara-bonding-chain` — the battle-start Restraint line is DEAD.** Kit S1 "Activates at the
  start of battle. Charges Restraint Chains by 10" is encoded only as `resources.restraint.initial:
10`, but all ten dump blocks trigger on `fullBurstEnd` + `ownBurstGate:'cast'`, so the initial 10
  are never spent (the first own-FB end refills to the same 10). `unmodeled.skill1` is empty, i.e.
  the line is claimed modeled. Floor cost **≥ +4.31%**, and it makes her HOT reading worse.
- **`maiden-ice-rose` — the S1 Max-HP pile ramps to the 10-stack CAP and holds; the note says
  "~1-2 stacks steady-state … Effect is SMALL", wrong by ~5×.** `applyBuff` refreshes the WHOLE
  pile's expiry on every re-application, and her ~8.2s re-application interval < `durationSec 15`,
  so it never lapses. Measured: stacks reach 10 and stay (+63.4% Max HP), feeding both her
  `atkOfMaxHpPct` and her `stackedNuke`. `maxStacks 10` 495.52M vs `maxStacks 2` 445.20M
  (**−10.15%**), FB 11 in all arms. **The game-truth question is open** — does a NIKKE "stacks up
  to 10" buff expire per-stack or refresh the pile? If per-stack, it needs an engine primitive.
  Minimum action: correct the note, which currently understates the shipped model 5× and invites a
  future session to "add more" on top.
- **`asuka-wille` — the Anti A.T. Field residual is mis-mechanised and ~2× understated.** The note
  describes gradual expiry; there is none — the stack lives in ONE buff entry whose expiry is
  overwritten by every re-application, so all 26 stacks survive at FULL strength for 9s past the
  last proc, then vanish at once. Measured: 21.9% of her damage lands in that tail; modeling the
  kit's instant consumption costs **≈ −3.9%** of her total, not a "short tail".
- **`eve` — burst BLOCK ORDER silently costs 3.89%**, unpinned and undocumented. Her 2742.84% nuke
  resolves BEFORE the same cast's Mk2 `casterAtkPct +50`. Swapping the two blocks moves the nuke's
  baseAtk 258,341 → 318,174 and her total 801.0M → 832.2M. Roster-wide the choice is a coin-flip —
  a census of burstCast blocks pairing an enemy `flatDamage` with a self ATK-family buff splits
  **14 buff-first vs 10 nuke-first**. Which order the game uses is an unanswered game-behaviour
  question and it is cross-cutting; minimum action is to pin the shipped order and state it.
- **`diesel-winter-sweets` — Intro/Highlight `ownBurstGate` ALTERNATES on this cell; the kit reads
  as a once-per-battle LATCH** ("entering Full Burst for the FIRST TIME … cannot be removed,
  persists after revival"). Measured on the cell: she casts on 5 of 9 FBs and takes Highlight on
  the other 4. Shipped 5,731,435 dps; pure-Intro-latch 5,574,344 (shipped 2.74% HOT); both-latched
  7,156,550 (shipped 22% COLD) — **the two candidate latch readings BRACKET the shipped value; it
  matches neither.** The note's "MUTUALLY EXCLUSIVE" is an unsourced premise, not a kit line, and
  the note declares this exact shape "not graded".
- **`cinderella-crystal-wave` (#1 Iron) — the Preparation-for-Change reload clamp is applied at the
  WRONG END of the kit's window.** Kit: the state OPENS at reload-to-max and CLOSES at last-bullet,
  so in MG (300 rounds) it provably never covers a reload; the override uses `lastBullet` as the
  APPLY trigger, so the 6s clamp blankets every reload and cancels teammate reload-speed buffs. The
  note asserts it is inert. **INERT on the audited 8/12 solo cell** (no reload-speed source there),
  but graded **T8 iron-weak: ccw 0.9200 → 0.9872 (+7.31%)**, FB unchanged. Proposed fix is
  `"mode": "Snipe"` on the block (Snipe totals byte-identical). Makes her hotter; needs a full board
  re-read, not just T8.
- **`mana` — the σ-gated `burstGenPct` costs a Full Burst** versus the always-on reading its own
  caveat calls "damage-equivalent". Measured on the cell: shipped 1,766,044 dps / **9 FBs**;
  always-on 1,768,793 / **10 FBs**. After FB1, σ is re-granted only at her own `burstCast`, which
  sits entirely inside the gauge lock. The note's cited verification ("6 casts with or without σ")
  is insensitive by construction — her casts are CD-gated, not gauge-gated.

### Code-correct but silently wrong off the board (web app)

- **A whole class: values that silently escape skill-level scaling.** Surfaced as ONE batched
  proposal per the batch-and-stop rule rather than fixed piecemeal:
  - `cinderella` Beautiful `casterMaxHpPct 19.2` sits in the `skill1` array but the value lives in
    the **skill2** table → never scales (lookup is slot-scoped).
  - `neon-vision-eye`'s Super block bundles an S2 rider (35.05) and a burst rider (45.03) in the
    `skill1` array → both pinned at max level.
  - `ark-ranger-black` has the same shape (156.19 is skill1, 45.87 is skill2, both authored in
    `burst`) — confirmed by the committed `scripts/audit-skill-scaling.ts`.
  - `dorothy-serendipity`'s entire `consolidation` config bypasses scaling **with no warning**
    (`resolveSkills` scales `blocks` only); `attackDamagePct: 72` is a level-varying skill1 value.
  - `instantReload.fraction` is structurally unannotatable — no `SCALABLE_FIELDS` entry and no
    `levelScale` field. 13 overrides carry it; SBS's real refill at S2 L1 is 30%, the sim always 100%.

  All are ZERO at 10/10/10 (every ranked cell), live only in the web app's skill sliders. Fixes are
  byte-identical at max level.

- **`dorothy-serendipity` — `consolidation.pelletFraction` (a DAMAGE quantity) is fed into
  `hitFraction`, the BURST-GAUGE credit fraction.** A shot whose pellet count is fixed at 1 credits
  full per-trigger gauge as if all 10 pellets landed — the opposite of the engine's own per-landed
  rule (owner ruling U40). Measured: 78 of 280 of her shots carry `hitFraction === 1`; her
  gauge-weighted shot total is **+41.9%** over a 1-landed-pellet reading. FB count unchanged on the
  control comp, zero damage impact. The demonstrable defect is the **field conflation**; what the
  credit should be is a modeling question nobody has measured.
- **`cinderella` — `burstSnapshotsPreFb` is a roster-wide NO-OP, and the override's own RESOLVE
  recipe names it as the lever.** Flipping it would NOT make her nuke lose the same-cast stage-3 ATK
  conversion: her `atkOfMaxHpPct` block is `stageEnter{3}`, which fires 30f before either dispatch
  path. Datable cause — commit `33c6c060` (2026-08-13) moved `stageEnter` earlier and silently
  neutered a caveat written 2026-07-25. She is the flag's only carrier. The underlying question is
  still large (nuke baseAtk 225,605 vs 133,103, ×1.695), but **the documented remedy does not work**
  and the G1 pin test passes identically at either flag value.
- **`rapi-red-hood` — `requiresPulls: 120` on the 2808% nuke is an ALWAYS-OPEN gate.** `u.pulls` is
  a monotonic lifetime counter; MG cadence reaches 120 in ~3s and her first stage-3 cast is at
  t=5.37s with 208 pulls banked. The note calls the nuke "CHARGE-GATED"; the measured "no rocket ⇒
  no nuke" mechanic is in fact unmodeled. Zero board impact today — it is a false claim of coverage.
- **`liberalio` — `alliesLowestAtk{excludeSelf:true}` double-guards with `statImmunities`**, and the
  selection-side guard contradicts her own caveat ("target SELECTION is unchanged"). `excludeSelf`
  was the pre-2026-08-14 workaround and was not retired when `statImmunities` landed. Inert on every
  graded basis checked.

### Test-quality findings

- **`maiden-ice-rose` M1 asserts only `max(stacks) >= 2`** — passes identically at 2 stacks and at
  10, which is why the note/code gap survived the gauntlet.
- **`ark-ranger-black` A6** cannot discriminate leftmost-1 from all-Wind-AR (the fixture has exactly
  one Wind AR unit), and A5/A7 pin a skill-2 kit line's bucket as `burst` — pinning the mis-slotting
  as correct. Both audited defects were invisible to it.
- **`cinderella` G1** asserts flag-driven behaviour that is identical at either flag value.
- **`scarlet-black-shadow` B7** claims an intra-block effect ORDER in prose; the assertion cannot
  discriminate a reversed order. `block-order-pairs.json` covers cross-BLOCK pairs only — **nothing
  anywhere guards effect order INSIDE a block**, which is also what leaves `eve`'s +3.89% and
  `jill`'s −0.26% unguarded.
- **Coverage gap in the framework this audit targets:** every per-unit spec runs at `ol: 'base5'`
  (scope-lock) while the audited cell is **8/12 overload**. Core exposure matches (`coreHitRate 1`
  = c100); only the investment axis differs. OL-line interactions are covered by the regression
  snapshot alone, never by a unit's own spec.

### Prose drift (2026-07-22 current-state ruling) — each manufactures phantom findings

- **`drake` — "No real-fight recording yet — every ⚑ below is an unmeasured estimate" is FALSE**,
  and it actively blocks reuse of in-tree data. `docs/probes/ar-sg-smg/drake sg.MP4` + Battle
  Records exist since 2026-07-15; `docs/probe-data/sg-pellet-landing.json` (`"unit": "drake"`) is
  the measurement that SET the engine's `SG_LANDING_BY_BAND`; plus `coreband-drake-sg.json`,
  `coreband2-drake-sg.json`, `drake-sg-solo-gauge-trace.json`, `probe-runs.md`. Her ⚑1 cadence
  tuple — marked MANDATORY — is already answered there. **Highest-value prose fix found.**
- `neon-vision-eye` — the whole "GAUGE-ECONOMY RULING" paragraph is falsified by `5456a5d0`
  (`extraHitDamagePct` does emit `skillGauge`); it points readers at a QUEUE.md item that is done.
- `bready` — the stated ENGINE PREMISE for `charFixes.chargeFrames 72` ("engine clamps
  chargeSpeedPct to >= 0") was removed by `4e228978` (2026-08-03); negative charge speed is now
  pinned by a test. Divergent whenever any CS modifier is live.
- `helm` — gauge provenance cites `rl3` arithmetic as a confirming leg; `burst-gauge.md` §7 (⚠
  2026-08-17) rules `rl3` cannot be decomposed that way and names helm's worked example. Also the
  cited `rl3` value changed upstream. `1431` now rests on the synergy `fixed_add` alone.
- `milk-blooming-bunny` — a large "ORIGINAL NOTE:" block narrates a REMOVED model in the present
  tense, and `caveats[0]` ("PG 0.653 COLD → 1.301 HOT") contradicts the note's closing and
  `kit-status.json` (COLD 0.56–0.73). Not in the 2026-08-23 §6 list.
- `scarlet-black-shadow` — the note's OPENING sentence states the in-burst thresholds are "1/2/3";
  shipped is scalar `countInFb: 1`, and the caveats correctly say [1,2,3] tested ~22% cold. Also
  `data/kit-status.json` still carries a finding the override already fixed.
- `liberalio` — "the burst slot is omitted" describes an impossible state (`index.ts` throws on a
  missing slot); the file ships two burst blocks.
- `ada` — the spec-test header says the swap "has no maxShots cap … over-fires ~2 special shots"
  while the file ships `maxShots 1` and the last `it` asserts exactly 1.
- `phantom` — the stale `durationShots: 2` narration moved from the override prose (fixed) into the
  **test header**, where it now also teaches a false engine rule. The shipped `:1` is correct.
- `snow-white-heavy-arms`, `asuka-wille`, `diesel-winter-sweets` — spec-test headers contradicting
  the shipped overrides (`chargeTimeClamp` labelled UNMODELED, `shotFired` vs `fullCharge`,
  `reloadSpeedPct` vs `reloadSpeedClamp`, Highlight labelled UNMODELED while the body pins it).

## Verified CLEAN (recorded so nobody re-derives)

`yukiko` (no findings at all), `jill`, `liberalio` and `phantom` on behaviour. Also confirmed
correct against the engine: `drake`'s `perPull` encoding (the `perPull:false` counterfactual is
**+165%** — concrete sizing for the 2026-08-23 "10× hotter" disclosure); `mihara-bonding-chain`'s
always-open `restraint` gate is intended and provably inert (A/B byte-identical) and her 2026-08-23
§1.1 static-cap finding is FIXED; `asuka-wille`'s new `selfStatus` channel (`fe64fbad`) is clean in
both isolation directions; `rapi-red-hood`'s stored-rocket accounting; `eve`'s `instantReload`
arithmetic and level anchors; `helm`'s 10-round budget and gauge non-double-encoding; `bready`'s
mode gate and tick counts; `neon-vision-eye`'s `everyN` cadence and gauge arithmetic;
`marciana-marine-study`'s live `perResource` read; `snow-white-heavy-arms`' bucket routing and
`durationShots` budgets. No override key in the population is unreferenced by `src/`, and all 24
pass the structural validator.

## Method

Cell = `solo.eleweak.c100.8of12`, deduped across profile variants. Eight parallel read-only agents,
3 units each, every one seeded with `.claude/subagent-non-negotiables.md` and required to read the
engine implementation of each primitive before asserting a finding. Two agents independently
converged on the `sameWeapon` defect class, one of them by re-running the DECISIONS 2026-08-12
partition across all 26 `weaponSwap` effects — that cross-agent, independent-method agreement is
why it is the highest-confidence item here. The landed commit then went through `/code-review` (the standing 2026-08-11 owner ruling for an
enactment that skips `/scientific-method` because the question is already answered): cross-family
reviewer `kimi-code/k3`, verdict **CLEAN**. It independently re-ran the 26-effect `weaponSwap`
partition, ran the full suite, and reproduced the parked proposal's exact 6-failure blast radius by
extracting both commits into scratch copies. Its two NOTEs were fixed (`2d4b8265` — a twin stale
`perPull` comment left inline in the engine, and a `crust` example needing its opt-in-stance
qualifier); its two FOLLOW-UPs are QUEUE.md item 10. The orchestrator re-verified every landed fix from
primary sources before enacting, and two of its own cross-cutting hypotheses (a Core-100 ×
`hitRatePct` interaction, and an `acr` clamp boundary) were **refuted** with engine evidence rather
than reported.
