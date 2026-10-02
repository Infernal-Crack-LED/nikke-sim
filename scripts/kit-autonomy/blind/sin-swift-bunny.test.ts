/**
 * sin-swift-bunny -- SR / Water / Attacker / Burst III
 * base: cd 40s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 69.04, coreAttackMultiplier 200
 *
 * BLIND kit-spec test: written from the kit prose alone. The author did not see the driver
 * override, the driver tests, or any truth file.
 *
 * KIT LINES PINNED HERE
 *  S1-a  battle start, self: ATK +15.35%, continuous.
 *  S1-b  during Full Charge while NOT in the Swift Piercing state, self:
 *          Normal Attack Damage Multiplier +100% for 1 ROUND
 *          Charge Damage +52.12% for 1 ROUND
 *  S1-c  battle start AND Full Charge maintained for 1+ sec: TOGGLE Bunny Mode Stance <-> Engage.
 *  S1-d  on entering Engage: pull every ally in Stance into Engage (S1-e is the mirror).
 *  S2-a  Engage only: normal attacks AND Swift Piercing deal true damage, continuous.
 *  S2-b  Stance only: Critical Rate +35.14%, Critical Damage +75.12%, continuous.
 *  S2-c  when using Burst Skill, self: Swift Piercing weapon change -- charge time fixed at
 *          0.5 sec, 73.22% of final ATK, full charge 300%, duration 5 sec.
 *  B-a   self ATK +110% for 5 sec.
 *  B-b   all enemies: 516.6% of final ATK as Burst Skill damage.
 *  B-c   if Stance: +958.9% additional damage, same targets.
 *  B-d   if Engage: +854.6% as TRUE damage, same targets.
 *
 * FIXTURE  controlComp(SLUG, true) -- liter B1 / crown B2 / sin-swift-bunny B3 / helm B3 vs the
 * Fire boss. A lone Burst III makes ZERO Full Bursts, so B1+B2 are mandatory: without them she
 * never bursts and the entire Swift Piercing / burst-rider half of the kit goes untested.
 * Deterministic, no seed. 10 hoisted runs.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *  - The two burst riders land on the SAME cast frame as the 516.6% base, so crit expectation,
 *    element, Damage Up, range and the Full-Burst exemption are all shared and the WITHIN-cast
 *    damage ratio is exact: 958.9/516.6 = 1.8562 (Stance) or 854.6/516.6 = 1.6543 (Engage).
 *    Exactly ONE rider may fire per cast. Nearest-wrong models: both riders fire (instances per
 *    cast 2 -> 3, and the triple then carries BOTH ratios), or a rider is mis-magnituded /
 *    mis-bucketed (the ratio then matches neither constant).
 *  - for 1 round(s) is pinned on the emitted buffApply.durationShots, NOT on a seconds window;
 *    widening the window to 10 rounds must RAISE damage, which proves it is load-bearing.
 *  - The S1-b not-in-Swift-Piercing gate is proven by COUNT: the swap charges in 0.5s against the
 *    base 1.0s (chargeFrames 60), so an ungated block applies the round buffs strictly more often.
 *  - Swap parameters are pinned monotonically (2x damagePct -> more damage, 0.5s -> 2.0s charge ->
 *    less damage, 300% -> 600% full charge -> more damage). Those also prove the fixture really
 *    enters the swap, so none of the swap assertions are vacuous.
 *
 * SHAPE DEFENSIVENESS: the packet describes the override FILE two ways (slot -> Block[] versus
 * slot -> CharacterSkills carrying its own blocks[]). slotBlocks() accepts both, flags are looked
 * up at file level and at slot level, and every extraction carries a non-vacuity guard so a wrong
 * field guess fails loudly instead of silently passing on an empty list.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'sin-swift-bunny';

// within-cast damage ratio of each mode rider against the 516.6% base
const R_STANCE = 958.9 / 516.6; // 1.85618
const R_ENGAGE = 854.6 / 516.6; // 1.65428

type Ev = SimEvent & Record<string, any>;

/* ---- override-shape helpers: accept slot -> Block[] AND slot -> CharacterSkills ---- */
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}

function allEffects(ov: any): { slot: string; block: any; eff: any }[] {
  const out: { slot: string; block: any; eff: any }[] = [];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const block of slotBlocks(ov, slot)) {
      for (const eff of block?.effects ?? []) out.push({ slot, block, eff });
    }
  }
  return out;
}

function fileFlag(ov: any, name: string): any {
  if (ov?.[name] !== undefined) return ov[name];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const s = ov?.[slot];
    if (s && !Array.isArray(s) && s[name] !== undefined) return s[name];
  }
  return undefined;
}

