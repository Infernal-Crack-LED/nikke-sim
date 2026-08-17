// liberalio-gaugehits-ab.ts — SIZING ARM for the `liberalio` sub-hit gauge-credit finding
// (audit 2026-08-17, docs/handoffs/2026-08-17-liberalio-gauge-credit-audit.md).
//
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts            # FB counts + refill, both arms
//   npx tsx scripts/battery/liberalio-gaugehits-ab.ts --json
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
import { COMPS, run } from '../experiment.js';
import type { OverrideFile } from '../../src/skills/types.js';

const SLUG = 'liberalio';

/**
 * The proposed arm: credit all five rider sub-hits. An `experiment.ts` Patch — it receives a deep
 * copy of the shipped override and returns it mutated, so the shipped file is never touched.
 * Damage is byte-identical either way; only the gauge channel moves.
 */
const gaugeHits5 = (ov: OverrideFile): OverrideFile => {
  const e = (ov.skill1 ?? [])
    .flatMap((b) => b.effects)
    .find((x) => x.kind === 'flatDamage' && x.atkPct === 202.5);
  if (!e) {
    throw new Error(
      'liberalio S1 202.5 rider missing — this arm is stale, re-derive it against the override'
    );
  }
  e.gaugeHits = 5;
  return ov;
};

// measured Full-Burst counts, from the comps' own `realFullBursts` in scripts/regression.ts
const MEASURED_FB: Record<string, string> = {
  'iron sweep (run G)': '13-14',
  'PG iron sweep': '13-14',
  'T1 wind-weak': '13',
  'T5 wind-weak': '13',
  'T5 wind-weak probe': '13',
  'N3 scarlet/liberalio iron': '10',
};

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
