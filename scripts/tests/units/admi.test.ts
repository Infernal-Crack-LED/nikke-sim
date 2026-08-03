// PER-UNIT KIT SPEC — `admi` (Admi, Supporter/SR/Wind, Burst II, cd 20s). Kit-autonomy
// gauntlet 2026-08-03 (test-first re-derivation). ⚠ EXACT SLUG: admi — the only unit on the
// roster with this base name (the slug-disambiguation lint passes clean on the full variant).
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/admi.json exists. The override was authored first (the faithful
// encoding under test); every assertion below PINS a kit line GREEN vs that override and RED
// vs the nearest-wrong counterfactual (withPatchedOverride), so the file still discriminates
// exactly as a verification gauntlet would (soline/poli precedent, 2026-08-03).
//
// Kit (blablalink prose, data/characters.json → characters.admi.skills), max level:
//   S1 ■ Activates when attacked 20 time(s). Affects all allies.
//        Charge Damage Multiplier ▲ 9.59% for 20 sec.                          [UNMODELED — ⚑1]
//   S2 ■ Affects 2 allies with the highest final ATK. (cd 20s)
//        Damage Taken ▼ 28.65% for 10 sec.                                     [UNMODELED — ⚑2]
//   BU ■ Affects all allies. (cd 20s)
//        Reload Speed ▲ 50.91% for 10 sec.                                     [B1]
//        Critical Damage ▲ 28.34% for 10 sec.                                  [B2]
//
// Modeling posture (override note + caveats carry the full story):
//   * S1 'Helping Hand' — 'attacked 20 times' is an INCOMING-DAMAGE trigger: v1 models no
//     boss damage to allies and has no attacked-count trigger primitive, so the counter never
//     accrues and the line never fires at scope lock. UNMODELED verbatim + ⚑1 (noise/yulha
//     precedent). The effect side would be chargeDamageMultPct — 'Charge Damage Multiplier ▲'
//     is the base-charge-SCALING stat (helm-wording precedent; a2's additive chargeDamagePct
//     ruling covers only the bare 'Charge Damage ▲' wording; S2b reviewer catch). The
//     nearest-wrong encoding is a passive/always-on charge-damage team buff — the phantom arm
//     proves the absence pin has teeth.
//   * S2 'Kitten's Breath' — ally Damage-Taken mitigation: nothing to mitigate (no incoming
//     damage, no ally HP pool), and the ONLY damageTakenPct primitive is a BOSS debuff
//     (positive = boss takes MORE) — wrong direction/target, so it is NOT used (encoding it
//     would manufacture a phantom team damage gain — noise precedent). UNMODELED verbatim +
//     ⚑2; the '2 highest-final-ATK allies' targeting clause is moot with the inert effect.
//   * Burst — ONE burstCast block, target allies (includes self), reloadSpeedPct 50.91 +
//     critDamagePct 28.34, both 10s. burstCast NOT fullBurstEnter: the kit names no
//     full-burst condition, and her stage-2 cast lands BEFORE the Full Burst window opens, so
//     both windows ride frame-exact on her cast (crust/novel burst-aura convention) — the
//     Tier-2 lever, discriminated against a fullBurstEnter re-keying.
//   * The whole-kit pin: the ONLY buffApply events attributed to admi in the entire fight are
//     the two burst stats × four targets per cast (S1/S2 contribute nothing at scope lock).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   B1  reloadSpeedPct must land frame-exact on HER stage-2 cast for ALL four allies, 10s
//       windows. The fullBurstEnter counterfactual moves every application onto the FB-start
//       frames (strictly later than her cast); the excludeSelf counterfactual ('all allies'
//       misread as 'the other allies') drops admi's own applications. The live arms prove the
//       stat is not inert: faster reloads = more shots (shot-count arm) and more total damage.
//   B2  critDamagePct rides the same per-cast shape. The compositional arm matches hits 1:1
//       against the noCritBuff counterfactual (reload buff KEPT, so shot cadence — and hence
//       cast timing — is byte-identical across the pair): in-window majors differ by exactly
//       critRate × 28.34pp, out-of-window majors by exactly 0 — the SSOT major-bracket feed
//       (damage-calculation.md §1b), not a multiplier.
//   B3  absence pins: no chargeDamagePct and no damageTakenPct ever attributed to admi; the
//       phantom arms (a passive S1 team buff; S2 mis-encoded as a boss damageTakenPct debuff)
//       make both pins fail — proving they catch the two nearest-wrong encodings, including
//       the sign/direction trap the noise precedent documents (the boss-debuff mis-encoding
//       manufactures a measurable phantom team damage gain).
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / admi(B2) / modernia(B3) / helm(B3), boss
// Fire, focus admi (poli precedent: the standard controlComp cannot be used — crown is also
// Burst II and would take the stage-II slot, leaving admi ZERO casts). admi is the SOLE Burst
// II with a 20s CD, so she casts every Full Burst chain (10 casts / 180s). Deterministic (no
// seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const WINDOW_FRAMES = 10 * FPS; // both burst lines: 'for 10 sec'
const SLUGS = ['liter', 'admi', 'modernia', 'helm'] as const;
/** slot order: liter 0 / admi 1 / modernia 2 / helm 3. */
const ADM = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'admi',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug);
const admiCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'admi');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** admi's burst-buff applications, by stat. */
const admiBurstBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.stat === stat && b.casterIdx === ADM);
/** admi's normal-attack (charge) damage events. */
const admiNormals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'admi' && d.srcSlot === 'normal');
/** The frames of admi's casts — the 10s buff windows open on these. */
const castFrames = (evs: SimEvent[]) => admiCasts(evs).map((c) => c.frame);
/** A hit frame is inside SOME burst window [cast, cast+10s). */
const inWindow = (frame: number, casts: number[]) =>
  casts.some((c) => frame >= c && frame < c + WINDOW_FRAMES);

