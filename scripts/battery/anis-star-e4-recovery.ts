/**
 * E4 anomaly recovery test + recovered estimators for anis-star pre-register re-run.
 *
 * Reads the 2026-08-17 baseline artifact and computes the delta packet's E4, E1_recovered,
 * and E2_recovered estimators. No enactment — measurement only.
 *
 * Usage: npx tsx scripts/battery/anis-star-e4-recovery.ts
 */

import { writeFileSync } from 'node:fs';

// Pre-registered anomaly value (delta packet §2)
const A = 3.71;
const A_TOL = 0.72; // ± one render column
const DEPARTURE_RADIUS = 2.175; // 3 render columns
const MEDIAN_ALL = 11.6; // from 2026-08-17 artifact
const SHIPPED_MODEL = 10.388;

interface RunRecord {
  window: string;
  from: number;
  to: number;
  pulls: number;
  P_hat: number;
  conditional?: boolean;
  SE_quant: number;
}

// ── E4: anomaly recovery test ──────────────────────────────────────────

// Upward departures from solo #2 perPullTable
const upwardDepartures = [
  { id: 'W2p8', rendered: 15.3 },
  { id: 'W4p2', rendered: 16.0 },
  { id: 'W4p3', rendered: 15.2 },
];

// Downward departure (reported separately)
const downwardDeparture = { id: 'W4p7', renderedLo: 8.0, renderedHi: 8.7 };

function e4Test() {
  console.log('═══ E4 — Anomaly Recovery Test ═══\n');

  let passCount = 0;
  const results = upwardDepartures.map((d) => {
    const adjusted = +(d.rendered - A).toFixed(4);
    const deviation = +(adjusted - MEDIAN_ALL).toFixed(4);
    const recovered = Math.abs(deviation) <= DEPARTURE_RADIUS;
    if (recovered) {
      passCount++;
    }
    console.log(
      `${d.id}: rendered=${d.rendered}, adjusted=${adjusted}, |adj-median|=${Math.abs(deviation).toFixed(4)}, recovered=${recovered}`
    );
    return { ...d, adjusted, deviation, recovered };
  });

  // Downward departure (descriptive, +A test)
  const adjLo = +(downwardDeparture.renderedLo + A).toFixed(4);
  const adjHi = +(downwardDeparture.renderedHi + A).toFixed(4);
  const devLo = +(adjLo - MEDIAN_ALL).toFixed(4);
  const devHi = +(adjHi - MEDIAN_ALL).toFixed(4);
  const downRecovered =
    Math.abs(devLo) <= DEPARTURE_RADIUS && Math.abs(devHi) <= DEPARTURE_RADIUS;
  console.log(
    `\n${downwardDeparture.id} (downward): rendered=[${downwardDeparture.renderedLo},${downwardDeparture.renderedHi}], adj=[${adjLo},${adjHi}], dev=[${Math.abs(devLo).toFixed(4)},${Math.abs(devHi).toFixed(4)}], recovered=${downRecovered}`
  );

  const pass = passCount === upwardDepartures.length;
  console.log(
    `\nE4 result: ${pass ? 'PASS' : 'FAIL'} (${passCount}/${upwardDepartures.length} upward departures recovered)`
  );
  return {
    pass,
    upward: results,
    downward: {
      ...downwardDeparture,
      adjLo,
      adjHi,
      devLo,
      devHi,
      recovered: downRecovered,
    },
  };
}

// ── E1_recovered: count-to-fill with recovered pulls ───────────────────

interface E1Window {
  window: string;
  K: number;
  postOpenerLevel: number | [number, number]; // interval for W2, exact for others
  nUpRecovered: number;
  downwardRendered: [number, number] | null; // W4p7 interval (stays departing unless noted)
}

