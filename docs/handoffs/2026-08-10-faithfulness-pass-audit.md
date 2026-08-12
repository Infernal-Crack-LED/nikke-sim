# 2026-08-10 — Faithfulness pass: repeat-pattern audit + implementation order

> **Purpose.** Plan-of-record for a roster-wide faithfulness / correct-implementation pass over
> the 67 shipped overrides, the engine, and the mechanics understanding. Sources read end-to-end
> for this audit: `docs/engine-modeling-gaps.md`, `docs/data/nikke-damage-formula.md`,
> `docs/data/damage-calculation.md`, `docs/data/damage-bucket-matrix.md`,
> `docs/unmodeled-entries-review.md` (all 433 entries), plus `docs/handoffs/QUEUE.md` to avoid
> double-tracking. Load-bearing claims below were re-verified against the live tree (file:line
> cited where checked), not quoted from the docs alone.
>
> **Status: FINDINGS-ONLY.** Nothing here is enacted. Every engine change routes through
> `/scientific-method` + an isolated worktree + owner approval (CLAUDE.md constraint 8); the
> override manual-review sweep is batch-and-stop, findings-only per batch. Items already tracked
> in QUEUE.md are cross-referenced, not duplicated — this doc adds the pattern-level grouping and
> the ordering.

---

## 1. Repeat patterns found (the findings)

Ordered by how much they threaten the correctness of a manual override review — the patterns
that silently corrupt a review come first, the board-moving model gaps second, the
correctly-inert majority last.

### F1. The audit's own inputs drift — current-state docs lag the tree

The docs this pass starts from contain live staleness, which means a reviewer trusting them
inherits wrong premises:

- **`engine-modeling-gaps.md` §1b is stale.** It states "The engine has stat buffs but no
  clamp, so all of these are approximated, ignored, or hand-carved" — but
  `reloadSpeedClamp` / `reloadTimeClamp` / `chargeTimeClamp` exist in `src/skills/types.ts:54-58`
  and 8 override files carry them (anis-star, asuka-wille, cinderella-crystal-wave, exia, jill,
  milk-blooming-bunny, nayuta, snow-white-heavy-arms). The genuinely-open remainder is only
  milk-blooming-bunny's **reload-count-scoped** clamp variant (QUEUE 5e item 3). A reviewer
  reading §1b would file 8 false findings.
- **`gen-unmodeled-review.ts` runs without the `note` signal it was written to use**
  (QUEUE-tracked): `data/kit-status.json` never mirrors `note`, so `matchingCaveat`/`classify`
  silently receive `undefined` for all units. The unmodeled-review doc — a primary input to this
  pass — is generated with a missing classification input. 143/433 entries (33%) landed in
  "Other / see caveats", plausibly inflated by exactly this.
- **Known smaller drift, same class:** the stale `FBRULE` comment in `sim.ts`
  (bucket-matrix §6), bare `sim.ts:<line>` citations in override prose that rot silently
  (QUEUE), and the gaps doc's status dashboard last verified 2026-08-03.

The generated-census approach (`scripts/doc-drift.ts`, gated by verify.sh) demonstrably works —
the two generated tables never drifted. The fix class is: extend generation/linting, and refresh
the hand-written sections once at the start of this pass.

### F2. Silent-failure modes in the override→engine pipeline (highest tooling leverage)

The single most repeated _structural_ pattern across the docs is "fails with no diagnostic":

1. **`chargeCounter`-triggered blocks bypass every block gate.** Verified live: dispatch at
   `sim.ts:4041-4074` calls `applyEffect` directly, never `applyBlock`, so `requiresCore` /
   `fbGate` / `bossElementGate` / `resourceGate` / `requiresTargetStatus` are all ignored on
   that trigger with no error. No current carrier combines both — the first future one gets an
   un-gated block silently (gaps doc §1a; confirmed still true).
2. **`targetStatus` name matching is exact and case/whitespace-sensitive; a typo never fires,
   silently.** d-killer-wife depends on two string literals agreeing across two blocks; no
   cross-slug producer/consumer census exists (`validate-overrides.ts` is per-slug).
3. **Enemy-targeted buffs outside the two-stat allowlist are discarded with no effect** —
   `guilty`'s burst `defPct: -20.25` is live-discarded today. The non-fatal validator warning
   landed 2026-08-08 and fires exactly once roster-wide, so this one now has a tripwire.
