// enikk top-ranker roster audit — repeatable.
//
// For each solo raid, pulls the top-N rankers' team compositions from
// enikk.app, dedups them per raid, and lists every NIKKE that appears in the
// surviving teams (flagging which our sim models). The purpose is a meta
// snapshot: what the strongest players actually field, and which of those
// units the sim can already predict.
//
// The leaderboard is enikk's SRRankings, returned damage-descending; each row
// (one ranker) carries up to 5 saved teams. "Top 100 rankers × 5 teams" is the
// raw sample; dedup is by the SET of 5 units (slot order ignored — same five
// units is the same team).
//
//   npx tsx scripts/enikk/roster-audit.ts
//   TOP=100 RAIDS=37,36,35,34,31 npx tsx scripts/enikk/roster-audit.ts
//   ENIKK_CACHE=/path/to/dir npx tsx scripts/enikk/roster-audit.ts   # read/write raw JSON
//   OUT=docs/enikk-roster-audit.json npx tsx scripts/enikk/roster-audit.ts
//
// Live fetch needs network; with ENIKK_CACHE set, each raid's raw response is
// cached there and reused on later runs (offline-friendly, and lets a session
// seed the cache from an earlier pull).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DataFile } from '../../src/types.js';

const ENDPOINT = 'https://enikk.app/api/webapp';
// raid → the boss element it presents (element the recorded advantage is vs).
// Extend when a new raid lands (query `soloraids { raid_number monster_obj }`,
// read weak_element_id). label = the community's "<element>-weak" shorthand.
const RAID_META: Record<number, { label: string; boss: string }> = {
  31: { label: 'wind-weak', boss: 'Iron' },
  34: { label: 'iron-weak', boss: 'Electric' },
  35: { label: 'fire-weak', boss: 'Wind' },
  36: { label: 'elec-weak', boss: 'Water' },
  37: { label: 'water-weak', boss: 'Fire' },
};

const TOP = Number(process.env.TOP ?? 100);
const RAIDS = (process.env.RAIDS ?? '37,36,35,34,31').split(',').map((s) => Number(s.trim()));
const CACHE = process.env.ENIKK_CACHE;

// Owner-specified manual additions to the enikk-supported roster (below), unioned
// into the generated `names` so they SURVIVE every regeneration. Use for units the
// owner wants supported that the top-ranker data can't justify yet — e.g. too new
// to have accrued solo-raid top-ranker usage. Exact display name (data/characters.json `name`).
const MANUAL_ADDITIONS: string[] = [
  'Cinderella: Crystal Wave', // user-specified 2026-07-15: too new for solo-raid top-ranker usage yet; owner wants her supported.
];

interface Team { characters?: string[] }
interface Row { damage?: number; teams?: Team[] }

const QUERY =
  'query SRRankings($raid: Float!, $all: Boolean) { SRRankings(raid: $raid, all: $all){ damage teams } }';

async function fetchRankings(raid: number): Promise<Row[]> {
  const cacheFile = CACHE ? join(CACHE, `enikk-r${raid}-rankings.json`) : null;
  if (cacheFile && existsSync(cacheFile)) {
    const j = JSON.parse(readFileSync(cacheFile, 'utf8'));
    return j.data.SRRankings as Row[];
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { raid, all: false } }),
  });
  if (!res.ok) throw new Error(`enikk fetch raid ${raid}: HTTP ${res.status}`);
  const j = await res.json();
  if (j.errors) throw new Error(`enikk GraphQL raid ${raid}: ${JSON.stringify(j.errors)}`);
  if (cacheFile) {
    mkdirSync(CACHE!, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(j, null, 1));
  }
  return j.data.SRRankings as Row[];
}

// name→slug + modeled-roster membership, so the audit flags what the sim covers
const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
const modeled = new Set(
  readdirSync(new URL('../../src/skills/overrides', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, '')),
);
const nameToSlug: Record<string, string> = {};
for (const [slug, c] of Object.entries(data.characters)) nameToSlug[c.name.replace(' (Treasure)', '')] = slug;
const isModeled = (name: string) => { const s = nameToSlug[name]; return s !== undefined && modeled.has(s); };

