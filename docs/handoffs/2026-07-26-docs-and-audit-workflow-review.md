# Docs + agent-audit workflow review — where to cut (owner decision doc)

Written 2026-07-26 by the Kimi session **from context only** — no doc re-reads, per owner
instruction. Everything below is the workflow *as it exists in my memory of this session*
(CLAUDE.md, QWEN.md, AGENTS.md, the hooks, the skill bodies I surveyed, the kit-autonomy
protocol + drivers). Where I mark something "?" I am genuinely unsure — treat those as
verification targets, not claims.

Purpose: one map of the whole documentation/audit apparatus so you can decide what to cut.
Sections: (1) the doc layer as it stands, (2) the maintenance machinery, (3) the kit-autonomy
artifact trail, (4) the duplication/contradiction inventory, (5) the decision menu.

---

## 1. The doc layer as it stands

**Two hygiene classes** (docs/CONVENTIONS.md owns this rule):

- **CURRENT-STATE** — freely rewritten, stale content deleted (capture-first):
  `docs/STATE.md`, `docs/data/*.md` (game-mechanics + damage-calculation SSOT pair),
  `docs/CONVENTIONS.md`, `docs/modeling-priors.md`, `docs/engine-modeling-gaps.md`,
  `docs/VALIDATION-INDEX.md`, `CLAUDE.md`, open `docs/handoffs/*`, open-questions
  **UNANSWERED**, backlog/ledger docs (`control-regression-followups.md`), and the prose
  fields of every override (`note`/`caveats`/`unmodeled`).
- **CHANGELOG** — append-only, `SUPERSEDED (date)` in place, never delete:
  `docs/DECISIONS.md`, open-questions **ANSWERED**, `docs/probe-runs.md`,
  `web/src/patch-notes.json`, `data/sources.json`, the `closed/` archives
  (`docs/handoffs/closed/`, `docs/closed/`).

**Authority order:** STATE.md (landed now) > DECISIONS (settled why) > mechanics pair >
open-questions > handoffs > everything else.

**Root instruction/memory files (one per harness, heavily overlapping):**

- `CLAUDE.md` (654 lines) — "the full handoff": hard constraints, verified facts, build
  state, discipline forcing-functions, conventions, doc taxonomy, authority
  order, **NEXT INCREMENT** (live TODO + autonomous work queue + per-thread pointers with
  long landed-narration inline), tier-0 threads, method recap, DONE-WHEN.
- `QWEN.md` (145 lines) — Qwen's project instructions: stack, commands, kit-autonomy
  gauntlet block, protected paths, conventions, front-end rules, subagent rules, file map.
- `AGENTS.md` (~230 lines) — generated 2026-07-26 by Kimi `/init`, absorbed most of
  CLAUDE.md's durable rules + now carries the "Carried-over memories" section I added.
- `.qwen/.../memory/MEMORY.md` — one pointer line + a frontend-stack memory file.
- `.claude/subagent-non-negotiables.md` — pasted into every subagent prompt.

**Per-unit status stores:** `data/kit-status.json` (declared per-unit provenance SSOT),
override prose fields (current-model-only per the 2026-07-22 ruling), and — in practice —
CLAUDE.md NEXT INCREMENT items, which also carry per-unit state (liter thread, jill re-tune,
helm carry-spread, …).

---

## 2. The maintenance machinery

**Hooks (now wired identically for Claude and Kimi):**

- `stop-doc-drift.sh` (Stop) — if engine/skills/gauge-data changed but the mechanics pair
  didn't, nudge: run `/mechanics-doc-upkeep` (+ DECISIONS if a tradeoff settled).
- `commit-state-hygiene.sh` (PreToolUse, once per session) — on commit, four reconciliation
  duties: (1) prune CLAUDE.md NEXT INCREMENT, (2) close finished handoffs
  (`CLOSED (date)` + mv), (3) update STATE.md if a live flag/default/constant/rotation rule
  changed, (4) re-file resolved questions UNANSWERED→ANSWERED (`A<n> (U<n>)`).
