// PER-UNIT KIT SPEC — `epinel` (Epinel — the SMG/Wind/Attacker/Burst III, Missilis, cd 40s,
// ammo 120, reloadFrames 81, RoF 1440/min; NOT a variant — no other Epinel exists in the
// roster, lint clean 2026-08-03). Kit-autonomy gauntlet 2026-08-03, test-first, FROM SCRATCH
// (no prior override; simSupported:false flipped by this gauntlet).
//
// Kit (blablalink prose, data/characters.json → characters.epinel.skills, SL10):
//   S1 ■ killing an enemy → self: Total Noob ATK ▲13.86%, stacks to 5, lasts 15 sec      [E-S1 gap]
//   S2 ■ last bullet hits the target → self: Critical Rate ▲5.05% for 5 sec              [E1]
//      ■ (same trigger)                    Critical Damage ▲6.4% for 5 sec               [E1]
//   BU ■ all enemies: 457.87% of final ATK as Burst Skill damage                         [E3]
//      ■ IF Total Noob at max stacks → same targets: 457.87% of final ATK extra damage   [E4 gap]
//
// Model + dispositions (line inventory — all 5 lines accounted):
//   E-S1  UNMODELED. The trigger is an enemy KILL. The engine has no kill event (grep-verified:
//         no kill primitive anywhere in src/engine — the scope-lock boss is immortal and there
//         are no adds), so the Total Noob stacks can never accrue in ANY sim run and the line
//         contributes exactly zero damage. Encoding it (e.g. a permanent max-stacks ATK buff)
//         would fabricate damage the sim's world cannot produce. Verbatim in unmodeled.skill1,
//         pinned below; the nearest-wrong model is the counterfactual E2 discriminates against.
//   E1    lastBullet → self → critRatePct 5.05 + critDamagePct 6.4, durationSec 5. The engine's
//         `lastBullet` trigger (fires when the owner's magazine empties / reload starts) IS the
//         named "last bullet" archetype (privaty/marciana/anis-sparkling-summer precedent). Her
//         120-round magazine (datamine RoF 1440/min ≈ 24/s, effective ~20/s with per-shot gaps)
//         + 81f reload ≈ a 6.3–7.4s cycle, so the 5s window runs ~65–80% uptime — a cadence-tuple
//         ⚑, asserted STRUCTURALLY (per-reload-cycle applications, count bounded away from both
//         the shot count and the cast count), never as a pinned percentage. Live, not permanent:
//         the shotFired counterfactual (per-shot refresh → 100% uptime) is the nearest-wrong
//         cadence model and must over-damage her.
//   E3    burstCast → enemy → flatDamage 457.87. Burst bucket; the cast lands BEFORE the Full
//         Burst window opens, so it never takes the +50% FB major (verified fact 2026-07-13);
//         keyed to HER casts only — co-B3 helm leads alternate FBs, so a fullBurstEnter keying
//         would over-fire (the Tier-2 trigger discrimination). "All enemies" collapses to the
//         single partless boss.
//   E4    UNMODELED. The gate is Total Noob AT MAX STACKS — E-S1's kill-fed pool. No kills at
//         scope ⇒ the gate can never open ⇒ the extra hit contributes exactly zero in any run.
//         The honest record is verbatim-unmodeled + ⚑ (in a real multi-add fight Epinel stacks
//         Total Noob almost instantly, so the in-game burst is effectively 915.74% — that is the
//         ⚑'s estimate; the sim's 457.87 is a scope-lock necessity, not a value choice). The
//         nearest-wrong model — folding the conditional into an unconditional second hit — is
//         the counterfactual E4 discriminates against.
//
// Fixture: controlComp('epinel') = liter B1 / crown B2 / epinel B3 / helm B3, boss Fire (neutral
// for Wind — no elem-advantage lines in this kit anyway), focus epinel. Both B3s are 40s-CD, so
// they alternate casts and epinel's burst lines get >=2 firings; helm leading alternate FBs is
// what makes burstCast-vs-fullBurstEnter genuinely diverge. Deterministic (no seed); event-log
// over totals. Slot order: liter 0 / crown 1 / epinel 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  data,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / epinel 2 / helm 3. */
const EPINEL = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('epinel'),
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

/** E1 reference: the S2 crit line removed entirely (liveness baseline). */
const epinelNoS2 = withPatchedOverride('epinel', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !hasStat(b, 'critRatePct') && !hasStat(b, 'critDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('epinel S2 crit block missing — fixture is stale');
  }
});
/** E1 counterfactual: the same line re-keyed to EVERY shot (permanent-uptime over-credit). */
const epinelS2ShotFired = withPatchedOverride('epinel', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b || b.trigger?.kind !== 'lastBullet') {
    throw new Error(
      'epinel S2 lastBullet crit block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'shotFired' };
});
/** E2 counterfactual: S1's kill-fed stacks misread as a permanent max-stacks ATK buff
 *  (5 stacks × 13.86% = 69.3%). */
