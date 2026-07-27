// ADAPTED COPY (driver reconciliation, 2026-07-24): pristine blind artifact preserved at
// blind/ade-agent-bunny.test.ts. Four structural corrections to blind-writer assumptions that were
// unverifiable from the redacted packet — assertion INTENT unchanged. See manual-review.
/**
 * ade-agent-bunny (Ade: Agent Bunny) — BLIND per-unit kit-spec test (S5).
 * Written from the kit prose ALONE. No sight of the driver override, driver tests, or truth file.
 *
 * STRUCTURAL READ OF THE KIT (header + 'Affects ...' clause + stat keyword before the arrow):
 *   S1a  on full-charge LANDING in range, all allies : ATK +15.2% 'of the skill user' ATK', 5s
 *          -> casterAtkPct (FLAT add sourced from ADE'S ATK), NOT atkPct.
 *   S1b  on full-charge, self : Spy Lens 'Minimum Effective Range' +4.44%, up to 10 stacks, 5s
 *          -> GAP: no StatKey models Minimum Effective Range. But the STACK COUNTER is load-bearing:
 *             it is the gate for S2b, so the override must carry it as a currency (resource / ramp).
 *   S2a  on full-charge LANDING in range, all allies : Pierce Damage +18.36%, 5s -> pierceDamagePct
 *   S2b  only at MAX Spy Lens, self : gains Pierce (continuous) + ATK +16% continuously
 *          -> hasPierce + atkPct 16 self, NO durationSec, GATED (must not be live at t=0).
 *   Ba   burst, self : Minimum Effective Range +55.56%, 10s -> GAP (same missing StatKey)
 *   Bb   burst, all allies : Attack Damage +55.04%, 10s -> attackDamagePct (Damage Up bucket)
 *   Bc   burst, all allies : Pierce Damage +10.13%, 10s -> pierceDamagePct
 *
 * FIXTURE: controlComp('ade-agent-bunny', true) — liter B1 / crown B2 / carry / helm B3.
 *   Deterministic (no seed). RISK, asserted explicitly below: ade is BURST II and the control comp
 *   already supplies crown (B2), so the two may contend for the single B2 slot. The first burst test
 *   is a NON-VACUITY gate: if ade never casts, every burst assertion below is meaningless and the
 *   fixture must be rebuilt without a second B2.
 *
 * WHY EACH ASSERTION DISCRIMINATES: each FAITHFUL/FIX line gets (a) a structural assertion read off
 * the override itself (stat identity / target set / duration semantics / trigger identity) and
 * (b) a counterfactual run built with withPatchedOverride that models the NEAREST-WRONG reading;
 * the counterfactual must move damage in a stated direction. Every patch reports how many effects it
 * actually hit, and a 0-hit patch fails — a silently no-op counterfactual proves nothing.
 *
 * INTEGRATION ASSUMPTIONS (blind — all confined to the three helpers below, single point of repair):
 *   - the patched override clone is injected as opts.overrides
 *   - cfg.onEvent is attached at opts.cfg.onEvent
 *   - totals(res).total and unitOf(res, slug).damage are the damage accessors
 * If the exemplar (helm.test.ts) differs, fix baseOpts/runPatched/teamDmg/uDmg only.
 */
import { describe, it, expect } from 'vitest';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness';

const SLUG = 'ade-agent-bunny';
const MATES = ['liter', 'ada', 'helm'];

type Ev = any;

const near = (a: number, b: number, eps = 0.06) => Math.abs(a - b) <= eps;

