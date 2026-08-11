# Faithfulness phase-4 BATCH 7 — start here (written 2026-08-10, for a fresh session)

> **You are continuing an in-flight sweep.** Batches 1–6 + a remainder pass are done. This doc is
> the full entry point. Read the plan-of-record (`2026-08-10-faithfulness-pass-audit.md` §2
> phase 4) for the 11-item checklist itself; everything else you need is here.
>
> **The batch-6 START-HERE doc is SUPERSEDED by this one — do not work from it.** Its §3 table's
> tag column and its rules 1–2 are stale (the tag question is now settled by a census, not by
> judgement). Its rules 3–6 still bind and are restated below.

**Slug discipline.** Every unit below is named by its EXACT slug. Weapon/element verified against
`data/characters.json` 2026-08-10 — do not trust a remembered pairing, five of eight were wrong on
the first draft of this very paragraph:

| slug       | is                | NOT                                              |
| ---------- | ----------------- | ------------------------------------------------ |
| `noir`     | SG/Wind           | —                                                |
| `privaty`  | AR/Water Treasure | `privaty-unkind-maid` (SG/Electric)              |
| `alice`    | SR/Fire           | `alice-wonderland-bunny` (SMG/Water)             |
| `ada`      | RL/Electric       | —                                                |
| `mint`     | RL/Iron           | —                                                |
| `prika`    | SR/Water          | —                                                |
| `rouge`    | SR/Electric       | —                                                |
| `chisato`  | SMG/Iron          | —                                                |
| `red-hood` | SR/Iron           | **`rapi-red-hood` (MG/Fire) — a DIFFERENT unit** |

Hyphenated slugs in the table below (`quency-escape-queen` SMG/Water, `ade-agent-bunny` SR/Iron,
`guillotine-winter-slayer` AR/Water, `mast-romantic-maid` MG/Water, `mihara-bonding-chain`
MG/Fire, `snow-white-heavy-arms` SR/Water) are already unambiguous.

## 0. Tree state before you touch anything

- **Worktree:** `/Users/maxwellsutton/nikke-sim-wt-faithfulness`, branch `fix/faithfulness-pass`.
  Do the work HERE, not in the shared main tree (CLAUDE.md constraint 8).
- **A PR for the batch-4→6 slice was opened 2026-08-10.** If it has merged, `git pull` main into
  a fresh branch before starting; if not, keep committing on this branch.
- `bash scripts/verify.sh` is green and the board is **`within ±3%: 7 | ±5%: 14 | ±8%: 23 |
worse: 22`, 142 datapoints / 45 units**. Every change in batches 4–6 was board-byte-identical,
  so if your first board read differs from that, something moved before you started — find out
  what before doing anything else.
- Husky hooks DO run in this worktree (`.husky/_` present).

## 1. What changed under you this session (read this or you will redo it)

The burst-amp scope question that blocked batch 6 got **three owner rulings**, all enacted:

1. **LITERAL-ONLY** — an amp qualifies a damage block only if the block's own clause contains the
   exact string the amp quotes. 13 units untagged, 3 true carriers found.
2. **BLOCK-LEVEL** — the literal must be on the SAME `■` block as the damage line.
3. **THE STRAY ARTICLE IS FORGIVEN** — "Affects **the** 1 enemy unit(s)…" qualifies; the game is
   ASSUMED to key off an internal targeting id. This one is an assumption, not a measurement, and
   is logged in QUEUE as a standing item to confirm.

**⇒ THE `burstDesc` TAG QUESTION IS NO LONGER A JUDGEMENT CALL. Do not reason about it per unit.**
Run `npx tsx scripts/census-burst-amp-scope.ts` — it decides every unit from kit text.
`--check` gates over-tagging, `--under` emits the worklist, `--near-miss` the edge cases. The
roster invariant is pinned in `scripts/tests/census-burst-amp-scope.test.ts`. **The
untagged-carrier debt is CLEARED** (40 instances live), so if `--under` prints anything, it is a
NEW gap, not known debt.

Full record: [burst-amp literal-scope findings](2026-08-10-burst-amp-literal-scope-findings.md),
[batch-6 findings](2026-08-10-faithfulness-batch6-findings.md), DECISIONS (top 4 entries).

## 2. Rules that bind you

1. **Batch-and-stop, findings-only.** Per-unit output is findings. You may apply only the
   already-owner-ruled classes: `burstDesc` tags (now census-decided), enemy DEF ▼ encodes, and
   falsified/stale prose. Anything that moves the board stops and gets surfaced with a
   measurement, never enacted mid-sweep.
