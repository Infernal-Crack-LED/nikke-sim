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
 * noir (Noir) — SG / Wind / Attacker / Burst III, ammo 9, hitsPerShot 10, cd 40s.
 *
 * BLIND kit-spec test: written from the kit prose alone (no sight of noir's committed
 * override, of the driver's tests, or of any truth file).
 *
 * WHAT THE KIT SAYS (structure + magnitudes; quotes kept short)
 *   skill1  header: "Activates when above 70% HP" + all allies
 *           ATK ▲ 14.08% *of the skill user's ATK*, constantly.
 *   skill2  header: "Activates when entering Full Burst" + all allies
 *           Max Ammunition Capacity ▲ 5 round(s) for 10 sec.
 *           Reload 39.88% magazine(s).
 *   burst   block A: all enemies — 351.64% of final ATK as Burst Skill damage.
 *           block B: "all allies with a Shotgun" — Hit Rate ▲ 13.93% (10s),
 *                    Damage to Interruption Parts ▲ 23.23% (10s).
 *           block C: "an ally from the same squad" gate + all allies —
 *                    Hit Rate ▲ 11.61% (30s), Interruption Parts ▲ 19.36% (30s).
 *
 * FIXTURE — controlComp('noir', true) = liter (B1) / crown (B2) / noir (B3 carry) / helm (B3).
 *   - B1 + B2 are mandatory: a lone B3 chains ZERO Full Bursts and every burst assertion
 *     below would be vacuous.
 *   - Two B3s on 40s cooldowns and a ~20s rotation means noir bursts on roughly every OTHER
 *     Full Burst. That gap is what separates "fires on the team's Full Burst" (skill2) from
 *     "fires when noir casts her own burst" (the burst slot).
 *   - noir is the comp's only shotgun (liter SMG / crown RL / helm SR), so "all allies with a
 *     Shotgun" is separable from "all allies" by the buffApply target set alone.
 *   - NO squad-mate is on the field, so burst block C's team gate must be CLOSED here; its
 *     entire observable signature is that lifting the gate changes the run.
 *
 * HOW EACH ASSERTION DISCRIMINATES is stated per `it`. Unit attribution of buffApply events is
 * done by DIFFING against a counterfactual run rather than by guessing a caster-id field, so
 * teammates that carry the same stat cannot contaminate a reading.
 *
 * 9 hoisted 180s runs.
 */

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

const ALLIES = ['liter', 'crown', 'noir', 'helm'] as const;
const TEAMMATES = ['liter', 'crown', 'helm'] as const;

// The override FILE is slot-keyed; tolerate both the raw Block[] slot shape and a
// CharacterSkills-per-slot shape so the patch helpers cannot silently no-op.
const slotBlocks = (ov: any, slot: Slot): any[] => {
  const s = ov?.[slot];
  if (Array.isArray(s)) {return s;}
  if (s && Array.isArray(s.blocks)) {return s.blocks;}
  return [];
};
const setSlotBlocks = (ov: any, slot: Slot, blocks: any[]): void => {
  if (Array.isArray(ov?.[slot])) {ov[slot] = blocks;}
  else if (ov?.[slot] && Array.isArray(ov[slot].blocks))
    {ov[slot].blocks = blocks;}
};
const effectsOf = (b: any): any[] =>
  Array.isArray(b?.effects) ? b.effects : [];

const run = (patched?: unknown) => {
  const base: any = controlComp('noir', true);
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    overrides: {
      ...(base.overrides ?? {}),
      ...(patched ? { noir: patched } : {}),
    },
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  };
  const res = runComp(opts);
  return { res, events, t: totals(res) as Record<string, number> };
};

const buffs = (evs: Ev[], stat: string, value?: number): Ev[] =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6)
  );

// ---- counterfactual overrides (in-memory clones; committed JSON untouched) -----------------
const pNoS1 = withPatchedOverride('noir', (ov: any) =>
  setSlotBlocks(ov, 'skill1', [])
);
const pNoS2 = withPatchedOverride('noir', (ov: any) =>
  setSlotBlocks(ov, 'skill2', [])
);
const pNoReload = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'skill2'))
    {b.effects = effectsOf(b).filter((e) => e.kind !== 'instantReload');}
});
const pS2AsBurstCast = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'skill2')) {b.trigger = { kind: 'burstCast' };}
});
const pUngated = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) {delete b.teamHas;}
});
const pNoSgHitRate = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'burst'))
    {b.effects = effectsOf(b).filter(
      (e) =>
        !(
          e.kind === 'buff' &&
          e.stat === 'hitRatePct' &&
          Math.abs(Number(e.value) - 13.93) < 1e-6
        )
    );}
});
const pNoParts = withPatchedOverride('noir', (ov: any) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as Slot[])
    {for (const b of slotBlocks(ov, slot))
      {b.effects = effectsOf(b).filter(
        (e) => !(e.kind === 'buff' && e.stat === 'partsDamagePct')
      );}}
});
const pNoNuke = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'burst'))
    {for (const e of effectsOf(b)) {if (e.kind === 'flatDamage') {e.atkPct = 0;}}}
});

