// Hand-tune recording batch — focus-centered teams for still-untuned OWNED &
// ENIKK-SUPPORTED units surfaced by the 714 noon probe.
//
// CONTROL-GROUP DESIGN (owner rulings 2026-07-14):
//  - Every NON-target slot is a HAND-TUNED unit (data/hand-tuned.json, tuned=true)
//    so the tested unit is the sole variable. base snow-white is EXCLUDED (she is
//    MODEL_ONLY — the DPS-chart buff-neutral filler, not actually tuned).
//  - B3 targets: 4-unit control [little-mermaid(B1), Crown(B2), TARGET(B3), Helm(B3)]
//    — the DPS "Standard" control, no 3rd B3. TARGET at position 3 (default focus)
//    and leftmost B3 (main burst) → highest-signal popups.
//  - B1/B2 SUPPORT targets: A/B, with the SUPPORT UNDER TEST centered + focused (its
//    own popups are the direct tuning signal). A tuned CARRY (leftmost B3, main burst)
//    sits beside it; team A fields the support at position 3, team B swaps it for the
//    reference control B2 (Crown). The carry's total (end screen, no focus needed) gives
//    Δcarry(A−B) = the support's buff error (Crown is tuned, its contribution cancels).
//
// Gates: (1) every non-target unit is tuned in hand-tuned.json; (2) every unit is
// enikk-supported (treasure-normalized); (3) focus at position 3.
//
//   npx tsx scripts/battery/hand-tune-714noon.ts
import { readFileSync } from 'node:fs';
import { loadWorld, autoWire, type BatteryTeam } from './lib.js';
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { runSim } from '../../src/engine/sim.js';
import type { SimConfig, Element } from '../../src/types.js';

const w = loadWorld();

// authoritative hand-tuned roster → trusted-support set
const HT = JSON.parse(readFileSync(new URL('../../data/hand-tuned.json', import.meta.url), 'utf8'));
const TUNED = new Set<string>(HT.units.filter((u: any) => u.tuned).map((u: any) => u.slug));

const supportedNames: string[] = JSON.parse(
  readFileSync(new URL('../../data/enikk-supported.json', import.meta.url), 'utf8'),
).names.map((n: string) => n.toLowerCase());
const norm = (name: string) => name.replace(/\s*\(treasure\)$/i, '').toLowerCase();
const isSupported = (slug: string) => supportedNames.includes(norm(w.data.characters[slug].name));

interface Team { name: string; target: string; boss: Element; slugs: string[]; carry?: string; pair?: string }

// B3 target: 4-unit DPS Standard control, TARGET at position 3 (idx 2).
const b3 = (name: string, target: string, boss: Element): Team =>
  ({ name, target, boss, slugs: ['little-mermaid', 'crown', target, 'helm'] });

// B2 support A/B: 4-unit. SUPPORT under test at position 3 (default focus → its own
// popups). CARRY (a tuned B3) sits at slot 2 = leftmost B3 = main burst; its end-screen
// total gives the buff delta. B swaps the support for Crown (reference control B2). The
// 2nd control B3 `filler` is identical A/B.
const ab = (label: string, target: string, carry: string, filler: string, boss: Element): Team[] => [
  { name: `${label} · A (with ${target}, focused)`, target, boss, carry, pair: label,
    slugs: ['little-mermaid', carry, target, filler] },
  { name: `${label} · B (Crown reference)`, target, boss, carry, pair: label,
    slugs: ['little-mermaid', carry, 'crown', filler] },
];

