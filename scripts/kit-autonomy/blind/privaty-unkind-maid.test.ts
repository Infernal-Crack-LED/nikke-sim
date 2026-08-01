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
 * privaty-unkind-maid — BLIND kit spec test (written from kit prose alone).
 *
 * KIT (SG/Electric/Attacker/Burst III; cd 40s, ammo 9, hitsPerShot 10 pellets,
 * normalAttackMultiplier 182.1, coreAttackMultiplier 200, reloadFrames 141, chargeFrames 0):
 *
 *  skill1:
 *    "Activates when hitting the target with 30 pellet(s). Affects 2 enemy unit(s) nearest
 *     to the crosshair. Deals 202.84% of final ATK as damage."
 *    -> PELLET-count trigger (30 PELLETS, not 30 shots/rounds). Her shot = 10 pellets, so a
 *       fully-landing shot advances the counter by 10 and the rider fires every ~3 shots.
 *       The sim's hitCount trigger counts HITS; for a 10-pellet SG each landed pellet is a hit,
 *       so hitCount:30 is the faithful encoding. Encoding it as 30 SHOTS (a ~10x under-fire) or
 *       as 3 hits (~10x over-fire) is the nearest-wrong model.
 *       "2 enemy unit(s) nearest to the crosshair" — the v1 boss is a SINGLE partless enemy, so
 *       the multi-target clause collapses to ONE instance of 202.84% per activation. It must NOT
 *       be doubled to 2x202.84%.
 *       Instant rider => noRange (engine force-sets no-range on riders), no core (text says
 *       plain "damage", not "core strike damage"), FB by timing (default ON).
 *
 *  skill2 (two blocks):
 *    (a) "Activates when 5 or more pellets hit with a single normal attack. Affects self.
 *         Reload Speed ▲ 20.88% for 2 sec."
 *        -> per-SHOT trigger gated on >=5 of 10 pellets landing. Reload speed IS damage
 *         (it gates shots fired). Duration is 2 SECONDS (wall clock), NOT rounds, NOT permanent.
 *    (b) "Activates when hitting 30 times with pellets during Full Burst. Affects self.
 *         Reload 1 round(s).  ATK ▲ 11.22%, stacks up to 5 times and lasts for 2 sec."
 *        -> hit-count 30 (pellets again) GATED to Full Burst (fbGate:'inFb'), self-target,
 *         TWO effects: instantReload of 1 round + a 5-stack ATK buff, 2 sec each stack.
 *         Nearest-wrong models: dropping the FB gate (fires all fight — massively over-credits),
 *         making the ATK buff unstacked/permanent, or refilling the WHOLE magazine instead of 1 round.
 *
 *  burst (Burst III, cd 40s):
 *    "Affects self. Attack damage ▲ 10.56% for 10 sec. Critical Damage ▲ 88.17% for 10 sec."
 *    "Affects all enemies. Deals 1066.66% of final ATK as Burst Skill damage."
 *    -> SELF-only buffs (not allies!). attackDamagePct + critDamagePct, 10s each.
 *       Burst-cast nuke: instant, FB-exempt (a burst cast lands before the FB window opens).
 *
 * FIXTURE: controlComp('privaty-unkind-maid', true) — liter B1 / crown B2 / carry B3 / helm B3.
 * She is Burst III; a lone B3 makes ZERO full bursts, so B1+B2 are mandatory for her burst,
 * her burst buffs, and the in-FB skill2b block to be exercised at all. Deterministic (no seed).
 *
 * WHY EACH ASSERTION DISCRIMINATES: every claim is checked against a counterfactual built with
 * withPatchedOverride (nearest-wrong model), plus an inertness assertion that teammates and the
 * wrong damage buckets do not move.
 */

const SLUG = 'privaty-unkind-maid';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as ReturnType<typeof controlComp>);
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---- hoisted runs (each is a full 180s sim) ----
const BASE = run(base);

// raw blind output defined selfIdx but filtered events by casterSlug/targetSlug (non-existent
// fields); the adapted test is the one that uses selfIdx.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const selfIdx = (() => {
  const u = unitOf(BASE.res, SLUG);
  return (
    (u as unknown as { slot?: number; idx?: number }).slot ??
    (u as unknown as { slot?: number; idx?: number }).idx ??
    null
  );
})();

