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
import gaugeTable from '../../data/gauge-per-shot.json' with { type: 'json' };
import type { Block, EffectDef, StatKey, TargetDef } from '../skills/types.js';

const FPS = 60;
const STAGE_CAST_GAP_FRAMES = 30;      // in-game lag between stage casts
const FULL_BURST_FRAMES = 10 * FPS;
// AUTO RELEASE LATENCY (2026-07-13 reframe; docs/data/charge-weapons.md §2): "old-style"
// RELEASE-FIRED charge weapons fire ~22 frames after full charge on auto — measured on
// Helm SR (22f, docs/"helm 2 6 mag rotations.mov") and Maiden:IR RL (21f avg, her video;
// modeled per-unit via charFixes.chargeFrames). AUTOFIRING guns (liberalio, anis: star,
// nayuta-in-burst; newer mechanic) fire at baked cadence with no latency. Engine default:
// SR = latent, RL = bare cadence (validated RL carries fit autofire); weapon-swap states
// and charFixes.noBoltRecovery units (SWHA, liberalio) are exempt.
const SR_BOLT_RECOVERY_FRAMES = 22;

// Canon fire cadence per weapon type (doc values; per trigger pull).
// MG's "60 rps" counts belt rounds (hits): pulls/s = 60 / hitsPerShot and each
// pull consumes hitsPerShot ammo. MG wind-up follows the measured frame ladder
// below (docs/nikke-mg-windup-model.md), not a fitted curve.
const PULLS_PER_SEC: Record<string, number> = {
  AR: 12, SMG: 20, SG: 1.5, MG: 60, Pistol: 4,
};
// Frame intervals between MG rounds 1→35 (measured, 60fps; identical across units).
// 142 frames of ramp, then 1 round/frame. Wind-up restarts from the top of the
// ladder on every reload/stun (no partial retention) unless reload-speed buffs
// exceed 100% (user-confirmed skip).
const MG_RAMP_INTERVALS = [
  23, 14, 10, 8, 7, 6, 5, 5, 4, 4, 4,
  3, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
];
// Q11 calibration (user estimates, flagged for review): rounds fired before the ladder
// reaches its 2-frame portion (the first 18 rounds of each wind-up) don't land on the
// core; MG normals never receive the +30% optimal-range bonus (every range is optimal
// for an MG, so the bonus doesn't exist for them).
const MG_NO_CORE_RAMP_ROUNDS = 18;
// MG WIND-DOWN (2026-07-13, replaces the binary >100%-reload skip): while an MG is not
// firing (reload/stun/unhittable), its spin holds for a ~0.27s grace then decays back down
// the wind-up ladder at ~2.8x climb speed — fully gone after ~1.1s idle. Linear fit through
// ore-game's two measured recovery points (90% reload buff -> ~90 rounds recovered, 74% ->
// ~30; https://ore-game.com/nikke/post/verify-mg-heatup/) whose endpoints reproduce BOTH
// prior rules exactly: ore-game's "no recovery below ~70% reload buff" (idle > 1.1s) and
// our measured ">100% buff = full skip" (subtractive reload leaves only the ~0.21s tail,
// inside the grace window).
const MG_WINDDOWN_GRACE_FRAMES = 16;
const MG_WINDDOWN_DECAY = 2.78; // ladder-frames lost per idle frame past the grace
const MG_LADDER_CUM: number[] = [0];
for (const iv of MG_RAMP_INTERVALS) MG_LADDER_CUM.push(MG_LADDER_CUM[MG_LADDER_CUM.length - 1] + iv);
// RELOAD (2026-07-13): actual reload = displayed x 0.975 x (1 - buff) + 0.21s — SUBTRACTIVE,
// like charge speed, with a fixed 0.21s tail; buffs past 100% only remove the scaled part
// (https://ore-game.com/nikke/post/reload-limit/). Replaces the old divisive
// reloadFrames/(1+buff) — near-identical at mid buffs (which is why the board validated),
// divergent above ~80%.
const RELOAD_TAIL_FRAMES = 13; // 0.21s
const reloadFramesNeeded = (base: number, buffPct: number) =>
  Math.round(base * 0.975 * Math.max(0, 1 - buffPct / 100)) + RELOAD_TAIL_FRAMES;

// Test-boss range script (user-measured, 2026-07-13; fight timer 3:00 counts down):
// mid 0-33s, near 33-70, far 70-106, mid-far 106-144, near 144-176, mid-far 176-180.
// At each transition the boss is unhittable for 1s; during that window units whose
// EFFECTIVE reload time is <=1s get a free full reload (longer reloads keep their mag).
const BOSS_RANGE_SCRIPT: Array<{ fromSec: number; band: 'near' | 'mid' | 'midfar' | 'far' }> = [
  { fromSec: 0, band: 'mid' },
  { fromSec: 33, band: 'near' },
  { fromSec: 70, band: 'far' },
  { fromSec: 106, band: 'midfar' },
  { fromSec: 144, band: 'near' },
  { fromSec: 176, band: 'midfar' },
];
// Which weapon classes sit inside their effective range per band (user's mapping).
// RL has no effective range and NEVER receives the bonus.
const RANGE_ELIGIBLE: Record<string, Set<string>> = {
  near: new Set(['SG']),
  mid: new Set(['SMG', 'AR']),
  midfar: new Set(['MG', 'SR']),
  far: new Set(['SR']),
};
const UNHITTABLE_FRAMES = 60;
// SG pellet falloff ⚑: outside the near band, pellet spread misses the moving test boss —
// calibrated on the naga/dorothy-S/noir probe triple (all ~x2 hot at full volleys):
// near = all 10 pellets land, elsewhere ~30%.
const SG_OUT_OF_NEAR_HIT_FRACTION = 0.3;

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
  noRange?: boolean;
  noFb?: boolean;
  projFlavor?: 'attachment' | 'explosion';
}

