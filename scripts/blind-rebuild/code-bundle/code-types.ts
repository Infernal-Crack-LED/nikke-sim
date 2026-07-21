// FILE: src/skills/types.ts

// Structured skill-effect schema. Produced by the prose parser
// (src/skills/parser.ts) and by hand-written overrides (src/skills/overrides/*.json).

export type SkillSlot = 'skill1' | 'skill2' | 'burst';

export type StatKey =
  | 'atkPct'            // ATK ▲ x% (scales target's own ATK)
  | 'casterAtkPct'      // ATK ▲ x% of caster's ATK (flat add)
  | 'atkOfMaxHpPct'     // ATK ▲ x% of the unit's own final Max HP (flat add — Cinderella, Maiden:IR)
  | 'critRatePct'
  | 'critDamagePct'
  | 'coreDamagePct'
  | 'elementDamagePct'
  | 'chargeDamagePct'     // additive percentage points in the charge bucket
  | 'chargeDamageMultPct' // scales by BASE charge damage (collection items, Helm's max-treasure burst)
  | 'chargeSpeedPct'
  | 'attackDamagePct'   // "Attack Damage" — Damage Up bucket
  | 'sustainedDamagePct'
  | 'sequentialDamagePct'
  | 'casterMaxHpPct' // grants Max HP = % of CASTER's Max HP ("X% of the skill user's Max HP" — rouge/anis/trina)
  | 'targetMaxHpPct' // grants Max HP = % of the TARGET's OWN Max HP ("Max HP ▲ X%" — blanc/maiden). Same
  //                    e3 feed rule as casterMaxHpPct: only feeds atkOfMaxHpPct when caster === target (self)
  | 'partsDamagePct'    // parsed but inert in v1 (no parts on the boss)
  | 'pierceDamagePct'   // parsed but inert in v1
  | 'damageTakenPct'    // debuff on the boss (positive = boss takes more)
  | 'maxAmmoPct'
  | 'maxAmmoFlat'       // Max Ammunition ▲ N rounds — FLAT round count (not %), added on top of the
  //                      maxAmmoPct scaling in maxAmmo() (theme 14: "▲ N round(s)" kit lines that the
  //                      percent-only schema could only approximate — grave/noir/tove/drake/trina)
  | 'reloadSpeedPct'
  | 'attackSpeedPct'
  | 'fireRatePct'
  | 'extraHitDamagePct' // flat % of final ATK added per normal-attack hit while active
  | 'trueDamagePct'          // Damage Up bucket (doc line 8)
  | 'projectileExplosionPct' // Damage Up bucket; only RL kits carry it
  | 'elemAdvantageDamagePct' // Damage Up bucket, active only with elemental advantage
  | 'distributedDamagePct'   // boosts the caster's own distributed-damage hits
  | 'projectileAttachmentPct' // boosts the caster's projectile-attachment procs
  | 'normalAttackPct'        // scales the normal attack multiplier (like the SMG/SG doll line)
  | 'burstGenPct'            // scales the unit's burst gauge contribution
  | 'hitRatePct'        // core-hit lift (⚑ derived; sim.ts hrCoreMult; live by default, HRCORE=0 disables)
  | 'defPct'            // inert in v1 (self DEF doesn't affect own damage — Endurance cube)
  | 'maxHpPct';         // self Max HP ▲ % (Vigor cube) — converted to a maxHpFlat self-grant in sim.ts, feeds HP-scaling ATK (atkOfMaxHpPct)

export type TriggerDef =
  | { kind: 'passive' }                     // always active
  | { kind: 'burstCast'; stage?: 1 | 2 | 3 } // when the owner casts their burst (optionally only at that stage — Λ kits)
  | { kind: 'fullBurstEnter' }              // when full burst begins
  | { kind: 'fullBurstEnd' }
  | { kind: 'hitCount'; count: number; countInFb?: number } // fires every `count` cumulative hits; `countInFb` overrides the threshold DURING Full Burst (RRH rocket meter: 120 out of burst → 60 in her FB)
  | { kind: 'chargeCounter'; count: number | number[]; countInFb?: number | number[] } // cycling per-full-charge phase counter:
  // each full charge advances a phase counter; phase P fires (block.effects[P], in order) once its OWN
  // threshold accrues, then the counter resets and advances to P+1. `count`/`countInFb` may be a scalar
  // (same threshold every phase) OR a per-phase array (PREFERRED — the datamined "attack count required
  // to N times" is per-phase). Scarlet: Black Shadow: outside FB [3,6,9], her burst drops it to [1,2,3]
  // for 10s (so one full 3-phase cycle = 6 charges in FB / 18 outside; the 848% phase2 is the RAREST,
  // matching video — N3 focus read shows the large phases barely materialise). +50% FB applies per-proc
  // by landing timing.
  | { kind: 'teamAmmo'; count: number } // fires each time TOTAL ally ammo consumed crosses count (infinite-ammo shots don't consume)     // every N normal-attack hits by the owner
  | { kind: 'shotFired' }                   // every trigger pull by the owner
  | { kind: 'lastBullet' }                  // on the owner's last bullet / reload start
  | { kind: 'recovery' }                    // when the owner RECEIVES a heal (a 'heal' effect targets them) — Crown's "when recovery takes effect"
  | { kind: 'shielded' }                    // when the owner RECEIVES a shield (a 'shield' effect targets them) — shield-synergy kits (e.g. naga's shield-gate)
  | { kind: 'stageEnter'; stage: 1 | 2 | 3 } // when a stage-N burst is cast by anyone
  | { kind: 'bossElement'; element: string } // permanent, but only if the boss has this element
  | { kind: 'unsupported'; raw: string };