// ---- hoisted runs --------------------------------------------------------------------------
const base = run();
const offS1 = run(pNoS1);
const offS2 = run(pNoS2);
const offReload = run(pNoReload);
const s2Wrong = run(pS2AsBurstCast);
const ungated = run(pUngated);
const offSgHr = run(pNoSgHitRate);
const offParts = run(pNoParts);
const noNuke = run(pNoNuke);

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('noir — fixture sanity', () => {
  it('noir is in the comp, fires, and the comp chains multiple Full Bursts', () => {
    expect(unitOf(base.res, 'noir').totalDamage).toBeGreaterThan(0);
    expect(base.events.some((e) => e.kind === 'shot')).toBe(true);
    // Non-vacuity for every burst/FB assertion below.
    expect(fbStarts).toBeGreaterThan(1);
  });
});

describe('noir S1 — all allies, ATK ▲ 14.08% of the skill user\u2019s ATK, constantly', () => {
  const baseCA = buffs(base.events, 'casterAtkPct');
  const offCA = buffs(offS1.events, 'casterAtkPct');

  const byValue = (evs: Ev[]) => {
    const m = new Map<number, string[]>();
    for (const e of evs) {
      const k = Math.round(Number(e.value) * 1e4) / 1e4;
      m.set(k, [...(m.get(k) ?? []), String(e.targetSlug)]);
    }
    return m;
  };
  const baseG = byValue(baseCA);
  const offG = byValue(offCA);
  // Attribution by DIFF: whichever caster-scaled value vanishes when noir's skill1 is emptied
  // is noir's — immune to a teammate that also grants a caster-scaled ATK buff.
  const noirVals = [...baseG.keys()].filter((v) => !offG.has(v));

  it('emits exactly one caster-scaled ATK grant, and it is noir\u2019s (vanishes with S1)', () => {
    expect(noirVals).toHaveLength(1);
  });

  it('targets ALL FOUR allies including self, exactly once each (a passive, not trigger-keyed)', () => {
    const tgts = baseG.get(noirVals[0])!;
    expect(new Set(tgts).size).toBe(4); // RED under target self / alliesOfWeapon / topAtk-N
    expect(tgts).toHaveLength(4); // RED under a fullBurstEnter/burstCast re-key (would re-apply per rotation)
    expect(new Set(tgts).has('noir')).toBe(true); // no "except self" in the header
  });

  it('is CASTER-scaled: flat-resolved at apply time, not a raw 14.08% self-scaling buff', () => {
    // casterAtkPct re-emits as flat ATK; a 14.08 on the wire would mean the nearest-wrong
    // encoding (plain atkPct, scaling each ally\u2019s OWN ATK).
    expect(noirVals[0]).toBeGreaterThan(100);
    expect(Math.abs(noirVals[0] - 14.08)).toBeGreaterThan(1);
    expect(buffs(base.events, 'atkPct', 14.08)).toHaveLength(0);
  });

  it('is live BEFORE the first shot ("constantly", not gated behind a trigger)', () => {
    const lastApply = base.events.reduce(
      (acc, e, i) =>
        e.kind === 'buffApply' &&
        e.stat === 'casterAtkPct' &&
        Math.abs(Number(e.value) - noirVals[0]) < 1e-3
          ? i
          : acc,
      -1
    );
    const firstShot = base.events.findIndex((e) => e.kind === 'shot');
    expect(lastApply).toBeGreaterThan(-1);
    expect(firstShot).toBeGreaterThan(-1);
    expect(lastApply).toBeLessThan(firstShot);
  });

  it('moves EVERY ally\u2019s damage (team-wide), not just noir\u2019s', () => {
    for (const s of ALLIES) {expect(offS1.t[s]).toBeLessThan(base.t[s]);}
  });

  it.skip('the ">70% HP" activation gate is unobservable in v1 (immortal boss, no HP pool) — modeled as permanently satisfied', () => {
    // No primitive can distinguish "gate always true" from "no gate" while nothing takes damage.
  });
});