4. **The validator's structural rules are untestable as written** — `validate()` loads from disk
   and runs a sim; its `target: enemy` rule has no test (gaps doc §1a).
5. **Same-frame block ORDER is load-bearing and unguarded** — phantom's gate-before-inflict
   ordering and d-killer-wife's intra-unit array order both silently flip behavior if reordered;
   nothing lints or tests ordering semantics.

These don't move today's board; they determine whether the phase-4 manual review (and every
future override edit) can be trusted. Hardening them first is what makes the sweep cheap.

### F3. Missing bucket: Burst-Skill-Damage amplifiers (board-moving, 2 carriers)

Kit lines that amplify _teammates' burst-skill damage_, scoped by description text, have no
StatKey and no bucket (verified: no `burstSkill*` stat in types.ts or sim.ts):

- `jackal` burst: Burst Skill damage of "Affects 1 enemy unit(s)" skills ▲38.91% for 15s.
- `trina` burst: Spread Roots ▲435.6% / Wilted Roots ▲64.46% on "Affects all enemies" skills —
  **fires in solo raid** (enemy count = 1 satisfies "all enemies").

Both docs record the same consequence: teammates' burst nukes cast inside the window read COLD
by the missing amp — a documented engine gap, not a tuning residual. This is the clearest
_new-primitive_ candidate in the whole review: well-scoped (one additive stat + a
description-scope gate on burst-category instances), two carriers, known cold comps to verify
against.

### F4. Enemy DEF ▼ has no channel — correct on the graded basis, wrong on the web basis

The most repeated _kit-line_ pattern in the unmodeled review after heals: ~11 overrides carry an
enemy DEF ▼ line (anis, elegg, exia, frima, guilty, ludmilla, marciana-marine-study,
mast, novel, phantom, viper — plus ether/eunhwa/himeno/signal record the same shape; `cocoa`
was a prose-grep false positive struck by her batch-2 review — her only enemy line is ATK ▼), all
dropped at dispatch. Basis-dependent: ~0.02% per carrier at the graded `bossDef = 140` basis
(a full DEF-zeroing is bounded ≤0.12% board-wide by the battery), but the web app runs
the same engine at 30,930 / 12,200 default DEF where the battery sweep shows 6–17% per-unit
swings — several percent per dropped carrier there. Fully characterized in bucket-matrix §5
trap 4 + QUEUE (findings-only). The open item is an **owner scope decision** (no board A/B can
justify it; the value is web-only), then a small engine channel.

### F5. Burst-gauge economy is the least consistent subsystem (interacting errors — land together)

Four separately-tracked findings are all the same subsystem, and their correction directions
partially cancel — the compensating-errors rule says measure and land them coherently, not
piecemeal:

- **U28:** `extraHitDamagePct` riders emit no `skillGauge` while an equivalent `flatDamage`
  rider does — a live probable under-generation on all 4 carriers (modernia, nayuta,
  neon-blue-ocean, neon-vision-eye).
- **`skillGauge` fires twice per shot** on any `shotFired`-triggered `flatDamage` rider
  (`sim.ts` ~2393, QUEUE-logged) — correction direction is gauge-DOWN.
- **The general charge-B3 gauge-fill-tempo gap** — root cause behind the 4 disabled regression
  comps (1–3 FB short each) and the unpinned N1 / misc-B3 counts; already scoped for its own
  `/scientific-method` pass with a committed instrument (`decomposeCycles()` / `DECOMP=1`).
- **Theme 20 data quality:** `gauge-per-shot.json` `fullChargeBonus` — 6/44 SR/RL rows
  synthesized class-modals, 4 units with `chargeMultiplier: 350` but no gauge row (fallback runs
  them at 2.5×), one live disagreement (`raven` 250 vs 0).

Rotation (FB counts) is the sim's measured-exact headline; this cluster is the open threat to
it. Highest board blast radius of anything in this audit.

### F6. No self-status channel — the biggest proxy-generating pattern