const epinelS1MaxPassive = withPatchedOverride('epinel', (ov) => {
  if (ov.skill1.length !== 0) {
    throw new Error('epinel skill1 blocks must be empty — fixture is stale');
  }
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 69.3 }],
    },
  ];
});
/** E3 reference: the burst nuke removed. */
const epinelNoNuke = withPatchedOverride('epinel', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.burst.length === before) {
    throw new Error('epinel burst nuke block missing — fixture is stale');
  }
});
/** E3 counterfactual: the nuke keyed to fullBurstEnter (fires on helm-led FBs too, in-FB). */
const epinelNukeFbEnter = withPatchedOverride('epinel', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'flatDamage'));
  if (!b) {
    throw new Error('epinel burst nuke block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** E4 counterfactual: the max-stacks conditional folded into an unconditional second hit. */
const epinelDoubleNuke = withPatchedOverride('epinel', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'flatDamage'));
  if (!b) {
    throw new Error('epinel burst nuke block missing — fixture is stale');
  }
  ov.burst = [
    ...ov.burst,
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 457.87 }],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS2 = run({ epinel: epinelNoS2 });
const s2ShotFired = run({ epinel: epinelS2ShotFired });
const s1MaxPassive = run({ epinel: epinelS1MaxPassive });
const noNuke = run({ epinel: epinelNoNuke });
const nukeFbEnter = run({ epinel: epinelNukeFbEnter });
const doubleNuke = run({ epinel: epinelDoubleNuke });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const epinelBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === EPINEL && b.stat === stat);
const epinelShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === 'epinel').length;
const epinelCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'epinel'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const epinelNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'epinel' && d.srcSlot === 'burst');

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('epinel') as any;
if (!shipped) {
  throw new Error('epinel has no override on disk — fixture is stale');
}

/** The kit's logical lines, rebuilt from characters.json prose: each "■" bullet merged with its
 *  indented effect lines. The SSOT comparison target for the verbatim pins. */
const kitLines = (slot: 'skill1' | 'skill2' | 'burst'): string[] =>
  data.characters.epinel.skills[slot]
    .split(/\n(?=■)/)
    .map((l) => l.replace(/^■\s*/, '').replace(/\n/g, ' ').trim());

describe('epinel — fixture sanity (non-vacuity)', () => {
  it('epinel fires her SMG continuously and empties many magazines', () => {
    // The lastBullet clock runs on magazine empties; zero shots would make every cadence claim
    // trivially true.
    expect(epinelShots(base.events)).toBeGreaterThan(1000);
  });

  it('the comp actually bursts: epinel casts her BIII and Full Bursts occur', () => {
    expect(epinelCasts(base.events).length).toBeGreaterThanOrEqual(2);
    expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(2);
  });

  it('epinel deals weapon damage', () => {
    expect(unitOf(base.res, 'epinel').totalDamage).toBeGreaterThan(0);
  });
});

describe('E1 — S2 last-bullet crit buffs (5.05% rate / 6.4% damage, 5s, self)', () => {
  const rates = epinelBuffs(base.events, 'critRatePct');
  const cdmg = epinelBuffs(base.events, 'critDamagePct');

  it('applies the exact kit magnitudes, self-only', () => {
    expect(rates.length).toBeGreaterThan(0);
    expect([...new Set(rates.map((b) => b.value))]).toEqual([5.05]);
    expect([...new Set(cdmg.map((b) => b.value))]).toEqual([6.4]);
    expect([...new Set(rates.map((b) => b.targetIdx))]).toEqual([EPINEL]);
    expect([...new Set(cdmg.map((b) => b.targetIdx))]).toEqual([EPINEL]);
  });

  it('lasts exactly 5 seconds per application and co-applies on one frame', () => {
    for (const b of [...rates, ...cdmg]) {
      expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
    }
    // One last-bullet proc refreshes BOTH stats on the same frame.
    expect(rates.length).toBe(cdmg.length);
    expect(
      [...new Set(rates.map((b) => b.frame))].sort((a, z) => a - z)
    ).toEqual([...new Set(cdmg.map((b) => b.frame))].sort((a, z) => a - z));
  });

  it('fires at LAST-BULLET cadence — many times, but far below the shot count', () => {
    const shots = epinelShots(base.events);
    const casts = epinelCasts(base.events).length;
    // A 120-round SMG empties ~28 times in 180s: far more than her 2-3 burst casts…
    expect(rates.length).toBeGreaterThan(casts * 3);
    // …and far fewer than her thousands of shots (a shot-keyed encoding applies per pull).
    expect(rates.length).toBeLessThan(shots / 20);
  });

  it('is LIVE: removing it lowers her total (the crit window is not decorative)', () => {
    expect(base.totals.epinel).toBeGreaterThan(noS2.totals.epinel);
  });

  it('DISCRIMINATING: a shot-keyed (permanent-uptime) buff over-damages her', () => {
    expect(s2ShotFired.totals.epinel).toBeGreaterThan(base.totals.epinel);
    expect(
      epinelBuffs(s2ShotFired.events, 'critRatePct').length
    ).toBeGreaterThan(rates.length * 10);
  });
});

