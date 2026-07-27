// PER-UNIT KIT SPEC — `guilty` (Guilty, SG/Wind/Attacker, Burst II, cd 20s, ammo 9,
// hitsPerShot 10, reloadFrames 181, chargeFrames 0).
//
// BLIND spec: written from the kit prose ALONE. Asserted against the SHIPPED override loaded from
// disk; `withPatchedOverride` supplies only COUNTERFACTUALS (the nearest wrong model each assertion
// must discriminate against), never the encoding under test.
//
// Kit (blablalink prose):
//   S1 ■ Activates after 6 NORMAL ATTACKS. Affects self.
//        'Mind If I Borrow This?' duplicates 8.81% of the ATK of the ally with the HIGHEST ATK.
//        Stacks up to 5 times, lasts 10 sec.                                              [G1]
//   S2 ■ Activates after 12 NORMAL ATTACKS. Affects all WIND CODE allies.
//        (a) Increases stack count of stackable buffs by 1.                                [G2]
//        (b) ATK ▲ 4.13% for 10 sec.                                                      [G3]
//   BU ■ Affects the 1 enemy with the highest final DEF.
//        284.32% of final ATK as Burst Skill damage.                                       [G4]
//      ■ Activates when 'Mind If I Borrow This?' is at MAX STACKS. Same target(s).
//        (a) DEF ▼ 20.25% for 5 sec.                                                      [G5]
//        (b) 277.71% of final ATK as additional damage.                                    [G6]
//
// FIXTURE — deliberately NOT controlComp(). guilty is BURST II, and controlComp hardcodes crown,
// also Burst II with the same 20s cooldown, so the standard control comp has TWO competing stage-2
// casters and guilty can be starved of burst casts entirely — which would make G4/G5/G6 vacuous.
// This file uses liter (B1) / guilty (B2, the SOLE stage-2 caster) / ada (B3) / helm (B3) on the
// same scope-lock basis and boss element as controlComp, focus guilty. Two Burst III units at <=40s
// keep stage 3 covered every rotation (stageCovered), so the chain runs. Deterministic (no seed).
// Every burst group asserts its own non-vacuity (guilty must actually have cast).
//
// WHY EACH ASSERTION DISCRIMINATES
//   G1 three independent nearest-wrongs. (i) '8.81% of the HIGHEST-ATK ALLY's ATK' is a FLAT ATK add
//      resolved at apply time, so the emitted buffApply value must NOT be the raw 8.81 — a plain
//      atkPct encoding (which scales guilty's OWN ATK by 8.81%) emits 8.81 and fails. (ii) restating
//      the same effect as caster-scaled (guilty's own ATK) must not resolve ABOVE the shipped value:
//      a mis-ranked target (a support's ATK, or a lowest-ATK pick) lands below own-ATK and fails.
//      (iii) '6 normal attacks' counts trigger PULLS, and guilty is a SHOTGUN with hitsPerShot 10 —
//      a per-PELLET count fires ~10x as often. Pinning firings to floor(pulls/6) excludes both the
//      per-pellet and the per-pull readings.
//   G3 the buff is scoped to WIND CODE allies; a plain {kind:'allies'} would credit the whole team.
//      Proven both directions: shipped holders must be a STRICT SUBSET of the comp and must include
//      guilty herself (she is Wind — an excludeSelf encoding fails), while the all-allies
//      counterfactual must reach every slot AND move teammates' totals.
//   G4 a burst CAST lands BEFORE the Full Burst window opens, so it can never take the +50% major.
//   G5 a DEF ▼ is a debuff on the ENEMY: no ALLY may ever hold it (an ally-scoped 20.25 buff is the
//      nearest wrong), and it is not the Damage Taken ▲ mechanic (boss DEF is subtracted per hit, so
//      a DEF cut is not a proportional damage increase). Flagged interpretation — see the group note.
//   G6 the MAX-STACK GATE is the whole claim. Shipped, the rider may fire only on frames where the
//      borrow buff is genuinely at 5 stacks; with the gate stripped it must appear once per cast at
//      the kit magnitude — which is what proves the shipped zero (if it is zero) comes from the GATE
//      and not from a dropped block.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / guilty 1 / ada 2 / helm 3. */
const SLUGS = ['liter', 'guilty', 'ada', 'helm'];
const GUILTY = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'guilty',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const guiltyShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'guilty');
const guiltyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'guilty'
  );
const guiltyDamage = (evs: SimEvent[], srcSlot: string, atkPct: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'guilty' &&
      (d as any).srcSlot === srcSlot &&
      (d as any).atkPct === atkPct
  );

