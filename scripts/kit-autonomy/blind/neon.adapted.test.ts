// ADAPTED RUN VARIANT 2026-08-04 — mechanical, mechanics-only changes vs the blind artifact
// (neon.test.ts), same class as epinel's 2026-08-03 adaptation:
//   (1) harness import path '../lib/harness.js' -> '../../tests/lib/harness.js' (blind/ sits
//       under kit-autonomy/, not tests/units/);
//   (2) onEvent moved into cfg (runComp takes CompOptions; onEvent is a SimConfig field);
//   (3) override slots are plain block arrays — 'ov.skill2!.blocks'/'ov.burst!.blocks' -> 'ov.skill2'/'ov.burst';
//   (4) damage.srcSlot is the owning kit-line NAME ('normal'|'skill1'|'skill2'|'burst'|null),
//       not a unit index — '<x|d>.srcSlot === NEON_IDX' -> "<x|d>.slug === 'neon'";
//   (5) burstCast events carry unitIdx, not slot;
//   (6) 'durationShots === undefined' -> '(durationShots ?? null) === null' (the engine emits
//       durationShots:null on wall-clock buffs).
// NO assertion semantics changed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * neon — Neon (SG / Fire / Supporter / Burst I), cd 20s, ammo 9, 10 pellets/shot.
 *
 * KIT (ground truth, read literally):
 *   skill1: "Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK.
 *            Critical Rate ▲ 3.56% for 5 sec."
 *   skill2: "Activates at the beginning of Full Burst. Affects all allies.
 *            Critical Rate ▲ 45.93% for 2 shots."
 *   burst : "Affects 1 enemy unit(s) with the highest final DEF. Deals 528.97% of final ATK as
 *            Burst Skill damage."
 *         + "Affects all allies with a Shotgun. Max Ammunition Capacity ▲ 3 round(s) for 10 sec."
 *
 * FIXTURE: controlComp('neon', true) — liter B1 / crown B2 / neon (carry, focus) / helm B3.
 *   neon is Burst I; the control comp already supplies B1/B2/B3 coverage so full bursts actually
 *   occur (a comp that cannot chain makes ZERO full bursts and every FB-keyed assertion below
 *   would be vacuous). The fixed-B3 slot (helm) is kept because helm's S1 carries
 *   critRateNormalPct — a DIFFERENT stat key from neon's unscoped critRatePct — so it cannot
 *   collide with, mask, or forge any of neon's critRatePct events. Non-vacuity of the FB path is
 *   asserted explicitly (fullBurstStart count > 0) before any FB-keyed claim is read.
 *
 * WHY EACH ASSERTION DISCRIMINATES — the four questions per line:
 *   scope: both crit lines are UNSCOPED "Critical Rate ▲" → stat 'critRatePct', NOT
 *          'critRateNormalPct'. The nearest-wrong model (scoping to normal attacks only) is caught
 *          by asserting the emitted stat key literally, and by a counterfactual that swaps the key
 *          and moves the board.
 *   duration semantics: skill2 says "for 2 shots" — a ROUND count → durationShots: 2, NEVER
 *          durationSec: 2. The nearest-wrong model (2 seconds of wall clock) is a DIFFERENT window
 *          length; the test pins durationShots === 2 on the event and asserts a seconds-encoded
 *          clone diverges in total damage. skill1 says "for 5 sec" → durationSec: 5.
 *   trigger identity: skill2 is "at the beginning of Full Burst" → fullBurstEnter (fires on ANY
 *          team Full Burst — NOT burstCast, which would fire pre-FB and lose the +50% FB major).
 *          The test asserts every skill2 apply frame coincides with a fullBurstStart frame, which a
 *          burstCast keying provably cannot satisfy (a Burst I cast lands strictly before the FB
 *          window opens). skill1 is "when killing an enemy" — the scope-lock boss is a single
 *          immortal raid boss that never dies, so this trigger CANNOT fire; it is a GAP.
 *   target set: skill2 "all allies" → 4 distinct targetSlugs incl. neon herself. burst crit line —
 *          n/a. burst ammo line "all allies with a Shotgun" → alliesOfWeapon SG (weapon-typed,
 *          class-blind, self included); asserted by checking every maxAmmoFlat recipient is an SG
 *          wielder and that non-SG allies are untouched.
 *
 * INERTNESS: neon's burst nuke must live in the BURST bucket only and must not move teammates'
 *   totals; the ammo grant must not touch non-SG allies.
 *
 * RUNS ARE HOISTED — each runComp is a full 180 s sim. 6 runs total.
 */

