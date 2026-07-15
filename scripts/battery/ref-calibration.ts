// Reference-grade calibration battery — the CONTROL FRAME, minimal-variable design.
//
// Targets (owner 2026-07-14): Little Mermaid (B1), Crown (B2), Helm (B3) — the core
// control anchors — plus Snow White (B3, simplest self-contained kit). Getting these to
// reference-grade makes the control group a no-caveat clean-support set. (Snow White is
// only tangentially in the frame, so she stays on the standard distinct-roster reference
// bar — choice B — and earns her 5-team breadth from the wider board over time.)
//
// MINIMAL-VARIABLE DESIGN (owner refinements):
//  - test with ONLY the fixed 4-man frame — no carry, no roster changes;
//  - record on a NON-ADVANTAGED fight: boss WATER is the one element where ALL FOUR are
//    neutral (LM/Wind, Crown/Iron, Snow White/Iron neutral vs Water; Helm/Water same-
//    element). So the recording tests the pure base kit with NO element-advantage variable.
//    Advantage is a clean total-level factor applied afterward (reported below), never
//    tested per-hit here.
//  - record each unit's PERSPECTIVE (camera focus) so each gets a clean focused popup read.
//
//   npx tsx scripts/battery/ref-calibration.ts                 # predictions + jitter envelope
//   npx tsx scripts/battery/ref-calibration.ts --runs-for 1.5  # runs to pin each mean to ±1.5%
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { runSim } from '../../src/engine/sim.js';
import { loadWorld, autoWire, type BatteryTeam } from './lib.js';
import type { SimConfig, Element } from '../../src/types.js';

const w = loadWorld();
const FRAME = ['little-mermaid', 'crown', 'helm', 'snow-white']; // fixed 4-man frame (B1,B2,B3,B3)
const NEUTRAL_BOSS: Element = 'Water'; // all four anchors are neutral vs Water
const adv: Record<Element, Element> = { Wind: 'Iron', Fire: 'Wind', Water: 'Fire', Iron: 'Electric', Electric: 'Water' };

function simFrame(boss: Element, focus: string) {
  const bt: BatteryTeam = { name: `focus ${focus}`, slugs: FRAME, source: 'ref-calibration' };
  autoWire(w, bt);
  const chars = FRAME.map((s) => w.data.characters[s]);
  const ov: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of FRAME) ov[s] = loadOverride(s);
  const uo: UnitOptions[] = FRAME.map(() => ({ doll: false, ol: 'base5' }));
  const cfg: SimConfig = {
    slugs: FRAME, bossElement: boss, bossDef: 0, level: 400, copies: 10, doll: false, ol: 'base5',
    coreHitRate: 1, rangeBonus: true, durationSec: 180, focusSlug: focus,
  };
  return runSim(chars, w.mult, cfg, prepareTeam(chars, uo, { overrides: ov, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines }));
}

// the neutral recordings: one per anchor perspective, all boss Water
console.log(`Neutral fight — boss ${NEUTRAL_BOSS} (all four anchors neutral). Record from each perspective:\n`);
const neutralByFocus: Record<string, Record<string, number>> = {};
for (const focus of FRAME) {
  const res = simFrame(NEUTRAL_BOSS, focus);
  neutralByFocus[focus] = Object.fromEntries(res.units.map((u) => [u.slug, u.totalDamage]));
  console.log(`=== FOCUS ${focus}  |  boss ${NEUTRAL_BOSS}  |  FBs ${res.fullBursts} ===`);
  for (const u of res.units)
    console.log(`      ${u.slug.padEnd(22)} ${(u.totalDamage/1e6).toFixed(0).padStart(4)}M${u.slug === focus ? ' ◀FOCUS' : ''}`);
  console.log('');
}

// advantage factor per anchor: advantaged total / neutral total (same team, its own focus)
console.log('=== per-anchor: NEUTRAL total (grade real vs this) + advantage factor to apply ===');
for (const a of FRAME) {
  const neu = neutralByFocus[a][a];
  const advBoss = adv[w.data.characters[a].element as Element] as Element;
  const advTot = simFrame(advBoss, a).units.find((u) => u.slug === a)!.totalDamage;
  console.log(`  ${a.padEnd(16)} neutral ${(neu/1e6).toFixed(0).padStart(4)}M   ×${(advTot/neu).toFixed(4)} advantaged (${advBoss}) = ${(advTot/1e6).toFixed(0)}M`);
}

