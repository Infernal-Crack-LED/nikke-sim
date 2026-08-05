// PER-UNIT KIT SPEC — `mihara` (Mihara — AR / Attacker / Water / Burst III, cd 40s, ammo 60,
// reloadFrames 121, normalMult 15.07, burstGaugePerShot 0.25, SR rarity).
// Kit-autonomy gauntlet 2026-08-05 (test-first re-derivation).
//
// ⚠ EXACT SLUG: `mihara` is the BASE unit (AR/Water/B3). `mihara-bonding-chain` (MG/Fire,
// aka "mbc"/"miharabc"/"mihara os") is an ENTIRELY DIFFERENT unit (landed its own gauntlet
// 2026-07-26). lint-slug-disambiguation flags every bare "Mihara"/"mihara" token for this
// pair — including the slug itself, so NO text form passes clean (the base unit has no
// approved nickname); the confirmation is recorded here and in the override/manual-review
// headers per the mica precedent — this spec is about the AR/Water attacker only.
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/mihara.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (mica/isabel precedent).
//
// SR RARITY (original_rare SR) → the plain scope-lock ceiling (copies 10 ⇒ 3★ + core 7)
// is an SSR ceiling an SR unit can never reach: unitLimits {stars:3, core:0} (mica /
// himeno precedent).
//
// Kit (blablalink prose, data/characters.json → characters.mihara.skills, lvl 10):
//   S1 ■ last bullet hits the target → self:
//        Critical Damage ▲18.7% for 10 sec                                     [FAITHFUL — M1]
//   S2 ■ on burst cast → self, escalating by number of burst uses
//      ("Each subsequent effect triggers all effects before it"):
//        Once:  Highway to Hell 1 — ATK ▲15.56% for 45 sec                    [FAITHFUL — M2]
//        Twice: Highway to Hell 2 — Critical Rate ▲11.28% for 45 sec           [FAITHFUL — M2]
//   BU ■ all allies (Burst III, cd 40s):
//        Full Burst Duration ▼5 sec                                            [FAITHFUL — M4]
//   BU ■ all enemies:
//        399.6% of final ATK as Burst Skill damage                             [FAITHFUL — M3]
//   BU ■ while in Highway to Hell 2 status → all enemies:
//        266.4% of final ATK as additional damage                              [FAITHFUL — M3]
//
// Mihara is a water-element B3 ATTACKER whose kit is ONE escalating ladder keyed to her
// OWN burst-cast count (the Liter/Isabel "Once:/Twice:" family) plus a last-bullet
// crit-damage rider:
//
//   • M1 (S1 "Endure") fires on the engine-native lastBullet trigger (the 60th shot of
//     every magazine; AR ammo 60, 720 rpm ⇒ ~7.0s cycle incl. the 121f reload), granting
//     self critDamagePct 18.7% for 10s — high uptime, load-bearing for her crit damage.
//     The kit's "hits the target" reads as the last bullet fired: the sim models no
//     misses, so last-bullet-fired == last-bullet-hit at scope. Nearest-wrong: a shotFired
//     trigger ("when attacking") re-applies on EVERY pull (buffer permanent, applications
//     on non-magazine-end frames); a passive applies once at frame 0.
//   • M2 (S2 "Highway to Hell") is the escalating self-buff: cast 1 applies step 1 only
//     (ATK ▲15.56% / 45s); cast 2+ applies steps 1..2 (adds critRate ▲11.28% / 45s) —
//     exactly "Each subsequent effect triggers all effects before it". The 45s duration
//     EXCEEDS her 40s CD, so from cast 2 the stage-2 status is permanently live at every
//     later cast. Nearest-wrong: a flat (non-staged) encoding grants the crit rate on
//     cast 1; a passive applies both at frame 0.
//   • M3 (burst "Sense Sharing") is a SINGLE escalating damage ladder on burstCast:
//     steps [flatDamage 399.6, flatDamage 266.4] — cast 1 applies step 1 only (the base
//     nuke); cast 2+ applies both (base + the Highway-to-Hell-2-gated additional). The
//     ladder's activation counter ticks on the SAME trigger as S2's counter (her own
//     burstCast), so from cast 2 it runs exactly even with the HttH2 status the kit
//     names — no separate status gate exists or is needed (isabel's Marked-Target rider
//     ladder is the precedent). Both instances are burst-bucket flatDamage: crit-eligible
//     at her sheet rate by the flatDamage default, never cores, and FB-EXEMPT (burstCast
//     resolves pre-FB — the +50% Full Burst major never applies, U10). Nearest-wrong:
//     the additional always-on (fires cast 1), absent entirely, or at the lvl-1 magnitudes.
//   • M4 (burst FB line) is fullBurstExtend −5 on her cast (isabel's identical 'Full
//     Burst Time ▼ 5 sec' encoding): FBs opened by HER cast run 5s (300f) instead of
//     10s (600f); FBs opened by another B3 (helm on the fixture) stay 10s. ⚑ the net
//     rotation sign (shorter FB window vs faster re-cycle) is unverified in the engine's
//     rotation model (isabel's standing ⚑) — the test pins the WINDOW, not the net sign.
//     Nearest-wrong: a +5 sign flip (900f windows) or removal (all 600f).
//
// Fixture: the 720 control comp (liter B1 20s / crown B2 / mihara B3 40s / helm B3 40s),
// boss Fire (mihara takes the water-on-fire ×1.1 major — standard control), focus mihara
// (AR, not a charge weapon — the focus flag is gauge-neutral for her). mihara and helm
// ALTERNATE the B3 slot (both 40s), so mihara casts every other Full Burst (~40s period,
// ≥4 casts / 180s): cast 1 exercises the ladder's step-1-only branch, casts 2+ the full
// ladder. No fixture mate carries a fullBurstExtend (verified), so ANY FB-window change
// is mihara's; no mate emits boss-targeted buffApply from a mihara-shaped line.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'mihara', 'helm'] as const;
/** slot order: liter 0 / crown 1 / mihara 2 / helm 3. */
const MIHARA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'mihara',
    unitLimits: { mihara: { stars: 3, core: 0 } },
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** M1 nearest-wrong trigger: "when the last bullet hits" misread as "when attacking" —
 *  shotFired re-applies the buffer on EVERY pull. */
