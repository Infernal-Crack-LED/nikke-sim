---
name: kit-autonomy
description: Autonomous, fully-agent-driven TEST-FIRST kit-faithfulness gauntlet for ONE unit. Takes an AI from reading the data/characters.json kit entry to a fully unit-tested, engine-faithful override WITHOUT an owner-driven spec review — replacing the owner gate with INDEPENDENT RE-DERIVATION (an adversarial test-faithfulness reviewer + a blind test-writer + a blind override-writer) reconciled by a binding go/no-go judge. Use when the owner has authorized autonomous kit authoring on a branch ("run the kit-autonomy gauntlet on X", "autonomous kit session for X"). Distinct from kit-tdd (owner-driven spec; autonomous sessions append-to-queue) — this is the editing-authorized autonomous form. The UNIT TEST is the gate; blind/sighted/judge triangulation is the secondary sampler. HONEST LIMIT: every reviewing agent is the same model, so a clean GO is evidence against idiosyncratic error + a forcing-function check that each line was read precisely — NOT proof of faithfulness; systematic shared-prior errors (scope / duration / trigger-identity) need a different model or the owner.
---

# kit-autonomy — autonomous test-first kit-faithfulness gauntlet

Reverse-checks AND forward-builds a unit's kit without an owner in the loop. Normal authoring is
prose → override (forward); kit-tdd gates that with an OWNER-driven line-by-line spec. This skill is the
**autonomous, editing-authorized** form: it replaces the owner's spec review with **independent
re-derivation** of the discriminating assertions from the prose, then reconciles driver vs blind agents
against the real kit text + the damage-formula SSOT.

**The central insight (why test-centric, not prose-triangulation-centric):** the TDD transition plan
proved that prose→JSON triangulation "generates and checks at the same altitude, so a plausible-but-wrong
reading survives both." The unit TEST is the forcing function — `expect(gone on round 11)` is unwritable
from a vague reading. So the binding gate is the test (stat-/footage-independent); the blind/sighted/judge
triangulation is a **secondary sampler**, subordinated so a prose→JSON agreement can never override a test
disagreement.

## When to use

- The owner has authorized autonomous kit authoring **on a branch** (override + engine edits on the branch
  only, never `main`): "run the kit-autonomy gauntlet on `<slug>`", "autonomous kit session for `<slug>`".
- A unit needs a faithful, fully-unit-tested kit and no owner is available to drive the line-by-line spec.
- **Not** for: units where the owner wants to drive the spec (use `/kit-tdd`); roster sweeps (batch-and-stop
  — findings only); pure measurement/engine-constant changes (`/scientific-method`); engine primitives with
  no unit attached (step-2 backfill).

## Non-negotiables

Prepend `.claude/subagent-non-negotiables.md` to EVERY subagent prompt below.

1. **Faithful > fit, measured > fudge.** NEVER fabricate a value to hit a number; NEVER weaken an assertion
   or re-introduce an unfaithful encoding to reach GO (the kit-tdd anti-pattern). A board move AWAY from 1.0
   after a faithful fix is fit-exposure (a separate localization thread), not a reason to revert.
2. **Blindness is load-bearing.** A blind role that ever sees the driver's tests/override/reasoning or the
   truth file is VOID. YOU guard what you hand each subagent (the redaction + leak assertion below).
3. **Tests live in `scripts/tests/units/<slug>.test.ts`, NEVER under `src/engine/`** (protected; content guard).
4. **Protected-path routing for the fix:** `src/skills/overrides/<slug>.json` needs the per-session approval
   prompt; `src/engine/**` needs an **isolated worktree** + `/scientific-method` step-7 before merge-back.
5. **Exact slug** (base ≠ variant is a P0 failure); run `npx tsx scripts/lint-slug-disambiguation.ts` first.
6. **Evidence-tier tag** every assertion and every override value (MEASURED > DATAMINED > COMMUNITY >
   CALIBRATED ⚑; `docs/CONVENTIONS.md`). A `CALIBRATED ⚑` is never mistaken for `MEASURED`.

## The honest limit (read before trusting any GO)

