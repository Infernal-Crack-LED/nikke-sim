// liberalio-gaugehits-ab.ts — SIZING ARM for the `liberalio` sub-hit gauge-credit finding
// (audit 2026-08-17, docs/handoffs/2026-08-17-liberalio-gauge-credit-audit.md).
//
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts            # FB counts + refill, both arms
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts --json
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts --residual  # 2026-08-17 scored arm (below)
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts --sizing    # gaugeHits ∈ {2,3,4}, LOG-only
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts --neutrality # D1 damage-neutrality check
//
// --residual / --sizing / --neutrality (added 2026-08-17) implement the APPROVED scored test that
// settles the estimator the header's follow-up (i) asked for. The refill estimator is
// `decomposeCycles().excess` from scripts/experiment.ts, scored against the committed 2026-08-14
// bar-paint fill-trace fixtures (docs/probe-data/fill-trace-*.json — measured refill per window =
// `fullInstant - barPaint`, median over `status:'ok'` windows). Residuals are scored relative to a
// liberalio-FREE control comp (PI2 misc B3s) rather than absolutely, because `excess` carries a
// known general over-statement vs the tape.
//
// MEASUREMENT-MATCHING. The iron-sweep footage (docs/probes/u8/u8 g vid.mov) was filmed with the
// camera focused on `maxwell` (Maxwell, SR/Iron — NOT `maxwell-ordinary-mechanic`), not on the
// `PG iron sweep` comp's default middle slot (`milk-blooming-bunny`, Milk: Blooming Bunny SR/Iron —
// NOT base `milk`). Focus grants ×2.5 charge-weapon gauge, which is INSIDE the measured
// quantity, so the scored iron-sweep arm overrides `focus` to 'maxwell' (the SSOT `Comp.focus`
// field). The shipped-focus arm is still printed, labelled EXCLUDED, so the size of the focus term
// is visible.
//
// THE FINDING. Her `skill1` rider is kit-literal "Deals 40.5% of final ATK as additional damage.
// Activates 5 times." — modeled as ONE aggregated `flatDamage` of 202.5 (the owner-confirmed,
// damage-validated reading). `docs/data/burst-gauge.md` §5 credits burst gauge PER skill-damage
// impact at the caster's target per-trigger value, so an aggregated multi-hit needs
// `flatDamage.gaugeHits` to declare its count. Hers is absent, so the engine credits 1 impact per
// full charge where the kit delivers 6 (1 bullet + 5 sub-hits) — a gauge-only defect, invisible in
// damage totals. Independent count check: rl3 33.6 = 2 triggers × 6 impacts × 2.8 base, exact.
//
// WHY IT IS NOT SHIPPED, AND WHY THIS SCRIPT EXISTS INSTEAD. Two MEASURED observables disagree
// about crediting all five, so the fix is sized here rather than defaulted on (the `nbo`
// swap-cadence precedent, QUEUE.md item 5):
//   * Full-Burst COUNTS move toward measured on all four of her comps, none overshooting.
//   * Refill-from-zero drops BELOW the measured refill on the same footage.
// That is the compensating-errors shape (memory: "for interacting timing/gauge corrections, gather
// the FULL measured timeline and land them together") — a real credit can still be the wrong
// magnitude if something else in these comps over-generates and was cancelling it. Whoever settles
// it should pin the refill ESTIMATOR first: the third-arm run's own follow-up (i) is that a control
// must pin how its quantity is measured, not just its tolerance, and every detection on this thread
// is estimator-conditional.
//
// The four comps below are exactly the four `disabled: true` comps in scripts/regression.ts — the
// set of comps containing `liberalio` and the set disabled for the burst-generation FB shortfall
// coincide perfectly, which is why a per-unit defect in her model is the natural suspect.
import { COMPS, decomposeCycles, run } from '../experiment.js';
// `OverrideFile` lives in src/skills/index.ts, NOT src/skills/types.ts (which exports `EffectDef`).
// The original import pointed at types.js, where the name does not exist — `tsc -p tsconfig.json`
// was RED on that alone (TS2305 plus two implicit-any follow-ons), fixed 2026-08-17.
import type { OverrideFile } from '../../src/skills/index.js';
import type { EffectDef } from '../../src/skills/types.js';

const SLUG = 'liberalio';
type Comp = (typeof COMPS)[number];

/**
 * The proposed arm: credit all five rider sub-hits. An `experiment.ts` Patch — it receives a deep
 * copy of the shipped override and returns it mutated, so the shipped file is never touched.
 * Damage is byte-identical either way; only the gauge channel moves.
 */
