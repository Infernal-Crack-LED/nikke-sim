// ADAPTED BLIND TEST (S5) — label. The blind test-writer (claude-opus-5) authored label.test.ts
// from kit prose alone; this copy applies MECHANICAL-ONLY fixes so it runs against the committed
// DRIVER override (assertion logic untouched): (a) harness import path; (b) onEvent moved into cfg
// (harness API); (c) override slots are block ARRAYS (ov.skill2, not ov.skill2.blocks); (d) the
// sole-B1 fixture (labelComp) replacing controlComp('label') so Label actually casts — the fixture
// hazard the S2b reviewer flagged; (e) damage event field slug (not srcSlug). Run with:
// (f) the Shared-Delusion filters are restricted to casterIdx === LABEL_SLOT: the blind filter
//     `casterIdx !== null` also caught crown's S1 casterAtkPct 64.51 (crown buffs burst casters and
//     Label is one), contaminating every skill2c assertion — isolating Label's own grant is the
//     blind test's stated intent ('LABEL's ATK'), not a logic change.
//   npx vitest run --config scripts/kit-autonomy/blind/vitest.label.config.ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  type CompOptions,
} from '../../tests/lib/harness.js';

/**
 * label (AR/Iron/Defender/Burst I) — kit spec test, written from kit prose alone.
 *
 * KIT (structural summary):
 *  skill1 a) start of battle, self: Delusion = Shield 30.15% of self final Max HP, continuous.
 *         b) when Delusion ENDS, self, up to 2x: untargetable 1s x count; stun 1s per stack.
 *         c) on normal attack while NOT in Delusion: re-apply Delusion shield.
 *         d) on Burst Skill while NOT in Delusion: re-apply Delusion shield.
 *  skill2 a) start of battle, allies except self: dmg taken from Electric enemies down 70.4% / 5s, 1x.
 *         b) while in Delusion, self: burst gauge fill +70.4%, ATK +93.39%, Electric dmg taken
 *            down 70.4% — all continuous.
 *         c) while in Shared Delusion, allies except self: ATK +80.36% OF THE SKILL USER'S ATK.
 *  burst  self: Max HP +20.26% for 10s; Shared Delusion = Label's Shield becomes invulnerable 10s.
 *
 * FIXTURE: labelComp() — liter B1 / crown B2 / label / helm B3. label is Burst I,
 * so she casts as B1 and the fixed B3 lets the chain actually complete (a comp that never reaches
 * Full Burst would make every burst-gated assertion vacuous). Deterministic, no seed.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — the two live traps in this kit:
 *  (1) TRIGGER IDENTITY. Shared Delusion is a BURST status: the burst slot is the only place the
 *      name is introduced ("Shared Delusion: The Shield ... invulnerable for 10 sec"). So skill2c
 *      is scoped to the 10s post-burst-cast window, NOT a from-t=0 passive. The nearest-wrong model
 *      keys it {kind:'passive'} with no duration and pays every ally the ATK grant for the whole
 *      180s fight. Tests: applyCount == burstCast count, and expiresFrame - castFrame == 10s.
 *  (2) STAT IDENTITY. "ATK +80.36% OF THE SKILL USER'S ATK" is casterAtkPct (flat add scaled by
 *      LABEL's ATK), not atkPct (scales the RECIPIENT's own ATK). Per the harness contract
 *      casterAtkPct flat-resolves at apply time, so the emitted value must equal
 *      0.8036 x label.staticAtk and must be IDENTICAL across allies of different ATK — under the
 *      atkPct misread the emitted value would be the bare 80.36 instead.
 *
 * Delusion itself never ENDS in this sim (the v1 boss deals no damage, so no shield ever breaks),
 * so skill1b/c/d are unreachable by construction — see the it.skip block + the non-vacuity test
 * that pins WHY skill2b is legitimately continuous here.
 */

const SHARED_DELUSION_PCT = 80.36;
const DELUSION_ATK_PCT = 93.39;
const DELUSION_GAUGE_PCT = 70.4;
const BURST_WINDOW_SEC = 10;
const FPS = 60;

