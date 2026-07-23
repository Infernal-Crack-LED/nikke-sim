# kit-autonomy — decisions & methodology log

> Living doc for the **autonomous kit-faithfulness gauntlet** session (started 2026-07-23).
> Records scope, the hardening insight, the workflow design, every decision (append-only), and the
> live-run trace. Companion artifact: the `.claude/skills/kit-autonomy/` orchestration skill.
>
> **Path note:** the request named `doc/kit-autonomy-decisions.md`; this repo's convention is `docs/`
> (home of `DECISIONS.md`), so the doc lives at `docs/kit-autonomy-decisions.md`. Say the word to move it.
>
> **Worktree:** `.qwen/worktrees/kit-autonomy` · **branch:** `worktree-kit-autonomy` (off `main`).

---

## 1. Scope (locked with owner 2026-07-23)

| Question | Decision |
| --- | --- |
| Deliverable | **Plan + live run** — write the hardened methodology AND execute the full 7-step gauntlet end-to-end on one real unit, committing artifacts as we go. |
| Live target | **Moderate, well-understood unit** with a shipped override + 1-2 non-trivial mechanics; driver proposes the slug (see §6). |
| Artifact form | **Skill + doc**, reusing `scripts/blind-rebuild/` machinery + `scripts/tests/lib/harness.ts` (no rebuild). |
| No-go policy | **Bounded loop, then escalate** — on a step-7 no-go, fix + re-run the gauntlet up to **2 retries**; if still no-go, or an irreversible/engine-core decision arises, pause and ping the owner via the `autonomous_session_webhook` in `.env`. **Faithfulness blocks are never overridden by the driver.** |

Owner also granted, for this exercise only: editing `src/skills/overrides/<slug>.json` and `src/engine/**`
**on the worktree branch only** (never `main`). Engine edits follow the isolated-worktree +
`/scientific-method` step-7 discipline from `kit-tdd` before any merge-back.

## 2. The central hardening insight (the trap to avoid)

