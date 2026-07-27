/**
 * mari (mari) — SR / Electric / Supporter / Burst II — 6 ammo, 60-frame full charge.
 * BLIND kit-spec test: authored from the kit prose alone (no driver test / override / reasoning seen).
 *
 * KIT, line by line (what the prose literally says):
 *   skill1 a) on landing a FULL CHARGE attack, all allies: Damage dealt to Shield +100.09% for 3s
 *   skill1 b) on landing an attack on a CORE, all allies: Pierce Damage +40.99% for 10s
 *   skill2 a) self: Gain Pierce 5s; ATK +30.78% 5s   (NO activation clause -> repeating skill-CD/interval)
 *   skill2 b) all allies: ATK +30.78% OF THE SKILL USER ATK for 5s  (caster-scaled -> flat-resolved)
 *   burst  a) all enemies: 639.36% of final ATK as Burst Skill damage
 *   burst  b) all allies: Attack Damage +40.99% for 10s
 *
 * FIXTURE: controlComp('mari', true) = liter B1 / crown B2 / mari / helm B3, boss Fire, focus mari.
 *   mari is BURST II and the fixture support crown is ALSO Burst II, so stage 2 can be monopolised by
 *   crown and mari may never cast her own burst. Both burst-slot groups are therefore gated on a
 *   COMPUTED MARI_BURSTS flag via it.skipIf, instead of asserting into a vacuum. A skip there is a
 *   FIXTURE limitation (a comp whose only Burst II is mari is needed), NOT an override defect.
 *
 * STATED ASSUMPTION: pierceDamagePct is live for pierce-tagged hits (the gainPierce and
 * flatDamage.pierce schema comments both say Pierce Damage feeds the Damage-Up bucket). Every pierce
 * damage-DIFFERENTIAL assertion rests on that; the event-level pierce assertions do not.
 *
 * FLAG (outside the input domain): skill2 has no activation clause, so its cadence is a datamined
 * value NOT present in the kit text. The tests therefore only assert that the trigger REPEATS across
 * 180s (>= 2 applications) and never pin a specific interval length.
 *
 * Runs are hoisted: 7 x 180s sims total.
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

const SELF_ATK_PCT = 30.78;
const ALLY_CASTER_ATK_PCT = 30.78;
const PIERCE_DMG_PCT = 40.99;
const BURST_ATK_DMG_PCT = 40.99;
const SHIELD_DMG_PCT = 100.09;

const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

function runWithEvents(opts: any): { res: any; events: any[] } {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev);
      },
    },
  });
  return { res, events: events as any[] };
}

// The override FILE is slot-keyed. Tolerate BOTH documented shapes for a slot (a bare Block[] or a
// CharacterSkills carrying .blocks) so a counterfactual can never silently no-op — a no-op patch
// would turn every differential assertion below into a false green.
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : (s.blocks ?? []);
}
function allBlocks(ov: any): any[] {
  return [
    ...blocksOf(ov, 'skill1'),
    ...blocksOf(ov, 'skill2'),
    ...blocksOf(ov, 'burst'),
  ];
}

const base = () => controlComp('mari', true) as any;
const withMari = (patched: any) => ({
  ...base(),
  overrides: { mari: patched },
});

// ---------------------------------------------------------------- control run + event indexing
const CTRL = runWithEvents(base());
const CTRL_T = totals(CTRL.res);
const ROSTER = Object.keys(CTRL_T);
const ALLY_COUNT = ROSTER.length;
const CTRL_BUFFS = CTRL.events.filter((e) => e.kind === 'buffApply');

// mari self ATK buff doubles as the caster-index probe (a self-buff has casterIdx === targetIdx).
const SELF_ATK_BUFFS = CTRL_BUFFS.filter(
  (b) =>
    b.stat === 'atkPct' &&
    near(b.value, SELF_ATK_PCT) &&
    b.targetSlug === 'mari'
);
const MARI_IDX: number | null =
  SELF_ATK_BUFFS[0]?.casterIdx ??
  CTRL_BUFFS.find(
    (b) =>
      b.targetSlug === 'mari' &&
      b.casterIdx !== null &&
      b.casterIdx === b.targetIdx
  )?.casterIdx ??
  null;

// ---------------------------------------------------------------- counterfactual overrides
const NO_GAIN_PIERCE = withPatchedOverride('mari', (ov: any) => {
  for (const b of allBlocks(ov)) {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'gainPierce');
  }
});
const ALWAYS_PIERCE = withPatchedOverride('mari', (ov: any) => {
  ov.hasPierce = true;
});
const SHORT_PIERCE_WINDOW = withPatchedOverride('mari', (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'pierceDamagePct') {
        e.durationSec = 0.5;
      }
    }
  }
});
const ZERO_BURST_NUKE = withPatchedOverride('mari', (ov: any) => {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'flatDamage') {
        e.atkPct = 0;
      }
    }
  }
});
const DOUBLE_BURST_NUKE = withPatchedOverride('mari', (ov: any) => {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'flatDamage') {
        e.atkPct = (e.atkPct ?? 0) * 2;
      }
    }
  }
});
const FLIP_BURST_NOFB = withPatchedOverride('mari', (ov: any) => {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'flatDamage') {
        e.noFb = !e.noFb;
      }
    }
  }
});

const R_NO_GAIN_PIERCE = runWithEvents(withMari(NO_GAIN_PIERCE));
const R_ALWAYS_PIERCE = runWithEvents(withMari(ALWAYS_PIERCE));
const R_SHORT_PIERCE = runWithEvents(withMari(SHORT_PIERCE_WINDOW));
const R_ZERO_BURST = runWithEvents(withMari(ZERO_BURST_NUKE));
const R_DOUBLE_BURST = runWithEvents(withMari(DOUBLE_BURST_NUKE));
const R_FLIP_NOFB = runWithEvents(withMari(FLIP_BURST_NOFB));

// Did mari actually cast her own Burst II in this fixture? Two independent probes: the nuke is
// load-bearing (zeroing it moves her total) OR an attributable burstCast event exists.
const MARI_BURSTS =
  totals(R_ZERO_BURST.res).mari < CTRL_T.mari ||
  CTRL.events.some(
    (e) =>
      e.kind === 'burstCast' && (e.slot ?? e.srcSlot ?? e.unitIdx) === MARI_IDX
  );

// ================================================================ fixture non-vacuity
describe('mari — fixture sanity (non-vacuity)', () => {
  it('mari fires, deals damage, and the comp reaches Full Burst', () => {
    expect(unitOf(CTRL.res, 'mari').totalDamage).toBeGreaterThan(0);
    expect(
      CTRL.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
    expect(ALLY_COUNT).toBeGreaterThanOrEqual(4);
  });

  it('mari is identifiable as a buff caster in the event log', () => {
    expect(MARI_IDX).not.toBeNull();
  });
});

// ================================================================ skill1 a — shield damage
describe('mari — skill1a: full charge -> all allies Damage dealt to Shield +100.09% / 3s', () => {
  it.skip('GAP: no shield-damage primitive — no StatKey for it and the v1 boss has no shield; belongs verbatim in `unmodeled`, not modeled as a generic damage stat', () => {
    // Unobservable payload: nothing in the sim consumes shield damage, so no assertion can
    // discriminate a faithful model from its absence. Recorded rather than approximated.
  });

  it('is not smuggled in as a generic damage buff at the shield magnitude', () => {
    // Nearest-wrong: encoding 100.09% as attackDamagePct / atkPct because the schema has no shield
    // stat. That would inflate the whole team every full charge.
    const smuggled = CTRL_BUFFS.filter(
      (b) => b.casterIdx === MARI_IDX && near(b.value, SHIELD_DMG_PCT, 0.5)
    );
    expect(smuggled).toEqual([]);
  });
});

// ================================================================ skill1 b — pierce damage
describe('mari — skill1b: core hit -> all allies Pierce Damage +40.99% / 10s', () => {
  const pierceBuffs = CTRL_BUFFS.filter((b) => b.stat === 'pierceDamagePct');

  it('fires (the core-hit trigger is exercised) with mari as the sole caster', () => {
    // Non-vacuity: the buff appearing at all IS proof the core-gated trigger fired in this fixture.
    // Nearest-wrong: a boss-held debuff encoding (casterIdx === null).
    expect(pierceBuffs.length).toBeGreaterThan(0);
    expect(new Set(pierceBuffs.map((b) => b.casterIdx))).toEqual(
      new Set([MARI_IDX])
    );
  });

  it('carries the raw kit percentage (a plain percentage stat, never flat-resolved)', () => {
    for (const b of pierceBuffs) {
      expect(near(b.value, PIERCE_DMG_PCT)).toBe(true);
    }
  });

  it('covers every ally, not just self', () => {
    // Nearest-wrong: target self instead of allies — set size would be 1.
    expect(new Set(pierceBuffs.map((b) => b.targetSlug)).size).toBe(ALLY_COUNT);
  });

  it('is time-bounded, not permanent', () => {
    // Nearest-wrong: omitting durationSec (a permanent buff) — expiresFrame would not be finite.
    for (const b of pierceBuffs) {
      expect(Number.isFinite(b.expiresFrame)).toBe(true);
    }
  });

  it('is load-bearing: collapsing the 10s window to 0.5s lowers mari damage', () => {
    // Proves the buff is not inert AND that the window length is doing work (duration semantics).
    expect(totals(R_SHORT_PIERCE.res).mari).toBeLessThan(CTRL_T.mari);
  });
});

// ================================================================ skill2 a — self
describe('mari — skill2a: self Gain Pierce 5s + ATK +30.78% 5s', () => {
  it('grants the self ATK buff as the own-ATK stat, self-targeted, time-bounded', () => {
    // Nearest-wrong: casterAtkPct for the SELF branch (the prose says a plain ATK % here and reserves
    // `of the skill user ATK` for the ally branch) — value would be flat, not 30.78.
    expect(SELF_ATK_BUFFS.length).toBeGreaterThan(0);
    for (const b of SELF_ATK_BUFFS) {
      expect(b.targetSlug).toBe('mari');
      expect(b.casterIdx).toBe(b.targetIdx);
      expect(Number.isFinite(b.expiresFrame)).toBe(true);
    }
  });

  it('repeats across the fight (a cooldown/interval trigger, not a one-shot passive)', () => {
    // The line has NO activation clause and a 5s duration, so it must re-fire on the skill cooldown.
    // Nearest-wrong: trigger `passive` (one apply at frame 0 that then expires forever).
    // The cadence itself is a datamined value absent from the kit text and is deliberately NOT pinned.
    expect(SELF_ATK_BUFFS.length).toBeGreaterThan(1);
  });

  it('does not leak the self-branch ATK buff to teammates', () => {
    // Nearest-wrong: collapsing both skill2 branches into one allies-scoped atkPct 30.78.
    const leaked = CTRL_BUFFS.filter(
      (b) =>
        b.stat === 'atkPct' &&
        near(b.value, SELF_ATK_PCT) &&
        b.targetSlug !== 'mari' &&
        b.casterIdx === MARI_IDX
    );
    expect(leaked).toEqual([]);
  });

  it('Gain Pierce is live: removing the gainPierce effect lowers mari damage', () => {
    // gainPierce emits no event, so the tag can only be observed through her own Pierce Damage bucket
    // (fed by skill1b). Nearest-wrong: dropping the pierce line as `defensive/inert`.
    expect(totals(R_NO_GAIN_PIERCE.res).mari).toBeLessThan(CTRL_T.mari);
  });

  it('Gain Pierce is self-scoped: removing it leaves every teammate byte-identical', () => {
    // Inertness. Nearest-wrong: granting pierce to allies (they would lose damage too).
    for (const slug of ROSTER) {
      if (slug !== 'mari') {
        expect(totals(R_NO_GAIN_PIERCE.res)[slug]).toBe(CTRL_T[slug]);
      }
    }
  });

  it('the pierce window is bounded, not whole-fight', () => {
    // Nearest-wrong: the top-level hasPierce boolean instead of a 5s gainPierce effect — strictly
    // more damage, i.e. an over-credit. GREEN only if the shipped model is the bounded one.
    expect(totals(R_ALWAYS_PIERCE.res).mari).toBeGreaterThan(CTRL_T.mari);
  });
});

// ================================================================ skill2 b — allies
describe('mari — skill2b: all allies ATK +30.78% of the skill user ATK / 5s', () => {
  const casterAtk = CTRL_BUFFS.filter(
    (b) => b.stat === 'casterAtkPct' && b.casterIdx === MARI_IDX
  );

  it('emits a caster-scaled ATK grant to every ally', () => {
    expect(casterAtk.length).toBeGreaterThan(0);
    expect(new Set(casterAtk.map((b) => b.targetSlug)).size).toBe(ALLY_COUNT);
  });

  it('is FLAT-resolved at apply time, not the raw kit percentage', () => {
    // Nearest-wrong: stat atkPct 30.78 to allies (scales each TARGET own ATK — over-credits high-ATK
    // attackers and under-credits supporters). Under that model value === 30.78.
    for (const b of casterAtk) {
      expect(b.value).toBeGreaterThan(1000);
    }
    expect(casterAtk.some((b) => near(b.value, ALLY_CASTER_ATK_PCT))).toBe(
      false
    );
  });

  it('resolves to ONE identical flat value across targets, implying a plausible caster ATK', () => {
    // Caster-scaled => every ally receives the same flat number, derived from mari static ATK only.
    const vals = new Set(casterAtk.map((b) => Math.round(b.value)));
    expect(vals.size).toBe(1);
    const impliedCasterAtk = [...vals][0] / (ALLY_CASTER_ATK_PCT / 100);
    expect(impliedCasterAtk).toBeGreaterThan(10000);
    expect(impliedCasterAtk).toBeLessThan(600000);
  });

  it('re-applies over the fight, matching the self branch cadence', () => {
    expect(new Set(casterAtk.map((b) => b.expiresFrame)).size).toBeGreaterThan(
      1
    );
  });
});

// ================================================================ burst a — 639.36% nuke
describe('mari — burst a: 639.36% of final ATK to all enemies', () => {
  it.skipIf(!MARI_BURSTS)(
    'is live and LINEAR in atkPct (the magnitude is load-bearing)',
    () => {
      // Formula-agnostic magnitude proof: zero / 1x / 2x must produce equal deltas.
      const b0 = totals(R_ZERO_BURST.res).mari;
      const b2 = totals(R_DOUBLE_BURST.res).mari;
      expect(CTRL_T.mari).toBeGreaterThan(b0);
      const d1 = CTRL_T.mari - b0;
      const d2 = b2 - CTRL_T.mari;
      expect(Math.abs(d2 - d1) / d1).toBeLessThan(0.02);
    }
  );

  it.skipIf(!MARI_BURSTS)(
    'resolves OUTSIDE Full Burst — flipping noFb moves nothing',
    () => {
      // Burst-cast damage lands before the Full Burst window opens, so the +50% major cannot apply and
      // the noFb flag must be inert. If this moves, the nuke is resolving inside FB — a real finding.
      expect(
        Math.abs(totals(R_FLIP_NOFB.res).mari - CTRL_T.mari) / CTRL_T.mari
      ).toBeLessThan(1e-9);
    }
  );

  it.skipIf(!MARI_BURSTS)(
    'is enemy-scoped: zeroing it leaves every teammate byte-identical',
    () => {
      for (const slug of ROSTER) {
        if (slug !== 'mari') {
          expect(totals(R_ZERO_BURST.res)[slug]).toBe(CTRL_T[slug]);
        }
      }
    }
  );
});

// ================================================================ burst b — Attack Damage +40.99%
describe('mari — burst b: all allies Attack Damage +40.99% / 10s', () => {
  const atkDmg = CTRL_BUFFS.filter(
    (b) =>
      b.stat === 'attackDamagePct' &&
      near(b.value, BURST_ATK_DMG_PCT) &&
      b.casterIdx === MARI_IDX
  );

  it.skipIf(!MARI_BURSTS)(
    'applies attackDamagePct at the kit magnitude to every ally',
    () => {
      expect(atkDmg.length).toBeGreaterThan(0);
      expect(new Set(atkDmg.map((b) => b.targetSlug)).size).toBe(ALLY_COUNT);
    }
  );

  it.skipIf(!MARI_BURSTS)('is time-bounded (10s window), not permanent', () => {
    for (const b of atkDmg) {
      expect(Number.isFinite(b.expiresFrame)).toBe(true);
    }
  });

  it.skipIf(!MARI_BURSTS)(
    'is the Damage-Up stat, not a mis-scoped ATK buff',
    () => {
      // Nearest-wrong: `Attack damage` read as ATK. Different bucket, different dilution.
      const misScoped = CTRL_BUFFS.filter(
        (b) =>
          b.casterIdx === MARI_IDX &&
          b.stat === 'atkPct' &&
          near(b.value, BURST_ATK_DMG_PCT)
      );
      expect(misScoped).toEqual([]);
    }
  );
});
