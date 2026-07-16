// Pulls character data from Bakery Bot's Postgres (base stats, curated attributes)
// and the nikke-synergy public API (frame-accurate weapon timing), merges on
// synergy_id, and writes data/characters.json + data/level-multiplier.json so
// the sim runs offline and deterministically.
import 'dotenv/config';
import pg from 'pg';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { CharacterData, DataFile } from '../types.js';
import { deriveNicknames } from './nicknames.js';

const SYNERGY_API = 'https://api.nikke-synergy.com/rest/v1/attack_damage_characters';
const SYNERGY_HEADERS = { apikey: 'dummy-key', Authorization: 'Bearer dummy-key' };

// The DB matched these slugs to the PLAIN synergy entry, but the Treasure (宝)
// entry is the kit players actually run (favorite-item upgrade of the same
// unit). Re-point them and prefer the API's skill text over the DB's.
// (helm already maps to her treasure entry, 145.)
// Units rated Bossing C or below on Prydwen (DB column prydwen_tiers.bossing) are dropped
// at sync time — never fielded in raid comps, only waste bundle size and coverage compute.
// Unknown/missing tiers are kept (safe default). data/bossing-tiers.json is regenerated as
// the checked-in record of what was applied.
const EXCLUDED_TIERS = new Set(['C', 'D', 'E', 'F']);

const TREASURE_SYNERGY_IDS: Record<string, number> = {
  privaty: 198,
  tove: 172,
  zwei: 199,
  moran: 200,
};

// Overspec units: their relationship (bond) bonus follows a DIFFERENT class-tier than their
// nominal manufacturer, so the owner's class×manufacturer relationship matrix keys them on a
// distinct "<Manufacturer> Overspec" bucket. We append " Overspec" to the synced manufacturer
// for exactly these slugs. (owner, 2026-07-16; open-questions U18.)
const OVERSPEC_SLUGS = new Set<string>([
  'mihara-bonding-chain', // Missilis → "Missilis Overspec"
  'rapi-red-hood',        // Elysion  → "Elysion Overspec"
  'anis-star',            // Tetra    → "Tetra Overspec"
  'neon-vision-eye',      // Missilis → "Missilis Overspec"
]);

// Second-stage roster prune (DECISIONS 2026-07-14): the supported roster is the
// enikk-proven list — the "All raids — NIKKE union" of the top-100 ranker teams,
// mirrored machine-readably in data/enikk-supported.json (regenerated with the MD
// by scripts/enikk/roster-audit.ts) — PLUS every unit we already hand-tuned an
// override for. Keep a unit iff it satisfies one of those; drop the parse-only
// rest that never show up in the top-100 meta. Never drop a hand-tuned override,
// even if it falls out of the enikk list.
const normalizeName = (n: string) => n.replace(' (Treasure)', '').trim();

function loadSupportPolicy() {
  const proven = new Set<string>(
    (JSON.parse(
      readFileSync(new URL('../../data/enikk-supported.json', import.meta.url), 'utf8')
    ).names as string[]).map(normalizeName)
  );
  const overrideSlugs = new Set(
    readdirSync(new URL('../skills/overrides/', import.meta.url))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
  );
  return { proven, overrideSlugs };
}

