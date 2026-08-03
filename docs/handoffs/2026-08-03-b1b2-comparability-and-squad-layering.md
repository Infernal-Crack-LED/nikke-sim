# Handoff — B1/B2 cross-board comparability + the `noop-rouge-b1` squad layering

> Opened 2026-08-03. Two unrelated leftovers pulled out of `QUEUE.md` so they can be picked up
> in a dedicated session. Both are FINDINGS-ONLY as written: neither has an owner ruling yet,
> and item 1 turns out to be mostly a documentation task rather than the reconciliation its
> old queue entry implied.
>
> Neither is touched by the 2026-08-03 overload work (PR #66). That matters for item 1 — see
> the note at the end of it.

---

## 1. B1/B2 DPS board vs the B3 DPS chart — what is actually comparable

**Old queue framing:** "reconcile / document cross-board comparability against the B3 DPS chart
Solo cells (`bossDef`, `rangeBonus`, `durationSec`)."

**⚠ Its cited context doc does not exist.** `docs/handoffs/closed/2026-07-26-dps-ranks-b1b2.md`
is a dangling pointer (QUEUE.md claimed a 2026-08-02 audit repaired those; this one survived).
Do not go looking for it. The live sources are `docs/data/rank-boards.md` and the two code
paths below.

### The three named fields already agree — verified in code, 2026-08-03

| field         | B1/B2 board (`src/ranks/b1b2dps.ts:295-307`) | B3 DPS chart (`src/dpschart/matrix.ts:502-515`) |
| ------------- | -------------------------------------------- | ----------------------------------------------- |
| `bossDef`     | `0`                                          | `0`                                             |
| `rangeBonus`  | `true`                                       | `true`                                          |
| `durationSec` | `180`                                        | `180`                                           |
| `level`       | `400`                                        | `400`                                           |
| `copies`      | `0` (per-unit stars/core win)                | `0` (per-unit stars/core win)                   |
| `doll`        | `false`                                      | `false`                                         |
| `focusSlug`   | tested unit                                  | tested unit                                     |

So the reconciliation the queue asked for is **already true**, and the remaining work is to say
so in `docs/data/rank-boards.md` — plus decide what to do about the differences that are real.

### What actually differs (this is the substance)

1. **No investment axis on the B1/B2 board.** It hardcodes `ol: 'base5'` and no cube
   (`b1b2dps.ts:258`, `:302`). The DPS chart has three investment tiers, and its `8of12` /
   `12of12` tiers add the "Other" cube at L10/L15 (`matrix.ts:261-264`) and overload lines.
   ⇒ **A B1/B2 number is comparable ONLY to a DPS-chart `scope` cell.** Anyone reading a B1/B2
   DPS beside a 12/12 chart row is comparing different accounts. This is the headline to
   document.
2. **Core exposure is binary, not ternary.** B1/B2 resolves `coreHitRate` as
   `coreStr === 'c100' ? 1 : 0` (`b1b2dps.ts:291`); the chart carries `c0 / c50 / c100` via
   `CORES[].exposure` (`matrix.ts:510`). The B1/B2 board has no `c50` row.
3. **Different teams by construction.** The chart assembles one of five named frameworks
   (`assembleTeam`); B1/B2 builds its own control team plus partner profiles
   (`b1b2dps.ts` `buildTeam` / `PARTNER_PROFILES`). Not a defect — a B1/B2 unit cannot be
   ranked in a framework designed around a B3 carry — but it is the reason the two boards can
   never be merged into one ordering.

### Suggested shape of the work

- Document 1–3 in `docs/data/rank-boards.md` as an explicit "what these boards do and don't
  share" section, since the question keeps recurring.
- Owner decision, one call: is the missing `c50` row on the B1/B2 board worth adding for
  symmetry, or is binary core exposure deliberate there? (Cheap either way — it is one
  ternary in `b1b2dps.ts:291` plus a cell id.)
- An investment axis on the B1/B2 board is a much larger ask; recommend NOT doing it unless
  the owner wants it, and instead documenting the scope-only comparability.

### Note — the 2026-08-03 overload change did not touch this board

`OL_TIER` / `atOlTier` (`src/dpschart/matrix.ts`) stamp the **investment tiers**, and
`src/ranks/*` has no `invest:` axis at all — the B1/B2 board never carries overload lines, so
its numbers are unchanged by PR #66. Worth knowing before someone attributes a shift to it.

---

## 2. `noop-rouge-b1` in `src/data/squads.ts` — layering cleanup

**Origin:** a `claude-fable-5` code-review NOTE (2026-08-02, verdict CLEAN, findings-only). The
last of that review's three items; the other two landed in `09f3702c`.

**The observation.** `src/data/squads.ts` is documented as curated GAME TRUTH — in-game squad
membership, hand-maintained because `characters.json` has no squad axis. It currently also
holds one synthetic:

```ts
// src/data/squads.ts:26
'noop-rouge-b1': 'Blanc Noir Rouge',
```

That entry exists so the buffer board's `w/ Rouge` duo profile satisfies `blanc`'s same-squad
burst-CDR gate — `src/ranks/buffer.ts` `DUO_BUFFER_PROFILES.blanc` pairs her with
`NOOP_ROUGE_B1` (`src/dpschart/noop.ts:105`). So a **ranks-layer** concern is written into a
**game-truth** file.

### Why this is not a mechanical move

`squadOf` is consumed by the ENGINE at sim setup (`src/engine/sim.ts:723`, `:734`) and by
`scripts/validate-overrides.ts:352`, both via a static import of the module-level map. Moving
the synthetic out therefore needs a registration mechanism, and the obvious one has a real
hazard:

- **Option A — `registerSquad(slug, squad)` exported from `squads.ts`, called at module load by
  the ranks layer.** Keeps the curated map pure. But the engine's behaviour then depends on
  IMPORT ORDER: any path that sims `blanc` without having imported `src/ranks/buffer.ts` gets
  an unregistered synthetic, the `sameSquad` gate FAILS CLOSED (by design —
  `sim.ts:733-734`), and her burst CDR silently never fires. Silent understatement, no error.
- **Option B — carry squad membership on the prepared unit / config** instead of a global
  lookup, so the ranks layer passes it in explicitly. Removes the global and the import-order
  hazard entirely; a larger change touching `prepare.ts` + the engine's block filter.
- **Option C — leave it.** One synthetic in the map, already carrying an explanatory comment.
  The cost is conceptual purity only.

**Recommendation: A is the trap, and C is defensible.** If the cleanup is done at all, B is the
one that actually fixes the layering rather than relocating it. Get an owner call before
building B — it touches the engine's block filter, which is a protected path.

### The guard that already exists

`scripts/tests/ranks/buffer.test.ts:290` asserts the same-squad CDR gate opening on the duo
profile. A botched migration that leaves the synthetic unregistered should fail there — verify
that it does (run it against a deliberately-unregistered synthetic) BEFORE trusting it as the
safety net, since a test that only ever runs after `buffer.ts` is imported may not discriminate
the import-order failure at all.

Also pin: `blanc` is the ONLY unit with a duo profile using a synthetic partner
(`grep -rn "noop-rouge-b1" src` — two references repo-wide, both blanc-side), so the blast
radius of either option is one board row.
