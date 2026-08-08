// PER-UNIT KIT SPEC — `soda` (Soda — the MG/Supporter/Fire/Burst-I BASE unit, slug `soda`;
// NOT soda-twinkling-bunny, the SG/Iron variant. Disambiguation lint fired on the shared base
// name; resolved explicitly to slug=soda (MG/Fire), 2026-08-05). MG ammo 300, reloadFrames 171,
// burstCooldownSec 20, hitsPerShot 1. Kit-autonomy gauntlet 2026-08-05 (test-first
// re-derivation). NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this
// gauntlet (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/soda.json exists. The override was authored as an EMPTY SKELETON first
// (the "shipped" state these tests run RED against), then the faithful S3 encoding lands GREEN —
// every assertion pins a kit line and the nearest-wrong counterfactual (withPatchedOverride) it
// must discriminate against.
//
// Kit (blablalink prose, data/characters.json → characters.soda.skills), max level:
//   S1 ■ after 180 normal attacks → self:
//        Maid Spirit: Max HP ▲ 13%, stacks up to 5 time(s), lasts 10 sec.              [SD1/SD2]
//   S2 ■ 12s-CD skill, all allies:
//        Restores HP equal to 3.23% of the skill user's final Max HP.                   [SD3]
//      ■ when Maid Spirit is at max stacks, all allies:
//        Restores HP equal to 12.71% of the skill user's final Max HP.                  [SD4]
//   BU ■ 2 random enemies: 321.28% of final ATK as damage. Stun for 1 sec.             [SD5 / stun UNMODELED]
//      ■ all Fire Code allies: Stack count of buffs ▲ 1.                               [SD6 self-slice / cross-ally ⚑]
//
// Modeling posture (full story lands in the override note at S3):
//   * S1 is a hit-count COUNTER (hitCount 180 — hitsPerShot 1, so hits == trigger pulls) granting
//     a SELF targetMaxHpPct 13% buff, maxStacks 5, durationSec 10. The kit's stackable Max HP is
//     additionally MIRRORS into a `maidSpirit` resource pool (+1 per proc) — the pool is the only
//     gate-able state in the engine, and S2's "Maid Spirit at max stacks" clause reads it
//     (resourceGate min:5). Pool is MONOTONIC (resources never decay) while the real stacks carry
//     a 10s per-stack expiry: divergence only possible in >10s firing gaps, which the sustained
//     MG fixture never produces — the same documented divergence class as soda-twinkling-bunny's
//     Golden-Chip pool (kit-status, 2026-07-17). The buff is damage-INERT for soda (she has no
//     atkOfMaxHpPct conversion) but is event-pinned, not dropped.
//   * S2's heals are the recovery EVENT channel only — the engine models no HP pool, so the
//     3.23% / 12.71%-of-final-Max-HP magnitudes ride verbatim in the override note, not fudged.
//     Observable through crown's "when recovery takes effect → all allies Attack Damage ▲20.99%/7s"
//     consumer (the fixture's consumer; crown's own hitCount-860 self-heal is stripped for
//     isolation, helm-test precedent). Hard rule 2: never drop a heal.
//   * The burst nuke collapses "2 random enemy unit(s)" onto the lone partless boss (anis-ss /
//     privaty-unkind-maid precedent), burstCast-keyed so it lands BEFORE the Full Burst window
//     and never takes the +50% major (B1 casts at stage 1; helm H7 precedent). The 1-sec STUN is
//     UNMODELED verbatim: enemy CC — the sim has no enemy behaviour model and the boss deals no
//     damage, so it is offensively inert by construction.
//   * "All Fire Code allies: Stack count of buffs ▲ 1": the SELF slice is modeled (soda is Fire
//     Code; her own stackable buff is Maid Spirit, so her burst adds +1 maidSpirit pool and one
//     Max-HP stack). The CROSS-ALLY slice — +1 stack onto each Fire ally's OWN stackable buffs —
//     is ⚑ OUT-OF-DOMAIN (engine-core): no engine primitive "bump each target's stackable buffs
//     by N" exists (pepper ⚑4 / mica-snow-buddy ⚑M5 precedent, kit-status line 5880 — "the
//     self-slice is the honest in-scope model").
//
// FIXTURE: liter(B1) / crown(B2) / ada(B3) / soda(B1), boss Fire (soda is Fire → neutral, no
// element major on her lines), focus ada. The control core minus helm, with soda as a SECOND
// Burst I (she alternates casts with liter, ~42s per soda cast) and crown as the recovery
// CONSUMER. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'ada', 'soda'] as const;
/** slot order: liter 0 / crown 1 / ada 2 / soda 3. */
const CROWN = 1;
const SODA = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

