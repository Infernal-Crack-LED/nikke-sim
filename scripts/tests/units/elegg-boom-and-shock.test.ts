// PER-UNIT KIT SPEC — `elegg-boom-and-shock` (Elegg: Boom and Shock, Attacker/MG/Water, Burst III,
// cd 40s, ammo 300). Kit-autonomy gauntlet 2026-07-25. The Water MG VARIANT — NOT the base Electric
// `elegg` (P0 slug discipline).
//
// One assertion group per damage-relevant KIT LINE (H1..H5), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` is used ONLY to build COUNTERFACTUALS / ENGINEERED states
// (the nearest wrong model each assertion must discriminate against) — never to supply the encoding
// under test.
//
// GHOST-CURRENCY MODEL. The ghost count is a LIVE RESOURCE POOL `ghost` {0..13} (the engine
// resource-counter primitive — soda-twinkling-bunny / marciana). Accrual is +1 ghost / 6s
// (interval:6 → resource +1; the kit's "Recurring interval: 6 sec" capture CAP — ⚑1). The pool is
// then EMERGENT: it peaks ~7 while bursting on cooldown (so the burst is the 6-hit branch and the cap
// nuke fires 0×) and ramps 0→13 by t≈78 in a never-burst context. The pool-threshold buffs/nuke are
// gated on the live pool via a teamAmmo:100 pool-CHECK trigger (event-driven — see the override note:
// threshold-gated `interval` blocks perturb the team-generator beam search even at byte-identical
// damage, so only the accrual is interval and the pool-checks are event-driven):
//   S1 ≥1 ghost:  ATK ▲ 16.2% of the skill user's ATK to Water allies (≈permanent from t≈6)          [H1]
//   S1 ≥4 ghosts: Elemental Advantage Attack Damage ▲ 35% to Water allies (live while pool≥4)         [H4]
//   S2 on burst:  self ATK ▲ 40% for 10 sec                                                           [H2]
//   S2 at cap:    a ghost captured at max capacity → 1100% of final ATK to all enemies                [H5]
//   BU ≠13:       800% × 6 sequential hits, ghosts ▼6                                                 [H3]
//   BU =13:       800% × 13 sequential hits, ghosts ▼9                                                [H3]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   H1  casterAtkPct is "% of the SKILL USER's ATK" to WATER allies only, gated on pool≥1 (first apply
//       after the first capture, not frame 0). Scope (exactly the two Water allies {ebs,helm}),
//       liveness, the kit magnitude 16.2, and the gated first-apply frame each fail under the nearest
//       wrong model (unscoped all-ally / permanent-from-t=0 / wrong value).
//   H2  +40% is SELF-only, lands once per burst CAST (not Full-Burst-entry — the co-B3 helm makes a
//       fullBurstEnter model over-apply), and is a 10-SECOND window.
//   H3  the burst is resource-BRANCHED on the pre-spend pool: while bursting (pool<13) every cast is
//       the 6-hit branch, and the 13-hit branch is provably reachable when the pool is engineered to
//       13 (first cast 13 hits, then the −9 spend drops later casts to 6). A single-branch model fails
//       one side or the other.
//   H4  the ≥4 tier is gated on pool≥4: present in the default sim at 35% on Water allies, first apply
//       after the pool reaches 4 (t≈24, not frame 0), and inert against a neutral (Iron) boss (it is
//       the Elemental-Advantage bucket, not a generic Damage-Up). A permanent-passive model fails the
//       first-apply-frame assertion.
//   H5  the 1100% nuke is gated on pool≥13: ZERO events while bursting (the pool peaks ~7) and fires
//       from t≈78 in a never-burst context. An ungated model fires it while bursting too.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ebs B3 / helm B3, boss Fire, focus
// ebs). Boss Fire ⇒ Water holds elemental advantage ⇒ H4 is live. Slot order: liter 0 / crown 1 /
// ebs 2 / helm 3; the Water allies are {2,3}. ebs needs a real rotation to burst (a lone B3 makes
// zero Full Bursts). Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / ebs 2 / helm 3. */
const EBS = 2;
const HELM = 3;
const WATER_ALLIES = [EBS, HELM];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: 'Fire' | 'Iron' = 'Fire',
  disableBursts = false
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('elegg-boom-and-shock'),
    bossElement,
    overrides,
    cfg: {
      onEvent: (e) => events.push(e),
      ...(disableBursts ? { disableBursts: true } : {}),
    },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / engineered patches ------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const blockWith = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {throw new Error(`ebs ${slot} block missing — fixture is stale`);}
  return b;
};

