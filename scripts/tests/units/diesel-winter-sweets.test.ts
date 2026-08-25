// PER-UNIT KIT SPEC — `diesel-winter-sweets` (Diesel: Winter Sweets, Attacker/RL/Fire, Burst III,
// cd 40s, ammo 6, chargeFrames 60, chargeMultiplier 250). Kit-autonomy gauntlet 2026-07-25, S2a.
//
// One assertion group per FAITHFUL kit line (D1..D7 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['diesel-winter-sweets'].skills):
//   S1 ■ entering FB for the first time AFTER using own Burst → self: Intro Crit Damage ▲20.28% continuously  [D1]
//      ■ entering FB for the first time WITHOUT own Burst → self: Highlight Crit Damage ▲20.28% continuously  [U1]
//      ■ entering FB if in Intro status → self: Sustained Damage ▲60.19% for 10 sec                          [D2]
//      ■ entering FB if in Highlight status → self: Sustained Damage ▲235.03% for 10 sec                     [U2]
//   S2 ■ ally/self destroys an enemy part → all allies (except self): Mute (Noise-Pollution immunity, x3)    [U3]
//      ■ ally/self destroys an enemy part → self: Sustained Damage ▲68.04% for 15 sec                        [U4]
//      ■ performing a Full Charge attack → self: Sustained Damage ▲318.14% for 3 sec, stacks up to 2         [D3]
//      ■ entering Full Burst → the stage target: 63.33% of final ATK as sustained damage every 1s for 9s     [D4]
//   BU ■ all enemies: Damage Taken ▲25.09% for 10 sec                                                        [D5]
//      ■ all enemies: 18.43% of final ATK as sustained damage every 1s for 9 sec                             [D6]
//      ■ the stage target: 181.2% of final ATK as sustained damage every 1s for 9 sec                        [D7]
//      ■ while in Highlight → all allies (except self): Noise Pollution Hit Rate ▼100% for 1 sec             [U5]
//      ■ if in Highlight → all allies: Mute stacks ▼1                                                        [U6]
//
// STATE MACHINE (the meta-defining mechanic — Tier 2): S1 has two MUTUALLY EXCLUSIVE states. Intro
// = she used her OWN Burst this cycle; Highlight = she did not. Both grant the SAME Crit Damage
// (20.28%); they differ only in the sustained buff (Intro 60.19% vs Highlight 235.03%). She is a
// Burst III with a team-amp burst (Damage Taken ▲25.09%), so the sim casts her burst every rotation
// → she is ALWAYS Intro. The override models Intro only; the Highlight branch [U1/U2] is out of the
// sim's domain (would require running her as a non-bursting sub-DPS) and is the documented key
// uncertainty — a Highlight build would deal materially more sustained damage.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   D1  the Crit Damage buff is PERMANENT and must NOT stack across Full Bursts (re-applied each FB
//       entry, it refreshes at maxStacks 1 → a constant 20.28%). The counterfactual (maxStacks 99)
//       grows 20.28/40.56/60.84/… per FB — provably wrong. It is also SELF-scoped: removing it moves
//       ONLY her total, byte-identical for teammates.
//   D2  the Intro sustained value 60.19%, NOT the Highlight 235.03% (the nearest wrong branch) and
//       NOT the parser's double-apply (60.19 + 235.03). 10-second window, self-scoped.
//   D3  RL: EVERY trigger pull is a full-charge shot (sim.ts charge path fires firePull(charged=true)
//       for every RL pull), so `shotFired` ≡ "Full Charge attack". Stacks to 2 (value×stacks =
//       636.28% sustained while both stacks are live); the counterfactual (maxStacks 1) caps at
//       318.14% and under-counts. 3-second window per stack.
//   D4  the FB-entry sustained DoT on the stage target (= the single partless boss): 63.33%/s for 9s,
//       in the skill2 bucket. Removing the block zeroes these ticks.
//   D5  the team-amp debuff on the BOSS (targetIdx null): Damage Taken ▲25.09% for 10s. Removing it
//       drops EVERY unit's total (the whole team loses the amp).
//   D6/D7  the burst deals TWO sustained DoTs to the single boss — 18.43%/s (all enemies) AND
//       181.2%/s (stage target) — both in the burst bucket, both 9s. Each is independently removable.
//
// UNMODELED (documented, no assertion — inert or out-of-domain): U1 Highlight Crit Dmg 20.28%
// (mutually exclusive w/ Intro, same value); U2 Highlight Sustained 235.03% (mutually exclusive —
// asserted ABSENT in D2 to pin the Intro-only decision); U3 Mute immunity (defensive hit-rate, no
// Noise Pollution in sim); U4 part-gated Sustained 68.04% (partless scope-lock boss never triggers —
// asserted ABSENT); U5/U6 Highlight-gated Noise Pollution / Mute-stack bookkeeping (she is Intro;
// hit-rate inert).
//
// Fixture: liter (B1) / crown (B2) / diesel-winter-sweets (B3, sole burster), boss Fire, focus dws
// (RL charge weapon → ×2.5 gauge so she casts reliably). She needs a real rotation to cast her burst
// at all — a lone Burst III makes ZERO Full Bursts. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp(carry, false) slot order: liter 0 / crown 1 / diesel-winter-sweets 2. */
const DWS = 2;
const SLUG = 'diesel-winter-sweets';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}, helm = false) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, helm),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const dotAtk = (b: any, atk: number) =>
  b.effects.some((e: any) => e.kind === 'dot' && e.atkPct === atk);