const m1EveryShot = withPatchedOverride('mihara', (ov) => {
  const block = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'critDamagePct')
  );
  if (!block) {
    throw new Error('mihara S1 critDamagePct block missing — fixture is stale');
  }
  block.trigger = { kind: 'shotFired' };
});
/** M1 reference: S1 removed entirely (functional baseline). */
const m1NoS1 = withPatchedOverride('mihara', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = [];
  if (before === 0) {
    throw new Error('mihara skill1 blocks missing — fixture is stale');
  }
});
/** M2 nearest-wrong staging: the flat (non-escalating) encoding — both buffs from cast 1. */
const m2Flat = withPatchedOverride('mihara', (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'escalating')
  );
  if (!block) {
    throw new Error('mihara S2 escalating block missing — fixture is stale');
  }
  const steps = block.effects.find((e: any) => e.kind === 'escalating').steps;
  block.effects = steps; // flat: every cast applies every step
});
/** M2 nearest-wrong duty: the whole S2 as ONE permanent passive (no burst keying, no expiry). */
const m2Passive = withPatchedOverride('mihara', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.map((b: any) => ({
    ...b,
    trigger: { kind: 'passive' },
    effects: [
      { kind: 'buff', stat: 'atkPct', value: 15.56 },
      { kind: 'buff', stat: 'critRatePct', value: 11.28 },
    ],
  }));
  if (before === 0) {
    throw new Error('mihara skill2 blocks missing — fixture is stale');
  }
});
/** M2 reference: S2 removed entirely (functional baseline). */
const m2NoS2 = withPatchedOverride('mihara', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('mihara skill2 blocks missing — fixture is stale');
  }
});
/** M3 nearest-wrong gate: the additional damage ALWAYS on (fires from cast 1 — the
 *  Highway-to-Hell-2 status clause dropped). */
const m3AlwaysAdditional = withPatchedOverride('mihara', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some(
      (e: any) => e.kind === 'escalating' && e.steps.length === 2
    )
  );
  if (!block) {
    throw new Error('mihara burst escalating ladder missing — fixture is stale');
  }
  const steps = block.effects.find((e: any) => e.kind === 'escalating').steps;
  block.effects = steps;
});
/** M3 nearest-wrong omission: the additional damage never fires (base nuke only). */
const m3NoAdditional = withPatchedOverride('mihara', (ov) => {
  for (const b of ov.burst) {
    for (const e of b.effects) {
      if (e.kind === 'escalating') {
        e.steps = e.steps.slice(0, 1);
      }
    }
  }
});
/** M3 nearest-wrong magnitude: the lvl-1 values 174.82 / 116.55 instead of lvl-10. */
const m3Weak = withPatchedOverride('mihara', (ov) => {
  const ladder = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'escalating');
  if (!ladder) {
    throw new Error('mihara burst escalating ladder missing — fixture is stale');
  }
  ladder.steps[0].atkPct = 174.82;
  ladder.steps[1].atkPct = 116.55;
});
/** M3 reference: the whole burst slot removed (functional baseline). */
const m3NoBurst = withPatchedOverride('mihara', (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('mihara burst blocks missing — fixture is stale');
  }
});
/** M4 nearest-wrong sign: Full Burst Duration ▼5 misread as ▲5 (extends instead of
 *  shortens). */
