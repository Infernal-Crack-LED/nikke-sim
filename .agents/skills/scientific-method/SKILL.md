---
name: scientific-method
description: The empirical-test gate for the NIKKE sim — premise gate → Fable pre-op plan approval → work → driver review → BLIND Fable post-op → 2-of-2 landing rule → IMPLEMENT / LOG / REJECT → PR-style review of the landed code. Invoke whenever the owner says "use the scientific method + fable pre-op" (or "pre-op this", "get Fable to approve the plan"), and ALWAYS before any empirical test against real in-game data, any engine constant/default change, any measurement-driven override retune, or anything that would stamp a verdict or overturn a DECISIONS entry. This skill is the procedure of record; it drives four durable agents (premise-verifier, preop-judge, postop-judge, implementation-reviewer) so every run is identical.
---

# scientific-method — the LLM-as-judge gate for empirical change

Governs every empirical test and every change made against real data. It exists to stop ONE failure:
**fitting to data** — tuning an unobserved value until a number matches, then calling the match
evidence. See [[accuracy-to-observed-mechanics-invariant]].

Role assignment: the **driver runs on Opus** (primary judge), **Fable is the blind judge** at both
pre-op and post-op. (Inverse of the retired experiment-harness era, where the driver was Fable.)

The judge/verifier/reviewer roles are durable agent definitions, not prose to re-improvise:

| Step | Agent | Model | Blind to |
|---|---|---|---|
| 0 premise gate | `premise-verifier` | opus | the driver's belief / the expected answer |
| 1 pre-op | `preop-judge` | fable | — (judges the plan openly) |
| 4 post-op | `postop-judge` | fable | the driver's verdict + reasoning |
| 7 code review | `implementation-reviewer` | opus | — (**sighted, PR-style**; gets the accepted claim) |

## When to use
- The owner says **"use the scientific method + fable pre-op"** — that phrase means: run this skill.
- Any new empirical test against real in-game data (footage, damage screenshots, band reads).
- Before changing an engine constant or default, or landing a measurement-driven override retune.
- Before stamping VALIDATED / REFUTED / SUPERSEDED, or overturning a `docs/DECISIONS.md` entry.
- When the P5 discipline-hook guard fires on a plan/measurement/verdict write or agent spawn.

**Not** for: reading a board, drafting findings-only audits (`/audit-kit`), doc upkeep, or mechanical
probe scaffolding (`/probe-processing`). Findings-only work has no landing to gate.

### ⚖ NOT for tooling / instrument validation — use the CHEAP LANE (2026-07-25)

This skill gates values that feed the **damage model**. It does **not** gate scripts, readers, OCR/VLM
pipelines, test harnesses, generators, or web code — those have no board value to fit, so the
fitting-to-data failure this skill exists to stop cannot occur. Running the 7-step pipeline on them is
pure cost. **The trigger that caused this carve-out:** on 2026-07-24 a review of the local VLM/OCR reader
was read as "an empirical test against real in-game data" and consumed ~5 hours / ~6% of a weekly quota
re-deriving ground truth by hand — for a labeled set the regression harness already held.

**CHEAP LANE — when a labeled ground-truth set already exists in-repo:**

1. Find it (`scripts/tests/**` vitest pins, the regression snapshot, `docs/probe-data/*.json`,
   `docs/probe-runs.md`, `data/*.json`).
2. Run the tool/script over it.
3. Report the score — confusion matrix, per-field accuracy, or pass/fail counts — plus every disagreement.
4. **Done.** One agent, no premise gate, no pre-op, no judges, no 2-of-2.

That is a genuine method-diverse check: the labels were produced independently of the reader under test,
which is exactly the property "prove it differently" is asking for. It is **not** a weaker substitute for
the pipeline — for tooling it is the *correct* instrument, and the pipeline is the wrong one.

**No labeled set exists?** Say so explicitly and state the cost of building one **before** starting. Then
build the fixture (cheap, reusable, committed) rather than doing a one-off hand derivation that leaves
nothing behind. Escalate to the full pipeline only if the tool's output will itself set a damage-model
constant — and then the gate is on *that value*, not on the tool.

## Non-negotiables
Prepend `.claude/subagent-non-negotiables.md` to EVERY subagent prompt below — including the work
subagent. **Blindness is load-bearing**: the value of gate #2 is that it is uncorrelated with the
driver, and one pasted sentence of your reasoning destroys it. REJECT is cheap; a wrong ACCEPT is not.

---

## Step 0 — PREMISE GATE (verify what the plan RESTS ON, before you plan)

A plan is only as sound as its premises, and premise drift is the driver's most dangerous failure mode:
**both documented breaks in this project's history were premises, not plans** (the `snow-white` ↔
`snow-white-heavy-arms` conflation; the unverified "SG bands are hit-rate-contaminated" premise).

List the plan's **load-bearing premises** — anything it TREATS AS GIVEN:
- **anchor identity** — "unit X is the control"; "X and Y are the same/different unit" (exact slug);
- **basis cleanliness** — "this reading is hit-rate-clean / partless-boss / same-recording / not
  confounded by Z";