The engine's only named-status machinery is boss-side (`targetStatus`). Kits built on **own**
named states are all approximated, each differently: chisato's Extrasensory as fused passives
with derived expiry times; grave's Heat Emission as an always-on passive (uptime knowingly
over-credited — part of her HOT); viper's Vamp via `fbGate`; maiden's Revenge and yulha's Calm
simply unmodeled (bursts fire at half magnitude); vesti-tactical-upgrade's Battle Formation
ruled inert; eunhwa-tactical-upgrade's Camouflage → trueNormals flavor change inexpressible
(also blocked by the single-swap-slot limit). The 5e state-machine trio (mint's XOR toggle,
prika's cross-unit event bus, milk-blooming-bunny's reload-count clamp) was already ruled NOT
solvable by one registry (QUEUE, premise-gate result — three separate builds).

Not one primitive to build — but the per-unit reviews need a **shared classification** of proxy
quality (exact-by-construction / bounded-approximation / knowingly-wrong-uptime) so 20 reviewers
don't re-derive 20 vocabularies. A short census (which units proxy a self-status, how) belongs
in the review checklist.

### F7. Stack-ramp bake-to-max backlog — systematic HOT bias on opening seconds (theme 3)

Capability (`rampSec`) landed 2026-07-17. **The membership below was grep-assembled and has now been
verified unit by unit (2026-08-11, all 12 names). It was mostly wrong: 2 of 12 are cap-bakes.** Do
not forward the old list as a per-unit prior — the corrected classes:

- **CAP-BAKE (the real F7 members, HOT-direction, measurement-gated) — 2:** `sakura-bloom-in-summer`
  (⚑4 burst DoT ships hit-applied at the full 10 stacks from tick 1, 351.6%/s; a per-second self-ramp
  would be ×0.55 — her own note states the discriminating recipe) and `laplace` (RL/Iron, not
  `laplace-ultimate-hero`) (S1 Hero Vision's
  stack GATE is assumed maxed for the whole burst window, so the burst's true-damage conversion is
  open from t=0; the radius buff itself is unmodeled-inert vs the partless boss).
- **PARTIAL, and already carrying `rampSec` — 2:** `cinderella` (RL/Electric, not
  `cinderella-crystal-wave`; Beautiful is baked at the ~36s
  steady state, 2.71 × 1.192 = 3.23%, which IS the cap value from t=0; her charge-speed ramp is
  separately re-expressed as +45) and `arcana-fortune-mate` (2/4/6-hit phase stacks baked to max,
  but the pellet primitive runs `rampSec` 11). Neither is "hand-averaged" as the old list said.
- **TIME-AVERAGE, not cap-bake — 4:** `mihara-bonding-chain` (12 of 20 stacks, the one fitted number
  in her file), `red-hood` (`chargeDamagePct` 90 ⚑ is explicitly the ramp AVERAGE; cap-faithful is
  93.36 — this is M8), `mast-romantic-maid` (cycle average of 2), `soda-twinkling-bunny` (measured
  chip time-average ~31.6 × 1.32). Different approximation with a different sign — correcting these
  as if they were cap-bakes would double-correct them.
- **NOT MEMBERS — 4:** `leona` and `guilty` compute the stack level LIVE from cadence (engine
  ratcheting on a `hitCount` trigger with `maxStacks`; no haircut baked), and `chisato` / `rouge`
  carry no stack-ramp line at all.

Related capability-with-carriers-held: `addStack` (2 carriers — flora, k; owner rule says log a
third before building).

### F8. Weapon-swap economy rides estimates (theme 7 + gauntlet findings)

Swap-shot cadence is kit-silent for most swap units; several ship parser estimates or are
footage-blocked: moran (throughput ~1.3× cold, isolable only by solo recording), chisato /
takina / velvet (HOT), laplace-ultimate-hero (chargeTimeSec by analogy — her dominant unmeasured
lever), velvet's swap full-charge question, snow-white's 1-shot economy, red-hood / maxwell /
zwei / volume. Plus the structural single-swap-slot limitation (F6). Almost all
measurement-gated — the review's job is to confirm each carries its ⚑ honestly, not to re-tune.

### F9. Recovery-EVENT emission is inconsistent roster-wide (the Crown-synergy surface)