/** crown's own hitCount-860 self-heal would fire her recovery consumer from HER kit — stripped
 *  so every recovery firing in the fight is attributable to soda's S2 (helm-test isolation). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides: { crown: crownNoHeal, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const sodaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'soda');
const sodaCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'soda');

/** soda's Maid Spirit Max-HP stack applications (S1 hit-count procs + burst self-slice). */
const maidSpiritApplies = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === SODA && b.stat === 'maxHpFlat');

/** crown's recovery consumer: one buffApply per (recovery event × 4 allies). Distinct frames =
 *  distinct recovery FIRINGS; per-frame count = 4 × (recovery events that frame). */
const crownAdApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CROWN &&
      b.stat === 'attackDamagePct' &&
      b.value === 20.99
  );
const perFrame = (applies: BuffApply[]) => {
  const m = new Map<number, number>();
  for (const b of applies) {
    m.set(b.frame, (m.get(b.frame) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, z) => a[0] - z[0]);
};

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) ----------
// PHASE-AWARE GUARD: soda is FROM-SCRATCH — the RED phase runs against the empty skeleton, where
// there is no block to patch and a counterfactual is (correctly) identical to shipped. The
// helpers therefore throw only when the slot is NON-EMPTY but the block is absent (a genuinely
// stale fixture), and pass through on the empty skeleton (quiry precedent).
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

/** SD1 counterfactual: the counter threshold halved (90) — a "180 normals" misread that fires
 *  twice as often. */
const sodaHalfThreshold = withPatchedOverride('soda', (ov) => {
  mutateBlock(
    ov,
    'skill1',
    (x: any) => x.trigger.kind === 'hitCount',
    (b: any) => {
      b.trigger.count = 90;
    },
    'soda S1 hitCount block'
  );
});
/** SD2 isolation: S1 removed entirely — Maid Spirit contributes nothing to damage. */
const sodaNoS1 = withPatchedOverride('soda', (ov) => {
  ov.skill1 = [];
});
/** SD2 counterfactual: hand soda an HP→ATK conversion she does NOT have — her own-kit maxHpFlat
 *  now feeds it, proving the inertness is her kit's property, not a dead engine channel. */
const sodaWithHpConversion = withPatchedOverride('soda', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkOfMaxHpPct', value: 10 }],
  });
});
/** SD3 counterfactual: the heal cadence doubled (6s interval instead of the 12s CD). */
const sodaS2Fast = withPatchedOverride('soda', (ov) => {
  for (const b of ov.skill2) {
    if (b.trigger.kind === 'interval') {
      b.trigger.sec = 6;
    }
  }
  if (ov.skill2.length === 0) {
    return; // skeleton phase
  }
});
/** SD3 isolation: S2 removed entirely — crown loses the recovery-driven Attack Damage uptime. */
const sodaNoS2 = withPatchedOverride('soda', (ov) => {
  ov.skill2 = [];
});
/** SD4 counterfactual: the "Maid Spirit at max stacks" gate dropped — the rider heal fires from
 *  the very first S2 tick. */
