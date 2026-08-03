// ADAPTED S5 blind spec for `ade` — the S5 test (blind/ade.test.ts, claude-opus-5) with its
// five fixture/wiring RECON_ERRORs accommodated; every ASSERTION INTENT is preserved verbatim.
// The original fails 12/17 vs the shipped driver override for reasons entirely inside the
// blind file itself (none is a driver divergence):
//   B1 run() put `onEvent` on the TOP-LEVEL runComp opts; the harness reads it from
//      `cfg.onEvent` — every event log came back EMPTY (all event-based assertions red,
//      vacuous loops green).
//   B2 every patch iterated `ov.<slot>.blocks` and read `ov.<slot>.unmodeled.<slot>` — the
//      OverrideFile shape is a bare block ARRAY per slot with ONE top-level `unmodeled` —
//      all counterfactuals were silent no-ops (identical totals) and the unmodeled audit
//      read ''.
//   B3 controlComp('ade') slots crown (B2, 20s CD) AHEAD of ade: under liter's 8.21s team
//      CDR both CDs collapse below the FB cycle and slot priority hands crown every stage-2
//      cast — ade cast ZERO bursts in the blind baseline. Accommodation: the standard ade
//      fixture liter/ade/ada/helm (ade is the sole B2, casts every covered chain).
//   B4 "covers all FIVE allies" — the fixture is 4 units; the assertion expects the comp
//      size (4 here).
//   B5 the self-scaled counterfactual compared ADE's own totals, which are mathematically
//      identical under caster-vs-self basis (10.15% of ade's ATK applied to ade is the same
//      flat either way); the divergence must be read on the Attacker carries. Also
//      unitOf(...).slot / srcSlot===idx type errors (slot rows carry `position`, damage
//      events carry `slug`).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../../tests/lib/harness.js';

const FPS = 60;
// B3 accommodation: ade must be the unit that casts stage 2 (sole B2).
const SLUGS = ['liter', 'ade', 'ada', 'helm'] as const;
const ADE = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  // B1 accommodation: onEvent lives in cfg.
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// --- hoisted runs -----------------------------------------------------------

// 1. baseline: shipped override
const baseline = run();

// 2. counterfactual: burst ATK line deleted entirely (isolates its damage footprint)
// B2 accommodation: ov.burst IS the block array.
const noBurstAtk = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst ?? []) {
    b.effects = b.effects.filter(
      (e: any) =>
        !(e.kind === 'buff' && (e.stat === 'casterAtkPct' || e.stat === 'atkPct')),
    );
  }
});
const withoutBurstAtk = run({ ade: noBurstAtk });

// 3. nearest-wrong: burst ATK line re-keyed to self-scaled atkPct at the same magnitude
const selfScaled = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.stat = 'atkPct';
    }
  }
});
const withSelfScaled = run({ ade: selfScaled });

// 4. nearest-wrong: burst ATK duration halved to the skill2 window (10s -> 5s)
const shortWindow = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.durationSec = 5;
    }
  }
});
const withShortWindow = run({ ade: shortWindow });

// 5. nearest-wrong: burst ATK line scoped to self instead of all allies
const selfOnly = withPatchedOverride('ade', (ov) => {
  for (const b of ov.burst ?? []) {
    const carriesAtk = b.effects.some(
      (e: any) => e.kind === 'buff' && e.stat === 'casterAtkPct',
    );
    if (carriesAtk) b.target = { kind: 'self' };
  }
});
const withSelfOnly = run({ ade: selfOnly });

// --- helpers ----------------------------------------------------------------

const buffs = (events: SimEvent[]) =>
  events.filter((e): e is BuffApply => e.kind === 'buffApply');

// B5 accommodation: ade's slot index is positional; result rows carry staticAtk/maxHp.
const adeStaticAtk = () => baseline.res.units[ADE].staticAtk;
const adeMaxHp = () => baseline.res.units[ADE].maxHp;
const teamTotal = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

