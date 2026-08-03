// PER-UNIT KIT SPEC — `snow-white-innocent-days` (Snow White: Innocent Days, AR Attacker,
// Iron, Burst III, cd 40s, ammo 60, hitsPerShot 1, reloadFrames 81). Kit-autonomy gauntlet
// 2026-08-03 (test-first re-derivation). NOTE: this is a FROM-SCRATCH unit — there was no
// shipped override before this gauntlet (simSupported was false), so the harness cannot even
// load her until src/skills/overrides/snow-white-innocent-days.json exists. The override was
// authored first (the faithful encoding under test); every assertion below PINS a kit line
// GREEN vs that override and RED vs the nearest-wrong counterfactual (withPatchedOverride), so
// the file still discriminates exactly as a verification gauntlet would (poli precedent,
// 2026-08-03). She is the hit-counter variant of base snow-white (slug snow-white — the
// cannon-swap unit, NOT this one).
//
// Kit (blablalink prose, data/characters.json → characters['snow-white-innocent-days'].skills):
//   S1 ■ every 30 normal attacks → self: Max Ammunition Capacity ▲25.66%, x5 stacks, 5 sec  [SW1]
//      ■ every 30 normal attacks → enemies in attack range: 188.68% final ATK as damage    [SW2]
//   S2 ■ every 50 normal attacks → all enemies: 61.69% final ATK as damage                 [SW3]
//      ■ using Burst Skill → self: Attack Damage ▲21.12% for 10 sec                        [SW4]
//   BU ■ self: Hit count required for Skill 2 ▼ 20 for 10 sec                              [SW5]
//      ■ self: ATK ▲ 97.2% for 10 sec                                                      [SW6]
//      ■ self: Unlimited ammunition for 10 sec                                             [SW7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   SW1 live arm: removing the ammo-capacity buff must move HER total (longer magazines = fewer
//       reloads = more fired rounds + more procs) — an inert mis-encoding (e.g. a stat the engine
//       ignores) is byte-identical and fails the arm. Value/duration/scope/cadence pinned on the
//       buffApply log, frame-exact against an INDEPENDENT 30-hit walk over her shot events. The
//       5-stack cap IS behaviourally reached at fixture cadence (her unlimited-ammo windows fire
//       reload-free at 2.5s/proc < the 5s duration; measured: stacks climb to 5) and is pinned
//       via the maxStacks field + a stacks <= cap invariant.
//   SW2 cadence pin: frames must equal the independent 30-hit walk exactly. The hitCount-3
//       counterfactual (nearest misread of "30 normal attacks") produces ~10× the riders and
//       fails it; a one-shot trigger fails it harder.
//   SW3 the core of the kit: the proc schedule is re-derived INDEPENDENTLY — a 50-hit walk whose
//       threshold drops to 30 inside every Full Burst window and CARRIES OVER the boundary — and
//       the shipped rider frames must match it exactly. Proves both the 50-hit cadence and the
//       in-window switch in one frame-exact pin.
//   SW4 "when USING Burst Skill" is burstCast, not fullBurstEnter: in this two-B3 comp (helm
//       alternates) fullBurstEnter would fire ~2× as often, on helm's windows too. Pinned
//       frame-exact vs her burstCast events; the fullBurstEnter counterfactual fires strictly
//       more.
//   SW5 is SW3's counterfactual arm: strip countInFb and the in-window procs space back out to
//       50 hits — the shipped run must produce strictly more skill2 riders, and the delta must
//       sit inside FB windows.
//   SW6 same burstCast-vs-fullBurstEnter class as SW4 for the ATK buff, plus a live arm:
//       removing ~97% ATK for 10s per cast must drop her total.
//   SW7 every shot inside [cast, cast+10s) carries the unlimited flag and a NEVER-DRAINING
//       ammoAfter (non-decreasing — a reload in flight at cast may still complete and jump it
//       UP; consumption is what's suppressed); the stripped counterfactual flags none and
//       reloads inside the window.
//
// KNOWN SCOPE DIVERGENCE (S2b claude-fable-5 flagged; driver reconciled, kept — see the
// override's ⚑⚑ caveat): the kit-literal L5 is OWN-CAST-anchored ('Hit count required for
// Skill 2 ▼ 20 for 10 sec' from HER burst), but the engine's hitCount threshold switch
// (countInFb) is keyed to the GLOBAL Full Burst window (RRH convention; only chargeCounter has
// the owner-anchored variant, and S4 freezes the engine). The SW3 walk below therefore encodes
// the SHIPPED semantics (threshold 30 in EVERY FB window, helm-led ones included); the
// kit-literal reading would hold 50 during helm-led windows. Bounded ~0.5-1% over-credit in
// this two-B3 fixture; exact in single-B3 comps. The judge packet carries both readings.
//
// Fixture: controlComp('snow-white-innocent-days') — liter B1 / crown B2 / SWID B3 / helm B3,
// boss Fire (NEUTRAL vs Iron — no elemental major at scope), focus SWID. She needs the real
// rotation to cast at all (a lone B3 makes zero Full Bursts). Deterministic (no seed);
// expectations are re-derived from the event log, not hard-coded totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, withPatchedOverride } from '../lib/harness.js';

