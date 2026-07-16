// kit-parse SWEEP GRADING (orchestrator-only — reuses experiment.ts COMPS, which hold real
// recorded values; a blind subagent must NEVER run or read this file).
//
//   npx tsx scripts/kit-parse/sweep-grade.ts <slug> <candFile>
//     Grades a candidate override for <slug> against its TRUSTED hand-tune, in EVERY experiment
//     comp that contains <slug>. Per comp: sims all-real vs candidate-swapped (deterministic, no
//     seed), reports (a) rotation gate (FB match), (b) unit sim-vs-sim ratio (PASS if within ±5%),
//     (c) candidate-vs-real ratio. Verdict = PASS if the unit reproduces its hand-tune within ±5%
//     in every comp AND rotation holds (mechanism-capture via Fable is still gating on top).
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { loadWorld, runOnce } from '../battery/lib.js';
import { COMPS } from '../experiment.js';

const OV = (slug: string) => `src/skills/overrides/${slug}.json`;

function simComp(comp: (typeof COMPS)[number]) {
  const w = loadWorld(); // reload each call so a swapped override is picked up
  const r = runOnce(w, { name: comp.name, slugs: comp.slugs }, comp.boss, 1);
  const totals: Record<string, number> = {};
  for (const u of r.units) totals[u.slug] = u.totalDamage;
  return { fb: r.fullBursts, totals };
}

function grade(slug: string, candFile: string) {
  if (!existsSync(candFile)) throw new Error(`candidate not found: ${candFile}`);
  const comps = COMPS.filter((c) => c.slugs.includes(slug));
  if (!comps.length) throw new Error(`no experiment comp contains '${slug}'`);

  // all-real baseline (hand-tune present)
  const A = comps.map((c) => ({ comp: c, sim: simComp(c) }));

  // swap candidate in
  const backup = `/tmp/sweep-${slug}-real.json`;
  const hadReal = existsSync(OV(slug));
  if (hadReal) copyFileSync(OV(slug), backup);
  copyFileSync(candFile, OV(slug));
  let B: { comp: (typeof COMPS)[number]; sim: ReturnType<typeof simComp> }[];
  try {
    B = comps.map((c) => ({ comp: c, sim: simComp(c) }));
  } finally {
    if (hadReal) copyFileSync(backup, OV(slug));
    else rmSync(OV(slug), { force: true });
  }

  console.log(`\n=== SWEEP GRADE ${slug} — ${comps.length} comp(s) (sim-vs-sim, deterministic) ===`);
  let allPass = true;
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    const a = A[i].sim, b = B[i].sim;
    const rotOk = a.fb === b.fb;
    const ratio = b.totals[slug] / a.totals[slug];
    const real = c.real[slug];
    const vsReal = real ? b.totals[slug] / real : NaN;
    const htVsReal = real ? a.totals[slug] / real : NaN;
    const pass = rotOk && Math.abs(ratio - 1) <= 0.05;
    if (!pass) allPass = false;
    console.log(
      `  ${c.name.padEnd(34)} FB ${a.fb}${rotOk ? '=' : '≠'}${b.fb}  ` +
        `cand/HT=${ratio.toFixed(3)} ${Math.abs(ratio - 1) <= 0.05 ? 'ok' : 'OUT'}  ` +
        `cand/real=${isNaN(vsReal) ? '  -  ' : vsReal.toFixed(3)}  HT/real=${isNaN(htVsReal) ? '  -  ' : htVsReal.toFixed(3)}`
    );
  }
  console.log(`\nNUMERIC VERDICT ${slug}: ${allPass ? 'PASS' : 'FAIL'} (candidate reproduces hand-tune within ±5% in every comp; mechanism-capture via Fable is gating on top)`);
  return allPass;
}

const [slug, cand] = process.argv.slice(2);
if (!slug || !cand) { console.error('usage: sweep-grade.ts <slug> <candFile>'); process.exit(1); }
grade(slug, cand);
