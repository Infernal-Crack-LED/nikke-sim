// Functional test for the structured event log (`cfg.onEvent`, TDD transition step 1d).
//
// The hook exists so kit tests can assert on the TIMELINE (which trigger fired, on whom, in what
// scope) instead of only on total damage. That makes it load-bearing for every step-2/step-3 test
// written on top of it, so its own contract has to be pinned:
//
//   1. INERT       — attaching a handler changes NOTHING. Same comp, same seedless run, byte-identical
//                    per-unit totals with and without the hook. (The regression snapshot proves the
//                    unset case; only this test can prove the SET case, which the snapshot never runs.)
//   2. COMPLETE    — the `damage` events sum EXACTLY to each unit's per-bucket breakdown. This is the
//                    discriminating one: it proves `dealDamage` really is the single choke point and
//                    that no source (DoT tick, flighted hit, rider, pierce double-hit) bypasses the
//                    log. A hook wired to only the normal-fire path passes every other assertion here.
//   3. FAITHFUL    — each event's `mult` decomposition reproduces its own `amount` from `baseAtk` and
//                    `atkPct`, so the numbers reported are the ones the formula actually used rather
//                    than a parallel re-derivation that can drift from the engine.
//   4. COHERENT    — shot/reload interleave correctly (magIndex advances only at a reload-to-max).
//   5. SCOPE-ASSERTABLE — the reason the hook was built: `critRateNormalPct` (helm S1, "Critical Rate
//                    of normal attacks") must raise the crit rate on NORMAL-bucket damage only. That
//                    is a scoping error worth a few % — exactly the class the ±3% board absorbs via
//                    calibration and no total-damage test can isolate.
//
// Fixture: the control comp (liter / crown / ada / helm) so bursts are actually cast — a lone
// Burst III never bursts. No override is patched; this tests the engine, not a kit.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals } from '../lib/harness.js';

const CARRY = 'ada';

function capture(): { events: SimEvent[]; totals: Record<string, number>; breakdown: Record<string, { normal: number; skill: number; burst: number }> } {
  const events: SimEvent[] = [];
  const res = runComp({ ...controlComp(CARRY), cfg: { onEvent: (ev) => events.push(ev) } });
  return {
    events,
    totals: Object.fromEntries(res.units.map((u) => [u.slug, u.totalDamage])),
    breakdown: Object.fromEntries(res.units.map((u) => [u.slug, u.breakdown])),
  };
}

const run = capture();
const of = <K extends SimEvent['kind']>(kind: K) =>
  run.events.filter((e): e is Extract<SimEvent, { kind: K }> => e.kind === kind);

