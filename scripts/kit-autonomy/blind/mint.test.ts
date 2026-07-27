// PER-UNIT KIT SPEC — `mint` (Mint, Supporter / RL / Iron, Burst II, cd 20s, ammo 6,
// reloadFrames 141, chargeFrames 60, hitsPerShot 1). BLIND spec: written from the kit prose
// ALONE, without sight of the shipped override, the driver's tests, or any truth file.
//
// One assertion group per KIT LINE (M1..M10), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build counterfactuals (the nearest-wrong model each
// assertion must discriminate against) and to ISOLATE the heal channel — never to supply the
// encoding under test.
//
// Kit (blablalink prose):
//   S1 ■ full-charge attack WHILE IN Assigned Part: Singing → all allies:
//        ATK ▲45.02% OF THE SKILL USER'S ATK for 3 sec                                    [M1]
//      ■ full-charge attack WHILE IN Assigned Part: Dancing → all allies:
//        recovers 1.8% of the skill user's final Max HP every 1 sec for 3 sec             [M2]
//   S2 ■ entering Burst Stage 3 while NOT in Sing Along → self: cancels both Assigned Parts [M3]
//      ■ entering Burst Stage 3 WHILE IN Singing → all allies:
//        Critical Rate ▲19.94% for 10 sec                                                 [M4]
//        Projectile Explosion Damage ▲50% for 10 sec                                      [M5]
//        Pierce Damage ▲32.72% for 10 sec                                                 [M6]
//   BU ■ self: Assigned Part TOGGLE — in Dancing → gain Singing; else → gain Dancing.
//        Continuous, cannot be removed.                                                   [M7]
//      ■ all allies ("Sing Along"): Attack Damage ▲30.02% for 10 sec                      [M8]
//                                    Max Ammunition Capacity ▲40% for 10 sec              [M9]
//                                    Critical Damage ▲45.05% for 10 sec                   [M10]
//
// THE CENTRAL READING (drives most of the discriminations below). The burst toggle starts from
// "no Assigned Part", so it is a deterministic alternation:
//     burst 1 → not Dancing → DANCING;  burst 2 → in Dancing → SINGING;  burst 3 → DANCING; …
// i.e. ODD casts leave her Dancing, EVEN casts leave her Singing. Therefore:
//   * S1's two branches are MUTUALLY EXCLUSIVE and alternate in ~20s windows (M1/M2/M7);
//   * S2's Singing-gated trio fires on roughly EVERY OTHER Burst-Stage-3 entry, not all of them
//     (M4/M5/M6) — a model that drops the status gate over-credits the whole team's crit rate,
//     projectile-explosion and pierce buckets by ~2x exposure.
// This alternation IS expressible with shipped primitives (a `resource` pool driven by two
// burstCast blocks with everyN:2 / everyNOffset 0|1, read back by `resourceGate` on the S1 and S2
// blocks), so a static/always-on encoding of either branch is a real divergence, not a GAP.
//
// WHY NOT `controlComp` — mint is BURST II and so is controlComp's `crown`. Two stage-2 casters
// contend for one slot per rotation, and if the rotation picks crown, mint never bursts, she never
// gains an Assigned Part, and EVERY assertion in this file passes vacuously. Fixture A therefore
// keeps liter (B1) / ada (B3) / helm (B3) and makes mint the SOLE Burst II. Guard assertions below
// fail loudly if a fixture ever goes vacuous anyway.
//
// Deterministic (no seed). Four full 180s sims.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../../tests/lib/harness.js';

const FPS = 60;

/**
 * FIXTURE A — liter (B1) / mint (B2) / ada (B3) / helm (B3), boss Fire, focus mint.
 * mint is the only stage-2 caster, so her burst — and therefore every Assigned Part in her kit —
 * is guaranteed to be exercised. Focus is mint because she is a charge weapon (RL, chargeFrames
 * 60), which maximises rotations and so the number of alternation windows the file can measure.
 */
