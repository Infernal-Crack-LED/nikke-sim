// PER-UNIT KIT SPEC — `neon` (Neon — the BASE SG/Supporter/Fire/Burst I, Elysion, cd 20s,
// ammo 9, reloadFrames 129, hitsPerShot 10 (pellets), normalMult 224.5, baseCrit 15/150).
// EXACT SLUG: `neon`. The slug-disambiguation lint's AMBIGUOUS-base advisory fires on the bare
// name by design (the base unit's display name is "Neon" with no variant colon, so the lint
// cannot distinguish base from variant) and is explicitly resolved on this slug (S0): this spec
// is about neon (SG/Fire), NOT neon-blue-ocean (MG/Water Burst III, "nbo") and NOT
// neon-vision-eye (RL/Electric Burst III, "nve") — anis/milk precedent for the same advisory.
// Kit-autonomy gauntlet 2026-08-04, test-first, FROM SCRATCH (no prior override;
// simSupported:false flipped by this gauntlet). 9 runs: base + 8 counterfactual/reference
// patches (s1Passive, noS2, s2SecBased, s2BurstCast, noNuke, noAmmo, ammoAllies, ammoSelf).
//
// Kit (blablalink prose, data/characters.json → characters.neon.skills, SL10):
//   S1 ■ killing an enemy → 2 allies with the highest FINAL ATK:
//        Critical Rate ▲3.56% for 5 sec                                            [N1 gap]
//   S2 ■ beginning of Full Burst → all allies:
//        Critical Rate ▲45.93% for 2 shots                                        [N2]
//   BU ■ 1 enemy with the highest FINAL DEF:
//        528.97% of final ATK as Burst Skill damage                               [N3]
//      ■ all allies with a Shotgun:
//        Max Ammunition Capacity ▲3 round(s) for 10 sec                           [N4]
//
// Model + dispositions (line inventory — all 4 lines accounted):
//   N1    UNMODELED. The trigger is an enemy KILL. The engine has no kill event (grep-verified:
//         no kill primitive in src/engine — the scope-lock boss is immortal, there are no adds),
//         so the line can NEVER fire in any sim run and contributes exactly zero damage.
//         Encoding it (e.g. a passive critRatePct 3.56 on alliesTopAtk) would fabricate a buff
//         the sim's world cannot produce — that nearest-wrong model is the counterfactual N1
//         discriminates against. Verbatim in unmodeled.skill1 + ⚑ (out-of-domain: world model;
//         in real multi-add content kills are frequent, so in-game the top-2-final-ATK pair runs
//         +3.56% crit at near-full uptime; here zero). epinel/volume precedent for the class.
//   N2    fullBurstEnter → allies → critRatePct 45.93, durationShots 2. "Activates at the
//         beginning of Full Burst" = fullBurstEnter — fires only when a Full Burst ACTUALLY
//         opens. In this fixture helm (B3, 40s CD) gates the chain, so neon casts her B1 9×
//         but only 5 Full Bursts open: fullBurstEnter-vs-burstCast is therefore pinned by BOTH
//         timing (the buff lands on the fullBurstStart frame) AND count (5 grant-waves vs 9
//         casts). "For 2 shots" = the engine's round-count duration
//         (types.ts durationShots): each holder's OWN next 2 shots carry the buff, then it dies
//         (sim.ts round-count expiry: the Nth shot still carries the buff, it lapses right
//         after). Plain "Critical Rate" → the unscoped critRatePct (volume precedent: lifts
//         skill/burst buckets too, no normal-only scoping in the prose). The durationSec-misread
//         counterfactual (10s window instead of 2 shots) over-damages and is pinned RED.
//   N3    burstCast → enemy → flatDamage 528.97. Burst bucket; the cast lands BEFORE the Full
//         Burst window opens, so the nuke never takes the +50% FB major (verified fact
//         2026-07-13; epinel/milk precedent, pinned via fbMajorApplied). "1 enemy with the
//         highest final DEF" collapses to the single partless boss. Keyed to HER casts only —
//         she is the fixture's only B1, so this is the same event count as FBs; the cast-timing
//         (pre-FB) pin is the load-bearing one.
//   N4    burstCast → alliesOfWeapon SG → maxAmmoFlat 3, durationSec 10. "All allies with a
//         Shotgun" = the weapon-typed target (tove precedent — same shape, video-confirmed
//         there); neon herself IS SG and is included. maxAmmoFlat adds FLAT rounds on top of
//         the percent scaling in maxAmmo() (theme 14) — the correct primitive for "▲ N round(s)"
//         (maxAmmoPct would mis-scale per ally's base mag). Observable: during the 10s window
//         the SG allies' magazine cap is 9+3=12, so shots report ammoAfter up to 11 (> the
//         base-8 ceiling). The target set {neon, naga} (both SG) vs helm (SR, excluded) pins
//         alliesOfWeapon-vs-allies AND alliesOfWeapon-vs-self in one fixture.
//
// Fixture: slugs [neon, naga, helm] — neon B1 20s / naga B2 20s / helm B3 40s, boss Fire.
// Slot order: neon 0 / naga 1 / helm 2. The chain opens every ~40s (helm-gated), neon casts on
// every Full Burst, and the two SG allies make the SG-only ammo targeting observable. helm is
// the non-SG control: she must NOT receive the ammo buff. helm also carries critRateNormalPct
// (normal-scoped team crit) — every crit-rate assertion here is a DIFFERENTIAL (buffed vs
// contemporaneous unbuffed shots) so her contribution cancels. Deterministic (no seed);
// event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  data,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: neon 0 / naga 1 / helm 2. */
const NEON = 0;
const NAGA = 1;
const HELM = 2;

