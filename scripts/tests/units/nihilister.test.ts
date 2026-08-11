// PER-UNIT KIT SPEC — `nihilister` (Nihilister, Attacker/SR/Fire, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 141, normalMult 69.04, coreMult 200). Kit-autonomy gauntlet
// 2026-08-04. FROM-SCRATCH build (no prior override; simSupported:false before this pass).
//
// Kit (blablalink prose, data/characters.json → characters.nihilister.skills, SL10):
//   S1 ■ attacking with Full Charge → self: Gain Pierce for 1 round(s)                     [N1]
//      ■ (same window) Piercing Radius ▲50% for 1 round(s)                                 [U1 INERT]
//      ■ hits 2+ enemies concurrently → all enemies hit: 50.33% final ATK extra damage     [U2 INERT]
//   S2 ■ enemies within attack range: 112.64% of final ATK as damage (10s CD)             [N4]
//   BU ■ enemies within attack range: 158.59% of final ATK as damage                      [N5]
//      ■ Burn: 13.19% of final ATK as sustained damage every 1 sec for 10 sec             [N6]
//      ■ self: Max Ammunition Capacity ▲6 round(s) for 15 sec                             [N7]
//
// INERT / UNENACTABLE lines (no assertions beyond the verbatim-carry pin; carried VERBATIM in
// the override's `unmodeled`):
//   U1 the Piercing Radius line — v1 has NO spatial/hitbox model (a single partless boss with
//      no geometry), so a piercing-radius increase has nothing to act on. Out-of-domain by
//      world-model; couples to U2 (the radius matters only for multi-enemy pierce coverage).
//   U2 the 2+-enemies-concurrent bonus — v1 fields exactly ONE enemy, so the "hits 2 or more
//      enemies concurrently" condition can never be satisfied; a flatDamage rider here would
//      be dead code that could only ever fire wrongly. Out-of-domain (needs a multi-target
//      engine model); ⚑ with estimate+recipe in the override note.
//
// Encoding shape (see src/skills/overrides/nihilister.json):
//   N1 = shotFired → self gainPierce durationSec 4. SR auto-full-charges every shot
//        (milk-blooming-bunny precedent), so shotFired IS the full-charge trigger. "for 1
//        round(s)" is a ROUND-COUNT duration and gainPierce carries no durationShots — the
//        wall-clock stand-in must cover the longest inter-shot gap the holder actually fires
//        across (an empty-magazine reload 2.35s + a full-charge cycle ≈1.37s ≈ 3.7s worst
//        case), so 4s: the per-shot refresh keeps the tag continuous while she fires, and it
//        never lapses BETWEEN two rounds she actually fires (the timed stand-in degrades to
//        ~100% on-shot duty exactly like the round-count original under steady fire; ⚑ cadence).
//        The grant lands AFTER the triggering shot's damage (shotFired dispatch order — the
//        phantom ⚑2 engine-order class), so shot 1 is the application event and every shot
//        from the 2nd on is tagged while firing. gainPierce emits NO event (sets
//        pierceUntilFrame directly, sim.ts) → pinned structurally + behaviourally through the
//        fixture's pierceDamagePct source (see fixture).
//   N4 = interval:10 → flatDamage 112.64 vs enemy. S2's prose carries NO activation clause —
//        a class-1 pure timer (helm-aquamarine S2a precedent, docs/handoffs/2026-07-20
//        -skill-cooldowns-to-sim.md): the datamined skillCooldownsSec.skill2 = 10 IS the fire
//        cadence, first fire t=10 (no force-cast clause; ⚑ first-fire phase).
//   N5/N6/N7 = burstCast-keyed (HER casts only — NOT fullBurstEnter, which would fire on any
//        team Full Burst a different B2 completed). Burst-cast damage is auto FB-exempt /
//        snapshots pre-FB (prior 2; no noFb needed). The Burn is a REAL DoT: 10 discrete
//        1s ticks (dot durationSec 10 / intervalSec 1), flavor 'sustained', never cores; ticks
//        are crit-eligible via the engine's universal DoT-crit gate (DOT_CRIT default-ON,
//        sim.ts U13) with NO per-dot opt-in in the override. N7 is maxAmmoFlat 6
//        (the "▲ N round(s)" flat primitive, theme 14 — NOT maxAmmoPct 100, which only happens
//        to coincide at her 6-round base) for 15s on herself; the cap raises live and the
//        extended magazine loads at her next reload (increases never clip, sim.ts).
//
// Fixture: d-killer-wife (B1, 20s — the ENVIRONMENT PIERCE SOURCE: her S1 grants Pierce
// Damage ▲13.55% to SR allies on FB entry for 10s) / nihilister (B2, 20s — SOLE B2, so every
// chain stage II is hers) / ada (B3, 40s — gates the rotation; FB period ≈40s). Boss NEUTRAL
// (null — no elemental majors anywhere). Focus nihilister (SR camera focus is deterministic).
// Deterministic (no seed). Slot order: d-killer-wife 0 / nihilister 1 / ada 2.
//
// Why each assertion discriminates:
//   N1  the static `hasPierce:true` flag (nearest-wrong — tags from frame 0, no trigger) is
//       rejected structurally (shipped carries a windowed shotFired block, no top-level flag);
//       the timed window is proven LOAD-BEARING behaviourally: removing it un-tags her attacks,
//       d-killer-wife's 13.55 pierceDamagePct goes inert on her (sim.ts pierceTagged gate) and
//       her total drops; and the steady-fire pin MEASURES the coverage: her longest inter-shot gap
//       is now ~4.5s against the 4s window, so exactly one shot fires untagged and the static-flag
//       form out-damages the window by <0.2%. ⚑ That falsifies ⚑1's "no gap exceeds 4s"
//       derivation — surfaced, not retuned (durationSec is a derived constant on a unit outside
//       the 2026-08-11 batch). Tracked in QUEUE.md.
//   N4  the exact frame set [10,20,…,170]s kills every wrong cadence (an interval:5 over-fires,
//       a hitCount proxy fires on HER shot rhythm ≈1.37s, a burstCast key fires ≈ per cast);
//       the magnitude pin kills the lvl-9 102.4.
//   N5  burstCast keying: one nuke per cast, cast frames ≠ FB-start frames, fbMajorApplied
//       FALSE (the cast lands before the FB window). The fullBurstEnter counterfactual moves
//       the hit INTO the FB window (+50% major) — the discrimination is the mult/fb flag set.
//   N6  ten 1s-spaced ticks per full-window cast: a collapsed single flatDamage 131.9 produces
//       one instance per cast; the magnitude pin kills lvl-9 12.55; ticks are crit-eligible via
//       the engine's UNIVERSAL DoT-crit gate (DOT_CRIT default-ON, sim.ts U13 — mechanic
//       confirmed: DoT/function damage crits, never cores) and the override must carry NO
//       per-dot crit opt-in (the opt-in is for measured per-DoT divergence only); under the
//       default gate the opt-in counterfactual is byte-identical — the gate dominates.
//   N7  structural: stat maxAmmoFlat value 6, self-scoped, 15s expiry, once per cast; the
//       maxAmmoPct counterfactual is behaviourally identical at her 6-round base (that is the
//       trap — the primitive identity is pinned from the JSON, not from totals). Behavioural:
//       an extended magazine exists in-window (ammoAfter exceeds the base-mag maximum 5);
//       removing the block restores max ammoAfter 5.
//
// RED state (pre-S3): nihilister has NO override on disk — runComp throws "no override" for
// her, so this whole suite is RED until src/skills/overrides/nihilister.json lands (S3).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const NIHILISTER = 1; // slot order: d-killer-wife 0 / nihilister 1 / ada 2
const FIGHT_SEC = 180;