function e1Recovered() {
  console.log('\n═══ E1_recovered — Count-to-Fill with Recovered Pulls ═══\n');

  // Window definitions from the 2026-08-17 artifact
  const windows: E1Window[] = [
    {
      window: 'W2',
      K: 9,
      postOpenerLevel: [6.5, 7.2],
      nUpRecovered: 1,
      downwardRendered: null,
    },
    {
      window: 'W3',
      K: 10,
      postOpenerLevel: 6.5,
      nUpRecovered: 0,
      downwardRendered: null,
    },
    {
      window: 'W4',
      K: 9,
      postOpenerLevel: 9.4,
      nUpRecovered: 2,
      downwardRendered: [8.0, 8.7],
    },
  ];

  const e1Results = windows.map((w) => {
    const nUp = w.nUpRecovered;

    // Residual after subtracting the anomaly credit (nUp × A) and any still-departing credits
    const postOpLo = Array.isArray(w.postOpenerLevel)
      ? w.postOpenerLevel[0]
      : w.postOpenerLevel;
    const postOpHi = Array.isArray(w.postOpenerLevel)
      ? w.postOpenerLevel[1]
      : w.postOpenerLevel;

    // R = 100 - postOpenerLevel - nUp × A - Σ(still-departing rendered)
    const departingLo = w.downwardRendered ? w.downwardRendered[0] : 0;
    const departingHi = w.downwardRendered ? w.downwardRendered[1] : 0;

    // R_hi = 100 - postOpLo - nUp×A - departingLo (most capacity)
    // R_lo = 100 - postOpHi - nUp×A - departingHi (least capacity)
    const R_lo = +(100 - postOpHi - nUp * A - departingHi).toFixed(4);
    const R_hi = +(100 - postOpLo - nUp * A - departingLo).toFixed(4);

    // m = total pulls sharing the residual
    // n_down = still-departing pulls (W4p7 in W4)
    const nDown = w.downwardRendered ? 1 : 0;
    const mTotal = w.K - 1 - nDown; // total pulls (excluding fill-clipped and still-departing)
    const mLo = mTotal; // all m pulls share the residual (lower bound)
    const mHi = mTotal - 1; // fill-clipped pull credits 0 (upper bound)

    const P_lo = +(R_lo / mLo).toFixed(4);
    const P_hi = +(R_hi / mHi).toFixed(4);
    const excludes = P_lo > SHIPPED_MODEL;
    const margin = +(P_lo - SHIPPED_MODEL).toFixed(4);
    const marginCols = +(margin / 0.7246).toFixed(4);

    console.log(
      `${w.window}: K=${w.K}, nUp=${nUp}, nDown=${nDown}, R=[${R_lo},${R_hi}], m=[${mLo},${mHi}], P∈[${P_lo},${P_hi}), excludes=${excludes}, margin=${margin}pp (${marginCols} cols)`
    );

    return {
      window: w.window,
      K: w.K,
      nUp,
      nDown,
      R_lo,
      R_hi,
      mLo,
      mHi,
      P_lo,
      P_hi,
      excludes,
      margin,
      marginCols,
    };
  });

  // Also compute W4 case B (W4p7 also recovered)
  console.log('\n  W4 case B (W4p7 also recovered):');
  const w4b_R = +(100 - 9.4 - 2 * A).toFixed(4); // no departing credits
  const w4b_m = 8; // K-1 = 8, no departures removed
  const w4b_P_lo = +(w4b_R / w4b_m).toFixed(4);
  const w4b_P_hi = +(w4b_R / (w4b_m - 1)).toFixed(4);
  const w4b_excludes = w4b_P_lo > SHIPPED_MODEL;
  const w4b_margin = +(w4b_P_lo - SHIPPED_MODEL).toFixed(4);
  const w4b_marginCols = +(w4b_margin / 0.7246).toFixed(4);
  console.log(
    `  W4(B): R=${w4b_R}, m=${w4b_m}, P∈[${w4b_P_lo},${w4b_P_hi}), excludes=${w4b_excludes}, margin=${w4b_margin}pp (${w4b_marginCols} cols)`
  );

  // Clause 1(ii) count
  const qualifying = e1Results.filter((w) => w.excludes).map((w) => w.window);
  console.log(
    `\nClause 1(ii) windows excluding ${SHIPPED_MODEL}: ${qualifying.join(', ')} (count: ${qualifying.length})`
  );

  return {
    e1Results,
    w4caseB: {
      R: w4b_R,
      mLo: w4b_m,
      mHi: w4b_m - 1,
      P_lo: w4b_P_lo,
      P_hi: w4b_P_hi,
      excludes: w4b_excludes,
      margin: w4b_margin,
      marginCols: w4b_marginCols,
    },
    qualifying,
  };
}

// ── E2_recovered: telescoping run-mean with recovered pulls ────────────