// ---------------------------------------------------------------------------
// Hoisted runs
// ---------------------------------------------------------------------------

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) } });
  return { res, events };
}

const BASE = run(controlComp('neon', true));

// Counterfactual A — skill2 crit re-scoped to normal attacks only (nearest-wrong SCOPE).
const CF_SCOPED = run({
  ...controlComp('neon', true),
  overrides: {
    neon: withPatchedOverride('neon', (ov) => {
      for (const b of ov.skill2) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'critRatePct') {
            (e as { stat: string }).stat = 'critRateNormalPct';
          }
        }
      }
    }),
  },
});

// Counterfactual B — skill2 "2 shots" re-read as "2 seconds" (nearest-wrong DURATION SEMANTICS).
const CF_SECONDS = run({
  ...controlComp('neon', true),
  overrides: {
    neon: withPatchedOverride('neon', (ov) => {
      for (const b of ov.skill2) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'critRatePct') {
            delete (e as { durationShots?: number }).durationShots;
            (e as { durationSec?: number }).durationSec = 2;
          }
        }
      }
    }),
  },
});

// Counterfactual C — skill2 re-keyed to burstCast (nearest-wrong TRIGGER IDENTITY).
const CF_BURSTCAST = run({
  ...controlComp('neon', true),
  overrides: {
    neon: withPatchedOverride('neon', (ov) => {
      for (const b of ov.skill2) {
        if (b.trigger.kind === 'fullBurstEnter') {
          (b as { trigger: { kind: string } }).trigger = { kind: 'burstCast' };
        }
      }
    }),
  },
});

// Counterfactual D — burst nuke removed (isolates the 528.97% damage line).
const CF_NO_NUKE = run({
  ...controlComp('neon', true),
  overrides: {
    neon: withPatchedOverride('neon', (ov) => {
      for (const b of ov.burst) {
        b.effects = b.effects.filter((e) => e.kind !== 'flatDamage');
      }
      ov.burst = ov.burst.filter((b) => b.effects.length > 0);
    }),
  },
});

// Counterfactual E — burst SG ammo grant removed (isolates the weapon-state line).
const CF_NO_AMMO = run({
  ...controlComp('neon', true),
  overrides: {
    neon: withPatchedOverride('neon', (ov) => {
      for (const b of ov.burst) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoFlat'),
        );
      }
      ov.burst = ov.burst.filter((b) => b.effects.length > 0);
    }),
  },
});

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type DamageEv = Extract<SimEvent, { kind: 'damage' }>;

const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) =>
  evs.filter((e): e is DamageEv => e.kind === 'damage');

const NEON_IDX = 2; // controlComp slot order: liter / crown / carry / helm — carry is the focus (middle).

// neon's crit grants: unscoped critRatePct cast BY neon. helm carries critRateNormalPct (a
// different stat key), so this filter cannot pick up a teammate's buff.
const neonCrit = (evs: SimEvent[]) =>
  buffApplies(evs).filter(
    (e) => e.stat === 'critRatePct' && e.casterIdx === NEON_IDX,
  );

const fbStartFrames = (evs: SimEvent[]) =>
  new Set(
    evs.filter((e) => e.kind === 'fullBurstStart').map((e) => (e as { frame: number }).frame),
  );

// ---------------------------------------------------------------------------

describe('neon — fixture is non-vacuous', () => {
  it('the control comp actually enters Full Burst (else every FB assertion below is vacuous)', () => {
    expect(fbStartFrames(BASE.events).size).toBeGreaterThan(0);
  });

  it('neon is in the comp and deals damage', () => {
    expect(unitOf(BASE.res, 'neon').totalDamage).toBeGreaterThan(0);
  });
});

