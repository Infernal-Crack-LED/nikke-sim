// Temporary probe: analyze the owner's synced roster (docs/probes/my-roster.json)
// to test hypothesis B — does the "OL = full T10 gear" filter (gear != null)
// exclude Burst-I units the owner actually has on overload gear?
import { readFileSync } from 'node:fs';

const ROSTER = '/Users/maxwellsutton/nikke-sim/docs/probes/my-roster.json';
const CHARS =
  '/Users/maxwellsutton/nikke-sim/.qwen/worktrees/mechanics-page-edits/data/characters.json';

const roster: any[] = JSON.parse(readFileSync(ROSTER, 'utf8'));
const chars = (JSON.parse(readFileSync(CHARS, 'utf8')) as any)
  .characters as Record<string, any>;

const byCode: Record<number, { slug: string; burst: string; name: string }> =
  {};
for (const [slug, c] of Object.entries(chars)) {
  const code = c?.role?.meta?.name_code;
  if (code != null) byCode[code] = { slug, burst: c.burst, name: c.name };
}

const stats: Record<
  string,
  { total: number; withGear: number; withOl: number; t10: number }
> = {};
for (const b of ['I', 'II', 'III', 'Λ'])
  stats[b] = { total: 0, withGear: 0, withOl: 0, t10: 0 };
const b1: any[] = [];
let unmapped = 0;
for (const u of roster) {
  const info = byCode[u.nameCode];
  if (!info) {
    unmapped++;
    continue;
  }
  const s = stats[info.burst];
  if (!s) continue;
  s.total++;
  const hasGear = u.gear != null;
  const hasOl = Array.isArray(u.ol) && u.ol.length > 0;
  if (hasGear) s.withGear++;
  if (hasOl) s.withOl++;
  if (u.gearTier === 'T10') s.t10++;
  if (info.burst === 'I')
    b1.push({
      slug: info.slug,
      gear: hasGear,
      tier: u.gearTier ?? null,
      ol: hasOl ? u.ol.length : 0,
      grade: u.grade,
      core: u.core,
    });
}

console.log('roster entries:', roster.length, '| unmapped nameCodes:', unmapped);
console.log('\nPer-burst (owned):');
for (const b of ['I', 'II', 'III', 'Λ']) {
  const s = stats[b];
  console.log(
    `  Burst ${b}: owned=${s.total}  fullT10(gear!=null)=${s.withGear}  anyOlLines=${s.withOl}  gearTier=T10:${s.t10}`,
  );
}
console.log(
  '\nBurst I units (sorted: fullT10 first, then by OL-line count):',
);
for (const d of b1.sort(
  (a, z) => (z.gear ? 1 : 0) - (a.gear ? 1 : 0) || z.ol - a.ol,
)) {
  console.log(
    `  ${d.slug.padEnd(28)} fullT10=${String(d.gear).padEnd(5)} tier=${String(
      d.tier,
    ).padEnd(5)} olLines=${d.ol}  ★${d.grade} core${d.core}`,
  );
}
