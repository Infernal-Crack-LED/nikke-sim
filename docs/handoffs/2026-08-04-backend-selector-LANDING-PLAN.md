# Backend-selector tie-break — LANDING PLAN, blast radius MEASURED first

> AI-facing. Written and committed **before any production file is touched**. Fixes the defect
> recorded at `docs/probe-runs.md` §11E, carried as item 6 of
> [`2026-08-04-lifetime-cap-JUDGE-handoff.md`](2026-08-04-lifetime-cap-JUDGE-handoff.md).
> Owner-approved 2026-08-04 under the standing principle that **tooling faithfulness is a win
> regardless of the cold-SG question.** Prior graveyards and traps remain binding.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

---

## 1. The defect, stated exactly

`read-pellets.ts:874-884`:

```js
const backendEntries = [fc.numpy, fc.pil, fc.opencv];
const activeTotals = backendEntries.map((b) => b.white + b.red).filter((t) => t > 0).sort(...);
const total = activeTotals.length ? activeTotals[Math.floor(activeTotals.length / 2)] : 0;
const best = backendEntries.reduce((a, b) =>
  Math.abs(b.white + b.red - total) < Math.abs(a.white + a.red - total) ? b : a);
// ... marker: best.marker ?? 0,  band: best.band ?? 0,
```

The ranking key is **`white + red` only**. `marker` and `band` are then read off whichever backend
that key selected — **they never participate in the choice.** `Array.reduce`'s **strict `<`** means a
tie leaves the accumulator in place, and the accumulator starts at `backendEntries[0]`, so **ties
resolve to array order: numpy → pil → opencv.**

⚑ **Two channels ride as passengers, not one.** §11E recorded `marker`. **`band` — added by the
2026-08-04 hybrid landing — inherits the identical defect**, and `band` feeds
`perFrameForDebounce` → `debounceShots` → the landed representative-frame rule. §11E predates it.

⚑ **Production runs a single backend** (`read-pellets.ts:789` passes `--backend opencv`), and
`count-pellets.py` zero-fills the inactive ones. So the tie fires precisely when
**`white + red == 0` on every backend** — then `total = 0`, no comparison is ever strictly less, and
`best` stays **numpy**, whose zero-filled `marker`/`band` overwrite opencv's real values.

## 2. ⚑ BLAST RADIUS — MEASURED, not assumed, and §11E's figure is STALE

§11E's "fires on 7 of 8 dumps, 756 frames, only ONE flips an event's validity" was measured **before
the `band` channel existed**. Re-measured across **24,679 frames / 848 shots / 5 dumps / 4 units**,
at the landed `band_hi`:

| exposure                                                         | frames       |
| ---------------------------------------------------------------- | ------------ |
| `white + red == 0` (the tie fires)                               | **12,614**   |
| …of those, opencv's `band > 0` is discarded                      | **442**      |
| …of those, opencv's `marker > 0` is discarded                    | **606**      |
| ⚑ …**in-span AND `band ≥ MERGE_EVENT_MIN`** (can form a plateau) | **0**        |
| ⚑ …shots whose **representative frame** is such a frame          | **0 of 848** |

⇒ **The `band`-channel impact is ZERO on all available footage.** Every one of the 442 discarded
`band` values is 1–2, below `MERGE_EVENT_MIN = 3`, so it could never have formed a plateau. The
counting path is **not** currently affected.

⚑ **This narrowing is the point.** The raw 1,018-frame exposure is arithmetically impressive and
would have been the wrong number to quote — the same trap §20D fell into. **What survives is the
`marker` channel**, whose impact remains as §11E measured it: one event's validity across 8 dumps.

⇒ **This is a low-risk faithfulness fix, not an urgent correctness fix.** Land it because the code is
demonstrably wrong, not because it is currently costing counts.

⚑ **Scope of the ZERO claim** (gate rev. 6 / risk flag 4): it holds for **`debounceShots`'s two
`band` consumers — `MERGE_EVENT_MIN` plateau formation and representative-frame selection** — over
**available footage at the current `band_hi` and `MERGE_EVENT_MIN`**. If another `band` consumer is
found, the exposure table must be recomputed for it **before** landing.

## 3. The change — ⚑ REVISED AFTER THE PRE-OP GATE, which found the original FATAL