interface RaidAudit {
  raid: number;
  label: string;
  boss: string;
  rankers: number;
  rawTeams: number;
  uniqueTeams: { characters: string[]; count: number }[]; // count = # of top rankers who ran it
  nikkes: { name: string; modeled: boolean; teams: number }[]; // teams = # unique teams it appears in
}

async function auditRaid(raid: number): Promise<RaidAudit> {
  const rows = await fetchRankings(raid);
  const top = rows.slice(0, TOP); // array order = damage-descending leaderboard
  const raw: string[][] = [];
  for (const r of top) for (const t of r.teams ?? []) {
    if (t.characters && t.characters.length === 5) raw.push(t.characters);
  }
  // dedup by the SET of 5 units (slot order ignored); keep the first-seen slot
  // order as the representative and count how many top rankers ran the comp.
  const byKey = new Map<string, { characters: string[]; count: number }>();
  for (const chars of raw) {
    const key = [...chars].sort().join('|');
    const cur = byKey.get(key);
    if (cur) cur.count++;
    else byKey.set(key, { characters: chars, count: 1 });
  }
  const uniqueTeams = [...byKey.values()].sort((a, b) => b.count - a.count);
  // nikkes across surviving unique teams
  const seen = new Map<string, number>();
  for (const t of uniqueTeams) for (const n of t.characters) seen.set(n, (seen.get(n) ?? 0) + 1);
  const nikkes = [...seen.entries()]
    .map(([name, teams]) => ({ name, modeled: isModeled(name), teams }))
    .sort((a, b) => b.teams - a.teams || a.name.localeCompare(b.name));
  const meta = RAID_META[raid] ?? { label: '?', boss: '?' };
  return { raid, label: meta.label, boss: meta.boss, rankers: top.length, rawTeams: raw.length, uniqueTeams, nikkes };
}

// ---- offline MD reconstruction ----
// FROM_MD=<path>: instead of fetching enikk, rebuild the per-raid audits by
// parsing the MD's `### Unique teams` blocks. Each team line has the form
// `- (COUNT) Name1, Name2, Name3, Name4, Name5` where COUNT = rankers who ran
// that comp; a trailing ` *` on a name (sim-not-modeled marker) is stripped.
// This lets the outlier filter + SUPPORTED writer run with no network.
function buildOneRaid(raid: number, label: string, boss: string, uniqueTeams: { characters: string[]; count: number }[]): RaidAudit {
  const seen = new Map<string, number>();
  for (const t of uniqueTeams) for (const n of t.characters) seen.set(n, (seen.get(n) ?? 0) + 1);
  const nikkes = [...seen.entries()]
    .map(([name, teams]) => ({ name, modeled: isModeled(name), teams }))
    .sort((a, b) => b.teams - a.teams || a.name.localeCompare(b.name));
  const rawTeams = uniqueTeams.reduce((s, t) => s + t.count, 0);
  return { raid, label, boss, rankers: 0, rawTeams, uniqueTeams, nikkes };
}

function auditsFromMd(mdPath: string): RaidAudit[] {
  const lines = readFileSync(mdPath, 'utf8').split('\n');
  const raidRe = /^## Raid (\d+) — (.+?) \(boss (.+?)\)/;
  const teamRe = /^-\s*\((\d+)\)\s*(.+)$/;
  const out: RaidAudit[] = [];
  let cur: { raid: number; label: string; boss: string; teams: { characters: string[]; count: number }[] } | null = null;
  let inTeams = false;
  const flush = () => { if (cur) out.push(buildOneRaid(cur.raid, cur.label, cur.boss, cur.teams)); };
  for (const line of lines) {
    const rm = raidRe.exec(line);
    if (rm) { flush(); cur = { raid: Number(rm[1]), label: rm[2], boss: rm[3], teams: [] }; inTeams = false; continue; }
    if (line.startsWith('### Unique teams')) { inTeams = true; continue; }       // enter the team block
    if (line.startsWith('###') || line.startsWith('## ')) { inTeams = false; continue; } // any other heading ends it
    if (inTeams && cur) {
      const tm = teamRe.exec(line);
      if (tm) {
        const characters = tm[2].split(', ').map((n) => n.replace(/\s*\*$/, '').trim()); // split 5 names, strip ` *`
        cur.teams.push({ characters, count: Number(tm[1]) });
      }
    }
  }
  flush();
  return out;
}