const gaugeHitsArm =
  (n: number) =>
  (ov: OverrideFile): OverrideFile => {
    const e = (ov.skill1 ?? [])
      .flatMap((b) => b.effects as EffectDef[])
      .find(
        (x): x is Extract<EffectDef, { kind: 'flatDamage' }> =>
          x.kind === 'flatDamage' && x.atkPct === 202.5
      );
    if (!e) {
      throw new Error(
        'liberalio S1 202.5 rider missing — this arm is stale, re-derive it against the override'
      );
    }
    e.gaugeHits = n;
    return ov;
  };

const gaugeHits5 = gaugeHitsArm(5);

// measured Full-Burst counts, from the comps' own `realFullBursts` in scripts/regression.ts
const MEASURED_FB: Record<string, string> = {
  'iron sweep (run G)': '13-14',
  'PG iron sweep': '13-14',
  'T1 wind-weak': '13',
  'T5 wind-weak': '13',
  'T5 wind-weak probe': '13',
  'N3 scarlet/liberalio iron': '10',
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORED-ARM MACHINERY (2026-08-17). Shared by --residual / --sizing / --neutrality.
// ─────────────────────────────────────────────────────────────────────────────

/** MEASURED refill per comp, from the committed bar-paint fill-trace fixtures. */
const MEASURED_REFILL: {
  key: string;
  compName: string;
  focus?: string;
  measured: number | null;
  fixture: string | null;
  role: 'primary' | 'excluded' | 'control';
  fbGate: number | null;
  label: string;
}[] = [
  {
    key: 'iron-focusMatched',
    compName: 'PG iron sweep',
    focus: 'maxwell',
    measured: 2.342,
    fixture: 'docs/probe-data/fill-trace-u8-g-iron-sweep.json',
    role: 'primary',
    fbGate: 13,
    label: 'iron sweep [focus=maxwell — MEASUREMENT-MATCHED]',
  },
  {
    key: 'iron-shippedFocus',
    compName: 'PG iron sweep',
    measured: 2.342,
    fixture: 'docs/probe-data/fill-trace-u8-g-iron-sweep.json',
    role: 'excluded',
    fbGate: 13,
    label:
      'iron sweep [shipped focus=milk-blooming-bunny — CONFIG-MISMATCHED, EXCLUDED]',
  },
  {
    key: 'T5',
    compName: 'T5 wind-weak probe',
    measured: 1.785,
    fixture: 'docs/probe-data/fill-trace-probe-u7-t5-wind-weak.json',
    role: 'primary',
    fbGate: 13,
    label: 'T5 wind-weak probe [shipped focus=anis-star]',
  },
  {
    key: 'PI2',
    compName: 'PI2 misc B3s',
    measured: 2.1,
    fixture: 'docs/probe-data/fill-trace-u8-i-misc-b3s.json',
    role: 'control',
    fbGate: null,
    label: 'PI2 misc B3s [NEGATIVE CONTROL — no liberalio]',
  },
  {
    key: 'T8',
    compName: 'T8 iron-weak',
    measured: null,
    fixture: null,
    role: 'control',
    fbGate: null,
    label: 'T8 iron-weak [CONTROL — no liberalio]',
  },
  {
    key: 'PA',
    compName: 'PA MiKa',
    measured: null,
    fixture: null,
    role: 'control',
    fbGate: null,
    label: 'PA MiKa [CONTROL — no liberalio]',
  },
];

function findComp(name: string): Comp {
  const hits = COMPS.filter((c) => c.name.startsWith(name));
  if (hits.length !== 1) {
    throw new Error(
      `comp name "${name}" matched ${hits.length} entries in scripts/experiment.ts — fix the key`
    );
  }
  return hits[0];
}

const MC_SEEDS = 25;

function measureArm(
  comp: Comp,
  patch: Record<string, (o: OverrideFile) => OverrideFile>
) {
  const det = run(comp, patch);
  const d = decomposeCycles(det.rotationLog);
  const fbDist = new Map<number, number>();
  for (let i = 0; i < MC_SEEDS; i++) {
    const r = run(comp, patch, 1000 + i);
    fbDist.set(r.fullBursts, (fbDist.get(r.fullBursts) ?? 0) + 1);
  }
  return {
    excess: d.excess,
    fbDur: d.fbDur,
    chain: d.chain,
    floor: d.floor,
    observed: d.observed,
    detFb: det.fullBursts,
    mcFb: [...fbDist.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([c, n]) => `${c}×${n}/${MC_SEEDS}`)
      .join(' '),
    totals: Object.fromEntries(det.units.map((u) => [u.slug, u.totalDamage])),
  };
}

/** Per-unit totals with bursting OFF — isolates damage from any rotation shift (D1). */
function noBurstTotals(
  comp: Comp,
  patch: Record<string, (o: OverrideFile) => OverrideFile>
) {
  const r = run(comp, patch, undefined, undefined, { disableBursts: true });
  return Object.fromEntries(r.units.map((u) => [u.slug, u.totalDamage]));
}

if (process.argv.includes('--residual')) {
  const armNames = ['SHIPPED', 'H1 gaugeHits:5'] as const;
  const armPatch: Record<
    string,
    Record<string, (o: OverrideFile) => OverrideFile>
  > = {
    SHIPPED: {},
    'H1 gaugeHits:5': { [SLUG]: gaugeHits5 },
  };
  const out: Record<string, unknown>[] = [];
  for (const spec of MEASURED_REFILL) {
    const base = findComp(spec.compName);
    const comp: Comp = spec.focus ? { ...base, focus: spec.focus } : base;
    for (const arm of armNames) {
      const m = measureArm(comp, armPatch[arm]);
      out.push({
        key: spec.key,
        label: spec.label,
        role: spec.role,
        compName: base.name,
        focus: spec.focus ?? '(shipped/default middle slot)',
        seatsLiberalio: base.slugs.includes(SLUG),
        arm,
        measuredRefill: spec.measured,
        fixture: spec.fixture,
        fbGate: spec.fbGate,
        ...m,
        residual:
          spec.measured == null
            ? null
            : (m.excess - spec.measured) / spec.measured,
      });
    }
  }
  console.log(
    JSON.stringify({ slug: SLUG, mcSeeds: MC_SEEDS, rows: out }, null, 2)
  );
  process.exit(0);
}

if (process.argv.includes('--sizing')) {
  // LOG-ONLY. Run AFTER the --residual verdict is written; no value here may be adopted.
  const out: Record<string, unknown>[] = [];
  for (const spec of MEASURED_REFILL.filter((s) => s.role !== 'control')) {
    const base = findComp(spec.compName);
    const comp: Comp = spec.focus ? { ...base, focus: spec.focus } : base;
    for (const n of [2, 3, 4]) {
      const m = measureArm(comp, { [SLUG]: gaugeHitsArm(n) });
      out.push({
        key: spec.key,
        label: spec.label,
        role: spec.role,
        gaugeHits: n,
        measuredRefill: spec.measured,
        excess: m.excess,
        detFb: m.detFb,
        mcFb: m.mcFb,
        residual:
          spec.measured == null
            ? null
            : (m.excess - spec.measured) / spec.measured,
      });
    }
  }
  console.log(
    JSON.stringify(
      { slug: SLUG, note: 'LOG-ONLY sizing scan', rows: out },
      null,
      2
    )
  );
  process.exit(0);
}

if (process.argv.includes('--skew')) {
  // ESTIMATOR ASYMMETRY (D3 of the 2026-08-17 scored test): `excess` is a MEAN over the
  // middle-60% FB-to-FB periods, while the fixtures' measured refill is a per-window MEDIAN.
  // Prints both statistics on BOTH sides so the asymmetry is sized instead of assumed.
  const stat = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const med =
      s.length % 2
        ? s[(s.length - 1) / 2]
        : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
    return {
      n: s.length,
      mean,
      median: med,
      sd,
      min: s[0],
      max: s[s.length - 1],
    };
  };
  const out: Record<string, unknown>[] = [];
  for (const spec of MEASURED_REFILL.filter((s) => s.measured != null)) {
    const base = findComp(spec.compName);
    const comp: Comp = spec.focus ? { ...base, focus: spec.focus } : base;
    for (const [arm, patch] of [
      ['SHIPPED', {}],
      ['H1 gaugeHits:5', { [SLUG]: gaugeHits5 }],
    ] as const) {
      const det = run(comp, patch);
      const fbStarts = det.rotationLog
        .filter((l) => l.includes('FULL BURST'))
        .map((l) => parseFloat(l));
      const lo = Math.floor(fbStarts.length * 0.2);
      const hi = Math.ceil(fbStarts.length * 0.8);
      const periods: number[] = [];
      for (let i = lo + 1; i < hi; i++) {
        periods.push(fbStarts[i] - fbStarts[i - 1]);
      }
      const d = decomposeCycles(det.rotationLog);
      const p = stat(periods);
      out.push({
        key: spec.key,
        arm,
        floor: d.floor,
        periodsMiddle60: periods.map((x) => Number(x.toFixed(4))),
        periodStats: p,
        excessFromMean: p.mean - d.floor,
        excessFromMedian: p.median - d.floor,
        meanMinusMedian: p.mean - p.median,
      });
    }
  }
  console.log(JSON.stringify({ slug: SLUG, rows: out }, null, 2));
  process.exit(0);
}