const FIXTURE = {
  slugs: ['neon', 'naga', 'helm'],
  bossElement: 'Fire' as const,
};

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** N1 counterfactual: the kill-gated S1 misread as an always-on top-2-final-ATK crit buff
 *  (fabricates a buff the sim's immortal-boss world can never produce). */
const neonS1Passive = withPatchedOverride('neon', (ov) => {
  if (ov.skill1.length !== 0) {
    throw new Error('neon skill1 blocks must be empty — fixture is stale');
  }
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'alliesTopAtk', count: 2, byFinalAtk: true },
      effects: [{ kind: 'buff', stat: 'critRatePct', value: 3.56 }],
    },
  ];
});

/** N2 reference: the S2 FB-start crit line removed entirely (liveness baseline). */
const neonNoS2 = withPatchedOverride('neon', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill2.length === before) {
    throw new Error('neon S2 crit block missing — fixture is stale');
  }
});

/** N2 counterfactual: "for 2 shots" misread as a 10s wall-clock window (permanent-FB uptime). */
const neonS2SecBased = withPatchedOverride('neon', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b || b.trigger?.kind !== 'fullBurstEnter') {
    throw new Error('neon S2 fullBurstEnter crit block missing — fixture is stale');
  }
  const e = b.effects.find((x: any) => x.stat === 'critRatePct');
  delete e.durationShots;
  e.durationSec = 10;
});

/** N2 counterfactual: "at the beginning of Full Burst" misread as neon's OWN burst cast.
 *  helm (40s) gates the chain, so she casts 9× but only 5 FBs open — this over-fires. */
const neonS2BurstCast = withPatchedOverride('neon', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('neon S2 crit block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});

/** N3 reference: the burst nuke removed. */
const neonNoNuke = withPatchedOverride('neon', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.burst.length === before) {
    throw new Error('neon burst nuke block missing — fixture is stale');
  }
});

/** N4 reference: the SG ammo line removed. */
const neonNoAmmo = withPatchedOverride('neon', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'maxAmmoFlat'));
  if (ov.burst.length === before) {
    throw new Error('neon burst ammo block missing — fixture is stale');
  }
});

/** N4 counterfactual A: "allies with a Shotgun" misread as ALL allies (helm would be buffed). */
const neonAmmoAllies = withPatchedOverride('neon', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'maxAmmoFlat'));
  if (!b || b.target?.kind !== 'alliesOfWeapon') {
    throw new Error('neon burst ammo block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});

/** N4 counterfactual B: the SG filter collapsed to SELF ONLY (naga would be excluded). */
const neonAmmoSelf = withPatchedOverride('neon', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'maxAmmoFlat'));
  if (!b) {
    throw new Error('neon burst ammo block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Passive = run({ neon: neonS1Passive });
const noS2 = run({ neon: neonNoS2 });
const s2SecBased = run({ neon: neonS2SecBased });
const s2BurstCast = run({ neon: neonS2BurstCast });
const noNuke = run({ neon: neonNoNuke });
const noAmmo = run({ neon: neonNoAmmo });
const ammoAllies = run({ neon: neonAmmoAllies });
const ammoSelf = run({ neon: neonAmmoSelf });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot');
const neonBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === NEON && b.stat === stat);
const neonShots = (evs: SimEvent[]) =>
  shots(evs).filter((s) => s.slug === 'neon');
const neonCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'neon');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const neonNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'neon' && d.srcSlot === 'burst');
const teamTotal = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('neon') as any;
if (!shipped) {
  throw new Error('neon has no override on disk — fixture is stale');
}

