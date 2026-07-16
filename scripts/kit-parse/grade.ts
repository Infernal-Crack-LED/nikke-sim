// kit-parse GRADING (orchestrator-only — contains real recorded values; a blind subagent must
// NEVER run or read this file). Fable pre-op revision 4.
//
//   npx tsx scripts/kit-parse/grade.ts <slug> <candFile>
//     sim the reference team TWICE (deterministic, no seed) — all-real vs candidate-swapped — and
//     report (a) rotation gate (FB match), (b) whole-team sim-vs-sim per-unit deltas (±5% each),
//     (c) secondary candidate-vs-recording line for the 3 ground-truth units.
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { loadWorld, runOnce, type BatteryTeam } from '../battery/lib.js';

const REF_TEAM: BatteryTeam = {
  name: 'rrh-control reference',
  slugs: ['little-mermaid', 'crown', 'helm', 'rapi-red-hood'],
};
const REF_REAL: Record<string, number> = {
  'little-mermaid': 470_516_754, crown: 213_881_837, helm: 477_724_348, 'rapi-red-hood': 899_555_690,
};
const OV = (slug: string) => `src/skills/overrides/${slug}.json`;

function simTeam() {
  const w = loadWorld();
  const r = runOnce(w, REF_TEAM, null, 1); // deterministic, no seed
  const totals: Record<string, number> = {};
  for (const u of r.units) totals[u.slug] = u.totalDamage;
  return { fb: r.fullBursts, totals };
}

function grade(slug: string, candFile: string) {
  if (!existsSync(candFile)) throw new Error(`candidate file not found: ${candFile}`);
  const A = simTeam();
  const backup = `/tmp/kitparse-${slug}-real.json`;
  const hadReal = existsSync(OV(slug));
  if (hadReal) copyFileSync(OV(slug), backup);
  copyFileSync(candFile, OV(slug));
  let B;
  try { B = simTeam(); }
  finally {
    if (hadReal) copyFileSync(backup, OV(slug));
    else rmSync(OV(slug), { force: true });
  }
  console.log(`\n=== GRADE ${slug} (sim-vs-sim, deterministic) ===`);
  const rotOk = A.fb === B.fb;
  console.log(`[rotation gate] all-real FB=${A.fb}  candidate FB=${B.fb}  ${rotOk ? 'PASS' : 'FAIL (rotation broke)'}`);
  console.log(`[whole-team sim-vs-sim] candidate/all-real, PASS if within ±5%:`);
  let allPass = rotOk;
  for (const s of REF_TEAM.slugs) {
    const ratio = B.totals[s] / A.totals[s];
    const pass = Math.abs(ratio - 1) <= 0.05;
    if (!pass) allPass = false;
    const mark = s === slug ? ' <== unit under test' : '';
    console.log(`  ${s.padEnd(15)} real-sim=${(A.totals[s] / 1e6).toFixed(1).padStart(6)}M  cand-sim=${(B.totals[s] / 1e6).toFixed(1).padStart(6)}M  ratio=${ratio.toFixed(3)}  ${pass ? 'ok' : 'OUT'}${mark}`);
  }
  console.log(`[secondary — candidate vs recording]`);
  for (const s of ['little-mermaid', 'crown', 'helm']) {
    console.log(`  ${s.padEnd(15)} cand-sim=${(B.totals[s] / 1e6).toFixed(1)}M  real=${(REF_REAL[s] / 1e6).toFixed(1)}M  ratio=${(B.totals[s] / REF_REAL[s]).toFixed(3)}`);
  }
  console.log(`\nNUMERIC VERDICT: ${allPass ? 'PASS' : 'FAIL'} (mechanism-capture via Fable post-op is GATING — offsetting errors in-band still FAIL)`);
}

const [slug, cand] = process.argv.slice(2);
if (!slug || !cand) { console.error('usage: grade.ts <slug> <candFile>'); process.exit(1); }
grade(slug, cand);
