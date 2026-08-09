// PER-UNIT KIT SPEC — `grave` (Grave, Supporter/AR/Fire, Burst II, cd 20s, ammo 60,
// Pilgrim OVERSPEC). kit-autonomy gauntlet S2a (driver tests), 2026-07-25.
//
// One assertion group per KIT LINE (G1..G7 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) — never to supply the encoding under
// test. grave is a MATURE, MEASURED override (solo anchor 1.005, reload measured from
// grave solo.MP4 n=19); every kit line is FAITHFUL or documented-UNMODELED, so every
// behavioural assertion here is a GREEN pin vs shipped + a RED discrimination vs the
// nearest-wrong counterfactual. There is no FIX/MISSING line.
//
// Kit (blablalink prose, data/characters.json → characters.grave.skills):
//   S1 (Heat Emission, her default non-Prediction state, held most of the fight)
//      ■ passive → all allies: Burst Gauge filling speed ▲38.96% continuously.            [G1]
//      ■ passive → all allies (excludeSelf): Pierce Damage ▲48.4% continuously.           [G2]
//      ■ Heat Emission: Reload Ratio ▼50%  →  charFixes.reloadFrames 193 (MEASURED).       [G3]
//      (Prediction-end 'Removes 100% of ammo', 'Removes Heat Emission under certain
//       conditions', and the 2% Max HP/1s self-heal → UNMODELED: missing engine primitive
//       / unspecified condition / genuinely inert self-heal — documented in override.)
//   S2 (Overheat)
//      ■ hitCount 15 → self: Overheat I ATK ▲15.48% (sustained approximation).            [G4]
//      (Overheat I 'Removed upon reloading to max ammunition' → UNMODELED, absorbed by the
//       sustained approximation.)
//      ■ burstCast → self (Prediction window): Overheat II ATK ▲20.66% (10s) +
//        Overheat III Attack Damage ▲30.8% (10s). 30/60-hit ramp approximated as full
//        window uptime (documented slight early-window overcount).                        [G5]
//   BU (Plot Spoiler → Prediction)
//      ■ burstCast → self: unlimited ammunition (10s) + Gain Pierce (10s) +
//        Pierce Damage ▲52.8% (10s) + Critical Rate ▲85.19% (10s).                        [G6]
//      ■ burstCast → all allies: Attack Damage ▲48.2% (10s) + Pierce Damage ▲39.98% (10s)
//        + Max Ammunition Capacity ▲3 round(s) (10s, kit-literal flat rounds).            [G7]
//      (Prediction 'Current HP ▼1%/1s for 10s' → UNMODELED, defensive self-cost.)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   G1  passive/permanent (applied at frame 0, no expiry, one application per ally) vs a
//       burst-triggered or timed buff. Reaches all four allies INCLUDING herself.
//   G2  the excludeSelf is the whole point: grave-self can never benefit from Pierce Damage
//       (she is pierce-tagged only in Prediction, when Heat Emission is OFF), so the shipped
//       48.4 must NOT land on her. Counterfactual drops excludeSelf → she receives 48.4 AND
//       her in-window Damage-Up rises (a burst-window double-count the shipped model avoids).
//   G3  the MEASURED slow reload (charFixes.reloadFrames 193 → effective 201f) gates shot
//       count gates damage. Counterfactual restores the datamined 81f → strictly MORE shots.
//   G4  hitCount-triggered: first fires at ~15 hits (frame >0, well before her first burst at
//       ~210f), self-scoped, sustained (no expiry) — neither a frame-0 passive nor a burstCast.
//   G5  burstCast-triggered: first fires exactly on her first burst frame, once per burst,
//       self-scoped, 10s — tied to the Prediction window, not to hit count or setup.
//   G6  four self buffs keyed to the burst. unlimitedAmmo keeps every in-window shot unlimited
//       (remove it → she burns the 60-round mag and reloads mid-window). gainPierce is what
//       makes her Pierce Damage ▲ Damage-Up LAND (remove it → in-window dmgUp collapses). The
//       85.19 crit caps her in-window crit rate at 1.0 (remove it → 0.15/0.30).
//   G7  three ally buffs, all four allies, 10s, once per burst. maxAmmoFlat 3 is the
//       kit-literal FLAT rounds (enacted 2026-07-20), not the old near-inert maxAmmoPct proxy.
//
// Fixture: liter (B1) / grave (B2) / ada (B3) / helm (B3), boss Fire, focus ada — grave needs
// a real B1→B2→B3 rotation to cast her burst at all (a lone B2 makes zero Full Bursts). She
// casts 12 bursts over the 180s fight. Deterministic (no seed). Slot order: liter 0 / grave 1
// / ada 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const FPS = 60;
const WINDOW_FRAMES = 10 * FPS; // every grave burst buff is "for 10 sec"
/** Fixture slot order: liter 0 / grave 1 / ada 2 / helm 3. */
const GRAVE = 1;
const ALL_ALLIES = [0, 1, 2, 3];