async function main() {
  const url = process.env.DATABASE_PUBLIC_URL;
  if (!url) throw new Error('DATABASE_PUBLIC_URL not set (add it to .env)');
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query(
    // ORDER BY id: the DB returns rows in non-deterministic order otherwise, which churns the
    // whole characters.json on every sync (a 2000-line reorder that buries the real change).
    // Deterministic id order → syncs diff cleanly (2026-07-16).
    `select id, name, synergy_id, image_url, attributes, base_stats, prydwen_tiers, prydwen_slug, aliases from nikke_characters order by id`
  );
  const metaRow = await client.query(
    `select value from bot_meta where key = 'nikke_level_multiplier'`
  );
  await client.end();
  if (!metaRow.rows.length) throw new Error('bot_meta.nikke_level_multiplier missing');
  const levelMultiplier = JSON.parse(metaRow.rows[0].value);

  const apiRes = await fetch(`${SYNERGY_API}?limit=500`, { headers: SYNERGY_HEADERS });
  if (!apiRes.ok) throw new Error(`synergy API ${apiRes.status}`);
  const apiRows: any[] = await apiRes.json();
  const bySynergyId = new Map(apiRows.map((r) => [r.id, r]));

  // Approved nicknames from the DB alias lists — derived over the FULL row set
  // (ambiguity is judged against every unit, not just the kept roster).
  const nick = deriveNicknames(rows);

  const characters: DataFile['characters'] = {};
  const skipped: string[] = [];
  const bossingTiers: Record<string, string> = {};
  let tierDropped = 0;
  for (const row of rows) {
    const tier = row.prydwen_tiers?.bossing ?? '?';
    bossingTiers[row.id] = tier;
    if (EXCLUDED_TIERS.has(tier)) {
      tierDropped++;
      continue;
    }
    const a = row.attributes ?? {};
    const treasureId = TREASURE_SYNERGY_IDS[row.id];
    const api =
      treasureId != null
        ? bySynergyId.get(treasureId)
        : row.synergy_id != null
          ? bySynergyId.get(row.synergy_id)
          : undefined;
    if (treasureId != null && api) {
      // the DB attributes carry the plain kit — the treasure entry wins
      a.skill1En = api.skill_1_en;
      a.skill2En = api.skill_2_en;
      a.burstSkillEn = api.burst_skill_en;
      a.normalAttackMultiplier = api.normal_attack_multiplier ?? a.normalAttackMultiplier;
      a.ammo = api.ammo ?? a.ammo;
      if (api.burst_cooltime) a.burstCooldown = api.burst_cooltime / 60;
    }
    if (!a.weapon || !a.burst) {
      skipped.push(`${row.id} (missing weapon/burst)`);
      continue;
    }
    // No base stats = can't compute damage (ATK/HP absent); these are usually
    // not-yet-localized DB stubs (non-ASCII placeholder name/slug). Drop them.
    if (!row.base_stats) {
      skipped.push(`${row.id} (missing base_stats)`);
      continue;
    }
    const char: CharacterData & { baseStats: any } = {
      slug: row.id,
      name: row.name,
      imageUrl: a.imageUrl ?? row.image_url ?? api?.image_public_url ?? null,
      weapon: a.weapon,
      burst: a.burst,
      burstCooldownSec:
        a.burstCooldown ?? (api?.burst_cooltime ? api.burst_cooltime / 60 : 40),
      class: a.class ?? 'Attacker',
      element: a.element ?? 'Fire',
      // Manufacturer (Elysion/Missilis/Tetra/Pilgrim/Abnormal) — from the DB attributes blob.
      // Drives the relationship (bond) ATK bonus, which is a class×manufacturer stat the owner
      // maintains as a matrix (Pilgrims cap higher). Was previously unmodeled → the ~1.5-2% "cold"
      // read across scope-lock units (open-questions U18). Overspec units get " Overspec" appended
      // so the matrix can bucket them separately.
      manufacturer: a.manufacturer
        ? OVERSPEC_SLUGS.has(row.id)
          ? `${a.manufacturer} Overspec`
          : a.manufacturer
        : null,
      normalAttackMultiplier: a.normalAttackMultiplier ?? api?.normal_attack_multiplier ?? 0,
      coreAttackMultiplier: a.coreAttackMultiplier ?? api?.core_attack_multiplier ?? 200,
      ammo: a.ammo ?? api?.ammo ?? 60,
      reloadFrames: api?.reload_time ?? Math.round((a.reloadSeconds ?? 2) * 60 + 21),
      chargeFrames: api?.charge_time ?? 0,
      chargeMultiplier: api?.charge_multiplier ?? 0,
      hitsPerShot: api?.hits_per_shot || 1,
      rl3: a.rl3 ?? null,
      burstGaugePerShot: api?.burst_gauge_per_shot ?? null,
      // Treasure (favorite-item upgrade) status: the DB's prydwen_slug ends
      // "-treasure" for units whose Treasure is released.
      treasure: (row.prydwen_slug ?? '').endsWith('-treasure'),
      ...(nick.byId[row.id] ? { nicknames: nick.byId[row.id] } : {}),
      skills: {
        skill1: a.skill1En ?? api?.skill_1_en ?? '',
        skill2: a.skill2En ?? api?.skill_2_en ?? '',
        burst: a.burstSkillEn ?? api?.burst_skill_en ?? '',
      },
      baseStats: row.base_stats,
    };
    characters[row.id] = char;
  }

  // Second stage: keep only enikk-proven units + hand-tuned overrides.
  const { proven, overrideSlugs } = loadSupportPolicy();
  const unsupported: string[] = [];
  for (const [slug, c] of Object.entries(characters)) {
    if (proven.has(normalizeName(c.name)) || overrideSlugs.has(slug)) continue;
    unsupported.push(slug);
    delete characters[slug];
  }

  mkdirSync(new URL('../../data/', import.meta.url), { recursive: true });
  const out: DataFile = { syncedAt: new Date().toISOString(), characters };
  writeFileSync(new URL('../../data/characters.json', import.meta.url), JSON.stringify(out, null, 1));
  writeFileSync(
    new URL('../../data/bossing-tiers.json', import.meta.url),
    JSON.stringify(
      {
        updated: new Date().toISOString().slice(0, 10),
        source: 'bakery-bot DB nikke_characters.prydwen_tiers.bossing',
        excludedTiers: [...EXCLUDED_TIERS].sort(),
        tiers: Object.fromEntries(Object.entries(bossingTiers).sort()),
      },
      null,
      1
    )
  );
  writeFileSync(
    new URL('../../data/level-multiplier.json', import.meta.url),
    JSON.stringify(levelMultiplier)
  );

  const total = Object.keys(characters).length;
  const noStats = Object.values(characters).filter((c) => !c.baseStats).length;
  const noApi = rows.filter((r) => r.synergy_id == null || !bySynergyId.has(r.synergy_id)).length;
  console.log(`synced ${total} characters (${skipped.length} skipped, ${noStats} missing base_stats, ${noApi} unmatched to synergy API, ${tierDropped} dropped as Bossing C-or-below, ${unsupported.length} dropped as not-enikk-proven + no override)`);
  const nickKept = Object.values(characters).filter((c) => c.nicknames?.length).length;
  console.log(`nicknames: ${nickKept} units with approved nicknames; ${nick.dropped.length} aliases dropped as unsafe:`);
  for (const d of nick.dropped) console.log(`  - "${d.alias}" (${d.id}): ${d.reason}`);
  if (skipped.length) console.log('skipped:', skipped.join(', '));
  if (unsupported.length) console.log('not-enikk-proven (dropped):', unsupported.sort().join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
