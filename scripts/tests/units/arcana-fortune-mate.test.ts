// PER-UNIT KIT SPEC — `arcana-fortune-mate` (Arcana: Fortune Mate, SG / Attacker / Fire, Burst II,
// cd 20s, ammo 9, 10 pellets/shot, burstGauge 2/shot). Kit-autonomy gauntlet 2026-07-24 (test-first).
//
// ⚠ EXACT-SLUG: this is `arcana-fortune-mate` (SG/Fire/B2 Attacker, aka afm/jkana/arcanafm) — NOT
//   base `arcana` (RL/Supporter/Electric/B2). They share a base name and NOTHING else.
//
// One assertion group per KIT LINE (L1..L7 + U1..U3), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each line
// must discriminate against) — never the encoding under test.
//
// Kit (blablalink prose @ lvl10, data/characters.json → characters['arcana-fortune-mate'].skills):
//   S1 ■ on Full Burst END, all shotgun-wielding allies: ATK ▲13% of caster ATK × Precious Moments
//        stacks (3 max ⇒ 39%) for 15s                                              [L1]
//      ■ when Happy Memories takes effect, self: Snapshots of Youth — Normal Attack Damage
//        Multiplier ▲10% continuously, ×3 (⇒ 30%)                                  [L2]
//      ■ on Full Burst END, self: removes Making Memories + Snapshots of Youth      [U3] (mode cleanup)
//   S2 ■ normal attacks while in Making Memories (one effect at a time, resets on MM removal):
//        2 hits: Reload 6 rounds                                                    [U1] (uptime QoL)
//        4 hits: Happy Memories — Number of pellets ▲1 continuously, ×3 (⇒ +3)      [L5]
//        6 hits: Precious Moments — ATK ▲2.49% continuously, ×3 (⇒ 7.47%)           [L4]
//      ■ on Burst Skill, all shotgun-wielding allies (EXCEPT self): Attack Damage ▲55% for 10s [L3]
//   BU ■ self: Making Memories — Crit Rate ▲20.09% + Attack Damage ▲29.99% continuously [L6]
//        Reload 2 rounds                                                            [U2] (uptime QoL)
//      ■ all enemies: 554.4% of final ATK as Burst Skill damage                     [L7]
//
// THE TWO FAITHFULNESS SPINES this spec pins (both are documented owner fixes the override carries):
//
//   (a) WEAPON-TYPED TARGETING (2026-07-16 fix). L1/L3 target `alliesOfWeapon SG` (kit: "all
//       shotgun-wielding allies"; L3 "except self"), NOT the old `alliesOfClass Attacker`
//       approximation. Fixture B fields zwei (SG/Supporter — an SG non-Attacker) and liter
//       (RL/Supporter — a non-SG ally) so the scoping is falsifiable BOTH ways: an all-allies
//       retarget leaks onto liter; an Attacker retarget drops zwei. L3 additionally carries
//       excludeSelf — dropping it leaks the 55% onto afm herself (kit: "except self").
//
//   (b) burstCast KEYING of the Making-Memories self-buffs (2026-07-16 mechanic fix). L2/L4/L5/L6
//       are keyed to afm's OWN `burstCast` + durationSec 11 (her burst → FB exit), NOT
//       `fullBurstEnter` — which would wrongly grant Making Memories on ANY team Full Burst even
//       when a DIFFERENT B2 burst and she did not. Fixture A (crown contests the B2 slot ⇒ afm
//       casts 0 bursts while the team still Full-Bursts 12×) proves it: every self-buff is
//       perfectly INERT there, while a fullBurstEnter counterfactual fires on all 12 team FBs.
//
//   (c) THE A4 PELLET PRIMITIVE (2026-07-21 fix). Happy Memories "+1 pellet ×3" is the real
//       `pelletCountFlat 3` (10→13 effective SG pellets), which is MULTIPLICATIVE with Snapshots'
//       `normalAttackPct 30` (×1.30·×1.30 = ×1.69). The pre-A4 encoding proxied it as a second
//       `normalAttackPct 30`, which SUMMED (30+30 = 60 ⇒ ×1.60) and under-counted normals ~5%.
//       L5 asserts the shipped normal-bucket total EXCEEDS the additive counterfactual.
//
// casterAtkPct is stored by the engine as an ABSOLUTE ATK grant (caster ATK × pct), so L1 pins the
// kit's "13% × 3 stacks = 39%" as a 3:1 ratio against a value-13 (1-stack) counterfactual.
//
// Fixture: B = [liter, afm, drake, zwei] — afm sole B2 (bursts every rotation), drake (SG/Attacker
// B3) + zwei (SG/Supporter B1) are the SG allies, liter (RL) the non-SG foil. A = [liter, crown,
// afm, drake, helm] — crown (B2 cd20) contests the slot so afm never bursts. Deterministic (no seed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture B — afm sole B2 (bursts every rotation); SG allies = afm/drake/zwei; liter = non-SG foil. */
const B_SLUGS = ['liter', 'arcana-fortune-mate', 'drake', 'zwei'] as const;
const B_AFM = 1;
const B_SG = [1, 2, 3]; // afm, drake, zwei (liter=RL excluded)
/** Fixture A — crown (B2 cd20) contests the slot so afm never bursts; team still Full-Bursts. */
const A_SLUGS = [
  'liter',
  'crown',
  'arcana-fortune-mate',
  'drake',
  'helm',
] as const;
const A_AFM = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  slugs: readonly string[],
  focus: string,
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: focus,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const afmBuffs = (evs: SimEvent[], slot: number) =>
  buffs(evs).filter((b) => b.casterIdx === slot);
const afmCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'arcana-fortune-mate'
  );
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd');
const afmDmg = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage => e.kind === 'damage' && e.slug === 'arcana-fortune-mate'
  );
/** Sum of afm's NORMAL-bucket damage — the L5 pellet×snapshot multiplicativity observable. */
const afmNormalTotal = (evs: SimEvent[]) =>
  afmDmg(evs)
    .filter((d) => d.bucket === 'normal')
    .reduce((s, d) => s + d.amount, 0);
/** distinct firing frames of a buffApply stream (one firing = one frame, even multi-holder). */
const firings = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const targets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? 99) - (b ?? 99)
  );

// ---- counterfactual patches (nearest wrong model each line must beat) -------------------------
const patch = (mutate: (ov: any) => void) =>
  withPatchedOverride('arcana-fortune-mate', mutate);

/** L1 magnitude: 1 Precious Moments stack (13%) instead of 3 (39%). */
const l1OneStack = patch((ov) => {
  const e = ov.skill1[0]?.effects?.find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('afm S1 casterAtkPct missing — stale fixture');
  }
  e.value = 13;
});
/** L1/L3 targeting: the documented prior approximation — alliesOfClass Attacker (drops SG non-Attackers). */
const targetClass = patch((ov) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.target?.kind === 'alliesOfWeapon') {
      b.target = { kind: 'alliesOfClass', cls: 'Attacker' };
      n++;
    }
  }
  if (n !== 2) {
    throw new Error('afm: expected 2 alliesOfWeapon blocks, found ' + n);
  }
});
/** L1/L3 targeting: all allies (leaks the buff onto the non-SG ally). */
const targetAll = patch((ov) => {
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.target?.kind === 'alliesOfWeapon') {
      b.target = { kind: 'allies' };
    }
  }
});
/** L3: drop excludeSelf — the 55% then leaks onto afm herself (kit: "except self"). */
const l3NoExclude = patch((ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b?.target?.excludeSelf) {
    throw new Error('afm S2 55% excludeSelf missing — stale fixture');
  }
  delete b.target.excludeSelf;
});
/** L5: the pre-A4 encoding — Happy Memories as a SECOND normalAttackPct 30 (additive ×1.60, not
 *  the multiplicative pelletCountFlat 3 ⇒ ×1.69). */
const l5AdditiveProxy = patch((ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'pelletCountFlat');
  if (!e) {
    throw new Error('afm pelletCountFlat missing — stale fixture');
  }
  e.stat = 'normalAttackPct'; // now Snapshots 30 + Happy 30 = 60 additive
});
/** L2/L4/L5/L6 keying: re-key the Making-Memories SELF buffs from own burstCast to fullBurstEnter —
 *  the over-credit the shipped encoding avoids (grants MM on ANY team FB even when afm did not burst). */