const m4SignFlip = withPatchedOverride('mihara', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'fullBurstExtend');
  if (!e) {
    throw new Error('mihara fullBurstExtend effect missing — fixture is stale');
  }
  e.seconds = 5;
});
/** M4 reference: the FB-duration block removed entirely (windows stay the bare 10s). */
const m4Removed = withPatchedOverride('mihara', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'fullBurstExtend')
  );
  if (ov.burst.length === before) {
    throw new Error('mihara fullBurstExtend block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const everyShot = run({ mihara: m1EveryShot });
const noS1 = run({ mihara: m1NoS1 });
const flat = run({ mihara: m2Flat });
const passive = run({ mihara: m2Passive });
const noS2 = run({ mihara: m2NoS2 });
const alwaysAdditional = run({ mihara: m3AlwaysAdditional });
const noAdditional = run({ mihara: m3NoAdditional });
const weak = run({ mihara: m3Weak });
const noBurst = run({ mihara: m3NoBurst });
const signFlip = run({ mihara: m4SignFlip });
const fbRemoved = run({ mihara: m4Removed });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const miharaBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MIHARA && b.stat === stat);
const miharaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mihara'
  );
/** mihara's burst-bucket damage events (the Sense Sharing nukes). */
const miharaNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'mihara' && e.bucket === 'burst'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** Group mihara's burst-bucket damage events by cast: each nuke lands on her cast frame. */
function nukesByCast(evs: SimEvent[]): Map<number, Damage[]> {
  const m = new Map<number, Damage[]>();
  for (const d of miharaNukes(evs)) {
    (m.get(d.frame) ?? m.set(d.frame, []).get(d.frame)!).push(d);
  }
  return m;
}
/** The FB window opened by a given caster's stage-3 cast (PREFB-deferred start). */
function fbWindowFor(
  evs: SimEvent[],
  slug: string
): { frame: number; len: number }[] {
  const starts = fbStarts(evs);
  return evs
    .filter(
      (e): e is BurstCast =>
        e.kind === 'burstCast' && e.slug === slug && e.stage === 3
    )
    .map((c) => {
      const s = starts.find(
        (x) => x.frame >= c.frame && x.frame <= c.frame + 40
      );
      return s ? { frame: s.frame, len: s.endFrame - s.frame } : null;
    })
    .filter((x): x is { frame: number; len: number } => x !== null);
}