export type TargetDef =
  | { kind: 'self' }
  // excludeSelf: "all allies (except self)" — e.g. brid-silent-track burst
  | { kind: 'allies'; excludeSelf?: boolean }
  | { kind: 'enemy' }
  | { kind: 'burstCasters'; stage?: number; element?: string }                // allies who cast a burst this rotation
  | { kind: 'nonBurstCasters' }
  // excludeSelf: "N highest-ATK ally (except the skill user)" — miranda, soda-twinkling-bunny.
  // Applied to the candidate pool BEFORE the count-slice (exclude-then-take-N).
  | { kind: 'alliesTopAtk'; count: number; excludeSelf?: boolean }
  | {
      kind: 'alliesLowestAtk'; // "N [Burst X] ally unit(s) with the lowest final ATK"
      count: number;
      burst?: 'I' | 'II' | 'III';
      excludeSelf?: boolean; // e.g. Liberalio is immune to charge-speed buffs
    }
  | { kind: 'alliesOfElement'; element: string; excludeSelf?: boolean }
  | { kind: 'alliesOfClass'; cls: string; excludeSelf?: boolean }
  // "all shotgun-wielding allies [(except self)]" — weapon-typed, class-blind
  // (arcana-fortune-mate S1/S2, tove S2/burst). Weapon codes: AR/SMG/SG/SR/RL/MG.
  | { kind: 'alliesOfWeapon'; weapon: string; excludeSelf?: boolean }
  // "the N leftmost <element> ally unit(s) with <weapon>s" (Trina S2's real target)
  | { kind: 'alliesOfElementWeapon'; element: string; weapon: string; count?: number }
  // "self and N ally unit(s) on both sides" (Rouge's coin coverage — positional)
  | { kind: 'selfAndAdjacent'; sides: number }
  // "the N ally unit(s) with the lowest remaining HP [(except self)]" (blanc/moran survival grants).
  // v1 has no HP pool (immortal boss, nobody takes damage) so "lowest remaining HP" is indeterminate —
  // resolved deterministically to the leftmost `count` allies as a documented stand-in. The Max-HP grants
  // these lines carry are offensively INERT anyway (ally-granted Max HP does not feed a teammate's
  // atkOfMaxHpPct conversion — e3 video rule), so the stand-in choice moves no damage.
  | { kind: 'alliesLowestHp'; count: number; excludeSelf?: boolean };

