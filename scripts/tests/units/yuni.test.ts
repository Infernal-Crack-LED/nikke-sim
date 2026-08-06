// PER-UNIT KIT SPEC — `yuni` (Yuni — RL / Defender / Fire / Burst II, cd 20s, ammo 6,
// reloadFrames 141, chargeFrames 90, chargeMult 350, normalMult 61.3, SSR).
// Kit-autonomy gauntlet 2026-08-05 (test-first re-derivation).
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/yuni.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates
// exactly as a verification gauntlet would (mica/jackal precedent).
//
// Kit (blablalink prose, data/characters.json → characters.yuni.skills, lvl 10):
//   S1 ■ entering Full Burst → all allies:
//        Charge Speed ▲8.97% for 10 sec                                     [FAITHFUL — Y1]
//   S2 ■ attacking with Full Charge → all allies (RL always full-charges):
//        DEF ▲2.77% for 10 sec                                    [FAITHFUL-INERT — Y3]
//        Restores 2.77% of attack damage as HP over 10 sec                  [FAITHFUL — Y5]
//        Max Ammunition Capacity ▲1 round(s) for 5 sec                      [FAITHFUL — Y4]
//   BU ■ enemies within attack range (Burst II, cd 20s):
//        348.73% of final ATK as damage                                     [FAITHFUL — Y6]
//        Immobilizes the target(s) for 5 sec                              [UNMODELED — Y7]
//
// Yuni is a fire-element B2 DEFENDER. Her kit splits into four families:
//
//   • Y1 (S1) is a team charge-speed window keyed to FULL BURST ENTRY (never burstCast):
//     the FB window opens AFTER the casts land (probe 2026-08-05: stage casts precede
//     fullBurstStart by 22–52 frames; fullBurstEnter buffs apply exactly ON the
//     fullBurstStart frame), so the burstCast mis-keying moves every application off the
//     window frames — and chargeSpeedPct is the SUBTRACTIVE engine formula (sim.ts:
//     needed = round(chargeFrames×(1−cs/100)); anis-star precedent), so 8.97 shortens
//     her 90f RL charge to 82f and every charge-weapon ally's cadence in-window.
//   • Y2–Y5 (S2) fire on EVERY FULL-CHARGE ATTACK — for an RL that is every pull
//     (shotFired; helm/cinderella precedent: the full-charge rider keyed per shot because
//     RL/SR always full-charge). One block, three effects on the same activation frames:
//       – defPct 2.77/10s: FAITHFUL but damage-INERT in v1 (mica M5 / novel / poli
//         precedent — self/ally DEF never feeds damage dealt; byte-identical removal is
//         pinned, and the atkPct misread moves totals).
//       – heal (2.77% of attack damage OVER 10 SEC): the engine models no HP amount — a
//         heal emits recovery events to its targets (helm H8 precedent: the window's only
//         observable is on-recovery CONSUMER behaviour). "over 10 sec" = ticks:10 at 1s
//         (the helm burst-heal encoding); the tick CADENCE inside the window is an
//         approximation — only the window LENGTH and consumer refresh across it are
//         kit-literal. Observed in a dedicated fixture B through crown's "when recovery
//         takes effect" block (attackDamagePct 20.99), with crown's OWN hitCount heal
//         patched out (helm-test isolation) — fixture B cannot test burst-cast behaviour
//         anyway: crown (B2) wins every stage-2 slot, so yuni casts zero bursts there
//         (B2 starvation, rupee 2026-08-04) — which is exactly what makes the
//         burst-keyed-heal counterfactual starve to ~zero while the shot-keyed shipped
//         model keeps recovery firing all fight.
//       – maxAmmoFlat 1/5s: the theme-14 FLAT-round primitive (mica M4 precedent):
//         '▲ 1 round(s)' is a MAGNITUDE in flat rounds, NOT a percent and NOT a
//         durationShots round-count; maxAmmo() = round(base×(1+pct/100)) + flat, so the
//         nearest-wrong maxAmmoPct 1 computes round(6×1.01) = 6 and silently never
//         extends a magazine. LOAD-BEARING weapon-state modifier (hard rule 1 / prior 9):
//         extended magazines → fewer reloads → more firing uptime for the holders.
//   • Y6 (burst damage) is a standard burstCast flatDamage nuke (mica M6 / harran / milk
//     precedent): her OWN cast, never fullBurstEnter — as the SOLE B2 of fixture A she
//     casts every Full Burst so both keyings fire equal COUNTS; the discrimination is
//     TIMING: the cast lands BEFORE the Full Burst window opens, so the nuke never takes
//     the +50% FB major. 'Enemies within attack range' collapses to the single partless
//     boss.
//   • Y7 (burst Immobilize) has NO engine channel: the v1 boss never acts, so a
//     boss-targeted CC moves nothing — UNMODELED + ⚑ (the mica M7 / himeno precedent for
//     enemy-targeted lines the engine cannot consume). The nearest-wrong model is
//     laundering the CC into a boss damageTakenPct debuff (a different mechanic the kit
//     never grants — the boss taking MORE damage); the ABSENCE pins prove the shipped
//     override is not that model.
//
// Fixture A (everything burst-related): liter / yuni / ada / helm, forced-neutral boss
// (null), camera focus yuni (RL is a charge weapon ⇒ ×2.5 burst gauge). yuni is the SOLE
// B2 (20s CD covers stage II alone; liter B1 20s; ada + helm B3 40s alternate), so she
// casts every Full Burst — the B2-starvation trap (rupee 2026-08-04: a B2 unit under test
// seated beside crown casts ZERO bursts) is avoided by NOT fielding crown here. Ammo-pin
// holders are yuni/helm (ammo-6 charge weapons with clean magazine structure); liter's
// SMG holds 120 rounds (+1 is invisible for her) and ada's burst weaponSwap phase
// dominates her firing (12–17-shot swap magazines) — both are asserted only as buff
// HOLDERS. Boss-debuff hygiene: liter's blocks are ally buffs/CDR, ada's enemy blocks are
// DoTs and helm's are flatDamage (damage events, not buffs) — so ANY boss-held buffApply
// in fixture A would be a laundering of the Y7 line.
//
// Fixture B (the heal window only): liter / crown / yuni / ada, forced-neutral boss,
// crown's own hitCount self-heal patched out (crownNoHeal, helm-test precedent). liter
// has no heal effects (verified: her blocks are buffs/burstCdr only) and neither does
// ada, so every recovery firing in this fixture is attributable to yuni's S2 heal.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;

