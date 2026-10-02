// PER-UNIT KIT SPEC — `drake-great-villain` (Drake: Great Villain, Defender/SG/Wind, Burst III,
// cd 40s, ammo 9, 10 pellets). VARIANT of base `drake` (Drake (Treasure) — SG/Attacker/Fire),
// an entirely different unit. Kit-autonomy gauntlet 2026-09-03. Tier 2 (fullBurstEnter swap on
// ANY team Full Burst; FB-end forced ammo dump; stacking caster-Max-HP grant feeding her own
// Max-HP→ATK conversion).
//
// One assertion group per KIT LINE (D1..D6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS.
//
// Kit (blablalink prose, data/characters.json → characters['drake-great-villain'].skills, L10):
//   S1 ■ when entering Full Burst → self: weapon swap "Super Duper Overdrive" — charge time fixed
//        1.5 sec, 243.75% of final ATK, 15 pellets, full-charge damage 300%, 6 rounds          [D1]
//      ■ when Super Duper Overdrive ends → self: removes 100% of ammo                          [D2]
//   S2 ■ when Full Burst ends → all allies: Max HP ▲ 10.5% of the skill user's max HP
//        (without restoring HP) continuously, stacks up to 4                                  [D3]
//      ■ battle start → self: Fashionably Late: ATK ▲ 6.23% of own final max HP continuously  [D4]
//   BU ■ self: Attack Damage ▲ 27.5% for 25 sec                                               [D5]
//      ■ all enemies: 1350% of final ATK as Burst Skill damage                                 [D6]
//
// Every line is modeled; the override's `unmodeled` is empty on all three slots.
//
// Why each assertion discriminates:
//   D1   the swap fires on EVERY Full Burst entry, including the rotations helm completes (the
//        control comp seats two B3s, so FB count > her cast count) — a burstCast reading only
//        swaps on her own rotations. Inside a window her shots are CHARGED, spaced by the 90f fixed
//        charge, exactly 6 per window (the magazine), at 243.75% × the same pellet-landing fraction
//        her base shotgun takes (weapon:'SG' routes the swap through the SG landing model), with
//        the ×3.0 full-charge multiplier and the +50% FB major (they land inside FB). Engine
//        gotcha pinned: a clamp-only encoding (no chargeTimeSec) never charges at all.
//   D2   at every Full-Burst-end frame she starts a FRESH base-weapon reload: her first post-FB
//        shot waits a full reload gap and a magazine reload lands in between. "No dump" resumes
//        firing within a shotgun cadence of FB end; a dump WITHOUT the weapon-change reset finds
//        her already mid-way through the swap gun's own reload and completes far too early.
//   D3   Max HP stacks land at every FB END (not entry), on all four allies, at 10.5% of her
//        static Max HP, capped at 4 (11 FB ends in the fixture), permanent. LOAD-BEARING through
//        her own conversion only (e3 rule): her out-of-FB shots' ATK basis rises by exactly
//        6.23% × 4 × 10.5% × maxHp after four stacks, while the allies' totals are byte-identical
//        with and without the grant (inert by mechanism: liveMaxHp reads only own-kit Max HP —
//        the fixture seats crown and helm, neither of which carries a Max-HP→ATK conversion).
//   D4   applies once at t=0, self, permanent; its FLAT contribution at t=0 is 6.23% × maxHp
//        (vs the no-line counterfactual); it re-reads LIVE Max HP so the D3 stacks feed it — the
//        apply-time-snapshot counterfactual (atkOfCasterMaxHpPct) matches at t=0 and diverges
//        after the stacks; a plain atkPct 6.23 is a different stat and total.
//   D5   self-only, once per HER cast, 25s; an all-allies reading lands on four targets and lifts
//        helm; a 10s reading carries a shorter expiry.
//   D6   kit magnitude, burst bucket, once per cast, crit-eligible, unflavored, NO +50% major (the
//        cast lands 22f before FB opens); a fullBurstEnter-keyed nuke would take the major.
//
// Fixture: controlComp — liter (B1) / crown (B2) / drake-great-villain (B3, focus) / `helm` (SR/Water, B3,
// alternating burst partner), boss Fire (neutral for Wind). Solo-B3 mirror: the same without helm
// (every Full Burst is hers). Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'drake-great-villain';
const DGV = 2;
const BASE_MULT = 201.5; // datamined full-shot normalAttackMultiplier (10 pellets)
const SWAP_MULT = 243.75; // kit "Damage" line (15-pellet full shot)
const SWAP_CHARGE_FRAMES = 90; // "Charge Time: Fixed at 1.5 sec"
const SWAP_AMMO = 6;

