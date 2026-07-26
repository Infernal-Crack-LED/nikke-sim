# TDD transition plan — kit faithfulness gets an automated gate (2026-07-23)

> AI-facing handoff/plan. Owner-approved direction (2026-07-23 session): switch kit work from the
> loosely-BDD batch flow (kit-parse generate → audit → board-fit) to a **TDD flow**: per-unit
> dedicated sessions where the OWNER manually reviews and drives the test spec for that unit's kit,
> tests are written first, then the override/engine change lands. Batch tools (audit-kit, blind
> rebuild) are **demoted to a post-validation sampling layer** — they generate and check at the
> same altitude (prose → JSON), so a plausible-but-wrong reading survives both.

## Why (the motivating case — helm, caught only by manual review)

- S1 was shipped as a **generic** crit buff; the kit reads "Critical Rate **of normal attacks**"
  → `critRateNormalPct` primitive (DECISIONS 2026-07-23).
- Burst "for 10 round(s)" was **faked with `durationSec 13`** instead of a round count
  → `durationShots` primitive (DECISIONS 2026-07-23).
- Both are scoping/semantics errors worth a few % of damage — exactly the magnitude the ±3% board
  absorbs via calibration (fit-exposure pattern: privaty `noFb`, jill phantom fire rate). The board
  gates **fit**; nothing automated gates **faithfulness**. Unit tests are the only instrument that
  can: they are stat-independent and footage-independent.
- TDD's real value here is the **forcing function**: `expect(buff active on rounds 1..10 spanning
  the reload, gone on round 11)` is unwritable from a vague reading. The owner-driven spec review
  per unit is the defense against encoding a misreading into the test itself.

## Current state (verified 2026-07-23)

- **vitest is NOT installed** (not in package.json/lockfile; root `npm test` = web:build + jsdom
  smoke). Owner uses vitest in another repo and wants it here — install it.
- 9 bespoke test files in `scripts/tests/*.test.ts` (hand-rolled ok/fail counters, `process.exit(1)`,
  run via `npx tsx`). **Only 3 are wired into verify.sh** (reload-buff-removal, duration-shots,
  target-status-gate); the other 6 (always-combos-burst, burst-cooldown-coverage, generator-lock,
  like-tag-synergy, topTeams-role-bound, weakness-element) are orphaned/manual-only. A vitest glob
  closes that gap structurally.
- `duration-shots.test.ts` is the reference pattern to preserve: real-engine fixture comp
  (a lone B3 never bursts — burst-eligibility rule), **in-memory override patch** (loadOverride +
  deep-clone + mutate; committed JSON untouched → no protected-path prompt just to test), seedless
  deterministic EV runs (byte-stable totals), and a **discriminating assertion** — the one that
  distinguishes the primitive from its nearest approximation (10 rounds > durationSec 13 because it
  survives the reload).
- Primitive worklist SSOT exists: the **generated primitive census** in
  `docs/engine-modeling-gaps.md` (BEGIN/END GENERATED block, `scripts/doc-drift.ts --update`),
  per-primitive user counts + carriers.

---

## Step 1 — test harness (vitest) + engine event-log hook

**1a. Install + config.**
- `npm i -D vitest` (root package.json — single package, `/web` has no separate manifest).
- Root `vitest.config.ts`: `include: ['scripts/tests/**/*.test.ts']`, node environment, no globals
  needed (import `describe/it/expect`). Vitest runs TS natively; the repo's `.js`-suffixed ESM
  imports and `import.meta.url` data loads are supported.
- **Tests stay under `scripts/tests/` — NEVER under `src/engine/`** (protected path; test authoring
  must never trip the content guard). Layout: `scripts/tests/engine/` (primitive tests, step 2),
  `scripts/tests/units/<slug>.test.ts` (per-unit specs, step 3), existing generator/web-logic tests
  stay at the top level or move to `scripts/tests/generators/`. `scripts/tests/lib/` for harness
  helpers.
- Scripts: `"test:unit": "vitest run"`, `"test:unit:watch": "vitest"`. verify.sh: replace the 3
  individual `npx tsx scripts/tests/...` lines with ONE `npx vitest run` step (all 9+ files run —
  the 6 orphans get wired in for free; fix any that have quietly gone red before flipping the gate).

**1b. Migrate the 9 existing tests.** Mechanical: ok/fail counters → `it()` + `expect()`, keep the
header comments (they carry the evidence notes), keep fixtures/assertions byte-identical in
semantics. No assertion weakening during migration — a migration commit changes runner syntax only.

