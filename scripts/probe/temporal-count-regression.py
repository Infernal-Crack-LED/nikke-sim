#!/usr/bin/env python3
"""Regression test for count-pellets.py's `--temporal` mode.

Catches the `active`/`frame_active` variable-shadowing bug (`main()` binds `active` to the
`--backend` selector dict, then the `--temporal` per-frame loop rebinds the SAME name to a
per-frame track list; the results loop's `if name in active` then checks a backend-name string
against a list of tuples, which is never true, so temporal white/red counts are unconditionally
zero). Introduced 2026-07-24 (`1d3c721`), fixed 2026-07-30 by renaming the loop-local list to
`frame_active`. It survived six days and a merge because nothing asserted that `--temporal`
produces non-zero output — this script is that assertion
(docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md, Phase H §H2).

EXTERNAL to count-pellets.py BY DESIGN: the last pre-fix commit (`2a1e99c`) predates
`--selftest`, so a test written as another `--selftest` mode inside the script could never be
pointed at the old version, and the mandatory red-then-green demonstration would be impossible.
This runner instead takes the script under test as a path (`--script`), or extracts one from git
history first (`--prefix-commit`), and drives it as a subprocess — so the identical check runs
against either version.

Usage:
    # regression guard: tests the current tree's count-pellets.py -> expect PASS (white > 0)
    scripts/probe/.venv/bin/python scripts/probe/temporal-count-regression.py

    # historical proof: tests the pre-fix script -> expect PASS-as-buggy (white == 0)
    scripts/probe/.venv/bin/python scripts/probe/temporal-count-regression.py \\
        --prefix-commit 2a1e99c --expect-zero

Fixture: scripts/tests/fixtures/pellets/frames/f_00103.png..f_00106.png — four CONTIGUOUS frames
(`--temporal` builds tracks across adjacent frames, so scattered frames would not reproduce the
bug) from `marciana-solo.MP4` (slug `marciana`, SG/Iron) via `scratchpad/pellets/run16/
frames-pellet/`, inside the exact idx 100-118 window this plan already showed discriminates
(pre-fix total_white 0, post-fix 9) — this narrower 4-frame slice reproduces that identical 0/9
split while keeping the fixture small.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DEFAULT_SCRIPT = os.path.join(HERE, 'count-pellets.py')
DEFAULT_FRAMES = os.path.join(REPO_ROOT, 'scripts', 'tests', 'fixtures', 'pellets', 'frames')
DEFAULT_TEMPLATE = os.path.join(HERE, 'ammo-box-template.png')

# run16's own recorded params (scratchpad/pellets/run16/tracks.json) — the run these fixture
# frames were extracted from.
TEMPORAL_ARGS = [
    '--temporal', '--backend', 'opencv',
    '--ammo-offset-x', '125', '--ammo-offset-y', '-11',
    '--center-exclude', '36', '--min-area', '25', '--max-area', '750',
    '--min-circ', '0.55', '--pellet-radius', '160', '--max-pellet-frames', '7',
]


def run_temporal_white_total(script, frames, template):
    cmd = [sys.executable, script, frames, '--ammo-template', template] + TEMPORAL_ARGS
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(f'{script} exited {proc.returncode}')
    results = json.loads(proc.stdout)
    return sum(r['opencv']['white'] for r in results)


def extract_commit_script(sha, dest_path):
    with open(dest_path, 'w') as f:
        proc = subprocess.run(['git', 'show', f'{sha}:scripts/probe/count-pellets.py'],
                               cwd=REPO_ROOT, stdout=f, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise SystemExit(f'git show {sha}:scripts/probe/count-pellets.py failed: {proc.stderr}')


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--script', default=DEFAULT_SCRIPT,
                     help='count-pellets.py to test (default: the tree copy)')
    ap.add_argument('--prefix-commit',
                     help='extract count-pellets.py from this git ref first and test that '
                          'instead of --script (e.g. 2a1e99c, the last pre-Fix-2 commit)')
    ap.add_argument('--frames', default=DEFAULT_FRAMES)
    ap.add_argument('--ammo-template', default=DEFAULT_TEMPLATE)
    ap.add_argument('--expect-zero', action='store_true',
                     help='invert the pass condition: PASS iff total white == 0 '
                          '(use to confirm a known-buggy script stays buggy)')
    args = ap.parse_args()

    script = args.script
    tmp_path = None
    label = args.script
    if args.prefix_commit:
        tmp = tempfile.NamedTemporaryFile(suffix='.py', delete=False)
        tmp.close()
        tmp_path = tmp.name
        extract_commit_script(args.prefix_commit, tmp_path)
        script = tmp_path
        label = f'{args.prefix_commit} (git show)'

    try:
        total = run_temporal_white_total(script, args.frames, args.ammo_template)
    finally:
        if tmp_path:
            os.unlink(tmp_path)

    ok = (total == 0) if args.expect_zero else (total > 0)
    print(f'script under test : {label}')
    print(f'temporal total white: {total}')
    print('PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