// ---- run-over-run variance envelope (Monte Carlo) --------------------------
// How the four recordings split (owner 2026-07-14):
//   JITTER TRIPLET — crown-focus, siren(LM)-focus, snow-white-focus. All three focus a NON-charge
//     weapon (MG / SMG / AR), so the sim predicts them IDENTICAL (411/177/406/372) → the real
//     spread across the three is pure run-to-run variance (n=3); it should sit inside the MC band
//     below (+ ~3% real repeatability). Helm is EXCLUDED from the jitter check.
//   HELM — the only CHARGE weapon (SR), so focusing her adds ×2.5 charge gauge; her run differs
//     (414/181/411/367). Used for her popups + the sniper focus-gen test: real helm-focus vs the
//     non-charge baseline = the measured focused-burst-gen gain, vs the sim's predicted Δ.
const N = 24;
const mc: Record<string, number[]> = {};
const fbDist: Record<number, number> = {};
for (let i = 0; i < N; i++) {
  const bt: BatteryTeam = { name: 'mc', slugs: FRAME, source: 'ref-calibration' };
  autoWire(w, bt);
  const chars = FRAME.map((s) => w.data.characters[s]);
  const ov: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of FRAME) ov[s] = loadOverride(s);
  const uo: UnitOptions[] = FRAME.map(() => ({ doll: false, ol: 'base5' }));
  const cfg: SimConfig = {
    slugs: FRAME, bossElement: NEUTRAL_BOSS, bossDef: 0, level: 400, copies: 10, doll: false, ol: 'base5',
    coreHitRate: 1, rangeBonus: true, durationSec: 180, focusSlug: 'crown', seed: 1000 + i,
  };
  const res = runSim(chars, w.mult, cfg, prepareTeam(chars, uo, { overrides: ov, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines }));
  fbDist[res.fullBursts] = (fbDist[res.fullBursts] ?? 0) + 1;
  for (const u of res.units) (mc[u.slug] ??= []).push(u.totalDamage);
}
console.log(`\n=== expected run-to-run variance (Monte Carlo, n=${N}, crown focus) — the jitter noise floor ===`);
console.log('  full-burst distribution: ' + Object.entries(fbDist).sort((a, b) => +a[0] - +b[0]).map(([c, k]) => `${c}×${Math.round(100 * k / N)}%`).join(' '));
const cv: Record<string, number> = {}; // per-unit coefficient of variation (%)
for (const a of FRAME) {
  const arr = mc[a]; const mean = arr.reduce((x, y) => x + y, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((x, y) => x + (y - mean) ** 2, 0) / arr.length);
  cv[a] = sd / mean * 100;
  console.log(`  ${a.padEnd(16)} mean ${(mean/1e6).toFixed(0).padStart(4)}M  ± ${cv[a].toFixed(2)}%  (range ${(Math.min(...arr)/1e6).toFixed(0)}-${(Math.max(...arr)/1e6).toFixed(0)}M)`);
}

// ---- runs-for: how many runs to pin each unit's MEAN to a target precision --
// Averaging cuts jitter as sqrt(n): SEM = CV / sqrt(n), so n = ceil((CV / target)^2).
// The frame's run budget is the MAX across units (the high-variance unit binds).
//   npx tsx scripts/battery/ref-calibration.ts --runs-for 1.5   # target mean ±1.5%
const rfIdx = process.argv.indexOf('--runs-for');
const targets = rfIdx >= 0 && process.argv[rfIdx + 1] ? [parseFloat(process.argv[rfIdx + 1])] : [2, 1.5, 1];
const short = (s: string) => (s === 'little-mermaid' ? 'LM' : s === 'snow-white' ? 'SnowWhite' : s.replace(/-.*/, '')).padStart(10);
console.log('\n=== runs to pin each unit MEAN to a target (n = ceil((CV/target)^2)) ===');
console.log('  targetSEM ' + FRAME.map(short).join('') + '   FRAME(max)');
for (const t of targets) {
  const ns = FRAME.map((a) => Math.max(1, Math.ceil((cv[a] / t) ** 2)));
  console.log(`  ±${t.toFixed(1)}%     ` + ns.map((n) => String(n).padStart(10)).join('') + '   ' + String(Math.max(...ns)).padStart(5));
}
console.log('\n  Also: to measure the jitter σ ITSELF to ±p relative, n ≈ 1 + 1/(2p²)');
console.log('    (±50%→3, ±35%→5, ±25%→9, ±20%→14, ±15%→23, ±13%→30 runs). Validating the sim MC');
console.log('    to a factor-1.5 needs ~10-12 runs; factor-2, ~6-8 — then trust MC jitter elsewhere.');