describe('cfg.onEvent structured event log', () => {
  it('is INERT — attaching a handler leaves every unit total byte-identical', () => {
    const withoutHook = totals(runComp(controlComp(CARRY)));
    expect(run.totals).toEqual(withoutHook);
  });

  it('is INERT under a SEED too — no emit path consumes an rng draw', () => {
    // A different failure mode from the deterministic arm: in a seeded run every crit/core/pellet
    // roll advances one shared rng stream, so an emit site that drew from it would desync the whole
    // remaining fight. Equal seeded totals prove the log is outside the random stream.
    const seeded = { ...controlComp(CARRY), cfg: { seed: 1234 } };
    const quiet = totals(runComp(seeded));
    const loud = totals(runComp({ ...seeded, cfg: { seed: 1234, onEvent: () => {} } }));
    expect(loud).toEqual(quiet);
  });

  it('emits every event kind the fixture exercises', () => {
    const kinds = new Set(run.events.map((e) => e.kind));
    for (const k of ['shot', 'damage', 'buffApply', 'reload', 'burstCast', 'fullBurstStart', 'fullBurstEnd']) {
      expect(kinds, `no '${k}' event was emitted over a 180s control-comp fight`).toContain(k);
    }
  });

  it('DISCRIMINATING: damage events sum EXACTLY to each unit\'s per-bucket breakdown', () => {
    // A hook wired to only the normal-fire path — missing DoT ticks, flighted hits, riders, the
    // pierce double-hit — passes every other assertion in this file and fails only here.
    const summed: Record<string, { normal: number; skill: number; burst: number }> = {};
    for (const e of of('damage')) {
      const b = (summed[e.slug] ??= { normal: 0, skill: 0, burst: 0 });
      b[e.bucket] += e.amount;
    }
    for (const [slug, actual] of Object.entries(run.breakdown)) {
      for (const bucket of ['normal', 'skill', 'burst'] as const) {
        const logged = summed[slug]?.[bucket] ?? 0;
        // float-addition order differs from the engine's accumulation, so compare relatively
        const scale = Math.max(1, Math.abs(actual[bucket]));
        expect(
          Math.abs(logged - actual[bucket]) / scale,
          `${slug}.${bucket}: events sum to ${logged.toFixed(0)} but the engine banked ${actual[bucket].toFixed(0)} — a damage source bypasses the log`,
        ).toBeLessThan(1e-9);
      }
    }
  });

  it('reports the REAL multiplier decomposition — every event reproduces its own amount', () => {
    const bad = of('damage').filter((e) => {
      const m = e.mult;
      const expected =
        e.baseAtk * (e.atkPct / 100) *
        m.major * m.elem * m.charge * m.dmgUp * m.seqMult * m.projFactor * m.taken * m.distributed;
      const scale = Math.max(1, Math.abs(e.amount));
      return Math.abs(expected - e.amount) / scale > 1e-9;
    });
    expect(
      bad.slice(0, 3).map((e) => `${e.slug}/${e.bucket}@${e.sec.toFixed(2)}s`),
      'event(s) whose mult decomposition does not reproduce their own amount',
    ).toEqual([]);
  });

  it('keeps shot/reload coherent — magIndex advances only at a reload-to-max', () => {
    const helmShots = of('shot').filter((e) => e.slug === 'helm');
    const helmReloads = of('reload').filter((e) => e.slug === 'helm');
    expect(helmShots.length, 'helm never fired').toBeGreaterThan(0);
    expect(helmReloads.length, 'helm never reloaded over 180s').toBeGreaterThan(0);
    // magIndex is monotonic across her shots...
    const mags = helmShots.map((e) => e.magIndex);
    expect(mags.every((m, i) => i === 0 || m >= mags[i - 1]), 'magIndex went backwards').toBe(true);
    // ...and never exceeds the reloads that have actually happened by that frame.
    const bad = helmShots.filter(
      (s) => s.magIndex !== helmReloads.filter((r) => r.frame <= s.frame).length,
    );
    expect(
      bad.slice(0, 3).map((s) => `${s.sec.toFixed(2)}s mag=${s.magIndex}`),
      'shot magIndex disagrees with the reload events preceding it',
    ).toEqual([]);
  });

  it('SCOPE: critRateNormalPct raises the crit rate on NORMAL-bucket damage only', () => {
    // helm's S1 grants "Critical Rate of normal attacks ▲" to ALL ALLIES, so every unit in this
    // comp is a probe. Shipping it as a generic critRatePct inflated crit on the whole team's skill
    // procs and burst nukes (DECISIONS 2026-07-23). Read per unit: its LOWEST observed rate is its
    // unbuffed sheet rate, so "no skill/burst hit ever exceeds it" is the scoping claim, and "some
    // normal hit does" proves the buff was live at all. An unscoped implementation fails the first.
    const crits = of('damage').filter((e) => e.critEligible);
    expect(crits.length, 'no crit-eligible damage at all').toBeGreaterThan(0);
    let sawBoost = false;
    const leaked: string[] = [];
    for (const slug of new Set(crits.map((e) => e.slug))) {
      const mine = crits.filter((e) => e.slug === slug);
      const base = Math.min(...mine.map((e) => e.critRate)); // unbuffed sheet rate
      for (const e of mine) {
        if (e.bucket === 'normal') {
          if (e.critRate > base) sawBoost = true;
        } else if (e.critRate > base) {
          leaked.push(`${slug}/${e.bucket}@${e.sec.toFixed(2)}s rate=${e.critRate.toFixed(4)} > base ${base.toFixed(4)}`);
        }
      }
    }
    expect(
      leaked.slice(0, 3),
      'a normal-attack-scoped Critical Rate buff leaked onto skill/burst damage',
    ).toEqual([]);
    expect(
      sawBoost,
      'no normal hit ever saw an elevated crit rate. Two very different causes: the fixture is ' +
        'broken (helm never cast, so the buff was never live and the leak arm above is vacuous), ' +
        'OR the buff is applied at 100% uptime — in which case `base` IS the boosted rate, nothing ' +
        'reads as elevated, and the leak arm went silent on a genuinely unscoped implementation. ' +
        'Check whether the buff is live at all before assuming the first.',
    ).toBe(true);
  });

  it('attributes buffs to caster and holder, with enemy debuffs held by the boss', () => {
    // DELIBERATELY NOT the control comp: it applies 960 buffs and ZERO of them are boss-held, so the
    // enemy-debuff arm would be vacuous there (`.every()` over an empty set). blanc carries a
    // Damage Taken ▲ debuff, which is the only way to reach applyBuff's `units.find(...)` MISS
    // branch — the branch that decides a buff is held by the boss rather than by a unit.
    const events: SimEvent[] = [];
    runComp({
      slugs: ['liter', 'blanc', 'ada', 'helm'],
      bossElement: 'Fire',
      focusSlug: 'ada',
      cfg: { onEvent: (ev) => events.push(ev) },
    });
    const applies = events.filter((e): e is Extract<SimEvent, { kind: 'buffApply' }> => e.kind === 'buffApply');
    expect(applies.length, 'no buff was ever applied').toBeGreaterThan(0);

    const allyHeld = applies.filter((e) => e.targetIdx !== null);
    expect(allyHeld.length, 'no ally-held buff was logged').toBeGreaterThan(0);
    expect(
      allyHeld.every((e) => e.targetSlug !== null && e.targetIdx! >= 0 && e.targetIdx! < 4),
      'an ally-held buff reported a holder outside the 4-unit comp',
    ).toBe(true);

    const bossHeld = applies.filter((e) => e.targetIdx === null);
    expect(
      bossHeld.length,
      'no boss-held debuff in this fixture — the enemy branch is untested; pick a comp with a ' +
        'Damage Taken ▲ debuffer rather than weakening this assertion',
    ).toBeGreaterThan(0);
    expect(
      bossHeld.every((e) => e.targetSlug === null),
      'a boss-held debuff reported a unit slug',
    ).toBe(true);
  });

  it('brackets the Full Burst window — every in-FB instance falls inside a start/end pair', () => {
    // Both boundaries are LEADING markers, so partitioning the stream on [start, end) has to agree
    // with each instance's own inFullBurst flag. The failure this pins is specific: FB-entry
    // stored-hit releases (rapi-red-hood's attached projectiles, srcSlot skill2) resolve INSIDE
    // emitFbEnter, so a trailing fullBurstStart emits after them and a consumer splitting on the
    // marker silently drops them. Measured in this fixture: 27 in-FB instances land on an FB-start
    // frame, 37.7M damage, so the assertion is not vacuous.
    const events: SimEvent[] = [];
    runComp({
      slugs: ['liter', 'crown', 'rapi-red-hood', 'helm'],
      bossElement: 'Fire',
      focusSlug: 'rapi-red-hood',
      cfg: { onEvent: (ev) => events.push(ev) },
    });
    let open = false;
    let seen = 0;
    const orphans: string[] = [];
    for (const e of events) {
      if (e.kind === 'fullBurstStart') open = true;
      else if (e.kind === 'fullBurstEnd') open = false;
      else if (e.kind === 'damage' && e.inFullBurst) {
        seen++;
        if (!open) orphans.push(`${e.slug}/${e.srcSlot}@${e.sec.toFixed(2)}s`);
      }
    }
    expect(seen, 'no in-FB damage at all — the fixture never reached a Full Burst').toBeGreaterThan(0);
    expect(
      orphans.slice(0, 3),
      `${orphans.length} in-FB damage instance(s) fall outside a start/end pair in stream order`,
    ).toEqual([]);
  });

  it('names the SOURCE KIT LINE of every damage instance', () => {
    // `bucket` is the damage CATEGORY — it cannot tell skill1 from skill2, which is what a per-kit-
    // line spec asserts on. Normal fire must say 'normal' and never a skill slot, and vice versa.
    const dmg = of('damage');
    const mismatched = dmg.filter(
      (e) => (e.bucket === 'normal') !== (e.srcSlot === 'normal'),
    );
    expect(
      mismatched.slice(0, 3).map((e) => `${e.slug} bucket=${e.bucket} srcSlot=${e.srcSlot}`),
      'damage instance(s) whose source slot contradicts their bucket',
    ).toEqual([]);
    // null is reserved for the genuinely unattributable (the summed extraHitDamagePct rider);
    // this fixture carries none, so every instance here must name its line.
    expect(dmg.filter((e) => e.srcSlot === null), 'unattributed damage in a fixture with no summed rider').toEqual([]);
  });
});
