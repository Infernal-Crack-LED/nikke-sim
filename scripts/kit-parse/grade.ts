// kit-parse GRADING (orchestrator-only — contains real recorded values; a blind subagent must
// NEVER run or read this file). Fable pre-op revision 4.
//
//   npx tsx scripts/kit-parse/grade.ts <slug> <candFile>
//     Picks the reference recording team that contains <slug>, sims it TWICE (deterministic, no
//     seed) — all-real vs candidate-swapped — and reports (a) rotation gate (FB match), (b) whole-
//     team sim-vs-sim per-unit deltas (±5% each), (c) secondary candidate-vs-recording line.
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { loadWorld, runOnce, type BatteryTeam } from '../battery/lib.js';
import type { Element } from '../../src/types.js';

type Case = { team: BatteryTeam; boss: Element | null; realFb: number; real: Record<string, number> };
// each recording team is neutral scope-lock; real per-unit totals from the named recording.
const CASES: Case[] = [
  { // rrh control.MP4
    team: { name: 'rrh-control', slugs: ['little-mermaid', 'crown', 'helm', 'rapi-red-hood'] },
    boss: null, realFb: 13,
    real: { 'little-mermaid': 470_516_754, crown: 213_881_837, helm: 477_724_348, 'rapi-red-hood': 899_555_690 },
  },
  { // moran control.mov (contains snow-white)
    team: { name: 'moran-control', slugs: ['helm', 'crown', 'moran', 'snow-white'] },
    boss: null, realFb: 11,
    real: { helm: 482_322_739, crown: 212_278_134, moran: 287_972_631, 'snow-white': 399_610_717 },
  },
  { // jill control.MP4 (contains jill) — 2026-07-15
    team: { name: 'jill-control', slugs: ['little-mermaid', 'crown', 'jill', 'helm'] },
    boss: null, realFb: 11,
    real: { 'little-mermaid': 407_969_363, crown: 215_628_547, jill: 573_110_084, helm: 447_479_339 },
  },
  { // soda tb control.mov (contains soda-twinkling-bunny, SG/stack archetype) — 2026-07-16.
    // NEUTRAL per the owner's control-video rule (recon's "inferred Electric" is unconfirmed and
    // contradicts the standing rule); boss=null. real totals = end-screen unit rows.
    team: { name: 'soda-control', slugs: ['little-mermaid', 'crown', 'soda-twinkling-bunny', 'helm'] },
    boss: null, realFb: 10,
    real: { 'little-mermaid': 403_522_768, crown: 170_865_948, 'soda-twinkling-bunny': 416_375_537, helm: 385_716_037 },
  },
];
const OV = (slug: string) => `src/skills/overrides/${slug}.json`;

function pickCase(slug: string): Case {
  const c = CASES.find((c) => c.team.slugs.includes(slug));
  if (!c) throw new Error(`no reference team contains '${slug}' — add a Case in grade.ts`);
  return c;
}

function simTeam(team: BatteryTeam, boss: Element | null) {
  const w = loadWorld();
  const r = runOnce(w, team, boss, 1); // deterministic, no seed
  const totals: Record<string, number> = {};
  for (const u of r.units) totals[u.slug] = u.totalDamage;
  return { fb: r.fullBursts, totals };
}

function grade(slug: string, candFile: string) {
  if (!existsSync(candFile)) throw new Error(`candidate file not found: ${candFile}`);
  const C = pickCase(slug);
  const A = simTeam(C.team, C.boss);
  const backup = `/tmp/kitparse-${slug}-real.json`;
  const hadReal = existsSync(OV(slug));
  if (hadReal) copyFileSync(OV(slug), backup);
  copyFileSync(candFile, OV(slug));
  let B;
  try { B = simTeam(C.team, C.boss); }
  finally {
    if (hadReal) copyFileSync(backup, OV(slug));
    else rmSync(OV(slug), { force: true });
  }
  console.log(`\n=== GRADE ${slug} in ${C.team.name} (sim-vs-sim, deterministic) ===`);
  const rotOk = A.fb === B.fb;
  console.log(`[rotation gate] all-real FB=${A.fb}  candidate FB=${B.fb}  ${rotOk ? 'PASS' : 'FAIL (rotation broke)'}`);
  console.log(`[whole-team sim-vs-sim] candidate/all-real, PASS if within ±5%:`);
  let allPass = rotOk;
  for (const s of C.team.slugs) {
    const ratio = B.totals[s] / A.totals[s];
    const pass = Math.abs(ratio - 1) <= 0.05;
    if (!pass) allPass = false;
    const mark = s === slug ? ' <== unit under test' : '';
    console.log(`  ${s.padEnd(15)} real-sim=${(A.totals[s] / 1e6).toFixed(1).padStart(6)}M  cand-sim=${(B.totals[s] / 1e6).toFixed(1).padStart(6)}M  ratio=${ratio.toFixed(3)}  ${pass ? 'ok' : 'OUT'}${mark}`);
  }
  console.log(`[secondary — candidate vs recording]`);
  for (const s of C.team.slugs) {
    if (C.real[s] === undefined) continue;
    console.log(`  ${s.padEnd(15)} cand-sim=${(B.totals[s] / 1e6).toFixed(1)}M  real=${(C.real[s] / 1e6).toFixed(1)}M  ratio=${(B.totals[s] / C.real[s]).toFixed(3)}`);
  }
  console.log(`\nNUMERIC VERDICT: ${allPass ? 'PASS' : 'FAIL'} (mechanism-capture via Fable post-op is GATING — offsetting errors in-band still FAIL)`);
}

const [slug, cand] = process.argv.slice(2);
if (!slug || !cand) { console.error('usage: grade.ts <slug> <candFile>'); process.exit(1); }
grade(slug, cand);