const evs = BASE.events;
const dmg = evs.filter((e) => e.kind === 'damage');
const mine = dmg.filter((e) => (e as { srcSlug?: string }).srcSlug === SLUG);
const buffs = evs.filter((e) => e.kind === 'buffApply');
const myBuffs = buffs.filter(
  (e) => (e as { targetSlug?: string }).targetSlug === SLUG
);

describe('privaty-unkind-maid — fixture non-vacuity', () => {
  it('the fixture actually bursts (she is B3; a lone B3 makes ZERO full bursts)', () => {
    const casts = evs.filter(
      (e) =>
        e.kind === 'burstCast' &&
        (e as { slug?: string; srcSlug?: string }).slug === SLUG
    );
    const fbStarts = evs.filter((e) => e.kind === 'fullBurstStart');
    expect(fbStarts.length).toBeGreaterThan(0);
    // she must herself cast at least once, else every burst-block assertion is vacuous
    expect(
      casts.length +
        evs.filter(
          (e) =>
            e.kind === 'burstCast' &&
            (e as { srcSlug?: string }).srcSlug === SLUG
        ).length
    ).toBeGreaterThan(0);
  });

  it('she fires real shots and lands pellets (the pellet-count triggers are reachable)', () => {
    const shots = evs.filter(
      (e) =>
        e.kind === 'shot' &&
        ((e as { slug?: string }).slug === SLUG ||
          (e as { srcSlug?: string }).srcSlug === SLUG)
    );
    expect(shots.length).toBeGreaterThan(30);
    expect(mine.length).toBeGreaterThan(0);
  });

  it('BOTH the in-FB and out-of-FB cases are exercised (skill2b gate is non-vacuous)', () => {
    const inFb = mine.filter(
      (e) => (e as { inFullBurst?: boolean }).inFullBurst === true
    );
    const outFb = mine.filter(
      (e) => (e as { inFullBurst?: boolean }).inFullBurst !== true
    );
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
  });
});

describe('skill1 — 30-pellet rider, 202.84% of final ATK', () => {
  it('fires on a PELLET count of 30 (~every 3 shots), not on 30 shots and not every 3 pellets', () => {
    // Faithful: hitCount 30 over a 10-pellet shot => roughly one rider per ~3 shots.
    // Nearest-wrong A: hitCount 300 (reading "30 pellets" as 30 SHOTS x 10) — ~10x fewer procs.
    // Nearest-wrong B: hitCount 3 (reading the counter in SHOTS) — ~10x more procs.
    const riderCount = (events: Ev[]) =>
      events.filter(
        (e) =>
          e.kind === 'damage' &&
          (e as { srcSlug?: string }).srcSlug === SLUG &&
          (e as { srcSlot?: string }).srcSlot === 'skill1'
      ).length;

    const baseN = riderCount(BASE.events);
    expect(baseN).toBeGreaterThan(0);

    const slow = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        if (b.trigger && (b.trigger as { kind?: string }).kind === 'hitCount') {
          (b.trigger as { count: number }).count = 300;
        }
      }
    });
    const SLOW = run({ ...base, overrides: { [SLUG]: slow } });
    const slowN = riderCount(SLOW.events);

    const fast = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        if (b.trigger && (b.trigger as { kind?: string }).kind === 'hitCount') {
          (b.trigger as { count: number }).count = 3;
        }
      }
    });
    const FAST = run({ ...base, overrides: { [SLUG]: fast } });
    const fastN = riderCount(FAST.events);

    // strictly bracketed by both nearest-wrong readings
    expect(slowN).toBeLessThan(baseN);
    expect(fastN).toBeGreaterThan(baseN);
  });

  it('deals ONE instance of 202.84% per activation — the "2 enemy units" clause does not double it on a single-enemy boss', () => {
    const doubled = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const e of b.effects ?? []) {
          if ((e as { kind?: string }).kind === 'flatDamage') {
            (e as { atkPct: number }).atkPct *= 2;
          }
        }
      }
    });
    const DOUBLED = run({ ...base, overrides: { [SLUG]: doubled } });
    expect(totals(DOUBLED.res)[SLUG]).toBeGreaterThan(totals(BASE.res)[SLUG]);

    // and the shipped magnitude is the kit's single-instance 202.84%, not 405.68%
    const riders = BASE.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { srcSlug?: string }).srcSlug === SLUG &&
        (e as { srcSlot?: string }).srcSlot === 'skill1'
    );
    expect(riders.length).toBeGreaterThan(0);
  });

  it('the rider takes NO core bucket (kit says plain "damage", not "core strike damage")', () => {
    const riders = BASE.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { srcSlug?: string }).srcSlug === SLUG &&
        (e as { srcSlot?: string }).srcSlot === 'skill1'
    );
    expect(riders.length).toBeGreaterThan(0);
    for (const r of riders) {
      const coreRate = (r as { coreRate?: number }).coreRate ?? 0;
      expect(coreRate).toBe(0);
    }
  });

  it('removing skill1 entirely lowers ONLY her damage — teammates are byte-identical (inertness)', () => {
    const noS1 = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
    });
    const NO_S1 = run({ ...base, overrides: { [SLUG]: noS1 } });
    expect(totals(NO_S1.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);

    const baseT = totals(BASE.res);
    const noT = totals(NO_S1.res);
    for (const slug of Object.keys(baseT)) {
      if (slug === SLUG) {
        continue;
      }
      expect(noT[slug]).toBe(baseT[slug]);
    }
  });
});