Every reviewing agent here is the **same underlying model** (the agent tool has no `model` parameter, so
audit-kit's Opus-pinning is unavailable). Independent re-derivation decorrelates **idiosyncratic** error but
NOT **shared-prior** bias: a plausible-but-wrong reading the model's prior favors — and the repo's taxonomy
says the dominant errors are exactly these SYSTEMATIC ones (scope-collapse, duration-semantics,
trigger-identity) — will be produced identically by driver and blind agent; they converge, and the
convergence is **false confidence**. **A clean GO is therefore evidence against idiosyncratic error + a
forcing-function check that each line was read precisely — NOT proof of faithfulness.** Mitigations baked in
below: adversarial blind agents (§S2b), de-contaminated packets (§0), the independent execution gate (§S2d),
the judge's formula check (§S7). **Recommend an owner spot-check for the systematic-prior-prone lines
(scope / duration / trigger-identity) before trusting a GO.** Magnitude faithfulness is OUT OF SCOPE (tests
are stat-independent); the gauntlet certifies STRUCTURE, not numbers.

---

## Stage 0 — preflight + blind-packet redaction (driver)

```sh
npx tsx scripts/lint-slug-disambiguation.ts                    # exact slug is P0
```

- State the full name + slug + weapon/class/element/burst.
- **Build the REDACTED methodology packet** that the blind roles (S2b/S5/S6) will receive. Strip the target
  unit's name/slug, its trigger/gate/magnitudes, and any worked example naming it from the excerpts of
  `docs/kit-autonomy-decisions.md §5` and the `kit-parse` hard rules (substitute a _different_ unit's example
  if one is needed). The blind roles DO receive the kit prose (legitimate input — it names the mechanic; that
  is what is being derived) and the `src/skills/types.ts` schema (the vocabulary).
- **Leak assertion (mirrors `scripts/blind-rebuild/build-packet.ts`):** before dispatching any blind role,
  grep the assembled blind prompt for the slug + its key magnitudes + answer tokens **outside the prose
  block**; fail loudly if any appear. (For privaty: `256.17` / `1687` / `1407.64` / `Designated Target`.)

## Stage 1 — read + line inventory (driver, sighted)

Read `data/characters.json → characters.<slug>` (or `scripts/blind-rebuild/char-extracts/<slug>.json`), the
shipped `src/skills/overrides/<slug>.json` IN FULL (blocks + note/caveats/unmodeled + any config fields), the
`data/kit-status.json` row, and `docs/engine-modeling-gaps.md` hits. Split every skill into individual kit
lines (a `■` header = trigger + target; each following sentence = one effect line). Record the line inventory

- current model + tier + board reading. (This is kit-tdd Step 0.)

**Recognize known gaps — do NOT re-derive them.** Most "missing primitive" residuals are already itemized in
`docs/engine-modeling-gaps.md`; when a line hits one, document it as the known theme (measurement-gated /
inherent-v1) instead of re-analyzing the limitation from scratch. Recurring ones: cadence tuple = **theme 1**,
defensive/heal/shield (no HP pool in v1) = **theme 2**, flat Max-Ammo = **theme 14**, timed/swap pierce =
**theme 5**, weapon-swap economy = **theme 7**, "X is fixed at V" stat locks = **theme 1b**. A new residual
not in the catalog gets a dated entry there at Land (the cross-unit backlog), not just a per-unit note.

## Stage 2 — tests FIRST, with independent re-derivation (the faithfulness gate)

**S2a — driver writes the tests.** For each kit line: a disposition (FAITHFUL / FIX / MISSING / GAP /
UNMODELED / MEASUREMENT-GATED) + the 4 questions (scope · duration semantics · trigger identity · target
set), and name the **nearest-wrong counterfactual** explicitly. Write `scripts/tests/units/<slug>.test.ts`
via `scripts/tests/lib/harness.ts` (`controlComp`, `runComp`, `cfg.onEvent`, `withPatchedOverride`):

- **FAITHFUL line on an already-faithful override:** a PIN assertion that is **GREEN vs the shipped override
  AND RED vs the named counterfactual** (`withPatchedOverride`).
- **FIX/MISSING line on an unfaithful override:** an assertion **RED vs the shipped override**, implemented
  to green in S3.
- Header comment carries the evidence (what the kit says, the fixture, why each assertion discriminates).
- Event-log over totals; discriminating + inertness assertions; deterministic (no seed); fixture supplies
  B1/B2 so a B3 actually casts (a lone B3 makes ZERO Full Bursts). Model: `scripts/tests/units/helm.test.ts`.

**S2b — adversarial test-faithfulness reviewer (separate subagent, blind to the driver).** Spawn with
`scripts/kit-autonomy/TEST-FAITHFULNESS-REVIEW.md` (prepend the non-negotiables), handing it the REDACTED
packet (§0) + the kit prose + harness API + schema + disposition vocab + the 4 questions. It independently
re-derives the spec table AND, for each line, generates the **nearest-wrong reading + the assertion that
distinguishes it**, and proposes the **load-bearing set** (every FAITHFUL/FIX/MISSING line that is not
UNMODELED). Save its JSON to `scripts/kit-autonomy/reviews/<slug>.test-review.json`.

**S2c — reconcile (driver).** Compare your spec / counterfactuals / load-bearing set against the reviewer's.
Convergence = green-light. **A divergence on the nearest-wrong model OR on load-bearing-ness is itself a
divergence** — resolve toward the prose-faithful reading (NOT toward the shipped override) + record it;
unresolved divergences go to the judge.

**S2d — INDEPENDENT VERIFICATION GATE (no self-reported RED).** A separate subagent (or an automated
`npx vitest run scripts/tests/units/<slug>.test.ts` the driver does not author) runs the S2a tests against
(i) the **unmodified shipped override** — expect GREEN for every FAITHFUL pin — and (ii) **each named
counterfactual** — expect RED, and records the full pass/fail matrix as an artifact
(`scripts/kit-autonomy/reviews/<slug>.verify.txt`). A test that is GREEN under BOTH shipped and counterfactual
(asserts nothing) FAILS this gate. This is the autonomous form of kit-tdd's "confirm RED before implementing."

## Stage 3 — faithful override (driver)

Implement the **minimum** `src/skills/overrides/<slug>.json` change to turn the FIX/MISSING tests green
(approve the protected-path prompt). Every skipped line VERBATIM in `unmodeled`; every value outside the
input domain is a ⚑ with estimate + recipe + tier; NO `ignored` blocks; override prose = current-state only
(no history — the WHY goes to DECISIONS). The override `note` carries the provenance marker
`Kit-autonomy gauntlet <YYYY-MM-DD>` (the Land step's `kit-status.ts --gauntlet` derives provenance + date
from it). `npx tsx scripts/validate-overrides.ts <slug>` must pass; tests go GREEN.

**Certify-only path (already-faithful unit).** If the shipped override is already faithful — every line a PIN,
no FIX/MISSING — S3 makes NO encoding change: add only the `Kit-autonomy gauntlet <YYYY-MM-DD>` note marker,
then flip provenance at Land. The gauntlet CERTIFIES structure; do not manufacture a change to look productive.
(5 of the 10-unit 2026-07-24 bottom-up batch were certify-only.)

**Kit-silent cadence ⚑ (recurring).** When fire rate / reload / charge cadence is absent from the datamine and
the recording, apply the STANDARD `⚑ cadence tuple` flag (`docs/engine-modeling-gaps.md` theme 1) with its
video-plan recipe (solo scope-lock clip: rounds/10s + mag-empty→first-shot gap) — do not re-derive the
limitation per unit. Same for the other catalog themes: cite the theme, attach its recipe, move on.

## Stage 4 — engine updates (driver, isolated worktree) — ONLY if a primitive is genuinely missing

A GAP test (`it.skip` + reason) marks the missing primitive; entry in `docs/engine-modeling-gaps.md`. Build
the primitive / event-payload extension in an **isolated worktree** (`git worktree add … -b <topic>` or
`Agent(isolation:"worktree")`), run `/scientific-method` step-7 + `bash scripts/verify.sh` there, then merge
back to the gauntlet branch. **Never edit `src/engine/**`in the shared tree.** The engine serves
faithfulness (a specific buff/stat/state-machine/bus), NEVER to simplify the kit. If the change has broad
blast radius (a universal prior), it is a`/tuning-priors` promotion needing owner awareness → escalate.

## Stage 5 — blind post-op test-writer (separate blind subagent)

Spawn with `scripts/kit-autonomy/BLIND-TEST-WRITER.md` (prepend non-negotiables), handing it the kit prose +
harness API + schema + disposition vocab + §5 lessons (REDACTED per §0). Blind to the driver's
tests/override/reasoning and the truth file. It writes its OWN `<slug>.test.ts` from the prose alone (the
same forcing function) + its spec table. Save to `scripts/kit-autonomy/blind/<slug>.test.ts` (+
`<slug>.test-spec.json`).

The `scripts/kit-autonomy/blind/**` artifacts are an EVIDENCE TRAIL — the blind role's verbatim output,
mechanical defects and all — and are EXCLUDED from the production typecheck (`tsconfig.json` `exclude`,
alongside `scripts/blind-rebuild/code-bundle/**`). They are NOT run by vitest and must never break
`npm run typecheck`; a blind test file's harness/import defects are expected and irrelevant. Convergence is
carried by the blind SPEC table + the S6 override + the driver's harness-correct test, not by executing the
blind file. Do not "fix" the blind file to make it compile — preserve it verbatim.

## Stage 6 — blind post-op override-writer (separate blind subagent)

Spawn with `scripts/kit-autonomy/BLIND-OVERRIDE-WRITER.md` (prepend non-negotiables) — `kit-parse`
BLIND-STUDY mode: kit prose + `types.ts` schema + `docs/modeling-priors.md` + kit-parse hard rules + ALWAYS-⚑
taxonomy + a DIFFERENT unit's override as a style example (REDACTED per §0; VALUES-WITHHELD — no
grade.ts/experiment/board/other-units'-probe-data). Blind to this unit's override, the driver's
tests/reasoning, DECISIONS/handoffs/probe-data, git history. It writes its OWN override JSON + per-line audit
table + ⚑ list. Save to `scripts/kit-autonomy/blind/<slug>.override.json` (+ `<slug>.audit.json`).

## Stage 7 — reconciling judge → binding go/no-go (separate subagent)

Spawn with `scripts/kit-autonomy/RECONCILING-JUDGE.md` (prepend non-negotiables + the `/context` mechanics
pack: `docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`). Hand it: the kit prose; the S2b
pre-op review; the S5 blind tests; the S6 blind override; the driver's tests + override + any engine change;
the formula SSOT. It grades **artifacts vs ground truth** (it does NOT trust the author's self-report; it is
not "blind to reasoning" — the artifacts embody it). **Convergence is mechanical:** run the S5 blind tests,
UNMODIFIED, against the driver's shipped override — GREEN = convergence, any RED = a divergence to classify.
It classifies every line FAITHFUL / DOCUMENTED-GAP / REAL-GOTCHA{SILENT_DROP, ENGINE/FIDELITY, ENCODING},
runs the fire-rate "modeled≠working" check (each FAITHFUL block fires at the prose-implied cadence over
180s), and returns ranked gotchas + `kitDescription` + `faithfulnessScore` + a verdict
(**GO / NO-GO(faithfulness) / NO-GO(engine-core)**). Save to `scripts/kit-autonomy/results/<slug>.json`.

**GO requires ALL of:** every kit line accounted for (FAITHFUL or documented UNMODELED/GAP/⚑, no silent
drops; audit SKIPPED ↔ `unmodeled` 1:1); no REAL-GOTCHA; the S5 blind tests run green vs the driver's
override (convergence); every ⚑ has estimate + recipe + tier; the tests discriminate (S2d matrix); the
fire-rate check passes. The verdict is BINDING.

## Stage 8 — board A/B report (driver, non-gating)

`npx tsx scripts/board-read.ts | grep -i <slug>` before/after; report both numbers + classify movement
(toward 1.0 = the misencoding was the error; away = fit-exposure, a separate localization thread, never a
reason to revert). Unit tests pin _faithful_; the board pins _accurate_; report both.

## No-go loop + escalation

- **NO-GO(faithfulness):** the driver fixes the specific cited divergence and re-runs from the earliest
  affected stage (S2 or S3). **Bound: 2 retries.** The driver may NOT weaken an assertion or re-introduce an
  unfaithful encoding to reach GO.
- **NO-GO(engine-core/irreversible)** OR **2 failed retries:** STOP and escalate via the
  `autonomous_session_webhook` (`.env`) with the judge's cited divergences + the driver's recommendation.
  The driver never makes an irreversible/engine-core decision alone.

## Land (on GO)

- Override prose = current-state, and the override `note` carries the `Kit-autonomy gauntlet <YYYY-MM-DD>`
  marker (S3 wrote it).
- `docs/DECISIONS.md` entry per ruling.
- **Record the outcome in `data/kit-status.json`** (the per-unit SSOT) — this is the gauntlet's last step:
  ```sh
  npx tsx scripts/kit-status.ts --gauntlet <slug> \
    --evidence "kit-autonomy gauntlet <date>; GO faithfulness <score>; <provenance: 'cross-family S2b(fable)/S5/S6/S7(opus) converged' — OR 'same-model only (Qwen reviewers)'>" \
    --residual "<the owner spot-check cluster from manual-review/<slug>.md>"
  ```
  `--gauntlet` syncs the unit's AUTO mirrors (provenance/unmodeled/caveats) ITSELF, so `kit-status.ts --check`
  passes with no further step. **Do NOT run a full `--refresh` per-unit** — it rewrites the global `counts` +
  EVERY unit's board row, which is the conflict surface when concurrent batches share `kit-status.json` (each
  per-unit refresh guaranteed a merge conflict on the shared global region). The global aggregates are
  regenerated once at batch-end / merge reconciliation — see "Reconciling concurrent batches" below. (A
  single-unit gauntlet run off-batch MAY run `--refresh` to update that unit's board row immediately; it is
  never required for `--check`.)
  `--gauntlet` reads the S7 judge result (`scripts/kit-autonomy/results/<slug>.json`) and sets
  `kitParse.status: "unit-tested"`, `kitParse.provenance: "gauntlet"` (derived from the note marker),
  `kitParse.date` (the gauntlet date), and the `kitParse.findings` (a GO summary + one line per judge gotcha).
  On the EVIDENCE axis it records the gauntlet **without clobbering tuning provenance**: it APPENDS the
  `--evidence`/`--residual` lines to any existing ones, sets the top-level `date` only if absent (a
  fight-validated unit keeps its recording date), and defaults `graded` to `{teams:0, within3pct:0}` only if
  absent. **It deliberately does NOT touch `tier`/`tuned`** — the gauntlet certifies STRUCTURE (faithfulness),
  not tuning, so the unit keeps its tuning tier (a pure-model unit stays `MODEL_ONLY`/`tuned:false`; a
  fight-validated unit stays `MEASURED`/`CALIBRATED`/`VALIDATED`). There is no `GAUNTLET` tier; never invent
  one. `--evidence`/`--residual` are required (the driver supplies them from the run it just drove — nothing is
  fabricated from the judge's free-text rationale; a same-model run's evidence must say "same-model only").