/** H1 reference: ≥1-ghost caster-ATK tier removed. */
const ebsNoS1Atk = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.skill1.length === before)
    {throw new Error('ebs S1 casterAtkPct block missing — fixture is stale');}
});
/** H1 counterfactual: the ≥1 tier as an UNSCOPED all-ally ATK buff. */
const ebsUnscopedS1Atk = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  blockWith(ov, 'skill1', (b) => hasStat(b, 'casterAtkPct')).target = {
    kind: 'allies',
  };
});
/** H2 reference: on-burst self ATK removed. */
const ebsNoS2Atk = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length === before)
    {throw new Error('ebs S2 atkPct block missing — fixture is stale');}
});
/** H4 reference: ≥4-ghost Elemental Advantage tier removed. */
const ebsNoElemAdv = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasStat(b, 'elemAdvantageDamagePct')
  );
});
/** H5 counterfactual: the nuke with its pool gate removed (fires on EVERY pool-check, ungated). */
const ebsUngatedNuke = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  const b = blockWith(ov, 'skill2', (x) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  delete b.resourceGate;
});
/** H3 engineered: pre-charge the ghost pool to 13 so the =13 burst branch is exercised. */
const ebsEng13 = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  ov.resources[0].initial = 13;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Atk = run({ 'elegg-boom-and-shock': ebsNoS1Atk });
const unscopedS1Atk = run({ 'elegg-boom-and-shock': ebsUnscopedS1Atk });
const noS2Atk = run({ 'elegg-boom-and-shock': ebsNoS2Atk });
const noElemAdvFire = run({ 'elegg-boom-and-shock': ebsNoElemAdv });
const ironBase = run({}, 'Iron');
const ironNoElemAdv = run({ 'elegg-boom-and-shock': ebsNoElemAdv }, 'Iron');
const ungatedNuke = run({ 'elegg-boom-and-shock': ebsUngatedNuke });
const eng13 = run({ 'elegg-boom-and-shock': ebsEng13 });
const noBurst = run({}, 'Fire', true);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ebsBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === EBS && b.stat === stat);
const ebsDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === 'elegg-boom-and-shock' &&
      e.srcSlot === srcSlot
  );
const ebsBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'elegg-boom-and-shock'
  );
const targetSet = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((x): x is number => x != null)
    ),
  ].sort((a, b) => a - b);
const firstFrame = (bs: BuffApply[]) => Math.min(...bs.map((b) => b.frame));
/** Burst hits land instant on the cast frame, so hits-per-cast = burst damage grouped by frame. */
const hitsByFrame = (evs: SimEvent[]) => {
  const m = new Map<number, number>();
  for (const d of ebsDamage(evs, 'burst'))
    {m.set(d.frame, (m.get(d.frame) ?? 0) + 1);}
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
};

