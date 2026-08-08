// PER-UNIT KIT SPEC — `vesti` (Vesti, Elysion RL Attacker, Water, Burst III, cd 40s, ammo 6,
// reloadFrames 142, chargeFrames 60, chargeMultiplier 250, normalMult 61.3 / coreMult 200,
// critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-08-05; test-first line-by-line spec. Tier 2 encoding
// (two burstCast-keyed escalating usage counters, fullBurstExtend sign, dot cadence,
// burstCast-vs-fullBurstEnter keying).
//
// P0 DISAMBIGUATION: this is BASE `vesti` (RL/Water, resource_id 91) — NOT `vesti-tactical
// -upgrade` (RL/Fire, aka vtu/vestitu). The slug-disambiguation lint flags the shared base
// name (advisory); every artifact keys `characters['vesti']`.
//
// GREENFIELD NOTE: vesti shipped with NO override (simSupported:false) — before this gauntlet
// the unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably
// fails it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.vesti.skills, lvl-10 values):
//   S1 — ■ when performing a Full Charge attack → self:
//        Explosion Radius ▲ 15.01% for 10 sec                              [V1 UNMODELED]
//   S2 "Survival Instinct" — ■ when using Burst Skill → self, effects escalate with the
//   number of times used (each later effect triggers all before it):
//        Once:   ATK ▲ 5.35% for 45 sec                                    [V2a]
//        Twice:  Critical Damage ▲ 22.34% for 45 sec                       [V2b]
//        Thrice: Critical Rate ▲ 15.51% for 45 sec                         [V2c]
//   BU "Justifiable Defense"
//      ■ self: deploys TWO Missile Containers that deal 15.56% of final ATK to the enemy
//        with the lowest remaining HP every 1 sec for 18 sec               [V3]
//      ■ all enemies, effects vary for each Survival Instinct stage (each later effect
//        triggers all before it):
//        SI1: 210.62% of final ATK as additional damage                    [V4a]
//        SI2: 247.25% of final ATK as additional damage                    [V4b]
//        SI3: 302.19% of final ATK as additional damage                    [V4c]
//      ■ all allies: Full Burst Duration ▼ 5 sec                           [V5]
//
// UNMODELED lines (carried VERBATIM in the override's `unmodeled`; reasons here):
//   V1 — "Explosion Radius ▲" has NO stat in the effect schema and is damage-inert vs the
//        single partless scope-lock boss (splash radius moves no damage) — the
//        vesti-tactical-upgrade burst carries the identical residual for the same reason.
//        Nearest-wrong counterfactual: projectileExplosionPct 15.01 — a REAL Damage-Up stat
//        that would silently credit +15% explosion-flavored damage on her charge shots; the
//        V1 group pins its absence.
//
// Encoding (isabel / sin precedents):
//   V2  = ONE `escalating` block on burstCast → self: Nth own cast applies steps 1..N, so
//         cast 1 = ATK only, cast 2 = ATK+CD, cast 3+ = all three. Each step gets a DISTINCT
//         buff key, so the three coexist and SUM once SI3 is reached (45s > 40s CD, so steps
//         never lapse between her casts in a sustained fight).
//   V3  = TWO `dot` blocks (one per container — the prose's plural subject "two Missile
//         Containers that deal 15.56% ... every 1 sec" is the per-container reading; the
//         combined-15.56% alternative is HALF this and is the named counterfactual), each
//         atkPct 15.56 / intervalSec 1 / durationSec 18 → 18 ticks per container at
//         cast+1s..cast+18s (sim.ts dot path: first tick at cast+interval, ticks while
//         frame <= endFrame), landing in the burst bucket with FB-by-landing-timing.
//   V4  = ONE `escalating` block on burstCast → enemy with three flatDamage steps: Nth cast
//         deals steps 1..min(N,3) — cast 1 includes SI1's 210.62 (the SI stage granted by the
//         SAME cast; S2 fires "when using Burst Skill", before the burst damage resolves —
//         skill2-slot blocks dispatch before burst-slot blocks). Burst-cast damage lands
//         BEFORE the Full Burst window opens → never takes the +50% FB major.
//   V5  = fullBurstExtend seconds:-5 on burstCast → allies (isabel's "Full Burst Time ▼ 5
//         sec" encoding, exact precedent). Her OWN window shrinks to 5s; windows opened by
//         another B3 (helm in this fixture) stay 10s. ⚑ rotation blast-radius (net sign of
//         FB shortening in the engine's rotation model) carried from the isabel residual.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   V2  nearest-wrong = INSTANT-MAX (all three stats from cast 1 — patched as three
//       unconditional buff blocks): the critRate buff would apply on ALL casts instead of
//       from the 3rd, and totals move. The per-cast frame pins (buff frames == her burstCast
//       frames, counts casts / casts−1 / casts−2) also kill fullBurstEnter keying (which
//       would fire on ALL ~20s FB entries — liter/crown/helm-cast ones included — roughly
//       doubling the application count) and non-cumulative readings (cast 3 applies all
//       THREE stats on one frame).
//   V3  nearest-wrong = ONE container (18 ticks per deployment instead of 36, half the
//       missile damage — exactly the combined-reading alternative), and the level-1
//       magnitude 9.19. The lattice pins (ticks on the cast+60f lattice, 2 per lattice
//       frame, 18 distinct frames per full window) also kill a wrong interval/duration
//       (e.g. borrowing S1's 10s) and a mis-bucketed encoding (skill bucket).
//   V4  nearest-wrong = INSTANT-MAX riders (all three on cast 1) and the level-1 magnitude
//       124.45. The per-cast multiset pin discriminates the two remaining misreadings
//       WITHOUT a patch: STAGE-ONLY (cast N deals only step N) fails cast 3's all-three
//       multiset, and PRE-CAST STAGE (cast N reads the stage before this cast's SI grant)
//       fails cast 1's [210.62] multiset (it would deal nothing on cast 1).
//   V5  nearest-wrong = the +5 sign flip (15s windows on her casts instead of 5s). The
//       10s pin on helm-opened windows proves the shortening is keyed to HER casts, not a
//       global FB rewrite.
//
// Fixture (deterministic — no seed; event-log over totals): the 720-kit-audit CONTROL COMP
// ['liter','crown','vesti','helm'] — liter (B1, 20s) + crown (B2) open every chain, vesti
// (B3, 40s) and helm (B3, 40s) ALTERNATE the stage-3 slot (each casts every second Full
// Burst ≈ every 40s, so vesti reaches her 3rd cast inside 180s and the SI3 steady state is
// observable). Boss Fire (vesti's ×1.1 Water major), focus vesti.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['liter', 'crown', 'vesti', 'helm'];
const VESTI = 2; // vesti's slot in COMP

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'vesti',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const isEscalating = (b: any) =>
  b.effects.some((e: any) => e.kind === 'escalating');
