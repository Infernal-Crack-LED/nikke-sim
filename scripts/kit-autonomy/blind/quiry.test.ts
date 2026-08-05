/**
 * quiry (Quiry) — RL / Wind / Supporter / Burst II — kit spec test (written BLIND from kit prose).
 *
 * KIT (ground truth, structural summary):
 *   skill1 [a] on HITTING a target with Full Charge -> the target: ATK down 8.94% of the skill user ATK, 3 sec
 *   skill1 [b] on ATTACKING with Full Charge -> 2 Defender allies: ATK up 5.81% of the skill user ATK, 3 sec
 *   skill2     at the start of battle -> 2 Defender allies: Max HP up 11.63% continuously
 *   burst  [a] all allies: recovers 6.96% of the skill user final Max HP every 1 sec for 10 sec
 *   burst  [b] all Defender allies: Critical Rate up 19.9% for 10 sec
 *
 * FIXTURE — controlComp('quiry', true) = liter (B1) / crown (B2) / quiry (carry) / helm (B3).
 *   - quiry is Burst II and the fixture already carries a competing B2 (crown); the burst group
 *     asserts she casts 1..5 times over 180 s, which IS the non-vacuity check for both burst lines.
 *   - crown is the only Defender in the comp; liter / helm / quiry are the non-Defender bystanders.
 *     Every 'Defender ally' line therefore has one live target and three inert witnesses, which makes
 *     class-scoping falsifiable — but leaves the kit's '2 ... unit(s)' CAP unexercised (see gaps).
 *   - crown is also the fixture's on-recovery consumer, the ONLY observable channel for the burst
 *     heal: the event log has no heal/recovery kind, so the HoT is read through its consumer.
 *
 * METHOD — quiry-sourced buff events are isolated by DIFFING the event tally against a run with the
 * relevant slot emptied, instead of guessing her caster index; that survives any slot ordering.
 * Every counterfactual is built with withPatchedOverride (committed JSON untouched) and reports how
 * many blocks/effects it actually matched, asserted non-zero in the fixture-sanity test — a patch
 * that matched nothing would make its test vacuously green.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js' // path fixed 2026-08-04 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed;

// ------------------------------------------------------------------ shapes

interface BuffEv {
  kind: 'buffApply';
  stat: string;
  key: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug: string;
  expiresFrame?: number;
  durationShots?: number;
}

type LooseEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
  intervalSec?: number;
};
type LooseBlock = {
  trigger?: { kind?: string };
  target?: { kind?: string; cls?: string; count?: number; excludeSelf?: boolean };
  effects?: LooseEffect[];
};
type LooseOverride = Record<string, unknown>;
type Slot = 'skill1' | 'skill2' | 'burst';

// The override FILE is slot-keyed; read it shape-agnostically (Block[] directly, or a slot object
// carrying its own blocks[]) so a wrong guess about the slot container cannot silently no-op a patch.
const slotBlocks = (ov: LooseOverride, slot: Slot): LooseBlock[] => {
  const s = ov[slot];
  if (Array.isArray(s)) return s as LooseBlock[];
  if (s && typeof s === 'object' && Array.isArray((s as { blocks?: unknown }).blocks)) {
    return (s as { blocks: LooseBlock[] }).blocks;
  }
  return [];
};

const setSlotBlocks = (ov: LooseOverride, slot: Slot, blocks: LooseBlock[]): void => {
  const s = ov[slot];
  if (s && !Array.isArray(s) && typeof s === 'object' && Array.isArray((s as { blocks?: unknown }).blocks)) {
    (s as { blocks: LooseBlock[] }).blocks = blocks;
    return;
  }
  ov[slot] = blocks;
};

// ------------------------------------------------------------------ event helpers

const buffsOf = (events: SimEvent[]): BuffEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

// ally-facing applications only (boss-held debuffs carry casterIdx === null AND targetIdx === null)
const allyBuffs = (events: SimEvent[]): BuffEv[] =>
  buffsOf(events).filter((b) => b.targetIdx !== null);

const bossDebuffs = (events: SimEvent[]): BuffEv[] =>
  buffsOf(events).filter((b) => b.casterIdx === null && b.targetIdx === null);

const evKey = (b: BuffEv): string => `${b.stat}|${b.targetSlug}|${b.value}`;

type Tally = Map<string, { n: number; ev: BuffEv }>;

const tally = (bs: BuffEv[]): Tally => {
  const m: Tally = new Map();
  for (const b of bs) {
    const k = evKey(b);
    const cur = m.get(k);
    if (cur) cur.n += 1;
    else m.set(k, { n: 1, ev: b });
  }
  return m;
};

// keys whose count is HIGHER in `a` than in `b` — i.e. the applications the patched-out slot sourced
const onlyIn = (a: Tally, b: Tally): Tally => {
  const out: Tally = new Map();
  for (const [k, v] of a) {
    const d = v.n - (b.get(k)?.n ?? 0);
    if (d > 0) out.set(k, { n: d, ev: v.ev });
  }
  return out;
};

const dmg = (t: Record<string, number>, slug: string): number => t[slug] ?? 0;

const minExpiry = (bs: BuffEv[]): number =>
  bs.reduce(
    (acc, b) => Math.min(acc, b.expiresFrame ?? Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
  );

// ------------------------------------------------------------------ runner

const runQuiry = (overrides?: Record<string, unknown>) => {
  const events: SimEvent[] = [];
  const sink = (ev: SimEvent): void => {
    events.push(ev);
  };
  const src = controlComp('quiry', true) as unknown as Record<string, unknown>;
  const opts: Record<string, unknown> = { ...src, onEvent: sink };
  if (overrides) {
    opts.overrides = { ...((src.overrides as Record<string, unknown>) ?? {}), ...overrides };
  }
  // wire the sink to a nested cfg too when controlComp exposes one, so capture cannot silently no-op
  const cfg = src.cfg;
  if (cfg && typeof cfg === 'object') opts.cfg = { ...(cfg as object), onEvent: sink };
  const res = runComp(opts as Parameters<typeof runComp>[0]);
  return { res, events, tot: totals(res) };
};

const patch = (mutate: (ov: LooseOverride) => number) => {
  let hits = 0;
  const ov = withPatchedOverride('quiry', (o) => {
    hits = mutate(o as unknown as LooseOverride);
  });
  return { overrides: { quiry: ov }, hits };
};

// ------------------------------------------------------------------ effect predicates (override layer)

const isAtkGrant = (e: LooseEffect): boolean =>
  e.kind === 'buff' &&
  (e.stat === 'casterAtkPct' || e.stat === 'atkPct' || e.stat === 'highestAllyAtkPct') &&
  (e.value ?? 0) > 0;
const isMaxHpGrant = (e: LooseEffect): boolean =>
  e.kind === 'buff' && typeof e.stat === 'string' && /MaxHpPct$/i.test(e.stat);
const isCritGrant = (e: LooseEffect): boolean =>
  e.kind === 'buff' && (e.stat === 'critRatePct' || e.stat === 'critRateNormalPct');
const isHeal = (e: LooseEffect): boolean => e.kind === 'heal';

// ------------------------------------------------------------------ hoisted runs (10 x 180 s sims)

const DEFENDER = 'crown';
const NON_DEFENDERS = ['liter', 'helm', 'quiry'];

const base = runQuiry();

const s1EmptyPatch = patch((ov) => {
  const n = slotBlocks(ov, 'skill1').length;
  setSlotBlocks(ov, 'skill1', []);
  return n;
});
const s1Empty = runQuiry(s1EmptyPatch.overrides);

const s1AlliesPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'skill1')) {
    if ((b.effects ?? []).some(isAtkGrant)) {
      b.target = { kind: 'allies' };
      n += 1;
    }
  }
  return n;
});
const s1Allies = runQuiry(s1AlliesPatch.overrides);

const s1Dur10Patch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of b.effects ?? []) {
      if (isAtkGrant(e)) {
        e.durationSec = 10;
        n += 1;
      }
    }
  }
  return n;
});
const s1Dur10 = runQuiry(s1Dur10Patch.overrides);

const s2EmptyPatch = patch((ov) => {
  const n = slotBlocks(ov, 'skill2').length;
  setSlotBlocks(ov, 'skill2', []);
  return n;
});
const s2Empty = runQuiry(s2EmptyPatch.overrides);

const s2CasterPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'skill2')) {
    for (const e of b.effects ?? []) {
      if (isMaxHpGrant(e)) {
        e.stat = 'casterMaxHpPct';
        n += 1;
      }
    }
  }
  return n;
});
const s2Caster = runQuiry(s2CasterPatch.overrides);

const healTick1Patch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (isHeal(e)) {
        e.ticks = 1;
        n += 1;
      }
    }
  }
  return n;
});
const healTick1 = runQuiry(healTick1Patch.overrides);

const healSelfPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    const fx = b.effects ?? [];
    if (fx.some(isHeal) && !fx.some(isCritGrant)) {
      b.target = { kind: 'self' };
      n += 1;
    }
  }
  return n;
});
const healSelf = runQuiry(healSelfPatch.overrides);

const critAlliesPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    const fx = b.effects ?? [];
    if (fx.some(isCritGrant) && !fx.some(isHeal)) {
      b.target = { kind: 'allies' };
      n += 1;
    }
  }
  return n;
});
const critAllies = runQuiry(critAlliesPatch.overrides);

const crit5sPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (isCritGrant(e)) {
        e.durationSec = 5;
        n += 1;
      }
    }
  }
  return n;
});
const crit5s = runQuiry(crit5sPatch.overrides);

// ------------------------------------------------------------------ derived isolations

const baseTally = tally(allyBuffs(base.events));
const s1QuiryOnly = onlyIn(baseTally, tally(allyBuffs(s1Empty.events)));
const s2QuiryOnly = onlyIn(baseTally, tally(allyBuffs(s2Empty.events)));

// the per-full-charge ATK grant is the only quiry-sourced key applied dozens of times
const s1GrantHit = [...s1QuiryOnly.values()].find((v) => v.n > 10);
const s1GrantEv = s1GrantHit ? s1GrantHit.ev : undefined;
const s2GrantHit = [...s2QuiryOnly.values()].find((v) => v.ev.stat === 'maxHpFlat');

const CRIT_VALUE = 19.9;
const critEvents = allyBuffs(base.events).filter(
  (b) => b.stat === 'critRatePct' && b.value === CRIT_VALUE,
);

describe('quiry — fixture sanity', () => {
  it('runs the intended comp and every counterfactual matched a real block', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(unitOf(base.res, 'quiry').totalDamage).toBeGreaterThan(0);
    expect(dmg(base.tot, DEFENDER)).toBeGreaterThan(0);
    // if any of these is 0 the corresponding patch is a no-op and its test would be vacuous
    expect(s1EmptyPatch.hits).toBeGreaterThan(0);
    expect(s1AlliesPatch.hits).toBeGreaterThan(0);
    expect(s1Dur10Patch.hits).toBeGreaterThan(0);
    expect(s2EmptyPatch.hits).toBeGreaterThan(0);
    expect(s2CasterPatch.hits).toBeGreaterThan(0);
    expect(healTick1Patch.hits).toBeGreaterThan(0);
    expect(healSelfPatch.hits).toBeGreaterThan(0);
    expect(critAlliesPatch.hits).toBeGreaterThan(0);
    expect(crit5sPatch.hits).toBeGreaterThan(0);
  });
});

describe('quiry skill1 — ATK up 5.81% of the skill user ATK to Defender allies for 3 sec, per Full Charge', () => {
  it('is caster-scaled (flat ATK), not a target-own-ATK percentage', () => {
    // casterAtkPct re-emits as a FLAT ATK number; an atkPct model would emit the raw 5.81 instead
    expect(s1GrantEv?.stat).toBe('casterAtkPct');
    expect(s1GrantEv?.value ?? 0).toBeGreaterThan(100);
  });

  it('fires once per full-charge shot, not once per burst / full burst / battle', () => {
    // quiry cycles 6 charge shots (60f charge + release latency) then a 141f reload -> ~100 shots/180 s.
    // passive => 1 application; burstCast => ~3; fullBurstEnter => ~12. Only a per-shot trigger clears 50.
    expect(s1GrantHit?.n ?? 0).toBeGreaterThanOrEqual(50);
  });

  it('reaches the Defender ally only — no non-Defender receives it (nearest-wrong: target allies)', () => {
    const touchedBase = new Set(
      [...s1QuiryOnly.values()]
        .filter((v) => v.ev.stat === 'casterAtkPct')
        .map((v) => v.ev.targetSlug),
    );
    expect([...touchedBase]).toEqual([DEFENDER]);

    const alliesOnly = onlyIn(tally(allyBuffs(s1Allies.events)), tally(allyBuffs(s1Empty.events)));
    const touchedWrong = new Set(
      [...alliesOnly.values()]
        .filter((v) => v.ev.stat === 'casterAtkPct')
        .map((v) => v.ev.targetSlug),
    );
    // the nearest-wrong model sprays the same grant across the whole team
    expect(touchedWrong.size).toBeGreaterThan(1);
    expect(dmg(s1Allies.tot, 'helm')).toBeGreaterThan(dmg(base.tot, 'helm'));
  });

  it('lasts 3 wall-clock seconds — not N rounds, not the 10 s burst window', () => {
    const stat = s1GrantEv?.stat ?? '';
    const value = s1GrantEv?.value ?? -1;
    const pick = (evs: SimEvent[]): BuffEv[] =>
      allyBuffs(evs).filter((b) => b.stat === stat && b.value === value);

    expect(pick(base.events).every((b) => b.durationShots === undefined)).toBe(true);
    // first full charge lands ~f82 (60f charge + 22f release latency) -> 3 s expires ~f262;
    // a 5 s model expires >= f382, a 10 s model ~f682.
    const first = minExpiry(pick(base.events));
    expect(first).toBeGreaterThan(100);
    expect(first).toBeLessThan(340);
    // sensitivity: the same reading moves by exactly the duration delta under the wrong model
    expect(minExpiry(pick(s1Dur10.events))).toBeGreaterThan(first + 350);
  });

  it('actually moves the Defender ally damage (non-vacuity for the whole slot)', () => {
    expect(dmg(base.tot, DEFENDER)).toBeGreaterThan(dmg(s1Empty.tot, DEFENDER));
  });
});

describe('quiry skill1 — ATK down 8.94% on the target (defensive; inert at scope lock)', () => {
  it('never leaks onto an ally — no quiry-sourced negative buff exists', () => {
    expect([...s1QuiryOnly.values()].every((v) => v.ev.value > 0)).toBe(true);

    // the debuff magnitude shares the caster-ATK basis with the 5.81% grant, so it is computable
    const atkFlat = s1GrantEv?.value ?? 0;
    expect(atkFlat).toBeGreaterThan(0);
    const debuffFlat = (atkFlat / 5.81) * 8.94;
    const leaked = allyBuffs(base.events).some(
      (b) => Math.abs(Math.abs(b.value) - debuffFlat) < 1,
    );
    expect(leaked).toBe(false);
  });

  it('is not smuggled in as a boss-held Damage Taken debuff', () => {
    // an enemy ATK down is defensive; re-encoding it as damageTakenPct would credit the whole team
    const withS1 = [...tally(bossDebuffs(base.events)).entries()].map(([k, v]) => `${k}x${v.n}`).sort();
    const withoutS1 = [...tally(bossDebuffs(s1Empty.events)).entries()].map(([k, v]) => `${k}x${v.n}`).sort();
    expect(withS1).toEqual(withoutS1);
  });
});

describe('quiry skill2 — Max HP up 11.63% to Defender allies, continuously from battle start', () => {
  it('applies once at battle start (passive), to the Defender ally only', () => {
    expect(s2GrantHit).toBeDefined();
    expect(s2GrantHit?.ev.targetSlug).toBe(DEFENDER);
    // a per-shot / per-burst trigger identity would re-apply dozens of times
    expect(s2GrantHit?.n ?? 0).toBeLessThanOrEqual(5);
    expect(s2GrantHit?.n ?? 0).toBeGreaterThanOrEqual(1);
    const targets = new Set([...s2QuiryOnly.values()].map((v) => v.ev.targetSlug));
    for (const slug of NON_DEFENDERS) expect(targets.has(slug)).toBe(false);
  });

  it('is continuous — no time expiry and no round count', () => {
    expect(s2GrantHit?.ev.durationShots).toBeUndefined();
    const exp = s2GrantHit?.ev.expiresFrame;
    expect(exp === undefined || exp > 10_000).toBe(true);
  });

  it('scales off the TARGET own Max HP, not the skill user Max HP', () => {
    // kit says a bare 'Max HP up 11.63%' (targetMaxHpPct); the nearest-wrong reads it as
    // 'x% of the skill user Max HP' (casterMaxHpPct). crown (Defender) and quiry (Supporter) have
    // different Max HP, so the emitted flat maxHpFlat differs between the two bases.
    const patchedHit = [...onlyIn(tally(allyBuffs(s2Caster.events)), tally(allyBuffs(s2Empty.events))).values()].find(
      (v) => v.ev.stat === 'maxHpFlat',
    );
    expect(s2GrantHit?.ev.value ?? 0).toBeGreaterThan(0);
    expect(patchedHit?.ev.value ?? 0).toBeGreaterThan(0);
    expect(s2GrantHit?.ev.value).not.toBe(patchedHit?.ev.value);
  });

  it('moves no damage — ally-granted Max HP feeds no ATK conversion in this comp', () => {
    expect(s2Empty.tot).toEqual(base.tot);
  });
});

describe('quiry burst — recovers 6.96% of final Max HP every 1 sec for 10 sec, all allies', () => {
  it('is a ten-tick heal-over-time, not one instant heal', () => {
    // no heal/recovery event kind exists; the HoT is read through crown, the fixture on-recovery
    // consumer. ticks:10 refreshes her recovery-triggered buff ~10x per cast, ticks:1 exactly once.
    expect(base.events.length).toBeGreaterThan(healTick1.events.length);
    expect(buffsOf(base.events).length).toBeGreaterThan(buffsOf(healTick1.events).length);
  });

  it('targets allies, not just the skill user', () => {
    expect(buffsOf(base.events).length).toBeGreaterThan(buffsOf(healSelf.events).length);
  });

  it.skip('all-allies scope INCLUDING self is unobservable: the event log has no heal/recovery kind, and only crown carries an on-recovery trigger in this fixture — liter / helm / quiry receipt cannot be discriminated', () => {
    expect(true).toBe(true);
  });
});

describe('quiry burst — Critical Rate up 19.9% to all Defender allies for 10 sec', () => {
  it('casts at all in this fixture (non-vacuity: quiry is a Burst II competing with crown)', () => {
    // 60 s cooldown over a 180 s fight bounds her casts at 3; allow slack for chain timing
    expect(critEvents.length).toBeGreaterThanOrEqual(1);
    expect(critEvents.length).toBeLessThanOrEqual(5);
  });

  it('is UNSCOPED Critical Rate at the kit magnitude, not the normal-attack-scoped stat', () => {
    // the kit line says plain Critical Rate; critRateNormalPct would under-credit skill/burst crit
    expect(critEvents.every((b) => b.stat === 'critRatePct')).toBe(true);
    expect(critEvents.every((b) => b.value === CRIT_VALUE)).toBe(true);
    const normalScoped = allyBuffs(base.events).filter(
      (b) => b.stat === 'critRateNormalPct' && b.value === CRIT_VALUE,
    );
    expect(normalScoped).toHaveLength(0);
  });

  it('lands on Defender allies only (nearest-wrong: all allies)', () => {
    expect([...new Set(critEvents.map((b) => b.targetSlug))]).toEqual([DEFENDER]);
    // the wrong target set hands the same crit to the fixture attackers
    expect(dmg(critAllies.tot, 'helm')).toBeGreaterThan(dmg(base.tot, 'helm'));
    expect(dmg(critAllies.tot, 'liter')).toBeGreaterThan(dmg(base.tot, 'liter'));
  });

  it('runs the full 10 sec window (nearest-wrong: 5 sec)', () => {
    // the cast lands just before Full Burst, so a 10 s window covers the whole FB and a 5 s one
    // covers half of it — crown loses crit uptime under the short model
    expect(dmg(base.tot, DEFENDER)).toBeGreaterThan(dmg(crit5s.tot, DEFENDER));
  });
});

describe('quiry — schema gaps', () => {
  it.skip('the kit caps skill1 and skill2 at 2 Defender ally unit(s), but the TargetDef alliesOfClass carries no count field — the cap is inexpressible, and this fixture holds a single Defender (crown) so it is also unexercised. With 3+ Defenders the model would over-apply both lines', () => {
    expect(true).toBe(true);
  });

  it.skip('the skill1 ATK down on the target is unobservable in v1: resolveTargets({kind:enemy}) returns no entity and the boss deals no damage, so only its INERTNESS (asserted above) is testable, never its magnitude or its 3 sec window', () => {
    expect(true).toBe(true);
  });
});
