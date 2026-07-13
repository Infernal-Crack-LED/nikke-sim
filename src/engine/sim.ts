// Frame-tick simulation at 60 fps. Weapon fire cycles, the burst rotation
// state machine, and the buff engine all run on the same clock; every damage
// instance snapshots the active buffs and walks the full damage formula
// (nikke-damage-formula.md) with enemy DEF = 0.
import type { CharacterData, Element, SimConfig } from '../types.js';
import type { LevelMultiplier } from '../types.js';
import {
  characterStat,
  copiesToGradeCore,
  DOLL_ATK,
  DOLL_HP,
  dollBonus,
  gearAtk,
  gearHp,
  type DollBonus,
} from '../stats.js';
import { resolveSkills } from '../skills/index.js';
import type { PreparedUnit } from '../prepare.js';
import type { Block, EffectDef, StatKey, TargetDef } from '../skills/types.js';

const FPS = 60;
const STAGE_CAST_GAP_FRAMES = 30;      // in-game lag between stage casts
const FULL_BURST_FRAMES = 10 * FPS;

// Canon fire cadence per weapon type (doc values; per trigger pull).
// MG's canon "60 rps" counts belt rounds (hits): pulls/s = 60 / hitsPerShot and
// each pull consumes hitsPerShot ammo, which reproduces "8 s to empty 300 ammo".
const PULLS_PER_SEC: Record<string, number> = {
  AR: 12, SMG: 20, SG: 1.5, MG: 60, Pistol: 4,
};
const MG_SPOOL_FRAMES = 3.75 * FPS;    // ramp to max fire rate; cubic ramp ≈ doc's "8 s to empty 300 ammo"

// element → the element it beats
const BEATS: Record<Element, Element> = {
  Electric: 'Water', Iron: 'Electric', Wind: 'Iron', Fire: 'Wind', Water: 'Fire',
};

interface BuffInstance {
  key: string;
  stat: StatKey | 'unlimitedAmmo';
  value: number;          // per stack; for casterAtkPct this is flat ATK
  stacks: number;
  maxStacks: number;
  expiresFrame: number | null;
}

interface Dot {
  ownerIdx: number;
  atkPct: number;
  endFrame: number;
  nextTickFrame: number;
  intervalFrames: number;
  category: 'skill' | 'burst';
  distributed?: boolean;
  sustained?: boolean;
  sequential?: boolean;
  trueFlavor?: boolean;
  projFlavor?: 'attachment' | 'explosion';
}

interface WeaponSwap {
  untilFrame: number;
  damagePct: number;
  chargeFrames?: number;
  chargeMultPct?: number;
  maxAmmo?: number;
}

interface UnitState {
  idx: number;
  char: CharacterData;
  staticAtk: number;
  maxHp: number; // final Max HP (for HP-scaled ATK buffs)
  critRate: number;       // %
  critDamage: number;     // % multiplier (150 = crit ×1.5)
  doll: DollBonus;
  blocks: Block[];
  warnings: string[];
  skillSource: string;
  ammoRefundPer10: number;  // Bastion cube: bullets refunded per 10 fired
  bulletsSinceRefund: number;
  burstGenMult: number;
  swap: WeaponSwap | null;  // "Changes the weapon in use" state
  stunnedUntilFrame: number; // self-stun (Mast's Hangover): no firing/charging/reloading
  fbMissedSinceBurst: number; // full bursts this unit sat out since it last burst (Maiden:IR MP)
  mpPriority: boolean;       // jump the burst queue once fbMissedSinceBurst hits mpThreshold
  mpThreshold: number;
  extraStages: Set<number>; // extra burst stages this unit may fill (Combat Assist)
  lambdaStage: number | null; // Λ units: pinned to burst ONLY at this stage
  advantageVs: Set<string>; // boss elements this unit counts as advantaged against
  // weapon runtime
  ammo: number;
  fireAcc: number;
  chargeProgress: number;
  reloadProgress: number;
  reloading: boolean;
  spoolFrames: number;
  // skills runtime
  buffs: BuffInstance[];
  storedHits: Map<
    string,
    {
      atkPct: number;
      category: 'skill' | 'burst';
      distributed?: boolean;
      sustained?: boolean;
      sequential?: boolean;
      trueFlavor?: boolean;
      projFlavor?: 'attachment' | 'explosion';
      releasable: number;
      fresh: number;      // charges added this frame — not releasable until next frame
      freshFrame: number;
    }
  >;
  hitCounters: Map<string, number>;
  blockActivations: Map<string, number>;
  burstCdFrames: number;
  // results
  damage: { normal: number; skill: number; burst: number };
  pulls: number;
  burstCasts: number;
}

