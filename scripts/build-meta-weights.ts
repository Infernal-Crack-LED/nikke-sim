// Build the meta-popularity weight table the web team/roster generators use to
// bias toward what top players actually field (DECISIONS 2026-07-15).
//
// Inputs (both committed, change rarely):
//   docs/enikk-top100-audit.md   — per-raid top-100 ranker comps + ranker counts
//   data/bossing-tiers.json      — prydwen bossing tier per slug (fallback score)
//
// Output: web/src/metaWeights.ts (committed, imported by App.tsx). Regenerate
// whenever the audit doc is refreshed:
//   npx tsx scripts/build-meta-weights.ts
//
// Scoring model (consumed by src/teamcalc.ts):
//   - unit popularity, per boss-weakness element: for the ONE raid whose boss is
//     weak to that element, a modeled unit's raw score = sum of ranker-counts of
//     the unique comps it appears in; normalized 0..1 within the raid.
//   - full-team popularity: each modeled-COMPLETE unique comp (all 5 units have
//     overrides) with its normalized ranker count, for exact-comp matching +
//     candidate injection.
//   - fallback: units absent from EVERY audited raid (too new for solo-raid
//     ranker data — e.g. Cinderella: Crystal Wave) get an element-agnostic score
//     derived from their prydwen bossing tier instead (owner ruling 2026-07-15).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import type { DataFile } from '../src/types.js';

const AUDIT = new URL('../docs/enikk-top100-audit.md', import.meta.url);
const OUT = new URL('../web/src/metaWeights.ts', import.meta.url);

// "<token>-weak" label → the element the boss is weak to (the UI's weakness pick).
const WEAK_TOKEN: Record<string, string> = {
  water: 'Water', elec: 'Electric', fire: 'Fire', iron: 'Iron', wind: 'Wind',
};

// prydwen bossing tier → element-agnostic meta score in [0,1], calibrated to sit
// on the same scale as the enikk unit popularity (top enikk unit = 1.0).
const TIER_SCORE: Record<string, number> = {
  SSS: 1.0, SS: 0.85, S: 0.7, A: 0.5, B: 0.35, C: 0.2, D: 0.1, E: 0.05, F: 0.0,
};

// strong co-equal blend (owner ruling 2026-07-15): score = dmg × (1 + W·prior).
const WEIGHT_DEFAULT = 1.0;   // W: a max-meta team can roughly double its score
const COMBO_WEIGHT = 0.6;     // exact-comp match adds up to 0.6 to the prior

const data: DataFile = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const tiers: { tiers: Record<string, string> } =
  JSON.parse(readFileSync(new URL('../data/bossing-tiers.json', import.meta.url), 'utf8'));
const modeled = new Set(
  readdirSync(new URL('../src/skills/overrides', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, '')),
);

// display name (no ' (Treasure)') → slug, restricted to synced characters.
const nameToSlug: Record<string, string> = {};
for (const [slug, c] of Object.entries(data.characters)) nameToSlug[c.name.replace(' (Treasure)', '')] = slug;

interface RaidBlock { weakness: string; boss: string; teams: { slugs: (string | null)[]; count: number }[] }

function parseAudit(): RaidBlock[] {
  const lines = readFileSync(AUDIT, 'utf8').split('\n');
  const raidRe = /^## Raid \d+ — (\w+)-weak \(boss (\w+)\)/;
  const teamRe = /^-\s*\((\d+)\)\s*(.+)$/;
  const out: RaidBlock[] = [];
  let cur: RaidBlock | null = null;
  let inTeams = false;
  for (const line of lines) {
    const rm = raidRe.exec(line);
    if (rm) {
      const weakness = WEAK_TOKEN[rm[1]];
      cur = weakness ? { weakness, boss: rm[2], teams: [] } : null;
      if (cur) out.push(cur);
      inTeams = false;
      continue;
    }
    if (line.startsWith('### Unique teams')) { inTeams = true; continue; }
    if (line.startsWith('###') || line.startsWith('## ')) { inTeams = false; continue; }
    if (inTeams && cur) {
      const tm = teamRe.exec(line);
      if (tm) {
        // split 5 names, strip the trailing ` *` not-modeled marker, resolve to slug
        const slugs = tm[2].split(', ').map((n) => nameToSlug[n.replace(/\s*\*$/, '').trim()] ?? null);
        cur.teams.push({ slugs, count: Number(tm[1]) });
      }
    }
  }
  return out;
}

const raids = parseAudit();