const TEAMS: Team[] = [
  // B3 carries — graded directly
  b3('quency-EQ (0.77 cold)', 'quency-escape-queen', 'Fire'),
  b3('soda-TB (0.77 cold)', 'soda-twinkling-bunny', 'Electric'),
  b3('ein (0.71-0.92, U8)', 'ein', 'Water'),
  b3('chisato (1.21 hot)', 'chisato', 'Electric'),
  b3('maxwell (audit — 0.80/1.17)', 'maxwell', 'Electric'),
  // B2 supports — A/B, carry focused
  ...ab('arcana-FM (1.88 — blocks privaty)', 'arcana-fortune-mate', 'mihara-bonding-chain', 'helm', 'Wind'),
  ...ab('ade-agent-bunny (0.82)', 'ade-agent-bunny', 'helm', 'cinderella', 'Electric'),
];

for (const t of TEAMS) {
  const focus = t.slugs[2]; // position-3 unit is the recorder's default focus
  const wantFocus = t.pair ? (t.name.includes('· A') ? t.target : 'crown') : t.target;
  if (focus !== wantFocus) throw new Error(`[${t.name}] focus ${focus} ≠ expected ${wantFocus}`);
  const bad = t.slugs.filter((s) => s !== t.target && !TUNED.has(s));
  if (bad.length) throw new Error(`[${t.name}] non-hand-tuned support(s): ${bad.join(', ')}`);
  const unsup = t.slugs.filter((s) => !isSupported(s));
  if (unsup.length) throw new Error(`[${t.name}] non-enikk-supported: ${unsup.join(', ')}`);
}

const carryTot: Record<string, number> = {};
for (const t of TEAMS) {
  const bt: BatteryTeam = { name: t.name, slugs: t.slugs, source: 'hand-tune 714noon' };
  const warns = autoWire(w, bt);
  const chars = t.slugs.map((s) => w.data.characters[s]);
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of t.slugs) overrides[s] = loadOverride(s);
  const unitOpts: UnitOptions[] = t.slugs.map((slug) => ({
    doll: false, ol: 'base5', mode: bt.modes?.[slug], lambdaStage: bt.lambda?.[slug],
  }));
  const focus = t.slugs[2];
  const cfg: SimConfig = {
    slugs: t.slugs, bossElement: t.boss, bossDef: 0, level: 400, copies: 10,
    doll: false, ol: 'base5', coreHitRate: 1, rangeBonus: true, durationSec: 180, focusSlug: focus,
  };
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines });
  const res = runSim(chars, w.mult, cfg, prepared);
  const total = res.units.reduce((a, u) => a + u.totalDamage, 0);
  console.log(`\n=== ${t.name}  |  boss ${t.boss}  |  FOCUS ${focus}  |  FBs ${res.fullBursts}  |  team ${(total/1e6).toFixed(0)}M`);
  console.log(`    slots(1-4): ${t.slugs.join(' · ')}`);
  if (warns.length) console.log(`    ⚠ ${warns.join('; ')}`);
  for (const u of res.units) {
    const tag = u.slug === focus ? ' ◀FOCUS' + (u.slug === t.target ? '/target' : '')
      : (u.slug === t.carry ? ' ◀carry(Δ)' : '');
    console.log(`      ${u.slug.padEnd(24)} ${(u.totalDamage/1e6).toFixed(0).padStart(5)}M${tag}`);
  }
  if (t.pair && t.carry) carryTot[t.name] = res.units.find((u) => u.slug === t.carry)!.totalDamage;
}

const pairs = [...new Set(TEAMS.filter((t) => t.pair).map((t) => t.pair!))];
if (pairs.length) console.log('\n=== A/B predicted carry lift (support buff isolated) ===');
for (const p of pairs) {
  const A = TEAMS.find((t) => t.pair === p && t.name.includes('· A'))!;
  const B = TEAMS.find((t) => t.pair === p && t.name.includes('· B'))!;
  const a = carryTot[A.name], b = carryTot[B.name];
  console.log(`  ${p}: carry ${A.carry} ${(a/1e6).toFixed(0)}M (with ${A.target}) vs ${(b/1e6).toFixed(0)}M (Crown) → Δ ${((a-b)/1e6).toFixed(0)}M (${(((a-b)/b)*100).toFixed(1)}%). Grade real Δ vs this.`);
}