type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}, helm = true) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, helm),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  const u = unitOf(res, SLUG);
  return {
    events,
    totals: totals(res),
    staticAtk: u.staticAtk,
    maxHp: u.maxHp,
  };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const uniq = <T>(xs: T[]) => [...new Set(xs)].sort();
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const normals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.srcSlot === 'normal');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ownBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === DGV && b.stat === stat);
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const reloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === SLUG);
const fbWindows = (evs: SimEvent[]) =>
  evs
    .filter((e): e is FbStart => e.kind === 'fullBurstStart')
    .map((f) => ({ start: f.frame, end: f.endFrame }));
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const inWindow = <T extends { frame: number }>(
  xs: T[],
  w: { start: number; end: number }
) => xs.filter((x) => x.frame >= w.start && x.frame < w.end);
/** Windows in which at least one of her shots was CHARGED (= the swap was live). */
const swapWindows = (r: Run) =>
  fbWindows(r.events).filter((w) =>
    inWindow(shots(r.events), w).some((s) => s.charged)
  );
const firstShotAfter = (r: Run, frame: number) =>
  shots(r.events).find((s) => s.frame > frame);
/** Her out-of-FB normal shots keyed by frame (cadence is identical across the D3/D4 runs). */
const normalsByFrame = (r: Run) =>
  new Map(
    normals(r.events)
      .filter((d) => !d.inFullBurst)
      .map((d) => [d.frame, d])
  );

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const swapBlock = (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (!b) {
    throw new Error(`${SLUG} swap block missing — fixture is stale`);
  }
  return b;
};
const swapEffect = (ov: any) =>
  swapBlock(ov).effects.find((e: any) => e.kind === 'weaponSwap');
const dumpBlock = (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'consumeAmmo')
  );
  if (!b) {
    throw new Error(`${SLUG} ammo-dump block missing — fixture is stale`);
  }
  return b;
};
const stackBlock = (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
  if (!b) {
    throw new Error(`${SLUG} Max HP stack block missing — fixture is stale`);
  }
  return b;
};
const flBlock = (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkOfMaxHpPct')
  );
  if (!b) {
    throw new Error(
      `${SLUG} Fashionably Late block missing — fixture is stale`
    );
  }
  return b;
};
const adBlock = (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error(
      `${SLUG} burst Attack Damage block missing — fixture is stale`
    );
  }
  return b;
};
const nukeBlock = (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error(`${SLUG} burst nuke block missing — fixture is stale`);
  }
  return b;
};