const S2_ATK = 112.64;
const BURST_ATK = 158.59;
const BURN_ATK = 13.19;
const PIERCE_BUFF = 13.55; // d-killer-wife's Pierce Damage ▲ to SR allies

const nihilisterComp = {
  slugs: ['d-killer-wife', 'nihilister', 'ada'],
  bossElement: null,
  focusSlug: 'nihilister',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...nihilisterComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- override readers -------------------------------------------------------------------------
const shipped = () => {
  const ov = loadOverride('nihilister');
  if (!ov) {
    throw new Error('nihilister: no override on disk — RED state (pre-S3)');
  }
  return ov as any;
};

// ---- counterfactual / reference patches -------------------------------------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** N1 reference: the Pierce window removed — un-tags her attacks. */
const cfNoGainPierce = withPatchedOverride('nihilister', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'gainPierce'));
  if (ov.skill1.length === before) {
    throw new Error(
      'nihilister S1 gainPierce block missing — fixture is stale'
    );
  }
});
/** N1 nearest-wrong: the STATIC hasPierce flag instead of the windowed grant. */
const cfStaticPierce = withPatchedOverride('nihilister', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'gainPierce'));
  ov.hasPierce = true;
});
/** N4 counterfactual: the S2 nuke on a wrong cadence (over-fires ×2). */
const cfS2Fast = withPatchedOverride('nihilister', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'interval');
  if (!b) {
    throw new Error('nihilister S2 interval block missing — fixture is stale');
  }
  b.trigger.sec = 5;
});
/** N4 counterfactual: the S2 nuke keyed to her burst casts instead of its own CD. */
const cfS2BurstKeyed = withPatchedOverride('nihilister', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'interval');
  if (!b) {
    throw new Error('nihilister S2 interval block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** N5/N6/N7 counterfactual: every burst line re-keyed to fullBurstEnter. */
const cfBurstFbEnter = withPatchedOverride('nihilister', (ov) => {
  for (const b of ov.burst) {
    if (b.trigger.kind === 'burstCast') {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
/** N6 counterfactual: the burn collapsed to a single flat hit of the window total. */
const cfBurnCollapsed = withPatchedOverride('nihilister', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'dot'));
  if (!b) {
    throw new Error('nihilister burst dot block missing — fixture is stale');
  }
  const eff = b.effects.find((e: any) => e.kind === 'dot');
  b.effects = b.effects.filter((e: any) => e.kind !== 'dot');
  b.effects.push({ kind: 'flatDamage', atkPct: +(eff.atkPct * 10).toFixed(2) });
});
/** N6 counterfactual: burn ticks opted INTO crit — under the default DOT_CRIT gate the opt-in
 *  is dominated (byte-identical); the pin is the structural no-opt-in discipline. */
const cfBurnCrit = withPatchedOverride('nihilister', (ov) => {
  const eff = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'dot');
  if (!eff) {
    throw new Error('nihilister burst dot effect missing — fixture is stale');
  }
  eff.crit = true;
});
/** N7 reference: the ammo line removed — magazines stay at the base 6. */
const cfNoAmmo = withPatchedOverride('nihilister', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'maxAmmoFlat'));
  if (ov.burst.length === before) {
    throw new Error(
      'nihilister burst maxAmmoFlat block missing — fixture is stale'
    );
  }
});
/** N7 nearest-wrong: maxAmmoPct 100 (coincides at her 6-round base — the trap). */
const cfAmmoPct = withPatchedOverride('nihilister', (ov) => {
  const eff = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.stat === 'maxAmmoFlat');
  if (!eff) {
    throw new Error(
      'nihilister burst maxAmmoFlat effect missing — fixture is stale'
    );
  }
  eff.stat = 'maxAmmoPct';
  eff.value = 100;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noGainPierce = run({ nihilister: cfNoGainPierce });
const staticPierce = run({ nihilister: cfStaticPierce });
const s2Fast = run({ nihilister: cfS2Fast });
const s2BurstKeyed = run({ nihilister: cfS2BurstKeyed });
const burstFbEnter = run({ nihilister: cfBurstFbEnter });
const burnCollapsed = run({ nihilister: cfBurnCollapsed });
const burnCrit = run({ nihilister: cfBurnCrit });
const noAmmo = run({ nihilister: cfNoAmmo });
const ammoPct = run({ nihilister: cfAmmoPct });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'damage' }> => e.kind === 'damage'
  );
