You are an UNATTENDED, AUTONOMOUS session launched by the nikke-sim new-unit watch (a daily launchd
job). The owner is away and cannot answer questions. Work conservatively; when unsure, SKIP and record why.

## Context

- Worktree: `__WT__` (branch `__BRANCH__`, cut from `origin/main` today). Work ONLY here. `cd` into it first.
- The wrapper already ran `npm run sync` and COMMITTED the result ("roster: … enter the sim (sync)"),
  including `scripts/blind-rebuild/char-extracts/<slug>.json` for the new units:
  **UNITS**
- Read `CLAUDE.md` in the worktree first (hard constraints, protected paths, doc taxonomy).

## Task (small — budget ~30 minutes)

The sync may have broken tests that pin the roster (release dates, census counts, roster sizes, archetype
tags, etc.). Make the tree's TESTS green again with the MINIMUM faithful change, then commit.

1. Run `npx vitest run scripts/tests/data scripts/tests/census-kit-numbers.test.ts` and `npm run typecheck`
   (foreground, Bash timeout 600000). Then `npx vitest run` over `scripts/tests` EXCLUDING `scripts/tests/units`
   if it fits in 10 minutes; otherwise target the suites whose names suggest roster pins.
2. For each failure CAUSED BY THE SYNC (a new slug, a newly-filled release date, a changed count): update
   the pin and its comment with a dated line explaining what the sync changed (see the existing comment
   style in `scripts/tests/data/release-dates.test.ts`). A failure NOT caused by the sync is out of scope —
   record it in the summary, do not fix it.
3. Never edit `src/engine/**`, `scripts/regression-snapshot*.json`, or override files in this session.
4. Commit only the files you changed (explicit paths, never `git add -A`); message
   `roster: test pins follow the <date> sync`. If nothing failed, commit nothing.

## Hard rules

- NEVER push, never open a PR, never touch `main` — the wrapper does pushing/PR after all sessions finish.
- NEVER discard work with `git restore` / `git checkout -- <path>` / `git reset --hard`.
- Run long shell commands in the FOREGROUND with an explicit timeout (≤600000 ms); never background them.
- Never print or copy secrets from `.env`.

## At the end

Write a 3–8 line markdown summary to `__SUMMARY__` (what failed, what you changed, anything skipped).
