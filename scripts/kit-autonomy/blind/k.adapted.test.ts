/**
 * k — SMG / Electric / Attacker / Burst III (cd 40s, ammo 120, hitsPerShot 2).
 * BLIND kit-spec test: written from the kit prose alone, with no sight of the shipped
 * override, the driver's tests, or any truth file.
 *
 * Kit lines under test
 *  S1a  last bullet, self          -> "Tilted Scale": Critical Rate +0.75% per stack, cap 100
 *                                     stacks, +29 stacks per activation, "continuously" (no
 *                                     wall-clock expiry).
 *  S1b  pellets crit 4 times, tgt  -> 23.9% of final ATK as additional damage.
 *  S1c  Full Burst ends, self      -> removes Tilted Scale.
 *  S2a  on GAINING Tilted Scale,   -> Max Ammunition -51.13% for 10s (cannot stack)
 *       all allies                    + Attack Damage +10.62% for 10s.
 *  S2b  Full Burst ends, allies    -> removes Fulfillment of Righteousness.
 *  B    self                       -> weapon swap: 92.5% of final ATK/shot, 10 pellets, attack
 *                                     speed -90%, 10s; + ATK +63.36% of the skill user's ATK for
 *                                     10s; + Attack Damage +21.12% for 10s.
 *
 * FIXTURE: controlComp('k', false) — liter (B1) + crown (B2) + k (B3).
 *  - B1+B2 are mandatory: a lone Burst III unit makes ZERO Full Bursts, which would make every
 *    burst / full-burst assertion below vacuous.
 *  - The fixed B3 slot is dropped ON PURPOSE. It is a second Burst III competing for the same
 *    rotation slot (so k might not cast every rotation), and it carries a critRateNormalPct ally
 *    buff that would contaminate every Tilted-Scale crit reading.
 *  - Deterministic (no seed). Runs are hoisted at module scope; 6 full 180s sims total.
 *
 * The kit's central feedback loop, which several assertions below exercise:
 *   last bullet -> Tilted Scale -> Max Ammo -51.13% -> smaller magazine -> MORE last bullets.
 * A model that drops or mis-signs the ammo debuff breaks the loop, not just one stat.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed (driver adaptation): real harness lives under tests/lib/

const K = 'k';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

type LooseEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  damagePct?: number;
  durationSec?: number;
  durationShots?: number;
  maxStacks?: number;
  pullsPerSec?: number;
};
type LooseBlock = {
  trigger?: { kind?: string; count?: number };
  target?: { kind?: string };
  effects?: LooseEffect[];
};

/**
 * The override FILE is slot-keyed. Read defensively: a slot is either a Block[] directly or a
 * CharacterSkills carrying its own blocks[]. Mutating the returned array in place (splice /
 * field assignment) works for both shapes, so counterfactuals stay shape-agnostic.
 */
function slotBlocks(
  ov: unknown,
  slot: 'skill1' | 'skill2' | 'burst',
): LooseBlock[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : ((raw as { blocks?: unknown[] }).blocks ?? []);
  return arr as LooseBlock[];
}

function buffApplies(events: SimEvent[]): BuffApply[] {
  return events.filter((e): e is BuffApply => e.kind === 'buffApply');
}

type Opts = ReturnType<typeof controlComp>;
type Mutate = Parameters<typeof withPatchedOverride>[1];

function run(opts: Opts) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events, dmg: totals(res) };
}

function runWith(patch: Mutate) {
  const opts = controlComp(K, false);
  return run({
    ...opts,
    overrides: { ...opts.overrides, [K]: withPatchedOverride(K, patch) },
  });
}

// ---------------------------------------------------------------------------
// Structural inspection (a throwaway clone — the committed JSON is untouched)
// ---------------------------------------------------------------------------
const SPEC = {
  critTrigger: '',
  critValue: 0,
  critMaxStacks: 0,
  critDurationSec: undefined as number | undefined,
  riderBlocks: 0,
  riderTrigger: '',
  riderCount: 0,
  s2Trigger: '',
  s2Target: '',
  burstSwap: undefined as LooseEffect | undefined,
  burstSlowBuff: false,
  fbEndBlocks: 0,
};