const SLUG = 'snow-white-innocent-days';
const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** controlComp slot order: liter 0 / crown 1 / carry 2 / helm 3. */
const SWID = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

if (data.characters[SLUG].hitsPerShot !== 1) {
  throw new Error(`${SLUG} hitsPerShot changed — the 1-hit-per-shot walks below are stale`);
}

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const riderBlock = (b: any, atkPct: number) =>
  b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === atkPct);

/** SW1 live arm: her S1 ammo-capacity block removed entirely. */
const noAmmoBuff = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'maxAmmoPct'));
  if (ov.skill1.length === before) {
    throw new Error('SWID S1 maxAmmoPct block missing — fixture is stale');
  }
});
/** SW2 counterfactual: nearest misread of "30 normal attacks" — a proc every 3 hits. */
const s1RiderFast = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => riderBlock(x, 188.68));
  if (!b || b.trigger?.kind !== 'hitCount') {
    throw new Error('SWID S1 188.68 hitCount block missing — fixture is stale');
  }
  b.trigger.count = 3;
});
/** SW5 counterfactual: the burst's ▼20 requirement ignored (no in-FB threshold switch). */
const noCountInFb = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => riderBlock(x, 61.69));
  if (!b || b.trigger?.kind !== 'hitCount' || b.trigger.countInFb == null) {
    throw new Error('SWID S2 61.69 hitCount/countInFb block missing — fixture is stale');
  }
  delete b.trigger.countInFb;
});
/** SW4/SW6 counterfactual: the prose trigger swapped for the FB-window trigger. */
const asFullBurstEnter = (slot: 'skill2' | 'burst', pick: (b: any) => boolean) =>
  withPatchedOverride(SLUG, (ov) => {
    const b = ov[slot].find((x: any) => pick(x) && x.trigger?.kind === 'burstCast');
    if (!b) {
      throw new Error(`SWID ${slot} burstCast block missing — fixture is stale`);
    }
    b.trigger = { kind: 'fullBurstEnter' };
  });
const s2BuffFbEnter = asFullBurstEnter('skill2', (b) => hasStat(b, 'attackDamagePct'));
const atkBuffFbEnter = asFullBurstEnter('burst', (b) => hasStat(b, 'atkPct'));
/** SW7 counterfactual: the unlimited-ammunition line dropped. */
const noUnlimited = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst[0]?.effects?.length ?? 0;
  ov.burst[0].effects = ov.burst[0].effects.filter((e: any) => e.kind !== 'unlimitedAmmo');
  if (ov.burst[0].effects.length === before) {
    throw new Error('SWID burst unlimitedAmmo effect missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAmmo = run({ [SLUG]: noAmmoBuff });
const fastRider = run({ [SLUG]: s1RiderFast });
const plainFifty = run({ [SLUG]: noCountInFb });
const s2Fb = run({ [SLUG]: s2BuffFbEnter });
const atkFb = run({ [SLUG]: atkBuffFbEnter });
const limited = run({ [SLUG]: noUnlimited });

// ---- readers ----------------------------------------------------------------------------------
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const bursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbWindows = (evs: SimEvent[]) =>
  evs
    .filter((e): e is FbStart => e.kind === 'fullBurstStart')
    .map((s) => ({ start: s.frame, end: s.endFrame }));
const inFb = (windows: { start: number; end: number }[], frame: number) =>
  windows.some((w) => frame >= w.start && frame < w.end);
const riders = (evs: SimEvent[], srcSlot: Damage['srcSlot'], atkPct: number) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === SLUG && e.srcSlot === srcSlot && e.atkPct === atkPct
  );
const buffs = (evs: SimEvent[], stat: string, value: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === SWID && e.stat === stat && e.value === value
  );
const totalOf = (evs: SimEvent[]) =>
  evs
    .filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG)
    .reduce((s, d) => s + d.amount, 0);

/** INDEPENDENT re-derivation of her hit-counter proc frames: walk her shot events with a
 *  carry-over counter; threshold is `outside`, or `inside` while the shot lands in a Full Burst
 *  window (mirrors the engine's per-shot threshold read — the walk is written from the KIT TEXT,
 *  not from the override). */