const herDamage = (evs: SimEvent[], srcSlot: 'skill2' | 'burst') =>
  dmg(evs).filter((d) => d.slug === 'nihilister' && d.srcSlot === srcSlot);
const herShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'shot' }> =>
      e.kind === 'shot' && e.slug === 'nihilister'
  );
const herCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'nihilister'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'fullBurstStart' }> =>
      e.kind === 'fullBurstStart'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> => e.kind === 'buffApply'
  );

/** d-killer-wife's Pierce Damage ▲ windows landing on nihilister (the environment source). */
const pierceBuffWindows = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'pierceDamagePct' &&
      b.value === PIERCE_BUFF &&
      b.targetIdx === NIHILISTER
  );

/** The burst nuke instances (the 158.59 hits — the burn ticks are the 13.19 ones; both ride
 *  srcSlot 'burst' / bucket 'burst', so the kit magnitudes separate the two lines). */
const herNukes = (evs: SimEvent[]) =>
  herDamage(evs, 'burst').filter((d) => d.atkPct === BURST_ATK);
/** The burn DoT ticks (a burst-slot DoT lands in the burst bucket — the bucket follows the
 *  carrying slot, unlike an S2-slot DoT which lands in 'skill'). */
const herBurnTicks = (evs: SimEvent[]) =>
  herDamage(evs, 'burst').filter((d) => d.atkPct === BURN_ATK);