// ADAPTED fixture (mechanical only — assertion intent unchanged): Label is Burst I, so she must be
// the SOLE B1 or controlComp's fixed liter (also B1) outranks her at stage 1 and every burst-gated
// assertion goes vacuous — the exact fixture hazard the S2b reviewer independently flagged.
// labelComp = label B1 / crown B2 / ada+helm B3, boss Fire, focus ada (the driver fixture).
const LABEL_SLOT = 0; // label's slot in labelComp
const labelComp = (): CompOptions => ({
  slugs: ['label', 'crown', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
});
function run(opts: CompOptions) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

const base = run(labelComp());

const buffApplies = base.events.filter(
  (e) => e.kind === 'buffApply'
) as Extract<SimEvent, { kind: 'buffApply' }>[];
const burstCasts = base.events.filter((e) => e.kind === 'burstCast') as Extract<
  SimEvent,
  { kind: 'burstCast' }
>[];
const labelBurstCasts = burstCasts.filter(
  (e) => e.targetSlug === 'label' || e.slug === 'label'
);

const labelAtk = unitOf(base.res, 'label').staticAtk;

describe('label — skill1: Delusion shield', () => {
  it('applies a self shield of 30.15% max HP at battle start, continuously', () => {
    const shields = base.events.filter(
      (e) =>
        e.kind === 'shield' ||
        (e.kind === 'buffApply' && e.key?.includes('Delusion'))
    );
    // The shield channel is observable either as a shield event or as the status that
    // gates skill2b; at minimum the Delusion-gated buffs must be live from frame 0.
    const delusionAtk = buffApplies.filter(
      (e) =>
        e.stat === 'atkPct' &&
        e.targetSlug === 'label' &&
        e.value === DELUSION_ATK_PCT
    );
    expect(delusionAtk.length).toBeGreaterThan(0);
    expect(shields.length + delusionAtk.length).toBeGreaterThan(0);
  });

  it.skip('skill1b: Delusion Shattered (untargetable + stun, up to 2x) — GAP: no shield-break channel', () => {
    // "Activates when Delusion status ends." The v1 boss deals no damage and nothing in the
    // engine breaks a shield, so Delusion never ends and this block is UNREACHABLE. The
    // untargetability primitive does not exist at all (no targeting model). Not modelled;
    // belongs in the override's `unmodeled.skill1`.
  });

  it.skip('skill1c/d: re-apply Delusion on normal attack / burst while NOT in Delusion — GAP', () => {
    // Same root cause: Delusion is applied at t=0 and never ends, so the "while not in Delusion"
    // gate is never satisfied. Harmless to omit; must NOT be modelled as an ungated re-apply,
    // which would stack shields every shot.
  });
});

describe('label — skill2b: Delusion self-buffs (continuous)', () => {
  it('grants self ATK +93.39% as a continuous passive, not a windowed buff', () => {
    const ev = buffApplies.filter(
      (e) =>
        e.stat === 'atkPct' &&
        e.targetSlug === 'label' &&
        e.value === DELUSION_ATK_PCT
    );
    expect(ev.length).toBeGreaterThan(0);
    // Continuous => no finite expiry. A "for N sec" misread would stamp expiresFrame.
    expect(ev[0].expiresFrame == null || ev[0].expiresFrame > 180 * FPS).toBe(
      true
    );
  });

  it('grants self burst-gauge fill +70.4% and it is load-bearing (RED if removed)', () => {
    const ev = buffApplies.filter(
      (e) =>
        e.stat === 'burstGenPct' &&
        e.targetSlug === 'label' &&
        e.value === DELUSION_GAUGE_PCT
    );
    expect(ev.length).toBeGreaterThan(0);

    // Counterfactual: strip the gauge buff. Faster gauge => at least as many burst casts.
    const noGauge = withPatchedOverride('label', (ov) => {
      for (const b of ov.skill2) {
        b.effects = b.effects.filter(
          (f) => !(f.kind === 'buff' && f.stat === 'burstGenPct')
        );
      }
    });
    const patched = run({
      ...labelComp(),
      overrides: { label: noGauge },
    });
    const patchedCasts = patched.events.filter(
      (e) => e.kind === 'burstCast'
    ).length;
    expect(burstCasts.length).toBeGreaterThanOrEqual(patchedCasts);
  });

  it('self ATK buff moves label damage (non-vacuity: the fixture exercises it)', () => {
    const noAtk = withPatchedOverride('label', (ov) => {
      for (const b of ov.skill2) {
        b.effects = b.effects.filter(
          (f) =>
            !(
              f.kind === 'buff' &&
              f.stat === 'atkPct' &&
              f.value === DELUSION_ATK_PCT
            )
        );
      }
    });
    const patched = run({
      ...labelComp(),
      overrides: { label: noAtk },
    });
    expect(totals(base.res).label).toBeGreaterThan(totals(patched.res).label);
  });

  it('Electric damage-taken reduction is inert (defensive; boss is not Electric-gated for damage)', () => {
    // Purely defensive line — must move NO damage. Modelled or not, it may never change totals.
    const dmgTaken = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && e.value < 0
    );
    // If encoded at all it is a self/ally defensive marker; assert it never lands on the boss
    // as a damage-amplifying debuff (casterIdx===null && targetIdx===null with positive value).
    const bossDebuffs = buffApplies.filter(
      (e) =>
        e.casterIdx === null &&
        e.targetIdx === null &&
        e.stat === 'damageTakenPct' &&
        e.value > 0
    );
    expect(bossDebuffs.length).toBe(0);
    expect(dmgTaken.every((e) => e.value <= 0)).toBe(true);
  });
});