- Set `simSupported: true` in `data/characters.json` for the unit (protected path — the gauntlet's GO verdict
  is the owner-approved gate).
- `bash scripts/verify.sh` green; commit (freely, never push unless asked); `/mechanics-doc-upkeep` if the
  engine changed; `/skill-maintenance` if the session taught a reusable lesson.

## Batch hygiene (shared worktree)

When running the gauntlet for a BATCH of units on one shared worktree (one commit per unit):

- **Clean up scratch after a successful commit.** The progress/extract files are RESUME instrumentation, not
  artifacts: `rm -f .gauntlet-progress-<slug>.txt .<slug>-extract.json` once the unit's commit has landed. The
  commit is the durable record and the orchestrator keys off commit-exists (`git rev-list origin/main..HEAD`),
  not the progress file, so removing it post-commit is safe; leaving it behind pollutes the worktree for the
  next unit.
- **Dispatch FOREGROUND, never background.** Run `scripts/kit-autonomy/dispatch-claude.sh` as a foreground
  shell with a LONG timeout (~480000–600000 ms): opus S5/S6/S7 take 2–5 min. A backgrounded dispatch can
  outlive the agent's turn and leak (a result JSON landing after the unit is already committed). Dispatch is the
  explicit EXCEPTION to any 60s "stop-don't-wait" rule — only a real error / no-valid-JSON after a long wait is
  a failure; suspect impatience before suspecting the bridge.