- `pre-pr-patch-notes.sh` (PreToolUse) — on push/PR: run `/patch-notes` first.
- `pre-write-discipline.py` (PreToolUse, routed) — the guard router: slug lint (spawns
  `npx tsx` per eligible write), measured>fudge, whole-vs-shard, prove-it-differently +
  sufficiency, premise gate, full-context gate, measurement≠enactment, batch-and-stop,
  sci-method enactment gate, reuse-before-derive, verdict-verb escalation.

**Mechanical gates inside `verify.sh`:** doc-drift lint (`scripts/doc-drift.ts` — overlaps
the Stop hook by design: nudge vs gate), kit-status structural check, nickname validation,
reload-chunk check, override validation, SG-geometry + engine + control regressions, vitest.

**Skills whose primary job is documentation upkeep:**

- `/mechanics-doc-upkeep` — keep the mechanics pair in sync after engine/data changes.
- `/skill-maintenance` — after any non-trivial change, update the skills themselves.
- `/patch-notes` — DECISIONS → player-facing `patch-notes.json`.
- `/context` — the mechanics context pack with file:line anchors, "keep anchors current
  when code moves" (a standing manual-sync obligation).
- `/tuning-priors` — mines hand-tune history into `docs/modeling-priors.md`.
- `/enikk-audit` — regenerates the enikk doc + `data/enikk-supported.json` in lockstep.

**Skills that produce documentation as a side effect:** `/scientific-method` (decision-log
entries in `docs/handoffs/scientific-method-harness.md`), `/probe-processing` (probe-runs.md
entries + `docs/probe-data/*.json`), `/kit-tdd` and `/kit-autonomy` (see §3),
`/submission-intake`, `/testing-requests`, `/sim-battery`, `/boss-study`.

---

## 3. The kit-autonomy artifact trail (per unit, current form)

One gauntlet run produces or touches, by my count, **~12 artifact locations**:

1. `src/skills/overrides/<slug>.json` (note marker + prose rules)
2. `scripts/tests/units/<slug>.test.ts`
3. `scripts/kit-autonomy/results/<slug>.json` (binding judge verdict)
4. `scripts/kit-autonomy/manual-review/<slug>.md` (owner review doc — largely restates 3)
5. `scripts/kit-autonomy/blind/<slug>.test.ts` + `.test-spec.json`
6. `scripts/kit-autonomy/blind/<slug>.override.json` + `.audit.json`
7. `scripts/kit-autonomy/reviews/<slug>.test-review.json` + `.verify.txt`
8. `scripts/kit-autonomy/cross-family/<slug>/` — packets + result JSONs + REQUEST.md
   (force-committed evidence trail)
9. `data/kit-status.json` (provenance/status flip + evidence + residual)
10. `data/characters.json` (`simSupported` flip)
11. `docs/DECISIONS.md` entry per ruling
12. `.gauntlet-progress-<slug>.txt` + `.<slug>-extract.json` (scratch, deleted post-commit)

Plus the workflow's *description* lives in 8 places: base `scripts/kit-autonomy/SKILL.md`,
`.qwen/skills/kit-autonomy/SKILL.md` (router), `.claude/skills/kit-autonomy/SKILL.md`,
`.agents/skills/kit-autonomy/SKILL.md` (my port), `CROSS-FAMILY-PROTOCOL.md`, the QWEN.md
gauntlet block, `.qwen/agents/kit-gauntlet-driver.md`, and `docs/kit-autonomy-decisions.md`.
**Measured cost of this duplication: changing ONE model routing (S7 → kimi) yesterday
required coordinated edits to 5 files** (and I caught a 6th, the driver def, on a sweep).

---

## 4. Duplication / contradiction inventory

**A. Three root instruction files saying the same thing.** Protected paths, verify gate,
commit-early/never-push, doc authority, exact-slug, evidence tiers each appear in CLAUDE.md,
QWEN.md, and AGENTS.md. They already disagree in details (e.g. QWEN.md's `npm run test`
description vs reality; AGENTS.md's commit trailer is Claude-specific while CLAUDE.md is the
handoff). Three files, three drift rates.

**B. Landed work recorded 3–5 times.** Example from context (SMG cadence flip): CLAUDE.md
NEXT INCREMENT item + work order in `docs/handoffs/closed/` + `docs/STATE.md` SMGRATE row +
`docs/DECISIONS.md` entry + `docs/probe-runs.md` record + `control-regression-followups.md`
tail. The commit-hygiene hook asks for 4 of these reconciliations *per session*; each is a
chance for the copies to diverge. STATE.md was created precisely to be the landed-state
registry, yet NEXT INCREMENT still carries long landed-narration inline (the liter thread
item is ~25 lines of settled history before the actual open follow-up).

