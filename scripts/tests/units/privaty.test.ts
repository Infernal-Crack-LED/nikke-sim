// PER-UNIT KIT SPEC — `privaty` (Privaty, Attacker/AR/Water, Burst III, cd 40s, ammo 60, hitsPerShot 1,
// treasure). kit-autonomy gauntlet S2a (driver); see docs/kit-autonomy-decisions.md §6 + §14.6.
//
// privaty's shipped override is FAITHFUL (MEASURED + tuned; every line FAITHFUL in §6a — the HOT residual is
// calibration/fit, NOT encoding). So per §14.3 each load-bearing line is a GREEN-vs-shipped PIN; where a
// nearest-wrong counterfactual is constructible (`withPatchedOverride`) the pin must also beat it.
//
// Kit (blablalink prose, data/characters.json → characters.privaty.skills):
//   S1 ■ entering Full Burst → all allies: ATK ▲23.61% / Reload Speed ▲51.16% / Max Ammo ▼50.66% /
//                                            Attack Damage ▲20.16%, all 10 sec.                 [P5]
//   S2 ■ last bullet hits → the target: Damage Taken ▲10.01% 10s [P7] + 256.17% additional (noRange) [P1,P3,P4]
//      ■ last bullet hits a target in Designated Target status → the target: 1687% additional (noRange)  [P2,P3]
//   BU ■ self: Superior Elemental Code Attack Damage ▲130% 10s                                  [P6]
//      ■ all enemies: 1407.64% of final ATK as Burst Skill damage                               [P6]
//      ■ all enemies: Designated Target (status, 10s) — gates the S2 1687 rider                 [P2 indirect]
//      ■ Stuns 3s / Designated Target ATK ▼5.02% → UNMODELED (boss never acts; status content inert)
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates nothing):
//   P1  lastBullet cadence: the 256.17 rider fires ~once per MAGAZINE (≈ reloads), far below the ~hundreds
//       of shots. Counterfactual shotFired (fires every pull) → count explodes to ≈ shots. ("fires per hit"
//       is DEGENERATE for privaty — hitsPerShot 1 ⇒ shot==hit — not a distinct nearest-wrong; §14.6.)
//   P2  targetStatus gate: the 1687 rider fires ONLY on last bullets inside the 10s Designated-Target window
//       after privaty's burst (window reconstructed from burstCast frames — there is no targetStatus event,
//       §5.4). Counterfactual: remove requiresTargetStatus → 1687 fires on EVERY last bullet (≈ the 256.17
//       count, many out-of-window). Non-vacuity: the fixture has last bullets both in- and out-of-window.
//   P3  SANITY CHECK (not a faithfulness discriminator, §14.6): the engine force-sets noRange on all riders,
//       so rangeApplied===false holds for ANY override — asserted for completeness, counts toward nothing.
//   P4  FB-major-by-landing for the 256.17 rider ONLY (§14.6): FB is a TIMING gate, so a 256.17 rider landing
//       IN Full Burst carries fbMajorApplied and one landing OUT does not — discriminating the timing-gated
//       model from "always"/"never" via the fixture's natural in-FB/out-of-FB riders. ENGINE FINDING surfaced
//       here: `noFb` in an override is INERT under the default FB-by-timing rule and REJECTED by
//       validate-overrides (sim.ts skillNoFb; only burst-cast is auto-exempt), so the "noFb" counterfactual
//       is NOT constructible — the faithful FB-by-timing model is forced; P4 PINS it.
//   P5  S1 team buffs reach all four allies for 10s on Full Burst entry (the Max Ammo ▼ is the tandem that
//       raises privaty's own last-bullet rate during FB — §6a S1c).
//   P6  burst: self elemAdvantageDamagePct 130 applied on cast; the 1407.64 nuke lands once per burstCast in
//       the burst bucket and NEVER takes the +50% FB major (a burst CAST lands before the FB window opens).
//   P7  S2a Damage Taken ▲10.01% is a BOSS DEBUFF applied by privaty on each last bullet — a real team-wide
//       contribution (the boss takes more damage from everyone). Hence removing S2 is NOT team-inert.
//
// Fixture: controlComp('privaty', true) = liter B1 / crown B2 / privaty B3 / helm B3, boss Fire, focus
// privaty (slot order liter 0 / crown 1 / privaty 2 / helm 3). The chain completes so privaty casts (a lone
// B3 makes ZERO Full Bursts). privaty (Water) is elementally advantaged vs the Fire boss. Deterministic.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / privaty 2 / helm 3. */
const PRIVATY = 2;
const N_ALLIES = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('privaty', true),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (the nearest-wrong model each pin must beat) ----------------------
const flatAtkPct = (b: any, pct: number) =>
  b.effects.find(
    (e: any) => e.kind === 'flatDamage' && Math.abs(e.atkPct - pct) < 0.01,
  );

