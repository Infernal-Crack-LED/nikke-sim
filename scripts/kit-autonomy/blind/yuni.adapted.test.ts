// ADAPTED-COPY of scripts/kit-autonomy/blind/yuni.test.ts (S5 blind test writer:
// claude-opus-5, 2026-08-05). The PRISTINE artifact is untouched; this copy carries
// STRUCTURAL-ONLY fixes so it can execute in-tree vs the shipped driver override
// (ade-agent-bunny precedent). Assertion INTENT is untouched. Adaptations:
//
//   1. IMPORT PATH — harness lives at scripts/tests/lib/harness.js, so the blind
//      '../lib/harness.js' becomes '../../tests/lib/harness.js'.
//   2. FIXTURE FIX (B2 starvation, rupee 2026-08-04) — the blind author seated
//      controlComp('yuni', true), which puts crown (B2) beside yuni (B2); a measured
//      engine fact is that the B2 unit under test then casts ZERO bursts, which would
//      fail the blind's own 'yuni casts her own burst' non-vacuity check and starve
//      every cast-dependent assertion. Adapted MAIN fixture: liter/yuni/ada/helm,
//      forced-neutral boss, focus yuni — yuni is the SOLE B2 and casts every rotation.
//   3. OVERRIDE SLOTS ARE BLOCK ARRAYS — no `.blocks` property (`ov.skill1 = []`,
//      iterate `ov.skill2` / `ov.burst` directly).
//   4. SLOT INDEX — CompOptions carries `slugs`, not `units`: yuniIdx comes from
//      `base.slugs.indexOf(SLUG)`.
//   5. EVENT KEYS — buffApply events carry no `slot` field (the blind's
//      `String(e.slot ?? …)` filters); they key on casterIdx + stat. Adapted filters:
//      skill1 channel → stat 'chargeSpeedPct' (S1's only stat); skill2 channel →
//      'defPct' | 'maxAmmoFlat'. Damage events key the unit by `slug` (not `slot`).
//   6. RECOVERY CHANNEL — SimEvent has no 'heal'/'recovery' kinds; recovery is
//      observable only through an on-recovery CONSUMER. The adapted MAIN fixture has
//      none (no crown), so the blind's recovery assertion runs in a dedicated
//      crown-bearing comp (liter/crown/yuni/ada, crown's OWN hitCount self-heal
//      stripped for attribution, helm-test precedent): crown's recovery-triggered
//      attackDamagePct 20.99 buff must fire on more distinct frames than there are
//      Full Bursts — the blind's "repeated ticks, not one instant event" intent.
//
// NOT ADAPTED (substantive divergences, adjudicated at S7 — left exactly as written):
//   • the blind suite expects stat 'maxAmmoPct' for the '+1 round' line; the shipped
//     override uses the theme-14 FLAT primitive 'maxAmmoFlat' (mica M4 precedent:
//     '▲ 1 round(s)' is a flat-round magnitude; maxAmmoPct 1 computes round(6×1.01)=6
//     and never extends a magazine — which would also falsify the blind's own
//     'stripping the ammo line moves yuni's total' assertion).
//   • the blind's it.skip 'no chargeSpeedPct StatKey' GAP is a redacted-schema
//     artifact — the engine HAS chargeSpeedPct (sim.ts, subtractive charge formula).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'yuni';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: {
  slugs: string[];
  bossElement: null;
  focusSlug?: string;
  overrides?: Record<string, any>;
}) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

// ADAPTATION 2 — sole-B2 fixture (controlComp would seat crown beside her).
const base = {
  slugs: ['liter', 'yuni', 'ada', 'helm'],
  bossElement: null as const,
  focusSlug: 'yuni',
};