const sodaUngatedRider = withPatchedOverride('soda', (ov) => {
  mutateBlock(
    ov,
    'skill2',
    (x: any) => x.resourceGate?.name === 'maidSpirit',
    (b: any) => {
      delete b.resourceGate;
    },
    'soda S2 max-stack rider block'
  );
});
/** SD5 counterfactual: the nuke re-keyed to fullBurstEnter — fires on EVERY team Full Burst,
 *  not on soda's own casts. */
const sodaFbEnterNuke = withPatchedOverride('soda', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.kind === 'flatDamage'),
    (b: any) => {
      b.trigger = { kind: 'fullBurstEnter' };
    },
    'soda burst nuke block'
  );
});
/** SD6 counterfactual: the burst's self-slice (+1 Maid Spirit stack) removed. */
const sodaNoSelfSlice = withPatchedOverride('soda', (ov) => {
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
  );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const halfThreshold = run({ soda: sodaHalfThreshold });
const noS1 = run({ soda: sodaNoS1 });
const withHpConversion = run({ soda: sodaWithHpConversion });
const s2Fast = run({ soda: sodaS2Fast });
const noS2 = run({ soda: sodaNoS2 });
const ungatedRider = run({ soda: sodaUngatedRider });
const fbEnterNuke = run({ soda: sodaFbEnterNuke });
const noSelfSlice = run({ soda: sodaNoSelfSlice });

// ---- derived (base-run) quantities -------------------------------------------------------------
const SODA_MAX_HP = base.res.units[SODA].maxHp;
const SHOT_COUNT = sodaShots(base.events).length;
const CAST_COUNT = sodaCasts(base.events).length;

describe('soda — kit spec', () => {
  it('fixture sanity: soda fires an MG belt and alternates Burst I casts with liter', () => {
    expect(SHOT_COUNT).toBeGreaterThan(900); // ≥5 S1 proc opportunities
    expect(CAST_COUNT).toBeGreaterThanOrEqual(3);
  });

  describe('SD1 — S1 Maid Spirit: after 180 normals, self Max HP ▲13%, 5 stacks, 10s', () => {
    const applied = maidSpiritApplies(base.events);

    it('fires exactly once per 180 hits, plus one application per own burst cast (self-slice)', () => {
      expect(applied.length).toBe(Math.floor(SHOT_COUNT / 180) + CAST_COUNT);
    });

    it('is 13% of her own Max HP per stack, capped at 5 stacks, on a 10s duration', () => {
      expect(applied.length).toBeGreaterThan(0);
      const expected = (13 / 100) * SODA_MAX_HP;
      expect([...new Set(applied.map((b) => b.value))]).toEqual([expected]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applied.map((b) => b.stacks)),
        'the pool saturates at the 5th proc mid-fight'
      ).toBe(5);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is self-scoped — no ally ever holds the Maid Spirit grant', () => {
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['soda']);
    });

    it('DISCRIMINATING: a halved threshold (90) fires twice as often', () => {
      const cf = maidSpiritApplies(halfThreshold.events);
      expect(cf.length).toBe(Math.floor(SHOT_COUNT / 90) + CAST_COUNT);
      expect(cf.length).toBeGreaterThan(applied.length);
    });
  });

  describe('SD2 — S1 is damage-INERT (soda has no HP-scaling ATK conversion)', () => {
    it("removing Maid Spirit entirely moves NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noS1.totals);
    });

    it('DISCRIMINATING: the channel is live — an HP→ATK converter she does not own WOULD feed', () => {
      expect(withHpConversion.totals['soda']).toBeGreaterThan(
        base.totals['soda']
      );
    });
  });

  describe('SD3 — S2: all allies recover every 12s (recovery-event channel only)', () => {
    // The heal carries no modeled HP amount — its ONLY observable is crown's recovery consumer.
    // 3.23%-of-final-Max-HP magnitude rides verbatim in the override note (no HP pool), never
    // fudged into a fake number.
    const frames = perFrame(crownAdApplies(base.events));

    it('fires at the 12s CD cadence: ticks at t=12,24,...,168 (14 ticks — the fight runs frames 0..10799, so the t=180 tick never dispatches)', () => {
      expect(frames.map(([f]) => f)).toEqual(
        Array.from({ length: 14 }, (_, i) => (i + 1) * 12 * FPS)
      );
    });

    it('each firing reaches ALL FOUR allies through crown (≥4 buffApply per tick frame)', () => {
      for (const [, n] of frames) {
        expect(n).toBeGreaterThanOrEqual(4);
      }
    });

    it('is LIVE: removing S2 zeros the recovery firings and drops team damage (crown AD uptime)', () => {
      expect(crownAdApplies(noS2.events).length).toBe(0);
      expect(noS2.totals['ada']).toBeLessThan(base.totals['ada']);
    });

    it('DISCRIMINATING: a 6s interval doubles the tick count to 29 (t=6..174 inside the frame budget)', () => {
      expect(perFrame(crownAdApplies(s2Fast.events)).length).toBe(29);
    });
  });

  describe('SD4 — S2 rider: the extra heal fires only at Maid Spirit max stacks', () => {
    const frames = perFrame(crownAdApplies(base.events));
    const ungated = perFrame(crownAdApplies(ungatedRider.events));

    it('the first tick (t=12s) is SINGLE: ≤720 hits + no burst by 12s cannot reach 5 stacks', () => {
      // MG terminal cadence is 60/s (the engine's MG constant), so <900 hits are possible by
      // t=12s, and soda's first burst casts well after — the pool is provably <5 at tick 1.
      expect(frames[0][1]).toBe(4);
    });

    it('once max stacks accrue, every later tick is DOUBLE (the rider joins the base heal)', () => {
      const doubledAt = frames.findIndex(([, n]) => n === 8);
      expect(doubledAt).toBeGreaterThan(0);
      for (const [, n] of frames.slice(doubledAt)) {
        expect(n).toBe(8);
      }
    });

    it('DISCRIMINATING: dropping the gate doubles the FIRST tick too', () => {
      expect(ungated[0][1]).toBe(8);
    });

    it('GATE DEPENDENCY (S2b): with no Maid Spirit stacks, the rider never joins — all ticks single', () => {
      // reviewer distinguisher: kill S1 → the 12.71% block's recovery feed VANISHES while the
      // 3.23% block's persists (every tick stays one recovery event = 4 buffApply). The burst
      // self-slice still feeds the pool (+1/cast), so this holds while soda casts <5 times.
      expect(CAST_COUNT).toBeLessThan(5);
      const noStacks = perFrame(crownAdApplies(noS1.events));
      expect(noStacks.length).toBe(14);
      for (const [, n] of noStacks) {
        expect(n).toBe(4);
      }
    });
  });

  describe('SD5 — burst: 321.28% of final ATK, once per own cast, before the FB window', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'soda' && d.srcSlot === 'burst'
    );

    it('fires once per soda burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(CAST_COUNT);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([321.28]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
      expect([...new Set(nukes.map((d) => d.inFullBurst))]).toEqual([false]);
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed nuke fires on EVERY team FB, not her casts', () => {
      const cf = dmg(fbEnterNuke.events).filter(
        (d) => d.slug === 'soda' && d.srcSlot === 'burst'
      );
      expect(cf.length).toBeGreaterThan(nukes.length);
    });
  });

  describe('SD6 — burst: Fire-ally "buff stacks ▲1" SELF slice — +1 Maid Spirit stack per cast', () => {
    it('the stack count = hit procs + one per own burst (the self-slice lands on her own buff)', () => {
      const applied = maidSpiritApplies(base.events);
      expect(applied.length).toBe(Math.floor(SHOT_COUNT / 180) + CAST_COUNT);
    });

    it('DISCRIMINATING: without the self-slice, only hit procs apply stacks', () => {
      const cf = maidSpiritApplies(noSelfSlice.events);
      expect(cf.length).toBe(Math.floor(SHOT_COUNT / 180));
    });
  });
});