const isDot = (b: any) => b.effects.some((e: any) => e.kind === 'dot');

/** V3 reference: both missile containers removed (proves the line is live). */
const vestiNoMissiles = withPatchedOverride('vesti', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !isDot(b));
  if (ov.burst.length !== before - 2) {
    throw new Error('vesti burst expected exactly two dot blocks — fixture is stale');
  }
});

/** V3 nearest-wrong: ONE container (the combined-15.56%-per-volley alternative reading). */
const vestiOneContainer = withPatchedOverride('vesti', (ov) => {
  const dots = ov.burst.filter((b: any) => isDot(b));
  if (dots.length !== 2) {
    throw new Error('vesti burst expected exactly two dot blocks — fixture is stale');
  }
  ov.burst = ov.burst.filter((b: any) => b !== dots[1]);
});

/** V3 nearest-wrong: the level-1 magnitude 9.19 instead of 15.56. */
const vestiWrongMissileMag = withPatchedOverride('vesti', (ov) => {
  for (const b of ov.burst.filter((b: any) => isDot(b))) {
    for (const e of b.effects.filter((x: any) => x.kind === 'dot')) {
      e.atkPct = 9.19;
    }
  }
});

/** V2 reference: the whole Survival Instinct escalation removed (proves the buffs are live). */
const vestiNoSiBuffs = withPatchedOverride('vesti', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isEscalating(b));
  if (ov.skill2.length !== before - 1) {
    throw new Error('vesti skill2 expected one escalating block — fixture is stale');
  }
});