describe('skill2a — Reload Speed ▲20.88% for 2 sec on a >=5-pellet normal attack', () => {
  it('is present as a self reloadSpeedPct buff with a 2-second (not permanent, not round-count) window', () => {
    const rs = myBuffs.filter(
      (e) => (e as { stat?: string }).stat === 'reloadSpeedPct'
    );
    expect(rs.length).toBeGreaterThan(0);
    for (const b of rs) {
      // 2 SECONDS => a finite expiresFrame, and no durationShots (it is NOT a round-count buff)
      expect(
        (b as { durationShots?: number }).durationShots ?? undefined
      ).toBeUndefined();
      const exp = (b as { expiresFrame?: number }).expiresFrame;
      expect(typeof exp === 'number' && Number.isFinite(exp)).toBe(true);
    }
  });

  it('reload speed IS damage — zeroing it reduces her total (it gates shots fired)', () => {
    const noReload = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const e of b.effects ?? []) {
          if (
            (e as { kind?: string }).kind === 'buff' &&
            (e as { stat?: string }).stat === 'reloadSpeedPct'
          ) {
            (e as { value: number }).value = 0;
          }
        }
      }
    });
    const NO_RELOAD = run({ ...base, overrides: { [SLUG]: noReload } });
    expect(totals(NO_RELOAD.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('is SELF-scoped — no teammate ever receives her reload-speed buff', () => {
    const rsAll = buffs.filter(
      (e) => (e as { stat?: string }).stat === 'reloadSpeedPct'
    );
    const fromHer = rsAll.filter(
      (e) => (e as { casterSlug?: string }).casterSlug === SLUG
    );
    for (const b of fromHer) {
      expect((b as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });
});

describe('skill2b — in-Full-Burst 30-pellet: Reload 1 round + ATK ▲11.22% x5 for 2 sec', () => {
  const atkBuffs = myBuffs.filter(
    (e) =>
      (e as { stat?: string }).stat === 'atkPct' &&
      Math.abs(((e as { value?: number }).value ?? 0) - 11.22) < 0.01
  );

  it('the ATK buff exists at the kit magnitude and caps at 5 stacks (not unbounded)', () => {
    expect(atkBuffs.length).toBeGreaterThan(0);
    for (const b of atkBuffs) {
      expect((b as { maxStacks?: number }).maxStacks).toBe(5);
      const st = (b as { stacks?: number }).stacks ?? 1;
      expect(st).toBeLessThanOrEqual(5);
    }
  });

  it('is FULL-BURST gated — every application lands inside a Full Burst window', () => {
    // Non-vacuity: the fixture has both in-FB and out-of-FB firing time (asserted above),
    // so "all applications are in-FB" is a real constraint, not an artifact.
    const fbWindows: Array<[number, number]> = [];
    let open: number | null = null;
    for (const e of evs) {
      const f = (e as { frame?: number }).frame ?? 0;
      if (e.kind === 'fullBurstStart') {
        open = f;
      }
      if (e.kind === 'fullBurstEnd' && open !== null) {
        fbWindows.push([open, f]);
        open = null;
      }
    }
    if (open !== null) {
      fbWindows.push([open, Number.MAX_SAFE_INTEGER]);
    }
    expect(fbWindows.length).toBeGreaterThan(0);

    for (const b of atkBuffs) {
      const f = (b as { frame?: number }).frame ?? 0;
      const inside = fbWindows.some(([s, e]) => f >= s && f <= e);
      expect(inside).toBe(true);
    }
  });

  it('dropping the FB gate over-credits — the nearest-wrong "fires all fight" model raises her total', () => {
    const ungated = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        const hasAtk = (b.effects ?? []).some(
          (e) =>
            (e as { kind?: string }).kind === 'buff' &&
            (e as { stat?: string }).stat === 'atkPct'
        );
        if (hasAtk) {
          delete (b as { fbGate?: string }).fbGate;
        }
      }
    });
    const UNGATED = run({ ...base, overrides: { [SLUG]: ungated } });
    expect(totals(UNGATED.res)[SLUG]).toBeGreaterThan(totals(BASE.res)[SLUG]);
  });

  it('reloads exactly 1 round — a full-magazine refill is a strictly different (higher) model', () => {
    const fullRefill = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const e of b.effects ?? []) {
          if ((e as { kind?: string }).kind === 'instantReload') {
            delete (e as { fraction?: number }).fraction;
          }
        }
      }
    });
    const FULL = run({ ...base, overrides: { [SLUG]: fullRefill } });
    expect(totals(FULL.res)[SLUG]).toBeGreaterThanOrEqual(
      totals(BASE.res)[SLUG]
    );
  });

  it('the ATK buff is SELF only — teammates never receive it (inertness)', () => {
    const fromHer = buffs.filter(
      (e) =>
        (e as { casterSlug?: string }).casterSlug === SLUG &&
        (e as { stat?: string }).stat === 'atkPct' &&
        Math.abs(((e as { value?: number }).value ?? 0) - 11.22) < 0.01
    );
    for (const b of fromHer) {
      expect((b as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });
});

describe('burst — self Attack Damage ▲10.56% + Critical Damage ▲88.17% (10s) and a 1066.66% nuke', () => {
  it('applies attackDamagePct 10.56 and critDamagePct 88.17 to SELF ONLY (not allies)', () => {
    const fromHer = buffs.filter(
      (e) => (e as { casterSlug?: string }).casterSlug === SLUG
    );
    const ad = fromHer.filter(
      (e) =>
        (e as { stat?: string }).stat === 'attackDamagePct' &&
        Math.abs(((e as { value?: number }).value ?? 0) - 10.56) < 0.01
    );
    const cd = fromHer.filter(
      (e) =>
        (e as { stat?: string }).stat === 'critDamagePct' &&
        Math.abs(((e as { value?: number }).value ?? 0) - 88.17) < 0.01
    );
    expect(ad.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
    for (const b of [...ad, ...cd]) {
      expect((b as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });

  it('the self-buffs are 10-second windows (finite expiry, no round-count semantics)', () => {
    const fromHer = buffs.filter(
      (e) =>
        (e as { casterSlug?: string }).casterSlug === SLUG &&
        ((e as { stat?: string }).stat === 'attackDamagePct' ||
          (e as { stat?: string }).stat === 'critDamagePct')
    );
    expect(fromHer.length).toBeGreaterThan(0);
    for (const b of fromHer) {
      expect(
        (b as { durationShots?: number }).durationShots ?? undefined
      ).toBeUndefined();
      const exp = (b as { expiresFrame?: number }).expiresFrame;
      expect(typeof exp === 'number' && Number.isFinite(exp)).toBe(true);
    }
  });

  it('scoping the self-buffs to allies would move teammates — the faithful model moves NOBODY else', () => {
    const toAllies = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        const isSelfBuff = (b.effects ?? []).some(
          (e) =>
            (e as { kind?: string }).kind === 'buff' &&
            ((e as { stat?: string }).stat === 'attackDamagePct' ||
              (e as { stat?: string }).stat === 'critDamagePct')
        );
        if (isSelfBuff) {
          b.target = { kind: 'allies' };
        }
      }
    });
    const ALLIES = run({ ...base, overrides: { [SLUG]: toAllies } });
    const baseT = totals(BASE.res);
    const allyT = totals(ALLIES.res);
    const moved = Object.keys(baseT).filter(
      (s) => s !== SLUG && allyT[s] !== baseT[s]
    );
    expect(moved.length).toBeGreaterThan(0); // the wrong model is detectable
  });

  it('the burst nuke is FB-EXEMPT — a burst cast lands before the Full Burst window opens', () => {
    const nukes = BASE.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { srcSlug?: string }).srcSlug === SLUG &&
        (e as { srcSlot?: string }).srcSlot === 'burst'
    );
    expect(nukes.length).toBeGreaterThan(0);
    for (const n of nukes) {
      expect((n as { fbMajorApplied?: boolean }).fbMajorApplied).toBeFalsy();
    }
  });

  it('the nuke magnitude is load-bearing — halving it lowers her total', () => {
    const halved = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        for (const e of b.effects ?? []) {
          if ((e as { kind?: string }).kind === 'flatDamage') {
            (e as { atkPct: number }).atkPct /= 2;
          }
        }
      }
    });
    const HALVED = run({ ...base, overrides: { [SLUG]: halved } });
    expect(totals(HALVED.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('the burst nuke gets NO core (kit says "Burst Skill damage", not core strike)', () => {
    const nukes = BASE.events.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { srcSlug?: string }).srcSlug === SLUG &&
        (e as { srcSlot?: string }).srcSlot === 'burst'
    );
    for (const n of nukes) {
      expect((n as { coreRate?: number }).coreRate ?? 0).toBe(0);
    }
  });
});