if (process.argv.includes('--decomp-tests')) {
  // Every comp asserted in scripts/tests/gauge-cycle-decomp.test.ts, both arms, PLUS the
  // fb-count-matrix `iron sweep (run G)` roster order (its slugsOverride, focus = middle slot =
  // maxwell) so the battery tests' baseFb pin is predictable without editing any override.
  const RUN_G = [
    'd-killer-wife',
    'milk-blooming-bunny',
    'maxwell',
    'takina',
    'liberalio',
  ];
  const specs: { key: string; comp: Comp }[] = [
    { key: 'PG iron sweep (boss Electric)', comp: findComp('PG iron sweep') },
    {
      key: 'iron sweep (run G) [fb-count-matrix roster order]',
      comp: { ...findComp('PG iron sweep'), slugs: RUN_G, focus: undefined },
    },
    {
      key: 'T5 wind-weak probe (boss Iron)',
      comp: findComp('T5 wind-weak probe'),
    },
    { key: 'T1 wind-weak (boss Iron)', comp: findComp('T1 wind-weak') },
    {
      key: 'N3 scarlet/liberalio iron (boss Iron)',
      comp: findComp('N3 scarlet/liberalio iron'),
    },
    {
      key: 'N6 mihara/maiden wind (boss Wind)',
      comp: findComp('N6 mihara/maiden wind'),
    },
    { key: 'PI2 misc B3s RERUN w/ video (boss Water)', comp: findComp('PI2') },
  ];
  const out: Record<string, unknown>[] = [];
  for (const s of specs) {
    for (const [arm, patch] of [
      ['SHIPPED', {}],
      ['H1 gaugeHits:5', { [SLUG]: gaugeHits5 }],
    ] as const) {
      const m = measureArm(s.comp, patch);
      out.push({
        comp: s.key,
        seatsLiberalio: s.comp.slugs.includes(SLUG),
        arm,
        excess: m.excess,
        fbDur: m.fbDur,
        chain: m.chain,
        detFb: m.detFb,
        mcFb: m.mcFb,
      });
    }
  }
  console.log(JSON.stringify({ slug: SLUG, rows: out }, null, 2));
  process.exit(0);
}

