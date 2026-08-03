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
 * aria — Aria (MG/Water/Attacker/Burst II)
 *
 * KIT (ground truth, read literally):
 *   skill1: "Activates at the beginning of Full Burst. Affects all allies.
 *            Critical Damage \u25b2 26.99% for 10 sec."
 *   skill2: "Activates when the last bullet hits the target. Affects all allies.
 *            Critical Rate \u25b2 7.03% for 5 sec."
 *   burst:  "Affects all allies. Creates a Shield with 37.86% of the skill user's
 *            final Max HP for 10 sec."
 *           "Affects self. Hit Rate \u25b2 30.37% for 15 sec."
 *
 * FIXTURE: controlComp('aria', true) — aria is a Burst II unit, so the control comp's
 * B1 + B3 slots are required for a burst chain to complete at all; without them aria
 * would never cast and the burst block would be untestable (a lone non-B3 makes ZERO
 * full bursts). The fixed-B3 slot is kept ON: aria's own assertions read HER buffApply
 * events (filtered by casterIdx === aria's slot) and totals under counterfactual patches,
 * so a teammate's own buffs never confound the discriminator.
 *
 * WHY EACH ASSERTION DISCRIMINATES (per line):
 *  - S1 is a TRIGGER-IDENTITY trap: "Activates at the beginning of Full Burst" is
 *    fullBurstEnter (fires on ANY team Full Burst), NOT burstCast (aria's own cast).
 *    Those diverge in a comp with another burst chain member: burstCast fires PRE-FB
 *    and loses the FB window alignment. We assert (a) the first S1 buffApply frame
 *    coincides with a fullBurstStart frame and NOT with aria's burstCast frame, and
 *    (b) a burstCast-keyed counterfactual moves the apply frames.
 *  - S1 is a TARGET-SET trap: "Affects all allies" = every unit in the comp incl. self,
 *    not self-only. We assert one apply per comp member per activation, and a self-only
 *    counterfactual drops teammate damage.
 *  - S1 SCOPE: "Critical Damage" is generic critDamagePct (no normal-attack scoping in
 *    the text), so it must move a teammate's total; the nearest-wrong (critRatePct)
 *    is caught by asserting the emitted stat key.
 *  - S2 is the classic TRIGGER-IDENTITY trap: "when the last bullet hits the target"
 *    is `lastBullet` (per-magazine, so its cadence tracks aria's 300-round belt +
 *    161-frame reload), NOT shotFired (per pull — ~300x more applications) and NOT
 *    interval. We assert the application COUNT is small and magazine-shaped, and that
 *    a shotFired counterfactual explodes the count.
 *  - S2 SCOPE: "Critical Rate" unscoped => critRatePct, not critRateNormalPct. The
 *    nearest-wrong (normal-scoped) under-credits skill/burst crit; we assert the stat key.
 *  - BURST shield: 37.86% of the SKILL USER's final Max HP => a `shield` effect with
 *    maxHpPct, target allies. Per the tandem/cross-unit rule this is NEVER skipped on
 *    isolation: it fires teammates' `shielded` triggers. We assert a shield reaches
 *    every ally on aria's burst cast and that a self-only counterfactual is observable
 *    in the event stream.
 *  - BURST self Hit Rate: "Affects self" => hitRatePct on target self ONLY (a
 *    target-set trap — the shield line above it is allies, this one is not). We assert
 *    exactly one apply, targeted at aria. Its 15s window vs the shield's 10s window is
 *    a DURATION-SEMANTICS discriminator (both wall-clock seconds; neither is rounds).
 *  - INERTNESS: aria carries no damage rider, no weapon-state modifier, no DoT and no
 *    boss debuff. So (a) no flatDamage/dot bucket may appear from aria's srcSlot, and
 *    (b) no damageTakenPct buffApply may exist from aria.
 *  - NON-VACUITY: several assertions could pass trivially if the fixture never entered
 *    Full Burst or aria never reloaded. We assert >=1 fullBurstStart and >=1 reload by
 *    aria before reading anything that depends on them.
 *
 * Hit Rate \u2192 core magnitude is a measured-only \u26d1 quantity (ALWAYS-\u26d1 field 7); we assert the
 * buff is APPLIED with the kit value, never a specific downstream damage delta.
 */

const SLUG = 'aria';

type Ev = SimEvent & Record<string, unknown>;

function run(overrides?: Record<string, unknown>) {
  const events: Ev[] = [];
  const opts = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  const cfg = (opts.cfg ?? {}) as Record<string, unknown>;
  opts.cfg = { ...cfg, onEvent: (ev: SimEvent) => events.push(ev as Ev) };
  if (overrides) {
    opts.overrides = overrides;
  }
  const res = runComp(opts as never);
  return { res, events };
}

const ev = <T extends Ev>(events: Ev[], kind: string) =>
  events.filter((e) => e.kind === kind) as T[];

// Aria's own applies: emitted with casterIdx === her slot index. Boss-held debuffs carry
// casterIdx === null, so this filter also excludes them by construction.
function ariaSlot(res: unknown): number {
  const row = unitOf(res as never, SLUG) as unknown as Record<string, unknown>;
  const idx = (row.slotIdx ?? row.slot ?? row.index) as number | undefined;
  return typeof idx === 'number' ? idx : -1;
}

function appliesBy(events: Ev[], slot: number, stat: string) {
  return ev(events, 'buffApply').filter(
    (e) => e.casterIdx === slot && e.stat === stat
  );
}

// ---- hoisted runs (each runComp is a full 180s sim) ----
const base = run();
const BASE_TOTALS = totals(base.res as never);
const ARIA = ariaSlot(base.res);
const COMP_SLUGS = Object.keys(BASE_TOTALS);

const fbStarts = ev(base.events, 'fullBurstStart').map(
  (e) => e.frame as number
);
const ariaBurstCasts = ev(base.events, 'burstCast')
  .filter((e) => (e.slot ?? e.srcSlot ?? e.casterIdx) === ARIA)
  .map((e) => e.frame as number);
const ariaReloads = ev(base.events, 'reload').filter(
  (e) => (e.slot ?? e.srcSlot ?? e.casterIdx) === ARIA
);

describe('aria — fixture non-vacuity', () => {
  it('aria is in the comp and deals damage', () => {
    expect(COMP_SLUGS).toContain(SLUG);
    expect(BASE_TOTALS[SLUG]).toBeGreaterThan(0);
  });

  it('the fixture actually enters Full Burst (S1 trigger is exercised)', () => {
    expect(fbStarts.length).toBeGreaterThan(0);
  });

  it('aria actually reloads (S2 last-bullet trigger is exercised)', () => {
    expect(ariaReloads.length).toBeGreaterThan(0);
  });

  it('aria actually casts her burst (burst slot is exercised)', () => {
    expect(ariaBurstCasts.length).toBeGreaterThan(0);
  });
});

describe('aria S1 — Crit Damage 26.99% / 10s / all allies / at Full Burst start', () => {
  const applies = appliesBy(base.events, ARIA, 'critDamagePct');

  it('emits critDamagePct at the kit magnitude (not a rounded or invented value)', () => {
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) {
      expect(a.value).toBeCloseTo(26.99, 6);
    }
  });

  it('SCOPE: the stat is generic Critical Damage — no crit-RATE and no normal-scoped variant carries the 26.99 value', () => {
    const misScoped = ev(base.events, 'buffApply').filter(
      (e) =>
        e.casterIdx === ARIA &&
        e.stat !== 'critDamagePct' &&
        Math.abs(((e.value as number) ?? 0) - 26.99) < 1e-6
    );
    expect(misScoped).toHaveLength(0);
  });

  it('DURATION: 10s wall-clock — expiresFrame is ~600 frames after apply (not rounds, no durationShots)', () => {
    for (const a of applies) {
      expect(a.durationShots).toBeUndefined();
      expect((a.expiresFrame as number) - (a.frame as number)).toBe(600);
    }
  });

  it('TARGET SET: every comp member receives it (all allies incl. self), one apply each per activation', () => {
    const perActivation = new Map<number, Set<string>>();
    for (const a of applies) {
      const f = a.frame as number;
      if (!perActivation.has(f)) {
        perActivation.set(f, new Set());
      }
      perActivation.get(f)!.add(a.targetSlug as string);
    }
    expect(perActivation.size).toBeGreaterThan(0);
    for (const [, tset] of perActivation) {
      expect([...tset].sort()).toEqual([...COMP_SLUGS].sort());
    }
  });

  it('TRIGGER IDENTITY: applies land on full-burst START frames, not on aria\u2019s burst-cast frames', () => {
    const applyFrames = [...new Set(applies.map((a) => a.frame as number))];
    for (const f of applyFrames) {
      expect(fbStarts).toContain(f);
    }
    // nearest-wrong #1: burstCast keying would put applies on cast frames. A burst cast
    // resolves BEFORE the FB window opens, so the two frame sets must be disjoint.
    for (const f of applyFrames) {
      expect(ariaBurstCasts).not.toContain(f);
    }
  });

  it('TRIGGER IDENTITY discriminator: re-keying S1 to burstCast changes the activation count/frames (RED under the nearest-wrong model)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks ?? ov.skill1!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.stat === 'critDamagePct')) {
          blk.trigger = { kind: 'burstCast' };
        }
      }
    });
    const alt = run({ [SLUG]: patched });
    const altApplies = appliesBy(
      alt.events,
      ariaSlot(alt.res),
      'critDamagePct'
    );
    const baseFrames = [...new Set(applies.map((a) => a.frame))].join(',');
    const altFrames = [...new Set(altApplies.map((a) => a.frame))].join(',');
    expect(altFrames).not.toBe(baseFrames);
  });

  it('TARGET SET discriminator: a self-only S1 lowers TEAMMATE damage (proves the ally scope is load-bearing)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks ?? ov.skill1!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.stat === 'critDamagePct')) {
          blk.target = { kind: 'self' };
        }
      }
    });
    const alt = totals(run({ [SLUG]: patched }).res as never);
    const mates = COMP_SLUGS.filter((s) => s !== SLUG);
    expect(mates.length).toBeGreaterThan(0);
    expect(mates.some((s) => alt[s] < BASE_TOTALS[s])).toBe(true);
    // ...and aria herself is unchanged: she is an ally of herself either way.
    expect(alt[SLUG]).toBeCloseTo(BASE_TOTALS[SLUG], 6);
  });
});