// ---- counterfactuals (nearest-wrong models each assertion must discriminate against) ----------
/** B1 counterfactual: the burst re-keyed to fullBurstEnter — both windows shift off her cast
 *  frames onto the FB-start frames (her stage-2 cast lands BEFORE the FB window opens). */
const admiFbEnter = withPatchedOverride('admi', (ov) => {
  const b = ov.burst[0];
  if (b?.trigger?.kind !== 'burstCast') {
    throw new Error('admi burst burstCast block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** B1 counterfactual: 'Affects all allies' misread as 'the OTHER allies' (excludeSelf). */
const admiExcludeSelf = withPatchedOverride('admi', (ov) => {
  const b = ov.burst[0];
  if (b?.target?.kind !== 'allies') {
    throw new Error('admi burst allies target missing — fixture is stale');
  }
  b.target = { kind: 'allies', excludeSelf: true };
});
/** B2 isolation: ONLY the critDamage line removed (reload KEPT, so shot cadence and cast
 *  timing stay byte-identical to base — legal matched-hit comparison). */
const admiNoCritBuff = withPatchedOverride('admi', (ov) => {
  const before = ov.burst[0].effects.length;
  ov.burst[0].effects = ov.burst[0].effects.filter(
    (e: any) => e.stat !== 'critDamagePct'
  );
  if (ov.burst[0].effects.length !== before - 1) {
    throw new Error('admi burst critDamagePct effect missing — fixture is stale');
  }
});
/** B1 isolation: ONLY the reloadSpeed line removed (crit KEPT). */
const admiNoReloadBuff = withPatchedOverride('admi', (ov) => {
  const before = ov.burst[0].effects.length;
  ov.burst[0].effects = ov.burst[0].effects.filter(
    (e: any) => e.stat !== 'reloadSpeedPct'
  );
  if (ov.burst[0].effects.length !== before - 1) {
    throw new Error('admi burst reloadSpeedPct effect missing — fixture is stale');
  }
});
/** Whole-burst isolation: both lines removed. */
const admiNoBurst = withPatchedOverride('admi', (ov) => {
  if (!ov.burst.length) {
    throw new Error('admi burst empty — fixture is stale');
  }
  ov.burst = [];
});
/** B3 phantom: the nearest-wrong S1 — a PASSIVE always-on charge-damage team buff on the
 *  faithful stat flavor (chargeDamageMultPct; the real line is gated on being attacked 20×,
 *  which never accrues at scope lock). */
const admiPhantomS1 = withPatchedOverride('admi', (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        {
          kind: 'buff',
          stat: 'chargeDamageMultPct',
          value: 9.59,
          durationSec: 20,
        },
      ],
    },
  ];
});
/** B3 phantom: the nearest-wrong S2 — the ally mitigation mis-encoded as the BOSS-debuff
 *  damageTakenPct primitive (wrong direction; manufactures a phantom team damage gain). */
const admiPhantomS2 = withPatchedOverride('admi', (ov) => {
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'interval', sec: 20 },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 28.65, durationSec: 10 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const fbEnter = run({ admi: admiFbEnter });
const excludeSelf = run({ admi: admiExcludeSelf });
const noCritBuff = run({ admi: admiNoCritBuff });
const noReloadBuff = run({ admi: admiNoReloadBuff });
const noBurst = run({ admi: admiNoBurst });
const phantomS1 = run({ admi: admiPhantomS1 });
const phantomS2 = run({ admi: admiPhantomS2 });

describe('admi — kit spec', () => {
  it('fixture sanity: admi is the sole Burst II and casts every covered chain at stage 2', () => {
    const casts = admiCasts(base.events);
    // deterministic run: one cast per Full Burst chain, 20s CD never the limiter
    expect(casts.length).toBe(10);
    expect([...new Set(casts.map((c) => c.stage))]).toEqual([2]);
  });

  describe('B1 — burst line 1: Reload Speed ▲50.91% for 10s, all allies, on HER cast', () => {
    const applies = admiBurstBuff(base.events, 'reloadSpeedPct');
    const casts = castFrames(base.events);

    it('lands frame-exact on her stage-2 cast for ALL FOUR allies, 10s windows, kit magnitude', () => {
      expect(applies.length).toBe(4 * casts.length);
      for (const c of casts) {
        const perCast = applies.filter((b) => b.frame === c);
        expect(
          perCast.map((b) => b.targetIdx).sort(),
          `cast at frame ${c}: all allies including admi herself`
        ).toEqual([0, 1, 2, 3]);
        for (const b of perCast) {
          expect(b.value).toBe(50.91);
          expect(b.expiresFrame! - b.frame, '10s duration').toBe(WINDOW_FRAMES);
        }
      }
    });

    it('the lever is real: every stage-2 cast lands BEFORE the Full Burst window it feeds', () => {
      const fbs = fbStarts(base.events).map((f) => f.frame);
      expect(fbs.length).toBeGreaterThanOrEqual(casts.length);
      for (const c of casts) {
        const fb = fbs.find((f) => f > c && f - c <= WINDOW_FRAMES);
        expect(fb, `cast ${c} has a later FB start within 10s`).toBeDefined();
      }
    });

    it('is live: faster reloads mean more shots and more damage for the whole team', () => {
      expect(shots(base.events, 'admi').length).toBeGreaterThan(
        shots(noReloadBuff.events, 'admi').length
      );
      expect(shots(base.events, 'helm').length).toBeGreaterThan(
        shots(noReloadBuff.events, 'helm').length
      );
      for (const s of SLUGS) {
        expect(base.totals[s], `${s} total`).toBeGreaterThan(noBurst.totals[s]);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter re-keying lands every application on the FB-start frame, never her cast', () => {
      const moved = admiBurstBuff(fbEnter.events, 'reloadSpeedPct');
      expect(moved.length).toBeGreaterThan(0);
      const fbFrames = new Set(fbStarts(fbEnter.events).map((f) => f.frame));
      const castSet = new Set(castFrames(fbEnter.events));
      for (const b of moved) {
        expect(fbFrames.has(b.frame), `application at ${b.frame} on an FB start`).toBe(true);
        expect(castSet.has(b.frame)).toBe(false);
      }
    });

    it("DISCRIMINATING: 'all allies' misread as excludeSelf drops admi's own applications and her damage", () => {
      const xs = admiBurstBuff(excludeSelf.events, 'reloadSpeedPct');
      expect(xs.length).toBeGreaterThan(0);
      expect(xs.some((b) => b.targetIdx === ADM)).toBe(false);
      expect(base.totals.admi).toBeGreaterThan(excludeSelf.totals.admi);
    });
  });

  describe('B2 — burst line 2: Critical Damage ▲28.34% for 10s, all allies, on HER cast', () => {
    const applies = admiBurstBuff(base.events, 'critDamagePct');
    const casts = castFrames(base.events);

    it('lands frame-exact on the same casts as the reload line, same shape', () => {
      expect(applies.length).toBe(4 * casts.length);
      for (const c of casts) {
        const perCast = applies.filter((b) => b.frame === c);
        expect(perCast.map((b) => b.targetIdx).sort()).toEqual([0, 1, 2, 3]);
        for (const b of perCast) {
          expect(b.value).toBe(28.34);
          expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        }
      }
    });

    it('feeds the major bucket at exactly critRate × 28.34pp on matched in-window hits (and 0 outside)', () => {
      const b = admiNormals(base.events);
      const c = admiNormals(noCritBuff.events);
      // reload buff kept in BOTH runs → shot cadence and cast timing identical → 1:1 hits
      expect(b.length).toBe(c.length);
      expect(b.length).toBeGreaterThan(0);
      let inN = 0;
      let outN = 0;
      for (let i = 0; i < b.length; i++) {
        expect(b[i].frame, 'matched-hit alignment').toBe(c[i].frame);
        if (inWindow(b[i].frame, casts)) {
          inN++;
          expect(
            b[i].mult.major - c[i].mult.major,
            `in-window hit ${i} (frame ${b[i].frame})`
          ).toBeCloseTo(b[i].critRate * 0.2834, 6);
        } else {
          outN++;
          expect(b[i].mult.major - c[i].mult.major, `out-of-window hit ${i}`).toBeCloseTo(0, 8);
        }
      }
      expect(inN, 'window coverage exists').toBeGreaterThan(0);
      expect(outN, 'outside-window coverage exists').toBeGreaterThan(0);
    });

    it('DISCRIMINATING: dropping ONLY the critDamage line costs crit-window damage but keeps the reload cadence', () => {
      expect(noCritBuff.totals.admi).toBeLessThan(base.totals.admi);
      expect(shots(noCritBuff.events, 'admi').length).toBe(
        shots(base.events, 'admi').length
      );
    });
  });

  describe('B3 — S1/S2 are out-of-domain at scope lock: admi contributes NOTHING else', () => {
    it('the only stats ever attributed to admi are the two burst buffs', () => {
      const mine = buffs(base.events).filter((b) => b.casterIdx === ADM);
      expect(mine.length).toBeGreaterThan(0);
      expect([...new Set(mine.map((b) => b.stat))].sort()).toEqual([
        'critDamagePct',
        'reloadSpeedPct',
      ]);
    });

    it("S1 never fires: no charge-damage application of either flavor from admi (the 'attacked 20×' counter cannot accrue)", () => {
      expect(admiBurstBuff(base.events, 'chargeDamagePct').length).toBe(0);
      expect(admiBurstBuff(base.events, 'chargeDamageMultPct').length).toBe(0);
    });

    it('DISCRIMINATING: a phantom passive S1 WOULD emit chargeDamageMultPct — the absence pin has teeth', () => {
      expect(
        admiBurstBuff(phantomS1.events, 'chargeDamageMultPct').length
      ).toBeGreaterThan(0);
    });

    it('S2 never fires: no damageTakenPct application anywhere in this fight (the boss-debuff primitive is not misused; boss debuffs carry casterIdx null, so the pin keys on presence)', () => {
      const mis = buffs(base.events).filter((b) => b.stat === 'damageTakenPct');
      expect(mis.length).toBe(0);
    });

    it('DISCRIMINATING: the boss-debuff mis-encoding WOULD manufacture a phantom team damage gain', () => {
      const mis = buffs(phantomS2.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      expect(mis.length).toBeGreaterThan(0);
      expect(mis.every((b) => b.targetIdx === null)).toBe(true); // the BOSS holds it
      let phantomGain = 0;
      for (const s of SLUGS) {
        phantomGain += phantomS2.totals[s] - base.totals[s];
      }
      expect(phantomGain, 'the direction trap inflates team damage').toBeGreaterThan(0);
    });
  });
});