const graveComp = (): CompOptions => ({
  slugs: ['liter', 'grave', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
});

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...graveComp(),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, t: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const graveBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === GRAVE);
const graveShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.unitIdx === GRAVE);
const graveBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.unitIdx === GRAVE
  );
const graveDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.unitIdx === GRAVE);
const firstBurstFrame = (evs: SimEvent[]) => graveBursts(evs)[0]?.frame ?? NaN;

/** grave's normal-attack Damage-Up bucket values inside her first burst (Prediction) window. */
function windowDmgUp(evs: SimEvent[]): number[] {
  const bf = firstBurstFrame(evs);
  const win = graveDamage(evs).filter(
    (d) =>
      d.bucket === 'normal' && d.frame >= bf && d.frame <= bf + WINDOW_FRAMES
  );
  return [...new Set(win.map((d) => +d.mult.dmgUp.toFixed(4)))].sort(
    (a, b) => a - b
  );
}
/** grave's normal-attack resolved crit rate inside her first burst window. */
function windowCritRate(evs: SimEvent[]): number[] {
  const bf = firstBurstFrame(evs);
  const win = graveDamage(evs).filter(
    (d) =>
      d.bucket === 'normal' && d.frame >= bf && d.frame <= bf + WINDOW_FRAMES
  );
  return [...new Set(win.map((d) => +d.critRate.toFixed(4)))].sort(
    (a, b) => a - b
  );
}
/** grave's shots inside her first burst window. */
function windowShots(evs: SimEvent[]): Shot[] {
  const bf = firstBurstFrame(evs);
  return graveShots(evs).filter(
    (s) => s.frame >= bf && s.frame <= bf + WINDOW_FRAMES
  );
}