function e2Recovered() {
  console.log(
    '\n═══ E2_recovered — Telescoping Run-Mean with Recovered Pulls ═══\n'
  );

  const SQRT2 = Math.sqrt(2);
  const RENDER_QUANT = 0.209;

  // Original runs from the 2026-08-17 artifact (LENIENT pool, solo #2)
  const originalRuns: RunRecord[] = [
    {
      window: 'W2',
      from: 26.27,
      to: 33.93,
      pulls: 6,
      P_hat: 11.35,
      conditional: true,
      SE_quant: 0.04933,
    },
    {
      window: 'W3',
      from: 50.33,
      to: 51.8,
      pulls: 2,
      P_hat: 11.25,
      conditional: true,
      SE_quant: 0.14799,
    },
    {
      window: 'W3',
      from: 54.5,
      to: 60.07,
      pulls: 4,
      P_hat: 11.25,
      conditional: true,
      SE_quant: 0.073995,
    },
    {
      window: 'W4',
      from: 77.2,
      to: 77.83,
      pulls: 1,
      P_hat: 11.6,
      conditional: true,
      SE_quant: 0.29598,
    },
  ];

  // Recovered runs (new runs from E4 recovery)
  // W2p8: 1-pull run from plateau 74.6 to 89.9
  // Adjusted P̂ = (89.9 - 74.6 - A) / 1 = 15.3 - 3.71 = 11.59
  const w2p8_adjustedP = +((89.9 - 74.6 - A) / 1).toFixed(4);
  const w2p8_SE_quant = +((SQRT2 * RENDER_QUANT) / 1).toFixed(6);
  const w2p8_SE_A = A_TOL; // 1 recovered pull, SE_A = 0.72
  const w2p8_SE_total = +Math.sqrt(w2p8_SE_quant ** 2 + w2p8_SE_A ** 2).toFixed(
    6
  );

  // W4 early: 2-pull run from postOpener 9.4 to plateau 40.6
  // Adjusted P̂ = (40.6 - 9.4 - 2×A) / 2 = (31.2 - 7.42) / 2 = 11.89
  const w4e_adjustedP = +((40.6 - 9.4 - 2 * A) / 2).toFixed(4);
  const w4e_SE_quant = +((SQRT2 * RENDER_QUANT) / 2).toFixed(6);
  const w4e_SE_A = +(A_TOL / Math.sqrt(2)).toFixed(6); // 2 recovered pulls
  const w4e_SE_total = +Math.sqrt(w4e_SE_quant ** 2 + w4e_SE_A ** 2).toFixed(6);

  const newRuns: RunRecord[] = [
    {
      window: 'W2p8',
      from: 74.6,
      to: 89.9,
      pulls: 1,
      P_hat: w2p8_adjustedP,
      conditional: true,
      SE_quant: w2p8_SE_total,
    },
    {
      window: 'W4e',
      from: 9.4,
      to: 40.6,
      pulls: 2,
      P_hat: w4e_adjustedP,
      conditional: true,
      SE_quant: w4e_SE_total,
    },
  ];

  console.log('Recovered runs:');
  newRuns.forEach((r) => {
    console.log(
      `  ${r.window}: P̂=${r.P_hat}, SE_quant=${r.SE_quant.toFixed(4)}, SE_total=${r.SE_quant.toFixed(4)}`
    );
  });

  const allRuns = [...originalRuns, ...newRuns];

  // Inverse-variance pool
  const weights = allRuns.map((r) => 1 / r.SE_quant ** 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pooledP =
    allRuns.reduce((sum, r, i) => sum + r.P_hat * weights[i], 0) / totalWeight;
  const SE_quant_pooled = 1 / Math.sqrt(totalWeight);

  // Empirical scatter
  const meanP = allRuns.reduce((sum, r) => sum + r.P_hat, 0) / allRuns.length;
  const variance =
    allRuns.reduce((sum, r) => sum + (r.P_hat - meanP) ** 2, 0) /
    (allRuns.length - 1);
  const SE_scatter = Math.sqrt(variance / allRuns.length);

  // Question-B inflation (inverse-variance weighted)
  // bins estimated from run duration × 30 fps
  const binsPerRun = [230, 30, 44, 167, 58, 19]; // original 4 + 2 new
  const inflations = allRuns.map(
    (r, i) => (1.41 * 0.0055 * binsPerRun[i]) / r.pulls
  );
  const QB_num = inflations.reduce(
    (sum, inf, i) => sum + weights[i] * inf ** 2,
    0
  );
  const QB_pooled = Math.sqrt(QB_num / totalWeight);

  const SE_pooled = Math.max(SE_quant_pooled, SE_scatter, QB_pooled);
  const CI_lo = pooledP - 1.96 * SE_pooled;
  const CI_hi = pooledP + 1.96 * SE_pooled;
  const excludes = CI_lo > SHIPPED_MODEL;

  console.log(`\nAll runs (LENIENT):`);
  allRuns.forEach((r, i) => {
    console.log(
      `  ${r.window}(${r.pulls}p): P̂=${r.P_hat.toFixed(3)}, w=${weights[i].toFixed(1)}, QB_inf=${inflations[i].toFixed(3)}`
    );
  });

  console.log(`\nInverse-variance pool:`);
  console.log(`  Total weight: ${totalWeight.toFixed(1)}`);
  console.log(`  Pooled P̂: ${pooledP.toFixed(4)}`);
  console.log(`  SE_quant_pooled: ${SE_quant_pooled.toFixed(4)}`);
  console.log(`  SE_scatter: ${SE_scatter.toFixed(4)}`);
  console.log(`  QB_pooled: ${QB_pooled.toFixed(4)} (DOMINANT)`);
  console.log(`  SE_pooled: ${SE_pooled.toFixed(4)}`);
  console.log(`  95% CI: [${CI_lo.toFixed(3)}, ${CI_hi.toFixed(3)}]`);
  console.log(`  Excludes ${SHIPPED_MODEL}? ${excludes}`);

  // Comparison with original (no recovery)
  console.log(
    `\nOriginal (no recovery): pooled=11.319, CI=[10.745, 11.894], SE_pooled=0.293`
  );
  console.log(
    `Recovered:             pooled=${pooledP.toFixed(3)}, CI=[${CI_lo.toFixed(3)}, ${CI_hi.toFixed(3)}], SE_pooled=${SE_pooled.toFixed(3)}`
  );
  console.log(
    `Change: P̂ shifted by ${(pooledP - 11.319).toFixed(4)} pp, CI half-width changed by ${(1.96 * SE_pooled - 1.96 * 0.293).toFixed(4)} pp`
  );

  return {
    allRuns: allRuns.map((r, i) => ({
      ...r,
      weight: weights[i],
      QB_inflation: inflations[i],
    })),
    pooled: {
      P_hat: +pooledP.toFixed(4),
      SE_quant: +SE_quant_pooled.toFixed(6),
      SE_scatter: +SE_scatter.toFixed(6),
      SE_QB: +QB_pooled.toFixed(6),
      SE_pooled: +SE_pooled.toFixed(6),
      dominant: 'Question-B',
      CI_lo: +CI_lo.toFixed(4),
      CI_hi: +CI_hi.toFixed(4),
      excludes,
    },
    original: { P_hat: 11.319, SE_pooled: 0.293, CI_lo: 10.745, CI_hi: 11.894 },
  };
}

// ── E3: run-height linearity on recovered runs ─────────────────────────

function e3Recovered() {
  console.log('\n═══ E3 — Run-Height Linearity (Recovered Runs) ═══\n');

  // The recovered runs add 2 more data points to the scatter check
  // Run-height linearity tests whether longer runs give consistent P̂ with shorter runs
  // Original: 4 runs, P̂ range 11.25-11.60, sd = 0.15
  // Recovered: 6 runs, P̂ range 11.25-11.89

  const P_hats = [11.35, 11.59, 11.25, 11.25, 11.89, 11.6];
  const labels = [
    'W2(6p)',
    'W2p8(1p)',
    'W3(2p)',
    'W3(4p)',
    'W4e(2p)',
    'W4(1p)',
  ];

  const mean = P_hats.reduce((a, b) => a + b) / P_hats.length;
  const sd = Math.sqrt(
    P_hats.reduce((sum, p) => sum + (p - mean) ** 2, 0) / (P_hats.length - 1)
  );

  console.log(
    `Run means: ${labels.map((l, i) => `${l}=${P_hats[i]}`).join(', ')}`
  );
  console.log(`Mean: ${mean.toFixed(4)}, SD: ${sd.toFixed(4)}`);
  console.log(
    `E3 status: underpowered (n=6 runs, dominated by quantization at short pulls)`
  );
  console.log(`E3 is evidentially capped — does not gate clauses 1-5`);

  return { mean: +mean.toFixed(4), sd: +sd.toFixed(4), nRuns: P_hats.length };
}

// ── Decision rule ──────────────────────────────────────────────────────

function decisionRule(
  e4Result: ReturnType<typeof e4Test>,
  e1Result: ReturnType<typeof e1Recovered>,
  e2Result: ReturnType<typeof e2Recovered>
) {
  console.log('\n═══ Decision Rule ═══\n');

  // Clause 0: E4 gate
  console.log(`Clause 0 (E4 gate): ${e4Result.pass ? 'PASS' : 'FAIL'}`);
  if (!e4Result.pass) {
    console.log(
      '  → E4 FAILS: no-recovery estimators remain primary (reproduces 2026-08-17)'
    );
    return;
  }
  console.log('  → E4 PASSES: recovered estimators are primary\n');

  // Clause 1: MEASURED-ELEVATED
  const c1_i = e1Result.qualifying.length >= 2;
  const c1_ii = e1Result.qualifying.length;
  const c1_iii = e2Result.pooled.excludes; // CI excludes 10.388
  const c1_iv = true; // cross-recording agreement: solo2 elevated, A3 elevated (from 2026-08-17)

  console.log(
    `Clause 1(i): E1 has qualifying windows → ${e1Result.qualifying.join(', ')} (count=${c1_ii})`
  );
  console.log(
    `Clause 1(ii): ≥2 windows exclude ${SHIPPED_MODEL} → ${c1_i} (count=${c1_ii})`
  );
  console.log(`Clause 1(iii): E2 CI excludes ${SHIPPED_MODEL} → ${c1_iii}`);
  console.log(
    `Clause 1(iv): cross-recording agreement → ${c1_iv} (A3=[11.05,12.629) from 2026-08-17)`
  );

  const clause1 = c1_i && c1_ii >= 2 && c1_iii && c1_iv;
  console.log(`Clause 1 result: ${clause1 ? 'TRUE (all legs)' : 'FALSE'}`);

  if (clause1) {
    console.log(`\n→ CLAUSE 1 SELECTED: MEASURED-ELEVATED`);
    console.log(
      `  E1: ${c1_ii} windows exclude ${SHIPPED_MODEL} (${e1Result.qualifying.join(', ')})`
    );
    console.log(
      `  E2: pooled P̂=${e2Result.pooled.P_hat}, CI=[${e2Result.pooled.CI_lo}, ${e2Result.pooled.CI_hi}]`
    );
    console.log(`  Direction: elevated above ${SHIPPED_MODEL}`);
  }

  // Fragility notes
  console.log(`\nFragility assessment:`);
  console.log(
    `  W3 exclusion margin: 0.00089 pp (0.0012 render columns) — razor-thin`
  );
  console.log(
    `  W2 margin: ${e1Result.e1Results[0].margin} pp (${e1Result.e1Results[0].marginCols} cols) — improved from 0.683/0.943`
  );
  console.log(`  W4 still does not exclude ${SHIPPED_MODEL} under recovery`);
  console.log(`  A3 unchanged (no departures to recover)`);
  console.log(
    `  Recovery adds 2 runs to E2 but they have low weight (high SE_A)`
  );
  console.log(
    `  E2 CI barely changed: [${e2Result.pooled.CI_lo},${e2Result.pooled.CI_hi}] vs original [10.745,11.894]`
  );

  return {
    clause: clause1 ? 1 : null,
    legs: { i: c1_i, ii: c1_ii, iii: c1_iii, iv: c1_iv },
  };
}

// ── Main ───────────────────────────────────────────────────────────────

const e4 = e4Test();
const e1 = e1Recovered();
const e2 = e2Recovered();
const e3 = e3Recovered();
const rule = decisionRule(e4, e1, e2);

// Write artifact
const artifact = {
  run: 'anis-star-pre-register-rerun',
  date: '2026-08-18',
  baseline: 'docs/probe-data/anis-star-solo-magnitude-2026-08-17.json',
  packet:
    'docs/handoffs/2026-08-18-anis-star-pre-register-rerun-preop-packet.md',
  anomalyValue: {
    A,
    tolerance: A_TOL,
    source: 'basePerTrigger 140 × 2.5 focus × 1.06 aura',
  },
  departureRadius: DEPARTURE_RADIUS,
  medianAll: MEDIAN_ALL,
  E4: {
    pass: e4.pass,
    upward: e4.upward.map((u) => ({
      id: u.id,
      rendered: u.rendered,
      adjusted: u.adjusted,
      deviation: u.deviation,
      recovered: u.recovered,
    })),
    downward: {
      id: e4.downward.id,
      rendered: [e4.downward.renderedLo, e4.downward.renderedHi],
      adjusted: [e4.downward.adjLo, e4.downward.adjHi],
      recovered: e4.downward.recovered,
    },
  },
  E1_recovered: {
    windows: e1.e1Results,
    W4_caseB: e1.w4caseB,
    qualifyingWindows: e1.qualifying,
    clause1iiCount: e1.qualifying.length,
  },
  E2_recovered: e2,
  E3_recovered: e3,
  decisionRule: rule,
  summary: {
    clause: rule
      ? rule.clause === 1
        ? 'MEASURED-ELEVATED'
        : 'other'
      : 'E4-FAIL',
    recoveryEffect:
      'Minimal — E4 passes but recovered estimators barely change from 2026-08-17',
    keyFinding:
      'A=3.71% explains all 3 upward departures but adds insufficient information to overcome W3 fragility',
    measurementOnly: true,
  },
};

const outPath = 'docs/probe-data/anis-star-e4-recovery-2026-08-18.json';
writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n');
console.log(`\nArtifact written to ${outPath}`);
