// sim.ts lines 1-850: imports, types, setup, main loop start
// Extracted from src/engine/sim.ts

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
import {
  ACCURACY_CIRCLE_SCALE,
  BAND_CORE_PX,
  BAND_SG_HIT_FRAC,
  circleDpx,
  circleDpxAtHr,
  coneDelta,
  coneSigma,
  CONE_SIGMA_SHRINK,
  coreFracGeo,
  offsetCoreProb,
  pelletCoreFrac,
  pelletLandFrac,
  pelletSigma,
} from './sg-geometry.js';

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
// Helm SR (22f, docs/"helm 2 6 mag rotations.mov") and Maiden:IR RL (21f avg, her video).
// "New-style" AUTOFIRING guns fire at baked cadence with NO latency. The split is DATAMINED
// per unit via role.weapon.shot_detail.input_type: 'UP' = release-fired (latent, +22f);
// 'DOWN_Charge' = autofire (no latency: liberalio SR + anis-star/cinderella/neon-vision-eye RL,
// each user-confirmed). input_type is the SSOT (isAutofireCharge below) — NOT weapon type: BOTH
// SR and RL default to latent, only DOWN_Charge is exempt. (SWHA is 'UP' → she DOES take the
// recovery; her old noBoltRecovery exemption was wrong, removed 2026-07-17.) Swap states are
// exempt too. charFixes.noBoltRecovery survives as a dormant manual hand-tune hook (no active
// override sets it; baselines cite it as the "if measured autofire, set this" recipe).
const SR_BOLT_RECOVERY_FRAMES = 22;
// Datamined autofire tell: new-style charge weapons fire on press (DOWN_Charge), skipping the
// release latency; old-style release-fired weapons are 'UP'. undefined role → treated as
// release-fired (the safe SR/RL default).
const isAutofireCharge = (char: CharacterData): boolean =>
  (char.role?.weapon as { shot_detail?: { input_type?: string } } | undefined)
    ?.shot_detail?.input_type === 'DOWN_Charge';