describe('aria S2 — Crit Rate 7.03% / 5s / all allies / on last bullet', () => {
  const applies = appliesBy(base.events, ARIA, 'critRatePct');

  it('emits critRatePct at the kit magnitude', () => {
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) {
      expect(a.value).toBeCloseTo(7.03, 6);
    }
  });

  it('SCOPE: unscoped Critical Rate — the normal-attack-scoped variant is NOT used', () => {
    expect(appliesBy(base.events, ARIA, 'critRateNormalPct')).toHaveLength(0);
  });

  it('DURATION: 5s wall-clock — 300 frames, no round-count expiry', () => {
    for (const a of applies) {
      expect(a.durationShots).toBeUndefined();
      expect((a.expiresFrame as number) - (a.frame as number)).toBe(300);
    }
  });

  it('TARGET SET: all allies receive it', () => {
    const first = applies[0].frame as number;
    const tset = new Set(
      applies
        .filter((a) => a.frame === first)
        .map((a) => a.targetSlug as string)
    );
    expect([...tset].sort()).toEqual([...COMP_SLUGS].sort());
  });

  it('TRIGGER IDENTITY: last-bullet cadence — one activation per magazine, matching aria\u2019s reload count (\u00b11)', () => {
    const activations = new Set(applies.map((a) => a.frame as number)).size;
    expect(activations).toBeGreaterThan(0);
    expect(Math.abs(activations - ariaReloads.length)).toBeLessThanOrEqual(1);
  });

  it('WHOLE-PICTURE: a 300-round belt over 180s cannot yield hundreds of activations (rules out shotFired/interval keying)', () => {
    const activations = new Set(applies.map((a) => a.frame as number)).size;
    expect(activations).toBeLessThan(30);
  });

  it('TRIGGER IDENTITY discriminator: re-keying S2 to shotFired explodes the activation count (RED under the nearest-wrong model)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!.blocks ?? ov.skill2!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.stat === 'critRatePct')) {
          blk.trigger = { kind: 'shotFired' };
        }
      }
    });
    const alt = run({ [SLUG]: patched });
    const altActivations = new Set(
      appliesBy(alt.events, ariaSlot(alt.res), 'critRatePct').map(
        (a) => a.frame
      )
    ).size;
    const baseActivations = new Set(applies.map((a) => a.frame)).size;
    expect(altActivations).toBeGreaterThan(baseActivations * 3);
  });

  it('NON-VACUITY: the buff is genuinely intermittent \u2014 5s windows do not blanket the 180s fight', () => {
    const covered = new Set(applies.map((a) => a.frame as number)).size * 300;
    expect(covered).toBeLessThan(180 * 60);
  });
});

