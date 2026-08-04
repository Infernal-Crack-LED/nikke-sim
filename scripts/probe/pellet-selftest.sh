#!/usr/bin/env bash
# Runs every pellet-reader tool's --selftest / self-check in one command. Not folded into
# scripts/verify.sh because these need scripts/probe/.venv, which a clean checkout doesn't have.
#
# docs/handoffs/2026-07-30-pellet-reader-WORK-handoff.md flagged three remembered commands as
# already one too many, and the count grows with every reader tool (now four) -- this is that
# wrapper.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${PELLET_PYTHON:-$HERE/.venv/bin/python}"
if [ ! -x "$PY" ]; then
  # Worktrees have no scripts/probe/.venv (docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md) --
  # fall back to the main tree's, same convention every reproduction command in this thread uses.
  PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
fi

fail=0
run() {
  echo "== $* =="
  if ! "$PY" "$@"; then
    fail=1
  fi
  echo
}

run "$HERE/count-pellets.py" --selftest
run "$HERE/count-pellets.py" --cache-selftest
run "$HERE/analyze-pellet-tracks.py" --selftest
run "$HERE/analyze-pellet-tracks.py" --stale-counting-selftest
run "$HERE/analyze-pellet-tracks.py" --missing-shots-selftest
run "$HERE/analyze-pellet-tracks.py" --hand-count-selftest
run "$HERE/temporal-count-regression.py"
run "$HERE/score-pellets.py" --selftest
run "$HERE/score-pellets.py" --audit-fidelity-selftest
run "$HERE/score-pellets.py" --audit-fidelity-real-selftest
run "$HERE/score-pellets.py" --audit-centering-selftest
run "$HERE/extract-groundtruth-positions.py" --selftest
run "$HERE/make-synthetic-pellets.py" --audit-selftest

if [ "$fail" -ne 0 ]; then
  echo "pellet-selftest: FAILED"
  exit 1
fi
echo "pellet-selftest: all passed"
