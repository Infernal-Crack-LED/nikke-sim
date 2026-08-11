# 2026-08-10 — Faithfulness phase-4 batch 6 (6 units)

> Six graded-comp reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4, 11 items). Board-pain-led selection, since
> the batch-6 START-HERE doc's tag-led rationale was consumed by the burst-amp scope rulings
> that landed first this session (see
> [burst-amp literal-scope findings](2026-08-10-burst-amp-literal-scope-findings.md)):
> `grave` (1.095 HOT, 2 comps, U19 carrier), `dorothy-serendipity` (0.924 COLD, 2),
> `maiden-ice-rose` (0.938 COLD, 2), `rapi-red-hood` (0.929 COLD, 2),
> `neon-vision-eye` (1.040 HOT, 2), `d-killer-wife` (0.937 COLD, 1, two F2 surfaces).
>
> Slugs are exact: `grave` = AR/Wind, `dorothy-serendipity` = SG/Water (NOT `dorothy`, AR/Water, who
> appears below only as a census note), `maiden-ice-rose` (NOT `maiden`), `rapi-red-hood` (NOT
> `rapi`, AR/Fire), `neon-vision-eye` (NOT `neon` / `neon-blue-ocean`), `d-killer-wife` (NOT `d`).
>
> Applied = the owner-ruled pattern classes only (falsified/stale prose; the ruled tag classes).
> Everything else is findings-only.

## The batch's real result: the census I shipped this session was undercounting

Batch 6's first unit review broke the instrument that the earlier half of this session built,
pinned, and wrote into DECISIONS. Two independent silent holes, both of the same shape — a unit
the census could not SEE, reported as coverage:

1. **`DAMAGE_LINE` only recognised one damage phrasing.** It matched "Deals X% of final ATK" and
   missed "Deals damage equal to X%" (`kilo`, `maiden-ice-rose`) and "Deals continuous damage
   equal to X%" (`guillotine-winter-slayer`). Those blocks were classified damage-FREE, which
   **produced two wrong verdicts that I had already pinned in a test and written into
   DECISIONS**: `guillotine-winter-slayer` and `kilo` were called block-vs-skill "granularity
   splits" when in fact their literal sits ON their damage block. Only `sin` was ever a real
   split.
2. **`stackedNuke` was not counted as burst damage.** It is the roster's only instance
   (`maiden-ice-rose`) and a third damage primitive alongside `flatDamage` and `dot`, so she was
   skipped from the census entirely.

Corrected: `DAMAGE_LINE` now matches every phrasing the kits use; `stackedNuke` counts;
83 → 84 units. **And the class is now self-announcing** — a new `DAMAGE_LINE_LOOSE` check reports
any block that mentions damage in a phrasing the matcher does not recognise, unconditionally, in
the summary. Today it flags exactly one (`dorothy`'s Brand accumulation block, whose clause is
not a literal either way, so no verdict turns on it).

Net corrections to what landed earlier this session: granularity splits 4 → **1** (`sin`);
engine-gap `dot-ineligible` set 3 → **5** (`ark-ranger-black`, `diesel-winter-sweets`,
`guillotine-winter-slayer`, `maiden-ice-rose`, `mana`); `kilo` reclassified from "split" to
genuinely under-tagged, so the known-debt list is 24 → 25.

**Process note.** This is the same failure twice in one session, caught both times only because a
dumb grep over the raw source disagreed with the instrument. The lesson is now written into the
census header and pinned: cross-check any census against a naive grep, and make the
unrecognised-input case loud rather than silently defaulting.

## Applied

- **`rapi-red-hood` — note rewritten, 10,135 → 4,146 chars.** The worst instance of the recurring
  defect class found in this sweep: a dated changelog carrying **three self-contradictions**,
  each of which a grep or a fresh reader would take as the live model.
  - "+421.2% attachment self-buff is MEASURED-INERT … REMOVED (dead datamine entry 101631006)"
    vs, later, "the +421.2% … is RESTORED — the 'MEASURED-INERT' verdict is OVERTURNED". **The
    line ships** (burst block 3, Stage-3 self buff).
  - "MEASURED explosion core fraction ~1/3 … applied as storedHit.core:0.33" vs "storedHit.core
    REMOVED — the release is core-INELIGIBLE". **It ships core-ineligible.**
  - "the 2026-07-14 'stickies never core' verdict is OVERTURNED for the attach". **The attach
    ships `core: true`.**
    Rewritten to the shipped model only, with the ⚑s and the do-not-re-fit instruction preserved.
- **`grave` — note rewritten, 7,615 → 4,514 chars, resolving a three-way contradiction about the
  SAME item.** Prediction-end ammo removal was simultaneously described as "DEFERRED … not yet
  modeled", "MODELED (R2 closed 2026-08-09)", and live open item ⚑(2) "needs an empty-magazine
  effect + a Prediction-end trigger". **It is modeled** — `burstCast` + block `delaySec: 10` →
  `consumeAmmo` fraction 1. Two of the three statements sat in the ⚑-open list, which is exactly
  where a future reviewer mines for work.