/** P1 counterfactual: the ungated 256.17 rider fires on EVERY pull, not just the last bullet. */
const privatyShotFired = withPatchedOverride('privaty', (ov) => {
  const b = ov.skill2.find((x: any) => flatAtkPct(x, 256.17));
  if (!b) throw new Error('privaty S2 256.17 block missing — fixture is stale');
  b.trigger = { kind: 'shotFired' };
});
/** P2 counterfactual: the 1687 rider is UNGATED (fires on every last bullet, in- or out-of-window). */
const privatyUngated1687 = withPatchedOverride('privaty', (ov) => {
  const b = ov.skill2.find((x: any) => flatAtkPct(x, 1687));
  if (!b) throw new Error('privaty S2 1687 block missing — fixture is stale');
  if (!b.requiresTargetStatus)
    throw new Error('privaty 1687 block has no gate — fixture is stale');
  delete b.requiresTargetStatus;
});
/** P5b counterfactual: the Max Ammo ▼50.66% debuff removed — the "it's just a penalty" misread. */
const privatyNoMaxAmmo = withPatchedOverride('privaty', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'maxAmmoPct'),
  );
  if (!b)
    throw new Error('privaty S1 maxAmmoPct block missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'maxAmmoPct');
});
// NOTE (engine finding, surfaced by this test): `noFb` in an override is INERT under the default
// FB-by-'timing' rule and is REJECTED by validate-overrides.ts (sim.ts skillNoFb; only burst-cast damage is
// auto-FB-exempt). The P4 nearest-wrong "noFb" model is therefore NOT constructible at the override level —
// P4 discriminates FB-by-timing from "always"/"never" via the fixture's natural in-FB/out-of-FB riders.

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const shotFired = run({ privaty: privatyShotFired });
const ungated = run({ privaty: privatyUngated1687 });
const noMaxAmmo = run({ privaty: privatyNoMaxAmmo });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const privDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'privaty' && d.srcSlot === srcSlot);
const rider256 = (evs: SimEvent[]) =>
  privDmg(evs, 'skill2').filter((d) => Math.abs(d.atkPct - 256.17) < 0.01);
const rider1687 = (evs: SimEvent[]) =>
  privDmg(evs, 'skill2').filter((d) => Math.abs(d.atkPct - 1687) < 0.5);
const privShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'privaty');
const privReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'privaty');
const privBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'privaty',
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** Designated-Target windows reconstructed from privaty's burstCast frames + 10s (no targetStatus event). */
const dtWindows = (evs: SimEvent[]): Array<[number, number]> =>
  privBursts(evs).map((b) => [b.frame, b.frame + 10 * FPS]);
const inDtWindow = (evs: SimEvent[], frame: number) =>
  dtWindows(evs).some(([lo, hi]) => frame >= lo && frame <= hi);