describe('elegg-boom-and-shock (Elegg: Boom and Shock) — kit spec', () => {
  describe('H1 — S1 ≥1-ghost ATK buff: 16.2% of HER ATK, Water allies, gated on the pool', () => {
    const applied = ebsBuffs(base.events, 'casterAtkPct');

    it('reaches exactly the two Water allies (ebs + helm), not the whole team', () => {
      expect(
        applied.length,
        'no S1 casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      expect(targetSet(applied)).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: an unscoped all-ally model would also reach the non-Water allies', () => {
      expect(
        targetSet(ebsBuffs(unscopedS1Atk.events, 'casterAtkPct')).length
      ).toBeGreaterThan(WATER_ALLIES.length);
    });

    it('encodes the kit magnitude 16.2, applied as flat ATK', () => {
      const ov: any = loadOverride('elegg-boom-and-shock');
      const e = ov.skill1
        .flatMap((b: any) => b.effects)
        .find((x: any) => x.stat === 'casterAtkPct');
      expect(e.value, 'shipped kit value').toBe(16.2);
      expect(
        applied[0].value,
        'casterAtkPct resolves to flat ATK (>0)'
      ).toBeGreaterThan(0);
    });

    it('is gated on the pool: first apply after the first capture, not frame 0', () => {
      // A permanent-from-t=0 passive fails this — the pool is 0 until the first capture (~t6).
      expect(firstFrame(applied)).toBeGreaterThanOrEqual(1 * FPS);
    });

    it("is live: removing it changes the Water allies' damage", () => {
      expect(base.totals['elegg-boom-and-shock']).not.toEqual(
        noS1Atk.totals['elegg-boom-and-shock']
      );
      expect(base.totals.helm).not.toEqual(noS1Atk.totals.helm);
    });
  });

  describe('H2 — S2 grants SELF +40% ATK on burst cast, a 10-second window, once per cast', () => {
    const applied = ebsBuffs(base.events, 'atkPct');
    const bursts = ebsBursts(base.events);

    it('fires once per burst cast at the kit magnitude', () => {
      expect(bursts.length, 'fixture must let ebs burst').toBeGreaterThan(0);
      expect(applied.length).toBe(bursts.length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40]);
    });

    it('is self-scoped (no ally shares it)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EBS]);
    });

    it('is a 10-second window', () => {
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
    });

    it('is live: removing it changes her damage', () => {
      expect(base.totals['elegg-boom-and-shock']).not.toEqual(
        noS2Atk.totals['elegg-boom-and-shock']
      );
    });
  });

  describe('H3 — burst is resource-BRANCHED on the pre-spend pool (six 800% hits ≠13 / thirteen 800% hits =13)', () => {
    const nukes = ebsDamage(base.events, 'burst');
    const bursts = ebsBursts(base.events);

    it('takes the 6-hit branch for every bursting cast (the pool never reaches 13 on cooldown)', () => {
      expect(bursts.length).toBeGreaterThan(0);
      expect(
        [...new Set(nukes.map((d) => d.atkPct))],
        'each sequential hit is 800%'
      ).toEqual([800]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst cast lands before FB'
      ).toEqual([]);
      const perCast = hitsByFrame(base.events).map(([, n]) => n);
      expect(perCast.length, 'one cast frame per burst').toBe(bursts.length);
      expect(
        [...new Set(perCast)],
        'every bursting cast is the 6-hit branch'
      ).toEqual([6]);
    });

    it('DISCRIMINATING: the =13 branch (13 hits) is reachable when the pool is engineered to 13', () => {
      const counts = hitsByFrame(eng13.events).map(([, n]) => n);
      expect(counts[0], 'first cast at pool=13 is the 13-hit branch').toBe(13);
      expect(
        counts.slice(1).every((n) => n === 6),
        'the −9 spend drops every later cast to the 6-hit branch'
      ).toBe(true);
    });
  });

  describe('H4 — S1 ≥4-ghost Elemental Advantage tier: gated on pool≥4, live in the default sim', () => {
    const applied = ebsBuffs(base.events, 'elemAdvantageDamagePct');

    it('is present in the DEFAULT sim at 35% on the Water allies', () => {
      expect(
        applied.length,
        'the ≥4 tier must be live in the default context'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35]);
      expect(targetSet(applied)).toEqual(WATER_ALLIES);
    });

    it('is gated on the pool: first apply after the pool reaches 4 (t≈24), not frame 0', () => {
      expect(firstFrame(applied)).toBeGreaterThanOrEqual(20 * FPS);
    });

    it('is the Elemental-Advantage bucket: inert against a neutral (Iron) boss', () => {
      expect(ironBase.totals).toEqual(ironNoElemAdv.totals);
    });

    it('is live under elemental advantage: removing it changes Water damage vs Fire', () => {
      expect(base.totals['elegg-boom-and-shock']).not.toEqual(
        noElemAdvFire.totals['elegg-boom-and-shock']
      );
    });
  });

  describe('H5 — S2 1100% capture-at-max-capacity nuke: gated on pool≥13', () => {
    it('fires ZERO times while bursting on cooldown (the pool peaks ~7, never 13)', () => {
      expect(ebsDamage(base.events, 'skill2').length).toBe(0);
    });

    it('fires from t≈78 in a never-burst context (the pool ramps 0→13)', () => {
      const nukes = ebsDamage(noBurst.events, 'skill2');
      expect(
        nukes.length,
        'never-burst nuke fires once the pool reaches 13'
      ).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1100]);
      expect(
        Math.min(...nukes.map((d) => d.frame)),
        'first nuke at the t≈78 ramp-to-13'
      ).toBeGreaterThanOrEqual(77 * FPS);
    });

    it('DISCRIMINATING: an ungated nuke would fire while bursting too', () => {
      expect(ebsDamage(ungatedNuke.events, 'skill2').length).toBeGreaterThan(0);
    });
  });
});