export type EffectDef =
  | { kind: 'buff'; stat: StatKey; value: number; durationSec?: number; maxStacks?: number;
      // buff counts only while the caster's weaponSwap is live — for "held per swap round"
      // kit lines (MEASURED 2026-07-14, SWHA Fully Active charge/sequential buffs)
      whileSwapped?: boolean;
      // per-shot/per-charge STACK-RAMP: when a buff's value is authored at its MAX-stacks
      // magnitude but the real stacks accrue over the opening seconds (not instant), rampSec
      // linearly ramps the contribution 0 → full over rampSec from the buff's FIRST
      // application, then holds at cap — so the sim no longer over-credits t=0 (engine-modeling
      // -gaps.md theme 3). The ramp clock is the first-apply frame (frame 0 for a `passive`,
      // the cast frame for a burstCast-keyed self-buff) and is NOT reset by refreshes. Omit =
      // instant-to-max (back-compatible). ⚑ rampSec is a per-unit estimate unless measured.
      rampSec?: number;
      // live resource-scaled buff: the buff's value is IGNORED and instead computed each frame
      // as caster.resources[name] × mult — for a stat that tracks a dynamic pool (soda-twinkling
      // -bunny's Critical Damage ▲1.32% per Golden Chip: perResource {name:'goldenChip', mult:1.32}).
      // Apply as a `passive` self-buff so it is always present and re-reads the live pool.
      perResource?: { name: string; mult: number } }
  | {
      // adjust a named resource pool (declared in CharacterSkills.resources) by `delta` when this
      // block's trigger fires — soda's burst spends 17 chips (delta:-17), her in-FB every-3-normals
      // block earns 1 (delta:1). Clamped to the resource's [min,max]. Order within a slot matters:
      // a spend placed AFTER the resource-gated blocks lets those gates read the PRE-spend pool.
      kind: 'resource'; name: string; delta: number }
  | {
      kind: 'flatDamage'; // instant hit, % of caster final ATK
      atkPct: number;
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
      core?: boolean; // direct core strike: receives the core bucket, scaled by core-rate
      crit?: boolean;    // this hit can crit (e.g. Ein's Near Feathers)
      noRange?: boolean; // excluded from the +30% full-range bonus (Prydwen-confirmed for Near Feathers)
      noFb?: boolean;    // excluded from the +50% full-burst bonus (Q1-calibrated proc exemption)
      delaySec?: number; // flighted damage: lands delaySec later, snapshotting buffs/FB at
                         // LANDING (MEASURED 2026-07-14: rapi-red-hood's burst nuke missile
                         // lands ~0.4s post-banner inside her window at the full buff state)
      requiresPulls?: number; // fires only if the caster has fired >= N shots (MEASURED
                              // 2026-07-14: her nuke needs >=1 sticky charge = 120 shots)
      // per-battle-elapsed ramp: scales this hit's atkPct by min(1, elapsed/rampSec) — for a
      // burst component that scales with a stack resource accruing from BATTLE START (cinderella's
      // Beautiful-mirror: 28.9%×12 stacks ramping over ~36s, so an early burst mirrors fewer
      // stacks). Snapshotted at cast/landing. Omit = full (back-compatible). ⚑ per-unit estimate.
      rampSec?: number;
    }
  | {
      kind: 'dot'; // ticks every intervalSec (default 1); never core-boosted
      atkPct: number;
      durationSec: number;
      intervalSec?: number;
      noRange?: boolean;
      noFb?: boolean;
      crit?: boolean;    // this DoT's ticks roll crit at the caster's sheet rate — opt-in ONLY where MEASURED
                         // (isabel's ~14.7s periodic hit: ~15-25% of fires observed critting; docs/probe-data/isabel-sg-band.json).
                         // Overrides the global DOT_CRIT gate (which stays default-OFF): most DoTs are validated NON-crit
                         // (jill's acid tick video-confirmed at 99.7% non-crit; mihara's Ensnaring validated at 1.03 non-crit).
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
      // live resource-scaled DoT: each tick's atkPct is recomputed as owner.resources[name] × mult
      // (ignores the static atkPct) — mihara-bonding-chain's Ensnaring DoT (50.05%/s per stack,
      // stacks cancelled on burst + rebuilt), so a stack pool drives the DoT dynamically.
      perResource?: { name: string; mult: number };
    }
  | {
      kind: 'weaponSwap'; // "Changes the weapon in use:" — temporary weapon override
      damagePct: number;        // per-shot multiplier while swapped
      chargeTimeSec?: number;   // full-charge time (charge weapons)
      chargeMultPct?: number;   // "Full Charge Damage: N% of damage"
      maxAmmo?: number;
      // The swap weapon's OWN datamined fire cadence (pulls/s), when it differs from the base
      // weapon — the swap loads a different shot spec (moran: swap shot_id fires 24/s vs base AR 12/s).
      pullsPerSec?: number;
      // The swap weapon's CLASS, when it differs from the base weapon — drives range-band
      // eligibility + auto-core rate for swap shots (nayuta: SMG base → SR "Memory Incineration" mode).
      weapon?: string;
      trueNormals?: boolean;    // swap shots are true-flavored (Takina: "Normal attacks deal true damage")
      durationSec: number;      // hard time bound (e.g. the 10s burst window)
      maxShots?: number;        // uses-based end: swap terminates right after the Nth swapped
                                // shot fires, at variable time (MEASURED 2026-07-14, SWHA)
    }
  | { kind: 'fillGauge'; pct: number }                        // instantly fills the burst gauge
  | { kind: 'heal'; ticks?: number; intervalSec?: number }    // emits recovery event(s) to the target(s) — no HP amount modeled; fires their 'recovery' triggers (heal-synergy kits, e.g. Helm→Crown). A per-second heal-over-time ("Recovers X% every 1 sec for N sec") sets ticks:N (intervalSec default 1) so it emits N recovery events over time, keeping on-recovery consumers refreshed; default ticks:1 = a single instant event (back-compatible)
  | { kind: 'shield'; maxHpPct?: number; durationSec?: number } // emits a shield event to the target(s) — no HP pool modeled (v1 boss deals no damage); fires their 'shielded' triggers; maxHpPct = % of CASTER final Max HP (recorded for kit completeness)
  | {
      kind: 'storedHit'; // accumulates charges that ALL release as hits when full burst begins
      atkPct: number;    // per charge, % of caster's final ATK at release time
      charges?: number;  // charges added per activation (default 1)
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
      core?: number;     // per-release core RATE (0..1) via the coreOverride path — aim/range-INDEPENDENT, not the weapon/band acr table (RRH attached-rocket explosions core ~1/3, MEASURED 2026-07-16)
      crit?: boolean;    // the release rolls crit at the caster's sheet rate (like every other hit) — removes the stored-hit path's default crit-OFF exemption; consistency, not a new mechanic (RRH explosions crit — orange bodies observed; 2026-07-16 DECISIONS)
      instantInFb?: boolean; // charges added DURING Full Burst detonate immediately that same window (RRH: a rocket that attaches in FB explodes instantly), instead of only batch-releasing at the next FB start
    }
  | { kind: 'burstEligibility'; stage: 1 | 2 | 3 }            // unit may also burst at this stage (Rapi:RH Combat Assist)
  | { kind: 'burstFirst' }                                    // takes the FIRST eligible burst of its stage regardless of slot order (Prika duet opener)
  | { kind: 'reenterStage'; stage: 1 | 2 | 3 }                // "Re-enters Burst Stage N": the rotation stays at stage N so ANOTHER eligible unit can also cast (Tia, Anis:Star Everyone's Star)
  | { kind: 'advantageVs'; element: string }                  // counts as elementally advantaged vs this boss element
  | { kind: 'burstCdr'; seconds: number; oncePerBattle?: boolean } // reduce targets' burst cooldowns
  | { kind: 'escalating'; steps: EffectDef[] }                // Liter-style "Once:/Twice:/…": Nth activation applies steps 1..N
  | { kind: 'fullBurstExtend'; seconds: number }
  | { kind: 'unlimitedAmmo'; durationSec: number }
  // "Removes N% of ammunition" / forced-reload dump (theme 15): empties the target's current
  // magazine by `fraction` of MAX capacity (default 1 = 100%, the whole belt) and, if that drops
  // the belt to 0, forces an immediate reload (fires lastBullet triggers, same as firing dry).
  // The inverse of instantReload. e.g. grave's Prediction-end forced reload, asuka-wille, jill.
  | { kind: 'consumeAmmo'; fraction?: number }
  | { kind: 'gainPierce'; durationSec: number }               // timed "Gain Pierce for N sec": the target's attacks count as Pierce-tagged for the window, so its (and teammates') Pierce Damage ▲ buffs go live during it — for a kit whose pierce is temporary, not the static per-unit `hasPierce` flag
  | { kind: 'instantReload'; fraction?: number }              // refill magazine (fraction of max, default full)
  | { kind: 'stun'; durationSec: number }                     // target can't fire/charge/reload (bursting unaffected)
  | {
      kind: 'stackedNuke'; // Maiden:IR MP — hits once per full burst the unit SAT OUT since its last burst
      atkPct: number;      // per stack, % of final ATK
      hpPct?: number;      // per stack, % of final Max HP added on top
      maxStacks?: number;  // default 12
    }
  // OFFLINE-PARSER-ONLY kinds: emitted by scripts/lib/kit-parser.ts while
  // authoring/materializing, but NEVER valid in an override JSON (the validator
  // rejects them) — such kit text belongs verbatim in the override's `unmodeled`
  // field instead. The engine has no branch for either kind.
  | { kind: 'ignored'; note: string }                         // recognized, deliberately unmodeled (defensive etc.)
  | { kind: 'unsupported'; raw: string };                     // unparseable

