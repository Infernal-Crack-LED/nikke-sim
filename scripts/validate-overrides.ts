// Validate override files:
//   npx tsx scripts/validate-overrides.ts <slug> [slug...]
// 1. structural check against the effect schema (kinds / stats / triggers / targets)
// 2. resolveSkills with the override — reports remaining warnings
// 3. smoke sim: unit in a standard team; flags crashes, zero damage, absurd shares
import { readFileSync } from 'node:fs';
import { squadOf } from '../src/data/squads.js';
import { runSim } from '../src/engine/sim.js';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { DataFile, LevelMultiplier, SimConfig } from '../src/types.js';

const STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'casterMaxHpPct',
  'targetMaxHpPct',
  'atkOfMaxHpPct',
  'atkOfCasterMaxHpPct',
  'highestAllyMaxHpPct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeSpeedPct',
  'attackDamagePct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'partsDamagePct',
  'pierceDamagePct',
  'damageTakenPct',
  'maxAmmoPct',
  'maxAmmoFlat',
  'reloadSpeedPct',
  'reloadSpeedClamp',
  'reloadTimeClamp',
  'attackSpeedPct',
  'fireRatePct',
  'chargeTimeClamp',
  'skillCooldownReductionSec',
  'extraHitDamagePct',
  'trueDamagePct',
  'projectileExplosionPct',
  'elemAdvantageDamagePct',
  'distributedDamagePct',
  'projectileAttachmentPct',
  'chargeDamageMultPct',
  'normalAttackPct',
  'pelletCountFlat',
  'burstGenPct',
  'hitRatePct',
  'defPct',
]);
const TRIGGERS = new Set([
  'passive',
  'battleStart',
  'attacked',
  'burstCast',
  'fullBurstEnter',
  'fullBurstEnd',
  'hitCount',
  'teamAmmo',
  'shotFired',
  'lastBullet',
  'recovery',
  'shielded',
  'stageEnter',
  'bossElement',
  'chargeCounter',
  'interval',
]);
const TARGETS = new Set([
  'self',
  'allies',
  'enemy',
  'burstCasters',
  'nonBurstCasters',
  'alliesTopAtk',
  'alliesLowestAtk',
  'alliesOfElement',
  'alliesOfClass',
  'alliesOfWeapon',
  'alliesOfElementWeapon',
  'selfAndAdjacent',
  'alliesLowestHp',
]);
const EFFECTS = new Set([
  'buff',
  'flatDamage',
  'hitRepeat',
  'dot',
  'weaponSwap',
  'fillGauge',
  'heal',
  'shield',
  'burstEligibility',
  'burstFirst',
  'reenterStage',
  'advantageVs',
  'burstCdr',
  'escalating',
  'fullBurstExtend',
  'unlimitedAmmo',
  'instantReload',
  'consumeAmmo',
  'storedHit',
  'stun',
  'stackedNuke',
  'gainPierce',
  'addStack',
  'resource',
  'targetStatus',
]);
const FLAVORS = new Set([
  'distributed',
  'sustained',
  'sequential',
  'true',
  'projectileAttachment',
  'projectileExplosion',
]);
// the facets sim.ts's teamHasMatch actually reads — keep in lockstep with
// Block['teamHas'] in src/skills/types.ts
const TEAM_HAS_FACETS = new Set([
  'element',
  'class',
  'weapon',
  'burst',
  'slugs',
  'sameSquad',
]);

const data: DataFile = JSON.parse(
  readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
);
const mult: LevelMultiplier = JSON.parse(
  readFileSync(
    new URL('../data/level-multiplier.json', import.meta.url),
    'utf8'
  )
);

// Every effect kind in a block, including kinds nested inside `escalating.steps` — the engine
// dispatches those through the same applyEffect, so block-level authoring rules must see them too.
function collectEffectKinds(
  effects: any,
  out = new Set<string>()
): Set<string> {
  if (!Array.isArray(effects)) {
    return out;
  }
  for (const e of effects) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    out.add(e.kind);
    if (e.kind === 'escalating') {
      collectEffectKinds(e.steps, out);
    }
  }
  return out;
}

// The ONLY stats an `enemy`-targeted buff can deliver. sim.ts applyEffect's `case 'buff'` tests
// `block.target.kind === 'enemy'` first and forwards to `enemyBuffs` only for these two, at a
// POSITIVE value; every other stat aimed at the enemy falls out of the switch and is discarded
// with no diagnostic. Keep in sync with src/engine/sim.ts (~L2287).
const ENEMY_BUFF_STATS = new Set(['damageTakenPct', 'distributedDamagePct']);

