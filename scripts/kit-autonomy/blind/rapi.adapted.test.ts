/* eslint-disable @typescript-eslint/no-explicit-any */
// ADAPTED COPY (driver reconciliation, 2026-08-05): pristine blind artifact preserved at
// blind/rapi.test.ts. Structural correction to a blind-writer assumption unverifiable from
// the redacted packet — assertion INTENT unchanged:
//   1. harness import path (the blind dir has no ../lib/harness — the shared harness lives
//      at scripts/tests/lib/harness.js; ../../tests/lib/harness.js from here).
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * rapi — Rapi (AR / Fire / Attacker / Burst III; ammo 60, reload 81f, normal 13.65, core 200).
 * BLIND kit spec test: written from the kit prose alone, run against the SHIPPED override.
 *
 * KIT (structure; short quotes only):
 *   skill1  gate "when attacked 20 time(s)", self: ATK +21.81% for 20 sec.
 *   skill2  target "1 enemy ... highest final ATK": "528.97% of final ATK" + "Taunt for 5 sec".
 *   burst   same enemy target: "657.72% ... Burst Skill damage"; self: ATK +60.75% for 10 sec.
 *
 * FIXTURE — controlComp('rapi', false): liter (B1) + crown (B2) + rapi (B3), fixed-B3 slot dropped
 * so rapi is the SOLE Burst III. Consequence used throughout: every Full Burst in that run is
 * necessarily completed by HER cast, so #fullBurstStart is an exact count of her own burst casts
 * (a lone B3 without a B1+B2 would cast ZERO — hence liter+crown are mandatory). A second run WITH
 * the fixed B3 (two Burst IIIs) exists only to catch a burst-cast line mis-keyed to
 * full-burst-enter, which would over-fire on Full Bursts rapi did not cast.
 *
 * WHY EACH ASSERTION DISCRIMINATES
 *  - Exact-value counterfactual: re-authoring an effect to the LITERAL kit number must leave totals
 *    bit-identical. GREEN iff the shipped magnitude IS the kit magnitude; RED under any fudged,
 *    rounded or absorbed value. Each is paired with a load-bearing run (halved magnitude / 1 s
 *    duration / effect stripped) so the equality can never pass vacuously on a dead block.
 *  - Structural assertions read trigger identity, target set and duration semantics off the
 *    override — the three things a totals-only test cannot see (the per-line questions 2/3/4).
 *  - Event assertions cover engine-side invariants: burst-cast damage lands BEFORE the Full Burst
 *    window (no +50% major) and function-damage riders take no +30% range bonus.
 *
 * FLAGGED (⚑) — outside the input domain, deliberately NOT asserted as a value:
 *   skill1's real trigger ("attacked 20 time(s)") has NO sim primitive at scope lock — the boss
 *   deals no damage to units, so nothing counts incoming hits. Its uptime (none / always-on /
 *   ramped) is a modeling choice, not a kit fact; asserted here only as SHAPE (stat / value /
 *   duration / self target) plus self-scope inertness, with the alternative recorded as a gap.
 *   skill2's cadence is a datamined skill cooldown, not a prose value: the test asserts the trigger
 *   KIND (interval — a damage line with no activation clause) but never a specific period.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'rapi';

// Literal kit numbers.
const S1_ATK_PCT = 21.81;
const S1_DUR_SEC = 20;
const S2_ATK_PCT = 528.97;
const BURST_ATK_PCT = 657.72;
const BURST_BUFF_PCT = 60.75;
const BURST_BUFF_SEC = 10;

type Slot = 'skill1' | 'skill2' | 'burst';

// ---- override readers (tolerant of both documented slot shapes: Block[] and { blocks: Block[] })
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function effectsOf(ov: any, slot: Slot): any[] {
  return blocksOf(ov, slot).flatMap((b: any) =>
    Array.isArray(b?.effects) ? b.effects : [],
  );
}
function blockOfEffect(ov: any, slot: Slot, pred: (e: any) => boolean): any {
  return blocksOf(ov, slot).find((b: any) =>
    (Array.isArray(b?.effects) ? b.effects : []).some(pred),
  );
}
function unmodeledOf(ov: any, slot: Slot): string {
  const u = ov?.unmodeled?.[slot];
  return Array.isArray(u) ? u.join(' | ') : '';
}
const isAtkBuff = (e: any) =>
  e?.kind === 'buff' && String(e?.stat ?? '').startsWith('atk');