/** The kit's logical lines, rebuilt from characters.json prose: each "■" bullet merged with its
 *  indented effect lines. The SSOT comparison target for the verbatim pins. */
const kitLines = (slot: 'skill1' | 'skill2' | 'burst'): string[] =>
  data.characters.neon.skills[slot]
    .split(/\n(?=■)/)
    .map((l) => l.replace(/^■\s*/, '').replace(/\n/g, ' ').trim());

describe('neon — fixture sanity (non-vacuity)', () => {
  it('neon fires her SG continuously across many magazines', () => {
    // Zero shots would make every round-count / ammo claim trivially true.
    expect(neonShots(base.events).length).toBeGreaterThan(100);
  });

  it('the comp actually bursts: neon casts her BI on every Full Burst', () => {
    expect(neonCasts(base.events).length).toBeGreaterThanOrEqual(2);
    expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(2);
    // She is the only B1: every Full Burst opens on one of her casts (the FB start lands a
    // beat after her B1 cast, once the B2/B3 chain resolves).
    const castFrames = neonCasts(base.events).map((c) => c.frame);
    for (const fb of fbStarts(base.events)) {
      expect(
        castFrames.some((f) => fb.frame - f >= 0 && fb.frame - f < 5 * FPS)
      ).toBe(true);
    }
    // …but helm (B3, 40s CD) gates the chain, so neon ALSO casts on rotations that cannot
    // complete (9 casts vs 5 FBs in 180s) — that asymmetry is exactly what makes the N2
    // fullBurstEnter-vs-burstCast COUNT discrimination possible.
    expect(neonCasts(base.events).length).toBeGreaterThan(
      fbStarts(base.events).length
    );
  });

  it('neon deals weapon damage', () => {
    expect(unitOf(base.res, 'neon').totalDamage).toBeGreaterThan(0);
  });
});

describe('N1 — S1 kill-triggered crit buff is honestly UNMODELED (no kills at scope)', () => {
  it('neon originates no crit buff other than her S2 FB-start grant', () => {
    // Her originated stats are exactly the S2 crit grant + the burst ammo grant — nothing
    // else (no kill-fed 3.56 crit line, no proxy).
    const own = buffs(base.events)
      .filter((b) => b.casterIdx === NEON)
      .map((b) => b.stat);
    expect(own.length).toBeGreaterThan(0);
    expect([...new Set(own)].sort()).toEqual(['critRatePct', 'maxAmmoFlat']);
    // Every crit-family grant she originates is the 45.93 S2 line (no 3.56 anywhere).
    const critValues = new Set(
      buffs(base.events)
        .filter((b) => b.casterIdx === NEON && b.stat.startsWith('crit'))
        .map((b) => b.value)
    );
    expect([...critValues]).toEqual([45.93]);
  });

  it('the full S1 line sits verbatim in unmodeled.skill1 (checked vs characters.json)', () => {
    // The prose carries an embedded newline between its two sentences; the verbatim record
    // keeps it, so flatten whitespace on both sides before the containment check.
    const documented = ((shipped.unmodeled?.skill1 ?? []) as string[])
      .join(' ')
      .replace(/\s+/g, ' ');
    expect(documented).toContain(kitLines('skill1')[0]);
    expect(shipped.skill1).toEqual([]);
  });

  it('DISCRIMINATING: an always-on top-2-final-ATK crit buff (the kill-line misread) inflates the team', () => {
    expect(teamTotal(s1Passive.totals)).toBeGreaterThan(teamTotal(base.totals));
  });
});

