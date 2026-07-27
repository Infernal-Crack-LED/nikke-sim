---
name: kit-tdd
description: Run ONE unit's test-first kit session — the step-3 workflow of the TDD transition (docs/handoffs/2026-07-23-tdd-transition-plan.md). Owner drives a line-by-line kit spec, the spec becomes scripts/tests/units/<slug>.test.ts written RED against the shipped override, then the override/engine change lands green and the board A/B runs as the outer accuracy loop. Use whenever a unit is being modeled, re-modeled, or re-tuned from its kit text — "TDD session for X", "write kit tests for X", "step 3 for X", or any per-unit kit work that used to start with kit-parse/audit-kit. This is now the PRIMARY build path for a kit; audit-kit is post-validation sampling.
---

# kit-tdd — per-unit test-first kit session (TDD transition, step 3)

The board gates **fit**. Nothing automated gates **faithfulness** — that is why `helm` shipped a generic
crit buff for a normal-attacks-only kit line, and a round count faked as `durationSec 13`, both absorbed
by calibration. Unit tests are the only instrument that can gate faithfulness: they are **stat-independent
and footage-independent**.

The forcing function is the writing, not the running. `expect(buff active on rounds 1..10 spanning the
reload, gone on round 11)` is **unwritable from a vague reading** of the kit. That is the whole point.

## When to use

- A dedicated session to model / re-model / re-tune ONE unit from its kit text.
- A unit's board reading is HOT/COLD and the suspicion is kit encoding, not calibration.
- A kit-parse or audit-kit finding is about to be enacted — enact it through this flow, not directly.
- **Not** for: roster sweeps (batch-and-stop — findings only), engine primitives with no unit attached
  (that is step 2, `scripts/tests/engine/`), or measurement-driven constant changes (`/scientific-method`).

## Non-negotiables

1. **The OWNER drives the spec.** Step 1 is a conversation, not a subagent. A test written from a wrong
   reading passes wrongly and then _certifies_ the misread forever — strictly worse than no test. Never
   auto-generate the spec table and proceed; put it in front of the owner and get each line dispositioned.
2. **Exact slug, first.** `helm` ≠ `helm-aquamarine`; `snow-white` ≠ `snow-white-heavy-arms`. Run
   `npx tsx scripts/lint-slug-disambiguation.ts` and state the full name + slug + weapon/class/element
   before anything else.