- **ground-truth value** — "the measured term is N"; "core maxes at 7"; "band M is the near control";
- **prior-result reuse** — "we already established P", pulled from session memory rather than a file.

For EACH, spawn `Agent(subagent_type: "premise-verifier")` — one per premise, in parallel. The packet
is **the premise as a neutral QUESTION + which primary sources to consult. NEVER your belief, never the
expected answer.** It returns CONFIRM / REFUTE / CANNOT-VERIFY + a cited primary source + its method.

- **CONFIRM** → the plan may rest on it.
- **REFUTE / CANNOT-VERIFY** → it is an UNVERIFIED HYPOTHESIS. Fix it first, or fold it INTO the plan
  as something the test must establish. **No plan proceeds on an unverified load-bearing premise.**
- A **SCOPE CORRECTION** (true only in a narrower form) rewrites the premise to the narrow form — this
  is the most common useful outcome, and it is not a CONFIRM.

*Cheapness gate:* load-bearing premises only, not every decision. One already CONFIRMed from a file
this session and not mutated since need not be re-probed. This is files-as-truth: a fresh agent
reloading from disk beats the driver's possibly-drifted memory — **empty context ≠ clean context.**

## Step 1 — PRE-OP (Fable approves the PLAN)

Write the plan: **H1**, **H0/alternatives** (name the real rivals — confound, compensating error
elsewhere, per-unit quirk posing as a class law), **METHOD** (configs via `scopeLockCfg` /
`scripts/sim/<element>.ts` — never hand-rolled; screen numbers named + anchored),
**PREDICTIONS including a DISCRIMINATING one** (separates H1 from the confounds — "the number matches"
is not discriminating), **CONTROLS** (and how you know the control is actually controlled),
**pre-committed DECISION RULE** with a falsification clause.

Then invoke the `context` skill and paste the sections the plan touches (with file:line anchors) —
this is what lets the judge assess METHOD without re-reading the repo. Spawn
`Agent(subagent_type: "preop-judge")` with: [context sections] + [the plan].

Returns APPROVED / APPROVED-WITH-REVISIONS / REJECTED. **No approval, no run.** Execute every revision
and resubmit. **Keep the exact context + plan packet you sent — the post-op judge gets the SAME
context**, plus the pre-op judge's "what this plan CANNOT establish" line.

## Step 2 — WORK (a subagent runs the approved plan)

A work subagent executes the approved plan and returns a **judge-ready deliverable**: raw data,
measurements, scorecards + its conclusion, with **NO verdicts and NO driver opinion baked in**. Write
it to be handed to a blind judge verbatim. The work subagent gets the reading list + the specific
approved plan — never the judge's framing, never your expectations.

## Step 3 — DRIVER REVIEW (gate #1 — you must AGREE)

Critically review the deliverable: did it follow the approved method? does the data support the
conclusion, versus a fit, a confound, or a misread (anchor screen numbers per `/probe-processing`)?

**If you do NOT agree → send back to the work subagent, or REJECT here. Do NOT spawn the post-op
panel.** A wrong reject is cheap and recoverable; a wrong accept is not. The panel gates ACCEPTs only.

## Step 4 — POST-OP PANEL (gate #2 — the BLIND Fable judge)