`docs/handoffs/2026-07-23-tdd-transition-plan.md` (today's plan-of-record) **demoted** audit-kit /
blind-rebuild from the build path to *post-validation sampling*, for a precise reason:

> they "generate and check at the **same altitude (prose → JSON)**, so a plausible-but-wrong reading
> survives both."

The thing that actually gates faithfulness is the **unit test**, because writing it is a forcing
function: `expect(buff active on rounds 1..10 spanning the reload, gone on round 11)` is **unwritable
from a vague reading** of the kit. The board gates *fit*; nothing automated gates *faithfulness* except
tests, which are stat-independent and footage-independent.

**Consequence for this design:** an autonomous gauntlet that triangulates prose→JSON agents (blind
rebuild + sighted review + judge) **cannot by itself catch a plausible misread** — the author and the
blind rebuilder are both reading the same prose at the same altitude. The autonomous substitute for the
owner-driven line-by-line spec must therefore be **independent re-derivation of the discriminating
assertions from the prose** (the requested steps 2 and 5: write tests first; a blind agent re-writes
tests from the prose alone). If two independent agents, given only the kit text, both converge on
`expect(gone on round 11)`, that is strong evidence the reading is *forced by the text* rather than a
plausible misread. The blind/sighted/judge triangulation (steps 6–7) is then a **secondary sampler over
the code**, not the primary faithfulness gate.

So the workflow is **test-centric, not prose-triangulation-centric.** Tests are the gate; triangulation
is the audit.

## 3. The 7-step gauntlet (as requested) → mapping to existing machinery

| # | Requested step | Existing machinery reused | Faithfulness role |
| --- | --- | --- | --- |
| 1 | Read the `characters.json` entry | `data/characters.json` → `characters.<slug>` (blablalink prose = SSOT); `scripts/lint-slug-disambiguation.ts` for the P0 slug gate | Establish ground truth + exact slug |
| 2 | Write unit tests FIRST; independent reviewer reviews the tests for kit faithfulness; green-light | `scripts/tests/units/<slug>.test.ts` via `scripts/tests/lib/harness.ts` (`controlComp`, `runComp`, `cfg.onEvent`); test-reviewer subagent applies the `kit-tdd` disposition vocabulary + the 4 per-line questions | **Primary gate** — tests written RED against the shipped override; must discriminate vs the nearest-wrong model |
| 3 | Create the override (100% faithful, no fudging) | `src/skills/overrides/<slug>.json` (`OverrideFile` schema); `kit-parse` hard rules + ALWAYS-⚑ taxonomy; `validate-overrides.ts` | Faithful encoding; measured>fudge; ⚑ anything outside the input domain |
| 4 | Implement engine updates for faithfulness | `src/engine/**` via isolated worktree + `/scientific-method` step-7; `cfg.onEvent` payload follow-ups if a spec needs a new event | Only when a primitive is genuinely missing (a GAP); never to simplify the kit |
| 5 | Blind post-op reviewer writes its OWN unit tests from `characters.json` | blind test-writer subagent (sees prose + harness + schema only; NOT the driver's tests/override/reasoning) | **Independent re-derivation** — convergence with step-2 tests is the faithfulness signal |
| 6 | Blind post-op reviewer writes an override from `characters.json` | `kit-parse` skill in BLIND-STUDY mode (sees prose + methodology only) | Second independent prose→JSON read; diff vs driver's override surfaces encoding divergence |
| 7 | Reconciling judge: sees `characters.json` + pre-op review + both post-op reviews + driver's implementation → final go/no-go | `audit-kit` RECONCILE pattern + damage-formula SSOT (`docs/data/damage-calculation.md`) | Classifies every divergence: faithful / documented gap / real gotcha; **go/no-go is binding** |

**Blindness is load-bearing** (from `audit-kit`): the step-5 and step-6 agents must be separate subagents
that never see the driver's tests, override, or reasoning, or the gauntlet degrades to the same-altitude
trap of §2. `build-packet.ts`'s leak assertion is the model for what "blind" must guarantee.

## 4. No-go / escalation policy

- Step-7 judge returns one of: **GO** · **NO-GO (faithfulness)** · **NO-GO (engine-core/irreversible)**.
- On **NO-GO (faithfulness)**: the driver fixes the specific cited divergence and re-runs from the
  earliest affected step (test or override). **Bound: 2 retries.** The driver may NOT weaken an assertion
  or re-introduce an unfaithful encoding to reach GO (the kit-tdd anti-pattern).
- After 2 failed retries, OR on **NO-GO (engine-core/irreversible)**: **stop and escalate** via the
  `autonomous_session_webhook` (`.env`), with the judge's cited divergences + the driver's recommendation.
- A clean GO from a *blind* gauntlet is **real evidence** of faithfulness (not the author agreeing with
  themselves) — that is the deliverable's value claim.

## 5. Lessons learned (to harden into the workflow)

> _TODO — populated from the docs survey (`/tmp/kit-autonomy-lessons.md`): the recurring failure-mode
> taxonomy, evidence tiers, primitive census, ALWAYS-⚑ taxonomy, and open gaps._

## 6. Target unit

> _TODO — picked from the structure survey (`/tmp/kit-autonomy-structure.md` §F). Criteria: shipped
> override, 1-2 non-trivial mechanics with sharp discriminating assertions, documented ground truth,
> mechanics on backfilled primitives so engine work stays bounded. Not helm / liter._

## 7. Structural contracts (override / characters.json / templates / harness)

> _TODO — populated from `/tmp/kit-autonomy-structure.md` §§A–D._

## 8. Decisions log (append-only)

- **2026-07-23 · D1 ·** Scope locked (see §1): plan + live run; moderate well-understood unit (driver
  proposes); skill + doc reusing blind-rebuild + harness; bounded no-go loop (2 retries) → webhook.
- **2026-07-23 · D2 ·** Workflow is **test-centric, not prose-triangulation-centric** (§2). The unit test
  is the primary faithfulness gate; blind/sighted/judge triangulation is the secondary sampler. Rationale:
  the TDD transition plan's same-altitude finding.
- **2026-07-23 · D3 ·** Doc lives at `docs/kit-autonomy-decisions.md` (repo convention) not `doc/` — see
  path note above.
- **2026-07-23 · D4 ·** Engine + override edits authorized **on the worktree branch only** for this
  exercise; engine changes follow isolated-worktree + `/scientific-method` step-7 before any merge-back.

## 9. Open questions

- (none yet — will be populated as the live run surfaces them; high-priority ones go to the webhook.)
