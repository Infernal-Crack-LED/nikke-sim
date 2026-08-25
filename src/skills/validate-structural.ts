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

// charFixes.statImmunities is matched against the stat key that actually LANDS on the unit —
// applyEffect rewrites a few AUTHORED stat names into a different applied key before the buff is
// placed, so naming the authored side would produce an immunity that can never match (a silent
// permanent no-op, with the override note claiming the unit is protected). These five are
// rejected in favour of their post-mapping target.
export const IMMUNITY_ALIAS = new Map<string, string>([
  ['casterMaxHpPct', 'maxHpFlat'],
  ['targetMaxHpPct', 'maxHpFlat'],
  ['highestAllyMaxHpPct', 'maxHpFlat'],
  ['highestAllyAtkPct', 'casterAtkPct'],
  ['atkOfCasterMaxHpPct', 'casterAtkPct'],
]);
/** Stat keys an override may legally list in `charFixes.statImmunities` (post-mapping only). */
export const IMMUNIZABLE_STATS = new Set([
  ...[...STATS].filter((s) => !IMMUNITY_ALIAS.has(s)),
  'maxHpFlat',
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
  'fullCharge',
  'lastBullet',
  'recovery',
  'shielded',
  'stageEnter',
  'stageCast',
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
  'convertExcess',
  'addStack',
  'resource',
  'targetStatus',
  'selfStatus',
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

// The stats an `enemy`-targeted buff can deliver. sim.ts applyEffect's `case 'buff'` tests
// `block.target.kind === 'enemy'` first and forwards to `enemyBuffs` only for: these two at a
// POSITIVE value, plus `defPct` at any NONZERO value (the DEF ▼ channel, 2026-08-10 — scales
// cfg.bossDef; inert on the bossDef = 0 graded basis, live at the web raid defaults). Every
// other stat aimed at the enemy falls out of the switch and is discarded with no diagnostic.
// Keep in sync with the enemy-buff dispatch in src/engine/sim.ts applyEffect.
export const ENEMY_BUFF_STATS = new Set([
  'damageTakenPct',
  'distributedDamagePct',
  'defPct',
]);

// The mirror hazard: a stat the engine reads ONLY off the boss's buff list, aimed at an
// ally-side target — applied and never read. `damageTakenPct` is summed from `enemyBuffs` alone
// (sim.ts:1861), and the SIGN carries opposite meanings on the two sides: positive on the boss
// = boss takes more, while the kit clauses that target allies are damage-REDUCTION (negative).
// That is the trap worth a diagnostic — a later session "correcting" the sign or the target
// turns a defensive line into a damage multiplier.
//
// Two stats are deliberately EXCLUDED rather than overlooked:
//   - `distributedDamagePct` is read off the boss (1864, shared-taken debuff) AND off the unit
//     (1868, the carrier's own distributed boost), so an ally-targeted one is LIVE.
//   - `defPct` is boss-only for damage (1666, the DEF shave), but 28 overrides carry ordinary
//     ally-side DEF ▲ kit lines. They are inert for damage too, yet they carry no sign-inversion
//     hazard and the sim models no ally DEF at all — warning on them would bury the 3 real
//     mismatches in 28 lines of noise. Verified roster-wide 2026-08-10.
// Warn, don't fail: the carriers are real kit lines kept for fidelity. Keep in sync with 1861.
export const BOSS_ONLY_BUFF_STATS = new Set(['damageTakenPct']);

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
  /**
   * This unit's blablalink per-level arrays (data/skill-levels.json entry) — validates that every
   * `levelScale` anchor really exists in the slot's table. An anchor that does not resolve makes
   * the scaler fall back to the max-level value, which is exactly the silent bug `levelScale`
   * exists to fix, so it is an ERROR here rather than a runtime warning nobody reads. Omitted for
   * a unit with no level data (the scaler already warns wholesale in that case).
   */
  levelArrays?: { skill1: number[][]; skill2: number[][]; burst: number[][] };
}

// The kind -> scalable-fields table is OWNED BY scale.ts and imported, never mirrored here: a
// hand-kept copy is the staleness class that already bit this feature once (the census's private
// copy went stale within one session and reported fixed values as still broken).
import { SCALABLE_FIELDS } from './scale.js';

/** Read `e.perResource.mult` style dotted field paths as well as plain keys. */
function fieldValue(e: any, field: string): unknown {
  return field.split('.').reduce((o, k) => (o == null ? o : o[k]), e);
}

/**
 * Every `levelScale` anchor must be findable at index 9 of some array in that slot's table, and
 * every annotated field must be one the scaler actually reads. `levelConst` entries are checked
 * the same way — a typo'd field silently leaves the intended one warning forever.
 */
function checkLevelScale(
  e: any,
  p: string,
  slot: (typeof SLOTS)[number],
  errors: string[],
  ctx: StructuralContext
): void {
  if (e?.kind === 'escalating' && Array.isArray(e.steps)) {
    e.steps.forEach((s: any, i: number) =>
      checkLevelScale(s, `${p}.steps[${i}]`, slot, errors, ctx)
    );
  }
  const scalable = SCALABLE_FIELDS[e?.kind] ?? [];

  const lc = e?.levelConst;
  if (lc !== undefined) {
    if (!Array.isArray(lc) || lc.some((f: unknown) => typeof f !== 'string')) {
      errors.push(`${p}.levelConst: must be an array of field-name strings`);
    } else {
      for (const field of lc as string[]) {
        if (!scalable.includes(field)) {
          errors.push(
            `${p}.levelConst: "${field}" is not a field the scaler substitutes on a ${e.kind} ` +
              `effect (${scalable.join(', ') || 'none'}) — marking it constant does nothing`
          );
        } else if (typeof fieldValue(e, field) !== 'number') {
          errors.push(
            `${p}.levelConst: no numeric "${field}" on this ${e.kind} effect`
          );
        }
      }
    }
  }

  const ls = e?.levelScale;
  if (ls === undefined) {
    return;
  }
  // typeof null === 'object' and Array.isArray(null) === false, so null MUST be rejected here or
  // Object.entries below throws and takes the whole validation gate down with a stack trace.
  if (ls === null || typeof ls !== 'object' || Array.isArray(ls)) {
    errors.push(
      `${p}.levelScale: must be an object mapping field -> anchor numbers`
    );
    return;
  }
  const arrays = ctx.levelArrays?.[slot];
  for (const [field, anchors] of Object.entries(ls)) {
    if (
      !Array.isArray(anchors) ||
      !anchors.length ||
      anchors.some((a) => typeof a !== 'number')
    ) {
      errors.push(
        `${p}.levelScale.${field}: must be a non-empty array of numbers`
      );
      continue;
    }
    if (!scalable.includes(field)) {
      errors.push(
        `${p}.levelScale.${field}: not a field the scaler substitutes on a ${e.kind} effect ` +
          `(${scalable.join(', ') || 'none'}) — the annotation would never be read`
      );
      continue;
    }
    if (typeof fieldValue(e, field) !== 'number') {
      errors.push(
        `${p}.levelScale.${field}: no numeric "${field}" on this ${e.kind} effect to scale`
      );
      continue;
    }
    if (!arrays) {
      continue;
    } // no level data for this unit — nothing to resolve against
    for (const anchor of anchors as number[]) {
      if (!arrays.some((a) => Math.abs(a[9] - Math.abs(anchor)) < 0.005)) {
        errors.push(
          `${p}.levelScale.${field}: anchor ${anchor} is not a max-level value in the ${slot} ` +
            `level table — it would silently fall back to the max-level value`
        );
      }
    }
  }
}

/**
 * One producer/consumer pair inside a SINGLE slot array, with the relative order the file
 * currently ships. Two families qualify, and both are documented as order-dependent in
 * src/skills/types.ts:
 *   status   — a `targetStatus` effect (producer) vs a `requiresTargetStatus` gate (consumer)
 *   resource — a `resource` delta (producer) vs a `resourceGate` (consumer)
 * In both, the gate is evaluated at TRIGGER time and the effect written at APPLY time, so two
 * blocks firing on the SAME frame resolve by their position in the flat block array
 * (src/skills/index.ts `SLOTS.flatMap`).
 */
export interface BlockOrderPair {
  slot: (typeof SLOTS)[number];
  family: 'status' | 'selfStatus' | 'resource';
  name: string;
  /** index in the slot array of the block that WRITES */
  producer: number;
  /** index in the slot array of the block that READS */
  consumer: number;
  order: 'producer-first' | 'consumer-first' | 'same-block';
}

/**
 * The same-slot half of the block-order census (faithfulness audit F2.5).
 *
 * CROSS-slot pairs are deliberately excluded: their order is fixed by the slot flatten order
 * (skill1 → skill2 → burst) and no edit inside a slot array can change it. Same-slot order is the
 * one an ordinary reorder silently flips — `phantom` depends on gate-before-inflict (her first
 * shot misses Calling Card) and `d-killer-wife` on inflict-before-gate (her burst body branch
 * reads 'Wipe Out' on the frame it lands). Nothing in the engine or the suite noticed a swap
 * before this census: scripts/tests/block-order-guard.test.ts pins its output.
 *
 * `same-block` is the third case: one block both writes and reads the same name (the gate sees
 * the PRE-write pool). Not reorderable today, but recorded so that SPLITTING such a block into
 * two is as loud as reordering them.
 */
export function blockOrderPairs(override: any): BlockOrderPair[] {
  const pairs: BlockOrderPair[] = [];
  for (const slot of SLOTS) {
    const blocks = override?.[slot];
    if (!Array.isArray(blocks)) {
      continue;
    }
    const producers: {
      family: 'status' | 'selfStatus' | 'resource';
      name: string;
      i: number;
    }[] = [];
    const consumers: typeof producers = [];
    blocks.forEach((b: any, i: number) => {
      for (const e of collectEffects(b?.effects, 'targetStatus')) {
        if (typeof e?.name === 'string') {
          producers.push({ family: 'status', name: e.name, i });
        }
      }
      for (const e of collectEffects(b?.effects, 'selfStatus')) {
        if (typeof e?.name === 'string') {
          producers.push({ family: 'selfStatus', name: e.name, i });
        }
      }
      for (const e of collectEffects(b?.effects, 'resource')) {
        if (typeof e?.name === 'string') {
          producers.push({ family: 'resource', name: e.name, i });
        }
      }
      if (typeof b?.requiresTargetStatus === 'string') {
        consumers.push({ family: 'status', name: b.requiresTargetStatus, i });
      }
      if (typeof b?.requiresSelfStatus === 'string') {
        consumers.push({ family: 'selfStatus', name: b.requiresSelfStatus, i });
      }
      if (typeof b?.resourceGate?.name === 'string') {
        consumers.push({ family: 'resource', name: b.resourceGate.name, i });
      }
    });
    for (const c of consumers) {
      for (const p of producers) {
        if (p.family !== c.family || p.name !== c.name) {
          continue;
        }
        pairs.push({
          slot,
          family: c.family,
          name: c.name,
          producer: p.i,
          consumer: c.i,
          order:
            p.i === c.i
              ? 'same-block'
              : p.i < c.i
                ? 'producer-first'
                : 'consumer-first',
        });
      }
    }
  }
  // Deterministic order so the pinned fixture is a function of the override's CONTENT, not of
  // the traversal — otherwise a no-op edit churns the fixture.
  return pairs.sort(
    (a, b) =>
      SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) ||
      a.family.localeCompare(b.family) ||
      a.name.localeCompare(b.name) ||
      a.producer - b.producer ||
      a.consumer - b.consumer
  );
}