// ---- fixtures ---------------------------------------------------------------------------------
/** Fixture A: burst + buffs + ammo. Slot order: liter 0 / yuni 1 / ada 2 / helm 3. */
const A_SLUGS = ['liter', 'yuni', 'ada', 'helm'] as const;
const YUNI = 1;
/** Fixture B: heal-window isolation. Slot order: liter 0 / crown 1 / yuni 2 / ada 3. */
const B_SLUGS = ['liter', 'crown', 'yuni', 'ada'] as const;
const CROWN = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...A_SLUGS],
    bossElement: null,
    focusSlug: 'yuni',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
function runB(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...B_SLUGS],
    bossElement: null,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  A_SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** Y1 reference: S1 removed entirely. */
const y1NoS1 = withPatchedOverride('yuni', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = [];
  if (before === 0) {
    throw new Error('yuni skill1 blocks missing — fixture is stale');
  }
});
/** Y1 wrong trigger: burstCast (lands on her cast frame, BEFORE the FB window opens)
 *  instead of fullBurstEnter (lands exactly on the fullBurstStart frame). */
const y1OnBurstCast = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill1) {
    b.trigger = { kind: 'burstCast' };
  }
});
/** Y1 wrong scope: self only instead of all allies. */
const y1SelfOnly = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill1) {
    b.target = { kind: 'self' };
  }
});
/** Y2 wrong trigger cadence: S2 keyed to her OWN burst casts instead of every
 *  full-charge pull. */
const y2OnBurst = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill2) {
    b.trigger = { kind: 'burstCast' };
  }
});
/** Y3 nearest-wrong misread: the S2 DEF grant as an OFFENSIVE atkPct buff (would move
 *  every holder's damage — defPct is the inert-by-construction stat). */
const y3AtkMisread = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'defPct') {
        e.stat = 'atkPct';
      }
    }
  }
});
/** Y3 reference: ONLY the defPct effect removed (ammo + heal stay — isolates the inertia
 *  of the DEF half). */