// Every `buff` effect in a block, including buffs nested inside `escalating.steps` — same reason
// as collectEffectKinds: the engine runs those steps through the same applyEffect.
function collectBuffEffects(effects: any, out: any[] = []): any[] {
  if (!Array.isArray(effects)) {
    return out;
  }
  for (const e of effects) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    if (e.kind === 'buff') {
      out.push(e);
    }
    if (e.kind === 'escalating') {
      collectBuffEffects(e.steps, out);
    }
  }
  return out;
}

function checkEffect(e: any, path: string, errors: string[]) {
  if (e.kind === 'ignored' || e.kind === 'unsupported') {
    // offline-parser-only kinds — the engine has no branch for them; the kit
    // text belongs verbatim in the override's `unmodeled` field instead
    return errors.push(
      `${path}: "${e.kind}" is not valid in an override — move the line to the "unmodeled" field`
    );
  }
  if (!EFFECTS.has(e.kind)) {
    return errors.push(`${path}: unknown effect kind "${e.kind}"`);
  }
  if (e.kind === 'buff') {
    if (!STATS.has(e.stat)) {
      errors.push(`${path}: unknown stat "${e.stat}"`);
    }
    if (typeof e.value !== 'number') {
      errors.push(`${path}: buff needs numeric value`);
    }
    // "for N round(s)" — a whole positive number of the holder's own rounds
    if (
      e.durationShots !== undefined &&
      !(Number.isInteger(e.durationShots) && e.durationShots > 0)
    ) {
      errors.push(
        `${path}: durationShots must be a positive integer (rounds fired), got ${e.durationShots}`
      );
    }
    if (
      e.noRetriggerWhileActive !== undefined &&
      typeof e.noRetriggerWhileActive !== 'boolean'
    ) {
      errors.push(`${path}: noRetriggerWhileActive must be a boolean`);
    }
    // Stat clamps are fixed-at values; rampSec would scale the clamp and is not implemented.
    const CLAMP_STATS = new Set([
      'reloadSpeedClamp',
      'reloadTimeClamp',
      'chargeTimeClamp',
    ]);
    if (CLAMP_STATS.has(e.stat) && e.rampSec !== undefined) {
      errors.push(
        `${path}: clamp stat "${e.stat}" does not support rampSec (not implemented in engine clamp())`
      );
    }
  }
  if (e.kind === 'flatDamage') {
    if (typeof e.atkPct !== 'number') {
      errors.push(`${path}: flatDamage needs atkPct`);
    }
    if (e.flavor && !FLAVORS.has(e.flavor)) {
      errors.push(`${path}: unknown flavor "${e.flavor}"`);
    }
  }
  if (e.kind === 'hitRepeat') {
    // `pct` is a share of the PARENT HIT's damage, not a % of ATK — a positive number, and
    // never a `flatDamage`-style atkPct that wandered onto the wrong effect kind.
    if (typeof e.pct !== 'number' || !(e.pct > 0)) {
      errors.push(
        `${path}: hitRepeat needs pct > 0 (% of the parent hit's damage)`
      );
    }
    if ('atkPct' in e) {
      errors.push(
        `${path}: hitRepeat has no atkPct — it scales off the parent hit's damage, not off final ATK (use flatDamage for a %-of-ATK rider)`
      );
    }
  }
  if (
    e.kind === 'dot' &&
    (typeof e.atkPct !== 'number' || typeof e.durationSec !== 'number')
  ) {
    errors.push(`${path}: dot needs atkPct + durationSec`);
  }
  if (e.kind === 'weaponSwap' && typeof e.damagePct !== 'number') {
    errors.push(`${path}: weaponSwap needs damagePct`);
  }
  if (e.kind === 'storedHit') {
    if (typeof e.atkPct !== 'number') {
      errors.push(`${path}: storedHit needs atkPct`);
    }
    if (e.flavor && !FLAVORS.has(e.flavor)) {
      errors.push(`${path}: unknown flavor "${e.flavor}"`);
    }
  }
  // `noFb` is INERT under the shipped FBRULE default ('timing', 2026-07-23): Full Burst is a timing
  // gate, so a non-burst-cast rider/DoT landing inside the window always takes the +50%. Reject the
  // field rather than ignore it — the last six carriers were calibration relics, and a silently-dead
  // flag is exactly how one creeps back. If a kit genuinely must suppress FB, that is a mechanism
  // finding for open-questions U14, not an override flag.
  if (e && typeof e === 'object' && 'noFb' in e) {
    errors.push(
      `${path}: "noFb" is inert under the shipped FBRULE=timing default — remove it; Full Burst applies by landing time (open-questions U14)`
    );
  }
  if (e.kind === 'targetStatus') {
    if (typeof e.name !== 'string' || !e.name.trim()) {
      errors.push(
        `${path}: targetStatus needs a non-empty "name" (the kit's status name)`
      );
    }
    if (typeof e.durationSec !== 'number' || !(e.durationSec > 0)) {
      errors.push(`${path}: targetStatus needs durationSec > 0`);
    }
  }
  if (e.kind === 'escalating') {
    if (!Array.isArray(e.steps)) {
      errors.push(`${path}: escalating needs steps[]`);
    } else {
      e.steps.forEach((s: any, i: number) =>
        checkEffect(s, `${path}.steps[${i}]`, errors)
      );
    }
  }
}

