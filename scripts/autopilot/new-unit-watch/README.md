# New-unit watch (daily launchd job)

Turns a NIKKE release into a reviewable PR without anyone starting a session.

Bakery-bot's daily sync (Railway, node-cron `0 4 * * *`) seeds newly released units into the shared
database from the blablalink roster. Every day at 06:00 local, this job:

1. Cuts a fresh worktree `~/nikke-sim-wt-newunit-watch` off `origin/main` on branch
   `kit-autonomy-newunits-<date>`, then runs `npm run sync`.
2. Runs `detect-new-units.mjs` to diff the synced `data/characters.json` against `origin/main`'s copy. Slugs
   listed in `~/.nikke-newunit-autopilot/handled.txt` are skipped. If no unit is left, the job removes the
   worktree and branch and exits (it writes the log and marker only, with no Discord message).
3. Commits the roster entry: the sync output, plus `scripts/blind-rebuild/char-extracts/<slug>.json` for
   each new unit. It records the slugs in `handled.txt` so a later run does not dispatch them twice.
4. Starts a headless Claude session (`prompt-roster.md`) that fixes roster test pins the sync broke.
5. Starts one headless Claude session per unit (`prompt-unit.md`) that runs the kit-autonomy gauntlet
   (`scripts/kit-autonomy/SKILL.md`). Routing is Claude-only: S2b `claude-fable-5`, S5/S6 `claude-opus-5`,
   S7 `claude-fable-5-1`, all through `dispatch-claude.sh`.
6. Runs `bash scripts/verify.sh`, pushes the branch and opens a PR to `main`. The PR is a draft when verify
   is red.
7. Posts the PR link and each unit's GO / NO-GO verdict to the Discord webhook `autonomous_session_webhook`
   (`.env`). Failures also post, naming the failed step and the run directory.

Each session runs under a wall-clock and output-token ceiling enforced by `token-watchdog.py`. The ceilings
are 45 min / 150k tokens for the roster session and 240 min / 900k tokens per unit. Sessions run with
`NIKKE_AUTONOMOUS=1`, so the repo's blast-radius, destructive-bash and image-budget hooks are armed.

## Install / operate

| What                        | How                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install or refresh          | `bash scripts/autopilot/new-unit-watch/install.sh` (copies these files to `~/.nikke-newunit-autopilot/`, arms the daily 06:00 job)                 |
| Uninstall                   | `bash scripts/autopilot/new-unit-watch/install.sh --uninstall`                                                                                     |
| Pause                       | `touch ~/.nikke-newunit-autopilot/STOP`                                                                                                            |
| Detect only, change nothing | `DRY_RUN=1 bash ~/.nikke-newunit-autopilot/run.sh`                                                                                                 |
| Run now                     | `bash ~/.nikke-newunit-autopilot/run.sh`                                                                                                           |
| Retry a unit                | delete its line from `~/.nikke-newunit-autopilot/handled.txt`                                                                                      |
| Last outcome                | `cat ~/.nikke-newunit-autopilot/last-run`                                                                                                          |
| Logs                        | `~/Library/Logs/nikke-newunit-watch/` (`watch.log`, plus a `run-<timestamp>/` folder per run with each session's stream, summary and `verify.log`) |

Edit the files here, then rerun `install.sh`. The installed copies in `~/.nikke-newunit-autopilot/` are
what launchd runs.

A Mac that is asleep at 06:00 runs the job at next wake. Because every blind and judge role runs on a
Claude model, a GO from this job is same-family evidence. The PR body says so, and the scope, duration and
trigger-identity lines are the ones to spot-check.
