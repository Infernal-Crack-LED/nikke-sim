// kit-parse harness — NEUTRAL half (safe for a blind subagent to run). Contains NO real recorded
// values. Grading (which needs real values) lives in scripts/kit-parse/grade.ts — do NOT run that
// during a blind parse.
//
//   extract <slug>     print raw kit text + base stats (the parse input for the subagent)
//   selfcheck <slug>   sim the reference team + print the unit's bucket breakdown (respects
//                      DBG_UNIT/DBG_BUFFS env). NO real values — confirm blocks FIRE, don't fit a number.
import { loadWorld, runOnce, type BatteryTeam } from '../battery/lib.js';

// the reference team composition (control team + the RRH carry). Composition only — NOT a real value.
const REF_TEAM: BatteryTeam = {
  name: 'rrh-control reference',
  slugs: ['little-mermaid', 'crown', 'helm', 'rapi-red-hood'],
};

function extract(slug: string) {
  const w = loadWorld();
  const c = w.data.characters[slug];
  if (!c) throw new Error(`no character '${slug}'`);
  const s = c.skills ?? {};
  const b: any = c.baseStats ?? {};
  console.log([
    `SLUG: ${slug}`, `NAME: ${c.name}`,
    `WEAPON: ${c.weapon} | BURST: ${c.burst} | CLASS: ${c.class} | ELEMENT: ${c.element}`,
    `ammo ${c.ammo} | reloadFrames ${c.reloadFrames} | chargeFrames ${c.chargeFrames} | hitsPerShot ${c.hitsPerShot}`,
    `normalMult ${c.normalAttackMultiplier} | coreMult ${c.coreAttackMultiplier} | burstCooldownSec ${c.burstCooldownSec ?? '?'}`,
    `baseCrit ${b.critRate ?? '?'} | baseCritDmg ${b.critDamage ?? '?'}`,
    ``, `=== SKILL 1 ===`, String(s.skill1 ?? '').trim(),
    ``, `=== SKILL 2 ===`, String(s.skill2 ?? '').trim(),
    ``, `=== BURST ===`, String(s.burst ?? '').trim(),
  ].join('\n'));
}

function selfcheck(slug: string) {
  const w = loadWorld();
  const r = runOnce(w, REF_TEAM, null, 1); // no seed → deterministic; DBG env flows through
  const u = r.units.find((x) => x.slug === slug);
  console.log(`selfcheck ${slug} in ${REF_TEAM.name} (neutral)  teamFB=${r.fullBursts}`);
  if (!u) { console.log(`  (${slug} not in reference team — inspect via DBG only)`); return; }
  const d = u.breakdown;
  console.log(`  ${slug}: total=${(u.totalDamage / 1e6).toFixed(1)}M  n=${(d.normal / 1e6).toFixed(1)}M s=${(d.skill / 1e6).toFixed(1)}M b=${(d.burst / 1e6).toFixed(1)}M  pulls=${u.pulls} burstCasts=${u.burstCasts}`);
  console.log(`  (re-run with DBG_UNIT=${slug} DBG_BUFFS=1 DBG_N=100000 to confirm each block fires over the whole fight)`);
}

const [cmd, slug] = process.argv.slice(2);
if (cmd === 'extract' && slug) extract(slug);
else if (cmd === 'selfcheck' && slug) selfcheck(slug);
else { console.error('usage: parse.ts extract <slug> | selfcheck <slug>  (grading is grade.ts)'); process.exit(1); }
