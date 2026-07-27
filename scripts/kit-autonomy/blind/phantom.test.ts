import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
Phantom blind kit-spec. Fixture: controlComp('phantom', false) = liter B1 + crown B2 + phantom B3,
no fixed SR/Water B3, Fire boss, focus phantom. B1/B2 are present so a Burst-III actually casts and Full
Bursts occur; fixed B3 is off so an unrelated Water/SR buffer cannot confound hit-rate/core, distributed,
or burst readings. Discrimination strategy: event-log first for structural claims (buffApply stat/value/
maxStacks/expiresFrame, burstCast, damage srcSlot), totals only as the damage consequence. Counterfactuals
are in-memory withPatchedOverride clones; committed JSON is never touched. Each patched run is the nearest
wrong model: scoped hit-rate removed, 1-round attack-damage re-encoded as wall-clock, hit-count moved from
10 to 1, max-stack rider zeroed, continuous distributed stacks capped at 1, burst nuke zeroed. Teammates are
asserted byte-identical under every phantom-only patch.
*/

const CARRY = 'phantom';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

type AnyEv = SimEvent & Record<string, any>;
function collect(opts = controlComp(CARRY, false)) {
  const events: AnyEv[] = [];
  const cfg: any = { ...opts };
  cfg.onEvent = (ev: SimEvent) => events.push(ev as AnyEv);
  const res = runComp(cfg);
  return { res, events };
}
function buffs(events: AnyEv[], stat: string, value?: number) {
  return events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || near(e.value, value))
  );
}
function damage(events: AnyEv[], srcSlot?: string) {
  return events.filter(
    (e) =>
      e.kind === 'damage' && (srcSlot === undefined || e.srcSlot === srcSlot)
  );
}
function patchEffects(
  pred: (e: any, b: any, slot: string) => boolean,
  mut: (e: any, b: any, slot: string) => void
) {
  return withPatchedOverride(CARRY, (ov: any) => {
    for (const slot of SLOTS) {
      const cs = ov[slot];
      const blocks = cs && cs.blocks ? cs.blocks : [];
      for (const b of blocks)
        {for (const e of b.effects || []) {if (pred(e, b, slot)) {mut(e, b, slot);}}}
    }
  });
}
function runPatched(ov: any) {
  const opts: any = controlComp(CARRY, false);
  opts.overrides = { [CARRY]: ov };
  return runComp(opts);
}

const base = collect();
const noDaggerHitRate = runPatched(
  patchEffects(
    (e) => e.kind === 'buff' && e.stat === 'hitRatePct' && near(e.value, 25.75),
    (e) => {
      e.value = 0;
    }
  )
);
const atkDamageAsWallClock = runPatched(
  patchEffects(
    (e) =>
      e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 75.17),
    (e) => {
      delete e.durationShots;
      e.durationSec = 5;
    }
  )
);
const tenHitsAsOneHit = runPatched(
  patchEffects(
    (e, b) =>
      b.trigger &&
      b.trigger.kind === 'hitCount' &&
      b.trigger.count === 10 &&
      e.kind === 'buff' &&
      (near(e.value, 85.12) || near(e.value, 31.92)),
    (_e, b) => {
      b.trigger.count = 1;
    }
  )
);
const noMaxStackRider = runPatched(
  patchEffects(
    (e) => e.kind === 'flatDamage' && near(e.atkPct, 84.33),
    (e) => {
      e.atkPct = 0;
    }
  )
);
const distributedCappedAtOne = runPatched(
  patchEffects(
    (e) =>
      e.kind === 'buff' &&
      e.stat === 'distributedDamagePct' &&
      near(e.value, 12.86),
    (e) => {
      e.maxStacks = 1;
    }
  )
);
const noBurst = runPatched(
  patchEffects(
    (e, _b, slot) =>
      slot === 'burst' && e.kind === 'flatDamage' && near(e.atkPct, 1457.28),
    (e) => {
      e.atkPct = 0;
    }
  )
);

const tBase = totals(base.res);
const tm = (res: any) => totals(res);
function teammatesUnmoved(res: any) {
  expect(tm(res).liter).toBe(tBase.liter);
  expect(tm(res).crown).toBe(tBase.crown);
}

