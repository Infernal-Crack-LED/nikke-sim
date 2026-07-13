// Validate override files:
//   npx tsx scripts/validate-overrides.ts <slug> [slug...]
// 1. structural check against the effect schema (kinds / stats / triggers / targets)
// 2. resolveSkills with the override — reports remaining warnings
// 3. smoke sim: unit in a standard team; flags crashes, zero damage, absurd shares
import { readFileSync } from 'node:fs';
import { runSim } from '../src/engine/sim.js';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { DataFile, LevelMultiplier, SimConfig } from '../src/types.js';

const STATS = new Set([
  'atkPct', 'casterAtkPct', 'atkOfMaxHpPct', 'critRatePct', 'critDamagePct', 'coreDamagePct',
  'elementDamagePct', 'chargeDamagePct', 'chargeSpeedPct', 'attackDamagePct',
  'sustainedDamagePct', 'sequentialDamagePct', 'partsDamagePct', 'pierceDamagePct', 'damageTakenPct',
  'maxAmmoPct', 'reloadSpeedPct', 'attackSpeedPct', 'fireRatePct',
  'extraHitDamagePct', 'trueDamagePct', 'projectileExplosionPct',
  'elemAdvantageDamagePct', 'distributedDamagePct', 'projectileAttachmentPct',
  'chargeDamageMultPct',
  'normalAttackPct', 'burstGenPct', 'hitRatePct', 'defPct',
]);
const TRIGGERS = new Set([
  'passive', 'burstCast', 'fullBurstEnter', 'fullBurstEnd', 'hitCount',
  'shotFired', 'lastBullet', 'stageEnter', 'bossElement',
]);
const TARGETS = new Set([
  'self', 'allies', 'enemy', 'burstCasters', 'nonBurstCasters',
  'alliesTopAtk', 'alliesLowestAtk', 'alliesOfElement', 'alliesOfClass',
]);
const EFFECTS = new Set([
  'buff', 'flatDamage', 'dot', 'weaponSwap', 'fillGauge', 'burstEligibility',
  'advantageVs', 'burstCdr', 'escalating', 'fullBurstExtend', 'unlimitedAmmo',
  'instantReload', 'storedHit', 'stun', 'stackedNuke',
]);
const FLAVORS = new Set(['distributed', 'sustained', 'sequential', 'true', 'projectileAttachment', 'projectileExplosion']);

const data: DataFile = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../data/level-multiplier.json', import.meta.url), 'utf8'));

function checkEffect(e: any, path: string, errors: string[]) {
  if (!EFFECTS.has(e.kind)) return errors.push(`${path}: unknown effect kind "${e.kind}"`);
  if (e.kind === 'buff') {
    if (!STATS.has(e.stat)) errors.push(`${path}: unknown stat "${e.stat}"`);
    if (typeof e.value !== 'number') errors.push(`${path}: buff needs numeric value`);
  }
  if (e.kind === 'flatDamage') {
    if (typeof e.atkPct !== 'number') errors.push(`${path}: flatDamage needs atkPct`);
    if (e.flavor && !FLAVORS.has(e.flavor)) errors.push(`${path}: unknown flavor "${e.flavor}"`);
  }
  if (e.kind === 'dot' && (typeof e.atkPct !== 'number' || typeof e.durationSec !== 'number')) {
    errors.push(`${path}: dot needs atkPct + durationSec`);
  }
  if (e.kind === 'weaponSwap' && typeof e.damagePct !== 'number') {
    errors.push(`${path}: weaponSwap needs damagePct`);
  }
  if (e.kind === 'storedHit') {
    if (typeof e.atkPct !== 'number') errors.push(`${path}: storedHit needs atkPct`);
    if (e.flavor && !FLAVORS.has(e.flavor)) errors.push(`${path}: unknown flavor "${e.flavor}"`);
  }
  if (e.kind === 'escalating') {
    if (!Array.isArray(e.steps)) errors.push(`${path}: escalating needs steps[]`);
    else e.steps.forEach((s: any, i: number) => checkEffect(s, `${path}.steps[${i}]`, errors));
  }
}