describe('N2 — S2 Full-Burst-start team crit: +45.93% for exactly 2 shots per ally', () => {
  const grants = neonBuffs(base.events, 'critRatePct');

  it('applies the exact kit magnitude, once per Full Burst, on the FB-start frame', () => {
    const fbs = fbStarts(base.events);
    // One grant PER ALLY per FB (the buffApply event fires per target).
    expect(grants.length).toBe(fbs.length * FIXTURE.slugs.length);
    expect([...new Set(grants.map((b) => b.value))]).toEqual([45.93]);
    const fbFrames = new Set(fbs.map((f) => f.frame));
    for (const g of grants) {
      expect(fbFrames.has(g.frame)).toBe(true);
    }
  });

  it('targets ALL allies and rides the round-count duration (2 shots, no wall-clock expiry)', () => {
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) {
      expect(g.durationShots).toBe(2);
      expect(g.expiresFrame).toBeNull();
    }
    const targets = new Set(grants.map((g) => g.targetIdx));
    expect([...targets].sort()).toEqual([NEON, NAGA, HELM]);
  });

  it('DISCRIMINATING: fullBurstEnter, NOT burstCast — the count diverges (helm gates the chain)', () => {
    // neon casts 9× in 180s (20s CD) but only 5 Full Bursts open (helm's 40s CD): an
    // own-cast keying would over-fire the crit grant on the 4 incomplete rotations.
    const burstCastGrants = neonBuffs(s2BurstCast.events, 'critRatePct');
    expect(burstCastGrants.length).toBe(
      neonCasts(base.events).length * FIXTURE.slugs.length
    );
    expect(burstCastGrants.length).toBeGreaterThan(grants.length);
    expect(grants.length).toBe(
      fbStarts(base.events).length * FIXTURE.slugs.length
    );
  });

  it('is consumed by EXACTLY 2 shots per FB window (differential crit rate, helm-cancelling)', () => {
    // helm contributes her own normal-scoped crit buff with a different window, so the run
    // carries up to 4 rate levels: {base, base+helm, base+neon, base+helm+neon}. The buffed
    // levels are EXACTLY those a full 0.4593 above another observed level; within each FB
    // window exactly 2 of neon's normal hits sit on a buffed level.
    const normals = dmg(base.events).filter(
      (d) => d.slug === 'neon' && d.srcSlot === 'normal' && d.critEligible
    );
    const levels = [...new Set(normals.map((h) => Math.round(h.critRate * 1e6)))];
    const buffed = new Set(
      levels.filter((r) =>
        levels.some((l) => Math.abs(r - 0.4593 * 1e6 - l) < 1)
      )
    );
    expect(buffed.size).toBeGreaterThanOrEqual(1);
    let windows = 0;
    for (const fb of fbStarts(base.events) as Array<
      Extract<SimEvent, { kind: 'fullBurstStart' }>
    >) {
      const inWindow = normals.filter(
        (h) => h.inFullBurst && h.frame >= fb.frame && h.frame < fb.endFrame
      );
      if (inWindow.length < 3) {
        continue; // a degenerate window cannot discriminate
      }
      windows++;
      const buffedHits = inWindow.filter((h) =>
        buffed.has(Math.round(h.critRate * 1e6))
      );
      expect(buffedHits.length).toBe(2);
    }
    expect(windows).toBeGreaterThanOrEqual(2);
  });

  it('is LIVE: removing it lowers her total (the FB-window crit lift is not decorative)', () => {
    expect(base.totals.neon).toBeGreaterThan(noS2.totals.neon);
  });

  it('DISCRIMINATING: a 10s wall-clock misread (instead of 2 shots) over-damages her', () => {
    expect(s2SecBased.totals.neon).toBeGreaterThan(base.totals.neon);
  });
});

describe('N3 — burst nuke: 528.97% of final ATK, once per OWN cast, pre-FB', () => {
  const nukes = neonNukes(base.events);
  const casts = neonCasts(base.events);

  it('fires once per own burst cast at the kit magnitude, in the burst bucket', () => {
    expect(casts.length).toBeGreaterThanOrEqual(2);
    expect(nukes.length).toBe(casts.length);
    expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([528.97]);
    expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
  });

  it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
    expect(nukes.filter((d) => d.fbMajorApplied).length).toBe(0);
    expect(nukes.filter((d) => d.inFullBurst).length).toBe(0);
  });

  it('DISCRIMINATING: removing the nuke zeroes her burst-bucket damage', () => {
    expect(neonNukes(noNuke.events).length).toBe(0);
    expect(base.totals.neon).toBeGreaterThan(noNuke.totals.neon);
  });
});

