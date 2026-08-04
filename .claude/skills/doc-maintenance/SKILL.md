---
name: doc-maintenance
description: The doc-state reconciliation pass — put every fact in the one doc that owns it, close what finished, and delete what went stale. Use before a PR or push to `main` (a PreToolUse hook nudges here), when a session's work is done and its findings are still only in chat, when a handoff or plan doc is finished, or any time you are unsure WHICH doc a fact belongs in. Distinct from `/skill-maintenance` (which lands a repeatable LESSON in a skill/test) and `/mechanics-doc-upkeep` (which syncs the two mechanics source-of-truth docs to the engine).
---

# Doc maintenance — every fact in the doc that owns it

The normative definitions live in `docs/CONVENTIONS.md` → "Doc hygiene" and `CLAUDE.md` → "Doc
taxonomy" / "Docs authority order". This skill is the **procedure**: what to do, in what order.
Where a full membership list matters, it points there rather than keeping a second copy that drifts.

## The one rule everything else follows

**Every doc is exactly one CLASS, and hygiene attaches to the class, not the doc.**

| Class             | Rule                                                                                                                                         | Members (short form)                                                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CHANGELOG**     | Append-only, immutable. Outdated content is marked `SUPERSEDED (date) — disregard` **in place**, never deleted — it is the provenance trail. | `docs/DECISIONS.md`, `docs/answered-questions.md`, `docs/probe-runs.md`, `web/src/patch-notes.json` (prepend-only), `data/sources.json`, the `closed/` archives                                                                     |
| **CURRENT-STATE** | Freely rewritten. Stale content is **DELETED**, not marked. Describes the world as it is TODAY, with no history narration.                   | `docs/STATE.md`, `docs/data/*.md`, `docs/CONVENTIONS.md`, `CLAUDE.md`, open `docs/handoffs/*` (incl. `QUEUE.md`), `docs/open-questions.md` UNANSWERED, the backlog/ledger docs, **and override `note`/`caveats`/`unmodeled` prose** |

**Capture-first**, the one rule that makes deletion safe: before deleting a still-true-but-resolved
block from a current-state doc, confirm the fact is already in a changelog doc. If not, append it
there FIRST, then delete. Deletion then loses nothing.

## Step 1 — route each new fact to its owning doc

Ask of every finding the session produced: which ONE doc owns this?

| The fact is…                                                                     | It goes to                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| What the sim does right now (flag, constant, rotation rule, geometry, primitive) | `docs/STATE.md` — the landed-state registry                               |
| A settled WHY: tradeoff, rejected alternative, owner ruling                      | `docs/DECISIONS.md`, with its evidence tier and where the proof lives     |
| A genuinely unresolved research thread                                           | `docs/open-questions.md` as UNANSWERED, with its U-number                 |
| An actionable open TODO                                                          | `docs/handoffs/QUEUE.md` — a SHORT pointer into its detail doc            |
| A measurement                                                                    | `docs/probe-runs.md`                                                      |
| Game mechanics or the damage math                                                | the SSOT pair — run `/mechanics-doc-upkeep`, do not hand-edit ad hoc      |
| Player-visible change                                                            | `web/src/patch-notes.json` — run `/patch-notes` (owner approval required) |
| A repeatable procedure or gotcha                                                 | a skill body — run `/skill-maintenance`                                   |

A ruling that changed LANDED state gets **two** entries, not one: the WHY in DECISIONS (append) and
the WHAT in STATE.md (rewrite). They are different classes and neither substitutes for the other.

## Step 2 — QUEUE.md carries open items ONLY

`docs/handoffs/QUEUE.md` is a to-do, not a report. For each item:

- **It landed** → DELETE it. Keep only its still-open follow-up clause, promoted to its own bullet.
  Do not leave "DONE (date)" / "LANDED" / "COMPLETE" narration — that is the single most common
  drift in this file, and it buries the items that are actually open.
- **A just-opened PR is not itself a new queue item.** This step is nudged before a PR/push
  specifically so a landed item's QUEUE.md entry gets DELETED because the PR now carries the work
  forward — not so a fresh entry gets FILED announcing "PR #N open, awaiting review/merge." GitHub
  already tracks open PRs; QUEUE.md tracks work a future session needs to plan around, and "wait for
  the owner to merge" is not that. If the only open item left is review/merge itself, delete the
  entry outright — do not replace a stale "landed, needs review" entry with a fresh one for your own
  branch that says the same thing. Only keep or add an entry here if it holds a genuine unresolved
  decision or follow-up that survives the PR merging either way (e.g. a fork-in-the-road the owner
  still has to pick, or a blast-radius consequence worth flagging) — never "PR pending" as the sole
  content.