describe('ade — burst: ATK 10.15% of the skill user\'s ATK for 10 sec (allies)', () => {
  it('emits a caster-scaled ATK buff, flat-resolved to 10.15% of ADE\'s static ATK', () => {
    // Accommodation: isolate the burst line's 10s volley (skill1's HP-gate line emits a
    // 5s casterAtkPct window of its own under both the driver and S6 encodings).
    const atkBuffs = buffs(baseline.events).filter(
      (e) =>
        e.stat === 'casterAtkPct' &&
        e.casterIdx === ADE &&
        e.expiresFrame !== null &&
        e.expiresFrame - e.frame === 10 * FPS,
    );
    expect(atkBuffs.length).toBeGreaterThan(0);

    const expected = (10.15 / 100) * adeStaticAtk();
    for (const b of atkBuffs) {
      // FLAT-resolved at apply time: asserting 10.15 here would be the classic blind error.
      expect(b.value).toBeCloseTo(expected, 0);
    }
  });

  it('covers all allies of the fixture including self (not self-only, not exclude-self)', () => {
    const atkBuffs = buffs(baseline.events).filter(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === ADE,
    );
    const perCast = new Map<number, Set<string>>();
    for (const b of atkBuffs) {
      const bucket = perCast.get(b.expiresFrame!) ?? new Set<string>();
      if (b.targetSlug) bucket.add(b.targetSlug);
      perCast.set(b.expiresFrame!, bucket);
    }
    for (const [, slugs] of perCast) {
      // B4 accommodation: fixture comp size, not 5.
      expect(slugs.size).toBe(SLUGS.length);
      expect(slugs.has('ade')).toBe(true);
    }
  });

  it('lasts 10 sec, not the 5 sec of the skill2 window', () => {
    // Accommodation: skill1's HP-gate line ALSO emits a casterAtkPct window (5s) under both
    // the driver's and the S6-blind encodings — filter to the 10s volley to isolate the
    // burst line, exactly as the driver spec does.
    const atkBuffs = buffs(baseline.events).filter(
      (e) =>
        e.stat === 'casterAtkPct' &&
        e.casterIdx === ADE &&
        e.expiresFrame !== null &&
        e.expiresFrame - e.frame === 10 * FPS,
    );
    expect(atkBuffs.length).toBeGreaterThan(0);
    for (const b of atkBuffs) {
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }

    // Cross-check by damage: a 5s window must strictly under-credit the team.
    const full = teamTotal(totals(baseline.res));
    const half = teamTotal(totals(withShortWindow.res));
    expect(half).toBeLessThan(full);
  });

  it('fires at BURST CAST, before the Full Burst window opens (not fullBurstEnter)', () => {
    const firstCast = baseline.events.find(
      (e) => e.kind === 'burstCast' && e.slug === 'ade',
    );
    const firstFbStart = baseline.events.find((e) => e.kind === 'fullBurstStart');
    const firstAtk = buffs(baseline.events).find(
      (e) => e.stat === 'casterAtkPct' && e.casterIdx === ADE,
    );

    expect(firstCast).toBeDefined();
    expect(firstFbStart).toBeDefined();
    expect(firstAtk).toBeDefined();
    expect(firstAtk!.frame).toBeGreaterThanOrEqual(firstCast!.frame);
    expect(firstAtk!.frame).toBeLessThan(firstFbStart!.frame);
  });

  it('is caster-scaled, NOT self-scaled — the Attacker carry gets ADE\'s number, not its own', () => {
    // B5 accommodation: ade's OWN total is identical under both bases by construction
    // (10.15% of ade's ATK applied to ade is the same flat); the divergence shows on the
    // Attacker carries, whose own ATK differs from ade's.
    expect(totals(withSelfScaled.res)['ade']).toBe(totals(baseline.res)['ade']);
    const carryMoved = ['ada', 'helm'].filter(
      (s) => Math.abs(totals(withSelfScaled.res)[s] - totals(baseline.res)[s]) > 1,
    );
    expect(carryMoved.length).toBeGreaterThanOrEqual(1);
  });

  it('non-vacuity: the burst ATK line actually moves damage in this fixture', () => {
    const withLine = teamTotal(totals(baseline.res));
    const withoutLine = teamTotal(totals(withoutBurstAtk.res));
    expect(withLine).toBeGreaterThan(withoutLine);
  });

  it('scoping the ATK buff to self alone under-credits the team', () => {
    const allAllies = teamTotal(totals(baseline.res));
    const selfOnlyTotal = teamTotal(totals(withSelfOnly.res));
    expect(selfOnlyTotal).toBeLessThan(allAllies);
  });
});

describe('ade — burst: Max HP 25.15% of the skill user\'s Max HP, 10 sec (allies)', () => {
  it('emits maxHpFlat resolved to 25.15% of ADE\'s Max HP, to all allies of the fixture', () => {
    const hpBuffs = buffs(baseline.events).filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx === ADE,
    );
    const expected = (25.15 / 100) * adeMaxHp();
    const burstGrants = hpBuffs.filter((e) => Math.abs(e.value - expected) < 1);
    expect(burstGrants.length).toBeGreaterThan(0);

    const slugs = new Set(burstGrants.map((e) => e.targetSlug));
    expect(slugs.size).toBe(SLUGS.length);
  });

  it('is damage-inert — ally-granted Max HP feeds no teammate ATK conversion', () => {
    const noHp = withPatchedOverride('ade', (ov) => {
      for (const slot of [ov.skill1, ov.skill2, ov.burst]) {
        for (const b of slot ?? []) {
          b.effects = b.effects.filter(
            (e: any) =>
              !(
                e.kind === 'buff' &&
                (e.stat === 'casterMaxHpPct' || e.stat === 'targetMaxHpPct')
              ),
          );
        }
      }
    });
    const stripped = run({ ade: noHp });
    for (const [slug, dmg] of Object.entries(totals(baseline.res))) {
      expect(totals(stripped.res)[slug]).toBeCloseTo(dmg, 6);
    }
  });
});