/**
 * Roster-wide form of the above: slug -> its same-slot pairs, slugs sorted, units with no pair
 * omitted. This is the shape pinned in scripts/tests/fixtures/block-order-pairs.json; keeping it
 * here (and not in the script) is what lets the test compute the census without executing a CLI.
 */
export function blockOrderCensus(
  overrides: Map<string, any>
): Record<string, BlockOrderPair[]> {
  const out: Record<string, BlockOrderPair[]> = {};
  for (const slug of [...overrides.keys()].sort()) {
    const pairs = blockOrderPairs(overrides.get(slug));
    if (pairs.length) {
      out[slug] = pairs;
    }
  }
  return out;
}

// The in-file signpost half of the same. One warning per (family, name) the unit both writes and
// reads, naming the ORDER SHIPPED so the next editor can see what a reorder would change. Emitted
// for cross-slot pairs too: those cannot be reordered inside a slot array, but MOVING a block
// between slots reorders them, and the reader deserves to know the pair exists.
function blockOrderWarnings(override: any, warnings: string[]) {
  const label = (f: 'status' | 'selfStatus' | 'resource') =>
    f === 'resource'
      ? { noun: 'resource', wrote: 'adjusted', read: 'gated' }
      : f === 'selfStatus'
        ? { noun: 'self-status', wrote: 'produced', read: 'consumed' }
        : { noun: 'status', wrote: 'produced', read: 'consumed' };
  const sites = new Map<
    string,
    {
      family: 'status' | 'selfStatus' | 'resource';
      name: string;
      prod: string[];
      cons: string[];
    }
  >();
  const site = (family: 'status' | 'selfStatus' | 'resource', name: string) => {
    const key = `${family}\x00${name}`;
    let s = sites.get(key);
    if (!s) {
      s = { family, name, prod: [], cons: [] };
      sites.set(key, s);
    }
    return s;
  };
  for (const slot of SLOTS) {
    const blocks = override?.[slot];
    if (!Array.isArray(blocks)) {
      continue;
    }
    blocks.forEach((b: any, bi: number) => {
      for (const e of collectEffects(b?.effects, 'targetStatus')) {
        if (typeof e?.name === 'string') {
          site('status', e.name).prod.push(`${slot}[${bi}]`);
        }
      }
      for (const e of collectEffects(b?.effects, 'selfStatus')) {
        if (typeof e?.name === 'string') {
          site('selfStatus', e.name).prod.push(`${slot}[${bi}]`);
        }
      }
      for (const e of collectEffects(b?.effects, 'resource')) {
        if (typeof e?.name === 'string') {
          site('resource', e.name).prod.push(`${slot}[${bi}]`);
        }
      }
      if (typeof b?.requiresTargetStatus === 'string') {
        site('status', b.requiresTargetStatus).cons.push(`${slot}[${bi}]`);
      }
      if (typeof b?.requiresSelfStatus === 'string') {
        site('selfStatus', b.requiresSelfStatus).cons.push(`${slot}[${bi}]`);
      }
      if (typeof b?.resourceGate?.name === 'string') {
        site('resource', b.resourceGate.name).cons.push(`${slot}[${bi}]`);
      }
    });
  }

  const pairs = blockOrderPairs(override);
  for (const { family, name, prod, cons } of sites.values()) {
    if (!prod.length || !cons.length) {
      continue;
    }
    const { noun, wrote, read } = label(family);
    const mine = pairs.filter((p) => p.family === family && p.name === name);
    // Capped: a pool with several earners and several gates (rouge's coin: 6 pairs) would otherwise
    // bury the warning. The full list is `lint-target-status.ts --block-order`.
    const SHOWN = 4;
    const render = (p: BlockOrderPair) =>
      p.order === 'same-block'
        ? `${p.slot}[${p.producer}] writes AND reads it (the gate sees the pre-write value)`
        : p.order === 'producer-first'
          ? `writes ${p.slot}[${p.producer}] → reads ${p.slot}[${p.consumer}] (the gate opens on the frame it is written)`
          : `reads ${p.slot}[${p.consumer}] → writes ${p.slot}[${p.producer}] (the gate misses that frame)`;
    const detail = mine.length
      ? `${mine.length} same-slot pair(s) whose same-frame ORDER is load-bearing (gate reads at trigger, effect writes at apply): ` +
        mine.slice(0, SHOWN).map(render).join('; ') +
        (mine.length > SHOWN
          ? `; +${mine.length - SHOWN} more (lint-target-status.ts --block-order)`
          : '') +
        `. Do not reorder without re-verifying the unit's first-application behavior — the order is pinned by scripts/tests/fixtures/block-order-pairs.json`
      : `cross-slot only, so the ORDER is fixed by the slot flatten order (skill1 → skill2 → burst) and is load-bearing only if a block moves slots`;
    warnings.push(
      `${noun} "${name}": ${wrote} (${prod.join(', ')}) AND ${read} (${cons.join(', ')}) by this unit — ${detail}`
    );
  }
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

function checkEffect(e: any, path: string, errors: string[], trigger?: string) {
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
  // "for N round(s)" — a whole positive number of the holder's own rounds. Checked for EVERY
  // effect kind that can carry it, not just `buff`: `gainPierce` gained the field 2026-08-11, and
  // scoping the check to buffs left a silent hole — `durationShots: 0` on a gainPierce validated
  // clean and produced a wholly inert effect (no budget, and the permanent fallback suppressed),
  // i.e. a kit line that models nothing while reading as modeled. Unrecognised input must be LOUD.
  if (
    e.durationShots !== undefined &&
    !(Number.isInteger(e.durationShots) && e.durationShots > 0)
  ) {
    errors.push(
      `${path}: durationShots must be a positive integer (rounds fired), got ${e.durationShots}`
    );
  }
  if (e.kind === 'convertExcess') {
    // "Convert excess over X% of A to B ▲ R% of the excess" — every field is load-bearing and a
    // typo in either StatKey would silently convert nothing (or convert the wrong stat).
    for (const k of ['from', 'to'] as const) {
      if (!STATS.has(e[k])) {
        errors.push(`${path}: convertExcess unknown ${k} stat "${e[k]}"`);
      }
    }
    if (typeof e.over !== 'number' || !Number.isFinite(e.over)) {
      errors.push(`${path}: convertExcess needs a numeric "over" threshold`);
    }
    if (typeof e.rate !== 'number' || !Number.isFinite(e.rate) || e.rate <= 0) {
      errors.push(
        `${path}: convertExcess "rate" must be a positive number (% of the excess), got ${e.rate}`
      );
    }
    if (e.from === e.to) {
      errors.push(
        `${path}: convertExcess from and to are the same stat ("${e.from}") — a stat cannot feed itself`
      );
    }
    // The rule installs PERMANENTLY — there is no uninstall, expiry or window. That is exactly
    // right for the kit phrasing it exists for ("…continuously"), and wrong for anything else: on
    // a burstCast/hitCount trigger it would install on first fire and keep converting long after
    // the window the kit scoped it to. Fail loudly rather than let that be authored silently.
    if (trigger !== 'passive' && trigger !== 'battleStart') {
      errors.push(
        `${path}: convertExcess is permanent once installed, so it must sit on a passive/battleStart block (got "${trigger}") — a windowed form needs engine support first`
      );
    }
  }
  if (
    e.kind === 'gainPierce' &&
    e.durationShots !== undefined &&
    e.durationSec !== undefined
  ) {
    // No kit prints both, and the two plausible readings (whichever ends FIRST vs whichever lasts
    // LONGER) disagree. Reject until a carrier forces the question, rather than shipping a guess.
    errors.push(
      `${path}: gainPierce takes durationSec OR durationShots, not both — no kit prints both and the combined semantics is unsettled`
    );
  }
  if (e.kind === 'buff') {
    if (!STATS.has(e.stat)) {
      errors.push(`${path}: unknown stat "${e.stat}"`);
    }
    if (typeof e.value !== 'number') {
      errors.push(`${path}: buff needs numeric value`);
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
    if (
      e.gaugeHits !== undefined &&
      (!Number.isInteger(e.gaugeHits) || e.gaugeHits < 1)
    ) {
      errors.push(
        `${path}: gaugeHits must be a positive integer (sub-hit count for burst gauge)`
      );
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
  if (e.kind === 'selfStatus') {
    if (typeof e.name !== 'string' || !e.name.trim()) {
      errors.push(
        `${path}: selfStatus needs a non-empty "name" (the kit's status name)`
      );
    }
    if (typeof e.durationSec !== 'number' || !(e.durationSec > 0)) {
      errors.push(`${path}: selfStatus needs durationSec > 0`);
    }
  }
  if (e.kind === 'escalating') {
    if (!Array.isArray(e.steps)) {
      errors.push(`${path}: escalating needs steps[]`);
    } else {
      e.steps.forEach((s: any, i: number) =>
        checkEffect(s, `${path}.steps[${i}]`, errors, trigger)
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

  // charFixes.statImmunities — RECEIVING-side stat immunities ("Gains immunity to
  // Increase/Decrease <X> effects"). The whole enforcement is a string match in the engine, so an
  // unrecognised or authored-side key is a permanent SILENT no-op: the unit goes on receiving the
  // stat while its note and DECISIONS claim it cannot. Unrecognised input is LOUD here instead.
  const imm = override.charFixes?.statImmunities;
  if (imm !== undefined) {
    if (!Array.isArray(imm)) {
      errors.push('charFixes.statImmunities: must be an array of stat keys');
    } else {
      imm.forEach((s: unknown, i: number) => {
        const p = `charFixes.statImmunities[${i}]`;
        if (typeof s !== 'string') {
          errors.push(`${p}: must be a string stat key`);
          return;
        }
        const post = IMMUNITY_ALIAS.get(s);
        if (post !== undefined) {
          errors.push(
            `${p}: "${s}" is an authored-side alias the engine rewrites to "${post}" before the ` +
              `buff lands — an immunity must name the applied key ("${post}") or it can never match`
          );
        } else if (!IMMUNIZABLE_STATS.has(s)) {
          errors.push(`${p}: unknown stat "${s}"`);
        }
      });
    }
  }

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
      // (2026-08-11) The chargeCounter bypass rule that used to sit here is GONE, per its own
      // instruction: sim.ts now routes chargeCounter through applyBlock (its `phase` argument
      // selects the one phase effect), so everyN / everyNOffset / delaySec are live on this
      // trigger like any other and authoring them is no longer an error. Audit F2.1, closed.
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
      // The mirror-image hazard for the ally-side sibling: selfStatus routes through
      // resolveTargets(block.target), and resolveTargets({kind:'enemy'}) returns [] — an
      // enemy-targeted selfStatus applies to ZERO units while the same-unit census's syntactic
      // producer scan would still certify it, shipping a gate no layer ever flags as dead.
      if (
        collectEffectKinds(b.effects).has('selfStatus') &&
        b.target?.kind === 'enemy'
      ) {
        errors.push(
          `${p}: a selfStatus effect must sit on a block with an ally-side target (target "enemy" resolves to zero units — the status would be applied to nobody while the census still sees a producer)`
        );
      }
      // An `enemy`-targeted buff reaches the damage model ONLY as: a positive damageTakenPct /
      // distributedDamagePct, or a nonzero defPct (the DEF ▼ channel — scales cfg.bossDef; inert
      // on the bossDef = 0 graded basis, live at the web raid defaults). Anything else — an
      // enemy ATK ▼, or an allowed stat at a dropped value — is discarded at dispatch with no
      // diagnostic, so the JSON reads as a live debuff while contributing nothing. Warn, don't
      // fail: the carrier line is real kit, and the fix is an engine change, not an authoring one.
      if (b.target?.kind === 'enemy') {
        for (const e of collectEffects(b.effects, 'buff')) {
          if (!ENEMY_BUFF_STATS.has(e.stat)) {
            warnings.push(
              `${p}: enemy-targeted buff "${e.stat}" is DROPPED by the engine (only ${[...ENEMY_BUFF_STATS].join(' / ')} reach enemyBuffs) — the line is inert; record it in "unmodeled" if that is intended`
            );
          } else if (
            e.stat !== 'defPct' &&
            typeof e.value === 'number' &&
            e.value <= 0
          ) {
            warnings.push(
              `${p}: enemy-targeted buff "${e.stat}" has a non-positive value (${e.value}) and is DROPPED by the engine (the dispatch requires value > 0) — the line is inert`
            );
          } else if (e.stat === 'defPct' && e.value === 0) {
            warnings.push(
              `${p}: enemy-targeted defPct at value 0 is DROPPED by the engine (the DEF channel requires a nonzero value) — the line is inert`
            );
          }
        }
      } else {
        // The inverse mismatch (owner ruling 2026-08-10, faithfulness Tier 0 / D2): a boss-side
        // stat pointed at an ally-side target. Applied and never read — see
        // BOSS_ONLY_BUFF_STATS. Today's carriers are all kit damage-reduction clauses
        // (moran allies, rouge selfAndAdjacent, rumani self) kept for fidelity, so this warns
        // rather than fails; its job is to make the mismatch visible before someone "corrects"
        // the sign or the target and turns a defensive line into a damage multiplier.
        for (const e of collectEffects(b.effects, 'buff')) {
          if (BOSS_ONLY_BUFF_STATS.has(e.stat)) {
            warnings.push(
              `${p}: buff "${e.stat}" is a BOSS-SIDE stat on an ally-side target ("${b.target?.kind}") — the engine reads it only off the boss, so the line is applied and never read; keep it for kit fidelity and say so in "note", or move it to "unmodeled"`
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
        const PER_PULL = [
          'shotFired',
          'fullCharge',
          'hitCount',
          'chargeCounter',
        ];
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
        b.effects.forEach((e: any, ei: number) => {
          checkEffect(e, `${p}.effects[${ei}]`, errors, b.trigger?.kind);
          checkLevelScale(e, `${p}.effects[${ei}]`, slot, errors, ctx);
        });
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

  // Same-unit producer + consumer, both families: the gate reads at trigger time, the effect
  // writes at apply time, and both can fire on the same frame — so the ARRAY ORDER of the two
  // blocks is load-bearing (phantom relies on gate-before-inflict so her first application misses;
  // d-killer-wife on inflict-before-gate so hers does not). Nothing else records that, so name the
  // ORDER SHIPPED here rather than let a well-meaning reorder silently flip the unit's behavior.
  // The order itself is pinned by scripts/tests/block-order-guard.test.ts — this warning is the
  // in-file signpost, the fixture is the gate.
  blockOrderWarnings(override, warnings);

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

  // selfStatus is per-unit, so its producer/consumer match is SAME-UNIT, not cross-slug: a
  // requiresSelfStatus gate can only ever be opened by a selfStatus effect in the SAME override
  // (targeting the owner). A gate with no same-unit producer of the exact name is dead — and no
  // shipped kit grants a self status to ANOTHER unit today, so a missing producer is an ERROR,
  // not a future-gated warning. If a cross-unit grant ever ships ("allies enter <Mode>" — legal
  // at runtime, since selfStatus routes through resolveTargets and an allies-targeted grant
  // writes into each target's own map), downgrade this to the boss-channel census's two-tier
  // ERROR/WARN split keyed on a cross-slug producer scan.
  for (const [slug, o] of overrides) {
    const selfProducers = new Set<string>();
    const selfConsumers = new Map<string, string[]>(); // name -> block paths
    for (const slot of SLOTS) {
      const blocks = o?.[slot];
      if (!Array.isArray(blocks)) {
        continue;
      }
      blocks.forEach((b: any, bi: number) => {
        for (const e of collectEffects(b?.effects, 'selfStatus')) {
          if (typeof e.name === 'string') {
            selfProducers.add(e.name);
          }
        }
        if (typeof b?.requiresSelfStatus === 'string') {
          selfConsumers.set(b.requiresSelfStatus, [
            ...(selfConsumers.get(b.requiresSelfStatus) ?? []),
            `${slot}[${bi}]`,
          ]);
        }
      });
    }
    for (const [name, paths] of selfConsumers) {
      if (!selfProducers.has(name)) {
        errors.push(
          `${slug}: requiresSelfStatus "${name}" (${paths.join(', ')}) has no selfStatus producer in this unit's own override — the per-unit gate can NEVER open (matching is exact and same-unit only); fix the name or add the producer`
        );
      }
    }
  }

  return { errors, warnings };
}