2. **"Board-inert" is not "inert" — check the FIXTURES too.** A change can be byte-identical on
   the board and still break another unit's spec, because `controlComp()` seats
   liter/crown/`<unit>`/helm.
3. **A carrier census must check LINE + TRIGGER + GATE.** A grep finds the line, not its gate
   (`belorta`'s DEF ▼ is gated on ">4 enemy units", unsatisfiable solo).
4. **Sweep greps must be whitespace-normalized and cover BOTH trees** (`src/skills/overrides/*`
   AND `scripts/tests/units/*`).
5. **Verify claims before writing them down.** This is not boilerplate — see §5.

## 3. The 15 remaining graded-comp units

`hist` = count of history/inertness phrases in note+caveats (the §4 detector's cheap proxy — a
high number is a strong prior for a falsified claim, not proof of one).

| unit                       | comps | board      | note len | hist | notes                                                                                 |
| -------------------------- | ----- | ---------- | -------- | ---- | ------------------------------------------------------------------------------------- |
| `snow-white-heavy-arms`    | 4     | 0.954 COLD | 4,864    | 4    | most comps in the slice                                                               |
| `privaty`                  | 3     | 1.120 HOT  | 3,101    | 4    | **hottest**; tagged this session, checklist NOT run                                   |
| `chisato`                  | 3     | 0.968 COLD | 5,684    | 1    | F7 ramp-bake + F8 swap-economy carrier                                                |
| `rouge`                    | 3     | 1.027      | 4,230    | 3    | shares N3 with `trina`                                                                |
| `noir`                     | 2     | 0.884 COLD | 5,037    | 4    | **coldest**; tagged this session, checklist NOT run                                   |
| `mast-romantic-maid`       | 2     | 0.951 COLD | 1,940    | 2    | F7 ramp-bake carrier                                                                  |
| `red-hood`                 | 2     | 0.970 COLD | 2,634    | 2    | one of the 5 lifesteal non-emitters (see §4)                                          |
| `ada`                      | 2     | 0.995      | 1,530    | 1    | smallest note in the slice                                                            |
| `mihara-bonding-chain`     | 2     | 1.034 HOT  | 2,920    | 2    | burst damage is a `dot`; her clause is NON-literal, so the engine gap is MOOT for her |
| `quency-escape-queen`      | 2     | 1.041 HOT  | 4,069    | 1    | tagged this session, checklist NOT run                                                |
| `alice`                    | 1     | 1.101 HOT  | 1,236    | 4    | high hist-density for a short note                                                    |
| `prika`                    | 1     | 0.890 COLD | 6,992    | 6    | **highest hist count**; 5e trio (cross-unit event bus) — held                         |
| `mint`                     | 1     | 1.015      | 6,378    | 2    | 5e trio (XOR toggle) — held                                                           |
| `ade-agent-bunny`          | 1     | 0.964 COLD | 2,757    | 2    |                                                                                       |
| `guillotine-winter-slayer` | 1     | 1.024      | 5,483    | 3    | burst is a `dot` with a QUALIFYING literal → engine-gap blocked                       |

**Three units are PARTIALLY reviewed.** `noir`, `privaty` and `quency-escape-queen` had their
`burstDesc` tags applied and carrier caveats written this session, but the **11-item checklist was
never run on them**. Treat them as unreviewed apart from the tag.

### Suggested batch-7 six

`noir` (0.884, coldest, 2 comps), `privaty` (1.120, hottest, 3 comps), `snow-white-heavy-arms`
(4 comps), `chisato` (3 comps + two F-pattern carries), `rouge` (3 comps), `prika` (highest
hist-density, and 0.890 COLD). That is the board-pain × comp-count × prose-risk product. Swap
`prika` for `alice` (1.101 HOT) if you would rather not touch a held 5e-trio unit.

## 4. Open threads a batch-7 unit will run into

- **`red-hood` is one of 5 lifesteal non-emitters** (`d`, `moran`, `red-hood`, `rem`, `tia` of 13
  carriers). Batch 4 proved the class board-inert for a SELF-scoped lifesteal (a heal fires
  recovery only at its own targets, so it cannot reach an ally-side consumer; a probe emit on
  `moran` moved the board by zero). Check her scope; if self, it is a consistency item, not a fit
  item. **One roster-wide ruling is wanted, not 5 unit-local fixes.**
- **`chisato` / `mast-romantic-maid` are F7 ramp-bake carriers** — flag, never inline-fix, and do
  not double-correct hand-averaged units.
- **`chisato` is an F8 swap-economy unit.** The engine's swap branch reads
  `u.swap.pullsPerSec ?? PULLS_PER_SEC[...]` and never falls back to `u.pullsPerSec`.
- **`mint` / `prika` are 2 of the 5e state-machine trio** — explicitly NOT solvable by one
  registry; leave held.
- **`guillotine-winter-slayer`** carries a qualifying amp literal on a burst `dot`, so she is
  structurally amp-ineligible (engine gap, QUEUE). Nothing to tag; do not try.
- **U28 rider class is OPEN** — `neon-vision-eye`'s "additional damage" modeled as
  `extraHitDamagePct` rather than `flatDamage` (a gauge-economy choice). Owner deferred it
  2026-08-10. **If another unit in your six has the same shape, add it to that one ruling rather
  than fixing it locally.**

## 5. The recurring defect class — it is still the highest-yield finding, and it got worse

Every batch has found **override prose describing a unit that no longer exists**. Batch 6 found
the two worst instances yet, and both were in units nobody had flagged:

- `rapi-red-hood`: 10,135 chars with **three** self-contradictions (a buff described as both
  REMOVED-as-inert and RESTORED; an explosion core fraction both applied and removed; an attach
  core verdict both ways). The shipped model was the later claim each time.
- `grave`: a **three-way** contradiction about ONE item — Prediction-end ammo removal was
  simultaneously "DEFERRED, not yet modeled", "MODELED (R2 closed)", and a live open ⚑. It is
  modeled. Two of the three sat in the ⚑-open list, which is where a reviewer mines for work — and
  the staleness had propagated out to `open-questions` U19 as a live measurement candidate.

**Cheap detector:** grep each unit's note+caveats for `NOT modeled`, `unmodeled`, `no primitive`,
`engine gap`, `dormant`, `inert`, `previously`, `OVERTURNED`, `REMOVED`, `RESTORED`, `DEFERRED`,
`materialized` and check EVERY hit against the shipped blocks. The `hist` column in §3 pre-counts
these for you. It is invisible to every test.

**Also delete history narration outright** (2026-07-22 current-state ruling), even when it is
accurate: an override's prose states the model as it is TODAY. No "previously", no dated verdict
trail, no superseded-value narration. The WHY goes to DECISIONS.

## 6. A hard-won lesson about instruments (batch 6)

The `burstDesc` census was built, pinned, and written into DECISIONS in the first half of the
session — and batch 6's first unit review found **three silent holes in it**, each the same shape:
a unit the instrument could not SEE, reported as coverage.

1. `DAMAGE_LINE` matched only "Deals X% of final ATK", missing "Deals damage equal to…" and
   "Deals continuous damage equal to…" — which produced two WRONG verdicts already published.
2. `stackedNuke` was not counted as burst damage at all.
3. The "this block reuses the previous block's scope" rule matched only `Affects the same
target(s)`, while the localization spells it SEVEN ways.

Every one was caught only because **a naive grep over the raw kit text disagreed with the
instrument**. If you build or extend a census this batch: cross-check it against a dumb grep at
least once, and make the unrecognised-input case LOUD rather than silently defaulting (the census
now prints an unconditional ⚠ for any damage phrasing it does not recognise).

## 7. Procedure per unit

1. Read the kit from `data/characters.json` (the SSOT — never the override's own prose), the
   override, and the unit's spec.
2. Walk the §2-phase-4 checklist (11 items) in the audit doc.
3. Apply only the ruled classes; A/B anything that could move damage; run the unit's spec after
   each change.
4. `npx tsx scripts/validate-overrides.ts <slugs>` — it lints bare `sim.ts:<line>` citations
   (they rot) and echoes caveats.
5. Regenerate mirrors: `npx tsx scripts/kit-status.ts --refresh` then
   `npx tsx scripts/gen-unmodeled-review.ts`.
6. `bash scripts/verify.sh` green + a full `npx tsx scripts/board-read.ts` diff against §0.
7. Write `docs/handoffs/2026-08-10-faithfulness-batch7-findings.md` in the shape of batches 5/6
   (Applied / Cross-cutting STOP-AND-SURFACE / Recorded-not-applied / Batch stats), add a
   DECISIONS entry, update QUEUE.md, commit.
