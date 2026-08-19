/**
 * centi — per-unit kit spec test (written from the kit prose alone).
 *
 * KIT (RL / Iron / Defender / Burst II; ammo 6, chargeFrames 60, normalAttackMultiplier 61.3):
 *   S1-a  battle start, self             -> force-uses Skill 2
 *   S1-b  landing a Full Charge, self    -> 'Cooldown of Skill 2' down 9.16%
 *   S1-c  shield she created is destroyed, all allies -> heal 9.7% of her final Max HP
 *   S2    all allies -> Shield = 7% of her final Max HP, 5 sec (NO activation clause)
 *   B-a   5 enemies, lowest HP -> 145.46% of final ATK; DEF down 14.54% for 10 sec
 *   B-b   self -> Max HP up 5% for 10 sec
 *
 * FIXTURE: controlComp('centi', true) = liter B1 / crown B2 / centi / helm B3, deterministic.
 *   centi is a Burst II unit sharing stage 2 with crown, so her cast count is rotation-dependent.
 *   Every burst assertion below is guarded by an explicit NON-VACUITY check
 *   (centiBurstInstances > 0). If that guard fails the FIXTURE is wrong, not the model: rebuild
 *   with a non-Burst-II support in crown's slot. controlComp(slug, false) is NOT an option --
 *   dropping the fixed Burst III leaves the team with no B3 at all, so no chain completes and
 *   centi never bursts.
 *
 * WHY EACH ASSERTION DISCRIMINATES (nearest-wrong model per line):
 *   B-a magnitude   : stripping the burst damage effects must move ONLY centi. A rider that leaked
 *                     into a team buff -- or one that fed burst gauge -- would move teammates too
 *                     (it cannot: her cast happens inside the burst chain, where gauge is locked).
 *                     Doubling atkPct must add exactly one more copy (linearity).
 *   B-a instances   : 'Affects 5 enemy unit(s)' against a single boss = ONE damage instance per
 *                     cast. A 5x-authored burst fails; so does keying the block to fullBurstEnter
 *                     instead of the cast (instance count then decouples from her own cast count,
 *                     which is measured independently off her self Max HP grant).
 *   B-a FB / range  : a Burst II cast resolves BEFORE Full Burst opens, and function damage takes
 *                     no +30% range bonus -- so removing her hits must not change how many
 *                     burst-bucket hits carry fbMajorApplied / rangeApplied.
 *   B-a DEF down    : asserted NEGATIVELY -- it must not be fudged into damageTakenPct at the same
 *                     14.54 number (a DEF reduction and a Damage Taken increase are different
 *                     multiplicative positions; equating them is a fit, not a model).
 *   B-b scope       : doubling the kit % must change ONLY centi's own Max HP grants
 *                     ('Affects self' vs an all-allies mis-scope).
 *   B-b duration    : 10 sec of WALL CLOCK -> patching to 60 sec must push expiresFrame by exactly
 *                     3000 frames. A round-count (durationShots) or permanent encoding shifts
 *                     nothing and goes red.
 *   S1 / S2 inert   : stripping skill1+skill2 must leave every unit's damage AND the full-burst
 *                     count untouched -- the behavioural guard against 'Cooldown of Skill 2 down
 *                     9.16%' being encoded as burstCdr (which would buy extra Full Bursts).
 *                     NOTE: this inertness is COMP-SCOPED. No unit in this fixture consumes a
 *                     shield or a heal; the shield/heal lines are not inert in general -- a
 *                     teammate with a `shielded` or `recovery` trigger reads them.
 *
 * The shield itself has no event on cfg.onEvent (kinds are shot/damage/buffApply/buffRemove/
 * reload/burstCast/fullBurstStart/fullBurstEnd), so S1-a and S2 are asserted STRUCTURALLY against
 * the committed override (obtained as a clone via withPatchedOverride(slug, () => {})) plus the
 * behavioural inertness check above.
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

const SLUG = 'centi';
const FPS = 60;

type AnyEv = SimEvent & Record<string, any>;

// --- override-shape helpers -------------------------------------------------
// The override FILE is slot-keyed; tolerate both documented shapes for a slot
// (a bare Block[] or a CharacterSkills carrying its own blocks[]) and always
// return the LIVE array so in-place mutation of the clone works either way.
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) {
    return s;
  }
  if (s && Array.isArray(s.blocks)) {
    return s.blocks;
  }
  return [];
}
function effectsOf(block: any): any[] {
  return Array.isArray(block?.effects) ? block.effects : [];
}
function allBlocks(ov: any): { slot: string; block: any }[] {
  return (['skill1', 'skill2', 'burst'] as const).flatMap((slot) =>
    blocksOf(ov, slot).map((block) => ({ slot, block }))
  );
}
function allEffects(ov: any): any[] {
  return allBlocks(ov).flatMap(({ block }) => effectsOf(block));
}

// --- counterfactual mutators ------------------------------------------------
const DAMAGE_KINDS = new Set([
  'flatDamage',
  'dot',
  'hitRepeat',
  'storedHit',
  'stackedNuke',
]);
const isMaxHpBuff = (e: any) =>
  e?.kind === 'buff' && typeof e.stat === 'string' && /maxhp/i.test(e.stat);

function stripBurstDamage(ov: any) {
  for (const b of blocksOf(ov, 'burst')) {
    b.effects = effectsOf(b).filter((e: any) => !DAMAGE_KINDS.has(e.kind));
  }
}
function doubleBurstDamage(ov: any) {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of effectsOf(b)) {
      if (e.kind === 'flatDamage') {
        e.atkPct *= 2;
      }
    }
  }
}
function setMaxHpDuration(ov: any, sec: number) {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of effectsOf(b)) {
      if (isMaxHpBuff(e)) {
        e.durationSec = sec;
      }
    }
  }
}
function doubleMaxHpValue(ov: any) {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of effectsOf(b)) {
      if (isMaxHpBuff(e)) {
        e.value *= 2;
      }
    }
  }
}
function stripSkills(ov: any) {
  blocksOf(ov, 'skill1').splice(0);
  blocksOf(ov, 'skill2').splice(0);
}

// --- runs (hoisted: each is a full 180 s sim) -------------------------------
type Run = { res: any; events: AnyEv[] };

function run(patch?: (ov: any) => void): Run {
  const events: AnyEv[] = [];
  const sink = (ev: AnyEv) => events.push(ev);
  const opts: any = controlComp(SLUG, true);
  opts.onEvent = sink;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: sink };
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch),
    };
  }
  return { res: runComp(opts), events };
}

const OV = withPatchedOverride(SLUG, () => {});
const BASE = run();
const NO_BURST_DMG = run(stripBurstDamage);
const DOUBLE_BURST_DMG = run(doubleBurstDamage);
const LONG_MAXHP = run((ov) => setMaxHpDuration(ov, 60));
const DOUBLE_MAXHP = run(doubleMaxHpValue);
const NO_SKILLS = run(stripSkills);

// --- event helpers ----------------------------------------------------------
const MAXHP_STATS = new Set([
  'maxHpFlat',
  'maxHpPct',
  'targetMaxHpPct',
  'casterMaxHpPct',
]);
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const uniq = (a: number[]) => [...new Set(a)];
const maxHpOn = (evs: AnyEv[], slug: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' && MAXHP_STATS.has(e.stat) && e.targetSlug === slug
  );
const burstDamage = (evs: AnyEv[]) =>
  evs.filter((e) => e.kind === 'damage' && e.bucket === 'burst');
const fbStarts = (evs: AnyEv[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

const baseTotals = totals(BASE.res);
const slugs = Object.keys(baseTotals);
const teammates = slugs.filter((s) => s !== SLUG);

// centi's own burst damage instances, isolated by difference (documented-API only).
const centiBurstInstances =
  burstDamage(BASE.events).length - burstDamage(NO_BURST_DMG.events).length;

// centi's own Max HP grant, identified by the value that MOVES when the kit % is doubled
// (no need to know her Max HP, and immune to a teammate also granting Max HP).
const baseMaxHp = maxHpOn(BASE.events, SLUG).map((e) => r6(e.value));
const dblMaxHp = maxHpOn(DOUBLE_MAXHP.events, SLUG).map((e) => r6(e.value));
const onlyBase = uniq(baseMaxHp).filter((v) => !dblMaxHp.includes(v));
const onlyDbl = uniq(dblMaxHp).filter((v) => !baseMaxHp.includes(v));
const centiMaxHpValue = onlyBase.length === 1 ? onlyBase[0] : undefined;
const centiCasts =
  centiMaxHpValue === undefined
    ? 0
    : baseMaxHp.filter((v) => v === centiMaxHpValue).length;

function firstExpiryByStatValue(evs: AnyEv[]): Map<string, any> {
  const m = new Map<string, any>();
  for (const e of maxHpOn(evs, SLUG)) {
    const k = `${e.stat}|${r6(e.value)}`;
    if (!m.has(k)) {
      m.set(k, e.expiresFrame);
    }
  }
  return m;
}

describe('centi — kit spec', () => {
  it('fixture: the comp runs, emits events, and centi is in it', () => {
    expect(BASE.events.length).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(teammates.length).toBeGreaterThanOrEqual(2);
    expect(fbStarts(BASE.events)).toBeGreaterThan(0);
  });

  it('fixture: the committed override carries blocks in the kit slots', () => {
    expect(
      blocksOf(OV, 'skill1').length + blocksOf(OV, 'skill2').length
    ).toBeGreaterThan(0);
    expect(blocksOf(OV, 'burst').length).toBeGreaterThan(0);
  });

  // NON-VACUITY: everything below about the burst is meaningless if she never casts.
  it('fixture NON-VACUITY: centi actually casts her burst in this comp', () => {
    expect(centiBurstInstances).toBeGreaterThan(0);
    expect(centiCasts).toBeGreaterThan(0);
  });

  it('burst 145.46% of final ATK: moves only centi, and is linear in atkPct', () => {
    const t0 = totals(BASE.res);
    const tNo = totals(NO_BURST_DMG.res);
    const tDbl = totals(DOUBLE_BURST_DMG.res);

    const delta = t0[SLUG] - tNo[SLUG];
    expect(delta).toBeGreaterThan(0);

    // inertness: her burst hit is hers alone, and generates no gauge (it lands inside
    // the burst chain), so the rotation and every teammate total are untouched.
    for (const s of teammates) {
      expect(tNo[s] / t0[s]).toBeCloseTo(1, 9);
      expect(tDbl[s] / t0[s]).toBeCloseTo(1, 9);
    }
    expect(fbStarts(NO_BURST_DMG.events)).toBe(fbStarts(BASE.events));

    // doubling the kit % adds exactly one more copy of the same hit
    expect((tDbl[SLUG] - t0[SLUG]) / delta).toBeCloseTo(1, 6);
  });

  it('burst damage: ONE instance per cast (single boss), keyed to her own cast', () => {
    expect(centiBurstInstances).toBe(centiCasts);
  });

  it('burst damage lands pre-Full-Burst (no +50% major) and takes no range bonus', () => {
    const a = burstDamage(BASE.events);
    const b = burstDamage(NO_BURST_DMG.events);
    const fb = (evs: AnyEv[]) =>
      evs.filter((e) => e.fbMajorApplied === true).length;
    const rg = (evs: AnyEv[]) =>
      evs.filter((e) => e.rangeApplied === true).length;
    expect(a.length).toBeGreaterThan(b.length);
    expect(fb(a)).toBe(fb(b));
    expect(rg(a)).toBe(rg(b));
  });

  it('burst damage block targets the enemy at the literal kit multiplier, no core strike', () => {
    const dmgBlocks = blocksOf(OV, 'burst').filter((b) =>
      effectsOf(b).some((e: any) => e.kind === 'flatDamage')
    );
    expect(dmgBlocks.length).toBeGreaterThan(0);
    for (const b of dmgBlocks) {
      expect(b.target.kind).toBe('enemy');
    }
    const hits = dmgBlocks.flatMap((b) =>
      effectsOf(b).filter((e: any) => e.kind === 'flatDamage')
    );
    expect(hits.map((e: any) => e.atkPct)).toContain(145.46);
    // the kit line says plain 'damage', never a core strike
    for (const e of hits) {
      expect(e.core).not.toBe(true);
    }
  });

  it('burst self Max HP up 5%: self-scoped and linear in the kit %', () => {
    expect(onlyBase).toHaveLength(1);
    expect(onlyDbl).toHaveLength(1);
    expect(onlyDbl[0] / onlyBase[0]).toBeCloseTo(2, 6);

    // 'Affects self' — no teammate's Max HP grants move when centi's kit % doubles
    for (const s of teammates) {
      const before = maxHpOn(BASE.events, s)
        .map((e) => r6(e.value))
        .sort((x, y) => x - y);
      const after = maxHpOn(DOUBLE_MAXHP.events, s)
        .map((e) => r6(e.value))
        .sort((x, y) => x - y);
      expect(after).toEqual(before);
    }
  });

  it('burst self Max HP window is 10 sec of WALL CLOCK', () => {
    const a = firstExpiryByStatValue(BASE.events);
    const c = firstExpiryByStatValue(LONG_MAXHP.events);
    const shifted = [...a.entries()].filter(
      ([k, v]) => c.has(k) && c.get(k) !== v
    );
    expect(shifted).toHaveLength(1);
    expect(c.get(shifted[0][0]) - shifted[0][1]).toBe(50 * FPS);
  });

  it('skill1 + skill2 move no damage here and never buy an extra Full Burst', () => {
    // COMP-SCOPED: nothing in liter/crown/helm consumes a shield or a heal. The point of
    // this assertion is the rotation: 'Cooldown of Skill 2 down 9.16%' must not have been
    // encoded as burstCdr, which would show up as extra Full Bursts / more team damage.
    const t0 = totals(BASE.res);
    const tE = totals(NO_SKILLS.res);
    for (const s of slugs) {
      expect(tE[s] / t0[s]).toBeCloseTo(1, 9);
    }
    expect(fbStarts(NO_SKILLS.events)).toBe(fbStarts(BASE.events));
  });

  it('skill1 CDR is scoped to Skill 2 — never a burst-cooldown reduction', () => {
    expect(allEffects(OV).filter((e) => e.kind === 'burstCdr')).toHaveLength(0);
  });

  it('skill2 shield: 7% of caster Max HP for 5 sec, all allies, live from battle start', () => {
    const shieldBlocks = allBlocks(OV).filter(({ block }) =>
      effectsOf(block).some((e: any) => e.kind === 'shield')
    );
    expect(shieldBlocks.length).toBeGreaterThan(0);

    const shields = shieldBlocks.flatMap(({ block }) =>
      effectsOf(block).filter((e: any) => e.kind === 'shield')
    );
    expect(
      shields.some(
        (e: any) =>
          Math.abs((e.maxHpPct ?? 0) - 7) < 1e-6 && e.durationSec === 5
      )
    ).toBe(true);

    // 'Affects all allies' — self included, so excludeSelf must not be set
    expect(
      shieldBlocks.some(
        ({ block }) =>
          block.target?.kind === 'allies' && block.target?.excludeSelf !== true
      )
    ).toBe(true);

    // S1-a 'forcefully uses Skill 2 at the start of battle': an `interval` trigger first
    // fires at t=sec, so covering t=0 needs a battleStart (or passive) shield carrier.
    expect(
      shieldBlocks.some(({ block }) =>
        ['battleStart', 'passive'].includes(block.trigger?.kind)
      )
    ).toBe(true);
  });

  it('burst DEF down 14.54% is not fudged into a 14.54% Damage Taken up on the boss', () => {
    const fudged = (e: any) =>
      e?.stat === 'damageTakenPct' && Math.abs(e.value - 14.54) < 1e-6;
    expect(
      allEffects(OV).filter((e) => e.kind === 'buff' && fudged(e))
    ).toHaveLength(0);
    expect(
      BASE.events.filter((e) => e.kind === 'buffApply' && fudged(e))
    ).toHaveLength(0);
  });

  it('GAP line S1-c (heal on shield destruction) is accounted for, not silently dropped', () => {
    const um = JSON.stringify((OV as any).unmodeled ?? {});
    const modeledAsHeal = allEffects(OV).some((e) => e.kind === 'heal');
    expect(/9\.7/.test(um) || modeledAsHeal).toBe(true);
  });

  it('GAP line S1-b (Skill 2 cooldown down 9.16%) is accounted for, not silently dropped', () => {
    const um = JSON.stringify((OV as any).unmodeled ?? {});
    const modeledAsCdr = allEffects(OV).some(
      (e) => e.kind === 'buff' && e.stat === 'skillCooldownReductionSec'
    );
    expect(/9\.16/.test(um) || modeledAsCdr).toBe(true);
  });

  // ---- GAPs: no primitive / no observable ----------------------------------
  it.skip('S1-c heal fires when a centi shield is DESTROYED — unreachable at scope lock (the boss deals no damage and no shield HP pool is modeled); a teammate `recovery` consumer would be under-credited if it ever fired', () => {});

  it.skip('S1-b percent-of-cooldown reduction has no primitive — skillCooldownReductionSec is SECONDS, and skill2 cooldown is not in the kit text (a datamined CD would be needed to convert 9.16%); its only downstream output (the shield) is damage-inert at scope lock', () => {});

  it.skip('burst DEF down 14.54% for 10 sec — no enemy-DEF-reduction StatKey exists (defPct is self and inert; damageTakenPct is a different mechanic), so boss-DEF reduction cannot be expressed', () => {});

  it.skip('shield / heal emission is not observable on cfg.onEvent (no shield or recovery event kind), so S1-a and S2 are pinned structurally against the override rather than behaviourally', () => {});
});