export interface Block {
  slot: SkillSlot;
  trigger: TriggerDef;
  target: TargetDef;
  effects: EffectDef[];
  // static squad-formation gate, evaluated once at sim setup (e.g. Rapi:RH's
  // Combat Assist only applies when the team has no Burst I unit). The unit
  // itself never counts ("no OTHER Burst 1 allies").
  formation?: 'noB1' | 'hasB1';
  // static team-composition gate, evaluated once at sim setup (like `formation`):
  // the block is active only when the team contains SOME OTHER ally matching ALL
  // specified facets — facets AND together; omit a facet to leave it unconstrained.
  // e.g. teamHas:{element:'Electric', burst:'III'} — the `arcana` (RL/Electric)
  // override's team buffs are DEAD "without a Burst-III Electric caster present"
  // (NOT arcana-fortune-mate), so the block is inert on any
  // team lacking one. The owner itself never counts (same rule as `formation`);
  // burst matches literally (a Λ unit does NOT satisfy burst:'III'). Omit = always
  // active (back-compatible). Burst codes 'I'|'II'|'III'|'Λ'; weapon AR/SMG/SG/SR/RL/MG.
  teamHas?: { element?: string; class?: string; weapon?: string; burst?: string };
  // mode gate: block active only when the unit's selected mode matches (the
  // override's top-level `modes` array declares the choices; first = default)
  mode?: string;
  // effects apply only on every Nth activation of this block's trigger
  // (e.g. Mast's Hangover: every 3rd full-burst end)
  everyN?: number;
  // phase for everyN: fire on activations ≡ offset (mod everyN), e.g. offset 1 + everyN 3
  // fires on the 1st, 4th, 7th… activation (Neon:VE starts at full Firepower Gauge)
  everyNOffset?: number;
  // core-hit gate: the block's in-game trigger needs a core hit, so it is
  // inert when the fight has no core exposure (e.g. Liberalio's 20.83% rider)
  requiresCore?: boolean;
  // full-burst-state gate, checked when the trigger fires: 'inFb' blocks only
  // activate during full burst, 'outFb' only outside it (e.g. Velvet's S1
  // "when attacking with Full Charge while not in Full Burst")
  fbGate?: 'inFb' | 'outFb';
  // weapon-swap-state gate, checked when the trigger fires: 'swapped' blocks
  // only activate while the owner's kit weaponSwap is live (e.g. SWHA's Fully
  // Active extra volley rides only her two swapped full-charge shots),
  // 'unswapped' only outside it
  swapGate?: 'swapped' | 'unswapped';
  // boss-element gate, checked when the trigger fires: the block only activates
  // when the fight's boss element matches (e.g. helm-aquamarine's burst "when
  // attacking an Electric Code target → +164.83%"; brid-silent-track's FB-enter
  // "all Wind Code enemies → Damage Taken ▲"). Unlike the `bossElement` TRIGGER
  // (a permanent element-gated passive), this COMPOSES with any real trigger
  // (fullBurstEnter/hitCount/burstCast/…). Inert vs a non-matching boss (incl.
  // the neutral scope-lock boss), so it never disturbs graded comps.
  bossElementGate?: string;
  // own-burst gate, checked when the trigger fires: the block only activates when the
  // owner DID ('cast') or did NOT ('notCast') cast their own burst in the rotation leading
  // into this Full Burst. Composes with a `fullBurstEnter` trigger to express "Entering
  // Full Burst AFTER this unit uses her own Burst" ('cast') vs "…WITHOUT using own Burst"
  // ('notCast') — a plain team `fullBurstEnter` over-fires in multi-B3 comps where a
  // DIFFERENT B3 completes the chain. Unlike re-keying to `burstCast` (which fires PRE-FB
  // and loses the +50% Full-Burst major + FB auras), this keeps the block at FB entry.
  // e.g. cinderella-crystal-wave's FB-enter core-strike nuke ('cast'); the inverse is
  // diesel-winter-sweets' Highlight sustained ('notCast'). Evaluated against the same
  // rotationCasters set the burst-caster targets use; inert on graded comps where the unit
  // is the sole/actual burster. Omit = fires on any Full Burst (back-compatible).
  ownBurstGate?: 'cast' | 'notCast';
  // resource-pool gate: block fires only when a named resource (CharacterSkills.resources)
  // is within [min,max] at trigger time — soda-twinkling-bunny's burst ATK ▲65.25% activates
  // only at ≥30 Golden Chips ({name:'goldenChip', min:30}), Hit Rate at ≥20, FB-ext tiers at
  // ≥10/≥20. Evaluated on the PRE-spend pool if the spend effect is ordered after the gated block.
  resourceGate?: { name: string; min?: number; max?: number };
}

// Verbatim kit-text lines an override does NOT represent as blocks — the
// auditable "no silent drops" record, written per slot by the materializer /
// /kit-parse authors.
export type UnmodeledText = Record<SkillSlot, string[]>;

export interface CharacterSkills {
  blocks: Block[];
  warnings: string[];
  unmodeled?: UnmodeledText; // kit text deliberately not modeled (display/audit only)
  modes?: string[]; // user-selectable kit modes declared by the override (first = default)
  hasPierce?: boolean; // kit's attacks are Pierce-tagged → Pierce Damage ▲ feeds Damage Up
  burstSnapshotsPreFb?: boolean; // burst damage resolves pre-FB/pre-stage (per-unit cast timing)
  pierceModes?: string[]; // pierce only while in one of these kit modes (CCW: SR only)
  consolidation?: ConsolidationConfig; // pellet-consolidation mode (dorothy-S) — see OverrideFile / A26
  // named resource pools tracked live per unit (soda-twinkling-bunny's Golden Chip): initialized
  // at setup, adjusted by `resource` effects, read by `perResource` buffs + `resourceGate` blocks.
  resources?: { name: string; initial: number; min?: number; max?: number }[];
}