/** D1 counterfactual: the permanent Crit Damage buff made STACKABLE (nearest wrong: grows per FB). */
const dwsStackingCrit = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critDamagePct');
  if (!e) {
    throw new Error('dws S1 critDamagePct effect missing — fixture is stale');
  }
  e.maxStacks = 99;
});
/** D1 reference: her S1 Crit Damage line removed entirely (proves the buff is live + self-scoped). */
const dwsNoCrit = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error('dws S1 critDamagePct block missing — fixture is stale');
  }
});
/** D2 counterfactual: the Intro sustained value swapped for the Highlight branch (235.03%). */
const dwsHighlightSustained = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'sustainedDamagePct' && x.value === 60.19);
  if (!e) {
    throw new Error(
      'dws S1 Intro sustainedDamagePct 60.19 missing — fixture is stale'
    );
  }
  e.value = 235.03;
});
/** D3 counterfactual: the Full-Charge sustained buff capped at 1 stack (nearest wrong: no stacking). */
const dwsNoStackSustained = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'sustainedDamagePct' && x.value === 318.14);
  if (!e) {
    throw new Error(
      'dws S2 sustainedDamagePct 318.14 missing — fixture is stale'
    );
  }
  e.maxStacks = 1;
});
/** D4 reference: her FB-entry 63.33%/s DoT removed. */
const dwsNoS2Dot = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !dotAtk(b, 63.33));
  if (ov.skill2.length === before) {
    throw new Error('dws S2 63.33 DoT block missing — fixture is stale');
  }
});
/** D5 reference: her burst Damage Taken debuff removed. */
const dwsNoDamageTaken = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before) {
    throw new Error(
      'dws burst damageTakenPct block missing — fixture is stale'
    );
  }
});
/** D6 reference: her burst 18.43%/s all-enemy DoT removed. */
const dwsNoBurstDot18 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !dotAtk(b, 18.43));
  if (ov.burst.length === before) {
    throw new Error('dws burst 18.43 DoT block missing — fixture is stale');
  }
});
/** D7 reference: her burst 181.2%/s stage-target DoT removed. */
const dwsNoBurstDot181 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !dotAtk(b, 181.2));
  if (ov.burst.length === before) {
    throw new Error('dws burst 181.2 DoT block missing — fixture is stale');
  }
});
/** D-scope reference: BOTH sustainedDamagePct buffs removed (S1 60.19 + S2 318.14). Proves the
 *  stat feeds ONLY sustained-flavored damage (her DoTs), never her RL normal/charge bucket — the
 *  nearest wrong stat (attackDamagePct) would lift the normals too. */
