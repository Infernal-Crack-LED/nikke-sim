import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * noise (RL / Electric / Supporter / Burst I) — BLIND kit-spec test.
 * Written from the kit prose alone; the driver's override, tests and reasoning were not consulted.
 *
 * KIT TEXT (structural read):
 *  S1  trigger 'Activates when attacked 20 time(s)', target all allies:
 *      Damage Taken ▼10.66% for 20 sec.
 *      -> ALLY damage-reduction. v1 models no incoming damage and has no 'was attacked' trigger, so
 *         the line is offensively INERT. The dangerous nearest-wrong is encoding it as the boss
 *         debuff damageTakenPct (positive = boss takes MORE), which would gift the whole team a
 *         free damage bucket off a purely defensive line.
 *  S2a trigger 'hitting a target with a Full Charge attack', target the enemy: Taunts for 2 sec.
 *      -> aggro/threat; no engine primitive (stun is a different mechanic). GAP.
 *  S2b trigger 'attacking with Full Charge', target self: Max HP ▲24.86% for 1.8 sec.
 *      -> SELF-scoped, fires on EVERY full charge (dozens of times over 180 s, not once per burst),
 *         short 1.8 s window. noise carries no atkOfMaxHpPct conversion, so the grant is
 *         damage-inert — but it is kept because Max HP is a real stat with future consumers.
 *  B   target all allies: 'Constantly recovers 2.47% of the skill user's final Max HP every 1 sec
 *      for 10 sec' + 'Max HP ▲49.5% for 10 sec'.
 *      -> burstCast-keyed, allies INCLUDING self. The recovery line is a 10-TICK HoT
 *         (ticks:10, intervalSec:1), not one instant heal: the tick count is what keeps a
 *         teammate's on-recovery consumer refreshed. The Max HP line reads plain 'Max HP ▲ x%'
 *         with NO 'of the skill user's', so it is TARGET-scaled (targetMaxHpPct -> per-target flat
 *         HP), unlike the heal line which IS caster-scaled.
 *
 * FIXTURE: controlComp('noise', true) — liter B1 / crown B2 / noise / helm B3, deterministic, no seed.
 *  - crown is the canonical 'when recovery takes effect' consumer, and is the ONLY reason the burst
 *    HoT is observable at all: there is no heal/recovery event kind on the event log.
 *  - CAVEAT: noise is a Burst I sharing stage 1 with liter (cd 20 s vs her 40 s). If the rotation
 *    never hands noise a cast, the burst-slot assertions fail on their precondition expect() with
 *    that message — that is a fixture limit to re-fixture around, not a kit divergence.
 *
 * METHOD: every claim is proven by a COUNTERFACTUAL DIFF instead of slot-index bookkeeping. Each
 * patched run differs from the base run in exactly one authored detail, and because Max HP is
 * damage-inert for a unit with no HP->ATK conversion, every other event in the two runs is
 * identical. The multiset difference of maxHpFlat buffApply events therefore IS the grant under
 * test, with zero attribution guesswork (caster-scaled and target-scaled stats both re-emit as
 * flat maxHpFlat, so the flat VALUE is what discriminates them).
 */

type Eff = {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
  intervalSec?: number;
};
type Blk = {
  slot?: string;
  trigger?: { kind: string };
  target?: { kind: string; excludeSelf?: boolean };
  effects?: Eff[];
};
type SlotName = 'skill1' | 'skill2' | 'burst';
type SlotLike = Blk[] | { blocks?: Blk[] } | undefined;
type OvView = Record<SlotName, SlotLike>;
type BuffEv = {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number;
};

const SLOTS: SlotName[] = ['skill1', 'skill2', 'burst'];