/** Every buff guilty applies to an ALLY that is not the S2 4.13% ATK line — i.e. the borrow buff.
 *  Value-based, so it matches whether the borrow line was encoded flat-resolved or as a raw %. */
const borrowApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === GUILTY && b.targetIdx !== null && b.value !== 4.13
  );
const s2AtkApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === GUILTY && b.stat === 'atkPct' && b.value === 4.13
  );
/** Boss-held debuffs carry casterIdx === null AND targetIdx === null; filter by magnitude. */
const bossDefDown = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === null &&
      b.targetIdx === null &&
      Math.abs(b.value) === 20.25
  );
const framesOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const uniq = <T>(xs: T[]) => [...new Set(xs)];

// ---- override inspection (structural: 'no silent drop' checks) ---------------------------------
let s1Slot: any[] = [];
let s2Slot: any[] = [];
let burstSlot: any[] = [];
let ovErr: string | null = null;
try {
  withPatchedOverride('guilty', (ov) => {
    s1Slot = ov.skill1 ?? [];
    s2Slot = ov.skill2 ?? [];
    burstSlot = ov.burst ?? [];
  });
} catch (e) {
  ovErr = (e as Error).message;
}
const effectsOf = (blocks: any[]): any[] =>
  blocks.flatMap((b: any) => b.effects ?? []);
const blockCarrying = (blocks: any[], pred: (e: any) => boolean) =>
  blocks.find((b: any) => (b.effects ?? []).some(pred));

// ---- counterfactual patches --------------------------------------------------------------------
function tryPatch(label: string, mutate: (ov: any) => void) {
  try {
    return {
      ov: withPatchedOverride('guilty', mutate) as any,
      err: null as string | null,
    };
  } catch (e) {
    return { ov: null as any, err: `${label}: ${(e as Error).message}` };
  }
}

const GATE_KEYS = [
  'resourceGate',
  'requiresTargetStatus',
  'fbGate',
  'swapGate',
  'everyN',
  'everyNOffset',
  'ownBurstGate',
  'requiresCore',
  'requiresShielded',
  'bossElementGate',
  'teamHas',
  'formation',
  'mode',
];