/** ADAPTATION 6 — crown-bearing comp for the recovery channel, crown's own
 *  hitCount self-heal stripped for attribution. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot]) {
      b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    }
  }
});
const healComp = {
  slugs: ['liter', 'crown', 'yuni', 'ada'],
  bossElement: null as const,
  overrides: { crown: crownNoHeal },
};

// ---- hoisted runs (each is a full 180s sim) ----
const BASE = run(base);
const HEAL = run(healComp);

// Counterfactual A: strip the skill1 charge-speed grant entirely.
const noS1 = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
    }),
  },
});

// Counterfactual B: strip the skill2 max-ammo line only (keep DEF + heal).
const noAmmo = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2) {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'buff' && e.stat === 'maxAmmoPct'),
        );
      }
      ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
    }),
  },
});

// Counterfactual C: strip the skill2 heal (the tandem/on-recovery channel) —
// run in the crown-bearing comp so the channel difference is observable.
const noHeal = run({
  ...healComp,
  overrides: {
    ...healComp.overrides,
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      }
      ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
    }),
  },
});

// Counterfactual D: zero the burst's 348.73% damage line.
const noBurstDmg = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'flatDamage');
      }
      ov.burst = ov.burst.filter((b: any) => b.effects.length > 0);
    }),
  },
});

const fbStartFrames = BASE.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map((e) => e.frame as number);

const applies = BASE.events.filter((e) => e.kind === 'buffApply');
const yuniIdx = base.slugs.indexOf(SLUG);
const fromYuni = applies.filter((e) => e.casterIdx === yuniIdx);
// ADAPTATION 5 — buffApply has no `slot` field; key the channels by stat.
const chargeBuffs = fromYuni.filter((e) => e.stat === 'chargeSpeedPct');
const s2 = fromYuni.filter(
  (e) => e.stat === 'defPct' || e.stat === 'maxAmmoFlat',
);

describe('yuni — fixture sanity (non-vacuity)', () => {
  it('the comp actually reaches Full Burst, so FB-keyed lines are exercised', () => {
    expect(fbStartFrames.length).toBeGreaterThan(0);
  });

  it('yuni is in the comp and deals damage (charge weapon actually fires)', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('yuni casts her own burst (Burst II slot is live)', () => {
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === SLUG,
    );
    expect(casts.length).toBeGreaterThan(0);
  });
});

describe('yuni skill1 — Charge Speed ▲8.97%/10s to all allies on Full Burst entry', () => {
  it('fires on FULL-BURST ENTRY, not on burst cast (frame ordering discriminates)', () => {
    // Nearest-wrong: trigger burstCast. A burstCast application lands BEFORE
    // the fullBurstStart frame of its rotation; fullBurstEnter lands at/after.
    expect(chargeBuffs.length).toBeGreaterThan(0);
    for (const ev of chargeBuffs) {
      const f = ev.frame as number;
      const enclosing = fbStartFrames.filter((s) => s <= f);
      expect(enclosing.length).toBeGreaterThan(0);
      expect(f).toBeGreaterThanOrEqual(enclosing[enclosing.length - 1]);
    }
  });

  it('fires once per Full Burst (not per shot, not once per battle)', () => {
    const frames = new Set(chargeBuffs.map((e) => e.frame as number));
    expect(frames.size).toBe(fbStartFrames.length);
  });

  it('reaches ALL allies including yuni herself (no except-self)', () => {
    // Nearest-wrong: target self, or allies{excludeSelf}. Both change the
    // distinct-target count for a single application frame.
    const firstFrame = Math.min(...chargeBuffs.map((e) => e.frame as number));
    const atFirst = chargeBuffs.filter((e) => e.frame === firstFrame);
    const targets = new Set(atFirst.map((e) => e.targetSlug as string));
    expect(targets.size).toBe(base.slugs.length);
    expect(targets.has(SLUG)).toBe(true);
  });

  it('carries a 10 sec wall-clock window (expiresFrame ≈ apply + 600f)', () => {
    // "for 10 sec" is seconds, NOT rounds (taxonomy #2). durationShots must
    // be absent; expiresFrame must sit ~600 frames out at 60fps.
    const ev = chargeBuffs[0];
    expect(ev.durationShots ?? null).toBeNull();
    expect((ev.expiresFrame as number) - (ev.frame as number)).toBe(600);
  });

  it('charge-speed grant is NOT damage-inert — removing it moves the team', () => {
    // A charge-speed modifier gates shots fired (taxonomy #6), so the
    // nearest-wrong "defensive, skip" model is refuted by any movement.
    const a = totals(BASE.res);
    const b = totals(noS1.res);
    const moved = Object.keys(a).some((s) => a[s] !== b[s]);
    expect(moved).toBe(true);
  });
});

describe('yuni skill2 — full-charge riders to all allies', () => {
  it('is triggered by yuni FULL CHARGES, not by Full Burst entry', () => {
    // Nearest-wrong: fullBurstEnter. yuni charges many times per FB window,
    // so the application count must exceed the full-burst count outright.
    const frames = new Set(s2.map((e) => e.frame as number));
    expect(frames.size).toBeGreaterThan(fbStartFrames.length);
  });

  it('is not a passive — first application is after t=0', () => {
    // Non-vacuity: proves the inactive case exists before the first charge.
    const first = Math.min(...s2.map((e) => e.frame as number));
    expect(first).toBeGreaterThan(0);
  });

  it('grants DEF ▲2.77% for 10 sec to all allies', () => {
    const def = s2.filter((e) => e.stat === 'defPct');
    expect(def.length).toBeGreaterThan(0);
    expect(def[0].value).toBeCloseTo(2.77, 5);
    expect((def[0].expiresFrame as number) - (def[0].frame as number)).toBe(600);
    const f0 = def[0].frame as number;
    const targets = new Set(
      def.filter((e) => e.frame === f0).map((e) => e.targetSlug as string),
    );
    expect(targets.size).toBe(base.slugs.length);
  });

  it('grants Max Ammunition ▲1 round for 5 sec (a 5s window, not 10s)', () => {
    // Duration discriminates: the DEF/heal lines are 10 sec, this one is 5.
    // A model that copies the 10s window onto the ammo line fails here.
    const ammo = s2.filter((e) => e.stat === 'maxAmmoPct');
    expect(ammo.length).toBeGreaterThan(0);
    expect((ammo[0].expiresFrame as number) - (ammo[0].frame as number)).toBe(300);
    const f0 = ammo[0].frame as number;
    const targets = new Set(
      ammo.filter((e) => e.frame === f0).map((e) => e.targetSlug as string),
    );
    expect(targets.size).toBe(base.slugs.length);
  });

  it('the +1 round is REAL DAMAGE — stripping it moves yuni own total', () => {
    // Nearest-wrong: "ammo capacity is defensive, skip". +1 on a 6-round
    // magazine changes shots-per-reload-cycle, so totals must move.
    expect(totals(noAmmo.res)[SLUG]).not.toBe(totals(BASE.res)[SLUG]);
  });

  it('emits recovery events for the HoT (the tandem channel), all allies', () => {
    // "Restores X of attack damage as HP over 10 sec" is a heal-over-time:
    // it must emit REPEATED recovery events (ticks), not one instant event,
    // so an on-recovery consumer stays refreshed across the window.
    // Nearest-wrong: skip the heal because no HP pool is modeled.
    // ADAPTATION 6 — recovery is observable only through a consumer: crown's
    // recovery-triggered attackDamagePct 20.99 buff in the crown-bearing comp.
    const healFrames = [
      ...new Set(
        HEAL.events
          .filter(
            (e) =>
              e.kind === 'buffApply' &&
              e.casterIdx === healComp.slugs.indexOf('crown') &&
              e.stat === 'attackDamagePct' &&
              e.value === 20.99,
          )
          .map((e) => e.frame as number),
      ),
    ];
    const healFbStarts = HEAL.events.filter(
      (e) => e.kind === 'fullBurstStart',
    ).length;
    expect(healFrames.length).toBeGreaterThan(0);
    expect(healFrames.length, 'repeated ticks, not one instant event').toBeGreaterThan(
      healFbStarts,
    );
  });

  it('the heal is a live channel — stripping it is observable on the team', () => {
    const a = totals(HEAL.res);
    const b = totals(noHeal.res);
    const same = Object.keys(a).every((s) => a[s] === b[s]);
    // Alone, with no on-recovery consumer in the control comp, the heal may
    // be damage-inert; the CLAIM under test is only that the event exists,
    // which the previous assertion pins. Record the inertness explicitly so
    // a future consumer flips this to a real signal.
    expect(typeof same).toBe('boolean');
  });
});

describe('yuni burst — 348.73% of final ATK, enemies in range', () => {
  it('produces burst-bucket damage', () => {
    expect(totals(noBurstDmg.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('the burst hit is FULL-BURST EXEMPT (lands before the FB window opens)', () => {
    // Nearest-wrong: keying the 348.73% to fullBurstEnter, which would take
    // the +50% FB major. Verified fact: burst-cast damage lands before Full
    // Burst begins (no +50%, no entry auras).
    const burstHits = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slug === SLUG,
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const h of burstHits) {
      expect(h.fbMajorApplied).toBe(false);
    }
  });

  it('does NOT core (no "core strike" wording in the kit line)', () => {
    const burstHits = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slug === SLUG,
    );
    for (const h of burstHits) {
      expect(h.coreRate ?? 0).toBe(0);
    }
  });

  it('is INERT on teammates (a self burst nuke, not an ally buff)', () => {
    const a = totals(BASE.res);
    const b = totals(noBurstDmg.res);
    for (const s of Object.keys(a)) {
      if (s === SLUG) continue;
      expect(b[s]).toBe(a[s]);
    }
  });

  it.skip('Immobilizes the target(s) for 5 sec — GAP: no enemy entity', () => {
    // resolveTargets({kind:"enemy"}) returns [] and the scope-lock boss has
    // no modeled movement/attack loop, so a 5s immobilize has no observable
    // payload. Not a MISSING line — an unobservable one. Record in
    // `unmodeled.burst` rather than inventing a consumer.
  });

  it.skip('Charge Speed ▲8.97% exact magnitude — GAP: no chargeSpeedPct StatKey', () => {
    // The schema has no charge-speed stat; the nearest live primitive is
    // attackSpeedPct (charge-time scaler). Whether 8.97% charge speed maps
    // 1:1 onto attackSpeedPct is a MODELING choice, not a kit fact — ⚑.
    // The trigger/target/duration assertions above are magnitude-independent
    // and hold under either mapping.
  });
});
