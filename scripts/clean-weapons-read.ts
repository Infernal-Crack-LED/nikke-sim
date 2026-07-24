// BASE-WEAPON board — sim vs real for the six "clean weapon" units.
//
//   npx tsx scripts/clean-weapons-read.ts                # shipped: SMG frame-quantized to 20.0/s
//   SMGRATE=24 npx tsx scripts/clean-weapons-read.ts     # revert arm: pre-quantization nominal 24/s
//
// The board-read.ts analogue for the bare-weapon basis (docs/data/clean-weapons.md). These six
// units have NO override and their kits deal ZERO damage, so each row scores the engine's WEAPON
// MODEL directly — no kit encoding, no calibration debt, no rotation artifact in the way.
//
// The sim side comes from `bareWeaponComp` — the SAME fixture the pinned test uses
// (scripts/tests/units/clean-weapons.test.ts), so this can never drift from CW5. The real side is
// docs/probe-data/clean-weapons-readings.json; append a run there and it is picked up automatically.
//
// RATIO CONVENTION: sim/real. >1 = HOT (sim over-predicts). Matches board-read.ts; the OPPOSITE of
// the solo-recon `realOverSim`.
import { readFileSync } from 'node:fs';
import {
  CLEAN_WEAPON_BOSS_ELEMENT,
  CLEAN_WEAPON_LIMITS,
  CLEAN_WEAPON_TEAMS,
  bareWeaponComp,
  data,
  runComp,
  unitOf,
} from './tests/lib/harness.js';

interface Run {
  recording: string;
  date: string;
  comp: string[];
  focus: string;
  focusNote?: string;
  totals: Record<string, number>;
}
const readings = JSON.parse(
  readFileSync(new URL('../docs/probe-data/clean-weapons-readings.json', import.meta.url), 'utf8'),
) as { basis: Record<string, unknown>; runs: Run[] };

// ---- sim side (one run per team; per-unit totals are team-independent by construction) ----
const sim: Record<string, number> = {};
for (const slugs of Object.values(CLEAN_WEAPON_TEAMS)) {
  const res = runComp(bareWeaponComp(slugs));
  for (const s of slugs) sim[s] = unitOf(res, s).totalDamage;
}

// ---- real side: gather every reading per unit ----
const real = new Map<string, number[]>();
for (const run of readings.runs) {
  for (const [slug, total] of Object.entries(run.totals)) {
    (real.get(slug) ?? real.set(slug, []).get(slug)!).push(total);
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmtM = (n: number) => `${(n / 1e6).toFixed(2)}M`;

const arm = Number(process.env.SMGRATE) ? `SMGRATE=${process.env.SMGRATE} (revert)` : 'default (SMG 20/s, frame-quantized)';
console.log(`\nBASE-WEAPON BOARD — scope lock, boss ${CLEAN_WEAPON_BOSS_ELEMENT} (neutral for all six), core 100, bursts OFF`);
console.log(`engine arm: ${arm}   |   ${readings.runs.length} recordings\n`);
console.log('  unit           wpn   n        sim        real   sim/real          spread');
console.log('  ' + '-'.repeat(76));

const rows: { slug: string; ratio: number; n: number }[] = [];
const order = [...CLEAN_WEAPON_TEAMS.a, ...CLEAN_WEAPON_TEAMS.b];
for (const slug of order) {
  const obs = real.get(slug);
  const c = data.characters[slug];
  if (!obs?.length) {
    console.log(`  ${slug.padEnd(14)} ${c.weapon.padEnd(4)}  —   ${fmtM(sim[slug]).padStart(9)}      (no reading yet)`);
    continue;
  }
  const r = sim[slug] / mean(obs);
  rows.push({ slug, ratio: r, n: obs.length });
  const tag = Math.abs(r - 1) <= 0.03 ? 'OK  ·' : r > 1 ? 'HOT ▲' : 'COLD ▼';
  // spread across repeat runs = the empirical single-run repeatability for this unit
  const spread = obs.length > 1 ? `±${(((Math.max(...obs) - Math.min(...obs)) / 2 / mean(obs)) * 100).toFixed(1)}%` : '—';
  const ceil = CLEAN_WEAPON_LIMITS[slug];
  const note = ceil ? `  (${ceil.stars}★/core ${ceil.core})` : '';
  console.log(
    `  ${slug.padEnd(14)} ${c.weapon.padEnd(4)} ${String(obs.length).padStart(2)}  ${fmtM(sim[slug]).padStart(9)} ${fmtM(mean(obs)).padStart(11)}   ${r.toFixed(3)} ${tag}   ${spread.padStart(6)}${note}`,
  );
}

const errs = rows.map((x) => Math.abs(x.ratio - 1)).sort((a, b) => a - b);
const median = errs.length % 2 ? errs[(errs.length - 1) / 2] : (errs[errs.length / 2 - 1] + errs[errs.length / 2]) / 2;
console.log('  ' + '-'.repeat(76));
console.log(
  `  within ±3%: ${rows.filter((x) => Math.abs(x.ratio - 1) <= 0.03).length}/${rows.length}` +
    `   |   median |ratio−1|: ${(median * 100).toFixed(1)}%` +
    `   |   worst: ${rows.slice().sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))[0]?.slug ?? '—'}\n`,
);
for (const run of readings.runs) {
  if (run.focusNote) console.log(`  note (${run.recording.split('/').pop()}): ${run.focusNote}`);
}
console.log();
