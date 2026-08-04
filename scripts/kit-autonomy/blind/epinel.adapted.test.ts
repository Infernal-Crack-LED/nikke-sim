// ADAPTED RUN VARIANT 2026-08-03 — mechanical, mechanics-only changes vs the blind artifact
// (epinel.test.ts): (1) harness import path '../lib/harness.js' -> '../../tests/lib/harness.js'
// (blind/ sits under kit-autonomy/, not tests/units/); (2) the event-contract assertion
// `durationShots === undefined` -> `(durationShots ?? null) === null` (the engine emits
// durationShots:null on wall-clock buffs — same class as d's 2026-08-03 frame-field adaptation).
// NO assertion semantics changed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-03: blind/ sits under kit-autonomy/, not tests/units/

/**
 * epinel (SMG / Wind / Attacker / Burst III, 120 ammo, 81f reload) — kit spec test.
 * Written from the kit prose ALONE (blind: no driver override / tests / reasoning consulted).
 *
 * KIT, read literally, and what each line must do in the sim:
 *
 * skill1 "Total Noob" — "Activates when killing an enemy. Affects self."
 *   ATK up 13.86%, stacks to 5, 15 sec.
 *   > TRIGGER IDENTITY: the activation clause is a KILL. The scope-lock fixture is a solo-raid
 *     boss that never dies and spawns no adds, and TriggerDef carries no kill primitive at all
 *     (passive / burstCast / fullBurstEnter / hitCount / shotFired / lastBullet / recovery /
 *     shielded / interval / stageEnter / bossElement / teamAmmo / chargeCounter — no kill).
 *     GAP. The only faithful OBSERVABLE at scope lock is therefore "epinel grants herself no
 *     ATK buff", whether the override omits the line or encodes a trigger that never fires.
 *   > NEAREST-WRONG: re-keying the unmodelable kill trigger to `passive` (or to a shot/hit
 *     trigger) so the stack sits live for the whole fight — up to +69.3% ATK on an Attacker.
 *     Test A2 asserts the 13.86%/69.3% self-ATK buff is NEVER applied; A3 patches that passive
 *     IN and shows damage rises, proving the omission is load-bearing rather than a no-op.
 *
 * skill2 — "Activates when the last bullet hits the target. Affects self."
 *   Critical Rate up 5.05% for 5 sec / Critical Damage up 6.4% for 5 sec.
 *   > SCOPE: plain "Critical Rate", NOT "Critical Rate of normal attacks" — generic critRatePct,
 *     not critRateNormalPct. DURATION: wall-clock seconds (not rounds, not until-reload).
 *     TRIGGER: lastBullet (per magazine). TARGET: self.
 *   > NON-VACUITY: her 120-round SMG magazine plus an 81-frame reload runs ~7s, longer than the
 *     5s window, so the fixture exercises BOTH the active and the lapsed state — B3 asserts the
 *     gap between consecutive applications exceeds the 5s window.
 *   > NEAREST-WRONGS: dropped/inert (B4), scoped to normal attacks (B1 filters on stat +
 *     value, so a critRateNormalPct encoding finds zero events), permanent / until-reload
 *     (B5 shows a 15s duration strictly out-earns the faithful 5s).
 *
 * burst — "Affects all enemies. Deals 457.87% of final ATK as Burst Skill damage."
 *         "Activates when Total Noob is at max stacks. Affects the same targets.
 *          Deals 457.87% of final ATK as additional damage."
 *   > ONE 457.87% burst-cast hit is payable. The SECOND 457.87% is gated on Total Noob at max
 *     stacks, which is unreachable at scope lock (no kills => no stacks), so it must not be
 *     credited.
 *   > NEAREST-WRONG: an unconditional 915.74% burst (both components always paid). C1 measures
 *     the shipped burst-damage CONTRIBUTION as a ratio against a canonical single-457.87%
 *     reference built in-memory; a double-credit lands near 2.0, the faithful model near 1.0.
 *     The ratio form makes the test tolerant of modelling details I cannot know blind (crit
 *     eligibility, noFb/noRange flags) while still separating 1x from 2x.
 *   > C2: burst-cast damage is Full-Burst-exempt by timing (the cast lands before the FB window
 *     opens), so no burst-slot damage event may carry the +50% FB major. This also discriminates
 *     the wrong trigger identity (fullBurstEnter instead of burstCast).
 *
 * FIXTURES
 *   controlComp('epinel', true)  — self-buff + inertness work. liter B1 + crown B2 supply the
 *                                  chain so a lone Burst III actually casts (a lone B3 makes ZERO
 *                                  Full Bursts).
 *   controlComp('epinel', false) — burst-damage identity work, so epinel is the SOLE Burst III
 *                                  and the fixed-B3 slot's buffs cannot confound the comparison.
 *   Deterministic (no seed). 7 hoisted 180s runs.
 */

const SLUG = 'epinel';
const CRIT_RATE_PCT = 5.05;
const CRIT_DMG_PCT = 6.4;
const CRIT_WINDOW_FRAMES = 5 * 60;
const NOOB_ATK_PCT = 13.86;
const NOOB_MAX_STACKS = 5;
const BURST_ATK_PCT = 457.87;
const EPS = 1e-6;

