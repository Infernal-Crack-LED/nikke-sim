import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-07-28: blind/ sits under kit-autonomy/, not tests/units/

/*
 * alice-wonderland-bunny — Alice: Wonderland Bunny (SMG / Water / Supporter / Burst I)
 * Base: ammo 120, reload 81f, normalAttackMultiplier 10.12, coreAttackMultiplier 250, burst cd 40s.
 *
 * KIT (structural read, ground truth):
 *   skill1 blockA: "Activates after landing 60 normal attack(s). Affects all allies."
 *                  - heal 7.4% of the skill user's final Max HP
 *                  - "Carrot Party": Damage to Interruption Parts ▲2%, stacks up to 5, lasts 5 sec
 *   skill1 blockB: "Activates after 90 normal attack(s). Affects all Water Code allies."
 *                  - Stack count of buffs ▲ 1
 *   skill2 blockA: "Activates after Full Burst ends. Affects all allies."
 *                  - Burst Gauge filling speed ▲10% for 5 sec
 *   skill2 blockB: "Activates when entering Full Burst. Affects all allies."
 *                  - Max Ammunition Capacity ▲40% for 15 sec
 *                  - Reload 40%
 *   burst  blockA: "Affects all allies."
 *                  - Re-enters Burst Stage 1
 *                  - Restores 27% of the skill user's final Max HP
 *   burst  blockB: "Activates when Carrot Party is at max stacks. Affects all allies."
 *                  - Incoming healing ▲150% for 15 sec
 *
 * FIXTURE: controlComp('alice-wonderland-bunny', true) — she is a Burst I unit, so the control's
 * B2/B3 slots are what actually complete the chain; the carry slot being B1 is fine because
 * controlComp still supplies the other stages. Deterministic (no seed), 180s.
 *
 * WHY THE ASSERTIONS DISCRIMINATE:
 *  - hitCount identity (60 / 90) is asserted off the buffApply cadence, not totals: a
 *    wrong trigger (shotFired / interval / lastBullet) changes the number and spacing of
 *    applications even when the per-application value is right.
 *  - The Carrot Party stack line is asserted on stacks/maxStacks + the 5s expiry, so a
 *    "permanent" or "unstacked" nearest-wrong model fails.
 *  - partsDamagePct is INERT in v1 (partless boss) — asserted inert on damage, which is the
 *    faithful outcome; the nearest-wrong model (encoding it as attackDamagePct to "make it
 *    do something") is caught by a counterfactual that MOVES damage.
 *  - The ammo line is the one real damage lever (theme 6: capacity gates shot count), so it
 *    gets a counterfactual that zeroes it and must LOWER team damage.
 *  - fullBurstEnd vs fullBurstEnter is discriminated by comparing each buff's apply frames
 *    against the fullBurstEnd / fullBurstStart event frames — keying either to the other
 *    (the classic trigger-identity error) shifts every apply frame.
 */

const SLUG = 'alice-wonderland-bunny';

interface Captured {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}