function modeNames(ov: any): string[] {
  const declared = Array.isArray(ov?.modes)
    ? ov.modes.filter((m: any) => typeof m === 'string')
    : [];
  if (declared.length) return [...declared];
  const used = new Set<string>();
  for (const b of allBlocks(ov)) if (typeof b?.mode === 'string') used.add(b.mode);
  return [...used].sort();
}

// modes[0] is the default; rotate it without needing to know the mode strings themselves
function setDefaultMode(ov: any, mode: string): void {
  const ordered = [mode, ...modeNames(ov).filter((m) => m !== mode)];
  ov.modes = ordered;
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const s = ov?.[slot];
    if (s && !Array.isArray(s)) s.modes = ordered;
  }
}

/* ---- run + event helpers ---- */
interface RunOut {
  res: any;
  evs: Ev[];
  total: number;
  row: any;
}

function runWith(patch?: (ov: any) => void): RunOut {
  const evs: Ev[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.onEvent = (ev: SimEvent) => evs.push(ev as Ev);
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch),
    };
  }
  const res = runComp(opts);
  return { res, evs, total: totals(res)[SLUG], row: unitOf(res, SLUG) };
}

function amountOf(e: any): number {
  for (const k of ['amount', 'damage', 'dmg', 'value', 'total']) {
    const v = e?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return NaN;
}

function buffApplies(evs: Ev[], stat: string, value?: number): Ev[] {
  return evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) <= 0.01),
  );
}

function damageEvents(r: RunOut): Ev[] {
  const own = Array.isArray(r.row?.events)
    ? (r.row.events as Ev[]).filter((e) => e.kind === 'damage')
    : [];
  if (own.length) return own;
  return r.evs.filter(
    (e) =>
      e.kind === 'damage' &&
      [e.slug, e.unit, e.srcSlug, e.ownerSlug, e.casterSlug].includes(SLUG),
  );
}

function burstSlotAmounts(r: RunOut): number[] {
  const out = damageEvents(r)
    .filter((e) => e.srcSlot === 'burst' || e.bucket === 'burst')
    .map(amountOf);
  expect(
    out.length,
    'no burst-slot damage instances extracted -- event shape or fixture is wrong',
  ).toBeGreaterThan(0);
  for (const v of out) expect(Number.isFinite(v) && v > 0).toBe(true);
  return out;
}

// split the chronological burst-slot instances into per-cast groups of `per`, and return each
// group ratio against its smallest member (the 516.6% base)
function perCastRatios(amounts: number[], per: number): number[][] {
  expect(
    amounts.length % per,
    'expected ' + per + ' burst-slot instances per cast, got ' + amounts.length,
  ).toBe(0);
  const out: number[][] = [];
  for (let i = 0; i < amounts.length; i += per) {
    const g = amounts.slice(i, i + per).sort((a, b) => a - b);
    out.push(g.slice(1).map((v) => v / g[0]));
  }
  return out;
}

function commonRiderRatio(r: RunOut): number {
  const rs = perCastRatios(burstSlotAmounts(r), 2).map((g) => g[0]);
  for (const v of rs) expect(v).toBeCloseTo(rs[0], 3);
  return rs[0];
}

function teammateTotals(r: RunOut): Record<string, number> {
  const t: any = totals(r.res);
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) if (k !== SLUG) out[k] = t[k];
  return out;
}

/* ---- hoisted runs (each is a full 180s sim) ---- */
const committed: any = withPatchedOverride(SLUG, () => {});
const MODES = modeNames(committed);
const HAS_MODES = MODES.length >= 2;

const control = runWith();

const runA = HAS_MODES ? runWith((ov) => setDefaultMode(ov, MODES[0])) : control;
const runB = HAS_MODES ? runWith((ov) => setDefaultMode(ov, MODES[1])) : control;

const noModeGate = runWith((ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    delete b.mode;
    delete b.requiresSelfStatus;
    delete b.resourceGate;
  }
});

const zeroS1Atk = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (
      eff.kind === 'buff' &&
      eff.stat === 'atkPct' &&
      Math.abs(Number(eff.value) - 15.35) <= 0.01
    ) {
      eff.value = 0;
    }
  }
});

const wideRoundWindow = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (
      eff.kind === 'buff' &&
      (eff.stat === 'normalAttackPct' || eff.stat === 'chargeDamagePct')
    ) {
      eff.durationShots = 10;
      delete eff.durationSec;
    }
  }
});

const ungatedRoundBuffs = runWith((ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    const carries = (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        (e.stat === 'normalAttackPct' || e.stat === 'chargeDamagePct'),
    );
    if (carries) {
      delete b.swapGate;
      delete b.requiresSelfStatus;
    }
  }
});