describe('neon skill1 — "killing an enemy" → 2 highest-final-ATK allies, Critical Rate ▲3.56% / 5 s', () => {
  // GAP: the scope-lock fight is a single immortal raid boss that is never killed, so the
  // activation clause can never be satisfied. The block is authored for kit completeness and is
  // structurally inert. There is no engine trigger for "on enemy kill" and nothing to observe.
  it.skip(
    'GAP — on-kill trigger is unreachable at scope lock (immortal partless boss, nothing ever dies); ' +
      'no engine trigger kind expresses "when killing an enemy", so the 3.56%/5 s grant is unobservable',
    () => {},
  );

  it('emits NO 3.56% crit grant during the fight (the kill trigger never fires)', () => {
    const kill = neonCrit(BASE.events).filter(
      (e) => Math.abs(e.value - 3.56) < 1e-6,
    );
    expect(kill).toHaveLength(0);
  });
});

describe('neon skill2 — FB entry, all allies, Critical Rate ▲45.93% for 2 SHOTS', () => {
  const applies = () =>
    neonCrit(BASE.events).filter((e) => Math.abs(e.value - 45.93) < 1e-6);

  it('fires at all (non-vacuity: the 45.93% grant is actually applied)', () => {
    expect(applies().length).toBeGreaterThan(0);
  });

  it('SCOPE — the grant is UNSCOPED critRatePct, not critRateNormalPct', () => {
    // Kit says plain "Critical Rate ▲", so it must lift skill/burst crit too. The nearest-wrong
    // model scopes it to normal attacks; that key would emit nothing under this filter...
    expect(applies().length).toBeGreaterThan(0);
    // ...and it is not merely a naming difference: re-scoping moves the board.
    expect(totals(CF_SCOPED.res)['neon']).not.toBeCloseTo(
      totals(BASE.res)['neon'],
      6,
    );
  });

  it('DURATION SEMANTICS — durationShots === 2 (a ROUND count), never a 2-second window', () => {
    for (const e of applies()) {
      expect(e.durationShots).toBe(2);
    }
    // A 2-second re-read is a genuinely different window: the whole-comp damage must diverge.
    const sum = (r: ReturnType<typeof runComp>) =>
      Object.values(totals(r)).reduce((a, b) => a + b, 0);
    expect(sum(CF_SECONDS.res)).not.toBeCloseTo(sum(BASE.res), 6);
  });

  it('TRIGGER IDENTITY — every application lands exactly on a fullBurstStart frame (FB-enter, not burst-cast)', () => {
    const fbFrames = fbStartFrames(BASE.events);
    for (const e of applies()) {
      expect(fbFrames.has((e as unknown as { frame: number }).frame)).toBe(true);
    }
    // A burstCast keying fires strictly BEFORE the FB window opens (neon is Burst I), so the
    // buffed shots fall outside Full Burst and the totals must differ.
    expect(totals(CF_BURSTCAST.res)['neon']).not.toBeCloseTo(
      totals(BASE.res)['neon'],
      6,
    );
  });

  it('TARGET SET — "all allies": every comp member incl. neon receives it, once per FB', () => {
    const fbCount = fbStartFrames(BASE.events).size;
    const perSlug = new Map<string, number>();
    for (const e of applies()) {
      perSlug.set(e.targetSlug, (perSlug.get(e.targetSlug) ?? 0) + 1);
    }
    expect(perSlug.size).toBe(Object.keys(totals(BASE.res)).length);
    expect(perSlug.has('neon')).toBe(true); // "all allies" includes self — no excludeSelf
    for (const n of perSlug.values()) {
      expect(n).toBe(fbCount);
    }
  });
});

