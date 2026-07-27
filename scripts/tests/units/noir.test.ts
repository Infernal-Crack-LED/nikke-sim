// PER-UNIT KIT SPEC — `noir` (Noir, Attacker/SG/Wind, Burst III, cd 40s, ammo 9, hitsPerShot 10).
// Kit-autonomy gauntlet 2026-07-25 (S2a, test-first).
//
// One assertion group per KIT LINE (N1..N6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.noir.skills):
//   S1 ■ above 70% HP → all allies: ATK ▲14.08% of the skill user's ATK constantly           [N1]
//   S2 ■ entering Full Burst → all allies: Max Ammunition Capacity ▲5 round(s) for 10 sec     [N2]
//                                          Reload 39.88% magazine(s)                          [N2b]
//   BU ■ all enemies: 351.64% of final ATK as Burst Skill damage                              [N4]
//      ■ all allies with a Shotgun: Hit Rate ▲13.93% / Dmg to Interruption Parts ▲23.23% 10s  [N3]
//      ■ with a same-squad ally on the battlefield → all allies:
//                 Hit Rate ▲11.61% / Dmg to Interruption Parts ▲19.36% for 30 sec             [N5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  casterAtkPct = a FLAT add of NOIR's ATK (resolves to 0.1408×staticAtk ≈ 16.8k), NOT a %
//       of each ally's own ATK. Nearest wrong: atkPct. Proven by the buffApply `stat`/`key`
//       (casterAtkPct, raw 14.08 in the key, flat value recorded) + the value being identical for
//       every ally (caster-flat) + a damage delta vs the atkPct counterfactual.
//   N2  trigger is `fullBurstEnter` (kit-literal "when entering Full Burst"), NOT `burstCast`.
//       Measured: the +5 grant lands on the Full-Burst-ENTRY frame (400), 22 frames AFTER noir's
//       burstCast frame (378). Nearest wrong: burstCast (the prior-10 model) lands it on the cast
//       frame. Target is ALL allies (kit "Affects all allies"), nearest wrong self-only.
//   N2b instantReload 0.3988 — the engine snaps ammo silently (sim.ts:2105 emits NO event), so
//       pinned structurally on the encoding AND behaviourally: stripping it perturbs the team's
//       realized reload cadence.
//   N3  the SG block targets `alliesOfWeapon SG` — measured it reaches ONLY the two SG allies
//       (noir+guilty), never the SMG/MG allies. Nearest wrong: `allies` (would buff liter+crown).
//   N4  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50%
//       major (verified fact). Magnitude 351.64, burst bucket, once per cast.
//   N5  the 11.61/19.36 block is GATED on a same-squad ally (blanc/rouge) via `teamHas`. Measured:
//       INERT in a comp without one (no 11.61 buff at all), FIRES for all allies/30s with blanc.
//       Nearest wrong: ungated (would over-buff every comp). Owner-ruled real 2026-07-20.
//   N6  partsDamagePct is exactly inert against the partless scope-lock boss — byte-identical
//       totals for every unit, not "small" (mirrors the helm H4 pin).
//
// Inert / unmeasured (documented, NOT asserted): the in-game MAGNITUDE of hitRatePct → core/landing
// lift is unmeasured (override ⚑3; direction live via CONE_DELTA for SG recipients) — these tests
// pin the buff's PRESENCE/target/duration, not a damage delta from it. partsDamagePct is modeled
// but inert vs the partless boss (N6 proves the inertness). The S1 "above 70% HP" gate and the
// burst "still on the battlefield" clause are scope-trivial (nothing dies at scope lock) and are
// assumption-noted in the override, not encoded.
//
// Fixtures (deterministic, no seed):
//   COMP A = liter(SMG B1) / crown(MG B2) / noir(SG B3) / guilty(SG B2), boss Water, focus noir.
//            No same-squad ally ⇒ N5 gate inert; two SG allies ⇒ N3 scoping observable.
//   COMP B = rouge(SR B1) / blanc(AR B2) / noir(SG B3) / guilty(SG B2), boss Water, focus noir.
//            blanc present ⇒ N5 gate fires. noir is slot 2 in BOTH comps.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const NOIR = 2; // noir's slot in both comps
const COMP_A = ['liter', 'crown', 'noir', 'guilty'];
const COMP_B = ['rouge', 'blanc', 'noir', 'guilty'];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Water',
    focusSlug: 'noir',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches -------------------------------------------------------
