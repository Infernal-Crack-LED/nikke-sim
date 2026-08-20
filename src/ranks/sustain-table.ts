// Curated sustain lines for the sustain ranking board (src/ranks/sustain.ts).
//
// Every value is kit prose at L10 from data/characters.json (scope lock runs
// 10/10/10), extracted 2026-07-26 for the union of the `healer`/`shield`
// archetype tags + `nayuta` (untagged). Lines that CANNOT proc under the
// board's scope-lock context (the boss deals no damage: no low-HP triggers, no
// cover-HP recovery, no on-attacked/shield-destroyed procs, no ally deaths) are
// kept with `zero:` documenting why they contribute 0 — faithful to scope, not
// an assertion that the kit line is weak in real play.
//
// Semantics:
//   kind 'heal'      — maxHpPct of the CASTER's final Max HP per tick; ticks>1
//                      = a 1-per-second regen (first tick at proc time).
//   kind 'shield'    — maxHpPct face value per proc (no shield pool is modeled;
//                      the boss deals no damage, so shields never break).
//   kind 'lifesteal' — "Recovers X% of attack damage as HP over/for N sec":
//                      valued as X% of the unit's OWN sim damage inside the
//                      union of [proc, proc+windowSec] windows (owner ruling
//                      2026-07-26; understates team context — in a real fight
//                      allies' damage counts too — documented in methodology).
//   targets          — team-total multiplier: 5 = all allies (a standard full
//                      team), N = N allies, 1 = self / single ally / one shared
//                      pool. Heals are "% of the skill user's Max HP", so each
//                      target is counted at the caster's own maxHp basis.
//   ramp             — escalating "each subsequent effect triggers all before
//                      it" per-proc values: proc n applies Σ ramp[0..min(n,len)-1].
//   divisor          — procs once per `divisor` trigger occurrences.
//   potency          — the unit's own healing-/HP-potency buff: heals landing
//                      within windowSec of the potency proc are ×mult.
//                      procs 'first' = only the first trigger carries it
//                      (anchor-innocent-maid's "Once:" line); 'all' = every
//                      trigger opens a window.
export type SustainTrigger =
  | 'burstCast'
  | 'fullBurstEnter'
  | 'fullBurstEnd'
  | 'fullChargeShot'
  | 'lastBullet'
  | 'shot'
  | 'interval'
  | 'battleStart';

export interface SustainLine {
  slot: 'skill1' | 'skill2' | 'burst';
  kind: 'heal' | 'shield' | 'lifesteal';
  trigger: SustainTrigger;
  maxHpPct?: number;
  ticks?: number;
  windowSec?: number;
  divisor?: number;
  intervalSec?: number;
  targets?: number;
  ramp?: number[];
  potency?: { mult: number; windowSec: number; procs: 'first' | 'all' };
  requiresProfile?: boolean; // counts only when the unit's pair profile ran (anchor's same-squad gate)
  note?: string;
  zero?: string;
}

