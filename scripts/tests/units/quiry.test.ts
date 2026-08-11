// PER-UNIT KIT SPEC — `quiry` (Quiry, Supporter/RL/Wind, Burst II, cd 60s per the synced
// burstCooldownSec, ammo 6, chargeFrames 60, reloadFrames 141). Kit-autonomy gauntlet 2026-08-04
// (test-first re-derivation). NOTE: this
// is a FROM-SCRATCH unit — there was no shipped override before this gauntlet (simSupported was
// false), so the harness cannot even load her until src/skills/overrides/quiry.json exists. The
// override was authored as an EMPTY SKELETON first (the "shipped" state these tests run RED
// against), then the faithful S3 encoding lands GREEN — every assertion pins a kit line and the
// nearest-wrong counterfactual (withPatchedOverride) it must discriminate against.
//
// Kit (blablalink prose, data/characters.json → characters.quiry.skills), max level:
//   S1 ■ hitting a target with Full Charge → the target: ATK ▼ 8.94% of quiry's ATK, 3 sec.
//                                                  [UNMODELED — the engine models no enemy ATK]
//      ■ attacking with Full Charge → 2 Defender allies:
//        ATK ▲ 5.81% of the skill user's ATK for 3 sec.                            [Q1]
//   S2 ■ start of battle → 2 Defender allies: Max HP ▲ 11.63% continuously.        [Q2]
//   BU ■ all allies: recover 6.96% of quiry's final Max HP every 1 sec for 10 sec. [Q3]
//      ■ all Defender allies: Critical Rate ▲ 19.9% for 10 sec.                    [Q4]
//
// Modeling posture (full story in the override note):
//   * The S1 enemy ATK▼ debuff is UNMODELED: the engine has no enemy-ATK model, because the v1
//     boss deals no damage and so an ATK debuff on it has nothing to scale. Offensively inert by
//     construction, verbatim in unmodeled. Enemy DEF ▼ is NOT the same case — it has had a
//     channel since 2026-08-10; enemy ATK ▼ is the genuinely inert enemy debuff.
//   * S1's ally ATK buff is a CASTER-ATK FLAT add ("5.81% OF THE SKILL USER'S ATK" — not the
//     target's own %): casterAtkPct resolves (5.81/100)×quiry.staticAtk at apply time. The kit
//     says plain "the skill user's ATK", not "final ATK", so the STATIC basis is the literal-word
//     reading (A3: only "final" gets the live basis).
//   * "2 Defender ally unit(s)" scope = alliesOfClass 'Defender' — the schema's class scope has no
//     count cap; exact while the team fields ≤2 Defenders (the fixture fields exactly 1), over-
//     grants to a 3rd Defender in tank-heavy teams (⚑ in the override note). Quiry is a
//     Supporter, so she never counts toward her own Defender scope.
//   * The burst heal is the recovery EVENT channel only: heal ticks:10 intervalSec:1 (the kit's
//     "every 1 sec for 10 sec" window, milk K6 / helm H8 precedent). No HP amount is modeled —
//     the 6.96%-of-final-Max-HP magnitude rides verbatim in unmodeled, not fudged. Observable
//     through asuka's "when recovery takes effect" self ATK consumer (the fixture's consumer).
//   * S2's Max HP grant arrives as an ALLY-granted maxHpFlat (casterIdx = quiry) — effectiveAtk's
//     e3 rule (VIDEO-MEASURED 2026-07-13) excludes ally grants from atkOfMaxHpPct conversions, so
//     it is damage-INERT on 2b even though 2b IS an HP-scaling kit (her own grants feed, quiry's
//     do not). Q2 pins both the inertness and that the basis is load-bearing (a SELF grant of the
//     same magnitude provably moves 2b's total).
//
// FIXTURE: liter(B1) / quiry(B2) / asuka(B3) / 2b(B3), boss Iron (quiry is Wind — clean ×1.10
// advantage), focus quiry. Custom comp (novel precedent): crown — the usual B2 of the control
// comp — would take the stage-II slot and leave quiry zero casts, so she is the SOLE Burst II
// here and casts every Full Burst. asuka doubles as the recovery CONSUMER (her S1 self ATK
// 96.98%/25s fires on every recovery she receives) and 2b as the sole DEFENDER recipient of the
// three class-scoped lines. Known fixture confound (measured into the Q3 thresholds): asuka's own
// burst lifesteal emits one self-recovery at each of HER casts (~1s after quiry's). Deterministic
// (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'quiry', 'asuka', '2b'] as const;
/** slot order: liter 0 / quiry 1 / asuka 2 / 2b 3. */
const QUIRY = 1;
const ASUKA = 2;
const TWOB = 3;
const FIGHT_FRAMES = 180 * FPS;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Iron',
    focusSlug: 'quiry',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const quiryShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'quiry');
const quiryCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'quiry'
  );

/** asuka's "when recovery takes effect" self ATK buff — one buffApply per recovery event she
 *  receives (applications AND refreshes both log). The Q3 recovery-channel observable. */
const asukaRecoveryApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ASUKA &&
      b.targetIdx === ASUKA &&
      b.stat === 'atkPct' &&
      b.value === 96.98
  );

/** Distinct crit rates per unit on a bucket — the Q4 discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][]
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) {
      continue;
    }
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')])
  );
}

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
// PHASE-AWARE GUARD: quiry is FROM-SCRATCH — the RED phase runs against an empty skeleton
// override, where there is no block to patch and a counterfactual is (correctly) identical to
// the shipped state. `mutateBlock` therefore throws only when the slot is NON-EMPTY but the
// block is absent (a genuinely stale fixture), and passes through on the empty skeleton.
function mutateBlock(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  find: (b: any) => boolean,
  mutate: (b: any) => void,
  label: string
): void {
  const b = ov[slot].find(find);
  if (b) {
    mutate(b);
    return;
  }
  if (ov[slot].length > 0) {
    throw new Error(`${label} missing — fixture is stale`);
  }
}

/** Q1 counterfactual: the same line as a GENERIC all-allies own-% ATK buff (wrong basis AND
 *  wrong scope — the natural misparse of "ATK ▲ 5.81% ... allies"). */
const quiryGenericAtk = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'skill1',
    (x: any) => x.effects.some((e: any) => e.stat === 'casterAtkPct'),
    (b: any) => {
      if (b.trigger.kind !== 'chargeCounter') {
        throw new Error('quiry S1 trigger re-keyed — fixture is stale');
      }
      b.target = { kind: 'allies' };
      b.effects[0].stat = 'atkPct';
    },
    'quiry S1 casterAtkPct block'
  );
});
/** Q2 isolation: her S2 Max HP line removed — must move NO unit's total (e3: ally-granted Max HP
 *  does not feed a teammate's atkOfMaxHpPct conversion, even 2b's). */
const quiryNoS2 = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'skill2',
    (x: any) => x.effects.some((e: any) => e.stat === 'targetMaxHpPct'),
    () => {
      ov.skill2 = ov.skill2.filter(
        (b: any) => !b.effects.some((e: any) => e.stat === 'targetMaxHpPct')
      );
    },
    'quiry S2 targetMaxHpPct block'
  );
});
/** Q2 counterfactual: the SAME magnitude as 2b's OWN-kit grant — own maxHpFlat DOES feed her
 *  atkOfMaxHpPct conversion, so this provably moves her total where the shipped ally grant does
 *  not. Proves the caster-basis distinction is load-bearing, not cosmetic. */
const twoBSelfHp = withPatchedOverride('2b', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'targetMaxHpPct', value: 11.63 }],
  });
});
/** Q3 counterfactual: the burst heal collapsed to a single instant event (ticks omitted) — a
 *  one-shot model of a "every 1 sec for 10 sec" window. */
const quiryInstantHeal = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.kind === 'heal'),
    (b: any) => {
      if (b.trigger.kind !== 'burstCast') {
        throw new Error('quiry burst heal trigger re-keyed — fixture is stale');
      }
      b.effects = b.effects.map((e: any) =>
        e.kind === 'heal' ? { kind: 'heal' } : e
      );
    },
    'quiry burst heal block'
  );
});
/** Q4 counterfactual: the crit-rate line unscoped to all allies (the class clause dropped). */
const quiryCritAllAllies = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.stat === 'critRatePct'),
    (b: any) => {
      b.target = { kind: 'allies' };
    },
    'quiry burst critRatePct block'
  );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const genericAtk = run({ quiry: quiryGenericAtk });