const swapDoubleDamage = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (eff.kind === 'weaponSwap') eff.damagePct = Number(eff.damagePct) * 2;
  }
});

const swapSlowCharge = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (eff.kind !== 'weaponSwap') continue;
    if (eff.chargeTimeClamp !== undefined) eff.chargeTimeClamp = 2;
    if (eff.chargeTimeSec !== undefined) eff.chargeTimeSec = 2;
    if (eff.chargeTimeClamp === undefined && eff.chargeTimeSec === undefined) {
      eff.chargeTimeSec = 2;
    }
  }
});

const swapBigFullCharge = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (eff.kind === 'weaponSwap') eff.chargeMultPct = 600;
  }
});

describe('sin-swift-bunny S1-a -- battle-start ATK 15.35% (self, continuous)', () => {
  it('applies atkPct 15.35 to herself and to nobody else', () => {
    const hits = buffApplies(control.evs, 'atkPct', 15.35);
    expect(hits.length).toBeGreaterThan(0);
    for (const e of hits) expect(e.targetSlug).toBe(SLUG);
    // nearest-wrong: casterAtkPct (re-emits as a FLAT ATK number, never 15.35) or an allies target
  });

  it('is load-bearing, and zeroing it leaves every teammate byte-identical (self scope)', () => {
    expect(zeroS1Atk.total).toBeLessThan(control.total);
    expect(teammateTotals(zeroS1Atk)).toEqual(teammateTotals(control));
  });
});

describe('sin-swift-bunny S1-b -- full-charge round buffs, blocked during Swift Piercing', () => {
  it('emits normalAttackPct 100 and chargeDamagePct 52.12, each for exactly 1 ROUND, to self', () => {
    const nam = buffApplies(control.evs, 'normalAttackPct', 100);
    const cdp = buffApplies(control.evs, 'chargeDamagePct', 52.12);
    expect(nam.length).toBeGreaterThan(0);
    expect(cdp.length).toBeGreaterThan(0);
    for (const e of [...nam, ...cdp]) {
      expect(e.targetSlug).toBe(SLUG);
      expect(e.durationShots).toBe(1);
    }
    // nearest-wrong: attackDamagePct / chargeDamageMultPct (wrong buckets), or a durationSec of 1
    // second instead of a one-ROUND window
  });

  it('the 1-round window is load-bearing (10 rounds raises damage)', () => {
    expect(wideRoundWindow.total).toBeGreaterThan(control.total);
  });

  it('is authored on her own full-charge pull, targeting self', () => {
    const blocks = slotBlocks(committed, 'skill1').filter((b) =>
      (b.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' &&
          (e.stat === 'normalAttackPct' || e.stat === 'chargeDamagePct'),
      ),
    );
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      // fullCharge is the kit-shaped primitive; shotFired is byte-identical for an unswapped SR
      expect(['fullCharge', 'shotFired']).toContain(b.trigger?.kind);
      expect(b.target?.kind).toBe('self');
    }
  });

  it('does NOT fire while Swift Piercing is live (removing the gate applies it strictly more often)', () => {
    const before = buffApplies(control.evs, 'normalAttackPct', 100).length;
    const after = buffApplies(ungatedRoundBuffs.evs, 'normalAttackPct', 100).length;
    expect(before).toBeGreaterThan(0);
    // the swap charges in 0.5s vs the base 1.0s, so an ungated block gets strictly more pulls
    expect(after).toBeGreaterThan(before);
  });
});