// Canon fire cadence per weapon type (doc values; per trigger pull).
// MG's "60 rps" counts belt rounds (hits): pulls/s = 60 / hitsPerShot and each
// pull consumes hitsPerShot ammo. MG wind-up follows the measured frame ladder
// below (docs/nikke-mg-windup-model.md), not a fitted curve.
// Per-class pull cadence. AR 12 (=720rpm), SG 1.5 (=90rpm), SMG 24 (=1440rpm) all match the datamined
// weapon-table rate_of_fire (role.weapon.shot_detail; game source). SMG adopted 20→24 on 2026-07-17
// (role-audit D.2, OWNER DECISION a): the game source is authoritative and 24 holds EVERY SMG
// measured-FB comp (chisato/nayuta/quency/little-mermaid) except PH-water, which tips 12→13 — the one
// comp with two SMGs + little-mermaid's `teamAmmo`-400 → 37% fillGauge, whose +20% ammo rate trips that
// big fill ~one cycle early. PH-water's FB was reclassified into the known ±1 burst-cycle-boundary set
// (T4/T7/N2/N4/N5) in regression.ts — an UNDERSTOOD boundary over-prediction, not an ununderstood drift.
// Two alternatives were tested & refuted before adopting: recalc gauge-per-shot ×20/24 (gauge/sec held
// constant → still 13), and quency consumed=2 for her 2 muzzles (0 FB change — crown MG dominates the
// teamAmmo counter). Per-unit measured cadences override via charFixes.pullsPerSec (jill 2.5). MG uses
// the wind-up ladder, not this.
const PULLS_PER_SEC: Record<string, number> = {
  AR: 12, SMG: 24, SG: 1.5, MG: 60, Pistol: 4,
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
// ENV.SGLANDING==='geo' (⚑ EXPERIMENT ARM, default off): the hand-outlined per-band SG HIT
// fraction from the accuracy-circle study (BAND_SG_HIT_FRAC, docs/data/sg-calc/, workstream C) —
// the geometric fraction of the fixed spread circle on the boss body = expected fraction of pellets
// that land. This is the noir single-boss silhouette; per-boss transfer needs bossPelletProfile +
// real per-boss footage (measured landings win where they exist, hard-constraint #3).
const SG_LANDING_BY_BAND: Record<string, number> =
  ENV.SGLANDING === 'legacy'
    ? { near: 1.0, mid: 0.3, far: 0.3, midfar: 0.3 }
    : ENV.SGLANDING === 'popupcount'
      ? { near: 0.6, mid: 0.6, far: 0.45, midfar: 0.55 }
      : ENV.SGLANDING === 'prebond' // the pre-2026-07-16 base5-calibrated table (A/B)
        ? { near: 0.9, mid: 1.0, far: 0.75, midfar: 0.9 }
        : ENV.SGLANDING === 'geo'
          ? { ...BAND_SG_HIT_FRAC }
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
const SG_LANDING_JITTER: Record<string, { min: number; max: number }> =
  ENV.SGLANDING === 'geo'
    ? // geo arm: center the ±0.1 jitter window on the geometric hit fraction (workstream C) so the
      // seeded-by-default board actually sees the geo means; same window width as the owner table.
      Object.fromEntries(
        Object.entries(BAND_SG_HIT_FRAC).map(([b, f]) => [
          b,
          { min: Math.max(0, f - 0.1), max: Math.min(1, f + 0.1) },
        ]),
      )
    : {
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
  stat: StatKey | 'unlimitedAmmo' | 'maxHpFlat';
  value: number;          // per stack; for casterAtkPct this is flat ATK
  stacks: number;
  maxStacks: number;
  expiresFrame: number | null;
  // buff counts only while this unit's weaponSwap is live (MEASURED 2026-07-14: SWHA's
  // Fully Active charge/sequential buffs are held per swap round, not for a duration)
  whileSwappedIdx?: number;
  // stack-ramp (theme 3): if set (>0), the buff's contribution ramps linearly 0 → full over
  // rampFrames from startFrame (its first application), then holds — a value authored at max
  // stacks but whose stacks really accrue over the opening seconds. undefined = instant-to-max.
  rampFrames?: number;
  startFrame?: number;
  // caster (source) unit index. Own-kit Max-HP grants (casterIdx === target) feed the target's
  // atkOfMaxHpPct conversion via effectiveAtk; ally-granted Max HP does NOT (cindy e3 video rule).
  casterIdx?: number;
  // live resource-scaled value: when set, the buff's contribution is caster.resources[name] × mult
  // (re-read each frame), ignoring `value` — soda's Critical Damage ▲1.32%/Golden-Chip.
  perResource?: { name: string; mult: number };
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
  crit?: boolean; // per-DoT crit opt-in (isabel measured); overrides the global DOT_CRIT gate when set
  projFlavor?: 'attachment' | 'explosion';
  // live resource-scaled DoT: each tick recomputes atkPct = owner.resources[name] × mult
  perResource?: { name: string; mult: number };
}

interface WeaponSwap {
  untilFrame: number;
  damagePct: number;
  chargeFrames?: number;
  chargeMultPct?: number;
  maxAmmo?: number;
  pullsPerSec?: number;  // swap weapon's own fire cadence (moran: 24/s vs base AR 12/s)
  weapon?: string;       // swap weapon's class override (nayuta: SR mode) → range/core banding
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
  hasPierce: boolean;     // kit's attacks are Pierce-tagged (Q10) — STATIC (whole-fight or mode-gated)
  pierceUntilFrame: number; // timed "Gain Pierce for N sec" window end (0 = none); pierce active when > frame
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
  // live named resource pools (soda-twinkling-bunny's Golden Chip) + their [min,max] bounds
  resources: Map<string, number>;
  resourceCfg: { name: string; initial: number; min?: number; max?: number }[];
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
    // static team-composition gate (`teamHas`): the block is active only when
    // SOME OTHER ally matches ALL specified facets (element/class/weapon/burst,
    // ANDed). Owner never counts; burst matches literally (Λ ≠ 'III'). Omit =
    // always active, so this is inert until an override opts in.
    const teamHasMatch = (need: NonNullable<Block['teamHas']>) =>
      chars.some(
        (c, i) =>
          i !== idx &&
          (!need.element || c.element === need.element) &&
          (!need.class || c.class === need.class) &&
          (!need.weapon || c.weapon === need.weapon) &&
          (!need.burst || c.burst === need.burst)
      );
    const activeBlocks = skills.blocks.filter(
      (b) =>
        (!b.formation || (b.formation === 'hasB1') === teamHasB1) &&
        (!b.mode || b.mode === selectedMode) &&
        (!b.teamHas || teamHasMatch(b.teamHas))
    );
    const unitOl = prepared?.[idx]?.ol ?? cfg.ol;
    // Limit-Break stars (grade 0-3) and Core enhancement (0-7) are per-unit;
    // fall back to the global copies count when a unit doesn't specify them.
    const grade = Math.min(3, Math.max(0, prepared?.[idx]?.stars ?? fallback.grade));
    const core = Math.min(7, Math.max(0, prepared?.[idx]?.core ?? fallback.core));
    const pu = prepared?.[idx];
    // Gear: explicit synced gear-piece stats override the per-class OL-level table.
    const gAtk = pu?.gearAtk ?? gearAtk(char.class, unitOl);
    const gHp = pu?.gearHp ?? gearHp(char.class, unitOl);
    // Doll: resolved per-unit contribution (rarity/level), else the global cfg.doll
    // fallback (maxed-SSR boolean). dollAtk/dollHp undefined = fall back.
    const dAtk = pu?.dollAtk ?? (cfg.doll ? DOLL_ATK : 0);
    const dHp = pu?.dollHp ?? (cfg.doll ? DOLL_HP : 0);
    const dWeapon = pu?.dollWeapon ?? (cfg.doll ? dollBonus(char.weapon) : {});
    const atk =
      characterStat(char.baseStats, mult, 'atk', cfg.level, grade, core) + gAtk + dAtk;
    const extra = pu?.extraStats ?? [];
    const flatAtk = extra.filter((e) => e.stat === 'flatAtk').reduce((s, e) => s + e.value, 0);
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
        gHp +
        dHp +
        rel.hp,
      critRate: char.baseStats.critRate ?? 15,
      critDamage: char.baseStats.critDamage ?? 150,
      doll: dWeapon,
      blocks: activeBlocks,
      warnings: [...skills.warnings],
      hasPierce:
        skills.hasPierce === true ||
        (skills.pierceModes?.includes(selectedMode ?? '') ?? false),
      pierceUntilFrame: 0,
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
      resources: new Map((skills.resources ?? []).map((r) => [r.name, r.initial])),
      resourceCfg: skills.resources ?? [],
      burstCdFrames: 0,
      lastBurstCastFrame: -1,
      damage: { normal: 0, skill: 0, burst: 0 },
      pulls: 0,
      burstCasts: 0,
    };
    // cube / OL-line stats become permanent buffs
    for (const e of extra) {
      if (e.stat === 'ammoRefundPer10' || e.stat === 'burstGenPct' || e.stat === 'flatAtk') continue;
      // "Max HP ▲ x%" extras (Vigor cube): convert the percentage into a flat Max-HP
      // SELF-grant (casterIdx === own idx) so it raises the unit's live Max HP and feeds
      // HP-scaling ATK (atkOfMaxHpPct) exactly like an own-kit maxHpFlat buff — see effectiveAtk.
      if (e.stat === 'maxHpPct') {
        state.buffs.push({
          key: `extra:${idx}:maxHpFlat`,
          stat: 'maxHpFlat' as StatKey,
          value: (e.value / 100) * state.maxHp,
          casterIdx: idx,
          stacks: 1,
          maxStacks: 1,
          expiresFrame: null,
        });
        continue;
      }
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
  // heal-over-time recovery emitters: a per-second heal ("Recovers X% every 1 sec for N sec")
  // emits its first recovery event immediately and schedules the remaining ticks here, so an
  // on-recovery consumer (Crown's "when recovery takes effect → team ATK ▲") stays refreshed for
  // the whole HoT window instead of seeing one proc per activation (hard rule 2 / engine gap #1).
  const recoveryEmitters: Array<{
    targetIdxs: number[];
    nextTickFrame: number;
    intervalFrames: number;
    ticksRemaining: number;
  }> = [];
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
  // ── Workstream A (⚑ EXPERIMENT ARM, ENV.ACR_GEO, default off) ────────────────────────────────
  // Geometric core-hit fraction from the accuracy-circle px calibration: a concentric core inside
  // the accuracy circle ⇒ fraction of shots on core ≈ area ratio (core_D_px / circle_D_px)²
  // (docs/data/sg-calc/, src/engine/sg-geometry.ts). Two arms, both default-off (byte-stable):
  //   'replace'/'on'/'raw' → the RAW geometric fraction. With the 2026-07-17 PEAK-anchored proportional
  //     px map (circle 0.648·scale; AR 48px), AR near/mid geo = 0.42/0.34 ≈ measured 0.40/0.30, so this
  //     no longer overshoots AR (the old 29px map made it ~2.5x hot). BOARD A/B: 'replace' improves every
  //     HR-neutral SMG unit toward 1 (chisato 1.171→1.140, quency 1.040→0.991, lm 1.088→1.069) and is
  //     ~neutral on AR; the residual hot cells are AR midfar/far, where core collapses out-of-range
  //     (a range-eligibility effect the area ratio does not model). Promote-candidate for SMG core.
  //   'shape'/'fill' → geometry supplies only the inter-band SHAPE, anchored to the measured near
  //     cell (measured > geometry, hard-constraint #3): acr(band) = measured_near · geo(band)/geo(near).
  //     This is the recommended ruling — measured cells stay pinned, geometry fills the falloff.
  // MG/SR/RL (no accuracy-circle model) always fall through to the base table.
  const geoCoreFrac = (weapon: string, band: string): number | null => {
    const scale = ACCURACY_CIRCLE_SCALE[weapon];
    const coreD = BAND_CORE_PX[band];
    if (scale === undefined || coreD === undefined) return null;
    return coreFracGeo(coreD, circleDpx(scale));
  };
  const acrForGeo = (weapon: string, band: string, mode: string): number | null => {
    const geo = geoCoreFrac(weapon, band);
    if (geo === null) return null; // no circle model → let acrFor use the base table
    if (mode === 'shape' || mode === 'fill') {
      const geoNear = geoCoreFrac(weapon, 'near');
      const measuredNear = CORE_BY_WEAPON_BAND[weapon]?.near;
      if (!geoNear || measuredNear === undefined) return null;
      return Math.min(1, (measuredNear / geoNear) * geo);
    }
    return geo; // raw
  };
  const acrFor = (weapon: string, band: 'near' | 'mid' | 'midfar' | 'far'): number => {
    if (ENV.ACR !== undefined) return Number(ENV.ACR);
    if (ENV.CORERATE === 'flat') return 0.85;
    if (ENV.CORERATEBAND === 'off')
      return (weapon === 'MG' || weapon === 'SR' || weapon === 'RL') ? HI : LO;
    if (ENV.ACR_GEO) {
      const g = acrForGeo(weapon, band, ENV.ACR_GEO);
      if (g !== null) return g;
    }
    return coreByWeaponBand(weapon, band);
  };

  // ── Hit-Rate → core-hit multiplier (⚑ DERIVED ESTIMATE; LIVE by default, HRCORE=0 disables for A/B) ──
  // Higher Hit Rate shrinks the auto-aim reticle (TricK's MEASURED SG reticle regression) → tighter bloom
  // → more shots land on the core. This ADDS a multiplier on top of the measured CORE_BY_WEAPON_BAND
  // table; it NEVER refits it (hard-constraint #3). DERIVED by transitivity, NOT measured — p comes from
  // reticle GEOMETRY, never from fitting the board (measured > fudge; the board is a TEST, not a fit target).
  // Reproduces the plan's pre-registered predictions: jill AR +80.78% → 0.68 (in CI 0.78[0.55,0.91]);
  // chisato SMG +22.37% → 0.31 (in CI 0.34[0.22,0.48]). SAT=1 bracket misses jill low ⇒ data leans steep.
  // See docs/handoffs/2026-07-17-hitrate-core-implementation-plan.md.  hr=0 (no HR source) ⇒ M=1 ⇒ byte-identical.
  //
  //   M(w,hr) = ( reticle(0) / reticle(hr) ) ^ p_w              — band-INDEPENDENT: per-band core size cancels,
  //                                                                so one M scales the whole CORE row at live hr.
  //   reticle(hr)/reticle(0) = max(FLOOR_FRAC, 1 − s·max(0,hr))  — R4: FLOORED so M is finite + monotone for
  //                                                                every hr≥0 (the raw 1/(1−s·hr) has a pole ~118).
  //     s = 1.4285/168.3931 = 0.008483 /pt   (TricK AUTO SG reticle line −1.4285·x+168.3931 px; the SAME
  //                                            fractional shrink is transported to AR/SMG — premise P2, ⚑ unmeasured)
  //     FLOOR_FRAC = 1 − s·100 = 0.15169     (TricK AUTO 12.5px-radius floor at x=100; auto never converges to 0)
  //   p_w = ln(core_base_near_w) / ln(SAT / reticle0_w)          (solve core_base = (SAT/reticle0)^p)
  //     reticle0_w = datamined per-weapon accuracy_circle_scale (AR 75, SMG 110, SG 250)
  //     SAT        = reticle at which core saturates to 1. HR_CORE_SAT: default 'circle10' → 10 (data-leaning/
