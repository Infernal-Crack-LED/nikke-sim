# Work deliverable — `anis-star` carve-out removal (2026-08-16)

Work step of the pre-registered packet
`docs/handoffs/2026-08-16-anis-star-carveout-preop-packet.md` (pre-op APPROVED-WITH-REVISIONS,
R1–R3 folded in). Worktree `nikke-sim-wt-anis-star-gauge`, branch `anis-star-gauge-divisor` off
`main` @ `4cdbb5fd`. Both arms are separate processes through the committed harnesses; no
hand-rolled configs. This document reports data only — the landing decision is not made here.

Commits produced by this step:

- `f1c784f3` docs: pre-register the packet
- `145d8df6` engine(anis-star): the change + spec tests + snapshot regen (one commit)
- `8a175c07` docs: scripted doc-drift derived-census refresh (verify.sh gate)
- (this file) the deliverable

---

## 1. Baseline arm (raw, at HEAD `4cdbb5fd`, before any edit)

### 1.1 `npx tsx scripts/regression.ts` — exit 0, "regression: all checks passed"

FB-pin lines verbatim:

```
✓ [elec battery (run B order)] full bursts seeded 11 (11×25) vs measured 11
✓ [misc B3s (run I order)] full bursts seeded 12 (12×25) — KNOWN SHORTFALL vs measured 13 (pinned at sim 12; see QUEUE.md)
✓ [elec DPS (run E order)] full bursts seeded 10 (10×25) vs measured 10-12
iron sweep (run G) — skipped (disabled, see QUEUE.md)
✓ [T2 elec-weak] full bursts seeded 12 (12×25) vs measured 12
T5 wind-weak — skipped (disabled, see QUEUE.md)
✓ [PA MiKa] full bursts seeded 11 (11×25) vs measured 11
T1 wind-weak — skipped (disabled, see QUEUE.md)
✓ [PH water B3s] full bursts seeded 12 (12×25) vs measured 12
N3 scarlet/liberalio iron — skipped (disabled, see QUEUE.md)
✓ [N5 snowwhite-HA fire] full bursts seeded 12-13 (12×21 13×4) vs measured 12
✓ [N6 mihara/maiden wind] full bursts seeded 11 (11×25) vs measured 11
✓ [N9 redhood/elegg electric] full bursts seeded 12 (12×25) vs measured 12
```

Every snapshot row "stable". This matches the packet's P3 enumeration exactly (PA MiKa 11×25,
T2 12×25, N5 12×21/13×4 vs measured 12, misc B3s divergence pin sim 12 vs measured 13, T5/T1
disabled) — the BASIS-BROKEN clause was not triggered.

### 1.2 `SEEDS=25 ONLY=<comp> npx tsx scripts/experiment.ts` (baseline)

```
T5 wind-weak probe (boss Iron):  full bursts: 11x28% 12x72%, first FB at 5.5-6.0s
  nayuta 0.974±0.022 | cinderella-crystal-wave 0.894±0.015 | anis-star 0.763±0.014 (144 shots)
  | liberalio 0.852±0.021 | velvet 0.990±0.021
T1 wind-weak (boss Iron):        full bursts: 11x72% 12x28%, first FB at 5.7-6.3s
  mast-romantic-maid 0.882 | scarlet-black-shadow 0.764 | anis-star 0.831 (186 shots)
  | liberalio 0.863 | crown 0.856
T4 water-weak (boss Fire):       full bursts: 13x100%, first FB at 3.9-4.4s
  anis-star 0.904 (189 shots) | privaty 1.275 | snow-white-heavy-arms 0.952 | helm 0.977 | crown 1.162
  (T4b REPLICATE also 13x100%)
T7 elec-weak probe (boss Water): full bursts: 11x100%, first FB at 6.4-6.9s
  crown 0.901 | rapi-red-hood 0.844 | anis-star 0.885 (183 shots) | cinderella 0.828
  | mast-romantic-maid 1.014
```

### 1.3 `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources` (baseline anis-star rows)

