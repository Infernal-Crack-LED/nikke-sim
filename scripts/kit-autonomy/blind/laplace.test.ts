import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * laplace - Laplace (Treasure) - RL / Iron / Attacker / Burst III (cd 40s, ammo 6, charge 60f)
 *
 * BLIND kit-spec test: written from the kit prose alone, with no sight of the shipped override's
 * intent, note prose or reasoning. One assertion group per kit line.
 *
 * KIT LINES UNDER TEST
 *  s1  on a full-charge attack, self: Hero Vision - Explosion Radius up 3.57%, 5 stacks, 15 sec.
 *  s2a on a full-charge HIT: 132.45% of final ATK as additional damage (per hit).
 *  s2b on a PARTS hit: 14.78% of final ATK (the scope-lock boss is partless -> must be inert).
 *  b1  self weapon swap, 10 sec: First 1455.72%, Normal 22.2%; gains Pierce; normals become true
 *      damage while Hero Vision is at max stacks; cannot take cover.
 *  b2  same enemy, while Hero Vision is at max stacks: 11.9% of final ATK as true damage.
 *
 * FIXTURE: controlComp('laplace', false) - liter (B1) + crown (B2) + laplace (B3).
 *   The fixed second B3 is dropped deliberately: (a) laplace is herself a Burst III, so a second
 *   B3 contests the B3 slot and makes the burst-window assertions depend on selection order rather
 *   than on laplace's kit, and (b) the fixed B3 carries charge-damage buffs sitting on exactly the
 *   bucket a charge RL reads, confounding every magnitude delta below. liter+crown still chain, so
 *   laplace casts and Full Bursts occur (a lone B3 would make ZERO full bursts).
 *
 * METHOD NOTE. Damage-event field names beyond `kind` are not pinned by the harness contract
 * available to this test, so: STRUCTURAL claims are asserted against the committed override read
 * back through withPatchedOverride(slug, noop) - an in-memory clone, the JSON on disk is never
 * touched - and BEHAVIOURAL claims are asserted as counterfactual deltas on totals(res).laplace.
 * Event reads are confined to buffApply / fullBurstStart / burstCast, whose shapes ARE pinned.
 * Slot access is tolerant of both documented override shapes (slot -> Block[] and
 * slot -> { blocks: Block[] }) so a shape guess can never masquerade as a kit finding.
 */

const LAPLACE = 'laplace';

// kit magnitudes, read literally off the prose
const HV_PCT = 3.57;
const HV_STACKS = 5;
const HV_SEC = 15;
const CHARGE_RIDER_PCT = 132.45;
const PARTS_RIDER_PCT = 14.78;
const BURST_FIRST_PCT = 1455.72;
const BURST_NORMAL_PCT = 22.2;
const BURST_SEC = 10;
const BURST_TRUE_PCT = 11.9;

type AnyRec = Record<string, any>;