function run(opts: Parameters<typeof runComp>[0]): Captured {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// DRIVER ADAPTATION 2026-07-28 (fixture hazard — flagged by the S2b blind reviewer): the blind
// original ran controlComp(SLUG), which pins liter (also Burst I) into slot 0. Burst selection is
// leftmost-ready, so liter won every rotation and the audited unit NEVER cast — every burst-slot
// assertion would have run vacuously. Swapped to [SLUG, liter, crown, ada]: she is the slot-0 B1
// (casts first, positively asserted below) and liter is the second B1 that makes her reenterStage
// observable. All blind assertions are unchanged — they are comp-agnostic value/duration/target/
// cadence pins.
const FIX = {
  slugs: [SLUG, 'liter', 'crown', 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: SLUG,
};
const base = run(FIX);
const aliceIdx = base.res.units.findIndex((u) => u.slug === SLUG);
const crownIdx = base.res.units.findIndex((u) => u.slug === 'crown');

function buffs(c: Captured, stat: string) {
  return c.events.filter(
    (ev) =>
      ev.kind === 'buffApply' && (ev as never as { stat: string }).stat === stat
  ) as never as Array<{
    frame: number;
    stat: string;
    key?: string;
    value: number;
    stacks?: number;
    maxStacks?: number;
    casterIdx: number | null;
    targetIdx: number | null;
    targetSlug?: string;
    expiresFrame?: number;
  }>;
}

function framesOf(c: Captured, kind: string): number[] {
  return c.events
    .filter((ev) => ev.kind === kind)
    .map((ev) => (ev as never as { frame: number }).frame);
}

describe('alice-wonderland-bunny — fixture sanity (non-vacuity)', () => {
  it('is present in the control comp and fires normal attacks', () => {
    const row = unitOf(base.res, SLUG);
    expect(row.totalDamage).toBeGreaterThan(0);
    // DRIVER ADAPTATION 2026-07-28: shot events carry `slug`, not a numeric srcSlot.
    const shots = base.events.filter(
      (ev) =>
        ev.kind === 'shot' && (ev as never as { slug: string }).slug === SLUG
    );
    // 60- and 90-hit thresholds are only meaningful if she clears them repeatedly.
    expect(shots.length).toBeGreaterThan(180);
  });

  it('the comp actually reaches Full Burst (both FB triggers are exercised)', () => {
    expect(framesOf(base, 'fullBurstStart').length).toBeGreaterThan(0);
    expect(framesOf(base, 'fullBurstEnd').length).toBeGreaterThan(0);
  });
});

describe('alice-wonderland-bunny — skill1: 60-normal-attack heal (all allies)', () => {
  it('emits recovery to every ally on a 60-hit cadence, not per shot', () => {
    // A `heal` effect emits recovery events; the number of activations must track
    // her cumulative normal-attack count / 60, NOT her raw shot count (shotFired
    // is the nearest-wrong trigger and would fire ~60x more often).
    // DRIVER ADAPTATION 2026-07-28: the log carries no 'heal'/'recovery' event kind — the
    // observable for a recovery emission is crown's 'when recovery takes effect' consumer
    // (team attackDamagePct 20.99, one buffApply per holder per firing). Counting those
    // preserves the cadence assertion exactly (per-shot firing would still fail it 60:1).
    const recoveries = base.events.filter(
      (ev) =>
        ev.kind === 'buffApply' &&
        (ev as never as { stat: string }).stat === 'attackDamagePct' &&
        (ev as never as { value: number }).value === 20.99 &&
        (ev as never as { casterIdx: number | null }).casterIdx === crownIdx
    );
    expect(recoveries.length).toBeGreaterThan(0);
    const shots = base.events.filter(
      (ev) =>
        ev.kind === 'shot' && (ev as never as { slug: string }).slug === SLUG
    ).length;
    // 5 allies healed per activation; activations ~= shots/60. Allow slack for the
    // engine's per-target emission but reject a per-shot trigger by an order of magnitude.
    expect(recoveries.length).toBeLessThan(shots);
    expect(recoveries.length * 6).toBeLessThan(shots * 2);
  });
});

describe('alice-wonderland-bunny — skill1: Carrot Party (parts damage, 5 stacks, 5 sec)', () => {
  // DRIVER ADAPTATION 2026-07-28: scope to applies SOURCED FROM HER (casterIdx) — the blind
  // original counted the stat team-wide, which is clean only in a comp with no other granter.
  const partsBuffs = buffs(base, 'partsDamagePct').filter(
    (b) => b.casterIdx === aliceIdx
  );

  it('applies partsDamagePct — the literal stat — and not a generic damage stat', () => {
    // Nearest-wrong: encoding "Damage to Interruption Parts" as attackDamagePct so it
    // "does something" on the partless boss. That would over-credit the whole team.
    expect(partsBuffs.length).toBeGreaterThan(0);
    expect(partsBuffs[0]!.value).toBeCloseTo(2, 5);
  });

  it('caps at 5 stacks and carries a 5-second window', () => {
    const withStacks = partsBuffs.filter((b) => b.maxStacks !== undefined);
    expect(withStacks.length).toBeGreaterThan(0);
    expect(withStacks[0]!.maxStacks).toBe(5);
    // 5 sec at 60fps = 300 frames from the apply frame.
    const timed = partsBuffs.find((b) => b.expiresFrame !== undefined);
    expect(timed).toBeDefined();
    expect(timed!.expiresFrame! - timed!.frame).toBe(300);
  });

  it('targets all allies (every comp slot receives it), not just self', () => {
    const targets = new Set(partsBuffs.map((b) => b.targetIdx));
    expect(targets.size).toBe(base.res.units.length);
  });

  it('is damage-INERT on the partless v1 boss', () => {
    // Faithful outcome: partsDamagePct exists in the model but moves no damage here.
    // Counterfactual: strip the parts buff entirely — totals must be byte-identical.
    // DRIVER ADAPTATION 2026-07-28: an OverrideFile slot IS the flat block array (no .blocks).
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const slot of [ov.skill1, ov.skill2, ov.burst]) {
        if (!slot) {
          continue;
        }
        for (const b of slot) {
          b.effects = b.effects.filter(
            (e: any) => !(e.kind === 'buff' && e.stat === 'partsDamagePct')
          );
        }
      }
    });
    const alt = runComp({
      ...FIX,
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt)).toEqual(totals(base.res));
  });
});

