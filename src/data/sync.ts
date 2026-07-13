// Pulls character data from Bakery Bot's Postgres (base stats, curated attributes)
// and the nikke-synergy public API (frame-accurate weapon timing), merges on
// synergy_id, and writes data/characters.json + data/level-multiplier.json so
// the sim runs offline and deterministically.
import 'dotenv/config';
import pg from 'pg';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { CharacterData, DataFile } from '../types.js';

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

async function main() {
  const url = process.env.DATABASE_PUBLIC_URL;
  if (!url) throw new Error('DATABASE_PUBLIC_URL not set (add it to .env)');
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query(
    `select id, name, synergy_id, image_url, attributes, base_stats, prydwen_tiers from nikke_characters`
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
      normalAttackMultiplier: a.normalAttackMultiplier ?? api?.normal_attack_multiplier ?? 0,
      coreAttackMultiplier: a.coreAttackMultiplier ?? api?.core_attack_multiplier ?? 200,
      ammo: a.ammo ?? api?.ammo ?? 60,
      reloadFrames: api?.reload_time ?? Math.round((a.reloadSeconds ?? 2) * 60 + 21),
      chargeFrames: api?.charge_time ?? 0,
      chargeMultiplier: api?.charge_multiplier ?? 0,
      hitsPerShot: api?.hits_per_shot || 1,
      rl3: a.rl3 ?? null,
      burstGaugePerShot: api?.burst_gauge_per_shot ?? null,
      skills: {
        skill1: a.skill1En ?? api?.skill_1_en ?? '',
        skill2: a.skill2En ?? api?.skill_2_en ?? '',
        burst: a.burstSkillEn ?? api?.burst_skill_en ?? '',
      },
      baseStats: row.base_stats,
    };
    characters[row.id] = char;
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
  console.log(`synced ${total} characters (${skipped.length} skipped, ${noStats} missing base_stats, ${noApi} unmatched to synergy API, ${tierDropped} dropped as Bossing C-or-below)`);
  if (skipped.length) console.log('skipped:', skipped.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