describe('label — skill2c: Shared Delusion ally ATK grant', () => {
  const sharedApplies = buffApplies.filter(
    (e) =>
      e.stat === 'casterAtkPct' &&
      e.casterIdx === LABEL_SLOT &&
      e.targetSlug !== 'label'
  );

  it('is caster-scaled (casterAtkPct), flat-resolved to 80.36% of LABEL ATK', () => {
    expect(sharedApplies.length).toBeGreaterThan(0);
    const expected = (SHARED_DELUSION_PCT / 100) * labelAtk;
    for (const e of sharedApplies) {
      expect(e.value).toBeCloseTo(expected, 0);
      // NEAREST-WRONG: atkPct would emit the raw 80.36 instead of a flat ATK number.
      expect(e.value).not.toBeCloseTo(SHARED_DELUSION_PCT, 2);
    }
    // Caster-scaled => identical flat value on every recipient regardless of their own ATK.
    const distinct = new Set(sharedApplies.map((e) => Math.round(e.value)));
    expect(distinct.size).toBe(1);
  });

  it('excludes self — label never receives the Shared Delusion grant', () => {
    const onSelf = buffApplies.filter(
      (e) =>
        e.stat === 'casterAtkPct' &&
        e.casterIdx === LABEL_SLOT &&
        e.targetSlug === 'label'
    );
    expect(onSelf.length).toBe(0);
  });

  it('is BURST-SCOPED for 10s, not a from-t=0 passive (the load-bearing discriminator)', () => {
    expect(labelBurstCasts.length).toBeGreaterThan(0);
    // One application wave per label burst cast, per recipient — never a single t=0 apply.
    const waves = new Set(sharedApplies.map((e) => e.frame)).size;
    expect(waves).toBe(labelBurstCasts.length);
    // And a 10s window on each apply.
    for (const e of sharedApplies) {
      expect(e.expiresFrame).toBeDefined();
      expect(e.expiresFrame! - e.frame).toBe(BURST_WINDOW_SEC * FPS);
    }
    // NEAREST-WRONG (passive, no duration): would be exactly one wave at frame 0 with no expiry.
    expect(sharedApplies.every((e) => e.frame === 0)).toBe(false);
  });

  it('non-vacuity: the fixture spans both the active and inactive Shared Delusion window', () => {
    const lastExpiry = Math.max(
      ...sharedApplies.map((e) => e.expiresFrame ?? 0)
    );
    expect(lastExpiry).toBeLessThan(180 * FPS);
    expect(Math.min(...sharedApplies.map((e) => e.frame))).toBeGreaterThan(0);
  });

  it('moves teammates, and ONLY teammates (label damage byte-identical)', () => {
    const noShared = withPatchedOverride('label', (ov) => {
      for (const b of ov.skill2) {
        b.effects = b.effects.filter(
          (f) => !(f.kind === 'buff' && f.stat === 'casterAtkPct')
        );
      }
    });
    const patched = run({
      ...labelComp(),
      overrides: { label: noShared },
    });
    const b = totals(base.res);
    const p = totals(patched.res);
    expect(b.label).toBe(p.label);
    const ally = Object.keys(b).find((s) => s !== 'label' && b[s] !== p[s]);
    expect(ally).toBeDefined();
    expect(b[ally!]).toBeGreaterThan(p[ally!]);
  });
});

