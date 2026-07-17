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
import type { PreparedUnit } from '../prepare.js';
import gaugeTable from '../../data/gauge-per-shot.json' with { type: 'json' };
import { relationshipBonus } from '../relationship.js';

// Debug taps read env vars only under Node; in the browser bundle this is an empty object.
const ENV: Record<string, string | undefined> =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
import type { Block, ConsolidationConfig, EffectDef, StatKey, TargetDef } from '../skills/types.js';

const FPS = 60;
// Experiment-only slug-scoped knobs (see experiment-harness-ai.md; all default OFF/empty):
// XCRIT=<slug,slug> dot ticks + stored-hit releases roll crit for those units;
// XCORE=<slug,...>  same paths roll core (subject to AUTO_CORE_RATE);
// XINSTEXPL=<slug>  stored hits release each frame DURING full burst instead of
//                   waiting for the next full-burst entry.
const envSlugSet = (v?: string) => new Set((v ?? '').split(',').filter(Boolean));
const XCRIT = envSlugSet(ENV.XCRIT);
const XCORE = envSlugSet(ENV.XCORE);
const XINSTEXPL = envSlugSet(ENV.XINSTEXPL);
// DOTCRIT (2026-07-14): DoT ticks + stored-hit releases roll crit UNIVERSALLY. Mechanic confirmed —
// DoT/function-rider damage crits (never cores): ginmy /nikke_dot_test + maiden-solo footage
// (rider 437296 white / 655945 orange = ×1.5). flatDamage procs already crit by default (dealDamage
// call ~920, see U1 note); this extends the same rule to the dot-tick (1479) and stored-release
// (1259) paths, which were wrongly XCRIT-gated off. Default OFF pending the dot-tick roster recal;
// DOTCRIT=on enables (measure blast radius, recalibrate, then flip the default). Core stays off.
const DOT_CRIT = ENV.DOTCRIT === 'on';
// FBRULE (2026-07-14): candidate HEURISTICS for when SKILL/rider/DoT damage gets the +50% Full Burst
// major. (Range is settled — skills never get the +30% range bonus; noRange is universal.) The
// default 'perkit' uses the calibrated per-unit noFb flags; other rules replace them with a GENERAL
// rule so `scripts/probe/fb-range-lab.ts` can A/B-grade which rule best fits the measured ground truth
// (ein feathers = FB-ON, liberalio proc = FB-ON, scarlet procs = FB-OFF, burst-cast nukes = FB-OFF).
// Burst-cast damage is ALWAYS FB-exempt (U10, measured), regardless of rule.
// DEFAULT = 'perkit' (2026-07-15, temporary): FB is a TIMING/snapshot gate — any non-burst-cast
// skill/rider/DoT landing during the FB window SHOULD get the +50% (JP+KR research, empirical both
// sides; see DECISIONS + open-questions U14). The end-state default is 'timing'. But the old per-kit
// `noFb` flags were calibration RELICS masking cadence over-models on rider-dominant units; flipping
// the global default to 'timing' before those 6 units are retuned makes them run hot. So the default
// stays 'perkit' during the per-unit retune (autonomous-invariant-audit mission); each retuned unit
// gets its `noFb` flag REMOVED (so perkit==timing for it), and once all 6 are green the default flips
// to 'timing' with zero further drift. ENV.FBRULE:
//   timing    : force FB-by-timing for all skills (mission target / A-B)
//   dotfb / seqoff / noskillfb : experiment arms (see fb-range-lab.ts)
// Burst-cast (instant) damage is ALWAYS FB-exempt (snapshots at use-time, before FB flips on).
function skillNoFb(perKitNoFb: boolean, isBurstCast: boolean, flavor: string | undefined): boolean {
  if (isBurstCast) return true; // burst-cast/instant damage lands before FB begins → never +50%
  switch (ENV.FBRULE) {
    case 'timing': return false; // FB by landing timing (mission target; flip default here once all 6 noFb relics are retuned)
    case 'dotfb': return flavor === 'dot' || flavor === 'sustained' ? false : perKitNoFb;
    case 'seqoff': return flavor === 'sequential';
    case 'noskillfb': return true;
    default: return perKitNoFb; // 'perkit' — calibrated per-kit relics; temporary stable baseline during the per-unit retune
  }
}
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
// Q11 calibration (user estimate, flagged for review): rounds fired before the ladder
// reaches its 2-frame portion (the first 18 rounds of each wind-up) don't land on the
// core. ~~MG normals never receive the +30% optimal-range bonus~~ SUPERSEDED (2026-07-14) —
// MEASURED: MGs receive the bonus in the FAR band only (battery 4 crown-solo popup ratios;
// see RANGE_ELIGIBLE below). The wind-up no-core ramp remains calibrated (though the
// battery-4 read saw body-class bursts after every reload, consistent with it).
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
// MG eligibility MEASURED 2026-07-14 (battery 4, crown solo popup ratios): far band ONLY —
// mid/near/midfar all read the no-bonus class signatures (core/body 2.000, crit/core 1.250);
// far reads the bonus signatures (1.769, 1.217). The real trigger is the boss's instantaneous
// distance crossing the MG optimal ring (flips lead/lag scripted boundaries by ~4-6s during
// walks), so this band table is a ±4-6s-edge APPROXIMATION, not a measured-exact timeline.
const RANGE_ELIGIBLE: Record<string, Set<string>> = {
  near: new Set(['SG']),
  mid: new Set(['SMG', 'AR']),
  midfar: new Set(['SR']),
  far: new Set(['SR', 'MG']),
};
// ENV.MGRANGE: experiment-only A/B override ('always' | 'never'; unset = the measured table).
const MG_RANGE_MODE = (globalThis as { process?: { env: Record<string, string | undefined> } })
  .process?.env?.MGRANGE as 'always' | 'never' | undefined;