// Pellet-consolidation mode: after landing N pellets (near-gated), for K shots the unit fires ONE
// aligned bullet (pelletFraction of a full shot) at coreRate with attackDamagePct + Pierce — dorothy-S.
export interface ConsolidationConfig {
  triggerLandedPellets: number;
  shots: number;
  coreRate: number;
  pelletFraction: number;
  attackDamagePct: number;
  pierce?: boolean;
}


// FILE: src/skills/scale.ts

// Skill-level scaling. blablalink roledata gives every skill-description
// placeholder as a 10-entry array (index = skill level - 1). The parser reads
// max-level prose, so to run a skill at level L we match each parsed number
// against index 9 of the arrays and substitute index L-1. Durations are never
// scaled (they are level-constant in practice; matching them would risk
// scaling "for 10 sec" that collides with a 10% value).
import type { Block, EffectDef, SkillSlot } from './types.js';

export interface SlotLevelArrays {
  skill1: number[][];
  skill2: number[][];
  burst: number[][];
}
export interface SkillLevels {
  skill1: number;
  skill2: number;
  burst: number;
}

export function scaleBlocks(
  blocks: Block[],
  arrays: SlotLevelArrays,
  levels: SkillLevels,
  warnings: string[]
): Block[] {
  const missing = new Set<string>();

  const scaleVal = (v: number, slot: SkillSlot): number => {
    const lvl = levels[slot];
    if (lvl >= 10 || v === 0) return v;
    const abs = Math.abs(v);
    const arr = (arrays[slot] ?? []).find((a) => Math.abs(a[9] - abs) < 0.005);
    if (!arr) {
      missing.add(`${slot}: no level table match for ${v} — kept at max-level value`);
      return v;
    }
    return arr[lvl - 1] * Math.sign(v);
  };

  const scaleEffect = (e: EffectDef, slot: SkillSlot): EffectDef => {
    switch (e.kind) {
      case 'buff': return { ...e, value: scaleVal(e.value, slot) };
      case 'flatDamage': return { ...e, atkPct: scaleVal(e.atkPct, slot) };
      case 'dot': return { ...e, atkPct: scaleVal(e.atkPct, slot) };
      case 'burstCdr': return { ...e, seconds: scaleVal(e.seconds, slot) };
      case 'escalating': return { ...e, steps: e.steps.map((s) => scaleEffect(s, slot)) };
      default: return e;
    }
  };

  const scaled = blocks.map((b) =>
    levels[b.slot] >= 10 ? b : { ...b, effects: b.effects.map((e) => scaleEffect(e, b.slot)) }
  );
  warnings.push(...missing);
  return scaled;
}


// FILE: src/skills/index.ts

// Resolves a character's skill Blocks from its hand-written/materialized
// override, then scales values to the requested skill levels. The engine NEVER
// parses skill prose at runtime: every roster unit's override is the complete
// description of its kit (all three slots), produced offline by the kit parser
// (scripts/lib/kit-parser.ts via scripts/materialize-overrides.ts) or authored
// via /kit-parse. Pure — no filesystem access, so it runs in the browser too.
// Node callers get overrides from ./overrides-node.ts; the web app bundles them
// via import.meta.glob.
import type { CharacterData } from '../types.js';
import { scaleBlocks, type SkillLevels, type SlotLevelArrays } from './scale.js';
import type { Block, CharacterSkills, ConsolidationConfig, SkillSlot, UnmodeledText } from './types.js';

const SLOTS: SkillSlot[] = ['skill1', 'skill2', 'burst'];

export interface OverrideFile {
  note?: string;
  // Verbatim kit-text lines NOT represented in blocks (all three keys present,
  // empty arrays OK). The auditable "no silent drops" record; reasons/audit
  // stay in `note`. Hand-authored slots predating 2026-07-16 may still have
  // empty arrays with skips documented in `note` only (backfill pending).
  unmodeled?: UnmodeledText;
  // Display-only modeling caveats surfaced as runtime warnings (replaces the
  // old runtime-parser warnings channel). Convention: "<slot>: <message>".
  caveats?: string[];
  // Display-only, owner-facing plain-English description of what this kit
  // actually does (skill1/skill2/burst), generated by the `audit-kit`
  // reconciling judge and carried over from its fix brief when the brief is
  // enacted. For sanity-checking the model against intuition, not engine input.
  kitDescription?: string;
  modes?: string[]; // user-selectable kit modes (first = default)
  // this unit's attacks are Pierce-tagged (kit says so), so Pierce Damage ▲
  // buffs feed its Damage Up bucket (Q10). Set only on kit-confirmed carriers.
  hasPierce?: boolean; // always pierce (e.g. red-hood)
  pierceModes?: string[]; // pierce only in these modes (e.g. CCW: ["Snipe"])
  // hand-measured corrections to DB weapon data (e.g. real SR fire cycle =
  // charge + bolt recovery, where the DB only records the charge time)
  charFixes?: { chargeFrames?: number; reloadFrames?: number; burstCooldownSec?: number; noBoltRecovery?: boolean; pullsPerSec?: number };
  // Pellet-consolidation mode (dorothy-S: "after landing N pellets, for K rounds → pellet count fixed at 1
  // + high core + Pierce + attack-dmg"). Range-gated to near (where the boss affords the trigger). MEASURED
  // gate; the "80 landed on the small core" story is interpretive. See open-questions A26.
  consolidation?: ConsolidationConfig;
  // named live resource pools (soda-twinkling-bunny's Golden Chip) — see CharacterSkills.resources
  resources?: { name: string; initial: number; min?: number; max?: number }[];
  burstSnapshotsPreFb?: boolean;
  // All three slots are REQUIRED for roster units (validated by
  // scripts/validate-overrides.ts); typed optional only so partially-built
  // objects can be handled during materialization.
  skill1?: Block[];
  skill2?: Block[];
  burst?: Block[];
}

