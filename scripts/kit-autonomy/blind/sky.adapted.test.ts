import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * sky — SR / Iron / Supporter / Burst I. ammo 6, chargeFrames 60, hitsPerShot 1.
 *
 * Written BLIND from the kit prose alone (no sight of the override, its author's notes, or any
 * other test for this unit). Each assertion states what the prose requires and names the
 * nearest-wrong model it goes RED under.
 *
 * KIT, line by line (scope / duration / trigger / target):
 *   S1a  full charge held 1s+ while NOT in the named state, allies: debuff immunity (1 debuff,
 *        5 sec, 3 activations per battle). No schema primitive exists for debuff immunity, nor
 *        for a per-battle activation cap, and the fixture has no debuff source => GAP (it.skip);
 *        the text must still be accounted for in the override (no silent drops).
 *   S1b  full charge held 1s+, SELF: 'Gains Pierce for 40 sec' => gainPierce{durationSec:40}
 *        (the timed-window EFFECT, NOT the whole-fight hasPierce FLAG), plus Pierce Damage up
 *        60% for 40 sec => buff pierceDamagePct 60 / durationSec 40, target self. Trigger is
 *        fullCharge (an unswapped SR releases only at full charge, so this is per-pull; the
 *        schema states the primitive exists precisely so the block shape matches this wording
 *        instead of riding the shotFired equivalence). The 'maintained for 1 or more seconds'
 *        hold has no primitive (chargeFrames 60 == 1.0 s) — MEASUREMENT-GATED residue, not
 *        asserted here.
 *   S2a  on entering Full Burst, allies: ATK up 20% OF THE SKILL USER'S ATK for 10 sec =>
 *        casterAtkPct 20, flat-resolved at apply time, target allies INCLUDING self, trigger
 *        fullBurstEnter (ANY team Full Burst) — NOT burstCast.
 *   S2b  when the burst-granted status is removed, allies: ATK down 10% of the skill user's ATK
 *        for 20 sec => selfStatusEnd trigger + buff casterAtkPct -10 / durationSec 20.
 *   S2c  only while in that down-state, SELF: stun for 20 sec => stun{durationSec:20}, GATED on
 *        the state. Ungated this line is catastrophic: she never fires at all.
 *   Bur  allies: Pierce Damage up 15% for 35 sec, up to 3 stacks; SELF: ATK up 50% for 35 sec
 *        (a plain percentage, so atkPct — not casterAtkPct).
 *
 * FIXTURE / REACHABILITY — the central fact about this unit in this harness:
 *   controlComp(carry) seats liter (Burst I) alongside the carry. This unit is ALSO Burst I, so
 *   liter takes Burst Stage 1 every rotation and this unit NEVER casts her own burst in the
 *   control comp. Her burst slot, the status it opens, and the whole removal -> team ATK-down ->
 *   self-stun chain are therefore fixture-UNREACHABLE. That is not a licence to skip them: the
 *   reachable half (S1b, S2a) is asserted behaviourally with withPatchedOverride
 *   counterfactuals; the unreachable half is asserted (a) NEGATIVELY — the chain must be
 *   observably inert in this fixture, with an injected battle-start stun as the positive control
 *   proving the fixture would show a stun if one fired — and (b) STRUCTURALLY, by reading the
 *   committed override through withPatchedOverride's clone. The structural assertions are
 *   deliberately spec-prescriptive: a divergence there is the payload, not a bug in the test.
 *
 * SHAPE NOTE: the packet documents the override file as slot -> Block[] in one place and as
 * slot -> { blocks: Block[] } in another. blocksOf() accepts either, so nothing below hinges on
 * which is true.
 *
 * 8 hoisted runs (each a full 180 s sim).
 */

const SLUG = 'sky';

type Opts = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;

interface LooseEffect {
  kind?: string;
  stat?: string;
  name?: string;
  value?: number;
  durationSec?: number;
  maxStacks?: number;
  [k: string]: unknown;
}
interface LooseBlock {
  trigger?: { kind?: string; name?: string };
  target?: { kind?: string; excludeSelf?: boolean };
  effects?: LooseEffect[];
  requiresSelfStatus?: string;
  [k: string]: unknown;
}
interface LooseOverride {
  hasPierce?: boolean;
  [k: string]: unknown;
}

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

