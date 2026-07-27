/**
 * red-hood — BLIND per-line kit spec test (S5). Written from the kit prose ALONE;
 * the driver override / driver tests / driver reasoning were not consulted.
 *
 * KIT (Red Hood, SR/Iron/Attacker/Burst Lambda, cd 40s, ammo 6, chargeFrames 60):
 *   S1a  on normal attack, self: Charge Speed +3.81%, up to 10 stacks, 5 sec.
 *   S1b  start of battle, self: excess Charge Speed over 100% converts to Charge Damage at 240%.
 *   S2a  start of battle, self: Pierce continuously.
 *   S2b  during Beast Cage (burst step 1), all allies: DEF +50.68% of the user DEF, 10 sec.
 *   S2c  during The Last Howl (step 2), self: recovers 23.04% of attack damage as HP over 10 sec.
 *   S2d  when casting Red Wolf (step 3), self: ATK +71.42%, 10 sec.
 *   B-1  (step 1) allies: ATK +77.55% of the user ATK 10s; self: Burst CD -40s, once per battle.
 *   B-2  (step 2) self: Attract/taunt 10s; Incoming healing +74.88% 10s; Burst CD -40s once/battle.
 *   B-3  (step 3) self: weapon swap 51.46% of final ATK, Full Charge 250% of damage, 10 sec;
 *        Pierce range +100% 10s; Charge Speed +100.8% 10s.
 *
 * FIXTURE: controlComp('red-hood', true) = liter B1 / crown B2 / red-hood Lambda / helm B3.
 *   A Lambda unit with a B1 and a B2 present fills stage 3, so this fixture exercises the
 *   RED WOLF branch only. The Beast Cage / Last Howl branches are therefore asserted
 *   STRUCTURALLY (override shape) plus at runtime as INERT — that inertness IS the
 *   stage-gate discriminator (an ungated step-1/step-2 model would fire them here).
 *   helm is kept deliberately: she is the OTHER stage-3 caster, so full bursts strictly
 *   outnumber Red Wolf casts and burstCast-vs-fullBurstEnter becomes discriminable.
 *
 * INSTRUMENTS: buffApply events are the only well-specified per-unit channel here, so the
 *   Red Wolf cast counter is derived from her own ATK +71.42% self-apply rather than from
 *   burstCast event internals.
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

const SLUG = 'red-hood';
const CHARGE_DMG_STATS = ['chargeDamagePct', 'chargeDamageMultPct'];

type Ev = any;

// ---------------------------------------------------------------- override-shape helpers
// The committed override is read through a no-op patch clone (disk untouched).
const OV: any = withPatchedOverride(SLUG, () => {});

function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  // tolerate both authored shapes: slot -> Block[] and slot -> { blocks: Block[] }
  return Array.isArray(s) ? s : Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}
function effs(b: any): any[] {
  return Array.isArray(b?.effects) ? b.effects : [];
}
function pairs(ov: any): Array<{ block: any; effect: any }> {
  const out: Array<{ block: any; effect: any }> = [];
  for (const b of allBlocks(ov)) {
    for (const e of effs(b)) {
      out.push({ block: b, effect: e });
    }
  }
  return out;
}
function unmodeledText(ov: any): string {
  const u = ov?.unmodeled ?? {};
  return (['skill1', 'skill2', 'burst'] as const)
    .flatMap((s) => u[s] ?? [])
    .join(' | ');
}
const stageOf = (b: any) => b?.trigger?.stage;
const near = (a: number, b: number, tol = 0.02) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

// ---------------------------------------------------------------- run helpers
function runWith(patch?: any) {
  const base: any = controlComp(SLUG, true);
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  };
  if (patch) {
    opts.overrides = { ...(base.overrides ?? {}), [SLUG]: patch };
  }
  const res = runComp(opts);
  const tot = totals(res);
  return { res, events, tot, self: tot[SLUG] };
}
const applies = (events: Ev[]) => events.filter((e) => e.kind === 'buffApply');
function rhIdxOf(events: Ev[]): number {
  const e = applies(events).find(
    (b) => b.targetSlug === SLUG && typeof b.targetIdx === 'number'
  );
  return e ? (e.targetIdx as number) : -1;
}
function selfApplies(events: Ev[]) {
  const i = rhIdxOf(events);
  return applies(events).filter(
    (b) => b.targetSlug === SLUG && b.casterIdx === i
  );
}

// ---------------------------------------------------------------- hoisted runs (7 sims)
const BASE = runWith();
const RH = rhIdxOf(BASE.events);
const SELF = selfApplies(BASE.events);
const RED_WOLF_CASTS = SELF.filter(
  (b) => b.stat === 'atkPct' && near(b.value, 71.42)
).length;
const FB_STARTS = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;
const MATES = Object.keys(BASE.tot).filter((s) => s !== SLUG);

const NO_STACK_SPEED = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'chargeSpeedPct' &&
        near(effect.value, 3.81)
      ) {
        effect.value = 0;
      }
    }
  })
);
const NO_STACKING = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'chargeSpeedPct' &&
        near(effect.value, 3.81)
      ) {
        effect.maxStacks = 1;
      }
    }
  })
);
const NO_CHARGE_DMG = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (effect.kind === 'buff' && CHARGE_DMG_STATS.includes(effect.stat)) {
        effect.value = 0;
        delete effect.perResource;
      }
    }
  })
);
const NO_RED_WOLF_ATK = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'atkPct' &&
        near(effect.value, 71.42)
      ) {
        effect.value = 0;
      }
    }
  })
);
const NO_SWAP_DMG = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (effect.kind === 'weaponSwap') {
        effect.damagePct = 0;
      }
    }
  })
);
const NO_BURST_SPEED = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'chargeSpeedPct' &&
        near(effect.value, 100.8)
      ) {
        effect.value = 0;
      }
    }
  })
);

// ================================================================= tests
describe('red-hood — fixture sanity / non-vacuity', () => {
  it('the control comp resolves her and she deals damage', () => {
    expect(
      RH,
      'no buffApply targeted red-hood; her slot index is unresolvable'
    ).toBeGreaterThanOrEqual(0);
    expect(Object.keys(BASE.tot)).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('she casts Red Wolf at least once, and full bursts OUTNUMBER her casts', () => {
    // Non-vacuity for every step-3 assertion below, AND the precondition that makes
    // burstCast (fires only when SHE bursts) discriminable from fullBurstEnter
    // (fires on every team full burst, incl. the ones helm closes).
    expect(
      RED_WOLF_CASTS,
      'Red Wolf branch never fired — every step-3 assertion would be vacuous'
    ).toBeGreaterThanOrEqual(1);
    expect(FB_STARTS).toBeGreaterThan(RED_WOLF_CASTS);
  });

  it('the override carries all three slots and no ignored-effect blocks', () => {
    expect(
      slotBlocks(OV, 'skill1').length +
        slotBlocks(OV, 'skill2').length +
        slotBlocks(OV, 'burst').length
    ).toBeGreaterThan(0);
    expect(pairs(OV).filter((p) => p.effect.kind === 'ignored')).toHaveLength(
      0
    );
  });
});

describe('S1a — Charge Speed +3.81%, 10 stacks, 5 sec, on normal attack (self)', () => {
  const hits = SELF.filter(
    (b) => b.stat === 'chargeSpeedPct' && near(b.value, 3.81)
  );

  it('is a chargeSpeedPct stack buff, not charge DAMAGE', () => {
    // Nearest-wrong: 3.81 authored as chargeDamagePct (a damage bucket) instead of a
    // cadence stat — it would never change her shot count.
    expect(hits.length, 'no self chargeSpeedPct 3.81 applies').toBeGreaterThan(
      0
    );
    for (const h of hits) {
      expect(h.stat).toBe('chargeSpeedPct');
    }
  });

  it('re-applies per normal attack rather than sitting at max as a passive', () => {
    // Nearest-wrong: one start-of-battle passive authored at 38.1% (10 stacks pre-applied).
    // That model emits exactly ONE apply and skips the opening ramp entirely.
    expect(hits.length).toBeGreaterThan(50);
  });

  it('caps at 10 stacks and actually reaches the cap', () => {
    for (const h of hits) {
      expect(h.maxStacks).toBe(10);
    }
    const peak = Math.max(...hits.map((h) => Number(h.stacks ?? 0)));
    expect(peak).toBe(10);
  });

  it('is time-bounded (5 sec), not a round-count or permanent window', () => {
    // Duration-semantics check: the kit says sec, so durationShots must be absent.
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'chargeSpeedPct' &&
        near(p.effect.value, 3.81)
    );
    expect(
      e,
      'the 3.81 charge-speed stack buff is not in the override'
    ).toBeTruthy();
    expect(e!.effect.durationSec).toBeCloseTo(5, 3);
    expect(e!.effect.durationShots).toBeUndefined();
  });

  it('is self-scoped — no ally receives it', () => {
    const leaked = applies(BASE.events).filter(
      (b) =>
        near(b.value, 3.81) &&
        b.stat === 'chargeSpeedPct' &&
        b.targetSlug !== SLUG
    );
    expect(leaked).toHaveLength(0);
  });

  it('is load-bearing: zeroing it lowers her damage (charge speed gates shots fired)', () => {
    expect(NO_STACK_SPEED.self).toBeLessThan(BASE.self);
  });

  it('the STACKING is load-bearing: capping at 1 stack lowers her damage', () => {
    // Nearest-wrong: maxStacks omitted / 1 — the classic stack drop.
    expect(NO_STACKING.self).toBeLessThan(BASE.self);
  });
});

describe('S1b — excess Charge Speed over 100% converts to Charge Damage at 240%', () => {
  const cd = pairs(OV).filter(
    (p) => p.effect.kind === 'buff' && CHARGE_DMG_STATS.includes(p.effect.stat)
  );
  const dynamic = cd.some((p) => p.effect.perResource);
  const effective = cd
    .filter((p) => !p.effect.perResource)
    .map((p) => Number(p.effect.value) * Number(p.effect.maxStacks ?? 1));

  it('the conversion is modeled at all (self charge-damage buff present and live)', () => {
    expect(
      cd.length,
      'no chargeDamagePct/chargeDamageMultPct buff — the 240% conversion is dropped'
    ).toBeGreaterThan(0);
    const live = SELF.filter((b) => CHARGE_DMG_STATS.includes(b.stat));
    expect(
      live.length,
      'the conversion block never fires in the fixture'
    ).toBeGreaterThan(0);
  });

  it('the passive tier converts the STACK excess at 240%, not 1:1', () => {
    // 10 stacks x 3.81 = 38.1 excess -> 240% x 38.1 = 91.44 charge damage.
    // Nearest-wrong: a 1:1 conversion (38.1) or crediting the raw stack value.
    // Banded because a per-stack encoding (9.144 x 10 stacks) is equally faithful.
    if (dynamic) {
      expect(cd.length).toBeGreaterThan(0);
      return;
    }
    expect(
      effective.some((v) => v >= 40 && v <= 110),
      `charge-damage tiers seen: ${effective.join(', ')} — expected one near 91.44 (240% of 38.1)`
    ).toBe(true);
  });

  it('the Red Wolf +100.8% charge speed is ALSO converted', () => {
    // The step-3 buff pushes excess to 138.9% -> the conversion should add ~241.92
    // (or read ~333.36 combined). Nearest-wrong: converting only the S1a stacks and
    // silently ignoring the burst charge-speed contribution.
    if (dynamic) {
      expect(cd.length).toBeGreaterThan(0);
      return;
    }
    expect(
      effective.some((v) => v >= 150 && v <= 400),
      `charge-damage tiers seen: ${effective.join(', ')} — expected one near 241.92 or 333.36`
    ).toBe(true);
  });

  it('is load-bearing, and moves NO teammate (pure damage bucket, no gauge effect)', () => {
    expect(NO_CHARGE_DMG.self).toBeLessThan(BASE.self);
    for (const m of MATES) {
      expect(NO_CHARGE_DMG.tot[m]).toBe(BASE.tot[m]);
    }
  });
});

describe('S2a — Gain Pierce continuously (self, start of battle)', () => {
  it('pierce is whole-fight, not a timed window', () => {
    // Nearest-wrong: a gainPierce with durationSec 10 hung off the burst, which would
    // leave her un-pierced for most of the fight.
    const gp = pairs(OV).filter((p) => p.effect.kind === 'gainPierce');
    const flagged = OV?.hasPierce === true;
    expect(
      flagged || gp.length > 0,
      'continuous Pierce is not modeled (no hasPierce flag, no gainPierce effect)'
    ).toBe(true);
    if (!flagged) {
      const continuous = gp.filter(
        (p) =>
          p.effect.durationSec === undefined &&
          p.block?.trigger?.kind === 'passive'
      );
      expect(
        continuous.length,
        'gainPierce is present but time-boxed / non-passive; the kit says continuously'
      ).toBeGreaterThan(0);
    }
  });
});

describe('S2b — Beast Cage: DEF +50.68% of the user DEF, all allies, 10s (step 1)', () => {
  it('is stage-1 gated or explicitly recorded as unmodeled — never silently dropped', () => {
    const def = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'defPct' &&
        near(p.effect.value, 50.68, 0.5)
    );
    const ledger = /def/i.test(unmodeledText(OV));
    expect(
      Boolean(def) || ledger,
      'the Beast Cage DEF line is neither modeled nor listed in unmodeled'
    ).toBe(true);
    if (def) {
      expect(def.block?.trigger?.kind).toBe('burstCast');
      expect(
        stageOf(def.block),
        'the DEF grant must be gated to burst step 1 (Beast Cage)'
      ).toBe(1);
      expect(def.effect.durationSec).toBeCloseTo(10, 3);
    }
  });

  it('is offensively inert in v1 (self DEF does not feed damage)', () => {
    const zeroDef = runWith(
      withPatchedOverride(SLUG, (ov: any) => {
        for (const { effect } of pairs(ov)) {
          if (effect.kind === 'buff' && effect.stat === 'defPct') {
            effect.value = 0;
          }
        }
      })
    );
    expect(zeroDef.self).toBe(BASE.self);
    for (const m of MATES) {
      expect(zeroDef.tot[m]).toBe(BASE.tot[m]);
    }
  });
});

describe('S2c — The Last Howl: recovers 23.04% of attack damage as HP over 10s (step 2)', () => {
  it('is a SELF heal gated to burst step 2', () => {
    // Nearest-wrong #1: target allies — that would fire crown on-recovery triggers and
    // manufacture team damage this kit line never grants.
    // Nearest-wrong #2: ungated, so it fires on her step-3 rotations too.
    const heal = pairs(OV).find((p) => p.effect.kind === 'heal');
    const ledger = /recover/i.test(unmodeledText(OV));
    expect(
      Boolean(heal) || ledger,
      'the Last Howl recovery line is neither modeled nor listed in unmodeled'
    ).toBe(true);
    if (heal) {
      expect(heal.block?.target?.kind).toBe('self');
      expect(heal.block?.trigger?.kind).toBe('burstCast');
      expect(stageOf(heal.block)).toBe(2);
    }
  });
});

describe('S2d — Red Wolf: ATK +71.42% self for 10s (step 3)', () => {
  it('applies to HER only, at her own burst cast', () => {
    const hits = SELF.filter(
      (b) => b.stat === 'atkPct' && near(b.value, 71.42)
    );
    expect(hits.length).toBe(RED_WOLF_CASTS);
    expect(RED_WOLF_CASTS).toBeGreaterThanOrEqual(1);
    const leaked = applies(BASE.events).filter(
      (b) =>
        b.stat === 'atkPct' && near(b.value, 71.42) && b.targetSlug !== SLUG
    );
    expect(
      leaked,
      'ATK +71.42% leaked to an ally; the kit scopes it to self'
    ).toHaveLength(0);
  });

  it('is keyed to burstCast stage 3, NOT to full-burst entry', () => {
    // Discriminator: helm also closes stage 3, so FB_STARTS > RED_WOLF_CASTS. A
    // fullBurstEnter keying would fire on helm rotations too and over-credit.
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'atkPct' &&
        near(p.effect.value, 71.42)
    );
    expect(e, 'the Red Wolf ATK buff is not in the override').toBeTruthy();
    expect(e!.block?.trigger?.kind).toBe('burstCast');
    expect(stageOf(e!.block)).toBe(3);
    expect(e!.effect.durationSec).toBeCloseTo(10, 3);
    expect(RED_WOLF_CASTS).toBeLessThan(FB_STARTS);
  });

  it('is load-bearing and moves no teammate', () => {
    expect(NO_RED_WOLF_ATK.self).toBeLessThan(BASE.self);
    for (const m of MATES) {
      expect(NO_RED_WOLF_ATK.tot[m]).toBe(BASE.tot[m]);
    }
  });
});

describe('Burst step 1 — ATK +77.55% of the skill user ATK, all allies, 10s', () => {
  it('is a CASTER-scaled ally grant gated to step 1', () => {
    // Nearest-wrong: atkPct (scales each ally OWN ATK) instead of casterAtkPct (flat add
    // off her ATK) — a completely different magnitude on low-ATK supports.
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'casterAtkPct' &&
        near(p.effect.value, 77.55)
    );
    expect(
      e,
      'no casterAtkPct 77.55 ally grant found for Beast Cage'
    ).toBeTruthy();
    expect(e!.block?.target?.kind).toBe('allies');
    expect(e!.block?.trigger?.kind).toBe('burstCast');
    expect(stageOf(e!.block)).toBe(1);
    expect(e!.effect.durationSec).toBeCloseTo(10, 3);
  });

  it('never fires in this fixture — she takes step 3, so the ally ATK grant stays inert', () => {
    // The stage gate is what is under test: an ungated model would buff the team here.
    const crossGrants = applies(BASE.events).filter(
      (b) =>
        b.casterIdx === RH && b.targetIdx !== RH && b.stat === 'casterAtkPct'
    );
    expect(
      crossGrants,
      'red-hood granted ally ATK despite only ever casting Red Wolf'
    ).toHaveLength(0);
  });
});

describe('Burst steps 1 and 2 — Cooldown of Burst Skill -40s, once per battle', () => {
  it('the CDR is once-per-battle and lives ONLY on steps 1 and 2', () => {
    const cdrs = pairs(OV).filter((p) => p.effect.kind === 'burstCdr');
    expect(
      cdrs.length,
      'no burstCdr effect — both step-1 and step-2 CDR lines are dropped'
    ).toBeGreaterThanOrEqual(1);
    for (const c of cdrs) {
      expect(Math.abs(Number(c.effect.seconds))).toBeCloseTo(40, 3);
      expect(
        c.effect.oncePerBattle,
        'the kit says Activates once per battle'
      ).toBe(true);
      expect(
        [1, 2],
        `burstCdr found on stage ${String(stageOf(c.block))}; step 3 (Red Wolf) grants NO cooldown reduction`
      ).toContain(stageOf(c.block));
    }
  });

  it('her Red Wolf cadence respects the un-reduced 40s cooldown', () => {
    // Discriminator: an ungated / always-on -40s CDR would zero her 40s cooldown and let
    // her burst on nearly every rotation (~9+ casts in 180s).
    expect(RED_WOLF_CASTS).toBeLessThanOrEqual(6);
  });
});

describe('Burst step 3 — Red Wolf weapon swap (51.46% of final ATK, full charge 250%, 10s)', () => {
  const swap = pairs(OV).find((p) => p.effect.kind === 'weaponSwap');

  it('is a weaponSwap with the kit-stated magnitudes and window, gated to step 3', () => {
    expect(swap, 'Red Wolf is not modeled as a weaponSwap').toBeTruthy();
    expect(swap!.effect.damagePct).toBeCloseTo(51.46, 3);
    expect(swap!.effect.chargeMultPct).toBeCloseTo(250, 3);
    expect(swap!.effect.durationSec).toBeCloseTo(10, 3);
    expect(swap!.block?.trigger?.kind).toBe('burstCast');
    expect(stageOf(swap!.block)).toBe(3);
    expect(swap!.block?.target?.kind).toBe('self');
  });

  it('the swap actually carries damage in the fixture', () => {
    // Nearest-wrong: swap authored but never reached (mis-gated), or damagePct dropped.
    expect(NO_SWAP_DMG.self).toBeLessThan(BASE.self);
  });

  it('Charge Speed +100.8% rides the same window, self-scoped, and is load-bearing', () => {
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'chargeSpeedPct' &&
        near(p.effect.value, 100.8)
    );
    expect(e, 'the Red Wolf Charge Speed +100.8% buff is missing').toBeTruthy();
    expect(e!.effect.durationSec).toBeCloseTo(10, 3);
    expect(stageOf(e!.block)).toBe(3);
    const live = SELF.filter(
      (b) => b.stat === 'chargeSpeedPct' && near(b.value, 100.8)
    );
    expect(live.length).toBe(RED_WOLF_CASTS);
    expect(NO_BURST_SPEED.self).toBeLessThan(BASE.self);
  });
});

describe('no-silent-drops ledger (lines with no engine primitive)', () => {
  it('Attract/taunt and Incoming healing are recorded in unmodeled', () => {
    const led = unmodeledText(OV);
    expect(
      /attract|taunt/i.test(led),
      'the step-2 Attract/taunt line is not in unmodeled'
    ).toBe(true);
    expect(
      /incoming healing/i.test(led),
      'the step-2 Incoming healing line is not in unmodeled'
    ).toBe(true);
  });

  it('Pierce range expansion is either ledgered or folded into the swap pierce tag', () => {
    const led = unmodeledText(OV);
    const swap = pairs(OV).find((p) => p.effect.kind === 'weaponSwap');
    expect(
      /pierce range/i.test(led) || swap?.effect?.hasPierce === true,
      'the +100% Pierce range line is unaccounted for'
    ).toBe(true);
  });

  it.skip('Attract: taunts all enemies for 10 sec — GAP: no aggro/taunt primitive, and the v1 boss deals no damage', () => {});

  it.skip('Incoming healing +74.88% for 10 sec — GAP: no incoming-heal stat; heal effects model no HP amount', () => {});

  it.skip('Expand Pierce range by 100% for 10 sec — GAP: pierce is a boolean tag; there is no pierce RANGE/target-count model', () => {});

  it.skip('DEF +50.68% of the skill user DEF — GAP: no casterDefPct stat, and defPct is inert in v1', () => {});

  it.skip('Recovers 23.04% of attack damage as HP — GAP: heal effects carry no HP amount, so the 23.04% payload is unobservable', () => {});

  it.skip('Red Wolf swap shot economy (pulls/sec, magazine, charge time) — MEASUREMENT-GATED: the kit is silent; flag with a footage recipe', () => {});
});