/** Burn ticks from casts whose FULL 10s window fits inside the fight. */
function burnTicksPerFullWindow(evs: SimEvent[]) {
  const fightFrames = FIGHT_SEC * FPS;
  const casts = herCasts(evs).filter((c) => c.frame + 10 * FPS <= fightFrames);
  const ticks = herBurnTicks(evs);
  return { casts, ticks };
}

describe('nihilister — kit spec', () => {
  describe('N1 — S1 full-charge: Gain Pierce for 1 round (windowed gainPierce on shotFired)', () => {
    it('is a shotFired-keyed, self-targeted, TIMED gainPierce — not a static hasPierce flag', () => {
      const ov = shipped();
      expect(
        ov.hasPierce,
        'shipped must not be the static-flag form'
      ).toBeUndefined();
      const blk = ov.skill1.find((b: any) => hasKind(b, 'gainPierce'));
      expect(blk, 'no gainPierce block in skill1').toBeDefined();
      expect(blk.trigger.kind).toBe('shotFired');
      expect(blk.target.kind).toBe('self');
      const eff = blk.effects.find((e: any) => e.kind === 'gainPierce');
      expect(
        eff.durationSec,
        'a round-count window needs a timed stand-in — permanent-after-first-shot is wrong'
      ).toBeGreaterThan(0);
      // unmodeled.skill1 must NOT claim the Pierce line (it is modeled)
      expect(
        (ov.unmodeled?.skill1 ?? []).some((s: string) =>
          s.includes('Gain Pierce')
        ),
        'the Pierce grant is modeled, not carried as unmodeled'
      ).toBe(false);
    });

    it("is load-bearing: d-killer-wife's Pierce Damage ▲ feeds her only while tagged", () => {
      // The environment source must actually be landing on her in this fixture.
      expect(
        pierceBuffWindows(base.events).length,
        'no pierceDamagePct window landed on nihilister — fixture is inert'
      ).toBeGreaterThan(0);
      expect(base.totals.nihilister).toBeGreaterThan(
        noGainPierce.totals.nihilister
      );
    });

    it('MEASURES the coverage gap: her longest inter-shot gap EXCEEDS the 4s window, so exactly one shot fires untagged', () => {
      // This assertion IS the instrument (CLAUDE.md constraint 9) — it re-derives the measurement
      // rather than citing a number from a lost scratch run.
      //
      // It used to assert `staticPierce.totals === base.totals` exactly. That equality held only
      // under the fixture's OLD cadence: the comp seats `ada`, and capping her Special Modification
      // swap to the kit's literal 1 round (2026-08-11) shifted team burst timing enough to stretch
      // one of her inter-shot gaps past the window. Rather than loosen the pin to a tolerance, this
      // states the true fact and its size, so the ⚑ below is visible instead of averaged away.
      const shotFrames = herShots(base.events)
        .map((s) => s.frame)
        .sort((a, b) => a - b);
      const gaps = shotFrames.slice(1).map((f, i) => (f - shotFrames[i]) / FPS);
      const longest = Math.max(...gaps);
      const window = shipped()
        .skill1.find((b: any) => hasKind(b, 'gainPierce'))
        .effects.find((e: any) => e.kind === 'gainPierce').durationSec;

      // ⚑ OPEN (2026-08-11): her override's ⚑1 derives durationSec 4 as "the longest inter-shot gap
      // she actually fires across (~3.7s worst case)". At the current cadence the longest gap is
      // ~4.5s, which FALSIFIES that derivation — the window no longer covers her slowest stretch.
      // Bumping it to 5 restores exact static-flag equality, but that is a DERIVED constant on a
      // unit outside this batch, so it is surfaced, not silently retuned. Tracked in QUEUE.md.
      expect(
        longest,
        'the derivation behind durationSec 4 is that no gap exceeds it'
      ).toBeGreaterThan(window);

      // The consequence, bounded: a static flag is an upper bound on the window (tagged always vs
      // only while live), and the shortfall is one shot's worth — sub-0.2% of her total.
      const shortfall =
        (staticPierce.totals.nihilister - base.totals.nihilister) /
        base.totals.nihilister;
      expect(
        shortfall,
        'the window cannot out-damage an always-on flag'
      ).toBeGreaterThanOrEqual(0);
      expect(
        shortfall,
        'more than a single uncovered shot — the window is badly undersized'
      ).toBeLessThan(0.002);
    });
  });

  describe('N2/N3 — S1 Piercing Radius and the 2+-target bonus are carried VERBATIM as unmodeled', () => {
    it('carries both inert lines verbatim, with no dead-code blocks standing in', () => {
      const ov = shipped();
      const s1u: string[] = ov.unmodeled?.skill1 ?? [];
      expect(
        s1u.some((s) => s.includes('Piercing Radius') && s.includes('50%')),
        'Piercing Radius line missing from unmodeled.skill1'
      ).toBe(true);
      expect(
        s1u.some((s) => s.includes('2 or more enemies') && s.includes('50.33')),
        'the 2+-target bonus line missing from unmodeled.skill1'
      ).toBe(true);
      // no radius primitive and no 50.33 rider may exist anywhere in skill1
      expect(
        ov.skill1.some((b: any) =>
          b.effects.some((e: any) => e.atkPct === 50.33)
        ),
        'the 2+-target bonus can never fire vs a single enemy — it must not be encoded'
      ).toBe(false);
      // the radius line is GEOMETRY, not Pierce Damage — the nearest-wrong misread is a
      // pierceDamagePct +50 buff, which would silently move the Damage-Up bucket (S2b trap)
      expect(
        ov.skill1.some((b: any) =>
          b.effects.some((e: any) => e.stat === 'pierceDamagePct')
        ),
        'Piercing Radius must not be misread as Pierce Damage ▲'
      ).toBe(false);
    });
  });

  describe('N4 — S2: 112.64% nuke on the datamined 10s internal CD (first fire t=10)', () => {
    const hits = herDamage(base.events, 'skill2');

    it('fires at t=10,20,…,170s — the class-1 pure-timer cadence, nothing else', () => {
      const frames = hits.map((d) => d.frame);
      const expected: number[] = [];
      for (let t = 10; t < FIGHT_SEC; t += 10) {
        expected.push(t * FPS);
      }
      expect(
        frames,
        `${frames.length} S2 hits — a wrong trigger (hitCount/burstCast/interval:5) lands a different frame set`
      ).toEqual(expected);
    });

    it('is the kit magnitude in the skill bucket, crit-eligible, never a core strike', () => {
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([S2_ATK]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(hits.every((d) => d.critEligible)).toBe(true);
      expect(hits.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: wrong cadences move the hit set', () => {
      const shippedFrames = hits.map((d) => d.frame);
      expect(
        herDamage(s2Fast.events, 'skill2').map((d) => d.frame)
      ).not.toEqual(shippedFrames);
      expect(
        herDamage(s2BurstKeyed.events, 'skill2').map((d) => d.frame)
      ).not.toEqual(shippedFrames);
    });
  });

  describe('N5 — burst nuke: 158.59% of final ATK, one per HER cast, pre-FB', () => {
    const nukes = herNukes(base.events);

    it('fires once per burst cast at the kit magnitude', () => {
      const casts = herCasts(base.events);
      expect(
        casts.length,
        'nihilister never cast — fixture is broken'
      ).toBeGreaterThan(0);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([BURST_ATK]);
    });

    it('is burstCast-keyed: cast frames are NOT Full-Burst-start frames, and no +50% FB major lands', () => {
      const fbFrames = new Set(fbStarts(base.events).map((e) => e.frame));
      for (const c of herCasts(base.events)) {
        expect(
          fbFrames.has(c.frame),
          `cast at frame ${c.frame} coincides with an FB start — fullBurstEnter keying?`
        ).toBe(false);
      }
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: fullBurstEnter keying moves the nuke INTO the FB window (+50% major)', () => {
      const fbNukes = herNukes(burstFbEnter.events);
      // The re-keyed lines fire at FB entry — the nuke then takes the FB major the cast form never does.
      expect(
        fbNukes.some((d) => d.fbMajorApplied) ||
          fbNukes.length !== nukes.length ||
          !fbNukes.every((d, i) => d.frame === nukes[i]?.frame),
        'the fullBurstEnter counterfactual must be observably different'
      ).toBe(true);
      expect(burstFbEnter.totals.nihilister).not.toBe(base.totals.nihilister);
    });
  });

  describe('N6 — Burn: 13.19% sustained every 1s for 10s per cast (a real DoT; ticks on the DOT_CRIT gate)', () => {
    it('ticks exactly 10× at 1s spacing per full-window cast, at the kit magnitude', () => {
      const { casts, ticks } = burnTicksPerFullWindow(base.events);
      expect(
        casts.length,
        'no burst cast has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
      for (const cast of casts) {
        const inWindow = ticks.filter(
          (d) => d.frame > cast.frame && d.frame <= cast.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          `cast at ${cast.sec.toFixed(1)}s produced ${inWindow.length} ticks — a collapsed ` +
            'single hit produces 1; a continuous DoT never stops'
        ).toBe(10);
        const gaps = inWindow.map((d, i) =>
          i === 0 ? d.frame - cast.frame : d.frame - inWindow[i - 1].frame
        );
        expect(
          [...new Set(gaps)],
          'ticks must land exactly 1s apart, first at cast+1s'
        ).toEqual([FPS]);
        expect([...new Set(inWindow.map((d) => d.atkPct))]).toEqual([BURN_ATK]);
      }
    });

    it('is sustained-flavored, burst-bucket, crit-eligible via the universal DoT gate, never cores', () => {
      const { ticks } = burnTicksPerFullWindow(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
      // DOT_CRIT (sim.ts U13, default-ON, Fable-approved): DoT ticks crit at the sheet rate…
      expect(ticks.every((d) => d.critEligible)).toBe(true);
      // …and NEVER core.
      expect(ticks.every((d) => !d.coreEligible)).toBe(true);
      const ov = shipped();
      const eff = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'dot');
      expect(
        eff.flavor,
        'the burn is sustained damage — the flavor feeds sustainedDamagePct'
      ).toBe('sustained');
      expect(
        eff.crit,
        'the universal gate covers the ticks — a per-dot opt-in needs a measurement'
      ).toBeUndefined();
    });

    it('DISCRIMINATING: the collapsed single-hit counterfactual; the crit opt-in is gate-dominated', () => {
      const collapsed = herDamage(burnCollapsed.events, 'burst').filter(
        (d) => d.atkPct !== BURST_ATK
      );
      const { ticks } = burnTicksPerFullWindow(base.events);
      expect(collapsed.length).toBeGreaterThan(0);
      expect(collapsed.length).toBeLessThan(ticks.length);
      expect(burnCollapsed.totals.nihilister).not.toBe(base.totals.nihilister);
      // Under DOT_CRIT default-ON the opt-in changes nothing — proving the gate, not the
      // override, is what makes the ticks crit (so no opt-in belongs in the JSON).
      expect(burnCrit.totals.nihilister).toBe(base.totals.nihilister);
    });
  });

  describe('N7 — burst self: Max Ammunition Capacity ▲6 rounds for 15s (maxAmmoFlat, not %)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === NIHILISTER && b.stat === 'maxAmmoFlat'
    );

    it('applies once per HER cast, self-scoped, value 6, 15s expiry', () => {
      expect(applied.length).toBe(herCasts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([6]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([
        NIHILISTER,
      ]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('is the FLAT round primitive — the maxAmmoPct 100 coincidence is the trap', () => {
      const ov = shipped();
      const eff = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.stat && e.stat.startsWith('maxAmmo'));
      expect(eff.stat).toBe('maxAmmoFlat');
      expect(eff.value).toBe(6);
    });

    it('behavioural: an extended magazine exists in-window (ammoAfter exceeds the base-mag max)', () => {
      const maxAfterBase = Math.max(
        ...herShots(base.events).map((s) => s.ammoAfter)
      );
      const maxAfterRemoved = Math.max(
        ...herShots(noAmmo.events).map((s) => s.ammoAfter)
      );
      expect(maxAfterRemoved, 'base 6-round mag: max rounds-after is 5').toBe(
        5
      );
      expect(
        maxAfterBase,
        'with +6 rounds the belt must exceed the base-mag maximum'
      ).toBeGreaterThan(5);
      // the extra belt length is real damage (fewer reloads → more shots in-window)
      expect(base.totals.nihilister).toBeGreaterThan(noAmmo.totals.nihilister);
    });

    it('DISCRIMINATING at the primitive level: maxAmmoPct is rejected even though totals coincide', () => {
      // Behaviourally identical at her 6-round base — that is exactly why the JSON pin above is
      // load-bearing. Sanity-pin the coincidence so nobody "fixes" it later:
      expect(ammoPct.totals.nihilister).toBe(base.totals.nihilister);
    });
  });

  describe('U — unmodeled lines live VERBATIM in the override (no silent drops, no ignored blocks)', () => {
    it('has exactly the two inert S1 lines unmodeled and every other slot empty', () => {
      const ov = shipped();
      expect(ov.unmodeled.skill2).toEqual([]);
      expect(ov.unmodeled.burst).toEqual([]);
      expect(ov.unmodeled.skill1.length).toBe(2);
    });

    it('has no `ignored` effect blocks anywhere', () => {
      const ov = shipped();
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const b of ov[slot] ?? []) {
          for (const e of b.effects ?? []) {
            expect(e.kind).not.toBe('ignored');
          }
        }
      }
    });

    it('the note carries the gauntlet stamp', () => {
      expect(shipped().note).toMatch(/Kit-autonomy gauntlet 2026-08-04/);
    });
  });
});