- **Commit only this unit's artifacts — never `git add -A`.** In a shared worktree, prior units'
  `cross-family/<slug>/` dirs accumulate. The cross-family packets + results are an EVIDENCE TRAIL and batch
  drivers force-commit them (`git add -f scripts/kit-autonomy/cross-family/<slug>/`) — fine for THIS unit's dir
  (the result JSONs are not regenerable without an expensive re-dispatch), but `git add -A` would sweep every
  prior unit's accumulated `cross-family/` dir too. Add paths explicitly: this unit's override + test +
  `results/` + `manual-review/` + `cross-family/<slug>/` + the `kit-status.json` flip.

## Reconciling concurrent batches

Multiple gauntlet batches run concurrently on separate branches (one batch per worktree). The PER-UNIT work
is disjoint — different slugs' overrides / tests / `results/` / `manual-review/` / `cross-family/<slug>/` never
collide. Conflicts are confined to the DERIVED aggregate files, and only because they carry repo-wide state:

- `data/kit-status.json` — the global `counts` object + every unit's `board` row (the per-unit `kitParse` /
  `unmodeled` / `caveats` entries are disjoint across batches).
- `scripts/regression-snapshot.json` — per-comp damage totals.
- `docs/STATE.md` §5 primitive tables + `docs/engine-modeling-gaps.md` census.