describe('aria burst — Shield 37.86% of caster final Max HP / 10s / all allies', () => {
  const shields = ev(base.events, 'shield').filter(
    (e) => (e.casterIdx ?? e.srcSlot) === ARIA
  );

  it('TANDEM: a shield event reaches every ally on aria\u2019s burst (never skipped as \u201cdefensive\u201d \u2014 it fires teammates\u2019 shielded triggers)', () => {
    expect(shields.length).toBeGreaterThan(0);
    const first = shields[0].frame as number;
    const tset = new Set(
      shields
        .filter((s) => s.frame === first)
        .map((s) => s.targetSlug as string)
    );
    expect([...tset].sort()).toEqual([...COMP_SLUGS].sort());
  });

  it('TRIGGER IDENTITY: shields are emitted on aria\u2019s own burst-cast frames, once per cast', () => {
    const frames = [...new Set(shields.map((s) => s.frame as number))];
    for (const f of frames) {
      expect(ariaBurstCasts).toContain(f);
    }
    expect(frames.length).toBe(ariaBurstCasts.length);
  });

  it('MAGNITUDE + DURATION: 37.86% of the CASTER\u2019s Max HP for 10s (a targetMaxHp reading would be the nearest-wrong)', () => {
    for (const s of shields) {
      expect(s.maxHpPct as number).toBeCloseTo(37.86, 6);
      expect(s.durationSec as number).toBeCloseTo(10, 6);
    }
  });

  it('TARGET SET discriminator: a self-only shield stops reaching teammates', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!.blocks ?? ov.burst!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.kind === 'shield')) {
          blk.target = { kind: 'self' };
        }
      }
    });
    const alt = run({ [SLUG]: patched });
    const altTargets = new Set(
      ev(alt.events, 'shield')
        .filter((e) => (e.casterIdx ?? e.srcSlot) === ariaSlot(alt.res))
        .map((e) => e.targetSlug as string)
    );
    expect([...altTargets]).toEqual([SLUG]);
  });
});