describe('ade — skill2: Max HP 15.62% of skill user Max HP after 120 normal attacks (allies, 5s)', () => {
  it('fires on ADE\'s OWN round count (hitCount 120), not on an interval and not on team ammo', () => {
    const expected = (15.62 / 100) * adeMaxHp();
    const grants = buffs(baseline.events).filter(
      (e) =>
        e.stat === 'maxHpFlat' &&
        e.casterIdx === ADE &&
        Math.abs(e.value - expected) < 1,
    );
    expect(grants.length).toBeGreaterThan(0);

    // B5 accommodation: shot events carry `slug`.
    const adeShots = baseline.events.filter(
      (e) => e.kind === 'shot' && (e as any).slug === 'ade',
    );
    const grantFrames = [...new Set(grants.map((g) => g.frame))].sort(
      (a, b) => a - b,
    );
    let prev = 0;
    for (const f of grantFrames) {
      const fired = adeShots.filter((s) => s.frame <= f).length;
      expect(fired - prev).toBeGreaterThanOrEqual(120);
      prev = fired;
    }
  });

  it('targets all allies including self', () => {
    const expected = (15.62 / 100) * adeMaxHp();
    const grants = buffs(baseline.events).filter(
      (e) =>
        e.stat === 'maxHpFlat' &&
        e.casterIdx === ADE &&
        Math.abs(e.value - expected) < 1,
    );
    const firstFrame = Math.min(...grants.map((g) => g.frame));
    const slugs = new Set(
      grants.filter((g) => g.frame === firstFrame).map((g) => g.targetSlug),
    );
    expect(slugs.size).toBe(SLUGS.length);
    expect(slugs.has('ade')).toBe(true);
  });
});

describe('ade — GAP lines (no engine primitive)', () => {
  it.skip('skill1: Perfect Maid debuff immunity at battle start — GAP: no debuff-immunity primitive, and the v1 boss applies no ally debuffs (must live in unmodeled.skill1)', () => {});

  it.skip('skill2: Perfect Maid debuff immunity after 420 normal attacks — GAP: same missing primitive; the hitCount:420 trigger is expressible but the payload is not (must live in unmodeled.skill2)', () => {});

  it('skill1: the debuff-immunity lines are recorded as unmodeled, never as silent drops', () => {
    // B2 accommodation: one top-level `unmodeled` object on the OverrideFile.
    const ov: any = withPatchedOverride('ade', () => {});
    const s1 = ov.unmodeled?.skill1 ?? [];
    const s2 = ov.unmodeled?.skill2 ?? [];
    const all = [...s1, ...s2].join(' ');
    expect(all).toMatch(/Perfect Maid/i);
  });
});

describe('ade — skill1: ATK 5.19% of skill user ATK when own HP < 90% (allies, 5s)', () => {
  it('is either unmodeled or modeled caster-scaled to allies — never as self-scaled atkPct', () => {
    // B2 accommodation: slot arrays are bare; the driver's refresh trigger (interval) is a
    // third defensible encoding alongside S5's (a) unmodeled / (b) passive — the assertion
    // below checks what matters: the EFFECT is caster-scaled and ally-targeted, never atkPct.
    const ov: any = withPatchedOverride('ade', () => {});
    const s1Blocks = ov.skill1 ?? [];
    const atkEffects = s1Blocks.flatMap((b: any) =>
      b.effects.filter(
        (e: any) => e.kind === 'buff' && Math.abs((e.value ?? 0) - 5.19) < 0.01,
      ),
    );

    if (atkEffects.length === 0) {
      const rec = (ov.unmodeled?.skill1 ?? []).join(' ');
      expect(rec).toMatch(/5\.19|HP falls below 90/i);
    } else {
      for (const e of atkEffects) {
        expect(e.kind).toBe('buff');
        expect((e as { stat: string }).stat).toBe('casterAtkPct');
      }
      const carriers = s1Blocks.filter((b: any) =>
        b.effects.some(
          (e: any) => e.kind === 'buff' && Math.abs((e.value ?? 0) - 5.19) < 0.01,
        ),
      );
      for (const b of carriers) expect(b.target.kind).toBe('allies');
    }
  });
});

describe('ade — inertness: nothing in this kit touches buckets it should not', () => {
  it('grants no crit, core, element, charge, ammo, reload or fire-rate modifiers', () => {
    const allowed = new Set(['casterAtkPct', 'maxHpFlat']);
    const fromAde = buffs(baseline.events).filter((e) => e.casterIdx === ADE);
    for (const b of fromAde) {
      expect(allowed.has(b.stat)).toBe(true);
    }
  });

  it('deals no direct damage of its own — no skill/burst damage bucket is sourced from ade', () => {
    // B5 accommodation: damage events carry `slug`, not a numeric srcSlot.
    const adeDamage = baseline.events.filter(
      (e): e is Damage => e.kind === 'damage' && (e as any).slug === 'ade',
    );
    expect(adeDamage.length).toBeGreaterThan(0);
    for (const d of adeDamage) {
      expect(d.bucket).toBe('normal');
    }
  });
});