export const MAX_SKILL_LEVELS: SkillLevels = { skill1: 10, skill2: 10, burst: 10 };

export function resolveSkills(
  char: CharacterData,
  override?: OverrideFile,
  scaling?: { arrays: SlotLevelArrays; levels: SkillLevels }
): CharacterSkills {
  if (!override) {
    // Synthetic units with a genuinely empty kit (e.g. the dpschart no-op
    // controls) have no override file and no prose — zero blocks by design.
    if (SLOTS.every((s) => !char.skills[s]?.trim())) {
      return { blocks: [], warnings: [] };
    }
    throw new Error(
      `no skill override for "${char.slug}" — the engine does not parse skill prose at runtime; ` +
        `run \`npx tsx scripts/materialize-overrides.ts --write ${char.slug}\` or author one via /kit-parse`
    );
  }

  const warnings: string[] = [...(override.caveats ?? [])];
  const bySlot: Record<SkillSlot, Block[]> = { skill1: [], skill2: [], burst: [] };
  for (const slot of SLOTS) {
    const defined = override[slot];
    if (!Array.isArray(defined)) {
      throw new Error(
        `override for "${char.slug}" is missing "${slot}" — overrides must define all three skill ` +
          `slots (re-run \`npx tsx scripts/materialize-overrides.ts --write ${char.slug}\`)`
      );
    }
    bySlot[slot] = defined.map((b) => ({ ...b, slot }));
  }

  let blocks = SLOTS.flatMap((s) => bySlot[s]);
  if (scaling && SLOTS.some((s) => scaling.levels[s] < 10)) {
    blocks = scaleBlocks(blocks, scaling.arrays, scaling.levels, warnings);
  }

  return {
    blocks,
    warnings,
    unmodeled: override.unmodeled,
    modes: override.modes,
    hasPierce: override.hasPierce,
    burstSnapshotsPreFb: override.burstSnapshotsPreFb,
    pierceModes: override.pierceModes,
    consolidation: override.consolidation,
    resources: override.resources,
  };
}


// FILE: src/engine/sg-geometry.ts

// Accuracy-circle geometry — the px calibration (docs/data/sg-calc/) turned into
// core-hit-fraction and SG pellet-landing primitives, so those quantities are
// GEOMETRICALLY grounded from a unit's datamined accuracy_circle_scale + the boss
// range band, instead of owner-chosen tables and an abstract free-parameter reticle.
//
// ⚑ APPROXIMATION BASELINE — every constant here is a principled approximation, NOT
// measured-truth (see docs/data/sg-calc/DERIVATION.md §"These numbers are approximations"
// and accuracy-circle-calibration.json approximationCaveat). They may FILL unmeasured
// bands and GROUND free parameters, but must NEVER refit a measured constant
// (hard-constraint #3). Consumers land behind ENV flags, default matching current
// behaviour, until the board A/B says a workstream helps. See
// docs/data/sg-calc/IMPLEMENTATION-PLAN.md.

// scale → on-screen accuracy-circle diameter in px, at scope-lock resolution 2622×1206.
// PROPORTIONAL (offset≈0), R²=0.9999 from 3 independent BLOOM-PEAK measurements
// (AR scarlet 75→48px, SMG lm 110→71.5px, SG noir 250→162px). accuracy_circle_scale IS the
// fully-bloomed reticle diameter — the reticle pulses on the fire cadence between a contracted
// floor and this peak, and the peak is the anchor → no dead zone. The old 0.751·scale−25.2 offset
// was a bloom-phase artifact (the earlier AR 29px / SMG 60px were mid-bloom snapshots); re-measuring
// every class at its peak makes the map proportional. px/scale is uniform: 48/75=0.640, 71.5/110=0.650,
// 162/250=0.648. (The AR contracted floor ~29px ≈ the boss core, which is why high HR ≈ all-core.)
export const CIRCLE_PX_K = 0.648;
export const CIRCLE_PX_C = 0;

// range → boss-core diameter in px. Inverse-with-offset (perspective projection:
// apparent size ∝ 1/(distance + camera-offset)), R²=0.93; the ~47 offset is the
// camera-to-shooter distance. FORM robustly selected by the owner range bounds; k,c
// ride on fuzzy range midpoints (±~10%) and would be pinned exactly by one hard
// range measurement (open owner ruling in the implementation plan).
export const CORE_PX_K = 2100;
export const CORE_PX_C = 47;

// Datamined per-weapon-class accuracy_circle_scale (the class exemplars the px
// calibration was fit against). Mirrors sim.ts HR_CORE_CIRCLE. MG/SR/RL have no
// accuracy-circle model here → geometry does not touch their core rate.
export const ACCURACY_CIRCLE_SCALE: Record<string, number> = { AR: 75, SMG: 110, SG: 250 };

// Measured boss-core diameter per range band (px), hand-outlined on the Noir SG study
// (noir-sg-bands.json). The boss is the SAME physical union raid boss across element
// assignments (owner) → these transport across comps. Equivalent to coreDpx() at the
// calibration's impliedRanges (near 20.7, mid 28.0, midfar 52.9, far 76.4) by construction.
export const BAND_CORE_PX: Record<string, number> = { near: 31, mid: 28, midfar: 21, far: 17 };

// Hand-outlined SG pellet HIT fraction per band (noir-sg-bands.json): the fraction of the
// fixed D=162 spread circle covered by the boss body = expected fraction of pellets that land.
// Declines cleanly with range as the boss shrinks inside the fixed spread circle.
export const BAND_SG_HIT_FRAC: Record<string, number> = {
  near: 0.797,
  mid: 0.71,
  midfar: 0.634,
  far: 0.465,
};