Heal HP magnitudes are inert by design (no HP pool) — but the recovery _event_ drives
on-recovery consumers (Crown-class), so emission choices are board-relevant in those comps. The
docs show a deliberate, hard-won convention (liter's cover-HP NO-OP ruling; bay/cocoa/lily
refusing false emits; signal/trina/prika/quiry emitting cadence-only ticks) — and known
unconverted stragglers (naga/mana instant heals, anis-star dropped, per theme 2b). Snow-crane
adds a recovery-**source**-filter gap (her consumer must exclude own heals; inexpressible). The
review checklist needs an explicit "does this unit emit exactly the recovery events its kit
grants — no more, no fewer" item, and the emit/consume pairing is a good candidate for a small
generated census (same pattern as the primitive census).

### F10. The correctly-inert majority — confirm disposition, don't re-litigate

~60% of unmodeled entries (defensive/HP/shield/aggro 160, taunt/decoy, explosion radius, parts
lines, kill-gated, enemy-count gates, cleanse/immunity) are rightly inert at scope lock, with a
mature disposition vocabulary and named precedents. The repeated _risk_ documented across them
is the **nearest-wrong encoding**: radius ▲ → `projectileExplosionPct` (a2 dodged it), ally
Damage-Taken ▼ → boss `damageTakenPct` (sign AND target inverted — cocoa's would swing team
damage ~65%), cover/invuln → `shield` (fires shielded-trigger consumers), cover restore →
`heal` (fires Crown). The review should verify disposition class per line against the precedent
list — a checklist lookup, not an investigation.

### F11. Enumerated single-carrier primitive gaps — hold, don't build

Logged with carriers, none meeting the build bar today: pascal's DEF-ranked ally selector; k's
crit-gated hit counter + FB-end buff removal (moot-ish); grave's empty-magazine effect +
status-end trigger (**U19** — the one with real board pressure, her HOT); trony's windowed
damage accumulator (NO-GO recorded, spec parked); MG wind-up-speed modifier (asuka-wille,
rei-ayanami); incoming/outgoing-healing StatKey family (inert without an HP pool);
`hasTrueNormals` / `whileSwapped` / `fireRatePct` / `elementDamagePct` StatKeys with **zero
carriers** (collapse-or-keep decisions, bucket-matrix §6). Disposition: leave held; the review
logs new carriers against them rather than proposing builds.

---

## 2. Recommended implementation order

Principle (matches the standing ENGINE-WORK ORDER rule in QUEUE): shared-math and
review-trust fixes come before per-unit work, because per-unit reviews done first would be
reviewing against a moving or untrustworthy target. Phases 0–1 are ordinary tooling/doc work
(verify.sh-gated, no scientific-method needed). Phase 2 items are engine changes: isolated
worktree + `/scientific-method` + owner, one at a time.

### Phase 0 — make the audit inputs true (days; unblocks everything)

1. Fix `gen-unmodeled-review.ts` note-plumbing (mirror `note` into kit-status.json or drop the
   dead params — QUEUE item), regenerate the review doc, and re-check the "Other / see caveats"
   bucket for reclassifications. **Do this before phase 4 relies on the doc.**
2. Refresh `engine-modeling-gaps.md` against the tree: §1b clamp staleness (F1), the status
   dashboard's "verified 2026-08-03" sweep, and any theme whose enactment list drifted.
3. Settle the `sim.ts:<line>`-citation convention (name the code block, not the line) and sweep
   override prose once; optionally a lint.

### Phase 1 — silent-failure hardening (tooling; makes phase 4 trustworthy)

1. **`chargeCounter` gate bypass (F2.1):** validator half first — hard-warn when any
   `chargeCounter`-triggered block carries a gate field (landable now, no engine touch); engine
   half (route through `applyBlock`) as a gated worktree change, currently behavior-neutral
   (no carrier) so cheap to verify.
2. **Cross-slug `targetStatus` producer/consumer census** at warn level (F2.2).
3. **Extract validator structural checks into a pure importable function + tests** (F2.4) — this
   is the enabler for 1–2 and for the review sweep's own tooling.
4. ✅ **LANDED 2026-08-11 — but NOT in the shape proposed here** (DECISIONS, Engine/data-architecture):
   both orders are legitimate, so a lint has nothing to flag toward. The guard PINS the shipped order
   in `scripts/tests/fixtures/block-order-pairs.json` instead, and covers `resource`/`resourceGate`
   too — 32 of the 34 pairs are that family, not `targetStatus`. Original wording follows.
   **Block-order guard** (F2.5): minimum viable = a lint that flags a gate-consuming block
   preceded-dependency on a same-slot inflicting block; or a per-unit test convention entry.