// ---- integration assumptions live here ONLY ----------------------------------
function baseOpts(onEvent?: (ev: Ev) => void): any {
  const o: any = {
    slugs: ['liter', 'ade-agent-bunny', 'ada', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'ade-agent-bunny',
  };
  if (onEvent) {
    o.cfg = { ...(o.cfg ?? {}), onEvent };
  }
  return o;
}
function runPatched(mutate: (o: any) => number): { res: any; hits: number } {
  let hits = 0;
  const patched = withPatchedOverride(SLUG, (o: any) => {
    hits = mutate(o);
  });
  const o = baseOpts();
  o.overrides = { [SLUG]: patched }; // harness CompOptions.overrides is a per-slug map, not a bare file
  return { res: runComp(o) as any, hits };
}
function readOverride(): any {
  let cap: any = null;
  withPatchedOverride(SLUG, (o: any) => {
    cap = o;
  });
  return cap;
}
const teamDmg = (r: any): number => {
  const t: any = totals(r);
  return Object.values(t).reduce((a: number, b: any) => a + (b as number), 0);
}; // harness totals() is a per-slug map; sum it
const uDmg = (r: any, slug: string): number => {
  const u: any = unitOf(r, slug);
  return (u.damage ?? u.total ?? u.totalDamage) as number;
};
// ------------------------------------------------------------------------------

const blocksOf = (o: any): any[] => [
  ...(o.skill1 ?? []),
  ...(o.skill2 ?? []),
  ...(o.burst ?? []),
  ...(o.blocks ?? o.skills?.blocks ?? []),
];
function findBuffs(o: any, stat: string, value?: number): any[] {
  const out: any[] = [];
  for (const b of blocksOf(o)) {
    for (const e of b.effects ?? []) {
      if (
        e.kind === 'buff' &&
        e.stat === stat &&
        (value === undefined || near(e.value, value))
      ) {
        out.push({ b, e });
      }
    }
  }
  return out;
}
const idxOf = (e: any) => e.srcSlot ?? e.casterIdx ?? e.unitIdx ?? e.idx;

// ---- hoisted runs (each is a full 180s sim) ----------------------------------
const EV: Ev[] = [];
const BASE = runComp(baseOpts((ev) => EV.push(ev))) as any;
const OV = readOverride();

// S1a nearest-wrongs: dead / own-ATK-scaled / self-only
const S1A_ZERO = runPatched((o) => {
  const f = findBuffs(o, 'casterAtkPct', 15.2);
  f.forEach((x) => {
    x.e.value = 0;
  });
  return f.length;
});
const S1A_OWNATK = runPatched((o) => {
  const f = findBuffs(o, 'casterAtkPct', 15.2);
  f.forEach((x) => {
    x.e.stat = 'atkPct';
  });
  return f.length;
});
const S1A_SELF = runPatched((o) => {
  const f = findBuffs(o, 'casterAtkPct', 15.2);
  f.forEach((x) => {
    x.b.target = { kind: 'self' };
  });
  return f.length;
});

// S2b nearest-wrongs: dead / ungated-from-t0
const S2B_ZERO = runPatched((o) => {
  const f = findBuffs(o, 'atkPct', 16);
  f.forEach((x) => {
    x.e.value = 0;
  });
  return f.length;
});
const S2B_UNGATED = runPatched((o) => {
  const f = findBuffs(o, 'atkPct', 16);
  f.forEach((x) => {
    delete x.b.resourceGate;
    delete x.b.everyN;
    delete x.b.everyNOffset;
    delete x.b.fbGate;
    delete x.b.requiresCore;
    delete x.e.rampSec;
    x.b.trigger = { kind: 'shotFired' };
  });
  return f.length;
});

// Pierce channel: both the stat buffs and the unit-level tag
const PIERCE_ZERO = runPatched((o) => {
  const f = findBuffs(o, 'pierceDamagePct');
  f.forEach((x) => {
    x.e.value = 0;
  });
  return f.length;
});
const PIERCE_OFF = runPatched((o) => {
  o.hasPierce = false;
  if (o.skills) {
    o.skills.hasPierce = false;
  }
  for (const blk of blocksOf(o)) {
    blk.effects = (blk.effects ?? []).filter(
      (e: any) => e.kind !== 'gainPierce'
    );
  }
  return 1;
});

// Burst nearest-wrongs: dead / authored-permanent
const BURST_ZERO = runPatched((o) => {
  const f = findBuffs(o, 'attackDamagePct', 55.04);
  f.forEach((x) => {
    x.e.value = 0;
  });
  return f.length;
});
const BURST_LONG = runPatched((o) => {
  const f = findBuffs(o, 'attackDamagePct', 55.04);
  f.forEach((x) => {
    x.e.durationSec = 60;
  });
  return f.length;
});

// ---- event-log derivations from the BASE run ---------------------------------
const APPLIES = EV.filter(
  (e) =>
    e.kind === 'buffApply' && e.targetIdx !== null && e.targetIdx !== undefined
);
const withStat = (stat: string, value: number) =>
  APPLIES.filter((e) => e.stat === stat && near(e.value, value));
const S1A_APPLIES = APPLIES.filter((e) => e.stat === 'casterAtkPct'); // engine emits flat-resolved value, not raw 15.2
const ADE_IDX = S1A_APPLIES.length ? S1A_APPLIES[0].casterIdx : null;
const ADE_SHOTS = EV.filter((e) => e.kind === 'shot' && idxOf(e) === ADE_IDX);
const ADE_CASTS = EV.filter(
  (e) => e.kind === 'burstCast' && idxOf(e) === ADE_IDX
);
const BB_APPLIES = withStat('attackDamagePct', 55.04);
const S2A_APPLIES = withStat('pierceDamagePct', 18.36);
const BC_APPLIES = withStat('pierceDamagePct', 10.13);
const S2B_APPLIES = APPLIES.filter(
  (e) => e.stat === 'atkPct' && near(e.value, 16)
);

describe('ade-agent-bunny — fixture non-vacuity', () => {
  it('ade is present and fires full charges (the S1/S2 per-charge triggers are exercised)', () => {
    expect(ADE_IDX).not.toBeNull();
    expect(ADE_SHOTS.length).toBeGreaterThan(20);
  });

  it('ade actually casts her own Burst II (else every burst assertion below is vacuous)', () => {
    // ade is BURST II and controlComp already supplies crown (B2). If this fails the two contend
    // for the single B2 slot and the burst block is never exercised — rebuild the fixture.
    expect(ADE_CASTS.length).toBeGreaterThan(0);
  });

  it('no silent drops: the unmodelable Minimum Effective Range lines are recorded, not dropped', () => {
    const audit = JSON.stringify({
      unmodeled: OV.unmodeled ?? OV.skills?.unmodeled ?? null,
      note: OV.note ?? null,
    });
    expect(audit).toMatch(/Effective Range/i);
  });
});

describe('S1a — allies ATK +15.2% OF THE SKILL USER ATK, 5s, per full charge', () => {
  it('is a caster-sourced flat ATK add, not an own-ATK scaler (stat identity)', () => {
    const f = findBuffs(OV, 'casterAtkPct', 15.2);
    expect(f.length).toBe(1);
    // nearest-wrong would author stat atkPct at the same magnitude
    expect(findBuffs(OV, 'atkPct', 15.2).length).toBe(0);
  });

  it('duration is 5 wall-clock seconds (not rounds, not permanent)', () => {
    const { e } = findBuffs(OV, 'casterAtkPct', 15.2)[0];
    expect(e.durationSec).toBe(5);
    expect(e.durationShots).toBeUndefined();
  });

  it('trigger is per-full-charge, never a burst/FB key (trigger identity)', () => {
    const { b } = findBuffs(OV, 'casterAtkPct', 15.2)[0];
    expect(['shotFired', 'hitCount', 'chargeCounter']).toContain(
      b.trigger.kind
    );
    expect([
      'burstCast',
      'fullBurstEnter',
      'fullBurstEnd',
      'passive',
      'interval',
    ]).not.toContain(b.trigger.kind);
  });

  it('lands on ALL allies including self (target set)', () => {
    const targets = new Set(S1A_APPLIES.map((e) => e.targetIdx));
    expect(S1A_APPLIES.length).toBeGreaterThan(0);
    expect(targets.size).toBeGreaterThanOrEqual(4);
    expect(targets.has(ADE_IDX)).toBe(true);
  });

  it('is live: zeroing it strictly lowers TEAM damage', () => {
    expect(S1A_ZERO.hits).toBeGreaterThan(0);
    expect(teamDmg(S1A_ZERO.res)).toBeLessThan(teamDmg(BASE));
  });

  it('caster-sourced vs own-ATK is not cosmetic: swapping to atkPct moves the team total', () => {
    expect(S1A_OWNATK.hits).toBeGreaterThan(0);
    expect(Math.abs(teamDmg(S1A_OWNATK.res) - teamDmg(BASE))).toBeGreaterThan(
      0
    );
  });

  it('scoping it to self (nearest-wrong target) strictly lowers TEAM damage', () => {
    expect(S1A_SELF.hits).toBeGreaterThan(0);
    expect(teamDmg(S1A_SELF.res)).toBeLessThan(teamDmg(BASE));
  });
});

describe('S2a — allies Pierce Damage +18.36%, 5s, per full charge', () => {
  it('is authored as pierceDamagePct at 5s on all allies (stat + duration + target set)', () => {
    const f = findBuffs(OV, 'pierceDamagePct', 18.36);
    expect(f.length).toBe(1);
    expect(f[0].e.durationSec).toBe(5);
    expect(['shotFired', 'hitCount', 'chargeCounter']).toContain(
      f[0].b.trigger.kind
    );
    // nearest-wrong: mis-bucketed as generic Attack Damage
    expect(findBuffs(OV, 'attackDamagePct', 18.36).length).toBe(0);
  });

  it('reaches every ally at runtime, not just self', () => {
    expect(S2A_APPLIES.length).toBeGreaterThan(0);
    expect(
      new Set(S2A_APPLIES.map((e) => e.targetIdx)).size
    ).toBeGreaterThanOrEqual(4);
  });

  it('inertness: zeroing the pierce channel leaves the non-pierce teammates byte-identical', () => {
    expect(PIERCE_ZERO.hits).toBeGreaterThan(0);
    for (const m of MATES) {
      expect(uDmg(PIERCE_ZERO.res, m)).toBe(uDmg(BASE, m));
    }
    expect(uDmg(PIERCE_ZERO.res, SLUG)).toBeLessThanOrEqual(uDmg(BASE, SLUG));
  });

  it.skip('STRICT: zeroing Pierce Damage lowers ADE damage — engine-gated, see gaps', () => {
    // types.ts carries a direct contradiction the blind reader cannot resolve:
    //   StatKey pierceDamagePct  -> 'parsed but inert in v1'
    //   CharacterSkills.hasPierce -> 'kit attacks are Pierce-tagged -> Pierce Damage feeds Damage Up'
    // Both of ade's Pierce lines and her whole S2b payoff ride on which one is current. If the second
    // is, this becomes the real discriminator and must be un-skipped.
    expect(uDmg(PIERCE_ZERO.res, SLUG)).toBeLessThan(uDmg(BASE, SLUG));
  });
});

describe('S2b — at MAX Spy Lens: gains Pierce + ATK +16% continuously (self)', () => {
  it('the ATK buff scales her OWN ATK, is self-only, and is continuous (no durationSec)', () => {
    const f = findBuffs(OV, 'atkPct', 16);
    expect(f.length).toBe(1);
    const { b, e } = f[0];
    expect(b.target.kind).toBe('self');
    expect(e.durationSec).toBeUndefined(); // 'continuously' is NOT a 5s window
    expect(e.durationShots).toBeUndefined();
    // nearest-wrong: caster-sourced flat add at the same magnitude
    expect(findBuffs(OV, 'casterAtkPct', 16).length).toBe(0);
  });

  it('the max-Spy-Lens condition is modeled by SOME gate, not shipped live from t=0', () => {
    const { b, e } = findBuffs(OV, 'atkPct', 16)[0];
    const gated =
      Boolean(b.resourceGate) ||
      typeof e.rampSec === 'number' ||
      b.trigger.kind !== 'passive';
    expect(gated).toBe(true);
  });

  it('runtime target set is ade alone', () => {
    expect(S2B_APPLIES.length).toBeGreaterThan(0);
    const targets = new Set(S2B_APPLIES.map((e) => e.targetIdx));
    expect(targets.size).toBe(1);
    expect(targets.has(ADE_IDX)).toBe(true);
  });

  it('is live: zeroing it lowers ADE damage and moves nobody else (inertness)', () => {
    expect(S2B_ZERO.hits).toBeGreaterThan(0);
    expect(uDmg(S2B_ZERO.res, SLUG)).toBeLessThan(uDmg(BASE, SLUG));
    for (const m of MATES) {
      expect(uDmg(S2B_ZERO.res, m)).toBe(uDmg(BASE, m));
    }
  });

  it('non-vacuity: the gate really BITES — an ungated clone out-damages the gated baseline', () => {
    // ~10 full charges are needed for 10 Spy Lens stacks (60f charge, 6 ammo, 141f reload => the
    // 10th charge lands ~10s in), so a correctly gated model must lose that opening window.
    // If this is equal, the fixture never exercises the INACTIVE case and every S2b assertion above
    // is testing a permanently-on buff.
    expect(S2B_UNGATED.hits).toBeGreaterThan(0);
    expect(uDmg(S2B_UNGATED.res, SLUG)).toBeGreaterThan(uDmg(BASE, SLUG));
  });

  it('Gains Pierce is carried as the unit-level tag, and removing it never moves teammates', () => {
    const tagged =
      Boolean(OV.hasPierce ?? OV.skills?.hasPierce) ||
      JSON.stringify(OV).includes('"gainPierce"');
    expect(tagged).toBe(true);
    for (const m of MATES) {
      expect(uDmg(PIERCE_OFF.res, m)).toBe(uDmg(BASE, m));
    }
    expect(uDmg(PIERCE_OFF.res, SLUG)).toBeLessThanOrEqual(uDmg(BASE, SLUG));
  });
});

describe('burst — allies Attack Damage +55.04% / Pierce Damage +10.13%, 10s', () => {
  it('Attack Damage is the Damage-Up bucket stat, 10s, all allies, on ADE own cast', () => {
    const f = findBuffs(OV, 'attackDamagePct', 55.04);
    expect(f.length).toBe(1);
    const { b, e } = f[0];
    expect(e.durationSec).toBe(10);
    expect(['allies']).toContain(b.target.kind);
    // trigger identity: her own burst block with no activation clause = burstCast. Keying it to
    // fullBurstEnter would over-credit on any rotation another B2/B3 completes the chain.
    expect(b.trigger.kind).toBe('burstCast');
  });

  it('Pierce Damage +10.13% rides the same cast, 10s, all allies', () => {
    const f = findBuffs(OV, 'pierceDamagePct', 10.13);
    expect(f.length).toBe(1);
    expect(f[0].e.durationSec).toBe(10);
    expect(f[0].b.trigger.kind).toBe('burstCast');
    expect(f[0].b.target.kind).toBe('allies');
  });

  it('fires exactly once per ADE burst cast, never once per team Full Burst', () => {
    const toAde = BB_APPLIES.filter((e) => e.targetIdx === ADE_IDX);
    expect(ADE_CASTS.length).toBeGreaterThan(0);
    expect(toAde.length).toBe(ADE_CASTS.length);
    expect(
      new Set(BB_APPLIES.map((e) => e.targetIdx)).size
    ).toBeGreaterThanOrEqual(4);
    expect(BC_APPLIES.length).toBe(BB_APPLIES.length);
  });

  it('is live: zeroing Attack Damage strictly lowers TEAM damage', () => {
    expect(BURST_ZERO.hits).toBeGreaterThan(0);
    expect(teamDmg(BURST_ZERO.res)).toBeLessThan(teamDmg(BASE));
  });

  it('the 10s window is real: stretching it to 60s raises TEAM damage (not authored permanent)', () => {
    expect(BURST_LONG.hits).toBeGreaterThan(0);
    expect(teamDmg(BURST_LONG.res)).toBeGreaterThan(teamDmg(BASE));
  });
});

describe('GAP — Minimum Effective Range (S1b Spy Lens 4.44% x10, burst 55.56%)', () => {
  it.skip('Spy Lens Minimum Effective Range +4.44% per stack changes ade damage', () => {
    // No StatKey models Minimum Effective Range. The engine exposes range only as the binary +30%
    // full-range bonus (damage.rangeApplied), with no band-threshold input, so the magnitude is
    // unobservable. The stack COUNTER is still load-bearing and is covered by the S2b gate test.
  });

  it.skip('burst Minimum Effective Range +55.56% for 10s changes ade damage', () => {
    // Same missing primitive. Both lines must appear verbatim in the override unmodeled field —
    // asserted in the no-silent-drops test above.
  });
});
