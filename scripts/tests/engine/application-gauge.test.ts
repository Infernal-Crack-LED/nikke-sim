// Non-damage enemy-debuff APPLICATION burst-gauge credit — owner rulings 2026-08-16
// (docs/DECISIONS.md "Owner rulings: non-damage enemy-debuff APPLICATIONS generate burst gauge,
// and so do their RE-APPLICATIONS/refreshes"; docs/data/burst-gauge.md §5).
//
// THE RULE (sim.ts `applicationGauge` + `isGeneratingApplication`): a skill application that is
//   - enemy-targeted,
//   - PURE non-damage (buff/targetStatus effects only),
//   - not a per-shot on-bullet rider (shotFired/chargeCounter are the anti-double-count
//     exclusions; everything else GENERATES BY DEFAULT — owner scope ruling 2026-08-16),
//   - opening a DISCRETE window (some finite durationSec < 900),
//   - and whose caster is not a known non-generator (noah, snow-white-heavy-arms)
// credits the caster's datamined per-trigger weapon gauge value ONCE per application event —
// re-applications/refreshes included (community-expert testimony relayed and ruled trusted by
// the owner; jackal S1's standalone application is owner-confirmed).
//
// METHOD: paired runs. `UnitResult.gaugeGenerated` is UNCAPPED (pre-clamp), so with
// `disableBursts` the with-kit vs without-kit delta is exactly the application credits — the
// tested effects (damageTakenPct/defPct debuffs, heals) never change the caster's fire cadence,
// which is what licenses the subtraction. Magnitude labels come from data/gauge-per-shot.json
// (an independent datamined artifact), never re-derived from engine constants.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { OverrideFile } from '../../../src/skills/index.js';
import { bareWeaponOverride, runComp, unitOf } from '../lib/harness.js';

const gaugeTable = JSON.parse(
  readFileSync(
    new URL('../../../data/gauge-per-shot.json', import.meta.url),
    'utf8'
  )
) as Record<string, { targetPerTrigger?: number }>;

/** The engine's credit for one application: the unit's datamined per-trigger value, undivided. */
const perApplication = (slug: string): number => {
  const t = gaugeTable[slug]?.targetPerTrigger;
  if (t == null) {
    throw new Error(
      `${slug} has no datamined gauge row — pick a datamined test unit`
    );
  }
  return t / 100;
};

const OTHER = 'crown';

/** blanc (SG, datamined row) with her kit replaced by a single synthetic skill1 block. */
function syntheticKit(slug: string, block: object | null): OverrideFile {
  const ov = bareWeaponOverride(slug);
  return { ...ov, skill1: block ? [block] : [] } as OverrideFile;
}

function gaugeOf(
  slug: string,
  override: OverrideFile | 'real-kit',
  durationSec: number,
  cfgExtra: object = {}
): number {
  const res = runComp({
    slugs: [slug, OTHER],
    bossElement: 'Iron',
    focusSlug: slug,
    overrides: {
      // runComp loads the unit's real committed override when none is passed
      ...(override === 'real-kit' ? {} : { [slug]: override }),
      [OTHER]: bareWeaponOverride(OTHER),
    },
    cfg: { disableBursts: true, durationSec, ...cfgExtra },
  });
  return unitOf(res, slug).gaugeGenerated;
}

const CARRY = 'blanc';

const intervalDebuff = (extras: object = {}, effects?: object[]) => ({
  slot: 'skill1',
  trigger: { kind: 'interval', sec: 5 },
  target: { kind: 'enemy' },
  effects: effects ?? [
    { kind: 'buff', stat: 'damageTakenPct', value: 5, durationSec: 10 },
  ],
  ...extras,
});

