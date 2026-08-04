/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * sora (RL / Wind / Supporter / Burst I) - BLIND kit spec test.
 *
 * Written from the kit prose alone (S5 post-op); the shipped override, the driver's tests
 * and the driver's reasoning were never read.
 *
 * KIT (paraphrased, short quotes only)
 *   skill1  start of battle, self:  'Outgoing healing' +35.2%, continuous.
 *   skill2  activates when an ally or self destroys an enemy PART, all allies:
 *             - a healing 'Storage' capped at 5.36% of Max HP, 5 stacks, 15 sec
 *             - ATK +23.74% 'of the skill user's ATK' for 15 sec  -> casterAtkPct
 *   burst   all allies: recovers 52.27% of the caster's final Max HP; removes 1 debuff.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *  1. skill1's stat is a HEALING MAGNITUDE. No StatKey expresses it and the engine's `heal`
 *     effect models no HP amount, so the faithful disposition is GAP. The live risk is
 *     mis-encoding 35.2 as a damage stat, so the test asserts sora grants no damage-relevant
 *     stat buff at all, and that 35.2 appears in no skill1 buff effect.
 *  2. skill2's activation clause is PART DESTRUCTION. The scope-lock boss is partless and the
 *     trigger vocabulary has no part-destroy kind, so the entire block must be BEHAVIOURALLY
 *     INERT. Every nearest-wrong model (re-keying to passive / fullBurstEnter / burstCast /
 *     hitCount) puts a team-wide casterAtkPct on the board, so 'emptying skill2 changes
 *     nothing' goes red under all of them. A synthetic passive-keyed clone of the same grant
 *     proves the check is not vacuous - wired up, it DOES move the board.
 *  3. the burst is a heal + a cleanse: no damage of its own, and its only observable channel
 *     is a teammate's `recovery` trigger. The test injects a recovery SENSOR onto crown (an
 *     atkPct buff on a {kind:'recovery'} trigger) so the tandem reading does not depend on
 *     crown's real kit, and runs it in the helm-free comp so the fixed B3's own heals cannot
 *     pre-satisfy the sensor. The nearest-wrong model - encoding 52.27% as a casterMaxHpPct
 *     grant instead of a heal - fires no recovery trigger and is caught structurally too.
 *
 * FIXTURES
 *   controlComp('sora', true)  - liter B1 / crown B2 / sora / helm B3: skill1 + skill2 work.
 *   controlComp('sora', false) - helm dropped: burst-heal tandem (helm's heals would confound
 *                                the recovery sensor).
 *   sora is a Burst I unit sitting in the carry slot alongside liter, so whether she ever
 *   casts her burst is a FIXTURE fact, not a kit fact - a tracer burst hit measures it
 *   explicitly, and the tandem assertion only runs once that is established.
 *
 * ASSUMPTION: scope-lock config (no cube), so the only self-targeted buffApply events sora
 * can emit are kit-sourced.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'sora';
const S1_HEAL_PCT = 35.2;
const STORAGE_MAXHP_PCT = 5.36;
const S2_ATK_PCT = 23.74;
const S2_DURATION_SEC = 15;
const BURST_HEAL_MAXHP_PCT = 52.27;
const SENTINEL_STAT = 'critDamagePct';
const SENTINEL_VALUE = 7.77;

const DAMAGE_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeDamageMultPct',
  'attackDamagePct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'trueDamagePct',
  'damageTakenPct',
  'extraHitDamagePct',
  'normalAttackPct',
  'elemAdvantageDamagePct',
]);

type Slot = 'skill1' | 'skill2' | 'burst';
type AnyBlock = Record<string, any>;

/** The override FILE is slot-keyed; tolerate both `ov[slot]: Block[]` and `ov[slot].blocks`. */
function readSlot(ov: any, slot: Slot): AnyBlock[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? (s as AnyBlock[]) : ((s.blocks ?? []) as AnyBlock[]);
}
function writeSlot(ov: any, slot: Slot, blocks: AnyBlock[]): void {
  const s = ov?.[slot];
  if (s && !Array.isArray(s)) s.blocks = blocks;
  else ov[slot] = blocks;
}

interface BuffApplyLike {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
}
const buffApplies = (evs: SimEvent[]): BuffApplyLike[] =>
  (evs as unknown as BuffApplyLike[]).filter((e) => e.kind === 'buffApply');

function withEvents<T>(opts: T, sink: SimEvent[]): T {
  const o = opts as unknown as { cfg?: Record<string, unknown> };
  o.cfg = { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => sink.push(ev) };
  return opts;
}
function withOverrides<T>(opts: T, map: Record<string, unknown>): T {
  const o = opts as unknown as { overrides?: Record<string, unknown> };
  o.overrides = { ...(o.overrides ?? {}), ...map };
  return opts;
}

const effectsOf = (blocks: AnyBlock[]): AnyBlock[] =>
  blocks.flatMap((b) => ((b.effects ?? []) as AnyBlock[]));
