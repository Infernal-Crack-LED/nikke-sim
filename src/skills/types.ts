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
  | 'casterMaxHpPct' // grants Max HP = % of caster's Max HP (feeds atkOfMaxHpPct consumers)
  | 'partsDamagePct'    // parsed but inert in v1 (no parts on the boss)
  | 'pierceDamagePct'   // parsed but inert in v1
  | 'damageTakenPct'    // debuff on the boss (positive = boss takes more)
  | 'maxAmmoPct'
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
  | 'hitRatePct'        // inert in v1 (100% accuracy assumed)
  | 'defPct';           // inert in v1

export type TriggerDef =
  | { kind: 'passive' }                     // always active
  | { kind: 'burstCast'; stage?: 1 | 2 | 3 } // when the owner casts their burst (optionally only at that stage — Λ kits)
  | { kind: 'fullBurstEnter' }              // when full burst begins
  | { kind: 'fullBurstEnd' }
  | { kind: 'hitCount'; count: number }
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
  | { kind: 'stageEnter'; stage: 1 | 2 | 3 } // when a stage-N burst is cast by anyone
  | { kind: 'bossElement'; element: string } // permanent, but only if the boss has this element
  | { kind: 'unsupported'; raw: string };

export type TargetDef =
  | { kind: 'self' }
  | { kind: 'allies' }
  | { kind: 'enemy' }
  | { kind: 'burstCasters'; stage?: number; element?: string }                // allies who cast a burst this rotation
  | { kind: 'nonBurstCasters' }
  | { kind: 'alliesTopAtk'; count: number }
  | {
      kind: 'alliesLowestAtk'; // "N [Burst X] ally unit(s) with the lowest final ATK"
      count: number;
      burst?: 'I' | 'II' | 'III';
      excludeSelf?: boolean; // e.g. Liberalio is immune to charge-speed buffs
    }
  | { kind: 'alliesOfElement'; element: string }
  | { kind: 'alliesOfClass'; cls: string }
  // "the N leftmost <element> ally unit(s) with <weapon>s" (Trina S2's real target)
  | { kind: 'alliesOfElementWeapon'; element: string; weapon: string; count?: number }
  // "self and N ally unit(s) on both sides" (Rouge's coin coverage — positional)
  | { kind: 'selfAndAdjacent'; sides: number };

export type EffectDef =
  | { kind: 'buff'; stat: StatKey; value: number; durationSec?: number; maxStacks?: number;
      // buff counts only while the caster's weaponSwap is live — for "held per swap round"
      // kit lines (MEASURED 2026-07-14, SWHA Fully Active charge/sequential buffs)
      whileSwapped?: boolean }
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
    }
  | {
      kind: 'dot'; // ticks every intervalSec (default 1); never core-boosted
      atkPct: number;
      durationSec: number;
      intervalSec?: number;
      noRange?: boolean;
      noFb?: boolean;
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
    }
  | {
      kind: 'weaponSwap'; // "Changes the weapon in use:" — temporary weapon override
      damagePct: number;        // per-shot multiplier while swapped
      chargeTimeSec?: number;   // full-charge time (charge weapons)
      chargeMultPct?: number;   // "Full Charge Damage: N% of damage"
      maxAmmo?: number;
      trueNormals?: boolean;    // swap shots are true-flavored (Takina: "Normal attacks deal true damage")
      durationSec: number;      // hard time bound (e.g. the 10s burst window)
      maxShots?: number;        // uses-based end: swap terminates right after the Nth swapped
                                // shot fires, at variable time (MEASURED 2026-07-14, SWHA)
    }
  | { kind: 'fillGauge'; pct: number }                        // instantly fills the burst gauge
  | { kind: 'heal' }                                          // emits a recovery event to the target(s) — no HP amount modeled; fires their 'recovery' triggers (heal-synergy kits, e.g. Helm→Crown)
  | {
      kind: 'storedHit'; // accumulates charges that ALL release as hits when full burst begins
      atkPct: number;    // per charge, % of caster's final ATK at release time
      charges?: number;  // charges added per activation (default 1)
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
    }
  | { kind: 'burstEligibility'; stage: 1 | 2 | 3 }            // unit may also burst at this stage (Rapi:RH Combat Assist)
  | { kind: 'burstFirst' }                                    // takes the FIRST eligible burst of its stage regardless of slot order (Prika duet opener)
  | { kind: 'reenterStage'; stage: 1 | 2 | 3 }                // "Re-enters Burst Stage N": the rotation stays at stage N so ANOTHER eligible unit can also cast (Tia, Anis:Star Everyone's Star)
  | { kind: 'advantageVs'; element: string }                  // counts as elementally advantaged vs this boss element
  | { kind: 'burstCdr'; seconds: number; oncePerBattle?: boolean } // reduce targets' burst cooldowns
  | { kind: 'escalating'; steps: EffectDef[] }                // Liter-style "Once:/Twice:/…": Nth activation applies steps 1..N
  | { kind: 'fullBurstExtend'; seconds: number }
  | { kind: 'unlimitedAmmo'; durationSec: number }
  | { kind: 'instantReload'; fraction?: number }              // refill magazine (fraction of max, default full)
  | { kind: 'stun'; durationSec: number }                     // target can't fire/charge/reload (bursting unaffected)
  | {
      kind: 'stackedNuke'; // Maiden:IR MP — hits once per full burst the unit SAT OUT since its last burst
      atkPct: number;      // per stack, % of final ATK
      hpPct?: number;      // per stack, % of final Max HP added on top
      maxStacks?: number;  // default 12
    }
  | { kind: 'ignored'; note: string }                         // recognized, deliberately unmodeled (defensive etc.)
  | { kind: 'unsupported'; raw: string };                     // unparseable — surfaces as a warning

export interface Block {
  slot: SkillSlot;
  trigger: TriggerDef;
  target: TargetDef;
  effects: EffectDef[];
  // static squad-formation gate, evaluated once at sim setup (e.g. Rapi:RH's
  // Combat Assist only applies when the team has no Burst I unit). The unit
  // itself never counts ("no OTHER Burst 1 allies").
  formation?: 'noB1' | 'hasB1';
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
}

export interface CharacterSkills {
  blocks: Block[];
  warnings: string[];
  source: 'parser' | 'override' | 'parser+override';
  modes?: string[]; // user-selectable kit modes declared by the override (first = default)
  hasPierce?: boolean; // kit's attacks are Pierce-tagged → Pierce Damage ▲ feeds Damage Up
  burstSnapshotsPreFb?: boolean; // burst damage resolves pre-FB/pre-stage (per-unit cast timing)
  pierceModes?: string[]; // pierce only while in one of these kit modes (CCW: SR only)
  consolidation?: ConsolidationConfig; // pellet-consolidation mode (dorothy-S) — see OverrideFile / A26
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