withPatchedOverride(K, (ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (b.trigger?.kind === 'fullBurstEnd') SPEC.fbEndBlocks += 1;
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'critRatePct') {
        SPEC.critTrigger = b.trigger?.kind ?? '';
        SPEC.critValue = e.value ?? 0;
        SPEC.critMaxStacks = e.maxStacks ?? 1;
        SPEC.critDurationSec = e.durationSec;
      }
      if (e.kind === 'flatDamage' && Math.abs((e.atkPct ?? 0) - 23.9) < 0.05) {
        SPEC.riderBlocks += 1;
        SPEC.riderTrigger = b.trigger?.kind ?? '';
        SPEC.riderCount = b.trigger?.count ?? 0;
      }
    }
  }
  for (const b of slotBlocks(ov, 'skill2')) {
    if (b.trigger?.kind === 'fullBurstEnd') SPEC.fbEndBlocks += 1;
    if (
      (b.effects ?? []).some(
        (e) => e.kind === 'buff' && e.stat === 'maxAmmoPct',
      )
    ) {
      SPEC.s2Trigger = b.trigger?.kind ?? '';
      SPEC.s2Target = b.target?.kind ?? '';
    }
  }
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'weaponSwap') SPEC.burstSwap = e;
      if (
        e.kind === 'buff' &&
        e.stat === 'attackSpeedPct' &&
        (e.value ?? 0) <= -90
      ) {
        SPEC.burstSlowBuff = true;
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Hoisted runs (each is a full 180s sim)
// ---------------------------------------------------------------------------
const BASE = run(controlComp(K, false));

/** Nearest-wrong for S1a trigger identity: per-pull instead of per-magazine. */
const SHOT_FIRED = runWith((ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (
      (b.effects ?? []).some(
        (e) => e.kind === 'buff' && e.stat === 'critRatePct',
      )
    ) {
      b.trigger = { kind: 'shotFired' };
    }
  }
});

/** Nearest-wrong for S1a cap: an uncapped Tilted Scale. */
const UNCAPPED = runWith((ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'critRatePct') e.maxStacks = 10000;
    }
  }
});

/** S1b isolation: strip the 23.9% rider block entirely. */
const NO_RIDER = runWith((ov) => {
  const blocks = slotBlocks(ov, 'skill1');
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const hit = (blocks[i].effects ?? []).some(
      (e) => e.kind === 'flatDamage' && Math.abs((e.atkPct ?? 0) - 23.9) < 0.05,
    );
    if (hit) blocks.splice(i, 1);
  }
});

/** S2a effect-1 isolation: drop ONLY the Max Ammo debuff, keep Attack Damage. */
const NO_AMMO = runWith((ov) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    if (!b.effects) continue;
    b.effects.splice(
      0,
      b.effects.length,
      ...b.effects.filter(
        (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoPct'),
      ),
    );
  }
});

/** Burst isolation: drop ONLY the weapon swap, keep the two burst stat buffs. */
const NO_SWAP = runWith((ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    if (!b.effects) continue;
    b.effects.splice(
      0,
      b.effects.length,
      ...b.effects.filter((e) => e.kind !== 'weaponSwap'),
    );
  }
});

const ALLIES = Object.keys(BASE.dmg);
const BASE_BUFFS = buffApplies(BASE.events);
const K_CRIT = BASE_BUFFS.filter(
  (e) =>
    e.targetSlug === K &&
    (e.stat === 'critRatePct' || e.stat === 'critRateNormalPct'),
);