// scale → accuracy-circle diameter in px (offset is 0 now, so Math.max is vestigial — kept harmless).
export function circleDpx(scale: number): number {
  return Math.max(0, CIRCLE_PX_K * scale + CIRCLE_PX_C);
}

// range → boss-core diameter in px.
export function coreDpx(range: number): number {
  return CORE_PX_K / (range + CORE_PX_C);
}

// range = inverse of coreDpx (for the continuous-range path / cross-checks).
export function rangeFromCoreDpx(coreD: number): number {
  return CORE_PX_K / coreD - CORE_PX_C;
}

// Concentric core inside the accuracy circle ⇒ fraction of shots on the core ≈ area ratio.
// Clamped to 1 (the core cannot be more than fully covered).
export function coreFracGeo(coreD: number, circleD: number): number {
  if (circleD <= 0) return 1;
  const r = coreD / circleD;
  return Math.min(1, r * r);
}

// Accuracy-circle diameter at a given hit rate, using the SAME fractional shrink the
// HRCORE reticle model applies (circle(hr) = circle(0) · max(FLOOR, 1 − s·hr)).
export function circleDpxAtHr(
  scale: number,
  hr: number,
  slope: number,
  floorFrac: number,
): number {
  const frac = Math.max(floorFrac, 1 - slope * Math.max(0, hr));
  return circleDpx(scale) * frac;
}

// ── Center-weighted pellet-landing model (CENTER-WEIGHTED-PELLET-SPEC.md) ────────────────────────
// Pellet impacts are a 2D isotropic Gaussian cone centered on the aim point, NOT a uniform disc
// (frame-measured on noir sg.MP4: 6-band study, all bands "denser-center"). A pellet lands / cores
// iff it falls within the boss body / core radius ⇒ the Rayleigh CDF. ONE σ drives BOTH SG landing
// and per-weapon core-hit (same cone at boss-body vs core radius), unifying Workstreams A/B/C.
export const K_SIGMA = 2.53;      // the visible spread disc (=circleDpx) is the ~2.5σ envelope
export const CORE_AUTOAIM = 0.55; // core-ONLY auto-aim loss (reticle never nails the ~1px true center)

// P(a pellet lands within radius R of the aim point) for an isotropic 2D Gaussian, σ.
export function rayleighWithin(R: number, sigma: number): number {
  if (sigma <= 0) return R > 0 ? 1 : 0;
  return 1 - Math.exp(-(R * R) / (2 * sigma * sigma));
}

// Pellet-spread σ (px) for a weapon at a given hit rate: half the (HR-shrunk) accuracy circle,
// divided by K_SIGMA. hr=0 gives AR 9.6 / SMG 14.1 / SG 32.0 px.
export function pelletSigma(
  scale: number,
  hr: number,
  slope: number,
  floorFrac: number,
): number {
  return circleDpxAtHr(scale, hr, slope, floorFrac) / 2 / K_SIGMA;
}

// Boss-body radius per band (px) from the measured hand-outlined area fraction: R_boss =
// R_disc·sqrt(hitFrac), where R_disc = circleDpx(250)/2 = 81 (noir reference). Reuses the measured
// silhouette; the Gaussian just re-weights the overlap. profileScale scales the boss size per boss.
export function bossBodyRadius(hitFrac: number, profileScale = 1): number {
  const RDISC = circleDpx(250) / 2;
  return RDISC * Math.sqrt(Math.max(0, hitFrac)) * profileScale;
}

// SG pellet-landing fraction: Gaussian cone (σ) overlapping the boss body (R_boss).
export function pelletLandFrac(hitFrac: number, sigma: number, profileScale = 1): number {
  return rayleighWithin(bossBodyRadius(hitFrac, profileScale), sigma);
}

// Core-hit fraction from the SAME cone at the core radius, with the core-only auto-aim loss.
export function pelletCoreFrac(coreDpxBand: number, sigma: number): number {
  return CORE_AUTOAIM * rayleighWithin(coreDpxBand / 2, sigma);
}