function blocksOf(ov: LooseOverride, slot: (typeof SLOTS)[number]): LooseBlock[] {
  const s = ov[slot] as unknown;
  if (!s) return [];
  if (Array.isArray(s)) return s as LooseBlock[];
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}
function allBlocks(ov: LooseOverride): LooseBlock[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function effectsOf(b: LooseBlock): LooseEffect[] {
  return b.effects ?? [];
}

// read-only view of the committed override (mutator is a no-op; the clone is discarded)
const OV = withPatchedOverride(SLUG, () => {}) as unknown as LooseOverride;

interface BuffEv {
  kind: string;
  stat?: string;
  value?: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number;
}
const kindOf = (ev: SimEvent): string => (ev as unknown as { kind: string }).kind;
const buffsIn = (events: SimEvent[]): BuffEv[] =>
  events.filter((e) => kindOf(e) === 'buffApply').map((e) => e as unknown as BuffEv);
const count = (events: SimEvent[], k: string): number =>
  events.filter((e) => kindOf(e) === k).length;

/** multiset of emitted values for one stat — lets a counterfactual DELTA isolate this unit's
 *  own applications without needing her caster index. */
function valueCounts(events: SimEvent[], stat: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const b of buffsIn(events)) {
    if (b.stat === stat && typeof b.value === 'number') m.set(b.value, (m.get(b.value) ?? 0) + 1);
  }
  return m;
}

function run(opts: Opts): { res: Res; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const res = runComp({
    ...(opts as object),
    cfg: { onEvent: (ev: SimEvent) => events.push(ev) }, // ADAPTED: the one-line harness wiring fix
  } as Opts);
  return { res, events };
}

function skyOpts(mutate: (ov: LooseOverride) => void): Opts {
  const patched = withPatchedOverride(SLUG, (ov) => mutate(ov as unknown as LooseOverride));
  const base = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  return {
    ...base,
    overrides: { ...((base.overrides as object) ?? {}), [SLUG]: patched },
  } as unknown as Opts;
}

const isSelfPierceBuff = (e: LooseEffect): boolean =>
  e.kind === 'buff' && e.stat === 'pierceDamagePct' && e.value === 60;
const isFbAtkBuff = (e: LooseEffect): boolean =>
  e.kind === 'buff' && e.stat === 'casterAtkPct' && e.value === 20;
const isFbAtkBlock = (b: LooseBlock): boolean =>
  b.trigger?.kind === 'fullBurstEnter' && effectsOf(b).some(isFbAtkBuff);

// ---------------------------------------------------------------- hoisted runs

const CONTROL = run(controlComp(SLUG, true));

let nGainPierce = 0;
const NO_GAIN_PIERCE = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      const before = effectsOf(b).length;
      b.effects = effectsOf(b).filter((e) => e.kind !== 'gainPierce');
      nGainPierce += before - b.effects.length;
    }
  }),
);

let nPierceBuff = 0;
const NO_PIERCE_BUFF = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      const before = effectsOf(b).length;
      b.effects = effectsOf(b).filter((e) => !isSelfPierceBuff(e));
      nPierceBuff += before - b.effects.length;
    }
  }),
);

let nPierceDoubled = 0;
const PIERCE_DOUBLED = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      for (const e of effectsOf(b)) {
        if (isSelfPierceBuff(e)) {
          e.value = 120;
          nPierceDoubled += 1;
        }
      }
    }
  }),
);

let nFbAtk = 0;
const NO_FB_ATK = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      if (b.trigger?.kind !== 'fullBurstEnter') continue;
      const before = effectsOf(b).length;
      b.effects = effectsOf(b).filter((e) => !isFbAtkBuff(e));
      nFbAtk += before - b.effects.length;
    }
  }),
);

let nFbAtkSelf = 0;
const FB_ATK_SELF = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      if (!isFbAtkBlock(b)) continue;
      b.target = { kind: 'self' };
      nFbAtkSelf += 1;
    }
  }),
);

let nFbAtkLong = 0;
const FB_ATK_LONG = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      if (b.trigger?.kind !== 'fullBurstEnter') continue;
      for (const e of effectsOf(b)) {
        if (isFbAtkBuff(e)) {
          e.durationSec = 30;
          nFbAtkLong += 1;
        }
      }
    }
  }),
);

// positive control for the stun: an INJECTED battle-start self-stun. Independent of how (or
// whether) the driver encoded the kit's own stun, so it can prove the fixture would reveal a
// stun that actually fired.
const STUN_INJECTED = run(
  skyOpts((ov) => {
    const slot = SLOTS.find((s) => blocksOf(ov, s).length > 0);
    if (!slot) throw new Error('override exposes no blocks in any slot');
    blocksOf(ov, slot).push({
      slot,
      trigger: { kind: 'battleStart' },
      target: { kind: 'self' },
      effects: [{ kind: 'stun', durationSec: 300 }],
    } as LooseBlock);
  }),
);

