// Structured skill-effect schema. Produced by the prose parser
// (src/skills/parser.ts) and by hand-written overrides (src/skills/overrides/*.json).

export type SkillSlot = 'skill1' | 'skill2' | 'burst';

export type StatKey =
  | 'atkPct'            // ATK ▲ x% (scales target's own ATK)
  | 'casterAtkPct'      // ATK ▲ x% of caster's ATK (flat add)
  | 'critRatePct'
  | 'critDamagePct'
  | 'coreDamagePct'
  | 'elementDamagePct'
  | 'chargeDamagePct'
  | 'chargeSpeedPct'
  | 'attackDamagePct'   // "Attack Damage" — Damage Up bucket
  | 'sustainedDamagePct'
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
  | 'normalAttackPct'        // scales the normal attack multiplier (like the SMG/SG doll line)
  | 'burstGenPct'            // scales the unit's burst gauge contribution
  | 'hitRatePct'        // inert in v1 (100% accuracy assumed)
  | 'defPct';           // inert in v1

export type TriggerDef =
  | { kind: 'passive' }                     // always active
  | { kind: 'burstCast'; stage?: 1 | 2 | 3 } // when the owner casts their burst (optionally only at that stage — Λ kits)
  | { kind: 'fullBurstEnter' }              // when full burst begins
  | { kind: 'fullBurstEnd' }
  | { kind: 'hitCount'; count: number }     // every N normal-attack hits by the owner
  | { kind: 'shotFired' }                   // every trigger pull by the owner
  | { kind: 'lastBullet' }                  // on the owner's last bullet / reload start
  | { kind: 'stageEnter'; stage: 1 | 2 | 3 } // when a stage-N burst is cast by anyone
  | { kind: 'bossElement'; element: string } // permanent, but only if the boss has this element
  | { kind: 'unsupported'; raw: string };

export type TargetDef =
  | { kind: 'self' }
  | { kind: 'allies' }
  | { kind: 'enemy' }
  | { kind: 'burstCasters' }                // allies who cast a burst this rotation
  | { kind: 'nonBurstCasters' }
  | { kind: 'alliesTopAtk'; count: number }
  | { kind: 'alliesOfElement'; element: string }
  | { kind: 'alliesOfClass'; cls: string };

export type EffectDef =
  | { kind: 'buff'; stat: StatKey; value: number; durationSec?: number; maxStacks?: number }
  | { kind: 'flatDamage'; atkPct: number; flavor?: 'distributed' | 'true' } // instant hit, % of caster final ATK
  | { kind: 'dot'; atkPct: number; durationSec: number; intervalSec?: number } // ticks every intervalSec (default 1)
  | {
      kind: 'weaponSwap'; // "Changes the weapon in use:" — temporary weapon override
      damagePct: number;        // per-shot multiplier while swapped
      chargeTimeSec?: number;   // full-charge time (charge weapons)
      chargeMultPct?: number;   // "Full Charge Damage: N% of damage"
      maxAmmo?: number;
      durationSec: number;
    }
  | { kind: 'fillGauge'; pct: number }                        // instantly fills the burst gauge
  | { kind: 'burstCdr'; seconds: number; oncePerBattle?: boolean } // reduce targets' burst cooldowns
  | { kind: 'escalating'; steps: EffectDef[] }                // Liter-style "Once:/Twice:/…": Nth activation applies steps 1..N
  | { kind: 'fullBurstExtend'; seconds: number }
  | { kind: 'unlimitedAmmo'; durationSec: number }
  | { kind: 'instantReload'; fraction?: number }              // refill magazine (fraction of max, default full)
  | { kind: 'ignored'; note: string }                         // recognized, deliberately unmodeled (defensive etc.)
  | { kind: 'unsupported'; raw: string };                     // unparseable — surfaces as a warning

export interface Block {
  slot: SkillSlot;
  trigger: TriggerDef;
  target: TargetDef;
  effects: EffectDef[];
}

export interface CharacterSkills {
  blocks: Block[];
  warnings: string[];
  source: 'parser' | 'override' | 'parser+override';
}