describe('aria burst — Hit Rate 30.37% / 15s / SELF ONLY', () => {
  const applies = appliesBy(base.events, ARIA, 'hitRatePct');

  it('emits hitRatePct at the kit magnitude', () => {
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) {
      expect(a.value).toBeCloseTo(30.37, 6);
    }
  });

  it('TARGET SET: SELF ONLY \u2014 no teammate ever receives it (the line above it is allies; this one is not)', () => {
    const tset = new Set(applies.map((a) => a.targetSlug as string));
    expect([...tset]).toEqual([SLUG]);
  });

  it('DURATION: 15s (900 frames) \u2014 distinct from the shield\u2019s 10s, proving the two burst lines are not collapsed', () => {
    for (const a of applies) {
      expect(a.durationShots).toBeUndefined();
      expect((a.expiresFrame as number) - (a.frame as number)).toBe(900);
    }
  });

  it('TRIGGER IDENTITY: keyed to aria\u2019s own burst cast, once per cast (not fullBurstEnter, which fires on any team FB)', () => {
    const frames = [...new Set(applies.map((a) => a.frame as number))];
    expect(frames.length).toBe(ariaBurstCasts.length);
    for (const f of frames) {
      expect(ariaBurstCasts).toContain(f);
    }
  });

  it('DISCRIMINATOR: removing the Hit Rate buff changes aria\u2019s own damage and NOTHING else (core-lift is self-scoped)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!.blocks ?? ov.burst!) {
        const blk = b as Record<string, unknown>;
        blk.effects = ((blk.effects ?? []) as Record<string, unknown>[]).filter(
          (e) => e.stat !== 'hitRatePct'
        );
      }
    });
    const alt = totals(run({ [SLUG]: patched }).res as never);
    expect(alt[SLUG]).not.toBeCloseTo(BASE_TOTALS[SLUG], 6);
    for (const s of COMP_SLUGS.filter((x) => x !== SLUG)) {
      expect(alt[s]).toBeCloseTo(BASE_TOTALS[s], 6);
    }
  });
});