- **It is still open** → keep it SHORT: a pointer into the detail doc, not the detail itself.
- **Its claims are load-bearing** → re-verify before trusting them. Status claims in this file
  drift: resolutions land in a commit or an override note and never get re-filed here. Check the
  field form (`grep`), `git log -S`, and the unit's own note before planning on any of them.

## Step 3 — close what finished (this UNTRACKS it)

A finished handoff or plan doc left in `docs/handoffs/` reads as live work to every future session.

```sh
# 1. mark it: a CLOSED (date) block at the top — what landed, what moved to QUEUE.md
# 2. untrack, THEN move — in this order:
git rm --cached docs/handoffs/<doc>.md
mv docs/handoffs/<doc>.md docs/handoffs/closed/
```

`docs/handoffs/closed/` and `docs/closed/` are **gitignored on purpose**: a closed doc survives on
disk for a human and LEAVES the repo. Consequences worth knowing before you fight them:

- `git mv` cannot do this.
- Staging a new path under either archive **aborts the pre-commit hook** — `git add` refuses ignored
  paths, and lint-staged's own `git add` then fails the commit. That means you skipped
  `git rm --cached`. It is not a broken hook, and never a reason for `--no-verify`.

Two checks before it goes:

- **Residual open items move to `QUEUE.md` first.** The doc is closable when nothing plans from it.
- **`grep -rn "<doc-name>" docs/ CLAUDE.md`** — a changelog-class citation (above all
  `docs/DECISIONS.md`) pointing at a file that just left the repo is a dangling pointer. Either keep
  that one tracked or reword the citation first, and say which you did.

**Never archive a living/perpetual log** even if it is momentarily quiet — `DECISIONS.md`,
`open-questions.md`, `CONVENTIONS.md`, `probe-runs.md`, `modeling-priors.md` are append-only or
regenerable by design. A doc is archivable only when its ENTIRE content is resolved; a mixed
old-done + new-open doc stays put.

## Step 4 — resolved questions move, they do not get re-numbered

A question keeps its U-number for life. Resolving one = **moving** its entry from
`docs/open-questions.md` to `docs/answered-questions.md` with the resolution and date inline. No new
A-number is minted. `scripts/doc-drift.ts` lints for a resolved question still filed under
UNANSWERED, so this one is gate-enforced rather than trusted.

## Step 5 — delete stale narration from current-state prose

Especially **override prose** (`src/skills/overrides/*.json` `note` / `caveats` / `unmodeled`), which
is current-state class and describes the unit **as modeled today, nothing else**. Delete on sight:
"the old premise was X, now STALE", "previously believed inert", "REFUTED/reverted on <date>",
superseded-value trails. Capture-first — the WHY belongs in DECISIONS.

Why this matters more than it looks: retained superseded narration reads as a LIVE claim to every
future agent and to any grep scanning for open gaps. It manufactures phantom findings, and each one
costs a verification pass to dismiss.

## Step 6 — audience and location

- **Human-facing** (`docs/data/*`, open-questions, answered-questions, probe-runs, DECISIONS,
  CONVENTIONS): **no invented abbreviations** — write names out. Widely-known game terms (B1, MG,
  Full Burst) are fine. These may be published to the community.
- **AI-facing** (`docs/handoffs/*`, override notes, scratch): any shorthand.
- **Player-facing UI/card copy states facts, not authoring decisions.** It never explains what it
  deliberately omits or why. If a detail was left out on purpose, the copy is simply silent about
  it. A negative instruction in a prompt ("don't mention X") is a constraint on the ACTION — never
  source material for the text itself.
- **Location:** session scratch → never committed; durable knowledge → committed WITH the change it
  describes; community-bound → reviewed before publishing.

## Step 7 — check the derived index actually tracks the code

`docs/STATE.md` is authority slot 1 but it is a **derived** index. On conflict, live engine code and
the latest DECISIONS entry win and **STATE.md is the bug** — fix it there. Verify a claim against the
tree before planning on it, and re-derive load-bearing constants from the CURRENT on-disk code if the
tree may have advanced under you mid-session.

## Verify

```sh
bash scripts/verify.sh
```

`scripts/doc-drift.ts` runs inside it and gates the mechanically-checkable half: false members and
stale `N units` counts in `docs/STATE.md` §5, the primitive census in `docs/engine-modeling-gaps.md`,
and resolved-but-still-UNANSWERED questions. A green gate does NOT mean the prose is clean — the
routing, closing and stale-narration steps above are judgement, not lint.