// ── δ-offset ("Rician") cone — the CONE_DELTA enactment model (owner-gated) ───────────────────────
// docs/handoffs/2026-07-19-core-geometry-implementation-plan.md §1 (basis:
// 2026-07-19-geometry-campaign-findings.md). REPLACES the two confirmed bugs of the live path — the
// flat `CORE_AUTOAIM=0.55` cap (structurally wrong: over-credits low-HR far, under-credits high-HR
// near) and the fractional reticle floor — with ONE mechanism: shots land on an isotropic Gaussian
// cone (σ from the accuracy circle at K_SIGMA) whose CENTER sits δ px off the true core (the auto-aim
// never nails the ~1px center); a shot cores iff it lands within the band core radius ⇒ the Rician
// CDF. δ shrinks with Hit Rate (auto-aim tightens onto the core), which is the work the flat cap
// crudely approximated. The measured campaign (blanc far spawn re-count 0.111[0.073,0.165] vs δ+σ
// prediction 0.103, δ-only 0.232 and centered 0.253 EXCLUDED) selects this family; the drawn reticle
// is decorative and anchors nothing here.
//
// FROZEN 2026-07-19 (owner-locked) — parameter-freeze refit + Fable pre-registration
// (docs/handoffs/2026-07-19-cone-param-freeze-prereg.md; reproducible in scripts/cone-refit.ts).
// δ0 fit by binomial MLE on the method-tagged cell set: AR spawn-confirmed (scarlet COUNT-1 near .25 /
// far .08; blanc far .111; Label HR23), SMG on the CLEAN chisato near cells (.294 HR0 / .365 HR22 —
// biased-high quency/LM near cells deliberately NOT used to set the offset), SG on dorothy HR0 + noir
// ▲60/▲98. K_SIGMA (2.53) held; CIRCLE_PX_K and the datamined per-weapon scale are measured constants,
// never refit (hard-constraint #3). σ-law (H, s, S_FLOOR): H and s pinned so the cone saturates near-core
// by the owner-attested jill ▲80 / noir ▲98 cells; S_FLOOR only bites at HR>~90 (saturation mechanism).
// ⚑ KNOWN, BOUNDED: the shared σ (fixed by the wide 110px SMG circle) over-credits SMG far/mid core
//   (the datamined circle width is not a free param) — same direction as the live AR-far over-credit,
//   small damage weight; watched by the board-A/B stop-condition, re-reviewable later.
// ⚑ NOT SUPPORTED: Hit Rate > 98 (owner-accepted; no board comp reaches it — σ-floor extrapolation only).
// σ-shrink is PER-WEAPON (owner 2026-07-19, board-driven): a single shared shrink could not both
//   saturate SG ▲98 core AND avoid over-crediting SMG mid-HR (quency ▲61) — the board A/B on the
//   shared-s freeze read quency +0.171 HOT. Decoupled: SG s pinned to saturate ▲98 (≈1.0; consistent
//   with the measured dorothy-serendipity ▲98.18 aimed-single-bullet coreRate 0.9 as the ceiling and
//   noir's ~1.0 spray attestation); AR s pinned to saturate jill ▲80; SMG s LOW (no SMG unit reaches
//   high HR, so SMG needs no saturation shrink) → keeps quency ▲61 at ~0.56 (≈ the biased-high measured
//   0.583) and chisato ▲22 near-exact. Low-HR cells are σ-shrink-invariant, so the clean chisato/
//   scarlet base cells are untouched. S_FLOOR shared (bites only at HR>~90).
export const CONE_DELTA0: Record<string, number> = { AR: 18, SMG: 16, SG: 30 }; // px @2622×1206, monotone in cone size
export const CONE_DELTA_H = 120;        // Hit Rate at which the centering offset δ reaches 0
export const CONE_SIGMA_SHRINK: Record<string, number> = { AR: 0.009, SMG: 0.004, SG: 0.009 }; // σ shrink per HR point, per weapon
export const CONE_SIGMA_FLOOR = 0.10;   // σ floor as a fraction of σ(0) (bites only at HR>~90)

// Pellet-spread σ (px) under the δ-cone model: half the accuracy circle / K_SIGMA, with a mild
// Hit-Rate σ-shrink (floored). Matches implementation-plan §2's sigma_w(hr). CIRCLE_PX_C is 0, so
// this equals circleDpx(scale)/2/K_SIGMA·shrink — written from CIRCLE_PX_K directly per the plan.
export function coneSigma(scale: number, hr: number, shrink: number): number {
  const s0 = (CIRCLE_PX_K * scale) / 2 / K_SIGMA;
  return s0 * Math.max(CONE_SIGMA_FLOOR, 1 - shrink * Math.max(0, hr));
}

// Per-weapon centering offset δ (px): DELTA0[weapon] shrinking linearly to 0 at Hit Rate H.
// Unknown weapon (MG/SR/RL) → 0 (they have no accuracy-circle model and never route here).
export function coneDelta(weapon: string, hr: number): number {
  const d0 = CONE_DELTA0[weapon];
  if (d0 === undefined) return 0;
  return d0 * Math.max(0, 1 - Math.max(0, hr) / CONE_DELTA_H);
}

// Modified Bessel function I₀(x) — Abramowitz & Stegun 9.8.1/9.8.2 rational approximations
// (|error| < 2e-7). Needed for the off-center Rician CDF integrand below.
export function besselI0(x: number): number {
  const ax = Math.abs(x);
  if (ax < 3.75) {
    const t = x / 3.75;
    const t2 = t * t;
    return (
      1 +
      t2 *
        (3.5156229 +
          t2 * (3.0899424 + t2 * (1.2067492 + t2 * (0.2659732 + t2 * (0.0360768 + t2 * 0.0045813)))))
    );
  }
  const t = 3.75 / ax;
  return (
    (Math.exp(ax) / Math.sqrt(ax)) *
    (0.39894228 +
      t *
        (0.01328592 +
          t *
            (0.00225319 +
              t *
                (-0.00157565 +
                  t *
                    (0.00916281 +
                      t *
                        (-0.02057706 +
                          t * (0.02635537 + t * (-0.01647633 + t * 0.00392377))))))))
  );
}

// P(‖N((δ,0), σ²·I)‖ ≤ R) — the probability a shot whose landing point is an isotropic 2D Gaussian
// of spread σ CENTERED δ px off the core lands within the core radius R (the Rician CDF). Derived in
// polar coords about the disc centre: P = ∫₀ᴿ (ρ/σ²)·exp(−(ρ²+δ²)/2σ²)·I₀(ρδ/σ²) dρ (the θ-integral
// gives 2π·I₀). Deterministic Simpson quadrature, no per-tick RNG. δ=0 reduces EXACTLY to
// rayleighWithin (special-cased so the reduction is analytic, not quadrature-approximate).
export function offsetCoreProb(R: number, sigma: number, delta: number): number {
  if (sigma <= 0) return R > 0 ? 1 : 0;
  if (R <= 0) return 0;
  if (delta === 0) return rayleighWithin(R, sigma); // exact centered reduction
  const s2 = sigma * sigma;
  const d2 = delta * delta;
  const N = 64; // even ⇒ Simpson
  const h = R / N;
  const f = (rho: number): number =>
    (rho / s2) * Math.exp(-(rho * rho + d2) / (2 * s2)) * besselI0((rho * delta) / s2);
  let sum = f(0) + f(R);
  for (let i = 1; i < N; i++) sum += (i % 2 ? 4 : 2) * f(i * h);
  return Math.min(1, (h / 3) * sum);
}