interface WeaponSwap {
  untilFrame: number;
  damagePct: number;
  chargeFrames?: number;
  chargeMultPct?: number;
  maxAmmo?: number;
  trueNormals?: boolean;
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
  hasPierce: boolean;     // kit's attacks are Pierce-tagged (Q10)
  burstSnapshotsPreFb: boolean; // burst damage resolves pre-FB/pre-stage (per-unit timing)
  ammoRefundPer10: number;  // Bastion cube: bullets refunded per 10 fired
  bulletsSinceRefund: number;
  burstGenMult: number;
  swap: WeaponSwap | null;  // "Changes the weapon in use" state
  stunnedUntilFrame: number; // self-stun (Mast's Hangover): no firing/charging/reloading
  fbMissedSinceBurst: number; // full bursts this unit sat out since it last burst (Maiden:IR MP)
  mpPriority: boolean;       // jump the burst queue once fbMissedSinceBurst hits mpThreshold
  burstFirstPending: boolean; // takes the first eligible burst of its stage (Prika duet opener)
  mpThreshold: number;
  extraStages: Set<number>; // extra burst stages this unit may fill (Combat Assist)
  lambdaStage: number | null; // Λ units: pinned to burst ONLY at this stage
  advantageVs: Set<string>; // boss elements this unit counts as advantaged against
  // weapon runtime
  ammo: number;
  fireAcc: number;
  chargeProgress: number;
  boltRecoveryFrames: number; // remaining post-shot bolt-cycle frames (SR)
  noBoltRecovery: boolean;
  pullsPerSec?: number;
  reloadProgress: number;
  reloading: boolean;
  mgRampRound: number;  // rounds fired since wind-up start (indexes the ramp ladder)
  mgIdleFrames: number; // consecutive non-firing frames (reload/stun/unhittable) for wind-down
  mgCooldown: number;   // fractional frames until the next round
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
  lastBurstCastFrame: number;
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
  maxHp: number;
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
    const reloadFix = prepared?.[idx]?.reloadFrames;
    const cdFix = prepared?.[idx]?.burstCooldownSec;
    const char =
      charFix !== undefined || reloadFix !== undefined || cdFix !== undefined
        ? {
            ...rawChar,
            ...(charFix ? { chargeFrames: charFix } : {}),
            ...(reloadFix !== undefined ? { reloadFrames: reloadFix } : {}),
            ...(cdFix ? { burstCooldownSec: cdFix } : {}),
          }
        : rawChar;
    if (!char.baseStats) throw new Error(`${char.slug} has no base stats in the DB`);
    const skills = prepared?.[idx]?.skills ?? resolveSkills(char);
    // "no OTHER Burst 1 allies" — the unit itself never counts, and Λ units count
    // as NO burst type for formation calculations (user-confirmed: Red Hood as B3
    // does not flip Anis: Star's My Own Star off)
    const teamHasB1 = chars.some((c, i) => i !== idx && c.burst === 'I');
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
      hasPierce:
        skills.hasPierce === true ||
        (skills.pierceModes?.includes(selectedMode ?? '') ?? false),
      burstSnapshotsPreFb: skills.burstSnapshotsPreFb === true,
      ammoRefundPer10: extra.filter((e) => e.stat === 'ammoRefundPer10').reduce((s, e) => s + e.value, 0),
      bulletsSinceRefund: 0,
      burstGenMult:
        1 + extra.filter((e) => e.stat === 'burstGenPct').reduce((s, e) => s + e.value, 0) / 100,
      swap: null,
      stunnedUntilFrame: -1,
      fbMissedSinceBurst: 0,
      mpPriority: prepared?.[idx]?.mpPriority ?? false,
      burstFirstPending: false,
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
      boltRecoveryFrames: 0,
      noBoltRecovery: prepared?.[idx]?.noBoltRecovery ?? false,
      pullsPerSec: prepared?.[idx]?.pullsPerSec,
      chargeProgress: 0,
      reloadProgress: 0,
      reloading: false,
      mgRampRound: 0,
      mgIdleFrames: 0,
      mgCooldown: 0,
      buffs: [],
      storedHits: new Map(),
      hitCounters: new Map(),
      blockActivations: new Map(),
      burstCdFrames: 0,
      lastBurstCastFrame: -1,
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
  // teamAmmo triggers: fire whenever TOTAL ally ammo consumed crosses each block's count
  // (infinite-ammo shots never consume, matching the in-game rule)
  const teamAmmoBlocks: Array<{ unitIdx: number; block: Block; bi: number; residual: number }> = [];
  const usedOncePerBattle = new Set<string>();
  const totalFrames = cfg.durationSec * FPS;
  const rotationLog: string[] = [];