/** V2 nearest-wrong (instant-max): all three SI stats from cast 1 (escalation stripped). */
const vestiInstantMaxSi = withPatchedOverride('vesti', (ov) => {
  const b = ov.skill2.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti skill2 escalating block missing — fixture is stale');
  }
  const steps = b.effects.find((e: any) => e.kind === 'escalating').steps;
  ov.skill2 = ov.skill2
    .filter((x: any) => x !== b)
    .concat(
      steps.map((s: any) => ({
        slot: 'skill2',
        trigger: { kind: 'burstCast' },
        target: { kind: 'self' },
        effects: [s],
      }))
    );
});

/** V4 reference: the SI-staged additional-damage riders removed entirely. */
const vestiNoRiders = withPatchedOverride('vesti', (ov) => {
  const b = ov.burst.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti burst escalating rider block missing — fixture is stale');
  }
  ov.burst = ov.burst.filter((x: any) => x !== b);
});

/** V4 nearest-wrong (instant-max): all three riders on every cast, from cast 1. */
const vestiInstantMaxRiders = withPatchedOverride('vesti', (ov) => {
  const b = ov.burst.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti burst escalating rider block missing — fixture is stale');
  }
  const steps = b.effects.find((e: any) => e.kind === 'escalating').steps;
  ov.burst = ov.burst
    .filter((x: any) => x !== b)
    .concat(
      steps.map((s: any) => ({
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'enemy' },
        effects: [s],
      }))
    );
});

/** V4 nearest-wrong: the level-1 magnitude 124.45 instead of 210.62 for step 1. */
const vestiWrongRiderMag = withPatchedOverride('vesti', (ov) => {
  const b = ov.burst.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti burst escalating rider block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.kind === 'escalating').steps[0].atkPct = 124.45;
});

/** V5 nearest-wrong: the +5 sign flip (her windows GROW to 15s). */
const vestiSignFlipFb = withPatchedOverride('vesti', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'fullBurstExtend');
  if (!e) {
    throw new Error('vesti fullBurstExtend effect missing — fixture is stale');
  }
  e.seconds = 5;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noMissiles = run({ vesti: vestiNoMissiles });
const oneContainer = run({ vesti: vestiOneContainer });
const wrongMissileMag = run({ vesti: vestiWrongMissileMag });
const noSiBuffs = run({ vesti: vestiNoSiBuffs });
const instantMaxSi = run({ vesti: vestiInstantMaxSi });
const noRiders = run({ vesti: vestiNoRiders });
const instantMaxRiders = run({ vesti: vestiInstantMaxRiders });
const wrongRiderMag = run({ vesti: vestiWrongRiderMag });
const signFlipFb = run({ vesti: vestiSignFlipFb });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const vestiBursts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'vesti')
    .sort((a, b) => a.frame - b.frame);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart').sort((a, b) => a.frame - b.frame);

const MISSILE_PCT = 15.56;
const RIDER_STEPS = [210.62, 247.25, 302.19];

/** Missile tick damage events: vesti's burst-slot hits at exactly the container magnitude. */
const missiles = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && d.atkPct === MISSILE_PCT
  );

/** Missile-like events at ANY magnitude (counterfactual reads — the kit filter would hide a
 *  wrong magnitude). The burst bucket carries only container ticks + SI riders, so excluding
 *  the three rider steps isolates the missile line. */
const missileAny = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && !RIDER_STEPS.includes(d.atkPct)
  );

/** SI rider damage events: vesti's burst-slot hits at any of the three staged magnitudes. */
const riders = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && RIDER_STEPS.includes(d.atkPct)
  );

