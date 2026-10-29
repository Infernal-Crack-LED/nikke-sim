# Autonomous edit queue

Destructive or hook-blocked operations an unattended session wanted to run, left for the owner.

- 2026-10-29 (new-unit watch, marian-queen): a throwaway detached worktree `/tmp/mq-basewt` (base `9aab2f00`, used to diff the full vitest failure list against the pre-gauntlet base) was left registered — `git worktree remove --force` is hook-blocked. Safe to clean up with `rm -rf /tmp/mq-basewt && git worktree prune` (it holds no work: a node_modules symlink + copied gitignored web/public JSON).
- 2026-10-29 (new-unit watch, rapunzel-sanctuary): two tagged `git stash` entries were left on the shared stash stack — `rapsanct-engine-wip-20261029` and `rapsanct-review-fix-wip` (`git stash drop` is hook-blocked). Both hold exactly the work already committed on `kit-autonomy-newunits-2026-10-29` (535abade / a2f5bcfe); safe to drop: find them with `git stash list | grep rapsanct-` and `git stash drop stash@{N}`.