const near = (a: unknown, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < 1e-4;

// ------------------------------------------------------------------ hoisted runs (7)

const controlEvents: SimEvent[] = [];
const control = runComp(withEvents(controlComp(SLUG, true), controlEvents));

// One clone captures the authored structure AND yields the heal-stripped counterfactual.
let ovSkill1: AnyBlock[] = [];
let ovSkill2: AnyBlock[] = [];
let ovBurst: AnyBlock[] = [];
const healOff = withPatchedOverride(SLUG, (ov: any) => {
  ovSkill1 = readSlot(ov, 'skill1');
  ovSkill2 = readSlot(ov, 'skill2');
  ovBurst = readSlot(ov, 'burst');
  writeSlot(
    ov,
    'burst',
    ovBurst.map((b) => ({
      ...b,
      effects: ((b.effects ?? []) as AnyBlock[]).filter((e) => e.kind !== 'heal'),
    })),
  );
});

const s2Empty = withPatchedOverride(SLUG, (ov: any) => {
  writeSlot(ov, 'skill2', []);
});

// The same ATK grant, deliberately re-keyed to the nearest-wrong trigger, plus a
// uniquely-valued sentinel buff whose casterIdx identifies sora's slot in this comp.
const s2Passive = withPatchedOverride(SLUG, (ov: any) => {
  writeSlot(ov, 'skill2', [
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        { kind: 'buff', stat: 'casterAtkPct', value: S2_ATK_PCT },
        { kind: 'buff', stat: SENTINEL_STAT, value: SENTINEL_VALUE },
      ],
    },
  ]);
});

const burstTracer = withPatchedOverride(SLUG, (ov: any) => {
  writeSlot(ov, 'burst', [
    ...readSlot(ov, 'burst'),
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 1000 }],
    },
  ]);
});

// A recovery SENSOR: makes any heal that reaches crown observable as damage, independent
// of whatever crown's real on-recovery line happens to grant.
const crownSensor = withPatchedOverride('crown', (ov: any) => {
  writeSlot(ov, 'skill1', [
    ...readSlot(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 100 }],
    },
  ]);
});

const s2EmptyRes = runComp(
  withOverrides(controlComp(SLUG, true), { [SLUG]: s2Empty }),
);
const s2PassiveEvents: SimEvent[] = [];
const s2PassiveRes = runComp(
  withEvents(
    withOverrides(controlComp(SLUG, true), { [SLUG]: s2Passive }),
    s2PassiveEvents,
  ),
);

const noHelmPlain = runComp(controlComp(SLUG, false));
const noHelmTracer = runComp(
  withOverrides(controlComp(SLUG, false), { [SLUG]: burstTracer }),
);
const sensorHealOn = runComp(
  withOverrides(controlComp(SLUG, false), { crown: crownSensor }),
);
const sensorHealOff = runComp(
  withOverrides(controlComp(SLUG, false), {
    crown: crownSensor,
    [SLUG]: healOff,
  }),
);

const sentinel = buffApplies(s2PassiveEvents).find(
  (e) => e.stat === SENTINEL_STAT && near(e.value, SENTINEL_VALUE),
);
const soraIdx = sentinel?.casterIdx ?? null;
const soraBuffs = buffApplies(controlEvents).filter(
  (e) => soraIdx !== null && e.casterIdx === soraIdx,
);

const soraCastsBurst =
  unitOf(noHelmTracer, SLUG).totalDamage > unitOf(noHelmPlain, SLUG).totalDamage;

// ------------------------------------------------------------------ skill1

describe('sora skill1 - outgoing healing +35.2% (self, continuous)', () => {
  it.skip('scales healing output by 35.2% - GAP: no outgoing-healing StatKey, and the `heal` effect carries no HP amount in v1, so the magnitude is unobservable', () => {
    // Intentionally unimplementable at scope. Recorded so the line is not silently dropped.
  });

  it('does not encode the 35.2% healing line as a stat buff', () => {
    const buffs = effectsOf(ovSkill1).filter((e) => e.kind === 'buff');
    // Nearest-wrong: 35.2 parked on atkPct / attackDamagePct / any damage stat because the
    // healing stat has no home. That would credit sora with a permanent self damage buff.
    expect(buffs.filter((e) => near(e.value, S1_HEAL_PCT))).toHaveLength(0);
  });
});

// ------------------------------------------------------------------ skill2

