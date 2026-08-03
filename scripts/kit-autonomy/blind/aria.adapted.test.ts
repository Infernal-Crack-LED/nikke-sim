// ADAPTED COPY (driver reconciliation, 2026-08-03): pristine blind artifact preserved at
// blind/aria.test.ts. Five structural corrections to blind-writer assumptions that were
// unverifiable from the redacted packet — assertion INTENT unchanged. Each correction cites the
// engine/fixture fact that forced it; see manual-review.
//
//  1. HARNESS PATH: '../lib/harness.js' → '../../tests/lib/harness.js' (scripts/kit-autonomy/lib/
//     does not exist; the harness lives in scripts/tests/lib/ — admi blind-test precedent).
//  2. FIXTURE REBUILD: controlComp('aria') starves aria to ZERO casts — crown (B2, 20s cd,
//     always ready) takes every stage-2 slot under same-stage first-ready selection (PROBED:
//     5 FBs, crown 10 casts, aria 0). The blind test's OWN non-vacuity gate ('aria actually
//     casts her burst') demanded the rebuild (the S2b reviewer flagged this exact trap):
//     ['liter','aria','helm'] — B1/B2/B3 covered, aria the sole B2, casts every FB (5 casts,
//     5 FBs in 180s). Boss Fire, focus aria (controlComp's element/focus convention).
//  3. EVENT INTERFACE: burstCast/reload events carry slug/unitIdx (no slot/srcSlot/casterIdx
//     fields); SimResult rows carry no slot index (aria's slot read off the comp order). The
//     engine emits NO 'shield' SimEvent — the shield effect is event-only and observable ONLY
//     through the 'shielded' trigger it fires (sim.ts case 'shield'), so the shield-event
//     assertions are re-expressed as patched shielded-consumer SENTINELS (one per comp member,
//     self defPct 5 — inert in v1, pure signal), which is exactly the blind test's stated intent
//     ('it fires teammates' shielded triggers'); the 37.86%/10s magnitude+duration is pinned
//     structurally on the override JSON (label L5 precedent).
//  4. HIT-RATE DAMAGE DELTA FLIPPED TO INERTNESS: the blind test assumed the +30.37 Hit Rate
//     lifts aria's core rate; the engine's HR→core channel is AR/SMG/SG accuracy-circle models
//     ONLY — MG has no circle row (sim.ts: hrCoreExp → 0 for MG; PELLET_GAUSS / CONE_DELTA /
//     UNIGEO all explicitly fall through for MG/SR/RL). The faithful buff applies but moves zero
//     damage, so the assertion is flipped to the totals-equality inertness pin (the same
//     self-scoped channel claim, expressed through what the engine actually does).
//  5. ARIA SLOT: ariaSlot() resolved via comp order instead of a nonexistent row field.
/**
 * aria — Aria (MG/Water/Attacker/Burst II)
 *
 * KIT (ground truth, read literally):
 *   skill1: "Activates at the beginning of Full Burst. Affects all allies.
 *            Critical Damage ▲ 26.99% for 10 sec."
 *   skill2: "Activates when the last bullet hits the target. Affects all allies.
 *            Critical Rate ▲ 7.03% for 5 sec."
 *   burst:  "Affects all allies. Creates a Shield with 37.86% of the skill user's
 *            final Max HP for 10 sec."
 *           "Affects self. Hit Rate ▲ 30.37% for 15 sec."
 *
 * (Original blind fixture/rationale header preserved in blind/aria.test.ts.)
 */

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // adaptation 1

const SLUG = 'aria';

// adaptation 2: rebuilt fixture (controlComp starves aria to zero casts — PROBED)
const COMP_SLUGS = ['liter', 'aria', 'helm'];
const ARIA = COMP_SLUGS.indexOf(SLUG); // adaptation 5

type Ev = SimEvent & Record<string, unknown>;