```
T5 wind-weak:        anis-star 42 unlocked impacts × 1.400 gauge
  DIVISOR EXPOSURE: anis-star (RL, ÷2) — 42 unlocked; shipped 58.8 vs 117.6 if divisor 1 (+58.8/fight)
T1 wind-weak:        anis-star 41 × 1.400 | DIVISOR: 41; 57.4 vs 114.8 (+57.4)
misc B3s (run I):    anis-star 30 × 1.400 | DIVISOR: 30; 42.0 vs 84.0 (+42.0)
N5 snowwhite-HA:     anis-star 15 × 1.400 | DIVISOR: 15; 21.0 vs 42.0 (+21.0)
N2 modernia wind:    DIVISOR: modernia (MG, ÷2) — 1330; 66.5 vs 133.0
unlocked/locked splits: T5 73/732 · T1 90/781 · misc B3s 78/831 · N5 74/911 · iron sweep 26/107
T5 measured shortfall: 26.0 gauge/s of refill, 49.7 gauge/cycle
```

All identical to the committed census-test pins at HEAD.

### 1.4 Solo decomposition arithmetic (baseline)

Shipped model: (700 shot + 140 rider) × 1.06 aura = **8.90 %/pull**.
The 2026-08-15 labeled solo fixture carries a pixel-free count-to-fill EXCLUSION bound:
steady per-pull **≥ ~10.96–11.14 and < ~12.53–12.73** (stated here without interpretation).

---

## 2. Change applied (exact diff summary, commit `145d8df6`)

1. `src/data/weapon-fields.ts` — removed `'anis-star': 2` from `HITS_PER_SHOT_CARVEOUTS`
   (`modernia: 2` stays); the comment block rewritten to describe the one remaining carve-out;
   the anis-star narration (including the stale "at 1 comp PA MiKa makes 12 FBs vs measured 11"
   claim) deleted entirely.
2. `data/characters.json` — `anis-star.hitsPerShot` 2 → 1. **Single line; nothing else.**
   `burstGaugePerShot` untouched at 1.4 (R1: its formula
   `round6((burst_energy_pershot/10000) × shot_count)` = 14000/10000 × 1 never involves
   hitsPerShot). Sync was NOT run. Post-edit, `deriveWeaponFields('anis-star', shot_detail)`
   output is field-for-field identical to her characters.json row (verified, and pinned in G3).
3. Spec tests (constraint 9 — committed instruments), `scripts/tests/units/anis-star.test.ts`:
   - **G1** dot-gauge inertness: removing her burst dot in the committed NOB1 fixture
     (anis-star/crown/ada/helm, boss Fire) drops her damage but changes her `gaugeGenerated`
     by exactly 0 (strict `toBe` equality) — the lock swallows all 40 ticks.
   - **G2** stage-2-stall counterfactual (R3): synthetic no-Burst-II comp (anis-star/ada/helm)
     stalls every chain at stage 2 for the full CHAIN_TIMEOUT; 0 Full Bursts fire; exactly one
     tick per cast escapes, and the escaped credit is pinned at the post-change value
     **2.8 × 1.06 per cast** (measured: 9 casts, delta 26.712 = 9 × 2.968).
   - **G3** determinism spec (R1): her characters.json row == `deriveWeaponFields` output
     (hitsPerShot 1 = shot_count 1 × muzzle_count 1; burstGaugePerShot 1.4; plus the other
     derived fields).
   - **G4** `skillImpactGauge('anis-star')` = 2.8.
4. `scripts/tests/battery/gauge-source-census.test.ts` — pins re-transcribed from the
   instrument's own `--gauge-sources --json` output (§3.3); comments rewritten to state the
   current model.
5. Three further battery fixtures whose pins the change moves (all values from the instruments'
   own `--json` output; see §6): `focus-columns.test.ts` (T5 rows),
   `multihit-crediting.test.ts` (misc B3s rows + arm-comparison structure),
   `refill-starvation.test.ts` (T5 rows + reload-bound-firsts case).