/** N1 encoding reference: S1 casterAtkPct → atkPct (% of each ally's OWN ATK, not noir's flat). */
const noirAtkPct = withPatchedOverride('noir', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('noir S1 casterAtkPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** N2 trigger reference: S2 fullBurstEnter → burstCast (the prior-10 model). */
const noirBurstCastTrig = withPatchedOverride('noir', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    if (b.trigger.kind === 'fullBurstEnter') {
      b.trigger.kind = 'burstCast';
      n++;
    }
  }
  if (n < 2) {
    throw new Error('noir S2 fullBurstEnter blocks missing — fixture is stale');
  }
});
/** N2 target reference: S2 maxAmmoFlat block all allies → self only. */
const noirSelfAmmo = withPatchedOverride('noir', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'maxAmmoFlat')
  );
  if (!b) {
    throw new Error('noir S2 maxAmmoFlat block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** N2b reference: strip the S2 instantReload effect (leaves the maxAmmoFlat block intact). */
const noirNoInstantReload = withPatchedOverride('noir', (ov) => {
  const before = ov.skill2
    .flatMap((b: any) => b.effects)
    .filter((e: any) => e.kind === 'instantReload').length;
  for (const b of ov.skill2) {
    b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
  }
  ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
  if (before < 1) {
    throw new Error('noir S2 instantReload effect missing — fixture is stale');
  }
});
/** N3 scoping reference: burst SG block (hitRatePct 13.93) alliesOfWeapon SG → all allies. */
const noirAlliesAll = withPatchedOverride('noir', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'hitRatePct' && e.value === 13.93)
  );
  if (!b) {
    throw new Error(
      'noir burst hitRatePct 13.93 block missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies' };
});
/** N5 gate reference: remove the teamHas gate from the 11.61 block (makes it always-active). */
const noirNoGate = withPatchedOverride('noir', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'hitRatePct' && e.value === 11.61)
  );
  if (!b) {
    throw new Error(
      'noir burst hitRatePct 11.61 block missing — fixture is stale'
    );
  }
  if (!b.teamHas) {
    throw new Error('noir burst 11.61 teamHas gate missing — fixture is stale');
  }
  delete b.teamHas;
});
/** N6 reference: strip every burst partsDamagePct effect (both the SG and the gated block). */
const noirNoParts = withPatchedOverride('noir', (ov) => {
  const before = ov.burst
    .flatMap((b: any) => b.effects)
    .filter((e: any) => e.stat === 'partsDamagePct').length;
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'partsDamagePct');
  }
  ov.burst = ov.burst.filter((b: any) => b.effects.length > 0);
  if (before < 2) {
    throw new Error(
      'noir burst partsDamagePct blocks missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(COMP_A);
const atkPct = run(COMP_A, { noir: noirAtkPct });
const burstCastTrig = run(COMP_A, { noir: noirBurstCastTrig });
const selfAmmo = run(COMP_A, { noir: noirSelfAmmo });
const noInstantReload = run(COMP_A, { noir: noirNoInstantReload });
const alliesAll = run(COMP_A, { noir: noirAlliesAll });
const noGate = run(COMP_A, { noir: noirNoGate });
const noParts = run(COMP_A, { noir: noirNoParts });
const compB = run(COMP_B);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const noirCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'noir'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
const reloadFrames = (evs: SimEvent[]) =>
  evs
    .filter((e): e is Reload => e.kind === 'reload')
    .map((r) => `${r.slug}@${r.frame}`)
    .sort();
/** noir-cast buffApply by exact key (key carries the raw kit magnitude; value is the resolved stat). */
const noirBuff = (evs: SimEvent[], key: string) =>
  buffs(evs).filter((b) => b.casterIdx === NOIR && b.key === key);
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetSlug));