const approx = (a: unknown, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;

const GATE_KEYS = [
  'requiresCore',
  'requiresTargetStatus',
  'requiresShielded',
  'bossElementGate',
  'resourceGate',
  'fbGate',
  'swapGate',
  'ownBurstGate',
  'mode',
  'everyN',
  'teamHas',
  'formation',
];
const isGated = (b: AnyRec) => GATE_KEYS.some((k) => b[k] !== undefined);

function slotBlocks(ov: AnyRec, slot: 'skill1' | 'skill2' | 'burst'): AnyRec[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? (s as AnyRec[]) : ((s.blocks as AnyRec[]) ?? []);
}
function slotEffects(
  ov: AnyRec,
  slot: 'skill1' | 'skill2' | 'burst'
): AnyRec[] {
  return slotBlocks(ov, slot).flatMap((b) => (b.effects as AnyRec[]) ?? []);
}
function unmodeledText(
  ov: AnyRec,
  slot: 'skill1' | 'skill2' | 'burst'
): string {
  const um = ov?.unmodeled?.[slot] ?? [];
  return (Array.isArray(um) ? um.join(' ') : String(um)).toLowerCase();
}

// ---------------------------------------------------------------------------
// committed override, read as an unmutated clone
// ---------------------------------------------------------------------------
const OV = withPatchedOverride(LAPLACE, () => {}) as unknown as AnyRec;

// ---------------------------------------------------------------------------
// counterfactual overrides (nearest-wrong models)
// ---------------------------------------------------------------------------
const ZERO_CHARGE_RIDER = withPatchedOverride(LAPLACE, (ov) => {
  for (const e of slotEffects(ov as unknown as AnyRec, 'skill2')) {
    if (approx(e.atkPct, CHARGE_RIDER_PCT)) {
      e.atkPct = 0;
    }
  }
});

const RIDER_ON_FB_ENTER = withPatchedOverride(LAPLACE, (ov) => {
  for (const b of slotBlocks(ov as unknown as AnyRec, 'skill2')) {
    const carries = ((b.effects as AnyRec[]) ?? []).some((e) =>
      approx(e.atkPct, CHARGE_RIDER_PCT)
    );
    if (carries) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});

const SHORT_SWAP = withPatchedOverride(LAPLACE, (ov) => {
  for (const e of slotEffects(ov as unknown as AnyRec, 'burst')) {
    if (e.kind === 'weaponSwap') {
      e.durationSec = 0.1;
    }
  }
});

const NO_HERO_VISION = withPatchedOverride(LAPLACE, (ov) => {
  for (const e of slotEffects(ov as unknown as AnyRec, 'skill1')) {
    if (e.kind === 'buff') {
      e.value = 0;
    }
  }
});

// ---------------------------------------------------------------------------
// hoisted runs (each is a full 180s sim) - 5 total
// ---------------------------------------------------------------------------
function runWith(patched?: unknown) {
  const opts = controlComp(LAPLACE, false) as unknown as AnyRec;
  const events: SimEvent[] = [];
  const cfg: AnyRec = { ...opts, onEvent: (ev: SimEvent) => events.push(ev) };
  if (patched) {
    cfg.overrides = {
      ...((opts.overrides as AnyRec) ?? {}),
      [LAPLACE]: patched,
    };
  }
  const res = runComp(cfg as Parameters<typeof runComp>[0]);
  const map = totals(res) as Record<string, number>;
  const team = Object.fromEntries(
    Object.entries(map).filter(([k]) => k !== LAPLACE)
  );
  return { res, events, total: map[LAPLACE] ?? 0, team };
}

const BASE = runWith();
const NO_RIDER = runWith(ZERO_CHARGE_RIDER);
const RIDER_FB = runWith(RIDER_ON_FB_ENTER);
const SWAP_CUT = runWith(SHORT_SWAP);
const HV_OFF = runWith(NO_HERO_VISION);

const ev = (kind: string, run = BASE) =>
  run.events.filter((e) => (e as AnyRec).kind === kind) as AnyRec[];

describe('laplace - Laplace (Treasure) - blind kit spec', () => {
  // -------------------------------------------------------------------------
  // fixture non-vacuity
  // -------------------------------------------------------------------------
  it('fixture actually bursts: full bursts occur and laplace deals damage', () => {
    // Without this, every burst-slot assertion below would be vacuously green.
    expect(BASE.total).toBeGreaterThan(0);
    expect(ev('fullBurstStart').length).toBeGreaterThanOrEqual(2);
    expect(ev('burstCast').length).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // skill1 - Hero Vision
  // -------------------------------------------------------------------------
  it('s1: Hero Vision is encoded as a 5-cap stack channel (buff maxStacks 5 or a 0..5 resource)', () => {
    // The burst gates on max stacks, so the stack COUNTER is load-bearing whatever the radius
    // proxy is. Nearest-wrong: a single unstacked buff authored at the capped magnitude, which
    // has no notion of a max-stack state for the burst to read.
    const hvBuffs = slotEffects(OV, 'skill1').filter(
      (e) => e.kind === 'buff' && e.maxStacks === HV_STACKS
    );
    const hvRes = ((OV.resources as AnyRec[]) ?? []).filter(
      (r) => r.max === HV_STACKS
    );
    expect(hvBuffs.length + hvRes.length).toBeGreaterThan(0);
  });

  it('s1: the buff magnitude is PER STACK (3.57), not the pre-multiplied 5-stack total', () => {
    const hvBuffs = slotEffects(OV, 'skill1').filter(
      (e) => e.kind === 'buff' && e.maxStacks === HV_STACKS
    );
    if (hvBuffs.length === 0) {
      // resource-encoded: the per-stack magnitude must live on a perResource mult instead
      const perRes = [
        ...slotEffects(OV, 'skill1'),
        ...slotEffects(OV, 'skill2'),
        ...slotEffects(OV, 'burst'),
      ].filter((e) => e.perResource);
      expect(perRes.some((e) => approx(e.perResource.mult, HV_PCT))).toBe(true);
      return;
    }
    for (const b of hvBuffs) {
      expect(approx(b.value, HV_PCT)).toBe(true); // RED under value 17.85 (3.57 x 5 folded in)
      expect(b.durationSec).toBe(HV_SEC); // RED under a permanent / no-duration stack
    }
  });

  it('s1: Hero Vision is self-scoped and accrues per full charge, not on burst/FB entry', () => {
    const perShot = ['shotFired', 'hitCount', 'chargeCounter'];
    const hvBlocks = slotBlocks(OV, 'skill1').filter((b) =>
      ((b.effects as AnyRec[]) ?? []).some(
        (e) => e.kind === 'buff' && e.maxStacks === HV_STACKS
      )
    );
    const stackBlocks = hvBlocks.length
      ? hvBlocks
      : slotBlocks(OV, 'skill1').filter((b) =>
          ((b.effects as AnyRec[]) ?? []).some((e) => e.kind === 'resource')
        );
    expect(stackBlocks.length).toBeGreaterThan(0);
    for (const b of stackBlocks) {
      expect(b.target?.kind).toBe('self'); // RED under an allies-scoped grant
      expect(perShot).toContain(b.trigger?.kind); // RED under passive / burstCast / fullBurstEnter
    }
  });

  it('s1: the radius proxy is not a generic damage stat', () => {
    // Explosion Radius is a projectile-geometry line. Proxying it onto a generic damage stat
    // over-credits every bucket (skills, burst, riders) - the SCOPE failure mode.
    const banned = [
      'atkPct',
      'attackDamagePct',
      'critRatePct',
      'critDamagePct',
      'elementDamagePct',
    ];
    const hvBuffs = slotEffects(OV, 'skill1').filter(
      (e) => e.kind === 'buff' && e.maxStacks === HV_STACKS
    );
    for (const b of hvBuffs) {
      expect(banned).not.toContain(b.stat);
    }
  });

  it('s1: Hero Vision moves NO teammate damage (inertness)', () => {
    // Zeroing a self-scoped buff cannot touch liter/crown. RED if the buff were mis-targeted at
    // allies, or if it were wired to a shared/boss-held channel.
    expect(HV_OFF.team).toEqual(BASE.team);
  });

  it('s1: the Hero Vision channel is actually exercised in the fixture (non-vacuity)', () => {
    const hvBuffs = slotEffects(OV, 'skill1').filter(
      (e) => e.kind === 'buff' && e.maxStacks === HV_STACKS
    );
    if (hvBuffs.length > 0) {
      const applies = ev('buffApply').filter(
        (e) => e.targetSlug === LAPLACE && e.maxStacks === HV_STACKS
      );
      expect(applies.length).toBeGreaterThanOrEqual(HV_STACKS); // ramps to cap at least once
      // never granted to anyone else
      expect(
        ev('buffApply').filter(
          (e) => e.maxStacks === HV_STACKS && e.targetSlug !== LAPLACE
        ).length
      ).toBe(0);
    } else {
      expect(
        ((OV.resources as AnyRec[]) ?? []).some((r) => r.max === HV_STACKS)
      ).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // skill2a - 132.45% full-charge rider
  // -------------------------------------------------------------------------
  it('s2a: the 132.45% rider exists as instant damage, not a stat buff', () => {
    const riders = slotEffects(OV, 'skill2').filter((e) =>
      approx(e.atkPct, CHARGE_RIDER_PCT)
    );
    expect(riders.length).toBe(1);
    expect(riders[0].kind).toBe('flatDamage');
    expect(riders[0].core).not.toBe(true); // the text says additional damage, not a core strike
    expect(riders[0].kind).not.toBe('dot'); // no duration in the text -> a DoT would multiply
  });

  it('s2a: the rider is live and carries material damage', () => {
    expect(NO_RIDER.total).toBeLessThan(BASE.total);
    const drop = (BASE.total - NO_RIDER.total) / BASE.total;
    expect(drop).toBeGreaterThan(0.01); // RED if the block exists but never fires
  });

  it('s2a: the rider fires per full charge, NOT once per Full Burst (trigger identity)', () => {
    // Nearest-wrong model: keyed to fullBurstEnter. That fires a handful of times over 180s
    // instead of once per charge shot, so it must land strictly between zeroed and faithful.
    expect(NO_RIDER.total).toBeLessThan(RIDER_FB.total);
    expect(RIDER_FB.total).toBeLessThan(BASE.total);
  });

  // -------------------------------------------------------------------------
  // skill2b - 14.78% parts rider (partless scope-lock boss)
  // -------------------------------------------------------------------------
  it('s2b: the parts-hit 14.78% line never fires ungated on a partless boss', () => {
    const partsBlocks = slotBlocks(OV, 'skill2').filter((b) =>
      ((b.effects as AnyRec[]) ?? []).some((e) =>
        approx(e.atkPct, PARTS_RIDER_PCT)
      )
    );
    if (partsBlocks.length === 0) {
      // absent is correct - but it must be recorded, no silent drops
      const um = unmodeledText(OV, 'skill2');
      expect(um.includes('part') || um.includes('14.78')).toBe(true);
      return;
    }
    // present is only acceptable behind a gate that cannot open on this boss
    for (const b of partsBlocks) {
      expect(isGated(b)).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // burst - weapon swap
  // -------------------------------------------------------------------------
  it('b1: the burst is a 10s weapon swap at 22.2% per shot', () => {
    const swaps = slotEffects(OV, 'burst').filter(
      (e) => e.kind === 'weaponSwap'
    );
    expect(swaps.length).toBe(1);
    expect(swaps[0].durationSec).toBe(BURST_SEC);
    expect(approx(swaps[0].damagePct, BURST_NORMAL_PCT)).toBe(true);
  });

  it('b1: the swap window is load-bearing (shortening it costs damage)', () => {
    // Non-vacuity for every swap-scoped claim: if the swap never went live, this delta is zero.
    expect(SWAP_CUT.total).toBeLessThan(BASE.total);
    expect((BASE.total - SWAP_CUT.total) / BASE.total).toBeGreaterThan(0.01);
  });

  it('b1: First Damage 1455.72% is modeled exactly once', () => {
    const first = slotEffects(OV, 'burst').filter((e) =>
      approx(e.atkPct, BURST_FIRST_PCT)
    );
    expect(first.length).toBe(1); // RED if missing, and RED if double-counted per swap shot
  });

  it('b1: Pierce is scoped to the burst, not tagged for the whole fight', () => {
    // Nearest-wrong: the static hasPierce flag, which pierces from t=0 for all 180s and
    // over-credits every Pierce Damage consumer outside the 10s window.
    expect(OV.hasPierce).not.toBe(true);
    const burstEffects = slotEffects(OV, 'burst');
    const gp = burstEffects.filter((e) => e.kind === 'gainPierce');
    const swapPierce = burstEffects.some(
      (e) => e.kind === 'weaponSwap' && e.hasPierce === true
    );
    expect(gp.length > 0 || swapPierce).toBe(true);
    for (const g of gp) {
      expect(g.durationSec).toBe(BURST_SEC);
    } // absent durationSec = permanent
  });

  it('b1: the true-damage conversion of swap normals is represented (no silent drop)', () => {
    const sw = slotEffects(OV, 'burst').find((e) => e.kind === 'weaponSwap');
    const recorded = unmodeledText(OV, 'burst').includes('true damage');
    expect(sw?.trueNormals === true || recorded).toBe(true);
  });

  // -------------------------------------------------------------------------
  // burst block 2 - 11.9% true damage at max stacks
  // -------------------------------------------------------------------------
  it('b2: the 11.9% true-damage rider is modeled or explicitly recorded', () => {
    const riders = slotEffects(OV, 'burst').filter((e) =>
      approx(e.atkPct, BURST_TRUE_PCT)
    );
    if (riders.length === 0) {
      const um = unmodeledText(OV, 'burst');
      expect(um.includes('11.9')).toBe(true);
      return;
    }
    expect(riders.length).toBe(1);
    expect(riders[0].flavor).toBe('true'); // RED if the true flavor is dropped to a plain rider
  });

  // -------------------------------------------------------------------------
  // GAPS - lines with no discriminating assertion available blind
  // -------------------------------------------------------------------------
  it.skip('b1/b2: max-Hero-Vision-stacks gate - no stack-threshold gate primitive exists for a buff', () => {
    // A block gate can read a resource pool (resourceGate) but not a buff stack count. Unless the
    // stacks are resource-encoded, the max-stacks condition on the true-damage conversion and on
    // the 11.9% rider cannot be expressed, and modeling them ungated over-credits every rotation
    // where laplace bursts below 5 stacks (i.e. any burst inside 15s of a reload-idle stretch).
  });

  it.skip('b1: First Damage FB eligibility - swap first shot vs burst-cast instant (measurement-gated)', () => {
    // A burst-cast instant lands pre-Full-Burst (no +50%); the FIRST SHOT of a swapped weapon
    // fires inside the window and takes it. Which of the two 1455.72% is depends on footage.
  });

  it.skip('s1: Explosion Radius has no engine primitive - the damage proxy is a flagged estimate', () => {
    // Radius changes splash geometry, not a damage multiplier. Any stat chosen for it is a proxy;
    // its magnitude is outside the input domain and must stay flagged until popup-measured.
  });

  it.skip('b1: cannot take cover - no cover/incoming-damage model in v1', () => {});
});