function run(overrides?: Record<string, unknown>) {
  const events: Ev[] = [];
  const res = runComp({
    slugs: COMP_SLUGS,
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides: overrides as never,
    cfg: { onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  } as never);
  return { res, events };
}

const ev = <T extends Ev>(events: Ev[], kind: string) =>
  events.filter((e) => e.kind === kind) as T[];

function appliesBy(events: Ev[], slot: number, stat: string) {
  return ev(events, 'buffApply').filter(
    (e) => e.casterIdx === slot && e.stat === stat,
  );
}

// adaptation 3: shield emission is observable ONLY via the 'shielded' trigger — sentinel blocks
// patched in-memory onto each comp member (self defPct 5, inert in v1, pure signal).
function withShieldSentinel(slug: string) {
  return withPatchedOverride(slug, (ov) => {
    ov.skill1 = [
      ...ov.skill1,
      {
        slot: 'skill1',
        trigger: { kind: 'shielded' },
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'defPct', value: 5 }],
      },
    ];
  });
}
const sentinelOf = (events: Ev[], slug: string) =>
  ev(events, 'buffApply').filter(
    (e) => e.stat === 'defPct' && e.value === 5 && e.targetSlug === slug,
  );
const ALL_SENTINELS = Object.fromEntries(
  COMP_SLUGS.map((s) => [s, withShieldSentinel(s)])
);

// ---- hoisted runs (each runComp is a full 180s sim) ----
const base = run();
const BASE_TOTALS = totals(base.res as never);

const fbStarts = ev(base.events, 'fullBurstStart').map((e) => e.frame as number);
// adaptation 3 (interface): burstCast/reload events key on slug
const ariaBurstCasts = ev(base.events, 'burstCast')
  .filter((e) => e.slug === SLUG)
  .map((e) => e.frame as number);
const ariaReloads = ev(base.events, 'reload').filter((e) => e.slug === SLUG);
const shieldProbe = run(ALL_SENTINELS);

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
    for (const a of applies) expect(a.value).toBeCloseTo(26.99, 6);
  });

  it('SCOPE: the stat is generic Critical Damage — no crit-RATE and no normal-scoped variant carries the 26.99 value', () => {
    const misScoped = ev(base.events, 'buffApply').filter(
      (e) =>
        e.casterIdx === ARIA &&
        e.stat !== 'critDamagePct' &&
        Math.abs(((e.value as number) ?? 0) - 26.99) < 1e-6,
    );
    expect(misScoped).toHaveLength(0);
  });

  it('DURATION: 10s wall-clock — expiresFrame is ~600 frames after apply (not rounds, no durationShots)', () => {
    for (const a of applies) {
      expect(a.durationShots ?? null).toBeNull();
      expect((a.expiresFrame as number) - (a.frame as number)).toBe(600);
    }
  });

  it('TARGET SET: every comp member receives it (all allies incl. self), one apply each per activation', () => {
    const perActivation = new Map<number, Set<string>>();
    for (const a of applies) {
      const f = a.frame as number;
      if (!perActivation.has(f)) perActivation.set(f, new Set());
      perActivation.get(f)!.add(a.targetSlug as string);
    }
    expect(perActivation.size).toBeGreaterThan(0);
    for (const [, tset] of perActivation) {
      expect([...tset].sort()).toEqual([...COMP_SLUGS].sort());
    }
  });

  it('TRIGGER IDENTITY: applies land on full-burst START frames, not on aria\u2019s burst-cast frames', () => {
    const applyFrames = [...new Set(applies.map((a) => a.frame as number))];
    for (const f of applyFrames) expect(fbStarts).toContain(f);
    // nearest-wrong #1: burstCast keying would put applies on cast frames. A burst cast
    // resolves BEFORE the FB window opens, so the two frame sets must be disjoint.
    for (const f of applyFrames) expect(ariaBurstCasts).not.toContain(f);
  });

  it('TRIGGER IDENTITY discriminator: re-keying S1 to burstCast changes the activation count/frames (RED under the nearest-wrong model)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks ?? ov.skill1!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.stat === 'critDamagePct'))
          blk.trigger = { kind: 'burstCast' };
      }
    });
    const alt = run({ [SLUG]: patched });
    const altApplies = appliesBy(alt.events, ARIA, 'critDamagePct');
    const baseFrames = [...new Set(applies.map((a) => a.frame))].join(',');
    const altFrames = [...new Set(altApplies.map((a) => a.frame))].join(',');
    expect(altFrames).not.toBe(baseFrames);
  });

  it('TARGET SET discriminator: a self-only S1 lowers TEAMMATE damage (proves the ally scope is load-bearing)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!.blocks ?? ov.skill1!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.stat === 'critDamagePct'))
          blk.target = { kind: 'self' };
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
    for (const a of applies) expect(a.value).toBeCloseTo(7.03, 6);
  });

  it('SCOPE: unscoped Critical Rate — the normal-attack-scoped variant is NOT used', () => {
    expect(appliesBy(base.events, ARIA, 'critRateNormalPct')).toHaveLength(0);
  });

  it('DURATION: 5s wall-clock — 300 frames, no round-count expiry', () => {
    for (const a of applies) {
      expect(a.durationShots ?? null).toBeNull();
      expect((a.expiresFrame as number) - (a.frame as number)).toBe(300);
    }
  });

  it('TARGET SET: all allies receive it', () => {
    const first = applies[0].frame as number;
    const tset = new Set(
      applies.filter((a) => a.frame === first).map((a) => a.targetSlug as string),
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
        if (effs.some((e) => e.stat === 'critRatePct'))
          blk.trigger = { kind: 'shotFired' };
      }
    });
    const alt = run({ [SLUG]: patched });
    const altActivations = new Set(
      appliesBy(alt.events, ARIA, 'critRatePct').map((a) => a.frame),
    ).size;
    const baseActivations = new Set(applies.map((a) => a.frame)).size;
    expect(altActivations).toBeGreaterThan(baseActivations * 3);
  });

  it('NON-VACUITY: the buff is genuinely intermittent \u2014 5s windows do not blanket the 180s fight', () => {
    const covered = new Set(applies.map((a) => a.frame as number)).size * 300;
    expect(covered).toBeLessThan(180 * 60);
  });
});