const y3DefRemoved = withPatchedOverride('yuni', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'defPct');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('yuni S2 defPct effect missing — fixture is stale');
  }
});
/** Y4 nearest-wrong magnitude encoding: the flat-round line as a percent (maxAmmoPct 1 →
 *  round(6×1.01) = 6 — never extends a magazine). */
const y4AmmoPct = withPatchedOverride('yuni', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'maxAmmoFlat');
  if (!e) {
    throw new Error('yuni S2 maxAmmoFlat effect missing — fixture is stale');
  }
  e.stat = 'maxAmmoPct';
});
/** Y4 reference: the whole S2 removed (functional baseline). */
const y4NoS2 = withPatchedOverride('yuni', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('yuni skill2 blocks missing — fixture is stale');
  }
});
/** Y5 reference: ONLY the heal effect removed (fixture B — zero recovery firings must
 *  remain, proving every firing is attributable to yuni's S2 heal). */
const y5NoHeal = withPatchedOverride('yuni', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('yuni S2 heal effect missing — fixture is stale');
  }
});
/** Y5 isolation: crown's own hitCount self-heal removed so every recovery firing in
 *  fixture B is yuni's (helm-test precedent). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  let removed = 0;
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot]) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      removed += before - b.effects.length;
    }
  }
  if (removed === 0) {
    throw new Error('crown heal block missing — fixture is stale');
  }
});
/** Y6 wrong magnitude: the lvl-1 value 172.4 instead of the lvl-10 348.73. */
const y6Weak = withPatchedOverride('yuni', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('yuni burst flatDamage block missing — fixture is stale');
  }
  e.atkPct = 172.4;
});
/** Y6 wrong trigger: fullBurstEnter (lands INSIDE the +50% major) instead of burstCast
 *  (lands on yuni's OWN cast frame, before the window opens). */
const y6OnFbEnter = withPatchedOverride('yuni', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!block) {
    throw new Error('yuni burst flatDamage block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** Y6 reference: the burst nuke removed (functional baseline). */
const y6NoBurst = withPatchedOverride('yuni', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('yuni burst flatDamage block missing — fixture is stale');
  }
});
/** Y7 the laundering mis-model: the burst Immobilize rewritten as a boss damageTakenPct
 *  debuff (a different mechanic the kit never grants — the boss taking MORE damage). */
const y7Laundered = withPatchedOverride('yuni', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 25, durationSec: 5 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runA();
const noS1 = runA({ yuni: y1NoS1 });
const onBurstCast = runA({ yuni: y1OnBurstCast });
const selfOnly = runA({ yuni: y1SelfOnly });
const s2OnBurst = runA({ yuni: y2OnBurst });
const atkMisread = runA({ yuni: y3AtkMisread });
const defRemoved = runA({ yuni: y3DefRemoved });
const ammoPct = runA({ yuni: y4AmmoPct });
const noS2 = runA({ yuni: y4NoS2 });
const weak = runA({ yuni: y6Weak });
const onFbEnter = runA({ yuni: y6OnFbEnter });
const noBurst = runA({ yuni: y6NoBurst });
const laundered = runA({ yuni: y7Laundered });
// Fixture B (heal isolation — crown's own heal patched out in EVERY run).
const healBase = runB({ crown: crownNoHeal });
const healNone = runB({ yuni: y5NoHeal, crown: crownNoHeal });
const healOnBurst = runB({ yuni: y2OnBurst, crown: crownNoHeal });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yuniBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === YUNI && b.stat === stat);
const yuniBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yuni');
const yuniShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'yuni');
const yuniNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'yuni' && e.bucket === 'burst'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const bossBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.targetIdx === null);

/** Group a unit's shots by magazine ordinal. */
function byMag(evs: SimEvent[], slug: string): Map<number, Shot[]> {
  const m = new Map<number, Shot[]>();
  for (const s of
    evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug)) {
    (m.get(s.magIndex) ?? m.set(s.magIndex, []).get(s.magIndex)!).push(s);
  }
  return m;
}
/** ammoAfter of each magazine's FIRST shot — the refill size minus one. */
const firstShotAmmoAfter = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss[0].ammoAfter);
const magSizes = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss.length);