const S1_KEY = `${NOIR}:skill1:casterAtkPct:14.08`;
const AMMO_KEY = `${NOIR}:skill2:maxAmmoFlat:5`;
const HR_SG_KEY = `${NOIR}:burst:hitRatePct:13.93`;
const HR_GATE_KEY = `${NOIR}:burst:hitRatePct:11.61`;

describe('noir — kit spec', () => {
  describe("N1 — S1 ATK ▲14.08% of NOIR's ATK to all allies, constantly (casterAtkPct)", () => {
    const applied = noirBuff(base.events, S1_KEY);
    const expectedFlat = 0.1408 * unitOf(base.res, 'noir').staticAtk;

    it("is a FLAT add of noir's ATK (value ≈ 0.1408×staticAtk, >> a percentage)", () => {
      expect(
        applied.length,
        'no S1 casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'casterAtkPct',
      ]);
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct must record a flat ATK grant, not the raw 14.08'
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
    });

    it('reaches all four allies with the SAME flat value (caster-flat signature), no expiry', () => {
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`
      ).toBe(4);
      expect(
        [...new Set(applied.map((b) => b.value))].length,
        'value must be identical for every ally'
      ).toBe(1);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('ENCODING: shipped logs casterAtkPct; the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      expect(noirBuff(base.events, S1_KEY).length).toBeGreaterThan(0);
      // The counterfactual moved the line off casterAtkPct entirely.
      expect(
        buffs(atkPct.events).filter(
          (b) =>
            b.casterIdx === NOIR &&
            b.key.startsWith(`${NOIR}:skill1:casterAtkPct`)
        ).length
      ).toBe(0);
      expect(
        buffs(atkPct.events).filter(
          (b) =>
            b.casterIdx === NOIR &&
            b.stat === 'atkPct' &&
            b.key.startsWith(`${NOIR}:skill1:`)
        ).length
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING + LIVE: casterAtkPct vs atkPct change ally damage differently', () => {
      // noir's ATK differs from her allies', so a flat caster add ≠ a per-target %; if S1 were inert
      // (or the two encodings equivalent) the totals would be byte-identical.
      expect(base.totals).not.toEqual(atkPct.totals);
    });
  });

  describe('N2 — S2 Max Ammunition Capacity ▲5 rounds / 10s to all allies on Full Burst entry', () => {
    const applied = noirBuff(base.events, AMMO_KEY);
    const ammoFrames = [...new Set(applied.map((b) => b.frame))].sort(
      (a, b) => a - b
    );
    const fbFrames = fbStarts(base.events).map((f) => f.frame);
    const castFrames = noirCasts(base.events).map((c) => c.frame);

    it('grants +5 max ammo to all four allies for 10 sec', () => {
      expect(
        applied.length,
        'no S2 maxAmmoFlat buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([5]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`
      ).toBe(4);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('trigger is fullBurstEnter: every grant lands on a Full-Burst-ENTRY frame, not the cast frame', () => {
      expect(ammoFrames.length).toBeGreaterThan(0);
      for (const f of ammoFrames) {
        expect(
          fbFrames,
          `maxAmmoFlat at frame ${f} is not an FB-entry frame`
        ).toContain(f);
      }
      expect(
        ammoFrames[0],
        'first grant must coincide with the first FB entry'
      ).toBe(fbFrames[0]);
      expect(
        ammoFrames[0],
        'first grant must NOT be the burstCast frame'
      ).not.toBe(castFrames[0]);
    });

    it('DISCRIMINATING (trigger): a burstCast trigger lands the grant on the cast frame, before FB opens', () => {
      const cf = noirBuff(burstCastTrig.events, AMMO_KEY);
      const cfFrames = [...new Set(cf.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      const cfCast = noirCasts(burstCastTrig.events).map((c) => c.frame);
      const cfFb = fbStarts(burstCastTrig.events).map((f) => f.frame);
      expect(
        cfFrames[0],
        'counterfactual grant must land on the cast frame'
      ).toBe(cfCast[0]);
      expect(
        cfFrames[0],
        'counterfactual grant must precede FB entry'
      ).not.toBe(cfFb[0]);
    });

    it('DISCRIMINATING (target): "all allies" reaches 4; a self-only model reaches only noir', () => {
      const cf = noirBuff(selfAmmo.events, AMMO_KEY);
      expect([...holders(cf)]).toEqual(['noir']);
    });
  });

  describe('N2b — S2 Reload 39.88% magazine(s) to all allies on Full Burst entry (instantReload)', () => {
    it('encodes instantReload fraction 0.3988 on the fullBurstEnter S2 block, targeting all allies', () => {
      const ov: any = withPatchedOverride('noir', () => {});
      const blk = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'instantReload')
      );
      expect(blk, 'no S2 instantReload block').toBeTruthy();
      expect(blk.trigger.kind).toBe('fullBurstEnter');
      expect(blk.target.kind).toBe('allies');
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction
      ).toBe(0.3988);
    });

    it("is live: stripping it perturbs the team's realized reload cadence (not byte-identical)", () => {
      // The 39.88% top-up at FB entry delays the allies' next magazine reload; the engine snaps ammo
      // silently (no reload event for the refill itself), so the observable is the shifted cadence.
      expect(reloadFrames(base.events)).not.toEqual(
        reloadFrames(noInstantReload.events)
      );
    });
  });

  describe('N3 — burst: Hit Rate ▲13.93% / Parts ▲23.23% for 10s to allies WITH A SHOTGUN only', () => {
    const applied = noirBuff(base.events, HR_SG_KEY);

    it('reaches ONLY the shotgun allies (noir+guilty), never the SMG/MG allies', () => {
      expect(
        applied.length,
        'no burst hitRatePct 13.93 buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([13.93]);
      expect([...holders(applied)].sort()).toEqual(['guilty', 'noir']);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: an "all allies" model would also buff the non-SG allies (liter+crown)', () => {
      const cf = noirBuff(alliesAll.events, HR_SG_KEY);
      expect(
        holders(cf).size,
        'all-allies counterfactual must reach all 4'
      ).toBe(4);
      expect([...holders(cf)].sort()).toEqual([
        'crown',
        'guilty',
        'liter',
        'noir',
      ]);
    });
  });

  describe('N4 — burst nuke: 351.64% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'noir' && d.srcSlot === 'burst'
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(noirCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([351.64]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
  });

  describe('N5 — burst: same-squad-gated Hit Rate ▲11.61% / Parts ▲19.36% for 30s to all allies', () => {
    it('is INERT without a same-squad ally (comp A: no blanc/rouge) — no 11.61 buff at all', () => {
      expect(noirBuff(base.events, HR_GATE_KEY).length).toBe(0);
    });

    it('DISCRIMINATING (gate is real): removing teamHas makes it fire in comp A', () => {
      const cf = noirBuff(noGate.events, HR_GATE_KEY);
      expect(
        cf.length,
        'ungated counterfactual must apply the 11.61 buff'
      ).toBeGreaterThan(0);
      expect([...new Set(cf.map((b) => b.value))]).toEqual([11.61]);
      expect(holders(cf).size).toBe(4);
    });

    it('FIRES with blanc present (comp B): 11.61% to all four allies for 30 sec', () => {
      const applied = noirBuff(compB.events, HR_GATE_KEY);
      expect(
        applied.length,
        'no gated 11.61 buff with blanc present'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([11.61]);
      expect(holders(applied).size, 'gated block must reach all 4 allies').toBe(
        4
      );
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
      }
    });
  });

  describe('N6 — burst partsDamagePct is exactly inert vs the partless scope-lock boss', () => {
    it("removing every partsDamagePct line changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });
  });
});