const UNHITTABLE_FRAMES = 60;
// SG pellet-landing fraction per range band ⚑ (2026-07-15 refit, was a flat near=1.0 / else=0.3 step).
// MEASURED (drake solo, damage-arithmetic + global-total reconciliation, popup-dropout≈1.0 verified:
// docs/probe-data/sg-pellet-landing.json): landing is nearly FLAT ~0.45-0.60 across ALL bands on this
// gappy spider-mech boss — NOT a 1.0→0.3 step. Both edges of the old ⚑ were wrong: near is ~0.60 (open
// gaps in the silhouette let ~4 pellets/shot fly through even up close), NOT 1.0; and mid/far/midfar are
// ~0.45-0.60, NOT 0.30. The old step was calibrated against the OLD flat-0.85 core model (offsetting
// errors); with the range-dependent core model landed, the measured landing is the faithful replacement.
// near 0.60 is a LOWER BOUND (residual invisible-X; the global total caps it ≤0.7-0.8); all values carry
// ±0.10-0.15 systematic beyond Wilson CIs, single-boss (transferable finding is QUALITATIVE: near<1.0,
// range>0.3, ~flat). open-questions A26. ENV.SGLANDING='legacy' reverts to the old near1.0/else0.3 for A/B.
// BOND-TERM RECALIBRATION (2026-07-16, open-questions U18 / U17 coupling): the noir counter-reconciliation
// that SET this table (docs/probe-data/noir-solo-recon.json) reconciled real 64.87M against a sim WITHOUT
// the relationship (bond) bonus (staticAtk 118027). The bond bonus now raises noir's ATK +1.39% (measured,
// scales her pure-SG total linearly), so the base5-calibrated table over-shot by the same +1.39% (noir solo
// 1.006→1.020). Fix = a UNIFORM scalar 118027/119667 = 0.9863 on every band (undoes the term change only;
// the SHAPE stands per U17 HOLD — the class table is not re-litigated). {0.9,1.0,0.75,0.9} × 0.9863 →
// {0.888,0.986,0.740,0.888}; restores noir to its pre-bond calibration point (~1.006). The far-band SHAPE
// deficit (staged far~0.66, U17) is orthogonal and NOT folded in here.
const SG_LANDING_BY_BAND: Record<string, number> =
  ENV.SGLANDING === 'legacy'
    ? { near: 1.0, mid: 0.3, far: 0.3, midfar: 0.3 }
    : ENV.SGLANDING === 'popupcount'
      ? { near: 0.6, mid: 0.6, far: 0.45, midfar: 0.55 }
      : ENV.SGLANDING === 'prebond' // the pre-2026-07-16 base5-calibrated table (A/B)
        ? { near: 0.9, mid: 1.0, far: 0.75, midfar: 0.9 }
        : { near: 0.888, mid: 0.986, far: 0.74, midfar: 0.888 };

