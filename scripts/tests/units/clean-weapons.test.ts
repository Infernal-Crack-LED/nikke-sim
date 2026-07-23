// BASE-WEAPON FAITHFULNESS BASIS — the six "clean weapon" units, one per weapon class.
// Owner-ruled candidates: docs/data/clean-weapons.md. Set up 2026-07-23.
//
// WHAT THIS SUITE IS FOR. Every other kit test asks "is this unit's KIT encoded faithfully?".
// This one asks the prior question: "is the engine's BARE WEAPON model right?" — fire cadence,
// ammo/reload cycle, charge + release latency, pellet landing, core/crit, range bands. Those six
// units are the only ones that can answer it, because their kits contribute NOTHING to damage,
// so a recording of them measures the weapon model with no kit encoding in the way. The pinned
// totals in CW5 are the sim side of that comparison.
//
// THE THREE PREMISES this suite exists to hold, each pinned by its own group (a premise that
// isn't asserted is a premise that silently rots):
//   P1  the six kits really are damage-inert           → CW1
//   P2  bursts are disabled, and that is FREE          → CW2, CW3
//   P3  the boss element is neutral for all six        → CW4
//
// P1 IS THE FRAGILE ONE and it is NOT fully machine-checkable — it rests on a human read of the
// kit prose (all six are heal / shield / Max HP / incoming-healing / DEF / taunt only). CW1
// therefore does not re-derive cleanliness; it PINS THE PROSE so that a synergy-API sync which
// rebalances any of them fails loudly and forces a re-read, instead of quietly invalidating every
// number in this file. Two units were checked especially closely and are worth re-reading first:
//   • snow-crane's BURST grants Pierce for 10 sec — she is the one unit for whom "never burst"
//     is load-bearing rather than incidental.
//   • kurumi was the owner's original AR pick and was REJECTED here: her skill-1 block 1
//     ("Activates after landing 36 normal attack(s) … Hacked: 52.24% of final ATK as sustained
//     damage every 1 sec for 5 sec") fires off a normal-attack counter with NO burst dependency,
//     so she is not bare-weapon even under the never-burst constraint. folkwang replaced her as
//     the only AR with zero damage-touching lines including her burst (owner ruling 2026-07-23).
//
// FIXTURE. The six have no override on disk (`simSupported: false`), so the harness synthesizes an
// EMPTY kit (`bareWeaponOverride`) rather than committing six override files — see the note there.
// They cannot be fielded as one team (owner constraint), so they run as two teams of three, split
// by burst stage: team A is all Burst II and therefore cannot burst at all. Deterministic (no seed).
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  CLEAN_WEAPON_BOSS_ELEMENT,
  CLEAN_WEAPON_SLUGS,
  CLEAN_WEAPON_TEAMS,
  bareWeaponComp,
  data,
  runComp,
  totals,
  unitOf,
} from '../lib/harness.js';

