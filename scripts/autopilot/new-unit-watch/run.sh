#!/usr/bin/env bash
# nikke-sim NEW-UNIT WATCH — daily launchd job (com.nikke.newunit-watch).
#
# Bakery-bot's own daily sync (Railway node-cron `0 4 * * *`) seeds newly released NIKKE units into the
# shared DB. This job runs after it: syncs nikke-sim in a fresh worktree off origin/main, and if the sync
# ADDED any unit not already handled, it
#   1. commits the roster entry (sync output + char-extracts) on a new branch,
#   2. runs a short headless Claude session to fix test pins the sync broke,
#   3. runs one headless Claude kit-autonomy gauntlet session per new unit (Claude-only routing),
#   4. runs scripts/verify.sh, pushes the branch, opens a PR to main (draft if verify is red),
#   5. posts the PR link + per-unit verdicts to the Discord webhook `autonomous_session_webhook` (.env).
# No new units ⇒ cleans up and exits quietly (log + marker only).
#
# AUTHORIZATION (owner, verbatim, 2026-10-02): "create a local deployed job that checks daily for new units
# that show up in the daily sync on bakery-bot, and if there are any, run the sync on nikke-sim + trigger an
# autonomous kit-autonomy gauntlet session to create the new character. after the character is created,
# open a PR to main and send me the PR in a discord message using the webhook in .env
# "autonomous_session_webhook"" — plus "i no longer have qwen or kimi access, so you'll need to handle this
# entirely with claude models".
#
# Manual run:   bash ~/.nikke-newunit-autopilot/run.sh            (DRY_RUN=1 → detect only, no commit/session)
# Retry a unit: delete its line from ~/.nikke-newunit-autopilot/handled.txt
# Disable:      touch ~/.nikke-newunit-autopilot/STOP
set -uo pipefail

# ==================== CONFIG ====================
HOME_DIR="$HOME/.nikke-newunit-autopilot"
REPO="$HOME/nikke-sim"
WT="$HOME/nikke-sim-wt-newunit-watch"
CLAUDE_BIN="$HOME/.local/bin/claude"
DRIVER_MODEL="claude-opus-5-5"
GH_ACCOUNT="Infernal-Crack-LED"                   # every GitHub action is this account
WATCHDOG="$HOME_DIR/token-watchdog.py"
HANDLED="$HOME_DIR/handled.txt"
ROSTER_MAX_MIN=45;  ROSTER_MAX_TOK=150000
UNIT_MAX_MIN=240;   UNIT_MAX_TOK=900000
DRY_RUN="${DRY_RUN:-0}"
# ===============================================

LOGDIR="$HOME/Library/Logs/nikke-newunit-watch"
STAMP="$(date +%Y-%m-%d)"
RUNDIR="$LOGDIR/run-$(date +%Y%m%dT%H%M%S)"
LOG="$LOGDIR/watch.log"
MARKER="$HOME_DIR/last-run"
mkdir -p "$LOGDIR" "$RUNDIR"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

notify() { # $1 = message text (Discord + macOS banner). Never logs the URL.
  osascript -e "display notification \"${1//\"/\'}\" with title \"nikke new-unit watch\"" >/dev/null 2>&1 || true
  [ -n "${AUTONOMOUS_WEBHOOK:-}" ] || return 0
  MSG="$1" python3 - <<'PY' || true
import json, os, urllib.request
u = os.environ["AUTONOMOUS_WEBHOOK"]; m = os.environ["MSG"][:1990]
urllib.request.urlopen(urllib.request.Request(u, data=json.dumps({"content": m}).encode(),
    headers={"Content-Type": "application/json", "User-Agent": "nikke-newunit-watch"}), timeout=15).read()
PY
}
mark() { printf '%s | %s | log: %s\n' "$(date)" "$1" "$RUNDIR" > "$MARKER"; echo "== $1"; }