/** D1: swap keyed to her OWN cast instead of any Full Burst entry. */
const swapAsBurstCast = patch((ov) => {
  swapBlock(ov).trigger = { kind: 'burstCast' };
});
/** D1: "Charge Time: Fixed at 1.5 sec" encoded as the clamp ALONE (engine gotcha: never charges). */
const swapClampOnly = patch((ov) => {
  delete swapEffect(ov).chargeTimeSec;
});
/** D1: the 300% full-charge multiplier dropped. */
const swapNoChargeMult = patch((ov) => {
  delete swapEffect(ov).chargeMultPct;
});
/** D1: the swap not declared a shotgun (no pellet-landing routing). */
const swapNotSg = patch((ov) => {
  delete swapEffect(ov).weapon;
  delete swapEffect(ov).pelletCount;
});
/** D2: the ammo dump dropped. */
const noDump = patch((ov) => {
  dumpBlock(ov);
  ov.skill1 = ov.skill1.filter(
    (x: any) => !x.effects.some((e: any) => e.kind === 'consumeAmmo')
  );
});
/** D2: the dump WITHOUT the weapon-change refill/reset in front of it. */
const dumpNoReset = patch((ov) => {
  dumpBlock(ov).effects = dumpBlock(ov).effects.filter(
    (e: any) => e.kind !== 'instantReload'
  );
});
/** D3: stacks keyed to Full Burst ENTRY. */
const stacksAsFbEnter = patch((ov) => {
  stackBlock(ov).trigger = { kind: 'fullBurstEnter' };
});
/** D3: "continuously" read as a 10s buff. */
const stacksTimed = patch((ov) => {
  stackBlock(ov).effects[0].durationSec = 10;
});
/** D3: "Stacks up to 4 times" dropped — the buff merely refreshes on each re-application. */
const stacksNoStacking = patch((ov) => {
  delete stackBlock(ov).effects[0].maxStacks;
});
/** D3: "all allies" collapsed to self. */
const stacksSelfOnly = patch((ov) => {
  stackBlock(ov).target = { kind: 'self' };
});
/** D3: the stack line dropped. */
const noStacks = patch((ov) => {
  stackBlock(ov);
  ov.skill2 = ov.skill2.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
});
/** D4: Fashionably Late dropped. */
const noFl = patch((ov) => {
  flBlock(ov);
  ov.skill2 = ov.skill2.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'atkOfMaxHpPct')
  );
});
/** D4: the conversion snapshotted at apply time (does not track her later stacks). */
const flSnapshot = patch((ov) => {
  flBlock(ov).effects[0].stat = 'atkOfCasterMaxHpPct';
});
/** D4: "% of final max HP" misread as a plain ATK %. */
const flAsAtkPct = patch((ov) => {
  flBlock(ov).effects[0].stat = 'atkPct';
});
/** D5: the self Attack Damage read as a team buff. */
const adAllies = patch((ov) => {
  adBlock(ov).target = { kind: 'allies' };
});
/** D5/D6: the self Attack Damage line dropped (the nuke must lose its same-cast +27.5%). */
const noAd = patch((ov) => {
  adBlock(ov);
  ov.burst = ov.burst.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
});
/** D5: 25 sec read as the usual 10s window. */
const adShort = patch((ov) => {
  adBlock(ov).effects[0].durationSec = 10;
});
/** D6: the nuke keyed to Full Burst entry (would take the +50% major). */
const nukeAsFbEnter = patch((ov) => {
  nukeBlock(ov).trigger = { kind: 'fullBurstEnter' };
});

/** D1: a support patched to grant the whole team Charge Speed ▲ 100% (liter is the carrier here). */
const chargeSpeedTeam = withPatchedOverride('liter', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'allies' },
    effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 100 }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const ctrl = run();
const solo = run({}, false);
const ctrlSwapBurstCast = run({ [SLUG]: swapAsBurstCast });
const ctrlSwapClampOnly = run({ [SLUG]: swapClampOnly });
const ctrlSwapNoMult = run({ [SLUG]: swapNoChargeMult });
const ctrlSwapNotSg = run({ [SLUG]: swapNotSg });
const ctrlNoDump = run({ [SLUG]: noDump });
const ctrlDumpNoReset = run({ [SLUG]: dumpNoReset });
const ctrlStacksFbEnter = run({ [SLUG]: stacksAsFbEnter });
const ctrlStacksTimed = run({ [SLUG]: stacksTimed });
const ctrlStacksNoStacking = run({ [SLUG]: stacksNoStacking });
const ctrlStacksSelfOnly = run({ [SLUG]: stacksSelfOnly });
const ctrlNoStacks = run({ [SLUG]: noStacks });
const ctrlNoFl = run({ [SLUG]: noFl });
const ctrlFlSnapshot = run({ [SLUG]: flSnapshot });
const ctrlFlAsAtkPct = run({ [SLUG]: flAsAtkPct });
const ctrlAdAllies = run({ [SLUG]: adAllies });
const ctrlAdShort = run({ [SLUG]: adShort });
const ctrlNoAd = run({ [SLUG]: noAd });
const ctrlNukeFbEnter = run({ [SLUG]: nukeAsFbEnter });
const ctrlChargeSpeed = run({ liter: chargeSpeedTeam });