const audits: RaidAudit[] = [];
if (process.env.FROM_MD) {
  audits.push(...auditsFromMd(process.env.FROM_MD));
} else {
  for (const raid of RAIDS) audits.push(await auditRaid(raid));
}

// ---- outlier filter (2026-07-15) ----
// Drop a unit iff it appears in exactly ONE raid AND its total uses in that raid
// is 1 (i.e. a single ranker ran a single team containing it). Keep otherwise.
//   raidGroups     = # of distinct raids the unit appears in (any team).
//   usesInRaid(r)  = SUM of the ranker counts of raid-r unique teams containing it.
//   KEEP iff raidGroups >= 2 OR max-over-raids usesInRaid >= 2.
function unitStats(name: string): { raidGroups: number; maxUses: number } {
  const raids = new Set<number>();
  let maxUses = 0;
  for (const a of audits) {
    let uses = 0;
    for (const t of a.uniqueTeams) if (t.characters.includes(name)) uses += t.count;
    if (uses > 0) { raids.add(a.raid); if (uses > maxUses) maxUses = uses; }
  }
  return { raidGroups: raids.size, maxUses };
}
const keepUnit = (name: string): boolean => {
  const s = unitStats(name);
  return s.raidGroups >= 2 || s.maxUses >= 2;
};

// ---- report ----
for (const a of audits) {
  console.log(`\n===== raid ${a.raid} — ${a.label} (boss ${a.boss}) =====`);
  console.log(`top ${a.rankers} rankers → ${a.rawTeams} raw teams → ${a.uniqueTeams.length} unique comps`);
  const notModeled = a.nikkes.filter((n) => !n.modeled);
  console.log(`${a.nikkes.length} distinct NIKKEs used (${a.nikkes.length - notModeled.length} modeled, ${notModeled.length} not):`);
  console.log('  ' + a.nikkes.map((n) => `${n.name}${n.modeled ? '' : ' *'}`).join(', '));
  if (notModeled.length) console.log(`  (* not modeled by the sim: ${notModeled.map((n) => n.name).join(', ')})`);
}

// overall NIKKE union across all audited raids
const union = new Map<string, { modeled: boolean; raids: Set<number> }>();
for (const a of audits) for (const n of a.nikkes) {
  if (!union.has(n.name)) union.set(n.name, { modeled: n.modeled, raids: new Set() });
  union.get(n.name)!.raids.add(a.raid);
}
const unionSorted = [...union.entries()].sort((x, y) => y[1].raids.size - x[1].raids.size || x[0].localeCompare(y[0]));
const unModeled = unionSorted.filter(([, v]) => !v.modeled);
console.log(`\n===== ALL RAIDS union =====`);
console.log(`${union.size} distinct NIKKEs across the ${audits.length} raids (${union.size - unModeled.length} modeled, ${unModeled.length} not)`);
console.log('  ' + unionSorted.map(([n, v]) => `${n}${v.modeled ? '' : ' *'} (${v.raids.size})`).join(', '));
if (unModeled.length) console.log(`\n  not modeled by the sim: ${unModeled.map(([n]) => n).join(', ')}`);

if (process.env.OUT) {
  const payload = {
    generated: 'run scripts/enikk/roster-audit.ts', top: TOP,
    raids: audits.map((a) => ({
      ...a,
      uniqueTeams: a.uniqueTeams,
      nikkes: a.nikkes,
    })),
    union: unionSorted.map(([name, v]) => ({ name, modeled: v.modeled, raids: [...v.raids].sort() })),
  };
  writeFileSync(process.env.OUT, JSON.stringify(payload, null, 1));
  console.log(`\nJSON written to ${process.env.OUT}`);
}

