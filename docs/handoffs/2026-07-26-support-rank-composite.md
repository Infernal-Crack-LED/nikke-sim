# Handoff — composite "support rank" across the four new boards

> Context-packed for a fresh session (owner: plan + implement there). The four
> input boards landed 2026-07-26; this doc is the design brief for combining
> them into one overall support ranking. Read `docs/data/rank-boards.md` first.

## The ask

An overall "support rank" that factors in: burst generation, burst CDR,
sustain, and buffing (the four boards landed 2026-07-26 in `src/ranks/` +
`web/public/{burstgen,burstcdr,sustain,bufferchart}.json`).

## Inputs and their units (incompatible — normalization is the first problem)

| Board | Artifact | Metric | Population |
|---|---|---|---|
| Burst gen | `burstgen.json` | uncapped gauge % over 180s (100 = 1 bar), solo disableBursts | all simSupported |
| Burst CDR | `burstcdr.json` | nominal team CDR sec per 40s (static + cadence) | 15 burst-cdr-tagged |
| Sustain | `sustain.json` | team-total HP restored+shielded, % of caster maxHP + absolute | 50 healer/shield + nayuta |
| Buffer | `bufferchart.json` | added carry DPS vs no-op baseline (generic & typed arms) | 74 B1/B2 + B3 buffers |

Different units, different populations, different scales → combine as
**per-board percentiles** (or z-scores), not raw values.

## Proposed shape (to be decided with the owner)

1. **Normalize** each unit to its percentile within each board it appears on
   (rank / population size).
2. **Missing-board policy** — the key decision:
   - A unit not on the CDR board (only 15 slugs are) is not a 0 — it simply has
     no CDR kit. Recommended: composite = weighted mean over the boards the
     unit DOES appear on, with weights renormalized; OR treat absence as 0 for
     CDR specifically (having no CDR line IS a real gap for a support). Owner
     call.
3. **Weights** — owner decision. Suggested starting point: buffer 0.4, CDR 0.2,
   burst-gen 0.2, sustain 0.2. Generic vs typed buffer arm: suggested 60/40
   generic-leaning (generic = plug-and-play reality).
4. **Population**: union, probably restricted to B1/B2 + support-flavored B3s
   (a pure carry would top the burst-gen board and pollute the support rank).

## Known double-counting / correlation traps (from the landing session)

- **Gauge/CDR value appears TWICE**: the buffer board's sim captures rotation
  value (liter's CDR + LM's gauge show up as added carry DPS through faster FB
  cycles), AND those units rank on the CDR/burst-gen boards. Weights must be
  set with this in mind, or the composite needs one of the channels zeroed
  (e.g. run the buffer board with gauge/CDR lines stripped — a "buffs-only"
  arm — if the owner wants clean factor separation).
- **Sustain is uncorrelated with the other three** (scope-lock boss deals no
  damage → sustain kits read ~0 on the buffer board) — it only enters via the
  sustain board itself, so its weight directly decides how much a nayuta/helm
  rises. There is no cross-check.
- Burst-gen board is dominated by weapon class (liberalio/helm/trina top it) —
  percentile normalization keeps it from swamping, but a "support rank" may
  want the burst-gen input restricted to KIT-driven generation (subtract the
  class-modal weapon baseline per unit: `gaugeGenerated(unit) −
  gaugeGenerated(same-class synthetic)` — the synthetics from
  `src/ranks/synthetics.ts` make this one extra run per class).
- The CDR board is static/nominal while the others are simmed — fine after
  percentile normalization, but don't try to convert CDR seconds into DPS.

## Implementation sketch

Thin script (no new sim runs): `scripts/build-support-rank.ts` reading the four
artifacts (or calling the four rank functions directly), normalizing, weighting,
emitting `web/public/supportrank.json` with per-board sub-scores exposed for
transparency. Test: weight/normalization arithmetic pins + the
missing-board policy.

## Open questions for the owner

1. Missing-board policy (renormalize vs zero)?
2. Weights per board + generic/typed split?
3. Population restriction (B1/B2 only? include B3 buffers? exclude pure carries)?
4. Burst-gen input: raw total or kit-driven delta over class-modal baseline?
5. Clean factor separation (buffs-only buffer arm) worth an extra build pass?
