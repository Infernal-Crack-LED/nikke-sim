/**
 * gauge-fill.py TEAM MODE (--team) — self-validation on a team recording.
 *
 * WHY THIS EXISTS: the solo self-calibration provably mis-locks on team footage (it settled on a
 * 128px sub-region and produced stuck 44-57% reads that did not track the gauge at all). Team mode
 * replaces it with an explicit magenta-vote lock on the burst widget. This test pins BOTH the lock
 * and the artifact resolution so a later CV change cannot silently reintroduce the mis-lock.
 *
 * WHAT THE LABELS ARE — and what they deliberately are NOT. Every assertion below is scored against
 * either the trace's own internal structure or docs/probe-data/tempo-cycle-u8-g-iron-sweep.json,
 * whose burst-chain stage timestamps come from scan-frames.py's hexagon detector (validated for
 * Full-Burst counts on 8 team recordings, docs/probe-runs.md) and were produced long before this
 * reader existed. Nothing here is scored against data/gauge-per-shot.json, sim output, or any
 * per-shot gauge value: those are exactly the quantities a measurement built on this reader would
 * test, so validating against them would be circular.
 *
 * WHAT THIS TEST DOES NOT BLESS: any absolute fill magnitude. `lowFill` reads are an owner-ruled UI
 * artifact (the bar's first paint and the "BURST" label), the gain-pulse animation blinds the reader
 * for ~0.25s around large steps, and the trace is the TEAM SUM — it never isolates one unit. The
 * assertions are about the reader's lock, its segmentation and its monotone structure only.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Read = {
  t: number;
  state: string;
  fillRaw: number | null;
  flags: string[];
};
type Trace = {
  bar: {
    widthPx: number;
    rows: [number, number];
    absolute: { rows: [number, number]; x0: number; x1: number };
  };
  reads: Read[];
};

const trace = JSON.parse(
  readFileSync(
    new URL('./fixtures/gauge-fill-team-u8-g-30fps.json', import.meta.url),
    'utf8'
  )
) as Trace;

const tempo = JSON.parse(
  readFileSync(
    new URL(
      '../../docs/probe-data/tempo-cycle-u8-g-iron-sweep.json',
      import.meta.url
    ),
    'utf8'
  )
) as { burstChains: { stage1: number | null }[] };

const stage1s = tempo.burstChains
  .map((c) => c.stage1)
  .filter((s): s is number => s != null);

/** Refill windows as the reader segments them: a charging run terminated by the full instant. */
function refillWindows(reads: Read[]) {
  const out: { run: Read[]; full: Read }[] = [];
  let cur: Read[] = [];
  for (const r of reads) {
    if (r.state === 'filling' || r.state === 'flash') {
      cur.push(r);
    } else {
      if (r.state === 'full' && cur.length) {
        out.push({ run: cur, full: r });
      }
      cur = [];
    }
  }
  return out;
}

/** Reads a consumer may trust: charging, valued, and carrying no artifact flag. */
const UNTRUSTED = new Set([
  'lowFill',
  'inFlashSpan',
  'nonMonotonic',
  'spike',
  'levelDrop',
]);
function cleanReads(run: Read[]) {
  return run.filter(
    (r) =>
      r.state === 'filling' &&
      r.fillRaw != null &&
      !r.flags.some((f) => UNTRUSTED.has(f))
  );
}

const windows = refillWindows(trace.reads);

describe('gauge-fill.py --team: the lock', () => {
  it('locks the REAL team bar, not a sub-region', () => {
    // Measured 2026-08-14 on this recording, on docs/probes/probe u7/13 fb count wind weak vid.MP4
    // and on docs/probes/burst tests/alice focused.MP4 — all three give the same extent.
    expect(trace.bar.widthPx).toBe(134);
    expect(trace.bar.absolute.x0).toBe(2477);
    expect(trace.bar.absolute.x1).toBe(2610);
    expect(trace.bar.absolute.rows).toEqual([491, 498]);
  });

  it('is nowhere near the 128px sub-region the solo lock fell into', () => {
    expect(trace.bar.widthPx).toBeGreaterThan(128);
  });
});