describe('non-damage enemy-debuff application gauge credit', () => {
  it('credits the per-trigger value once per interval application — refreshes included', () => {
    // 12s run, interval 5s → applications at t=5 and t=10. The t=10 firing lands while the
    // t=5 window (10s duration) is still ACTIVE — it IS the refresh case the owner confirmed,
    // and it credits the same as the fresh application.
    const withKit = gaugeOf(CARRY, syntheticKit(CARRY, intervalDebuff()), 12);
    const bare = gaugeOf(CARRY, syntheticKit(CARRY, null), 12);
    expect(withKit - bare).toBeCloseTo(2 * perApplication(CARRY), 6);
  });

  it('emma-tactical-upgrade: battle-start + every-30s Environment Setup each credit her per-trigger 0.1', () => {
    // Her real kit: S1's leading passive@0 application plus the interval:30 re-application →
    // 2 credits in 40s (t=0, t=30). Her other blocks are ally-targeted heals and continuous
    // self/ally passives — none qualify, and none change her MG cadence, so the paired delta
    // is exactly the two credits.
    const slug = 'emma-tactical-upgrade';
    const withKit = gaugeOf(slug, 'real-kit', 40);
    const bare = gaugeOf(slug, bareWeaponOverride(slug), 40);
    expect(withKit - bare).toBeCloseTo(2 * perApplication(slug), 6);
  });

  it('jackal S1 (attacked-trigger) credits once per application, scaling with activations', () => {
    // The v1 sim has no incoming-damage model, so in production runs this trigger is inert;
    // the manualAttacks hook exercises it. jackal S1 activates per 10 incoming attacks.
    // Magnitude is deliberately UNPINNED here: jackal has no data/gauge-per-shot.json row, so
    // her credit is the class-modal fallback — only sign and per-application proportionality
    // are asserted; the absolute per-trigger pins live in the blanc/emma-tactical-upgrade
    // tests, whose rows are datamined.
    const slug = 'jackal';
    const attacks = (n: number) =>
      Array.from({ length: n }, (_, i) => 60 * (i + 1));
    const run = (n: number) =>
      gaugeOf(slug, 'real-kit', 30, { manualAttacks: [attacks(n), []] });
    const zero = run(0);
    const one = run(10);
    const two = run(20);
    expect(one - zero).toBeGreaterThan(0);
    expect(two - zero).toBeCloseTo(2 * (one - zero), 6);
  });

  it('per-shot on-bullet riders do NOT credit (anti-double-count, Noise-shape)', () => {
    // A shotFired-triggered debuff is carried by every shot; the shot already generated its
    // own gauge and the rider adds nothing (note.com/_trick_, Noise's charged-shot taunt).
    const block = {
      slot: 'skill1',
      trigger: { kind: 'shotFired' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 5, durationSec: 5 },
      ],
    };
    const withKit = gaugeOf(CARRY, syntheticKit(CARRY, block), 12);
    const bare = gaugeOf(CARRY, syntheticKit(CARRY, null), 12);
    expect(withKit - bare).toBeCloseTo(0, 9);
  });

  it('bullet-COINCIDENT skill activations DO credit (default-generate scope)', () => {
    // eunhwa-shape lastBullet defPct debuff: a discrete once-per-magazine skill activation,
    // not a per-shot rider — under the owner's default-generate scope ruling it credits the
    // full per-trigger value once per application (a whole-number multiple over the run).
    const block = {
      slot: 'skill1',
      trigger: { kind: 'lastBullet' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'defPct', value: -29, durationSec: 5 }],
    };
    const withKit = gaugeOf(CARRY, syntheticKit(CARRY, block), 20);
    const bare = gaugeOf(CARRY, syntheticKit(CARRY, null), 20);
    const delta = withKit - bare;
    const per = perApplication(CARRY);
    expect(delta).toBeGreaterThan(0);
    expect(delta / per).toBeCloseTo(Math.round(delta / per), 6);
  });

  it('permanent auras do NOT credit — no durationSec, and the 999 permanent sentinel', () => {
    const aura = {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 4.2 }],
    };
    const sentinel = {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'targetStatus', name: 'Sea Breeze', durationSec: 999 }],
    };
    const bare = gaugeOf(CARRY, syntheticKit(CARRY, null), 12);
    expect(gaugeOf(CARRY, syntheticKit(CARRY, aura), 12) - bare).toBeCloseTo(
      0,
      9
    );
    expect(
      gaugeOf(CARRY, syntheticKit(CARRY, sentinel), 12) - bare
    ).toBeCloseTo(0, 9);
  });

  it('a block that also deals damage is not double-credited', () => {
    // novel-shape interval block [flatDamage + debuff]: the damage impact already generates
    // through skillGauge at landing; the application credit must not stack on top.
    const damageOnly = intervalDebuff({}, [{ kind: 'flatDamage', atkPct: 50 }]);
    const damagePlusDebuff = intervalDebuff({}, [
      { kind: 'flatDamage', atkPct: 50 },
      { kind: 'buff', stat: 'defPct', value: -7, durationSec: 5 },
    ]);
    const a = gaugeOf(CARRY, syntheticKit(CARRY, damageOnly), 12);
    const b = gaugeOf(CARRY, syntheticKit(CARRY, damagePlusDebuff), 12);
    expect(b - a).toBeCloseTo(0, 9);
  });

  it('chain/FB-locked windows net zero: an inFb-gated interval debuff credits nothing', () => {
    // ether-shape production case: fbGate:'inFb' fails outside Full Burst (blockGatesPass runs
    // before the credit), and inside Full Burst addGauge's lock swallows it — so with bursts
    // ENABLED the paired delta must still be zero. Locks the credit against a future
    // reordering of the burst-cast sequence.
    const block = intervalDebuff({ fbGate: 'inFb' });
    const res = (ov: ReturnType<typeof syntheticKit>) =>
      runComp({
        slugs: [CARRY, OTHER],
        bossElement: 'Iron',
        focusSlug: CARRY,
        overrides: { [CARRY]: ov, [OTHER]: bareWeaponOverride(OTHER) },
        cfg: { durationSec: 60 },
      });
    const withKit = unitOf(
      res(syntheticKit(CARRY, block)),
      CARRY
    ).gaugeGenerated;
    const bare = unitOf(res(syntheticKit(CARRY, null)), CARRY).gaugeGenerated;
    expect(withKit - bare).toBeCloseTo(0, 9);
  });

  it('known non-generators (nikke-synergy counterexamples) never credit, even with a qualifying block', () => {
    const slug = 'snow-white-heavy-arms';
    const withBlock = gaugeOf(slug, syntheticKit(slug, intervalDebuff()), 12);
    const bare = gaugeOf(slug, syntheticKit(slug, null), 12);
    expect(withBlock - bare).toBeCloseTo(0, 9);
  });
});
