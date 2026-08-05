// PER-UNIT KIT SPEC — `anchor` (Anchor — the RL/Defender/Wind/Burst-I BASE unit, slug
// `anchor`; NOT anchor-innocent-maid, the RL/Water Supporter Burst-II variant. The
// disambiguation lint fired on the shared base name; resolved explicitly to slug=anchor
// (RL/Wind Defender), 2026-08-05). RL ammo 6, reloadFrames 141, chargeFrames 60,
// hitsPerShot 1, burstCooldownSec 20. Kit-autonomy gauntlet 2026-08-05 (test-first
// independent re-derivation). NOTE: this is a FROM-SCRATCH unit — there was no shipped
// override before this gauntlet (simSupported was false), so the harness cannot even load
// her until src/skills/overrides/anchor.json exists. The override was authored as an EMPTY
// SKELETON first (the "shipped" state these tests run RED against), then the faithful S3
// encoding lands GREEN — every assertion pins a kit line and the nearest-wrong
// counterfactual (withPatchedOverride) it must discriminate against.
//
// Kit (blablalink prose, data/characters.json → characters.anchor.skills), max level:
//   S1 ■ last bullet hits → the target: Taunt for 5 sec.                            [L1 UNMODELED]
//      ■ last bullet hits → self: DEF ▲ 23.82% for 5 sec.                           [A1]
//   S2 ■ battle start → self: when attacking an enemy projectile, damage dealt
//        to that projectile ▲ 25.6% continuously.                                   [L3 UNMODELED ⚑]
//   BU ■ all enemies: 304.45% of final ATK as Burst Skill damage.                   [A2]
//
// Modeling posture (full story lands in the override note at S3):
//   * S1 TAUNT: UNMODELED verbatim — enemy aggro manipulation; the sim has no enemy
//     behaviour model (the scope-lock boss deals no damage and has no targeting) and no
//     taunt primitive exists, so it is offensively inert by construction (the soda
//     1-sec-stun precedent).
//   * S1 DEF GRANT: lastBullet → self defPct 23.82, durationSec 5. defPct is
//     INERT-IN-V1 by engine design (self DEF never feeds own damage — the stat exists for
//     the Endurance-cube channel), so the line is event-pinned, not damage-pinned:
//     once per magazine cycle, magnitude, 5s duration, self scope — plus byte-identical
//     totals when the block is removed. Cadence note: the fixture's liter grants an
//     escalating maxAmmoPct 45.17% team buff on her own casts (5s uptime), so anchor's
//     RL magazine STRETCHES from 6 to 8–9 rounds under it — the pin therefore keys on the
//     engine's `reload` events (one per magazine depletion), not a shots÷6 division.
//   * S2 ANTI-PROJECTILE: UNMODELED verbatim, ⚑ OUT-OF-DOMAIN (engine-core) — the sim
//     fields no enemy-projectile entities (missile interception has no target domain in
//     any encoding the sim can field today), so the +25.6% modifier has nothing to act on.
//     Estimate zero; recipe + tier in the override note/caveats.
//   * BURST NUKE: burstCast → enemy flatDamage 304.45, exactly ONE instance — "Affects
//     all enemies" collapses onto the lone partless scope-lock boss (anis-sparkling-summer
//     / privaty-unkind-maid / soda precedent). burstCast-keyed, so the nuke lands BEFORE
//     the Full Burst window and never takes the +50% major (B1 casts at stage 1; helm H7
//     precedent).
//
// UNMODELED inert lines carry NO assertions (documented here + carried verbatim in the
// override's `unmodeled`): L1 taunt (5 sec), S2 +25.6% damage vs enemy projectiles.
//
// FIXTURES (both deterministic — no seed; event-log over totals):
//   MAIN: liter(B1) / crown(B2) / ada(B3) / anchor(B1), boss Fire (anchor is Wind →
//   neutral; Wind holds an advantage only into Iron), focus ada — the soda fixture:
//   anchor alternates Burst I casts with liter (~40s per anchor cast). ada's 40s CD
//   limits the team to 4 Full Bursts, and anchor happens to cast exactly 4 times — a
//   coincidence that makes burstCast-vs-fullBurstEnter COUNT-indistinguishable here,
//   which is what the dedicated SOLO comp below exists to break.
//   SOLO: anchor(B1) / crown(B2) / ada(B3), focus anchor — anchor is the ONLY B1, so
//   she casts on every ~20s gauge cycle (8 casts) while ada's 40s CD still limits the
//   team to 4 Full Bursts: her OWN-cast-keyed nukes (8) provably outnumber the
//   team-FB-keyed counterfactual (4) — the burstCast-vs-fullBurstEnter discriminator.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { data, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'ada', 'anchor'] as const;
/** MAIN comp slot order: liter 0 / crown 1 / ada 2 / anchor 3. */
const ANCHOR = 3;
/** SOLO comp: anchor is the only B1 (the fullBurstEnter discriminator fixture). */
const SOLO_SLUGS = ['anchor', 'crown', 'ada'] as const;
/** RL magazine size from characters.json (data-driven, not hand-typed). */
const AMMO = data.characters['anchor'].ammo;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}
/** The SOLO-B1 comp (anchor the only B1) — the fullBurstEnter discriminator. */
function runSolo(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SOLO_SLUGS],
    bossElement: 'Fire',
    focusSlug: 'anchor',
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
const anchorShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'anchor');
const anchorCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'anchor');
/** anchor's magazine depletions — one `reload` event per emptied magazine. */
const anchorReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'anchor');
/** anchor's S1 DEF-grant applications. */
const defApplies = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === ANCHOR && b.stat === 'defPct');
/** anchor's burst nukes. */
const anchorNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'anchor' && d.srcSlot === 'burst');

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) ----------
// PHASE-AWARE GUARD: anchor is FROM-SCRATCH — the RED phase runs against the empty skeleton,
// where there is no block to patch and a counterfactual is (correctly) identical to shipped.
// The helpers therefore throw only when the slot is NON-EMPTY but the block is absent (a
// genuinely stale fixture), and pass through on the empty skeleton (soda/quiry precedent).
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