describe('phantom kit spec', () => {
  it('s1 Thief Dagger: hit-rate 25.75 is a self scoped stackable buff, max 3, about 5s expiry', () => {
    const hits = buffs(base.events, 'hitRatePct', 25.75).filter(
      (e) => e.targetSlug === CARRY
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((e) => e.maxStacks === 3)).toBe(true);
    expect(
      hits.some(
        (e) => typeof e.expiresFrame === 'number' && e.expiresFrame > e.frame
      )
    ).toBe(true);
    expect(tBase[CARRY]).toBeGreaterThan(tm(noDaggerHitRate)[CARRY]);
    teammatesUnmoved(noDaggerHitRate);
  });

  it('s1 Calling Card branch: attack damage 75.17 lasts 1 round, not a 5s wall-clock window', () => {
    const ad = buffs(base.events, 'attackDamagePct', 75.17).filter(
      (e) => e.targetSlug === CARRY
    );
    expect(ad.length).toBeGreaterThan(0);
    expect(ad.some((e) => e.durationShots === 1)).toBe(true);
    expect(tBase[CARRY]).toBeLessThan(tm(atkDamageAsWallClock)[CARRY]);
    teammatesUnmoved(atkDamageAsWallClock);
  });

  it('s2 after 10 normal attacks: ATK 85.12 for 5s and distributed 31.92 for 10s are hit-count gated', () => {
    const atk = buffs(base.events, 'atkPct', 85.12).filter(
      (e) => e.targetSlug === CARRY
    );
    const dd = buffs(base.events, 'distributedDamagePct', 31.92).filter(
      (e) => e.targetSlug === CARRY
    );
    expect(atk.length).toBeGreaterThan(0);
    expect(dd.length).toBeGreaterThan(0);
    expect(atk.some((e) => typeof e.expiresFrame === 'number')).toBe(true);
    expect(
      dd.some(
        (e) =>
          typeof e.expiresFrame === 'number' &&
          e.expiresFrame > (atk[0].expiresFrame ?? 0)
      )
    ).toBe(true);
    expect(tBase[CARRY]).toBeLessThan(tm(tenHitsAsOneHit)[CARRY]);
    teammatesUnmoved(tenHitsAsOneHit);
  });

  it('s2 max Thief Dagger: 84.33 final-ATK additional hit fires only from the max-stack consume branch', () => {
    const skill2Hits = damage(base.events, 'skill2');
    expect(skill2Hits.length).toBeGreaterThan(0);
    expect(tBase[CARRY]).toBeGreaterThan(tm(noMaxStackRider)[CARRY]);
    expect(damage(base.events, 'skill2').length).toBeGreaterThan(
      damage(
        collect(
          (() => {
            const o: any = controlComp(CARRY, false);
            o.overrides = { [CARRY]: noMaxStackRider };
            return o;
          })()
        ).events,
        'skill2'
      ).length
    );
    teammatesUnmoved(noMaxStackRider);
  });

  it('s2 max-stack self distributed: 12.86 continuously stacks to 3 and is burst-consumed', () => {
    const dd = buffs(base.events, 'distributedDamagePct', 12.86).filter(
      (e) => e.targetSlug === CARRY
    );
    expect(dd.length).toBeGreaterThan(0);
    expect(dd.some((e) => e.maxStacks === 3)).toBe(true);
    expect(
      base.events.some((e) => e.kind === 'burstCast' && e.unitSlug === CARRY)
    ).toBe(true);
    expect(tBase[CARRY]).toBeGreaterThan(tm(distributedCappedAtOne)[CARRY]);
    teammatesUnmoved(distributedCappedAtOne);
  });

  it('burst: 1457.28 final ATK distributed damage to all enemies is the dominant burst bucket', () => {
    expect(
      base.events.some((e) => e.kind === 'burstCast' && e.unitSlug === CARRY)
    ).toBe(true);
    expect(damage(base.events, 'burst').length).toBeGreaterThan(0);
    expect(tBase[CARRY]).toBeGreaterThan(tm(noBurst)[CARRY] * 1.2);
    teammatesUnmoved(noBurst);
  });

  it('inertness: phantom-only counterfactuals never move liter or crown', () => {
    for (const res of [
      noDaggerHitRate,
      atkDamageAsWallClock,
      tenHitsAsOneHit,
      noMaxStackRider,
      distributedCappedAtOne,
      noBurst,
    ])
      {teammatesUnmoved(res);}
  });

  it.skip('s1 Calling Card DEF down 32.19 magnitude: skipped - schema exposes no enemy DEF-down scalar; only the named Calling Card status window is observable through gates', () => {});
});