// ---------------------------------------------------------------- derived

const T_BASE = totals(CONTROL.res);
const ALL_SLUGS = Object.keys(T_BASE);
const TEAMMATES = ALL_SLUGS.filter((s) => s !== SLUG);
const N_UNITS = ALL_SLUGS.length;
const FB_STARTS = count(CONTROL.events, 'fullBurstStart');
const SKY_BASE = unitOf(CONTROL.res, SLUG).totalDamage;
const teamSum = (res: Res): number => Object.values(totals(res)).reduce((a, b) => a + b, 0);
const mateSum = (res: Res): number => {
  const t = totals(res);
  return TEAMMATES.reduce((a, s) => a + t[s], 0);
};

// ---------------------------------------------------------------- tests

describe('sky — fixture sanity / non-vacuity', () => {
  it('runs the unit and actually produces Full Bursts', () => {
    expect(SKY_BASE).toBeGreaterThan(0);
    expect(FB_STARTS).toBeGreaterThan(0);
    expect(count(CONTROL.events, 'burstCast')).toBeGreaterThan(0);
    expect(N_UNITS).toBeGreaterThanOrEqual(3);
    expect(TEAMMATES.length).toBeGreaterThanOrEqual(2);
  });
});

describe('S1b — self Pierce window + Pierce Damage up 60% (self, 40 sec)', () => {
  it('the Pierce grant exists and is load-bearing', () => {
    // patch bit: if this is 0 the grant is absent or encoded as something other than gainPierce
    expect(nGainPierce).toBeGreaterThanOrEqual(1);
    // nearest-wrong: no pierce tag at all -> her own Pierce Damage up cannot feed Damage Up
    expect(unitOf(NO_GAIN_PIERCE.res, SLUG).totalDamage).toBeLessThan(SKY_BASE);
    // a nonzero delta also proves the fullCharge trigger really fires in this fixture
  });

  it('Pierce is a TRIGGERED 40-sec self window, not the whole-fight hasPierce flag', () => {
    // nearest-wrong: hasPierce:true (pierce-tagged from frame 0, before any full charge)
    expect(OV.hasPierce).not.toBe(true);
    const grants = allBlocks(OV).filter((b) => effectsOf(b).some((e) => e.kind === 'gainPierce'));
    expect(grants.length).toBe(1);
    for (const b of grants) {
      expect(b.trigger?.kind).toBe('fullCharge');
      expect(b.target?.kind).toBe('self');
      for (const e of effectsOf(b).filter((x) => x.kind === 'gainPierce')) {
        expect(e.durationSec).toBe(40);
        expect(e.durationShots).toBeUndefined(); // 'for 40 sec' is wall-clock, not a round budget
      }
    }
  });

  it('Pierce Damage up 60% is load-bearing and moves nobody else', () => {
    expect(nPierceBuff).toBeGreaterThanOrEqual(1);
    const sky = unitOf(NO_PIERCE_BUFF.res, SLUG).totalDamage;
    expect(sky).toBeLessThan(SKY_BASE);
    // removing the TAG must cost at least as much as removing her own 60% Damage-Up entry
    expect(unitOf(NO_GAIN_PIERCE.res, SLUG).totalDamage).toBeLessThanOrEqual(sky + 1e-6);
    // inertness: 'Affects self' — a teammate total must not budge in either counterfactual
    for (const s of TEAMMATES) {
      expect(totals(NO_PIERCE_BUFF.res)[s]).toBe(T_BASE[s]);
      expect(totals(NO_GAIN_PIERCE.res)[s]).toBe(T_BASE[s]);
    }
  });

  it('the 60% magnitude is load-bearing (60 -> 120 lifts only her)', () => {
    expect(nPierceDoubled).toBeGreaterThanOrEqual(1);
    expect(unitOf(PIERCE_DOUBLED.res, SLUG).totalDamage).toBeGreaterThan(SKY_BASE);
    for (const s of TEAMMATES) expect(totals(PIERCE_DOUBLED.res)[s]).toBe(T_BASE[s]);
  });

  it('the 60% buff carries the 40-sec window', () => {
    const es = allBlocks(OV).flatMap(effectsOf).filter(isSelfPierceBuff);
    expect(es.length).toBe(1);
    expect(es[0].durationSec).toBe(40);
  });
});