const dwsNoSustained = withPatchedOverride(SLUG, (ov) => {
  for (const slot of ['skill1', 'skill2'] as const) {
    for (const b of ov[slot]) {
      b.effects = b.effects.filter((e: any) => e.stat !== 'sustainedDamagePct');
    }
  }
  ov.skill1 = ov.skill1.filter((b: any) => b.effects.length > 0);
  ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const baseHelm = run({}, true);
const stackingCrit = run({ [SLUG]: dwsStackingCrit });
const noCrit = run({ [SLUG]: dwsNoCrit });
const highlightSustained = run({ [SLUG]: dwsHighlightSustained });
const noStackSustained = run({ [SLUG]: dwsNoStackSustained });
const noS2Dot = run({ [SLUG]: dwsNoS2Dot });
const noDamageTaken = run({ [SLUG]: dwsNoDamageTaken });
const noBurstDot18 = run({ [SLUG]: dwsNoBurstDot18 });
const noBurstDot181 = run({ [SLUG]: dwsNoBurstDot181 });
const noSustained = run({ [SLUG]: dwsNoSustained });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dwsBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === DWS &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const dwsDots = (evs: SimEvent[], srcSlot: Damage['srcSlot'], atkPct: number) =>
  dmg(evs).filter(
    (d) => d.slug === SLUG && d.srcSlot === srcSlot && d.atkPct === atkPct
  );
const dwsBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const dwsReloads = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'reload' && (e as any).slug === SLUG);
/** Sum of her normal/charge-bucket damage (RL weapon fire — NOT sustained-flavored). */
const dwsNormalSum = (evs: SimEvent[]) =>
  dmg(evs)
    .filter((d) => d.slug === SLUG && d.bucket === 'normal')
    .reduce((s, d) => s + d.amount, 0);
/** Sum of her sustained DoT damage (skill2 63.33/s + burst 18.43/s & 181.2/s) — these are the
 *  sustained-FLAVORED hits that sustainedDamagePct feeds. She has no other skill/burst damage. */
const dwsSustainedSum = (evs: SimEvent[]) =>
  dmg(evs)
    .filter(
      (d) => d.slug === SLUG && (d.bucket === 'skill' || d.bucket === 'burst')
    )
    .reduce((s, d) => s + d.amount, 0);

describe('diesel-winter-sweets — kit spec', () => {
  it('fixture sanity: she casts her burst (sole B3 in the rotation)', () => {
    expect(dwsBursts(base.events).length).toBeGreaterThan(0);
  });

  describe('D1 — S1 Intro Crit Damage ▲20.28% is permanent, self-scoped, NON-stacking', () => {
    const applied = dwsBuffs(base.events, 'critDamagePct');

    it('is exactly 20.28%, held by her alone, re-applied each Full Burst entry', () => {
      expect(
        applied.length,
        'no FB-entry critDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20.28]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([DWS]);
    });

    it('does NOT stack across Full Bursts (permanent buff refreshes at 1 stack)', () => {
      expect([...new Set(applied.map((b) => b.stacks))]).toEqual([1]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'a "continuously" buff must have no wall-clock expiry'
      ).toEqual([null]);
    });

    it('DISCRIMINATING: a stackable crit buff would grow per Full Burst', () => {
      const grown = dwsBuffs(stackingCrit.events, 'critDamagePct').map(
        (b) => b.stacks
      );
      expect(
        Math.max(...grown),
        'counterfactual must exceed 1 stack or this gates nothing'
      ).toBeGreaterThan(1);
    });

    it('is LIVE and self-scoped: removing it drops ONLY her total', () => {
      expect(noCrit.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
      // teammates byte-identical → the buff never leaks off her.
      expect(noCrit.totals.liter).toBe(base.totals.liter);
      expect(noCrit.totals.crown).toBe(base.totals.crown);
    });
  });

  describe('D2 — S1 Intro Sustained Damage ▲60.19% for 10s (NOT the Highlight branch)', () => {
    const applied = dwsBuffs(base.events, 'sustainedDamagePct', 60.19);

    it('is 60.19% for a 10-second window, self-scoped, once per Full Burst entry', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DWS]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('the Highlight value 235.03% is ABSENT here (sole-B3: she always casts -> Intro tier)', () => {
      expect(dwsBuffs(base.events, 'sustainedDamagePct', 235.03)).toEqual([]);
    });

    it('DISCRIMINATING: the Highlight branch would deal materially more', () => {
      expect(highlightSustained.totals[SLUG]).toBeGreaterThan(
        base.totals[SLUG]
      );
    });
  });

  describe('D2b — Intro/Highlight is COMP-DEPENDENT (ownBurstGate cast/notCast): the Highlight tier fires when she does NOT cast', () => {
    // The 2026-07-16 kit-status finding: in graded comp N5 she makes 0 bursts -> stays Highlight ->
    // the sustained tier must be 235.03%, not a hard-coded Intro 60.19% (the prior root cause of her
    // 0.793 COLD). The engine's ownBurstGate is the canonical encoding for this exact line
    // (types.ts:368). The two-B3 fixture reproduces the mechanism: on Full Bursts helm completes the
    // chain (dws does NOT cast) -> ownBurstGate 'notCast' passes -> the Highlight 235.03 tier fires.
    it('sole-B3: Intro 60.19 on every FB she casts, Highlight 235.03 never', () => {
      expect(
        dwsBuffs(base.events, 'sustainedDamagePct', 60.19).length
      ).toBeGreaterThan(0);
      expect(dwsBuffs(base.events, 'sustainedDamagePct', 235.03)).toEqual([]);
    });

    it('two-B3: the Highlight 235.03 tier fires on the Full Bursts she does NOT cast', () => {
      // helm completes some chains (dws sits out) -> those FB entries grant 235.03, not 60.19.
      expect(
        dwsBuffs(baseHelm.events, 'sustainedDamagePct', 235.03).length
      ).toBeGreaterThan(0);
      // and the Intro tier still fires on the FBs she DOES cast — the two partition the FB entries.
      expect(
        dwsBuffs(baseHelm.events, 'sustainedDamagePct', 60.19).length
      ).toBeGreaterThan(0);
    });
  });

  describe('D3 — S2 Full-Charge Sustained Damage ▲318.14% for 3s, stacks to 2', () => {
    const applied = dwsBuffs(base.events, 'sustainedDamagePct', 318.14);

    it('fires on her shot cadence (RL: every pull is a full charge), self-scoped, 3s window', () => {
      expect(
        applied.length,
        'no Full-Charge sustained buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DWS]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([2]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it('reaches 2 stacks (value×stacks = 636.28% sustained while both live)', () => {
      expect([...new Set(applied.map((b) => b.stacks))]).toContain(2);
    });

    it('LAPSES across the reload gap (3s window < the mag cycle): stacks reset to 1 repeatedly', () => {
      // A permanent 2-stack encoding (no durationSec) would show stacks==1 exactly ONCE (the first
      // pull ever). The real 3s window lapses during the reload+charge gap, so the first pull of a
      // magazine re-applies at stacks==1 — this recurs across the fight (not every reload lapses:
      // a transition snap-refill can beat the 3s expiry), but it must dominate, not happen once.
      const ones = applied.filter((b) => b.stacks === 1).length;
      expect(
        ones,
        'a permanent 2-stack model yields stacks==1 exactly once'
      ).toBeGreaterThanOrEqual(Math.ceil(dwsReloads(base.events).length / 2));
      expect(ones).toBeGreaterThan(1);
    });

    it('DISCRIMINATING: capping at 1 stack under-counts her sustained damage', () => {
      const maxStack = Math.max(
        ...dwsBuffs(noStackSustained.events, 'sustainedDamagePct', 318.14).map(
          (b) => b.stacks
        )
      );
      expect(maxStack).toBe(1);
      expect(noStackSustained.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
    });
  });

  describe('D-scope — the sustained buffs feed ONLY sustained-flavored damage, never her RL normals', () => {
    // All three big kit buffs (60.19 / 318.14 / the absent 235.03 & 68.04) are "Sustained damage
    // ▲" → stat sustainedDamagePct, which the engine folds in ONLY for sustained-flavored hits
    // (sim.ts:1412). Her RL normal/charge shots are NOT sustained-flavored, so the buffs must leave
    // the normal bucket byte-identical and move only her DoT ticks. The nearest wrong stat
    // (attackDamagePct) would lift the normals too.
    it('removing BOTH sustained buffs leaves her normal-bucket damage byte-identical', () => {
      expect(dwsNormalSum(noSustained.events)).toBe(dwsNormalSum(base.events));
    });

    it('…but drops her sustained DoT damage (the buffs feed the DoTs, not the normals)', () => {
      expect(dwsSustainedSum(noSustained.events)).toBeLessThan(
        dwsSustainedSum(base.events)
      );
    });
  });

  describe('D4 — S2 FB-entry DoT: 63.33% of final ATK per second for 9s on the stage target', () => {
    const ticks = dwsDots(base.events, 'skill2', 63.33);

    it('ticks in the skill2 bucket at the kit magnitude, at least once per Full Burst', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
      expect(ticks.length).toBeGreaterThanOrEqual(
        dwsBursts(base.events).length
      );
    });

    it('DISCRIMINATING: removing the block zeroes these ticks', () => {
      expect(dwsDots(noS2Dot.events, 'skill2', 63.33)).toEqual([]);
    });
  });

  describe('D5 — burst Damage Taken ▲25.09% for 10s on the BOSS (team amp)', () => {
    // Enemy debuffs land in `enemyBuffs`, whose buffApply event carries casterIdx null AND
    // targetIdx null (the boss) — so key on her specific value + the boss target, not casterIdx.
    const applied = buffs(base.events).filter(
      (b) =>
        b.stat === 'damageTakenPct' && b.value === 25.09 && b.targetIdx === null
    );

    it('is 25.09% on the boss (targetIdx null) for a 10-second window', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([25.09]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'a debuff on the boss'
      ).toEqual([null]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it("DISCRIMINATING: removing it drops the WHOLE team's damage (the amp is live)", () => {
      for (const slug of Object.keys(base.totals)) {
        expect(
          noDamageTaken.totals[slug],
          `${slug} loses the Damage Taken amp`
        ).toBeLessThan(base.totals[slug]);
      }
    });
  });

  describe('D6/D7 — burst deals TWO sustained DoTs to the single boss (18.43%/s + 181.2%/s, 9s)', () => {
    const dot18 = dwsDots(base.events, 'burst', 18.43);
    const dot181 = dwsDots(base.events, 'burst', 181.2);

    it('both magnitudes tick in the burst bucket', () => {
      expect(dot18.length, '18.43%/s all-enemy DoT missing').toBeGreaterThan(0);
      expect(
        dot181.length,
        '181.2%/s stage-target DoT missing'
      ).toBeGreaterThan(0);
      expect([...new Set([...dot18, ...dot181].map((d) => d.bucket))]).toEqual([
        'burst',
      ]);
    });

    it('DISCRIMINATING: each is independently removable', () => {
      expect(dwsDots(noBurstDot18.events, 'burst', 18.43)).toEqual([]);
      expect(
        dwsDots(noBurstDot18.events, 'burst', 181.2).length
      ).toBeGreaterThan(0);
      expect(dwsDots(noBurstDot181.events, 'burst', 181.2)).toEqual([]);
      expect(
        dwsDots(noBurstDot181.events, 'burst', 18.43).length
      ).toBeGreaterThan(0);
    });
  });

  // STRUCTURAL trigger-identity pins (closes the S7 judge's coverage residual: in the sole-B3
  // fixture burstCast and fullBurstEnter COINCIDE — she casts into every FB — so the burst block's
  // trigger cannot be distinguished behaviorally here; it becomes load-bearing the moment a two-B3
  // comp is graded, where fullBurstEnter would over-fire on rotations a different B3 completes).
  describe('trigger identity (structural — burstCast vs fullBurstEnter vs shotFired)', () => {
    const OV: any = withPatchedOverride(SLUG, () => {});
    const blockWith = (
      slot: 'skill1' | 'skill2' | 'burst',
      pred: (e: any) => boolean
    ) => (OV[slot] as any[]).find((b) => b.effects.some(pred));

    it('the burst debuff + both burst DoTs key on burstCast (NOT fullBurstEnter)', () => {
      expect(
        blockWith('burst', (e) => e.stat === 'damageTakenPct')?.trigger.kind
      ).toBe('burstCast');
      expect(
        blockWith('burst', (e) => e.kind === 'dot' && e.atkPct === 18.43)
          ?.trigger.kind
      ).toBe('burstCast');
      expect(
        blockWith('burst', (e) => e.kind === 'dot' && e.atkPct === 181.2)
          ?.trigger.kind
      ).toBe('burstCast');
    });

    it('the FB-entry 63.33%/s DoT and the S1 Intro buffs key on fullBurstEnter', () => {
      expect(
        blockWith('skill2', (e) => e.kind === 'dot' && e.atkPct === 63.33)
          ?.trigger.kind
      ).toBe('fullBurstEnter');
      expect(
        blockWith('skill1', (e) => e.stat === 'critDamagePct')?.trigger.kind
      ).toBe('fullBurstEnter');
      expect(
        blockWith('skill1', (e) => e.stat === 'sustainedDamagePct')?.trigger
          .kind
      ).toBe('fullBurstEnter');
    });

    it('the Full-Charge 318.14% sustained buff keys on fullCharge (every RL pull is a full charge)', () => {
      expect(
        blockWith('skill2', (e) => e.stat === 'sustainedDamagePct')?.trigger
          .kind
      ).toBe('fullCharge');
    });

    it('the two S1 sustained tiers are split by ownBurstGate: Intro 60.19 = cast, Highlight 235.03 = notCast', () => {
      // The engine's canonical encoding for this exact line (types.ts:368). This is what makes the
      // tier COMP-DEPENDENT (sole burster -> Intro; never-bursts -> Highlight), fixing the prior
      // Intro-only hard-coding that under-counted graded comp N5 (2026-07-16 finding).
      const sus = (OV.skill1 as any[]).filter((b) =>
        b.effects.some((e: any) => e.stat === 'sustainedDamagePct')
      );
      const intro = sus.find((b) =>
        b.effects.some((e: any) => e.value === 60.19)
      );
      const highlight = sus.find((b) =>
        b.effects.some((e: any) => e.value === 235.03)
      );
      expect(intro?.ownBurstGate).toBe('cast');
      expect(highlight?.ownBurstGate).toBe('notCast');
      // the permanent Crit Damage is shared by both statuses -> a single ungated block.
      expect(
        blockWith('skill1', (e) => e.stat === 'critDamagePct')?.ownBurstGate
      ).toBeUndefined();
    });
  });

  describe('UNMODELED lines are correctly absent (domain restriction, not a silent drop)', () => {
    it('the part-gated Sustained 68.04% never appears (partless scope-lock boss)', () => {
      expect(dwsBuffs(base.events, 'sustainedDamagePct', 68.04)).toEqual([]);
    });
  });
});