const selfBuffsOnFbEnter = patch((ov) => {
  const selfBlocks = [
    ov.skill1.find((b: any) => b.target?.kind === 'self'),
    ov.skill2.find((b: any) => b.target?.kind === 'self'),
    ov.burst.find((b: any) => b.target?.kind === 'self'),
  ];
  for (const b of selfBlocks) {
    if (b?.trigger?.kind !== 'burstCast') {
      throw new Error('afm self-buff not burstCast-keyed — stale fixture');
    }
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
/** L7: burst nuke halved (554.4% → 277.2%). */
const l7Half = patch((ov) => {
  const fd = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'flatDamage');
  if (!fd) {
    throw new Error('afm burst flatDamage missing — stale fixture');
  }
  fd.atkPct = 277.2;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const B = run(B_SLUGS, 'drake'); // afm bursts every rotation
const A = run(A_SLUGS, 'drake'); // afm never bursts (crown contests B2)
const rL1OneStack = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': l1OneStack,
});
const rTargetClass = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': targetClass,
});
const rTargetAll = run(B_SLUGS, 'drake', { 'arcana-fortune-mate': targetAll });
const rL3NoExclude = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': l3NoExclude,
});
const rL5Additive = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': l5AdditiveProxy,
});
const rSelfFbEnterA = run(A_SLUGS, 'drake', {
  'arcana-fortune-mate': selfBuffsOnFbEnter,
});
const rL7Half = run(B_SLUGS, 'drake', { 'arcana-fortune-mate': l7Half });

// ---- derived constants (from the SHIPPED runs, not hardcoded) ---------------------------------
const B_CASTS = afmCasts(B).length;
const B_FB = fbEnds(B).length;
const A_CASTS = afmCasts(A).length;
const A_FB = fbEnds(A).length;