**Per-commit mitigation (already in the Land step):** `--gauntlet <slug>` syncs the gauntleted unit's AUTO
mirrors itself and does NOT run a full `--refresh`, so each commit touches only that unit's `kit-status.json`
entry (disjoint) — not the global `counts`/`board` region. This removes ~all kit-status conflict surface.

**Merge reconciliation (when landing a batch branch on top of a `main` that moved):**

1. `git fetch origin && git rebase origin/main` in the batch worktree.
2. `data/kit-status.json` conflicts: resolve by OVERLAYING the batch unit's entry onto the main-side file —
   keep main's file, set `units[<slug>] = <the batch commit's units[<slug>]>` (the slug is in the commit
   subject `kit-autonomy gauntlet <slug>: …`). Do this per conflicting commit. **Never union-merge the whole
   file** — the batch commit's copy of OTHER units is stale (pre-main-gauntlet) and would clobber main's
   gauntlet data on shared "bystander" units (e.g. a unit your batch re-simmed for board rows but main actually
   gauntleted). Global `counts`/`board` are regenerated in step 5, so leave them as main's during the rebase.
3. `scripts/regression-snapshot.json`: keep either side — regenerated in step 5.
4. `docs/STATE.md` / `docs/engine-modeling-gaps.md`: union-merge the §5 prose rows (a primitive's user list is
   the union of both batches' edits); `doc-drift --update` (step 5) prunes any false members against the
   combined overrides.
5. Regenerate the derived aggregates against the combined tree:
   ```sh
   npx tsx scripts/kit-status.ts --refresh   # global counts + all board rows + AUTO mirrors (sims all comps)
   npx tsx scripts/regression.ts --update    # regression snapshot
   npx tsx scripts/doc-drift.ts --update     # primitive census + STATE.md §5 false-member prune
   ```
6. `bash scripts/verify.sh` green, then ONE clearly-labeled reconciliation commit (the derived aggregates are
   not hand-mergeable — board rows need re-simming). Result: the batch's per-unit commits + one reconciliation
   commit on top of `main`.

## Verify

```sh
npx vitest run scripts/tests/units/<slug>.test.ts   # the gate
bash scripts/verify.sh                              # the canonical repo gate
```

## References

- Design + decisions of record: `docs/kit-autonomy-decisions.md` (Part I lessons; Part II §10–§13 methodology;
  **§14 red-team revisions are AUTHORITATIVE**).
- Templates: `scripts/kit-autonomy/{TEST-FAITHFULNESS-REVIEW,BLIND-TEST-WRITER,BLIND-OVERRIDE-WRITER,RECONCILING-JUDGE}.md`.
- Harness: `scripts/tests/lib/harness.ts`; exemplar `scripts/tests/units/helm.test.ts`.
- Reused machinery: `scripts/blind-rebuild/build-packet.ts` (redaction + leak-assertion model);
  `/kit-tdd` (test-writing discipline), `/audit-kit` (triangulation), `/kit-parse` (blind override authoring).

## Change log

- 2026-07-25 (concurrent-batch hardening, 20-unit blanc..isabel batch) — two batches ran concurrently and
  collided on the derived aggregate files. (1) `kit-status.ts --gauntlet` now syncs the gauntleted unit's AUTO
  mirrors (provenance/unmodeled/caveats) itself, so the Land step needs NO per-unit `--refresh` — a full
  `--refresh` rewrites the global `counts` + every unit's board row, which guaranteed a merge conflict on every
  commit when batches share `kit-status.json`. Verified: a stale mirror fails `--check`, `--gauntlet` re-syncs
  it, `--check` passes with no `--refresh`. (2) New "Reconciling concurrent batches" section: rebase + overlay
  the batch unit's `kit-status.json` entry (never union-merge the whole file — it clobbers the other batch's
  gauntlet data on shared bystander units) + regenerate aggregates (`kit-status --refresh`, `regression