describe('aria — inertness / no-invention assertions', () => {
  it('aria has NO damage rider: no flatDamage/dot-flavored damage originates from her outside her weapon buckets', () => {
    const buckets = new Set(
      ev(base.events, 'damage')
        .filter((d) => (d.srcSlot ?? d.slot) === ARIA)
        .map((d) => d.bucket as string)
    );
    for (const b of buckets) {
      expect([
        'dot',
        'flat',
        'flatDamage',
        'sustained',
        'distributed',
      ]).not.toContain(b);
    }
  });

  it('aria inflicts NO boss debuff (no Damage Taken \u25b2 line in her kit)', () => {
    expect(appliesBy(base.events, ARIA, 'damageTakenPct')).toHaveLength(0);
  });

  it('aria carries NO weapon-state modifier (no ammo/reload/fire-rate/charge lines in her kit)', () => {
    for (const stat of [
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'fireRatePct',
      'attackSpeedPct',
      'chargeSpeedPct',
    ]) {
      expect(appliesBy(base.events, ARIA, stat)).toHaveLength(0);
    }
  });

  it('aria grants NO ATK buff (her kit is crit/shield/hit-rate only)', () => {
    for (const stat of ['atkPct', 'casterAtkPct', 'attackDamagePct']) {
      expect(appliesBy(base.events, ARIA, stat)).toHaveLength(0);
    }
  });
});

describe('aria — \u26d1 measurement-gated / out-of-domain', () => {
  it.skip('\u26d1 Hit Rate \u2192 core-hit magnitude is measured-only (ALWAYS-\u26d1 #7): the kit gives the +30.37% Hit Rate, not the resulting core-rate lift. Asserting a specific damage delta would encode the engine\u2019s hrCoreMult estimate as kit truth.', () => {});

  it.skip('\u26d1 MG cadence tuple (pulls/s, wind-up ladder, 161-frame reload) is datamine-unreliable (ALWAYS-\u26d1 #1) \u2014 it sets the last-bullet cadence this file leans on, so the S2 activation count is asserted RELATIVE to the observed reload count, never against an absolute expected number.', () => {});

  it.skip('GAP: the shield has no HP pool in v1 (the boss deals no damage), so the 37.86% amount is unobservable as mitigation \u2014 only its emission/target-set/duration are testable here.', () => {});
});
