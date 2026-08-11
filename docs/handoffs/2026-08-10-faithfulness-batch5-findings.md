# 2026-08-10 — Faithfulness pass, phase-4 batch 5 (6 units)

> Six per-unit reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4). Batch 5 is the **graded-comp** slice of
> the phase-4 ordering ("then the graded-comp units"), taken highest-leverage first — by count
> of ENABLED graded comps the unit appears in, plus F-pattern carriage: `crown` (7 comps),
> `anis-star` (6), `cinderella` (4), `little-mermaid` (3), `helm` (2), `trina` (2 + the F3 amp).
> Slugs are exact: `helm` is the SR/Water Treasure base (NOT `helm-aquamarine`), `cinderella` is
> the RL/Electric base (NOT `cinderella-crystal-wave`), `anis-star` is the Defender/RL variant.
> Applied = the owner-ruled pattern classes only. Everything else recorded here, findings-only.
>
> Scope note: 33 units appear in the enabled graded comps and 6 were already reviewed in
> batches 1–4, so **21 graded-comp units remain** after this batch.

## Applied this batch (specs green at each step; board byte-identical)

> Net enactments: prose only. Both damage-affecting candidates were measured and held.

- **`burstDesc` tags — ZERO. The one candidate was attempted, measured, and HELD.** `helm`'s
  8236.8% burst nuke qualifies for `'singleEnemy'` ("Affects the enemy with the highest final
  ATK" — `crow`'s applied precedent, the same clause word-for-word, and the exact case QUEUE
  flagged for her review), and on the BOARD it is inert: a full A/B diff shows byte-identical
  output, because `jackal` — the only `burstSkillSingleDamagePct` carrier — shares no real comp
  with her. It is held anyway, because "board-inert" turned out not to mean "inert": **jackal's
  spec fixture seats helm**, so tagging switched the amp on there and broke two jackal pins that
  assert the amp reaches nothing (J4's scope discriminator and J5's inertness proof). That makes
  the tag a cross-unit edit — which this sweep does not do — and it lands together with the amp
  validation below, updating jackal's J4/J5 in the same motion. A new H7 pin holds the decision
  deliberately (asserting the tag is ABSENT, with the reason), so it cannot be silently
  "finished" by the next reviewer.
  - Worth noting on its own: that test failure is the **first end-to-end exercise of the
    burst-amp channel** anywhere in the suite. Until now every tag and both amps had never met.
- **`trina` — falsified caveat corrected.** Her first caveat still read "Spread Roots … is NOT
  modeled — teammate all-enemies B3 burst nukes … are missing a large amp", while her fifth said
  "Spread Roots is MODELED (2026-08-10)". The override carries
  `burstSkillAoeDamagePct` 435.6/5s. Same self-contradiction class as `jackal` in the batch-4
  remainder — two of five caveats disagreeing about whether a line exists. Rewritten to the
  shipped model plus the measured finding below.
- **Reviewer-provenance and `[materialized]` narration deleted** (2026-07-22 current-state
  ruling) from all six notes, including `little-mermaid`'s internal contradiction: a
  "still NOT hand-verified" materializer stamp sitting immediately before a line certifying the
  same slots FAITHFUL. `helm`'s "corrected 2026-07-25 from the earlier '8.4 + 3×14.31', which
  summed to 51.33, not 59.73" collapsed to the current value. No measured value changed.
- Mirrors regenerated (`data/kit-status.json`, `docs/unmodeled-entries-review.md`, 414 entries).

## Cross-cutting finding (STOP-AND-SURFACE — owner): the burst-amp channel is an untested landmine

This is the batch's real result, and it changes how the remaining `burstDesc` tagging should be
done.

**State today.** `trina`'s Spread Roots amp is LIVE (`burstSkillAoeDamagePct` 435.6, all allies,
5s, on her burstCast) and its kit gate — "enemy count aside from Nikkes is 1" — is always true
in solo raid. It already bites in exactly **one** place: `liberalio`
in N3, whose tagged burst hit is a small share of her total — the amp moves her mean 0.917 →
0.929 (one reading 0.88 → 0.92), i.e. TOWARD her real fight. Every other tagged unit is unpaired
with her, so removing the amp leaves the rest of the board byte-identical. (First read of this
A/B was grep-filtered and reported "exactly zero"; the full diff found `liberalio`.)

