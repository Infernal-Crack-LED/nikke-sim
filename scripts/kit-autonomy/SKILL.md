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
  `docs/kit-autonomy-decisions.md §5` and the `kit-parse` hard rules (substitute a *different* unit's example
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
+ current model + tier + board reading. (This is kit-tdd Step 0.)

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
(no history — the WHY goes to DECISIONS). `npx tsx scripts/validate-overrides.ts <slug>` must pass; tests go
GREEN. (For an already-faithful unit this stage is minimal/none — the tests are pins.)

## Stage 4 — engine updates (driver, isolated worktree) — ONLY if a primitive is genuinely missing
A GAP test (`it.skip` + reason) marks the missing primitive; entry in `docs/engine-modeling-gaps.md`. Build
the primitive / event-payload extension in an **isolated worktree** (`git worktree add … -b <topic>` or
`Agent(isolation:"worktree")`), run `/scientific-method` step-7 + `bash scripts/verify.sh` there, then merge
back to the gauntlet branch. **Never edit `src/engine/**` in the shared tree.** The engine serves
faithfulness (a specific buff/stat/state-machine/bus), NEVER to simplify the kit. If the change has broad
blast radius (a universal prior), it is a `/tuning-priors` promotion needing owner awareness → escalate.

## Stage 5 — blind post-op test-writer (separate blind subagent)
Spawn with `scripts/kit-autonomy/BLIND-TEST-WRITER.md` (prepend non-negotiables), handing it the kit prose +
harness API + schema + disposition vocab + §5 lessons (REDACTED per §0). Blind to the driver's
tests/override/reasoning and the truth file. It writes its OWN `<slug>.test.ts` from the prose alone (the
same forcing function) + its spec table. Save to `scripts/kit-autonomy/blind/<slug>.test.ts` (+
`<slug>.test-spec.json`).

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
reason to revert). Unit tests pin *faithful*; the board pins *accurate*; report both.

## No-go loop + escalation
- **NO-GO(faithfulness):** the driver fixes the specific cited divergence and re-runs from the earliest
  affected stage (S2 or S3). **Bound: 2 retries.** The driver may NOT weaken an assertion or re-introduce an
  unfaithful encoding to reach GO.
- **NO-GO(engine-core/irreversible)** OR **2 failed retries:** STOP and escalate via the
  `autonomous_session_webhook` (`.env`) with the judge's cited divergences + the driver's recommendation.
  The driver never makes an irreversible/engine-core decision alone.

## Land (on GO)
Override prose = current-state; `docs/DECISIONS.md` entry per ruling; `data/kit-status.json` via
`scripts/kit-status.ts`; `bash scripts/verify.sh` green; commit (freely, never push unless asked);
`/mechanics-doc-upkeep` if the engine changed; `/skill-maintenance` if the session taught a reusable lesson.

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
- 2026-07-23 — created. Encodes the autonomous test-first gauntlet (docs/kit-autonomy-decisions.md §14,
  red-team-hardened): test-centric gate, independent re-derivation (S2b/S5/S6), binding judge (S7),
  de-contaminated blind packets, independent RED gate, bounded no-go loop + webhook escalation.