  // burst gauge v4 (2026-07-13, test battery 2 test 3 — two solo gauge recordings vs the
  // RAID boss + the datamined CharacterShotTable + the einkk reference formula):
  //   per trigger pull vs the stage target = target_burst_energy_pershot (datamined,
  //   universally = 2x the non-target base — this IS the old "boss x2", it's a column);
  //   the CAMERA-FOCUSED unit's charge weapon (SR/RL) generates x(1 + 1.5xcharge) = x2.5
  //   at full charge (einkk positionBurstBonus; the same "focus" concept as the popup
  //   rule — default focus = formation slot 3, i.e. index min(2, n-1); recordings where
  //   the user selected a focus unit pass cfg.focusSlug);
  //   NO auto-efficiency factor and NO extra boss multiplier (both solos matched with
  //   neither: maiden 364x2.5=910/shot + rider 364 exact; takina 560x2.5=1400/shot).
  // Data: data/gauge-per-shot.json (85 datamined via coolguydlm123/nikkecsvlibrary
  // CharacterShotTable, 15 weapon-class modal fallbacks, anis-star battery estimate ⚑).
  // The synergy-API burstGaugePerShot column was DROPPED as a gauge source — its
  // semantics vary per unit (sometimes base, sometimes target, sometimes target x2).
  // full_charge_burst_energy column stored but unused ⚑ (both solo fits are exact
  // without it). Gauge = 10,000 energy (we track percent); locked during FB.
  const AUTO_CORE_RATE = 0.85;
  // Pierce core+body double-hit: community evidence is for MULTI-PART bosses; on the
  // partless test boss the A/B against run A says NO doubling (alice/RH overheat with it
  // once the decoded cadences are in). Kept as a switch for part-ed boss support later.
  const PIERCE_CORE_DOUBLE = false;
  // charge weapons on the CAMERA-FOCUSED unit generate x(1 + 1.5xcharge) = x2.5 at
  // full charge (einkk positionBurstBonus, datamined). Both solo gauge recordings
  // fit this exactly (a solo unit is always focused: maiden 364x2.5=910, takina
  // 560x2.5=1400); the TB2T2 3-unit rotation (40s real) requires trina (unfocused,
  // cinderella held camera) to generate FLAT 720 — the bonus is focus-gated, not
  // weapon-class-wide. Default focus = formation slot 3 (index min(2, n-1));
  // recorded runs pass cfg.focusSlug for the user-selected camera unit.
  const FOCUS_CHARGE_GEN = 2.5;
  // UNFOCUSED_CHARGE_GEN ⚑: no direct measurement exists for an UNfocused charge
  // unit's full-charge gen (solos are always focused). Flat x1.0 makes every
  // SR/RL-heavy 5-unit fight 10-20% cold vs the anchored totals; the old validated
  // calibration was effectively x1.75 (0.7 auto-efficiency x 2.5 charge scale), so
  // that factor is retained for unfocused charge units until a recording with a
  // visible gauge bar and an unfocused SR settles it (candidate: the datamined
  // full_charge_burst_energy column, ~250, may be the real additive mechanism).
  const UNFOCUSED_CHARGE_GEN = 2.2;
  const focusIdx =
    cfg.focusSlug !== undefined
      ? Math.max(0, chars.findIndex((c) => c.slug === cfg.focusSlug))
      : Math.min(2, chars.length - 1);
  // per-trigger gen vs the stage target, in gauge-percent units (JSON is energy/100)
  const gaugePerShot = (u: UnitState) => {
    const entry = (gaugeTable as Record<string, { targetPerTrigger?: number }>)[u.char.slug];
    const per = (entry?.targetPerTrigger ?? 40) / 100;
    const isCharge = (u.char.weapon === 'SR' || u.char.weapon === 'RL') && !u.swap;
    if (!isCharge) return per;
    return per * (u.idx === focusIdx ? FOCUS_CHARGE_GEN : UNFOCUSED_CHARGE_GEN);
  };
  const addGauge = (u: UnitState, frame: number, energyPct: number) => {
    if (fbEndFrame > frame || stage !== 0) return; // locked during FB and the chain
    if (process.env.DBG_GAUGE && frame < 30 * FPS) {
      console.log(`[g] t=${(frame / FPS).toFixed(2)} ${u.char.slug} +${(energyPct * u.burstGenMult * (1 + stat(u, 'burstGenPct', frame) / 100)).toFixed(2)} gauge=${gauge.toFixed(1)}`);
    }
    gauge = Math.min(
      100,
      gauge + energyPct * u.burstGenMult * (1 + stat(u, 'burstGenPct', frame) / 100)
    );
  };
  const shotGauge = (u: UnitState, frame: number, hitFraction = 1) => {
    const rounds = u.char.weapon === 'MG' ? u.char.hitsPerShot : 1;
    addGauge(u, frame, gaugePerShot(u) * rounds * hitFraction);
  };
  // one skill-damage impact (flatDamage proc, dot tick) = one target-base hit of gen
  // (maiden's rider measured exactly her target per-shot value, 364, no focus bonus)
  const skillGauge = (u: UnitState, frame: number) => {
    const entry = (gaugeTable as Record<string, { targetPerTrigger?: number }>)[u.char.slug];
    const per = (entry?.targetPerTrigger ?? 40) / 100;
    addGauge(u, frame, per / (u.char.weapon === 'SG' ? 10 : u.char.hitsPerShot || 1));
  };