function validate(slug: string): boolean {
  const c: any = data.characters[slug];
  if (!c) {
    console.log(
      `- ${slug}: not in roster (Bossing C-or-below prune) — override kept on disk, skipped`
    );
    return true;
  }
  const override = loadOverride(slug);
  if (!override) {
    console.log(`✗ ${slug}: no override file`);
    return false;
  }

  const errors: string[] = [];
  // Non-fatal authoring notes: the line IS valid JSON and the engine accepts the file, but the
  // effect will not reach the damage model. Kept out of `errors` on purpose — the carriers are
  // game-real kit lines whose drop is a documented engine gap, not an authoring mistake, so
  // failing them would turn verify.sh red on correct data.
  const authoringWarnings: string[] = [];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const blocks = (override as any)[slot];
    if (blocks === undefined) {
      // overrides are the COMPLETE skill description — the engine never parses
      // prose, so a missing slot means missing kit, not "parser fills it in"
      errors.push(
        `${slot}: missing — overrides must define all three slots (empty array OK; run scripts/materialize-overrides.ts)`
      );
      continue;
    }
    if (!Array.isArray(blocks)) {
      errors.push(`${slot}: must be an array of blocks`);
      continue;
    }
    blocks.forEach((b: any, bi: number) => {
      const p = `${slot}[${bi}]`;
      if (b.mode && !(override as any).modes?.includes(b.mode)) {
        errors.push(`${p}: mode "${b.mode}" not declared in top-level modes[]`);
      }
      if (!b.trigger?.kind || !TRIGGERS.has(b.trigger.kind)) {
        errors.push(`${p}: bad trigger`);
      }
      if (
        b.trigger?.kind === 'hitCount' &&
        typeof b.trigger.count !== 'number'
      ) {
        errors.push(`${p}: hitCount needs count`);
      }
      if (
        b.trigger?.kind === 'hitCount' &&
        b.trigger.perPull != null &&
        typeof b.trigger.perPull !== 'boolean'
      ) {
        errors.push(`${p}: hitCount perPull must be a boolean`);
      }
      if (
        b.trigger?.kind === 'attacked' &&
        !(typeof b.trigger.count === 'number' && b.trigger.count > 0)
      ) {
        errors.push(`${p}: attacked needs count > 0`);
      }
      if (
        b.trigger?.kind === 'interval' &&
        !(typeof b.trigger.sec === 'number' && b.trigger.sec > 0)
      ) {
        errors.push(`${p}: interval needs sec > 0`);
      }
      if (!b.target?.kind || !TARGETS.has(b.target.kind)) {
        errors.push(`${p}: bad target`);
      }
      if (b.formation && !['noB1', 'hasB1'].includes(b.formation)) {
        errors.push(`${p}: bad formation`);
      }
      // Block.delaySec: "the block's effects apply delaySec seconds after its trigger fires".
      // A non-number is silently falsy in sim.ts (the block would apply inline), and a negative
      // would schedule into the past — both are dead authoring that looks live in the JSON.
      if (
        b.delaySec !== undefined &&
        !(typeof b.delaySec === 'number' && b.delaySec > 0)
      ) {
        errors.push(
          `${p}: delaySec must be a number > 0 (omit it for an inline block)`
        );
      }
      // Every facet inside `teamHas` is optional and omitting one leaves it
      // unconstrained, so a MISSPELLED facet key is invisible: the engine's
      // teamHasMatch (sim.ts) reads only the keys it knows, ignores the rest, and
      // the gate silently matches any team — which is exactly the dead-authoring
      // failure the sameSquad checks below exist to prevent. Allowlist the keys.
      if (b.teamHas !== undefined) {
        if (
          typeof b.teamHas !== 'object' ||
          b.teamHas === null ||
          Array.isArray(b.teamHas)
        ) {
          errors.push(`${p}: teamHas must be an object of facets`);
        } else {
          for (const k of Object.keys(b.teamHas)) {
            if (!TEAM_HAS_FACETS.has(k)) {
              errors.push(
                `${p}: unknown teamHas facet "${k}" (allowed: ${[...TEAM_HAS_FACETS].join(', ')}) — an unrecognised facet is IGNORED by the engine, leaving the block always-active`
              );
            }
          }
          // an all-empty gate matches any team of 2+ — the same always-active
          // block, reached by writing the gate and constraining nothing
          if (Object.keys(b.teamHas).length === 0) {
            errors.push(
              `${p}: teamHas is empty — it constrains nothing and the block is always active; omit it`
            );
          }
        }
      }
      if (b.teamHas?.slugs !== undefined) {
        if (
          !Array.isArray(b.teamHas.slugs) ||
          b.teamHas.slugs.length === 0 ||
          b.teamHas.slugs.some((s: unknown) => typeof s !== 'string')
        ) {
          errors.push(`${p}: teamHas.slugs must be a non-empty array of slugs`);
        } else {
          for (const s of b.teamHas.slugs) {
            if (!data.characters[s]) {
              errors.push(
                `${p}: teamHas.slugs "${s}" is not a character slug — the gate can never open`
              );
            }
          }
        }
      }
      // `teamHas.sameSquad` resolves the owner's squad from the curated map
      // (src/data/squads.ts) — an unmapped owner fails closed (the gate can
      // never open), so reject the authoring instead of shipping a dead block
      if (b.teamHas?.sameSquad !== undefined) {
        if (b.teamHas.sameSquad !== true) {
          errors.push(
            `${p}: teamHas.sameSquad must be true (omit it for no gate)`
          );
        }
        if (!squadOf(slug)) {
          errors.push(
            `${p}: teamHas.sameSquad but "${slug}" has no curated squad — add its membership to src/data/squads.ts`
          );
        }
      }
      // `targetStatus` lands on the BOSS and the engine ignores block.target (there is no enemy
      // entity — see sim.ts). Require the authoring block to say so explicitly, so a real carrier
      // can never silently look owner- or ally-scoped. Collected RECURSIVELY: the engine runs
      // `escalating` steps through the same applyEffect, so a targetStatus nested in a step would
      // otherwise work at runtime while dodging this rule.
      if (
        collectEffectKinds(b.effects).has('targetStatus') &&
        b.target?.kind !== 'enemy'
      ) {
        errors.push(
          `${p}: a targetStatus effect must sit on a block with target "enemy" (the status is inflicted on the boss)`
        );
      }
      // An `enemy`-targeted buff reaches the damage model ONLY as a positive damageTakenPct or
      // distributedDamagePct (ENEMY_BUFF_STATS). Anything else — an enemy DEF ▼/ATK ▼, or either
      // allowed stat authored with a negative value — is dropped at dispatch with no diagnostic,
      // so the JSON reads as a live debuff while contributing nothing. That drop is deliberate on
      // the scope-lock basis (bossDef = 0; see scripts/battery/boss-def.ts), but the web app runs
      // the same engine at the Solo/Union Raid DEF defaults (30,930 / 12,200 — web/src/App.tsx),
      // where a dropped DEF ▼ is worth several percent. Warn, don't fail: the carrier line is
      // real kit, and the fix is an engine change, not an authoring one.
      if (b.target?.kind === 'enemy') {
        for (const e of collectBuffEffects(b.effects)) {
          if (!ENEMY_BUFF_STATS.has(e.stat)) {
            authoringWarnings.push(
              `${p}: enemy-targeted buff "${e.stat}" is DROPPED by the engine (only ${[...ENEMY_BUFF_STATS].join(' / ')} reach enemyBuffs) — the line is inert; record it in "unmodeled" if that is intended`
            );
          } else if (typeof e.value === 'number' && e.value <= 0) {
            authoringWarnings.push(
              `${p}: enemy-targeted buff "${e.stat}" has a non-positive value (${e.value}) and is DROPPED by the engine (the dispatch requires value > 0) — the line is inert`
            );
          }
        }
      }
      // `hitRepeat` is a rider on the owner's OWN hit ("X% of the damage dealt by self"). The
      // engine reads the parent instance the weapon path recorded on the SAME frame, so the
      // effect is only expressible on a trigger the engine dispatches from firePull, right
      // after that instance resolves. Authored anywhere else it would silently do nothing
      // (the engine's frame lock declines to ride a stale hit) — reject it at authoring time
      // instead of shipping a dead line. Target is the boss, like every other damage effect.
      // Collected recursively for the same reason as targetStatus above.
      if (collectEffectKinds(b.effects).has('hitRepeat')) {
        const PER_PULL = ['shotFired', 'hitCount', 'chargeCounter'];
        if (!PER_PULL.includes(b.trigger?.kind)) {
          errors.push(
            `${p}: a hitRepeat effect needs a per-pull trigger (${PER_PULL.join(' / ')}) — it rides the parent hit dispatched on the same frame, and would never fire on "${b.trigger?.kind}"`
          );
        }
        if (b.target?.kind !== 'enemy') {
          errors.push(
            `${p}: a hitRepeat effect must sit on a block with target "enemy" (it deals damage to the boss)`
          );
        }
      }
      // gate is a bare status name; a typo'd name would silently never open
      if (
        b.requiresTargetStatus !== undefined &&
        (typeof b.requiresTargetStatus !== 'string' ||
          !b.requiresTargetStatus.trim())
      ) {
        errors.push(
          `${p}: requiresTargetStatus must be a non-empty status name`
        );
      }
      if (!Array.isArray(b.effects) || !b.effects.length) {
        errors.push(`${p}: needs effects[]`);
      } else {
        b.effects.forEach((e: any, ei: number) =>
          checkEffect(e, `${p}.effects[${ei}]`, errors)
        );
      }
    });
  }
  if (!(override as any).note) {
    errors.push('missing top-level "note" documenting modeling decisions');
  }

  // `unmodeled` is the auditable record of kit text NOT represented in blocks
  const un = (override as any).unmodeled;
  if (!un || typeof un !== 'object' || Array.isArray(un)) {
    errors.push(
      'missing "unmodeled" — { skill1: [], skill2: [], burst: [] } with verbatim un-modeled kit-text lines (empty arrays OK)'
    );
  } else {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      const arr = un[slot];
      if (
        !Array.isArray(arr) ||
        arr.some((l: any) => typeof l !== 'string' || !l.trim())
      ) {
        errors.push(`unmodeled.${slot}: must be an array of non-empty strings`);
      }
    }
    for (const k of Object.keys(un)) {
      if (!['skill1', 'skill2', 'burst'].includes(k)) {
        errors.push(`unmodeled.${k}: unknown key`);
      }
    }
  }
  const caveats = (override as any).caveats;
  if (
    caveats !== undefined &&
    (!Array.isArray(caveats) ||
      caveats.some((l: any) => typeof l !== 'string' || !l.trim()))
  ) {
    errors.push('caveats: must be an array of non-empty strings');
  }
  const kitDescription = (override as any).kitDescription;
  if (
    kitDescription !== undefined &&
    (typeof kitDescription !== 'string' || !kitDescription.trim())
  ) {
    errors.push('kitDescription: must be a non-empty string');
  }

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
    Λ: [slug, 'crown', 'naga', 'modernia', 'alice'],
  };
  const slugs = teamsByBurst[c.burst] ?? teamsByBurst.III;
  const chars = slugs.map((s) => data.characters[s] as any);
  const cfg: SimConfig = {
    slugs,
    bossElement: null,
    bossDef: 0,
    level: 400,
    copies: 3,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
  };
  const prepared = chars.map((ch) => ({
    skills: resolveSkills(ch, loadOverride(ch.slug)),
    extraStats: [],
    loadout: [],
  }));
  try {
    const r = runSim(chars, mult, cfg, prepared);
    const u = r.units[slugs.indexOf(slug)];
    const flags: string[] = [];
    if (u.totalDamage <= 0 && c.class === 'Attacker') {
      flags.push('zero damage for an Attacker');
    }
    if (u.share > 0.9) {
      flags.push(`suspicious ${(u.share * 100).toFixed(0)}% team share`);
    }
    console.log(
      `✓ ${slug}: valid | dmg ${(u.totalDamage / 1e6).toFixed(1)}M (${(u.share * 100).toFixed(1)}%) bursts ${u.burstCasts} | remaining warnings: ${resolved.warnings.length + authoringWarnings.length}${flags.length ? ' | FLAGS: ' + flags.join('; ') : ''}`
    );
    resolved.warnings.forEach((w) => console.log(`   ! ${w}`));
    authoringWarnings.forEach((w) => console.log(`   ! ${w}`));
    return flags.length === 0;
  } catch (e) {
    console.log(`✗ ${slug}: sim crashed — ${(e as Error).message}`);
    return false;
  }
}

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error(
    'usage: npx tsx scripts/validate-overrides.ts <slug> [slug...]'
  );
  process.exit(1);
}
let ok = true;
for (const s of slugs) {
  ok = validate(s) && ok;
}
process.exit(ok ? 0 : 1);