describe('aria burst — Shield 37.86% of caster final Max HP / 10s / all allies (adaptation 3: shielded-consumer sentinels)', () => {
  const sentinels = COMP_SLUGS.flatMap((s) =>
    sentinelOf(shieldProbe.events, s)
  );

  it('TANDEM: a shield reaches every ally on aria\u2019s burst (never skipped as \u201cdefensive\u201d \u2014 it fires teammates\u2019 shielded triggers)', () => {
    // The engine emits no shield SimEvent; each comp member carries a patched shielded-trigger
    // sentinel (self defPct 5, inert in v1), so one sentinel firing per ally per cast IS the
    // shield reaching that ally.
    expect(sentinels.length).toBeGreaterThan(0);
    expect(sentinels.length).toBe(
      ariaBurstCasts.length * COMP_SLUGS.length
    );
    const first = sentinels[0].frame as number;
    const tset = new Set(
      sentinels
        .filter((s) => s.frame === first)
        .map((s) => s.targetSlug as string),
    );
    expect([...tset].sort()).toEqual([...COMP_SLUGS].sort());
  });

  it('TRIGGER IDENTITY: shields are emitted on aria\u2019s own burst-cast frames, once per cast', () => {
    const frames = [...new Set(sentinels.map((s) => s.frame as number))];
    for (const f of frames) expect(ariaBurstCasts).toContain(f);
    expect(frames.length).toBe(ariaBurstCasts.length);
  });

  it('MAGNITUDE + DURATION: 37.86% of the CASTER\u2019s Max HP for 10s (structural pin — the shield is event-only)', () => {
    const ov = loadOverride(SLUG)! as Record<string, unknown>;
    const block = ((ov.burst as unknown[]) ?? []).find((b) =>
      ((b as Record<string, unknown>).effects as Record<string, unknown>[]).some(
        (e) => e.kind === 'shield',
      ),
    ) as Record<string, unknown> | undefined;
    expect(block, 'no burst shield block in the shipped override').toBeDefined();
    expect((block!.trigger as Record<string, unknown>).kind).toBe('burstCast');
    expect((block!.target as Record<string, unknown>).kind).toBe('allies');
    const eff = (block!.effects as Record<string, unknown>[]).find(
      (e) => e.kind === 'shield',
    )!;
    expect(eff.maxHpPct as number).toBeCloseTo(37.86, 6);
    expect(eff.durationSec as number).toBeCloseTo(10, 6);
  });

  it('TARGET SET discriminator: a self-only shield stops reaching teammates', () => {
    // NOTE: the self-only patch and aria's own sentinel must land in ONE override clone —
    // separate keys collide (the sentinel map would overwrite the patch).
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!.blocks ?? ov.burst!) {
        const blk = b as Record<string, unknown>;
        const effs = (blk.effects ?? []) as Record<string, unknown>[];
        if (effs.some((e) => e.kind === 'shield')) blk.target = { kind: 'self' };
      }
      ov.skill1 = [
        ...ov.skill1,
        {
          slot: 'skill1',
          trigger: { kind: 'shielded' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'defPct', value: 5 }],
        },
      ];
    });
    const mates = COMP_SLUGS.filter((s) => s !== SLUG);
    const alt = run({
      ...Object.fromEntries(mates.map((s) => [s, ALL_SENTINELS[s]])),
      [SLUG]: patched,
    });
    const altTargets = [
      ...new Set(
        COMP_SLUGS.flatMap((s) => sentinelOf(alt.events, s)).map(
          (e) => e.targetSlug as string,
        ),
      ),
    ];
    expect(altTargets).toEqual([SLUG]);
  });
});