const noS2 = run({ quiry: quiryNoS2 });
const selfHp = run({ '2b': twoBSelfHp });
const instantHeal = run({ quiry: quiryInstantHeal });
const critAllies = run({ quiry: quiryCritAllAllies });

// ---- derived (base-run) quantities -------------------------------------------------------------
const QUIRY_STATIC_ATK = base.res.units[QUIRY].staticAtk;
const TWOB_MAX_HP = base.res.units[TWOB].maxHp;

describe('quiry — kit spec', () => {
  it('fixture sanity: quiry is the sole Burst II and casts every Full Burst', () => {
    expect(quiryCasts(base.events).length).toBeGreaterThanOrEqual(3);
  });

  describe("Q1 — S1 full-charge attack: 2 Defender allies gain ATK = 5.81% of quiry's ATK, 3s", () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === QUIRY && b.stat === 'casterAtkPct'
    );

    it("is a flat CASTER-basis add (5.81% of quiry static ATK), not the target's own %", () => {
      expect(applied.length).toBeGreaterThan(0);
      const expected = (5.81 / 100) * QUIRY_STATIC_ATK;
      expect([...new Set(applied.map((b) => b.value))]).toEqual([expected]);
    });

    it('reaches ONLY the Defender-class ally (never asuka/liter/quiry herself)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([TWOB]);
    });

    it('fires on EVERY full charge — an RL fires every shot as a full charge', () => {
      expect(applied.length).toBe(quiryShots(base.events).length);
    });

    it('is a 3-second window, refreshed per shot', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it('LAPSES across the reload gap — a timed window, not a permanent/passive grant (S2b)', () => {
      // quiry's mag cycle (~6 shots at ~1.4s + 141f reload + next charge) leaves a >3s gap
      // between the last apply of one magazine and the first of the next, so the 3s buff
      // genuinely drops mid-fight. A passive/permanent encoding shows one frame-0 apply instead.
      const frames = applied.map((b) => b.frame).sort((a, z) => a - z);
      const gaps = frames.slice(1).map((f, i) => f - frames[i]);
      expect(
        Math.max(...gaps),
        'some inter-apply gap must exceed the 3s window (the reload lapse)'
      ).toBeGreaterThan(3 * FPS);
    });

    it('DISCRIMINATING: a generic all-allies own-% ATK buff reaches all four at value 5.81', () => {
      const generic = buffs(genericAtk.events).filter(
        (b) => b.casterIdx === QUIRY && b.stat === 'atkPct' && b.value === 5.81
      );
      expect(generic.length).toBeGreaterThan(0);
      expect(new Set(generic.map((b) => b.targetIdx)).size).toBe(SLUGS.length);
      // and the shipped flat basis is one the generic model provably fails to produce
      expect(
        buffs(genericAtk.events).filter(
          (b) => b.casterIdx === QUIRY && b.stat === 'casterAtkPct'
        )
      ).toEqual([]);
    });
  });

  describe('Q2 — S2 battle-start: Defender allies gain Max HP ▲11.63% continuously', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === QUIRY && b.stat === 'maxHpFlat'
    );

    it("applies at frame 0 to the Defender only, at 11.63% of the TARGET's own Max HP", () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([TWOB]);
      const expected = (11.63 / 100) * TWOB_MAX_HP;
      expect([...new Set(applied.map((b) => b.value))]).toEqual([expected]);
    });

    it('is continuous — no wall-clock expiry', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it("is damage-INERT by the e3 rule: removing it moves NO unit's total (even 2b, an HP scaler)", () => {
      expect(base.totals).toEqual(noS2.totals);
    });

    it("DISCRIMINATING: the same magnitude as 2b's OWN grant DOES feed her HP→ATK conversion", () => {
      // ally-granted (shipped) is inert; own-kit-granted (counterfactual) provably moves 2b —
      // the caster/target basis distinction is load-bearing, not cosmetic.
      expect(selfHp.totals['2b']).toBeGreaterThan(base.totals['2b']);
    });
  });

  describe('Q3 — burst: all allies recover every 1 sec for 10 sec (a 10-tick recovery window)', () => {
    // The heal carries no modeled HP amount — its ONLY observable is the recovery-event channel.
    // asuka's S1 ("when recovery takes effect → self ATK ▲96.98%/25s") logs one buffApply per
    // recovery she receives, so her applications ARE quiry's heal ticks as seen by a consumer.
    // Only casts whose FULL window fits inside the 180s fight are measurable — a late cast's
    // window is truncated by the fight end, a fixture property, not a kit property (helm H8).
    const casts = quiryCasts(base.events).filter(
      (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
    );
    const frames = asukaRecoveryApplies(base.events).map((b) => b.frame);

    it('has bursts with a complete window to measure', () => {
      expect(
        casts.length,
        'no quiry burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each cast (10 ticks, 1s apart)', () => {
      for (const cast of casts) {
        const inWindow = frames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - cast.frame) / FPS
          : 0;
        // 10 quiry ticks at +0..+9s; asuka's own lifesteal may add ≤1 at her cast (~+1s) —
        // hence >= 10, not == 10.
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            `spanning ${spanSec.toFixed(1)}s — a single instant heal produces 1 (+≤1 lifesteal)`
        ).toBeGreaterThanOrEqual(10);
        expect(
          spanSec,
          'the window must reach ~9-10s, not collapse to the cast frame'
        ).toBeGreaterThanOrEqual(8);
        // burstCast-vs-fullBurstEnter timing pin (S2b): the first tick fires INLINE on her own
        // cast frame — a fullBurstEnter-keyed heal would first fire at the later stage-3
        // completion frame, strictly after quiry's stage-2 cast.
        expect(
          Math.min(...inWindow),
          'the first recovery tick lands on the cast frame itself'
        ).toBe(cast.frame);
      }
    });

    it('DISCRIMINATING: a one-shot heal never reaches the 10-firing window', () => {
      const oneShotFrames = asukaRecoveryApplies(instantHeal.events).map(
        (b) => b.frame
      );
      for (const cast of casts) {
        const inWindow = oneShotFrames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          'one-shot heal + at most one lifesteal firing'
        ).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Q4 — burst: all Defender allies gain Critical Rate ▲19.9% for 10 sec', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === QUIRY && b.stat === 'critRatePct'
    );
    const casts = quiryCasts(base.events);

    it('is 19.9% for 10 sec, one application per quiry cast, on her cast frames', () => {
      expect(applied.length).toBe(casts.length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([19.9]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const b of applied) {
        expect(castFrames.has(b.frame)).toBe(true);
      }
    });

    it('reaches ONLY the Defender-class ally', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([TWOB]);
    });

    it("is LIVE: 2b's crit rate inside a window is exactly +0.199 over her out-of-window rate", () => {
      const normals = dmg(base.events).filter(
        (d) => d.slug === '2b' && d.bucket === 'normal'
      );
      const windows = applied.map((b) => [b.frame, b.expiresFrame!] as const);
      const inWin = normals.filter((d) =>
        windows.some(([a, z]) => d.frame >= a && d.frame < z)
      );
      const outWin = normals.filter(
        (d) => !windows.some(([a, z]) => d.frame >= a && d.frame < z)
      );
      expect(inWin.length).toBeGreaterThan(0);
      expect(outWin.length).toBeGreaterThan(0);
      const baseRate = Math.min(...outWin.map((d) => d.critRate));
      expect(
        [...new Set(inWin.map((d) => d.critRate.toFixed(9)))],
        'every in-window 2b normal carries the lifted rate'
      ).toEqual([(baseRate + 0.199).toFixed(9)]);
    });

    it("DISCRIMINATING: unscoping the buff lifts EVERY unit's crit, not just the Defender", () => {
      const shipped = critRatesByUnit(base.events, ['normal', 'skill']);
      const unscoped = critRatesByUnit(critAllies.events, ['normal', 'skill']);
      const moved = [...SLUGS].filter((s) => unscoped[s] !== shipped[s]);
      // 2b is buffed identically under both encodings (same value/duration on her casts), so
      // she must NOT move — the delta is exactly the non-Defenders the shipped scope excludes.
      expect(
        moved,
        "the Defender's crit set is unchanged by unscoping"
      ).not.toContain('2b');
      expect(
        moved.length,
        'the unscoped buff must lift the non-Defenders the shipped scope excludes'
      ).toBeGreaterThanOrEqual(2);
    });
  });
});