if (process.argv.includes('--neutrality')) {
  // D1: gaugeHits must move NO damage number. Bursting OFF so rotation cannot confound.
  const out: Record<string, unknown>[] = [];
  for (const spec of MEASURED_REFILL) {
    const base = findComp(spec.compName);
    const comp: Comp = spec.focus ? { ...base, focus: spec.focus } : base;
    const a = noBurstTotals(comp, {});
    const b = noBurstTotals(comp, { [SLUG]: gaugeHits5 });
    const deltas = Object.keys(a).map((s) => ({
      slug: s,
      shipped: a[s],
      h1: b[s],
      delta: b[s] - a[s],
    }));
    out.push({
      key: spec.key,
      label: spec.label,
      seatsLiberalio: base.slugs.includes(SLUG),
      maxAbsDelta: Math.max(...deltas.map((d) => Math.abs(d.delta))),
      deltas,
    });
  }
  console.log(
    JSON.stringify(
      { slug: SLUG, mode: 'disableBursts:true', rows: out },
      null,
      2
    )
  );
  process.exit(0);
}

const compsWithHer = COMPS.filter((c) => c.slugs.includes(SLUG));

if (!compsWithHer.length) {
  throw new Error(
    `no comp in scripts/experiment.ts contains ${SLUG} — the arm cannot size anything`
  );
}

const rows = compsWithHer.map((comp) => {
  const name = String(comp.name).replace(/\s*\(boss [^)]+\)\s*$/, '');
  const base = run(comp);
  const arm = run(comp, { [SLUG]: gaugeHits5 });
  return {
    comp: name,
    measuredFb: MEASURED_FB[name] ?? '?',
    baseFb: base.fullBursts,
    armFb: arm.fullBursts,
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ slug: SLUG, rows }, null, 2));
} else {
  console.log(
    `${SLUG} rider sub-hit gauge credit — A/B (deterministic, no seed)\n`
  );
  console.log(
    `${'comp'.padEnd(30)} ${'measured FB'.padStart(11)} ${'base'.padStart(5)} ${'gaugeHits:5'.padStart(11)}`
  );
  for (const r of rows) {
    console.log(
      `${r.comp.padEnd(30)} ${r.measuredFb.padStart(11)} ${String(r.baseFb).padStart(5)} ${String(r.armFb).padStart(11)}`
    );
  }
  console.log(
    '\nFull-Burst counts are the arm that IMPROVES. The refill-from-zero counter-signal lives in\n' +
      'scripts/tests/gauge-cycle-decomp.test.ts — run it under this arm to see it (it goes RED:\n' +
      'refill drops to ~2.2-2.9s against measured 3.56-4.43s).'
  );
}
