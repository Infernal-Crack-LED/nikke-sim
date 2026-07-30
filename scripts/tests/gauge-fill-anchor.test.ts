/**
 * gauge-fill.py self-validation against the repo's labeled burst-gauge anchor.
 *
 * The anchor is the 2026-07-13 hand pixel read recorded in docs/data/burst-gauge.md section 6
 * (maiden-ice-rose, 12.55%/pull in two sub-steps of +9.1% then +3.45%). It was produced long
 * before any of these scripts existed, so scoring the reader against it is an INDEPENDENT
 * check, not a restatement of the reader's own output.
 *
 * The fixture is a committed 30fps run of scripts/probe/gauge-fill.py over that recording, so
 * this test pins the reader's ANALYSIS + the derived sub-step structure without needing to
 * decode video in CI. Regenerate it (and re-review these numbers) if the worker's CV changes.
 *
 * NOTE ON WHAT IS PINNED: the small (rider) sub-step is pinned tightly because it matches the
 * model exactly. The large (weapon) sub-step is pinned LOOSELY and deliberately — it measures
 * ~11% above the modelled 9.1%. A 2026-07-29 sampling-rate ladder + shot-counting on the anchor
 * (docs/handoffs/2026-07-29-gauge-fill-reader-calibration.md §RESULT) REFUTED the sampling-
 * artefact hypothesis: the large step is flat across 5/15/30/60fps, lands in a single 60fps
 * frame, and an 8-shots-to-full count bounds per-pull >= ~13.6%, EXCLUDING the documented
 * 12.55% — i.e. the reader is right and the 2026-07-13 hand anchor under-read the weapon
 * sub-step. WHY the weapon sub-step exceeds the modelled 910 energy is the open DECISIONS-tier
 * hypothesis (a) (charge-at-release > 1.0?), gated by /scientific-method. This test exists to
 * detect DRIFT in the reader, not to bless the game-truth value of either sub-step.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Read = { t: number; state: string; fillRaw: number | null };
const fixture = JSON.parse(
  readFileSync(
    new URL(
      './fixtures/gauge-fill-maiden-ice-rose-30fps.json',
      import.meta.url
    ),
    'utf8'
  )
) as { bar: { widthPx: number }; reads: Read[] };

/** Rising transitions in the filling series, i.e. gauge-generating events. */
function steps(reads: Read[], minDelta = 0.6) {
  const out: { t: number; delta: number }[] = [];
  let prev: number | null = null;
  for (const r of reads) {
    if (r.state === 'full') {
      break;
    }
    const v = r.fillRaw;
    if (prev != null && v != null && v - prev >= minDelta) {
      out.push({ t: r.t, delta: v - prev });
    }
    if (v != null) {
      prev = v;
    }
  }
  return out;
}

describe('gauge-fill.py vs the maiden-ice-rose labeled anchor', () => {
  const all = steps(fixture.reads);
  // The bar renders in ~0.7% quantisation units (1 column of 138). Sub-steps separate cleanly
  // into a ~3.6 "rider" family and a ~10 "weapon" family; anything below 1.5 is render noise.
  // >=3.0 rather than >=1.5: the very first rising edge (t=7.2, +2.9) is a partial opening step
  // before the firing cycle settles, not a rider sub-step.
  const rider = all.filter((s) => s.delta >= 3.0 && s.delta < 6);
  const weapon = all.filter((s) => s.delta >= 6);
  const significant = all.filter((s) => s.delta >= 1.5);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  it('self-calibrates the bar to its measured 138px extent', () => {
    expect(fixture.bar.widthPx).toBe(138);
  });

  it('resolves both sub-step families (the anchor is a two-sub-step unit)', () => {
    expect(rider.length).toBeGreaterThanOrEqual(6);
    expect(weapon.length).toBeGreaterThanOrEqual(5);
  });

  it('reproduces the RIDER sub-step exactly (model 3.64%)', () => {
    expect(mean(rider.map((s) => s.delta))).toBeCloseTo(3.64, 1);
  });

  it('reads the WEAPON sub-step ~11% above model 9.1% — pinned to catch drift, not to bless', () => {
    const m = mean(weapon.map((s) => s.delta));
    expect(m).toBeGreaterThan(9.5);
    expect(m).toBeLessThan(10.6);
  });

  it('detects the full/ready state rather than reporting it as empty', () => {
    // The regression this guards: a brightness-threshold reader scores the green full bar as
    // 0% fill, which is indistinguishable from an empty gauge.
    const full = fixture.reads.filter((r) => r.state === 'full');
    expect(full.length).toBeGreaterThan(0);
    expect(full.every((r) => r.fillRaw === 100)).toBe(true);
  });

  it('sees the reload gap as a cadence break, not a step', () => {
    // Over SIGNIFICANT steps only — the ~0.7% single-column jitter would otherwise bridge the gap.
    const ts = significant.map((s) => s.t);
    const gaps = ts.slice(1).map((t, i) => t - ts[i]);
    expect(Math.max(...gaps)).toBeCloseTo(3.17, 1); // the t=14.03 -> 17.20 reload
    // Within a magazine the cadence is a regular 1.37s pull (a 1.2s wait + the 0.17s
    // rider->weapon sub-step separation), so no other gap comes close to the reload.
    const withoutReload = gaps.filter((g) => g < 2.5);
    expect(Math.max(...withoutReload)).toBeLessThan(1.5);
  });
});