**1c. Shared fixture lib** (`scripts/tests/lib/harness.ts`): extract the duration-shots boilerplate —
data/mult/cubes/ol/skill-levels loading, `prepareTeam` + `scopeLockCfg` comp builder, the in-memory
override-patch helper (`withPatchedOverride(slug, mutate)`), and a standard control-comp fixture.
Target: a per-unit test is ~20 lines of spec, not ~80 of setup.

**1d. Engine structured event-log hook — LANDED 2026-07-23** (isolated worktree `onevent`, merged
to main; `/scientific-method` step-7 review run before merge-back, its 3 findings fixed).

`cfg.onEvent?: (ev: SimEvent) => void` — contract documented on `SimEvent` in `src/types.ts`. PURE
OBSERVATION, zero-cost when unset (`const onEvent = cfg.onEvent` hoisted once; every emit guarded).
Kinds: `shot` / `damage` / `buffApply` / `buffRemove` / `reload` / `burstCast` / `fullBurstStart` /
`fullBurstEnd`. `damage` is emitted from `dealDamage` — the single choke point every source funnels
through — carrying bucket, **source slot**, resolved crit/core RATES and the full multiplier
decomposition. Test: `scripts/tests/engine/event-log.test.ts` (10 assertions; the load-bearing ones
are INERT seedless + under a seed, and the exact per-bucket damage fold).

Three refinements of the sketch above, all deliberate:
- **No `buffExpire` for time/round expiry.** Buff lapse is LAZY here — `sum()`/`stat()` skip lapsed
  entries at read time and nothing sweeps the list — so there is no moment to emit, and adding a
  sweep would put per-frame work in the engine to serve instrumentation. `buffApply` carries
  `expiresFrame`/`durationShots`; `buffRemove` fires only for a real removal (today `removeOnReload`).
- **No separate `hit` event** — `damage` is one event per damage INSTANCE. NB that is not one per
  game-side hit: an MG pull covers `hitsPerShot` rounds and an SG pull the whole spray.
- **`srcSlot`** was added after the step-7 review flagged it missing from the accepted shape; it is
  threaded through the deferred carriers (Dot / pendingHits / storedHits) so a DoT tick or a
  stored-hit release still names the line that created it.

**Verification (not just "snapshots green"):** whole-board `scripts/experiment.ts` byte-for-byte
identical to main, both regression snapshots unchanged with no `--update`, `verify.sh full` green,
plus the reviewer's independent 128-run SET-vs-UNSET A/B over 16 roster teams (2.2M events, 0
mismatches on totals/buckets/pulls/burstCasts/fullBursts/rotationLog).

**Payload follow-ups (NOT built — additive, pick up in step 2 as tests need them):**
1. `buffApply` cannot express three ways a buff goes inert: `perResource` (the reported `value` is
   the STATIC one `sum()` ignores — a Golden-Chip test would assert a number the engine never uses),
   `rampFrames`, and `whileSwappedIdx`. All three are in scope at the emit site.
2. No weapon-swap start/end event (13 override carriers), so neither a swap gate nor its release is
   observable; likewise no `targetStatus` / resource / stack events.
3. `casterIdx` is always null for boss-held debuffs (the enemy `applyBuff` call omits it) even though
   the key encodes the owner. Passing `ownerIdx` there is behaviour-neutral.
4. `shot` carries no hit/pellet count, so a `hitCount`-triggered line (threshold in HITS) can't be
   counted from the log without reading `characters.json`.
5. `buffRemove`'s emit is only reachable from `reload-buff-removal.test.ts` (no shipped override sets
   `removeOnReload`) — assert it there.
6. Cube/OL permanent stats bypass `applyBuff` entirely, so a unit's live buff set is not
   reconstructible from events alone.

## Step 2 — engine primitive test backfill (before per-unit work)

- **Worklist = the generated primitive census** (`docs/engine-modeling-gaps.md`). Priority = user
  count (blast radius): `flatDamage` 46, `hitsPerShot` 34, `hitCount` 31, `burstCdr` 14,
  `hitRatePct` 11 … before single-carrier exotics. Single-carrier primitives can defer to their
  unit's own step-3 session (they'll get a spec test there anyway).
- Also cover the **cross-cutting semantics** no census row names: durationSec vs durationShots
  expiry, same-caster-slot buff overwrite, stat scoping into buckets (crit/core/normal-attack
  scoping), FB-gate on/off windows, trigger kinds (lastBullet, shotFired, fullBurstEnter,
  burstCast, interval/passive), gauge suppression during FB/chain.
- Per-test pattern: minimal real-engine comp + a SYNTHETIC in-memory override exercising the
  primitive + a discriminating assertion vs the nearest-approximation model (the duration-shots
  formula). Deterministic runs only.