describe('S2a — Full Burst entry: allies ATK up 20% of the skill user ATK, 10 sec', () => {
  it('is authored as a caster-scaled ATK buff on a fullBurstEnter block, all allies, 10 sec', () => {
    expect(nFbAtk).toBeGreaterThanOrEqual(1);
    const blocks = allBlocks(OV).filter(isFbAtkBlock);
    expect(blocks.length).toBe(1);
    expect(blocks[0].target?.kind).toBe('allies');
    expect(blocks[0].target?.excludeSelf).not.toBe(true); // 'all allies' includes self
    const e = effectsOf(blocks[0]).find(isFbAtkBuff);
    expect(e?.durationSec).toBe(10);
  });

  it('fires once per TEAM Full Burst and reaches every ally incl. self, flat-resolved', () => {
    // removing the effect must not move the Full Burst cadence (gauge is per-impact, not damage)
    expect(count(NO_FB_ATK.events, 'fullBurstStart')).toBe(FB_STARTS);
    const before = valueCounts(CONTROL.events, 'casterAtkPct');
    const after = valueCounts(NO_FB_ATK.events, 'casterAtkPct');
    const deltas = [...before.entries()]
      .map(([v, c]) => [v, c - (after.get(v) ?? 0)] as const)
      .filter(([, d]) => d > 0);
    // exactly ONE distinct flat value: her static ATK is constant, so every application
    // snapshots the same number across all targets and all windows
    expect(deltas.length).toBe(1);
    const [value, delta] = deltas[0];
    // nearest-wrong A: burstCast keying -> 0 applications here (she is a 2nd Burst I and never
    // casts in this comp). nearest-wrong B: excludeSelf -> FB_STARTS * (N_UNITS - 1).
    expect(delta).toBe(FB_STARTS * N_UNITS);
    // nearest-wrong C: a plain atkPct encoding would emit the raw kit percentage 20
    expect(value).not.toBe(20);
    expect(value).toBeGreaterThan(20);
  });

  it('is a TEAM buff: scoping it to self costs the teammates and only them', () => {
    expect(nFbAtkSelf).toBeGreaterThanOrEqual(1);
    const t = totals(FB_ATK_SELF.res);
    expect(mateSum(FB_ATK_SELF.res)).toBeLessThan(mateSum(CONTROL.res));
    for (const s of TEAMMATES) expect(t[s]).toBeLessThanOrEqual(T_BASE[s]);
    // she still receives it as self, so her own total is untouched
    expect(unitOf(FB_ATK_SELF.res, SLUG).totalDamage).toBe(SKY_BASE);
    const before = valueCounts(CONTROL.events, 'casterAtkPct');
    const after = valueCounts(FB_ATK_SELF.events, 'casterAtkPct');
    const deltas = [...before.entries()]
      .map(([v, c]) => [v, c - (after.get(v) ?? 0)] as const)
      .filter(([, d]) => d > 0);
    expect(deltas.length).toBe(1);
    expect(deltas[0][1]).toBe(FB_STARTS * (N_UNITS - 1));
  });

  it('the 10-sec window is bounded, not effectively permanent', () => {
    // nearest-wrong: a longer/absent duration. If 10 s were already covering the whole fight,
    // stretching it to 30 s could not add damage.
    expect(nFbAtkLong).toBeGreaterThanOrEqual(1);
    expect(teamSum(FB_ATK_LONG.res)).toBeGreaterThan(teamSum(CONTROL.res));
    expect(unitOf(FB_ATK_LONG.res, SLUG).totalDamage).toBeGreaterThan(SKY_BASE);
  });
});