**C. Per-unit status in 3 stores.** kit-status.json is declared the per-unit SSOT, but
per-unit state also lives in NEXT INCREMENT pointer items and in override prose. Which one
a session trusts depends on which it read first.

**D. open-questions dual numbering.** Every question is a U-number in UNANSWERED, then
re-filed as `A<n> (U<n>)` in ANSWERED, and *also* referenced from DECISIONS and CLAUDE.md
items ("U34", "A33 (U31)"). The re-filing rule exists because "a resolution recorded only in
DECISIONS leaves the stale question reading as live" — i.e. the dual-store design creates
the very hygiene burden the hook then taxes every commit for.

**E. Same rule in 3 channels.** Doc-drift: Stop hook nudge + verify.sh `doc-drift.ts` gate +
`/mechanics-doc-upkeep` skill + CONVENTIONS.md text. State hygiene: commit hook +
CONVENTIONS.md + CLAUDE.md handoff convention + the "next-increment-state-hygiene memory"
the hook message references. Discipline points: pre-write-discipline.py + CLAUDE.md
forcing-functions section + subagent-non-negotiables.md + scientific-method skill. Each
channel restates in its own words — they *will* drift (the hook messages are the most
recently edited; CLAUDE.md's forcing-functions section still describes the pre-router
8-point checklist the hook replaced — I saw both).