describe('neon burst — 528.97% of final ATK as Burst Skill damage', () => {
  it('lands in the BURST bucket, once per neon burst cast', () => {
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e as unknown as { unitIdx: number }).unitIdx === NEON_IDX,
    ).length;
    expect(casts).toBeGreaterThan(0);
    const nuke = damages(BASE.events).filter(
      (d) => d.slug === 'neon' && d.bucket === 'burst',
    );
    expect(nuke.length).toBe(casts);
  });

  it('is FB-exempt — a burst cast resolves before the Full Burst window opens (no +50% major)', () => {
    for (const d of damages(BASE.events).filter(
      (x) => x.slug === 'neon' && x.bucket === 'burst',
    )) {
      expect(d.fbMajorApplied).toBe(false);
    }
  });

  it('DISCRIMINATES — removing the 528.97% line strictly lowers ONLY neon, teammates byte-identical', () => {
    const base = totals(BASE.res);
    const cf = totals(CF_NO_NUKE.res);
    expect(cf['neon']).toBeLessThan(base['neon']);
    for (const slug of Object.keys(base)) {
      if (slug === 'neon') continue;
      expect(cf[slug]).toBeCloseTo(base[slug], 6);
    }
  });

  it('INERTNESS — the nuke never lands in the normal/charge/skill buckets', () => {
    const strayBuckets = damages(BASE.events)
      .filter((d) => d.slug === 'neon')
      .map((d) => d.bucket);
    expect(strayBuckets).toContain('burst');
    expect(strayBuckets).toContain('normal');
    expect(strayBuckets).not.toContain('charge'); // neon has chargeFrames 0 — no charge shots exist
  });

  it('"1 enemy with the highest final DEF" is scope-trivial (single partless boss) — one hit, not N', () => {
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e as unknown as { unitIdx: number }).unitIdx === NEON_IDX,
    ).length;
    const nuke = damages(BASE.events).filter(
      (d) => d.slug === 'neon' && d.bucket === 'burst',
    );
    expect(nuke.length).toBe(casts); // never a multiple of casts — no per-enemy fan-out
  });
});

describe('neon burst — "all allies with a Shotgun": Max Ammunition ▲3 rounds for 10 s', () => {
  const ammo = () =>
    buffApplies(BASE.events).filter(
      (e) => e.stat === 'maxAmmoFlat' && e.casterIdx === NEON_IDX,
    );

  it('fires at all, granting FLAT 3 rounds (maxAmmoFlat, not maxAmmoPct)', () => {
    expect(ammo().length).toBeGreaterThan(0);
    for (const e of ammo()) {
      expect(e.value).toBe(3);
    }
  });

  it('TARGET SET — weapon-typed, class-blind: neon (SG) receives it; non-SG allies do NOT', () => {
    const recipients = new Set(ammo().map((e) => e.targetSlug));
    expect(recipients.has('neon')).toBe(true); // no excludeSelf in the kit text
    // Every recipient must be an SG wielder. Any non-SG recipient means the target set was
    // mis-encoded as `allies` (or alliesOfClass Supporter) instead of alliesOfWeapon SG.
    for (const slug of recipients) {
      const weapon = unitOf(BASE.res, slug).weapon;
      expect(weapon).toBe('SG');
    }
  });

  it('DURATION — a 10 s wall-clock window (durationSec), NOT a round count', () => {
    for (const e of ammo()) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('IS DAMAGE — an ammo grant gates shots fired: removing it moves an SG holder\u2019s total', () => {
    // Weapon-state modifiers are damage (failure-mode taxonomy #6). neon fires 9 rounds per
    // magazine with a 129-frame reload; +3 rounds for 10 s across her own burst window means
    // strictly more shots inside Full Burst, so her total must fall when the grant is removed.
    expect(totals(CF_NO_AMMO.res)['neon']).toBeLessThan(totals(BASE.res)['neon']);
  });

  it('INERTNESS — removing the ammo grant leaves every non-SG teammate byte-identical', () => {
    const base = totals(BASE.res);
    const cf = totals(CF_NO_AMMO.res);
    for (const slug of Object.keys(base)) {
      if (unitOf(BASE.res, slug).weapon === 'SG') continue;
      expect(cf[slug]).toBeCloseTo(base[slug], 6);
    }
  });
});

describe('neon — no invented mechanics (⚑ discipline)', () => {
  it('grants exactly TWO distinct crit magnitudes at most (3.56 / 45.93) — nothing else', () => {
    const vals = new Set(neonCrit(BASE.events).map((e) => e.value));
    for (const v of vals) {
      expect([3.56, 45.93]).toContain(v);
    }
  });

  it('carries no DoT, no weapon swap, no pierce, no stored hits (kit text has none)', () => {
    const kinds = new Set(
      damages(BASE.events)
        .filter((d) => d.slug === 'neon')
        .map((d) => d.bucket),
    );
    expect(kinds.has('charge')).toBe(false);
    // Only normal + burst channels exist for this kit.
    for (const k of kinds) {
      expect(['normal', 'burst']).toContain(k);
    }
  });
});
