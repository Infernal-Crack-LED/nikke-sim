# Handoff — burst-gauge investigation of the rl3-vs-board rank outliers

> Context-packed for a fresh session. **STATUS: FINDINGS-ONLY investigation — nothing here enacts a
> model change.** Spun out 2026-07-27 from the burst-gen board work that fixed `flora`/`rosanna`/
> `sugar` (missing gauge rows + weapon-aware fallback) and removed the focus bonus from the board.
> Those fixes closed the worst artifacts; this is the remaining triage of WHY the simulated board
> and the raw `rl3` column still disagree. Per-unit enactments that come out of it go through
> `/kit-tdd` or `/scientific-method` — do NOT bulk-land. Sibling thread (a concrete known fix, not
> an investigation): `docs/handoffs/2026-07-27-focus-charge-gauge-per-unit.md`.

## The ask

Triage every `|Δrank| ≥ 10` outlier in **`docs/rl3-burstgen-rank-comparison.md`** into one of:

1. **Legitimate** — the sim correctly includes a kit/rotation gauge source the raw `rl3` weapon
   snapshot can't see (skill-gen procs, DoT ticks, team-ammo fills, 180s steady-state vs 3s opener).
2. **Comparison artifact** — `rl3` is a 3-second arena-opener snapshot at base/unfocused values;
   its quirks (e.g. launcher 4-shot opener) are not sim errors.
3. **Modeling gap** — the sim is missing or mis-valuing a real gauge source (a candidate for a
   per-unit fix, gated).

The goal is a per-outlier verdict table, not code. Enactments are separate, gated follow-ups.

## The data + how to refresh it

- `docs/rl3-burstgen-rank-comparison.md` — regenerate with `npx tsx scripts/rl3-burstgen-compare.ts`.
  Current run: **81 units, 53 with |Δrank| ≥ 10** (24 rl3-over-performers, 25 sim-over-performers).
- `rl3` decoded in `docs/data/burst-gauge.md` §7: gauge generated in the first ~3s of an arena
  opener, **base (non-boss), unfocused**, no kit. The sim board is now ALSO unfocused (2026-07-27),
  so the two are more apples-to-apples than before — residual divergences are cadence/kit/artifact,
  not the old focus mismatch.
- ⚠ `scripts/rl3-burstgen-compare.ts` does NOT load the no-op control overrides
  (`noop-b1-ar`/`noop-b3-mg`) the way `scripts/build-burstgen.ts` does, so its absolute gauge%/s
  differ slightly from the official `web/public/burstgen.json`. Rankings/divergences are internally
  consistent; align the two scripts before trusting absolute numbers.

## Already explained — do NOT re-investigate

- **`flora` / `rosanna` / `sugar`** — were the #1/#2 artifacts (missing gauge rows → flat-40
  fallback). FIXED 2026-07-27 (rows added; flora +73→+7, sugar −72→−13). Their residual small Δ is
  legitimate kit gauge over the 180s window.