  const transitionFrames = BOSS_RANGE_SCRIPT.slice(1).map((r) => r.fromSec * FPS);
  const bandAt = (frame: number): 'near' | 'mid' | 'midfar' | 'far' => {
    let band = BOSS_RANGE_SCRIPT[0].band;
    for (const r of BOSS_RANGE_SCRIPT) if (frame >= r.fromSec * FPS) band = r.band;
    return band;
  };
  const bossUnhittable = (frame: number) =>
    transitionFrames.some((t) => frame >= t && frame < t + UNHITTABLE_FRAMES);

  let gauge = 0;
  // 0 = filling (gauge builds); 1..3 = burst chain stages. Opening the chain
  // CONSUMES the gauge (einkk zeroes the meter when stage 1 opens); hits during the
  // chain and during full burst generate nothing (einkk: gen only at stage 0). B1/B2
  // casts open the next stage with a 10s window (datamined burst_duration 1000 =
  // 10.00s); if the window expires without a cast the chain COLLAPSES back to
  // filling and a full refill is needed — this is what stretches rotations when no
  // Burst 3 is off cooldown (TB2T2 measured 40s: fill ~8s -> chain -> stage-3 window
  // expires (cindy still on CD) -> refill -> second chain completes at her CD).
  let stage: 0 | 1 | 2 | 3 = 0;
  let stageGapFrames = 0;
  let stageExpireFrame = Infinity; // stage-2/3 window deadline (stage 1 never expires)
  const STAGE_WINDOW_FRAMES = 600; // burst_duration 1000 (=10s) standard
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
    // casterMaxHpPct buffs arrive as flat Max HP (converted at apply time)
    // VIDEO-MEASURED (cindy e3, 2026-07-13): "ATK = % of final Max HP" conversions count
    // the unit's OWN Max HP (incl. own-kit stacks) but NOT ally-granted Max HP buffs —
    // FB proc popups match own-HP math within 2% early AND late, and would be ~28% higher
    // if rouge's grants fed the conversion.
    const liveMaxHp = u.maxHp;
    return (
      u.staticAtk * (1 + stat(u, 'atkPct', frame) / 100) +
      stat(u, 'casterAtkPct', frame) +
      (stat(u, 'atkOfMaxHpPct', frame) / 100) * liveMaxHp
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
      noRange?: boolean;
      noFb?: boolean;
      projFlavor?: 'attachment' | 'explosion';
    }
  ) {
    const fb = fbEndFrame > frame;
    // +30% effective-range bonus: band-gated per weapon class (test-boss movement script);
    // riders (noRange) and RLs never receive it.
    const inRange =
      cfg.rangeBonus &&
      !opts.noRange &&
      u.char.weapon !== 'RL' &&
      RANGE_ELIGIBLE[bandAt(frame)].has(u.char.weapon);
    let major = 1 + (fb && !opts.noFb ? 0.5 : 0) + (inRange ? 0.3 : 0);
    if (opts.crit) {
      const critRate = Math.min(1, Math.max(0, (u.critRate + stat(u, 'critRatePct', frame)) / 100));
      major += critRate * ((u.critDamage - 100) / 100 + stat(u, 'critDamagePct', frame) / 100);
    }
    if (opts.core && cfg.coreHitRate > 0) {
      // AUTO_CORE_RATE ⚑ (2026-07-13): auto-aim never converges on the core — measured
      // reticle floor ~12.5px vs ~1px manual (JP frame analysis), ~18-20% effective
      // accuracy loss on auto. Even at "100% core exposure" a fraction of auto shots
      // land off-core. Calibrated against the validated-fight anchors.
      major +=
        cfg.coreHitRate * AUTO_CORE_RATE *
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
    // Q10: Pierce Damage ▲ empowers Pierce-tagged units' attacks — a Damage Up
    // bucket addition, only for units whose kit is Pierce-tagged (hasPierce).
    const pierce = u.hasPierce ? stat(u, 'pierceDamagePct', frame) : 0;
    // Q9 A/B: Prydwen says projExpl also hits regular RL normal attacks
    // "as ATK DMG on the base multiplier". Off by default (our validated rule is
    // flavored-hits-only); on → RL normals get projExpl in the Damage Up bucket.
    const rlNormalProjExpl =
      (cfg.projExplOnRlNormals ?? true) && u.char.weapon === 'RL' && opts.category === 'normal'
        ? stat(u, 'projectileExplosionPct', frame)
        : 0;
    const dmgUp =
      1 +
      (stat(u, 'attackDamagePct', frame) +
        (opts.sustained ? stat(u, 'sustainedDamagePct', frame) : 0) +
        (opts.sequential ? stat(u, 'sequentialDamagePct', frame) : 0) +
        (opts.trueFlavor ? stat(u, 'trueDamagePct', frame) : 0) +
        (advantaged(u) ? stat(u, 'elemAdvantageDamagePct', frame) : 0) +
        pierce +
        rlNormalProjExpl) /
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
    // DBG_UNIT=<slug> [DBG_N=<count>]: log per-instance bucket decomposition (video
    // popup reconciliation — popups show single non-crit/crit instances, so compare
    // against major recomputed without the crit expectation)
    if (process.env.DBG_UNIT === u.char.slug && (u as any).__dbgN !== -1) {
      (u as any).__dbgN = ((u as any).__dbgN ?? 0) + 1;
      const lim = Number(process.env.DBG_N ?? 30);
      if ((u as any).__dbgN <= lim) {
        console.log(
          `[dbg ${u.char.slug}] t=${(frame / FPS).toFixed(2)} ${opts.category} atkPct=${atkPct.toFixed(1)} ` +
          `baseAtk=${baseAtk.toFixed(0)} major=${major.toFixed(3)} elem=${elem.toFixed(3)} charge=${charge.toFixed(3)} ` +
          `dmgUp=${dmgUp.toFixed(4)} taken=${taken.toFixed(3)} dmg=${dmg.toFixed(0)}`
        );
        // DBG_BUFFS=1: dump the unit's live buff entries with each logged instance
        if (process.env.DBG_BUFFS) {
          for (const b of u.buffs) {
            if (b.expiresFrame === null || b.expiresFrame > frame) {
              console.log(
                `    [buff] ${b.key} stat=${b.stat} val=${b.value} stacks=${b.stacks} ` +
                `ends=${b.expiresFrame === null ? 'inf' : (b.expiresFrame / FPS).toFixed(2)}`
              );
            }
          }
        }
      } else (u as any).__dbgN = -1;
    }
    u.damage[opts.category] += dmg;
  }

  function resolveTargets(t: TargetDef, ownerIdx: number): UnitState[] {
    switch (t.kind) {
      case 'self': return [units[ownerIdx]];
      case 'allies': return units;
      case 'burstCasters': {
        const casters = rotationCasters.map((i) => units[i]);
        // optional stage filter (Ada S1: "all BURST 3 allies who previously used their
        // Burst Skill" — B1/B2 casters excluded)
        const byElement = t.element ? casters.filter((u) => u.char.element === t.element) : casters;
        if (t.stage === undefined) return byElement;
        return byElement.filter(
          (u) =>
            (t.stage === 3 && (u.char.burst === 'III' || u.lambdaStage === 3)) ||
            (t.stage === 2 && u.char.burst === 'II') ||
            (t.stage === 1 && u.char.burst === 'I')
        );
      }
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
      case 'alliesOfElementWeapon':
        return units
          .filter((u) => u.char.element === t.element && u.char.weapon === t.weapon)
          .slice(0, t.count ?? 1); // units[] is slot order: leftmost first
      case 'selfAndAdjacent':
        return units.filter((u) => Math.abs(u.idx - ownerIdx) <= t.sides);
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
    // (everyNOffset shifts the phase: fire when activations ≡ offset mod N)
    if (block.everyN) {
      const off = block.everyNOffset ?? 0;
      if (activations < Math.max(off, 1) || (activations - off) % block.everyN !== 0) return;
    }
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
              // KR stacking rule: same buff (stat+value) from the same skill slot of the
              // same caster OVERWRITES/refreshes across trigger blocks, never co-stacks
              applyBuff(
                enemyBuffs,
                `${ownerIdx}:${block.slot}:${e.stat}:${e.value}`,
                e.stat, e.value, e.durationSec, e.maxStacks ?? 1, frame
              );
            }
            // other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0
            break;
          }
          const value =
            e.stat === 'casterAtkPct' ? (e.value / 100) * owner.staticAtk
            : e.stat === 'casterMaxHpPct' ? (e.value / 100) * owner.maxHp
            : e.value;
          const statKey = e.stat === 'casterMaxHpPct' ? ('maxHpFlat' as StatKey) : e.stat;
          // always-on triggers keep their buffs up regardless of listed duration
          const alwaysOn =
            block.trigger.kind === 'passive' || block.trigger.kind === 'bossElement';
          for (const t of resolveTargets(block.target, ownerIdx)) {
            // KR stacking rule (game-mechanics.md §11): the same buff (stat+value) from
            // the same skill slot of the same caster overwrites/refreshes across trigger
            // blocks instead of co-stacking (e.g. Crown's two S1 "Reloading Speed ▲
            // 44.35%" lines). Different skills / different casters still stack.
            applyBuff(
              t.buffs, `${ownerIdx}:${block.slot}:${statKey}:${e.value}`, statKey, value,
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
          skillGauge(owner, frame); // skill-damage hits generate weapon-base gauge
          // U10 ANSWERED (Test Battery 2 Test 1, 2026-07-13): burst-skill damage does NOT
          // get the +50% full-burst major. Cinderella's nuke popup (run-B order, cindy
          // focus) read non-crit 4,066,936 / crit 6,100,403 (×1.5) — 98.7% of the no-FB
          // branch (4,120,347 / 6,180,521) and a 34% miss for the FB branch (6,180,521
          // non-crit). Live buffs at cast DO apply (trina's +20.9% attack damage was in
          // the measured value). Skill 1/2 procs get FB by actual timing (the per-unit
          // noFb flags cover the verified exceptions).
          // U1 ANSWERED (2026-07-13, datamined FunctionTable + Prydwen + JP verification):
          // function-type "additional damage" CRITS at the caster's rate, never cores,
          // never gets range; FB applies by actual proc timing. Crit is on by default
          // (set crit:false only for verified non-critting sources).
          dealDamage(owner, e.atkPct, frame, {
            crit: e.crit !== false,
            core: e.core === true,
            charge: false,
            noRange: true, // riders never get the +30% range bonus (user rule, 2026-07-13)
            noFb: e.noFb === true || (block.slot === 'burst' && block.trigger.kind === 'burstCast'),
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
            noRange: e.noRange === true,
            noFb: e.noFb === true,
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
            trueNormals: e.trueNormals,
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
        case 'burstFirst':
          for (const t of resolveTargets(block.target, ownerIdx)) t.burstFirstPending = true;
          break;
        case 'reenterStage':
          break; // handled by the rotation (stage hold) after the cast resolves
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
            noRange: true,
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

  units.forEach((u) =>
    u.blocks.forEach((b, bi) => {
      if (b.trigger.kind === 'teamAmmo') teamAmmoBlocks.push({ unitIdx: u.idx, block: b, bi, residual: 0 });
    })
  );

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
      stage = 0;
    }

    // ---- burst rotation ----
    // the gauge only builds OUTSIDE full burst; during FB it is locked
    // gauge accrues via shotGauge() on each pull (see firePull)
    if (stageGapFrames > 0) stageGapFrames--;
    if (!fbActive && stage === 0 && gauge >= 100) {
      gauge = 0; // the chain consumes the gauge (refill required if it collapses)
      stage = 1;
      stageExpireFrame = Infinity;
    }
    if (!fbActive && stage >= 2 && frame >= stageExpireFrame) {
      rotationLog.push(`${(frame / FPS).toFixed(1)}s  CHAIN EXPIRED at stage ${stage} (refill)`);
      stage = 0;
      stageExpireFrame = Infinity;
    }
    if (!fbActive && stage >= 1 && stageGapFrames === 0) {
      const want = romanStage[stage];
      const eligible = (u: UnitState) => {
        if (u.burstCdFrames > 0) return false;
        if (u.char.burst === 'Λ') {
          // pinned Λ (e.g. "Red Hood operates as B2") only fills its chosen stage
          return u.lambdaStage === null || u.lambdaStage === stage;
        }
        return u.char.burst === want || u.extraStages.has(stage);
      };
      // burst-order overrides: a pending burstFirst unit (Prika duet opener) outranks
      // everything; then max-MP priority (Maiden); then the leftmost order.
      // (A least-recently-burst round-robin was tried 2026-07-13 for run B's cindy/neon
      // alternation — it broke every comp with a bench B3: helm and maiden started
      // bursting where the real fights never pick them. The alternation falls out of
      // leftmost + real cooldowns + rotation length instead; keep leftmost.)
      const cand =
        units.find((u) => u.burstFirstPending && eligible(u)) ??
        units.find((u) => u.mpPriority && u.fbMissedSinceBurst >= u.mpThreshold && eligible(u)) ??
        units.find(eligible);
      if (cand) {
        if (process.env.DBG_CD) {
          console.log(`[cd] t=${(frame / FPS).toFixed(2)} stage=${stage} cast=${cand.char.slug} cdWas=${cand.burstCdFrames} cdSec=${cand.char.burstCooldownSec}`);
        }
        cand.burstFirstPending = false;
        cand.burstCasts++;
        cand.lastBurstCastFrame = frame;
        cand.burstCdFrames = Math.round(cand.char.burstCooldownSec * FPS);
        rotationCasters.push(cand.idx);
        rotationLog.push(`${(frame / FPS).toFixed(1)}s  B${want} ${cand.char.name}`);
        const castStage = stage;
        // PER-UNIT BURST TIMING (video-measured 2026-07-13, U10): most nukes land with
        // FB active (frame-0 rule: +50% FB, entry auras, same-cast stage buffs — e.g.
        // rapi-RH, validated across five fights). Units flagged burstSnapshotsPreFb
        // (cinderella, via her e3 focus video) resolve their burst damage BEFORE full
        // burst and same-frame stage buffs register — the JP/einkk use-time snapshot.
        if (cand.burstSnapshotsPreFb) {
          cand.blocks.forEach((b, bi) => {
            if (b.trigger.kind === 'burstCast' && (b.trigger.stage ?? castStage) === castStage) {
              applyBlock(cand.idx, b, bi, frame);
            }
          });
        }
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
        // Burst-cast blocks resolve BEFORE full-burst-entry triggers (measured, test
        // battery 2 test 2, 2026-07-13): cinderella's nuke popup carried trina's
        // cast-granted attack damage but NOT anis-star's full-burst-entry aura (neither
        // its flat-ATK grant nor its attack damage) — with the aura the prediction is
        // 34-49% hot, without it the match is 0.99 on two separate casts. One physical
        // rule covers this and the noFb exemption: at the B3-cast instant Full Burst
        // has not begun, so the +50% major and every "during Full Burst" buff are
        // equally absent from cast-instant burst damage. Stored-hit releases stay
        // AFTER the entry triggers (they detonate inside the window and keep auras).
        if (!cand.burstSnapshotsPreFb) cand.blocks.forEach((b, bi) => {
          if (b.trigger.kind === 'burstCast' && (b.trigger.stage ?? castStage) === castStage) {
            applyBlock(cand.idx, b, bi, frame);
          }
        });
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
                  noRange: true,
                  projFlavor: entry.projFlavor,
                });
                entry.releasable = 0;
              }
            }
          }
          rotationLog.push(`${(frame / FPS).toFixed(1)}s  FULL BURST (until ${(fbEndFrame / FPS).toFixed(1)}s)`);
        }
        cand.fbMissedSinceBurst = 0; // MP spent (blocks above already read it)
        if (castStage !== 3) {
          // "Re-enters Burst Stage N": hold the stage so a second eligible unit
          // can also cast this rotation (Tia + Anis:Star pairing)
          const reenters = cand.blocks.some(
            (b) =>
              b.trigger.kind === 'burstCast' &&
              (b.trigger.stage ?? castStage) === castStage &&
              b.effects.some((e) => e.kind === 'reenterStage' && e.stage === castStage)
          );
          if (reenters && units.some((u) => u.idx !== cand.idx && eligible(u))) {
            stageGapFrames = STAGE_CAST_GAP_FRAMES; // stage stays; next pick is another unit
          } else {
            stage = (stage + 1) as 1 | 2 | 3;
            stageGapFrames = STAGE_CAST_GAP_FRAMES;
            stageExpireFrame = frame + STAGE_WINDOW_FRAMES;
          }
        }
      } else {
        stallFrames++;
      }
    }

    // ---- boss unhittable windows (range transitions) ----
    const unhittable = bossUnhittable(frame);
    if (unhittable && transitionFrames.includes(frame)) {
      // window start: fast reloaders (effective reload <= 1s) snap-refill their mag
      for (const u of units) {
        const effReload = reloadFramesNeeded(u.char.reloadFrames ?? 0, stat(u, 'reloadSpeedPct', frame));
        if (effReload <= FPS && !u.reloading) u.ammo = maxAmmo(u, frame);
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
        u.mgIdleFrames++; // MG spin winds down while stunned (decay applied on resume)
        continue;
      }

      if (u.reloading) {
        u.mgIdleFrames++; // spin winds down during the reload (decay applied on resume)
        u.reloadProgress += 1;
        if (u.reloadProgress >= reloadFramesNeeded(u.char.reloadFrames, stat(u, 'reloadSpeedPct', frame))) {
          u.reloading = false;
          u.reloadProgress = 0;
          u.ammo = maxAmmo(u, frame);
        }
        continue;
      }

      // boss unhittable (range transition): hold fire; in-progress reloads
      // (handled above) still advance through the window
      if (unhittable) {
        u.mgIdleFrames++;
        continue;
      }

      const unlimited = sum(u.buffs, 'unlimitedAmmo', frame) > 0;

      const chargeFrames = u.swap?.chargeFrames ?? u.char.chargeFrames;
      if (chargeFrames > 0) {
        // RL/SR (or swapped charge weapon): charge → fire full-charge shot → recharge.
        // Standard SRs insert a bolt-cycle recovery (not charge-speed-scaled) after
        // each shot; swap states and noBoltRecovery units are exempt.
        if (u.boltRecoveryFrames > 0) {
          u.boltRecoveryFrames--;
        } else {
          // Charge Speed is SUBTRACTIVE on charge time (decoded game data + einkk:
          // effective time = base x (1 - sumCS), floored at 1 frame; StatChargeTime is
          // a negative % on charge TIME). Excess past 100% does nothing except for kits
          // with an explicit conversion (Red Hood S1). Evaluated live each frame so CS
          // buffs mid-charge shorten the remaining charge.
          u.chargeProgress += 1;
          // Swap states with an explicit cadence are fire-rate-gated (decoded: Red Wolf
          // rate_of_fire 200rpm; eunhwa/nayuta/maxwell cycles hand-measured) — charge
          // speed does not shorten them.
          const cs =
            u.swap?.chargeFrames != null
              ? 0
              : Math.min(100, Math.max(0, stat(u, 'chargeSpeedPct', frame)));
          const needed = Math.max(1, Math.round(chargeFrames * (1 - cs / 100)));
          if (u.chargeProgress >= needed) {
            u.chargeProgress = 0;
            firePull(u, frame, true, unlimited);
            // release latency applies to ALL release-fired charge weapons (SR + RL);
            // autofire units are exempted via charFixes.noBoltRecovery (user-tested
            // 2026-07-13: old-style = diesel-WS, mint, prika, ada, velvet; autofire =
            // neon-VE, anis: star, liberalio; cinderella custom wind-up has no delay)
            if ((u.char.weapon === 'SR' || u.char.weapon === 'RL') && !u.swap && !u.noBoltRecovery) {
              u.boltRecoveryFrames = SR_BOLT_RECOVERY_FRAMES;
            }
          }
        }
      } else if (u.char.weapon === 'MG') {
        if (u.mgIdleFrames > 0) {
          // wind-down: retrace the ladder at MG_WINDDOWN_DECAY x after the grace period
          const lost = MG_WINDDOWN_DECAY * Math.max(0, u.mgIdleFrames - MG_WINDDOWN_GRACE_FRAMES);
          if (lost > 0) {
            const pos = Math.max(0, MG_LADDER_CUM[Math.min(u.mgRampRound, MG_RAMP_INTERVALS.length)] - lost);
            let round = 0;
            while (round < MG_RAMP_INTERVALS.length && MG_LADDER_CUM[round + 1] <= pos) round++;
            u.mgRampRound = round;
            u.mgCooldown = 0;
          }
          u.mgIdleFrames = 0;
        }
        // Measured wind-up ladder: round n+1 lands MG_RAMP_INTERVALS[n] frames after
        // round n (then 1/frame at steady state). Attack-speed compresses the ladder.
        const speedMult =
          1 + (stat(u, 'attackSpeedPct', frame) + stat(u, 'fireRatePct', frame)) / 100;
        u.mgCooldown -= speedMult;
        while (u.mgCooldown <= 0 && !u.reloading) {
          // one belt round; a "pull" (damage event) lands every hitsPerShot rounds
          u.fireAcc += 1;
          if (u.fireAcc >= u.char.hitsPerShot) {
            u.fireAcc -= u.char.hitsPerShot;
            firePull(u, frame, false, unlimited);
          }
          const iv =
            u.mgRampRound < MG_RAMP_INTERVALS.length ? MG_RAMP_INTERVALS[u.mgRampRound] : 1;
          u.mgRampRound++;
          u.mgCooldown += iv;
        }
      } else {
        const speedMult =
          1 + (stat(u, 'attackSpeedPct', frame) + stat(u, 'fireRatePct', frame)) / 100;
        const rate = (u.pullsPerSec ?? PULLS_PER_SEC[u.char.weapon] ?? 4) / FPS;
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
        skillGauge(units[d.ownerIdx], frame); // dot ticks generate (wiki3: Haran 290/tick)
        dealDamage(units[d.ownerIdx], d.atkPct, frame, {
          crit: false, core: false, charge: false, category: d.category,
          distributed: d.distributed, sustained: d.sustained, sequential: d.sequential,
          trueFlavor: d.trueFlavor, noRange: true, noFb: d.noFb,
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
    const isMg = u.char.weapon === 'MG' && !u.swap;
    const sgFalloff =
      u.char.weapon === 'SG' && !u.swap && bandAt(frame) !== 'near'
        ? SG_OUT_OF_NEAR_HIT_FRACTION
        : 1;
    dealDamage(u, baseMult * normalScale * sgFalloff, frame, {
      crit: true,
      core: !(isMg && u.mgRampRound < MG_NO_CORE_RAMP_ROUNDS),
      charge: charged,
      category: 'normal',
      trueFlavor: !!u.swap?.trueNormals,
    });
    // Pierce double-hit (2026-07-13 research): a Pierce-tagged shot passes through the
    // core and hits the body behind it — two hits per shot on a core-exposed boss
    // (community-verified; the reason Alice/Red Hood overperform). Second hit: same
    // shot, no core bonus. Non-SG only (pellets don't line up core+body per pellet).
    if (PIERCE_CORE_DOUBLE && u.hasPierce && u.char.weapon !== 'SG') {
      dealDamage(u, baseMult * normalScale, frame, {
        crit: true,
        core: false,
        charge: charged,
        category: 'normal',
        trueFlavor: !!u.swap?.trueNormals,
      });
    }
    u.pulls++;
    shotGauge(u, frame, sgFalloff); // out-of-near SG pellets that miss generate nothing

    const extraPerHit = stat(u, 'extraHitDamagePct', frame);
    if (extraPerHit > 0) {
      dealDamage(u, extraPerHit * u.char.hitsPerShot, frame, {
        crit: false, core: false, charge: false, category: 'burst', noRange: true,
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
      for (const t of teamAmmoBlocks) {
        t.residual += consumed;
        const need = (t.block.trigger as { kind: 'teamAmmo'; count: number }).count;
        while (t.residual >= need) {
          t.residual -= need;
          applyBlock(t.unitIdx, t.block, t.bi, frame);
        }
      }
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
      maxHp: u.maxHp,
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