function validate(slug: string): boolean {
  const c: any = data.characters[slug];
  if (!c) { console.log(`✗ ${slug}: unknown slug`); return false; }
  const override = loadOverride(slug);
  if (!override) { console.log(`✗ ${slug}: no override file`); return false; }

  const errors: string[] = [];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const blocks = (override as any)[slot];
    if (blocks === undefined) continue;
    if (!Array.isArray(blocks)) { errors.push(`${slot}: must be an array of blocks`); continue; }
    blocks.forEach((b: any, bi: number) => {
      const p = `${slot}[${bi}]`;
      if (b.mode && !(override as any).modes?.includes(b.mode)) {
        errors.push(`${p}: mode "${b.mode}" not declared in top-level modes[]`);
      }
      if (!b.trigger?.kind || !TRIGGERS.has(b.trigger.kind)) errors.push(`${p}: bad trigger`);
      if (b.trigger?.kind === 'hitCount' && typeof b.trigger.count !== 'number') errors.push(`${p}: hitCount needs count`);
      if (!b.target?.kind || !TARGETS.has(b.target.kind)) errors.push(`${p}: bad target`);
      if (b.formation && !['noB1', 'hasB1'].includes(b.formation)) errors.push(`${p}: bad formation`);
      if (!Array.isArray(b.effects) || !b.effects.length) errors.push(`${p}: needs effects[]`);
      else b.effects.forEach((e: any, ei: number) => checkEffect(e, `${p}.effects[${ei}]`, errors));
    });
  }
  if (!(override as any).note) errors.push('missing top-level "note" documenting modeling decisions');

  if (errors.length) {
    console.log(`✗ ${slug}: structural errors`);
    errors.forEach((e) => console.log(`   - ${e}`));
    return false;
  }

  const resolved = resolveSkills(c, override);
  // smoke sim: put the unit in a standard comp by burst type
  const teamsByBurst: Record<string, string[]> = {
    I: [slug, 'crown', 'naga', 'modernia', 'alice'],
    II: ['liter', slug, 'naga', 'modernia', 'alice'],
    III: ['liter', 'crown', 'naga', slug, 'alice'],
    'Λ': [slug, 'crown', 'naga', 'modernia', 'alice'],
  };
  const slugs = teamsByBurst[c.burst] ?? teamsByBurst.III;
  const chars = slugs.map((s) => data.characters[s] as any);
  const cfg: SimConfig = {
    slugs, bossElement: null, bossDef: 0, level: 400, copies: 3,
    doll: false, ol: 0, coreHitRate: 0, rangeBonus: true, durationSec: 180,
  };
  const prepared = chars.map((ch) => ({
    skills: resolveSkills(ch, loadOverride(ch.slug)),
    extraStats: [], loadout: [],
  }));
  try {
    const r = runSim(chars, mult, cfg, prepared);
    const u = r.units[slugs.indexOf(slug)];
    const flags: string[] = [];
    if (u.totalDamage <= 0 && c.class === 'Attacker') flags.push('zero damage for an Attacker');
    if (u.share > 0.9) flags.push(`suspicious ${(u.share * 100).toFixed(0)}% team share`);
    console.log(
      `✓ ${slug}: valid | dmg ${(u.totalDamage / 1e6).toFixed(1)}M (${(u.share * 100).toFixed(1)}%) bursts ${u.burstCasts} | remaining warnings: ${resolved.warnings.length}${flags.length ? ' | FLAGS: ' + flags.join('; ') : ''}`
    );
    resolved.warnings.forEach((w) => console.log(`   ! ${w}`));
    return flags.length === 0;
  } catch (e) {
    console.log(`✗ ${slug}: sim crashed — ${(e as Error).message}`);
    return false;
  }
}

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('usage: npx tsx scripts/validate-overrides.ts <slug> [slug...]');
  process.exit(1);
}
let ok = true;
for (const s of slugs) ok = validate(s) && ok;
process.exit(ok ? 0 : 1);