- **Discipline: findings-only.** If a backfill test exposes a live engine bug, the sweep does NOT
  fix it mid-batch (batch-and-stop, hook point 8) — record it (xfail/skip with a note + an entry in
  the backfill worklist doc) and surface ONE batched report to the owner. Evidence-proportionality
  applies: a red test localizes a defect; the fix is its own gated change.
- Track coverage in a small checklist section appended to this doc as tests land (census row →
  test file), so the backfill is resumable across sessions.

### Step-2 coverage checklist (census row / cross-cutting semantic → test file)

Landed 2026-07-23 (all green, `npx vitest run`; no engine bug surfaced — findings-only discipline
had nothing to record). Blast-radius order, top of the census first:

- [x] `flatDamage` (46) → `scripts/tests/engine/flat-damage.test.ts` — linear atkPct; bucket follows
      SLOT not trigger; crit default-ON + `crit:false`; core default-OFF + `core:true`; no +30% range
      on riders; `delaySec` flight + FB-major decided at LANDING; `requiresPulls` owner-pull gate;
      `rampSec` from battle start; U10 burst-cast never takes +50%.
- [x] `hitCount` trigger (31) → `scripts/tests/engine/hit-count-trigger.test.ts` — counts ROUNDS not
      pulls; multiplicity per pull on a 10-round SG; remainder carries over (no per-pull reset);
      `countInFb` lowers the threshold and the accrued meter carries across the FB boundary.
- [x] `hitsPerShot` (34, char-data) → `scripts/tests/engine/hits-per-shot.test.ts` — one damage
      instance per pull (not per round); only an MG spends hitsPerShot AMMO (SG/SMG spend 1);
      `durationShots` spends rounds on the AMMO rule. Discriminated on the modernia/qeq
      same-hitsPerShot MG-vs-SMG pair.
- [x] `burstCdr` (14) → `scripts/tests/engine/burst-cdr.test.ts` — dose-response; reaches the
      RESOLVED target set (`allies` buys a team FB that `self` does not); `oncePerBattle` bounded both
      sides; clamps at 0 (rotation becomes the binding constraint). Readout = FB/burstCast counts.
- [x] cross-cutting — buff application → `scripts/tests/engine/buff-application.test.ts` — KR
      same-caster/slot/stat/value overwrite (crown-S1 shape) + the three ways it stacks again;
      `maxStacks` ladder; lazy `durationSec` expiry at `[cast, cast+dur)`.
- [x] cross-cutting — block gates → `scripts/tests/engine/block-gates.test.ts` — `fbGate` exact
      partition; `everyN`/`everyNOffset` phase; **gates run BEFORE the everyN counter** (unexercised
      by any shipped override → invisible to the snapshot); `requiresCore` inert in coreless fights;
      `bossElementGate` match-only.

**Not yet backfilled (next sessions, priority order):** `hitRatePct` (11, ⚑ HRCORE core-lift — note
it's geometry, needs a fixture that reaches the HR→core path), `instantReload`/`consumeAmmo` (7/1,
the ammo-economy pair), the trigger-kind matrix not yet isolated (`lastBullet`, `shotFired`,
`interval` first-fire phase, `stageEnter`, `fullBurstEnter`/`End`), gauge suppression during FB/chain,
`weaponSwap` state + `swapGate` (11/2), `escalating` (5), `mode`/`modes` (7). Single-carrier exotics
defer to their unit's step-3 session.

## Step 3 — per-unit TDD sessions (the new kit workflow)

**⇒ RUN VIA THE `/kit-tdd` SKILL** (`.claude/skills/kit-tdd/SKILL.md`, created 2026-07-23) — it is the
operational form of this section: preflight/slug gate, the owner-driven line-by-line spec table with its
disposition vocabulary (FAITHFUL / FIX / MISSING / GAP / UNMODELED / MEASUREMENT-GATED), the test-writing
patterns (shipped-override assertions vs `withPatchedOverride` counterfactuals, event-log over totals,
discriminating + inertness assertions), the protected-path routing for the fix, the board A/B, and the
landing checklist. The steps below stay as the rationale of record.

Shape only — no unit ordering here; each dedicated session picks its unit from the live worklists.

Per unit, in a **dedicated session with the owner driving the spec**:
1. Read the unit's FULL kit line-by-line together (blablalink prose = SSOT; full-kit-audit rule).
   The owner manually reviews and drives the test spec — this is the guard against the helm class
   of misreads (a test written from a wrong reading passes wrongly).
2. Write `scripts/tests/units/<slug>.test.ts` — one assertion per kit line: trigger, target, scope,
   magnitude, duration semantics; plus explicit `unmodeled` acknowledgments (a skipped line is a
   *decision*, recorded, not an omission).