describe('sin-swift-bunny S2 -- Bunny Mode dichotomy (Enhanced Bullets vs Noise Bullets)', () => {
  it('declares exactly two mutually exclusive Bunny Modes', () => {
    expect(MODES.length).toBe(2);
  });

  it('Enhanced Bullets is mode-gated, never an unconditional passive', () => {
    const cr = allEffects(committed).filter(
      ({ eff }) =>
        eff.kind === 'buff' &&
        eff.stat === 'critRatePct' &&
        Math.abs(Number(eff.value) - 35.14) <= 0.01,
    );
    const cd = allEffects(committed).filter(
      ({ eff }) =>
        eff.kind === 'buff' &&
        eff.stat === 'critDamagePct' &&
        Math.abs(Number(eff.value) - 75.12) <= 0.01,
    );
    expect(cr.length).toBe(1);
    expect(cd.length).toBe(1);
    for (const { block } of [...cr, ...cd]) {
      expect(
        Boolean(block.mode || block.requiresSelfStatus || block.resourceGate),
      ).toBe(true);
      expect(block.target?.kind).toBe('self');
    }
    // nearest-wrong: an ungated passive, live in BOTH modes, which also over-credits the
    // Engage half of the kit where the kit grants no crit at all
  });

  it('exactly one mode run carries the crit buffs, and it is the run whose burst fires the 958.9% Stance rider', () => {
    const aStance = Math.abs(commonRiderRatio(runA) - R_STANCE) <= 0.005;
    const bStance = Math.abs(commonRiderRatio(runB) - R_STANCE) <= 0.005;
    expect(aStance).not.toBe(bStance);
    const stance = aStance ? runA : runB;
    const engage = aStance ? runB : runA;
    expect(commonRiderRatio(engage)).toBeCloseTo(R_ENGAGE, 2);
    for (const stat of ['critRatePct', 'critDamagePct']) {
      const v = stat === 'critRatePct' ? 35.14 : 75.12;
      const on = buffApplies(stance.evs, stat, v);
      expect(on.length).toBeGreaterThan(0);
      for (const e of on) expect(e.targetSlug).toBe(SLUG);
      expect(buffApplies(engage.evs, stat, v).length).toBe(0);
    }
  });

  it('Noise Bullets true-damage flavor is represented, and mode-scoped rather than static', () => {
    const swapTrue = allEffects(committed).some(
      ({ eff }) => eff.kind === 'weaponSwap' && eff.trueNormals === true,
    );
    const modeScoped = (fileFlag(committed, 'trueNormalsModes') ?? []).length > 0;
    const unscoped = fileFlag(committed, 'hasTrueNormals') === true;
    expect(swapTrue || modeScoped || unscoped).toBe(true);
    // trueNormalsModes is the faithful encoding: the flavor is Engage-only, so the static
    // hasTrueNormals flag would also true-flavor the Stance magazine
    expect(unscoped).toBe(false);
  });
});

describe('sin-swift-bunny S2-c -- Swift Piercing weapon change (own burst cast, 5 sec)', () => {
  it('is a REAL weapon change keyed to her OWN burst cast, with the kit numbers', () => {
    const swaps = allEffects(committed).filter(({ eff }) => eff.kind === 'weaponSwap');
    expect(swaps.length).toBe(1);
    const { block, eff } = swaps[0];
    // nearest-wrong: fullBurstEnter, which would fire on ANY team Full Burst (helm is the second
    // B3 in this fixture) and hand her the swap on rotations she did not cast
    expect(block.trigger?.kind).toBe('burstCast');
    expect(block.target?.kind).toBe('self');
    expect(Number(eff.durationSec)).toBe(5);
    expect(Number(eff.damagePct)).toBeCloseTo(73.22, 2);
    expect(Number(eff.chargeMultPct)).toBeCloseTo(300, 2);
    expect(Number(eff.chargeTimeClamp ?? eff.chargeTimeSec)).toBeCloseTo(0.5, 3);
    // Changes the weapon in use = a real swap, and 73.22 != normalAttackMultiplier 69.04, so the
    // same-weapon re-flavor reading (which would also suppress the entry/exit magazine refill)
    // is excluded
    expect(eff.sameWeapon ?? false).toBe(false);
  });

  it('the swap really runs in this fixture and scales with damagePct', () => {
    expect(swapDoubleDamage.total).toBeGreaterThan(control.total);
  });

  it('the 0.5 sec fixed charge time is modeled (slowing it to 2 sec costs damage)', () => {
    expect(swapSlowCharge.total).toBeLessThan(control.total);
  });

  it('the 300% full-charge multiplier is modeled (600% raises damage)', () => {
    expect(swapBigFullCharge.total).toBeGreaterThan(control.total);
  });

  it('grants NO Pierce -- Swift Piercing is a weapon name, not a Pierce line', () => {
    expect(fileFlag(committed, 'hasPierce') ?? false).toBe(false);
    expect(fileFlag(committed, 'pierceModes') ?? []).toEqual([]);
    for (const { eff } of allEffects(committed)) {
      expect(eff.kind).not.toBe('gainPierce');
      if (eff.kind === 'weaponSwap') expect(eff.hasPierce ?? false).toBe(false);
      if (eff.kind === 'flatDamage') expect(eff.pierce ?? false).toBe(false);
    }
  });
});