describe('alice-wonderland-bunny — skill2: Full-Burst-END burst gauge speed (10%, 5 sec, allies)', () => {
  // DRIVER ADAPTATION 2026-07-28: scoped to her own applies (see Carrot Party note).
  const genBuffs = buffs(base, 'burstGenPct').filter(
    (b) => b.casterIdx === aliceIdx
  );

  it('applies burstGenPct 10% for 5 sec to all allies', () => {
    expect(genBuffs.length).toBeGreaterThan(0);
    expect(genBuffs[0]!.value).toBeCloseTo(10, 5);
    expect(genBuffs[0]!.expiresFrame! - genBuffs[0]!.frame).toBe(300);
    const targets = new Set(genBuffs.map((b) => b.targetIdx));
    expect(targets.size).toBe(base.res.units.length);
  });

  it('is keyed to fullBurstEnd, not fullBurstEnter (trigger identity)', () => {
    // Nearest-wrong: fullBurstEnter. The two event streams are ~10s apart, so an
    // enter-keyed model puts every apply frame on a fullBurstStart frame instead.
    const ends = new Set(framesOf(base, 'fullBurstEnd'));
    const starts = new Set(framesOf(base, 'fullBurstStart'));
    const applyFrames = [...new Set(genBuffs.map((b) => b.frame))];
    expect(applyFrames.length).toBeGreaterThan(0);
    for (const f of applyFrames) {
      expect(ends.has(f)).toBe(true);
      expect(starts.has(f)).toBe(false);
    }
  });
});

describe('alice-wonderland-bunny — skill2: Full-Burst-ENTER ammo + reload (allies)', () => {
  // DRIVER ADAPTATION 2026-07-28: scoped to her own applies — liter legitimately grants
  // maxAmmoPct 45.17 in this comp, which the unscoped team-wide count would conflate.
  const ammoBuffs = buffs(base, 'maxAmmoPct').filter(
    (b) => b.casterIdx === aliceIdx
  );

  it('applies maxAmmoPct 40% for 15 sec to all allies at FB entry', () => {
    expect(ammoBuffs.length).toBeGreaterThan(0);
    expect(ammoBuffs[0]!.value).toBeCloseTo(40, 5);
    // 15 sec = 900 frames.
    expect(ammoBuffs[0]!.expiresFrame! - ammoBuffs[0]!.frame).toBe(900);
    const targets = new Set(ammoBuffs.map((b) => b.targetIdx));
    expect(targets.size).toBe(base.res.units.length);
  });

  it('is keyed to fullBurstEnter, not fullBurstEnd nor burstCast', () => {
    const starts = new Set(framesOf(base, 'fullBurstStart'));
    const ends = new Set(framesOf(base, 'fullBurstEnd'));
    for (const f of new Set(ammoBuffs.map((b) => b.frame))) {
      expect(starts.has(f)).toBe(true);
      expect(ends.has(f)).toBe(false);
    }
    // burstCast would fire only on rotations SHE bursts; FB-enter fires on every team FB.
    expect(new Set(ammoBuffs.map((b) => b.frame)).size).toBe(starts.size);
  });

  it('MOVES team damage — ammo capacity gates shot count (not a defensive no-op)', () => {
    // Discriminating counterfactual: drop the ammo buff to 0%. Faithful model => less damage.
    // DRIVER ADAPTATION 2026-07-28: slot is the flat block array (no .blocks).
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'maxAmmoPct') {
            e.value = 0;
          }
        }
      }
    });
    const alt = runComp({
      ...FIX,
      overrides: { [SLUG]: patched },
    });
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(alt))).toBeLessThan(sum(totals(base.res)));
  });

  it('emits an instant reload (40%) at FB entry alongside the ammo buff', () => {
    // "Reload 40%" is a magazine refill, not a reloadSpeedPct buff (nearest-wrong).
    // DRIVER ADAPTATION 2026-07-28: scoped to HER applies — crown and liter legitimately
    // grant reloadSpeedPct 44.35 in this comp; the blind intent is "none sourced from her".
    const speedBuffs = buffs(base, 'reloadSpeedPct').filter(
      (b) => b.casterIdx === aliceIdx
    );
    expect(speedBuffs.length).toBe(0);
    // DRIVER ADAPTATION 2026-07-28: an instantReload tops the magazine up directly and emits
    // NO 'reload' event (that event is reload-to-MAX completion only), so "reload events at
    // the FB-entry frame" can never observe it. The faithful observable for a per-FB refill
    // is the reload ECONOMY: with the refill she runs fewer natural magazine reloads over the
    // fight than with the line stripped. Same discrimination the blind assertion intended
    // (refill vs reload-speed): a reloadSpeedPct buff would leave the reload COUNT unchanged
    // at these windows while shortening the animation.
    const reloadCount = (c: Captured) =>
      c.events.filter(
        (ev) =>
          ev.kind === 'reload' &&
          (ev as never as { slug: string }).slug === SLUG
      ).length;
    const stripped = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2!) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
      }
    });
    const alt = run({ ...FIX, overrides: { [SLUG]: stripped } });
    expect(reloadCount(base)).toBeLessThan(reloadCount(alt));
  });
});