// ---- counterfactual patches (nearest-wrong model each group must discriminate against) --------
/** G2: drop excludeSelf so grave-self also receives Heat Emission's Pierce Damage 48.4. */
const graveNoExcludeSelf = withPatchedOverride('grave', (ov) => {
  let touched = false;
  for (const b of ov.skill1) {
    if (b.target?.excludeSelf) {
      delete b.target.excludeSelf;
      touched = true;
    }
  }
  if (!touched) {
    throw new Error('grave S1 excludeSelf block missing — fixture is stale');
  }
});
/** G3: restore the datamined 81f reload the MEASURED 193f replaced. */
const graveDataminedReload = withPatchedOverride('grave', (ov) => {
  if (ov.charFixes?.reloadFrames !== 193) {
    throw new Error('grave charFixes.reloadFrames!=193 — fixture is stale');
  }
  ov.charFixes.reloadFrames = 81;
});
/** G6: strip gainPierce from the burst — her Pierce Damage ▲ Damage-Up can no longer land. */
const graveNoGainPierce = withPatchedOverride('grave', (ov) => {
  let n = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
    n += before - b.effects.length;
  }
  if (!n) {
    throw new Error('grave burst gainPierce missing — fixture is stale');
  }
});
/** G6: strip unlimitedAmmo — she burns the 60-round mag and must reload mid-window. */
const graveNoUnlimitedAmmo = withPatchedOverride('grave', (ov) => {
  let n = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'unlimitedAmmo');
    n += before - b.effects.length;
  }
  if (!n) {
    throw new Error('grave burst unlimitedAmmo missing — fixture is stale');
  }
});
/** G6: strip the self Critical Rate ▲85.19 burst buff. */
const graveNoBurstCrit = withPatchedOverride('grave', (ov) => {
  let n = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter(
      (e: any) => !(e.kind === 'buff' && e.stat === 'critRatePct')
    );
    n += before - b.effects.length;
  }
  if (!n) {
    throw new Error('grave burst critRatePct missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noExcludeSelf = run({ grave: graveNoExcludeSelf });
const dataminedReload = run({ grave: graveDataminedReload });
const noGainPierce = run({ grave: graveNoGainPierce });
const noUnlimitedAmmo = run({ grave: graveNoUnlimitedAmmo });
const noBurstCrit = run({ grave: graveNoBurstCrit });

const N_BURSTS = graveBursts(base.events).length;

describe('grave — kit spec', () => {
  it('fixture sanity: grave casts a real rotation of bursts', () => {
    expect(
      N_BURSTS,
      'grave must burst repeatedly for the burst-gated lines to be observable'
    ).toBeGreaterThanOrEqual(8);
  });

  describe('G1 — S1 Heat Emission: team Burst Gauge filling speed ▲38.96% (passive, all allies)', () => {
    const applied = graveBuffs(base.events).filter(
      (b) => b.stat === 'burstGenPct'
    );

    it('is 38.96%, reaches all four allies including herself, applied at setup', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([38.96]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_ALLIES
      );
      for (const b of applied) {
        expect(b.frame, 'a passive applies at setup, not mid-fight').toBe(0);
      }
    });

    it('is permanent (no wall-clock expiry, no round budget) — a sustained state, not a timed buff', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });
  });

  describe('G2 — S1 Heat Emission: team Pierce Damage ▲48.4% (passive, allies EXCLUDESELF)', () => {
    const applied = graveBuffs(base.events).filter(
      (b) => b.stat === 'pierceDamagePct' && Math.abs(b.value - 48.4) < 0.01
    );

    it('reaches the three allies but NOT grave herself (excludeSelf)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 2, 3,
      ]);
      expect(applied.filter((b) => b.targetIdx === GRAVE)).toEqual([]);
    });

    it('DISCRIMINATING: dropping excludeSelf puts 48.4 on grave AND lifts her in-window Damage-Up', () => {
      const cfApplied = graveBuffs(noExcludeSelf.events).filter(
        (b) =>
          b.stat === 'pierceDamagePct' &&
          Math.abs(b.value - 48.4) < 0.01 &&
          b.targetIdx === GRAVE
      );
      expect(
        cfApplied.length,
        'the counterfactual must land 48.4 on grave'
      ).toBeGreaterThan(0);
      // The shipped in-window Damage-Up is strictly LOWER — the 48.4 would double-count in the
      // Prediction window (she is pierce-tagged there), which excludeSelf correctly prevents.
      expect(Math.max(...windowDmgUp(base.events))).toBeLessThan(
        Math.min(...windowDmgUp(noExcludeSelf.events))
      );
    });
  });

  describe('G3 — S1 Heat Emission: Reload Ratio ▼50% → charFixes.reloadFrames 193 (MEASURED)', () => {
    it('is encoded as the measured charFixes.reloadFrames 193 (effective 201f), not a reloadSpeedPct fudge', () => {
      const ov = withPatchedOverride('grave', () => {});
      expect((ov as any).charFixes?.reloadFrames).toBe(193);
    });

    it('DISCRIMINATING: the measured slow reload gates shot count — datamined 81f fires strictly more', () => {
      const shippedShots = graveShots(base.events).length;
      const dataminedShots = graveShots(dataminedReload.events).length;
      expect(
        shippedShots,
        `${shippedShots} shipped shots vs ${dataminedShots} on the datamined 81f reload — the ` +
          'measured 193f must reduce shot count (reload time gates shots gate damage)'
      ).toBeLessThan(dataminedShots);
    });
  });

  describe('G4 — S2 Overheat I: ATK ▲15.48% after 15 normal hits (self, sustained)', () => {
    const applied = graveBuffs(base.events).filter(
      (b) => b.stat === 'atkPct' && Math.abs(b.value - 15.48) < 0.01
    );

    it('is 15.48%, self-scoped, sustained (no expiry)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GRAVE]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is hitCount-triggered: first fires after setup and well before her first burst', () => {
      const first = Math.min(...applied.map((b) => b.frame));
      expect(
        first,
        'a hitCount buff cannot apply at frame 0 (that would be a passive)'
      ).toBeGreaterThan(0);
      expect(
        first,
        'Overheat I builds from normal hits, so it precedes the first burst cast'
      ).toBeLessThan(firstBurstFrame(base.events));
    });

    it('is encoded as a hitCount-15 self block (structural pin)', () => {
      const ov = withPatchedOverride('grave', () => {}) as any;
      const block = ov.skill2.find((b: any) => b.trigger?.kind === 'hitCount');
      expect(block?.trigger?.count).toBe(15);
      expect(block?.target?.kind).toBe('self');
      expect(
        block.effects.some(
          (e: any) => e.stat === 'atkPct' && Math.abs(e.value - 15.48) < 0.01
        )
      ).toBe(true);
    });
  });

  describe('G5 — S2 Overheat II/III: ATK ▲20.66% + Attack Damage ▲30.8% on burstCast (self, 10s)', () => {
    const atk = graveBuffs(base.events).filter(
      (b) => b.stat === 'atkPct' && Math.abs(b.value - 20.66) < 0.01
    );
    const atkDmg = graveBuffs(base.events).filter(
      (b) => b.stat === 'attackDamagePct' && Math.abs(b.value - 30.8) < 0.01
    );

    it('both fire, self-scoped, for exactly 10s', () => {
      for (const applied of [atk, atkDmg]) {
        expect(applied.length).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GRAVE]);
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        }
      }
    });

    it('is burstCast-triggered: first fires on the first burst frame, once per burst', () => {
      expect(Math.min(...atk.map((b) => b.frame))).toBe(
        firstBurstFrame(base.events)
      );
      expect(atk.length, 'Overheat II refreshes once per burst cast').toBe(
        N_BURSTS
      );
      expect(atkDmg.length, 'Overheat III refreshes once per burst cast').toBe(
        N_BURSTS
      );
    });
  });

  describe('G6 — Burst (self, Prediction window): unlimitedAmmo + Gain Pierce + Pierce Dmg 52.8 + Crit 85.19, 10s', () => {
    it('unlimitedAmmo: every in-window shot is unlimited (remove it → she reloads mid-window)', () => {
      const shipped = windowShots(base.events);
      expect(
        shipped.length,
        'she should fire the whole 10s window without reloading'
      ).toBeGreaterThanOrEqual(100);
      expect([...new Set(shipped.map((s) => s.unlimitedAmmo))]).toEqual([true]);

      const cf = windowShots(noUnlimitedAmmo.events);
      expect(
        cf.length < shipped.length || cf.some((s) => !s.unlimitedAmmo),
        'without unlimitedAmmo she burns the 60-round mag and cannot sustain the full window'
      ).toBe(true);
    });

    it('Gain Pierce: her Pierce Damage ▲ Damage-Up LANDS in-window (remove gainPierce → dmgUp collapses)', () => {
      const shipped = windowDmgUp(base.events);
      const cf = windowDmgUp(noGainPierce.events);
      expect(
        Math.min(...shipped),
        `shipped in-window dmgUp ${shipped} vs no-pierce ${cf} — Gain Pierce is what makes the ` +
          'Pierce Damage ▲ a real Damage-Up entry'
      ).toBeGreaterThan(Math.max(...cf));
    });

    it('Pierce Damage ▲52.8% (self) and Critical Rate ▲85.19% (self) apply once per burst for 10s', () => {
      const pierce = graveBuffs(base.events).filter(
        (b) => b.stat === 'pierceDamagePct' && Math.abs(b.value - 52.8) < 0.01
      );
      const crit = graveBuffs(base.events).filter(
        (b) => b.stat === 'critRatePct' && Math.abs(b.value - 85.19) < 0.01
      );
      for (const applied of [pierce, crit]) {
        expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GRAVE]);
        expect(applied.length).toBe(N_BURSTS);
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        }
      }
    });

    it('DISCRIMINATING: the 85.19 crit caps her in-window crit rate at 1.0 (remove it → 0.15/0.30)', () => {
      expect(windowCritRate(base.events)).toEqual([1]);
      expect(Math.max(...windowCritRate(noBurstCrit.events))).toBeLessThan(1);
    });
  });

  describe('G7 — Burst (all allies): Attack Dmg 48.2 + Pierce Dmg 39.98 + Max Ammo +3 rounds, 10s', () => {
    const specs: Array<[string, number]> = [
      ['attackDamagePct', 48.2],
      ['pierceDamagePct', 39.98],
      ['maxAmmoFlat', 3],
    ];

    it.each(specs)(
      '%s %i reaches all four allies for 10s, once per burst',
      (stat, value) => {
        const applied = graveBuffs(base.events).filter(
          (b) => b.stat === stat && Math.abs(b.value - value) < 0.01
        );
        expect(
          applied.length,
          `${stat} ${value} must be applied`
        ).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
          ALL_ALLIES
        );
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        }
        // Once per burst per ally → N_BURSTS applications per target.
        expect(applied.length).toBe(N_BURSTS * ALL_ALLIES.length);
      }
    );

    it('max ammo is the kit-literal FLAT rounds (maxAmmoFlat 3), not the old maxAmmoPct proxy', () => {
      const ov = withPatchedOverride('grave', () => {}) as any;
      const eff = ov.burst.flatMap((b: any) => b.effects);
      expect(
        eff.some((e: any) => e.stat === 'maxAmmoFlat' && e.value === 3)
      ).toBe(true);
      expect(eff.some((e: any) => e.stat === 'maxAmmoPct')).toBe(false);
    });
  });

  describe('unmodeled lines (structural pins — documented, inert or missing-primitive)', () => {
    const ov = withPatchedOverride('grave', () => {}) as any;

    it('skill1: Heat-Emission removal and self-heal are documented verbatim; the Prediction-end ammo dump is MODELED (consumeAmmo, enacted 2026-08-09)', () => {
      const u: string[] = ov.unmodeled?.skill1 ?? [];
      expect(u.length).toBe(2);
      const joined = u.join(' ');
      expect(joined).not.toContain('Removes 100% of ammo');
      expect(joined).toContain(
        'Removes Heat Emission under certain conditions'
      );
      expect(joined).toContain('Recovers 2%');
      const dump = (ov.skill1 ?? []).find((b: any) =>
        (b.effects ?? []).some((e: any) => e.kind === 'consumeAmmo')
      );
      expect(dump, 'Prediction-end consumeAmmo block missing').toBeTruthy();
      expect(dump.trigger.kind).toBe('burstCast');
      expect(dump.delaySec).toBe(10);
      expect(dump.effects[0].fraction).toBe(1);
    });

    it('skill2: Overheat I "removed upon reloading to max ammunition" is documented (absorbed by sustained approx)', () => {
      const u: string[] = ov.unmodeled?.skill2 ?? [];
      expect(u.join(' ')).toContain('Removed upon reloading to max ammunition');
    });

    it('burst: Prediction HP-drain self-cost is documented (defensive)', () => {
      const u: string[] = ov.unmodeled?.burst ?? [];
      expect(u.join(' ')).toContain('Current HP ▼ 1% every 1 sec');
    });
  });
});