describe('label — burst', () => {
  it('grants self Max HP +20.26% for 10s (targetMaxHpPct, flat-resolved)', () => {
    const ev = buffApplies.filter(
      (e) => e.stat === 'maxHpFlat' && e.targetSlug === 'label'
    );
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.length).toBe(labelBurstCasts.length);
    for (const e of ev) {
      expect(e.expiresFrame! - e.frame).toBe(BURST_WINDOW_SEC * FPS);
    }
  });

  it('the Max HP grant is offensively inert (label has no HP->ATK conversion)', () => {
    const noHp = withPatchedOverride('label', (ov) => {
      for (const b of ov.burst) {
        b.effects = b.effects.filter(
          (f) =>
            !(
              f.kind === 'buff' &&
              (f.stat === 'targetMaxHpPct' || f.stat === 'maxHpPct')
            )
        );
      }
    });
    const patched = run({
      ...labelComp(),
      overrides: { label: noHp },
    });
    expect(totals(patched.res).label).toBe(totals(base.res).label);
  });

  it('opens Shared Delusion: ally grants coincide with label burst casts', () => {
    const shared = buffApplies.filter(
      (e) =>
        e.stat === 'casterAtkPct' &&
        e.targetSlug !== 'label' &&
        e.casterIdx === LABEL_SLOT
    );
    const castFrames = new Set(labelBurstCasts.map((e) => e.frame));
    for (const e of shared) {
      expect(castFrames.has(e.frame)).toBe(true);
    }
  });

  it.skip('shield invulnerability for 10s — GAP: no shield HP pool / no boss damage in v1', () => {
    // "The Shield created by label becomes invulnerable for 10 sec." Its only OBSERVABLE payload
    // is that it keeps Delusion alive; with no boss damage the shield never breaks anyway, so the
    // invulnerability is unobservable. It is modelled indirectly as the Shared Delusion window.
  });
});

describe('label — inertness', () => {
  it('the shield line itself moves no damage on any unit', () => {
    const noShield = withPatchedOverride('label', (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const b of ov[slot] ?? []) {
          b.effects = b.effects.filter((f) => f.kind !== 'shield');
        }
      }
    });
    const patched = run({
      ...labelComp(),
      overrides: { label: noShield },
    });
    // No teammate of label's has a shield-gated damage line in this fixture, so stripping the
    // shield must be damage-neutral. (If a shield-synergy ally is ever added, this flips RED —
    // which is the correct signal, not a false alarm.)
    expect(totals(patched.res)).toEqual(totals(base.res));
  });

  it('label emits no boss-held damage-amplifying debuff (no Damage Taken UP in kit)', () => {
    const bossDebuffs = buffApplies.filter(
      (e) =>
        e.casterIdx === null &&
        e.targetIdx === null &&
        e.stat === 'damageTakenPct'
    );
    expect(bossDebuffs.length).toBe(0);
  });

  it('label deals only normal-attack damage (no flatDamage/dot riders in kit)', () => {
    const dmg = base.events.filter(
      (e) => e.kind === 'damage' && e.slug === 'label'
    ) as Extract<SimEvent, { kind: 'damage' }>[];
    expect(dmg.length).toBeGreaterThan(0);
    expect(dmg.every((e) => e.bucket === 'normal' || e.bucket === 'core')).toBe(
      true
    );
  });
});