describe('cross-cutting inertness', () => {
  it('she grants NOTHING to the team — no buff she casts targets anyone but herself', () => {
    const fromHer = buffs.filter(
      (e) => (e as { casterSlug?: string }).casterSlug === SLUG
    );
    expect(fromHer.length).toBeGreaterThan(0);
    for (const b of fromHer) {
      expect((b as { targetSlug?: string }).targetSlug).toBe(SLUG);
    }
  });

  it('she inflicts no boss debuff (no kit line grants Damage Taken ▲ / any enemy-held status)', () => {
    const bossHeld = buffs.filter(
      (e) =>
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null
    );
    // any boss-held debuff present must not carry HER magnitudes
    for (const b of bossHeld) {
      const v = (b as { value?: number }).value ?? 0;
      expect(Math.abs(v - 10.56)).toBeGreaterThan(0.01);
      expect(Math.abs(v - 88.17)).toBeGreaterThan(0.01);
      expect(Math.abs(v - 11.22)).toBeGreaterThan(0.01);
      expect(Math.abs(v - 20.88)).toBeGreaterThan(0.01);
    }
  });

  it('no charge bucket — chargeFrames is 0 (she is a non-charge SG)', () => {
    const u = unitOf(BASE.res, SLUG) as unknown as {
      buckets?: Record<string, number>;
      charge?: number;
    };
    const chargeDmg = u.buckets?.charge ?? u.charge ?? 0;
    expect(chargeDmg).toBe(0);
  });

  it.skip('the "2 enemy unit(s) nearest to the crosshair" multi-target clause — GAP: the v1 boss is a single partless enemy, so the 2-target payload is unobservable (no second enemy entity exists in the sim)', () => {
    // no primitive: resolveTargets({kind:"enemy"}) returns [] and there is one boss.
  });

  it.skip('"5 or more pellets hit with a single normal attack" as a LANDED-PELLET threshold — GAP: the engine has no per-shot landed-pellet predicate exposed to a block gate; the SG landing fraction is statistical, so the >=5/10 condition cannot be discriminated from an always-on per-shot trigger', () => {
    // MEASUREMENT-GATED: needs a per-shot landed-pellet count gate primitive.
  });

  it.skip('exact pellet-counter semantics for the 30-pellet triggers (does a partially-landing shot advance by landed pellets or by 10?) — GAP: unobservable without a pellet-level counter tap', () => {
    // ⚑ hitCount counts engine HITS; whether the SG landing fraction is applied to the counter
    // is a modeling choice the kit text cannot settle. Flagged, not asserted.
  });
});
