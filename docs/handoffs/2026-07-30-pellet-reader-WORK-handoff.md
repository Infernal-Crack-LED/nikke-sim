# Pellet reader — WORK session handoff (next: Phase 1)

> AI-facing. For the session that **builds**. The companion
> [`…-JUDGE-handoff.md`](2026-07-30-pellet-reader-JUDGE-handoff.md) is for the session that
> **verifies** — they are deliberately separate roles.
>
> Plan of record: [`2026-07-30-pellet-reader-implementation-plan.md`](2026-07-30-pellet-reader-implementation-plan.md).
> Read its **START HERE** block first. This doc covers what changed since it was written.
>
> **Units:** the four videos are the slugs `marciana` (SG/Iron — `marciana-solo.MP4`, **not**
> `marciana-marine-study`, which is AR/Iron and has no role in shotgun work), `noir`, `guilty`,
> `isabel`. All four are SG, `ammo: 9`.

## Where you are

Branch `fix/pellet-reader`, worktree `/Users/maxwellsutton/nikke-sim-wt-pellet`. Everything below is
committed there, nothing pushed.

**Done and verified today:** H1 · H2 · H3 · H4 · H5 (cancelled with proof) · §0.5 · Phase 2A part 2.
**Phase 2A's four-video conjunction is CLOSED** — gate 1 and gate 2 met on `marciana`, `noir`,
`guilty`, `isabel` simultaneously, which four previous tuning passes failed to achieve.

## Next task: Phase 1 — and it is Phase 2's only blocker

Phase 2 cannot be scored without it. Neither `scripts/probe/make-synthetic-pellets.py` nor
`scripts/probe/score-pellets.py` exists, and Phase 2's exit criterion is written against both.

**§1.1 — cache-then-sweep.** Split detection from counting so candidate methods can be A/B'd over
cached detections in seconds rather than minutes.

**§1.2 — the labeled set.** Read §1.2 in the plan, then apply these two amendments:

1. **Use ONE shared 13-frame lifecycle profile, not per-unit ones.** §0.5 was answered today: the
   lifecycle generalises across units (`marciana` vs `noir` agree within ±0.05 across all 11 profile
   samples). The generator is simpler than §1.2 assumed.
2. **Fit/emit the profile on samples 1–5 only.** Both measured curves decay to a minimum at sample 5
   then _rise_ — a pellet does not grow back; that tail is the `life≥5` bucket picking up damage
   numbers and persistent VFX. Synthesising the rise would bake contamination into the labels.

## Things that will bite you (each already cost a session)

| trap                                                        | avoid                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `scratchpad/` + video media exist **only in the main tree** | absolute `/Users/maxwellsutton/nikke-sim/...` paths                      |
| worktree has **no** `scripts/probe/.venv`                   | use the main tree's interpreter by absolute path                         |
| `NODE_ENV=production` here makes npm skip devDeps           | `NODE_ENV=development npm ci --include=dev --ignore-scripts`             |
| `--dump-tracks true` is not implied                         | pass it, or you get no `tracks.json`                                     |
| `--debug-dir` is **silently ignored** with `--temporal`     | drop `--temporal` when you want debug images (known gap, unfixed)        |
| validation dumps have been lost twice                       | write to the main tree's `scratchpad/`, confirm on disk before reporting |

## Do not

- Re-tune the pellet-brightness threshold (`WHITE_LO`, areas, circularity). Settled.
- Re-attempt confidence-threshold tuning for the crosshair — §H5 **proves** no value works.
- Quote "22% missed" / "48%" / "62.7%" as current. Denominator artifacts; real rate is ~88–100%.
- Merge `fix/sg-pellet-counter-template` wholesale (still off an older `origin/main`).

## Verification you owe before reporting

`bash scripts/verify.sh` plus the three Python self-checks, which are **not** in `verify.sh` because
they need `scripts/probe/.venv`:

```sh
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py --selftest
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --selftest
scripts/probe/.venv/bin/python scripts/probe/temporal-count-regression.py
```

⇒ **Worth doing as part of Phase 1:** fold these three into one wrapper script. Three remembered
commands is already one too many, and the count grows with every reader tool.

## After Phase 1

Phase 2 (lifecycle-aware counting). **Its design should go through `/logic-gate` pre-op before code
is written** — owner-invoked, and with a Claude driver it routes to `kimi-code/k3`, not Fable. The
reason is in the judge handoff: the design was authored by the same assistant that has been verifying
this thread, so a same-family review is weak evidence.