describe('gauge-fill.py --team: full instant vs the chain-stage detector', () => {
  it('finds exactly one full instant per refill window in the fixture', () => {
    expect(windows.length).toBe(4);
    expect(trace.reads.filter((r) => r.state === 'full').length).toBe(4);
  });

  it('places every full instant just before the chain stage-1 hexagon', () => {
    const residuals = windows.map(({ full }) => {
      const s = stage1s.reduce((a, b) =>
        Math.abs(b - full.t) < Math.abs(a - full.t) ? b : a
      );
      return full.t - s;
    });
    // Measured: mean -0.025s, sd 0.008s, range [-0.034, -0.017] on this fixture (whole-recording:
    // 12/12 chains, mean -0.032s sd 0.013s; probe u7: 12/12, mean -0.051s sd 0.019s). NOTE: this
    // is ~1 frame, NOT the ~0.5s "30f pre-B1" gap. The reader REPORTS the offset; adjudicating it
    // is a measurement's job, not this instrument's.
    for (const d of residuals) {
      expect(d).toBeLessThan(0);
      expect(d).toBeGreaterThan(-0.1);
    }
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    expect(mean).toBeCloseTo(-0.025, 2);
  });
});

describe('gauge-fill.py --team: refill-window structure', () => {
  it('rises monotonically through each window, within reader noise', () => {
    for (const { run } of windows) {
      const clean = cleanReads(run);
      expect(clean.length).toBeGreaterThanOrEqual(30);
      let max = -1;
      for (const r of clean) {
        expect(r.fillRaw!).toBeGreaterThanOrEqual(max - 1.5);
        max = Math.max(max, r.fillRaw!);
      }
      // The flags are meant to be RARE on a good window, not a blanket excuse.
      expect(
        run.filter((r) => r.flags.includes('nonMonotonic')).length
      ).toBeLessThanOrEqual(3);
    }
  });

  it('closes each window over most of the bar, and resets at the chain', () => {
    for (const { run } of windows) {
      const clean = cleanReads(run);
      const first = clean[0].fillRaw!;
      const last = clean[clean.length - 1].fillRaw!;
      expect(last).toBeGreaterThan(88); // reaches the top before the chain
      expect(last - first).toBeGreaterThan(70); // covers most of the bar's extent
    }
    // Each window starts low again: the chain zeroed the bar between them.
    for (const { run } of windows) {
      expect(cleanReads(run)[0].fillRaw!).toBeLessThan(30);
    }
  });

  it('cannot see the first ~1s of a refill window (the Full-Burst bar still owns the slot)', () => {
    // A real, reportable blind spot rather than a defect to hide: the drained Full-Burst bar
    // lingers in the widget slot before the charging bar paints. Measured 0.95-1.70s here.
    for (const { run } of windows) {
      expect(run[0].flags.includes('burstRender')).toBe(false);
    }
    const leadIns = windows.map(({ run }) => run[0].t);
    expect(Math.min(...leadIns)).toBeGreaterThan(21);
  });
});

describe('gauge-fill.py --team: artifact flags', () => {
  it('drops the value on every non-charging render', () => {
    for (const r of trace.reads) {
      if (['fullburst', 'burstRender', 'chain', 'flash'].includes(r.state)) {
        expect(r.fillRaw).toBeNull();
      }
    }
  });

  it('catches the gain-pulse flash instead of reporting it as a full bar', () => {
    // The regression this guards: the whole bar momentarily renders at fill colour, which is
    // per-frame indistinguishable from 100%. Only the temporal check separates them.
    const flashes = trace.reads.filter((r) => r.state === 'flash');
    expect(flashes.length).toBeGreaterThanOrEqual(10);
    for (const f of flashes) {
      expect(f.flags).toContain('noDarkTrack');
    }
    // ...and none of them was minted into a full instant.
    for (const f of flashes) {
      expect(f.state).not.toBe('full');
    }
  });

  it('flags the low-fill band rather than publishing it as gauge', () => {
    const low = trace.reads.filter(
      (r) => r.state === 'filling' && r.fillRaw != null && r.fillRaw < 8
    );
    expect(low.length).toBeGreaterThan(0);
    for (const r of low) {
      expect(r.flags).toContain('lowFill');
    }
  });

  it('labels the chain render, so no chain frame is read as gauge', () => {
    const chain = trace.reads.filter((r) => r.state === 'chain');
    expect(chain.length).toBeGreaterThan(0);
    for (const r of chain) {
      expect(r.flags).toContain('chainRender');
    }
  });
});