describe('S2b / S2c — the ATK-down and the self-stun must stay INERT when she never bursts', () => {
  it('no ATK-down is ever applied in the control fixture', () => {
    // The down-buff and the stun share one trigger, so the absence of any negative ATK
    // application is ALSO the evidence that the stun never fired.
    // nearest-wrong: keying the removal to fullBurstEnd, an interval, or battleStart-opened
    // status -> the whole team eats a recurring ATK-down and she eats a 20 s stun.
    const negatives = buffsIn(CONTROL.events).filter(
      (b) =>
        (b.stat === 'casterAtkPct' || b.stat === 'atkPct' || b.stat === 'highestAllyAtkPct') &&
        typeof b.value === 'number' &&
        b.value < 0,
    );
    expect(negatives).toEqual([]);
  });

  it('she is never stunned here — positive control: an injected stun collapses her damage', () => {
    const stunned = unitOf(STUN_INJECTED.res, SLUG).totalDamage;
    expect(stunned).toBeLessThan(SKY_BASE * 0.05); // the fixture WOULD show a stun...
    expect(SKY_BASE).toBeGreaterThan(0); // ...and it shows none
  });

  it('the self-stun is 20 sec, self-targeted, and GATED — never unconditional', () => {
    const stunBlocks = allBlocks(OV).filter((b) => effectsOf(b).some((e) => e.kind === 'stun'));
    expect(stunBlocks.length).toBe(1);
    for (const b of stunBlocks) {
      for (const e of effectsOf(b).filter((x) => x.kind === 'stun')) {
        expect(e.durationSec).toBe(20);
      }
      expect(b.target?.kind).toBe('self');
      const gated =
        typeof b.requiresSelfStatus === 'string' || b.trigger?.kind === 'selfStatusEnd';
      expect(gated).toBe(true);
      expect(b.trigger?.kind).not.toBe('passive');
      expect(b.trigger?.kind).not.toBe('battleStart');
    }
  });

  it('the ATK-down 10% is caster-scaled, 20 sec, team-wide, keyed to status removal', () => {
    const blocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some((e) => e.kind === 'buff' && e.stat === 'casterAtkPct' && e.value === -10),
    );
    expect(blocks.length).toBe(1);
    expect(blocks[0].trigger?.kind).toBe('selfStatusEnd');
    expect(String(blocks[0].trigger?.name ?? '')).toMatch(/tension/i);
    expect(blocks[0].target?.kind).toBe('allies');
    const e = effectsOf(blocks[0]).find((x) => x.value === -10);
    expect(e?.durationSec).toBe(20);
  });

  it.skip('BEHAVIOURAL: status removal -> team ATK-down 20 s -> self-stun 20 s. GAP (fixture): needs her OWN Burst I cast, but controlComp seats liter at Burst Stage 1, so this Burst I unit never casts and the status never opens. Requires a comp fixture with no other Burst I unit.', () => {});
});

describe('burst — allies Pierce Damage up 15% (3 stacks, 35 s) + self ATK up 50% (35 s)', () => {
  it('the ally pierce-damage buff is 15 / 35 sec / 3 stacks on all allies', () => {
    const blocks = blocksOf(OV, 'burst').filter((b) =>
      effectsOf(b).some((e) => e.stat === 'pierceDamagePct'),
    );
    expect(blocks.length).toBe(1);
    expect(blocks[0].target?.kind).toBe('allies');
    const e = effectsOf(blocks[0]).find((x) => x.stat === 'pierceDamagePct');
    expect(e?.value).toBe(15);
    expect(e?.durationSec).toBe(35);
    expect(e?.maxStacks).toBe(3);
  });

  it('the self ATK up 50% is a plain self-scaling atkPct, not caster-scaled', () => {
    const es = blocksOf(OV, 'burst')
      .filter((b) => b.target?.kind === 'self')
      .flatMap(effectsOf)
      .filter((e) => e.kind === 'buff' && e.value === 50);
    expect(es.length).toBe(1);
    expect(es[0].stat).toBe('atkPct'); // kit says a bare 'ATK up 50%', with no 'of the skill user'
    expect(es[0].durationSec).toBe(35);
  });

  it('the burst opens the named status the S2 removal trigger reads (35 s), and the down-state window (20 s) exists', () => {
    const statuses = [...blocksOf(OV, 'burst'), ...blocksOf(OV, 'skill2')]
      .flatMap(effectsOf)
      .filter((e) => e.kind === 'selfStatus');
    expect(statuses.length).toBeGreaterThanOrEqual(2);
    expect(statuses.some((e) => e.durationSec === 35)).toBe(true);
    expect(statuses.some((e) => e.durationSec === 20)).toBe(true);
    for (const e of statuses) expect(String(e.name ?? '')).toMatch(/tension/i);
  });

  it.skip('BEHAVIOURAL: burst pierce stacks (3x15%) + self ATK up 50%. GAP (fixture): her burst never casts in controlComp — see the header fixture note.', () => {});
});

describe('S1a — Defiant Spirit debuff immunity (GAP)', () => {
  it('the un-modelable line is still accounted for somewhere in the override', () => {
    expect(JSON.stringify(OV).toLowerCase()).toContain('defiant');
  });

  it.skip('debuff immunity for 1 debuff / 5 sec, 3 activations per battle. GAP: no schema primitive for immunity and none for a per-battle activation cap; the fixture also applies no ally-side debuff, so the line is unobservable even if modeled.', () => {});
});
