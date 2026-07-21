// Pulls character data from Bakery Bot's Postgres (base stats, curated attributes)
// and the nikke-synergy public API (frame-accurate weapon timing), merges on
// synergy_id, and writes data/characters.json + data/level-multiplier.json so
// the sim runs offline and deterministically.
import 'dotenv/config';
import pg from 'pg';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { CharacterData, DataFile } from '../types.js';
import { deriveNicknames } from './nicknames.js';
import { deriveWeaponFields, type WeaponShotDetail } from './weapon-fields.js';

const SYNERGY_API = 'https://api.nikke-synergy.com/rest/v1/attack_damage_characters';
const SYNERGY_HEADERS = { apikey: 'dummy-key', Authorization: 'Bearer dummy-key' };

// The DB matched these slugs to the PLAIN synergy entry, but the Treasure (宝)
// entry is the kit players actually run (favorite-item upgrade of the same
// unit). Re-point them and prefer the API's skill text over the DB's.
// (helm already maps to her treasure entry, 145.)
// data/bossing-tiers.json is still regenerated on every sync (build-dpschart.ts reads it to
// pick its SSS–B chart/selector population) — but bossing tier no longer PRUNES characters.json;
// that job now belongs to the generator/sim support tags below (2026-07-19, owner-directed —
// the tier drop predated the tag system and is redundant with it).

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