--update`, `doc-drift --update`) + `verify.sh` + one reconciliation commit. (3) `dispatch-claude.sh` JSON
  extraction switched from a hand-rolled brace-matcher (desynced on large embedded-code `testSource` payloads,
  truncating the response) to `json.raw_decode`.
- 2026-07-24 (post-batch hardening, 10-unit bottom-up batch) — rolled the batch's recurring re-derivations
  into the skill: (1) harness import boilerplate + structural shape cheat-sheet (totals/unitOf per-slug maps,
  slot-keyed OverrideFile with NO top-level `blocks`, `gainPierce` effect vs `hasPierce` flag, flat-resolved
  caster buff events, no `buffRemove` on time-lapse) added to `BLIND-TEST-WRITER.md` AND restored to the
  `prepare-cross-family-packet.ts` harnessNote — the #1 blind-test failure was guessing these shapes; (2) the
  `scripts/kit-autonomy/blind/**` typecheck exclude documented (Stage 5) — blind files are an evidence trail,
  not run by vitest; (3) Batch-hygiene section + `kit-gauntlet-driver` rules: clean up `.gauntlet-progress-*`/
  `.<slug>-extract.json` post-commit, dispatch `dispatch-claude.sh` FOREGROUND (never background; it leaks),
  commit only this unit's tracked artifacts; (4) canonical model names now live in `CROSS-FAMILY-PROTOCOL.md`
  (S2b `claude-fable-5`; S5/S6/S7 `claude-opus-5` REQUIRED — `claude-opus-4-8` is a different model, not an
  alias); (5) `prepare-cross-family-packet.ts` prints an advisory TOKEN HINT for prose magnitudes that appear in
  `types.ts` but are missing from `--tokens` (catches under-redaction) + over-redaction guidance; (6) S1 now
  points drivers at the `docs/engine-modeling-gaps.md` themes to RECOGNIZE known gaps instead of re-deriving
  (batch cross-check + 2 new owner-flagged engine questions recorded there); (7) standard `⚑ cadence tuple`
  (theme 1) flag + recipe; (8) explicit certify-only fast path for already-faithful units.
- 2026-07-24 — Land step now records the GO in `data/kit-status.json` via `kit-status.ts --gauntlet <slug>`
  (kitParse.status `unit-tested`, provenance `gauntlet` from the S3 note marker, findings/evidence/residual/
  date/graded). The gauntlet certifies STRUCTURE, not tuning, so `tier`/`tuned` stay `MODEL_ONLY`/`false`
  (there is no GAUNTLET tier).
- 2026-07-23 — created. Encodes the autonomous test-first gauntlet (docs/kit-autonomy-decisions.md §14,
  red-team-hardened): test-centric gate, independent re-derivation (S2b/S5/S6), binding judge (S7),
  de-contaminated blind packets, independent RED gate, bounded no-go loop + webhook escalation.