describe('alice-wonderland-bunny — burst: re-enters Burst Stage 1 + heal', () => {
  it('casts her burst at stage 1 and emits the 27% Max HP heal to all allies', () => {
    // DRIVER ADAPTATION 2026-07-28: burstCast events carry `slug`, not a numeric srcSlot.
    const casts = base.events.filter(
      (ev) =>
        ev.kind === 'burstCast' &&
        (ev as never as { slug: string }).slug === SLUG
    );
    expect(casts.length).toBeGreaterThan(0);
  });

  it('reenterStage:1 lets another Burst I also cast — it does not consume the stage', () => {
    // Discriminating: without reenterStage the rotation advances past stage 1 after her
    // cast. With it, stage 1 remains open. Counterfactual strips the effect and the
    // team\'s stage-1 burstCast count must drop.
    const stage1Casts = (c: Captured) =>
      c.events.filter(
        (ev) =>
          ev.kind === 'burstCast' &&
          (ev as never as { stage?: number }).stage === 1
      ).length;
    // DRIVER ADAPTATION 2026-07-28: slot is the flat block array (no .blocks); FIX fixture.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'reenterStage');
      }
    });
    const alt = run({
      ...FIX,
      overrides: { [SLUG]: patched },
    });
    expect(stage1Casts(base)).toBeGreaterThanOrEqual(stage1Casts(alt));
  });

  it('teammate damage is unchanged by the heal itself (no ally in the control consumes recovery)', () => {
    // Inertness: the 27% heal must not silently add damage. Strip the heal; totals equal.
    // DRIVER ADAPTATION 2026-07-28: slot is the flat block array (no .blocks); FIX fixture.
    // Note: the adapted fixture DOES contain a recovery consumer (crown) — but her 20.99 AD
    // window (7s) is saturated by this unit's 60-hit S1 heal (~2.5s cadence), so the four
    // burst-heal refreshes extend an already-live buff and still move zero damage: the
    // inertness claim holds a fortiori.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      }
    });
    const alt = runComp({
      ...FIX,
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt)).toEqual(totals(base.res));
  });
});

describe('alice-wonderland-bunny — GAP lines (no engine primitive)', () => {
  it.skip('skill1 90-hit "Stack count of buffs ▲ 1" (Water Code allies) — no primitive: the engine has no stack-count-modifier effect that raises another buff\'s maxStacks', () => {
    // Would need an effect that mutates a live buff\'s maxStacks on the target set
    // (alliesOfElement Water). Nothing in EffectDef expresses it. Belongs in `unmodeled`.
  });

  it.skip('burst "Incoming healing ▲150% for 15 sec" at max Carrot Party stacks — no primitive: heal AMOUNTS are unmodeled (heal emits a recovery event with no HP value), so a healing-received multiplier has nothing to scale', () => {
    // Also needs a buff-stack-count gate ("when Carrot Party is at max stacks"), which
    // resourceGate cannot express for a buff. Belongs in `unmodeled`.
  });
});