- **`open-questions.md` U19 — stale candidate struck.** U19 (grave's burst-window over-model)
  listed "the unmodeled Prediction-end forced reload (~9-11/fight, ⚑2, would cut shots)" as one
  of three live candidates for her HOT residual. It is modeled. Candidate set narrowed to two
  (Overheat II/III full-window uptime; burst-window fire-rate/crit stack). This is the
  "resolutions land in the override but never get re-filed" drift class — it would have sent a
  measurement session chasing a solved mechanic.
- **`grave` — `unmodeled.burst` junk entry fixed.** It carried a bare label `"Prediction:"` as
  its own entry, split from the line it belongs to. Merged, with the disposition stated.
- Mirrors regenerated; census + fixture updated (20 pins).

## Recorded, not applied (per unit)

- **`grave` (1.095 HOT, 2 comps):** clean beyond prose. Her HOT is the deliberate, documented
  U19 residual — the faithful timed-pierce is ON by owner ruling (faithful > fit) and the
  remaining heat is a separately-tracked burst-window over-model. **Do not re-fit by disabling
  pierce.** Her reload IS handled and is MEASURED (`charFixes.reloadFrames: 193` → 201f
  effective, n=19), not the dropped "defensive" line an older memory warns about; I checked this
  specifically because her HOT direction is what a missing reload penalty would produce, and the
  hypothesis was wrong. The ⚑ Overheat II/III full-window uptime (durationSec 7.5/5.0 would match
  the real ~2.5s/~5s ramp-in) stays a finding on the hand slot, unedited — it is a live U19
  candidate and belongs to that measurement, not to this sweep.
- **`dorothy-serendipity` (0.924 COLD, 2 comps):** clean. Her `skill1` has ZERO blocks, which
  reads as a gap and is not one — S1 is expressed wholesale by a first-class `consolidation`
  config (`triggerLandedPellets: 80, shots: 3, coreRate: 0.9, pelletFraction: 1,
attackDamagePct: 72, pierce: true`). I flagged the missing 72% Attack Damage as a finding and
  it was wrong; verified before writing. Worth knowing for the next reviewer: **an empty skill
  slot on this unit is correct**, and she remains the intended SG-spray regression anchor.
- **`maiden-ice-rose` (0.938 COLD, 2 comps):** clean beyond the census finding. Her burst
  `stackedNuke` carries a QUALIFYING literal ("Affects the 1 enemy unit(s) nearest to the
  crosshair" → qualifying once the article is forgiven) and is **structurally amp-ineligible**
  regardless — the engine gap, now recorded against her. Board-inert (no `jackal` comp). Her MP
  bookkeeping is the owner-specified fold and her S2 "when MP is replenished" → `fullBurstEnter`
  proxy is documented and cadence-matched.
- **`rapi-red-hood` (0.929 COLD, 2 comps):** clean beyond the note. Her COLD is deliberate and
  pre-registered (explosion core removed on the owner footage ruling, "accuracy over fit"); the
  residual is a count/rotation channel (sim 12 FB vs real 13), not instance magnitude — both
  popup classes match measurement to within ~1%. **Do not trim the model to close it.**
- **`neon-vision-eye` (1.040 HOT, 2 comps):** one checklist-8 finding. Her Super Firepower
  "Deals 262.79% of final ATK as additional damage" is modeled as an **`extraHitDamagePct` buff**
  rather than a `flatDamage` instance. Per U28 that is a gauge-economy decision, not a cosmetic
  one: as a rider it generates no damage instance of its own and therefore no separate burst
  gauge, where a `flatDamage` would. The choice may well be right — it is an "additional damage"
  rider on her normal hits — but it is **undocumented**, and she carries no `caveats` array at
  all to document it in. Recorded, not changed: it is a gauge-economy question and she is HOT,
  so the direction is not obviously wrong. Wants one ruling alongside the other U28 riders rather
  than a unit-local fix.
- **`d-killer-wife` (0.937 COLD, 1 comp):** clean; her two F2 silent-failure surfaces (the
  cross-slug `targetStatus` string pair, and load-bearing intra-unit block order) are both
  documented in her caveats and intact. Minor hygiene: `unmodeled.skill1` splits one kit line
  across two entries, the first being a bare `"■ Activates when attacking with Full Charge for 3
time(s). Affects self."` header. Not fixed — cosmetic, and touching it risks the string-pair
  lint; noted for whoever next edits that file.

## Batch stats

6 units reviewed · 2 major note rewrites (17,750 → 8,660 chars, 4 self-contradictions resolved)
· 1 stale open-question candidate struck · 1 `unmodeled` entry repaired · **1 instrument defect
found and fixed, invalidating 2 claims this session had already pinned and published** · 3
findings recorded not applied (neon-vision-eye U28 rider, grave Overheat ramp, d-killer-wife
unmodeled split) · board byte-identical, verify.sh green.

**15 graded-comp units remain** after this batch.