**What happens at the first real pairing.** `cinderella` is the obvious next tag — she is in
run-B _with trina_, and her clause "Affects random enemies" (1365.92% ×10) is plural, which the
2026-08-10 scope-string ruling maps to `'allEnemies'`. Tagging her:

|                   | before                             | after                                  |
| ----------------- | ---------------------------------- | -------------------------------------- |
| `cinderella` mean | 0.893 COLD                         | **1.523 HOT**                          |
| her 7 readings    | 0.74 0.85 0.86 0.88 0.94 0.96 1.01 | 0.85 0.86 0.88 1.01 **1.91 2.55 2.60** |

The three readings that explode are exactly her trina comps. **The real fights refute the combination** of (435.6% magnitude, additive Damage-Up placement,
this scope) AT THAT SCALE. At least one of the three is wrong:

1. **Scope** — the kit says the amp applies to skills with the literal string "Affects all
   enemies" in the description; `cinderella`'s says "Affects **random** enemies". The
   scope-string ruling was about which clauses count as _targeting the boss_; it may not follow
   that a non-literal clause satisfies an amp that names a literal string.
2. **Placement** — +435.6 pp additive into Damage-Up is enormous (it roughly triples a nuke that
   already has other Damage-Up). The `⚑` on the amp's additive placement is unmeasured and was
   flagged as such when it landed.
3. **Magnitude** — 435.6 is the kit's SL10 number, so this is the least likely of the three, but
   it has never been checked against a popup.

**Consequences for the sweep.** Two rules for the remaining ~21 graded-comp units:

- Do NOT tag any unit whose burst damage line would land inside a comp-mate's amp window until
  the amp is validated. The near-dormancy of the 39 tag instances landed so far (20 units) is
  **not** evidence of safety — it is evidence that almost nothing has been paired yet, and the
  one live pairing (`liberalio`) is small enough to look benign.
- Every future tag should be A/B'd for board movement before it lands, exactly as `helm`'s was.
  Tagging is only "byte-identical bookkeeping" while the amps stay unpaired.

**Recommended validation** (cheapest first): popup-read one qualifying all-enemies burst nuke
cast inside vs outside a trina Spread Roots window and compare the ratio against 1 + 4.356
additive-in-Damage-Up. Any comp with trina + a plural-clause B3 gives the measurement. Until
then `cinderella` stays untagged and the caveat in her override records why.

## Recorded, not applied (per-unit)

- **`crown` (7 comps, 0.86–1.16 across 17 readings, mean 1.003):** clean beyond prose. Worth
  noting from the batch-4 probe: her on-recovery consumer runs at only **23.3% uptime** in N9,
  so she is not saturated there and ally recovery-emit decisions in her comps are live, not
  inert. Her own S2 self-heal (hitCount 860) is what keeps her partially fed.
- **`anis-star` (6 comps, 0.867 COLD across 12 readings):** clean beyond prose. The
  formation-dependent My Own Star / Everyone's Star XOR is modeled with counterfactual pins on
  both branches; nothing in this pass touched it.
- **`cinderella` (4 comps, 0.893 COLD):** the untagged-burst decision above is now recorded in
  her caveats so the next reviewer does not "finish the chore". Her pre-existing burst-cast
  snapshot ⚑ (owner-resolution-required, ~20–25% nuke over-credit if the historical reading
  holds) is unchanged and is a _separate_ COLD-direction question from the amp.
- **`little-mermaid` (3 comps, 0.974):** clean beyond prose; her Explosive-Bubble coexistence
  question stays measurement-gated.
- **`helm` (2 comps, 0.978, tightest 10-reading unit on the board):** clean; her tag is held
  (above) with the reason pinned in H7.
- **`trina` (2 comps, 1.148 HOT):** her own HOT is unrelated to the amp — she is a supporter and
  the amp scales teammates, so it cannot move her own total. Unexamined this pass.

## Batch stats

6 units reviewed / 0 `burstDesc` tags (1 attempted, measured, held) + 1 falsified caveat
corrected + provenance narration deleted from 6 notes + 2 hold-pins added (`helm` H7,
`cinderella` caveat) / 1 cross-cutting finding with a measured refutation. Nothing board-moving
enacted; board byte-identical to the pre-batch read. 21 graded-comp units remain for batch 6.

**Two candidate tags, two different reasons to hold** — worth stating plainly, because the
pattern is likely to repeat: `cinderella`'s is held because the board REFUTES the result;
`helm`'s is held because landing it requires editing another unit's spec. Neither is a
"pending chore"; both are recorded decisions with pins that make them deliberate.