3. **Faithful > fit.** A test asserts what the KIT says. If landing it costs board accuracy, that cost is
   fit-exposure in the calibration it was hiding behind (privaty `noFb`, jill's phantom fire rate) — it is
   a separate per-unit localization thread, never a reason to weaken the assertion.
4. **One session, one unit.** A cross-unit pattern noticed here is a batched proposal to the owner
   (`docs/control-regression-followups.md` / the modeling-priors thread), not a sweep started mid-session.
5. **Tests live in `scripts/tests/units/`, NEVER under `src/engine/`** (protected path — test authoring
   must not trip the content guard).
6. **Protected-path discipline for the FIX:** `src/skills/overrides/<slug>.json` needs the per-session
   approval prompt; `src/engine/**` needs an **isolated worktree** (CLAUDE.md constraint 8) and
   `/scientific-method` step 7 before merge-back. In an autonomous session, do neither — append the
   proposal to `docs/handoffs/autonomous-edit-queue.md` and move on. Writing the test file is unrestricted.

## Step 0 — preflight (5 min, do it in a fresh session)

```sh
npx tsx scripts/lint-slug-disambiguation.ts                    # slug is P0
npx tsx -e "const d=require('./data/characters.json').characters['<slug>']; console.log(d.name, d.class, d.weapon, d.element, 'ammo', d.ammo, 'hitsPerShot', d.hitsPerShot, 'reloadFrames', d.reloadFrames); console.log(d.skills.skill1,'\n---\n',d.skills.skill2,'\n---\n',d.skills.burst)"
npx tsx scripts/board-read.ts | grep -i <slug>                 # the accuracy baseline to A/B against
```

Gather, and put in front of the owner in one message:

- the **kit text** (`data/characters.json` → `characters.<slug>.skills` — blablalink-synced, the prose SSOT),
- the **current model** (`src/skills/overrides/<slug>.json` in full — blocks _and_ `note`/`caveats`/`unmodeled`),
- the unit's row in `data/kit-status.json` (tier + open findings) and any hit in
  `docs/engine-modeling-gaps.md` / `docs/handoffs/kit-parse-reconciliation-backlog.md`,
- the current board/control-regression reading.

## Step 1 — line-by-line spec review (owner-driven)

Split every skill into its **individual kit lines** (a `■` header = trigger + target; each following
sentence = one effect line). For each, propose a disposition and let the owner correct it:

| # | Slot | Kit line (verbatim) | Trigger / Target / Scope | Current model | Disposition |

Disposition vocabulary — every line gets exactly one:

- **FAITHFUL** — already modeled correctly ⇒ still gets an assertion (that is the regression value).
- **FIX** — modeled, but trigger/target/scope/magnitude/duration is wrong ⇒ test written RED.
- **MISSING** — not modeled at all, primitive exists ⇒ test written RED.
- **GAP** — needs an engine primitive that doesn't exist ⇒ test written and `it.skip`ped with the reason,
  entry added to `docs/engine-modeling-gaps.md`; the build is its own gated change.
- **UNMODELED** — deliberately out of scope (defensive/HP/shield/arena-only, unmeasurable) ⇒ **verbatim**
  into the override's `unmodeled` array. A skipped line is a _decision, recorded_, never an omission.
- **MEASUREMENT-GATED** — cannot be resolved from prose (a magnitude only footage can settle) ⇒ record in
  `docs/open-questions.md` UNANSWERED; do not guess a number into a test.

Four questions per line, because these are the errors calibration hides:

1. **Scope** — "of normal attacks" / "charge damage" / crit-only? (the `helm` S1 miss: a generic buff for a
   `critRateNormalPct` line).
2. **Duration semantics** — seconds vs **rounds** (`durationShots`) vs stacks vs until-reload vs permanent.
   "for N round(s)" is never `durationSec`.
3. **Trigger identity** — `lastBullet` / `shotFired` / `hitCount` (counts ROUNDS, not pulls) / interval /
   `fullBurstEnter` / `burstCast` / on-cast vs on-hit, and whether a gate (`fbGate`, `everyN`,
   `requiresCore`) applies.
4. **Target set** — self / allies / all-allies-including-self / the target / caster-slot overwrite
   (same-caster + same-slot + same-stat overwrites, it does not stack).

## Step 2 — write the test RED (`scripts/tests/units/<slug>.test.ts`)

Header comment first: what the kit says, what the fixture is, and **why each assertion discriminates**.
The header carries the evidence — it is read far more often than the code.

Import the shared harness; a spec should be ~20 lines, not ~80 of setup:

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';
```

**The rule that makes a step-3 test different from a step-2 primitive test:**

> The **assertion runs against the SHIPPED override loaded from disk** (unpatched). `withPatchedOverride`
> is only for the _counterfactual_ — the nearest-approximation model the real encoding must beat. A unit
> spec built entirely on a synthetic patch tests the engine, not the kit, and gates nothing.

Patterns that work here:

- **Fixture: `controlComp(<slug>)`** (liter B1 / crown B2 / carry B3 / helm) — bursts actually get CAST. A
  lone Burst III unit makes **ZERO Full Bursts**, so a solo fixture can never exercise a burst-gated line.
  Pass `helm=false` if helm's buffs confound the reading; put the unit in the carry slot so it is focused.
- **Deterministic**: no `seed` ⇒ expected-value pass ⇒ byte-stable totals ⇒ equality assertions are legal.
- **Event log over totals** wherever the claim is structural. `cfg: { onEvent: (e) => events.push(e) }` —
  kinds `shot` / `damage` / `buffApply` / `buffRemove` / `reload` / `burstCast` / `fullBurstStart` /
  `fullBurstEnd`; `damage` carries `srcSlot`, resolved crit/core rates and the full multiplier
  decomposition. Assert _the buff appeared, on these targets, with this value, in this window_ — a total
  can be right for the wrong reason. (Payload gaps are listed in the plan doc §1d; they are additive —
  extend the emit if a spec needs it, via the isolated-worktree flow.)
- **Discriminating assertion, per line.** Not "damage > 0" — the assertion must FAIL under the nearest
  wrong model. Rounds-vs-seconds: assert the round count _beats_ `durationSec` because it survives the
  reload. Normal-attacks-only-vs-generic: assert charge/burst damage is UNMOVED while normals move.
  Self-vs-allies: assert teammates are byte-identical across the ladder.
- **Inertness assertions are load-bearing** — what a line must NOT move is as much of the spec as what it
  moves, and it is what catches a mis-scoped stat.
- **Cost control**: each `runComp` is a full 180s sim. Hoist shared runs to `describe` scope (see
  `duration-shots.test.ts`), keep a file under ~20 runs / ~20s.

Tight loop: `npx vitest run scripts/tests/units/<slug>.test.ts` (or `npm run test:unit:watch`).

**Confirm RED before implementing.** A test that was green before the fix asserted nothing.

## Step 3 — implement to green

- **Override edit** (`src/skills/overrides/<slug>.json`) — attempt it and approve the guard prompt. Minimum
  change that turns the test green; no opportunistic retuning of untested lines in the same pass.
- **Engine primitive missing** → STOP. Isolated worktree (`git worktree add ../nikke-sim-wt-<topic> -b
<topic>`, or `Agent(isolation:"worktree")`), build there, `bash scripts/verify.sh` there,
  `/scientific-method` step 7 review, then merge back. Never edit `src/engine/**` in the shared tree.
- Keep the `it.skip`ped GAP tests skipped with their reason — they are the worklist.

```sh
npx vitest run scripts/tests/units/<slug>.test.ts   # green
npx tsx scripts/validate-overrides.ts <slug>
```

## Step 4 — board A/B (the OUTER loop)

Unit tests pin **faithful**; the board pins **accurate**. Neither substitutes for the other — run both and
report both numbers.

```sh
npx tsx scripts/board-read.ts | grep -i <slug>      # before/after, and the board median
npx tsx scripts/control-regression.ts               # if the unit is in the support core or a control carry
```

Movement is **expected** and is not a failure. Classify it:

- board moves toward 1.0 ⇒ the misencoding was the error; say so.
- board moves away ⇒ **fit-exposure** — the old wrong encoding was absorbing a calibration. Record it as a
  per-unit localization thread; do NOT restore the unfaithful model or shave datamined coefficients.
- graded **full-burst counts** must not change unless the kit line is a burst-generation line — a rotation
  move from a kit fix is a finding to investigate, not to accept silently.

## Step 5 — land

1. **Override prose = current state ONLY.** Rewrite `note`/`caveats` to describe the unit **as modeled
   today**; `unmodeled` gets the verbatim skipped lines. **No history** — no "previously believed inert",
   no "REFUTED on <date>", no superseded-value trail (2026-07-22 owner ruling: retained narration reads as
   a live claim to every future agent and manufactures phantom findings). The WHY goes to DECISIONS.
2. **`docs/DECISIONS.md`** — one entry per ruling made (append-only; date + evidence tier + board delta).
3. **`data/kit-status.json`** — `npx tsx scripts/kit-status.ts --set <slug> ...` / `--finding <slug> "..."`;
   close any reconciliation-backlog / engine-modeling-gaps row this session resolved (and open the new GAP
   rows). Then `npx tsx scripts/kit-status.ts --check`.
4. **`bash scripts/verify.sh`** green (the vitest glob wires the new file in automatically — no verify.sh
   edit). Regenerate snapshots only together with the change they reflect, and only once the movement is
   understood; measured-truth asserts are never updated without a new measurement.
5. **Commit** (freely). **Never push** unless the owner asks.
6. **Hygiene** — tick the unit off the live worklist; if the session opened a new thread, it goes into the
   right doc, not into chat. `/mechanics-doc-upkeep` if the engine changed; `/skill-maintenance` at the end
   if the session taught a reusable lesson.

## Anti-patterns (each has burned this repo)

- Writing the test from the model instead of the kit — it just certifies the current encoding.
- A total-damage assertion where an event assertion was available (right number, wrong reason).
- `durationSec` standing in for "for N round(s)"; a generic stat standing in for a scoped one.
- A solo/enabler-less fixture used to test a burst line (**zero Full Bursts** — recurring owner correction).
- Weakening an assertion, or re-adding the unfaithful encoding, because the board got worse.
- Enacting a cross-unit pattern discovered mid-session (batch-and-stop, hook point 8).
- One reading / n=1 footage used to set a magnitude in a test — that is HYPOTHESIS-strength; it goes to
  open-questions, and enactment is a separate gated pass (`/scientific-method`).

## Verify

```sh
npx vitest run scripts/tests/units/<slug>.test.ts
bash scripts/verify.sh
```

## References

- Plan of record: [docs/handoffs/2026-07-23-tdd-transition-plan.md](../../../docs/handoffs/2026-07-23-tdd-transition-plan.md) (§ step 3; §1d event payloads; step-2 checklist)
- Harness: [scripts/tests/lib/harness.ts](../../../scripts/tests/lib/harness.ts)
- Exemplars: `scripts/tests/engine/duration-shots.test.ts` (round-count discrimination, in-memory patch),
  `block-gates.test.ts` (event-log probing of a synthetic block), `event-log.test.ts` (payload contract)
- Related skills: `/audit-kit` (post-validation sampling), `/kit-parse` (baseline authoring for untuned
  units), `/scientific-method` (any measurement or engine-constant change), `/tuning-priors`