6. `scripts/regression-snapshot.json` regenerated in the SAME commit as the change.
7. Commit `8a175c07`: scripted `scripts/doc-drift.ts --update` for the generated
   hitsPerShot censuses (docs/STATE.md §5 row, docs/engine-modeling-gaps.md) + the prose count
   cell (34 → 33 units; carve-out list now `modernia` only) — required for the verify.sh
   doc-drift gate. The interpretive step-5 docs (DECISIONS / QUEUE / U28 / mechanics pair)
   were NOT touched.

---

## 3. Test arm (raw, after the change)

### 3.1 `npx tsx scripts/regression.ts` (pre-update read)

FB-pin lines verbatim — all ✓, byte-identical FB distributions to baseline:

```
✓ [elec battery (run B order)] full bursts seeded 11 (11×25) vs measured 11
✓ [misc B3s (run I order)] full bursts seeded 12 (12×25) — KNOWN SHORTFALL vs measured 13 (pinned at sim 12)
✓ [elec DPS (run E order)] full bursts seeded 10 (10×25) vs measured 10-12
✓ [T2 elec-weak] full bursts seeded 12 (12×25) vs measured 12
✓ [PA MiKa] full bursts seeded 11 (11×25) vs measured 11
✓ [PH water B3s] full bursts seeded 12 (12×25) vs measured 12
✓ [N5 snowwhite-HA fire] full bursts seeded 12-13 (12×21 13×4) vs measured 12
✓ [N6 mihara/maiden wind] full bursts seeded 11 (11×25) vs measured 11
✓ [N9 redhood/elegg electric] full bursts seeded 12 (12×25) vs measured 12
```