// every slug that shows up ANYWHERE in the audit (across all raids) — the
// complement (within the synced roster) is the "too new" fallback set.
const seenInAudit = new Set<string>();
for (const r of raids) for (const t of r.teams) for (const s of t.slugs) if (s) seenInAudit.add(s);

interface MetaWeightEntry {
  raid: string; boss: string;
  unitPop: Record<string, number>;
  comps: { slugs: string[]; pop: number }[];
}
const byWeakness: Record<string, MetaWeightEntry> = {};

for (const r of raids) {
  // raw unit popularity = Σ ranker-counts of the comps a unit appears in
  const raw = new Map<string, number>();
  const comps: { slugs: string[]; pop: number }[] = [];
  let maxComp = 0;
  for (const t of r.teams) {
    for (const s of t.slugs) if (s) raw.set(s, (raw.get(s) ?? 0) + t.count);
    // modeled-COMPLETE comps only (all 5 resolve + have overrides): buildable/simmable
    if (t.slugs.length === 5 && t.slugs.every((s) => s && modeled.has(s))) {
      comps.push({ slugs: t.slugs as string[], pop: t.count });
      if (t.count > maxComp) maxComp = t.count;
    }
  }
  const maxUnit = Math.max(1, ...raw.values());
  const unitPop: Record<string, number> = {};
  for (const [slug, v] of raw) unitPop[slug] = +(v / maxUnit).toFixed(4);
  for (const c of comps) c.pop = +(c.pop / Math.max(1, maxComp)).toFixed(4);
  comps.sort((a, b) => b.pop - a.pop);
  byWeakness[r.weakness] = { raid: r.boss, boss: r.boss, unitPop, comps };
}

// element-agnostic tier fallback for synced units absent from all audited raids.
const tierPop: Record<string, number> = {};
const fallbackSlugs: string[] = [];
for (const slug of Object.keys(data.characters)) {
  if (seenInAudit.has(slug)) continue;
  fallbackSlugs.push(slug);
  const tier = tiers.tiers[slug];
  tierPop[slug] = tier !== undefined ? (TIER_SCORE[tier] ?? 0) : 0;
}
fallbackSlugs.sort();

const file = {
  generated: 'scripts/build-meta-weights.ts',
  source: 'docs/enikk-top100-audit.md + data/bossing-tiers.json',
  weightDefault: WEIGHT_DEFAULT,
  comboWeight: COMBO_WEIGHT,
  byWeakness,
  tierPop,
  fallbackSlugs,
};

const banner =
  '// GENERATED by scripts/build-meta-weights.ts — do not edit by hand.\n' +
  '// Meta-popularity weights for the web team/roster generators (enikk top-100\n' +
  '// audit, per boss-weakness element; prydwen bossing-tier fallback for new units).\n';
const body =
  'export interface MetaWeightEntry {\n' +
  '  raid: string;\n  boss: string;\n' +
  '  /** slug → enikk popularity 0..1 for this boss-weakness raid */\n' +
  '  unitPop: Record<string, number>;\n' +
  '  /** modeled-complete popular comps (slugs) with normalized ranker count 0..1 */\n' +
  '  comps: { slugs: string[]; pop: number }[];\n' +
  '}\n' +
  'export interface MetaWeightsFile {\n' +
  '  generated: string;\n  source: string;\n' +
  '  /** strong co-equal blend weight W: score = dmg × (1 + W·prior) */\n' +
  '  weightDefault: number;\n' +
  '  /** exact-comp match contribution to the prior */\n' +
  '  comboWeight: number;\n' +
  '  /** keyed by the element the boss is weak to (the UI weakness pick) */\n' +
  '  byWeakness: Record<string, MetaWeightEntry>;\n' +
  '  /** element-agnostic tier score for units absent from all audited raids */\n' +
  '  tierPop: Record<string, number>;\n' +
  '  fallbackSlugs: string[];\n' +
  '}\n\n' +
  `export const META_WEIGHTS: MetaWeightsFile = ${JSON.stringify(file, null, 1)};\n`;

writeFileSync(OUT, banner + body);
const compCount = Object.values(byWeakness).reduce((n, e) => n + e.comps.length, 0);
console.log(`wrote ${OUT.pathname}`);
console.log(`  ${Object.keys(byWeakness).length} weakness elements, ${compCount} modeled-complete comps, ${fallbackSlugs.length} tier-fallback units`);
for (const [w, e] of Object.entries(byWeakness)) {
  const top = Object.entries(e.unitPop).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, v]) => `${s} ${v}`).join(', ');
  console.log(`  ${w.padEnd(9)} (boss ${e.boss}): ${e.comps.length} comps; top units: ${top}`);
}
