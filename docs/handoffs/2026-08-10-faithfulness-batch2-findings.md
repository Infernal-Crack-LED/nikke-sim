# 2026-08-10 — Faithfulness pass, phase-4 batch 2 (6 units)

> Six parallel per-unit reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4): `anis`, `cocoa`, `elegg`, `frima`,
> `ludmilla`, `marciana-marine-study` — the remaining DEF ▼ carriers after batch 1. Applied =
> the already-owner-ruled pattern classes (DEF ▼ encodes per the 2c ruling; falsified prose;
> the bossDef-140 basis ruling's stale-claim class). Everything else is recorded here,
> findings-only.

## Applied this batch (per-unit specs green at each step)

- **DEF ▼ encodes (kit-verbatim, per the 2c owner ruling) — 6 lines across 5 units:**
  - `anis` burst −32/5s: SIBLING `burstCast → enemy` block (not a rider — keeps the spec's
    flatDamage-keyed counterfactual patchers surgical). New pin group N4 + STARVED-comp
    silence pin.
  - `elegg` burst −35.64/10s: rider on the BOOM-Install-inflicting `targetStatus` block (the
    kit names the DEF ▼ as the status's content — phantom precedent). E6 absence-pin
    rewritten to assert the encode; the ×1.3564 damageTakenPct trap stays pinned absent.
  - `frima` S1 Sleepy −4 ×5 stacks/10s (`shotFired → enemy`, `maxStacks: 5` — the engine's
    +1-stack-per-application-to-cap + 10s refresh is exactly the kit's stacking semantics)
    AND burst rider −9.86/10s (same block as the nuke, AFTER the flatDamage — kit-order
    effects, novel same-frame precedent). New pins F5 (per-shot cadence) + F6; her Wake-Up
    caveat retargeted (only the max-stack PRECONDITION is proxied now, not the stacks).
  - `ludmilla` S1 −8.4/10s: new `lastBullet → enemy` block (the kit's own trigger; exia's
    applied shape). Her every-buff-targets-a-unit guard rewritten to admit exactly the two
    known forms; new pin L7 (magazine-cycle cadence ~19/180s, boss-held, 10s window). ⚑
    flags renumbered (the old ⚑1 DEF-gap flag retired on encode).
  - `marciana-marine-study` burst −10.56/20s: rider on the Electric-gated High-Risk-Target
    block (kit's own `bossElementGate`). New pin M7 incl. the Fire-boss zero-application
    negative.
- **`cocoa` struck from the DEF ▼ carrier lists in 4 docs** (audit F4, bucket-matrix §5 trap
  4, batch-1 findings, QUEUE) — see cross-cutting finding 1.
- **Falsified/stale prose corrected** in all 6 overrides + spec headers (the "engine drops
  enemy DEF debuffs" / "admits only damageTakenPct" / "bossDef = 0" classes, per the
  2026-08-10 basis ruling), plus: `guilty`'s note (batch-1's first live carrier still claimed
  the "bossDef = 0 graded basis"), the second stale enemy-buff dispatch comment in
  `src/engine/sim.ts` (~2393 — batch 1 fixed the `bossDefNow` comment but missed this one;
  comment-only), anis's note-vs-caveat contradiction on the `attacked` primitive (the note
  claimed it doesn't exist; it does — makima/yulha carry live blocks), and the FROM-SCRATCH
  build-history narration openers (anis, cocoa, frima, ludmilla) per the 2026-07-22
  current-state ruling.
- **`burstDesc` tags: NONE.** Every candidate scope clause in this batch is non-literal (see
  the pending-ruling log below); cocoa's and marciana-marine-study's bursts deal no damage.
- `docs/unmodeled-entries-review.md` + `data/kit-status.json` regenerated (433 → 421
  entries; 12 retired by the encodes).

## Cross-cutting findings (STOP-AND-SURFACE — owner)

1. **The DEF ▼ carrier list contained a prose-grep false positive (`cocoa`).** Her kit's only
   enemy-targeted line is the burst ATK ▼ 13.59% (correctly dropped per the ruling); the
   carrier lists picked her up from her override note's "ATK▼/DEF▼" engine-behavior citation,
   not from a kit line. Verified against the kit SSOT (`data/characters.json` prose + the
   datamined `description_localkey` templates); the other five batch-2 carriers all check
   out. Lesson for any future carrier census: **verify against kit text, not override
   prose.**
2. **A burstDesc scope-string ruling would resolve a whole class.** Five non-literal scope
   clauses are now logged, untagged (kit-faithful default), waiting on one owner ruling on
   whether they count as 'singleEnemy'/'allEnemies' in-game: `viper` "Affects 1 designated
   enemy unit(s)" (batch 1), `anis` "Affects enemies within attack range", `elegg` "Affects
   the enemy nearest to the crosshair", `frima` "Affects 10 enemy unit(s) with the highest
   final DEF", `ludmilla` "Affects 10 enemy unit(s) with the highest final ATK" (+ `exia`'s
   identical highest-DEF clause, untagged in batch 1). All are dormant today (tags are
   byte-identical without an amp carrier in-comp).
3. **The stale-phrase sweep must be grep-keyed, not list-keyed.** `ludmilla` carried the
   "admits only damageTakenPct/distributedDamagePct" phrase but was absent from batch-1's
   ~6-override sweep list; `frima` carried the same falsified claim in different words ("no
   buff/debuff channel feeds it"); `frima` also cited a `damage-calculation.md §enemy-DEF`
   anchor that does not exist (doc-anchor hygiene class — other overrides may cite dead
   anchors). The remaining known carriers of the phrase class (`mica`, `signal`, `himeno`,
   `crow`, `eunhwa` + kit-status/unit-pages mirrors) are still queued for their own reviews.

## Recorded, not applied (per-unit follow-ups)

- **`anis`:** S1 attacked-40 is kept unmodeled on "nothing feeds the trigger" grounds — but
  the `attacked` primitive exists and `makima`/`yulha` encode their identical-shape lines
  kit-verbatim (dormant in production). Encode-consistency candidate, damage-inert either
  way; outside the ruled classes, so recorded only. Minor: her note says "~118k effective"
  where the old test comment said "~100k" for the same 0.04% estimate.
- **`elegg`:** two reviewer-provenance narration mentions remain in her note tail
  (trimmable on next touch, isabel-style); S2a accrual-phasing ⚑2 unchanged.
- **`frima`:** ~8 bare `sim.ts:<line>` citations in her note await the phase-0
  citation-convention sweep (one, `sim.ts:1722`, already drifted); U28-population
  informational (her S1 procs are `flatDamage` — correctly, kit-literal discrete damage).
- **`ludmilla`:** clean beyond the applied set.
- **`marciana-marine-study`:** her review-doc entry at the ≥6-Raptures line pairs with the
  wrong _Why_ caveat — the known `gen-unmodeled-review.ts` note-plumbing artifact (phase
  0.1), no new action.
- **`cocoa`:** exemplary override — never fell into the ally-DT▼→boss-damageTakenPct trap
  (her caveat names it with the correct ~65% magnitude); only prose was fixed.

## Batch stats

6 units reviewed / 6 DEF ▼ encodes on 5 units + 1 carrier-list false-positive strike + prose
corrections in 6 overrides + `guilty` + 1 engine comment / 0 burstDesc tags (5 pending-ruling
scope strings logged) / 3 cross-cutting + 6 per-unit findings recorded. DEF ▼ carrier set now
COMPLETE: every kit-carrying override encodes its line; `mast` stays unmodeled (flat
caster-DEF-basis shave — build only on a second carrier).