- **`anis-star`** (rl3 #3, rl3 53.4, sim #47, Δ−44) — `burst-gauge.md` §2: her solo measurement
  pinned the standard 280 shot row; her battery reputation is **Skill-1 proc generation + a +6% team
  fill aura** that the synergy aggregate folds into rl3 but the no-op board can't see. Verdict:
  legitimate-but-unmodeled kit gauge (a candidate source if her board reading ever matters).
- **Profiled units** — `little-mermaid` (+59) and `cinderella-crystal-wave` (+58) run with MG
  teammates (team-ammo fill scales with team burn); the profile flag explains the jump.
- **Standard-launcher rl3 quirk** — `burst-gauge.md` §7: launchers uniformly read rl3 = 4 shots
  (first charge completes during battle start), a comparison artifact inflating rl3 vs the sim.

## The outlier clusters to work (seeded hypotheses — VERIFY, don't trust)

**A. RL "clip-reload" family sits at the BOTTOM of the sim board.** `arcana` (sim 1.65%/s, #83),
`anchor-innocent-maid` (1.75, #82), `diesel-winter-sweets` (1.76, #81), `mint` (1.82, #80), `ada`
(2.20, #78) — all RL, all rl3 mid-table (16.8–18), all Δ ≈ −61 to −70. These are the lowest
gauge/sec on the whole board, below even unfocused RL base rate. **Question:** is RL steady-state
cadence modeled correctly, or is this the ⚑ datamine cadence tuple (chargeFrames/reloadFrames
unreliable) under-firing their shots? Separate the rl3 4-shot-opener artifact (legitimate) from a
possible sim cadence under-count (a gap). `burst-gauge.md` §2 notes the clip-reload family runs
650–720 per trigger — check those rows are present and the cadence feeds them.

**B. SG units under-generate in sim vs rl3.** `arcana-fortune-mate` (Δ−42), `anis-sparkling-summer`
(−40), `isabel` (−36), `guilty` (−33), `brid-silent-track` (−20), `leona`/`naga` (−19),
`soline-frost-ticket` (−16). rl3 counts SG at full pellet value (per-pellet × 10, point-blank
opener); the sim multiplies SG gauge by a **landing fraction** (`sgGaugeFrac` in `firePull`,
range-dependent — out-of-near pellets that miss generate nothing). **Question:** does the no-op
team's range script push SG out of near band, deflating their gauge unfairly? Connects to the
SG-landing geometry thread (QUEUE; `marciana` 0.850 cold) — the gauge landing-fraction and the
damage landing-term may share a root cause.

**C. Catalogued-but-unmodeled skill-gen sources.** `burst-gauge.md` §2 lists per-unit generation
quirks the synergy `special_burst_gauge` annotations carry that the sim doesn't yet model: Ein's orb
(560 every ~2.8s — partially the source of her residual), Helm's flat 1431 (NOW modeled),
Liberalio + Snow White: Heavy Arms per-shot-sequence bonuses, Anis: Star battery+aura (cluster
anis-star above), Trina/Laplace/A2 battle-start battery fill. Each is a legitimate sim-over- or
rl3-over-performer explanation; verify case-by-case against §2 before labeling.

**D. sim-over-performers with kit gauge (mostly legitimate).** `bready` (+31, Aftertaste DoT ticks
→ `skillGauge`), `red-hood` (+29), `neon-vision-eye` (+32), `crown` (+40), `rosanna-chic-ocean`
(+25), `velvet` (+22). These rank above their raw rl3 because the sim includes kit gauge rl3 ignores.
Confirm each has a real modeled gauge source (DoT/flatDamage/profile) rather than a generation
over-count.

## Suggested first moves

1. Refresh the comparison doc and reconcile the compare-script no-op-override gap (above) so
   absolute numbers match the official board.
2. Cluster A first (biggest |Δ|, and it's a possible cadence gap not just an artifact): pull one
   RL unit's sim shot count over 180s vs its datamine cadence, and vs its rl3-implied opener count.
3. Cluster B: A/B the SG units at a fixed `near` band (`cfg.bossRange`) to isolate the
   landing-fraction term from the range script.
4. Write the per-outlier verdict table back into THIS doc (or a closed handoff) as findings land.

## Discipline

- **Findings-only.** No constant/default/override changes here; those are gated per-unit
  (`/scientific-method` for engine, `/kit-tdd` for a kit gauge source) and each needs its own
  measurement or datamine provenance.
- **Reuse before you derive** — `burst-gauge.md` §2/§7 already catalogue most of the per-unit
  explanations; check there before re-deriving any unit's gauge anatomy.
- **One unvalidated fact is not a mandate** — a single outlier's root cause does not justify a
  broad gauge-model rewrite; propose, don't enact.

## Cross-references

- `docs/rl3-burstgen-rank-comparison.md` (the outlier list; `scripts/rl3-burstgen-compare.ts`)
- `docs/data/burst-gauge.md` §2 (per-unit values + skill-gen quirks), §7 (rl3 decode + launcher artifact)
- `docs/data/rank-boards.md` (board methodology, now unfocused)
- `docs/handoffs/2026-07-27-focus-charge-gauge-per-unit.md` (sibling concrete-fix thread)
- SG-landing geometry thread in `docs/handoffs/QUEUE.md` (cluster B overlap)
