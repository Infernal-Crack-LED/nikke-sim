Run a batch of 10 kit-autonomy gauntlets on an isolated worktree, orchestrating one
foreground sub-agent per unit. You are a thin orchestrator — do NOT perform any
gauntlet stages yourself; keep your own context minimal.

SETUP

1. git fetch origin.
2. Create an isolated git worktree on a NEW branch based on the latest origin/main
   (branch: kit-autonomy-batch-2026-07-24). It must be a clean checkout of remote
   main — do NOT carry in the uncommitted ark-ranger-black work from the main tree.
   Record its absolute path; all subsequent work happens inside it.
3. Sanity-check: in the worktree, `git status` is clean and `git log -1` matches
   origin/main. Report the worktree path and branch name to me.

PER-UNIT LOOP 4. Read .claude/subagent-non-negotiables.md once and prepend its rules to every
sub-agent prompt. 5. Pick the next slug: read <worktree>/data/kit-status.json, walk the `units` object
in file order from the top, and take the first unit whose
kitParse.provenance != "gauntlet" and that isn't already completed this run. 6. Spawn ONE fresh general-purpose sub-agent in the FOREGROUND with its working_dir
pinned to the worktree (do NOT use isolation — every unit shares this one worktree
so provenance flips and commits accumulate on the single branch). Its task:

- Run the full kit-autonomy gauntlet on <slug>: drive S0–S4 and S8–S9 yourself
  following .qwen/skills/kit-autonomy/SKILL.md and the base protocol
  scripts/kit-autonomy/SKILL.md; dispatch the blind roles via
  scripts/kit-autonomy/dispatch-claude.sh (S2b → claude-fable-5;
  S5/S6/S7 → claude-opus-4-8).
- Produce all artifacts: override src/skills/overrides/<slug>.json, results under
  scripts/kit-autonomy/..., the S9 manual-review doc
  scripts/kit-autonomy/manual-review/<slug>.md, and unit test
  scripts/tests/units/<slug>.test.ts.
- Flip kitParse.provenance to "gauntlet" in data/kit-status.json (plus the status
  fields the gauntlet sets).
- Run the gauntlet's verification (grading, npm run typecheck, the unit test) and
  capture the verdict (GO/NO-GO, faithfulness).
- Make EXACTLY ONE commit on the branch with all of the above.
- Return a TIGHT structured summary only: slug · verdict (GO/NO-GO) · faithfulness
  · commit sha · flags. No prose.

7. When it returns, report one line to me (<slug> — <verdict> — faithfulness <x> —
   <sha>), then go to step 5 for the next unit. Strictly sequential, one at a time.

BOUND 8. Process exactly 10 units this run. Authoritative count =
`git rev-list --count origin/main..HEAD` in the worktree (one commit per completed
unit, so this equals units done). Stop at 10. Restart-safe: if resumed, re-derive
progress from this count and the provenance flips so you never exceed 10.

SAFETY / STOP

- Writes to src/skills/overrides/**, data/kit-status.json, and scripts/tests/units/**
  are the intended, owner-authorized output of this task (the gauntlet's purpose),
  notwithstanding the protected-paths note. They land only on this isolated branch.
- Do NOT merge to main, push, or open a PR. I review the branch via the manual-review
  docs and merge manually.
- HALT and report (do not skip, continue, or guess) if a unit returns NO-GO, the
  gauntlet or a Claude dispatch fails, or a unit needs human input. Leave completed
  units committed and the problem unit uncommitted.
- If fewer than 10 eligible units remain, stop when exhausted and say how many
  completed.

DONE 9. On completion (10 done, halted, or exhausted), give a summary table:
slug | verdict | faithfulness | commit. Restate the branch name and worktree path.
