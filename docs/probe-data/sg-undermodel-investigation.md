# Shotgun (SG) shared under-model — investigation

Date: 2026-07-15 · Investigator: analysis subagent · Tier of findings below: MEASURED (our
solo recon) + COMMUNITY (nikke.gg/ore-game). **No engine or override values changed by this
investigation** — diagnosis + ranked hypotheses + a recommended next test only.

## The problem

After the two SG corrections landed (range-dependent core → ~0.072 near/~0 far; per-band pellet
landing → ~flat 0.45–0.60, replacing the near=1.0/else=0.30 step), SG runs systematically COLD:
per-weapon mean ratio **0.695** (was ~1.10 hot). Cold units: noir 0.66, naga 0.51–0.64,
dorothy-serendipity 0.44, soda 0.64. Both removed constants were compensators; the residual
~0.25–0.30× multiplicative gap they were masking is REAL. Fable's constraint: do NOT re-absorb
it into the landing fraction or core rate (that rebuilds a compensator + double-counts). This
note localizes where else the gap lives.

## Solo-total reconciliation (the centerpiece) — drake SG, no team, no Full Burst

`scripts/solo-recon.ts` runs drake as a 1-unit forced-neutral scope-lock fight — zero team/FB/
element confounds — against her real damage-screen total (docs/probes/ar-sg-smg/drake sg.jpg).

| quantity | value | source |
|---|---|---|
| sim total | **36.77M** (normal 34.39M + skill 2.37M + burst 0) | runSim |
| real total | **53.97M** | reference-stats.json `recordingSoloTotals["drake-sg"]` |
| **ratio** | **0.681** → sim short by **1.47×** | — |
| sim pulls (shots) | 198 | u.pulls |
| sim normal / pull | 173,698 | 34.39M / 198 |
| ATK (static) | 118,027 | scope-lock |
| char normalAttackMultiplier | 214.3% (per pull, all 10 pellets) | characters.json |

### Where the 1.47× is NOT (confirmed not the cause)

1. **Shot count / cadence — NOT the cause.** Sim fires 198 pulls; the physical ceiling is ~206
   (9 ammo @1.5/s + 111-frame reload → 7.85s cycle → ~206 pulls/180s). To reach the real total
   at the sim's per-pull damage would need **~297 pulls** — impossible for a 1.5/s weapon over
   180s. The deficit therefore CANNOT be shots. (Note: the post-reload attack-lock, SG 0.47s, is
   known-but-unmodelled per game-mechanics.md §2; implementing it would REDUCE sim shots → make
   SG *colder*, not warmer. So cadence is the wrong direction entirely.)
2. **Per-pellet base value — NOT the cause (right).** Sim per-LANDED-pellet ≈ 173,698 / (0.558
   fight-avg landing × ~1.26 crit+core+range blend) ≈ **25,057**, essentially equal to the
   measured white pellet value **25,672** (docs/probe-data/sg-pellet-landing.json). The
   datamined 214.3% is the full-shot (10-pellet) multiplier with no factor-of-N error
   (214.3/10 = 21.43%/pellet → 25,065 raw, matches). dorothy-S's 1-pellet consolidation bullet
   (+11%) independently confirmed the per-pellet base.
3. **Core rate — NOT the cause (right).** 0.072 near is corroborated by ore-game (~6% front
   row); cores are a small slice of the blend and cannot supply 1.47×.

### Where the 1.47× IS — localized to landed-pellet COUNT

By elimination, the only free variable that can multiply the SG normal bucket by 1.47× is **the
number of pellets crediting damage per shot.** The sim credits fight-averaged landing 0.558
(~5.6 of 10 pellets; near 0.60, mid 0.60, far 0.45, midfar 0.55, weighted by the boss-range
script: near ≈69s, mid 33s, far 36s, midfar 42s). To close the gap, the true fight-averaged
landing must be **0.558 × 1.47 ≈ 0.82** — i.e. **~8.2 of 10 pellets actually deal damage per
shot**, not ~5.6.