describe('sora skill2 - part-destroy trigger, ATK +23.74% of caster ATK / 15s', () => {
  it('sentinel run identifies sora\u2019s caster slot (index derivation for the runtime checks)', () => {
    expect(typeof soraIdx).toBe('number');
  });

  it('the part-destroy trigger never fires: emptying skill2 leaves the board byte-identical', () => {
    // The scope-lock boss is PARTLESS and no part-destroy trigger kind exists, so the whole
    // block must be inert. RED under every nearest-wrong re-key (passive / fullBurstEnter /
    // burstCast / hitCount), each of which puts a team-wide casterAtkPct on the board.
    expect(totals(s2EmptyRes)).toEqual(totals(control));
  });

  it('non-vacuity: the same ATK grant keyed passive DOES move the board', () => {
    const sum = (t: Record<string, number>): number =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(s2PassiveRes))).toBeGreaterThan(sum(totals(control)));
    // ...and it reaches teammates, not just sora (target: all allies).
    expect(totals(s2PassiveRes)['crown']).toBeGreaterThan(totals(control)['crown']);
  });

  it('the ATK grant is caster-scaled (of the skill user\u2019s ATK), never target-scaled', () => {
    const buffs = effectsOf(ovSkill2).filter((e) => e.kind === 'buff');
    // Nearest-wrong: atkPct 23.74 (scales each ally\u2019s OWN ATK) instead of casterAtkPct
    // (a flat add of 23.74% of sora\u2019s ATK). Different magnitude on every teammate.
    expect(buffs.filter((e) => e.stat === 'atkPct' && near(e.value, S2_ATK_PCT))).toHaveLength(0);
    const casterScaled = buffs.filter((e) => e.stat === 'casterAtkPct');
    for (const b of casterScaled) {
      expect(near(b.value, S2_ATK_PCT)).toBe(true);
      expect(b.durationSec).toBe(S2_DURATION_SEC);
      expect(b.durationShots).toBeUndefined();
    }
  });

  it('the healing Storage (5.36% Max HP, 5 stacks) is not encoded as a Max HP grant', () => {
    // It is a heal-overflow reservoir, not a Max HP buff; v1 has no HP pool, so it is
    // unmodellable. Nearest-wrong: casterMaxHpPct/targetMaxHpPct 5.36 (a real, permanent
    // stat grant that can feed an atkOfMaxHpPct consumer).
    const buffs = [...effectsOf(ovSkill1), ...effectsOf(ovSkill2), ...effectsOf(ovBurst)].filter(
      (e) => e.kind === 'buff',
    );
    expect(buffs.filter((e) => near(e.value, STORAGE_MAXHP_PCT))).toHaveLength(0);
  });

  it('sora puts no damage-relevant stat buff on the board in the control fight', () => {
    expect(typeof soraIdx).toBe('number');
    const damaging = soraBuffs.filter((e) => DAMAGE_STATS.has(e.stat ?? ''));
    expect(damaging.map((e) => `${e.stat}=${e.value}`)).toEqual([]);
    expect(soraBuffs.filter((e) => near(e.value, S1_HEAL_PCT))).toHaveLength(0);
  });
});

// ------------------------------------------------------------------ burst

describe('sora burst - heal all allies 52.27% of caster final Max HP, cleanse 1', () => {
  it('is a heal to all allies on her own burst cast', () => {
    const healBlocks = ovBurst.filter((b) =>
      ((b.effects ?? []) as AnyBlock[]).some((e) => e.kind === 'heal'),
    );
    expect(healBlocks.length).toBeGreaterThan(0);
    for (const b of healBlocks) {
      // Trigger identity: her own burst cast, not full-burst entry (she is Burst I - keying
      // to fullBurstEnter would fire on any team FB, including rotations she sat out).
      expect(b.trigger?.kind).toBe('burstCast');
      // Target set: 'Affects all allies' includes self.
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf).toBeFalsy();
    }
  });

  it('deals no damage of its own', () => {
    const dmg = effectsOf(ovBurst).filter((e) =>
      ['flatDamage', 'dot', 'hitRepeat', 'storedHit', 'weaponSwap'].includes(e.kind),
    );
    expect(dmg.map((e) => e.kind)).toEqual([]);
  });

  it('the 52.27% is a heal, not a Max HP grant', () => {
    // Nearest-wrong: casterMaxHpPct 52.27 on allies. That emits a permanent maxHpFlat buff
    // (feeding HP-scaling ATK consumers) and fires NO recovery trigger - the opposite of a heal.
    const buffs = effectsOf(ovBurst).filter((e) => e.kind === 'buff');
    expect(
      buffs.filter(
        (e) =>
          ['casterMaxHpPct', 'targetMaxHpPct', 'maxHpPct'].includes(e.stat ?? '') &&
          near(e.value, BURST_HEAL_MAXHP_PCT),
      ),
    ).toHaveLength(0);
  });

  it('fixture non-vacuity: sora actually casts her Burst I in the helm-free control comp', () => {
    // A tracer hit on her burstCast. RED here means the fixture cannot exercise her burst
    // (she is a Burst I sharing stage 1 with liter) - a FIXTURE finding, not a kit divergence.
    expect(soraCastsBurst).toBe(true);
  });

  it.runIf(soraCastsBurst)(
    'the burst heal actually reaches teammates (recovery sensor on crown)',
    () => {
      // Sensor = an atkPct buff on a {kind:'recovery'} trigger, self-targeted on crown. In the
      // helm-free comp sora is the only healer, so crown\u2019s damage rises only if sora\u2019s burst
      // emits a real recovery event to allies. RED if the heal is missing, self-only, or
      // encoded as a stat buff instead of a heal.
      expect(totals(sensorHealOn)['crown']).toBeGreaterThan(totals(sensorHealOff)['crown']);
    },
  );

  it.skip('removes 1 debuff - GAP: the sim models no ally debuffs, so the cleanse has no observable payload', () => {
    // Recorded so the line is not silently dropped.
  });
});
