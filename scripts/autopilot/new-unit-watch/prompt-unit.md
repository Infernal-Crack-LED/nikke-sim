You are an UNATTENDED, AUTONOMOUS session launched by the nikke-sim new-unit watch (a daily launchd
job). The owner is away and cannot answer questions. The owner AUTHORIZED this run in their own words:
"create a local deployed job that checks daily for new units that show up in the daily sync on bakery-bot,
and if there are any, run the sync on nikke-sim + trigger an autonomous kit-autonomy gauntlet session to
create the new character. after the character is created, open a PR to main and send me the PR in a discord
message" (2026-10-02). Overrides / tests / kit-status / characters.json edits for THIS unit are authorized
on this branch.

## Your unit

- ****NAME**** — slug `__SLUG__` (EXACT slug; a base unit with a shorter slug may exist — base ≠ variant is
  a P0 failure). **UNITLINE**
- Worktree: `__WT__` (branch `__BRANCH__`). `cd` into it first and work ONLY there.
- The roster entry is already committed (sync + `scripts/blind-rebuild/char-extracts/__SLUG__.json`).

## Task: run the kit-autonomy gauntlet on `__SLUG__`

Read `CLAUDE.md`, then READ AND FOLLOW `scripts/kit-autonomy/SKILL.md` (stages S0–S9 + Land) — it is the
procedure of record. This is a NEW unit with no shipped override: S2a's tests are FIX/MISSING lines (RED
against "no override"), S3 authors `src/skills/overrides/__SLUG__.json` from the kit prose. Use
`/kit-parse` hard rules + `docs/modeling-priors.md` + `docs/kit-autonomy-decisions.md` §5/§14 as directed by
the SKILL. Model the latest-landed gauntlets of new units as exemplars: `git show 175f5654` (aigis) and
`git show fcdcbdc1` (drake-great-villain), incl. their `scripts/kit-autonomy/manual-review/*.md`.

## MODEL ROUTING — CLAUDE ONLY (owner, 2026-10-02: no Qwen or Kimi access)

This OVERRIDES any Kimi/Qwen routing in `CROSS-FAMILY-PROTOCOL.md` / `SKILL.md` / skill files. Every
blind/judge role goes through `bash scripts/kit-autonomy/dispatch-claude.sh <packet.md> <model> <result.json>`
(run FOREGROUND, Bash timeout 600000 — dispatches take 2–5 min; a slow dispatch is not a failure). NEVER call
`dispatch-kimi.sh` or `dispatch-qwen.sh`.

| Role                                                                                                        | Model                                              |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| S2b adversarial test-faithfulness reviewer                                                                  | `claude-fable-5` (tier 2: ALSO `claude-fable-5-1`) |
| S5 blind test-writer, S6 blind override-writer                                                              | `claude-opus-5`                                    |
| S7 reconciling judge (BINDING)                                                                              | `claude-fable-5-1` (tier 2: ALSO `claude-fable-5`) |
| Decide tier 1 vs tier 2 from the S1 line inventory per the protocol's tier table and record it. Packets:    |
| `npx tsx scripts/kit-autonomy/prepare-cross-family-packet.ts **SLUG** --tokens "<signature magnitudes +     |
| mechanic names>" --roles s2b,s5,s6` (supply BOTH magnitudes and mechanic names); S7 packet:                 |
| `npx tsx scripts/kit-autonomy/build-judge-packet.ts` (read its header for usage). Every result JSON records |
| its `model`. In `kit-status.ts --gauntlet --evidence`, state the provenance honestly as                     |
| "same-family only (Claude: S2b fable-5 / S5,S6 opus-5 / S7 fable-5-1)" — never call it cross-family.        |

## Hard rules

- NEVER push, never open a PR, never touch `main` — the wrapper pushes + opens the PR after all sessions.
- NEVER discard work with `git restore` / `git checkout -- <path>` / `git reset --hard` (use `git stash`).
- `src/engine/**` is OFF-LIMITS in this run. If the kit needs a missing engine primitive: mark the line a
  GAP (`it.skip` + reason), add a dated entry to `docs/engine-modeling-gaps.md`, model what is expressible,
  and say so in the summary. Never edit `scripts/regression-snapshot*.json` except via
  `npx tsx scripts/regression.ts --update` if YOUR override moved a pinned comp (state that in the commit).
- Faithful > fit. Never fabricate a value; every out-of-domain value is a ⚑ with estimate + recipe + tier.
  Override prose is current-state only (no history). Use only full names / slugs / approved nicknames.
- COMMIT IN SLICES (an autonomous blast-radius hook denies edits past ~300 uncommitted lines): e.g. tests
  (S2a/S2d) → commit; override (S3) → commit; blind artifacts + judge → commit; Land → commit. Add paths
  explicitly (never `git add -A`); force-add only `scripts/kit-autonomy/cross-family/__SLUG__/*.json`
  (packets stay untracked). The final commit subject: `__SLUG__ (__NAME__): kit-autonomy gauntlet <GO|NO-GO> faithfulness <score>`.
- Run long shell commands in the FOREGROUND with an explicit timeout (≤600000 ms); never background them.
  Do NOT run the full `bash scripts/verify.sh` (it can exceed 10 min) — the wrapper runs it after you. You DO
  run: `npx vitest run scripts/tests/units/__SLUG__.test.ts`, `npx tsx scripts/validate-overrides.ts __SLUG__`,
  `npx tsx scripts/kit-status.ts --check`, `npm run typecheck`.
- NO-GO handling: up to 2 retries per the SKILL. If still NO-GO (or NO-GO engine-core), do NOT land the
  override as faithful — commit the evidence (tests, blind artifacts, judge result, manual-review doc) with a
  NO-GO subject, leave `simSupported` false, and report it in the summary. The owner reads it on the PR.
- PRODUCTIVITY STOP: if ~45 min pass with no commit, stop that thread, commit what you have + a written
  note, and move on/finish. Ending early with a clear record beats exploring.
- Never print or copy secrets from `.env`. Do not post to the Discord webhook yourself — the wrapper does.

## At the end

Write a markdown summary to `__SUMMARY__`. FIRST LINE exactly:
`**__NAME__** (\`**SLUG**\`) — GO|NO-GO — faithfulness <score> — tier <1|2>`
then ≤12 lines: what the override implements, notable unmodeled/GAP lines, the owner spot-check lines
(scope / duration / trigger-identity), board A/B numbers if available, anything skipped and why.