5. Recovery-event emit/consume census script (F9) — generated table, same pattern as the
   primitive census.

### Phase 2 — engine fixes, ranked by blast radius (each individually gated)

1. **Gauge-economy batch (F5)** — the dedicated charge-B3 tempo `/scientific-method` pass, with
   the `shotFired` double-emit and U28 measured IN the same investigation (directions interact;
   compensating-errors rule) and the theme-20 `fullChargeBonus` sourcing fix + validator lint
   riding alongside as the data-quality half. Success criterion: the 4 disabled comps' measured
   FB counts, re-enabled.
2. **Burst-Skill-Damage amp stat (F3)** — small, 2 carriers, verifiable against known-COLD
   jackal/trina comps.
3. **Enemy DEF ▼ channel (F4)** — _after_ the owner scope ruling (web-basis value only). If
   ruled in: one debuff channel feeding the subtractive DEF term + migrate the 12 carriers'
   prose lines; if ruled out: record the ruling and the review treats the prose disposition as
   final.
4. **Self-status builds (F6):** the 5e trio in QUEUE's stated order (mint toggle, prika event
   bus, milk reload-count clamp), each its own pass — explicitly NOT one registry.
5. Hold: everything in F11, addStack until a third carrier, HP-pool family.

### Phase 3 — per-unit measurement-gated enactments (interleavable with phase 2)

The footage/owner-gated per-unit backlog, unchanged from QUEUE (rampSec backlog F7, swap-economy
items F8, milk-blooming-bunny mode default, jill/maxwell hot-fit re-measures, prika pierce
hold). These are not blockers for phase 4 — the review flags them; enactment stays gated.

### Phase 4 — the override manual-review sweep (the last major step)

Batch-and-stop, findings-only per batch; per-unit output goes to kit-status findings, nothing
shared is edited mid-sweep. Suggested batch order: (a) carriers of the F-patterns above and
board outliers (hot/cold beyond ±5%) first, (b) then the graded-comp units, (c) then the tail.
`/audit-kit` for sampling units that already carry spec tests; `/kit-tdd` for anything the
review flags for rework.

**Per-unit checklist (derived from the patterns — the point of this whole doc):**

1. Every `unmodeled` line's disposition class matches its precedent (F10 nearest-wrong list at
   hand: radius→projExpl, ally-DT▼→boss damageTakenPct, cover/invuln→shield, cover-restore→heal,
   taunt→targetStatus).
2. Recovery events emitted exactly per kit (F9): no false emits, no missing windows, magnitudes
   honestly recorded as unmodeled.
3. Enemy-debuff lines recorded not encoded (except the allowlist); DEF ▼ disposition consistent
   with the phase-2.3 ruling.
4. Self-status proxies classified (F6): exact / bounded / knowingly-wrong-uptime, with the ⚑.
5. Ramp bakes flagged, never inline-fixed (F7); hand-averaged units not double-corrected.
6. Swap-economy estimates carry their ⚑ and a measurement recipe (F8).
7. "Fixed at" lines use the clamp StatKeys, not additive approximations (F1).
8. Rider gauge emission checked (`flatDamage` vs `extraHitDamagePct` choice is a gauge-economy
   decision, not a cosmetic one — U28).
9. Mode/`modes` default matches the graded/recorded comp (theme 17).
10. Prose hygiene: current-state only (no history narration), no bare line-number citations,
    stale caveats deleted with capture-first.
11. New carriers for held primitives (F11) logged against the gap, not proposed as builds.

---

## 3. What this doc does NOT reopen

- DECISIONS-settled rulings (DoT crit per-unit opt-in, FB boundary rule, element placement,
  additive Damage-Up composition, true-damage crits, the `bossDef = 140` scope-lock basis
  (owner ruling 2026-08-10; the older "0" doc claims were drift), the SG landing
  class-table ruling A31/U17, cadence-tuple closure, ROTMODEL=refill).
- The pellet-reader thread, SG landing / U35, and the SMG re-tune worklist — separately tracked
  in QUEUE with their own plans.
- The four disabled regression comps' root-cause framing — already established by the 2026-08-03
  scientific-method pass; phase 2.1 is its execution, not a re-derivation.
