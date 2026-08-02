# Test-speed gotchas — keeping the vitest suite fast

The suite (`scripts/tests/**/*.test.ts`, ~171 files / ~2,556 tests) runs in **~20s wall**
on a 28-core machine (2026-08-02, down from ~64s). `verify.sh` runs it as one step; CI
runs it on every PR. These are the recurring traps that make tests unnecessarily slow,
found while taking the 64s → 20s pass.

## 1. Wall time is the critical path, not the sum

With ~28 parallel workers, total runtime is `max(file time) + scheduling tail`.
Before the pass, ONE file (`burst-cooldown-coverage.test.ts`, 63.8s) set the wall time;
the other 170 files — 207s of cumulative work — finished inside its shadow for free.
Optimizing anything but the slowest file had **zero** wall-time effect.

- **Profile first.** Vitest prints per-file durations; rank them:
  `NO_COLOR=1 npx vitest run | awk '/✓ scripts\/tests/ {ms=$NF; sub(/ms$/,"",ms); print ms, $2}' | sort -rn | head`
  (`NO_COLOR=1` matters — ANSI escapes in redirected output silently break the parse.)
- **Attribute each lever.** Re-run with one change reverted via CLI override
  (`npx vitest run --pool=forks --isolate=true`) instead of guessing which change bought what.

## 2. Don't run 180s fights in length-independent tests

The canonical scope-lock fight is 180s. Generator tests that assert **legality, locks,
counts, constraints, cache semantics, or path-vs-path parity** do not depend on fight
length — but every `makeCalc` paid for the full fight anyway (up to ~75s per file).
`scripts/tests/lib/fast-cfg.ts` (`fastCfg`) wraps `scopeLockCfg` with `durationSec: 30`.

**The decision rule:** does the assertion read a damage/score MAGNITUDE, or a structural
property of the output? Structural → `fastCfg`. Magnitude → keep 180s and say why at the
call site.

Why structural properties are length-proof: the generator gates every candidate team on
`isLegal`/`stageCovered` (static burst cooldowns) BEFORE any sim runs
(`src/teamcalc.ts`), so a refused/built/legality assertion cannot depend on how long the
sim ran. Multi-cycle engine behaviour (CDR working across burst cycles) stays pinned at
full length by the engine primitive tests (`scripts/tests/engine/burst-cdr.test.ts`) —
the generator test does not need to re-cover it.

**Files that correctly keep 180s** (each says so at its `cfg` call site):

- `cross-team-polish.test.ts` — asserts a damage-RATIO floor (polished ÷ greedy > 1.09)
  calibrated against the canonical run; the ratio moves with fight length.
- `canonical-order.test.ts` — the focus post-pass needs full length to have room to beat
  the canonical-focus sim; at 30s it can tie and the `≥` assertion goes vacuous (passes
  while proving nothing).
- `burst-cooldown-coverage.test.ts` converted to `fastCfg` on 2026-08-02 (63.8s → 8.4s):
  its refuse/build/legality/locked-bestTeam assertions are structural. ONE assertion is
  score-dependent ("explores double-support shapes" reads the score-ranked top 5) and
  was re-validated on the 30s basis at conversion — a declared recalibration per §5, not
  a length-proof property. The multi-cycle concern belongs to the engine primitive test
  above, and the legality gate reads static cooldowns, so in-sim burstCdr cannot
  interact with it at any fight length.

## 3. Keep the suite hermetic so isolation can stay OFF

Vitest's default (`isolate: true`) gives every test file a fresh module registry, so
module-level loads re-run per file: the harness's `characters.json` parse (3.1MB) and
each generator file's ~150 `loadOverride` filesystem reads happened ~170× instead of
once per worker. `vitest.config.ts` sets `pool: 'threads', isolate: false` so files
share one registry per worker.

That is only safe while the suite stays hermetic. A new test breaks this if it:

- mutates a shared module export (`data.characters`, the harness bundles) instead of a
  deep clone (`withPatchedOverride` clones for exactly this);
- leaves a mock/spy installed (`vi.spyOn(console, ...)` must restore in a `finally`);
- touches the process-level sim cache bundle — it is keyed per cfg and only used by
  `cache: 'shared'` callers; new users must key uniquely (see `shared-cache.test.ts`);
- binds a FIXED port — serve tests must keep using ephemeral ports (`listen(0)`);
- mutates `process.env` without save/restore — under a shared registry the mutation
  leaks to every later file in the same worker. Save the prior value and RESTORE it
  (do not `delete` — delete discards a value an earlier setter relied on).
  `scripts/tests/share/portrait-security.test.ts` (the `NIKKESIM_PORTRAIT_DIR` env var — a hardcoded literal read lazily by
  `src/infographics/node/portraits.ts`) is the existing instance and does this
  correctly.

If you add any of these, fix the test's hygiene first — that is almost always the right
answer. If a file genuinely needs its own module registry, there is NO per-file
isolation pragma in vitest; the real escape hatch is a second vitest PROJECT with
`isolate: true` under `test.projects` (verified on vitest 4.1.10: an `isolate: true`
project gets a fresh registry even while another project runs `isolate: false`). Do not
flip the global default back for one bad file.

## 4. Recognize inherent costs — don't optimize them

Some files are slow because the property under test is slow:

- `generator-lock.test.ts` (~20s) — a LOCK test: it pins exact full-roster search
  output so drift is visible. Shrinking the pool would delete the thing it tests.
- `shared-cache.test.ts` (~19s) — cache-semantics at full-pool scale, unique cfg per
  test so bundles cannot leak.
- `build-render-key.test.ts` / `infographics-golden.test.ts` — real PNG renders and
  pixel diffs; the pixels ARE the assertion.
- `build-infographics.test.ts` — runs the real builder twice (determinism needs two
  runs) into a temp dir.
- `serve-*.test.ts` — boot a real HTTP server (ephemeral port).

These set the floor (~20s wall). Chasing them further means weakening assertions —
out of scope for a speed pass.

## 5. A calibrated floor is a re-measurement event

`cross-team-polish`'s ratio floor has been re-measured twice after roster changes (the
laplace gauntlet moved the ratio from ~13% to ~9.53%). Shortening a test's fight length
is the same class of event: the floor must be re-measured and the comment updated, or
the assertion silently asserts nothing. Budget for that, or leave the basis alone.

## 6. Environment gotchas (agent shells)

- Qwen/agent shells often export `NODE_ENV=production`, which makes `npm ci` omit
  devDependencies (vitest vanishes). Run tests as `env -u NODE_ENV npx vitest run`, and
  install in fresh worktrees with `npm ci --include=dev`.
- Fresh git worktrees need `node_modules` symlinked from the main tree
  (`ln -s <main>/node_modules node_modules`) or the pre-commit hooks and vitest cannot
  run there.
- Vitest emits ANSI colors even into redirected logs; parse with `NO_COLOR=1` or strip
  escapes first.

## Measured results (2026-08-02, 28 cores, origin/main @ d7405f85)

| State                                        | Wall    | Cumulative test CPU | Tests        |
| -------------------------------------------- | ------- | ------------------- | ------------ |
| Baseline                                     | 64.2s   | 271.2s              | 2533 + 23 sk |
| + burst-cooldown-coverage on fastCfg         | 23.1s   | —                   | 2533 + 23 sk |
| + threads pool, isolation off                | 20.4s   | 223.0s              | 2533 + 23 sk |

Test counts are identical across all three states — no assertion was dropped or skipped;
the 23 skips are pre-existing. Wall time now sits on the inherent generator-lock floor.