# One headless Claude session under wall-clock + output-token ceilings. $1 prompt file, $2 min, $3 tok, $4 label
run_session() {
  local prompt="$1" max_min="$2" max_tok="$3" label="$4"
  local fifo; fifo="$(mktemp -u)"; mkfifo "$fifo"
  echo "-- session $label start $(date) (ceiling ${max_min} min / ${max_tok} tok)"
  ( cd "$WT" && NIKKE_AUTONOMOUS=1 "$CLAUDE_BIN" -p "$(cat "$prompt")" --model "$DRIVER_MODEL" \
      --dangerously-skip-permissions --output-format stream-json --verbose ) > "$fifo" 2>&1 &
  local pid=$!
  ( sleep $((max_min * 60)); kill -0 "$pid" 2>/dev/null && { echo "[watchdog] wall-clock limit — $label"; \
      kill -TERM "$pid"; sleep 20; kill -KILL "$pid"; } ) >/dev/null 2>&1 &
  local timer=$!
  python3 "$WATCHDOG" --pid "$pid" --max-output-tokens "$max_tok" --raw "$RUNDIR/$label.jsonl" \
          --status "$RUNDIR/$label.status.json" --label "newunit-$label" < "$fifo" >> "$RUNDIR/$label.progress.log"
  local wd=$?
  wait "$pid"; local rc=$?
  kill "$timer" 2>/dev/null; rm -f "$fifo"
  echo "-- session $label end $(date) (exit $rc, watchdog $wd)"
  return $rc
}