if (process.env.MD) {
  const L: string[] = [];
  L.push(`# enikk top-${TOP} roster audit`, '');
  L.push(`> Regenerable snapshot — run \`MD=${process.env.MD} ENIKK_CACHE=<dir> npx tsx scripts/enikk/roster-audit.ts\`.`);
  L.push(`> Source: enikk.app SRRankings, top ${TOP} rankers per raid × their saved teams,`);
  L.push(`> deduped by unit set. \`*\` marks a unit the sim does not model.`, '');
  for (const a of audits) {
    L.push(`## Raid ${a.raid} — ${a.label} (boss ${a.boss})`, '');
    L.push(`Top ${a.rankers} rankers → ${a.rawTeams} raw teams → **${a.uniqueTeams.length} unique comps**. ${a.nikkes.length} distinct NIKKEs.`, '');
    L.push(`### Unique teams (rankers running each)`, '');
    for (const t of a.uniqueTeams) {
      L.push(`- (${t.count}) ${t.characters.map((n) => (isModeled(n) ? n : `${n} *`)).join(', ')}`);
    }
    L.push('', `### NIKKEs used`, '');
    L.push(a.nikkes.map((n) => (n.modeled ? n.name : `${n.name} *`)).join(', '), '');
  }
  L.push(`## All raids — NIKKE union`, '');
  L.push(`${union.size} distinct NIKKEs (${union.size - unModeled.length} modeled, ${unModeled.length} not). Number = raids the unit appears in.`, '');
  L.push(unionSorted.map(([n, v]) => `${v.modeled ? n : `${n} *`} (${v.raids.size})`).join(', '), '');
  if (unModeled.length) L.push('', `**Not modeled by the sim:** ${unModeled.map(([n]) => n).join(', ')}`);
  writeFileSync(process.env.MD, L.join('\n') + '\n');
  console.log(`Markdown written to ${process.env.MD}`);
}

// Machine-readable mirror of the "All raids — NIKKE union" list, consumed by
// src/data/sync.ts as the enikk-proven keep-filter (DECISIONS 2026-07-14).
// Regenerate together with MD so the two never drift.
if (process.env.SUPPORTED) {
  // Apply the outlier filter to the enikk-derived union: drop single-use outliers
  // (1 raid AND 1 use). Report the dropped set for owner review.
  const enikkNames = unionSorted.map(([n]) => n);
  const dropped = enikkNames.filter((n) => !keepUnit(n));
  if (dropped.length) {
    console.log(`\noutlier filter dropped ${dropped.length} single-use unit(s) (1 raid AND 1 use):`);
    for (const n of dropped) {
      const s = unitStats(n);
      console.log(`  - ${n} (raidGroups=${s.raidGroups}, uses=${s.maxUses})`);
    }
  }
  // union the filtered enikk names with owner-specified manual additions AFTER the
  // filter (dedup), so hardcoded picks always survive regardless of usage.
  const names = [...new Set([...enikkNames.filter(keepUnit), ...MANUAL_ADDITIONS])].sort((a, b) =>
    a.localeCompare(b),
  );
  const payload = {
    updated: new Date().toISOString().slice(0, 10),
    source:
      "docs/enikk-top100-audit.md — per-raid '### Unique teams' blocks (top-100 ranker teams, deduped, across audited raids)",
    policy:
      "The enikk-supported roster (DECISIONS 2026-07-14). sync.ts keeps a unit iff its name (with " +
      "' (Treasure)' stripped) is in `names` below OR it has a hand-tuned override in " +
      'src/skills/overrides/. Outlier filter (2026-07-15): a unit is DROPPED from the enikk-derived ' +
      'set iff it appears in exactly ONE raid AND its total uses in that raid is 1 (single ranker, ' +
      'single team); kept iff it spans >=2 raids OR has >=2 uses in some raid. MANUAL_ADDITIONS are ' +
      'unioned in after the filter. Regenerate offline via ' +
      '`FROM_MD=docs/enikk-top100-audit.md SUPPORTED=data/enikk-supported.json ' +
      'npx tsx scripts/enikk/roster-audit.ts`.',
    names,
  };
  writeFileSync(process.env.SUPPORTED, JSON.stringify(payload, null, 1) + '\n');
  console.log(`enikk-supported roster written to ${process.env.SUPPORTED} (${names.length} names)`);
}