describe('mihara — kit spec', () => {
  describe('fixture sanity — the B3 alternation actually runs', () => {
    it('mihara casts her burst repeatedly (>= 4 casts / 180s, stage III)', () => {
      const casts = miharaCasts(base.events);
      expect(casts.length).toBeGreaterThanOrEqual(4);
      expect([...new Set(casts.map((c) => c.stage))]).toEqual([3]);
    });
    it('her AR weapon deals damage on the SR rarity ceiling', () => {
      expect(base.totals.mihara).toBeGreaterThan(0);
    });
  });

  describe('M1 — S1 Endure: last bullet hits → self Critical Damage ▲18.7% for 10s', () => {
    const applied = miharaBuffs(base.events, 'critDamagePct');
    const magEndFrames = new Set(
      base.events
        .filter(
          (e): e is Shot =>
            e.kind === 'shot' && e.slug === 'mihara' && e.ammoAfter === 0
        )
        .map((s) => s.frame)
    );

    it('fires exactly on magazine-end frames with the kit magnitude and a 10s window', () => {
      expect(applied.length).toBeGreaterThanOrEqual(20);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([18.7]);
      for (const b of applied) {
        expect(b.targetIdx).toBe(MIHARA);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(magEndFrames.has(b.frame), `frame ${b.frame} must be a magazine-end frame`).toBe(true);
      }
      expect(
        new Set(applied.map((b) => b.frame)),
        'every magazine end applies the buffer exactly once'
      ).toEqual(magEndFrames);
    });

    it('DISCRIMINATING: the shotFired misread re-applies on EVERY pull (never just magazine ends)', () => {
      const spam = miharaBuffs(everyShot.events, 'critDamagePct');
      expect(spam.length).toBeGreaterThan(applied.length * 5);
      const offMagEnd = spam.filter((b) => !magEndFrames.has(b.frame));
      expect(offMagEnd.length).toBeGreaterThan(0);
    });

    it('FUNCTIONAL: removing S1 lowers her total (the crit-damage buffer is load-bearing)', () => {
      expect(base.totals.mihara).toBeGreaterThan(noS1.totals.mihara);
    });
  });

  describe('M2 — S2 Highway to Hell: escalating self-buff on her OWN burst casts', () => {
    const casts = miharaCasts(base.events).map((c) => c.frame);
    const atkApplies = miharaBuffs(base.events, 'atkPct');
    const crApplies = miharaBuffs(base.events, 'critRatePct');

    it('cast 1 grants ONLY the ATK step; the crit-rate step arrives at cast 2 (not before)', () => {
      expect(atkApplies.length).toBeGreaterThanOrEqual(casts.length);
      const first = casts[0];
      expect(
        atkApplies.filter((b) => b.frame === first),
        'step 1 lands on the first cast'
      ).toHaveLength(1);
      expect(
        crApplies.filter((b) => b.frame === first),
        'step 2 must NOT land on the first cast'
      ).toHaveLength(0);
      expect(
        crApplies.filter((b) => b.frame < casts[1]),
        'no crit-rate application before the second cast'
      ).toHaveLength(0);
    });

    it('from cast 2, every cast applies BOTH steps together (each subsequent triggers all before it)', () => {
      for (const frame of casts.slice(1)) {
        expect(
          atkApplies.filter((b) => b.frame === frame),
          `ATK step at cast frame ${frame}`
        ).toHaveLength(1);
        expect(
          crApplies.filter((b) => b.frame === frame),
          `crit-rate step at cast frame ${frame}`
        ).toHaveLength(1);
      }
    });

    it('carries the kit magnitudes, 45s windows, self-targeted', () => {
      expect([...new Set(atkApplies.map((b) => b.value))]).toEqual([15.56]);
      expect([...new Set(crApplies.map((b) => b.value))]).toEqual([11.28]);
      for (const b of [...atkApplies, ...crApplies]) {
        expect(b.targetIdx).toBe(MIHARA);
        expect(b.expiresFrame! - b.frame).toBe(45 * FPS);
      }
    });

    it('DISCRIMINATING: the flat encoding grants the crit rate on cast 1', () => {
      const flatCr = miharaBuffs(flat.events, 'critRatePct');
      const first = miharaCasts(flat.events)[0].frame;
      expect(
        flatCr.filter((b) => b.frame === first),
        'the flat model fronts the stage-2 step'
      ).toHaveLength(1);
    });

    it('DISCRIMINATING: a passive applies both once at frame 0 (no burst keying)', () => {
      const passiveAtk = miharaBuffs(passive.events, 'atkPct');
      expect(passiveAtk.length).toBeGreaterThanOrEqual(1);
      expect(
        [...new Set(passiveAtk.map((b) => b.frame))],
        'the passive is live from battle start'
      ).toEqual([0]);
    });

    it('FUNCTIONAL: removing S2 lowers her total (ATK + crit-rate drive her damage)', () => {
      expect(base.totals.mihara).toBeGreaterThan(noS2.totals.mihara);
    });
  });

  describe('M3 — burst Sense Sharing: escalating damage ladder (base 399.6, +266.4 once Highway to Hell 2 is live)', () => {
    const casts = miharaCasts(base.events);
    const byCast = nukesByCast(base.events);

    it('fires once per cast, on her cast frames, FB-exempt (no +50% major)', () => {
      expect(byCast.size).toBe(casts.length);
      for (const c of casts) {
        expect(byCast.has(c.frame), `nuke on cast frame ${c.frame}`).toBe(true);
      }
      for (const ds of byCast.values()) {
        for (const d of ds) {
          expect(d.fbMajorApplied, 'burst-cast damage precedes the FB window').toBe(false);
        }
      }
    });

    it('cast 1 deals ONLY the base 399.6; casts 2+ deal 399.6 AND 266.4', () => {
      const first = nukesByCast(base.events).get(casts[0].frame)!;
      expect(first.map((d) => d.atkPct)).toEqual([399.6]);
      for (const c of casts.slice(1)) {
        const ds = byCast.get(c.frame)!;
        expect(
          [...ds.map((d) => d.atkPct)].sort((a, b) => a - b),
          `cast at frame ${c.frame} must carry base + additional`
        ).toEqual([266.4, 399.6]);
      }
    });

    it('every instance is burst-bucket and crit-eligible at her sheet rate', () => {
      const ds = miharaNukes(base.events);
      expect([...new Set(ds.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(ds.map((d) => d.critEligible))]).toEqual([true]);
    });

    it('DISCRIMINATING: the always-on additional fires BOTH instances on cast 1', () => {
      const firstCast = miharaCasts(alwaysAdditional.events)[0].frame;
      const first = nukesByCast(alwaysAdditional.events).get(firstCast)!;
      expect(first.length).toBe(2);
    });

    it('DISCRIMINATING: the omitted-additional model fires exactly one instance on EVERY cast', () => {
      const byCastNoAdd = nukesByCast(noAdditional.events);
      for (const ds of byCastNoAdd.values()) {
        expect(ds.map((d) => d.atkPct)).toEqual([399.6]);
      }
      expect(sum(noAdditional.totals)).not.toEqual(sum(base.totals));
    });

    it('DISCRIMINATING: the lvl-1 magnitudes 174.82 / 116.55 change every nuke', () => {
      const vals = [...new Set(miharaNukes(weak.events).map((d) => d.atkPct))].sort(
        (a, b) => a - b
      );
      expect(vals).toEqual([116.55, 174.82]);
    });

    it('FUNCTIONAL: removing the burst erases every nuke and lowers her total', () => {
      expect(miharaNukes(noBurst.events)).toHaveLength(0);
      expect(base.totals.mihara).toBeGreaterThan(noBurst.totals.mihara);
    });
  });

  describe('M4 — burst FB line: Full Burst Duration ▼ 5 sec (fullBurstExtend:-5) ⚑ blast-radius', () => {
    it('STRUCTURAL: shipped is a fullBurstExtend:-5 block on the burst slot targeting allies', () => {
      const ov = loadOverride('mihara') as any;
      const block = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'fullBurstExtend')
      );
      expect(block, 'the FB-duration block exists').toBeTruthy();
      expect(block.trigger).toEqual({ kind: 'burstCast' });
      expect(block.target.kind).toBe('allies');
      expect(
        block.effects.find((e: any) => e.kind === 'fullBurstExtend').seconds
      ).toBe(-5);
    });

    it('FUNCTIONAL: FBs opened by HER cast run 5s (300f); helm-opened FBs stay 10s (600f)', () => {
      const hers = fbWindowFor(base.events, 'mihara');
      const helms = fbWindowFor(base.events, 'helm');
      expect(hers.length).toBeGreaterThanOrEqual(4);
      expect(helms.length).toBeGreaterThanOrEqual(3);
      for (const w of hers) {
        expect(w.len, `her FB at frame ${w.frame} must be the shortened 5s`).toBe(5 * FPS);
      }
      for (const w of helms) {
        expect(w.len, `helm's FB at frame ${w.frame} stays the full 10s`).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: the ▲5 sign flip extends her windows to 900f', () => {
      const hers = fbWindowFor(signFlip.events, 'mihara');
      expect(hers.length).toBeGreaterThan(0);
      for (const w of hers) {
        expect(w.len).toBe(15 * FPS);
      }
    });

    it('DISCRIMINATING: removing the block leaves every window at the bare 600f', () => {
      for (const w of fbWindowFor(fbRemoved.events, 'mihara')) {
        expect(w.len).toBe(10 * FPS);
      }
    });
  });

  describe('whole-picture — totals move only through her own kit', () => {
    it('fixture mates are untouched by her kit removals except through real channels', () => {
      // Her FB shortening (M4) can change TEAM totals via the rotation — that is the ⚑
      // blast-radius, asserted here only as finiteness, not as a direction.
      for (const t of [noS1, noS2, noBurst]) {
        expect(sum(t.totals)).toBeGreaterThan(0);
      }
      // S1/S2 are self-only buffs: removing them moves ONLY mihara's total.
      for (const s of SLUGS) {
        if (s === 'mihara') {
          continue;
        }
        expect(noS1.totals[s], `${s} under S1 removal`).toEqual(base.totals[s]);
        expect(noS2.totals[s], `${s} under S2 removal`).toEqual(base.totals[s]);
      }
    });
  });
});