// The override FILE is slot-keyed; a slot is either a bare Block[] or a CharacterSkills carrying
// its own blocks[]. Accept both so the patch helpers cannot silently no-op.
function blocksOf(ov: unknown, slot: SlotName): Blk[] {
  const s = (ov as unknown as OvView)[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function isHpBuff(e: Eff): boolean {
  return (
    e.kind === 'buff' &&
    ['maxHpFlat', 'maxHpPct', 'targetMaxHpPct', 'casterMaxHpPct'].includes(
      e.stat ?? ''
    )
  );
}

type Patch = (ov: unknown) => void;

function run(patch?: Patch) {
  const opts = controlComp('noise', true);
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      noise: withPatchedOverride('noise', (ov) => patch(ov)),
    };
  }
  const raw: SimEvent[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (e: SimEvent) => {
      raw.push(e);
    },
  };
  const res = runComp(opts);
  const buffs = raw
    .map((e) => e as unknown as BuffEv)
    .filter((b) => b.kind === 'buffApply');
  return { res, raw, buffs };
}
type Run = ReturnType<typeof run>;

function hpApplies(r: Run): BuffEv[] {
  return r.buffs.filter((b) => b.stat === 'maxHpFlat');
}
function hpCounts(r: Run): Map<string, number> {
  const m = new Map<string, number>();
  for (const b of hpApplies(r)) {
    const k = (b.targetSlug ?? '?') + '|' + Math.round(b.value ?? 0);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
// events present in run A but not in run B == the grant that B's patch removed/rewrote
function grantsOnlyIn(
  a: Run,
  b: Run
): { target: string; value: number; count: number }[] {
  const bc = hpCounts(b);
  const out: { target: string; value: number; count: number }[] = [];
  for (const [k, n] of Array.from(hpCounts(a))) {
    const d = n - (bc.get(k) ?? 0);
    if (d > 0) {
      const [target = '?', value = '0'] = k.split('|');
      out.push({ target, value: Number(value), count: d });
    }
  }
  return out;
}
function selfHpApplies(r: Run): number {
  return hpApplies(r).filter((b) => b.targetSlug === 'noise').length;
}
function firstExpiry(r: Run, value: number): number {
  const fs = hpApplies(r)
    .filter(
      (b) =>
        b.targetSlug === 'noise' &&
        Math.round(b.value ?? 0) === value &&
        typeof b.expiresFrame === 'number'
    )
    .map((b) => b.expiresFrame as number);
  return fs.length ? Math.min(...fs) : NaN;
}
function sumTotals(r: Run): number {
  return Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
}

// ---- hoisted runs (9 x 180 s sims) -------------------------------------------------------------
const base = run();
const noSkill1 = run((o) => {
  for (const b of blocksOf(o, 'skill1')) {
    b.effects = [];
  }
});
const noSkill2Hp = run((o) => {
  // DRIVER ADAPT: drop blocks left with no effects (engine requires >=1 effect/block; the
  // driver's S2 chargeCounter block carries ONLY the HP grant, so emptying it crashes the
  // chargeCounter dispatch). Removing the whole block == removing the grant (same intent).
  const arr = blocksOf(o, 'skill2');
  for (const b of arr) {
    b.effects = (b.effects ?? []).filter((e) => !isHpBuff(e));
  }
  (o as { skill2: Blk[] }).skill2 = arr.filter(
    (b) => (b.effects ?? []).length > 0
  );
});
const skill2BurstKeyed = run((o) => {
  for (const b of blocksOf(o, 'skill2')) {
    if ((b.effects ?? []).some(isHpBuff)) {
      b.trigger = { kind: 'burstCast' };
    }
  }
});
const skill2Long = run((o) => {
  for (const b of blocksOf(o, 'skill2')) {
    for (const e of b.effects ?? []) {
      if (isHpBuff(e)) {
        e.durationSec = 18;
      }
    }
  }
});
const noBurstHp = run((o) => {
  for (const b of blocksOf(o, 'burst')) {
    b.effects = (b.effects ?? []).filter((e) => !isHpBuff(e));
  }
});
const burstHpCasterScaled = run((o) => {
  for (const b of blocksOf(o, 'burst')) {
    for (const e of b.effects ?? []) {
      if (isHpBuff(e)) {
        e.stat = 'casterMaxHpPct';
      }
    }
  }
});
const hpValuesX10 = run((o) => {
  for (const s of SLOTS) {
    for (const b of blocksOf(o, s)) {
      for (const e of b.effects ?? []) {
        if (isHpBuff(e)) {
          e.value = (e.value ?? 0) * 10;
        }
      }
    }
  }
});
const noHeal = run((o) => {
  for (const b of blocksOf(o, 'burst')) {
    b.effects = (b.effects ?? []).filter((e) => e.kind !== 'heal');
  }
});

const s2Grants = grantsOnlyIn(base, noSkill2Hp);
const burstGrants = grantsOnlyIn(base, noBurstHp);

describe('noise — skill 1 (Damage Taken ▼10.66%, all allies, on being attacked 20x)', () => {
  it('is a DEFENSIVE ally line: it never becomes a boss damage-taken debuff and moves no damage', () => {
    // Nearest-wrong: reading '▼ on allies' as damageTakenPct on the boss (positive = boss takes
    // more). That model would light up a positive damageTakenPct apply that vanishes when S1 is
    // emptied, and would move every unit's totals. Boss-held debuffs carry casterIdx/targetIdx null,
    // so they are filtered by stat+sign, and teammates' own real debuffs cancel in the comparison.
    const posDt = (r: Run) =>
      r.buffs.filter((b) => b.stat === 'damageTakenPct' && (b.value ?? 0) > 0)
        .length;
    expect(posDt(base)).toBe(posDt(noSkill1));
    expect(totals(noSkill1.res)).toEqual(totals(base.res));
    expect(unitOf(noSkill1.res, 'noise').totalDamage).toBe(
      unitOf(base.res, 'noise').totalDamage
    );
  });

  it.skip('trigger \u0027Activates when attacked 20 time(s)\u0027 — GAP: v1 has no incoming-damage model and no was-attacked trigger primitive', () => {});
});

describe('noise — skill 2', () => {
  it('S2b Max HP ▲24.86% is SELF-scoped and never leaks onto an ally', () => {
    expect(
      s2Grants.length,
      'S2 self Max HP grant is not observable — the line looks unmodeled'
    ).toBeGreaterThan(0);
    // Nearest-wrong: target allies (the S1/burst lines are ally-scoped, so mis-copying the target
    // set is the live risk). Under that model the diff carries teammate slugs too.
    expect(Array.from(new Set(s2Grants.map((g) => g.target)))).toEqual([
      'noise',
    ]);
  });

  it('S2b fires per FULL CHARGE, not once per burst cast', () => {
    const applies = s2Grants.reduce((n, g) => n + g.count, 0);
    // noise is a 6-round RL with a 60-frame charge: a full-charge-keyed grant re-applies dozens of
    // times across a 180 s fight, while any burst-keyed model is bounded by her cast count (<= ~5).
    expect(applies).toBeGreaterThanOrEqual(20);
    expect(
      selfHpApplies(base) - selfHpApplies(skill2BurstKeyed)
    ).toBeGreaterThanOrEqual(15);
  });

  it('S2b window is the short 1.8 s one, not a burst-length window', () => {
    const v = s2Grants.length ? s2Grants[0]!.value : NaN;
    // The grant is damage-inert, so patching only its durationSec leaves the apply FRAMES identical
    // between the two runs — the whole delta lands in expiresFrame. Faithful 1.8 s -> the patched
    // 18 s run expires (18 - 1.8) * 60 = 972 frames later; a 10 s model would show only 480.
    const d = firstExpiry(skill2Long, v) - firstExpiry(base, v);
    expect(d).toBeGreaterThan(942);
    expect(d).toBeLessThan(1002);
  });

  it.skip('S2a \u0027Taunts for 2 sec\u0027 — GAP: no aggro/threat primitive (stun is a different mechanic and the boss is untargetable in v1)', () => {});
});

describe('noise — burst (all allies: 10-tick HoT + Max HP ▲49.5% for 10 sec)', () => {
  it('Max HP ▲49.5% reaches ALL allies including self', () => {
    expect(
      burstGrants.length,
      'noise (Burst I) never cast her burst in this fixture, or the burst Max HP line is unmodeled — re-fixture so stage 1 is hers before reading this as a divergence'
    ).toBeGreaterThan(0);
    const targets = new Set(burstGrants.map((g) => g.target));
    // Nearest-wrong: allies with excludeSelf, or a self-only grant. Self-inclusion is unconfounded
    // here because S2b's grant carries a different flat value and cancels out of this diff.
    expect(targets.size).toBeGreaterThanOrEqual(3);
    expect(targets.has('noise')).toBe(true);
  });

  it('Max HP ▲49.5% is TARGET-scaled, not caster-scaled', () => {
    expect(burstGrants.length).toBeGreaterThan(0);
    // The kit says plain 'Max HP ▲ 49.5%' (contrast the heal line, which spells out 'of the skill
    // user's final Max HP'). targetMaxHpPct resolves to 49.5% of EACH ally's own Max HP, so the
    // flat values differ across a mixed-class team; casterMaxHpPct hands every ally the SAME number.
    expect(
      new Set(burstGrants.map((g) => g.value)).size
    ).toBeGreaterThanOrEqual(2);
    const casterScaled = grantsOnlyIn(burstHpCasterScaled, noBurstHp);
    expect(new Set(casterScaled.map((g) => g.value)).size).toBe(1);
  });

  it('the recovery line is a 10-tick HoT at 1 s intervals, targeted at allies', () => {
    // Structural, because the engine emits no heal/recovery event kind — tick COUNT is only
    // observable through a consumer, and the consumer set is comp-dependent. Nearest-wrong: a
    // single instant heal (ticks default 1), which refreshes an on-recovery teammate once per
    // burst instead of ten times.
    const ov = withPatchedOverride('noise', () => {});
    const healBlocks = blocksOf(ov, 'burst').filter((b) =>
      (b.effects ?? []).some((e) => e.kind === 'heal')
    );
    const healEffs = healBlocks.flatMap((b) =>
      (b.effects ?? []).filter((e) => e.kind === 'heal')
    );
    expect(
      healEffs.length,
      'the 10 s recovery line must be modeled as a heal effect — it drives teammates on-recovery triggers'
    ).toBeGreaterThan(0);
    expect(
      healEffs.reduce((n, e) => n + (e.ticks ?? 1), 0)
    ).toBeGreaterThanOrEqual(10);
    for (const e of healEffs) {
      expect(e.intervalSec ?? 1).toBe(1);
    }
    for (const b of healBlocks) {
      expect(b.target?.kind).toBe('allies');
    }
  });

  it('the HoT is NOT inert — it feeds a teammate on-recovery consumer', () => {
    // TANDEM: a heal with no HP pool still has a damage footprint through crown's
    // 'when recovery takes effect' trigger in the control comp. Removing it must change either the
    // buff stream or team damage; identical signatures mean the heal was dropped (or the fixture
    // carries no recovery consumer, which is itself worth surfacing).
    const sig = (r: Run) => r.buffs.length + '|' + sumTotals(r).toFixed(2);
    expect(sig(base)).not.toBe(sig(noHeal));
  });

  it.skip('heal AMOUNT (2.47% of the skill user\u0027s final Max HP per tick) — GAP: the heal effect models no HP quantity (no HP pool in v1)', () => {});
});

describe('noise — cross-cutting inertness', () => {
  it('every Max HP grant is HP, not damage: scaling them 10x moves nothing', () => {
    // noise carries no atkOfMaxHpPct conversion and ally-granted Max HP never feeds a teammate's,
    // so a faithful model is damage-inert here. Under the nearest-wrong encodings (atkPct,
    // casterAtkPct, atkOfMaxHpPct) a 10x value would visibly move the board.
    expect(totals(hpValuesX10.res)).toEqual(totals(base.res));
  });
});