describe('arcana-fortune-mate (SG/Fire/B2 Attacker) — kit spec', () => {
  it('fixture sanity: B afm bursts every rotation; A afm never bursts but the team still Full-Bursts', () => {
    expect(B_CASTS, 'fixture B: afm should burst').toBeGreaterThan(0);
    expect(
      A_FB,
      'fixture A: Full Bursts still happen (crown closes the chain)'
    ).toBeGreaterThan(1);
    expect(
      A_CASTS,
      'fixture A: crown must contest the B2 slot so afm never bursts'
    ).toBe(0);
  });

  describe('L1 — S1: 39% casterATK (13% × 3 Precious stacks) to all SG allies on Full Burst END, 15s', () => {
    const line = afmBuffs(B, B_AFM).filter((b) => b.stat === 'casterAtkPct');
    it('reaches exactly the SG allies (afm/drake/zwei), never the RL ally (liter), for 15s, per FB-end', () => {
      expect(targets(line)).toEqual(B_SG);
      expect(firings(line).length).toBe(B_FB);
      for (const b of line) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });
    it('is 39% of caster ATK = 3× the 1-stack (13%) magnitude', () => {
      const cf = afmBuffs(rL1OneStack, B_AFM).filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(line[0].value / cf[0].value).toBeCloseTo(3, 6); // 39 / 13
    });
    it('DISCRIMINATING: an alliesOfClass-Attacker retarget drops the SG Supporter (zwei)', () => {
      const cf = afmBuffs(rTargetClass, B_AFM).filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(targets(cf)).toEqual([B_AFM, 2]); // zwei (slot 3, Supporter) lost
    });
    it('DISCRIMINATING: an all-allies retarget leaks onto the RL ally (liter)', () => {
      const cf = afmBuffs(rTargetAll, B_AFM).filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(targets(cf)).toEqual([0, 1, 2, 3]);
    });
  });

  describe('L3 — S2: 55% Attack Damage to SG allies EXCEPT self on burst, 10s', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 55
    );
    it('reaches the OTHER SG allies (drake/zwei) but never afm herself, for 10s, per cast', () => {
      expect(targets(line), 'excludeSelf must keep afm (slot 1) out').toEqual([
        2, 3,
      ]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('DISCRIMINATING: dropping excludeSelf leaks the 55% onto afm herself', () => {
      const cf = afmBuffs(rL3NoExclude, B_AFM).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 55
      );
      expect(targets(cf)).toEqual([1, 2, 3]);
    });
    it('DISCRIMINATING: an alliesOfClass-Attacker retarget drops zwei AND (no excludeSelf) keeps afm', () => {
      const cf = afmBuffs(rTargetClass, B_AFM).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 55
      );
      expect(targets(cf)).toEqual([1, 2]);
    });
  });

  describe("L2/L4/L5/L6 — Making-Memories SELF buffs are keyed to afm's OWN burstCast (inert when she does not burst)", () => {
    const selfStats = [
      'normalAttackPct',
      'atkPct',
      'pelletCountFlat',
      'critRatePct',
      'attackDamagePct',
    ];
    const selfBuffsA = afmBuffs(A, A_AFM).filter(
      (b) =>
        b.targetIdx === A_AFM && selfStats.includes(b.stat) && b.value !== 55
    );
    it('fixture A (afm never bursts): every self-buff is perfectly INERT across 12 team Full Bursts', () => {
      expect(
        selfBuffsA.length,
        'burstCast keying must hold ALL Making-Memories self-buffs when afm did not cast'
      ).toBe(0);
    });
    it('DISCRIMINATING: fullBurstEnter keying would fire them on every team FB in fixture A', () => {
      const cf = afmBuffs(rSelfFbEnterA, A_AFM).filter(
        (b) =>
          b.targetIdx === A_AFM && selfStats.includes(b.stat) && b.value !== 55
      );
      expect(
        cf.length,
        'fullBurstEnter over-credits MM on a team afm did not burst in'
      ).toBeGreaterThan(0);
    });
  });

  describe('L2 — Snapshots of Youth: self Normal Attack Damage Multiplier +30% (10% × 3), 11s', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'normalAttackPct' && b.targetIdx === B_AFM
    );
    it('is 30% on herself, one firing per cast, 11s window', () => {
      expect([...new Set(line.map((b) => b.value))]).toEqual([30]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) {
        expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
      }
    });
  });

  describe('L4 — Precious Moments: self ATK +7.47% (2.49% × 3), 11s', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'atkPct' && b.targetIdx === B_AFM
    );
    it('is 7.47% on herself, one firing per cast, 11s window', () => {
      expect([...new Set(line.map((b) => b.value))]).toEqual([7.47]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) {
        expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
      }
    });
  });

  describe('L5 — Happy Memories: self pelletCountFlat 3 (+1 pellet × 3), MULTIPLICATIVE with Snapshots (A4 fix)', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'pelletCountFlat' && b.targetIdx === B_AFM
    );
    it('is the real pellet-count primitive (+3) on herself, one firing per cast, 11s window', () => {
      expect([...new Set(line.map((b) => b.value))]).toEqual([3]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) {
        expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
      }
    });
    it('DISCRIMINATING: shipped normals EXCEED the pre-A4 additive normalAttackPct-30 proxy (×1.69 > ×1.60)', () => {
      const shipped = afmNormalTotal(B);
      const additive = afmNormalTotal(rL5Additive);
      expect(
        shipped,
        `pelletCountFlat 3 × normalAttackPct 30 must beat the additive normalAttackPct 60 proxy ` +
          `(shipped ${shipped.toFixed(0)} vs additive ${additive.toFixed(0)})`
      ).toBeGreaterThan(additive * 1.03);
    });
  });

  describe('L6 — Making Memories: self Crit Rate +20.09% AND Attack Damage +29.99%, 11s', () => {
    const crit = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'critRatePct' && b.targetIdx === B_AFM
    );
    const ad = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 29.99
    );
    it('grants both self-buffs per cast, 11s window', () => {
      expect([...new Set(crit.map((b) => b.value))]).toEqual([20.09]);
      expect([...new Set(ad.map((b) => b.value))]).toEqual([29.99]);
      expect(firings(crit).length).toBe(B_CASTS);
      expect(firings(ad).length).toBe(B_CASTS);
      for (const b of [...crit, ...ad]) {
        expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
      }
    });
  });

  describe('L7 — burst nuke: 554.4% of final ATK to all enemies, cast BEFORE the Full Burst window', () => {
    const nukes = afmDmg(B).filter((d) => d.bucket === 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(B_CASTS);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([554.4]);
      expect([...new Set(nukes.map((d) => d.srcSlot))]).toEqual(['burst']);
    });
    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
    it('DISCRIMINATING: the halved magnitude (277.2%) is a different number', () => {
      const cf = afmDmg(rL7Half).filter((d) => d.bucket === 'burst');
      expect([...new Set(cf.map((d) => d.atkPct))]).toEqual([277.2]);
    });
  });

  describe('U1/U2/U3 — honest UNMODELED skips (non-damage reloads + mode cleanup)', () => {
    it('documents the reloads + FB-end removal verbatim in unmodeled, with NO ignored-effect blocks', () => {
      const ov = JSON.parse(
        readFileSync(
          new URL(
            '../../../src/skills/overrides/arcana-fortune-mate.json',
            import.meta.url
          ),
          'utf8'
        )
      );
      expect(ov.unmodeled.skill2.join(' ')).toMatch(/Reload 6 rounds/);
      expect(ov.unmodeled.burst.join(' ')).toMatch(/Reload 2 rounds/);
      expect(ov.unmodeled.skill1.join(' ')).toMatch(/removes Making Memories/i);
      expect(
        JSON.stringify(ov),
        'validator forbids ignored-effect blocks'
      ).not.toMatch(/"ignored"/);
    });
  });
});