⚑ **The original §3 said "derive `marker`/`band` by the same active-backend consensus used for
`total`". THAT WOULD HAVE BEEN A SILENT NO-OP.** `total`'s activity test is `white + red > 0`, which
is **false for every backend on exactly the frames the defect fires** — so no backend would be
"active", the consensus would emit **0**, and the wrong answer would be preserved. Recorded rather
than quietly replaced (gate revision 1; the raw packet was gitignored and **LOST** when the worktree
was deleted on 2026-08-04 — the verdict's substance is quoted here and in §24E).

**The landed design is the gate's `simplerPath`:** keep `best` for `white`/`red` on its existing key,
and source each passenger channel **from the first backend whose OWN value for that channel is > 0**,
falling back to `best`, then to 0.

```
marker := first b in [numpy, pil, opencv] with b.marker > 0   else best.marker   else 0
band   := first b in [numpy, pil, opencv] with b.band   > 0   else best.band     else 0
```

Why this and not a per-channel median:

- **It cannot no-op.** Activity is defined **per channel**, so opencv's `marker = 2` is visible even
  when every `white + red` is 0.
- **In single-backend production it is exactly correct**: the zero-filled backends can never be
  selected for a channel they report 0 on, so the sole active backend always supplies every channel.
- ⚑ **A per-channel median would ERASE a lone real marker** in a genuine 3-backend run (two zeros
  outvote it), and an upper-index median on an even count biases arbitrarily on a near-boolean
  channel (gate risk flags 1–2).

⚑ **`white`/`red` keep the existing `backendEntries` order and strict-`<` comparator, untouched.** A
careless refactor there would reintroduce the very array-order dependence this fixes.

⚑ **No schema change.** Adding explicit active-backend metadata from `count-pellets.py` would resolve
the true-zero/zero-fill ambiguity more cleanly, but it crosses into the Python output contract and is
**out of scope** — the §6 hard stops protect counting code, not the schema. Deferred, not adopted.

⚑ **Residual ambiguity, stated:** a zero-filled inactive backend is indistinguishable from an active
backend that genuinely observed zero. This design is correct for single-backend production and
defensible for diagnostics; it is not a general multi-backend consensus, and it does not claim to be.

## 4. Success criteria

| #   | Criterion                                                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | On a frame where all backends have `white + red == 0` but opencv has `marker > 0` or `band > 0`, the emitted `marker`/`band` are **opencv's**, not numpy's zeros                                                                                                                                                      |
| 2   | On single-backend runs, every emitted channel equals that backend's value on **every** frame                                                                                                                                                                                                                          |
| 3   | `white`/`red`/`total`/`valid` are **unchanged** on all 5 dumps — this fix must not move the count itself                                                                                                                                                                                                              |
| 4   | Shot segmentation (`totalShots`, every event onset) **unchanged** on all 5 dumps                                                                                                                                                                                                                                      |
| 5   | Both gates green: `pellet-selftest.sh` (25 arms) + `verify.sh`, TRUE exit codes                                                                                                                                                                                                                                       |
| 6   | ⚑ **Unit tests, added before landing** (gate rev. 3): a synthetic frame where all backends have `white + red == 0` but opencv has `marker > 0` and/or `band > 0` must emit **opencv's** values; plus a single-backend identity property asserting every emitted channel equals the sole active backend on every frame |
| 7   | ⚑ **No-leak regression** (gate rev. 4): run over all 5 dumps and **diff** `white`/`red`/`total`/`valid`, `totalShots` and every event onset against baseline. Any movement is a HARD STOP, not a post-hoc explanation                                                                                                 |

## 5. ⚑ PREDICTED BLAST RADIUS — ZERO fixtures, ZERO pins

Per §2 the counting path is unaffected on all available footage, and `white`/`red`/`total` are not
touched by §3. Committed fixtures record counts and segmentation, not the per-frame `marker`/`band`
of a zero-total frame.

| artifact                                      | prediction                    |
| --------------------------------------------- | ----------------------------- |
| every `scripts/tests/fixtures/pellets/*.json` | **UNCHANGED, byte-identical** |
| `CACHE_SELFTEST_EXPECT`                       | **UNCHANGED**                 |
| all 25 `pellet-selftest.sh` arms              | **PASS**                      |
| `verify.sh`                                   | **PASS**                      |

⚠ **One known possible exception, declared up front:** the `marker` channel drives `core_hit`, and
§11I recorded **one** event across 8 dumps whose validity flips on it. If a committed fixture pins
that event, it may move. **That is the ONLY sanctioned mover**; anything else is a §6 hard stop.
⚑ Per §15, opencv's extra markers are **not** automatically correct — two of the three at `f1565`
were red UI-banner glyphs. **This fix does not adjudicate marker truth; it only stops the choice
being made by array order.**

## 6. HARD STOPS

1. ⛔ **Any fixture moves other than the single §5-declared `core_hit` event.** STOP and report.
2. ⛔ **`white`/`red`/`total` change on any dump** (criterion 3) — that would mean the fix leaked
   into the counting key.
3. ⛔ **Any event onset moves** (criterion 4).
4. ⛔ Do not touch `debounce_shots`' selection logic, `MARKER_MIN`, `MIN_PELLETS`/`MAX_PELLETS`,
   `band_hi`, `max_pellet_frames`, or `count-pellets.py`'s counting code.

## 7. Result

**2026-08-04 — LANDED (`a662b842`). Full narrative: `docs/probe-runs.md` §24.**

All seven §4 criteria MET. **Zero fixtures moved.** Exactly one shot changed across 848 — the
pre-declared §5 exception (`h4-marciana-structural` event #56: `red` 0→1, `total` 4→5, `core`
false→true, **onset unchanged**). `white`/`red`/`total`/`valid` diffs are **0 on all 5 dumps**;
`totalShots` unchanged on all 5. Gates: 25 selftest arms, `verify.sh`, `npm run typecheck` all green.

⚑ The marker-divergent frame counts (82/146/230/204) **reproduce §11I's table exactly** by a
different method — independent corroboration the fix hits precisely the intended population.

⚑ **§24D is the finding that outlives this landing:** the flipped event spans f1565, where §15
established opencv's `marker = 3` is 1 real marker + 2 UI-banner glyphs. `MARKER_MIN = 2`, so banner
glyphs alone raise a core-hit flag. The selection is now faithful; the **marker semantics are not**,
and the old array-order bug was accidentally masking that. **New open item, deliberately not fixed
here.**
