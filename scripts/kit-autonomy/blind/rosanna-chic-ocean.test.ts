/**
 * rosanna-chic-ocean — Rosanna: Chic Ocean (AR / Wind / Supporter / Burst II)
 *
 * BLIND post-op spec test: written from the kit prose ALONE (no sight of the driver's
 * override, tests, or reasoning). One assertion group per kit line.
 *
 * KIT — structural read (header / scope clause / stat keyword before the arrow):
 *   skill1 #1  "Activates at the start of battle" + "Affects all allies" +
 *              "Damage to Parts \u25b2 24.26%" for 15 sec
 *              -> ally buff, stat partsDamagePct. Parsed-but-INERT in v1 (partless boss).
 *   skill1 #2  "Activates when an ally or self destroys an enemy's part" + allies +
 *              "ATK \u25b2 3% of the skill user's ATK", 5 stacks, 30 sec
 *              -> GAP: there is no part-destruction TriggerDef primitive, AND the scope-lock
 *                 boss has no parts, so the real trigger can never fire. Belongs in
 *                 `unmodeled`; proxying it to any live trigger OVER-CREDITS the whole team.
 *   skill2 #1  no activation clause + allies + "Damage to Parts \u25b2 24.26%" 15 sec
 *              -> a SECOND, independent parts source (same magnitude, different slot). Inert.
 *   skill2 #2  "Affects the enemy nearest to the crosshair" + 70.4% of final ATK as
 *              SUSTAINED damage "every 1 sec for 15 sec", NO activation clause
 *              -> maintained DoT: intervalSec 1, flavor 'sustained', one instance at a time.
 *                 \u2691 the RE-FIRE cadence is not in the kit text (skill cooldown); what the text
 *                 does pin is (a) 1 tick/sec, (b) the line is a standing skill, not a one-shot,
 *                 and (c) it must NOT stack instances on itself.
 *   burst  #1  allies + "Sustained Damage \u25b2 20.32%" for 10 sec -> sustainedDamagePct, burstCast
 *   burst  #2  "Affects all enemies" + "Damage Taken \u25b2 32.23%" for 10 sec -> boss debuff, so the
 *                 benefit is TEAM-WIDE (not a self/ally ATK buff).
 *
 * FIXTURE: controlComp(SLUG, true) -> liter (B1) / crown (B2) / carry / helm (B3), so a burst
 * chain completes. rosanna-chic-ocean is Burst II and therefore competes with crown for stage 2;
 * the non-vacuity test below proves her burst actually casts before any burst-slot assertion is
 * trusted (a RED there is a FIXTURE diagnosis, not a kit-model finding).
 *
 * Counterfactuals are built with withPatchedOverride (committed JSON untouched) and every run is
 * hoisted — 6 full 180s sims total.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'rosanna-chic-ocean';

// kit magnitudes, read literally off the prose
const PARTS_PCT = 24.26;
const SUSTAINED_PCT = 20.32;
const DMG_TAKEN_PCT = 32.23;

interface Run {
  res: ReturnType<typeof runComp>;
  events: any[];
  tot: Record<string, number>;
}

function run(overrides?: Record<string, unknown>): Run {
  const events: any[] = [];
  const base = controlComp(SLUG, true) as any;
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  };
  if (overrides) {
    opts.overrides = { ...(base.overrides ?? {}), ...overrides };
  }
  const res = runComp(opts);
  return { res, events, tot: totals(res) };
}

// The override FILE is slot-keyed; the two documented shapes for a slot are a bare Block[]
// and a CharacterSkills carrying its own blocks[]. Handle both, and mutate IN PLACE so the
// patch lands whichever shape the clone has.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s;
  }
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return (['skill1', 'skill2', 'burst'] as const).flatMap((s) =>
    slotBlocks(ov, s)
  );
}

const dmg = (evs: any[]) => evs.filter((e) => e.kind === 'damage');
const buffs = (evs: any[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(e.value - value) < 0.01)
  );
const rel = (after: number, before: number) => (after - before) / before;

// ---- counterfactual overrides -------------------------------------------------------------

// Parts buffs blown up 400x: if partsDamagePct were wired to a live damage path, totals move.
const OV_PARTS_BOOST = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'partsDamagePct') {
        e.value = PARTS_PCT * 400;
      }
    }
  }
});

// DoT deleted: the damage-event COUNT delta vs base IS the tick count (slot-attribution free).
const OV_NO_DOT = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (Array.isArray(b.effects)) {
      b.effects = b.effects.filter((e: any) => e.kind !== 'dot');
    }
  }
});

// Boss debuff deleted.
const OV_NO_DMG_TAKEN = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (Array.isArray(b.effects)) {
      b.effects = b.effects.filter(
        (e: any) => !(e.kind === 'buff' && e.stat === 'damageTakenPct')
      );
    }
  }
});

// Sustained Damage buff blown up: must move sustained-flavored damage ONLY.
const OV_SUSTAINED_BOOST = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') {
        e.value = 400;
      }
    }
  }
});

// Sustained Damage window stretched 10s -> 120s: discriminates "for 10 sec" from permanent.
const OV_SUSTAINED_LONG = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') {
        e.durationSec = 120;
      }
    }
  }
});

// ---- hoisted runs (6 x 180s) --------------------------------------------------------------

const BASE = run();
const PARTS = run({ [SLUG]: OV_PARTS_BOOST });
const NODOT = run({ [SLUG]: OV_NO_DOT });
const NODT = run({ [SLUG]: OV_NO_DMG_TAKEN });
const SUSBOOST = run({ [SLUG]: OV_SUSTAINED_BOOST });
const SUSLONG = run({ [SLUG]: OV_SUSTAINED_LONG });

const ALLIES = Object.keys(BASE.tot);
const TEAMMATES = ALLIES.filter((s) => s !== SLUG);

describe('rosanna-chic-ocean — fixture sanity', () => {
  it('the carry is in the comp and deals damage', () => {
    expect(ALLIES).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // 4-unit control comp: liter / crown / carry / helm
    expect(ALLIES.length).toBe(4);
  });
});

describe('skill1 #1 + skill2 #1 — "Damage to Parts \u25b2 24.26%" x2, all allies, 15 sec', () => {
  const applies = buffs(BASE.events, 'partsDamagePct', PARTS_PCT);

  it('lands on EVERY ally (scope = all allies, self included)', () => {
    // Nearest-wrong: self-only or excludeSelf scoping -> coverage set is short.
    expect(applies.length).toBeGreaterThan(0);
    const covered = new Set(applies.map((e) => e.targetSlug));
    for (const s of ALLIES) {
      expect(covered.has(s)).toBe(true);
    }
  });

  it('BOTH parts lines are encoded — no silent drop of the duplicate source', () => {
    // The kit carries the SAME magnitude twice (skill1 and skill2). Two ally-wide sources =>
    // at least 2 applications per ally. Nearest-wrong: one line dropped as "already covered"
    // -> exactly one apply per ally. (Bookkeeping check: partsDamagePct is damage-inert, so a
    // RED here is a completeness divergence, not a damage error.)
    expect(applies.length).toBeGreaterThanOrEqual(2 * ALLIES.length);
  });

  it('is damage-inert on the partless scope-lock boss', () => {
    // Nearest-wrong: encoded as attackDamagePct / trueDamagePct "because parts are inert anyway"
    // -> a 400x boost would explode the board. Faithful: partsDamagePct moves nothing.
    for (const s of ALLIES) {
      expect(PARTS.tot[s]).toBe(BASE.tot[s]);
    }
  });
});

describe('skill1 #2 — part-destruction ATK stacks (GAP)', () => {
  it.skip('GAP: "ATK \u25b2 3% of the skill user\'s ATK", 5 stacks, 30 sec — trigger is "an ally or self destroys an enemy\'s part". No part-destruction TriggerDef primitive exists and the scope-lock boss is partless, so the payload is structurally unobservable; it belongs in `unmodeled`.', () => {
    /* unreachable by construction */
  });

  it('is NOT proxied onto a live trigger (no over-credit)', () => {
    // Her casterIdx is identified from her own 24.26% parts applies (a magnitude no other
    // control-comp unit carries). Nearest-wrong: the stack line keyed to fullBurstEnter /
    // hitCount / passive-at-cap -> a caster-scaled ATK grant from HER index appears.
    const partsApplies = buffs(BASE.events, 'partsDamagePct', PARTS_PCT);
    expect(partsApplies.length).toBeGreaterThan(0);
    const rosIdx = partsApplies[0].casterIdx;
    expect(rosIdx === null || rosIdx === undefined).toBe(false);

    const fromHer = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === rosIdx &&
        (e.stat === 'casterAtkPct' ||
          e.stat === 'atkPct' ||
          e.stat === 'highestAllyAtkPct')
    );
    expect(fromHer).toEqual([]);
  });
});