type SlotName = 'skill1' | 'skill2' | 'burst';
type LooseEffect = Record<string, unknown>;
type LooseBlock = { effects?: LooseEffect[] } & Record<string, unknown>;

/**
 * The override FILE is slot-keyed. The slot value is documented in two shapes (a raw Block[],
 * or a CharacterSkills carrying its own `blocks`), so resolve either and mutate IN PLACE —
 * reassigning `ov[slot]` would be the classic blind no-op.
 */
function slotBlocks(ov: unknown, slot: SlotName): LooseBlock[] {
  const holder = ov as Record<string, unknown>;
  const raw = holder[slot];
  if (Array.isArray(raw)) {
    return raw as LooseBlock[];
  }
  const inner = (raw as { blocks?: unknown } | undefined)?.blocks;
  if (Array.isArray(inner)) {
    return inner as LooseBlock[];
  }
  throw new Error(`epinel spec: could not resolve blocks for slot ${slot}`);
}

/** Remove every damage-bearing effect from the burst slot (the zero-burst-damage baseline). */
function stripBurstDamage(ov: unknown): void {
  for (const blk of slotBlocks(ov, 'burst')) {
    if (Array.isArray(blk.effects)) {
      blk.effects = blk.effects.filter(
        (e) =>
          e.kind !== 'flatDamage' && e.kind !== 'dot' && e.kind !== 'storedHit'
      );
    }
  }
}

type Comp = ReturnType<typeof controlComp> & { cfg?: Record<string, unknown> };

function comp(helm: boolean): Comp {
  return controlComp(SLUG, helm) as Comp;
}

function runWithEvents(opts: Comp): {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
} {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as Comp);
  return { res, events };
}

function buffApplies(events: SimEvent[]) {
  return events.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> => e.kind === 'buffApply'
  );
}

function damages(events: SimEvent[]) {
  return events.filter(
    (e): e is Extract<SimEvent, { kind: 'damage' }> => e.kind === 'damage'
  );
}

// ---------------------------------------------------------------------------
// Hoisted runs (each is a full 180s sim).
// ---------------------------------------------------------------------------

const base = runWithEvents(comp(true));
const baseTotals = totals(base.res);

// skill2 removed entirely — the "dropped line" nearest-wrong.
const noSkill2Totals = totals(
  runComp({
    ...comp(true),
    overrides: {
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const blocks = slotBlocks(ov, 'skill2');
        blocks.splice(0, blocks.length);
      }),
    },
  } as Comp)
);

// skill2 buff windows stretched 5s -> 15s — the "wrong duration semantics" nearest-wrong.
const longCritTotals = totals(
  runComp({
    ...comp(true),
    overrides: {
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        for (const blk of slotBlocks(ov, 'skill2')) {
          for (const eff of blk.effects ?? []) {
            if (eff.kind === 'buff' && typeof eff.durationSec === 'number') {
              eff.durationSec = 15;
            }
          }
        }
      }),
    },
  } as Comp)
);

// Total Noob re-keyed to an always-on max-stack self buff — the kill-trigger nearest-wrong.
const noobPassiveTotals = totals(
  runComp({
    ...comp(true),
    overrides: {
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        slotBlocks(ov, 'skill1').push({
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [
            {
              kind: 'buff',
              stat: 'atkPct',
              value: NOOB_ATK_PCT * NOOB_MAX_STACKS,
              durationSec: 15,
            },
          ],
        });
      }),
    },
  } as Comp)
);

// Sole-B3 fixture for the burst identity work.
const soloB3 = runWithEvents(comp(false));
const soloB3Totals = totals(soloB3.res);

const noBurstDamageTotals = totals(
  runComp({
    ...comp(false),
    overrides: { [SLUG]: withPatchedOverride(SLUG, stripBurstDamage) },
  } as Comp)
);

const singleBurstTotals = totals(
  runComp({
    ...comp(false),
    overrides: {
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        stripBurstDamage(ov);
        slotBlocks(ov, 'burst').push({
          slot: 'burst',
          trigger: { kind: 'burstCast' },
          target: { kind: 'enemy' },
          effects: [{ kind: 'flatDamage', atkPct: BURST_ATK_PCT }],
        });
      }),
    },
  } as Comp)
);

// ---------------------------------------------------------------------------

describe('epinel — fixture sanity', () => {
  it('epinel is in both fixtures and deals damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(unitOf(soloB3.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('the B1+B2 chain actually produces Full Bursts (a lone B3 would produce zero)', () => {
    const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbStarts.length).toBeGreaterThan(0);
  });
});