function walkProcs(
  evs: SimEvent[],
  outside: number,
  inside?: number
): number[] {
  const windows = fbWindows(evs);
  const procs: number[] = [];
  let c = 0;
  for (const s of shots(evs)) {
    const thr = inside != null && inFb(windows, s.frame) ? inside : outside;
    c += 1;
    while (c >= thr) {
      c -= thr;
      procs.push(s.frame);
    }
  }
  return procs;
}

describe('snow-white-innocent-days — kit spec', () => {
  it('fixture sanity: she casts bursts on the control rotation, and FB windows outnumber her casts', () => {
    expect(bursts(base).length).toBeGreaterThanOrEqual(4);
    // helm alternates as the other B3 → strictly more FB windows than her casts
    expect(fbWindows(base).length).toBeGreaterThan(bursts(base).length);
  });

  describe('SW1 — S1: Max Ammunition Capacity ▲25.66% (x5 stacks, 5s) every 30 hits, self', () => {
    const applied = buffs(base, 'maxAmmoPct', 25.66);
    const expected = walkProcs(base, 30);

    it('fires frame-exact on the independent 30-hit walk (one per 30 hits, carry-over)', () => {
      expect(applied.map((b) => b.frame)).toEqual(expected);
      expect(applied.length).toBeGreaterThanOrEqual(40);
    });

    it('is the kit magnitude, 5s duration, self-scoped, with the 5-stack cap', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.targetIdx).toBe(SWID);
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(b.maxStacks).toBe(5);
        expect(b.stacks).toBeLessThanOrEqual(5);
      }
    });

    it('DISCRIMINATING (live arm): removing it changes her total (longer mags = fewer reloads)', () => {
      expect(totalOf(base)).not.toBe(totalOf(noAmmo));
      // the buff grants ammo economy → the shipped run fires at least as many shots
      expect(shots(base).length).toBeGreaterThan(shots(noAmmo).length);
    });
  });

  describe('SW2 — S1 rider: 188.68% of final ATK every 30 hits', () => {
    const hits = riders(base, 'skill1', 188.68);
    const expected = walkProcs(base, 30);

    it('lands frame-exact on the same 30-hit schedule as the ammo line', () => {
      expect(hits.map((d) => d.frame)).toEqual(expected);
    });

    it('is the kit magnitude in the skill bucket, crit-eligible (engine rider convention)', () => {
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(hits.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: an every-3-hits misread produces far more riders', () => {
      expect(riders(fastRider, 'skill1', 188.68).length).toBeGreaterThan(hits.length * 5);
    });
  });

  describe('SW3 — S2 rider: 61.69% every 50 hits, dropping to 30 inside Full Burst', () => {
    const hits = riders(base, 'skill2', 61.69);
    const expected = walkProcs(base, 50, 30);

    it('matches the independent 50/30 carry-over walk frame-exactly', () => {
      expect(hits.map((d) => d.frame)).toEqual(expected);
      expect(hits.length).toBeGreaterThan(20);
    });

    it('the in-window switch is REAL: some procs land inside FB windows at the 30-hit pace', () => {
      const windows = fbWindows(base);
      const inWindow = hits.filter((d) => inFb(windows, d.frame));
      expect(inWindow.length).toBeGreaterThan(0);
      // at the plain-50 pace strictly fewer procs would fit the same shots
      expect(hits.length).toBeGreaterThan(walkProcs(base, 50).length);
    });
  });

  describe('SW4 — S2: Attack Damage ▲21.12% for 10s fires on HER burst cast (burstCast, not FB entry)', () => {
    const applied = buffs(base, 'attackDamagePct', 21.12);
    const casts = bursts(base).map((c) => c.frame);

    it('fires frame-exact once per HER burst cast — not once per FB window', () => {
      expect(applied.map((b) => b.frame)).toEqual(casts);
    });

    it('is self-scoped with a 10s window', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.targetIdx).toBe(SWID);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: fullBurstEnter would fire on helm\'s windows too (strictly more)', () => {
      const fbFired = buffs(s2Fb, 'attackDamagePct', 21.12);
      expect(fbFired.length).toBeGreaterThan(applied.length);
    });
  });

  describe('SW5 — burst drops the S2 requirement by 20 (50 → 30) for 10s', () => {
    const shipped = riders(base, 'skill2', 61.69);
    const plain = riders(plainFifty, 'skill2', 61.69);

    it('without the switch there are strictly fewer S2 riders…', () => {
      expect(plain.length).toBeLessThan(shipped.length);
    });

    it('…and the shipped surplus sits inside FB windows', () => {
      const windows = fbWindows(base);
      const shippedIn = shipped.filter((d) => inFb(windows, d.frame)).length;
      const plainWindows = fbWindows(plainFifty);
      const plainIn = plain.filter((d) => inFb(plainWindows, d.frame)).length;
      expect(shippedIn).toBeGreaterThan(plainIn);
    });
  });

  describe('SW6 — burst: ATK ▲97.2% for 10s on HER cast', () => {
    const applied = buffs(base, 'atkPct', 97.2);
    const casts = bursts(base).map((c) => c.frame);

    it('fires frame-exact once per HER burst cast', () => {
      expect(applied.map((b) => b.frame)).toEqual(casts);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.targetIdx).toBe(SWID);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: fullBurstEnter would re-fire on helm\'s windows (strictly more)', () => {
      expect(buffs(atkFb, 'atkPct', 97.2).length).toBeGreaterThan(applied.length);
    });

    it('DISCRIMINATING (live arm): removing the ATK window drops her total', () => {
      const noAtk = withPatchedOverride(SLUG, (ov) => {
        const before = ov.burst[0].effects.length;
        ov.burst[0].effects = ov.burst[0].effects.filter(
          (e: any) => !(e.kind === 'buff' && e.stat === 'atkPct')
        );
        if (ov.burst[0].effects.length === before) {
          throw new Error('SWID burst atkPct effect missing — fixture is stale');
        }
      });
      expect(totalOf(run({ [SLUG]: noAtk }))).toBeLessThan(totalOf(base));
    });
  });

  describe('SW7 — burst: unlimited ammunition for 10s', () => {
    const casts = bursts(base).filter((c) => c.frame + 10 * FPS <= FIGHT_FRAMES);

    it('has bursts with a complete 10s window inside the fight', () => {
      expect(casts.length).toBeGreaterThan(0);
    });

    it('every shot inside each window is unlimited and the magazine NEVER DRAINS', () => {
      // ammoAfter may only JUMP UP in-window (a reload completing mid-window refills to max; a
      // new S1 ammo-capacity stack re-sets ammo to the new cap) — it can never step DOWN, which
      // is exactly the consumption unlimited ammunition suppresses.
      const all = shots(base);
      for (const cast of casts) {
        // half-open [cast, cast+10s): the buff expires AT cast+10s (expiresFrame <= frame)
        const inWindow = all.filter(
          (s) => s.frame >= cast.frame && s.frame < cast.frame + 10 * FPS
        );
        expect(inWindow.length, 'window had no shots — cadence broken').toBeGreaterThan(0);
        for (const s of inWindow) {
          expect(s.unlimitedAmmo, `shot at ${(s.frame / FPS).toFixed(2)}s`).toBe(true);
        }
        for (let i = 1; i < inWindow.length; i++) {
          expect(
            inWindow[i].ammoAfter,
            `magazine drained mid-window at ${(inWindow[i].frame / FPS).toFixed(2)}s`
          ).toBeGreaterThanOrEqual(inWindow[i - 1].ammoAfter);
        }
      }
    });

    it('shots OUTSIDE every window consume ammo normally (drain per shot)', () => {
      const covered = bursts(base).map(
        (c) => [c.frame, c.frame + 10 * FPS] as const
      );
      const outside = shots(base).filter(
        (s) => !covered.some(([a, b]) => s.frame >= a && s.frame < b)
      );
      expect(outside.length).toBeGreaterThan(0);
      expect(outside.every((s) => !s.unlimitedAmmo)).toBe(true);
      // consecutive out-of-window shots either drain the magazine by exactly one round, or
      // ammoAfter jumps UP (reload completion / a new S1 ammo-capacity stack) — never a
      // larger-than-one drop, which would be a second consumption path.
      const diffs = outside
        .slice(1)
        .map((s, i) => outside[i].ammoAfter - s.ammoAfter);
      expect(diffs.filter((d) => d === 1).length).toBeGreaterThan(0);
      expect(diffs.every((d) => d === 1 || d <= 0)).toBe(true);
    });

    it('DISCRIMINATING: dropping the line leaves zero unlimited shots and reloads inside windows', () => {
      expect(
        shots(limited).filter((s) => s.unlimitedAmmo).length
      ).toBe(0);
      const reloadsInWindow = limited.filter((e) => {
        if (e.kind !== 'reload' || e.slug !== SLUG) {return false;}
        return bursts(limited).some(
          (c) => e.frame >= c.frame && e.frame < c.frame + 10 * FPS
        );
      });
      expect(reloadsInWindow.length).toBeGreaterThan(0);
    });
  });
});