describe('noir S2 — on entering Full Burst, all allies: Max Ammo ▲ 5 (10s) + 39.88% reload', () => {
  const ammo = buffs(base.events, 'maxAmmoFlat', 5);

  it('applies to all four allies on EVERY team Full Burst entry', () => {
    expect(ammo.length).toBeGreaterThan(0);
    expect(new Set(ammo.map((e) => e.targetSlug)).size).toBe(4); // "Affects all allies"
    expect(ammo).toHaveLength(fbStarts * 4); // one apply per ally per FB entry
  });

  it('is FULL-BURST-ENTER keyed, not burst-cast keyed (the nearest-wrong trigger under-fires)', () => {
    // noir bursts on only ~half the Full Bursts (helm covers the rest), so re-keying the block
    // to her own burstCast must strictly reduce the number of applications.
    const wrong = buffs(s2Wrong.events, 'maxAmmoFlat', 5);
    expect(wrong.length).toBeLessThan(ammo.length);
  });

  it('"▲ 5 round(s) for 10 sec" is a 5-round MAGNITUDE on a seconds clock, not a round-count window', () => {
    for (const e of ammo) {
      expect(Number(e.value)).toBe(5); // maxAmmoFlat 5, not a % encoding
      expect(e.durationShots == null).toBe(true); // RED if "5 round(s)" was read as durationShots
      expect(Number.isFinite(Number(e.expiresFrame))).toBe(true); // timed, not permanent
    }
  });

  it('the slot is load-bearing damage for noir AND for teammates (ally-wide ammo + reload)', () => {
    expect(offS2.t.noir).toBeLessThan(base.t.noir);
    const moved = TEAMMATES.filter((s) => offS2.t[s] !== base.t[s]);
    expect(moved.length).toBeGreaterThan(0); // RED if the slot were scoped to self
  });

  it('the 39.88% magazine reload on its own adds noir damage (weapon-state = damage)', () => {
    // Isolates "Reload 39.88% magazine(s)" from the ammo-capacity buff: dropping only the
    // instantReload must cost shots. RED if the reload line was skipped as "defensive".
    expect(offReload.t.noir).toBeLessThan(base.t.noir);
  });

  it.skip('the exact 10s length of the Max-Ammo window is not directly assertable', () => {
    // No buff is co-applied at the same frame to difference expiresFrame against, and buffApply
    // carries no absolute frame on the public event surface. Load-bearing-ness is covered above.
  });
});

describe('noir burst — 351.64% nuke, shotgun-scoped 10s buffs, squad-gated 30s buffs', () => {
  const hr13 = buffs(base.events, 'hitRatePct', 13.93);
  const hr11 = buffs(base.events, 'hitRatePct', 11.61);
  const parts23 = buffs(base.events, 'partsDamagePct', 23.23);
  const parts19 = buffs(base.events, 'partsDamagePct', 19.36);

  it('the 351.64% burst nuke pays real damage and touches NOBODY else', () => {
    expect(noNuke.t.noir).toBeLessThan(base.t.noir);
    for (const s of TEAMMATES) {expect(noNuke.t[s]).toBe(base.t[s]);} // enemy-targeted: inert on allies
  });

  it('Hit Rate ▲ 13.93% is SHOTGUN-scoped: a strict subset of allies that includes noir', () => {
    expect(hr13.length).toBeGreaterThan(0);
    const tg = new Set(hr13.map((e) => e.targetSlug));
    expect(tg.has('noir')).toBe(true); // no "except self"
    expect(tg.size).toBeLessThan(4); // RED under the nearest-wrong "all allies" target
  });

  it('the shotgun block keys off NOIR\u2019s own burst cast, not any team Full Burst', () => {
    // helm also bursts, so a fullBurstEnter mis-key would fire on her rotations too.
    expect(hr13.length).toBeLessThan(fbStarts);
  });

  it('Hit Rate ▲ 13.93% is load-bearing for noir and inert for the non-shotgun teammates', () => {
    expect(offSgHr.t.noir).toBeLessThan(base.t.noir); // hit rate lifts core rate
    for (const s of TEAMMATES) {expect(offSgHr.t[s]).toBe(base.t[s]);}
  });

  it('Interruption-Part Damage ▲ 23.23% rides the same block but MOVES NOTHING (v1 boss has no parts)', () => {
    expect(parts23).toHaveLength(hr13.length); // same trigger, same target set
    for (const s of ALLIES) {expect(offParts.t[s]).toBe(base.t[s]);} // parsed-but-inert, byte-identical
  });

  it('the same-squad block is CLOSED with no squad-mate on the field', () => {
    // controlComp has no blanc/rouge-style squad-mate, so neither 30s rider may fire.
    expect(hr11).toHaveLength(0);
    expect(parts19).toHaveLength(0);
  });

  it('...and OPENS to all four allies, paying damage, once the team gate is lifted (gate non-vacuity)', () => {
    const open11 = buffs(ungated.events, 'hitRatePct', 11.61);
    expect(open11.length).toBeGreaterThan(0);
    expect(new Set(open11.map((e) => e.targetSlug)).size).toBe(4); // "Affects all allies", not SG-scoped
    expect(ungated.t.noir).toBeGreaterThan(base.t.noir);
  });

  it('the squad-gated riders run 30s against the shotgun riders\u2019 10s (same cast, differenced)', () => {
    const first11 = buffs(ungated.events, 'hitRatePct', 11.61)[0];
    const first13 = buffs(ungated.events, 'hitRatePct', 13.93)[0];
    expect(first11).toBeTruthy();
    expect(first13).toBeTruthy();
    // Both blocks fire on the same burst cast, so the expiry gap is exactly (30−10)s × 60fps.
    expect(
      Math.round(Number(first11.expiresFrame) - Number(first13.expiresFrame))
    ).toBe(1200);
  });

  it.skip('the burst nuke\u2019s Full-Burst exemption is not assertable through the public harness surface', () => {
    // damage events carry inFullBurst / fbMajorApplied but no ally attribution field the blind
    // packet documents, so noir\u2019s burst-slot hits cannot be isolated from teammate damage here.
  });
});