/** A1 isolation: S1 removed entirely — the DEF grant is damage-inert, so totals must not move. */
const anchorNoS1 = withPatchedOverride('anchor', (ov) => {
  ov.skill1 = [];
});
/** A1 counterfactual: the DEF grant keyed to EVERY shot (shotFired) instead of the magazine's
 *  last bullet — applies ~6× as often. */
const anchorShotFiredS1 = withPatchedOverride('anchor', (ov) => {
  mutateBlock(
    ov,
    'skill1',
    (x: any) => x.effects.some((e: any) => e.stat === 'defPct'),
    (b: any) => {
      b.trigger = { kind: 'shotFired' };
    },
    'anchor S1 defPct block'
  );
});
/** A2 counterfactual: the nuke re-keyed to fullBurstEnter — fires on EVERY team Full Burst
 *  (liter also casts B1), not on anchor's own casts. */
const anchorFbEnterNuke = withPatchedOverride('anchor', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.kind === 'flatDamage'),
    (b: any) => {
      b.trigger = { kind: 'fullBurstEnter' };
    },
    'anchor burst nuke block'
  );
});
/** A2 counterfactual: the "Affects all enemies" misread as DOUBLE damage on the lone boss —
 *  a second identical nuke block. */
const anchorDoubledNuke = withPatchedOverride('anchor', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (b) {
    ov.burst.push(JSON.parse(JSON.stringify(b)));
    return;
  }
  if (ov.burst.length > 0) {
    throw new Error('anchor burst nuke block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1 = run({ anchor: anchorNoS1 });
const shotFiredS1 = run({ anchor: anchorShotFiredS1 });
const doubledNuke = run({ anchor: anchorDoubledNuke });
/** SOLO-B1 pair — the burstCast-vs-fullBurstEnter discriminator (see FIXTURES). */
const soloBase = runSolo();
const soloFbEnter = runSolo({ anchor: anchorFbEnterNuke });

// ---- derived (base-run) quantities -------------------------------------------------------------
const SHOT_COUNT = anchorShots(base.events).length;
const CAST_COUNT = anchorCasts(base.events).length;

describe('anchor — kit spec', () => {
  it('fixture sanity: anchor empties RL magazines and alternates Burst I casts with liter', () => {
    expect(SHOT_COUNT).toBeGreaterThan(2 * AMMO); // ≥3 magazine depletions
    expect(CAST_COUNT).toBeGreaterThanOrEqual(3);
  });

  describe('A1 — S1: last bullet hits → self DEF ▲23.82% for 5 sec', () => {
    const applied = defApplies(base.events);
    const RELOAD_COUNT = anchorReloads(base.events).length;

    it('fires once per magazine depletion — one application per reload, not per shot', () => {
      // liter's escalating maxAmmoPct stretches her magazine 6 → 8–9 rounds during its 5s
      // uptime, so shots÷ammo is NOT the cycle count; the engine's `reload` events are the
      // one-per-depletion marker.
      expect(applied.length).toBeGreaterThan(0);
      expect(RELOAD_COUNT).toBeGreaterThan(0);
      expect(applied.length).toBe(RELOAD_COUNT);
      expect(applied.length).toBeLessThan(SHOT_COUNT);
    });

    it('is 23.82% for 5 sec, held by anchor alone (self-scoped)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([23.82]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ANCHOR]);
    });

    it("is damage-INERT (defPct is inert-in-v1): removing S1 moves NO unit's total", () => {
      expect(base.totals).toEqual(noS1.totals);
    });

    it('DISCRIMINATING: a shotFired-keyed buff applies on every pull, not per magazine', () => {
      const cf = defApplies(shotFiredS1.events);
      expect(cf.length).toBe(SHOT_COUNT);
      expect(cf.length).toBeGreaterThan(applied.length);
    });
  });

  describe('A2 — burst: 304.45% of final ATK to all enemies, once per own cast, before FB', () => {
    const nukes = anchorNukes(base.events);

    it('fires once per anchor burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(CAST_COUNT);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([304.45]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
      expect([...new Set(nukes.map((d) => d.inFullBurst))]).toEqual([false]);
    });

    it('DISCRIMINATING (SOLO comp): burstCast-keyed fires on HER stalled-cycle casts too — fullBurstEnter-keyed only on team FBs', () => {
      // In the MAIN fixture anchor's 4 casts coincide with the 4 team Full Bursts (ada's
      // 40s CD limits both), so the two keyings are count-indistinguishable there. In the
      // SOLO comp anchor is the ONLY B1: she casts on every ~20s gauge cycle (8 casts) but
      // the team still only completes 4 Full Bursts — the keyings split 8-vs-4.
      const own = anchorNukes(soloBase.events);
      const cf = anchorNukes(soloFbEnter.events);
      const soloCasts = anchorCasts(soloBase.events).length;
      expect(soloCasts).toBeGreaterThan(4); // her casts outrun the FB windows
      expect(own.length).toBe(soloCasts); // burstCast-keyed: one nuke per own cast
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.length).toBeLessThan(own.length); // fullBurstEnter-keyed: one per team FB
    });

    it('DISCRIMINATING: "all enemies" is ONE instance on the lone boss — a doubled block doubles the hits', () => {
      const cf = anchorNukes(doubledNuke.events);
      expect(cf.length).toBe(2 * CAST_COUNT);
    });
  });
});