// Second-stage roster TAGGING (DECISIONS 2026-07-14, expanded 2026-07-19): every character
// the DB has now flows into characters.json — nobody is dropped for support status. Instead
// each character is tagged with two independent booleans (CharacterData.generatorSupported /
// .simSupported); "unsupported" is just both false. generatorSupported = the enikk-proven list
// — the "All raids — NIKKE union" of the top-100 ranker teams, mirrored machine-readably in
// data/enikk-supported.json (regenerated with the MD by scripts/enikk/roster-audit.ts).
// simSupported = has a hand-tuned kit override in src/skills/overrides/. Today the two sets
// coincide (74/74 enikk-proven units are also override-authored), but they'll diverge as the
// override backlog grows independent of the enikk audit — the web app gates DPS chart/generator
// tabs on generatorSupported, Team Sim/Roster Sim/Overload tools on simSupported, and shows
// EVERY character (including unsupported) on the Team Builder page.
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
    // role_* = raw blablalink roledata snapshot (game source-of-truth), pulled through UNPRUNED into
    // characters.json for now (prune/migrate later). skill_descriptions = blablalink prose, now the
    // skills source (accurate to the game). The engine never parses this prose at runtime (2026-07-16
    // prose-free migration) — after syncing a NEW unit, run scripts/materialize-overrides.ts --write
    // to seed its override, or the verify gate / runtime will fail loudly on the missing file.
    `select id, name, synergy_id, image_url, attributes, base_stats, prydwen_tiers, prydwen_slug, aliases,
            skill_descriptions,
            role_weapon, role_burst_meta, role_skill_details, role_stat_scaling, role_element, role_piece, role_meta
       from nikke_characters order by id`
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
  for (const row of rows) {
    const tier = row.prydwen_tiers?.bossing ?? '?';
    bossingTiers[row.id] = tier;
    const a = row.attributes ?? {};
    const treasureId = TREASURE_SYNERGY_IDS[row.id];
    const api =
      treasureId != null
        ? bySynergyId.get(treasureId)
        : row.synergy_id != null
          ? bySynergyId.get(row.synergy_id)
          : undefined;
    if (treasureId != null && api) {
      // the DB attributes carry the plain kit — the treasure entry wins for the prose/cooldown.
      // (normalAttackMultiplier/ammo now derive from role.weapon below, which already reflects the
      // datamined weapon table — verified equal to the treasure synergy values for all treasure units.)
      a.skill1En = api.skill_1_en;
      a.skill2En = api.skill_2_en;
      a.burstSkillEn = api.burst_skill_en;
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
    // Weapon-timing fields now derive from the raw datamined WeaponTable (role.weapon.shot_detail),
    // the source-of-truth UPSTREAM of the lossy synergy weapon columns (audit A+B, 2026-07-17).
    // Synergy stays only as a fallback for a unit whose roledata hasn't been fetched.
    const shot = (row.role_weapon as { shot_detail?: WeaponShotDetail } | null)?.shot_detail;
    const wf = shot ? deriveWeaponFields(row.id, shot, api) : null;
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
      normalAttackMultiplier: wf?.normalAttackMultiplier ?? a.normalAttackMultiplier ?? api?.normal_attack_multiplier ?? 0,
      coreAttackMultiplier: wf?.coreAttackMultiplier ?? a.coreAttackMultiplier ?? api?.core_attack_multiplier ?? 200,
      ammo: wf?.ammo ?? a.ammo ?? api?.ammo ?? 60,
      reloadFrames: wf?.reloadFrames ?? api?.reload_time ?? Math.round((a.reloadSeconds ?? 2) * 60 + 21),
      chargeFrames: wf?.chargeFrames ?? api?.charge_time ?? 0,
      chargeMultiplier: wf?.chargeMultiplier ?? api?.charge_multiplier ?? 0,
      // hitsPerShot = datamined shot_count × muzzle_count, with modernia/anis-star carve-outs
      // (C.1 review, 2026-07-17 — role-object-audit). Synergy is fallback only. Byte-identical to
      // the prior synergy value on every unit except the 4 corrected (helm/cinderella/laplace/
      // maiden-ice-rose 2→1, stale synergy value with no muzzle/shot backing).
      hitsPerShot: wf?.hitsPerShot ?? api?.hits_per_shot ?? 1,
      rl3: a.rl3 ?? null,
      // Clean datamined burst gauge — reference only; the engine reads data/gauge-per-shot.json.
      burstGaugePerShot: wf ? wf.burstGaugePerShot : (api?.burst_gauge_per_shot ?? null),
      // Treasure (favorite-item upgrade) status: the DB's prydwen_slug ends
      // "-treasure" for units whose Treasure is released.
      treasure: (row.prydwen_slug ?? '').endsWith('-treasure'),
      ...(nick.byId[row.id] ? { nicknames: nick.byId[row.id] } : {}),
      // Prose now comes from blablalink (DB skill_descriptions) — accurate to the game source.
      // bakery removed attributes.skill*En, so the old `a.skill*En` reads are dead; Synergy stays
      // only as a last-ditch fallback for a unit whose roledata hasn't been fetched. Treasure units
      // (privaty/tove/zwei/moran) get their Treasure kit via skill_descriptions (bakery-side).
      // This prose is AUTHORING INPUT ONLY (offline kit parser / kit.ts / materialize-overrides) —
      // the sim runs purely on src/skills/overrides/*.json (2026-07-16 prose-free migration).
      skills: {
        skill1: row.skill_descriptions?.skill1 || api?.skill_1_en || '',
        skill2: row.skill_descriptions?.skill2 || api?.skill_2_en || '',
        burst: row.skill_descriptions?.burst || api?.burst_skill_en || '',
      },
      // Skill activation cooldowns (SECONDS), folded into skill_descriptions.cooldowns by
      // bakery-bot from the community wiki — blablalink roledata only carries the burst CD, not
      // skills 1 & 2. Per slot: number = seconds, `null` = passive (no cooldown / wiki "N/A").
      // The whole `cooldowns` object may be ABSENT (unit not yet matched to a wiki page) — in
      // that case we OMIT skillCooldownsSec entirely so a consumer reads it as "unknown", NOT as
      // a passive `null`. Static kit data (does NOT scale with skill level); the engine doesn't
      // read it yet. See docs/handoffs/2026-07-20-skill-cooldowns-to-sim.md.
      ...(row.skill_descriptions?.cooldowns
        ? {
            skillCooldownsSec: {
              skill1: row.skill_descriptions.cooldowns.skill1 ?? null,
              skill2: row.skill_descriptions.cooldowns.skill2 ?? null,
              burst: row.skill_descriptions.cooldowns.burst ?? null,
            },
          }
        : {}),
      // Raw blablalink roledata snapshot, UNPRUNED (prefix stripped: role_weapon -> role.weapon, …).
      // Nothing reads it yet; staged for a later api.* -> role.* migration. Omit empty keys.
      role: {
        ...(row.role_weapon != null ? { weapon: row.role_weapon } : {}),
        ...(row.role_burst_meta != null ? { burstMeta: row.role_burst_meta } : {}),
        ...(row.role_skill_details != null ? { skillDetails: row.role_skill_details } : {}),
        ...(row.role_stat_scaling != null ? { statScaling: row.role_stat_scaling } : {}),
        ...(row.role_element != null ? { element: row.role_element } : {}),
        ...(row.role_piece != null ? { piece: row.role_piece } : {}),
        ...(row.role_meta != null ? { meta: row.role_meta } : {}),
      },
      // Support tags — see the "Second-stage roster TAGGING" note above. Nobody is dropped;
      // these two booleans gate which web-app surfaces offer this character.
      generatorSupported: false,
      simSupported: false,
      baseStats: row.base_stats,
    };
    characters[row.id] = char;
  }

  // Second stage: TAG (never drop) with the two support booleans.
  const { proven, overrideSlugs } = loadSupportPolicy();
  let generatorCount = 0;
  let simCount = 0;
  const unsupported: string[] = [];
  for (const [slug, c] of Object.entries(characters)) {
    c.generatorSupported = proven.has(normalizeName(c.name));
    c.simSupported = overrideSlugs.has(slug);
    if (c.generatorSupported) generatorCount++;
    if (c.simSupported) simCount++;
    if (!c.generatorSupported && !c.simSupported) unsupported.push(slug);
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
  console.log(`synced ${total} characters (${skipped.length} skipped, ${noStats} missing base_stats, ${noApi} unmatched to synergy API)`);
  console.log(`support tags: ${generatorCount} generatorSupported, ${simCount} simSupported, ${unsupported.length} unsupported (Team Builder only)`);
  const nickKept = Object.values(characters).filter((c) => c.nicknames?.length).length;
  console.log(`nicknames: ${nickKept} units with approved nicknames; ${nick.dropped.length} aliases dropped as unsafe:`);
  for (const d of nick.dropped) console.log(`  - "${d.alias}" (${d.id}): ${d.reason}`);
  if (skipped.length) console.log('skipped:', skipped.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