Spawn `Agent(subagent_type: "postop-judge")` with **exactly**: [the SAME context the pre-op judge got]
+ [the work subagent's judge-ready deliverable]. **NEVER inject your approval, reasoning, or verdict.**
It returns its own ACCEPT / REJECT / INCONCLUSIVE + confidence, scored on the Q1–Q4 rubric it carries.

## Step 5 — 2-OF-2 LANDING RULE

You (primary judge) and Fable (blind judge) each independently return ACCEPT / REJECT / INCONCLUSIVE +
a confidence. Score yourself on the same Q1–Q4 rubric the `postop-judge` uses — write your verdict
BEFORE reading Fable's return.

- **Both ACCEPT** → judge-approved; proceed to the decision.
- **Any disagreement / REJECT / unresolved INCONCLUSIVE** → NOT judge-approved. Log BOTH rationales.
  A principled split on the LANDING (rather than the verdict) is the designed escalation path to the
  owner — surface it, don't resolve it yourself.

Rubric hard rules: measured truths are constraints, not scores; improvement sourced from UNPREDICTED
units is a FIT, not a confirmation; prefer the more mechanistic story with fewer free parameters; a
change re-litigating a DECISIONS entry needs same-tier new evidence or it is dead on arrival.

## Step 6 — DECISION: IMPLEMENT / LOG / REJECT

- **IMPLEMENT** — requires **2-of-2 ACCEPT + both HIGH confidence**, no pending Q3 control-team gate,
  no open one-character (Q4) question. Then: implement properly → `npx tsx scripts/regression.ts
  --update` (only together with the change) → docs via `/mechanics-doc-upkeep` → a `docs/DECISIONS.md`
  entry → a `docs/probe-runs.md` line if a measurement was consumed → `bash scripts/verify.sh` green →
  **step 7, the implementation review, before it merges back.** Engine edits happen on an **isolated
  worktree**, never the shared main tree (CLAUDE.md constraint 8) — which is also what scopes the diff
  step 7 reviews.
- **LOG** — 2-of-2 ACCEPT but either judge is below HIGH, OR control-team validation is pending (Q3),
  OR it is a plausible one-character quirk (Q4) not hard-proven. Record as **approved-by-judges + an
  owner action item** (decision log + `docs/DECISIONS.md` pending, or `docs/handoffs/QUEUE.md`).
  **Do NOT touch the engine.**
- **REJECT** — not 2-of-2 ACCEPT. Log the rationale so it is not re-run blind. No engine change.

**Append every outcome** (IMPLEMENT / LOG / REJECT + both confidences + the harness lesson) to the
decision log in `docs/handoffs/scientific-method-harness.md`. That log is CHANGELOG-class: append-only,
never rewritten.

## Step 7 — IMPLEMENTATION REVIEW (IMPLEMENT decisions only)

**A PR review of code that already exists — NOT a gate on whether it may be written.** Steps 1–5 judged
the idea; they could not judge the code, because when they ran there was none. Run this after the
change is written and `verify.sh` is green on the isolated worktree, **before it merges back**.

Spawn `Agent(subagent_type: "implementation-reviewer")` — sighted, PR-style. Packet:
1. **The accepted claim in the JUDGES' words** — the `postop-judge`'s "THE CLAIM YOU ARE ACCEPTING" +
   what it STRUCK + its reservations. This is the PR description. Do NOT substitute your own summary
   of what you built; the review must anchor to what was approved, not to what you believe you
   approved. (The post-op agent already returns exactly these fields — paste them.)
2. **The diff** — `git diff <base>` on the worktree.
3. **The snapshot delta** — which graded units moved and by how much, alongside the **pre-registered
   predicted movers** from the approved plan.
4. The relevant `context`-skill sections.

It returns ranked findings (BLOCKER / FIX / FOLLOW-UP / NOTE) plus two always-present sections:
**UNEXERCISED SCOPE** (what the diff can affect that no graded comp exercises — the blind spot the
board diff structurally cannot see) and **DELTA RECONCILIATION** (moved-but-unpredicted = a FIT signal;
predicted-but-didn't-move = a failed prediction).

Resolve BLOCKER and FIX before merge-back; file FOLLOW-UPs. If a BLOCKER shows the code implements
something the post-op judge STRUCK, or refits a measured constant, the change does not merge — that is
not a new verdict, just the accepted claim being enforced.

**Why this step exists (the residuals the earlier gates leave):** the snapshot is a real guard — it
hard-fails on any graded per-unit total drifting >0.1% and `--update` is deliberate, not automatic. But
it sees only the graded comps, so a board-SILENT error ships clean; and it reports outcomes, not
mechanisms, so a value in the wrong bucket moves the right units in the right direction and reads as
success. Both are diff-reading problems, not numerical ones.

---

## Confidence rubric (both judges score independently)
Q1 provability from HARD DATA · Q2 math naturalness (no free knobs) · Q3 control-team validatability
(**PENDING — not yet calibrated → caps at LOG**) · Q4 one-character-at-board-cost (if yes, loop to Q1).
HIGH = Q1 strong + Q2 natural + Q4 clean, Q3 not gating. MEDIUM = any one partial/bounded/pending.
LOW = Q2 fitted via unbacked assumptions, or Q4 one-char fit without Q1 backing — **a LOW ACCEPT should
not exist.** Full wording lives in `.claude/agents/postop-judge.md` (the judge's own copy is canonical;
keep this summary in sync with it). **HIGH+HIGH → Implement; anything less → Log.**

## Gotchas
- **Contaminating the post-op packet** voids gate #2 entirely. Build the post-op prompt from the SAVED
  pre-op packet + the deliverable — never by editing down your own analysis.
- **A control asserted but not measured is a false premise.** The "near landing is a universal control"
  premise broke this way; control the basis via quantization-step / popup pinning and treat the control
  value as a MEASUREMENT.
- **Single-anchor clocks are not acceptable** for band windows — game-clock-vs-video drift has been
  found both uniform (2.07%) and non-constant on real reads.
- **A falsification clause must distinguish "the effect is absent" from "the basis is broken."**
  Conflating them has fired a STOP clause on a premise that was affirmatively disproven.
- **Compensating errors:** interacting timing/gauge fixes must be measured as a full timeline and landed
  together, each ENV-gated default-OFF until then.
- **Sub-±3% UNIFORM offsets across multiple units are a systematic, not noise** — a "dismissed as noise"
  residual was later the +1.63% gear-tier signal.

## Verify
```sh
bash scripts/verify.sh          # only on an IMPLEMENT decision (with the snapshot regen)
```
LOG and REJECT decisions touch no code — their deliverable is the appended decision-log entry.