// ---- counterfactual mutators (applied to the in-memory clone only)
function setFlat(ov: any, slot: Slot, atkPct: number): void {
  for (const e of effectsOf(ov, slot)) {
    if (e?.kind === 'flatDamage') e.atkPct = atkPct;
  }
}
function setAtkBuff(ov: any, slot: Slot, patch: Record<string, unknown>): void {
  for (const e of effectsOf(ov, slot)) if (isAtkBuff(e)) Object.assign(e, patch);
}
function stripAtkBuff(ov: any, slot: Slot): void {
  for (const b of blocksOf(ov, slot)) {
    if (Array.isArray(b?.effects)) b.effects = b.effects.filter((e: any) => !isAtkBuff(e));
  }
}

// ---- run helpers
function run(opts: any) {
  const evs: any[] = [];
  const o: any = {
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => evs.push(ev as any) },
  };
  const res = runComp(o);
  return { res, evs, t: totals(res) as Record<string, number> };
}
function withOv(mutate: (ov: any) => void) {
  const base: any = controlComp(SLUG, false);
  return {
    ...base,
    overrides: {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate as any),
    },
  };
}

// ---- event selectors
const fbStarts = (evs: any[]) => evs.filter((e) => e.kind === 'fullBurstStart');
const appliesOf = (evs: any[], value: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && Math.abs(Number(e.value) - value) < 0.005,
  );
const dmgOf = (evs: any[], slot: Slot) =>
  evs.filter((e) => e.kind === 'damage' && e.srcSlot === slot);

// ---- hoisted runs (each is a full 180 s sim)
const OV: any = withPatchedOverride(SLUG, () => {});
const R_BASE = run(controlComp(SLUG, false));
const R_TWO_B3 = run(controlComp(SLUG, true));
const R_NO_S1 = run(
  withOv((ov) => {
    blocksOf(ov, 'skill1').length = 0;
  }),
);
const R_S2_KIT = run(withOv((ov) => setFlat(ov, 'skill2', S2_ATK_PCT)));
const R_S2_HALF = run(withOv((ov) => setFlat(ov, 'skill2', S2_ATK_PCT / 2)));
const R_BURST_KIT = run(
  withOv((ov) => {
    setFlat(ov, 'burst', BURST_ATK_PCT);
    setAtkBuff(ov, 'burst', { value: BURST_BUFF_PCT, durationSec: BURST_BUFF_SEC });
  }),
);
const R_BURST_SHORT = run(withOv((ov) => setAtkBuff(ov, 'burst', { durationSec: 1 })));
const R_NO_BURST_BUFF = run(withOv((ov) => stripAtkBuff(ov, 'burst')));

