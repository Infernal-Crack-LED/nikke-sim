# 2026-08-10 — Faithfulness pass, phase-4 batch 3 (6 units)

> Six parallel per-unit reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4): `ether`, `eunhwa`, `himeno`,
> `signal`, `mica`, `crow` — the "records the same shape" secondary list + the stale-phrase
> carriers queued by batches 1–2. Applied = the owner-ruled pattern classes (2c DEF ▼
> encodes verified against the kit SSOT; `burstDesc` tags per the 2026-08-10 scope-string
> ruling; falsified prose). Everything else recorded here, findings-only.

## Applied this batch (per-unit specs green at each step)

- **DEF ▼ encodes (kit-verbatim, 2c ruling) — 7 lines across 5 units.** Every carrier claim
  was verified against `data/characters.json` kit text (the cocoa lesson), and the
  "records the same shape" list turned out to hold REAL carriers:
  - `signal` S1 −5.94/5s (`hitCount:60 → enemy` — the kit's own 60-hit trigger; new block)
    AND burst −12.34/10s (rider after the 229.22 flatDamage, kit-order). New G1 cadence +
    G4 pins; the every-buff guards rewritten to admit exactly the known forms.
  - `himeno` S1 −6.94/3s (`shotFired → enemy` — clause word-identical to frima's applied
    batch-2 precedent; no stack clause). Three absence-pins rewritten; new per-shot cadence
    pin (fixture B).
  - `ether` S2b −9.38/6s: SIBLING `interval:13 + fbGate:'inFb' → enemy` block — the
    "Affects the same enemy unit(s)" clause is anaphoric to the damage block's 13s
    activation and "Activates during Full Burst" is the engine's `fbGate` primitive (clay
    precedent). **Trigger-shape fork recorded** (⚑ in her note): the `fullBurstEnter`
    alternative (refresh per FB entry, ada/kurumi convention) is defensible; the shapes
    differ materially only at the web DEF basis. The interval+gate primary follows the
    override's own settled 13s trigger-identity ruling. E4 rewritten with a
    proper-subset pin proving the gate bites; E5 structural pins updated.
  - `eunhwa` S2 −29/5s (`lastBullet → enemy` — ludmilla's applied shape) AND burst
    −2.43/15s (rider after the 85.62 flatDamage). The two shaves SUM while overlapping
    (distinct slot keys — kit-faithful). Three RED pins rewritten; new dry-fire cadence +
    nuke-frame pins; the pre-existing eslint unused-var fixed with the underscore idiom.
  - `mica` burst −13.32/5s: SIBLING `burstCast → enemy` block (anis precedent — keeps the
    M6 flatDamage-keyed trigger patcher surgical). M7 rewritten with cast-frame pins.
- **`burstDesc` tags (scope-string ruling) — 4:** `crow` 'singleEnemy' ("the enemy with
  the highest final ATK", 915.75%); `signal` 'allEnemies' ("enemies within attack range",
  229.22%); `eunhwa` 'allEnemies' ("10 enemy unit(s) with the highest final ATK", 85.62%);
  `mica` 'allEnemies' ("Affects all enemies" — the literal clause, 152.22%). `himeno` and
  `ether` have no burst damage line — nothing to tag. All dormant (no amp carrier shares a
  fixture or graded comp).
- **`crow`: no DEF ▼ encode — correctly.** Her only enemy line is the Full-Burst-entry
  ATK ▼ 19.93%, which stays dropped (no incoming-damage model); prose re-based off the dead
  "DEF=0" wording onto the no-incoming-damage rationale, with `cocoa` as the clean ATK▼
  precedent (the old `exia` citation inverted when exia encoded).
- **Falsified/stale prose corrected in all 6 overrides + specs**: the "admits only
  damageTakenPct/distributedDamagePct" class, the extinct engine-comment quote ("…don't
  affect our damage with DEF=0"), "DEF=0 basis" claims (incl. one inside a crow test
  TITLE), two provably-drifted bare `sim.ts:<line>` citations in crow's prose (2295 →
  gating code, 3930 → SG pellet code), inverted precedent citations, retired/renumbered ⚑
  flags (signal, mica, himeno, ludmilla-style), FROM-SCRATCH build-history openers and
  reviewer-provenance narration (2026-07-22 current-state ruling), and the anis-class
  "no attacked-count trigger primitive" contradiction in mica's spec header (the
  primitive exists — makima/yulha).