3. Red → implement: override edit (gated path, per-session approval; engine primitive gaps go
   through the isolated-worktree flow) → green.
4. Post-validation: board A/B (`board-read` / control-regression) as the OUTER accuracy loop —
   unit tests pin *faithful*, the board pins *accurate*; neither substitutes for the other.
5. Override `note`/`caveats` updated to current-state prose; DECISIONS entry if a ruling was made.

### Step-3 landed unit specs (slug → test file)

- [x] `helm` (SR/Water) → `scripts/tests/units/helm.test.ts` — 16 assertions over her 9 kit lines,
      1 skipped GAP. **One FIX enacted:** the burst's "recovers … for 10 sec" was a single instant
      recovery event → a 10-second window (`heal ticks 10 / intervalSec 1`) → DECISIONS 2026-07-23.
      **Board-neutral** (byte-identical `board-read` A/B; control snapshots stable) because her S1
      full-charge heal already saturates crown-style consumers — so the window is invisible to BOTH
      the board and the regression snapshot, and H8 (which isolates S1's heal out of the fixture) is
      the only thing in the repo that gates it. GAP: S1's gauge-fill line is pinned only as the
      datamined `flatPerTrigger 1431`; focus-unscaling + FB/chain suppression need the step-2 gauge
      backfill (the gauge pipeline emits no events).
- [x] `liter` (SMG/Supporter) → `scripts/tests/units/liter.test.ts` — 11 assertions over her 4 kit
      lines. **No fix — all four lines FAITHFUL**, so these are pins. L1 (the team burst-CDR ladder)
      is pinned END-TO-END per owner ruling: exact arithmetic on the fight's ONE cooldown-bound
      interval (`baseCD − tier1`) plus dose-response against four counterfactual ladders. Everything
      after her second cast is rotation-bound, which is why the upper tiers are not readable from her
      gaps — a reusable lesson for any CDR unit. Her 1.208 HOT is NOT kit-encoding (zero self-damage
      lines) → the SMG weapon-model thread; batch-and-stop, nothing enacted.

**Pattern worth reusing:** a line whose only observable is a *consumer's* reaction (helm H8) needs a
fixture that strips the unit's OTHER sources of that same signal — otherwise saturation hides it and
the test passes under both models. Same shape as liter L3 (strip every other heal to prove her
cover-HP restore emits nothing).

## Step 4 — re-position the batch audit layer

- audit-kit / blind-rebuild / kit-parse audits = **post-validation sampling** over units that
  already have owner-driven spec tests (and triage for units that don't yet) — never again the
  primary build path for a kit.
- Doc updates when steps 1–2 land: CONVENTIONS (test-first workflow note), the audit-kit /
  kit-parse skill descriptions (one-line reframe), STATE.md pointer to the test suite as the
  faithfulness gate. `/skill-maintenance` pass at the end.

## Sequencing / landing checklist

- [x] **1a–1c LANDED 2026-07-23.** `vitest@4` devDep + root `vitest.config.ts`
      (`include: scripts/tests/**/*.test.ts`, node env, 300s timeouts for the 30–90s generator
      searches). Layout: `scripts/tests/engine/` (3 primitive tests) + `scripts/tests/generators/`
      (the 6 formerly-orphaned suites) + `scripts/tests/lib/harness.ts` + `scripts/tests/units/`
      (empty, awaiting step 3). All 9 migrated to `describe`/`it`/`expect` — runner syntax only,
      no assertion weakened, header evidence comments kept; all 9 were green BEFORE migration
      (checked individually) and are green after: **9 files / 59 tests, 79s** (vs ~190s serial).
      verify.sh's 3 individual `npx tsx` lines → ONE `npx vitest run`, so a new test file is wired
      in by existing. `npm run test:unit` / `test:unit:watch`; `vitest.config.ts` added to
      tsconfig `include` so typecheck covers it.
- [x] **1d LANDED 2026-07-23** — `cfg.onEvent` on the `onevent` worktree, step-7 reviewed, merged.
      Output byte-identical (whole-board A/B, not just the snapshots). 6 payload follow-ups above.
- [ ] 2: primitive backfill by census priority (multi-session; findings-only discipline; checklist
      appended here)
- [ ] 3: per-unit TDD sessions begin (owner-driven; ongoing — this bullet never "completes", it
      replaces the old kit workflow)
- [ ] 4: doc/skill reframe + `/skill-maintenance`

**HYGIENE:** when 1–2 and 4 are landed, fold the workflow into CONVENTIONS/STATE, mark this doc
CLOSED + `mv` to `docs/handoffs/closed/`, and keep only the step-2 checklist if still in flight.