describe('rapi — fixture', () => {
  it('rapi deals damage and the comp actually reaches Full Burst', () => {
    expect(unitOf(R_BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // liter (B1) + crown (B2) exist precisely so the sole B3 can chain; without them: zero.
    expect(fbStarts(R_BASE.evs).length).toBeGreaterThanOrEqual(2);
  });
});

describe('rapi skill1 — self ATK +21.81% for 20 sec', () => {
  it('is authored as a self / atkPct / 21.81 / 20 s buff, or recorded as unmodeled', () => {
    const blocks = blocksOf(OV, 'skill1');
    if (blocks.length === 0) {
      // No silent drops: an unmodelable trigger still has to be written down.
      expect(unmodeledOf(OV, 'skill1').toLowerCase()).toMatch(/atk|21\.81|attack/);
      return;
    }
    const buffs = effectsOf(OV, 'skill1').filter((e) => e?.kind === 'buff');
    expect(buffs.length).toBeGreaterThan(0);
    const m = buffs.find((e) => Math.abs(Number(e.value) - S1_ATK_PCT) < 0.005);
    expect(
      m,
      'skill1 must carry the literal 21.81 value (a haircut/ramp instead is a divergence)',
    ).toBeTruthy();
    expect(m.stat).toBe('atkPct'); // generic self ATK, not a scoped/derived stat
    expect(m.durationSec).toBe(S1_DUR_SEC); // seconds, not rounds/stacks
    const blk = blockOfEffect(OV, 'skill1', (e) => e === m);
    expect(blk?.target?.kind).toBe('self'); // "Affects self" — never allies
  });

  it('is self-scoped: dropping skill1 leaves every teammate byte-identical', () => {
    // ATK% does not feed the per-shot gauge model, so rotation cannot shift here — any teammate
    // movement would mean the buff leaked off self.
    for (const slug of Object.keys(R_BASE.t)) {
      if (slug === SLUG) continue;
      expect(R_NO_S1.t[slug]).toBe(R_BASE.t[slug]);
    }
  });

  it('if modeled at all, it is load-bearing; if not modeled, it moves nothing', () => {
    if (blocksOf(OV, 'skill1').length > 0) {
      expect(R_NO_S1.t[SLUG]).not.toBe(R_BASE.t[SLUG]);
    } else {
      expect(R_NO_S1.t[SLUG]).toBe(R_BASE.t[SLUG]);
    }
  });

  it('every 21.81 application in the log lands on rapi herself, as atkPct', () => {
    for (const ev of appliesOf(R_BASE.evs, S1_ATK_PCT)) {
      expect(ev.targetSlug).toBe(SLUG);
      expect(ev.stat).toBe('atkPct');
      expect(ev.casterIdx).toBe(ev.targetIdx); // self-application, not an ally grant
    }
  });

  it.skip('⚑ trigger fidelity: "attacked 20 time(s)" has no sim primitive — the boss deals no damage at scope lock, so nothing counts incoming hits; uptime (none / always-on / rampSec) is measurement-gated, not derivable from the kit text', () => {
    /* intentionally unasserted */
  });
});

describe('rapi skill2 — 528.97% of final ATK, enemy target, taunt 5 s', () => {
  it('carries the damage line at exactly 528.97% (exact-value counterfactual)', () => {
    const flats = effectsOf(OV, 'skill2').filter((e) => e?.kind === 'flatDamage');
    expect(flats.length).toBeGreaterThanOrEqual(1);
    expect(R_S2_KIT.t[SLUG]).toBe(R_BASE.t[SLUG]);
  });

  it('that magnitude is load-bearing (non-vacuity of the equality above)', () => {
    expect(R_S2_HALF.t[SLUG]).toBeLessThan(R_BASE.t[SLUG]);
  });

  it('fires on an interval — not on burst cast, Full Burst entry or a stage', () => {
    const blk = blockOfEffect(OV, 'skill2', (e) => e?.kind === 'flatDamage');
    expect(blk, 'skill2 must carry a damage block').toBeTruthy();
    // The prose gives the damage line NO activation clause -> interval. Keying it to burstCast /
    // fullBurstEnter ties it to the rotation and over/under-credits whenever rapi does not burst.
    expect(blk.trigger?.kind).toBe('interval');
    expect(blk.target?.kind).toBe('enemy');
  });

  it('is a plain rider: no core, no forced FB exemption', () => {
    for (const e of effectsOf(OV, 'skill2')) {
      if (e?.kind !== 'flatDamage') continue;
      expect(e.core).not.toBe(true); // kit never says "core strike damage"
      expect(e.noFb).not.toBe(true); // riders take Full Burst by landing TIMING (default on)
    }
  });

  it('procs repeatedly over the 180 s fight and never takes the +30% range bonus', () => {
    const procs = dmgOf(R_BASE.evs, 'skill2');
    expect(procs.length).toBeGreaterThanOrEqual(2); // one-shot => not an interval line
    for (const p of procs) {
      expect(p.bucket).toBe('skill'); // skill1/skill2 -> skill bucket
      expect(p.rangeApplied).not.toBe(true);
    }
  });

  it('records the Taunt line as unmodeled (no aggro model; no silent drops)', () => {
    expect(unmodeledOf(OV, 'skill2')).toMatch(/taunt/i);
  });

  it.skip('⚑ Taunt for 5 sec — no primitive: the scope-lock boss deals no damage and there is no aggro/target-selection model, so the line is offensively inert by construction', () => {
    /* intentionally unasserted */
  });
});

describe('rapi burst — 657.72% nuke + self ATK +60.75% for 10 sec', () => {
  it('carries both burst values literally (exact-value counterfactual)', () => {
    const flats = effectsOf(OV, 'burst').filter((e) => e?.kind === 'flatDamage');
    const buffs = effectsOf(OV, 'burst').filter((e) => isAtkBuff(e));
    expect(flats.length).toBeGreaterThanOrEqual(1);
    expect(buffs.length).toBeGreaterThanOrEqual(1);
    expect(R_BURST_KIT.t[SLUG]).toBe(R_BASE.t[SLUG]);
  });

  it('the self buff is keyed to rapi\u2019s OWN burst cast and targets self', () => {
    const blk = blockOfEffect(OV, 'burst', isAtkBuff);
    expect(blk).toBeTruthy();
    // "Affects self" inside the unit\u2019s own burst block => burst-cast. fullBurstEnter would fire
    // on any team Full Burst, over-crediting rotations another Burst III completed.
    expect(blk.trigger?.kind).toBe('burstCast');
    expect(blk.target?.kind).toBe('self');
    const buff = effectsOf(OV, 'burst').find((e) => isAtkBuff(e));
    expect(Math.abs(Number(buff.value) - BURST_BUFF_PCT)).toBeLessThan(0.005);
    expect(buff.durationSec).toBe(BURST_BUFF_SEC); // seconds, not rounds/stacks
    expect(buff.stat).toBe('atkPct');
  });

  it('applies exactly once per Full Burst in the sole-Burst-III fixture, to rapi only', () => {
    const ap = appliesOf(R_BASE.evs, BURST_BUFF_PCT);
    expect(ap.length).toBe(fbStarts(R_BASE.evs).length);
    for (const ev of ap) {
      expect(ev.targetSlug).toBe(SLUG);
      expect(ev.casterIdx).toBe(ev.targetIdx);
      expect(ev.stat).toBe('atkPct');
    }
  });

  it('does not over-fire when a second Burst III shares the rotation', () => {
    // With two B3s some Full Bursts are not rapi\u2019s; a burst-cast line can never exceed the FB
    // count, and a fullBurstEnter mis-key shows up as strictly more applications than her casts.
    expect(appliesOf(R_TWO_B3.evs, BURST_BUFF_PCT).length).toBeLessThanOrEqual(
      fbStarts(R_TWO_B3.evs).length,
    );
  });

  it('the 10 s window is load-bearing (non-vacuity)', () => {
    expect(R_BURST_SHORT.t[SLUG]).toBeLessThan(R_BASE.t[SLUG]);
  });

  it('the self buff moves rapi only — teammates byte-identical without it', () => {
    expect(R_NO_BURST_BUFF.t[SLUG]).toBeLessThan(R_BASE.t[SLUG]);
    for (const slug of Object.keys(R_BASE.t)) {
      if (slug === SLUG) continue;
      expect(R_NO_BURST_BUFF.t[slug]).toBe(R_BASE.t[slug]);
    }
  });

  it('burst damage lands pre-Full-Burst (no +50% major), in the burst bucket, no range, no core', () => {
    const hits = dmgOf(R_BASE.evs, 'burst');
    expect(hits.length).toBe(fbStarts(R_BASE.evs).length); // one nuke per cast, not per shot
    for (const h of hits) {
      expect(h.bucket).toBe('burst');
      expect(h.fbMajorApplied).not.toBe(true); // the cast resolves before the FB window opens
      expect(h.rangeApplied).not.toBe(true);
    }
    for (const e of effectsOf(OV, 'burst')) {
      if (e?.kind === 'flatDamage') expect(e.core).not.toBe(true);
    }
  });
});
