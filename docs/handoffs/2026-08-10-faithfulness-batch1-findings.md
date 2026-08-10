# 2026-08-10 — Faithfulness pass, phase-4 batch 1 (6 units)

> Six parallel per-unit reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4): `viper`, `phantom`, `novel`, `exia`,
> `soda-twinkling-bunny`, `isabel`. Applied = the already-owner-ruled pattern classes (DEF ▼
> encodings per the 2c ruling; `burstDesc` tags after per-line kit verification; prose whose
> claims those encodings falsified). Everything else is recorded here, findings-only.

## Applied this batch (full gate green; specs 127/127)

- **DEF ▼ encodings (kit-verbatim, per the 2c owner ruling):** `novel` −7.05/5s on his
  `interval:10` block; `exia` −13.77/5s (new `lastBullet` block gated `resourceGate
{hackingCode, min:1}` — the kit's own "in Collect Hacking Code" clause, no proxy) + burst
  −2.71/5s; `viper` −19.83/10s (own `burstCast` block); `phantom` −32.19/5s riding the Calling
  Card-inflicting block (load-bearing array order preserved). All sub-0.1% at the graded DEF-140
  basis; live at web raid defaults. New pins: novel N6, exia X10, viper V7 (rewritten from the
  unmodeled-pin), phantom needed none (nothing pinned `defPct`).
- **`burstDesc` tags (kit clause verified to govern the damage line):** `novel` 330.61%
  `'singleEnemy'`; `phantom` 1457.28% + `soda-twinkling-bunny` 628.7% + `isabel`
  149.85/299.7/349.65 (escalating steps — engine/validator walk them) `'allEnemies'`. All
  byte-identical today (no amp carrier shares their comps/casts); dormant-live per the amp
  convention.
- **Falsified-prose corrections** in all four DEF-encoded overrides (the "engine drops enemy DEF
  debuffs" / "admits only damageTakenPct" narration class), plus exia's spec-header X2/X7 flip
  and phantom's `durationShots: 2`→`1` narration fix.
- **exia X4 isolation:** the new shave moves `baseAtk` during post-`lastBullet` windows at the
  DEF-140 harness basis, which contaminated X4's ATK-ramp read — X4's arms now strip the defPct
  blocks (the shave has its own X10 pins). A concrete instance of why observable isolation
  matters when the DEF channel goes live.

## Cross-cutting findings (STOP-AND-SURFACE — owner)

1. **The `bossDef` 140-vs-0 doc drift (found independently by two reviewers, verified by the
   orchestrator).** `scripts/lib/scope-lock.ts` pins `bossDef: 140` ("measured; always on",
   owner 2026-07-15) and regression/control/experiment/vitest-harness all use it un-overridden —
   while `docs/data/damage-calculation.md` §1a ("bossDef = 0 at scope lock"), the §5a worked
   example, the old bucket-matrix §3 line, QUEUE, and `validate-overrides.ts`'s smoke cfg all
   say 0. Code wins per the authority order; the docs claiming 0 are the drift. Corrected this
   session: my own 2c prose (DECISIONS correction clause, `bossDefNow` comment, trap 4, the
   doc-drift routing text). **NOT corrected (owner call on wording + the /mechanics-doc-upkeep
   surface):** damage-calculation.md §1a/§3/§5a, and whether validate-overrides' smoke should
   move to 140. The two owner-attributed records (140 "always on" vs "0 pinned approximation")
   want one explicit ruling so this stops regenerating.
2. **The stale "admits only damageTakenPct/distributedDamagePct" phrase survives in ~6 more
   overrides** (`mica`, `signal`, `himeno`, `crow`, `eunhwa` + kit-status/unit-pages mirrors) —
   fix as each passes review, or one mechanical sweep.
3. **`docs/engine-modeling-gaps.md` theme 3 lists `soda-twinkling-bunny` as a baked
   Golden-Chip time-average — stale:** the live model is the dynamic `perResource` pool (landed
   2026-07-17). Her theme-3 entry and the do-not-double-correct list need the refresh.

## Recorded, not applied (per-unit follow-ups)

- **`viper`:** burst nuke sits under "Affects **1 designated** enemy unit(s)" — not the amp's
  literal "Affects 1 enemy unit(s)" scope string. Logged as a tag candidate pending a ruling on
  whether "designated" descriptions count in-game; untagged (kit-faithful default).
- **`isabel`:** substantial note-hygiene rewrite drafted by the reviewer (history narration ×6,
  four internal contradictions incl. a stale DOT_CRIT-off attribution, the U27 far-cell nit,
  an F6 class label) — measured values untouched; apply on her next touch.
- **`soda-twinkling-bunny`:** note tail still narrates the superseded flat-42 model as live +
  caveats carry stale grade numbers (0.954–0.974 vs the current 0.77–0.815). COLD triage
  hypotheses (H1 SG cone coupled re-fit = primary, discriminator exists in the labeled fixture;
  H3 the sim over-generating her bursts flatters the ratio; H4 the ~15–20% unexplained
  post-2026-07-17 move wants a DECISIONS/board-history lookup before any tune). Also: her
  kit-status "burst nuke lacks noFb flag" finding is stale (noFb is validator-rejected;
  burst-cast exemption is structural).
- **`exia`:** spec header X3 comment claimed the clamp "is NOT encoded" while the assertions
  assert it — fixed the X2/X7 lines this batch; the X3 clamp comment still stale (minor).
- **`novel`:** same-frame ordering ⚑ — each S1 proc's own hit resolves before the fresh shave
  (kit-order effects); unmeasurable at graded basis, small directional choice at web basis.
- **`phantom`:** informational — his S2 consume rider is a `shotFired` flatDamage, i.e. in the
  population of the logged (unreproduced) double-emit entry; nothing unit-actionable.

## Batch stats

6 units reviewed / 4 DEF ▼ encodes + 6 tag enactments + 4 prose corrections applied / 3
cross-cutting + 6 per-unit findings recorded / 0 engine or shared-doc edits from sweep findings
(the basis correction rode its own commit under the 2c authorization). Remaining DEF ▼ carriers
after this batch: `anis`, `elegg`, `frima`, `ludmilla`, `marciana-marine-study` (+ `mast`
deferred; `cocoa`, originally on this list, was struck by her batch-2 review as a prose-grep
false positive — her only enemy-targeted line is ATK ▼). All five encoded in batch 2
(`2026-08-10-faithfulness-batch2-findings.md`).
