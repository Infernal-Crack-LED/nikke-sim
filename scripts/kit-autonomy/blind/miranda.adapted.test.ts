/**
 * ADAPTED-FOR-RUN (driver, S5 convergence): identical to miranda.test.ts verbatim except:
 *   A1 (import): '../lib/harness.js' -> '../../tests/lib/harness.js' (blind/ is two levels deep).
 * No assertion, fixture, magnitude, or counterfactual was changed — this is the blind test as written,
 * run against the committed DRIVER override to check S5 convergence.
 */
/**
 * miranda — SMG / Fire / Supporter / Burst I. BLIND kit-spec pin (written from the kit prose
 * alone; the driver's override, tests and reasoning were NOT consulted).
 *
 * KIT (literal):
 *   S1 — three blocks, each 'Activates after landing 30 normal attack(s)':
 *        a) all allies              Hit Rate     +5.44%  for 5 sec
 *        b) all allies with an SMG  Hit Rate     +3.79%  for 5 sec
 *        c) self                    ATK         +50.06%  for 5 sec
 *   S2 — three blocks, each 'Activates when entering Full Burst':
 *        a) all allies              Crit Damage +32.99%  for 10 sec
 *        b) self                    Crit Rate    +30.1%  for 10 sec
 *                                   Attack Dmg   +23.7%  for 10 sec
 *        c) 1 ally with the highest FINAL ATK, except self:
 *                                   Crit Rate   +85.42%  for 1 ROUND
 *   BURST — no activation clause => own burst cast. 2 allies with the highest FINAL ATK,
 *           except self:            ATK          +40.4%  for 10 sec
 *                                   Crit Damage +56.23%  for 10 sec
 *
 * FIXTURE: controlComp('miranda', true) = liter (B1) / crown (B2) / miranda / helm (B3).
 *   miranda is BURST I, so she contends with liter for stage 1 — whether she ever casts is a
 *   property of the fixture, asserted explicitly (non-vacuity) rather than assumed. Full Bursts
 *   are driven by helm (B3) either way, so every skill2 assertion is exercised regardless.
 *
 * TRAPS THIS FILE PINS:
 *   - TRIGGER IDENTITY: S1 is hitCount(30) — not shotFired, not interval, not lastBullet.
 *   - TRIGGER IDENTITY: S2 is fullBurstEnter (ANY team FB) — not miranda's own burstCast.
 *   - SCOPE: S1b is weapon-scoped (SMG allies only), S1c / S2b are self-only.
 *   - DURATION SEMANTICS: S2c is 'for 1 round(s)' = durationShots 1, NEVER durationSec 1.
 *   - TARGET SET: S2c / burst exclude self and take the top-final-ATK allies.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // A1

const SLUG = 'miranda';

type Ev = SimEvent & Record<string, any>;

function run(opts: any): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev as Ev);
      },
    },
  } as any);
  return { res, events };
}

/** Slot accessor that tolerates both override shapes (Block[] or CharacterSkills.blocks). */
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {return [];}
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

/** Locate a block STRUCTURALLY by the kit magnitude it carries (no index assumptions). */
function blockWithBuff(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  value: number
): any {
  const found = slotBlocks(ov, slot).find((b: any) =>
    (b.effects ?? []).some(
      (e: any) => e.kind === 'buff' && Math.abs((e.value ?? NaN) - value) < 1e-6
    )
  );
  if (!found) {
    throw new Error(
      '[' +
        SLUG +
        '] no ' +
        slot +
        ' block carries buff value ' +
        value +
        ' — the kit prose says it must'
    );
  }
  return found;
}

function buffOf(blk: any, value: number): any {
  return (blk.effects ?? []).find(
    (e: any) => e.kind === 'buff' && Math.abs((e.value ?? NaN) - value) < 1e-6
  );
}

const applies = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs((e.value ?? NaN) - value) < 1e-6
  );

const targetsOf = (evs: Ev[]) =>
  Array.from(new Set(evs.map((e) => e.targetSlug)));
const teamTotal = (res: any) =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Hoisted runs (each runComp is a full 180s sim). 5 runs total.
// ---------------------------------------------------------------------------
const OV = withPatchedOverride(SLUG, () => {}) as any; // committed override, untouched clone

const BASE = run(controlComp(SLUG, true));
const ROSTER = Object.keys(totals(BASE.res));
const FB = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;
const S1_ACTIVATIONS = applies(BASE.events, 'atkPct', 50.06).length;

// Nearest-wrong for the S1 trigger: any other cadence. Doubling the hit threshold must halve
// the activation count; a shotFired/interval keying would not respond at all.
const CF_HITCOUNT_X2 = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of slotBlocks(ov, 'skill1')) {
        if (b.trigger?.kind === 'hitCount')
          {b.trigger.count = (b.trigger.count ?? 30) * 2;}
      }
    }),
  },
});