describe('E2 — S1 kill-fed ATK stacks are honestly UNMODELED (no kills at scope)', () => {
  it('epinel originates no ATK-family buff: her only live stats are the S2 crit pair', () => {
    const own = buffs(base.events)
      .filter((b) => b.casterIdx === EPINEL)
      .map((b) => b.stat);
    expect(own.length).toBeGreaterThan(0);
    expect([...new Set(own)].sort()).toEqual(['critDamagePct', 'critRatePct']);
  });

  it('the full S1 line sits verbatim in unmodeled.skill1 (checked vs characters.json)', () => {
    const documented = (shipped.unmodeled?.skill1 ?? []) as string[];
    expect(documented).toContain(kitLines('skill1')[0]);
    expect(shipped.skill1).toEqual([]);
  });

  it('DISCRIMINATING: a permanent max-stacks ATK buff (5 × 13.86) would inflate her total', () => {
    expect(s1MaxPassive.totals.epinel).toBeGreaterThan(base.totals.epinel);
  });
});

describe('E3 — burst nuke: 457.87% of final ATK, once per OWN cast, pre-FB', () => {
  const nukes = epinelNukes(base.events);
  const casts = epinelCasts(base.events);

  it('fires once per own burst cast at the kit magnitude, in the burst bucket', () => {
    expect(casts.length).toBeGreaterThanOrEqual(2);
    expect(nukes.length).toBe(casts.length);
    expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([457.87]);
    expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
  });

  it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
    expect(nukes.filter((d) => d.fbMajorApplied).length).toBe(0);
  });

  it('DISCRIMINATING: removing the nuke zeroes her burst-bucket damage', () => {
    expect(epinelNukes(noNuke.events).length).toBe(0);
  });

  it('DISCRIMINATING: a fullBurstEnter keying over-fires on helm-led Full Bursts, in-FB', () => {
    // helm co-B3 leads alternate FBs, so a fullBurstEnter-keyed nuke fires MORE often than her
    // own casts and lands inside the window (taking the +50% major).
    const fbCount = fbStarts(nukeFbEnter.events).length;
    const overFired = epinelNukes(nukeFbEnter.events);
    expect(overFired.length).toBe(fbCount);
    expect(overFired.length).toBeGreaterThan(casts.length);
    expect(overFired.some((d) => d.fbMajorApplied)).toBe(true);
  });
});

describe('E4 — burst max-stacks extra hit is honestly UNMODELED (the gate can never open)', () => {
  it('exactly ONE burst hit per own cast frame — no folded conditional second hit', () => {
    const nukes = epinelNukes(base.events);
    const perFrame = new Map<number, number>();
    for (const d of nukes) {
      perFrame.set(d.frame, (perFrame.get(d.frame) ?? 0) + 1);
    }
    expect(perFrame.size).toBe(epinelCasts(base.events).length);
    for (const count of perFrame.values()) {
      expect(count).toBe(1);
    }
  });

  it('the conditional line sits verbatim in unmodeled.burst (checked vs characters.json)', () => {
    const documented = (shipped.unmodeled?.burst ?? []) as string[];
    const conditional = kitLines('burst').find((l) =>
      l.includes('Total Noob is at max stacks')
    );
    expect(conditional).toBeDefined();
    expect(documented).toContain(conditional);
  });

  it('DISCRIMINATING: folding the conditional into an unconditional second hit inflates her total', () => {
    expect(doubleNuke.totals.epinel).toBeGreaterThan(base.totals.epinel);
    expect(epinelNukes(doubleNuke.events).length).toBe(
      epinelNukes(base.events).length * 2
    );
  });
});

describe('E5 — structure + documentation: nothing dropped, nothing fabricated', () => {
  it('skill2 carries exactly one block: the lastBullet crit pair', () => {
    expect(shipped.skill2.length).toBe(1);
    const b = shipped.skill2[0];
    expect(b.trigger).toEqual({ kind: 'lastBullet' });
    expect(b.target).toEqual({ kind: 'self' });
    expect(b.effects.map((e: any) => e.stat).sort()).toEqual([
      'critDamagePct',
      'critRatePct',
    ]);
  });

  it('burst carries exactly one block: the 457.87 nuke on burstCast', () => {
    expect(shipped.burst.length).toBe(1);
    const b = shipped.burst[0];
    expect(b.trigger).toEqual({ kind: 'burstCast' });
    expect(b.target).toEqual({ kind: 'enemy' });
    expect(b.effects).toEqual([{ kind: 'flatDamage', atkPct: 457.87 }]);
  });

  it('the modeled burst line is NOT in unmodeled; no `ignored` block anywhere', () => {
    const modeled = kitLines('burst').find((l) =>
      l.includes('Burst Skill damage')
    );
    expect(modeled).toBeDefined();
    expect((shipped.unmodeled?.burst ?? []) as string[]).not.toContain(modeled);
    expect(shipped.ignored).toBeUndefined();
    const kinds = [...shipped.skill1, ...shipped.skill2, ...shipped.burst]
      .flatMap((b: any) => b.effects.map((e: any) => e.kind))
      .filter((k: string) => k === 'ignored');
    expect(kinds).toEqual([]);
  });
});