const ownCasts = casts(ctrl.events);
const windows = fbWindows(ctrl.events);
const ends = fbEnds(ctrl.events);
const STACK_VALUE = (10.5 / 100) * ctrl.maxHp;

describe('drake-great-villain — kit spec', () => {
  it('fixture sanity: two B3s alternate, so Full Bursts outnumber her own casts; solo-B3 they coincide', () => {
    expect(ownCasts.length).toBeGreaterThanOrEqual(5);
    expect(ownCasts.every((c) => c.stage === 3)).toBe(true);
    expect(windows.length).toBeGreaterThan(ownCasts.length);
    expect(ends.length).toBe(windows.length);
    expect(ends.length).toBeGreaterThanOrEqual(5);
    expect(fbWindows(solo.events).length).toBe(casts(solo.events).length);
  });

  describe('D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry', () => {
    it('is live in every Full Burst window, including the ones helm completes', () => {
      expect(swapWindows(ctrl).length).toBe(windows.length);
    });

    it('fires exactly 6 CHARGED shots per window on the 90f fixed charge, emptying the 6-round magazine', () => {
      let promptWindows = 0;
      for (const w of windows) {
        const ws = inWindow(shots(ctrl.events), w);
        expect(ws.length).toBe(SWAP_AMMO);
        expect(ws.every((s) => s.charged)).toBe(true);
        expect(ws.map((s) => s.ammoAfter)).toEqual([5, 4, 3, 2, 1, 0]);
        // never before one full charge has elapsed from the swap frame…
        expect(ws[0].frame - w.start).toBeGreaterThanOrEqual(
          SWAP_CHARGE_FRAMES - 1
        );
        if (ws[0].frame - w.start === SWAP_CHARGE_FRAMES - 1) {
          promptWindows++;
        }
        for (let i = 1; i < ws.length; i++) {
          expect(ws[i].frame - ws[i - 1].frame).toBe(SWAP_CHARGE_FRAMES);
        }
      }
      // …and exactly one charge after it in every window except where a scripted boss range
      // transition idles the team across the swap frame (at most one such window in this fight).
      expect(promptWindows).toBeGreaterThanOrEqual(windows.length - 1);
    });

    it('swap shots deal 243.75% × the SAME pellet-landing fraction her base shotgun takes, ×3.0 charge, +50% FB', () => {
      const shotByFrame = new Map(shots(ctrl.events).map((s) => [s.frame, s]));
      for (const w of windows) {
        const ds = inWindow(normals(ctrl.events), w);
        expect(ds.length).toBe(SWAP_AMMO);
        for (const d of ds) {
          const landed = shotByFrame.get(d.frame)!.hitFraction;
          expect(landed).toBeLessThan(1);
          expect(d.atkPct).toBeCloseTo(SWAP_MULT * landed, 6);
          expect(d.mult.charge).toBeCloseTo(3, 6);
          expect(d.fbMajorApplied).toBe(true);
        }
      }
      // ...and her base shots outside the window carry the base multiplier on the same routing.
      const outside = normals(ctrl.events).filter((d) => !d.inFullBurst);
      expect(outside.length).toBeGreaterThan(50);
      for (const d of outside) {
        expect(d.atkPct).toBeCloseTo(
          BASE_MULT * shotByFrame.get(d.frame)!.hitFraction,
          6
        );
        expect(d.mult.charge).toBe(1);
      }
    });

    it('"Charge Time: Fixed at 1.5 sec" — an ally Charge Speed ▲ 100% does NOT shorten the swap charge', () => {
      // The kit's 'Fixed at' is the clamp wording (chargeTimeClamp 1.5). In this engine a swap that
      // declares its own charge frames is ALREADY immune to chargeSpeedPct (sim.ts: `cs = swap
      // .chargeFrames != null ? 0 : …`), so the clamp cannot be falsified against a plain chargeTimeSec
      // here — this pins the immunity the kit line states, which both encodings deliver.
      // (the charge-speed team reaches Full Burst faster, so its last window can straddle the 180s
      // mark — only windows that end inside the fight can hold all 6 shots)
      const whole = fbWindows(ctrlChargeSpeed.events).filter(
        (w) => w.end <= 180 * 60
      );
      expect(whole.length).toBeGreaterThanOrEqual(8);
      for (const w of whole) {
        const frames = inWindow(shots(ctrlChargeSpeed.events), w).map(
          (s) => s.frame
        );
        expect(frames.length).toBe(SWAP_AMMO);
        const gaps = frames.slice(1).map((f, k) => f - frames[k]);
        // never FASTER than the fixed charge (a boss transition can only stretch a gap)
        expect(Math.min(...gaps)).toBe(SWAP_CHARGE_FRAMES);
        expect(
          [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
        ).toBe(SWAP_CHARGE_FRAMES);
      }
      // the buff really is live on her (non-vacuity)
      expect(
        buffs(ctrlChargeSpeed.events).some(
          (b) =>
            b.stat === 'chargeSpeedPct' &&
            b.value === 100 &&
            b.targetIdx === DGV
        )
      ).toBe(true);
    });

    it('IS LOAD-BEARING: the swap window is where most of her damage lands', () => {
      const inFb = normals(ctrl.events).filter((d) => d.inFullBurst);
      const sumIn = inFb.reduce((s, d) => s + d.amount, 0);
      const sumOut = normals(ctrl.events)
        .filter((d) => !d.inFullBurst)
        .reduce((s, d) => s + d.amount, 0);
      expect(sumIn).toBeGreaterThan(sumOut);
    });

    it('DISCRIMINATING: a burstCast reading swaps only on her own rotations', () => {
      const cf = swapWindows(ctrlSwapBurstCast);
      expect(cf.length).toBe(casts(ctrlSwapBurstCast.events).length);
      expect(cf.length).toBeLessThan(windows.length);
    });

    it('DISCRIMINATING (engine gotcha): a clamp-only swap never charges — no charged shot at all', () => {
      expect(shots(ctrlSwapClampOnly.events).some((s) => s.charged)).toBe(
        false
      );
      expect(ctrlSwapClampOnly.totals[SLUG]).not.toBe(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: without the 300% full-charge line the swap shots lose the ×3', () => {
      const ds = windows.flatMap((w) =>
        inWindow(normals(ctrlSwapNoMult.events), w)
      );
      expect(ds.length).toBe(SWAP_AMMO * windows.length);
      expect(uniq(ds.map((d) => d.mult.charge))).toEqual([1]);
    });

    it('DISCRIMINATING: a non-shotgun swap skips the pellet-landing fraction (full 243.75% every shot)', () => {
      const ds = windows.flatMap((w) =>
        inWindow(normals(ctrlSwapNotSg.events), w)
      );
      expect(ds.length).toBeGreaterThan(0);
      expect(uniq(ds.map((d) => d.atkPct))).toEqual([SWAP_MULT]);
    });
  });

  describe('D2 — S1 when Super Duper Overdrive ends: removes 100% of ammo (forced base reload)', () => {
    /** Frame gap from each Full Burst end to the first reload that completes after it. */
    const reloadGapsAfterEnds = (r: Run) =>
      fbEnds(r.events)
        .map((e) => reloads(r.events).find((x) => x.frame > e))
        .filter((x): x is Reload => x !== undefined)
        .map((x, i) => x.frame - fbEnds(r.events)[i]);

    // In this comp her 9-round base magazine runs dry just as the next Full Burst opens (the swap
    // entry cancels that reload), so the fight holds no clean natural base reload to read a gap off.
    // The forced reload is therefore pinned on its own terms: it starts ON the Full-Burst-end frame
    // and takes one full effective reload (base 111f, shortened by crown's reload-speed buff) —
    // the same constant after every window, with no shot inside it.
    it('starts a FRESH base-weapon reload at every Full Burst end: one full effective reload, no shot inside it', () => {
      const gaps = reloadGapsAfterEnds(ctrl);
      expect(gaps.length).toBeGreaterThanOrEqual(ends.length - 1);
      expect(uniq(gaps).length).toBe(1);
      const gap = gaps[0];
      expect(gap).toBeGreaterThanOrEqual(60);
      for (const e of ends) {
        const first = firstShotAfter(ctrl, e);
        if (!first) {
          continue; // the fight ended inside the reload
        }
        expect(first.frame - e).toBeGreaterThan(gap);
        expect(first.ammoAfter).toBe(8); // a fresh 9-round base magazine
      }
    });

    it('DISCRIMINATING: without the dump, the swap gun’s half-done reload just completes — she is firing again within a shotgun cadence', () => {
      // Judged on the TYPICAL window (median): where a boss transition delays the swap's first shot,
      // the 6th round leaves the swap gun only frames before FB end and its leftover reload is
      // nearly a full one — a rotation accident, not the dump.
      const median = (xs: number[]) =>
        [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
      const gaps = reloadGapsAfterEnds(ctrlNoDump);
      expect(gaps.length).toBeGreaterThanOrEqual(5);
      expect(median(gaps)).toBeLessThan(30);
      const resumed = fbEnds(ctrlNoDump.events)
        .map((e) => firstShotAfter(ctrlNoDump, e))
        .filter((s): s is Shot => s !== undefined)
        .map((s, i) => s.frame - fbEnds(ctrlNoDump.events)[i]);
      expect(median(resumed)).toBeLessThan(60);
      // …whereas the shipped model NEVER lets her resume that fast.
      expect(Math.min(...reloadGapsAfterEnds(ctrl))).toBeGreaterThanOrEqual(60);
      expect(ctrlNoDump.totals[SLUG]).toBeGreaterThan(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: a dump WITHOUT the weapon-change reset finds her already reloading and changes nothing', () => {
      expect(reloadGapsAfterEnds(ctrlDumpNoReset)).toEqual(
        reloadGapsAfterEnds(ctrlNoDump)
      );
      expect(ctrlDumpNoReset.totals[SLUG]).toBe(ctrlNoDump.totals[SLUG]);
    });
  });

  describe('D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent', () => {
    const applied = ownBuff(ctrl.events, 'maxHpFlat');

    it('lands on every Full-Burst-END frame, on all four allies, at 10.5% of her static Max HP, no expiry', () => {
      expect(uniq(applied.map((b) => b.frame))).toEqual(uniq(ends));
      for (const e of ends) {
        expect(
          uniq(applied.filter((b) => b.frame === e).map((b) => b.targetIdx))
        ).toEqual([0, 1, 2, 3]);
      }
      for (const b of applied) {
        expect(b.value).toBeCloseTo(STACK_VALUE, 1);
        expect(b.expiresFrame).toBeNull();
        expect(b.maxStacks).toBe(4);
      }
    });

    it('stacks 1,2,3,4 on the first four ends and holds at 4 thereafter', () => {
      const own = applied.filter((b) => b.targetIdx === DGV);
      expect(own.map((b) => b.stacks)).toEqual(
        ends.map((_, i) => Math.min(i + 1, 4))
      );
    });

    it('IS LOAD-BEARING through her OWN conversion: after four stacks her ATK basis is +6.23% × 4 × 10.5% × maxHp', () => {
      const a = normalsByFrame(ctrl);
      const b = normalsByFrame(ctrlNoStacks);
      const before = [...a.keys()].filter((f) => f < ends[0]);
      const after = [...a.keys()].filter((f) => f > ends[3]);
      expect(before.length).toBeGreaterThan(0);
      expect(after.length).toBeGreaterThan(0);
      for (const f of before) {
        expect(b.get(f)?.baseAtk).toBe(a.get(f)!.baseAtk);
      }
      const expectedLift = (6.23 / 100) * 4 * STACK_VALUE;
      for (const f of after) {
        expect(a.get(f)!.baseAtk - b.get(f)!.baseAtk).toBeCloseTo(
          expectedLift,
          0
        );
      }
    });

    it('is inert on the allies (e3 rule): liter/crown/helm totals byte-identical with and without the grant', () => {
      for (const s of ['liter', 'crown', 'helm']) {
        expect(ctrlNoStacks.totals[s]).toBe(ctrl.totals[s]);
      }
      expect(ctrlNoStacks.totals[SLUG]).toBeLessThan(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: an FB-ENTRY reading lands on the start frames, not the end frames', () => {
      const cf = ownBuff(ctrlStacksFbEnter.events, 'maxHpFlat');
      expect(uniq(cf.map((b) => b.frame))).toEqual(
        uniq(fbWindows(ctrlStacksFbEnter.events).map((w) => w.start))
      );
    });

    it('DISCRIMINATING: a timed reading expires; a non-stacking reading only refreshes; self-only skips the allies', () => {
      expect(
        uniq(
          ownBuff(ctrlStacksTimed.events, 'maxHpFlat').map(
            (b) => b.expiresFrame !== null
          )
        )
      ).toEqual([true]);
      // "Stacks up to 4 times" dropped → every re-application refreshes the single instance
      expect(
        Math.max(
          ...ownBuff(ctrlStacksNoStacking.events, 'maxHpFlat').map(
            (b) => b.stacks
          )
        )
      ).toBe(1);
      expect(ctrlStacksNoStacking.totals[SLUG]).toBeLessThan(ctrl.totals[SLUG]);
      expect(
        uniq(
          ownBuff(ctrlStacksSelfOnly.events, 'maxHpFlat').map(
            (b) => b.targetIdx
          )
        )
      ).toEqual([DGV]);
    });
  });

  describe('D4 — S2 Fashionably Late: ATK ▲ 6.23% of her final max HP continuously, from battle start', () => {
    const applied = ownBuff(ctrl.events, 'atkOfMaxHpPct');

    it('applies once at t=0, self, no expiry', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].value).toBe(6.23);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(DGV);
      expect(applied[0].expiresFrame).toBeNull();
    });

    it('IS LOAD-BEARING: at t=0 it is worth exactly 6.23% of her Max HP in flat ATK', () => {
      const a = normalsByFrame(ctrl);
      const b = normalsByFrame(ctrlNoFl);
      const first = Math.min(...a.keys());
      expect(a.get(first)!.baseAtk - b.get(first)!.baseAtk).toBeCloseTo(
        (6.23 / 100) * ctrl.maxHp,
        0
      );
      expect(ctrlNoFl.totals[SLUG]).toBeLessThan(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: an apply-time snapshot matches at t=0 but misses the later stacks', () => {
      const a = normalsByFrame(ctrl);
      const b = normalsByFrame(ctrlFlSnapshot);
      const first = Math.min(...a.keys());
      expect(b.get(first)!.baseAtk).toBeCloseTo(a.get(first)!.baseAtk, 0);
      const expectedLift = (6.23 / 100) * 4 * STACK_VALUE;
      for (const f of [...a.keys()].filter((x) => x > ends[3])) {
        expect(a.get(f)!.baseAtk - b.get(f)!.baseAtk).toBeCloseTo(
          expectedLift,
          0
        );
      }
    });

    it('DISCRIMINATING: a plain ATK % is a different stat and total', () => {
      expect(ownBuff(ctrlFlAsAtkPct.events, 'atkOfMaxHpPct')).toEqual([]);
      expect(ctrlFlAsAtkPct.totals[SLUG]).not.toBe(ctrl.totals[SLUG]);
    });
  });

  describe('D5 — burst: self Attack Damage ▲ 27.5% for 25 sec', () => {
    const applied = ownBuff(ctrl.events, 'attackDamagePct').filter(
      (b) => b.value === 27.5
    );

    it('grants once per HER cast, self only, 25 sec', () => {
      expect(applied.length).toBe(ownCasts.length);
      expect(uniq(applied.map((b) => b.frame))).toEqual(
        uniq(ownCasts.map((c) => c.frame))
      );
      for (const b of applied) {
        expect(b.targetIdx).toBe(DGV);
        expect(b.expiresFrame! - b.frame).toBe(25 * 60);
      }
    });

    it('DISCRIMINATING: an all-allies reading lands on four targets and lifts helm; a 10s reading expires early', () => {
      const cf = ownBuff(ctrlAdAllies.events, 'attackDamagePct').filter(
        (b) => b.value === 27.5
      );
      expect(cf.length).toBe(4 * casts(ctrlAdAllies.events).length);
      expect(ctrlAdAllies.totals.helm).toBeGreaterThan(ctrl.totals.helm);
      const short = ownBuff(ctrlAdShort.events, 'attackDamagePct').filter(
        (b) => b.value === 27.5
      );
      expect(uniq(short.map((b) => b.expiresFrame! - b.frame))).toEqual([600]);
    });
  });

  describe('D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies', () => {
    const nukes = dmg(ctrl.events).filter((d) => d.srcSlot === 'burst');

    it('fires once per cast at the kit magnitude, in the burst bucket, crit-eligible, unflavored', () => {
      expect(nukes.length).toBe(ownCasts.length);
      expect(uniq(nukes.map((d) => d.frame))).toEqual(
        uniq(ownCasts.map((c) => c.frame))
      );
      expect(uniq(nukes.map((d) => d.atkPct))).toEqual([1350]);
      expect(uniq(nukes.map((d) => d.bucket))).toEqual(['burst']);
      expect(uniq(nukes.map((d) => d.critEligible))).toEqual([true]);
      expect(uniq(nukes.map((d) => d.mult.distributed))).toEqual([1]);
    });

    it('casts BEFORE the Full Burst window opens: no +50% major, FB not yet live, no range bonus', () => {
      expect(uniq(nukes.map((d) => d.fbMajorApplied))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.inFullBurst))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.rangeApplied))).toEqual([false]);
    });

    it('carries her OWN same-cast Attack Damage ▲ 27.5% (the buff line precedes the damage line)', () => {
      const cf = dmg(ctrlNoAd.events).filter((d) => d.srcSlot === 'burst');
      expect(cf.length).toBe(nukes.length);
      for (let i = 0; i < nukes.length; i++) {
        expect(nukes[i].mult.dmgUp - cf[i].mult.dmgUp).toBeCloseTo(0.275, 6);
      }
    });

    it("is TAGGED 'allEnemies' (trina's literal amp string) and carries no flavor", () => {
      const ov = loadOverride(SLUG) as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.burstDesc).toBe('allEnemies');
      expect(nuke.flavor).toBeUndefined();
    });

    it('DISCRIMINATING: a Full-Burst-entry-keyed nuke would take the +50% major inside FB', () => {
      const cf = dmg(ctrlNukeFbEnter.events).filter(
        (d) => d.srcSlot === 'burst'
      );
      expect(cf.length).toBeGreaterThan(0);
      expect(uniq(cf.map((d) => d.fbMajorApplied))).toEqual([true]);
    });
  });
});