**F. Skill-local change logs + decisions docs + git.** Every skill carries its own change
log; kit-autonomy additionally has `docs/kit-autonomy-decisions.md` (with "§14 red-team
revisions are AUTHORITATIVE") and the protocol file. Git history already is a changelog;
the skill change logs duplicate it in prose, at different granularity.

**G. Evidence-trail maximalism in kit-autonomy.** Per unit: judge result JSON *and* a
manual-review MD restating it; blind outputs kept verbatim *and* a spec JSON summarizing
them; cross-family packets *and* results force-committed; reviews/ *and* results/. The
provenance is also condensed into kit-status.json. For 30 units run so far that's ~300
files whose future readership is close to zero once kit-status.json flipped.

**H. VALIDATION-INDEX vs STATE.md §7 vs probe-runs.** "Where ground truth lives" is indexed
in VALIDATION-INDEX.md, instruments are registered in STATE.md §7, and measurements are
logged in probe-runs.md — three overlapping catalogs of the same corpus.

**I. Qwen-side memory.** `.qwen` MEMORY.md duplicates docs/frontend-conventions.md's
pointer (harmless, tiny, but a 4th instruction layer).

---

## 5. Decision menu

Each item: what it is, the cut options, my recommendation. Nothing here is enacted — this
is your call. I'd suggest deciding §5.1 first; several later items get cheaper once the
instruction-file question is settled.

### 5.1 One instruction file, or one per harness?

- **Option A (max cut):** one canonical file (keep CLAUDE.md as the handoff since it has the
  most content), regenerate QWEN.md/AGENTS.md as thin shims that say "read CLAUDE.md +
  <harness-specific block>". Harness-specific content shrinks to what genuinely differs
  (Qwen: frontend focus + dispatch bridges; Kimi: nothing yet).
- **Option B:** keep three files but carve out a shared `docs/agent-rules.md` that all three
  reference for the common rules (protected paths, verify, doc authority). Files shrink to
  harness-specifics + a pointer.
- **Option C:** status quo.
- **My rec:** A or B. The files are already contradicting each other in details, and every
  rule edit currently costs 3+ coordinated edits (5 for the S7 re-route).

### 5.2 NEXT INCREMENT's landed-narration

- **Option A:** enforce the section's own stated convention — pointers only, one line each;
  landed state moves to STATE.md/DECISIONS at landing time, not at prune time. Would shrink
  CLAUDE.md from ~650 to ~300 lines.
- **Option B:** move NEXT INCREMENT out of CLAUDE.md entirely into `docs/handoffs/QUEUE.md`;
  CLAUDE.md keeps only durable rules + verified facts.
- **My rec:** B, and it pairs with 5.1 — the queue is session state, not instruction.

### 5.3 open-questions dual store

- **Option A:** single numbering, questions closed *in place* (status flip U→A, answer
  inline), DECISIONS references the U-number instead of minting an A-number. Kills the
  re-filing duty (hook item 4) entirely.
- **Option B:** keep dual numbering (it does preserve "when was it answered" ordering).
- **My rec:** A. The A-number buys chronological ordering in ANSWERED; a date stamp buys the
  same thing without a second identity.

### 5.4 Hook nudges vs verify.sh gates

- The doc-drift pair (Stop hook + `doc-drift.ts` in verify.sh) is *deliberately* redundant
  (nudge early, gate at the end). That's defensible. The commit-state-hygiene hook is the
  expensive one: 4 duties per session, all prose-enforced.
- **Option A:** if 5.2B + 5.3A land, duties (1) and (4) disappear mechanically; slim the hook
  to the STATE.md + handoff-closure reminders or delete it and let verify.sh's doc-drift
  gate carry the mechanical half.
- **My rec:** decide after 5.2/5.3; the hook should shrink as a *consequence*, not first.

### 5.5 kit-autonomy artifact count (~12/unit)

Cut candidates, cheapest first:
- **manual-review/<slug>.md** — restates results/<slug>.json for owner review. If you're not
  actually reading them (30 exist; have you opened any since the batches?), drop the file and
  let kit-status.json's findings + the results JSON be the review surface. **My rec: cut or
  make opt-in for NO-GO units only.**
- **cross-family packet archival** (force-committed) — the *results* are the evidence; the
  packets are regenerable from the templates + prose. **My rec: stop force-committing
  packets, keep only result JSONs.** (? verify: the driver def says packets+results are both
  committed as evidence trail — decision is whether packet content has evidentiary value.)
- **blind/ verbatim files** — keep (they're the actual blindness evidence, and the typecheck
  exclude already handles them).
- **reviews/ vs results/** — fine as-is; cheap.
- **kit-status flip + DECISIONS entry + override note marker** — all three carry provenance.
  Could drop the DECISIONS entry for certify-only runs (no ruling was made — nothing to
  decide). **My rec: DECISIONS entry only when an actual ruling/tradeoff occurred.**

### 5.6 The workflow's 8-place description

- **Option A:** base SKILL.md is the only procedure; the qwen/claude/agents skill copies
  shrink to a 20-line router (models + dispatch commands) that *defers to* the base file.
  Protocol file keeps only the canonical-names table. Delete the `.agents` kit-autonomy copy
  I made (regenerate as shim).
- **My rec:** A. Yesterday's 5-file edit for one routing change is the proof.

### 5.7 Skill change logs

- **Option A:** stop writing them; git log is the record. **Option B:** keep only for
  behavioral changes an agent must know mid-run (the "DISPATCH PATIENCE" class).
- **My rec:** B — some entries (patience, non-interactive-shell) are operational knowledge,
  not history; move *those* into the skill body proper and drop the dated log.

### 5.8 VALIDATION-INDEX / STATE §7 / probe-runs

- **My rec:** keep all three but declare the division of labor explicitly (index = where
  truth lives; STATE §7 = what instruments exist; probe-runs = chronological log). This one
  is more "document the boundary" than cut. (? verify how much they currently overlap.)

### 5.9 The two hygiene classes themselves

The CHANGELOG/CURRENT-STATE split is the *one* piece of the apparatus I'd argue is earning
its keep — it's what makes "delete stale content" vs "never delete" decidable. The problem
isn't the taxonomy; it's that too many stores exist within each class. Cut stores, keep the
taxonomy.

---

## Suggested cut order (if you want a starting point)

1. 5.1 + 5.2 (instruction files + NEXT INCREMENT) — biggest contradiction source, biggest
   line-count win.
2. 5.6 (workflow description dedup) — makes every future routing change a 1-file edit.
3. 5.3 (open-questions single-numbering) — deletes hook duty 4.
4. 5.5 (artifact count) — cuts ongoing per-unit cost; decide manual-review first.
5. 5.4 — shrink the commit hook to whatever duties survive 1–3.
