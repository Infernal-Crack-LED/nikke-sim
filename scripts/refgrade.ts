// Reference-grade layer for data/kit-status.json (the per-unit SSOT; absorbed data/hand-tuned.json 2026-07-16).
//
// A unit is REFERENCE-GRADE when it is tuned=true AND its final damage total lands
// within +/-3% of reality (ratio 0.97-1.03) on at least 5 DIFFERENT teams (dedup by
// unit set — reruns/replicates of the same team count once; focus not required).
// This is the top trust tier: proven reliable across many real fights, not just
// tuned once. Recompute whenever the graded comps in scripts/experiment.ts change.
//
//   npx tsx scripts/refgrade.ts            # print + write the layer into kit-status.json
//   npx tsx scripts/refgrade.ts --dry      # print only
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WITHIN = (r: number) => r >= 0.97 && r <= 1.03;
const MIN_TEAMS = 5;

// run the lab and parse per-comp per-unit ratios
const out = execFileSync('npx', ['tsx', 'scripts/experiment.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 });
type Comp = { name: string; u: Record<string, number> };
const comps: Comp[] = [];
let cur: Comp | null = null;
for (const line of out.split('\n')) {
  const c = line.match(/^--- (.+?) ·/);
  if (c) { cur = { name: c[1].trim(), u: {} }; comps.push(cur); continue; }
  const m = line.match(/^([a-z0-9-]+)\s+shots.*ratio\s+([0-9.]+)/);
  if (m && cur) cur.u[m[1]] = parseFloat(m[2]);
}

// dedup by unit set (same five units = same team); mean the reruns
const byset = new Map<string, Comp[]>();
for (const c of comps) {
  const key = Object.keys(c.u).sort().join(',');
  (byset.get(key) ?? byset.set(key, []).get(key)!).push(c);
}
const teams: Record<string, number>[] = [];
for (const cs of byset.values()) {
  const merged: Record<string, number> = {};
  for (const u of Object.keys(cs[0].u)) {
    const rs = cs.map((c) => c.u[u]).filter((x) => x != null);
    merged[u] = rs.reduce((a, b) => a + b, 0) / rs.length;
  }
  teams.push(merged);
}

// per-unit distinct-team counts
const graded: Record<string, number> = {};
const within: Record<string, number> = {};
for (const t of teams)
  for (const [u, r] of Object.entries(t)) {
    graded[u] = (graded[u] ?? 0) + 1;
    if (WITHIN(r)) within[u] = (within[u] ?? 0) + 1;
  }

const path = new URL('../data/kit-status.json', import.meta.url);
const ht = JSON.parse(readFileSync(path, 'utf8'));
const refs: string[] = [];
const htUnits = Object.entries(ht.units).map(([slug, u]: [string, any]) => ({ slug, ...u }));
for (const [slug, unit] of Object.entries<any>(ht.units)) {
  const g = graded[slug] ?? 0;
  const w = within[slug] ?? 0;
  unit.graded = { teams: g, within3pct: w };
  unit.reference = unit.tuned && w >= MIN_TEAMS;
  if (unit.reference) refs.push(slug);
}
ht.reference_grade = {
  definition: `tuned=true AND final-total ratio within 0.97-1.03 on >=${MIN_TEAMS} distinct teams (dedup by unit set; focus not required). Recompute with scripts/refgrade.ts when graded comps change.`,
  count: refs.length,
  units: refs,
};

console.log(`distinct graded teams: ${teams.length}`);
console.log(`REFERENCE-GRADE (>=${MIN_TEAMS} teams within +/-3%): ${refs.length ? refs.join(', ') : '(none yet)'}`);
console.log('\nclosest tuned units (teams / within +/-3%):');
for (const u of htUnits.filter((x: any) => x.tuned).sort((a: any, b: any) => (b.graded.within3pct - a.graded.within3pct) || (b.graded.teams - a.graded.teams)).slice(0, 12))
  console.log(`  ${u.slug.padEnd(24)} teams=${String(u.graded.teams).padStart(2)}  within=${String(u.graded.within3pct).padStart(2)}${u.reference ? '  ◀REFERENCE' : ''}`);

if (!process.argv.includes('--dry')) {
  writeFileSync(path, JSON.stringify(ht, null, 2) + '\n');
  console.log('\nwrote data/kit-status.json (reference layer)');
}