describe('epinel skill1 — "Total Noob" ATK stack (kill-triggered: GAP at scope lock)', () => {
  // A1 is the GAP record: the engine has no kill trigger and the scope-lock boss never dies.
  it.skip(
    'GAP: "Activates when killing an enemy" has no engine primitive and cannot fire at scope ' +
      'lock (immortal, partless, add-less boss) — unobservable, so nothing can discriminate it',
    () => {}
  );

  it('A2: epinel never receives a Total Noob self ATK buff (13.86% / 5x = 69.3%)', () => {
    const noobLike = buffApplies(base.events).filter(
      (e) =>
        e.targetSlug === SLUG &&
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        (Math.abs(Number(e.value) - NOOB_ATK_PCT) < EPS ||
          Math.abs(Number(e.value) - NOOB_ATK_PCT * NOOB_MAX_STACKS) < EPS)
    );
    // RED if the kill trigger was re-keyed to passive / shotFired / lastBullet to "not lose" the line.
    expect(noobLike).toHaveLength(0);
  });

  it('A3: the omission is load-bearing — patching the max-stack passive IN raises her damage', () => {
    expect(noobPassiveTotals[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
  });
});

describe('epinel skill2 — last-bullet crit window (5.05% CR / 6.4% CD for 5s, self)', () => {
  const applies = buffApplies(base.events);
  const critRate = applies.filter(
    (e) =>
      e.targetSlug === SLUG &&
      e.stat === 'critRatePct' &&
      Math.abs(Number(e.value) - CRIT_RATE_PCT) < EPS
  );
  const critDamage = applies.filter(
    (e) =>
      e.targetSlug === SLUG &&
      e.stat === 'critDamagePct' &&
      Math.abs(Number(e.value) - CRIT_DMG_PCT) < EPS
  );

  it('B1: both buffs are applied to epinel herself, as GENERIC crit at the kit magnitudes', () => {
    // RED under the scope nearest-wrong: a critRateNormalPct encoding matches neither filter,
    // and an ally-scoped target would not carry targetSlug === 'epinel'.
    expect(critRate.length).toBeGreaterThanOrEqual(2);
    expect(critDamage.length).toBeGreaterThanOrEqual(2);
  });

  it('B2: the two buffs fire together (one last-bullet trigger, two effects)', () => {
    expect(critDamage.length).toBe(critRate.length);
  });

  it('B3: the window is a finite 5s that genuinely LAPSES between magazines (non-vacuity)', () => {
    const expiries = critRate.map((e) => Number(e.expiresFrame));
    expect(expiries.every((f) => Number.isFinite(f))).toBe(true);
    // expiresFrame = applyFrame + window, so consecutive deltas are the trigger spacing.
    const gaps = expiries.slice(1).map((f, i) => f - expiries[i]);
    expect(gaps.length).toBeGreaterThan(0);
    // Her ~120-round magazine + 81f reload is ~7s > the 5s window: the buff is provably OFF
    // for part of every cycle, so the assertions above are not testing an always-on buff.
    expect(Math.max(...gaps)).toBeGreaterThan(CRIT_WINDOW_FRAMES);
    // ...and the buff is not a round-count duration masquerading as seconds.
    expect(critRate.every((e) => (e.durationShots ?? null) === null)).toBe(
      true
    ); // adapted 2026-08-03: engine emits durationShots:null on wall-clock buffs
  });

  it('B4: the buffs are productive — removing skill2 lowers her damage', () => {
    expect(baseTotals[SLUG]).toBeGreaterThan(noSkill2Totals[SLUG]);
  });

  it('B5: the 5s duration is load-bearing — a 15s window strictly out-earns it', () => {
    // RED if the buffs were modelled permanent / until-reload / whole-fight.
    expect(longCritTotals[SLUG]).toBeGreaterThan(baseTotals[SLUG]);
  });

  it('B6: INERTNESS — a self-scoped crit buff moves no teammate', () => {
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) {
        continue;
      }
      expect(noSkill2Totals[slug]).toBe(baseTotals[slug]);
    }
  });
});

describe('epinel burst — 457.87%, and the max-stack rider that cannot fire', () => {
  it('C1: exactly ONE 457.87% component is paid, not two', () => {
    const shippedContribution = soloB3Totals[SLUG] - noBurstDamageTotals[SLUG];
    const oneComponent = singleBurstTotals[SLUG] - noBurstDamageTotals[SLUG];
    expect(oneComponent).toBeGreaterThan(0);
    const ratio = shippedContribution / oneComponent;
    // Faithful ~1.0; the nearest-wrong (both 457.87% lines paid unconditionally, i.e. the
    // Total-Noob-max-stacks rider credited despite being unreachable) lands ~2.0. The band is
    // wide enough to absorb modelling details a blind spec cannot know (crit eligibility,
    // noFb/noRange flags) yet still separates 1x from 2x.
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(1.5);
  });

  it('C2: burst damage is Full-Burst-exempt (the cast lands before the FB window opens)', () => {
    const burstSlotDamage = damages(soloB3.events).filter(
      (e) => e.srcSlot === 'burst'
    );
    expect(burstSlotDamage.length).toBeGreaterThan(0);
    // RED if the burst hit were keyed to fullBurstEnter instead of burstCast (it would pick up
    // the +50% FB major it must never receive).
    expect(burstSlotDamage.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it.skip(
    'GAP: the second 457.87% "when Total Noob is at max stacks" rider is unobservable at scope ' +
      'lock — its gate depends on the unmodelable kill trigger, so only its ABSENCE (C1) is testable',
    () => {}
  );
});
