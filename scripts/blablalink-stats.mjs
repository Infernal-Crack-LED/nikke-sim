// blablalink-stats.mjs
//
// Pulls per-Nikke BASE stats (ATK / HP / DEF) and computes how they scale with
// Synchro level + dupes (Limit Break "grade" and Core enhancement) — the same
// numbers blablalink's ShiftyPad "nikke" page shows on its level/dupe sliders.
//
// Data lives as static JSON on sg-tools-cdn.blablalink.com, but the URL paths
// are obfuscated (per-segment djb2 hashes + an md5 filename). This reimplements
// that obfuscation so we can address the files directly — no browser needed.
//
// Usage:
//   node scripts/blablalink-stats.mjs list                 # dump resource_id -> name for all Nikkes
//   node scripts/blablalink-stats.mjs stats 90             # Emma: stat table across level/dupe
//   node scripts/blablalink-stats.mjs raw 90 > emma.json   # full roledata dump for a resource_id
//
// resource_id is the `nikke=<id>` value in a ShiftyPad URL.

import crypto from 'node:crypto';

const CDN = 'https://sg-tools-cdn.blablalink.com';
const LOCALE = 'en'; // en | jp | kr | tw | cn (affects only localized text, not stats)
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291];

const md5 = (s) => crypto.createHash('md5').update(String(s)).digest('hex');

// djb2-ish rolling hash, truncated to signed int32 exactly like the site does.
function djb2Mod(str, prime) {
  let acc = prime;
  for (let i = 0; i < str.length; i++) acc = (acc * 33 + str.charCodeAt(i)) | 0;
  return acc;
}
function twoLetterHash(str, prime) {
  const r = ((djb2Mod(str, prime) % prime) + prime) % prime;
  return String.fromCharCode(97 + (Math.floor(r / 26) % 26), 97 + (r % 26));
}
function twoNumberHash(str, prime) {
  const r = (((djb2Mod(str, prime) % prime) + prime) % prime) % 99;
  return String(r).padStart(2, '0');
}

// Reproduces createNormalObfuscatedPath(): every path segment except the last
// becomes "<2 letters>-<2 digits>" (hash of the FULL path, salted by prime[i]);
// the final segment becomes "<md5(fullPath)>.<original extension>".
function obfuscatedPath(path) {
  const parts = path.replace(/^\//, '').split('/').filter(Boolean);
  return parts
    .map((seg, i) => {
      if (i !== parts.length - 1) {
        return `${twoLetterHash(path.replace(/^\//, ''), LARGE_PRIMES[i])}-${twoNumberHash(path.replace(/^\//, ''), LARGE_PRIMES[i])}`;
      }
      const bits = seg.split('.');
      bits.shift(); // drop basename, keep extension(s)
      return `${md5(path.replace(/^\//, ''))}.${bits.join('.')}`;
    })
    .join('/');
}

const resourceUrl = (path) => `${CDN}/${obfuscatedPath(path)}`;

async function getJson(path) {
  const url = resourceUrl(path);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} (${url})`);
  return res.json();
}

const getRoleData = (resourceId) => getJson(`/roledata/${resourceId}-v2-${LOCALE}.json`);
const getNikkeList = () => getJson(`/character/${LOCALE}/nikke_list_${LOCALE}_v2.json`);

// The exact stat formula from ShiftyPad's nikke-detail chunk.
//   level_stat = character_level_<type>_list[level - 1]            (synchro level curve)
//   grade      = # of Limit Breaks (0..3);  core = Core level (0..7)
//   base = floor( level_stat * (1 + grade * grade_ratio/1e4) + grade * grade_<type> )
//   stat = round( base * (1 + core * core_<type>/1e4) )
// (gear / cube / favorite-item bonuses are added on top in-game; omitted here.)
function computeStat(role, type /* attack|hp|defence */, level, grade, core) {
  const se = role.stat_enhance_detail;
  const levelStat = role[`character_level_${type}_list`][level - 1];
  const base = Math.floor(levelStat * (1 + grade * se.grade_ratio * 1e-4) + grade * se[`grade_${type}`]);
  return Math.round(base * (1 + core * se[`core_${type}`] * 1e-4));
}

function baseStats(role, level, grade = 0, core = 0) {
  return {
    atk: computeStat(role, 'attack', level, grade, core),
    hp: computeStat(role, 'hp', level, grade, core),
    def: computeStat(role, 'defence', level, grade, core),
  };
}

// ---- CLI ----
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'list') {
  const list = await getNikkeList();
  const arr = Array.isArray(list) ? list : list.records || list.list;
  for (const n of arr.sort((a, b) => a.resource_id - b.resource_id)) {
    const name = n.name_localkey?.name ?? n.name_localkey ?? n.name_code;
    console.log(`${String(n.resource_id).padStart(4)}  ${n.original_rare}  ${n.class.padEnd(11)}  ${name}`);
  }
} else if (cmd === 'raw') {
  console.log(JSON.stringify(await getRoleData(Number(arg)), null, 2));
} else if (cmd === 'stats') {
  const role = await getRoleData(Number(arg));
  const name = role.name_localkey ?? arg;
  const maxLv = role.character_level_attack_list.length;
  console.log(`${name} (resource_id ${arg}) — ${role.original_rare} ${role.class}, ${role.element_details?.[0]?.element ?? ''}`);
  console.log(`crit_rate=${role.critical_ratio / 100}%  crit_dmg=${role.critical_damage / 100}%  max synchro lv=${maxLv}`);
  console.log('\n  level  LB  core        ATK           HP         DEF');
  const rows = [[1, 0, 0], [200, 0, 0], [200, 3, 0], [200, 3, 7], [maxLv, 3, 7]];
  for (const [lv, g, c] of rows) {
    const s = baseStats(role, lv, g, c);
    console.log(`  ${String(lv).padStart(5)}  ${g}   ${c}   ${String(s.atk).padStart(10)}  ${String(s.hp).padStart(11)}  ${String(s.def).padStart(10)}`);
  }
} else {
  console.log('usage: node scripts/blablalink-stats.mjs <list | stats <id> | raw <id>>');
}

export { getRoleData, getNikkeList, baseStats, computeStat, resourceUrl };