/** G1 proportionality: the authored kit percentage doubled. */
const pDoubled = tryPatch('S1 borrow x2', (ov) => {
  const e = effectsOf(ov.skill1 ?? []).find(
    (x: any) => x.kind === 'buff' && x.value === 8.81
  );
  if (!e)
    {throw new Error(
      'no 8.81 buff effect in skill1 — the borrowed-ATK line is not encoded as authored'
    );}
  e.value = 17.62;
});
/** G1 ranking floor: the same effect re-scaled to guilty's OWN ATK. */
const pSelfScaled = tryPatch('S1 borrow -> own ATK', (ov) => {
  const e = effectsOf(ov.skill1 ?? []).find(
    (x: any) => x.kind === 'buff' && x.value === 8.81
  );
  if (!e)
    {throw new Error(
      'no 8.81 buff effect in skill1 — the borrowed-ATK line is not encoded as authored'
    );}
  e.stat = 'casterAtkPct';
});
/** G3 scope counterfactual: the Wind-only ATK buff widened to the whole team. */
const pAllAllies = tryPatch('S2 -> all allies', (ov) => {
  const b = blockCarrying(
    ov.skill2 ?? [],
    (e: any) => e.kind === 'buff' && e.value === 4.13
  );
  if (!b) {throw new Error('no 4.13 ATK buff block in skill2');}
  b.target = { kind: 'allies' };
});
/** G6 non-vacuity: strip every gate from the max-stack burst branch. */
const pUngated = tryPatch('burst max-stack branch ungated', (ov) => {
  let found = 0;
  for (const b of ov.burst ?? []) {
    const carries = (b.effects ?? []).some(
      (e: any) =>
        (e.kind === 'flatDamage' && e.atkPct === 277.71) ||
        (e.kind === 'buff' && Math.abs(e.value) === 20.25)
    );
    if (!carries) {continue;}
    found++;
    for (const g of GATE_KEYS) {delete b[g];}
  }
  if (found === 0)
    {throw new Error(
      'neither the 277.71% additional damage nor the 20.25 DEF-down is encoded in the burst slot — ' +
        'the max-stack branch was DROPPED'
    );}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const doubled = pDoubled.ov ? run({ guilty: pDoubled.ov }) : null;
const selfScaled = pSelfScaled.ov ? run({ guilty: pSelfScaled.ov }) : null;
const allAllies = pAllAllies.ov ? run({ guilty: pAllAllies.ov }) : null;
const ungated = pUngated.ov ? run({ guilty: pUngated.ov }) : null;

const SHOTS = guiltyShots(base.events).length;
const BURSTS = guiltyBursts(base.events).length;
const BORROW = borrowApplies(base.events);
/** Peak concurrent borrow stacks the fixture ever reaches — decides whether G5/G6 are reachable. */
const PEAK_STACKS = BORROW.length
  ? Math.max(...BORROW.map((b) => b.stacks ?? 1))
  : 0;

describe('guilty — kit spec (blind)', () => {
  it('the override loaded and the fixture fires (fixture sanity)', () => {
    expect(ovErr, 'guilty has no override on disk').toBeNull();
    expect(
      SHOTS,
      'guilty fired no shots — the fixture is broken'
    ).toBeGreaterThan(0);
    expect(s1Slot.length + s2Slot.length + burstSlot.length).toBeGreaterThan(0);
  });

  describe('G1 — S1 borrows 8.81% of the HIGHEST-ATK ally, self, 5 stacks, 10 sec, every 6 pulls', () => {
    it('applies at all, and only to guilty herself (self-scoped)', () => {
      expect(
        BORROW.length,
        'the borrowed-ATK buff never applied'
      ).toBeGreaterThan(0);
      expect(
        uniq(BORROW.map((b) => b.targetIdx)),
        'a self-scoped buff must never be held by a teammate'
      ).toEqual([GUILTY]);
    });

    it('is a FLAT-resolved ATK add, not the raw 8.81 percentage', () => {
      const vals = uniq(BORROW.map((b) => b.value));
      expect(
        vals.length,
        `expected one flat value, saw ${vals.join(',')}`
      ).toBe(1);
      expect(
        vals[0],
        'emitting 8.81 means the line was encoded as a plain atkPct (scaling guilty OWN ATK by ' +
          '8.81%) instead of duplicating 8.81% of an ally ATK as a flat add'
      ).not.toBe(8.81);
    });

    it('DISCRIMINATING: the flat value is proportional to the kit percentage', () => {
      expect(pDoubled.err).toBeNull();
      const dv = uniq(borrowApplies(doubled!.events).map((b) => b.value));
      expect(dv.length).toBe(1);
      expect(dv[0]).toBeCloseTo(uniq(BORROW.map((b) => b.value))[0] * 2, 6);
    });

    it('DISCRIMINATING: resolves to the HIGHEST ally ATK — never below guilty own ATK', () => {
      // Re-scaling the same effect to the caster's own ATK is the reference. The highest-ATK ally
      // (self included) can never be weaker than self, so shipped >= own. A mis-ranked pick (a
      // support's ATK, or a lowest-ATK target) resolves BELOW own-ATK and fails here.
      // ⚑ equality is legal and means guilty is herself the team ATK maximum in this fixture; it
      // does NOT distinguish highest-ally from self-scaled. Which ally is the max, and whether the
      // kit's 'ally' includes self, is not derivable from the event log — flagged, not guessed.
      expect(pSelfScaled.err).toBeNull();
      const own = uniq(borrowApplies(selfScaled!.events).map((b) => b.value));
      expect(own.length).toBe(1);
      expect(uniq(BORROW.map((b) => b.value))[0]).toBeGreaterThanOrEqual(
        own[0]
      );
    });

    it('stacks up to 5 and lasts 10 sec (wall clock, refreshed on each firing)', () => {
      expect(
        uniq(BORROW.map((b) => b.maxStacks)),
        'the kit says 5 stacks; a cap of 6 would mean the S2 stack-count line was folded in here ' +
          '(see G2 — that is an interpretation fork, not necessarily an error)'
      ).toEqual([5]);
      expect(BORROW.every((b) => (b.stacks ?? 1) <= 5)).toBe(true);
      expect(uniq(BORROW.map((b) => b.expiresFrame! - b.frame))).toEqual([
        10 * FPS,
      ]);
    });

    it('DISCRIMINATING: fires every 6 PULLS, not every 6 pellet hits and not every pull', () => {
      // guilty is a shotgun: hitsPerShot 10. A per-pellet hit count would fire ~10x as often; a
      // per-pull trigger ~6x as often. Both are excluded by pinning to floor(pulls / 6).
      const fired = framesOf(BORROW).length;
      const expected = Math.floor(SHOTS / 6);
      expect(expected, 'fixture too short to see a firing').toBeGreaterThan(0);
      expect(
        Math.abs(fired - expected),
        `${fired} firings vs ${SHOTS} pulls — expected ~${expected} (pulls/6); a per-pellet count ` +
          `would give ~${Math.floor((SHOTS * 10) / 6)}, a per-pull trigger ~${SHOTS}`
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('G2 — S2 increases the stack count of stackable buffs by 1', () => {
    it.skip('raises every stackable buff on a Wind ally by one stack', () => {
      // GAP: no primitive. A buff effect declares its OWN maxStacks; nothing in the schema can
      // raise ANOTHER buff's stack count or cap, and there is no cross-unit stack channel. The only
      // in-kit consumer reachable in isolation is guilty's own 5-stack borrow buff, so the two live
      // readings are (a) leave the cap at 5 and record the line as unmodeled, or (b) author the
      // borrow cap at 6. G1 asserts the kit-literal 5 and flags the fork rather than silently
      // picking (b). Needs a maxStacksBonus-style primitive to model faithfully.
    });
  });

  describe('G3 — S2 ATK +4.13% for 10 sec, WIND CODE allies only, every 12 pulls', () => {
    const applied = s2AtkApplies(base.events);

    it('is a plain 4.13% ATK buff (target-scaled percentage, not a flat add)', () => {
      expect(
        applied.length,
        'no 4.13% atkPct buff was applied by guilty'
      ).toBeGreaterThan(0);
      expect(uniq(applied.map((b) => b.value))).toEqual([4.13]);
      expect(uniq(applied.map((b) => b.expiresFrame! - b.frame))).toEqual([
        10 * FPS,
      ]);
    });

    it('reaches guilty herself (she is Wind Code — an excludeSelf scoping is wrong)', () => {
      expect(uniq(applied.map((b) => b.targetIdx))).toContain(GUILTY);
    });

    it('DISCRIMINATING: element-scoped, so it reaches a STRICT SUBSET of the team', () => {
      const holders = new Set(applied.map((b) => b.targetIdx));
      expect(
        holders.size,
        `${holders.size} of ${SLUGS.length} allies hold it — an unscoped {kind:'allies'} would ` +
          'reach every slot'
      ).toBeLessThan(SLUGS.length);
    });

    it('DISCRIMINATING: the all-allies counterfactual reaches every slot and moves teammates', () => {
      expect(pAllAllies.err).toBeNull();
      const wide = s2AtkApplies(allAllies!.events);
      expect(new Set(wide.map((b) => b.targetIdx)).size).toBe(SLUGS.length);
      const moved = SLUGS.filter(
        (s) => s !== 'guilty' && allAllies!.totals[s] !== base.totals[s]
      );
      expect(
        moved.length,
        'the widened scope must change teammate totals, else G3 tests nothing'
      ).toBeGreaterThan(0);
    });

    it('fires every 12 PULLS (half the borrow cadence)', () => {
      const fired = framesOf(applied).length;
      const expected = Math.floor(SHOTS / 12);
      expect(expected, 'fixture too short to see a firing').toBeGreaterThan(0);
      expect(
        Math.abs(fired - expected),
        `${fired} firings vs ${SHOTS} pulls — expected ~${expected} (pulls/12)`
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('G4 — burst: 284.32% of final ATK as Burst Skill damage, cast BEFORE Full Burst', () => {
    const nukes = guiltyDamage(base.events, 'burst', 284.32);

    it('lands exactly once per burst cast, in the burst bucket', () => {
      expect(
        BURSTS,
        'guilty never cast her burst — the fixture cannot test G4-G6'
      ).toBeGreaterThan(0);
      expect(nukes.length).toBe(BURSTS);
      expect(uniq(nukes.map((d) => (d as any).bucket))).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast precedes the FB window)', () => {
      expect(
        nukes
          .filter((d) => (d as any).fbMajorApplied)
          .map((d) => (d as any).sec)
      ).toEqual([]);
    });
  });

  describe('G5 — burst branch: DEF -20.25% for 5 sec on the enemy', () => {
    // The debuff targets the ENEMY, and v1 models no enemy entity, so its only reliable observables
    // are (a) structural presence with an enemy-scoped target, and (b) strict absence from every
    // ally. ⚑ FLAGGED INTERPRETATION: DEF-down is asserted to be a distinct mechanic from
    // Damage Taken +, because boss DEF is SUBTRACTED per hit — cutting DEF by 20.25% is not a
    // 20.25% damage increase. If the repo deliberately approximates it as damageTakenPct, this is a
    // divergence to adjudicate, not a defect to fix blind.
    const effect = effectsOf(burstSlot).find(
      (e: any) => e.kind === 'buff' && Math.abs(e.value) === 20.25
    );

    it('is present in the burst slot, enemy-scoped, for 5 sec (no silent drop)', () => {
      expect(
        effect,
        'no 20.25-magnitude buff effect in the burst slot'
      ).toBeDefined();
      expect(effect.durationSec, 'the kit says 5 sec').toBe(5);
      const block = blockCarrying(burstSlot, (e: any) => e === effect);
      expect(
        block?.target?.kind,
        'a DEF debuff applies to the enemy, not to allies'
      ).toBe('enemy');
    });

    it('is not substituted with the Damage Taken mechanic', () => {
      expect(effect?.stat).not.toBe('damageTakenPct');
    });

    it('INERTNESS: no ally ever holds a 20.25 buff from guilty', () => {
      const allyHeld = buffs(base.events).filter(
        (b) =>
          b.casterIdx === GUILTY &&
          b.targetIdx !== null &&
          Math.abs(b.value) === 20.25
      );
      expect(allyHeld.map((b) => b.targetSlug)).toEqual([]);
      // If the engine does emit it as a boss-held debuff, it must carry the kit window.
      for (const b of bossDefDown(base.events)) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });
  });

  describe('G6 — burst branch: 277.71% additional damage, GATED on max borrow stacks', () => {
    const riders = guiltyDamage(base.events, 'burst', 277.71);

    it('is encoded at the kit magnitude, not a core strike (no core-strike text)', () => {
      const e = effectsOf(burstSlot).find(
        (x: any) => x.kind === 'flatDamage' && x.atkPct === 277.71
      );
      expect(
        e,
        'no 277.71% flatDamage in the burst slot — the max-stack rider was dropped'
      ).toBeDefined();
      expect(
        e.core,
        'riders get no core unless the kit says core strike damage'
      ).not.toBe(true);
    });

    it('honours the max-stack gate (and the fixture states which case it exercises)', () => {
      expect(BURSTS).toBeGreaterThan(0);
      expect(
        BORROW.length,
        'the borrow buff never applied, so the gate is untestable'
      ).toBeGreaterThan(0);
      if (PEAK_STACKS < 5) {
        // INACTIVE case: an SG at ~9 rounds/magazine accrues a stack only every 6 pulls while each
        // stack lives 10 sec, so 5 concurrent stacks are never reached and the branch is naturally
        // inert. Zero firings is then CORRECT — and the ungated run below proves the zero comes
        // from the gate, not from a missing block.
        expect(
          riders.length,
          `peak borrow stacks ${PEAK_STACKS} < 5, so the gate is never satisfied and the 277.71% ` +
            'rider must never fire'
        ).toBe(0);
        for (const b of bossDefDown(base.events)) {
          expect(
            b.frame,
            'DEF-down fired while the gate was unsatisfiable'
          ).toBe(-1);
        }
      } else {
        // ACTIVE case: every firing must sit inside a live 5-stack window.
        const atCap = BORROW.filter((b) => (b.stacks ?? 1) >= 5);
        expect(atCap.length).toBeGreaterThan(0);
        const windows = atCap.map((b) => [b.frame, b.expiresFrame!] as const);
        for (const r of riders) {
          const f = (r as any).frame as number;
          expect(
            windows.some(([a, z]) => f >= a && f <= z),
            `rider at frame ${f} fired outside every 5-stack window`
          ).toBe(true);
        }
        expect(riders.length).toBeLessThanOrEqual(BURSTS);
      }
    });

    it('NON-VACUITY: with the gate stripped it fires once per cast at the kit magnitude', () => {
      expect(pUngated.err).toBeNull();
      const free = guiltyDamage(ungated!.events, 'burst', 277.71);
      const casts = guiltyBursts(ungated!.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(
        free.length,
        'the ungated branch must land once per cast — otherwise the shipped result is explained by a ' +
          'missing block rather than by the max-stack gate'
      ).toBe(casts);
      expect(
        free.filter((d) => (d as any).fbMajorApplied).map((d) => (d as any).sec)
      ).toEqual([]);
      expect(ungated!.totals.guilty).toBeGreaterThan(base.totals.guilty);
    });

    it('INERTNESS: the gated branch never moves a teammate', () => {
      for (const s of SLUGS.filter((x) => x !== 'guilty')) {
        expect(
          ungated!.totals[s],
          `${s} moved when only guilty burst rider changed`
        ).toBe(base.totals[s]);
      }
    });
  });

  describe('burst targeting — 1 enemy with the highest final DEF', () => {
    it.skip('selects the highest-final-DEF enemy', () => {
      // GAP: the v1 fight has a single boss and no enemy entity to rank, so the selection clause is
      // trivially satisfied and unobservable. G4 already pins one hit per cast.
    });
  });
});
