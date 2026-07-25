Run a batch of 10 kit-autonomy gauntlets on an isolated worktree. You are a THIN
ORCHESTRATOR — you perform NO gauntlet stage yourself; you spawn one kit-gauntlet-driver
sub-agent per unit and read each outcome from its artifacts. Keep your context minimal.

The gauntlet mechanics (lean recipe, instrumentation, subprocess kit-extract, dispatch
patience, S7 judge-packet assembly, commit hygiene, model routing, same-model recovery,
skip-and-flag) live in the kit-gauntlet-driver agent definition + the kit-autonomy skill's
"Batch mode" section. Do NOT restate them in spawn prompts, and do NOT have the sub-agent
read the full skill/protocol files (that causes stalls).

SETUP

1. git fetch origin.
2. Create an isolated worktree on a NEW branch (kit-autonomy-batch-<YYYY-MM-DD>) from the
   latest origin/main — a clean checkout; do NOT carry in uncommitted main-tree work.
   Record its absolute path; all work happens inside it.
3. Sanity-check: in the worktree `git status` is clean and `git log -1` matches origin/main.
   Report the worktree path + branch.

PER-UNIT LOOP 4. Next slug: in <worktree>/data/kit-status.json walk `units` in file order; take the first
whose kitParse.provenance != "gauntlet" and not already done this run. 5. Spawn ONE fresh kit-gauntlet-driver sub-agent in the FOREGROUND, working_dir pinned to the
worktree (NOT isolation — units share the worktree so provenance flips + commits accumulate
on the one branch). Task: "Run the full kit-autonomy gauntlet on <slug> (<Full Name> —
<weapon/class/element/burst>; for a variant, name its base counterpart). Follow your agent
definition; one commit; return the tight RESULT line." Prepend a CONDENSED non-negotiables
header (exact slug · measured>fudge · whole-picture · prove-it-differently · tread-lightly ·
no `ignored` blocks · structured return). Do NOT override the skill's canonical model
routing. Strictly sequential — one at a time. 6. The driver returns "(subagent produced no model-visible output)" — BENIGN. Read the outcome
from <worktree>/scripts/kit-autonomy/results/<slug>.json (verdict/faithfulness),
.gauntlet-progress-<slug>.txt, and `git log origin/main..HEAD`. Report one line:
<slug> — <verdict> — faithfulness <x> — <sha>. Then step 4.

BOUND 7. Exactly 10 units. Authoritative count = `git rev-list --count origin/main..HEAD` (one commit
per unit). Stop at 10. Restart-safe: re-derive from this count + the provenance flips.

SAFETY / STOP

- Writes to src/skills/overrides/**, data/kit-status.json, scripts/tests/units/** are the
  intended owner-authorized output (notwithstanding protected-paths); they land only here.
- Do NOT merge, push, or open a PR. Owner reviews via manual-review docs and merges.
- A SLOW opus dispatch is NOT a failure (2–5 min; the driver waits per the skill's
  dispatch-patience rule). HALT and report (don't skip/guess) only on: a genuine NO-GO; a
  dispatch genuinely unavailable after patient retries; or a unit needing human input. Leave
  completed units committed, the problem unit uncommitted.
- A "GO (same-model only)" is NOT a halt — it's committed and upgradeable later via the skill's
  recovery (opus retry + amend). Surface it and continue (or upgrade), don't stop.
- If fewer than 10 eligible units remain, stop when exhausted and say how many completed.

DONE 8. On completion (10 / halted / exhausted): summary table slug | verdict | faithfulness | commit.
Restate branch + worktree path.