/** Per-firing holder sets for one of yuni's buff channels. */
function holdersByFrame(applied: BuffApply[]): Map<number, Set<number | null>> {
  const perFrame = new Map<number, Set<number | null>>();
  for (const b of applied) {
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** Fixture B: frames on which crown's recovery-triggered team buff fired (distinct
 *  frames — one firing = one frame even though the block targets all allies). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

describe('yuni — kit spec', () => {
  describe('fixture sanity — the B2 chain actually runs without crown', () => {
    it('yuni is the sole B2 of fixture A and casts every Full Burst (>= 6 casts / 180s)', () => {
      expect(yuniBursts(base.events).length).toBeGreaterThanOrEqual(6);
    });
    it('her RL weapon deals damage', () => {
      expect(base.totals.yuni).toBeGreaterThan(0);
    });
  });

  describe('Y1 — S1 team Charge Speed ▲8.97% for 10s on FULL BURST ENTRY', () => {
    const applied = yuniBuffs(base.events, 'chargeSpeedPct');

    it('is 8.97% for exactly 10s, reaching all four allies at every firing', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([8.97]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      for (const [, holders] of holdersByFrame(applied)) {
        expect(holders.size, 'S1 targets ALL allies, including herself').toBe(
          A_SLUGS.length
        );
      }
    });

    it('applies exactly on the Full Burst window start frames (fullBurstEnter, not burstCast)', () => {
      const starts = new Set(fbStarts(base.events));
      const frames = new Set(applied.map((b) => b.frame));
      expect(starts.size).toBeGreaterThan(0);
      expect(frames).toEqual(starts);
    });

    it('FUNCTIONAL: removing S1 changes team totals (charge-speed shortens every charge-weapon pull in-window)', () => {
      expect(sum(noS1.totals)).not.toEqual(sum(base.totals));
    });

    it('is a TIMING channel, not a damage bucket: no per-shot magnitude moves without it', () => {
      // Nearest-wrong family (S2b reviewer): folding Charge Speed into a charge-damage stat
      // (chargeDamagePct) would move per-shot multipliers. chargeSpeedPct must change only
      // shot SPACING — the set of kit magnitudes on her weapon hits (RL charge shots ride
      // the normal bucket, charge multiplier in mult) stays identical.
      const mags = (evs: SimEvent[]) =>
        [
          ...new Set(
            evs
              .filter(
                (e): e is Damage =>
                  e.kind === 'damage' && e.slug === 'yuni' && e.bucket === 'normal'
              )
              .map((d) => d.atkPct)
          ),
        ].sort((a, b) => a - b);
      expect(mags(noS1.events)).toEqual(mags(base.events));
    });

    it('DISCRIMINATING: the burstCast mis-keying lands every application OFF the window frames', () => {
      const misapplied = yuniBuffs(onBurstCast.events, 'chargeSpeedPct');
      expect(misapplied.length).toBeGreaterThan(0);
      const starts = new Set(fbStarts(onBurstCast.events));
      expect(
        misapplied.filter((b) => starts.has(b.frame)),
        'burstCast applications land on her cast frames, before the window opens'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the self-only mis-scope reaches exactly one holder per firing', () => {
      const selfApplied = yuniBuffs(selfOnly.events, 'chargeSpeedPct');
      expect(selfApplied.length).toBeGreaterThan(0);
      for (const [, holders] of holdersByFrame(selfApplied)) {
        expect(holders).toEqual(new Set([YUNI]));
      }
    });
  });

  describe('Y2 — S2 fires on EVERY FULL-CHARGE PULL (RL always full-charges)', () => {
    const shotFrames = new Set(yuniShots(base.events).map((s) => s.frame));
    const s2Frames = new Set(
      yuniBuffs(base.events, 'maxAmmoFlat').map((b) => b.frame)
    );

    it('activates once per yuni shot — the S2 frames ARE her shot frames', () => {
      expect(shotFrames.size).toBeGreaterThanOrEqual(60);
      expect(s2Frames).toEqual(shotFrames);
    });

    it('DISCRIMINATING: a burst-keyed S2 fires ~once per rotation, not once per pull', () => {
      const burstKeyed = new Set(
        yuniBuffs(s2OnBurst.events, 'maxAmmoFlat').map((b) => b.frame)
      );
      expect(burstKeyed.size).toBeGreaterThan(0);
      expect(burstKeyed.size * 5).toBeLessThan(shotFrames.size);
    });
  });

  describe('Y3 — S2 DEF ▲2.77% for 10s rides the same block, inert in v1', () => {
    const ammoFrames = new Set(
      yuniBuffs(base.events, 'maxAmmoFlat').map((b) => b.frame)
    );
    const applied = yuniBuffs(base.events, 'defPct');

    it('shares one activation with the ammo line (one block, three effects), magnitude 2.77, 10s', () => {
      expect(
        new Set(applied.map((b) => b.frame)),
        'DEF and ammo must fire on identical frames'
      ).toEqual(ammoFrames);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.77]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      expect(sum(atkMisread.totals)).not.toEqual(sum(base.totals));
      for (const s of A_SLUGS) {
        expect(
          defRemoved.totals[s],
          `${s} total with the DEF half removed`
        ).toEqual(base.totals[s]);
      }
    });
  });

  describe('Y4 — Max Ammunition Capacity ▲1 round for 5s (FLAT, not percent)', () => {
    const applied = yuniBuffs(base.events, 'maxAmmoFlat');

    it('carries the flat-round magnitude 1 with a 5s window, reaching all four allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([1]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(
          b.durationShots,
          "'1 round(s)' is the AMOUNT — 'for 5 sec' is the duration; no round-count expiry"
        ).toBeNull();
      }
      for (const [, holders] of holdersByFrame(applied)) {
        expect(holders.size).toBe(A_SLUGS.length);
      }
    });

    it('FUNCTIONAL: in-window refills load exactly 6 + 1 rounds for the ammo-6 holders', () => {
      // ada is deliberately EXCLUDED from the magazine-shape pins: her burst weaponSwap
      // phase dominates her firing (12–17-shot swap magazines with in-magazine refills),
      // so a normal-weapon 7-round magazine almost never completes for her. She still
      // RECEIVES the grant — the holder-reach assertion above pins all four allies.
      for (const holder of ['yuni', 'helm']) {
        const firsts = firstShotAmmoAfter(base.events, holder);
        expect(
          firsts.filter((n) => n === 6).length,
          `${holder} first-shot ammoAfter ${JSON.stringify(firsts)} — expected at least one 6+1 refill`
        ).toBeGreaterThanOrEqual(1);
        expect(
          magSizes(base.events, holder).filter((n) => n === 7).length,
          `${holder} must fire a 7-round magazine after the 6+1 refill`
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('DISCRIMINATING: maxAmmoPct 1 computes round(6×1.01) = 6 — no extension ever happens', () => {
      for (const holder of ['yuni', 'helm']) {
        expect(
          firstShotAmmoAfter(ammoPct.events, holder),
          `the percent-only model never produces ${holder} first-shot ammoAfter 6`
        ).not.toContain(6);
        expect(
          magSizes(ammoPct.events, holder),
          `the percent-only model never extends ${holder} to 7 rounds`
        ).not.toContain(7);
        expect(
          firstShotAmmoAfter(noS2.events, holder),
          `with S2 removed, no 6+1 refill exists for ${holder} either`
        ).not.toContain(6);
      }
    });

    it('FUNCTIONAL: the extended magazines lift the ammo-6 holders’ totals vs S2 removed', () => {
      // More rounds per magazine → fewer reloads → more firing uptime. The S2 defPct half
      // is inert (Y3) and the heal half is invisible in fixture A (no recovery consumer),
      // so the delta is the ammo channel alone. ada is excluded (weaponSwap phase
      // dominates her damage; her normal-weapon extension is marginal by comparison).
      expect(base.totals.yuni).toBeGreaterThan(noS2.totals.yuni);
      expect(base.totals.helm).toBeGreaterThan(noS2.totals.helm);
    });
  });

  describe('Y5 — S2 recovers 2.77% of attack damage as HP OVER 10 SEC (a recovery window per pull)', () => {
    // The engine models no HP amount — a heal emits recovery events to its targets, and
    // the window's only observable is on-recovery CONSUMER behaviour (helm H8 precedent).
    // Fixture B observes through crown's "when recovery takes effect" block with crown's
    // OWN hitCount heal patched out; liter/ada carry no heal effects, so every recovery
    // firing is attributable to yuni's S2 line. NOTE: crown (B2) wins every stage-2 slot
    // in this fixture, so yuni casts ZERO bursts here (B2 starvation) — that is exactly
    // what starves the burst-keyed counterfactual below.
    const frames = recoveryFrames(healBase.events);
    const firstShot = yuniShots(healBase.events)[0]?.frame ?? Infinity;

    it('keeps recovery firing across the whole fight once her pulls begin', () => {
      expect(frames.length).toBeGreaterThan(0);
      expect(
        frames[0],
        'the first recovery cannot precede her first full-charge hit'
      ).toBeGreaterThanOrEqual(firstShot);
      expect(frames[0]).toBeLessThanOrEqual(firstShot + 2);
      const span = frames[frames.length - 1] - frames[0];
      expect(
        span,
        `recovery span ${span / FPS}s — overlapping per-pull 10s windows must cover most of the fight`
      ).toBeGreaterThanOrEqual(0.8 * (FIGHT_FRAMES - firstShot));
      expect(
        frames.length,
        'overlapping 10-tick windows fire far more often than the pulls that seed them'
      ).toBeGreaterThan(yuniShots(healBase.events).length);
    });

    it('is ATTRIBUTABLE: removing ONLY the heal effect zeroes every recovery firing', () => {
      expect(recoveryFrames(healNone.events)).toHaveLength(0);
    });

    it('DISCRIMINATING: a burst-keyed heal starves (yuni casts zero bursts beside crown)', () => {
      expect(yuniBursts(healOnBurst.events)).toHaveLength(0);
      expect(recoveryFrames(healOnBurst.events)).toHaveLength(0);
    });
  });

  describe('Y6 — burst nuke: 348.73% of final ATK to enemies in range, on her OWN cast', () => {
    const casts = yuniBursts(base.events);
    const nukes = yuniNukes(base.events);

    it('fires once per yuni burst cast, at the kit magnitude, in the burst bucket', () => {
      expect(casts.length).toBeGreaterThanOrEqual(6);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([348.73]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('lands on her own cast frames and never takes the +50% Full Burst major', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const d of nukes) {
        expect(castFrames.has(d.frame), 'nuke frame must be a cast frame').toBe(
          true
        );
      }
      expect(
        nukes.filter((d) => d.fbMajorApplied),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the lvl-1 magnitude 172.4 changes every nuke', () => {
      expect([...new Set(yuniNukes(weak.events).map((d) => d.atkPct))]).toEqual(
        [172.4]
      );
    });

    it('DISCRIMINATING: fullBurstEnter keying lands INSIDE the FB window (+50% major) off the cast frames', () => {
      const fbNukes = yuniNukes(onFbEnter.events);
      expect(fbNukes.length).toBeGreaterThan(0);
      expect(
        fbNukes.every((d) => d.fbMajorApplied),
        'fullBurstEnter nukes must take the FB major'
      ).toBe(true);
      const castFrames = new Set(
        yuniBursts(onFbEnter.events).map((c) => c.frame)
      );
      expect(
        fbNukes.filter((d) => castFrames.has(d.frame)),
        'fullBurstEnter applications must land off her cast frames'
      ).toEqual([]);
      expect(sum(onFbEnter.totals)).not.toEqual(sum(base.totals));
    });

    it('FUNCTIONAL: removing the nuke erases every burst-bucket hit and lowers her total', () => {
      expect(yuniNukes(noBurst.events)).toHaveLength(0);
      expect(base.totals.yuni).toBeGreaterThan(noBurst.totals.yuni);
    });
  });

  describe('Y7 — burst Immobilize-for-5s is genuinely unmodeled (the boss never acts)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride('yuni') as any;
      expect(ov.unmodeled.burst.join('\n')).toContain(
        'Immobilizes the target(s) for 5 sec.'
      );
    });

    it('enacts NOTHING: no boss-held debuff anywhere (CC is dropped, not laundered)', () => {
      // Boss debuffs emit with targetIdx null. Fixture mates cannot produce one: liter's
      // blocks are ally buffs/CDR, ada's enemy blocks are DoTs and helm's are flatDamage
      // (damage events, not buffs) — so ANY boss-held buffApply would be a laundering of
      // the Immobilize line.
      expect(bossBuffs(base.events)).toHaveLength(0);
    });

    it('the omission is a choice: the damageTakenPct laundering counterfactual emits boss debuffs and lifts team totals', () => {
      expect(bossBuffs(laundered.events).length).toBeGreaterThan(0);
      expect(sum(laundered.totals)).not.toEqual(sum(base.totals));
    });
  });
});