describe('N4 — burst ammo grant: +3 rounds for 10s, SHOTGUN allies only', () => {
  const grants = neonBuffs(base.events, 'maxAmmoFlat');
  const casts = neonCasts(base.events);

  it('fires once per own cast (per SG target), value 3, 10s wall-clock duration', () => {
    // One buffApply per target: the two SG allies (neon + naga) each receive it per cast.
    expect(grants.length).toBe(casts.length * 2);
    expect([...new Set(grants.map((g) => g.value))]).toEqual([3]);
    for (const g of grants) {
      expect(g.expiresFrame! - g.frame).toBe(10 * FPS);
      expect(g.durationShots).toBeNull();
    }
  });

  it('targets exactly the SG allies: neon + naga, and NOT helm (SR)', () => {
    const targets = new Set(grants.map((g) => g.targetIdx));
    expect([...targets].sort()).toEqual([NEON, NAGA]);
    expect(grants.some((g) => g.targetIdx === HELM)).toBe(false);
  });

  it('is LIVE: SG magazines run past the base 9-round cap inside the window (ammoAfter up to 11)', () => {
    // ammoAfter = rounds LEFT after the pull, so a 12-round cap surfaces as ammoAfter 11 —
    // strictly above the base-8 ceiling of an unbuffed 9-round SG magazine.
    const maxInWindow = (evs: SimEvent[], slug: string) => {
      let max = -1;
      for (const c of neonCasts(evs)) {
        for (const s of shots(evs).filter(
          (x) => x.slug === slug && x.frame >= c.frame && x.frame < c.frame + 10 * FPS
        )) {
          max = Math.max(max, s.ammoAfter);
        }
      }
      return max;
    };
    expect(maxInWindow(base.events, 'neon')).toBe(11);
    expect(maxInWindow(base.events, 'naga')).toBe(11);
    // Without the grant the cap stays 9 (ammoAfter never exceeds 8).
    expect(maxInWindow(noAmmo.events, 'neon')).toBeLessThanOrEqual(8);
    expect(maxInWindow(noAmmo.events, 'naga')).toBeLessThanOrEqual(8);
  });

  it('DISCRIMINATING: an all-allies misread buffs helm too; a self-only misread drops naga', () => {
    const alliesTargets = new Set(
      neonBuffs(ammoAllies.events, 'maxAmmoFlat').map((g) => g.targetIdx)
    );
    expect([...alliesTargets].sort()).toEqual([NEON, NAGA, HELM]);
    const selfTargets = new Set(
      neonBuffs(ammoSelf.events, 'maxAmmoFlat').map((g) => g.targetIdx)
    );
    expect([...selfTargets]).toEqual([NEON]);
  });
});

describe('N5 — structure + documentation: nothing dropped, nothing fabricated', () => {
  it('skill1 is empty; skill2 carries exactly one block: the fullBurstEnter crit grant', () => {
    expect(shipped.skill1).toEqual([]);
    expect(shipped.skill2.length).toBe(1);
    const b = shipped.skill2[0];
    expect(b.trigger).toEqual({ kind: 'fullBurstEnter' });
    expect(b.target).toEqual({ kind: 'allies' });
    expect(b.effects).toEqual([
      { kind: 'buff', stat: 'critRatePct', value: 45.93, durationShots: 2 },
    ]);
  });

  it('burst carries exactly two blocks: the 528.97 nuke + the SG ammo grant', () => {
    expect(shipped.burst.length).toBe(2);
    const nuke = shipped.burst.find((b: any) => hasKind(b, 'flatDamage'));
    expect(nuke.trigger).toEqual({ kind: 'burstCast' });
    expect(nuke.target).toEqual({ kind: 'enemy' });
    expect(nuke.effects).toEqual([{ kind: 'flatDamage', atkPct: 528.97 }]);
    const ammo = shipped.burst.find((b: any) => hasStat(b, 'maxAmmoFlat'));
    expect(ammo.trigger).toEqual({ kind: 'burstCast' });
    expect(ammo.target).toEqual({ kind: 'alliesOfWeapon', weapon: 'SG' });
    expect(ammo.effects).toEqual([
      { kind: 'buff', stat: 'maxAmmoFlat', value: 3, durationSec: 10 },
    ]);
  });

  it('the modeled lines are NOT in unmodeled; no `ignored` block anywhere', () => {
    const s2 = kitLines('skill2')[0];
    const nukeLine = kitLines('burst').find((l) => l.includes('Burst Skill damage'));
    const ammoLine = kitLines('burst').find((l) => l.includes('Max Ammunition Capacity'));
    expect(nukeLine).toBeDefined();
    expect(ammoLine).toBeDefined();
    const documented = [
      ...((shipped.unmodeled?.skill1 ?? []) as string[]),
      ...((shipped.unmodeled?.skill2 ?? []) as string[]),
      ...((shipped.unmodeled?.burst ?? []) as string[]),
    ].join(' ');
    expect(documented).not.toContain(s2.slice(0, 40));
    expect(documented).not.toContain('528.97');
    expect(shipped.ignored).toBeUndefined();
    const kinds = [...shipped.skill1, ...shipped.skill2, ...shipped.burst]
      .flatMap((b: any) => b.effects.map((e: any) => e.kind))
      .filter((k: string) => k === 'ignored');
    expect(kinds).toEqual([]);
  });
});