// Nearest-wrong for S1c: a permanent (untimed) self ATK buff. Collapsing the window to 0.5s must
// cost miranda damage while leaving every teammate byte-identical (self scope).
const CF_S1_ATK_SHORT = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      buffOf(blockWithBuff(ov, 'skill1', 50.06), 50.06).durationSec = 0.5;
    }),
  },
});

// Nearest-wrong for S1a: scoping the team Hit Rate buff to self. Teammates must move.
const CF_S1_HR_SELF = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      blockWithBuff(ov, 'skill1', 5.44).target = { kind: 'self' };
    }),
  },
});

// Nearest-wrong for S2c: reading 'for 1 round(s)' as one wall-clock second.
const CF_ROUNDS_TO_SEC = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      const e = buffOf(blockWithBuff(ov, 'skill2', 85.42), 85.42);
      delete e.durationShots;
      e.durationSec = 1;
    }),
  },
});

// ---------------------------------------------------------------------------

describe('miranda — fixture sanity', () => {
  it('the control comp actually fights and full-bursts', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(ROSTER).toContain(SLUG);
    expect(ROSTER.length).toBe(4);
    // Non-vacuity for every skill2 assertion below.
    expect(FB).toBeGreaterThan(0);
  });
});

describe("miranda S1 — 'Activates after landing 30 normal attack(s)'", () => {
  // Trigger identity, read literally: a hit-count gate on landed normal attacks.
  it('all three skill1 blocks are keyed to hitCount 30', () => {
    const triggers = slotBlocks(OV, 'skill1').map((b: any) => b.trigger);
    expect(triggers.length).toBe(3);
    for (const t of triggers) {
      expect(t.kind).toBe('hitCount');
      expect(t.count).toBe(30);
    }
  });

  // Behavioural half of the same claim: RED under shotFired (thousands of fires over 180s),
  // RED under interval/lastBullet (no response to the threshold), GREEN only for hitCount(30).
  it('doubling the hit threshold halves the activation count', () => {
    const cf = applies(CF_HITCOUNT_X2.events, 'atkPct', 50.06).length;
    expect(S1_ACTIVATIONS).toBeGreaterThan(10);
    expect(S1_ACTIVATIONS).toBeLessThan(400); // a shotFired keying would be in the thousands
    expect(cf).toBeGreaterThan(0);
    expect(cf / S1_ACTIVATIONS).toBeGreaterThan(0.35);
    expect(cf / S1_ACTIVATIONS).toBeLessThan(0.65);
  });

  // Target sets. 5.44 is unscoped (everyone); 3.79 is weapon-scoped (SMG only, self included).
  it('Hit Rate 5.44% reaches every ally, 3.79% only the SMG allies', () => {
    const hrAll = applies(BASE.events, 'hitRatePct', 5.44);
    const hrSmg = applies(BASE.events, 'hitRatePct', 3.79);

    expect(targetsOf(hrAll).sort()).toEqual([...ROSTER].sort());
    expect(hrAll.length).toBe(S1_ACTIVATIONS * ROSTER.length);

    const smg = targetsOf(hrSmg);
    expect(smg).toContain(SLUG); // miranda is an SMG unit, so self is inside the scope
    expect(smg).not.toContain('helm'); // helm is SR — RED if the block is modelled as plain 'allies'
    for (const s of smg) {expect(targetsOf(hrAll)).toContain(s);} // SMG set is a subset of the all set
    expect(hrSmg.length).toBe(S1_ACTIVATIONS * smg.length);
    expect(hrSmg.length).toBeLessThan(hrAll.length);
  });

  // The Hit Rate grant is a LIVE channel (hrCoreMult) and it really is a team grant:
  // re-scoping it to self must move somebody else's damage while leaving miranda's untouched.
  it('re-scoping the 5.44% Hit Rate buff to self moves teammates, not miranda', () => {
    const base = totals(BASE.res);
    const cf = totals(CF_S1_HR_SELF.res);
    const moved = ROSTER.filter((s) => s !== SLUG && cf[s] !== base[s]);
    expect(moved.length).toBeGreaterThan(0);
    expect(cf[SLUG]).toBe(base[SLUG]); // her own Hit Rate is unchanged by the re-scope
  });

  it('ATK 50.06% is self-only and time-bounded', () => {
    const atk = applies(BASE.events, 'atkPct', 50.06);
    expect(atk.length).toBeGreaterThan(0);
    expect(targetsOf(atk)).toEqual([SLUG]); // inertness: no teammate ever receives it

    // Shrinking the window costs miranda damage => the buff is genuinely timed, not permanent.
    const base = totals(BASE.res);
    const cf = totals(CF_S1_ATK_SHORT.res);
    expect(cf[SLUG]).toBeLessThan(base[SLUG]);
  });

  it('the self ATK window is inert for every teammate', () => {
    const base = totals(BASE.res);
    const cf = totals(CF_S1_ATK_SHORT.res);
    for (const s of ROSTER) {
      if (s === SLUG) {continue;}
      expect(cf[s]).toBe(base[s]); // byte-identical
    }
  });
});