const MAIN: CompOptions = {
  slugs: ['liter', 'mint', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'mint',
};

/**
 * FIXTURE B — ada swapped for crown. The `heal` effect models NO HP amount and emits no event of
 * its own; its ONLY observable is a recovery CONSUMER, and crown's "when recovery takes effect"
 * team buff is that consumer. crown is also Burst II, so this fixture reintroduces stage-2
 * contention on purpose (mint sits in the earlier slot); the guard test asserts mint still casts.
 * Every OTHER heal in the comp is patched out so that each recovery firing is attributable to
 * mint's Dancing heal alone — helm alone heals on every charged pull and would otherwise saturate
 * the consumer completely.
 */
const HEAL: CompOptions = {
  slugs: ['liter', 'mint', 'crown', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'mint',
};

/** Slot indices — mint is index 1 in BOTH fixtures. */
const MINT = 1;
const CROWN = 2;

/** crown's recovery-triggered team buff (the exemplar helm.test.ts pins the same magnitude). */
const CROWN_RECOVERY_VALUE = 20.99;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function run(comp: CompOptions, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/**
 * Remove every effect carrying `stat`, across all three slots. Encoding-agnostic on purpose: a
 * blind test must not assume WHICH slot array the driver put a line in. Reports how many effects
 * it removed so a MISSING line fails as its own assertion instead of silently no-op'ing the
 * counterfactual into a false pass.
 */
function stripStat(slug: string, stat: string): { ov: any; removed: number } {
  let removed = 0;
  const ov = withPatchedOverride(slug, (o: any) => {
    for (const s of SLOTS) {
      const blocks: any[] = o[s] ?? [];
      for (const b of blocks) {
        const before = b.effects.length;
        b.effects = b.effects.filter((e: any) => e.stat !== stat);
        removed += before - b.effects.length;
      }
      o[s] = blocks.filter((b: any) => b.effects.length > 0);
    }
  });
  return { ov, removed };
}

/** Strip every `heal` effect from a unit (isolation for M2 — see FIXTURE B). */
function stripHeals(slug: string): any {
  return withPatchedOverride(slug, (o: any) => {
    for (const s of SLOTS) {
      const blocks: any[] = o[s] ?? [];
      for (const b of blocks)
        {b.effects = b.effects.filter((e: any) => e.kind !== 'heal');}
      o[s] = blocks.filter((b: any) => b.effects.length > 0);
    }
  });
}

const noAmmo = stripStat('mint', 'maxAmmoPct');
const noCrit = stripStat('mint', 'critRatePct');

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(MAIN);
const baseNoAmmo = run(MAIN, { mint: noAmmo.ov });
const baseNoCrit = run(MAIN, { mint: noCrit.ov });
const healRun = run(HEAL, {
  liter: stripHeals('liter'),
  crown: stripHeals('crown'),
  helm: stripHeals('helm'),
});

// ---- readers ----------------------------------------------------------------------------------
/** Every event kind carries a frame; typed loosely so the file compiles against any variant. */
const frameOf = (e: SimEvent): number => (e as any).frame as number;

const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** buffApply events CAST BY mint carrying `stat`. Boss debuffs (casterIdx null) drop out here. */
const mintBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MINT && b.stat === stat);

const castsBy = (evs: SimEvent[], slug: string) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && (e as any).slug === slug
  );

const shotFramesOf = (evs: SimEvent[], slug: string) =>
  evs.filter((e) => e.kind === 'shot' && (e as any).slug === slug).map(frameOf);

const framesOf = (bs: BuffApply[]) =>
  [...new Set(bs.map(frameOf))].sort((a, b) => a - b);

/** Frame equality with a small tolerance — a trigger may dispatch a frame off the cast frame. */
const near = (f: number, set: number[], tol = 2) =>
  set.some((g) => Math.abs(f - g) <= tol);
const farFrom = (f: number, set: number[], tol: number) =>
  set.every((g) => Math.abs(f - g) > tol);

const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

const mintCastFrames = castsBy(base.events, 'mint').map(frameOf);
/** "Entering Burst Stage 3" = a stage-3 burst cast by ANYONE — here ada and helm. */
const stage3Frames = [
  ...new Set(
    [...castsBy(base.events, 'ada'), ...castsBy(base.events, 'helm')].map(
      frameOf
    )
  ),
].sort((a, b) => a - b);

/** Distinct frames at which crown's recovery consumer fired in the isolated heal run. */
const recoveryFrames = [
  ...new Set(
    buffs(healRun.events)
      .filter(
        (b) =>
          b.casterIdx === CROWN &&
          b.stat === 'attackDamagePct' &&
          b.value === CROWN_RECOVERY_VALUE
      )
      .map(frameOf)
  ),
].sort((a, b) => a - b);

describe('mint — kit spec (blind)', () => {
  describe('F — fixture guards (a vacuous fixture must fail loudly, not pass silently)', () => {
    it('A: mint casts her Burst II several times, so her Assigned Parts are exercised', () => {
      expect(
        mintCastFrames.length,
        'mint never bursts in fixture A — she gains no Assigned Part and every gated ' +
          'assertion in this file would be vacuous'
      ).toBeGreaterThanOrEqual(3);
    });

    it("A: Burst Stage 3 is entered several times, on frames distinct from mint's own cast", () => {
      expect(stage3Frames.length).toBeGreaterThanOrEqual(3);
      for (const f of stage3Frames) {
        expect(
          near(f, mintCastFrames),
          `stage-3 entry at frame ${f} coincides with mint's own stage-2 cast — the ` +
            'burstCast-vs-stageEnter discrimination in M4/M5/M6 would be void'
        ).toBe(false);
      }
    });

    it('B: mint still wins the stage-2 slot with crown in the comp', () => {
      expect(
        castsBy(healRun.events, 'mint').length,
        'crown took every stage-2 cast in fixture B, so mint never gained Dancing — ' +
          'M2/M7 are measuring nothing'
      ).toBeGreaterThanOrEqual(3);
    });

    it("B: crown's recovery consumer is still identifiable at the pinned magnitude", () => {
      const anyCrownAtk = buffs(healRun.events).filter(
        (b) => b.casterIdx === CROWN && b.stat === 'attackDamagePct'
      );
      expect(
        anyCrownAtk.length,
        'crown emits no attackDamagePct at all — fixture is stale'
      ).toBeGreaterThan(0);
      expect(
        anyCrownAtk.some((b) => b.value === CROWN_RECOVERY_VALUE),
        `crown's recovery buff is no longer ${CROWN_RECOVERY_VALUE}% — re-pin the reader`
      ).toBe(true);
    });
  });

  describe('M1 — S1 Singing: ATK ▲45.02% OF THE SKILL USER, all allies, 3 sec, per full charge', () => {
    const applied = mintBuffs(base.events, 'casterAtkPct');

    it('is caster-scaled (flat ATK add), NOT a raw 45.02% self-scaling atkPct', () => {
      // Nearest wrong: `atkPct` 45.02, which scales each HOLDER's own ATK — it would hand the
      // 4-unit team four different, mostly larger, ATK adds off a supporter's buff. A caster-
      // scaled grant resolves to ONE flat number (mint's staticAtk x 0.4502) shared by everyone.
      expect(
        applied.length,
        'mint emits no casterAtkPct — the Singing branch is missing'
      ).toBeGreaterThan(0);
      expect(
        mintBuffs(base.events, 'atkPct').length,
        '"ATK ▲x% of the skill user\'s ATK" must never be encoded as atkPct'
      ).toBe(0);
      const values = [...new Set(applied.map((b) => b.value))];
      expect(
        values,
        'a caster-scaled grant resolves to a single flat ATK figure'
      ).toHaveLength(1);
      expect(values[0]).not.toBe(45.02);
      expect(
        values[0],
        'a flat ATK add is tens of thousands, not a percentage'
      ).toBeGreaterThan(1000);
    });

    it('reaches all 4 allies (including mint) for exactly 3 sec', () => {
      for (const f of framesOf(applied)) {
        const holders = new Set(
          applied.filter((b) => frameOf(b) === f).map((b) => b.targetIdx)
        );
        expect(
          holders.size,
          `frame ${f} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
      for (const b of applied)
        {expect(b.expiresFrame! - frameOf(b)).toBe(3 * FPS);}
    });

    it('fires at her FULL-CHARGE cadence, not once per burst', () => {
      // Nearest wrong: re-keying "when attacking with Full Charge" to burstCast. mint's burst
      // cooldown is 20s, so a burst-keyed trigger can NEVER put two firings inside 3 seconds.
      const frames = framesOf(applied);
      const dense = frames.some(
        (f, i) => i > 0 && f - frames[i - 1] <= 3 * FPS
      );
      expect(
        dense,
        'no two Singing applications within 3s — this is a burst-cadence trigger, not a ' +
          'per-full-charge one'
      ).toBe(true);
    });

    it('is GATED on Assigned Part: Singing — it does NOT fire on every shot of the fight', () => {
      // DIVERGENCE PROBE. The burst toggle leaves her Singing only after EVEN casts, so roughly
      // half her charged shots are Singing shots. An ungated (always-on) encoding fires on all of
      // them and roughly doubles the team ATK uptime this line is worth.
      const shots = shotFramesOf(base.events, 'mint').length;
      expect(shots, 'mint fired no shots — fixture is broken').toBeGreaterThan(
        0
      );
      expect(
        framesOf(applied).length,
        "the Singing ATK buff fired on every one of mint's charged shots — the Assigned " +
          'Part gate is missing (the burst toggles Singing on only every OTHER cast)'
      ).toBeLessThan(shots);
    });
  });

  describe('M2 — S1 Dancing: 1.8% of caster Max HP every 1 sec FOR 3 SEC, all allies', () => {
    // No HP pool is modeled, so a heal's only observable is a recovery CONSUMER. Fixture B strips
    // every other heal in the comp, making mint's Dancing heal the sole driver of crown's
    // "when recovery takes effect" buff.
    it('reaches a recovery consumer at all (the Dancing branch is live, not dropped)', () => {
      expect(
        recoveryFrames.length,
        "no recovery reached crown — mint's Dancing heal is missing, or the whole Dancing " +
          'branch never activates'
      ).toBeGreaterThan(0);
    });

    it('is a 3-TICK heal-over-time, not a single instant heal', () => {
      // Nearest wrong: `heal` with the default ticks:1, which emits exactly one recovery per
      // trigger and therefore lands ONLY on mint's shot frames. A ticks:3 / intervalSec:1 HoT
      // keeps firing +1s and +2s later — visibly so across her 141-frame (2.35s) reload, when she
      // fires no shots at all.
      const shots = shotFramesOf(healRun.events, 'mint');
      expect(shots.length).toBeGreaterThan(0);
      let maxLag = 0;
      for (const f of recoveryFrames) {
        const prev = shots.filter((s) => s <= f).pop();
        if (prev === undefined) {continue;}
        maxLag = Math.max(maxLag, f - prev);
      }
      expect(
        maxLag,
        `every recovery landed within ${maxLag} frames of a mint shot — a one-shot heal ` +
          '(ticks:1), not "every 1 sec for 3 sec"'
      ).toBeGreaterThanOrEqual(90);
    });
  });

  describe('M3 — S2 Assigned-Part cancellation on Burst Stage 3 entry without Sing Along', () => {
    it.skip('cancels both Assigned Parts when Sing Along is not active', () => {
      // GAP — two reasons, both structural:
      //  (a) no primitive: nothing in the effect schema REMOVES a self status/resource conditional
      //      on another of the unit's own buffs being absent. `removeOnReload` is reload-keyed;
      //      buffRemove is emitted only for that path, never on natural lapse.
      //  (b) unobservable in ANY fixture where the line would matter: Sing Along lasts 10 sec and
      //      mint's burst cooldown is 20 sec, so on a comp where she bursts every rotation the
      //      stage-3 entry follows her own cast by ~1s and Sing Along is ALWAYS up — this block is
      //      inert by construction. It only bites on a rotation mint sits out, which fixture A
      //      (sole Burst II) deliberately never produces.
      // Recipe to enact: add a second stage-2 caster and assert the Assigned Part resets after a
      // rotation mint skipped.
    });
  });

  describe('M4/M5/M6 — S2 Singing trio on BURST STAGE 3 ENTRY, all allies, 10 sec', () => {
    const TRIO = [
      ['critRatePct', 19.94],
      ['projectileExplosionPct', 50],
      ['pierceDamagePct', 32.72],
    ] as const;

    for (const [stat, value] of TRIO) {
      it(`${stat} = ${value} to all 4 allies for 10 sec`, () => {
        const applied = mintBuffs(base.events, stat);
        expect(applied.length, `mint emits no ${stat}`).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        for (const f of framesOf(applied)) {
          const holders = new Set(
            applied.filter((b) => frameOf(b) === f).map((b) => b.targetIdx)
          );
          expect(
            holders.size,
            `frame ${f} reached ${holders.size} allies, expected 4`
          ).toBe(4);
        }
        for (const b of applied)
          {expect(b.expiresFrame! - frameOf(b)).toBe(10 * FPS);}
      });
    }

    it("is keyed to STAGE-3 ENTRY, never to mint's own (stage-2) burst cast", () => {
      // mint is Burst II: "entering Burst Stage 3" is somebody ELSE's cast. Keying this to her own
      // burstCast (the reflex reading for a self-flavored kit) would fire it a beat early, at her
      // cast frame, and — in a comp where a different unit completes the chain — on rotations where
      // stage 3 is never reached at all.
      const frames = framesOf(mintBuffs(base.events, 'critRatePct'));
      expect(frames.length).toBeGreaterThan(0);
      for (const f of frames) {
        expect(
          near(f, mintCastFrames),
          `Singing trio applied at frame ${f}, which is mint's OWN burst cast — the trigger is ` +
            'burstCast, not stage-3 entry'
        ).toBe(false);
        expect(
          near(f, stage3Frames),
          `Singing trio applied at frame ${f}, which is no Burst Stage 3 entry`
        ).toBe(true);
      }
    });

    it('is GATED on Assigned Part: Singing — it does NOT fire on every stage-3 entry', () => {
      // DIVERGENCE PROBE, and the most expensive line in the kit to get wrong: this trio is a
      // whole-team crit-rate + damage-bucket grant. The burst toggle only leaves her Singing after
      // EVEN casts, so ~half of stage-3 entries qualify. An ungated encoding roughly doubles the
      // uptime of 19.94% team crit rate.
      const frames = framesOf(mintBuffs(base.events, 'critRatePct'));
      expect(frames.length, 'the Singing branch never fired').toBeGreaterThan(
        0
      );
      expect(
        frames.length,
        'the Singing trio fired on EVERY Burst Stage 3 entry — the Assigned Part gate is ' +
          'missing (the burst toggles Singing on only every OTHER cast)'
      ).toBeLessThan(stage3Frames.length);
    });

    it('M4 — the 19.94% Critical Rate is a live damage lever, not an inert stat', () => {
      expect(
        noCrit.removed,
        'mint carries no critRatePct effect at all'
      ).toBeGreaterThan(0);
      expect(sum(base.totals)).toBeGreaterThan(sum(baseNoCrit.totals));
    });
  });

  describe('M7 — burst Assigned Part TOGGLE: Singing and Dancing alternate and never coexist', () => {
    it('produces isolated windows of each branch, not both at once', () => {
      // "Only one Assigned Part is applied according to Mint's current status." Measured in the
      // isolated heal run, where the Singing branch (casterAtkPct) and the Dancing branch
      // (recoveries reaching crown) are BOTH separately observable.
      // Nearest wrong: both S1 branches ungated, so every charged shot fires the ATK buff AND the
      // heal — no firing of either would ever be isolated from the other.
      const singFrames = framesOf(mintBuffs(healRun.events, 'casterAtkPct'));
      expect(
        singFrames.length,
        'the Singing branch never fired in fixture B'
      ).toBeGreaterThan(0);
      expect(
        recoveryFrames.length,
        'the Dancing branch never fired in fixture B'
      ).toBeGreaterThan(0);
      expect(
        singFrames.some((f) => farFrom(f, recoveryFrames, 5 * FPS)),
        'no Singing application is isolated from the Dancing heal — both Assigned Parts are ' +
          'active simultaneously'
      ).toBe(true);
      expect(
        recoveryFrames.some((f) => farFrom(f, singFrames, 5 * FPS)),
        'no Dancing heal is isolated from the Singing buff — both Assigned Parts are active ' +
          'simultaneously'
      ).toBe(true);
    });
  });

  describe('M8/M9/M10 — burst "Sing Along": three 10-sec team buffs on her OWN cast', () => {
    const SING_ALONG = [
      ['attackDamagePct', 30.02],
      ['maxAmmoPct', 40],
      ['critDamagePct', 45.05],
    ] as const;

    for (const [stat, value] of SING_ALONG) {
      it(`${stat} = ${value} to all 4 allies for 10 sec, once per mint burst`, () => {
        const applied = mintBuffs(base.events, stat);
        expect(applied.length, `mint emits no ${stat}`).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        const frames = framesOf(applied);
        expect(
          frames.length,
          `${frames.length} applications vs ${mintCastFrames.length} mint burst casts`
        ).toBe(mintCastFrames.length);
        for (const f of frames) {
          const holders = new Set(
            applied.filter((b) => frameOf(b) === f).map((b) => b.targetIdx)
          );
          expect(
            holders.size,
            `frame ${f} reached ${holders.size} allies, expected 4`
          ).toBe(4);
        }
        for (const b of applied)
          {expect(b.expiresFrame! - frameOf(b)).toBe(10 * FPS);}
      });
    }

    it("fires on mint's burst CAST, not on Full Burst entry", () => {
      // This is her own burst block with no activation clause, so it lands at the cast — a beat
      // BEFORE the Full Burst window opens. Re-keying it to fullBurstEnter would also fire it on
      // rotations mint sat out.
      for (const stat of ['attackDamagePct', 'maxAmmoPct', 'critDamagePct']) {
        for (const f of framesOf(mintBuffs(base.events, stat))) {
          expect(
            near(f, mintCastFrames),
            `${stat} applied at frame ${f}, no mint cast there`
          ).toBe(true);
        }
      }
    });

    it('M9 — Max Ammunition ▲40% is a REAL damage lever (ammo gates shots fired)', () => {
      // Taxonomy #6: a weapon-state modifier is damage. A bigger magazine means fewer reloads
      // inside the window, so removing the line must LOWER team damage — not leave it byte-equal,
      // which is what an "ammo is defensive/cosmetic" reading would predict.
      expect(
        noAmmo.removed,
        'mint carries no maxAmmoPct effect at all'
      ).toBeGreaterThan(0);
      expect(sum(base.totals)).toBeGreaterThan(sum(baseNoAmmo.totals));
    });

    it('M9 — it is a PERCENTAGE capacity buff, not a flat round count', () => {
      expect(
        mintBuffs(base.events, 'maxAmmoFlat').length,
        '"Capacity ▲40%" is maxAmmoPct'
      ).toBe(0);
    });
  });

  describe('INERTNESS — mint invents no damage and no unlisted stat', () => {
    it('deals no skill or burst damage of her own (a pure supporter kit)', () => {
      // Her kit text carries no "% of final ATK" line anywhere. Every point she deals must come
      // from her own weapon.
      const mintDmg = base.events.filter(
        (e): e is Damage => e.kind === 'damage' && (e as any).slug === 'mint'
      );
      const skillSourced = mintDmg.filter((d) =>
        ['skill1', 'skill2', 'burst'].includes((d as any).srcSlot)
      );
      expect(
        skillSourced.length,
        'mint dealt skill/burst-sourced damage — her kit has no damage line'
      ).toBe(0);
    });

    it('grants no core / element / sustained / true-damage stat she never mentions', () => {
      for (const stat of [
        'coreDamagePct',
        'elementDamagePct',
        'sustainedDamagePct',
        'trueDamagePct',
        'damageTakenPct',
        'critRateNormalPct',
      ]) {
        expect(
          mintBuffs(base.events, stat).length,
          `mint emits ${stat}, which is not in her kit`
        ).toBe(0);
      }
    });

    it('grants Critical Rate UNSCOPED, as the kit writes it', () => {
      // The inverse trap of helm's S1: mint's line is a bare "Critical Rate ▲19.94%", with no
      // "of normal attacks" qualifier, so scoping it to normals would UNDER-credit the team's
      // skill and burst crit. Asserted alongside the previous group so the pair pins both
      // directions of the scope error.
      expect(mintBuffs(base.events, 'critRatePct').length).toBeGreaterThan(0);
    });
  });
});