The key insight: the sim FAITHFULLY reproduces the counted visible popups (sim per-landed-pellet
≈ measured pellet value; sim landed-count ≈ counted popups ~5.6). **The 1.47× gap is entirely
between the visible-popup reconstruction (≈ the sim, ≈37M) and the real damage-screen total
(54M).** The missing third of drake's damage does not appear as counted popups — it is pellets
that land and deal damage but render NO popup (or an off-cluster popup the analyst didn't count).

This matches two independent external facts:
- **nikke.gg** (weapon guide + burst-gauge-generation page): against **large bosses shotguns hit
  all 10 pellets consistently** at near range; a clip SG generates up to **450 energy/shot =
  45 × 10 pellets** near — i.e. all 10 pellets connect (and each deals damage).
- Our own **game-mechanics.md** already flags near landing 0.60 as a ⚑ **LOWER BOUND (≤0.7–0.8)**,
  and sg-pellet-landing.json lists "residual invisible-X (an on-body pellet rendering no popup)
  cannot be excluded to zero … measured fractions are best read as LOWER BOUNDS." The dropout=1.0
  assumption in that measurement is exactly what this reconciliation contradicts: **dropout ≈ 1.47.**

---

## Ranked hypotheses

### H1 (LEADING) — Landed-pellet render-dropout: real pellets ≫ counted popups

**Claim:** ~8/10 pellets physically land + damage on this large boss, but only ~5.6/10 render a
counted popup. The pellet-landing measurement (sg-pellet-landing.json) counted rendered popups
and assumed dropout=1.0; the true dropout is ~1.47. The sim, seeded from that measurement,
credits only the visible pellets.

- **FOR:** Solo-total reconciliation (sim = popup-reconstruction = 37M vs real 54M → dropout
  1.47). nikke.gg "large bosses hit all 10 pellets near" + 450-energy/shot. game-mechanics.md's
  own "near 0.60 is a LOWER BOUND ≤0.7–0.8" flag. Only variable with the right magnitude and
  sign. Explains ALL cold SG units at once (shared spray path — noir/naga mult ≈205%, ammo 9,
  10 pellets, same landing model).
- **AGAINST / tension:** This lives in the *landing slot* — the very place Fable said not to
  re-absorb into. BUT it is a physically distinct quantity: **render-dropout** (pellets that
  damage but don't render a number), NOT a cosmetic bump of the landing constant. The honest
  resolution is to correct the dropout=1.0 assumption *by measurement* (see next test), not to
  hand-tune the fraction to fit — otherwise it does become the old near=1.0 fudge again. The
  fight-averaged 0.82 also implies mid/far bands land more than the counted 0.45–0.55, which
  nikke.gg's "drops off outside 0–25" would push back on — so the dropout may be near-concentrated
  rather than uniform (needs the per-band re-measure).

### H2 — A hidden SG-specific multiplier / missing bucket (pellets really are ~5.6, gap is a factor)

**Claim:** ~5.6 pellets truly land (popups are faithful), and the missing 1.47× is a multiplier
applied to real damage that never shows in per-popup values (e.g. a spray/AoE part-overlap factor,
an unmodelled SG coefficient, or damage to multiple boss parts summed into the screen total but
not into the central popup cluster).

- **FOR:** Would honor Fable's constraint cleanly (distinct bucket, not landing). Multi-part
  boss: pellets spraying across limbs each deal damage to different parts, each popup rendered
  off-center and plausibly uncounted → the screen total exceeds the central-cluster count.
- **AGAINST:** No datamined SG-specific multiplier is known (nikke.gg damage formula has none).
  Requires a coincidental ~1.47× that matches the exact pellet-count shortfall — Occam disfavors
  a second mechanism when landed-count already fully explains it. Note H2's "off-center part
  popups" is really a *variant of H1* (more pellets deal damage than were counted) — both reduce
  to "counted popups < pellets that damage."

### H3 — Cadence / shot-count under-model. **REJECTED** (see reconciliation): sim 198 ≈ physical
max 206; real needs ~297 shots (impossible). Attack-lock, if added, worsens the cold.

### H4 — Range-band time allocation wrong. **Weak / unlikely primary.** The BOSS_RANGE_SCRIPT gives
near only ~38% of the fight. If near were under-allocated (real fight more near-heavy), SG (which
peaks near) would run cold. But the range script is a MEASURED constant (do-not-refit) validated
across all comps; and even 100%-near at the current 0.60 landing gives only 0.60/0.558 = 1.08×,
far short of 1.47×. Can be a minor contributor, not the driver.

### H5 — Core/landing mis-measured upward again. **REJECTED by construction** — core 0.072 and
landing ~0.55 are the CONFIRMED pieces; the whole point is the residual is elsewhere.

---

## Recommended NEXT TEST (single, decisive — separates H1 from H2)

**Pellet impact-flash vs popup-number count on the drake footage.** On a clean fixed-band
(preferably near) window, for each of K shots count (a) the pellet IMPACT FLASHES / hit-VFX on
the boss body and (b) the rendered damage NUMBERS. This directly distinguishes the two leading
hypotheses:

- **Flashes ≈ 10 while numbers ≈ 6** → **H1 confirmed:** pellets land + damage without rendering
  a number (render-dropout ~1.47). Fix path: re-derive the landing fraction from a popup-count-
  free basis — the solo TOTAL already implies fight-avg landing ≈ 0.82 / near ≈ 0.85–1.0 — and
  encode that as a MEASURED dropout correction on sg-pellet-landing.json's dropout=1.0 assumption
  (not a hand-tuned bump). Confirm transportability by checking the same ~1.47 reconciles a
  second SG unit (naga or noir in a team comp, after backing out FB/element).
- **Flashes ≈ 6 (≈ numbers)** → **H1 falsified, H2 in play:** only ~6 pellets truly land, so hunt
  a hidden ~1.47× multiplier / missing bucket (multi-part-overlap or an unmodelled SG coefficient).

Cheaper pre-check available immediately with no new footage: a **per-band solo reconciliation** —
re-run the drake solo with an A/B landing table set to nikke.gg's shape (near ~0.9, mid/far
lower) and confirm it lands the total near 1.0 without over-shooting; this tests whether the
dropout is near-concentrated (H1 near-only) or uniform. (A/B only — do not commit the values.)

## Bottom line for the caller

- **Top hypothesis (H1):** the shared SG under-model is **landed-pellet render-dropout ≈ 1.47×** —
  ~8/10 pellets damage a large boss but only ~5.6/10 render a counted popup, so the sim (seeded
  from popup counts with an assumed dropout=1.0) under-credits SG body damage across every SG unit.
- **Solo reconciliation:** drake solo sim **36.77M vs real 53.97M (0.681, short 1.47×)**;
  localized to **pellet-count-that-deals-damage** (fight-avg true landing ≈ 0.82 vs credited
  0.558). Confirmed NOT the cause: shot count (198 ≈ physical max 206; real needs impossible
  ~297), per-pellet base (sim ≈25,057 ≈ measured 25,672), core rate (0.072).
- **Tension to flag to Fable:** the mechanism physically occupies the landing slot. It is NOT a
  re-fudge only if the dropout is *measured* (impact-flash count / solo-total re-derivation),
  correcting the dropout=1.0 assumption — not if the landing constant is hand-tuned to fit.
- **Next test:** count pellet impact-flashes vs rendered numbers per shot on drake footage —
  cleanly separates render-dropout (H1) from a hidden multiplier (H2).

Sources used (all already in data/sources.json): nikke-gg (weapon guide, damage-formula,
burst-gauge-generation — all-10-pellets/450-energy on large bosses near), ore-game (front-row
~6% core, corroborates the 0.072 that is NOT the cause). nikke-gg `usedFor` extended with the
450-energy/all-10 citation.