describe('privaty — kit spec (faithful override; pins beat named counterfactuals)', () => {
  describe('P1 — S2 256.17% rider fires on the LAST BULLET (~once per magazine), not every pull', () => {
    it('fires ≈ the reload count and far below the shot count (lastBullet cadence + fire-rate check)', () => {
      const n = rider256(base.events).length;
      const reloads = privReloads(base.events).length;
      const shots = privShots(base.events).length;
      expect(
        n,
        '256.17 rider should fire ~once per magazine',
      ).toBeGreaterThanOrEqual(Math.floor(reloads * 0.7));
      expect(n, '256.17 rider must not fire per-shot').toBeLessThanOrEqual(
        reloads + 1,
      );
      expect(
        n,
        'lastBullet count must be far below the shot count',
      ).toBeLessThan(shots * 0.5);
      expect(reloads).toBeGreaterThan(0);
    });
    it('DISCRIMINATING: a shotFired trigger fires the rider on (almost) every pull', () => {
      expect(rider256(shotFired.events).length).toBeGreaterThan(
        privShots(shotFired.events).length * 0.8,
      );
      expect(rider256(shotFired.events).length).toBeGreaterThan(
        rider256(base.events).length * 2,
      );
    });
  });

  describe('P2 — S2 1687% rider is gated on the Designated Target status window', () => {
    it('every 1687 rider lands inside a privaty burst + 10s window, and the gate is non-vacuous', () => {
      const r = rider1687(base.events);
      expect(
        r.length,
        'the gated rider must fire at least once in-window',
      ).toBeGreaterThan(0);
      for (const d of r) {
        expect(
          inDtWindow(base.events, d.frame),
          `1687 rider at ${(d as any).sec.toFixed(2)}s is out-of-window`,
        ).toBe(true);
      }
      // Non-vacuity: there ARE last bullets out-of-window where 1687 correctly did NOT fire.
      const outOfWindowLastBullets = rider256(base.events).filter(
        (d) => !inDtWindow(base.events, d.frame),
      );
      expect(
        outOfWindowLastBullets.length,
        'fixture has no out-of-window last bullet — gate untested',
      ).toBeGreaterThan(0);
      // The gate makes 1687 strictly rarer than the ungated 256.17 last-bullet rider.
      expect(r.length).toBeLessThan(rider256(base.events).length);
    });
    it('DISCRIMINATING: removing the gate fires 1687 on every last bullet (incl. out-of-window)', () => {
      const r = rider1687(ungated.events);
      expect(r.length).toBeGreaterThan(rider1687(base.events).length);
      const outOfWindow = r.filter((d) => !inDtWindow(ungated.events, d.frame));
      expect(
        outOfWindow.length,
        'ungated 1687 must appear out-of-window',
      ).toBeGreaterThan(0);
    });
  });

  describe('P3 — S2 riders carry no +30% range major (ENGINE-INVARIANT SANITY CHECK, §14.6)', () => {
    it('rangeApplied is false on every S2 rider (holds for any override — discriminates nothing about privaty)', () => {
      const riders = privDmg(base.events, 'skill2');
      expect(riders.length).toBeGreaterThan(0);
      expect(riders.every((d) => d.rangeApplied === false)).toBe(true);
    });
  });

  describe('P4 — the 256.17% rider takes the +50% Full Burst major BY LANDING TIME (FB-by-timing)', () => {
    // FB-by-timing is the engine DEFAULT and `noFb` is inert/rejected (note above), so the faithful model is
    // forced; the discrimination is timing-gated vs "always"/"never", via the fixture's natural in-FB /
    // out-of-FB rider populations (no override-level counterfactual is constructible).
    it('a rider landing IN Full Burst carries fbMajorApplied; one landing OUT does not (timing-gated)', () => {
      const r = rider256(base.events);
      const inFb = r.filter((d) => d.inFullBurst);
      const outFb = r.filter((d) => !d.inFullBurst);
      expect(inFb.length, 'fixture has no in-FB 256.17 rider').toBeGreaterThan(
        0,
      );
      expect(
        outFb.length,
        'fixture has no out-of-FB 256.17 rider',
      ).toBeGreaterThan(0);
      expect(
        inFb.every((d) => d.fbMajorApplied === true),
        'in-FB rider must take the FB major',
      ).toBe(true);
      expect(
        outFb.every((d) => d.fbMajorApplied === false),
        'out-of-FB rider must NOT take the FB major',
      ).toBe(true);
    });
  });

  describe('P5 — S1 Full-Burst-entry team buffs reach all four allies for 10 sec', () => {
    const lines: Array<[string, number]> = [
      ['atkPct', 23.61],
      ['reloadSpeedPct', 51.16],
      ['maxAmmoPct', -50.66],
      ['attackDamagePct', 20.16],
    ];
    for (const [stat, value] of lines) {
      it(`${stat} ${value} is applied by privaty to all ${N_ALLIES} allies for 10s`, () => {
        const applied = buffs(base.events).filter(
          (b) =>
            b.casterIdx === PRIVATY &&
            b.stat === stat &&
            Math.abs(b.value - value) < 0.001,
        );
        expect(
          applied.length,
          `no ${stat} ${value} buff applied`,
        ).toBeGreaterThan(0);
        const perFrame = new Map<number, Set<number | null>>();
        for (const b of applied) {
          (
            perFrame.get(b.frame) ??
            perFrame.set(b.frame, new Set()).get(b.frame)!
          ).add(b.targetIdx);
        }
        for (const [frame, holders] of perFrame) {
          expect(
            holders.size,
            `frame ${frame} reached ${holders.size} allies, expected ${N_ALLIES}`,
          ).toBe(N_ALLIES);
        }
        for (const b of applied)
          expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      });
    }
  });

  describe('P5b — S1 Max Ammo ▼50.66% is damage-relevant (tandem; S2b adversarial top misread)', () => {
    // Independently flagged by the S2b reviewer as the highest-risk shared misread: dropping the Max Ammo ▼
    // as a non-damage "penalty". It halves the magazine during FB, which raises the last-bullet frequency and
    // thus every lastBullet-triggered skill2 proc. Removing it must REDUCE the last-bullet (256.17) count.
    it('removing the Max Ammo ▼ debuff REDUCES the last-bullet rider count (it gates shot count = damage)', () => {
      expect(rider256(noMaxAmmo.events).length).toBeLessThan(
        rider256(base.events).length,
      );
    });
  });

  describe('P5c — S1 fires on EVERY Full Burst entry (fullBurstEnter, not burstCast)', () => {
    // S2b trigger-identity catch: fullBurstEnter fires on any team FB; burstCast only on privaty's own casts.
    it('S1 atkPct 23.61 is applied once per Full Burst start frame', () => {
      const fbStarts = base.events.filter(
        (e) => e.kind === 'fullBurstStart',
      ).length;
      const applied = buffs(base.events).filter(
        (b) =>
          b.casterIdx === PRIVATY &&
          b.stat === 'atkPct' &&
          Math.abs(b.value - 23.61) < 0.001,
      );
      const frames = new Set(applied.map((b) => b.frame));
      expect(fbStarts).toBeGreaterThan(0);
      expect(
        frames.size,
        'S1 must fire once per FB entry (fullBurstEnter)',
      ).toBe(fbStarts);
    });
  });

  describe('P6 — burst: self elem-advantage buff + 1407.64% nuke (FB-exempt by cast timing)', () => {
    it('applies self elemAdvantageDamagePct 130 on each burstCast', () => {
      const applied = buffs(base.events).filter(
        (b) => b.casterIdx === PRIVATY && b.stat === 'elemAdvantageDamagePct',
      );
      expect(applied.length).toBe(privBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([130]);
    });
    it('nuke lands once per burstCast at 1407.64% in the burst bucket, never taking the +50% FB major', () => {
      const nukes = privDmg(base.events, 'burst').filter(
        (d) => Math.abs(d.atkPct - 1407.64) < 0.01,
      );
      expect(nukes.length).toBe(privBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage precedes the FB window',
      ).toEqual([]);
    });
  });

  describe('P7 — S2a Damage Taken ▲10.01% is a boss debuff applied on each last bullet', () => {
    // Boss-held debuffs emit buffApply with casterIdx===null (known event-payload gap, TDD plan §1d #3 —
    // the enemy applyBuff omits casterIdx), so this pins stat+value, not the caster. privaty is the only
    // damageTakenPct source in the fixture, so stat+value uniquely identifies her debuff.
    it('a damageTakenPct 10.01 debuff is applied, bounded by the last-bullet cadence', () => {
      const applied = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct' && Math.abs(b.value - 10.01) < 0.001,
      );
      expect(
        applied.length,
        'no damageTakenPct 10.01 debuff applied',
      ).toBeGreaterThan(0);
      expect(
        applied.length,
        'debuff must track last bullets, not fire per shot',
      ).toBeLessThanOrEqual(privReloads(base.events).length + 1);
    });
  });

  describe("inertness / attribution — the S2 riders are privaty's OWN damage instances", () => {
    it('every 256.17 / 1687 rider is attributed to privaty (srcSlot skill2), not credited to a teammate', () => {
      const riders = privDmg(base.events, 'skill2');
      expect(riders.length).toBeGreaterThan(0);
      expect(riders.every((d) => d.slug === 'privaty')).toBe(true);
    });
    it("removing the whole S2 slot lowers privaty's own damage (the riders are hers)", () => {
      const noS2 = withPatchedOverride('privaty', (ov) => {
        ov.skill2 = [];
      });
      const withoutS2 = run({ privaty: noS2 });
      expect(withoutS2.totals.privaty).toBeLessThan(base.totals.privaty);
      // NOTE: teammates are NOT byte-identical — removing S2 also removes the damageTakenPct boss debuff
      // (P7), which lowers team damage. That is faithful (the debuff is a real team contribution), so no
      // teammate-identity assertion is made here.
    });
  });
});
