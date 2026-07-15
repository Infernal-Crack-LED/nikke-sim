// FB / range heuristic lab — discover the general rule for when +50% Full Burst (and +30% range)
// apply to SKILL / rider / DoT damage, instead of the calibrated per-kit noFb flags.
//
//   npx tsx scripts/probe/fb-range-lab.ts
//
// Range is settled: skills NEVER get the +30% range bonus (noRange is universal — ein's feathers
// "get the FB multiplier but NOT the +30% range"; the rider range rule is confirmed). So this focuses
// on FB. It A/B-grades the engine's FBRULE knob (sim.ts skillNoFb) across the real comps and reports:
//   (1) board MAE per candidate rule — how well a GENERAL rule fits vs the per-kit flags;
//   (2) the units each rule moves (the affected set);
//   (3) the MEASURED ground truth — the real arbiter (a general rule must match these);
//   (4) the calibration-RELIC candidates — per-kit noFb flags that a general rule + measurement may
//       overturn (liberalio's noFb was exactly such a relic, removed 2026-07-14 when measured).
//
// Candidate rules (ENV.FBRULE): perkit (baseline) · timing (all non-burst skills get FB) ·
// dotfb (DoTs get FB, rest per-kit) · noskillfb (nothing does). Burst-cast is always FB-exempt (U10).

import { execFileSync } from 'node:child_process';

const RULES = ['perkit', 'timing', 'dotfb', 'seqoff', 'noskillfb'];

function ratiosFor(rule: string): Map<string, number[]> {
  const out = execFileSync('npx', ['tsx', 'scripts/experiment.ts'], {
    env: { ...process.env, FBRULE: rule }, encoding: 'utf8', maxBuffer: 1 << 24,
  });
  const m = new Map<string, number[]>();
  for (const line of out.split('\n')) {
    const mm = line.match(/^(\S+)\s+shots.*ratio\s+([\d.]+)/);
    if (mm) { if (!m.has(mm[1])) m.set(mm[1], []); m.get(mm[1])!.push(Number(mm[2])); }
  }
  return m;
}

function mae(m: Map<string, number[]>): { mae: number; n: number; within10: number } {
  let s = 0, n = 0, w = 0;
  for (const arr of m.values()) for (const r of arr) { s += Math.abs(r - 1); n++; if (r >= 0.9 && r <= 1.1) w++; }
  return { mae: s / n, n, within10: w / n };
}

console.log('FB HEURISTIC LAB — board fit per candidate rule (range is settled: skills never get +30%)\n');
const byRule = new Map<string, Map<string, number[]>>();
for (const rule of RULES) byRule.set(rule, ratiosFor(rule));

console.log('rule'.padEnd(12) + 'board MAE'.padStart(11) + 'within±10%'.padStart(12) + '   note');
const notes: Record<string, string> = {
  perkit: 'baseline (per-kit noFb flags, calibrated)',
  timing: 'ALL non-burst skills get FB (drops every noFb exception)',
  dotfb: 'DoTs get FB (drops noFb on dots); rest per-kit',
  seqoff: 'sequential-flavored = no FB; all else FB by timing',
  noskillfb: 'no skill/rider/dot gets FB (opposite extreme)',
};
for (const rule of RULES) {
  const s = mae(byRule.get(rule)!);
  console.log(rule.padEnd(12) + s.mae.toFixed(4).padStart(11) + `${(s.within10 * 100).toFixed(0)}%`.padStart(12) + `   ${notes[rule]}`);
}

// units each rule moves vs perkit
const base = byRule.get('perkit')!;
for (const rule of RULES.slice(1)) {
  const cur = byRule.get(rule)!;
  const moved: string[] = [];
  for (const [slug, arr] of cur) {
    const b = base.get(slug) ?? [];
    const d = arr.map((r, i) => r - (b[i] ?? r)).reduce((a, c) => Math.abs(c) > 0.005 ? a + 1 : a, 0);
    if (d) moved.push(slug);
  }
  console.log(`\n[${rule}] moves ${moved.length} units vs perkit: ${moved.join(', ') || '(none)'}`);
}