- **`scripts/tests/engine/enemy-def-debuff.test.ts` header fixed** — the channel-math
  owner file itself still claimed "bossDef = 0 short-circuits — provably inert on the
  graded basis"; now states the 140 basis. Neither prior batch caught it.
- Mirrors regenerated: `data/kit-status.json`, `docs/unmodeled-entries-review.md`
  (421 → 414 entries; 7 retired by the encodes), generated censuses (defPct carriers
  28 → 32).

## Cross-cutting findings (STOP-AND-SURFACE — owner)

1. **Batch-2's "DEF ▼ carrier set COMPLETE" claim was an under-count** (superseded in
   place in DECISIONS). The F4 secondary list ("records the same shape") held four real
   kit-carriers — `signal` (×2 lines), `himeno`, `ether`, `eunhwa` (×2) — and a kit-text
   census over all of `data/characters.json` (eunhwa's reviewer) found **`belorta`**
   (S2 −3.52/5s), an override-carrying unit on no list anywhere. Both census directions
   have now failed once (cocoa over-count, this under-count); the kit-text grep is the
   only sound method. `belorta` encodes at her own phase-4 review; `centi`, `product-23`,
   `trony` also carry DEF ▼ kit lines but have no overrides (nothing to encode until they
   do).
2. **The stale-phrase sweep list was incomplete again, two new ways:** `jackal`, `quiry`,
   `ram` carry the "DEF=0"/"admits only" phrase class (crow's reviewer, grep-keyed) and
   were on nobody's list; AND a line-wrap in `mica.test.ts` defeated the exact-phrase grep
   entirely ("admits only / damageTakenPct" split across comment lines — mica's reviewer).
   Sweep greps must be whitespace-normalized or per-word. `jackal`'s note also cites "crow
   precedent" wording this batch deleted — her review should re-base it (her kit-status
   mirror at ~3387 regenerates with her fix).
3. **`scripts/kit-autonomy/**` archives carry the stale phrase too** — mica's reviewer
   flags them as presumably CHANGELOG-class provenance (exempt from current-state
   deletion); worth one explicit ruling so future sweeps skip them deliberately rather
   than silently.

## Recorded, not applied (per-unit follow-ups)

- **`ether`:** the trigger-shape fork (interval+`fbGate` vs `fullBurstEnter`) — the ⚑ in
  her note carries the discriminating measurement recipe (time the DEF ▼ icon against S2
  damage ticks in a focus recording); re-shape if measured. First precedent for the
  "same-enemies + during-Full-Burst" sub-block class.
- **`signal`:** her note's SMG uptime arithmetic corrected in passing (nominal 24/s →
  effective 20/s, the datamined-nominal-vs-effective convention; 60 hits ≈ 3.0s not 2.5s).
- **`mica`:** S1 attacked-20 stays unmodeled; same encode-consistency candidate as anis
  batch-2 (makima/yulha encode identical shapes, damage-inert either way) — recorded only.
- **`crow`/`eunhwa`/`himeno`:** clean beyond the applied set.

## Batch stats

6 units reviewed / 7 DEF ▼ encodes on 5 units + 4 burstDesc tags + falsified-prose fixes in
6 overrides + 6 specs + 1 engine-test header / 3 cross-cutting + 4 per-unit findings
recorded. DEF ▼ carrier state after batch 3: every reviewed kit-carrier encodes;
**`belorta` is the sole known override-carrying remainder** (queued for her own review);
`mast` stays unmodeled (flat caster-DEF-basis shave — second-carrier rule).