/** Collect the structured event log alongside the result. */
function runWithEvents(slugs: readonly string[], bossElement: Element | null = CLEAN_WEAPON_BOSS_ELEMENT) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...bareWeaponComp(slugs),
    bossElement,
    cfg: { onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

const countKind = (events: SimEvent[], kind: SimEvent['kind']) =>
  events.filter((e) => e.kind === kind).length;

// ---------------------------------------------------------------------------------------
// CW1 — P1: the six kits are damage-inert (prose pinned, not re-derived)
// ---------------------------------------------------------------------------------------
// Pinned characteristics + a digest of the three skill-prose slots. A kit rebalance, a weapon
// stat change, or an element/burst-stage change all break this group FIRST, before any of the
// numbers below can quietly become wrong.
const PINNED = new Map<string, {
  weapon: string; element: Element; burst: string; ammo: number; reloadFrames: number;
  chargeFrames: number; hitsPerShot: number; normalMult: number; kit: string;
}>([
  ['folkwang',    { weapon: 'AR',  element: 'Water',    burst: 'II', ammo: 60,  reloadFrames: 99,  chargeFrames: 0,  hitsPerShot: 1,  normalMult: 14.29, kit: 'e74522234a347284' }],
  ['marciana',    { weapon: 'SG',  element: 'Iron',     burst: 'II', ammo: 9,   reloadFrames: 111, chargeFrames: 0,  hitsPerShot: 10, normalMult: 201.5, kit: '1bb965943677d6fa' }],
  ['snow-crane',  { weapon: 'SR',  element: 'Water',    burst: 'II', ammo: 6,   reloadFrames: 141, chargeFrames: 60, hitsPerShot: 1,  normalMult: 69.04, kit: '3fe703f611a2cb19' }],
  ['emma',        { weapon: 'MG',  element: 'Fire',     burst: 'I',  ammo: 300, reloadFrames: 171, chargeFrames: 0,  hitsPerShot: 1,  normalMult: 5.57,  kit: '338872f98c6bef00' }],
  ['claire',      { weapon: 'RL',  element: 'Electric', burst: 'I',  ammo: 6,   reloadFrames: 141, chargeFrames: 60, hitsPerShot: 1,  normalMult: 61.3,  kit: '6f885e890535da0b' }],
  ['idoll-ocean', { weapon: 'SMG', element: 'Water',    burst: 'I',  ammo: 120, reloadFrames: 111, chargeFrames: 0,  hitsPerShot: 1,  normalMult: 8.73,  kit: '514fd89e76a5ccd6' }],
]);

const kitDigest = (slug: string) =>
  createHash('sha256')
    .update([
      data.characters[slug].skills.skill1,
      data.characters[slug].skills.skill2,
      data.characters[slug].skills.burst,
    ].join(' '))
    .digest('hex')
    .slice(0, 16);

describe('CW1 — the clean-weapon six are damage-inert (premise pinned)', () => {
  it('covers all six weapon classes exactly once, three per team', () => {
    expect(CLEAN_WEAPON_SLUGS).toHaveLength(6);
    expect(CLEAN_WEAPON_TEAMS.a.map((s) => data.characters[s].weapon)).toEqual(['AR', 'SG', 'SR']);
    expect(CLEAN_WEAPON_TEAMS.b.map((s) => data.characters[s].weapon)).toEqual(['MG', 'RL', 'SMG']);
  });

  it.each([...PINNED])('%s — weapon stats and kit prose are unchanged', (slug, want) => {
    const c = data.characters[slug];
    expect({
      weapon: c.weapon, element: c.element, burst: c.burst, ammo: c.ammo,
      reloadFrames: c.reloadFrames, chargeFrames: c.chargeFrames,
      hitsPerShot: c.hitsPerShot, normalMult: c.normalAttackMultiplier,
    }).toEqual({
      weapon: want.weapon, element: want.element, burst: want.burst, ammo: want.ammo,
      reloadFrames: want.reloadFrames, chargeFrames: want.chargeFrames,
      hitsPerShot: want.hitsPerShot, normalMult: want.normalMult,
    });
    // If THIS fails, the kit text moved: re-read all three slots for damage-touching lines
    // before re-pinning. The whole suite's meaning depends on the answer still being "none".
    expect(kitDigest(slug)).toBe(want.kit);
  });

  it('none of the six has a committed override — the fixture kit is empty by construction', async () => {
    const { loadOverride } = await import('../../../src/skills/overrides-node.js');
    for (const slug of CLEAN_WEAPON_SLUGS) {
      expect(loadOverride(slug), `${slug} gained an override — the bare-weapon basis now has a kit`).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------------------
// CW2 — P2a: bursts are disabled
// ---------------------------------------------------------------------------------------
describe('CW2 — bursts are disabled', () => {
  it('team A (all Burst II) casts ZERO bursts — no Burst I unit ever opens the chain', () => {
    const { events, res } = runWithEvents(CLEAN_WEAPON_TEAMS.a);
    expect(countKind(events, 'burstCast')).toBe(0);
    for (const u of res.units) expect(u.burstCasts, u.slug).toBe(0);
  });

  it('neither team ever reaches Full Burst — no Burst III unit exists in either', () => {
    for (const [label, slugs] of Object.entries(CLEAN_WEAPON_TEAMS)) {
      const { events } = runWithEvents(slugs);
      expect(countKind(events, 'fullBurstStart'), `team ${label}`).toBe(0);
    }
  });

  it('team B (all Burst I) DOES cast — which is why CW3 has to prove casting is free', () => {
    // Discrimination: if this were 0, CW3 would pass vacuously and the "casts are inert"
    // claim would never actually be exercised.
    const { events } = runWithEvents(CLEAN_WEAPON_TEAMS.b);
    expect(countKind(events, 'burstCast')).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------
// CW3 — P2b: casting a no-op burst costs NOTHING
// ---------------------------------------------------------------------------------------
// The one place "bursts disabled" could leak into the numbers: if the engine charged weapon
// uptime for a burst cast (an animation lock), then a unit that casts would fire fewer shots
// than the same unit that never casts, and team B's baselines would not be bare-weapon.
// It does not — there is no cast lock in the fire loop — and this pins that.
describe('CW3 — a no-op burst cast is uptime-inert', () => {
  it('marciana is byte-identical whether she casts 0 bursts or several', () => {
    // Same unit, same config, only the TEAMMATES differ: alongside Burst I units the chain
    // opens and she casts; in team A it never does.
    const neverCasts = runComp(bareWeaponComp(CLEAN_WEAPON_TEAMS.a));
    const doesCast = runComp(bareWeaponComp(['marciana', ...CLEAN_WEAPON_TEAMS.b]));

    expect(unitOf(neverCasts, 'marciana').burstCasts).toBe(0);
    expect(unitOf(doesCast, 'marciana').burstCasts).toBeGreaterThan(0);
    // Byte-identical, not "close": a cast costs exactly zero weapon uptime.
    expect(unitOf(doesCast, 'marciana').totalDamage)
      .toBe(unitOf(neverCasts, 'marciana').totalDamage);
  });

  it('every unit is identical solo and in its team — the six never interact', () => {
    // Confirms the two-teams-of-three split is a pure presentation choice: it cannot move a
    // number, so the pinned baselines are per-unit facts, not per-team ones.
    for (const [label, slugs] of Object.entries(CLEAN_WEAPON_TEAMS)) {
      const team = totals(runComp(bareWeaponComp(slugs)));
      for (const slug of slugs) {
        const solo = unitOf(runComp(bareWeaponComp([slug])), slug).totalDamage;
        expect(team[slug], `${slug} (team ${label})`).toBe(solo);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------
// CW4 — P3: Iron is the neutral-for-all boss element
// ---------------------------------------------------------------------------------------
// Proved THROUGH THE ENGINE rather than read off the element wheel: an Iron boss must be
// indistinguishable from the forced-neutral boss (`bossElement: null`) for all six.
const ALL_ELEMENTS: Element[] = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'];

describe('CW4 — boss element Iron is neutral for all six', () => {
  it.each(Object.entries(CLEAN_WEAPON_TEAMS))('team %s: Iron is identical to a forced-neutral boss', (_label, slugs) => {
    const iron = totals(runComp(bareWeaponComp(slugs)));
    const none = totals(runComp({ ...bareWeaponComp(slugs), bossElement: null }));
    expect(iron).toEqual(none);
  });

  it('Iron is the ONLY such element — every other one advantages at least one unit', () => {
    const neutralFor = (el: Element) =>
      CLEAN_WEAPON_SLUGS.every((slug) => {
        const solo = bareWeaponComp([slug]);
        return unitOf(runComp({ ...solo, bossElement: el }), slug).totalDamage
          === unitOf(runComp({ ...solo, bossElement: null }), slug).totalDamage;
      });
    expect(ALL_ELEMENTS.filter(neutralFor)).toEqual(['Iron']);
  });

  it.each([
    ['folkwang', 'Fire'], ['marciana', 'Electric'], ['snow-crane', 'Fire'],
    ['emma', 'Wind'], ['claire', 'Water'], ['idoll-ocean', 'Fire'],
  ] as const)('%s takes exactly ×1.1 against the %s boss she counters', (slug, advElement) => {
    // Discrimination for the two assertions above: the elemental major is LIVE and worth
    // 10%, so "Iron === null" is a real result and not an inert code path.
    const solo = bareWeaponComp([slug]);
    const neutral = unitOf(runComp(solo), slug).totalDamage;
    const advantaged = unitOf(runComp({ ...solo, bossElement: advElement }), slug).totalDamage;
    expect(advantaged / neutral).toBeCloseTo(1.1, 10);
  });
});

// ---------------------------------------------------------------------------------------
// CW5 — the baselines themselves
// ---------------------------------------------------------------------------------------
// Scope lock (sync 400, Base-5 gear, 10/10/10, no cube/doll, core 7, boss DEF 140,
// coreHitRate 1 = "core 100", range bonus on, 180 s), boss Iron, bursts disabled.
//
// THIS IS THE SIM SIDE OF THE FAITHFULNESS TEST. Each row is one weapon class's predicted
// 180-second output with no kit whatsoever, so a recorded fight scores the weapon model
// directly. A diff here is a change to the shared weapon math — read it, don't just re-pin it.
const BASELINE: Record<string, number> = {
  folkwang:      23911667.2326,
  marciana:      35163154.4909,
  'snow-crane':  29018295.6903,
  emma:          58117326.0183,
  claire:        27520845.5655,
  'idoll-ocean': 27897286.3181,
};

describe('CW5 — bare-weapon baselines (scope lock, boss Iron, core 100, no bursts)', () => {
  it.each(Object.entries(CLEAN_WEAPON_TEAMS))('team %s baselines', (_label, slugs) => {
    const got = totals(runComp(bareWeaponComp(slugs)));
    for (const slug of slugs) {
      expect(got[slug], slug).toBeCloseTo(BASELINE[slug], 4);
    }
  });

  it('scope-lock ATK is class-based, not per-unit (config-drift guard)', () => {
    // Same class + manufacturer ⇒ identical staticAtk. A per-unit-varying "ATK" here means the
    // fixture drifted off the scope-lock basis (wrong core level or gear).
    const res = runComp(bareWeaponComp(CLEAN_WEAPON_SLUGS.slice(0, 3)));
    const byGroup = new Map<string, Set<number>>();
    for (const u of res.units) {
      const c = data.characters[u.slug];
      const key = `${c.class}|${c.manufacturer ?? '—'}`;
      (byGroup.get(key) ?? byGroup.set(key, new Set()).get(key)!).add(u.staticAtk);
    }
    for (const [key, atks] of byGroup) expect(atks.size, key).toBe(1);
  });
});