describe("miranda S2 — 'Activates when entering Full Burst'", () => {
  // Keyed to the TEAM Full Burst, not to miranda's own cast: the count must track fullBurstStart
  // exactly. A burstCast keying diverges (miranda is a B1 sharing stage 1 with liter).
  it('Crit Damage 32.99% lands on every ally once per Full Burst', () => {
    const cd = applies(BASE.events, 'critDamagePct', 32.99);
    expect(cd.length).toBe(FB * ROSTER.length);
    expect(targetsOf(cd).sort()).toEqual([...ROSTER].sort());
  });

  it('Crit Rate 30.1% and Attack Damage 23.7% are self-only, once per Full Burst', () => {
    const cr = applies(BASE.events, 'critRatePct', 30.1);
    const ad = applies(BASE.events, 'attackDamagePct', 23.7);
    expect(cr.length).toBe(FB);
    expect(ad.length).toBe(FB);
    expect(targetsOf(cr)).toEqual([SLUG]);
    expect(targetsOf(ad)).toEqual([SLUG]);
  });

  // Target set: exactly ONE ally, never the caster.
  it('Crit Rate 85.42% goes to exactly one non-self ally per Full Burst', () => {
    const cr = applies(BASE.events, 'critRatePct', 85.42);
    expect(cr.length).toBe(FB);
    for (const ev of cr) {expect(ev.targetSlug).not.toBe(SLUG);}
  });

  // DURATION SEMANTICS: 'for 1 round(s)' is a ROUND count on the holder, not one second.
  it('the 85.42% buff carries a ROUND duration (durationShots 1), not seconds', () => {
    const cr = applies(BASE.events, 'critRatePct', 85.42);
    expect(cr.length).toBeGreaterThan(0);
    for (const ev of cr) {expect(ev.durationShots).toBe(1);}
  });

  it('modelling the round duration as one second changes the outcome', () => {
    expect(teamTotal(CF_ROUNDS_TO_SEC.res)).not.toBe(teamTotal(BASE.res));
  });
});

describe('miranda burst — 2 top-final-ATK allies, except self', () => {
  const atk = applies(BASE.events, 'atkPct', 40.4);
  const cdm = applies(BASE.events, 'critDamagePct', 56.23);

  // NON-VACUITY. miranda is BURST I and shares stage 1 with liter in controlComp; if this fails,
  // the control fixture never lets her cast and the burst spec below is untested (a FIXTURE
  // finding, not necessarily an override defect).
  it('miranda actually casts her burst in the control comp', () => {
    expect(cdm.length).toBeGreaterThan(0);
  });

  it('each cast grants ATK 40.4% and Crit Damage 56.23% to the same two allies', () => {
    expect(atk.length).toBe(cdm.length);
    expect(cdm.length % 2).toBe(0);
    for (let i = 0; i < cdm.length; i += 2) {
      const pair = [cdm[i].targetSlug, cdm[i + 1].targetSlug];
      expect(new Set(pair).size).toBe(2); // two DISTINCT allies, not one ally twice
      expect(pair).not.toContain(SLUG); // except the skill user
    }
    expect(targetsOf(atk).sort()).toEqual(targetsOf(cdm).sort());
  });

  it('the burst grants never land on miranda herself', () => {
    for (const ev of atk) {expect(ev.targetSlug).not.toBe(SLUG);}
    // and they are strictly a 2-of-3 slice of the roster, never the whole team
    expect(targetsOf(cdm).length).toBeLessThanOrEqual(ROSTER.length - 1);
  });
});

describe('miranda — gaps (not discriminable in this fixture)', () => {
  it.skip('the exact 5 sec / 10 sec windows', () => {
    // The S1 trigger re-fires roughly every 2s (30 rounds at SMG cadence), so a 5 sec window and
    // a permanent buff are behaviourally identical here; only the 0.5s counterfactual above
    // proves the window is honoured at all. Pinning the exact length needs a frame-stamped
    // buffApply (expiresFrame minus the apply frame), which the event payload does not expose.
  });

  it.skip("byFinalAtk vs static-ATK ranking for the 'highest final ATK' target set", () => {
    // 'highest FINAL ATK' must rank by live effectiveAtk, but in the control comp the live and
    // static orderings of the three non-miranda allies do not demonstrably diverge, and the
    // harness exposes no per-unit ATK accessor to build the discriminating case blind.
  });
});