// Per-band SG pellet-landing JITTER (2026-07-17, seeded Monte Carlo only). The fixed
// SG_LANDING_BY_BAND table is the expected-value landing; a real fight's per-shot landed-pellet
// count scatters shot-to-shot with boss proximity within a band (brid measured near1 8.52 vs
// near2 9.41 landed/10 in one fight — near is NOT a shot constant). Under a seeded run each SG
// spray shot draws an INTEGER landed-pellet COUNT uniformly from [round(min×pellets),
// round(max×pellets)] and the falloff fraction is count/pellets — a real shot lands a whole
// number of its (hitsPerShot) pellets, not a fraction. Averaging N seeds recovers the band mean
// and the seed sd gives the landing-variance error bar. Expected-value (unseeded) runs keep the
// fixed table unchanged. Ranges as fractions of full pellet count (owner, 2026-07-17):
const SG_LANDING_JITTER: Record<string, { min: number; max: number }> = {
  near:   { min: 0.8, max: 1.0 }, // 10 pellets → {8,9,10}, mean 0.90
  mid:    { min: 0.8, max: 1.0 }, // 10 pellets → {8,9,10}, mean 0.90
  midfar: { min: 0.7, max: 0.9 }, // 10 pellets → {7,8,9},  mean 0.80
  far:    { min: 0.6, max: 0.8 }, // 10 pellets → {6,7,8},  mean 0.70
};
// Standard-normal sample (Box-Muller) from the uniform PRNG; the second normal is discarded.
function gaussian(rng: () => number): number {
  const u1 = rng() || 1e-9; // guard log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
// Draw a whole landed-pellet count with a BELL-CURVE weighting centered on the band mean, rather
// than flat-uniform: map a standard normal onto pellet counts by σ-band — |z|<1σ → the middle
// count, each further whole σ → one pellet outward, clamped to [lo,hi] (so the ≥2σ tail folds
// into the end value). For the 3-wide bands this is exactly ~68% middle / ~16% each outer. The
// MEAN is unchanged from uniform (symmetric); only the spread tightens toward the center count.
function sgLandedPellets(
  band: string,
  pellets: number,
  rng: () => number,
  profile: 'small' | 'medium' | 'large' = 'small',
): number {
  if (profile === 'large') return pellets; // big boss — the whole spray lands, every band
  const j = SG_LANDING_JITTER[band] ?? { min: 1, max: 1 };
  const lo = Math.round(j.min * pellets);
  const hi = Math.round(j.max * pellets);
  const mid = Math.round((lo + hi) / 2);
  const z = gaussian(rng);
  const step = Math.floor(Math.abs(z)); // 0 within ±1σ, 1 in [1,2)σ, … (≥2σ clamps to the end)
  const drawn = z >= 0 ? Math.min(mid + step, hi) : Math.max(mid - step, lo);
  return profile === 'medium' ? Math.min(drawn + 1, pellets) : drawn;
}

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
  // buff counts only while this unit's weaponSwap is live (MEASURED 2026-07-14: SWHA's
  // Fully Active charge/sequential buffs are held per swap round, not for a duration)
  whileSwappedIdx?: number;
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
  // uses-based termination (MEASURED 2026-07-14, SWHA-focus recording: the swap ends right
  // after the Nth swapped shot fires, at variable time — NOT at a fixed duration; untilFrame
  // remains the hard bound, e.g. the 10s burst window)
  maxShots?: number;
  shotsFired?: number;
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
  hasPierce: boolean;     // kit's attacks are Pierce-tagged (Q10)
  consolidation?: ConsolidationConfig; // pellet-consolidation mode config (dorothy-S)
  landedAcc: number;      // landed pellets accrued toward the consolidation trigger (near-gated)
  consolShotsLeft: number; // remaining single-bullet consolidation shots in the current episode
  burstSnapshotsPreFb: boolean; // burst damage resolves pre-FB/pre-stage (per-unit timing)
  ammoRefundPer10: number;  // Bastion cube: bullets refunded per 10 fired
  bulletsSinceRefund: number;
  burstGenMult: number;
  swap: WeaponSwap | null;  // "Changes the weapon in use" state
  stunnedUntilFrame: number; // self-stun (Mast's Hangover): no firing/charging/reloading
  fbMissedSinceBurst: number; // full bursts this unit sat out since it last burst (Maiden:IR MP)
  mpPriority: boolean;       // jump the burst queue once fbMissedSinceBurst hits mpThreshold
  // syncWithFocus: only cast in a chain where the focus (tested) unit also bursts.
  // everyOther: never cast the stage-3 slot in two consecutive full bursts (the Solo
  // control framework's contract — the tested unit alternates with the no-op B3, even
  // when an FB-extending burst would otherwise let the leftmost-wait rule pick it
  // twice in a row).
  burstGate: 'syncWithFocus' | 'everyOther' | null;
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
      coreRate?: number;      // per-release core rate (coreOverride path) — RRH explosions ~1/3
      critRoll?: boolean;     // release rolls crit at the caster's sheet rate (removes the stored-hit crit-OFF exemption)
      instantInFb?: boolean;  // release each FB frame (in-burst attach detonates instantly), not only at FB start
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

// Default seeded-Monte-Carlo sample count for the accuracy/damage surfaces (board-read + kit-status,
// experiment.ts, web damage sim). The dpschart build and the regression gate deliberately DO NOT use
// this — they call runSim directly and stay deterministic expected-value (chart = stable/fast build;
// gate = the FB counts are measured-truth asserts that seeding would jitter). See CLAUDE.md / DECISIONS.
export const DEFAULT_MC_SEEDS = 25;
// Fixed seed base so a given surface's 10-run mean is reproducible AND paired across A/B configs
// (same seed set ⇒ shared variance cancels in comparisons). Matches experiment.ts's 1000+i convention.
export const MC_SEED_BASE = 1000;

// Average an array of same-team SimResults element-wise: every numeric field becomes the per-run mean;
// non-numeric/timeline fields (names, warnings, loadout, rotationLog) are taken from the first run as a
// representative sample. Units are matched by index (same team across runs). Empty array is invalid.
export function meanSimResults(runs: SimResult[]): SimResult {
  if (runs.length === 1) return runs[0];
  const n = runs.length;
  const base = runs[0];
  const mean = (pick: (r: SimResult) => number) => runs.reduce((a, r) => a + pick(r), 0) / n;
  const units: UnitResult[] = base.units.map((u0, idx) => ({
    ...u0,
    totalDamage: mean((r) => r.units[idx].totalDamage),
    dps: mean((r) => r.units[idx].dps),
    share: mean((r) => r.units[idx].share),
    breakdown: {
      normal: mean((r) => r.units[idx].breakdown.normal),
      skill: mean((r) => r.units[idx].breakdown.skill),
      burst: mean((r) => r.units[idx].breakdown.burst),
    },
    pulls: mean((r) => r.units[idx].pulls),
    burstCasts: mean((r) => r.units[idx].burstCasts),
  }));
  return {
    config: base.config,
    units,
    teamDamage: mean((r) => r.teamDamage),
    teamDps: mean((r) => r.teamDps),
    fullBursts: mean((r) => r.fullBursts),
    fullBurstUptime: mean((r) => r.fullBurstUptime),
    rotationStallSec: mean((r) => r.rotationStallSec),
    rotationLog: base.rotationLog,
  };
}

// Seeded-MC convenience wrapper: run nSeeds fixed-seed sims and return their mean (via meanSimResults).
// If cfg.seed is already pinned (a caller wants one specific fight) or nSeeds<=1, it's a single run.
export function runSimMean(
  chars: (CharacterData & { baseStats: any })[],
  mult: LevelMultiplier,
  cfg: SimConfig,
  prepared?: PreparedUnit[],
  nSeeds: number = DEFAULT_MC_SEEDS,
): SimResult {
  if (cfg.seed !== undefined || nSeeds <= 1) return runSim(chars, mult, cfg, prepared);
  const runs: SimResult[] = [];
  for (let i = 0; i < nSeeds; i++) {
    runs.push(runSim(chars, mult, { ...cfg, seed: MC_SEED_BASE + i }, prepared));
  }
  return meanSimResults(runs);
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
    const skills = prepared?.[idx]?.skills;
    if (!skills) {
      // the engine never parses skill prose — callers must prepareTeam/prepareUnit
      // (which resolves the unit's override) before running the sim
      throw new Error(`runSim: "${char.slug}" has no prepared skills — call prepareTeam/prepareUnit first`);
    }
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
    // Relationship (bond) bonus — a flat class×manufacturer stat present in every recording
    // (open-questions U18). Level: per-unit override → cfg default → the manufacturer's max
    // (undefined everywhere = max, which is the scope-lock basis + the web default).
    const rel = relationshipBonus(
      char.class,
      char.manufacturer,
      prepared?.[idx]?.relationshipLevel ?? cfg.relationshipLevel,
    );
      const state: UnitState = {
      idx,
      char,
      staticAtk: atk + flatAtk + rel.atk,
      maxHp:
        characterStat(char.baseStats, mult, 'hp', cfg.level, grade, core) +
        gearHp(char.class, unitOl) +
        (useDoll ? DOLL_HP : 0) +
        rel.hp,
      critRate: char.baseStats.critRate ?? 15,
      critDamage: char.baseStats.critDamage ?? 150,
      doll: useDoll ? dollBonus(char.weapon) : {},
      blocks: activeBlocks,
      warnings: [...skills.warnings],
      hasPierce:
        skills.hasPierce === true ||
        (skills.pierceModes?.includes(selectedMode ?? '') ?? false),
      consolidation: skills.consolidation,
      landedAcc: 0,
      consolShotsLeft: 0,
      burstSnapshotsPreFb: skills.burstSnapshotsPreFb === true,
      ammoRefundPer10: extra.filter((e) => e.stat === 'ammoRefundPer10').reduce((s, e) => s + e.value, 0),
      bulletsSinceRefund: 0,
      burstGenMult:
        1 + extra.filter((e) => e.stat === 'burstGenPct').reduce((s, e) => s + e.value, 0) / 100,
      swap: null,
      stunnedUntilFrame: -1,
      fbMissedSinceBurst: 0,
      mpPriority: prepared?.[idx]?.mpPriority ?? false,
      burstGate: prepared?.[idx]?.burstGate ?? null,
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
  // flighted skill damage: flatDamage with delaySec lands later and snapshots the buff/FB
  // state at LANDING (MEASURED 2026-07-14: rapi-red-hood's 2808% burst nuke is a missile
  // landing ~0.4s post-banner INSIDE her window at the full buffed state — the cast-instant
  // no-FB rule covers cast-instant damage only, landing-timed damage follows actual timing)
  const pendingHits: Array<{
    ownerIdx: number;
    atkPct: number;
    resolveFrame: number;
    crit: boolean;
    core: boolean;
    category: 'skill' | 'burst';
    distributed: boolean;
    sustained: boolean;
    sequential: boolean;
    trueFlavor: boolean;
    projFlavor?: 'attachment' | 'explosion';
  }> = [];
  // teamAmmo triggers: fire whenever TOTAL ally ammo consumed crosses each block's count
  // (infinite-ammo shots never consume, matching the in-game rule)
  const teamAmmoBlocks: Array<{ unitIdx: number; block: Block; bi: number; residual: number }> = [];
  const usedOncePerBattle = new Set<string>();
  const totalFrames = cfg.durationSec * FPS;
  const rotationLog: string[] = [];

  // Monte Carlo mode (cfg.seed set): mulberry32 PRNG — deterministic per seed.
  // rng === null → expected-value sim (crit/core folded into the major bucket,
  // canonical boss timeline, fixed chain gaps). Seeded runs sample the real fight's
  // two dominant variance sources (user, 2026-07-13): per-instance crit/core rolls
  // and the boss's movement-timing jitter (the boss always visits the scripted
  // bands, but transition times drift by a few seconds), plus burst-chain cast-gap
  // jitter. Averaging N seeds ≈ the mean of N real runs, and the seed sd gives the
  // error bar a single real run should be judged against.
  const rng: (() => number) | null =
    cfg.seed === undefined
      ? null
      : (() => {
          let a = (cfg.seed as number) >>> 0;
          return () => {
            a |= 0; a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        })();
  // Boss transition jitter: each transition shifts by up to ±2s, order preserved.
  const rangeScript = BOSS_RANGE_SCRIPT.map((r, i) =>
    rng && i > 0 ? { ...r, fromSec: r.fromSec + (rng() * 4 - 2) } : { ...r }
  ).sort((a, b) => a.fromSec - b.fromSec);

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
  // Auto-aim core rate is RANGE-DEPENDENT per (weapon, band) (2026-07-15 ⚑ refit; overturns the
  // flat per-weapon ⚑ with same-tier footage — AR/SMG/SG solo scope-lock recordings, core popups
  // binned by the boss-range band). Findings (docs/probe-data/coreband2-*.json, Wilson 95% CIs):
  //   • core is STRONGLY range-concentrated: high when the boss is close (near/mid), →~0 far/midfar;
  //   • FB-INDEPENDENT — solo recordings never enter Full Burst, so these are clean out-of-FB reads
  //     (core = aim geometry, unaffected by FB state; cross-checked LM in/out-of-FB ~equal);
  //   • weapon-ordered AR > SMG > SG — one accurate AR bullet cores most; SG's 10-pellet spray finds
  //     the small core least (~7% even point-blank). ALL bands sit far below the old flat 0.85.
  //   • boss is the SAME physical union raid boss across element assignments (owner) → these per-band
  //     values TRANSPORT across every validation comp.
  // MG/SR/RL: not measured per-band, kept flat HI (research: near-100% once warmed; MG gated by its
  // wind-up ramp elsewhere). ENV.ACR overrides everything; CORERATE=flat → old flat 0.85 for A/B;
  // CORERATEBAND=off → the prior flat per-weapon table (HI for MG/SR/RL, LO for AR/SMG/SG) for A/B;
  // CORERATEHI sweeps the MG/SR/RL value; CORERATELO is the AR/SMG/SG flat-fallback value.
  // Still ⚑ — the geometric distance→core-size model + SG extreme-near (0-25) research refine it;
  // AR near is PROVISIONAL pending a cleaner AR re-record (Moran-T/Snow White). See open-questions A9.
  const HI = ENV.CORERATEHI !== undefined ? Number(ENV.CORERATEHI) : 0.95;
  const LO = ENV.CORERATELO !== undefined ? Number(ENV.CORERATELO) : 0.85;
  const CORE_BY_WEAPON_BAND: Record<string, Record<string, number>> = {
    // near      mid       midfar    far
    AR:  { near: 0.40, mid: 0.30,  midfar: 0.03,   far: 0.0 },   // scarlet (near ⚑ 0.34–0.44 reads)
    SMG: { near: 0.28, mid: 0.244, midfar: 0.076,  far: 0.059 }, // chisato hardened (n≈45–95/band)
    SG:  { near: 0.048, mid: 0.0,  midfar: 0.003, far: 0.0 },   // noir counter-rederived (near 0.072 was ~1.5x inflated by the popup-ratio white under-count; true = cores/true-pellets ~0.045-0.05)
  };
  const coreByWeaponBand = (weapon: string, band: string): number => {
    const row = CORE_BY_WEAPON_BAND[weapon];
    return row ? (row[band] ?? LO) : HI; // MG/SR/RL (no row) → flat HI
  };
  const acrFor = (weapon: string, band: 'near' | 'mid' | 'midfar' | 'far'): number =>
    ENV.ACR !== undefined ? Number(ENV.ACR)
    : ENV.CORERATE === 'flat' ? 0.85
    : ENV.CORERATEBAND === 'off'
      ? ((weapon === 'MG' || weapon === 'SR' || weapon === 'RL') ? HI : LO)
      : coreByWeaponBand(weapon, band);
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
  // UNFOCUSED_CHARGE_GEN — MEASURED 1.0 (test battery 3 A1/A2 pair, 2026-07-13):
  // takina UNfocused in a 2-unit fight steps the gauge +5.6-6.5%/shot (her flat 560
  // target; even the additive full_charge_burst_energy hypothesis is excluded — that
  // would read +8.1%), while the paired control with her focused steps +14-15%
  // (560x2.5, same as her solo). The focus bonus is focus-ONLY. The old x2.2 ⚑ was
  // compensating for per-unit skill-generation quirks and the (then-wrong) anis-star
  // shot row, both now modeled from measurements.
  const UNFOCUSED_CHARGE_GEN = 1.0;
  const focusIdx =
    cfg.focusSlug !== undefined
      ? Math.max(0, chars.findIndex((c) => c.slug === cfg.focusSlug))
      : Math.min(2, chars.length - 1);
  // per-trigger gen vs the stage target, in gauge-percent units (JSON is energy/100).
  // flatPerTrigger = per-unit kit generation per shot (helm's S2 +14.31: synergy
  // fixed_add + rl3 arithmetic, twice-confirmed) — flat, no boss doubling, no focus.
  const gaugePerShot = (u: UnitState) => {
    const entry = (gaugeTable as Record<string, { targetPerTrigger?: number; flatPerTrigger?: number }>)[
      u.char.slug
    ];
    const per = (entry?.targetPerTrigger ?? 40) / 100;
    const flat = (entry?.flatPerTrigger ?? 0) / 100;
    const isCharge = (u.char.weapon === 'SR' || u.char.weapon === 'RL') && !u.swap;
    if (!isCharge) return per + flat;
    return per * (u.idx === focusIdx ? FOCUS_CHARGE_GEN : UNFOCUSED_CHARGE_GEN) + flat;
  };
  const addGauge = (u: UnitState, frame: number, energyPct: number) => {
    // Generation is LOCKED during Full Burst (user-confirmed 2026-07-13, correcting an
    // over-read of the bar anatomy: the fast post-FB refill is charge units releasing
    // held full charges a split second after FB ends + normal team rates — with the
    // measured ~3s post-FB chain-open delay, high-generation comps finish refilling
    // before the chain can open anyway, so rotations stay cooldown/chain-bound).
    // Also no generation during the chain itself (stages 1-3, einkk).
    if (fbEndFrame > frame || stage !== 0) return;
    if (ENV.DBG_GAUGE && frame < 30 * FPS) {
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

  const transitionFrames = rangeScript.slice(1).map((r) => Math.round(r.fromSec * FPS));
  const bandAt = (frame: number): 'near' | 'mid' | 'midfar' | 'far' => {
    let band = rangeScript[0].band;
    for (const r of rangeScript) if (frame >= r.fromSec * FPS) band = r.band;
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
  // full bursts the focus (tested) unit has cast — drives the syncWithFocus skip cadence
  // (a gated unit sits out the full burst after every 3rd of the focus unit's bursts).
  let focusBurstCount = 0;
  // stage-3 caster of the most recent full burst — drives the everyOther gate
  let lastStage3Caster = -1;
  let chainBlockedUntil = 0; // post-full-burst chain-open block (measured ~3s)
  const POST_FB_CHAIN_DELAY_FRAMES = 180;
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
        b.stat === stat &&
        (b.expiresFrame === null || b.expiresFrame > frame) &&
        (b.whileSwappedIdx === undefined || units[b.whileSwappedIdx].swap != null)
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
      coreOverride?: number;   // per-shot core rate override (pellet-consolidation single bullet) — bypasses acrFor
      extraDmgUpPct?: number;  // per-shot Damage-Up addition (consolidation's window-only Attack Damage ▲%)
      pierceActive?: boolean;  // per-shot Pierce-tag (consolidation bullet) → pierceDamagePct goes live (dmg only, no double-hit)
    }
  ) {
    const fb = fbEndFrame > frame;
    // +30% effective-range bonus: band-gated per weapon class (test-boss movement script);
    // riders (noRange) and RLs never receive it.
    const inRange =
      cfg.rangeBonus &&
      !opts.noRange &&
      u.char.weapon !== 'RL' &&
      (u.char.weapon === 'MG' && MG_RANGE_MODE !== undefined
        ? MG_RANGE_MODE === 'always'
        : RANGE_ELIGIBLE[bandAt(frame)].has(u.char.weapon));
    let major = 1 + (fb && !opts.noFb ? 0.5 : 0) + (inRange ? 0.3 : 0);
    if (opts.crit) {
      const critRate = Math.min(1, Math.max(0, (u.critRate + stat(u, 'critRatePct', frame)) / 100));
      const critBonus = (u.critDamage - 100) / 100 + stat(u, 'critDamagePct', frame) / 100;
      // seeded: Bernoulli roll, full bonus or nothing (mean is identical; the roll
      // reproduces real-run variance and any future on-crit trigger coupling)
      major += rng ? (rng() < critRate ? critBonus : 0) : critRate * critBonus;
    }
    if (opts.core && cfg.coreHitRate > 0) {
      // AUTO_CORE_RATE ⚑ (2026-07-13): auto-aim never converges on the core — measured
      // reticle floor ~12.5px vs ~1px manual (JP frame analysis), ~18-20% effective
      // accuracy loss on auto. Even at "100% core exposure" a fraction of auto shots
      // land off-core. Calibrated against the validated-fight anchors.
      const coreBonus =
        (u.char.coreAttackMultiplier - 100) / 100 +
        (stat(u, 'coreDamagePct', frame) + (u.doll.coreDamagePct ?? 0)) / 100;
      const acr = opts.coreOverride ?? acrFor(u.char.weapon, bandAt(frame));
      major += rng
        ? (rng() < cfg.coreHitRate * acr ? coreBonus : 0)
        : cfg.coreHitRate * acr * coreBonus;
    }
    // elemAdvantageDamagePct lives in the ELEMENT bucket (MEASURED 2026-07-14, battery 5:
    // privaty popup ratio 2.8244 vs Element-model 2.821 / DamageUp-model 1.995, three band
    // pairs + proc + nuke classes; matches the einkk reference). ENV.ELEMADV='damageup'
    // restores the legacy additive placement for A/B comparison only.
    const elemAdvInElement = ENV.ELEMADV !== 'damageup';
    const elem = advantaged(u)
      ? 1.1 +
        (stat(u, 'elementDamagePct', frame) +
          (elemAdvInElement ? stat(u, 'elemAdvantageDamagePct', frame) : 0)) /
          100
      : 1;
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
    const pierce = u.hasPierce || opts.pierceActive ? stat(u, 'pierceDamagePct', frame) : 0;
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
        (advantaged(u) && !elemAdvInElement ? stat(u, 'elemAdvantageDamagePct', frame) : 0) +
        pierce +
        (opts.extraDmgUpPct ?? 0) +
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
    if (ENV.DBG_UNIT === u.char.slug && (u as any).__dbgN !== -1) {
      (u as any).__dbgN = ((u as any).__dbgN ?? 0) + 1;
      const lim = Number(ENV.DBG_N ?? 30);
      if ((u as any).__dbgN <= lim) {
        console.log(
          `[dbg ${u.char.slug}] t=${(frame / FPS).toFixed(2)} ${opts.category} atkPct=${atkPct.toFixed(1)} ` +
          `baseAtk=${baseAtk.toFixed(0)} major=${major.toFixed(3)} elem=${elem.toFixed(3)} charge=${charge.toFixed(3)} ` +
          `dmgUp=${dmgUp.toFixed(4)} taken=${taken.toFixed(3)} dmg=${dmg.toFixed(0)}`
        );
        // DBG_BUFFS=1: dump the unit's live buff entries with each logged instance
        if (ENV.DBG_BUFFS) {
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
      case 'alliesOfWeapon': // weapon-typed, class-blind ("all shotgun-wielding allies")
        return units.filter(
          (u) => u.char.weapon === t.weapon && (!t.excludeSelf || u.idx !== ownerIdx)
        );
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
    frame: number,
    whileSwappedIdx?: number
  ) {
    const expiresFrame = durationSec != null ? frame + Math.round(durationSec * FPS) : null;
    const existing = list.find((b) => b.key === key);
    if (existing) {
      if (existing.expiresFrame !== null && existing.expiresFrame <= frame) existing.stacks = 0;
      existing.stacks = Math.min(existing.stacks + 1, maxStacks);
      existing.expiresFrame = expiresFrame;
      existing.value = value;
      existing.whileSwappedIdx = whileSwappedIdx;
    } else {
      list.push({ key, stat, value, stacks: 1, maxStacks, expiresFrame, whileSwappedIdx });
    }
  }

  function applyBlock(ownerIdx: number, block: Block, blockIdx: number, frame: number) {
    const owner = units[ownerIdx];
    const bKey = `${ownerIdx}:${block.slot}:${blockIdx}`;
    // Abort-gates are evaluated BEFORE the everyN activation counter, so `everyN`
    // counts only activations that actually pass the gates — e.g. soda's "after casting
    // 3 normal attacks DURING Full Burst": out-of-FB casts must NOT advance the counter.
    // (No override combines everyN with these gates today — verified — so this is
    // behavior-neutral for every existing unit; the regression snapshot is the control.)
    // core-gated blocks never fire in zero-core fights
    if (block.requiresCore && cfg.coreHitRate <= 0) return;
    // full-burst-state gate ('inFb' / 'outFb'), evaluated when the trigger fires
    if (block.fbGate) {
      const fbActive = fbEndFrame > frame;
      if ((block.fbGate === 'inFb') !== fbActive) return;
    }
    // weapon-swap-state gate: block fires only while the owner's kit weaponSwap
    // is (or is not) active — e.g. SWHA's Fully Active extra volley rides only
    // her two swapped full-charge shots (gamewith JP: buffs held per full-charge
    // shot, 1発間維持)
    if (block.swapGate) {
      const swapped = owner.swap != null && owner.swap.untilFrame > frame;
      if ((block.swapGate === 'swapped') !== swapped) return;
    }
    const activations = (owner.blockActivations.get(bKey) ?? 0) + 1;
    owner.blockActivations.set(bKey, activations);
    // everyN gate: effects land only on every Nth trigger activation
    // (everyNOffset shifts the phase: fire when activations ≡ offset mod N)
    if (block.everyN) {
      const off = block.everyNOffset ?? 0;
      if (activations < Math.max(off, 1) || (activations - off) % block.everyN !== 0) return;
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
              e.maxStacks ?? 1, frame,
              e.whileSwapped ? ownerIdx : undefined
            );
            // Max Ammo ▼ clips the CURRENT belt when it lands (user-confirmed);
            // increases never clip. Stacking stays additive inside maxAmmo().
            if (e.stat === 'maxAmmoPct' && e.value < 0) {
              t.ammo = Math.min(t.ammo, maxAmmo(t, frame));
            }
          }
          break;
        }
        case 'flatDamage': {
          // pull-count gate (MEASURED 2026-07-14): rapi-red-hood's burst nuke fires only
          // with >=1 sticky charge banked (>=120 shots at cast — her fire-weak banner 1 at
          // ~68 shots had NO nuke; all >=120 banners did)
          if (e.requiresPulls != null && owner.pulls < e.requiresPulls) break;
          const flavorOpts = {
            crit: e.crit !== false,
            core: e.core === true,
            category: category as 'skill' | 'burst',
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
          };
          // flighted damage (delaySec): lands later, snapshots buffs/FB at LANDING — the
          // cast-instant no-FB rule below does NOT apply (FB by actual landing time)
          if (e.delaySec != null) {
            pendingHits.push({
              ownerIdx,
              atkPct: e.atkPct,
              resolveFrame: frame + Math.round(e.delaySec * FPS),
              ...flavorOpts,
            });
            break;
          }
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
            ...flavorOpts,
            charge: false,
            noRange: true, // riders never get the +30% range bonus (user rule, 2026-07-13)
            noFb: skillNoFb(e.noFb === true, block.slot === 'burst' && block.trigger.kind === 'burstCast', e.flavor),
          });
          break;
        }
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
            // dots preserve original burst-cast handling (FB by e.noFb + timing, no auto-exempt) so
            // 'perkit' is byte-identical; the heuristic rules still apply via the non-burst branch.
            noFb: skillNoFb(e.noFb === true, false, e.flavor ?? 'dot'),
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
            maxShots: e.maxShots,
            shotsFired: 0,
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
        case 'heal':
          // a heal has no modeled HP value; it emits a RECOVERY event to its targets,
          // firing their 'recovery'-triggered blocks (heal-synergy kits — Helm's
          // full-charge heal drives Crown's "when recovery takes effect → team ATK ▲").
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.blocks.forEach((rb, ri) => {
              if (rb.trigger.kind === 'recovery') applyBlock(t.idx, rb, ri, frame);
            });
          }
          break;
        case 'shield':
          // no shield HP pool is modeled (v1 boss deals no damage); like 'heal', it
          // emits a SHIELDED event to its targets, firing their 'shielded'-triggered
          // blocks (shield-synergy kits — e.g. naga's shield-gated lines).
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.blocks.forEach((rb, ri) => {
              if (rb.trigger.kind === 'shielded') applyBlock(t.idx, rb, ri, frame);
            });
          }
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
            coreRate: e.core,
            critRoll: e.crit,
            instantInFb: e.instantInFb,
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
      // MEASURED (run-I bar anatomy, 2026-07-13): the next chain cannot open until
      // ~3s after full burst ends (chain glow at FB-end +3.0s even with the gauge
      // full at +1.2s and the Burst-1 cooldown ready at +1.5s) — the post-full-burst
      // camera/re-engage window. Generation keeps running during it.
      // ENV.ROTMODEL='refill': experiment arm removing the fixed post-FB block (chain opens
      // on gauge-full; SWHA 13-window bar traces). HELD — floor removal breaks the pinned
      // wind-weak 13s until the T5/T1 refill over-speed is measured (see cycle-rework design
      // in experiment-harness-ai.md). Default 'floor' = current measured-constant behavior.
      chainBlockedUntil =
        ENV.ROTMODEL === 'refill' ? frame : frame + POST_FB_CHAIN_DELAY_FRAMES;
    }

    // ---- burst rotation ----
    // the gauge only builds OUTSIDE full burst; during FB it is locked
    // gauge accrues via shotGauge() on each pull (see firePull)
    if (stageGapFrames > 0) stageGapFrames--;
    if (!fbActive && stage === 0 && gauge >= 100 && frame >= chainBlockedUntil) {
      gauge = 0; // the chain consumes the gauge (refill required if it collapses)
      stage = 1;
      stageExpireFrame = Infinity;
    }
    if (!fbActive && stage >= 2 && frame >= stageExpireFrame) {
      rotationLog.push(`${(frame / FPS).toFixed(1)}s  CHAIN EXPIRED at stage ${stage} (refill)`);
      stage = 0;
      stageExpireFrame = Infinity;
    }
    // Burst casts are BLOCKED while the boss is off-screen during a range transition
    // (user, 2026-07-13): if a transition lands mid-chain, the next cast waits out the
    // ~1s unhittable window. This is the real source of knife-edge full-burst-count
    // variance between otherwise identical runs — a chain-vs-transition collision
    // depends on the boss's timing jitter. The stage window keeps ticking while blocked.
    if (!fbActive && stage >= 1 && stageGapFrames === 0 && !bossUnhittable(frame)) {
      const want = romanStage[stage];
      const fillsStage = (u: UnitState) => {
        if (u.char.burst === 'Λ') {
          // pinned Λ (e.g. "Red Hood operates as B2") only fills its chosen stage
          return u.lambdaStage === null || u.lambdaStage === stage;
        }
        return u.char.burst === want || u.extraStages.has(stage);
      };
      // syncWithFocus gate (Mast in the DPS-chart Hyper Carry frameworks): a gated
      // unit may only take its stage while the focus/tested unit is itself off cooldown
      // and about to complete the chain — so Mast bursts iff the tested B3 does this
      // rotation, never coincidentally alongside a Helm-completed chain. AND she sits
      // out the full burst after every 3rd of her bursts (Mast's Hangover cycle): when
      // this stage's focus burst would be the 4th/8th/… she skips it (Crown fills in).
      const gatePasses = (u: UnitState) => {
        if (u.burstGate === 'syncWithFocus') {
          return units[focusIdx].burstCdFrames === 0 && (focusBurstCount + 1) % 4 !== 0;
        }
        // everyOther (Solo framework): a gated unit never takes stage 3 twice in a
        // row — it sits out the full burst right after one it cast, letting the
        // next stage-filling unit (the no-op B3) alternate in.
        if (u.burstGate === 'everyOther' && stage === 3) return lastStage3Caster !== u.idx;
        return true;
      };
      const eligible = (u: UnitState) =>
        u.burstCdFrames === 0 && fillsStage(u) && gatePasses(u);
      // burst-order overrides: a pending burstFirst unit (Prika duet opener) outranks
      // everything; then max-MP priority (Maiden, opt-in for manual-play comps); then
      // slot-order priority WITH waiting: inside a timed stage window the chain WAITS
      // for the leftmost stage-filling unit whose cooldown ends before the window
      // closes, rather than instantly handing the cast to a lower-priority ready unit.
      // (User ruling 2026-07-13: a 3rd-from-left Burst 3 like Maiden in the elec-weak
      // fight NEVER bursts on auto — no comp has enough CDR for the leftmost two to
      // both sit out a whole window. Without the wait, rotation jitter occasionally
      // let her in, bifurcating her damage across Monte Carlo seeds. A least-recently-
      // burst round-robin was tried earlier the same day and rejected: bench B3s cast
      // where real fights never pick them.)
      const inWindow = stage >= 2 && stageExpireFrame !== Infinity;
      const next = inWindow
        ? units.find((u) => fillsStage(u) && gatePasses(u) && frame + u.burstCdFrames < stageExpireFrame)
        : units.find(eligible);
      const cand =
        units.find((u) => u.burstFirstPending && eligible(u)) ??
        units.find((u) => u.mpPriority && u.fbMissedSinceBurst >= u.mpThreshold && eligible(u)) ??
        (next && next.burstCdFrames === 0 ? next : undefined);
      if (cand) {
        if (ENV.DBG_CD) {
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
          lastStage3Caster = cand.idx;
          if (cand.idx === focusIdx) focusBurstCount++;
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
                  crit: entry.critRoll || DOT_CRIT || XCRIT.has(u.char.slug),
                  // per-entry core RATE (RRH explosions ~1/3) via the coreOverride path —
                  // aim/range-independent; falls back to the env XCORE gate when unset
                  core: entry.coreRate != null || XCORE.has(u.char.slug),
                  coreOverride: entry.coreRate,
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
          const chainGap = rng
            ? STAGE_CAST_GAP_FRAMES + Math.round((rng() - 0.5) * 18)
            : STAGE_CAST_GAP_FRAMES;
          if (reenters && units.some((u) => u.idx !== cand.idx && eligible(u))) {
            stageGapFrames = chainGap; // stage stays; next pick is another unit
          } else {
            stage = (stage + 1) as 1 | 2 | 3;
            stageGapFrames = chainGap;
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

    // ---- in-FB instant stored-hit release: a rocket that ATTACHES during Full Burst
    // detonates immediately in the same window (RRH), instead of only batch-releasing at the
    // next FB start. Per-entry `instantInFb` (RRH S2 explosion) drives it permanently;
    // ENV.XINSTEXPL forces it on for experiments. Same core/flavor treatment as the FB-start batch. ----
    if (fbEndFrame > frame) {
      for (const u of units) {
        const envForce = XINSTEXPL.has(u.char.slug);
        for (const entry of u.storedHits.values()) {
          if (!envForce && !entry.instantInFb) continue;
          if (entry.freshFrame < frame) {
            entry.releasable += entry.fresh;
            entry.fresh = 0;
            entry.freshFrame = frame;
          }
          if (entry.releasable > 0) {
            dealDamage(u, entry.atkPct * entry.releasable, frame, {
              crit: entry.critRoll || DOT_CRIT || XCRIT.has(u.char.slug),
              core: entry.coreRate != null || XCORE.has(u.char.slug),
              coreOverride: entry.coreRate,
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
    }

    // ---- flighted skill hits (flatDamage delaySec) — resolve at landing state ----
    for (let i = pendingHits.length - 1; i >= 0; i--) {
      const p = pendingHits[i];
      if (frame >= p.resolveFrame) {
        skillGauge(units[p.ownerIdx], frame); // gauge at landing (locked in-FB as usual)
        dealDamage(units[p.ownerIdx], p.atkPct, frame, {
          crit: p.crit,
          core: p.core,
          charge: false,
          noRange: true,
          category: p.category,
          distributed: p.distributed,
          sustained: p.sustained,
          sequential: p.sequential,
          trueFlavor: p.trueFlavor,
          projFlavor: p.projFlavor,
        });
        pendingHits.splice(i, 1);
      }
    }

    // ---- dots ----
    for (const d of dots) {
      if (frame === d.nextTickFrame && frame <= d.endFrame) {
        skillGauge(units[d.ownerIdx], frame); // dot ticks generate (wiki3: Haran 290/tick)
        dealDamage(units[d.ownerIdx], d.atkPct, frame, {
          crit: DOT_CRIT || XCRIT.has(units[d.ownerIdx].char.slug),
          core: XCORE.has(units[d.ownerIdx].char.slug),
          charge: false, category: d.category,
          distributed: d.distributed, sustained: d.sustained, sequential: d.sequential,
          trueFlavor: d.trueFlavor, noRange: true, noFb: d.noFb,
          projFlavor: d.projFlavor,
        });
        d.nextTickFrame += d.intervalFrames;
      }
    }
  }

  function firePull(u: UnitState, frame: number, charged: boolean, unlimited: boolean) {
    const band = bandAt(frame);
    const bandSgFalloff =
      u.char.weapon === 'SG' && !u.swap
        ? rng
          ? sgLandedPellets(band, u.char.hitsPerShot, rng, cfg.bossPelletProfile) /
            u.char.hitsPerShot
          : SG_LANDING_BY_BAND[band]
        : 1;
    // Pellet-consolidation mode (dorothy-S, open-questions A26): "after hitting the target with 80
    // pellets, for 3 rounds pellet count is fixed at 1" + Pierce + 98% hit + Attack-dmg. MEASURED
    // (exact-counter re-read, dorothy-solo-reanalysis.json + owner): "3 rounds" = 3 SHOTS/episode (the
    // ammo counter drops by 3), NOT 3 magazines; and it fires the WHOLE fight at ALL bands (the 98% hit
    // rate lands the single bullet even at range) — NOT near-only. The trigger accrues fired pellets
    // (10/shot on a large boss "hits the target" with ~all pellets) → 80 = ~8 spray shots/episode →
    // ~30% of shots consolidate, matching the read. Each consolidation shot carries the FULL shot's
    // damage in one aligned bullet (pelletFraction 1.0), reliably cores (coreRate), Pierce, no range.
    const consol = u.consolidation;
    let consolidating = false;
    if (consol) {
      if (u.consolShotsLeft > 0) consolidating = true;
      else {
        u.landedAcc += u.char.hitsPerShot;
        if (u.landedAcc >= consol.triggerLandedPellets) {
          u.landedAcc = 0;
          u.consolShotsLeft = consol.shots;
          consolidating = true;
        }
      }
    }
    const normalScale = consolidating
      ? 1
      : 1 + ((u.doll.normalAttackPct ?? 0) + stat(u, 'normalAttackPct', frame)) / 100;
    const baseMult = u.swap?.damagePct ?? u.char.normalAttackMultiplier;
    const isMg = u.char.weapon === 'MG' && !u.swap;
    const sgFalloff = consolidating && consol ? consol.pelletFraction : bandSgFalloff;
    dealDamage(u, baseMult * normalScale * sgFalloff, frame, {
      crit: true,
      core: !(isMg && u.mgRampRound < MG_NO_CORE_RAMP_ROUNDS),
      charge: charged,
      category: 'normal',
      trueFlavor: !!u.swap?.trueNormals,
      coreOverride: consolidating && consol ? consol.coreRate : undefined,
      extraDmgUpPct: consolidating && consol ? consol.attackDamagePct : undefined,
      pierceActive: consolidating && consol ? consol.pierce : undefined,
      // the consolidated single bullet takes NO effective-range bonus (MEASURED: its non-core
      // value = full-shot base × dmgUp with major ≈ 1.0, not 1.3 — dorothy-solo-reanalysis.json)
      noRange: consolidating || undefined,
    });
    if (consolidating) u.consolShotsLeft--;
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
        // RRH rocket meter fills 2× faster in her Full Burst: threshold 120 → countInFb (60)
        // while in FB. The counter carries over across the boundary (no reset) — the faster
        // threshold just consumes the accrued fill, so a near-full meter fires on FB entry.
        const threshold =
          fbEndFrame > frame && b.trigger.countInFb != null ? b.trigger.countInFb : b.trigger.count;
        let c = (u.hitCounters.get(key) ?? 0) + u.char.hitsPerShot;
        while (c >= threshold) {
          c -= threshold;
          applyBlock(u.idx, b, bi, frame);
        }
        u.hitCounters.set(key, c);
      }
      // chargeCounter: cycling per-full-charge phase counter (only full charges advance it).
      // Fires ONE phase (block.effects[phase], in order) when its threshold accrues — `count`
      // charges/phase outside Full Burst, `countInFb` (default 1) inside — so procs cluster into
      // the FB window (SBS 3/6/9 → 1/2/3). The +50% FB is applied per-proc by dealDamage's timing.
      else if (b.trigger.kind === 'chargeCounter' && charged) {
        const pk = `cc${bi}p`, ck = `cc${bi}c`;
        let phase = u.hitCounters.get(pk) ?? 0;
        let charges = (u.hitCounters.get(ck) ?? 0) + 1;
        // the lowered thresholds are a 10s SELF-buff from the owner's OWN burst cast
        // (SBS burst: "Changes Full Charge attack count required for Skill 1 to 1/2/3 for 10s"),
        // NOT the team Full Burst window — she doesn't burst every full burst.
        const inBurst = u.lastBurstCastFrame >= 0 && frame - u.lastBurstCastFrame < 10 * FPS;
        // per-phase thresholds (datamined "attack count required to N times" is per-phase); a scalar
        // means the same threshold every phase (back-compat). phase P uses reqs[P].
        const reqs = inBurst ? (b.trigger.countInFb ?? 1) : b.trigger.count;
        const thr = Array.isArray(reqs) ? (reqs[phase] ?? reqs[reqs.length - 1]) : reqs;
        if (charges >= thr) {
          charges = 0;
          const bKey = `${u.idx}:${b.slot}:${bi}`;
          const activations = (u.blockActivations.get(bKey) ?? 0) + 1;
          u.blockActivations.set(bKey, activations);
          applyEffect(u.idx, b, b.effects[phase], `${bKey}:${phase}`, activations, frame);
          phase = (phase + 1) % b.effects.length;
        }
        u.hitCounters.set(pk, phase);
        u.hitCounters.set(ck, charges);
      }
    });

    // uses-based weapon-swap termination (MEASURED 2026-07-14): the swap ends right after
    // its Nth shot fires — checked AFTER block dispatch so swapGate effects ride this shot
    if (u.swap?.maxShots != null) {
      u.swap.shotsFired = (u.swap.shotsFired ?? 0) + 1;
      if (u.swap.shotsFired >= u.swap.maxShots) u.swap = null;
    }

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