describe('k — fixture non-vacuity', () => {
  it('the comp actually bursts and enters Full Burst', () => {
    // Without this every burst/full-burst assertion below would pass vacuously.
    expect(BASE.events.filter((e) => e.kind === 'burstCast').length).toBeGreaterThan(0);
    expect(BASE.events.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThan(0);
    expect(ALLIES).toContain(K);
    expect(unitOf(BASE.res, K).totalDamage).toBeGreaterThan(0);
  });
});

describe('k S1a — Tilted Scale (last bullet, self, Critical Rate +0.75%/stack, cap 100)', () => {
  it('grants UNSCOPED Critical Rate to k herself', () => {
    // Scope question: the kit says plain "Critical Rate", NOT "Critical Rate of normal
    // attacks". Encoding it as critRateNormalPct would silently exclude her burst-window
    // damage and her 23.9% rider from the crit roll.
    expect(K_CRIT.length).toBeGreaterThan(0);
    expect(K_CRIT.every((e) => e.stat === 'critRatePct')).toBe(true);
  });

  it('is self-only — no ally receives Tilted Scale', () => {
    // "Affects self". Inertness: an allies-scoped mis-encoding would hand the whole team crit.
    const leaked = BASE_BUFFS.filter(
      (e) =>
        e.stat === 'critRatePct' &&
        e.targetSlug !== K &&
        Math.abs((e.value ?? 0) - (K_CRIT[0].value ?? 0)) < 1e-6,
    );
    expect(leaked).toHaveLength(0);
  });

  it('caps at the kit ceiling of 100 stacks x 0.75% = 75%', () => {
    // value x maxStacks is the modelled ceiling regardless of whether the author encoded
    // 0.75/stack or the 29-stacks-per-activation lump (29 x 0.75 = 21.75). Both are <= 75;
    // a 21.75 value left at maxStacks 100 (2175%) or an uncapped buff fails here.
    const ceiling = (K_CRIT[0].value ?? 0) * (K_CRIT[0].maxStacks ?? 1);
    expect(ceiling).toBeGreaterThanOrEqual(20);
    expect(ceiling).toBeLessThanOrEqual(75.5);
  });

  it('the cap is load-bearing — removing it over-credits damage', () => {
    // Discriminates a real cap from a nominal maxStacks the engine never reaches.
    expect(UNCAPPED.dmg[K]).toBeGreaterThan(BASE.dmg[K]);
  });

  it('is "continuously" — no wall-clock expiry on the stack buff', () => {
    // "continuously" + an explicit FB-end removal line means the ONLY intended end condition
    // is Full Burst ending. A durationSec here would be an invented second expiry.
    expect(SPEC.critDurationSec).toBeUndefined();
  });

  it('triggers per MAGAZINE (last bullet), not per trigger pull', () => {
    // Trigger identity. shotFired reaches the stack cap within the first fraction of a second
    // instead of after ~3 magazines, so it strictly over-credits the opening seconds.
    expect(SPEC.critTrigger).toBe('lastBullet');
    expect(SHOT_FIRED.dmg[K]).toBeGreaterThan(BASE.dmg[K]);
  });
});

describe('k S1b — 23.9% of final ATK rider (pellets crit 4 times)', () => {
  it('exists exactly once at the kit magnitude', () => {
    expect(SPEC.riderBlocks).toBe(1);
  });

  it('is a hit-counted rider, not an interval or per-shot proc', () => {
    // Trigger identity: "when pellets land a critical hit 4 time(s)" is a hit COUNTER.
    // The engine has no crit-gated counter, so the faithful encoding is hitCount with a
    // threshold >= 4 (the kit's 4 crits cost >= 4 hits at any crit rate below 100%).
    expect(SPEC.riderTrigger).toBe('hitCount');
    expect(SPEC.riderCount).toBeGreaterThanOrEqual(4);
  });

  it('actually fires — removing it drops k damage', () => {
    // Non-vacuity: proves the block resolves (an enemy-targeted flatDamage would resolve to
    // an empty target set and contribute nothing).
    expect(BASE.dmg[K]).toBeGreaterThan(NO_RIDER.dmg[K]);
  });

  it('moves no teammate (self-sourced damage only)', () => {
    // Inertness: the rider is damage, not a buff — teammates must be byte-identical.
    for (const slug of ALLIES) {
      if (slug === K) continue;
      expect(NO_RIDER.dmg[slug]).toBe(BASE.dmg[slug]);
    }
  });
});

describe('k S2a — Fulfillment of Righteousness (on gaining Tilted Scale, all allies)', () => {
  const ammo = BASE_BUFFS.filter((e) => e.stat === 'maxAmmoPct');
  const atkDmg = BASE_BUFFS.filter(
    (e) =>
      e.stat === 'attackDamagePct' && Math.abs((e.value ?? 0) - 10.62) < 0.05,
  );

  it('reduces Max Ammunition by 51.13% (a DEBUFF — sign matters)', () => {
    // Weapon-state modifier: a positive 51.13 would enlarge magazines and INVERT the kit's
    // whole last-bullet feedback loop.
    expect(ammo.length).toBeGreaterThan(0);
    expect(ammo[0].value).toBeCloseTo(-51.13, 2);
  });

  it('grants Attack Damage +10.62% to EVERY ally including k', () => {
    const covered = new Set(atkDmg.map((e) => e.targetSlug));
    for (const slug of ALLIES) expect(covered.has(slug)).toBe(true);
  });

  it('is keyed to gaining Tilted Scale (same last-bullet trigger), not to Full Burst', () => {
    // Trigger identity: "Activates when gaining Tilted Scale" — Tilted Scale is gained on the
    // last bullet, so keying this to fullBurstEnter/burstCast would fire a handful of times
    // instead of once per magazine.
    expect(SPEC.s2Trigger).toBe('lastBullet');
    expect(SPEC.s2Target).toBe('allies');
  });

  it('lasts 10 sec — timed, not permanent', () => {
    // "for 10 sec" is wall-clock, not rounds and not a passive.
    expect(typeof ammo[0].expiresFrame).toBe('number');
    expect(ammo[0].expiresFrame as number).toBeGreaterThan(0);
    expect(ammo[0].durationShots).toBeUndefined();
  });

  it('does not stack ("Similar effects cannot be stacked")', () => {
    // Re-application on every magazine must REFRESH, not accumulate; a stacking encoding
    // would drive Max Ammo to zero within seconds.
    for (const e of ammo) expect(e.stacks ?? 1).toBeLessThanOrEqual(1);
  });

  it('the ammo debuff feeds back into last-bullet frequency', () => {
    // The mechanical payload of the line: halved magazines => roughly twice as many last
    // bullets => twice as many Fulfillment applications. Counting the buff events (rather
    // than reloads) keeps this encoding-agnostic.
    const applies = (r: typeof BASE) =>
      buffApplies(r.events).filter(
        (e) =>
          e.targetSlug === K &&
          e.stat === 'attackDamagePct' &&
          Math.abs((e.value ?? 0) - 10.62) < 0.05,
      ).length;
    expect(applies(BASE)).toBeGreaterThan(0);
    expect(applies(NO_AMMO)).toBeGreaterThan(0);
    expect(applies(BASE)).toBeGreaterThan(applies(NO_AMMO));
  });
});

describe('k burst — weapon swap + self buffs (10 sec)', () => {
  const selfAtk = BASE_BUFFS.filter(
    (e) => e.stat === 'casterAtkPct' && e.targetSlug === K,
  );
  const selfDmg = BASE_BUFFS.filter(
    (e) =>
      e.stat === 'attackDamagePct' && Math.abs((e.value ?? 0) - 21.12) < 0.05,
  );

  it('swaps the weapon at 92.5% of final ATK for 10 sec', () => {
    expect(SPEC.burstSwap).toBeDefined();
    expect(SPEC.burstSwap?.damagePct).toBeCloseTo(92.5, 1);
    expect(SPEC.burstSwap?.durationSec).toBe(10);
  });

  it('models the -90% attack speed', () => {
    // Encoding-agnostic: either the swap carries its own slowed cadence, or an
    // attackSpeedPct -90 buff runs alongside it. Neither present = the swap fires at the
    // base SMG rate and the burst is grossly over-credited.
    const slowedSwap =
      SPEC.burstSwap?.pullsPerSec !== undefined &&
      (SPEC.burstSwap.pullsPerSec as number) < 10;
    expect(slowedSwap || SPEC.burstSlowBuff).toBe(true);
  });

  it('the swap is a damage GAIN — removing it drops k damage', () => {
    // Discriminates the pellet economy: 92.5% x 10 pellets at the slowed cadence is a large
    // net gain over the base SMG (9.1% x 2 hits at full rate). If the 10 pellets were merged
    // away into a single 92.5% shot, the -90% attack speed makes the burst a net LOSS and
    // this goes red.
    expect(BASE.dmg[K]).toBeGreaterThan(NO_SWAP.dmg[K]);
  });

  it('grants ATK as a FLAT share of the skill user\u2019s ATK', () => {
    // caster-scaled buffs are flat-resolved at apply time, so the emitted value must be a
    // flat ATK number, never the raw 63.36 percentage.
    expect(selfAtk.length).toBeGreaterThan(0);
    expect(selfAtk[0].value).toBeGreaterThan(1000);
  });

  it('grants Attack Damage +21.12% to k only', () => {
    // "Affects self" — inertness against the S2 team buff, which is a DIFFERENT magnitude
    // (10.62%) reaching everyone.
    expect(selfDmg.length).toBeGreaterThan(0);
    expect(selfDmg.every((e) => e.targetSlug === K)).toBe(true);
  });

  it('the burst self-buffs move no teammate', () => {
    const leaked = BASE_BUFFS.filter(
      (e) =>
        e.targetSlug !== K &&
        e.targetSlug !== undefined &&
        e.stat === 'casterAtkPct' &&
        selfAtk.length > 0 &&
        Math.abs((e.value ?? 0) - (selfAtk[0].value ?? 0)) < 1e-6,
    );
    expect(leaked).toHaveLength(0);
  });
});

describe('k — GAPs (missing engine primitives)', () => {
  it.skip('S1c: "Removes Tilted Scale" on Full Burst end', () => {
    // GAP — the effect schema has no buff-REMOVAL kind (buffRemove is emitted only for
    // removeOnReload at reload-to-max). Tilted Scale is therefore modelled as never
    // resetting, so k holds capped Critical Rate for the rest of the fight instead of
    // rebuilding 29 stacks per magazine after every Full Burst. Direction: OVER-CREDIT,
    // growing with the number of Full Bursts in the fight.
    expect(SPEC.fbEndBlocks).toBeGreaterThan(0);
  });

  it.skip('S2b: "Removes Fulfillment of Righteousness" on Full Burst end', () => {
    // GAP — same missing removal primitive. Partially self-limiting (the buff carries a 10s
    // duration), but the FB-end line should cut both the ammo debuff and the +10.62% short.
    // Net direction is ambiguous: it removes a team damage buff AND an ammo penalty.
  });

  it.skip('S1a: +29 Tilted Scale stacks per activation, cap 100', () => {
    // GAP — no stacks-per-application primitive. Either the ramp is right and the ceiling is
    // wrong (21.75/stack x 3 = 65.25% vs the kit\u2019s 75%), or the ceiling is right and the
    // ramp takes 100 magazines. The ceiling assertion above accepts both; pinning the exact
    // trajectory needs a stacksPerApply field or a measured crit-rate readout.
  });

  it.skip('S1b: the rider requires FOUR CRITICAL hits, not four hits', () => {
    // GAP — hitCount has no crit gate. Any threshold is a crit-rate-derived estimate (\u26d1),
    // and it is not even stationary: Tilted Scale raises k\u2019s crit rate as the fight goes on,
    // so the true cadence accelerates from ~4/critRate hits toward 4 hits.
  });

  it.skip('burst: 10 pellets — split vs merged', () => {
    // \u26d1 ALWAYS-FLAG (multi-projectile split-vs-merge + swap shot economy are kit-silent).
    // Whether 92.5% is per-pellet (x10 per shot) or the whole shot changes the burst by an
    // order of magnitude. Resolvable only from popup counts/values in footage.
  });
});
