// Random-sampled recording batch: seeded random teams over the supported
// roster (reproducible via SEED), for generating real-test candidates rather
// than exhaustive coverage. Honors the harness rules: B1 + B2 + 3x B3 shape,
// eunhwa:TU only ever with emma:TU, red-hood pinned to B3, mint/prika duet
// wiring when co-sampled. Units repeat across teams only when a pool runs dry
// (B1s). Each team is scored at its advantage boss (first-bursting-B3 rule)
// at core 100 — the lab/regression comparison basis.
//
//   npx tsx scripts/battery/random.ts
//   SEED=7 TEAMS=10 EXCLUDE=exia,miranda npx tsx scripts/battery/random.ts
import { loadWorld, pickAdvantageBoss, runBattery, type BatteryTeam, type Cell } from './lib.js';

const w = loadWorld();
const SEED = Number(process.env.SEED ?? 42);
const N_TEAMS = Number(process.env.TEAMS ?? 10);
// EXCLUDE = owner-not-owned units (passed per-run). POOL_OUTLIERS = units the
// sampler ALWAYS drops because they poison a damage-test batch (owner ruling
// 2026-07-14): tia is a pure-shielder B1 with no advantaged path and ~0 damage
// contribution — a wasted slot in a DPS-validation team, like red-hood as a
// solo B1. Add here, not to EXCLUDE, so the two reasons stay distinct.
const POOL_OUTLIERS = ['tia'];
const EXCLUDE = new Set([
  ...POOL_OUTLIERS,
  ...(process.env.EXCLUDE ?? '').split(',').map((s) => s.trim()).filter(Boolean),
]);

// mulberry32 — tiny seeded PRNG, reproducible batches
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const usable = w.roster.filter((s) => !EXCLUDE.has(s));
const burst = (s: string) => w.data.characters[s].burst;
let b1s = shuffle(usable.filter((s) => burst(s) === 'I'));
const b2s = shuffle(usable.filter((s) => burst(s) === 'II'));
const b3s = shuffle(usable.filter((s) => burst(s) === 'III' || burst(s) === 'Λ'));
const b1Pool = [...b1s]; // for reuse when dry

const teams: BatteryTeam[] = [];
for (let i = 0; i < N_TEAMS; i++) {
  if (b3s.length < 3 || !b2s.length) break;
  if (!b1s.length) b1s = shuffle(b1Pool); // reuse, reshuffled (reported as repeats)
  let b2 = b2s.shift()!;
  let b1: string;
  if (b2 === 'eunhwa-tactical-upgrade') {
    // duo-only kit: emma must be this team's B1 (re-draw the B2 if emma is gone)
    const ei = b1s.indexOf('emma-tactical-upgrade');
    if (ei === -1) { b2 = b2s.shift() ?? b2; b1 = b1s.shift()!; }
    else b1 = b1s.splice(ei, 1)[0];
  } else {
    b1 = b1s.shift()!;
    // emma without eunhwa runs solo mode (autoWire); that's fine
  }
  const core = b3s.splice(0, 3);
  teams.push({
    name: `random ${i + 1}`,
    slugs: [b1, b2, ...core], // middle slot = a B3 (default camera focus)
    source: `seeded random sample (SEED=${SEED})`,
  });
}

runBattery(w, teams, (team) => {
  const adv = pickAdvantageBoss(w, team);
  console.log(`    record on the ${adv.boss}-element boss (advantage via bursting B3 ${adv.via})`);
  const cells: Cell[] = [
    { label: 'neutral c100', boss: null, coreHitRate: 1 },
    { label: `adv(${adv.boss}) c100`, boss: adv.boss, coreHitRate: 1 },
  ];
  return cells;
}, {
  title: `RANDOM recording batch — SEED=${SEED}, ${N_TEAMS} teams${EXCLUDE.size ? `, excluding ${[...EXCLUDE].join(', ')}` : ''}`,
  derived: [{ label: 'adv/neut', num: 1, den: 0 }],
});
