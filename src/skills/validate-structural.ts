// validate-structural.ts — the PURE structural half of override validation.
//
// Extracted from scripts/validate-overrides.ts (faithfulness pass 2026-08-10, audit F2.4) so the
// authoring rules are importable and testable: `validate()` there loads from disk and runs a
// smoke sim, which made its structural rules untestable — a test must never write to
// src/skills/overrides/. Everything here is a pure function of (slug, override JSON, context);
// scripts/validate-overrides.ts remains the disk-loading, sim-running CLI wrapper.
//
// Two result channels, matching the wrapper's long-standing split:
//   errors   — authoring mistakes; the file should not ship. Fails validation.
//   warnings — the JSON is valid and the engine accepts it, but the line will not reach the
//              damage model (documented engine gaps, rot-prone citations). Never fails.

export const STATS = new Set([
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
  'burstSkillSingleDamagePct',
  'burstSkillAoeDamagePct',
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
export const TRIGGERS = new Set([
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
export const TARGETS = new Set([
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
export const EFFECTS = new Set([
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
export const FLAVORS = new Set([
  'distributed',
  'sustained',
  'sequential',
  'true',
  'projectileAttachment',
  'projectileExplosion',
]);
// the facets sim.ts's teamHasMatch actually reads — keep in lockstep with
// Block['teamHas'] in src/skills/types.ts
export const TEAM_HAS_FACETS = new Set([
  'element',
  'class',
  'weapon',
  'burst',
  'slugs',
  'sameSquad',
]);

// The ONLY stats an `enemy`-targeted buff can deliver. sim.ts applyEffect's `case 'buff'` tests
// `block.target.kind === 'enemy'` first and forwards to `enemyBuffs` only for these two, at a
// POSITIVE value; every other stat aimed at the enemy falls out of the switch and is discarded
// with no diagnostic. Keep in sync with src/engine/sim.ts (~L2287).
export const ENEMY_BUFF_STATS = new Set([
  'damageTakenPct',
  'distributedDamagePct',
]);

// Block fields the chargeCounter dispatch still IGNORES: the runtime abort-gates are honored
// there since 2026-08-10 (sim.ts blockGatesPass — the audit-F2.1 fix), but the dispatch applies
// ONE phase effect per activation rather than routing through applyBlock, so the everyN
// activation counter and the block-level delaySec remain silently skipped on this trigger. No
// override combines them today (verified roster-wide 2026-08-10), so authoring the combination
// is an ERROR until the engine supports it: the alternative is a field that looks live in the
// JSON and never runs.
export const CHARGE_COUNTER_BYPASSED = [
  'everyN',
  'everyNOffset',
  'delaySec',
] as const;

// Stat clamps are fixed-at values; rampSec would scale the clamp and is not implemented.
const CLAMP_STATS = new Set([
  'reloadSpeedClamp',
  'reloadTimeClamp',
  'chargeTimeClamp',
]);

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

export interface StructuralResult {
  errors: string[];
  warnings: string[];
}

export interface StructuralContext {
  /** every valid character slug (data/characters.json keys) — for teamHas.slugs checks */
  characterSlugs: Set<string>;
  /** curated squad lookup (src/data/squads.ts squadOf) — for teamHas.sameSquad checks */
  squadOf: (slug: string) => string | null | undefined;
}

// Every effect kind in a block, including kinds nested inside `escalating.steps` — the engine
// dispatches those through the same applyEffect, so block-level authoring rules must see them too.
export function collectEffectKinds(
  effects: unknown,
  out = new Set<string>()
): Set<string> {
  if (!Array.isArray(effects)) {
    return out;
  }
  for (const e of effects) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    out.add((e as any).kind);
    if ((e as any).kind === 'escalating') {
      collectEffectKinds((e as any).steps, out);
    }
  }
  return out;
}

// Every effect of one kind in a block, including effects nested inside `escalating.steps` —
// same reason as collectEffectKinds: the engine runs those steps through the same applyEffect.
export function collectEffects(
  effects: unknown,
  kind: string,
  out: any[] = []
): any[] {
  if (!Array.isArray(effects)) {
    return out;
  }
  for (const e of effects) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    if ((e as any).kind === kind) {
      out.push(e);
    }
    if ((e as any).kind === 'escalating') {
      collectEffects((e as any).steps, kind, out);
    }
  }
  return out;
}

function checkEffect(e: any, path: string, errors: string[]) {
  if (e.kind === 'ignored' || e.kind === 'unsupported') {
    // offline-parser-only kinds — the engine has no branch for them; the kit
    // text belongs verbatim in the override's `unmodeled` field instead
    errors.push(
      `${path}: "${e.kind}" is not valid in an override — move the line to the "unmodeled" field`
    );
    return;
  }
  if (!EFFECTS.has(e.kind)) {
    errors.push(`${path}: unknown effect kind "${e.kind}"`);
    return;
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

// Prose fields are CURRENT-STATE doc surface (CLAUDE.md doc taxonomy). A bare `<file>.ts:<line>`
// citation in them rots silently as the cited file is edited — the cross-family review of the
// 2026-08-09 batch caught one pointing at an unrelated code path. Convention: name the code
// block ("the charge-frames clamp in sim.ts"), never the line number.
const LINE_CITATION = /[a-zA-Z0-9_-]+\.ts:\d+/g;

function proseCitationWarnings(override: any, warnings: string[]) {
  const fields: Array<[string, unknown]> = [
    ['note', override.note],
    ...(Array.isArray(override.caveats)
      ? override.caveats.map(
          (c: unknown, i: number) => [`caveats[${i}]`, c] as [string, unknown]
        )
      : []),
  ];
  for (const slot of SLOTS) {
    const arr = override.unmodeled?.[slot];
    if (Array.isArray(arr)) {
      arr.forEach((l: unknown, i: number) =>
        fields.push([`unmodeled.${slot}[${i}]`, l])
      );
    }
  }
  for (const [where, text] of fields) {
    if (typeof text !== 'string') {
      continue;
    }
    const hits = text.match(LINE_CITATION);
    if (hits) {
      warnings.push(
        `${where}: bare line-number citation${hits.length > 1 ? 's' : ''} (${[...new Set(hits)].join(', ')}) — line numbers rot silently; name the code block instead ("the charge-frames clamp in sim.ts")`
      );
    }
  }
}

/** The full structural check for ONE override file. Pure: no disk, no sim. */
export function structuralCheck(
  slug: string,
  override: any,
  ctx: StructuralContext
): StructuralResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const slot of SLOTS) {
    const blocks = override[slot];
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
      if (b.mode && !override.modes?.includes(b.mode)) {
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
      // sim.ts dispatches chargeCounter activations straight to applyEffect — never through
      // applyBlock — so every runtime gate, everyN, and the block delaySec are silently
      // ignored on this trigger. Error (not warning): the combination has no carrier and
      // authoring one would ship a gate that looks live and never runs. If the engine ever
      // routes chargeCounter through applyBlock, drop this rule in the same change.
      if (b.trigger?.kind === 'chargeCounter') {
        const bypassed = CHARGE_COUNTER_BYPASSED.filter(
          (g) => b[g] !== undefined
        );
        if (bypassed.length) {
          errors.push(
            `${p}: chargeCounter dispatch bypasses applyBlock — ${bypassed.join(', ')} would be silently IGNORED on this trigger (engine gap, faithfulness audit F2.1); restructure or wait for the engine fix`
          );
        }
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
            if (!ctx.characterSlugs.has(s)) {
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
        if (!ctx.squadOf(slug)) {
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
        for (const e of collectEffects(b.effects, 'buff')) {
          if (!ENEMY_BUFF_STATS.has(e.stat)) {
            warnings.push(
              `${p}: enemy-targeted buff "${e.stat}" is DROPPED by the engine (only ${[...ENEMY_BUFF_STATS].join(' / ')} reach enemyBuffs) — the line is inert; record it in "unmodeled" if that is intended`
            );
          } else if (typeof e.value === 'number' && e.value <= 0) {
            warnings.push(
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
      // `burstDesc` scopes a hit for the Burst-Skill-Damage amps ("Affects 1 enemy unit(s)" /
      // "Affects all enemies" in the amplified skill's own description). The amps amplify
      // "Burst Skill damage", so the tag is only meaningful on burst-slot damage — authored
      // anywhere else it would silently do nothing (the engine reads it off burst instances).
      for (const e of collectEffects(b.effects, 'flatDamage')) {
        if (e.burstDesc !== undefined) {
          if (!['singleEnemy', 'allEnemies'].includes(e.burstDesc)) {
            errors.push(
              `${p}: burstDesc must be 'singleEnemy' or 'allEnemies', got "${e.burstDesc}"`
            );
          }
          if (slot !== 'burst') {
            errors.push(
              `${p}: burstDesc tags Burst Skill damage — it belongs on a burst-slot block, not ${slot}`
            );
          }
        }
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
  if (!override.note) {
    errors.push('missing top-level "note" documenting modeling decisions');
  }

  // `unmodeled` is the auditable record of kit text NOT represented in blocks
  const un = override.unmodeled;
  if (!un || typeof un !== 'object' || Array.isArray(un)) {
    errors.push(
      'missing "unmodeled" — { skill1: [], skill2: [], burst: [] } with verbatim un-modeled kit-text lines (empty arrays OK)'
    );
  } else {
    for (const slot of SLOTS) {
      const arr = un[slot];
      if (
        !Array.isArray(arr) ||
        arr.some((l: any) => typeof l !== 'string' || !l.trim())
      ) {
        errors.push(`unmodeled.${slot}: must be an array of non-empty strings`);
      }
    }
    for (const k of Object.keys(un)) {
      if (!SLOTS.includes(k as any)) {
        errors.push(`unmodeled.${k}: unknown key`);
      }
    }
  }
  const caveats = override.caveats;
  if (
    caveats !== undefined &&
    (!Array.isArray(caveats) ||
      caveats.some((l: any) => typeof l !== 'string' || !l.trim()))
  ) {
    errors.push('caveats: must be an array of non-empty strings');
  }
  const kitDescription = override.kitDescription;
  if (
    kitDescription !== undefined &&
    (typeof kitDescription !== 'string' || !kitDescription.trim())
  ) {
    errors.push('kitDescription: must be a non-empty string');
  }

  // Same-unit status producer + consumer: the gate reads at trigger time, the effect writes at
  // apply time, and both can fire on the same frame — so the ARRAY ORDER of the two blocks is
  // load-bearing (phantom relies on gate-before-inflict so the first application misses;
  // d-killer-wife on inflict-before-gate so hers doesn't). Nothing else records that, so flag it
  // for the next editor rather than let a well-meaning reorder silently flip the unit's behavior.
  const produced = new Map<string, string>(); // name -> first producing path
  const consumed = new Map<string, string>(); // name -> first consuming path
  for (const slot of SLOTS) {
    const blocks = override[slot];
    if (!Array.isArray(blocks)) {
      continue;
    }
    blocks.forEach((b: any, bi: number) => {
      for (const e of collectEffects(b?.effects, 'targetStatus')) {
        if (typeof e.name === 'string' && !produced.has(e.name)) {
          produced.set(e.name, `${slot}[${bi}]`);
        }
      }
      if (
        typeof b?.requiresTargetStatus === 'string' &&
        !consumed.has(b.requiresTargetStatus)
      ) {
        consumed.set(b.requiresTargetStatus, `${slot}[${bi}]`);
      }
    });
  }
  for (const [name, prodPath] of produced) {
    const consPath = consumed.get(name);
    if (consPath) {
      warnings.push(
        `status "${name}": produced (${prodPath}) AND consumed (${consPath}) by this unit — same-frame ORDER of these blocks is load-bearing (gate reads at trigger, effect writes at apply); do not reorder without re-verifying the unit's first-application behavior`
      );
    }
  }

  proseCitationWarnings(override, warnings);

  return { errors, warnings };
}

/**
 * Cross-slug targetStatus census: every `requiresTargetStatus` consumer matched against every
 * `targetStatus` producer across the whole override set. Matching in the engine is EXACT and
 * case/whitespace-sensitive, so:
 *   - a consumer whose name matches a producer only after case/trim normalization is an ERROR
 *     (a typo — the gate looks wired and never opens);
 *   - a consumer with no producer anywhere is a WARNING, not an error: a deliberately
 *     future-gated consumer stays authorable (rei-ayanami-tentative-name's 'Anti A.T. Field'
 *     waits on an Eva-team applier by design).
 */
export function targetStatusCensus(
  overrides: Map<string, any>
): StructuralResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const producers = new Map<string, string[]>(); // exact name -> producing slugs
  const consumers = new Map<string, string[]>(); // exact name -> consuming slugs

  for (const [slug, o] of overrides) {
    for (const slot of SLOTS) {
      const blocks = o?.[slot];
      if (!Array.isArray(blocks)) {
        continue;
      }
      for (const b of blocks) {
        for (const e of collectEffects(b?.effects, 'targetStatus')) {
          if (typeof e.name === 'string') {
            producers.set(e.name, [...(producers.get(e.name) ?? []), slug]);
          }
        }
        if (typeof b?.requiresTargetStatus === 'string') {
          consumers.set(b.requiresTargetStatus, [
            ...(consumers.get(b.requiresTargetStatus) ?? []),
            slug,
          ]);
        }
      }
    }
  }

  const norm = (s: string) => s.trim().toLowerCase();
  const producersNorm = new Map<string, string>(); // normalized -> exact
  for (const name of producers.keys()) {
    producersNorm.set(norm(name), name);
  }

  for (const [name, slugs] of consumers) {
    if (producers.has(name)) {
      continue;
    }
    const near = producersNorm.get(norm(name));
    if (near) {
      errors.push(
        `requiresTargetStatus "${name}" (${[...new Set(slugs)].join(', ')}) has NO exact producer but nearly matches "${near}" (${[...new Set(producers.get(near)!)].join(', ')}) — matching is exact and case/whitespace-sensitive, so this gate NEVER opens; fix the name`
      );
    } else {
      warnings.push(
        `requiresTargetStatus "${name}" (${[...new Set(slugs)].join(', ')}) has no producer in any override — the gate never opens; fine ONLY if deliberately future-gated (record that in the unit's note)`
      );
    }
  }

  return { errors, warnings };
}