describe('skill2 #2 — 70.4% of final ATK sustained, every 1 sec for 15 sec, nearest enemy', () => {
  const dotTicks = dmg(BASE.events).length - dmg(NODOT.events).length;

  it('ticks ~1/sec and is MAINTAINED across the fight, without stacking instances', () => {
    // The DoT-removal counterfactual makes the tick count slot-attribution-free.
    // Nearest-wrong #1: read as a ONE-SHOT 15s DoT (passive, fires once) -> ~15 ticks.
    // Nearest-wrong #2: repeating trigger + 15s duration that MULTIPLIES (the engine never
    //   dedups DoT instances) -> many hundreds/thousands of ticks.
    // Faithful (maintained, one instance at a time, 180s fight): ~150-180 ticks.
    expect(dotTicks).toBeGreaterThanOrEqual(100);
    expect(dotTicks).toBeLessThanOrEqual(200);
  });

  it('the DoT is real damage on her own row, and inert on teammates', () => {
    // Nearest-wrong: DoT authored on the wrong owner / as an ally-wide effect.
    expect(NODOT.tot[SLUG]).toBeLessThan(BASE.tot[SLUG]);
    expect(rel(NODOT.tot[SLUG], BASE.tot[SLUG])).toBeLessThan(-0.01);
    for (const s of TEAMMATES) {
      expect(NODOT.tot[s]).toBe(BASE.tot[s]);
    }
  });

  it('is SUSTAINED-flavored — her own "Sustained Damage \u25b2" moves it', () => {
    // Cross-line discriminator: the only sustained-flavored damage in the comp is this DoT,
    // and the only sustainedDamagePct source is her burst. Nearest-wrong: DoT written with no
    // flavor (or flavor 'true'/'distributed') -> a 400% Sustained Damage buff moves nothing.
    expect(SUSBOOST.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
    expect(rel(SUSBOOST.tot[SLUG], BASE.tot[SLUG])).toBeGreaterThan(0.01);
  });
});

describe('burst — Sustained Damage \u25b2 20.32% (allies) + Damage Taken \u25b2 32.23% (all enemies), 10 sec', () => {
  const dtApplies = BASE.events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === 'damageTakenPct' &&
      Math.abs(e.value - DMG_TAKEN_PCT) < 0.01
  );
  const susApplies = buffs(BASE.events, 'sustainedDamagePct', SUSTAINED_PCT);

  it('NON-VACUITY: she is Burst II and actually casts in this fixture', () => {
    // She shares stage 2 with crown. If this is RED, every burst assertion below is vacuous
    // and the FIXTURE is at fault (needs a comp where she owns stage 2), not the kit model.
    expect(dtApplies.length).toBeGreaterThan(0);
    expect(susApplies.length).toBeGreaterThan(0);
  });

  it('"Damage Taken \u25b2 32.23%" is a BOSS debuff (null caster + null target)', () => {
    // Nearest-wrong: modeled as an ally-side attackDamagePct -> it would carry a real
    // casterIdx/targetIdx and would not be boss-held.
    for (const e of dtApplies) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it('the boss debuff benefits the WHOLE team, not one unit', () => {
    // Nearest-wrong (taxonomy 4): "Damage Taken \u25b2" read as a self/caster buff -> only her row
    // moves. Faithful: removing it costs EVERY ally damage.
    for (const s of ALLIES) {
      expect(NODT.tot[s]).toBeLessThan(BASE.tot[s]);
    }
  });

  it('"Sustained Damage \u25b2 20.32%" lands on all allies at its raw percentage', () => {
    // Plain percentage stat -> value stays 20.32 (not flat-resolved like casterAtkPct).
    // Nearest-wrong: self-only scope -> coverage set is short.
    const covered = new Set(susApplies.map((e) => e.targetSlug));
    for (const s of ALLIES) {
      expect(covered.has(s)).toBe(true);
    }
  });

  it('is SCOPED to sustained damage — teammates (no sustained damage) do not move', () => {
    // Nearest-wrong: encoded as generic attackDamagePct -> a 400% boost would lift liter/crown/
    // helm too. Faithful: only her sustained DoT is eligible.
    for (const s of TEAMMATES) {
      expect(Math.abs(rel(SUSBOOST.tot[s], BASE.tot[s]))).toBeLessThan(0.001);
    }
  });

  it('duration is a 10-SECOND wall-clock window, not permanent', () => {
    // Stretching the window 10s -> 120s must ADD sustained-boosted DoT ticks.
    // Nearest-wrong: authored with no durationSec (permanent) -> imposing 120s cannot increase
    // her total (it can only cap an already-permanent buff).
    expect(SUSLONG.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
  });
});