console.log(`\n${'='.repeat(78)}\nMEASURED GROUND TRUTH — the real arbiter (a general rule MUST match these)\n${'='.repeat(78)}`);
const GROUND: { unit: string; instance: string; fb: 'ON' | 'OFF'; evidence: string }[] = [
  { unit: 'ein', instance: 'feathers (flatDamage)', fb: 'ON', evidence: 'Prydwen + note: "feathers get the FB multiplier, not the +30% range"' },
  { unit: 'liberalio', instance: '202.5% core-hit proc', fb: 'ON', evidence: 'MEASURED 2026-07-14: orange proc = white ×1.3333 (crit on FB-raised major); noFb was a removed relic' },
  { unit: 'ginmy DoT test', instance: 'generic DoT tick', fb: 'ON', evidence: 'MEASURED (nikke_dot_test): Mana DoT 297,240 in-game = 297,243 predicted WITH ×1.5 FB' },
  { unit: '(any)', instance: 'burst-cast nuke', fb: 'OFF', evidence: 'U10 + JP snapshot rule + our privaty nuke (2,422,498 = FB-off): burst dmg snapshots at USE-time, before FB flips on' },
  { unit: 'modernia', instance: 'Paradise Lost (失楽園)', fb: 'OFF', evidence: 'note.com: the ONE genuine type-exemption — no crit, no FB' },
  { unit: 'cinderella', instance: 'burst FRONT/instant hit', fb: 'OFF', evidence: 'KR dcinside (measured): front dmg misses +50% + FB-entry buffs (lands before FB active)' },
  { unit: 'cinderella', instance: 'burst ADDITIONAL dmg (28.9%×stacks)', fb: 'ON', evidence: 'KR dcinside (measured): same burst, additional dmg GETS +50% (ticks during FB) — proves TIMING not type' },
];
for (const g of GROUND) console.log(`  ${g.fb.padEnd(4)} ${g.unit} — ${g.instance}\n       ${g.evidence}`);
console.log(`
  THE RULE (JP research 2026-07-14, well-sourced, one measured): FB +50% is a TIMING/SNAPSHOT gate in
  the Boost bucket, NOT a damage-type whitelist. Each type gets it by WHEN it snapshots buffs:
    • normal fire  — live per-frame → FB during the window
    • burst-cast   — snapshots at USE-time (before FB flips on) → NO FB
    • additional/function damage (procs/riders) — snapshots at ACTIVATION (in FB) → FB (never dist/core)
    • DoT/sustained — per tick → FB
    • distributed  — like additional; EXCEPT Modernia's Paradise Lost (no crit/FB)
  ⇒ 'timing' is the MECHANICALLY-CORRECT rule (burst-cast stays exempt). It grades WORSE only because
  the 6 noFb units (LM/privaty/jill/maiden/eve/scarlet) have values co-calibrated to FB-off — they are
  RELICS (as liberalio's was). Correct landing = remove noFb per unit + re-audit the compensating
  over-model (cadence/value), like the liberalio re-tune. Sources: ginmy.net/nikke_dot_test,
  note.com/joyful_flax523/n/nec33793e37d6, daywrite.space/archives/2063.`);

console.log(`\n${'='.repeat(78)}\nCALIBRATION-RELIC CANDIDATES — per-kit noFb flags to re-test against measurement\n${'='.repeat(78)}`);
console.log(`  noFb flags currently on: little-mermaid (DoT+barrage), privaty (procs+dot), jill (acid DoT),
  maiden-ice-rose (proc), eve (sequential proc), scarlet (procs — MEASURED off, keep).
  The DoT ones (LM, privaty, jill) contradict ginmy's "DoTs get FB" — likely relics like liberalio's.
  To confirm each: a focused recording of the unit, read its skill/DoT popup IN-FB vs OUT-FB (the ratio
  is the unit's FB factor; ×1.5 raw, or ×1.333 when a crit rides on the FB-raised major). Feed results
  back here and into the override noFb flags + docs/DECISIONS.\n`);

console.log(`${'='.repeat(78)}\nWHAT THE LAB CONCLUDES (2026-07-14 run)\n${'='.repeat(78)}`);
console.log(`  • NO general FB rule beats the calibrated per-kit flags on the board (perkit is the best MAE);
    every universal rule (timing/dotfb/seqoff/noskillfb) is worse. But that is EXPECTED — each unit's
    noFb flag is co-calibrated with its damage values (offsetting errors), so the board CANNOT reveal
    the true rule. noskillfb being far worst confirms most skills DO get FB (the timing default is right).
  • The MEASURED ground truth is genuinely MIXED per delivery type (flatDamage procs + feathers + DoT
    = FB-ON; burst-cast + scarlet's proc-set = FB-OFF), so there is no single flavor/category rule.
  • So the heuristic must be pinned by MEASUREMENT, not fit. Priority recordings (IN-FB vs OUT-FB popup
    ratio): little-mermaid DoT, privaty proc/dot, jill acid-DoT (test the "DoT noFb = relic" hypothesis),
    plus snow-white-heavy-arms (seqoff COOLED her 1.1-1.3→~1.0 — her sequential burst may wrongly get FB).
  • This lab is the harness: add a rule to sim.ts skillNoFb, add its measured cases to GROUND above,
    and re-run to A/B. The FBRULE knob also works standalone (FBRULE=dotfb npx tsx scripts/experiment.ts).\n`);