export interface UnitResult {
  slug: string;
  name: string;
  position: number;
  burst: string;
  weapon: string;
  element: string;
  advantaged: boolean;
  staticAtk: number;
  totalDamage: number;
  dps: number;
  share: number;
  breakdown: { normal: number; skill: number; burst: number };
  pulls: number;
  burstCasts: number;
  skillSource: string;
  warnings: string[];
  loadout: string[];
}

export interface SimResult {
  config: SimConfig;
  units: UnitResult[];
  teamDamage: number;
  teamDps: number;
  fullBursts: number;
  fullBurstUptime: number;  // 0..1
  rotationStallSec: number; // time spent gauge-full waiting on cooldowns
  rotationLog: string[];
}

export function runSim(
  chars: (CharacterData & { baseStats: any })[],
  mult: LevelMultiplier,
  cfg: SimConfig,
  prepared?: PreparedUnit[]
): SimResult {
  const fallback = copiesToGradeCore(cfg.copies);

  const units: UnitState[] = chars.map((rawChar, idx) => {
    // charFixes: hand-measured weapon-data corrections (e.g. true SR fire cycle)
    const charFix = prepared?.[idx]?.chargeFrames;
    const char = charFix ? { ...rawChar, chargeFrames: charFix } : rawChar;
    if (!char.baseStats) throw new Error(`${char.slug} has no base stats in the DB`);
    const skills = prepared?.[idx]?.skills ?? resolveSkills(char);
    // "no OTHER Burst 1 allies" — the unit itself never counts (Anis: Star is
    // herself a B1; her My Own Star state applies when she's the only one)
    const teamHasB1 = chars.some(
      (c, i) => i !== idx && (c.burst === 'I' || c.burst === 'Λ')
    );
    const selectedMode = prepared?.[idx]?.mode ?? skills.modes?.[0];
    const activeBlocks = skills.blocks.filter(
      (b) =>
        (!b.formation || (b.formation === 'hasB1') === teamHasB1) &&
        (!b.mode || b.mode === selectedMode)
    );
    const unitOl = prepared?.[idx]?.ol ?? cfg.ol;
    // Limit-Break stars (grade 0-3) and Core enhancement (0-7) are per-unit;
    // fall back to the global copies count when a unit doesn't specify them.
    const grade = Math.min(3, Math.max(0, prepared?.[idx]?.stars ?? fallback.grade));
    const core = Math.min(7, Math.max(0, prepared?.[idx]?.core ?? fallback.core));
    const atk =
      characterStat(char.baseStats, mult, 'atk', cfg.level, grade, core) +
      gearAtk(char.class, unitOl) +
      ((prepared?.[idx]?.doll ?? cfg.doll) ? DOLL_ATK : 0);
    const extra = prepared?.[idx]?.extraStats ?? [];
    const flatAtk = extra.filter((e) => e.stat === 'flatAtk').reduce((s, e) => s + e.value, 0);
    const useDoll = prepared?.[idx]?.doll ?? cfg.doll;
      const state: UnitState = {
      idx,
      char,
      staticAtk: atk + flatAtk,
      maxHp:
        characterStat(char.baseStats, mult, 'hp', cfg.level, grade, core) +
        gearHp(char.class, unitOl) +
        (useDoll ? DOLL_HP : 0),
      critRate: char.baseStats.critRate ?? 15,
      critDamage: char.baseStats.critDamage ?? 150,
      doll: useDoll ? dollBonus(char.weapon) : {},
      blocks: activeBlocks,
      warnings: [...skills.warnings],
      skillSource: skills.source,
      ammoRefundPer10: extra.filter((e) => e.stat === 'ammoRefundPer10').reduce((s, e) => s + e.value, 0),
      bulletsSinceRefund: 0,
      burstGenMult:
        1 + extra.filter((e) => e.stat === 'burstGenPct').reduce((s, e) => s + e.value, 0) / 100,
      swap: null,
      stunnedUntilFrame: -1,
      fbMissedSinceBurst: 0,
      mpPriority: prepared?.[idx]?.mpPriority ?? false,
      mpThreshold: activeBlocks.reduce(
        (t, b) =>
          b.effects.reduce(
            (t2, e) => (e.kind === 'stackedNuke' ? (e.maxStacks ?? 12) : t2),
            t
          ),
        12
      ),
      extraStages: new Set(),
      lambdaStage: char.burst === 'Λ' ? (prepared?.[idx]?.lambdaStage ?? null) : null,
      advantageVs: new Set(),
      ammo: char.ammo,
      fireAcc: 0,
      chargeProgress: 0,
      reloadProgress: 0,
      reloading: false,
      spoolFrames: 0,
      buffs: [],
      storedHits: new Map(),
      hitCounters: new Map(),
      blockActivations: new Map(),
      burstCdFrames: 0,
      damage: { normal: 0, skill: 0, burst: 0 },
      pulls: 0,
      burstCasts: 0,
    };
    // cube / OL-line stats become permanent buffs
    for (const e of extra) {
      if (e.stat === 'ammoRefundPer10' || e.stat === 'burstGenPct' || e.stat === 'flatAtk') continue;
      state.buffs.push({
        key: `extra:${idx}:${e.stat}`,
        stat: e.stat as StatKey,
        value: e.value,
        stacks: 1,
        maxStacks: 1,
        expiresFrame: null,
      });
    }
    return state;
  });

  const enemyBuffs: BuffInstance[] = [];
  const dots: Dot[] = [];
  const usedOncePerBattle = new Set<string>();
  const totalFrames = cfg.durationSec * FPS;
  const rotationLog: string[] = [];

  // burst gauge: % per second per unit = rl3/3, scaled by static cube bonus and
  // any live burst-gen buffs (recomputed per frame)
  const gaugeRate = (frame: number) =>
    units.reduce(
      (s, u) =>
        s +
        ((u.char.rl3 ?? 5) / 3) *
          u.burstGenMult *
          (1 + stat(u, 'burstGenPct', frame) / 100),
      0
    ) / FPS;

  let gauge = 0;
  let stage: 1 | 2 | 3 = 1;
  let stageGapFrames = 0;
  let fbEndFrame = -1;
  let pendingFbExtendSec = 0;
  let rotationCasters: number[] = [];
  let fullBursts = 0;
  let fbFrames = 0;
  let stallFrames = 0;

  const sum = (list: BuffInstance[], stat: string, frame: number) =>
    list.reduce(
      (s, b) =>
        b.stat === stat && (b.expiresFrame === null || b.expiresFrame > frame)
          ? s + b.value * b.stacks
          : s,
      0
    );

  const stat = (u: UnitState, key: StatKey, frame: number) => sum(u.buffs, key, frame);

  const advantaged = (u: UnitState) =>
    cfg.bossElement !== null &&
    (BEATS[u.char.element] === cfg.bossElement || u.advantageVs.has(cfg.bossElement));

  function effectiveAtk(u: UnitState, frame: number): number {
    return (
      u.staticAtk * (1 + stat(u, 'atkPct', frame) / 100) +
      stat(u, 'casterAtkPct', frame) +
      (stat(u, 'atkOfMaxHpPct', frame) / 100) * u.maxHp
    );
  }

  function dealDamage(
    u: UnitState,
    atkPct: number,
    frame: number,
    opts: {
      crit: boolean;
      core: boolean;
      charge: boolean;
      category: 'normal' | 'skill' | 'burst';
      distributed?: boolean;
      sustained?: boolean;
      sequential?: boolean;
      trueFlavor?: boolean;
      projFlavor?: 'attachment' | 'explosion';
    }
  ) {
    const fb = fbEndFrame > frame;
    let major = 1 + (fb ? 0.5 : 0) + (cfg.rangeBonus ? 0.3 : 0);
    if (opts.crit) {
      const critRate = Math.min(1, Math.max(0, (u.critRate + stat(u, 'critRatePct', frame)) / 100));
      major += critRate * ((u.critDamage - 100) / 100 + stat(u, 'critDamagePct', frame) / 100);
    }
    if (opts.core && cfg.coreHitRate > 0) {
      major +=
        cfg.coreHitRate *
        ((u.char.coreAttackMultiplier - 100) / 100 +
          (stat(u, 'coreDamagePct', frame) + (u.doll.coreDamagePct ?? 0)) / 100);
    }
    const elem = advantaged(u) ? 1.1 + stat(u, 'elementDamagePct', frame) / 100 : 1;
    const chargeMult = u.swap?.chargeMultPct ?? u.char.chargeMultiplier;
    // Collection items and Helm-style burst buffs scale by BASE charge damage
    // (chargeMult × pct); ordinary charge-damage buffs add flat percentage points.
    const baseCharge = chargeMult / 100;
    const charge =
      opts.charge && chargeMult > 0
        ? baseCharge +
          (baseCharge *
            ((u.doll.chargeDamagePct ?? 0) + stat(u, 'chargeDamageMultPct', frame))) /
            100 +
          stat(u, 'chargeDamagePct', frame) / 100
        : 1;
    // Projectile Attachment/Explosion Damage is its OWN multiplier bucket on
    // the flavored hit (multiplicative with Damage Up), not additive within it.
    // It applies ONLY to explosion/attachment-flavored hits (RRH's projectiles,
    // Anis: Star's stars) — normal attacks, RL included, never benefit.
    const projExplosion =
      opts.projFlavor === 'explosion' ? stat(u, 'projectileExplosionPct', frame) : 0;
    const projAttachment =
      opts.projFlavor === 'attachment' ? stat(u, 'projectileAttachmentPct', frame) : 0;
    const projFactor = 1 + (projExplosion + projAttachment) / 100;
    const dmgUp =
      1 +
      (stat(u, 'attackDamagePct', frame) +
        (opts.sustained ? stat(u, 'sustainedDamagePct', frame) : 0) +
        (opts.sequential ? stat(u, 'sequentialDamagePct', frame) : 0) +
        (opts.trueFlavor ? stat(u, 'trueDamagePct', frame) : 0) +
        (advantaged(u) ? stat(u, 'elemAdvantageDamagePct', frame) : 0)) /
        100;
    // Distributed Damage debuffs share the taken bucket, but only affect
    // distributed sources and only while a Damage Taken ▲ is active on the boss
    const dmgTakenSum = sum(enemyBuffs, 'damageTakenPct', frame);
    const distDebuff =
      opts.distributed && dmgTakenSum > 0 ? sum(enemyBuffs, 'distributedDamagePct', frame) : 0;
    const taken = 1 + (dmgTakenSum + distDebuff) / 100;
    const distributed = opts.distributed ? 1 + stat(u, 'distributedDamagePct', frame) / 100 : 1;

    const baseAtk = Math.max(0, effectiveAtk(u, frame) - cfg.bossDef);
    const dmg =
      baseAtk * (atkPct / 100) * major * elem * charge * dmgUp * projFactor * taken * distributed;
    u.damage[opts.category] += dmg;
  }

  function resolveTargets(t: TargetDef, ownerIdx: number): UnitState[] {
    switch (t.kind) {
      case 'self': return [units[ownerIdx]];
      case 'allies': return units;
      case 'burstCasters': return rotationCasters.map((i) => units[i]);
      case 'nonBurstCasters': return units.filter((u) => !rotationCasters.includes(u.idx));
      case 'alliesTopAtk':
        return [...units].sort((a, b) => b.staticAtk - a.staticAtk).slice(0, t.count);
      case 'alliesLowestAtk':
        return units
          .filter((u) => !t.burst || u.char.burst === t.burst || u.char.burst === 'Λ')
          .filter((u) => !t.excludeSelf || u.idx !== ownerIdx)
          .sort((a, b) => a.staticAtk - b.staticAtk)
          .slice(0, t.count);
      case 'alliesOfElement': return units.filter((u) => u.char.element === t.element);
      case 'alliesOfClass': return units.filter((u) => u.char.class === t.cls);
      case 'enemy': return [];
    }
  }

  function applyBuff(
    list: BuffInstance[],
    key: string,
    stat: BuffInstance['stat'],
    value: number,
    durationSec: number | undefined,
    maxStacks: number,
    frame: number
  ) {
    const expiresFrame = durationSec != null ? frame + Math.round(durationSec * FPS) : null;
    const existing = list.find((b) => b.key === key);
    if (existing) {
      if (existing.expiresFrame !== null && existing.expiresFrame <= frame) existing.stacks = 0;
      existing.stacks = Math.min(existing.stacks + 1, maxStacks);
      existing.expiresFrame = expiresFrame;
      existing.value = value;
    } else {
      list.push({ key, stat, value, stacks: 1, maxStacks, expiresFrame });
    }
  }

  function applyBlock(ownerIdx: number, block: Block, blockIdx: number, frame: number) {
    const owner = units[ownerIdx];
    const bKey = `${ownerIdx}:${block.slot}:${blockIdx}`;
    const activations = (owner.blockActivations.get(bKey) ?? 0) + 1;
    owner.blockActivations.set(bKey, activations);
    // everyN gate: effects land only on every Nth trigger activation
    if (block.everyN && activations % block.everyN !== 0) return;
    // core-gated blocks never fire in zero-core fights
    if (block.requiresCore && cfg.coreHitRate <= 0) return;
    // full-burst-state gate ('inFb' / 'outFb'), evaluated when the trigger fires
    if (block.fbGate) {
      const fbActive = fbEndFrame > frame;
      if ((block.fbGate === 'inFb') !== fbActive) return;
    }
    block.effects.forEach((e: EffectDef, ei) =>
      applyEffect(ownerIdx, block, e, `${bKey}:${ei}`, activations, frame)
    );
  }

  function applyEffect(
    ownerIdx: number,
    block: Block,
    e: EffectDef,
    key: string,
    activations: number,
    frame: number
  ) {
    const owner = units[ownerIdx];
    const category = block.slot === 'burst' ? 'burst' : 'skill';
    {
      switch (e.kind) {
        case 'buff': {
          if (block.target.kind === 'enemy') {
            if (
              (e.stat === 'damageTakenPct' || e.stat === 'distributedDamagePct') &&
              e.value > 0
            ) {
              applyBuff(enemyBuffs, key, e.stat, e.value, e.durationSec, e.maxStacks ?? 1, frame);
            }
            // other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0
            break;
          }
          const value =
            e.stat === 'casterAtkPct' ? (e.value / 100) * owner.staticAtk : e.value;
          // always-on triggers keep their buffs up regardless of listed duration
          const alwaysOn =
            block.trigger.kind === 'passive' || block.trigger.kind === 'bossElement';
          for (const t of resolveTargets(block.target, ownerIdx)) {
            applyBuff(
              t.buffs, key, e.stat, value,
              alwaysOn ? undefined : e.durationSec,
              e.maxStacks ?? 1, frame
            );
            // Max Ammo ▼ clips the CURRENT belt when it lands (user-confirmed);
            // increases never clip. Stacking stays additive inside maxAmmo().
            if (e.stat === 'maxAmmoPct' && e.value < 0) {
              t.ammo = Math.min(t.ammo, maxAmmo(t, frame));
            }
          }
          break;
        }
        case 'flatDamage':
          dealDamage(owner, e.atkPct, frame, {
            crit: false,
            core: e.core === true,
            charge: false,
            category,
            distributed: e.flavor === 'distributed',
            sustained: e.flavor === 'sustained',
            sequential: e.flavor === 'sequential',
            trueFlavor: e.flavor === 'true',
            projFlavor:
              e.flavor === 'projectileAttachment'
                ? 'attachment'
                : e.flavor === 'projectileExplosion'
                  ? 'explosion'
                  : undefined,
          });
          break;
        case 'dot': {
          const intervalFrames = Math.round((e.intervalSec ?? 1) * FPS);
          dots.push({
            ownerIdx,
            atkPct: e.atkPct,
            endFrame: frame + Math.round(e.durationSec * FPS),
            nextTickFrame: frame + intervalFrames,
            intervalFrames,
            category,
            distributed: e.flavor === 'distributed',
            sustained: e.flavor === 'sustained',
            sequential: e.flavor === 'sequential',
            trueFlavor: e.flavor === 'true',
            projFlavor:
              e.flavor === 'projectileAttachment'
                ? 'attachment'
                : e.flavor === 'projectileExplosion'
                  ? 'explosion'
                  : undefined,
          });
          break;
        }
        case 'weaponSwap':
          owner.swap = {
            untilFrame: frame + Math.round(e.durationSec * FPS),
            damagePct: e.damagePct,
            chargeFrames: e.chargeTimeSec ? Math.round(e.chargeTimeSec * FPS) : undefined,
            chargeMultPct: e.chargeMultPct,
            maxAmmo: e.maxAmmo,
          };
          owner.chargeProgress = 0;
          owner.reloading = false;
          owner.reloadProgress = 0;
          owner.ammo = maxAmmo(owner, frame);
          break;
        case 'fillGauge':
          // gauge is locked during full burst — fills landing then are wasted
          if (fbEndFrame <= frame) gauge = Math.min(100, gauge + e.pct);
          break;
        case 'storedHit': {
          const entry = owner.storedHits.get(key) ?? {
            atkPct: e.atkPct,
            category,
            distributed: e.flavor === 'distributed',
            sustained: e.flavor === 'sustained',
            sequential: e.flavor === 'sequential',
            trueFlavor: e.flavor === 'true',
            projFlavor:
              e.flavor === 'projectileAttachment'
                ? ('attachment' as const)
                : e.flavor === 'projectileExplosion'
                  ? ('explosion' as const)
                  : undefined,
            releasable: 0,
            fresh: 0,
            freshFrame: frame,
          };
          if (entry.freshFrame !== frame) {
            entry.releasable += entry.fresh;
            entry.fresh = 0;
            entry.freshFrame = frame;
          }
          entry.fresh += e.charges ?? 1;
          owner.storedHits.set(key, entry);
          break;
        }
        case 'burstEligibility':
          for (const t of resolveTargets(block.target, ownerIdx)) t.extraStages.add(e.stage);
          break;
        case 'advantageVs':
          for (const t of resolveTargets(block.target, ownerIdx)) t.advantageVs.add(e.element);
          break;
        case 'burstCdr':
          if (e.oncePerBattle) {
            if (usedOncePerBattle.has(key)) break;
            usedOncePerBattle.add(key);
          }
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.burstCdFrames = Math.max(0, t.burstCdFrames - Math.round(e.seconds * FPS));
          }
          break;
        case 'escalating': {
          const n = Math.min(activations, e.steps.length);
          e.steps
            .slice(0, n)
            .forEach((step, si) => applyEffect(ownerIdx, block, step, `${key}:s${si}`, activations, frame));
          break;
        }
        case 'fullBurstExtend':
          if (fbEndFrame > frame) fbEndFrame += Math.round(e.seconds * FPS);
          else pendingFbExtendSec += e.seconds;
          break;
        case 'unlimitedAmmo':
          for (const t of resolveTargets(block.target, ownerIdx)) {
            applyBuff(t.buffs, key, 'unlimitedAmmo', 1, e.durationSec, 1, frame);
          }
          break;
        case 'stackedNuke': {
          const stacks = Math.min(owner.fbMissedSinceBurst, e.maxStacks ?? 12);
          if (stacks > 0) {
            const eff = Math.max(1, effectiveAtk(owner, frame));
            const hpEquivPct = e.hpPct ? ((e.hpPct / 100) * owner.maxHp * 100) / eff : 0;
            dealDamage(owner, (e.atkPct + hpEquivPct) * stacks, frame, {
              crit: false, core: false, charge: false, category,
            });
          }
          break;
        }
        case 'stun':
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.stunnedUntilFrame = Math.max(
              t.stunnedUntilFrame,
              frame + Math.round(e.durationSec * FPS)
            );
          }
          break;
        case 'instantReload':
          for (const t of resolveTargets(block.target, ownerIdx)) {
            const max = maxAmmo(t, frame);
            t.ammo = Math.min(max, t.ammo + Math.round(max * (e.fraction ?? 1)));
            if (t.ammo > 0) {
              t.reloading = false;
              t.reloadProgress = 0;
            }
          }
          break;
      }
    }
  }

  function fireTriggered(u: UnitState, kind: 'fullBurstEnter' | 'fullBurstEnd' | 'lastBullet', frame: number) {
    u.blocks.forEach((b, bi) => {
      if (b.trigger.kind === kind) applyBlock(u.idx, b, bi, frame);
    });
  }

  function maxAmmo(u: UnitState, frame: number): number {
    const base = u.swap?.maxAmmo ?? u.char.ammo;
    if (u.swap?.maxAmmo !== undefined) return u.swap.maxAmmo; // swapped weapons use their spec directly
    const pct = (u.doll.maxAmmoPct ?? 0) + stat(u, 'maxAmmoPct', frame);
    return Math.max(1, Math.round(base * (1 + pct / 100)));
  }

  // passives on at frame 0 (boss-element conditionals count when the element matches)
  units.forEach((u) =>
    u.blocks.forEach((b, bi) => {
      if (
        b.trigger.kind === 'passive' ||
        (b.trigger.kind === 'bossElement' && b.trigger.element === cfg.bossElement)
      ) {
        applyBlock(u.idx, b, bi, 0);
      }
    })
  );

  const romanStage: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

  for (let frame = 0; frame < totalFrames; frame++) {
    const fbActive = fbEndFrame > frame;
    if (fbActive) fbFrames++;

    // ---- full burst end ----
    if (fbEndFrame === frame) {
      units.forEach((u) => fireTriggered(u, 'fullBurstEnd', frame));
      // units that sat this rotation out accrue a missed-burst stack (MP)
      units.forEach((u) => {
        if (!rotationCasters.includes(u.idx)) u.fbMissedSinceBurst++;
      });
      rotationCasters = [];
      stage = 1;
    }

    // ---- burst rotation ----
    // the gauge only builds OUTSIDE full burst; during FB it is locked
    if (!fbActive) gauge = Math.min(100, gauge + gaugeRate(frame));
    if (stageGapFrames > 0) stageGapFrames--;
    if (!fbActive && gauge >= 100 && stageGapFrames === 0) {
      const want = romanStage[stage];
      const eligible = (u: UnitState) => {
        if (u.burstCdFrames > 0) return false;
        if (u.char.burst === 'Λ') {
          // pinned Λ (e.g. "Red Hood operates as B2") only fills its chosen stage
          return u.lambdaStage === null || u.lambdaStage === stage;
        }
        return u.char.burst === want || u.extraStages.has(stage);
      };
      // a max-MP unit with priority enabled jumps the leftmost order
      const cand =
        units.find((u) => u.mpPriority && u.fbMissedSinceBurst >= u.mpThreshold && eligible(u)) ??
        units.find(eligible);
      if (cand) {
        cand.burstCasts++;
        cand.burstCdFrames = Math.round(cand.char.burstCooldownSec * FPS);
        rotationCasters.push(cand.idx);
        rotationLog.push(`${(frame / FPS).toFixed(1)}s  B${want} ${cand.char.name}`);
        const castStage = stage;
        // Stage 3: full burst begins BEFORE the caster's burst effects resolve —
        // in-game the burst nuke lands with FB active, so it gets the +50% FB
        // bonus, the fullBurstEnter team auras, and same-cast stageEnter buffs
        // (e.g. Cinderella's Max-HP→ATK conversion). Stages 1/2 stay pre-FB.
        if (stage === 3) {
          fbEndFrame = frame + FULL_BURST_FRAMES + Math.round(pendingFbExtendSec * FPS);
          pendingFbExtendSec = 0;
          gauge = 0;
          fullBursts++;
        }
        units.forEach((u) =>
          u.blocks.forEach((b, bi) => {
            if (b.trigger.kind === 'stageEnter' && b.trigger.stage === castStage) {
              applyBlock(u.idx, b, bi, frame);
            }
          })
        );
        if (castStage === 3) {
          units.forEach((u) => fireTriggered(u, 'fullBurstEnter', frame));
          // release stored hits (e.g. Rapi:RH's attached projectiles exploding)
          // AFTER enter-buffs so FB auras apply to them; charges added this
          // frame (from the stage-3 cast itself) wait for the next full burst
          for (const u of units) {
            for (const entry of u.storedHits.values()) {
              if (entry.freshFrame < frame) {
                entry.releasable += entry.fresh;
                entry.fresh = 0;
                entry.freshFrame = frame;
              }
              if (entry.releasable > 0) {
                dealDamage(u, entry.atkPct * entry.releasable, frame, {
                  crit: false,
                  core: false,
                  charge: false,
                  category: entry.category,
                  distributed: entry.distributed,
                  sustained: entry.sustained,
                  sequential: entry.sequential,
                  trueFlavor: entry.trueFlavor,
                  projFlavor: entry.projFlavor,
                });
                entry.releasable = 0;
              }
            }
          }
          rotationLog.push(`${(frame / FPS).toFixed(1)}s  FULL BURST (until ${(fbEndFrame / FPS).toFixed(1)}s)`);
        }
        cand.blocks.forEach((b, bi) => {
          if (b.trigger.kind === 'burstCast' && (b.trigger.stage ?? castStage) === castStage) {
            applyBlock(cand.idx, b, bi, frame);
          }
        });
        cand.fbMissedSinceBurst = 0; // MP spent (blocks above already read it)
        if (castStage !== 3) {
          stage = (stage + 1) as 1 | 2 | 3;
          stageGapFrames = STAGE_CAST_GAP_FRAMES;
        }
      } else {
        stallFrames++;
      }
    }

    // ---- per-unit weapon FSM ----
    for (const u of units) {
      if (u.burstCdFrames > 0) u.burstCdFrames--;

      if (u.swap && frame >= u.swap.untilFrame) {
        u.swap = null;
        u.ammo = maxAmmo(u, frame);
        u.chargeProgress = 0;
      }

      if (frame < u.stunnedUntilFrame) {
        u.spoolFrames = 0; // MG spool resets while stunned
        continue;
      }

      if (u.reloading) {
        u.spoolFrames = 0;
        u.reloadProgress += 1 + stat(u, 'reloadSpeedPct', frame) / 100;
        if (u.reloadProgress >= u.char.reloadFrames) {
          u.reloading = false;
          u.reloadProgress = 0;
          u.ammo = maxAmmo(u, frame);
        }
        continue;
      }

      const unlimited = sum(u.buffs, 'unlimitedAmmo', frame) > 0;

      const chargeFrames = u.swap?.chargeFrames ?? u.char.chargeFrames;
      if (chargeFrames > 0) {
        // RL/SR (or swapped charge weapon): charge → fire full-charge shot → recharge
        u.chargeProgress += 1 + stat(u, 'chargeSpeedPct', frame) / 100;
        if (u.chargeProgress >= chargeFrames) {
          u.chargeProgress = 0;
          firePull(u, frame, true, unlimited);
        }
      } else {
        const speedMult =
          1 + (stat(u, 'attackSpeedPct', frame) + stat(u, 'fireRatePct', frame)) / 100;
        let rate = (PULLS_PER_SEC[u.char.weapon] ?? 4) / FPS;
        if (u.char.weapon === 'MG') {
          rate /= u.char.hitsPerShot;
          u.spoolFrames++;
          rate *= Math.min(1, Math.pow(u.spoolFrames / MG_SPOOL_FRAMES, 3));
        }
        u.fireAcc += rate * speedMult;
        while (u.fireAcc >= 1 && !u.reloading) {
          u.fireAcc -= 1;
          firePull(u, frame, false, unlimited);
        }
      }
    }

    // ---- dots ----
    for (const d of dots) {
      if (frame === d.nextTickFrame && frame <= d.endFrame) {
        dealDamage(units[d.ownerIdx], d.atkPct, frame, {
          crit: false, core: false, charge: false, category: d.category,
          distributed: d.distributed, sustained: d.sustained, sequential: d.sequential,
          trueFlavor: d.trueFlavor,
          projFlavor: d.projFlavor,
        });
        d.nextTickFrame += d.intervalFrames;
      }
    }
  }

  function firePull(u: UnitState, frame: number, charged: boolean, unlimited: boolean) {
    const normalScale =
      1 + ((u.doll.normalAttackPct ?? 0) + stat(u, 'normalAttackPct', frame)) / 100;
    const baseMult = u.swap?.damagePct ?? u.char.normalAttackMultiplier;
    dealDamage(u, baseMult * normalScale, frame, {
      crit: true, core: true, charge: charged, category: 'normal',
    });
    u.pulls++;

    const extraPerHit = stat(u, 'extraHitDamagePct', frame);
    if (extraPerHit > 0) {
      dealDamage(u, extraPerHit * u.char.hitsPerShot, frame, {
        crit: false, core: false, charge: false, category: 'burst',
      });
    }

    // hit-count and per-shot skill triggers
    u.blocks.forEach((b, bi) => {
      if (b.trigger.kind === 'shotFired') applyBlock(u.idx, b, bi, frame);
      else if (b.trigger.kind === 'hitCount') {
        const key = `hc:${bi}`;
        let c = (u.hitCounters.get(key) ?? 0) + u.char.hitsPerShot;
        while (c >= b.trigger.count) {
          c -= b.trigger.count;
          applyBlock(u.idx, b, bi, frame);
        }
        u.hitCounters.set(key, c);
      }
    });

    if (!unlimited) {
      const consumed = u.char.weapon === 'MG' ? u.char.hitsPerShot : 1;
      u.ammo -= consumed;
      // Bastion: N bullets refunded per 10 fired
      if (u.ammoRefundPer10 > 0) {
        u.bulletsSinceRefund += consumed;
        while (u.bulletsSinceRefund >= 10) {
          u.bulletsSinceRefund -= 10;
          u.ammo = Math.min(maxAmmo(u, frame), u.ammo + u.ammoRefundPer10);
        }
      }
      if (u.ammo <= 0) {
        fireTriggered(u, 'lastBullet', frame);
        u.reloading = true;
        u.reloadProgress = 0;
      }
    }
  }

  // ---- results ----
  const totals = units.map((u) => u.damage.normal + u.damage.skill + u.damage.burst);
  const teamDamage = totals.reduce((a, b) => a + b, 0);
  const results: UnitResult[] = units.map((u, i) => ({
    slug: u.char.slug,
    name: u.char.name,
    position: i + 1,
    burst: u.char.burst,
    weapon: u.char.weapon,
    element: u.char.element,
    advantaged: advantaged(u),
    staticAtk: u.staticAtk,
    totalDamage: totals[i],
    dps: totals[i] / cfg.durationSec,
    share: teamDamage ? totals[i] / teamDamage : 0,
    breakdown: u.damage,
    pulls: u.pulls,
    burstCasts: u.burstCasts,
    skillSource: u.skillSource,
    warnings: [
      ...u.warnings,
      ...(u.char.rl3 == null ? ['no rl3 burst-gen stat — team gauge estimate uses a default'] : []),
      ...(u.char.weapon === 'Pistol' ? ['Pistol cadence is a 4/s estimate; no doll data'] : []),
    ],
    loadout: prepared?.[i]?.loadout ?? [],
  }));

  return {
    config: cfg,
    units: results,
    teamDamage,
    teamDps: teamDamage / cfg.durationSec,
    fullBursts,
    fullBurstUptime: fbFrames / totalFrames,
    rotationStallSec: stallFrames / FPS,
    rotationLog,
  };
}