Snapshot drifts (the pre-`--update` read; the per-unit deltas are §5's blast-radius table):
24 drift rows, every one inside a comp seating `anis-star` (misc B3s, T2 elec-weak, PA MiKa,
T4, T7, N5). All comps not seating her — elec battery, elec DPS, PH water B3s, N1, N6, N9,
soda-tb control — every row "snapshot stable".

### 3.2 `SEEDS=25 ONLY=<comp> npx tsx scripts/experiment.ts` (test arm)

```
T5 wind-weak probe (boss Iron):  full bursts: 12x100%, first FB at 5.5-6.0s
  nayuta 0.994±0.026 | cinderella-crystal-wave 0.899±0.015 | anis-star 0.767±0.014 (143 shots)
  | liberalio 0.864±0.018 | velvet 1.001±0.016
T1 wind-weak (boss Iron):        full bursts: 11x60% 12x40%, first FB at 5.5-5.8s
  mast-romantic-maid 0.891 | scarlet-black-shadow 0.767 | anis-star 0.831 (183 shots)
  | liberalio 0.863 | crown 0.871
T4 water-weak (boss Fire):       full bursts: 13x96% 14x4%, first FB at 3.7-4.2s
  anis-star 0.905 (188 shots) | privaty 1.274 | snow-white-heavy-arms 0.951 | helm 0.976 | crown 1.162
  (T4b REPLICATE also 13x96% 14x4%)
T7 elec-weak probe (boss Water): full bursts: 11x96% 12x4%, first FB at 6.1-6.6s
  crown 0.910 | rapi-red-hood 0.847 | anis-star 0.893 (184 shots) | cinderella 0.851
  | mast-romantic-maid 1.021
```

### 3.3 `--gauge-sources` census (test arm; `--json` values)

```
T5 wind-weak:        anis-star 43 unlocked impacts × 2.800 gauge | NO divisor row
T1 wind-weak:        anis-star 36 × 2.800 | NO divisor row
misc B3s (run I):    anis-star 28 × 2.800 | NO divisor row
N5 snowwhite-HA:     anis-star 15 × 2.800 | NO divisor row
N2 modernia wind:    DIVISOR: modernia (MG, ÷2) — 1330; 66.5 vs 133.0   [unchanged]
unlocked/locked splits: T5 77/754 · T1 86/782 · misc B3s 76/834 · N5 74/912
  iron sweep 26/107, N1 49/269, N3 35/284, soda-tb 17/345, N2 1370/7597   [all unchanged]
T5 measured shortfall: 22.681 gauge/s of refill, 43.276 gauge/cycle   (was 26.032 / 49.674)
iron sweep shortfall: 16.383 / 40.762   [unchanged]
```

`skillImpactGauge('anis-star')` = 2.8 (was 1.4).

### 3.4 Solo decomposition arithmetic (test arm)

Post-change model: (700 shot + 280 rider) × 1.06 aura = **10.39 %/pull**.
Baseline shipped: 8.90 %/pull. The 2026-08-15 exclusion bound, stated next to both without
interpretation: steady per-pull **≥ ~10.96–11.14 and < ~12.53–12.73**.

---

## 4. Per-prediction data table (predicted vs observed)

| Pred | Quantity               | Pre-registered prediction                                                                     | Observed (test arm)                                                                                                                                                                              |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-1  | PA MiKa seeded FB      | 11×25, unchanged (H0a predicts 12)                                                            | **11×25** (identical to baseline)                                                                                                                                                                |
| P-2  | T2 elec-weak seeded FB | 12×25, unchanged                                                                              | **12×25** (identical)                                                                                                                                                                            |
| P-3  | N5 snowwhite-HA fire   | stays a measured-12 pass (12/13 mix allowed)                                                  | **12×21 13×4** (identical mix to baseline; gate ✓)                                                                                                                                               |
| P-4  | misc B3s (run I order) | 12 or 13; movement only TOWARD measured 13; if 12, pin stands                                 | **12×25**; divergence pin `simFullBursts: 12` left standing                                                                                                                                      |
| P-5  | T5 wind-weak           | up to ~12×25 (from 11×28%/12×72%), still short of measured 13; census sized +58.8 gauge/fight | **12×100%** (from 11×28%/12×72%); her unlocked-impact census credit 58.8 → 120.4 (42×1.4 → 43×2.8; the impact count itself re-phased 42→43); comp shortfall narrows 49.7→43.3/cycle              |
| P-6  | T1 wind-weak           | unchanged or toward 13; stays disabled                                                        | **11×60% 12×40%** (from 11×72%/12×28%); 12-share rose 28%→40%; stays disabled                                                                                                                    |
| P-7  | Solo decomposition     | exactly (700+280)×1.06 = 10.39 %/pull; still below the bound                                  | **10.39 %/pull** (spec-pinned: `skillImpactGauge` 2.8, G2 credit 2.8×1.06); bound ≥ ~10.96                                                                                                       |
| P-8  | Blast radius           | zero per-unit delta outside her comps; movement rotation-mediated only                        | **27 moved rows, all 6 comps seat her; 84 rows in 17 other comps byte-unmoved**; graded FB counts unchanged everywhere; no damage-path/bucket code touched (change is data + carve-out map only) |

---

## 5. Blast-radius table (snapshot old → new, commit `145d8df6`)

Comps WITH movement (all seat `anis-star`):

| Comp                   | Unit                  | Old           | New           | Δ%     |
| ---------------------- | --------------------- | ------------- | ------------- | ------ |
| misc B3s (run I order) | grave                 | 314,270,506   | 311,833,003   | −0.78% |
| misc B3s (run I order) | anis-star             | 556,652,359   | 561,043,547   | +0.79% |
| misc B3s (run I order) | jill                  | 535,366,091   | 535,437,865   | +0.01% |
| misc B3s (run I order) | chisato               | 453,996,974   | 453,717,089   | −0.06% |
| misc B3s (run I order) | noir                  | 143,693,591   | 144,621,744   | +0.65% |
| T4                     | anis-star             | 1,018,455,311 | 1,024,299,684 | +0.57% |
| T4                     | privaty               | 1,415,178,647 | 1,371,317,800 | −3.10% |
| T4                     | snow-white-heavy-arms | 1,726,403,261 | 1,729,939,270 | +0.20% |
| T4                     | helm                  | 362,093,492   | 360,790,756   | −0.36% |
| T4                     | crown                 | 434,519,292   | 431,196,705   | −0.76% |
| T7                     | crown                 | 264,415,354   | 271,014,671   | +2.50% |
| T7                     | rapi-red-hood         | 970,844,574   | 993,211,684   | +2.30% |
| T7                     | anis-star             | 779,593,665   | 784,173,387   | +0.59% |
| T7                     | cinderella            | 1,071,264,462 | 1,075,009,145 | +0.35% |
| T7                     | mast-romantic-maid    | 133,430,052   | 136,467,501   | +2.28% |
| T2 elec-weak           | crown                 | 193,519,367   | 194,401,494   | +0.46% |
| T2 elec-weak           | neon-vision-eye       | 1,443,327,623 | 1,476,999,519 | +2.33% |
| T2 elec-weak           | anis-star             | 864,185,857   | 874,391,273   | +1.18% |
| T2 elec-weak           | cinderella            | 1,178,568,639 | 1,186,425,299 | +0.67% |
| T2 elec-weak           | maiden-ice-rose       | 255,453,969   | 255,168,475   | −0.11% |
| PA MiKa                | anis-star             | 715,393,139   | 711,264,770   | −0.58% |
| PA MiKa                | mint                  | 201,779,092   | 213,703,940   | +5.91% |
| PA MiKa                | prika                 | 178,118,752   | 185,911,018   | +4.37% |
| PA MiKa                | alice                 | 439,706,944   | 454,942,997   | +3.47% |
| PA MiKa                | red-hood              | 822,499,492   | 844,657,609   | +2.69% |
| N5 snowwhite-HA fire   | privaty               | 609,696,040   | 609,808,639   | +0.02% |
| N5 snowwhite-HA fire   | diesel-winter-sweets  | 362,861,730   | 364,956,066   | +0.58% |

Comps with ZERO movement (every unit row byte-identical): N1 rapi/quency wind,
N10 milk/phantom electric, N3 scarlet/liberalio iron, N6 mihara/maiden wind,
N8 emma/eunhwa duo fire, N9 redhood/elegg electric, PD Eva duo, PH water B3s, T1, T1 wind-weak,
T2 (legacy key), T5 wind-weak, elec DPS (run E order), elec battery (run B order),
iron sweep (run G), soda-tb control ×2 — **84 unit rows unmoved**. Every comp with movement
seats `anis-star`; every comp without her is exactly unmoved.

(PA MiKa's per-unit moves up to +5.91% arrive with its FB count byte-unchanged at 11×25 —
the movement is burst-cast **timing** inside the same rotation count. No damage-path code was
touched; the diff is the carve-out map entry + one characters.json line.)

---

## 6. Test / gate results

- `npx vitest run scripts/tests/units/anis-star.test.ts` — 22/22 pass (18 existing + G1–G4).
- Full `npx vitest run` after the change surfaced 7 battery-pin failures + 3 environmental
  (prerender-api-parity, the known fresh-worktree missing `web/public/*.json` artifacts).
  The 7 battery pins were re-derived from their instruments' own `--json` output and updated:
  - `focus-columns.test.ts` (T5 rows): focusPer60 8.186→10.917, maxAltUpside 3.274→4.367,
    shortfallRate 26.032→22.681, coverPct 12.6→19.3. T5's focused unit IS anis-star
    (middle slot). iron sweep rows byte-unchanged.
  - `multihit-crediting.test.ts`: noir basePer60 12.93→12.01, trigPer60 16.92→16.55;
    misc B3s baseTeamRate 34.53→35.21, trigTeamRate 37.28→38.86; the `SGGAUGE=trigger`
    counterfactual arm now reads misc B3s trigFb **13** vs baseFb 12 (see §7.1).
  - `refill-starvation.test.ts` (T5 rows): team first1sRatio 1.407→1.130 (still above the
    pre-committed 0.8 threshold); per-unit first-1s nayuta 1.035 / cinderella-crystal-wave
    1.218 / anis-star 0.905 / liberalio 1.113 / velvet 1.192; teamHits [327,320,592,703]→
    [304,314,583,721]; cinderella-crystal-wave now shows 2 reload-bound window-first hits
    (see §7.2). iron sweep rows byte-unchanged.
- `npm run dpschart` — exit 0 (90 cells × 73 B3, 23.7s). `npm run ranks:all` — exit 0.
- `bash scripts/verify.sh` — first run exit 1 with exactly 3 doc-drift findings (the derived
  hitsPerShot censuses in STATE.md §5 / engine-modeling-gaps.md stale against the tree);
  after the scripted `doc-drift.ts --update` + the prose count cell (34→33), re-run
  **exit 0 — "verify: all checks passed"** (includes the full vitest suite, prerender parity
  against the fresh web artifacts, doll regression, doc drift).

---

## 7. Anomalies & observations (neutral)

1. **The `SGGAUGE=trigger` A/B footprint changed.** The multihit-crediting instrument's
   per-trigger counterfactual arm (default-OFF, refuted-reading revert per CLAUDE.md) now
   moves misc B3s (run I order) 12→13 FBs — its recorded sizing ("zero Full-Burst movement
   anywhere") predates this change. The comp now sits near the 13-FB boundary at base 12, and
   the arm's extra SG gauge tips it over. The base arm (the shipped engine) stays 12. Existing
   references to the "zero FB movement" sizing (CLAUDE.md verified-facts §, U40 lineage) date
   from the divisor-2 basis; not touched in this step.
2. **One reload-bound window-first count appeared.** In the refill-starvation audit,
   cinderella-crystal-wave on T5 now has 2 window-first hits landing on reload completions
   (previously zero across every unit/comp). Every other unit on every audited comp remains 0;
   T5's team first-1s ratio 1.130 remains above the plan's pre-committed 0.8 threshold.
3. **T5's measured shortfall narrows but persists**: 26.03→22.68 gauge/s (49.67→43.28
   gauge/cycle). T5 sim FB is now 12×100% vs measured 13; T1 11×60%/12×40% vs measured 13.
   Both remain disabled/open per the packet's H0c handling.
4. **T4/T7 (ungraded) gained upper-tail mass**: T4 13×100% → 13×96%/14×4% (the comp comment
   records real 14); T7 11×100% → 11×96%/12×4%. First-FB windows moved earlier by ~0.2–0.3s
   (T4 3.9–4.4 → 3.7–4.2s; T7 6.4–6.9 → 6.1–6.6s; T1 5.7–6.3 → 5.5–5.8s; T5 unchanged
   5.5–6.0s).
5. **N5's own anis-star snapshot row is unmoved** (her seeded-mean total identical); only
   privaty +0.02% and diesel-winter-sweets +0.58% moved there, and its seeded FB mix is
   byte-identical (12×21 13×4).
6. **verify.sh's doc-drift gate forced two derived-doc touches** (STATE.md §5 census row,
   engine-modeling-gaps.md generated census) — done via the gate's own scripted `--update`
   plus the prescribed hand-fix of the prose count; the scripted update left a malformed
   empty-slug fragment (`` `modernia`/`` ``) in the STATE.md prose cell which was cleaned in
   the same edit. The interpretive step-5 docs (DECISIONS, QUEUE, U28, burst-gauge.md,
   game-mechanics.md, sources.json) remain untouched for the landing step.
7. **Escaped-tick pin empirics (G2 fixture)**: 9 casts in 180s, 0 Full Bursts, gauge delta
   26.712 = 9 × 2.968 = 9 × (2.8 × 1.06) exactly — consistent with one escaped 40th tick per
   cast at the undivided credit under her own ×1.06 aura.
8. The experiment harness's `ONLY='T4'` substring also matched the committed "T4b water-weak
   REPLICATE" comp; both are reported (baseline 13×100% both; test arm 13×96%/14×4% both).

Raw command logs for both arms are under `/tmp/anis-star-arms/` on this machine
(`baseline-*.txt`, `test-*.txt`, `gate-*.txt`); every number above is transcribed from them or
from the instruments' `--json` output.