{
  echo "==================== new-unit watch $(date) ===================="
  [ -f "$HOME_DIR/STOP" ] && { echo "STOP file present — skipping"; exit 0; }
  if ! mkdir "$HOME_DIR/.lock" 2>/dev/null; then echo "another run holds the lock — skipping"; exit 0; fi
  trap 'rmdir "$HOME_DIR/.lock" 2>/dev/null' EXIT

  if [ -f "$REPO/.env" ]; then
    W="$(grep -E '^autonomous_session_webhook=' "$REPO/.env" | head -1 | cut -d= -f2-)"
    W="${W%\"}"; W="${W#\"}"; W="${W%\'}"; W="${W#\'}"
    [ -n "$W" ] && export AUTONOMOUS_WEBHOOK="$W"
  fi

  # ---- fresh worktree off origin/main ---------------------------------------------------------------
  git -C "$REPO" fetch -q origin || { mark "FAILED: git fetch"; notify "⚠️ nikke new-unit watch: git fetch failed — see $RUNDIR"; exit 1; }
  if [ -d "$WT" ]; then git -C "$REPO" worktree remove --force "$WT" || rm -rf "$WT"; fi
  git -C "$REPO" worktree prune
  BRANCH="kit-autonomy-newunits-$STAMP"
  if git -C "$REPO" rev-parse -q --verify "refs/heads/$BRANCH" >/dev/null \
     || git -C "$REPO" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    BRANCH="$BRANCH-$(date +%H%M)"
  fi
  git -C "$REPO" worktree add -q "$WT" -b "$BRANCH" origin/main || { mark "FAILED: worktree add"; exit 1; }
  cp "$REPO/.env" "$WT/.env"
  cd "$WT" || exit 1
  npm install --silent --no-audit --no-fund > "$RUNDIR/npm-install.log" 2>&1 || { mark "FAILED: npm install"; notify "⚠️ nikke new-unit watch: npm install failed — see $RUNDIR"; exit 1; }

  # ---- sync + detect --------------------------------------------------------------------------------
  if ! npm run sync > "$RUNDIR/sync.log" 2>&1; then
    mark "FAILED: npm run sync"; notify "⚠️ nikke new-unit watch: \`npm run sync\` failed — log $RUNDIR/sync.log"; exit 1
  fi
  node "$HOME_DIR/detect-new-units.mjs" "$WT" "$HANDLED" > "$RUNDIR/detect.json" || { mark "FAILED: detect"; exit 1; }
  PENDING="$(python3 -c 'import json,sys;print(" ".join(json.load(open(sys.argv[1]))["pending"]))' "$RUNDIR/detect.json")"
  ADDED="$(python3 -c 'import json,sys;print(" ".join(json.load(open(sys.argv[1]))["added"]))' "$RUNDIR/detect.json")"
  echo "added by sync: ${ADDED:-none} | pending (not yet handled): ${PENDING:-none}"

  if [ -z "$PENDING" ] || [ "$DRY_RUN" = "1" ]; then
    cd "$HOME"; git -C "$REPO" worktree remove --force "$WT"; git -C "$REPO" branch -D "$BRANCH" >/dev/null 2>&1
    mark "no new units${ADDED:+ (already handled: $ADDED)}${PENDING:+ — DRY RUN, pending: $PENDING}"
    exit 0
  fi

  # ---- roster-entry commit (deterministic, by the wrapper) ------------------------------------------
  node "$HOME_DIR/detect-new-units.mjs" "$WT" "$HANDLED" --write-extracts > /dev/null
  NAMES="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));print(", ".join(f"{d[\"units\"][s][\"name\"]} ({s})" for s in d["pending"]))' "$RUNDIR/detect.json")"
  UNITS_MD="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]))
for s in d["pending"]:
  u=d["units"][s]; print(f"  - **{u[\"name\"]}** (`{s}`) — {u[\"weapon\"]} / {u[\"class\"]} / {u[\"element\"]} / Burst {u[\"burst\"]}, released {u[\"releaseDate\"]}")' "$RUNDIR/detect.json")"
  for s in $PENDING; do echo "$s  # dispatched $STAMP → $BRANCH" >> "$HANDLED"; done
  if [ "$(git config user.name)" != "$GH_ACCOUNT" ]; then
    mark "FAILED: git user.name is not $GH_ACCOUNT"; notify "⚠️ nikke new-unit watch: refusing to commit — git user.name in $REPO is not $GH_ACCOUNT."; exit 1
  fi
  git add data/ scripts/blind-rebuild/char-extracts/
  if ! git commit -q -m "roster: $NAMES enter the sim (sync)

Daily new-unit watch (~/.nikke-newunit-autopilot): \`npm run sync\` against bakery-bot's DB added
these units; their char-extracts are the characters.json entries minus nicknames. Per-unit gauntlet
commits follow." > "$RUNDIR/roster-commit.log" 2>&1; then
    mark "FAILED: roster commit (pre-commit hook?)"
    notify "⚠️ nikke new-unit watch: new units detected ($NAMES) but the roster commit failed — see $RUNDIR/roster-commit.log. Branch $BRANCH left in $WT."
    exit 1
  fi
  notify "🆕 nikke new-unit watch: $NAMES detected — kit-autonomy gauntlet starting on \`$BRANCH\`."

  # verify.sh in a fresh worktree needs the gitignored web artifacts
  (npm run dpschart && npm run ranks:all) > "$RUNDIR/web-artifacts.log" 2>&1 || echo "WARN: web artifact prep failed"

  fill() { # $1 template → stdout, substituting placeholders from env
    python3 - "$1" <<'PY'
import os, sys
t = open(sys.argv[1]).read()
for k in ("WT", "BRANCH", "SLUG", "NAME", "UNITLINE", "UNITS", "SUMMARY"):
    t = t.replace("{{" + k + "}}", os.environ.get(f"P_{k}", ""))
print(t)
PY
  }

  # ---- session 0: roster test pins ------------------------------------------------------------------
  export P_WT="$WT" P_BRANCH="$BRANCH" P_UNITS="$UNITS_MD" P_SUMMARY="$RUNDIR/roster.summary.md"
  fill "$HOME_DIR/prompt-roster.txt" > "$RUNDIR/roster.prompt.md"
  run_session "$RUNDIR/roster.prompt.md" "$ROSTER_MAX_MIN" "$ROSTER_MAX_TOK" roster

  # ---- one gauntlet session per unit ----------------------------------------------------------------
  for s in $PENDING; do
    export P_SLUG="$s" P_SUMMARY="$RUNDIR/$s.summary.md"
    export P_NAME="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["units"][sys.argv[2]]["name"])' "$RUNDIR/detect.json" "$s")"
    export P_UNITLINE="$(python3 -c 'import json,sys;u=json.load(open(sys.argv[1]))["units"][sys.argv[2]];print(f"{u[\"weapon\"]} / {u[\"class\"]} / {u[\"element\"]} / Burst {u[\"burst\"]}, released {u[\"releaseDate\"]}.")' "$RUNDIR/detect.json" "$s")"
    fill "$HOME_DIR/prompt-unit.txt" > "$RUNDIR/$s.prompt.md"
    run_session "$RUNDIR/$s.prompt.md" "$UNIT_MAX_MIN" "$UNIT_MAX_TOK" "$s"
    [ -f "$P_SUMMARY" ] || printf '**%s** (`%s`) — NO SUMMARY (session died or hit a ceiling) — see %s\n' "$P_NAME" "$s" "$RUNDIR" > "$P_SUMMARY"
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
      echo "WARN: session $s left uncommitted tracked changes — stashing them (recoverable)"
      git stash push -q -m "newunit-watch: uncommitted leftovers from $s session" || true
    fi
  done

  # ---- verify, push, PR, notify ---------------------------------------------------------------------
  if bash scripts/verify.sh > "$RUNDIR/verify.log" 2>&1; then VERIFY="GREEN"; else VERIFY="RED"; fi
  echo "verify.sh: $VERIFY"
  NCOMMITS="$(git rev-list --count origin/main..HEAD)"
  VERDICTS="$(for s in $PENDING; do head -1 "$RUNDIR/$s.summary.md"; done)"

  {
    echo "Automated by the daily **new-unit watch** (\`~/.nikke-newunit-autopilot/run.sh\`): bakery-bot's sync seeded new units; nikke-sim synced them and ran the kit-autonomy gauntlet per unit (Claude-only model routing)."
    echo; echo "## Units"; echo "$UNITS_MD"
    echo; echo "## Gauntlet results"
    for s in $PENDING; do echo; cat "$RUNDIR/$s.summary.md"; done
    echo; echo "## Roster test pins"; cat "$RUNDIR/roster.summary.md" 2>/dev/null || echo "(no summary)"
    echo; echo "## Gate"; echo "\`bash scripts/verify.sh\`: **$VERIFY** (log on the owner's Mac: \`$RUNDIR/verify.log\`)"
    echo; echo "Same-family provenance: every blind/judge role ran on a Claude model (no Kimi/Qwen access) — a GO is weaker evidence than a cross-family GO; spot-check the scope / duration / trigger-identity lines."
    echo; echo "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  } > "$RUNDIR/pr-body.md"

  if [ "$NCOMMITS" -eq 0 ]; then
    mark "FAILED: no commits"; notify "⚠️ nikke new-unit watch: $NAMES — no commits produced. Log $RUNDIR"; exit 1
  fi
  if ! git push -q -u origin "$BRANCH" > "$RUNDIR/push.log" 2>&1; then
    mark "FAILED: push"; notify "⚠️ nikke new-unit watch: $NAMES — gauntlet finished but \`git push\` failed (branch \`$BRANCH\` is local in $WT). $VERDICTS"; exit 1
  fi
  DRAFT=""; [ "$VERIFY" = "RED" ] && DRAFT="--draft"
  # The PR must be opened as Infernal-Crack-LED (owner, 2026-10-02). gh's ACTIVE account on this Mac is a
  # different one, so pin this one command to the right account's token instead of switching it globally.
  # (Commits + the push are already Infernal-Crack-LED: repo-local user.name + the PAT credential helper.)
  GH_TOKEN="$(gh auth token --user "$GH_ACCOUNT" 2>/dev/null)"
  if [ -z "$GH_TOKEN" ] || [ "$(GH_TOKEN="$GH_TOKEN" gh api user -q .login 2>/dev/null)" != "$GH_ACCOUNT" ]; then
    mark "FAILED: no gh token for $GH_ACCOUNT"
    notify "⚠️ nikke new-unit watch: branch \`$BRANCH\` pushed but gh has no working login for $GH_ACCOUNT — open the PR by hand. $VERDICTS"; exit 1
  fi
  PR_URL="$(GH_TOKEN="$GH_TOKEN" gh pr create --base main --head "$BRANCH" $DRAFT \
      --title "New units: $NAMES — kit-autonomy gauntlet" --body-file "$RUNDIR/pr-body.md" 2>"$RUNDIR/pr.log" | tail -1)"
  if [ -z "$PR_URL" ]; then
    mark "FAILED: gh pr create"; notify "⚠️ nikke new-unit watch: branch \`$BRANCH\` pushed but PR creation failed — open it by hand. $VERDICTS"; exit 1
  fi
  mark "PR $PR_URL (verify $VERIFY)"
  notify "✅ **New NIKKE units ready for review** — $PR_URL
verify.sh: **$VERIFY**${DRAFT:+ (opened as draft)}
$VERDICTS"
} >> "$LOG" 2>&1