export const SUSTAIN_TABLE: Record<string, SustainLine[]> = {
  ada: [
    {
      slot: 'skill2',
      kind: 'lifesteal',
      trigger: 'fullBurstEnter',
      maxHpPct: 10,
      windowSec: 10,
      targets: 1,
      note: '"Recovers 10% of damage as HP" for bursting B3 allies — board comp: only herself; valued on her own damage',
    },
  ],
  'alice-wonderland-bunny': [
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'shot',
      divisor: 60,
      maxHpPct: 7.4,
      targets: 5,
    },
  ],
  'anchor-innocent-maid': [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullBurstEnter',
      maxHpPct: 3.04,
      ticks: 8,
      targets: 5,
      potency: { mult: 1.3096, windowSec: 5, procs: 'first' },
      requiresProfile: true,
      note: 'same-squad gate satisfied by the mast-romantic-maid profile; Potency of HP ▲30.96% (first FB only) boosts the first 5 ticks',
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 40.18,
      targets: 5,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 1,
      zero: 'Storage (overheal pool 60.19%) — stores EXCESS healing only; no way to value without incoming damage',
    },
  ],
  'anis-star': [
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'fullChargeShot',
      maxHpPct: 1.26,
      targets: 5,
      note: "requires Everyone's Star (no other B1 ally) — true in the board comp",
    },
  ],
  'anne-miracle-fairy': [
    {
      slot: 'skill1',
      kind: 'lifesteal',
      trigger: 'shot',
      divisor: 3,
      maxHpPct: 6.07,
      windowSec: 5,
      targets: 1,
      note: 'Fairy Dance, every 3 normal attacks — "all Supporter allies" includes herself (she is Supporter class), so her own damage carries the line; the no-op teammates deal 0',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 5,
      zero: 'Incoming Healing ▲23.46% (allies) / ▼78.93% (enemies) — healing-potency modifiers, not recovery or shield',
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 38.61,
      targets: 0,
      zero: 'Attacker allies only — the board comp fields Supporter-class no-ops and she is a Supporter herself, so no target qualifies; class-restricted lines read low on this board (documented)',
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 1,
      zero: 'revives 1 incapacitated Attacker ally — nobody is ever incapacitated at scope lock',
    },
  ],
  aria: [
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 37.86,
      targets: 5,
    },
  ],
  bay: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullChargeShot',
      maxHpPct: 4,
      targets: 4,
      note: 'all allies except self',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'fullBurstEnd',
      maxHpPct: 0,
      targets: 1,
      zero: 'Cover HP recovery — cover not modeled (boss deals no damage)',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 1,
      zero: 'requires her cover destroyed — never happens at scope lock',
    },
  ],
  biscuit: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullBurstEnd',
      maxHpPct: 1.53,
      ticks: 10,
      targets: 0,
      zero: 'Attacker allies only — the board comp fields Supporter-class no-ops, so 0; class-restricted lines read low on this board (documented)',
    },
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 1,
      zero: 'requires a Defender ally below 50% HP — never happens at scope lock',
    },
    {
      slot: 'burst',
      kind: 'lifesteal',
      trigger: 'burstCast',
      maxHpPct: 55.44,
      windowSec: 10,
      targets: 1,
      zero: 'targets Supporter allies, valued on damage THEY deal — the no-op teammates deal 0, so 0 in board context',
    },
  ],
  blanc: [
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'shot',
      divisor: 120,
      maxHpPct: 11.8,
      targets: 1,
      note: 'shared shield (one pool)',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'fullBurstEnd',
      maxHpPct: 3.68,
      ticks: 5,
      targets: 5,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 3.84,
      ticks: 8,
      targets: 5,
    },
  ],
  centi: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 1,
      zero: 'requires her shield destroyed — never happens at scope lock',
    },
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 7,
      targets: 5,
    },
  ],
  claire: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullChargeShot',
      divisor: 3,
      maxHpPct: 2.86,
      targets: 2,
    },
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 10.13,
      targets: 5,
    },
  ],
  cocoa: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 5,
      zero: 'Cover HP restore only',
    },
  ],
  crown: [
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 10.45,
      targets: 5,
    },
  ],
  'delta-ninja-thief': [
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'battleStart',
      maxHpPct: 12.25,
      targets: 1,
      note: 'self, when no other Defender ally — true in the board comp',
    },
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'shot',
      divisor: 200,
      maxHpPct: 12.25,
      targets: 1,
      note: 'self, in Attract (her normal state)',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 4,
      maxHpPct: 0,
      targets: 5,
      zero: 'Ninjutsu IFAK stores HP recovery — storage pool, not direct sustain',
    },
  ],
  emma: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 5,
      zero: '5% chance when attacked — boss deals no damage at scope lock',
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 39.6,
      targets: 5,
    },
    {
      slot: 'burst',
      kind: 'lifesteal',
      trigger: 'burstCast',
      maxHpPct: 39.6,
      windowSec: 5,
      targets: 1,
    },
  ],
  ether: [
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 96,
      targets: 3,
    },
  ],
  flora: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'battleStart',
      maxHpPct: 1,
      ticks: 180,
      targets: 3,
      note: 'self + 2 adjacent, continuous',
    },
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 5,
      zero: 'requires an adjacent ally below 90% HP — never happens at scope lock',
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 10.45,
      targets: 5,
    },
  ],
  folkwang: [
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 32.9,
      targets: 2,
      note: '2 highest-ATK allies',
    },
    {
      slot: 'burst',
      kind: 'lifesteal',
      trigger: 'burstCast',
      maxHpPct: 65.81,
      windowSec: 10,
      targets: 1,
      zero: 'targets the 2 highest-ATK allies, valued on damage THEY deal — the no-op teammates deal 0, so 0 in board context',
    },
  ],
  helm: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullChargeShot',
      maxHpPct: 0.59,
      targets: 5,
    },
    {
      slot: 'burst',
      kind: 'lifesteal',
      trigger: 'burstCast',
      maxHpPct: 54.45,
      windowSec: 10,
      targets: 1,
    },
  ],
  'idoll-ocean': [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'lastBullet',
      maxHpPct: 4.86,
      targets: 1,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 29.7,
      targets: 5,
    },
  ],
  lily: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 5,
      zero: 'Cover HP restore only',
    },
  ],
  liter: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 2,
      zero: 'Cover HP restore only',
    },
  ],
  mana: [
    // evaluated by the per-unit hook (Metal γ windows after her bursts)
  ],
  marciana: [
    {
      slot: 'skill1',
      kind: 'lifesteal',
      trigger: 'lastBullet',
      maxHpPct: 10.95,
      windowSec: 3,
      targets: 1,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 28.11,
      targets: 5,
    },
  ],
  mari: [],
  mary: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'lastBullet',
      maxHpPct: 8.4,
      targets: 1,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 39.6,
      targets: 5,
    },
  ],
  'mary-bay-goddess': [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullBurstEnter',
      ramp: [1.05, 3.69, 6.86],
      ticks: 5,
      targets: 5,
      note: 'escalating: FB entry 1/2/3+ heals 1.05 / 4.74 / 11.6 % per sec for 5s',
    },
  ],
  milk: [
    {
      slot: 'burst',
      kind: 'lifesteal',
      trigger: 'burstCast',
      maxHpPct: 16.16,
      windowSec: 10,
      targets: 1,
    },
  ],
  mint: [
    // Dancing-status Full Charge regen — evaluated by the per-unit hook
    // (alternating Dancing/Singing windows from her own casts).
  ],
  misato: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'shot',
      divisor: 120,
      maxHpPct: 8.04,
      targets: 1,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 5.06,
      ticks: 5,
      targets: 5,
    },
  ],
  naga: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'shot',
      divisor: 5,
      maxHpPct: 9.58,
      targets: 2,
    },
  ],
  nayuta: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 3,
      maxHpPct: 25,
      targets: 1,
      note: 'Memory Absorption takes effect every 3s (her S2); the 25% self-heal is then shared equally across the team — team total is 25% per proc',
    },
  ],
  noise: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 2.47,
      ticks: 10,
      targets: 5,
    },
  ],
  pascal: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'shot',
      divisor: 10,
      maxHpPct: 6.28,
      targets: 1,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 55.29,
      targets: 3,
    },
  ],
  pepper: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'lastBullet',
      maxHpPct: 4.45,
      targets: 1,
    },
    // burst 27.22% at max Refresh Heart stacks — per-unit hook (stack-up tracking)
  ],
  prika: [
    // Performance HoT + Outgoing-healing potency — per-unit hook (solo vs
    // mint-duet Performance windows drive both the ticks and the ×1.4992).
  ],
  quiry: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 6.96,
      ticks: 10,
      targets: 5,
    },
  ],
  ram: [
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 10.08,
      targets: 5,
    },
  ],
  rapunzel: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullChargeShot',
      maxHpPct: 4.03,
      targets: 3,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 40.83,
      targets: 5,
    },
  ],
  'rapunzel-pure-grace': [
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'battleStart',
      maxHpPct: 20.59,
      targets: 1,
      note: 'shared shield (one pool), continuous — counted once',
    },
    {
      slot: 'skill1',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 20.59,
      targets: 1,
      note: 'shared shield refresh on cast',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'fullChargeShot',
      maxHpPct: 2,
      targets: 1,
      note: 'self',
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 1,
      zero: 'Shield HP restore — no shield pool is modeled',
    },
  ],
  'rei-ayanami': [
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 13.44,
      targets: 5,
      note: 'Fire Code allies — the synthetic teammates are Fire, so all qualify in board context',
    },
  ],
  rouge: [
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 5,
      zero: 'Damage Taken ▼ / Max HP ▲ lines — mitigation, not recovery or shield',
    },
  ],
  'sakura-suzuhara': [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 10.03,
      ticks: 10,
      targets: 2,
    },
  ],
  'snow-crane': [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullChargeShot',
      divisor: 3,
      maxHpPct: 1.32,
      targets: 5,
    },
    {
      slot: 'skill2',
      kind: 'shield',
      trigger: 'fullBurstEnter',
      maxHpPct: 9.5,
      targets: 5,
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 44.68,
      targets: 5,
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 1,
      zero: 'Terminated Contract regen — needs external recovery to stack Proof of Violation; none in board comp',
    },
  ],
  soda: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 3.23,
      targets: 5,
    },
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 5,
      zero: 'requires Maid Spirit at max stacks on cast — stack cadence unmodeled',
    },
  ],
  'soline-frost-ticket': [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 1,
      maxHpPct: 0,
      targets: 1,
      zero: 'requires a squad member below 15% HP — never happens at scope lock',
    },
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 32.26,
      targets: 5,
    },
  ],
  sora: [
    {
      slot: 'burst',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 52.27,
      targets: 5,
    },
  ],
  tia: [
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 0,
      targets: 1,
      zero: 'Cover HP restore — cover not modeled',
    },
    {
      slot: 'burst',
      kind: 'lifesteal',
      trigger: 'burstCast',
      maxHpPct: 21.96,
      windowSec: 10,
      targets: 1,
      note: 'self',
    },
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 35.07,
      targets: 1,
      note: 'self',
    },
    {
      slot: 'burst',
      kind: 'shield',
      trigger: 'burstCast',
      maxHpPct: 10.21,
      targets: 4,
      note: 'all allies except self',
    },
  ],
  trina: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullBurstEnd',
      maxHpPct: 4.06,
      ticks: 5,
      targets: 5,
    },
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'fullChargeShot',
      maxHpPct: 0,
      targets: 1,
      zero: 'requires 2 allies below 30%/50% HP — never happens at scope lock',
    },
  ],
  yukiko: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'interval',
      intervalSec: 3,
      maxHpPct: 5.7,
      targets: 5,
      note: "Media (Persona state) — every 3 sec, all allies, 5.7% of the skill user's final Max HP",
    },
    {
      slot: 'skill2',
      kind: 'heal',
      trigger: 'burstCast',
      maxHpPct: 5.7,
      ticks: 3,
      targets: 5,
      note: 'Mediarama (Scarlet Flower state) — every 3 sec inside the cast→Full-Burst-end window = exactly three activations per cast (+3/+6/+9s); the 1-sec tick spacing is table vocabulary, the PER-CAST magnitude (3 × 5.7% × 5 targets) is kit-literal',
    },
  ],
  yuni: [
    {
      slot: 'skill2',
      kind: 'lifesteal',
      trigger: 'fullChargeShot',
      maxHpPct: 2.77,
      windowSec: 10,
      targets: 1,
    },
  ],
  zwei: [
    {
      slot: 'skill1',
      kind: 'heal',
      trigger: 'shot',
      divisor: 5,
      maxHpPct: 0,
      targets: 5,
      zero: 'Cover HP restore only',
    },
  ],
};