/** Rider-like events at ANY magnitude (counterfactual reads) — the burst bucket minus the
 *  container ticks. */
const riderAny = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && d.atkPct !== MISSILE_PCT
  );

/** Group a deployment's tick events off their cast frame (ticks land cast+60f .. cast+1080f). */
const deploymentOf = (hits: Damage[], castFrame: number) =>
  hits.filter((d) => d.frame > castFrame && d.frame <= castFrame + 18 * FPS);

describe('vesti — kit spec', () => {
  it('fixture sanity: advantaged, ≥3 own casts (SI3 reachable), alternating B3 with helm', () => {
    expect(unitOf(base.res, 'vesti').advantaged).toBe(true);
    const casts = unitOf(base.res, 'vesti').burstCasts;
    expect(casts, 'needs ≥3 casts so the SI3 steady state is observable').toBeGreaterThanOrEqual(3);
    expect(unitOf(base.res, 'helm').burstCasts).toBeGreaterThanOrEqual(1);
    expect(base.res.fullBursts).toBeGreaterThanOrEqual(6);
  });

  describe('V2 — Survival Instinct: burst-use escalation of ATK / Crit Damage / Crit Rate (45s each)', () => {
    const casts = vestiBursts(base.events);
    const castFrames = casts.map((c) => c.frame);
    const si = (evs: SimEvent[], stat: string) =>
      buffs(evs)
        .filter((b) => b.casterIdx === VESTI && b.targetIdx === VESTI && b.stat === stat)
        .sort((a, b) => a.frame - b.frame);

    it('SI1 (ATK ▲5.35%) applies on EVERY own burst cast, at the cast frame, for 45s', () => {
      const applied = si(base.events, 'atkPct');
      expect(applied.length).toBe(casts.length);
      expect(applied.map((b) => b.frame)).toEqual(castFrames);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([5.35]);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([45 * FPS]);
    });

    it('SI2 (Crit Damage ▲22.34%) applies from the 2nd cast on, cumulative', () => {
      const applied = si(base.events, 'critDamagePct');
      expect(applied.length).toBe(casts.length - 1);
      expect(applied.map((b) => b.frame)).toEqual(castFrames.slice(1));
      expect([...new Set(applied.map((b) => b.value))]).toEqual([22.34]);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([45 * FPS]);
    });

    it('SI3 (Crit Rate ▲15.51%) applies from the 3rd cast on, cumulative', () => {
      const applied = si(base.events, 'critRatePct');
      expect(applied.length).toBe(casts.length - 2);
      expect(applied.map((b) => b.frame)).toEqual(castFrames.slice(2));
      expect([...new Set(applied.map((b) => b.value))]).toEqual([15.51]);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([45 * FPS]);
    });

    it('is CUMULATIVE: the 3rd cast applies all three stats on one frame', () => {
      expect(casts.length).toBeGreaterThanOrEqual(3);
      const atCast3 = buffs(base.events).filter(
        (b) => b.casterIdx === VESTI && b.frame === castFrames[2]
      );
      expect([...new Set(atCast3.map((b) => b.stat))].sort()).toEqual(
        ['atkPct', 'critDamagePct', 'critRatePct'].sort()
      );
    });

    it('is keyed to HER burstCast (not fullBurstEnter): applications never outnumber her casts', () => {
      // fullBurstEnter keying would fire on every ~20s FB entry (incl. liter/crown/helm-cast
      // ones) — roughly double. The exact-frame pins above already force equality with her
      // cast frames; this pins the COUNT gap vs the ~2x FB cadence explicitly.
      expect(base.res.fullBursts).toBeGreaterThan(casts.length);
      expect(si(base.events, 'atkPct').length).toBe(casts.length);
    });

    it('is damage-RELEVANT: removing the escalation strictly lowers her total', () => {
      expect(base.totals.vesti).toBeGreaterThan(noSiBuffs.totals.vesti);
    });

    it('DISCRIMINATING: instant-max grants Crit Rate on ALL casts (and moves totals)', () => {
      const wrong = si(instantMaxSi.events, 'critRatePct');
      expect(wrong.length).toBe(vestiBursts(instantMaxSi.events).length);
      expect(instantMaxSi.totals).not.toEqual(base.totals);
    });
  });

  describe('V3 — two Missile Containers: 15.56% of final ATK each, every 1s for 18s per cast', () => {
    const casts = vestiBursts(base.events);
    const hits = missiles(base.events);

    it('every deployment ticks on the cast+60f lattice, 2 containers per lattice frame', () => {
      expect(hits.length).toBeGreaterThan(0);
      for (const c of casts) {
        const dep = deploymentOf(hits, c.frame);
        expect(dep.length, `deployment at ${c.frame / FPS}s`).toBeGreaterThan(0);
        // lattice: every tick frame is cast + k*60 (1 <= k <= 18)
        for (const d of dep) {
          expect((d.frame - c.frame) % FPS).toBe(0);
          expect(d.frame - c.frame).toBeGreaterThanOrEqual(FPS);
          expect(d.frame - c.frame).toBeLessThanOrEqual(18 * FPS);
        }
        // exactly TWO container hits per occupied lattice frame
        const perFrame = new Map<number, number>();
        for (const d of dep) {
          perFrame.set(d.frame, (perFrame.get(d.frame) ?? 0) + 1);
        }
        for (const [, n] of perFrame) {
          expect(n, 'two containers fire per volley').toBe(2);
        }
      }
    });

    it('a FULL 18s window produces 18 volleys = 36 hits (first deployment is always complete)', () => {
      const dep = deploymentOf(hits, casts[0].frame);
      expect(dep.length).toBe(36);
      const frames = [...new Set(dep.map((d) => d.frame))].sort((a, b) => a - b);
      expect(frames.length).toBe(18);
      expect(frames[0]).toBe(casts[0].frame + FPS);
      expect(frames[17]).toBe(casts[0].frame + 18 * FPS);
    });

    it('lands in the burst bucket with the kit magnitude, from vesti alone', () => {
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([MISSILE_PCT]);
    });

    it('follows FB-by-landing-timing: ticks inside an FB window take the +50% major', () => {
      // Engine convention for burst-placed dots (sim.ts skillNoFb): no cast-time exemption,
      // FB by landing. Her 5s windows guarantee some ticks land in-FB.
      expect(hits.some((d) => d.fbMajorApplied)).toBe(true);
      expect(hits.every((d) => d.fbMajorApplied === d.inFullBurst)).toBe(true);
    });

    it('is damage-RELEVANT: removing both containers strictly lowers her total', () => {
      expect(base.totals.vesti).toBeGreaterThan(noMissiles.totals.vesti);
    });

    it('DISCRIMINATING: one container halves the volley count; level-1 9.19 is NOT what ships', () => {
      const oneHits = missiles(oneContainer.events);
      const firstDep = deploymentOf(oneHits, vestiBursts(oneContainer.events)[0].frame);
      expect(firstDep.length).toBe(18);
      const perFrame = new Map<number, number>();
      for (const d of firstDep) {
        perFrame.set(d.frame, (perFrame.get(d.frame) ?? 0) + 1);
      }
      for (const [, n] of perFrame) {
        expect(n).toBe(1);
      }
      expect(oneContainer.totals.vesti).toBeLessThan(base.totals.vesti);
      expect([...new Set(missileAny(wrongMissileMag.events).map((d) => d.atkPct))]).toEqual([9.19]);
      expect(wrongMissileMag.totals).not.toEqual(base.totals);
    });
  });

  describe('V4 — SI-staged burst additional damage: cumulative riders incl. the same-cast stage', () => {
    const casts = vestiBursts(base.events);
    const hits = riders(base.events);

    it('cast N deals steps 1..min(N,3) — cast 1 includes SI1 (same-cast stage), cast 3+ all three', () => {
      expect(hits.length).toBeGreaterThan(0);
      casts.forEach((c, i) => {
        const atCast = hits.filter((d) => d.frame === c.frame).map((d) => d.atkPct).sort((a, b) => a - b);
        const expected = RIDER_STEPS.slice(0, Math.min(i + 1, 3)).sort((a, b) => a - b);
        expect(atCast, `cast ${i + 1} riders`).toEqual(expected);
      });
    });

    it('lands in the burst bucket and NEVER takes the +50% FB major (cast resolves before FB opens)', () => {
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
      expect(hits.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('is damage-RELEVANT: removing the riders strictly lowers her total', () => {
      expect(base.totals.vesti).toBeGreaterThan(noRiders.totals.vesti);
    });

    it('DISCRIMINATING: instant-max deals all three on cast 1; level-1 124.45 is NOT what ships', () => {
      const wrongCasts = vestiBursts(instantMaxRiders.events);
      const cast1 = riders(instantMaxRiders.events)
        .filter((d) => d.frame === wrongCasts[0].frame)
        .map((d) => d.atkPct);
      expect(cast1.sort((a, b) => a - b)).toEqual([...RIDER_STEPS].sort((a, b) => a - b));
      expect(instantMaxRiders.totals).not.toEqual(base.totals);
      const wrongMag = riderAny(wrongRiderMag.events).map((d) => d.atkPct);
      expect(wrongMag).toContain(124.45);
      expect(wrongMag).not.toContain(210.62);
    });
  });

  describe('V5 — Full Burst Duration ▼ 5 sec on HER casts (allies), not a global rewrite', () => {
    // PREFB engine convention: the FB window OPENS 22 frames after the B3 cast
    // (FB_PRE_DELAY_FRAMES, frame-measured), so the opener is the last stage-3 burstCast at or
    // before the window start — NOT a same-frame match.
    const openerSlug = (evs: SimEvent[], fbFrame: number): string | null => {
      const prior = evs.filter(
        (e): e is BurstCast => e.kind === 'burstCast' && e.stage === 3 && e.frame <= fbFrame
      );
      return prior.length ? prior[prior.length - 1].slug : null;
    };

    it('every FB window vesti opens lasts exactly 5s; every other window lasts 10s', () => {
      const starts = fbStarts(base.events);
      expect(starts.length).toBeGreaterThanOrEqual(6);
      let vestiOpened = 0;
      for (const s of starts) {
        const dur = s.endFrame - s.frame;
        if (openerSlug(base.events, s.frame) === 'vesti') {
          expect(dur, `vesti-opened FB at ${s.frame / FPS}s`).toBe(5 * FPS);
          vestiOpened++;
        } else {
          expect(dur, `non-vesti FB at ${s.frame / FPS}s`).toBe(10 * FPS);
        }
      }
      expect(vestiOpened).toBeGreaterThanOrEqual(1);
    });

    it('DISCRIMINATING: the +5 sign flip grows her windows to 15s', () => {
      const wrongStarts = fbStarts(signFlipFb.events);
      const herDurations = wrongStarts
        .filter((s) => openerSlug(signFlipFb.events, s.frame) === 'vesti')
        .map((s) => s.endFrame - s.frame);
      expect(herDurations.length).toBeGreaterThanOrEqual(1);
      expect([...new Set(herDurations)]).toEqual([15 * FPS]);
    });
  });

  describe('V1 — Explosion Radius ▲15.01% is faithfully UNMODELED (no radius stat exists)', () => {
    it('ABSENCE CANARY: no projectileExplosionPct application from vesti (the nearest-wrong stat)', () => {
      expect(
        buffs(base.events).filter(
          (b) => b.casterIdx === VESTI && b.stat === 'projectileExplosionPct'
        )
      ).toEqual([]);
    });

    it('no explosion-radius-flavored buff of any kind comes from vesti', () => {
      expect(
        buffs(base.events).filter(
          (b) => b.casterIdx === VESTI && /radius/i.test(b.stat)
        )
      ).toEqual([]);
    });
  });
});