describe('sin-swift-bunny burst -- ATK 110% / 516.6% base / exactly one mode rider', () => {
  it('applies atkPct 110 to herself once per cast and to nobody else', () => {
    const hits = buffApplies(control.evs, 'atkPct', 110);
    const casts = burstSlotAmounts(control).length / 2;
    expect(casts).toBeGreaterThanOrEqual(1);
    expect(hits.length).toBe(casts);
    for (const e of hits) {
      expect(e.targetSlug).toBe(SLUG);
      expect(Number(e.expiresFrame)).toBeGreaterThan(0);
    }
    // nearest-wrong: casterAtkPct (flat-resolved value, not 110) or an allies target set
  });

  it('authors the three damage lines at kit magnitudes, true flavor only on the Engage branch', () => {
    const fl = slotBlocks(committed, 'burst').flatMap((b) =>
      (b.effects ?? [])
        .filter((e: any) => e.kind === 'flatDamage')
        .map((e: any) => ({ block: b, eff: e })),
    );
    const by = (v: number) =>
      fl.filter(({ eff }) => Math.abs(Number(eff.atkPct) - v) <= 0.01);
    expect(by(516.6).length).toBe(1);
    expect(by(958.9).length).toBe(1);
    expect(by(854.6).length).toBe(1);
    expect(by(854.6)[0].eff.flavor).toBe('true');
    expect(by(958.9)[0].eff.flavor ?? null).toBe(null);
    for (const { eff } of fl) {
      // no core-strike wording anywhere in the burst
      expect(eff.core ?? false).toBe(false);
      if (eff.burstDesc !== undefined) expect(eff.burstDesc).toBe('allEnemies');
    }
    expect(
      Boolean(by(516.6)[0].block.mode || by(516.6)[0].block.requiresSelfStatus),
    ).toBe(false);
    for (const v of [958.9, 854.6]) {
      const b = by(v)[0].block;
      expect(Boolean(b.mode || b.requiresSelfStatus)).toBe(true);
    }
  });

  it('fires exactly TWO burst-slot instances per cast: base plus one rider at the exact kit ratio', () => {
    const groups = perCastRatios(burstSlotAmounts(control), 2);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const [r] of groups) {
      const stance = Math.abs(r - R_STANCE) <= 0.005;
      const engage = Math.abs(r - R_ENGAGE) <= 0.005;
      expect(stance || engage).toBe(true);
    }
  });

  it('the mode gates are non-vacuous: stripping them fires BOTH riders in every cast', () => {
    const groups = perCastRatios(burstSlotAmounts(noModeGate), 3);
    for (const [low, high] of groups) {
      expect(low).toBeCloseTo(R_ENGAGE, 2);
      expect(high).toBeCloseTo(R_STANCE, 2);
    }
    expect(noModeGate.total).toBeGreaterThan(control.total);
  });

  it('burst-cast damage lands in the burst bucket and takes no Full-Burst major', () => {
    const evs = damageEvents(control).filter(
      (e) => e.srcSlot === 'burst' || e.bucket === 'burst',
    );
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.bucket).toBe('burst');
      // a burst cast lands before the FB window opens
      expect(Boolean(e.fbMajorApplied)).toBe(false);
    }
  });
});

describe('sin-swift-bunny -- GAP lines (no engine primitive / unobservable payload)', () => {
  it.skip('S1-c: Bunny Mode TOGGLE at battle start and on a Full Charge held 1+ sec', () => {
    // No primitive. `modes` is a STATIC user selection resolved once at setup, so a mode that
    // flips mid-fight cannot be expressed; and `fullCharge` fires at RELEASE, so a 1-second HOLD
    // past full charge has no trigger at all (the sim releases exactly at full charge).
    // Consequence: a static-mode model locks one half of S2 and one burst rider in for the whole
    // fight and over-credits it. MEASUREMENT-GATED: the real toggle cadence needs footage.
  });

  it.skip('S1-d / S1-e: pulling allies into the mode she just entered', () => {
    // No cross-unit mode primitive (block.mode gates the OWNER only), and no roster ally carries
    // a Bunny Mode, so the line is inert at scope even if it could be authored.
  });

  it.skip('S2-a payload: normal attacks deal true damage while in Engage', () => {
    // The true flavor only moves damage through an ally trueDamagePct buff; the control comp
    // (liter / crown / helm) grants none, so the flag is damage-NEUTRAL here. Asserted
    // structurally instead -- see the Noise Bullets test above.
  });

  it.skip('S2-a second clause: Swift Piercing itself deals true damage while in Engage', () => {
    // Same neutrality, and the flavor additionally has to be mode-scoped ON the swap -- which is
    // unobservable in this fixture in either direction.
  });

  it.skip('S2-c shot economy: magazine size and reload behaviour of the swapped weapon', () => {
    // Kit-silent (no Max Ammunition and no reload line on Swift Piercing). ALWAYS-FLAG field 3:
    // swap shot economy is an estimate, so a count assertion here would pin a guess, not the kit.
  });
});