describe('aria burst — Hit Rate 30.37% / 15s / SELF ONLY', () => {
  const applies = appliesBy(base.events, ARIA, 'hitRatePct');

  it('emits hitRatePct at the kit magnitude', () => {
    expect(applies.length).toBeGreaterThan(0);
    for (const a of applies) expect(a.value).toBeCloseTo(30.37, 6);
  });

  it('TARGET SET: SELF ONLY \u2014 no teammate ever receives it (the line above it is allies; this one is not)', () => {
    const tset = new Set(applies.map((a) => a.targetSlug as string));
    expect([...tset]).toEqual([SLUG]);
  });

  it('DURATION: 15s (900 frames) \u2014 distinct from the shield\u2019s 10s, proving the two burst lines are not collapsed', () => {
    for (const a of applies) {
      expect(a.durationShots ?? null).toBeNull();
      expect((a.expiresFrame as number) - (a.frame as number)).toBe(900);
    }
  });

  it('TRIGGER IDENTITY: keyed to aria\u2019s own burst cast, once per cast (not fullBurstEnter, which fires on any team FB)', () => {
    const frames = [...new Set(applies.map((a) => a.frame as number))];
    expect(frames.length).toBe(ariaBurstCasts.length);
    for (const f of frames) expect(ariaBurstCasts).toContain(f);
  });

  it('DISCRIMINATOR (adaptation 4 — flipped to INERTNESS): the HR→core channel has no MG coverage, so removing the buff changes NO unit\u2019s total', () => {
    // Blind original: expected aria's own damage to move. The engine's Hit-Rate→core models
    // (PELLET_GAUSS / CONE_DELTA / UNIGEO / hrCoreMult) are AR/SMG/SG accuracy-circle models;
    // MG has no circle row (sim.ts: hrCoreExp → 0; all three live models explicitly fall
    // through for MG/SR/RL). The faithful buff applies but moves zero damage — the channel
    // claim is expressed as the totals-equality inertness pin instead.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!.blocks ?? ov.burst!) {
        const blk = b as Record<string, unknown>;
        blk.effects = ((blk.effects ?? []) as Record<string, unknown>[]).filter(
          (e) => e.stat !== 'hitRatePct',
        );
      }
    });
    const alt = totals(run({ [SLUG]: patched }).res as never);
    for (const s of COMP_SLUGS) {
      expect(alt[s]).toBeCloseTo(BASE_TOTALS[s], 6);
    }
  });
});

describe('aria — inertness / no-invention assertions', () => {
  it('aria has NO damage rider: no flatDamage/dot-flavored damage originates from her outside her weapon buckets', () => {
    const buckets = new Set(
      ev(base.events, 'damage')
        .filter((d) => (d.srcSlot === 'skill1' || d.srcSlot === 'skill2') && d.slug === SLUG)
        .map((d) => d.bucket as string),
    );
    expect([...buckets]).toEqual([]);
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
